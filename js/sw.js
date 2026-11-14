/* Sui Swell (proofoffight.com/sui/): the game around the rules. Draws the ride (side view), the tube
   (first person), the menus, the judges' cards, the share picture, makes the sound and talks to the leaderboard.
   Rules and waves: js/sw-core.js. Everything on screen is drawn here in code; there are no image files.
   Add ?debug to expose window.POF_SW; ?auto lets the bot surf. */
(function () {
  'use strict';
  var C = window.POF_SW_CORE;
  var Q = location.search, DEBUG = /[?&]debug\b/.test(Q), AUTO = /[?&]auto\b/.test(Q);
  var API = 'https://pof-dip.brianboode.workers.dev';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cv = document.getElementById('sw-cv'), g = cv.getContext('2d'), rootEl = document.getElementById('sw-root');
  var DISP = "'Bungee', Impact, 'Arial Black', sans-serif", SCRIPT = "'Pacifico', 'Brush Script MT', cursive";
  var TAU = Math.PI * 2, FH = C.FH;
  var H = 640, VW = 520, SC = 1, dpr = 1, safeTop = 0;
  function $(s) { return rootEl.querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function hsh(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  // 80s and 90s surf talk
  var OUT = ['TOTALLY TUBULAR!', 'RADICAL!', 'GNARLY BARREL!', 'COWABUNGA!', 'BODACIOUS!', 'RIGHTEOUS!', 'EPIC BARREL, DUDE!', 'SHAKA, BRAH!', 'SO STOKED!', 'TUBULAR TO THE MAX!'];
  var WIPE = ['BUMMER, DUDE', 'SO CLOSE, BRAH!', 'NICE TRY, GROM!', 'GOOD EFFORT, DUDE', "YOU'LL GET THE NEXT ONE"];
  var SPINS = ['AIR!', '360! RAD!', '720!! GNARLY!', '1080!!! NO WAY!'];
  var HITS = { buoy: 'FUD!', jelly: 'GAS SPIKE!', fin: 'RUGGED!', gull: 'PAPER HANDS!' };
  function waveWord(pts) { return pts >= 9500 ? 'PERFECT. TOTALLY TUBULAR!' : pts >= 8500 ? 'RADICAL!' : pts >= 7000 ? 'GNARLY!' : pts >= 5000 ? 'STOKED!' : pts >= 3000 ? 'NOT BAD, GROM' : 'BUMMER, DUDE'; }
  function heatWord(total) { return total >= 28000 ? ['SURF LEGEND', 'the whole beach is chanting your name'] : total >= 25000 ? ['TOTALLY TUBULAR', 'that was righteous, dude'] : total >= 21000 ? ['RADICAL RIPPER', 'the judges are stoked'] : total >= 16000 ? ['GNARLY', 'solid heat, brah'] : total >= 10000 ? ['STOKED GROM', 'you are getting the hang of it'] : ['BEACH KOOK', 'the crowd still loves you']; }

  // ---------- Saved ----------
  var save = { v: 1, best: 0, daily: {}, initials: '', muted: false, runs: 0, tubes: 0 };
  try { var raw = JSON.parse(localStorage.getItem('pof-sw') || 'null'); if (raw && raw.v === 1) for (var k0 in raw) save[k0] = raw[k0]; } catch (e) { /* private mode */ }
  function store() { try { localStorage.setItem('pof-sw', JSON.stringify(save)); } catch (e) { /* private mode */ } }

  // ---------- Leaderboard (a small server shared with the other games; the game works without it) ----------
  var board = null;
  function getBoard(cb, fresh) {
    var date = C.today();
    if (!fresh && board && board.date === date && Date.now() - board.at < 60000) { cb(board); return; }
    fetch(API + '/sw/scores?board=sw-' + date + '&limit=10').then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (j) {
      board = { at: Date.now(), date: date, top: (j.top || []).map(function (r) { return { initials: r.initials, pts: r.score, made: r.day }; }) }; cb(board);
    }).catch(function () { cb(null); });
  }
  function postScore(code, initials, cb) {
    fetch(API + '/sw/scores', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: code, initials: initials }) })
      .then(function (r) { return r.json(); }).then(function (j) { cb(j && j.rank ? j : null, j && j.error); }).catch(function () { cb(null); });
  }
  function boardHtml(b, mine) {
    if (!b) return '<div class="sw-dim">The leaderboard is offline right now.</div>';
    if (!b.top.length) return '<div class="sw-dim">Nobody has surfed today\'s heat yet. Be first.</div>';
    return '<ol class="sw-board">' + b.top.map(function (r, i) {
      return '<li' + (mine && r.initials === mine.initials && r.pts === mine.pts ? ' class="me"' : '') + '><span class="rk">' + (i + 1) + '</span><span class="in">' + esc(r.initials) + '</span><span class="tm">' + C.fmt(r.pts) + '</span></li>';
    }).join('') + '</ol>';
  }

  // ---------- Sound: all made in code. Sea noise, a surf-rock loop, the crowd ----------
  var ac = null, master = null, musicG = null, musicF = null, seaG = null, seaF = null, noiseBuf = null, musicT = 0, musicStep = 0;
  function audio() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ac.createGain(); master.gain.value = save.muted ? 0 : 1; master.connect(ac.destination);
    var len = ac.sampleRate * 2, d, i; noiseBuf = ac.createBuffer(1, len, ac.sampleRate); d = noiseBuf.getChannelData(0); for (i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var n = ac.createBufferSource(); n.buffer = noiseBuf; n.loop = true; seaF = ac.createBiquadFilter(); seaF.type = 'lowpass'; seaF.frequency.value = 500;
    seaG = ac.createGain(); seaG.gain.value = 0.03; n.connect(seaF); seaF.connect(seaG); seaG.connect(master); n.start();
    musicF = ac.createBiquadFilter(); musicF.type = 'lowpass'; musicF.frequency.value = 16000; musicG = ac.createGain(); musicG.gain.value = 0.5; musicF.connect(musicG); musicG.connect(master);
  }
  function tone(f1, f2, dur, type, vol, when, dest) {
    if (!ac) return; var o = ac.createOscillator(), v = ac.createGain(), t = ac.currentTime + (when || 0);
    o.type = type || 'sine'; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    v.gain.setValueAtTime(vol || 0.1, t); v.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(v); v.connect(dest || master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, f1, f2, vol, when, q, dest, attack) {
    if (!ac) return; var s = ac.createBufferSource(), f = ac.createBiquadFilter(), v = ac.createGain(), t = ac.currentTime + (when || 0);
    s.buffer = noiseBuf; s.loop = true; f.type = 'bandpass'; f.Q.value = q || 0.8; f.frequency.setValueAtTime(f1, t); f.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
    v.gain.setValueAtTime(0.0001, t); v.gain.exponentialRampToValueAtTime(vol, t + (attack || 0.01)); v.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(v); v.connect(dest || master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  // The crowd: a swell of noise, some whoops and a patter of claps.
  function cheer(big) {
    if (!ac) return; var i, t;
    noise(big ? 3.2 : 2.2, 900, 1500, big ? 0.22 : 0.14, 0, 0.5, null, 0.35);
    noise(big ? 3 : 2, 2400, 1800, 0.06, 0.1, 0.7, null, 0.4);
    for (i = 0; i < (big ? 9 : 5); i++) { t = 0.1 + Math.random() * 1.6; var f = 480 + Math.random() * 380; tone(f, f * 1.7, 0.32, 'triangle', 0.035, t); tone(f * 1.7, f * 1.2, 0.3, 'triangle', 0.03, t + 0.3); }
    for (i = 0; i < (big ? 50 : 26); i++) noise(0.03, 1800 + Math.random() * 1400, 1500, 0.05, 0.2 + Math.random() * 2.4, 2);
  }
  // Not a boo: a soft "ohhh" and then some kind applause.
  function aww() {
    if (!ac) return; var i;
    for (i = 0; i < 6; i++) { var f = 300 + Math.random() * 190; tone(f, f * 0.72, 1.1, 'triangle', 0.035, Math.random() * 0.15); }
    noise(1.2, 600, 380, 0.07, 0, 0.6, null, 0.2);
    for (i = 0; i < 22; i++) noise(0.03, 1700 + Math.random() * 1200, 1500, 0.04, 1.1 + Math.random() * 1.6, 2);
  }
  // Music: a surf-rock loop. Bass, a twangy tremolo lead and drums; under the lip it goes muffled.
  var BASS = [82.41, 82.41, 98, 110];
  var LEAD = [[659.3, 659.3, 587.3, 493.9, 587.3, 493.9, 440, 392], [440, 493.9, 587.3, 493.9, 440, 392, 329.6, 329.6], [392, 493.9, 587.3, 784, 587.3, 493.9, 587.3, 493.9], [440, 554.4, 659.3, 880, 659.3, 554.4, 493.9, 493.9]];
  var musicMode = 'menu';   // menu | surf | off
  function music() {
    if (!ac || musicMode === 'off') return;
    var beat = 60 / 152 / 4;
    while (musicT < ac.currentTime + 0.15) {
      if (musicT < ac.currentTime) musicT = ac.currentTime + 0.02;
      var st = musicStep++, when = musicT - ac.currentTime, s16 = st % 16, bar = Math.floor(st / 16) % 4, surf = musicMode === 'surf';
      if (s16 % 2 === 0) tone(BASS[bar], BASS[bar], beat * 1.7, 'triangle', surf ? 0.11 : 0.07, when, musicF);
      if (surf || bar % 2 === 0) { var n = LEAD[bar][s16 >> 1]; tone(n, n * 0.995, beat * 0.8, 'sawtooth', surf ? 0.028 : 0.016, when, musicF); }
      if (surf) {
        if (s16 === 0 || s16 === 8 || s16 === 10) tone(130, 42, 0.13, 'sine', 0.2, when, musicF);
        if (s16 === 4 || s16 === 12 || s16 === 14) noise(0.1, 1900, 1200, 0.09, when, 0.7, musicF);
        if (s16 % 2 === 0) noise(0.025, 7000, 6000, 0.025, when, 1.5, musicF);
      }
      musicT += beat;
    }
  }
  setInterval(music, 50);
  function setMuted(m) { save.muted = m; store(); if (master) master.gain.value = m ? 0 : 1; }
  function seaTo(vol, freq) { if (!ac) return; seaG.gain.setTargetAtTime(vol, ac.currentTime, 0.2); seaF.frequency.setTargetAtTime(freq, ac.currentTime, 0.2); }
  function muffle(on) { if (ac) musicF.frequency.setTargetAtTime(on ? 520 : 16000, ac.currentTime, 0.15); }

  // ---------- The loop ----------
  // state: title | ready | ride | trans | tubeready | tube | out | wipe | score | end
  var state = 'title', S = null, last = 0, acc = 0, tSec = 0, sT = 0, paused = false, lastRun = null, wipeWhere = '', autoT = 0;
  var held = false, pressed = false, botMv = false, camY = 0, flow = 0, trail = [], pops = [], parts = [], shake = 0, flash = 0, callout = null, tubeTip = 0, streak = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2); var w = cv.clientWidth * dpr, h = cv.clientHeight * dpr; cv.width = Math.round(w); cv.height = Math.round(h);
    SC = Math.min(w / 520, h / 640); H = h / SC; VW = w / SC;
    var probe = document.getElementById('sw-safe'); safeTop = probe ? (parseFloat(getComputedStyle(probe).paddingTop) || 0) * dpr / SC : 0;
  }
  function geo() { var yb = Math.min(H - 150, H * 0.5 + 215); return { yb: yb, yt: yb - FH, sx: Math.min(VW * 0.28, 240) }; }
  function pop(text, x, y, col, size) { pops.push({ text: text, x: x, y: y, col: col || '#fff', size: size || 22, t: 0, rot: (Math.random() - 0.5) * 0.3 }); }
  function burst(x, y, col, n, sp) { for (var i = 0; i < n; i++) { var an = Math.random() * TAU, s = (sp || 200) * (0.3 + Math.random()); parts.push({ x: x, y: y, vx: Math.cos(an) * s, vy: Math.sin(an) * s - 60, t: 0, life: 0.5 + Math.random() * 0.4, col: col, r: 2 + Math.random() * 3 }); } }
  function say(text, sub, dur) { callout = { text: text, sub: sub || '', t: 0, dur: dur || 2.2 }; }

  function startRun(mode) {
    var seed = mode === 'daily' ? C.today() : Math.floor(Math.random() * 2176782335).toString(36);
    S = C.newRun(mode, seed); lastRun = null; save.runs++; store(); audio(); ready();
  }
  function ready() { state = 'ready'; sT = 0; paused = false; held = false; camY = 0; trail = []; pops = []; parts = []; callout = null; shake = 0; streak = 0; show(null); musicMode = 'surf'; muffle(false); seaTo(0.035, 500); }
  function nextWave() { if (S.phase === 'done') { finish(); return; } C.next(S); ready(); }
  function events() {
    var i, e, G = geo(), px = G.sx, py = G.yb - S.h * FH + camY, tubeNow = state === 'tube';
    for (i = 0; i < S.ev.length; i++) {
      e = S.ev[i];
      if (e === 'drop') {
        streak++; tone(700 + Math.min(streak, 24) * 30, 1500 + Math.min(streak, 24) * 30, 0.1, 'sine', 0.07);
        if (tubeNow) burst(VW / 2, H * 0.5, '#bff3ff', 5, 260); else { burst(px + 10, py - 20, '#bff3ff', 5, 120); if (streak % 10 === 0) pop('HANG TEN!', px + 30, py - 70, '#ffe14a', 26); }
      } else if (e === 'launch' || e === 'launch:whale') { noise(0.35, 500, 2600, 0.1, 0, 1); burst(px, G.yb - FH + camY, '#fff', 14, 220); }
      else if (e === 'whale') { tone(90, 300, 0.6, 'sawtooth', 0.12); pop('WHALE PUMP!', px + 20, py - 60, '#7df3ff', 28); burst(px, py, '#fff', 20, 260); }
      else if (e.indexOf('land:') === 0) {
        var sp = +e.slice(5); tone(520, 1040, 0.18, 'triangle', 0.1); if (sp) { tone(780, 1560, 0.25, 'triangle', 0.1, 0.1); cheer(false); }
        pop(SPINS[Math.min(3, sp)], px + 30, py - 70, sp ? '#ffe14a' : '#fff', sp ? 32 : 24); burst(px, py, '#fff', 12, 200);
      } else if (e === 'sketchy') { tone(240, 90, 0.3, 'sawtooth', 0.12); pop('SKETCHY LANDING', px + 30, py - 60, '#ff9d9d', 22); shake = 0.25; streak = 0; }
      else if (e.indexOf('hit:') === 0) {
        shake = 0.35; streak = 0; tone(200, 60, 0.3, 'sawtooth', 0.16); noise(0.25, 900, 300, 0.12); pop(HITS[e.slice(4)] || 'OUCH', px + 30, py - 60, '#ff6b8a', 28); burst(px, py, '#fff', 16, 240);
        if (navigator.vibrate) try { navigator.vibrate(40); } catch (er) { /* no haptics */ }
      } else if (e === 'tube') { state = 'trans'; sT = 0; held = false; noise(1.3, 300, 900, 0.2, 0, 0.6, null, 0.5); }
      else if (e === 'thread') noise(0.25, 1400, 500, 0.07);
      else if (e === 'chunk' || e.indexOf('scrape') === 0) {
        shake = 0.35; flash = 0.5; streak = 0; noise(0.4, 1200, 300, 0.2); tone(160, 60, 0.25, 'sawtooth', 0.1);
        pop(e === 'chunk' ? 'CLIPPED!' : 'TOO ' + (e === 'scrape:top' ? 'HIGH!' : 'LOW!'), VW / 2, H * 0.36, '#ff6b8a', 30);
        if (navigator.vibrate) try { navigator.vibrate(40); } catch (er2) { /* no haptics */ }
      } else if (e === 'out') {
        state = 'out'; sT = 0; held = false; save.tubes = (save.tubes || 0) + 1; store(); muffle(false); seaTo(0.035, 500); cheer(true);
        tone(523, 1046, 0.3, 'triangle', 0.12, 0.05); tone(659, 1318, 0.3, 'triangle', 0.12, 0.2); tone(784, 1568, 0.6, 'triangle', 0.12, 0.35);
        var r = S.results[S.results.length - 1]; say(r.scrapes === 0 ? OUT[Math.floor(Math.random() * 2) * 0 + (S.results.length * 3 + S.tick) % OUT.length] : OUT[(S.tick + 1) % OUT.length], r.scrapes === 0 ? 'clean barrel!' : 'you made it out!', 2.6);
        parts = [];
      } else if (e.indexOf('wipe:') === 0) {
        state = 'wipe'; sT = 0; held = false; wipeWhere = e.slice(5); muffle(wipeWhere === 'tube'); seaTo(0.09, 300); noise(1.4, 500, 150, 0.25, 0, 0.5); aww();
        say(WIPE[S.tick % WIPE.length], wipeWhere === 'tube' ? 'the foam ball got you' : 'the whitewater caught you', 2.6); shake = 0.5;
      }
    }
    S.ev.length = 0;
  }
  function finish() {
    state = 'end'; musicMode = 'menu'; muffle(false);
    lastRun = { mode: S.mode, seed: S.seed, total: S.total, made: S.made, results: S.results, code: C.encode(S), posted: false, pb: false };
    if (S.total > save.best) { save.best = S.total; lastRun.pb = true; }
    if (S.mode === 'daily' && (!save.daily[S.seed] || S.total > save.daily[S.seed])) { save.daily = {}; save.daily[S.seed] = S.total; }
    store(); showEnd();
  }
  function tick() {
    if (state === 'ready') { if (held || AUTO) { state = 'ride'; } else return; }
    if (state === 'tubeready') {   // a breath before the tube: it waits for a tap the first time, a moment otherwise
      if ((pressed && sT > 0.5) || (S.wave > 0 && save.tubes > 0 && sT > 1.5) || (AUTO && sT > 0.8)) { state = 'tube'; sT = 0; pressed = false; } else return;
    }
    if (state !== 'ride' && state !== 'tube') return;
    if (AUTO) { if (S.tick % 3 === 0) botMv = C.bot(S, 1); held = botMv; }
    C.play(S, held);
    if (state === 'ride') { trail.push({ x: S.x, h: S.h, air: S.air }); if (trail.length > 44) trail.shift(); }
    events();
  }
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.1, (now - last) / 1000) || 0, i, p; last = now; tSec = now / 1000;
    if (!paused) {
      if (state === 'ready' || state === 'ride' || state === 'tube' || state === 'tubeready') { acc += dt; var n = 0; while (acc >= C.DT && n++ < 8) { tick(); acc -= C.DT; if (state !== 'ride' && state !== 'tube') { acc = 0; break; } } if (n > 8) acc = 0; }
      sT += dt; flow += dt;
      if (state === 'trans' && sT > 1.25) { state = 'tubeready'; sT = 0; pressed = false; held = false; muffle(true); seaTo(0.11, 900); flash = 0.6; }
      if ((state === 'out' || state === 'wipe') && sT > 2.7) { state = 'score'; sT = 0; autoT = 0; showWave(); }
      if (state === 'score' && AUTO) { autoT += dt; if (autoT > 1.6) nextWave(); }
      if (S && state === 'ride') { var want = Math.max(0, (S.h - 1.02) * FH * 0.85); camY += (want - camY) * Math.min(1, dt * 8); } else camY += (0 - camY) * Math.min(1, dt * 5);
      shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt * 1.6); if (tubeTip > 0 && state === 'tube') tubeTip -= dt;
      if (callout) { callout.t += dt; if (callout.t > callout.dur) callout = null; }
      for (i = 0; i < pops.length; i++) pops[i].t += dt; pops = pops.filter(function (q) { return q.t < 1.1; });
      for (i = 0; i < parts.length; i++) { p = parts[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; } parts = parts.filter(function (q) { return q.t < q.life; });
    }
    draw(tSec);
  }

  // ---------- Drawing: small pieces ----------
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function dropPath(c, r) { c.beginPath(); c.moveTo(0, -1.45 * r); c.bezierCurveTo(0.35 * r, -0.8 * r, r, -0.25 * r, r, 0.25 * r); c.arc(0, 0.25 * r, r, 0, Math.PI); c.bezierCurveTo(-r, -0.25 * r, -0.35 * r, -0.8 * r, 0, -1.45 * r); c.closePath(); }
  // A water droplet: the thing you collect, and the mark on the board.
  function droplet(x, y, r, t, glow) {
    g.save(); g.translate(x, y + Math.sin(t * 4 + x * 0.05) * r * 0.12);
    if (glow) { var gl = g.createRadialGradient(0, 0, r * 0.4, 0, 0, r * 2.4); gl.addColorStop(0, 'rgba(255,255,255,.55)'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.beginPath(); g.arc(0, 0, r * 2.4, 0, TAU); g.fill(); }
    dropPath(g, r); var gr = g.createLinearGradient(0, -1.4 * r, 0, 1.2 * r); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#9fe6ff'); gr.addColorStop(1, '#4da2ff'); g.fillStyle = gr; g.fill();
    g.lineWidth = Math.max(1.5, r * 0.16); g.strokeStyle = '#0b2f7a'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.ellipse(-r * 0.35, r * 0.1, r * 0.16, r * 0.34, 0.5, 0, TAU); g.fill();
    g.restore();
  }
  function label(txt, x, y, col) { g.font = '10px ' + DISP; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 3; g.strokeStyle = 'rgba(4,22,58,.85)'; g.strokeText(txt, x, y); g.fillStyle = col || '#fff'; g.fillText(txt, x, y); }
  function buoy(x, y, t) {
    g.save(); g.translate(x, y); g.rotate(Math.sin(t * 2 + x) * 0.12);
    g.fillStyle = '#0b1b4a'; g.fillRect(-2, -46, 4, 30); g.fillStyle = '#ffe14a'; g.beginPath(); g.moveTo(2, -46); g.lineTo(26, -39); g.lineTo(2, -32); g.fill();
    g.beginPath(); g.arc(0, 0, 22, 0, TAU); g.fillStyle = '#ff3b4f'; g.fill(); g.save(); g.clip(); g.fillStyle = '#fff'; g.fillRect(-24, -7, 48, 14); g.restore(); g.lineWidth = 3; g.strokeStyle = '#0b1b4a'; g.stroke();
    g.restore(); label('FUD', x + 12, y - 39, '#0b1b4a');
  }
  function jelly(x, y, t) {
    var p = Math.sin(t * 5 + x) * 2, i;
    g.strokeStyle = '#ff8fd6'; g.lineWidth = 3; g.lineCap = 'round';
    for (i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(x + i * 7, y + 4); g.quadraticCurveTo(x + i * 9 + Math.sin(t * 4 + i) * 6, y + 20, x + i * 7 + Math.sin(t * 3 + i * 2) * 5, y + 34 + p); g.stroke(); }
    g.beginPath(); g.moveTo(x - 24 - p, y + 6); g.bezierCurveTo(x - 26 - p, y - 34, x + 26 + p, y - 34, x + 24 + p, y + 6); g.closePath();
    var gr = g.createLinearGradient(0, y - 28, 0, y + 6); gr.addColorStop(0, '#ffc4f0'); gr.addColorStop(1, '#c050e0'); g.fillStyle = gr; g.fill(); g.lineWidth = 3; g.strokeStyle = '#4a1670'; g.stroke();
    g.fillStyle = '#4a1670'; g.beginPath(); g.arc(x - 8, y - 8, 3, 0, TAU); g.arc(x + 8, y - 8, 3, 0, TAU); g.fill();
    label('GAS', x, y - 38, '#ffd0f4');
  }
  function fin(x, y, t, dir) {
    g.save(); g.translate(x, y); g.scale(dir < 0 ? -1 : 1, 1);
    g.beginPath(); g.moveTo(-22, 12); g.quadraticCurveTo(-8, -8, 8, -34); g.quadraticCurveTo(14, -8, 24, 12); g.closePath(); g.fillStyle = '#44506a'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#0b1b4a'; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 3; g.beginPath(); g.moveTo(-34, 13); g.quadraticCurveTo(0, 6 + Math.sin(t * 8) * 2, 34, 13); g.stroke();
    g.restore(); label('RUG', x, y - 44, '#ffd0d0');
  }
  function gull(x, y, t, dir) {
    var f = Math.sin(t * 9 + x * 0.01) * 12;
    g.save(); g.translate(x, y); g.scale(dir < 0 ? -1 : 1, 1); g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = '#0b1b4a'; g.lineWidth = 9; g.beginPath(); g.moveTo(-26, -f); g.quadraticCurveTo(-12, -10 - f * 0.4, 0, 0); g.quadraticCurveTo(12, -10 - f * 0.4, 26, -f); g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = 5; g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(0, 2, 11, 6, 0, 0, TAU); g.fill(); g.lineWidth = 2; g.strokeStyle = '#0b1b4a'; g.stroke();
    g.fillStyle = '#ffb347'; g.beginPath(); g.moveTo(10, 0); g.lineTo(19, 3); g.lineTo(10, 5); g.fill();
    g.restore(); label('PAPER HANDS', x, y - 24, '#fff');
  }
  function whale(x, y, t) {
    g.beginPath(); g.moveTo(x - 64, y + 16); g.bezierCurveTo(x - 46, y - 26, x + 40, y - 30, x + 66, y + 16); g.closePath(); g.fillStyle = '#16337e'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#0b1b4a'; g.stroke();
    g.fillStyle = 'rgba(255,255,255,.85)'; var i; for (i = 0; i < 6; i++) { var a = (t * 1.6 + i / 6) % 1; g.globalAlpha = 1 - a; g.beginPath(); g.arc(x + 14 + (i - 2.5) * 5 * a, y - 20 - a * 46, 3 + a * 3, 0, TAU); g.fill(); } g.globalAlpha = 1;
    label('WHALE', x, y + 4, '#bfe3ff');
  }
  // The surfer. o.ang = board tilt, o.rot = turns of spin, o.pose = ride | air | claim | tumble.
  function surfer(c, x, y, s, o) {
    var skin = '#f2b58a', dark = '#0b1b4a', pose = o.pose || 'ride';
    c.save(); c.translate(x, y); c.scale(s, s); c.rotate((o.ang || 0) + (o.rot || 0) * TAU); c.lineCap = 'round'; c.lineJoin = 'round';
    function limb(pts, w, col) { var i; c.beginPath(); c.moveTo(pts[0], pts[1]); for (i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.lineWidth = w + 3.5; c.strokeStyle = dark; c.stroke(); c.lineWidth = w; c.strokeStyle = col; c.stroke(); }
    // board
    c.beginPath(); c.moveTo(-36, 1); c.quadraticCurveTo(-30, -6, 0, -6); c.quadraticCurveTo(30, -7, 42, -3); c.quadraticCurveTo(28, 5, 0, 5); c.quadraticCurveTo(-28, 5, -36, 1); c.closePath();
    c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = dark; c.stroke();
    c.fillStyle = '#4da2ff'; c.beginPath(); c.moveTo(-30, 1); c.lineTo(34, -2.5); c.lineTo(30, 1.5); c.lineTo(-28, 3.5); c.fill();
    c.fillStyle = '#ff4fa3'; c.beginPath(); c.moveTo(-24, 5); c.lineTo(-30, 14); c.lineTo(-16, 5); c.fill();
    var crouch = pose === 'claim' ? -6 : 0, hip = [-3, -24 + crouch], sh = [3, -43 + crouch];
    limb([-13, -6, -11, -15 + crouch * 0.5, hip[0], hip[1]], 6, skin); limb([13, -6, 11, -16 + crouch * 0.5, hip[0], hip[1]], 6, skin);
    limb([hip[0], hip[1], sh[0], sh[1]], 9, skin);
    c.beginPath(); c.moveTo(-9, -27 + crouch); c.lineTo(5, -27 + crouch); c.lineTo(11, -15 + crouch * 0.5); c.lineTo(3, -16 + crouch * 0.5); c.lineTo(-2, -20 + crouch); c.lineTo(-7, -14 + crouch * 0.5); c.lineTo(-14, -15 + crouch * 0.5); c.closePath(); c.fillStyle = '#ff4fa3'; c.fill(); c.lineWidth = 2; c.strokeStyle = dark; c.stroke();
    c.fillStyle = '#ffe14a'; c.fillRect(-8, -28 + crouch, 13, 3);
    if (pose === 'claim') { limb([sh[0], sh[1], -9, -56 + crouch, -15, -68 + crouch], 5, skin); limb([sh[0], sh[1], 14, -56 + crouch, 19, -69 + crouch], 5, skin); }
    else if (pose === 'air') { limb([sh[0], sh[1], -10, -50, -22, -52], 5, skin); limb([sh[0], sh[1], 12, -30, 16, -8], 5, skin); }
    else { limb([sh[0], sh[1], -10, -42, -22, -38], 5, skin); limb([sh[0], sh[1], 14, -44, 25, -42], 5, skin); }
    var hx = 6, hy = -53 + crouch;
    c.beginPath(); c.arc(hx, hy, 8, 0, TAU); c.fillStyle = skin; c.fill(); c.lineWidth = 2; c.strokeStyle = dark; c.stroke();
    c.beginPath(); c.moveTo(hx + 7, hy - 4); c.quadraticCurveTo(hx + 2, hy - 13, hx - 7, hy - 8); c.quadraticCurveTo(hx - 15, hy - 4, hx - 13, hy + 6); c.quadraticCurveTo(hx - 8, hy + 1, hx - 5, hy - 3); c.quadraticCurveTo(hx, hy - 5, hx + 7, hy - 4); c.closePath(); c.fillStyle = '#ffe9a0'; c.fill(); c.lineWidth = 1.5; c.stroke();
    c.fillStyle = dark; rr(c, hx - 1, hy - 3.5, 10, 4.5, 2); c.fill();
    if (pose === 'claim' || pose === 'air') { c.strokeStyle = dark; c.lineWidth = 1.5; c.beginPath(); c.arc(hx + 3, hy + 3, 3, 0.1, Math.PI - 0.4); c.stroke(); }
    c.restore();
  }

  // ---------- Drawing: the ride (side view) ----------
  // V: { x, h, vh, air, rot, meter, pose, objs: S or null, hideSurfer, scale }
  function drawRide(V, t) {
    var G = V.geo || geo(), yb = G.yb + camY, yt = yb - FH, sx = G.sx, fl = V.x + flow * 40, i, x, y;
    function X(wx) { return sx + (wx - V.x); }
    function Y(h) { return yb - h * FH; }
    function lipY(xs) { var wx = xs - sx + fl; return yt + Math.sin(wx * 0.011) * 7 + Math.sin(wx * 0.029 + 1) * 4; }
    // sky and sun
    var sk = g.createLinearGradient(0, 0, 0, Math.max(60, yt + 50)); sk.addColorStop(0, '#2a1466'); sk.addColorStop(0.5, '#b0389a'); sk.addColorStop(0.8, '#ff7a6b'); sk.addColorStop(1, '#ffd27a'); g.fillStyle = sk; g.fillRect(0, 0, VW, Math.max(60, yt + 60));
    var sunX = VW * 0.72, sunY = yt - 46 + camY * -0.4, sg = g.createRadialGradient(sunX, sunY, 20, sunX, sunY, 190); sg.addColorStop(0, 'rgba(255,240,170,.75)'); sg.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = sg; g.fillRect(sunX - 200, sunY - 200, 400, 400);
    var s2 = g.createLinearGradient(0, sunY - 70, 0, sunY + 70); s2.addColorStop(0, '#fff6b8'); s2.addColorStop(1, '#ff8f5c'); g.fillStyle = s2; g.beginPath(); g.arc(sunX, sunY, 70, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,170,200,.5)'; for (i = 0; i < 5; i++) { x = ((hsh(i) * 1400 - fl * 0.04) % (VW + 300) + VW + 300) % (VW + 300) - 150; y = 70 + safeTop + hsh(i + 9) * Math.max(40, yt - 190) + camY * 0.5; rr(g, x, y, 120 + hsh(i + 3) * 120, 12, 6); g.fill(); rr(g, x + 30, y - 9, 60 + hsh(i + 5) * 60, 10, 5); g.fill(); }
    // the face
    g.beginPath(); g.moveTo(-10, lipY(-10)); for (x = 0; x <= VW + 20; x += 20) g.lineTo(x, lipY(x)); g.lineTo(VW + 20, yb + 30); g.lineTo(-10, yb + 30); g.closePath();
    var fg = g.createLinearGradient(0, yt - 8, 0, yb + 30); fg.addColorStop(0, '#9ff2ff'); fg.addColorStop(0.1, '#55c8ff'); fg.addColorStop(0.45, '#2f8dff'); fg.addColorStop(1, '#0b3a9a'); g.fillStyle = fg; g.fill();
    g.save(); g.clip();
    var bl = g.createRadialGradient(sunX, yt, 10, sunX, yt, 230); bl.addColorStop(0, 'rgba(255,250,200,.5)'); bl.addColorStop(1, 'rgba(255,250,200,0)'); g.fillStyle = bl; g.fillRect(sunX - 240, yt - 20, 480, 260);
    g.strokeStyle = 'rgba(255,255,255,.13)'; g.lineWidth = 2.5; g.lineCap = 'round';
    var w0 = Math.floor((fl - sx) / 90) * 90;
    for (i = -1; i < VW / 90 + 3; i++) { x = sx + (w0 + i * 90 - fl); g.beginPath(); g.moveTo(x + 60, yb + 10); g.quadraticCurveTo(x + 46, yb - FH * 0.55, x - 30, yt - 4); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,.09)'; g.lineWidth = 3;
    for (i = 0; i < 3; i++) { g.beginPath(); for (x = -10; x <= VW + 20; x += 24) { y = Y(0.22 + i * 0.27) + Math.sin((x - sx + fl) * 0.02 + i * 2) * 5; if (x < 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); }
    g.restore();
    // foam along the lip
    g.fillStyle = '#fff';
    var b0 = Math.floor((fl - sx) / 22) * 22;
    for (i = -1; i < VW / 22 + 3; i++) { var wx = b0 + i * 22; x = sx + (wx - fl); var rr0 = 5 + hsh(wx * 0.31) * 6; g.beginPath(); g.arc(x, lipY(x) - 1, rr0, 0, TAU); g.fill(); if (hsh(wx * 0.77) > 0.6) { g.globalAlpha = 0.6; g.beginPath(); g.arc(x - 9 - hsh(wx) * 8, lipY(x) - 12 - hsh(wx * 1.3) * 12, 2 + hsh(wx * 2.1) * 2.5, 0, TAU); g.fill(); g.globalAlpha = 1; } }
    // flat water in front of the wave
    var wg = g.createLinearGradient(0, yb, 0, H); wg.addColorStop(0, '#0d3f9e'); wg.addColorStop(0.25, '#0a2f7c'); wg.addColorStop(1, '#04163a'); g.fillStyle = wg; g.fillRect(0, yb + 14, VW, H - yb + 60);
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.moveTo(-10, yb + 22); for (x = -10; x <= VW + 20; x += 18) g.lineTo(x, yb + 12 + Math.sin((x - sx + fl) * 0.05) * 3 + Math.sin((x - sx + fl) * 0.013) * 3); g.lineTo(VW + 20, yb + 22); for (x = VW + 20; x >= -10; x -= 18) g.lineTo(x, yb + 19 + Math.sin((x - sx + fl) * 0.04 + 2) * 2); g.closePath(); g.fill();
    for (i = 0; i < 7; i++) { y = yb + 40 + i * i * 6 + i * 14; if (y > H) break; var par = 1.15 + i * 0.22, gap = 150 + i * 40, o0 = Math.floor(fl * par / gap) * gap; g.fillStyle = 'rgba(160,220,255,' + (0.16 + i * 0.02) + ')'; for (x = -1; x < VW / gap + 2; x++) { var dx0 = o0 + x * gap, xs = dx0 - fl * par + hsh(dx0 + i * 7) * gap * 0.6; rr(g, xs, y, 40 + hsh(dx0 * 1.7 + i) * 60 + i * 10, 3 + i * 0.6, 2); g.fill(); } }
    // the wake behind the board
    if (trail.length > 2 && !V.hideSurfer && V.objs) { g.lineCap = 'round'; for (i = 1; i < trail.length; i++) { if (trail[i].air || trail[i - 1].air) continue; var a = i / trail.length; g.strokeStyle = 'rgba(255,255,255,' + (a * 0.75) + ')'; g.lineWidth = 2 + a * 5; g.beginPath(); g.moveTo(X(trail[i - 1].x) - 26, Y(trail[i - 1].h)); g.lineTo(X(trail[i].x) - 26, Y(trail[i].h)); g.stroke(); } }
    // things on the wave
    if (V.objs) {
      var objs = V.objs.B.objs, o, tk = V.objs.wt;
      for (i = V.objs.lo; i < objs.length; i++) {
        o = objs[i]; if (X(o.x) > VW + 220) break;
        if (V.objs.taken[o.i]) continue;
        C.place(o, tk); x = X(o.cx); y = Y(o.ch);
        if (x < -90 || x > VW + 90) continue;
        if (o.t === 'drop') droplet(x, y, 11, t, true);
        else if (o.t === 'buoy') buoy(x, y, t);
        else if (o.t === 'jelly') jelly(x, y, t);
        else if (o.t === 'fin') fin(x, y, t, o.dir);
        else if (o.t === 'gull') gull(x, y, t, o.dir);
        else if (o.t === 'whale') whale(x, y, t);
      }
    }
    // the surfer
    var py = Y(V.h) + (V.sink || 0);
    if (!V.hideSurfer && !(V.inv > 0 && Math.floor(t * 14) % 2 === 0)) {
      var pose = V.pose || (V.air ? 'air' : 'ride');
      if (!V.air && pose === 'ride' && Math.abs(V.vh) > 0.5) { g.fillStyle = 'rgba(255,255,255,.8)'; for (i = 0; i < 5; i++) { g.beginPath(); g.arc(sx - 30 - hsh(i + Math.floor(t * 30)) * 26, py - 2 + (hsh(i * 3 + Math.floor(t * 30)) - 0.5) * 16 + V.vh * 8, 2 + hsh(i * 7 + Math.floor(t * 30)) * 3, 0, TAU); g.fill(); } }
      surfer(g, sx, py - 3, V.scale || 1, { ang: pose === 'tumble' ? t * 9 : clamp(-V.vh * 0.42, -0.6, 0.6), rot: -V.rot, pose: pose });
    }
    // the breaking part of the wave, behind you. The slower you are, the closer it gets.
    var fx = sx - (46 + V.meter * 1.7);
    if (fx > -160) {
      function front(yy) { var u = clamp((yy - (yt - 30)) / (FH + 60), 0, 1); return fx + 70 * (1 - u) * (1 - u) + Math.sin(u * 9 + t * 5) * 6; }
      g.fillStyle = 'rgba(6,30,96,.35)'; g.beginPath(); g.ellipse(fx + 50, yt + FH * 0.5, 60, FH * 0.5, 0, 0, TAU); g.fill();
      g.beginPath(); g.moveTo(-40, yt - 60); g.lineTo(front(yt - 30) + 30, yt - 34); for (y = yt - 30; y <= yb + 40; y += 16) g.lineTo(front(y), y); g.lineTo(-40, yb + 60); g.closePath();
      var cg = g.createLinearGradient(fx - 420, 0, fx + 60, 0); cg.addColorStop(0, '#8fd0ff'); cg.addColorStop(0.6, '#d4f1ff'); cg.addColorStop(1, '#ffffff'); g.fillStyle = cg; g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)'; for (i = 0; i < 26; i++) { var bxx = fx - 60 - hsh(i * 4.1) * 520; if (bxx < -40) continue; g.beginPath(); g.arc(bxx + Math.sin(t * 2 + i) * 5, yt - 20 + hsh(i * 9.3) * (FH + 50) + Math.sin(t * 3 + i * 1.7) * 6, 14 + hsh(i * 2.9) * 26, 0, TAU); g.fill(); }
      g.fillStyle = '#fff'; for (i = 0; i < 16; i++) { y = yt - 30 + i * (FH + 70) / 15; var jr = 16 + hsh(i * 1.3) * 16 + Math.sin(t * 6 + i) * 4; g.beginPath(); g.arc(front(y) + 4 + Math.sin(t * 4 + i * 2) * 5, y, jr, 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(190,235,255,.9)'; for (i = 0; i < 9; i++) { y = yt + i * (FH + 30) / 8; g.beginPath(); g.arc(front(y) - 30 - hsh(i) * 40, y + Math.sin(t * 3 + i) * 6, 10 + hsh(i * 2.2) * 12, 0, TAU); g.fill(); }
      g.strokeStyle = '#eafaff'; g.lineWidth = 12; g.lineCap = 'round'; g.beginPath(); g.moveTo(fx - 30, yt - 28); g.quadraticCurveTo(fx + 130, yt - 44, fx + 96 + Math.sin(t * 5) * 6, yt + 54); g.stroke();
      if (V.meter < 30 && V.objs) { g.fillStyle = 'rgba(255,255,255,.9)'; for (i = 0; i < 10; i++) { var ph = (t * 1.8 + hsh(i)) % 1; g.beginPath(); g.arc(fx + 60 + ph * 120, yt + hsh(i * 3.1) * FH - ph * 40, 3 * (1 - ph) + 1, 0, TAU); g.fill(); } }
    }
    return { Y: Y, X: X, yt: yt, yb: yb, sx: sx };
  }

  // ---------- Drawing: the tube (first person) ----------
  function mixRGB(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  function drawTube(V, t) {
    var B = V.B, cx = VW / 2, cy = H * 0.46, TP = Math.max(H * 1.15, VW * 0.8), FAR = 2300, STEP = 50, i, d, k, zr;
    function bx(z) { return Math.sin(z / 620 + B.p1 * 6) * 0.22 + Math.sin(z / 250 + B.p2 * 6) * 0.05; }
    var bx0 = bx(V.z);
    function ring(z) { var dd = Math.max(-190, z - V.z), kk = 240 / (240 + dd), r = C.rad(B, z) * TP * kk; return { k: kk, x: cx + (bx(z) - bx0) * TP * kk * clamp(dd / 300, 0, 1), y: cy - (C.cen(B, z) - V.h) * TP * kk, ry: r, rx: r * 1.35 }; }
    function Yh(h, kk) { return cy - (h - V.h) * TP * kk; }
    var near = [10, 52, 150], mid = [40, 138, 245], far = [165, 238, 255], lit = [205, 255, 246];
    g.fillStyle = 'rgb(8,40,120)'; g.fillRect(0, 0, VW, H);
    var z0 = Math.ceil((V.z - 170) / STEP) * STEP, R, last = null, rgb = function (c, m) { return 'rgb(' + (c[0] * m | 0) + ',' + (c[1] * m | 0) + ',' + (c[2] * m | 0) + ')'; };
    for (zr = z0; zr <= B.TL && zr <= V.z + FAR; zr += STEP) {
      d = zr - V.z; R = ring(zr); last = R;
      var u = clamp(d / FAR, 0, 1), col = u < 0.5 ? mixRGB(near, mid, u * 2) : mixRGB(mid, far, (u - 0.5) * 2), sh = (Math.round(zr / STEP) & 1) ? 0.9 : 1;
      // light comes through the lip overhead, so every band is bright on top and deep below
      var rg = g.createLinearGradient(0, R.y - R.ry, 0, R.y + R.ry); rg.addColorStop(0, rgb(mixRGB(col, lit, 0.5), sh)); rg.addColorStop(0.45, rgb(col, sh)); rg.addColorStop(1, rgb(col, sh * 0.62));
      g.fillStyle = rg; g.beginPath(); g.ellipse(R.x, R.y, R.rx, R.ry, 0, 0, TAU); g.fill();
    }
    // the way out: daylight, and then the sunset
    var dE = B.TL - V.z;
    if (dE <= FAR) {
      R = ring(B.TL); g.save(); g.beginPath(); g.ellipse(R.x, R.y, R.rx, R.ry, 0, 0, TAU); g.clip();
      var sk = g.createLinearGradient(0, R.y - R.ry, 0, R.y + R.ry); sk.addColorStop(0, '#b0389a'); sk.addColorStop(0.45, '#ff7a6b'); sk.addColorStop(0.62, '#ffd27a'); sk.addColorStop(0.63, '#2f8dff'); sk.addColorStop(1, '#0b3a9a'); g.fillStyle = sk; g.fillRect(R.x - R.rx, R.y - R.ry, R.rx * 2, R.ry * 2);
      g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(R.x + R.rx * 0.2, R.y + R.ry * 0.12, R.ry * 0.3, Math.PI, TAU); g.fill();
      g.restore(); g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = Math.max(2, 14 * R.k); g.beginPath(); g.ellipse(R.x, R.y, R.rx, R.ry, 0, 0, TAU); g.stroke();
    } else if (last) {
      var eg = g.createRadialGradient(last.x, last.y, 0, last.x, last.y, last.rx); eg.addColorStop(0, '#ffffff'); eg.addColorStop(0.6, '#d8f6ff'); eg.addColorStop(1, 'rgba(150,232,255,0)'); g.fillStyle = eg; g.beginPath(); g.ellipse(last.x, last.y, last.rx, last.ry, 0, 0, TAU); g.fill();
    }
    // water streaks spiralling up the wall
    g.lineCap = 'round';
    var DS = [-170, -110, -60, -20, 20, 60, 110, 170, 250, 350, 480, 650, 870, 1150, 1500, 1900, 2300];
    for (i = 0; i < 14; i++) {
      var an = i * TAU / 14 + V.z * 0.003, first = true; g.beginPath();
      for (k = 0; k < DS.length; k++) { zr = V.z + DS[k]; if (zr > B.TL) break; R = ring(zr); var a2 = an + DS[k] * 0.0007, px = R.x + Math.cos(a2) * R.rx * 0.99, py = R.y + Math.sin(a2) * R.ry * 0.99; if (first) { g.moveTo(px, py); first = false; } else g.lineTo(px, py); }
      g.strokeStyle = 'rgba(255,255,255,' + (i % 3 === 0 ? 0.15 : 0.06) + ')'; g.lineWidth = i % 3 === 0 ? 3 : 2; g.lineJoin = 'round'; g.stroke();
    }
    // light through the lip above, shadow below
    var lg = g.createLinearGradient(0, 0, 0, H); lg.addColorStop(0, 'rgba(160,255,240,.12)'); lg.addColorStop(0.5, 'rgba(160,255,240,0)'); lg.addColorStop(1, 'rgba(2,10,50,.25)'); g.fillStyle = lg; g.fillRect(0, 0, VW, H);
    // chunks of the lip and droplets, far ones first
    var items = [], it;
    for (i = V.gi; i < B.gates.length; i++) { d = B.gates[i].z - V.z; if (d > FAR) break; if (d > 0) items.push({ d: d, g: B.gates[i] }); }
    for (i = V.ti; i < B.tdrops.length; i++) { d = B.tdrops[i].z - V.z; if (d > FAR) break; if (d > 0) items.push({ d: d, p: B.tdrops[i] }); }
    items.sort(function (p, q) { return q.d - p.d; });
    for (i = 0; i < items.length; i++) {
      it = items[i]; R = ring(V.z + it.d); var al = Math.min(1, (FAR - it.d) / 500);
      if (it.p) { g.globalAlpha = al; droplet(R.x, Yh(it.p.h, R.k), Math.max(2, 34 * R.k * TP / 800), t, true); g.globalAlpha = 1; continue; }
      g.save(); g.globalAlpha = al * 0.93; g.beginPath(); g.ellipse(R.x, R.y, R.rx, R.ry, 0, 0, TAU); g.clip();
      var ye, n = 9, j, wdt = R.rx * 2 / n;
      if (it.g.top) {       // a curtain of water falling from the lip: get under it
        ye = Yh(it.g.hi, R.k); var cg = g.createLinearGradient(0, R.y - R.ry, 0, ye); cg.addColorStop(0, '#dffaff'); cg.addColorStop(1, '#ffffff'); g.fillStyle = cg;
        g.beginPath(); g.moveTo(R.x - R.rx, R.y - R.ry - 4); g.lineTo(R.x + R.rx, R.y - R.ry - 4); g.lineTo(R.x + R.rx, ye);
        for (j = n; j >= 0; j--) g.lineTo(R.x - R.rx + j * wdt, ye + (j % 2 ? 0.07 : -0.02) * R.ry + Math.sin(t * 9 + j) * 0.02 * R.ry);
        g.closePath(); g.fill();
        g.strokeStyle = 'rgba(77,162,255,.5)'; g.lineWidth = Math.max(1, 5 * R.k); for (j = 1; j < n; j++) { g.beginPath(); g.moveTo(R.x - R.rx + j * wdt, R.y - R.ry); g.lineTo(R.x - R.rx + j * wdt, ye - 0.03 * R.ry); g.stroke(); }
      } else {              // a mound of foam on the floor: get over it
        ye = Yh(it.g.lo, R.k); g.fillStyle = '#ffffff'; g.fillRect(R.x - R.rx, ye, R.rx * 2, R.y + R.ry - ye + 4);
        for (j = 0; j <= n; j++) { g.beginPath(); g.arc(R.x - R.rx + j * wdt, ye + Math.sin(t * 7 + j * 2) * 0.02 * R.ry, wdt * 0.62, 0, TAU); g.fill(); }
        g.fillStyle = 'rgba(77,162,255,.35)'; for (j = 0; j < n; j++) { g.beginPath(); g.arc(R.x - R.rx + (j + 0.5) * wdt, ye + wdt * 0.9, wdt * 0.3, 0, TAU); g.fill(); }
      }
      if (it.d < 1300 && !V.intro && it.g === B.gates[V.gi]) {   // say what to do, right on the next one
        var fp = clamp(R.ry * 0.17, 9, 40), ly = it.g.top ? ye - R.ry * 0.16 : ye + R.ry * 0.2;
        g.globalAlpha = 1; g.font = fp + 'px ' + DISP; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#0b2f7a'; g.fillText(it.g.top ? 'GO UNDER' : 'GO OVER', R.x, ly);
        g.beginPath(); var ax = R.x, ay = ly + (it.g.top ? fp * 1.1 : -fp * 1.1), aw = fp * 0.6, dir = it.g.top ? 1 : -1; g.moveTo(ax - aw, ay - dir * aw * 0.5); g.lineTo(ax + aw, ay - dir * aw * 0.5); g.lineTo(ax, ay + dir * aw * 0.7); g.closePath(); g.fill();
      }
      g.restore();
    }
    // spray flying past
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2.5;
    for (i = 0; i < 26; i++) { var ph = (t * 1.5 + hsh(i)) % 1, a3 = hsh(i * 2.7) * TAU, r0 = ph * ph * Math.max(VW, H) * 0.75 + 20; g.beginPath(); g.moveTo(cx + Math.cos(a3) * r0, cy + Math.sin(a3) * r0 * 0.8); g.lineTo(cx + Math.cos(a3) * (r0 + 10 + ph * 46), cy + Math.sin(a3) * (r0 + 10 + ph * 46) * 0.8); g.stroke(); }
    // the nose of your board
    var bs = Math.min(1.25, VW / 520, H / 900);
    g.save(); g.translate(cx, H - 118 - Math.abs(Math.sin(t * 7)) * 4); g.rotate(clamp(-V.vh * 0.14, -0.14, 0.14)); g.scale(bs, bs);
    g.beginPath(); g.moveTo(-92, 30); g.quadraticCurveTo(-84, -112, 0, -196); g.quadraticCurveTo(84, -112, 92, 30); g.closePath();
    var ng = g.createLinearGradient(0, -196, 0, 30); ng.addColorStop(0, '#ffffff'); ng.addColorStop(1, '#d9ecff'); g.fillStyle = ng; g.fill(); g.lineWidth = 5; g.strokeStyle = '#0b1b4a'; g.stroke();
    g.fillStyle = '#4da2ff'; g.beginPath(); g.moveTo(-7, 30); g.lineTo(-4, -176); g.lineTo(4, -176); g.lineTo(7, 30); g.fill();
    g.fillStyle = '#ff4fa3'; g.beginPath(); g.moveTo(-88, 30); g.quadraticCurveTo(-84, -40, -66, -92); g.lineTo(-52, -84); g.quadraticCurveTo(-66, -30, -68, 30); g.fill();
    g.beginPath(); g.moveTo(88, 30); g.quadraticCurveTo(84, -40, 66, -92); g.lineTo(52, -84); g.quadraticCurveTo(66, -30, 68, 30); g.fill();
    g.restore(); droplet(cx + Math.sin(-V.vh * 0.14) * 90 * bs, H - 130 - 78 * bs, 13 * bs, 0, false);
    // the foam ball closing in from behind
    var f = clamp(1 - V.gap / 55, 0, 1);
    if (f > 0) {
      var Rm = Math.hypot(VW, H) / 2, vg = g.createRadialGradient(cx, H / 2, Rm * (0.95 - f * 0.55), cx, H / 2, Rm); vg.addColorStop(0, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(255,255,255,' + (0.5 + f * 0.5) + ')'); g.fillStyle = vg; g.fillRect(0, 0, VW, H);
      g.fillStyle = 'rgba(255,255,255,' + (0.35 + f * 0.6) + ')';
      for (i = 0; i < 22; i++) { var a4 = i * TAU / 22 + t * 0.6, rb = Rm * (1.02 - f * 0.42) + Math.sin(t * 5 + i * 1.7) * 14; g.beginPath(); g.arc(cx + Math.cos(a4) * rb * (VW / (Rm * 1.4)), H / 2 + Math.sin(a4) * rb * (H / (Rm * 1.4)), 30 + hsh(i) * 40 + f * 30, 0, TAU); g.fill(); }
    }
  }
  function drawUnder(t) {   // after a wipeout in the tube: underwater, bubbles going up
    var gr = g.createLinearGradient(0, 0, 0, H), i; gr.addColorStop(0, '#2f8dff'); gr.addColorStop(1, '#04163a'); g.fillStyle = gr; g.fillRect(0, 0, VW, H);
    g.fillStyle = 'rgba(255,255,255,.07)'; for (i = 0; i < 6; i++) { g.beginPath(); g.moveTo(VW * (0.1 + i * 0.17), 0); g.lineTo(VW * (0.16 + i * 0.17), 0); g.lineTo(VW * (0.02 + i * 0.17) + Math.sin(t + i) * 30, H); g.lineTo(VW * (-0.06 + i * 0.17) + Math.sin(t + i) * 30, H); g.fill(); }
    for (i = 0; i < 40; i++) { var ph = (t * (0.25 + hsh(i) * 0.3) + hsh(i * 3.3)) % 1; g.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - ph)) + ')'; g.lineWidth = 2; g.beginPath(); g.arc(hsh(i * 7.7) * VW + Math.sin(t * 3 + i) * 10, H * (1.05 - ph * 1.1), 3 + hsh(i * 1.9) * 9, 0, TAU); g.stroke(); }
    surfer(g, VW / 2 + Math.sin(t * 1.3) * 30, H * 0.55 + Math.sin(t * 2) * 14, 1.5, { pose: 'tumble', ang: t * 3 });
  }

  // The side view of the tube, at the bottom of the screen: where you are, the roof, the floor and what is coming.
  function tubeMap(t) {
    var B = S.B, w = Math.min(VW - 20, 460), h = 132, x = (VW - w) / 2, y = H - h - 10, back = 170, ahead = 1500, x0 = x + w * back / (back + ahead), z, first, i, o, px;
    function mx(zz) { return x + (zz - S.z + back) / (back + ahead) * w; }
    function my(hh) { return y + h - 4 - clamp((hh - 0.08) / 0.84, 0, 1) * (h - 8); }
    g.save(); rr(g, x, y, w, h, 12); g.fillStyle = '#eaf8ff'; g.fill(); g.clip();
    // the open water between the roof and the floor
    g.beginPath(); first = true; for (z = S.z - back; z <= S.z + ahead + 50; z += 50) { px = mx(z); var top = my(C.cen(B, z) + C.rad(B, z)); if (first) { g.moveTo(px, top); first = false; } else g.lineTo(px, top); }
    for (z = S.z + ahead + 50; z >= S.z - back; z -= 50) g.lineTo(mx(z), my(C.cen(B, z) - C.rad(B, z)));
    g.closePath(); var wg = g.createLinearGradient(0, y, 0, y + h); wg.addColorStop(0, '#55c8ff'); wg.addColorStop(1, '#1f6fe0'); g.fillStyle = wg; g.fill(); g.lineWidth = 3; g.strokeStyle = '#0b2f7a'; g.stroke();
    if (B.TL < S.z + ahead + 60) { g.fillStyle = '#ffd27a'; g.fillRect(mx(B.TL), y, w, h); g.fillStyle = '#0b2f7a'; g.font = '11px ' + DISP; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('EXIT', mx(B.TL) + 6, y + h / 2); }
    for (i = S.gi; i < B.gates.length; i++) {   // waterfalls hang from the roof, foam sits on the floor
      o = B.gates[i]; if (o.z > S.z + ahead) break; px = mx(o.z);
      g.fillStyle = '#ffffff'; g.strokeStyle = '#0b2f7a'; g.lineWidth = 2.5;
      if (o.top) { rr(g, px - 7, my(C.cen(B, o.z) + C.rad(B, o.z)) - 4, 14, my(o.hi) - my(C.cen(B, o.z) + C.rad(B, o.z)) + 4, 5); } else { rr(g, px - 7, my(o.lo), 14, my(C.cen(B, o.z) - C.rad(B, o.z)) - my(o.lo) + 4, 5); }
      g.fill(); g.stroke();
    }
    for (i = S.ti; i < B.tdrops.length; i++) { o = B.tdrops[i]; if (o.z > S.z + ahead) break; g.save(); g.translate(mx(o.z), my(o.h)); dropPath(g, 4.5); g.fillStyle = '#fff'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#0b2f7a'; g.stroke(); g.restore(); }
    // you
    var yy = my(S.h), blink = S.inv > 0 && Math.floor(t * 14) % 2 === 0;
    if (!blink) { g.save(); g.translate(x0, yy); g.rotate(clamp(-S.vh * 0.5, -0.5, 0.5)); g.beginPath(); g.moveTo(-15, 1); g.quadraticCurveTo(0, -6, 17, -1); g.quadraticCurveTo(0, 6, -15, 1); g.fillStyle = '#ff4fa3'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#0b1b4a'; g.stroke(); g.beginPath(); g.arc(0, -8, 5, 0, TAU); g.fillStyle = '#ffe14a'; g.fill(); g.stroke(); g.restore(); }
    g.restore();
    rr(g, x, y, w, h, 12); g.lineWidth = 3; g.strokeStyle = '#0b1b4a'; g.stroke();
    g.font = '10px ' + DISP; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.lineWidth = 3; g.strokeStyle = '#0b1b4a'; g.strokeText('YOU', x0, yy - 16); g.fillStyle = '#ffe14a'; g.fillText('YOU', x0, yy - 16);
    g.textAlign = 'right'; g.textBaseline = 'top'; g.strokeText('SIDE VIEW', x + w - 8, y + 6); g.fillStyle = '#fff'; g.fillText('SIDE VIEW', x + w - 8, y + 6);
  }
  // Training wheels on the first tube: an arrow that says hold or let go.
  function tubeHint(t) {
    var B = S.B, target = C.cen(B, S.z + 120), i, o, cx = VW / 2, cy = H * 0.2 + safeTop + 40;
    for (i = S.gi; i < B.gates.length; i++) { o = B.gates[i]; if (o.z - S.z < 650) target = (o.lo + o.hi) / 2; break; }
    var d = target - S.h, up = d > 0.045, down = d < -0.045, pulse = 0.75 + 0.25 * Math.sin(t * 10);
    if (!up && !down) return;
    g.save(); g.translate(cx, cy); g.globalAlpha = pulse; g.lineJoin = 'round';
    g.beginPath(); if (up) { g.moveTo(0, -30); g.lineTo(30, 4); g.lineTo(12, 4); g.lineTo(12, 26); g.lineTo(-12, 26); g.lineTo(-12, 4); g.lineTo(-30, 4); } else { g.moveTo(0, 30); g.lineTo(30, -4); g.lineTo(12, -4); g.lineTo(12, -26); g.lineTo(-12, -26); g.lineTo(-12, -4); g.lineTo(-30, -4); }
    g.closePath(); g.fillStyle = up ? '#ffe14a' : '#7df3ff'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#0b1b4a'; g.stroke();
    g.font = '24px ' + DISP; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 6; g.strokeText(up ? 'HOLD' : 'LET GO', 0, 50); g.fillText(up ? 'HOLD' : 'LET GO', 0, 50);
    g.restore();
  }
  // Shown before the tube starts.
  function tubeIntro(t) {
    var first = S.wave === 0 || !save.tubes, w = Math.min(VW - 24, 440), hgt = first ? 250 : 120, x = (VW - w) / 2, y = Math.max(118 + safeTop, H * 0.42 - hgt / 2 - 40);
    g.fillStyle = 'rgba(4,22,58,.86)'; rr(g, x, y, w, hgt, 16); g.fill(); g.lineWidth = 3; g.strokeStyle = '#7df3ff'; g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    function line(txt, px, col, yy) { fitFont(txt, px, DISP, w - 24); g.fillStyle = col; g.fillText(txt, VW / 2, yy); }
    line('INSIDE THE BARREL', 28, '#fff', y + 30);
    if (first) {
      line('same one button, now seen from your board', 13, '#7df3ff', y + 58);
      line('HOLD = RISE', 24, '#ffe14a', y + 92); line('LET GO = SINK', 24, '#7df3ff', y + 122);
      line('stay between the roof and the floor', 13, '#fff', y + 152);
      line('go UNDER the waterfalls · go OVER the foam', 13, '#fff', y + 172);
      line('the side view below shows where you are', 13, '#fff', y + 192);
      g.globalAlpha = 0.7 + 0.3 * Math.sin(t * 6); line(matchMedia('(pointer: coarse)').matches ? 'TAP TO GO' : 'CLICK OR PRESS SPACE TO GO', 22, '#fff', y + 226); g.globalAlpha = 1;
    } else { line('HOLD = RISE · LET GO = SINK', 18, '#ffe14a', y + 64); line('GET READY...', 20, '#fff', y + 94); }
  }

  // ---------- Drawing: text on the canvas ----------
  function shadow(txt, x, y, mw) { var c = g.fillStyle; g.fillStyle = 'rgba(4,22,58,.7)'; g.fillText(txt, x + 2, y + 2, mw); g.fillStyle = c; g.fillText(txt, x, y, mw); }
  function bar(x, y, w, v, col, name) {
    g.fillStyle = 'rgba(4,22,58,.55)'; rr(g, x - 3, y - 3, w + 6, 16, 8); g.fill();
    g.fillStyle = col; rr(g, x, y, Math.max(10, w * clamp(v, 0, 1)), 10, 5); g.fill();
    g.font = '10px ' + DISP; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = '#fff'; shadow(name, x + w / 2, y + 16);
  }
  function wavePts() { var p = S.wp; return Math.min(C.MAX_WAVE, Math.round(p.drops + p.airs + p.speed + p.tube + p.tdrops + p.clean)); }
  function hud(t) {
    var y0 = 12 + safeTop, tubeNow = state === 'tube' || state === 'tubeready', w = Math.min(240, VW - 150), x = VW / 2 - w / 2;
    g.textBaseline = 'top'; g.textAlign = 'left'; g.font = '13px ' + DISP; g.fillStyle = '#7df3ff'; shadow('WAVE ' + (S.wave + 1) + '/' + C.NW, 14, y0);
    g.font = '26px ' + DISP; g.fillStyle = '#fff'; shadow(C.fmt(wavePts()), 14, y0 + 16);
    g.textAlign = 'right'; g.font = '13px ' + DISP; g.fillStyle = '#ffe14a'; shadow('HEAT ' + C.fmt(S.total), VW - 62, y0 + 4);
    g.font = '13px ' + DISP; g.fillStyle = '#fff'; shadow((tubeNow ? S.tdropsN + '/' + S.B.tdrops.length : S.dropsN + '/' + S.B.nDrops) + ' drops', VW - 62, y0 + 22);
    if (tubeNow) {
      var low = S.gap < 28; bar(x, y0 + 52, w, S.gap / 100, low && Math.floor(t * 8) % 2 ? '#ff4f6d' : '#ffffff', low ? 'FOAM BALL RIGHT BEHIND YOU!' : 'YOUR LEAD ON THE FOAM BALL');
      g.fillStyle = 'rgba(4,22,58,.55)'; rr(g, x - 3, y0 + 90, w + 6, 10, 5); g.fill(); g.fillStyle = '#ffe14a'; rr(g, x, y0 + 93, Math.max(6, w * clamp(S.z / S.B.TL, 0, 1)), 4, 2); g.fill();
      g.font = '10px ' + DISP; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = '#ffe14a'; shadow('EXIT', x + w + 44, y0 + 95);
    } else {
      var lowm = S.meter < 30; bar(x, y0 + 52, w, S.meter / 100, lowm && Math.floor(t * 8) % 2 ? '#ff4f6d' : '#7df3ff', lowm ? 'TOO SLOW! CARVE UP AND DOWN' : 'SPEED');
      g.fillStyle = 'rgba(4,22,58,.55)'; rr(g, x - 3, y0 + 90, w + 6, 10, 5); g.fill(); g.fillStyle = '#ffe14a'; rr(g, x, y0 + 93, Math.max(6, w * clamp(S.x / S.B.L, 0, 1)), 4, 2); g.fill();
      g.font = '10px ' + DISP; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillStyle = '#ffe14a'; shadow('TUBE', x + w + 46, y0 + 95);
    }
  }
  function fitFont(txt, px, font, maxW) { g.font = px + 'px ' + font; var w = g.measureText(txt).width; if (w > maxW) { px = Math.floor(px * maxW / w); g.font = px + 'px ' + font; } return px; }
  // The big shout: yellow to pink, tipped, with a few 90s shapes flying around it.
  function drawCallout(c, t) {
    var a = c.t, sc = a < 0.25 ? 0.3 + 0.9 * (a / 0.25) : a < 0.35 ? 1.2 - 0.2 * ((a - 0.25) / 0.1) : 1, al = Math.min(1, (c.dur - a) * 3), lines = [c.text], i, mw = VW - 36, cy = H * 0.26 + safeTop;
    g.font = '58px ' + DISP;
    if (g.measureText(c.text).width > mw * 1.25 && c.text.indexOf(' ') > 0) { var ws = c.text.split(' '), m = Math.ceil(ws.length / 2); lines = [ws.slice(0, m).join(' '), ws.slice(m).join(' ')]; }
    g.save(); g.translate(VW / 2, cy); g.rotate(-0.07); g.scale(sc, sc); g.globalAlpha = Math.max(0, al); g.textAlign = 'center'; g.textBaseline = 'middle';
    var cols = ['#7df3ff', '#ff4fa3', '#ffe14a', '#8cff9e'];
    for (i = 0; i < 10; i++) { var an = i * 0.63 + 0.3, rad = (150 + hsh(i) * 90) * Math.min(1, a * 2.5) + a * 16, sx2 = Math.cos(an) * rad * 1.25, sy2 = Math.sin(an) * rad * 0.55; g.save(); g.translate(sx2, sy2); g.rotate(a * (i % 2 ? 2 : -2) + i); g.fillStyle = cols[i % 4]; g.strokeStyle = cols[i % 4]; g.lineWidth = 5;
      if (i % 3 === 0) { g.beginPath(); g.moveTo(0, -11); g.lineTo(11, 9); g.lineTo(-11, 9); g.closePath(); g.fill(); } else if (i % 3 === 1) { g.beginPath(); g.moveTo(-14, 0); g.lineTo(-7, -8); g.lineTo(0, 0); g.lineTo(7, -8); g.lineTo(14, 0); g.stroke(); } else { g.beginPath(); g.arc(0, 0, 6, 0, TAU); g.fill(); }
      g.restore(); }
    for (i = 0; i < lines.length; i++) {
      var px = fitFont(lines[i], 58, DISP, mw), y = (i - (lines.length - 1) / 2) * 62;
      g.fillStyle = '#00d8ff'; g.fillText(lines[i], 5, y + 6); g.lineWidth = 9; g.strokeStyle = '#1b0b4a'; g.lineJoin = 'round'; g.strokeText(lines[i], 0, y);
      var gr = g.createLinearGradient(0, y - px / 2, 0, y + px / 2); gr.addColorStop(0, '#fff35c'); gr.addColorStop(1, '#ff4fa3'); g.fillStyle = gr; g.fillText(lines[i], 0, y);
    }
    if (c.sub) { g.font = '18px ' + DISP; g.fillStyle = '#fff'; g.lineWidth = 5; g.strokeText(c.sub, 0, lines.length * 31 + 22); g.fillText(c.sub, 0, lines.length * 31 + 22); }
    g.restore();
  }
  function centerText(lines, y, t) {   // [[text, px, colour], ...]
    var i; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (i = 0; i < lines.length; i++) { fitFont(lines[i][0], lines[i][1], lines[i][3] || DISP, VW - 30); g.fillStyle = lines[i][2]; g.lineWidth = 5; g.strokeStyle = 'rgba(4,22,58,.8)'; g.lineJoin = 'round'; g.strokeText(lines[i][0], VW / 2, y); g.fillText(lines[i][0], VW / 2, y); y += lines[i][1] * 1.25 + 4; }
  }

  function draw(t) {
    var i, p, V, R;
    g.setTransform(SC, 0, 0, SC, 0, 0); g.globalAlpha = 1;
    g.save();
    if (shake > 0 && !reduce) g.translate((Math.random() - 0.5) * shake * 26, (Math.random() - 0.5) * shake * 26);
    if (state === 'title' || !S) {
      // a surfer carving on a loop behind the menu
      var hh = 0.5 + 0.36 * Math.sin(t * 1.5), G0 = geo(); G0.sx = VW * 0.5; G0.yb = Math.min(G0.yb, H * 0.5 + 60);
      drawRide({ x: t * 300, h: hh, vh: 0.54 * Math.cos(t * 1.5), air: false, rot: 0, meter: Math.min(100, (G0.sx - 96) / 1.7), objs: null, geo: G0, scale: 1.25 }, t);
      g.restore(); return;
    }
    if (state === 'tube' || state === 'tubeready') drawTube({ B: S.B, z: S.z, h: S.h, vh: S.vh, gap: S.gap, gi: S.gi, ti: S.ti, intro: state === 'tubeready' }, t);
    else if (state === 'wipe' && wipeWhere === 'tube') drawUnder(t);
    else {
      V = { x: S.x, h: S.h, vh: S.vh, air: S.air, rot: S.rot, meter: S.meter, inv: S.inv, objs: S };
      if (state === 'ready') { V.vh = 0; V.h = 0.5 + Math.sin(t * 2) * 0.02; }
      else if (state === 'trans') { V.x = S.B.L + sT * S.W.vx; V.meter = S.meter - sT * 130; V.vh = 0; V.h = 0.5; V.objs = null; trail = []; }
      else if (state === 'out') { V.x = S.B.L + 600 + sT * S.W.vx; V.h = 0.5 + Math.sin(sT * 3) * 0.12; V.vh = Math.cos(sT * 3) * 0.3; V.meter = 30; V.pose = 'claim'; V.objs = null; V.air = false; V.rot = 0; V.scale = 1.2; }
      else if (state === 'wipe' || state === 'score' || state === 'end') {
        if (S.results.length && S.results[S.results.length - 1].out) { V.x = S.B.L + 600 + (2.7 + sT) * S.W.vx; V.h = 0.5; V.vh = 0; V.meter = 60; V.pose = 'claim'; V.objs = null; V.air = false; V.rot = 0; V.scale = 1.2; }
        else { V.meter = -30; V.pose = 'tumble'; V.sink = Math.min(60, sT * 50); V.air = false; V.rot = 0; V.hideSurfer = state !== 'wipe' || sT > 1.3; }
      }
      R = drawRide(V, t);
      if (state === 'out') { g.fillStyle = 'rgba(255,255,255,.9)'; for (i = 0; i < 40; i++) { var ph = (sT * 1.2 + hsh(i)) % 1; if (sT > 1.6) break; g.beginPath(); g.arc(R.sx - 150 + ph * 260, R.yt + FH * (0.25 + hsh(i * 3.7) * 0.5) - ph * 30, (1 - ph) * 6 + 1, 0, TAU); g.fill(); } }
      if (state === 'trans') {   // the lip throws over: the picture closes in on the surfer
        var k = clamp(sT / 1.1, 0, 1), rad = (1 - k * k) * Math.hypot(VW, H) + 30, cx = R.sx, cy = R.Y(0.5) - 20;
        g.fillStyle = '#0b3a9a'; g.beginPath(); g.rect(-20, -20, VW + 40, H + 40); g.arc(cx, cy, rad, 0, TAU, true); g.fill('evenodd');
        g.strokeStyle = '#fff'; g.lineWidth = 14; g.beginPath(); g.arc(cx, cy, rad, 0, TAU); g.stroke();
        g.fillStyle = '#fff'; for (i = 0; i < 26; i++) { g.beginPath(); g.arc(cx + Math.cos(i * TAU / 26 + t * 2) * rad, cy + Math.sin(i * TAU / 26 + t * 2) * rad, 10 + hsh(i) * 14, 0, TAU); g.fill(); }
      }
    }
    for (i = 0; i < parts.length; i++) { p = parts[i]; g.globalAlpha = 1 - p.t / p.life; g.fillStyle = p.col; g.beginPath(); g.arc(p.x, p.y, p.r, 0, TAU); g.fill(); } g.globalAlpha = 1;
    if (flash > 0) { g.fillStyle = 'rgba(255,255,255,' + Math.min(0.8, flash) + ')'; g.fillRect(-20, -20, VW + 40, H + 40); }
    g.restore();
    for (i = 0; i < pops.length; i++) { p = pops[i]; g.save(); g.translate(clamp(p.x, 70, VW - 70), p.y - p.t * 46); g.rotate(p.rot); g.globalAlpha = Math.min(1, (1.1 - p.t) * 3); g.font = p.size + 'px ' + DISP; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = 'rgba(4,22,58,.85)'; g.strokeText(p.text, 0, 0); g.fillStyle = p.col; g.fillText(p.text, 0, 0); g.restore(); }
    if (state === 'tube' || state === 'tubeready') { tubeMap(t); if (state === 'tube' && (S.wave === 0 || !save.tubes)) tubeHint(t); }
    if (state === 'ride' || state === 'tube' || state === 'tubeready' || state === 'ready' || state === 'trans') hud(t);
    if (state === 'ready') {
      var W = S.W, y = H * 0.2 + safeTop + 40;
      centerText([['WAVE ' + (S.wave + 1) + ' OF ' + C.NW, 16, '#7df3ff'], [W.name, 38, '#fff'], [W.ft + ' FT', 22, '#ffe14a']], y, t);
      g.globalAlpha = 0.75 + 0.25 * Math.sin(t * 5); centerText([['HOLD TO DROP IN', 28, '#fff']], y + 130, t); g.globalAlpha = 1;
      centerText(S.wave === 0 ? [['hold = carve up the wave · let go = drop down', 14, '#fff'], ['keep moving up and down to stay fast', 14, '#fff'], ['fly off the top for an air · hold to spin · let go to land', 14, '#ffe14a'], ['after 20 seconds the wave closes over you: the tube', 14, '#7df3ff']] : [['hold = up · let go = down', 14, '#fff']], y + 172, t);
    }
    if (state === 'trans') centerText([['HERE COMES THE BARREL!', 30, '#fff']], H * 0.22 + safeTop + 40, t);
    if (state === 'tubeready') tubeIntro(t);
    if (callout) drawCallout(callout, t);
  }

  // ---------- Screens ----------
  function show(html) { rootEl.querySelectorAll('.sw-screen').forEach(function (e) { e.remove(); }); if (html) rootEl.insertAdjacentHTML('beforeend', html); var pb = $('#sw-pause'); if (pb) pb.hidden = !(state === 'ready' || state === 'ride' || state === 'tube' || state === 'tubeready' || state === 'trans'); }
  function soundBtn() { return '<button type="button" class="sw-ghost" data-a="sound" aria-pressed="' + (!save.muted) + '">' + (save.muted ? 'SOUND OFF' : 'SOUND ON') + '</button>'; }
  function showTitle() {
    state = 'title'; paused = false; musicMode = 'menu'; muffle(false); seaTo(0.03, 500);
    var date = C.today(), mine = save.daily[date];
    show('<div class="sw-screen sw-title"><div class="sw-top"><a class="sw-ghost" href="./">← GAMES</a>' + soundBtn() + '</div>' +
      '<h1 class="sw-logo"><span>Sui</span><em>Swell</em></h1><p class="sw-tag">Drop in. Get barreled. <b>Stay liquid.</b></p><div class="sw-gap"></div>' +
      '<div class="sw-panel"><div class="sw-acts"><button type="button" class="sw-btn sw-primary" data-a="daily"><span>DAILY HEAT #' + C.dayNum(date) + '</span><small>' + (mine ? 'your best today ' + C.fmt(mine) : 'same 3 waves for everyone today') + '</small></button>' +
      '<button type="button" class="sw-btn" data-a="free"><span>FREE SURF</span><small>new waves every heat</small></button></div>' +
      '<p class="sw-how">Hold to carve up the wave, let go to drop. Grab the droplets, launch off the lip, then survive the tube. Three waves, judged out of 10.</p>' +
      '<div class="sw-k">TODAY\'S TOP SURFERS</div><div id="sw-board"><div class="sw-dim">Loading…</div></div></div></div>');
    getBoard(function (b) { var el = $('#sw-board'); if (el) el.innerHTML = boardHtml(b ? { top: b.top.slice(0, 5) } : null); });
  }
  function rowHtml(name, val, on) { return '<li' + (on ? '' : ' class="off"') + '><span>' + name + '</span><b>' + (val ? '+' + C.fmt(val) : '0.00') + '</b></li>'; }
  function showWave() {
    var r = S.results[S.results.length - 1], W = S.W, a = r.pts / 1000, js = [a - 0.12, a + 0.03, a + 0.09].map(function (v) { return clamp(v, 0, 10).toFixed(1); }), lastWave = S.phase === 'done';
    tone(880, 880, 0.12, 'triangle', 0.08, 0.15); tone(1100, 1100, 0.12, 'triangle', 0.08, 0.4); tone(1320, 1320, 0.2, 'triangle', 0.08, 0.65);
    show('<div class="sw-screen sw-end"><div class="sw-card"><div class="sw-k">WAVE ' + (S.wave + 1) + ' OF ' + C.NW + ' · ' + W.name + '</div>' +
      '<div class="sw-judges">' + js.map(function (v, i) { return '<div class="sw-judge" style="animation-delay:' + (0.15 + i * 0.25) + 's"><i></i><b>' + v + '</b></div>'; }).join('') + '</div>' +
      '<div class="sw-time">' + C.fmt(r.pts) + '</div><div class="sw-rate">' + (r.out ? waveWord(r.pts) : r.where === 'tube' ? 'SO CLOSE, BRAH!' : 'BUMMER, DUDE') + '</div>' +
      '<ul class="sw-rows">' + rowHtml('Droplets ' + r.drops + '/' + r.nDrops, r.parts.drops, r.drops) + rowHtml(r.airs + (r.airs === 1 ? ' air' : ' airs') + (r.spins ? ', ' + r.spins + (r.spins === 1 ? ' spin' : ' spins') : ''), r.parts.airs, r.airs) +
      (r.where === 'ride' ? rowHtml('Caught by the whitewater', 0, false) : rowHtml('Speed into the tube', r.parts.speed, true) + rowHtml(r.out ? 'Made it out of the barrel' : 'Wiped out in the barrel', r.parts.tube, r.out) + rowHtml('Tube droplets ' + r.tdrops + '/' + r.nT, r.parts.tdrops, r.tdrops) + rowHtml(r.scrapes ? 'Clean barrel (' + r.scrapes + (r.scrapes === 1 ? ' bump)' : ' bumps)') : 'Clean barrel', r.parts.clean, r.parts.clean)) + '</ul>' +
      '<div class="sw-sub">HEAT SO FAR ' + C.fmt(S.total) + '</div>' +
      '<div class="sw-acts row"><button type="button" class="sw-btn sw-primary" data-a="next"><span>' + (lastWave ? 'SEE YOUR HEAT' : 'PADDLE OUT') + '</span><small>' + (lastWave ? 'final score' : 'wave ' + (S.wave + 2) + ': ' + C.WAVES[S.wave + 1].name.toLowerCase()) + '</small></button></div></div></div>');
    var b = $('[data-a="next"]'); if (b) b.focus();
  }
  function showEnd() {
    var r = lastRun, hw = heatWord(r.total), daily = r.mode === 'daily';
    show('<div class="sw-screen sw-end"><div class="sw-card"><div class="sw-k">' + (daily ? 'DAILY HEAT #' + C.dayNum(r.seed) : 'FREE SURF') + ' · FINAL SCORE</div>' +
      '<div class="sw-time">' + C.fmt(r.total) + '<small> / 30</small></div><div class="sw-rate">' + hw[0] + '</div><div class="sw-sub">' + hw[1] + '</div>' +
      '<div class="sw-stats">' + r.results.map(function (w, i) { return '<span>wave ' + (i + 1) + ' <b>' + C.fmt(w.pts) + '</b>' + (w.out ? '' : ' wipeout') + '</span>'; }).join('') + '<span>' + r.made + ' of 3 barrels made</span></div>' +
      (r.pb ? '<div class="sw-pb">new personal best!</div>' : save.best ? '<div class="sw-dim">your best ' + C.fmt(save.best) + '</div>' : '') +
      (daily ? '<form class="sw-post" id="sw-post"><label for="sw-in">Initials</label><input id="sw-in" maxlength="3" autocomplete="off" autocapitalize="characters" spellcheck="false" value="' + esc(save.initials) + '" placeholder="AAA"><button type="submit" class="sw-btn sw-small"><span>POST SCORE</span></button></form><div class="sw-note" id="sw-note" aria-live="polite"></div><div id="sw-board"></div>'
        : '<div class="sw-note" id="sw-note" aria-live="polite">Free Surf scores stay on this device. Surf the Daily Heat to get on the board.</div>') +
      '<div class="sw-acts row"><button type="button" class="sw-btn sw-primary" data-a="again"><span>SURF AGAIN</span></button><button type="button" class="sw-btn" data-a="share"><span>SHARE</span></button><button type="button" class="sw-btn" data-a="menu"><span>MENU</span></button></div></div></div>');
    if (daily) {
      getBoard(function (b) { var el = $('#sw-board'); if (el) el.innerHTML = boardHtml(b ? { top: b.top.slice(0, 5) } : null); });
      $('#sw-post').addEventListener('submit', function (e) {
        e.preventDefault(); var note = $('#sw-note'), ini = $('#sw-in').value.toUpperCase().replace(/[^A-Z]/g, '');
        if (r.posted) return;
        if (ini.length !== 3) { note.textContent = 'Three letters, please.'; return; }
        save.initials = ini; store(); note.textContent = 'Posting…';
        postScore(r.code, ini, function (j, err) {
          if (!j) { note.textContent = err === 'pick other initials' ? 'Pick other initials.' : err === 'slow down' ? 'Too many posts. Wait a minute.' : 'The leaderboard is offline right now.'; return; }
          r.posted = true; note.textContent = 'You are #' + j.rank + ' today.'; $('#sw-post').hidden = true;
          getBoard(function (b) { var el = $('#sw-board'); if (el) el.innerHTML = boardHtml(b ? { top: b.top.slice(0, 5) } : null, { initials: ini, pts: r.total }); }, true);
        });
      });
    }
  }
  var pausedMode = 'surf';
  function showPause() {
    paused = true; held = false; pausedMode = musicMode; musicMode = 'off';
    show('<div class="sw-screen sw-end"><div class="sw-card"><div class="sw-rate">PAUSED</div><div class="sw-acts row"><button type="button" class="sw-btn sw-primary" data-a="resume"><span>RESUME</span></button><button type="button" class="sw-btn" data-a="again"><span>RESTART</span></button><button type="button" class="sw-btn" data-a="menu"><span>MENU</span></button></div><div class="sw-acts row">' + soundBtn() + '</div></div></div>');
    $('#sw-pause').hidden = true;
  }
  function resume() { paused = false; held = false; musicMode = pausedMode; show(null); }
  // Browsers only allow sound after a tap or key, so the music starts on the first one.
  document.addEventListener('pointerdown', function () { audio(); }, { once: true });
  document.addEventListener('keydown', function () { audio(); }, { once: true });
  rootEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b) return; var a = b.getAttribute('data-a');
    if (a === 'daily' || a === 'free') startRun(a);
    else if (a === 'again') startRun(S ? S.mode : 'daily');
    else if (a === 'menu') showTitle();
    else if (a === 'next') { if (state === 'score') nextWave(); }
    else if (a === 'resume') resume();
    else if (a === 'pause') { if ((state === 'ready' || state === 'ride' || state === 'tube' || state === 'tubeready' || state === 'trans') && !paused) showPause(); }
    else if (a === 'sound') { audio(); setMuted(!save.muted); b.textContent = save.muted ? 'SOUND OFF' : 'SOUND ON'; b.setAttribute('aria-pressed', String(!save.muted)); }
    else if (a === 'share') { var r = lastRun; share(shareCard(r), 'I scored ' + C.fmt(r.total) + ' out of 30 on Sui Swell' + (r.mode === 'daily' ? ' (Daily Heat #' + C.dayNum(r.seed) + ')' : '') + ' and made ' + r.made + ' of 3 barrels. ' + heatWord(r.total)[0].charAt(0) + heatWord(r.total)[0].slice(1).toLowerCase() + '.'); }
  });

  // ---------- The share picture (1200 x 675) ----------
  function shareCard(r) {
    var c = document.createElement('canvas'); c.width = 1200; c.height = 675; var x = c.getContext('2d');
    var keep = [g, VW, H, camY, flow, safeTop, trail]; g = x; VW = 1200 / 1.5; H = 675 / 1.5; camY = 0; flow = 3; safeTop = 0; trail = [];
    x.save(); x.scale(1.5, 1.5);
    drawRide({ x: 2300, h: 0.4, vh: 0.5, air: false, rot: 0, meter: 80, objs: null, pose: 'claim', scale: 1.8, geo: { yb: 380, sx: 330 } }, 1.2);
    var i; for (i = 0; i < 5; i++) droplet(450 + i * 62, 380 - (0.6 + Math.sin(i * 0.8) * 0.16) * FH, 13, i, true);
    x.restore();
    g = keep[0]; VW = keep[1]; H = keep[2]; camY = keep[3]; flow = keep[4]; safeTop = keep[5]; trail = keep[6];
    x.textBaseline = 'alphabetic'; x.textAlign = 'left'; x.lineJoin = 'round';
    x.save(); x.translate(50, 118); x.rotate(-0.05); x.font = '104px ' + SCRIPT; x.lineWidth = 14; x.strokeStyle = '#1b0b4a'; x.strokeText('Sui Swell', 0, 0); x.fillStyle = '#00d8ff'; x.fillText('Sui Swell', 5, 6);
    var lg = x.createLinearGradient(0, -90, 0, 20); lg.addColorStop(0, '#fff35c'); lg.addColorStop(1, '#ff4fa3'); x.fillStyle = lg; x.fillText('Sui Swell', 0, 0); x.restore();
    x.font = '26px ' + DISP; x.lineWidth = 7; x.strokeStyle = '#1b0b4a'; x.strokeText('DROP IN. GET BARRELED. STAY LIQUID.', 56, 176); x.fillStyle = '#fff'; x.fillText('DROP IN. GET BARRELED. STAY LIQUID.', 56, 176);
    if (r) {
      var hw = heatWord(r.total);
      x.fillStyle = 'rgba(4,22,58,.88)'; rr(x, 730, 318, 430, 262, 22); x.fill(); x.strokeStyle = '#7df3ff'; x.lineWidth = 4; x.stroke();
      x.textAlign = 'right'; x.font = '22px ' + DISP; x.fillStyle = '#7df3ff'; x.fillText(r.mode === 'daily' ? 'DAILY HEAT #' + C.dayNum(r.seed) : 'FREE SURF', 1130, 362);
      x.font = '92px ' + DISP; x.fillStyle = '#ffe14a'; x.fillText(C.fmt(r.total), 1130, 452); x.font = '22px ' + DISP; x.fillStyle = '#fff'; x.fillText('OUT OF 30 · ' + r.made + ' OF 3 BARRELS', 1130, 488);
      x.font = '34px ' + DISP; var px = 34, w = x.measureText(hw[0]).width; if (w > 380) { px = Math.floor(34 * 380 / w); x.font = px + 'px ' + DISP; } x.fillStyle = '#ff7ab8'; x.fillText(hw[0], 1130, 546);
    }
    x.textAlign = 'right'; x.font = '26px ' + DISP; x.lineWidth = 6; x.strokeStyle = '#04163a'; x.strokeText('proofoffight.com/sui', 1160, 645); x.fillStyle = '#fff'; x.fillText('proofoffight.com/sui', 1160, 645);
    return c;
  }
  // The share panel: a preview of the picture and plain buttons (same as Doge Moon Crash).
  var URL_GAME = 'https://proofoffight.com/sui/', shareBlob = null;
  function share(card, text) {
    var old = $('.sw-share'); if (old) old.remove();
    shareBlob = null; card.toBlob(function (blob) { shareBlob = blob; }, 'image/png');
    var touch = window.matchMedia && matchMedia('(pointer: coarse)').matches, canFiles = false;
    try { canFiles = touch && !!navigator.canShare && navigator.canShare({ files: [new File([new Blob(['x'], { type: 'image/png' })], 'a.png', { type: 'image/png' })] }); } catch (e) { /* no file sharing */ }
    rootEl.insertAdjacentHTML('beforeend', '<div class="sw-share" role="dialog" aria-modal="true" aria-label="Share your heat"><div class="sw-share-box">' +
      '<img class="sw-share-img" alt="Your Sui Swell result picture" src="' + card.toDataURL('image/png') + '">' +
      '<p class="sw-share-txt">' + esc(text) + ' <span>' + URL_GAME.replace('https://', '') + '</span></p>' +
      '<div class="sw-acts"><button type="button" class="sw-btn sw-x" data-s="x"><span>POST ON X</span><small>copies the picture too</small></button>' +
      '<button type="button" class="sw-btn" data-s="save"><span>SAVE PICTURE</span><small>to attach anywhere</small></button>' +
      '<button type="button" class="sw-btn" data-s="copy"><span>COPY TEXT</span><small>with the link</small></button>' +
      (canFiles ? '<button type="button" class="sw-btn" data-s="more"><span>MORE APPS</span><small>your phone\'s share menu</small></button>' : '<button type="button" class="sw-btn" data-s="close"><span>CLOSE</span></button>') +
      '</div><div class="sw-note" id="sw-snote" aria-live="polite"></div>' + (canFiles ? '<button type="button" class="sw-ghost sw-share-close" data-s="close">CLOSE</button>' : '') + '</div></div>');
    var box = $('.sw-share'), note = $('#sw-snote');
    function tell(t) { note.textContent = t; }
    function blobNow(cb) { if (shareBlob) cb(shareBlob); else card.toBlob(function (bl) { shareBlob = bl; cb(bl); }, 'image/png'); }
    function saveImg() { blobNow(function (bl) { var l = document.createElement('a'); l.href = URL.createObjectURL(bl); l.download = 'sui-swell.png'; document.body.appendChild(l); l.click(); l.remove(); }); }
    function copyText(t, ok) { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () { tell('Copy this: ' + t); }); else tell('Copy this: ' + t); }
    box.addEventListener('click', function (e) {
      if (e.target === box) { box.remove(); return; }
      var b = e.target.closest('[data-s]'); if (!b) return; var k = b.getAttribute('data-s');
      if (k === 'close') box.remove();
      else if (k === 'save') { saveImg(); tell('Picture saved. Attach it to your post.'); }
      else if (k === 'copy') copyText(text + ' ' + URL_GAME, function () { tell('Text and link copied.'); });
      else if (k === 'more') blobNow(function (bl) { navigator.share({ files: [new File([bl], 'sui-swell.png', { type: 'image/png' })], text: text + ' ' + URL_GAME }).catch(function () { /* closed */ }); });
      else if (k === 'x') {
        // Copy the picture first (the browser needs this inside the click), then open the post box in a new tab.
        var copied = false;
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            var item = new ClipboardItem({ 'image/png': shareBlob || new Promise(function (ok) { card.toBlob(ok, 'image/png'); }) });
            navigator.clipboard.write([item]).then(function () { tell('Picture copied. In X, paste it into your post (Ctrl+V, or long-press and Paste).'); }, function () { saveImg(); tell('Picture saved instead. Attach it to your post in X.'); });
            copied = true;
          }
        } catch (er) { copied = false; }
        if (!copied) { saveImg(); tell('Picture saved. Attach it to your post in X.'); }
        window.open('https://x.com/intent/post?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(URL_GAME), '_blank', 'noopener');
      }
    });
    var first = box.querySelector('[data-s="x"]'); if (first) first.focus();
  }

  // ---------- Input: one button. Hold anywhere, or Space / Up ----------
  cv.addEventListener('pointerdown', function (e) { e.preventDefault(); audio(); if (paused) return; held = true; if (state === 'tubeready') pressed = true; });
  window.addEventListener('pointerup', function () { held = false; }); window.addEventListener('pointercancel', function () { held = false; });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('keydown', function (e) {
    var c = e.code;
    if (e.target && e.target.tagName === 'INPUT') return;
    if (c === 'Escape' && $('.sw-share')) { $('.sw-share').remove(); return; }
    if (c === 'Space' || c === 'ArrowUp' || c === 'KeyW') {
      if (e.target && e.target.tagName === 'BUTTON' && c === 'Space') return;
      e.preventDefault(); audio(); if (!paused && (state === 'ready' || state === 'ride' || state === 'tube' || state === 'tubeready')) { held = true; if (state === 'tubeready' && !e.repeat) pressed = true; }
    } else if (c === 'Escape' || c === 'KeyP') { if (state === 'ready' || state === 'ride' || state === 'tube' || state === 'tubeready') { if (paused) resume(); else showPause(); } }
  });
  window.addEventListener('keyup', function (e) { var c = e.code; if (c === 'Space' || c === 'ArrowUp' || c === 'KeyW') held = false; });
  window.addEventListener('blur', function () { held = false; });
  document.addEventListener('visibilitychange', function () { if (document.hidden && (state === 'ride' || state === 'tube') && !paused && !AUTO) showPause(); });

  document.documentElement.classList.add('sw-on');
  rootEl.insertAdjacentHTML('beforeend', '<div id="sw-safe"></div><button type="button" id="sw-pause" data-a="pause" aria-label="Pause" hidden>II</button>');
  window.addEventListener('resize', resize); resize();
  showTitle();
  requestAnimationFrame(frame);
  if (DEBUG) window.POF_SW = { get S() { return S; }, get state() { return state; }, core: C, save: save, start: startRun, card: shareCard, title: showTitle, get last() { return lastRun; },
    toTube: function () { S.x = S.B.L - 60; S.lo = S.B.objs.length; }, nearExit: function () { S.z = S.B.TL - 700; while (S.gi < S.B.gates.length && S.B.gates[S.gi].z < S.z) S.gi++; while (S.ti < S.B.tdrops.length && S.B.tdrops[S.ti].z < S.z) S.ti++; }, hold: function (v) { held = v; }, god: function () { S.meter = 100; S.gap = 100; } };
})();
