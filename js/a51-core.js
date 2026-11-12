/* 51% Attack (/51/): the rules, with no drawing in them, so node can run them too (tools/a51-sim.js).
   Real time. You defend a network, not a base. Every node you hold pays tokens each block. Attackers walk
   the edges toward your home node: one that reaches an undefended node takes it, one that reaches a
   validator chips its stake. A taken node pays nothing and sends rogues of its own. Tap a taken node to
   win it back. Lose your home node, or more than half of the network, and the chain is theirs.
   Distances are in board units (the board is 720 x 960), times in seconds. */
(function (root, factory) {
  var c = factory();
  if (typeof module === 'object' && module.exports) module.exports = c;
  else root.POF_A51_CORE = c;
})(this, function () {
  'use strict';

  // ---------- Validators ----------
  // r range, dmg per shot, rate shots a second, stake = hits it can take before it's slashed.
  var LVL = [null,
    { r: 160, dmg: 16, rate: 1.8, stake: 4 },
    { r: 176, dmg: 25, rate: 2.0, stake: 6 },
    { r: 198, dmg: 38, rate: 2.3, stake: 9 }];
  var COST = { stake: 40, up: [0, 60, 100], retake: 60 };

  // ---------- Attackers ----------
  // hp at wave 1, sp speed, pow = stake it knocks off a validator (or integrity off home), pay tokens.
  var FOE = {
    aide:     { hp: 42,   sp: 46, pow: 1, pay: 3,  name: 'Aides' },
    lobbyist: { hp: 26,   sp: 84, pow: 1, pay: 3,  name: 'Lobbyists' },
    subpoena: { hp: 150,  sp: 30, pow: 3, pay: 9,  name: 'Subpoenas' },
    rogue:    { hp: 30,   sp: 50, pow: 1, pay: 2,  name: 'Rogues' },
    boss:     { hp: 3000, sp: 16, pow: 6, pay: 80, name: 'The Senator' }
  };
  var GROWTH = 0.11;         // attacker hp grows this much a wave (compounding)

  var RULES = {
    tokens: 180, home: 20,
    block: 4,                // seconds a block
    homePay: 3,              // tokens a block from the home node; every other held node pays `reward`
    rogueEvery: 3,           // taken nodes send a rogue every this many blocks
    wait: 9,                 // seconds between waves
    earlyPay: 3,             // tokens per second left when you call a wave early
    superT: 30,              // seconds to charge the Super
    superBoss: 0.2,          // share of the boss's hp a Super takes
    clearBonus: function (w) { return 30 + 8 * w; }
  };

  // ---------- Stage: The Hearing (Warren) on Toly's network, a dense mesh ----------
  // Gates (the hearing room doors) are where attackers come in; they don't count toward consensus.
  var HEARING = {
    id: 'hearing', name: 'The Hearing', boss: 'warren', founder: 'toly', stageNo: 3,
    nodes: {
      g0: [110, 96, 'gate'], g1: [360, 74, 'gate'], g2: [610, 96, 'gate'],
      a: [150, 228], b: [360, 204], c: [570, 228],
      d: [86, 382], e: [258, 354], f: [462, 354], g: [634, 382],
      i: [180, 526], j: [360, 500], k: [540, 526],
      l: [92, 672], m: [270, 650], n: [450, 650], o: [628, 672],
      p: [205, 798], q: [515, 798],
      h: [360, 872, 'home']
    },
    edges: 'g0-a g1-b g2-c a-b b-c a-d a-e b-e b-f c-f c-g d-e e-f f-g d-i e-i e-j f-j f-k g-k i-j j-k i-l i-m j-m j-n k-n k-o l-m m-n n-o l-p m-p n-q o-q p-h q-h',
    // [type, how many, seconds apart]
    waves: [
      [['aide', 8, 1.1]],
      [['aide', 10, 0.9], ['lobbyist', 5, 0.7]],
      [['aide', 12, 0.8], ['lobbyist', 6, 0.6], ['subpoena', 2, 3]],
      [['aide', 12, 0.75], ['lobbyist', 10, 0.5], ['subpoena', 3, 2.6]],
      [['aide', 14, 0.7], ['lobbyist', 8, 0.5], ['subpoena', 5, 2.2]],
      [['lobbyist', 16, 0.4], ['subpoena', 6, 2], ['aide', 8, 0.8]],
      [['boss', 1, 0], ['aide', 12, 0.9], ['lobbyist', 8, 0.6], ['subpoena', 4, 3]]
    ],
    halvingAfter: 4,          // block rewards halve once this wave is cleared
    tapeEvery: 5, tapeFor: 4, tapeReach: 330,   // the boss's red tape: freezes the nearest validator
    bossLines: ["I'VE GOT A PLAN FOR THAT", 'READ THE LETTER', 'BAD ACTORS USE CRYPTO', 'VOTE NO', 'CHARTER DENIED']
  };

  function mulberry(seed) {
    var a = seed >>> 0;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  function create(opts) {
    opts = opts || {};
    var stage = opts.stage || HEARING, rnd = mulberry(opts.seed == null ? (Math.random() * 1e9) | 0 : opts.seed);
    var N = {}, ADJ = {}, DIST = {}, EDGES = stage.edges.split(' ').map(function (e) { return e.split('-'); });
    Object.keys(stage.nodes).forEach(function (id) {
      var v = stage.nodes[id];
      N[id] = { id: id, x: v[0], y: v[1], kind: v[2] || 'node', cap: false, lvl: 0, stake: 0, frozen: 0, cd: 0, depth: 0 };
      ADJ[id] = [];
    });
    EDGES.forEach(function (p) { ADJ[p[0]].push(p[1]); ADJ[p[1]].push(p[0]); });
    function d2(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
    var HOME = Object.keys(N).filter(function (k) { return N[k].kind === 'home'; })[0];
    var GATES = Object.keys(N).filter(function (k) { return N[k].kind === 'gate'; });
    var PLAY = Object.keys(N).filter(function (k) { return N[k].kind !== 'gate'; });      // these count for consensus
    // Distance to home along the edges, and hops from home (for the block pulse).
    (function () {
      Object.keys(N).forEach(function (k) { DIST[k] = Infinity; }); DIST[HOME] = 0;
      var todo = Object.keys(N);
      while (todo.length) {
        todo.sort(function (x, y) { return DIST[x] - DIST[y]; });
        var u = todo.shift();
        ADJ[u].forEach(function (v) { var nd = DIST[u] + d2(N[u], N[v]); if (nd < DIST[v]) DIST[v] = nd; });
      }
      var q = [HOME], seen = {}; seen[HOME] = 1;
      while (q.length) { var w = q.shift(); ADJ[w].forEach(function (v) { if (!seen[v]) { seen[v] = 1; N[v].depth = N[w].depth + 1; q.push(v); } }); }
    })();
    N[HOME].hp = N[HOME].maxhp = RULES.home;

    var G = {
      stage: stage, N: N, ADJ: ADJ, EDGES: EDGES, PLAY: PLAY, GATES: GATES, HOME: HOME, DIST: DIST,
      t: 0, tokens: RULES.tokens, wave: 0, waves: stage.waves.length, queue: [], spawnT: 0, foes: [], wait: 3,
      state: 'play', blockT: 0, block: 0, reward: 1, halved: false, superC: 0, rogueTick: 0, lineT: 3,
      kills: 0, lost: 0, retaken: 0, events: [], nextId: 1
    };
    function emit(e) { G.events.push(e); }

    G.captured = function () { var c = 0; PLAY.forEach(function (k) { if (N[k].cap) c++; }); return c; };
    G.consensus = function () { return Math.round(100 * (PLAY.length - G.captured()) / PLAY.length); };
    G.price = function (id) {
      var n = N[id];
      if (!n || n.kind !== 'node') return null;
      if (n.cap) return { what: 'retake', cost: COST.retake };
      if (n.lvl === 0) return { what: 'stake', cost: COST.stake };
      if (n.lvl < 3) return { what: 'upgrade', cost: COST.up[n.lvl] };
      return null;
    };
    // Tap a node: stake a validator, upgrade it, or win a taken node back. Returns what happened, or why not.
    G.act = function (id) {
      if (G.state !== 'play') return 'over';
      var n = N[id], p = G.price(id);
      if (!p) return n && n.lvl === 3 ? 'max' : 'no';
      if (G.tokens < p.cost) { emit({ e: 'poor', id: id, cost: p.cost }); return 'poor'; }
      G.tokens -= p.cost;
      if (n.cap) { n.cap = false; n.lvl = 1; G.retaken++; }
      else n.lvl++;
      n.stake = LVL[n.lvl].stake; n.cd = 0.25; n.frozen = 0;
      emit({ e: p.what, id: id, lvl: n.lvl });
      return p.what;
    };
    G.callWave = function () {
      if (G.state !== 'play' || G.wait <= 0 || G.wave >= G.waves) return 0;
      var bonus = Math.round(G.wait * RULES.earlyPay);
      G.tokens += bonus; G.wait = 0.001;
      emit({ e: 'early', bonus: bonus });
      return bonus;
    };
    G.superReady = function () { return G.state === 'play' && G.superC >= RULES.superT; };
    // The founder's Super. Toly: every attacker on the board is converted (and pays); the boss loses a fifth.
    G.super = function () {
      if (!G.superReady()) return false;
      G.superC = 0;
      var n = 0;
      G.foes.slice().forEach(function (o) {
        if (o.type === 'boss') { o.hp -= o.max * RULES.superBoss; emit({ e: 'bosshit', x: o.x, y: o.y }); if (o.hp <= 0) kill(o, 'convert'); return; }
        kill(o, 'convert'); n++;
      });
      emit({ e: 'super', n: n });
      return true;
    };
    G.nextWave = function () { return G.wave < G.waves ? stage.waves[G.wave] : null; };

    function startWave() {
      var w = stage.waves[G.wave]; G.wave++;
      G.queue = [];
      var at = 0;
      w.forEach(function (g) { for (var i = 0; i < g[1]; i++) G.queue.push({ type: g[0], at: at + i * g[2] + (g[0] === 'aide' || g[0] === 'boss' ? 0 : 1.5) }); at += 0.4; });
      G.queue.sort(function (a, b) { return a.at - b.at; });
      G.spawnT = 0; G.wait = -1;
      emit({ e: 'wave', n: G.wave, boss: w.some(function (g) { return g[0] === 'boss'; }) });
    }
    function spawn(type, at) {
      var f = FOE[type], from = at || (type === 'boss' ? GATES[(GATES.length / 2) | 0] : GATES[(rnd() * GATES.length) | 0]);
      var hp = f.hp * (type === 'boss' ? 1 : Math.pow(1 + GROWTH, G.wave - 1));
      var o = { id: G.nextId++, type: type, from: from, to: null, u: 0, hp: hp, max: hp, sp: f.sp * (0.92 + rnd() * 0.16), x: N[from].x, y: N[from].y };
      if (type === 'boss') o.tapeT = 4;
      o.to = nextHop(from);
      G.foes.push(o);
      emit({ e: 'spawn', id: o.id, type: type, from: from });
    }
    // Downhill toward home, with a little luck among the near-best routes so the paths vary.
    function nextHop(u) {
      var best = ADJ[u].map(function (v) { return { v: v, c: d2(N[u], N[v]) + DIST[v] }; }).filter(function (z) { return DIST[z.v] < DIST[u]; });
      if (!best.length) return null;
      best.sort(function (a, b) { return a.c - b.c; });
      var ok = best.filter(function (z) { return z.c <= best[0].c * 1.18; });
      return ok[(rnd() * ok.length) | 0].v;
    }
    function take(n, how) { n.cap = true; n.lvl = 0; n.stake = 0; n.frozen = 0; G.lost++; emit({ e: 'taken', id: n.id, how: how }); }
    // True when the attacker is used up.
    function arrive(o) {
      var n = N[o.to], f = FOE[o.type], boss = o.type === 'boss';
      if (n.kind === 'home') {
        var d = boss ? 10 : f.pow;
        n.hp = Math.max(0, n.hp - d);
        emit({ e: 'home', dmg: d });
        return true;
      }
      if (!n.cap) {
        if (n.lvl > 0) {
          n.stake -= f.pow;
          if (n.stake <= 0) take(n, 'slashed'); else emit({ e: 'chip', id: n.id, pow: f.pow });
        } else take(n, 'taken');
        if (!boss) return true;
      }
      o.from = o.to; o.to = nextHop(o.from); o.u = 0;
      return o.to === null;
    }
    function kill(o, how) {
      var i = G.foes.indexOf(o); if (i >= 0) G.foes.splice(i, 1);
      G.tokens += FOE[o.type].pay; G.kills++;
      emit({ e: 'kill', type: o.type, x: o.x, y: o.y, pay: FOE[o.type].pay, how: how || 'shot' });
    }
    function end(win, why) { G.state = win ? 'won' : 'lost'; emit({ e: win ? 'won' : 'lost', why: why }); }

    G.update = function (dt) {
      if (G.state !== 'play') return;
      G.t += dt;
      G.superC = Math.min(RULES.superT, G.superC + dt);
      // Blocks: every held node pays, and taken nodes send rogues.
      G.blockT += dt;
      if (G.blockT >= RULES.block) {
        G.blockT -= RULES.block; G.block++;
        var held = PLAY.filter(function (k) { return !N[k].cap && k !== HOME; }).length;
        var pay = Math.round(held * G.reward + RULES.homePay);
        G.tokens += pay;
        emit({ e: 'block', pay: pay });
        if (++G.rogueTick % RULES.rogueEvery === 0) PLAY.forEach(function (k) { if (N[k].cap && G.foes.length < 70) spawn('rogue', k); });
      }
      // Waves
      if (G.wait > 0) { G.wait -= dt; if (G.wait <= 0) startWave(); }
      if (G.queue.length) {
        G.spawnT += dt;
        while (G.queue.length && G.queue[0].at <= G.spawnT) spawn(G.queue.shift().type);
      } else if (G.wait < 0 && !G.foes.some(function (o) { return o.type !== 'rogue'; })) {
        if (G.wave >= G.waves) return end(true);
        var bonus = RULES.clearBonus(G.wave); G.tokens += bonus;
        var halving = G.wave === stage.halvingAfter && !G.halved;
        if (halving) { G.halved = true; G.reward = 0.5; }
        emit({ e: 'clear', n: G.wave, bonus: bonus, halving: halving });
        G.wait = RULES.wait;
      }
      // Attackers walk
      for (var i = G.foes.length - 1; i >= 0; i--) {
        var o = G.foes[i];
        if (!o.to) { G.foes.splice(i, 1); continue; }
        var a = N[o.from], b = N[o.to];
        o.u += o.sp * dt / d2(a, b);
        if (o.u >= 1) { o.x = b.x; o.y = b.y; if (arrive(o)) { G.foes.splice(i, 1); emit({ e: 'gone', id: o.id }); continue; } }
        else { o.x = a.x + (b.x - a.x) * o.u; o.y = a.y + (b.y - a.y) * o.u; }
        if (o.type === 'boss') {
          o.tapeT -= dt;
          if (o.tapeT <= 0) {
            o.tapeT = stage.tapeEvery;
            var near = null, nd = stage.tapeReach;
            PLAY.forEach(function (k) { var n = N[k]; if (n.lvl > 0 && !n.cap && !n.frozen) { var dd = d2(n, o); if (dd < nd) { nd = dd; near = n; } } });
            if (near) { near.frozen = stage.tapeFor; emit({ e: 'tape', id: near.id, x: o.x, y: o.y }); }
          }
          G.lineT -= dt;
          if (G.lineT <= 0) { G.lineT = 6.5; emit({ e: 'line', text: stage.bossLines[(rnd() * stage.bossLines.length) | 0] }); }
        }
      }
      // Validators fire at whoever in range is closest to home.
      PLAY.forEach(function (k) {
        var n = N[k]; if (k === HOME || n.cap || !n.lvl) return;
        if (n.frozen > 0) { n.frozen = Math.max(0, n.frozen - dt); return; }
        n.cd -= dt; if (n.cd > 0) return;
        var L = LVL[n.lvl], tgt = null, td = Infinity;
        G.foes.forEach(function (o) {
          if (Math.hypot(o.x - n.x, o.y - n.y) > L.r) return;
          var rem = DIST[o.to] + d2(o, N[o.to]);
          if (rem < td) { td = rem; tgt = o; }
        });
        if (!tgt) return;
        n.cd = 1 / L.rate;
        tgt.hp -= L.dmg;
        emit({ e: 'shot', id: k, lvl: n.lvl, foe: tgt.id, x: tgt.x, y: tgt.y });
        if (tgt.hp <= 0) kill(tgt);
      });
      if (N[HOME].hp <= 0) end(false, 'home');
      else if (G.captured() / PLAY.length > 0.5) end(false, '51');
    };
    return G;
  }

  // A simple player for the title screen and the balance checks: holds the front, then upgrades.
  function bot(G, skill) {
    var order = ['b', 'a', 'c', 'e', 'f', 'd', 'g', 'j', 'i', 'k', 'm', 'n', 'l', 'o', 'p', 'q'];
    var lim = skill === 'lazy' ? 6 : order.length, k, n;
    for (k = 0; k < lim; k++) { n = G.N[order[k]]; if ((n.cap || n.lvl < 1) && G.tokens >= COST.retake) { G.act(order[k]); return; } }
    if (skill !== 'lazy') for (k = 0; k < order.length; k++) { n = G.N[order[k]]; if (!n.cap && n.lvl > 0 && n.lvl < 3 && G.tokens >= COST.up[n.lvl] + 40) { G.act(order[k]); return; } }
    if (G.superReady() && G.foes.length > 8) G.super();
  }

  return { create: create, bot: bot, LVL: LVL, COST: COST, FOE: FOE, RULES: RULES, HEARING: HEARING };
});
