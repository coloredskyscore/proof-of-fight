# Saylor kit — tickers

**Fighter:** Saylor (`saylor`)  
**Super (locked):** Another Orange Dot  
**Panel:** STRC, STRF, STRK, STRD, then the Super. No Privacy. No Mint. No Rug.

Product names, so the buttons are not random:

- **STRC** Stretch. Variable, paid monthly, built to sit near $100. The one he actually scales. Workhorse.
- **STRF** Strife. Senior preferred. 10% fixed. First in line. The brace.
- **STRK** Strike. Only convertible one (into a slice of MSTR). The gamble that can turn into equity.
- **STRD** Stride. Junior. 10%, and non-cumulative: if the payment is missed, it is gone. The risky button.

STRE exists. Leave it off the panel. Four is enough.

---

## The five buttons

| Button | Slot | What it does | Odds |
|---|---|---|---|
| **STRC** | Strike | Always hits. The monthly check. 12 damage, +2 Blocks. | 100% |
| **STRF** | Privacy | Senior claim. Not a hide. Incoming damage halved this turn. +3 Blocks. | Always works |
| **STRK** | Mint | Convertible. Lands and it converts into a bigger hit. | 45% |
| **STRD** | Rug | Junior, non-cumulative. Steals if it clears. Forfeits if it doesn't. | 25% |
| **Another Orange Dot** | Super | 28 damage + HODL 2 turns. Costs 10 Blocks. | 100% at 10 |

---

## STRC — Stretch

The button he presses most. Recent filings are “acquired BTC and repurchased STRC.”

- Hit: 12 damage, +2 Blocks.
- Banner, only on KO: `STRETCH`
- Never fails.

## STRF — Strife

Replaces Privacy. Senior in the stack, so it eats the hit.

- Incoming damage this turn halved.
- +3 Blocks.
- Does not stop a Super.
- Banner: `SENIOR CLAIM`
- No fail line.

## STRK — Strike

Replaces Mint. The convertible. Success means it turned into common.

- Success: 20 damage, +2 Blocks. Banner: `CONVERTED`
- Fail: 0 damage, +1 Block. Banner: `STILL PREFERRED`
- 45%.

## STRD — Stride

Replaces Rug. Non-cumulative on purpose. Miss the payment, the yield is gone.

- Success: 22 damage, steal 2 Blocks. Banner: `STRIDE CLEARED`
- Fail: lose 2 Blocks. Banner: `DIVIDEND FORFEITED`
- 25%.

## Another Orange Dot

Unchanged mechanically. The clip lives here.

- 28 damage, then HODL (half damage, 2 turns).
- Voice on the slam: `A LITTLE MORE ORANGE`
- KO banner: `WE CALL THEM POOR`
- vs Toly, replaces the KO: `THERE IS NO SECOND BEST`
- CPU after: `THE NEXT DOT IS THE IMPORTANT ONE`

### The clip

Cutscene beat, after the last orange dot stamps:

A cheap astronaut suit and DJ headphones drop in behind him. Not a licensed video. One line, big text:

`FIAT AS A STORE OF VALUE`  
`WE CALL THEM POOR`

That is the whole meme. No second verse. On the result card the loser is holding fiat, and the astronaut is in the background with the headphones still on.

---

## CPU

High STRC. STRF when he is about to be hit. STRK often. STRD rarely. Super the moment the bar is full.

---

## One-line lock

Saylor’s buttons are **STRC**, **STRF**, **STRK**, **STRD**, **Another Orange Dot**. Senior braces, convertible gambles, junior forfeits. The astronaut says `WE CALL THEM POOR` on the KO.

---

## Build notes (Oct 1, 2026): what's in the game

Added when this was built into the game. Everything above is the original concept, unedited.

**Rebalanced before building.** As written, the simulator had Saylor winning 91% of fights, pressing only STRF winning 79% (STRF never fails and +3 Blocks a turn let him hide behind it and fire a Super every third turn), and CPU Saylor beating players 62% of the time. What's in the game:

| Button | Concept above | In the game |
|---|---|---|
| 📬 STRC (red) | 12 dmg, always | **10 dmg**, always (same as everyone's red). KO line `STRETCH`. |
| 🛡️ STRF (blue) | Always works, halves damage, +3 Blocks | Always works, halves Strike/Mint/Rug damage, **+1 Block**. Banner `SENIOR CLAIM`. Doesn't stack with HODL, doesn't touch Supers. |
| 🔄 STRK (pink) | 20 dmg, 45% | same. `CONVERTED` / `STILL PREFERRED` |
| 🎲 STRD (purple) | 22 dmg, 25%, steals 2 | **30 dmg**, 25%, steals 2, hits through dodges like every purple button. `STRIDE CLEARED` / `DIVIDEND FORFEITED` |
| 🟠 Another Orange Dot | 28 dmg + HODL | **25 dmg** + HODL |
| HP | (105 at the time) | **100**: STRF is his tank move now |

Result: 75% for a sensible player (same as before this kit), others beat CPU Saylor 67% of the time, and hiding behind STRF all fight wins 2%. Pressing only STRK went from 51% to 70%, so his pink button is a real option now.

**Super cut-in:** orange dots stamp one by one onto his tracker chart (line up and to the right, the last dot glowing), voice line `A LITTLE MORE ORANGE`, `🟠` prop.

**The astronaut clip moved to the KO.** The cut-in has room for one line of big text, and the punchline lands harder as the finisher. When Another Orange Dot lands the KO: the astronaut DJ scene (white suit, dark visor, headphones, fist pumping behind a DJ booth with a ₿-stickered laptop, speakers either side, a giant purple-tinted eye on the big screen behind; drawn from the reference screenshot), `FIAT AS A STORE OF VALUE` then `WE CALL THEM POOR`. The loser is left holding 💵, and the astronaut stays in the corner of the result card.

**Also built:** `THERE IS NO SECOND BEST` when Saylor beats Toly (by any move), `THE NEXT DOT IS THE IMPORTANT ONE` after CPU Saylor's Super, nicknames next to each ticker on the buttons (STRC *Stretch*, ...) so four near-identical tickers stay readable, and "Not financial advice." in the footer.

**CPU:** can't see your move, so "STRF when he is about to be hit" became weights: STRC high, STRK medium, STRF low, STRD rare.

**Not built:** STRE (left off, as the concept says).

**Where it lives:** `js/data.js` (`saylor`: `brace`, `dmg`, `moves`, `super`, `rivalKo`), `js/engine.js` (`brace`, `moveDamage`), cut-in and KO scene in `js/app.js` (`trackerChart`, `astronautSVG`, `astronautScene`) and `css/style.css` (search "Another Orange Dot" / "astronaut DJ").
