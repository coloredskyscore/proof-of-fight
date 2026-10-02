# Charles kit — Midnight Express

**Fighter:** Charles (`charles`)
**Status:** Built Oct 2, 2026. Replaces the old **Peer Review** Super; peer review stays in the kit as his pink button and in the cut-in.

## Concept (Grok's research, as provided)

Midnight is the year. The peer-review ramble is still his character, but it is not what he has been posting.

**What he keeps saying**

- **Midnight is the project.** He is on it daily: NIGHT, the Glacier Drop, midnight.city, and as of today a private pub/sub he named Midnight Express. He called the work "the old days again, but with a lot more wisdom and a super intelligence in my pocket."
- **Bigger than Zcash.** On Sept 28 he wrote that Midnight will be bigger than Zcash: selective disclosure, private agents, a DeFi kernel for other chains, ZK + TEE + MPC, Cardano's uptime, "the magic of Leios," and LFG 2027. That is the pitch in one post.
- **FUD land.** The standing reply when someone calls it closed or founder-controlled: "Do we have to go down this road again? Welcome to FUD land." Then the same three facts: not closed source, federated until the nodes decentralize (same path as Cardano), founders do not hold most of the supply because of the Glacier Drop.
- **Not the CEO of Cardano.** He has been explicit that he is not accountable for ADA adoption, Cardano is decentralized, and "founders aren't slaves." Older companion bit: Charles Derangement Syndrome, and "I'm here to stay. Deal with it." Twelve years of building, and it is never enough.
- **Bank the unbanked.** Still the Cardano slogan. He used it Oct 1 on a RealFi mainnet post, all caps.
- **The bio is a costume.** Dire Wolf Mode, King of the Rats, Sateré-Mawé Warrior, Honorary Berkutchi. He leans into the persona. Useful for a portrait, not for the Super name.

**What that means for the fighter**

The old Super was Peer Review: nerds, a sentence that never ends, Sleep. That still fits the voice. The last year gives you a better name card.

| He actually says | Game use |
|---|---|
| Midnight Express | Super name |
| BIGGER THAN ZCASH | Slam line |
| LFG 2027 | KO, if you want the delay joke |
| WELCOME TO FUD LAND | Fail banner |
| GLACIER DROP | Airdrop / Mint success |
| BANK THE UNBANKED | Strike KO |
| I AM NOT ACCOUNTABLE | When a hit misses him |
| DIRE WOLF MODE | Portrait flavor, not a button |

Best Super picture: the lecture still starts, Charles still does not finish the sentence, then the lights go out. Name card is Midnight Express, not Peer Review. Selective disclosure is the mechanic you already have (Blind or Sleep) because they cannot see the next turn.

Privacy success line writes itself: SELECTIVE DISCLOSURE. He should be good at that button, unlike Saylor.

---

## Build notes (Oct 2, 2026): what's in the game

**Buttons** (same jobs and numbers as everyone, except his dodge goes 50% → 55%, since "he should be good at that button"):

| Button | Name | Lands | Flops |
|---|---|---|---|
| 🔴 Red (reliable hit, 10 dmg) | 🧊 Glacier Drop | no banner · KO: `BANK THE UNBANKED` | can't fail |
| 🔵 Blue (dodge, 55%) | 🔏 ZK Proof | `SELECTIVE DISCLOSURE` | `WELCOME TO FUD LAND` |
| 🩷 Pink (medium gamble, 24 dmg, 40%) | 📜 Peer Review | `PEER REVIEWED` | `REVISE AND RESUBMIT` |
| 🟣 Purple (big gamble, 36 dmg, 25%) | ✨ Leios | `THE MAGIC OF LEIOS` | `ROADMAP SAYS Q4` |

**When an attack misses him because he hid:** `I AM NOT ACCOUNTABLE` (new slot: `dodgeLine`).

**Super: Midnight Express.** Same effect as the old Peer Review: 15 dmg + Sleep (they skip their next turn) + they lose 3 Blocks. Lights out at midnight, everyone's asleep. Sleep rather than Blind because Mert owns Blind.
1. The five peer reviewers with laptops nod along; Charles's sentence types out in a speech bubble: "SO, TO GIVE SOME CONTEXT, BACK IN 2015 WE—"
2. The lights cut out mid-word. Darkness, a crescent moon, stars.
3. Name card `MIDNIGHT EXPRESS`, then the big line `BIGGER THAN ZCASH`. The cut-in runs 3.4s.

Prop on the portrait: 🐺 (Dire Wolf Mode).

**Other moments:**
- Super KO: `LFG 2027`
- CPU Charles after his Super: `I'M HERE TO STAY`
- The opponent's sleeping turn: `DEAL WITH IT.` (with the line above, his full quote, split in two)
- Charles beating Mert (any move): `BIGGER THAN ZOLANA` (Mert's blue button is Zolana)

**Changed from the concept above:** Grok didn't assign `WELCOME TO FUD LAND` to a button, so it became the dodge's flop (someone saw through it and called it closed). `GLACIER DROP` became the red button's name (an airdrop that reaches everyone always lands) instead of a success line. Peer review moved to the pink button (submitting a paper is a medium gamble), and his old `ROADMAP SAYS Q4` flop moved to Leios, where the delay joke lives.

**Balance:** unchanged at 66% for a sensible player (roster average about 68%).

**Where it lives:** `js/data.js` (`charles`), cut-in in `js/app.js` (`midnightDeco`) and `css/style.css` (search "Midnight Express").
