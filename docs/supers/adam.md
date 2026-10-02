# Adam Back kit — OP_RETURN

**Fighter:** Adam Back (`adam`)
**Status:** Built Oct 2, 2026. Keeps the OP_RETURN gun; new buttons and lines. Fixes the old Super line, which argued the opposite of his real position.

## Concept (Grok's research, as provided)

Your read is right. OP_RETURN was the fight, BIP-110 was the fork, and it died. The rest of his feed is the same argument in smaller words.

**The arc**

Bitcoin Core v30, October 2025, raised the OP_RETURN data limit from 83 bytes to 100,000. Back sided with Core. He said he would run v30, and that rejecting the security fixes from "the 200 most skilled people on the planet" was itself an attack.

The reply was BIP-110, the Knots-side attempt to invalidate that data at consensus. Signaling opened around August 7–8, 2026. Nodes that enforced it split onto a minority chain. That chain stalled. The BIP was marked Closed on August 9. Exchanges stayed on the other chain. Supporters later revived the leftover as a separate network, not as Bitcoin.

His line the day it died: "Game over, checkmate forkers. As we said for last 6 months you'll just fork off, but if you wanna fork around and find out, here we are."

He is still on it. This week he asked if someone meant "the knots/bip 110 fork guys," said half a room had not heard of the fork, and that bitcoin does not change by popular vote. He also requoted himself: the tree of immutability "must be watered from time to time with the salty tears of failed contentious fork proposers."

**What else repeats**

- **Spam versus censorship.** His actual position is that you cannot filter spam without damaging uncensorability. "Prioritize 1" means censorship resistance. Knots filters, he says, are already almost useless because the tolerant minority sets the policy. A real privacy layer would make spam filtering information-theoretically impossible. Hashcash is his market answer, not a blacklist.
- **Mempool proverb.** "If you sit by the mempool long enough, bitcoin's enemies soon enough float past." Latest fork cult was "stupider, and crazier" than predicted.
- **One more upgrade, then stop.** As of October 1 he is backing covenant opcodes as a possible "last soft-fork," so Bitcoin needs fewer forks after. Ironic, and he knows it.
- **Identity, not a bit.** Hashcash inventor, cypherpunk, Blockstream, privacy. That is why his hide chance is already 70% and his NFT rate is 15%.

**What is memeable**

| Line | Use |
|---|---|
| OP_RETURN / 80 BYTES | Super, already locked. The gun. |
| FORK AROUND AND FIND OUT | KO, or the line when their Super misses |
| SALTY TEARS | Banner after he prunes a buff |
| SIT BY THE MEMPOOL | Idle / CPU after |
| CHECKMATE FORKERS | If he KOs someone mid-Super |
| PRIORITIZE 1 | Privacy success |
| THAT'S NOT WHAT BITCOIN IS FOR | Mint fail, already in the kit |
| LAST SOFT-FORK | Flavor only. Do not make another Super. |

He is not a catchphrase account. The joke is the tone: short, technical, slightly smug, and the other chain already lost. The gun stays. The new banner is the failed fork, not a second weapon.

---

## Build notes (Oct 2, 2026): what's in the game

**Correction:** the Super's old voice line was `80 BYTES. NOT ONE MORE.` (written in the first build, not by Grok). Per the research above he backed lifting that limit, so the line had him arguing the opposite side. Replaced with `FORK AROUND AND FIND OUT`. The gun etched OP_RETURN and its data blob stay as the picture.

**Buttons** (numbers unchanged: hide 70%, the best in the game; NFTs 15%; rugs 10%):

| Button | Name | Lands | Flops |
|---|---|---|---|
| 🔴 Red (reliable hit, 10 dmg) | ⛏️ Hashcash | no banner · KO: `GAME OVER` | can't fail |
| 🔵 Blue (dodge, 70%) | 🧅 Cypherpunk | `PRIORITIZE 1` | `FILTERED BY KNOTS` |
| 🩷 Pink (medium gamble, 15%) | 🖼️ Inscription | `FEES ARE THE FILTER` | `THAT'S NOT WHAT BITCOIN IS FOR` |
| 🟣 Purple (big gamble, 10%) | 🍴 Soft Fork | `THE LAST SOFT-FORK` · through a dodge: `CAN'T HIDE FROM CONSENSUS` | `NOT BY POPULAR VOTE` |

**Super: OP_RETURN** (same effect: strips the target's HODL, then 25 dmg). Big line `FORK AROUND AND FIND OUT`. KO `CHECKMATE FORKERS`, and the loser is left holding 🧂 (the salty tears of failed contentious fork proposers). When the gun strips Saylor's HODL: `SALTY TEARS` (new slot: `pruneLine`). After CPU Adam's Super: `SIT BY THE MEMPOOL LONG ENOUGH`.

**Where Grok's lines went:** `FORK AROUND AND FIND OUT` became the Super's big line (Supers can't miss in this game, and it's his punchiest line); `CHECKMATE FORKERS` is the Super KO as suggested; `GAME OVER` (the start of the same quote) is the Hashcash KO. The pink button is Inscription, so `THAT'S NOT WHAT BITCOIN IS FOR` finally has a setup, and `FEES ARE THE FILTER` (his market answer to spam) is what he says when it lands. Getting caught by a spam filter (`FILTERED BY KNOTS`) is exactly the censorship he warns about. "Last soft-fork" stays flavor on the purple button, not a second Super.

**Retired, kept for later:** `CAN'T RUG A HASH` (old purple flop), `80 BYTES OF PAIN` (old Super KO).

**Balance:** unchanged at 70% for a sensible player.

**Where it lives:** `js/data.js` (`adam`); the gun's data blob is `case 'opreturn'` in `js/app.js`.
