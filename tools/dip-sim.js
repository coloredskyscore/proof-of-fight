/* Buy the Dip balance check: node tools/dip-sim.js
   Runs three bots over Bitcoin's chart and a few daily charts and prints how far each gets.
   never = never presses; random = presses at random; human = holds on the way down and lets go on the way up, 0.18 s late; smart = the look-ahead bot from js/dip-core.js. */
global.window = {};
require('../js/dip-data.js');
var C = require('../js/dip-core.js');
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
var charts = [['btc', C.makeTerrain({ mode: 'btc', data: window.POF_DIP_DATA })]];
['2026-11-11', '2026-11-12', '2026-11-13'].forEach(function (d) { charts.push([d, C.makeTerrain({ mode: 'daily', seed: d })]); });
charts.forEach(function (c) {
  console.log(c[0] + ' (' + c[1].name + ', ' + c[1].coins.length + ' sats)');
  Object.keys(bots).forEach(function (b) { console.log('  ' + b.padEnd(7) + run(C.makeTerrain(c[0] === 'btc' ? { mode: 'btc', data: window.POF_DIP_DATA } : { mode: 'daily', seed: c[0] }), bots[b])); });
});
(function () {
  var T = charts[0][1], a = [];
  for (var x = 0; x < T.real * C.DAY; x += 11) a.push(Math.abs(T.slope(x)));
  a.sort(function (p, q) { return p - q; });
  console.log('btc slope 50/90/99/max', [0.5, 0.9, 0.99, 1].map(function (q) { return a[Math.min(a.length - 1, Math.floor(q * a.length))].toFixed(2); }).join(' '));
})();
