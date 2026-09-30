# Toly Super — Second Best Salesman

**Game:** Proof of Fight  
**Fighter:** Toly (`toly`)  
**Status:** Locked flavor for v1. Replaces the old Firedancer name-card.  
**Job in the kit:** huge single-hit nuke when Blocks hit 10.

This is the salesman bit he already does on X. His bio calls him an award-winning phone creator. He has posted that he is “the second best solana dev phone salesman,” that “Apple and Solana Mobile have combined sold 3.469 billion phones,” and that the sales goal of the year is “get a solana hater to buy a @solanamobile phone.”

Do not use official Solana, Solana Mobile, Saga, or Seeker logos as UI chrome. Caricature phone-brick + brochure is enough.

---

## Why this instead of Firedancer

Firedancer / “increasing bandwidth and reducing latency” is accurate and boring on a name card. Charles already has the lecture. Toly should have a *prop* and a *close*.

Saylor’s super is **No Second Best**. Toly’s super is him cheerfully claiming **second best**. That fight is free comedy.

Firedancer can stay as handbook flavor (“the stack under the pitch”). Players never need to see that word on the slam.

---

## Locked v1

| Field | Value |
|---|---|
| Super name | **Second Best Salesman** |
| Name card | `SECOND BEST SALESMAN` |
| Voice line | `APPLE + SOLANA MOBILE: 3.469 BILLION` |
| KO banner | `HATER CONVERTED` |
| Cost | 10 Blocks |
| Whiff? | Never |
| Damage | Huge single hit (same slot as the old Firedancer nuke) |
| Status | None in v1 |

### Cutscene (2–3 seconds, same template as everyone else)

1. Screen slam. Name card: `SECOND BEST SALESMAN`.
2. Toly flips a blazer open like a mall kiosk closer. A stack of Seeker-shaped bricks unfolds like a brochure.
3. He slaps one into the opponent’s chest. Phone screen reads something dumb and in-world: `dApp Store` or `Seed Vault` or `BUY NOW`.
4. Airdrop confetti / BONK-colored beanbags burst out of the brick and knock them back.
5. Line hits: `APPLE + SOLANA MOBILE: 3.469 BILLION`.
6. Back to HP bars.

Optional sting, only if there is time: a tiny reviewer ghost holding a 1-star card gets thrown offstage. Cut it if the scene runs long.

If the first slap is “blocked” in flavor (not a real mechanic): a dusty **Saga** box falls out of his jacket. Warehouse inventory. Still connects.

### Result card

Winner art: opponent sitting on the ground holding the phone they did not ask for.  
Finish line: `HATER CONVERTED`.

---

## His actual lines to steal from (do not put all of them on screen)

Use one on the slam, park the rest for win quotes / CPU chatter.

- “I am the second best solana dev phone salesman.”
- “Apple and Solana Mobile have combined sold 3.469 billion phones!”
- “Sales goal of the year accomplished. Get a solana hater to buy a solana mobile phone.”
- “You are gonna get what you are gonna get.”
- “Seeker did it first.”
- “The cheat code for app developers is solana mobile seeker.”

CPU Toly, after Super: `SALES GOAL OF THE YEAR ACCOMPLISHED.`  
CPU Toly, if he KOs Saylor: `THERE IS A SECOND BEST.`

---

## Alt names (same cutscene, if the title feels long)

| Name card | Slam line | Notes |
|---|---|---|
| **Second Best Salesman** | `3.469 BILLION` | Lock this. |
| **3.469 Billion** | `COMBINED WITH APPLE` | Shorter card, weaker joke. |
| **Hater Converted** | `SALES GOAL OF THE YEAR` | Better as KO banner than title. |
| **You Gonna Get What You Gonna Get** | ships the box | Good loss-quote, not the title. |

---

## v2 status tax (do not build until the nuke is funny)

Same cutscene, extra rule after the hit:

- **Seeker’d** (2 turns): cannot use Privacy. The phone is in their pocket. Seed Vault has the keys.
- Or next action is forced **Mint** (“you already paid for the airdrop”).

v1 is just the punch and the banners.

---

## Kit reminder

Toly still has the shared buttons: Strike / Privacy / Mint / Rug / Super.

| Move | His vibe |
|---|---|
| Strike | Always hits. He is closing. |
| Privacy | 35% hide. Transparent capitalist. Bad at vanishing. |
| Mint | 50% (`FLOOR IS LATENCY` on fail). |
| Rug | 30% (`OUTAGE HIT THE BRIDGE` on fail). |
| Super | **Second Best Salesman** at 10 Blocks. |

CPU weight: high Strike, low Privacy, Super the moment the bar is full. He is hunting the conversion KO.

---

## Art notes

- Phone is a generic thick Android slab with a stupid big camera bump. Not a product render.
- Brochure stack, blazer, airdrop puff. That is the whole prop list.
- No official wordmarks on the device face.
- Color sting can nod at teal/purple without copying the brand sheet.

---

## One-line lock

Toly’s Super is **Second Best Salesman**: he sells the opponent a Seeker so hard it counts as a haymaker. Line is `3.469 BILLION`. KO is `HATER CONVERTED`.

---

## Build notes (Sept 30, 2026): what's in the game

Added when this was built into the game. Everything above is the original concept, unedited.

**Built as written:** name card `SECOND BEST SALESMAN`, voice line `APPLE + SOLANA MOBILE: 3.469 BILLION`, KO line `HATER CONVERTED`, 10 Blocks, never whiffs, 35 damage in one hit (same slot as Firedancer), no status.

**Cut-in:** a brochure of five generic phone bricks (big camera bump, screens read `Seed Vault` / `dApp Store` / `BUY NOW`) fans open, one `BUY NOW` brick gets slapped toward the opponent, then airdrop confetti and BONK-colored beanbags burst out. Teal/purple nod on the screens, no logos.

**Adapted to the game's rules:**
- *"If the first slap is blocked"*: Supers can't be blocked in this game, so the dusty box (`SAGA / WAREHOUSE STOCK`) drops in when the opponent **picked Privacy** that turn. Still connects.
- *CPU Toly after Super*: `SALES GOAL OF THE YEAR ACCOMPLISHED.` shows as a banner after the hit. Skipped if the Super is the KO, because the KO line is better there.
- *CPU Toly KOs Saylor*: `THERE IS A SECOND BEST` replaces the finish line whenever Toly beats Saylor, **by any move, whether Toly is CPU or player**. It also lands in the share text.
- *Result card art (opponent holding the phone)*: until there's real art, the loser's face on the result card gets a 📱, and the KO'd fighter on stage is left holding one. Only when the Super did the KO.

**Not built yet:** blazer flip (waits for Toly portrait art), reviewer-ghost sting, v2 `Seeker'd` status, the other quotes.

**Where it lives:** `js/data.js` (`toly.super`, `toly.rivalKo`), cut-in scene in `js/app.js` (`salesDeco`) and `css/style.css` (search "Second Best Salesman").
