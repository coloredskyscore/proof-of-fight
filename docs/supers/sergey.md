# Sergey kit — Link Marines

**Fighter:** Sergey (`sergey`)
**Status:** Built Oct 4, 2026. New fighter: buttons, Super, art and sounds.

## Concept (Grok's research, as provided)

He does not meme. The community does it for him, same shape as Garlinghouse and the XRP Army.

Link Marines are a real crowd, with ranks, and they call him five-star general. The blue flannel is a documented running joke: same shirt, years of conferences. Your hypnotize idea is the right use of it. He does not take the shirt off. The pattern starts moving. Opponent loses the turn.

His actual posts are Sibos, DTCC, CCIP 2.0, "the next $600 trillion," and the Chainlink bio line "$34+ trillion enabled." The old attack, that the token is not needed, is still the thing the Marines show up to answer. Put that in the opponent's mouth. His reply is the marines, not a rebuttal.

| Bit | Slot |
|---|---|
| Link Marines | Super. Crowd, like XRP Army, but in flannel. |
| THE SHIRT | Privacy. Hypnotize. He does not hide. The pattern does. |
| $34 TRILLION | Slam. A number, not a speech. |
| THE TOKEN IS NEEDED | KO, answering the old critique |
| CCIP | Strike. The data arrives, then the hit. |
| IT'S NOT ABOUT FASHION | Fail line if the shirt whiffs |

He should be bad at rugs and bad at price calls. The Marines bring the price. He is on stage with a bank, wearing the same shirt.

---

## Build notes (Oct 4, 2026): what's in the game

**Buttons:**

| Button | Name | Lands | Flops |
|---|---|---|---|
| 🔴 Red (reliable hit, 10 dmg) | 📡 CCIP | a data chirp, then the punch · KO: `THE DATA ARRIVED` | can't fail |
| 🔵 Blue (stun, 30%) | 👕 The Shirt | `THE PATTERN MOVES`: they lose their next turn (`LOST IN THE PATTERN` over them) | `IT'S NOT ABOUT FASHION` |
| 🩷 Pink (medium gamble, 24 dmg, 50%) | 🏦 Bank Pilot | `LIVE AT SIBOS` | `STILL A PILOT` |
| 🟣 Purple (big gamble, 36 dmg, 15%) | 💰 Next $600T | `THE NEXT $600 TRILLION` · through a dodge: `CAN'T HIDE FROM AN ORACLE` | `NO PRICE CALLS` |

**The Shirt is a new kind of blue button.** He never hides, so whatever they throw this turn still lands. When it works (30%), the pattern holds them and they lose their **next** turn: a 👀 STARING chip and bubble, then `LOST IN THE PATTERN` on the turn they skip. Blocks work like a dodge (+3 when it works, +1 when it doesn't). Against the player the turn note reads "You can't stop STARING at the shirt. You skip this turn."

**Super: Link Marines** (4 hits × 6 + they lose 3 Blocks). The target appears first, saying `THE TOKEN ISN'T NEEDED`. Sergey doesn't answer: a column of Marines in helmets and blue flannel charges across and tramples the bubble, one carrying a `$1,000 EOY` sign (the price call stays with the crowd, like Garlinghouse's army). Sergey's line: `$34 TRILLION`. Cut-in runs 3.4s. Each hit is a stomp.

**Other moments:**
- Super KO: `THE TOKEN IS NEEDED`
- After CPU Sergey's Super, if you're still standing: `STAY POOR` (the old Link Marine meme)
- When he loses: `SEE YOU AT SIBOS`
- Rival KO: Sergey beating Garlinghouse, any way, reads `THE MARINES OUTRANK THE ARMY`
- KO prop: the loser ends up in the flannel 👕

**Changed from the draft:**
- Bank Pilot went from 45% to 50% (below).
- The Marines make the target **lose** 3 Blocks instead of stealing them. Stealing would refill Sergey's meter right after his Super; losing them is the same hit to the opponent without that.

**Balance:** with Bank Pilot at 45% a sensible player won only 61% as Sergey, the lowest on the roster. At 50% he's at 66%, mid-pack (Vitalik 64, Garlinghouse 68, Charles 69). As the CPU, players beat him 59–81% depending on who they pick, in line with the others.

**Daily Fight:** he joins the daily draw on **Oct 12, 2026** (`dailyFrom` in `js/data.js`), so shipping him doesn't change a day's matchup halfway through. He's in Free play right away. A daily you started also now remembers its matchup and won't resume into a different one.

**Where it lives:** `js/data.js` (`sergey`, `SUPERS.linkmarines`), the stun in `js/engine.js` (Privacy step), the cut-in in `js/app.js` (`marinesDeco`) and `css/style.css` (search "Link Marines").

## Art (Oct 4, 2026)

A late-90s arcade portrait (short brown hair, full beard, deadpan side-eye, blue-and-white plaid, red lanyard with a blank badge) and a 16-bit sprite (same shirt, blank badge, dark jeans, black shoes, fists up). Grok drew the sprite's plaid gray, so the cut-out tool tints the shirt's grays to the portrait's blue (`--tint`). Prompts and commands: [docs/art/README.md](../art/README.md).
