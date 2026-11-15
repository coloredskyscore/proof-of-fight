/* Records the code-made game music into WAV files for the hub's boombox (tools/boombox.py turns them into MP3s).
     node tools/boombox-render.js OUT_DIR
   51% Attack: its own js/a51-music.js render() on an OfflineAudioContext, with the heat rising from calm to overrun and back.
   Ride the Chart: the music lives inside js/dip.js's closure, so RIDE below is a copy of its musicTick() (same notes, same layers,
   same danger-driven filter). If the game's music changes, copy it again. Needs Playwright (preinstalled in the cloud box). */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const SR = 44100, SECS = 150;

// Heat / danger over the track: [time, value] points, eased between.
const A51_HEAT = [[0, 0.1], [20, 0.1], [24, 0.38], [54, 0.38], [58, 0.66], [88, 0.66], [92, 0.9], [124, 0.9], [128, 0.12], [150, 0.12]];
const RIDE_DANGER = [[0, 0], [16, 0.1], [22, 0.42], [50, 0.42], [56, 0.68], [86, 0.68], [92, 0.92], [122, 0.92], [128, 0.08], [150, 0.08]];
const RIDE_FEVER = [[64, 80]];   // a Bull Run: the square-wave lead on top

function RIDE(ctx, secs, curve, fever) {
  function at(c, t) { for (let i = 1; i < c.length; i++) if (t <= c[i][0]) { const [t0, v0] = c[i - 1], [t1, v1] = c[i]; return v0 + (v1 - v0) * (t - t0) / Math.max(1e-6, t1 - t0); } return c[c.length - 1][1]; }
  const master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
  const cut = ctx.createBiquadFilter(); cut.type = 'lowpass'; cut.frequency.value = 900;
  const musicG = ctx.createGain(); musicG.gain.value = 0.55; cut.connect(musicG); musicG.connect(master);
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = noiseBuf.getChannelData(0);
  let seed = 99; for (let i = 0; i < nd.length; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; nd[i] = seed / 0x3fffffff - 1; }
  function tone(type, f0, f1, t, dur, vol, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.012, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || master); o.start(t); o.stop(t + dur + 0.03);
  }
  function hiss(t, dur, vol, freq, type, dest) {
    const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = noiseBuf; f.type = type || 'highpass'; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f); f.connect(g); g.connect(dest || master); n.start(t, (t * 7.31) % 1); n.stop(t + dur + 0.03);
  }
  function midi(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  const ROOTS = [45, 41, 48, 43], CH = [[0, 3, 7], [0, 4, 7], [0, 4, 7], [0, 4, 7]], SPB = 60 / 116 / 4;
  const DARK_ROOTS = [45, 45, 41, 40], DARK = [[0, 3, 7], [0, 3, 8], [0, 4, 7], [0, 4, 7]];
  let e = 0, step = 0;
  for (let t = 0.06; t < secs; t += SPB, step++) {
    const want = at(curve, t); e += (want - e) * Math.min(1, SPB * (want > e ? 3 : 0.8));
    cut.frequency.setTargetAtTime(800 + 4600 * e, t, 0.25);
    const bar = Math.floor(step / 16) % 4, s16 = step % 16, dark = e > 0.55, r = (dark ? DARK_ROOTS : ROOTS)[bar], chords = dark ? DARK : CH;
    if (s16 === 0) chords[bar].forEach(function (iv, i) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = midi(r + 12 + iv); o.detune.value = (i - 1) * 9;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.5);
      g.gain.setValueAtTime(0.05, t + SPB * 13); g.gain.linearRampToValueAtTime(0.0001, t + SPB * 16.5);
      o.connect(g); g.connect(cut); o.start(t); o.stop(t + SPB * 17);
    });
    if (dark ? true : s16 % 2 === 0) tone('sawtooth', midi(r + (s16 % 8 === 6 ? 12 : 0)), 0, t, SPB * (dark ? 0.9 : 1.7), dark ? 0.13 : 0.16, cut);
    if (e > 0.3 && (dark ? s16 % 4 === 0 : s16 % 8 === 0 || s16 === 10)) tone('sine', 150, 42, t, 0.2, 0.55 * Math.min(1, (e - 0.2) * 2.5), musicG);
    if (e > 0.3 && (dark ? true : s16 % 4 === 2)) hiss(t, s16 % 4 === 2 ? 0.05 : 0.025, 0.018 + 0.03 * e, 8000, 'highpass', musicG);
    if (dark && (s16 === 4 || s16 === 12)) { hiss(t, 0.14, 0.11, 1600, 'bandpass', musicG); tone('triangle', 190, 140, t, 0.08, 0.12, musicG); }
    if (e > 0.8) {
      if (s16 === 0 || s16 === 8) { tone('sine', 62, 40, t, 0.16, 0.5, musicG); tone('sine', 58, 38, t + SPB * 1.2, 0.14, 0.35, musicG); }
      if (s16 === 0 && bar % 2 === 0) { tone('square', midi(r + 31), 0, t, SPB * 3, 0.03, musicG); tone('square', midi(r + 30), 0, t + SPB * 4, SPB * 3, 0.03, musicG); }
    }
    if (fever.some(function (f) { return t >= f[0] && t < f[1]; })) tone('square', midi(r + 36 + chords[bar][(s16 * 5) % 3] + (s16 % 4 === 3 ? 12 : 0)), 0, t, SPB * 0.9, 0.035, musicG);
  }
}

