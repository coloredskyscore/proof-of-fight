# Garlinghouse kit — XRP Army

**Fighter:** Garlinghouse (`garlinghouse`)
**Status:** Built Oct 2, 2026. Keeps the XRP Army Super; new buttons and lines.

## Concept (Grok's research, as provided)

Garlinghouse is the straight man. The meme is the crowd around him, and he knows it. He has posted "for the XRP Army," and he has also said he is not an XRP maximalist. The TikTok price calls are not his.

**What he actually posts**

- **Scoreboard.** The lines people still quote are from the SEC fight: "I'm not surprised. I'm pissed." Then "WE WILL PREVAIL. For Ripple, for the XRP Army." And the tally: "Ripple: 3. SEC: 0." "We won. They lost." XRP is not a security.
- **Washington, not lambos.** The last year is CLARITY Act, "proud to be in the room," "making America the crypto capital of the world," "perfect can't be the enemy of good." When the bill stalled he wrote "this one stings" and blamed "the anti-crypto army." That phrase is a gift. He named the other side.
- **Gold trucks.** Sept 2026: the Dutch central bank spent months moving gold, and most of it never left the vault. "How are people still fighting this?!" Banks still move value like it is 1940. That is the closest he gets to a bit.
- **RLUSD.** "You'll hear it from Ripple first." Enterprise stablecoin. Utility, not a meme coin.

**What he does not post**

The $589, $10,000, "XRP to SWIFT," and "I retire next year" clips are TikTok and the army. A September 2026 $10 trillion / ~$179 scenario circulated as if he said it. Reporting did not pin that number on him. Do not put a fake price target in his mouth. Put it in the crowd's mouth.

**How that plays**

| Source | Line | Use |
|---|---|---|
| Him | RIPPLE 3, SEC 0 | Super name or KO |
| Him | THE ANTI-CRYPTO ARMY | The other side's name. His crowd is the reply. |
| Him | HOW ARE PEOPLE STILL FIGHTING THIS | Slam, gold truck in the background |
| Him | YOU'LL HEAR IT FROM RIPPLE FIRST | RLUSD success banner |
| Him | THIS ONE STINGS | When he loses |
| Him | PERFECT CAN'T BE THE ENEMY OF GOOD | Settle / chip damage |
| Army, not him | $589 BY FRIDAY | A TikToker in the XRP Army Super who gets the number wrong |
| Army, not him | SWIFT IS DEAD | Banner in the crowd, he does not say it |

The Super you already had, XRP Army, is the right picture: polo shirts jog across. Add one TikToker in the pack yelling a price, and Garlinghouse in front looking slightly embarrassed, saying RIPPLE 3, SEC 0. He did not ask for the price call. The army brought it.

He should be bad at Privacy and bad at rugs. He is a settlements guy. The chip-damage multi-hit is still his job.

---

## Build notes (Oct 2, 2026): what's in the game

**Buttons** (hide 30% → 25%, rug 35% → 20%, as Grok said; everything else unchanged):

| Button | Name | Lands | Flops |
|---|---|---|---|
| 🔴 Red (reliable hit, 10 dmg) | 💸 Settle | no banner · KO: `PERFECT CAN'T BE THE ENEMY OF GOOD` | can't fail |
| 🔵 Blue (dodge, 25%) | 🏛️ In The Room | `PROUD TO BE IN THE ROOM` | `BLOCKED BY THE ANTI-CRYPTO ARMY` |
| 🩷 Pink (medium gamble, 24 dmg, 55%) | 💵 RLUSD | `YOU'LL HEAR IT FROM RIPPLE FIRST` | `UTILITY TBD` |
| 🟣 Purple (big gamble, 36 dmg, 20%) | ⚖️ Lawsuit | `WE WILL PREVAIL` · through a dodge: `CAN'T HIDE FROM A SUBPOENA` | `I'M NOT SURPRISED. I'M PISSED.` |

**Super: XRP Army** (same chip damage: 5 hits × 5). The polo-shirt army jogs across; one TikToker has a speech bubble yelling `$589 BY FRIDAY`, another carries a `SWIFT IS DEAD` sign (the price calls stay with the crowd); an armored gold truck crawls along at "1940 SPEED" behind them; Garlinghouse up front, slightly embarrassed (😅 prop), says `RIPPLE 3, SEC 0`. Cut-in runs 3.2s.

**Other moments:**
- Super KO: `WE WON. THEY LOST.`
- After CPU Garlinghouse's Super, if you're still standing: `HOW ARE PEOPLE STILL FIGHTING THIS?!`
- When he loses: `THIS ONE STINGS`, popped over him on stage and quoted on the result card (new slot: `loseLine`).

**Where Grok's lines went:** "the anti-crypto army" is who blocks him getting in the room (blue flop). "I'm not surprised. I'm pissed." is the Lawsuit flop (his old `SETTLEMENT PENDING` is the backup). "How are people still fighting this" is the CPU line after his Super, since it only shows when you survived the army; the gold truck still gets its cameo in the Super.

**Balance:** as a player he's unchanged (68% for a sensible player; his 55% RLUSD carries him). As the CPU he was the hardest opponent in the game (players won only 54%), because CPU Garlinghouse spammed a 35% rug. Now players beat him about 68% of the time, in line with everyone else.

**Where it lives:** `js/data.js` (`garlinghouse`), cut-in in `js/app.js` (`armyDeco`) and `css/style.css` (search "army-bubble" / "gold-truck").

## Art (Oct 3, 2026)

Garlinghouse has real art now (see [docs/art/README.md](../art/README.md)): a late-90s arcade portrait (gray hair, stubble, navy suit, open white collar, the straight man's glare) and a 16-bit sprite in the navy suit carrying a beat-up leather briefcase, a nod to Settle, Lawsuit and the SEC years without any text. The portrait shows in the XRP Army cut-in under the running army.

