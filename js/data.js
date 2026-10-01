// Proof of Fight — all tunable numbers and joke copy live here.
// Change a number, reload the page, play. `node tools/sim.js` re-checks balance.
(function (root, factory) {
  var data = factory();
  if (typeof module === 'object' && module.exports) module.exports = data;
  else root.POF_DATA = data;
})(this, function () {
  'use strict';

  var MAX_BLOCKS = 10;
  var TURN_CAP = 30;

  var RULESETS = {
    balanced: {
      id: 'balanced',
      label: 'Balanced (recommended)',
      strike: 10,
      mint: 24,
      rug: 36,
      rugRecoil: 5,
      rugPiercesHidden: true,
      hp: { default: 100, saylor: 105 }
    },
    original: {
      id: 'original',
      label: 'Original draft numbers',
      strike: 12,
      mint: 18,
      rug: 28,
      rugRecoil: 5,
      rugPiercesHidden: false,
      hp: { default: 100 }
    }
  };

  // Blocks gained per action. Rug steals/loses are handled in the engine.
  var BLOCKS = {
    strike: 2,
    privacyOk: 3,
    privacyFail: 1,
    mintOk: 2,
    mintFail: 1,
    rugSteal: 2,
    rugFailLoss: 2,
    gotHit: 1
  };

  var PRIVACY_FAIL_LINES = ['VIEW KEY LEAKED', 'EXPLORER SAYS HI', 'YOUR MEMO WAS EMPTY'];

  // Button names. A fighter can rename any button with its own `moves` entry; the job,
  // color and numbers stay the same. Names: 12 characters max so they fit on a phone.
  //   ok   = banner when it lands (privacy: when you hide)
  //   fail = banner when it flops (default Mint/Rug show the fighter's mintFail/rugFail under it)
  var DEFAULT_MOVES = {
    strike:  { name: 'Strike',  icon: '👊' },
    privacy: { name: 'Privacy', icon: '🥷', ok: 'HIDDEN' },
    mint:    { name: 'Mint',    icon: '🖼️', ok: 'JPEG SLAP!', fail: 'ARTWORK SUCKS!' },
    rug:     { name: 'Rug',     icon: '🪤', ok: 'RUGGED!',    fail: 'RUG FAILED' }
  };

  var FINISH = {
    strike: 'HONEST WORK',
    mint: 'JPEG TO THE FACE',
    rug: 'EXIT LIQUIDITY',
    self: 'SELF-REKT',
    timeout: 'CHAIN HALTED'
  };

  // ai = how often the CPU tries each move when Super isn't ready.
  // Very high 6 · High 4 · Medium 3 · Low 2 · Rare 1 · Almost never 0.5
  var FIGHTERS = {
    toly: {
      id: 'toly', name: 'Toly', lane: 'Throughput / phone sales',
      color: '#19c6a0', emoji: '⚡',
      hide: 0.35, mint: 0.50, rug: 0.30,
      mintFail: 'FLOOR IS LATENCY', rugFail: 'OUTAGE HIT THE BRIDGE',
      ai: { strike: 4, privacy: 2, mint: 3, rug: 3 },
      super: {
        id: 'salesman', name: 'Second Best Salesman', prop: '📱',
        line: 'APPLE + SOLANA MOBILE: 3.469 BILLION',
        blurb: 'One huge hit', finish: 'HATER CONVERTED',
        cpuAfter: 'SALES GOAL OF THE YEAR ACCOMPLISHED.', // banner after the hit, CPU Toly only
        koProp: '📱' // the loser ends up holding the phone they didn't ask for
      },
      // KO line that replaces the normal finish when this fighter beats a specific rival.
      rivalKo: { saylor: 'THERE IS A SECOND BEST' }
    },
    mert: {
      id: 'mert', name: 'Mert', lane: 'Infra / every bald guy ever',
      color: '#ffc53d', emoji: '👨‍🦲',
      hide: 0.45, mint: 0.45, rug: 0.40,
      ai: { strike: 3, privacy: 3, mint: 3, rug: 3 },
      moves: {
        strike:  { name: 'Shitpost',   icon: '🗯️' },
        privacy: { name: 'Zolana',     icon: '🕶️', ok: 'EVERY BALD GUY EVER',    fail: 'VIEW KEY LEAKED' },
        mint:    { name: 'Memecoin',   icon: '🪙', ok: 'I LIKE MEMECOINS',       fail: 'SNIPED IN BLOCK ZERO' },
        rug:     { name: 'Rate Limit', icon: '⛔', ok: '429: TOO MANY REQUESTS', fail: 'STATUS PAGE: ALL GREEN' }
      },
      super: {
        id: 'helium', name: 'CEO of Helium', prop: '☀️',
        flicker: ['HELIUS', 'HELIUM', 'HIVEMAPPER'], // name card flickers through these, then locks
        line: 'THE RPCS DID THIS',
        blurb: 'Small hit + Blind (they skip their next turn)', finish: 'TRILLIONS',
        cpuAfter: 'THE PLAN IS WORKING',
        koProp: '🎈',
        skipLine: 'WHO WAS THAT' // shown over the target on the turn they skip
      }
    },
    garlinghouse: {
      id: 'garlinghouse', name: 'Garlinghouse', lane: 'Lawyers and liquidity',
      color: '#3b82f6', emoji: '⚖️',
      hide: 0.30, mint: 0.55, rug: 0.35,
      mintFail: 'UTILITY TBD', rugFail: 'SETTLEMENT PENDING',
      ai: { strike: 3, privacy: 2, mint: 4, rug: 4 },
      super: {
        id: 'xrparmy', name: 'XRP Army', prop: '👕',
        line: 'ARMY, BODY-CHECK THEM!',
        blurb: '5 hits of 5', finish: 'ARMY SETTLEMENT'
      }
    },
    vitalik: {
      id: 'vitalik', name: 'Vitalik', lane: 'Research / questionable dance moves',
      color: '#9b7bff', emoji: '🦄',
      hide: 0.55, mint: 0.35, rug: 0.20,
      mintFail: 'SOULBOUND AND ALSO UGLY', rugFail: 'PUBLIC GOODS ONLY',
      ai: { strike: 3, privacy: 3, mint: 2, rug: 2 },
      super: {
        id: 'dance', name: 'Ultra Sound Moves', prop: '🕺',
        line: "DON'T LOOK AT THE DANCE.",
        blurb: 'Small hit + Hypnotized (their next attack hits themselves)', finish: 'HYPNOTIZED'
      }
    },
    adam: {
      id: 'adam', name: 'Adam Back', lane: 'Cypherpunk grind',
      color: '#94a3b8', emoji: '🔐',
      hide: 0.70, mint: 0.15, rug: 0.10,
      mintFail: "THAT'S NOT WHAT BITCOIN IS FOR", rugFail: "CAN'T RUG A HASH",
      ai: { strike: 3, privacy: 6, mint: 0.5, rug: 0.5 },
      super: {
        id: 'opreturn', name: 'OP_RETURN', prop: '🔫',
        line: '80 BYTES. NOT ONE MORE.',
        blurb: 'Medium hit + Prune (strips their HODL)', finish: '80 BYTES OF PAIN'
      }
    },
    charles: {
      id: 'charles', name: 'Charles', lane: 'Peer review / long speeches',
      color: '#ef4444', emoji: '🤠',
      hide: 0.50, mint: 0.40, rug: 0.25,
      mintFail: 'PEER REVIEWERS HATED IT', rugFail: 'ROADMAP SAYS Q4',
      ai: { strike: 2, privacy: 3, mint: 3, rug: 2 },
      super: {
        id: 'peerreview', name: 'Peer Review', prop: '💻',
        line: 'SO, TO GIVE SOME CONTEXT, BACK IN 2015 WE—',
        blurb: 'Tiny hit + Sleep (skip next turn) + they lose 3 Blocks', finish: 'PEER REVIEWED'
      }
    },
    saylor: {
      id: 'saylor', name: 'Saylor', lane: 'Tank / orange pill',
      color: '#f7931a', emoji: '🧡',
      hide: 0.20, mint: 0.30, rug: 0.15,
      mintFail: 'THIS IS NOT DIGITAL ENERGY', rugFail: 'I DO NOT SELL',
      ai: { strike: 4, privacy: 1, mint: 2, rug: 0.5 },
      super: {
        id: 'nosecondbest', name: 'No Second Best', prop: '🐻',
        line: 'THERE IS NO SECOND BEST.',
        blurb: 'Big hit + HODL (half damage this turn and next)', finish: 'NO SECOND BEST'
      }
    }
  };

  // Super effects. dmg is per hit; hits > 1 means a multi-hit.
  var SUPERS = {
    salesman:     { dmg: 35 },
    helium:       { dmg: 8, skip: 'blind' },
    xrparmy:      { dmg: 5, hits: 5 },
    peerreview:   { dmg: 15, skip: 'sleep', drain: 3 },
    nosecondbest: { dmg: 25, hodl: 2 },
    opreturn:     { dmg: 25, prune: true },
    dance:        { dmg: 15, hypno: true }
  };

  var ROSTER = ['toly', 'mert', 'garlinghouse', 'vitalik', 'adam', 'charles', 'saylor'];

  return {
    MAX_BLOCKS: MAX_BLOCKS,
    TURN_CAP: TURN_CAP,
    RULESETS: RULESETS,
    BLOCKS: BLOCKS,
    PRIVACY_FAIL_LINES: PRIVACY_FAIL_LINES,
    DEFAULT_MOVES: DEFAULT_MOVES,
    FINISH: FINISH,
    FIGHTERS: FIGHTERS,
    SUPERS: SUPERS,
    ROSTER: ROSTER,
    DAILY_EPOCH: '2026-09-28',
    FIRST_FIGHT: { player: 'saylor', cpu: 'mert' }
  };
});
