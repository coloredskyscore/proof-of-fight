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
      hp: { default: 100 }
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
  //   nick   = small nickname shown next to the name (optional)
  //   ok     = banner when it lands (privacy: when you hide)
  //   fail   = banner when it flops (default Mint/Rug show the fighter's mintFail/rugFail under it)
  //   pierce = banner when the purple button hits someone who hid (optional)
  //   ko     = finish line when this button lands the KO (optional)
  var DEFAULT_MOVES = {
    strike:  { name: 'Strike',  icon: '👊' },
    privacy: { name: 'Privacy', icon: '🥷', ok: 'HIDDEN' },
    mint:    { name: 'Mint',    icon: '🖼️', ok: 'JPEG SLAP!', fail: 'ARTWORK SUCKS!' },
    rug:     { name: 'Rug',     icon: '🪤', ok: 'RUGGED!',    fail: 'RUG FAILED', pierce: "CAN'T HIDE FROM A RUG" }
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
      assistLine: 'CHEAP FAST CHAIN GUD', // story mode: what they shout when they jump in to help
      hide: 0.35, mint: 0.50, rug: 0.30,
      ai: { strike: 4, privacy: 2, mint: 3, rug: 3 },
      art: { head: 'art/toly-head.webp', body: 'art/toly-body.webp' }, // blazer, black cap, phone held up to sell
      moves: {
        strike:  { name: 'Comrades',    icon: '✊', ko: 'CHEAP FAST CHAIN GUD' },
        privacy: { name: 'Seed Vault',  icon: '🗝️', ok: 'SEED VAULT HAS THE KEYS', fail: 'THE PHONE IS THE SHOW' },
        mint:    { name: 'Slop Cannon', icon: '🗑️', ok: 'SLOP, KINO, SKIBIDI BOP', fail: 'NOT IN PROD' },
        rug:     { name: 'MEV Hunt',    icon: '🥪', ok: 'DRONE THE SANDWICHERS',   fail: 'OUTAGE HIT THE BRIDGE',
                   pierce: '150MS FINALITY' }
      },
      repeatLine: { mint: 'NO CHILL' }, // over him when he picks the same button two turns running
      loseLine: 'YOU GONNA GET WHAT YOU GONNA GET',
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
      assistLine: 'THE RPCS DID THIS',
      hide: 0.45, mint: 0.45, rug: 0.40,
      ai: { strike: 3, privacy: 3, mint: 3, rug: 3 },
      art: { head: 'art/mert-head.webp', body: 'art/mert-body.webp' }, // black tee, khakis, tattoo sleeve, shades on the collar
      moves: {
        strike:  { name: 'Shitpost',   icon: '🗯️' },
        privacy: { name: 'Zolana',     icon: '🕶️', ok: 'EVERY BALD GUY EVER',    fail: 'VIEW KEY LEAKED' },
        mint:    { name: 'Memecoin',   icon: '🪙', ok: 'I LIKE MEMECOINS',       fail: 'SNIPED IN BLOCK ZERO' },
        rug:     { name: 'Rate Limit', icon: '⛔', ok: '429: TOO MANY REQUESTS', fail: 'STATUS PAGE: ALL GREEN',
                   pierce: "CAN'T HIDE FROM A RATE LIMIT" }
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
      id: 'garlinghouse', name: 'Garlinghouse', lane: 'Settlements / straight man',
      color: '#3b82f6', emoji: '⚖️',
      assistLine: 'WE WILL PREVAIL',
      hide: 0.25, mint: 0.55, rug: 0.20, // a settlements guy: bad at hiding, bad at rugs
      ai: { strike: 3, privacy: 2, mint: 4, rug: 4 },
      art: { head: 'art/garlinghouse-head.webp', body: 'art/garlinghouse-body.webp' }, // navy suit, beat-up briefcase
      moves: {
        strike:  { name: 'Settle',      icon: '💸', ko: "PERFECT CAN'T BE THE ENEMY OF GOOD" },
        privacy: { name: 'In The Room', icon: '🏛️', ok: 'PROUD TO BE IN THE ROOM', fail: 'BLOCKED BY THE ANTI-CRYPTO ARMY' },
        mint:    { name: 'RLUSD',       icon: '💵', ok: "YOU'LL HEAR IT FROM RIPPLE FIRST", fail: 'UTILITY TBD' },
        rug:     { name: 'Lawsuit',     icon: '⚖️', ok: 'WE WILL PREVAIL', fail: "I'M NOT SURPRISED. I'M PISSED.",
                   pierce: "CAN'T HIDE FROM A SUBPOENA" }
      },
      loseLine: 'THIS ONE STINGS', // his quote on the result card (and over him on stage) when he loses
      super: {
        // The crowd is the meme: price calls come from the army, never from him.
        id: 'xrparmy', name: 'XRP Army', prop: '😅',
        line: 'RIPPLE 3, SEC 0',
        timing: { card: 0.15, line: 0.6, dur: 3.2 },
        blurb: '5 hits of 5', finish: 'WE WON. THEY LOST.',
        cpuAfter: 'HOW ARE PEOPLE STILL FIGHTING THIS?!'
      }
    },
    vitalik: {
      id: 'vitalik', name: 'Vitalik', lane: 'Research / the badger dance',
      color: '#9b7bff', emoji: '🦄',
      assistLine: 'THERE IS ONLY LOVE',
      hide: 0.55, mint: 0.35, rug: 0.20,
      ai: { strike: 3, privacy: 3, mint: 2, rug: 2 },
      // Art: head = round portrait (title, picker, cut-in, result card), body = stage sprite facing
      // right. Fighters without art keep their emoji and block body.
      art: { head: 'art/vitalik-head.webp', body: 'art/vitalik-body.webp' },
      heldProp: '🍵', // green tea in his hand on the block body ("mi pinxe lo crino tcati"); his sprite has its own
      moves: {
        strike:  { name: 'Essay Drop',   icon: '📝', ko: 'READ THE BLOG POST' },
        privacy: { name: 'Privacy Pool', icon: '🫥', ok: 'FIGHT CHAT CONTROL', fail: 'I CHOOSE BALANCE',
                   okSub: 'You cannot make society secure by making people insecure' },
        mint:    { name: 'Soulbound',    icon: '🧸', ok: 'NON-TRANSFERABLE',  fail: 'SOULBOUND AND ALSO UGLY' },
        rug:     { name: 'Public Goods', icon: '🌱', ok: 'QUADRATIC FUNDING', fail: 'UNDERFUNDED' }
      },
      dodgeLine: 'SOUNDPROOF WALL', // the hit did not travel
      super: {
        // The badger dance: a green screen of badgers and a stage of people, arms straight out, flapping in sync.
        id: 'dance', name: 'Badger Dance', prop: '🕺',
        line: "DON'T LOOK AT THE DANCE.",
        blurb: 'Small hit + Hypnotized (their next attack hits themselves)', finish: 'THERE IS ONLY LOVE',
        cpuAfter: 'MILADY IS BACK',
        koProp: '🎀',                           // the loser ends up in the Milady PFP
        selfHitLine: 'DEFENSIVE ACCELERATION'   // when someone he hypnotized hits themselves (d/acc)
      }
    },
    adam: {
      id: 'adam', name: 'Adam Back', lane: 'Cypherpunk / hashcash',
      color: '#94a3b8', emoji: '🔐',
      assistLine: 'FORK AROUND AND FIND OUT',
      hide: 0.70, mint: 0.15, rug: 0.10,
      ai: { strike: 3, privacy: 6, mint: 0.5, rug: 0.5 },
      art: { head: 'art/adam-head.webp', body: 'art/adam-body.webp' }, // orange cap backwards, wire glasses, pickaxe
      moves: {
        strike:  { name: 'Hashcash',    icon: '⛏️', ko: 'GAME OVER' },
        privacy: { name: 'Cypherpunk',  icon: '🧅', ok: 'PRIORITIZE 1',        fail: 'FILTERED BY KNOTS' },
        mint:    { name: 'Inscription', icon: '🖼️', ok: 'FEES ARE THE FILTER', fail: "THAT'S NOT WHAT BITCOIN IS FOR" },
        rug:     { name: 'Soft Fork',   icon: '🍴', ok: 'THE LAST SOFT-FORK',  fail: 'NOT BY POPULAR VOTE',
                   pierce: "CAN'T HIDE FROM CONSENSUS" }
      },
      super: {
        // The gun and its data blob are the picture, not a stance (he backed lifting the 80-byte limit).
        id: 'opreturn', name: 'OP_RETURN', prop: '🔫',
        line: 'FORK AROUND AND FIND OUT',
        blurb: 'Medium hit + Prune (strips their HODL)', finish: 'CHECKMATE FORKERS',
        cpuAfter: 'SIT BY THE MEMPOOL LONG ENOUGH',
        pruneLine: 'SALTY TEARS', // banner when the gun strips someone's HODL
        koProp: '🧂'             // the salty tears of failed contentious fork proposers
      }
    },
    charles: {
      id: 'charles', name: 'Charles', lane: 'Midnight / Dire Wolf Mode',
      color: '#ef4444', emoji: '🤠',
      assistLine: 'BIGGER THAN ZCASH',
      hide: 0.55, mint: 0.40, rug: 0.25,
      ai: { strike: 2, privacy: 3, mint: 3, rug: 2 },
      art: { head: 'art/charles-head.webp', body: 'art/charles-body.webp' }, // cowboy hat, blue plaid, the grin, a stack of papers
      moves: {
        strike:  { name: 'Glacier Drop', icon: '🧊', ko: 'BANK THE UNBANKED' },
        privacy: { name: 'ZK Proof',     icon: '🔏', ok: 'SELECTIVE DISCLOSURE', fail: 'WELCOME TO FUD LAND' },
        mint:    { name: 'Peer Review',  icon: '📜', ok: 'PEER REVIEWED',        fail: 'REVISE AND RESUBMIT' },
        rug:     { name: 'Leios',        icon: '✨', ok: 'THE MAGIC OF LEIOS',   fail: 'ROADMAP SAYS Q4' }
      },
      dodgeLine: 'I AM NOT ACCOUNTABLE', // when an attack misses him because he hid
      super: {
        id: 'midnight', name: 'Midnight Express', prop: '🐺',
        // His nearly-four-hour video: the captions type out at reading speed (one entry per line), then
        // the lights go out mid-word. The cut-in's pacing is worked out from these lines.
        lecture: ['SO, TO GIVE SOME CONTEXT,', 'BACK IN 2015 WE—'],
        video: { title: 'SURPRISE AMA', time: '0:07 / 3:47:12' },
        line: 'BIGGER THAN ZCASH',
        blurb: 'Hit + Sleep (skip next turn) + they lose 3 Blocks', finish: 'LFG 2027',
        cpuAfter: "I'M HERE TO STAY",
        skipLine: 'DEAL WITH IT.'
      },
      rivalKo: { mert: 'BIGGER THAN ZOLANA' }
    },
    saylor: {
      id: 'saylor', name: 'Saylor', lane: 'Tank / preferred stock',
      color: '#f7931a', emoji: '🧡',
      assistLine: 'WE CALL THEM POOR',
      hide: 0, mint: 0.45, rug: 0.25,
      // His blue button never hides: it always works and halves incoming Strike/Mint/Rug damage.
      brace: { blocks: 1 },
      // Damage that differs from the shared rules (Strike stays 10 like everyone).
      // [min, max] rolls each time it lands: MSTR is high beta.
      dmg: { mint: 20, rug: [15, 45] },
      ai: { strike: 4, privacy: 2, mint: 3, rug: 1 },
      art: { head: 'art/saylor-head.webp', body: 'art/saylor-body.webp' }, // charcoal suit, orange tie, plain orange shield (STRF)
      moves: {
        strike:  { name: 'STRC', nick: 'Stretch', icon: '📬', ko: 'STRETCH' },
        privacy: { name: 'STRF', nick: 'Strife',  icon: '🛡️', ok: 'SENIOR CLAIM' },
        mint:    { name: 'STRK', nick: 'Strike',  icon: '🔄', ok: 'CONVERTED',      fail: 'STILL PREFERRED' },
        rug:     { name: 'MSTR', nick: 'Strategy', icon: '📈', ok: 'INFINITE MONEY GLITCH', fail: 'mNAV BELOW 1',
                   ko: 'NUMBER GO UP', ticker: 'MSTR' } // ticker: shows MSTR ▲ / ▼ when it lands or flops
      },
      super: {
        id: 'orangedot', name: 'Another Orange Dot', prop: '🟠',
        line: 'A LITTLE MORE ORANGE',
        blurb: 'Big hit + HODL (half damage this turn and next)', finish: 'WE CALL THEM POOR',
        cpuAfter: 'THE NEXT DOT IS THE IMPORTANT ONE',
        koProp: '💵',          // the loser is left holding fiat
        koScene: 'astronaut'   // Super KO plays the astronaut DJ: FIAT AS A STORE OF VALUE / WE CALL THEM POOR
      },
      rivalKo: { toly: 'THERE IS NO SECOND BEST', schiff: 'THERE IS NO SECOND BEST' }
    },
    sergey: {
      id: 'sergey', name: 'Sergey', lane: 'Oracles / the shirt',
      color: '#375bd2', emoji: '🔗',
      assistLine: '$34 TRILLION',
      hide: 0.30, mint: 0.50, rug: 0.15, // bad at rugs and price calls; half his bank pilots go live
      // His blue button never hides. When it works (the hide odds), the shirt's pattern holds them:
      // they lose their next turn.
      stun: true,
      ai: { strike: 4, privacy: 3, mint: 3, rug: 1 },
      art: { head: 'art/sergey-head.webp', body: 'art/sergey-body.webp' }, // blue plaid, lanyard with a blank badge, jeans
      moves: {
        strike:  { name: 'CCIP',       icon: '📡', ko: 'THE DATA ARRIVED' },
        privacy: { name: 'The Shirt',  icon: '👕', ok: 'THE PATTERN MOVES', fail: "IT'S NOT ABOUT FASHION",
                   skipLine: 'LOST IN THE PATTERN' }, // over them on the turn they lose
        mint:    { name: 'Bank Pilot', icon: '🏦', ok: 'LIVE AT SIBOS',     fail: 'STILL A PILOT' },
        rug:     { name: 'Next $600T', icon: '💰', ok: 'THE NEXT $600 TRILLION', fail: 'NO PRICE CALLS',
                   pierce: "CAN'T HIDE FROM AN ORACLE" }
      },
      loseLine: 'SEE YOU AT SIBOS',
      dailyFrom: '2026-10-12', // joins the Daily Fight draw on this day (so no daily already started changes)
      super: {
        // The crowd is the meme, like the XRP Army: price targets come from the Marines, never from him.
        id: 'linkmarines', name: 'Link Marines', prop: '🪖',
        doubt: "THE TOKEN ISN'T NEEDED", // the target says it first, then the flannel crowd charges
        line: '$34 TRILLION',
        timing: { card: 0.15, line: 1.1, dur: 3.4 },
        blurb: '4 hits of 6 + they lose 3 Blocks', finish: 'THE TOKEN IS NEEDED',
        cpuAfter: 'STAY POOR',
        koProp: '👕' // the loser ends up in the flannel
      },
      rivalKo: { garlinghouse: 'THE MARINES OUTRANK THE ARMY' }
    },
    cz: {
      id: 'cz', name: 'CZ', lane: 'Exchange / ignore FUD',
      color: '#f0b90b', emoji: '4️⃣',
      assistLine: 'FUNDS ARE SAFU',
      hide: 0, mint: 0.45, rug: 0.25,
      // His blue button never hides. Like Saylor's STRF it always works, but stronger: red and pink do
      // nothing to him that turn (ignoreLine pops over him), purple does half.
      brace: { blocks: 1, ignore: ['strike', 'mint'], ignoreLine: '4.' },
      ai: { strike: 3, privacy: 3, mint: 3, rug: 1 },
      art: { head: 'art/cz-head.webp', body: 'art/cz-body.webp' }, // black hoodie, rimless glasses, four fingers up
      moves: {
        strike:  { name: 'SAFU',       icon: '🔐', ko: 'FUNDS ARE SAFU' },
        privacy: { name: 'Ignore FUD', icon: '4️⃣', ok: 'IGNORE FUD' },
        mint:    { name: 'Top 4 List', icon: '📋', ok: '1, 2, 3, 4.',  fail: 'ONLY GOT TO 3' },
        rug:     { name: 'Da Moon',    icon: '🛥️', ok: 'TO DA MOON',  fail: 'STILL DOCKED' } // his yacht's real name
      },
      loseLine: 'BACK TO GIGGLE ACADEMY',
      rivalKo: { schiff: 'TRUST ME BRO' }, // what he called tokenized gold before their Dec 2025 debate
      dailyFrom: '2026-10-12',
      super: {
        // His 2023 New Year post, item 4: ignore FUD, fake news, attacks. The white Nissan SUV is from a 2026
        // New York Times ride-along ("My Lamborghini").
        id: 'four', name: '4', prop: '4️⃣',
        line: 'IGNORE FUD, FAKE NEWS, ATTACKS',
        timing: { card: 0.15, line: 2.2, dur: 3.4 },
        blurb: 'Hit + FUD-proof (red, pink and purple can\'t hurt him this turn and next)', finish: '4 MONTHS',
        cpuAfter: 'BRUH… FUD. 4.'
      }
    },
    adeniyi: {
      id: 'adeniyi', name: 'Adeniyi', lane: 'Agentic finance / hype man',
      color: '#38bdf8', emoji: '🌊',
      assistLine: 'YOU HAVE NO IDEA HOW FAST',
      hide: 0.40, mint: 0.45, rug: 0.25,
      // Walrus: a hit he dodges is stored, and comes back added to his next hit that lands.
      walrus: { line: 'MEMWAL REMEMBERS' },
      ai: { strike: 3, privacy: 2, mint: 4, rug: 3 },
      art: { head: 'art/adeniyi-head.webp', body: 'art/adeniyi-body.webp' }, // sky-blue track jacket, glasses, a ball of water
      moves: {
        strike:  { name: 'Zero Fee',    icon: '🆓', ko: 'NO FEE. STILL HITS.' },
        privacy: { name: 'Walrus',      icon: '🦭', ok: 'STORED ON WALRUS', fail: 'MEMORY WIPED' },
        mint:    { name: 'YOLO',        icon: '🎲', ok: 'ALL GOOD THINGS COME TO THOSE WHO… YOLO', fail: '…WAIT' },
        rug:     { name: 'Agents 24/7', icon: '🤖', ok: 'AGENTS NEVER SLEEP', fail: 'THE AGENT HALLUCINATED',
                   pierce: 'MACHINE SPEED' }
      },
      loseLine: 'SEE YOU IN CYCLE 2',
      dailyFrom: '2026-10-12',
      super: {
        // Sui means water: a wave carrying a swarm of little agents, multi-hit and loud.
        id: 'agentswarm', name: 'Agent Swarm', prop: '🤖',
        line: 'YOU HAVE NO IDEA HOW FAST',
        timing: { card: 0.15, line: 1.0, dur: 3.2 },
        blurb: '8 hits of 4', finish: 'MATERIALISED.',
        cpuAfter: 'THE YETI IS ON A TEAR'
      }
    }
  };

  // ---------- Story mode bosses ----------
  // Same shape as a fighter, plus `boss`. They only fight in Story (never in Free play or the Daily Fight).
  //   boss.hp         their HP (fighters have 100)
  //   boss.stage      the background: bg (an image, once it's made) or sky/floor colors until then
  //   boss.music      their song in js/audio.js MUSIC (the fight song plays until it exists)
  //   boss.allyLines  what a particular ally shouts when they jump in against this boss
  var BOSSES = {
    schiff: {
      id: 'schiff', name: 'Peter Schiff', lane: 'Gold bug / boss 1',
      color: '#c9a227', emoji: '🪙',
      hide: 0.25, mint: 0.40, rug: 0.20,
      art: { head: 'art/schiff-head.webp', body: 'art/schiff-body.webp' }, // charcoal suit, gold tie, a gold bar
      ai: { strike: 4, privacy: 2, mint: 3, rug: 2 },
      moves: {
        strike:  { name: 'Fake Asset', icon: '🫥', ko: 'BACKED BY NOTHING' },
        privacy: { name: 'The Vault',  icon: '🔒', ok: 'ALLOCATED. VAULTED.', fail: 'MY WALLET WAS CORRUPTED' }, // Jan 2021
        mint:    { name: '$10K Call',  icon: '📉', ok: 'BITCOIN TO $10,000',  fail: 'NEW ALL-TIME HIGH' },
        rug:     { name: 'Gold Bar',   icon: '🧈', ok: 'HEAVY METAL',         fail: 'IT WAS TUNGSTEN',
                   pierce: 'PHYSICAL DELIVERY' }
      },
      loseLine: 'I COULD HAVE MADE A LOT OF MONEY', // his own words about Bitcoin, 2026
      rivalKo: { saylor: 'NO MORE STRC' },
      super: {
        // Gold bars rain down. The line is the catchphrase.
        id: 'goldrush', name: 'Gold Rush', prop: '', // his portrait already holds the gold bar
        line: 'BUY GOLD',
        blurb: '4 hits of 7', finish: 'TOLD YOU SO',
        cpuAfter: "STILL THINK IT'S DIGITAL GOLD?"
      },
      boss: {
        hp: 110,
        music: 'schiff',
        stage: { name: 'The Gold Vault', bg: 'art/stages/schiff.webp', sky: 'linear-gradient(#1b1408 0%, #4a3510 50%, #8a6420 78%, #c9a227 82%)', floor: 'linear-gradient(#3b2c12, #140e05)' },
        allyLines: { saylor: 'THERE IS NO SECOND BEST', cz: 'TRUST ME BRO' }
      }
    },
    dimon: {
      id: 'dimon', name: 'Jamie Dimon', lane: 'Banker / boss 2',
      color: '#2b4c8c', emoji: '🪨',
      hide: 0.30, mint: 0.40, rug: 0.20,
      ai: { strike: 3, privacy: 2, mint: 3, rug: 3 },
      art: { head: 'art/dimon-head.webp', body: 'art/dimon-body.webp' }, // navy suit, light blue shirt, the pet rock
      // Too big to fail: the first time he's knocked out he's bailed out with this much HP. The sub is the
      // headline Satoshi put in Bitcoin's first block.
      bailout: { hp: 20, line: 'TOO BIG TO FAIL', sub: 'Chancellor on brink of second bailout for banks' },
      moves: {
        strike:  { name: 'Fraud',        icon: '🚨', ko: 'HYPED-UP FRAUD' },                       // Davos, Jan 2024
        privacy: { name: 'Fortress',     icon: '🏰', ok: 'FORTRESS BALANCE SHEET', fail: 'LONDON WHALE' },
        mint:    { name: 'JPM Coin',     icon: '🏦', ok: "IT'S DIFFERENT WHEN WE DO IT", fail: 'COMPLIANCE SAYS NO' },
        rug:     { name: 'Shut It Down', icon: '🚫', ok: "IF I WAS THE GOVERNMENT, I'D CLOSE IT DOWN", // Senate, Dec 2023
                   fail: 'I DEFEND YOUR RIGHT TO BUY BITCOIN', pierce: 'YOUR ACCOUNT IS CLOSED' }
      },
      loseLine: 'WE ACCEPT IT AS COLLATERAL NOW', // JPMorgan, Oct 2025
      super: {
        // A giant pet rock with googly eyes rolls in. His words, Davos 2024.
        id: 'petrock', name: 'Pet Rock', prop: '',
        line: 'I CALL IT THE PET ROCK',
        blurb: 'One huge hit', finish: 'PET ROCKED',
        cpuAfter: 'DECENTRALIZED PONZI SCHEME' // to Congress, 2022
      },
      boss: {
        hp: 100,             // plus the 20 of his bailout
        music: 'dimon',
        stage: { name: 'The Bank', bg: 'art/stages/dimon.webp', sky: 'linear-gradient(#0c1222 0%, #1d2a44 55%, #3b4660 78%, #6b7280 82%)', floor: 'linear-gradient(#3a3f4b, #15171d)' },
        allyLines: { adam: 'CHANCELLOR ON BRINK OF SECOND BAILOUT', garlinghouse: 'HOW ARE PEOPLE STILL FIGHTING THIS?!' }
      }
    }
  };
  // The engine and the screens look everyone up in FIGHTERS; ROSTER (below) keeps bosses out of Free play.
  Object.keys(BOSSES).forEach(function (id) { FIGHTERS[id] = BOSSES[id]; });

  // Super effects. dmg is per hit; hits > 1 means a multi-hit.
  var SUPERS = {
    salesman:     { dmg: 35 },
    helium:       { dmg: 8, skip: 'blind' },
    xrparmy:      { dmg: 5, hits: 5 },
    midnight:     { dmg: 15, skip: 'sleep', drain: 3 },
    orangedot:    { dmg: 25, hodl: 2 },
    opreturn:     { dmg: 25, prune: true },
    dance:        { dmg: 15, hypno: true },
    linkmarines:  { dmg: 6, hits: 4, drain: 3 },
    four:         { dmg: 20, shield: 2 },   // shield: red, pink and purple do nothing to him this turn and next
    agentswarm:   { dmg: 4, hits: 8 },
    goldrush:     { dmg: 7, hits: 4 },    // Schiff (story boss)
    petrock:      { dmg: 25 }             // Dimon (story boss)
  };

  // Story mode: pick a founder, beat the bosses in order. The other founders are your assists, and
  // Satoshi picks you up once per run. A rung whose boss isn't in BOSSES yet shows as coming soon.
  var STORY = {
    assistDmg: 20,      // the ally's hit: can't be dodged, braced or halved
    assistAt: 0.35,     // the ASSIST button lights up at this share of your HP or lower, once per fight
    reviveHp: 0.5,      // Satoshi brings you back with this share of your HP, once per run
    continueSecs: 10,
    ladder: [
      { id: 'schiff', name: 'Peter Schiff', emoji: '🪙', stage: 'The Gold Vault' },
      { id: 'dimon', name: 'Jamie Dimon', emoji: '🪨', stage: 'The Bank' },
      { id: 'warren', name: 'Elizabeth Warren', emoji: '📋', stage: 'The Hearing' },
      { id: 'sbf', name: 'Sam Bankman-Fried', emoji: '🚗', stage: 'The Yard' },
      { id: 'wick', name: 'WICK', emoji: '🕯️', stage: 'The Chart' }
    ],
    satoshi: {
      // Sliced steel and a gold glow (tools/art.py glow). The sprite floats down for the revive; the portrait
      // is the ending. Without art he's drawn in SVG.
      art: { sprite: 'art/satoshi-sprite.webp', portrait: 'art/satoshi.webp' },
      revive: ['STAND UP.', "WE'RE ALL COUNTING ON YOU."],
      vanish: "I'VE MOVED ON TO OTHER THINGS.",   // his last known message, 2011
      ending: ['IT WAS NEVER THE BANKERS.', 'IT WAS THE 100X.']
    }
  };

  var ROSTER = ['toly', 'mert', 'garlinghouse', 'vitalik', 'adam', 'charles', 'saylor', 'sergey', 'cz', 'adeniyi'];

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
    BOSSES: BOSSES,
    STORY: STORY,
    DAILY_EPOCH: '2026-09-28',
    FIRST_FIGHT: { player: 'saylor', cpu: 'mert' }
  };
});
