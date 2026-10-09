// Proof of Fight — music and sound effects.
// Music: two songs (audio/menu.mp3, audio/fight.mp3) cut by tools/music.py into seamless loops.
// Sound effects: synthesized retro arcade sounds, no files. Each sound is a list of "voices":
//   w     wave: 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise'
//   f     pitch in Hz, or [from, to, ...] to sweep across the voice's length (or over fd seconds)
//   t     start, seconds after the sound starts       d   length in seconds
//   v     volume 0..1    a  attack seconds    hold  fraction of d at full volume before the fade
//   lp / hp / bp   low-, high-, band-pass filter in Hz (or a sweep)    q  filter resonance
//   vib   [rate Hz, depth Hz] vibrato        drive  grit (wave shaper amount)
(function (root, factory) {
  var A = factory();
  if (typeof module === 'object' && module.exports) module.exports = A;
  else root.POF_AUDIO = A;
})(this, function () {
  'use strict';

  // Notes, so melodies read like melodies.
  var N = {
    C2: 65.41, F2: 87.31, G2: 98, A2: 110, C3: 130.81, G3: 196,
    C4: 261.63, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392, A4: 440, B4: 493.88,
    C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, B5: 987.77,
    C6: 1046.5, D6: 1174.66, E6: 1318.51, G6: 1567.98, B6: 1975.53, C7: 2093, E7: 2637.02
  };

  // A run of notes sharing one voice style: notes are [pitch, start, length, volume?].
  function seq(base, notes) {
    return notes.map(function (n) {
      var v = Object.assign({}, base, { f: n[0], t: n[1], d: n[2] });
      if (n[3] != null) v.v = n[3];
      return v;
    });
  }
  function at(t, voices) { return voices.map(function (v) { return Object.assign({}, v, { t: (v.t || 0) + t }); }); }
  function cat() { return [].concat.apply([], arguments); }

  // ---------- Shared sounds ----------
  var GAVEL = [{ w: 'noise', d: 0.07, v: 0.7, lp: 2500 }, { w: 'sine', f: [260, 140], d: 0.12, v: 0.6 }];
  var REGISTER = [{ w: 'noise', d: 0.05, v: 0.3, hp: 5000 },
    { w: 'square', f: N.C7, t: 0.05, d: 0.1, v: 0.14, lp: 6000 }, { w: 'square', f: N.E7, t: 0.1, d: 0.45, v: 0.14, lp: 6000 }];
  var STOMP = [{ w: 'sine', f: [120, 50], d: 0.12, v: 0.7 }, { w: 'noise', d: 0.06, v: 0.3, lp: 1500 }];

  var SFX = {
    tap: [{ w: 'square', f: 1200, d: 0.04, v: 0.1, lp: 4000 }],
    hit: [{ w: 'sine', f: [180, 45], d: 0.16, v: 0.8 }, { w: 'noise', d: 0.06, v: 0.4, lp: 3000 },
      { w: 'square', f: [110, 50], d: 0.07, v: 0.18 }],
    heavy: [{ w: 'sine', f: [140, 35], d: 0.32, v: 0.95 }, { w: 'noise', d: 0.14, v: 0.55, lp: [5000, 300] },
      { w: 'sawtooth', f: [90, 40], d: 0.12, v: 0.22, drive: 3 }],
    stomp: STOMP,
    whiff: [{ w: 'noise', d: 0.22, v: 0.35, bp: [600, 3500], q: 1.5 }],
    bonk: [{ w: 'triangle', f: [520, 260], d: 0.14, v: 0.5 }, { w: 'square', f: [260, 130], d: 0.08, v: 0.14 }],
    hide: [{ w: 'sine', f: [500, 1800], d: 0.2, v: 0.3 }, { w: 'noise', d: 0.15, v: 0.1, hp: 4000 }],
    flop: seq({ w: 'square', v: 0.2, lp: 1800 }, [[N.G4, 0, 0.12], [N.E4, 0.13, 0.12], [N.C4, 0.26, 0.3]]),
    selfhit: [{ w: 'triangle', f: [180, 520], d: 0.25, v: 0.3, vib: [12, 40] }],
    ko: [{ w: 'sine', f: [110, 28], d: 1.2, v: 1 }, { w: 'noise', d: 0.8, v: 0.6, lp: [4000, 150] },
      { w: 'sawtooth', f: N.A2, t: 0.15, d: 0.9, v: 0.12, lp: [3000, 400], drive: 2 },
      { w: 'sawtooth', f: 165, t: 0.15, d: 0.9, v: 0.1, lp: [3000, 400], drive: 2 }],
    slam: [{ w: 'sine', f: [90, 25], d: 1.4, v: 1 }, { w: 'noise', d: 1.2, v: 0.55, lp: [8000, 300] },
      { w: 'square', f: [55, 30], d: 0.6, v: 0.25 }],
    ready: cat(seq({ w: 'square', v: 0.13, lp: 5000 }, [[N.C5, 0, 0.1], [N.E5, 0.06, 0.1], [N.G5, 0.12, 0.1], [N.C6, 0.18, 0.1]]),
      [{ w: 'triangle', f: N.C6, t: 0.24, d: 0.4, v: 0.15 }]),
    win: cat(seq({ w: 'square', v: 0.14, lp: 5000 }, [[N.G4, 0, 0.12], [N.C5, 0.1, 0.12], [N.E5, 0.2, 0.12], [N.G5, 0.3, 0.12]]),
      [{ w: 'square', f: N.C6, t: 0.42, d: 0.6, v: 0.14, lp: 5000, hold: 0.5, vib: [6, 8] },
        { w: 'triangle', f: N.C3, t: 0.42, d: 0.6, v: 0.25, hold: 0.5 }]),
    lose: seq({ w: 'sawtooth', v: 0.16, lp: 1200, hold: 0.6 },
      [[N.G4, 0, 0.32], [N.Fs4, 0.35, 0.32], [N.F4, 0.7, 0.32]]).concat(
      [{ w: 'sawtooth', f: [N.E4, 300], t: 1.05, d: 0.9, v: 0.16, lp: 1200, hold: 0.5, vib: [5, 10] }]),
    drain: seq({ w: 'square', v: 0.14, lp: 4000 }, [[N.A5, 0, 0.06], [N.E5, 0.08, 0.06], [N.A4, 0.16, 0.08]]),
    hodl: seq({ w: 'triangle', v: 0.12 }, [[N.C6, 0, 0.2], [N.E6, 0.04, 0.2], [N.G6, 0.08, 0.3]]),
    snore: [{ w: 'sawtooth', f: [85, 70], d: 0.8, v: 0.22, lp: 350, hold: 0.4 }, { w: 'noise', d: 0.8, v: 0.08, lp: 600, hold: 0.4 }],
    huh: [{ w: 'triangle', f: [300, 450], d: 0.15, v: 0.3 }, { w: 'triangle', f: [450, 250], t: 0.18, d: 0.18, v: 0.3 }],

    // ---------- Toly ----------
    'toly.strike': [{ w: 'sawtooth', f: 220, d: 0.35, v: 0.22, lp: [600, 2400, 800], drive: 1.5 },
      { w: 'sawtooth', f: 330, d: 0.35, v: 0.12, lp: [600, 2400, 800] }],                       // Comrades: brass "bwaam"
    'toly.privacy': [{ w: 'square', f: [180, 90], d: 0.06, v: 0.3 }, { w: 'noise', d: 0.05, v: 0.3, bp: 1200 },
      { w: 'sine', f: 900, t: 0.07, d: 0.04, v: 0.2 }],                                          // Seed Vault: lock clunk
    'toly.mint.ok': [{ w: 'sine', f: [90, 30], d: 0.5, v: 0.85 }, { w: 'noise', d: 0.35, v: 0.5, lp: [2000, 200] },
      { w: 'noise', t: 0.12, d: 0.2, v: 0.35, bp: [900, 300] }],                                 // Slop Cannon: boom + splat
    'toly.mint.fail': seq({ w: 'square', v: 0.18, lp: 5000 }, [[N.A5, 0, 0.1], [N.A5, 0.14, 0.1], [N.A4, 0.28, 0.25]]), // NOT IN PROD
    'toly.rug.ok': [{ w: 'sawtooth', f: [300, 900], d: 0.5, v: 0.1, vib: [30, 20] },
      { w: 'square', f: [1600, 200], t: 0.35, d: 0.15, v: 0.2 }],                                // MEV Hunt: drone whir + zap
    'toly.rug.fail': [{ w: 'sawtooth', f: [800, 60], d: 0.9, v: 0.16, lp: 2000 }],              // power-down whine
    // Second Best Salesman: brochure flicks open, the slap lands (1.2s), cash register, confetti pops.
    'super.salesman': cat(
      [0.2, 0.25, 0.3, 0.35, 0.4].map(function (t) { return { w: 'noise', t: t, d: 0.04, v: 0.2, bp: 3000 }; }),
      [{ w: 'noise', t: 1.2, d: 0.12, v: 0.8, lp: 6000 }, { w: 'sine', f: [200, 60], t: 1.2, d: 0.2, v: 0.7 }],
      at(1.35, REGISTER),
      [1.25, 1.31, 1.38, 1.44, 1.52, 1.6].map(function (t, k) { return { w: 'sine', f: [900 + k * 170, 1700 + k * 170], t: t, d: 0.05, v: 0.12 }; })),

    // ---------- Mert ----------
    'mert.strike': [0, 0.06, 0.11].map(function (t) { return { w: 'noise', t: t, d: 0.025, v: 0.4, hp: 3000 }; })
      .concat([{ w: 'square', f: 1400, d: 0.02, v: 0.1 }]),                                       // Shitpost: keyboard clacks
    'mert.privacy': [{ w: 'triangle', f: [2000, 4000], d: 0.25, v: 0.15 }, { w: 'noise', d: 0.2, v: 0.12, hp: 7000 }], // Zolana: "shing"
    'mert.mint.ok': seq({ w: 'square', v: 0.16, lp: 6000 }, [[N.B5, 0, 0.08], [N.E6, 0.07, 0.35]]),   // Memecoin: coin
    'mert.mint.fail': seq({ w: 'square', v: 0.11, lp: 5000 },
      [[N.E6, 0, 0.05], [N.D6, 0.06, 0.05], [N.B5, 0.12, 0.05], [N.A5, 0.18, 0.05], [N.G5, 0.24, 0.08]]), // coins rolling away
    'mert.rug.ok': [{ w: 'square', f: 110, d: 0.45, v: 0.25, lp: 2000, hold: 0.8 },
      { w: 'sawtooth', f: 116, d: 0.45, v: 0.18, lp: 2000, hold: 0.8 }],                          // Rate Limit: 429 buzzer
    'mert.rug.fail': [{ w: 'sine', f: N.G6, d: 0.6, v: 0.22 }, { w: 'sine', f: N.C7, d: 0.6, v: 0.08 }], // STATUS PAGE: ALL GREEN
    // CEO of Helium: glitches on HELIUM (0.9s) and HIVEMAPPER (1.35s), the sun glints off the dome as the card locks (1.8s).
    'super.helium': cat(
      [0.9, 1.35].map(function (t) { return { w: 'square', f: [400, 1200], t: t, d: 0.06, v: 0.14 }; }),
      [0.9, 1.35].map(function (t) { return { w: 'noise', t: t, d: 0.05, v: 0.12, hp: 2000 }; }),
      [{ w: 'triangle', f: 3136, t: 1.8, d: 0.8, v: 0.22 }, { w: 'sine', f: 4186, t: 1.8, d: 0.5, v: 0.08 },
        { w: 'noise', t: 1.8, d: 1, v: 0.18, bp: [500, 5000] },
        { w: 'sine', f: [600, 1400], t: 2.3, d: 0.35, v: 0.18, vib: [18, 60] }]),

    // ---------- Garlinghouse ----------
    'garlinghouse.strike': [0, 0.02, 0.04, 0.06, 0.08, 0.1].map(function (t) { return { w: 'noise', t: t, d: 0.015, v: 0.22, bp: 4000 }; }), // Settle: cash riffle
    'garlinghouse.privacy': [{ w: 'noise', d: 0.3, v: 0.45, lp: [1500, 200] }, { w: 'sine', f: [70, 45], d: 0.3, v: 0.6 }], // In The Room: door shuts
    'garlinghouse.mint.ok': REGISTER,                                                               // RLUSD: cash register
    'garlinghouse.mint.fail': [{ w: 'square', f: [220, 196], d: 0.4, v: 0.15, lp: 900, vib: [6, 6] }], // UTILITY TBD: "meh"
    'garlinghouse.rug.ok': GAVEL,                                                                    // Lawsuit: gavel
    'garlinghouse.rug.fail': cat(at(0, GAVEL), at(0.15, GAVEL), at(0.3, GAVEL)).map(function (v) {
      return Object.assign({}, v, { v: v.v * 0.6 });
    }),                                                                                              // I'M PISSED: three raps
    // XRP Army: a whistle, the army's footsteps across the screen, a crowd swell. Each of the 5 hits is a stomp.
    'super.xrparmy': cat(
      [{ w: 'sine', f: [1800, 2600], t: 0.1, d: 0.25, v: 0.18, vib: [25, 40] }],
      Array.apply(null, Array(15)).map(function (_, k) { return { w: 'noise', t: 0.2 + k * 0.18, d: 0.05, v: k % 2 ? 0.2 : 0.3, lp: 600 }; }),
      [{ w: 'noise', t: 0.3, d: 2.6, v: 0.1, bp: [500, 1500], hold: 0.7, a: 0.4 }]),

    // ---------- Vitalik ----------
    'vitalik.strike': [{ w: 'noise', d: 0.07, v: 0.5, bp: 1800, q: 0.7 }, { w: 'sine', f: [300, 120], d: 0.05, v: 0.2 }], // Essay Drop: paper thwap
    'vitalik.privacy': [{ w: 'sine', f: [300, 900], d: 0.12, v: 0.35 }, { w: 'sine', f: [500, 1200], t: 0.1, d: 0.1, v: 0.2 }], // Privacy Pool: bloop
    'vitalik.mint.ok': [{ w: 'triangle', f: [1100, 1600], d: 0.1, v: 0.25 }, { w: 'triangle', f: [1600, 1100], t: 0.1, d: 0.12, v: 0.25 }], // Soulbound: squeak
    'vitalik.mint.fail': [{ w: 'triangle', f: [1200, 300], d: 0.7, v: 0.2, vib: [20, 50] }],        // deflating squeak
    'vitalik.rug.ok': seq({ w: 'triangle', v: 0.15 }, [[N.C6, 0, 0.25], [N.E6, 0.05, 0.25], [N.G6, 0.1, 0.25], [N.C7, 0.15, 0.35]]), // Public Goods: sprout chime
    'vitalik.rug.fail': [{ w: 'square', f: 600, d: 0.03, v: 0.2 }, { w: 'triangle', f: [700, 690], d: 0.25, v: 0.2, hp: 400 }], // empty tin can
    // Badger Dance: three seconds of an original bouncy groove, then the hypno warble.
    'super.dance': cat(
      [0, 0.47, 0.94, 1.41, 1.88, 2.35].map(function (t) { return { w: 'sine', f: [150, 40], t: t, d: 0.15, v: 0.7 }; }),
      [0.47, 1.41, 2.35].map(function (t) { return { w: 'noise', t: t, d: 0.12, v: 0.3, bp: 2000 }; }),
      seq({ w: 'square', v: 0.16, lp: 900 }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(function (k) {
        return [[N.C2, N.G2, N.F2, N.G2][k % 4] * 2, k * 0.235, 0.18];
      })),
      [{ w: 'sine', f: 400, t: 2.4, d: 0.6, v: 0.2, vib: [6, 120] }]),

    // ---------- Adam ----------
    'adam.strike': [{ w: 'triangle', f: 2600, d: 0.15, v: 0.22 }, { w: 'square', f: 1300, d: 0.04, v: 0.12 },
      { w: 'noise', d: 0.03, v: 0.2, hp: 6000 }],                                                   // Hashcash: pickaxe clink
    'adam.privacy': [{ w: 'square', f: [1200, 2400], d: 0.08, v: 0.1 }, { w: 'sawtooth', f: 1800, t: 0.08, d: 0.1, v: 0.07 },
      { w: 'noise', t: 0.18, d: 0.12, v: 0.14, bp: 2500 }],                                          // Cypherpunk: modem screech
    'adam.mint.ok': [{ w: 'noise', d: 0.03, v: 0.45, hp: 3000 }, { w: 'noise', t: 0.07, d: 0.04, v: 0.35, hp: 2500 }], // Inscription: shutter
    'adam.mint.fail': [{ w: 'square', f: 196, d: 0.25, v: 0.17, lp: 2000 }, { w: 'square', f: 185, d: 0.25, v: 0.13, lp: 2000 }], // denied
    'adam.rug.ok': [{ w: 'sine', f: 1760, d: 1, v: 0.25 }, { w: 'sine', f: 3520, d: 0.4, v: 0.06 }],  // Soft Fork: tuning-fork ting
    'adam.rug.fail': [{ w: 'sawtooth', f: 82, d: 0.35, v: 0.22, lp: 600 }, { w: 'sawtooth', f: 73, t: 0.4, d: 0.4, v: 0.22, lp: 600 }], // "nope"
    // OP_RETURN: the gun fires (0.5s), then the data blob chirps across.
    'super.opreturn': cat(
      [{ w: 'square', f: [2400, 200], t: 0.5, d: 0.25, v: 0.22 }, { w: 'noise', t: 0.5, d: 0.08, v: 0.3, hp: 3000 }],
      [1568, 2093, 1175, 2637, 1397, 1976, 1046, 2349, 1661, 2794, 1245, 2217, 1480, 1865, 2489, 1319, 2960, 1109, 2093, 1568]
        .map(function (f, k) { return { w: 'square', f: f, t: 0.75 + k * 0.06, d: 0.03, v: 0.07, lp: 6000 }; })),
    prune: [0, 0.08, 0.16, 0.24].map(function (t) { return { w: 'noise', t: t, d: 0.05, v: 0.25, hp: 6000 }; }), // SALTY TEARS: salt shaker

    // ---------- Charles ----------
    'charles.strike': [{ w: 'noise', d: 0.12, v: 0.45, hp: 2000 }, { w: 'square', f: [3000, 800], d: 0.05, v: 0.1 },
      { w: 'sine', f: [400, 100], d: 0.1, v: 0.3 }],                                                 // Glacier Drop: ice crack
    'charles.privacy': seq({ w: 'square', v: 0.11, lp: 5000 }, [[1209, 0, 0.06], [1336, 0.09, 0.06], [1477, 0.18, 0.06]])
      .concat([{ w: 'sine', f: N.A5, t: 0.3, d: 0.2, v: 0.15 }]),                                    // ZK Proof: keypad, lock
    'charles.mint.ok': [{ w: 'sine', f: [180, 60], d: 0.15, v: 0.65 }, { w: 'noise', d: 0.08, v: 0.4, lp: 1200 }], // Peer Review: stamp
    'charles.mint.fail': [{ w: 'noise', d: 0.3, v: 0.32, bp: [2500, 6000], q: 2 }],                    // page rip
    'charles.rug.ok': seq({ w: 'triangle', v: 0.12 }, [[1319, 0, 0.3], [1976, 0.04, 0.3], [2637, 0.08, 0.3], [3322, 0.12, 0.35]])
      .concat([{ w: 'noise', d: 0.4, v: 0.05, hp: 8000 }]),                                          // Leios: sparkle
    'charles.rug.fail': [{ w: 'sine', f: [1800, 300], d: 0.7, v: 0.2, vib: [8, 15] }],                // ROADMAP SAYS Q4: slide whistle
    // Midnight Express: a click per typed caption letter, the light switch, crickets, a snore. Timed from the
    // captions, so app.js passes { chars: [seconds...], off: seconds } (see lectureTiming there).
    'super.midnight': function (info) {
      info = info || { chars: [], off: 2.86 };
      var off = info.off;
      return cat(
        info.chars.map(function (t) { return { w: 'noise', t: t, d: 0.012, v: 0.14, hp: 4000 }; }),
        [{ w: 'square', f: 120, t: off, d: 0.03, v: 0.35 }, { w: 'noise', t: off, d: 0.04, v: 0.45, lp: 1500 }],
        [0.15, 0.65, 1.15, 1.65].reduce(function (out, t) {
          return out.concat([0, 0.05, 0.1].map(function (dt) { return { w: 'sine', f: 4200, t: off + t + dt, d: 0.03, v: 0.05 }; }));
        }, []),
        at(off + 0.35, SFX.snore));
    },

    // ---------- Saylor ----------
    'saylor.strike': [{ w: 'sine', f: [120, 60], d: 0.15, v: 0.55 }, { w: 'square', f: 300, d: 0.03, v: 0.13 },
      { w: 'noise', d: 0.06, v: 0.3, lp: 900 }],                                                     // STRC: mailbox thump
    'saylor.privacy': [{ w: 'square', f: N.C5, d: 0.4, v: 0.1 }, { w: 'square', f: N.G5, d: 0.35, v: 0.07 },
      { w: 'triangle', f: N.G6, d: 0.5, v: 0.1 }, { w: 'noise', d: 0.05, v: 0.3, hp: 3000 }],          // STRF: shield clang
    'saylor.mint.ok': [0, 1, 2, 3, 4, 5, 6, 7].map(function (k) { return { w: 'noise', t: k * 0.035, d: 0.012, v: 0.28, bp: 3000 }; })
      .concat([{ w: 'square', f: 800, t: 0.3, d: 0.03, v: 0.15 }]),                                  // STRK: ratchet, converted
    'saylor.mint.fail': [[0, 0.3], [0.05, 0.25], [0.13, 0.2], [0.2, 0.15]].map(function (p) {
      return { w: 'noise', t: p[0], d: 0.04, v: p[1], bp: 1500 };
    }),                                                                                              // STILL PREFERRED: clatter
    'saylor.rug.ok': seq({ w: 'square', v: 0.11, lp: 6000 }, [[N.E5, 0, 0.06], [N.G5, 0.07, 0.06], [N.B5, 0.14, 0.06], [N.D6, 0.21, 0.06]])
      .concat(at(0.3, REGISTER)),                                                                    // MSTR ▲: ticker up, cha-ching
    'saylor.rug.fail': seq({ w: 'square', v: 0.11, lp: 6000 }, [[N.D6, 0, 0.07], [N.B5, 0.08, 0.07], [N.G5, 0.16, 0.07], [N.D5, 0.24, 0.07]])
      .concat([{ w: 'sawtooth', f: [300, 80], t: 0.3, d: 0.4, v: 0.11, lp: 1500 }]),                 // MSTR ▼: ticker down
    // Another Orange Dot: each dot stamps onto the chart a little higher (0.35s + 0.17s apart); the last one sparkles.
    'super.orangedot': [0, 1, 2, 3, 4, 5].reduce(function (out, n) {
      var t = 0.35 + n * 0.17, f = 600 * Math.pow(1.12, n);
      out.push({ w: 'sine', f: [f, f * 1.6], t: t, d: 0.08, v: 0.3 }, { w: 'noise', t: t, d: 0.03, v: 0.12, bp: f * 2 });
      if (n === 5) out.push({ w: 'triangle', f: f * 2, t: t + 0.05, d: 0.5, v: 0.14 });
      return out;
    }, []),
    // The astronaut DJ (Saylor's Super KO): a four-on-the-floor beat with the slam of WE CALL THEM POOR (1.1s).
    'super.astronaut': cat(
      [0, 1, 2, 3, 4, 5, 6].map(function (k) { return { w: 'sine', f: [150, 40], t: k * 0.46, d: 0.18, v: 0.8 }; }),
      [0, 1, 2, 3, 4, 5].map(function (k) { return { w: 'noise', t: k * 0.46 + 0.23, d: 0.03, v: 0.15, hp: 7000 }; }),
      [1.1, 1.25, 1.4].map(function (t) { return { w: 'sawtooth', f: 466, t: t, d: 0.1, v: 0.13, lp: 3000, drive: 2 }; }),
      [{ w: 'sawtooth', f: 466, t: 1.55, d: 0.6, v: 0.13, lp: 3000, drive: 2, hold: 0.6 },
        { w: 'sawtooth', f: 469, t: 1.55, d: 0.6, v: 0.1, lp: 3000, hold: 0.6 }]),

    // ---------- Sergey ----------
    'sergey.strike': seq({ w: 'square', v: 0.1, lp: 7000 }, [[1800, 0, 0.025], [2400, 0.035, 0.025], [3000, 0.07, 0.025]])
      .concat([{ w: 'sine', f: 2400, t: 0.1, d: 0.12, v: 0.12 }]),                                   // CCIP: the data arrives
    'sergey.privacy': [{ w: 'sine', f: [300, 700, 300], d: 0.7, v: 0.28, vib: [9, 60] },
      { w: 'triangle', f: [600, 1400, 600], d: 0.7, v: 0.1, vib: [9, 90] }],                         // The Shirt: the pattern moves
    'sergey.mint.ok': seq({ w: 'triangle', v: 0.22, hold: 0.3 }, [[N.C5, 0, 0.5], [N.E5, 0.16, 0.5], [N.G5, 0.32, 0.7]]), // LIVE AT SIBOS: PA chime
    'sergey.mint.fail': seq({ w: 'triangle', v: 0.2, hold: 0.3 }, [[N.G5, 0, 0.4], [N.E5, 0.16, 0.4], [N.C5, 0.32, 0.6, 0.14]]), // STILL A PILOT
    'sergey.rug.ok': [{ w: 'sawtooth', f: [150, 1500], d: 0.5, v: 0.12, lp: 3000 }]
      .concat(seq({ w: 'triangle', v: 0.14 }, [[N.C6, 0.45, 0.2], [N.E6, 0.5, 0.2], [N.G6, 0.55, 0.2], [N.C7, 0.6, 0.4]])), // $600 TRILLION: up and up
    'sergey.rug.fail': [0, 0.25, 0.5].reduce(function (out, t) {
      return out.concat([{ w: 'sine', f: 480, t: t, d: 0.13, v: 0.18, hold: 0.9 }, { w: 'sine', f: 620, t: t, d: 0.13, v: 0.18, hold: 0.9 }]);
    }, []),                                                                                          // NO PRICE CALLS: busy signal
    stare: [{ w: 'sine', f: [700, 380], d: 0.8, v: 0.25, vib: [6, 45] }, { w: 'triangle', f: [1400, 760], d: 0.8, v: 0.06, vib: [6, 90] }], // lost in the pattern
    // Link Marines: the target's line hangs, a bugle sounds the charge, then the boots and the crowd. Each of the 4 hits is a stomp.
    'super.linkmarines': cat(
      seq({ w: 'sawtooth', v: 0.14, lp: 2600, hold: 0.5 },
        [[N.G4, 0.3, 0.12], [N.C5, 0.43, 0.12], [N.E5, 0.56, 0.12], [N.G5, 0.69, 0.28], [N.E5, 1.0, 0.12], [N.G5, 1.13, 0.5]]),
      Array.apply(null, Array(12)).map(function (_, k) { return { w: 'noise', t: 0.7 + k * 0.2, d: 0.05, v: k % 2 ? 0.18 : 0.3, lp: 700 }; }),
      Array.apply(null, Array(12)).map(function (_, k) { return { w: 'noise', t: 0.8 + k * 0.2, d: 0.03, v: 0.12, bp: 2500 }; }),
      [{ w: 'noise', t: 0.9, d: 2.3, v: 0.1, bp: [500, 1500], hold: 0.7, a: 0.4 }]),

    // ---------- CZ ----------
    'cz.strike': [{ w: 'sine', f: [90, 40], d: 0.25, v: 0.7 }, { w: 'noise', d: 0.08, v: 0.35, lp: 1500 },
      { w: 'square', f: 900, t: 0.12, d: 0.04, v: 0.15 }, { w: 'square', f: 1200, t: 0.17, d: 0.04, v: 0.12 }], // SAFU: the vault door, latched
    'cz.privacy': seq({ w: 'square', v: 0.12, lp: 5000 }, [[1500, 0, 0.03], [1500, 0.07, 0.03], [1500, 0.14, 0.03], [1500, 0.21, 0.03]])
      .concat([{ w: 'sine', f: 220, t: 0.3, d: 0.25, v: 0.2 }]),                                    // Ignore FUD: four taps. "4."
    'cz.mint.ok': seq({ w: 'square', v: 0.14, lp: 5000 }, [[N.C5, 0, 0.09], [N.E5, 0.1, 0.09], [N.G5, 0.2, 0.09], [N.C6, 0.3, 0.35]]), // 1, 2, 3, 4.
    'cz.mint.fail': seq({ w: 'square', v: 0.14, lp: 5000 }, [[N.C5, 0, 0.09], [N.E5, 0.1, 0.09], [N.G5, 0.2, 0.09]])
      .concat([{ w: 'triangle', f: 196, t: 0.34, d: 0.25, v: 0.25 }]),                             // ONLY GOT TO 3
    'cz.rug.ok': [{ w: 'sawtooth', f: N.A2, d: 0.55, v: 0.16, lp: 900, hold: 0.7 }, { w: 'sawtooth', f: 165, d: 0.55, v: 0.12, lp: 900, hold: 0.7 },
      { w: 'sine', f: [400, 1800], t: 0.45, d: 0.4, v: 0.18 }],                                     // Da Moon: yacht horn, then up
    'cz.rug.fail': [{ w: 'sawtooth', f: 110, d: 0.18, v: 0.16, lp: 800 }, { w: 'sawtooth', f: 92, t: 0.22, d: 0.45, v: 0.1, lp: 600, vib: [5, 4] },
      { w: 'noise', t: 0.2, d: 0.35, v: 0.08, bp: 700, q: 4 }],                                     // STILL DOCKED: horn sputters, rope creaks
    deflect: [{ w: 'triangle', f: [300, 460], d: 0.09, v: 0.35 }, { w: 'noise', d: 0.05, v: 0.25, lp: 900 }], // a hit bounces off him
    // 4: the SUV rolls in and brakes (0.8s), FUD, FAKE NEWS and ATTACKS shatter (1.5s, 1.8s, 2.1s), then the stab.
    'super.four': cat(
      [{ w: 'sawtooth', f: [70, 90], d: 0.8, v: 0.12, lp: 400 }, { w: 'noise', d: 0.8, v: 0.06, lp: 600 },
        { w: 'sine', f: [2600, 2200], t: 0.62, d: 0.22, v: 0.06 }, { w: 'sine', f: [90, 50], t: 0.82, d: 0.1, v: 0.4 }],
      [1.5, 1.8, 2.1].reduce(function (out, t) {
        return out.concat([{ w: 'noise', t: t, d: 0.18, v: 0.35, hp: 2500 }, { w: 'triangle', f: 3300, t: t, d: 0.12, v: 0.08 },
          { w: 'triangle', f: 4100, t: t + 0.04, d: 0.1, v: 0.06 }]);
      }, []),
      seq({ w: 'square', v: 0.12, lp: 3000 }, [[N.C5, 2.35, 0.5], [N.G5, 2.35, 0.5], [N.C6, 2.35, 0.5]])),

    // ---------- Adeniyi ----------
    'adeniyi.strike': [{ w: 'sine', f: [800, 2400], d: 0.08, v: 0.2 }, { w: 'square', f: 2400, t: 0.08, d: 0.03, v: 0.1 }], // Zero Fee: zip, sent
    'adeniyi.privacy': [{ w: 'sine', f: [180, 90], d: 0.2, v: 0.35 }, { w: 'triangle', f: N.E6, t: 0.15, d: 0.12, v: 0.14 },
      { w: 'triangle', f: 1760, t: 0.25, d: 0.2, v: 0.14 }],                                         // Walrus: a bubble, then "saved"
    stored: seq({ w: 'triangle', v: 0.13 }, [[N.E6, 0, 0.1], [1760, 0.08, 0.18]]),                  // a dodged hit goes on Walrus
    'adeniyi.mint.ok': [0, 0.05, 0.1, 0.16].map(function (t) { return { w: 'noise', t: t, d: 0.025, v: 0.3, bp: 3000 }; })
      .concat([{ w: 'triangle', f: N.C7, t: 0.24, d: 0.3, v: 0.15 }]),                               // YOLO: dice rattle, a win ding
    'adeniyi.mint.fail': [0, 0.05, 0.1, 0.16].map(function (t) { return { w: 'noise', t: t, d: 0.025, v: 0.3, bp: 3000 }; })
      .concat([{ w: 'sine', f: [600, 180], t: 0.25, d: 0.35, v: 0.2 }]),                            // ...WAIT
    'adeniyi.rug.ok': [1800, 2400, 1500, 2700, 2000, 3000, 1700, 2600].map(function (f, k) {
      return { w: 'square', f: f, t: k * 0.035, d: 0.025, v: 0.08, lp: 7000 };
    }).concat([{ w: 'square', f: [2000, 300], t: 0.3, d: 0.12, v: 0.15 }]),                         // Agents 24/7: machine speed
    'adeniyi.rug.fail': [{ w: 'square', f: [900, 120], d: 0.5, v: 0.12, vib: [18, 120], lp: 3000 },
      { w: 'noise', t: 0.1, d: 0.04, v: 0.15, hp: 3000 }, { w: 'noise', t: 0.28, d: 0.04, v: 0.15, hp: 3000 }], // the agent hallucinated
    splash: [{ w: 'noise', d: 0.14, v: 0.5, bp: [2200, 600], q: 0.8 }, { w: 'sine', f: [320, 120], d: 0.09, v: 0.3 }], // each hit of the wave
    // Agent Swarm: the wave rolls in (0.2s to 1.3s) with a swarm of little bots chirping on the crest.
    'super.agentswarm': cat(
      [{ w: 'noise', t: 0.15, d: 1.6, v: 0.22, bp: [300, 2500, 700], a: 0.5, hold: 0.4 }],
      [2100, 2900, 1800, 3300, 2500, 1600, 3100, 2200, 2700, 1900, 3500, 2400].map(function (f, k) {
        return { w: 'square', f: [f, f * 1.3], t: 0.35 + k * 0.08, d: 0.03, v: 0.06, lp: 7000 };
      }),
      [{ w: 'noise', t: 1.25, d: 0.5, v: 0.3, bp: [1800, 500] }]),

    // ---------- Story mode ----------
    // An ally jumps in: a rising whoosh and a stab (the hit itself is the shared heavy punch).
    assist: [{ w: 'noise', d: 0.35, v: 0.3, bp: [400, 3000], a: 0.25 }, { w: 'sawtooth', f: [220, 880], d: 0.3, v: 0.1, lp: 3000 },
      { w: 'square', f: N.G5, t: 0.3, d: 0.12, v: 0.12, lp: 5000 }, { w: 'square', f: N.D6, t: 0.3, d: 0.18, v: 0.1, lp: 5000 }],
    // Satoshi: a slow shimmer of bells over a soft major chord, about four seconds.
    satoshi: cat(
      [N.C4, N.E4, N.G4, N.C5].map(function (f) { return { w: 'sine', f: f, d: 3.8, v: 0.09, a: 0.9, hold: 0.5 }; }),
      [N.G6, N.E6, N.C7, N.G6, N.E7, N.C7, N.G6, N.E6].map(function (f, k) {
        return { w: 'triangle', f: f, t: 0.3 + k * 0.38, d: 0.7, v: 0.05 };
      })),
    coin: seq({ w: 'square', v: 0.13, lp: 6000 }, [[N.B5, 0, 0.07], [N.E6, 0.07, 0.35]]),   // CONTINUE: a coin goes in
    tick: [{ w: 'square', f: 1200, d: 0.03, v: 0.1, lp: 4000 }],                          // the CONTINUE countdown

    // ---------- Schiff (story boss) ----------
    'schiff.strike': [{ w: 'sine', f: [140, 60], d: 0.12, v: 0.4 }, { w: 'noise', d: 0.05, v: 0.2, lp: 1200 }], // Fake Asset: a dull thud
    'schiff.privacy': [{ w: 'sine', f: [70, 45], d: 0.35, v: 0.5 }, { w: 'noise', d: 0.3, v: 0.15, lp: 500 },
      { w: 'square', f: 600, t: 0.3, d: 0.03, v: 0.1 }, { w: 'square', f: 800, t: 0.36, d: 0.03, v: 0.1 }],   // The Vault: the door swings shut, bolts
    'schiff.mint.ok': [{ w: 'square', f: [1600, 200], d: 0.6, v: 0.1, lp: 4000 }],                         // $10K Call: a falling whistle
    'schiff.mint.fail': seq({ w: 'square', v: 0.12, lp: 5000 }, [[N.C5, 0, 0.08], [N.E5, 0.08, 0.08], [N.G5, 0.16, 0.08], [N.C6, 0.24, 0.3]]), // NEW ALL-TIME HIGH
    clank: [{ w: 'triangle', f: 1900, d: 0.25, v: 0.25 }, { w: 'triangle', f: 2650, d: 0.18, v: 0.16 }, { w: 'noise', d: 0.04, v: 0.3, hp: 2500 },
      { w: 'sine', f: [160, 70], d: 0.12, v: 0.35 }],                                                   // a gold bar lands
    'schiff.rug.ok': [{ w: 'triangle', f: 1500, d: 0.4, v: 0.25 }, { w: 'triangle', f: 2210, d: 0.3, v: 0.16 }, { w: 'noise', d: 0.05, v: 0.3, hp: 2000 }], // HEAVY METAL
    'schiff.rug.fail': [{ w: 'triangle', f: 3100, d: 0.12, v: 0.2 }, { w: 'triangle', f: 2900, t: 0.14, d: 0.4, v: 0.08, vib: [9, 60] }],   // IT WAS TUNGSTEN: a tinny ting
    // Gold Rush: bars rain down and land one after another (0.7s to 2.2s), then a till rings.
    'super.goldrush': cat(
      [0.7, 0.95, 1.2, 1.45, 1.7, 1.95, 2.2].reduce(function (out, t, k) {
        return out.concat([{ w: 'triangle', f: 1700 + (k % 3) * 300, t: t, d: 0.22, v: 0.16 }, { w: 'noise', t: t, d: 0.04, v: 0.2, hp: 2500 }]);
      }, []),
      seq({ w: 'square', v: 0.11, lp: 5000 }, [[N.E6, 2.5, 0.08], [N.G6, 2.58, 0.3]])),

    // ---------- Dimon (story boss) ----------
    'dimon.strike': seq({ w: 'square', v: 0.1, lp: 4000 }, [[960, 0, 0.09], [720, 0.1, 0.09]]),            // Fraud: an alarm blip
    'dimon.privacy': [{ w: 'sine', f: [90, 50], d: 0.3, v: 0.5 }, { w: 'noise', d: 0.25, v: 0.15, lp: 400 },
      { w: 'square', f: 300, t: 0.22, d: 0.05, v: 0.12 }],                                                  // Fortress: the gate drops
    'dimon.mint.ok': seq({ w: 'triangle', v: 0.16 }, [[N.C6, 0, 0.12], [N.E6, 0.07, 0.12], [N.G6, 0.14, 0.25]]), // JPM Coin: minted
    'dimon.mint.fail': [{ w: 'square', f: 140, d: 0.35, v: 0.14, lp: 1500 }, { w: 'square', f: 147, d: 0.35, v: 0.12, lp: 1500 }], // COMPLIANCE SAYS NO
    'dimon.rug.ok': [{ w: 'sine', f: [120, 45], d: 0.25, v: 0.6 }, { w: 'noise', d: 0.12, v: 0.3, lp: 1200 },
      { w: 'square', f: 1400, t: 0.22, d: 0.03, v: 0.12 }, { w: 'square', f: 1100, t: 0.27, d: 0.04, v: 0.1 }], // Shut It Down: slam, lock
    'dimon.rug.fail': [{ w: 'sine', f: [900, 250], d: 0.6, v: 0.18, vib: [6, 20] }],                       // ...I defend your right
    // Pet Rock: a heavy roll (0.2s to 1.2s), the thud, and the googly eyes wobbling.
    'super.petrock': cat(
      [{ w: 'noise', t: 0.2, d: 1.0, v: 0.25, lp: [300, 600], a: 0.2 }, { w: 'sine', f: [60, 45], t: 0.2, d: 1.0, v: 0.25, a: 0.2 }],
      [{ w: 'sine', f: [110, 40], t: 1.22, d: 0.3, v: 0.8 }, { w: 'noise', t: 1.22, d: 0.15, v: 0.35, lp: 1500 }],
      [{ w: 'sine', f: [500, 900, 500, 900, 500], t: 1.45, d: 0.7, v: 0.12 }]),
    // ---------- Warren (story boss) ----------
    'warren.strike': [{ w: 'sine', f: [180, 70], d: 0.12, v: 0.45 }, { w: 'noise', d: 0.05, v: 0.25, bp: 1800 }],   // Bad Actors: a gavel
    'warren.privacy': [{ w: 'noise', d: 0.06, v: 0.35, lp: 900 }, { w: 'sine', f: [130, 60], d: 0.15, v: 0.5 },
      { w: 'square', f: 220, t: 0.12, d: 0.18, v: 0.08, lp: 1500 }],                                          // Vote No: a ballot stamped
    'warren.mint.ok': [0, 0.04, 0.09, 0.15, 0.22].map(function (t) { return { w: 'noise', t: t, d: 0.06, v: 0.22, bp: 2500 }; })
      .concat([{ w: 'sine', f: [120, 60], t: 0.3, d: 0.15, v: 0.5 }]),                                       // The Letter: pages, then the thud of the stack
    'warren.mint.fail': [0, 0.06, 0.13].map(function (t) { return { w: 'noise', t: t, d: 0.05, v: 0.18, bp: 3000 }; })
      .concat([{ w: 'triangle', f: [330, 250], t: 0.25, d: 0.35, v: 0.15 }]),                                // STILL READING
    'warren.rug.ok': [{ w: 'sine', f: [140, 50], d: 0.2, v: 0.6 }, { w: 'noise', d: 0.08, v: 0.35, lp: 1200 },
      { w: 'square', f: 196, t: 0.2, d: 0.3, v: 0.1, lp: 1200 }],                                             // CHARTER DENIED: the stamp
    'warren.rug.fail': [{ w: 'triangle', f: [440, 330], d: 0.2, v: 0.15 }, { w: 'triangle', f: [330, 247], t: 0.2, d: 0.35, v: 0.15 }], // NOT A BANK
    paper: [0, 0.08, 0.17, 0.27, 0.36].map(function (t) { return { w: 'noise', t: t, d: 0.07, v: 0.2, bp: 3500 }; }),  // still reading: pages turn
    banned: [{ w: 'sine', f: [110, 45], d: 0.25, v: 0.7 }, { w: 'noise', d: 0.1, v: 0.35, lp: 1500 },
      { w: 'square', f: 140, t: 0.18, d: 0.45, v: 0.12, lp: 1200 }, { w: 'square', f: 148, t: 0.18, d: 0.45, v: 0.1, lp: 1200 }], // BANNED: stamp + buzzer
    // The Plan: boots march (0.45s on), pages flutter as the letter unrolls, a final stamp.
    'super.plan': cat(
      [0.45, 0.75, 1.05, 1.35, 1.65, 1.95, 2.25].map(function (t) { return { w: 'sine', f: [120, 50], t: t, d: 0.1, v: 0.4 }; }),
      [0.3, 0.5, 0.7, 0.9, 1.1, 1.3].map(function (t) { return { w: 'noise', t: t, d: 0.08, v: 0.12, bp: 3500 }; }),
      [{ w: 'sine', f: [150, 45], t: 2.5, d: 0.25, v: 0.7 }, { w: 'noise', t: 2.5, d: 0.1, v: 0.3, lp: 1500 }]),
    // ---------- SBF (story boss) ----------
    'sbf.strike': [{ w: 'noise', d: 0.12, v: 0.25, bp: [1200, 3500] }, { w: 'square', f: 1900, t: 0.1, d: 0.04, v: 0.08, lp: 5000 },
      { w: 'square', f: 2400, t: 0.15, d: 0.05, v: 0.07, lp: 5000 }],                                           // 1) Fine: funds swished over, two clicks
    'sbf.privacy': [{ w: 'noise', d: 0.35, v: 0.35, lp: [900, 250] }, { w: 'sine', f: [90, 50], d: 0.3, v: 0.4 }], // 2) Beanbag: he flops into it
    'sbf.mint.ok': seq({ w: 'square', v: 0.11, lp: 4500 }, [[N.G5, 0, 0.07], [N.C6, 0.07, 0.07], [N.E6, 0.14, 0.07], [N.G6, 0.21, 0.07], [N.C7, 0.28, 0.3]]), // 3) League: GG EZ
    'sbf.mint.fail': [0, 0.5].map(function (t) { return { w: 'sine', f: 480, t: t, d: 0.3, v: 0.12 }; })
      .concat([0, 0.5].map(function (t) { return { w: 'sine', f: 620, t: t, d: 0.3, v: 0.1 }; })),              // MISSED THE CALL: busy tone
    'sbf.rug.ok': cat(
      [{ w: 'sine', f: [160, 70], d: 0.15, v: 0.55 }, { w: 'noise', d: 0.1, v: 0.3, lp: 900 }],
      [0.12, 0.17, 0.21, 0.26, 0.3, 0.36, 0.41].map(function (t, k) { return { w: 'triangle', f: 2600 + (k % 3) * 450, t: t, d: 0.09, v: 0.1 }; })), // 4) The Box: a thump, money pours in
    'sbf.rug.fail': [{ w: 'sine', f: [220, 160], d: 0.12, v: 0.4 }, { w: 'sine', f: [220, 160], t: 0.16, d: 0.12, v: 0.35 },
      { w: 'noise', d: 0.3, v: 0.12, bp: 400 }],                                                                // THE BOX IS EMPTY: a hollow knock-knock
    beanbag: [{ w: 'noise', d: 0.18, v: 0.45, lp: [1400, 300] }, { w: 'sine', f: [120, 55], d: 0.16, v: 0.5 }],  // one of Caroline's beanbags lands
    // 1) What: keys clack (0.2s to 0.9s), a rising whistle as the question mark flies out, the slam at 1.25s.
    'super.what': cat(
      [0.2, 0.31, 0.39, 0.52, 0.6, 0.71, 0.84].map(function (t) { return { w: 'noise', t: t, d: 0.03, v: 0.18, hp: 2500 }; }),
      [{ w: 'sine', f: [300, 1400], t: 0.9, d: 0.35, v: 0.15 }],
      [{ w: 'sine', f: [120, 40], t: 1.25, d: 0.35, v: 0.8 }, { w: 'noise', t: 1.25, d: 0.15, v: 0.4, lp: 1800 }],
      [{ w: 'sine', f: [600, 900, 500], t: 1.6, d: 0.6, v: 0.12 }]),

    // ---------- WICK (final boss) ----------
    'wick.strike': [{ w: 'square', f: [2400, 1800], d: 0.05, v: 0.1, lp: 6000 }, { w: 'noise', t: 0.02, d: 0.08, v: 0.3, hp: 2500 },
      { w: 'sine', f: [160, 60], t: 0.03, d: 0.15, v: 0.5 }],                                                  // Stop Hunt: a sniper's ping
    'wick.privacy': [0, 0.07, 0.14, 0.21, 0.28, 0.35].map(function (t, k) {
      return { w: 'square', f: k % 2 ? 900 : 700, t: t, d: 0.03, v: 0.1, lp: 3000 };
    }),                                                                                                          // Crab Market: a sideways scuttle
    'wick.mint.ok': [{ w: 'noise', d: 0.04, v: 0.5, hp: 1500 }, { w: 'square', f: [600, 120], d: 0.12, v: 0.15, lp: 2500 },
      { w: 'sine', f: [110, 50], t: 0.02, d: 0.2, v: 0.5 }],                                                    // Bull Trap: the trap snaps
    'wick.mint.fail': seq({ w: 'triangle', v: 0.16 }, [[N.C5, 0, 0.08], [N.E5, 0.07, 0.08], [N.G5, 0.14, 0.08], [N.C6, 0.21, 0.08], [N.E6, 0.28, 0.25]]), // UP ONLY
    'wick.rug.ok': [{ w: 'sawtooth', f: [1800, 60], d: 0.5, v: 0.14, lp: [6000, 400] }, { w: 'sine', f: [120, 35], t: 0.35, d: 0.3, v: 0.6 }], // Scam Wick: straight down
    'wick.rug.fail': seq({ w: 'square', v: 0.12, lp: 5000 }, [[N.B5, 0, 0.07], [N.E6, 0.07, 0.12], [N.G6, 0.2, 0.25]]),   // BOUGHT THE DIP
    // Leverage: a ratchet clicks up; closing the position rings out.
    'lev.up': [0, 0.05, 0.1].map(function (t) { return { w: 'square', f: 1500, t: t, d: 0.02, v: 0.12, lp: 5000 }; })
      .concat([{ w: 'square', f: [400, 900], t: 0.13, d: 0.12, v: 0.1, lp: 4000 }]),
    'lev.close': seq({ w: 'triangle', v: 0.16 }, [[N.G5, 0, 0.08], [N.C6, 0.06, 0.08], [N.G5, 0.12, 0.2]]),
    // Liquidation Cascade: an alarm (0.2s to 1s), then alerts falling one after another, then the crash.
    'super.cascade': cat(
      [0.2, 0.6].map(function (t) { return { w: 'square', f: [700, 1100, 700], t: t, d: 0.4, v: 0.1, lp: 4000 }; }),
      [1.1, 1.3, 1.5, 1.7, 1.9, 2.1].map(function (t, k) { return { w: 'sawtooth', f: [1600 - k * 150, 300], t: t, d: 0.18, v: 0.09, lp: 5000 }; }),
      [{ w: 'sine', f: [110, 30], t: 2.35, d: 0.5, v: 0.8 }, { w: 'noise', t: 2.35, d: 0.3, v: 0.4, lp: 2000 }]),
    // 100x: the whole stake, gone.
    liquidated: [{ w: 'square', f: 110, d: 0.9, v: 0.2, lp: 1500, hold: 0.8 }, { w: 'square', f: 117, d: 0.9, v: 0.16, lp: 1500, hold: 0.8 },
      { w: 'sine', f: [90, 25], d: 1.0, v: 0.9 }, { w: 'noise', d: 0.5, v: 0.4, lp: [3000, 200] }],
    // Before the fight: a clock ticks over a low drone while he talks.
    'wick.prelude': cat(
      [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map(function (t) { return { w: 'square', f: 1800, t: 0.3 + t, d: 0.02, v: 0.07, lp: 4000 }; }),
      [{ w: 'sawtooth', f: 55, d: 4.2, v: 0.12, lp: 300, a: 1.2, hold: 0.7 }, { w: 'sine', f: 82.5, d: 4.2, v: 0.15, a: 1.2, hold: 0.7 }]),

    // Bailed out: a till rings and the money comes back.
    bailout: cat(
      [{ w: 'square', f: 2600, d: 0.05, v: 0.12, lp: 6000 }, { w: 'noise', t: 0.05, d: 0.12, v: 0.2, hp: 3000 }, { w: 'triangle', f: 3500, t: 0.1, d: 0.35, v: 0.14 }],
      seq({ w: 'square', v: 0.1, lp: 5000 }, [[N.C5, 0.35, 0.1], [N.E5, 0.45, 0.1], [N.G5, 0.55, 0.1], [N.C6, 0.65, 0.35]]))
  };

  // ---------- Levels ----------
  // How loud each sound should peak: punches and the KO on top, signatures a step under, the button tap
  // quiet. PEAK is each recipe's measured raw peak (tools/sfx-levels.js prints it after a recipe changes);
  // the sound plays at target / peak.
  function target(id) {
    if (id === 'tap' || id === 'tick') return 0.22;
    if (/^super\./.test(id)) return 0.8;
    if (/^(ko|slam|heavy)$/.test(id)) return 0.9;
    if (/^(hit|stomp)$/.test(id)) return 0.7;
    if (/^(win|lose)$/.test(id)) return 0.55;
    if (/\./.test(id)) return 0.5;          // a fighter's signature, layered on the shared punch
    return 0.45;
  }
  // PEAK:start (written by tools/sfx-levels.js)
  var PEAK = {
    'tap': 0.116,
    'hit': 0.849,
    'heavy': 1.326,
    'stomp': 0.694,
    'whiff': 0.092,
    'bonk': 0.590,
    'hide': 0.383,
    'flop': 0.236,
    'selfhit': 0.287,
    'ko': 1.512,
    'slam': 1.692,
    'ready': 0.155,
    'win': 0.416,
    'lose': 0.161,
    'drain': 0.166,
    'hodl': 0.136,
    'snore': 0.249,
    'huh': 0.290,
    'toly.strike': 0.272,
    'toly.privacy': 0.373,
    'toly.mint.ok': 1.043,
    'toly.mint.fail': 0.213,
    'toly.rug.ok': 0.195,
    'toly.rug.fail': 0.145,
    'super.salesman': 1.191,
    'mert.strike': 0.577,
    'mert.privacy': 0.283,
    'mert.mint.ok': 0.189,
    'mert.mint.fail': 0.130,
    'mert.rug.ok': 0.455,
    'mert.rug.fail': 0.292,
    'super.helium': 0.298,
    'garlinghouse.strike': 0.156,
    'garlinghouse.privacy': 0.745,
    'garlinghouse.mint.ok': 0.389,
    'garlinghouse.mint.fail': 0.177,
    'garlinghouse.rug.ok': 0.899,
    'garlinghouse.rug.fail': 0.655,
    'super.xrparmy': 0.179,
    'vitalik.strike': 0.381,
    'vitalik.privacy': 0.321,
    'vitalik.mint.ok': 0.243,
    'vitalik.mint.fail': 0.192,
    'vitalik.rug.ok': 0.170,
    'vitalik.rug.fail': 0.289,
    'super.dance': 0.959,
    'adam.strike': 0.519,
    'adam.privacy': 0.098,
    'adam.mint.ok': 0.579,
    'adam.mint.fail': 0.309,
    'adam.rug.ok': 0.282,
    'adam.rug.fail': 0.235,
    'super.opreturn': 0.573,
    'prune': 0.368,
    'charles.strike': 0.824,
    'charles.privacy': 0.149,
    'charles.mint.ok': 0.717,
    'charles.mint.fail': 0.138,
    'charles.rug.ok': 0.168,
    'charles.rug.fail': 0.199,
    'super.midnight': 0.955,
    'saylor.strike': 0.540,
    'saylor.privacy': 0.630,
    'saylor.mint.ok': 0.193,
    'saylor.mint.fail': 0.112,
    'saylor.rug.ok': 0.412,
    'saylor.rug.fail': 0.130,
    'super.orangedot': 0.326,
    'super.astronaut': 0.896,
    'sergey.strike': 0.120,
    'sergey.privacy': 0.322,
    'sergey.mint.ok': 0.366,
    'sergey.mint.fail': 0.249,
    'sergey.rug.ok': 0.153,
    'sergey.rug.fail': 0.360,
    'stare': 0.269,
    'super.linkmarines': 0.190,
    'cz.strike': 0.769,
    'cz.privacy': 0.195,
    'cz.mint.ok': 0.166,
    'cz.mint.fail': 0.244,
    'cz.rug.ok': 0.295,
    'cz.rug.fail': 0.128,
    'deflect': 0.432,
    'super.four': 0.502,
    'adeniyi.strike': 0.192,
    'adeniyi.privacy': 0.329,
    'stored': 0.123,
    'adeniyi.mint.ok': 0.191,
    'adeniyi.mint.fail': 0.199,
    'adeniyi.rug.ok': 0.148,
    'adeniyi.rug.fail': 0.748,
    'splash': 0.527,
    'super.agentswarm': 0.151,
    'assist': 0.224,
    'satoshi': 0.375,
    'coin': 0.154,
    'tick': 0.115,
    'schiff.strike': 0.372,
    'schiff.privacy': 0.515,
    'schiff.mint.ok': 0.117,
    'schiff.mint.fail': 0.144,
    'clank': 0.811,
    'schiff.rug.ok': 0.653,
    'schiff.rug.fail': 0.185,
    'super.goldrush': 0.406,
    'dimon.strike': 0.116,
    'dimon.privacy': 0.509,
    'dimon.mint.ok': 0.153,
    'dimon.mint.fail': 0.274,
    'dimon.rug.ok': 0.664,
    'dimon.rug.fail': 0.180,
    'super.petrock': 0.876,
    'warren.strike': 0.487,
    'warren.privacy': 0.491,
    'warren.mint.ok': 0.498,
    'warren.mint.fail': 0.146,
    'warren.rug.ok': 0.638,
    'warren.rug.fail': 0.148,
    'paper': 0.133,
    'banned': 0.831,
    'super.plan': 0.710,
    'sbf.strike': 0.113,
    'sbf.privacy': 0.474,
    'sbf.mint.ok': 0.130,
    'sbf.mint.fail': 0.199,
    'sbf.rug.ok': 0.514,
    'sbf.rug.fail': 0.395,
    'beanbag': 0.613,
    'super.what': 0.923,
    'wick.strike': 0.553,
    'wick.privacy': 0.117,
    'wick.mint.ok': 0.680,
    'wick.mint.fail': 0.155,
    'wick.rug.ok': 0.568,
    'wick.rug.fail': 0.143,
    'lev.up': 0.142,
    'lev.close': 0.156,
    'super.cascade': 0.929,
    'liquidated': 1.428,
    'wick.prelude': 0.341,
    'bailout': 0.280
  };
  // PEAK:end

  // What plays for each button outcome: a shared layer plus the fighter's signature.
  function moveSounds(fighter, move, outcome) {
    var own = fighter + '.' + move;
    if (move === 'strike') return outcome === 'miss' ? ['whiff'] : ['hit', own];
    if (move === 'privacy') return outcome === 'fail' ? ['bonk'] : [own];
    var base = move === 'rug' ? 'heavy' : 'hit';
    if (outcome === 'miss') return ['whiff'];
    return outcome === 'fail' ? [own + '.fail'] : [base, own + '.ok'];
  }

  // ---------- Recorded clips ----------
  // Sound files picked from free CC0 packs (sources in docs/audio/README.md), cut with tools/clip.py so every
  // file peaks at the same level. A clip with the same name as a synth sound replaces it; until the clip has
  // loaded (it loads after the first tap), the synth sound plays.
  //   level  how loud it plays (0.89 x level is its peak)     skip  seconds cut off the start
  //   duck   the music dips under it
  var CLIPS = {
    hit:       { src: 'audio/sfx/hit.mp3', level: 0.8, skip: 0.03 },  // every red and pink hit (Punch D)
    heavy:     { src: 'audio/sfx/heavy.mp3', level: 1, skip: 0.09 },  // purple and Super hits (Punch E): most of its
                                                                       // swish is cut so the hit lands on the frame
    'ko.bell': { src: 'audio/sfx/ko-bell.mp3', level: 0.65 },         // rings over the K.O. boom
    win:       { src: 'audio/sfx/win.mp3', level: 0.62 },
    lose:      { src: 'audio/sfx/lose.mp3', level: 0.62 },
    ready:     { src: 'audio/sfx/ready.mp3', level: 0.5 },            // your Super is ready
    tap:       { src: 'audio/sfx/tap.mp3', level: 0.25 },             // any button
    satoshi:   { src: 'audio/sfx/satoshi.mp3', level: 0.6 }           // the first 6s of the user's Suno pads (story)
  };

  // ---------- Music ----------
  // loopStart/loopEnd come from tools/music.py (seconds in the cut file). The menu song starts 8 beats
  // before its drop: the title slams on the drop. vol keeps the music under the sound effects.
  var MUSIC = {
    menu: { src: 'audio/menu.mp3', loopStart: 3.3674, loopEnd: 43.7774, drop: 3.3674, beat: 60 / 142.54, vol: 0.55 },
    fight: { src: 'audio/fight.mp3', loopStart: 0.56, loopEnd: 59.728, vol: 0.42 },
    // Story bosses. Each opens on its drop hit, like the fight song. vol matches the fight song's loudness.
    schiff: { src: 'audio/schiff.mp3', loopStart: 3.233, loopEnd: 34.557, vol: 0.37 },
    dimon: { src: 'audio/dimon.mp3', loopStart: 3.363, loopEnd: 53.319, vol: 0.49 },
    warren: { src: 'audio/warren.mp3', loopStart: 6.432, loopEnd: 57.632, vol: 0.46 },
    sbf: { src: 'audio/sbf.mp3', loopStart: 2.771, loopEnd: 49.083, vol: 0.49 },
    wick: { src: 'audio/wick.mp3', loopStart: 1.625, loopEnd: 40.02, vol: 0.34 },
    // The ending plays from its quiet start (under WICK's cards) and loops its last 32 bars, the big finish.
    ending: { src: 'audio/ending.mp3', loopStart: 120.2, loopEnd: 172.84, vol: 0.54 }
  };

  // ---------- Engine (browser only) ----------
  var ctx = null, musicBus = null, voiceDuck = null, sfxBus = null, unlocked = false;
  var settings = { music: true, sfx: true }, onChange = null;
  var buffers = {}, loading = {}, clipBuffers = {}, current = null, want = null, ducked = false;

  function supported() { return typeof window !== 'undefined' && !!(window.AudioContext || window.webkitAudioContext); }

  function ensure() {
    if (ctx || !supported()) return ctx;
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    musicBus = ctx.createGain();
    voiceDuck = ctx.createGain();                       // dips the music under the announcer
    musicBus.connect(voiceDuck);
    voiceDuck.connect(ctx.destination);
    var comp = limiter(ctx);                            // keeps stacked hits from clipping
    comp.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.9;
    sfxBus.connect(comp);
    return ctx;
  }

  // Only touches sounds near full scale (hit + signature + music stacked), so quiet ones keep their level.
  function limiter(c) {
    var comp = c.createDynamicsCompressor();
    comp.threshold.value = -6;
    comp.knee.value = 4;
    comp.ratio.value = 8;
    comp.attack.value = 0.002;
    comp.release.value = 0.12;
    return comp;
  }

  function noise(c) {
    if (c._noise) return c._noise;
    var b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    c._noise = b;
    return b;
  }

  var curves = {};
  function driveCurve(k) {
    if (curves[k]) return curves[k];
    var c = new Float32Array(1024);
    for (var i = 0; i < c.length; i++) { var x = i / 511.5 - 1; c[i] = Math.tanh(k * x) / Math.tanh(k); }
    return (curves[k] = c);
  }

  function sweep(param, f, t, d) {
    if (!Array.isArray(f)) { param.setValueAtTime(f, t); return; }
    param.setValueAtTime(f[0], t);
    for (var i = 1; i < f.length; i++) param.exponentialRampToValueAtTime(Math.max(f[i], 1), t + d * i / (f.length - 1));
  }

  function voice(c, out, v, t0) {
    var t = t0 + (v.t || 0), d = v.d || 0.15, end = t + d, src;
    if (v.w === 'noise') {
      src = c.createBufferSource();
      src.buffer = noise(c);
      src.loop = true;
    } else {
      src = c.createOscillator();
      src.type = v.w || 'square';
      sweep(src.frequency, v.f || 440, t, v.fd || d);
      if (v.vib) {
        var lfo = c.createOscillator(), depth = c.createGain();
        lfo.frequency.value = v.vib[0];
        depth.gain.value = v.vib[1];
        lfo.connect(depth);
        depth.connect(src.frequency);
        lfo.start(t);
        lfo.stop(end + 0.02);
      }
    }
    var node = src;
    [['lp', 'lowpass'], ['hp', 'highpass'], ['bp', 'bandpass']].forEach(function (p) {
      if (v[p[0]] == null) return;
      var flt = c.createBiquadFilter();
      flt.type = p[1];
      flt.Q.value = v.q || (p[0] === 'bp' ? 1.2 : 0.7);
      sweep(flt.frequency, v[p[0]], t, d);
      node.connect(flt);
      node = flt;
    });
    if (v.drive) {
      var ws = c.createWaveShaper();
      ws.curve = driveCurve(v.drive);
      node.connect(ws);
      node = ws;
    }
    var g = c.createGain(), peak = v.v == null ? 0.3 : v.v, att = v.a || 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + att);
    if (v.hold) g.gain.setValueAtTime(peak, t + Math.max(att, d * v.hold));
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    node.connect(g);
    g.connect(out);
    if (v.w === 'noise') src.start(t, Math.random() * 0.8); else src.start(t);
    src.stop(end + 0.02);
  }

  function voicesOf(id, info) {
    var r = SFX[id];
    if (!r) return null;
    return typeof r === 'function' ? r(info) : r;
  }

  // Plays a sound effect `delay` seconds from now. Returns { stop(fade) } to cut it short (a skipped cut-in).
  var SILENT = { stop: function () {} };
  function play(id, delay, info) {
    if (!settings.sfx || !ensure() || ctx.state !== 'running') return SILENT;
    if (CLIPS[id] && clipBuffers[id]) return playClip(CLIPS[id], clipBuffers[id], delay);
    var vs = voicesOf(id, info);
    if (!vs) return SILENT;
    var t0 = ctx.currentTime + 0.01 + (delay || 0), g = ctx.createGain();
    g.gain.value = PEAK[id] ? target(id) / PEAK[id] : 1;
    g.connect(sfxBus);
    vs.forEach(function (v) { voice(ctx, g, v, t0); });
    return {
      stop: function (fade) {
        var now = ctx.currentTime;
        g.gain.cancelScheduledValues(now);
        g.gain.setTargetAtTime(0, now, (fade || 0.1) / 3);
      }
    };
  }

  function playClip(clip, buf, delay) {
    var t0 = ctx.currentTime + 0.01 + (delay || 0), src = ctx.createBufferSource(), g = ctx.createGain();
    src.buffer = buf;
    g.gain.value = clip.level;
    src.connect(g);
    g.connect(sfxBus);
    src.start(t0, clip.skip || 0);
    if (clip.duck) {
      voiceDuck.gain.cancelScheduledValues(t0);
      voiceDuck.gain.setTargetAtTime(0.4, t0, 0.03);
      voiceDuck.gain.setTargetAtTime(1, t0 + buf.duration, 0.15);
    }
    return {
      stop: function (fade) {
        var now = ctx.currentTime;
        g.gain.cancelScheduledValues(now);
        g.gain.setTargetAtTime(0, now, (fade || 0.1) / 3);
        voiceDuck.gain.cancelScheduledValues(now);
        voiceDuck.gain.setTargetAtTime(1, now, 0.1);
      }
    };
  }

  // Renders a sound offline (for checks): resolves to { peak, rms, seconds }. raw: no level, no compressor.
  // The sound starts 0.3s in: Chrome's compressor squashes anything at the very start of a fresh render.
  function measure(id, info, raw) {
    var vs = voicesOf(id, info), len = 0.2, pre = 0.3;
    vs.forEach(function (v) { len = Math.max(len, (v.t || 0) + (v.d || 0.15) + 0.1); });
    var Off = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    var oc = new Off(1, Math.ceil((len + pre) * 44100), 44100);
    var bus = oc.createGain();
    if (raw) bus.connect(oc.destination);
    else {
      var comp = limiter(oc);
      comp.connect(oc.destination);
      bus.gain.value = 0.9 * (PEAK[id] ? target(id) / PEAK[id] : 1);
      bus.connect(comp);
    }
    vs.forEach(function (v) { voice(oc, bus, v, pre); });
    return oc.startRendering().then(function (buf) {
      var d = buf.getChannelData(0).subarray(Math.floor(pre * 44100)), peak = 0, sum = 0;
      for (var i = 0; i < d.length; i++) { var a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; }
      return { peak: peak, rms: Math.sqrt(sum / d.length), seconds: len };
    });
  }

  function fetchBuffer(src) {
    return fetch(src)
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(function (ab) {
        return new Promise(function (res, rej) { ctx.decodeAudioData(ab, res, rej); }); // callback form for older Safari
      });
  }

  function load(name) {
    if (buffers[name]) return Promise.resolve(buffers[name]);
    if (loading[name]) return loading[name];
    if (!ensure()) return Promise.reject(new Error('no audio'));
    loading[name] = fetchBuffer(MUSIC[name].src)
      .then(function (buf) { buffers[name] = buf; return buf; })
      .catch(function (e) { delete loading[name]; throw e; });
    return loading[name];
  }

  // The clips are small (about 15 KB each): fetch them all once sound is allowed.
  var clipsLoading = false;
  function loadClips() {
    if (clipsLoading || !ensure()) return;
    clipsLoading = true;
    Object.keys(CLIPS).forEach(function (id) {
      fetchBuffer(CLIPS[id].src).then(function (buf) { clipBuffers[id] = buf; }).catch(function () { /* the synth sound plays instead */ });
    });
  }

  function latency() { return ctx ? (ctx.outputLatency || ctx.baseLatency || 0) : 0; }

  function stopMusic(fade) {
    if (!current) return;
    var c = current, now = ctx.currentTime;
    current = null;
    c.gain.gain.cancelScheduledValues(now);
    c.gain.gain.setValueAtTime(Math.max(c.gain.gain.value, 0.0001), now);
    c.gain.gain.exponentialRampToValueAtTime(0.0001, now + (fade || 0.3));
    c.src.stop(now + (fade || 0.3) + 0.05);
  }

  // Starts a song: opts.from 'start' (the menu's intro, the fight's opening hit) or 'loop'; opts.fade in seconds.
  // Returns { dropIn } seconds until the menu's drop when it plays the intro, or null.
  function music(name, opts) {
    opts = opts || {};
    want = { name: name, opts: opts };
    if (!settings.music || !ensure() || !unlocked) return null;
    if (current && current.name === name && !opts.restart) return null;
    var m = MUSIC[name], buf = buffers[name];
    if (!buf) {
      // Late: a boss song joins at its loop; a song that tells a story (the ending) still starts at the top.
      load(name).then(function () {
        if (want && want.name === name && !(current && current.name === name)) music(name, { from: opts.fromStart ? 'start' : 'loop', fade: 1 });
      }).catch(function () { /* no music, game goes on */ });
      return null;
    }
    stopMusic(0.35);
    var src = ctx.createBufferSource(), g = ctx.createGain(), now = ctx.currentTime + 0.02;
    src.buffer = buf;
    src.loop = true;
    src.loopStart = m.loopStart;
    src.loopEnd = m.loopEnd;
    src.connect(g);
    g.connect(musicBus);
    var offset = opts.from === 'loop' ? m.loopStart : 0;
    if (opts.fade) {
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(m.vol, now + opts.fade);
    } else g.gain.setValueAtTime(m.vol, now);
    src.start(now, offset);
    current = { name: name, src: src, gain: g };
    return m.drop != null && offset < m.drop ? { dropIn: m.drop - offset + 0.02 + latency() } : null;
  }

  function duck(on) {
    if (!ctx || ducked === on) return;
    ducked = on;
    var now = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setTargetAtTime(on ? 0.3 : 1, now, 0.08);
  }

  // Call from a tap: browsers only allow sound after the player touches the page.
  function unlock() {
    if (!ensure()) return;
    if (ctx.state !== 'running') ctx.resume();
    if (!unlocked) {
      var b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();  // wakes iOS audio
      s.buffer = b;
      s.connect(ctx.destination);
      s.start(0);
      unlocked = true;
      if (settings.sfx) loadClips();
    }
  }

  function set(key, on) {
    settings[key] = !!on;
    if (onChange) onChange(settings);
    if (key === 'sfx' && on && unlocked) loadClips();
    if (key === 'music') {
      if (!on) stopMusic(0.3);
      else if (want) { load(want.name).catch(function () {}); music(want.name, { from: 'loop', fade: 1 }); }
    }
  }

  function setup(opts) {
    settings.music = opts.music !== false;
    settings.sfx = opts.sfx !== false;
    onChange = opts.onChange || null;
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', function () {
        if (!ctx || !unlocked) return;
        if (document.hidden) ctx.suspend(); else ctx.resume();
      });
    }
  }

  return {
    SFX: SFX, CLIPS: CLIPS, MUSIC: MUSIC, N: N, PEAK: PEAK, target: target, moveSounds: moveSounds,
    setup: setup, unlock: unlock, load: load, music: music, stopMusic: function (f) { if (ctx) stopMusic(f); },
    duck: duck, play: play, measure: measure, set: set,
    move: function (fighter, move, outcome) {
      moveSounds(fighter, move, outcome).forEach(function (id) { if (SFX[id]) play(id); });
    },
    get settings() { return { music: settings.music, sfx: settings.sfx }; },
    get playing() { return current ? current.name : null; },
    get ready() { return !!ctx && unlocked; },
    get time() { return ctx ? ctx.currentTime : 0; },
    supported: supported
  };
});
