/* Doge Moon Crash: everything it draws, as plain canvas code (no image files except Elawn's avatar).
   Used by the game (js/dm.js), its share picture and the arcade tile (js/arcade.js). window.POF_DM_ART. */
(function () {
  'use strict';
  var DISP = "'Bungee', Impact, 'Arial Black', sans-serif", MEME = "'Comic Neue', 'Comic Sans MS', 'Comic Sans', cursive";
  var TAU = 6.2832;
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function ell(g, x, y, rx, ry, rot, fill) { g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); if (fill) { g.fillStyle = fill; } g.fill(); }

  // The dog: an original Shiba astronaut. x, y is the middle of the helmet, r its radius; the suit hangs below.
  // o: flame 0..1, big (rocket mode), tilt, wow (brows up), happy (eyes shut), tongue, hurt.
  function doge(g, x, y, r, t, o) {
    o = o || {};
    g.save(); g.translate(x, y); g.rotate(o.tilt || 0);
    var fl = o.flame || 0, wave = Math.sin(t * (o.big ? 14 : 4)) * 0.25, sx, i;
    var W = '#f4f6fa', SH = '#c9d0dc', RED = '#d8343c', BLU = '#2f6fd0';
    g.fillStyle = '#8a93a3'; rr(g, -r * 0.62, r * 0.75, r * 1.24, r * 0.85, r * 0.15); g.fill();
    for (i = 0; i < 2; i++) {
      sx = i ? 0.38 : -0.38;
      g.fillStyle = '#5b6372'; rr(g, sx * r - r * 0.13, r * 1.55, r * 0.26, r * 0.2, r * 0.05); g.fill();
      if (fl > 0.05) {
        var L = (r * 0.9 + Math.random() * r * 0.6) * fl * (o.big ? 2.2 : 1), fg = g.createLinearGradient(0, r * 1.75, 0, r * 1.75 + L);
        fg.addColorStop(0, '#fff6a0'); fg.addColorStop(0.4, '#ff9a2a'); fg.addColorStop(1, 'rgba(255,60,0,0)');
        g.fillStyle = fg; g.beginPath(); g.moveTo(sx * r - r * 0.12, r * 1.75); g.lineTo(sx * r, r * 1.75 + L); g.lineTo(sx * r + r * 0.12, r * 1.75); g.fill();
      }
    }
    for (i = 0; i < 2; i++) {   // legs
      sx = i ? 1 : -1; g.save(); g.translate(sx * r * 0.3, r * 1.55); g.rotate(sx * (0.12 + wave * 0.3));
      g.fillStyle = W; rr(g, -r * 0.2, 0, r * 0.4, r * 0.55, r * 0.18); g.fill(); g.strokeStyle = SH; g.lineWidth = r * 0.04; g.stroke();
      g.fillStyle = RED; g.fillRect(-r * 0.2, r * 0.3, r * 0.4, r * 0.09); g.restore();
    }
    for (i = 0; i < 2; i++) {   // arms and mittens
      sx = i ? 1 : -1; g.save(); g.translate(sx * r * 0.6, r * 0.95); g.rotate(sx * (-0.9 - (sx > 0 ? wave : -wave)));
      g.fillStyle = W; rr(g, -r * 0.17, -r * 0.1, r * 0.34, r * 0.75, r * 0.17); g.fill(); g.strokeStyle = SH; g.lineWidth = r * 0.04; g.stroke();
      g.fillStyle = RED; g.fillRect(-r * 0.17, r * 0.35, r * 0.34, r * 0.1);
      g.fillStyle = W; g.beginPath(); g.arc(0, r * 0.62, r * 0.2, 0, TAU); g.fill(); g.stroke(); g.restore();
    }
    g.fillStyle = W; rr(g, -r * 0.62, r * 0.72, r * 1.24, r * 0.98, r * 0.3); g.fill(); g.strokeStyle = SH; g.lineWidth = r * 0.04; g.stroke();
    g.fillStyle = BLU; g.fillRect(-r * 0.55, r * 0.78, r * 0.16, r * 0.5); g.fillRect(r * 0.39, r * 0.78, r * 0.16, r * 0.5);
    g.fillStyle = '#3a3f4a'; g.fillRect(-r * 0.62, r * 1.38, r * 1.24, r * 0.08);
    g.fillStyle = '#e9ecf2'; rr(g, -r * 0.22, r * 0.98, r * 0.44, r * 0.32, r * 0.06); g.fill(); g.strokeStyle = '#6b7280'; g.lineWidth = r * 0.035; g.stroke();
    g.fillStyle = '#e0a400'; g.font = (r * 0.3) + 'px ' + DISP; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Ð', 0, r * 1.15);
    // helmet glass, then the head inside it
    g.fillStyle = '#141a33'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    var h = r * 0.74;
    g.save(); g.beginPath(); g.arc(0, 0, r * 0.97, 0, TAU); g.clip();
    for (i = 0; i < 2; i++) {
      sx = i ? 1 : -1;
      g.fillStyle = '#e0902f'; g.beginPath(); g.moveTo(sx * h * 0.25, -h * 0.55); g.lineTo(sx * h * 0.72, -h * 1.2); g.lineTo(sx * h * 0.92, -h * 0.3); g.fill();
      g.fillStyle = '#fbe3c4'; g.beginPath(); g.moveTo(sx * h * 0.42, -h * 0.55); g.lineTo(sx * h * 0.7, -h * 1.0); g.lineTo(sx * h * 0.8, -h * 0.42); g.fill();
    }
    var hg = g.createRadialGradient(0, -h * 0.3, h * 0.2, 0, 0, h * 1.2); hg.addColorStop(0, '#f3b45a'); hg.addColorStop(1, '#d9892a');
    ell(g, 0, 0, h * 1.05, h * 0.92, 0, hg);
    ell(g, -h * 0.45, h * 0.35, h * 0.5, h * 0.45, 0.2, '#fbf1e2'); ell(g, h * 0.45, h * 0.35, h * 0.5, h * 0.45, -0.2); ell(g, 0, h * 0.32, h * 0.42, h * 0.5, 0);
    var lift = o.wow ? h * 0.1 : 0;
    ell(g, -h * 0.36, -h * 0.42 - lift, h * 0.13, h * 0.08, -0.3, '#fbe9cc'); ell(g, h * 0.36, -h * 0.42 - lift, h * 0.13, h * 0.08, 0.3);
    for (i = 0; i < 2; i++) {
      sx = i ? 1 : -1;
      if (o.happy) { g.strokeStyle = '#2a1a0e'; g.lineWidth = h * 0.08; g.lineCap = 'round'; g.beginPath(); g.arc(sx * h * 0.36, -h * 0.12, h * 0.13, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
      else if (o.hurt) { g.strokeStyle = '#2a1a0e'; g.lineWidth = h * 0.07; g.lineCap = 'round'; g.beginPath(); g.moveTo(sx * h * 0.26, -h * 0.24); g.lineTo(sx * h * 0.46, -h * 0.06); g.moveTo(sx * h * 0.46, -h * 0.24); g.lineTo(sx * h * 0.26, -h * 0.06); g.stroke(); }
      else { ell(g, sx * h * 0.36, -h * 0.14, h * 0.12, h * 0.13, 0, '#2a1a0e'); g.fillStyle = '#fff'; g.beginPath(); g.arc(sx * h * 0.36 - h * 0.04, -h * 0.19, h * 0.04, 0, TAU); g.fill(); }
    }
    ell(g, 0, h * 0.12, h * 0.17, h * 0.12, 0, '#1b1410');
    g.strokeStyle = '#5a3a1e'; g.lineWidth = h * 0.06; g.lineCap = 'round'; g.beginPath(); g.moveTo(-h * 0.25, h * 0.34); g.quadraticCurveTo(-h * 0.12, h * 0.44, 0, h * 0.3); g.quadraticCurveTo(h * 0.12, h * 0.44, h * 0.25, h * 0.34); g.stroke();
    if (o.tongue || o.hurt) ell(g, 0, h * 0.48, h * 0.11, h * 0.13, 0, o.hurt ? '#e85a7a' : '#ef8fa6');
    g.restore();
    ell(g, -r * 0.55, -r * 0.2, r * 0.18, r * 0.55, 0.35, 'rgba(170,215,255,.28)');
    ell(g, r * 0.45, -r * 0.6, r * 0.1, r * 0.06, 0.6, 'rgba(255,255,255,.55)');
    g.strokeStyle = '#e6eaf0'; g.lineWidth = r * 0.09; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
    g.fillStyle = '#e6eaf0'; rr(g, -r * 0.6, r * 0.82, r * 1.2, r * 0.18, r * 0.08); g.fill();
    g.fillStyle = '#d5dae3'; rr(g, -r * 1.1, -r * 0.22, r * 0.2, r * 0.44, r * 0.06); g.fill(); rr(g, r * 0.9, -r * 0.22, r * 0.2, r * 0.44, r * 0.06); g.fill();
    g.restore();
  }

  function coin(g, x, y, r, t) {
    var sq = Math.abs(Math.cos(t * 3 + x * 0.02 + y * 0.01));
    g.save(); g.translate(x, y); g.scale(Math.max(0.25, sq), 1);
    g.fillStyle = '#b8860b'; g.beginPath(); g.arc(0, 0, r + 2, 0, TAU); g.fill();
    g.fillStyle = '#ffc93c'; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.fillStyle = '#e0a400'; g.font = (r * 1.4) + 'px ' + DISP; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Ð', 0, 1); g.restore();
  }
  // One red candle: body with a wick through it. x, y is the top left of the body.
  function candle(g, x, y, w, h, wick) {
    g.fillStyle = '#ff9aa0'; g.fillRect(x + w / 2 - 2, y - wick, 4, h + wick * 2);
    var gr = g.createLinearGradient(x, 0, x + w, 0); gr.addColorStop(0, '#ff5a5f'); gr.addColorStop(0.5, '#e5323b'); gr.addColorStop(1, '#a8161f');
    g.fillStyle = gr; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x + w * 0.14, y, w * 0.14, h);
    g.strokeStyle = '#5c0a10'; g.lineWidth = 3; g.strokeRect(x, y, w, h);
  }
  function sign(g, x, y, text, w, col) {
    g.fillStyle = '#fff'; g.fillRect(x - w / 2, y - 8, w, 16); g.fillStyle = col || '#d11'; g.font = '12px ' + DISP; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x, y + 0.5);
  }
  function bird(g, x, y, t, ph, dir) {
    g.save(); g.translate(x, y); g.scale(dir > 0 ? -1 : 1, 1); var fl = Math.sin(t * 14 + ph * 6);
    ell(g, 0, 0, 20, 12, 0, '#2b2b38');
    g.beginPath(); g.moveTo(-4, -2); g.lineTo(10, -24 * fl - 4); g.lineTo(16, -2); g.fill();
    g.fillStyle = '#f2a93b'; g.beginPath(); g.moveTo(-20, -2); g.lineTo(-32, 2); g.lineTo(-20, 5); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-11, -4, 4, 0, TAU); g.fill(); g.fillStyle = '#000'; g.beginPath(); g.arc(-12, -4, 2, 0, TAU); g.fill();
    g.restore(); sign(g, x, y + 19, 'FUD', 34);
  }
  function ghost(g, x, y, t) {
    g.save(); g.globalAlpha = 0.92; var i, sgn;
    g.fillStyle = '#f4f4ff'; g.beginPath(); g.arc(x, y - 6, 26, Math.PI, 0); g.lineTo(x + 26, y + 22);
    for (i = 0; i < 4; i++) g.quadraticCurveTo(x + 26 - i * 13 - 6.5, y + 30 + Math.sin(t * 8 + i) * 4, x + 26 - (i + 1) * 13, y + 22);
    g.closePath(); g.fill();
    ell(g, x - 9, y - 8, 4, 6, 0, '#223'); ell(g, x + 9, y - 8, 4, 6, 0); ell(g, x, y + 6, 5, 4, 0);
    var w = Math.sin(t * 6) * 6;
    for (i = 0; i < 2; i++) {
      sgn = i ? 1 : -1; g.save(); g.translate(x + sgn * 34, y + 4 + w * sgn); g.rotate(sgn * 0.3); g.fillStyle = '#fffbe6'; g.fillRect(-8, -11, 16, 22); g.strokeStyle = '#bbb'; g.lineWidth = 1; g.strokeRect(-8, -11, 16, 22);
      g.beginPath(); g.moveTo(-5, -5); g.lineTo(5, -5); g.moveTo(-5, 0); g.lineTo(5, 0); g.moveTo(-5, 5); g.lineTo(3, 5); g.stroke(); g.restore();
    }
    g.fillStyle = '#fff'; g.font = '700 14px ' + MEME; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SELL!!', x, y - 42);
    g.restore();
  }
  function balloon(g, x, y, t) {
    g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - 8, y + 30); g.lineTo(x - 5, y + 52); g.moveTo(x + 8, y + 30); g.lineTo(x + 5, y + 52); g.stroke();
    var bg = g.createRadialGradient(x - 10, y - 12, 4, x, y, 36); bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#c9d3e6');
    g.fillStyle = bg; g.beginPath(); g.arc(x, y, 32, 0, TAU); g.fill(); g.strokeStyle = '#8f9bb5'; g.lineWidth = 2; g.stroke();
    g.fillStyle = '#d8343c'; g.font = '9px ' + DISP; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('INFLATION', x, y + 1);
    g.fillStyle = '#6b7280'; g.fillRect(x - 8, y + 52, 16, 12);
  }
  function jet(g, x, y, dir) {
    g.save(); g.translate(x, y); g.scale(dir, 1);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-150, -3, 100, 6);
    g.fillStyle = '#dfe5ee'; g.beginPath(); g.moveTo(48, 0); g.quadraticCurveTo(30, -11, -20, -10); g.lineTo(-46, -10); g.lineTo(-46, 8); g.lineTo(30, 9); g.closePath(); g.fill();
    g.fillStyle = '#9aa6b8'; g.beginPath(); g.moveTo(-6, 2); g.lineTo(-30, 22); g.lineTo(-14, 22); g.lineTo(12, 4); g.fill();
    g.beginPath(); g.moveTo(-34, -10); g.lineTo(-48, -28); g.lineTo(-38, -28); g.lineTo(-22, -10); g.fill();
    g.fillStyle = '#2f6fd0'; g.fillRect(18, -6, 14, 5); g.fillStyle = '#d8343c'; g.fillRect(-46, -2, 70, 3);
    g.restore(); sign(g, x, y - 22, 'WHALE AIR', 74, '#1d4fa8');
  }
  function sat(g, x, y, t) {
    g.save(); g.translate(x, y);
    g.fillStyle = '#1f4fb0'; g.fillRect(-56, -10, 36, 20); g.fillRect(20, -10, 36, 20);
    g.strokeStyle = '#8fb4ff'; g.lineWidth = 1; for (var i = 0; i < 3; i++) { g.strokeRect(-56 + i * 12, -10, 12, 20); g.strokeRect(20 + i * 12, -10, 12, 20); }
    g.fillStyle = '#c9d0dc'; rr(g, -18, -12, 36, 24, 4); g.fill(); g.fillStyle = '#8a93a3'; g.fillRect(-20, -2, 40, 4);
    g.fillStyle = Math.sin(t * 6) > 0 ? '#ff3b3b' : '#7a1a1a'; g.beginPath(); g.arc(0, -15, 3, 0, TAU); g.fill();
    g.restore(); sign(g, x, y + 24, 'FUD-SAT', 60);
  }
  function rock(g, x, y, r, t) {
    g.save(); g.translate(x, y); g.rotate(t * 1.2);
    g.fillStyle = '#7a6252'; g.beginPath(); for (var i = 0; i < 9; i++) { var a = i / 9 * TAU, rr2 = r * (0.82 + ((i * 37) % 5) * 0.06); g.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } g.closePath(); g.fill();
    g.strokeStyle = '#4a3a30'; g.lineWidth = 2; g.stroke();
    ell(g, -r * 0.3, -r * 0.2, r * 0.22, r * 0.16, 0, '#5d4a3e'); ell(g, r * 0.3, r * 0.25, r * 0.16, r * 0.12, 0);
    g.restore();
    g.fillStyle = '#fff'; g.font = '11px ' + DISP; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('RUG', x, y);
  }
  // A falling red candle on fire.
  function meteor(g, x, y) {
    var fg = g.createLinearGradient(0, y - 120, 0, y - 20); fg.addColorStop(0, 'rgba(255,90,0,0)'); fg.addColorStop(1, 'rgba(255,190,60,.85)');
    g.fillStyle = fg; g.beginPath(); g.moveTo(x - 13, y - 30); g.lineTo(x, y - 120 - Math.random() * 20); g.lineTo(x + 13, y - 30); g.fill();
    candle(g, x - 13, y - 34, 26, 68, 10);
  }
  var elawn = null;
  function avatar(g, x, y, r) {
    if (!elawn) { elawn = new Image(); elawn.src = 'art/dm/elawn.webp'; }
    g.save(); g.beginPath(); g.arc(x, y, r, 0, TAU); g.clip();
    if (elawn.complete && elawn.naturalWidth) g.drawImage(elawn, x - r, y - r, r * 2, r * 2); else { g.fillStyle = '#4a6cf0'; g.fill(); }
    g.restore();
  }
  function tweet(g, x, y, t) {
    g.save(); g.translate(x, y); g.rotate(Math.sin(t * 2) * 0.08);
    g.fillStyle = '#fff'; rr(g, -52, -30, 104, 60, 12); g.fill(); g.strokeStyle = '#1d9bf0'; g.lineWidth = 3; g.stroke();
    avatar(g, -32, -8, 15);
    g.fillStyle = '#1d1f27'; g.font = '700 12px ' + MEME; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText('Elawn Moosk', -12, -16);
    g.fillStyle = '#8899aa'; g.font = '700 10px ' + MEME; g.fillText('@elawn · now', -12, -3);
    g.fillStyle = '#c5ced8'; g.fillRect(-44, 12, 70, 4); g.fillRect(-44, 20, 50, 4);
    g.fillStyle = '#1d9bf0'; g.font = '16px ' + DISP; g.textAlign = 'center'; g.fillText('?', 38, 16);
    g.restore();
  }
  function wow(g, x, y, t) {
    g.save(); g.translate(x, y); g.rotate(t * 1.5);
    g.fillStyle = 'hsl(' + (t * 200 % 360) + ' 100% 60%)'; g.beginPath(); for (var i = 0; i < 10; i++) { var a = i / 10 * TAU, r = i % 2 ? 12 : 26; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill();
    g.restore(); g.fillStyle = '#fff'; g.font = '700 13px ' + MEME; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('much wow', x, y + 40);
  }
  function bone(g, x, y, s, on) {
    g.fillStyle = on === false ? 'rgba(255,255,255,.2)' : '#fff6e6'; g.fillRect(x - 8 * s, y - 3 * s, 16 * s, 6 * s);
    for (var i = 0; i < 4; i++) { g.beginPath(); g.arc(x + (i < 2 ? -9 : 9) * s, y + (i % 2 ? 3 : -3) * s, 4 * s, 0, TAU); g.fill(); }
  }
  function bonePickup(g, x, y, t) {
    g.save(); g.translate(x, y); g.rotate(Math.sin(t * 3) * 0.3);
    g.fillStyle = 'rgba(255,246,230,.25)'; g.beginPath(); g.arc(0, 0, 26, 0, TAU); g.fill(); bone(g, 0, 0, 1.6);
    g.restore(); g.fillStyle = '#fff'; g.font = '700 13px ' + MEME; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('+1 bone', x, y + 38);
  }
  function cloud(g, x, y, s) { g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(x, y, 26 * s, 0, TAU); g.arc(x + 30 * s, y - 12 * s, 32 * s, 0, TAU); g.arc(x + 64 * s, y, 24 * s, 0, TAU); g.arc(x + 32 * s, y + 8 * s, 26 * s, 0, TAU); g.fill(); }
  function moon(g, x, y, r) {
    g.save(); g.shadowColor = 'rgba(255,250,220,.6)'; g.shadowBlur = Math.min(40, r * 0.5); g.fillStyle = '#e9e4d2'; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.restore();
    g.fillStyle = '#cfc8b2'; var cr = [[-0.3, -0.2, 0.18], [0.25, 0.1, 0.22], [-0.05, 0.35, 0.12], [0.4, -0.35, 0.1], [-0.45, 0.25, 0.09]];
    for (var i = 0; i < cr.length; i++) { g.beginPath(); g.arc(x + cr[i][0] * r, y + cr[i][1] * r, cr[i][2] * r, 0, TAU); g.fill(); }
  }
  function medal(g, x, y, r, m) {   // m: 1 bronze, 2 silver, 3 gold
    var c = ['', '#e08a4a', '#d9dde6', '#ffc93c'][m], d = ['', '#8a4a1c', '#8b93a3', '#b8860b'][m];
    g.fillStyle = '#d8343c'; g.beginPath(); g.moveTo(x - r * 0.5, y - r * 1.7); g.lineTo(x + r * 0.5, y - r * 1.7); g.lineTo(x + r * 0.25, y - r * 0.6); g.lineTo(x - r * 0.25, y - r * 0.6); g.fill();
    g.fillStyle = d; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); g.fillStyle = c; g.beginPath(); g.arc(x, y, r * 0.84, 0, TAU); g.fill();
    g.fillStyle = d; g.font = (r * 1.1) + 'px ' + DISP; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Ð', x, y + r * 0.06);
  }
  window.POF_DM_ART = { DISP: DISP, MEME: MEME, rr: rr, doge: doge, coin: coin, candle: candle, bird: bird, ghost: ghost, balloon: balloon, jet: jet, sat: sat, rock: rock, meteor: meteor,
    avatar: avatar, tweet: tweet, wow: wow, bone: bone, bonePickup: bonePickup, cloud: cloud, moon: moon, medal: medal };
})();
