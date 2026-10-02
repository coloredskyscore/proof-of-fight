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
| Loser line *(optional, per fighter)* | Over them when they're KO'd, and quoted on the result card | Garlinghouse: THIS ONE STINGS |
| Dodge line *(optional, per fighter)* | Banner when an attack misses this fighter because they hid | Charles: I AM NOT ACCOUNTABLE |
| KO scene *(optional, needs a little code)* | A short extra scene when the Super lands the KO | Saylor's astronaut DJ: WE CALL THEM POOR |

## Button names (optional, per fighter)

Every fighter has the same five buttons with the same colors and jobs. A fighter can rename the first four. Anything left blank keeps the generic name (Strike / Privacy / Mint / Rug).

| Button | Job (fixed) | Slots | Example (Mert) |
|---|---|---|---|
| 🔴 Red | Reliable hit, always lands | name, emoji | 🗯️ Shitpost |
| 🔵 Blue | Try to dodge (fighter's hide %) | name, emoji, line when it works, line when it fails | 🕶️ Zolana · EVERY BALD GUY EVER · VIEW KEY LEAKED |
| 🩷 Pink | Medium gamble | name, emoji, line when it lands, line when it flops | 🪙 Memecoin · I LIKE MEMECOINS · SNIPED IN BLOCK ZERO |
| 🟣 Purple | Big gamble: steals Blocks, hits through dodges | name, emoji, line when it lands, line when it flops, line when it hits someone who hid | ⛔ Rate Limit · 429: TOO MANY REQUESTS · STATUS PAGE: ALL GREEN · CAN'T HIDE FROM A RATE LIMIT |

Every button can also have:
- **a nickname**, shown small next to the name (Saylor: STRC *Stretch*)
- **a KO line** used when that button lands the knockout (Saylor's STRC: STRETCH)
- **a ticker** that pops over the fighter when it lands (`MSTR ▲ 37%`, where the number is the damage roll) and sits under the flop banner (`MSTR ▼`)

**Button names: 12 characters max** (they have to fit on a phone). Banner lines: under ~25 characters reads best.

## Custom numbers and special buttons (needs a balance pass)

A fighter can have their own damage or odds on a button (Saylor's STRK does 20 at 45%), damage can be a **range rolled each time** (Saylor's MSTR: 15–45, "high beta"), and a blue button can be a **brace** instead of a dodge: always works, halves incoming Strike/Mint/Rug damage, never hides (Saylor's STRF). Propose numbers freely; they get run through the simulator before building, and adjusted if a fighter ends up too strong or too weak. Rough guide: a sensible player should win about 60–78% with any fighter.

## Needs a little code (fine, just describe it)

- **The cut-in scene** (the 2–3 second animation): describe it in plain words and it gets built.
- **A brand-new effect or status** (e.g. Toly's v2 "Seeker'd": can't use Privacy for 2 turns). Doable, but it changes balance, so it gets run through the simulator first.
- **A button that works differently** (not just renamed). Same: doable, but it needs a balance pass. Example: Saylor's STRF brace.

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
| Saylor | Another Orange Dot | yes, plus his own numbers and the STRF brace | [saylor.md](saylor.md) |
| Charles | Midnight Express | yes | [charles.md](charles.md) |
| Garlinghouse | XRP Army | yes | [garlinghouse.md](garlinghouse.md) |
