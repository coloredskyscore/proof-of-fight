/* Wen Lambo: everything on the road, drawn in code. A pseudo-3D road (flat segments projected one by one),
   six locations with their own sky, skyline and roadside, the traffic and the weather.
   window.POF_WL_VIEW = { frame(g, W, H, o), postcard(g, stageId, w, h), THEMES } */
(function (root) {
  'use strict';
  var C = root.POF_WL_CORE, K = root.POF_WL_CARS;
  var SEG = C.SEG, ROAD_W = C.ROAD_W, PZ = C.PZ, CAM_H = 1000, DRAW = 230, DEPTH = 1 / Math.tan(50 * Math.PI / 180);
  var PINK = '#ff2e97', CYAN = '#2de2e6', SUN = '#ffd319', INK = '#f6e7ff', NIGHT = '#0d0221';
  var MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';

  var THEMES = {
    miami: { sky: ['#0d0221', '#3b0a5e', '#ff4fa3'], sun: { kind: 'sun', c: ['#ffd319', '#ff8f3a', '#ff2e97'], r: 0.24 }, far: 'city', farCol: '#240a4a', ground: ['#150430', '#1b0638'], water: -1, waterCol: ['#1a1466', '#201a78'],
      grid: '45,226,230', bar: '255,46,151', rumble: ['#ff2e97', '#2de2e6'], road: ['#251048', '#2a1150'], lane: '#f6e7ff', fog: '255,79,163', sign: [PINK, CYAN],
      bills: ['GM MIAMI', 'HODL NEXT EXIT', 'WAGMI 2 MI', 'NOT FINANCIAL ADVICE', 'LAMBO DEALER 1 BTC', 'NEVER SHARE YOUR SEED', 'BUY THE DIP EXIT 21', 'PROOF OF FIGHT'] },
    denver: { sky: ['#03020f', '#101653', '#5466d6'], sun: { kind: 'moon', c: ['#f6f2ff', '#cfd6ff', '#aab4ff'], r: 0.09 }, far: 'peaks', farCol: '#0c1040', ground: ['#0a0e2c', '#0d1236'],
      grid: '130,165,255', bar: '224,240,255', rumble: ['#e0f0ff', '#5a7dff'], road: ['#161b40', '#1a2049'], lane: '#e0f0ff', fog: '84,102,214', weather: 'snow', sign: ['#8fb0ff', '#e0f0ff'],
      bills: ['MILE HIGH GAS FEES', 'BUIDL WEEK 40 MI', 'TOUCH GRASS NEXT RIGHT', 'ELEVATION 5280 SATS', 'SHIP IT', 'TESTNET SKI RENTAL', 'FREE HOODIES AHEAD', 'GM BUILDERS'] },
    riviera: { sky: ['#17145e', '#7a3a8e', '#ff9a6a'], sun: { kind: 'sun', c: ['#fff0a8', '#ffb347', '#ff6a5a'], r: 0.2 }, far: 'hills', farCol: '#2a1060', ground: ['#261050', '#2e1460'], water: 1, waterCol: ['#1d3f96', '#2247a6'],
      grid: '255,154,106', bar: '255,211,25', rumble: ['#ffd319', '#ff6fa3'], road: ['#2a164e', '#301a58'], lane: '#fff3d6', fog: '255,154,106', sign: ['#ffd319', '#ff6fa3'],
      bills: ['LE SUMMIT 30 KM', 'YACHT RENTAL 2 ETH', 'BONJOUR SER', 'CROISSANTS FOR STABLES', 'SIDE EVENT EVERY EXIT', 'ROSE ALL DAY', 'CASINO NOT ADVICE', 'WEN YACHT'] },
    dubai: { sky: ['#230c3a', '#8a2a5a', '#ff8f3a'], sun: { kind: 'sun', c: ['#fff3b8', '#ffc24a', '#ff6a2a'], r: 0.3 }, far: 'spires', farCol: '#3a1244', ground: ['#a65a2c', '#b86a34'],
      grid: '255,224,138', bar: '255,240,190', rumble: ['#ffe08a', '#ff2e97'], road: ['#35183a', '#3d1e42'], sandRoad: ['#6b3d38', '#7a4a3e'], lane: '#fff3d6', fog: '255,143,58', sign: ['#ffe08a', '#ff8f3a'],
      bills: ['TOKEN OASIS 20 KM', 'ZERO TAX NEXT 900 KM', 'GOLD ATM AHEAD', 'CAMEL XING', 'SAND ON ROAD = LESS GRIP', 'TALLEST CANDLE ON EARTH', 'HABIBI HODL', 'AIR CON FOR MINERS'] },
    tokyo: { sky: ['#02010c', '#0b062c', '#3a0a6a'], sun: { kind: 'none' }, far: 'towers', farCol: '#0b0626', ground: ['#060318', '#0a0522'],
      grid: '255,46,151', bar: '45,226,230', rumble: ['#2de2e6', '#ff2e97'], road: ['#11112c', '#15153a'], lane: '#9ff', fog: '120,40,190', weather: 'rain', sign: [PINK, CYAN],
      bills: ['NEON BLOCK WEEK', 'RAMEN 0.0001 BTC', 'WET ROAD GO SLOW', 'ARIGATO SER', 'KARAOKE FOR DEGENS', 'CAPSULE HOTEL FOR BAGS', 'VENDING MACHINE YIELD', 'GM TOKYO'] },
    grid: { sky: ['#000000', '#07001f', '#2a0a52'], sun: { kind: 'wire', c: [CYAN, PINK, PINK], r: 0.26 }, far: 'wire', farCol: '#000', ground: ['#030010', '#030010'],
      grid: '45,226,230', bar: '185,103,255', rumble: ['#2de2e6', '#b967ff'], road: ['#07021a', '#0a0424'], lane: CYAN, fog: '90,30,160', sign: [CYAN, '#b967ff'],
      bills: ['YOU ARE ON MAINNET', 'BLOCK HEIGHT RISING', 'NO ROLLBACKS', 'FINALITY AHEAD', 'GAS: YES', '51% OF DRIVERS CRASH HERE', 'GENESIS 9000 KM', 'NGMI ZONE'] }
  };

  function cv(w, h, fn) { var o = document.createElement('canvas'); o.width = w; o.height = h; fn(o.getContext('2d'), w, h); return o; }
  function rnd(seed) { return C.rng(seed); }

  // ---------- Roadside art ----------
  function palm(trunk, rim) {
    return cv(220, 420, function (x, w, h) {
      x.strokeStyle = trunk; x.lineCap = 'round'; x.lineWidth = 16; x.beginPath(); x.moveTo(110, h); x.quadraticCurveTo(128, 260, 104, 90); x.stroke();
      x.strokeStyle = rim; x.lineWidth = 3; x.globalAlpha = 0.55; x.beginPath(); x.moveTo(118, h); x.quadraticCurveTo(136, 260, 112, 92); x.stroke(); x.globalAlpha = 1;
      x.fillStyle = trunk;
      [-2.8, -2.2, -1.6, -1.0, -0.4, 0.15].forEach(function (a) {
        x.beginPath(); x.moveTo(104, 90); var ex = 104 + Math.cos(a) * 110, ey = 90 + Math.sin(a) * 60 + 40;
        x.quadraticCurveTo(104 + Math.cos(a) * 60, 90 + Math.sin(a) * 60 - 34, ex, ey); x.quadraticCurveTo(104 + Math.cos(a) * 50, 90 + Math.sin(a) * 40 - 8, 104, 98); x.fill();
      });
    });
  }
  function tower(body, c1, c2, win, tall) {
    var H = tall ? 760 : 520;
    return cv(300, H, function (x, w, h) {
      x.fillStyle = body; x.fillRect(30, 90, 240, h - 90); x.fillRect(80, 40, 140, 60); x.fillRect(130, 0, 40, 50);
      x.fillStyle = c1; x.shadowColor = c1; x.shadowBlur = 14; x.fillRect(30, 90, 240, 6); x.fillRect(80, 40, 140, 5); x.fillRect(146, 0, 8, 46);
      x.fillStyle = c2; x.shadowColor = c2; for (var r = 0; r < 3; r++) x.fillRect(48, 130 + r * 18, 204, 5);
      x.shadowBlur = 0; x.fillStyle = win;
      for (var yy = 210; yy < h - 30; yy += 34) for (var xx = 52; xx < 250; xx += 34) if ((xx * 7 + yy * 3) % 5 > 1) x.fillRect(xx, yy, 16, 18);
    });
  }
  function billboard(text, c1, c2) {
    return cv(520, 300, function (x) {
      x.fillStyle = '#12052e'; x.fillRect(120, 160, 18, 140); x.fillRect(382, 160, 18, 140); x.fillRect(10, 20, 500, 150);
      x.strokeStyle = c2; x.lineWidth = 6; x.shadowColor = c2; x.shadowBlur = 16; x.strokeRect(14, 24, 492, 142);
      x.fillStyle = c1; x.shadowColor = c1; x.textAlign = 'center'; x.textBaseline = 'middle';
      var words = text.split(' '), lines = [text];
      if (text.length > 13) { var half = Math.ceil(words.length / 2), a = words.slice(0, half).join(' '), b = words.slice(half).join(' '); lines = [a, b]; }
      var longest = Math.max.apply(null, lines.map(function (l) { return l.length; })), size = Math.min(lines.length > 1 ? 50 : 62, Math.floor(760 / longest));
      x.font = '800 ' + size + 'px ' + MONO;
      lines.forEach(function (l, i) { x.fillText(l, 260, 96 + (i - (lines.length - 1) / 2) * (size + 8)); });
    });
  }
  function pine() {
    return cv(220, 460, function (x, w, h) {
      x.fillStyle = '#0a0d2e'; x.fillRect(100, h - 60, 20, 60);
      for (var i = 0; i < 5; i++) { var y = 20 + i * 76, hw = 40 + i * 16; x.fillStyle = '#0c1440'; x.beginPath(); x.moveTo(110, y - 20); x.lineTo(110 + hw, y + 96); x.lineTo(110 - hw, y + 96); x.fill();
        x.fillStyle = '#dfe8ff'; x.beginPath(); x.moveTo(110, y - 20); x.lineTo(110 + hw * 0.42, y + 28); x.lineTo(110 + hw * 0.1, y + 18); x.lineTo(110 - hw * 0.12, y + 30); x.lineTo(110 - hw * 0.4, y + 26); x.fill(); }
    });
  }
  function lodge() {
    return cv(420, 340, function (x, w, h) {
      x.fillStyle = '#0c1036'; x.beginPath(); x.moveTo(210, 20); x.lineTo(410, h); x.lineTo(10, h); x.fill();
      x.fillStyle = '#dfe8ff'; x.beginPath(); x.moveTo(210, 20); x.lineTo(270, 120); x.lineTo(226, 100); x.lineTo(200, 128); x.lineTo(150, 118); x.fill();
      x.fillStyle = '#ffd98a'; x.shadowColor = '#ffb347'; x.shadowBlur = 26; x.beginPath(); x.moveTo(210, 150); x.lineTo(280, 290); x.lineTo(140, 290); x.fill(); x.shadowBlur = 0;
      x.strokeStyle = '#0c1036'; x.lineWidth = 8; x.beginPath(); x.moveTo(210, 150); x.lineTo(210, 290); x.moveTo(170, 230); x.lineTo(250, 230); x.stroke();
    });
  }
  function cypress() {
    return cv(120, 460, function (x, w, h) {
      x.fillStyle = '#1a0a40'; x.fillRect(54, h - 50, 12, 50); x.beginPath(); x.moveTo(60, 0); x.bezierCurveTo(118, 150, 112, 330, 60, h - 30); x.bezierCurveTo(8, 330, 2, 150, 60, 0); x.fill();
      x.fillStyle = 'rgba(255,154,106,0.35)'; x.beginPath(); x.moveTo(60, 0); x.bezierCurveTo(100, 150, 100, 330, 66, h - 40); x.bezierCurveTo(84, 300, 84, 150, 60, 0); x.fill();
    });
  }
  function lamp(col) {
    return cv(200, 420, function (x, w, h) {
      x.strokeStyle = '#1a0a40'; x.lineWidth = 9; x.lineCap = 'round'; x.beginPath(); x.moveTo(40, h); x.lineTo(40, 70); x.quadraticCurveTo(40, 30, 90, 30); x.lineTo(140, 30); x.stroke();
      x.fillStyle = col; x.shadowColor = col; x.shadowBlur = 34; x.beginPath(); x.ellipse(146, 40, 26, 12, 0, 0, 6.3); x.fill(); x.fill();
    });
  }
  function villa() {
    return cv(420, 300, function (x, w, h) {
      x.fillStyle = '#3a1a66'; x.fillRect(30, 110, 360, 190); x.fillRect(250, 60, 110, 60);
      x.fillStyle = '#ff7a4a'; x.beginPath(); x.moveTo(10, 116); x.lineTo(60, 70); x.lineTo(240, 70); x.lineTo(240, 116); x.fill(); x.beginPath(); x.moveTo(236, 66); x.lineTo(270, 30); x.lineTo(340, 30); x.lineTo(374, 66); x.fill();
      x.fillStyle = '#ffd98a'; x.shadowColor = '#ffb347'; x.shadowBlur = 16; for (var i = 0; i < 4; i++) { x.beginPath(); x.moveTo(60 + i * 84, 250); x.lineTo(60 + i * 84, 180); x.arc(84 + i * 84, 180, 24, Math.PI, 0); x.lineTo(108 + i * 84, 250); x.fill(); }
    });
  }
  function spire() {
    return cv(200, 900, function (x, w, h) {
      var gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#2a0f40'); gr.addColorStop(0.5, '#6a2a5e'); gr.addColorStop(1, '#2a0f40'); x.fillStyle = gr;
      x.beginPath(); x.moveTo(100, 0); x.lineTo(108, 200); x.lineTo(124, 210); x.lineTo(130, 440); x.lineTo(150, 452); x.lineTo(160, h); x.lineTo(40, h); x.lineTo(50, 452); x.lineTo(70, 440); x.lineTo(76, 210); x.lineTo(92, 200); x.fill();
      x.fillStyle = 'rgba(255,224,138,0.7)'; for (var y = 230; y < h - 20; y += 26) for (var xx = 60; xx < 140; xx += 18) if ((xx + y * 3) % 7 > 2 && xx > 100 - (y - 150) * 0.09 && xx < 96 + (y - 150) * 0.09) x.fillRect(xx, y, 8, 12);
      x.fillStyle = '#ff3d6e'; x.shadowColor = '#ff3d6e'; x.shadowBlur = 16; x.beginPath(); x.arc(100, 6, 5, 0, 6.3); x.fill();
    });
  }
  function neonBlock(word, c1, c2, seed) {
    return cv(320, 760, function (x, w, h) {
      var r = rnd(seed);
      x.fillStyle = '#0c0828'; x.fillRect(20, 60, 230, h - 60); x.fillStyle = '#120c36'; x.fillRect(20, 60, 230, 10);
      for (var yy = 96; yy < h - 30; yy += 30) for (var xx = 36; xx < 230; xx += 26) { var q = r(); if (q > 0.45) { x.fillStyle = q > 0.9 ? c2 : q > 0.8 ? '#ffe9a8' : 'rgba(160,150,255,0.35)'; x.fillRect(xx, yy, 14, 16); } }
      // a vertical sign hung off the corner
      x.fillStyle = '#05020f'; x.fillRect(236, 120, 70, word.length * 64 + 24); x.strokeStyle = c1; x.lineWidth = 5; x.shadowColor = c1; x.shadowBlur = 18; x.strokeRect(239, 123, 64, word.length * 64 + 18);
      x.fillStyle = c1; x.font = '800 50px ' + MONO; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (var i = 0; i < word.length; i++) x.fillText(word[i], 271, 160 + i * 64);
      x.shadowBlur = 0; x.fillStyle = '#ff3d6e'; x.fillRect(128, 44, 6, 20);
    });
  }
  function obelisk(c) {
    return cv(160, 620, function (x, w, h) {
      x.strokeStyle = c; x.shadowColor = c; x.shadowBlur = 16; x.lineWidth = 4; x.fillStyle = '#05011a';
      x.beginPath(); x.moveTo(80, 6); x.lineTo(130, 90); x.lineTo(140, h); x.lineTo(20, h); x.lineTo(30, 90); x.closePath(); x.fill(); x.stroke();
      x.lineWidth = 2; for (var y = 150; y < h; y += 60) { x.beginPath(); x.moveTo(26, y); x.lineTo(134, y); x.stroke(); } x.beginPath(); x.moveTo(80, 6); x.lineTo(80, h); x.stroke();
    });
  }
  function pyramid(c) {
    return cv(520, 380, function (x, w, h) {
      x.strokeStyle = c; x.shadowColor = c; x.shadowBlur = 16; x.lineWidth = 4; x.fillStyle = '#05011a';
      x.beginPath(); x.moveTo(260, 8); x.lineTo(510, h); x.lineTo(10, h); x.closePath(); x.fill(); x.stroke();
      x.lineWidth = 2; for (var i = 1; i < 7; i++) { var t = i / 7; x.beginPath(); x.moveTo(260 - 250 * t, 8 + (h - 8) * t); x.lineTo(260 + 250 * t, 8 + (h - 8) * t); x.stroke(); }
      x.beginPath(); x.moveTo(260, 8); x.lineTo(330, h); x.moveTo(260, 8); x.lineTo(150, h); x.stroke();
    });
  }
  // The gantry over the start and the finish. It spans the whole road.
  function arch(text, c1, c2) {
    return cv(1400, 520, function (x, w, h) {
      x.fillStyle = '#12052e'; x.fillRect(40, 60, 50, h - 60); x.fillRect(w - 90, 60, 50, h - 60); x.fillRect(20, 30, w - 40, 150);
      x.strokeStyle = c2; x.lineWidth = 8; x.shadowColor = c2; x.shadowBlur = 24; x.strokeRect(26, 36, w - 52, 138);
      x.fillStyle = c1; x.shadowColor = c1; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '800 ' + Math.min(96, Math.floor(1900 / text.length)) + 'px ' + MONO; x.fillText(text, w / 2, 108);
      x.shadowBlur = 0; for (var i = 0; i < 2; i++) { var px = i ? w - 90 : 40; x.fillStyle = c2; for (var y = 200; y < h; y += 44) x.fillRect(px + 8, y, 34, 8); }
    });
  }
  function ring(c) {
    return cv(1400, 700, function (x, w, h) { x.strokeStyle = c; x.shadowColor = c; x.shadowBlur = 30; x.lineWidth = 16; x.strokeRect(40, 40, w - 80, h + 40); x.lineWidth = 4; x.strokeRect(80, 80, w - 160, h); });
  }

  // ---------- The far skyline, one wide strip per location that repeats ----------
  function farStrip(kind, col) {
    return cv(1600, 300, function (x, w, h) {
      var r = rnd(kind.length * 977 + 5), i, y;
      if (kind === 'city' || kind === 'towers') {
        var n = kind === 'towers' ? 60 : 34;
        for (i = 0; i < n; i++) { var bw = w / n, bh = (kind === 'towers' ? 70 + r() * 210 : 30 + r() * 120), bx = i * bw; x.fillStyle = col; x.fillRect(bx, h - bh, bw - 2, bh);
          for (y = h - bh + 8; y < h - 6; y += 12) for (var xx = bx + 4; xx < bx + bw - 8; xx += 9) { var q = r(); if (q > (kind === 'towers' ? 0.55 : 0.8)) { x.fillStyle = q > 0.95 ? PINK : q > 0.9 ? CYAN : 'rgba(255,220,150,0.6)'; x.fillRect(xx, y, 4, 5); } }
          if (kind === 'towers' && r() > 0.6) { x.fillStyle = '#ff3d6e'; x.fillRect(bx + bw / 2, h - bh - 6, 3, 6); } }
      } else if (kind === 'peaks') {
        var pts = []; for (i = 0; i <= 16; i++) pts.push([i * 100, h - (i % 2 ? 150 + r() * 130 : 40 + r() * 60)]); pts[16][1] = pts[0][1];
        x.fillStyle = col; x.beginPath(); x.moveTo(0, h); pts.forEach(function (p) { x.lineTo(p[0], p[1]); }); x.lineTo(w, h); x.fill();
        x.fillStyle = '#dfe8ff'; for (i = 1; i < 16; i += 2) { var p = pts[i], a = pts[i - 1], b = pts[i + 1], t = 0.34; x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(p[0] + (b[0] - p[0]) * t, p[1] + (b[1] - p[1]) * t); x.lineTo(p[0] + 12, p[1] + (b[1] - p[1]) * t * 0.6); x.lineTo(p[0] - 8, p[1] + (a[1] - p[1]) * t * 1.1); x.lineTo(p[0] + (a[0] - p[0]) * t, p[1] + (a[1] - p[1]) * t); x.fill(); }
      } else if (kind === 'hills') {
        x.fillStyle = col; x.beginPath(); x.moveTo(0, h); for (i = 0; i <= w; i += 10) x.lineTo(i, h - 60 - Math.sin(i * Math.PI / 400) * 34 - Math.sin(i * Math.PI / 160 + 1) * 22); x.lineTo(w, h); x.fill();
        for (i = 0; i < 90; i++) { x.fillStyle = r() > 0.5 ? 'rgba(255,220,150,0.8)' : 'rgba(255,154,106,0.7)'; x.fillRect(r() * w, h - 8 - r() * 60, 3, 3); }
      } else if (kind === 'spires') {
        x.fillStyle = col; x.beginPath(); x.moveTo(0, h); for (i = 0; i <= w; i += 10) x.lineTo(i, h - 22 - Math.sin(i * Math.PI / 200) * 14 - Math.sin(i * Math.PI / 80) * 6); x.lineTo(w, h); x.fill();
        [[300, 250], [380, 120], [440, 160], [900, 180], [960, 110], [1040, 140], [1330, 90]].forEach(function (s) { x.beginPath(); x.moveTo(s[0], h - s[1]); x.lineTo(s[0] + 16, h - 20); x.lineTo(s[0] - 16, h - 20); x.fill(); x.fillRect(s[0] - 10, h - s[1] * 0.6, 20, s[1] * 0.6); });
        x.fillStyle = 'rgba(255,224,138,0.7)'; for (i = 0; i < 70; i++) x.fillRect(280 + r() * 1100, h - 30 - r() * 70, 3, 4);
      } else {
        x.strokeStyle = CYAN; x.shadowColor = CYAN; x.shadowBlur = 10; x.lineWidth = 2; x.fillStyle = '#000';
        var q2 = []; for (i = 0; i <= 20; i++) q2.push([i * 80, h - (i % 2 ? 90 + r() * 150 : 20 + r() * 50)]); q2[20][1] = q2[0][1];
        x.beginPath(); x.moveTo(0, h); q2.forEach(function (p) { x.lineTo(p[0], p[1]); }); x.lineTo(w, h); x.fill(); x.stroke();
        x.lineWidth = 1; for (i = 1; i < 20; i += 2) { x.beginPath(); x.moveTo(q2[i][0], q2[i][1]); x.lineTo(q2[i][0] - 20, h); x.moveTo(q2[i][0], q2[i][1]); x.lineTo(q2[i][0] + 30, h); x.stroke(); }
      }
    });
  }

  // ---------- A location, built the first time it is driven ----------
  var built = {};
  function build(id) {
    if (built[id]) return built[id];
    var th = THEMES[id], T = C.track(id), B = { th: th, far: farStrip(th.far, th.farCol), spr: {}, bill: [] }, r = rnd(T.stage.seed), i, k = 0;
    function put(i, s) { (B.spr[i] || (B.spr[i] = [])).push(s); }
    function sideSpr(i, im, side, off, w) { put(i, { im: im, x: side * off, w: w, ax: side < 0 ? 1 : 0 }); }
    var A = {};
    if (id === 'miami') { A.a = palm('#1a0533', PINK); A.b = [tower('#16063a', '#ff7ac6', CYAN, 'rgba(255,211,25,0.55)'), tower('#16063a', CYAN, SUN, 'rgba(255,211,25,0.55)'), tower('#16063a', '#b967ff', PINK, 'rgba(255,211,25,0.55)')]; }
    if (id === 'denver') { A.a = pine(); A.b = [lodge()]; }
    if (id === 'riviera') { A.a = cypress(); A.b = [villa()]; A.c = lamp('#ffd98a'); }
    if (id === 'dubai') { A.a = palm('#2a0f30', '#ffe08a'); A.b = [spire(), tower('#2a1040', '#ffe08a', '#ff8f3a', 'rgba(255,224,138,0.6)', true)]; }
    if (id === 'tokyo') { A.b = ['RAMEN', 'HODL', 'GM', 'SAKE', 'WAGMI', 'PVP'].map(function (wd, j) { return neonBlock(wd, [PINK, CYAN, SUN][j % 3], [CYAN, PINK][j % 2], j + 3); }); A.c = lamp(CYAN); }
    if (id === 'grid') { A.a = obelisk(CYAN); A.b = [pyramid(PINK), pyramid('#b967ff')]; A.ring = ring('#b967ff'); }
    for (i = 16; i < T.n - 8; i += 4) {
      var side = (i / 4) % 2 ? 1 : -1, wet = th.water;
      if (A.a && !(wet && side === wet && id === 'riviera')) sideSpr(i, A.a, side, 1.32 + r() * 0.5, id === 'denver' ? 1000 : id === 'riviera' ? 520 : id === 'grid' ? 620 : 900);
      if (A.c && i % 16 === 0) { sideSpr(i, A.c, -1, 1.12, 620); if (id === 'tokyo') put(i, { im: A.c, x: 1.12, w: 620, ax: 1, flip: true }); }
      if (i % (id === 'tokyo' ? 12 : 28) === 0) { var s2 = wet ? -wet : -side, im = A.b[Math.floor(r() * A.b.length)]; sideSpr(i, im, s2, (id === 'tokyo' ? 1.5 : 2.3) + r() * (id === 'tokyo' ? 0.5 : 1.6), id === 'denver' ? 2200 : id === 'riviera' ? 2600 : id === 'tokyo' ? 2400 : id === 'grid' ? 3000 : im.height > 800 ? 1300 : 2600); }
      if (id === 'tokyo' && i % 12 === 6) sideSpr(i, A.b[Math.floor(r() * A.b.length)], side, 1.5 + r() * 0.6, 2400);
    }
    for (i = 70; i < T.finishSeg - 60; i += 150) { var bs = k % 2 ? 1 : -1; sideSpr(i, billboard(th.bills[k % th.bills.length], th.sign[0], th.sign[1]), bs, 1.2, 1700); k++; }
    if (A.ring) for (i = 200; i < T.finishSeg - 100; i += 260) put(i, { im: A.ring, x: 0, w: ROAD_W * 2.9, ax: 0.5 });
    put(T.startSeg + 10, { im: arch('WEN LAMBO', th.sign[0], th.sign[1]), x: 0, w: ROAD_W * 2.7, ax: 0.5 });
    put(T.finishSeg, { im: arch(T.stage.event + ' ' + (id === 'grid' ? '' : T.stage.name), SUN, th.sign[0]), x: 0, w: ROAD_W * 2.7, ax: 0.5 });
    return (built[id] = B);
  }

  // ---------- Traffic and car pictures ----------
  var trafficArt = null, PLATES = ['NGMI', 'REKT', 'FUD', 'GM', 'SER', 'WAGMI', 'PVP', 'NFA', 'DYOR', 'RUG'];
  var CAR_IM_W = 400, CAR_IM_H = 300, CAR_WORLD = 760 * CAR_IM_W / 300;
  function carIm(id, bd, steer, brake) { return cv(CAR_IM_W * 2, CAR_IM_H * 2, function (x) { x.translate(CAR_IM_W, CAR_IM_H * 2 - 24); x.scale(2, 2); K.rear(x, id, bd, steer, { brake: brake }); }); }
  function traffic() {
    if (trafficArt) return trafficArt;
    var ids = ['bear', 'suv', 'bigblock', 'niner', 'bear', 'suv', 'strake', 'bear', 'suv', 'bigblock'], paints = ['white', 'cyan', 'yellow', 'violet', 'green', 'black', 'white', 'red', 'cyan', 'black'];
    trafficArt = ids.map(function (id, i) { var b = K.defaults(id); b.paint = paints[i]; b.finish = 'gloss'; b.glow = 'none'; b.decal = 'none'; b.wing = 'none'; b.plate = PLATES[i]; return carIm(id, b, 0, false); });
    return trafficArt;
  }
  var meCache = {}, meKey = '';
  function meIm(car, bd, steer, brake) {
    var key = car + JSON.stringify(bd); if (key !== meKey) { meCache = {}; meKey = key; }
    var lvl = Math.round(steer * 2) / 2, k = lvl + '|' + (brake ? 1 : 0);
    return meCache[k] || (meCache[k] = carIm(car, bd, lvl, brake));
  }
  var ghostIm = {};
  function ghIm(car) { return ghostIm[car] || (ghostIm[car] = carIm(car, { paint: 'white', finish: 'neon', rim: 'five', rimColor: 'white', wing: 'none', glow: 'none', decal: 'none', plate: 'GHOST' }, 0, false)); }

  // ---------- Sky ----------
  function drawSun(g, th, cx, cy, r) {
    var s = th.sun, b;
    if (s.kind === 'none') return;
    if (s.kind === 'moon') { g.save(); g.shadowColor = '#aab4ff'; g.shadowBlur = 50; g.fillStyle = s.c[0]; g.beginPath(); g.arc(cx, cy - r * 2.4, r, 0, 6.3); g.fill(); g.restore(); g.fillStyle = 'rgba(170,180,255,0.35)'; g.beginPath(); g.arc(cx - r * 0.3, cy - r * 2.5, r * 0.2, 0, 6.3); g.arc(cx + r * 0.35, cy - r * 2.1, r * 0.14, 0, 6.3); g.fill(); return; }
    if (s.kind === 'wire') { g.save(); g.strokeStyle = s.c[0]; g.shadowColor = s.c[0]; g.shadowBlur = 20; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, r, Math.PI, 0); g.stroke(); g.strokeStyle = s.c[1]; g.shadowColor = s.c[1]; for (b = 1; b < 6; b++) { var yy = cy - r * b / 6, hw = Math.sqrt(r * r - (r * b / 6) * (r * b / 6)); g.beginPath(); g.moveTo(cx - hw, yy); g.lineTo(cx + hw, yy); g.stroke(); } g.restore(); return; }
    var sg = g.createLinearGradient(0, cy - r, 0, cy + r); sg.addColorStop(0, s.c[0]); sg.addColorStop(0.55, s.c[1]); sg.addColorStop(1, s.c[2]);
    g.save(); g.shadowColor = s.c[1]; g.shadowBlur = r * 0.5; g.fillStyle = sg; g.beginPath(); g.arc(cx, cy, r, 0, 6.3); g.fill(); g.restore();
  }
  function sunStripes(g, skyFill, cx, cy, r) { g.fillStyle = skyFill; for (var b = 0; b < 7; b++) g.fillRect(cx - r - 2, cy + r * (0.05 + b * 0.14), r * 2 + 4, 2 + b * (r / 60)); }
  function drawSky(g, W, H, th, far, horizon, skyX, farX, t) {
    var sk = g.createLinearGradient(0, horizon - H * 0.62, 0, horizon); sk.addColorStop(0, th.sky[0]); sk.addColorStop(0.55, th.sky[1]); sk.addColorStop(1, th.sky[2]);
    g.fillStyle = sk; g.fillRect(0, 0, W, horizon + 2);
    g.fillStyle = 'rgba(246,231,255,0.8)';
    for (var i = 0; i < 70; i++) { var sx = ((i * 137.5 - skyX * 300) % W + W) % W, sy = (i * 61) % Math.max(1, horizon * 0.55); g.fillRect(sx, sy, i % 3 ? 1.5 : 2.5, i % 3 ? 1.5 : 2.5); }
    var r = Math.min(W, H) * th.sun.r, cx = W / 2 - skyX * W * 0.08, cy = horizon - r * 0.3;
    drawSun(g, th, cx, cy, r);
    if (th.sun.kind === 'sun') sunStripes(g, 'rgba(' + hexRgb(th.sky[2]) + ',0.9)', cx, cy, r);
    var fh = Math.min(H * 0.3, W * 0.2), fw = fh * far.width / far.height, off = ((farX * 500) % fw + fw) % fw;
    for (var x = -off; x < W; x += fw) g.drawImage(far, x, horizon - fh + 1, fw, fh);
  }
  function hexRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16); }

  // ---------- One frame ----------
  var PX = new Float64Array(DRAW + 2), PY = new Float64Array(DRAW + 2), PS = new Float64Array(DRAW + 2), CLIP = new Float64Array(DRAW + 2);
  function quad(g, c, x1, y1, w1, x2, y2, w2) { g.fillStyle = c; g.beginPath(); g.moveTo(x1 - w1, y1); g.lineTo(x2 - w2, y2); g.lineTo(x2 + w2, y2); g.lineTo(x1 + w1, y1); g.closePath(); g.fill(); }
  function sprite(g, W, im, sc, x, y, worldW, ax, clip, flip) {
    var w = worldW * sc * W / 2, h = w * im.height / im.width; if (w < 2 || w > W * 6) return;
    var dx = x - w * ax, dy = y - h, cut = Math.max(0, dy + h - clip); if (cut >= h || dx > W || dx + w < 0) return;
    if (flip) { g.save(); g.translate(dx + w, 0); g.scale(-1, 1); g.drawImage(im, 0, 0, im.width, im.height - im.height * cut / h, 0, dy, w, h - cut); g.restore(); }
    else g.drawImage(im, 0, 0, im.width, im.height - im.height * cut / h, dx, dy, w, h - cut);
  }
  /* o: { S (the run), car, build, steer (-1..1 smoothed), brake, t (seconds, for animation), ghost: {pos, x, car} or null,
          traffic: bool, reduce: bool, hideCar: bool, bump: 0..1 } */
  function frame(g, W, H, o) {
    var S = o.S, T = S.T, B = build(T.id), th = B.th, pos = S.pos, n, i;
    var base = Math.floor(pos / SEG), basePct = (pos % SEG) / SEG, me = pos + PZ, ms = Math.floor(me / SEG), mp = (me % SEG) / SEG;
    var camY = CAM_H + T.y[ms] + ((T.y[ms + 1] || T.y[ms]) - T.y[ms]) * mp, camX = S.x * ROAD_W;
    var x = 0, dx = -(T.curve[base] || 0) * basePct, maxY = H, hz = H * 0.5;
    for (n = 0; n <= DRAW; n++) {
      i = base + n; var z = i * SEG - pos, sc = z > 1 ? DEPTH / z : 0;
      PS[n] = sc; PX[n] = W / 2 - sc * (camX - x) * W / 2; PY[n] = hz - sc * ((T.y[i] === undefined ? T.y[T.n] : T.y[i]) - camY) * H / 2;
      x += dx; dx += T.curve[i] || 0;
    }
    // where the road meets the sky
    var topY = H; for (n = 1; n <= DRAW; n++) if (PS[n] > 0 && PY[n] < topY) topY = PY[n];
    var horizon = Math.max(H * 0.2, Math.min(H * 0.66, topY));
    var prog = pos / SEG, skyX = (o.skyX || 0);
    drawSky(g, W, H, th, B.far, horizon, skyX, skyX * 2, o.t);
    g.fillStyle = th.ground[0]; g.fillRect(0, horizon, W, H - horizon);
    // ground and road, near to far
    var wet = th.water || 0, gridN = Math.min(DRAW, 150);
    for (n = 1; n < DRAW; n++) {
      CLIP[n] = maxY;
      if (PS[n] <= 0 || PS[n + 1] <= 0) continue;
      var y1 = PY[n], y2 = PY[n + 1]; if (y2 >= y1 || y2 >= maxY) continue;
      i = base + n; var band = Math.floor(i / 3) % 2, x1 = PX[n], x2 = PX[n + 1], w1 = PS[n] * ROAD_W * W / 2, w2 = PS[n + 1] * ROAD_W * W / 2, hgt = y1 - y2 + 1, f = T.flag[i] || 0;
      g.fillStyle = th.ground[band]; g.fillRect(0, y2, W, hgt);
      if (wet) { var e1 = x1 + wet * w1 * 1.5, e2 = x2 + wet * w2 * 1.5, far = wet < 0 ? Math.min(0, e1, e2) : Math.max(W, e1, e2); g.fillStyle = th.waterCol[band]; g.beginPath(); g.moveTo(e1, y1 + 0.5); g.lineTo(e2, y2); g.lineTo(far, y2); g.lineTo(far, y1 + 0.5); g.fill(); }
      if (i % 6 === 0 && n < gridN) { g.fillStyle = 'rgba(' + th.bar + ',' + (0.6 * (1 - n / gridN)).toFixed(3) + ')'; g.fillRect(0, y2, W, Math.max(1, hgt * 0.22)); }
      var rw1 = w1 / 7, rw2 = w2 / 7;
      quad(g, th.rumble[band], x1, y1, w1 + rw1, x2, y2, w2 + rw2);
      var fin = (i >= T.finishSeg && i < T.finishSeg + 4) || (i >= T.startSeg + 5 && i < T.startSeg + 7);
      quad(g, fin ? (band ? '#f6e7ff' : '#0d0221') : (f & C.SAND && th.sandRoad ? th.sandRoad[band] : th.road[band]), x1, y1, w1, x2, y2, w2);
      if (fin) { for (var q = 0; q < 8; q++) if ((q + band) % 2) quad(g, band ? '#0d0221' : '#f6e7ff', x1 - w1 + w1 * (q + 0.5) / 4, y1, w1 / 8, x2 - w2 + w2 * (q + 0.5) / 4, y2, w2 / 8); }
      else if (band) { var lw1 = w1 / 44, lw2 = w2 / 44; quad(g, th.lane, x1 - w1 / 3, y1, lw1, x2 - w2 / 3, y2, lw2); quad(g, th.lane, x1 + w1 / 3, y1, lw1, x2 + w2 / 3, y2, lw2); }
      maxY = y2;
    }
    // grid lines running away along the ground
    g.strokeStyle = 'rgba(' + th.grid + ',0.34)'; g.lineWidth = 1; g.beginPath();
    for (var gx = -8; gx <= 8; gx++) { if (Math.abs(gx) < 2) continue; var off = gx * ROAD_W * 0.6, started = false; for (n = 1; n < gridN; n += 3) { if (PS[n] <= 0 || PY[n] > CLIP[n] + 1) { started = false; continue; } var X = PX[n] + off * PS[n] * W / 2; if (started) g.lineTo(X, PY[n]); else { g.moveTo(X, PY[n]); started = true; } } }
    g.stroke();
    // haze where the road meets the sky
    var hzg = g.createLinearGradient(0, horizon - 2, 0, horizon + H * 0.16); hzg.addColorStop(0, 'rgba(' + th.fog + ',0.5)'); hzg.addColorStop(1, 'rgba(' + th.fog + ',0)'); g.fillStyle = hzg; g.fillRect(0, horizon - 2, W, H * 0.16);
    // traffic into buckets by segment
    var buckets = null, cars = T.cars, art = traffic();
    if (o.traffic && !S.cruise) { buckets = {}; for (i = 0; i < cars.length; i++) { var cz = C.carZ(cars[i], S.tick), cn = Math.floor(cz / SEG) - base; if (cn < 1 || cn >= DRAW - 1 || cz >= T.finishZ + 2000) continue; (buckets[cn] || (buckets[cn] = [])).push({ z: cz, x: C.carX(cars[i], S.tick), im: art[cars[i].look % art.length] }); } }
    var gh = o.ghost, gn = -1; if (gh) { var gz = gh.pos + PZ; gn = Math.floor(gz / SEG) - base; if (gz - me < 500) gn = -1; }
    // scenery, traffic and the ghost, far to near
    for (n = DRAW - 1; n > 0; n--) {
      if (PS[n] <= 0) continue; i = base + n;
      var list = B.spr[i], clip = CLIP[n];
      if (list) for (var k = 0; k < list.length; k++) { var sp = list[k]; sprite(g, W, sp.im, PS[n], PX[n] + PS[n] * sp.x * ROAD_W * W / 2, PY[n], sp.w, sp.ax, clip, sp.flip); }
      var bk = buckets && buckets[n];
      if (bk) for (k = 0; k < bk.length; k++) { var c = bk[k], t = (c.z % SEG) / SEG, zz = c.z - pos, cs = DEPTH / zz, X2 = PX[n] + (PX[n + 1] - PX[n]) * t, Y2 = PY[n] + (PY[n + 1] - PY[n]) * t; sprite(g, W, c.im, cs, X2 + cs * c.x * ROAD_W * W / 2, Y2 + cs * 30 * W / 2, CAR_WORLD, 0.5, clip + 30); }
      if (n === gn) { var t2 = ((gh.pos + PZ) % SEG) / SEG, gs = DEPTH / (gh.pos + PZ - pos); g.globalAlpha = 0.55; sprite(g, W, ghIm(gh.car), gs, PX[n] + (PX[n + 1] - PX[n]) * t2 + gs * gh.x * ROAD_W * W / 2, PY[n] + (PY[n + 1] - PY[n]) * t2 + gs * 30 * W / 2, CAR_WORLD, 0.5, clip + 30); g.globalAlpha = 1; }
    }
    // the player's car
    if (!o.hideCar) {
      var carW = Math.min(W * (W < H ? 0.42 : 0.34), H * 0.48), im = meIm(o.car, o.build, o.steer || 0, o.brake), cw = carW * CAR_IM_W / 300, chh = cw * CAR_IM_H / CAR_IM_W;
      var pct = S.speed / C.MAX, bounce = o.reduce ? 0 : Math.sin(o.t * 40) * pct * 1.2 + (Math.abs(S.x) > 1 ? Math.sin(o.t * 70) * 3 * pct : 0), shake = o.bump > 0 ? Math.sin(o.bump * 60) * 8 * o.bump : 0;
      g.save(); g.translate(W / 2 + shake, H - Math.max(14, H * 0.035) + bounce); g.rotate((o.steer || 0) * 0.035);
      g.drawImage(im, -cw / 2, -chh * 0.96, cw, chh); g.restore();
    }
    // weather
    if (th.weather === 'rain' && !o.reduce) { g.strokeStyle = 'rgba(160,240,255,0.35)'; g.lineWidth = 1.5; g.beginPath(); for (i = 0; i < 70; i++) { var rx = (i * 173.3 + o.t * 900 * (0.6 + (i % 5) * 0.1)) % (W + 80) - 40, ry = (i * 97.1 + o.t * 1900 * (0.7 + (i % 7) * 0.06)) % H; g.moveTo(rx, ry); g.lineTo(rx - 8 - S.x * 4, ry + 26); } g.stroke(); }
    if (th.weather === 'snow' && !o.reduce) { g.fillStyle = 'rgba(240,246,255,0.8)'; for (i = 0; i < 60; i++) { var fx = (i * 211.7 + Math.sin(o.t * 0.8 + i) * 30 + o.t * 30) % W, fy = (i * 89.3 + o.t * (70 + (i % 6) * 22) * (1 + pctOf(S) * 3)) % H, fs = 1.5 + (i % 3); g.fillRect(fx, fy, fs, fs); } }
    if (S.boost > 0 && !o.reduce) { g.strokeStyle = 'rgba(246,231,255,' + (S.boost > 0 ? 0.5 : 0.2) + ')'; g.lineWidth = 2; g.beginPath(); for (var q2 = 0; q2 < (S.boost > 0 ? 14 : 6); q2++) { var a = Math.random() * 6.28, r1 = H * 0.5, r2 = H * (S.boost > 0 ? 0.8 : 0.6); g.moveTo(W / 2 + Math.cos(a) * r1, horizon + Math.sin(a) * r1 * 0.6); g.lineTo(W / 2 + Math.cos(a) * r2, horizon + Math.sin(a) * r2 * 0.6); } g.stroke(); }
  }
  function pctOf(S) { return S.speed / C.MAX; }

  // A small still of a location for the map: its sky and skyline over a grid.
  function postcard(g, id, w, h) {
    var th = THEMES[id], B = build(id), hz = h * 0.64;
    g.save(); g.beginPath(); g.rect(0, 0, w, h); g.clip();
    drawSky(g, w, h, th, B.far, hz, 0.4, 0.3, 0);
    g.fillStyle = th.ground[0]; g.fillRect(0, hz, w, h - hz);
    if (th.water) { g.fillStyle = th.waterCol[0]; g.fillRect(th.water < 0 ? 0 : w * 0.62, hz, w * 0.38, h - hz); }
    g.strokeStyle = 'rgba(' + th.grid + ',0.6)'; g.lineWidth = 1; g.beginPath();
    for (var j = -9; j <= 9; j++) { g.moveTo(w / 2 + j * w * 0.03, hz); g.lineTo(w / 2 + j * w * 0.22, h); }
    for (j = 1; j < 6; j++) { var ly = hz + (j / 5) * (j / 5) * (h - hz); g.moveTo(0, ly); g.lineTo(w, ly); }
    g.stroke();
    quad(g, th.road[0], w / 2, hz, w * 0.012, w / 2, h, w * 0.2); quad(g, th.rumble[0], w / 2 - w * 0.012, hz, 1, w / 2 - w * 0.2, h, w * 0.012); quad(g, th.rumble[1], w / 2 + w * 0.012, hz, 1, w / 2 + w * 0.2, h, w * 0.012);
    g.restore();
  }

  root.POF_WL_VIEW = { frame: frame, postcard: postcard, THEMES: THEMES, build: build, drawSky: drawSky };
})(window);
