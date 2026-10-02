# Vitalik kit — Badger Dance

**Fighter:** Vitalik (`vitalik`)
**Status:** Built Oct 2, 2026. Keeps the hypnosis dance (the user's original idea), now redrawn as the conference badger dance; new buttons and lines from Grok's research.

## Concept (Grok's research, as provided)

The dance is the motion. The last year gives you the costume and the line.

**What actually memes**

- **Milady is back.** On January 2, 2026 he put the anime PFP back up and wrote "Welcome to 2026! Milady is back." A longer post the same month ends "In the world computer, there is no centralized overlord. There is no single point of failure. There is only love. Milady." That last sentence is the KO. It is sincere, and it is ridiculous on a finish banner.
- **d/acc.** Defensive acceleration. He is still on it. In September he used soundproof walls as the example: better passive defense, fewer rules, fewer fights. That is a shield Super, not a punch. It also fits the teddy you already had. The teddy was the mechanic. d/acc is the name.
- **The bio is a bit.** "I choose balance. First-level balance." Then a line of Lojban, mi pinxe lo crino tcati, which is "I drink green tea." Idle animation is the tea. Do not make it a button.
- **Privacy, said like a proverb.** "You cannot make society secure by making people insecure." Fight Chat Control. Same job as his 55% hide chance. Banner, not a new move.
- **The essay drop.** September 27: "The cryptographic world computer," a post about everything after Hegota, Lean consensus, FOCIL, obfuscation. He posts the link and leaves. That is the Peer Review problem you already gave Charles. Do not give Vitalik a lecture Super. He dances instead.

**How it sits on the fighter**

| Bit | Use |
|---|---|
| Conference dance | The cutscene. He does not punch. He shuffles, then the effect lands. |
| d/acc | Super name. Replaces a generic teddy title. |
| Soulbound teddy | Still the prop. Eats the next hit. |
| THERE IS ONLY LOVE | KO banner |
| MILADY | KO prop. Loser is wearing the PFP. |
| SOUNDPROOF WALL | CPU after. The hit did not travel. |
| YOU CANNOT MAKE SOCIETY SECURE BY MAKING PEOPLE INSECURE | Privacy success. Long. Fine as a ticker, not the slam. |
| I CHOOSE BALANCE | Idle / block line |
| Green tea | Portrait prop only |

He should stay the only Super that deals no damage. Dance, wall goes up, teddy eats the next hit, banner says there is only love. Everyone else is swinging. He is stretching.

---

## Build notes (Oct 2, 2026): what's in the game

**Kept the hypnosis dance.** Grok's notes assumed the original Soulbound Teddy shield (no damage, eats the next hit). The game already had the dance the user asked for: 15 damage + Hypnotized (the target's next Strike/Mint/Rug hits themselves). The user chose to keep it, so d/acc went where it lands best instead of becoming a shield:

- **When someone he hypnotized hits themselves:** `DEFENSIVE ACCELERATION` (sub: "Saylor hit themselves"). Replaces the generic SELF-REKT for his hypnosis only. Passive defense where the attack bounces back.

**The cut-in is the badger dance**, redrawn from the user's screenshot of the conference video: a bright green screen full of black-and-white cartoon badgers (different sizes, one tiny one up in the corner), arms straight out, flapping up and down; in front, a stage of people in conference lanyards doing the same move, back row in the gaps of the front row, Vitalik front and center in a blue tee with a white diamond. Everyone flaps in sync. Name card `BADGER DANCE` (renamed from Ultra Sound Moves at the user's request), line `DON'T LOOK AT THE DANCE.`

**Buttons** (numbers unchanged; Grok didn't name buttons, these are drafted and approved):

| Button | Name | Lands | Flops |
|---|---|---|---|
| 🔴 Red (reliable hit, 10 dmg) | 📝 Essay Drop | no banner · KO: `READ THE BLOG POST` | can't fail |
| 🔵 Blue (dodge, 55%) | 🫥 Privacy Pool | `FIGHT CHAT CONTROL` (sub: "You cannot make society secure by making people insecure") | `I CHOOSE BALANCE` |
| 🩷 Pink (medium gamble, 35%) | 🧸 Soulbound | `NON-TRANSFERABLE` | `SOULBOUND AND ALSO UGLY` |
| 🟣 Purple (big gamble, 20%) | 🌱 Public Goods | `QUADRATIC FUNDING` | `UNDERFUNDED` |

**Other moments:**
- Super KO: `THERE IS ONLY LOVE`, and the loser is left in the Milady PFP (🎀).
- After CPU Vitalik's Super: `MILADY IS BACK`.
- When an attack misses him because he hid: `SOUNDPROOF WALL` (the hit did not travel).
- On stage he holds a 🍵 and takes an occasional sip (green tea from the bio).

**Where Grok's lines went:** the privacy proverb is the small line under `FIGHT CHAT CONTROL` (too long for the big banner, as Grok said). `SOUNDPROOF WALL` became the dodge line, since his Super isn't a shield. `I CHOOSE BALANCE` is the shrug when his dodge fails. The soulbound teddy came back as his pink button.

**Not built:** Grok's no-damage shield Super named d/acc (kept the hypnosis dance instead).

**Balance:** unchanged (numbers didn't move).

**Where it lives:** `js/data.js` (`vitalik`), the scene in `js/app.js` (`badgerSVG`, `personSVG`, `badgerDanceDeco`) and `css/style.css` (search "badger dance").

## Art (Oct 2, 2026)

Vitalik is the first fighter with real art (see [docs/art/README.md](../art/README.md)): a late-90s arcade portrait in a purple unicorn tee, and a 16-bit sprite holding his green tea on stage. The 🍵 emoji is only used on the block body now. To match, the dancing Vitalik in the Badger Dance switched from a blue tee with a white diamond (an Ethereum-style logo, which the rules rule out) to the purple tee with a little unicorn.
