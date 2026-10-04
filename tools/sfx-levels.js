#!/usr/bin/env node
// Measures sound effects' raw peaks in a real browser and rewrites the PEAK table in js/audio.js,
// so every sound plays at its target loudness.
//   python3 -m http.server 8765 --bind 127.0.0.1 &   (from the repo root)
//   PWPATH=$(npm root -g)/playwright node tools/sfx-levels.js                    new sounds only
//   PWPATH=$(npm root -g)/playwright node tools/sfx-levels.js sergey.strike     + a recipe you changed
//   ALL=1 PWPATH=$(npm root -g)/playwright node tools/sfx-levels.js             everything
// Noise makes each measurement differ a little, so sounds you didn't name keep their levels.
'use strict';
var fs = require('fs'), path = require('path');
var chromium = require(process.env.PWPATH || 'playwright').chromium;

(async function () {
  var file = path.join(__dirname, '..', 'js', 'audio.js'), src = fs.readFileSync(file, 'utf8');
  var a = src.indexOf('  // PEAK:start'), z = src.indexOf('  // PEAK:end');
  if (a < 0 || z < a) throw new Error('PEAK markers not found in js/audio.js');
  var old = {}, m, re = /'([^']+)': ([0-9.]+)/g, table = src.slice(a, z);
  while ((m = re.exec(table))) old[m[1]] = Number(m[2]);
  var named = process.argv.slice(2);

  var b = await chromium.launch(), p = await b.newPage();
  await p.goto(process.env.URL || 'http://127.0.0.1:8765/');
  var peaks = await p.evaluate(async function (args) {
    var A = POF_AUDIO, out = {};
    for (var id of Object.keys(A.SFX)) {
      if (!args.all && id in args.old && args.named.indexOf(id) < 0) { out[id] = args.old[id]; continue; }
      var info = id === 'super.midnight' ? { chars: Array.from({ length: 36 }, function (_, i) { return 0.45 + i * 0.05; }), off: 2.86 } : null;
      var runs = [];
      for (var k = 0; k < 3; k++) runs.push((await A.measure(id, info, true)).peak); // noise varies a little
      out[id] = Math.max.apply(null, runs);
    }
    return out;
  }, { old: old, named: named, all: !!process.env.ALL });
  await b.close();
  var measured = Object.keys(peaks).filter(function (id) { return process.env.ALL || !(id in old) || named.indexOf(id) >= 0; });
  var out = '  // PEAK:start (written by tools/sfx-levels.js)\n  var PEAK = {\n' + Object.keys(peaks).map(function (id, i, all) {
    return "    '" + id + "': " + peaks[id].toFixed(3) + (i < all.length - 1 ? ',' : '');
  }).join('\n') + '\n  };\n  // PEAK:end';
  src = src.slice(0, a) + out + src.slice(z + '  // PEAK:end'.length);
  fs.writeFileSync(file, src);
  console.log('Measured ' + measured.length + ' sounds' + (measured.length ? ': ' + measured.join(', ') : '') +
    ' (' + Object.keys(peaks).length + ' in the table)');
})();
