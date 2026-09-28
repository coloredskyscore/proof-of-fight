# Proof of Fight — Gameplan

**Working title:** Proof of Fight  
**Live URL (planned):** https://proofoffight.com  
**Repo:** `github.com/coloredskyscore/proof-of-fight` (separate project — not coloredskyscore)  
**Status:** Design lock for v1. No hosting pointed yet. No wallet. No on-chain mint.

This is the document to build from. If a feature is not in **v1**, it does not get built until the dummy fight is fun.

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

Players will open a link, pick a fighter, fight a CPU, then share a result link.

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

Seven caricature fighters. One CPU opponent. Five buttons: **Strike**, **Privacy**, **Mint**, **Rug**, **Super**. A **Blocks** meter of 10 squares. Super spends the whole row and plays a 2–3 second cut-in. Fight ends at 0 HP. After the fight, a unique URL replays the result card. No accounts. No wallet. No PHP.

---

## 4. Core loop

1. Title screen → pick your fighter → pick CPU opponent (or a fixed first fight).
2. Both start at **100 HP** and **0 / 10 Blocks**.
3. You choose a move.
4. CPU chooses a move using that character's personality table.
5. Resolve in order: Super → Privacy (Hidden or not) → Strike / Mint / Rug against whoever is still visible.
6. Banners fire (`ARTWORK SUCKS!`, `VIEW KEY LEAKED`, etc.).
7. Repeat until one HP bar is empty.
8. Result card + **Copy link** + **Copy tweet**.

Win condition: reduce the opponent to 0 HP. Supers change *how* you get there. They are not a second win condition.

---

## 5. Resources

### HP
- Start at 100.
- Integers only. No decimals.

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
| Rug fail | lose 2 (floor at 0) |
| Got hit while not Hidden | +1 |
| Super | spend 10, gain 0 |

---

## 6. The five buttons

### Strike
The only honest move. Always hits if the target is not Hidden. Small damage (~12). +2 Blocks. No joke banner unless it KOs.

This exists so the match is not a slot machine.

### Privacy
Zcash-flavored dodge. Replaces Guard.

- Success: **Hidden** for the rest of this turn. Incoming Strike / Mint / Rug miss. +3 Blocks.
- Fail: stay visible, take full damage if they attacked, +1 Block. Banner examples: `VIEW KEY LEAKED` / `EXPLORER SAYS HI` / `YOUR MEMO WAS EMPTY`.

Hide chance is per character (see roster).

### Mint
Launch an NFT at them.

- Success: medium damage (~18) + 2 Blocks. A JPEG slap.
- Fail: 0 damage, +1 Block, banner: **ARTWORK SUCKS!** plus a character-specific extra line.

### Rug
High-risk drain.

- Success: big damage (~28) + steal 2 Blocks.
- Fail: lose 2 Blocks (or take a small recoil slap if already at 0 Blocks) + humiliating banner.

### Super
Requires 10 Blocks. Never whiffs. Plays the character cutscene. Then apply that Super's effect. Bar empties.

If both sides Super on the same turn, player Super plays first in v1 (simple). Revisit later if it feels unfair.

---

## 7. Turn resolution order

1. If a fighter used Super, play that cutscene and apply its effect.
2. Privacy rolls. Apply Hidden or fail banners.
3. Strike / Mint / Rug resolve against targets that are not Hidden and not Sleep / Blind-skipped.
4. Tick timed statuses (HODL, Reviewed, Teddy, Sleep, Blind).
5. Check KO.

If both Rugs fail: extra banner `MUTUAL REKT`.

---

## 8. Roster (v1 playable)

Use caricatures and in-game titles. Do not use photographs. Do not use official chain logos as attack icons.

| ID | In-game name | Source handle | Lane |
|---|---|---|---|
| `toly` | Toly | @toly | Speed / throughput |
| `mert` | Mert | @mert | Infra / "I told you so" |
| `garlinghouse` | Garlinghouse | @bgarlinghouse | Lawyers and liquidity |
| `vitalik` | Vitalik | @VitalikButerin | Research / weird shield |
| `adam` | Adam Back | @adam3us | Cypherpunk grind |
| `charles` | Charles | @IOHK_Charles | Peer review / long speeches |
| `saylor` | Saylor | @saylor | Tank / orange pill |

