#!/usr/bin/env node
// Measures each sound effect's raw peak in a real browser and rewrites the PEAK table in js/audio.js,
// so every sound plays at its target loudness. Run after changing a recipe:
//   python3 -m http.server 8765 --bind 127.0.0.1 &   (from the repo root)
//   PWPATH=$(npm root -g)/playwright node tools/sfx-levels.js
'use strict';
var fs = require('fs'), path = require('path');
var chromium = require(process.env.PWPATH || 'playwright').chromium;

(async function () {
  var b = await chromium.launch(), p = await b.newPage();
  await p.goto(process.env.URL || 'http://127.0.0.1:8765/');
  var peaks = await p.evaluate(async function () {
    var A = POF_AUDIO, out = {};
    for (var id of Object.keys(A.SFX)) {
      var info = id === 'super.midnight' ? { chars: Array.from({ length: 36 }, function (_, i) { return 0.45 + i * 0.05; }), off: 2.86 } : null;
      var runs = [];
      for (var k = 0; k < 3; k++) runs.push((await A.measure(id, info, true)).peak); // noise varies a little
      out[id] = Math.max.apply(null, runs);
    }
    return out;
  });
  await b.close();
  var file = path.join(__dirname, '..', 'js', 'audio.js'), src = fs.readFileSync(file, 'utf8');
  var table = '  // PEAK:start (written by tools/sfx-levels.js)\n  var PEAK = {\n' + Object.keys(peaks).map(function (id, i, all) {
    return "    '" + id + "': " + peaks[id].toFixed(3) + (i < all.length - 1 ? ',' : '');
  }).join('\n') + '\n  };\n  // PEAK:end';
  var a = src.indexOf('  // PEAK:start'), z = src.indexOf('  // PEAK:end');
  if (a < 0 || z < a) throw new Error('PEAK markers not found in js/audio.js');
  src = src.slice(0, a) + table + src.slice(z + '  // PEAK:end'.length);
  fs.writeFileSync(file, src);
  console.log('PEAK table updated for ' + Object.keys(peaks).length + ' sounds');
})();
