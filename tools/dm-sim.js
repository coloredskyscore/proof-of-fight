/* Doge Moon Crash balance check: two bots fly a handful of maps.
   Run: node tools/dm-sim.js   (prints times, hits and coins; also checks that a recorded run replays). */
var C = require('../js/dm-core.js');
function run(seed, skill) {
  var S = C.newRun('daily', seed), mv = null;
  while (!S.done) { if (S.tick % 4 === 0 || !mv) mv = C.bot(S, skill); C.play(S, mv.hold, mv.tx); S.ev.length = 0; }
  return S;
}
var ok = true, sharp = [], days = ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19'];
console.log('medals ' + C.PAR.map(C.fmt).join(' / '));
days.forEach(function (d) {
  var a = run(d, 1), b = run(d, 0.5), code = C.encode(a), R = C.decode(code), again = R && C.replay(R);
  if (!again || !again.done || again.ms !== a.ms || again.coins !== a.coins) { ok = false; console.log('  REPLAY MISMATCH', d); }
  sharp.push(a.ms);
  var kinds = {}; a.objs.forEach(function (o) { kinds[o.t] = (kinds[o.t] || 0) + 1; });
  console.log(d + '  sharp ' + C.fmt(a.ms) + ' (' + a.hits + ' hits, ' + a.oofs + ' oof, ' + a.coins + ' coins, combo ' + a.bestStreak + ')   casual ' + (b.ms ? C.fmt(b.ms) : 'timeout') + ' (' + b.hits + ' hits, ' + b.oofs + ' oof)   code ' + code.length + ' chars   ' + JSON.stringify(kinds));
});
var avg = sharp.reduce(function (s, v) { return s + v; }, 0) / sharp.length;
console.log('sharp average ' + C.fmt(avg) + '  -> suggested medals ' + [1.06, 1.18, 1.36].map(function (k) { return C.fmt(Math.round(avg * k / 1000) * 1000); }).join(' / '));
console.log(ok ? 'replays ok' : 'REPLAY PROBLEM');
process.exit(ok ? 0 : 1);
