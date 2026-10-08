#!/usr/bin/env node
// Story mode balance: every founder against every boss that's built, through the real engine.
//   node tools/story-sim.js
// Three columns per boss: no help, with the ally's assist (called the moment it lights up), and with
// the assist plus Satoshi's revive. Target: a sensible player beats the first boss about 70% of the
// time with no help, and the last about 50%. Against WICK the sensible player watches the leverage meter
// (closes the position when his Super is close, stops stacking at 10x); a "degen" row ignores it.
'use strict';
var D = require('../js/data.js');
var E = require('../js/engine.js');

var N = Number(process.env.N || 3000);
var R = D.RULESETS.balanced;

// The same "Sensible" player as tools/sim.js: best average damage, hides now and then, hides when hypnotized.
function sensible(fight, rng, degen) {
  if (E.canSuper(fight, 0)) return 'super';
  var F = D.FIGHTERS[fight.f[0].id], me = fight.f[0], LV = D.FIGHTERS[fight.f[1].id].leverage;
  if (me.hypnoNext) return 'privacy';
  if (LV && !degen && me.lev > 0 && fight.f[1].blocks >= 8) return 'privacy'; // close before his Super
  if (rng() < 0.2) return 'privacy';
  var lm = E.levMult(fight, 0);
  var dm = function (m) { return E.moveDamage(F.id, m, R) * (m === 'strike' ? 1 : lm); };
  var best = 'strike', bestV = dm('strike');
  if (F.mint * dm('mint') > bestV) { best = 'mint'; bestV = F.mint * dm('mint'); }
  if (F.rug * dm('rug') > bestV) best = 'rug';
  if (LV && !degen && me.lev >= 3 && best !== 'strike') best = 'strike'; // no more than 10x
  return me.banned && me.banned.move === best ? 'strike' : best; // Warren's BANNED
}

function run(player, boss, help, rng, degen) {
  var fight = E.newFight({ player: player, cpu: boss, seed: Math.floor(rng() * 4294967296) });
  var revived = false;
  for (;;) {
    if (help && E.canAssist(fight)) E.assist(fight, 'toly');
    if (fight.over) {
      if (help === 2 && fight.winner === 1 && fight.f[0].hp === 0 && !revived) { E.revive(fight, 0); revived = true; continue; }
      return fight.winner === 0;
    }
    var st = E.playerStatus(fight);
    E.playTurn(fight, st.skipped ? null : sensible(fight, rng, degen));
  }
}

function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
function lpad(s, n) { s = String(s); while (s.length < n) s = ' ' + s; return s; }

var rng = E.makeRng(2024);
var bosses = D.STORY.ladder.map(function (r) { return r.id; }).filter(function (id) { return D.BOSSES[id]; });
bosses.forEach(function (b) {
  console.log('\n' + D.FIGHTERS[b].name + ' (' + D.FIGHTERS[b].boss.hp + ' HP): sensible player win %');
  console.log(pad('', 14) + lpad('no help', 10) + lpad('+ assist', 10) + lpad('+ Satoshi', 11));
  var tot = [0, 0, 0];
  D.ROSTER.forEach(function (p) {
    var row = [0, 1, 2].map(function (help) {
      var w = 0;
      for (var i = 0; i < N; i++) if (run(p, b, help, rng)) w++;
      tot[help] += w / N;
      return w / N;
    });
    console.log(pad(p, 14) + row.map(function (x, k) { return lpad(Math.round(x * 100) + '%', k === 2 ? 11 : 10); }).join(''));
  });
  console.log(pad('average', 14) + tot.map(function (x, k) { return lpad(Math.round(100 * x / D.ROSTER.length) + '%', k === 2 ? 11 : 10); }).join(''));
  if (!D.FIGHTERS[b].leverage) return;
  var deg = [0, 1, 2].map(function (help) {
    var w = 0;
    D.ROSTER.forEach(function (p) { for (var i = 0; i < N; i++) if (run(p, b, help, rng, true)) w++; });
    return w / N / D.ROSTER.length;
  });
  console.log(pad('degen (avg)', 14) + deg.map(function (x, k) { return lpad(Math.round(100 * x) + '%', k === 2 ? 11 : 10); }).join(''));
});