Anatoly Yakovenko is **Toly** in-game. Not "Antonoly."

Bosses (Warren, Gensler, TradFi) are **not** v1. They wait until the seven-person arena is fun.

---

## 9. Odds tables

### Privacy (hide chance)

| Character | Hide % | Why |
|---|---|---|
| Adam Back | 70 | This is his whole personality |
| Vitalik | 55 | Privacy researcher, public face |
| Charles | 50 | Long paper, mid opsec |
| Mert | 45 | Infra guy who still lives on mainnet Twitter |
| Toly | 35 | Transparent high-performance capitalist |
| Garlinghouse | 30 | The lawsuit is the spotlight |
| Saylor | 20 | He wants you to see the orange |

### Mint (JPEG lands)

| Character | Success % | Fail extra line |
|---|---|---|
| Garlinghouse | 55 | `UTILITY TBD` |
| Toly | 50 | `FLOOR IS LATENCY` |
| Mert | 45 | `RIGHT-CLICK SAVED` |
| Charles | 40 | `PEER REVIEWERS HATED IT` |
| Vitalik | 35 | `SOULBOUND AND ALSO UGLY` |
| Saylor | 30 | `THIS IS NOT DIGITAL ENERGY` |
| Adam Back | 15 | `THAT'S NOT WHAT BITCOIN IS FOR` |

### Rug

| Character | Success % | Fail line |
|---|---|---|
| Mert | 40 | `DEV WALLET WAS A DECOY` |
| Garlinghouse | 35 | `SETTLEMENT PENDING` |
| Toly | 30 | `OUTAGE HIT THE BRIDGE` |
| Charles | 25 | `ROADMAP SAYS Q4` |
| Vitalik | 20 | `PUBLIC GOODS ONLY` |
| Saylor | 15 | `I DO NOT SELL` |
| Adam Back | 10 | `CAN'T RUG A HASH` |

Saylor and Adam are *bad* at rugs on purpose.

---

## 10. Supers

Cutscene budget for v1: **2–3 seconds**, same template for everyone.

1. Screen slam + name card
2. Portrait + one prop
3. One voice line in big text
4. Impact → back to HP bars

No 12-second animated films in v1.

| Character | Super | What you see | Effect |
|---|---|---|---|
| Mert | **Helius Flare** | Sun hits the dome, beam slaps their eyes | Small damage + **Blind** (they skip their next turn) |
| Toly | **Firedancer** | "INCREASING BANDWIDTH AND REDUCING LATENCY!!!" then a fat punch | Huge single hit. KO banner: **Low Latency Finish** |
| Garlinghouse | **XRP Army** | Polo-shirt normies jog across and body-check | 5 small hits, medium total. Hit 3 **breaks Hidden** if they were going to vanish next? Keep v1 simple: 5 chips, ignores nothing extra except it still requires they are not Hidden *this* turn |
| Charles | **Peer Review** | Five nerds with laptops; Charles starts a sentence that does not end | Almost no damage + **Sleep** (skip next turn) + **Reviewed** (their next Super needs 2 extra Blocks, i.e. 12 — or keep v1 as "next Super locked one extra turn"). *v1 simpler: Sleep only + next Super costs 12 Blocks if we can show 12. Otherwise Sleep + they lose 3 Blocks.* |
| Saylor | **No Second Best** | Bear drops in, he mounts it, points at camera, charges | Big hit + **HODL** for 2 turns (take half damage) |
| Adam Back | **OP_RETURN** | Long-barreled gun etched `OP_RETURN`, fires an **80 BYTES** blob | Medium damage + **Prune** (strip one buff: HODL, Reviewed, Teddy) |
| Vitalik | **Soulbound Teddy** | Beat-up stuffed bear/unicorn, tiny halo, cannot be traded | 0 damage. Teddy **eats the next incoming hit**, then pops |

