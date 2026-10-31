/* Guitar Battle test mode (?guitar). A proof of concept for the timing feel, on code-made audio.
   Two founders trade guitar parts over a backing band. Three rounds, one turn each per round. At the start of
   your turn you pick a part (Rhythm, Riff or Solo, never the same one twice in a row), then strum on each note
   as it reaches the ring. The guitar part is scheduled ahead in sync with the band, so a tap never starts a
   sound late: the tap only decides whether the note is judged a hit. A miss chokes the note with a clank and
   the guitar drops out until your next hit. The crowd meter moves on every note. A short calibration on first
   play measures the delay between the audio clock and your taps (speakers, Bluetooth, touch screen) and the
   game shifts both the judging and the scrolling notes by it.
   MC Satoshi hosts. The guitars here are drawn in code over the stage sprites until the Grok poses arrive. */
(function () {
  if (!/[?&]guitar\b/i.test(location.search)) return;
  var D = window.POF_DATA, AU = window.POF_AUDIO;

  var PLAYERS = ['toly', 'vitalik'];
  var HOST = { name: 'MC Satoshi', face: 'art/satoshi.webp' };
  var STAND = { toly: 'art/toly-stand.webp', vitalik: 'art/vitalik-stand.webp' }; // one canvas, real heights

  // Signature guitars, drawn over the stage sprite: where the guitar's center sits on the 670x1100 canvas
  // (percent), its width (percent of the canvas) and its tilt.
  var AXE = {
    toly:    { x: 47, y: 55, w: 74, r: -17 },
    vitalik: { x: 37, y: 52, w: 74, r: -19 }
  };

  // The three parts. `max` is how far a flawless turn moves the needle; a miss costs `miss`. `cpu` is the
  // CPU's hit rate. Harder parts swing the crowd harder both ways.
  var PART = {
    rhythm: { label: 'Rhythm', blurb: 'Palm-muted chugs', diff: 'Easy',   max: 12, miss: 1.0, cpu: 0.93, color: '#3aa8e8' },
    riff:   { label: 'Riff',   blurb: 'The hook',         diff: 'Medium', max: 18, miss: 1.3, cpu: 0.84, color: '#e0559f' },
    solo:   { label: 'Solo',   blurb: 'Shred it',         diff: 'Hard',   max: 26, miss: 1.6, cpu: 0.72, color: '#ff7a3d' }
  };
  var GOOD_SHARE = 0.6;     // a good (not perfect) hit is worth this much of a perfect one
  var STRAY = 0.5;          // a tap with no note near it: mashing costs you
  var PERFECT = 0.06, GOOD = 0.13, NEAR = 0.22; // hit windows, seconds either side
  var ROUND_BPM = [108, 118, 128];
  var ROUNDS = 3, PART_BARS = 4;
  var LOOK = 0.12;          // how far ahead guitar notes are scheduled (short, so a miss mutes the next note)
  var SHOW = 1.7;           // seconds of notes visible on the lane
  var OFFSET_KEY = 'pof-guitar-offset';
  var told = false;

  var S = null;
  var $ = function (q, el) { return (el || document).querySelector(q); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function name(id) { return D.FIGHTERS[id].name; }
  function alive(id) { return S && S.id === id; }
  function midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // ---------- Clock and delay ----------
  function now() { return AU.ready && AU.time > 0 ? AU.time : performance.now() / 1000; }
  function untilTime(t) { return wait(Math.max(0, (t - now()) * 1000)); }
  // A tap's time on the audio clock: the event's own timestamp, so a slow frame doesn't make you late.
  function tapTime(e) {
    var lag = e && e.timeStamp ? Math.max(0, Math.min(0.1, (performance.now() - e.timeStamp) / 1000)) : 0;
    return now() - lag;
  }
  function loadOffset() {
    try { var v = parseFloat(localStorage.getItem(OFFSET_KEY)); return isFinite(v) ? v : null; } catch (e) { return null; }
  }
  function saveOffset(v) { try { localStorage.setItem(OFFSET_KEY, String(v)); } catch (e) { /* private window: per visit */ } }
  function guessOffset() { return Math.min(0.3, (AU.latency || 0) + 0.03); }
  var offset = loadOffset();

  // ---------- Sounds ----------
  function kick(t, v) { return [{ w: 'sine', f: [150, 40], t: t, d: 0.25, v: v || 0.6 }, { w: 'noise', t: t, d: 0.02, v: 0.12, lp: 2500 }]; }
  function snare(t) { return [{ w: 'noise', t: t, d: 0.16, v: 0.32, bp: 1800, q: 0.7 }, { w: 'triangle', f: [230, 170], t: t, d: 0.08, v: 0.3 }]; }
  function hat(t, v) { return [{ w: 'noise', t: t, d: 0.035, v: v || 0.06, hp: 7500 }]; }
  function crash(t) { return [{ w: 'noise', t: t, d: 1.3, v: 0.11, hp: 4500, hold: 0.1 }]; }

  // The progression, one chord per bar: Em, C, D, Em. Guitar roots (E2, C3, D3, E2) and the keys' triads.
  var ROOT = [40, 48, 50, 40];
  var PAD = [[52, 55, 59], [48, 52, 55], [50, 54, 57], [52, 55, 59]];

  // One bar of the band: drums, an eighth-note bass and a soft keys pad. Times from the bar's start.
  function bandBar(k, s) {
    var vs = [], r = ROOT[k % 4];
    if (k % 4 === 0) vs = vs.concat(crash(0));
    [0, 8].concat(k % 2 ? [10] : [6]).forEach(function (st) { vs = vs.concat(kick(st * s)); });
    [4, 12].forEach(function (st) { vs = vs.concat(snare(st * s)); });
    for (var i = 0; i < 16; i += 2) vs = vs.concat(hat(i * s, i % 4 ? 0.04 : 0.07));
    for (var j = 0; j < 8; j++) vs.push({ w: 'sawtooth', f: midi(r - 12), t: j * 2 * s, d: s * 1.8, v: 0.13, lp: 420, q: 2, hold: 0.6 });
    PAD[k % 4].forEach(function (m) { vs.push({ w: 'triangle', f: midi(m), t: 0, d: s * 16, v: 0.018, a: 0.08, hold: 0.8 }); });
    return vs;
  }
  // Drum sticks clicking the count-in.
  function sticks(at, beat) {
    var vs = [];
    for (var i = 0; i < 4; i++) vs.push({ w: 'noise', t: i * beat, d: 0.03, v: 0.25, bp: 2600, q: 3 }, { w: 'triangle', f: 1900, t: i * beat, d: 0.03, v: 0.08 });
    AU.playVoices(vs, at, 'music');
  }

  // Guitar tones. A power chord (root, fifth, octave, each doubled and detuned) through heavy drive; palm
  // muting closes the filter and cuts it short.
  function chord(r, d, mute, t) {
    var vs = [];
    [r, r + 7, r + 12].forEach(function (m) {
      [-0.09, 0.09].forEach(function (det) {
        vs.push({ w: 'sawtooth', f: midi(m + det), t: t || 0, d: d, v: mute ? 0.05 : 0.042, drive: 5, lp: mute ? [1100, 500] : [3400, 1800], q: 1, a: 0.003, hold: mute ? 0.15 : 0.7 });
      });
    });
    return vs;
  }
  // A single note: low riff notes or the lead. `from` bends up into it; long notes get vibrato.
  function note(m, d, opts) {
    opts = opts || {};
    var f = opts.from ? [midi(opts.from), midi(m)] : midi(m), lead = m >= 60, vs = [];
    [-0.06, 0.06].forEach(function (det) {
      var o = { w: 'sawtooth', f: Array.isArray(f) ? f.map(function (x) { return x * Math.pow(2, det / 12); }) : f * Math.pow(2, det / 12),
        t: opts.t || 0, d: d, v: lead ? 0.07 : 0.075, drive: lead ? 3 : 4.5, lp: lead ? 3600 : 2300, a: 0.004, hold: 0.75 };
      if (opts.from) o.fd = Math.min(0.16, d * 0.4);
      if (d > 0.3 && lead) o.vib = [5.5, midi(m) * 0.012];
      vs.push(o);
    });
    return vs;
  }
  // A missed note: a sour, choked strum.
  function clank() {
    return [{ w: 'sawtooth', f: [midi(41), midi(40)], d: 0.22, v: 0.07, drive: 4, lp: 1700 },
      { w: 'sawtooth', f: midi(46), d: 0.2, v: 0.06, drive: 4, lp: 1700 },
      { w: 'noise', d: 0.12, v: 0.16, bp: [3200, 700], q: 2 }];
  }
  // A tap with no note near it: dead strings.
  function chk() { return [{ w: 'noise', d: 0.05, v: 0.22, bp: 1500, q: 1.5 }, { w: 'square', f: 82, d: 0.04, v: 0.04, lp: 600 }]; }

  function sfx(vs, at) { return AU.playVoices(vs, at || now() + 0.01, 'sfx'); }
  function claps(n, spread, v) {
    var vs = [];
    for (var k = 0; k < n; k++) vs.push({ w: 'noise', t: rnd(0, spread), d: 0.03, v: v || 0.14, bp: rnd(1100, 1800) });
    return vs;
  }
  function crowdNoise(d, v) {
    var vs = [];
    for (var i = 0; i < 5; i++) vs.push({ w: 'noise', t: rnd(0, 0.15), d: d, v: v, bp: rnd(900, 2600), q: 0.7, a: 0.25, hold: 0.5 });
    return vs;
  }
  function woos(n, from) {
    var vs = [];
    for (var j = 0; j < n; j++) { var f = rnd(500, 900); vs.push({ w: 'sine', f: [f, f * 1.7, f * 1.3], t: (from || 0) + rnd(0, 0.6), d: rnd(0.4, 0.7), v: 0.05, vib: [6, 12] }); }
    return vs;
  }
  function boos(n, v) {
    var vs = [];
    for (var i = 0; i < n; i++) { var f = rnd(120, 190); vs.push({ w: 'sawtooth', f: [f * 1.06, f, f * 0.8], t: rnd(0, 0.25), d: 1.5, v: v || 0.06, lp: 650, a: 0.25, hold: 0.55, vib: [rnd(4, 6), 3] }); }
    return vs;
  }
  function groan() {
    var vs = [];
    for (var i = 0; i < 4; i++) { var f = rnd(150, 210); vs.push({ w: 'sawtooth', f: [f, f * 0.75], t: rnd(0, 0.1), d: 0.6, v: 0.04, lp: 600, a: 0.08, hold: 0.4 }); }
    return vs;
  }
  function cheer() { sfx(claps(12, 1.2, 0.12).concat(woos(3), crowdNoise(1, 0.08))); }
  function roar() { sfx(crowdNoise(3, 0.15).concat(woos(10), woos(6, 1), claps(24, 2.6))); }
  function scatter() { sfx(claps(6, 1.6, 0.09).concat(boos(3, 0.045), woos(1, 0.5))); }

  // ---------- Charts ----------
  // Each part is four bars of taps. A tap: when (16ths from the part's start), what it plays (voices from
  // the tap's time, given the 16th length and that bar's root), how long it rings (16ths, for the tail on
  // the lane) and its look (n: a note, run: a quick three-note run, bend).
  function rhythmChart() {
    var taps = [];
    for (var b = 0; b < PART_BARS; b++) {
      for (var q = 0; q < 4; q++) {
        var accent = b === PART_BARS - 1 && q >= 2;
        taps.push({ at: b * 16 + q * 4, len: accent ? 3 : 0, kind: 'n', play: accent
          ? function (s, r) { return chord(r, s * 3.6, false); }
          : function (s, r) { return chord(r, s * 1.1, true).concat(chord(r, s * 1.1, true, s * 2)); } });
      }
    }
    return taps;
  }
  // The riff: a power chord, then a walk up the E minor pentatonic (G, A, B), the same shape every bar
  // over the band's changes, and a big open chord to close.
  function riffChart() {
    var taps = [], RIFF = [[0, 'pc', 3], [3, 43, 2], [6, 45, 2], [8, 'pc', 2], [11, 47, 2], [14, 45, 2]],
      LAST = [[0, 'pc', 3], [3, 43, 2], [6, 45, 2], [8, 'pc', 2], [12, 'pc', 4]];
    for (var b = 0; b < PART_BARS; b++) {
      (b === PART_BARS - 1 ? LAST : RIFF).forEach(function (n) {
        taps.push({ at: b * 16 + n[0], len: n[2] >= 3 ? n[2] : 0, kind: 'n', play: n[1] === 'pc'
          ? function (s, r) { return chord(r, s * n[2] * 0.95, false); }
          : function (s) { return note(n[1], s * n[2] * 0.95); } });
      });
    }
    return taps;
  }
  // The solo: E minor pentatonic up high. [16th, note or run, length in 16ths, bend from].
  var SOLO = [
    [[0, 76, 4, 74], [6, 74, 2], [8, 71, 2], [10, [69, 71, 74]], [14, 76, 2]],
    [[0, 79, 3], [4, 76, 2], [6, 74, 2], [8, [71, 69, 67]], [12, 69, 2], [14, 71, 2]],
    [[0, 74, 2], [2, 76, 2], [4, 79, 2], [6, 76, 2], [8, [74, 76, 79]], [12, 81, 4, 79]],
    [[0, [79, 76, 74]], [4, 71, 2], [6, 69, 2], [8, 76, 8, 74]]
  ];
  function soloChart() {
    var taps = [];
    SOLO.forEach(function (bar, b) {
      bar.forEach(function (n) {
        var run = Array.isArray(n[1]);
        taps.push({ at: b * 16 + n[0], len: run ? 2 : n[2] >= 3 ? n[2] : 0, kind: run ? 'run' : n[3] ? 'bend' : 'n',
          play: run ? function (s) { return [].concat.apply([], n[1].map(function (m, i) { return note(m, s * 0.95, { t: i * s }); })); }
            : function (s) { return note(n[1], s * n[2] * 0.95, { from: n[3] }); } });
      });
    });
    return taps;
  }
  var CHART = { rhythm: rhythmChart, riff: riffChart, solo: soloChart };

  // ---------- Screen ----------
  function guitarSVG(id) {
    if (id === 'vitalik') {
      // A diamond body in Ethereum-ish blues.
      return '<svg viewBox="0 0 200 64" class="axe-svg" aria-hidden="true">' +
        '<rect x="58" y="27" width="124" height="10" rx="2" fill="#3b2a1e" stroke="#07060b" stroke-width="3"/>' +
        [74, 88, 101, 113, 124, 134, 143, 151, 158, 165].map(function (x) { return '<rect x="' + x + '" y="28" width="1.6" height="8" fill="#c9c3d6"/>'; }).join('') +
        '<path d="M180 24 L198 20 L198 44 L180 40 Z" fill="#454a75" stroke="#07060b" stroke-width="3"/>' +
        '<path d="M34 2 L64 32 L34 62 L4 32 Z" fill="#8c8cf0" stroke="#07060b" stroke-width="3.5"/>' +
        '<path d="M34 2 L64 32 L34 40 Z" fill="#c8c8ff"/><path d="M34 40 L64 32 L34 62 Z" fill="#454a75"/>' +
        '<path d="M34 2 L4 32 L34 40 Z" fill="#a6a6f7"/><path d="M34 40 L4 32 L34 62 Z" fill="#62688f"/>' +
        '<rect x="22" y="28" width="5" height="9" fill="#07060b"/><rect x="38" y="28" width="5" height="9" fill="#07060b"/>' +
        '<line x1="20" y1="32" x2="196" y2="32" stroke="#e8e4f2" stroke-width="1"/></svg>';
    }
    // An offset double-cutaway in a purple-to-teal fade.
    return '<svg viewBox="0 0 200 64" class="axe-svg" aria-hidden="true"><defs><linearGradient id="axe-sol" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#9945ff"/><stop offset="1" stop-color="#14f195"/></linearGradient></defs>' +
      '<rect x="58" y="27" width="124" height="10" rx="2" fill="#3b2a1e" stroke="#07060b" stroke-width="3"/>' +
      [74, 88, 101, 113, 124, 134, 143, 151, 158, 165].map(function (x) { return '<rect x="' + x + '" y="28" width="1.6" height="8" fill="#c9c3d6"/>'; }).join('') +
      '<path d="M180 24 L198 18 L198 44 L180 40 Z" fill="#14f195" stroke="#07060b" stroke-width="3"/>' +
      '<path d="M8 14 C14 2 34 4 44 12 C52 6 62 6 70 14 C64 20 60 26 62 32 C60 38 64 44 72 50 C62 60 48 58 42 52 C32 62 8 62 4 46 C0 34 2 22 8 14 Z" fill="url(#axe-sol)" stroke="#07060b" stroke-width="3.5"/>' +
      '<rect x="20" y="24" width="6" height="16" rx="1" fill="#07060b"/><rect x="36" y="24" width="6" height="16" rx="1" fill="#07060b"/>' +
      '<path d="M14 44 C22 52 40 52 48 44" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="3"/>' +
      '<line x1="18" y1="32" x2="196" y2="32" stroke="#e8e4f2" stroke-width="1"/></svg>';
  }
  function player(id, sideCls) {
    var A = AXE[id] || AXE.toly;
    return '<div class="gtr-fig"><div class="gtr-flip"><img src="' + STAND[id] + '" alt="' + esc(name(id)) + '" decoding="async">' +
      '<div class="gtr-axe" style="left:' + A.x + '%;top:' + A.y + '%;width:' + A.w + '%;--r:' + A.r + 'deg">' + guitarSVG(id) + '</div></div></div>' +
      '<b>' + esc(name(id)) + (sideCls === 'l' ? ' <small>you</small>' : '') + '</b>';
  }
  // The backing band as backlit silhouettes: bass on the left, the drummer in the middle, keys on the right.
  function bandSVG() {
    var dark = '#07060b';
    return '<svg class="gtr-band" viewBox="0 0 400 150" preserveAspectRatio="xMidYMax meet" aria-hidden="true">' +
      '<g class="bm bass"><circle cx="70" cy="44" r="13" fill="' + dark + '"/><path d="M52 60 Q70 54 88 60 L92 118 L80 150 L60 150 L48 118 Z" fill="' + dark + '"/>' +
        '<path d="M44 104 L118 62 L121 66 L48 110 Z" fill="' + dark + '"/><ellipse cx="54" cy="104" rx="16" ry="11" fill="' + dark + '"/></g>' +
      '<g class="bm drums"><circle cx="200" cy="40" r="13" fill="' + dark + '"/><path d="M182 56 Q200 50 218 56 L222 100 L178 100 Z" fill="' + dark + '"/>' +
        '<g class="arm l"><path d="M184 62 L160 84 L164 88 L188 68 Z" fill="' + dark + '"/><path d="M162 86 L150 70" stroke="' + dark + '" stroke-width="3"/></g>' +
        '<g class="arm r"><path d="M216 62 L240 84 L236 88 L212 68 Z" fill="' + dark + '"/><path d="M238 86 L250 70" stroke="' + dark + '" stroke-width="3"/></g>' +
        '<ellipse cx="200" cy="124" rx="34" ry="26" fill="' + dark + '"/><ellipse cx="156" cy="98" rx="20" ry="6" fill="' + dark + '"/><ellipse cx="246" cy="96" rx="22" ry="5" fill="' + dark + '"/>' +
        '<rect x="154" y="98" width="4" height="52" fill="' + dark + '"/><rect x="244" y="96" width="4" height="54" fill="' + dark + '"/>' +
        '<ellipse cx="140" cy="76" rx="22" ry="4" fill="' + dark + '" class="cym"/><rect x="138" y="76" width="3" height="74" fill="' + dark + '"/></g>' +
      '<g class="bm keys"><circle cx="330" cy="46" r="13" fill="' + dark + '"/><path d="M312 62 Q330 56 348 62 L350 108 L310 108 Z" fill="' + dark + '"/>' +
        '<rect x="288" y="98" width="86" height="12" rx="2" fill="' + dark + '"/><path d="M296 110 L290 150 M366 110 L372 150" stroke="' + dark + '" stroke-width="4"/></g>' +
      '</svg>';
  }
  function build() {
    var old = $('#screen-gtr');
    if (old) old.remove();
    var sec = document.createElement('section');
    sec.id = 'screen-gtr';
    sec.className = 'screen gtr';
    sec.hidden = true;
    sec.innerHTML =
      '<div class="rap-top"><button class="btn btn-ghost btn-sm" id="gtr-back" type="button">← Menu</button>' +
        '<span class="rap-round" id="gtr-round">Guitar Battle</span></div>' +
      '<div class="rap-meter"><span class="rap-mface" id="gtr-mface-l"></span>' +
        '<div class="rap-bar" id="gtr-bar"><div class="rap-fill" id="gtr-fill"></div><div class="rap-mid"></div></div>' +
        '<span class="rap-mface" id="gtr-mface-r"></span></div>' +
      '<div class="rap-host" id="gtr-host"><span class="rap-hface"><img src="' + HOST.face + '" alt=""></span>' +
        '<div class="rap-hsay"><b>' + esc(HOST.name) + '</b><p id="gtr-hline"></p></div></div>' +
      '<div class="gtr-stage" id="gtr-stage">' + bandSVG() +
        '<div class="gtr-spot l" id="gtr-spot-l"></div><div class="gtr-spot r" id="gtr-spot-r"></div>' +
        '<div class="gtr-info" id="gtr-info"></div>' +
        '<div class="gtr-player left" id="gtr-l"></div><div class="gtr-player right" id="gtr-r"></div>' +
        '<div class="rap-pop" id="gtr-pop" hidden></div>' +
      '</div>' +
      '<div class="rap-crowd gtr-crowd" id="gtr-crowd">' + Array.apply(null, Array(16)).map(function (_, i) { return '<i style="--d:' + (i % 3) * 0.08 + 's;--h:' + (180 + i * 37 % 140) + '"></i>'; }).join('') + '</div>' +
      '<div class="gtr-lane" id="gtr-lane"><canvas id="gtr-canvas"></canvas><span class="gtr-judge" id="gtr-judge"></span></div>' +
      '<div class="rap-picks gtr-picks" id="gtr-picks"></div>';
    $('#app').appendChild(sec);
    $('#gtr-back').addEventListener('click', leave);
    $('#gtr-lane').addEventListener('pointerdown', function (e) { strum(e); });
  }
  function show(id) { document.querySelectorAll('.screen').forEach(function (el) { el.hidden = el.id !== id; }); }
  function side(id) { return id === S.you ? 'l' : 'r'; }

  function setStage() {
    [['l', S.you], ['r', S.cpu]].forEach(function (p) {
      var F = D.FIGHTERS[p[1]];
      $('#gtr-' + p[0]).innerHTML = player(p[1], S.picking ? '' : p[0]);
      $('#gtr-mface-' + p[0]).innerHTML = '<img src="' + F.art.head + '" alt="">';
      $('#gtr-mface-' + p[0]).style.setProperty('--c', F.color);
    });
    $('#gtr-bar').style.setProperty('--cl', D.FIGHTERS[S.you].color);
    $('#gtr-bar').style.setProperty('--cr', D.FIGHTERS[S.cpu].color);
  }
  // Poses (stand-ins until the Grok art): play, listen, lose, win, or '' for standing by.
  function pose(id, p) {
    var el = $('#gtr-' + side(id));
    el.className = 'gtr-player ' + (side(id) === 'l' ? 'left' : 'right') + (p ? ' ' + p : '');
  }
  function spot(id) {
    ['l', 'r'].forEach(function (k) { $('#gtr-spot-' + k).classList.toggle('on', !!id && side(id) === k); });
  }
  function info(html) { $('#gtr-info').innerHTML = html; }
  function setMeter() { $('#gtr-fill').style.width = S.meter + '%'; }
  function moveMeter(who, amt) {
    S.meter = Math.max(2, Math.min(98, S.meter + (who === S.you ? amt : -amt)));
    setMeter();
  }
  function pop(text, kind) {
    var p = $('#gtr-pop');
    p.textContent = text;
    p.className = 'rap-pop ' + kind;
    p.hidden = false;
    void p.offsetWidth;
    p.classList.add('go');
  }
  function judge(text, kind) {
    var j = $('#gtr-judge');
    j.textContent = text;
    j.className = 'gtr-judge ' + kind;
    void j.offsetWidth;
    j.classList.add('go');
  }
  function crowd(mood) {
    var c = $('#gtr-crowd');
    c.classList.remove('hype', 'boo', 'laugh', 'mixed');
    if (mood) { void c.offsetWidth; c.classList.add(mood); }
    clearTimeout(crowd.t);
    if (mood) crowd.t = setTimeout(function () { if (S) c.classList.remove(mood); }, 1400);
  }
  function setBeat(bpm) { document.documentElement.style.setProperty('--rap-beat', (60 / bpm) + 's'); }

  // The host: words light up at speech speed with a soft blip each. Resolves when the line is out.
  async function host(text, hold) {
    var el = $('#gtr-hline'), words = text.split(/\s+/), id = S && S.id;
    el.innerHTML = words.map(function (w) { return '<span>' + esc(w) + '</span>'; }).join(' ');
    $('#gtr-host').classList.add('on');
    var spans = el.querySelectorAll('span');
    for (var i = 0; i < spans.length; i++) {
      if (!alive(id) || S.skipped) break;
      spans[i].classList.add('on');
      sfx([{ w: 'square', f: [112, 100], t: 0, d: 0.06, v: 0.06, bp: 900 + (i % 3) * 300, q: 2 }]);
      await wait(/[,.!?]$/.test(words[i]) ? 230 : 140);
    }
    for (var k = 0; k < spans.length; k++) spans[k].classList.add('on');
    $('#gtr-host').classList.remove('on');
    if (alive(id) && !S.skipped) await wait(hold == null ? 350 : hold);
  }
  function waiting(text) { $('#gtr-picks').innerHTML = '<p class="rap-wait">' + esc(text) + '</p>'; }

  // ---------- Band ----------
  function startBand(bpm, at) {
    S.band = { bpm: bpm, s: 60 / bpm / 4, bar: 240 / bpm, t0: at, done: 0, handles: [] };
    setBeat(bpm);
  }
  function stopBand(fade) {
    if (!S.band) return;
    S.band.handles.forEach(function (h) { h.stop(fade || 0.1); });
    S.band = null;
  }
  function nextBar(after) {
    var B = S.band, t = (after || now()) + 0.1;
    return B.t0 + Math.ceil((t - B.t0) / B.bar) * B.bar;
  }
  function barIndex(t) { return Math.round((t - S.band.t0) / S.band.bar); }

  // Runs every 25ms: schedules the band half a second ahead, guitar notes LOOK ahead, and judges notes
  // the player let go by.
  function tick() {
    if (!S) return;
    var t = now(), B = S.band;
    if (B) {
      while (B.t0 + B.done * B.bar < t + 0.5) {
        var k = B.done++;
        B.handles.push(AU.playVoices(bandBar(k, B.s), B.t0 + k * B.bar, 'music'));
        if (B.handles.length > 4) B.handles.shift();
      }
    }
    var T = S.turn;
    if (!T) return;
    T.notes.forEach(function (n) {
      if (!n.sched && n.t < t + LOOK) {
        n.sched = true;
        if (T.cpu && n.cpu === 'miss') n.handle = AU.playVoices(clank(), n.t, 'sfx');
        else n.handle = AU.playVoices(scale(n.play(B ? B.s : 0.125, ROOT[n.bar % 4]), T.muted && !T.cpu ? 0.12 : 1), n.t, 'music');
      }
      if (T.cpu && !n.judged && t >= n.t + offsetNow()) land(n, n.cpu, n.cpu === 'miss' ? 0 : n.cpuErr);
      if (!T.cpu && !n.judged && t > n.t + offsetNow() + GOOD) land(n, 'miss');
    });
  }
  function scale(vs, k) { return k === 1 ? vs : vs.map(function (v) { return Object.assign({}, v, { v: (v.v == null ? 0.3 : v.v) * k }); }); }
  function offsetNow() { return offset == null ? guessOffset() : offset; }

  // ---------- Turns ----------
  // Lays a part's chart on the band's clock from bar `startBar`.
  function chartFor(part, at) {
    var B = S.band, start = barIndex(at);
    return CHART[part]().map(function (tp) {
      return { t: at + tp.at * B.s, bar: start + Math.floor(tp.at / 16), len: tp.len * B.s, kind: tp.kind, play: tp.play };
    });
  }
  // A note is judged: the needle moves and the crowd reacts to streaks and slumps.
  function land(n, grade, err) {
    var T = S.turn, P = PART[T.part];
    n.judged = grade;
    n.err = err || 0;
    var val = P.max / T.notes.length;
    if (grade === 'miss') {
      if (!T.cpu) {
        if (n.handle) n.handle.stop(0.03);
        sfx(clank());
        T.muted = true;
      }
      T.streak = 0;
      T.slump++;
      moveMeter(T.who, -P.miss);
      if (T.slump >= 3 && T.slump % 2 === 1) { sfx(boos(4, 0.05)); crowd('boo'); pop('BOOO!', 'miss'); }
      else if (T.slump === 1) sfx(groan());
      judge('MISS', 'miss');
    } else {
      T.hits++;
      T.muted = false;
      T.slump = 0;
      T.streak++;
      moveMeter(T.who, grade === 'perfect' ? val : val * GOOD_SHARE);
      if (T.streak % 6 === 0) { sfx(woos(T.streak >= 12 ? 4 : 2).concat(claps(6, 0.8, 0.1))); crowd('hype'); if (T.streak >= 12) pop('ON FIRE!', 'land'); }
      judge(grade === 'perfect' ? 'PERFECT' : 'GOOD', grade);
    }
  }

  // Your tap or keypress. Judged against the nearest note you haven't played, shifted by your delay.
  function strum(e) {
    if (e && e.cancelable) e.preventDefault();
    if (S && S.calib) { S.calib.taps.push(tapTime(e)); flash(); return; }
    var T = S && S.turn;
    if (!T || T.cpu) return;
    var t = tapTime(e) - offsetNow(), best = null, bd = 9;
    T.notes.forEach(function (n) {
      if (n.judged) return;
      var d = t - n.t;
      if (Math.abs(d) < Math.abs(bd)) { bd = d; best = n; }
    });
    flash();
    if (best && Math.abs(bd) <= GOOD) { land(best, Math.abs(bd) <= PERFECT ? 'perfect' : 'good', bd); return; }
    if (best && Math.abs(bd) <= NEAR) { judge(bd < 0 ? 'EARLY' : 'LATE', 'off'); }
    // A stray strum: dead strings, the streak breaks and the guitar drops out.
    sfx(chk());
    T.streak = 0;
    T.muted = true;
    moveMeter(T.who, -STRAY);
  }
  function flash() {
    var l = $('#gtr-lane');
    l.classList.remove('hit');
    void l.offsetWidth;
    l.classList.add('hit');
  }
  function onKey(e) {
    if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!(e.code === 'Space' || e.code === 'Enter' || /^Key[A-Z]$/.test(e.code))) return;
    if (!S || !(S.calib || (S.turn && !S.turn.cpu))) return;
    strum(e);
  }

  // ---------- The lane ----------
  // Notes slide right to left and reach the ring when you hear them.
  function draw() {
    if (!S) return;
    S.raf = requestAnimationFrame(draw);
    var cv = $('#gtr-canvas'), box = cv.parentNode, dpr = window.devicePixelRatio || 1;
    var W = box.clientWidth, H = box.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    var hx = Math.max(44, W * 0.16), cy = H / 2, pps = (W - hx) / SHOW, t = now() - offsetNow();
    // Beat lines from the band's clock.
    if (S.band) {
      var beat = S.band.bar / 4, first = Math.ceil((t - 0.3 - S.band.t0) / beat);
      for (var b = first; ; b++) {
        var bt = S.band.t0 + b * beat, x = hx + (bt - t) * pps;
        if (x > W) break;
        if (x < 0) continue;
        g.fillStyle = b % 4 === 0 ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.08)';
        g.fillRect(x - 1, 6, 2, H - 12);
      }
    }
    // The ring.
    var pulse = S.band ? Math.max(0, 1 - ((t - S.band.t0) / (S.band.bar / 4) % 1) * 3) : 0;
    g.lineWidth = 4;
    g.strokeStyle = 'rgba(255,210,63,' + (0.55 + pulse * 0.45) + ')';
    g.beginPath(); g.arc(hx, cy, 17 + pulse * 3, 0, Math.PI * 2); g.stroke();
    if (S.calib) {
      S.calib.clicks.forEach(function (ct) {
        var x = hx + (ct - t) * pps;
        if (x < -20 || x > W + 20) return;
        dot(g, x, cy, 13, '#ffd23f', ct < t - 0.05 ? 0.35 : 1);
      });
    }
    var T = S.turn;
    if (!T) return;
    var col = PART[T.part].color;
    for (var i = T.notes.length - 1; i >= 0; i--) {
      var n = T.notes[i], nx = hx + (n.t - t) * pps;
      if (nx > W + 30 || nx + n.len * pps < -30) continue;
      if (n.judged && n.judged !== 'miss') {
        // A hit: the tail keeps ringing past the ring, the head bursts.
        var age = t - n.t;
        if (n.len) { g.fillStyle = col; g.globalAlpha = 0.5; g.fillRect(hx, cy - 5, Math.max(0, nx + n.len * pps - hx), 10); g.globalAlpha = 1; }
        if (age < 0.25) { g.strokeStyle = n.judged === 'perfect' ? '#fff' : col; g.lineWidth = 3; g.globalAlpha = 1 - age * 4; g.beginPath(); g.arc(hx, cy, 18 + age * 90, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1; }
        continue;
      }
      var c = n.judged === 'miss' ? '#55506a' : col;
      if (n.len) { g.fillStyle = c; g.globalAlpha = 0.55; g.fillRect(nx, cy - 6, n.len * pps, 12); g.globalAlpha = 1; }
      if (n.kind === 'run') { dot(g, nx + 14, cy, 6, c, 0.8); dot(g, nx + 25, cy, 5, c, 0.6); }
      dot(g, nx, cy, 13, c, 1);
      if (n.kind === 'bend') { g.strokeStyle = '#fff'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(nx - 5, cy + 4); g.quadraticCurveTo(nx + 1, cy + 3, nx + 4, cy - 6); g.stroke(); }
    }
  }
  function dot(g, x, y, r, c, a) {
    g.globalAlpha = a;
    g.fillStyle = '#07060b'; g.beginPath(); g.arc(x, y + 2, r + 2.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.35, r * 0.35, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
  }

  // ---------- Calibration ----------
  // Ten clicks; tap on each one you hear. The median gap between the clicks and your taps is your delay.
  async function calibrate() {
    var id = S.id, beat = 0.6, t0 = now() + 1.4, clicks = [];
    for (var i = 0; i < 10; i++) clicks.push(t0 + i * beat);
    S.calib = { clicks: clicks, taps: [] };
    info('<p class="rap-call">Sync check</p><p class="rap-sub">Tap on each click you hear, not when the dot hits the ring.</p>');
    $('#gtr-picks').innerHTML = '<button class="btn btn-big gtr-strum" id="gtr-cal-tap" type="button" style="--c:var(--gold)">TAP</button>' +
      '<button class="btn btn-ghost btn-sm rap-skip" id="gtr-cal-skip" type="button">Skip</button>';
    $('#gtr-cal-tap').addEventListener('pointerdown', strum);
    var skipped = false;
    $('#gtr-cal-skip').onclick = function () { skipped = true; };
    var saved = offset;
    offset = 0; // while measuring, the dots are drawn on the raw audio clock
    clicks.forEach(function (ct) { sfx([{ w: 'square', f: 1760, d: 0.05, v: 0.12, lp: 6000 }, { w: 'noise', d: 0.02, v: 0.1, hp: 4000 }], ct); });
    while (alive(id) && !skipped && now() < clicks[clicks.length - 1] + 0.6) await wait(50);
    if (!alive(id)) return;
    var gaps = S.calib.taps.map(function (tp) {
      var near = clicks.reduce(function (a, c) { return Math.abs(tp - c) < Math.abs(tp - a) ? c : a; }, clicks[0]);
      return tp - near;
    }).filter(function (d, i) { return i >= 1 && d > -0.15 && d < 0.4; }).sort(function (a, b) { return a - b; });
    S.calib = null;
    if (skipped || gaps.length < 4) {
      offset = saved != null ? saved : guessOffset();
      info('<p class="rap-call">Sync skipped</p><p class="rap-sub">Using ' + Math.round(offset * 1000) + ' ms. Recalibrate any time from the end screen.</p>');
    } else {
      offset = Math.max(0, Math.min(0.35, gaps[Math.floor(gaps.length / 2)]));
      saveOffset(offset);
      info('<p class="rap-call">Synced</p><p class="rap-sub">Your delay is ' + Math.round(offset * 1000) + ' ms. The notes are shifted to match.</p>');
    }
    waiting('');
    await wait(1600);
  }

  // ---------- Battle ----------
  // Your part buttons; resolves with the part you tap. The one you just played is locked.
  function choose(last) {
    var box = $('#gtr-picks');
    box.innerHTML = '<p class="rap-your">Pick your part</p><div class="rap-opts">' + Object.keys(PART).map(function (k) {
      var P = PART[k], off = k === last;
      return '<button class="rap-pick gtr-part" type="button" data-k="' + k + '" style="background:' + P.color + '"' + (off ? ' disabled' : '') + '>' +
        '<b>' + P.label + '</b><span class="rap-odds">' + (off ? 'Just played' : P.diff) + '</span><span class="rap-blurb">' + P.blurb + '</span></button>';
    }).join('') + '</div>';
    return new Promise(function (resolve) {
      box.onclick = function (e) {
        var b = e.target.closest('.gtr-part');
        if (!b || b.disabled) return;
        box.onclick = null;
        AU.play('tap');
        resolve(b.dataset.k);
      };
    });
  }
  function cpuPart(last) {
    var opts = [['rhythm', 0.25], ['riff', 0.4], ['solo', 0.35]].filter(function (o) { return o[0] !== last; });
    var sum = opts.reduce(function (a, o) { return a + o[1]; }, 0), r = Math.random() * sum;
    for (var i = 0; i < opts.length; i++) { r -= opts[i][1]; if (r < 0) return opts[i][0]; }
    return opts[0][0];
  }

  async function turn(who, round) {
    var id = S.id, mine = who === S.you, other = mine ? S.cpu : S.you;
    spot(who);
    pose(who, 'ready');
    pose(other, 'listen');
    var part;
    if (mine) part = await choose(S.last[who]);
    else {
      waiting(name(who) + ' is picking a part');
      await wait(900);
      part = cpuPart(S.last[who]);
    }
    if (!alive(id)) return;
    S.last[who] = part;
    var P = PART[part], at = nextBar(now() + 0.2) + S.band.bar; // one bar of lead so the notes scroll in
    info('<p class="rap-call" style="color:' + P.color + '">' + esc(name(who)) + ': ' + P.label + '</p><p class="rap-sub">Round ' + (round + 1) + ' · ' + S.band.bpm + ' BPM</p>');
    var T = { who: who, part: part, cpu: !mine, notes: chartFor(part, at), hits: 0, streak: 0, slump: 0, muted: false };
    if (T.cpu) T.notes.forEach(function (n) {
      var r = Math.random();
      n.cpu = r < P.cpu ? (r < P.cpu * 0.5 ? 'perfect' : 'good') : 'miss';
      n.cpuErr = n.cpu === 'perfect' ? rnd(-0.03, 0.03) : rnd(-0.1, 0.1);
    });
    S.turn = T;
    if (mine) {
      $('#gtr-picks').innerHTML = '<button class="btn btn-big gtr-strum" id="gtr-strum" type="button" style="--c:' + P.color + '">STRUM</button>' +
        '<p class="rap-your gtr-hint">Tap the lane, this button, or press Space</p>';
      $('#gtr-strum').addEventListener('pointerdown', strum);
    } else waiting(name(who) + ' is playing ' + P.label.toLowerCase());
    await untilTime(at - 0.05);
    if (!alive(id)) return;
    pose(who, 'play');
    var end = T.notes[T.notes.length - 1];
    await untilTime(end.t + end.len + offsetNow() + GOOD + 0.25);
    if (!alive(id)) return;
    S.turn = null;
    pose(who, '');
    pose(other, '');
    // The crowd's verdict on the turn. It doesn't move the needle; the notes already did.
    var acc = T.hits / T.notes.length;
    info('<p class="rap-call" style="color:' + P.color + '">' + Math.round(acc * 100) + '% in sync</p><p class="rap-sub">' + esc(name(who)) + ' · ' + P.label + '</p>');
    if (acc >= 0.9) { cheer(); crowd('hype'); pop('CROWD GOES WILD', 'land'); }
    else if (acc >= 0.7) { sfx(claps(10, 1.2, 0.1).concat(woos(1))); crowd('mixed'); pop('SOLID', 'meh'); }
    else { sfx(boos(7)); crowd('boo'); pop('BOOOO!', 'miss'); }
    waiting('');
    await wait(1700);
    $('#gtr-pop').hidden = true;
  }

  async function intro(rematch) {
    var me = S;
    $('#gtr-picks').innerHTML = '<button class="btn btn-ghost btn-sm rap-skip" id="gtr-skip" type="button">Skip intro ›</button>';
    $('#gtr-skip').onclick = function () { AU.play('tap'); me.skipped = true; waiting(''); };
    var lines = rematch ? ['Run it back! Same two guitarists.'] : ['Welcome to the Proof of Fight guitar battle!'];
    if (!rematch && !told) lines.push('Three rounds. Each round, both players take one turn.', 'Pick a part. Rhythm is easy, Riff is tricky, Solo is wild.',
      'Strum on every note. Play in sync and the crowd is yours. Miss and they let you know!');
    if (!rematch) lines.push('In this corner, ' + name(S.you) + '! And in this corner, ' + name(S.cpu) + '!');
    for (var i = 0; i < lines.length && alive(me.id) && !me.skipped; i++) {
      await host(lines[i]);
      if (i === 0 || i === lines.length - 1) { cheer(); crowd('hype'); }
    }
    if (!alive(me.id)) return;
    told = true;
    me.skipped = false;
    waiting('');
  }

  async function battle(rematch) {
    var id = S.id;
    setStage();
    info('<p class="rap-call">' + esc(name(S.you)) + ' vs ' + esc(name(S.cpu)) + '</p><p class="rap-sub">Three rounds · Guitar Battle</p>');
    if (offset == null) { await calibrate(); if (!alive(id)) return; }
    await intro(rematch);
    if (!alive(id)) return;
    for (var r = 0; r < ROUNDS; r++) {
      var bpm = ROUND_BPM[r], beat = 60 / bpm;
      $('#gtr-round').textContent = 'Round ' + (r + 1) + ' of ' + ROUNDS;
      info('<p class="rap-call">Round ' + (r + 1) + '</p><p class="rap-sub">' + bpm + ' BPM</p>');
      await host(r === 0 ? 'Band, hit it!' : r === ROUNDS - 1 ? 'Final round! Turn it up!' : 'Round two! Pick up the pace!', 100);
      if (!alive(id)) return;
      var at = now() + 0.3;
      sticks(at, beat);
      startBand(bpm, at + beat * 4);
      await untilTime(at + beat * 4);
      if (!alive(id)) return;
      var order = r % 2 ? [S.cpu, S.you] : [S.you, S.cpu];
      for (var o = 0; o < 2; o++) {
        await turn(order[o], r);
        if (!alive(id)) return;
        if (o === 0) await host(name(order[1]) + ', show them what you got!', 100);
        if (!alive(id)) return;
      }
      stopBand(0.8);
      spot(null);
      await wait(600);
      if (!alive(id)) return;
    }
    await finale();
  }

  async function finale() {
    var id = S.id, youWin = S.meter >= 50, winner = youWin ? S.you : S.cpu, loser = youWin ? S.cpu : S.you;
    $('#gtr-round').textContent = 'The decision';
    info('');
    waiting('The crowd decides');
    await host('Who took it? Make some noise for...', 200);
    if (!alive(id)) return;
    spot(loser);
    await host(name(loser) + '!', 0);
    scatter();
    crowd('mixed');
    await wait(2000);
    if (!alive(id)) return;
    spot(winner);
    await host('And ' + name(winner) + '!', 0);
    roar();
    crowd('hype');
    pose(winner, 'win');
    pose(loser, 'lose');
    await wait(2400);
    if (!alive(id)) return;
    info('<p class="rap-result">' + esc(name(winner).toUpperCase()) + ' WINS THE CROWD</p><p class="rap-sub">' + (youWin ? 'You took it.' : 'The crowd went the other way.') + '</p>');
    $('#gtr-picks').innerHTML = '<button class="btn btn-gold btn-big" id="gtr-again" type="button">Run it back</button>' +
      '<div class="gtr-row"><button class="btn btn-ghost" id="gtr-switch" type="button">Switch guitarist</button>' +
      '<button class="btn btn-ghost" id="gtr-recal" type="button">Recalibrate</button></div>';
    $('#gtr-again').onclick = function () { AU.play('tap'); begin(S.you, true); };
    $('#gtr-switch').onclick = function () { AU.play('tap'); pickPlayer(); };
    $('#gtr-recal').onclick = function () { AU.play('tap'); offset = null; begin(S.you, true); };
  }

  // ---------- Flow ----------
  function pickPlayer() {
    stopAll();
    S = { id: Math.random(), meter: 50, you: PLAYERS[0], cpu: PLAYERS[1], picking: true, last: {} };
    setStage();
    spot(null);
    setMeter();
    $('#gtr-round').textContent = 'Guitar Battle';
    info('<p class="rap-call">Pick your guitarist</p><p class="rap-sub">Test build · code-made band</p>');
    $('#gtr-hline').textContent = 'Who is plugging in tonight?';
    $('#gtr-picks').innerHTML = '<div class="rap-choose">' + PLAYERS.map(function (id) {
      var F = D.FIGHTERS[id];
      return '<button class="rap-choice" type="button" data-id="' + id + '" style="--c:' + F.color + '">' +
        '<img src="' + F.art.head + '" alt=""><b>' + esc(F.name) + '</b></button>';
    }).join('') + '</div>';
    $('#gtr-picks').onclick = function (e) {
      var b = e.target.closest('.rap-choice');
      if (!b) return;
      $('#gtr-picks').onclick = null;
      AU.play('tap');
      begin(b.dataset.id);
    };
  }
  function begin(you, rematch) {
    stopAll();
    S = { id: Math.random(), meter: 50, you: you, cpu: PLAYERS.filter(function (p) { return p !== you; })[0], last: {} };
    S.ticker = setInterval(tick, 25);
    S.raf = requestAnimationFrame(draw);
    $('#gtr-picks').onclick = null;
    setMeter();
    battle(rematch);
  }
  function stopAll() {
    if (!S) return;
    clearInterval(S.ticker);
    cancelAnimationFrame(S.raf);
    stopBand(0.1);
    S = null;
  }
  function open() {
    build();
    show('screen-gtr');
    AU.stopMusic(0.4);
    document.addEventListener('keydown', onKey);
    pickPlayer();
  }
  function leave() {
    stopAll();
    document.removeEventListener('keydown', onKey);
    show('screen-title');
    AU.music('menu', { from: 'loop', fade: 0.8 });
  }

  // The title gets a Guitar Battle button while ?guitar is in the URL.
  function addButton() {
    var story = $('#btn-story');
    if (!story || $('#btn-gtr')) return;
    var b = document.createElement('button');
    b.id = 'btn-gtr';
    b.type = 'button';
    b.className = 'btn btn-big btn-arcade btn-gtr';
    b.innerHTML = '<svg class="ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M14.6.3l1.1 1.1-1.3 1.6-1 .1-3.2 3.2.4.4c.9-.3 1.9-.1 2.5.6.9.9.8 2.4-.2 3.3-.5.5-1.2.8-1.7.8-.2.7-.6 1.4-1.2 2-1.6 1.6-4.4 1.8-6 .2s-1.4-4.4.2-6c.6-.6 1.3-1 2-1.2 0-.5.3-1.2.8-1.7.9-1 2.4-1.1 3.3-.2.7.6.9 1.6.6 2.5l.4.4L13.5 2.4l.1-1zM5.2 9.4l-.9.9 1.4 1.4.9-.9z"/></svg>Guitar Battle <small>Test</small>';
    var after = $('#btn-rap') || story;
    after.insertAdjacentElement('afterend', b);
    b.addEventListener('click', open);
  }
  if (/[?&]debug\b/i.test(location.search)) window.POF_GUITAR = { state: function () { return S; }, offset: offsetNow }; // for test bots
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton); else addButton();
})();
