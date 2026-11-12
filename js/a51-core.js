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
  var COST = { stake: 40, up: [0, 60, 100], retake: 60, repair: 30 };

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

  // ---------- The story: five bosses, five networks, five rule changes ----------
  // nodes: [x, y, kind]. Gates are where attackers come in; they don't count toward consensus. 'h' is home.
  // waves: [type, how many, seconds apart]. names: what this boss's attackers are called.
  // mech: the boss's rule change, which is on for the whole stage (see update()):
  //   fog        a fog bank drifts over part of the network; validators inside see half as far
  //   bid        he bids for your validators; counter the offer (tap it) or it switches sides
  //   tape       the boss freezes the nearest validator in red tape (only while she's on the board)
  //   commingle  he skims your tokens every block, and a third of his attackers are fakes
  //   candles    every block is a real weekly Bitcoin candle; a crash knocks stake off every validator, a pump pays double
  var STAGES = [
    {
      id: 'vault', name: 'The Gold Vault', boss: 'schiff', bossName: 'PETER SCHIFF', short: 'Schiff', color: '#ff9d2e', mech: 'fog',
      twist: 'Fog hides half your network',
      scene: { you: 'I need to convince Schiff gold is a relic of the past!', boss: 'Crypto is a speculative bubble! A Ponzi scheme!' },
      tips: ['<b>FUD fog</b> drifts over the network. Validators inside it see half as far.', 'He comes last, and gold bars pour out ahead of him.'],
      names: { aide: 'Gold bugs', lobbyist: 'Doomsayers', subpoena: 'Gold bars' }, heavy: 'bar',
      nodes: {
        g0: [200, 96, 'gate'], g1: [520, 96, 'gate'],
        a: [200, 240], b: [520, 240],
        c: [110, 400], d: [360, 360], e: [610, 400],
        f: [220, 540], i: [500, 540],
        j: [120, 690], k: [360, 660], l: [600, 690],
        h: [360, 872, 'home']
      },
      edges: 'g0-a g1-b a-b a-c a-d b-d b-e c-d d-e c-f d-f d-i e-i f-i f-j f-k i-k i-l j-k k-l j-h k-h l-h',
      waves: [
        [['aide', 7, 1.2]],
        [['aide', 9, 1.0], ['lobbyist', 4, 0.8]],
        [['aide', 10, 0.9], ['lobbyist', 6, 0.7], ['subpoena', 2, 3]],
        [['aide', 12, 0.8], ['lobbyist', 8, 0.6], ['subpoena', 3, 2.6]],
        [['boss', 1, 0], ['aide', 10, 1.0], ['lobbyist', 6, 0.7], ['subpoena', 2, 3]]
      ],
      halvingAfter: 3, bossHp: 1100, growth: 0.10, tokens: 220,
      fogZones: [[170, 320, 175], [550, 320, 175], [360, 560, 200]], fogOn: 9, fogOff: 5,
      rushEvery: 10,
      bossLines: ['BUY GOLD', 'BACKED BY NOTHING', 'BITCOIN TO $10,000', 'ALLOCATED. VAULTED.', 'HEAVY METAL']
    },
    {
      id: 'bank', name: 'The Bank', boss: 'dimon', bossName: 'JAMIE DIMON', short: 'Dimon', color: '#4d8dff', mech: 'bid',
      twist: 'He bids for your validators',
      scene: { you: "You called it a pet rock, Jamie. Let's see whose rock is harder.", boss: "If I was the government, I'd close it down." },
      tips: ['<b>Buyouts.</b> He bids for a validator. Tap it to counter the offer before the ring runs out, or it switches sides.', 'When he walks in himself, the bids come twice as fast.'],
      names: { aide: 'Bankers', lobbyist: 'Traders', subpoena: 'Vaults' }, heavy: 'vault',
      nodes: {
        g0: [120, 96, 'gate'], g1: [360, 74, 'gate'], g2: [600, 96, 'gate'],
        a: [120, 230], b: [360, 210], c: [600, 230],
        d: [220, 350], e: [500, 350],
        f: [90, 480], i: [300, 470], j: [420, 470], k: [630, 480],
        l: [180, 610], m: [360, 590], n: [540, 610],
        o: [250, 750], p: [470, 750],
        h: [360, 872, 'home']
      },
      edges: 'g0-a g1-b g2-c a-b b-c a-d b-d b-e c-e a-f d-f d-i e-j e-k c-k i-j f-l i-l i-m j-m j-n k-n l-m m-n l-o m-o m-p n-p o-p o-h p-h',
      waves: [
        [['aide', 8, 1.1]],
        [['aide', 10, 0.9], ['lobbyist', 5, 0.7]],
        [['aide', 12, 0.8], ['lobbyist', 6, 0.6], ['subpoena', 2, 3]],
        [['aide', 12, 0.75], ['lobbyist', 9, 0.5], ['subpoena', 3, 2.6]],
        [['aide', 14, 0.7], ['lobbyist', 8, 0.5], ['subpoena', 5, 2.2]],
        [['boss', 1, 0], ['aide', 12, 0.9], ['lobbyist', 8, 0.6], ['subpoena', 3, 3]]
      ],
      halvingAfter: 4, bossHp: 1300, growth: 0.10,
      bidEvery: 12, bidEveryBoss: 8, bidFor: 7, bidCost: function (lvl) { return 15 + 15 * lvl; },
      bossLines: ["IT'S A PET ROCK", 'HYPED-UP FRAUD', 'FORTRESS BALANCE SHEET', "IT'S DIFFERENT WHEN WE DO IT", "I'D CLOSE IT DOWN"]
    },
    {
      id: 'hearing', name: 'The Hearing', boss: 'warren', bossName: 'SEN. WARREN', short: 'Warren', color: '#ff3d5a', mech: 'tape',
      twist: 'Red tape freezes validators',
      scene: { you: "Senator, we're building the future of finance.", boss: "Crypto isn't modern finance; it's a vehicle for illicit finance and scams!" },
      tips: ['<b>Red tape.</b> When the Senator walks the network, she freezes the validator nearest her.', 'Spread your validators out so one freeze can\'t open a lane.'],
      names: { aide: 'Aides', lobbyist: 'Lobbyists', subpoena: 'Subpoenas' }, heavy: 'paper',
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
      waves: [
        [['aide', 8, 1.1]],
        [['aide', 10, 0.9], ['lobbyist', 5, 0.7]],
        [['aide', 12, 0.8], ['lobbyist', 6, 0.6], ['subpoena', 2, 3]],
        [['aide', 12, 0.75], ['lobbyist', 10, 0.5], ['subpoena', 3, 2.6]],
        [['aide', 14, 0.7], ['lobbyist', 8, 0.5], ['subpoena', 5, 2.2]],
        [['lobbyist', 16, 0.4], ['subpoena', 6, 2], ['aide', 8, 0.8]],
        [['boss', 1, 0], ['aide', 12, 0.9], ['lobbyist', 8, 0.6], ['subpoena', 4, 3]]
      ],
      halvingAfter: 4, bossHp: 3000, growth: 0.11,
      tapeEvery: 5, tapeFor: 4, tapeReach: 330,
      bossLines: ["I'VE GOT A PLAN FOR THAT", 'READ THE LETTER', 'BAD ACTORS USE CRYPTO', 'VOTE NO', 'CHARTER DENIED']
    },
    {
      id: 'yard', name: 'The Yard', boss: 'sbf', bossName: 'SBF', short: 'SBF', color: '#ff4fd8', mech: 'commingle',
      twist: 'He spends your tokens',
      scene: { you: "You froze everyone's money at FTX, Sam. This one's for them.", boss: "I didn't knowingly commingle funds." },
      tips: ['<b>Commingled.</b> Every block he skims a cut of your tokens. Money you hold is money he spends.', '<b>Fakes.</b> A third of his attackers are empty: one hit and they\'re gone, and they can\'t take a node.', 'When he walks in, he pays for his own repairs with your balance.'],
      names: { aide: 'Trading bots', lobbyist: 'Shills', subpoena: 'IOUs' }, heavy: 'paper',
      nodes: {
        g0: [80, 110, 'gate'], g1: [270, 80, 'gate'], g2: [450, 80, 'gate'], g3: [640, 110, 'gate'],
        a: [100, 250], b: [270, 220], c: [450, 220], d: [620, 250],
        e: [180, 370], f: [360, 340], i: [540, 370],
        j: [80, 500], k: [270, 490], l: [450, 490], m: [640, 500],
        n: [170, 630], o: [360, 610], p: [550, 630],
        q: [260, 760], r: [460, 760],
        h: [360, 872, 'home']
      },
      edges: 'g0-a g1-b g2-c g3-d a-b b-c c-d a-e b-e b-f c-f c-i d-i a-j e-j e-k f-k f-l i-l i-m d-m e-f f-i j-n k-n k-o l-o l-p m-p n-o o-p n-q o-q o-r p-r q-r q-h r-h',
      waves: [
        [['aide', 9, 1.0]],
        [['aide', 12, 0.8], ['lobbyist', 6, 0.6]],
        [['aide', 14, 0.7], ['lobbyist', 8, 0.5], ['subpoena', 2, 3]],
        [['aide', 14, 0.65], ['lobbyist', 12, 0.45], ['subpoena', 4, 2.4]],
        [['aide', 16, 0.6], ['lobbyist', 10, 0.45], ['subpoena', 6, 2]],
        [['lobbyist', 20, 0.35], ['subpoena', 7, 1.8], ['aide', 10, 0.7]],
        [['boss', 1, 0], ['aide', 14, 0.8], ['lobbyist', 10, 0.5], ['subpoena', 5, 2.6]]
      ],
      halvingAfter: 4, bossHp: 3200, growth: 0.11,
      skim: 0.12, skimMin: 3, fakes: 0.33,
      withdrawEvery: 6, withdraw: 20, withdrawHeal: 9,
      bossLines: ['ASSETS ARE FINE', 'PUT MONEY IN THE BOX', 'GG EZ', 'I NEED A MINUTE', '1) WHAT']
    },
    {
      id: 'chart', name: 'The Chart', boss: 'wick', bossName: 'WICK', short: 'WICK', color: '#ff2e4d', mech: 'candles',
      twist: 'Every block is a real candle',
      scene: { you: 'Four bosses down. Who is really behind all this?', boss: "You've made it this far. But do you really know why?" },
      tips: ['<b>The market.</b> Every block is a real week of Bitcoin, from the 2021 top to the 2022 bottom.', '<b>A red week of 10% or worse</b> knocks stake off every validator, and 20% or worse knocks off two. At zero the validator is liquidated.', '<b>A green week of 8% or better</b> pays double and gives one stake back. Upgrading refills it all.'],
      names: { aide: 'Shorts', lobbyist: 'Liquidators', subpoena: 'Whales' }, heavy: 'candle',
      nodes: {
        g0: [110, 96, 'gate'], g1: [360, 74, 'gate'], g2: [610, 96, 'gate'],
        a: [110, 220], b: [280, 200], c: [440, 200], d: [610, 220],
        e: [190, 330], f: [360, 310], i: [530, 330],
        j: [90, 440], k: [270, 440], l: [450, 440], m: [630, 440],
        n: [180, 560], o: [360, 540], p: [540, 560],
        q: [100, 680], r: [280, 670], s: [440, 670], t: [620, 680],
        u: [200, 790], v: [520, 790],
        h: [360, 872, 'home']
      },
      edges: 'g0-a g1-b g1-c g2-d a-b b-c c-d a-e b-e b-f c-f c-i d-i e-f f-i a-j e-j e-k f-k f-l i-l i-m d-m j-k k-l l-m j-n k-n k-o l-o l-p m-p n-o o-p n-q n-r o-r o-s p-s p-t q-r r-s s-t q-u r-u s-v t-v u-v u-h v-h',
      waves: [
        [['aide', 10, 1.0]],
        [['aide', 12, 0.8], ['lobbyist', 6, 0.6]],
        [['aide', 14, 0.7], ['lobbyist', 8, 0.5], ['subpoena', 3, 2.8]],
        [['aide', 14, 0.65], ['lobbyist', 12, 0.45], ['subpoena', 4, 2.4]],
        [['aide', 16, 0.6], ['lobbyist', 10, 0.45], ['subpoena', 6, 2]],
        [['lobbyist', 20, 0.35], ['subpoena', 7, 1.8], ['aide', 10, 0.7]],
        [['aide', 18, 0.5], ['lobbyist', 14, 0.4], ['subpoena', 8, 1.8]],
        [['boss', 1, 0], ['aide', 14, 0.8], ['lobbyist', 10, 0.5], ['subpoena', 5, 2.6]]
      ],
      halvingAfter: 4, bossHp: 3200, growth: 0.10,
      // Bitcoin's weekly change in percent, 7 Nov 2021 ($63,096) to 1 Jan 2023 ($16,596), from js/dip-data.js.
      candles: [3, -9, -3, -14, 2, -6, 8, -7, -11, 3, -16, 5, 11, 0, -9, -2, 2, -1, 9, 13, -1, -9, -6, 0, -3, -11, -8, -3, -3, 2, -10, -24, 3, -9, 8, 0, 9, 3, -1, 5, -11, -9, 1, 9, -11, -3, 1, 2, -1, 1, 5, 2, -22, 0, 1, 4, 0, -2, 0, -1],
      startPrice: 63096, crashAt: -10, bigCrashAt: -20, pumpAt: 8,
      wickEvery: 6, wickReach: 330,
      bossLines: ['PLACE YOUR BETS', 'STOPPED OUT', 'SCAM WICK', 'BULL TRAP', '100X? CUTE.']
    }
  ];
  STAGES.forEach(function (st, k) { st.stageNo = k + 1; });
  function stageById(id) { for (var k = 0; k < STAGES.length; k++) if (STAGES[k].id === id) return STAGES[k]; return null; }

  function mulberry(seed) {
    var a = seed >>> 0;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }

  function create(opts) {
    opts = opts || {};
    var stage = opts.stage || STAGES[2], rnd = mulberry(opts.seed == null ? (Math.random() * 1e9) | 0 : opts.seed);
    var N = {}, ADJ = {}, DIST = {}, EDGES = stage.edges.split(' ').map(function (e) { return e.split('-'); });
    Object.keys(stage.nodes).forEach(function (id) {
      var v = stage.nodes[id];
      N[id] = { id: id, x: v[0], y: v[1], kind: v[2] || 'node', cap: false, lvl: 0, stake: 0, frozen: 0, cd: 0, depth: 0, fog: false, bid: 0, bidCost: 0 };
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
      t: 0, tokens: stage.tokens || RULES.tokens, wave: 0, waves: stage.waves.length, queue: [], spawnT: 0, foes: [], wait: 3,
      state: 'play', blockT: 0, block: 0, reward: 1, halved: false, superC: 0, rogueTick: 0, lineT: 3,
      kills: 0, lost: 0, retaken: 0, events: [], nextId: 1,
      fog: { zone: -1, on: false, t: 6 }, bidT: 8, ci: 0, btc: stage.startPrice || 0, candle: 0, skimmed: 0, liquidated: 0
    };
    // Front first: the order a sensible player (and the bot) fills the network in.
    G.order = PLAY.filter(function (k) { return k !== HOME; }).sort(function (x, y) { return DIST[y] - DIST[x]; });
    function emit(e) { G.events.push(e); }

    G.captured = function () { var c = 0; PLAY.forEach(function (k) { if (N[k].cap) c++; }); return c; };
    G.consensus = function () { return Math.round(100 * (PLAY.length - G.captured()) / PLAY.length); };
    G.price = function (id) {
      var n = N[id];
      if (!n || n.kind !== 'node') return null;
      if (n.cap) return { what: 'retake', cost: COST.retake };
      if (n.bid > 0) return { what: 'counter', cost: n.bidCost };
      if (n.lvl === 0) return { what: 'stake', cost: COST.stake };
      if (n.lvl < 3) return { what: 'upgrade', cost: COST.up[n.lvl] };
      if (n.stake < LVL[3].stake) return { what: 'repair', cost: COST.repair };
      return null;
    };
    // Tap a node: stake a validator, upgrade it, or win a taken node back. Returns what happened, or why not.
    G.act = function (id) {
      if (G.state !== 'play') return 'over';
      var n = N[id], p = G.price(id);
      if (!p) return n && n.lvl === 3 ? 'max' : 'no';
      if (G.tokens < p.cost) { emit({ e: 'poor', id: id, cost: p.cost }); return 'poor'; }
      G.tokens -= p.cost;
      if (p.what === 'counter') { n.bid = 0; emit({ e: 'counter', id: id }); return 'counter'; }
      if (n.cap) { n.cap = false; n.lvl = 1; G.retaken++; }
      else if (p.what !== 'repair') n.lvl++;
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
    G.nextCandle = function () { return stage.candles ? stage.candles[G.ci % stage.candles.length] : 0; };
    G.inFog = function (x, y) { var z = G.fog.on && stage.fogZones[G.fog.zone]; return !!z && Math.hypot(x - z[0], y - z[1]) < z[2]; };
    G.boss = function () { for (var i = 0; i < G.foes.length; i++) if (G.foes[i].type === 'boss') return G.foes[i]; return null; };

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
      var hp = type === 'boss' ? stage.bossHp : f.hp * Math.pow(1 + (stage.growth || GROWTH), G.wave - 1);
      var o = { id: G.nextId++, type: type, from: from, to: null, u: 0, hp: hp, max: hp, sp: f.sp * (0.92 + rnd() * 0.16), x: N[from].x, y: N[from].y };
      if (type === 'boss') o.tapeT = 4;
      else if (stage.fakes && type !== 'rogue' && G.wave > 1 && rnd() < stage.fakes) { o.fake = true; o.hp = 1; }
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
    function take(n, how) { n.cap = true; n.lvl = 0; n.stake = 0; n.frozen = 0; n.bid = 0; G.lost++; emit({ e: 'taken', id: n.id, how: how }); }
    // The Chart: a validator with no stake left is wiped out, but the node stays yours (and undefended).
    function liquidate(n) { n.lvl = 0; n.stake = 0; n.frozen = 0; G.liquidated++; emit({ e: 'liq', id: n.id }); }
    // True when the attacker is used up.
    function arrive(o) {
      var n = N[o.to], f = FOE[o.type], boss = o.type === 'boss';
      if (n.kind === 'home') {
        var d = boss ? 10 : f.pow;
        n.hp = Math.max(0, n.hp - d);
        emit({ e: 'home', dmg: d });
        return true;
      }
      if (o.fake) { emit({ e: 'fake', x: o.x, y: o.y }); return true; }
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
      if (o.fake) { emit({ e: 'fake', x: o.x, y: o.y }); return; }
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
        if (stage.candles) {
          // The Chart: this block is the next real week. A crash knocks stake off every validator; a pump pays double.
          var c = G.nextCandle(); G.ci++; G.candle = c; G.btc *= 1 + c / 100;
          var crash = c <= stage.crashAt, pump = c >= stage.pumpAt;
          if (pump) pay *= 2;
          emit({ e: 'candle', pct: c, price: G.btc, crash: crash, pump: pump });
          if (crash || pump) PLAY.forEach(function (k) {
            var n = N[k]; if (k === HOME || n.cap || !n.lvl) return;
            if (pump) { n.stake = Math.min(LVL[n.lvl].stake, n.stake + 1); return; }
            n.stake -= c <= stage.bigCrashAt ? 2 : 1;
            if (n.stake <= 0) liquidate(n);
          });
        }
        G.tokens += pay;
        emit({ e: 'block', pay: pay });
        if (stage.skim && G.wave > 0) {
          var cut = Math.min(Math.floor(G.tokens), Math.max(stage.skimMin, Math.round(G.tokens * stage.skim)));
          if (cut > 0) { G.tokens -= cut; G.skimmed += cut; emit({ e: 'skim', n: cut }); }
        }
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
      var busy = G.wait < 0, bossNow = G.boss();
      // Schiff's fog: one zone at a time, on for a while, then clear, then the next zone.
      if (stage.fogZones && G.wave >= 2) {
        G.fog.t -= dt;
        if (G.fog.t <= 0) {
          if (G.fog.on) { G.fog.on = false; G.fog.t = stage.fogOff; emit({ e: 'fog', on: false }); }
          else if (busy) { G.fog.on = true; G.fog.zone = (G.fog.zone + 1) % stage.fogZones.length; G.fog.t = stage.fogOn; emit({ e: 'fog', on: true, zone: G.fog.zone }); }
          else G.fog.t = 1;
        }
        PLAY.forEach(function (k) { N[k].fog = G.inFog(N[k].x, N[k].y); });
      }
      // Dimon's buyouts: a bid on one of your validators, with a clock on it.
      if (stage.bidEvery) {
        PLAY.forEach(function (k) {
          var n = N[k]; if (n.bid <= 0) return;
          n.bid -= dt;
          if (n.bid <= 0) { n.bid = 0; if (!n.cap && n.lvl) take(n, 'bought'); }
        });
        if (busy && G.wave >= 2) {
          G.bidT -= dt;
          if (G.bidT <= 0) {
            G.bidT = bossNow ? stage.bidEveryBoss : stage.bidEvery;
            var pool = PLAY.filter(function (k) { var n = N[k]; return k !== HOME && !n.cap && n.lvl > 0 && n.bid <= 0; }), pick = null;
            for (var b3 = 0; b3 < 3 && pool.length; b3++) { var cand = N[pool[(rnd() * pool.length) | 0]]; if (!pick || cand.lvl > pick.lvl) pick = cand; }   // he likes your best ones
            if (pick) { pick.bid = stage.bidFor; pick.bidCost = stage.bidCost(pick.lvl); emit({ e: 'bid', id: pick.id, cost: pick.bidCost }); }
          }
        }
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
            var near = null, nd = stage.tapeReach || stage.wickReach || 0;
            PLAY.forEach(function (k) { var n = N[k]; if (n.lvl > 0 && !n.cap && !n.frozen) { var dd = d2(n, o); if (dd < nd) { nd = dd; near = n; } } });
            if (stage.mech === 'tape') {                    // Warren: red tape
              o.tapeT = stage.tapeEvery;
              if (near) { near.frozen = stage.tapeFor; emit({ e: 'tape', id: near.id, x: o.x, y: o.y }); }
            } else if (stage.mech === 'fog') {              // Schiff: a gold bar runs out ahead of him
              o.tapeT = stage.rushEvery;
              if (o.to && N[o.to].kind !== 'home') { spawn('subpoena', o.to); emit({ e: 'rush', x: o.x, y: o.y }); }
            } else if (stage.mech === 'commingle') {        // SBF: patches himself up with your tokens
              o.tapeT = stage.withdrawEvery;
              var w = Math.min(Math.floor(G.tokens), stage.withdraw);
              if (w > 0) { G.tokens -= w; G.skimmed += w; o.hp = Math.min(o.max, o.hp + w * stage.withdrawHeal); emit({ e: 'withdraw', n: w, x: o.x, y: o.y }); }
            } else if (stage.mech === 'candles') {          // WICK: a wick takes half the nearest validator's stake
              o.tapeT = stage.wickEvery;
              if (near) { near.stake = Math.floor(near.stake / 2); emit({ e: 'wick', id: near.id, x: o.x, y: o.y }); if (near.stake <= 0) liquidate(near); }
            } else o.tapeT = 99;
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
        var L = LVL[n.lvl], tgt = null, td = Infinity, reach = n.fog ? L.r * 0.5 : L.r;
        G.foes.forEach(function (o) {
          if (Math.hypot(o.x - n.x, o.y - n.y) > reach) return;
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

  // A simple player for the title screen and the balance checks: answers bids, holds the front, then upgrades.
  function bot(G, skill) {
    var order = G.order, lim = skill === 'lazy' ? 6 : order.length, k, n;
    for (k = 0; k < order.length; k++) { n = G.N[order[k]]; if (n.bid > 0 && G.tokens >= n.bidCost) { G.act(order[k]); return; } }
    for (k = 0; k < lim; k++) { n = G.N[order[k]]; if ((n.cap || n.lvl < 1) && G.tokens >= COST.retake) { G.act(order[k]); return; } }
    if (skill !== 'lazy') {
      for (k = 0; k < order.length; k++) { n = G.N[order[k]]; if (!n.cap && n.lvl > 0 && n.lvl < 3 && (n.stake <= 2 ? G.tokens >= COST.up[n.lvl] : G.tokens >= COST.up[n.lvl] + 40)) { G.act(order[k]); return; } }
      for (k = 0; k < order.length; k++) { n = G.N[order[k]]; if (!n.cap && n.lvl === 3 && n.stake <= 4 && G.tokens >= COST.repair) { G.act(order[k]); return; } }
    }
    if (G.superReady() && G.foes.length > 8) G.super();
  }

  return { create: create, bot: bot, LVL: LVL, COST: COST, FOE: FOE, RULES: RULES, STAGES: STAGES, stageById: stageById };
});
