# Proof of Fight — Gameplan

**Working title:** Proof of Fight  
**Live URL:** https://proofoffight.com  
**Repo:** `github.com/coloredskyscore/proof-of-fight` (separate project — not coloredskyscore)  
**Status:** First playable build is in the repo (steps 1–2 of the build order). No hosting pointed yet. No wallet. No on-chain mint.

This is the document to build from. If a feature is not in **v1**, it does not get built until the dummy fight is fun.

---

## 0. Changes

### Oct 7, 2026: CZ and Adeniyi join the roster

Fighters nine and ten. Details: [docs/supers/cz.md](docs/supers/cz.md), [docs/supers/adeniyi.md](docs/supers/adeniyi.md).
- **CZ:** 🔐 SAFU (`FUNDS ARE SAFU`), 4️⃣ Ignore FUD, 📋 Top 4 List 45% (`1, 2, 3, 4.` / `ONLY GOT TO 3`), 🛥️ Da Moon 25% (`TO DA MOON` / `STILL DOCKED`).
  - **Ignore FUD** is the strongest brace in the game: it always works, red and pink do nothing to him (a big `4.` pops up), purple does half.
  - **Super "4":** the white Nissan SUV rolls in (`MY LAMBORGHINI`), and FUD, FAKE NEWS and ATTACKS shatter. 20 damage, then he's FUD-proof this turn and next. KO: `4 MONTHS`. Loses: `BACK TO GIGGLE ACADEMY`.
- **Adeniyi:** 🆓 Zero Fee (`NO FEE. STILL HITS.`), 🦭 Walrus 40%, 🎲 YOLO 45% (`ALL GOOD THINGS COME TO THOSE WHO… YOLO` / `…WAIT`), 🤖 Agents 24/7 25% (`AGENTS NEVER SLEEP` / `THE AGENT HALLUCINATED`).
  - **Walrus** stores a hit he dodged and adds it to his next hit that lands (`MEMWAL REMEMBERS`).
  - **Super "Agent Swarm":** a water wave of little agents, 8 hits of 4. `YOU HAVE NO IDEA HOW FAST`. KO: `MATERIALISED.` Loses: `SEE YOU IN CYCLE 2`.
- **Art and sound:** portraits and 16-bit sprites, and their own sound effects.
- **Daily Fight:** both join the daily draw on Oct 12, with Sergey. They're in Free play right away.
- The title intro fits ten portraits on the half-beats before the drop.

### Oct 5, 2026: domain, favicon, launch kit and link previews

- **proofoffight.com is live** (GitHub Pages, DNS at Porkbun), and hello@proofoffight.com forwards to the project inbox.
- **Link previews:** shared links now show a big card (all eight fighters facing off) instead of a tiny square, credited to @ProofOfFight. The image is `art/social/og.jpg`.
- **Favicon:** a gold PF tile in the browser tab (16, 32 and 48 px, drawn at each size so it stays sharp) and the full logo as the phone home-screen icon. It replaces the 🥊 emoji, which some browsers didn't show.
- **X account kit** in [docs/social/](docs/social/README.md): profile photo, header, handle and bio, a pinned launch post, and two weeks of posts (one spotlight per fighter, the Daily Fight, rivalries, a poll).
- **Launch clip:** 23 seconds, vertical, with the game's own sound, cut from a real fight with lucky dice (real damage and odds).

### Oct 4, 2026 (night): new win, lose and hit sounds

