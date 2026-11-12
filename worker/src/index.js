/* Buy the Dip server: a Cloudflare Worker with a D1 database. Two jobs:
   - short race links: a recorded run (see encode in js/dip-core.js) is stored under a short id, so a link is
     proofoffight.com/?dip&r=<id> instead of the whole run;
   - leaderboards: one per chain plus one per day for Daily Coin, three-letter initials.
   The game's own rules (js/dip-core.js and the price files) are bundled in front of this file by
   tools/build-worker.js, which leaves them on globalThis as POF_DIP_CORE / POF_DIP_CHAINS / the price data.
   With VERIFY = "1" every run is replayed here before it is stored, and the replay must die on the
   same step with the same score, so a made-up score is turned away. */

const C = globalThis.POF_DIP_CORE, CH = globalThis.POF_DIP_CHAINS;
const DT = 1 / 120, MAX_CODE = 20000, MAX_STEPS = 120 * 60 * 30;
const ORIGINS = ['https://proofoffight.com', 'https://www.proofoffight.com', 'http://localhost:8765'];
const BAD = new Set(['ASS', 'FUK', 'FUC', 'FCK', 'CUM', 'COK', 'DIK', 'DIC', 'FAG', 'GAY', 'JEW', 'KKK', 'NIG', 'NGR', 'SEX', 'TIT', 'VAG', 'WTF', 'POO', 'PEE', 'PUS', 'CNT', 'KYS', 'HOE', 'XXX', 'NAZ', 'SUK', 'SUC', 'FKU', 'GOD']);

const terrains = {};
function terrain(mode, seed) {
  const key = mode === 'daily' ? 'daily:' + seed : mode;
  if (!terrains[key]) {
    if (mode === 'daily') terrains[key] = C.makeTerrain({ mode: 'daily', seed });
    else terrains[key] = C.makeTerrain({ mode: 'chain', chain: CH.CHAINS[mode], data: globalThis[CH.CHAINS[mode].dataVar] });
  }
  return terrains[key];
}
function utcDay(offset) { return new Date(Date.now() + (offset || 0) * 864e5).toISOString().slice(0, 10); }

// Is this a run we can stand behind? Returns the decoded run or an error string.
function check(code, verify) {
  if (typeof code !== 'string' || code.length > MAX_CODE) return 'bad run';
  const R = C.decodeGhost(code);
  if (!R || R.end > MAX_STEPS) return 'bad run';
  if (R.mode === 'daily') {
    // Today's coin, give or take a day for time zones and runs that cross midnight.
    if (![utcDay(-1), utcDay(0), utcDay(1)].includes(R.seed)) return 'old daily coin';
  } else if (!CH.CHAINS[R.mode] || R.seed) return 'bad run';
  if (!verify) return R.score <= R.day * 10 + 60000 ? R : 'score does not add up';
  const T = terrain(R.mode, R.seed);
  T.coins.forEach(c => { c.got = false; });   // the terrain is reused between requests, coins included
  const S = C.newRun(T);
  let ti = 0, ki = 0, hold = false;
  const every = R.kfEvery || 600;
  for (let n = 0; n < R.end; n++) {
    if (S.dead) return 'run ended early';
    while (ti < R.tog.length && R.tog[ti] <= n) { hold = !hold; ti++; }
    if (n % every === 0 && ki < R.kf.length) {
      const k = R.kf[ki++];
      // Snapshots may only be what the run already was (rounded), never a teleport.
      if (Math.abs(k[0] / 10 - S.x) > 1 || Math.abs(k[1] / 10 - S.y) > 1 || Math.abs(k[2] - S.vx) > 1 || Math.abs(k[3] - S.vy) > 1) return 'run does not replay';
      S.x = k[0] / 10; S.y = k[1] / 10; S.vx = k[2]; S.vy = k[3]; S.s = k[4]; S.air = k[5] === 1;
      S.airT = k[6] / 100; S.fever = k[7] / 100; S.streak = k[8];
    }
    C.step(S, hold, DT);
    S.ev.length = 0;
  }
  if (!S.dead || C.score(S) !== R.score) return 'run does not replay';
  return R;
}

