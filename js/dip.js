/* Buy the Dip test mode (?dip). The rules live in js/dip-core.js; this file draws them, plays the sound and
   takes the one button. Everything on screen is drawn here in code on one canvas: no image files.
   The ground is a real price chart (Bitcoin or Solana, or a made-up daily coin). Down slopes are red or purple, up slopes are green:
   hold on red to dive, let go on green to fly, and stay ahead of the liquidation wall.
   ?dip&debug exposes window.POF_DIP; ?dip&auto lets the look-ahead bot play (for recording clips). */
(function () {
  if (!/[?&]dip\b/i.test(location.search)) return;
  var C = window.POF_DIP_CORE, CHAINS = window.POF_DIP_CHAINS;
  var AUTO = /[?&]auto\b/i.test(location.search), DEBUG = /[?&]debug\b/i.test(location.search);
  var DAY = C.DAY;
  // The colors of the chain being ridden (set by applyTheme): GREEN and RED are the up and down slopes.
  var GREEN = '#1ff2a0', RED = '#ff3d71', GOLD = '#ffc53d', TH = null;
  var DAILY_THEME = {
    up: '#1ff2a0', upRGB: '31,242,160', upLine: '#7dffd0', upWord: 'green',
    down: '#ff3d71', downRGB: '255,61,113', downLine: '#ff7a9c', downWord: 'red',
    coin: '#ffc53d', coinRGB: '255,197,61', coinCore: '#fff3c4',
    ballRGB: '90,220,255', holdRGB: '255,120,40', trail: '120,225,255', hue: 40,
    sky: { neutral: [70, 84, 230], bull: [20, 220, 170], bear: [240, 40, 120] },
    wallRGB: '255,61,113', btnBg: '#1ff2a0', btnInk: '#04140d', accent: '#1ff2a0'
  };
  var UNIT = 'sats';
  var MONO = '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  var SANS = '"Space Grotesk", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  var root, cv, ctx, W = 0, H = 0, DPR = 1;
  var T = null, S = null, mode = 'btc', chainIds = CHAINS.ORDER, attract = true, over = false, overT = 0, paused = false;
  var hold = false, botHold = false, botK = 0;
  var cam = { x: 0, y: 0, z: 1 }, shake = 0, flash = 0, mood = 0, clock = 0, timeScale = 1;
  var trail = [], parts = [], pops = [], rings = [], banner = null, hintT = 0;
  var stars = [], sprites = {}, mini = null, runs = 0;
  var today = new Date().toISOString().slice(0, 10);
  var terrains = {};
  // Ghosts: REC records the run being played; GH replays another run as a see-through orb (your best, or a
  // friend's run from a race link); CHALLENGE is the run from the link this page was opened with.
  var REC = null, GH = null, ghostWho = '', ghostTrail = [], ghostPassed = false, racing = false, CHALLENGE = null;

  function $(q) { return root.querySelector(q); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* private mode */ } return null; }
  function bestKey(m) { return m === 'daily' ? 'pof-dip-best-' + today : 'pof-dip-best-' + m; }
  function ghostKey(m) { return 'pof-dip-ghost-' + (m === 'daily' ? today : m); }
  function dayKey(m) { return 'pof-dip-bestday-' + (m === 'daily' ? today : m); }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function price(p) {
    if (p >= 1e9) return '$' + (p / 1e9).toFixed(2) + 'B';
    if (p >= 1e6) return '$' + (p / 1e6).toFixed(2) + 'M';
    if (p >= 1000) return '$' + fmt(p);
    if (p >= 1) return '$' + p.toFixed(2);
    return '$' + p.toPrecision(3);
  }
  function whenOf(TT, x) { var iso = TT.dateAt(x); return iso ? MONTHS[Number(iso.slice(5, 7)) - 1] + ' ' + iso.slice(0, 4) : 'DAY ' + fmt(TT.dayAt(x)); }
  function when(x, long) {
    var iso = T.dateAt(x);
    if (!iso) return 'DAY ' + fmt(T.dayAt(x));
    return (long ? MONTHS[Number(iso.slice(5, 7)) - 1] + ' ' : MONTHS[Number(iso.slice(5, 7)) - 1] + ' ') + iso.slice(0, 4);
  }
  function terrain(m) {
    if (!terrains[m]) terrains[m] = m === 'daily' ? C.makeTerrain({ mode: 'daily', seed: today }) :
      C.makeTerrain({ mode: 'chain', chain: CHAINS.CHAINS[m], data: window[CHAINS.CHAINS[m].dataVar] });
    terrains[m].coins.forEach(function (c) { c.got = false; });
    return terrains[m];
  }

  function applyTheme(m) {
    TH = m === 'daily' ? DAILY_THEME : CHAINS.CHAINS[m].theme;
    UNIT = m === 'daily' ? 'sats' : CHAINS.CHAINS[m].unit;
    GREEN = TH.up; RED = TH.down; GOLD = TH.coin;
    var st = root.style;
    st.setProperty('--up', TH.up); st.setProperty('--down', TH.down); st.setProperty('--down-rgb', TH.downRGB);
    st.setProperty('--coin', TH.coin); st.setProperty('--btn-bg', TH.btnBg); st.setProperty('--btn-ink', TH.btnInk);
    st.setProperty('--accent', TH.accent);
    sprites.gold = glow(TH.coinRGB, 128); sprites.cyan = glow(TH.ballRGB, 128); sprites.hot = glow(TH.holdRGB, 128);
    sprites.red = glow(TH.downRGB, 128); sprites.green = glow(TH.upRGB, 128);
    var u = $('#dip-end-unit'); if (u) u.textContent = UNIT.toUpperCase();
  }
  function wallC(a) { return 'rgba(' + TH.wallRGB + ',' + a + ')'; }

  // ---------- Sound: all of it made here with oscillators and noise ----------
  var AC = null, master = null, musicG = null, windG = null, windF = null, noiseBuf = null, muted = store('pof-dip-mute') === '1';
  var music = { on: false, step: 0, next: 0, timer: null, cut: null, energy: 0 };
  function audio() {
    if (AC) { if (AC.state !== 'running') AC.resume(); return true; }
    var K = window.AudioContext || window.webkitAudioContext;
    if (!K) return false;
    AC = new K();
    master = AC.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(AC.destination);
    music.cut = AC.createBiquadFilter(); music.cut.type = 'lowpass'; music.cut.frequency.value = 900;
    musicG = AC.createGain(); musicG.gain.value = 0.55; music.cut.connect(musicG); musicG.connect(master);
    noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    var n = AC.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
    windF = AC.createBiquadFilter(); windF.type = 'bandpass'; windF.frequency.value = 600; windF.Q.value = 0.7;
    windG = AC.createGain(); windG.gain.value = 0;
    n.connect(windF); windF.connect(windG); windG.connect(master); n.start();
    return true;
  }
  function tone(type, f0, f1, at, dur, vol, dest) {
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, at);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(vol, at + Math.min(0.012, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(dest || master); o.start(at); o.stop(at + dur + 0.03);
  }
  function hiss(at, dur, vol, freq, type, dest) {
    var n = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    n.buffer = noiseBuf; f.type = type || 'highpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    n.connect(f); f.connect(g); g.connect(dest || master); n.start(at, Math.random()); n.stop(at + dur + 0.03);
  }
  function midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var PENTA = [0, 3, 5, 7, 10, 12, 15, 17, 19, 22, 24], coinRun = 0, coinAt = 0;
  var sfx = {
    coin: function () {
      var now = AC.currentTime;
      if (now - coinAt > 1.1) coinRun = 0;
      coinAt = now;
      tone('sine', midi(81 + PENTA[Math.min(coinRun, PENTA.length - 1)]), 0, now, 0.16, 0.11);
      coinRun++;
    },
    perfect: function (k) {
      var now = AC.currentTime, b = 69 + PENTA[Math.min(k, 6)];
      tone('triangle', midi(b), 0, now, 0.22, 0.2); tone('triangle', midi(b + 7), 0, now + 0.07, 0.3, 0.2);
      tone('sine', midi(b + 12), 0, now + 0.14, 0.45, 0.14); hiss(now, 0.18, 0.05, 6000);
    },
    bad: function () { var now = AC.currentTime; tone('sine', 150, 45, now, 0.25, 0.5); hiss(now, 0.16, 0.22, 900, 'lowpass'); },
    launch: function () { hiss(AC.currentTime, 0.22, 0.045, 2400, 'bandpass'); },
    fever: function () { var now = AC.currentTime; [0, 4, 7, 12, 16, 19, 24].forEach(function (s, i) { tone('square', midi(69 + s), 0, now + i * 0.055, 0.2, 0.07); }); },
    event: function () { var now = AC.currentTime; tone('sine', midi(88), 0, now, 0.5, 0.08); tone('sine', midi(93), 0, now + 0.09, 0.6, 0.06); },
    dead: function () {
      var now = AC.currentTime;
      tone('sawtooth', 420, 38, now, 1.1, 0.28); tone('square', 210, 30, now, 1.1, 0.14); hiss(now, 0.9, 0.4, 1800, 'lowpass');
    },
    tap: function () { tone('sine', 660, 990, AC.currentTime, 0.08, 0.1); }
  };
  function play(name, a) { if (AC && !muted && !attract) try { sfx[name](a); } catch (e) { /* no sound */ } }

  // Music: a four-chord loop whose layers come in with speed. Slow = bass and pad; fast = drums; bull run = arp.
  var ROOTS = [45, 41, 48, 43], CH = [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]], SPB = 60 / 116 / 4;
  function musicTick() {
    if (!music.on || !AC) return;
    while (music.next < AC.currentTime + 0.12) {
      var st = music.step, at = music.next, bar = Math.floor(st / 16) % 4, s16 = st % 16, r = ROOTS[bar], e = music.energy;
      if (s16 === 0) CH[bar].forEach(function (iv, i) {
        var o = AC.createOscillator(), g = AC.createGain();
        o.type = 'sawtooth'; o.frequency.value = midi(r + 12 + iv); o.detune.value = (i - 1) * 9;
        g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(0.05, at + 0.5);
        g.gain.setValueAtTime(0.05, at + SPB * 13); g.gain.linearRampToValueAtTime(0.0001, at + SPB * 16.5);
        o.connect(g); g.connect(music.cut); o.start(at); o.stop(at + SPB * 17);
      });
      if (s16 % 2 === 0) tone('sawtooth', midi(r + (s16 % 8 === 6 ? 12 : 0)), 0, at, SPB * 1.7, 0.16, music.cut);
      if (e > 0.25 && s16 % 4 === 0) tone('sine', 150, 42, at, 0.2, 0.5 * Math.min(1, e * 1.6), musicG);
      if (e > 0.15 && s16 % 2 === 0) hiss(at, s16 % 4 === 2 ? 0.07 : 0.03, 0.035 + 0.04 * e, 7500, 'highpass', musicG);
      if (e > 0.5 && (s16 === 4 || s16 === 12)) hiss(at, 0.12, 0.12, 1800, 'bandpass', musicG);
      if (S && S.fever > 0 && !attract) tone('square', midi(r + 36 + CH[bar][(s16 * 5) % 3] + (s16 % 4 === 3 ? 12 : 0)), 0, at, SPB * 0.9, 0.035, musicG);
      music.next += SPB; music.step++;
    }
  }
  function startMusic() {
    if (!AC || music.on) return;
    music.on = true; music.step = 0; music.next = AC.currentTime + 0.06;
    music.cut.frequency.cancelScheduledValues(AC.currentTime); music.cut.frequency.value = 900;
    musicG.gain.cancelScheduledValues(AC.currentTime); musicG.gain.setValueAtTime(0.55, AC.currentTime);
    music.timer = setInterval(musicTick, 40);
  }
  function stopMusic(fade) {
    if (!music.on) return;
    music.on = false; clearInterval(music.timer);
    if (AC) { music.cut.frequency.exponentialRampToValueAtTime(120, AC.currentTime + (fade || 0.3)); }
  }
  function setMuted(m) {
    muted = m; store('pof-dip-mute', m ? '1' : '0');
    if (master) master.gain.value = m ? 0 : 0.9;
    $('#dip-mute').textContent = m ? 'SOUND OFF' : 'SOUND ON';
  }

  // ---------- Setup ----------
  function glow(rgb, size) {
    var c = document.createElement('canvas'); c.width = c.height = size;
    var g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gr.addColorStop(0, 'rgba(' + rgb + ',1)'); gr.addColorStop(0.25, 'rgba(' + rgb + ',0.45)');
    gr.addColorStop(0.6, 'rgba(' + rgb + ',0.1)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, size, size);
    return c;
  }
  function build() {
    var f = document.createElement('link');
    f.rel = 'stylesheet'; f.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;800&family=Space+Grotesk:wght@500;700&display=swap';
    document.head.appendChild(f);
    root = document.createElement('div');
    root.id = 'dip';
    root.innerHTML =
      '<canvas id="dip-cv"></canvas>' +
      '<div class="dip-menu" id="dip-menu">' +
        '<div class="dip-logo"><span>BUY</span><span>THE</span><span class="dip-logo-dip">DIP</span></div>' +
        '<p class="dip-tag">Ride every pump and crash in crypto\'s history.<br>One button. Don\'t get liquidated.</p>' +
        '<div class="dip-how"><span><i class="dip-dot dip-red"></i><b>HOLD</b> going down to dive</span><span><i class="dip-dot dip-green"></i><b>LET GO</b> going up to fly</span></div>' +
        '<div class="dip-challenge" id="dip-challenge" hidden><p id="dip-challenge-text"></p>' +
          '<button class="dip-btn dip-btn-race" id="dip-race" type="button"><b>RACE THEIR GHOST</b><small>their run plays next to yours</small></button></div>' +
        chainIds.map(function (id) {
          var c = CHAINS.CHAINS[id];
          return '<button class="dip-btn dip-btn-main dip-chain" id="dip-' + id + '" type="button" style="--btn-bg:' + c.theme.btnBg + ';--btn-ink:' + c.theme.btnInk + '">' +
            '<b>RIDE ' + c.name.toUpperCase() + '</b><small>' + c.pitch + '</small><em id="dip-best-' + id + '"></em></button>';
        }).join('') +
        '<button class="dip-btn" id="dip-daily" type="button"><b>DAILY COIN</b><small id="dip-daily-name"></small><em id="dip-best-daily"></em></button>' +
        '<div class="dip-foot"><button class="dip-link" id="dip-mute" type="button"></button><a class="dip-link" href="./">PROOF OF FIGHT</a></div>' +
      '</div>' +
      '<div class="dip-end" id="dip-end" hidden>' +
        '<div class="dip-end-title" id="dip-end-title">LIQUIDATED</div>' +
        '<div class="dip-end-where" id="dip-end-where"></div>' +
        '<div class="dip-end-sub" id="dip-end-sub"></div>' +
        '<div class="dip-end-score"><b id="dip-end-score"></b><small id="dip-end-unit">SATS</small></div>' +
        '<div class="dip-end-break" id="dip-end-break"></div>' +
        '<div class="dip-end-best" id="dip-end-best"></div>' +
        '<div class="dip-end-race" id="dip-end-race" hidden></div>' +
        '<button class="dip-btn dip-btn-main" id="dip-again" type="button"><b>RIDE AGAIN</b></button>' +
        '<div class="dip-row"><button class="dip-btn dip-btn-sm" id="dip-link" type="button"><b>SEND RACE LINK</b></button>' +
        '<button class="dip-btn dip-btn-sm" id="dip-share" type="button"><b>SHARE PICTURE</b></button></div>' +
        '<div class="dip-row">' +
        '<button class="dip-btn dip-btn-sm" id="dip-tomenu" type="button"><b>MENU</b></button></div>' +
        '<div class="dip-note" id="dip-note"></div>' +
      '</div>' +
      '<button class="dip-pause" id="dip-quit" type="button" aria-label="Menu" hidden>×</button>';
    document.body.appendChild(root);
    document.documentElement.classList.add('dip-on');
    cv = $('#dip-cv'); ctx = cv.getContext('2d');
    sprites.white = glow('255,255,255', 128);
    for (var i = 0; i < 140; i++) stars.push({ x: Math.random(), y: Math.random() * 0.75, r: Math.random() * 1.3 + 0.3, p: Math.random() * 6.28, d: 0.02 + Math.random() * 0.06 });

    chainIds.forEach(function (id) { $('#dip-' + id).addEventListener('click', function () { start(id); }); });
    $('#dip-daily').addEventListener('click', function () { start('daily'); });
    $('#dip-again').addEventListener('click', function () { start(mode, racing); });
    $('#dip-race').addEventListener('click', function () { if (CHALLENGE) start(CHALLENGE.mode, true); });
    readChallenge();
    $('#dip-tomenu').addEventListener('click', menu);
    $('#dip-quit').addEventListener('click', menu);
    $('#dip-share').addEventListener('click', share);
    $('#dip-link').addEventListener('click', shareLink);
    $('#dip-mute').addEventListener('click', function () { audio(); setMuted(!muted); });
    setMuted(muted);

    cv.addEventListener('pointerdown', function (e) { e.preventDefault(); press(true); });
    window.addEventListener('pointerup', function () { press(false); });
    window.addEventListener('pointercancel', function () { press(false); });
    window.addEventListener('blur', function () { press(false); });
    cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    window.addEventListener('keydown', function (e) {
      if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'Enter') {
        e.preventDefault(); e.stopPropagation();
        if (e.repeat) return;
        if (attract && !over) { if (e.code !== 'ArrowDown') start(mode); }
        else if (over) { if (overT > 0.9) start(mode); }
        else press(true);
      } else if (e.code === 'Escape' && !attract) { e.stopPropagation(); menu(); }
    }, true);
    window.addEventListener('keyup', function (e) { if (e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'Enter') { e.stopPropagation(); press(false); } }, true);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () { paused = document.hidden; press(false); if (AC) { if (document.hidden) AC.suspend(); else AC.resume(); } });
    resize();
    menu();
    if (AUTO) start(/[?&]daily\b/.test(location.search) ? 'daily' : /[?&]sol\b/.test(location.search) ? 'sol' : 'btc');
    last = performance.now();
    requestAnimationFrame(frame);
    if (DEBUG) window.POF_DIP = { get S() { return S; }, get T() { return T; }, get GH() { return GH; }, get REC() { return REC; }, encode: function () { return C.encode(REC); }, start: start, menu: menu, core: C, card: shareCard, frame: tick, cam: cam, set auto(v) { AUTO = v; }, set manual(v) { paused = v; } };
  }
  function press(on) { if (!attract && !over) hold = on; else hold = false; }
  function resize() {
    W = window.innerWidth; H = window.innerHeight; DPR = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    mini = null;
  }
  function baseZoom() { return clamp(Math.min(W / (W < H ? 600 : 760), H / 520), 0.5, 1.5); }

  function reset(m, demo) {
    mode = m; T = terrain(m); S = C.newRun(T); applyTheme(m);
    if (demo) {
      var d = Math.round(T.real * (0.25 + 0.55 * Math.random()));
      S.x = d * DAY; S.y = T.height(S.x); S.noWall = true; S.s = 900;
      while (S.ei < T.events.length && T.events[S.ei].day * DAY <= S.x) S.ei++;
      while (S.ci < T.coins.length && T.coins[S.ci].x < S.x) S.ci++;
    }
    trail = []; parts = []; pops = []; rings = []; banner = null; over = false; overT = 0; hold = false; timeScale = 1;
    cam.x = S.x; cam.y = S.y; cam.z = baseZoom(); mood = T.moodAt(S.x); mini = null; shake = 0; flash = 0;
  }
  function menu() {
    attract = true; reset(chainIds[Math.floor(Math.random() * chainIds.length)], true);
    stopMusic(0.4);
    $('#dip-menu').hidden = false; $('#dip-end').hidden = true; $('#dip-quit').hidden = true;
    chainIds.concat(['daily']).forEach(function (id) {
      var b = store(bestKey(id)), d = store(dayKey(id));
      $('#dip-best-' + id).textContent = b ? 'BEST ' + (d ? d + ' · ' : '') + fmt(b) : '';
    });
    $('#dip-challenge').hidden = !CHALLENGE;
    if (CHALLENGE) {
      var CT = terrain(CHALLENGE.mode), cname = CHALLENGE.mode === 'daily' ? CT.name : CHAINS.CHAINS[CHALLENGE.mode].name;
      var cunit = CHALLENGE.mode === 'daily' ? 'sats' : CHAINS.CHAINS[CHALLENGE.mode].unit;
      $('#dip-challenge-text').textContent = CHALLENGE.mode === 'daily'
        ? 'You were sent a run: ' + fmt(CHALLENGE.day) + ' days on today\'s ' + cname + ', ' + fmt(CHALLENGE.score) + ' ' + cunit + '. Can you beat it?'
        : 'You were sent a run: ' + cname + ' to ' + whenOf(CT, CHALLENGE.day * DAY) + ', ' + fmt(CHALLENGE.score) + ' ' + cunit + '. Can you beat it?';
    }
    $('#dip-daily-name').textContent = C.makeTerrain({ mode: 'daily', seed: today }).name + ', a new made-up coin every day';
  }
  function start(m, race) {
    attract = false; reset(m, false); runs++;
    racing = !!(race && CHALLENGE && CHALLENGE.mode === m);
    REC = C.recorder(m, m === 'daily' ? today : '');
    var R = racing ? CHALLENGE : C.decodeGhost(store(ghostKey(m)) || '');
    GH = R && R.mode === m ? C.ghost(T, R) : null;
    ghostWho = racing ? 'THEIR RUN' : 'YOUR BEST'; ghostTrail = []; ghostPassed = false;
    hintT = runs <= 2 ? 9 : 0;
    $('#dip-menu').hidden = true; $('#dip-end').hidden = true; $('#dip-quit').hidden = false;
    if (audio()) { stopMusic(0.05); music.on = false; startMusic(); play('tap'); }
  }
  // A race link: ?dip&race=<a recorded run>. Today's Daily Coin only, since another day's coin is a different chart.
  function readChallenge() {
    var m = /[?&]race=([^&#]+)/.exec(location.search);
    if (!m) return;
    var R = C.decodeGhost(decodeURIComponent(m[1]));
    if (!R) return;
    if (R.mode === 'daily' ? R.seed !== today : !CHAINS.CHAINS[R.mode]) return;
    CHALLENGE = R;
  }
  function finish() {
    var sc = C.score(S), key = bestKey(mode), old = Number(store(key) || 0), isBest = sc > old;
    if (isBest) { store(key, String(sc)); store(ghostKey(mode), C.encode(REC)); store(dayKey(mode), T.mode === 'chain' ? when(S.x) : fmt(T.dayAt(S.x)) + ' DAYS'); }
    $('#dip-end-title').textContent = S.won ? 'UNLIQUIDATABLE' : 'LIQUIDATED';
    $('#dip-end-where').textContent = T.mode === 'chain' ? 'You made it to ' + when(S.x) : 'You rode ' + T.name + ' for ' + fmt(T.dayAt(S.x)) + ' days';
    var e = S.lastEvent, sub = price(T.priceAt(S.x)) + ' a coin';
    if (T.mode === 'chain' && e && T.dayAt(S.x) - e.day < 400) sub = 'Past ' + e.title + '. ' + sub + '.';
    $('#dip-end-sub').textContent = sub;
    $('#dip-end-score').textContent = fmt(sc);
    var bd = C.breakdown(S);
    $('#dip-end-break').textContent = 'Distance ' + fmt(bd.distance) + '  ·  Pickups ' + fmt(bd.pickups) + '  ·  Landings ' + fmt(bd.landings);
    var rr = $('#dip-end-race');
    rr.hidden = !racing;
    if (racing) {
      var won = sc > CHALLENGE.score;
      rr.textContent = won ? 'You beat their run (' + fmt(CHALLENGE.score) + ')' : 'Their run wins: ' + fmt(CHALLENGE.score) + '. Ride again to race it.';
      rr.className = 'dip-end-race' + (won ? ' won' : '');
    }
    $('#dip-end-best').textContent = isBest && old ? 'NEW BEST' : isBest ? '' : 'BEST ' + fmt(old);
    $('#dip-note').textContent = '';
    $('#dip-end').hidden = false; $('#dip-quit').hidden = true;
  }

  // ---------- The frame ----------
  var last = 0, acc = 0;
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!paused) tick(dt);
    requestAnimationFrame(frame);
  }
  function tick(dt) {
    clock += dt;
    var sdt = dt * timeScale;
    if (!over) {
      acc += sdt;
      while (acc >= 1 / 120) {
        acc -= 1 / 120;
        var h = hold;
        if (attract || AUTO) { if (botK++ % 4 === 0) botHold = C.bot(S); h = botHold; }
        if (!attract && REC) C.record(REC, S, h);
        C.step(S, h, 1 / 120);
        if (GH && !attract) C.ghostStep(GH, 1 / 120);
        if (S.dead) break;
      }
      events();
    } else {
      overT += dt;
      S.wall = Math.min(S.wall + 1400 * dt, S.x + 380);
      if (overT > 0.9 && $('#dip-end').hidden && !attract) finish();
    }
    update(dt);
    draw();
  }
  function pop(text, x, y, color, size) { pops.push({ text: text, x: x, y: y, t: 0, color: color, size: size || 1 }); }
  function burst(x, y, n, color, speed, life) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * 6.283, v = speed * (0.3 + Math.random() * 0.7);
      parts.push({ x: x, y: y, vx: Math.cos(a) * v + (S ? S.vx * 0.5 : 0), vy: Math.sin(a) * v, t: 0, life: life * (0.5 + Math.random() * 0.5), color: color, r: 1 + Math.random() * 2.2 });
    }
  }
  function events() {
    for (var i = 0; i < S.ev.length; i++) {
      var e = S.ev[i];
      if (e.type === 'coin') { burst(e.x, e.y, 5, 'gold', 160, 0.4); play('coin'); }
      else if (e.type === 'perfect') {
        pop(e.streak > 1 ? 'PERFECT ×' + e.streak : 'PERFECT', S.x, S.y + 70, GREEN, 1 + Math.min(e.streak, 5) * 0.12);
        rings.push({ x: S.x, y: S.y, t: 0, color: TH.upRGB }); burst(S.x, S.y, 14, 'green', 320, 0.6);
        flash = 0.12; play('perfect', e.streak); buzz(8);
      } else if (e.type === 'bad') {
        pop('REKT', S.x, S.y + 60, RED, 1); burst(S.x, S.y, 12, 'red', 260, 0.5); shake = Math.max(shake, 9); play('bad'); buzz(25);
      } else if (e.type === 'launch') play('launch');
      else if (e.type === 'fever') { banner = { text: 'BULL RUN', sub: 'speed up, ' + UNIT + ' ×2', t: 0, color: GOLD }; play('fever'); rings.push({ x: S.x, y: S.y, t: 0, color: TH.coinRGB }); }
      else if (e.type === 'event') { play('event'); }
      else if (e.type === 'dead') {
        over = true; overT = 0; hold = false; shake = 22; flash = 0.5;
        if (REC && !attract) C.finishRecord(REC, S, T);
        burst(S.x, S.y, 60, 'red', 700, 1.1); burst(S.x, S.y, 30, 'white', 500, 0.9);
        play('dead'); buzz([40, 50, 120]); stopMusic(1.2);
      }
    }
    S.ev.length = 0;
  }
  function buzz(p) { if (!attract && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* no haptics */ } }

  function update(dt) {
    // The camera frames the ball and the ground ahead: it pulls back for big air, big hills and high speed.
    var bz = baseZoom(), lo = S.y, hi = S.y + 90, xq, hq, ahead = (W - W * 0.34) / cam.z;
    for (xq = S.x - 150; xq < S.x + ahead * 0.8; xq += 60) { hq = T.height(xq); if (hq < lo) lo = hq; if (hq + 60 > hi) hi = hq + 60; }
    var zt = Math.min(bz * 560 / (560 + Math.max(0, S.vx - 700) * (W < H ? 0.08 : 0.14)), H * 0.62 / (hi - lo + 120));
    zt = Math.max(zt, bz * 0.3);
    cam.z += (zt - cam.z) * Math.min(1, dt * 2.2);
    cam.x = S.x;
    cam.y += ((lo + hi) / 2 - cam.y) * Math.min(1, dt * 4);
    mood += (T.moodAt(S.x) - mood) * Math.min(1, dt * 0.8);
    shake *= Math.pow(0.002, dt); flash = Math.max(0, flash - dt);
    if (hintT > 0) hintT -= dt;
    if (!over) { trail.push({ x: S.x, y: S.y, h: S.hold, f: S.fever > 0 }); if (trail.length > 44) trail.shift(); }
    else if (trail.length) trail.shift();
    if (S.fever > 0 && !over && Math.random() < 0.6) parts.push({ x: S.x, y: S.y, vx: S.vx * 0.3 + (Math.random() - 0.5) * 200, vy: (Math.random() - 0.3) * 240, t: 0, life: 0.5, color: 'gold', r: 1 + Math.random() * 2 });
    if (S.hold && !over && Math.random() < 0.5) parts.push({ x: S.x, y: S.y, vx: S.vx * 0.5, vy: S.vy * 0.5 + 200, t: 0, life: 0.25, color: 'hot', r: 1 + Math.random() * 1.5 });
    var i;
    for (i = parts.length - 1; i >= 0; i--) { var p = parts[i]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 900 * dt; p.vx *= 0.985; if (p.t > p.life) parts.splice(i, 1); }
    for (i = pops.length - 1; i >= 0; i--) { pops[i].t += dt; if (pops[i].t > 0.9) pops.splice(i, 1); }
    for (i = rings.length - 1; i >= 0; i--) { rings[i].t += dt; if (rings[i].t > 0.5) rings.splice(i, 1); }
    if (banner) { banner.t += dt; if (banner.t > 1.8) banner = null; }
    if (AC && windG) {
      var now = AC.currentTime, sp = clamp(S.vx / 2400, 0, 1);
      windG.gain.setTargetAtTime(attract || over || muted ? 0 : (S.air ? 0.05 + 0.2 * sp : 0.04 * sp), now, 0.1);
      windF.frequency.setTargetAtTime(400 + 2200 * sp, now, 0.1);
      music.energy += (clamp((S.vx - 650) / 1100, 0, 1) - music.energy) * Math.min(1, dt * 1.5);
      if (music.on) music.cut.frequency.setTargetAtTime(700 + 5200 * music.energy, now, 0.25);
    }
  }

  // ---------- Drawing ----------
  var ox = 0, oy = 0;
  function sx(x) { return (x - cam.x) * cam.z + ox; }
  function sy(y) { return oy - (y - cam.y) * cam.z; }
  function mix(a, b, t) { return [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], t)), Math.round(lerp(a[2], b[2], t))]; }
  function stamp(sp, x, y, r, a) { ctx.globalAlpha = a; ctx.drawImage(sprites[sp], x - r, y - r, r * 2, r * 2); }

  function draw() {
    var z = cam.z, i, k;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ox = W * (W < H ? 0.36 : 0.32) + (Math.random() - 0.5) * shake; oy = H * 0.57 + (Math.random() - 0.5) * shake;
    var x0 = cam.x - ox / z - 60, x1 = cam.x + (W - ox) / z + 60;
    var fever = S.fever > 0 && !over;

    // sky: the horizon glows with the market's mood (teal in a bull run, magenta in a winter, gold on a streak)
    var neutral = TH.sky.neutral, bull = TH.sky.bull, bear = TH.sky.bear;
    var hc = mood >= 0 ? mix(neutral, bull, mood) : mix(neutral, bear, -mood);
    if (fever) hc = mix(hc, TH.coinRGB.split(',').map(Number), 0.7);
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#03040a'); g.addColorStop(0.55, '#070a18');
    g.addColorStop(1, 'rgb(' + mix([7, 10, 24], hc, 0.42).join(',') + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    var rg = ctx.createRadialGradient(W * 0.62, H * 1.05, 0, W * 0.62, H * 1.05, Math.max(W, H) * 0.85);
    rg.addColorStop(0, 'rgba(' + hc.join(',') + ',0.34)'); rg.addColorStop(1, 'rgba(' + hc.join(',') + ',0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);

    // stars
    ctx.fillStyle = '#fff';
    for (i = 0; i < stars.length; i++) {
      var s = stars[i], px = ((s.x * W - cam.x * s.d * z) % W + W) % W;
      ctx.globalAlpha = 0.25 + 0.35 * Math.sin(clock * 1.3 + s.p) * Math.sin(clock * 0.7 + s.p * 2);
      if (ctx.globalAlpha > 0.02) ctx.fillRect(px, s.y * H, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    // the year, huge, far behind
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '800 ' + Math.round(Math.min(W * 0.36, H * 0.42)) + 'px ' + MONO;
    ctx.fillStyle = 'rgba(255,255,255,0.045)';
    if (T.mode === 'chain') {
      var d0 = Date.parse(T.dateAt(0)), y0 = Number(T.dateAt(0).slice(0, 4));
      var yr = Number((T.dateAt(cam.x) || '2010').slice(0, 4));
      for (k = yr - 1; k <= yr + 1; k++) {
        if (k < y0) continue;
        var mid = (Date.UTC(k, 6, 1) - d0) / 86400000 * DAY;
        var tx = (mid - cam.x) * z * 0.5 + W * 0.5;
        if (tx > -W && tx < W * 2) ctx.fillText(T.dayAt(mid) >= T.real && T.real ? '????' : String(k), tx, H * 0.36);
      }
    } else {
      ctx.font = '800 ' + Math.round(Math.min(W * 0.16, H * 0.3)) + 'px ' + MONO;
      var span = 9000, kk = Math.round(cam.x / span);
      for (k = kk - 1; k <= kk + 1; k++) ctx.fillText(T.name, (k * span - cam.x) * z * 0.5 + W * 0.5, H * 0.36);
    }

    // grid
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,0.045)'; ctx.beginPath();
    var gs = 30 * DAY;
    for (k = Math.floor(x0 / gs); k * gs < x1; k++) { var gx = Math.round(sx(k * gs)) + 0.5; ctx.moveTo(gx, 0); ctx.lineTo(gx, H); }
    var hs = 260, yTop = cam.y + oy / z, yBot = cam.y - (H - oy) / z;
    for (k = Math.floor(yBot / hs); k * hs < yTop; k++) { var gy = Math.round(sy(k * hs)) + 0.5; ctx.moveTo(0, gy); ctx.lineTo(W, gy); }
    ctx.stroke();

    // the chart: a dark body, candle-colored bars fading down, and a glowing line on top
    var stepW = DAY / 2, pts = [], xx;
    for (xx = Math.floor(x0 / stepW) * stepW; xx <= x1 + stepW; xx += stepW) pts.push(sx(xx), sy(T.height(xx)));
    ctx.beginPath(); ctx.moveTo(pts[0], H + 4);
    for (i = 0; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.lineTo(pts[pts.length - 2], H + 4); ctx.closePath();
    ctx.fillStyle = 'rgba(5,6,14,0.82)'; ctx.fill();

    var BW = DAY * 2, gap = BW * z > 14 ? 2.5 : 1, up = new Path2D(), dn = new Path2D();
    for (k = Math.floor(x0 / BW); k * BW < x1; k++) {
      var xa = k * BW, ha = T.height(xa), hm = T.height(xa + BW / 2), hb = T.height(xa + BW), rising = hb >= ha;
      var ax = sx(xa), bx = sx(xa + BW) - gap, ay = sy(ha), my = sy(hm), by = sy(hb), top = Math.min(ay, by, my);
      var bg = ctx.createLinearGradient(0, top, 0, top + 380 * z + 60);
      bg.addColorStop(0, rising ? 'rgba(' + TH.upRGB + ',0.5)' : 'rgba(' + TH.downRGB + ',0.55)');
      bg.addColorStop(1, rising ? 'rgba(' + TH.upRGB + ',0)' : 'rgba(' + TH.downRGB + ',0)');
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo((ax + bx) / 2, my); ctx.lineTo(bx, by); ctx.lineTo(bx, H); ctx.lineTo(ax, H); ctx.closePath(); ctx.fill();
      var path = rising ? up : dn;
      path.moveTo(ax, ay); path.lineTo((ax + bx + gap) / 2, my); path.lineTo(bx + gap, by);
    }
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineWidth = Math.max(7, 12 * z); ctx.strokeStyle = 'rgba(' + TH.upRGB + ',0.22)'; ctx.stroke(up);
    ctx.strokeStyle = 'rgba(' + TH.downRGB + ',0.26)'; ctx.stroke(dn);
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = Math.max(2, 3.2 * z); ctx.strokeStyle = TH.upLine; ctx.stroke(up); ctx.strokeStyle = TH.downLine; ctx.stroke(dn);

    // landmarks
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    for (i = 0; i < T.events.length; i++) {
      var ev = T.events[i], ex = ev.day * DAY;
      if (ex < x0 - 800 || ex > x1) continue;
      var lx = sx(ex), ly = sy(T.height(ex)), lt = Math.min(H * 0.26, ly - 70);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([4, 6]); ctx.beginPath(); ctx.moveTo(lx + 0.5, lt); ctx.lineTo(lx + 0.5, ly); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(lx, ly, 4, 0, 6.283); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.font = '700 ' + Math.round(clamp(W / 46, 12, 17)) + 'px ' + SANS;
      ctx.fillText(ev.title, lx + 8, lt + 12);
      if (ev.sub) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '500 ' + Math.round(clamp(W / 60, 10, 13)) + 'px ' + SANS; ctx.fillText(ev.sub, lx + 8, lt + 30); }
    }

    // sats
    ctx.globalCompositeOperation = 'lighter';
    var cs = T.coins;
    for (i = S.ci; i < cs.length && cs[i].x < x1; i++) {
      var c = cs[i];
      if (c.got) continue;
      var cx = sx(c.x), cy = sy(c.y + Math.sin(clock * 4 + c.x * 0.01) * 5);
      stamp('gold', cx, cy, Math.max(9, 20 * z), 0.9);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = TH.coinCore;
    for (i = S.ci; i < cs.length && cs[i].x < x1; i++) {
      if (cs[i].got) continue;
      var qx = sx(cs[i].x), qy = sy(cs[i].y + Math.sin(clock * 4 + cs[i].x * 0.01) * 5), qr = Math.max(2.2, 4.5 * z);
      ctx.beginPath(); ctx.moveTo(qx, qy - qr); ctx.lineTo(qx + qr, qy); ctx.lineTo(qx, qy + qr); ctx.lineTo(qx - qr, qy); ctx.closePath(); ctx.fill();
    }

    drawWall(z);

    // the ball and its trail
    ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'butt';
    for (i = 1; i < trail.length; i++) {
      var a = trail[i - 1], b = trail[i], f = i / trail.length;
      ctx.strokeStyle = b.f ? 'hsla(' + (TH.hue + 20 * Math.sin(clock * 9 + i * 0.3)) + ',100%,60%,' + f * 0.75 + ')' : b.h ? 'rgba(' + TH.holdRGB + ',' + f * 0.75 + ')' : 'rgba(' + TH.trail + ',' + f * 0.6 + ')';
      ctx.lineWidth = Math.max(1.5, C.R * 1.4 * z * f);
      ctx.beginPath(); ctx.moveTo(sx(a.x), sy(a.y)); ctx.lineTo(sx(b.x), sy(b.y)); ctx.stroke();
    }
    drawGhost(z);
    var bxs = sx(S.x), bys = sy(S.y + C.R), br = Math.max(7, C.R * z);
    if (!over) {
      stamp(fever ? 'gold' : S.hold ? 'hot' : 'cyan', bxs, bys, br * (S.hold ? 4.2 : 3.4), 0.95);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      var ang = Math.atan2(-S.vy, S.vx), st = clamp(Math.hypot(S.vx, S.vy) / 5200, 0, 0.35);
      ctx.save(); ctx.translate(bxs, bys); ctx.rotate(ang); ctx.scale(1 + st, 1 - st * 0.7);
      ctx.fillStyle = fever ? '#fff1b8' : S.hold ? '#ffe2c2' : '#ffffff';
      ctx.beginPath(); ctx.arc(0, 0, br, 0, 6.283); ctx.fill();
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < parts.length; i++) { var p = parts[i]; stamp(p.color, sx(p.x), sy(p.y), Math.max(2, p.r * 5 * z), 1 - p.t / p.life); }
    for (i = 0; i < rings.length; i++) {
      var r = rings[i], rt = r.t / 0.5;
      ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(' + r.color + ',' + (1 - rt) + ')'; ctx.lineWidth = 4 * (1 - rt) + 1;
      ctx.beginPath(); ctx.arc(sx(r.x), sy(r.y), (20 + 190 * rt) * z, 0, 6.283); ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

    // words that pop off the ball
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (i = 0; i < pops.length; i++) {
      var q = pops[i], qt = q.t / 0.9, sc = (qt < 0.15 ? 0.6 + qt / 0.15 * 0.5 : 1.1 - (qt - 0.15) * 0.12) * q.size;
      ctx.globalAlpha = qt > 0.6 ? 1 - (qt - 0.6) / 0.4 : 1;
      ctx.font = '800 ' + Math.round(clamp(W / 26, 17, 28) * sc) + 'px ' + MONO;
      ctx.fillStyle = q.color; ctx.shadowColor = q.color; ctx.shadowBlur = 16;
      var half = ctx.measureText(q.text).width / 2 + 10;
      ctx.fillText(q.text, clamp(sx(q.x), half, W - half), sy(q.y) - 46 * qt - 20);
    }
    ctx.shadowBlur = 0; ctx.globalAlpha = 1;

    // red closing in at the edges
    var gapT = clamp(1 - (S.x - S.wall) / 1500, 0, 1);
    if (gapT > 0 && !attract) {
      var vg = ctx.createLinearGradient(0, 0, W * 0.6, 0);
      vg.addColorStop(0, wallC(0.32 * gapT * (0.75 + 0.25 * Math.sin(clock * 12)))); vg.addColorStop(1, wallC(0));
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    }
    if (flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.5, flash) + ')'; ctx.fillRect(0, 0, W, H); }
    if (attract) { ctx.fillStyle = 'rgba(3,4,10,0.55)'; ctx.fillRect(0, 0, W, H); return; }
    hud();
  }

  // The ghost: a see-through orb with its own faint trail and a name tag. Off screen, a tag on the edge says how
  // many days ahead or behind it is. When its run ended, a dashed line marks the spot until you pass it.
  function drawGhost(z) {
    if (!GH || attract) return;
    var G = GH.S, gx = sx(G.x), gy = sy(G.y + C.R), r = Math.max(7, C.R * z), i;
    var lab = Math.round(clamp(W / 70, 10, 13));
    if (GH.done) {
      if (S.x < G.x) {
        ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, H); ctx.stroke(); ctx.setLineDash([]);
        ctx.font = '800 ' + lab + 'px ' + MONO; ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        if (gx > 0 && gx < W + 200) ctx.fillText(ghostWho + ' ENDED HERE', Math.min(gx - 6, W - 8), H * 0.42);
      } else if (!ghostPassed && !over) {
        ghostPassed = true;
        banner = { text: racing ? 'YOU PASSED THEM' : 'PAST YOUR BEST', sub: racing ? 'their run ended here' : 'further than your best run', t: 0, color: '#ffffff' };
        play('fever');
      }
      return;
    }
    ghostTrail.push({ x: G.x, y: G.y }); if (ghostTrail.length > 26) ghostTrail.shift();
    var onScreen = gx > -r * 3 && gx < W + r * 3;
    if (onScreen) {
      ctx.lineCap = 'round';
      for (i = 1; i < ghostTrail.length; i++) {
        var a = ghostTrail[i - 1], b = ghostTrail[i], f = i / ghostTrail.length;
        ctx.strokeStyle = 'rgba(255,255,255,' + f * 0.25 + ')'; ctx.lineWidth = Math.max(1, C.R * 1.1 * z * f);
        ctx.beginPath(); ctx.moveTo(sx(a.x), sy(a.y + C.R)); ctx.lineTo(sx(b.x), sy(b.y + C.R)); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(gx, gy, r, 0, 6.283); ctx.fill(); ctx.stroke();
      ctx.font = '800 ' + lab + 'px ' + MONO; ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.fillText(ghostWho, gx, gy - r - 8);
    } else {
      var ahead = G.x > S.x, days = Math.abs(Math.round((G.x - S.x) / DAY));
      var ty = clamp(gy, 120, H - 60), txt = ahead ? ghostWho + ' +' + days + 'd ▶' : '◀ ' + ghostWho + ' -' + days + 'd';
      ctx.font = '800 ' + lab + 'px ' + MONO; ctx.textBaseline = 'middle';
      var tw = ctx.measureText(txt).width + 16, tx = ahead ? W - tw - 8 : 26;
      ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(tx, ty - 12, tw, 24);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(tx + 0.5, ty - 11.5, tw - 1, 23);
      ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.fillText(txt, tx + 8, ty);
    }
  }

  function drawWall(z) {
    if (attract) return;
    var wx = sx(S.wall), i;
    if (wx < -4) {
      // off screen: a tag on the left edge says how close it is
      var secs = (S.x - S.wall) / Math.max(1, C.wallSpeed(T, S.x, S.t));
      var a = clamp(1.4 - secs / 3, 0.25, 1);
      ctx.fillStyle = wallC(a); ctx.fillRect(0, H * 0.3, 3, H * 0.4);
      ctx.save(); ctx.translate(16, H * 0.5); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '800 ' + Math.round(clamp(W / 70, 10, 13)) + 'px ' + MONO; ctx.fillText('LIQUIDATION ' + secs.toFixed(1) + 's', 0, 0); ctx.restore();
      return;
    }
    var g = ctx.createLinearGradient(wx - 520 * z - 200, 0, wx, 0);
    g.addColorStop(0, 'rgba(' + TH.wallRGB.split(',').map(function (v) { return Math.round(v * 0.4); }).join(',') + ',0.92)'); g.addColorStop(0.7, wallC(0.8)); g.addColorStop(1, wallC(0.95));
    ctx.fillStyle = g; ctx.fillRect(0, 0, wx, H);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (i = 0; i < H; i += 4) ctx.fillRect(0, i, wx, 1.5);
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < H; i += 22) {
      var j = (Math.sin(i * 12.9898 + Math.floor(clock * 24) * 78.233) * 43758.5453 % 1) * 14;
      ctx.fillStyle = 'rgba(' + TH.wallRGB.split(',').map(function (v) { return Math.min(255, Math.round(v * 0.5 + 128)); }).join(',') + ',0.9)'; ctx.fillRect(wx - 3 + j, i, 6, 22);
      ctx.fillStyle = wallC(0.25); ctx.fillRect(wx + j, i, 26, 22);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.translate(wx - 20, 0); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '800 ' + Math.round(clamp(W / 40, 14, 22)) + 'px ' + MONO; ctx.fillStyle = 'rgba(255,255,255,0.9)';
    var off = (clock * 90) % 260;
    for (i = -1; i < H / 260 + 1; i++) ctx.fillText('LIQUIDATION', -(i * 260 + off) - 260, 0);
    ctx.restore();
  }

  function miniChart() {
    var mw = Math.round(Math.min(W - 32, 520)), mh = 36, n = T.mode === 'chain' ? T.real : Math.min(T.n, 2400), lo = 1e9, hi = -1e9, i;
    for (i = 0; i < n; i += 4) { lo = Math.min(lo, T.logs[i]); hi = Math.max(hi, T.logs[i]); }
    function make(color) {
      var c = document.createElement('canvas'); c.width = mw * DPR; c.height = mh * DPR;
      var g = c.getContext('2d'); g.scale(DPR, DPR); g.strokeStyle = color; g.lineWidth = 1.5; g.lineJoin = 'round'; g.beginPath();
      for (i = 0; i < n; i += 6) { var x = i / n * mw, y = mh - 3 - (T.logs[i] - lo) / (hi - lo) * (mh - 6); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
      g.stroke(); return c;
    }
    mini = { w: mw, h: mh, n: n, dim: make('rgba(255,255,255,0.28)'), lit: make(GREEN) };
  }

  function hud() {
    var u = clamp(Math.min(W, H) / 620, 0.72, 1.15), pad = Math.round(16 * u) + (W > H ? 6 : 0), top = pad + 2;
    var m = T.slope(S.x), p = T.priceAt(S.x), fever = S.fever > 0;
    ctx.textBaseline = 'top'; ctx.textAlign = 'left';
    ctx.font = '700 ' + Math.round(13 * u) + 'px ' + SANS; ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(T.name + '  ·  ' + when(S.x), pad, top);
    ctx.font = '800 ' + Math.round(30 * u) + 'px ' + MONO; ctx.fillStyle = m >= 0 ? GREEN : RED;
    ctx.fillText(price(p), pad, top + 18 * u);
    ctx.textAlign = 'right';
    ctx.font = '700 ' + Math.round(13 * u) + 'px ' + SANS; ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(fever ? UNIT.toUpperCase() + ' ×2' : UNIT.toUpperCase(), W - pad - 40, top);
    ctx.font = '800 ' + Math.round(30 * u) + 'px ' + MONO; ctx.fillStyle = fever ? GOLD : '#fff';
    ctx.fillText(fmt(C.score(S)), W - pad - 40, top + 18 * u);

    // the whole chart, small, with where you are and where the wall is
    if (!mini) miniChart();
    var my = top + 60 * u, mx = Math.round((W - mini.w) / 2), f = clamp(S.x / (mini.n * DAY), 0, 1), wf = clamp(S.wall / (mini.n * DAY), 0, 1);
    ctx.drawImage(mini.dim, mx, my, mini.w, mini.h);
    ctx.save(); ctx.beginPath(); ctx.rect(mx, my, mini.w * f, mini.h); ctx.clip(); ctx.drawImage(mini.lit, mx, my, mini.w, mini.h); ctx.restore();
    ctx.fillStyle = wallC(0.35); ctx.fillRect(mx, my, mini.w * wf, mini.h);
    ctx.fillStyle = RED; ctx.fillRect(mx + mini.w * wf - 1, my, 2, mini.h);
    ctx.fillStyle = '#fff'; ctx.fillRect(mx + mini.w * f - 1, my - 3, 2, mini.h + 6);

    // streak pips and the bull-run bar
    var cxm = W / 2, sy0 = my + mini.h + 14 * u, i;
    if (fever) {
      ctx.fillStyle = 'rgba(' + TH.coinRGB + ',0.2)'; ctx.fillRect(cxm - 80, sy0, 160, 5);
      ctx.fillStyle = GOLD; ctx.fillRect(cxm - 80, sy0, 160 * S.fever / 6, 5);
    } else for (i = 0; i < 3; i++) {
      ctx.fillStyle = i < S.streak ? GREEN : 'rgba(255,255,255,0.18)';
      ctx.fillRect(cxm - 33 + i * 24, sy0, 18, 5);
    }

    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (banner) {
      var bt = banner.t, sc = bt < 0.2 ? 0.5 + bt / 0.2 * 0.6 : 1.1 - Math.min(0.1, (bt - 0.2) * 0.5);
      ctx.globalAlpha = bt > 1.4 ? 1 - (bt - 1.4) / 0.4 : 1;
      ctx.font = '800 ' + Math.round(clamp(W / 9, 40, 96) * sc) + 'px ' + MONO; ctx.fillStyle = banner.color; ctx.shadowColor = banner.color; ctx.shadowBlur = 30;
      ctx.fillText(banner.text, W / 2, H * 0.34);
      ctx.shadowBlur = 0; ctx.font = '700 ' + Math.round(clamp(W / 40, 13, 18)) + 'px ' + SANS; ctx.fillStyle = '#fff';
      ctx.fillText(banner.sub, W / 2, H * 0.34 + clamp(W / 9, 40, 96) * 0.7);
      ctx.globalAlpha = 1;
    }
    if (hintT > 0 && !over) {
      ctx.globalAlpha = Math.min(1, hintT);
      var onRed = m < -0.03, txt = S.air ? (S.vy < 0 ? 'HOLD to dive' : 'let go and fly') : onRed ? 'HOLD on ' + TH.downWord : 'LET GO on ' + TH.upWord;
      ctx.font = '800 ' + Math.round(clamp(W / 22, 18, 30)) + 'px ' + MONO;
      ctx.fillStyle = (S.air ? S.vy < 0 : onRed) ? RED : GREEN;
      ctx.fillText(txt, W / 2, H - Math.max(54, H * 0.12));
      ctx.font = '500 ' + Math.round(clamp(W / 50, 11, 14)) + 'px ' + SANS; ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText(('ontouchstart' in window) ? 'touch anywhere' : 'space bar or mouse button', W / 2, H - Math.max(54, H * 0.12) + 28);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- Share: a picture of your run, drawn here ----------
  function shareCard() {
    var c = document.createElement('canvas'); c.width = 1200; c.height = 675;
    var g = c.getContext('2d'), n = T.mode === 'chain' ? T.real : Math.min(T.n, Math.max(900, Math.round(T.dayAt(S.x) * 1.5))), lo = 1e9, hi = -1e9, i;
    var bgr = g.createLinearGradient(0, 0, 0, 675); bgr.addColorStop(0, '#03040a'); bgr.addColorStop(1, '#14102e');
    g.fillStyle = bgr; g.fillRect(0, 0, 1200, 675);
    for (i = 0; i < n; i++) { lo = Math.min(lo, T.logs[i]); hi = Math.max(hi, T.logs[i]); }
    var died = Math.min(n - 1, T.dayAt(S.x)), X = function (d) { return 60 + d / n * 1080; }, Y = function (v) { return 600 - (v - lo) / (hi - lo) * 250; };
    g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 1;
    for (i = 0; i < 12; i++) { g.beginPath(); g.moveTo(60 + i * 98.2, 330); g.lineTo(60 + i * 98.2, 620); g.stroke(); }
    function line(a, b, color, w) { g.strokeStyle = color; g.lineWidth = w; g.lineJoin = 'round'; g.beginPath(); for (i = a; i <= b; i += 2) { if (i === a) g.moveTo(X(i), Y(T.logs[i])); else g.lineTo(X(i), Y(T.logs[i])); } g.stroke(); }
    line(died, n - 1, 'rgba(255,255,255,0.22)', 2);
    g.shadowColor = GREEN; g.shadowBlur = 18; line(0, died, GREEN, 3.5); g.shadowBlur = 0;
    var dx = X(died), dy = Y(T.logs[died]);
    g.fillStyle = 'rgba(' + TH.downRGB + ',0.16)'; g.fillRect(60, 330, dx - 60, 290);
    g.fillStyle = RED; g.fillRect(dx - 1.5, 330, 3, 290);
    g.shadowColor = RED; g.shadowBlur = 24; g.beginPath(); g.arc(dx, dy, 9, 0, 6.283); g.fillStyle = '#fff'; g.fill(); g.shadowBlur = 0;
    g.font = '800 20px ' + MONO; g.fillStyle = RED; g.textAlign = dx > 900 ? 'right' : 'left';
    g.fillText('LIQUIDATED', dx + (dx > 900 ? -14 : 14), 352);
    g.textAlign = 'left';
    g.font = '800 30px ' + MONO; g.fillStyle = GREEN; g.fillText('BUY THE DIP', 60, 78);
    g.font = '700 64px ' + SANS; g.fillStyle = '#fff';
    g.fillText(T.mode === 'chain' ? 'I rode ' + T.chain.name + ' from ' + T.chain.startYear : 'I rode ' + T.name, 60, 168);
    g.fillText(T.mode === 'chain' ? 'to ' + when(S.x) + '.' : 'for ' + fmt(T.dayAt(S.x)) + ' days.', 60, 244);
    g.font = '800 44px ' + MONO; g.fillStyle = GOLD; g.fillText(fmt(C.score(S)) + ' ' + UNIT, 60, 310);
    g.textAlign = 'right'; g.font = '700 24px ' + SANS; g.fillStyle = 'rgba(255,255,255,0.7)'; g.fillText('proofoffight.com/?dip', 1140, 78);
    return c;
  }
  function shareText() {
    return (T.mode === 'chain' ? 'I rode ' + T.chain.name + ' from ' + T.chain.startYear + ' to ' + when(S.x) : 'I rode ' + T.name + ' for ' + fmt(T.dayAt(S.x)) + ' days') +
      ' before getting liquidated. ' + fmt(C.score(S)) + ' ' + UNIT + '. Race my ghost:';
  }
  function raceUrl() { return 'https://proofoffight.com/?dip' + (REC && REC.end ? '&race=' + encodeURIComponent(C.encode(REC)) : ''); }
  // Text and link only, no picture: messaging apps (iMessage, WhatsApp) drop the text when a picture rides along.
  function shareLink() {
    var text = shareText(), url = raceUrl(), note = $('#dip-note');
    var copy = function () {
      var all = text + ' ' + url;
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(all).then(function () { note.textContent = 'Race link copied. Paste it in a text.'; }, function () { window.prompt('Copy this link:', all); });
      else window.prompt('Copy this link:', all);
    };
    if (navigator.share) navigator.share({ text: text, url: url }).catch(function (e) { if (e && e.name !== 'AbortError') copy(); });
    else copy();
  }
  function share() {
    var text = shareText(), url = raceUrl(), note = $('#dip-note');
    shareCard().toBlob(function (blob) {
      var file = null;
      try { file = new File([blob], 'buy-the-dip.png', { type: 'image/png' }); } catch (e) { /* old browser */ }
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], text: text + ' ' + url }).catch(function () { /* closed */ });
        return;
      }
      var done = function (copied) {
        note.textContent = copied ? 'Picture copied. Paste it into your post.' : 'Picture saved. Attach it to your post.';
        window.open('https://x.com/intent/post?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(url), '_blank', 'noopener');
      };
      var save = function () { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'buy-the-dip.png'; a.click(); done(false); };
      if (navigator.clipboard && window.ClipboardItem) navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]).then(function () { done(true); }, save);
      else save();
    }, 'image/png');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
})();
