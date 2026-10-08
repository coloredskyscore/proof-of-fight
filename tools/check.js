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
var EVERYONE = D.ROSTER.concat(Object.keys(D.BOSSES)); // every kit: founders and story bosses

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

test('CEO of Helium blinds: the target skips its NEXT turn only', function () {
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

test('Badger Dance: hypnotized attacker hits itself next turn', function () {
  var f = E.newFight({ player: 'vitalik', cpu: 'charles', seed: 1 });
  f.f[0].blocks = 10;
  rig(f, [
    cpuRoll('charles', 'privacy'), 0.99 /* hide fails */, 0 /* fail line */,
    cpuRoll('charles', 'strike'), 0 /* Vitalik hides */
  ]);
  E.playTurn(f, 'super');
  var afterSuper = f.f[1].hp;
  assert.strictEqual(afterSuper, 100 - D.SUPERS.dance.dmg);
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
  assert.strictEqual(f.f[0].hp, 100 - 5);
  E.playTurn(f, 'strike');
  assert.strictEqual(f.f[0].hp, 100 - 10);
  E.playTurn(f, 'strike');
  assert.strictEqual(f.f[0].hp, 100 - 20);
});

test('OP_RETURN prunes HODL before it hits', function () {
  var f = E.newFight({ player: 'adam', cpu: 'saylor', seed: 1 });
  f.f[0].blocks = 10;
  f.f[1].hodl = 2;
  rig(f, [cpuRoll('saylor', 'strike')]);
  E.playTurn(f, 'super');
  assert.strictEqual(f.f[1].hp, 100 - D.SUPERS.opreturn.dmg);
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
  assert.strictEqual(f.finishCause, 'strike');
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
  rig(f, [cpuRoll('toly', 'strike')]); // STRF rolls no dice; braced, the 10 becomes 5
  E.playTurn(f, 'privacy');
  assert.strictEqual(f.winner, 1);
  assert.strictEqual(f.finish, 'THERE IS A SECOND BEST');
  assert.strictEqual(f.finishCause, 'strike');
});

test('Toly: Comrades KO reads CHEAP FAST CHAIN GUD; MEV Hunt KO reads its success line', function () {
  var f = E.newFight({ player: 'toly', cpu: 'mert', seed: 1 });
  f.f[1].hp = 5;
  rig(f, [cpuRoll('mert', 'strike')]);
  E.playTurn(f, 'strike');
  assert.strictEqual(f.finish, 'CHEAP FAST CHAIN GUD');
  var g = E.newFight({ player: 'toly', cpu: 'mert', seed: 1 });
  g.f[1].hp = 5;
  rig(g, [cpuRoll('mert', 'strike'), 0 /* MEV Hunt lands */]);
  E.playTurn(g, 'rug');
  assert.strictEqual(g.finish, 'DRONE THE SANDWICHERS');
});

test('A renamed button without its own KO line finishes with its success line, never the generic one', function () {
  var f = E.newFight({ player: 'charles', cpu: 'adam', seed: 1 });
  f.f[1].hp = 5;
  rig(f, [cpuRoll('adam', 'strike'), 0 /* Peer Review lands */]);
  E.playTurn(f, 'mint');
  assert.strictEqual(f.finish, 'PEER REVIEWED');
  D.ROSTER.forEach(function (id) {
    var M = D.FIGHTERS[id].moves || {};
    ['mint', 'rug'].forEach(function (m) {
      if (M[m]) assert(M[m].ko || M[m].ok, id + ' ' + m + ': needs a KO or success line');
    });
  });
});

test('Mert Super KO reads TRILLIONS', function () {
  var f = E.newFight({ player: 'mert', cpu: 'adam', seed: 1 });
  f.f[0].blocks = 10;
  f.f[1].hp = D.SUPERS.helium.dmg;
  rig(f, [cpuRoll('adam', 'strike')]);
  E.playTurn(f, 'super');
  assert.strictEqual(f.finish, 'TRILLIONS');
});

test('Renamed buttons fit on a phone and have their banner lines', function () {
  EVERYONE.forEach(function (id) {
    var F = D.FIGHTERS[id];
    Object.keys(F.moves || {}).forEach(function (m) {
      var mv = F.moves[m];
      assert(D.DEFAULT_MOVES[m], id + ': unknown button ' + m);
      assert(mv.name && mv.name.length <= 12, id + ' ' + m + ': name must be 1-12 characters');
      assert(mv.icon, id + ' ' + m + ': needs an icon');
      if (m !== 'strike') assert(mv.ok, id + ' ' + m + ': needs an ok line');
      if (m !== 'strike' && !(m === 'privacy' && F.brace)) assert(mv.fail, id + ' ' + m + ': needs a fail line');
    });
    Object.keys(F.repeatLine || {}).forEach(function (m) {
      assert(D.DEFAULT_MOVES[m], id + ': repeatLine for unknown button ' + m);
      assert(typeof F.repeatLine[m] === 'string' && F.repeatLine[m], id + ': repeatLine ' + m + ' needs text');
    });
    if (!F.moves || !F.moves.mint) assert(F.mintFail, id + ': needs mintFail');
    if (!F.moves || !F.moves.rug) assert(F.rugFail, id + ': needs rugFail');
  });
});

test('Fighter art files exist (head = portrait, body = stage sprite)', function () {
  var fs = require('fs'), path = require('path');
  EVERYONE.forEach(function (id) {
    var art = D.FIGHTERS[id].art || {};
    Object.keys(art).forEach(function (k) {
      assert(k === 'head' || k === 'body', id + ': unknown art slot ' + k);
      assert(fs.existsSync(path.join(__dirname, '..', art[k])), id + ': missing ' + art[k]);
    });
  });
});

test('Story art files exist (boss stages, Satoshi)', function () {
  var fs = require('fs'), path = require('path');
  Object.keys(D.BOSSES).forEach(function (id) {
    var bg = D.BOSSES[id].boss.stage.bg;
    if (bg) assert(fs.existsSync(path.join(__dirname, '..', bg)), id + ': missing ' + bg);
  });
  Object.keys(D.GUESTS).forEach(function (id) {
    var head = D.GUESTS[id].art.head;
    assert(fs.existsSync(path.join(__dirname, '..', head)), id + ': missing ' + head);
  });
  Object.keys(D.BOSSES).forEach(function (id) {
    var tg = D.BOSSES[id].tagIn;
    if (tg) assert(D.GUESTS[tg.ally], id + ': tags in ' + tg.ally + ', who is not in GUESTS');
  });
  var sat = D.STORY.satoshi.art || {};
  Object.keys(sat).forEach(function (k) { assert(fs.existsSync(path.join(__dirname, '..', sat[k])), 'missing ' + sat[k]); });
});

test('STRF always works: half damage from Strike/Mint/Rug, +1 Block, never hidden', function () {
  var f = E.newFight({ player: 'saylor', cpu: 'garlinghouse', seed: 1 });
  rig(f, [cpuRoll('garlinghouse', 'rug'), 0 /* rug lands */]);
  var ev = E.playTurn(f, 'privacy');
  assert.strictEqual(f.f[0].hp, 100 - Math.ceil(D.RULESETS.balanced.rug / 2));
  assert(ev.some(function (e) { return e.t === 'hide' && e.ok && e.brace; }));
  assert(!ev.some(function (e) { return e.snap && e.snap[0].hidden; }), 'never hidden');
});

test('STRF does not halve Supers, and does not stack with HODL', function () {
  var f = E.newFight({ player: 'saylor', cpu: 'toly', seed: 1 });
  f.f[1].blocks = 10;
  rig(f, []);
  E.playTurn(f, 'privacy');
  assert.strictEqual(f.f[0].hp, 100 - D.SUPERS.salesman.dmg);
  f.f[0].hodl = 2;
  rig(f, [cpuRoll('toly', 'strike')]);
  var before = f.f[0].hp;
  E.playTurn(f, 'privacy');
  assert.strictEqual(before - f.f[0].hp, 5, 'braced + HODL is still half, not a quarter');
});

test('Saylor uses his own damage: STRK 20, STRD 30', function () {
  assert.strictEqual(E.moveDamage('saylor', 'mint', D.RULESETS.balanced), 20);
  assert.strictEqual(E.moveDamage('saylor', 'rug', D.RULESETS.balanced), 30);
  assert.strictEqual(E.moveDamage('saylor', 'strike', D.RULESETS.balanced), 10);
  var f = E.newFight({ player: 'saylor', cpu: 'adam', seed: 1 });
  rig(f, [cpuRoll('adam', 'strike'), 0 /* STRK lands */]);
  E.playTurn(f, 'mint');
  assert.strictEqual(f.f[1].hp, 80);
});

test('MSTR is high beta: rolls 15-45 when it lands, averages 30', function () {
  var seen = {}, total = 0, n = 0;
  for (var seed = 1; seed <= 4000; seed++) {
    var f = E.newFight({ player: 'saylor', cpu: 'adam', seed: seed });
    var ev = E.playTurn(f, 'rug');
    ev.forEach(function (e) {
      if (e.t === 'hit' && e.attacker === 0 && e.move === 'rug') {
        assert(e.base >= 15 && e.base <= 45, 'MSTR rolled ' + e.base);
        seen[e.base] = true; total += e.base; n++;
      }
    });
  }
  assert(n > 500, 'MSTR should land about a quarter of the time');
  assert(seen[15] && seen[45], 'both extremes can happen');
  assert(Math.abs(total / n - 30) < 1.5, 'average ' + (total / n).toFixed(1));
});

test('MSTR KO reads NUMBER GO UP', function () {
  var f = E.newFight({ player: 'saylor', cpu: 'adam', seed: 1 });
  f.f[1].hp = 5;
  rig(f, [cpuRoll('adam', 'strike'), 0 /* MSTR lands */, 0.5 /* roll */]);
  E.playTurn(f, 'rug');
  assert.strictEqual(f.finish, 'NUMBER GO UP');
});

test('STRC KO reads STRETCH; Saylor beating Toly reads THERE IS NO SECOND BEST', function () {
  var f = E.newFight({ player: 'saylor', cpu: 'adam', seed: 1 });
  f.f[1].hp = 5;
  rig(f, [cpuRoll('adam', 'strike')]);
  E.playTurn(f, 'strike');
  assert.strictEqual(f.finish, 'STRETCH');
  var g = E.newFight({ player: 'saylor', cpu: 'toly', seed: 1 });
  g.f[1].hp = 5;
  rig(g, [cpuRoll('toly', 'strike')]);
  E.playTurn(g, 'strike');
  assert.strictEqual(g.finish, 'THERE IS NO SECOND BEST');
});

test('Charles: Super KO reads LFG 2027, Glacier Drop KO reads BANK THE UNBANKED', function () {
  var f = E.newFight({ player: 'charles', cpu: 'adam', seed: 1 });
  f.f[0].blocks = 10;
  f.f[1].hp = 10;
  rig(f, [cpuRoll('adam', 'strike')]);
  E.playTurn(f, 'super');
  assert.strictEqual(f.finish, 'LFG 2027');
  var g = E.newFight({ player: 'charles', cpu: 'adam', seed: 1 });
  g.f[1].hp = 5;
  rig(g, [cpuRoll('adam', 'strike')]);
  E.playTurn(g, 'strike');
  assert.strictEqual(g.finish, 'BANK THE UNBANKED');
});

test('Charles beating Mert, any way, reads BIGGER THAN ZOLANA', function () {
  var f = E.newFight({ player: 'charles', cpu: 'mert', seed: 1 });
  f.f[0].blocks = 10;
  f.f[1].hp = 10;
  rig(f, [cpuRoll('mert', 'strike')]);
  E.playTurn(f, 'super');
  assert.strictEqual(f.finish, 'BIGGER THAN ZOLANA');
});

test('Garlinghouse: XRP Army KO reads WE WON. THEY LOST.; Settle KO reads PERFECT CAN\'T BE THE ENEMY OF GOOD', function () {
  var f = E.newFight({ player: 'garlinghouse', cpu: 'adam', seed: 1 });
  f.f[0].blocks = 10;
  f.f[1].hp = 12;
  rig(f, [cpuRoll('adam', 'strike')]);
  E.playTurn(f, 'super');
  assert.strictEqual(f.finish, 'WE WON. THEY LOST.');
  var g = E.newFight({ player: 'garlinghouse', cpu: 'adam', seed: 1 });
  g.f[1].hp = 5;
  rig(g, [cpuRoll('adam', 'strike')]);
  E.playTurn(g, 'strike');
  assert.strictEqual(g.finish, "PERFECT CAN'T BE THE ENEMY OF GOOD");
});

test('Adam: OP_RETURN KO reads CHECKMATE FORKERS, Hashcash KO reads GAME OVER', function () {
  var f = E.newFight({ player: 'adam', cpu: 'toly', seed: 1 });
  f.f[0].blocks = 10;
  f.f[1].hp = 20;
  rig(f, [cpuRoll('toly', 'strike')]);
  E.playTurn(f, 'super');
  assert.strictEqual(f.finish, 'CHECKMATE FORKERS');
  var g = E.newFight({ player: 'adam', cpu: 'toly', seed: 1 });
  g.f[1].hp = 5;
  rig(g, [cpuRoll('toly', 'strike')]);
  E.playTurn(g, 'strike');
  assert.strictEqual(g.finish, 'GAME OVER');
});

test('Vitalik: dance KO reads THERE IS ONLY LOVE, Essay Drop KO reads READ THE BLOG POST', function () {
  var f = E.newFight({ player: 'vitalik', cpu: 'toly', seed: 1 });
  f.f[0].blocks = 10;
  f.f[1].hp = 10;
  rig(f, [cpuRoll('toly', 'strike')]);
  E.playTurn(f, 'super');
  assert.strictEqual(f.finish, 'THERE IS ONLY LOVE');
  var g = E.newFight({ player: 'vitalik', cpu: 'toly', seed: 1 });
  g.f[1].hp = 5;
  rig(g, [cpuRoll('toly', 'strike')]);
  E.playTurn(g, 'strike');
  assert.strictEqual(g.finish, 'READ THE BLOG POST');
});

test('Sergey: The Shirt never hides; when it works they lose their NEXT turn and he gets +3 Blocks', function () {
  var f = E.newFight({ player: 'sergey', cpu: 'mert', seed: 1 });
  rig(f, [cpuRoll('mert', 'strike'), 0 /* the shirt works */, /* turn 2: Mert stares, no roll */ /* turn 3: */ cpuRoll('mert', 'strike')]);
  var t1 = E.playTurn(f, 'privacy');
  assert.strictEqual(f.f[0].hp, 100 - D.RULESETS.balanced.strike, 'Mert still hits him on the shirt turn');
  assert(has(t1, function (e) { return e.t === 'hide' && e.ok && e.stun; }));
  assert(!has(t1, function (e) { return e.t === 'miss'; }), 'nothing misses: he did not hide');
  assert.strictEqual(f.f[0].blocks, D.BLOCKS.privacyOk + D.BLOCKS.gotHit);
  assert.strictEqual(f.f[1].skipNext, 'stun');
  var t2 = E.playTurn(f, 'strike');
  assert(has(t2, function (e) { return e.t === 'skip' && e.who === 1 && e.reason === 'stun'; }), 'Mert loses turn 2');
  assert.strictEqual(f.f[0].hp, 90, 'nobody hit Sergey on turn 2');
  E.playTurn(f, 'strike');
  assert.strictEqual(f.f[0].hp, 80, 'Mert acts again on turn 3');

  var g = E.newFight({ player: 'sergey', cpu: 'mert', seed: 1 });
  rig(g, [cpuRoll('mert', 'strike'), 0.99 /* the shirt flops */]);
  var ev = E.playTurn(g, 'privacy');
  assert(has(ev, function (e) { return e.t === 'hide' && !e.ok && e.stun; }));
  assert.strictEqual(g.f[1].skipNext, null);
  assert.strictEqual(g.f[0].blocks, D.BLOCKS.privacyFail + D.BLOCKS.gotHit);
});

test('Sergey: Link Marines hit 4 times for 6 and drain 3 Blocks; KO lines', function () {
  var f = E.newFight({ player: 'sergey', cpu: 'toly', seed: 1 });
  f.f[0].blocks = 10;
  f.f[1].blocks = 5;
  rig(f, [cpuRoll('toly', 'privacy'), 0 /* Toly hides: no help against a Super */]);
  var ev = E.playTurn(f, 'super');
  assert.strictEqual(ev.filter(function (e) { return e.t === 'hit' && e.move === 'super'; }).length, 4);
  assert.strictEqual(f.f[1].hp, 100 - 24);
  assert.strictEqual(f.f[1].blocks, 5 - 3 + D.BLOCKS.privacyOk);
  var k = E.newFight({ player: 'sergey', cpu: 'toly', seed: 1 });
  k.f[0].blocks = 10;
  k.f[1].hp = 20;
  rig(k, [cpuRoll('toly', 'strike')]);
  E.playTurn(k, 'super');
  assert.strictEqual(k.finish, 'THE TOKEN IS NEEDED');
  var g = E.newFight({ player: 'sergey', cpu: 'toly', seed: 1 });
  g.f[1].hp = 5;
  rig(g, [cpuRoll('toly', 'strike')]);
  E.playTurn(g, 'strike');
  assert.strictEqual(g.finish, 'THE DATA ARRIVED');
  var r = E.newFight({ player: 'sergey', cpu: 'garlinghouse', seed: 1 });
  r.f[1].hp = 5;
  rig(r, [cpuRoll('garlinghouse', 'strike')]);
  E.playTurn(r, 'strike');
  assert.strictEqual(r.finish, 'THE MARINES OUTRANK THE ARMY');
});

test('CZ: Ignore FUD always works: red and pink do nothing, purple does half', function () {
  var f = E.newFight({ player: 'cz', cpu: 'toly', seed: 1 });
  rig(f, [cpuRoll('toly', 'strike')]);
  var ev = E.playTurn(f, 'privacy');
  assert.strictEqual(f.f[0].hp, 100, 'Comrades bounced off');
  assert(has(ev, function (e) { return e.t === 'miss' && e.ignored; }));
  rig(f, [cpuRoll('toly', 'mint'), 0 /* Slop Cannon lands */]);
  E.playTurn(f, 'privacy');
  assert.strictEqual(f.f[0].hp, 100, 'Slop Cannon bounced off');
  rig(f, [cpuRoll('toly', 'rug'), 0 /* MEV Hunt lands */]);
  E.playTurn(f, 'privacy');
  assert.strictEqual(f.f[0].hp, 100 - D.RULESETS.balanced.rug / 2, 'purple does half');
});

test('CZ: 4 hits for 20, then red, pink and purple do nothing to him this turn and next; Supers still do', function () {
  var f = E.newFight({ player: 'cz', cpu: 'toly', seed: 1 });
  f.f[0].blocks = 10;
  rig(f, [cpuRoll('toly', 'strike')]);
  E.playTurn(f, 'super');
  assert.strictEqual(f.f[1].hp, 80);
  assert.strictEqual(f.f[0].hp, 100, 'Toly hit him the same turn: nothing');
  rig(f, [cpuRoll('toly', 'strike')]);
  E.playTurn(f, 'strike');
  assert.strictEqual(f.f[0].hp, 100, 'next turn: still nothing');
  rig(f, [cpuRoll('toly', 'strike')]);
  E.playTurn(f, 'strike');
  assert.strictEqual(f.f[0].hp, 90, 'the turn after: it wore off');
  var g = E.newFight({ player: 'cz', cpu: 'toly', seed: 1 });
  g.f[0].blocks = 10;
  g.f[1].blocks = 10;
  rig(g, []);
  E.playTurn(g, 'super');
  assert.strictEqual(g.f[0].hp, 100 - D.SUPERS.salesman.dmg, "Toly's Super still lands");
});

test('Adeniyi: Walrus stores a dodged hit and adds it to his next hit that lands', function () {
  var f = E.newFight({ player: 'adeniyi', cpu: 'toly', seed: 1 });
  rig(f, [cpuRoll('toly', 'mint'), 0 /* Walrus hides */, 0 /* Slop Cannon "lands" on nobody */]);
  var ev = E.playTurn(f, 'privacy');
  assert.strictEqual(f.f[0].hp, 100);
  assert.strictEqual(f.f[0].stored, D.RULESETS.balanced.mint);
  assert(has(ev, function (e) { return e.t === 'status' && e.status === 'stored'; }));
  rig(f, [cpuRoll('toly', 'strike')]);
  var t2 = E.playTurn(f, 'strike');
  assert.strictEqual(f.f[1].hp, 100 - 10 - D.RULESETS.balanced.mint, 'Zero Fee + the stored Slop Cannon');
  assert(has(t2, function (e) { return e.t === 'hit' && e.attacker === 0 && e.bonus === D.RULESETS.balanced.mint; }));
  assert.strictEqual(f.f[0].stored, 0);
});

test('CZ and Adeniyi KO lines', function () {
  function ko(p, move, line) {
    var f = E.newFight({ player: p, cpu: 'toly', seed: 1 });
    if (move === 'super') f.f[0].blocks = 10;
    f.f[1].hp = 5;
    rig(f, [cpuRoll('toly', 'strike')]);
    E.playTurn(f, move);
    assert.strictEqual(f.finish, line, p + ' ' + move);
  }
  ko('cz', 'super', '4 MONTHS');
  ko('cz', 'strike', 'FUNDS ARE SAFU');
  ko('adeniyi', 'super', 'MATERIALISED.');
  ko('adeniyi', 'strike', 'NO FEE. STILL HITS.');
});

test('A fighter joining the Daily Fight draw later says when (dailyFrom is a real date)', function () {
  D.ROSTER.forEach(function (id) {
    var from = D.FIGHTERS[id].dailyFrom;
    if (!from) return;
    assert(/^\d{4}-\d\d-\d\d$/.test(from) && !isNaN(new Date(from + 'T12:00:00')), id + ': dailyFrom ' + from);
    assert(from > D.DAILY_EPOCH, id + ': dailyFrom before the first daily');
  });
});

test('Sound: every fighter has a sound for every button outcome and their Super; recipes are valid', function () {
  var AU = require('../js/audio.js');
  var WAVES = ['sine', 'square', 'sawtooth', 'triangle', 'noise'];
  function check(id, info) {
    var r = AU.SFX[id];
    assert(r, 'missing sound ' + id);
    var vs = typeof r === 'function' ? r(info) : r;
    assert(vs.length, id + ': no voices');
    vs.forEach(function (v) {
      assert(WAVES.indexOf(v.w) >= 0, id + ': bad wave ' + v.w);
      assert(v.w === 'noise' || v.f, id + ': needs a pitch');
      assert(!(v.v > 1), id + ': volume above 1');
      assert(v.d > 0 && v.d < 6, id + ': length');
    });
  }
  EVERYONE.forEach(function (id) {
    [['strike', 'ok'], ['strike', 'miss'], ['privacy', 'ok'], ['privacy', 'fail'], ['mint', 'ok'], ['mint', 'fail'],
      ['rug', 'ok'], ['rug', 'fail']].forEach(function (p) {
      AU.moveSounds(id, p[0], p[1]).forEach(function (s) { check(s); });
    });
    check('super.' + D.FIGHTERS[id].super.id, { chars: [0.5, 0.6], off: 2.8 });
  });
  ['tap', 'ko', 'ready', 'win', 'lose', 'slam', 'stomp', 'prune', 'drain', 'hodl', 'snore', 'huh', 'stare', 'deflect', 'stored', 'splash', 'flop', 'selfhit', 'super.astronaut',
    'assist', 'satoshi', 'coin', 'tick', 'clank', 'bailout', 'paper', 'banned', 'beanbag',
    'lev.up', 'lev.close', 'liquidated', 'wick.prelude']
    .forEach(function (s) { check(s); });
  Object.keys(AU.CLIPS).forEach(function (id) {
    var c = AU.CLIPS[id];
    assert(/\.mp3$/.test(c.src), id + ': clips are MP3 (every browser plays it)');
    assert(require('fs').existsSync(require('path').join(__dirname, '..', c.src)), id + ': missing ' + c.src);
    assert(c.level > 0 && c.level <= 1, id + ': level');
    assert(!(c.skip >= 0.2), id + ': skip cuts too much');
  });
  Object.keys(AU.MUSIC).forEach(function (k) {
    var m = AU.MUSIC[k];
    assert(m.loopStart < m.loopEnd, k + ': loop points');
    assert(require('fs').existsSync(require('path').join(__dirname, '..', m.src)), k + ': missing ' + m.src);
  });
});

test('Story: bosses are full kits that never show up in Free play or the Daily Fight', function () {
  Object.keys(D.BOSSES).forEach(function (id) {
    var B = D.FIGHTERS[id];
    assert.strictEqual(B, D.BOSSES[id], id + ': registered in FIGHTERS');
    assert(D.ROSTER.indexOf(id) < 0, id + ': not in the roster');
    assert(D.STORY.ladder.some(function (r) { return r.id === id; }), id + ': on the ladder');
    assert(B.boss.hp > 0 && B.boss.stage && B.boss.stage.sky, id + ': HP and a stage');
    assert(D.SUPERS[B.super.id], id + ': Super effect');
    var f = E.newFight({ player: 'toly', cpu: id, seed: 1 });
    assert.strictEqual(f.f[1].hp, B.boss.hp, id + ': fights with boss HP');
  });
  D.ROSTER.forEach(function (id) { assert(D.FIGHTERS[id].assistLine, id + ': needs an assistLine'); });
});

test('Story: the ally jumps in once, at 35% HP or lower, for 20 that nothing stops', function () {
  var f = E.newFight({ player: 'toly', cpu: 'schiff', seed: 1 });
  assert(!E.canAssist(f), 'not at full HP');
  f.f[0].hp = Math.floor(f.f[0].maxHp * D.STORY.assistAt);
  assert(E.canAssist(f), 'lit at 35%');
  f.f[1].shield = 2; f.f[1].hodl = 2;
  var ev = E.assist(f, 'mert');
  assert.strictEqual(f.f[1].hp, D.BOSSES.schiff.boss.hp - D.STORY.assistDmg, 'no halving, no shield');
  assert.strictEqual(ev[0].line, D.FIGHTERS.mert.assistLine);
  assert(!E.canAssist(f), 'once per fight');
  assert.throws(function () { E.assist(f, 'mert'); });
  var g = E.newFight({ player: 'toly', cpu: 'schiff', seed: 1 });
  g.f[0].hp = 10; g.f[1].hp = 15;
  ev = E.assist(g, 'saylor');
  assert(g.over && g.winner === 0, 'an assist can land the KO');
  assert.strictEqual(g.finish, 'THERE IS NO SECOND BEST', 'Saylor has his own line for Schiff');
  assert(ev.some(function (e) { return e.t === 'ko' && e.cause === 'assist'; }));
});

test('Story: Satoshi gets a knocked-out fighter back up with half HP, and the fight goes on', function () {
  var f = E.newFight({ player: 'vitalik', cpu: 'schiff', seed: 7 });
  while (!f.over) E.playTurn(f, E.playerStatus(f).skipped ? null : 'privacy');
  assert(f.winner === 1 && f.f[0].hp === 0, 'blue only loses');
  var turn = f.turn, bossHp = f.f[1].hp;
  E.revive(f, 0);
  assert(!f.over && f.winner === null && f.finish === null);
  assert.strictEqual(f.f[0].hp, Math.ceil(f.f[0].maxHp * D.STORY.reviveHp));
  assert.strictEqual(f.f[1].hp, bossHp, 'the boss keeps their HP');
  assert.strictEqual(f.turn, turn + 1);
  E.playTurn(f, 'strike');
  assert.throws(function () { var g = E.newFight({ player: 'toly', cpu: 'schiff', seed: 1 }); E.revive(g, 0); }, 'only after a KO');
});

test('Story: Dimon is bailed out once (too big to fail); the second knockout sticks', function () {
  var f = E.newFight({ player: 'toly', cpu: 'dimon', seed: 1 });
  f.f[0].blocks = 10;
  f.f[1].hp = 5;
  var ev = E.playTurn(f, 'super');
  assert(!f.over, 'first knockout cancelled');
  assert.strictEqual(f.f[1].hp, D.BOSSES.dimon.bailout.hp);
  assert(ev.some(function (e) { return e.t === 'bailout'; }) && !ev.some(function (e) { return e.t === 'ko'; }));
  assert(!ev[ev.length - 1].snap[1].bailout, 'the HUD stops showing BAILOUT');
  f.f[0].blocks = 10;
  f.f[1].hp = 5;
  E.playTurn(f, 'super');
  assert(f.over && f.winner === 0 && f.finish === 'HATER CONVERTED', 'no second bailout');
  var g = E.newFight({ player: 'adam', cpu: 'dimon', seed: 1 });
  g.f[0].hp = 20; g.f[1].hp = 10;
  ev = E.assist(g, 'adam');
  assert(!g.over && g.f[1].hp === D.BOSSES.dimon.bailout.hp, 'an assist knockout is bailed out too');
  var h = E.newFight({ player: 'toly', cpu: 'dimon', seed: 1 });
  h.f[1].hp = 5; h.f[1].bailedOut = true;
  rig(h, [cpuRoll('dimon', 'strike')]);
  E.playTurn(h, 'strike');
  assert.strictEqual(h.finish, 'CHEAP FAST CHAIN GUD');
  var k = E.newFight({ player: 'mert', cpu: 'dimon', seed: 1 });
  k.f[0].hp = 5; k.f[1].bailedOut = true;
  rig(k, [cpuRoll('dimon', 'strike'), 0.99 /* Zolana hide fails */, 0 /* its fail line */]);
  E.playTurn(k, 'privacy');
  assert.strictEqual(k.finish, 'HYPED-UP FRAUD');
});

test('Story: Warren\'s Letter makes you skip a turn (hiding doesn\'t help, CZ ignores it); Vote No halves', function () {
  var f = E.newFight({ player: 'mert', cpu: 'warren', seed: 1 });
  rig(f, [cpuRoll('warren', 'mint'), 0 /* Zolana hides */, 0 /* the Letter lands */]);
  var ev = E.playTurn(f, 'privacy');
  assert(ev.some(function (e) { return e.t === 'letter' && e.target === 0; }), 'the letter lands on a hidden Mert');
  assert.strictEqual(f.f[0].hp, 100, 'no damage');
  assert.strictEqual(E.playerStatus(f).skipped, 'letter');
  var g = E.newFight({ player: 'cz', cpu: 'warren', seed: 1 });
  rig(g, [cpuRoll('warren', 'mint'), 0]);
  ev = E.playTurn(g, 'privacy');
  assert(ev.some(function (e) { return e.t === 'miss' && e.ignored; }) && !E.playerStatus(g).skipped, 'Ignore FUD ignores the letter');
  var h = E.newFight({ player: 'toly', cpu: 'warren', seed: 1 });
  rig(h, [cpuRoll('warren', 'privacy')]);
  E.playTurn(h, 'strike');
  assert.strictEqual(h.f[1].hp, D.BOSSES.warren.boss.hp - 5, 'Vote No halves a strike');
  assert.strictEqual(h.f[1].blocks, 3 + 1, 'Vote No gives 3 Blocks (+1 for being hit)');
  var k = E.newFight({ player: 'toly', cpu: 'warren', seed: 1 });
  rig(k, [cpuRoll('warren', 'strike')]);
  E.playTurn(k, 'strike');
  assert.strictEqual(k.f[0].hp, 100 - 12, 'Bad Actors does 12');
});

test('Story: Warren\'s BANNED: once, at half HP, your purple is banned for 2 turns', function () {
  var f = E.newFight({ player: 'toly', cpu: 'warren', seed: 1 });
  f.f[1].hp = Math.floor(f.f[1].maxHp / 2) + 5;
  rig(f, [cpuRoll('warren', 'strike')]);
  var ev = E.playTurn(f, 'strike');
  assert(ev.some(function (e) { return e.t === 'ban' && e.who === 0 && e.move === 'rug'; }), 'banned at half HP');
  assert.strictEqual(E.playerStatus(f).banned, 'rug');
  assert.throws(function () { E.playTurn(f, 'rug'); }, /Banned/);
  rig(f, [cpuRoll('warren', 'strike')]);
  E.playTurn(f, 'strike');
  assert.strictEqual(E.playerStatus(f).bannedTurns, 1);
  rig(f, [cpuRoll('warren', 'strike')]);
  ev = E.playTurn(f, 'strike');
  assert(ev.some(function (e) { return e.t === 'unban'; }) && !E.playerStatus(f).banned, 'legal again after 2 turns');
  f.f[1].hp = 10;
  rig(f, [cpuRoll('warren', 'privacy')]);
  ev = E.playTurn(f, 'strike');
  assert(!ev.some(function (e) { return e.t === 'ban'; }), 'only once');
});

test('Story: Warren\'s Plan hits 4 times for 5 and you skip your next turn; her KO lines; every boss has an opening line', function () {
  var f = E.newFight({ player: 'toly', cpu: 'warren', seed: 1 });
  f.f[1].blocks = 10;
  rig(f, []);
  E.playTurn(f, 'strike');
  assert.strictEqual(f.f[0].hp, 100 - 20);
  assert.strictEqual(E.playerStatus(f).skipped, 'letter');
  var g = E.newFight({ player: 'toly', cpu: 'warren', seed: 1 });
  g.f[0].hp = 5; g.f[1].blocks = 10;
  rig(g, []);
  E.playTurn(g, 'strike');
  assert.strictEqual(g.finish, 'NATIONAL SECURITY');
  var h = E.newFight({ player: 'garlinghouse', cpu: 'warren', seed: 1 });
  h.f[1].hp = 5; h.f[1].banUsed = true;
  rig(h, [cpuRoll('warren', 'strike')]);
  E.playTurn(h, 'strike');
  assert.strictEqual(h.finish, 'CHARTER APPROVED');
  Object.keys(D.BOSSES).forEach(function (id) { assert(D.BOSSES[id].boss.intro, id + ': needs an opening line'); });
});

test('Story: SBF\'s 1) Fine takes 2 of your Blocks; his Super is one big hit; his KO lines', function () {
  var f = E.newFight({ player: 'toly', cpu: 'sbf', seed: 1 });
  f.f[0].blocks = 5;
  rig(f, [cpuRoll('sbf', 'strike')]);
  var ev = E.playTurn(f, 'strike');
  assert(ev.some(function (e) { return e.t === 'hit' && e.attacker === 1 && e.move === 'strike' && e.stolen === 2; }), 'he took 2 Blocks');
  var g = E.newFight({ player: 'toly', cpu: 'sbf', seed: 1 });
  rig(g, [cpuRoll('sbf', 'strike'), 0.99 /* the hide fails: +1 Block */, 0, 0]);
  ev = E.playTurn(g, 'privacy');
  assert(ev.some(function (e) { return e.t === 'hit' && e.attacker === 1 && e.stolen === 1; }), 'only what you have');
  assert.strictEqual(g.f[0].blocks, 0 + D.BLOCKS.gotHit, 'left with the Block for being hit');
  var h = E.newFight({ player: 'toly', cpu: 'sbf', seed: 1 });
  h.f[1].blocks = 10;
  rig(h, []);
  E.playTurn(h, 'strike');
  assert.strictEqual(h.f[0].hp, 100 - D.SUPERS.what.dmg, '1) What is one big hit');
  var k = E.newFight({ player: 'toly', cpu: 'sbf', seed: 1 });
  k.f[0].hp = 5; k.f[1].blocks = 10;
  rig(k, []);
  E.playTurn(k, 'strike');
  assert.strictEqual(k.finish, '1) WHAT');
  var m = E.newFight({ player: 'cz', cpu: 'sbf', seed: 1 });
  m.f[1].hp = 5; m.f[1].taggedIn = true;
  rig(m, [cpuRoll('sbf', 'strike')]);
  E.playTurn(m, 'strike');
  assert.strictEqual(m.finish, "DEAL'S OFF", 'CZ has his own line for SBF');
});

test('Story: Caroline tags in for SBF once, at 35% HP: 3 beanbags that can\'t be dodged', function () {
  var TG = D.BOSSES.sbf.tagIn, f = E.newFight({ player: 'mert', cpu: 'sbf', seed: 1 });
  f.f[1].hp = Math.floor(f.f[1].maxHp * TG.at) + 1;
  f.f[0].shield = 0;
  rig(f, [cpuRoll('sbf', 'mint'), 0.99 /* his League flops */, 0, 0, 0]);
  var ev = E.playTurn(f, 'strike');
  var tag = ev.filter(function (e) { return e.t === 'tagin'; });
  assert.strictEqual(tag.length, 1, 'tagged in');
  assert.strictEqual(tag[0].ally, 'caroline');
  var bags = ev.filter(function (e) { return e.t === 'hit' && e.move === 'tagin'; });
  assert.strictEqual(bags.length, TG.hits);
  assert(bags.every(function (e) { return e.amount === TG.dmg && e.target === 0; }));
  var hp = f.f[0].hp;
  rig(f, [cpuRoll('sbf', 'mint'), 0.99, 0, 0, 0]);
  ev = E.playTurn(f, 'strike');
  assert(!ev.some(function (e) { return e.t === 'tagin'; }), 'only once');
  assert.strictEqual(f.f[0].hp, hp, 'no more beanbags');
  // A beanbag knockout ends on her line.
  var g = E.newFight({ player: 'toly', cpu: 'sbf', seed: 1 });
  g.f[1].hp = Math.floor(g.f[1].maxHp * TG.at) + 1;
  g.f[0].hp = 10;
  rig(g, [cpuRoll('sbf', 'mint'), 0.99, 0, 0, 0]);
  ev = E.playTurn(g, 'strike');
  assert(g.over && g.winner === 1 && g.finish === TG.line, 'KO by beanbag: ' + g.finish);
  assert.strictEqual(ev.filter(function (e) { return e.t === 'hit' && e.move === 'tagin'; }).length, 2, 'stops at the knockout');
  // Random fights against every boss: always end, stay in range, replay the same.
  var rng = E.makeRng(7);
  Object.keys(D.BOSSES).forEach(function (b) {
    for (var n = 0; n < 1500; n++) {
      var opts = { player: D.ROSTER[Math.floor(rng() * D.ROSTER.length)], cpu: b, seed: Math.floor(rng() * 4294967296) };
      var x = E.newFight(opts);
      while (!x.over) {
        var st = E.playerStatus(x), mv = null;
        if (!st.skipped) {
          do mv = st.canSuper && rng() < 0.7 ? 'super' : E.MOVES[Math.floor(rng() * 4)]; while (mv === st.banned);
        }
        E.playTurn(x, mv);
        x.f.forEach(function (y) { assert(y.hp >= 0 && y.hp <= y.maxHp, b + ': hp out of range'); });
      }
      var r = E.replay(opts, x.moves.join(''));
      assert.strictEqual(r.winner, x.winner, b + ': replay winner mismatch');
      assert.strictEqual(r.f[0].hp, x.f[0].hp, b + ': replay hp mismatch');
    }
  });
});

test('Story: WICK\'s leverage: pink and purple step it up (and hit harder), blue closes it, red leaves it', function () {
  var LV = D.BOSSES.wick.leverage, R = D.RULESETS.balanced;
  var f = E.newFight({ player: 'toly', cpu: 'wick', seed: 1 });
  rig(f, [cpuRoll('wick', 'strike'), 0 /* the purple lands */]);
  var ev = E.playTurn(f, 'rug');
  assert(ev.some(function (e) { return e.t === 'lev' && e.who === 0 && e.from === 1 && e.x === 2 && e.why === 'open'; }));
  assert.strictEqual(E.snapshot(f)[0].lev, 2);
  // He's fed 2 Blocks, the purple steals 2 back, +1 for being hit, +2 for his strike.
  assert.strictEqual(f.f[1].blocks, LV.feed - D.BLOCKS.rugSteal + D.BLOCKS.gotHit + D.BLOCKS.strike, 'degen play feeds him Blocks');
  var hit = ev.filter(function (e) { return e.t === 'hit' && e.attacker === 0; })[0];
  assert.strictEqual(hit.amount, Math.round(E.moveDamage('toly', 'rug', R) * (1 + LV.boost)), 'purple hits harder at 2x');
  rig(f, [cpuRoll('wick', 'strike')]);
  ev = E.playTurn(f, 'strike');
  assert(!ev.some(function (e) { return e.t === 'lev'; }) && f.f[0].lev === 1, 'red leaves it');
  f.f[0].lev = LV.steps.length - 1;
  rig(f, [cpuRoll('wick', 'strike'), 0.99 /* the pink flops */]);
  E.playTurn(f, 'mint');
  assert.strictEqual(f.f[0].lev, LV.steps.length - 1, 'capped at 100x');
  assert.strictEqual(f.f[0].peakLev, 1, 'the peak counts what you pressed your way to');
  rig(f, [cpuRoll('wick', 'strike'), 0 /* hides */]);
  ev = E.playTurn(f, 'privacy');
  assert(ev.some(function (e) { return e.t === 'lev' && e.why === 'close' && e.x === 1; }) && f.f[0].lev === 0, 'blue closes it');
  assert.strictEqual(E.snapshot(E.newFight({ player: 'toly', cpu: 'mert', seed: 1 }))[0].lev, null, 'no meter outside WICK');
});

test('Story: WICK\'s Liquidation Cascade hits once per step of your leverage; at 100x it takes everything', function () {
  var LV = D.BOSSES.wick.leverage, top = LV.steps.length - 1, T = D.SUPERS.cascade.cascade;
  var f = E.newFight({ player: 'toly', cpu: 'wick', seed: 1 });
  f.f[0].lev = 4; f.f[1].blocks = 10;
  rig(f, []);
  var ev = E.playTurn(f, 'strike');
  assert(ev.some(function (e) { return e.t === 'super' && e.lev === LV.steps[4]; }), 'the cut-in knows the leverage');
  assert.strictEqual(ev.filter(function (e) { return e.t === 'hit' && e.move === 'super'; }).length, 5);
  assert.strictEqual(f.f[0].hp, 100 - T[4], 'the 25x total, over 5 hits');
  assert(ev.some(function (e) { return e.t === 'lev' && e.why === 'liquidated' && e.from === LV.steps[4]; }) && f.f[0].lev === 0, 'back to 1x');
  // Blue on the turn it fires closes the position first: one hit.
  var g = E.newFight({ player: 'toly', cpu: 'wick', seed: 1 });
  g.f[0].lev = 3; g.f[1].blocks = 10;
  rig(g, [0.99 /* the hide fails */, 0, 0]);
  E.playTurn(g, 'privacy');
  assert.strictEqual(g.f[0].hp, 100 - T[0], 'closed in time');
  // 100x: liquidated, HODL or not; Satoshi's revive starts you back at 1x.
  var h = E.newFight({ player: 'toly', cpu: 'wick', seed: 1 });
  h.f[0].lev = top; h.f[1].blocks = 10; h.f[0].hodl = 2;
  rig(h, []);
  ev = E.playTurn(h, 'strike');
  assert(h.over && h.winner === 1 && h.f[0].hp === 0 && h.finish === 'LIQUIDATED', 'liquidated: ' + h.finish);
  assert(ev.some(function (e) { return e.t === 'hit' && e.liquidated; }));
  E.revive(h, 0);
  assert.strictEqual(h.f[0].lev, 0);
});

test('Story: WICK\'s Stop Hunt hits through a hide; his lines; the prelude, CONTINUE question and the reveal', function () {
  var f = E.newFight({ player: 'toly', cpu: 'wick', seed: 1 });
  rig(f, [cpuRoll('wick', 'strike'), 0 /* hides */]);
  var ev = E.playTurn(f, 'privacy');
  assert(ev.some(function (e) { return e.t === 'hit' && e.attacker === 1 && e.move === 'strike' && e.pierced; }), 'stop hunt');
  assert.strictEqual(f.f[0].hp, 100 - 12);
  var B = D.BOSSES.wick.boss;
  assert(B.prelude.length === 2 && B.continueLine && B.reveal.length >= 3);
  B.reveal.forEach(function (c) { assert(c.length === 2 && c[0] && c[1].length < 200, 'a reveal card is a title and a short line'); });
  assert.strictEqual(D.STORY.ladder[D.STORY.ladder.length - 1].id, 'wick', 'WICK is the final boss');
});

test('10,000 random fights: always end, HP and Blocks stay in range, replays match', function () {
  var rng = E.makeRng(99);
  for (var n = 0; n < 10000; n++) {
    var p = D.ROSTER[Math.floor(rng() * D.ROSTER.length)], c = D.ROSTER[Math.floor(rng() * D.ROSTER.length)];
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
