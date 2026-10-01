#!/usr/bin/env node
// Balance simulator. Runs thousands of fights through the real engine.
//   node tools/sim.js               (balanced rules)
//   node tools/sim.js original      (original draft numbers)
'use strict';
var D = require('../js/data.js');
var E = require('../js/engine.js');

var rulesId = process.argv[2] || 'balanced';
var R = D.RULESETS[rulesId];
if (!R) { console.error('Unknown ruleset: ' + rulesId); process.exit(1); }
var N = Number(process.env.N || 2000);

// Player strategies. Each gets (fight, rng) and returns a move.
function superFirst(fn) {
  return function (fight, rng) {
    return E.canSuper(fight, 0) ? 'super' : fn(fight, rng);
  };
}
var STRATS = {
  'Strike only': superFirst(function () { return 'strike'; }),
  'Mint only': superFirst(function () { return 'mint'; }),
  'Rug only': superFirst(function () { return 'rug'; }),
  'Random mash': superFirst(function (f, rng) { return E.MOVES[Math.floor(rng() * 4)]; }),
  // Plays like a person who read the odds: best average damage, sometimes
  // hides, and hides when hypnotized.
  'Sensible': superFirst(function (fight, rng) {
    var F = D.FIGHTERS[fight.f[0].id];
    if (fight.f[0].hypnoNext) return 'privacy';
    if (rng() < 0.2) return 'privacy';
    var dm = function (m) { return E.moveDamage(F.id, m, R); };
    var best = 'strike', bestV = dm('strike');
    if (F.mint * dm('mint') > bestV) { best = 'mint'; bestV = F.mint * dm('mint'); }
    if (F.rug * dm('rug') > bestV) { best = 'rug'; }
    return best;
  })
};

function run(player, cpu, strat, rng) {
  var fight = E.newFight({ player: player, cpu: cpu, seed: Math.floor(rng() * 4294967296), rules: rulesId });
  while (!fight.over) {
    var st = E.playerStatus(fight);
    E.playTurn(fight, st.skipped ? null : strat(fight, rng));
  }
  return fight;
}

var rng = E.makeRng(12345);
var roster = D.ROSTER;
function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
function lpad(s, n) { s = String(s); while (s.length < n) s = ' ' + s; return s; }

console.log('Rules: ' + R.label + '  (Strike ' + R.strike + ', Mint ' + R.mint + ', Rug ' + R.rug +
  ', Rug hits Hidden: ' + (R.rugPiercesHidden ? 'yes' : 'no') + ')');
console.log('\nPlayer win % vs all CPUs, by how the player plays:');
var names = Object.keys(STRATS);
console.log(pad('', 14) + names.map(function (n) { return lpad(n, 13); }).join(''));
roster.forEach(function (p) {
  var row = names.map(function (name) {
    var wins = 0, total = 0;
    roster.forEach(function (c) {
      for (var i = 0; i < N / roster.length; i++) {
        var f = run(p, c, STRATS[name], rng);
        if (f.winner === 0) wins++;
        total++;
      }
    });
    return lpad(Math.round(100 * wins / total) + '%', 13);
  });
  console.log(pad(p, 14) + row.join(''));
});

console.log('\n"Sensible" player win % (rows = you, columns = CPU):');
console.log(pad('', 14) + roster.map(function (c) { return lpad(c.slice(0, 6), 8); }).join(''));
roster.forEach(function (p) {
  console.log(pad(p, 14) + roster.map(function (c) {
    var wins = 0;
    for (var i = 0; i < N / 4; i++) if (run(p, c, STRATS.Sensible, rng).winner === 0) wins++;
    return lpad(Math.round(100 * wins / (N / 4)) + '%', 8);
  }).join(''));
});

var ff = D.FIRST_FIGHT, turns = 0, supers = 0, wins = 0, M = 2000;
for (var i = 0; i < M; i++) {
  var f = run(ff.player, ff.cpu, STRATS.Sensible, rng);
  turns += f.turn;
  wins += f.winner === 0 ? 1 : 0;
  supers += f.moves.filter(function (m) { return m === 'x'; }).length;
}
console.log('\nFirst fight (' + ff.player + ' vs ' + ff.cpu + '), sensible player: wins ' +
  Math.round(100 * wins / M) + '%, avg ' + (turns / M).toFixed(1) + ' turns, avg ' +
  (supers / M).toFixed(1) + ' player Supers per fight');