async function shortId(code) {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code)));
  const A = 'abcdefghijkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < 7; i++) s += A[h[i] % A.length];
  return s;
}
async function saveRun(env, code, R) {
  const id = await shortId(code);
  await env.DB.prepare('INSERT OR IGNORE INTO runs (id, mode, seed, score, day, code, created) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, R.mode, R.seed, R.score, R.day, code, Date.now()).run();
  return id;
}
function board(R) { return R.mode === 'daily' ? 'daily-' + R.seed : R.mode; }
async function ipKey(req) {
  const ip = req.headers.get('CF-Connecting-IP') || '';
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('pof-dip:' + ip)));
  return Array.from(h.slice(0, 8), b => b.toString(16).padStart(2, '0')).join('');
}
async function tooMany(env, ip, table, per) {
  const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ip = ? AND created > ?`).bind(ip, Date.now() - 60000).first();
  return r && r.n >= per;
}

async function handle(req, env) {
  const url = new URL(req.url), path = url.pathname.replace(/\/+$/, '');
  const verify = env.VERIFY === '1';
  if (req.method === 'POST' && path === '/runs') {
    const body = await req.json().catch(() => ({}));
    const R = check(body.code, verify);
    if (typeof R === 'string') return json({ error: R }, 400);
    return json({ id: await saveRun(env, body.code, R) });
  }
  let m = /^\/runs\/([a-z0-9]{4,12})$/.exec(path);
  if (req.method === 'GET' && m) {
    const row = await env.DB.prepare('SELECT code FROM runs WHERE id = ?').bind(m[1]).first();
    return row ? json({ code: row.code }, 200, 86400) : json({ error: 'not found' }, 404);
  }
  if (req.method === 'POST' && path === '/scores') {
    const body = await req.json().catch(() => ({}));
    const initials = String(body.initials || '').toUpperCase();
    if (!/^[A-Z]{3}$/.test(initials) || BAD.has(initials)) return json({ error: 'pick other initials' }, 400);
    const ip = await ipKey(req);
    if (await tooMany(env, ip, 'scores', 6)) return json({ error: 'slow down' }, 429);
    const R = check(body.code, verify);
    if (typeof R === 'string') return json({ error: R }, 400);
    const run = await saveRun(env, body.code, R), b = board(R);
    await env.DB.prepare('INSERT OR IGNORE INTO scores (board, initials, score, day, run, ip, created) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(b, initials, R.score, R.day, run, ip, Date.now()).run();
    const rank = await env.DB.prepare('SELECT COUNT(*) + 1 AS r FROM scores WHERE board = ? AND score > ?').bind(b, R.score).first();
    return json({ run, board: b, rank: rank.r });
  }
  if (req.method === 'GET' && path === '/scores') {
    const b = url.searchParams.get('board') || 'btc';
    if (!/^(btc|sol|[a-z]{2,8}|daily-\d{4}-\d{2}-\d{2})$/.test(b)) return json({ error: 'bad board' }, 400);
    const n = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || 10));
    const rows = await env.DB.prepare('SELECT initials, score, day, run, created FROM scores WHERE board = ? ORDER BY score DESC, created ASC LIMIT ?').bind(b, n).all();
    return json({ board: b, top: rows.results || [] }, 200, 30);
  }
  if (path === '' || path === '/health') return json({ ok: true, verify });
  return json({ error: 'not found' }, 404);
}

let CORS = {};
function json(data, status, maxAge) {
  const h = Object.assign({ 'content-type': 'application/json; charset=utf-8' }, CORS);
  if (maxAge) h['cache-control'] = 'public, max-age=' + maxAge;
  return new Response(JSON.stringify(data), { status: status || 200, headers: h });
}

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin');
    CORS = { 'access-control-allow-origin': ORIGINS.includes(origin) ? origin : ORIGINS[0], 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type', vary: 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    try { return await handle(req, env); } catch (e) { return json({ error: 'server error' }, 500); }
  }
};
