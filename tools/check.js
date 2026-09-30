#!/usr/bin/env node
// Rules checks. Run: node tools/check.js
'use strict';
var assert = require('assert');
var D = require('../js/data.js');
var E = require('../js/engine.js');

var passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('ok   ' + name); }
  catch (e) { console.error('FAIL ' + name + '\n     ' + e.message); process.exitCode = 1; }
}

// Replace the fight's dice with a fixed list of rolls.
function rig(fight, rolls) {
  var i = 0;
  fight.rng = function () {
    if (i >= rolls.length) throw new Error('ran out of rigged rolls');
    return rolls[i++];
  };
}
// Roll value that makes the CPU pick `move` from its weight table.
function cpuRoll(cpuId, move) {
  var w = D.FIGHTERS[cpuId].ai, keys = Object.keys(w), total = 0, before = 0, k;
  for (k = 0; k < keys.length; k++) total += w[keys[k]];
  for (k = 0; k < keys.length && keys[k] !== move; k++) before += w[keys[k]];
  return (before + w[move] / 2) / total;
}
function has(events, pred) { return events.some(pred); }

test('Supers cannot be dodged (XRP Army vs a successful hide)', function () {
  var f = E.newFight({ player: 'garlinghouse', cpu: 'adam', seed: 1 });
  f.f[0].blocks = 10;
  rig(f, [cpuRoll('adam', 'privacy'), 0 /* hide succeeds */]);
  var ev = E.playTurn(f, 'super');
  assert(has(ev, function (e) { return e.t === 'hide' && e.ok; }), 'Adam should have hidden');
  assert.strictEqual(f.f[1].hp, 100 - 25);
});

test('Rug hits Hidden targets in balanced rules', function () {
  var f = E.newFight({ player: 'mert', cpu: 'adam', seed: 1 });
  rig(f, [cpuRoll('adam', 'privacy'), 0 /* hide ok */, 0 /* rug ok */]);
  E.playTurn(f, 'rug');
  assert.strictEqual(f.f[1].hp, 100 - D.RULESETS.balanced.rug);
});

test('Rug misses Hidden targets in original rules', function () {
  var f = E.newFight({ player: 'mert', cpu: 'adam', seed: 1, rules: 'original' });
  rig(f, [cpuRoll('adam', 'privacy'), 0, 0]);
  var ev = E.playTurn(f, 'rug');
  assert.strictEqual(f.f[1].hp, 100);
  assert(has(ev, function (e) { return e.t === 'miss'; }));
});

test('Strike and Mint miss Hidden targets', function () {
  var f = E.newFight({ player: 'toly', cpu: 'adam', seed: 1 });
  rig(f, [cpuRoll('adam', 'privacy'), 0, cpuRoll('adam', 'privacy'), 0, 0 /* mint ok */]);
  E.playTurn(f, 'strike');
  E.playTurn(f, 'mint');
  assert.strictEqual(f.f[1].hp, 100);
});

test('Helius Flare blinds: the target skips its NEXT turn only', function () {
  var f = E.newFight({ player: 'mert', cpu: 'saylor', seed: 1 });
  f.f[0].blocks = 10;
  rig(f, [cpuRoll('saylor', 'strike'), /* turn 2: CPU skipped, no roll */ /* turn 3: */ cpuRoll('saylor', 'strike')]);
  var t1 = E.playTurn(f, 'super');
  assert.strictEqual(f.f[0].hp, 100 - D.RULESETS.balanced.strike, 'Saylor still acts on the Super turn');
  assert(has(t1, function (e) { return e.t === 'status' && e.status === 'blind'; }));
  var t2 = E.playTurn(f, 'strike');
  assert(has(t2, function (e) { return e.t === 'skip' && e.who === 1; }), 'CPU skips turn 2');
  var hpBefore = f.f[0].hp;
  E.playTurn(f, 'strike');
  assert(f.f[0].hp < hpBefore, 'CPU acts again on turn 3');
});

test('Ultra Sound Moves: hypnotized attacker hits itself next turn', function () {
  var f = E.newFight({ player: 'vitalik', cpu: 'saylor', seed: 1 });
  f.f[0].blocks = 10;
  rig(f, [
    cpuRoll('saylor', 'privacy'), 0.99 /* hide fails */, 0 /* fail line */,
    cpuRoll('saylor', 'strike'), 0 /* Vitalik hides */
  ]);
  E.playTurn(f, 'super');
  var afterSuper = f.f[1].hp;
  assert.strictEqual(afterSuper, 105 - D.SUPERS.dance.dmg);
  assert.strictEqual(f.f[1].hypnoNext, true);
  var ev = E.playTurn(f, 'privacy');
  assert(has(ev, function (e) { return e.t === 'hit' && e.attacker === 1 && e.target === 1 && e.self; }));
  assert.strictEqual(f.f[0].hp, 100, 'Vitalik takes nothing');
});

