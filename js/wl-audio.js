/* Wen Lambo: sound. A car radio with stations, an engine and a few effects, all made in code for now.
   Each station can be given real tracks later (tracks: ['audio/wl/....mp3']); with tracks it plays those
   files in turn, without them it plays its code-made loop.
   window.POF_WL_AUDIO = { start(), setStation(i), nextStation(), station(), STATIONS, engine(pct, on), sfx.*, mute(bool), muted() } */
(function (root) {
  'use strict';
  var STATIONS = [
    { id: 'wagmi', name: 'WAGMI FM', freq: '104.2', bpm: 104, style: 'drive', prog: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], tracks: [] },
    { id: 'hodl', name: 'HODL RADIO', freq: '88.8', bpm: 84, style: 'chill', prog: [[50, 53, 57, 60], [46, 50, 53, 57], [53, 57, 60, 64], [48, 52, 55, 59]], tracks: [] },
    { id: 'degen', name: 'DEGEN 99.9', freq: '99.9', bpm: 126, style: 'chase', prog: [[52, 55, 59], [48, 52, 55], [50, 54, 57], [47, 50, 54]], tracks: [] },
    { id: 'off', name: 'RADIO OFF', freq: '', off: true, tracks: [] }
  ];
  var AC = null, master = null, music = null, fx = null, echo = null, noise = null, eng = null, engG = null, eng2 = null;
  var muted = false, cur = 0, step = 0, next = 0, timer = null, el = null, elNode = null, trackI = 0;
  function start() {
    if (!AC) {
      var Kc = root.AudioContext || root.webkitAudioContext; if (!Kc) return;
      AC = new Kc();
      master = AC.createGain(); master.gain.value = muted ? 0 : 1; master.connect(AC.destination);
      music = AC.createGain(); music.gain.value = 0.5; music.connect(master);
      fx = AC.createGain(); fx.gain.value = 0.6; fx.connect(master);
      echo = AC.createDelay(); echo.delayTime.value = 0.36; var fb = AC.createGain(); fb.gain.value = 0.32; var wet = AC.createGain(); wet.gain.value = 0.35; echo.connect(fb); fb.connect(echo); echo.connect(wet); wet.connect(music);
      noise = AC.createBuffer(1, AC.sampleRate, AC.sampleRate); var d = noise.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      eng = AC.createOscillator(); eng.type = 'sawtooth'; eng2 = AC.createOscillator(); eng2.type = 'square';
      var lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520; engG = AC.createGain(); engG.gain.value = 0;
      eng.connect(lp); eng2.connect(lp); lp.connect(engG); engG.connect(fx); eng.start(); eng2.start();
      next = AC.currentTime + 0.1; timer = setInterval(tick, 25);
      applyStation();
    }
    if (AC.state === 'suspended') AC.resume();
  }
  function mid(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function note(type, f, at, dur, vol, wetSend, cut, dest) {
    var o = AC.createOscillator(), a = AC.createGain(), lp = AC.createBiquadFilter(); o.type = type; o.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = cut || 3000;
    a.gain.setValueAtTime(0.0001, at); a.gain.linearRampToValueAtTime(vol, at + 0.012); a.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(lp); lp.connect(a); a.connect(dest || music); if (wetSend) a.connect(echo); o.start(at); o.stop(at + dur + 0.05);
    return o;
  }
  function hit(at, dur, vol, f, type, dest) { var s = AC.createBufferSource(), fl = AC.createBiquadFilter(), a = AC.createGain(); s.buffer = noise; fl.type = type; fl.frequency.value = f; a.gain.setValueAtTime(vol, at); a.gain.exponentialRampToValueAtTime(0.0001, at + dur); s.connect(fl); fl.connect(a); a.connect(dest || music); s.start(at); s.stop(at + dur + 0.05); }
  function kick(at, v) { var o = AC.createOscillator(), a = AC.createGain(); o.frequency.setValueAtTime(150, at); o.frequency.exponentialRampToValueAtTime(45, at + 0.12); a.gain.setValueAtTime(v, at); a.gain.exponentialRampToValueAtTime(0.0001, at + 0.28); o.connect(a); a.connect(music); o.start(at); o.stop(at + 0.3); }
  function tick() {
    if (!AC || AC.state !== 'running') return;
    var st = STATIONS[cur];
    if (st.off || st.tracks.length) { next = AC.currentTime + 0.1; return; }
    var d16 = 60 / st.bpm / 4;
    if (next < AC.currentTime - 0.5) next = AC.currentTime + 0.05;
    while (next < AC.currentTime + 0.14) {
      var s = step % 16, bar = (step >> 4) % 4, phrase = (step >> 6) % 4, ch = st.prog[bar], at = next, root0 = ch[0];
      if (st.style === 'drive') {
        note('sawtooth', mid(root0 - 24), at, d16 * 0.9, 0.16, false, 700);
        if (s % 4 === 0) kick(at, 0.6);
        if (s === 4 || s === 12) hit(at, 0.3, 0.3, 1800, 'bandpass');
        if (s % 2 === 1) hit(at, 0.04, 0.07, 7000, 'highpass');
        if (s % 2 === 0) note('square', mid(ch[(s >> 1) % 3] + 12 + ((s >> 1) % 4 === 3 ? 12 : 0)), at, d16 * 1.6, 0.04, true, 2600);
        if (s === 0) ch.forEach(function (m) { note('sawtooth', mid(m), at, d16 * 15, 0.032, true, 1400); });
        if (phrase >= 2 && (s === 0 || s === 6 || s === 10)) note('triangle', mid(ch[(s / 2) % 3 | 0] + 24), at, d16 * 3, 0.07, true, 4000);
      } else if (st.style === 'chill') {
        if (s === 0 || s === 10) kick(at, 0.5);
        if (s === 8) hit(at, 0.22, 0.16, 2400, 'bandpass');
        if (s % 4 === 2) hit(at, 0.05, 0.04, 8000, 'highpass');
        if (s === 0 || s === 6 || s === 11) note('sine', mid(root0 - 12), at, d16 * 4, 0.3, false, 500);
        if (s === 0) ch.forEach(function (m, i) { note('sawtooth', mid(m), at + i * 0.03, d16 * 16, 0.035, true, 900); note('triangle', mid(m + 12), at, d16 * 16, 0.03, true, 2000); });
        if (s % 4 === 0) note('sine', mid(ch[(s / 4 + bar) % ch.length] + 24), at, d16 * 5, 0.06, true, 5000);
        if (phrase % 2 === 1 && (s === 2 || s === 5 || s === 8 || s === 14)) note('triangle', mid(ch[(s * 3) % ch.length] + 12 + (s === 8 ? 2 : 0)), at, d16 * 4, 0.09, true, 3000);
      } else {
        if (s % 4 === 0) kick(at, 0.7);
        if (s === 4 || s === 12) { hit(at, 0.18, 0.3, 1500, 'bandpass'); hit(at + 0.012, 0.16, 0.2, 2600, 'bandpass'); }
        hit(at, 0.03, s % 4 === 2 ? 0.1 : 0.05, 8000, 'highpass');
        if (s % 2 === 0) note('sawtooth', mid(root0 - 24 + ((s >> 1) % 2 ? 12 : 0)), at, d16 * 1.7, 0.17, false, 900);
        if (s === 2 || s === 6 || s === 10 || s === 14) ch.forEach(function (m) { note('sawtooth', mid(m), at, d16 * 1.4, 0.04, true, 2200); });
        note('square', mid(ch[[0, 1, 2, 1, 0, 2, 1, 2][s % 8]] + 12 + (s > 11 ? 12 : 0)), at, d16 * 0.9, 0.028, true, 3200);
        if (phrase === 3 && s % 4 === 3) note('triangle', mid(ch[2] + 24), at, d16 * 2, 0.06, true, 5000);
      }
      next += d16; step++;
    }
  }
  // Real tracks, when a station has them.
  function applyStation() {
    var st = STATIONS[cur];
    if (el) { el.pause(); }
    if (!st.off && st.tracks.length && AC) {
      if (!el) { el = new Audio(); el.crossOrigin = 'anonymous'; el.preload = 'auto'; el.addEventListener('ended', function () { trackI++; playTrack(); }); try { elNode = AC.createMediaElementSource(el); elNode.connect(music); } catch (e) { /* plays straight to the speakers */ } }
      trackI = Math.floor(Math.random() * st.tracks.length); playTrack();
    }
    step = 0;
  }
  function playTrack() { var st = STATIONS[cur]; if (!st.tracks.length) return; el.src = st.tracks[trackI % st.tracks.length]; el.volume = muted ? 0 : 1; var p = el.play(); if (p && p.catch) p.catch(function () { /* needs a tap first */ }); }
  function setStation(i, quiet) {
    cur = ((i % STATIONS.length) + STATIONS.length) % STATIONS.length;
    if (AC) { if (!quiet) { hit(AC.currentTime, 0.22, 0.25, 3000, 'bandpass', fx); note('sine', 1400, AC.currentTime + 0.02, 0.08, 0.05, false, 4000, fx); } applyStation(); }
    return STATIONS[cur];
  }
  function engine(pct, on, boost) {
    if (!eng) return; var t = AC.currentTime, f = 42 + pct * 120 + (boost ? 14 : 0);
    eng.frequency.setTargetAtTime(f, t, 0.07); eng2.frequency.setTargetAtTime(f * 0.5, t, 0.07); engG.gain.setTargetAtTime(on ? 0.035 + pct * 0.05 : 0, t, 0.1);
  }
  var sfx = {
    crash: function () { if (!AC) return; hit(AC.currentTime, 0.4, 0.6, 800, 'lowpass', fx); note('square', 90, AC.currentTime, 0.22, 0.12, false, 600, fx); },
    draft: function () { if (!AC) return; var o = note('sawtooth', 300, AC.currentTime, 0.35, 0.07, false, 2500, fx); o.frequency.exponentialRampToValueAtTime(1200, AC.currentTime + 0.3); hit(AC.currentTime, 0.3, 0.12, 5000, 'highpass', fx); },
    beep: function (hi) { if (!AC) return; note('square', hi ? 880 : 440, AC.currentTime, hi ? 0.5 : 0.18, 0.1, false, 3000, fx); },
    finish: function () { if (!AC) return; [0, 4, 7, 12, 16].forEach(function (m, i) { note('square', mid(72 + m), AC.currentTime + i * 0.09, 0.3, 0.08, false, 4000, fx); note('triangle', mid(60 + m), AC.currentTime + i * 0.09, 0.4, 0.1, false, 3000, fx); }); },
    click: function () { if (!AC) return; note('square', 660, AC.currentTime, 0.05, 0.05, false, 3000, fx); },
    unlock: function () { if (!AC) return; [0, 7, 12].forEach(function (m, i) { note('triangle', mid(76 + m), AC.currentTime + 0.5 + i * 0.07, 0.25, 0.09, false, 5000, fx); }); }
  };
  function mute(m) { muted = !!m; if (master) master.gain.setTargetAtTime(muted ? 0 : 1, AC.currentTime, 0.02); if (el) el.volume = muted ? 0 : 1; }
  document.addEventListener('visibilitychange', function () { if (!AC) return; if (document.hidden) { AC.suspend(); if (el) el.pause(); } else { AC.resume(); if (el && STATIONS[cur].tracks.length) el.play().catch(function () {}); } });
  root.POF_WL_AUDIO = { start: start, setStation: setStation, nextStation: function () { return setStation(cur + 1); }, station: function () { return STATIONS[cur]; }, index: function () { return cur; }, STATIONS: STATIONS, engine: engine, sfx: sfx, mute: mute, muted: function () { return muted; } };
})(window);
