/* Wen Lambo balance check: two bot drivers take every car down every stage.
   Run: node tools/wl-sim.js   (prints times, crashes and drafts; also checks that a recorded run replays). */
var C = require('../js/wl-core.js');
function run(stage, car, skill) {
  var S = C.newRun(stage, car, false);
  while (!S.done) { C.step(S, C.bot(S, skill)); S.ev.length = 0; }
  return S;
}
var ok = true;
C.STAGES.forEach(function (st) {
  var T = C.track(st.id);
  console.log('\n' + st.name + '  (' + T.finishSeg + ' segments, medals ' + C.PAR[st.id].map(C.fmt).join(' / ') + ')');
  C.CARS.forEach(function (car) {
    var a = run(st.id, car.id, 1), b = run(st.id, car.id, 0.5);
    var R = C.decode(C.encode(a)), again = R && C.replay(R);
    if (!again || again.ms !== a.ms || !again.done) { ok = false; console.log('  REPLAY MISMATCH', car.id); }
    console.log('  ' + (car.name + '            ').slice(0, 12) + ' sharp ' + C.fmt(a.ms) + ' (' + a.crashes + ' hits, ' + a.drafts + ' drafts)   casual ' + C.fmt(b.ms) + ' (' + b.crashes + ' hits)   code ' + C.encode(a).length + ' chars');
  });
});
console.log(ok ? '\nreplays ok' : '\nREPLAY PROBLEM');
process.exit(ok ? 0 : 1);
