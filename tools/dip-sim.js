/* Buy the Dip balance check: node tools/dip-sim.js
   Runs bots over each chain's chart and a few daily charts and prints how far each gets.
   never = never presses; random = presses at random; human = holds on the way down and lets go on the way up, 0.18 s late; smart = the look-ahead bot from js/dip-core.js. */
global.window = {};
require('../js/dip-data.js');
require('../js/dip-data-sol.js');
require('../js/dip-data-link.js');
var C = require('../js/dip-core.js');
var CH = require('../js/dip-chains.js');
function chainTerrain(id) { var c = CH.CHAINS[id]; return C.makeTerrain({ mode: 'chain', chain: c, data: window[c.dataVar] }); }
var DT = 1 / 120;
var bots = {
  never: function () { return false; },
  random: function (S) { return Math.floor(S.t * 2.5) % 2 === 0 ? Math.sin(S.t * 7.3) > 0 : Math.sin(S.t * 3.1) > 0.3; },
  human: (function () { var q = []; return function (S) { var T = S.T; q.push(!S.air ? T.slope(S.x + 20) < -0.05 : S.vy < 0 && T.slope(S.x + S.vx * 0.12) < 0); return q.length > 22 ? q.shift() : false; }; })(),
  smart: (function () { var h = false, k = 0; return function (S) { if (k++ % 4 === 0) h = C.bot(S); return h; }; })()
};
function run(T, bot) {
  var S = C.newRun(T), ev = { perfect: 0, bad: 0, fever: 0, launch: 0 }, vs = 0, n = 0;
  while (!S.dead && S.t < 900) {
    C.step(S, bot(S), DT);
    S.ev.forEach(function (e) { if (ev[e.type] != null) ev[e.type]++; }); S.ev.length = 0;
    vs += S.vx; n++;
  }
  return (T.dateAt(S.x) || 'day ' + T.dayAt(S.x)) + '  t=' + S.t.toFixed(0) + 's  avg ' + (vs / n).toFixed(0) + ' u/s  score ' + C.score(S) +
    '  sats ' + S.coins + '  perfect ' + ev.perfect + '  bad ' + ev.bad + '  fever ' + ev.fever + '  launches ' + ev.launch + '  maxAlt ' + S.maxAlt.toFixed(0);
}
var charts = CH.ORDER.concat(['2026-11-11', '2026-11-12', '2026-11-13']);
function pool(day) { return CH.mysteryIds(day).map(function (id) { return { chain: CH.CHAINS[id], data: window[CH.CHAINS[id].dataVar] }; }); }
function terrainOf(id) { return CH.CHAINS[id] ? chainTerrain(id) : C.makeTerrain({ mode: 'daily', seed: id, pool: pool(id) }); }
charts.forEach(function (id) {
  var T0 = terrainOf(id);
  console.log(id + ' (' + T0.name + ', ' + T0.coins.length + ' sats)');
  Object.keys(bots).forEach(function (b) { console.log('  ' + b.padEnd(7) + run(terrainOf(id), bots[b])); });
});
(function () {
  var T = chainTerrain('btc'), a = [];
  for (var x = 0; x < T.real * C.DAY; x += 11) a.push(Math.abs(T.slope(x)));
  a.sort(function (p, q) { return p - q; });
  console.log('btc slope 50/90/99/max', [0.5, 0.9, 0.99, 1].map(function (q) { return a[Math.min(a.length - 1, Math.floor(q * a.length))].toFixed(2); }).join(' '));
})();
