/* Sui Swell balance check: two bots surf a handful of heats.
   Run: node tools/sw-sim.js   (prints wave scores; also checks that a recorded heat replays). */
var C = require('../js/sw-core.js');
function run(seed, skill, every) {
  var S = C.newRun('daily', seed), mv = false;
  while (S.phase !== 'done') {
    if (S.phase === 'between') C.next(S);
    if (S.tick % every === 0) mv = C.bot(S, skill);
    C.play(S, mv); S.ev.length = 0;
  }
  return S;
}
function line(S) {
  return C.fmt(S.total) + ' [' + S.results.map(function (r) {
    return C.fmt(r.pts) + (r.out ? '' : ' WIPE:' + r.where) + ' d' + r.drops + '/' + r.nDrops + ' a' + r.airs + '+' + r.spins + ' t' + r.tdrops + '/' + r.nT + ' s' + r.scrapes + ' h' + r.hits;
  }).join(' | ') + ']';
}
var ok = true, days = ['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19'];
days.forEach(function (d) {
  var a = run(d, 1, 3), b = run(d, 0.5, 9), code = C.encode(a), R = C.decode(code), again = R && C.replay(R);
  if (!again || again.phase !== 'done' || again.total !== a.total || again.n !== a.n) { ok = false; console.log('  REPLAY MISMATCH', d, again && again.total, a.total); }
  console.log(d + '  sharp ' + line(a) + '  code ' + code.length);
  console.log('            casual ' + line(b));
});
// A bot that never touches the button, and one that never lets go.
[false, true].forEach(function (h) {
  var S = C.newRun('daily', days[0]);
  while (S.phase !== 'done') { if (S.phase === 'between') C.next(S); C.play(S, h); S.ev.length = 0; }
  console.log((h ? 'always hold  ' : 'never touch  ') + line(S));
});
console.log(ok ? 'replays ok' : 'REPLAY PROBLEM');
process.exit(ok ? 0 : 1);
