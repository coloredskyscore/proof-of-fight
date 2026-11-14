/* The arcade at proofoffight.com: fills in today's Daily Fight and Mystery Chart, your bests from this browser, and draws
   the two live previews (the fight stage behind today's two fighters, and an orb riding Bitcoin's real chart).
   Nothing here is needed to play: every card is a plain link to the game's own page (fight/, ride/). */
(function () {
  'use strict';
  var D = window.POF_DATA, E = window.POF_ENGINE, C = window.POF_DIP_CORE;
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(id) { return document.getElementById(id); }
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function json(k) { try { return JSON.parse(get(k)); } catch (e) { return null; } }
  function pad(n) { return String(n).padStart(2, '0'); }

  // ---------- Today ----------
  // Same rule as dailySetup() in js/app.js, so the matchup shown here is the one the game serves.
  function dayNumber(date) {
    var e = D.DAILY_EPOCH.split('-').map(Number);
    return Math.max(1, Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(e[0], e[1] - 1, e[2])) / 864e5) + 1);
  }
  var n = 0, pair = null;
  try {
    n = dayNumber(new Date());
    if (n === 1) pair = [D.FIRST_FIGHT.player, D.FIRST_FIGHT.cpu];
    else {
      var rng = E.makeRng(E.hashString('pof-daily-' + n));
      var roster = D.ROSTER.filter(function (id) {
        var from = D.FIGHTERS[id].dailyFrom;
        return !from || dayNumber(new Date(from + 'T12:00:00')) <= n;
      });
      var p = roster[Math.floor(rng() * roster.length)], c;
      do { c = roster[Math.floor(rng() * roster.length)]; } while (c === p);
      pair = [p, c];
    }
  } catch (e) { pair = null; }

  if (pair) {
    var P = D.FIGHTERS[pair[0]], Q = D.FIGHTERS[pair[1]];
    $('daily-fight').textContent = 'Daily Fight #' + n + ': ' + P.name + ' vs ' + Q.name;
    $('spr-p').src = 'art/' + pair[0] + '-body.webp';
    $('spr-c').src = 'art/' + pair[1] + '-body.webp';
    $('name-p').textContent = P.name.toUpperCase();
    $('name-c').textContent = Q.name.toUpperCase();
  }
  if (D) {
    $('n-fighters').textContent = D.ROSTER.length + ' fighters';
    if (D.STORY) $('n-bosses').textContent = 'Story: ' + D.STORY.ladder.length + ' bosses';
  }

  // The Daily Fight turns over at local midnight (the Mystery Chart at midnight UTC).
  function tick() {
    var now = new Date(), s = Math.max(0, Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now) / 1000));
    $('reset').textContent = 'New fight in ' + pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60);
  }
  tick(); setInterval(tick, 1000);

  // ---------- Your bests (only what this browser has saved) ----------
  var bits = [], story = json('pof.story'), stats = json('pof.stats');
  if (story && story.v === 1 && D && D.STORY && story.rung < D.STORY.ladder.length) bits.push('Story: <b>boss ' + (story.rung + 1) + ' of ' + D.STORY.ladder.length + '</b>');
  if (stats && stats.streak > 0 && stats.lastWin >= n - 1) bits.push('Daily streak <b>' + stats.streak + '</b>');
  else if (stats && stats.won > 0) bits.push('Wins <b>' + stats.won + '</b>');
  if (bits.length) $('best-fight').innerHTML = bits.join(' · ');

  var ride = [['btc', 'sats'], ['sol', 'lamports']].map(function (c) {
    var b = Number(get('pof-dip-best-' + c[0]));
    return b ? { score: b, day: get('pof-dip-bestday-' + c[0]), unit: c[1] } : null;
  }).filter(Boolean)[0];
  if (ride) {
    var day = ride.day ? ride.day.charAt(0) + ride.day.slice(1).toLowerCase() : '';
    $('best-ride').innerHTML = 'Your best: ' + (day ? '<b>' + day.replace(/[<&]/g, '') + '</b> · ' : '') + ride.score.toLocaleString('en-US') + ' ' + ride.unit;
  }

  var unl = +get('pof.a51.unlocked') || 0, won51 = get('pof.a51.best.vault');
  if (unl > 1 || won51) $('best-51').innerHTML = 'Story: <b>stage ' + Math.max(1, Math.min(5, unl || 1)) + ' of 5</b> unlocked';

  var mpBest = +get('pof.mp.best.endless') || 0, mpDay = null;
  try { mpDay = JSON.parse(get('pof.mp.daily.' + new Date().toISOString().slice(0, 10)) || 'null'); } catch (e) { /* nothing saved */ }
  if (mpDay && mpDay.score) $('best-mp').innerHTML = 'Today: <b>' + Number(mpDay.score).toLocaleString('en-US') + '</b> sats';
  else if (mpBest) $('best-mp').innerHTML = 'Endless best: <b>' + mpBest.toLocaleString('en-US') + '</b> sats';

  // ---------- Previews ----------
  function fit(c) {
    var r = c.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.max(1, Math.round(r.width * d)); c.height = Math.max(1, Math.round(r.height * d));
    var g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return { g: g, w: r.width, h: r.height };
  }

  // The fight stage: a night skyline with a candlestick chart in the sky.
  var stage = $('stage');
  function drawStage() {
    var o = fit(stage), g = o.g, w = o.w, h = o.h, seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    var sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#2a1650'); sky.addColorStop(0.7, '#5a2350'); sky.addColorStop(1, '#2a0f22');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    var px = Math.max(3, Math.round(w / 120)), y = h * 0.45, x;
    for (x = px * 2; x < w; x += px * 4) {
      var dy = (rnd() - 0.48) * h * 0.08, top = Math.min(y, y + dy), bh = Math.max(px, Math.abs(dy));
      g.fillStyle = dy < 0 ? 'rgba(43,214,123,.35)' : 'rgba(255,61,90,.35)';
      g.fillRect(x + px, top - px * 2, px * 0.6, bh + px * 4);
      g.fillRect(x, top, px * 2.6, bh);
      y = Math.max(h * 0.25, Math.min(h * 0.6, y + dy));
    }
    for (var bx = 0; bx < w;) {
      var bw = px * (5 + Math.floor(rnd() * 7)), bhh = h * (0.12 + rnd() * 0.22);
      g.fillStyle = '#1a0d26'; g.fillRect(bx, h * 0.78 - bhh, bw, bhh);
      g.fillStyle = 'rgba(255,210,63,.5)';
      for (var wy = h * 0.78 - bhh + px * 2; wy < h * 0.76; wy += px * 3) for (var wx = bx + px; wx < bx + bw - px; wx += px * 3) if (rnd() > 0.6) g.fillRect(wx, wy, px, px);
      bx += bw + px;
    }
    g.fillStyle = '#3a1d3a'; g.fillRect(0, h * 0.78, w, h * 0.22);
    g.fillStyle = '#4e2a4c'; for (var fx = 0; fx < w; fx += px * 8) g.fillRect(fx, h * 0.78, px * 4, px);
  }

  // Ride the Chart: an orb rides Bitcoin's real chart, flattened the way the game does it
  // (log price minus its 45-day average), with the whole chart faint in the sky as the progress bar.
  var data = window.POF_DIP_DATA, ter = [], full = [], startMs = 0;
  if (data) {
    var parts = data.d.split(','), logs = [], v = 0, i, j;
    for (i = 0; i < parts.length; i++) { v += Number(parts[i]); logs.push(v / 1000); }
    var sum = 0, win = [];
    for (i = 0; i < logs.length; i++) {
      win.push(logs[i]); sum += logs[i]; if (win.length > 46) sum -= win.shift();
      if (i % 2 === 0) ter.push(Math.tanh((logs[i] - sum / win.length) * 4));
      if (i % 14 === 0) full.push(logs[i]);
    }
    var s0 = data.start.split('-').map(Number); startMs = Date.UTC(s0[0], s0[1] - 1, s0[2]);
  }
  var rideCv = $('ride'), R = null, t0 = performance.now();
  var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var pxEl = $('px'), chg = $('chg'), dateEl = $('date');
  function terAt(x) { var a = Math.max(0, Math.min(ter.length - 2, Math.floor(x))), f = x - Math.floor(x); return ter[a] + (ter[a + 1] - ter[a]) * f; }
  function drawRide(now) {
    raf = 0;
    drawNet(now);
    drawPool(now);
    if (!ter.length) return;
    if (!R) R = fit(rideCv);
    var g = R.g, w = R.w, h = R.h, sec = (now - t0) / 1000;
    var head = 40 + (sec * 9) % (ter.length - 120);
    var span = Math.max(60, w / 6), step = w / span, base = h * 0.62, amp = h * 0.2, k;
    g.fillStyle = '#0d0f14'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1;
    for (var gy = h * 0.2; gy < h; gy += h * 0.16) { g.beginPath(); g.moveTo(0, gy); g.lineTo(w, gy); g.stroke(); }
    var lo = full[0], hi = Math.max.apply(null, full);
    function fy(val) { return h * 0.42 - (val - lo) / (hi - lo) * h * 0.26; }
    g.beginPath();
    for (k = 0; k < full.length; k++) { var X = 12 + (w - 24) * k / (full.length - 1); if (k) g.lineTo(X, fy(full[k])); else g.moveTo(X, fy(full[k])); }
    g.strokeStyle = 'rgba(247,147,26,.28)'; g.lineWidth = 1.5; g.stroke();
    var fi = Math.min(full.length - 1, Math.round(head * 2 / 14));
    g.fillStyle = 'rgba(247,147,26,.85)'; g.beginPath(); g.arc(12 + (w - 24) * fi / (full.length - 1), fy(full[fi]), 3, 0, 7); g.fill();
    var start = head - span * 0.3;
    g.lineWidth = 3; g.lineCap = 'round';
    for (k = 0; k < span; k++) {
      var y1 = base - terAt(start + k) * amp, y2 = base - terAt(start + k + 1) * amp, x1 = k * step, x2 = x1 + step, down = y2 > y1;
      g.fillStyle = down ? 'rgba(255,61,113,.16)' : 'rgba(31,242,160,.12)';
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineTo(x2, h); g.lineTo(x1, h); g.fill();
      g.strokeStyle = down ? '#ff3d71' : '#1ff2a0';
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    }
    var wallX = span * 0.08 * step + Math.sin(sec * 1.3) * 6;
    var wg = g.createLinearGradient(0, 0, wallX + 30, 0); wg.addColorStop(0, 'rgba(255,61,113,.55)'); wg.addColorStop(1, 'rgba(255,61,113,0)');
    g.fillStyle = wg; g.fillRect(0, 0, wallX + 30, h);
    var ox = span * 0.3 * step, oy = base - terAt(head) * amp - 9 - Math.max(0, Math.sin(sec * 2.2)) * h * 0.09;
    var glow = g.createRadialGradient(ox, oy, 0, ox, oy, 26); glow.addColorStop(0, 'rgba(247,147,26,.7)'); glow.addColorStop(1, 'rgba(247,147,26,0)');
    g.fillStyle = glow; g.beginPath(); g.arc(ox, oy, 26, 0, 7); g.fill();
    g.fillStyle = '#ffe3bd'; g.beginPath(); g.arc(ox, oy, 7, 0, 7); g.fill();
    g.strokeStyle = '#f7931a'; g.lineWidth = 2; g.stroke();
    var price = Math.pow(10, full[fi]), prev = Math.pow(10, full[Math.max(0, fi - 2)]), pc = (price / prev - 1) * 100;
    pxEl.textContent = '$' + (price < 10 ? price.toFixed(2) : Math.round(price).toLocaleString('en-US'));
    chg.textContent = (pc >= 0 ? '+' : '') + pc.toFixed(1) + '%'; chg.className = 'chg ' + (pc >= 0 ? 'up' : 'down');
    var d = new Date(startMs + head * 2 * 864e5); dateEl.textContent = M[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
    raf = !reduce && !document.hidden ? requestAnimationFrame(drawRide) : 0;
  }
  var raf = 0;
  function run() { if (!reduce && !raf) raf = requestAnimationFrame(drawRide); }


  // 51% Attack: a neon network. Red attackers run down the links and take nodes; the defense retakes them.
  // The consensus meter at the top shows how much of the network they hold (51% loses).
  var netCv = $('net'), N = null, consFill = $('cons-fill'), consPct = $('cons-pct');
  var NODES = [[.5, .86, 1], [.22, .7], [.78, .7], [.36, .52], [.64, .52], [.1, .44], [.9, .44], [.5, .36], [.24, .26], [.76, .26], [.5, .16]];
  var LINKS = [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [1, 5], [2, 6], [3, 7], [4, 7], [5, 8], [6, 9], [7, 8], [7, 9], [8, 10], [9, 10], [3, 5], [4, 6]];
  // Each outer node is taken at one moment of a 12 s loop and retaken a few seconds later.
  var TAKE = [null, [6.2, 9.6], [7.4, 10.4], [4.6, 8.8], [5.4, 11], [3.2, 7.6], [2.6, 8.2], [3.8, 9.2], [1.6, 6.8], [1.2, 7], [0.4, 5.6]];
  function hex(g, x, y, r) { g.beginPath(); for (var i = 0; i < 6; i++) { var a = Math.PI / 6 + i * Math.PI / 3; if (i) g.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); else g.moveTo(x + r * Math.cos(a), y + r * Math.sin(a)); } g.closePath(); }
  function drawNet(now) {
    if (!netCv) return;
    if (!N) N = fit(netCv);
    var g = N.g, w = N.w, h = N.h, sec = (now - t0) / 1000, loop = sec % 12, i, k;
    g.fillStyle = '#05040a'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(155,140,255,.10)';
    for (var gx = 8; gx < w; gx += 16) for (var gy = 8; gy < h; gy += 16) g.fillRect(gx, gy, 1, 1);
    var top = 30, P = NODES.map(function (n) { return [n[0] * w, top + n[1] * (h - top - 8)]; });
    var bad = NODES.map(function (n, j) { var T = TAKE[j]; return !!T && loop >= T[0] && loop < T[1]; });
    // links
    g.lineWidth = 1.5;
    LINKS.forEach(function (L) {
      var a = P[L[0]], b = P[L[1]], red = bad[L[0]] || bad[L[1]];
      g.strokeStyle = red ? 'rgba(255,61,90,.35)' : 'rgba(155,92,255,.35)';
      g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
    });
    // packets: tokens flow out from home in teal, attackers run toward a node about to fall in red
    LINKS.forEach(function (L, j) {
      var a = P[L[0]], b = P[L[1]], f = (sec * 0.45 + j * 0.37) % 1;
      g.fillStyle = 'rgba(25,230,176,.9)'; g.beginPath(); g.arc(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, 1.8, 0, 7); g.fill();
    });
    for (i = 1; i < NODES.length; i++) {
      var T = TAKE[i], lead = T[0] - loop;
      if (lead > 0 && lead < 1.2) {
        var from = [P[i][0] + (P[i][0] - w / 2) * 0.35, Math.max(4, P[i][1] - h * 0.22)], f2 = 1 - lead / 1.2;
        g.fillStyle = '#ff3d5a'; g.shadowColor = '#ff3d5a'; g.shadowBlur = 8;
        g.beginPath(); g.arc(from[0] + (P[i][0] - from[0]) * f2, from[1] + (P[i][1] - from[1]) * f2, 3, 0, 7); g.fill(); g.shadowBlur = 0;
      }
    }
    // nodes
    var r = Math.max(7, Math.min(w, h) * 0.045);
    for (i = 0; i < NODES.length; i++) {
      var x = P[i][0], y = P[i][1], home = NODES[i][2], rr = home ? r * 1.6 : r, T2 = TAKE[i];
      var flash = T2 && Math.abs(loop - T2[1]) < 0.35 ? 1 - Math.abs(loop - T2[1]) / 0.35 : 0;
      g.shadowBlur = 12; g.shadowColor = bad[i] ? '#ff3d5a' : '#19e6b0';
      hex(g, x, y, rr); g.fillStyle = bad[i] ? 'rgba(255,61,90,.35)' : 'rgba(25,230,176,' + (0.12 + flash * 0.6) + ')'; g.fill();
      g.lineWidth = home ? 2.5 : 1.8; g.strokeStyle = bad[i] ? '#ff3d5a' : '#19e6b0'; g.stroke(); g.shadowBlur = 0;
      g.fillStyle = bad[i] ? '#ff9aa9' : '#bfffe9'; g.beginPath(); g.arc(x, y, home ? 3.5 : 2, 0, 7); g.fill();
    }
    var held = 0; for (k = 1; k < bad.length; k++) if (bad[k]) held++;
    var pct = Math.round(held / NODES.length * 100);
    consFill.style.width = pct + '%'; consPct.textContent = pct + '%';
  }

  // Mempool: a swimming pool filling up with floats, one at a time, until the whistle. Each entry is the
  // fee color (0 low to 3 top) and the cells the float covers in the 7 x 7 pool.
  var poolCv = $('pool'), PL = null, mpFees = $('mp-fees'), mpFill = $('mp-fill');
  var POOL = [[2, 0, 1, 2], [1, 7, 8, 14, 21, 22], [0, 18, 19, 20, 25], [3, 23, 24, 30], [1, 3, 9, 10, 11, 17], [2, 26, 27, 34], [0, 4], [2, 41, 48], [0, 31, 32, 33], [1, 42, 43, 44],
    [3, 37], [1, 38], [0, 15, 16], [2, 45], [1, 5], [3, 28, 29, 35, 36], [0, 39, 40, 46, 47], [2, 6], [1, 12, 13]];
  var POOL_COL = ['#eef4ff', '#5dff8f', '#ffd23f', '#ff5ea8'], POOL_FEE = [110, 230, 420, 760];
  function drawPool(now) {
    if (!poolCv) return;
    if (!PL) PL = fit(poolCv);
    var g = PL.g, w = PL.w, h = PL.h, sec = (now - t0) / 1000, loop = sec % 11, i, k;
    g.fillStyle = '#050b16'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(190,225,255,.05)';
    for (var gx = 0; gx < w; gx += 24) g.fillRect(gx, 0, 1, h);
    for (var gy = 0; gy < h; gy += 24) g.fillRect(0, gy, w, 1);
    var size = Math.min(h - 44, w * 0.5), c = size / 7, x0 = (w - size) / 2, y0 = 30 + (h - 36 - size) / 2;
    var shown = Math.min(POOL.length, Math.floor(loop / 0.42)), mined = loop > POOL.length * 0.42 + 0.3, fade = loop > 10.2 ? (11 - loop) / 0.8 : 1;
    // transactions waiting on both sides
    for (i = 0; i < 10; i++) {
      var side = i % 2 ? 1 : -1, yy = ((i * 0.173 + sec * 0.05) % 1) * h, sz = c * (0.5 + (i % 3) * 0.25), xx = w / 2 + side * (size / 2 + 14 + (i * 37 % 50) / 50 * (w / 2 - size / 2 - 30 - sz));
      g.fillStyle = POOL_COL[i % 4]; g.globalAlpha = 0.22; g.fillRect(side > 0 ? xx : xx - sz, yy, sz, sz);
    }
    g.globalAlpha = 1;
    g.shadowColor = '#27d3ff'; g.shadowBlur = 18; g.fillStyle = '#d9f3fb'; g.fillRect(x0 - 5, y0 - 5, size + 10, size + 10); g.shadowBlur = 0;
    var wg = g.createLinearGradient(0, y0, 0, y0 + size); wg.addColorStop(0, '#1cc6ee'); wg.addColorStop(1, '#0b7fb0');
    g.fillStyle = wg; g.fillRect(x0, y0, size, size);
    g.strokeStyle = 'rgba(255,255,255,.2)'; g.lineWidth = 1.5;
    for (i = 0; i < 5; i++) { g.beginPath(); for (var wx = 0; wx <= size; wx += 8) { var wy = y0 + (i + 0.5) * size / 5 + Math.sin(wx * 0.07 + sec * 1.3 + i * 1.7) * 3; if (wx) g.lineTo(x0 + wx, wy); else g.moveTo(x0 + wx, wy); } g.stroke(); }
    var fees = 0, cells = 0;
    g.globalAlpha = fade;
    for (i = 0; i < shown; i++) {
      var tx = POOL[i], age = loop - i * 0.42, popIn = Math.min(1, age / 0.18), has = {};
      for (k = 1; k < tx.length; k++) has[tx[k]] = 1;
      g.fillStyle = POOL_COL[tx[0]];
      g.shadowColor = 'rgba(0,34,66,.6)'; g.shadowBlur = 4;
      for (k = 1; k < tx.length; k++) {
        var cx = tx[k] % 7, cy = (tx[k] / 7) | 0, l = cx > 0 && has[tx[k] - 1] ? 0 : 1.5, r = cx < 6 && has[tx[k] + 1] ? 0 : 1.5, t = has[tx[k] - 7] ? 0 : 1.5, b = has[tx[k] + 7] ? 0 : 1.5, grow = (1 - popIn) * c * 0.3;
        var rad = c * 0.3, X = x0 + cx * c + l + grow, Y = y0 + cy * c + t + grow, X2 = x0 + (cx + 1) * c - r - grow + (r ? 0 : 0.5), Y2 = y0 + (cy + 1) * c - b - grow + (b ? 0 : 0.5);
        g.beginPath(); g.moveTo(X + (l && t ? rad : 0), Y); g.arcTo(X2, Y, X2, Y2, r && t ? rad : 0); g.arcTo(X2, Y2, X, Y2, r && b ? rad : 0); g.arcTo(X, Y2, X, Y, l && b ? rad : 0); g.arcTo(X, Y, X2, Y, l && t ? rad : 0); g.closePath(); g.fill();
      }
      g.shadowBlur = 0;
      fees += POOL_FEE[tx[0]] * (tx.length - 1); cells += tx.length - 1;
    }
    g.globalAlpha = 1;
    var flashT = loop - (POOL.length * 0.42 + 0.3);
    if (mined) { g.lineWidth = 3; g.strokeStyle = '#ffd23f'; g.shadowColor = '#ffd23f'; g.shadowBlur = 16; g.strokeRect(x0 - 4, y0 - 4, size + 8, size + 8); g.shadowBlur = 0; }
    if (mined && flashT < 0.5) { g.fillStyle = 'rgba(255,255,255,' + (0.6 * (1 - flashT / 0.5)) + ')'; g.fillRect(x0 - 5, y0 - 5, size + 10, size + 10); }
    if (mined && fade > 0.2) {
      g.fillStyle = 'rgba(5,11,22,.84)'; g.fillRect(x0 - 5, y0 + size / 2 - 15, size + 10, 30);
      g.fillStyle = '#ffd23f'; g.font = '800 ' + Math.round(Math.min(17, size * 0.12)) + 'px "JetBrains Mono", ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('POOL PARTY +50%', w / 2, y0 + size / 2 + 1);
    }
    mpFees.textContent = Math.round(fees * (mined ? 1.5 : 1)).toLocaleString('en-US');
    mpFill.textContent = Math.round(cells / 49 * 100) + '% FULL';
  }

  function redraw() { drawStage(); R = null; N = null; PL = null; if (reduce) { drawRide(t0 + 300000); drawNet(t0 + 8000); drawPool(t0 + 9000); } }
  redraw();
  run();
  document.addEventListener('visibilitychange', function () { if (!document.hidden) run(); });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(redraw, 120); });
})();