function wav(file, chans) {
  const n = chans[0].length, nc = chans.length, buf = Buffer.alloc(44 + n * nc * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * nc * 2, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); buf.writeUInt16LE(nc, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * nc * 2, 28);
  buf.writeUInt16LE(nc * 2, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * nc * 2, 40);
  for (let i = 0, o = 44; i < n; i++) for (let c = 0; c < nc; c++, o += 2) buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(chans[c][i] * 32767))), o);
  fs.writeFileSync(file, buf);
}

(async function () {
  const out = process.argv[2] || '.';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch(), page = await browser.newPage();
  await page.setContent('<html><body></body></html>');
  await page.addScriptTag({ content: fs.readFileSync(path.join(__dirname, '../js/a51-music.js'), 'utf8') });
  async function grab(name, fn) {
    const data = await page.evaluate(fn);
    wav(path.join(out, name + '.wav'), data.map(function (b64) { return new Float32Array(Buffer.from(b64, 'base64').buffer.slice(0)); }));
    console.log('wrote', name);
  }
  const enc = 'function enc(f){var u=new Uint8Array(f.buffer),s="";for(var i=0;i<u.length;i+=32768)s+=String.fromCharCode.apply(null,u.subarray(i,i+32768));return btoa(s);}';
  await grab('a51', '(async function(){' + enc +
    'var heat=' + JSON.stringify(A51_HEAT) + ';function at(t){for(var i=1;i<heat.length;i++)if(t<=heat[i][0]){var a=heat[i-1],b=heat[i];return a[1]+(b[1]-a[1])*(t-a[0])/Math.max(1e-6,b[0]-a[0]);}return heat[heat.length-1][1];}' +
    'var ctx=new OfflineAudioContext(2,' + SR * SECS + ',' + SR + ');POF_A51_MUSIC.render(ctx,' + SECS + ',"vault",at);var b=await ctx.startRendering();return [enc(b.getChannelData(0)),enc(b.getChannelData(1))];})()');
  await grab('ride', '(async function(){' + enc + RIDE.toString() +
    'var ctx=new OfflineAudioContext(2,' + SR * SECS + ',' + SR + ');RIDE(ctx,' + SECS + ',' + JSON.stringify(RIDE_DANGER) + ',' + JSON.stringify(RIDE_FEVER) + ');var b=await ctx.startRendering();return [enc(b.getChannelData(0)),enc(b.getChannelData(1))];})()');
  await browser.close();
})();
