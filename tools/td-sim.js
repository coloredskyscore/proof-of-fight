// Balance check for Tower Defense (?td): bots play the Hearing with the real rules (js/td-core.js).
// node tools/td-sim.js            -> every bot, a line per wave
// Each bot spends its tokens between waves on a build order, putting each tower on the open tile that
// covers the most path. "mix" is a sensible player; the one-tower bots show what a lopsided build gets.
'use strict';
var TD = require('../js/td-core.js');

var BOTS = {
  mix:     ['strike', 'strike', 'mint', 'privacy', 'rug', 'strike', 'mint', 'strike', 'rug', 'mint', 'privacy', 'strike'],
  strike:  ['strike'],
  mint:    ['mint'],
  nofly:   ['mint', 'privacy', 'rug', 'mint']
};

function coverage(G, type, c, r) {
  var T = TD.TOWERS[type], h = G.map.height(c, r), range = T.range + (type === 'rug' ? 0 : h), n = 0;
  for (var d = 0; d < G.map.length; d += 0.25) {
    var p = G.map.at(d), dd = Math.hypot(p.x - c - 0.5, p.y - r - 0.5);
    if (dd <= range && !(T.minRange && dd < T.minRange)) n += 1 + d / G.map.length; // later path counts a bit more
  }
  return n;
}
// sloppy: picks at random from the better half of the tiles instead of the best one, like a casual player.
var sloppy = false, seed = 7;
function rand() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
function bestTile(G, type) {
  var all = [];
  for (var r = 0; r < G.map.def.rows; r++) for (var c = 0; c < G.map.def.cols; c++) {
    if (G.canBuild(type, c, r)) all.push({ at: [c, r], s: coverage(G, type, c, r) });
  }
  if (!all.length) return null;
  all.sort(function (a, b) { return b.s - a.s; });
  return (sloppy ? all[Math.floor(rand() * Math.ceil(all.length / 2))] : all[0]).at;
}

function run(name, order, quiet) {
  var G = TD.create(), k = 0, log = [];
  function spend() {
    for (;;) {
      var type = order[k % order.length];
      if (G.tokens < TD.TOWERS[type].cost) return;
      var at = bestTile(G, type);
      if (!at) return;
      G.build(type, at[0], at[1]);
      k++;
    }
  }
  spend();
  G.startWave();
  var lastWave = 1, before = G.integrity;
  while (G.phase !== 'won' && G.phase !== 'lost' && G.time < 3600) {
    G.step(1 / 60);
    if (G.phase === 'break') {
      spend();
      log.push('w' + G.wave + ' lost ' + (before - G.integrity) + ' (' + G.towers.length + ' towers, ' + G.tokens + ' left)');
      before = G.integrity;
      G.startWave(); // calls it early: a fast player
    }
  }
  if (!quiet) log.forEach(function (l) { console.log('  ' + l); });
  console.log(name + ': ' + G.phase + ' at wave ' + G.wave + ', integrity ' + G.integrity + '/' + G.maxIntegrity +
    ', ' + G.towers.length + ' towers, ' + Math.round(G.time) + 's');
  return G;
}

Object.keys(BOTS).forEach(function (n) { run(n, BOTS[n], n !== 'mix' && !process.argv.includes('-v')); });
sloppy = true;
[1, 2, 3, 4, 5].forEach(function (s) { seed = s * 7919; run('sloppy mix #' + s, BOTS.mix, true); });
