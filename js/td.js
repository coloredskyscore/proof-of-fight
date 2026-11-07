/* Tower Defense test mode (?td). Step 1 of three: the core loop on one map. The rules live in js/td-core.js;
   this file draws them and takes your taps.
   The Hearing: aides and paper pushers pour out of the Capitol and march down the steps and across the lawn
   toward Toly's validator node. You build his four towers (the fight mode's four buttons, under his move
   names) on any open tile, earn tokens for every kill, and hold for 15 waves. Real time, with 2x speed.
   Everything is drawn in code until the painted map and tower art exist. Sprites are drawn once per screen
   size onto small canvases, then stamped every frame, so the frame stays cheap on a phone. */
(function () {
  if (!/[?&]td\b/i.test(location.search)) return;
  var D = window.POF_DATA, AU = window.POF_AUDIO, C = window.POF_TD_CORE;
  var FOUNDER = 'toly';

  // ---------- Looks ----------
  var OL = '#15101f';                       // outline
  var ROLE = {
    strike:  { c: '#e8553f', d: '#9c2a17', l: '#ff8f74', glow: '255,120,80' },
    privacy: { c: '#2a8fb8', d: '#165a78', l: '#7fd3f2', glow: '90,190,255' },
    mint:    { c: '#d0479a', d: '#86245f', l: '#ff8fd0', glow: '255,110,200' },
    rug:     { c: '#6d4fc9', d: '#40288a', l: '#a993ff', glow: '160,120,255' }
  };
  var BLURB = { strike: 'Fast shots, hits flyers', privacy: 'Slows a crowd', mint: 'Splash, ground only', rug: 'Yanks them back' };
  // The Hearing's costumes for each enemy type.
  var COSTUME = {
    walker: 'Aide', swarm: 'Intern', sprinter: 'Lobbyist', armored: 'Filing Cabinet',
    flyer: 'Subpoena', support: 'Coffee Runner', boss: 'The Filibuster'
  };
  var SKIN = ['#f1c7a1', '#d9a07a', '#a8714c', '#7a4e33'];
  var KIT = D.FIGHTERS[FOUNDER];            // the founder's color and move names

  var S = null;                             // the running stage
  var $ = function (q, el) { return (el || document).querySelector(q); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function towerName(type) { return (KIT.moves && KIT.moves[type] && KIT.moves[type].name) || type; }

  // ---------- Sounds (synth voices, the same format as js/audio.js) ----------
  Object.assign(AU.SFX, {
    'td.pew':   [{ w: 'square', f: [1500, 520], d: 0.05, v: 0.05, lp: 5000 }, { w: 'noise', d: 0.03, v: 0.05, hp: 3000 }],
    'td.clank': [{ w: 'triangle', f: [1100, 820], d: 0.06, v: 0.09 }, { w: 'noise', d: 0.03, v: 0.06, hp: 4000 }],
    'td.thump': [{ w: 'sine', f: [170, 60], d: 0.16, v: 0.45 }, { w: 'noise', d: 0.05, v: 0.15, lp: 1200 }],
    'td.boom':  [{ w: 'sine', f: [120, 32], d: 0.38, v: 0.6 }, { w: 'noise', d: 0.32, v: 0.32, lp: [3200, 250] }],
    'td.rug':   [{ w: 'noise', d: 0.26, v: 0.3, bp: [2800, 450], q: 1.4 }, { w: 'triangle', f: [500, 180], d: 0.2, v: 0.12 }],
    'td.coin':  [{ w: 'square', f: 1760, d: 0.04, v: 0.035, lp: 6000 }, { w: 'square', f: 2640, t: 0.045, d: 0.07, v: 0.035, lp: 6000 }],
    'td.ko':    [{ w: 'square', f: [700, 90], d: 0.09, v: 0.045, lp: 3000 }, { w: 'noise', d: 0.05, v: 0.04, hp: 2500 }],
    'td.leak':  [{ w: 'sawtooth', f: [320, 110], d: 0.32, v: 0.14, lp: 2000 }, { w: 'sine', f: [110, 40], d: 0.32, v: 0.55 }],
    'td.build': [{ w: 'sine', f: [220, 70], d: 0.13, v: 0.5 }, { w: 'noise', d: 0.07, v: 0.22, lp: 2200 },
      { w: 'square', f: 1320, t: 0.08, d: 0.05, v: 0.05, lp: 5000 }],
    'td.sell':  [{ w: 'square', f: 1320, d: 0.05, v: 0.05, lp: 6000 }, { w: 'square', f: 990, t: 0.06, d: 0.08, v: 0.05, lp: 6000 }],
    'td.alarm': [{ w: 'square', f: [880, 660], d: 0.18, v: 0.07, lp: 3000 }, { w: 'square', f: [880, 660], t: 0.22, d: 0.18, v: 0.07, lp: 3000 }],
    'td.no':    [{ w: 'square', f: [220, 160], d: 0.1, v: 0.08, lp: 1500 }]
  });
  var lastSfx = {};
  function sfx(id, gap) {
    var now = performance.now();
    if (lastSfx[id] && now - lastSfx[id] < (gap || 60)) return;
    lastSfx[id] = now;
    try { AU.play(id); } catch (e) { /* no audio */ }
  }

  // ---------- Sprites ----------
  // mk(w, h, ax, ay, fn): a w x h tile canvas; fn draws in tile units with (0, 0) at the anchor (ax, ay),
  // which is where the sprite stands. stamp() puts the anchor on a screen point.
  function mk(w, h, ax, ay, fn, bare) {
    var cv = document.createElement('canvas'), T = S.T, k = S.dpr;
    cv.width = Math.max(1, Math.ceil(w * T * k));
    cv.height = Math.max(1, Math.ceil(h * T * k));
    var c = cv.getContext('2d');
    c.setTransform(T * k, 0, 0, T * k, ax * T * k, ay * T * k);
    c.lineJoin = 'round';
    c.lineCap = 'round';
    c.lineWidth = 0.05;
    c.strokeStyle = OL;
    fn(c);
    return { cv: bare ? cv : outlined(cv, Math.max(1.5, T * k * 0.05)), w: w, h: h, ax: ax, ay: ay };
  }
  // The thick dark outline around the whole sprite (inner lines stay thin): the fight mode's look.
  function outlined(cv, px) {
    var sil = document.createElement('canvas'), out = document.createElement('canvas');
    sil.width = out.width = cv.width; sil.height = out.height = cv.height;
    var s = sil.getContext('2d');
    s.drawImage(cv, 0, 0);
    s.globalCompositeOperation = 'source-in';
    s.fillStyle = OL;
    s.fillRect(0, 0, sil.width, sil.height);
    var o = out.getContext('2d');
    for (var a = 0; a < 12; a++) o.drawImage(sil, Math.cos(a / 12 * Math.PI * 2) * px, Math.sin(a / 12 * Math.PI * 2) * px);
    o.drawImage(cv, 0, 0);
    return out;
  }
  function stamp(ctx, s, x, y, scale, flip) {
    var T = S.T, k = scale || 1;
    if (flip) {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(-1, 1);
      ctx.drawImage(s.cv, -s.ax * T * k, -s.ay * T * k, s.w * T * k, s.h * T * k);
      ctx.restore();
    } else ctx.drawImage(s.cv, x - s.ax * T * k, y - s.ay * T * k, s.w * T * k, s.h * T * k);
  }
  // A copy of a sprite in one flat color (the VHS ghosts).
  function tinted(s, color) {
    var cv = document.createElement('canvas');
    cv.width = s.cv.width; cv.height = s.cv.height;
    var c = cv.getContext('2d');
    c.drawImage(s.cv, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = color;
    c.fillRect(0, 0, cv.width, cv.height);
    return { cv: cv, w: s.w, h: s.h, ax: s.ax, ay: s.ay };
  }
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }
  function ell(c, x, y, rx, ry) { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); }
  // Fill, then a thin inner line (the thick outline comes from outlined()).
  function fs(c, fill) {
    c.fillStyle = fill; c.fill();
    c.save(); c.lineWidth = 0.026; c.strokeStyle = 'rgba(21,16,31,.7)'; c.stroke(); c.restore();
  }
  // A soft round glow, drawn with 'lighter' for the bloom.
  function glowSprite(rgb) {
    var n = 64, cv = document.createElement('canvas');
    cv.width = cv.height = n;
    var c = cv.getContext('2d'), g = c.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    g.addColorStop(0, 'rgba(' + rgb + ',1)');
    g.addColorStop(0.25, 'rgba(' + rgb + ',.55)');
    g.addColorStop(1, 'rgba(' + rgb + ',0)');
    c.fillStyle = g;
    c.fillRect(0, 0, n, n);
    return cv;
  }

  // The stone pedestal every tower stands on, with a stripe in the founder's color.
  function pedestal(c, role) {
    ell(c, 0, 0.12, 0.44, 0.2); c.fillStyle = 'rgba(0,0,0,.35)'; c.fill();
    c.beginPath();
    c.moveTo(-0.38, -0.08); c.lineTo(-0.38, 0.1);
    c.ellipse(0, 0.1, 0.38, 0.16, 0, Math.PI, 0, true);
    c.lineTo(0.38, -0.08);
    c.closePath();
    fs(c, '#55506a');
    c.save(); c.clip();
    c.fillStyle = KIT.color; c.fillRect(-0.5, 0.0, 1, 0.06);
    c.restore();
    ell(c, 0, -0.08, 0.38, 0.16); fs(c, '#8a84a3');
    ell(c, 0, -0.08, 0.27, 0.11); c.fillStyle = role.d; c.fill();
  }

  function buildTowerSprites() {
    var T = {};
    // Strike: a stand plus a twin-barrel turret (drawn separately so it can turn).
    T.strike = {
      base: mk(1, 1.1, 0.5, 0.8, function (c) {
        pedestal(c, ROLE.strike);
        rr(c, -0.1, -0.3, 0.2, 0.24, 0.05); fs(c, '#3c3850');
      }),
      top: mk(1.1, 0.7, 0.4, 0.35, function (c) {
        rr(c, 0.02, -0.13, 0.5, 0.09, 0.03); fs(c, '#d9d4e8');
        rr(c, 0.02, 0.04, 0.5, 0.09, 0.03); fs(c, '#d9d4e8');
        c.fillStyle = OL; c.fillRect(0.44, -0.12, 0.06, 0.07); c.fillRect(0.44, 0.05, 0.06, 0.07);
        ell(c, 0, 0, 0.22, 0.2); fs(c, ROLE.strike.c);
        ell(c, -0.05, -0.06, 0.09, 0.06); c.fillStyle = ROLE.strike.l; c.fill();
        rr(c, -0.3, -0.07, 0.14, 0.14, 0.03); fs(c, ROLE.strike.d);
      })
    };
    // Privacy: a squat glass dome with an antenna.
    T.privacy = {
      base: mk(1, 1.3, 0.5, 1.0, function (c) {
        pedestal(c, ROLE.privacy);
        c.beginPath(); c.moveTo(0.02, -0.42); c.lineTo(0.12, -0.66); c.stroke();
        ell(c, 0.12, -0.68, 0.04, 0.04); fs(c, '#bff0ff');
        c.beginPath(); c.ellipse(0, -0.1, 0.3, 0.34, 0, Math.PI, 0); c.closePath(); fs(c, ROLE.privacy.c);
        c.beginPath(); c.ellipse(-0.08, -0.24, 0.1, 0.14, -0.4, 0, Math.PI * 2); c.fillStyle = 'rgba(220,248,255,.55)'; c.fill();
        rr(c, -0.3, -0.13, 0.6, 0.07, 0.03); fs(c, ROLE.privacy.d);
      })
    };
    // Mint: a stubby mortar with a coin press on its back.
    T.mint = {
      base: mk(1, 1.1, 0.5, 0.8, function (c) { pedestal(c, ROLE.mint); }),
      top: mk(1, 1.1, 0.5, 0.85, function (c) {
        rr(c, -0.2, -0.5, 0.4, 0.44, 0.08); fs(c, ROLE.mint.c);
        ell(c, 0, -0.5, 0.2, 0.08); fs(c, ROLE.mint.d);
        ell(c, 0, -0.5, 0.13, 0.05); c.fillStyle = OL; c.fill();
        c.fillStyle = ROLE.mint.l; c.fillRect(-0.14, -0.42, 0.06, 0.3);
        rr(c, -0.26, -0.16, 0.52, 0.12, 0.04); fs(c, ROLE.mint.d);
      }),
      press: mk(0.6, 0.6, 0.3, 0.3, function (c) {      // the press block with a coin in it
        rr(c, -0.16, -0.12, 0.32, 0.18, 0.04); fs(c, '#5b5670');
        ell(c, 0, -0.16, 0.1, 0.05); fs(c, '#ffd23f');
      })
    };
    // Rug: a wooden spool with a purple carpet rolled on it.
    T.rug = {
      base: mk(1.1, 1.1, 0.55, 0.8, function (c) {
        pedestal(c, ROLE.rug);
        c.fillStyle = '#6b4a2e';
        rr(c, -0.3, -0.36, 0.06, 0.32, 0.02); fs(c, '#6b4a2e');
        rr(c, 0.24, -0.36, 0.06, 0.32, 0.02); fs(c, '#6b4a2e');
      }),
      top: mk(1.1, 0.9, 0.55, 0.4, function (c) {
        // a carpet rolled on the posts, its loose end hanging down the front with a fringe
        rr(c, -0.12, -0.02, 0.3, 0.34, 0.02); fs(c, ROLE.rug.d);
        c.fillStyle = '#ffd23f'; c.fillRect(-0.08, 0.06, 0.22, 0.025); c.fillRect(-0.08, 0.2, 0.22, 0.025);
        c.strokeStyle = '#ffd23f'; c.lineWidth = 0.025;
        for (var k = -0.1; k <= 0.17; k += 0.045) { c.beginPath(); c.moveTo(k, 0.32); c.lineTo(k, 0.39); c.stroke(); }
        c.strokeStyle = OL;
        rr(c, -0.3, -0.14, 0.56, 0.26, 0.12); fs(c, ROLE.rug.c);
        c.fillStyle = 'rgba(255,255,255,.25)'; c.fillRect(-0.22, -0.1, 0.4, 0.04);
        c.fillStyle = '#ffd23f'; c.fillRect(-0.2, -0.14, 0.035, 0.26); c.fillRect(0.12, -0.14, 0.035, 0.26);
        ell(c, 0.26, -0.01, 0.075, 0.13); fs(c, ROLE.rug.l);
        c.strokeStyle = ROLE.rug.d; c.lineWidth = 0.022;
        c.beginPath(); c.ellipse(0.26, -0.01, 0.045, 0.08, 0, 0, Math.PI * 1.6); c.stroke();
        c.beginPath(); c.ellipse(0.26, -0.01, 0.02, 0.04, 0, 0, Math.PI * 1.5); c.stroke();
      })
    };
    return T;
  }

  // People: the aides, interns, lobbyists and coffee runners. o: colors and extras; f: the walk frame.
  function person(c, o, f) {
    var s = o.scale || 1;
    c.save();
    c.scale(s, s);
    var lf = f ? 0.05 : -0.05;
    c.fillStyle = o.pants;
    rr(c, -0.1 + lf * 0.4, -0.2, 0.08, 0.2, 0.03); fs(c, o.pants);
    rr(c, 0.02 - lf * 0.4, -0.2, 0.08, 0.2, 0.03); fs(c, o.pants);
    rr(c, -0.12 + lf * 0.4, -0.03, 0.11, 0.05, 0.02); fs(c, '#1b1720');
    rr(c, 0.02 - lf * 0.4, -0.03, 0.11, 0.05, 0.02); fs(c, '#1b1720');
    if (o.pack) { rr(c, -0.2, -0.42, 0.1, 0.18, 0.04); fs(c, o.pack); }
    rr(c, -0.15, -0.44, 0.3, 0.27, 0.07); fs(c, o.suit);
    if (o.apron) { rr(c, -0.1, -0.36, 0.2, 0.22, 0.03); fs(c, o.apron); }
    c.beginPath(); c.moveTo(-0.06, -0.44); c.lineTo(0.06, -0.44); c.lineTo(0, -0.35); c.closePath(); c.fillStyle = o.shirt; c.fill();
    if (o.tie) { c.fillStyle = o.tie; c.fillRect(-0.016, -0.42, 0.032, 0.1); }
    if (o.badge) { c.fillStyle = '#fff'; c.fillRect(0.03, -0.33, 0.07, 0.08); c.strokeRect(0.03, -0.33, 0.07, 0.08); }
    rr(c, -0.2, -0.42 + (f ? 0.02 : 0), 0.07, 0.2, 0.03); fs(c, o.suit);
    rr(c, 0.13, -0.42 + (f ? 0 : 0.02), 0.07, 0.2, 0.03); fs(c, o.suit);
    if (o.case) { rr(c, 0.12, -0.25, 0.17, 0.13, 0.02); fs(c, '#6b4224'); c.fillStyle = '#d9b45a'; c.fillRect(0.19, -0.27, 0.04, 0.03); }
    if (o.folder) { rr(c, 0.1, -0.33, 0.13, 0.16, 0.01); fs(c, '#e8d9a8'); }
    if (o.tray) {
      rr(c, -0.24, -0.47, 0.48, 0.05, 0.02); fs(c, '#b7b2c4');
      [-0.15, 0, 0.15].forEach(function (x) { rr(c, x - 0.045, -0.58, 0.09, 0.11, 0.02); fs(c, '#f4efe6'); c.fillStyle = '#3ddc97'; c.fillRect(x - 0.045, -0.54, 0.09, 0.025); });
    }
    ell(c, 0, -0.55, 0.12, 0.12); fs(c, o.skin);
    c.beginPath(); c.arc(0, -0.57, 0.12, Math.PI * 1.05, Math.PI * 1.95); c.lineTo(0.08, -0.6); c.closePath(); fs(c, o.hair);
    c.fillStyle = OL;
    c.fillRect(0.035, -0.56, 0.025, 0.03);
    c.restore();
  }
  function buildEnemySprites() {
    var E = {};
    function frames(w, h, ax, ay, fn) { return [0, 1].map(function (f) { return mk(w, h, ax, ay, function (c) { fn(c, f); }); }); }
    E.walker = SKIN.map(function (skin, k) {
      return frames(0.8, 0.9, 0.4, 0.82, function (c, f) {
        person(c, { suit: ['#35558f', '#5b4a86', '#3d6b52', '#7a5636'][k], pants: '#2b3550', shirt: '#f4f1ea', tie: ['#c8402b', '#2a6fd8', '#c8402b', '#e0a800'][k],
          skin: skin, hair: ['#2a1d14', '#5a3a1e', '#1a1a1a', '#c9b089'][k], badge: true, folder: true }, f);
      });
    });
    E.swarm = SKIN.map(function (skin, k) {
      return frames(0.6, 0.7, 0.3, 0.64, function (c, f) {
        person(c, { scale: 0.74, suit: ['#9cc7ea', '#f2f2f2', '#c7e6b5', '#f5d6a3'][k], pants: '#b9a57a', shirt: '#fff', skin: skin,
          hair: ['#3a2a1a', '#e2c27a', '#1a1a1a', '#7a3d1e'][k], badge: true, pack: '#3d6fb8' }, f);
      });
    });
    E.sprinter = SKIN.map(function (skin, k) {
      return frames(0.85, 0.9, 0.4, 0.82, function (c, f) {
        person(c, { suit: '#55556a', pants: '#3a3a48', shirt: '#f4f1ea', tie: '#d63a9a', skin: skin, hair: '#111', case: true }, f);
      });
    });
    E.support = SKIN.map(function (skin, k) {
      return frames(0.8, 0.95, 0.4, 0.86, function (c, f) {
        person(c, { suit: '#f4f1ea', pants: '#3a3340', shirt: '#fff', apron: '#2f8f5b', skin: skin, hair: ['#2a1d14', '#a0522d', '#111', '#ddd'][k], tray: true }, f);
      });
    });
    E.armored = [frames(0.8, 1, 0.4, 0.92, function (c, f) {     // a rolling filing cabinet, eyebrows and all
      var lg = f ? 0.03 : -0.03;
      c.fillStyle = '#2a2833';
      rr(c, -0.18 + lg, -0.08, 0.08, 0.08, 0.02); fs(c, '#2a2833');
      rr(c, 0.1 - lg, -0.08, 0.08, 0.08, 0.02); fs(c, '#2a2833');
      rr(c, -0.24, -0.8, 0.48, 0.74, 0.04); fs(c, '#8e97a6');
      c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(-0.21, -0.77, 0.06, 0.68);
      [-0.74, -0.5, -0.28].forEach(function (y) {
        rr(c, -0.19, y, 0.38, 0.2, 0.02); fs(c, '#a7afbc');
        rr(c, -0.07, y + 0.12, 0.14, 0.04, 0.02); fs(c, '#3b3f4a');
      });
      c.fillStyle = '#fff'; c.fillRect(-0.09, -0.71, 0.18, 0.07); c.strokeRect(-0.09, -0.71, 0.18, 0.07);
      c.lineWidth = 0.045;
      c.beginPath(); c.moveTo(-0.15, -0.6); c.lineTo(-0.04, -0.56); c.moveTo(0.15, -0.6); c.lineTo(0.04, -0.56); c.stroke();
      c.fillStyle = OL; ell(c, -0.08, -0.53, 0.025, 0.025); c.fill(); ell(c, 0.08, -0.53, 0.025, 0.025); c.fill();
      c.fillStyle = '#c8402b'; c.fillRect(0.1, -0.33, 0.12, 0.05);
    })];
    E.flyer = [frames(0.8, 0.6, 0.4, 0.3, function (c, f) {      // a subpoena flapping its corners
      var u = f ? -0.12 : 0.04;
      c.beginPath(); c.moveTo(-0.2, -0.1); c.lineTo(-0.36, -0.1 + u); c.lineTo(-0.2, 0.06); c.closePath(); fs(c, '#e6e1d4');
      c.beginPath(); c.moveTo(0.2, -0.1); c.lineTo(0.36, -0.1 + u); c.lineTo(0.2, 0.06); c.closePath(); fs(c, '#e6e1d4');
      rr(c, -0.2, -0.16, 0.4, 0.3, 0.02); fs(c, '#fbf8ef');
      c.fillStyle = '#9a96a8';
      [-0.1, -0.04, 0.02].forEach(function (y) { c.fillRect(-0.15, y, 0.24, 0.025); });
      c.fillStyle = '#1a1a1a'; c.fillRect(-0.15, -0.13, 0.18, 0.035);
      ell(c, 0.12, 0.06, 0.055, 0.055); fs(c, '#c8102e');
    })];
    E.boss = [frames(1.3, 1.5, 0.65, 1.36, function (c, f) {     // The Filibuster: a walking stack of bills
      var lg = f ? 0.04 : -0.04;
      rr(c, -0.2 + lg, -0.2, 0.1, 0.2, 0.03); fs(c, '#2a2833');
      rr(c, 0.1 - lg, -0.2, 0.1, 0.2, 0.03); fs(c, '#2a2833');
      rr(c, -0.26 + lg, -0.05, 0.16, 0.07, 0.03); fs(c, '#111');
      rr(c, 0.1 - lg, -0.05, 0.16, 0.07, 0.03); fs(c, '#111');
      var y = -0.2;
      [[-0.42, 0.84, '#f1ecdf'], [-0.38, 0.8, '#e8e1cf'], [-0.44, 0.86, '#f6f2e7'], [-0.36, 0.78, '#ece5d3'], [-0.4, 0.82, '#f3eee2'], [-0.37, 0.76, '#e9e2d0']]
        .forEach(function (p, k) {
          var h = 0.17;
          y -= h;
          rr(c, p[0] + (k % 2 ? 0.03 : 0), y, p[1], h, 0.02); fs(c, p[2]);
          c.fillStyle = 'rgba(0,0,0,.12)';
          c.fillRect(p[0] + 0.05, y + 0.06, p[1] - 0.1, 0.012); c.fillRect(p[0] + 0.05, y + 0.1, p[1] - 0.1, 0.012);
        });
      c.fillStyle = '#c8102e'; c.fillRect(-0.44, -0.78, 0.9, 0.1); c.strokeRect(-0.44, -0.78, 0.9, 0.1);
      ell(c, -0.14, -0.95, 0.09, 0.07); fs(c, '#fff');
      ell(c, 0.14, -0.95, 0.09, 0.07); fs(c, '#fff');
      c.fillStyle = OL; ell(c, -0.11, -0.94, 0.035, 0.035); c.fill(); ell(c, 0.17, -0.94, 0.035, 0.035); c.fill();
      c.lineWidth = 0.05; c.beginPath(); c.moveTo(-0.26, -1.06); c.lineTo(-0.06, -1.0); c.moveTo(0.26, -1.06); c.lineTo(0.06, -1.0); c.stroke();
    })];
    return E;
  }

  // Toly's validator node: a server tower with a phone docked on top.
  function buildBaseSprite() {
    return mk(2, 2.4, 1, 2.05, function (c) {
      ell(c, 0, 0, 0.8, 0.28); c.fillStyle = 'rgba(0,0,0,.4)'; c.fill();
      rr(c, -0.66, -0.2, 1.32, 0.24, 0.06); fs(c, '#3b3650');
      rr(c, -0.5, -1.45, 1.0, 1.3, 0.08); fs(c, '#22202e');
      c.fillStyle = '#2d2a3c'; c.fillRect(-0.42, -1.37, 0.84, 1.14);
      for (var k = 0; k < 6; k++) { rr(c, -0.38, -1.32 + k * 0.18, 0.76, 0.13, 0.02); fs(c, '#34314a'); }
      c.fillStyle = KIT.color; c.fillRect(-0.5, -0.32, 1.0, 0.05);
      // the phone, standing in its dock
      rr(c, -0.2, -1.55, 0.4, 0.12, 0.03); fs(c, '#4a4560');
      rr(c, -0.17, -2.0, 0.34, 0.5, 0.06); fs(c, '#16141e');
      rr(c, -0.13, -1.95, 0.26, 0.4, 0.03); c.fillStyle = '#0e3b33'; c.fill();
    });
  }
  function buildCoinSprite() {
    return mk(0.5, 0.5, 0.25, 0.25, function (c) {
      ell(c, 0, 0, 0.16, 0.16); fs(c, '#ffd23f');
      ell(c, 0, 0, 0.1, 0.1); c.strokeStyle = '#c79400'; c.lineWidth = 0.035; c.stroke();
      c.fillStyle = '#fff6c8'; c.fillRect(-0.07, -0.1, 0.035, 0.07);
    });
  }

  // ---------- The map, drawn once per size ----------
  var LAWN = ['#4f9b3f', '#58a547'], MOUND = ['#66b24f', '#6dba55'], TERRACE = '#5aa64a', TERRACE_FACE = '#8c7b62';
  var PLAZA = '#d9d2c3', PLAZA_FACE = '#a59c8a', PATH = '#e6d6a8', PATH_EDGE = '#bfa978', DIRT = '#7a5a3a';
  function tileTop(c, r) {
    var M = S.G.map, t = M.tile(c, r), h = M.height(c, r);
    if (t === 'w') return '#3b7fc4';
    if (M.onPath[c + ',' + r]) return PATH;
    if (h === 2 && r < 5) return PLAZA;
    if (r >= 5 && r < 9) return TERRACE;
    if (h > 0) return MOUND[(c + r) % 2];
    return LAWN[c % 2];
  }
  function faceColor(c, r) {
    var M = S.G.map, h = M.height(c, r);
    if (h === 2 && r < 5) return PLAZA_FACE;
    if (r >= 5 && r < 9) return TERRACE_FACE;
    return DIRT;
  }
  function drawTerrain() {
    var M = S.G.map, T = S.T, L = S.L, cv = S.terrain;
    cv.width = Math.round(S.W * S.dpr); cv.height = Math.round(S.H * S.dpr);
    var c = cv.getContext('2d');
    c.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    // the sky behind the Capitol
    var sky = c.createLinearGradient(0, 0, 0, S.oy + T * 0.5);
    sky.addColorStop(0, '#7fb6e8'); sky.addColorStop(1, '#cfe6f5');
    c.fillStyle = sky;
    c.fillRect(0, 0, S.W, S.oy + T);
    // a deep border so the map reads as a diorama on a table
    c.fillStyle = '#2f5d2a';
    c.fillRect(0, S.oy + T * 0.6, S.W, S.H);
    for (var r = 0; r < M.def.rows; r++) {
      for (var cc = 0; cc < M.def.cols; cc++) {
        var h = M.height(cc, r), x = S.ox + cc * T, y = S.oy + r * T - h * L;
        c.fillStyle = tileTop(cc, r);
        c.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
        var top = tileTop(cc, r);
        if (top === PATH) {
          // gravel: edges where the path doesn't continue
          c.fillStyle = PATH_EDGE;
          var on = function (dc, dr) { return M.onPath[(cc + dc) + ',' + (r + dr)] || M.tile(cc + dc, r + dr) === 'B' || (r + dr <= 1 && M.tile(cc + dc, r + dr) === '#'); };
          var e = T * 0.09;
          if (!on(0, -1)) c.fillRect(x, y, T, e);
          if (!on(0, 1)) c.fillRect(x, y + T - e, T, e);
          if (!on(-1, 0)) c.fillRect(x, y, e, T);
          if (!on(1, 0)) c.fillRect(x + T - e, y, e, T);
          c.fillStyle = 'rgba(120,96,50,.18)';
          for (var k = 0; k < 5; k++) c.fillRect(x + ((cc * 37 + r * 11 + k * 23) % 90) / 100 * T, y + ((cc * 13 + r * 29 + k * 41) % 90) / 100 * T, T * 0.06, T * 0.06);
        } else if (top === PLAZA) {
          c.strokeStyle = 'rgba(120,110,90,.22)'; c.lineWidth = 1;
          c.strokeRect(x + 0.5, y + 0.5, T - 1, T - 1);
        } else if (top !== '#3b7fc4') {
          c.fillStyle = 'rgba(255,255,255,.05)';
          if ((cc * 7 + r * 3) % 5 === 0) c.fillRect(x + T * 0.3, y + T * 0.4, T * 0.05, T * 0.12);
          if ((cc * 5 + r * 11) % 7 === 0) c.fillRect(x + T * 0.65, y + T * 0.2, T * 0.05, T * 0.1);
        }
      }
      // faces: where this row stands above the row in front of it
      for (cc = 0; cc < M.def.cols; cc++) {
        h = M.height(cc, r);
        var hb = r + 1 < M.def.rows ? M.height(cc, r + 1) : -1.2;
        if (hb >= h) continue;
        x = S.ox + cc * T; y = S.oy + (r + 1) * T - h * L;
        var fh = (h - hb) * L;
        var stairs = M.onPath[cc + ',' + r] && M.onPath[cc + ',' + (r + 1)];
        if (stairs) {
          for (var s = 0; s < 4; s++) {
            c.fillStyle = s % 2 ? '#cbb98a' : '#efe2bb';
            c.fillRect(x, y + s * fh / 4, T, fh / 4 + 0.5);
          }
          c.fillStyle = PATH_EDGE; c.fillRect(x, y, T * 0.09, fh); c.fillRect(x + T * 0.91, y, T * 0.09, fh);
        } else {
          c.fillStyle = faceColor(cc, r);
          c.fillRect(x - 0.5, y, T + 1, fh);
          if (faceColor(cc, r) !== DIRT) {
            c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1;
            for (var b = 1; b < h - hb + 1; b++) { c.beginPath(); c.moveTo(x, y + fh * b / (h - hb + 1)); c.lineTo(x + T, y + fh * b / (h - hb + 1)); c.stroke(); }
          } else {
            c.fillStyle = 'rgba(0,0,0,.15)'; c.fillRect(x, y + fh * 0.5, T, fh * 0.5);
          }
          c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(x - 0.5, y, T + 1, Math.max(1.5, T * 0.05));
        }
      }
    }
    // a soft shadow at the foot of every cliff, so the heights read at a glance
    for (r = 0; r < M.def.rows - 1; r++) for (cc = 0; cc < M.def.cols; cc++) {
      var hh = M.height(cc, r), hl = M.height(cc, r + 1);
      if (hl >= hh) continue;
      var fy = S.oy + (r + 1) * T - hl * L, g = c.createLinearGradient(0, fy, 0, fy + T * 0.35);
      g.addColorStop(0, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g;
      c.fillRect(S.ox + cc * T, fy, T, T * 0.35);
    }
    drawCapitol(c);
    drawTrees(c);
  }
  // The Capitol across the top two rows, the door at the path's start.
  function drawCapitol(c) {
    var M = S.G.map, T = S.T, L = S.L, x0 = S.ox + 2 * T, x1 = S.ox + 11 * T, cx = (x0 + x1) / 2;
    var ground = S.oy + 2 * T - 2 * L;         // the plaza's front edge under the building
    c.save();
    c.lineJoin = 'round';
    c.strokeStyle = OL; c.lineWidth = Math.max(1.5, T * 0.05);
    // the steps
    for (var k = 0; k < 4; k++) {
      c.fillStyle = k % 2 ? '#e3dccc' : '#f2ecdf';
      var sw = (x1 - x0) * (0.5 - k * 0.06);
      c.fillRect(cx - sw / 2, ground - (k + 1) * T * 0.12, sw, T * 0.12);
    }
    var fy = ground - T * 0.48, fh = T * 1.25;   // facade bottom and height
    c.fillStyle = '#efe9dc';
    c.fillRect(x0, fy - fh, x1 - x0, fh);
    c.strokeRect(x0, fy - fh, x1 - x0, fh);
    // wings' windows
    c.fillStyle = '#9fb1c4';
    for (var w = 0; w < 4; w++) {
      [x0 + T * (0.35 + w * 0.6), x1 - T * (0.6 + w * 0.6)].forEach(function (wx) {
        c.fillRect(wx, fy - fh * 0.72, T * 0.22, fh * 0.26);
        c.fillRect(wx, fy - fh * 0.34, T * 0.22, fh * 0.22);
      });
    }
    // the center portico: columns and a pediment
    var px = T * 2.4;
    c.fillStyle = '#f7f2e7';
    c.fillRect(cx - px, fy - fh * 1.05, px * 2, fh * 1.05);
    c.strokeRect(cx - px, fy - fh * 1.05, px * 2, fh * 1.05);
    c.fillStyle = 'rgba(80,70,60,.22)';
    for (var col = 0; col < 8; col++) {
      var colX = cx - px + T * 0.18 + col * (px * 2 - T * 0.36) / 7;
      c.fillRect(colX - T * 0.05, fy - fh * 0.95, T * 0.1, fh * 0.95);
    }
    c.fillStyle = '#efe9dc';
    c.beginPath(); c.moveTo(cx - px - T * 0.1, fy - fh * 1.05); c.lineTo(cx, fy - fh * 1.45); c.lineTo(cx + px + T * 0.1, fy - fh * 1.05); c.closePath();
    c.fill(); c.stroke();
    // the door the aides come out of
    c.fillStyle = '#3b2a1e';
    rrPx(c, cx - T * 0.32, fy - T * 0.7, T * 0.64, T * 0.7, T * 0.3); c.fill(); c.stroke();
    // the dome
    var dy = fy - fh * 1.45, dw = T * 1.9;
    c.fillStyle = '#efe9dc';
    c.fillRect(cx - dw / 2, dy - T * 0.55, dw, T * 0.55); c.strokeRect(cx - dw / 2, dy - T * 0.55, dw, T * 0.55);
    c.fillStyle = 'rgba(80,70,60,.25)';
    for (var dc = 0; dc < 9; dc++) c.fillRect(cx - dw / 2 + T * 0.12 + dc * (dw - T * 0.24) / 8 - T * 0.03, dy - T * 0.5, T * 0.06, T * 0.45);
    c.fillStyle = '#f4efe4';
    c.beginPath(); c.ellipse(cx, dy - T * 0.55, dw * 0.46, T * 0.72, 0, Math.PI, 0); c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = 'rgba(80,70,60,.3)'; c.lineWidth = 1;
    for (var rib = -2; rib <= 2; rib++) { c.beginPath(); c.ellipse(cx, dy - T * 0.55, Math.abs(rib) * dw * 0.09 + 0.1, T * 0.72, 0, Math.PI, Math.PI * 2); c.stroke(); }
    c.strokeStyle = OL; c.lineWidth = Math.max(1.5, T * 0.05);
    c.fillStyle = '#efe9dc';
    c.fillRect(cx - T * 0.13, dy - T * 1.49, T * 0.26, T * 0.26); c.strokeRect(cx - T * 0.13, dy - T * 1.49, T * 0.26, T * 0.26);
    c.beginPath(); c.moveTo(cx, dy - T * 1.49); c.lineTo(cx, dy - T * 1.7); c.stroke();
    c.restore();
    S.capitol = { cx: cx, top: fy - fh * 1.05, x0: x0, x1: x1, fy: fy };
  }
  function rrPx(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x, y + h); c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r); c.lineTo(x + w, y + h); c.closePath();
  }
  function drawTrees(c) {
    var M = S.G.map, T = S.T, L = S.L;
    for (var r = 0; r < M.def.rows; r++) for (var cc = 0; cc < M.def.cols; cc++) {
      if (M.tile(cc, r) !== 't') continue;
      var x = S.ox + (cc + 0.5) * T, y = S.oy + (r + 0.7) * T - M.height(cc, r) * L;
      c.save();
      c.translate(x, y); c.scale(T, T);
      c.lineWidth = 0.05; c.strokeStyle = OL; c.lineJoin = 'round';
      ell(c, 0, 0.05, 0.38, 0.15); c.fillStyle = 'rgba(0,0,0,.3)'; c.fill();
      // outline every part first, then fill: one thick outline around the whole tree
      var parts = [
        function () { rr(c, -0.06, -0.3, 0.12, 0.34, 0.03); }, function () { ell(c, -0.14, -0.45, 0.24, 0.22); },
        function () { ell(c, 0.15, -0.48, 0.24, 0.22); }, function () { ell(c, 0, -0.66, 0.26, 0.24); }];
      var fills = ['#6b4a2e', '#2f7a3a', '#2f7a3a', '#3f9448'];
      c.lineWidth = 0.1;
      parts.forEach(function (f) { f(); c.stroke(); });
      parts.forEach(function (f, k) { f(); c.fillStyle = fills[k]; c.fill(); });
      ell(c, -0.06, -0.72, 0.1, 0.08); c.fillStyle = 'rgba(255,255,255,.18)'; c.fill();
      c.restore();
    }
  }

  // ---------- Screen and size ----------
  function layout() {
    var field = $('#td-field'), cv = $('#td-cv');
    var W = field.clientWidth, H = field.clientHeight, M = S.G.map.def;
    var TOP = 2.9;                                   // tiles of sky over the plaza, for the dome
    var T = Math.floor(Math.min(W / M.cols, H / (M.rows + TOP)) * 2) / 2;
    S.W = W; S.H = H; S.T = T; S.L = T * 0.45;
    S.dpr = Math.min(2, window.devicePixelRatio || 1);
    S.ox = Math.round((W - M.cols * T) / 2);
    S.oy = Math.round(H - M.rows * T - (H - (M.rows + TOP) * T) / 2) ;
    cv.width = Math.round(W * S.dpr); cv.height = Math.round(H * S.dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    S.spr = { tower: buildTowerSprites(), enemy: buildEnemySprites(), base: buildBaseSprite(), coin: buildCoinSprite() };
    S.ghost = {};
    Object.keys(S.spr.enemy).forEach(function (k) {
      S.ghost[k] = S.spr.enemy[k].map(function (v) { return v.map(function (s) { return { r: tinted(s, '#ff2a55'), b: tinted(s, '#22e6ff') }; }); });
    });
    S.glow = { white: glowSprite('255,255,255'), gold: glowSprite('255,210,63'), red: glowSprite('255,60,60'), green: glowSprite('61,220,151') };
    Object.keys(ROLE).forEach(function (k) { S.glow[k] = glowSprite(ROLE[k].glow); });
    drawTerrain();
    paintShop();
    var tok = $('#td-tok').getBoundingClientRect(), fr = field.getBoundingClientRect();
    S.tokAt = { x: tok.left - fr.left + 10, y: tok.top - fr.top + tok.height / 2 };
  }
  function sx(x) { return S.ox + x * S.T; }
  function sy(y, h) { return S.oy + y * S.T - h * S.L; }
  // The tile under a screen point: front rows first, since a raised tile can cover the one behind it.
  function tileAt(px, py) {
    var M = S.G.map;
    for (var r = M.def.rows - 1; r >= 0; r--) for (var c = 0; c < M.def.cols; c++) {
      var x = S.ox + c * S.T, y = S.oy + r * S.T - M.height(c, r) * S.L;
      if (px >= x && px < x + S.T && py >= y && py < y + S.T) return { c: c, r: r };
    }
    return null;
  }

  function build() {
    var old = $('#screen-td');
    if (old) old.remove();
    var sec = document.createElement('section');
    sec.id = 'screen-td';
    sec.className = 'screen td';
    sec.hidden = true;
    var coin = '<i class="td-coin" aria-hidden="true"></i>';
    sec.innerHTML =
      '<div class="td-top">' +
        '<button class="btn btn-ghost btn-sm td-back" id="td-back" type="button" aria-label="Menu" title="Menu">←</button>' +
        '<span class="td-stat td-int" id="td-intbox" title="Node integrity"><i class="td-node" aria-hidden="true"></i><b id="td-int"></b></span>' +
        '<span class="td-stat td-tokbox" title="Tokens">' + coin + '<b id="td-tok"></b></span>' +
        '<span class="td-stat td-wave"><small>WAVE</small><b id="td-wave"></b></span>' +
        '<button class="btn btn-ghost btn-sm td-speed" id="td-speed" type="button" aria-label="Game speed">1x</button>' +
        '<button class="btn btn-ghost btn-sm td-pause" id="td-pause" type="button" aria-label="Pause">❚❚</button>' +
      '</div>' +
      '<div class="td-field" id="td-field">' +
        '<canvas id="td-cv"></canvas>' +
        '<div class="td-banner" id="td-banner" hidden></div>' +
        '<div class="td-next" id="td-next" hidden><div class="td-prev" id="td-prev"></div><button class="btn btn-gold td-go" id="td-go" type="button"></button></div>' +
        '<div class="td-pop" id="td-pop" hidden></div>' +
        '<div class="td-paused" id="td-paused" hidden><b>PAUSED</b><button class="btn btn-gold" id="td-resume" type="button">Resume</button></div>' +
        '<div class="td-end" id="td-end" hidden></div>' +
      '</div>' +
      '<div class="td-shop" id="td-shop"></div>';
    $('#app').appendChild(sec);
    $('#td-back').addEventListener('click', leave);
    $('#td-speed').addEventListener('click', function () { S.speed = S.speed === 1 ? 2 : 1; this.textContent = S.speed + 'x'; this.classList.toggle('on', S.speed === 2); });
    $('#td-pause').addEventListener('click', function () { setPaused(true); });
    $('#td-resume').addEventListener('click', function () { setPaused(false); });
    $('#td-go').addEventListener('click', callWave);
    var shop = $('#td-shop');
    C.ORDER.forEach(function (type, k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'td-card';
      b.dataset.type = type;
      b.style.setProperty('--c', ROLE[type].c);
      b.style.setProperty('--d', ROLE[type].d);
      b.innerHTML = '<span class="td-thumb"><img alt=""></span><span class="td-cname">' + esc(towerName(type)) + '</span>' +
        '<span class="td-cost">' + coin + C.TOWERS[type].cost + '</span><kbd>' + (k + 1) + '</kbd>';
      b.title = towerName(type) + ': ' + BLURB[type];
      b.addEventListener('click', function () { pick(S.pick === type ? null : type); });
      shop.appendChild(b);
    });
    var cv = $('#td-cv');
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse' && S) S.hover = null; });
  }
  function paintShop() {
    C.ORDER.forEach(function (type) {
      var img = $('.td-card[data-type="' + type + '"] img');
      if (!img) return;
      var cv = document.createElement('canvas'), n = 96;
      cv.width = cv.height = n;
      var c = cv.getContext('2d'), sp = S.spr.tower[type], k = n / (S.T * S.dpr) / 1.25;
      c.setTransform(k, 0, 0, k, 0, 0);
      var px = n / k / 2, py = n / k * 0.78;
      c.drawImage(sp.base.cv, px - sp.base.ax * S.T * S.dpr, py - sp.base.ay * S.T * S.dpr);
      if (sp.top) {
        var dy = type === 'strike' ? -0.32 : type === 'rug' ? -0.42 : -0.12;
        c.drawImage(sp.top.cv, px - sp.top.ax * S.T * S.dpr, py + dy * S.T * S.dpr - sp.top.ay * S.T * S.dpr);
      }
      img.src = cv.toDataURL();
    });
  }

  // ---------- Input ----------
  function local(e) { var r = e.target.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
  function towerOn(c, r) { return S.G.towers.find(function (t) { return t.c === c && t.r === r; }); }
  function pick(type) {
    S.pick = type;
    S.hover = null;
    S.armed = null;
    if (type) select(null);
    document.querySelectorAll('.td-card').forEach(function (b) { b.classList.toggle('on', b.dataset.type === type); });
    sfx('tap', 0);
  }
  function onMove(e) {
    if (!S || e.pointerType !== 'mouse') return;
    var p = local(e);
    S.hover = tileAt(p.x, p.y);
  }
  function onDown(e) {
    if (!S || S.G.phase === 'won' || S.G.phase === 'lost' || S.paused) return;
    AU.unlock();
    var p = local(e), at = tileAt(p.x, p.y);
    if (!at) { select(null); return; }
    var t = towerOn(at.c, at.r);
    if (t) { pick(null); select(t.id === S.sel ? null : t.id); return; }
    if (!S.pick) { select(null); return; }
    // A touch shows where the tower would go first; a second tap on the same tile builds it.
    if (e.pointerType !== 'mouse' && !(S.armed && S.armed.c === at.c && S.armed.r === at.r)) {
      S.armed = at; S.hover = at;
      return;
    }
    tryBuild(S.pick, at.c, at.r);
  }
  function tryBuild(type, c, r) {
    var G = S.G, cost = C.TOWERS[type].cost;
    if (!G.canBuild(type, c, r)) { sfx('td.no', 100); flashMsg(type === 'rug' && G.map.open(c, r) ? 'Rugs go next to the path' : "Can't build there", c, r); return null; }
    if (G.tokens < cost) { sfx('td.no', 100); flashMsg('Need ' + cost + ' tokens', c, r); bump($('#td-tok').parentNode, 'short'); return null; }
    var t = G.build(type, c, r);
    S.armed = null;
    if (G.tokens < cost) pick(null);
    return t;
  }
  function select(id) {
    S.sel = id;
    var pop = $('#td-pop');
    if (!id) { pop.hidden = true; return; }
    var t = S.G.towers.find(function (x) { return x.id === id; });
    if (!t) { pop.hidden = true; return; }
    var T = C.TOWERS[t.type];
    var stat = t.type === 'privacy' ? 'Slows 40% · ' + T.dps + ' dmg/s' :
      t.type === 'rug' ? T.dmg + ' dmg, pulls back ' + T.yank + ' tiles' :
      t.type === 'mint' ? T.dmg + ' splash · every ' + (1 / T.rate).toFixed(1) + 's' : T.dmg + ' dmg · ' + T.rate + '/s';
    pop.innerHTML = '<b style="color:' + ROLE[t.type].l + '">' + esc(towerName(t.type)) + '</b>' +
      '<small>' + esc(stat) + ' · range ' + t.range + (t.h && t.type !== 'rug' ? ' (+' + t.h + ' high ground)' : '') + '</small>' +
      '<small>' + t.kills + ' takedown' + (t.kills === 1 ? '' : 's') + '</small>' +
      '<button class="btn btn-sm td-sell" type="button">Sell <i class="td-coin"></i>' + S.G.sellValue(t) + '</button>';
    pop.hidden = false;
    $('.td-sell', pop).addEventListener('click', function () { S.G.sell(t.id); select(null); });
    var w = pop.offsetWidth, h = pop.offsetHeight, x = clamp(sx(t.x) - w / 2, 4, S.W - w - 4), y = sy(t.y - 0.5, t.h) - S.T * 0.9 - h;
    if (y < 4) y = sy(t.y + 0.5, t.h) + 6;
    pop.style.left = x + 'px'; pop.style.top = y + 'px';
  }
  function onKey(e) {
    if (!S || e.repeat) return;
    var k = '1234'.indexOf(e.key);
    if (k >= 0) { pick(S.pick === C.ORDER[k] ? null : C.ORDER[k]); e.preventDefault(); }
    else if (e.key === 'Escape') { pick(null); select(null); }
    else if (e.key === ' ' && !$('#td-next').hidden) { callWave(); e.preventDefault(); }
    else if (e.key === 'p') setPaused(!S.paused);
  }
  function setPaused(on) {
    if (!S || S.G.phase === 'won' || S.G.phase === 'lost') return;
    S.paused = on;
    $('#td-paused').hidden = !on;
  }
  function callWave() {
    if (!S) return;
    AU.unlock();
    var G = S.G;
    if (G.phase !== 'ready' && G.phase !== 'break') return;
    G.startWave();
  }

  // ---------- Effects ----------
  function fx(o) { S.fx.push(o); return o; }
  function spark(x, y, color, n, speed, life) {
    for (var k = 0; k < n; k++) {
      var a = Math.random() * Math.PI * 2, v = rnd(0.3, 1) * speed;
      fx({ kind: 'spark', x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, g: speed * 2.2, life: life * rnd(0.6, 1), max: life, color: color, size: rnd(0.6, 1) });
    }
  }
  function floatText(text, x, y, color, size) { fx({ kind: 'text', text: text, x: x, y: y, vy: -S.T * 0.9, life: 0.9, max: 0.9, color: color, size: size || 0.36 }); }
  function flashMsg(text, c, r) { floatText(text, sx(c + 0.5), sy(r, S.G.map.height(c, r)), '#fff', 0.34); }
  function shake(n) { S.shake = Math.max(S.shake, n); }
  function bump(el, cls) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }
  function banner(text, sub, cls) {
    var b = $('#td-banner');
    b.className = 'td-banner ' + (cls || '');
    b.innerHTML = '<b>' + esc(text) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '');
    b.hidden = false;
    bump(b, 'show');
    clearTimeout(S.bannerTimer);
    S.bannerTimer = setTimeout(function () { b.hidden = true; }, 2100);
  }
  // Where an enemy is drawn: its lane offset across the path, its height, and a pull-back after a rug.
  function enemyScreen(e) {
    var M = S.G.map, x = e.x + -e.dy * e.lane, y = e.y + e.dx * e.lane;
    var h = M.height(Math.floor(e.x), Math.floor(e.y));
    if (e._h === undefined) e._h = h;
    if (e._yank) {
      var k = 1 - e._yank.t / e._yank.max, ease = 1 - Math.pow(1 - k, 3);
      x = e._yank.x + (x - e._yank.x) * ease; y = e._yank.y + (y - e._yank.y) * ease;
    }
    return { x: sx(x), y: sy(y, e._h), h: e._h };
  }

  function onEvent(ev) {
    var G = S.G, T = S.T, p;
    switch (ev.type) {
      case 'spawn':
        ev.e.skin = Math.floor(Math.random() * 4);
        ev.e.phase = Math.random() * 6;
        break;
      case 'fire':
        ev.t.kick = 1;
        if (ev.t.type === 'strike') {
          var a = ev.t.angle, mx = sx(ev.t.x) + Math.cos(a) * T * 0.5, my = sy(ev.t.y, ev.t.h) - T * 0.32 + Math.sin(a) * T * 0.5;
          fx({ kind: 'flash', x: mx, y: my, life: 0.07, max: 0.07, color: 'strike', size: 0.9 });
          sfx('td.pew', 45);
        } else if (ev.t.type === 'mint') sfx('td.thump', 80);
        else if (ev.t.type === 'rug') sfx('td.rug', 80);
        break;
      case 'hit':
        p = enemyScreen(ev.e);
        if (ev.armor) { spark(p.x, p.y - T * 0.35, '#d9dde6', 3, T * 2.2, 0.25); sfx('td.clank', 70); }
        else spark(p.x, p.y - T * 0.35, ROLE.strike.l, 3, T * 1.8, 0.22);
        ev.e.flash = 0.08;
        break;
      case 'boom':
        var bx = sx(ev.x), by = sy(ev.y, G.map.height(Math.floor(ev.x), Math.floor(ev.y)));
        fx({ kind: 'ring', x: bx, y: by, life: 0.35, max: 0.35, r: C.TOWERS.mint.splash * T, color: ROLE.mint.l });
        fx({ kind: 'flash', x: bx, y: by - T * 0.2, life: 0.18, max: 0.18, color: 'mint', size: 2.6 });
        spark(bx, by - T * 0.1, ROLE.mint.l, 10, T * 3, 0.45);
        spark(bx, by - T * 0.1, '#ffd23f', 5, T * 2.4, 0.5);
        shake(ev.n ? 3 : 1.5);
        sfx('td.boom', 90);
        break;
      case 'rug':
        p = { x: ev.x, y: ev.y };
        if (ev.yank) {
          ev.e._yank = { x: ev.x + -ev.e.dy * ev.e.lane, y: ev.y + ev.e.dx * ev.e.lane, t: 0.32, max: 0.32 };
          fx({ kind: 'carpet', e: ev.e, x0: ev.x, y0: ev.y, life: 0.45, max: 0.45 });
        }
        floatText(ev.yank ? 'RUGGED!' : 'TOO HEAVY', sx(ev.x), sy(ev.y, G.map.height(Math.floor(ev.x), Math.floor(ev.y))) - T * 0.6, ROLE.rug.l, 0.34);
        shake(2);
        break;
      case 'kill':
        p = enemyScreen(ev.e);
        var sp = spriteFor(ev.e);
        fx({ kind: 'ghost', e: ev.e, x: p.x, y: p.y + (ev.e.fly ? -S.T * 0.75 : 0), life: 0.42, max: 0.42, flip: ev.e.dx < 0, sp: sp });
        fx({ kind: 'tok', x: p.x, y: p.y - T * 0.4, sx: p.x, sy: p.y - T * 0.4, life: 0.75, max: 0.75 });
        floatText('+' + ev.tokens, p.x + T * 0.25, p.y - T * 0.6, '#ffd23f', 0.3);
        sfx('td.ko', 50);
        if (ev.e.type === 'boss') { shake(7); banner('FILIBUSTER DOWN', '+' + ev.tokens + ' tokens', 'good'); }
        break;
      case 'leak':
        shake(6);
        bump($('#td-field'), 'hurt');
        bump($('#td-intbox'), 'hit');
        var bp = S.G.map.def.base;
        spark(sx(bp[0] + 0.5), sy(bp[1], 0) - T, '#ff5a36', 10, T * 3, 0.5);
        S.baseHit = 0.4;
        sfx('td.leak', 120);
        if (G.integrity > 0 && G.integrity <= G.maxIntegrity / 4) sfx('td.alarm', 2500);
        break;
      case 'build':
        ev.t.pop = 0.3;
        spark(sx(ev.t.x), sy(ev.t.y, ev.t.h) + T * 0.1, '#d8cfb0', 8, T * 1.4, 0.35);
        sfx('td.build', 60);
        break;
      case 'sell':
        spark(sx(ev.t.x), sy(ev.t.y, ev.t.h) - T * 0.3, '#ffd23f', 10, T * 2, 0.5);
        floatText('+' + ev.tokens, sx(ev.t.x), sy(ev.t.y, ev.t.h) - T * 0.8, '#ffd23f', 0.36);
        sfx('td.sell', 60);
        break;
      case 'early':
        floatText('+' + ev.tokens + ' EARLY', S.W / 2, S.H * 0.55, '#ffd23f', 0.5);
        break;
      case 'wave':
        var boss = ev.boss;
        banner('WAVE ' + ev.wave, boss ? 'The Filibuster is coming' : ev.wave === G.waves ? 'Final wave' : '', boss ? 'warn' : '');
        try { AU.play('ready'); } catch (e) { /* no audio */ }
        if (ev.wave === G.waves) AU.music('warren', { fade: 1 });
        break;
      case 'clear':
        if (ev.wave < G.waves) banner('WAVE ' + ev.wave + ' CLEAR', '+' + ev.tokens + ' tokens', 'good');
        try { AU.play('lev.up'); } catch (e) { /* no audio */ }
        break;
      case 'won': setTimeout(function () { if (S) end(true); }, 900); break;
      case 'lost': setTimeout(function () { if (S) end(false); }, 900); shake(10); break;
    }
  }
  function spriteFor(e) {
    var set = S.spr.enemy[e.type];
    return set[(e.skin || 0) % set.length];
  }

  // ---------- Drawing ----------
  function render(dt) {
    var c = S.ctx, G = S.G, T = S.T, now = S.clock;
    c.setTransform(S.dpr, 0, 0, S.dpr, 0, 0);
    c.clearRect(0, 0, S.W, S.H);
    if (S.shake > 0.1) c.translate(rnd(-1, 1) * S.shake, rnd(-1, 1) * S.shake);
    c.drawImage(S.terrain, 0, 0, S.W, S.H);
    drawAmbient(c, now);
    drawGround(c, now);
    drawThings(c, now, dt);
    drawLight(c);
    drawShots(c);
    drawFx(c, dt);
    drawBars(c);
    drawPlacing(c, now);
  }

  function drawAmbient(c, now) {
    var T = S.T, M = S.G.map;
    // the reflecting pool's shimmer
    for (var r = 0; r < M.def.rows; r++) for (var cc = 0; cc < M.def.cols; cc++) {
      if (M.tile(cc, r) !== 'w') continue;
      var x = sx(cc), y = sy(r, M.height(cc, r));
      c.fillStyle = 'rgba(255,255,255,.35)';
      for (var k = 0; k < 2; k++) {
        var ph = (now * 0.4 + cc * 0.37 + r * 0.61 + k * 0.5) % 1;
        c.fillRect(x + T * (0.15 + 0.6 * ((k * 0.7 + r * 0.3) % 1)), y + T * ph, T * 0.25 * Math.sin(ph * Math.PI), Math.max(1, T * 0.04));
      }
    }
    // flags on the Capitol
    var cap = S.capitol;
    [cap.x0 + T * 0.4, cap.x1 - T * 0.4].forEach(function (fxp, k) {
      var top = cap.fy - T * 2.1;
      c.strokeStyle = OL; c.lineWidth = Math.max(1, T * 0.04);
      c.beginPath(); c.moveTo(fxp, cap.fy - T * 1.25); c.lineTo(fxp, top); c.stroke();
      c.beginPath();
      for (var i = 0; i <= 6; i++) {
        var wx = fxp + i * T * 0.07, wy = top + Math.sin(now * 5 + i * 0.9 + k) * T * 0.04;
        if (i === 0) c.moveTo(wx, wy); else c.lineTo(wx, wy);
      }
      for (i = 6; i >= 0; i--) c.lineTo(fxp + i * T * 0.07, top + T * 0.26 + Math.sin(now * 5 + i * 0.9 + k) * T * 0.04);
      c.closePath();
      c.fillStyle = '#c8102e'; c.fill();
      c.fillStyle = '#1f3b8a'; c.fillRect(fxp, top + T * 0.02, T * 0.17, T * 0.12);
    });
    // drifting cloud shadows
    c.fillStyle = 'rgba(10,30,20,.08)';
    for (var k2 = 0; k2 < 3; k2++) {
      var cx = ((now * 6 + k2 * 260) % (S.W + 300)) - 150, cy = S.oy + T * (4 + k2 * 6);
      c.beginPath(); c.ellipse(cx, cy, T * 2.6, T * 1.1, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(cx + T * 1.5, cy + T * 0.4, T * 1.6, T * 0.8, 0, 0, Math.PI * 2); c.fill();
    }
  }

  function rangeCircle(c, x, y, h, range, role, strong) {
    var R = range * S.T, X = sx(x), Y = sy(y, h);
    c.save();
    c.fillStyle = 'rgba(' + ROLE[role].glow + ',' + (strong ? 0.14 : 0.08) + ')';
    c.strokeStyle = 'rgba(' + ROLE[role].glow + ',.8)';
    c.lineWidth = 2;
    c.setLineDash([6, 5]);
    c.beginPath(); c.arc(X, Y, R, 0, Math.PI * 2); c.fill(); c.stroke();
    c.restore();
  }

  function drawGround(c, now) {
    var G = S.G, T = S.T;
    // Privacy fields: a slow pulse, brighter while they hold someone
    G.towers.forEach(function (t) {
      if (t.type !== 'privacy') return;
      var X = sx(t.x), Y = sy(t.y, t.h), R = t.range * T, pulse = 0.5 + 0.5 * Math.sin(now * 3 + t.id);
      var g = c.createRadialGradient(X, Y, R * 0.2, X, Y, R);
      g.addColorStop(0, 'rgba(90,190,255,0)');
      g.addColorStop(0.75, 'rgba(70,170,255,' + (t.active ? 0.1 + pulse * 0.05 : 0.04) + ')');
      g.addColorStop(1, 'rgba(110,200,255,' + (t.active ? 0.26 : 0.1) + ')');
      c.fillStyle = g;
      c.beginPath(); c.arc(X, Y, R, 0, Math.PI * 2); c.fill();
      if (t.active) {
        var rp = (now * 0.8 + t.id * 0.3) % 1;
        c.strokeStyle = 'rgba(170,230,255,' + (0.5 * (1 - rp)) + ')';
        c.lineWidth = 2;
        c.beginPath(); c.arc(X, Y, R * rp, 0, Math.PI * 2); c.stroke();
      }
    });
    // the selected tower's reach
    if (S.sel) {
      var t = G.towers.find(function (x) { return x.id === S.sel; });
      if (t) rangeCircle(c, t.x, t.y, t.h, t.range, t.type, true);
      else select(null);
    }
    // shadows under flyers and coins in the air
    c.fillStyle = 'rgba(0,0,0,.25)';
    G.enemies.forEach(function (e) {
      if (!e.fly) return;
      var p = enemyScreen(e);
      c.beginPath(); c.ellipse(p.x, p.y, T * 0.2, T * 0.08, 0, 0, Math.PI * 2); c.fill();
    });
    G.shots.forEach(function (s) {
      if (s.kind !== 'coin') return;
      var k = s.t / s.dur, x = s.x0 + (s.tx - s.x0) * k, y = s.y0 + (s.ty - s.y0) * k;
      var h = S.G.map.height(Math.floor(x), Math.floor(y));
      c.beginPath(); c.ellipse(sx(x), sy(y, h), T * 0.12 * (0.6 + k * 0.4), T * 0.05, 0, 0, Math.PI * 2); c.fill();
      // where it will land
      c.strokeStyle = 'rgba(255,143,208,' + (0.25 + k * 0.5) + ')'; c.lineWidth = 1.5;
      var hh = S.G.map.height(Math.floor(s.tx), Math.floor(s.ty));
      c.beginPath(); c.ellipse(sx(s.tx), sy(s.ty, hh), T * C.TOWERS.mint.splash * (1.1 - k * 0.3), T * C.TOWERS.mint.splash * 0.5 * (1.1 - k * 0.3), 0, 0, Math.PI * 2); c.stroke();
    });
  }

  function drawThings(c, now, dt) {
    var G = S.G, T = S.T, list = [];
    G.towers.forEach(function (t) { list.push({ y: t.y, t: t }); });
    G.enemies.forEach(function (e) { if (!e.fly) list.push({ y: e.y + 0.01, e: e }); });
    var bp = G.map.def.base;
    list.push({ y: bp[1] + 0.2, base: true });
    list.sort(function (a, b) { return a.y - b.y; });
    list.forEach(function (o) {
      if (o.t) drawTower(c, o.t, now, dt);
      else if (o.e) drawEnemy(c, o.e, now, dt);
      else drawBase(c, now, dt);
    });
    G.enemies.forEach(function (e) { if (e.fly) drawEnemy(c, e, now, dt); });
  }

  function drawTower(c, t, now, dt) {
    var T = S.T, sp = S.spr.tower[t.type], X = sx(t.x), Y = sy(t.y, t.h) + T * 0.2;
    var k = 1;
    if (t.pop > 0) { t.pop -= dt; var q = 1 - t.pop / 0.3; k = 0.5 + q * 0.5 + Math.sin(q * Math.PI) * 0.25; }
    t.kick = Math.max(0, (t.kick || 0) - dt * 8);
    if (k !== 1) { c.save(); c.translate(X, Y); c.scale(k, k); c.translate(-X, -Y); }
    stamp(c, sp.base, X, Y);
    if (t.type === 'strike') {
      var a = t.angle, back = t.kick * T * 0.08;
      c.save();
      c.translate(X - Math.cos(a) * back, Y - T * 0.52 - Math.sin(a) * back);
      c.rotate(a);
      stamp(c, sp.top, 0, 0);
      c.restore();
    } else if (t.type === 'mint') {
      var lean = clamp(Math.cos(t.angle), -1, 1) * 0.22, squash = 1 - t.kick * 0.12;
      c.save();
      c.translate(X, Y - T * 0.28);
      c.rotate(lean);
      c.scale(1 + t.kick * 0.08, squash);
      stamp(c, sp.top, 0, 0);
      stamp(c, sp.press, 0, -T * 0.05 + t.kick * T * 0.08);
      c.restore();
    } else if (t.type === 'rug') {
      var ready = t.cool <= 0.05;
      c.save();
      c.translate(X, Y - T * 0.52);
      c.scale(Math.cos(t.angle) < 0 ? -1 : 1, 1);
      stamp(c, sp.top, 0, 0);
      c.restore();
      if (ready) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.25 + 0.15 * Math.sin(now * 6 + t.id); c.drawImage(S.glow.rug, X - T * 0.45, Y - T * 0.95, T * 0.9, T * 0.9); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
    } else if (t.type === 'privacy' && t.active) {
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.5 + 0.3 * Math.sin(now * 8);
      c.drawImage(S.glow.privacy, X - T * 0.5, Y - T * 0.9, T, T);
      c.drawImage(S.glow.white, X + T * 0.02, Y - T * 1.0, T * 0.22, T * 0.22);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    }
    if (k !== 1) c.restore();
  }

  function drawEnemy(c, e, now, dt) {
    var T = S.T, p = enemyScreen(e), sp = spriteFor(e);
    var h = S.G.map.height(Math.floor(e.x), Math.floor(e.y));
    e._h += (h - e._h) * Math.min(1, dt * 7);
    if (e._yank) { e._yank.t -= dt; if (e._yank.t <= 0) e._yank = null; }
    var slow = e.slowT > 0, step = (now * (slow ? 4 : 7) * e.speed + e.phase), f = Math.floor(step) % 2;
    var bob = e.fly ? -T * 0.75 + Math.sin(now * 4 + e.phase) * T * 0.08 : -Math.abs(Math.sin(step * Math.PI)) * T * 0.04;
    if (!e.fly) { c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(p.x, p.y + T * 0.02, T * (e.type === 'boss' ? 0.45 : 0.2), T * 0.08, 0, 0, Math.PI * 2); c.fill(); }
    if (slow) {
      c.strokeStyle = 'rgba(140,215,255,.8)'; c.lineWidth = 2;
      c.beginPath(); c.ellipse(p.x, p.y + T * 0.02, T * 0.26, T * 0.1, 0, 0, Math.PI * 2); c.stroke();
    }
    var flip = e.dx < -0.01, y = p.y + bob;
    if (e.type === 'armored') {
      c.save(); c.translate(p.x, y); c.rotate(Math.sin(step * Math.PI) * 0.05); stamp(c, sp[0], 0, 0, 1, flip); c.restore();
    } else stamp(c, sp[f], p.x, y, 1, flip);
    if (e.type === 'support') {   // the coffee's heal aura
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.25 + 0.15 * Math.sin(now * 5 + e.phase);
      var R = C.ENEMIES.support.healR * T;
      c.drawImage(S.glow.green, p.x - R, p.y - R * 0.5, R * 2, R);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
    if (e.flash > 0) {
      e.flash -= dt;
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.7;
      c.drawImage(S.glow.white, p.x - T * 0.35, y - T * 0.75, T * 0.7, T * 0.7);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
  }

  function drawBase(c, now, dt) {
    var G = S.G, T = S.T, bp = G.map.def.base, X = sx(bp[0] + 0.5), Y = sy(bp[1], 0) + T * 0.3;
    var hurt = 1 - G.integrity / G.maxIntegrity;
    if (S.baseHit > 0) S.baseHit -= dt;
    var jx = S.baseHit > 0 ? rnd(-1, 1) * T * 0.06 : 0;
    stamp(c, S.spr.base, X + jx, Y);
    // the server lights: steady teal when healthy, a red blink as it fails
    for (var row = 0; row < 6; row++) for (var k = 0; k < 4; k++) {
      var on = Math.sin(now * (3 + k) + row * 1.7 + k) > -0.2;
      var red = hurt > 0.5 && (row + k) % 3 === 0 && Math.sin(now * 9) > 0;
      c.fillStyle = red ? '#ff4d4d' : on ? KIT.color : '#1d3b36';
      c.fillRect(X + jx - T * 0.3 + k * T * 0.12, Y - T * 1.36 + row * T * 0.18, T * 0.07, T * 0.05);
    }
    // the phone's screen
    var sc = hurt > 0.75 && Math.sin(now * 8) > 0 ? '#ff4d4d' : KIT.color;
    c.fillStyle = sc;
    c.globalAlpha = 0.85;
    c.fillRect(X + jx - T * 0.11, Y - T * 1.93, T * 0.22, T * 0.36);
    c.globalAlpha = 1;
    c.fillStyle = '#062a24';
    c.font = 'bold ' + Math.round(T * 0.22) + 'px Bungee, sans-serif';
    c.textAlign = 'center';
    c.fillText('◎', X + jx, Y - T * 1.68);
    c.globalCompositeOperation = 'lighter';
    c.globalAlpha = 0.35 + Math.sin(now * 2) * 0.1;
    c.drawImage(hurt > 0.75 ? S.glow.red : S.glow.green, X - T * 0.6, Y - T * 2.35, T * 1.2, T * 1.0);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    // cracks, then smoke, as integrity drops
    if (hurt > 0.25) {
      c.strokeStyle = '#0a0910'; c.lineWidth = Math.max(1, T * 0.04);
      c.beginPath(); c.moveTo(X - T * 0.42, Y - T * 1.2); c.lineTo(X - T * 0.25, Y - T * 1.05); c.lineTo(X - T * 0.32, Y - T * 0.9);
      if (hurt > 0.5) { c.moveTo(X + T * 0.45, Y - T * 0.6); c.lineTo(X + T * 0.28, Y - T * 0.5); c.lineTo(X + T * 0.35, Y - T * 0.32); }
      c.stroke();
    }
    if (hurt > 0.5 && Math.random() < dt * (hurt > 0.75 ? 9 : 4)) {
      fx({ kind: 'smoke', x: X + rnd(-0.3, 0.3) * T, y: Y - T * 1.45, vx: rnd(-6, 6), vy: -T * 0.8, life: 1.2, max: 1.2, size: rnd(0.25, 0.4) });
    }
    if (hurt > 0.5 && Math.random() < dt * 3) spark(X + rnd(-0.4, 0.4) * T, Y - T * rnd(0.5, 1.3), '#ffd23f', 2, T * 1.5, 0.3);
  }

  // Day to dusk to a red night as the waves go on, and a red pulse while the Filibuster walks.
  function drawLight(c) {
    var G = S.G, w = G.wave, boss = G.enemies.some(function (e) { return e.type === 'boss'; });
    var tint = w <= 4 ? null : w <= 9 ? 'rgba(255,170,90,' + ((w - 4) * 0.03) + ')' : w <= 13 ? 'rgba(150,70,170,' + (0.18 + (w - 9) * 0.03) + ')' : 'rgba(130,30,60,.38)';
    if (tint) {
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = tint;
      c.fillRect(-20, -20, S.W + 40, S.H + 40);
      c.globalCompositeOperation = 'source-over';
    }
    if (boss) {
      c.fillStyle = 'rgba(255,40,60,' + (0.05 + 0.04 * Math.sin(S.clock * 4)) + ')';
      c.fillRect(-20, -20, S.W + 40, S.H + 40);
    }
  }

  function drawShots(c) {
    var G = S.G, T = S.T;
    c.globalCompositeOperation = 'lighter';
    G.shots.forEach(function (s) {
      if (s.kind === 'bullet') {
        var h = S.G.map.height(Math.floor(s.x), Math.floor(s.y)) * 0.5 + s.from.h * 0.5;
        var X = sx(s.x), Y = sy(s.y, h) - T * 0.4, dx = s.target.x - s.x, dy = s.target.y - s.y, d = Math.hypot(dx, dy) || 1;
        var tl = T * 0.45;
        c.strokeStyle = 'rgba(255,170,120,.9)';
        c.lineWidth = Math.max(1.5, T * 0.07);
        c.beginPath(); c.moveTo(X - dx / d * tl, Y - dy / d * tl); c.lineTo(X, Y); c.stroke();
        c.drawImage(S.glow.strike, X - T * 0.25, Y - T * 0.25, T * 0.5, T * 0.5);
      }
    });
    c.globalCompositeOperation = 'source-over';
    G.shots.forEach(function (s) {
      if (s.kind === 'coin') {
        var k = s.t / s.dur, x = s.x0 + (s.tx - s.x0) * k, y = s.y0 + (s.ty - s.y0) * k;
        var h0 = s.from.h, h1 = S.G.map.height(Math.floor(s.tx), Math.floor(s.ty)), arc = 4 * k * (1 - k);
        var X = sx(x), Y = sy(y, h0 + (h1 - h0) * k) - arc * T * 1.4 - T * 0.5 * (1 - k);
        c.save();
        c.translate(X, Y);
        c.scale(Math.cos(S.clock * 14 + s.tx) * 0.9 + 0.1, 1);
        stamp(c, S.spr.coin, 0, 0, 1.3);
        c.restore();
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = 0.8;
        c.drawImage(S.glow.mint, X - T * 0.35, Y - T * 0.35, T * 0.7, T * 0.7);
        c.globalAlpha = 1;
        c.globalCompositeOperation = 'source-over';
        if (Math.random() < 0.5) fx({ kind: 'spark', x: X, y: Y, vx: rnd(-8, 8), vy: rnd(-8, 8), g: 0, life: 0.3, max: 0.3, color: ROLE.mint.l, size: 0.7 });
      } else if (s.kind === 'rug') {
        // the carpet unrolls from the spool to the target
        var e = s.target, k2 = Math.min(1, s.t / s.dur);
        if (!e.alive) return;
        var p = enemyScreen(e), X0 = sx(s.from.x), Y0 = sy(s.from.y, s.from.h) - T * 0.35;
        var X1 = X0 + (p.x - X0) * k2, Y1 = Y0 + (p.y - T * 0.1 - Y0) * k2;
        carpet(c, X0, Y0, X1, Y1, T * 0.3);
      }
    });
  }
  function carpet(c, x0, y0, x1, y1, w) {
    var dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1, nx = -dy / d * w / 2, ny = dx / d * w / 2;
    c.fillStyle = ROLE.rug.c;
    c.strokeStyle = OL; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x0 + nx, y0 + ny); c.lineTo(x1 + nx, y1 + ny); c.lineTo(x1 - nx, y1 - ny); c.lineTo(x0 - nx, y0 - ny); c.closePath();
    c.fill(); c.stroke();
    c.strokeStyle = '#ffd23f'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(x0 + nx * 0.6, y0 + ny * 0.6); c.lineTo(x1 + nx * 0.6, y1 + ny * 0.6); c.moveTo(x0 - nx * 0.6, y0 - ny * 0.6); c.lineTo(x1 - nx * 0.6, y1 - ny * 0.6); c.stroke();
  }

  function drawFx(c, dt) {
    var T = S.T;
    S.fx = S.fx.filter(function (f) {
      f.life -= dt;
      if (f.life <= 0) {
        if (f.kind === 'tok') { bump($('#td-tok').parentNode, 'got'); sfx('td.coin', 40); }
        return false;
      }
      var k = f.life / f.max;
      if (f.kind === 'spark') {
        f.vy += (f.g || 0) * dt;
        f.x += f.vx * dt; f.y += f.vy * dt;
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = Math.min(1, k * 1.5);
        c.fillStyle = f.color;
        var z = T * 0.08 * f.size;
        c.fillRect(f.x - z / 2, f.y - z / 2, z, z);
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      } else if (f.kind === 'flash') {
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = k;
        var g = S.glow[f.color] || S.glow.white, R = T * f.size * (1.2 - k * 0.2);
        c.drawImage(g, f.x - R / 2, f.y - R / 2, R, R);
        c.drawImage(S.glow.white, f.x - R / 4, f.y - R / 4, R / 2, R / 2);
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      } else if (f.kind === 'ring') {
        c.strokeStyle = f.color; c.globalAlpha = k; c.lineWidth = 3 * k + 1;
        c.beginPath(); c.ellipse(f.x, f.y, f.r * (1.15 - k * 0.6), f.r * 0.55 * (1.15 - k * 0.6), 0, 0, Math.PI * 2); c.stroke();
        c.globalAlpha = 1;
      } else if (f.kind === 'text') {
        f.y += f.vy * dt; f.vy *= 0.92;
        c.globalAlpha = Math.min(1, k * 2);
        c.font = Math.round(T * f.size) + 'px Bungee, Impact, sans-serif';
        c.textAlign = 'center';
        c.lineWidth = Math.max(2, T * 0.1); c.strokeStyle = OL; c.lineJoin = 'round';
        c.strokeText(f.text, f.x, f.y);
        c.fillStyle = f.color;
        c.fillText(f.text, f.x, f.y);
        c.globalAlpha = 1;
      } else if (f.kind === 'smoke') {
        f.x += f.vx * dt; f.y += f.vy * dt;
        c.fillStyle = 'rgba(40,36,48,' + (0.45 * k) + ')';
        c.beginPath(); c.arc(f.x, f.y, T * f.size * (1.6 - k), 0, Math.PI * 2); c.fill();
      } else if (f.kind === 'tok') {
        // the token flies up to the counter
        var q = 1 - k, e = q * q * (3 - 2 * q);
        var x = f.sx + (S.tokAt.x - f.sx) * e, y = f.sy + (S.tokAt.y - f.sy) * e - Math.sin(q * Math.PI) * T * 1.2;
        stamp(c, S.spr.coin, x, y, 1.1);
      } else if (f.kind === 'carpet') {
        if (!f.e.alive && !f.e.leaked) { /* draw anyway: the yank still happened */ }
        var p = f.e.alive ? enemyScreen(f.e) : null, h0 = S.G.map.height(Math.floor(f.x0), Math.floor(f.y0));
        var X0 = sx(f.x0), Y0 = sy(f.y0, h0);
        if (p) { c.globalAlpha = Math.min(1, k * 2); carpet(c, X0, Y0, p.x, p.y, T * 0.36); c.globalAlpha = 1; }
      } else if (f.kind === 'ghost') {
        // the VHS break-up: red and cyan copies pull apart in slices and fade
        var s = f.sp[0], sw = s.cv.width, shh = s.cv.height, gh = S.ghost[f.e.type][(f.e.skin || 0) % S.ghost[f.e.type].length][0];
        var W = s.w * T, H = s.h * T, ox = f.x - s.ax * T, oy = f.y - s.ay * T, spread = (1 - k) * T * 0.35, slices = 6;
        c.globalCompositeOperation = 'lighter';
        c.globalAlpha = k;
        for (var i = 0; i < slices; i++) {
          var j = (Math.sin(i * 12.9 + f.max * 99 + (1 - k) * 30) * 0.5) * T * 0.25 * (1 - k);
          var sy0 = shh * i / slices, sh = shh / slices;
          [[gh.r, -spread + j], [gh.b, spread - j]].forEach(function (g) {
            c.save();
            if (f.flip) { c.translate(f.x * 2, 0); c.scale(-1, 1); }
            c.drawImage(g[0].cv, 0, sy0, sw, sh, ox + g[1], oy + H * i / slices, W, H / slices);
            c.restore();
          });
        }
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      }
      return true;
    });
    S.shake *= Math.pow(0.002, dt);
  }

  function drawBars(c) {
    var T = S.T;
    S.G.enemies.forEach(function (e) {
      if (e.hp >= e.maxHp * 0.97 && e.type !== 'boss') return;
      var p = enemyScreen(e), big = e.type === 'boss', w = T * (big ? 1.1 : 0.55), h = Math.max(3, T * (big ? 0.12 : 0.08));
      var y = p.y - T * (big ? 1.6 : e.fly ? 1.1 : e.type === 'armored' ? 1.05 : 0.88), x = p.x - w / 2, k = clamp(e.hp / e.maxHp, 0, 1);
      c.fillStyle = OL; c.fillRect(x - 1, y - 1, w + 2, h + 2);
      c.fillStyle = k > 0.5 ? '#3ddc97' : k > 0.25 ? '#ffd23f' : '#ff4d4d';
      c.fillRect(x, y, w * k, h);
      if (e.armor) { c.fillStyle = '#c9ced8'; c.fillRect(x - 1, y + h + 1, w + 2, Math.max(1.5, T * 0.035)); }
    });
  }

  // While picking a spot: open tiles light up, the ghost tower shows its reach.
  function drawPlacing(c, now) {
    var G = S.G, T = S.T, type = S.pick;
    if (!type) return;
    var M = G.map;
    for (var r = 0; r < M.def.rows; r++) for (var cc = 0; cc < M.def.cols; cc++) {
      if (!G.canBuild(type, cc, r)) continue;
      c.fillStyle = 'rgba(255,255,255,' + (0.07 + 0.04 * Math.sin(now * 4)) + ')';
      c.fillRect(sx(cc) + 1, sy(r, M.height(cc, r)) + 1, T - 2, T - 2);
    }
    var at = S.hover;
    if (!at) return;
    var ok = G.canBuild(type, at.c, at.r) && G.tokens >= C.TOWERS[type].cost, h = M.height(at.c, at.r);
    var range = C.TOWERS[type].range + (type === 'rug' ? 0 : h);
    rangeCircle(c, at.c + 0.5, at.r + 0.5, h, range, type, true);
    c.globalAlpha = 0.65;
    var sp = S.spr.tower[type], X = sx(at.c + 0.5), Y = sy(at.r + 0.5, h) + T * 0.2;
    stamp(c, sp.base, X, Y);
    if (sp.top) stamp(c, sp.top, X, Y - T * (type === 'strike' ? 0.52 : type === 'rug' ? 0.52 : 0.28));
    c.globalAlpha = 1;
    c.strokeStyle = ok ? '#3ddc97' : '#ff4d4d'; c.lineWidth = 2.5;
    c.strokeRect(sx(at.c) + 1.5, sy(at.r, h) + 1.5, T - 3, T - 3);
    if (S.armed && ok) {
      c.font = Math.round(T * 0.3) + 'px Bungee, sans-serif';
      c.textAlign = 'center';
      c.lineWidth = 3; c.strokeStyle = OL;
      var ty = sy(at.r, h) - T * 1.0;
      c.strokeText('TAP AGAIN', X, ty); c.fillStyle = '#fff'; c.fillText('TAP AGAIN', X, ty);
    }
  }

  // ---------- HUD ----------
  function hud() {
    var G = S.G;
    $('#td-int').textContent = G.integrity;
    $('#td-intbox').classList.toggle('low', G.integrity <= G.maxIntegrity / 4);
    $('#td-tok').textContent = G.tokens;
    $('#td-wave').textContent = Math.max(G.wave, 0) + '/' + G.waves;
    document.querySelectorAll('.td-card').forEach(function (b) { b.classList.toggle('poor', G.tokens < C.TOWERS[b.dataset.type].cost); });
    var next = $('#td-next'), show = G.phase === 'ready' || G.phase === 'break';
    next.hidden = !show;
    if (show) {
      var w = G.wave + 1, key = G.phase + w;
      if (S.prevKey !== key) {
        S.prevKey = key;
        $('#td-prev').innerHTML = '<small>Wave ' + w + '</small>' + G.preview(w).map(function (p) {
          return '<span class="td-pv" title="' + esc(COSTUME[p[0]]) + '"><img src="' + S.thumbs[p[0]] + '" alt="' + esc(COSTUME[p[0]]) + '">×' + p[1] + '</span>';
        }).join('');
      }
      var go = G.phase === 'ready' ? 'Start wave 1' :
        'Next wave in ' + Math.ceil(G.countdown) + ' <small>· call now +' + Math.ceil(G.countdown) * C.RULES.earlyPay + '</small>';
      if (S.goText !== go) { S.goText = go; $('#td-go').innerHTML = go; }
    }
    if (S.sel && !$('#td-pop').hidden) {
      var t = G.towers.find(function (x) { return x.id === S.sel; });
      var kills = $('#td-pop small:nth-of-type(2)');
      if (t && kills) kills.textContent = t.kills + ' takedown' + (t.kills === 1 ? '' : 's');
    }
  }
  function enemyThumbs() {
    var out = {};
    Object.keys(S.spr.enemy).forEach(function (k) {
      var s = S.spr.enemy[k][0][0], cv = document.createElement('canvas'), n = 64;
      cv.width = cv.height = n;
      var c = cv.getContext('2d'), sc = Math.min(n / s.cv.width, n / s.cv.height);
      c.drawImage(s.cv, (n - s.cv.width * sc) / 2, (n - s.cv.height * sc) / 2, s.cv.width * sc, s.cv.height * sc);
      out[k] = cv.toDataURL();
    });
    return out;
  }

  // ---------- The stage ----------
  function end(won) {
    var G = S.G, el = $('#td-end'), stars = won ? G.stars() : 0;
    pick(null); select(null);
    clearTimeout(S.bannerTimer);
    $('#td-banner').hidden = true;
    var built = S.built;
    el.innerHTML = '<div class="td-card-end ' + (won ? 'win' : 'lose') + '">' +
      '<small>THE HEARING · ' + esc(KIT.name.toUpperCase()) + '</small>' +
      '<h2>' + (won ? 'STAGE CLEAR' : 'NETWORK HALTED') + '</h2>' +
      (won ? '<div class="td-stars">' + [1, 2, 3].map(function (k) { return '<i class="' + (k <= stars ? 'on' : '') + '">★</i>'; }).join('') + '</div>' : '') +
      '<p>' + (won ? 'The node held. ' + G.integrity + '/' + G.maxIntegrity + ' integrity left.' : 'The aides got through on wave ' + G.wave + ' of ' + G.waves + '.') + '</p>' +
      '<p class="td-stats">' + G.kills + ' takedowns · ' + built + ' towers built · ' + Math.floor(G.time / 60) + ':' + ('0' + Math.floor(G.time % 60)).slice(-2) + '</p>' +
      '<div class="td-end-btns"><button class="btn btn-gold" id="td-again" type="button">' + (won ? 'Play again' : 'Try again') + '</button>' +
      '<button class="btn btn-ghost" id="td-menu" type="button">Menu</button></div></div>';
    el.hidden = false;
    $('#td-again').addEventListener('click', start);
    $('#td-menu').addEventListener('click', leave);
    try { AU.play(won ? 'lev.up' : 'ko'); } catch (e) { /* no audio */ }
  }
  function start() {
    if (S) { cancelAnimationFrame(S.raf); clearTimeout(S.bannerTimer); }
    var G = C.create({ map: 'hearing' });
    S = { G: G, fx: [], speed: 1, shake: 0, clock: 0, acc: 0, built: 0, pick: null, sel: null, hover: null, armed: null,
      terrain: document.createElement('canvas'), ctx: $('#td-cv').getContext('2d'), last: performance.now(), paused: false, baseHit: 0 };
    $('#td-end').hidden = true;
    $('#td-paused').hidden = true;
    $('#td-speed').textContent = '1x';
    $('#td-speed').classList.remove('on');
    layout();
    S.thumbs = enemyThumbs();
    hud();
    AU.music('fight', { fade: 1 });
    loop();
    banner('THE HEARING', 'Build towers, then start wave 1');
  }
  function loop() {
    if (!S) return;
    S.raf = requestAnimationFrame(loop);
    var now = performance.now(), dt = Math.min(0.05, (now - S.last) / 1000);
    S.last = now;
    if (S.paused) { render(0); return; }
    S.clock += dt * S.speed;
    S.acc += dt * S.speed;
    var n = 0, G = S.G;
    while (S.acc >= 1 / 60 && n < 8) {
      G.step(1 / 60);
      S.acc -= 1 / 60; n++;
      while (G.events.length) {
        var ev = G.events.shift();
        if (ev.type === 'build') S.built++;
        onEvent(ev);
      }
    }
    render(dt * S.speed);
    hud();
  }
  function onResize() {
    if (!S || $('#screen-td').hidden) return;
    clearTimeout(S.rz);
    S.rz = setTimeout(function () { if (S) { layout(); S.thumbs = enemyThumbs(); S.prevKey = null; if (S.sel) select(S.sel); } }, 120);
  }
  function show(id) { document.querySelectorAll('.screen').forEach(function (el) { el.hidden = el.id !== id; }); }
  function open() {
    build();
    show('screen-td');
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    start();
  }
  function leave() {
    if (S) { cancelAnimationFrame(S.raf); clearTimeout(S.bannerTimer); }
    S = null;
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    show('screen-title');
    AU.music('menu', { from: 'loop', fade: 0.8 });
  }
  document.addEventListener('visibilitychange', function () { if (document.hidden && S && S.G.phase !== 'ready') setPaused(true); });

  // The title gets a Tower Defense button while ?td is in the URL.
  function addButton() {
    var story = $('#btn-story');
    if (!story || $('#btn-td')) return;
    var b = document.createElement('button');
    b.id = 'btn-td';
    b.type = 'button';
    b.className = 'btn btn-big btn-arcade btn-td';
    b.innerHTML = '<svg class="ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M3 1h2v2h2V1h2v2h2V1h2v5l-2 2v6h2v2H3v-2h2V8L3 6z"/></svg>Tower Defense <small>Test</small>';
    var after = $('#btn-gtr') || $('#btn-rap') || story;
    after.insertAdjacentElement('afterend', b);
    b.addEventListener('click', function () { AU.unlock(); open(); });
  }
  if (/[?&]debug\b/i.test(location.search)) {
    window.POF_TD = {
      state: function () { return S; }, game: function () { return S && S.G; }, open: open,
      build: function (type, c, r) { return S && S.G.build(type, c, r); }, wave: callWave,
      speed: function (k) { if (S) S.speed = k; }, tileAt: function (x, y) { return tileAt(x, y); },
      screen: function (x, y, h) { return { x: sx(x), y: sy(y, h || 0) }; }
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton); else addButton();
})();
