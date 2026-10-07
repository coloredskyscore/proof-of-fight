# Adeniyi kit — Agent Swarm

**Fighter:** Adeniyi (`adeniyi`)
**Status:** Built Oct 7, 2026. New fighter: buttons, Super, art and sounds.

## Concept (Grok's research, as provided)

He is a hype man, and the hype is specific. August 20, 2026 he wrote the whole thesis: agents will transact 24/7, at machine speed, and they need a financial system. "Sui will become THE infrastructure for agentic finance." September 29: "you have no idea how fast agentic finance is going to materialise." Walrus is the memory layer. MemWal is long-term memory for agents. Basecamp is "cycle 2."

The one-liners are better than the essays. "All good things come to those who… YOLO." "The Yeti is on a tear." Sui means water, so the wave is the right picture, but the payload is the swarm, not a splash.

| Bit | Slot |
|---|---|
| Agent swarm | Super. A wave of little agents, not a lecture. |
| YOU HAVE NO IDEA HOW FAST | Slam line |
| YOLO | KO |
| WALRUS | Stores the hit. Next turn he remembers it. |
| THE YETI IS ON A TEAR | CPU after |
| Free stablecoin transfer | Strike. No fee, still hits. |

Do not give him a Sleep Super. Charles already talks them to sleep. Adeniyi should be multi-hit and loud.

---

## Build notes (Oct 7, 2026): what's in the game

**Buttons:**

| Button | Name | Lands | Flops |
|---|---|---|---|
| 🔴 Red (reliable hit, 10 dmg) | 🆓 Zero Fee | KO: `NO FEE. STILL HITS.` | can't fail |
| 🔵 Blue (dodge, 40%) | 🦭 Walrus | `STORED ON WALRUS` | `MEMORY WIPED` |
| 🩷 Pink (medium gamble, 24 dmg, 45%) | 🎲 YOLO | `ALL GOOD THINGS COME TO THOSE WHO… YOLO` | `…WAIT` |
| 🟣 Purple (big gamble, 36 dmg, 25%) | 🤖 Agents 24/7 | `AGENTS NEVER SLEEP` · through a dodge: `MACHINE SPEED` | `THE AGENT HALLUCINATED` |

**Walrus remembers.** When a hit misses him because he hid, its damage is stored (🦭 +10 for a red, +24 for a pink, shown on his HUD). His next hit that lands carries it as bonus damage: `MEMWAL REMEMBERS / +10 damage from Walrus`. He keeps the bigger of two stored hits, so the bonus is at most 24.

**Super: Agent Swarm** (8 hits of 4 = 32). A water wave rolls across the bottom of the screen with a row of little agents riding the crest; each hit is a splash. Line: `YOU HAVE NO IDEA HOW FAST`.

**Other moments:**
- Super KO: `MATERIALISED.` (his spelling)
- After CPU Adeniyi's Super, if you're still standing: `THE YETI IS ON A TEAR`
- When he loses: `SEE YOU IN CYCLE 2`

**Where Grok's lines went:** YOLO is his pink button rather than the KO, because "…WAIT" is the perfect flop line; the Super KO uses `MATERIALISED.` from the same post as the slam line.

**Changed from the draft:** purple went from 35% to 25% and YOLO from 50% to 45%. With both gambles that good, plus Walrus, CPU Adeniyi was the hardest opponent in the game (players won only 36–58%). Now a sensible player wins 72% as him, and players beat him as the CPU about 57% of the time, close to Toly and CZ.

**Daily Fight:** he joins the daily draw on Oct 12, 2026 (`dailyFrom`), with Sergey and CZ.

**Where it lives:** `js/data.js` (`adeniyi`, `SUPERS.agentswarm`), Walrus in `js/engine.js` (`doAttack`), the cut-in in `js/app.js` (`swarmDeco`) and `css/style.css` (search "Adeniyi:").

## Art (Oct 7, 2026)

A late-90s arcade portrait (bald, short beard, square black glasses, a knowing half-grin, pointing at you, sky-blue track jacket over a black tee) and a 16-bit sprite in the same outfit with a swirling ball of water over his open hand. The first draft's megaphone and shouting face were dropped: the hype is in the attitude. Prompts and commands: [docs/art/README.md](../art/README.md).
