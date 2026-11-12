/* 51% Attack (/51/): everything you see and hear. The rules are in js/a51-core.js.
   One canvas for the board (all of it drawn here, no pictures but the two heads the fighting game already
   has), and plain HTML over it for the meters, the buttons and the cards. */
(function () {
  'use strict';
  if (!window.POF_A51_PAGE) return;
  var C = window.POF_A51_CORE, R = C.RULES;
  var TEAL = '#19e6b0', VIO = '#9b5cff', GOLD = '#ffc53d';
  // The other side's colour changes with the boss: RED and its shades are set per stage in paint().
  var RED = '#ff3d5a', FRGB = '255,61,90', DARK = '#1c040b', DIM = '#6d0a20', LIGHT = '#ff9fb0', FOE_COL = {};
  function rgbOf(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }
  function mix(a, b, t) { var x = rgbOf(a), y = rgbOf(b); return '#' + [0, 1, 2].map(function (i) { var v = Math.round(x[i] + (y[i] - x[i]) * t); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function paint(stage) {
    RED = stage.color; FRGB = rgbOf(RED).join(','); DARK = mix(RED, '#000000', 0.88); DIM = mix(RED, '#000000', 0.58); LIGHT = mix(RED, '#ffffff', 0.5);
    FOE_COL = { aide: RED, lobbyist: mix(RED, '#ffe27a', 0.5), subpoena: RED, rogue: mix(RED, '#7a2cff', 0.45), boss: RED };
  }
  var BW = 720, BH = 960;                         // the board, in its own units
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function $(s, el) { return (el || document).querySelector(s); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem('pof.a51.' + k); localStorage.setItem('pof.a51.' + k, v); } catch (e) { /* private mode */ } return null; }
  function img(src) { var i = new Image(); i.src = src; return i; }
  var HEAD = { toly: img('art/toly-head.webp') };
  C.STAGES.forEach(function (st) { HEAD[st.boss] = img('art/' + st.boss + '-head.webp'); });

  // ---------- Page ----------
  var root = document.createElement('div');
  root.id = 'a51';
  root.innerHTML =
    '<canvas id="a51-cv" aria-label="51% Attack board"></canvas>' +
    '<div class="a51-hud" id="a51-hud" hidden>' +
      '<a class="a51-ic" href="./" aria-label="Back to the arcade" id="a51-back"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 2 4 8l6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>' +
      '<div class="a51-cons"><div class="a51-cons-top"><span>CONSENSUS</span><b id="a51-pct">100%</b></div><div class="a51-meter"><i id="a51-fill"></i><em></em></div></div>' +
      '<div class="a51-stat gold"><span>TOKENS</span><b id="a51-tok">0</b></div>' +
      '<div class="a51-stat"><span>WAVE</span><b id="a51-wave">1/7</b></div>' +
      '<button class="a51-ic" id="a51-snd" type="button" aria-label="Sound"></button>' +
    '</div>' +
    '<aside class="a51-side a51-left" id="a51-left" hidden>' +
    '</aside>' +
    '<aside class="a51-side a51-right" id="a51-right" hidden><h4>CHAIN LOG</h4><ol id="a51-log"></ol></aside>' +
    '<div class="a51-bar" id="a51-bar" hidden>' +
      '<button class="a51-super" id="a51-super" type="button" disabled><span class="a51-super-fill" id="a51-super-fill"></span><img src="art/toly-head.webp" alt=""><span class="a51-super-txt"><b>SUPER</b><small id="a51-super-sub">Charging</small></span></button>' +
      '<button class="a51-next" id="a51-next" type="button" disabled><b id="a51-next-t">NEXT WAVE</b><small id="a51-next-sub"></small></button>' +
      '<button class="a51-ic a51-speed" id="a51-speed" type="button" aria-label="Game speed">1x</button>' +
    '</div>' +
    '<div class="a51-cut" id="a51-cut" hidden><img src="art/toly-head.webp" alt=""><div><b>SECOND BEST SALESMAN</b><span id="a51-cut-sub">HATER CONVERTED</span></div></div>' +
    '<div class="a51-ov" id="a51-ov"></div>' +
    '<div class="a51-turn"><b>TURN YOUR PHONE UPRIGHT</b><span>The network needs the height.</span></div>';
  document.body.appendChild(root);
  document.documentElement.classList.add('a51-on');
  var cv = $('#a51-cv'), cx = cv.getContext('2d'), ov = $('#a51-ov');
  var el = { hud: $('#a51-hud'), bar: $('#a51-bar'), left: $('#a51-left'), right: $('#a51-right'), pct: $('#a51-pct'), fill: $('#a51-fill'),
    tok: $('#a51-tok'), wave: $('#a51-wave'), snd: $('#a51-snd'), sup: $('#a51-super'), supFill: $('#a51-super-fill'), supSub: $('#a51-super-sub'),
    next: $('#a51-next'), nextT: $('#a51-next-t'), nextSub: $('#a51-next-sub'), speed: $('#a51-speed'), cut: $('#a51-cut'), cutSub: $('#a51-cut-sub'), log: $('#a51-log') };

  // ---------- Sound: a tiny synth, nothing to download ----------
  var AC = null, master = null, soundOn = store('sound') !== '0';
  var SND_ON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3v10L5 10H2z" fill="currentColor"/><path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.6 3.6a6 6 0 0 1 0 8.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  var SND_OFF = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3v10L5 10H2z" fill="currentColor"/><path d="m11 6 4 4m0-4-4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  function sndIcon() { el.snd.innerHTML = soundOn ? SND_ON : SND_OFF; el.snd.setAttribute('aria-pressed', soundOn ? 'true' : 'false'); }
  function unlock() {
    if (!AC) {
      var K = window.AudioContext || window.webkitAudioContext; if (!K) return;
      AC = new K(); master = AC.createGain(); master.gain.value = soundOn ? 0.5 : 0; master.connect(AC.destination);
    }
    if (AC.state === 'suspended') AC.resume();
    if (M.want && !M.name) { var w = M.want; M.want = null; music(w); }
  }
  function tone(f, dur, o) {
    if (!AC || !soundOn || AC.state !== 'running') return;
    o = o || {};
    var t = AC.currentTime + (o.at || 0), osc = AC.createOscillator(), g = AC.createGain();
    osc.type = o.type || 'triangle'; osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || 0.2, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(master); osc.start(t); osc.stop(t + dur + 0.02);
  }
  var noiseBuf = null;
  function noise(dur, vol, hp, at) {
    if (!AC || !soundOn || AC.state !== 'running') return;
    if (!noiseBuf) { noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    var t = AC.currentTime + (at || 0), s = AC.createBufferSource(), g = AC.createGain(), f = AC.createBiquadFilter();
    s.buffer = noiseBuf; f.type = 'bandpass'; f.frequency.value = hp || 900; f.Q.value = 0.8;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur);
  }
  // ---------- Music: the fighting game's songs, one per boss ----------
  // Same files and loop points as js/audio.js MUSIC. The song loops between loopStart and loopEnd. Between
  // waves it drops back behind a low-pass filter, and opens up again when the next wave comes in.
  var SONGS = {
    menu: { src: 'audio/menu.mp3', loopStart: 3.3674, loopEnd: 43.7774, vol: 0.5 },
    schiff: { src: 'audio/schiff.mp3', loopStart: 3.233, loopEnd: 34.557, vol: 0.34 },
    dimon: { src: 'audio/dimon.mp3', loopStart: 3.363, loopEnd: 53.319, vol: 0.45 },
    warren: { src: 'audio/warren.mp3', loopStart: 6.432, loopEnd: 57.632, vol: 0.42 },
    sbf: { src: 'audio/sbf.mp3', loopStart: 2.771, loopEnd: 49.083, vol: 0.45 },
    wick: { src: 'audio/wick.mp3', loopStart: 1.625, loopEnd: 40.02, vol: 0.31 },
    ending: { src: 'audio/ending.mp3', loopStart: 120.2, loopEnd: 172.84, vol: 0.5 }
  };
  var M = { want: null, name: null, src: null, gain: null, filter: null, bufs: {}, loading: {}, muffled: false };
  function loadSong(name) {
    if (M.bufs[name] || M.loading[name]) return M.loading[name] || Promise.resolve(M.bufs[name]);
    return (M.loading[name] = fetch(SONGS[name].src).then(function (r) { return r.arrayBuffer(); }).then(function (ab) {
      return new Promise(function (ok, no) { AC.decodeAudioData(ab, ok, no); });
    }).then(function (buf) { M.bufs[name] = buf; return buf; }).catch(function () { delete M.loading[name]; return null; }));
  }
  function stopSong(fade) {
    if (!M.src) return;
    var g = M.gain, src = M.src, t = AC.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0.0001, t + fade);
    try { src.stop(t + fade + 0.05); } catch (e) { /* already stopped */ }
    M.src = M.gain = M.filter = M.name = null;
  }
  // Play this song (or none), from its top or from the start of its loop. Asking again for the one that's playing does nothing.
  function music(name, fromLoop) {
    M.want = name;
    if (!AC || !soundOn) return;
    if (M.name === name) return;
    stopSong(0.6);
    if (!name) return;
    loadSong(name).then(function (buf) {
      if (!buf || M.want !== name || M.name === name || !soundOn) return;
      var m = SONGS[name], src = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain(), t = AC.currentTime;
      src.buffer = buf; src.loop = true; src.loopStart = m.loopStart; src.loopEnd = Math.min(m.loopEnd, buf.duration);
      f.type = 'lowpass'; f.frequency.value = M.muffled ? 600 : 20000; f.Q.value = 0.7;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(m.vol, t + 0.5);
      src.connect(f); f.connect(g); g.connect(AC.destination);
      src.start(t, fromLoop ? m.loopStart : 0);
      M.src = src; M.gain = g; M.filter = f; M.name = name;
    });
  }
  function muffle(on) {
    M.muffled = on;
    if (M.filter) { var t = AC.currentTime; M.filter.frequency.cancelScheduledValues(t); M.filter.frequency.setValueAtTime(M.filter.frequency.value, t); M.filter.frequency.exponentialRampToValueAtTime(on ? 600 : 20000, t + (on ? 1.2 : 0.35)); }
  }
  function duck(to, secs) { if (M.gain) { var t = AC.currentTime; M.gain.gain.cancelScheduledValues(t); M.gain.gain.setValueAtTime(M.gain.gain.value, t); M.gain.gain.linearRampToValueAtTime(to * SONGS[M.name].vol, t + secs); } }

  var lastShot = 0;
  var SFX = {
    stake: function () { tone(440, 0.09, { vol: 0.16 }); tone(660, 0.14, { at: 0.07, vol: 0.16 }); },
    upgrade: function () { tone(523, 0.08, { vol: 0.15 }); tone(659, 0.08, { at: 0.07, vol: 0.15 }); tone(880, 0.18, { at: 0.14, vol: 0.16 }); },
    retake: function () { tone(330, 0.1, { type: 'square', vol: 0.09 }); tone(660, 0.22, { at: 0.08, vol: 0.18 }); noise(0.2, 0.08, 2400); },
    taken: function () { tone(300, 0.4, { type: 'sawtooth', to: 70, vol: 0.14 }); noise(0.3, 0.14, 500); },
    chip: function () { tone(190, 0.08, { type: 'square', vol: 0.06 }); },
    home: function () { tone(110, 0.35, { type: 'sawtooth', to: 50, vol: 0.2 }); noise(0.25, 0.2, 300); },
    shot: function (lvl) { var n = performance.now(); if (n - lastShot < 55) return; lastShot = n; tone(1500 - lvl * 220 + Math.random() * 120, 0.05, { type: 'square', to: 500, vol: 0.022 }); },
    kill: function () { tone(880 + Math.random() * 200, 0.06, { vol: 0.045 }); },
    block: function () { tone(98, 0.16, { type: 'sine', vol: 0.16 }); tone(1320, 0.05, { at: 0.02, vol: 0.03 }); },
    wave: function () { tone(220, 0.14, { type: 'square', vol: 0.07 }); tone(220, 0.14, { type: 'square', at: 0.18, vol: 0.07 }); tone(330, 0.3, { type: 'square', at: 0.36, vol: 0.08 }); },
    boss: function () { for (var i = 0; i < 4; i++) { tone(160, 0.3, { type: 'sawtooth', to: 120, at: i * 0.36, vol: 0.16 }); } noise(1.2, 0.08, 200); },
    clear: function () { [523, 659, 784].forEach(function (f, i) { tone(f, 0.16, { at: i * 0.09, vol: 0.14 }); }); },
    halving: function () { tone(880, 0.5, { to: 220, vol: 0.14 }); tone(440, 0.5, { to: 110, vol: 0.1, type: 'square' }); },
    tape: function () { noise(0.35, 0.12, 3200); tone(240, 0.2, { type: 'square', vol: 0.06 }); },
    ready: function () { tone(660, 0.1, { vol: 0.12 }); tone(990, 0.2, { at: 0.09, vol: 0.12 }); },
    super: function () { tone(140, 0.9, { type: 'sawtooth', to: 1400, vol: 0.14 }); [523, 659, 784, 1047].forEach(function (f, i) { tone(f, 0.25, { at: 0.5 + i * 0.07, vol: 0.14 }); }); noise(0.8, 0.1, 1800); },
    poor: function () { tone(150, 0.1, { type: 'square', vol: 0.07 }); },
    won: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, 0.3, { at: i * 0.12, vol: 0.16 }); }); },
    lost: function () { [392, 330, 262, 196].forEach(function (f, i) { tone(f, 0.4, { type: 'sawtooth', at: i * 0.2, vol: 0.12 }); }); },
    bid: function () { tone(1320, 0.07, { vol: 0.12 }); tone(1760, 0.12, { at: 0.07, vol: 0.12 }); tone(1320, 0.07, { at: 0.2, vol: 0.1 }); },
    skim: function () { tone(520, 0.18, { to: 260, type: 'square', vol: 0.05 }); },
    fake: function () { tone(1900, 0.04, { type: 'square', vol: 0.03 }); },
    fog: function () { noise(1.2, 0.07, 350); },
    crash: function () { tone(520, 0.7, { type: 'sawtooth', to: 45, vol: 0.2 }); noise(0.5, 0.16, 260); },
    pump: function () { [392, 523, 659, 784].forEach(function (f, i) { tone(f, 0.12, { at: i * 0.05, vol: 0.11 }); }); },
    tap: function () { tone(700, 0.04, { vol: 0.08 }); }
  };
  function sfx(k, a) { if (S.mode === 'play' || k === 'tap') SFX[k](a); }
  el.snd.addEventListener('click', function () { soundOn = !soundOn; store('sound', soundOn ? '1' : '0'); unlock(); if (master) master.gain.value = soundOn ? 0.5 : 0; if (soundOn) { var w = M.want; M.want = null; music(w, true); } else if (AC) stopSong(0.2); sndIcon(); });
  sndIcon();

  // ---------- State ----------
  // mode: 'title' (a bot plays behind the logo), 'intro', 'play', 'end'.
  var S = { mode: 'title', G: null, speed: 1, fx: [], bolts: [], motes: [], shake: 0, flash: 0, pulseT: -9, banner: null, hover: null,
    line: null, wasReady: false, botT: 0, endT: 0, sweep: null, stage: C.STAGES[0], candles: [], crash: null, fogA: 0, fogZone: 0, view: { s: 1, ox: 0, oy: 0, w: 0, h: 0 }, vis: {}, t: 0 };
  function vis(id) { return S.vis[id] || (S.vis[id] = { aim: -Math.PI / 2, kick: 0, pop: 0, flash: 0, capT: 0, nope: 0 }); }
  var ALL = /[?&]all\b/.test(location.search);                     // ?all opens every stage, for testing
  function unlocked() { return ALL ? C.STAGES.length : Math.max(1, Math.min(C.STAGES.length, +store('unlocked') || 1)); }
  function newGame(mode, stage) {
    S.stage = stage || S.stage; paint(S.stage);
    S.candles = []; S.crash = null; S.fogA = 0;
    S.G = C.create({ stage: S.stage }); S.mode = mode;
    if (mode === 'play') { muffle(true); music(S.stage.boss); } else { muffle(false); music('menu'); }
    if (M.name && M.name === M.want) duck(1, 0.4);        // the same song carrying on: back to full after a result S.fx = []; S.bolts = []; S.vis = {}; S.banner = null; S.line = null; S.shake = 0; S.flash = 0; S.pulseT = -9; S.sweep = null; S.wasReady = false;
    S.G.block = 284301112;   // looks like a real slot number; only ever shown
    el.log.innerHTML = '';
    var st = S.stage, nm = st.names;
    el.left.innerHTML = '<h4>STAGE ' + st.stageNo + ' · ' + st.name.toUpperCase() + '</h4>' +
      '<p><b>Tap a node</b> to stake a validator. Tap again to upgrade. Every node you hold pays each block.</p>' +
      '<p><b>' + 'Their nodes</b> pay nothing and send rogues. Tap one to win it back.</p>' +
      st.tips.map(function (t) { return '<p class="tw">' + t + '</p>'; }).join('') +
      '<ul><li><i class="k-aide"></i>' + nm.aide + ': plain</li><li><i class="k-lob"></i>' + nm.lobbyist + ': fast</li><li><i class="k-sub"></i>' + nm.subpoena + ': heavy, hit for 3</li><li><i class="k-rog"></i>Rogues: from taken nodes</li></ul>';
    root.style.setProperty('--foe', st.color);
    var play = mode === 'play';
    el.hud.hidden = el.bar.hidden = el.left.hidden = el.right.hidden = !play;
    if (mode === 'title') { for (var i = 0; i < 6; i++) C.bot(S.G, 'active'); S.G.wait = 0.5; }
    layout();
  }

  // ---------- Layout: the board fits between the meters and the buttons ----------
  var DPR = 1, bg = null;
  function layout() {
    var w = window.innerWidth, h = window.innerHeight;
    DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR); cv.style.width = w + 'px'; cv.style.height = h + 'px';
    var top = S.mode === 'play' ? 64 : 10, bot = S.mode === 'play' ? 92 : 10;
    var s = Math.min(w / BW, (h - top - bot) / BH);
    S.view = { s: s, ox: (w - BW * s) / 2, oy: top + (h - top - bot - BH * s) / 2, w: w, h: h };
    root.style.setProperty('--board-w', Math.round(BW * s) + 'px');
    paintBg();
  }
  window.addEventListener('resize', layout);

  // The backdrop, painted once per size: night sky, a hex lattice, and the Capitol behind the gates.
  function paintBg() {
    var v = S.view; bg = document.createElement('canvas'); bg.width = cv.width; bg.height = cv.height;
    var b = bg.getContext('2d'); b.scale(DPR, DPR);
    var g = b.createRadialGradient(v.w / 2, v.oy + BH * v.s * 0.55, 20, v.w / 2, v.oy + BH * v.s * 0.55, Math.max(v.w, v.h) * 0.8);
    g.addColorStop(0, '#141033'); g.addColorStop(0.45, '#0a0818'); g.addColorStop(1, '#030208');
    b.fillStyle = g; b.fillRect(0, 0, v.w, v.h);
    // hex lattice
    var r = 26 * Math.max(0.7, v.s), hx = r * Math.sqrt(3), row = 0;
    b.strokeStyle = 'rgba(140,110,255,0.055)'; b.lineWidth = 1;
    for (var y = -r; y < v.h + r; y += r * 1.5, row++) for (var x = (row % 2 ? hx / 2 : 0) - hx; x < v.w + hx; x += hx) {
      b.beginPath(); for (var i = 0; i < 6; i++) { var a = Math.PI / 6 + i * Math.PI / 3; b.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); } b.closePath(); b.stroke();
    }
    // what stands behind the gates, in board units, squashed to sit under the meters
    b.save(); b.translate(v.ox, v.oy); b.scale(v.s, v.s); b.translate(0, 30); b.scale(1, 0.8);
    var cg = b.createLinearGradient(0, -40, 0, 150); cg.addColorStop(0, 'rgba(' + FRGB + ',0.20)'); cg.addColorStop(1, 'rgba(' + FRGB + ',0.02)');
    var line = 'rgba(' + FRGB + ',0.36)', faint = 'rgba(' + FRGB + ',0.17)', gx = S.G ? S.G.GATES.map(function (k) { return S.G.N[k].x; }) : [];
    function nearGate(x, d) { return gx.some(function (q) { return Math.abs(q - x) < d; }); }
    b.fillStyle = cg; b.strokeStyle = line; b.lineWidth = 1.5;
    var sid = S.stage.id, c, k;
    if (sid === 'hearing') {                    // the Capitol
      b.beginPath();
      b.moveTo(20, 150); b.lineTo(20, 62); b.lineTo(236, 62); b.lineTo(236, 40); b.lineTo(290, 40); b.lineTo(290, 20);
      b.bezierCurveTo(290, -42, 430, -42, 430, 20); b.lineTo(430, 40); b.lineTo(484, 40); b.lineTo(484, 62); b.lineTo(700, 62); b.lineTo(700, 150);
      b.closePath(); b.fill(); b.stroke();
      b.strokeStyle = faint;
      for (c = 40; c <= 680; c += 22) { if (nearGate(c, 34)) continue; b.beginPath(); b.moveTo(c, 70); b.lineTo(c, 146); b.stroke(); }
      b.beginPath(); b.moveTo(360, -27); b.lineTo(360, -40); b.stroke();
      for (k = 0; k < 3; k++) { b.beginPath(); b.moveTo(300 + k * 3, 14 - k * 12); b.lineTo(420 - k * 3, 14 - k * 12); b.stroke(); }
    } else if (sid === 'bank') {                // a bank: pediment, columns, steps
      b.beginPath(); b.moveTo(20, 150); b.lineTo(20, 84); b.lineTo(130, 84); b.lineTo(130, 62); b.lineTo(360, -30); b.lineTo(590, 62); b.lineTo(590, 84); b.lineTo(700, 84); b.lineTo(700, 150); b.closePath(); b.fill(); b.stroke();
      b.beginPath(); b.moveTo(130, 62); b.lineTo(590, 62); b.moveTo(130, 78); b.lineTo(590, 78); b.stroke();
      b.strokeStyle = faint; b.lineWidth = 7;
      for (c = 156; c <= 566; c += 41) { if (nearGate(c, 30)) continue; b.beginPath(); b.moveTo(c, 84); b.lineTo(c, 146); b.stroke(); }
      b.lineWidth = 1.5;
      for (c = 40; c <= 110; c += 24) { [c, 720 - c].forEach(function (x) { if (!nearGate(x, 26)) b.strokeRect(x - 7, 98, 14, 22); }); }
      b.beginPath(); b.arc(360, 30, 15, 0, 6.3); b.stroke(); b.font = '700 20px "Chakra Petch", sans-serif'; b.textAlign = 'center'; b.textBaseline = 'middle'; b.fillStyle = faint; b.fillText('$', 360, 31);
    } else if (sid === 'vault') {               // a vault door between stacks of bars
      b.beginPath(); b.rect(20, 40, 680, 110); b.fill(); b.stroke();
      b.beginPath(); b.arc(360, 78, 62, 0, 6.3); b.stroke(); b.beginPath(); b.arc(360, 78, 50, 0, 6.3); b.stroke(); b.beginPath(); b.arc(360, 78, 12, 0, 6.3); b.stroke();
      for (k = 0; k < 8; k++) { var an = k * Math.PI / 4; b.beginPath(); b.moveTo(360 + Math.cos(an) * 12, 78 + Math.sin(an) * 12); b.lineTo(360 + Math.cos(an) * 50, 78 + Math.sin(an) * 50); b.stroke(); }
      b.strokeStyle = faint;
      for (k = 0; k < 4; k++) for (c = 0; c < 5 - k; c++) { [44 + c * 40 + k * 20, 720 - 44 - 36 - c * 40 - k * 20].forEach(function (x) { if (!nearGate(x + 18, 30) || k > 1) b.strokeRect(x, 130 - k * 17, 36, 15); }); }
    } else if (sid === 'yard') {                // a fence, wire and two towers
      b.beginPath(); b.rect(20, 52, 680, 98); b.fill();
      b.save(); b.beginPath(); b.rect(20, 52, 680, 98); b.clip(); b.strokeStyle = faint; b.lineWidth = 1;
      for (c = -120; c < 720; c += 16) { b.beginPath(); b.moveTo(c, 150); b.lineTo(c + 98, 52); b.moveTo(c + 98, 150); b.lineTo(c, 52); b.stroke(); }
      b.restore();
      b.strokeStyle = line; b.lineWidth = 1.5; b.beginPath(); b.moveTo(20, 52); b.lineTo(700, 52); b.stroke();
      b.beginPath(); for (c = 20; c <= 700; c += 6) b.lineTo(c, 44 + Math.sin(c * 0.5) * 4); b.stroke();
      for (c = 20; c <= 700; c += 68) { b.beginPath(); b.moveTo(c, 40); b.lineTo(c, 150); b.stroke(); }
      [150, 570].forEach(function (x) { b.fillStyle = cg; b.beginPath(); b.rect(x - 18, -6, 36, 30); b.fill(); b.stroke(); b.beginPath(); b.moveTo(x - 24, -6); b.lineTo(x, -24); b.lineTo(x + 24, -6); b.closePath(); b.stroke(); b.beginPath(); b.moveTo(x - 10, 24); b.lineTo(x - 14, 52); b.moveTo(x + 10, 24); b.lineTo(x + 14, 52); b.stroke(); });
    } else {                                    // the chart: just the frame; the candles are drawn live
      b.beginPath(); b.rect(20, -20, 680, 170); b.fill(); b.stroke();
      b.strokeStyle = faint; for (k = 1; k < 4; k++) { b.beginPath(); b.moveTo(20, -20 + k * 42.5); b.lineTo(700, -20 + k * 42.5); b.stroke(); }
    }
    b.restore();
    // vignette
    var vg = b.createRadialGradient(v.w / 2, v.h / 2, Math.min(v.w, v.h) * 0.35, v.w / 2, v.h / 2, Math.max(v.w, v.h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    b.fillStyle = vg; b.fillRect(0, 0, v.w, v.h);
  }

  // Soft light, drawn additively from a cached sprite (much cheaper than canvas shadows).
  var glows = {};
  function glow(x, y, r, col, a) {
    var s = glows[col];
    if (!s) {
      s = glows[col] = document.createElement('canvas'); s.width = s.height = 128;
      var g = s.getContext('2d'), rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      rg.addColorStop(0, col); rg.addColorStop(0.25, col); rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalAlpha = 0.9; g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
      // fade the whole sprite toward transparent at the rim
      g.globalCompositeOperation = 'destination-in'; var m = g.createRadialGradient(64, 64, 0, 64, 64, 64); m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = m; g.fillRect(0, 0, 128, 128);
    }
    if (a <= 0) return;
    cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = Math.min(1, a);
    cx.drawImage(s, x - r, y - r, r * 2, r * 2);
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
  }
  function hex(x, y, r, rot) { cx.beginPath(); for (var i = 0; i < 6; i++) { var a = (rot || 0) + Math.PI / 6 + i * Math.PI / 3; cx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); } cx.closePath(); }

  // ---------- Effects ----------
  function text(t, x, y, col, size, life) { S.fx.push({ k: 'text', text: t, x: x, y: y, col: col || '#fff', size: size || 18, t: 0, life: life || 1.2 }); }
  function ring(x, y, col, r1, life, w) { S.fx.push({ k: 'ring', x: x, y: y, col: col, r: r1 || 70, t: 0, life: life || 0.5, w: w || 3 }); }
  function sparks(x, y, col, n, sp, toHome) {
    if (reduce) n = Math.ceil(n / 3);
    for (var i = 0; i < n; i++) { var a = Math.random() * 6.283, v = (0.3 + Math.random()) * (sp || 200); S.fx.push({ k: 'spark', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col: col, t: 0, life: 0.35 + Math.random() * 0.45, home: toHome, sz: 2 + Math.random() * 2.5 }); }
  }
  function banner(t, sub, col) { S.banner = { text: t, sub: sub || '', col: col || '#fff', t: 0 }; }
  function shake(a) { if (!reduce) S.shake = Math.max(S.shake, a); }
  function log(t, cls) {
    var li = document.createElement('li'); li.textContent = t; if (cls) li.className = cls;
    el.log.insertBefore(li, el.log.firstChild);
    while (el.log.children.length > 12) el.log.removeChild(el.log.lastChild);
  }
  function label(id) { return 'Node ' + id.toUpperCase(); }

  function handle(ev) {
    var G = S.G, N = G.N, n = ev.id && N[ev.id], v = ev.id && N[ev.id] ? vis(ev.id) : null, play = S.mode === 'play';
    switch (ev.e) {
      case 'stake': v.pop = 1; ring(n.x, n.y, TEAL, 60, 0.45); text('STAKED', n.x, n.y - 36, TEAL, 15); sfx('stake'); break;
      case 'upgrade': v.pop = 1; ring(n.x, n.y, TEAL, 80, 0.5); sparks(n.x, n.y, TEAL, 10, 160); text('LEVEL ' + ev.lvl, n.x, n.y - 36, TEAL, 16); sfx('upgrade'); break;
      case 'retake': v.pop = 1; ring(n.x, n.y, TEAL, 130, 0.6, 5); ring(n.x, n.y, '#fff', 70, 0.35); sparks(n.x, n.y, TEAL, 22, 260); text('RETAKEN', n.x, n.y - 38, TEAL, 19); sfx('retake'); if (play) log(label(ev.id) + ' retaken', 'good'); break;
      case 'taken': v.capT = 1; ring(n.x, n.y, RED, 120, 0.6, 5); sparks(n.x, n.y, RED, 20, 240); shake(7); text(ev.how === 'slashed' ? 'SLASHED' : ev.how === 'bought' ? 'BOUGHT OUT' : 'TAKEN', n.x, n.y - 38, RED, 19); sfx('taken'); if (play) log(label(ev.id) + (ev.how === 'slashed' ? ' slashed' : ev.how === 'bought' ? ' bought out' : ' taken'), 'bad'); break;
      case 'repair': v.pop = 1; ring(n.x, n.y, TEAL, 60, 0.45); text('RESTAKED', n.x, n.y - 36, TEAL, 15); sfx('stake'); break;
      case 'bid': v.flash = 1; ring(n.x, n.y, GOLD, 70, 0.5); text('BID! COUNTER ' + ev.cost, n.x, n.y - 40, GOLD, 15, 1.4); sfx('bid'); if (play) log(S.stage.short + ' bids for ' + label(ev.id), 'warn'); break;
      case 'counter': ring(n.x, n.y, GOLD, 60, 0.4); sparks(n.x, n.y, GOLD, 10, 160); text('OFFER BEATEN', n.x, n.y - 38, TEAL, 15); sfx('stake'); break;
      case 'skim': text('-' + ev.n + ' COMMINGLED', N[G.HOME].x, N[G.HOME].y - 84, RED, 15, 1.3); sfx('skim'); if (play) log(S.stage.short + ' spent ' + ev.n + ' of your tokens', 'bad'); break;
      case 'fake': sparks(ev.x, ev.y, '#ffffff', 4, 90); text('FAKE', ev.x, ev.y - 12, 'rgba(255,255,255,0.7)', 11, 0.6); sfx('fake'); break;
      case 'withdraw': ring(ev.x, ev.y, RED, 90, 0.5, 4); text('-' + ev.n + ' OF YOUR TOKENS', ev.x, ev.y + 62, RED, 15, 1.3); sfx('skim'); if (play) log(S.stage.short + ' withdrew ' + ev.n + ' to patch himself up', 'bad'); break;
      case 'rush': ring(ev.x, ev.y, RED, 80, 0.5, 4); text('GOLD RUSH', ev.x, ev.y + 62, RED, 15, 1.1); break;
      case 'fog': if (ev.on) { S.fogZone = ev.zone; sfx('fog'); if (play) log('FUD fog rolls in', 'warn'); } break;
      case 'liq': ring(n.x, n.y, RED, 90, 0.5, 4); sparks(n.x, n.y, RED, 14, 200); text('LIQUIDATED', n.x, n.y - 38, RED, 16); if (play) log(label(ev.id) + ' liquidated', 'bad'); break;
      case 'wick': v.flash = 1; S.fx.push({ k: 'tape', x: ev.x, y: ev.y, id: ev.id, t: 0, life: 0.55 }); text('SCAM WICK', n.x, n.y - 40, RED, 17); sfx('tape'); break;
      case 'candle':
        S.candles.push({ pct: ev.pct, price: ev.price }); if (S.candles.length > 40) S.candles.shift();
        if (ev.crash) { S.crash = { t: 0, up: false }; shake(ev.pct <= -20 ? 16 : 8); S.flash = 0.8; banner(ev.pct + '% WEEK', ev.pct <= -20 ? 'LIQUIDATION CASCADE' : 'EVERY VALIDATOR LOSES STAKE', RED); sfx('crash'); if (play) log('BTC ' + ev.pct + '% this week: stake lost', 'bad'); }
        else if (ev.pump) { S.crash = { t: 0, up: true }; text('+' + ev.pct + '% WEEK · DOUBLE PAY', BW / 2, 190, TEAL, 20, 1.6); sfx('pump'); if (play) log('BTC +' + ev.pct + '% this week: double pay', 'good'); }
        break;
      case 'chip': v.flash = 1; sparks(n.x, n.y, '#ff9fb0', 5, 120); text('-' + ev.pow, n.x + 22, n.y - 24, '#ff9fb0', 14, 0.8); sfx('chip'); break;
      case 'home': vis(G.HOME).flash = 1; shake(12); S.flash = 1; text('-' + ev.dmg, N[G.HOME].x, N[G.HOME].y - 66, RED, 24); sparks(N[G.HOME].x, N[G.HOME].y, RED, 18, 280); sfx('home'); if (play) log('Home node hit for ' + ev.dmg, 'bad'); break;
      case 'shot':
        var L = n, vv = vis(ev.id); vv.aim = Math.atan2(ev.y - L.y, ev.x - L.x); vv.kick = 1;
        S.bolts.push({ x1: L.x + Math.cos(vv.aim) * 20, y1: L.y + Math.sin(vv.aim) * 20, x2: ev.x, y2: ev.y, t: 0, lvl: ev.lvl });
        for (var i = 0; i < G.foes.length; i++) if (G.foes[i].id === ev.foe) G.foes[i]._hit = 0.1;
        sfx('shot', ev.lvl); break;
      case 'kill':
        var col = ev.how === 'convert' ? TEAL : FOE_COL[ev.type];
        if (ev.type === 'boss') { sparks(ev.x, ev.y, RED, 70, 420); sparks(ev.x, ev.y, '#fff', 30, 300); ring(ev.x, ev.y, RED, 260, 0.9, 8); ring(ev.x, ev.y, '#fff', 160, 0.6, 4); shake(16); banner(S.stage.short.toUpperCase() + ' IS OUT', 'FINISH THE WAVE', TEAL); if (play) log(S.stage.short + ' is out', 'good'); }
        else { sparks(ev.x, ev.y, col, ev.how === 'convert' ? 9 : 7, 190, ev.how === 'convert'); ring(ev.x, ev.y, col, 26, 0.3, 2); }
        text('+' + ev.pay, ev.x, ev.y - 14, GOLD, ev.type === 'boss' ? 24 : 13, 0.8); sfx('kill'); break;
      case 'bosshit': ring(ev.x, ev.y, TEAL, 120, 0.5, 5); text('-20%', ev.x, ev.y - 60, TEAL, 24); break;
      case 'block':
        S.pulseT = S.t; G.block++; text('+' + ev.pay, N[G.HOME].x, N[G.HOME].y + 66, GOLD, 15, 1); sfx('block');
        if (play) log('Block ' + G.block.toLocaleString('en-US') + ' · +' + ev.pay); break;
      case 'wave':
        if (ev.boss) { banner(S.stage.bossName, { fog: 'GOLD BARS POUR OUT AHEAD OF HIM', bid: 'THE BIDS COME TWICE AS FAST', tape: 'SHE WALKS THE NETWORK HERSELF', commingle: 'HE HEALS WITH YOUR TOKENS', candles: 'THE MARKET ITSELF' }[S.stage.mech], RED); shake(10); S.flash = 0.7; sfx('boss'); }
        else { banner('WAVE ' + ev.n, 'INCOMING FROM ' + S.stage.name.toUpperCase(), '#fff'); sfx('wave'); }
        if (play) { muffle(false); log('Wave ' + ev.n + ' incoming', 'warn'); } break;
      case 'clear':
        if (ev.halving) { banner('HALVING', 'BLOCK REWARDS CUT IN HALF', GOLD); sfx('halving'); if (play) log('Halving: rewards cut in half', 'warn'); }
        else { banner('WAVE ' + ev.n + ' CLEAR', '+' + ev.bonus + ' TOKENS', TEAL); sfx('clear'); }
        if (play) muffle(true);
        break;
      case 'early': text('+' + ev.bonus + ' EARLY', N[G.HOME].x, N[G.HOME].y - 70, GOLD, 17); break;
      case 'tape': v.flash = 1; S.fx.push({ k: 'tape', x: ev.x, y: ev.y, id: ev.id, t: 0, life: 0.55 }); text('RED TAPE', n.x, n.y - 40, RED, 17); sfx('tape'); if (play) log(label(ev.id) + ' tied up in red tape', 'bad'); break;
      case 'line': S.line = { text: ev.text, t: 2.8 }; break;
      case 'poor': v.nope = 1; text('NEED ' + ev.cost, n.x, n.y - 36, '#ff9fb0', 15, 0.8); sfx('poor'); break;
      case 'super':
        S.sweep = { t: 0 }; shake(8); sfx('super');
        el.cutSub.textContent = ev.n === 1 ? '1 HATER CONVERTED' : ev.n + ' HATERS CONVERTED';
        el.cut.hidden = false; el.cut.classList.remove('go'); void el.cut.offsetWidth; el.cut.classList.add('go');
        setTimeout(function () { el.cut.hidden = true; }, 1600);
        if (play) log('Super: ' + ev.n + ' converted', 'good'); break;
      case 'won': case 'lost': S.endT = ev.e === 'won' ? 1.6 : 1.3; S.endWhy = ev.why; if (play) { sfx(ev.e); if (ev.e === 'lost') { shake(14); S.flash = 1; muffle(true); duck(0.35, 1); } else { muffle(false); duck(0.6, 0.8); } } break;
    }
  }

  // ---------- Input ----------
  function boardPt(e) { var r = cv.getBoundingClientRect(), v = S.view; return { x: (e.clientX - r.left - v.ox) / v.s, y: (e.clientY - r.top - v.oy) / v.s }; }
  function nodeAt(p) {
    var best = null, bd = Math.max(40, 30 / S.view.s), G = S.G;
    G.PLAY.forEach(function (k) { if (k === G.HOME) return; var d = Math.hypot(G.N[k].x - p.x, G.N[k].y - p.y); if (d < bd) { bd = d; best = k; } });
    return best;
  }
  cv.addEventListener('pointerdown', function (e) {
    unlock();
    if (S.mode !== 'play' || S.G.state !== 'play') return;
    var id = nodeAt(boardPt(e)); if (!id) return;
    var r = S.G.act(id);
    if (r === 'max') { text('MAX LEVEL', S.G.N[id].x, S.G.N[id].y - 36, '#fff', 14, 0.7); vis(id).nope = 1; }
  });
  cv.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse') S.hover = S.mode === 'play' ? nodeAt(boardPt(e)) : null; });
  cv.addEventListener('pointerleave', function () { S.hover = null; });
  el.sup.addEventListener('click', function () { unlock(); if (S.mode === 'play') S.G.super(); });
  el.next.addEventListener('click', function () { unlock(); if (S.mode === 'play') S.G.callWave(); });
  el.speed.addEventListener('click', function () { S.speed = S.speed === 1 ? 2 : 1; el.speed.textContent = S.speed + 'x'; el.speed.classList.toggle('on', S.speed === 2); });
  window.addEventListener('keydown', function (e) {
    if (S.mode !== 'play') return;
    if (e.code === 'Space') { e.preventDefault(); S.G.super(); }
    else if (e.code === 'Enter') S.G.callWave();
  });

  // ---------- Cards ----------
  function card(html, cls) { ov.className = 'a51-ov ' + (cls || ''); ov.innerHTML = html; ov.hidden = false; }
  function showTitle() {
    var un = unlocked();
    newGame('title', C.STAGES[un - 1]);
    card('<div class="a51-logo"><span>51%</span><span class="a51-logo-b">ATTACK</span></div>' +
      '<p class="a51-tag">Defend your chain. Every node you hold pays you. Every node they take turns on you.</p>' +
      '<button class="a51-btn" id="a51-play" type="button">PLAY<small>Story · five bosses</small></button>' +
      '<p class="a51-best">' + (un > 1 || store('best.vault') ? 'Stage ' + un + ' of ' + C.STAGES.length + ' unlocked' : 'Lose 51% of the network and the chain is theirs.') + '</p>' +
      '<a class="a51-link" href="./">More games at Proof of Fight</a>', 'title');
    $('#a51-play').addEventListener('click', function () { unlock(); SFX.tap(); showStages(); });
  }
  // The ladder: five bosses, one unlocked at a time.
  function showStages() {
    var un = unlocked();
    if (S.mode !== 'title') newGame('title', C.STAGES[un - 1]);
    card('<h2 class="sm">THE STORY</h2>' +
      '<div class="a51-ladder">' + C.STAGES.map(function (st, k) {
        var open = k < un, best = store('best.' + st.id);
        return '<button class="a51-rung' + (open ? '' : ' locked') + (best ? ' done' : '') + '" type="button" data-k="' + k + '" style="--foe:' + st.color + '"' + (open ? '' : ' disabled') + '>' +
          '<img src="art/' + st.boss + '-head.webp" alt="">' +
          '<span><b>' + st.stageNo + ' · ' + st.name.toUpperCase() + '</b><small>' + (open ? st.short + ': ' + st.twist.charAt(0).toLowerCase() + st.twist.slice(1) : 'Beat ' + C.STAGES[k - 1].short + ' to unlock') + '</small></span>' +
          '<em>' + (best ? best + '%' : open ? 'PLAY' : 'LOCKED') + '</em></button>';
      }).join('') + '</div>' +
      '<button class="a51-btn ghost" id="a51-home" type="button">BACK</button>', 'stages');
    Array.prototype.forEach.call(ov.querySelectorAll('.a51-rung'), function (b) {
      b.addEventListener('click', function () { unlock(); SFX.tap(); showIntro(C.STAGES[+b.getAttribute('data-k')]); });
    });
    $('#a51-home').addEventListener('click', function () { SFX.tap(); showTitle(); });
  }
  function showIntro(st) {
    if (S.stage !== st || S.mode !== 'title') newGame('title', st);
    var first = !store('best.vault') && st.stageNo === 1;
    card('<div class="a51-vs"><img src="art/toly-head.webp" alt="Toly"><b>VS</b><img class="foe" src="art/' + st.boss + '-head.webp" alt="' + st.short + '"></div>' +
      '<h2>' + st.name.toUpperCase() + '</h2>' +
      '<p class="a51-say">Toly: “' + st.scene.you + '”</p>' +
      '<p class="a51-say foe">' + st.short + ': “' + st.scene.boss + '”</p>' +
      '<ul class="a51-how">' + (first ? '<li><b>Tap a node</b> to stake a validator. Tap again to upgrade.</li><li><b>Their nodes</b> pay nothing. Tap one to win it back.</li>' : '') +
        st.tips.slice(0, first ? 1 : 3).map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
      '<button class="a51-btn" id="a51-go" type="button">START THE CHAIN</button>' +
      '<button class="a51-btn ghost" id="a51-stages" type="button">ALL STAGES</button>', 'intro');
    ov.style.setProperty('--foe', st.color);
    $('#a51-go').addEventListener('click', function () { unlock(); SFX.tap(); ov.hidden = true; newGame('play', st); });
    $('#a51-stages').addEventListener('click', function () { SFX.tap(); showStages(); });
  }
  function showEnd() {
    var G = S.G, st = S.stage, win = G.state === 'won', pct = G.consensus(), mins = Math.floor(G.t / 60), secs = Math.floor(G.t % 60);
    S.mode = 'end'; el.cut.hidden = true;
    if (G.state === 'won' && !C.STAGES[S.stage.stageNo]) { muffle(false); music('ending', true); }
    var best = +store('best.' + st.id) || 0, isBest = win && pct > best, next = C.STAGES[st.stageNo], last = !next;
    if (isBest) store('best.' + st.id, String(pct));
    if (win && next && unlocked() < st.stageNo + 1) store('unlocked', String(st.stageNo + 1));
    var share = win ? 'I held ' + pct + '% consensus against ' + st.short + ' in 51% Attack. proofoffight.com/51'
      : st.short + ' took my chain on wave ' + G.wave + ' of ' + G.waves + ' in 51% Attack. proofoffight.com/51';
    card((win
      ? '<div class="a51-vs"><img src="art/toly-head.webp" alt="Toly"></div><h2 class="win">' + (last ? 'CHAIN SECURED' : 'BLOCK FINALIZED') + '</h2><div class="a51-big">' + pct + '%<small>consensus held' + (isBest ? ' · new best' : '') + (last ? ' · all five bosses down' : '') + '</small></div>'
      : '<div class="a51-vs"><img class="foe" src="art/' + st.boss + '-head.webp" alt="' + st.short + '"></div><h2 class="lose">' + (S.endWhy === 'home' ? 'HOME NODE DOWN' : '51% ATTACK') + '</h2><div class="a51-big lose">WAVE ' + G.wave + '/' + G.waves + '<small>' + (S.endWhy === 'home' ? 'they reached your home node' : 'they own the majority of your chain') + '</small></div>') +
      '<div class="a51-stats"><span><b>' + G.kills + '</b>stopped</span><span><b>' + G.lost + '</b>nodes lost</span><span><b>' + G.retaken + '</b>won back</span><span><b>' + mins + ':' + (secs < 10 ? '0' : '') + secs + '</b>time</span></div>' +
      (win && next ? '<button class="a51-btn" id="a51-nextst" type="button">NEXT: ' + next.short.toUpperCase() + '<small>Stage ' + next.stageNo + ' · ' + next.name + '</small></button>' : '') +
      '<button class="a51-btn' + (win && next ? ' ghost' : '') + '" id="a51-again" type="button">' + (win ? 'PLAY AGAIN' : 'TRY AGAIN') + '</button>' +
      '<button class="a51-btn ghost" id="a51-share" type="button">COPY RESULT</button>' +
      '<button class="a51-btn ghost" id="a51-stages" type="button">ALL STAGES</button>', 'end');
    ov.style.setProperty('--foe', st.color);
    if (win && next) $('#a51-nextst').addEventListener('click', function () { SFX.tap(); showIntro(next); });
    $('#a51-again').addEventListener('click', function () { SFX.tap(); ov.hidden = true; newGame('play', st); });
    $('#a51-stages').addEventListener('click', function () { SFX.tap(); showStages(); });
    $('#a51-share').addEventListener('click', function () {
      var b = this;
      function done() { b.textContent = 'COPIED'; setTimeout(function () { b.textContent = 'COPY RESULT'; }, 1600); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(share).then(done, function () { b.textContent = share; });
      else b.textContent = share;
    });
  }

  // ---------- Update ----------
  function step(dt) {
    var G = S.G;
    S.t += dt;
    if (G.state === 'play') {
      if (S.mode === 'title') { S.botT += dt; if (S.botT > 0.5) { S.botT = 0; C.bot(G, 'active'); } }
      G.update(dt);
    }
    var evs = G.events.splice(0, G.events.length);
    for (var i = 0; i < evs.length; i++) handle(evs[i]);
    // effects
    var home = G.N[G.HOME];
    S.fx = S.fx.filter(function (f) {
      f.t += dt;
      if (f.k === 'spark') {
        if (f.home && f.t > 0.18) { f.vx += (home.x - f.x) * 14 * dt; f.vy += (home.y - f.y) * 14 * dt; f.life = Math.max(f.life, 0.9); }
        f.x += f.vx * dt; f.y += f.vy * dt; f.vx *= 0.94; f.vy *= 0.94;
      }
      return f.t < f.life;
    });
    S.bolts = S.bolts.filter(function (b) { b.t += dt; return b.t < 0.16; });
    Object.keys(S.vis).forEach(function (k) { var v = S.vis[k]; v.kick = Math.max(0, v.kick - dt * 9); v.pop = Math.max(0, v.pop - dt * 3); v.flash = Math.max(0, v.flash - dt * 3); v.capT = Math.max(0, v.capT - dt * 1.6); v.nope = Math.max(0, v.nope - dt * 4); });
    S.shake = Math.max(0, S.shake - dt * 30); S.flash = Math.max(0, S.flash - dt * 2.2);
    if (S.banner) { S.banner.t += dt; if (S.banner.t > 2.3) S.banner = null; }
    if (S.line) { S.line.t -= dt; if (S.line.t <= 0) S.line = null; }
    if (S.sweep) { S.sweep.t += dt; if (S.sweep.t > 0.9) S.sweep = null; }
    if (S.crash) { S.crash.t += dt; if (S.crash.t > 0.7) S.crash = null; }
    S.fogA += ((G.fog.on ? 1 : 0) - S.fogA) * Math.min(1, dt * 2.5);
    if (G.state !== 'play' && S.endT > 0) {
      S.endT -= dt;
      if (S.endT <= 0) { if (S.mode === 'play') showEnd(); else if (S.mode === 'title') newGame('title', S.stage); }
    }
  }

  // ---------- Draw ----------
  function pulse(n) { var d = S.t - S.pulseT - n.depth * 0.085; return d > 0 && d < 0.4 ? 1 - d / 0.4 : 0; }
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 997; return h / 997; }

  function draw() {
    var v = S.view, G = S.G, N = G.N, t = S.t;
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    cx.drawImage(bg, 0, 0, v.w, v.h);
    // drifting motes across the whole screen
    if (!S.motes.length) for (var m = 0; m < 46; m++) S.motes.push({ x: Math.random(), y: Math.random(), s: 0.004 + Math.random() * 0.012, r: 0.6 + Math.random() * 1.6, p: Math.random() * 6 });
    cx.fillStyle = '#b9a8ff';
    S.motes.forEach(function (q) { var y = ((q.y - t * q.s) % 1 + 1) % 1; cx.globalAlpha = 0.10 + 0.14 * Math.sin(t * 0.8 + q.p) * Math.sin(t * 0.8 + q.p); cx.fillRect(q.x * v.w + Math.sin(t * 0.3 + q.p) * 12, y * v.h, q.r, q.r); });
    cx.globalAlpha = 1;

    var sh = S.shake, sx = sh ? (Math.random() - 0.5) * sh : 0, sy = sh ? (Math.random() - 0.5) * sh : 0;
    cx.setTransform(DPR * v.s, 0, 0, DPR * v.s, DPR * (v.ox + sx), DPR * (v.oy + sy));
    cx.lineCap = 'round'; cx.lineJoin = 'round';

    if (S.stage.candles) drawChart();

    // ----- edges -----
    G.EDGES.forEach(function (p) {
      var a = N[p[0]], b = N[p[1]];
      if (a.depth > b.depth) { var sw = a; a = b; b = sw; }          // a is nearer home
      var gate = a.kind === 'gate' || b.kind === 'gate', bad = gate || a.cap || b.cap, both = gate || (a.cap && b.cap);
      var pu = Math.max(pulse(a), pulse(b));
      cx.strokeStyle = '#0d0b1c'; cx.lineWidth = 7; cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke();
      if (bad) {
        cx.strokeStyle = both ? 'rgba(' + FRGB + ',0.75)' : 'rgba(' + FRGB + ',0.38)'; cx.lineWidth = 2.2;
        cx.setLineDash([3, 9]); cx.lineDashOffset = (t * 26) % 12;      // creeping toward home (b is the far end)
        cx.beginPath(); cx.moveTo(b.x, b.y); cx.lineTo(a.x, a.y); cx.stroke(); cx.setLineDash([]);
      } else {
        var g = cx.createLinearGradient(a.x, a.y, b.x, b.y); g.addColorStop(0, 'rgba(25,230,176,' + (0.5 + pu * 0.5) + ')'); g.addColorStop(1, 'rgba(155,92,255,' + (0.5 + pu * 0.5) + ')');
        cx.strokeStyle = g; cx.lineWidth = 2 + pu * 2.5; cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke();
        // a packet of data, running out from home
        var u = (t * 0.33 + hash(p[0] + p[1])) % 1, px = a.x + (b.x - a.x) * u, py = a.y + (b.y - a.y) * u;
        glow(px, py, 9 + pu * 8, '#9ffbe3', 0.55 + pu * 0.45);
        cx.fillStyle = '#eafff9'; cx.fillRect(px - 1.3, py - 1.3, 2.6, 2.6);
      }
    });

    // ----- range of the node under the mouse -----
    if (S.hover && N[S.hover].lvl && !N[S.hover].cap) {
      var hn = N[S.hover], hr = C.LVL[hn.lvl].r;
      cx.beginPath(); cx.arc(hn.x, hn.y, hr, 0, 6.3); cx.fillStyle = 'rgba(25,230,176,0.05)'; cx.fill();
      cx.setLineDash([6, 8]); cx.lineDashOffset = -t * 20; cx.strokeStyle = 'rgba(25,230,176,0.5)'; cx.lineWidth = 1.5; cx.stroke(); cx.setLineDash([]);
    }

    // ----- gates: the hearing room doors -----
    G.GATES.forEach(function (k) {
      var n = N[k], th = 0.6 + 0.4 * Math.sin(t * 3 + n.x);
      glow(n.x, n.y, 62, RED, 0.35 + 0.25 * th);
      cx.fillStyle = DARK; cx.strokeStyle = RED; cx.lineWidth = 2.5;
      cx.beginPath(); cx.moveTo(n.x - 22, n.y + 22); cx.lineTo(n.x - 22, n.y - 6); cx.arc(n.x, n.y - 6, 22, Math.PI, 0); cx.lineTo(n.x + 22, n.y + 22); cx.closePath(); cx.fill(); cx.stroke();
      var dg = cx.createLinearGradient(0, n.y - 26, 0, n.y + 22); dg.addColorStop(0, 'rgba(' + FRGB + ',' + (0.75 * th) + ')'); dg.addColorStop(1, 'rgba(' + FRGB + ',0.05)');
      cx.fillStyle = dg; cx.beginPath(); cx.moveTo(n.x - 14, n.y + 22); cx.lineTo(n.x - 14, n.y - 5); cx.arc(n.x, n.y - 5, 14, Math.PI, 0); cx.lineTo(n.x + 14, n.y + 22); cx.closePath(); cx.fill();
    });

    // ----- nodes -----
    G.PLAY.forEach(function (k) { if (k !== G.HOME) drawNode(N[k], vis(k)); });
    drawHome(N[G.HOME], vis(G.HOME));

    // ----- bolts -----
    S.bolts.forEach(function (b) {
      var u = Math.min(1, b.t / 0.07), x = b.x1 + (b.x2 - b.x1) * u, y = b.y1 + (b.y2 - b.y1) * u, a = 1 - b.t / 0.16;
      var tail = Math.max(0, u - 0.45), tx = b.x1 + (b.x2 - b.x1) * tail, ty = b.y1 + (b.y2 - b.y1) * tail;
      cx.globalCompositeOperation = 'lighter';
      cx.strokeStyle = 'rgba(25,230,176,' + a * 0.5 + ')'; cx.lineWidth = 3 + b.lvl * 1.5; cx.beginPath(); cx.moveTo(tx, ty); cx.lineTo(x, y); cx.stroke();
      cx.strokeStyle = 'rgba(235,255,250,' + a + ')'; cx.lineWidth = 1 + b.lvl * 0.5; cx.beginPath(); cx.moveTo(tx, ty); cx.lineTo(x, y); cx.stroke();
      cx.globalCompositeOperation = 'source-over';
      if (u >= 1) glow(b.x2, b.y2, 10 + b.lvl * 4, '#9ffbe3', a);
    });

    // ----- attackers -----
    var boss = null;
    G.foes.forEach(function (o) { if (o.type === 'boss') boss = o; else drawFoe(o); });
    if (boss) drawBoss(boss);

    // ----- Schiff's fog -----
    if (S.fogA > 0.01 && S.stage.fogZones) {
      var fz = S.stage.fogZones[S.fogZone];
      for (var fi = 0; fi < 9; fi++) {
        var fa = fi * 0.7 + t * 0.12, fr = fz[2] * (0.25 + 0.5 * ((fi * 37) % 10) / 10);
        cx.globalAlpha = S.fogA * 0.34;
        cx.drawImage(fogSprite(), fz[0] + Math.cos(fa) * fr - fz[2] * 0.75, fz[1] + Math.sin(fa * 1.3) * fr - fz[2] * 0.75, fz[2] * 1.5, fz[2] * 1.5);
      }
      cx.globalAlpha = S.fogA * 0.5; cx.strokeStyle = '#d8c9a8'; cx.lineWidth = 1.5; cx.setLineDash([4, 10]); cx.lineDashOffset = t * 10;
      cx.beginPath(); cx.arc(fz[0], fz[1], fz[2], 0, 6.3); cx.stroke(); cx.setLineDash([]);
      cx.globalAlpha = S.fogA; cx.font = '800 13px "JetBrains Mono", ui-monospace, monospace'; cx.textAlign = 'center'; cx.fillStyle = '#efe3c8';
      cx.fillText('FUD FOG · HALF RANGE', fz[0], fz[1] - fz[2] + 18); cx.globalAlpha = 1;
    }

    // ----- a market week sweeping the board -----
    if (S.crash) {
      var cu = S.crash.t / 0.7, cy = S.crash.up ? BH * (1 - cu) : BH * cu, cc = S.crash.up ? TEAL : RED;
      cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = 1 - cu * 0.6;
      var cgd = cx.createLinearGradient(0, cy - 90, 0, cy + 90); cgd.addColorStop(0, 'rgba(0,0,0,0)'); cgd.addColorStop(0.5, cc); cgd.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = cgd; cx.globalAlpha = (1 - cu * 0.6) * 0.35; cx.fillRect(-40, cy - 90, BW + 80, 180);
      cx.globalAlpha = 1 - cu * 0.6; cx.fillStyle = cc; cx.fillRect(-40, cy - 2, BW + 80, 4);
      cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    }

    // ----- the Super's sweep -----
    if (S.sweep) {
      var su = S.sweep.t / 0.9, hm = N[G.HOME], rr = 60 + su * 1100;
      cx.globalCompositeOperation = 'lighter';
      cx.strokeStyle = 'rgba(25,230,176,' + (1 - su) * 0.9 + ')'; cx.lineWidth = 26 * (1 - su) + 3; cx.beginPath(); cx.arc(hm.x, hm.y, rr, 0, 6.3); cx.stroke();
      cx.strokeStyle = 'rgba(155,92,255,' + (1 - su) * 0.6 + ')'; cx.lineWidth = 10 * (1 - su) + 2; cx.beginPath(); cx.arc(hm.x, hm.y, rr * 0.82, 0, 6.3); cx.stroke();
      cx.globalCompositeOperation = 'source-over';
    }

    // ----- effects -----
    S.fx.forEach(function (f) {
      var a = 1 - f.t / f.life;
      if (f.k === 'spark') { cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = a; cx.fillStyle = f.col; cx.fillRect(f.x - f.sz / 2, f.y - f.sz / 2, f.sz, f.sz); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }
      else if (f.k === 'ring') { var e = 1 - Math.pow(1 - f.t / f.life, 3); cx.globalCompositeOperation = 'lighter'; cx.strokeStyle = f.col; cx.globalAlpha = a; cx.lineWidth = f.w * a + 0.5; cx.beginPath(); cx.arc(f.x, f.y, 14 + f.r * e, 0, 6.3); cx.stroke(); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }
      else if (f.k === 'tape') {
        var n = N[f.id], u = Math.min(1, f.t / 0.25), ex = f.x + (n.x - f.x) * u, ey = f.y + (n.y - f.y) * u, mx = (f.x + ex) / 2 + (ey - f.y) * 0.25, my = (f.y + ey) / 2 - (ex - f.x) * 0.25;
        cx.globalAlpha = Math.min(1, a * 2); cx.strokeStyle = RED; cx.lineWidth = 7; cx.beginPath(); cx.moveTo(f.x, f.y); cx.quadraticCurveTo(mx, my, ex, ey); cx.stroke();
        cx.strokeStyle = '#fff'; cx.lineWidth = 7; cx.setLineDash([5, 9]); cx.lineDashOffset = -f.t * 80; cx.beginPath(); cx.moveTo(f.x, f.y); cx.quadraticCurveTo(mx, my, ex, ey); cx.stroke(); cx.setLineDash([]); cx.globalAlpha = 1;
      }
    });
    S.fx.forEach(function (f) {
      if (f.k !== 'text') return;
      var a = 1 - f.t / f.life, pop = f.t < 0.12 ? 0.6 + f.t / 0.12 * 0.5 : 1.1 - Math.min(0.1, (f.t - 0.12) * 0.8);
      cx.globalAlpha = Math.min(1, a * 1.8);
      cx.font = '800 ' + f.size * pop + 'px "JetBrains Mono", ui-monospace, monospace'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.lineWidth = 4; cx.strokeStyle = 'rgba(5,4,10,0.9)'; cx.strokeText(f.text, f.x, f.y - f.t * 28);
      cx.fillStyle = f.col; cx.fillText(f.text, f.x, f.y - f.t * 28);
      cx.globalAlpha = 1;
    });

    // ----- banner -----
    if (S.banner) {
      var bn = S.banner, ba = bn.t < 0.18 ? bn.t / 0.18 : bn.t > 1.9 ? Math.max(0, (2.3 - bn.t) / 0.4) : 1, bs = bn.t < 0.18 ? 1.25 - 0.25 * bn.t / 0.18 : 1;
      cx.globalAlpha = ba;
      var bgd = cx.createLinearGradient(0, 0, BW, 0); bgd.addColorStop(0, 'rgba(5,4,10,0)'); bgd.addColorStop(0.2, 'rgba(5,4,10,0.86)'); bgd.addColorStop(0.8, 'rgba(5,4,10,0.86)'); bgd.addColorStop(1, 'rgba(5,4,10,0)');
      cx.fillStyle = bgd; cx.fillRect(0, 395, BW, 112);
      cx.fillStyle = bn.col; cx.globalAlpha = ba * 0.7; cx.fillRect(BW / 2 - 150 * ba, 397, 300 * ba, 2); cx.fillRect(BW / 2 - 150 * ba, 503, 300 * ba, 2); cx.globalAlpha = ba;
      cx.textAlign = 'center'; cx.textBaseline = 'middle';
      cx.save(); cx.translate(BW / 2, 440); cx.scale(bs, bs);
      cx.font = '700 54px "Chakra Petch", "Arial Narrow", sans-serif';
      cx.shadowColor = bn.col; cx.shadowBlur = 24; cx.fillStyle = bn.col; cx.fillText(bn.text, 0, 0); cx.shadowBlur = 0;
      cx.restore();
      cx.font = '700 15px "JetBrains Mono", ui-monospace, monospace'; cx.fillStyle = '#d6d1ee'; cx.fillText(bn.sub, BW / 2, 482);
      cx.globalAlpha = 1;
    }

    // ----- red flash when it hurts -----
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (S.flash > 0) {
      var fg = cx.createRadialGradient(v.w / 2, v.h / 2, Math.min(v.w, v.h) * 0.25, v.w / 2, v.h / 2, Math.max(v.w, v.h) * 0.7);
      fg.addColorStop(0, 'rgba(' + FRGB + ',0)'); fg.addColorStop(1, 'rgba(' + FRGB + ',' + 0.5 * S.flash + ')');
      cx.fillStyle = fg; cx.fillRect(0, 0, v.w, v.h);
    }
  }

  var fogS = null;
  function fogSprite() {
    if (fogS) return fogS;
    fogS = document.createElement('canvas'); fogS.width = fogS.height = 128;
    var g = fogS.getContext('2d'), rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, 'rgba(216,201,168,0.95)'); rg.addColorStop(0.5, 'rgba(180,165,140,0.5)'); rg.addColorStop(1, 'rgba(160,150,130,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    return fogS;
  }

  // The Chart: the weeks played so far as candles behind the gates, with the week to come as a hollow one.
  function drawChart() {
    var G = S.G, st = S.stage, cs = S.candles, n = 26, x0 = 34, x1 = 686, y0 = 22, y1 = 142, w = (x1 - x0) / (n + 1);
    var list = cs.slice(-n), nextPct = G.nextCandle(), start = list.length ? list[0].price / (1 + list[0].pct / 100) : G.btc;
    var lo = start, hi = start, i;
    for (i = 0; i < list.length; i++) { lo = Math.min(lo, list[i].price); hi = Math.max(hi, list[i].price); }
    var nextPrice = G.btc * (1 + nextPct / 100); lo = Math.min(lo, nextPrice) * 0.97; hi = Math.max(hi, nextPrice) * 1.03;
    function Y(p) { return y1 - (p - lo) / (hi - lo) * (y1 - y0); }
    var prev = start;
    for (i = 0; i < list.length; i++) {
      var c = list[i], up = c.pct >= 0, col = up ? TEAL : RED, x = x0 + i * w + w / 2, a = Y(prev), b = Y(c.price), big = c.pct <= st.crashAt || c.pct >= st.pumpAt;
      cx.globalAlpha = big ? 0.95 : 0.5; cx.strokeStyle = col; cx.fillStyle = col; cx.lineWidth = 1.5;
      var ext = Math.abs(a - b) * 0.35 + 3;
      cx.beginPath(); cx.moveTo(x, Math.min(a, b) - ext); cx.lineTo(x, Math.max(a, b) + ext); cx.stroke();
      cx.fillRect(x - w * 0.32, Math.min(a, b), w * 0.64, Math.max(2, Math.abs(a - b)));
      if (big && i === list.length - 1) glow(x, (a + b) / 2, 34, col, 0.6);
      prev = c.price;
    }
    // the week to come
    var nx = x0 + list.length * w + w / 2, na = Y(G.btc), nb = Y(nextPrice), ncol = nextPct >= 0 ? TEAL : RED, danger = nextPct <= st.crashAt;
    cx.globalAlpha = danger ? 0.55 + 0.45 * Math.abs(Math.sin(S.t * 6)) : 0.6; cx.strokeStyle = ncol; cx.lineWidth = 1.5; cx.setLineDash([3, 3]);
    cx.strokeRect(nx - w * 0.32, Math.min(na, nb), w * 0.64, Math.max(3, Math.abs(na - nb))); cx.setLineDash([]);
    cx.font = '800 12px "JetBrains Mono", ui-monospace, monospace'; cx.textBaseline = 'middle';
    cx.textAlign = nx > BW - 150 ? 'right' : 'left'; cx.fillStyle = ncol;
    cx.fillText('NEXT ' + (nextPct > 0 ? '+' : '') + nextPct + '%', nx + (nx > BW - 150 ? -w * 0.5 : w * 0.5), Math.min(na, nb) - 8);
    cx.globalAlpha = 0.9; cx.textAlign = 'left'; cx.fillStyle = '#e9e6f5';
    cx.fillText('BTC $' + Math.round(G.btc).toLocaleString('en-US'), 30, 12);
    cx.globalAlpha = 1;
  }

  function tag(n, txt, ok) {
    cx.font = '800 11px "JetBrains Mono", ui-monospace, monospace'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    var w = cx.measureText(txt).width + 12, y = n.y + 35;
    cx.fillStyle = 'rgba(5,4,10,0.8)'; cx.beginPath(); cx.rect(n.x - w / 2, y - 8, w, 16); cx.fill();
    cx.fillStyle = ok ? GOLD : 'rgba(255,255,255,0.32)'; cx.fillText(txt, n.x, y + 0.5);
  }

  function drawNode(n, v) {
    var G = S.G, t = S.t, pu = pulse(n), r = 21, x = n.x, y = n.y, p = G.price(n.id), play = S.mode === 'play' && G.state === 'play';
    if (v.nope) x += Math.sin(v.nope * 25) * 4 * v.nope;
    var sc = 1 + (v.pop > 0 ? Math.sin(v.pop * Math.PI) * 0.35 : 0);
    cx.save(); cx.translate(x, y); cx.scale(sc, sc); cx.translate(-x, -y);
    if (n.cap) {
      var th = 0.5 + 0.5 * Math.sin(t * 5 + n.x), jx = Math.random() < 0.06 && !reduce ? (Math.random() - 0.5) * 5 : 0;
      glow(x, y, 58 + th * 10 + v.capT * 40, RED, 0.5 + 0.3 * th);
      hex(x + jx, y, r + 2); var cg = cx.createRadialGradient(x, y, 2, x, y, r + 2); cg.addColorStop(0, DIM); cg.addColorStop(1, DARK); cx.fillStyle = cg; cx.fill();
      cx.lineWidth = 2.5; cx.strokeStyle = RED; cx.stroke();
      // cracks
      cx.strokeStyle = LIGHT; cx.lineWidth = 1.5; cx.beginPath();
      cx.moveTo(x - 10 + jx, y - 12); cx.lineTo(x - 2 + jx, y - 3); cx.lineTo(x - 8 + jx, y + 4); cx.lineTo(x + 1 + jx, y + 13);
      cx.moveTo(x - 2 + jx, y - 3); cx.lineTo(x + 9 + jx, y - 7); cx.lineTo(x + 12 + jx, y + 2); cx.stroke();
      // embers rising
      for (var i = 0; i < 3; i++) { var eu = (t * 0.7 + i / 3 + n.x * 0.01) % 1; cx.globalAlpha = 1 - eu; cx.fillStyle = LIGHT; cx.fillRect(x - 12 + i * 12 + Math.sin(t * 3 + i) * 3, y - 18 - eu * 26, 2.2, 2.2); }
      cx.globalAlpha = 1;
      if (play) tag(n, 'RETAKE ' + p.cost, G.tokens >= p.cost);
    } else if (n.lvl) {
      var L = C.LVL[n.lvl], frozen = n.frozen > 0;
      glow(x, y, 46 + n.lvl * 8 + pu * 26, TEAL, (0.32 + pu * 0.5 + v.kick * 0.15) * (n.fog ? 0.4 : 1));
      // stake: a ring of segments
      var segs = L.stake, gap = 0.09, arc = (6.283 - segs * gap) / segs;
      cx.lineWidth = 3;
      for (var s2 = 0; s2 < segs; s2++) {
        var a0 = -Math.PI / 2 + s2 * (arc + gap) + gap / 2;
        cx.strokeStyle = s2 < n.stake ? (n.stake / L.stake > 0.5 ? TEAL : n.stake / L.stake > 0.25 ? GOLD : RED) : 'rgba(255,255,255,0.10)';
        cx.beginPath(); cx.arc(x, y, r + 8, a0, a0 + arc); cx.stroke();
      }
      hex(x, y, r); var vg = cx.createRadialGradient(x, y - 5, 2, x, y, r); vg.addColorStop(0, '#17564b'); vg.addColorStop(1, '#06211d'); cx.fillStyle = vg; cx.fill();
      cx.lineWidth = 2.5; cx.strokeStyle = v.flash > 0.3 ? '#ff9fb0' : TEAL; cx.stroke();
      // level 3 wears a spinning collar
      if (n.lvl === 3) { cx.strokeStyle = 'rgba(159,251,227,0.7)'; cx.lineWidth = 1.5; cx.setLineDash([7, 9]); cx.lineDashOffset = -t * 18; hex(x, y, r - 5, t * 0.4); cx.stroke(); cx.setLineDash([]); }
      // the gun
      cx.save(); cx.translate(x, y); cx.rotate(frozen ? v.aim : v.aim); cx.translate(-v.kick * 4, 0);
      cx.fillStyle = '#d9fff6';
      var bl = 13 + n.lvl * 2;
      if (n.lvl === 1) cx.fillRect(2, -2.5, bl, 5);
      else if (n.lvl === 2) { cx.fillRect(2, -6, bl, 4); cx.fillRect(2, 2, bl, 4); }
      else { cx.fillRect(2, -8, bl - 2, 4); cx.fillRect(2, -2, bl + 3, 4); cx.fillRect(2, 4, bl - 2, 4); }
      cx.beginPath(); cx.arc(0, 0, 6.5, 0, 6.3); cx.fillStyle = '#0b3a33'; cx.fill(); cx.lineWidth = 2; cx.strokeStyle = '#d9fff6'; cx.stroke();
      cx.restore();
      if (v.kick > 0.5) glow(x + Math.cos(v.aim) * 22, y + Math.sin(v.aim) * 22, 16, '#d9fff6', v.kick);
      if (frozen) {
        cx.save(); hex(x, y, r + 3); cx.clip();
        cx.lineWidth = 8;
        [[-1, 1], [1, 1]].forEach(function (d) {
          cx.strokeStyle = RED; cx.beginPath(); cx.moveTo(x - 30 * d[0], y - 30); cx.lineTo(x + 30 * d[0], y + 30); cx.stroke();
          cx.strokeStyle = '#fff'; cx.setLineDash([4, 8]); cx.lineDashOffset = t * 12; cx.beginPath(); cx.moveTo(x - 30 * d[0], y - 30); cx.lineTo(x + 30 * d[0], y + 30); cx.stroke(); cx.setLineDash([]);
        });
        cx.restore();
        cx.strokeStyle = RED; cx.lineWidth = 2; cx.beginPath(); cx.arc(x, y, r + 13, -Math.PI / 2, -Math.PI / 2 + 6.283 * n.frozen / S.G.stage.tapeFor); cx.stroke();
      }
      if (n.bid > 0) {
        var bu = n.bid / S.stage.bidFor, by = y - r - 24 - Math.abs(Math.sin(t * 6)) * 6;
        cx.strokeStyle = GOLD; cx.lineWidth = 4; cx.beginPath(); cx.arc(x, y, r + 15, -Math.PI / 2, -Math.PI / 2 + 6.283 * bu); cx.stroke();
        glow(x, by, 26, GOLD, 0.8);
        cx.fillStyle = GOLD; cx.beginPath(); cx.arc(x, by, 11, 0, 6.3); cx.fill();
        cx.fillStyle = '#3a2600'; cx.font = '800 15px "JetBrains Mono", ui-monospace, monospace'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('$', x, by + 1);
        if (play) tag(n, 'COUNTER ' + n.bidCost, G.tokens >= n.bidCost);
      } else if (play && p && G.tokens >= p.cost) tag(n, (p.what === 'repair' ? 'FIX ' : 'UP ') + p.cost, true);
    } else {
      glow(x, y, 30 + pu * 30, VIO, 0.22 + pu * 0.6);
      hex(x, y, r - 2); var eg = cx.createRadialGradient(x, y - 4, 2, x, y, r); eg.addColorStop(0, '#241d4a'); eg.addColorStop(1, '#0e0b1f'); cx.fillStyle = eg; cx.fill();
      cx.lineWidth = 2; cx.strokeStyle = 'rgba(155,92,255,' + (0.75 + pu * 0.25) + ')'; cx.stroke();
      cx.strokeStyle = 'rgba(185,168,255,0.45)'; cx.lineWidth = 1; hex(x, y, 8 + Math.sin(t * 2 + n.y) * 1.2, -t * 0.5); cx.stroke();
      cx.fillStyle = '#cfc4ff'; cx.beginPath(); cx.arc(x, y, 2.2, 0, 6.3); cx.fill();
      if (play) tag(n, String(p.cost), G.tokens >= p.cost);
    }
    cx.restore();
  }

  function drawHome(n, v) {
    var t = S.t, pu = pulse(n), x = n.x, y = n.y, r = 44, f = Math.max(0, n.hp / n.maxhp), col = v.flash > 0.25 ? RED : TEAL;
    glow(x, y, 110 + pu * 40, col, 0.42 + pu * 0.4);
    cx.strokeStyle = 'rgba(25,230,176,0.5)'; cx.lineWidth = 1.5; cx.setLineDash([10, 12]); cx.lineDashOffset = -t * 14; cx.beginPath(); cx.arc(x, y, r + 16, 0, 6.3); cx.stroke(); cx.setLineDash([]);
    // integrity, in 20 ticks
    var ticks = n.maxhp, live = Math.ceil(n.hp);
    cx.lineWidth = 4;
    for (var i = 0; i < ticks; i++) { var a0 = -Math.PI / 2 + i * 6.283 / ticks + 0.03; cx.strokeStyle = i < live ? (f > 0.5 ? TEAL : f > 0.25 ? GOLD : RED) : 'rgba(255,255,255,0.10)'; cx.beginPath(); cx.arc(x, y, r + 8, a0, a0 + 6.283 / ticks - 0.06); cx.stroke(); }
    hex(x, y, r); cx.fillStyle = '#0a2a25'; cx.fill();
    cx.save(); hex(x, y, r - 2); cx.clip();
    if (HEAD.toly.complete && HEAD.toly.naturalWidth) cx.drawImage(HEAD.toly, x - 45, y - 49, 90, 90);
    cx.restore();
    hex(x, y, r); cx.lineWidth = 3.5; cx.strokeStyle = col; cx.stroke();
  }

  function drawFoe(o) {
    var t = S.t, col = FOE_COL[o.type], N = S.G.N, a = N[o.from], b = N[o.to] || a, ang = Math.atan2(b.y - a.y, b.x - a.x);
    var tr = o._tr || (o._tr = []);
    tr.push(o.x, o.y); if (tr.length > (o.type === 'lobbyist' ? 28 : 16)) tr.splice(0, 2);
    // trail
    cx.globalCompositeOperation = 'lighter'; cx.strokeStyle = col; cx.lineWidth = o.type === 'subpoena' ? 5 : 3;
    for (var i = 2; i < tr.length; i += 2) { cx.globalAlpha = 0.5 * i / tr.length; cx.beginPath(); cx.moveTo(tr[i - 2], tr[i - 1]); cx.lineTo(tr[i], tr[i + 1]); cx.stroke(); }
    cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    var hidden = S.fogA > 0.3 && S.G.inFog(o.x, o.y);
    glow(o.x, o.y, o.type === 'subpoena' ? 30 : 20, col, hidden ? 0.15 : 0.6);
    var hit = o._hit > 0; if (hit) o._hit -= 1 / 60;
    cx.save(); cx.translate(o.x, o.y);
    if (hidden) cx.globalAlpha = 0.28;
    if (o.type === 'subpoena') {
      var skin = S.stage.heavy;
      cx.rotate(Math.sin(t * 3 + o.id) * (skin === 'paper' ? 0.18 : 0.08));
      cx.strokeStyle = col; cx.lineWidth = 2;
      if (skin === 'bar') {                       // a gold bar
        cx.fillStyle = hit ? '#fff' : '#ffd66b';
        cx.beginPath(); cx.moveTo(-14, 8); cx.lineTo(-9, -8); cx.lineTo(9, -8); cx.lineTo(14, 8); cx.closePath(); cx.fill(); cx.stroke();
        cx.fillStyle = 'rgba(255,255,255,0.65)'; cx.fillRect(-7, -5, 14, 3);
      } else if (skin === 'vault') {              // a vault door
        cx.fillStyle = hit ? '#fff' : '#dfe9ff';
        cx.beginPath(); cx.arc(0, 0, 13, 0, 6.3); cx.fill(); cx.stroke();
        cx.beginPath(); cx.arc(0, 0, 5, 0, 6.3); cx.stroke();
        for (var sp = 0; sp < 4; sp++) { var sa = t * 1.5 + sp * Math.PI / 2; cx.beginPath(); cx.moveTo(Math.cos(sa) * 5, Math.sin(sa) * 5); cx.lineTo(Math.cos(sa) * 11, Math.sin(sa) * 11); cx.stroke(); }
      } else if (skin === 'candle') {             // a fat red candle
        cx.beginPath(); cx.moveTo(0, -19); cx.lineTo(0, 19); cx.stroke();
        cx.fillStyle = hit ? '#fff' : col; cx.fillRect(-8, -11, 16, 22);
        cx.fillStyle = 'rgba(255,255,255,0.35)'; cx.fillRect(-8, -11, 4, 22);
      } else {                                    // paperwork
        cx.fillStyle = hit ? '#fff' : '#ffe9ec';
        cx.beginPath(); cx.rect(-9, -12, 18, 24); cx.fill(); cx.stroke();
        cx.fillStyle = col; cx.fillRect(-6, -8, 12, 2); cx.fillRect(-6, -4, 12, 2); cx.fillRect(-6, 0, 8, 2);
        cx.beginPath(); cx.arc(3, 7, 3.4, 0, 6.3); cx.fill();
      }
    } else if (o.type === 'lobbyist') {
      cx.rotate(ang); cx.fillStyle = hit ? '#fff' : col;
      cx.beginPath(); cx.moveTo(11, 0); cx.lineTo(-7, -7); cx.lineTo(-2, 0); cx.lineTo(-7, 7); cx.closePath(); cx.fill();
      cx.fillStyle = '#fff3e0'; cx.beginPath(); cx.moveTo(8, 0); cx.lineTo(0, -2.6); cx.lineTo(0, 2.6); cx.closePath(); cx.fill();
    } else if (o.type === 'rogue') {
      cx.rotate(t * 4 + o.id); cx.fillStyle = hit ? '#fff' : col;
      cx.beginPath(); for (var k = 0; k < 8; k++) { var rr = k % 2 ? 3.5 : 9, aa = k * Math.PI / 4; cx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } cx.closePath(); cx.fill();
    } else {
      cx.rotate(ang); var s = 9 + Math.sin(t * 8 + o.id) * 0.8; cx.fillStyle = hit ? '#fff' : col;
      cx.beginPath(); cx.moveTo(s + 2, 0); cx.lineTo(0, -s); cx.lineTo(-s, 0); cx.lineTo(0, s); cx.closePath(); cx.fill();
      cx.fillStyle = 'rgba(255,255,255,0.8)'; cx.beginPath(); cx.moveTo(4, 0); cx.lineTo(0, -3.5); cx.lineTo(-3.5, 0); cx.lineTo(0, 3.5); cx.closePath(); cx.fill();
    }
    cx.restore();
    if (o.hp < o.max) { var w = o.type === 'subpoena' ? 26 : 18, y = o.y - (o.type === 'subpoena' ? 20 : 15); cx.fillStyle = 'rgba(5,4,10,0.75)'; cx.fillRect(o.x - w / 2 - 1, y - 1, w + 2, 5); cx.fillStyle = col; cx.fillRect(o.x - w / 2, y, w * Math.max(0, o.hp / o.max), 3); }
  }

  function drawBoss(o) {
    var t = S.t, r = 34, x = o.x, y = o.y + Math.sin(t * 2) * 2;
    glow(x, y, 120 + Math.sin(t * 4) * 10, RED, 0.75);
    // her paperwork, in orbit
    for (var i = 0; i < 6; i++) {
      var a = t * 1.3 + i * 1.047, px = x + Math.cos(a) * (r + 22), py = y + Math.sin(a) * (r + 22) * 0.55, back = Math.sin(a) < 0;
      if (!back) continue;
      paper(px, py, a, 0.6);
    }
    cx.beginPath(); cx.arc(x, y, r + 3, 0, 6.3); cx.fillStyle = DARK; cx.fill();
    cx.save(); cx.beginPath(); cx.arc(x, y, r, 0, 6.3); cx.clip();
    var bh = HEAD[S.stage.boss];
    if (bh.complete && bh.naturalWidth) cx.drawImage(bh, x - r - 5, y - r - 7, (r + 5) * 2, (r + 5) * 2);
    if (o._hit > 0) { cx.fillStyle = 'rgba(255,255,255,0.35)'; cx.fillRect(x - r, y - r, r * 2, r * 2); o._hit -= 1 / 60; }
    cx.restore();
    cx.lineWidth = 6; cx.strokeStyle = 'rgba(5,4,10,0.7)'; cx.beginPath(); cx.arc(x, y, r + 7, 0, 6.3); cx.stroke();
    cx.strokeStyle = RED; cx.beginPath(); cx.arc(x, y, r + 7, -Math.PI / 2, -Math.PI / 2 + 6.283 * Math.max(0, o.hp / o.max)); cx.stroke();
    for (var j = 0; j < 6; j++) { var a2 = t * 1.3 + j * 1.047; if (Math.sin(a2) < 0) continue; paper(x + Math.cos(a2) * (r + 22), y + Math.sin(a2) * (r + 22) * 0.55, a2, 1); }
    if (S.line) {
      var la = Math.min(1, S.line.t * 3, (2.8 - S.line.t) * 6);
      cx.globalAlpha = Math.max(0, la);
      cx.font = '700 15px "Chakra Petch", "Arial Narrow", sans-serif'; var tw = cx.measureText(S.line.text).width + 22;
      var bx = Math.min(BW - tw - 8, Math.max(8, x - tw / 2)), by = y - r - 52;
      cx.fillStyle = '#fff'; cx.beginPath();
      if (cx.roundRect) cx.roundRect(bx, by, tw, 28, 9); else cx.rect(bx, by, tw, 28);
      cx.fill();
      cx.beginPath(); cx.moveTo(x - 7, by + 27); cx.lineTo(x + 7, by + 27); cx.lineTo(x, by + 37); cx.closePath(); cx.fill();
      cx.fillStyle = '#1a0a10'; cx.textAlign = 'left'; cx.textBaseline = 'middle'; cx.fillText(S.line.text, bx + 11, by + 14.5);
      cx.globalAlpha = 1;
    }
  }
  function paper(px, py, a, alpha) {
    cx.save(); cx.translate(px, py); cx.rotate(Math.sin(a * 2) * 0.5); cx.globalAlpha = alpha;
    var skin = S.stage.heavy;
    if (skin === 'bar') { cx.fillStyle = '#ffd66b'; cx.beginPath(); cx.moveTo(-8, 4); cx.lineTo(-5, -4); cx.lineTo(5, -4); cx.lineTo(8, 4); cx.closePath(); cx.fill(); }
    else if (skin === 'vault') { cx.fillStyle = GOLD; cx.beginPath(); cx.arc(0, 0, 6, 0, 6.3); cx.fill(); cx.fillStyle = '#3a2600'; cx.font = '800 9px "JetBrains Mono", monospace'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('$', 0, 0.5); }
    else if (skin === 'candle') { cx.strokeStyle = RED; cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(0, -10); cx.lineTo(0, 10); cx.stroke(); cx.fillStyle = RED; cx.fillRect(-4, -6, 8, 12); }
    else { cx.fillStyle = '#ffe9ec'; cx.fillRect(-5, -7, 10, 14); cx.fillStyle = RED; cx.fillRect(-3, -4, 6, 1.5); cx.fillRect(-3, -1, 6, 1.5); cx.fillRect(-3, 2, 4, 1.5); }
    cx.restore(); cx.globalAlpha = 1;
  }

  // ---------- The meters and buttons ----------
  var shown = {};
  function set(node, key, val, prop) { if (shown[key] !== val) { shown[key] = val; node[prop || 'textContent'] = val; } }
  function hud() {
    var G = S.G; if (S.mode !== 'play') return;
    var pct = G.consensus();
    set(el.pct, 'pct', pct + '%'); set(el.fill.style, 'fill', pct + '%', 'width');
    set(el.hud, 'danger', pct <= 62 ? 'a51-hud danger' : 'a51-hud', 'className');
    set(el.tok, 'tok', String(Math.floor(G.tokens)));
    set(el.wave, 'wave', Math.max(1, G.wave) + '/' + G.waves);
    var ready = G.superReady();
    if (ready && !S.wasReady) sfx('ready');
    S.wasReady = ready;
    el.sup.disabled = !ready; el.sup.classList.toggle('ready', ready);
    set(el.supFill.style, 'sup', (100 * G.superC / R.superT).toFixed(1) + '%', 'width');
    set(el.supSub, 'supSub', ready ? 'Second Best Salesman' : 'Charging ' + Math.ceil(R.superT - G.superC) + 's');
    var nw = G.nextWave(), waiting = G.state === 'play' && G.wait > 0 && nw;
    el.next.disabled = !waiting;
    if (waiting) {
      set(el.nextT, 'nt', 'CALL WAVE +' + Math.round(G.wait * R.earlyPay));
      set(el.nextSub, 'ns', 'In ' + Math.ceil(G.wait) + 's: ' + nw.map(function (g) { return g[0] === 'boss' ? S.stage.short : g[1] + ' ' + S.stage.names[g[0]].toLowerCase(); }).join(', '));
    } else {
      set(el.nextT, 'nt', G.wave >= G.waves ? 'FINAL WAVE' : 'WAVE ' + Math.max(1, G.wave));
      var st = S.stage, nc = G.nextCandle();
      set(el.nextSub, 'ns', st.candles ? 'Next week: ' + (nc > 0 ? '+' : '') + nc + '%' + (nc <= st.crashAt ? '. Stake will be lost.' : nc >= st.pumpAt ? '. Double pay.' : '')
        : st.skim ? 'He skims ' + Math.round(st.skim * 100) + '% of your tokens a block'
        : G.halved ? 'Rewards halved: 0.5 a node' : 'Each held node pays 1 a block');
    }
  }

  // ---------- Loop ----------
  var last = 0;
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    var n = S.mode === 'play' ? S.speed : 1;
    for (var i = 0; i < n; i++) step(dt);
    draw(); hud();
    requestAnimationFrame(frame);
  }
  showTitle();
  requestAnimationFrame(frame);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { /* canvas text picks the fonts up on its next frame */ });

  // For the test scripts: ?debug exposes the game.
  if (/[?&]debug\b/.test(location.search)) window.POF_A51 = { S: S, M: M, play: function (k) { ov.hidden = true; newGame('play', C.STAGES[k == null ? 2 : k]); }, stages: showStages, step: function (secs) { for (var i = 0; i < secs * 30; i++) step(1 / 30); }, bot: function () { C.bot(S.G, 'active'); }, end: showEnd, intro: function (k) { showIntro(C.STAGES[k == null ? 2 : k]); } };
})();
