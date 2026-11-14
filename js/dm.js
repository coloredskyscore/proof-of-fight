/* Doge Moon Crash (proofoffight.com/doge/): the game around the rules. Draws the climb, the menus, the
   results, the share picture and talks to the leaderboard.
   Rules and maps: js/dm-core.js. Drawings: js/dm-art.js.
   Add ?debug to expose window.POF_DM; ?auto lets the bot fly. */
(function () {
  'use strict';
  var C = window.POF_DM_CORE, A = window.POF_DM_ART;
  var Q = location.search, DEBUG = /[?&]debug\b/.test(Q), AUTO = /[?&]auto\b/.test(Q);
  var API = 'https://pof-dip.brianboode.workers.dev';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cv = document.getElementById('dm-cv'), g = cv.getContext('2d'), rootEl = document.getElementById('dm-root');
  var FW = C.FW, DISP = A.DISP, MEME = A.MEME, TAU = 6.2832;
  var H = 760, VW = FW, OX = 0, SC = 1, dpr = 1, safeTop = 0;
  function $(s) { return rootEl.querySelector(s); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var WORDS = [
    ['much ground', 'very launch', 'wow', 'so pad', 'such fuel'],
    ['very sky', 'such cloud', 'much fluff', 'wow', 'so high'],
    ['such atmosphere', 'very thin air', 'much cold', 'wow', 'so blu'],
    ['wow vacuum', 'very space', 'such stars', 'no air wow', 'much float'],
    ['such moon', 'very close', 'much crater', 'WOW', 'so cheese??']
  ];
  var SKY = [['#3f8fe0', '#bfe3ff'], ['#2b5fb8', '#9cc8f2'], ['#1a1f5c', '#4d4fa8'], ['#05041a', '#160f3a'], ['#030310', '#1c1430']];
  var BOOST_POSTS = ['to the moon!!', "doge is the people's crypto", 'much wow. very rocket.', 'launching doge. no reason.'];
  var DUMP_POSTS = ['dogs are mid tbh', 'sold. jk. unless?', 'gravity is underrated', 'cats > dogs'];
  var MEDAL = ['', 'BRONZE', 'SILVER', 'GOLD'];

  // ---------- Saved ----------
  var save = { v: 1, best: 0, daily: {}, initials: '', muted: false, runs: 0 };
  try { var raw = JSON.parse(localStorage.getItem('pof-dm') || 'null'); if (raw && raw.v === 1) for (var k0 in raw) save[k0] = raw[k0]; } catch (e) { /* private mode */ }
  function store() { try { localStorage.setItem('pof-dm', JSON.stringify(save)); } catch (e) { /* private mode */ } }

  // ---------- Leaderboard (a small server shared with Ride the Chart; the game works without it) ----------
  var board = null;
  function getBoard(cb, fresh) {
    var date = C.today();
    if (!fresh && board && board.date === date && Date.now() - board.at < 60000) { cb(board); return; }
    fetch(API + '/dm/scores?board=dm-' + date + '&limit=10').then(function (r) { return r.ok ? r.json() : Promise.reject(); }).then(function (j) {
      board = { at: Date.now(), date: date, top: (j.top || []).map(function (r) { return { initials: r.initials, ms: 10000000 - r.score, coins: r.day }; }) }; cb(board);
    }).catch(function () { cb(null); });
  }
  function postScore(code, initials, cb) {
    fetch(API + '/dm/scores', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: code, initials: initials }) })
      .then(function (r) { return r.json(); }).then(function (j) { cb(j && j.rank ? j : null, j && j.error); }).catch(function () { cb(null); });
  }
  function boardHtml(b, mine) {
    if (!b) return '<div class="dm-dim">The leaderboard is offline right now.</div>';
    if (!b.top.length) return '<div class="dm-dim">Nobody has reached the moon yet today. Be first.</div>';
    return '<ol class="dm-board">' + b.top.map(function (r, i) {
      return '<li' + (mine && r.initials === mine.initials && r.ms === mine.ms ? ' class="me"' : '') + '><span class="rk">' + (i + 1) + '</span><span class="in">' + esc(r.initials) + '</span><span class="tm">' + C.fmt(r.ms) + '</span></li>';
    }).join('') + '</ol>';
  }

  // ---------- Sound: Brian's Suno songs for the music, a tiny synth for the effects ----------
  // loop: [start, end] in seconds, picked so the jump back is seamless (the climb skips its intro and its fade-out).
  var SONGS = {
    title: { src: 'audio/dm/title.mp3', loop: [2.0, 122.915], vol: 0.5 },
    climb: { src: 'audio/dm/climb.mp3', loop: [3.5, 106.394], vol: 0.5 },
    moon: { src: 'audio/dm/moon-landing.mp3', vol: 0.55 }
  };
  var songG = null, songNow = null, songWant = null, songRate = 1;
  function loadSong(name) {
    var sg = SONGS[name]; if (sg.buf || sg.loading || sg.failed || !ac) return;
    sg.loading = true;
    fetch(sg.src).then(function (r) { return r.ok ? r.arrayBuffer() : Promise.reject(); })
      .then(function (data) { return new Promise(function (ok, no) { var p = ac.decodeAudioData(data, ok, no); if (p && p.then) p.then(ok, no); }); })
      .then(function (buf) { sg.buf = buf; sg.loading = false; if (songWant && songWant.name === name) song(name, 0); })
      .catch(function () { sg.loading = false; sg.failed = true; });
  }
  // Switch the music. Fades out whatever is playing; the new song starts once it has loaded.
  function song(name, delay) {
    if (!ac) return;
    if (songNow) { var old = songNow; old.g.gain.setTargetAtTime(0, ac.currentTime, 0.15); setTimeout(function () { try { old.src.stop(); } catch (e) { /* already stopped */ } }, 900); songNow = null; }
    songWant = name ? { name: name } : null;
    if (!name) return;
    var sg = SONGS[name]; if (!sg.buf) { loadSong(name); return; }
    var src = ac.createBufferSource(), g = ac.createGain(), t = ac.currentTime + (delay || 0);
    src.buffer = sg.buf; if (sg.loop) { src.loop = true; src.loopStart = sg.loop[0]; src.loopEnd = sg.loop[1]; }
    src.playbackRate.value = name === 'climb' ? songRate : 1;
    g.gain.value = sg.vol; src.connect(g); g.connect(songG); src.start(t);
    songNow = { name: name, src: src, g: g }; songWant = null;
  }
  // The climb speeds up a touch in every layer.
  function songLayer(L) { songRate = 1 + L * 0.025; if (songNow && songNow.name === 'climb') songNow.src.playbackRate.setTargetAtTime(songRate, ac.currentTime, 0.5); }
  function synthMusic() { return SONGS.climb.failed; }   // the old code-made tune, only if the song can't load
  var ac = null, master = null, jetG = null, musicT = 0, musicStep = 0, musicOn = false;
  function audio() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    master = ac.createGain(); master.gain.value = save.muted ? 0 : 1; master.connect(ac.destination);
    var len = ac.sampleRate * 2, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0), i; for (i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    var n = ac.createBufferSource(); n.buffer = b; n.loop = true; var f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 650;
    jetG = ac.createGain(); jetG.gain.value = 0; n.connect(f); f.connect(jetG); jetG.connect(master); n.start();
    songG = ac.createGain(); songG.connect(master);
    loadSong('climb'); loadSong('title'); loadSong('moon');
    if (state === 'title') song('title');
  }
  function tone(f1, f2, dur, type, vol, when) {
    if (!ac) return; var o = ac.createOscillator(), v = ac.createGain(), t = ac.currentTime + (when || 0);
    o.type = type || 'sine'; o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    v.gain.setValueAtTime(vol || 0.12, t); v.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(v); v.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  // Music: a bass note and a little arpeggio. It gets faster and climbs a key in every layer.
  var SCALE = [0, 3, 5, 7, 10, 12, 15, 17], BASS = [0, 0, 5, 3], ARP = [0, 2, 4, 5, 4, 2, 3, 1, 0, 2, 4, 6, 5, 4, 2, 1];
  function music() {
    if (!ac || !musicOn || !synthMusic()) return;
    var L = S ? S.layer || 0 : 0, beat = 60 / (104 + L * 9) / 2, root = 110 * Math.pow(2, L * 2 / 12);
    while (musicT < ac.currentTime + 0.15) {
      if (musicT < ac.currentTime) musicT = ac.currentTime + 0.02;
      var st = musicStep++, when = musicT - ac.currentTime, bar = Math.floor(st / 16) % 4;
      var bf = root * Math.pow(2, BASS[bar] / 12);
      if (st % 4 === 0) tone(bf / 2, bf / 2, beat * 1.8, 'triangle', 0.09, when);
      if (st % 8 === 4) tone(1800, 900, 0.03, 'square', 0.012, when);
      var n = SCALE[ARP[st % 16]] + BASS[bar];
      if (st % 2 === 0 || L >= 2) tone(root * 2 * Math.pow(2, n / 12), root * 2 * Math.pow(2, n / 12), beat * 0.9, 'square', 0.018 + L * 0.002, when);
      musicT += beat;
    }
  }
  setInterval(music, 50);
  function setMuted(m) { save.muted = m; store(); if (master) master.gain.value = m ? 0 : 1; }

  // ---------- The loop ----------
  var state = 'title', S = null, cam = 0, last = 0, acc = 0, tSec = 0, started = false, paused = false, endT = 0, lastRun = null;
  var held = false, tx = FW / 2, keyL = false, keyR = false, botMv = null;
  var pops = [], parts = [], shake = 0, flame = 0, toast = null, flash = 0;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2); var w = cv.clientWidth * dpr, h = cv.clientHeight * dpr; cv.width = Math.round(w); cv.height = Math.round(h);
    SC = Math.min(w / FW, h / 760); H = h / SC; VW = w / SC; OX = (VW - FW) / 2;
    var probe = document.getElementById('dm-safe'); safeTop = probe ? (parseFloat(getComputedStyle(probe).paddingTop) || 0) * dpr / SC : 0;
  }
  var DOGY = function () { return H * 0.6; };
  function sy(a) { return DOGY() - (a - cam); }
  function pop(text, x, a, col, size) { pops.push({ text: text, x: x, a: a, col: col || '#fff', size: size || 26, t: 0, rot: (Math.random() - 0.5) * 0.5 }); }
  function burst(x, a, col, n) { for (var i = 0; i < n; i++) { var an = Math.random() * TAU, s = 60 + Math.random() * 220; parts.push({ x: x, a: a, vx: Math.cos(an) * s, va: Math.sin(an) * s, t: 0, col: col }); } }

  function startRun(mode) {
    var seed = mode === 'daily' ? C.today() : Math.floor(Math.random() * 2176782335).toString(36);
    S = C.newRun(mode, seed); S.layer = 0; cam = S.a; started = false; paused = false; held = false; tx = FW / 2; pops = []; parts = []; shake = 0; toast = null; acc = 0; endT = 0; botMv = null;
    state = 'play'; show(null); audio(); musicOn = true; songRate = 1; song('climb'); save.runs++; store();
  }
  function events() {
    var i, e, m;
    for (i = 0; i < S.ev.length; i++) {
      e = S.ev[i];
      if (e === 'coin' || e === 'mult') {
        tone(880 + Math.min(S.streak, 30) * 20, 1760, 0.12, 'sine', 0.07);
        m = C.MULTS[C.multIdx(S.streak)];
        if (e === 'mult') { pop(m[2] + ' x' + m[1] + '!', S.x, S.a + 60, '#ffe066', 36); tone(660, 1320, 0.25, 'triangle', 0.1); }
        else if (S.streak % 4 === 0) pop(['wow', 'much coin', 'very rich', 'such Ð', 'so shiny'][(S.streak / 4 | 0) % 5], S.x + (Math.random() - 0.5) * 80, S.a + 40, ['#ff7ad9', '#7affc8', '#ffe066', '#7ac8ff'][S.streak % 4], 22);
      } else if (e === 'hit') {
        shake = 0.35; tone(220, 60, 0.35, 'sawtooth', 0.18); burst(S.x, S.a, '#ffb36b', 16); pop(['oof', 'ouch', 'no wow', 'such pain'][S.hits % 4], S.x, S.a + 50, '#ff6b6b', 30);
        if (navigator.vibrate) try { navigator.vibrate(40); } catch (er) { /* no haptics */ }
      } else if (e === 'oof') { shake = 0.5; tone(300, 60, 0.8, 'square', 0.14); burst(S.x, S.a, '#ffb36b', 24); }
      else if (e === 'back') { cam = S.a; pops = []; pop('back to ' + C.LAYERS[C.layerAt(S.a)].name.toLowerCase(), FW / 2, S.a + 120, '#fff', 28); }
      else if (e === 'shieldbreak') { pop('shield gone', S.x, S.a + 50, '#9ff', 24); tone(500, 200, 0.25, 'triangle', 0.1); }
      else if (e === 'combolost') { pop('combo lost', S.x, S.a + 50, '#ff9d9d', 22); tone(400, 200, 0.2, 'triangle', 0.06); }
      else if (e === 'wow') { pop('MUCH WOW!', S.x, S.a + 70, '#fff', 40); burst(S.x, S.a, '#ffe066', 24); tone(600, 1800, 0.5, 'triangle', 0.12); }
      else if (e === 'bone') { pop('+1 bone', S.x, S.a + 60, '#fff6e6', 30); tone(500, 1000, 0.3, 'triangle', 0.12); }
      else if (e.indexOf('boost:') === 0) { toast = { good: true, text: BOOST_POSTS[+e.slice(6)], t: 3.2 }; burst(S.x, S.a, '#7ac8ff', 24); tone(300, 1500, 0.6, 'sawtooth', 0.09); }
      else if (e.indexOf('dump:') === 0) { toast = { good: false, text: DUMP_POSTS[+e.slice(5)], t: 5.2 }; tone(700, 700, 0.12, 'square', 0.08); tone(700, 700, 0.12, 'square', 0.08, 0.3); tone(700, 700, 0.12, 'square', 0.08, 0.6); }
      else if (e === 'dumpstart') tone(900, 200, 0.4, 'square', 0.09);
      else if (e === 'finish' || e === 'timeout') finish(e === 'timeout');
    }
    S.ev.length = 0;
  }
  function finish(timeout) {
    state = 'end'; endT = 0; held = false; musicOn = false; if (jetG) jetG.gain.value = 0; song(timeout ? null : 'moon', 0.5); var pb0 = $('#dm-pause'); if (pb0) pb0.hidden = true;
    lastRun = { mode: S.mode, seed: S.seed, ms: S.ms, coins: S.coins, combo: S.bestStreak, hits: S.hits, oofs: S.oofs, code: timeout ? '' : C.encode(S), timeout: timeout, posted: false, pb: false, dayBest: false };
    if (!timeout) {
      shake = 0.6; burst(S.x, S.a + 20, '#d9d3bf', 40); tone(120, 40, 0.5, 'square', 0.2);
      tone(523, 1046, 0.4, 'triangle', 0.14, 0.7); tone(659, 1318, 0.4, 'triangle', 0.14, 0.88); tone(784, 1568, 0.7, 'triangle', 0.14, 1.06);
      if (!save.best || S.ms < save.best) { save.best = S.ms; lastRun.pb = true; }
      if (S.mode === 'daily' && (!save.daily[S.seed] || S.ms < save.daily[S.seed])) { save.daily = {}; save.daily[S.seed] = S.ms; lastRun.dayBest = true; }
      store();
    }
  }
  function tick() {
    if (!started) { if (!(held || AUTO)) return; started = true; }
    if (AUTO) { if (S.tick % 4 === 0 || !botMv) botMv = C.bot(S, 1); held = botMv.hold; tx = botMv.tx; }
    else if (keyL || keyR) tx = Math.max(0, Math.min(FW, S.x + ((keyR ? 1 : 0) - (keyL ? 1 : 0)) * 60));
    C.play(S, held, tx);
    var Lnow = C.layerAt(S.a); if (Lnow !== S.layer) songLayer(Lnow); S.layer = Lnow;
    events();
  }
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.1, (now - last) / 1000) || 0, i, p; last = now; tSec = now / 1000;
    if (state === 'play' && !paused) { acc += dt; var n = 0; while (acc >= C.DT && n++ < 8) { tick(); acc -= C.DT; if (state !== 'play') break; } if (n > 8) acc = 0; }
    if (state === 'end') { endT += dt; if (endT > 1.5 && !$('.dm-screen')) showEnd(); }
    if (S && state !== 'title') {
      // camera: follows the climb, and drops a little when you fall so the dump comes into view
      if (state === 'play') { cam = Math.max(cam, S.a); if (S.a < cam - H * 0.18) cam = S.a + H * 0.18; }
      else if (lastRun && !lastRun.timeout && endT > 0.8) cam += (C.TOTAL - H * 0.3 - cam) * Math.min(1, dt * 3);
      flame += ((held && state === 'play') || S.boost > 0 ? 1 : -1) * dt * 8; flame = Math.max(0, Math.min(1, flame));
      if (jetG) jetG.gain.setTargetAtTime(held && state === 'play' && !paused ? 0.05 : 0, ac.currentTime, 0.03);
    }
    if (!paused) {
      shake = Math.max(0, shake - dt); if (toast) { toast.t -= dt; if (toast.t <= 0) toast = null; }
      for (i = 0; i < pops.length; i++) pops[i].t += dt; pops = pops.filter(function (q) { return q.t < 1.1; });
      for (i = 0; i < parts.length; i++) { p = parts[i]; p.t += dt; p.x += p.vx * dt; p.a += p.va * dt; p.va -= 400 * dt; } parts = parts.filter(function (q) { return q.t < 0.8; });
    }
    draw(tSec);
  }

  // ---------- Drawing ----------
  function lerpC(a, b, t) { var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16); return 'rgb(' + (((pa >> 16) + ((pb >> 16) - (pa >> 16)) * t) | 0) + ',' + (((pa >> 8 & 255) + ((pb >> 8 & 255) - (pa >> 8 & 255)) * t) | 0) + ',' + (((pa & 255) + ((pb & 255) - (pa & 255)) * t) | 0) + ')'; }
  var STARS = [], CLOUDS = [];
  (function () { var r = C.rng(977), i; for (i = 0; i < 220; i++) STARS.push({ x: r(), y: r() * 3000, s: r() * 1.8 + 0.4, p: r() * 0.25 + 0.04, tw: r() * 6 }); for (i = 0; i < 16; i++) CLOUDS.push({ x: r(), y: r() * 3600, s: 0.6 + r() * 1.1, p: 0.3 + r() * 0.5 }); })();
  function drawBG(c, t) {
    var f = Math.max(0, c) / C.LEN, L = Math.min(C.NL - 1, Math.floor(f)), N = Math.min(C.NL - 1, L + 1), k = Math.min(1, Math.max(0, (f - L - 0.7) / 0.3)), i, y;
    var gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, lerpC(SKY[L][0], SKY[N][0], k)); gr.addColorStop(1, lerpC(SKY[L][1], SKY[N][1], k)); g.fillStyle = gr; g.fillRect(0, 0, VW, H);
    var sa = Math.min(1, Math.max(0, (f - 1.7) / 1.2));
    if (sa > 0) { g.fillStyle = '#fff'; for (i = 0; i < STARS.length; i++) { var s = STARS[i]; y = ((s.y + c * s.p) % 3000 + 3000) % 3000 - 200; if (y > H) continue; g.globalAlpha = sa * (0.6 + 0.4 * Math.sin(t * 2 + s.tw)); g.fillRect(s.x * VW, y, s.s, s.s); } g.globalAlpha = 1; }
    var ea = Math.min(1, Math.max(0, (f - 1.7) / 0.5));
    if (ea > 0) {   // the earth curving away below
      var R = VW * 1.2 * Math.max(0.25, 1 - Math.max(0, f - 2) * 0.3), cy = H + R * 0.92 - 60 + Math.max(0, f - 2) * 90;
      g.globalAlpha = ea; var eg = g.createRadialGradient(VW / 2, cy, R * 0.85, VW / 2, cy, R * 1.06); eg.addColorStop(0, '#2a7fd4'); eg.addColorStop(0.92, '#69c3ff'); eg.addColorStop(1, 'rgba(120,200,255,0)');
      g.fillStyle = eg; g.beginPath(); g.arc(VW / 2, cy, R * 1.06, 0, TAU); g.fill();
      g.save(); g.beginPath(); g.arc(VW / 2, cy, R, 0, TAU); g.clip(); g.fillStyle = '#2f8a4a';
      for (i = 0; i < 6; i++) { g.beginPath(); g.ellipse(VW / 2 + Math.cos(i * 1.7) * R * 0.7, cy - R * 0.9 + i % 3 * R * 0.12, R * 0.18, R * 0.06, i, 0, TAU); g.fill(); }
      g.restore(); g.globalAlpha = 1;
    }
    var mf = Math.max(0, (f - 2.4) / 2.6);
    if (mf > 0) { var mr = 26 + mf * mf * mf * FW * 0.9; A.moon(g, VW * 0.5 + (1 - mf) * FW * 0.32, H * 0.14 - mf * mf * mf * mr * 0.45, mr); }
    var ca = Math.max(0, 1 - Math.abs(f - 1.3) / 1.0);
    if (ca > 0) { g.globalAlpha = ca; for (i = 0; i < CLOUDS.length; i++) { var cl = CLOUDS[i]; y = ((cl.y + c * cl.p) % 3600 + 3600) % 3600 - 200; if (y > H + 100) continue; A.cloud(g, cl.x * VW - 40, y, cl.s); } g.globalAlpha = 1; }
    var gy = DOGY() + c + 20 - (state === 'title' ? 0 : 0);
    if (gy < H + 260) { g.fillStyle = '#5a86b8'; for (i = 0; i * 60 < VW; i++) { var bh = 60 + ((i * 37) % 5) * 34; g.fillRect(i * 60, gy - bh, 50, bh + 400); } g.fillStyle = '#3a5f8a'; g.fillRect(0, gy, VW, 400); }
    if (state !== 'title') captions(c, t);
  }
  // Meme captions drift past, and get more broken the higher you are.
  function captions(c, t) {
    var d = reduce ? 0 : Math.min(1, Math.max(0, c) / C.TOTAL * 1.25), cols = ['#ff4fd8', '#3dff9b', '#ffe14a', '#4fd2ff', '#ff8a3d'], P = 0.45, GAP = 300, k, i;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    var k0 = Math.floor(c * P / GAP) - 2;
    for (k = k0; k < k0 + Math.ceil(H / GAP) + 4; k++) {
      var r = C.rng(k * 7919 + 11), y = H * 0.5 - (k * GAP - c * P) + r() * 60; if (y < -80 || y > H + 80) { continue; }
      var words = WORDS[C.layerAt(k * GAP / P)], word = words[Math.floor(r() * words.length)], x = VW * 0.5 + (r() - 0.5) * Math.max(VW - 180, 200), size = 22 + r() * 16 + d * 14;
      g.save(); g.translate(x, y); g.rotate((r() - 0.5) * 0.5 + Math.sin(t * (0.5 + d * 3) + k) * d * 0.35); g.transform(1, 0, Math.sin(t * 1.3 + k) * d * 0.9, 1, 0, 0);
      g.font = '700 ' + size + 'px ' + MEME; g.globalAlpha = 0.6;
      var ws = [], wsum = 0; for (i = 0; i < word.length; i++) { ws.push(g.measureText(word[i]).width * (1 + d * 0.6)); wsum += ws[i]; }
      var cx = -wsum / 2;
      for (i = 0; i < word.length; i++) {
        var sc = 1 + Math.sin(t * 3 + i) * d * 0.45;
        g.save(); g.translate(cx + ws[i] / 2, Math.sin(t * 4 + i * 1.3 + k) * d * 12); g.scale(sc, sc * (1 + d * 0.3 * Math.sin(t * 2 + i)));
        g.fillStyle = d > 0.5 ? 'hsl(' + ((t * 120 + i * 40 + k * 60) % 360) + ' 100% 65%)' : cols[((k % 5) + 5 + i * (d > 0.25 ? 1 : 0)) % 5]; g.fillText(word[i], 0, 0); g.restore(); cx += ws[i];
      }
      g.restore();
    }
    g.globalAlpha = 1;
  }
  function warn(x, y, a) {
    g.save(); g.globalAlpha = (0.5 + 0.5 * Math.sin(tSec * 22)) * Math.min(1, a * 3); g.translate(x, y);
    g.fillStyle = '#ff3b3b'; g.beginPath(); g.moveTo(0, -13); g.lineTo(13, 11); g.lineTo(-13, 11); g.closePath(); g.fill();
    g.fillStyle = '#fff'; g.font = '15px ' + DISP; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('!', 0, 2); g.restore();
  }
  function drawObjs(t) {
    var objs = S.objs, i, o, y, k, b;
    for (i = S.lo; i < objs.length; i++) {
      o = objs[i]; if (o.a > S.a + 1500) break;
      if (o.taken) continue;
      C.place(o, S.tick); y = sy(o.pa);
      if (o.t === 'jet') { if (o.warn > 0 && sy(o.a) > -30 && sy(o.a) < H + 30) warn(o.dir > 0 ? 18 : FW - 18, sy(o.a), o.warn); if (o.on) A.jet(g, o.px, sy(o.a), o.dir); continue; }
      if (o.t === 'meteor') {
        if (o.warn > 0 && sy(o.a - 420) > 0 && sy(o.a + 560) < H) { g.strokeStyle = 'rgba(255,80,80,' + (0.25 + 0.25 * Math.sin(t * 22)) + ')'; g.lineWidth = 2; g.setLineDash([8, 10]); g.beginPath(); g.moveTo(o.px, Math.max(0, sy(o.a + 560))); g.lineTo(o.px, Math.min(H, sy(o.a - 420))); g.stroke(); g.setLineDash([]); warn(o.px, Math.max(110 + safeTop, sy(o.a + 560)), o.warn); }
        else if (o.on && y > -150 && y < H + 100) A.meteor(g, o.px, y);
        continue;
      }
      if (y > H + 120 || y < -160) continue;
      if (o.t === 'row') { for (k = 0; k < o.bars.length; k++) { b = o.bars[k]; if (b.x + o.off > FW + 4 || b.x + o.off < -40) continue; A.candle(g, b.x + o.off, y - b.o - b.h / 2, 36, b.h, 14); } }
      else if (o.t === 'coin') A.coin(g, o.px, y, o.r, t);
      else if (o.t === 'bird') A.bird(g, o.px, y, t, o.ph, o.dir);
      else if (o.t === 'ghost') A.ghost(g, o.px, y, t);
      else if (o.t === 'balloon') A.balloon(g, o.px, y, t);
      else if (o.t === 'sat') A.sat(g, o.px, y, t);
      else if (o.t === 'rock') A.rock(g, o.px, y, o.r, t);
      else if (o.t === 'tweet') A.tweet(g, o.px, y, t);
      else if (o.t === 'wow') A.wow(g, o.px, y, t);
      else if (o.t === 'bone') A.bonePickup(g, o.px, y, t);
    }
  }
  function drawFloor(t) {   // the dump: a wall of red candles rising from below
    var y = sy(S.floor), x, near = S.a - S.floor;
    if (near < 330 && S.floor > -300) { var wg = g.createLinearGradient(0, H - 140, 0, H); wg.addColorStop(0, 'rgba(229,50,59,0)'); wg.addColorStop(1, 'rgba(229,50,59,' + (0.5 * (1 - near / 330) * (0.7 + 0.3 * Math.sin(t * 10))) + ')'); g.fillStyle = wg; g.fillRect(0, H - 140, FW, 140); }
    if (y > H + 20) return;
    g.fillStyle = 'rgba(120,0,10,.6)'; g.fillRect(0, y + 30, FW, H - y);
    for (x = 0; x < FW; x += 24) { var h = 30 + Math.abs(Math.sin(x * 0.13 + t * 3)) * 40 + Math.sin(x * 0.05) * 12; g.fillStyle = '#ff9aa0'; g.fillRect(x + 10, y - h * 0.5 - 10, 3, h + 20); g.fillStyle = x % 48 ? '#e5323b' : '#b51e27'; g.fillRect(x + 2, y - h * 0.5 + 8, 20, h + 400); }
    g.fillStyle = '#fff'; g.font = '14px ' + DISP; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('THE DUMP', FW / 2, y + 46);
  }
  function shadow(txt, x, y) { var c = g.fillStyle; g.fillStyle = 'rgba(0,0,0,.55)'; g.fillText(txt, x + 2, y + 2); g.fillStyle = c; g.fillText(txt, x, y); }
  function hud(t) {
    var y0 = 12 + safeTop, i, m = C.MULTS[C.multIdx(S.streak)];
    g.textBaseline = 'top'; g.font = '22px ' + DISP; g.textAlign = 'left'; g.fillStyle = '#fff'; shadow(C.fmt(Math.round(S.tick * 1000 / C.TPS)).slice(0, -1), 14, y0);
    for (i = 0; i < 3; i++) A.bone(g, 24 + i * 34, y0 + 40, 1, i < S.hp);
    g.textAlign = 'center'; g.font = '18px ' + DISP; g.fillStyle = '#fff'; shadow(Math.floor(C.km(S.a)).toLocaleString('en-US') + ' km', FW / 2, y0);
    g.font = '700 15px ' + MEME; g.fillStyle = '#ffe066'; shadow(C.LAYERS[S.layer].name.toLowerCase(), FW / 2, y0 + 24);
    g.textAlign = 'right'; g.font = '20px ' + DISP; g.fillStyle = '#ffc93c'; shadow('Ð ' + S.coins, FW - 34, y0);
    if (S.streak > 0) {
      g.font = '700 20px ' + MEME; g.fillStyle = m[1] > 1 ? 'hsl(' + (t * 250 % 360) + ' 100% 70%)' : '#fff'; shadow(m[1] > 1 ? m[2] + ' x' + m[1] : 'x1', FW - 34, y0 + 26);
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(FW - 104, y0 + 52, 70, 4); g.fillStyle = '#ffe066'; g.fillRect(FW - 34 - 70 * Math.max(0, S.combo / C.COMBO), y0 + 52, 70 * Math.max(0, S.combo / C.COMBO), 4);
    }
    var rx = FW - 14, ry0 = H - 30, ry1 = 96 + safeTop; g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(rx - 2, ry1, 4, ry0 - ry1);
    for (i = 1; i < C.NL; i++) g.fillRect(rx - 6, ry0 - (ry0 - ry1) * i / C.NL, 12, 2);
    g.fillStyle = '#3aa0ff'; g.beginPath(); g.arc(rx, ry0 + 10, 7, 0, TAU); g.fill(); g.fillStyle = '#e9e4d2'; g.beginPath(); g.arc(rx, ry1 - 10, 7, 0, TAU); g.fill();
    g.fillStyle = '#e9a13b'; g.beginPath(); g.arc(rx, ry0 - (ry0 - ry1) * Math.min(1, Math.max(0, S.a) / C.TOTAL), 6, 0, TAU); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
    if (toast) {
      var w = Math.min(400, FW - 60), x = FW / 2 - w / 2, y = y0 + 122;
      g.globalAlpha = Math.min(1, toast.t * 3); g.fillStyle = '#fff'; A.rr(g, x, y, w, 64, 12); g.fill(); g.strokeStyle = toast.good ? '#1d9bf0' : '#e5323b'; g.lineWidth = 3; g.stroke();
      A.avatar(g, x + 30, y + 32, 20); g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillStyle = '#1d1f27'; g.font = '700 14px ' + MEME; g.fillText('Elawn Moosk', x + 58, y + 20);
      g.fillStyle = '#8899aa'; g.font = '700 12px ' + MEME; g.fillText('@elawn', x + 152, y + 20);
      g.fillStyle = '#1d1f27'; g.font = '700 17px ' + MEME; g.fillText(toast.text, x + 58, y + 44, w - 70); g.globalAlpha = 1;
    }
    g.textAlign = 'center'; g.textBaseline = 'middle';
    if (S.dumpWarn > 0 && Math.floor(S.dumpWarn / 7) % 2 === 0) { g.font = '28px ' + DISP; g.fillStyle = '#ff4fd8'; shadow('HEAVY GRAVITY INCOMING', FW / 2, H * 0.3); }
    var sub = S.dump > 0 ? ['heavy gravity ' + (S.dump / 60).toFixed(1) + 's · hold on!', '#ff9df0'] : S.boost > 0 ? ['ROCKET MODE ' + (S.boost / 60).toFixed(1) + 's', '#7ac8ff'] : S.shield > 0 ? ['shield + coin magnet ' + (S.shield / 60).toFixed(1) + 's', '#fff'] : null;
    if (sub) { g.font = '700 18px ' + MEME; g.fillStyle = sub[1]; shadow(sub[0], FW / 2, H - 22); }
    if (!started) {
      g.font = '26px ' + DISP; g.fillStyle = 'rgba(255,255,255,' + (0.8 + 0.2 * Math.sin(t * 5)) + ')'; shadow('HOLD TO LAUNCH', FW / 2, H * 0.34);
      g.font = '700 18px ' + MEME; g.fillStyle = '#fff'; shadow('slide your finger or mouse to steer', FW / 2, H * 0.34 + 34); shadow('or use the arrow keys and Space', FW / 2, H * 0.34 + 58);
      g.fillStyle = '#ffe066'; shadow('the clock starts when you do', FW / 2, H * 0.34 + 90);
    }
  }
  function draw(t) {
    var title = state === 'title', i, p;
    g.setTransform(SC, 0, 0, SC, 0, 0);
    g.save();
    if (shake > 0 && !reduce && !title) g.translate((Math.random() - 0.5) * shake * 30, (Math.random() - 0.5) * shake * 30);
    drawBG(title ? 0 : cam, t);
    g.translate(OX, 0);
    if (OX > 4) { g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(-OX, 0, OX, H); g.fillRect(FW, 0, OX, H); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(-2, 0, 2, H); g.fillRect(FW, 0, 2, H); }
    if (title) { A.doge(g, FW / 2, H * 0.4 + Math.sin(t * 2) * 14, 58, t, { flame: 0.7 + 0.3 * Math.sin(t * 9), tilt: Math.sin(t * 1.3) * 0.1, wow: true, tongue: true }); g.restore(); return; }
    g.save(); g.beginPath(); g.rect(0, -50, FW, H + 100); g.clip();
    var py = sy(0) + 46;
    if (py < H + 60) { g.fillStyle = '#2b313a'; g.fillRect(FW / 2 - 70, py, 140, 10); g.fillStyle = '#55606e'; g.fillRect(FW / 2 - 90, py - 84, 12, 94); g.fillRect(FW / 2 - 90, py - 84, 50, 8); g.fillStyle = '#fff'; g.font = '16px ' + DISP; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Ð LAUNCHPAD', FW / 2, py + 30); }
    var my = sy(C.TOTAL) - C.HR;
    if (my > -300) { g.fillStyle = '#d9d3bf'; g.beginPath(); g.ellipse(FW / 2, my - 560, FW * 1.4, 560, 0, 0, TAU); g.fill(); g.fillStyle = '#bfb7a0'; for (i = 0; i < 5; i++) { g.beginPath(); g.ellipse(40 + i * 105, my - 30 - (i % 2) * 26, 34 - (i % 3) * 7, 9, 0, 0, TAU); g.fill(); } }
    drawObjs(t);
    if (state === 'play') drawFloor(t);
    var dx = S.x, dy = sy(S.a);
    if (S.shield > 0 && state === 'play') { g.strokeStyle = 'hsla(' + (t * 200 % 360) + ',100%,70%,.8)'; g.lineWidth = 4; g.beginPath(); g.ellipse(dx, dy + 14, 38, 52, 0, 0, TAU); g.stroke(); }
    if (S.boost > 0 && state === 'play') for (i = 0; i < 6; i++) { g.strokeStyle = 'rgba(122,200,255,.6)'; g.lineWidth = 3; var xx = dx - 30 + i * 12 + Math.sin(t * 30 + i) * 4; g.beginPath(); g.moveTo(xx, dy + 60 + Math.random() * 20); g.lineTo(xx, dy + 140 + Math.random() * 80); g.stroke(); }
    if (state === 'end' && lastRun && !lastRun.timeout) {   // helmet-first into the moon
      var k = Math.min(1, endT * 4), surf = dy - C.HR, R = C.HR * 2;
      S.x += (FW / 2 - S.x) * 0.08; dx = S.x;
      g.save(); g.beginPath(); g.rect(-OX, surf, VW, H); g.clip(); A.doge(g, dx, surf + R * 1.3 - R * 0.75 * k, R, t, { tilt: Math.sin(t * 30) * 0.05 * Math.max(0, 1 - endT), flame: Math.max(0, 1 - endT * 1.5), hurt: true }); g.restore();
      g.fillStyle = '#bfb7a0'; g.beginPath(); g.ellipse(dx, surf, R * 1.6, 7, 0, 0, TAU); g.fill();
      g.save(); g.translate(dx - 96, surf + 36); g.rotate(-0.2); g.font = '700 34px ' + MEME; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 5; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeText('*bonk*', 0, 0); g.fillText('*bonk*', 0, 0); g.restore();
      g.fillStyle = '#ffe066'; g.font = '20px ' + DISP; for (i = 0; i < 3; i++) g.fillText('★', dx + Math.cos(t * 3 + i * 2.1) * 56, surf + 44 + Math.sin(t * 3 + i * 2.1) * 12);
      if (endT > 0.9) {   // the flag
        var fx = dx + 84, up = Math.min(1, (endT - 0.9) * 3), wv = Math.sin(t * 4) * 4; g.fillStyle = '#ccc'; g.fillRect(fx, surf, 4, 80 * up);
        if (up >= 1) { g.fillStyle = '#ffc93c'; g.beginPath(); g.moveTo(fx + 4, surf + 80); g.quadraticCurveTo(fx + 30, surf + 86 + wv, fx + 58, surf + 80); g.lineTo(fx + 58, surf + 46); g.quadraticCurveTo(fx + 30, surf + 52 + wv, fx + 4, surf + 46); g.fill(); g.fillStyle = '#b8860b'; g.font = '22px ' + DISP; g.fillText('Ð', fx + 31, surf + 63); }
      }
    } else if (!(S.inv > 0 && S.oof === 0 && Math.floor(t * 14) % 2 === 0 && state === 'play')) {
      var lean = Math.max(-0.35, Math.min(0.35, (tx - S.x) / 260));
      A.doge(g, dx, dy, C.HR + 3, t, { flame: flame, tilt: started ? lean : 0, wow: S.streak >= 5, happy: S.streak >= 12, tongue: held, hurt: S.inv > 50 || S.oof > 0, big: S.boost > 0 });
    }
    for (i = 0; i < parts.length; i++) { p = parts[i]; g.globalAlpha = 1 - p.t / 0.8; g.fillStyle = p.col; g.fillRect(p.x, sy(p.a), 4, 4); } g.globalAlpha = 1;
    g.restore();
    for (i = 0; i < pops.length; i++) { p = pops[i]; g.save(); g.translate(Math.max(60, Math.min(FW - 60, p.x)), sy(p.a) - p.t * 50); g.rotate(p.rot); g.globalAlpha = Math.min(1, (1.1 - p.t) * 3); g.font = '700 ' + p.size + 'px ' + MEME; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = p.col; g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 4; g.strokeText(p.text, 0, 0); g.fillText(p.text, 0, 0); g.restore(); }
    if (state === 'play') hud(t);
    if (S.oof > 0 && state === 'play') {
      g.fillStyle = 'rgba(20,0,10,.65)'; g.fillRect(-OX, 0, VW, H); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '700 140px ' + MEME; g.fillStyle = '#ff5a6a'; g.save(); g.translate(FW / 2, H * 0.42); g.rotate(-0.08 + (reduce ? 0 : Math.sin(t * 20) * 0.02)); g.fillText('OOF', 0, 0); g.restore();
      g.font = '700 22px ' + MEME; g.fillStyle = '#fff'; g.fillText('back to the start of ' + C.LAYERS[C.layerAt(S.a)].name.toLowerCase(), FW / 2, H * 0.6, FW - 30); g.fillText('clock still running', FW / 2, H * 0.6 + 30);
    }
    g.restore();
  }

  // ---------- Screens ----------
  function show(html) { rootEl.querySelectorAll('.dm-screen').forEach(function (e) { e.remove(); }); if (html) rootEl.insertAdjacentHTML('beforeend', html); var pb = $('#dm-pause'); if (pb) pb.hidden = state !== 'play'; }
  function soundBtn() { return '<button type="button" class="dm-ghost" data-a="sound" aria-pressed="' + (!save.muted) + '">' + (save.muted ? 'SOUND OFF' : 'SOUND ON') + '</button>'; }
  function showTitle() {
    state = 'title'; musicOn = false; paused = false; if (jetG) jetG.gain.value = 0; if (ac) { if (ac.state === 'suspended') ac.resume(); song('title'); }
    var date = C.today(), mine = save.daily[date];
    show('<div class="dm-screen dm-title"><div class="dm-top"><a class="dm-ghost" href="./">← GAMES</a>' + soundBtn() + '</div>' +
      '<h1 class="dm-logo"><span>DOGE MOON</span><em>CRASH</em></h1><p class="dm-tag"><i>such game.</i> <b>very wow.</b></p><div class="dm-gap"></div>' +
      '<div class="dm-panel"><div class="dm-acts"><button type="button" class="dm-btn dm-primary" data-a="daily"><span>DAILY MOON #' + C.dayNum(date) + '</span><small>' + (mine ? 'your best today ' + C.fmt(mine) : 'same map for everyone today') + '</small></button>' +
      '<button type="button" class="dm-btn" data-a="free"><span>FREE FLIGHT</span><small>a new map every run</small></button></div>' +
      '<p class="dm-how">Hold to fire the jetpack. Slide to steer. Coins in a row make you faster. Three bones, then OOF.</p>' +
      '<div class="dm-k">TODAY\'S FASTEST TO THE MOON</div><div id="dm-board"><div class="dm-dim">Loading…</div></div></div></div>');
    getBoard(function (b) { var el = $('#dm-board'); if (el) el.innerHTML = boardHtml(b ? { top: b.top.slice(0, 5) } : null); });
  }
  function rating(ms) { return ms < C.PAR[0] ? ['SUCH FAST', 'very elite pilot'] : ms < C.PAR[1] ? ['VERY QUICK', 'much skill'] : ms < C.PAR[2] ? ['MUCH MOON', 'wow you made it'] : ['SO SLOW', 'but still moon. wow']; }
  function showEnd() {
    var r = lastRun, md = C.medal(r.ms), rt = rating(r.ms), daily = r.mode === 'daily';
    if (r.timeout) { show('<div class="dm-screen dm-end"><div class="dm-card"><div class="dm-k">OUT OF FUEL</div><div class="dm-rate">MUCH SLOW</div><p class="dm-dim">Five minutes is all the jetpack has. Try again.</p><div class="dm-acts row"><button type="button" class="dm-btn dm-primary" data-a="again"><span>FLY AGAIN</span></button><button type="button" class="dm-btn" data-a="menu"><span>MENU</span></button></div></div></div>'); return; }
    show('<div class="dm-screen dm-end"><div class="dm-card"><div class="dm-k">' + (daily ? 'DAILY MOON #' + C.dayNum(r.seed) : 'FREE FLIGHT') + ' · YOU REACHED THE MOON</div>' +
      '<div class="dm-time">' + C.fmt(r.ms) + '</div><div class="dm-rate' + (md ? ' m' + md : '') + '">' + (md ? MEDAL[md] + ' · ' : '') + rt[0] + '</div><div class="dm-sub">' + rt[1] + '</div>' +
      '<div class="dm-stats"><span>Ð ' + r.coins + ' coins</span><span>best combo ' + r.combo + '</span><span>' + r.hits + ' hits</span><span>' + r.oofs + ' oof</span></div>' +
      (r.pb ? '<div class="dm-pb">new personal best!</div>' : save.best ? '<div class="dm-dim">your best ' + C.fmt(save.best) + '</div>' : '') +
      (daily ? '<form class="dm-post" id="dm-post"><label for="dm-in">Initials</label><input id="dm-in" maxlength="3" autocomplete="off" autocapitalize="characters" spellcheck="false" value="' + esc(save.initials) + '" placeholder="AAA"><button type="submit" class="dm-btn dm-small"><span>POST TIME</span></button></form><div class="dm-note" id="dm-note" aria-live="polite"></div><div id="dm-board"></div>'
        : '<div class="dm-note" id="dm-note" aria-live="polite">Free Flight times stay on this device. Fly the Daily Moon to get on the board.</div>') +
      '<div class="dm-acts row"><button type="button" class="dm-btn dm-primary" data-a="again"><span>FLY AGAIN</span></button><button type="button" class="dm-btn" data-a="share"><span>SHARE</span></button><button type="button" class="dm-btn" data-a="menu"><span>MENU</span></button></div></div></div>');
    if (daily) {
      getBoard(function (b) { var el = $('#dm-board'); if (el) el.innerHTML = boardHtml(b ? { top: b.top.slice(0, 5) } : null); });
      $('#dm-post').addEventListener('submit', function (e) {
        e.preventDefault(); var note = $('#dm-note'), ini = $('#dm-in').value.toUpperCase().replace(/[^A-Z]/g, '');
        if (r.posted) return;
        if (ini.length !== 3) { note.textContent = 'Three letters, please.'; return; }
        if (r.code.length > 20000) { note.textContent = 'That run was too long to post. Faster next time.'; return; }
        save.initials = ini; store(); note.textContent = 'Posting…';
        postScore(r.code, ini, function (j, err) {
          if (!j) { note.textContent = err === 'pick other initials' ? 'Pick other initials.' : err === 'slow down' ? 'Too many posts. Wait a minute.' : 'The leaderboard is offline right now.'; return; }
          r.posted = true; note.textContent = 'You are #' + j.rank + ' today.'; $('#dm-post').hidden = true;
          getBoard(function (b) { var el = $('#dm-board'); if (el) el.innerHTML = boardHtml(b ? { top: b.top.slice(0, 5) } : null, { initials: ini, ms: r.ms }); }, true);
        });
      });
    }
  }
  function showPause() {
    paused = true; if (jetG) jetG.gain.value = 0; musicOn = false; if (songNow) songNow.g.gain.setTargetAtTime(0.12, ac.currentTime, 0.1);
    show('<div class="dm-screen dm-end"><div class="dm-card"><div class="dm-rate">PAUSED</div><div class="dm-acts row"><button type="button" class="dm-btn dm-primary" data-a="resume"><span>RESUME</span></button><button type="button" class="dm-btn" data-a="again"><span>RESTART</span></button><button type="button" class="dm-btn" data-a="menu"><span>MENU</span></button></div><div class="dm-acts row">' + soundBtn() + '</div></div></div>');
    $('#dm-pause').hidden = true;
  }
  function resume() { paused = false; musicOn = true; held = false; show(null); if (songNow) songNow.g.gain.setTargetAtTime(SONGS[songNow.name].vol, ac.currentTime, 0.1); }
  // Browsers only allow sound after a tap or key, so the title music starts on the first one.
  document.addEventListener('pointerdown', function () { audio(); }, { once: true });
  document.addEventListener('keydown', function () { audio(); }, { once: true });
  rootEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-a]'); if (!b) return; var a = b.getAttribute('data-a');
    if (a === 'daily' || a === 'free') startRun(a);
    else if (a === 'again') startRun(S ? S.mode : 'daily');
    else if (a === 'menu') showTitle();
    else if (a === 'resume') { resume(); }
    else if (a === 'pause') { if (state === 'play' && !paused) showPause(); }
    else if (a === 'sound') { audio(); setMuted(!save.muted); b.textContent = save.muted ? 'SOUND OFF' : 'SOUND ON'; b.setAttribute('aria-pressed', String(!save.muted)); }
    else if (a === 'share') { var r = lastRun, md = C.medal(r.ms); share(shareCard(r), 'I flew a doge to the moon in ' + C.fmt(r.ms) + (md ? ' (' + MEDAL[md].toLowerCase() + ')' : '') + (r.mode === 'daily' ? ' on Daily Moon #' + C.dayNum(r.seed) : '') + '. Such game. Very wow.'); }
  });

  // ---------- The share picture (1200 x 675) ----------
  function shareCard(r) {
    var c = document.createElement('canvas'); c.width = 1200; c.height = 675; var x = c.getContext('2d'), i, rn = C.rng(42), md = r ? C.medal(r.ms) : 0;
    var sk = x.createLinearGradient(0, 0, 0, 675); sk.addColorStop(0, '#030310'); sk.addColorStop(1, '#241a52'); x.fillStyle = sk; x.fillRect(0, 0, 1200, 675);
    x.fillStyle = '#fff'; for (i = 0; i < 160; i++) { x.globalAlpha = 0.3 + rn() * 0.7; x.fillRect(rn() * 1200, rn() * 675, 1 + rn() * 2, 1 + rn() * 2); } x.globalAlpha = 1;
    A.moon(x, 1010, 40, 330);
    for (i = 0; i < 7; i++) A.candle(x, 30 + i * 64, 560 + ((i * 53) % 60), 46, 200, 22);
    A.doge(x, 420, 300, 120, 1.3, { flame: 1, tilt: 0.16, wow: true, tongue: true, big: true });
    x.textBaseline = 'alphabetic'; x.textAlign = 'left'; x.save(); x.translate(50, 96); x.rotate(-0.03);
    x.font = '64px ' + DISP; x.fillStyle = '#000'; x.fillText('DOGE MOON', 4, 4); x.fillStyle = '#ffc93c'; x.fillText('DOGE MOON', 0, 0);
    x.font = '56px ' + DISP; x.fillStyle = '#000'; x.fillText('CRASH', 4, 62); x.fillStyle = '#fff'; x.fillText('CRASH', 0, 58); x.restore();
    x.font = '700 30px ' + MEME; x.save(); x.translate(640, 150); x.rotate(-0.12); x.fillStyle = '#ff4fd8'; x.fillText('such fast', 0, 0); x.restore(); x.save(); x.translate(250, 560); x.rotate(0.1); x.fillStyle = '#3dff9b'; x.fillText('very moon', 0, 0); x.restore();
    if (r) {
      x.textAlign = 'right'; x.fillStyle = 'rgba(8,6,26,.82)'; A.rr(x, 700, 300, 450, md ? 250 : 200, 22); x.fill(); x.strokeStyle = '#ffc93c'; x.lineWidth = 4; x.stroke();
      x.font = '700 26px ' + MEME; x.fillStyle = '#3dff9b'; x.fillText(r.mode === 'daily' ? 'Daily Moon #' + C.dayNum(r.seed) : 'Free Flight', 1120, 350);
      x.font = '84px ' + DISP; x.fillStyle = '#ffc93c'; x.fillText(C.fmt(r.ms), 1120, 440);
      x.font = '700 26px ' + MEME; x.fillStyle = '#fff'; x.fillText('Ð ' + r.coins + ' coins · combo ' + r.combo, 1120, 482);
      if (md) { A.medal(x, 760, 510, 26, md); x.font = '34px ' + DISP; x.fillStyle = ['', '#e08a4a', '#d9dde6', '#ffc93c'][md]; x.fillText(MEDAL[md], 1120, 524); }
    }
    x.textAlign = 'right'; x.font = '26px ' + DISP; x.fillStyle = '#fff'; x.fillText('proofoffight.com/doge', 1160, 645);
    return c;
  }
  // The share panel: a preview of the picture and plain buttons, instead of the system share box
  // (on Windows that box rarely has X in it). Phones also get the system share as "More apps".
  var URL_GAME = 'https://proofoffight.com/doge/', shareBlob = null;
  function share(card, text) {
    var old = $('.dm-share'); if (old) old.remove();
    shareBlob = null; card.toBlob(function (blob) { shareBlob = blob; }, 'image/png');
    var touch = window.matchMedia && matchMedia('(pointer: coarse)').matches, canFiles = false;
    try { canFiles = touch && !!navigator.canShare && navigator.canShare({ files: [new File([new Blob(['x'], { type: 'image/png' })], 'a.png', { type: 'image/png' })] }); } catch (e) { /* no file sharing */ }
    rootEl.insertAdjacentHTML('beforeend', '<div class="dm-share" role="dialog" aria-modal="true" aria-label="Share your run"><div class="dm-share-box">' +
      '<img class="dm-share-img" alt="Your Doge Moon Crash result picture" src="' + card.toDataURL('image/png') + '">' +
      '<p class="dm-share-txt">' + esc(text) + ' <span>' + URL_GAME.replace('https://', '') + '</span></p>' +
      '<div class="dm-acts"><button type="button" class="dm-btn dm-x" data-s="x"><span>POST ON X</span><small>copies the picture too</small></button>' +
      '<button type="button" class="dm-btn" data-s="save"><span>SAVE PICTURE</span><small>to attach anywhere</small></button>' +
      '<button type="button" class="dm-btn" data-s="copy"><span>COPY TEXT</span><small>with the link</small></button>' +
      (canFiles ? '<button type="button" class="dm-btn" data-s="more"><span>MORE APPS</span><small>your phone\'s share menu</small></button>' : '<button type="button" class="dm-btn" data-s="close"><span>CLOSE</span></button>') +
      '</div><div class="dm-note" id="dm-snote" aria-live="polite"></div>' + (canFiles ? '<button type="button" class="dm-ghost dm-share-close" data-s="close">CLOSE</button>' : '') + '</div></div>');
    var box = $('.dm-share'), note = $('#dm-snote');
    function say(t) { note.textContent = t; }
    function blobNow(cb) { if (shareBlob) cb(shareBlob); else card.toBlob(function (bl) { shareBlob = bl; cb(bl); }, 'image/png'); }
    function save() { blobNow(function (bl) { var l = document.createElement('a'); l.href = URL.createObjectURL(bl); l.download = 'doge-moon-crash.png'; document.body.appendChild(l); l.click(); l.remove(); }); }
    function copyText(t, ok) { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () { say('Copy this: ' + t); }); else say('Copy this: ' + t); }
    box.addEventListener('click', function (e) {
      if (e.target === box) { box.remove(); return; }
      var b = e.target.closest('[data-s]'); if (!b) return; var k = b.getAttribute('data-s');
      if (k === 'close') box.remove();
      else if (k === 'save') { save(); say('Picture saved. Attach it to your post.'); }
      else if (k === 'copy') copyText(text + ' ' + URL_GAME, function () { say('Text and link copied.'); });
      else if (k === 'more') blobNow(function (bl) { navigator.share({ files: [new File([bl], 'doge-moon-crash.png', { type: 'image/png' })], text: text + ' ' + URL_GAME }).catch(function () { /* closed */ }); });
      else if (k === 'x') {
        // Copy the picture first (the browser needs this inside the click), then open the post box in a new tab.
        var copied = false;
        try {
          if (navigator.clipboard && window.ClipboardItem) {
            var item = new ClipboardItem({ 'image/png': shareBlob || new Promise(function (ok) { card.toBlob(ok, 'image/png'); }) });
            navigator.clipboard.write([item]).then(function () { say('Picture copied. In X, paste it into your post (Ctrl+V, or long-press and Paste).'); }, function () { save(); say('Picture saved instead. Attach it to your post in X.'); });
            copied = true;
          }
        } catch (er) { copied = false; }
        if (!copied) { save(); say('Picture saved. Attach it to your post in X.'); }
        window.open('https://x.com/intent/post?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(URL_GAME), '_blank', 'noopener');
      }
    });
    var first = box.querySelector('[data-s="x"]'); if (first) first.focus();
  }

  // ---------- Input: hold = jetpack, finger or mouse x = steer, or the arrow keys ----------
  function toField(e) { var r = cv.getBoundingClientRect(); return (e.clientX - r.left) * dpr / SC - OX; }
  cv.addEventListener('pointerdown', function (e) { e.preventDefault(); audio(); if (state !== 'play' || paused) return; held = true; tx = toField(e); });
  window.addEventListener('pointermove', function (e) { if (state === 'play' && !paused && (e.pointerType === 'mouse' || held)) tx = toField(e); });
  window.addEventListener('pointerup', function () { held = false; }); window.addEventListener('pointercancel', function () { held = false; });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('keydown', function (e) {
    var c = e.code;
    if (e.target && e.target.tagName === 'INPUT') return;
    if (c === 'Escape' && $('.dm-share')) { $('.dm-share').remove(); return; }
    if (c === 'Space' || c === 'ArrowUp' || c === 'KeyW') { e.preventDefault(); audio(); if (state === 'play' && !paused) held = true; }
    else if (c === 'ArrowLeft' || c === 'KeyA') { keyL = true; e.preventDefault(); } else if (c === 'ArrowRight' || c === 'KeyD') { keyR = true; e.preventDefault(); }
    else if (c === 'Escape' || c === 'KeyP') { if (state === 'play') { if (paused) resume(); else showPause(); } }
  });
  window.addEventListener('keyup', function (e) { var c = e.code; if (c === 'Space' || c === 'ArrowUp' || c === 'KeyW') held = false; else if (c === 'ArrowLeft' || c === 'KeyA') keyL = false; else if (c === 'ArrowRight' || c === 'KeyD') keyR = false; });
  window.addEventListener('blur', function () { held = false; keyL = keyR = false; });
  document.addEventListener('visibilitychange', function () { if (document.hidden && state === 'play' && !paused && started && !AUTO) showPause(); });

  document.documentElement.classList.add('dm-on');
  rootEl.insertAdjacentHTML('beforeend', '<div id="dm-safe"></div><button type="button" id="dm-pause" data-a="pause" aria-label="Pause" hidden>II</button>');
  window.addEventListener('resize', resize); resize();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { /* canvas text picks the fonts up on the next frame */ });
  showTitle();
  requestAnimationFrame(frame);
  if (DEBUG) window.POF_DM = { get S() { return S; }, get song() { return songNow ? songNow.name + ' x' + songNow.src.playbackRate.value.toFixed(3) : (songWant ? 'loading ' + songWant.name : 'none'); }, get state() { return state; }, core: C, save: save, start: startRun, card: shareCard, title: showTitle, get last() { return lastRun; },
    jump: function (L) { S.a = L * C.LEN + 60; S.top = S.a; S.floor = S.a - 460; S.lo = 0; cam = S.a; }, nearEnd: function () { S.a = C.TOTAL - 500; S.top = S.a; S.floor = S.a - 460; cam = S.a; S.lo = 0; }, go: function () { started = true; }, god: function () { S.inv = 1e9; } };
})();
