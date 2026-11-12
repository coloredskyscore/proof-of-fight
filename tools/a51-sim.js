#!/usr/bin/env node
// 51% Attack balance check. Run: node tools/a51-sim.js [games]
// Plays the stage with three players: one who does nothing (must lose fast), a lazy one who only holds
// the front six nodes (should usually lose), and an active one (should usually win, with a scare).
'use strict';
var C = require('../js/a51-core.js');
var games = +process.argv[2] || 40;

function play(skill, seed) {
  var G = C.create({ seed: seed }), dt = 1 / 30, think = 0;
  while (G.state === 'play' && G.t < 900) {
    think += dt;
    if (skill !== 'idle' && think >= 0.4) { think = 0; C.bot(G, skill); }
    G.update(dt); G.events.length = 0;
  }
  return G;
}
['idle', 'lazy', 'active'].forEach(function (skill) {
  var wins = 0, t = 0, wave = 0, cons = 0, home = 0;
  for (var s = 1; s <= games; s++) {
    var G = play(skill, s * 7919);
    if (G.state === 'won') { wins++; cons += G.consensus(); home += G.N[G.HOME].hp; }
    t += G.t; wave += G.wave;
  }
  console.log(pad(skill, 7) + ' wins ' + pad(wins + '/' + games, 6) + ' avg time ' + pad((t / games).toFixed(0) + 's', 5) +
    ' avg wave ' + (wave / games).toFixed(1) + (wins ? '  (on a win: consensus ' + (cons / wins).toFixed(0) + '%, home ' + (home / wins).toFixed(1) + '/20)' : ''));
});
function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
