# Fighter kit docs

One file per fighter: their Super and, optionally, their own button names. Drop new concepts here (e.g. from Grok research) and they get built from this folder.

## Super slots the game already supports (no new code)

| Slot | Where it shows | Example |
|---|---|---|
| Super name | Cut-in name card, fighter picker, Super button | Second Best Salesman |
| Name card flicker *(optional)* | Words that flash on the name card before it locks | HELIUS → HELIUM → HIVEMAPPER |
| Voice line | Big text on the cut-in. Under ~40 characters. | THE RPCS DID THIS |
| KO finish line | K.O. banner, result card, share text | TRILLIONS |
| Effect | Pick from what exists: damage, multi-hit, Blind, Sleep, drain Blocks, HODL, Prune, Hypnotized | 8 damage + Blind |
| Prop emoji | Next to the fighter's portrait on the cut-in | ☀️ |
| CPU after-Super line *(optional)* | Banner after the CPU's Super lands | THE PLAN IS WORKING |
| Skip line *(optional, Blind/Sleep Supers)* | Over the opponent on the turn they skip | WHO WAS THAT |
| Rival KO line *(optional)* | Replaces the finish line when beating one specific fighter | Toly vs Saylor: THERE IS A SECOND BEST |
| KO prop *(optional)* | What the loser is left holding on stage and on the result card | 🎈 |

## Button names (optional, per fighter)

Every fighter has the same five buttons with the same colors and jobs. A fighter can rename the first four. Anything left blank keeps the generic name (Strike / Privacy / Mint / Rug).

| Button | Job (fixed) | Slots | Example (Mert) |
|---|---|---|---|
| 🔴 Red | Reliable hit, always lands | name, emoji | 🗯️ Shitpost |
| 🔵 Blue | Try to dodge (fighter's hide %) | name, emoji, line when it works, line when it fails | 🕶️ Zolana · EVERY BALD GUY EVER · VIEW KEY LEAKED |
| 🩷 Pink | Medium gamble | name, emoji, line when it lands, line when it flops | 🪙 Memecoin · I LIKE MEMECOINS · SNIPED IN BLOCK ZERO |
| 🟣 Purple | Big gamble: steals Blocks, hits through dodges | name, emoji, line when it lands, line when it flops | ⛔ Rate Limit · 429: TOO MANY REQUESTS · STATUS PAGE: ALL GREEN |

**Button names: 12 characters max** (they have to fit on a phone). Banner lines: under ~25 characters reads best.

## Needs a little code (fine, just describe it)

- **The cut-in scene** (the 2–3 second animation): describe it in plain words and it gets built.
- **A brand-new effect or status** (e.g. Toly's v2 "Seeker'd": can't use Privacy for 2 turns). Doable, but it changes balance, so it gets run through the simulator first.
- **A button that works differently** (not just renamed). Same: doable, but it needs a balance pass.

## House rules

- 2–3 seconds per cut-in, one line of big text on screen.
- Caricature props, no official logos or wordmarks.
- Supers can't be dodged or blocked. "Blocked" gags get mapped to "the opponent tried to hide this turn."
- The CPU always fires its Super the moment it has 10 Blocks.
- Nothing that reads as punching at real tragedies; every line can end up on a share card.

## Files

| Fighter | Super | Own button names | Doc |
|---|---|---|---|
| Toly | Second Best Salesman | not yet | [toly.md](toly.md) |
| Mert | CEO of Helium | yes | [mert.md](mert.md) |
