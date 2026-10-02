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

---

## Update (Oct 2, 2026): Grok's take on the four buttons

Grok's research as pasted, unedited. The "Where they go" table arrived flattened in the paste, so it's rebuilt as a table here with the same words.

> Second Best Salesman stays the Super. The rest of the feed is what the other four buttons should sound like.
>
> **What still memes**
>
> The phone, and he will not drop it. Bio still says “award winning phone creator.” The lines you already locked are real: “I am the second best solana dev phone salesman,” “Apple and Solana Mobile have combined sold 3.469 billion phones,” “you are gonna get what you are gonna get.” That is the cutscene. Do not spend it on a normal button.
>
> Slop cannon. He asked the timeline, “Have you been able to ship a slop cannon project to prod?” Older cousin: “Slop, kino, skibidi bop.” This is the Mint button. He fires junk. Sometimes it ships.
>
> Comrades. The fake Marx essays are still a format, not a one-off. A post that starts COMRADES, and ends as a factory ad. Too close to Charles if it is the Super. Fine as a Strike banner: he starts a speech, then just hits you.
>
> We can just drone the sandwichers. He posted a version of this again today after a hack returned the funds. One line, not a weapon. Use it as the Rug success banner: the MEV bot gets removed from the stage. Do not animate a real drone build.
>
> Cheap fast chain gud. Fees and delay are sand in the gears. Still the best non-phone slam if the salesman cutscene ever feels long. Park it as the KO alternate, not the name.
>
> Alpenglow. “It’s the final countdown,” 150ms finality, delay games get punished. Handbook flavor. The Europe song sting is funny for one frame and then old.
>
> 10x. “Can you do your job 10x better?” Afterimage punch. Backup Super if you ever retire the phone. Not needed while the Seeker slap is the joke.
>
> One-liners. “No chill with these listings.” “Based pope.” “Profitability at $1t mcap.” Emoji-only replies, crowns and skulls. Idle text, not buttons.
>
> **Where they go**
>
> | Bit | Slot |
> |---|---|
> | Second Best Salesman | Super. Locked. |
> | 3.469 BILLION | Slam line |
> | HATER CONVERTED | KO |
> | SLOP CANNON | Mint. Fail: NOT IN PROD |
> | COMRADES, | Strike banner, then a normal hit |
> | DRONE THE SANDWICHERS | Rug success |
> | CHEAP FAST CHAIN GUD | Alternate KO |
> | NO CHILL | If he Mints twice in a row |
> | YOU GONNA GET WHAT YOU GONNA GET | CPU after the Super |
>
> He should stay bad at Privacy. The salesman wants to be seen. The phone is the show. Everything else is chatter between closes.

## Build notes (Oct 2, 2026): his buttons

**Super:** unchanged. Second Best Salesman, `APPLE + SOLANA MOBILE: 3.469 BILLION`, `HATER CONVERTED`, and `THERE IS A SECOND BEST` whenever he beats Saylor.

**Buttons** (numbers unchanged: bad at hiding, as Grok wants):

| Button | Name | Lands | Flops |
|---|---|---|---|
| 🔴 Red (reliable hit, 10 dmg) | ✊ Comrades | no banner (the label `✊ COMRADES` pops over him, then a normal hit) · KO: `CHEAP FAST CHAIN GUD` | can't fail |
| 🔵 Blue (dodge, 35%) | 🗝️ Seed Vault | `SEED VAULT HAS THE KEYS` | `THE PHONE IS THE SHOW` |
| 🩷 Pink (medium gamble, 50%) | 🗑️ Slop Cannon | `SLOP, KINO, SKIBIDI BOP` | `NOT IN PROD` |
| 🟣 Purple (big gamble, 30%) | 🥪 MEV Hunt | `DRONE THE SANDWICHERS` · through a dodge: `150MS FINALITY` | `OUTAGE HIT THE BRIDGE` |

**Other moments:**
- **Slop Cannon two turns running:** a pink `NO CHILL` popup over him. This is a new "repeat line" slot any fighter can use.
- **When he loses:** `YOU GONNA GET WHAT YOU GONNA GET` over him and on the result card, as a fatalistic shrug.
- **After CPU Toly's Super:** still `SALES GOAL OF THE YEAR ACCOMPLISHED.`

**Where Grok's lines went:**
- `COMRADES,` became the button name instead of a banner. Strike is the most-pressed button, and a banner on every press would slow fights down. The label already pops over his head each time, so you see COMRADES and then he just hits you.
- `CHEAP FAST CHAIN GUD` is the KO line when Comrades lands the knockout, the alternate KO Grok asked for. The Super keeps `HATER CONVERTED`.
- Grok gave Slop Cannon's flop (`NOT IN PROD`) but not a success line, so it uses his older `SLOP, KINO, SKIBIDI BOP`.
- Alpenglow's "150ms finality, delay games get punished" is the line when MEV Hunt hits someone who tried to hide. Hiding is a delay game.
- Seed Vault is named after Solana Mobile's key vault so the phone carries through. `THE PHONE IS THE SHOW` is Grok's "the salesman wants to be seen."
- `YOU GONNA GET WHAT YOU GONNA GET` moved from CPU-after-Super to his loser line, since the existing sales-goal brag fits better after he lands a sale.
- His old `FLOOR IS LATENCY` (Mint flop) is retired; `OUTAGE HIT THE BRIDGE` stays as the MEV Hunt flop.

**Parked:** the 10x afterimage punch (backup Super), the Europe song sting, and the idle one-liners (`NO CHILL WITH THESE LISTINGS`, `BASED POPE`, `PROFITABILITY AT $1T MCAP`).

**Balance:** unchanged (numbers didn't move; the simulator matches the previous build exactly).

**Where it lives:** `js/data.js` (`toly.moves`, `toly.repeatLine`, `toly.loseLine`), the repeat popup in `js/app.js` (the `reveal` event) and `css/style.css` (`.popup.repeat`).
