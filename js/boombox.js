/* The hub's boombox: every song from every game, sorted into five genre stations. All of it is drawn in code
   (speakers, the cassette with its turning reels, the LCD equaliser); the buttons are plain HTML.
   - Browsers only allow sound after a tap, so nothing plays until Play (or a station or a song) is pressed.
     From then on it plays nonstop: the next song, then the next station.
   - Shuffle picks from every station, never repeating until half the songs have played.
   - Where a radio shows the artist, it shows the game the song comes from, linked to that game.
     Songs made only for the boombox show BOOMBOX EXCLUSIVE (game: null).
   - The station, volume and shuffle are remembered in localStorage 'pof-bb'.
   To add a song: put the mp3 in audio/box/ (levelled to about -16 LUFS, see tools/boombox.py) and add a line below. */
(function () {
  'use strict';
  var GAMES = {
    fight: { name: 'Proof of Fight', href: 'fight/' },
    rap: { name: 'Rap Battle', href: 'rap/' },
    guitar: { name: 'Guitar Battle', href: 'guitar/' },
    ride: { name: 'Ride the Chart', href: 'ride/' },
    a51: { name: '51% Attack', href: '51/' },
    lambo: { name: 'Wen Lambo', href: 'lambo/' },
    doge: { name: 'Doge Moon Crash', href: 'doge/' },
    sui: { name: 'Sui Swell', href: 'sui/' }
  };
  // Songs: [title, game, file, seconds]. Stations are in dial order (by frequency).
  var STATIONS = [
    { id: 'chip', name: '8-BIT', freq: '88.3', tag: 'Chiptune and arcade synths', color: '#3dff9b', ink: '#032a16', songs: [
      ['The Climb', 'doge', 'audio/dm/climb.mp3', 117],
      ['Hold the Line', 'a51', 'audio/box/a51-hold-the-line.mp3', 150],
      ['The Climb (Title Mix)', 'doge', 'audio/dm/title.mp3', 129],
      ['Buy the Dip', 'ride', 'audio/box/ride-buy-the-dip.mp3', 150],
      ['Moon Landing', 'doge', 'audio/dm/moon-landing.mp3', 75]] },
    { id: 'bars', name: 'BEATS', freq: '96.1', tag: 'Hip-hop battle beats', color: '#b48cff', ink: '#1a0b38', songs: [
      ['Detroit', 'rap', 'audio/box/rap-detroit.mp3', 89],
      ['Gangsta', 'rap', 'audio/box/rap-gangsta.mp3', 157],
      ['Final Round', 'rap', 'audio/box/rap-final-round.mp3', 116],
      ['Glitch Chop', 'rap', 'audio/box/rap-glitch-chop.mp3', 125],
      ['The Bounce', 'rap', 'audio/box/rap-the-bounce.mp3', 108],
      ['The Riff', 'rap', 'audio/box/rap-the-riff.mp3', 101],
      ['Cold Streets', 'rap', 'audio/box/rap-cold-streets.mp3', 107],
      ['Night Ride', 'rap', 'audio/box/rap-night-ride.mp3', 164],
      ['Showdown', 'rap', 'audio/box/rap-showdown.mp3', 138]] },
    { id: 'shred', name: 'SHRED', freq: '99.5', tag: 'Rock anthems, power ballads and surf guitar', color: '#ff8a2a', ink: '#2b1200', songs: [
      ['Arena Anthem', 'guitar', 'audio/box/arena-anthem.mp3', 172],
      ['Encore', null, 'audio/box/shred-encore.mp3', 210],
      ['Wide Open', null, 'audio/box/shred-wide-open.mp3', 92],
      ['Sui Swell', 'sui', 'audio/sw/sui-swell.mp3', 75],
      ['Lighters Up', null, 'audio/box/shred-lighters-up.mp3', 220]] },
    { id: 'boss', name: 'BOSS FM', freq: '101.5', tag: 'Fight-game dubstep', color: '#ffd23f', ink: '#2a1d00', songs: [
      ['Title Theme', 'fight', 'audio/box/pof-menu.mp3', 131],
      ['Fight!', 'fight', 'audio/box/pof-fight.mp3', 184],
      ["Schiff's Theme", 'fight', 'audio/box/pof-schiff.mp3', 135],
      ["Dimon's Theme", 'fight', 'audio/box/pof-dimon.mp3', 159],
      ["Warren's Theme", 'fight', 'audio/box/pof-warren.mp3', 166],
      ["SBF's Theme", 'fight', 'audio/box/pof-sbf.mp3', 148],
      ["WICK's Theme", 'fight', 'audio/box/pof-wick.mp3', 161],
      ['Triumph of Light', 'fight', 'audio/ending.mp3', 173]] },
    { id: 'neon', name: 'NEON', freq: '107.7', tag: 'Synthwave for the night drive', color: '#ff2e97', ink: '#2a0016', songs: [
      ['Sunset Causeway', 'lambo', 'audio/wl/sunset-causeway.mp3', 194],
      ['Neon Rain', 'lambo', 'audio/wl/neon-rain.mp3', 166],
      ["Côte d'Azur Overdrive", 'lambo', 'audio/wl/cote-dazur-overdrive.mp3', 201],
      ['Mile High Midnight', 'lambo', 'audio/wl/mile-high-midnight.mp3', 164],
      ['Chrome Dreams', 'lambo', 'audio/wl/chrome-dreams.mp3', 171],
      ['Desert Run', 'lambo', 'audio/wl/desert-run.mp3', 210],
      ['HODL Till Dawn', 'lambo', 'audio/wl/hodl-till-dawn.mp3', 226],
      ['Bear Market Lounge', 'lambo', 'audio/wl/bear-market-lounge.mp3', 190],
      ['Mainnet', 'lambo', 'audio/wl/mainnet.mp3', 192],
      ['Liquidation', 'lambo', 'audio/wl/liquidation.mp3', 150]] }
  ];

  var root = document.getElementById('boombox');
  if (!root) return;
  function $(id) { return document.getElementById(id); }
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var T = Math.PI * 2;
  function fmt(s) { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function load() { try { return JSON.parse(localStorage.getItem('pof-bb')) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem('pof-bb', JSON.stringify({ st: st, vol: vol, shuf: shuf })); } catch (e) { /* not saved */ } }

  var saved = load();
  var st = Math.max(0, STATIONS.findIndex(function (s) { return s.id === saved.st; }));
  if (saved.st == null) st = STATIONS.findIndex(function (s) { return s.id === 'boss'; });
  var vol = saved.vol == null ? 0.8 : Math.max(0, Math.min(1, +saved.vol));
  var shuf = !!saved.shuf;
  var cur = null;          // { s: station index, i: song index }
  var history = [], playing = false, started = false, errors = 0;
  var total = STATIONS.reduce(function (n, s) { return n + s.songs.length; }, 0);

  // ---------- Audio ----------
  var audio = new Audio(); audio.preload = 'none';
  var AC = null, gain = null, an = null, bins = null;
  function wire() {   // Web Audio for the volume (iPhones ignore audio.volume) and the analyser that moves the speakers
    if (AC) { if (AC.state !== 'running') AC.resume(); return; }
    var K = window.AudioContext || window.webkitAudioContext;
    if (!K) { audio.volume = vol; return; }
    try {
      AC = new K();
      var src = AC.createMediaElementSource(audio);
      gain = AC.createGain(); gain.gain.value = vol * vol;
      an = AC.createAnalyser(); an.fftSize = 512; an.smoothingTimeConstant = 0.72; bins = new Uint8Array(an.frequencyBinCount);
      src.connect(gain); gain.connect(an); an.connect(AC.destination);
    } catch (e) { AC = null; audio.volume = vol; }
  }
  function song(c) { return STATIONS[c.s].songs[c.i]; }
  function play(c, keepHistory) {
    wire();
    if (cur && !keepHistory) history.push(cur);
    if (history.length > 60) history.shift();
    cur = c; started = true;
    if (c.s !== st) { st = c.s; save(); renderDial(); }
    audio.src = song(c)[2];
    resume();
    renderNow(); renderList();
  }
  function resume() {
    wire();
    var p = audio.play();
    if (p && p.catch) p.catch(function () { playing = false; renderNow(); });
  }
  function toggle() {
    if (!cur) { play(shuf ? pick() : { s: st, i: 0 }); return; }
    if (audio.paused) resume(); else audio.pause();
  }
  // Shuffle: any song from any station, skipping the most recent half of everything.
  function pick() {
    var recent = history.concat(cur ? [cur] : []).slice(-Math.floor(total / 2)).map(function (c) { return c.s + ':' + c.i; });
    var pool = [];
    STATIONS.forEach(function (s, si) { s.songs.forEach(function (_, i) { if (recent.indexOf(si + ':' + i) < 0) pool.push({ s: si, i: i }); }); });
    return pool[Math.floor(Math.random() * pool.length)] || { s: 0, i: 0 };
  }
  function next() {
    if (shuf) return play(pick());
    if (!cur) return play({ s: st, i: 0 });
    var i = cur.i + 1, s = cur.s;
    if (i >= STATIONS[s].songs.length) { i = 0; s = (s + 1) % STATIONS.length; }   // end of a station: roll into the next one
    play({ s: s, i: i });
  }
  function prev() {
    if (cur && audio.currentTime > 4) { audio.currentTime = 0; return; }
    if (history.length) return play(history.pop(), true);
    if (cur) audio.currentTime = 0;
  }
  audio.addEventListener('playing', function () { playing = true; errors = 0; renderNow(); wake(); });
  audio.addEventListener('pause', function () { playing = false; renderNow(); });
  audio.addEventListener('ended', function () { next(); });
  audio.addEventListener('error', function () {   // a file that won't load: skip it, but give up after a few in a row
    if (!started || ++errors > 3) { playing = false; renderNow(); return; }
    setTimeout(next, 600);
  });
  audio.addEventListener('timeupdate', renderTime);

  // Lock-screen and headphone controls, with the game where the artist goes.
  function mediaSession() {
    if (!('mediaSession' in navigator) || !cur) return;
    var x = song(cur), g = GAMES[x[1]];
    try {
      navigator.mediaSession.metadata = new MediaMetadata({ title: x[0], artist: g ? g.name : 'Boombox Exclusive', album: STATIONS[cur.s].name + ' · Proof of Fight',
        artwork: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }] });
    } catch (e) { /* older browser */ }
  }
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.setActionHandler('play', function () { resume(); });
      navigator.mediaSession.setActionHandler('pause', function () { audio.pause(); });
      navigator.mediaSession.setActionHandler('nexttrack', next);
      navigator.mediaSession.setActionHandler('previoustrack', prev);
    } catch (e) { /* not supported */ }
  }

  // ---------- Buttons and text ----------
  var ICON = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12.5-7.5z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5h4.5v15H6zM13.5 4.5H18v15h-4.5z"/></svg>'
  };
  var bPlay = $('bb-play'), bNext = $('bb-next'), bPrev = $('bb-prev'), bShuf = $('bb-shuf'), volIn = $('bb-vol');
  bPlay.addEventListener('click', toggle);
  bNext.addEventListener('click', next);
  bPrev.addEventListener('click', prev);
  bShuf.addEventListener('click', function () { shuf = !shuf; save(); renderNow(); });
  volIn.value = Math.round(vol * 100);
  volIn.addEventListener('input', function () {
    vol = volIn.value / 100; save();
    if (gain) gain.gain.setTargetAtTime(vol * vol, AC.currentTime, 0.03); else audio.volume = vol;
  });
  $('bb-mini-play').addEventListener('click', toggle);
  $('bb-mini-next').addEventListener('click', next);
  // Tap the time bar to jump within the song.
  $('bb-seek').addEventListener('click', function (e) {
    if (!cur || !isFinite(audio.duration) || !audio.duration) return;
    var r = this.getBoundingClientRect();
    audio.currentTime = Math.max(0, Math.min(0.999, (e.clientX - r.left) / r.width)) * audio.duration;
  });

  var dial = $('bb-dial');
  function renderDial() {
    dial.innerHTML = STATIONS.map(function (s, i) {
      return '<button type="button" role="radio" aria-checked="' + (i === st) + '" data-st="' + i + '" style="--c:' + s.color + '">' +
        '<b>' + s.freq + '</b><span>' + esc(s.name) + '</span><small>' + s.songs.length + ' song' + (s.songs.length > 1 ? 's' : '') + '</small></button>';
    }).join('');
    root.style.setProperty('--st', STATIONS[st].color);
    root.style.setProperty('--st-ink', STATIONS[st].ink);
    var needle = $('bb-needle'), btn = dial.querySelector('[aria-checked="true"]');
    if (needle && btn) { var a = btn.getBoundingClientRect(), b = needle.parentNode.getBoundingClientRect(); needle.style.left = (a.left - b.left + a.width / 2) + 'px'; }
  }
  dial.addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var s = +b.dataset.st;
    if (s === st && cur && cur.s === s && !audio.paused) return;
    st = s; save(); renderDial(); renderList();
    play({ s: s, i: 0 });   // tuning in starts the station
  });
  // Arrow keys move along the dial, like a radio group should.
  dial.addEventListener('keydown', function (e) {
    var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return; e.preventDefault();
    var s = (st + d + STATIONS.length) % STATIONS.length; st = s; save(); renderDial(); renderList();
    dial.querySelector('[data-st="' + s + '"]').focus();
  });

  var list = $('bb-list');
  function renderList() {
    var S = STATIONS[st];
    $('bb-list-h').innerHTML = '<b>' + esc(S.name) + ' ' + S.freq + '</b> · ' + esc(S.tag);
    list.innerHTML = S.songs.map(function (x, i) {
      var g = GAMES[x[1]], on = cur && cur.s === st && cur.i === i;
      return '<li' + (on ? ' class="on"' : '') + '><button type="button" data-i="' + i + '"' + (on ? ' aria-current="true"' : '') + '>' +
        '<span class="n">' + (on ? '<i class="bars" aria-hidden="true"><i></i><i></i><i></i></i>' : i + 1) + '</span>' +
        '<span class="t">' + esc(x[0]) + '</span><span class="d">' + fmt(x[3]) + '</span></button>' +
        (g ? '<a href="' + g.href + '">' + esc(g.name) + '</a>' : '<em>Boombox exclusive</em>') + '</li>';
    }).join('');
  }
  list.addEventListener('click', function (e) {
    var b = e.target.closest('button[data-i]'); if (!b) return;
    var i = +b.dataset.i;
    if (cur && cur.s === st && cur.i === i) { toggle(); return; }
    play({ s: st, i: i });
  });

  function renderNow() {
    var x = cur ? song(cur) : null, g = x && GAMES[x[1]], S = STATIONS[cur ? cur.s : st];
    bPlay.innerHTML = playing ? ICON.pause : ICON.play;
    bPlay.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    $('bb-mini-play').innerHTML = bPlay.innerHTML; $('bb-mini-play').setAttribute('aria-label', bPlay.getAttribute('aria-label'));
    bShuf.setAttribute('aria-pressed', String(shuf));
    $('bb-st').textContent = S.name + ' ' + S.freq;
    $('bb-title').textContent = x ? x[0] : 'Press play';
    var from = $('bb-from');
    if (!x) { from.removeAttribute('href'); from.innerHTML = total + ' songs from ' + Object.keys(GAMES).length + ' games'; }
    else if (g) { from.href = g.href; from.innerHTML = 'from <b>' + esc(g.name) + '</b> <span aria-hidden="true">›</span>'; }
    else { from.removeAttribute('href'); from.innerHTML = '<b>Boombox exclusive</b>'; }
    $('bb-mini-title').textContent = x ? x[0] : '';
    $('bb-mini-from').textContent = x ? (g ? g.name : 'Boombox exclusive') + ' · ' + S.name : '';
    root.classList.toggle('is-playing', playing);
    mini();
    mediaSession();
    renderTime();
  }
  function renderTime() {
    var x = cur ? song(cur) : null, d = isFinite(audio.duration) && audio.duration || (x ? x[3] : 0), t = cur ? audio.currentTime : 0;
    $('bb-time').textContent = x ? fmt(t) + ' / ' + fmt(d) : '--:--';
    $('bb-seek-fill').style.width = (d ? Math.min(100, t / d * 100) : 0) + '%';
  }

  // A small player pinned to the bottom while music plays and the boombox is scrolled out of sight.
  var seen = true;
  function mini() { $('bb-mini').hidden = !(started && !seen); }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { seen = es[0].isIntersecting; mini(); if (seen) wake(); }, { threshold: 0.05 }).observe(root.querySelector('.boombox'));
  }
  $('bb-mini-up').addEventListener('click', function () { root.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }); });

  // ---------- Drawing ----------
  function fit(c) {
    var r = c.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    var g = c.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0); return { g: g, w: r.width, h: r.height };
  }
  var cvL = $('bb-spk-l'), cvR = $('bb-spk-r'), cvT = $('bb-tape'), cvE = $('bb-eq');
  var bass = 0, mids = 0, eq = new Array(20).fill(0), angL = 0, angR = 0, last = 0, raf = 0;

  function levels() {
    if (an && playing) {
      an.getByteFrequencyData(bins);
      var b = 0; for (var i = 1; i < 7; i++) b += bins[i]; b /= 6 * 255;
      var m = 0; for (i = 12; i < 60; i++) m += bins[i]; m /= 48 * 255;
      bass += (Math.pow(b, 2.2) - bass) * 0.5; mids += (m - mids) * 0.3;
      for (i = 0; i < eq.length; i++) {   // 20 bands spread log-wise over the spectrum
        var lo = Math.floor(Math.pow(1.27, i) + i), hi = Math.floor(Math.pow(1.27, i + 1) + i + 1), v = 0;
        for (var k = lo; k <= hi && k < bins.length; k++) v = Math.max(v, bins[k]);
        eq[i] += (v / 255 - eq[i]) * 0.45;
      }
    } else {
      bass *= 0.85; mids *= 0.85;
      for (var j = 0; j < eq.length; j++) eq[j] *= 0.88;
    }
  }

  function speaker(c, kick) {
    if (!c.offsetWidth) return;   // hidden on phones
    var f = fit(c), g = f.g, w = f.w, h = f.h, cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 2;
    g.clearRect(0, 0, w, h);
    // the grille: a dark disc with rings of holes
    g.fillStyle = '#121218'; g.beginPath(); g.arc(cx, cy, R, 0, T); g.fill();
    g.lineWidth = Math.max(2, R * 0.05); g.strokeStyle = '#5a5a66'; g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.25)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, R - g.lineWidth - 1, Math.PI * 1.05, Math.PI * 1.6); g.stroke();
    var accent = getComputedStyle(root).getPropertyValue('--st').trim() || '#ffd23f';
    // a station-coloured ring that lights up on the beat
    g.strokeStyle = accent; g.globalAlpha = 0.25 + 0.75 * kick; g.lineWidth = Math.max(1.5, R * 0.035);
    g.beginPath(); g.arc(cx, cy, R * 0.9, 0, T); g.stroke(); g.globalAlpha = 1;
    var s = 1 + kick * 0.07, rc = R * 0.8 * s;
    // surround (rubber edge), then the cone
    g.fillStyle = '#26262e'; g.beginPath(); g.arc(cx, cy, rc, 0, T); g.fill();
    var cone = g.createRadialGradient(cx - rc * 0.2, cy - rc * 0.25, rc * 0.1, cx, cy, rc * 0.86);
    cone.addColorStop(0, '#4a4a55'); cone.addColorStop(0.55, '#2b2b33'); cone.addColorStop(1, '#16161b');
    g.fillStyle = cone; g.beginPath(); g.arc(cx, cy, rc * 0.86, 0, T); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 1;
    for (var k = 1; k < 4; k++) { g.beginPath(); g.arc(cx, cy, rc * (0.3 + k * 0.17), 0, T); g.stroke(); }
    // chrome dust cap
    var rd = rc * 0.3, cap = g.createRadialGradient(cx - rd * 0.4, cy - rd * 0.45, rd * 0.1, cx, cy, rd);
    cap.addColorStop(0, '#ffffff'); cap.addColorStop(0.35, '#c9cad3'); cap.addColorStop(1, '#55565f');
    g.fillStyle = cap; g.beginPath(); g.arc(cx, cy, rd, 0, T); g.fill();
    g.strokeStyle = '#0b0b10'; g.lineWidth = 1.5; g.stroke();
  }

  function tape(dt) {
    var f = fit(cvT), g = f.g, w = f.w, h = f.h;
    g.clearRect(0, 0, w, h);
    var S = STATIONS[cur ? cur.s : st], x = cur ? song(cur) : null;
    var cw = Math.min(w - 8, (h - 8) * 1.6), ch = cw / 1.6, ox = (w - cw) / 2, oy = (h - ch) / 2, u = cw / 160;
    function rr(x0, y0, ww, hh, r) { g.beginPath(); g.moveTo(x0 + r, y0); g.arcTo(x0 + ww, y0, x0 + ww, y0 + hh, r); g.arcTo(x0 + ww, y0 + hh, x0, y0 + hh, r); g.arcTo(x0, y0 + hh, x0, y0, r); g.arcTo(x0, y0, x0 + ww, y0, r); g.closePath(); }
    // shell
    rr(ox, oy, cw, ch, 6 * u); g.fillStyle = '#23222b'; g.fill(); g.lineWidth = 1.5; g.strokeStyle = '#0a0a0e'; g.stroke();
    [[8, 8], [152, 8], [8, 92], [152, 92]].forEach(function (p) { g.fillStyle = '#55545f'; g.beginPath(); g.arc(ox + p[0] * u, oy + p[1] * u, 2.2 * u, 0, T); g.fill(); });
    // label
    rr(ox + 12 * u, oy + 10 * u, 136 * u, 58 * u, 3 * u); g.fillStyle = '#f2ecd9'; g.fill();
    g.fillStyle = S.color; g.fillRect(ox + 12 * u, oy + 22 * u, 136 * u, 7 * u);
    g.fillStyle = S.ink; g.font = '700 ' + (4.6 * u) + 'px "JetBrains Mono", monospace'; g.textBaseline = 'middle';
    g.fillText(S.name + ' ' + S.freq, ox + 16 * u, oy + 25.6 * u);
    g.textAlign = 'right'; g.fillText('SIDE A', ox + 144 * u, oy + 25.6 * u); g.textAlign = 'left';
    g.fillStyle = '#1d1a2e'; g.font = '700 ' + (8.5 * u) + 'px "Comic Neue", "Comic Sans MS", cursive';
    var title = x ? x[0] : 'Proof of Fight Mix';
    while (g.measureText(title).width > 128 * u && title.length > 4) title = title.slice(0, -2) + '…';
    g.fillText(title, ox + 16 * u, oy + 16 * u);
    // window with the reels
    rr(ox + 38 * u, oy + 34 * u, 84 * u, 28 * u, 4 * u); g.fillStyle = '#0d0c12'; g.fill();
    var p = cur ? Math.min(1, audio.currentTime / (isFinite(audio.duration) && audio.duration || song(cur)[3])) : 0;
    var rL = (6.5 + 6 * (1 - p)) * u, rR = (6.5 + 6 * p) * u, cL = [ox + 58 * u, oy + 48 * u], cR = [ox + 102 * u, oy + 48 * u];
    // tape running between the packs (clipped to the window)
    g.save(); rr(ox + 38 * u, oy + 34 * u, 84 * u, 28 * u, 4 * u); g.clip();
    g.fillStyle = '#4a2e1c';
    g.beginPath(); g.arc(cL[0], cL[1], rL, 0, T); g.fill();
    g.beginPath(); g.arc(cR[0], cR[1], rR, 0, T); g.fill();
    g.strokeStyle = '#4a2e1c'; g.lineWidth = 1.2 * u; g.beginPath(); g.moveTo(cL[0], cL[1] + rL); g.lineTo(cR[0], cR[1] + rR); g.stroke();
    // hubs turn faster when their pack is small (the tape moves at one speed)
    if (playing && !reduce) { angL += dt * 2.6 * (14 * u) / rL; angR += dt * 2.6 * (14 * u) / rR; }
    [[cL, angL], [cR, angR]].forEach(function (q) {
      var c = q[0], a = q[1];
      g.fillStyle = '#e9e6dc'; g.beginPath(); g.arc(c[0], c[1], 5.4 * u, 0, T); g.fill();
      g.fillStyle = '#23222b';
      for (var k = 0; k < 6; k++) { var aa = a + k * T / 6; g.beginPath(); g.arc(c[0] + Math.cos(aa) * 3.7 * u, c[1] + Math.sin(aa) * 3.7 * u, 1.05 * u, 0, T); g.fill(); }
      g.beginPath(); g.arc(c[0], c[1], 1.6 * u, 0, T); g.fill();
    });
    g.restore();
    // window glare
    g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(ox + 40 * u, oy + 60 * u); g.lineTo(ox + 60 * u, oy + 35 * u); g.lineTo(ox + 70 * u, oy + 35 * u); g.lineTo(ox + 50 * u, oy + 60 * u); g.fill();
    // bottom trapezoid with the head holes
    g.fillStyle = '#2d2c37'; g.beginPath(); g.moveTo(ox + 30 * u, oy + ch); g.lineTo(ox + 38 * u, oy + 74 * u); g.lineTo(ox + 122 * u, oy + 74 * u); g.lineTo(ox + 130 * u, oy + ch); g.closePath(); g.fill();
    g.fillStyle = '#0d0c12'; [56, 74, 86, 104].forEach(function (hx) { g.fillRect(ox + hx * u, oy + 84 * u, 4 * u, 5 * u); });
  }

  function lcdEq() {
    var f = fit(cvE), g = f.g, w = f.w, h = f.h, n = eq.length, gap = 2, bw = (w - gap * (n - 1)) / n, seg = 4, rows = Math.max(4, Math.floor(h / (seg + 1)));
    g.clearRect(0, 0, w, h);
    for (var i = 0; i < n; i++) {
      var v = playing ? Math.min(1, eq[i] * 1.15) : 0, lit = Math.round(v * rows);
      for (var r = 0; r < rows; r++) {
        g.fillStyle = r < lit ? (r > rows * 0.8 ? '#ff5a4a' : r > rows * 0.6 ? '#ffd23f' : '#7dffb0') : 'rgba(125,255,176,.08)';
        g.fillRect(i * (bw + gap), h - (r + 1) * (seg + 1), bw, seg);
      }
    }
  }

  function frame(now) {
    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    levels();
    speaker(cvL, reduce ? 0 : bass); speaker(cvR, reduce ? 0 : bass);
    tape(dt); lcdEq();
    root.style.setProperty('--kick', (reduce ? 0 : bass).toFixed(3));
    // keep animating only while something moves and it's on screen
    raf = (playing || bass > 0.01) && seen && !document.hidden ? requestAnimationFrame(frame) : 0;
  }
  function wake() { if (!raf) raf = requestAnimationFrame(frame); }
  function redraw() { renderDial(); last = 0; frame(performance.now()); }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) wake(); });
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(redraw, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(redraw);

  renderDial(); renderList(); renderNow(); redraw();
})();
