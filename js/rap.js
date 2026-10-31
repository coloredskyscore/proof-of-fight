/* Rap Battle test mode (?rap). MC Satoshi hosts, a DJ spins a new beat each round, and two founders trade
   bars. The host explains the rules, introduces both rappers and has you call a coin toss for who raps first.
   Three rounds, each rapper gets a turn of two couplets. Before each couplet you pick a tier (safe, spicy,
   nuclear) and get a random couplet from it; the riskier the tier, the less likely it lands. The crowd meter
   at the top moves DURING the raps (the crowd laughs, oohs or groans at each punchline); the cheer or boo
   after a turn is just the crowd's verdict.
   At the end the host points at each rapper and the louder crowd wins.
   The rappers "talk" in chiptune babble (one blip per syllable, on the beat), not real or cloned voices. */
(function () {
  if (!/[?&]rap\b/i.test(location.search)) return;
  var D = window.POF_DATA, AU = window.POF_AUDIO, LYRICS = window.POF_RAP_LYRICS, CROWD = window.POF_RAP_CROWD;

  var RAPPERS = ['toly', 'vitalik'];
  var HOST = { name: 'MC Satoshi', face: 'art/satoshi.webp', body: 'art/satoshi-sprite.webp' };

  // Pose art per fighter, made with tools/poses.py from the Grok poses: all on one canvas, so the rapper
  // keeps his size and spot when the pose changes. `stand` is the stage sprite on that canvas. A fighter
  // without poses yet uses his stage sprite, and css/rap.css leans, dims or slumps it per pose.
  var POSES = {
    toly: { stand: 'art/toly-stand.webp', rap: 'art/toly-rap.webp', listen: 'art/toly-listen.webp',
      lose: 'art/toly-lose.webp', win: 'art/toly-win.webp' },
    vitalik: { stand: 'art/vitalik-stand.webp', rap: 'art/vitalik-rap.webp', listen: 'art/vitalik-listen.webp',
      lose: 'art/vitalik-lose.webp', win: 'art/vitalik-win.webp' }
  };

  // Each voice: waveform, base pitch (Hz), the vowel filter's Q, a touch of grit, wobble.
  var VOICE = {
    toly:    { w: 'sawtooth', f: 150, q: 2.5, drive: 1.6, vib: null },
    vitalik: { w: 'square',   f: 270, q: 4,   drive: 0,   vib: [7, 6] },
    host:    { w: 'square',   f: 105, q: 2,   drive: 1.3, vib: null }
  };

  // Odds, how far a landed punchline moves the needle, and the button's one-liner. A miss gets a groan and
  // gives a little back.
  var TIER = {
    safe:     { label: 'Safe',    odds: 0.75, move: 8,  blurb: 'Lame but likable' },
    spicy:    { label: 'Spicy',   odds: 0.5,  move: 14, blurb: 'Real jabs' },
    nuclear:  { label: 'Nuclear', odds: 0.25, move: 24, blurb: 'Controversial' },
    finisher: { label: '',        odds: 0.35, move: 30, blurb: 'Double-time closer' }
  };
  var MISS = 4;
  var CPU_TIERS = [['safe', 0.45], ['spicy', 0.4], ['nuclear', 0.15]];
  var ROUNDS = 3, COUPLETS = 2;
  var LEAD = 2;        // bars of beat before the CPU raps when it opens a round, so you hear the beat first
  var told = false;    // the rules are explained once per visit

  var S = null;
  var $ = function (q, el) { return (el || document).querySelector(q); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function name(id) { return D.FIGHTERS[id].name; }
  function alive(id) { return S && S.id === id; }

  // ---------- Clock ----------
  // The audio clock while sound runs (so words land on the beat), else the page clock.
  function now() { return AU.ready && AU.time > 0 ? AU.time : performance.now() / 1000; }
  function untilTime(t) { return wait(Math.max(0, (t - now()) * 1000)); }
  function nextBar() {
    var t = now() + 0.12, B = S.beat;
    return B.t0 + Math.ceil((t - B.t0) / B.bar) * B.bar;
  }

  // ---------- Beats ----------
  // Three styles. Rounds 1 and 2 get an East Coast and a West Coast beat (in random order), the final round
  // a serious battle beat. Each style draws one of its Suno tracks (cut to loop on a bar line, listed in
  // js/audio.js MUSIC). A track's measured tempo and first downbeat (`down`, seconds into the file) set the
  // grid the rappers' words land on. A style with no track yet, or a track that hasn't loaded by its round,
  // plays its synth stand-in. Both play on the music bus, so the Music switch mutes them.
  var STYLES = { east: 'East Coast', west: 'West Coast', battle: 'Battle beat' };
  var TRACKS = {
    east: [
      { id: 'rap-east-1', name: 'Detroit', bpm: 90.931, down: 0.553 },
      { id: 'rap-east-2', name: 'Glitch Chop', bpm: 86.06, down: 0.522 },
      { id: 'rap-east-3', name: 'Cold Streets', bpm: 93.149, down: 0.539 }
    ],
    west: [
      { id: 'rap-west-1', name: 'Gangsta', bpm: 92.969, down: 0.545 },
      { id: 'rap-west-2', name: 'The Bounce', bpm: 100.06, down: 0.55 },
      { id: 'rap-west-3', name: 'Night Ride', bpm: 88.988, down: 0.544 }
    ],
    battle: [
      { id: 'rap-battle-1', name: 'Final Round', bpm: 90.972, down: 0.553 },
      { id: 'rap-battle-2', name: 'The Riff', bpm: 96.951, down: 0.523 },
      { id: 'rap-battle-3', name: 'Showdown', bpm: 84.246, down: 0.528 }
    ]
  };

  // The synth stand-ins. Each returns a bar's voices (times from the bar's start) given the bar number k and
  // the 16th-note length s.
  function midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function kick(t, v) { return [{ w: 'sine', f: [160, 42], t: t, d: 0.28, v: v || 0.6 }]; }
  function snare(t, tail) {
    return [{ w: 'noise', t: t, d: tail || 0.17, v: 0.3, bp: 1900, q: 0.8 }, { w: 'triangle', f: [210, 160], t: t, d: 0.08, v: 0.28 }];
  }
  function clap(t) {
    return [{ w: 'noise', t: t, d: 0.22, v: 0.32, bp: 1300, q: 0.9 }, { w: 'noise', t: t + 0.012, d: 0.18, v: 0.2, bp: 2200, q: 0.9 }];
  }
  function hat(t, v, open) { return [{ w: 'noise', t: t, d: open ? 0.14 : 0.03, v: v || 0.08, hp: 7500 }]; }
  function swing(i, s) { return i % 2 ? s * 0.16 : 0; } // late off-beat 16ths, the head-nod

  // The West Coast lead: [16th, note, length in 16ths, the note it slides up or down from].
  var WHINE = [
    [[2, 86, 6, 84], [8, 84, 3], [11, 82, 5]],
    [[0, 79, 12, 82]],
    [[2, 86, 5, 84], [7, 89, 4, 86], [11, 86, 5, 89]],
    [[0, 84, 6, 86], [6, 82, 4], [10, 79, 6, 82]]
  ];

  var SYNTH = {
    east: { // The basement: a minor-key piano stab over dusty boom-bap.
      name: 'Basement', bpm: 88,
      bar: function (k, s) {
        var vs = [], chords = [[62, 65, 69], [58, 62, 65], [55, 58, 62], [57, 61, 64]], ch = chords[k % 4], root = ch[0] - 24;
        [0, 3, 8, 11].forEach(function (st, i) {
          if (k % 4 === 3 && i > 1) return; // the turnaround bar breathes
          ch.forEach(function (m) {
            vs.push({ w: 'triangle', f: midi(m), t: st * s, d: 0.55, v: 0.07 });
            vs.push({ w: 'sine', f: midi(m + 12), t: st * s, d: 0.25, v: 0.025 });
          });
        });
        [0, 7, 10].forEach(function (st) {
          vs = vs.concat(kick(st * s));
          vs.push({ w: 'triangle', f: midi(root), t: st * s, d: s * (st ? 2.5 : 6), v: 0.26, lp: 400, hold: 0.6 });
        });
        [4, 12].forEach(function (st) { vs = vs.concat(snare(st * s)); });
        for (var i = 0; i < 16; i += 2) vs = vs.concat(hat(i * s + swing(i / 2, s * 2), i % 4 ? 0.06 : 0.09, i === 14));
        return vs;
      }
    },
    west: { // The lowrider: G-funk. A whiny sliding sine lead, a rubbery bass, soft chords and big claps.
      name: 'Lowrider', bpm: 96,
      bar: function (k, s) {
        var vs = [], minor = k % 2 === 0;
        (minor ? [55, 58, 62, 65] : [60, 63, 67, 70]).forEach(function (m) {   // Gm7, then Cm7
          vs.push({ w: 'triangle', f: midi(m), t: 0, d: s * 7, v: 0.012, a: 0.03, hold: 0.5 });
          vs.push({ w: 'triangle', f: midi(m), t: 10 * s, d: s * 5, v: 0.01, a: 0.02, hold: 0.4 });
        });
        var bass = minor ? [[0, 31, 3], [3, 31, 1], [6, 34, 2], [8, 38, 2], [11, 36, 2], [14, 34, 2]]
          : [[0, 36, 3], [3, 36, 1], [6, 39, 2], [8, 43, 2], [11, 41, 2], [14, 38, 2]];
        bass.forEach(function (n, i) {
          var from = midi(i ? bass[i - 1][1] : n[1]);
          vs.push({ w: 'sawtooth', f: [from, midi(n[1])], fd: 0.04, t: n[0] * s, d: n[2] * s * 0.95, v: 0.15, lp: [480, 170], q: 3, hold: 0.6 });
        });
        WHINE[k % 4].forEach(function (n) {
          var f = [midi(n[3] || n[1]), midi(n[1])];
          vs.push({ w: 'sine', f: f, fd: 0.09, t: n[0] * s, d: n[2] * s, v: 0.016, a: 0.03, hold: 0.75, vib: [5.5, 14] });
          vs.push({ w: 'square', f: f, fd: 0.09, t: n[0] * s, d: n[2] * s, v: 0.003, lp: 2400, a: 0.03, hold: 0.75, vib: [5.5, 14] });
        });
        [0, 6, 10].forEach(function (st) { vs = vs.concat(kick(st * s, 0.42)); });
        [4, 12].forEach(function (st) { vs = vs.concat(clap(st * s)); });
        for (var i = 0; i < 16; i++) vs = vs.concat(hat(i * s + swing(i, s), i % 2 ? 0.02 : 0.04, i === 14));
        return vs;
      }
    },
    battle: { // The last stand: brass stabs, a dark string pad, 808s and a half-time clap with hat rolls.
      name: 'Last Stand', bpm: 84,
      bar: function (k, s) {
        var vs = [], chords = [[60, 63, 67], [56, 60, 63], [58, 62, 65], [55, 59, 62]], ch = chords[k % 4];
        ch.forEach(function (m) {
          [-0.06, 0.06].forEach(function (det) {
            var f = midi(m) * Math.pow(2, det / 12);
            vs.push({ w: 'sawtooth', f: f, t: 0, d: 0.4, v: 0.045, lp: [3000, 700], drive: 1.5 });
            if (k % 2) vs.push({ w: 'sawtooth', f: f, t: 6 * s, d: 0.3, v: 0.035, lp: [3000, 700], drive: 1.5 });
            vs.push({ w: 'sawtooth', f: f / 2, t: 0, d: s * 16, v: 0.012, lp: 1100, a: 0.5, hold: 0.85 });
          });
        });
        var root = midi(ch[0] - 24);
        [0, 10].forEach(function (st) {
          vs = vs.concat(kick(st * s, 0.55));
          vs.push({ w: 'sine', f: [root * 1.5, root], fd: 0.08, t: st * s, d: 1.1, v: 0.38 });
        });
        vs = vs.concat(clap(8 * s));
        for (var i = 0; i < 16; i += 2) vs = vs.concat(hat(i * s, 0.07));
        if (k % 2) for (var r = 0; r < 6; r++) vs = vs.concat(hat(12 * s + r * s * 2 / 3, 0.05)); // the roll
        return vs;
      }
    }
  };

  // Draws the battle's three beats and starts downloading their tracks.
  function setList() {
    var order = Math.random() < 0.5 ? ['east', 'west', 'battle'] : ['west', 'east', 'battle'];
    return order.map(function (style) {
      var pool = TRACKS[style], b = { style: style, track: pool[Math.floor(Math.random() * pool.length)] || null };
      if (b.track && AU.settings.music) b.loading = AU.load(b.track.id).then(function () { b.ready = true; }, function () {});
      return b;
    });
  }
  // Round r's beat once its track has loaded, or the wait gave up: b.def is the track, else the style's synth.
  async function cue(r) {
    var b = S.set[r];
    if (b.loading) await Promise.race([b.loading, wait(3000)]);
    b.def = b.ready ? b.track : SYNTH[b.style];
    return b;
  }

  function startBeat(b, at) {
    var h = b.def.id ? AU.playLoop(b.def.id, at) : null, def = h || !b.def.id ? b.def : SYNTH[b.style]; // music off: the synth's grid
    S.beat = { def: def, bpm: def.bpm, s: 60 / def.bpm / 4, bar: 60 / def.bpm * 4, t0: at + (h ? def.down : 0),
      done: 0, handles: h ? [h] : [] };
    document.documentElement.style.setProperty('--rap-beat', (60 / def.bpm) + 's');
  }
  function stopBeat(fade) {
    if (!S.beat) return;
    S.beat.handles.forEach(function (h) { h.stop(fade || 0.08); });
    S.beat = null;
  }
  // Schedules the synth beat's bars half a second ahead. (A track loops by itself.)
  function tick() {
    if (!S || !S.beat || !S.beat.def.bar) return;
    var B = S.beat, horizon = now() + 0.5;
    while (B.t0 + B.done * B.bar < horizon) {
      var k = B.done++;
      B.handles.push(AU.playVoices(B.def.bar(k, B.s), B.t0 + k * B.bar, 'music'));
      if (B.handles.length > 4) B.handles.shift();
    }
  }

  // ---------- Babble voice ----------
  // Syllables: vowel groups per word, with a silent final e.
  function syllables(word) {
    var w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return [];
    var groups = w.match(/[aeiouy]+/g) || ['a'];
    var n = groups.length;
    if (n > 1 && /[^aeiouy]e$/.test(w) && !/[^aeiouy]le$/.test(w)) n--;
    var out = [];
    for (var i = 0; i < n; i++) out.push({ vowel: groups[Math.min(i, groups.length - 1)][0], hard: i === 0 && /^[^aeiouy]/.test(w) });
    return out;
  }
  // Vowel to filter center: open vowels bright, closed ones dark, so the blips sound like talking.
  var FORMANT = { a: 1100, e: 1700, i: 2200, o: 750, u: 600, y: 2000 };

  // Lays words out from `start`, one syllable per `step`, centered in `slots` steps when given.
  function layout(text, start, step, slots, pause) {
    var words = text.split(/\s+/).map(function (w) { return { text: w, syl: syllables(w) }; });
    var count = words.reduce(function (n, w) { return n + Math.max(1, w.syl.length); }, 0);
    var t = start + (slots ? Math.max(0, Math.floor((slots - count) / 2)) * step : 0);
    words.forEach(function (w) {
      w.t = t;
      t += Math.max(1, w.syl.length) * step;
      if (/[,.?!]$/.test(w.text)) t += pause;
    });
    return { words: words, step: step, end: t };
  }

  function babble(who, lay) {
    var V = VOICE[who] || VOICE.host, vs = [], all = [], t0 = lay.words[0].t;
    lay.words.forEach(function (w) {
      (w.syl.length ? w.syl : [{ vowel: 'a', hard: false }]).forEach(function (s, i) {
        all.push({ t: w.t - t0 + i * lay.step, s: s, loud: /[A-Z]{3,}/.test(w.text) });
      });
    });
    all.forEach(function (x, i) {
      var last = i === all.length - 1;
      // Rap cadence: flat-ish, a lift every fourth syllable, and the last word lands low and long.
      var semis = (i % 4 === 0 ? 2 : 0) + rnd(-1, 1) + (last ? -3 : 0);
      var f = V.f * Math.pow(2, semis / 12);
      var o = { w: V.w, f: [f * 1.04, f], fd: 0.04, t: x.t, d: last ? lay.step * 2.5 : lay.step * 0.85, v: x.loud ? 0.2 : 0.13,
        bp: FORMANT[x.s.vowel] || 1200, q: V.q, a: 0.006, hold: 0.5 };
      if (V.drive) o.drive = V.drive;
      if (V.vib) o.vib = V.vib;
      vs.push(o);
      if (x.s.hard) vs.push({ w: 'noise', t: x.t, d: 0.018, v: 0.08, hp: 3500 }); // the consonant's click
    });
    return AU.playVoices(vs, t0, 'sfx');
  }

  // ---------- Crowd ----------
  function crowdSound(vs) { AU.playVoices(vs, now() + 0.02, 'sfx'); }
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
  function airHorn(at) {
    var vs = [];
    [0, 0.28, 0.56].forEach(function (dt) {
      [466, 470].forEach(function (hf) { vs.push({ w: 'sawtooth', f: hf, t: (at || 0) + dt, d: dt === 0.56 ? 0.5 : 0.2, v: 0.08, lp: 3000, drive: 2 }); });
    });
    return vs;
  }
  function boos(n, v) {
    var vs = [];
    for (var i = 0; i < n; i++) { var f = rnd(120, 190); vs.push({ w: 'sawtooth', f: [f * 1.06, f, f * 0.8], t: rnd(0, 0.25), d: 1.7, v: v || 0.07, lp: 650, a: 0.25, hold: 0.55, vib: [rnd(4, 6), 3] }); }
    return vs;
  }

  // Mid-rap reactions (these move the needle).
  var REACT = {
    // A safe line lands: the crowd laughs, a scatter of "ha"s.
    laugh: function () {
      var vs = [];
      for (var p = 0; p < 7; p++) {
        var f = rnd(170, 380), start = rnd(0, 0.25), n = 3 + Math.floor(rnd(0, 3));
        for (var h = 0; h < n; h++) vs.push({ w: 'triangle', f: [f, f * 0.9], t: start + h * rnd(0.13, 0.17), d: 0.1, v: 0.06, bp: 1000, q: 2 });
      }
      return vs.concat(claps(5, 0.6, 0.1));
    },
    // A spicy line lands: a rising "ooooh".
    ooh: function () {
      var vs = [];
      for (var i = 0; i < 7; i++) { var f = rnd(170, 260); vs.push({ w: 'triangle', f: [f, f * 1.45, f * 1.3], t: rnd(0, 0.1), d: 1.1, v: 0.06, lp: 900, a: 0.12, hold: 0.6, vib: [5, 4] }); }
      return vs.concat(woos(2, 0.4));
    },
    // A nuclear line lands: the crowd loses it.
    ohhh: function () {
      var vs = [];
      for (var i = 0; i < 9; i++) { var f = rnd(160, 250); vs.push({ w: 'sawtooth', f: [f, f * 1.6, f * 1.2], t: rnd(0, 0.1), d: 1.6, v: 0.045, lp: 1100, a: 0.08, hold: 0.6, vib: [5, 5] }); }
      return vs.concat(crowdNoise(2, 0.12), woos(6, 0.3), claps(12, 1.4), airHorn(0.2));
    },
    // A line misses: a low "ehhh" and a cough.
    groan: function () {
      var vs = [];
      for (var i = 0; i < 6; i++) { var f = rnd(150, 210); vs.push({ w: 'sawtooth', f: [f, f * 0.7], t: rnd(0, 0.15), d: 0.9, v: 0.05, lp: 600, a: 0.1, hold: 0.4 }); }
      vs.push({ w: 'noise', t: 0.9, d: 0.08, v: 0.1, bp: 700 }, { w: 'noise', t: 1.02, d: 0.06, v: 0.08, bp: 700 });
      return vs;
    }
  };

  // After a turn (no needle): the crowd's verdict on the whole turn.
  function verdictSound(kind) {
    if (kind === 'cheer') crowdSound(crowdNoise(1.8, 0.13).concat(woos(5), claps(14, 1.3)));
    else if (kind === 'mixed') crowdSound(claps(7, 1.2, 0.1).concat(woos(2), boos(3, 0.05)));
    else crowdSound(boos(7));
  }
  function scratch() { crowdSound([{ w: 'noise', t: 0, d: 0.4, v: 0.45, bp: [3200, 700, 2400, 400], q: 4 }]); }
  // The DJ rewinds and spins up: a scratch back and forth, then a riser.
  function spinUp() {
    crowdSound([
      { w: 'noise', t: 0, d: 0.25, v: 0.4, bp: [600, 3500], q: 4 },
      { w: 'noise', t: 0.25, d: 0.25, v: 0.4, bp: [3500, 500], q: 4 },
      { w: 'noise', t: 0.55, d: 0.12, v: 0.35, bp: [800, 2600], q: 4 },
      { w: 'noise', t: 0.7, d: 0.12, v: 0.35, bp: [2600, 800], q: 4 }
    ]);
  }
  function scatter() { crowdSound(claps(6, 1.6, 0.09).concat(boos(3, 0.045), woos(1, 0.5))); }
  function roar() { crowdSound(crowdNoise(3.2, 0.16).concat(woos(10), woos(6, 1), claps(24, 2.6), airHorn(0.1), airHorn(1.2))); }
  function cheer() { crowdSound(claps(12, 1.2, 0.12).concat(woos(3), crowdNoise(1, 0.08))); }
  // The coin: a thumb flick that rings as it spins, then a clink and a little bounce when it lands.
  function flick() {
    crowdSound([{ w: 'noise', t: 0, d: 0.03, v: 0.2, hp: 4000 }, { w: 'sine', f: 2637, t: 0.01, d: 0.7, v: 0.07 },
      { w: 'sine', f: 3951, t: 0.01, d: 0.4, v: 0.03 }]);
  }
  function clink() {
    crowdSound([{ w: 'noise', t: 0, d: 0.04, v: 0.14, bp: 3000 }, { w: 'sine', f: 2349, t: 0, d: 0.3, v: 0.1 }, { w: 'sine', f: 3520, t: 0, d: 0.18, v: 0.04 },
      { w: 'sine', f: 2349, t: 0.15, d: 0.18, v: 0.05 }, { w: 'sine', f: 2349, t: 0.25, d: 0.12, v: 0.025 }]);
  }

  // ---------- Screen ----------
  function sprite(id) {
    var F = D.FIGHTERS[id], P = POSES[id];
    return '<span class="fig"><img src="' + (P ? P.stand : F.art && F.art.body) + '" alt="' + esc(F.name) + '" decoding="async"></span>';
  }
  // Fetches both rappers' poses up front, so a pose doesn't pop in late the first time it shows.
  function preload() {
    [S.you, S.cpu].forEach(function (id) {
      var P = POSES[id] || {};
      Object.keys(P).forEach(function (k) { new Image().src = P[k]; });
    });
  }
  function build() {
    var old = $('#screen-rap');
    if (old) old.remove();
    var sec = document.createElement('section');
    sec.id = 'screen-rap';
    sec.className = 'screen rap';
    sec.hidden = true;
    sec.innerHTML =
      '<div class="rap-top"><button class="btn btn-ghost btn-sm" id="rap-back" type="button">← Menu</button>' +
        '<span class="rap-round" id="rap-round"></span></div>' +
      '<div class="rap-meter"><span class="rap-mface" id="rap-mface-l"></span>' +
        '<div class="rap-bar" id="rap-bar"><div class="rap-fill" id="rap-fill"></div><div class="rap-mid"></div></div>' +
        '<span class="rap-mface" id="rap-mface-r"></span></div>' +
      '<div class="rap-host" id="rap-host"><span class="rap-hface"><img src="' + HOST.face + '" alt=""></span>' +
        '<div class="rap-hsay"><b>' + esc(HOST.name) + '</b><p id="rap-hline"></p></div>' +
        '</div>' +
      '<div class="rap-stage" id="rap-stage">' +
        '<div class="rap-lyrics" id="rap-lyrics"></div>' +
        '<div class="rapper left" id="rap-l"></div>' +
        '<div class="rapper right" id="rap-r"></div>' +
        '<div class="rap-pop" id="rap-pop" hidden></div>' +
        '<canvas class="rap-crowd" id="rap-crowd" aria-hidden="true"></canvas>' +
      '</div>' +
      '<div class="rap-picks" id="rap-picks"></div>';
    $('#app').appendChild(sec);
    $('#rap-back').addEventListener('click', leave);
    CROWD.mount($('#rap-crowd'), { now: now, beat: function () { return S && S.beat ? { t0: S.beat.t0, len: 60 / S.beat.bpm } : null; } });
  }
  function show(id) { document.querySelectorAll('.screen').forEach(function (el) { el.hidden = el.id !== id; }); }

  function side(id) { return id === S.you ? 'l' : 'r'; }
  function setStage() {
    [['l', S.you], ['r', S.cpu]].forEach(function (p) {
      var F = D.FIGHTERS[p[1]];
      $('#rap-' + p[0]).innerHTML = sprite(p[1]) + '<b>' + esc(F.name) + (p[1] === S.you && !S.picking ? ' <small>you</small>' : '') + '</b>';
      $('#rap-' + p[0]).dataset.id = p[1];
      $('#rap-mface-' + p[0]).innerHTML = '<img src="' + F.art.head + '" alt="">';
      $('#rap-mface-' + p[0]).style.setProperty('--c', F.color);
    });
    $('#rap-bar').style.setProperty('--cl', D.FIGHTERS[S.you].color);
    $('#rap-bar').style.setProperty('--cr', D.FIGHTERS[S.cpu].color);
    CROWD.lights(D.FIGHTERS[S.you].color, D.FIGHTERS[S.cpu].color);
  }
  // Poses: rap, listen, lose, win, or '' for standing by. A Grok pose replaces the image when it exists.
  function pose(id, p) {
    var el = $('#rap-' + side(id)), img = el.querySelector('img'), art = POSES[id] || {};
    var keep = el.classList.contains('pointed') ? ' pointed' : '';
    el.className = 'rapper ' + (side(id) === 'l' ? 'left' : 'right') + (POSES[id] ? ' posed' : '') + (p ? ' ' + p : '') + keep;
    var src = art[p || 'stand'] || D.FIGHTERS[id].art.body;
    if (img.getAttribute('src') !== src) img.src = src;
  }

  function setMeter() {
    $('#rap-fill').style.width = S.meter + '%';
    CROWD.meter(S.meter);
  }
  function moveMeter(who, amt) {
    S.meter = Math.max(2, Math.min(98, S.meter + (who === S.you ? amt : -amt)));
    setMeter();
    var bar = $('#rap-bar');
    bar.classList.remove('nudge');
    void bar.offsetWidth;
    bar.classList.add('nudge');
  }
  function pop(text, kind) {
    var p = $('#rap-pop');
    p.textContent = text;
    p.className = 'rap-pop ' + kind;
    p.hidden = false;
    void p.offsetWidth;
    p.classList.add('go');
  }
  // The crowd's mood (js/rap-crowd.js): hype, wild, laugh, ooh, groan, boo, mixed, or null to just nod along.
  function crowd(mood) { CROWD.mood(mood); }
  // The host points at a rapper: an arrow bounces over their head and the host bar leans their way.
  function point(id) {
    ['l', 'r'].forEach(function (k) { $('#rap-' + k).classList.toggle('pointed', !!id && side(id) === k); });
    $('#rap-host').className = 'rap-host' + (id ? ' to-' + side(id) : '');
  }

  // The host talks at speech speed, not on the beat. Resolves when the line is out, or at once when you skip
  // the intro (S.cut resolves).
  async function host(text, hold) {
    var el = $('#rap-hline'), lay = layout(text, now() + 0.05, 0.085, 0, 0.18), cut = S && S.cut;
    el.innerHTML = lay.words.map(function (w) { return '<span>' + esc(w.text) + '</span>'; }).join(' ');
    $('#rap-host').classList.add('on');
    var voice = babble('host', lay), spans = el.querySelectorAll('span');
    var timers = lay.words.map(function (w, i) { return setTimeout(function () { spans[i].classList.add('on'); }, Math.max(0, (w.t - now()) * 1000)); });
    var skipped = await Promise.race([untilTime(lay.end + 0.15).then(function () { return false; }), cut || new Promise(function () {})]);
    $('#rap-host').classList.remove('on');
    if (skipped) { voice.stop(0.05); timers.forEach(clearTimeout); return; }
    await wait(hold == null ? 350 : hold);
  }

  // ---------- Lines ----------
  // A random couplet from a tier, with no repeats until the tier runs dry.
  function draw(id, tier) {
    var bank = LYRICS[id][tier], used = S.used[id + tier] || (S.used[id + tier] = []);
    if (used.length >= bank.length) used.length = 0;
    var free = bank.map(function (_, i) { return i; }).filter(function (i) { return used.indexOf(i) < 0; });
    var i = free[Math.floor(Math.random() * free.length)];
    used.push(i);
    return { tier: tier, lines: bank[i] };
  }
  function finisher(id) {
    var F = LYRICS[id].finisher;
    return { tier: 'finisher', label: F.name, lines: F.lines, fast: true };
  }
  function bars(id, tier) { return tier === 'finisher' ? finisher(id) : draw(id, tier); }
  // Your three buttons: safe, spicy, and nuclear, or your finisher on the very last pick.
  function options(last) { return ['safe', 'spicy', last ? 'finisher' : 'nuclear']; }
  function cpuPick(last) {
    if (last && Math.random() < 0.3) return finisher(S.cpu);
    var r = Math.random(), acc = 0;
    for (var i = 0; i < CPU_TIERS.length; i++) { acc += CPU_TIERS[i][1]; if (r < acc) return draw(S.cpu, CPU_TIERS[i][0]); }
    return draw(S.cpu, 'safe');
  }

  function pickHTML(id, tier, i) {
    var T = TIER[tier];
    return '<button class="rap-pick tier-' + tier + '" type="button" data-i="' + i + '">' +
      '<b>' + esc(T.label || LYRICS[id].finisher.name) + '</b><span class="rap-odds">' + Math.round(T.odds * 100) + '% odds</span>' +
      '<span class="rap-blurb">' + esc(T.blurb) + '</span></button>';
  }
  // Shows the tiers and resolves with a random couplet from the one you tap: you hear the bars when they're
  // rapped. The beat keeps rolling while you decide.
  function choose(id, tiers, title) {
    var box = $('#rap-picks');
    box.innerHTML = '<p class="rap-your">' + esc(title) + '</p><div class="rap-opts">' +
      tiers.map(function (t, i) { return pickHTML(id, t, i); }).join('') + '</div>';
    return new Promise(function (resolve) {
      box.onclick = function (e) {
        var b = e.target.closest('.rap-pick');
        if (!b) return;
        box.onclick = null;
        AU.play('tap');
        var tier = tiers[+b.dataset.i];
        box.innerHTML = '<p class="rap-your">Locked in</p><div class="rap-opts rap-locked">' + pickHTML(id, tier, 0) + '</div>';
        resolve(bars(id, tier));
      };
    });
  }
  // Heads or tails buttons; resolves with your call.
  function callIt() {
    var box = $('#rap-picks');
    box.innerHTML = '<p class="rap-your">Call the toss</p><div class="rap-calls">' + ['heads', 'tails'].map(function (c) {
      return '<button class="btn btn-big rap-callbtn" type="button" data-c="' + c + '">' + (c === 'heads' ? 'Heads' : 'Tails') + '</button>';
    }).join('') + '</div>';
    return new Promise(function (resolve) {
      box.onclick = function (e) {
        var b = e.target.closest('.rap-callbtn');
        if (!b) return;
        box.onclick = null;
        AU.play('tap');
        resolve(b.dataset.c);
      };
    });
  }
  function waiting(text) { $('#rap-picks').innerHTML = '<p class="rap-wait">' + esc(text) + '</p>'; }

  // Raps one couplet on the beat: karaoke words light up as the babble hits them. At the punchline the
  // crowd reacts and the needle moves. Resolves true if it landed.
  async function couplet(who, pick) {
    var B = S.beat, box = $('#rap-lyrics'), step = pick.fast ? B.s / 2 : B.s, slots = pick.fast ? 32 : 16;
    var start = nextBar(), t = start, lays = [];
    pick.lines.forEach(function (line) {
      var lay = layout(line, t, step, slots, pick.fast ? 0 : B.s);
      lays.push(lay);
      t = start + Math.ceil((lay.end - start - 0.001) / B.bar) * B.bar; // a long line spills into the next bar
    });
    box.className = 'rap-lyrics ' + (who === S.you ? 'from-l' : 'from-r') + (pick.fast ? ' fast' : '');
    box.innerHTML = lays.map(function (lay) {
      return '<p>' + lay.words.map(function (w) { return '<span>' + esc(w.text) + '</span>'; }).join(' ') + '</p>';
    }).join('');
    var spans = box.querySelectorAll('span'), k = 0;
    lays.forEach(function (lay) {
      babble(who, lay);
      lay.words.forEach(function (w) {
        var el = spans[k++];
        setTimeout(function () { el.classList.add('on'); }, Math.max(0, (w.t - now()) * 1000));
      });
    });
    await untilTime(lays[lays.length - 1].end);
    var T = TIER[pick.tier], landed = Math.random() < T.odds;
    if (landed) {
      var r = pick.tier === 'safe' ? 'laugh' : pick.tier === 'spicy' ? 'ooh' : 'ohhh';
      crowdSound(REACT[r]());
      crowd(r === 'ohhh' ? 'wild' : r);
      pop(r === 'laugh' ? 'HA HA HA' : r === 'ooh' ? 'OOOOH!' : 'OHHHHH!', 'land');
      moveMeter(who, T.move);
    } else {
      crowdSound(REACT.groan());
      crowd('groan');
      pop('EHHH...', 'miss');
      moveMeter(who, -MISS);
    }
    setTimeout(function () { if (S) crowd(null); }, 1300);
    return landed;
  }

  // One rapper's turn. `opens`: first turn of the round, so if the CPU has it the beat rides a little first.
  async function turn(who, round, opens) {
    var mine = who === S.you, other = who === S.you ? S.cpu : S.you, landed = 0, last = round === ROUNDS - 1;
    pose(who, 'rap');
    pose(other, 'listen');
    point(null);
    var next = mine ? choose(who, options(false), 'Your opening bars') : Promise.resolve(cpuPick(false));
    if (!mine) {
      waiting(name(who) + ' has the mic');
      if (opens) await untilTime(S.beat.t0 + LEAD * S.beat.bar - 0.3); // nextBar() then lands on bar LEAD
      if (!S) return 0;
    }
    for (var c = 0; c < COUPLETS; c++) {
      var pick = await next;
      if (!S) return 0;
      // The next pick goes up while this couplet plays, so you choose your follow-up on the beat.
      if (c < COUPLETS - 1) next = mine ? choose(who, options(last && c + 1 === COUPLETS - 1), lastPickTitle(last && c + 1 === COUPLETS - 1)) : Promise.resolve(cpuPick(last));
      else if (mine) waiting('Finish strong');
      if (await couplet(who, pick)) landed++;
      if (!S) return 0;
    }
    await wait(900);
    pose(who, '');
    pose(other, '');
    // The crowd's verdict on the turn. It doesn't move the needle; the raps already did.
    var v = landed === COUPLETS ? 'cheer' : landed ? 'mixed' : 'boo';
    verdictSound(v);
    crowd(v === 'cheer' ? 'hype' : v === 'boo' ? 'boo' : 'mixed');
    pop(v === 'cheer' ? 'CHEERS!' : v === 'boo' ? 'BOOOO!' : 'SOME LOVE', v === 'boo' ? 'miss' : v === 'cheer' ? 'land' : 'meh');
    await wait(1800);
    crowd(null);
    $('#rap-pop').hidden = true;
    return landed;
  }
  function lastPickTitle(finisherUp) { return finisherUp ? 'Your closer' : 'Your next bars'; }

  // The host's opening: the rules (once per visit), then each rapper steps up. A rematch gets one line.
  // Skip intro cuts it short.
  async function intro(rematch) {
    var me = S, steps = [];
    function say(text, hold) { steps.push(function () { return host(text, hold); }); }
    function act(fn) { steps.push(fn); }
    me.cut = new Promise(function (r) { me.skip = r; });
    $('#rap-picks').innerHTML = '<button class="btn btn-ghost btn-sm rap-skip" id="rap-skip" type="button">Skip intro ›</button>';
    $('#rap-skip').onclick = function () { AU.play('tap'); me.skipped = true; me.skip(true); waiting(''); };
    if (rematch) say('Run it back! Same two rappers, fresh beats.');
    else {
      say('Welcome to the Proof of Fight rap battle!', 0);
      act(function () { cheer(); crowd('hype'); return wait(900); });
      if (!told) {
        say('Here is how it works. Three rounds, and the DJ drops a fresh beat every round.');
        say('Each round, both rappers get one turn on the mic.');
        say('Pick your bars. Safe is corny, nuclear is controversial.');
        say('Riskier bars land less, but hit way harder. Win the crowd, win the battle!');
      }
      [S.you, S.cpu].forEach(function (who, i) {
        act(function () { crowd(null); point(who); return wait(150); });
        say((i ? 'And in this corner, ' : 'In this corner, ') + LYRICS[who].intro + '...', 100);
        say(name(who).toUpperCase() + '!', 0);
        act(function () { cheer(); crowd('hype'); return wait(1300); });
        act(function () { point(null); return wait(150); });
      });
    }
    for (var i = 0; i < steps.length && alive(me.id) && !me.skipped; i++) await steps[i]();
    if (!alive(me.id)) return;
    told = true;
    me.cut = null;
    point(null);
    pose(S.you, '');
    pose(S.cpu, '');
    crowd(null);
    waiting('');
  }

  // The coin toss: you call it, the coin flips, and whoever wins the toss raps first.
  async function toss() {
    var id = S.id, el = $('#rap-lyrics');
    el.className = 'rap-lyrics';
    el.innerHTML = '<div class="rap-toss"><div class="rap-arc" id="rap-arc"><div class="rap-coin" id="rap-coin">' +
      '<span class="heads"><img src="' + HOST.face + '" alt=""></span><span class="tails">POF</span></div></div></div>' +
      '<p class="rap-sub" id="rap-tsay">Heads or tails?</p>';
    var calling = callIt();
    await host('Coin toss decides who raps first. ' + name(S.you) + ', call it!', 0);
    var call = await calling;
    if (!alive(id)) return null;
    var side = Math.random() < 0.5 ? 'heads' : 'tails', first = side === call ? S.you : S.cpu;
    waiting('');
    $('#rap-tsay').textContent = 'You called ' + call + '...';
    $('#rap-coin').style.setProperty('--end', (side === 'heads' ? 1800 : 1980) + 'deg');
    $('#rap-arc').classList.add('go');
    $('#rap-coin').classList.add('go');
    flick();
    await wait(1320); // it lands (css/rap.css times the toss)
    if (!alive(id)) return null;
    clink();
    $('#rap-tsay').innerHTML = '<b class="rap-side">' + side.toUpperCase() + '!</b>';
    await wait(350);
    point(first);
    await host(side === 'heads' ? 'Heads!' : 'Tails!', 0);
    if (!alive(id)) return null;
    await host(first === S.you ? name(S.you) + ' called it and takes the mic first.' : name(S.cpu) + ' wins the toss and raps first.', 500);
    point(null);
    return first;
  }

  async function battle(rematch) {
    var id = S.id;
    setStage();
    pose(S.you, '');
    pose(S.cpu, '');
    $('#rap-lyrics').className = 'rap-lyrics';
    $('#rap-lyrics').innerHTML = '<p class="rap-call">' + esc(name(S.you)) + ' vs ' + esc(name(S.cpu)) + '</p><p class="rap-sub">Three rounds · Rap Battle</p>';
    $('#rap-round').textContent = 'Rap Battle';
    await intro(rematch);
    if (!alive(id)) return;
    var first = await toss();
    if (!alive(id) || !first) return;
    for (var r = 0; r < ROUNDS; r++) {
      if (!alive(id)) return;
      var beat = await cue(r);
      if (!alive(id)) return;
      $('#rap-round').textContent = 'Round ' + (r + 1) + ' of ' + ROUNDS;
      $('#rap-lyrics').innerHTML = '<p class="rap-call">Round ' + (r + 1) + '</p><p class="rap-sub">' +
        esc(STYLES[beat.style] + ' · ' + beat.def.name) + '</p>';
      if (r > 0) { stopBeat(0.3); scratch(); }
      await host(r === 0 ? 'DJ, spin it!' : r === ROUNDS - 1 ? 'Final round! DJ, bring it home!' : 'Round two! DJ, next beat!', 100);
      if (!alive(id)) return;
      spinUp();
      startBeat(beat, now() + 1.1);
      await wait(1100);
      var order = r % 2 ? [first === S.you ? S.cpu : S.you, first] : [first, first === S.you ? S.cpu : S.you];
      for (var o = 0; o < 2; o++) {
        if (!alive(id)) return;
        await turn(order[o], r, o === 0);
        if (!alive(id)) return;
        if (o === 0) await host(name(order[1]) + ', your turn!', 150);
      }
    }
    if (!alive(id)) return;
    await finale();
  }

  async function finale() {
    var id = S.id, youWin = S.meter >= 50, winner = youWin ? S.you : S.cpu, loser = youWin ? S.cpu : S.you;
    stopBeat(0.6);
    scratch();
    $('#rap-round').textContent = 'The decision';
    $('#rap-lyrics').innerHTML = '';
    waiting('The crowd decides');
    await host('Alright, alright! Who took it? Make some noise for...', 200);
    if (!alive(id)) return;
    point(loser);
    await host(name(loser) + '!', 0);
    scatter();
    crowd('mixed');
    await wait(2200);
    if (!alive(id)) return;
    crowd(null);
    point(winner);
    await host('And ' + name(winner) + '!', 0);
    roar();
    crowd('hype');
    pose(winner, 'win');
    pose(loser, 'lose');
    point(null);
    await wait(2600);
    if (!alive(id)) return;
    $('#rap-lyrics').className = 'rap-lyrics';
    $('#rap-lyrics').innerHTML = '<p class="rap-result">' + esc(name(winner).toUpperCase()) + ' WINS THE CROWD</p>' +
      '<p class="rap-sub">' + (youWin ? 'You took it.' : 'The crowd went the other way.') + '</p>';
    $('#rap-picks').innerHTML = '<button class="btn btn-gold btn-big" id="rap-again" type="button">Run it back</button>' +
      '<button class="btn btn-ghost" id="rap-switch" type="button">Switch rappers</button>';
    $('#rap-again').onclick = function () { AU.play('tap'); begin(S.you, true); };
    $('#rap-switch').onclick = function () { AU.play('tap'); pickRapper(); };
  }

  // ---------- Flow ----------
  function pickRapper() {
    stopAll();
    S = { id: Math.random(), meter: 50, used: {}, you: RAPPERS[0], cpu: RAPPERS[1], picking: true };
    setStage();
    $('#rap-round').textContent = 'Rap Battle';
    $('#rap-lyrics').className = 'rap-lyrics';
    $('#rap-lyrics').innerHTML = '<p class="rap-call">Pick your rapper</p>';
    $('#rap-hline').textContent = 'Who is stepping up to the mic?';
    point(null);
    setMeter();
    $('#rap-picks').innerHTML = '<div class="rap-choose">' + RAPPERS.map(function (id) {
      var F = D.FIGHTERS[id];
      return '<button class="rap-choice" type="button" data-id="' + id + '" style="--c:' + F.color + '">' +
        '<img src="' + F.art.head + '" alt=""><b>' + esc(F.name) + '</b><small>' + esc(LYRICS[id].finisher.name) + '</small></button>';
    }).join('') + '</div>';
    $('#rap-picks').onclick = function (e) {
      var b = e.target.closest('.rap-choice');
      if (!b) return;
      $('#rap-picks').onclick = null;
      AU.play('tap');
      begin(b.dataset.id);
    };
  }
  function begin(you, rematch) {
    stopAll();
    S = { id: Math.random(), meter: 50, used: {}, you: you, cpu: RAPPERS.filter(function (r) { return r !== you; })[0], set: setList() };
    S.ticker = setInterval(tick, 100);
    preload();
    $('#rap-picks').onclick = null;
    setMeter();
    crowd(null);
    battle(rematch);
  }
  function stopAll() {
    if (!S) return;
    clearInterval(S.ticker);
    stopBeat(0.1);
    S = null;
  }
  function open() {
    build();
    show('screen-rap');
    CROWD.start();
    AU.stopMusic(0.4);
    pickRapper();
  }
  function leave() {
    stopAll();
    CROWD.stop();
    show('screen-title');
    AU.music('menu', { from: 'loop', fade: 0.8 });
  }

  // The title gets a Rap Battle button while ?rap is in the URL.
  function addButton() {
    var story = $('#btn-story');
    if (!story || $('#btn-rap')) return;
    var b = document.createElement('button');
    b.id = 'btn-rap';
    b.type = 'button';
    b.className = 'btn btn-big btn-arcade btn-rap';
    b.innerHTML = '<svg class="ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0a3 3 0 0 1 3 3v4a3 3 0 0 1-6 0V3a3 3 0 0 1 3-3zM3 6.5h1.5V7a3.5 3.5 0 0 0 7 0v-.5H13V7a5 5 0 0 1-4.25 4.94V14H11v2H5v-2h2.25v-2.06A5 5 0 0 1 3 7z"/></svg>Rap Battle <small>Test</small>';
    story.insertAdjacentElement('afterend', b);
    b.addEventListener('click', open);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton); else addButton();
})();
