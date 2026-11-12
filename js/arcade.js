/* The arcade at proofoffight.com: fills in today's Daily Fight and Daily Coin, your bests from this browser, and draws
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
  try { $('daily-coin').textContent = 'Daily Coin: ' + C.makeTerrain({ mode: 'daily', seed: new Date().toISOString().slice(0, 10) }).name; } catch (e) { /* keep the plain label */ }

  // The Daily Fight turns over at local midnight (the Daily Coin at midnight UTC).
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

  function redraw() { drawStage(); R = null; if (reduce) drawRide(t0 + 300000); }
  redraw();
  run();
  document.addEventListener('visibilitychange', function () { if (!document.hidden) run(); });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(redraw, 120); });
})();
