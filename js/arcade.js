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
    drawLambo(now);
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

  // Wen Lambo: a neon road into a striped sun, bending left and right, with the pink car on it.
  var lamCv = $('lambo'), LB = null, lamStop = $('lam-stop'), lamMph = $('lam-mph'), STOPS = ['MIAMI', 'DENVER', 'RIVIERA', 'DUBAI', 'TOKYO', 'THE GRID'];
  function drawLambo(now) {
    if (!lamCv) return;
    if (!LB) LB = fit(lamCv);
    var g = LB.g, w = LB.w, h = LB.h, sec = (now - t0) / 1000, hz = h * 0.5, bend = Math.sin(sec * 0.45) * 0.9, i, y;
    var sk = g.createLinearGradient(0, 0, 0, hz); sk.addColorStop(0, '#0d0221'); sk.addColorStop(0.55, '#3b0a5e'); sk.addColorStop(1, '#ff4fa3'); g.fillStyle = sk; g.fillRect(0, 0, w, hz + 1);
    var r = h * 0.3, cx = w / 2 - bend * w * 0.05, cy = hz - r * 0.25, sg = g.createLinearGradient(0, cy - r, 0, cy + r); sg.addColorStop(0, '#ffd319'); sg.addColorStop(0.55, '#ff8f3a'); sg.addColorStop(1, '#ff2e97');
    g.fillStyle = sg; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,79,163,.9)'; for (i = 0; i < 6; i++) g.fillRect(cx - r, cy + r * (0.08 + i * 0.15), r * 2, 1.5 + i * 0.8);
    g.fillStyle = '#240a4a'; for (i = 0; i < 30; i++) { var bh = (0.05 + ((i * 37) % 11) / 11 * 0.13) * h, bx = ((i * w / 28 - bend * 14) % (w + 20) + w + 20) % (w + 20) - 10; g.fillRect(bx, hz - bh, w / 28 - 1, bh + 1); }
    g.fillStyle = '#150430'; g.fillRect(0, hz, w, h - hz);
    for (y = Math.ceil(hz); y < h; y += 2) {
      var t = (y - hz) / (h - hz), z = 1 / Math.max(0.02, t), band = Math.floor(z * 2.2 + sec * 9) % 2, mid = w / 2 + bend * (1 - t) * (1 - t) * w * 0.42, half = t * w * 0.62;
      if (band) { g.fillStyle = 'rgba(255,46,151,' + (0.1 + t * 0.25) + ')'; g.fillRect(0, y, w, 2); }
      g.fillStyle = band ? '#ff2e97' : '#2de2e6'; g.fillRect(mid - half * 1.14, y, half * 2.28, 2);
      g.fillStyle = band ? '#2a1150' : '#251048'; g.fillRect(mid - half, y, half * 2, 2);
      if (band) { g.fillStyle = '#f6e7ff'; g.fillRect(mid - half / 3 - half * 0.02, y, half * 0.04, 2); g.fillRect(mid + half / 3 - half * 0.02, y, half * 0.04, 2); }
    }
    // the car, from behind
    var cw = w * 0.3, u = cw / 300, ox = w / 2, oy = h - 6 + Math.sin(sec * 30) * 0.4;
    g.save(); g.translate(ox, oy); g.rotate(bend * 0.04); g.scale(u, u);
    var gl = g.createRadialGradient(0, 0, 4, 0, 0, 190); gl.addColorStop(0, 'rgba(45,226,230,.9)'); gl.addColorStop(1, 'rgba(45,226,230,0)'); g.save(); g.scale(1, 0.16); g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 190, 0, 7); g.fill(); g.restore();
    g.fillStyle = '#07010f'; g.fillRect(-146, -44, 40, 44); g.fillRect(106, -44, 40, 44);
    g.fillStyle = '#ff2e97'; g.beginPath(); g.moveTo(-90 + bend * 6, -82); g.lineTo(-60 + bend * 12, -122); g.lineTo(60 + bend * 12, -122); g.lineTo(90 + bend * 6, -82); g.fill();
    g.fillStyle = '#150a35'; g.beginPath(); g.moveTo(-78 + bend * 7, -84); g.lineTo(-52 + bend * 12, -114); g.lineTo(52 + bend * 12, -114); g.lineTo(78 + bend * 7, -84); g.fill();
    var bg = g.createLinearGradient(0, -90, 0, -10); bg.addColorStop(0, '#ff7ac0'); bg.addColorStop(0.3, '#ff2e97'); bg.addColorStop(1, '#7a1150'); g.fillStyle = bg;
    g.beginPath(); g.moveTo(-144, -20); g.lineTo(-150, -56); g.quadraticCurveTo(-150, -84, -134, -84); g.lineTo(134, -84); g.quadraticCurveTo(150, -84, 150, -56); g.lineTo(144, -20); g.fill();
    g.fillStyle = '#0a0118'; g.fillRect(-114, -32, 228, 14); g.fillRect(-136, -90, 272, 7);
    g.fillStyle = '#ff184c'; g.shadowColor = '#ff184c'; g.shadowBlur = 10; g.fillRect(-140, -66, 96, 9); g.fillRect(44, -66, 96, 9); g.shadowBlur = 0;
    g.fillStyle = '#f6e7ff'; g.fillRect(-30, -60, 60, 16);
    g.restore();
    if (lamStop) lamStop.textContent = STOPS[Math.floor(sec / 4) % STOPS.length];
    if (lamMph) lamMph.textContent = 204 + Math.round(Math.sin(sec * 1.7) * 6);
  }
  try { var wl = JSON.parse(get('pof-wl') || 'null'), stopsDone = wl && wl.done ? Object.keys(wl.done).length : 0; if (stopsDone) $('best-lambo').innerHTML = 'Road trip: <b>' + Math.min(6, stopsDone) + ' of 6</b> stops reached'; } catch (e) { /* nothing saved */ }

  function redraw() { drawStage(); R = null; N = null; LB = null; if (reduce) { drawRide(t0 + 300000); drawNet(t0 + 8000); drawLambo(t0 + 3000); } }
  redraw();
  run();
  document.addEventListener('visibilitychange', function () { if (!document.hidden) run(); });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(redraw, 120); });
})();
