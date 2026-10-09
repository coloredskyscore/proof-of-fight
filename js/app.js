// Proof of Fight — screens, animation and sharing. Game rules live in engine.js.
(function () {
  'use strict';
  var D = window.POF_DATA, E = window.POF_ENGINE, AU = window.POF_AUDIO;

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
  // Share text: "HATER CONVERTED" -> "Hater Converted", but acronyms stay as written ("LFG 2027").
  var KEEP_CAPS = ['LFG', 'ZK', 'MSTR', 'STRC', 'RPCS', 'JPEG', 'XRP', 'NIGHT', 'OP_RETURN', 'SIBOS', 'CCIP', 'SAFU', 'FUD'];
  function titleCase(s) {
    return s.split(' ').map(function (w) {
      if (KEEP_CAPS.indexOf(w.replace(/[^A-Z_]/g, '')) >= 0) return w;
      return w.toLowerCase().replace(/(^|-)([a-z])/g, function (m, a, b) { return a + b.toUpperCase(); });
    }).join(' ');
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
    hodl: '💎 HODL', pruned: '✂️ PRUNED', drain: '-3 Blocks', stun: '👀 STARING', shield: '4️⃣ FUD-PROOF', letter: '📜 READING',
    plan: '📜 READING'
  };
  // Why someone skips a turn: Mert's dome, Charles's midnight, Sergey's shirt.
  var SKIP = {
    blind: { icon: '🙈', chip: 'BLIND', word: 'BLINDED', sound: 'huh' },
    sleep: { icon: '💤', chip: 'ASLEEP', word: 'ASLEEP', sound: 'snore' },
    stun:  { icon: '👀', chip: 'STARING', word: 'STARING', sound: 'stare' },
    letter: { icon: '📜', chip: 'READING', word: 'READING', sound: 'paper' },  // Warren's Letter
    plan: { icon: '📜', chip: 'READING', word: 'READING', sound: 'paper' }     // her Super, The Plan
  };
  var GRID_EMOJI = { hit: '🟩', hid: '🟦', super: '🟨', fail: '🟥', miss: '🟥', skip: '⬛', self: '🌀', none: '⬛' };
  var SIDE = ['p', 'c'];

  var S = {
    fight: null, opts: null, busy: false, result: null, today: null,
    pickPlayer: null, pickStep: 'player', countdown: null,
    lastMoves: null, koProp: null, run: null, stCount: null,
    rules: D.RULESETS[store.get('rules')] ? store.get('rules') : 'balanced'
  };

  // ---------- Daily fight ----------
  function dayNumber(date) {
    var e = D.DAILY_EPOCH.split('-').map(Number);
    var epoch = Date.UTC(e[0], e[1] - 1, e[2]);
    var today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    return Math.max(1, Math.floor((today - epoch) / 86400000) + 1);
  }

  // A new fighter joins the Daily Fight draw from its dailyFrom day, so shipping one never changes
  // a day's matchup (or a daily someone already started) halfway through.
  function dailySetup(n) {
    var rng = E.makeRng(E.hashString('pof-daily-' + n));
    var roster = D.ROSTER.filter(function (id) {
      var from = D.FIGHTERS[id].dailyFrom;
      return !from || dayNumber(new Date(from + 'T12:00:00')) <= n;
    }), p, c;
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
    $('#btn-story').hidden = !STORY_ON;
    var run = runGet();
    $('#btn-story').textContent = run ? '📖 Resume story · Boss ' + (Math.min(run.rung, D.STORY.ladder.length - 1) + 1) : '📖 Story';
    show('screen-title');
    AU.music('menu', { from: 'loop', fade: 0.8 });
  }

  function renderPick(step) {
    S.pickStep = step;
    AU.music('menu', { from: 'loop', fade: 0.8 });
    $('#pick-title').textContent = step === 'cpu' ? 'Pick your opponent' : step === 'story' ? 'Story: pick your fighter' : 'Pick your fighter';
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
        '<span class="pick-face">' + faceHTML(F) + '</span>' +
        '<span class="pick-name">' + esc(F.name) + '</span>' +
        '<span class="pick-lane">' + esc(F.lane) + '</span>' +
        moves +
        '<span class="pick-super">⚡ ' + esc(F.super.name) + '</span>' +
        '<span class="pick-odds">' + (R.hp[id] || R.hp.default) + ' HP · ' +
        (F.brace ? esc(moveOf(id, 'privacy').name) + (F.brace.ignore ? ' blocks red/pink' : ' halves dmg')
          : F.stun ? esc(moveOf(id, 'privacy').name) + ' stuns ' + pct(F.hide) : 'Hide ' + pct(F.hide)) +
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
    var moves = prog && prog.n === t.n && (!prog.player || (prog.player === t.player && prog.cpu === t.cpu)) ? prog.moves : '';
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
    S.assistRang = false;
    S.stealShown = false;
    S.levShown = false;
    S.closeShown = false;
    buildArena();
    render(E.snapshot(S.fight));
    $('#turn-num').textContent = S.fight.turn;
    show('screen-fight');
    fitNames(); // measured once the screen is showing
    if (S.fight.over) { finishFight(); return; }
    S.busy = true;
    updateControls();
    beginFight(opts, resumeMoves);
  }

  function beginFight(opts, resumeMoves) {
    AU.music(fightSong(), { fade: 0.12, restart: true }); // opens on the song's drop hit
    log(resumeMoves ? 'Picking up where you left off.' : 'Tap a move. The CPU picks at the same time.');
    // A boss opens with their line first (Warren: WE NEED REGULATION. YES WE DO.), then BOSS 3 / FIGHT!
    var boss = opts.mode === 'story' && D.FIGHTERS[opts.cpu].boss, wait = 0;
    if (boss && boss.intro && !resumeMoves) wait = banner(boss.intro, D.FIGHTERS[opts.cpu].name) - 250;
    later(function () {
      banner(resumeMoves ? 'RESUME' : opts.mode === 'story' ? (isFinal(opts.rung) ? 'FINAL BOSS' : 'BOSS ' + (opts.rung + 1)) : 'ROUND 1', 'FIGHT!');
    }, wait);
    later(function () {
      S.busy = false;
      updateControls();
      if (!store.get('seenHelp')) { store.set('seenHelp', true); openHelp(); }
    }, wait + 1100);
  }

  // A fighter's face: their portrait if they have art, else their emoji.
  function faceHTML(F) {
    return F.art && F.art.head ? '<img class="art-head" src="' + F.art.head + '" alt="" decoding="async">' : F.emoji;
  }

  function fighterHTML(F) {
    var top = '<div class="f-chip"></div><div class="f-bubble"></div><div class="f-flip"><div class="f-bob">';
    // A sprite replaces the block body (and anything held, which the art draws itself).
    if (F.art && F.art.body) {
      return top + '<div class="f-sprite"><img class="f-art" src="' + F.art.body + '" alt="" decoding="async"></div>' +
        '</div></div><div class="f-shadow"></div>';
    }
    return top + '<div class="f-sprite">' +
      '<div class="f-legs"><span></span><span></span></div>' +
      '<div class="f-torso"></div>' +
      // A portrait on the block body mirrors with it to face the opponent; an emoji is kept unflipped.
      '<div class="f-head">' + (F.art && F.art.head ? faceHTML(F) : '<span>' + F.emoji + '</span>') + '</div>' +
      '<span class="f-fist f-fist-b"></span><span class="f-fist f-fist-a"></span>' +
      (F.heldProp ? '<span class="f-held">' + F.heldProp + '</span>' : '') +
      '</div></div></div><div class="f-shadow"></div>';
  }

  // A long name (Garlinghouse, on a small phone) shrinks just enough to fit next to the YOU/CPU tag.
  function fitNames() {
    $all('.hud-name').forEach(function (row) {
      var name = $('.hud-fname', row);
      name.style.fontSize = '';
      // Width of the name plus its tag against the room there is (the CPU side overflows to the left,
      // which scrollWidth doesn't count).
      var used = 0, kids = row.children;
      for (var k = 0; k < kids.length; k++) used += kids[k].offsetWidth;
      used += (parseFloat(getComputedStyle(row).columnGap) || 0) * (kids.length - 1);
      var over = used - row.clientWidth;
      if (over <= 0) return;
      var size = parseFloat(getComputedStyle(name).fontSize), w = name.offsetWidth;
      name.style.fontSize = Math.max(9, size * (w - over - 2) / w) + 'px';
    });
  }

  function buildArena() {
    var f = S.fight;
    [0, 1].forEach(function (i) {
      var F = D.FIGHTERS[f.f[i].id], side = SIDE[i];
      var el = $('#fighter-' + side);
      el.className = 'fighter side-' + side + (F.art && F.art.body ? ' has-art' : '');
      el.dataset.id = F.id;
      el.style.setProperty('--c', F.color);
      el.innerHTML = fighterHTML(F);
      var hud = $('#hud-' + side);
      $('.hud-fname', hud).textContent = F.short || F.name; // a long name gets a short one on the health bar
      $('.blocks', hud).innerHTML = new Array(D.MAX_BLOCKS + 1).join('<i></i>');
    });
    $('#hud-mode').textContent = S.opts.mode === 'daily' ? 'DAILY #' + S.opts.n
      : S.opts.mode === 'story' ? (S.opts.practice ? 'REMATCH · ' : 'STORY · ') + (isFinal(S.opts.rung) ? 'FINAL BOSS' : 'BOSS ' + (S.opts.rung + 1))
      : f.rules.id === 'original' ? 'ORIGINAL RULES' : 'FREE PLAY';
    // A boss fight has its own stage: their background art once it's made, their colors until then.
    var boss = S.opts.mode === 'story' && D.FIGHTERS[f.f[1].id].boss, st = boss && boss.stage;
    $('#stage').classList.toggle('has-stage', !!st);
    $('#stage').classList.toggle('has-stage-art', !!(st && st.bg));
    $('#stage .sky').style.background = st ? (st.bg ? 'url(' + st.bg + ') center bottom / cover no-repeat, ' + st.sky : st.sky) : '';
    $('#stage .ground').style.background = st && st.floor ? st.floor : '';
    // Story: the ally waits in the corner until you're low enough to call them in.
    var ab = $('#btn-assist'), A = S.opts.mode === 'story' && D.FIGHTERS[S.opts.ally];
    ab.hidden = !A;
    ab.innerHTML = A ? '<span class="face" style="--c:' + A.color + '">' + faceHTML(A) + '</span>' +
      '<span class="ab-txt"><span class="ab-label">ASSIST</span><span class="ab-sub"></span></span>' : '';
    $('#popups').innerHTML = '';
    $('#banner').className = 'banner';
    S.readUntil = 0;
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
      okSub: own.okSub || null,
      fail: own.fail || base.fail,
      // Purple hitting someone who hid: their own line, else their success line, else the default.
      pierce: own.pierce || own.ok || base.pierce,
      ticker: own.ticker || null, // Saylor's MSTR: shows MSTR ▲ 37% / MSTR ▼
      skipLine: own.skipLine || null, // Sergey's shirt: over them on the turn they lose
      steal: own.steal || null,       // SBF's 1) Fine: the banner when it takes your Blocks
      dodged: own.dodged || null,     // Warren's Letter, dodged: RETURN TO SENDER
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
      if (s.shield > 0) chips.push('<span class="chip good">4️⃣ FUD-PROOF</span>');
      if (s.stored > 0) chips.push('<span class="chip good">🦭 +' + s.stored + '</span>');
      if (s.bailout) chips.push('<span class="chip good">🏦 BAILOUT</span>');
      if (s.banned) chips.push('<span class="chip bad">🚫 BANNED</span>');
      if (s.lev) chips.push('<span class="chip lev' + (s.lev >= 25 ? ' bad hot' : s.lev > 1 ? ' bad' : '') + '">📈 ' + s.lev + 'X</span>');
      if (SKIP[s.skipNext]) chips.push('<span class="chip bad">' + SKIP[s.skipNext].icon + ' ' + SKIP[s.skipNext].chip + '</span>');
      if (s.hypnoNext) chips.push('<span class="chip bad">🌀 HYPNO</span>');
      $('.chips', hud).innerHTML = chips.join('');
      fighterEl(i).classList.toggle('is-hidden', !!s.hidden);
      bubble(i, S.koProp && S.koProp.who === i ? S.koProp.prop
        : s.hypnoNext ? '🌀' : SKIP[s.skipNext] ? SKIP[s.skipNext].icon
        : s.hidden ? '🕶️' : s.braced ? '🛡️' : '');
    }
  }

  // "10" for flat damage, "15–45" for a fighter whose damage rolls (Saylor's MSTR).
  function dmgText(fighterId, move, rules) {
    var r = E.damageRange(fighterId, move, rules);
    return r[0] === r[1] ? String(r[0]) : r[0] + '–' + r[1];
  }

  function updateControls() {
    var f = S.fight, st = E.playerStatus(f), me = f.f[0], F = D.FIGHTERS[me.id], R = f.rules;
    var locked = S.busy || f.over;
    // Against WICK, pink and purple show their leveraged damage and a 📈 (they raise it); blue closes it.
    var LV = D.FIGHTERS[f.f[1].id].leverage, lm = E.levMult(f, 0);
    var levDmg = function (m) {
      if (!LV) return dmgText(me.id, m, R);
      var r = E.damageRange(me.id, m, R).map(function (n) { return Math.round(n * lm); });
      return (r[0] === r[1] ? r[0] : r[0] + '–' + r[1]) + '';
    };
    var subs = {
      strike: dmgText(me.id, 'strike', R) + ' dmg · always',
      privacy: (F.brace ? (F.brace.ignore ? 'Blocks red/pink' : '½ dmg · always') : F.stun ? 'Stun · ' + pct(F.hide) : 'Hide ' + pct(F.hide)) +
        (LV && me.lev > 0 ? ' · to 1x' : ''),
      mint: levDmg('mint') + ' dmg · ' + pct(F.mint) + (LV ? ' · 📈' : ''),
      rug: levDmg('rug') + ' dmg · ' + pct(F.rug) + (LV ? ' · 📈' : '')
    };
    $all('#controls .move').forEach(function (b) {
      var m = b.dataset.move;
      if (m === 'super') {
        if (st.canSuper && !b.classList.contains('ready') && !f.over) AU.play('ready');
        b.classList.toggle('ready', st.canSuper);
        $('.move-label', b).textContent = st.canSuper ? F.super.name.toUpperCase() : 'SUPER';
        $('.move-sub', b).textContent = st.canSuper ? 'READY!' : me.blocks + '/' + D.MAX_BLOCKS + ' Blocks';
        b.disabled = locked || !st.canSuper;
      } else {
        var mo = moveOf(me.id, m), banned = st.banned === m;
        $('.move-icon', b).textContent = mo.icon;
        $('.move-label', b).innerHTML = esc(mo.name) + (mo.nick ? ' <small class="move-nick">' + esc(mo.nick) + '</small>' : '');
        $('.move-sub', b).textContent = banned ? 'Banned · ' + st.bannedTurns + (st.bannedTurns === 1 ? ' turn' : ' turns') : subs[m];
        b.classList.toggle('banned', banned);
        b.disabled = locked || banned;
      }
    });
    var ab = $('#btn-assist');
    if (S.opts.mode === 'story' && S.opts.ally) {
      var ready = E.canAssist(f);
      ab.hidden = !!f.assisted || f.over;
      ab.classList.toggle('ready', ready);
      ab.disabled = locked || !ready;
      $('.ab-sub', ab).textContent = ready ? 'TAP!' : '≤' + pct(D.STORY.assistAt) + ' HP';
      if (ready && !S.assistRang) { S.assistRang = true; AU.play('ready'); }
    }
    var skipping = !!st.skipped && !f.over;
    $('#controls').classList.toggle('skipping', skipping);
    $('#btn-continue').hidden = !skipping;
    $('#btn-continue').disabled = locked;

    var cpu = f.f[1], note = '';
    if (!f.over) {
      if (st.skipped === 'blind') note = "🙈 BLINDED by the dome. You skip this turn.";
      else if (st.skipped === 'sleep') note = '💤 Lights out at midnight. You fell ASLEEP and skip this turn.';
      else if (st.skipped === 'stun') note = "👀 You can't stop STARING at the shirt. You skip this turn.";
      else if (st.skipped === 'letter') note = '📜 Her LETTER landed. You skip this turn reading it. Hiding dodges the next one.';
      else if (st.skipped === 'plan') note = "📜 You're reading THE PLAN, her Super (Supers can't be dodged). You skip this turn.";
      else if (st.hypnotized) {
        note = '🌀 HYPNOTIZED: ' + moveOf(me.id, 'strike').name + ', ' + moveOf(me.id, 'mint').name + ' and ' +
          moveOf(me.id, 'rug').name + ' hit YOU this turn. ' + moveOf(me.id, 'privacy').name + ' or Super is safe.';
      }
      else if (cpu.blocks >= D.MAX_BLOCKS && !cpu.skipNext && LV) note = '⚠️ ' + cascadeNote(f, true);
      else if (cpu.blocks >= D.MAX_BLOCKS && !cpu.skipNext) note = '⚠️ ' + nm(1) + "'s Super fires this turn. It can't be dodged.";
      else if (st.canSuper) note = "⚡ Your Super is ready. It can't be dodged.";
      else if (LV && me.lev > 0) note = '📈 ' + cascadeNote(f, false);
    }
    $('#turn-note').textContent = note;
  }

  // What WICK's Liquidation Cascade will do at your leverage: one hit per step, everything at the top.
  function cascadeNote(f, now) {
    var LV = D.FIGHTERS[f.f[1].id].leverage, k = f.f[0].lev, x = LV.steps[k], top = k === LV.steps.length - 1;
    var what = top ? 'takes everything' : 'hits ' + (k + 1 === 1 ? 'once' : k + 1 + ' times');
    return now
      ? nm(1) + "'s Liquidation Cascade fires this turn: at " + x + 'x it ' + what + '.' + (k > 0 ? ' Blue closes your position first.' : '')
      : x + 'x leverage: his next Super ' + what + '. Blue takes you back to 1x.';
  }

  function saveProgress() {
    if (S.opts.mode !== 'daily') return;
    store.set('progress', { n: S.opts.n, player: S.opts.player, cpu: S.opts.cpu, moves: S.fight.moves.join('') });
  }

  function onMove(move) {
    if (S.busy || !S.fight || S.fight.over) return;
    var st = E.playerStatus(S.fight);
    if (st.skipped) move = null;
    else if (!move || (move === 'super' && !st.canSuper) || move === st.banned) return;

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
    for (var i = 0; i < events.length; i++) {
      await handle(events[i]);
      await readWait(); // a banner from that event gets its reading time before anything replaces it
    }
  }

  function moveText(i, move) {
    var m = moveOf(S.fight.f[i].id, move);
    return who(i) + ': ' + m.icon + ' ' + m.name;
  }

  async function handle(e) {
    switch (e.t) {
      case 'reveal':
        chip(0, e.moves[0], e.hyp[0]);
        chip(1, e.moves[1], e.hyp[1]);
        for (var r = 0; r < 2; r++) {
          // Same button two turns running (Toly's Slop Cannon: NO CHILL).
          var rep = D.FIGHTERS[S.fight.f[r].id].repeatLine;
          if (rep && rep[e.moves[r]] && S.lastMoves && S.lastMoves[r] === e.moves[r]) popup(r, rep[e.moves[r]], 'repeat');
        }
        S.lastMoves = e.moves;
        log(moveText(0, e.moves[0]) + '   ·   ' + moveText(1, e.moves[1]));
        await sleep(750);
        break;

      case 'skip':
        var why = SKIP[e.reason], by = S.fight.f[1 - e.who].id;
        bubble(e.who, why.icon);
        AU.play(why.sound);
        // The line belongs to whoever caused it: their Super's (WHO WAS THAT), or Sergey's shirt.
        // Warren: the sub says which one it was (her Letter, or her Super, which can't be dodged).
        var bm = D.FIGHTERS[by].moves || {};
        var src = e.reason === 'stun' ? bm.privacy : e.reason === 'letter' ? bm.mint : D.FIGHTERS[by].super;
        var skipLine = src && src.skipLine;
        if (skipLine) {
          banner(skipLine, (e.who === 0 ? 'You skip' : nm(e.who) + ' skips') + ' this turn' + (src.skipSub ? ' ' + src.skipSub : ''));
          await sleep(1200);
        } else {
          popup(e.who, why.word, 'status');
          await sleep(800);
        }
        break;

      case 'super':
        render(e.snap);
        if (S.fight.f[e.who].id === 'vitalik') fighterEl(e.who).classList.add('dance');
        await cutIn(e.who, { target: S.fight.f[1 - e.who].id, targetTriedToHide: !!S.lastMoves && S.lastMoves[1 - e.who] === 'privacy', lev: e.lev });
        log(who(e.who) + ' used ' + D.FIGHTERS[S.fight.f[e.who].id].super.name + '!');
        break;

      case 'hit':
        await doHit(e);
        break;

      case 'lev':
        // WICK's leverage: up a step for every pink or purple, back to 1x on blue or after his Super.
        render(e.snap);
        var top = D.FIGHTERS[S.fight.f[1 - e.who].id].leverage.steps.slice(-1)[0];
        if (e.why === 'open') {
          AU.play('lev.up');
          if (e.x === top) {
            banner(e.x + 'X LEVERAGE', 'His next Super takes everything. Blue closes it.');
            await sleep(1600);
          } else if (!S.levShown) {
            S.levShown = true;
            banner(e.x + 'X LEVERAGE', 'You hit harder. His Super hits harder, and sooner.');
            await sleep(1600);
          } else {
            popup(e.who, '📈 ' + e.x + 'X', e.x >= 25 ? 'status' : 'good');
            await sleep(450);
          }
        } else if (e.why === 'close') {
          AU.play('lev.close');
          if (!S.closeShown) {
            S.closeShown = true;
            banner('POSITION CLOSED', 'Back to 1x. His Super hits softer.');
            await sleep(1300);
          } else {
            popup(e.who, 'CLOSED · 1X', 'good');
            await sleep(450);
          }
        } else {
          banner('LIQUIDATED AT ' + e.from + 'X', (e.who === 0 ? 'Your' : whose(e.who)) + ' leverage is back to 1x');
          await sleep(1300);
        }
        break;

      case 'miss':
        lunge(e.attacker);
        await sleep(170);
        if (e.ignored) {
          // CZ: red and pink bounce off his Ignore FUD (anything but a Super, after his own Super).
          AU.play('deflect');
          var tb = D.FIGHTERS[S.fight.f[e.target].id].brace;
          popup(e.target, (tb && tb.ignoreLine) || 'IGNORED', 'ignore');
          log(who(e.target) + (e.target === 0 ? ' ignore' : ' ignores') + ' it.');
          await sleep(750);
          break;
        }
        AU.play('whiff');
        // Warren's letter, dodged: RETURN TO SENDER. Else the target's own line (Charles: I AM NOT ACCOUNTABLE).
        var letterDodge = e.move === 'mint' && moveOf(S.fight.f[e.attacker].id, 'mint').dodged;
        var dodge = letterDodge || D.FIGHTERS[S.fight.f[e.target].id].dodgeLine;
        if (dodge) banner(dodge, (e.target === 0 ? 'You' : nm(e.target)) + ' dodged ' + (letterDodge ? 'the letter' : 'it'));
        else popup(e.target, 'MISS', 'miss');
        log(who(e.attacker) + ' whiffed. ' + (e.target === 0 ? "You're" : nm(e.target) + ' is') + ' hidden.');
        await sleep(dodge ? 1150 : 700);
        break;

      case 'hide':
        render(e.snap);
        AU.move(S.fight.f[e.who].id, 'privacy', e.ok ? 'ok' : 'fail');
        var pv = moveOf(S.fight.f[e.who].id, 'privacy');
        if (e.brace) {
          var fb = D.FIGHTERS[S.fight.f[e.who].id].brace;
          banner(pv.ok, fb.ignore ? 'Red and pink do nothing this turn, purple does half' : 'Half damage this turn');
          await sleep(1050);
        } else if (e.stun && e.ok) {
          // Sergey's shirt: no hiding, the pattern does the work. They lose their next turn.
          bubble(1 - e.who, SKIP.stun.icon);
          banner(pv.ok, (e.who === 0 ? nm(1) + ' loses' : 'You lose') + ' the next turn');
          await sleep(1250);
        } else if (e.ok && pv.ok === D.DEFAULT_MOVES.privacy.ok) {
          popup(e.who, pv.ok, 'good');
          await sleep(650);
        } else if (e.ok) {
          banner(pv.ok, pv.okSub || (e.who === 0 ? 'You' : nm(e.who)) + ' vanished');
          await sleep(1150);
        } else {
          wobble(e.who);
          // Default Privacy rolls a random fail line in the engine; renamed ones bring their own.
          banner(pv.fail || e.line, e.stun ? 'Nobody looked at the shirt' : whose(e.who) + ' ' + pv.name + ' failed');
          await sleep(1250);
        }
        break;

      case 'fail':
        var fm = moveOf(S.fight.f[e.who].id, e.move);
        AU.move(S.fight.f[e.who].id, e.move, 'fail');
        if (e.recoil) AU.play('hit');
        wobble(e.who);
        render(e.snap);
        banner(fm.fail, fm.ticker ? fm.ticker + ' ▼' : fm.failSub || whose(e.who) + ' ' + fm.name + ' flopped');
        if (e.recoil) popup(e.who, '-' + e.recoil, 'dmg');
        else if (e.lost) popup(e.who, '-' + e.lost + ' Blocks', 'status');
        log(whose(e.who) + ' ' + fm.name + ' flopped.');
        await sleep(1350);
        break;

      case 'status':
        render(e.snap);
        AU.play({ pruned: 'prune', drain: 'drain', hodl: 'hodl', shield: 'hodl', stored: 'stored' }[e.status]);
        var pruneLine = e.status === 'pruned' && D.FIGHTERS[S.fight.f[1 - e.who].id].super.pruneLine;
        if (pruneLine) {
          banner(pruneLine, whose(e.who) + ' HODL pruned'); // Adam: SALTY TEARS
          await sleep(1150);
          break;
        }
        popup(e.who, e.status === 'drain' ? '-' + e.amount + ' Blocks' : e.status === 'stored' ? '🦭 +' + e.amount + ' STORED' : STATUS_TEXT[e.status],
          /^(hodl|shield|stored)$/.test(e.status) ? 'good' : 'status');
        await sleep(800);
        break;

      case 'banner':
        render(e.snap);
        AU.play('flop');
        banner(e.text, e.sub);
        await sleep(1250);
        break;

      case 'ko':
        S.koProp = koPropFor(e.winner, e.cause) ? { who: e.loser, prop: koPropFor(e.winner, e.cause) } : null;
        render(e.snap);
        fighterEl(e.loser).classList.add('is-ko');
        AU.stopMusic(0.6);
        AU.play('ko');
        AU.play('ko.bell');
        var loseLine = D.FIGHTERS[S.fight.f[e.loser].id].loseLine;
        if (loseLine) later(function () { popup(e.loser, loseLine, 'status'); }, 700);
        banner(e.timeout ? 'TIME!' : 'K.O.', e.finish, true);
        buzz(e.loser === 0 ? 250 : 80);
        var scene = koSceneFor(e.winner, e.cause);
        await sleep(scene ? 1400 : 2100);
        if (scene === 'astronaut') await astronautScene();
        break;

      case 'letter':
        // Warren's Letter landed: a stack of pages, and they lose their next turn reading it.
        lunge(e.who);
        await sleep(170);
        render(e.snap);
        AU.play(S.fight.f[e.who].id + '.mint.ok');
        bubble(e.target, SKIP.letter.icon);
        banner(moveOf(S.fight.f[e.who].id, 'mint').ok, (e.target === 0 ? 'You lose' : nm(e.target) + ' loses') + ' the next turn reading it');
        log((e.target === 0 ? 'You' : nm(e.target)) + ' got the letter.');
        await sleep(1300);
        break;

      case 'ban':
        // Warren's BANNED: a stamp on the button, which can't be pressed for a couple of turns.
        render(e.snap);
        AU.play('banned');
        var bm = moveOf(S.fight.f[e.who].id, e.move);
        if (e.who === 0) restartClass($('#controls .move[data-move="' + e.move + '"]'), 'stamped', 900);
        banner('BANNED', (e.who === 0 ? 'Your ' : nm(e.who) + "'s ") + bm.icon + ' ' + bm.name + ' is banned for ' + e.turns + ' turns');
        log((e.who === 0 ? 'Your ' : nm(e.who) + "'s ") + bm.name + ' is banned.');
        updateControls();
        await sleep(1700);
        break;

      case 'unban':
        render(e.snap);
        popup(e.who, moveOf(S.fight.f[e.who].id, e.move).name.toUpperCase() + ' IS LEGAL AGAIN', 'good');
        AU.play('hodl');
        await sleep(700);
        break;

      case 'bailout':
        // Dimon: he goes down like any knockout, the screen cuts to him (too big to fail), and he's back up.
        fighterEl(e.who).classList.add('is-ko');
        AU.play('ko');
        buzz(80);
        log(nm(e.who) + ' is down…');
        await sleep(1100);
        await bailoutScene(e.who, e.hp);
        fighterEl(e.who).classList.remove('is-ko');
        render(e.snap);
        AU.play('hodl');
        popup(e.who, '+' + e.hp + ' HP', 'good');
        banner('BAILED OUT', nm(e.who) + ' is back with ' + e.hp + ' HP. Only once.');
        log(nm(e.who) + ' got bailed out: ' + e.hp + ' HP.');
        await sleep(1500);
        break;

      case 'tagin':
        // SBF: Caroline tags in from his side of the screen, then her beanbags land (the hit events after this).
        await assistIn(e.ally, e.line, 'tagin');
        log(D.FIGHTERS[e.ally].name + ' tagged in for ' + nm(e.who) + '.');
        break;

      case 'assist':
        await assistIn(e.ally, e.line);
        render(e.snap);
        hurtFx(1);
        AU.play('heavy');
        popup(1, '-' + e.amount, 'dmg');
        buzz(60);
        log(D.FIGHTERS[e.ally].name + ' jumped in for ' + e.amount + '.');
        await sleep(650);
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

  // A landed hit: the shared punch plus the attacker's signature (Slop Cannon's boom and splat...).
  function hitSound(e) {
    if (e.self) { AU.play('hit'); AU.play('selfhit'); return; }
    var id = S.fight.f[e.attacker].id;
    if (e.move === 'super') AU.play(SUPER_HIT[D.FIGHTERS[id].super.id] || 'heavy');
    else if (!(e.of > 1 && e.n > 1)) AU.move(id, e.move, 'ok');
  }

  // Multi-hit Supers with their own hit sound: crowds stomp, Adeniyi's wave splashes.
  var SUPER_HIT = { xrparmy: 'stomp', linkmarines: 'stomp', agentswarm: 'splash', goldrush: 'clank', plan: 'stomp' };

  async function doHit(e) {
    var multi = e.of > 1;
    if (e.move === 'tagin') { await beanbagHit(e); return; }
    if (e.liquidated) {
      // WICK at 100x: no hits to count, the whole stake goes at once.
      render(e.snap);
      hurtFx(e.target);
      AU.play('liquidated');
      popup(e.target, '-' + e.amount, 'dmg');
      buzz(300);
      banner('LIQUIDATED', '100x: the whole stake, gone');
      await sleep(1500);
      return;
    }
    if (e.move !== 'super') {
      lunge(e.attacker);
      await sleep(170);
    }
    render(e.snap);
    hurtFx(e.target);
    hitSound(e);
    popup(e.target, '-' + e.amount, 'dmg', multi ? e.n : 0);
    if (e.target === 0) buzz(40);

    if (e.self) {
      // Vitalik's hypnosis: DEFENSIVE ACCELERATION (d/acc). Anyone else's: SELF-REKT.
      var selfHit = D.FIGHTERS[S.fight.f[1 - e.attacker].id].super.selfHitLine;
      banner(selfHit || 'SELF-REKT', (e.attacker === 0 ? 'You hit' : nm(e.attacker) + ' hit') + (e.attacker === 0 ? ' yourself' : ' themselves'));
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
    // The stock ticker over the attacker: the roll is the day's move.
    if (hm && hm.ticker) popup(e.attacker, hm.ticker + ' ▲ ' + e.base + '%', 'good ticker');
    // Adeniyi's Walrus paying back a stored hit: a banner on a plain hit, a small tag when the hit has its own banner.
    var walrusBanner = e.bonus && e.move === 'strike';
    if (walrusBanner) banner(D.FIGHTERS[S.fight.f[e.attacker].id].walrus.line, '+' + e.bonus + ' damage from Walrus');
    else if (e.bonus) popup(e.attacker, '🦭 +' + e.bonus, 'good');
    if (e.pierced) banner(hm.pierce, stolen || "Hiding didn't help");
    else if (e.move === 'rug' || e.move === 'mint') banner(hm.ok, stolen);
    // SBF's 1) Fine takes Blocks: a banner the first time, so it's clear where they went, then a tag.
    var stealBanner = e.move === 'strike' && e.stolen && !S.stealShown;
    if (stealBanner) {
      S.stealShown = true;
      banner(hm.steal || 'CUSTOMER FUNDS', (e.target === 0 ? 'He took ' : nm(e.attacker) + ' took ') + e.stolen + ' of ' + (e.target === 0 ? 'your' : 'their') + ' Blocks');
    } else if (e.move === 'strike' && e.stolen) popup(e.attacker, '+' + e.stolen + ' BLOCKS', 'good');
    if (!multi) log(who(e.attacker) + ' hit ' + (e.target === 0 ? 'you' : nm(e.target)) + ' for ' + e.amount + '.');
    await sleep(multi ? 240 : (e.move === 'rug' || e.move === 'mint' || walrusBanner || stealBanner) ? 1050 : 650);
  }

  // Caroline's beanbags: each one flies in from the boss's side of the stage and lands on the target.
  async function beanbagHit(e) {
    var layer = $('#popups'), t = fighterEl(e.target), bag = document.createElement('i');
    bag.className = 'beanbag bag-' + (e.n % 3);
    var x1 = t.offsetLeft + t.offsetWidth / 2, y1 = t.offsetTop + t.offsetHeight * 0.35;
    var x0 = e.target === 0 ? layer.clientWidth + 30 : -30;
    bag.style.setProperty('--dx', (x0 - x1) + 'px');
    bag.style.left = x1 + 'px';
    bag.style.top = y1 + 'px';
    bag.style.animationDuration = (360 * SPEED) + 'ms';
    layer.appendChild(bag);
    await sleep(340);
    render(e.snap);
    hurtFx(e.target);
    AU.play('beanbag');
    if (e.n === 1) AU.play('hit');
    popup(e.target, '-' + e.amount, 'dmg', e.n);
    if (e.target === 0) buzz(40);
    later(function () { bag.remove(); }, 500);
    if (e.n === e.of) log(D.FIGHTERS[D.FIGHTERS[S.fight.f[e.attacker].id].tagIn.ally].name + ' hit ' + (e.target === 0 ? 'you' : nm(e.target)) + ' with ' + e.of + ' beanbags.');
    await sleep(e.n === e.of ? 600 : 120);
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
    var p = document.createElement('div'), words = String(text).split(/\s+/).filter(Boolean).length;
    // A number floats off fast; a line (IS LEGAL AGAIN, I DON'T RECALL) holds long enough to read.
    var dur = words > 1 ? Math.min(2600, 700 + words * 320) : 1100;
    p.className = 'popup ' + (kind || '') + (words > 1 ? ' read' : '');
    p.style.animationDuration = dur + 'ms';
    p.textContent = text;
    var x = el.offsetLeft + el.offsetWidth / 2 + (n ? ((n % 3) - 1) * 26 : 0);
    var y = el.offsetTop + el.offsetHeight * 0.1 - (n ? (n % 2) * 18 : 0);
    p.style.top = y + 'px';
    layer.appendChild(p);
    // Keep wide popups (MSTR ▲ 45%) inside the stage.
    var half = p.offsetWidth / 2;
    p.style.left = Math.max(half + 4, Math.min(layer.clientWidth - half - 4, x)) + 'px';
    setTimeout(function () { p.remove(); }, dur + 100);
  }

  // How long a line needs on screen to be read: a beat to notice it, then about four words a second.
  function readMs(text, sub) {
    var words = ((text || '') + ' ' + (sub || '')).split(/\s+/).filter(Boolean).length;
    return Math.min(4500, Math.max(1250, 600 + words * 230));
  }

  // A banner stays up for its reading time, then fades. Events wait for it (readWait), so the next
  // banner never replaces one that hasn't been read.
  function banner(text, sub, ko) {
    var b = $('#banner'), ms = ko ? Math.max(2000, readMs(text, sub)) : readMs(text, sub);
    $('.banner-text', b).textContent = text;
    $('.banner-sub', b).textContent = sub || '';
    b.style.setProperty('--bout', ((ms - 250) / 1000) + 's');
    b.className = 'banner';
    void b.offsetWidth;
    b.className = 'banner show' + (ko ? ' ko' : text.length > 18 ? ' long' : '');
    S.readUntil = Date.now() + (ms - 250) * SPEED;
    return ms;
  }

  function readWait() {
    var left = (S.readUntil || 0) - Date.now();
    return left > 0 ? new Promise(function (r) { setTimeout(r, left); }) : Promise.resolve();
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
  // Vitalik's badger dance (from the conference video): a green screen full of black-and-white badgers
  // and a stage of people in lanyards, everyone's arms straight out, flapping up and down in sync.
  function badgerSVG(style) {
    var dark = '#2e2e33', white = '#f4f4f4';
    return '<svg class="badger" viewBox="0 0 100 100" style="' + style + '" aria-hidden="true"><g class="bob" stroke="#111" stroke-width="2">' +
      '<g class="flap-l"><rect x="4" y="40" width="31" height="11" rx="5.5" fill="' + dark + '"/><circle cx="6" cy="45.5" r="5" fill="' + white + '"/></g>' +
      '<g class="flap-r"><rect x="65" y="40" width="31" height="11" rx="5.5" fill="' + dark + '"/><circle cx="94" cy="45.5" r="5" fill="' + white + '"/></g>' +
      '<rect x="38" y="78" width="9" height="17" rx="4" fill="' + dark + '"/><rect x="53" y="78" width="9" height="17" rx="4" fill="' + dark + '"/>' +
      '<ellipse cx="50" cy="60" rx="18" ry="22" fill="' + dark + '"/>' +
      '<ellipse cx="50" cy="64" rx="11" ry="15" fill="' + white + '" stroke="none"/>' +
      '<circle cx="38" cy="15" r="5" fill="' + dark + '"/><circle cx="62" cy="15" r="5" fill="' + dark + '"/>' +
      '<ellipse cx="50" cy="26" rx="15" ry="17" fill="' + white + '"/>' +
      '<ellipse cx="43" cy="24" rx="4" ry="12" fill="#1a1a1a" stroke="none" transform="rotate(10 43 24)"/>' +
      '<ellipse cx="57" cy="24" rx="4" ry="12" fill="#1a1a1a" stroke="none" transform="rotate(-10 57 24)"/>' +
      '<circle cx="44" cy="25" r="1.4" fill="#fff" stroke="none"/><circle cx="56" cy="25" r="1.4" fill="#fff" stroke="none"/>' +
      '<ellipse cx="50" cy="40" rx="3.2" ry="2.3" fill="#1a1a1a" stroke="none"/>' +
      '</g></svg>';
  }

  function personSVG(p) {
    var skin = p.skin || '#f2d4b6';
    var hair = p.long
      ? '<path d="M38 30 Q36 8 50 9 Q64 8 62 30 L64 50 Q58 44 58 30 Q50 20 42 30 Q42 44 36 50Z" fill="' + p.hair + '"/>'
      : '<path d="M38 27 Q50 6 62 27 Q50 18 38 27Z" fill="' + p.hair + '"/>';
    // Vitalik's tee matches his art: purple with a little white unicorn (no chain logos).
    var chest = p.vitalik
      ? '<g stroke="#111" stroke-width=".8"><ellipse cx="52" cy="72" rx="6" ry="4" fill="#fff"/>' +
        '<circle cx="46" cy="66" r="3.4" fill="#fff"/><path d="M45 63 L43.5 57 L47.5 62.4Z" fill="#f5c542"/>' +
        '<path d="M48.5 63.5 Q52 63 51 68" fill="none" stroke="#c77dd8" stroke-width="1.6"/></g>'
      : '<path d="M42 47 L50 66 L58 47" fill="none" stroke="#d22" stroke-width="2.5"/><rect x="46" y="65" width="8" height="10" rx="1" fill="#fff" stroke="#111" stroke-width="1"/>';
    return '<svg class="person' + (p.vitalik ? ' vit' : '') + '" viewBox="0 0 100 150" aria-hidden="true"><g class="bob" stroke="#111" stroke-width="2">' +
      '<g class="flap-l"><rect x="5" y="50" width="34" height="8" rx="4" fill="' + p.shirt + '"/><circle cx="7" cy="54" r="4.5" fill="' + skin + '"/></g>' +
      '<g class="flap-r"><rect x="61" y="50" width="34" height="8" rx="4" fill="' + p.shirt + '"/><circle cx="93" cy="54" r="4.5" fill="' + skin + '"/></g>' +
      '<rect x="40" y="96" width="8" height="50" rx="3" fill="' + (p.pants || '#2b2b3a') + '"/><rect x="52" y="96" width="8" height="50" rx="3" fill="' + (p.pants || '#2b2b3a') + '"/>' +
      '<rect x="36" y="46" width="28" height="54" rx="7" fill="' + p.shirt + '"/>' + chest +
      '<ellipse cx="50" cy="30" rx="11" ry="14" fill="' + skin + '"/>' + hair +
      '<circle cx="46" cy="30" r="1.5" fill="#111" stroke="none"/><circle cx="54" cy="30" r="1.5" fill="#111" stroke="none"/>' +
      '<path d="M46 37 Q50 40 54 37" fill="none" stroke-width="1.5"/>' +
      '</g></svg>';
  }

  function badgerDanceDeco() {
    var badgers = [
      'left:-5%;top:34%;width:31%', 'left:24%;top:16%;width:24%', 'left:36%;top:34%;width:31%',
      'left:58%;top:10%;width:22%', 'left:72%;top:30%;width:31%', 'left:5%;top:2%;width:13%'
    ].map(badgerSVG).join('');
    // Back row stands in the gaps between the front row, like the video.
    var back = [{ shirt: '#f3f3f3', hair: '#5b3d26' }, { shirt: '#1f3d2a', hair: '#2a2a2a' }].map(personSVG).join('');
    var front = [
      { shirt: '#222', hair: '#2a2a2a' }, { shirt: '#5b2fa3', hair: '#3a2a1f', vitalik: true },
      { shirt: '#2a2a2a', hair: '#3a2a1f', long: true }
    ].map(personSVG).join('');
    return '<div class="badger-screen">' + badgers + '</div>' +
      '<div class="badger-stage"><div class="row-back">' + back + '</div><div class="row-front">' + front + '</div></div>';
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

  // Charles: his nearly-four-hour video. Captions type at reading speed, a beat, then lights out
  // mid-word, moon and stars, 💤. Everything after the blackout is timed from when it lands.
  var TYPE_CPS = 22;        // caption typing speed, characters per second (about reading speed)

  // When each caption letter appears and when the lights go out, for the typing clicks.
  function midnightInfo(sup) {
    var T = lectureTiming(sup.lecture), chars = [];
    sup.lecture.forEach(function (txt, k) {
      for (var i = 0; i < txt.length; i++) if (txt[i] !== ' ') chars.push(T.lines[k].delay + (i + 1) / TYPE_CPS);
    });
    return { chars: chars, off: T.blackout };
  }
  function lectureTiming(lines) {
    var t = 0.4, out = [];
    lines.forEach(function (txt) {
      var dur = txt.length / TYPE_CPS;
      out.push({ delay: t, dur: dur });
      t += dur + 0.15;
    });
    return { lines: out, blackout: t + 0.3 }; // the last line hangs for a beat, then lights out
  }

  function midnightDeco(sup) {
    var T = lectureTiming(sup.lecture), off = T.blackout;
    var stars = '';
    for (var k = 0; k < 26; k++) {
      stars += '<i style="left:' + Math.round(Math.random() * 100) + '%;top:' + Math.round(Math.random() * 70) +
        '%;animation-delay:' + (off + 0.05 + Math.random() * 0.6).toFixed(2) + 's"></i>';
    }
    var F = D.FIGHTERS.charles;
    var caps = sup.lecture.map(function (txt, k) {
      return '<span style="--chars:' + txt.length + ';--t:' + T.lines[k].dur.toFixed(2) + 's;--d:' +
        T.lines[k].delay.toFixed(2) + 's">' + esc(txt) + '</span>';
    }).join('');
    return '<div class="midnight" style="--off:' + off.toFixed(2) + 's">' +
      '<div class="vplayer"><div class="vp-frame">' + faceHTML(F) + '</div>' +
      '<div class="vp-title">' + esc(sup.video.title) + '</div>' +
      '<div class="vp-caps">' + caps + '</div>' +
      '<div class="vp-time">' + esc(sup.video.time) + '</div><div class="vp-bar"><i></i></div></div>' +
      '<div class="blackout"></div>' +
      '<div class="night"><div class="moon"></div>' + stars + '<div class="zzz">💤</div></div></div>';
  }

  // Garlinghouse: the polo-shirt army jogs across. One TikToker yells a price target, one carries a
  // sign (the army says these, he doesn't), and a gold truck crawls along at 1940 speed behind them.
  function armyDeco() {
    return '<div class="deco-run">' +
      '<span>🏃</span><span class="tiktoker">🏃<b class="army-bubble">$589 BY FRIDAY</b></span><span>🏃</span><span>🏃</span>' +
      '<span class="signer">🏃<b class="army-sign">SWIFT IS DEAD</b></span><span>🏃</span></div>' +
      '<div class="gold-truck">🚚<small>GOLD · 1940 SPEED</small></div>';
  }

  // Sergey: the target says the line first, then the Marines charge: helmets, flannel, a $1,000 sign.
  function marinesDeco(ctx) {
    var T = D.FIGHTERS[ctx.target], sup = D.FIGHTERS.sergey.super, marine = function (extra) {
      return '<span class="marine">🪖<u></u><i></i>' + (extra || '') + '</span>';
    };
    return '<div class="doubter"><span class="doubter-face">' + faceHTML(T) + '</span>' +
      '<b class="doubt-bubble">' + esc(sup.doubt) + '</b></div>' +
      '<div class="deco-march">' + marine() + marine() + marine('<b class="army-sign">$1,000 EOY</b>') + marine() + marine() +
      marine() + marine() + '</div>';
  }

  // CZ: the white Nissan SUV pulls up ("My Lamborghini"), then FUD, FAKE NEWS and ATTACKS fly at him and shatter.
  function fourDeco() {
    var suv = '<svg viewBox="0 0 220 110" aria-hidden="true">' +
      '<path d="M14 78 L18 52 Q22 44 32 42 L62 40 L84 18 Q88 14 96 14 L172 14 Q182 14 186 22 L200 44 Q208 46 208 56 L208 78 Z" fill="#f4f4f2" stroke="#111" stroke-width="4" stroke-linejoin="round"/>' +
      '<path d="M90 22 L118 22 L118 42 L72 42 Z M126 22 L166 22 Q172 22 175 28 L182 42 L126 42 Z" fill="#26313f" stroke="#111" stroke-width="3" stroke-linejoin="round"/>' +
      '<rect x="12" y="60" width="12" height="8" rx="2" fill="#ffd23f" stroke="#111" stroke-width="2"/><rect x="198" y="56" width="10" height="8" rx="2" fill="#e33" stroke="#111" stroke-width="2"/>' +
      '<circle cx="56" cy="80" r="17" fill="#222" stroke="#111" stroke-width="4"/><circle cx="56" cy="80" r="7" fill="#9aa1ab"/>' +
      '<circle cx="168" cy="80" r="17" fill="#222" stroke="#111" stroke-width="4"/><circle cx="168" cy="80" r="7" fill="#9aa1ab"/></svg>';
    return '<div class="nissan">' + suv + '<b class="army-bubble">MY LAMBORGHINI</b></div>' +
      ['FUD', 'FAKE NEWS', 'ATTACKS'].map(function (w, k) {
        return '<b class="fud" style="--k:' + k + '">' + w + '</b>';
      }).join('');
  }

  // Adeniyi: Sui is water. A wave rolls across carrying a swarm of little agents.
  function swarmDeco() {
    var bots = '';
    for (var k = 0; k < 14; k++) bots += '<span style="--k:' + k + '">🤖</span>';
    return '<div class="wave"><div class="wave-crest"></div><div class="wave-bots">' + bots + '</div></div>';
  }

  // Schiff: gold bars rain down and pile up. The ticker in the corner is his whole worldview.
  function goldDeco() {
    var bars = '';
    for (var k = 0; k < 7; k++) bars += '<i class="bar" style="--k:' + k + '"></i>';
    return '<div class="gold-rain">' + bars + '</div><div class="gold-ticker"><b>GOLD ▲</b><s>BTC → $10K</s></div>';
  }

  // Dimon: a giant pet rock with googly eyes rolls in, under its museum placard.
  function petRockDeco() {
    return '<div class="petrock"><svg viewBox="0 0 200 170" aria-hidden="true">' +
      '<defs><radialGradient id="rockG" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#9a9a9f"/><stop offset=".6" stop-color="#5d5e63"/><stop offset="1" stop-color="#34353a"/></radialGradient></defs>' +
      '<path d="M22 132 Q8 96 30 62 Q48 28 92 20 Q140 12 168 44 Q194 74 186 112 Q178 150 128 158 Q62 166 22 132Z" fill="url(#rockG)" stroke="#111" stroke-width="5"/>' +
      '<path d="M58 118 L76 104 L70 90 M138 126 L150 108 M120 44 L132 58 L126 72" fill="none" stroke="#2a2b2f" stroke-width="3" stroke-linecap="round"/>' +
      '<g class="eye"><circle cx="78" cy="74" r="20" fill="#fff" stroke="#111" stroke-width="4"/><circle class="pupil" cx="82" cy="78" r="9" fill="#111"/></g>' +
      '<g class="eye"><circle cx="128" cy="72" r="20" fill="#fff" stroke="#111" stroke-width="4"/><circle class="pupil" cx="132" cy="76" r="9" fill="#111"/></g>' +
      '</svg></div><div class="placard"><b>PET ROCK</b><small>c. 2009 · does nothing</small></div>';
  }

  // Warren: the Anti-Crypto Army marches across with clipboards while her letter unrolls off the bottom of the screen.
  function planDeco() {
    var staff = '', lines = ['Dear Sir or Madam,', 'I write to express my serious concerns', 'about bad actors using crypto,', 'including but not limited to', 'ransomware, sanctions evasion', 'and money laundering.', 'Please answer the following', 'forty questions by Friday.', '1.', '2.', '3.', '4.', '5.', '6.'];
    for (var k = 0; k < 7; k++) staff += '<span class="staffer">🧑‍💼<i>📋</i></span>';
    return '<div class="letter-scroll"><div class="letter-paper">' + lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') +
      '</div></div><div class="deco-march staff-march">' + staff + '</div>';
  }

  // SBF: the laptop's balance sheet has one blank line, and the question mark flies out of it.
  function whatDeco() {
    return '<div class="what-laptop"><div class="wl-screen"><b>FTX BALANCE SHEET</b>' +
      '<p><span>Assets</span><span>FINE</span></p><p><span>Customer funds</span><span class="wl-q">?</span></p>' +
      '<p><span>Alameda</span><span>…</span></p></div><div class="wl-base"></div></div><div class="what-q">?</div>';
  }

  // WICK: a red candle drops through the screen while liquidation alerts pour down, one per hit.
  function cascadeDeco(ctx) {
    var L = D.FIGHTERS.wick.leverage, x = (ctx && ctx.lev) || 1, k = L.steps.indexOf(x), top = k === L.steps.length - 1;
    var coins = ['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'PEPE', 'LINK'], rows = '';
    for (var i = 0; i < k + 1; i++) {
      rows += '<p style="--k:' + i + '"><b>LIQUIDATED</b><span>' + coins[i % coins.length] + ' LONG ' + x + 'X</span></p>';
    }
    return '<div class="cascade-candle"></div><div class="cascade-feed">' + rows + '</div>' +
      (top ? '<div class="cascade-stamp">100X</div>' : '');
  }

  function decoFor(id, ctx) {
    switch (id) {
      case 'cascade': return { screen: cascadeDeco(ctx) };
      case 'what': return { screen: whatDeco() };
      case 'four': return { screen: fourDeco() };
      case 'goldrush': return { screen: goldDeco() };
      case 'petrock': return { screen: petRockDeco() };
      case 'plan': return { screen: planDeco() };
      case 'agentswarm': return { screen: swarmDeco() };
      case 'linkmarines': return { screen: marinesDeco(ctx) };
      case 'salesman': return salesDeco(ctx);
      case 'dance': return { screen: badgerDanceDeco() };
      case 'helium': return { screen: '<div class="deco-sun"></div>', portrait: '<div class="dome-beam"></div>' };
      case 'xrparmy': return { screen: armyDeco() };
      case 'midnight': return { screen: midnightDeco(D.FIGHTERS.charles.super) };
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
      var snd = AU.play('super.astronaut');
      var done = false;
      var timer = later(finish, 3000);
      function finish() {
        if (done) return;
        done = true;
        clearTimeout(timer);
        snd.stop(0.2);
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
      $('.cutin-head', el).innerHTML = faceHTML(F);
      $('.cutin-head', el).classList.toggle('has-art', !!(F.art && F.art.head));
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
      el.style.removeProperty('--card-delay');
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
      // Charles: the name card and line wait for the lights to go out, then get time to be read.
      if (sup.lecture) {
        var off = lectureTiming(sup.lecture).blackout;
        el.style.setProperty('--card-delay', (off + 0.15) + 's');
        el.style.setProperty('--line-delay', (off + 0.6) + 's');
        duration = Math.round((off + 2.3) * 1000);
      }
      // Supers with their own pacing.
      if (sup.timing) {
        el.style.setProperty('--card-delay', sup.timing.card + 's');
        el.style.setProperty('--line-delay', sup.timing.line + 's');
        duration = sup.timing.dur * 1000;
      }
      $('.cutin-who', el).textContent = F.name.toUpperCase();
      var line = sup.line;
      if (ctx && ctx.lev != null) line = ctx.lev === 1 && sup.line1 ? sup.line1 : line.replace('{x}', ctx.lev); // WICK: 25X? CUTE.
      $('.cutin-line', el).textContent = '“' + line + '”';
      // However the Super is paced, its line stays up long enough to read.
      var lineAt = parseFloat(el.style.getPropertyValue('--line-delay')) * 1000 || 600;
      duration = Math.max(duration, lineAt + readMs(line));
      el.style.setProperty('--dur', (duration / 1000) + 's');
      var deco = decoFor(sup.id, ctx);
      $('.cutin-deco', el).innerHTML = deco.screen || '';
      $('.cutin-pdeco', el).innerHTML = deco.portrait || '';

      el.hidden = false;
      void el.offsetWidth;
      el.classList.add('play');
      AU.duck(true);
      var snd = AU.play('super.' + sup.id, 0, sup.lecture ? midnightInfo(sup) : null);

      var done = false;
      var timer = later(finish, duration);
      function finish() {
        if (done) return;
        done = true;
        clearTimeout(timer);
        el.onclick = null;
        el.hidden = true;
        el.classList.remove('play');
        snd.stop(0.15);
        AU.duck(false);
        resolve();
      }
      // Tap to skip, but not instantly (so a stray tap doesn't eat the whole thing).
      later(function () { if (!done) el.onclick = finish; }, 600);
    });
  }

  // ---------- Story mode ----------
  // Hidden until all the bosses are in: proofoffight.com/?story turns it on for that browser.
  var STORY_ON = (function () {
    if (/[?&]story(=|&|$)/.test(location.search)) store.set('storyBeta', true);
    return !!store.get('storyBeta', false);
  })();

  // A run: player, rung (index in STORY.ladder of the next boss), satoshi (true until he's used),
  // continues, turns (all fights added up), ally (the last one picked), beaten (boss ids).
  function runGet() {
    var r = store.get('story', null);
    return r && r.v === 1 && D.FIGHTERS[r.player] && r.rung < D.STORY.ladder.length ? r : null;
  }
  function runSave(r) { store.set('story', r); }
  function ladderBoss(k) {
    var L = D.STORY.ladder[k];
    return L && D.BOSSES[L.id] ? D.BOSSES[L.id] : null;
  }
  function isFinal(k) { return k === D.STORY.ladder.length - 1; }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  // The boss's own song once it exists, else the fight song.
  function fightSong() {
    var b = S.opts && S.opts.mode === 'story' && D.FIGHTERS[S.opts.cpu].boss;
    return b && b.music && AU.MUSIC[b.music] ? b.music : 'fight';
  }

  function openStory() {
    var run = runGet();
    if (run) renderLadder(run);
    else { S.pickPlayer = null; renderPick('story'); }
  }

  function newRun(player) {
    var run = { v: 1, player: player, rung: 0, satoshi: true, continues: 0, turns: 0, ally: null, beaten: [] };
    runSave(run);
    renderLadder(run);
  }

  // The tower: the final boss on top, the next fight lit up. The last boss stays a mystery until you reach it.
  function renderLadder(run) {
    S.run = run;
    var P = D.FIGHTERS[run.player], L = D.STORY.ladder;
    $('#story-you').innerHTML = '<span class="face" style="--c:' + P.color + '">' + faceHTML(P) + '</span>' +
      '<span class="sy-txt"><b>' + esc(P.name) + '</b><small>' +
      (run.satoshi ? '✨ Satoshi has your back once' : 'Satoshi already picked you up') +
      (run.continues ? ' · ' + plural(run.continues, 'continue') : '') + '</small></span>';
    $('#ladder').innerHTML = L.map(function (r, k) {
      var B = D.BOSSES[r.id], state = k < run.rung ? 'beaten' : k === run.rung ? 'next' : 'locked';
      var hidden = isFinal(k) && k > run.rung;
      var face = hidden ? '?' : B ? faceHTML(B) : r.emoji;
      var tag = state === 'beaten' ? '↻ REMATCH' : state === 'next' ? (B ? 'NEXT' : 'SOON') : hidden ? '' : B ? '' : 'SOON';
      // A boss you've beaten can be fought again any time, as a rematch that doesn't touch the run.
      var replay = state === 'beaten' && B ? ' tabindex="0" role="button" data-rung="' + k + '" aria-label="Rematch ' + esc(r.name) + '"' : '';
      return '<li class="rung is-' + state + (B ? '' : ' is-soon') + '" style="--c:' + (B && !hidden ? B.color : '#4a4460') + '"' + replay + '>' +
        '<span class="rung-n">' + (k + 1) + '</span>' +
        '<span class="face rung-face">' + face + '</span>' +
        '<span class="rung-txt"><b>' + esc(hidden ? '???' : r.name) + '</b><small>' + esc(hidden ? 'Final boss' : r.stage) + '</small></span>' +
        (tag ? '<span class="rung-tag">' + tag + '</span>' : '') + '</li>';
    }).reverse().join('');
    var next = L[run.rung], B = next && D.BOSSES[next.id], btn = $('#story-fight');
    // Waiting on a boss that isn't built yet: the big button replays the last one you beat.
    var last = !B && run.rung > 0 ? ladderBoss(run.rung - 1) : null;
    btn.disabled = !B && !last;
    btn.textContent = B ? 'Fight ' + B.name + ' ▶' : last ? 'Rematch ' + last.name + ' ▶' : next.name + ': coming soon';
    btn.dataset.rung = B ? run.rung : last ? run.rung - 1 : '';
    btn.dataset.practice = B ? '' : '1';
    $('#story-quit').textContent = B ? 'Abandon this run' : 'Start a new run';
    $('#story-note').textContent = run.rung === 0 && !run.beaten.length
      ? 'The naysayers are coming. Beat ' + L.length + ' bosses in a row. Before each fight you pick an ally from the other founders; at ' +
        pct(D.STORY.assistAt) + ' HP they jump in once. And once per run, Satoshi picks you up off the floor.'
      : B ? 'Tap a boss you\'ve beaten to fight them again. Rematches don\'t change your run.'
      : next.name + ' is still being built. Your run is saved right here: come back when ' + next.name + ' is in. Meanwhile, rematch anyone you\'ve beaten, or start a new run with another fighter.';
    show('screen-story');
    AU.music('menu', { from: 'loop', fade: 0.8 });
  }

  function openAllyPick(rung, practice) {
    var run = S.run, B = ladderBoss(rung), pairs = B.boss.allyLines || {};
    S.pick = { rung: rung, practice: !!practice };
    $('#assist-kicker').textContent = (practice ? 'REMATCH · ' : '') + 'BOSS ' + (rung + 1) + ' · ' + B.name.toUpperCase();
    $('#ally-grid').innerHTML = D.ROSTER.filter(function (id) { return id !== run.player; }).map(function (id) {
      var F = D.FIGHTERS[id];
      return '<button class="ally' + (run.ally === id ? ' last' : '') + '" data-id="' + id + '" type="button">' +
        '<span class="face" style="--c:' + F.color + '">' + faceHTML(F) + '</span><b>' + esc(F.name) + '</b>' +
        (pairs[id] ? '<i class="ally-star" title="Has a line for ' + esc(B.name) + '">⭐</i>' : '') + '</button>';
    }).join('');
    $('#modal-assist').hidden = false;
  }

  function startStoryFight(run, rung, practice) {
    if (rung == null) rung = run.rung;
    var B = ladderBoss(rung);
    // A tag-in partner (SBF's Caroline) only shows up mid-fight: fetch the portrait now so the cut-in isn't blank.
    if (B.tagIn) new Image().src = D.FIGHTERS[B.tagIn.ally].art.head;
    // The ending song (2.7 MB) downloads during the final fight, so it can start at its first note.
    if (isFinal(rung) && AU.MUSIC.ending && AU.settings.music) AU.load('ending').catch(function () {});
    startFight({ mode: 'story', rung: rung, practice: !!practice, player: run.player, cpu: B.id, ally: run.ally,
      seed: randomSeed(), rules: 'balanced' });
  }

  function onAssist() {
    if (S.busy || !S.fight || !E.canAssist(S.fight)) return;
    S.busy = true;
    updateControls();
    playEvents(E.assist(S.fight, S.opts.ally)).then(function () {
      S.busy = false;
      if (S.fight.over) finishFight();
      else updateControls();
    });
  }

  // The ally's mini cut-in: they slide in, shout their line, and the hit lands as they leave.
  // kind 'tagin': a boss's partner (SBF's Caroline) comes in from the other side.
  function assistIn(id, line, kind) {
    return new Promise(function (resolve) {
      var F = D.FIGHTERS[id], el = $('#assistin');
      el.classList.toggle('tagin', kind === 'tagin');
      $('.ai-card small', el).textContent = kind === 'tagin' ? 'TAG IN' : 'ASSIST';
      el.style.setProperty('--c', F.color);
      $('.ai-face', el).innerHTML = faceHTML(F);
      $('.ai-face', el).classList.toggle('has-art', !!(F.art && F.art.head));
      $('.ai-name', el).textContent = F.name.toUpperCase();
      $('.ai-line', el).textContent = '“' + line + '”';
      var dur = Math.max(1700, 450 + readMs(line) + 300); // the line shows at 0.45s; then time to read it
      el.style.setProperty('--ai-dur', dur + 'ms');
      el.hidden = false;
      void el.offsetWidth;
      el.classList.add('play');
      AU.play('assist');
      var done = false, timer = later(finish, dur);
      function finish() {
        if (done) return;
        done = true;
        clearTimeout(timer);
        el.onclick = null;
        el.classList.remove('play');
        el.hidden = true;
        resolve();
      }
      later(function () { if (!done) el.onclick = finish; }, 500);
    });
  }

  // A boss refuses to go down (Dimon's bailout): his portrait, his two lines, the headline, the stamp.
  function bailoutScene(who, hp) {
    return new Promise(function (resolve) {
      var B = D.FIGHTERS[S.fight.f[who].id], bo = B.bailout, el = $('#bossline');
      el.style.setProperty('--c', B.color);
      $('.bl-face', el).innerHTML = faceHTML(B);
      $('.bl-small', el).textContent = bo.lines[0];
      $('.bl-big', el).textContent = bo.lines[1];
      $('.bl-paper small', el).textContent = bo.paper.date;
      $('.bl-paper b', el).textContent = bo.paper.headline;
      $('.bl-stamp', el).textContent = 'BAILED OUT +' + hp + ' HP';
      el.hidden = false;
      void el.offsetWidth;
      el.classList.add('play');
      AU.duck(true);
      var snd = AU.play('bailout', 2.6);
      var done = false, timer = later(finish, 5000);
      function finish() {
        if (done) return;
        done = true;
        clearTimeout(timer);
        snd.stop(0.2);
        AU.duck(false);
        el.onclick = null;
        el.classList.remove('play');
        el.hidden = true;
        resolve();
      }
      later(function () { if (!done) el.onclick = finish; }, 900);
    });
  }

  // The face-off before a boss: you and the boss over their stage. Your line, then theirs (a tap moves it
  // on sooner), then FIGHT starts it. A rematch shows both lines at once.
  function versusScene(rung, practice) {
    return new Promise(function (resolve) {
      var B = ladderBoss(rung), P = D.FIGHTERS[S.run.player], sc = B.boss.scene, el = $('#versus');
      var step = 0, done = false, shownAt = 0, timer = null;
      el.className = 'versus vs-' + B.id;
      el.style.backgroundImage = B.boss.stage.bg ? 'url(' + B.boss.stage.bg + ')' : B.boss.stage.sky; // inline: see revealScene
      $('.vs-kicker', el).textContent = (practice ? 'REMATCH · ' : '') +
        (isFinal(rung) ? 'FINAL BOSS' : 'BOSS ' + (rung + 1) + ' OF ' + D.STORY.ladder.length) + ' · ' + B.boss.stage.name.toUpperCase();
      [['.vs-p', P, sc.you], ['.vs-b', B, sc.boss]].forEach(function (r) {
        var row = $(r[0], el), face = $('.face', row);
        face.innerHTML = faceHTML(r[1]);
        face.style.setProperty('--c', r[1].color);
        $('.vs-name', row).textContent = (r[1].short || r[1].name).toUpperCase();
        $('.vs-say', row).textContent = '“' + r[2] + '”';
      });
      el.hidden = false;
      AU.stopMusic(0.8);
      var snd = sc.sound ? AU.play(sc.sound) : null; // WICK: a clock ticking
      function next() {
        if (done || step >= 2 || Date.now() - shownAt < 450) return;
        clearTimeout(timer);
        step++;
        shownAt = Date.now();
        if (step === 1) {
          el.classList.add('show-p');
          AU.play('tap');
          timer = later(next, readMs(sc.you)); // the boss answers once you've had time to read it
        } else {
          el.classList.add('show-b', 'ready');
          if (!sc.sound) AU.play('slam');
          later(function () { if (!done) $('.vs-fight', el).focus(); }, 500);
        }
      }
      function finish() {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (snd) snd.stop(0.3);
        el.onclick = null;
        $('.vs-fight', el).onclick = null;
        document.removeEventListener('keydown', onKey);
        el.hidden = true;
        el.style.backgroundImage = '';
        resolve();
      }
      function onKey(ev) {
        if (ev.key !== 'Enter' && ev.key !== ' ') return;
        ev.preventDefault();
        if (step >= 2) finish(); else { shownAt = 0; next(); }
      }
      $('.vs-fight', el).onclick = function (ev) { ev.stopPropagation(); if (step >= 2) finish(); };
      el.onclick = next;
      document.addEventListener('keydown', onKey);
      if (practice) { el.classList.add('show-p'); step = 1; next(); shownAt = 0; }
      else next();
    });
  }

  // After WICK: why you made it this far, one card at a time. A card stays until you tap (a tap in its
  // first moment is ignored, so a double tap doesn't skip one unread); Skip ends it.
  function revealScene(B) {
    return new Promise(function (resolve) {
      var el = $('#reveal'), cards = B.boss.reveal, n = -1, done = false, shownAt = 0;
      el.style.backgroundImage = 'url(' + B.boss.stage.bg + ')';
      $('.rv-dots', el).innerHTML = cards.map(function () { return '<i></i>'; }).join('');
      el.hidden = false;
      function next() {
        if (done || Date.now() - shownAt < 700) return;
        n++;
        if (n >= cards.length) { finish(); return; }
        var card = $('.rv-card', el);
        $('.rv-big', el).textContent = cards[n][0];
        $('.rv-small', el).textContent = cards[n][1];
        $all('.rv-dots i', el).forEach(function (d, k) { d.classList.toggle('on', k <= n); });
        card.classList.remove('show');
        void card.offsetWidth;
        card.classList.add('show');
        AU.play('tick');
        shownAt = Date.now();
      }
      function finish() {
        if (done) return;
        done = true;
        el.onclick = null;
        $('.rv-skip', el).onclick = null;
        el.hidden = true;
        resolve();
      }
      $('.rv-skip', el).onclick = function (ev) { ev.stopPropagation(); finish(); };
      el.onclick = next;
      next();
    });
  }

  // The credits, at the very end of the story: the cast, then who made it (the X link), then Continue to
  // STORY COMPLETE.
  function creditsScene() {
    return new Promise(function (resolve) {
      var el = $('#credits'), btn = $('.cr-next', el);
      $('.cr-cast', el).innerHTML = D.ROSTER.concat(Object.keys(D.BOSSES)).map(function (id) {
        var F = D.FIGHTERS[id];
        return '<span class="face" style="--c:' + F.color + '" title="' + esc(F.name) + '">' + faceHTML(F) + '</span>';
      }).join('');
      // Decode the portraits now: the cast fades in at 1.5s, and a lazily decoded one would show blank.
      $all('.cr-cast img', el).forEach(function (img) { if (img.decode) img.decode().catch(function () {}); });
      el.hidden = false;
      void el.offsetWidth;
      el.classList.add('play');
      later(function () { btn.focus(); }, 3200);
      btn.onclick = function () {
        btn.onclick = null;
        el.classList.remove('play');
        el.hidden = true;
        resolve();
      };
    });
  }

  // Satoshi, sliced steel like the Lugano statue: he turns into view, says his piece and turns away.
  function satoshiSVG() {
    return '<svg viewBox="0 0 200 210" aria-hidden="true"><defs>' +
      '<linearGradient id="satMetal" x1="0" x2="1"><stop offset="0" stop-color="#7d8794"/><stop offset=".45" stop-color="#f1f4f8"/>' +
      '<stop offset=".62" stop-color="#b7c0ca"/><stop offset="1" stop-color="#5d6672"/></linearGradient>' +
      '<pattern id="satSlices" width="7" height="10" patternUnits="userSpaceOnUse"><rect width="4.4" height="10" fill="#fff"/></pattern>' +
      '<mask id="satMask"><rect width="200" height="210" fill="url(#satSlices)"/></mask></defs>' +
      '<g mask="url(#satMask)" fill="url(#satMetal)">' +
      '<path d="M100 14 C70 14 60 40 62 64 C63 80 70 90 77 97 L123 97 C130 90 137 80 138 64 C140 40 130 14 100 14Z"/>' +
      '<path d="M60 100 Q100 84 140 100 L152 158 L48 158Z"/>' +
      '<path d="M26 166 Q100 136 174 166 Q176 190 152 192 L48 192 Q24 190 26 166Z"/></g>' +
      '<ellipse cx="100" cy="60" rx="21" ry="25" fill="#07060b"/>' +
      '<path d="M70 124 L130 124 L136 156 L64 156Z" fill="#2a2f3a" stroke="#07060b" stroke-width="2"/>' +
      '<path d="M58 156 L142 156 L148 168 L52 168Z" fill="#3a4150" stroke="#07060b" stroke-width="2"/></svg>';
  }

  function satoshiScene(kind) {
    return new Promise(function (resolve) {
      var el = $('#satoshi'), T = D.STORY.satoshi, lines = kind === 'ending' ? T.ending : T.revive;
      var art = T.art && (kind === 'ending' ? T.art.portrait : T.art.sprite);
      $('.sat-fig', el).innerHTML = art ? '<img src="' + art + '" alt="">' : satoshiSVG();
      $('.sat-small', el).textContent = lines[0];
      $('.sat-big', el).textContent = lines[1];
      $('.sat-vanish', el).textContent = T.vanish;
      el.className = 'satoshi ' + kind;
      el.hidden = false;
      void el.offsetWidth;
      el.classList.add('play');
      var snd = AU.play('satoshi');
      var done = false, timer = later(finish, 5400);
      function finish() {
        if (done) return;
        done = true;
        clearTimeout(timer);
        snd.stop(0.4);
        el.onclick = null;
        el.classList.remove('play');
        el.hidden = true;
        resolve();
      }
      later(function () { if (!done) el.onclick = finish; }, 900);
    });
  }

  // Satoshi gets a knocked-out player back up with half their HP, and the fight goes on.
  async function satoshiRevive() {
    var f = S.fight;
    S.busy = true;
    updateControls();
    await sleep(300);
    await satoshiScene('revive');
    var ev = E.revive(f, 0)[0];
    fighterEl(0).classList.remove('is-ko');
    S.koProp = null;
    render(ev.snap);
    $('#turn-num').textContent = f.turn;
    AU.music(fightSong(), { from: 'loop', fade: 0.6, restart: true });
    AU.play('hodl');
    banner('BACK UP', 'Satoshi gave you ' + ev.hp + ' HP');
    log('Satoshi picked you up. ' + ev.hp + ' HP.');
    await sleep(1200);
    await readWait();
    S.busy = false;
    updateControls();
  }

  async function finishStoryFight() {
    var f = S.fight, o = S.opts, run = runGet();
    if (!run) { renderTitle(); return; }
    var knockedOut = f.winner === 1 && f.f[0].hp === 0;
    if (o.practice) {
      // A rematch has its own Satoshi, once, and never touches the run.
      if (knockedOut && !f.revived) { await satoshiRevive(); return; }
      practiceCard(run, o);
      return;
    }
    // Knocked out with Satoshi still unused: he picks you up and the fight goes on.
    if (knockedOut && run.satoshi) {
      run.satoshi = false;
      runSave(run);
      await satoshiRevive();
      return;
    }
    run.turns += f.turn;
    var B = D.FIGHTERS[o.cpu], P = D.FIGHTERS[o.player];
    if (B.leverage) run.peakLev = Math.max(run.peakLev || 1, B.leverage.steps[f.f[0].peakLev]); // goes on the share card
    var res = { mode: 'story', rung: o.rung, player: o.player, cpu: o.cpu, won: f.winner === 0, turns: f.turn,
      hp: f.f[0].hp, finish: f.finish, grid: f.grid.slice(), timeout: f.finishCause === 'timeout' };
    S.result = res;
    if (res.won) {
      run.beaten.push(o.cpu);
      run.rung++;
      runSave(run);
      if (isFinal(o.rung)) {
        await sleep(400);
        // The ending song (once it's in MUSIC) plays from the first card through STORY COMPLETE.
        var song = !!AU.MUSIC.ending;
        if (song) AU.music('ending', { restart: true, fade: 1.5, fromStart: true });
        // The credits show every portrait: fetch them now, while the cards are up.
        D.ROSTER.concat(Object.keys(D.BOSSES)).forEach(function (id) { var A = D.FIGHTERS[id].art; if (A && A.head) new Image().src = A.head; });
        if (B.boss.reveal) await revealScene(B);
        if (song) AU.duck(true);
        await satoshiScene('ending');
        if (song) AU.duck(false);
        await creditsScene();
        storySummary(run, true, song);
        return;
      }
      var next = D.STORY.ladder[run.rung], nextB = D.BOSSES[next.id];
      storyCard({
        kicker: 'STORY · BOSS ' + (o.rung + 1) + ' OF ' + D.STORY.ladder.length, title: 'BOSS DOWN',
        faces: face(P, false) + '<span>VS</span>' + face(B, true),
        line: P.name + ' beat ' + B.name + ' in ' + plural(res.turns, 'turn'),
        finish: res.finish, quote: B.loseLine ? B.name + ': “' + B.loseLine + '”' : '',
        meta: 'Next: ' + (isFinal(run.rung) ? 'the final boss' : next.name) + (nextB ? '' : ' (coming soon)'),
        actions: [['Next boss ▶', 'btn-gold', function () { closeStory(); renderLadder(run); }],
          [navigator.share ? 'Share' : 'Copy result', '', function () { shareStory(storyText(res, run)); }],
          ['Post on X', 'btn-x', storyText(res, run)],
          ['Menu', 'btn-ghost', function () { closeStory(); renderTitle(); }]]
      });
      AU.play('win');
      later(function () { if (!$('#modal-story').hidden) AU.music('menu', { from: 'loop', fade: 1.5 }); }, 1800);
      return;
    }
    runSave(run);
    continueCard(run, res);
  }

  function practiceCard(run, o) {
    var f = S.fight, P = D.FIGHTERS[o.player], B = D.FIGHTERS[o.cpu], won = f.winner === 0;
    storyCard({
      kicker: 'STORY · REMATCH', title: won ? 'BOSS DOWN' : 'YOU LOSE', lose: !won,
      faces: face(P, !won) + '<span>VS</span>' + face(B, won),
      line: won ? P.name + ' beat ' + B.name + ' in ' + plural(f.turn, 'turn') : B.name + ' beat your ' + P.name,
      finish: f.finish, quote: won && B.loseLine ? B.name + ': “' + B.loseLine + '”' : '',
      meta: 'Rematches don\'t change your run.',
      actions: [['Rematch ▶', 'btn-gold', function () { closeStory(); openAllyPick(o.rung, true); }],
        ['Back to the ladder', '', function () { closeStory(); renderLadder(run); }]]
    });
    AU.play(won ? 'win' : 'lose');
    later(function () { if (!$('#modal-story').hidden) AU.music('menu', { from: 'loop', fade: 1.5 }); }, 1800);
  }

  // CONTINUE? Ten seconds to put another coin in; then it's game over.
  function continueCard(run, res) {
    var P = D.FIGHTERS[res.player], B = D.FIGHTERS[res.cpu], left = D.STORY.continueSecs;
    storyCard({
      kicker: 'STORY · BOSS ' + (res.rung + 1) + ' OF ' + D.STORY.ladder.length, title: 'CONTINUE?', lose: true,
      faces: face(P, true) + '<span>VS</span>' + face(B, false),
      line: B.name + ' beat your ' + P.name + (res.timeout ? ' on time' : ''),
      finish: res.finish, count: left,
      quote: B.boss.continueLine ? B.name + ': “' + B.boss.continueLine + '”' : '',
      meta: run.satoshi ? '' : 'Satoshi already used his one save this run.',
      actions: [['Continue ▶', 'btn-gold', function () {
        clearInterval(S.stCount);
        AU.play('coin');
        run.continues++;
        runSave(run);
        closeStory();
        startStoryFight(run);
      }], ['Give up', 'btn-ghost', function () { clearInterval(S.stCount); storySummary(run, false); }]]
    });
    AU.play('lose');
    clearInterval(S.stCount);
    S.stCount = setInterval(function () {
      left--;
      $('#st-count').textContent = left;
      if (left > 0) { AU.play('tick'); return; }
      clearInterval(S.stCount);
      storySummary(run, false);
    }, 1000);
  }

  // The end of a run, won or lost. The run is cleared; the card can still be shared.
  function storySummary(run, won, song) {
    var P = D.FIGHTERS[run.player], n = run.beaten.length, total = D.STORY.ladder.length;
    store.set('story', null);
    var lev = run.peakLev ? ' · peak leverage ' + run.peakLev + 'x' : '';
    var stats = n + (n === 1 ? ' boss' : ' bosses') + ' beaten · ' + plural(run.continues, 'continue') +
      ' · ' + (run.satoshi ? 'never needed Satoshi' : 'Satoshi saved you once') + lev;
    var text = 'Proof of Fight · Story 📖\n' + (won
      ? 'Beat story mode with ' + P.name + '. ' + plural(run.continues, 'continue') + '.'
      : P.name + ' made it to boss ' + Math.min(n + 1, total) + ' of ' + total + '.') +
      (run.peakLev ? ' Peak leverage: ' + run.peakLev + 'x.' : '') + '\n' + siteUrl();
    storyCard({
      kicker: 'STORY', title: won ? 'STORY COMPLETE' : 'GAME OVER', lose: !won,
      faces: face(P, !won), line: won ? P.name + ' beat all ' + total + ' bosses' : P.name + ' made it to boss ' + Math.min(n + 1, total) + ' of ' + total,
      finish: '', meta: stats,
      actions: [[navigator.share ? 'Share' : 'Copy result', 'btn-gold', function () { shareStory(text); }],
        ['Post on X', 'btn-x', text],
        ['New run', '', function () { closeStory(); openStory(); }],
        ['Menu', 'btn-ghost', function () { closeStory(); renderTitle(); }]]
    });
    if (!won) AU.stopMusic(0.5);
    else if (!song) AU.play('win'); // the ending song is the win
  }

  function storyText(res, run) {
    var P = D.FIGHTERS[res.player], B = D.FIGHTERS[res.cpu];
    return 'Proof of Fight · Story 📖\n' + P.name + ' beat ' + B.name + ' in ' + plural(res.turns, 'turn') +
      ' (boss ' + (res.rung + 1) + ' of ' + D.STORY.ladder.length + ')\n' + gridText(res) + '\n' + siteUrl();
  }

  function shareStory(text) {
    if (navigator.share) { navigator.share({ text: text }).catch(function () {}); return; }
    copyText(text).then(function () { toast('Copied! Paste it anywhere.'); }, function () { toast("Couldn't copy. Try Post on X."); });
  }

  // One card for every after-fight moment in Story. An action is [label, class, onClick or share text for X].
  function storyCard(c) {
    $('#st-kicker').textContent = c.kicker;
    var t = $('#st-title');
    t.textContent = c.title;
    t.classList.toggle('lose', !!c.lose);
    $('#st-faces').innerHTML = c.faces;
    $('#st-line').textContent = c.line;
    $('#st-finish').textContent = c.finish || '';
    $('#st-quote').hidden = !c.quote;
    $('#st-quote').textContent = c.quote || '';
    $('#st-count').hidden = c.count == null;
    $('#st-count').textContent = c.count == null ? '' : c.count;
    $('#st-meta').textContent = c.meta || '';
    var box = $('#st-actions');
    box.innerHTML = '';
    c.actions.forEach(function (a) {
      var el;
      if (typeof a[2] === 'string') {
        el = document.createElement('a');
        el.href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(a[2]);
        el.target = '_blank';
        el.rel = 'noopener';
      } else {
        el = document.createElement('button');
        el.type = 'button';
        el.addEventListener('click', a[2]);
      }
      el.className = 'btn ' + a[1];
      el.textContent = a[0];
      box.appendChild(el);
    });
    $('#modal-story').hidden = false;
  }

  function closeStory() {
    clearInterval(S.stCount);
    $('#modal-story').hidden = true;
  }

  // ---------- Results & sharing ----------
  function finishFight() {
    var f = S.fight, o = S.opts;
    if (o.mode === 'story') { finishStoryFight(); return; }
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
    showResult(res, true);
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
      faceHTML(F) + '</span>' + (prop ? '<i class="face-prop">' + prop + '</i>' : '') + '</span>';
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

  // fresh: the fight just ended (play the win/lose sound); not when looking back at a finished daily.
  function showResult(res, fresh) {
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
    // The loser's line, if they have one (Garlinghouse: THIS ONE STINGS).
    var loser = D.FIGHTERS[res.won ? res.cpu : res.player];
    $('#res-quote').hidden = !loser.loseLine;
    $('#res-quote').textContent = loser.loseLine ? loser.name + ': “' + loser.loseLine + '”' : '';
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
    if (fresh) AU.play(res.won ? 'win' : 'lose');
    setTimeout(function () {
      if (!$('#modal-result').hidden) AU.music('menu', { from: 'loop', fade: 1.5 });
    }, 1800);
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
  // What a Super does, from its real effect (so the help can't drift from the rules).
  function superEffect(F) {
    var fx = D.SUPERS[F.super.id];
    var hit = fx.hits > 1 ? fx.hits + ' hits of ' + fx.dmg + ' damage' : fx.dmg + ' damage', parts = [];
    parts.push(fx.prune ? 'strips their HODL, then ' + hit : hit);
    if (fx.skip === 'blind') parts.push('Blind (they skip their next turn)');
    if (fx.skip === 'sleep') parts.push('Asleep (they skip their next turn)');
    if (fx.drain) parts.push('they lose ' + fx.drain + ' Blocks');
    if (fx.hypno) parts.push('Hypnotized (their next red, pink or purple hits themselves)');
    if (fx.hodl) parts.push('HODL (you take half damage this turn and next)');
    if (fx.shield) parts.push('FUD-proof (red, pink and purple do nothing to you this turn and next)');
    var out = parts.join(' + ');
    return out.charAt(0).toUpperCase() + out.slice(1);
  }

  // Opened mid-fight it uses your fighter's buttons, damage and odds; from the menu it explains the jobs.
  function openHelp() {
    var inFight = S.fight && !$('#screen-fight').hidden;
    var R = inFight ? S.fight.rules : D.RULESETS[S.rules];
    var me = inFight ? S.fight.f[0].id : null, F = me && D.FIGHTERS[me];
    function label(color, b) {
      var m = me && moveOf(me, b);
      return '<b>' + color + (m ? ' · ' + m.icon + ' ' + esc(m.name) : '') + '</b>';
    }
    function dmg(b) { return me ? dmgText(me, b, R) : String(R[b]); }
    function odds(b) { return me ? ' (' + pct(F[b]) + ' for ' + esc(F.name) + ')' : ' (odds depend on your fighter)'; }

    var intro = me
      ? '<p>Your buttons as ' + esc(F.name) + '. Every fighter has the same five, under their own names: same color, same job.</p>'
      : '<p>Every fighter has the same five buttons under their own names (Toly\'s red is Comrades, Saylor\'s purple is MSTR): same color, same job. ' +
        'Your fighter\'s damage and odds are on each button.</p>';
    var blue = F && F.brace && F.brace.ignore
      ? 'never hides. It always works: red and pink do nothing to you this turn, purple does half, and it gives +' + F.brace.blocks + ' Block.'
      : F && F.brace
      ? 'never hides. It always works, halves damage from red, pink and purple this turn, and gives +' + F.brace.blocks + ' Block.'
      : F && F.walrus
      ? 'try to hide' + odds('hide') + '. Hidden, red and pink miss you; purple and Supers still hit. A hit you dodge is stored on Walrus and added to your next hit that lands.'
      : F && F.stun
      ? 'never hides, so their attack this turn still lands. When it works' + odds('hide') + ', they stare at the pattern and lose their next turn.'
      : 'try to hide' + odds('hide') + '. Hidden, red and pink miss you' +
        (R.rugPiercesHidden ? '; purple and Supers still hit.' : '; so does purple. Supers still hit.');
    // Fighters who break the shared numbers (Saylor), named only on the menu version.
    var odd = me ? '' : D.ROSTER.map(function (id) {
      var X = D.FIGHTERS[id], bits = [];
      ['strike', 'mint', 'rug'].forEach(function (b) {
        if (dmgText(id, b, R) !== String(R[b])) bits.push(moveOf(id, b).name + ' does ' + dmgText(id, b, R));
      });
      if (X.brace && X.brace.ignore) bits.push(moveOf(id, 'privacy').name + ' never hides (red and pink do nothing to him, purple does half)');
      else if (X.brace) bits.push(moveOf(id, 'privacy').name + ' never hides (it halves the damage instead)');
      if (X.walrus) bits.push(moveOf(id, 'privacy').name + ' stores a dodged hit and adds it to his next one');
      if (X.stun) bits.push(moveOf(id, 'privacy').name + ' never hides (when it works, they lose their next turn)');
      if (!bits.length) return '';
      var list = bits.length > 1 ? bits.slice(0, -1).join(', ') + ' and ' + bits[bits.length - 1] : bits[0];
      return esc(X.name) + ' plays by his own numbers: ' + esc(list) + '.';
    }).filter(Boolean).join(' ');

    $('#help-body').innerHTML =
      '<p>You and the CPU each pick a move at the same time. First to 0 HP loses.</p>' +
      '<h3>The five buttons</h3>' + intro + '<ul>' +
      '<li>' + label('🔴 Red', 'strike') + ': ' + dmg('strike') + ' damage. Always lands unless they hid. The honest move.</li>' +
      '<li>' + label('🔵 Blue', 'privacy') + ': ' + blue + '</li>' +
      '<li>' + label('🩷 Pink', 'mint') + ': ' + dmg('mint') + ' damage if it lands' + odds('mint') + '.</li>' +
      '<li>' + label('🟣 Purple', 'rug') + ': ' + dmg('rug') + ' damage and steals 2 Blocks' +
        (R.rugPiercesHidden ? ', even if they hid' : '') + odds('rug') + '. If it flops you lose 2 Blocks (or take ' + R.rugRecoil + ' damage if you have none).</li>' +
      '<li><b>🟡 Gold · ⚡ ' + (F ? esc(F.super.name) : 'Super') + '</b>: once all 10 Blocks are full. Plays a cut-in and can\'t be dodged.' +
        (F ? ' ' + superEffect(F) + '.' : ' Every fighter\'s is different (below).') + '</li></ul>' +
      (odd ? '<p>' + odd + '</p>' : '') +
      '<h3>Blocks</h3>' +
      '<p>Red +2 · blue +3 if you hid, +1 if not · pink +2, or +1 if it flops · purple steals 2 when it lands · getting hit +1. ' +
      'The CPU fires its Super the moment its row is full, and you get a warning first.</p>' +
      '<h3>Supers</h3><ul>' + D.ROSTER.map(function (id) {
        var X = D.FIGHTERS[id];
        return '<li><b>' + esc(X.name) + ' · ' + esc(X.super.name) + '</b>: ' + superEffect(X) + '.</li>';
      }).join('') + '</ul>' +
      '<h3>Statuses</h3><ul>' +
      '<li>🙈 <b>Blind</b> / 💤 <b>Asleep</b> / 👀 <b>Staring</b> (Sergey\'s shirt): skip your next turn.</li>' +
      '<li>🌀 <b>Hypnotized</b>: your next red, pink or purple hits yourself. Blue or Super is safe.</li>' +
      '<li>💎 <b>HODL</b>: take half damage this turn and next.</li>' +
      '<li>4️⃣ <b>FUD-proof</b> (CZ\'s Super): red, pink and purple do nothing to him this turn and next. Supers still hit.</li>' +
      '<li>🦭 <b>Stored</b> (Adeniyi\'s Walrus): a hit he dodged, added to his next hit that lands.</li>' +
      '<li>🛡️ <b>Braced</b> (Saylor\'s STRF): half damage from red, pink and purple this turn. Supers aren\'t halved.</li></ul>' +
      '<h3>Order of a turn</h3>' +
      '<p>Skips and hypnosis from last turn, then Supers, then blue, then red / pink / purple. You go first in each step. ' +
      'The fight ends the instant someone hits 0. After ' + D.TURN_CAP + ' turns the chain halts: whoever has more HP left wins (ties go to you).</p>' +
      (STORY_ON ? '<h3>Story</h3>' +
        '<p>Beat ' + D.STORY.ladder.length + ' bosses in a row with one founder. Before each boss you pick an ally from the other founders: when you\'re at ' +
        pct(D.STORY.assistAt) + ' HP or lower, tap their face in the corner and they hit for ' + D.STORY.assistDmg +
        ' that can\'t be dodged, without using your turn. Once per run, Satoshi gets you back up with half your HP when you\'re knocked out. ' +
        'After that, a loss is CONTINUE? (that boss fight starts over) or game over. Every boss has a trick of their own; the banner says what it is when it happens.</p>' : '') +
      '<h3>Daily Fight</h3>' +
      '<p>Everyone gets the same matchup and the same luck each day. One try. Share your grid; fewer turns is better.</p>' +
      '<h3>Sound and keys</h3>' +
      '<p>Music and sounds have switches on the title screen; 🔊 in a fight mutes everything. ' +
      'On a keyboard: 1 to 4 for the four buttons, 5 or Space for your Super.</p>';
    $('#modal-help').hidden = false;
  }

  // ---------- Sound ----------
  function renderSoundButtons() {
    var st = AU.settings;
    $('#btn-music').textContent = st.music ? '🎵 Music on' : '🎵 Music off';
    $('#btn-music').setAttribute('aria-pressed', st.music);
    $('#btn-sfx').textContent = st.sfx ? '🔊 Sounds on' : '🔈 Sounds off';
    $('#btn-sfx').setAttribute('aria-pressed', st.sfx);
    $('#btn-mute').textContent = st.music || st.sfx ? '🔊' : '🔇';
    $('#press-hint').textContent = st.music || st.sfx ? '🔊 Sound on' : '🔇 Sound off';
  }

  // First visit of the page: PRESS START. The tap starts the menu song 8 beats before its drop; a portrait
  // pops in on each beat and the logo slams in on the drop. With sound off it plays straight through, quickly.
  function boot() {
    var title = $('#screen-title'), gate = $('#press-start');
    var quiet = !AU.supported() || (!AU.settings.music && !AU.settings.sfx);
    if (AU.settings.music && AU.supported()) AU.load('menu').catch(function () {});
    if (quiet) { intro(); return; }
    title.classList.add('boot');
    gate.hidden = false;
    var started = false;
    function start(ev) {
      if (started) return;
      started = true;
      if (ev) ev.preventDefault();
      AU.unlock();
      gate.hidden = true;
      title.classList.remove('boot');
      // Wait (briefly) for the song so the slam lands on its drop.
      var waited = AU.settings.music ? Promise.race([AU.load('menu'), new Promise(function (r) { setTimeout(r, 2500); })]) : Promise.resolve();
      waited.catch(function () {}).then(intro);
      document.removeEventListener('keydown', onKey);
    }
    function onKey(ev) { if (ev.key === 'Enter' || ev.key === ' ') start(ev); }
    gate.addEventListener('click', start);
    document.addEventListener('keydown', onKey);
  }

  function intro() {
    var title = $('#screen-title'), faces = $all('.title-roster span');
    title.classList.add('intro');
    var r = AU.music('menu', { from: 'start', fade: 2.4, restart: true });
    var drop = r ? r.dropIn : 0.85, beat = drop / 8, slammed = false, timers = [];
    // A portrait per beat, the last one on the beat before the drop (half-beats past 8 fighters).
    var step = faces.length > 8 ? 0.5 : 1, first = 8 - faces.length * step;
    faces.forEach(function (f, k) { timers.push(setTimeout(function () { f.classList.add('in'); }, (first + k * step) * beat * 1000)); });
    timers.push(setTimeout(slam, drop * 1000));
    // An impatient second tap slams now (attached late, so the PRESS START tap itself can't count).
    timers.push(setTimeout(function () { if (!slammed) title.addEventListener('click', slam); }, 500));
    function slam() {
      if (slammed) return;
      slammed = true;
      timers.forEach(clearTimeout);
      title.removeEventListener('click', slam);
      if (!r) AU.play('slam');               // no song (off or still loading): the boom is the slam
      faces.forEach(function (f) { f.classList.remove('in'); });
      title.classList.remove('intro');
      $('.logo').classList.add('slam');
      title.classList.add('reveal');
      restartClass($('#app'), 'quake', 500);
      var flash = document.createElement('div');
      flash.className = 'slam-flash';
      document.body.appendChild(flash);
      setTimeout(function () { flash.remove(); }, 500);
      setTimeout(function () { title.classList.remove('reveal'); $('.logo').classList.remove('slam'); }, 1200);
      if (AU.settings.music && AU.supported()) AU.load('fight').catch(function () {}); // ready before the first fight
      if (/[?&]sounds\b/.test(location.search)) openSounds();
    }
  }

  // ?sounds: every sound effect, for listening through them on a phone.
  function openSounds() {
    var groups = [['Music', [
      ['Menu: intro + drop', function () { AU.music('menu', { restart: true }); }],
      ['Menu: loop', function () { AU.music('menu', { from: 'loop', restart: true }); }],
      ['Fight', function () { AU.music('fight', { restart: true }); }],
      ['Boss: Schiff', function () { AU.music('schiff', { restart: true }); }],
      ['Boss: Dimon', function () { AU.music('dimon', { restart: true }); }],
      ['Boss: Warren', function () { AU.music('warren', { restart: true }); }],
      ['Boss: SBF', function () { AU.music('sbf', { restart: true }); }],
      ['Boss: WICK', function () { AU.music('wick', { restart: true }); }],
      ['Story ending', function () { AU.music('ending', { restart: true, fromStart: true }); }],
      ['Stop music', function () { AU.stopMusic(0.3); }]
    ]], ['Everyone', [
      ['Button tap', 'tap'], ['Punch', 'hit'], ['Big hit', 'heavy'], ['Whiff (they hid)', 'whiff'], ['Hide failed', 'bonk'],
      ['MUTUAL REKT', 'flop'], ['Hit yourself (hypnotized)', 'selfhit'], ['Super ready', 'ready'], ['K.O.', 'ko'], ['K.O. bell (with the boom)', 'ko.bell'],
      ['You win', 'win'], ['You lose', 'lose'], ['Title slam (music off)', 'slam'], ['Asleep, skips a turn', 'snore'],
      ['Blinded, skips a turn', 'huh'], ['Staring at the shirt, skips a turn', 'stare'], ['Blocks drained', 'drain'], ['HODL', 'hodl']
    ]], ['Story', [
      ['An ally jumps in', 'assist'], ['Satoshi', 'satoshi'], ['Dimon gets bailed out', 'bailout'], ['Reading the letter (skips a turn)', 'paper'], ['BANNED', 'banned'], ["Caroline's beanbags", 'beanbag'], ['WICK: before the fight', 'wick.prelude'],
      ['Leverage up', 'lev.up'], ['Position closed', 'lev.close'], ['LIQUIDATED (100x)', 'liquidated'], ['CONTINUE: coin in', 'coin'], ['CONTINUE countdown', 'tick']
    ]]];
    D.ROSTER.concat(Object.keys(D.BOSSES)).forEach(function (id) {
      var F = D.FIGHTERS[id], m = function (b) { return moveOf(id, b); }, items = [];
      items.push([m('strike').icon + ' ' + m('strike').name + ' hits', function () { AU.move(id, 'strike', 'ok'); }]);
      items.push([m('privacy').icon + ' ' + m('privacy').name + (F.brace ? ' (brace)' : ' works'), function () { AU.move(id, 'privacy', 'ok'); }]);
      if (F.stun) items.push([m('privacy').icon + ' ' + m('privacy').name + ' flops', function () { AU.move(id, 'privacy', 'fail'); }]);
      ['mint', 'rug'].forEach(function (b) {
        items.push([m(b).icon + ' ' + m(b).name + ' lands', function () { AU.move(id, b, 'ok'); }]);
        items.push([m(b).icon + ' ' + m(b).name + ' flops', function () { AU.move(id, b, 'fail'); }]);
      });
      items.push(['⚡ ' + F.super.name, function () { AU.play('super.' + F.super.id, 0, F.super.lecture ? midnightInfo(F.super) : null); }]);
      if (F.super.koScene === 'astronaut') items.push(['🧑‍🚀 Astronaut DJ (Super KO)', 'super.astronaut']);
      if (F.super.pruneLine) items.push(['🧂 ' + F.super.pruneLine, 'prune']);
      groups.push([F.name, items, F]);
    });
    var actions = [];
    $('#sounds-body').innerHTML = '<p class="res-meta">Tap to listen. Tell Claude which ones to change by name.</p>' +
      groups.map(function (g) {
        var head = g[2] ? '<span class="snd-face" style="--c:' + g[2].color + '">' + faceHTML(g[2]) + '</span>' : '';
        return '<h3>' + head + esc(g[0]) + '</h3><div class="snd-grid">' + g[1].map(function (it) {
          actions.push(it[1]);
          return '<button type="button" data-k="' + (actions.length - 1) + '">' + esc(it[0]) + '</button>';
        }).join('') + '</div>';
      }).join('');
    $('#sounds-body').onclick = function (ev) {
      var b = ev.target.closest('button[data-k]');
      if (!b) return;
      AU.unlock();
      var a = actions[+b.dataset.k];
      if (typeof a === 'function') a(); else AU.play(a);
    };
    $('#modal-sounds').hidden = false;
  }

  // ---------- Wiring ----------
  function init() {
    AU.setup({
      music: store.get('music', true), sfx: store.get('sfx', true),
      onChange: function (st) { store.set('music', st.music); store.set('sfx', st.sfx); renderSoundButtons(); }
    });
    renderSoundButtons();
    $('#btn-music').addEventListener('click', function () { AU.unlock(); AU.set('music', !AU.settings.music); });
    $('#btn-sfx').addEventListener('click', function () { AU.unlock(); AU.set('sfx', !AU.settings.sfx); });
    $('#btn-mute').addEventListener('click', function () {
      var on = AU.settings.music || AU.settings.sfx;
      AU.unlock();
      AU.set('music', !on);
      AU.set('sfx', !on);
    });
    $('#sounds-close').addEventListener('click', function () { $('#modal-sounds').hidden = true; });
    // A small tap on every button (moves have their own sounds once the turn plays out).
    document.addEventListener('click', function (ev) {
      if (ev.target.closest('button, a.btn, select') && !ev.target.closest('#press-start')) AU.play('tap');
    }, true);

    $('.title-roster').innerHTML = D.ROSTER.map(function (id) {
      var F = D.FIGHTERS[id];
      return '<span style="--c:' + F.color + '">' + faceHTML(F) + '</span>';
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
    $('#btn-story').addEventListener('click', openStory);
    $('#story-back').addEventListener('click', renderTitle);
    $('#story-fight').addEventListener('click', function (ev) {
      var d = ev.currentTarget.dataset;
      if (d.rung !== '') openAllyPick(+d.rung, d.practice === '1');
    });
    function rematch(ev) {
      var rung = ev.target.closest('.rung[data-rung]');
      if (rung && (ev.type === 'click' || ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); openAllyPick(+rung.dataset.rung, true); }
    }
    $('#ladder').addEventListener('click', rematch);
    $('#ladder').addEventListener('keydown', rematch);
    $('#story-quit').addEventListener('click', function () {
      var stuck = $('#story-quit').textContent === 'Start a new run';
      if (window.confirm(stuck ? 'Start a new run? This one ends, and you pick a fighter again.' : 'Abandon this run? You start over from the first boss.')) {
        store.set('story', null);
        openStory();
      }
    });
    $('#assist-cancel').addEventListener('click', function () { $('#modal-assist').hidden = true; });
    $('#ally-grid').addEventListener('click', function (ev) {
      var b = ev.target.closest('.ally');
      if (!b) return;
      S.run.ally = b.dataset.id;
      runSave(S.run);
      $('#modal-assist').hidden = true;
      var pick = S.pick;
      versusScene(pick.rung, pick.practice).then(function () { startStoryFight(S.run, pick.rung, pick.practice); });
    });
    $('#btn-assist').addEventListener('click', onAssist);
    $('#pick-suggest').addEventListener('click', function () {
      startFree(D.FIRST_FIGHT.player, D.FIRST_FIGHT.cpu);
    });
    $('#pick-grid').addEventListener('click', function (ev) {
      var card = ev.target.closest('.pick-card');
      if (!card) return;
      var id = card.dataset.id;
      if (S.pickStep === 'story') {
        newRun(id);
      } else if (S.pickStep === 'player') {
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
        : S.opts.mode === 'story' ? (S.opts.practice ? 'Leave this rematch?' : 'Leave? Your story run is saved at this boss (this fight starts over).')
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
      if ($('#screen-fight').hidden || !$('#modal-result').hidden || !$('#modal-help').hidden || !$('#modal-story').hidden || !S.fight) return;
      if (ev.target.tagName === 'SELECT' || ev.metaKey || ev.ctrlKey || ev.altKey) return;
      if (E.playerStatus(S.fight).skipped && (ev.key === 'Enter' || ev.key === ' ')) {
        ev.preventDefault();
        onMove(null);
        return;
      }
      if (ev.key === 'a' || ev.key === '6') { onAssist(); return; }
      var map = { '1': 'strike', '2': 'privacy', '3': 'mint', '4': 'rug', '5': 'super', ' ': 'super' };
      if (map[ev.key]) {
        ev.preventDefault();
        onMove(map[ev.key]);
      }
    });

    // The display font loads after the page; names are measured again once it has, and on rotation.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (S.fight) fitNames(); });
    window.addEventListener('resize', function () { if (S.fight) fitNames(); });

    renderTitle();
    boot();
  }

  init();
})();
