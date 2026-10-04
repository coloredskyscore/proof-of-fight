# Suno prompts: every sound in the game

> **Update (Oct 4, 2026):** the announcer now comes from a free CC0 pack (Kenney's Voiceover Pack: Fighter; see [README.md](README.md#the-announcer)), so none of these are needed. With 20 Suno downloads a month, the only ones worth spending on, if the game still feels like it's missing something:
> 1. `vo.lose` as **YOU GOT RUGGED!** (2–3 tries), to replace the pack's plain "You lose".
> 2. The two **result stingers** under Songs mode (bottom of this page), if the result screen feels bare with just the voice.
>
> The rest stays here as a reference.

One prompt per sound, grouped by Suno mode. Each heading is the sound's **ID**: name the download after it (`toly.mint.ok.mp3`), or send them with the ID in the message, so it lands in the right place.

**How to use these**
- **Do them in batches, in this order.** Anything you haven't made yet keeps playing the current synthesized sound, so nothing breaks halfway.
  1. The announcer (Script). The biggest upgrade, and it replaces the cheesy win/lose jingles.
  2. The shared hits (Sounds → Everyone). They play every turn.
  3. Each fighter's buttons.
  4. The Super parts.
- **Make 2–3 versions of each and keep the best.** Don't worry about length or silence at the start: I trim every file, level them so nothing is louder than anything else, and line them up with the animations.
- **Super cut-ins are split into parts** (the slap, the cash register, the confetti) instead of one long sound. Suno can't hit an exact moment in an animation, but the game can play each part on the right frame.
- **No real voices.** The announcer is a generic arcade voice. Nobody gets a line in a fighter's own voice, and no prompt names a real song or artist.

---

## Script mode: the announcer

Paste the line as the speech and the delivery note as the description. **Use the same base delivery for every line** so it sounds like one announcer:

> Base delivery: a deep, booming 1990s arcade fighting-game announcer. Gravelly, larger than life, full hype, shouted at full power. Short and punchy. Dry studio recording: no music, no sound effects, no crowd, no echo.

| ID | Speech | Delivery (add to the base) | Plays |
|---|---|---|---|
| `vo.title` | PROOF... OF... FIGHT! | Slow and ominous on "Proof... of...", then explode on "FIGHT!" | Title slam, on the drop |
| `vo.choose` | CHOOSE YOUR FIGHTER! | Fast, inviting, rising at the end | Fighter picker |
| `vo.round` | ROUND ONE... FIGHT! | A beat of tension after "Round one", then a huge "FIGHT!" | Fight starts |
| `vo.fight` | FIGHT! | One huge word | Resuming a daily |
| `vo.ko` | K.O.! | Two separate exploding letters, "K... O!" | Every knockout |
| `vo.time` | TIME! | Sharp and final, like a referee calling it | 30-turn limit |
| `vo.win` | YOU WIN! | Triumphant, celebrating with the player | You win |
| `vo.lose` | YOU GOT RUGGED! | Gloating and a little mocking, stretch it: "you got RUGGEEED!" | You lose |
| `vo.mutual` | MUTUAL REKT! | Amused, like he can't believe both of them blew it | Both purple buttons flop |
| `vo.self` | SELF-REKT! | Laughing at the player | Hitting yourself (hypnotized) |

**Fighter names**, announced when you pick them and on the VS screen. Same base delivery, each name shouted like a title fight introduction:

| ID | Speech | Pronunciation note |
|---|---|---|
| `vo.toly` | TOLY! | TOE-lee |
| `vo.mert` | MERT! | |
| `vo.garlinghouse` | GARLINGHOUSE! | GAR-ling-house, stretch it out |
| `vo.vitalik` | VITALIK! | |
| `vo.adam` | ADAM BACK! | |
| `vo.charles` | CHARLES! | |
| `vo.saylor` | SAYLOR! | |
| `vo.sergey` | SERGEY! | SAIR-gay |
| `vo.cz` | C... Z! | Two letters (for later) |
| `vo.adeniyi` | ADENIYI! | ah-deh-NEE-yee (for later) |

**For story mode later:** `CONTINUE?` (quiet and tense, counting-down energy), `GAME OVER` (slow, final), `A NEW CHALLENGER APPROACHES!` (urgent).

---

## Sounds mode: one-shots

Every prompt ends the same way on purpose (dry, no music, starts instantly) so they all sit together in the mix.

### Everyone

#### `hit`: a punch lands (Strike, and under every pink hit)
```
One-shot fighting game punch impact, 90s arcade style. A tight, crunchy, meaty punch with a little low thump. Very short. Dry, no music, no voice, starts instantly.
```
#### `heavy`: a big hit (purple button, Supers)
```
One-shot huge fighting game impact, 90s arcade style. A bone-crunching heavy hit with a deep boom underneath and a short crack on top. Dry, no music, no voice, starts instantly.
```
#### `stomp`: each hit of a crowd Super (XRP Army, Link Marines)
```
One-shot single heavy boot stomp on a wooden stage, a dull thud with a little rattle. Very short. Dry, no music, no voice, starts instantly.
```
#### `whiff`: an attack misses someone who hid
```
One-shot fast swing whoosh through empty air, a fist missing its target. Short and airy. Dry, no music, no voice, starts instantly.
```
#### `bonk`: a blue button fails
```
One-shot cartoon bonk on the head, a hollow wooden knock with a little pitch drop. Very short. Dry, no music, no voice, starts instantly.
```
#### `ko`: the knockout
```
One-shot massive knockout impact for a fighting game: a huge punch, a deep boom and a long rumbling tail, like the final blow in a 90s arcade fighter. About one second. Dry, no music, no voice, starts instantly.
```
#### `slam`: the title logo slams in (only used with music off)
```
One-shot giant cinematic logo slam: a deep sub-bass boom, a metal impact and debris settling. About one and a half seconds. No music, no voice, starts instantly.
```
#### `ready`: your Super meter is full
```
One-shot retro arcade power-up chime: a fast rising arpeggio that ends on a bright ding, like a meter charging to full. Under one second. Dry, no music, no voice, starts instantly.
```
#### `tap`: any button press
```
One-shot soft, crisp UI button click, tiny and subtle. Extremely short. Dry, no music, no voice, starts instantly.
```
#### `flop`: MUTUAL REKT (both purple buttons flop)
```
One-shot sad trombone, "wah wah wah waaah", comedic failure. About one second. Dry, no other music, no voice, starts instantly.
```
#### `selfhit`: a hypnotized fighter hits themselves
```
One-shot cartoon dizzy wobble with a springy boing, someone bonking themselves by mistake. Short. Dry, no music, no voice, starts instantly.
```
#### `drain`: someone loses Blocks
```
One-shot retro arcade "lose points" sound: three quick descending bleeps. Very short. Dry, no music, no voice, starts instantly.
```
#### `hodl`: HODL kicks in (half damage)
```
One-shot crystalline diamond shimmer, a bright glassy sparkle with a hard ring to it. Short. Dry, no music, no voice, starts instantly.
```
#### `snore`: asleep, skips a turn
```
One-shot single cartoon snore, a long rumbling inhale. About one second. Dry, no music, starts instantly.
```
#### `huh`: blinded, skips a turn
```
One-shot confused cartoon "huh?" made of two quick wobbly tones going up then down, no words. Short. Dry, no music, starts instantly.
```
#### `stare`: staring at Sergey's shirt, skips a turn
```
One-shot dazed, hypnotized wobble: a slow wavering tone sliding down, like someone lost in a spinning pattern. Under one second. Dry, no music, no voice, starts instantly.
```
#### `prune`: SALTY TEARS (Adam's gun strips HODL)
```
One-shot salt shaker shaken four times, small dry grains. Short. Dry, no music, no voice, starts instantly.
```

### Toly

#### `toly.strike`: ✊ Comrades
```
One-shot short heroic brass stab, a whole brass section hitting one big "bwaam" chord together, like a rally. Under half a second. Dry, no music beyond the stab, no voice, starts instantly.
```
#### `toly.privacy`: 🗝️ Seed Vault
```
One-shot heavy vault lock: a key turning and a thick steel bolt clunking shut. Short. Dry, no music, no voice, starts instantly.
```
#### `toly.mint.ok`: 🗑️ Slop Cannon lands
```
One-shot cannon boom immediately followed by a wet, sloppy garbage splat. Under one second. Dry, no music, no voice, starts instantly.
```
#### `toly.mint.fail`: NOT IN PROD
```
One-shot three quick error beeps from an old computer, the last one lower. Short. Dry, no music, no voice, starts instantly.
```
#### `toly.rug.ok`: 🥪 MEV Hunt lands
```
One-shot small drone whirring in fast, then a sharp electric zap. Under one second. Dry, no music, no voice, starts instantly.
```
#### `toly.rug.fail`: OUTAGE HIT THE BRIDGE
```
One-shot electrical power-down: a machine whining down and shutting off, ending in a dead click. About one second. Dry, no music, no voice, starts instantly.
```

### Mert

#### `mert.strike`: 🗯️ Shitpost
```
One-shot three fast mechanical keyboard clacks and a hard slam on the Enter key. Very short. Dry, no music, no voice, starts instantly.
```
#### `mert.privacy`: 🕶️ Zolana
```
One-shot sunglasses flicking down with a bright metallic "shing" glint. Very short. Dry, no music, no voice, starts instantly.
```
#### `mert.mint.ok`: 🪙 Memecoin lands
```
One-shot retro arcade coin pickup, a bright two-note chime. Short. Dry, no music, no voice, starts instantly.
```
#### `mert.mint.fail`: SNIPED IN BLOCK ZERO
```
One-shot a handful of coins spilling and rolling away across a hard floor. Short. Dry, no music, no voice, starts instantly.
```
#### `mert.rug.ok`: ⛔ Rate Limit lands (429)
```
One-shot loud, harsh error buzzer, like a game-show wrong-answer buzzer. Half a second. Dry, no music, no voice, starts instantly.
```
#### `mert.rug.fail`: STATUS PAGE: ALL GREEN
```
One-shot calm, pleasant notification chime, a little too cheerful for the moment. Short. Dry, no music, no voice, starts instantly.
```

### Garlinghouse

#### `garlinghouse.strike`: 💸 Settle
```
One-shot a fast riffle of paper bills being flicked through, like counting cash. Very short. Dry, no music, no voice, starts instantly.
```
#### `garlinghouse.privacy`: 🏛️ In The Room
```
One-shot a heavy wooden door closing with a deep, solid thud. Short. Dry, no music, no voice, starts instantly.
```
#### `garlinghouse.mint.ok`: 💵 RLUSD lands
```
One-shot old-fashioned cash register: drawer opening and a bright "cha-ching" bell. Short. Dry, no music, no voice, starts instantly.
```
#### `garlinghouse.mint.fail`: UTILITY TBD
```
One-shot a single flat, unimpressed "meh" note on a muted trombone, wobbling a little. Short. Dry, no other music, no voice, starts instantly.
```
#### `garlinghouse.rug.ok`: ⚖️ Lawsuit lands
```
One-shot a single loud wooden gavel strike in a courtroom. Very short. Dry, no music, no voice, starts instantly.
```
#### `garlinghouse.rug.fail`: I'M NOT SURPRISED. I'M PISSED.
```
One-shot three angry, rapid gavel strikes. Short. Dry, no music, no voice, starts instantly.
```

### Vitalik

#### `vitalik.strike`: 📝 Essay Drop
```
One-shot a thick stack of paper slapped down hard on a desk, a papery thwap. Very short. Dry, no music, no voice, starts instantly.
```
#### `vitalik.privacy`: 🫥 Privacy Pool
```
One-shot a bubbly underwater bloop, like slipping into a pool. Short. Dry, no music, no voice, starts instantly.
```
#### `vitalik.mint.ok`: 🧸 Soulbound lands
```
One-shot a rubber squeaky toy squeezed twice. Very short. Dry, no music, no voice, starts instantly.
```
#### `vitalik.mint.fail`: SOULBOUND AND ALSO UGLY
```
One-shot a squeaky toy slowly deflating with a long wobbly whine. Under one second. Dry, no music, no voice, starts instantly.
```
#### `vitalik.rug.ok`: 🌱 Public Goods lands
```
One-shot magical sprouting plant: a quick rising chime arpeggio with soft sparkles, like something growing. Short. Dry, no music, no voice, starts instantly.
```
#### `vitalik.rug.fail`: UNDERFUNDED
```
One-shot a hollow tap on an empty tin can, with a thin ringing tail. Very short. Dry, no music, no voice, starts instantly.
```

### Adam Back

#### `adam.strike`: ⛏️ Hashcash
```
One-shot a pickaxe striking rock, a sharp metallic clink with a few chips falling. Very short. Dry, no music, no voice, starts instantly.
```
#### `adam.privacy`: 🧅 Cypherpunk
```
One-shot a short burst of old dial-up modem screech and static. Under half a second. Dry, no music, no voice, starts instantly.
```
#### `adam.mint.ok`: 🖼️ Inscription lands
```
One-shot a vintage film camera shutter click and wind. Very short. Dry, no music, no voice, starts instantly.
```
#### `adam.mint.fail`: THAT'S NOT WHAT BITCOIN IS FOR
```
One-shot a low, flat two-tone "access denied" computer buzz. Short. Dry, no music, no voice, starts instantly.
```
#### `adam.rug.ok`: 🍴 Soft Fork lands
```
One-shot a tuning fork struck once, a pure clear ringing tone that fades slowly. About one second. Dry, no music, no voice, starts instantly.
```
#### `adam.rug.fail`: NOT BY POPULAR VOTE
```
One-shot two low descending synth notes that say "nope". Under one second. Dry, no music, no voice, starts instantly.
```

### Charles

#### `charles.strike`: 🧊 Glacier Drop
```
One-shot ice cracking and shattering, a sharp crisp break. Very short. Dry, no music, no voice, starts instantly.
```
#### `charles.privacy`: 🔏 ZK Proof
```
One-shot three keypad beeps, then a lock clicking shut. Short. Dry, no music, no voice, starts instantly.
```
#### `charles.mint.ok`: 📜 Peer Review lands
```
One-shot a heavy rubber stamp slammed onto paper on a desk. Very short. Dry, no music, no voice, starts instantly.
```
#### `charles.mint.fail`: REVISE AND RESUBMIT
```
One-shot a sheet of paper ripped in half in one quick tear. Short. Dry, no music, no voice, starts instantly.
```
#### `charles.rug.ok`: ✨ Leios lands
```
One-shot a magical sparkle shimmer, glittering bell tones rising. Short. Dry, no music, no voice, starts instantly.
```
#### `charles.rug.fail`: ROADMAP SAYS Q4
```
One-shot a slide whistle going all the way down, comedic. Under one second. Dry, no music, no voice, starts instantly.
```

### Saylor

#### `saylor.strike`: 📬 STRC
```
One-shot a metal mailbox lid slamming shut with a thump. Very short. Dry, no music, no voice, starts instantly.
```
#### `saylor.privacy`: 🛡️ STRF (always works)
```
One-shot a sword striking a metal shield, a big bright clang that rings out. Short. Dry, no music, no voice, starts instantly.
```
#### `saylor.mint.ok`: 🔄 STRK lands (CONVERTED)
```
One-shot a ratchet wrench clicking fast, then one satisfying final click. Short. Dry, no music, no voice, starts instantly.
```
#### `saylor.mint.fail`: STILL PREFERRED
```
One-shot a pile of small metal parts dropped and clattering on a table. Short. Dry, no music, no voice, starts instantly.
```
#### `saylor.rug.ok`: 📈 MSTR ▲
```
One-shot stock ticker beeps climbing up in pitch, then a cash register "cha-ching". Under one second. Dry, no music, no voice, starts instantly.
```
#### `saylor.rug.fail`: 📉 MSTR ▼
```
One-shot stock ticker beeps falling in pitch, ending in a sad sliding synth tone. Under one second. Dry, no music, no voice, starts instantly.
```

### Sergey

#### `sergey.strike`: 📡 CCIP
```
One-shot a quick burst of digital data chirps, like a packet of data arriving. Very short. Dry, no music, no voice, starts instantly.
```
#### `sergey.privacy`: 👕 The Shirt works
```
One-shot a hypnotic swirling warble, a wobbly "woo-oo" with heavy vibrato, like a spinning hypnosis spiral. Under one second. Dry, no music, no voice, starts instantly.
```
#### `sergey.mint.ok`: 🏦 Bank Pilot lands (LIVE AT SIBOS)
```
One-shot a conference hall PA announcement chime: three soft bell tones going up. Under one second. Dry, no music, no voice, starts instantly.
```
#### `sergey.mint.fail`: STILL A PILOT
```
One-shot a conference hall PA chime: three soft bell tones going down, a little deflated. Under one second. Dry, no music, no voice, starts instantly.
```
#### `sergey.rug.ok`: 💰 Next $600T lands
```
One-shot a rising whoosh that bursts into a sparkly jackpot shimmer. Under one second. Dry, no music, no voice, starts instantly.
```
#### `sergey.rug.fail`: NO PRICE CALLS
```
One-shot a telephone busy signal, three short beeps. Short. Dry, no music, no voice, starts instantly.
```

---

## Sounds mode: Super parts

The game plays these on the right frames of each cut-in.

### Toly: Second Best Salesman
#### `salesman.flip`: the brochure fans open
```
One-shot glossy brochure pages flipping open fast, a quick papery flutter. Short. Dry, no music, no voice, starts instantly.
```
#### `salesman.slap`: the phone slaps into them
```
One-shot huge comedic slap, a loud flat smack with a little sting. Very short. Dry, no music, no voice, starts instantly.
```
#### `salesman.register`: sale made
```
One-shot old cash register "cha-ching" with the bell ringing out. Short. Dry, no music, no voice, starts instantly.
```
#### `salesman.confetti`: airdrop confetti
```
One-shot party popper bang and a shower of confetti, a couple of small pops after. Short. Dry, no music, no voice, starts instantly.
```

### Mert: CEO of Helium
#### `helium.glitch`: the name card glitches
```
One-shot short digital glitch, a stuttering burst of corrupted signal. Very short. Dry, no music, no voice, starts instantly.
```
#### `helium.glint`: the sun glints off the dome
```
One-shot anime sparkle "ting", a bright glint off something very shiny. Short with a shimmering tail. Dry, no music, no voice, starts instantly.
```
#### `helium.squeak`: the helium squeak
```
One-shot a balloon's air let out in a high, squeaky wobble. Short. Dry, no music, no voice, starts instantly.
```

### Garlinghouse: XRP Army
#### `army.whistle`: go time
```
One-shot coach's whistle, one short sharp blast. Dry, no music, no voice, starts instantly.
```
#### `army.crowd`: the army jogs across
```
Three seconds of a big crowd jogging past on pavement, lots of footsteps and excited cheering, building then passing. No music, no words you can make out.
```

### Vitalik: Badger Dance
#### `dance.groove`: three seconds of the dance
```
Three-second loop, bouncy, goofy electronic dance groove at 128 BPM, a simple bass line and a hand clap on the backbeat, cheerful and a little silly, retro chiptune flavor. Instrumental, no vocals.
```
#### `dance.warble`: the hypnosis hits
```
One-shot hypnotic warble, a wavering tone with deep vibrato, like being hypnotized. Under one second. Dry, no music, no voice, starts instantly.
```

### Adam Back: OP_RETURN
#### `opreturn.shot`: the gun fires
```
One-shot retro sci-fi blaster shot, a sharp laser zap with a punchy kick. Short. Dry, no music, no voice, starts instantly.
```
#### `opreturn.data`: the data blob flies across
```
One-shot rapid stream of digital data chirps and beeps, like a burst of encoded data flying past. About one second. Dry, no music, no voice, starts instantly.
```

### Charles: Midnight Express
#### `midnight.key`: one caption letter typing (plays once per letter)
```
One-shot a single soft keyboard key click. Extremely short. Dry, no music, no voice, starts instantly.
```
#### `midnight.switch`: lights out
```
One-shot a wall light switch flicked off, a crisp plastic click. Very short. Dry, no music, no voice, starts instantly.
```
#### `midnight.crickets`: the dark room
```
Two seconds of crickets chirping at night, quiet and awkward, like after a joke nobody laughed at. No music, no voice.
```

### Saylor: Another Orange Dot
#### `orangedot.pop`: one dot stamps onto the chart (the game pitches each one higher)
```
One-shot a round, bubbly pop with a soft stamp, like a dot being stamped onto paper. Very short. Dry, no music, no voice, starts instantly.
```
#### `orangedot.sparkle`: the last dot
```
One-shot a bright golden sparkle, a satisfying ding with glitter. Short. Dry, no music, no voice, starts instantly.
```
#### `astronaut.beat`: the astronaut DJ (Super KO)
```
Three seconds of a hard, big-room EDM beat at 130 BPM, a four-on-the-floor kick with an air horn blast at the one-second mark. Instrumental, no vocals.
```

### Sergey: Link Marines
#### `marines.bugle`: sounding the charge
```
One-shot military bugle playing a short "charge!" call, six quick notes, bold and a little cheesy. About one and a half seconds. Dry, no other music, no voice, starts instantly.
```
#### `marines.march`: the Marines charge across
```
Three seconds of a crowd charging in boots: heavy marching footsteps, a snare drum cadence and a rising shout from the crowd. No music beyond the drum, no words you can make out.
```

---

## Songs mode (optional)

- **Result stingers.** If the announcer alone feels bare on the result screen, a short **win** and **lose** stinger in the fight track's style:
  - Win: `short triumphant 16-bit dubstep victory fanfare, chiptune lead, big drop, 5 seconds, instrumental`
  - Lose: `short 16-bit dubstep game over stinger, wobbling bass falling down, sad chiptune lead, 5 seconds, instrumental`
  Songs makes a full track either way; I cut the best few seconds out of it.
- **Story mode (later):** a boss theme and a ladder/map theme. Prompts when we get there.
