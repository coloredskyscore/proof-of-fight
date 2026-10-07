# CZ kit — 4

**Fighter:** CZ (`cz`)
**Status:** Built Oct 7, 2026. New fighter: buttons, Super, art and sounds.

## Concept (Grok's research, as provided)

The 4 is real, and the sentence makes it funnier. On January 2, 2023 he posted four New Year items. The fourth was a don't: ignore FUD, fake news, and attacks. He told people to reply with that post whenever he flashed a 4. He is still doing it. July 2025: "Bruh… FUD. 4." January 2026: a numbered list that ends on twisted FUD. The hand gesture is the same code.

He then got four months, released September 2024, pardoned October 2025. The meme and the sentence are the same digit. That is the Super. He holds up four fingers. The hit does not land. Banner: 4.

The rest of the year is not a bit. Giggle Academy, a kids' education app he keeps saying is not a crypto team. A book. A yacht named Da Moon. A New York Times ride in a white Nissan he called "my Lamborghini." Numbered lists that always seem to stop at 4. Classic leftover: FUNDS ARE SAFU.

| Bit | Slot |
|---|---|
| 4 | Super. Ignore the hit. |
| 4 MONTHS | KO. He already did the time. |
| FUNDS ARE SAFU | Strike banner |
| MY LAMBORGHINI | The Nissan pulls up in the cutscene |
| GIGGLE | Idle. Not a weapon. |
| 4. | Fail line for anything aimed at him |

He should be the best brace on the roster. The button does not hide him. It deletes the FUD.

**Checked before building:** the white Nissan SUV ("My Lamborghini") and the yacht *Da Moon* are both from the 2026 New York Times feature on his life in Abu Dhabi.

---

## Build notes (Oct 7, 2026): what's in the game

**Buttons:**

| Button | Name | Lands | Flops |
|---|---|---|---|
| 🔴 Red (reliable hit, 10 dmg) | 🔐 SAFU | KO: `FUNDS ARE SAFU` | can't fail |
| 🔵 Blue (brace, always works) | 4️⃣ Ignore FUD | `IGNORE FUD`. Red and pink do **nothing** to him that turn (a big `4.` pops over him), purple does half. +1 Block. | can't fail |
| 🩷 Pink (medium gamble, 24 dmg, 45%) | 📋 Top 4 List | `1, 2, 3, 4.` | `ONLY GOT TO 3` |
| 🟣 Purple (big gamble, 36 dmg, 25%) | 🛥️ Da Moon | `TO DA MOON` | `STILL DOCKED` |

**Ignore FUD is the strongest brace on the roster.** Saylor's STRF halves everything; CZ's makes red and pink bounce off entirely and halves purple. He never hides, so nothing is ever "dodged": it just doesn't land.

**Super: 4** (20 damage + FUD-proof). The white Nissan SUV rolls in with a `MY LAMBORGHINI` bubble; `FUD`, `FAKE NEWS` and `ATTACKS` fly at him one by one and shatter. The name card is just a huge **4**; his line is item 4 of the post: `IGNORE FUD, FAKE NEWS, ATTACKS`. Then red, pink and purple do nothing to him for this turn and the next (4️⃣ FUD-PROOF). Supers still hit him, per the house rule that Supers can't be blocked.

**Other moments:**
- Super KO: `4 MONTHS`
- After CPU CZ's Super, if you're still standing: `BRUH… FUD. 4.`
- When he loses: `BACK TO GIGGLE ACADEMY`

**Where Grok's lines went:** GIGGLE became his loser line (Giggle Academy), since an idle animation isn't a slot the game has. "4." is the pop-up for every hit that bounces off him.

**Balance:** a sensible player wins 67% as CZ. As the CPU, players beat him about 60% of the time, on the harder side, like Toly.

**Daily Fight:** he joins the daily draw on Oct 12, 2026 (`dailyFrom`), with Sergey and Adeniyi.

**Where it lives:** `js/data.js` (`cz`, `SUPERS.four`), the brace and the FUD-proof shield in `js/engine.js` (`doAttack`), the cut-in in `js/app.js` (`fourDeco`) and `css/style.css` (search "CZ:").

## Art (Oct 7, 2026)

A late-90s arcade portrait (short black hair, rimless glasses, stern stare, black hoodie, four fingers up) and a 16-bit sprite in the same hoodie, one fist up and four fingers raised with the thumb folded. Prompts and commands: [docs/art/README.md](../art/README.md).
