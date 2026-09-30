# Super move docs

One file per fighter's Super. Drop new concepts here (e.g. from Grok research) and they get built from this folder.

## Slots the game already supports (no new code)

| Slot | Where it shows | Example (Toly) |
|---|---|---|
| Super name | Cut-in name card, fighter picker, Super button | Second Best Salesman |
| Voice line | Big text on the cut-in. Keep it under ~40 characters. | APPLE + SOLANA MOBILE: 3.469 BILLION |
| KO finish line | K.O. banner, result card, share text | HATER CONVERTED |
| Effect | Pick from what exists: damage, multi-hit, Blind, Sleep, drain Blocks, HODL, Prune, Hypnotized | 35 damage, one hit |
| Prop emoji | Next to the fighter's portrait on the cut-in | 📱 |
| CPU after-Super line *(optional)* | Banner after the CPU's Super lands | SALES GOAL OF THE YEAR ACCOMPLISHED. |
| Rival KO line *(optional)* | Replaces the finish line when beating one specific fighter | vs Saylor: THERE IS A SECOND BEST |
| KO prop *(optional)* | What the loser is left holding on stage and on the result card | 📱 |
| Mint fail / Rug fail lines | Banners when those moves flop | FLOOR IS LATENCY / OUTAGE HIT THE BRIDGE |

## Needs a little code (fine, just describe it)

- **The cut-in scene** (the 2–3 second animation): describe it in plain words and it gets built.
- **A brand-new effect or status** (e.g. Toly's v2 "Seeker'd": can't use Privacy for 2 turns). Doable, but it changes balance, so it gets run through the simulator first.

## House rules

- 2–3 seconds per cut-in, one line of big text on screen.
- Caricature props, no official logos or wordmarks.
- Supers can't be dodged or blocked. "Blocked" gags get mapped to "the opponent tried to hide this turn."

## Files

| Fighter | Super | Doc |
|---|---|---|
| Toly | Second Best Salesman | [toly.md](toly.md) |