Picked by ear from free CC0 sound packs (Kenney, OpenGameArt). Details and credits: [docs/audio/README.md](docs/audio/README.md#recorded-sounds-picked-oct-4-2026).
- **You win / You lose:** two chiptune tunes replace the old jingles.
- **Punches:** a real punch for red and pink hits, a bigger one for purple and Super hits.
- **K.O.:** a heavy boxing bell rings over the boom.
- **Super ready** chime and a softer **button tap**.
- Each fighter's own sounds are unchanged. If a file can't load, the old synth sound plays.

### Oct 4, 2026 (later): Sergey joins the roster

The eighth fighter, and the first of the three new ones (CZ and Adeniyi wait on their art). Details: [docs/supers/sergey.md](docs/supers/sergey.md).
- **Buttons:** 📡 CCIP (`THE DATA ARRIVED`), 👕 The Shirt, 🏦 Bank Pilot 50% (`LIVE AT SIBOS` / `STILL A PILOT`), 💰 Next $600T 15% (`THE NEXT $600 TRILLION` / `NO PRICE CALLS`).
- **The Shirt** is a new kind of blue button: he never hides (their attack still lands), but when it works (30%) they stare at the pattern and **lose their next turn** (👀 STARING, `LOST IN THE PATTERN`).
- **Super: Link Marines.** The target says `THE TOKEN ISN'T NEEDED`; a column of Marines in helmets and blue flannel charges through them (one carries a `$1,000 EOY` sign). `$34 TRILLION`. 4 hits of 6, and they lose 3 Blocks. KO: `THE TOKEN IS NEEDED`. CPU after-Super: `STAY POOR`. Loses: `SEE YOU AT SIBOS`. Beating Garlinghouse: `THE MARINES OUTRANK THE ARMY`.
- **Art and sound:** portrait and 16-bit sprite (the sprite's gray plaid tinted to match the portrait's blue), and his own sound effects (data chirp, hypnotic warble, PA chime, a busy signal for NO PRICE CALLS, a bugle charge for the Marines).
- **Daily Fight:** he's in Free play now and joins the daily draw on Oct 12, so no day's matchup changes halfway through. A daily in progress also remembers its matchup.
- The title intro fits eight portraits on the beats before the drop (half-beats once there are more than eight).

### Oct 4, 2026: How to Play brought up to date

The help screen still described the old generic buttons (Strike / Privacy / Mint / Rug, "ARTWORK SUCKS"). It's now built from the game data, so it can't drift again:
- Opened in a fight, it shows **your fighter's** buttons, damage and odds (Toly: Comrades, Seed Vault 35%, Slop Cannon 50%, MEV Hunt 30%) and what your Super does.
- From the menu, it explains the five jobs by color, notes that every fighter renames them, and calls out Saylor's own numbers.
- New: a **Supers** list (what each one actually does, from its real effect), the **Braced** status, the 30-turn rule (more HP left wins, ties go to you), and sound switches and keyboard keys.

### Oct 3, 2026 (evening): sound

Music and sound effects. Details: [docs/audio/README.md](docs/audio/README.md).
- **PRESS START:** every visit opens on it (browsers need a tap before sound). The tap starts the menu song two bars before its drop; a portrait pops in on each beat and the logo slams in on the drop.
- **Two songs** (made in Suno): a dubstep menu track and a 16-bit dubstep fight track, cut into seamless loops on bar lines. The fight song ducks under Supers and cuts at the K.O.; the menu song returns on the result screen.
- **About 70 synthesized arcade sound effects:** every fighter's buttons (land and flop) and every Super, timed to its animation. Plus a K.O. sting, win/lose jingles, a Super-ready chime and button taps.
- **Switches:** Music and Sounds on the title screen, a mute button in the fight HUD. `?sounds` opens a sound test with every sound by name.
- Long fighter names (Garlinghouse) now shrink to fit the fight HUD instead of being cut off.

### Oct 3, 2026: Charles's Super cleaned up, KO lines fixed

- **Midnight Express is readable now.** The peer-reviewer emojis are gone (they didn't read for casual players). Instead Charles is on a video, `SURPRISE AMA` at `0:07 / 3:47:12`, and his captions type at reading speed: `SO, TO GIVE SOME CONTEXT,` / `BACK IN 2015 WE—`. The lights go out mid-word, a 💤 rises (the Sleep effect explained), then `MIDNIGHT EXPRESS` / `BIGGER THAN ZCASH` with time to read them. About 5 seconds; tap to skip still works.
- **KO lines match the button.** A renamed button without its own KO line now finishes with its success line, so a Peer Review KO reads `PEER REVIEWED` instead of the generic `JPEG TO THE FACE`. Same for every fighter's pink and purple buttons (Slop Cannon: `SLOP, KINO, SKIBIDI BOP`, Lawsuit: `WE WILL PREVAIL`, Leios: `THE MAGIC OF LEIOS`, ...).
- **Charles's portrait** no longer shows a strip of red under his shirt in the round frames. The art tool now warns when a crop would cause that.
- **Landscape phones:** Super cut-ins get a smaller portrait and text so everything fits; Charles's video, Toly's brochure and Saylor's chart move to the side.

### Oct 2–3, 2026: fighter art for all seven

The art style is locked. Fighters get it one at a time. Guide, prompts and status: [docs/art/README.md](docs/art/README.md).
- **Portraits** are late-90s arcade character-select art (1:1); **bodies** are 16-bit pixel sprites (2:3). Both made in Grok Imagine. The joke is drawing the founders dead serious; the outfit carries the comedy.
- **Vitalik:** a glaring portrait in a purple unicorn tee on the title screen, picker, cut-in and result card; on stage, a lanky 16-bit sprite holding his green tea, standing a bit taller than the block bodies. When KO'd he falls flat on his back.
- **Toly:** a portrait in a black cap, blazer and headset mic; on stage, a 16-bit sprite holding a phone up at his opponent like he's selling it. Grok put the Solana logo on his cap in both images; it's painted out (no chain logos).
- **Mert:** bald with the shine, full beard, black tee; on stage, khakis, a tattoo sleeve and shades hooked on his collar. In his Super the sun beam now comes off the top of his portrait's dome.
- **Garlinghouse:** gray hair, stubble, navy suit with an open white collar; on stage he carries a beat-up leather briefcase (Settle, Lawsuit, the SEC years).
- **Adam Back:** orange cap worn backwards, wire glasses, gray beard, striped shirt over a blue tee; on stage he carries a miner's pickaxe (proof of work, his ⛏️ Hashcash button).
- **Charles:** the one fighter drawn grinning (he smiles in every photo): cowboy hat, glasses, beard, blue plaid; on stage, cowboy boots and a stack of papers under his arm (Peer Review).
- **Saylor:** gray hair, charcoal suit, orange tie; on stage he holds up a plain orange shield (his 🛡️ STRF brace, Bitcoin orange without the logo).
- In the Badger Dance Vitalik now wears the same purple unicorn tee (the old blue tee had an Ethereum-style diamond, and the rules say no chain logos).
- The title screen, picker, cut-ins, stage and result card now show real art for the whole roster. A future fighter without art falls back to the emoji and block body.

### Oct 2, 2026 (late night, later): Toly's buttons

Full concept and build notes: [docs/supers/toly.md](docs/supers/toly.md). His Super stays exactly as it is; the phone is the whole show.
- **Buttons:** ✊ Comrades (KO: `CHEAP FAST CHAIN GUD`) · 🗝️ Seed Vault (`SEED VAULT HAS THE KEYS` / `THE PHONE IS THE SHOW`) · 🗑️ Slop Cannon (`SLOP, KINO, SKIBIDI BOP` / `NOT IN PROD`) · 🥪 MEV Hunt (`DRONE THE SANDWICHERS` / `OUTAGE HIT THE BRIDGE`; `150MS FINALITY` when it hits someone who hid). Numbers unchanged.
- **Slop Cannon two turns running:** a pink `NO CHILL` pops over him (new repeat-line slot).
- `YOU GONNA GET WHAT YOU GONNA GET` when he loses, over him and on the result card.
- All seven fighters now have their own button names. Strike / Privacy / Mint / Rug remain the names of the jobs (help screen, docs).

### Oct 2, 2026 (late night): Vitalik's kit and the Badger Dance

Full concept and build notes: [docs/supers/vitalik.md](docs/supers/vitalik.md). His Super is renamed from Ultra Sound Moves to **Badger Dance**.
- **The cut-in is now the badger dance** from the conference video: a green screen of black-and-white badgers and a stage of people in lanyards, Vitalik front and center, everyone's arms straight out and flapping in sync. Same hypnosis effect (15 dmg + Hypnotized).
- When someone he hypnotized hits themselves: `DEFENSIVE ACCELERATION` (d/acc). Super KO `THERE IS ONLY LOVE`, loser wears the Milady PFP (🎀). `MILADY IS BACK` after CPU Vitalik's Super.
- **Buttons:** 📝 Essay Drop (KO: `READ THE BLOG POST`) · 🫥 Privacy Pool (`FIGHT CHAT CONTROL` / `I CHOOSE BALANCE`) · 🧸 Soulbound (`NON-TRANSFERABLE` / `SOULBOUND AND ALSO UGLY`) · 🌱 Public Goods (`QUADRATIC FUNDING` / `UNDERFUNDED`). `SOUNDPROOF WALL` when an attack misses him. He holds a 🍵 on stage.

### Oct 2, 2026 (night): Adam Back's kit

Full concept and build notes: [docs/supers/adam.md](docs/supers/adam.md). The joke is his tone: short, technical, slightly smug, the other chain already lost.
- **Correction:** his old Super line `80 BYTES. NOT ONE MORE.` had him arguing the opposite of his real position (he backed lifting the limit). Now `FORK AROUND AND FIND OUT`. The OP_RETURN gun stays.
- **Buttons:** ⛏️ Hashcash (KO: `GAME OVER`) · 🧅 Cypherpunk (`PRIORITIZE 1` / `FILTERED BY KNOTS`) · 🖼️ Inscription (`FEES ARE THE FILTER` / `THAT'S NOT WHAT BITCOIN IS FOR`) · 🍴 Soft Fork (`THE LAST SOFT-FORK` / `NOT BY POPULAR VOTE`). Numbers unchanged.
- **Super KO** `CHECKMATE FORKERS`, the loser holds 🧂. `SALTY TEARS` when the gun strips a HODL; `SIT BY THE MEMPOOL LONG ENOUGH` after CPU Adam's Super.
- All seven fighters now have their new kits.

### Oct 2, 2026 (evening): Garlinghouse's kit

Full concept and build notes: [docs/supers/garlinghouse.md](docs/supers/garlinghouse.md). He's the straight man; the price calls belong to the crowd.
- **Buttons:** 💸 Settle (KO: `PERFECT CAN'T BE THE ENEMY OF GOOD`) · 🏛️ In The Room, now 25% (`PROUD TO BE IN THE ROOM` / `BLOCKED BY THE ANTI-CRYPTO ARMY`) · 💵 RLUSD (`YOU'LL HEAR IT FROM RIPPLE FIRST` / `UTILITY TBD`) · ⚖️ Lawsuit, now 20% (`WE WILL PREVAIL` / `I'M NOT SURPRISED. I'M PISSED.`).
- **Super: XRP Army** keeps its 5 × 5 chip damage, with a TikToker yelling `$589 BY FRIDAY`, a `SWIFT IS DEAD` sign, a gold truck at 1940 speed, and Garlinghouse saying `RIPPLE 3, SEC 0`. KO `WE WON. THEY LOST.`
- `HOW ARE PEOPLE STILL FIGHTING THIS?!` after CPU Garlinghouse's Super; `THIS ONE STINGS` when he loses (new loser-line slot, shown on the result card).
- CPU Garlinghouse was the hardest opponent (players won 54%); now about 68%, like everyone else.

### Oct 2, 2026 (later): Charles's Midnight kit

Full concept and build notes: [docs/supers/charles.md](docs/supers/charles.md).
- **Buttons:** 🧊 Glacier Drop (KO: `BANK THE UNBANKED`) · 🔏 ZK Proof, now 55% (`SELECTIVE DISCLOSURE` / `WELCOME TO FUD LAND`) · 📜 Peer Review (`PEER REVIEWED` / `REVISE AND RESUBMIT`) · ✨ Leios (`THE MAGIC OF LEIOS` / `ROADMAP SAYS Q4`).
- **Super: Midnight Express** replaces Peer Review, same effect (15 dmg + Sleep + they lose 3 Blocks): the peer reviewers nod, his sentence types out, the lights go out mid-word, then `MIDNIGHT EXPRESS` / `BIGGER THAN ZCASH`. KO `LFG 2027`.
- `I AM NOT ACCOUNTABLE` when an attack misses him; `I'M HERE TO STAY` after CPU Charles's Super; `DEAL WITH IT.` on the opponent's sleeping turn; `BIGGER THAN ZOLANA` when he beats Mert.
- Share text keeps acronyms as written (`LFG 2027`, not "Lfg 2027").

### Oct 2, 2026: MSTR replaces STRD on Saylor's purple button

📈 **MSTR** *Strategy*: the common stock gets the big-gamble button. **High beta:** when it lands it rolls anywhere from 15 to 45 damage (average 30, the same as STRD had, so balance holds: still 75%). 25%, steals 2 Blocks, hits through dodges. Lands: `INFINITE MONEY GLITCH` with a green `MSTR ▲ 37%` ticker over Saylor (the roll is the day's move). Flops: `mNAV BELOW 1` / `MSTR ▼`. KO with it: `NUMBER GO UP`. STRD is retired; its lines stay in docs/supers/saylor.md.

### Oct 1, 2026 (later): Saylor's ticker kit

Full concept and build notes: [docs/supers/saylor.md](docs/supers/saylor.md). Saylor is the first fighter whose buttons also *work* differently, not just renamed:
- 📬 **STRC** (red): 10 dmg, always. KO line `STRETCH`.
- 🛡️ **STRF** (blue): never hides. Always works, halves Strike/Mint/Rug damage this turn, +1 Block. `SENIOR CLAIM`.
- 🔄 **STRK** (pink): 20 dmg, 45%. `CONVERTED` / `STILL PREFERRED`.
- 🎲 **STRD** (purple): 30 dmg, 25%, steals 2 Blocks, hits through dodges. `STRIDE CLEARED` / `DIVIDEND FORFEITED`.
- **Super: Another Orange Dot**: orange dots stamp onto his tracker chart, `A LITTLE MORE ORANGE`, 25 dmg + HODL. A Super KO plays the astronaut DJ (`FIAT AS A STORE OF VALUE` / `WE CALL THEM POOR`), and the loser holds 💵.
- Saylor beating Toly reads `THERE IS NO SECOND BEST`. CPU Saylor after his Super: `THE NEXT DOT IS THE IMPORTANT ONE`.
- HP back to 100: STRF is his tank move now. Simulated, he's exactly as strong as before (75% for a sensible player), and turtling behind STRF doesn't work (2%).
- Footer now says "Not financial advice." (real securities on the buttons).

### Oct 1, 2026: Mert's kit, and fighters can rename their buttons

Full concept and build notes: [docs/supers/mert.md](docs/supers/mert.md).
- **Per-fighter button names.** Every fighter keeps the same five buttons, colors, jobs and numbers, but can rename the first four with their own emoji and banner lines (section 6). Mert is first: 🗯️ Shitpost · 🕶️ Zolana · 🪙 Memecoin · ⛔ Rate Limit. Everyone else keeps Strike / Privacy / Mint / Rug until their names are drafted. The opponent's move label above their head is tinted by job, so a renamed button still reads as "the big gamble".
- **Mert's Super is now CEO of Helium:** the name card flickers HELIUS → HELIUM → HIVEMAPPER, sun off the dome, `THE RPCS DID THIS`, 8 damage + Blind, KO `TRILLIONS` (loser holds a 🎈). Blinded opponents get `WHO WAS THAT` and a 🙈 on their skipped turn. Mert's head is now 👨‍🦲.

### Sept 30, 2026: Toly's Super is now Second Best Salesman

Full concept and build notes: [docs/supers/toly.md](docs/supers/toly.md). Same 35-damage nuke, new everything else: he sells the opponent a phone so hard it counts as a haymaker. KO line `HATER CONVERTED`. Toly beating Saylor (any move) reads `THERE IS A SECOND BEST`. Firedancer is retired from the screen. Super concepts now live in `docs/supers/`, one file per fighter.

### Sept 28, 2026: first playable build

Everything below this section already reflects these changes. The exact numbers live in `js/data.js`.

- **Balance fix.** In the draft numbers, Strike beat Mint and Rug on average for every character, so spamming Strike won 76–91% of fights and the jokes lived on the losing buttons. New numbers: Strike 10, Mint 24, Rug 36, and **Rug hits Hidden targets** ("you can't hide from a rug"). Saylor starts at 105 HP. The draft numbers are still selectable on the title screen as "Original draft numbers" so you can feel the difference.
- **Contradiction 1 fixed (XRP Army vs Hidden).** Supers can't be dodged, full stop. XRP Army always lands.
- **Contradiction 2 fixed (CPU Super timing).** The CPU always fires its Super the turn its meter reaches 10. The per-character timing rules are gone. The player gets an on-screen warning that turn.
- **Contradiction 3 fixed (missing numbers).** Every Super, the Rug recoil, status durations and the exact turn order now have numbers (sections 6, 7, 10, 11).
- **Vitalik's Super is now Ultra Sound Moves.** An awkward arms-out dance in front of a big screen of dancing bears doing the same thing. It hypnotizes: the target's next attack hits themselves. Soulbound Teddy is retired; the Teddy and Reviewed statuses are gone.
- **Daily Fight moved into v1** (section 14). Wordle model: same matchup and luck for everyone each day, one try, share an emoji grid.
- **Phone-first layout.** Portrait, no rotation needed. Landscape phones get a side-by-side layout.
- Supers for Charles, Adam and Vitalik were bumped after balance simulations (`node tools/sim.js`).

---

## 1. What this game is

A browser game. Single player vs the computer.

It *looks* like a 2D arcade fighter (Street Fighter / Tekken stage, two sprites, super name-card). It *plays* turn-based. You tap a button, the CPU taps a button, a short scene plays, numbers resolve, repeat until someone hits 0 HP.

It is not:

- Real-time fighting with combos and hitboxes
- Simultaneous lock-in PvP with another human
- A campaign / party RPG
- An on-chain STEPN-style mint economy
- Anything connected to coloredskyscore.com

Players will open a link, play today's Daily Fight (or pick a fighter in Free Play), then share the result.

---

## 2. Separation rules (non-negotiable)

Proof of Fight and coloredsky score are different products.

| Thing | Proof of Fight | coloredsky score |
|---|---|---|
| Domain | proofoffight.com only | coloredskyscore.com only |
| GitHub repo | `proof-of-fight` | `coloredskyscore` |
| Branding | Game title, fighter art, joke copy | Ratings dashboard |
| Footer / links | Do not link the score site | Do not link the game |
| Hosting | Own Pages / Cloudflare project | Existing Pages project |

Same GitHub *account* is fine. Same brand, domain, favicon, or CNAME is not.

Porkbun is the domain registrar only. Do not buy Porkbun hosting (Link in Bio, Articulation, cPanel, Static Hosting, Easy PHP). Host static files later on GitHub Pages or Cloudflare Pages for free.

---

## 3. v1 in one paragraph

Seven caricature fighters. One CPU opponent. Five buttons: **Strike**, **Privacy**, **Mint**, **Rug**, **Super**. A **Blocks** meter of 10 squares. Super spends the whole row and plays a 2–3 second cut-in. Fight ends at 0 HP. A **Daily Fight** gives everyone the same matchup each day. After the fight, share an emoji grid of how it went. No accounts. No wallet. No PHP.

---

## 4. Core loop

1. Title screen → **Daily Fight** (fixed matchup for the day) or **Free Play** (pick your fighter → pick CPU opponent, or the suggested first fight).
2. Both start at **100 HP** and **0 / 10 Blocks**.
3. You choose a move.
4. CPU chooses a move using that character's personality table.
5. Resolve in order: Super → Privacy (Hidden or not) → Strike / Mint / Rug (see section 7 for the exact rules).
6. Banners fire (`ARTWORK SUCKS!`, `VIEW KEY LEAKED`, etc.).
7. Repeat until one HP bar is empty.
8. Result card + emoji grid + **Share** / **Post on X**.

Win condition: reduce the opponent to 0 HP. Supers change *how* you get there. They are not a second win condition.

---

## 5. Resources

### HP
- Start at 100.
- Integers only. No decimals. Half damage rounds up.

### Blocks (the meter)
Not "aura." Not "guard."

- A row of **10 empty sockets** on each fighter's panel, filling left to right.
- Visual: thick chain-block rectangles, same size, tiny hash scratch on each face.
- Super costs **10 Blocks** and drains the row to empty.
- You cannot bank a second Super.

| Action | Blocks gained |
|---|---|
| Strike | +2 |
| Privacy success (Hidden) | +3 |
| Privacy fail (visible) | +1 |
| Mint success | +2 |
| Mint fail | +1 |
| Rug success | steal 2 from opponent |
| Rug fail | lose 2 (if you have 0, take 5 damage instead) |
| Got hit by Strike / Mint / Rug | +1 (Supers don't give this) |
| Super | spend 10, gain 0 |

Strike and Mint give their Blocks even if the target was Hidden.

---

## 6. The five buttons

Every fighter has the same five buttons: same colors, same jobs. A fighter can **rename** the first four (name, emoji, banner lines); see `docs/supers/README.md` for the slots. A fighter can also have **their own numbers** for a button, or (rarely) a button that works differently, but only after a simulator pass. All of them have their own names:

| Fighter | 🔴 Red (Strike) | 🔵 Blue (Privacy) | 🩷 Pink (Mint) | 🟣 Purple (Rug) |
|---|---|---|---|---|
| Toly | ✊ Comrades | 🗝️ Seed Vault *(35%)* | 🗑️ Slop Cannon *(50%)* | 🥪 MEV Hunt *(30%)* |
| Mert | 🗯️ Shitpost | 🕶️ Zolana | 🪙 Memecoin | ⛔ Rate Limit |
| Saylor | 📬 STRC | 🛡️ STRF: *always works, halves damage, +1 Block, never hides* | 🔄 STRK: *20 dmg* | 📈 MSTR: *15–45 dmg, rolled each time* |
| Charles | 🧊 Glacier Drop | 🔏 ZK Proof *(55%)* | 📜 Peer Review | ✨ Leios |
| Garlinghouse | 💸 Settle | 🏛️ In The Room *(25%)* | 💵 RLUSD | ⚖️ Lawsuit *(20%)* |
| Adam Back | ⛏️ Hashcash | 🧅 Cypherpunk *(70%)* | 🖼️ Inscription *(15%)* | 🍴 Soft Fork *(10%)* |
| Vitalik | 📝 Essay Drop | 🫥 Privacy Pool *(55%)* | 🧸 Soulbound *(35%)* | 🌱 Public Goods *(20%)* |
| Sergey | 📡 CCIP | 👕 The Shirt: *30%, never hides; when it works they lose their next turn* | 🏦 Bank Pilot *(50%)* | 💰 Next $600T *(15%)* |
| CZ | 🔐 SAFU | 4️⃣ Ignore FUD: *always works; red and pink do nothing, purple half* | 📋 Top 4 List *(45%)* | 🛥️ Da Moon *(25%)* |
| Adeniyi | 🆓 Zero Fee | 🦭 Walrus *(40%; a dodged hit is stored for his next hit)* | 🎲 YOLO *(45%)* | 🤖 Agents 24/7 *(25%)* |

The rest of this section uses the generic names (the jobs).

### Strike
The only honest move. Always hits if the target is not Hidden. **10 damage.** +2 Blocks. No joke banner unless it KOs.

This exists so the match is not a slot machine.

### Privacy
Zcash-flavored dodge. Replaces Guard.

- Success: **Hidden** for the rest of this turn. Incoming Strike and Mint miss. Rug still hits. Supers still hit. +3 Blocks.
- Fail: stay visible, take full damage if they attacked, +1 Block. Banner examples: `VIEW KEY LEAKED` / `EXPLORER SAYS HI` / `YOUR MEMO WAS EMPTY`.

Hide chance is per character (see roster).

### Mint
Launch an NFT at them.

- Success: **24 damage** + 2 Blocks. A JPEG slap.
- Fail: 0 damage, +1 Block, banner: **ARTWORK SUCKS!** plus a character-specific extra line.

### Rug
High-risk drain.

- Success: **36 damage** + steal 2 Blocks. **Hits even if the target is Hidden** (you can't hide from a rug).
- Fail: lose 2 Blocks (or take **5 recoil damage** if already at 0 Blocks) + humiliating banner.

### Super
Requires 10 Blocks. **Never whiffs and can't be dodged**, not even by a successful Privacy. Plays the character cutscene. Then apply that Super's effect. Bar empties.

If both sides Super on the same turn, player Super plays first in v1 (simple). Revisit later if it feels unfair.

---

## 7. Turn resolution order

Both sides lock a move at the same time (the CPU never sees yours). Then:

0. **Last turn's statuses kick in.** A Blind or Asleep fighter skips this turn. A Hypnotized fighter's Strike / Mint / Rug targets themselves this turn.
1. **Supers**, player first. They can't be dodged. Blind, Sleep and Hypnotized land on the target's *next* turn (both moves are already locked this turn). HODL starts immediately.
2. **Privacy** rolls. Apply Hidden or fail banners.
3. **Strike / Mint / Rug**, player first. Strike and Mint miss Hidden targets. Rug doesn't.
4. **HODL** ticks down.

**KO is instant.** The moment someone hits 0 HP the fight ends, even mid-turn, so there are no double KOs. Because the player goes first in each step, the player wins exact ties.

**Turn cap: 30.** If nobody is down after turn 30: banner `CHAIN HALTED`, higher HP percentage wins.

If both Rugs fail: extra banner `MUTUAL REKT`.

---

## 8. Roster (v1 playable)

Use caricatures and in-game titles. Do not use photographs. Do not use official chain logos as attack icons.

| ID | In-game name | Source handle | Lane |
|---|---|---|---|
| `toly` | Toly | @toly | Throughput / phone sales |
| `mert` | Mert | @mert | Infra / every bald guy ever |
| `garlinghouse` | Garlinghouse | @bgarlinghouse | Settlements / straight man |
| `vitalik` | Vitalik | @VitalikButerin | Research / the badger dance |
| `adam` | Adam Back | @adam3us | Cypherpunk / hashcash |
| `charles` | Charles | @IOHK_Charles | Midnight / Dire Wolf Mode |
| `saylor` | Saylor | @saylor | Tank / preferred stock |
| `sergey` | Sergey | @SergeyNazarov | Oracles / the shirt |
| `cz` | CZ | @cz_binance | Exchange / ignore FUD |
| `adeniyi` | Adeniyi | @EmanAbio | Agentic finance / hype man |

Anatoly Yakovenko is **Toly** in-game. Not "Antonoly."

Bosses (Warren, Gensler, TradFi) are **not** v1. They wait until the arena is fun. CZ and Adeniyi are drafted and next in line (waiting on art).

---

## 9. Odds tables

### Privacy (hide chance)

| Character | Hide % | Why |
|---|---|---|
| Adam Back | 70 | Cypherpunk: `PRIORITIZE 1`. This is his whole personality |
| Vitalik | 55 | Privacy Pool: `FIGHT CHAT CONTROL` / `I CHOOSE BALANCE` |
| Charles | 55 | ZK Proof: `SELECTIVE DISCLOSURE`. Selective disclosure is the whole pitch |
| Mert | 45 | Zolana: `EVERY BALD GUY EVER` / `VIEW KEY LEAKED` |
| Toly | 35 | Seed Vault: `THE PHONE IS THE SHOW`. The salesman wants to be seen |
| Garlinghouse | 25 | In The Room: `BLOCKED BY THE ANTI-CRYPTO ARMY`. A settlements guy, bad at hiding |
| Saylor | — | His blue button (STRF) never hides; it always works and halves the damage |
| Sergey | 30 (stun) | The Shirt never hides. When it works, they lose their next turn: `THE PATTERN MOVES` / `IT'S NOT ABOUT FASHION` |
| Adeniyi | 40 | Walrus: `STORED ON WALRUS` / `MEMORY WIPED`. A hit he dodges comes back on his next hit |
| CZ | — | Ignore FUD never hides; it always works: red and pink do nothing, purple half |

### Mint (JPEG lands)

| Character | Success % | Fail extra line |
|---|---|---|
| Garlinghouse | 55 | RLUSD: `UTILITY TBD` |
| Sergey | 50 | Bank Pilot: `STILL A PILOT` |
| CZ | 45 | Top 4 List: `ONLY GOT TO 3` |
| Adeniyi | 45 | YOLO: `…WAIT` |
| Toly | 50 | Slop Cannon: `NOT IN PROD` |
| Mert | 45 | Memecoin: `SNIPED IN BLOCK ZERO` |
| Charles | 40 | Peer Review: `REVISE AND RESUBMIT` |
| Vitalik | 35 | Soulbound: `SOULBOUND AND ALSO UGLY` |
| Saylor | 45 | STRK: `STILL PREFERRED` (20 dmg) |
| Adam Back | 15 | Inscription: `THAT'S NOT WHAT BITCOIN IS FOR` |

### Rug

| Character | Success % | Fail line |
|---|---|---|
| Mert | 40 | Rate Limit: `STATUS PAGE: ALL GREEN` |
| Garlinghouse | 20 | Lawsuit: `I'M NOT SURPRISED. I'M PISSED.` |
| Toly | 30 | MEV Hunt: `OUTAGE HIT THE BRIDGE` |
| Charles | 25 | Leios: `ROADMAP SAYS Q4` |
| Vitalik | 20 | Public Goods: `UNDERFUNDED` |
| Saylor | 25 | MSTR: `mNAV BELOW 1` (15–45 dmg) |
| Adam Back | 10 | Soft Fork: `NOT BY POPULAR VOTE` |
| Sergey | 15 | Next $600T: `NO PRICE CALLS` |
| CZ | 25 | Da Moon: `STILL DOCKED` |
| Adeniyi | 25 | Agents 24/7: `THE AGENT HALLUCINATED` |

Adam is *bad* at rugs on purpose. Saylor's MSTR lands more often than his old rug, and its damage swings (15–45).

---

## 10. Supers

Cutscene budget for v1: **2–3 seconds**, same template for everyone.

1. Screen slam + name card
2. Portrait + one prop
3. One voice line in big text
4. Impact → back to HP bars

No 12-second animated films in v1.

All Supers can't be dodged. Numbers are locked for v1 (tune in `js/data.js`).

| Character | Super | What you see | Effect | KO finish line |
|---|---|---|---|---|
| Mert | **CEO of Helium** ([doc](docs/supers/mert.md)) | Name card flickers HELIUS / HELIUM / HIVEMAPPER, then locks. Sun catches the dome, beam sweeps their eyes. "THE RPCS DID THIS" | **8 dmg + Blind** (they skip their next turn; `WHO WAS THAT`) | TRILLIONS |
| Toly | **Second Best Salesman** ([doc](docs/supers/toly.md)) | A brochure of phone bricks fans open, he slaps a `BUY NOW` phone into them, airdrop confetti. "APPLE + SOLANA MOBILE: 3.469 BILLION" | **35 dmg**, one hit | HATER CONVERTED |
| Garlinghouse | **XRP Army** ([doc](docs/supers/garlinghouse.md)) | Polo-shirt army jogs across; a TikToker yells `$589 BY FRIDAY`, a `SWIFT IS DEAD` sign, a gold truck at 1940 speed; he says "RIPPLE 3, SEC 0", slightly embarrassed | **5 hits × 5 dmg = 25** | WE WON. THEY LOST. |
| Charles | **Midnight Express** ([doc](docs/supers/charles.md)) | His nearly-four-hour video (`SURPRISE AMA`, `0:07 / 3:47:12`), captions typing at reading speed; the lights go out mid-word; moon, stars, 💤, "BIGGER THAN ZCASH" | **15 dmg + Sleep** (skip next turn) **+ they lose 3 Blocks** | LFG 2027 |
| Saylor | **Another Orange Dot** ([doc](docs/supers/saylor.md)) | Orange dots stamp one by one onto his tracker chart. "A LITTLE MORE ORANGE". On a KO: the astronaut DJ, `FIAT AS A STORE OF VALUE` / `WE CALL THEM POOR` | **25 dmg + HODL** (Saylor takes half damage this turn and next) | WE CALL THEM POOR |
| Adam Back | **OP_RETURN** ([doc](docs/supers/adam.md)) | Long-barreled gun etched `OP_RETURN` fires a data blob. "FORK AROUND AND FIND OUT". `SALTY TEARS` if it strips a HODL | **Prune** (strips their HODL) **then 25 dmg** | CHECKMATE FORKERS |
| Vitalik | **Badger Dance** ([doc](docs/supers/vitalik.md)) | The badger dance: a green screen of badgers and a stage of people in lanyards, arms straight out, flapping in sync; Vitalik front and center. "DON'T LOOK AT THE DANCE." Their self-hits read `DEFENSIVE ACCELERATION` | **15 dmg + Hypnotized** (their next Strike / Mint / Rug hits themselves) | THERE IS ONLY LOVE |
| Sergey | **Link Marines** ([doc](docs/supers/sergey.md)) | The target says `THE TOKEN ISN'T NEEDED`; Marines in helmets and blue flannel charge through them, one with a `$1,000 EOY` sign. "$34 TRILLION" | **4 hits × 6 dmg = 24 + they lose 3 Blocks** | THE TOKEN IS NEEDED |
| CZ | **4** ([doc](docs/supers/cz.md)) | The white Nissan SUV rolls in (`MY LAMBORGHINI`); FUD, FAKE NEWS and ATTACKS fly at him and shatter; a huge 4. "IGNORE FUD, FAKE NEWS, ATTACKS" | **20 dmg + FUD-proof** (red, pink and purple do nothing to him this turn and next) | 4 MONTHS |
| Adeniyi | **Agent Swarm** ([doc](docs/supers/adeniyi.md)) | A water wave rolls across with little agents riding the crest. "YOU HAVE NO IDEA HOW FAST" | **8 hits × 4 dmg = 32** | MATERIALISED. |

Non-Super KO finish lines: a button's own KO line if it has one (below), else that button's success line (Peer Review: `PEER REVIEWED`). The generic Strike `HONEST WORK`, Mint `JPEG TO THE FACE`, Rug `EXIT LIQUIDITY` only show for a button with neither (today: Mert's Shitpost reads `HONEST WORK`). Hitting yourself: `SELF-REKT`.

**Rival KO lines** replace the finish line for one specific matchup, by any move: Toly beating Saylor reads `THERE IS A SECOND BEST`, Saylor beating Toly reads `THERE IS NO SECOND BEST`, Charles beating Mert reads `BIGGER THAN ZOLANA`, Sergey beating Garlinghouse reads `THE MARINES OUTRANK THE ARMY`.

**Per-button KO lines**: Toly landing the KO with Comrades reads `CHEAP FAST CHAIN GUD`; Saylor landing the KO with STRC reads `STRETCH`, with MSTR `NUMBER GO UP`; Charles with Glacier Drop reads `BANK THE UNBANKED`; Garlinghouse with Settle reads `PERFECT CAN'T BE THE ENEMY OF GOOD`; Adam with Hashcash reads `GAME OVER`; Vitalik with Essay Drop reads `READ THE BLOG POST`; Sergey with CCIP reads `THE DATA ARRIVED`; CZ with SAFU reads `FUNDS ARE SAFU`; Adeniyi with Zero Fee reads `NO FEE. STILL HITS.`

**Loser lines** pop over the loser and are quoted on the result card: Garlinghouse `THIS ONE STINGS`, Toly `YOU GONNA GET WHAT YOU GONNA GET`, Sergey `SEE YOU AT SIBOS`, CZ `BACK TO GIGGLE ACADEMY`, Adeniyi `SEE YOU IN CYCLE 2`.

**Repeat lines** pop over a fighter who presses the same button two turns running: Toly's Slop Cannon twice reads `NO CHILL`.

**CPU after-Super lines** show as a banner after a CPU's Super lands (not when it's the KO): CPU Toly says `SALES GOAL OF THE YEAR ACCOMPLISHED.`

---

## 11. Status effects (keep this list short)

| Status | Does | Cleared by |
|---|---|---|
| Hidden | Incoming Strike and Mint miss this turn. Rug and Supers still hit. | End of turn |
| Blind | Skip your next turn | After the skipped turn |
| Sleep | Skip your next turn | After the skipped turn |
| Staring (Sergey's The Shirt) | Skip your next turn | After the skipped turn |
| Hypnotized | Your next turn's Strike / Mint / Rug hits yourself (normal odds, full damage). Privacy and Super are safe, so a smart player hides. | After that turn |
| HODL | Take half damage (rounded up) this turn and next | Timer, or Adam's Prune |
| Braced (Saylor's STRF) | Half damage from Strike / Mint / Rug this turn (not Supers). Doesn't stack with HODL. | End of turn |
| Braced (CZ's Ignore FUD) | Strike and Mint do nothing; Rug does half (not Supers) | End of turn |
| FUD-proof (CZ's Super) | Strike, Mint and Rug do nothing (Supers still hit) | After the next turn |
| Stored (Adeniyi's Walrus) | A hit he dodged; added to his next Strike / Mint / Rug that lands | When it's used |

Blind, Sleep and Staring do not stack into a two-turn skip. If more than one lands, still one skipped turn.

---

## 12. CPU personality (v1 AI)

The CPU is always ready. No human is waiting.

Weights are "how often they try this." **Every CPU fires its Super the turn its meter reaches 10**, no exceptions, and the player sees a warning that turn. (The draft had per-character Super timing, but it contradicted "always at 10", so it's gone.)

| Character | Strike | Privacy | Mint | Rug |
|---|---|---|---|---|
| Saylor | High (STRC) | Low (STRF) | Medium (STRK) | Rare (MSTR) |
| Adam Back | Medium | Very high | Almost never | Almost never |
| Charles | Low | Medium | Medium | Low |
| Garlinghouse | Medium | Low | High | High |
| Toly | High | Low | Medium | Medium |
| Mert | Medium | Medium | Medium | Medium |
| Vitalik | Medium | Medium | Low | Low |

Weight values: Very high 6 · High 4 · Medium 3 · Low 2 · Rare 1 · Almost never 0.5.

v1 AI is a weighted random pick from that row. No pathfinding. No combo solver. A hypnotized CPU doesn't know it's hypnotized, which is the joke.

---

## 13. Stage and presentation

- **Phone first, portrait, no rotation needed.** Top: HP bars + Blocks rows (arcade HUD). Middle: the stage. Bottom, under your thumbs: a wide Super bar and a 2×2 grid of Strike / Privacy / Mint / Rug. Each button shows its damage and your odds.
- Landscape phones get the stage on the left and the buttons on the right. Desktop shows the phone layout centered.
- One 2D ground line. Two fighters facing each other. Background skyline is a candlestick chart.
- Banners in the center, huge, ugly, screenshottable.
- Caricature art, thick line, shared palette so it looks like one roster.
- No official logos.
- **Sound:** a menu song and a fight song (loops), synthesized arcade sound effects for every button and Super, PRESS START to start the music. See [docs/audio/README.md](docs/audio/README.md).
- **Art style (locked):** late-90s arcade portraits for the round faces (title, picker, cut-in, result card) and 16-bit pixel sprites on the stage. See [docs/art/README.md](docs/art/README.md) for the prompts and status.

The first playable used simple block fighters (colored body, emoji head). Fighters without art still do; art replaces them one fighter at a time.

---

## 14. Daily Fight and shareable results

### Daily Fight (Wordle model)
- One fight per day for everyone: same matchup, same seed (same luck). Day 1 is Saylor vs Mert (section 20).
- One try per day. Progress is saved in the browser, so closing the tab mid-fight resumes it.
- Tracks played / won / streak in the browser. No accounts.
- Resets at local midnight. The result card shows a countdown.
- Share text is an emoji grid, one square per turn:

```
Proof of Fight Daily #1 🥊
Saylor vs Mert: WON in 9 turns (41 HP left)
🟩🟩🟦🟥🟨🟩⬛🟩🟩🏆
https://proofoffight.com/
```

🟩 your attack landed · 🟦 you hid · 🟨 you used Super · 🟥 whiff or fail · ⬛ skipped · 🌀 hit yourself (hypnotized) · 🏆 / 💀 result.

### Preview images (before launch, no worker needed)
The preview picture under a link is what people see in their feed. Instead of one generic image, pre-render **49 static images** once ("Saylor beat Toly", one per winner/loser pair including mirrors) and put the matchup in the share link path (e.g. `/r/saylor-beat-toly/`). Still free static hosting.

### Result replay URL (next)
The engine already replays a fight exactly from its seed + move log (`replay()` in `js/engine.js`), so a URL can encode the fight. No database in v1.

Example shape:

```
https://proofoffight.com/r?v=1&a=saylor&b=warren&w=saylor&t=6&s=8f3a&m=...
```

v1 fields:

- `v` — schema version
- `a` — player fighter id
- `b` — CPU fighter id
- `w` — winner id
- `t` — turns
- `s` — seed
- `m` — compact move log

Opening `/r?...` shows the **result card** (portraits, winner, finish line, HP leftover, Copy tweet, Rematch).

Per-*fight* custom preview images (showing HP, turns) would need a tiny worker later. Per-*matchup* static images (above) cover launch.

Tweet template:

```
Saylor just folded Toly in 6 turns on Proof of Fight.
Low Latency Finish.
https://proofoffight.com/r?...
```

---

## 15. Legal / likeness

Living people. Public figures. Still a risk if you use photo-real faces and sell it.

v1 rules:

- Caricatures only
- In-game names / titles, not a lookalike sim
- No official trademarks as UI chrome
- Free, clearly satirical
- Do not advertise with their real photos

Revisit before any paid mint or merch.

---

## 16. What is explicitly later

Write these in `later.md` if they nag you. They are not v1.

- On-chain mint (spend SOL, roll traits, STEPN-style)
- Off-chain "Testnet Mint" trait roller (do this before mainnet if ever)
- Trait modifiers (`opsec`, `degen`, `jpeg`, `bandwidth`, `dome`)
- Human vs human
- Simultaneous move lock-in
- 3-person party
- ~~Campaign vs Warren / Gensler~~ Now Story mode: Schiff, Dimon, Warren, Sam Bankman-Fried, then WICK ([docs/story/](docs/story/README.md))
- Full anime video supers
- Marketplace, tokens, repair sinks
- Custom per-fight OG image worker + short IDs (`pof.gg/r/x7k2`)
- Smarter CPU (reads your statuses, e.g. hides when hypnotized)
- Toly v2 status tax `Seeker'd` (can't use Privacy for 2 turns). Parked until the nuke is funny; see docs/supers/toly.md
- Renamed buttons that also *work* differently (one twist per fighter at most, after a simulator pass)
- A rival KO line for Mert vs Garlinghouse
- Short redirect domain (`pof.gg`)

Trait idea, parked: same seven faces, rolled stats that only nudge the % tables above. Do not invent 200 characters.

---

## 17. Build order

Do not point DNS at an empty repo.

1. ~~Drop this file in the `proof-of-fight` repo as `GAMEPLAN.md` (and a short `README.md` that points at it).~~ Done.
2. ~~HTML dummy: two rectangles, HP, Blocks, five buttons, one CPU, banners in the console or on screen.~~ Done, plus Daily Fight and share grid.
3. ~~Play it until a Super cut-in makes you laugh. Tune numbers in `js/data.js`.~~ Done: all seven kits.
4. ~~Caricature portraits and sprites.~~ Done: all seven ([docs/art/](docs/art/README.md)).
   ~~Sound: music, effects, mute.~~ Done ([docs/audio/](docs/audio/README.md)).
   New fighters: Sergey, CZ and Adeniyi done.
   Story mode: the framework and boss 1 (Schiff) built Oct 7, boss 2 (Dimon) Oct 8, behind `?story` until the other bosses are in ([docs/story/](docs/story/README.md)).
   **← You are here.** Next: the other bosses, then step 5.
5. Then result URLs + the 49 matchup preview images.
6. ~~Then GitHub Pages or Cloudflare Pages.~~ Staying on GitHub Pages (free; soft limit 100 GB of traffic a month, roughly 40,000 first visits). Move to Cloudflare Pages only if traffic gets near that.
7. ~~Then Porkbun DNS: `proofoffight.com` → that host.~~ Done Oct 5: Porkbun DNS points at GitHub Pages; hello@proofoffight.com forwards to the project inbox.
8. Then tell anyone.

Do not open Pages or touch nameservers before step 2 exists.

---

## 18. Hosting checklist (when the dummy works)

- Repo: `proof-of-fight` only
- Host: Cloudflare Pages or GitHub Pages
- Domain: proofoffight.com at Porkbun, DNS only
- TLS: automatic from the host
- No PHP, no MySQL, no sitebuilder

---

## 19. Locked decisions (quick reference)

- Title: **Proof of Fight**
- Domain: **proofoffight.com**
- Mode: **single player vs CPU**, with a **Daily Fight** (same fight for everyone) and **Free Play**
- Look: **2D fighter stage**; art is **late-90s arcade portraits + 16-bit pixel sprites**
- Sound: **dubstep menu + fight songs, synthesized retro sound effects, PRESS START**
- Play: **turn-based buttons**
- Meter: **Blocks**, 10 squares
- Buttons: **Strike / Privacy / Mint / Rug / Super** (10 / hide / 24 / 36 / Super)
- Rug hits Hidden targets
- Super: named cutscene, 2–3 seconds, never whiffs, can't be dodged; CPU fires at 10
- Vitalik's Super: **Badger Dance** (hypnotizes; `THERE IS ONLY LOVE`). Buttons: **Essay Drop / Privacy Pool / Soulbound / Public Goods**
- Toly's kit: **Comrades / Seed Vault / Slop Cannon / MEV Hunt** + **Second Best Salesman** (35-damage phone sale, `HATER CONVERTED`)
- Mert's kit: **Shitpost / Zolana / Memecoin / Rate Limit** + **CEO of Helium** (8 dmg + Blind, `TRILLIONS`)
- Saylor's kit: **STRC / STRF / STRK / MSTR** + **Another Orange Dot** (`WE CALL THEM POOR`)
- Charles's kit: **Glacier Drop / ZK Proof / Peer Review / Leios** + **Midnight Express** (`LFG 2027`)
- Garlinghouse's kit: **Settle / In The Room / RLUSD / Lawsuit** + **XRP Army** (`WE WON. THEY LOST.`); price calls come from the crowd, never him
- Adam Back's kit: **Hashcash / Cypherpunk / Inscription / Soft Fork** + **OP_RETURN** (`CHECKMATE FORKERS`)
- Fighters rename their buttons (all seven do); jobs and colors stay shared, numbers only change after a simulator pass
- Roster: Toly, Mert, Garlinghouse, Vitalik, Adam Back, Charles, Saylor
- Share: emoji grid (now), encoded result URL (next)
- Layout: phone-first portrait
- Chain mint: later
- coloredskyscore: never mixed in

---

## 20. First fight to implement

**You: Saylor vs CPU: Mert**

Why: tank vs blind. Teaches Blocks, Super, and a missed turn. If that fight is not funny, nothing else will be.

It's the suggested fight in Free Play and it's **Daily Fight #1**.

---

## 21. Where things live in the code

| File | What's in it |
|---|---|
| `js/data.js` | Every number and joke line: damage, odds, HP, Blocks, CPU weights, Super effects, banners. Tune here. |
| `js/engine.js` | The rules (sections 5–12). No graphics. Same seed + same moves = same fight. |
| `js/app.js` | Screens, animations, cut-ins, Daily Fight, sharing. |
| `css/style.css` | The look. |
| `tools/sim.js` | `node tools/sim.js` plays thousands of fights and prints win rates per fighter. Run it after changing numbers. |
| `tools/check.js` | `node tools/check.js` checks the rules still work (Supers can't be dodged, Blind skips one turn, etc.). |
| `tools/story-sim.js` | `node tools/story-sim.js`: every founder against every story boss, with and without the assist and Satoshi. |
| `docs/story/` | Story mode: the bosses, the assists, Satoshi, and the Grok and Suno prompts for their art and music. |
| `docs/supers/` | One doc per fighter (Super concept, button names), plus a README of the slots the game supports. |
| `art/` | Fighter portraits and sprites (`<id>-head.webp`, `<id>-body.webp`). |
| `tools/art.py` | Cuts the white background off a Grok image and sizes it for the game (needs Pillow). |
| `docs/art/` | The art style, the Grok prompt templates, and which fighters have art. |
| `js/audio.js` | Music playback and every sound effect (synthesized recipes). |
| `audio/` | The two songs, cut into loops (`menu.mp3`, `fight.mp3`). |
| `tools/music.py` | Cuts a song into a seamless game loop. |
| `tools/sfx-levels.js` | Re-measures sound effect levels after a recipe changes. |
| `docs/audio/` | How the sound works, the songs' loop points, every fighter's sounds. |
