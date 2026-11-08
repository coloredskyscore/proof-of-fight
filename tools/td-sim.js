// Balance check for Tower Defense (?td): bots play the Hearing with the real rules (js/td-core.js).
// node tools/td-sim.js            -> every bot, a line per wave
// Each bot spends its tokens between waves on a build order, putting each tower on the open tile that
// covers the most path. "mix" is a sensible player; the one-tower bots show what a lopsided build gets.
// 'up' in an order upgrades the tower that has done the most damage; the up-a and up-b bots take every
// tower down that tier 3 path, so each path gets played.
'use strict';
var TD = require('../js/td-core.js');

var BOTS = {
  mix:     ['strike', 'strike', 'mint', 'privacy', 'rug', 'strike', 'mint', 'strike', 'rug', 'mint', 'privacy', 'strike'],
  strike:  ['strike'],
  mint:    ['mint'],
  nofly:   ['mint', 'privacy', 'rug', 'mint'],
  'up-a':  ['strike', 'strike', 'mint', 'privacy', 'rug', 'up', 'up', 'strike', 'up', 'mint', 'up', 'rug', 'up', 'up', 'privacy', 'up', 'strike', 'up'],
  'up-b':  ['strike', 'strike', 'mint', 'privacy', 'rug', 'up', 'up', 'strike', 'up', 'mint', 'up', 'rug', 'up', 'up', 'privacy', 'up', 'strike', 'up']
};
var PATH = { 'up-a': 'a', 'up-b': 'b' };

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

function run(name, order, quiet, path) {
  var G = TD.create(), k = 0, log = [];
  function spend() {
    for (;;) {
      var type = order[k % order.length];
      if (type === 'up') {
        var t = G.towers.filter(function (x) { return x.tier < 3; }).sort(function (a, b) { return b.dealt - a.dealt; })[0];
        if (!t) { k++; continue; }
        var opts = G.upgradeOptions(t), o = opts.length > 1 ? opts[(path || (rand() < 0.5 ? 'a' : 'b')) === 'a' ? 0 : 1] : opts[0];
        if (G.tokens < o.cost) return;
        G.upgrade(t.id, o.key);
        k++;
        continue;
      }
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
  var tiers = G.towers.map(function (t) { return t.tier; }), up = tiers.filter(function (x) { return x > 1; }).length;
  console.log(name + ': ' + G.phase + ' at wave ' + G.wave + ', integrity ' + G.integrity + '/' + G.maxIntegrity +
    ', ' + G.towers.length + ' towers' + (up ? ' (' + up + ' upgraded)' : '') + ', ' + Math.round(G.time) + 's');
  return G;
}

Object.keys(BOTS).forEach(function (n) { run(n, BOTS[n], n !== 'mix' && !process.argv.includes('-v'), PATH[n]); });
sloppy = true;
[1, 2, 3, 4, 5].forEach(function (s) { seed = s * 7919; run('sloppy mix #' + s, BOTS.mix, true); });
[1, 2, 3].forEach(function (s) { seed = s * 104729; run('sloppy upgrader #' + s, BOTS['up-a'], true); });
