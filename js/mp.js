/* Mempool (/mempool/): everything you see and hear. The rules are in js/mp-core.js.
   One canvas for the game (all of it drawn here, no picture files), a synth for the sound, and plain HTML
   over it for the menu, the end card and the leaderboard. */
(function () {
  'use strict';
  if (!window.POF_MP_PAGE) return;
  var C = window.POF_MP_CORE, R = C.RULES, W = C.W, H = C.H, TPS = C.TPS;
  var Q = location.search, DEBUG = /[?&]debug\b/.test(Q), AUTO = /[?&]auto\b/.test(Q);
  // Floats by fee: low, mid, high, top, then the rug and a float a rug has sunk (pays nothing).
  var COL = ['#eef4ff', '#5dff8f', '#ffd23f', '#ff5ea8', '#c9603f', '#2a7fa6'];
  var CYAN = '#3fe0ff', WATER = '#12a9d4', DEEP = '#0b7fb0';
  var INK = '#060912', MUTE = 'rgba(214,222,255,0.6)', MONO = '"JetBrains Mono", ui-monospace, Menlo, monospace';
  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  var today = new Date().toISOString().slice(0, 10);             // the daily mempool turns over at midnight UTC
  var todayLabel = MONTHS[+today.slice(5, 7) - 1] + ' ' + (+today.slice(8, 10));
  // The score server (worker/ in the repo), shared with Ride the Chart. ?debug&api=<url> points at another copy.
  var API = (DEBUG && (/[?&]api=([^&#]+)/.exec(Q) || [])[1]) ? decodeURIComponent(/[?&]api=([^&#]+)/.exec(Q)[1]) : 'https://pof-dip.brianboode.workers.dev';
  function api(path, body) {
    return fetch(API + path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {})
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'error'); return j; }); });
  }
  function $(q) { return root.querySelector(q); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function ease(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
  function fmt(n) { return Math.round(n).toLocaleString('en-US'); }
  function short(n) { return n >= 10000 ? (n / 1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/, '') + 'k' : n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(n); }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem('pof.mp.' + k); localStorage.setItem('pof.mp.' + k, v); } catch (e) { /* private mode */ } return null; }
  function rgba(hex, a) { return 'rgba(' + parseInt(hex.slice(1, 3), 16) + ',' + parseInt(hex.slice(3, 5), 16) + ',' + parseInt(hex.slice(5, 7), 16) + ',' + a + ')'; }

  // ---------- Page ----------
  var root = document.createElement('div');
  root.id = 'mp';
  root.innerHTML =
    '<canvas id="mp-cv" aria-label="Mempool"></canvas>' +
    '<div class="mp-top" id="mp-top">' +
      '<a class="mp-ic" href="./" aria-label="Back to the arcade"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 2 4 8l6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></a>' +
      '<button class="mp-ic" id="mp-snd" type="button" aria-label="Sound"></button>' +
    '</div>' +
    '<div class="mp-ov" id="mp-menu">' +
      '<h1 class="mp-logo" aria-label="Mempool"><span>MEM</span><span class="mp-logo-b">POOL</span></h1>' +
      '<p class="mp-tag">Every transaction waits in the mempool. So here is the pool.</p>' +
      '<ul class="mp-how">' +
        '<li><i style="background:' + COL[2] + '"></i>Drag the floats into the pool before the whistle blows.</li>' +
        '<li><i style="background:' + COL[3] + '"></i>Each float has a fee on it. A full pool is a pool party: +50%.</li>' +
        '<li><i style="background:' + COL[4] + '"></i>A soggy RUG pays big, but it sinks every float touching it.</li>' +
      '</ul>' +
      '<button class="mp-btn mp-btn-main" id="mp-daily" type="button"><b>DAILY POOLS</b><small id="mp-daily-sub"></small><em id="mp-daily-tag"></em></button>' +
      '<button class="mp-btn" id="mp-endless" type="button"><b>ENDLESS</b><small>Three lives. The whistle gets faster and the pool must be fuller.</small><em id="mp-endless-best"></em></button>' +
      '<div class="mp-foot"><button class="mp-link" id="mp-lb-open" type="button">LEADERBOARD</button><a class="mp-link" href="./">MORE GAMES</a></div>' +
    '</div>' +
    '<div class="mp-ov mp-end" id="mp-end" hidden>' +
      '<div class="mp-end-kicker" id="mp-end-kicker"></div>' +
      '<div class="mp-end-score"><b id="mp-end-score">0</b><span>sats</span></div>' +
      '<div class="mp-end-best" id="mp-end-best"></div>' +
      '<canvas id="mp-end-chain" width="720" height="150"></canvas>' +
      '<dl class="mp-stats"><div><dt>Pools</dt><dd id="mp-s-blocks"></dd></div><div><dt>Avg fill</dt><dd id="mp-s-fill"></dd></div><div><dt>Parties</dt><dd id="mp-s-full"></dd></div><div><dt>Sunk</dt><dd id="mp-s-lost"></dd></div></dl>' +
      '<form class="mp-post" id="mp-post"><input id="mp-initials" maxlength="3" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="AAA" aria-label="Your initials"><button class="mp-btn mp-btn-sm" type="submit"><b>POST SCORE</b></button></form>' +
      '<div class="mp-note" id="mp-note"></div>' +
      '<div class="mp-row"><button class="mp-btn mp-btn-sm mp-btn-main" id="mp-share" type="button"><b>SHARE</b></button><button class="mp-btn mp-btn-sm" id="mp-again" type="button"><b id="mp-again-t">PLAY AGAIN</b></button></div>' +
      '<div class="mp-foot"><button class="mp-link" id="mp-end-lb" type="button">LEADERBOARD</button><button class="mp-link" id="mp-end-menu" type="button">MENU</button></div>' +
    '</div>' +
    '<div class="mp-ov mp-lb" id="mp-lb" hidden>' +
      '<h2>LEADERBOARD</h2>' +
      '<div class="mp-tabs"><button class="mp-tab" type="button" data-board="daily">TODAY</button><button class="mp-tab" type="button" data-board="endless">ENDLESS</button></div>' +
      '<ol class="mp-lb-list" id="mp-lb-list"></ol><div class="mp-note" id="mp-lb-note"></div>' +
      '<button class="mp-btn mp-btn-sm" id="mp-lb-close" type="button"><b>BACK</b></button>' +
    '</div>';
  document.body.appendChild(root);
  document.documentElement.classList.add('mp-on');
  var cv = $('#mp-cv'), ctx = cv.getContext('2d');

  // ---------- State ----------
  var G = null, attract = true, over = false, paused = false, manual = false, acc = 0, clock = 0, cameFrom = 'menu';
  var VW = 0, VH = 0, S = 1, OX = 0, UH = 1200, L = {};             // layout, in board units (720 wide)
  var drag = null, back = null, parts = [], pops = [], shake = 0, flash = 0, banner = null;
  var slotIn = [1, 1, 1], gone = [], gridIn = 1, scoreShown = 0, lastSec = -1, posted = false, botT = 0, endT = 0, lbBoard = 'daily';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Sound: a small synth, nothing to download ----------
  var AC = null, master = null, musicG = null, muted = store('sound') === '0', noiseBuf = null;
  var SND_ON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3v10L5 10H2z" fill="currentColor"/><path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.6 3.6a6 6 0 0 1 0 8.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  var SND_OFF = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6h3l4-3v10L5 10H2z" fill="currentColor"/><path d="m11 6 4 4m0-4-4 4" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  function sndIcon() { var b = $('#mp-snd'); b.innerHTML = muted ? SND_OFF : SND_ON; b.setAttribute('aria-pressed', muted ? 'false' : 'true'); }
  function audio() {
    if (!AC) {
      var K = window.AudioContext || window.webkitAudioContext; if (!K) return;
      AC = new K();
      master = AC.createGain(); master.gain.value = muted ? 0 : 0.55; master.connect(AC.destination);
      musicG = AC.createGain(); musicG.gain.value = 0.5; musicG.connect(master);
      noiseBuf = AC.createBuffer(1, AC.sampleRate * 0.5, AC.sampleRate);
      var d = noiseBuf.getChannelData(0); for (var n = 0; n < d.length; n++) d[n] = Math.random() * 2 - 1;
    }
    if (AC.state === 'suspended') AC.resume();
  }
  function tone(type, f0, f1, at, dur, vol, dest) {
    var o = AC.createOscillator(), g = AC.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, at); if (f1) o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(vol, at + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); g.connect(dest || master); o.start(at); o.stop(at + dur + 0.02);
  }
  function hiss(at, dur, vol, freq, type, dest) {
    var s = AC.createBufferSource(), f = AC.createBiquadFilter(), g = AC.createGain();
    s.buffer = noiseBuf; f.type = type || 'highpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    s.connect(f); f.connect(g); g.connect(dest || master); s.start(at); s.stop(at + dur + 0.02);
  }
  function midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  var sfx = {
    pick: function () { tone('sine', 520, 780, AC.currentTime, 0.06, 0.08); },
    place: function (tier) { var now = AC.currentTime, n = [60, 64, 67, 72, 55][tier] || 60; tone('triangle', midi(n), 0, now, 0.16, 0.2); tone('sine', midi(n - 24), midi(n - 31), now, 0.12, 0.3); hiss(now, 0.22, 0.2, 1400, 'lowpass'); hiss(now + 0.03, 0.12, 0.07, 4000); },
    bad: function () { var now = AC.currentTime; tone('square', 140, 90, now, 0.12, 0.08); },
    rug: function () { var now = AC.currentTime; tone('sine', 300, 70, now, 0.45, 0.3); [0.1, 0.2, 0.28, 0.38].forEach(function (d, i) { tone('sine', 500 + i * 90, 900 + i * 90, now + d, 0.06, 0.08); }); hiss(now, 0.3, 0.14, 600, 'lowpass'); },
    gone: function () { tone('sine', 700, 300, AC.currentTime, 0.14, 0.05); },
    tick: function (k) { tone('square', k ? 1320 : 990, 0, AC.currentTime, 0.04, 0.05); },
    mine: function (b) {
      var now = AC.currentTime; tone('square', 2750, 2950, now, 0.16, 0.045); tone('square', 2750, 2950, now + 0.2, 0.34, 0.045); hiss(now, 0.5, 0.05, 2800, 'bandpass'); tone('sine', 120, 38, now, 0.5, 0.45);
      var notes = b.orphan ? [60, 57, 53, 48] : b.full ? [60, 64, 67, 72, 76, 79, 84] : b.mult > 1 ? [60, 64, 67, 72, 76] : [60, 64, 67];
      notes.forEach(function (n, i) { tone(b.orphan ? 'sawtooth' : 'square', midi(n + 12), 0, now + 0.12 + i * 0.07, 0.22, 0.06); });
    },
    over: function () { var now = AC.currentTime; [72, 76, 79, 84, 88].forEach(function (n, i) { tone('triangle', midi(n), 0, now + i * 0.11, 0.5, 0.12); }); }
  };
  function play(name, a) { if (AC && !muted && !attract && AC.state === 'running') try { sfx[name](a); } catch (e) { /* no sound */ } }
  function buzz(p) { if (!attract && navigator.vibrate) try { navigator.vibrate(p); } catch (e) { /* no haptics */ } }
  // Music: a loop made in code. It speeds up with every block, and the last five seconds add a pulse.
  var music = { on: false, step: 0, next: 0, timer: 0 };
  var ROOTS = [45, 45, 41, 43], ARP = [0, 7, 12, 15, 12, 7, 19, 12];
  function musicTick() {
    if (!AC || !music.on) return;
    var bpm = 96 + (G && !attract ? Math.min(G.block, 12) * 4 : 0), d16 = 60 / bpm / 4;
    var urgent = G && !attract && !over && G.wait === 0 && G.time <= 5 * TPS;
    while (music.next < AC.currentTime + 0.12) {
      var s = music.step % 16, bar = (music.step >> 4) % 4, root = ROOTS[bar], at = Math.max(music.next, AC.currentTime + 0.01);
      if (s === 0 || s === 8 || (urgent && (s === 4 || s === 12))) tone('sine', 110, 40, at, 0.22, 0.5, musicG);
      if (s % 4 === 2) hiss(at, 0.05, 0.1, 6000, 'highpass', musicG);
      if (urgent && s % 2 === 1) hiss(at, 0.03, 0.06, 8000, 'highpass', musicG);
      if (s === 4 || s === 12) hiss(at, 0.12, 0.13, 1800, 'bandpass', musicG);
      if ([0, 3, 6, 8, 11, 14].indexOf(s) >= 0) tone('triangle', midi(root - 12 + (s === 6 || s === 14 ? 7 : 0)), 0, at, d16 * 1.8, 0.28, musicG);
      if (s % 2 === 0) tone('square', midi(root + 12 + ARP[(s >> 1) % 8]), 0, at, d16 * 1.5, urgent ? 0.05 : 0.032, musicG);
      if (urgent && s % 4 === 0) tone('sawtooth', midi(root + 24), 0, at, d16 * 0.9, 0.035, musicG);
      music.next = at + d16; music.step++;
    }
  }
  function startMusic() { if (!AC || music.on) return; music.on = true; music.step = 0; music.next = AC.currentTime + 0.05; music.timer = setInterval(musicTick, 25); }
  function stopMusic() { music.on = false; clearInterval(music.timer); }
  function setMuted(m) { muted = m; store('sound', m ? '0' : '1'); if (master) master.gain.value = m ? 0 : 0.55; sndIcon(); }

  // ---------- Layout ----------
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    VW = window.innerWidth; VH = window.innerHeight;
    cv.width = Math.round(VW * dpr); cv.height = Math.round(VH * dpr); cv.style.width = VW + 'px'; cv.style.height = VH + 'px';
    S = Math.min(VW / 720, VH / 1200); UH = VH / S; OX = (VW - 720 * S) / 2;
    var extra = UH - 1200;
    L.cell = 90; L.gx = 45; L.gy = 236 + extra * 0.4; L.gw = W * L.cell;
    L.chainY = 100 + extra * 0.15; L.barY = L.gy - 48;
    L.infoY = L.gy + L.gw + 34;
    L.trayY = UH - 290 - extra * 0.12; L.slotW = 216; L.slotH = 196; L.slotX = [24, 252, 480];
    L.mine = { x: 150, y: L.trayY + L.slotH + 16, w: 420, h: 58 };
    root.style.setProperty('--board-w', Math.round(720 * S) + 'px');
    cv.dpr = dpr;
  }
  function toBoard(e) { var r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left - OX) / S, y: (e.clientY - r.top) / S }; }

  // ---------- Runs ----------
  function dailyDone() { try { return JSON.parse(store('daily.' + today) || 'null'); } catch (e) { return null; } }
  function menu() {
    attract = true; over = false; drag = null; banner = null;
    G = C.create({ mode: 'endless', seed: 'demo' + Math.random().toString(36).slice(2, 8) });
    scoreShown = 0;
    var d = dailyDone();
    $('#mp-daily-sub').textContent = d ? 'Done for today: ' + fmt(d.score) + ' sats. Tap to see it.' : 'Six pools. The same floats for everybody.';
    $('#mp-daily-tag').textContent = todayLabel;
    var best = +store('best.endless') || 0;
    $('#mp-endless-best').textContent = best ? 'BEST ' + short(best) : '';
    $('#mp-menu').hidden = false; $('#mp-end').hidden = true; $('#mp-lb').hidden = true;
    root.classList.remove('mp-playing');
  }
  function start(mode) {
    audio();
    var d = mode === 'daily' && !DEBUG ? dailyDone() : null;
    if (d) { showSaved(d); return; }
    attract = false; over = false; drag = null; parts = []; pops = []; gone = []; banner = null; posted = false; endT = 0; acc = 0; lastSec = -1;
    G = C.create({ mode: mode, seed: mode === 'daily' ? today : Math.random().toString(36).slice(2, 10) });
    scoreShown = 0; slotIn = [0, 0, 0]; gridIn = 0;
    $('#mp-menu').hidden = true; $('#mp-end').hidden = true; $('#mp-lb').hidden = true;
    root.classList.add('mp-playing');
    say(mode === 'daily' ? 'POOL 1 OF ' + R.dailyBlocks : 'POOL 1', 'Fill it before the whistle blows', CYAN);
    startMusic();
  }
  // Today's daily was already played in this browser: show that result again.
  function showSaved(d) {
    var R2 = C.decode(d.code), G2 = R2 && C.replay(R2);
    if (!G2) { store('daily.' + today, ''); start('daily'); return; }
    G = G2; attract = false; over = true; posted = !!d.posted;
    root.classList.remove('mp-playing');
    endCard(true);
  }
  function summary(g) {
    var fill = 0, full = 0, lost = 0, ok = 0;
    g.blocks.forEach(function (b) { fill += b.fill; if (b.full) full++; lost += b.lost; if (!b.orphan) ok++; });
    return { blocks: g.blocks.length, ok: ok, fill: g.blocks.length ? fill / g.blocks.length : 0, full: full, lost: lost };
  }
  function finish() {
    over = true; stopMusic(); play('over'); root.classList.remove('mp-playing');
    if (G.mode === 'daily') { if (!dailyDone()) store('daily.' + today, JSON.stringify({ score: G.score, code: C.encode(G) })); }
    else if (G.score > (+store('best.endless') || 0)) { store('best.endless', G.score); G.newBest = true; }
    endCard(false);
  }
  function endCard(saved) {
    var s = summary(G), daily = G.mode === 'daily';
    $('#mp-end-kicker').textContent = daily ? 'DAILY POOLS · ' + todayLabel : 'ENDLESS · ' + s.ok + ' POOL' + (s.ok === 1 ? '' : 'S') + ' FILLED';
    $('#mp-end-score').textContent = fmt(G.score);
    $('#mp-end-best').textContent = daily ? (saved ? 'Your run for today. New floats arrive at midnight UTC.' : 'That is your run for today. Come back tomorrow for new floats.') : G.newBest ? 'NEW BEST' : 'Best ' + fmt(+store('best.endless') || 0);
    $('#mp-s-blocks').textContent = s.blocks; $('#mp-s-fill').textContent = Math.round(s.fill * 100) + '%';
    $('#mp-s-full').textContent = s.full; $('#mp-s-lost').textContent = short(s.lost);
    $('#mp-again-t').textContent = daily ? 'PLAY ENDLESS' : 'PLAY AGAIN';
    $('#mp-post').hidden = posted || G.score <= 0; $('#mp-note').textContent = posted ? 'Score posted.' : '';
    $('#mp-initials').value = store('ini') || '';
    var c = $('#mp-end-chain'), g = c.getContext('2d'), show = G.blocks.slice(-8), sz = 72, gap = 14, x0 = (720 - (show.length * sz + (show.length - 1) * gap)) / 2;
    g.clearRect(0, 0, 720, 150);
    show.forEach(function (b, k) {
      var x = x0 + k * (sz + gap);
      if (k) { g.fillStyle = 'rgba(214,222,255,0.35)'; g.fillRect(x - gap, 24 + sz / 2 - 2, gap, 4); }
      thumb(g, b, x, 24, sz);
      g.fillStyle = b.orphan ? '#ff5470' : b.full ? COL[2] : MUTE; g.font = '800 17px ' + MONO; g.textAlign = 'center';
      g.fillText(b.orphan ? 'CLOSED' : Math.round(b.fill * 100) + '%', x + sz / 2, 24 + sz + 26);
    });
    $('#mp-end').hidden = false; $('#mp-menu').hidden = true; $('#mp-lb').hidden = true;
  }

  // ---------- Leaderboard ----------
  function boardId(m) { return m === 'daily' ? 'mp-daily-' + today : 'mp-endless'; }
  function openBoard(m, from) {
    if (from) cameFrom = from;
    lbBoard = m;
    root.querySelectorAll('.mp-tab').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-board') === m); });
    var list = $('#mp-lb-list'), note = $('#mp-lb-note');
    list.innerHTML = ''; note.textContent = 'Loading...';
    $('#mp-lb').hidden = false; $('#mp-menu').hidden = true; $('#mp-end').hidden = true;
    api('/mp/scores?board=' + boardId(m) + '&limit=10').then(function (j) {
      if (lbBoard !== m) return;
      note.textContent = j.top.length ? '' : m === 'daily' ? 'Nobody has posted today. Be the first.' : 'No scores yet. Be the first.';
      j.top.forEach(function (row, k) {
        var li = document.createElement('li');
        li.innerHTML = '<span></span><b></b><em></em><i></i>';
        li.children[0].textContent = k + 1; li.children[1].textContent = row.initials; li.children[2].textContent = fmt(row.score); li.children[3].textContent = row.day + (row.day === 1 ? ' pool' : ' pools');
        list.appendChild(li);
      });
    }, function () { if (lbBoard === m) note.textContent = 'The leaderboard is offline right now.'; });
  }
  function postScore() {
    var ini = $('#mp-initials').value.toUpperCase(), note = $('#mp-note');
    if (!/^[A-Z]{3}$/.test(ini)) { note.textContent = 'Three letters, please.'; return; }
    store('ini', ini); note.textContent = 'Posting...';
    api('/mp/scores', { code: C.encode(G), initials: ini }).then(function (j) {
      posted = true; $('#mp-post').hidden = true; note.textContent = 'Posted. You are #' + j.rank + (G.mode === 'daily' ? ' today.' : ' on the endless board.');
      if (G.mode === 'daily') { var d = dailyDone(); if (d) { d.posted = true; store('daily.' + today, JSON.stringify(d)); } }
    }, function (e) { note.textContent = /initials|slow|old/.test(e.message) ? 'The server says: ' + e.message + '.' : 'Could not reach the leaderboard. Try again in a bit.'; });
  }

  // ---------- Sharing ----------
  function squares(g) { return g.blocks.map(function (b) { return b.orphan ? '⬛' : b.full ? '🟩' : b.fill >= R.fatFill ? '🟨' : b.fill >= 0.75 ? '🟧' : '🟥'; }).join(''); }
  function shareText() {
    var s = summary(G);
    return (G.mode === 'daily' ? 'Mempool 🏊 ' + todayLabel : 'Mempool 🏊 Endless') + '\n' + fmt(G.score) + ' sats · ' + Math.round(s.fill * 100) + '% full\n' + squares(G).slice(0, 60) + '\n';
  }
  function shareCard() {
    var c = document.createElement('canvas'); c.width = 1200; c.height = 675;
    var g = c.getContext('2d'), s = summary(G), daily = G.mode === 'daily';
    var bg = g.createLinearGradient(0, 0, 1200, 675); bg.addColorStop(0, '#0b1f36'); bg.addColorStop(1, '#050b16');
    g.fillStyle = bg; g.fillRect(0, 0, 1200, 675);
    g.strokeStyle = 'rgba(120,140,255,0.07)'; g.lineWidth = 1;
    for (var x = 0; x <= 1200; x += 48) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 675); g.stroke(); }
    for (var y = 0; y <= 675; y += 48) { g.beginPath(); g.moveTo(0, y); g.lineTo(1200, y); g.stroke(); }
    g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    g.font = '800 64px ' + MONO; g.fillStyle = '#fff'; g.fillText('MEM', 60, 110);
    g.fillStyle = CYAN; g.shadowColor = CYAN; g.shadowBlur = 28; g.fillText('POOL', 60 + g.measureText('MEM').width, 110); g.shadowBlur = 0;
    g.font = '800 24px ' + MONO; g.fillStyle = MUTE; g.textAlign = 'right';
    g.fillText(daily ? 'DAILY POOLS · ' + todayLabel + ' ' + today.slice(0, 4) : 'ENDLESS', 1140, 100);
    g.textAlign = 'left'; g.font = '800 132px ' + MONO; g.fillStyle = '#fff'; g.fillText(fmt(G.score), 56, 280);
    var sw = g.measureText(fmt(G.score)).width; g.font = '800 40px ' + MONO; g.fillStyle = COL[2]; g.fillText('sats', 76 + sw, 280);
    g.font = '600 30px "Space Grotesk", system-ui, sans-serif'; g.fillStyle = 'rgba(232,236,255,0.86)';
    g.fillText(s.blocks + ' pools · ' + Math.round(s.fill * 100) + '% full on average · ' + s.full + ' pool part' + (s.full === 1 ? 'y' : 'ies'), 60, 336);
    var show = G.blocks.slice(-6), sz = 150, gap = 36, x0 = 60;
    show.forEach(function (b, k) {
      var bx = x0 + k * (sz + gap);
      if (k) { g.fillStyle = 'rgba(214,222,255,0.4)'; g.fillRect(bx - gap, 390 + sz / 2 - 3, gap, 6); }
      thumb(g, b, bx, 390, sz);
      g.font = '800 24px ' + MONO; g.textAlign = 'center'; g.fillStyle = b.orphan ? '#ff5470' : b.full ? COL[2] : MUTE;
      g.fillText(b.orphan ? 'CLOSED' : b.full ? 'PARTY' : Math.round(b.fill * 100) + '%', bx + sz / 2, 390 + sz + 36);
    });
    g.textAlign = 'right'; g.font = '800 30px ' + MONO; g.fillStyle = '#fff'; g.fillText('proofoffight.com/mempool', 1140, 640);
    g.textAlign = 'left'; g.font = '600 24px "Space Grotesk", system-ui, sans-serif'; g.fillStyle = MUTE; g.fillText('Pack the pool. Take the fees.', 60, 640);
    return c;
  }
  function share() {
    var text = shareText(), url = 'https://proofoffight.com/mempool/', note = $('#mp-note');
    shareCard().toBlob(function (blob) {
      var file = null;
      try { file = new File([blob], 'mempool.png', { type: 'image/png' }); } catch (e) { /* old browser */ }
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], text: text + url }).catch(function () { /* closed */ }); return; }
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mempool.png'; a.click();
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text + url).then(function () { note.textContent = 'Picture saved and the score text copied. Paste it in a post.'; }, function () { note.textContent = 'Picture saved.'; });
      else note.textContent = 'Picture saved.';
    }, 'image/png');
  }

  // ---------- Input ----------
  function slotAt(p) { for (var s = 0; s < 3; s++) if (p.x >= L.slotX[s] && p.x <= L.slotX[s] + L.slotW && p.y >= L.trayY - 10 && p.y <= L.trayY + L.slotH + 6) return s; return -1; }
  function dropCell(d) {
    var sh = C.SHAPES[d.tx.shape];
    return { x: Math.round((d.x - sh.w * L.cell / 2 - L.gx) / L.cell), y: Math.round((d.y - d.lift - sh.h * L.cell / 2 - L.gy) / L.cell) };
  }
  function down(e) {
    if (attract || over || !G || G.wait > 0) return;
    audio();
    var p = toBoard(e), m = L.mine;
    if (p.x >= m.x && p.x <= m.x + m.w && p.y >= m.y - 6 && p.y <= m.y + m.h + 6) { if (G.filled > 0) C.mineNow(G); return; }
    var s = slotAt(p);
    if (s < 0 || !G.slots[s].tx) return;
    e.preventDefault();
    drag = { slot: s, tx: G.slots[s].tx, x: p.x, y: p.y, lift: e.pointerType === 'mouse' ? 0 : 150, t: 0, id: e.pointerId };
    try { cv.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
    play('pick');
  }
  function move(e) { if (drag && e.pointerId === drag.id) { var p = toBoard(e); drag.x = p.x; drag.y = p.y; } }
  function up(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag, c = dropCell(d); drag = null;
    if (G.slots[d.slot].tx === d.tx && C.place(G, d.slot, c.x, c.y)) return;
    if (d.y - d.lift < L.gy + L.gw + 40 && d.t > 0.12) { play('bad'); buzz(30); }
    back = { tx: d.tx, slot: d.slot, x: d.x, y: d.y - d.lift, t: 0 };
  }

  // ---------- The loop ----------
  function say(big, small, color) { banner = { big: big, small: small || '', color: color || '#fff', t: 0 }; }
  function pop(text, x, y, color, size) { pops.push({ text: text, x: clamp(x, 110, 610), y: y, t: 0, color: color, size: size || 1 }); }
  function burst(x, y, n, color, speed) { for (var k = 0; k < n; k++) { var a = Math.random() * 6.283, v = speed * (0.3 + Math.random()); parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 0.4 + Math.random() * 0.5, c: color, s: 5 + Math.random() * 9 }); } }
  function txCenter(tx, x, y) { var sh = C.SHAPES[tx.shape]; return { x: L.gx + (x + sh.w / 2) * L.cell, y: L.gy + (y + sh.h / 2) * L.cell }; }
  function events() {
    for (var k = 0; k < G.events.length; k++) {
      var e = G.events[k], c;
      if (e.t === 'place') {
        c = txCenter(e.tx, e.x, e.y);
        var dead = C.rugged(G), me = G.placed.length - 1;
        if (!attract) {
          burst(c.x, c.y, 12 + e.tx.tier * 4, k % 2 ? '#dff6ff' : '#8fe6ff', 300);
          if (dead[me]) { pop('SUNK', c.x, c.y, '#ff9a7a', 1.1); play('rug'); buzz([20, 40, 20]); }
          else { pop('+' + fmt(e.tx.fee), c.x, c.y, COL[e.tx.tier], e.tx.tier >= 3 ? 1.3 : 1); play('place', e.tx.tier); buzz(12); }
          if (e.tx.rug) { var hit = 0; G.placed.forEach(function (p, j) { if (j !== me && dead[j] && near(p, G.placed[me])) hit++; }); if (hit) { play('rug'); shake = 10; } }
        }
      } else if (e.t === 'arrive') slotIn[e.slot] = 0;
      else if (e.t === 'expire') { gone.push({ tx: e.tx, slot: e.slot, t: 0 }); if (drag && drag.tx === e.tx) drag = null; play('gone'); }
      else if (e.t === 'mine') {
        drag = null; flash = e.block.orphan ? 0 : e.block.full ? 1 : 0.5; shake = e.block.full ? 22 : 10;
        if (!attract) {
          play('mine', e.block); buzz(e.block.full ? [30, 30, 60] : 30);
          if (e.block.orphan) say('POOL CLOSED', 'Under ' + Math.round(C.target(e.block.no) * 100) + '% full. ' + G.lives + (G.lives === 1 ? ' life' : ' lives') + ' left', '#ff5470');
          else if (e.block.full) say('POOL PARTY', '+50% · ' + fmt(e.block.pay) + ' sats', COL[2]);
          else if (e.block.mult > 1) say('PACKED', '+20% · ' + fmt(e.block.pay) + ' sats', CYAN);
          else say('+' + fmt(e.block.pay), Math.round(e.block.fill * 100) + '% full', '#fff');
          if (e.block.full) for (var cf = 0; cf < 4; cf++) burst(L.gx + L.gw / 2, L.gy + L.gw / 2, 24, COL[cf], 760);
        }
      } else if (e.t === 'open') { gridIn = 0; lastSec = -1; }
      else if (e.t === 'over') endT = 0.9;
    }
    G.events.length = 0;
  }
  function near(a, b) {
    var A = C.SHAPES[a.tx.shape].cells, B = C.SHAPES[b.tx.shape].cells;
    for (var i = 0; i < A.length; i++) for (var j = 0; j < B.length; j++) if (Math.abs(a.x + A[i][0] - b.x - B[j][0]) + Math.abs(a.y + A[i][1] - b.y - B[j][1]) === 1) return true;
    return false;
  }
  function tick(dt) {
    clock += dt;
    if (G && G.state === 'play' && !(over && !attract)) {
      acc += dt;
      var guard = 0;
      while (acc >= 1 / TPS && guard++ < 10) {
        acc -= 1 / TPS;
        if ((attract || AUTO) && G.wait === 0 && ++botT >= (attract ? 22 : 14)) { var m = C.bot(G, 'sharp'); if (m) { botT = 0; if (m.mine) C.mineNow(G); else C.place(G, m.slot, m.x, m.y); } }
        C.step(G); events();
      }
      if (acc > 0.3) acc = 0;
      if (!attract && G.wait === 0) { var sec = Math.ceil(G.time / TPS); if (sec !== lastSec) { if (sec <= 5 && sec > 0 && lastSec !== -1) play('tick', sec <= 2); lastSec = sec; } }
    }
    if (attract && G.state === 'over') menu();
    if (endT > 0 && !attract) { endT -= dt; if (endT <= 0) finish(); }
    if (drag) drag.t += dt;
    if (back) { back.t += dt; if (back.t > 0.16) back = null; }
    for (var s = 0; s < 3; s++) slotIn[s] = Math.min(1, slotIn[s] + dt * 5);
    gridIn = Math.min(1, gridIn + dt * 3.5);
    shake = Math.max(0, shake - dt * 60); flash = Math.max(0, flash - dt * 2.2);
    scoreShown += (G.score - scoreShown) * Math.min(1, dt * 7); if (Math.abs(G.score - scoreShown) < 1) scoreShown = G.score;
    var k;
    for (k = parts.length - 1; k >= 0; k--) { var p = parts[k]; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 900 * dt; if (p.t > p.life) parts.splice(k, 1); }
    for (k = pops.length - 1; k >= 0; k--) { pops[k].t += dt; if (pops[k].t > 0.9) pops.splice(k, 1); }
    for (k = gone.length - 1; k >= 0; k--) { gone[k].t += dt; if (gone[k].t > 0.4) gone.splice(k, 1); }
    if (banner) { banner.t += dt; if (banner.t > 1.7) banner = null; }
    draw();
  }
  var last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000 || 0); last = now;
    if (!paused && !manual) tick(dt);
  }

  // ---------- Drawing ----------
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  // The outline of a float: its cells joined, with round outside corners.
  function floatPath(g, sh, has, x0, y0, cell, inset, rad) {
    g.beginPath();
    for (var k = 0; k < sh.cells.length; k++) {
      var cx = sh.cells[k][0], cy = sh.cells[k][1];
      var l = has[(cx - 1) + ',' + cy], r = has[(cx + 1) + ',' + cy], t = has[cx + ',' + (cy - 1)], b = has[cx + ',' + (cy + 1)];
      var x = x0 + cx * cell + (l ? 0 : inset), y = y0 + cy * cell + (t ? 0 : inset), x2 = x0 + (cx + 1) * cell + (r ? 0.5 : -inset), y2 = y0 + (cy + 1) * cell + (b ? 0.5 : -inset);
      var tl = !l && !t ? rad : 0, tr = !r && !t ? rad : 0, br = !r && !b ? rad : 0, bl = !l && !b ? rad : 0;
      g.moveTo(x + tl, y); g.lineTo(x2 - tr, y); if (tr) g.arcTo(x2, y, x2, y + tr, tr);
      g.lineTo(x2, y2 - br); if (br) g.arcTo(x2, y2, x2 - br, y2, br);
      g.lineTo(x + bl, y2); if (bl) g.arcTo(x, y2, x, y2 - bl, bl);
      g.lineTo(x, y + tl); if (tl) g.arcTo(x, y, x + tl, y, tl);
      g.closePath();
    }
  }
  // One transaction, as a pool float: an inflatable in the color of its fee. A single cell is a swim ring,
  // the 3 x 3 is a whale, and a rug is a rug. o.dead: sunk by a rug.
  function drawTx(g, tx, x0, y0, cell, o) {
    o = o || {};
    var sh = C.SHAPES[tx.shape], dead = !!o.dead, col = dead ? COL[5] : COL[tx.tier], rug = tx.rug, inset = cell * 0.07, rad = rug ? cell * 0.09 : cell * 0.34, has = {}, k, px, py;
    for (k = 0; k < sh.cells.length; k++) has[sh.cells[k][0] + ',' + sh.cells[k][1]] = 1;
    g.save(); g.globalAlpha *= (o.alpha === undefined ? 1 : o.alpha) * (dead ? 0.72 : 1);
    if (o.glow) { g.shadowColor = col; g.shadowBlur = o.glow; } else if (!dead) { g.shadowColor = 'rgba(0,34,66,0.6)'; g.shadowBlur = cell * 0.16; }
    floatPath(g, sh, has, x0, y0, cell, inset, rad);
    g.fillStyle = col; g.fill(); g.shadowBlur = 0;
    g.strokeStyle = dead ? 'rgba(255,255,255,0.16)' : 'rgba(0,20,40,0.26)'; g.lineWidth = Math.max(1, cell * 0.035); g.stroke();   // the seams
    for (k = 0; k < sh.cells.length; k++) {
      px = x0 + sh.cells[k][0] * cell; py = y0 + sh.cells[k][1] * cell;
      var top = !has[sh.cells[k][0] + ',' + (sh.cells[k][1] - 1)], bot = !has[sh.cells[k][0] + ',' + (sh.cells[k][1] + 1)];
      if (rug) {
        if (!dead) { g.fillStyle = '#f3dcab'; g.save(); g.translate(px + cell / 2, py + cell / 2); g.rotate(Math.PI / 4); g.fillRect(-cell * 0.11, -cell * 0.11, cell * 0.22, cell * 0.22); g.restore(); }
        g.strokeStyle = dead ? 'rgba(255,255,255,0.2)' : '#f3dcab'; g.lineWidth = Math.max(1, cell * 0.03);
        for (var f = 0; f < 5; f++) {                                // the fringe
          var fx = px + cell * (0.18 + f * 0.16);
          if (top) { g.beginPath(); g.moveTo(fx, py + inset); g.lineTo(fx, py - cell * 0.02); g.stroke(); }
          if (bot) { g.beginPath(); g.moveTo(fx, py + cell - inset); g.lineTo(fx, py + cell + cell * 0.02); g.stroke(); }
        }
        continue;
      }
      if (dead) continue;
      if (tx.tier === 0) { g.fillStyle = 'rgba(70,150,255,0.32)'; g.fillRect(px + cell * 0.26, py + cell * 0.16, cell * 0.13, cell * 0.68); g.fillRect(px + cell * 0.61, py + cell * 0.16, cell * 0.13, cell * 0.68); }
      if (top) { g.fillStyle = 'rgba(255,255,255,0.6)'; rr(g, px + cell * 0.22, py + inset + cell * 0.07, cell * 0.56, cell * 0.085, cell * 0.04); g.fill(); }
      else { g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.ellipse(px + cell * 0.3, py + cell * 0.24, cell * 0.1, cell * 0.05, -0.5, 0, 6.3); g.fill(); }
      if (bot) { g.fillStyle = 'rgba(0,20,40,0.13)'; rr(g, px + cell * 0.2, py + cell - inset - cell * 0.15, cell * 0.6, cell * 0.08, cell * 0.04); g.fill(); }
    }
    if (rug) { floatPath(g, sh, has, x0, y0, cell, cell * 0.17, cell * 0.04); g.strokeStyle = dead ? 'rgba(255,255,255,0.2)' : 'rgba(243,220,171,0.85)'; g.lineWidth = Math.max(1, cell * 0.03); g.stroke(); }
    if (sh.kind === 'dust' && !rug) {                              // a swim ring: you can see the water through it
      g.fillStyle = DEEP; g.beginPath(); g.arc(x0 + cell / 2, y0 + cell / 2, cell * 0.17, 0, 6.3); g.fill();
      g.strokeStyle = 'rgba(0,20,40,0.3)'; g.lineWidth = Math.max(1, cell * 0.035); g.stroke();
    }
    if (sh.kind === 'whale' && !dead) {
      var ex = x0 + cell * 2.3, ey = y0 + cell * 0.95;
      g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.ellipse(x0 + cell * 1.5, y0 + cell * 2.25, cell * 1.1, cell * 0.42, 0, 0, 6.3); g.fill();     // belly
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, cell * 0.17, 0, 6.3); g.fill();
      g.fillStyle = '#10182c'; g.beginPath(); g.arc(ex + cell * 0.04, ey + cell * 0.02, cell * 0.09, 0, 6.3); g.fill();
      g.strokeStyle = '#10182c'; g.lineWidth = Math.max(1.5, cell * 0.05); g.lineCap = 'round';
      g.beginPath(); g.arc(x0 + cell * 2.2, y0 + cell * 1.45, cell * 0.42, 0.25, 1.75); g.stroke();                                                        // smile
      g.fillStyle = 'rgba(16,24,44,0.55)'; g.beginPath(); g.ellipse(x0 + cell * 1.2, y0 + cell * 0.42, cell * 0.12, cell * 0.06, 0, 0, 6.3); g.fill();    // blowhole
      g.fillStyle = '#fff';
      for (k = 0; k < 3; k++) { var sp = (clock * 1.4 + k / 3) % 1; g.globalAlpha *= 1; g.beginPath(); g.arc(x0 + cell * (1.2 + (k - 1) * 0.16 * sp * 2), y0 + cell * (0.3 - sp * 0.42), cell * 0.06 * (1 - sp * 0.5), 0, 6.3); g.fill(); }
    }
    if (o.label && !(sh.kind === 'dust' && !rug)) {
      // the fee, on the cell nearest the middle
      var mx = 0, my = 0, bestK = 0, bd = 1e9;
      for (k = 0; k < sh.cells.length; k++) { mx += sh.cells[k][0]; my += sh.cells[k][1]; }
      mx /= sh.cells.length; my /= sh.cells.length;
      for (k = 0; k < sh.cells.length; k++) { var dd = Math.abs(sh.cells[k][0] - mx) + Math.abs(sh.cells[k][1] - my); if (dd < bd) { bd = dd; bestK = k; } }
      if (sh.kind === 'whale') bestK = 3;
      var txt = dead ? '0' : rug ? 'RUG' : short(tx.fee);
      g.font = '800 ' + Math.round(cell * (txt.length > 3 ? 0.27 : 0.31)) + 'px ' + MONO; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = dead ? 'rgba(255,255,255,0.6)' : rug ? '#fff3d6' : 'rgba(6,9,18,0.86)';
      if (rug && !dead) { g.lineWidth = cell * 0.09; g.strokeStyle = '#5e2415'; g.lineJoin = 'round'; g.strokeText(txt, x0 + (sh.cells[bestK][0] + 0.5) * cell, y0 + (sh.cells[bestK][1] + 0.5) * cell + 1); }
      g.fillText(txt, x0 + (sh.cells[bestK][0] + 0.5) * cell, y0 + (sh.cells[bestK][1] + 0.5) * cell + 1);
    }
    g.restore();
  }
  // A finished pool, small: for the chain, the end card and the share picture.
  function thumb(g, b, x, y, size) {
    var c = size / W;
    g.fillStyle = b.orphan ? '#1c2c3a' : WATER; rr(g, x - 3, y - 3, size + 6, size + 6, size * 0.08); g.fill();
    for (var k = 0; k < b.cells.length; k++) {
      var t = b.cells[k]; if (t < 0) continue;
      g.fillStyle = b.orphan ? '#44566a' : COL[t];
      rr(g, x + (k % W) * c + 0.5, y + ((k / W) | 0) * c + 0.5, c - 1, c - 1, c * 0.25); g.fill();
    }
    g.lineWidth = Math.max(2, size * 0.035); g.strokeStyle = b.orphan ? '#ff5470' : b.full ? COL[2] : '#d9f3fb';
    rr(g, x - 3, y - 3, size + 6, size + 6, size * 0.08); g.stroke();
  }
  function draw() {
    var dpr = cv.dpr, g = ctx, k, s;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    var bg = g.createLinearGradient(0, 0, 0, VH); bg.addColorStop(0, '#0b1a2c'); bg.addColorStop(1, '#050b16');
    g.fillStyle = bg; g.fillRect(0, 0, VW, VH);
    // the deck, at night: tiles, and the pool's light on them
    var tile = 72 * S, tx0 = (VW / 2) % tile;
    g.fillStyle = 'rgba(190,225,255,0.045)';
    for (var dx = tx0 - tile; dx < VW; dx += tile) g.fillRect(dx, 0, 1.5, VH);
    for (var dy = 0; dy < VH; dy += tile) g.fillRect(0, dy, VW, 1.5);
    if (G && L.gy) {
      var lx = VW / 2, ly = (L.gy + L.gw / 2) * S, lg = g.createRadialGradient(lx, ly, L.gw * S * 0.4, lx, ly, L.gw * S * 1.05);
      lg.addColorStop(0, 'rgba(40,200,255,' + (0.2 + 0.03 * Math.sin(clock * 1.7)) + ')'); lg.addColorStop(1, 'rgba(40,200,255,0)');
      g.fillStyle = lg; g.fillRect(0, 0, VW, VH);
    }
    if (!G) return;
    var sx = shake ? (Math.random() - 0.5) * shake * S : 0, sy = shake ? (Math.random() - 0.5) * shake * S : 0;
    g.setTransform(dpr * S, 0, 0, dpr * S, dpr * (OX + sx), dpr * sy);
    if (attract) g.globalAlpha = 0.6;
    var mining = G.wait > 0, mp = mining ? 1 - (G.wait - acc * TPS) / R.between : 0, v = C.worth(G);

    // --- top: block number, score, lives ---
    if (!attract) {
      g.textBaseline = 'middle'; g.textAlign = 'center';
      g.font = '800 46px ' + MONO; g.fillStyle = '#fff'; g.fillText(fmt(scoreShown), 360, 44);
      g.font = '800 15px ' + MONO; g.fillStyle = MUTE; g.fillText('SATS', 360, 78);
      g.textAlign = 'left'; g.font = '800 17px ' + MONO; g.fillStyle = MUTE;
      g.fillText('POOL', 118, 34); g.fillStyle = '#fff'; g.font = '800 24px ' + MONO;
      g.fillText(G.mode === 'daily' ? Math.min(G.block + 1, R.dailyBlocks) + '/' + R.dailyBlocks : String(G.block + 1), 118, 60);
      if (G.mode === 'endless') {
        g.textAlign = 'right'; g.font = '800 17px ' + MONO; g.fillStyle = MUTE; g.fillText('LIVES', 602, 34);
        for (k = 0; k < R.lives; k++) { g.fillStyle = k < G.lives ? '#ff5470' : 'rgba(255,255,255,0.14)'; rr(g, 602 - (k + 1) * 26, 49, 20, 20, 5); g.fill(); }
      } else { g.textAlign = 'right'; g.font = '800 17px ' + MONO; g.fillStyle = MUTE; g.fillText('DAILY', 602, 34); g.fillStyle = '#fff'; g.font = '800 24px ' + MONO; g.fillText(todayLabel, 602, 60); }
    }

    // --- the chain: blocks already mined ---
    var n = G.mode === 'daily' ? R.dailyBlocks : 6, tz = 62, tg = 28, cx0 = 360 - (n * tz + (n - 1) * tg) / 2, first = G.mode === 'daily' ? 0 : Math.max(0, G.blocks.length - n + (mining ? 0 : 1));
    var landing = null;
    for (k = 0; k < n; k++) {
      var bx = cx0 + k * (tz + tg), b = G.blocks[first + k];
      if (k) { g.fillStyle = 'rgba(214,222,255,0.22)'; g.fillRect(bx - tg + 3, L.chainY + tz / 2 - 2, tg - 6, 4); }
      if (b && !(mining && first + k === G.blocks.length - 1 && mp < 1)) thumb(g, b, bx, L.chainY, tz);
      else {
        g.strokeStyle = 'rgba(214,222,255,0.2)'; g.lineWidth = 2; g.setLineDash([6, 6]); rr(g, bx - 3, L.chainY - 3, tz + 6, tz + 6, 6); g.stroke(); g.setLineDash([]);
        if (b) landing = { x: bx, y: L.chainY };
      }
    }

    // --- the timer ---
    var tl = clamp((G.time - (mining ? 0 : acc * TPS)) / G.timeMax, 0, 1), urgent = !mining && G.time <= 5 * TPS;
    g.fillStyle = 'rgba(214,222,255,0.1)'; rr(g, L.gx, L.barY, L.gw, 14, 7); g.fill();
    if (tl > 0.005) {
      var tc = urgent ? (Math.sin(clock * 16) > 0 ? '#ff5470' : '#ff9aa9') : CYAN;
      g.fillStyle = tc; g.shadowColor = tc; g.shadowBlur = 14; rr(g, L.gx, L.barY, Math.max(14, L.gw * tl), 14, 7); g.fill(); g.shadowBlur = 0;
    }

    // --- the block ---
    var bs = 1, bxo = 0, byo = 0, ba = 1;
    if (mining && mp > 0.62 && landing) { var q = ease((mp - 0.62) / 0.38); bs = lerp(1, tz / L.gw, q); bxo = lerp(0, landing.x - L.gx, q); byo = lerp(0, landing.y - L.gy, q); }
    else if (mining && mp > 0.62) ba = 1 - ease((mp - 0.62) / 0.38);
    g.save();
    g.translate(L.gx + bxo, L.gy + byo); g.scale(bs, bs); g.globalAlpha *= ba * (mining ? 1 : 0.35 + 0.65 * gridIn);
    var lastB = G.blocks[G.blocks.length - 1];
    var frameCol = mining ? (lastB.orphan ? '#ff5470' : lastB.full ? COL[2] : '#fff') : urgent ? (Math.sin(clock * 16) > 0 ? '#ff5470' : '#ffc2cc') : '#d9f3fb';
    // the pool: a pale rim, lit water, the floor tiles and the light moving on them
    g.shadowColor = mining || urgent ? frameCol : '#27d3ff'; g.shadowBlur = 34;
    g.fillStyle = frameCol; rr(g, -16, -16, L.gw + 32, L.gw + 32, 28); g.fill(); g.shadowBlur = 0;
    g.strokeStyle = 'rgba(0,40,70,0.25)'; g.lineWidth = 2; rr(g, -8, -8, L.gw + 16, L.gw + 16, 20); g.stroke();
    var wg = g.createLinearGradient(0, 0, 0, L.gw); wg.addColorStop(0, '#1cc6ee'); wg.addColorStop(1, DEEP);
    g.fillStyle = wg; rr(g, 0, 0, L.gw, L.gw, 12); g.fill();
    g.save(); rr(g, 0, 0, L.gw, L.gw, 12); g.clip();
    g.fillStyle = 'rgba(255,255,255,0.12)';
    for (k = 1; k < W; k++) { g.fillRect(k * L.cell - 1, 0, 2, L.gw); g.fillRect(0, k * L.cell - 1, L.gw, 2); }
    g.strokeStyle = 'rgba(255,255,255,0.17)'; g.lineWidth = 3; g.lineCap = 'round';
    for (k = 0; k < 8; k++) {
      g.beginPath();
      for (var wx = -10; wx <= L.gw + 10; wx += 30) { var wy = (k + 0.5) * L.gw / 8 + Math.sin(wx * 0.021 + clock * 1.3 + k * 1.7) * 11 + Math.sin(wx * 0.047 - clock * 0.9 + k) * 6; if (wx < 0) g.moveTo(wx, wy); else g.lineTo(wx, wy); }
      g.stroke();
    }
    g.restore();
    // the ladder
    g.strokeStyle = '#8fa9b8'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(L.gw - 96, 6); g.lineTo(L.gw - 96, -22); g.moveTo(L.gw - 58, 6); g.lineTo(L.gw - 58, -22); g.stroke();
    for (k = 0; k < G.placed.length; k++) {
      var p = G.placed[k], pulse = mining ? 1 + 0.05 * Math.sin(clamp(mp * 4 - k * 0.04, 0, 1) * Math.PI) : 1, sh = C.SHAPES[p.tx.shape];
      g.save();
      if (pulse !== 1) { var pcx = (p.x + sh.w / 2) * L.cell, pcy = (p.y + sh.h / 2) * L.cell; g.translate(pcx, pcy); g.scale(pulse, pulse); g.translate(-pcx, -pcy); }
      if (!reduce) g.translate(0, Math.sin(clock * 2.1 + k * 1.3) * 1.6);          // bobbing
      drawTx(g, p.tx, p.x * L.cell, p.y * L.cell, L.cell, { label: bs > 0.6, dead: v.dead[k] || (mining && lastB.orphan) });
      g.restore();
    }
    // where the dragged one would land
    if (drag && !mining) {
      var dc = dropCell(drag), ok = C.fits(G, drag.tx, dc.x, dc.y), dsh = C.SHAPES[drag.tx.shape];
      if (ok) {
        drawTx(g, drag.tx, dc.x * L.cell, dc.y * L.cell, L.cell, { alpha: 0.38 });
        g.strokeStyle = '#fff'; g.lineWidth = 3; g.globalAlpha = 0.9;
        for (k = 0; k < dsh.cells.length; k++) rr(g, (dc.x + dsh.cells[k][0]) * L.cell + 4, (dc.y + dsh.cells[k][1]) * L.cell + 4, L.cell - 8, L.cell - 8, 8), g.stroke();
      }
    }
    if (mining && flash > 0) { g.globalAlpha = flash * 0.5; g.fillStyle = '#fff'; rr(g, -16, -16, L.gw + 32, L.gw + 32, 28); g.fill(); }
    g.restore();

    // --- under the block: what it pays now, how full it is ---
    if (!attract && !mining) {
      g.textBaseline = 'middle'; g.font = '800 20px ' + MONO;
      g.textAlign = 'left'; g.fillStyle = MUTE; g.fillText('FEES', L.gx, L.infoY);
      g.fillStyle = '#fff'; g.fillText(fmt(v.fees), L.gx + 66, L.infoY);
      if (v.lost) { var fw = g.measureText(fmt(v.fees)).width; g.fillStyle = '#ff9a7a'; g.fillText('−' + short(v.lost) + ' sunk', L.gx + 82 + fw, L.infoY); }
      var pct = Math.round(v.fill * 100), need = G.mode === 'endless' ? Math.round(C.target(G.block) * 100) : 0;
      g.textAlign = 'right';
      g.fillStyle = v.full ? COL[2] : v.fill >= R.fatFill ? CYAN : need && pct < need ? '#ff8296' : '#fff';
      g.fillText(pct + '% FULL' + (v.fill >= R.fatFill && !v.full ? ' +20%' : ''), L.gx + L.gw, L.infoY);
      if (need && pct < need) { var w2 = g.measureText(pct + '% FULL').width; g.fillStyle = MUTE; g.fillText('NEED ' + need + '%', L.gx + L.gw - w2 - 16, L.infoY); }
    }

    // --- the mempool: three waiting transactions ---
    for (s = 0; s < 3; s++) {
      var sl = G.slots[s], x = L.slotX[s], y = L.trayY, held = drag && drag.slot === s && sl.tx === drag.tx;
      g.fillStyle = 'rgba(16,22,46,0.85)'; rr(g, x, y, L.slotW, L.slotH, 18); g.fill();
      g.strokeStyle = 'rgba(150,170,255,0.2)'; g.lineWidth = 2; rr(g, x, y, L.slotW, L.slotH, 18); g.stroke();
      if (!sl.tx) continue;
      var sh2 = C.SHAPES[sl.tx.shape], c2 = Math.min(46, 150 / Math.max(sh2.w, sh2.h + 0.4)), inn = ease(slotIn[s]);
      var life = 1 - clamp(sl.age / R.expire, 0, 1), col = COL[sl.tx.tier];
      // time left before another miner takes it
      g.fillStyle = 'rgba(214,222,255,0.1)'; rr(g, x + 16, y + L.slotH - 16, L.slotW - 32, 5, 2.5); g.fill();
      g.fillStyle = life < 0.25 ? '#ff5470' : 'rgba(217,243,251,0.75)'; rr(g, x + 16, y + L.slotH - 16, Math.max(5, (L.slotW - 32) * life), 5, 2.5); g.fill();
      g.save();
      g.globalAlpha *= (held ? 0.22 : 1) * inn * (life < 0.25 && !held ? 0.6 + 0.4 * Math.sin(clock * 18) : 1);
      var fitsAny = mining || C.anyFit(G, sl.tx);
      if (!fitsAny) g.globalAlpha *= 0.4;
      drawTx(g, sl.tx, x + (L.slotW - sh2.w * c2) / 2, y + 18 + (132 - sh2.h * c2) / 2 + (1 - inn) * 60, c2);
      g.font = '800 23px ' + MONO; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = sl.tx.rug ? '#ff9a7a' : col;
      g.fillText((sl.tx.rug ? 'RUG ' : '') + fmt(sl.tx.fee), x + L.slotW / 2, y + L.slotH - 38);
      g.restore();
    }
    for (k = 0; k < gone.length; k++) {                               // taken by another miner
      var go = gone[k], gsh = C.SHAPES[go.tx.shape], gc = Math.min(46, 150 / Math.max(gsh.w, gsh.h + 0.4)), gt = go.t / 0.4;
      drawTx(g, go.tx, L.slotX[go.slot] + (L.slotW - gsh.w * gc) / 2 + gt * 90, L.trayY + 18 + (132 - gsh.h * gc) / 2 - gt * 40, gc, { alpha: (1 - gt) * 0.7 });
    }

    // --- mine now ---
    if (!attract) {
      var m = L.mine, can = !mining && G.filled > 0;
      g.globalAlpha = can ? 1 : 0.35;
      g.fillStyle = 'rgba(255,197,61,0.1)'; rr(g, m.x, m.y, m.w, m.h, 14); g.fill();
      g.strokeStyle = rgba(COL[2], 0.7); g.lineWidth = 2; rr(g, m.x, m.y, m.w, m.h, 14); g.stroke();
      g.fillStyle = COL[2]; g.font = '800 22px ' + MONO; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('BLOW THE WHISTLE', m.x + m.w / 2, m.y + m.h / 2 + 1);
      g.globalAlpha = 1;
    }

    // --- in the hand ---
    var hand = drag || back;
    if (hand && !mining) {
      var hsh = C.SHAPES[hand.tx.shape], hx, hy, hc = L.cell;
      if (drag) { var grow = ease(drag.t / 0.1); hc = lerp(46, L.cell, grow); hx = drag.x - hsh.w * hc / 2; hy = drag.y - drag.lift * grow - hsh.h * hc / 2; }
      else { var bt = ease(back.t / 0.16); hc = lerp(L.cell, 46, bt); hx = lerp(back.x, L.slotX[back.slot] + L.slotW / 2, bt) - hsh.w * hc / 2; hy = lerp(back.y, L.trayY + 84, bt) - hsh.h * hc / 2; }
      drawTx(g, hand.tx, hx, hy, hc, { alpha: 0.96, label: hc > 70 });
    }

    // --- sparks, numbers, banner ---
    for (k = 0; k < parts.length; k++) { var pt = parts[k]; g.globalAlpha = (attract ? 0.6 : 1) * (1 - pt.t / pt.life); g.fillStyle = pt.c; g.fillRect(pt.x - pt.s / 2, pt.y - pt.s / 2, pt.s, pt.s); }
    g.globalAlpha = attract ? 0.6 : 1;
    for (k = 0; k < pops.length; k++) {
      var po = pops[k], pe = ease(po.t / 0.9);
      g.globalAlpha = 1 - Math.pow(po.t / 0.9, 3); g.font = '800 ' + Math.round(34 * po.size) + 'px ' + MONO; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.lineWidth = 7; g.strokeStyle = INK; g.strokeText(po.text, po.x, po.y - pe * 70); g.fillStyle = po.color; g.fillText(po.text, po.x, po.y - pe * 70);
    }
    g.globalAlpha = 1;
    if (banner && !attract) {
      var bt2 = banner.t, a = bt2 < 0.15 ? bt2 / 0.15 : bt2 > 1.35 ? 1 - (bt2 - 1.35) / 0.35 : 1, sc = 1 + 0.25 * (1 - ease(bt2 / 0.25)), by = L.gy + L.gw / 2;
      g.save(); g.globalAlpha = a; g.translate(360, by); g.scale(sc, sc);
      g.fillStyle = 'rgba(4,6,13,0.78)'; g.fillRect(-380, -74, 760, 148);
      g.font = '800 62px ' + MONO; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = banner.color; g.shadowColor = banner.color; g.shadowBlur = 30;
      g.fillText(banner.big, 0, banner.small ? -16 : 0); g.shadowBlur = 0;
      if (banner.small) { g.font = '600 24px "Space Grotesk", system-ui, sans-serif'; g.fillStyle = 'rgba(232,236,255,0.9)'; g.fillText(banner.small, 0, 38); }
      g.restore();
    }
  }

  // ---------- Wiring ----------
  resize(); sndIcon(); menu();
  window.addEventListener('resize', resize);
  cv.addEventListener('pointerdown', down);
  cv.addEventListener('pointermove', move);
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', function (e) { if (drag && e.pointerId === drag.id) drag = null; });
  cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('keydown', function (e) {
    if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) return;
    if ((e.code === 'Space' || e.code === 'Enter') && !attract && !over && G && G.wait === 0 && G.filled > 0) { e.preventDefault(); C.mineNow(G); }
  });
  $('#mp-snd').addEventListener('click', function () { audio(); setMuted(!muted); });
  $('#mp-daily').addEventListener('click', function () { start('daily'); });
  $('#mp-endless').addEventListener('click', function () { start('endless'); });
  $('#mp-again').addEventListener('click', function () { start('endless'); });
  $('#mp-share').addEventListener('click', share);
  $('#mp-end-menu').addEventListener('click', menu);
  $('#mp-lb-open').addEventListener('click', function () { openBoard('daily', 'menu'); });
  $('#mp-end-lb').addEventListener('click', function () { openBoard(G.mode, 'end'); });
  $('#mp-lb-close').addEventListener('click', function () { $('#mp-lb').hidden = true; if (cameFrom === 'end') $('#mp-end').hidden = false; else $('#mp-menu').hidden = false; });
  root.querySelectorAll('.mp-tab').forEach(function (b) { b.addEventListener('click', function () { openBoard(b.getAttribute('data-board')); }); });
  $('#mp-post').addEventListener('submit', function (e) { e.preventDefault(); postScore(); });
  $('#mp-initials').addEventListener('input', function () { this.value = this.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3); });
  document.addEventListener('visibilitychange', function () { paused = document.hidden; drag = null; if (AC) { if (document.hidden) AC.suspend(); else AC.resume(); } });
  if (DEBUG) window.POF_MP = { get G() { return G; }, get L() { return L; }, get S() { return S; }, get OX() { return OX; }, core: C, start: start, menu: menu, frame: tick, card: shareCard, finish: finish, set manual(v) { manual = v; }, set auto(v) { AUTO = v; } };
  requestAnimationFrame(frame);
})();