Charles v1 lock (simple): Sleep + strip 3 Blocks from them (peer review delays the roadmap). Skip the "Super costs extra" rule until the dummy exists.

XRP Army v1 lock: 5 hits of 5 damage each (25 if all connect). Miss the whole thing if target is Hidden.

---

## 11. Status effects (keep this list short)

| Status | Does | Cleared by |
|---|---|---|
| Hidden | Incoming Strike / Mint / Rug miss this turn | End of turn |
| Blind | Skip your next action | After the skipped action |
| Sleep | Skip your next action | After the skipped action |
| HODL | Take half damage for 2 turns | Timer |
| Teddy | Absorb the next hit, then pop | One hit or Adam Prune |
| Reviewed | Flavor only in v1 unless we add the extra-Block tax later | — |

Blind and Sleep do not stack into a two-turn skip. If both land, still one skipped action.

---

## 12. CPU personality (v1 AI)

The CPU is always ready. No human is waiting.

Weights are "how often they try this when legal." Super is always used if Blocks == 10.

| Character | Strike | Privacy | Mint | Rug | Super rule |
|---|---|---|---|---|---|
| Saylor | High | Rare | Low | Almost never | Fire Super immediately at 10 |
| Adam Back | Medium | Very high | Almost never | Almost never | Super when they have a buff to Prune, else at 10 |
| Charles | Low | Medium | Medium | Low | Super as soon as 10 (he came to lecture) |
| Garlinghouse | Medium | Low | High | High | Super at 10 |
| Toly | High | Low | Medium | Medium | Super at 10 (he is hunting the Firedancer KO) |
| Mert | Medium | Medium | Medium | Medium | Super at 10, prefers it if you have Blocks to waste via Blind |
| Vitalik | Medium | Medium | Low | Low | Super when HP < 40 (teddy as panic shield), else at 10 |

v1 AI can be a weighted random pick from that row. No pathfinding. No combo solver.

---

## 13. Stage and presentation

- One 2D ground line. Two fighters facing each other.
- HP bar + Blocks row over each.
- Move buttons docked at the bottom for the player only.
- Banners in the center, huge, ugly, screenshottable.
- Caricature art, thick line, shared palette so it looks like one roster.
- No official logos.

First playable dummy can be two colored rectangles and the five buttons. Art comes after the loop is funny.

---

## 14. Shareable results

After KO, generate a URL that encodes the fight. No database in v1.

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

X / Twitter link previews will use one generic OG image in v1. Custom per-fight preview images need a tiny worker later. Do not build that first.

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
- Campaign vs Warren / Gensler
- Full anime video supers
- Marketplace, tokens, repair sinks
- Custom OG image worker + short IDs (`pof.gg/r/x7k2`)
- Short redirect domain (`pof.gg`)

Trait idea, parked: same seven faces, rolled stats that only nudge the % tables above. Do not invent 200 characters.

---

## 17. Build order

Do not point DNS at an empty repo.

1. Drop this file in the `proof-of-fight` repo as `GAMEPLAN.md` (and a short `README.md` that points at it).
2. HTML dummy: two rectangles, HP, Blocks, five buttons, one CPU, banners in the console or on screen.
3. Play it until a Super cut-in (text-only) makes you laugh.
4. Then caricature portraits.
5. Then result URLs.
6. Then GitHub Pages or Cloudflare Pages.
7. Then Porkbun DNS: `proofoffight.com` → that host.
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
- Mode: **single player vs CPU**
- Look: **2D fighter stage**
- Play: **turn-based buttons**
- Meter: **Blocks**, 10 squares
- Buttons: **Strike / Privacy / Mint / Rug / Super**
- Super: named cutscene, 2–3 seconds, never whiffs
- Roster: Toly, Mert, Garlinghouse, Vitalik, Adam Back, Charles, Saylor
- Share: encoded result URL
- Chain mint: later
- coloredskyscore: never mixed in

---

## 20. First fight to implement

**You: Saylor vs CPU: Mert**

Why: tank vs blind. Teaches Blocks, Super, and a missed turn. If that fight is not funny, nothing else will be.
