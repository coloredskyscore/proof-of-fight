// Proof of Fight — screens, animation and sharing. Game rules live in engine.js.
(function () {
  'use strict';
  var D = window.POF_DATA, E = window.POF_ENGINE;

  // ?speed=0.2 plays animations 5x faster (handy for testing).
  var SPEED = Number(new URLSearchParams(location.search).get('speed')) || 1;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms * SPEED); }); }
  function later(fn, ms) { return setTimeout(fn, ms * SPEED); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pct(p) { return Math.round(p * 100) + '%'; }
  function titleCase(s) {
    return s.toLowerCase().replace(/(^|[\s-])([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
  }

  // localStorage can throw (private mode, blocked storage). The game still works, it just forgets.
  var store = {
    get: function (k, dflt) {
      try { var v = localStorage.getItem('pof.' + k); return v == null ? dflt : JSON.parse(v); }
      catch (e) { return dflt; }
    },
    set: function (k, v) {
      try {
        if (v == null) localStorage.removeItem('pof.' + k);
        else localStorage.setItem('pof.' + k, JSON.stringify(v));
      } catch (e) { /* ignore */ }
    }
  };

  var BUTTONS = ['strike', 'privacy', 'mint', 'rug'];
  var STATUS_TEXT = {
    blind: '🙈 BLINDED', sleep: '💤 ASLEEP', hypno: '🌀 HYPNOTIZED',
    hodl: '💎 HODL', pruned: '✂️ PRUNED', drain: '-3 Blocks'
  };
  var GRID_EMOJI = { hit: '🟩', hid: '🟦', super: '🟨', fail: '🟥', miss: '🟥', skip: '⬛', self: '🌀', none: '⬛' };
  var SIDE = ['p', 'c'];

  var S = {
    fight: null, opts: null, busy: false, result: null, today: null,
    pickPlayer: null, pickStep: 'player', countdown: null,
    lastMoves: null, koProp: null,
    rules: D.RULESETS[store.get('rules')] ? store.get('rules') : 'balanced'
  };

  // ---------- Daily fight ----------
  function dayNumber(date) {
    var e = D.DAILY_EPOCH.split('-').map(Number);
    var epoch = Date.UTC(e[0], e[1] - 1, e[2]);
    var today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.max(1, Math.floor((today - epoch) / 86400000) + 1);
  }

  function dailySetup(n) {
    var rng = E.makeRng(E.hashString('pof-daily-' + n));
    var roster = D.ROSTER, p, c;
    if (n === 1) {
      p = D.FIRST_FIGHT.player;
      c = D.FIRST_FIGHT.cpu;
    } else {
      p = roster[Math.floor(rng() * roster.length)];
      do { c = roster[Math.floor(rng() * roster.length)]; } while (c === p);
    }
    return { mode: 'daily', n: n, player: p, cpu: c, seed: E.hashString('pof-daily-seed-' + n), rules: 'balanced' };
  }

  function untilMidnight() {
    var now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now;
  }

  function fmtCountdown(ms) {
    var s = Math.max(0, Math.floor(ms / 1000));
    var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return h + ':' + String(m).padStart(2, '0') + ':' + String(x).padStart(2, '0');
  }

  function recordStats(res) {
    var st = store.get('stats', { played: 0, won: 0, streak: 0, best: 0, lastWin: 0 });
    st.played++;
    if (res.won) {
      st.won++;
      st.streak = st.lastWin === res.n - 1 ? st.streak + 1 : 1;
      st.lastWin = res.n;
      st.best = Math.max(st.best, st.streak);
    } else {
      st.streak = 0;
    }
    store.set('stats', st);
  }

  // ---------- Screens ----------
  function show(id) {
    $all('.screen').forEach(function (el) { el.hidden = el.id !== id; });
  }

  function renderTitle() {
    S.today = dailySetup(dayNumber(new Date()));
    var t = S.today, P = D.FIGHTERS[t.player], C = D.FIGHTERS[t.cpu];
    var done = store.get('daily.' + t.n);
    var prog = store.get('progress');
    var label = done ? '✅ Daily #' + t.n + ' done: see result'
      : (prog && prog.n === t.n) ? '▶️ Resume Daily #' + t.n
      : '🗓️ Daily Fight #' + t.n;
    $('#btn-daily').innerHTML = '<span>' + esc(label) + '</span><small>You are ' + esc(P.name) + ' vs ' + esc(C.name) + '</small>';

    var st = store.get('stats', null);
    $('#title-stats').textContent = st && st.played
      ? 'Daily played ' + st.played + ' · won ' + st.won + ' · streak ' + st.streak + (st.best > st.streak ? ' (best ' + st.best + ')' : '')
      : 'Same fight for everyone, every day. Fewest turns wins.';
    $('#rules-select').value = S.rules;
    show('screen-title');
  }

  function renderPick(step) {
    S.pickStep = step;
    $('#pick-title').textContent = step === 'player' ? 'Pick your fighter' : 'Pick your opponent';
    $('#pick-suggest').hidden = step !== 'player';
    var R = D.RULESETS[S.rules];
    var html = D.ROSTER.map(function (id) {
      var F = D.FIGHTERS[id];
      var moves = F.moves ? '<span class="pick-moves">' + BUTTONS.map(function (m) {
        var mo = moveOf(id, m);
        return '<span class="role-' + m + '">' + mo.icon + ' ' + esc(mo.name) +
          (mo.nick ? ' <small>' + esc(mo.nick) + '</small>' : '') + '</span>';
      }).join('') + '</span>' : '';
      return '<button class="pick-card" type="button" data-id="' + id + '" style="--c:' + F.color + '">' +
        '<span class="pick-face">' + F.emoji + '</span>' +
        '<span class="pick-name">' + esc(F.name) + '</span>' +
        '<span class="pick-lane">' + esc(F.lane) + '</span>' +
        moves +
        '<span class="pick-super">⚡ ' + esc(F.super.name) + '</span>' +
        '<span class="pick-odds">' + (R.hp[id] || R.hp.default) + ' HP · ' +
        (F.brace ? esc(moveOf(id, 'privacy').name) + ' halves dmg' : 'Hide ' + pct(F.hide)) +
        ' · ' + esc(moveOf(id, 'mint').name) + ' ' + pct(F.mint) +
        ' · ' + esc(moveOf(id, 'rug').name) + ' ' + pct(F.rug) + '</span>' +
        '</button>';
    }).join('');
    if (step === 'cpu') {
      html += '<button class="pick-card" type="button" data-id="random" style="--c:#4a4460">' +
        '<span class="pick-face">🎲</span><span class="pick-name">Random</span>' +
        '<span class="pick-lane">Let the chain decide</span></button>';
    }
    $('#pick-grid').innerHTML = html;
    show('screen-pick');
  }

  function randomSeed() {
    try { return crypto.getRandomValues(new Uint32Array(1))[0]; }
    catch (e) { return Math.floor(Math.random() * 4294967296); }
  }

  function startFree(player, cpu, rules) {
    startFight({ mode: 'free', player: player, cpu: cpu, seed: randomSeed(), rules: rules || S.rules });
  }

  function startDaily() {
    var t = S.today, done = store.get('daily.' + t.n);
    if (done) { S.result = done; showResult(done); return; }
    var prog = store.get('progress');
    var moves = prog && prog.n === t.n ? prog.moves : '';
    try {
      startFight(t, moves);
    } catch (err) {
      store.set('progress', null);
      startFight(t, '');
    }
  }

  // ---------- Fight ----------
  function startFight(opts, resumeMoves) {
    S.opts = opts;
    S.fight = resumeMoves ? E.replay(opts, resumeMoves) : E.newFight(opts);
    S.lastMoves = null;
    S.koProp = null;
    buildArena();
    render(E.snapshot(S.fight));
    $('#turn-num').textContent = S.fight.turn;
    show('screen-fight');
    if (S.fight.over) { finishFight(); return; }

    S.busy = true;
    updateControls();
    log(resumeMoves ? 'Picking up where you left off.' : 'Tap a move. The CPU picks at the same time.');
    banner(resumeMoves ? 'RESUME' : 'ROUND 1', 'FIGHT!');
    later(function () {
      S.busy = false;
      updateControls();
      if (!store.get('seenHelp')) { store.set('seenHelp', true); openHelp(); }
    }, 1100);
  }

  function fighterHTML(F) {
    return '<div class="f-chip"></div><div class="f-bubble"></div>' +
      '<div class="f-flip"><div class="f-bob"><div class="f-sprite">' +
      '<div class="f-legs"><span></span><span></span></div>' +
      '<div class="f-torso"></div>' +
      '<div class="f-head"><span>' + F.emoji + '</span></div>' +
      '<span class="f-fist f-fist-b"></span><span class="f-fist f-fist-a"></span>' +
      '</div></div></div><div class="f-shadow"></div>';
  }

  function buildArena() {
    var f = S.fight;
    [0, 1].forEach(function (i) {
      var F = D.FIGHTERS[f.f[i].id], side = SIDE[i];
      var el = $('#fighter-' + side);
      el.className = 'fighter side-' + side;
      el.style.setProperty('--c', F.color);
      el.innerHTML = fighterHTML(F);
      var hud = $('#hud-' + side);
      $('.hud-fname', hud).textContent = F.name;
      $('.blocks', hud).innerHTML = new Array(D.MAX_BLOCKS + 1).join('<i></i>');
    });
    $('#hud-mode').textContent = S.opts.mode === 'daily' ? 'DAILY #' + S.opts.n
      : f.rules.id === 'original' ? 'ORIGINAL RULES' : 'FREE PLAY';
    $('#popups').innerHTML = '';
    $('#banner').className = 'banner';
    if (!$('#skyline').childElementCount) buildSkyline();
  }

  // Background skyline is a candlestick chart. Cosmetic only, so it uses its own dice.
  function buildSkyline() {
    var rng = E.makeRng(2009), html = '', price = 40;
    for (var i = 0; i < 20; i++) {
      var open = price;
      var close = Math.max(8, Math.min(88, price + (rng() - 0.42) * 26));
      var lo = Math.max(0, Math.min(open, close) - rng() * 8);
      var hi = Math.min(100, Math.max(open, close) + rng() * 8);
      html += '<div class="candle ' + (close >= open ? 'up' : 'down') + '" style="left:' + (i * 5) + '%;height:100%">' +
        '<i style="bottom:' + lo + '%;height:' + (hi - lo) + '%"></i>' +
        '<b style="bottom:' + Math.min(open, close) + '%;height:' + Math.max(2, Math.abs(close - open)) + '%"></b></div>';
      price = close;
    }
    $('#skyline').innerHTML = html;
  }

  // One fighter's name, icon and banner lines for a button. Fighters can rename buttons
  // (data.js `moves`); anything they don't set falls back to DEFAULT_MOVES.
  function moveOf(fighterId, move) {
    if (move === 'super') return { name: 'Super', icon: '⚡' };
    if (move === 'skip') return { name: 'Skipped', icon: '😶' };
    var F = D.FIGHTERS[fighterId], base = D.DEFAULT_MOVES[move], own = (F.moves && F.moves[move]) || {};
    return {
      name: own.name || base.name,
      nick: own.nick || '',
      icon: own.icon || base.icon,
      ok: own.ok || base.ok,
      fail: own.fail || base.fail,
      // Purple hitting someone who hid: their own line, else their success line, else the default.
      pierce: own.pierce || own.ok || base.pierce,
      // Default Mint/Rug banners put the fighter's joke line underneath.
      failSub: own.fail ? null : move === 'mint' ? F.mintFail : move === 'rug' ? F.rugFail : null
    };
  }

  function fighterEl(i) { return $('#fighter-' + SIDE[i]); }
  function whose(i) { return i === 0 ? 'Your' : nm(i) + "'s"; }
  function nm(i) { return D.FIGHTERS[S.fight.f[i].id].name; }
  function who(i) { return i === 0 ? 'You' : nm(i); }

  function render(snap) {
    for (var i = 0; i < 2; i++) {
      var s = snap[i], side = SIDE[i], hud = $('#hud-' + side);
      var w = (100 * s.hp / s.maxHp) + '%';
      $('.hp-fill', hud).style.width = w;
      $('.hp-lag', hud).style.width = w;
      $('.hp-num', hud).textContent = s.hp;
      $('.hp', hud).classList.toggle('low', s.hp / s.maxHp <= 0.25);
      $all('.blocks i', hud).forEach(function (el, k) { el.classList.toggle('on', k < s.blocks); });
      $('.blocks', hud).classList.toggle('full', s.blocks >= D.MAX_BLOCKS);
      var chips = [];
      if (s.hodl > 0) chips.push('<span class="chip good">💎 HODL</span>');
      if (s.skipNext === 'blind') chips.push('<span class="chip bad">🙈 BLIND</span>');
      if (s.skipNext === 'sleep') chips.push('<span class="chip bad">💤 ASLEEP</span>');
      if (s.hypnoNext) chips.push('<span class="chip bad">🌀 HYPNO</span>');
      $('.chips', hud).innerHTML = chips.join('');
      fighterEl(i).classList.toggle('is-hidden', !!s.hidden);
      bubble(i, S.koProp && S.koProp.who === i ? S.koProp.prop
        : s.hypnoNext ? '🌀' : s.skipNext === 'sleep' ? '💤' : s.skipNext === 'blind' ? '🙈'
        : s.hidden ? '🕶️' : s.braced ? '🛡️' : '');
    }
  }

  function updateControls() {
    var f = S.fight, st = E.playerStatus(f), me = f.f[0], F = D.FIGHTERS[me.id], R = f.rules;
    var locked = S.busy || f.over;
    var subs = {
      strike: E.moveDamage(me.id, 'strike', R) + ' dmg · always',
      privacy: F.brace ? '½ dmg · always' : 'Hide ' + pct(F.hide),
      mint: E.moveDamage(me.id, 'mint', R) + ' dmg · ' + pct(F.mint),
      rug: E.moveDamage(me.id, 'rug', R) + ' dmg · ' + pct(F.rug)
    };
    $all('#controls .move').forEach(function (b) {
      var m = b.dataset.move;
      if (m === 'super') {
        b.classList.toggle('ready', st.canSuper);
        $('.move-label', b).textContent = st.canSuper ? F.super.name.toUpperCase() : 'SUPER';
        $('.move-sub', b).textContent = st.canSuper ? 'READY!' : me.blocks + '/' + D.MAX_BLOCKS + ' Blocks';
        b.disabled = locked || !st.canSuper;
      } else {
        var mo = moveOf(me.id, m);
        $('.move-icon', b).textContent = mo.icon;
        $('.move-label', b).innerHTML = esc(mo.name) + (mo.nick ? ' <small class="move-nick">' + esc(mo.nick) + '</small>' : '');
        $('.move-sub', b).textContent = subs[m];
        b.disabled = locked;
      }
    });
    var skipping = !!st.skipped && !f.over;
    $('#controls').classList.toggle('skipping', skipping);
    $('#btn-continue').hidden = !skipping;
    $('#btn-continue').disabled = locked;

    var cpu = f.f[1], note = '';
    if (!f.over) {
      if (st.skipped === 'blind') note = "🙈 BLINDED by the dome. You skip this turn.";
      else if (st.skipped === 'sleep') note = '💤 You fell ASLEEP during the peer review. You skip this turn.';
      else if (st.hypnotized) {
        note = '🌀 HYPNOTIZED: ' + moveOf(me.id, 'strike').name + ', ' + moveOf(me.id, 'mint').name + ' and ' +
          moveOf(me.id, 'rug').name + ' hit YOU this turn. ' + moveOf(me.id, 'privacy').name + ' or Super is safe.';
      }
      else if (cpu.blocks >= D.MAX_BLOCKS && !cpu.skipNext) note = '⚠️ ' + nm(1) + "'s Super fires this turn. It can't be dodged.";
      else if (st.canSuper) note = "⚡ Your Super is ready. It can't be dodged.";
    }
    $('#turn-note').textContent = note;
  }

  function saveProgress() {
    if (S.opts.mode !== 'daily') return;
    store.set('progress', { n: S.opts.n, moves: S.fight.moves.join('') });
  }

  function onMove(move) {
    if (S.busy || !S.fight || S.fight.over) return;
    var st = E.playerStatus(S.fight);
    if (st.skipped) move = null;
    else if (!move || (move === 'super' && !st.canSuper)) return;

    S.busy = true;
    var turnNo = S.fight.turn;
    var events = E.playTurn(S.fight, move);
    saveProgress();
    updateControls();
    $('#turn-num').textContent = turnNo;
    playEvents(events).then(function () {
      S.busy = false;
      $('#turn-num').textContent = S.fight.turn;
      if (S.fight.over) finishFight();
      else updateControls();
    });
  }

  async function playEvents(events) {
    for (var i = 0; i < events.length; i++) await handle(events[i]);
  }

  function moveText(i, move) {
    var m = moveOf(S.fight.f[i].id, move);
    return who(i) + ': ' + m.icon + ' ' + m.name;
  }

  async function handle(e) {
    switch (e.t) {
      case 'reveal':
        S.lastMoves = e.moves;
        chip(0, e.moves[0], e.hyp[0]);
        chip(1, e.moves[1], e.hyp[1]);
        log(moveText(0, e.moves[0]) + '   ·   ' + moveText(1, e.moves[1]));
        await sleep(750);
        break;

      case 'skip':
        bubble(e.who, e.reason === 'blind' ? '🙈' : '💤');
        var skipLine = D.FIGHTERS[S.fight.f[1 - e.who].id].super.skipLine;
        if (skipLine) {
          banner(skipLine, (e.who === 0 ? 'You skip' : nm(e.who) + ' skips') + ' this turn');
          await sleep(1200);
        } else {
          popup(e.who, e.reason === 'blind' ? 'BLINDED' : 'ASLEEP', 'status');
          await sleep(800);
        }
        break;

      case 'super':
        render(e.snap);
        if (S.fight.f[e.who].id === 'vitalik') fighterEl(e.who).classList.add('dance');
        await cutIn(e.who, { targetTriedToHide: !!S.lastMoves && S.lastMoves[1 - e.who] === 'privacy' });
        log(who(e.who) + ' used ' + D.FIGHTERS[S.fight.f[e.who].id].super.name + '!');
        break;

      case 'hit':
        await doHit(e);
        break;

      case 'miss':
        lunge(e.attacker);
        await sleep(170);
        popup(e.target, 'MISS', 'miss');
        log(who(e.attacker) + ' whiffed. ' + (e.target === 0 ? "You're" : nm(e.target) + ' is') + ' hidden.');
        await sleep(700);
        break;

      case 'hide':
        render(e.snap);
        var pv = moveOf(S.fight.f[e.who].id, 'privacy');
        if (e.brace) {
          banner(pv.ok, 'Half damage this turn');
          await sleep(1050);
        } else if (e.ok && pv.ok === D.DEFAULT_MOVES.privacy.ok) {
          popup(e.who, pv.ok, 'good');
          await sleep(650);
        } else if (e.ok) {
          banner(pv.ok, (e.who === 0 ? 'You' : nm(e.who)) + ' vanished');
          await sleep(1150);
        } else {
          wobble(e.who);
          // Default Privacy rolls a random fail line in the engine; renamed ones bring their own.
          banner(pv.fail || e.line, whose(e.who) + ' ' + pv.name + ' failed');
          await sleep(1250);
        }
        break;

      case 'fail':
        var fm = moveOf(S.fight.f[e.who].id, e.move);
        wobble(e.who);
        render(e.snap);
        banner(fm.fail, fm.failSub || whose(e.who) + ' ' + fm.name + ' flopped');
        if (e.recoil) popup(e.who, '-' + e.recoil, 'dmg');
        else if (e.lost) popup(e.who, '-' + e.lost + ' Blocks', 'status');
        log(whose(e.who) + ' ' + fm.name + ' flopped.');
        await sleep(1350);
        break;

      case 'status':
        render(e.snap);
        popup(e.who, e.status === 'drain' ? '-' + e.amount + ' Blocks' : STATUS_TEXT[e.status], e.status === 'hodl' ? 'good' : 'status');
        await sleep(800);
        break;

      case 'banner':
        render(e.snap);
        banner(e.text, e.sub);
        await sleep(1250);
        break;

      case 'ko':
        S.koProp = koPropFor(e.winner, e.cause) ? { who: e.loser, prop: koPropFor(e.winner, e.cause) } : null;
        render(e.snap);
        fighterEl(e.loser).classList.add('is-ko');
        banner(e.timeout ? 'TIME!' : 'K.O.', e.finish, true);
        buzz(e.loser === 0 ? 250 : 80);
        var scene = koSceneFor(e.winner, e.cause);
        await sleep(scene ? 1400 : 2100);
        if (scene === 'astronaut') await astronautScene();
        break;

      case 'end':
        render(e.snap);
        chip(0, null);
        chip(1, null);
        fighterEl(0).classList.remove('dance');
        fighterEl(1).classList.remove('dance');
        await sleep(150);
        break;
    }
  }

  async function doHit(e) {
    var multi = e.of > 1;
    if (e.move !== 'super') {
      lunge(e.attacker);
      await sleep(170);
    }
    render(e.snap);
    hurtFx(e.target);
    popup(e.target, '-' + e.amount, 'dmg', multi ? e.n : 0);
    if (e.target === 0) buzz(40);

    if (e.self) {
      banner('SELF-REKT', (e.attacker === 0 ? 'You are' : nm(e.attacker) + ' is') + ' hypnotized');
      log(who(e.attacker) + ' hit ' + (e.attacker === 0 ? 'yourself' : 'themselves') + ' for ' + e.amount + '.');
      await sleep(1350);
      return;
    }
    var stolen = e.stolen ? 'Stole ' + e.stolen + ' Blocks' : '';
    var sup = D.FIGHTERS[S.fight.f[e.attacker].id].super;
    if (e.move === 'super' && e.n === e.of && e.attacker === 1 && sup.cpuAfter && e.snap[e.target].hp > 0) {
      banner(sup.cpuAfter, '');
      await sleep(1300);
      return;
    }
    var hm = e.move === 'super' ? null : moveOf(S.fight.f[e.attacker].id, e.move);
    if (e.pierced) banner(hm.pierce, stolen || "Hiding didn't help");
    else if (e.move === 'rug' || e.move === 'mint') banner(hm.ok, stolen);
    if (!multi) log(who(e.attacker) + ' hit ' + (e.target === 0 ? 'you' : nm(e.target)) + ' for ' + e.amount + '.');
    await sleep(multi ? 240 : (e.move === 'rug' || e.move === 'mint') ? 1050 : 650);
  }

  // ---------- Effects ----------
  function log(text) { $('#log').textContent = text; }

  function bubble(i, emoji) {
    var b = $('.f-bubble', fighterEl(i));
    if (!b) return;
    b.textContent = emoji;
    b.classList.toggle('spin', emoji === '🌀');
  }

  function chip(i, move, hyp) {
    var c = $('.f-chip', fighterEl(i));
    if (!c) return;
    if (!move) { c.classList.remove('show'); return; }
    var m = moveOf(S.fight.f[i].id, move);
    var attack = move === 'strike' || move === 'mint' || move === 'rug';
    c.textContent = m.icon + ' ' + m.name.toUpperCase() + (hyp && attack ? ' 🌀' : '');
    // Tinted by job, so a renamed button still reads as "the big gamble" etc.
    c.className = 'f-chip show role-' + move;
  }

  function restartClass(el, cls, ms) {
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
    later(function () { el.classList.remove(cls); }, ms);
  }
  function lunge(i) { restartClass(fighterEl(i), 'lunge', 230); }
  function hurtFx(i) { restartClass(fighterEl(i), 'hurt', 380); }
  function wobble(i) { restartClass(fighterEl(i), 'wobble', 520); }

  function popup(i, text, kind, n) {
    var el = fighterEl(i), layer = $('#popups');
    var p = document.createElement('div');
    p.className = 'popup ' + (kind || '');
    p.textContent = text;
    var x = el.offsetLeft + el.offsetWidth / 2 + (n ? ((n % 3) - 1) * 26 : 0);
    var y = el.offsetTop + el.offsetHeight * 0.1 - (n ? (n % 2) * 18 : 0);
    p.style.left = x + 'px';
    p.style.top = y + 'px';
    layer.appendChild(p);
    setTimeout(function () { p.remove(); }, 1200);
  }

  function banner(text, sub, ko) {
    var b = $('#banner');
    $('.banner-text', b).textContent = text;
    $('.banner-sub', b).textContent = sub || '';
    b.className = 'banner';
    void b.offsetWidth;
    b.className = 'banner show' + (ko ? ' ko' : text.length > 18 ? ' long' : '');
  }

  function buzz(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* ignore */ }
  }

  // ---------- Super cut-ins ----------
  function spans(s, n) {
    var o = '';
    for (var i = 0; i < n; i++) o += '<span>' + s + '</span>';
    return o;
  }

  function randomHex(n) {
    var o = '';
    for (var i = 0; i < n; i++) o += '0123456789abcdef'[Math.floor(Math.random() * 16)];
    return o;
  }

  // Vitalik's dance: everyone on the big screen and on stage, arms locked straight out, swaying in sync.
  function dancerSVG(kind) {
    if (kind === 'bear') {
      return '<svg class="dancer" viewBox="0 0 60 92" aria-hidden="true"><g class="dz" stroke="#111" stroke-width="2">' +
        '<rect x="20" y="62" width="8" height="27" rx="4" fill="#7a4a1f"/>' +
        '<rect x="32" y="62" width="8" height="27" rx="4" fill="#7a4a1f"/>' +
        '<rect x="1" y="36" width="58" height="8" rx="4" fill="#8b5a2b"/>' +
        '<ellipse cx="30" cy="52" rx="14" ry="16" fill="#a0692f"/>' +
        '<ellipse cx="30" cy="55" rx="8" ry="9" fill="#d9a86c" stroke="none"/>' +
        '<circle cx="19" cy="11" r="6" fill="#a0692f"/><circle cx="41" cy="11" r="6" fill="#a0692f"/>' +
        '<circle cx="30" cy="22" r="13" fill="#a0692f"/>' +
        '<ellipse cx="30" cy="27" rx="6" ry="4.5" fill="#d9a86c" stroke="none"/>' +
        '<circle cx="30" cy="25.5" r="1.8" fill="#111" stroke="none"/>' +
        '<circle cx="25" cy="19" r="1.6" fill="#111" stroke="none"/><circle cx="35" cy="19" r="1.6" fill="#111" stroke="none"/>' +
        '</g></svg>';
    }
    return '<svg class="dancer vitalik-dancer" viewBox="0 0 80 150" aria-hidden="true"><g class="dz" stroke="#111" stroke-width="2.5">' +
      '<rect x="31" y="92" width="7" height="54" rx="3.5" fill="#2b2b3a"/>' +
      '<rect x="42" y="92" width="7" height="54" rx="3.5" fill="#2b2b3a"/>' +
      '<rect x="2" y="50" width="76" height="7" rx="3.5" fill="#f2d4b6"/>' +
      '<rect x="28" y="44" width="24" height="52" rx="6" fill="#9b7bff"/>' +
      '<ellipse cx="40" cy="26" rx="12" ry="16" fill="#f2d4b6"/>' +
      '<path d="M28 21 Q40 2 52 21 Q40 13 28 21Z" fill="#5b3d26"/>' +
      '<circle cx="35.5" cy="26" r="1.8" fill="#111" stroke="none"/><circle cx="44.5" cy="26" r="1.8" fill="#111" stroke="none"/>' +
      '<path d="M35 34 Q40 38 45 34" fill="none"/>' +
      '</g></svg>';
  }

  // Toly: generic thick phone slabs with a stupid camera bump. No real logos.
  function phoneBrick(screen, style) {
    return '<div class="brick"' + (style ? ' style="' + style + '"' : '') + '>' +
      '<span class="brick-bump"><i></i><i></i></span><span class="brick-screen">' + esc(screen) + '</span></div>';
  }

  function salesDeco(ctx) {
    var screens = ['Seed Vault', 'dApp Store', 'BUY NOW', 'dApp Store', 'Seed Vault'];
    var fan = [-36, -18, 0, 18, 36].map(function (deg, k) {
      return phoneBrick(screens[k], '--r:' + deg + 'deg;--d:' + (0.2 + k * 0.05) + 's;z-index:' + (3 - Math.abs(k - 2)));
    }).join('');
    // Airdrop confetti and BONK-colored beanbags (cosmetic, so Math.random is fine here).
    var colors = ['#19c6a0', '#9b7bff', '#ffb31a', '#ff7a45', '#ffffff'], bits = '';
    for (var k = 0; k < 30; k++) {
      var a = Math.random() * Math.PI * 2, dist = 60 + Math.random() * 150;
      bits += '<i style="--x:' + Math.round(Math.cos(a) * dist) + 'px;--y:' + Math.round(Math.sin(a) * dist) + 'px;' +
        '--rot:' + Math.round(Math.random() * 720 - 360) + 'deg;background:' + colors[k % colors.length] +
        (k % 3 === 0 ? ';border-radius:50%;width:14px;height:14px' : '') + '"></i>';
    }
    return {
      screen: '<div class="brochure">' + fan + '</div>' +
        // They tried to hide from a salesman: warehouse inventory falls out anyway.
        (ctx && ctx.targetTriedToHide ? '<div class="saga-box"><b>SAGA</b><small>WAREHOUSE STOCK</small></div>' : ''),
      portrait: '<div class="slap">' + phoneBrick('BUY NOW') + '</div><div class="confetti">' + bits + '</div>'
    };
  }

  // Returns { screen, portrait }: full-screen decoration, and decoration anchored to the fighter's portrait.
  // Saylor's Sunday tracker: price line up and to the right, orange dots stamp on one by one.
  function trackerChart() {
    var pts = [[0, 112], [28, 98], [52, 104], [78, 76], [104, 84], [130, 58], [158, 66], [188, 40], [214, 48], [244, 24], [272, 30], [300, 10]];
    var dots = [1, 3, 5, 7, 9, 11].map(function (k, n) {
      var big = k === 11;
      return '<circle class="odot' + (big ? ' odot-big' : '') + '" cx="' + pts[k][0] + '" cy="' + pts[k][1] + '" r="' + (big ? 9 : 6) +
        '" style="animation-delay:' + (0.35 + n * 0.17).toFixed(2) + 's"/>';
    }).join('');
    return '<div class="tracker"><svg viewBox="-12 -12 324 136" aria-hidden="true">' +
      '<polyline points="' + pts.map(function (p) { return p.join(','); }).join(' ') + '" fill="none" stroke="#e9e3ff" stroke-width="3" stroke-linejoin="round"/>' +
      dots + '</svg></div>';
  }

  function decoFor(id, ctx) {
    switch (id) {
      case 'salesman': return salesDeco(ctx);
      case 'dance':
        return {
          screen: '<div class="bigscreen">' + dancerSVG('bear') + dancerSVG('bear') + dancerSVG('bear') + dancerSVG('bear') + '</div>',
          portrait: dancerSVG('vitalik')
        };
      case 'helium': return { screen: '<div class="deco-sun"></div>', portrait: '<div class="dome-beam"></div>' };
      case 'xrparmy': return { screen: '<div class="deco-run">' + spans('🏃', 6) + '</div>' };
      case 'peerreview': return { screen: '<div class="deco-row deco-nerds">' + spans('🤓💻', 5) + '</div>' };
      case 'orangedot': return { screen: trackerChart() };
      case 'opreturn': return { screen: '<div class="deco-bytes">OP_RETURN 6a4c50' + randomHex(28) + '…</div>' };
    }
    return {};
  }

  // The astronaut DJ: white suit, dark visor, headphones, fist up, behind a booth with a ₿-stickered
  // laptop, speakers on both sides, a giant eye on the big screen behind. mini = just the astronaut.
  function astronautSVG(mini) {
    var astro =
      '<g class="astro">' +
        '<path d="M136 176 Q136 134 160 132 Q184 134 184 176Z" fill="#f2f2f2" stroke="#222" stroke-width="2"/>' +
        '<rect class="astro-arm" x="180" y="112" width="11" height="36" rx="5.5" fill="#f2f2f2" stroke="#222" stroke-width="2"/>' +
        '<circle cx="185" cy="110" r="7" fill="#e6e6e6" stroke="#222" stroke-width="2"/>' +
        '<circle cx="160" cy="114" r="20" fill="#f7f7f7" stroke="#222" stroke-width="2"/>' +
        '<ellipse cx="162" cy="117" rx="13.5" ry="10.5" fill="#12141c"/>' +
        '<ellipse cx="157" cy="112.5" rx="4.5" ry="2" fill="#56607a"/>' +
        '<path d="M139 112 Q160 80 181 112" fill="none" stroke="#111" stroke-width="5" stroke-linecap="round"/>' +
        '<rect x="134" y="106" width="9" height="16" rx="3" fill="#111"/><rect x="177" y="106" width="9" height="16" rx="3" fill="#111"/>' +
      '</g>';
    if (mini) return '<svg viewBox="128 74 70 104" aria-hidden="true">' + astro + '</svg>';
    var speaker = function (x) {
      return '<g class="spk"><rect x="' + x + '" y="118" width="46" height="84" rx="3" fill="#161616" stroke="#000" stroke-width="2"/>' +
        '<circle cx="' + (x + 23) + '" cy="139" r="8" fill="#2c2c2c"/>' +
        '<circle cx="' + (x + 23) + '" cy="172" r="15" fill="#cdb57c" stroke="#2c2c2c" stroke-width="4"/></g>';
    };
    return '<svg viewBox="0 0 320 232" aria-hidden="true">' +
      '<defs><linearGradient id="djSun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5d17"/><stop offset="1" stop-color="#2b2008"/></linearGradient>' +
      '<linearGradient id="djScreen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f1e9f8"/><stop offset=".5" stop-color="#bfaedb"/><stop offset="1" stop-color="#57447f"/></linearGradient></defs>' +
      '<rect width="320" height="232" fill="url(#djSun)"/>' +
      '<g fill="#c99a3b" stroke="#3a2a08" stroke-width="2"><rect x="4" y="30" width="312" height="10"/><rect x="14" y="40" width="11" height="166"/><rect x="295" y="40" width="11" height="166"/></g>' +
      '<rect x="60" y="10" width="200" height="98" rx="3" fill="url(#djScreen)" stroke="#111" stroke-width="4"/>' +
      '<path d="M88 46 Q126 26 168 44" fill="none" stroke="#2e2440" stroke-width="6" stroke-linecap="round"/>' +
      '<path d="M94 64 Q128 40 164 62 Q128 80 94 64Z" fill="#fbf8ff" stroke="#3b2f55" stroke-width="2"/>' +
      '<circle cx="129" cy="61" r="10" fill="#4a2f7a"/><circle cx="129" cy="61" r="4.5" fill="#111"/>' +
      '<rect x="0" y="204" width="320" height="28" fill="#d8b058"/><rect x="0" y="204" width="320" height="4" fill="#efd08a"/>' +
      speaker(30) + speaker(244) + astro +
      '<rect x="108" y="154" width="104" height="9" fill="#1b1b1b" stroke="#000" stroke-width="2"/>' +
      '<rect x="112" y="163" width="96" height="41" fill="#3a2a17" stroke="#000" stroke-width="2"/>' +
      '<g stroke="#5a4426" stroke-width="2"><path d="M114 172H206M114 180H206M114 188H206M114 196H206"/></g>' +
      '<path d="M116 154 L122 130 L158 130 L154 154Z" fill="#a7b0ba" stroke="#222" stroke-width="1.5"/>' +
      '<circle cx="146" cy="140" r="6" fill="#f7931a"/><text x="146" y="143" font-size="8" font-weight="900" text-anchor="middle" fill="#fff">₿</text>' +
      '<circle cx="131" cy="145" r="4.5" fill="#2f6fed"/><rect x="127" y="134" width="9" height="5" fill="#e33"/>' +
      '</svg>';
  }

  function astronautScene() {
    return new Promise(function (resolve) {
      var el = $('#koscene');
      $('.ks-art', el).innerHTML = astronautSVG(false);
      el.hidden = false;
      void el.offsetWidth;
      el.classList.add('play');
      var done = false;
      var timer = later(finish, 3000);
      function finish() {
        if (done) return;
        done = true;
        clearTimeout(timer);
        el.onclick = null;
        el.classList.remove('play');
        el.hidden = true;
        resolve();
      }
      later(function () { if (!done) el.onclick = finish; }, 600);
    });
  }

  var FLICKER_START = 450; // ms: first word holds while the name card lands
  var FLICKER_STEP = 450;  // ms per word

  function cutIn(i, ctx) {
    return new Promise(function (resolve) {
      var F = D.FIGHTERS[S.fight.f[i].id], sup = F.super, el = $('#cutin');
      el.className = 'cutin from-' + SIDE[i] + ' sup-' + sup.id;
      el.style.setProperty('--c', F.color);
      $('.cutin-head', el).textContent = F.emoji;
      $('.cutin-prop', el).textContent = sup.prop;
      // Name card flicker (Mert: HELIUS -> HELIUM -> HIVEMAPPER -> CEO OF HELIUM). Each word holds
      // long enough to read; the glitch only hits on the switch. The voice line, the beam and the
      // end of the cut-in wait for the lock.
      var nameEl = $('.cutin-name', el);
      var duration = sup.id === 'dance' ? 3000 : 2700;
      nameEl.textContent = sup.name.toUpperCase();
      nameEl.className = 'cutin-name';
      el.style.removeProperty('--lock');
      el.style.removeProperty('--line-delay');
      if (sup.flicker) {
        var lockAt = FLICKER_START + sup.flicker.length * FLICKER_STEP;
        nameEl.textContent = sup.flicker[0];
        nameEl.classList.add('flicker');
        sup.flicker.slice(1).concat(sup.name.toUpperCase()).forEach(function (txt, k, all) {
          later(function () {
            var last = k === all.length - 1;
            nameEl.textContent = txt;
            nameEl.classList.remove('glitch', 'lock');
            void nameEl.offsetWidth;
            if (last) nameEl.classList.remove('flicker');
            nameEl.classList.add(last ? 'lock' : 'glitch');
          }, FLICKER_START + (k + 1) * FLICKER_STEP);
        });
        el.style.setProperty('--lock', (lockAt / 1000) + 's');
        el.style.setProperty('--line-delay', ((lockAt + 150) / 1000) + 's');
        duration = lockAt + 1700;
      }
      el.style.setProperty('--dur', (duration / 1000) + 's');
      $('.cutin-who', el).textContent = F.name.toUpperCase();
      $('.cutin-line', el).textContent = '“' + sup.line + '”';
      var deco = decoFor(sup.id, ctx);
      $('.cutin-deco', el).innerHTML = deco.screen || '';
      $('.cutin-pdeco', el).innerHTML = deco.portrait || '';

      el.hidden = false;
      void el.offsetWidth;
      el.classList.add('play');

      var done = false;
      var timer = later(finish, duration);
      function finish() {
        if (done) return;
        done = true;
        clearTimeout(timer);
        el.onclick = null;
        el.hidden = true;
        el.classList.remove('play');
        resolve();
      }
      // Tap to skip, but not instantly (so a stray tap doesn't eat the whole thing).
      later(function () { if (!done) el.onclick = finish; }, 600);
    });
  }

  // ---------- Results & sharing ----------
  function finishFight() {
    var f = S.fight, o = S.opts;
    var res = {
      mode: o.mode, n: o.n, player: f.f[0].id, cpu: f.f[1].id,
      won: f.winner === 0, turns: f.turn, hp: f.f[f.winner].hp, finish: f.finish,
      grid: f.grid.slice(), rules: f.rules.id, seed: f.seed, moves: f.moves.join(''),
      koProp: koPropFor(f.winner, f.finishCause),
      koScene: koSceneFor(f.winner, f.finishCause)
    };
    if (o.mode === 'daily') {
      if (!store.get('daily.' + o.n)) {
        store.set('daily.' + o.n, res);
        recordStats(res);
      }
      store.set('progress', null);
    }
    S.result = res;
    showResult(res);
  }

  function gridText(res) {
    return res.grid.map(function (c) { return GRID_EMOJI[c] || '⬛'; }).join('') + (res.won ? '🏆' : '💀');
  }

  function siteUrl() {
    var local = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname);
    if (/^https?:$/.test(location.protocol) && !local) {
      return location.origin + location.pathname.replace(/index\.html$/, '');
    }
    return 'https://proofoffight.com';
  }

  function shareText(res) {
    var P = D.FIGHTERS[res.player].name, C = D.FIGHTERS[res.cpu].name;
    if (res.mode === 'daily') {
      return 'Proof of Fight Daily #' + res.n + ' 🥊\n' +
        P + ' vs ' + C + ': ' + (res.won
          ? 'WON in ' + res.turns + ' turns (' + res.hp + ' HP left)'
          : "KO'd in " + res.turns + ' turns') + '\n' +
        gridText(res) + '\n' + siteUrl();
    }
    var line = res.won
      ? P + ' just folded ' + C + ' in ' + res.turns + ' turns on Proof of Fight.'
      : C + ' folded my ' + P + ' in ' + res.turns + ' turns on Proof of Fight.';
    return line + '\n' + titleCase(res.finish) + '.\n' + gridText(res) + '\n' + siteUrl();
  }

  function face(F, lost, prop) {
    return '<span class="face-wrap"><span class="face' + (lost ? ' lost' : '') + '" style="--c:' + F.color + '">' +
      F.emoji + '</span>' + (prop ? '<i class="face-prop">' + prop + '</i>' : '') + '</span>';
  }

  // Some Super KOs get an extra scene (Saylor: the astronaut DJ).
  function koSceneFor(winner, cause) {
    if (cause !== 'super' || !S.fight) return null;
    return D.FIGHTERS[S.fight.f[winner].id].super.koScene || null;
  }

  // Some Supers leave a prop on the loser (Toly's phone). Only when the Super did the KO.
  function koPropFor(winner, cause) {
    if (cause !== 'super' || !S.fight) return null;
    return D.FIGHTERS[S.fight.f[winner].id].super.koProp || null;
  }

  function showResult(res) {
    var P = D.FIGHTERS[res.player], C = D.FIGHTERS[res.cpu];
    $('#res-kicker').textContent = res.mode === 'daily' ? 'DAILY FIGHT #' + res.n
      : res.rules === 'original' ? 'FREE PLAY · ORIGINAL RULES' : 'FREE PLAY';
    var t = $('#res-title');
    t.textContent = res.won ? 'YOU WIN' : 'YOU LOSE';
    t.classList.toggle('lose', !res.won);
    $('#res-faces').innerHTML = face(P, !res.won, !res.won && res.koProp) + '<span>VS</span>' + face(C, res.won, res.won && res.koProp);
    // The astronaut stays in the background of the result card, headphones still on.
    var astro = $('.res-astro');
    if (astro) astro.remove();
    if (res.koScene === 'astronaut') {
      $('.result-card').insertAdjacentHTML('afterbegin', '<div class="res-astro">' + astronautSVG(true) + '</div>');
    }
    $('#res-line').textContent = res.won
      ? P.name + ' beat ' + C.name + ' in ' + res.turns + ' turns · ' + res.hp + ' HP left'
      : C.name + ' beat your ' + P.name + ' in ' + res.turns + ' turns';
    $('#res-finish').textContent = res.finish;
    $('#res-grid').textContent = gridText(res);
    $('#res-share').textContent = navigator.share ? 'Share result' : 'Copy result';
    $('#res-x').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareText(res));
    $('#res-again').textContent = res.mode === 'daily' ? 'Practice this matchup' : 'Rematch';

    clearInterval(S.countdown);
    var meta = $('#res-meta');
    if (res.mode === 'daily') {
      var tick = function () {
        var st = store.get('stats', null);
        meta.textContent = (st ? 'Streak ' + st.streak + ' · ' : '') + 'Next daily in ' + fmtCountdown(untilMidnight());
      };
      tick();
      S.countdown = setInterval(tick, 1000);
    } else {
      meta.textContent = '';
    }
    $('#modal-result').hidden = false;
  }

  function closeResult() {
    clearInterval(S.countdown);
    $('#modal-result').hidden = true;
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise(function (resolve, reject) {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { if (document.execCommand('copy')) resolve(); else reject(); }
      catch (e) { reject(e); }
      ta.remove();
    });
  }

  function toast(text) {
    var t = $('#toast');
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.hidden = true; }, 1800);
  }

  function onShare() {
    var text = shareText(S.result);
    if (navigator.share) {
      navigator.share({ text: text }).catch(function () { /* user closed the sheet */ });
      return;
    }
    copyText(text).then(
      function () { toast('Copied! Paste it anywhere.'); },
      function () { toast("Couldn't copy. Try Post on X."); }
    );
  }

  // ---------- Help ----------
  function openHelp() {
    var R = S.fight && !$('#screen-fight').hidden ? S.fight.rules : D.RULESETS[S.rules];
    $('#help-body').innerHTML =
      '<p>You and the CPU each pick a move at the same time. First to 0 HP loses.</p>' +
      '<h3>The five buttons</h3>' +
      '<p>Some fighters have their own names for these (Mert\'s red button is Shitpost). Same color, same job. ' +
      'Damage and odds are on each button, and a few fighters hit harder or softer than the numbers below. ' +
      'Saylor\'s blue button (STRF) never hides: it always works and halves the damage instead.</p><ul>' +
      '<li><b>🔴 Red (Strike)</b>: ' + R.strike + ' damage. Always hits unless they hid. The honest move.</li>' +
      '<li><b>🔵 Blue (Privacy)</b>: try to hide (odds depend on your fighter). Hidden means red and pink miss you' +
        (R.rugPiercesHidden ? '. Purple still gets you.' : ', and so does purple.') + '</li>' +
      '<li><b>🩷 Pink (Mint)</b>: ' + R.mint + ' damage if it lands. If not: ARTWORK SUCKS.</li>' +
      '<li><b>🟣 Purple (Rug)</b>: ' + R.rug + ' damage and steal 2 Blocks.' +
        (R.rugPiercesHidden ? " Hits even if they're hidden." : '') +
        ' Fail and you lose 2 Blocks (or take ' + R.rugRecoil + ' damage if you have none).</li>' +
      "<li><b>🟡 Gold (Super)</b>: needs all 10 Blocks. Plays a cut-in. Can't be dodged.</li></ul>" +
      '<h3>Blocks</h3>' +
      '<p>Red +2 · blue +3 if you hid, +1 if not · pink +2 (or +1 on a dud) · getting hit +1. ' +
      'The CPU fires its Super the moment its row is full, and you get a warning first.</p>' +
      '<h3>Statuses</h3><ul>' +
      '<li>🙈 <b>Blind</b> / 💤 <b>Asleep</b>: skip your next turn.</li>' +
      '<li>🌀 <b>Hypnotized</b>: your next red, pink or purple move hits yourself. Blue or Super is safe.</li>' +
      '<li>💎 <b>HODL</b>: take half damage this turn and next.</li></ul>' +
      '<h3>Order of a turn</h3>' +
      '<p>Supers, then blue (hiding), then red / pink / purple. You go first in each step. The fight ends the instant someone hits 0.</p>' +
      '<h3>Daily Fight</h3>' +
      '<p>Everyone gets the same matchup and the same luck each day. One try. Share your grid; fewer turns is better.</p>';
    $('#modal-help').hidden = false;
  }

  // ---------- Wiring ----------
  function init() {
    $('.title-roster').innerHTML = D.ROSTER.map(function (id) {
      var F = D.FIGHTERS[id];
      return '<span style="--c:' + F.color + '">' + F.emoji + '</span>';
    }).join('');
    $('#rules-select').innerHTML = Object.keys(D.RULESETS).map(function (k) {
      return '<option value="' + k + '">' + esc(D.RULESETS[k].label) + '</option>';
    }).join('');
    $('#rules-select').addEventListener('change', function (ev) {
      S.rules = ev.target.value;
      store.set('rules', S.rules);
    });

    $('#btn-daily').addEventListener('click', startDaily);
    $('#btn-free').addEventListener('click', function () { S.pickPlayer = null; renderPick('player'); });
    $('#btn-help').addEventListener('click', openHelp);
    $('#btn-fight-help').addEventListener('click', openHelp);
    $('#help-close').addEventListener('click', function () { $('#modal-help').hidden = true; });

    $('#pick-back').addEventListener('click', function () {
      if (S.pickStep === 'cpu') renderPick('player'); else renderTitle();
    });
    $('#pick-suggest').addEventListener('click', function () {
      startFree(D.FIRST_FIGHT.player, D.FIRST_FIGHT.cpu);
    });
    $('#pick-grid').addEventListener('click', function (ev) {
      var card = ev.target.closest('.pick-card');
      if (!card) return;
      var id = card.dataset.id;
      if (S.pickStep === 'player') {
        S.pickPlayer = id;
        renderPick('cpu');
      } else {
        if (id === 'random') id = D.ROSTER[Math.floor(Math.random() * D.ROSTER.length)];
        startFree(S.pickPlayer, id);
      }
    });

    $all('#controls .move').forEach(function (b) {
      b.addEventListener('click', function () { onMove(b.dataset.move); });
    });
    $('#btn-continue').addEventListener('click', function () { onMove(null); });
    $('#btn-quit').addEventListener('click', function () {
      if (S.busy) return;
      var msg = S.opts.mode === 'daily' && !S.fight.over
        ? 'Leave? Your daily fight is saved. Come back to finish it.'
        : 'Leave this fight?';
      if (window.confirm(msg)) renderTitle();
    });

    $('#res-share').addEventListener('click', onShare);
    $('#res-again').addEventListener('click', function () {
      var r = S.result;
      closeResult();
      startFree(r.player, r.cpu, r.mode === 'daily' ? 'balanced' : r.rules);
    });
    $('#res-menu').addEventListener('click', function () { closeResult(); renderTitle(); });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        $('#modal-help').hidden = true;
        return;
      }
      if ($('#screen-fight').hidden || !$('#modal-result').hidden || !$('#modal-help').hidden || !S.fight) return;
      if (ev.target.tagName === 'SELECT' || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (E.playerStatus(S.fight).skipped && (ev.key === 'Enter' || ev.key === ' ')) {
        ev.preventDefault();
        onMove(null);
        return;
      }
      var map = { '1': 'strike', '2': 'privacy', '3': 'mint', '4': 'rug', '5': 'super', ' ': 'super' };
      if (map[ev.key]) {
        ev.preventDefault();
        onMove(map[ev.key]);
      }
    });

    renderTitle();
  }

  init();
})();
