// Rap Battle crowd (?rap): the front of the stage and the audience in front of it, seen from behind in chunky
// pixels, drawn on a small canvas the browser scales up. Two rows: the far row small and hazy against the
// stage's lit edge, the near row big and darker. Everyone has their own hair, skin and shirt, dimmed for a dark
// room, and the stage lights catch the top edge of every head, shoulder and raised hand (each rapper's color on
// his side). The crowd nods on the beat and reacts to the mood js/rap.js sets: hype (jumping, hands up, phones
// out), wild (everyone, higher), laugh, ooh (hands on heads), groan, boo (heads shake, thumbs down, red light)
// or mixed.
(function () {
  'use strict';

  var PX = 3;        // CSS pixels per crowd pixel; css/rap.css makes the canvas 108px tall, so 36 rows
  var LIP = 11;      // the row where the stage's front edge is drawn, which the rappers stand on
  // Far to near: head size, spacing, where the heads sit, how much light reaches them, how much of the stage
  // light's color the haze gives them, arm and fist thickness, how far raised hands reach above the head, how
  // high a jump goes, and how strongly the stage light catches their edges.
  var ROWS = [
    { hw: 6, hh: 7, gap: 8, cy: LIP + 2, lit: 0.42, haze: 0.3, t: 2, f: 2, reach: 4, jump: 1, glow: 0.75 },
    { hw: 11, hh: 12, gap: 14, cy: LIP + 13, lit: 0.48, haze: 0.08, t: 3, f: 4, reach: 9, jump: 3, glow: 1 }
  ];
  var FRONT = ROWS.length - 1;
  var SPILL = [0.55, 14];   // how strongly the stage light lights the stage front, and how far down it fades
  var WALL = [13, 10, 22], DARK = [12, 9, 20], WHITE = [255, 255, 255], RED = [255, 70, 70], GOLD = [255, 210, 63];
  var SCREEN = [200, 236, 255], PHONE = [20, 20, 26];
  var STYLE = ['plain', 'plain', 'plain', 'cap', 'cap', 'beanie', 'puff', 'bun', 'buns', 'spiky', 'hood', 'locs', 'bald'];
  var HAIR = [[22, 16, 14], [22, 16, 14], [56, 34, 22], [56, 34, 22], [92, 58, 34], [176, 136, 72], [126, 52, 30], [150, 150, 160], [210, 84, 170], [70, 120, 220]];
  var SKIN = [[242, 204, 172], [214, 164, 124], [168, 116, 78], [116, 74, 48], [76, 48, 32]];
  var SHIRT = [[38, 50, 96], [116, 30, 42], [64, 74, 40], [96, 96, 108], [28, 28, 34], [210, 210, 216], [196, 152, 40],
    [30, 116, 116], [124, 42, 116], [190, 74, 40], [48, 104, 62], [28, 28, 34]];
  // What each pixel of a person is: shirt (also sleeves and hoods), skin, hair, hat, or a phone's case.
  var P_SHIRT = 0, P_SKIN = 1, P_HAIR = 2, P_HAT = 3, P_PHONE = 4;

  var cv, ctx, img, buf, part, W = 0, H = 0, people = [], screens = [], raf = 0, clock = null, watch = null;
  var mood = null, moodAt = 0, light = { l: [25, 198, 160], r: [155, 123, 255], meter: 50 };

  function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function mix(a, b, k) { return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; }
  function clamp(v) { return Math.max(0, Math.min(1, v)); }
  function rand(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  function populate() {
    var R = rand(7919), list = [];
    function pick(a) { return a[Math.floor(R() * a.length)]; }
    ROWS.forEach(function (row, r) {
      var x = -row.gap / 2 + R() * row.gap;
      while (x < W + row.gap) {
        var big = R() < 0.3 ? 1 : 0, roll = R(), style = pick(STYLE), shirt = pick(SHIRT);
        list.push({
          row: r, x: Math.round(x), hw: row.hw + big, hh: row.hh + big + (R() < 0.4 ? 1 : 0),
          sw: Math.round((row.hw + big) * (2.1 + R() * 0.5)),
          dy: (R() < 0.25 ? -1 : R() < 0.2 ? 1 : 0) * (r === FRONT ? 2 : 1),      // a few taller or shorter people
          style: style, sleeves: R() < 0.45,
          colors: [shirt, pick(SKIN), pick(HAIR), R() < 0.5 ? shirt.map(function (c) { return c * 0.6; }) : pick(SHIRT), PHONE],
          arms: roll < 0.45 ? 'v' : roll < 0.75 ? 'pump' : 'phone',          // what they do on a hype
          hand: R() < 0.5 ? -1 : 1, react: R(), off: R() * 0.3, seed: R() * 100,
          half: R() < 0.2, ooh: R() < 0.55, palm: R() < 0.35, point: R() < 0.15
        });
        x += row.gap + (R() - 0.5) * row.gap * 0.4;
      }
    });
    people = list;   // already far to near; each person's index is their draw order
  }

  // ---------- Shapes: each person is drawn into buf as their index (nearer people over farther ones), and
  // into part as what that pixel is ----------
  function fill(x, y, w, h, id, k) {
    x = Math.round(x); y = Math.round(y);
    var x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
    for (var j = y0; j < y1; j++) for (var i = x0; i < x1; i++) { buf[j * W + i] = id; part[j * W + i] = k; }
  }
  function oval(cx, cy, w, h, id, k) {
    var ry = h / 2, top = Math.round(cy - ry), c = Math.round(cx);
    for (var j = 0; j < h; j++) {
      var dy = (j + 0.5 - ry) / ry, half = Math.max(1, Math.round(w / 2 * Math.sqrt(Math.max(0, 1 - dy * dy))));
      fill(c - half, top + j, half * 2, 1, id, k);
    }
  }
  function line(x0, y0, x1, y1, t, id, k) {
    var n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1), o = Math.floor(t / 2);
    for (var i = 0; i <= n; i++) fill(Math.round(x0 + (x1 - x0) * i / n) - o, Math.round(y0 + (y1 - y0) * i / n) - o, t, t, id, k);
  }
  function fist(x, y, f, id) { fill(Math.round(x) - Math.floor(f / 2), Math.round(y) - Math.floor(f / 2), f, f, id, P_SKIN); }

  function person(p, x, y, pose, id) {
    var R = ROWS[p.row], hw = p.hw, hh = p.hh, t = R.t, top = Math.round(y - hh / 2), sw = p.sw;
    var sy = Math.round(y + hh / 2) - 1, sx = Math.round(x - sw / 2), big = p.row === FRONT, L = Math.round(x - hw / 2);
    var head = p.style === 'bald' ? P_SKIN : P_HAIR, arm = p.sleeves ? P_SHIRT : P_SKIN;
    // Shoulders with rounded corners, the neck, ears on the big heads, then the back of the head.
    fill(sx + 2, sy, sw - 4, 1, id, P_SHIRT); fill(sx + 1, sy + 1, sw - 2, 1, id, P_SHIRT); fill(sx, sy + 2, sw, H, id, P_SHIRT);
    fill(x - Math.round(hw * 0.25), y, Math.max(2, Math.round(hw * 0.5)), sy - y + 1, id, P_SKIN);
    if (big && p.style !== 'hood' && p.style !== 'locs' && p.style !== 'puff') { fill(L - 1, y - 1, hw + 2, 3, id, P_SKIN); }
    oval(x, y, hw, hh, id, head);
    switch (p.style) {
      case 'cap': fill(L, top, hw, 3, id, P_HAT); fill(L - 1, top + 2, hw + 2, 1, id, P_HAT); break;     // flat crown, band
      case 'beanie': fill(L, top - 1, hw, 4, id, P_HAT); fill(L + 1, top - 2, hw - 2, 1, id, P_HAT); if (big) fill(x - 1, top - 3, 2, 1, id, P_HAT); break;
      case 'puff': oval(x, y - 1, hw + 3, hh + 2, id, P_HAIR); break;
      case 'bun': oval(x, top, Math.max(3, Math.round(hw * 0.45)), big ? 4 : 3, id, P_HAIR); break;
      case 'buns': oval(x - hw * 0.4, top + 1, big ? 4 : 3, big ? 4 : 3, id, P_HAIR); oval(x + hw * 0.4, top + 1, big ? 4 : 3, big ? 4 : 3, id, P_HAIR); break;
      case 'spiky': for (var s = -1; s <= 1; s++) fill(x + s * Math.round(hw / 3), top - (s ? 1 : 2) - (big ? 1 : 0), 1, 2 + (big ? 1 : 0), id, P_HAIR); break;
      case 'hood': oval(x, y, hw + 2, hh + 1, id, P_SHIRT); fill(L - 1, y, hw + 2, sy - y + 1, id, P_SHIRT); break;
      case 'locs': for (var k = -1; k <= hw; k++) fill(L + k, y - 1, 1, sy - y + (k % 2 ? 3 : 1), id, P_HAIR); break;
    }
    pose.arms.forEach(function (a) {
      var s = a.side, shx = x + s * (sw / 2 - t), shy = sy + 1, hx, hy, ex, ey, f = R.f;
      if (a.kind === 'v') {                        // both hands up and out, elbows out at chin height
        ex = x + s * (sw / 2 + 1); ey = y;
        hx = ex + s * (2 + Math.round(R.reach * 0.2) + a.out); hy = top - Math.round(R.reach * 0.6) + a.lift;
        line(shx, shy, ex, ey, t, id, arm); line(ex, ey, hx, hy, t, id, P_SKIN); fist(hx, hy, f, id);
      } else if (a.kind === 'up') {                // one arm straight up: a fist pump or a phone held up
        hx = x + s * (hw / 2 + 1); hy = top - R.reach + a.lift;
        ex = x + s * (sw / 2 - t + 1); ey = y;
        line(shx, shy, ex, ey, t, id, arm); line(ex, ey, hx, hy, t, id, P_SKIN); fist(hx, hy, f, id);
        if (a.phone) {
          var pw = big ? 4 : 2, ph = big ? 6 : 3, px = Math.round(hx) - Math.floor(pw / 2), py = Math.round(hy) - ph;
          fill(px, py, pw, ph, id, P_PHONE);
          screens.push(big ? [px + 1, py + 1, pw - 2, ph - 2] : [px, py, pw, ph]);   // we see the screen: they're filming
        }
      } else if (a.kind === 'head') {               // a hand on top of the head
        ex = x + s * (sw / 2 + 1); ey = y + 1; hx = x + s * (hw / 2 - 1); hy = top + 1;
        line(shx, shy, ex, ey, t, id, arm); line(ex, ey, hx, hy, t, id, P_SKIN);
      } else if (a.kind === 'point') {              // an arm out toward the stage
        hx = x + s * (sw / 2 + R.reach * 0.5); hy = top - Math.round(R.reach * 0.4);
        line(shx, shy, hx, hy, t, id, P_SKIN); fist(hx, hy, f, id);
      } else if (a.kind === 'down') {               // thumbs down: arm out and up, the thumb hanging off the fist
        hx = x + s * (sw / 2 + R.reach * 0.4); hy = top + a.lift;
        line(shx, shy, hx, hy, t, id, P_SKIN); fist(hx, hy, f, id);
        fill(Math.round(hx), Math.round(hy) + Math.ceil(f / 2), 1, t + 1, id, P_SKIN);
      }
    });
  }

  // ---------- Moods ----------
  // Where each person is this frame and what their arms do.
  function poseOf(p, t, beat) {
    var R = ROWS[p.row], x = p.x, y = R.cy + p.dy, arms = [], since = t - moodAt - p.off * 0.6, m = mood;
    var ph = beat ? (t - beat.t0) / beat.len : t * 1.6, n = Math.floor(ph), frac = ph - n;
    if (m === 'mixed') m = p.seed % 2 < 1 ? 'hype' : 'boo';
    if (beat) { if (frac < 0.25 && (!p.half || n % 2 === 0)) y += 1; }          // nod on the beat
    else if (Math.sin(t * 1.4 + p.seed) > 0.75) y += 1;                          // before the beat drops: a sway
    if (!m || since < 0) return { x: x, y: y, arms: arms, m: null };
    var s = p.hand, wave = Math.round(1.5 * Math.sin(t * 5 + p.seed));
    if (m === 'hype' || m === 'wild') {
      var wild = m === 'wild', bounce = (frac + p.off) % 1;
      if (wild || p.react > 0.3) y -= Math.round(R.jump * (wild ? 1.5 : 1) * Math.sin(Math.PI * bounce));
      if (p.react > (wild ? 0.15 : 0.45)) {
        if (p.arms === 'phone') arms.push({ side: s, kind: 'up', lift: 1, phone: true });
        else if (p.arms === 'pump' && !wild) arms.push({ side: s, kind: 'up', lift: Math.round(R.t * 1.5 * frac) });
        else [-1, 1].forEach(function (side) { arms.push({ side: side, kind: 'v', out: wild ? Math.round(wave * side / 2) : 0, lift: 0 }); });
      }
    } else if (m === 'laugh') {
      if (p.react > 0.25) y += Math.floor(since * 13 + p.seed) % 2 + (p.palm ? 1 : 0);
      if (p.point) arms.push({ side: p.x < W / 2 ? 1 : -1, kind: 'point' });
    } else if (m === 'ooh') {
      y -= 1;
      if (p.ooh) { arms.push({ side: -1, kind: 'head' }); arms.push({ side: 1, kind: 'head' }); }
    } else if (m === 'groan') {
      y += p.react > 0.5 ? 2 : 1;
      if (p.palm) arms.push({ side: s, kind: 'head' });
      else if (p.react > 0.6) x += Math.floor(since * 5 + p.seed) % 2 ? 1 : -1;  // slow head shake
    } else if (m === 'boo') {
      y += 1;
      if (p.react > 0.3) x += Math.floor(since * 9 + p.seed) % 2 ? 1 : -1;
      if (p.react > 0.55 && p.arms !== 'phone') arms.push({ side: s, kind: 'down', lift: Math.floor(since * 6 + p.seed) % 2 });
    }
    return { x: x, y: y, arms: arms, m: m };
  }

  // The stage light at a spot across the width: the left rapper's color on the left, the right's on the right.
  function sideLight(x) { var k = clamp((x / W - 0.3) / 0.4); return mix(light.l, light.r, k * k * (3 - 2 * k)); }

  // The colors one person is drawn in this frame, per part: in the dark, on a lit top edge, on a softer second
  // edge, and on a lit side.
  function paint(p, m, flash) {
    var R = ROWS[p.row], k = p.x / W, side = sideLight(p.x);
    var lean = (light.meter - 50) / 50 * (k < 0.5 ? 1 : -1);        // the winning side's light is brighter
    var on = 0.6 + 0.25 * lean, lit = R.lit + 0.05 * flash;
    if (m === 'hype' || m === 'wild') { on += 0.3; lit += 0.06; side = mix(side, WHITE, 0.25); }
    if (m === 'boo') { side = RED; on = 0.85; }
    var haze = mix(DARK, side, 0.5);
    return p.colors.map(function (c) {
      var body = mix(mix(DARK, c, lit), haze, R.haze), rim = mix(body, side, clamp(on) * R.glow);
      return { body: body, rim: rim, rim2: mix(body, rim, 0.4), edge: mix(body, rim, 0.35) };
    });
  }

  // The front of the stage behind the crowd: a lit edge, then a dark front with the light fading down it and
  // a row of little footlights that flash on the beat.
  function wall(x, y, flash) {
    var side = sideLight(x);
    if (y === LIP) return mix(mix(WALL, side, 0.85), WHITE, 0.25);
    if (y === LIP + 1) return mix(WALL, side, 0.12);
    var c = mix(WALL, side, SPILL[0] * Math.pow(clamp(1 - (y - LIP - 2) / SPILL[1]), 2)), lx = x % 24 - 11;
    if (y === LIP + 3 && (lx === 0 || lx === 1)) return mix(GOLD, WHITE, flash * 0.6);
    if (Math.abs(lx - 0.5) < 3 && Math.abs(y - LIP - 3) < 2) c = mix(c, GOLD, (0.15 + 0.2 * flash) * (1 - Math.abs(lx - 0.5) / 3));
    if (x % 32 === 0 && y > LIP + 1) c = mix(c, [0, 0, 0], 0.35);                 // seams between the panels
    return c;
  }

  function draw() {
    raf = 0;
    if (!cv || !cv.isConnected || cv.offsetParent === null) return;
    if (!W || !H) { raf = requestAnimationFrame(draw); return; }
    var t = clock.now(), beat = clock.beat(), d = img.data;
    var flash = beat ? Math.max(0, 1 - ((t - beat.t0) / beat.len % 1) * 2.5) : 0.2;
    buf.fill(-1); screens = [];
    var necks = [], cols = people.map(function (p, id) {
      var pose = poseOf(p, t, beat);
      person(p, Math.round(pose.x), Math.round(pose.y), pose, id);
      necks[id] = Math.round(pose.y + p.hh / 2) - 1;    // below this, people's sides stay unlit (no stripes down bodies)
      return paint(p, pose.m, flash);
    });
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var i = y * W + x, id = buf[i], o = i * 4, c;
      if (id < 0) {
        if (y < LIP) { d[o + 3] = 0; continue; }
        c = wall(x, y, flash);
      } else {
        // An edge is lit where the pixel beyond it is open or belongs to someone farther back.
        var P = cols[id][part[i]], up = y ? buf[i - W] : id, up2 = y > 1 ? buf[i - 2 * W] : id;
        var l = x ? buf[i - 1] : id, r = x < W - 1 ? buf[i + 1] : id;
        if (up < id) c = P.rim;
        else if (people[id].row === FRONT && up2 < id) c = P.rim2;
        else if (y < necks[id] && (l < id || r < id)) c = P.edge;
        else c = P.body;
      }
      if (y > H - 9) c = mix(c, DARK, (y - H + 9) / 9 * 0.7);                     // the near row fades into the dark
      d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
    }
    screens.forEach(function (s) {
      for (var j = 0; j < s[3]; j++) for (var k = 0; k < s[2]; k++) {
        var X = s[0] + k, Y = s[1] + j;
        if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
        var o = (Y * W + X) * 4, c = j === 0 ? WHITE : SCREEN;
        d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255;
      }
    });
    ctx.putImageData(img, 0, 0);
    raf = requestAnimationFrame(draw);
  }

  function fit() {
    var w = Math.ceil(cv.clientWidth / PX), h = Math.round(cv.clientHeight / PX);
    if (!w || !h || (w === W && h === H)) return;
    W = cv.width = w; H = cv.height = h;
    img = ctx.createImageData(W, H); buf = new Int16Array(W * H); part = new Uint8Array(W * H);
    populate();
  }

  window.POF_RAP_CROWD = {
    // clock: { now(): seconds, beat(): { t0, len } of the playing beat, or null }
    mount: function (canvas, c) {
      cv = canvas; ctx = cv.getContext('2d'); clock = c; W = H = 0;
      if (watch) watch.disconnect();          // the screen is rebuilt for each visit
      if (window.ResizeObserver) (watch = new ResizeObserver(function () { fit(); })).observe(cv);
    },
    start: function () { fit(); if (!raf) raf = requestAnimationFrame(draw); },
    stop: function () { if (raf) cancelAnimationFrame(raf); raf = 0; },
    mood: function (m) { mood = m || null; moodAt = clock ? clock.now() : 0; },
    lights: function (l, r) { light.l = rgb(l); light.r = rgb(r); },
    meter: function (v) { light.meter = v; }
  };
})();
