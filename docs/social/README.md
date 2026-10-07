# Launch kit: X account and first posts

Everything here is ready to paste. The images are in this folder; the launch clip is made from a real fight (see "The launch clip" below).

## The account

| Field | Value |
|---|---|
| Handle | [@ProofOfFight](https://x.com/ProofOfFight) (Reddit: [u/Proof-of-Fight](https://www.reddit.com/user/Proof-of-Fight)) |
| Name | Proof of Fight |
| Bio | A parody fighting game starring crypto founders. Five buttons, one bad decision per turn. New Daily Fight every day. Not affiliated with anyone in it. |
| Location | The mempool |
| Website | proofoffight.com |
| Profile photo | `x-profile.png` (800×800; X shows it as a circle) |
| Header | `x-banner.jpg` (1500×500; the left corner is kept empty for the profile photo) |
| Pinned post | Post 1 below |

The accounts sign in with the project's own Gmail (kept out of this public repo on purpose; the public contact will be hello@proofoffight.com). Turn on two-factor login with an authenticator app on each, and save the backup codes somewhere safe.

**Parody rules of thumb.** The game is the brand, not any of the people in it, so the account never talks *as* a founder. "Not affiliated with anyone in it" stays in the bio. Tag a founder once, in their own spotlight post, and never in replies to strangers.

## Link previews

Shared links show a big card (`art/social/og.jpg`, 1200×630) credited to @ProofOfFight. The tags are in `index.html` and use full proofoffight.com URLs.

**X keeps its first copy of a card for about a week.** If a link was posted before the card existed, X keeps showing the old one. To get the new card right away, post the link with something on the end, like `proofoffight.com/?x` or `proofoffight.com/?launch`: X treats it as a new link and fetches it fresh, and the game loads the same. Paste it into a draft post first and wait a few seconds to see the card before posting.

## First two weeks

One post a day is plenty. On x.com (desktop), the composer's calendar icon schedules posts ahead, so a week can be loaded in ten minutes.

**1. Launch (pin it).** Attach the launch clip.
> Proof of Fight is live.
>
> Crypto founders. Five buttons. One bad decision per turn.
>
> Saylor's MSTR rolls 15–45. Toly sells you a phone. Charles starts a 3-hour AMA.
>
> Free in your browser, no wallet: proofoffight.com

**2. The Daily Fight.** Attach a screenshot of a result card.
> Every day there's one Daily Fight. Same matchup and the same luck for everyone. One try.
>
> Share your grid. Fewer turns wins.
>
> 🟩🟩🟩🟦🟨🏆
>
> proofoffight.com

**3–10. One fighter a day.** Attach that fighter's Super cut-in. Tag the founder in their own post if you like; once is enough.

> **Toly.** His Super is Second Best Salesman: a brochure of phones fans open and he sells you one whether you want it or not. 35 damage.
>
> "APPLE + SOLANA MOBILE: 3.469 BILLION"

> **Mert.** CEO of Helium. Wait. Helius. The sun glints off the dome and you lose your next turn.
>
> "THE RPCS DID THIS"

> **Garlinghouse.** The XRP Army jogs across the screen for 5 hits. Someone in the back yells $589 BY FRIDAY. He did not ask for this.
>
> "RIPPLE 3, SEC 0"

> **Vitalik.** His Super is the badger dance. Your next attack hits yourself.
>
> "DON'T LOOK AT THE DANCE."

> **Adam Back.** OP_RETURN deletes your HODL, then shoots you with data.
>
> "FORK AROUND AND FIND OUT"

> **Charles.** His Super starts a surprise AMA. 0:07 / 3:47:12. You fall asleep and lose 3 Blocks.
>
> "BIGGER THAN ZCASH"

> **Saylor.** Another orange dot on the chart. If it lands the knockout, the astronaut DJ comes out.
>
> "WE CALL THEM POOR"

> **Sergey.** He never hides. He wears the shirt until you stop moving, then the Link Marines show up.
>
> "$34 TRILLION"

**11. Rivalries.** Attach the K.O. screen from the clip.
> Toly vs Saylor has its own knockout line, both ways.
>
> THERE IS A SECOND BEST
> THERE IS NO SECOND BEST
>
> There are more. Find them.

**12. New fighters.** Attach CZ's and Adeniyi's Super cut-ins.
> Two new fighters.
>
> CZ ignores your FUD. Literally: red and pink do nothing to him.
> Adeniyi stores the hit he dodged and gives it back.
>
> proofoffight.com

**13. A Daily Fight reminder.**
> Today's Daily Fight is up. Everyone gets the same fight. Post your grid below.
>
> proofoffight.com

**14. Behind the build.** Attach `x-banner.jpg` or a portrait next to its sprite.
> Every fighter has a late-90s arcade portrait and a 16-bit sprite. Ten so far: CZ and Adeniyi just joined.

## The launch clip

23 seconds, vertical 1080×1920, with the game's own music and sound: the logo slam, ROUND 1, Saylor's MSTR and STRK, his STRF, Another Orange Dot, the K.O. on Toly, the astronaut DJ, YOU WIN, and an end card with the URL.

It's a real fight with lucky dice: every one of Saylor's gambles lands and MSTR rolls its top number, and his STRF fills the Super meter in one go so the Super comes on turn 5. The damage numbers and the odds shown on the buttons are the game's real ones. Slow moments (the fighter picker, one turn) are cut.

## Remaking the images

`compose.html` in this folder builds the header, profile photo, link-preview image and clip end card from the fighters' art and the game's font. Serve the repo root (`python3 -m http.server`), open `/docs/social/compose.html`, and screenshot each frame at its size. With ten fighters, add them to `TEAM` in the file and narrow the lineup.
