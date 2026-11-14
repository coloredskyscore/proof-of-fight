/* Wen Lambo (proofoffight.com/lambo/): the game around the road. The road trip map, the garage, the drive
   itself (time trial or cruise), the results, the share picture and the leaderboards.
   Rules: js/wl-core.js. Cars: js/wl-cars.js. Road and scenery: js/wl-view.js. Radio and sound: js/wl-audio.js.
   Add ?all to open every stage, car and part; ?debug exposes window.POF_WL; ?auto lets the bot drive. */
(function () {
  'use strict';
  var C = window.POF_WL_CORE, K = window.POF_WL_CARS, V = window.POF_WL_VIEW, A = window.POF_WL_AUDIO;
  var Q = location.search, ALL = /[?&]all\b/.test(Q), DEBUG = /[?&]debug\b/.test(Q), AUTO = /[?&]auto\b/.test(Q);
  var API = 'https://pof-dip.brianboode.workers.dev';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cv = document.getElementById('wl-cv'), g = cv.getContext('2d'), rootEl = document.getElementById('wl-root');
  var W = 0, H = 0, dpr = 1;
  function $(s) { return rootEl.querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var DESC = {
    miami: 'Palm trees, a causeway and easy bends. A good place to learn to draft.',
    denver: 'Up into the mountains at night. Big climbs and blind crests.',
    riviera: 'The coast road at sunset. One S-bend after another.',
    dubai: 'A six-lane desert highway. Sand on the road costs you grip.',
    tokyo: 'Rain, neon and tight expressway bends. Brake before you slide.',
    grid: 'The bonus stage. Rollercoaster hills and traffic that changes lanes.'
  };
  var CAR_NEED = { niner: 'miami', strake: 'denver', suv: 'dubai', bear: 'tokyo' };
  var MEDAL = ['', 'BRONZE', 'SILVER', 'GOLD'];

  // ---------- Saved progress ----------
  var save = { v: 1, done: {}, best: {}, car: 'nightwedge', builds: {}, radio: 0, muted: false, initials: '', mode: 'trial', stage: 'miami', ghost: 'best' };
  try { var raw = JSON.parse(localStorage.getItem('pof-wl') || 'null'); if (raw && raw.v === 1) for (var k0 in raw) save[k0] = raw[k0]; } catch (e) { /* private mode */ }
  function store() { try { localStorage.setItem('pof-wl', JSON.stringify(save)); } catch (e) { /* private mode */ } }
  function buildOf(id) { if (!save.builds[id]) save.builds[id] = K.defaults(id); return save.builds[id]; }
  function stageName(id) { return C.STAGES[C.stageIdx[id]].name; }
  function has(need) {
    if (!need || ALL) return true;
    if (need.indexOf('gold:') === 0) { var st = need.slice(5), b = save.best[st]; return !!b && C.medal(st, b.ms) >= 3; }
    return !!save.done[need];
  }
  function needText(need) { return need.indexOf('gold:') === 0 ? 'GOLD IN ' + stageName(need.slice(5)) : 'FINISH ' + stageName(need); }
  function stageOpen(i) { return i === 0 || ALL || !!save.done[C.STAGES[i - 1].id]; }
  function carOpen(id) { return has(CAR_NEED[id]); }
  // Everything that can be unlocked, as "kind:id" -> label, to tell what a finished run just opened.
  function unlockedSet() {
    var o = {}, kind;
    C.STAGES.forEach(function (s, i) { if (stageOpen(i)) o['stage:' + s.id] = 'Next stop: ' + s.name; });
    C.CARS.forEach(function (c) { if (carOpen(c.id)) o['car:' + c.id] = 'New car: ' + c.name; });
    for (kind in K.PARTS) K.PARTS[kind].forEach(function (p) { if (has(p.need)) o[kind + ':' + p.id] = ({ paint: 'Paint', finish: 'Finish', rim: 'Wheels', rimColor: 'Wheel colour', wing: 'Wing', glow: 'Underglow', decal: 'Decal' })[kind] + ': ' + p.name; });
    return o;
  }
  if (!carOpen(save.car)) save.car = 'nightwedge';
  if (!C.STAGES[C.stageIdx[save.stage]] || !stageOpen(C.stageIdx[save.stage])) save.stage = 'miami';

  // ---------- Leaderboards (a small server shared with Ride the Chart; the game works without it) ----------
  var boards = {}, topRuns = {};
  function getBoard(stage, cb) {
    var b = boards[stage]; if (b && Date.now() - b.at < 60000) { cb(b); return; }
    fetch(API + '/wl/scores?board=wl-' + stage + '&limit=5').then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (j) {
      boards[stage] = { at: Date.now(), top: (j.top || []).map(function (r) { return { initials: r.initials, ms: 10000000 - r.score, car: C.CARS[r.day] ? C.CARS[r.day].name : '', run: r.run }; }) }; cb(boards[stage]);
      var t = boards[stage].top[0]; if (t && !topRuns[stage]) fetch(API + '/runs/' + t.run).then(function (r) { return r.json(); }).then(function (j2) { var R = C.decode(j2.code); if (R) topRuns[stage] = { R: R, initials: t.initials }; }).catch(function () { /* no ghost */ });
    }).catch(function () { cb(null); });
  }
  function postScore(code, initials, cb) {
    fetch(API + '/wl/scores', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: code, initials: initials }) })
      .then(function (r) { return r.json(); }).then(function (j) { cb(j && j.rank ? j : null, j && j.error); }).catch(function () { cb(null); });
  }

  // ---------- The loop ----------
  var state = 'map', S = null, G = null, gNext = null, gInfo = null, bg = null, last = 0, acc = 0, tSec = 0, steerVis = 0, skyX = 0, bump = 0, countT = 0, flashT = 0, lastRun = null;
  var keys = { l: false, r: false, b: false }, touch = { l: false, r: false }, pointers = {};
  function resize() { dpr = Math.min(window.devicePixelRatio || 1, 2); W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  function input() {
    var l = keys.l || touch.l, r = keys.r || touch.r, b = keys.b || (touch.l && touch.r);
    var steer = b && touch.l && touch.r ? 0 : l && !r ? -1 : r && !l ? 1 : 0;
    return (steer + 1) * 2 + (b ? 1 : 0);
  }
  function newBg() { bg = C.newRun(save.stage, save.car, true); bg.pos = (40 + Math.floor(Math.random() * 200)) * C.SEG; }
  function tickRun(R, inp) {
    var si = Math.floor((R.pos + C.PZ) / C.SEG); skyX += (R.T.curve[si] || 0) * (R.speed / C.MAX) * 0.0011;
    C.step(R, inp);
  }
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.1, (now - last) / 1000 || 0); last = now; tSec += dt;
    if (document.hidden) return;
    acc += dt; var n = 0;
    while (acc >= C.DT && n < 6) {
      acc -= C.DT; n++;
      if (state === 'drive') {
        var inp = AUTO ? C.bot(S, 1) : input();
        tickRun(S, inp);
        if (G && !G.done) C.step(G, gNext());
        if (G) G.ev.length = 0;
        for (var i = 0; i < S.ev.length; i++) onEvent(S.ev[i]);
        S.ev.length = 0;
        steerVis += (S.sv - steerVis) * 0.3;
      } else if (state === 'count') {
        var before = Math.ceil(countT); countT -= C.DT; var after = Math.ceil(countT);
        if (after !== before) { if (after > 0) { flash(String(after), 'count'); A.sfx.beep(false); } else { flash('GO!', 'go'); A.sfx.beep(true); state = 'drive'; } }
      } else if (state !== 'pause' && bg) {
        tickRun(bg, C.bot(bg, 0.5)); bg.ev.length = 0; if (bg.done) newBg();
        steerVis += (bg.sv - steerVis) * 0.3;
      }
      if (bump > 0) bump -= C.DT * 2.2;
    }
    if (acc > C.DT * 6) acc = 0;
    draw();
  }
  function draw() {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var driving = state === 'drive' || state === 'count' || state === 'pause', R = driving ? S : bg;
    if (!R) return;
    var brake = driving && state === 'drive' && (input() & 1);
    V.frame(g, W, H, { S: R, car: R.car.id, build: buildOf(R.car.id), steer: steerVis, brake: !!brake, t: tSec, ghost: driving && G ? { pos: G.pos, x: G.x, car: G.car.id } : null, traffic: driving, hideCar: state === 'garage', reduce: reduce, bump: Math.max(0, bump), skyX: skyX });
    if (driving) hud();
    A.engine(R.speed / C.MAX, driving && state !== 'pause', R.boost > 0);
  }

  // ---------- Driving ----------
  var hudEl = null, el = {};
  function hudBuild() {
    hudEl = document.createElement('div'); hudEl.className = 'wl-hud'; hudEl.hidden = true;
    hudEl.innerHTML =
      '<div class="wl-top"><div class="wl-stat"><span id="wl-tl">TIME</span><b id="wl-time">0:00.00</b><i id="wl-gap"></i></div>' +
      '<div class="wl-mid"><span id="wl-where"></span><div class="wl-prog"><i id="wl-pm"></i><em id="wl-pg"></em></div></div>' +
      '<div class="wl-stat r"><span>MPH</span><b id="wl-mph">0</b><i id="wl-boost">DRAFT</i></div></div>' +
      '<div class="wl-flash" id="wl-flash" aria-live="polite"></div>' +
      '<div class="wl-bot"><button type="button" class="wl-pill" id="wl-radio" aria-label="Change radio station">' + ICON.radio + '<span id="wl-rname"></span></button>' +
      '<button type="button" class="wl-pill" id="wl-pause" aria-label="Pause">' + ICON.pause + '</button></div>' +
      '<div class="wl-hint" id="wl-hint">Hold the <b>left</b> or <b>right</b> side to steer. Hold <b>both</b> to brake.</div>';
    rootEl.appendChild(hudEl);
    ['time', 'gap', 'where', 'pm', 'pg', 'mph', 'boost', 'flash', 'rname', 'hint', 'tl'].forEach(function (id) { el[id] = $('#wl-' + id); });
    $('#wl-radio').addEventListener('click', function () { radioNext(); });
    $('#wl-pause').addEventListener('click', function () { pause(); });
  }
  var ICON = {
    radio: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M5 3.2 17.6 7H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9c0-.9.6-1.7 1.4-1.9L4.4 5 5 3.2ZM8 10.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm6 .5v2h6v-2h-6Zm0 4v2h4v-2h-4Z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M7 10V7a5 5 0 0 1 10 0v3h1.5A1.5 1.5 0 0 1 20 11.500v9A1.500 1.500 0 0 1 18.500 22h-13A1.500 1.500 0 0 1 4 20.500v-9A1.500 1.500 0 0 1 5.500 10H7Zm2 0h6V7a3 3 0 0 0-6 0v3Z"/></svg>',
    sound: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4V9Zm12.500-.500a5 5 0 0 1 0 7l-1.400-1.400a3 3 0 0 0 0-4.200l1.400-1.400Z"/></svg>',
    mute: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4 9h4l5-4v14l-5-4H4V9Zm11.600.200L17.500 11l1.900-1.800 1.400 1.400L18.900 12.500l1.900 1.900-1.400 1.400-1.900-1.900-1.900 1.900-1.400-1.400 1.900-1.900-1.900-1.900 1.400-1.400Z"/></svg>'
  };
  function flash(text, cls) { el.flash.textContent = text; el.flash.className = 'wl-flash ' + (cls || ''); void el.flash.offsetWidth; el.flash.classList.add('on'); }
  function radioLabel() { var st = A.station(); el.rname.textContent = st.off ? 'RADIO OFF' : st.name + ' ' + st.freq; var m = $('#wl-m-radio'); if (m) m.textContent = st.off ? 'RADIO OFF' : st.name + ' ' + st.freq; }
  function radioNext() { A.start(); A.nextStation(); save.radio = A.index(); store(); radioLabel(); if (state === 'drive') flash(A.station().off ? 'RADIO OFF' : A.station().name + '  ' + A.station().freq, 'radio'); }
  function onEvent(ev) {
    if (ev === 'crash') { bump = 1; A.sfx.crash(); flash(S.car.id === 'suv' ? 'SHOVE' : 'REKT', 'bad'); if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) { /* no haptics */ } }
    else if (ev === 'draft') { A.sfx.draft(); flash('DRAFT!', 'good'); }
    else if (ev === 'finish') finish();
  }
  function hud() {
    var T = S.T, p = Math.max(0, Math.min(1, (S.pos + C.PZ - T.startSeg * C.SEG) / (T.finishZ - T.startSeg * C.SEG)));
    el.time.textContent = S.cruise ? 'CRUISE' : C.fmt(Math.round(S.tick * 1000 / C.TPS));
    el.mph.textContent = Math.round(S.speed / C.MAX * 212);
    el.pm.style.width = (p * 100).toFixed(1) + '%';
    el.boost.style.opacity = S.boost > 0 ? 1 : 0;
    if (G) {
      var gp = Math.max(0, Math.min(1, (G.pos + C.PZ - T.startSeg * C.SEG) / (T.finishZ - T.startSeg * C.SEG))); el.pg.style.left = (gp * 100).toFixed(1) + '%'; el.pg.hidden = false;
      var d = (S.pos - G.pos) / Math.max(C.MAX * 0.5, S.speed), txt = (d >= 0 ? '-' : '+') + Math.abs(d).toFixed(1) + 's ' + gInfo;
      el.gap.textContent = S.tick > 90 ? txt : gInfo; el.gap.className = d >= 0 ? 'good' : 'bad';
    } else { el.pg.hidden = true; el.gap.textContent = ''; }
  }
  function startRun(stage, cruise) {
    A.start(); closeScreens();
    save.stage = stage; store();
    S = C.newRun(stage, save.car, cruise); G = null; gInfo = '';
    if (!cruise && save.ghost !== 'off') {
      var src = save.ghost === 'top' && topRuns[stage] ? { R: topRuns[stage].R, who: topRuns[stage].initials } : save.best[stage] ? { R: C.decode(save.best[stage].code), who: 'YOUR BEST' } : null;
      if (src && src.R) { G = C.newRun(stage, src.R.car, false); gNext = C.player(src.R.rec); gInfo = src.who; }
    }
    steerVis = 0; bump = 0; acc = 0;
    el.where.textContent = (cruise ? 'CRUISING · ' : '') + stageName(stage); el.tl.textContent = cruise ? 'MODE' : 'TIME';
    el.hint.hidden = !('ontouchstart' in window) || !!save.done.miami;
    hudEl.hidden = false; radioLabel();
    if (cruise) { state = 'drive'; flash(stageName(stage), 'radio'); } else { state = 'count'; countT = 3.2; flash('', ''); }
  }
  function pause() {
    if (state !== 'drive' && state !== 'count') return;
    var was = state; state = 'pause';
    screen('wl-pausebox', '<div class="wl-card wl-small"><h2>PAUSED</h2><button type="button" class="wl-btn wl-primary" data-a="resume">RESUME</button><button type="button" class="wl-btn" data-a="restart">RESTART</button><button type="button" class="wl-btn" data-a="map">BACK TO THE MAP</button></div>', function (a) {
      if (a === 'resume') { closeScreens(); state = was; acc = 0; } else if (a === 'restart') startRun(S.T.id, S.cruise); else if (a === 'map') showMap();
    });
  }
  function finish() {
    A.sfx.finish();
    if (S.cruise) {   // cruise rolls on into the next open stage
      var i = S.T.stage.i, nx = i; for (var n = 1; n <= C.STAGES.length; n++) { var j = (i + n) % C.STAGES.length; if (stageOpen(j)) { nx = j; break; } }
      rootEl.classList.add('wl-fade'); setTimeout(function () { if (state === 'drive' && S.cruise) startRun(C.STAGES[nx].id, true); rootEl.classList.remove('wl-fade'); }, 700);
      return;
    }
    var stage = S.T.id, ms = S.ms, code = C.encode(S), before = unlockedSet(), prev = save.best[stage], isBest = !prev || ms < prev.ms;
    save.done[stage] = true; if (isBest) save.best[stage] = { ms: ms, code: code, car: S.car.id }; store();
    var after = unlockedSet(), fresh = []; for (var key in after) if (!before[key]) fresh.push(after[key]);
    var ghostWon = G ? (G.done && G.ms && G.ms < ms ? false : true) : null;
    lastRun = { stage: stage, ms: ms, code: code, car: S.car.id, isBest: isBest, prev: prev ? prev.ms : 0, fresh: fresh, crashes: S.crashes, drafts: S.drafts, ghost: G ? gInfo : '', ghostWon: ghostWon, rank: 0 };
    if (fresh.length) A.sfx.unlock();
    state = 'result'; hudEl.hidden = true; newBg(); showResult();
  }

  // ---------- Screens ----------
  var scr = null;
  function closeScreens() { if (scr) { scr.remove(); scr = null; } }
  function screen(cls, html, onAction) {
    closeScreens();
    scr = document.createElement('section'); scr.className = 'wl-screen ' + cls; scr.innerHTML = html; rootEl.appendChild(scr);
    scr.addEventListener('click', function (e) { var b = e.target.closest('[data-a]'); if (!b || b.disabled) return; A.start(); A.sfx.click(); onAction(b.getAttribute('data-a'), b); });
    return scr;
  }
  function soundBtn() { return '<button type="button" class="wl-pill" data-a="sound" aria-label="Sound on or off">' + (save.muted ? ICON.mute : ICON.sound) + '</button>'; }
  function toggleSound(b) { save.muted = !save.muted; A.mute(save.muted); store(); b.innerHTML = save.muted ? ICON.mute : ICON.sound; }

  // The road trip map
  function showMap() {
    state = 'map'; hudEl.hidden = true; if (!bg || bg.T.id !== save.stage) newBg();
    var stops = C.STAGES.map(function (s, i) {
      var open = stageOpen(i), b = save.best[s.id], md = b ? C.medal(s.id, b.ms) : 0;
      return '<button type="button" class="wl-stop' + (s.id === save.stage ? ' sel' : '') + (open ? '' : ' locked') + '" data-a="stop" data-id="' + s.id + '"' + (open ? '' : ' aria-disabled="true"') + '>' +
        '<canvas width="400" height="250" data-pc="' + s.id + '"></canvas>' + (open ? '' : '<span class="wl-lock">' + ICON.lock + '</span>') +
        '<b>' + s.name + '</b><span>' + (b ? C.fmt(b.ms) + (md ? ' <i class="wl-medal m' + md + '"></i>' : '') : open ? (save.done[s.id] ? '' : 'NEW') : needText(C.STAGES[i - 1].id)) + '</span></button>';
    }).join('<i class="wl-leg"></i>');
    screen('wl-map',
      '<header class="wl-head"><a class="wl-back" href="./">← Games</a><h1 class="wl-logo"><span>WEN</span> <em>LAMBO</em></h1><div class="wl-headr">' + soundBtn() + '</div></header>' +
      '<p class="wl-tag">The conference road trip. Build your car, drive it from Miami to Tokyo, post it.</p>' +
      '<div class="wl-modes" role="group" aria-label="Mode"><button type="button" data-a="mode" data-m="trial" class="' + (save.mode === 'trial' ? 'on' : '') + '">TIME TRIAL</button><button type="button" data-a="mode" data-m="cruise" class="' + (save.mode === 'cruise' ? 'on' : '') + '">CRUISE</button></div>' +
      '<div class="wl-route" id="wl-route">' + stops + '</div>' +
      '<div class="wl-card wl-detail" id="wl-detail"></div>',
      function (a, b) {
        if (a === 'sound') toggleSound(b);
        else if (a === 'mode') { save.mode = b.getAttribute('data-m'); store(); showMap(); }
        else if (a === 'stop') { var id = b.getAttribute('data-id'); if (!stageOpen(C.stageIdx[id])) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); return; } save.stage = id; store(); newBg(); showMap(); }
        else if (a === 'go') startRun(save.stage, save.mode === 'cruise');
        else if (a === 'garage') showGarage();
        else if (a === 'ghost') { save.ghost = b.getAttribute('data-g'); store(); detail(); }
        else if (a === 'radio') radioNext();
      });
    [].forEach.call(scr.querySelectorAll('canvas[data-pc]'), function (c) { V.postcard(c.getContext('2d'), c.getAttribute('data-pc'), c.width, c.height); });
    var sel = scr.querySelector('.wl-stop.sel'); if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest', inline: 'center' });
    detail();
  }
  function detail() {
    var box = $('#wl-detail'); if (!box) return;
    var s = C.STAGES[C.stageIdx[save.stage]], b = save.best[s.id], par = C.PAR[s.id], cruise = save.mode === 'cruise', car = C.CARS[C.carIdx[save.car]];
    var ghosts = [['best', 'YOUR BEST'], ['top', '#1 ON THE BOARD'], ['off', 'NO GHOST']].map(function (o) { return '<button type="button" data-a="ghost" data-g="' + o[0] + '" class="' + (save.ghost === o[0] ? 'on' : '') + '">' + o[1] + '</button>'; }).join('');
    box.innerHTML =
      '<div class="wl-dmain"><div class="wl-kick">STAGE ' + (s.i + 1) + ' OF ' + C.STAGES.length + ' · ' + esc(s.event) + '</div><h2>' + esc(s.title) + '</h2><p>' + DESC[s.id] + '</p>' +
      (cruise ? '<p class="wl-dim">Cruise: no traffic, no clock. Just the road and the radio. It rolls on into the next stop.</p>' :
        '<div class="wl-pars"><span><i class="wl-medal m3"></i>' + C.fmt(par[0]) + '</span><span><i class="wl-medal m2"></i>' + C.fmt(par[1]) + '</span><span><i class="wl-medal m1"></i>' + C.fmt(par[2]) + '</span>' + (b ? '<span class="wl-yours">YOUR BEST <b>' + C.fmt(b.ms) + '</b></span>' : '') + '</div>' +
        '<div class="wl-seg" role="group" aria-label="Ghost to race">' + ghosts + '</div>') + '</div>' +
      '<div class="wl-dside">' + (cruise ? '' : '<div class="wl-board" id="wl-board"><div class="wl-kick">LEADERBOARD</div><div class="wl-dim">Loading…</div></div>') +
      '<div class="wl-acts"><button type="button" class="wl-btn" data-a="garage"><small>GARAGE</small>' + car.name + '</button><button type="button" class="wl-btn" data-a="radio"><small>RADIO</small><span id="wl-m-radio"></span></button><button type="button" class="wl-btn wl-primary wl-go" data-a="go">' + (cruise ? 'CRUISE' : 'GO') + '</button></div></div>';
    radioLabel();
    if (!cruise) getBoard(s.id, function (bd) { var e2 = $('#wl-board'); if (!e2 || save.stage !== s.id) return; e2.innerHTML = '<div class="wl-kick">LEADERBOARD</div>' + boardRows(bd); });
  }
  function boardRows(bd) {
    if (!bd) return '<div class="wl-dim">The leaderboard is offline. Your times are still saved here.</div>';
    if (!bd.top.length) return '<div class="wl-dim">No times yet. Be the first.</div>';
    return '<ol>' + bd.top.map(function (r) { return '<li><b>' + esc(r.initials) + '</b><span>' + esc(r.car) + '</span><em>' + C.fmt(r.ms) + '</em></li>'; }).join('') + '</ol>';
  }

  // The results
  function showResult() {
    var r = lastRun, s = C.STAGES[C.stageIdx[r.stage]], md = C.medal(r.stage, r.ms), nx = C.STAGES[s.i + 1], par = C.PAR[r.stage];
    var nextGoal = md < 3 ? MEDAL[md + 1] + ' is ' + C.fmt(par[2 - md]) : 'Gold. Nothing left to prove here.';
    screen('wl-result',
      '<div class="wl-card wl-res"><div class="wl-kick">' + esc(s.event) + ' · ' + s.name + '</div><h2>YOU MADE IT</h2>' +
      '<div class="wl-bigtime">' + C.fmt(r.ms) + (md ? '<i class="wl-medal big m' + md + '"></i>' : '') + '</div>' +
      '<div class="wl-line">' + (r.isBest ? (r.prev ? '<b class="good">NEW BEST</b> by ' + ((r.prev - r.ms) / 1000).toFixed(2) + 's' : '<b class="good">FIRST FINISH</b>') : 'Your best is ' + C.fmt(save.best[r.stage].ms)) + ' · ' + nextGoal + '</div>' +
      '<div class="wl-line wl-dim">' + r.drafts + ' draft' + (r.drafts === 1 ? '' : 's') + ' · ' + r.crashes + ' crash' + (r.crashes === 1 ? '' : 'es') + (r.ghost ? ' · ' + (r.ghostWon ? 'You beat ' : 'Lost to ') + esc(r.ghost) : '') + '</div>' +
      (r.fresh.length ? '<ul class="wl-fresh">' + r.fresh.map(function (f) { return '<li>' + esc(f) + '</li>'; }).join('') + '</ul>' : '') +
      '<div class="wl-rank" id="wl-rank"></div>' +
      '<div class="wl-acts"><button type="button" class="wl-btn" data-a="retry">RETRY</button><button type="button" class="wl-btn" data-a="share">SHARE</button><button type="button" class="wl-btn" data-a="garage">GARAGE</button>' +
      '<button type="button" class="wl-btn wl-primary" data-a="next">' + (nx && stageOpen(nx.i) ? 'NEXT: ' + nx.name : 'MAP') + '</button></div><div class="wl-note" id="wl-note" aria-live="polite"></div></div>',
      function (a) {
        if (a === 'retry') startRun(r.stage, false);
        else if (a === 'garage') showGarage();
        else if (a === 'share') share(shareCard(r), 'I drove my ' + C.CARS[C.carIdx[r.car]].name + ' to ' + s.name + ' in ' + C.fmt(r.ms) + (md ? ' (' + MEDAL[md].toLowerCase() + ')' : '') + '. Wen Lambo?');
        else if (a === 'next') { if (nx && stageOpen(nx.i)) { save.stage = nx.id; store(); newBg(); } showMap(); }
        else if (a === 'submit') submit();
      });
    rankBox();
  }
  function rankBox() {
    var box = $('#wl-rank'), r = lastRun; if (!box) return;
    if (r.rank) { box.innerHTML = 'You are <b>#' + r.rank + '</b> on the ' + stageName(r.stage) + ' board as <b>' + esc(save.initials) + '</b>.'; return; }
    if (!r.isBest) { box.innerHTML = ''; return; }
    if (save.initials) { box.innerHTML = '<span class="wl-dim">Posting your time…</span>'; submit(); return; }
    box.innerHTML = '<label for="wl-ini">Your initials for the leaderboard</label><input id="wl-ini" maxlength="3" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="AAA"><button type="button" class="wl-btn wl-inline" data-a="submit">POST TIME</button>';
  }
  function submit() {
    var r = lastRun, box = $('#wl-rank'), inp = $('#wl-ini'), ini = (inp ? inp.value : save.initials || '').toUpperCase().replace(/[^A-Z]/g, '');
    if (ini.length !== 3) { if (inp) inp.focus(); return; }
    box.innerHTML = '<span class="wl-dim">Posting your time…</span>';
    postScore(r.code, ini, function (res, err) {
      if (lastRun !== r || !$('#wl-rank')) return;
      if (res) { save.initials = ini; store(); r.rank = res.rank; delete boards[r.stage]; rankBox(); }
      else if (err === 'pick other initials') { save.initials = ''; store(); rankBox(); var n = $('#wl-note'); if (n) n.textContent = 'Pick other initials.'; }
      else $('#wl-rank').innerHTML = '<span class="wl-dim">The leaderboard is offline. Your time is saved on this device.</span>';
    });
  }

  // The garage
  var gTab = 'paint', gView = 'side';
  var TABS = [['paint', 'PAINT'], ['wheels', 'WHEELS'], ['wing', 'WING'], ['glow', 'GLOW'], ['decal', 'DECAL'], ['plate', 'PLATE']];
  function showGarage() {
    state = 'garage'; hudEl.hidden = true;
    screen('wl-garage',
      '<header class="wl-head"><button type="button" class="wl-back" data-a="map">← Map</button><h1 class="wl-logo sm"><span>WEN</span> <em>LAMBO</em></h1><div class="wl-headr">' + soundBtn() + '</div></header>' +
      '<div class="wl-gwrap"><div class="wl-gstage"><canvas id="wl-gcv" width="1200" height="620"></canvas><div class="wl-gname"><b id="wl-gn"></b><span id="wl-gb"></span></div>' +
      '<button type="button" class="wl-pill wl-view" data-a="view" id="wl-gv"></button></div>' +
      '<div class="wl-gcars" id="wl-gcars"></div>' +
      '<div class="wl-card wl-gpanel"><div class="wl-tabs" role="tablist" id="wl-tabs"></div><div class="wl-opts" id="wl-opts"></div><div class="wl-need" id="wl-need" aria-live="polite"></div>' +
      '<div class="wl-stats" id="wl-stats"></div><div class="wl-acts"><button type="button" class="wl-btn" data-a="share">SHARE ON X</button><button type="button" class="wl-btn wl-primary" data-a="drive">DRIVE</button></div><div class="wl-note" id="wl-note" aria-live="polite"></div></div></div>',
      function (a, b) {
        var bd = buildOf(save.car);
        if (a === 'sound') toggleSound(b);
        else if (a === 'map') showMap();
        else if (a === 'drive') startRun(save.stage, save.mode === 'cruise');
        else if (a === 'view') { gView = gView === 'side' ? 'rear' : 'side'; garage(); }
        else if (a === 'tab') { gTab = b.getAttribute('data-t'); garage(); }
        else if (a === 'car') { var id = b.getAttribute('data-id'); if (!carOpen(id)) { $('#wl-need').textContent = C.CARS[C.carIdx[id]].name + ': ' + needText(CAR_NEED[id]).toLowerCase() + ' to unlock.'; return; } save.car = id; store(); newBg(); garage(); }
        else if (a === 'opt') { var kind = b.getAttribute('data-k'), pid = b.getAttribute('data-id'), p = K.part(kind, pid); if (!has(p.need)) { $('#wl-need').textContent = p.name + ': ' + needText(p.need).toLowerCase() + ' to unlock.'; return; } bd[kind] = pid; store(); garage(); }
        else if (a === 'share') share(shareCard(null), 'My ' + C.CARS[C.carIdx[save.car]].name + '. Wen Lambo? Now.');
      });
    scr.addEventListener('input', function (e) { if (e.target.id !== 'wl-plate') return; var v = e.target.value.toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 7); e.target.value = v; buildOf(save.car).plate = v; store(); garageCar(); });
    garage();
  }
  function garage() {
    var car = C.CARS[C.carIdx[save.car]], bd = buildOf(car.id);
    $('#wl-gn').textContent = car.name; $('#wl-gb').textContent = car.blurb; $('#wl-gv').textContent = gView === 'side' ? 'SEE THE BACK' : 'SEE THE SIDE'; $('#wl-need').textContent = '';
    $('#wl-gcars').innerHTML = C.CARS.map(function (c) { var open = carOpen(c.id); return '<button type="button" data-a="car" data-id="' + c.id + '" class="' + (c.id === car.id ? 'sel' : '') + (open ? '' : ' locked') + '"><canvas width="260" height="100" data-car="' + c.id + '"></canvas><b>' + c.name + '</b>' + (open ? '' : '<span>' + ICON.lock + needText(CAR_NEED[c.id]) + '</span>') + '</button>'; }).join('');
    [].forEach.call(scr.querySelectorAll('canvas[data-car]'), function (c) {
      var x = c.getContext('2d'), id = c.getAttribute('data-car'), open = carOpen(id), len = K.SIDE[id].len;
      x.save(); x.translate(130 - len * 0.12, 90); x.scale(0.24, 0.24); K.side(x, id, buildOf(id), { noGlow: true }); x.restore();
      if (!open) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = 'rgba(13,2,33,0.86)'; x.fillRect(0, 0, 260, 100); }
    });
    $('#wl-tabs').innerHTML = TABS.map(function (t) { return '<button type="button" role="tab" data-a="tab" data-t="' + t[0] + '" class="' + (gTab === t[0] ? 'on' : '') + '" aria-selected="' + (gTab === t[0]) + '">' + t[1] + '</button>'; }).join('');
    function chips(kind, label) {
      return '<div class="wl-optrow"><span class="wl-kick">' + label + '</span><div>' + K.PARTS[kind].map(function (p) {
        var open = has(p.need), sw = p.a ? '<i style="background:' + (p.b ? 'linear-gradient(135deg,' + p.a + ',' + p.b + ')' : p.a) + '"></i>' : '';
        return '<button type="button" data-a="opt" data-k="' + kind + '" data-id="' + p.id + '" class="wl-chip' + (bd[kind] === p.id ? ' on' : '') + (open ? '' : ' locked') + '" title="' + p.name + '">' + sw + '<span>' + p.name + '</span>' + (open ? '' : ICON.lock) + '</button>';
      }).join('') + '</div></div>';
    }
    $('#wl-opts').innerHTML = gTab === 'paint' ? chips('paint', 'COLOUR') + chips('finish', 'FINISH') : gTab === 'wheels' ? chips('rim', 'STYLE') + chips('rimColor', 'COLOUR') : gTab === 'wing' ? chips('wing', 'WING') : gTab === 'glow' ? chips('glow', 'UNDERGLOW') : gTab === 'decal' ? chips('decal', 'DECAL') :
      '<div class="wl-optrow"><label class="wl-kick" for="wl-plate">PLATE (UP TO 7)</label><input id="wl-plate" maxlength="7" autocomplete="off" autocapitalize="characters" spellcheck="false" value="' + esc(bd.plate || '') + '"></div>';
    function bar(label, v) { return '<div><span>' + label + '</span><i><b style="width:' + Math.round(Math.max(0.08, Math.min(1, (v - 0.7) / 0.3)) * 100) + '%"></b></i></div>'; }
    $('#wl-stats').innerHTML = bar('TOP SPEED', car.top) + bar('ACCEL', car.acc) + bar('GRIP', car.grip) + (car.id === 'suv' ? '<p>Keeps most of its speed when it hits traffic.</p>' : '');
    garageCar();
  }
  function garageCar() {
    var c = $('#wl-gcv'); if (!c) return; var x = c.getContext('2d'), w = c.width, h = c.height, id = save.car, bd = buildOf(id), fy = h * 0.8;
    x.clearRect(0, 0, w, h);
    // the turntable
    x.save(); x.translate(w / 2, fy); x.scale(1, 0.2); var rg = x.createRadialGradient(0, 0, 40, 0, 0, w * 0.46); rg.addColorStop(0, 'rgba(255,46,151,0.5)'); rg.addColorStop(0.7, 'rgba(45,226,230,0.18)'); rg.addColorStop(1, 'rgba(45,226,230,0)'); x.fillStyle = rg; x.beginPath(); x.arc(0, 0, w * 0.46, 0, 6.3); x.fill();
    x.strokeStyle = 'rgba(45,226,230,0.8)'; x.lineWidth = 6; x.shadowColor = '#2de2e6'; x.shadowBlur = 30; x.beginPath(); x.arc(0, 0, w * 0.43, 0, 6.3); x.stroke(); x.lineWidth = 2; x.beginPath(); x.arc(0, 0, w * 0.34, 0, 6.3); x.stroke(); x.restore();
    if (gView === 'side') { var len = K.SIDE[id].len, sc = Math.min(w * 0.82 / len, 1.05); x.save(); x.translate(w / 2 - len * sc / 2, fy); x.scale(sc, sc); K.side(x, id, bd); x.restore(); }
    else { x.save(); x.translate(w / 2, fy); x.scale(2.5, 2.5); K.rear(x, id, bd, 0); x.restore(); }
  }

  // ---------- The share picture (1200 x 675) ----------
  function shareCard(run) {
    var c = document.createElement('canvas'); c.width = 1200; c.height = 675; var x = c.getContext('2d'), id = run ? run.car : save.car, bd = buildOf(id), car = C.CARS[C.carIdx[id]], stage = run ? run.stage : save.stage, th = V.THEMES[stage];
    V.postcard(x, stage, 1200, 675);
    var vg = x.createLinearGradient(0, 0, 0, 675); vg.addColorStop(0, 'rgba(13,2,33,0.55)'); vg.addColorStop(0.4, 'rgba(13,2,33,0)'); vg.addColorStop(1, 'rgba(13,2,33,0.5)'); x.fillStyle = vg; x.fillRect(0, 0, 1200, 675);
    var len = K.SIDE[id].len, sc = 0.86; x.save(); x.translate(600 - len * sc / 2, 560); x.scale(sc, sc); K.side(x, id, bd); x.restore();
    x.textBaseline = 'alphabetic'; x.textAlign = 'left'; x.font = '400 78px "Monoton", "Arial Black", sans-serif';
    x.shadowBlur = 26; x.shadowColor = '#ff2e97'; x.fillStyle = '#ff2e97'; x.fillText('WEN', 50, 110); var ww = x.measureText('WEN ').width; x.shadowColor = '#2de2e6'; x.fillStyle = '#2de2e6'; x.fillText('LAMBO', 50 + ww, 110); x.shadowBlur = 0;
    x.font = '800 26px "JetBrains Mono", monospace'; x.fillStyle = '#f6e7ff'; x.fillText(car.name + (bd.plate ? '  ·  ' + bd.plate : ''), 54, 156);
    x.textAlign = 'right';
    if (run) { var md = C.medal(run.stage, run.ms); x.font = '800 24px "JetBrains Mono", monospace'; x.fillStyle = 'rgba(246,231,255,0.8)'; x.fillText(C.STAGES[C.stageIdx[run.stage]].title, 1150, 70); x.font = '800 68px "JetBrains Mono", monospace'; x.fillStyle = '#ffd319'; x.shadowColor = '#ffd319'; x.shadowBlur = 18; x.fillText(C.fmt(run.ms), 1150, 136); x.shadowBlur = 0; if (md) { x.font = '800 24px "JetBrains Mono", monospace'; x.fillStyle = ['', '#e08a4a', '#d9d6ea', '#ffd319'][md]; x.fillText(MEDAL[md], 1150, 172); } }
    x.font = '800 24px "JetBrains Mono", monospace'; x.fillStyle = '#f6e7ff'; x.fillText('proofoffight.com/lambo', 1150, 645);
    return c;
  }
  function share(card, text) {
    var url = 'https://proofoffight.com/lambo/', note = $('#wl-note');
    card.toBlob(function (blob) {
      var file = null; try { file = new File([blob], 'wen-lambo.png', { type: 'image/png' }); } catch (e) { /* old browser */ }
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], text: text + ' ' + url }).catch(function () { /* closed */ }); return; }
      var done = function (copied) { if (note) note.textContent = copied ? 'Picture copied. Paste it into your post.' : 'Picture saved. Attach it to your post.'; window.open('https://x.com/intent/post?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url), '_blank', 'noopener'); };
      var dl = function () { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'wen-lambo.png'; a.click(); done(false); };
      if (navigator.clipboard && window.ClipboardItem) navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(function () { done(true); }, dl); else dl();
    }, 'image/png');
  }

  // ---------- Input ----------
  function setKey(e, on) {
    var c = e.code;
    if (c === 'ArrowLeft' || c === 'KeyA') keys.l = on; else if (c === 'ArrowRight' || c === 'KeyD') keys.r = on; else if (c === 'ArrowDown' || c === 'KeyS' || c === 'Space') keys.b = on; else return false;
    return true;
  }
  window.addEventListener('keydown', function (e) {
    if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) { if (e.key === 'Enter' && e.target.id === 'wl-ini') submit(); return; }
    var driving = state === 'drive' || state === 'count';
    if (driving && setKey(e, true)) { e.preventDefault(); return; }
    if (e.repeat) return;
    if (e.code === 'KeyR' && (driving || state === 'map')) radioNext();
    else if ((e.code === 'Escape' || e.code === 'KeyP') && driving) pause();
    else if (e.code === 'Escape' && state === 'pause') { var b = scr && scr.querySelector('[data-a="resume"]'); if (b) b.click(); }
    else if (e.code === 'Enter' && state === 'map' && document.activeElement === document.body) { A.start(); startRun(save.stage, save.mode === 'cruise'); }
  });
  window.addEventListener('keyup', function (e) { setKey(e, false); });
  function updTouch() { touch.l = false; touch.r = false; for (var id in pointers) { if (pointers[id] < W / 2) touch.l = true; else touch.r = true; } }
  cv.addEventListener('pointerdown', function (e) { A.start(); if (state !== 'drive' && state !== 'count') return; pointers[e.pointerId] = e.clientX; updTouch(); try { cv.setPointerCapture(e.pointerId); } catch (err) { /* fine */ } if (el.hint) el.hint.hidden = true; });
  cv.addEventListener('pointermove', function (e) { if (e.pointerId in pointers) { pointers[e.pointerId] = e.clientX; updTouch(); } });
  ['pointerup', 'pointercancel'].forEach(function (t) { cv.addEventListener(t, function (e) { delete pointers[e.pointerId]; updTouch(); }); });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('blur', function () { keys.l = keys.r = keys.b = false; pointers = {}; updTouch(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && state === 'drive' && !AUTO) pause(); });
  window.addEventListener('resize', resize);

  // ---------- Go ----------
  document.documentElement.classList.add('wl-on');
  hudBuild(); resize(); A.mute(save.muted); A.setStation(save.radio || 0, true);
  newBg(); showMap();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (state === 'map') showMap(); });
  if (DEBUG) window.POF_WL = { get S() { return S; }, get G() { return G; }, get state() { return state; }, save: save, core: C, start: startRun, map: showMap, garage: showGarage, card: shareCard, skipCount: function () { countT = 0.02; }, finishNow: function () { S.pos = S.T.finishZ - C.PZ - 400; }, get last() { return lastRun; } };
  requestAnimationFrame(frame);
})();