test('HODL halves damage this turn and next, then wears off', function () {
  var f = E.newFight({ player: 'saylor', cpu: 'toly', seed: 1 });
  f.f[0].blocks = 10;
  rig(f, [cpuRoll('toly', 'strike'), cpuRoll('toly', 'strike'), cpuRoll('toly', 'strike')]);
  E.playTurn(f, 'super');
  assert.strictEqual(f.f[0].hp, 105 - 5);
  E.playTurn(f, 'strike');
  assert.strictEqual(f.f[0].hp, 105 - 10);
  E.playTurn(f, 'strike');
  assert.strictEqual(f.f[0].hp, 105 - 20);
});

test('OP_RETURN prunes HODL before it hits', function () {
  var f = E.newFight({ player: 'adam', cpu: 'saylor', seed: 1 });
  f.f[0].blocks = 10;
  f.f[1].hodl = 2;
  rig(f, [cpuRoll('saylor', 'privacy'), 0.99 /* hide fails */, 0 /* fail line */]);
  E.playTurn(f, 'super');
  assert.strictEqual(f.f[1].hp, 105 - D.SUPERS.opreturn.dmg);
});

test('CPU fires Super the turn its meter is full', function () {
  var f = E.newFight({ player: 'toly', cpu: 'vitalik', seed: 1 });
  f.f[1].blocks = 10;
  rig(f, [0 /* player hides; Supers ignore it */]);
  var ev = E.playTurn(f, 'privacy');
  assert(has(ev, function (e) { return e.t === 'super' && e.who === 1; }));
});

test('Fight ends the instant someone hits 0 (player acts first)', function () {
  var f = E.newFight({ player: 'toly', cpu: 'mert', seed: 1 });
  f.f[1].hp = 5;
  rig(f, [cpuRoll('mert', 'strike')]);
  E.playTurn(f, 'strike');
  assert.strictEqual(f.over, true);
  assert.strictEqual(f.winner, 0);
  assert.strictEqual(f.f[0].hp, 100, 'CPU never got to strike back');
  assert.strictEqual(f.finish, D.FINISH.strike);
});

test('Rug fail at 0 Blocks costs 5 HP recoil', function () {
  var f = E.newFight({ player: 'adam', cpu: 'vitalik', seed: 1 });
  // Dice order: CPU move, Privacy rolls, then attacks.
  rig(f, [cpuRoll('vitalik', 'privacy'), 0.99 /* hide fails */, 0 /* fail line */, 0.99 /* rug fails */]);
  E.playTurn(f, 'rug');
  assert.strictEqual(f.f[0].hp, 100 - D.RULESETS.balanced.rugRecoil);
});

test('Toly Super KO reads HATER CONVERTED', function () {
  var f = E.newFight({ player: 'toly', cpu: 'mert', seed: 1 });
  f.f[0].blocks = 10;
  f.f[1].hp = 30;
  rig(f, [cpuRoll('mert', 'strike')]);
  E.playTurn(f, 'super');
  assert.strictEqual(f.finish, 'HATER CONVERTED');
  assert.strictEqual(f.finishCause, 'super');
});

test('Toly beating Saylor, any way, reads THERE IS A SECOND BEST', function () {
  var f = E.newFight({ player: 'saylor', cpu: 'toly', seed: 1 });
  f.f[0].hp = 5;
  rig(f, [cpuRoll('toly', 'strike'), 0.99 /* Saylor's hide fails */, 0 /* fail line */]);
  E.playTurn(f, 'privacy');
  assert.strictEqual(f.winner, 1);
  assert.strictEqual(f.finish, 'THERE IS A SECOND BEST');
  assert.strictEqual(f.finishCause, 'strike');
});

test('10,000 random fights: always end, HP and Blocks stay in range, replays match', function () {
  var rng = E.makeRng(99);
  for (var n = 0; n < 10000; n++) {
    var p = D.ROSTER[Math.floor(rng() * 7)], c = D.ROSTER[Math.floor(rng() * 7)];
    var opts = { player: p, cpu: c, seed: Math.floor(rng() * 4294967296), rules: rng() < 0.5 ? 'balanced' : 'original' };
    var f = E.newFight(opts);
    while (!f.over) {
      var st = E.playerStatus(f);
      var mv = st.skipped ? null : (st.canSuper && rng() < 0.7 ? 'super' : E.MOVES[Math.floor(rng() * 4)]);
      E.playTurn(f, mv);
      f.f.forEach(function (x) {
        assert(x.hp >= 0 && x.hp <= x.maxHp, 'hp out of range');
        assert(x.blocks >= 0 && x.blocks <= D.MAX_BLOCKS, 'blocks out of range');
      });
      assert(f.turn <= D.TURN_CAP, 'turn cap exceeded');
    }
    assert(f.winner === 0 || f.winner === 1);
    assert.strictEqual(f.grid.length, f.moves.length);
    var r = E.replay(opts, f.moves.join(''));
    assert.strictEqual(r.winner, f.winner, 'replay winner mismatch');
    assert.strictEqual(r.f[0].hp, f.f[0].hp, 'replay hp mismatch');
    assert.strictEqual(r.f[1].hp, f.f[1].hp, 'replay hp mismatch');
  }
});

console.log('\n' + passed + ' checks passed' + (process.exitCode ? ', some FAILED' : ''));
