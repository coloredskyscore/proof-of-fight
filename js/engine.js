// Proof of Fight — pure game rules. No DOM in here, so the same file runs in
// the browser and in `node tools/sim.js`. Same seed + same player moves
// always produces the same fight (that's what makes daily fights and
// replayable result links possible).
(function (root, factory) {
  var D = (typeof module === 'object' && module.exports) ? require('./data.js') : root.POF_DATA;
  var engine = factory(D);
  if (typeof module === 'object' && module.exports) module.exports = engine;
  else root.POF_ENGINE = engine;
})(this, function (D) {
  'use strict';

  var MOVES = ['strike', 'privacy', 'mint', 'rug'];
  var MOVE_CODE = { strike: 's', privacy: 'p', mint: 'm', rug: 'r', super: 'x', skip: '-' };
  var CODE_MOVE = { s: 'strike', p: 'privacy', m: 'mint', r: 'rug', x: 'super' };

  // mulberry32: tiny seeded random number generator.
  function makeRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function pick(rng, list) {
    return list[Math.floor(rng() * list.length)];
  }

  function weightedPick(rng, weights) {
    var keys = Object.keys(weights), total = 0, i;
    for (i = 0; i < keys.length; i++) total += weights[keys[i]];
    var r = rng() * total;
    for (i = 0; i < keys.length; i++) {
      r -= weights[keys[i]];
      if (r < 0) return keys[i];
    }
    return keys[keys.length - 1];
  }

  function newFight(opts) {
    var rules = D.RULESETS[opts.rules || 'balanced'];
    var seed = opts.seed >>> 0;
    return {
      rules: rules,
      seed: seed,
      rng: makeRng(seed),
      turn: 1,
      over: false,
      winner: null,
      finish: null,
      f: [makeFighter(opts.player, rules), makeFighter(opts.cpu, rules)],
      moves: [],
      grid: []
    };
  }

  function makeFighter(id, rules) {
    if (!D.FIGHTERS[id]) throw new Error('Unknown fighter: ' + id);
    var boss = D.FIGHTERS[id].boss;
    var hp = (boss && boss.hp) || rules.hp[id] || rules.hp.default;
    // shield: turns left of CZ's FUD-proof (red, pink and purple do nothing). stored: Adeniyi's Walrus bonus.
    // bailedOut: Dimon's one bailout is spent.
    // banned: { move, turns } while a button is banned (Warren's BANNED); banUsed: her one ban is spent.
    return { id: id, hp: hp, maxHp: hp, blocks: 0, skipNext: null, hypnoNext: false, hodl: 0, shield: 0, stored: 0, bailedOut: false,
      banned: null, banUsed: false };
  }

  function canSuper(fight, who) {
    return fight.f[who].blocks >= D.MAX_BLOCKS;
  }

  // What the player is dealing with at the start of this turn.
  function playerStatus(fight) {
    var me = fight.f[0];
    return { skipped: me.skipNext, hypnotized: me.hypnoNext, canSuper: canSuper(fight, 0),
      banned: me.banned ? me.banned.move : null, bannedTurns: me.banned ? me.banned.turns : 0 };
  }

  // CPU: Super the moment the meter is full, otherwise a weighted random pick.
  function cpuMove(fight) {
    if (canSuper(fight, 1)) return 'super';
    return weightedPick(fight.rng, D.FIGHTERS[fight.f[1].id].ai);
  }

  function snapshot(fight, hidden, braced) {
    return fight.f.map(function (f, i) {
      return {
        hp: f.hp, maxHp: f.maxHp, blocks: f.blocks, hodl: f.hodl, shield: f.shield, stored: f.stored,
        bailout: !!(D.FIGHTERS[f.id].bailout && !f.bailedOut),
        banned: f.banned ? f.banned.move : null,
        skipNext: f.skipNext, hypnoNext: f.hypnoNext,
        hidden: !!(hidden && hidden[i]), braced: !!(braced && braced[i])
      };
    });
  }

  // Damage for a fighter's Strike / Mint / Rug as [min, max]: their own number or range
  // (e.g. Saylor's MSTR rolls 15-45) if they have one, else the rules' flat number.
  function damageRange(fighterId, move, rules) {
    var F = D.FIGHTERS[fighterId], own = F.dmg && F.dmg[move];
    if (own == null || rules.id !== 'balanced') return [rules[move], rules[move]];
    return typeof own === 'number' ? [own, own] : own;
  }

  // Average damage (what the simulator and the odds use).
  function moveDamage(fighterId, move, rules) {
    var r = damageRange(fighterId, move, rules);
    return (r[0] + r[1]) / 2;
  }

  function clampBlocks(f) {
    f.blocks = Math.max(0, Math.min(D.MAX_BLOCKS, f.blocks));
  }

  // Too big to fail (Dimon): the first knockout is cancelled and he's back with bailout.hp. No dice, so
  // replays still match. Returns the event (without its snapshot), or null when there's no bailout left.
  function tryBailout(fight, i) {
    var f = fight.f[i], B = D.FIGHTERS[f.id].bailout;
    if (!B || f.bailedOut || f.hp > 0) return null;
    f.bailedOut = true;
    f.hp = Math.min(B.hp, f.maxHp);
    return { t: 'bailout', who: i, hp: f.hp };
  }

  // BANNED (Warren): once, when she's at ban.at of her HP or lower, the other side's ban.move is banned for
  // ban.turns turns. Checked at the end of a turn and after an assist. Returns the event, or null.
  function tryBan(fight) {
    if (fight.over) return null;
    for (var i = 0; i < 2; i++) {
      var me = fight.f[i], B = D.FIGHTERS[me.id].ban;
      if (!B || me.banUsed || me.hp > me.maxHp * B.at) continue;
      me.banUsed = true;
      fight.f[1 - i].banned = { move: B.move, turns: B.turns };
      return { t: 'ban', who: 1 - i, move: B.move, turns: B.turns };
    }
    return null;
  }

  // Plays one full turn. playerMove is ignored if the player is Blind/Asleep.
  // Returns a list of events for the UI to animate, each with a state snapshot.
  function playTurn(fight, playerMove) {
    if (fight.over) throw new Error('Fight is over');
    var rng = fight.rng, R = fight.rules;
    var ev = [];
    var hidden = [false, false];
    var braced = [false, false]; // Saylor's STRF: not hidden, but Strike/Mint/Rug do half
    var hyp = [false, false];
    var act = [null, null];
    var result = [null, null]; // per-fighter outcome, used for the share grid

    function push(e) {
      e.snap = snapshot(fight, hidden, braced);
      ev.push(e);
    }

    function ko(loser, cause, attacker) {
      if (fight.f[loser].hp > 0 || fight.over) return;
      var saved = tryBailout(fight, loser);
      if (saved) { push(saved); return; }
      fight.over = true;
      fight.winner = 1 - loser;
      var W = D.FIGHTERS[fight.f[attacker].id];
      var rival = W.rivalKo && W.rivalKo[fight.f[loser].id];
      if (attacker === loser) { cause = 'self'; fight.finish = D.FINISH.self; }
      else if (rival) fight.finish = rival;
      else if (cause === 'super') fight.finish = W.super.finish;
      // A renamed button's own KO line, else its success line (Charles's Peer Review: PEER REVIEWED),
      // so a pink-button KO never falls back to the generic JPEG TO THE FACE.
      else if (W.moves && W.moves[cause] && (W.moves[cause].ko || W.moves[cause].ok)) fight.finish = W.moves[cause].ko || W.moves[cause].ok;
      else fight.finish = D.FINISH[cause];
      fight.finishCause = cause;
      push({ t: 'ko', winner: fight.winner, loser: loser, finish: fight.finish, cause: cause });
    }

    // braceable: Strike/Mint/Rug can be braced against; Supers can't. HODL and a brace don't stack.
    function hurt(target, n, braceable) {
      var f = fight.f[target];
      if (f.hodl > 0 || (braceable && braced[target])) n = Math.ceil(n / 2);
      n = Math.min(n, f.hp);
      f.hp -= n;
      return n;
    }

    // Step 0: statuses from last turn's Supers kick in.
    for (var i = 0; i < 2; i++) {
      var f = fight.f[i];
      hyp[i] = f.hypnoNext;
      f.hypnoNext = false;
      if (f.skipNext) {
        act[i] = 'skip';
        result[i] = { code: 'skip', reason: f.skipNext };
        f.skipNext = null;
      }
    }
    if (!act[0]) {
      if (playerMove === 'super' && !canSuper(fight, 0)) throw new Error('Super not ready');
      if (playerMove !== 'super' && MOVES.indexOf(playerMove) < 0) throw new Error('Bad move: ' + playerMove);
      if (fight.f[0].banned && fight.f[0].banned.move === playerMove) throw new Error('Banned: ' + playerMove);
      act[0] = playerMove;
    }
    if (!act[1]) act[1] = cpuMove(fight);
    fight.moves.push(MOVE_CODE[act[0]]);

    push({ t: 'reveal', moves: act.slice(), hyp: hyp.slice() });
    for (i = 0; i < 2; i++) {
      if (act[i] === 'skip') push({ t: 'skip', who: i, reason: result[i].reason });
    }

    // Step 1: Supers. Player first. Supers can't be dodged.
    for (i = 0; i < 2 && !fight.over; i++) {
      if (act[i] !== 'super') continue;
      doSuper(i);
      result[i] = { code: 'super' };
    }

    function doSuper(who) {
      var me = fight.f[who], ti = 1 - who, tgt = fight.f[ti];
      var S = D.FIGHTERS[me.id].super, fx = D.SUPERS[S.id];
      me.blocks = 0;
      push({ t: 'super', who: who, superId: S.id });
      if (fx.prune && tgt.hodl > 0) {
        tgt.hodl = 0;
        push({ t: 'status', who: ti, status: 'pruned' });
      }
      if (fx.hodl) {
        me.hodl = fx.hodl;
        push({ t: 'status', who: who, status: 'hodl' });
      }
      if (fx.shield) {
        me.shield = fx.shield;
        push({ t: 'status', who: who, status: 'shield' });
      }
      var hits = fx.hits || 1;
      for (var h = 0; h < hits && !fight.over; h++) {
        var dealt = hurt(ti, fx.dmg);
        push({ t: 'hit', attacker: who, target: ti, move: 'super', amount: dealt, n: h + 1, of: hits });
        ko(ti, 'super', who);
      }
      if (fight.over) return;
      if (fx.skip) {
        tgt.skipNext = fx.skip;
        push({ t: 'status', who: ti, status: fx.skip });
      }
      if (fx.drain) {
        tgt.blocks = Math.max(0, tgt.blocks - fx.drain);
        push({ t: 'status', who: ti, status: 'drain', amount: fx.drain });
      }
      if (fx.hypno) {
        tgt.hypnoNext = true;
        push({ t: 'status', who: ti, status: 'hypno' });
      }
    }

    // Step 2: Privacy rolls.
    for (i = 0; i < 2 && !fight.over; i++) {
      if (act[i] !== 'privacy') continue;
      var me = fight.f[i], brace = D.FIGHTERS[me.id].brace;
      if (D.FIGHTERS[me.id].stun) {
        // Sergey's shirt: he never hides. When it works, the pattern holds them and they lose
        // their next turn (an attack this turn still hits him).
        var ok = rng() < D.FIGHTERS[me.id].hide;
        me.blocks += ok ? D.BLOCKS.privacyOk : D.BLOCKS.privacyFail;
        clampBlocks(me);
        if (ok) fight.f[1 - i].skipNext = 'stun';
        result[i] = { code: ok ? 'hid' : 'fail' };
        push({ t: 'hide', who: i, ok: ok, stun: true });
        continue;
      }
      if (brace) {
        // Always works, no dice: half damage from Strike/Mint/Rug this turn.
        braced[i] = true;
        me.blocks += brace.blocks;
        clampBlocks(me);
        result[i] = { code: 'hid' };
        push({ t: 'hide', who: i, ok: true, brace: true });
        continue;
      }
      if (rng() < D.FIGHTERS[me.id].hide) {
        hidden[i] = true;
        me.blocks += D.BLOCKS.privacyOk;
        clampBlocks(me);
        result[i] = { code: 'hid' };
        push({ t: 'hide', who: i, ok: true });
      } else {
        me.blocks += D.BLOCKS.privacyFail;
        clampBlocks(me);
        result[i] = { code: 'fail' };
        push({ t: 'hide', who: i, ok: false, line: pick(rng, D.PRIVACY_FAIL_LINES) });
      }
    }

    // Step 3: Strike / Mint / Rug. Player first.
    var rugFails = 0;
    for (i = 0; i < 2 && !fight.over; i++) {
      if (MOVES.indexOf(act[i]) < 0 || act[i] === 'privacy') continue;
      result[i] = doAttack(i, act[i]);
      if (act[i] === 'rug' && result[i].code === 'fail') rugFails++;
    }
    if (rugFails === 2 && !fight.over) push({ t: 'banner', text: 'MUTUAL REKT', sub: 'Both big gambles flopped' });

    function doAttack(who, move) {
      var me = fight.f[who], F = D.FIGHTERS[me.id];
      var self = hyp[who];
      var ti = self ? who : 1 - who, tgt = fight.f[ti];
      var dealt;

      if (move === 'mint' || move === 'rug') {
        if (!(rng() < F[move])) {
          if (move === 'mint') {
            me.blocks += D.BLOCKS.mintFail;
            clampBlocks(me);
            push({ t: 'fail', who: who, move: move });
          } else if (me.blocks === 0) {
            dealt = hurt(who, R.rugRecoil);
            push({ t: 'fail', who: who, move: move, recoil: dealt });
            ko(who, 'rug', who);
          } else {
            me.blocks = Math.max(0, me.blocks - D.BLOCKS.rugFailLoss);
            push({ t: 'fail', who: who, move: move, lost: D.BLOCKS.rugFailLoss });
          }
          return { code: 'fail' };
        }
      }

      if (move === 'strike') me.blocks += D.BLOCKS.strike;
      if (move === 'mint') me.blocks += D.BLOCKS.mintOk;
      clampBlocks(me);

      // Warren's Letter: no damage; they skip their next turn reading it. Hiding doesn't help, but CZ's
      // Ignore FUD (and his FUD-proof Super) does: a letter is FUD.
      if (move === 'mint' && F.letter) {
        var LT = D.FIGHTERS[tgt.id];
        if (!self && (tgt.shield > 0 || (braced[ti] && LT.brace && LT.brace.ignore && LT.brace.ignore.indexOf('mint') >= 0))) {
          push({ t: 'miss', attacker: who, target: ti, move: move, ignored: true });
          return { code: 'miss' };
        }
        tgt.skipNext = F.letter.skip;
        push({ t: 'letter', who: who, target: ti });
        return { code: self ? 'self' : 'hit' };
      }

      var pierced = false, T = D.FIGHTERS[tgt.id];
      if (!self && hidden[ti]) {
        if (move === 'rug' && R.rugPiercesHidden) {
          pierced = true;
        } else {
          push({ t: 'miss', attacker: who, target: ti, move: move });
          // Adeniyi's Walrus: the hit he dodged is stored and comes back on his next hit that lands.
          if (T.walrus) {
            tgt.stored = Math.max(tgt.stored, damageRange(me.id, move, R)[0]);
            push({ t: 'status', who: ti, status: 'stored', amount: tgt.stored });
          }
          return { code: 'miss' };
        }
      }
      // CZ: his Ignore FUD shrugs off red and pink; after his Super nothing but a Super touches him.
      if (!self && (tgt.shield > 0 || (braced[ti] && T.brace.ignore && T.brace.ignore.indexOf(move) >= 0))) {
        push({ t: 'miss', attacker: who, target: ti, move: move, ignored: true });
        return { code: 'miss' };
      }

      var stolen = 0;
      if (move === 'rug' && !self) {
        stolen = Math.min(D.BLOCKS.rugSteal, tgt.blocks);
        tgt.blocks -= stolen;
        me.blocks += stolen;
        clampBlocks(me);
      }
      // Ranged damage rolls only when it lands, so fixed-damage fighters use exactly the same dice as before.
      var range = damageRange(me.id, move, R);
      var base = range[0] === range[1] ? range[0] : range[0] + Math.floor(rng() * (range[1] - range[0] + 1));
      var bonus = !self && me.stored ? me.stored : 0; // Walrus remembers
      me.stored -= bonus;
      dealt = hurt(ti, base + bonus, true);
      tgt.blocks += D.BLOCKS.gotHit;
      clampBlocks(tgt);
      push({ t: 'hit', attacker: who, target: ti, move: move, amount: dealt, base: base, bonus: bonus, self: self, stolen: stolen, pierced: pierced });
      ko(ti, move, who);
      return { code: self ? 'self' : 'hit' };
    }

    // Step 4: end of turn.
    if (!fight.over) {
      for (i = 0; i < 2; i++) {
        if (fight.f[i].hodl > 0) fight.f[i].hodl--;
        if (fight.f[i].shield > 0) fight.f[i].shield--;
        if (fight.f[i].banned && --fight.f[i].banned.turns <= 0) {
          push({ t: 'unban', who: i, move: fight.f[i].banned.move });
          fight.f[i].banned = null;
        }
      }
      var ban = tryBan(fight);
      if (ban) push(ban);
      if (fight.turn >= D.TURN_CAP) {
        var p = fight.f[0].hp / fight.f[0].maxHp, c = fight.f[1].hp / fight.f[1].maxHp;
        fight.over = true;
        fight.winner = p >= c ? 0 : 1;
        fight.finish = D.FINISH.timeout;
        fight.finishCause = 'timeout';
        push({ t: 'ko', winner: fight.winner, loser: 1 - fight.winner, finish: fight.finish, cause: 'timeout', timeout: true });
      }
    }

    fight.grid.push(result[0] ? result[0].code : 'none');
    if (!fight.over) fight.turn++;
    hidden = [false, false];
    braced = [false, false];
    push({ t: 'end' });
    return ev;
  }

  // ---------- Story mode ----------
  // The ally's hit: once per fight, when you're at STORY.assistAt of your HP or lower. It happens between
  // turns, uses no dice (so the fight's luck is unchanged) and can't be dodged, braced or halved.
  function canAssist(fight) {
    var me = fight.f[0];
    return !fight.over && !fight.assisted && me.hp > 0 && me.hp <= me.maxHp * D.STORY.assistAt;
  }

  function assist(fight, allyId) {
    if (!canAssist(fight)) throw new Error('Assist not available');
    var ally = D.FIGHTERS[allyId], tgt = fight.f[1];
    if (!ally) throw new Error('Unknown fighter: ' + allyId);
    var B = D.FIGHTERS[tgt.id], pair = B.boss && B.boss.allyLines && B.boss.allyLines[allyId];
    var line = pair || ally.assistLine || 'TAG TEAM';
    fight.assisted = allyId;
    var n = Math.min(D.STORY.assistDmg, tgt.hp);
    tgt.hp -= n;
    var ev = [{ t: 'assist', ally: allyId, line: line, amount: n, snap: snapshot(fight) }];
    var saved = tryBailout(fight, 1);
    if (saved) { saved.snap = snapshot(fight); ev.push(saved); }
    var ban = tryBan(fight);
    if (ban) { ban.snap = snapshot(fight); ev.push(ban); }
    if (tgt.hp <= 0) {
      fight.over = true;
      fight.winner = 0;
      fight.finish = line;
      fight.finishCause = 'assist';
      ev.push({ t: 'ko', winner: 0, loser: 1, finish: line, cause: 'assist', snap: snapshot(fight) });
    }
    return ev;
  }

  // Satoshi: a knocked-out fighter gets back up with STORY.reviveHp of their HP and the fight goes on
  // from the next turn. Statuses aimed at them are cleared; the opponent keeps everything.
  function revive(fight, who) {
    var me = fight.f[who];
    if (!fight.over || fight.winner === who || me.hp > 0) throw new Error('Nothing to revive');
    me.hp = Math.ceil(me.maxHp * D.STORY.reviveHp);
    me.skipNext = null;
    me.hypnoNext = false;
    fight.over = false;
    fight.winner = null;
    fight.finish = null;
    fight.finishCause = null;
    fight.revived = (fight.revived || 0) + 1;
    fight.turn++;
    return [{ t: 'revive', who: who, hp: me.hp, snap: snapshot(fight) }];
  }

  // Rebuild a finished fight from its seed + player move log (for result links).
  function replay(opts, moveLog) {
    var fight = newFight(opts);
    for (var i = 0; i < moveLog.length && !fight.over; i++) {
      var c = moveLog.charAt(i);
      playTurn(fight, c === '-' ? null : CODE_MOVE[c]);
    }
    return fight;
  }

  return {
    MOVES: MOVES,
    makeRng: makeRng,
    hashString: hashString,
    newFight: newFight,
    playTurn: playTurn,
    playerStatus: playerStatus,
    canSuper: canSuper,
    snapshot: snapshot,
    moveDamage: moveDamage,
    damageRange: damageRange,
    replay: replay,
    canAssist: canAssist,
    assist: assist,
    revive: revive
  };
});
