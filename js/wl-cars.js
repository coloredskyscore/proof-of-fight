/* Wen Lambo: the cars, drawn in code. Two views of each: from the side (garage, share picture) and from
   behind (driving). Shapes nod at famous kinds of car but copy none, and carry no badges.
   window.POF_WL_CARS = { side(g, carId, build, opt), rear(g, carId, build, steer, opt), PARTS, defaults(carId) } */
(function (root) {
  'use strict';
  function hex(c) { c = c.replace('#', ''); if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2]; return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)]; }
  function mix(a, b, t) { var A = hex(a), B = hex(b); return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')'; }
  function rgba(c, a) { var A = hex(c); return 'rgba(' + A[0] + ',' + A[1] + ',' + A[2] + ',' + a + ')'; }
  var INK = '#0a0118', GLASS = '#150a35';

  // ---- Parts. need: a stage that has to be finished ('miami') or won with a gold medal ('gold:miami'). ----
  var PARTS = {
    paint: [
      { id: 'pink', name: 'HOT PINK', a: '#ff2e97' }, { id: 'cyan', name: 'LASER CYAN', a: '#19d3da' }, { id: 'white', name: 'PEARL', a: '#f1ecff' },
      { id: 'black', name: 'MIDNIGHT', a: '#2a2440' }, { id: 'red', name: 'ROSSO', a: '#f0203c' }, { id: 'yellow', name: 'TAXI', a: '#ffd319' },
      { id: 'violet', name: 'ULTRAVIOLET', a: '#9b4dff', need: 'miami' }, { id: 'green', name: 'CANDLE GREEN', a: '#1fd67a', need: 'denver' },
      { id: 'sunset', name: 'SUNSET FADE', a: '#ffb02e', b: '#ff2e97', need: 'riviera' }, { id: 'gold', name: 'GOLD LEAF', a: '#f3b83a', b: '#fff0a8', need: 'dubai' },
      { id: 'btc', name: 'ORANGE COIN', a: '#f7931a', need: 'gold:miami' }, { id: 'sol', name: 'SPEED CHAIN', a: '#14f195', b: '#9945ff', need: 'gold:tokyo' }, { id: 'eth', name: 'ETHER', a: '#8ea2f5', b: '#3c3c6e', need: 'gold:denver' }
    ],
    finish: [{ id: 'gloss', name: 'GLOSS' }, { id: 'matte', name: 'MATTE' }, { id: 'neon', name: 'NEON', need: 'tokyo' }, { id: 'chrome', name: 'CHROME', need: 'grid' }],
    rim: [{ id: 'five', name: 'FIVE SPOKE' }, { id: 'disc', name: 'TURBO DISC' }, { id: 'mesh', name: 'MESH', need: 'miami' }, { id: 'star', name: 'TRI STAR', need: 'riviera' }, { id: 'deep', name: 'DEEP DISH', need: 'dubai' }],
    rimColor: [{ id: 'silver', name: 'SILVER', a: '#d9d6ea' }, { id: 'black', name: 'BLACK', a: '#2b2540' }, { id: 'gold', name: 'GOLD', a: '#ffd319' }, { id: 'white', name: 'WHITE', a: '#ffffff' }, { id: 'pink', name: 'PINK', a: '#ff2e97', need: 'denver' }, { id: 'cyan', name: 'CYAN', a: '#2de2e6', need: 'denver' }],
    wing: [{ id: 'none', name: 'NO WING' }, { id: 'lip', name: 'DUCKTAIL' }, { id: 'gt', name: 'GT WING', need: 'miami' }, { id: 'mega', name: 'MEGA WING', need: 'riviera' }],
    glow: [{ id: 'none', name: 'OFF' }, { id: 'cyan', name: 'CYAN', a: '#2de2e6' }, { id: 'pink', name: 'PINK', a: '#ff2e97' }, { id: 'violet', name: 'VIOLET', a: '#b967ff', need: 'denver' }, { id: 'green', name: 'GREEN', a: '#3dff8a', need: 'dubai' }, { id: 'gold', name: 'GOLD', a: '#ffd319', need: 'gold:riviera' }],
    decal: [{ id: 'none', name: 'CLEAN' }, { id: 'stripe', name: 'RACING STRIPE' }, { id: 'number', name: 'NUMBER 21' }, { id: 'candles', name: 'GREEN CANDLES', need: 'miami' }, { id: 'flames', name: 'FLAMES', need: 'denver' }, { id: 'checker', name: 'CHECKERS', need: 'riviera' }, { id: 'wagmi', name: 'WAGMI', need: 'dubai' }, { id: 'tron', name: 'CIRCUIT', need: 'gold:grid' }]
  };
  function part(kind, id) { var L = PARTS[kind]; for (var i = 0; i < L.length; i++) if (L[i].id === id) return L[i]; return L[0]; }
  var DEF = {
    nightwedge: { paint: 'pink', finish: 'gloss', rim: 'five', rimColor: 'gold', wing: 'lip', glow: 'cyan', decal: 'none', plate: 'WEN' },
    bigblock: { paint: 'red', finish: 'gloss', rim: 'five', rimColor: 'silver', wing: 'none', glow: 'none', decal: 'stripe', plate: 'GM' },
    niner: { paint: 'white', finish: 'gloss', rim: 'disc', rimColor: 'silver', wing: 'lip', glow: 'none', decal: 'none', plate: 'WAGMI' },
    strake: { paint: 'red', finish: 'gloss', rim: 'disc', rimColor: 'silver', wing: 'none', glow: 'none', decal: 'none', plate: 'HODL' },
    suv: { paint: 'black', finish: 'gloss', rim: 'five', rimColor: 'silver', wing: 'none', glow: 'none', decal: 'none', plate: 'SAFU' },
    bear: { paint: 'yellow', finish: 'matte', rim: 'disc', rimColor: 'white', wing: 'none', glow: 'none', decal: 'none', plate: 'REKT' }
  };
  function defaults(id) { var d = DEF[id] || DEF.nightwedge, o = {}; for (var k in d) o[k] = d[k]; return o; }

  // ---- Side views. Units: the car is about 1000 long, nose to the right, the ground is y = 0, up is negative. ----
  var SIDE = {
    nightwedge: {
      wheels: [212, 748], r: 66, len: 1000,
      body: 'M40 -44 L34 -112 Q36 -150 70 -160 L250 -186 Q330 -226 400 -232 L476 -232 Q500 -230 520 -216 L668 -150 L868 -104 Q950 -86 966 -66 L970 -44 Z',
      glass: ['M410 -222 L474 -222 Q494 -220 508 -210 L628 -156 L424 -156 Z', 'M300 -196 Q350 -216 396 -222 L410 -156 L326 -156 Z'],
      wing: [78, -160], door: 'M424 -150 L420 -60 L650 -60 L660 -140', mirror: [612, -166],
      extra: function (g, P) {
        g.fillStyle = INK; poly(g, [[262, -140], [352, -148], [340, -84], [276, -84]]);                         // side intake
        g.fillStyle = rgba('#000000', 0.35); for (var i = 0; i < 4; i++) poly(g, [[120 + i * 34, -166 - i * 5], [142 + i * 34, -169 - i * 5], [146 + i * 34, -160 - i * 5], [124 + i * 34, -157 - i * 5]]);   // engine louvres
        g.fillStyle = '#fff6c8'; glow(g, '#fff6c8', 14); poly(g, [[884, -98], [950, -80], [952, -74], [880, -90]]); g.shadowBlur = 0;   // headlight blade
        g.fillStyle = '#ff184c'; glow(g, '#ff184c', 14); poly(g, [[34, -126], [48, -128], [50, -108], [35, -106]]); g.shadowBlur = 0;
        g.fillStyle = INK; poly(g, [[60, -58], [970, -58], [970, -44], [40, -44]]);                             // sill and splitter
      }
    },
    bigblock: {
      wheels: [205, 760], r: 70, len: 1000,
      body: 'M30 -52 L26 -150 Q28 -166 46 -170 L190 -182 Q300 -244 380 -248 L520 -248 Q548 -246 566 -226 L628 -178 L930 -166 Q966 -162 972 -140 L976 -60 L960 -52 Z',
      glass: ['M388 -238 L516 -238 Q536 -236 550 -222 L604 -180 L392 -180 Z', 'M250 -200 Q320 -234 374 -238 L378 -180 L262 -180 Z'],
      wing: [70, -172], door: 'M392 -174 L388 -68 L612 -68 L616 -174', mirror: [600, -190],
      extra: function (g, P) {
        g.fillStyle = INK; poly(g, [[640, -196], [760, -192], [760, -180], [640, -182]]);                       // hood scoop
        g.fillStyle = '#d9d6ea'; poly(g, [[958, -92], [984, -92], [984, -72], [958, -72]]); poly(g, [[14, -96], [40, -96], [40, -76], [14, -76]]);   // chrome bumpers
        g.fillStyle = '#fff6c8'; glow(g, '#fff6c8', 12); poly(g, [[960, -150], [974, -148], [975, -112], [960, -112]]); g.shadowBlur = 0;
        g.fillStyle = '#ff184c'; glow(g, '#ff184c', 12); poly(g, [[26, -150], [38, -150], [38, -112], [27, -112]]); g.shadowBlur = 0;
        g.fillStyle = INK; poly(g, [[40, -64], [960, -64], [960, -52], [30, -52]]);
      }
    },
    niner: {
      wheels: [228, 762], r: 72, len: 980,
      body: 'M46 -32 L24 -60 Q14 -112 28 -152 Q48 -178 98 -186 Q210 -222 330 -251 Q400 -267 452 -265 Q500 -263 532 -252 L648 -198 Q716 -190 772 -184 Q852 -178 902 -152 Q950 -126 958 -92 L962 -48 Q960 -34 944 -32 Z',
      glass: ['M434 -251 Q500 -251 528 -241 L628 -199 L438 -201 Z', 'M250 -213 Q340 -245 422 -251 L426 -201 L300 -203 Q268 -205 250 -213 Z'],
      wing: [78, -188], door: 'M438 -195 L432 -62 L636 -62 L646 -193', mirror: [610, -208],
      extra: function (g, P) {
        g.fillStyle = '#fff6c8'; glow(g, '#fff6c8', 14); g.beginPath(); g.ellipse(912, -134, 34, 14, 0.72, 0, 6.3); g.fill(); g.shadowBlur = 0;   // the round lamp on the wing, seen from the side
        g.fillStyle = '#ffb02e'; poly(g, [[934, -100], [957, -96], [957, -90], [934, -94]]);
        g.fillStyle = '#ff184c'; glow(g, '#ff184c', 12); poly(g, [[24, -150], [84, -176], [90, -166], [28, -136]]); g.shadowBlur = 0;
        g.fillStyle = INK; poly(g, [[298, -152], [332, -158], [328, -116], [302, -114]]);                       // intake ahead of the rear wheel
        for (var i = 0; i < 3; i++) poly(g, [[26, -88 + i * 13], [74, -90 + i * 13], [74, -84 + i * 13], [27, -82 + i * 13]]);   // vents in the rear bumper
        poly(g, [[898, -72], [960, -76], [961, -52], [898, -50]]);                                             // front intake
        g.fillStyle = rgba('#000000', 0.3); for (i = 0; i < 4; i++) poly(g, [[116 + i * 20, -194 - i * 6.6], [128 + i * 20, -198 - i * 6.6], [130 + i * 20, -191 - i * 6.6], [118 + i * 20, -187 - i * 6.6]]);
        g.fillStyle = INK; poly(g, [[60, -46], [946, -46], [944, -32], [46, -32]]);
        g.fillStyle = rgba('#000000', 0.4); poly(g, [[452, -150], [486, -150], [486, -144], [452, -144]]);       // door handle
      }
    },
    strake: {
      wheels: [200, 752], r: 66, len: 1010,
      body: 'M34 -46 L30 -136 Q32 -158 56 -162 L290 -176 Q350 -222 410 -226 L492 -226 Q514 -224 532 -210 L676 -146 L900 -116 Q972 -104 980 -80 L982 -46 Z',
      glass: ['M418 -216 L490 -216 Q508 -214 522 -204 L634 -152 L424 -152 Z', 'M320 -184 Q364 -212 406 -216 L412 -152 L332 -152 Z'],
      wing: [70, -164], door: 'M424 -146 L420 -60 L660 -60 L668 -140', mirror: [620, -168],
      extra: function (g, P) {
        g.fillStyle = INK; for (var i = 0; i < 5; i++) poly(g, [[250, -136 + i * 15], [600 - i * 6, -128 + i * 13], [600 - i * 6, -122 + i * 13], [250, -129 + i * 15]]);   // the side strakes
        g.fillStyle = '#fff6c8'; glow(g, '#fff6c8', 10); poly(g, [[930, -100], [974, -92], [976, -84], [930, -90]]); g.shadowBlur = 0;
        g.fillStyle = '#ff184c'; glow(g, '#ff184c', 12); poly(g, [[30, -134], [44, -136], [46, -104], [31, -102]]); g.shadowBlur = 0;
        g.fillStyle = INK; poly(g, [[44, -60], [982, -60], [982, -46], [34, -46]]);
      }
    },
    suv: {
      wheels: [222, 748], r: 80, len: 990,
      body: 'M40 -78 L32 -200 Q36 -252 90 -276 Q200 -322 330 -328 L520 -328 Q560 -326 590 -300 L668 -236 L880 -220 Q946 -210 956 -170 L962 -90 L948 -78 Z',
      glass: ['M436 -314 L518 -314 Q550 -312 574 -292 L634 -240 L440 -238 Z', 'M150 -288 Q250 -312 422 -314 L426 -238 L196 -238 Q164 -250 150 -288 Z'],
      wing: [70, -286], door: 'M440 -232 L436 -100 L650 -100 L654 -232 M240 -232 L240 -100 L436 -100', mirror: [628, -250],
      extra: function (g, P) {
        g.fillStyle = '#fff6c8'; glow(g, '#fff6c8', 14); poly(g, [[884, -212], [946, -200], [950, -184], [888, -192]]); g.shadowBlur = 0;
        g.fillStyle = '#ff184c'; glow(g, '#ff184c', 12); poly(g, [[34, -220], [60, -226], [60, -214], [34, -206]]); g.shadowBlur = 0;
        g.fillStyle = INK; poly(g, [[44, -112], [956, -112], [948, -78], [40, -78]]);                           // dark cladding
        g.fillStyle = INK; poly(g, [[200, -332], [560, -332], [560, -326], [200, -326]]);                       // roof rails
      }
    },
    bear: {
      wheels: [200, 660], r: 56, len: 860,
      body: 'M40 -52 L36 -250 Q38 -276 66 -278 L470 -278 Q498 -276 514 -256 L600 -176 L790 -164 Q828 -160 832 -130 L836 -60 L824 -52 Z',
      glass: ['M330 -264 L468 -264 Q486 -262 498 -248 L566 -182 L334 -180 Z', 'M84 -264 L316 -264 L320 -180 L84 -180 Z'],
      wing: [50, -280], door: 'M334 -174 L330 -66 L560 -66 L566 -174', mirror: [548, -192],
      extra: function (g, P) {
        g.fillStyle = '#fff6c8'; glow(g, '#fff6c8', 10); poly(g, [[800, -156], [830, -152], [832, -122], [800, -122]]); g.shadowBlur = 0;
        g.fillStyle = '#ff184c'; glow(g, '#ff184c', 10); poly(g, [[36, -170], [52, -170], [52, -124], [37, -124]]); g.shadowBlur = 0;
        g.fillStyle = '#3a3350'; poly(g, [[822, -96], [848, -96], [848, -70], [822, -70]]); poly(g, [[22, -96], [44, -96], [44, -70], [22, -70]]);   // plastic bumpers
        g.fillStyle = INK; poly(g, [[44, -64], [826, -64], [824, -52], [40, -52]]);
        // a roof rack with one suitcase: the life savings
        g.strokeStyle = '#3a3350'; g.lineWidth = 6; g.beginPath(); g.moveTo(120, -286); g.lineTo(440, -286); g.moveTo(150, -286); g.lineTo(150, -278); g.moveTo(410, -286); g.lineTo(410, -278); g.stroke();
        g.fillStyle = '#7a4a2a'; poly(g, [[200, -330], [340, -330], [340, -290], [200, -290]]); g.fillStyle = '#4e2c16'; poly(g, [[200, -314], [340, -314], [340, -308], [200, -308]]);
      }
    }
  };
  function poly(g, p) { g.beginPath(); g.moveTo(p[0][0], p[0][1]); for (var i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.closePath(); g.fill(); }
  function glow(g, c, n) { g.shadowColor = c; g.shadowBlur = n; }
  var paths = {};
  function P2(d) { return paths[d] || (paths[d] = new Path2D(d)); }

  function paintFill(g, build, y0, y1) {
    var p = part('paint', build.paint), f = build.finish, gr = g.createLinearGradient(0, y0, 0, y1), a = p.a, b = p.b || p.a;
    if (f === 'chrome') {
      gr.addColorStop(0, '#f4f9ff'); gr.addColorStop(0.28, mix(a, '#ffffff', 0.55)); gr.addColorStop(0.5, '#fdfdff'); gr.addColorStop(0.53, '#2b1a55'); gr.addColorStop(0.72, mix(a, '#3a2a70', 0.35)); gr.addColorStop(1, '#120a2e');
    } else if (f === 'neon') {
      gr.addColorStop(0, '#170a36'); gr.addColorStop(1, '#090218');
    } else if (f === 'matte') {
      gr.addColorStop(0, mix(a, '#ffffff', 0.06)); gr.addColorStop(0.6, mix(b, '#000000', 0.12)); gr.addColorStop(1, mix(b, '#000000', 0.38));
    } else {
      gr.addColorStop(0, mix(a, '#ffffff', 0.5)); gr.addColorStop(0.22, mix(a, '#ffffff', 0.12)); gr.addColorStop(0.55, mix(b, '#000000', 0.05)); gr.addColorStop(1, mix(b, '#000000', 0.5));
    }
    return gr;
  }
  function wheel(g, x, r, build, spin) {
    var rc = part('rimColor', build.rimColor).a, st = build.rim, y = -r, i, a;
    g.fillStyle = '#07010f'; g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fill();
    g.strokeStyle = '#2a2140'; g.lineWidth = r * 0.06; g.beginPath(); g.arc(x, y, r * 0.9, 0, 6.3); g.stroke();
    var rr = r * 0.7;
    g.save(); g.translate(x, y); g.rotate(spin || 0);
    g.fillStyle = '#12092a'; g.beginPath(); g.arc(0, 0, rr, 0, 6.3); g.fill();
    g.strokeStyle = rc; g.fillStyle = rc; g.lineCap = 'round';
    g.lineWidth = r * (st === 'deep' ? 0.16 : 0.08); g.beginPath(); g.arc(0, 0, rr - g.lineWidth / 2, 0, 6.3); g.stroke();
    if (st === 'five') { for (i = 0; i < 5; i++) { a = i * 6.2832 / 5; g.beginPath(); g.moveTo(Math.cos(a - 0.2) * rr * 0.2, Math.sin(a - 0.2) * rr * 0.2); g.lineTo(Math.cos(a - 0.1) * rr * 0.9, Math.sin(a - 0.1) * rr * 0.9); g.lineTo(Math.cos(a + 0.1) * rr * 0.9, Math.sin(a + 0.1) * rr * 0.9); g.lineTo(Math.cos(a + 0.2) * rr * 0.2, Math.sin(a + 0.2) * rr * 0.2); g.fill(); } }
    else if (st === 'mesh') { g.lineWidth = r * 0.035; for (i = 0; i < 14; i++) { a = i * 6.2832 / 14; g.beginPath(); g.moveTo(Math.cos(a) * rr * 0.2, Math.sin(a) * rr * 0.2); g.lineTo(Math.cos(a + 0.25) * rr * 0.9, Math.sin(a + 0.25) * rr * 0.9); g.moveTo(Math.cos(a) * rr * 0.2, Math.sin(a) * rr * 0.2); g.lineTo(Math.cos(a - 0.25) * rr * 0.9, Math.sin(a - 0.25) * rr * 0.9); g.stroke(); } }
    else if (st === 'disc') { g.beginPath(); g.arc(0, 0, rr * 0.88, 0, 6.3); g.fill(); g.fillStyle = '#12092a'; for (i = 0; i < 10; i++) { a = i * 6.2832 / 10; g.beginPath(); g.ellipse(Math.cos(a) * rr * 0.62, Math.sin(a) * rr * 0.62, rr * 0.13, rr * 0.05, a, 0, 6.3); g.fill(); } g.fillStyle = rc; }
    else if (st === 'star') { for (i = 0; i < 3; i++) { a = i * 6.2832 / 3 - 1.57; g.beginPath(); g.moveTo(Math.cos(a - 0.5) * rr * 0.25, Math.sin(a - 0.5) * rr * 0.25); g.lineTo(Math.cos(a - 0.16) * rr * 0.9, Math.sin(a - 0.16) * rr * 0.9); g.lineTo(Math.cos(a + 0.16) * rr * 0.9, Math.sin(a + 0.16) * rr * 0.9); g.lineTo(Math.cos(a + 0.5) * rr * 0.25, Math.sin(a + 0.5) * rr * 0.25); g.fill(); } }
    else { g.lineWidth = r * 0.05; for (i = 0; i < 8; i++) { a = i * 6.2832 / 8; g.beginPath(); g.moveTo(Math.cos(a) * rr * 0.15, Math.sin(a) * rr * 0.15); g.lineTo(Math.cos(a) * rr * 0.62, Math.sin(a) * rr * 0.62); g.stroke(); } g.beginPath(); g.arc(0, 0, rr * 0.62, 0, 6.3); g.stroke(); }
    g.beginPath(); g.arc(0, 0, rr * 0.2, 0, 6.3); g.fill();
    g.fillStyle = '#12092a'; g.beginPath(); g.arc(0, 0, rr * 0.08, 0, 6.3); g.fill();
    g.restore();
  }
  function sideWing(g, kind, at, paint) {
    var x = at[0], y = at[1];
    if (kind === 'lip') { g.fillStyle = INK; poly(g, [[x - 44, y - 2], [x - 52, y - 30], [x - 36, y - 32], [x + 40, y + 2]]); }
    else if (kind === 'gt') { g.fillStyle = INK; poly(g, [[x + 16, y + 2], [x + 6, y - 56], [x + 22, y - 56], [x + 44, y + 2]]); poly(g, [[x - 62, y - 62], [x + 96, y - 70], [x + 100, y - 56], [x - 58, y - 48]]); g.fillStyle = paint; poly(g, [[x - 66, y - 92], [x - 46, y - 92], [x - 42, y - 44], [x - 66, y - 44]]); }
    else if (kind === 'mega') { g.fillStyle = INK; poly(g, [[x + 30, y + 2], [x - 10, y - 104], [x + 10, y - 104], [x + 70, y + 2]]); g.fillStyle = paint; poly(g, [[x - 80, y - 116], [x + 130, y - 128], [x + 136, y - 106], [x - 74, y - 92]]); g.fillStyle = INK; poly(g, [[x - 86, y - 140], [x - 60, y - 140], [x - 56, y - 80], [x - 86, y - 80]]); }
  }
  function sideDecal(g, kind, M, build) {
    var w = M.wheels, mid = (w[0] + w[1]) / 2, i;
    if (kind === 'stripe') { g.fillStyle = 'rgba(255,255,255,0.92)'; g.fillRect(0, -128, 1100, 16); g.fillRect(0, -106, 1100, 6); }
    else if (kind === 'number') { g.fillStyle = '#fff'; g.beginPath(); g.arc(mid + 40, -112, 44, 0, 6.3); g.fill(); g.fillStyle = INK; g.font = '800 52px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('21', mid + 40, -108); }
    else if (kind === 'candles') { var hs = [30, 44, 26, 58, 40, 72, 54, 90]; for (i = 0; i < hs.length; i++) { var up = i !== 2 && i !== 4 && i !== 6, cx = mid - 110 + i * 34, base = -76 - (i * 5); g.fillStyle = up ? '#3dff8a' : '#ff3d6e'; g.fillRect(cx, base - hs[i], 16, hs[i]); g.fillRect(cx + 6, base - hs[i] - 12, 4, hs[i] + 24); } }
    else if (kind === 'flames') { for (i = 0; i < 3; i++) { g.fillStyle = ['#ffd319', '#ff8f3a', '#ff2e3a'][i]; var y = -150 + i * 28; g.beginPath(); g.moveTo(w[1] + 150, y); g.bezierCurveTo(w[1] - 40, y - 34 + i * 6, w[1] - 180, y + 30, w[1] - 330 + i * 40, y - 10); g.bezierCurveTo(w[1] - 200, y + 44, w[1] - 60, y + 6, w[1] + 150, y + 34); g.fill(); } }
    else if (kind === 'checker') { for (var a = 0; a < 6; a++) for (var b = 0; b < 4; b++) if ((a + b) % 2) { g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(w[0] - 150 + a * 30, -160 + b * 30, 30, 30); } }
    else if (kind === 'wagmi') { g.fillStyle = 'rgba(255,255,255,0.95)'; g.font = '800 62px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.save(); g.transform(1, 0, -0.2, 1, 0, 0); g.fillText('WAGMI', mid + 10, -104); g.restore(); }
    else if (kind === 'tron') { g.strokeStyle = '#2de2e6'; g.shadowColor = '#2de2e6'; g.shadowBlur = 12; g.lineWidth = 5; g.beginPath(); g.moveTo(40, -96); g.lineTo(w[0] + 110, -96); g.lineTo(w[0] + 150, -128); g.lineTo(mid + 120, -128); g.lineTo(mid + 160, -96); g.lineTo(1000, -96); g.stroke(); g.shadowBlur = 0; }
  }
  // opt: { spin: wheel angle, noGlow, noShadow }. Draws at the current transform; scale and translate before calling.
  function side(g, id, build, opt) {
    opt = opt || {}; var M = SIDE[id] || SIDE.nightwedge, body = P2(M.body), p = part('paint', build.paint), gl = part('glow', build.glow), top = id === 'suv' ? -330 : id === 'bear' ? -280 : id === 'niner' ? -267 : -256;
    g.save(); g.lineJoin = 'round';
    if (!opt.noShadow) { g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.ellipse(M.len / 2, 4, M.len * 0.5, 16, 0, 0, 6.3); g.fill(); }
    if (gl.a && !opt.noGlow) { var rg = g.createRadialGradient(M.len / 2, 6, 10, M.len / 2, 6, M.len * 0.56); rg.addColorStop(0, rgba(gl.a, 0.95)); rg.addColorStop(0.5, rgba(gl.a, 0.45)); rg.addColorStop(1, rgba(gl.a, 0)); g.save(); g.translate(0, 6); g.scale(1, 0.09); g.translate(0, -6); g.fillStyle = rg; g.beginPath(); g.arc(M.len / 2, 6, M.len * 0.56, 0, 6.3); g.fill(); g.restore(); }
    sideWing(g, build.wing, M.wing, mix(p.a, '#000000', 0.2));
    g.fillStyle = paintFill(g, build, top, -40); g.fill(body);
    g.save(); g.clip(body);
    g.save(); g.translate(0, id === 'suv' ? -72 : id === 'bear' ? -44 : id === 'bigblock' ? -18 : id === 'niner' ? -6 : 0); sideDecal(g, build.decal, M, build); g.restore();
    if (build.finish === 'gloss' || build.finish === 'chrome') { g.fillStyle = 'rgba(255,255,255,0.16)'; g.fillRect(0, -170, 1100, 5); }
    g.fillStyle = 'rgba(0,0,0,0.85)'; M.wheels.forEach(function (x) { g.beginPath(); g.arc(x, -M.r, M.r + 12, 0, 6.3); g.fill(); });    // wheel arches
    g.restore();
    M.glass.forEach(function (d) { var q = P2(d); g.fillStyle = GLASS; g.fill(q); g.save(); g.clip(q); var sh = g.createLinearGradient(0, top, 0, -150); sh.addColorStop(0, 'rgba(45,226,230,0.55)'); sh.addColorStop(1, 'rgba(255,46,151,0.12)'); g.fillStyle = sh; g.fillRect(0, top - 10, 1100, 200); g.restore(); });
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 3; g.stroke(P2(M.door));
    g.fillStyle = mix(p.a, '#000000', 0.25); g.beginPath(); g.ellipse(M.mirror[0], M.mirror[1], 20, 11, -0.2, 0, 6.3); g.fill();
    M.extra(g, p);
    if (build.finish === 'neon') { g.strokeStyle = p.a; g.shadowColor = p.a; g.shadowBlur = 22; g.lineWidth = 6; g.stroke(body); g.lineWidth = 3; M.glass.forEach(function (d) { g.stroke(P2(d)); }); g.shadowBlur = 0; }
    M.wheels.forEach(function (x) { wheel(g, x, M.r, build, opt.spin); });
    g.restore();
  }

  // ---- Rear views. Units: about 320 wide, centred on x = 0, the ground is y = 0. ----
  var REAR = {
    nightwedge: { hw: 150, top: -84, sh: -64, cabB: 92, cabT: 60, cabTop: -122, clear: 20, tire: [40, 44], lights: 'blade', pipes: 'centre', round: 8 },
    bigblock: { hw: 140, top: -96, sh: -84, cabB: 104, cabT: 80, cabTop: -142, clear: 26, tire: [38, 46], lights: 'bar6', pipes: 'dual', round: 4 },
    niner: { hw: 142, top: -90, sh: -56, cabB: 92, cabT: 60, cabTop: -146, clear: 22, tire: [40, 44], lights: 'strip', pipes: 'dual', round: 26 },
    strake: { hw: 156, top: -82, sh: -66, cabB: 96, cabT: 64, cabTop: -118, clear: 20, tire: [44, 44], lights: 'slats', pipes: 'quad', round: 6 },
    suv: { hw: 134, top: -132, sh: -112, cabB: 116, cabT: 92, cabTop: -196, clear: 40, tire: [36, 62], lights: 'strip', pipes: 'dual', round: 16 },
    bear: { hw: 110, top: -112, sh: -100, cabB: 98, cabT: 86, cabTop: -174, clear: 30, tire: [26, 46], lights: 'square', pipes: 'one', round: 6 }
  };
  // steer: -1..1, leans the car into the turn and shows a little of its flank. opt: { brake, noPlate }
  function rear(g, id, build, steer, opt) {
    opt = opt || {}; steer = steer || 0;
    var R = REAR[id] || REAR.nightwedge, p = part('paint', build.paint), gl = part('glow', build.glow), hw = R.hw, bot = -R.clear, cs = steer * 12, neon = build.finish === 'neon';
    g.save(); g.lineJoin = 'round';
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.ellipse(0, 2, hw + 14, 10, 0, 0, 6.3); g.fill();
    if (gl.a) { var rg = g.createRadialGradient(0, 0, 4, 0, 0, hw + 50); rg.addColorStop(0, rgba(gl.a, 0.95)); rg.addColorStop(0.6, rgba(gl.a, 0.4)); rg.addColorStop(1, rgba(gl.a, 0)); g.save(); g.scale(1, 0.16); g.fillStyle = rg; g.beginPath(); g.arc(0, 0, hw + 50, 0, 6.3); g.fill(); g.restore(); }
    // tyres
    g.fillStyle = '#07010f'; rrect(g, -hw + 4, -R.tire[1], R.tire[0], R.tire[1], 6); g.fill(); rrect(g, hw - 4 - R.tire[0], -R.tire[1], R.tire[0], R.tire[1], 6); g.fill();
    // the flank that shows when the car turns
    if (steer) { var s = steer > 0 ? -1 : 1, fw = Math.abs(steer) * 16; g.fillStyle = mix(p.a, '#000000', 0.45); g.beginPath(); g.moveTo(s * hw, bot - 6); g.lineTo(s * (hw + fw), bot - 10); g.lineTo(s * (hw + fw), R.sh + 6); g.lineTo(s * (hw - 6), R.top + 4); g.closePath(); g.fill(); }
    // cabin
    var cab = new Path2D(); cab.moveTo(-R.cabB + cs * 0.5, R.top + 2); cab.lineTo(-R.cabT + cs, R.cabTop + 8); cab.quadraticCurveTo(-R.cabT + cs, R.cabTop, -R.cabT + 10 + cs, R.cabTop); cab.lineTo(R.cabT - 10 + cs, R.cabTop); cab.quadraticCurveTo(R.cabT + cs, R.cabTop, R.cabT + cs, R.cabTop + 8); cab.lineTo(R.cabB + cs * 0.5, R.top + 2); cab.closePath();
    g.fillStyle = paintFill(g, build, R.cabTop, R.top + 30); g.fill(cab);
    var win = new Path2D(), in1 = 12, in2 = 10; win.moveTo(-R.cabB + in1 + cs * 0.55, R.top - 2); win.lineTo(-R.cabT + in2 + cs, R.cabTop + 8); win.lineTo(R.cabT - in2 + cs, R.cabTop + 8); win.lineTo(R.cabB - in1 + cs * 0.55, R.top - 2); win.closePath();
    g.fillStyle = GLASS; g.fill(win); g.save(); g.clip(win); var sh = g.createLinearGradient(0, R.cabTop, 0, R.top); sh.addColorStop(0, 'rgba(45,226,230,0.5)'); sh.addColorStop(1, 'rgba(255,46,151,0.1)'); g.fillStyle = sh; g.fillRect(-200, R.cabTop, 400, 100);
    if (id === 'nightwedge' || id === 'strake') { g.fillStyle = 'rgba(0,0,0,0.55)'; for (var l = 0; l < 4; l++) g.fillRect(-200, R.top - 8 - l * 9, 400, 4); }
    g.restore();
    if (build.decal === 'stripe') { g.save(); g.clip(cab); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(-16 + cs, R.cabTop, 12, 14); g.fillRect(4 + cs, R.cabTop, 12, 14); g.restore(); }
    // body
    var body = new Path2D(), r = R.round;
    body.moveTo(-hw + 6, bot); body.lineTo(-hw, R.sh + 10); body.quadraticCurveTo(-hw, R.top + r * 0.3, -hw + r + 8, R.top); body.lineTo(hw - r - 8, R.top); body.quadraticCurveTo(hw, R.top + r * 0.3, hw, R.sh + 10); body.lineTo(hw - 6, bot); body.closePath();
    g.fillStyle = paintFill(g, build, R.top - 6, bot + 10); g.fill(body);
    g.save(); g.clip(body);
    if (build.decal === 'stripe') { g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(-16, R.top, 12, 200); g.fillRect(4, R.top, 12, 200); }
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-200, bot - 20, 400, 30);                               // lower valance
    g.fillStyle = INK; g.fillRect(-hw + 36, bot - 12, hw * 2 - 72, 14);                                  // diffuser
    g.restore();
    // lights
    var ly = (R.top + bot) / 2 - 8, red = opt.brake ? '#ff5a7a' : '#ff184c', lb = opt.brake ? 26 : 14;
    g.fillStyle = red; glow(g, '#ff184c', lb);
    if (R.lights === 'blade') { [-1, 1].forEach(function (s) { poly(g, [[s * (hw - 10), ly - 10], [s * 44, ly - 4], [s * 44, ly + 2], [s * (hw - 10), ly + 2]]); poly(g, [[s * (hw - 10), ly + 6], [s * 70, ly + 6], [s * 76, ly + 11], [s * (hw - 14), ly + 12]]); }); }
    else if (R.lights === 'bar6') { g.fillStyle = INK; g.shadowBlur = 0; g.fillRect(-hw + 10, ly - 10, hw * 2 - 20, 22); g.fillStyle = red; glow(g, '#ff184c', lb); for (var i = 0; i < 3; i++) { g.fillRect(-hw + 16 + i * 30, ly - 6, 24, 14); g.fillRect(hw - 40 - i * 30, ly - 6, 24, 14); } }
    else if (R.lights === 'strip') { g.fillRect(-hw + 12, ly - 4, hw * 2 - 24, 7); g.fillRect(-hw + 12, ly - 8, 40, 14); g.fillRect(hw - 52, ly - 8, 40, 14); }
    else if (R.lights === 'slats') { g.fillRect(-hw + 10, ly - 12, hw * 2 - 20, 26); g.shadowBlur = 0; g.fillStyle = INK; for (var k = 0; k < 5; k++) g.fillRect(-hw + 8, ly - 12 + k * 6, hw * 2 - 16, 3); }
    else { g.fillRect(-hw + 10, ly - 12, 26, 26); g.fillRect(hw - 36, ly - 12, 26, 26); }
    g.shadowBlur = 0;
    // exhausts
    g.fillStyle = '#05000c'; g.strokeStyle = '#8f89a8'; g.lineWidth = 2;
    var px = R.pipes === 'centre' ? [-12, 12] : R.pipes === 'dual' ? [-hw + 50, hw - 50] : R.pipes === 'quad' ? [-hw + 44, -hw + 62, hw - 62, hw - 44] : [hw - 46];
    px.forEach(function (x) { g.beginPath(); g.ellipse(x, bot - 4, R.pipes === 'centre' ? 10 : 7, 6, 0, 0, 6.3); g.fill(); g.stroke(); });
    // plate
    if (!opt.noPlate) {
      var py = bot - 30; g.fillStyle = '#f6e7ff'; rrect(g, -32, py - 9, 64, 18, 3); g.fill(); g.fillStyle = INK; g.font = '800 13px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(build.plate || '').slice(0, 7), 0, py + 1, 58);
    }
    if (id === 'bear') { g.fillStyle = '#3a3350'; g.fillRect(-hw + 2, bot - 16, hw * 2 - 4, 12); g.fillStyle = '#7a4a2a'; g.fillRect(-36 + cs, R.cabTop - 30, 72, 24); g.fillStyle = '#3a3350'; g.fillRect(-R.cabT + cs, R.cabTop - 6, R.cabT * 2, 4); }
    if (id === 'bigblock') { g.fillStyle = '#d9d6ea'; g.fillRect(-hw - 2, bot - 16, hw * 2 + 4, 8); }
    if (id === 'suv') { g.fillStyle = INK; g.fillRect(-R.cabT - 4 + cs, R.cabTop - 4, R.cabT * 2 + 8, 6); }
    // wing
    var wk = build.wing, wy = R.top;
    if (wk === 'lip') { g.fillStyle = INK; g.fillRect(-hw + 14, wy - 5, hw * 2 - 28, 7); }
    else if (wk === 'gt') { g.fillStyle = INK; g.fillRect(-hw + 50, wy - 24, 8, 26); g.fillRect(hw - 58, wy - 24, 8, 26); g.fillRect(-hw + 4, wy - 32, hw * 2 - 8, 9); g.fillStyle = mix(p.a, '#000000', 0.2); g.fillRect(-hw, wy - 40, 7, 22); g.fillRect(hw - 7, wy - 40, 7, 22); }
    else if (wk === 'mega') { g.fillStyle = INK; g.fillRect(-hw + 40, wy - 44, 10, 46); g.fillRect(hw - 50, wy - 44, 10, 46); g.fillStyle = mix(p.a, '#000000', 0.1); g.fillRect(-hw - 6, wy - 56, hw * 2 + 12, 13); g.fillStyle = INK; g.fillRect(-hw - 10, wy - 66, 9, 34); g.fillRect(hw + 1, wy - 66, 9, 34); }
    if (neon) { g.strokeStyle = p.a; g.shadowColor = p.a; g.shadowBlur = 16; g.lineWidth = 3; g.stroke(body); g.stroke(cab); g.shadowBlur = 0; }
    g.restore();
  }
  function rrect(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h); g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath(); }

  root.POF_WL_CARS = { side: side, rear: rear, PARTS: PARTS, part: part, defaults: defaults, SIDE: SIDE, REAR: REAR, mix: mix, rgba: rgba, rrect: rrect };
})(typeof window !== 'undefined' ? window : this);
