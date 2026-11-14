#!/usr/bin/env node
// Mempool balance check. Run: node tools/mp-sim.js [games]
// Two players: a casual one (a move every 1.6 s, ignores rugs, sloppy fits) and a sharp one (a move every
// 0.8 s, packs tight, keeps rugs away from fees). Also checks that every run replays from its code.
'use strict';
var C = require('../js/mp-core.js');
var games = +process.argv[2] || 60;

function play(mode, skill, seed) {
  var G = C.create({ mode: mode, seed: seed }), rnd = C.rng('bot' + seed), every = skill === 'casual' ? 32 : 16, think = 0;
  while (G.state === 'play' && G.tick < C.TPS * 3600) {
    if (++think >= every) {
      var m = C.bot(G, skill, rnd);
      if (m) { think = 0; if (m.mine) C.mineNow(G); else C.place(G, m.slot, m.x, m.y); }
    }
    C.step(G); G.events.length = 0;
  }
  return G;
}
function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
['daily', 'endless'].forEach(function (mode) {
  console.log('\n' + mode.toUpperCase());
  ['casual', 'sharp'].forEach(function (skill) {
    var score = 0, fill = 0, full = 0, fat = 0, blocks = 0, orphan = 0, lost = 0, secs = 0, lo = 1e12, hi = 0, bad = 0;
    for (var s = 1; s <= games; s++) {
      var G = play(mode, skill, 'sim' + s);
      score += G.score; lo = Math.min(lo, G.score); hi = Math.max(hi, G.score); secs += G.tick / C.TPS;
      G.blocks.forEach(function (b) { blocks++; fill += b.fill; if (b.full) full++; else if (b.mult > 1) fat++; if (b.orphan) orphan++; lost += b.lost; });
      var code = C.encode(G), R = C.replay(C.decode(code));
      if (!R || R.score !== G.score || R.tick !== G.tick) bad++;
    }
    console.log('  ' + pad(skill, 7) + ' avg score ' + pad(Math.round(score / games), 8) + ' (' + lo + ' to ' + hi + ')  blocks/run ' + pad((blocks / games).toFixed(1), 5) +
      ' fill ' + pad((fill / blocks * 100).toFixed(0) + '%', 4) + ' full ' + pad((full / blocks * 100).toFixed(0) + '%', 4) + ' 90%+ ' + pad((fat / blocks * 100).toFixed(0) + '%', 4) +
      ' orphaned ' + pad((orphan / blocks * 100).toFixed(0) + '%', 4) + ' rugged fees/block ' + pad(Math.round(lost / blocks), 6) + ' time ' + (secs / games).toFixed(0) + 's' + (bad ? '  REPLAY FAILED x' + bad : ''));
  });
});
