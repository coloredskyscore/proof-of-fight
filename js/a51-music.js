/* 51% Attack's music, made in code: no files to download.
   One song that changes with the game. `heat` runs from 0 to 1:
     0.1   calm      pads and a slow arpeggio (title, between waves)
     0.35  a wave    a laid-back beat, bass and arpeggio
     0.6+  trouble   the chords turn darker, the kick goes four-on-the-floor, the bass starts driving
     0.8+  overrun   sixteenth hats, a hard snare and a two-note alarm
   js/a51.js sets the heat from consensus, the home node and the boss. Each stage plays in its own key
   and tempo. A song is 4 bars of 16 steps; step() schedules one sixteenth note on any AudioContext, so
   the same code plays live and renders a clip offline (tools use render()). */
(function (root, factory) {
  root.POF_A51_MUSIC = factory();
})(this, function () {
  'use strict';

  // root is a MIDI note (57 = A3). bpm is the calm tempo; trouble adds up to RUSH on top.
  var KEYS = {
    menu:    { root: 57, bpm: 86 },
    vault:   { root: 57, bpm: 90 },    // A minor
    bank:    { root: 50, bpm: 94 },    // D minor
    hearing: { root: 52, bpm: 98 },    // E minor
    yard:    { root: 54, bpm: 102 },   // F sharp minor
    chart:   { root: 48, bpm: 106 }    // C minor
  };
  var RUSH = 24;
  // Chords as semitones from the root, one a bar. Chill: i7, VImaj7, IIImaj7, VII6. Trouble: i, i, VI, V (major: the pull back to i).
  var CHILL = { chords: [[0, 3, 7, 10], [-4, 0, 3, 7], [3, 7, 10, 14], [-2, 2, 5, 7]], bass: [0, -4, 3, -2] };
  var DARK = { chords: [[0, 3, 7, 12], [0, 3, 7, 10], [-4, 0, 3, 8], [-5, -1, 2, 7]], bass: [0, 0, -4, -5] };
  var ARP = [0, 1, 2, 3, 2, 1, 3, 2];
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function create(ctx, dest) {
    var out = ctx.createGain(), comp = ctx.createDynamicsCompressor(), delay = ctx.createDelay(1), fb = ctx.createGain(), dlp = ctx.createBiquadFilter(), wet = ctx.createGain();
    comp.threshold.value = -16; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.18;
    out.gain.value = 0.8; out.connect(comp); comp.connect(dest);
    dlp.type = 'lowpass'; dlp.frequency.value = 2400; fb.gain.value = 0.36; wet.gain.value = 0.3;
    delay.connect(dlp); dlp.connect(fb); fb.connect(delay); dlp.connect(wet); wet.connect(out);
    var nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), nd = nb.getChannelData(0), seed = 1234567;
    for (var i = 0; i < nd.length; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; nd[i] = seed / 0x3fffffff - 1; }

    function env(g, t, a, peak, d) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
    function noise(t, dur, vol, type, f, q) {
      var s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = nb; fl.type = type; fl.frequency.value = f; fl.Q.value = q || 0.7;
      env(g, t, 0.002, vol, dur); s.connect(fl); fl.connect(g); g.connect(out); s.start(t, (t * 7.3) % 0.5); s.stop(t + dur + 0.05);
    }
    function kick(t, vol) {
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.setValueAtTime(155, t); o.frequency.exponentialRampToValueAtTime(44, t + 0.11);
      env(g, t, 0.003, vol, 0.3); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.4);
      noise(t, 0.015, vol * 0.25, 'highpass', 3000);
    }
    function snare(t, vol) {
      noise(t, 0.17, vol, 'bandpass', 1900, 0.6);
      var o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'triangle';
      o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.08);
      env(g, t, 0.002, vol * 0.6, 0.1); o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.15);
    }
    function rim(t, vol) { noise(t, 0.035, vol, 'bandpass', 2600, 2); }
    function hat(t, vol, open) { noise(t, open ? 0.14 : 0.035, vol, 'highpass', 7500); }
    function tone(t, f, dur, vol, type, cut, send, attack) {
      var o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = type; o.frequency.value = f; fl.type = 'lowpass'; fl.frequency.value = cut; fl.Q.value = 0.9;
      env(g, t, attack || 0.006, vol, dur); o.connect(fl); fl.connect(g); g.connect(out);
      if (send) { var sg = ctx.createGain(); sg.gain.value = send; g.connect(sg); sg.connect(delay); }
      o.start(t); o.stop(t + (attack || 0.006) + dur + 0.05);
    }
    function pad(t, dur, notes, vol, cut) {
      var fl = ctx.createBiquadFilter(), g = ctx.createGain();
      fl.type = 'lowpass'; fl.frequency.value = cut; fl.Q.value = 0.5;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.45); g.gain.setValueAtTime(vol, t + dur - 0.1); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.5);
      fl.connect(g); g.connect(out);
      notes.forEach(function (m) { [-7, 7].forEach(function (c) { var o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz(m); o.detune.value = c; o.connect(fl); o.start(t); o.stop(t + dur + 0.6); }); });
    }

    var mode = CHILL;
    // One sixteenth note. i counts up for ever; t is when it sounds.
    function step(i, t, heat, key) {
      var k = KEYS[key] || KEYS.menu, s = i % 16, bar = ((i / 16) | 0) % 4, sd = stepDur(heat, key);
      if (s === 0) mode = heat >= 0.6 ? DARK : CHILL;
      var ch = mode.chords[bar], rootM = k.root, calm = heat < 0.2, hot = heat >= 0.6, over = heat >= 0.8;
      delay.delayTime.setValueAtTime(Math.min(0.9, sd * 3), t);

      // pad: one chord a bar, brighter as it heats up, thinner under the alarm
      if (s === 0) pad(t, sd * 16, ch.map(function (n) { return rootM + n; }), 0.03 * (1 - heat * 0.4), 500 + heat * 1700);

      // arpeggio: quarter notes when calm, eighths in a wave, nervous sixteenths in trouble
      var ai = hot ? i % 16 : (s / 2) | 0;
      if (calm ? s % 4 === 0 : hot ? true : s % 2 === 0) {
        var n = ch[ARP[ai % 8] % ch.length] + (hot && s % 4 === 3 ? 12 : 0);
        if (hot) tone(t, hz(rootM + 12 + n), 0.09, 0.045 + 0.025 * (heat - 0.6), 'square', 1400 + heat * 2200, 0.25);
        else tone(t, hz(rootM + 12 + n), calm ? 0.5 : 0.28, calm ? 0.085 : 0.075, 'triangle', 2600, 0.6);
      }

      // bass: none when calm; a lazy syncopated line in a wave; driving eighths in trouble
      var b = hz(rootM - 12 + mode.bass[bar]);
      if (hot) { if (s % 2 === 0) tone(t, s % 4 === 2 ? b * 2 : b, sd * 1.6, 0.2, 'sawtooth', 260 + heat * 500); }
      else if (!calm && (s === 0 || s === 6 || s === 10)) tone(t, b, s === 0 ? sd * 5 : sd * 2.5, 0.24, 'triangle', 420);

      // drums
      if (!calm) {
        if (over ? s % 4 === 0 : hot ? (s % 4 === 0) : (s === 0 || s === 10)) kick(t, hot ? 0.62 : 0.5);
        if (s === 4 || s === 12) { if (hot) snare(t, 0.2 + 0.14 * (heat - 0.6) / 0.4); else rim(t, 0.14); }
        if (over && (s === 14 || (bar === 3 && s >= 12))) snare(t, 0.12);
        if (over) hat(t, s % 4 === 2 ? 0.075 : 0.04, s % 4 === 2);
        else if (heat >= 0.45) { if (s % 2 === 0) hat(t, s % 4 === 2 ? 0.065 : 0.035, false); }
        else if (s % 4 === 2) hat(t, 0.05, false);
      }

      // the alarm: two notes a semitone apart, trading bars
      if (over && (s === 0 || s === 8)) tone(t, hz(rootM + 24 + (s === 0 ? 0 : 1)), sd * 5, 0.05 + 0.04 * (heat - 0.8) / 0.2, 'square', 3200, 0.35, 0.01);
    }
    function stepDur(heat, key) { var k = KEYS[key] || KEYS.menu; return 60 / (k.bpm + RUSH * Math.max(0, heat - 0.35) / 0.65) / 4; }
    return { step: step, stepDur: stepDur, out: out };
  }

  // The live player: keeps a little ahead of the clock, easing the heat toward what the game asks for.
  function player(ctx, dest) {
    var E = null, vol = ctx.createGain(), timer = null, i = 0, next = 0, heat = 0.1, want = 0.1, key = 'menu', on = false;
    vol.gain.value = 0; vol.connect(dest);
    function tick() {
      while (next < ctx.currentTime + 0.14) {
        heat += (want - heat) * (want > heat ? 0.16 : 0.07);       // trouble arrives fast and leaves slowly
        E.step(i, next, heat, key);
        next += E.stepDur(heat, key); i++;
      }
    }
    return {
      start: function () {
        if (on) return; on = true;
        if (!E) E = create(ctx, vol);
        i = 0; next = ctx.currentTime + 0.08;
        vol.gain.cancelScheduledValues(ctx.currentTime); vol.gain.setValueAtTime(0.0001, ctx.currentTime); vol.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.6);
        timer = setInterval(tick, 30); tick();
      },
      stop: function () {
        if (!on) return; on = false; clearInterval(timer);
        vol.gain.cancelScheduledValues(ctx.currentTime); vol.gain.setValueAtTime(vol.gain.value, ctx.currentTime); vol.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      },
      heat: function (h) { want = Math.max(0, Math.min(1, h)); },
      key: function (k) { if (k !== key) { key = k; i = Math.ceil(i / 16) * 16; } },   // the new key comes in on a bar line
      get playing() { return on; }, get now() { return heat; }
    };
  }

  // Schedule `secs` of music on a context (an OfflineAudioContext, to make a clip). heatAt(t) gives the heat wanted at each moment.
  function render(ctx, secs, key, heatAt) {
    var E = create(ctx, ctx.destination), t = 0.05, i = 0, heat = heatAt(0);
    while (t < secs) { var w = heatAt(t); heat += (w - heat) * (w > heat ? 0.16 : 0.07); E.step(i, t, heat, key); t += E.stepDur(heat, key); i++; }
  }

  return { KEYS: KEYS, create: create, player: player, render: render };
});
