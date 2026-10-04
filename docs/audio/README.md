# Sound

Two songs (made by the user in Suno) and about 70 synthesized arcade sound effects. Everything lives in `js/audio.js`; the songs are `audio/menu.mp3` and `audio/fight.mp3`.

## How it plays

- **PRESS START.** Browsers only allow sound after a tap, so every visit opens on a blinking PRESS START. The tap starts the menu song 8 beats before its drop: a fighter portrait pops in on each beat and the logo slams in on the drop (with a screen shake and flash). A second tap during the build slams right away. With music and sounds both off, there's no PRESS START: the intro plays straight through, quickly and silently.
- **Menu song** on the title, fighter picker and result screens (it comes back about 2 seconds after the result jingle). It loops seamlessly from the drop.
- **Fight song** from the first turn, opening on its drop hit. It ducks to 30% under every Super cut-in and cuts out at the K.O.
- **Sound effects** for every button outcome, every Super (timed to its animation), the K.O., the win/lose jingles, the Super-ready chime, and a soft tap on buttons.
- **Switches:** `🎵 Music` and `🔊 Sounds` on the title screen, and a 🔊/🔇 button in the fight HUD that mutes everything. Remembered per device. Music off also means the songs aren't downloaded.
- **Sound test:** add `?sounds` to the address (`.../proof-of-fight/?sounds`) to get a panel of every sound, by name, after PRESS START.

## The songs

| File | From | Tempo | Cut | Loop |
|---|---|---|---|---|
| `audio/menu.mp3` | Title_Screen_Drop.mp3 (202s) | 142.5 BPM | starts 2 bars before the first drop (30.19s) | the 24 bars from the first drop (33.56s) to the second (73.97s) |
| `audio/fight.mp3` | Fight_Track.mp3 (77s) | 150 BPM | starts at the drop hit (12.85s) | the 37 bars of full energy (13.41s to 72.58s) |

The loop points were found by fitting a beat grid and matching the audio on both sides of the seam; the menu loop's best match landed on exactly 24 bars. `tools/music.py` bakes a crossfade into the seam, so it loops without a click even when a browser pads the start of an MP3. To swap a song:

```
pip install numpy miniaudio lameenc
python3 tools/music.py NEW_SONG.mp3 audio/fight.mp3 --start 12.85 --loop 13.41 72.578
```

then copy the printed `loopStart` / `loopEnd` into `MUSIC` in `js/audio.js` (and `drop` for the menu song).

## Sound effects

Each sound is a short recipe of synthesized voices (square, triangle, saw, sine or noise, with pitch sweeps and filters): retro arcade sounds to match the 16-bit sprites, no files, no licensing. Every button plays a shared layer (a punch, a big hit, a whiff, a bonk) plus the fighter's signature:

| Fighter | 🔴 Red | 🔵 Blue | 🩷 Pink (lands / flops) | 🟣 Purple (lands / flops) | ⚡ Super |
|---|---|---|---|---|---|
| Toly | Comrades: brass "bwaam" | Seed Vault: lock clunk | Slop Cannon: boom + splat / error beeps | MEV Hunt: drone whir + zap / power-down whine | brochure flicks, the slap, cash register, confetti pops |
| Mert | Shitpost: keyboard clacks | Zolana: shades "shing" | Memecoin: coin / coins rolling away | Rate Limit: 429 buzzer / calm "all green" chime | glitches on HELIUM and HIVEMAPPER, a glint off the dome, helium squeak |
| Garlinghouse | Settle: cash riffle | In The Room: door shuts | RLUSD: cash register / flat "meh" | Lawsuit: gavel / three angry raps | whistle, the army's footsteps, crowd swell; each of the 5 hits is a stomp |
| Vitalik | Essay Drop: paper thwap | Privacy Pool: bloop | Soulbound: toy squeak / deflating squeak | Public Goods: sprout chime / empty tin can | an original bouncy groove, then a hypno warble |
| Adam | Hashcash: pickaxe clink | Cypherpunk: modem screech | Inscription: camera shutter / "denied" | Soft Fork: tuning-fork ting / low "nope" | the gun fires, the data chirps across; salt shaker on SALTY TEARS |
| Charles | Glacier Drop: ice crack | ZK Proof: keypad and lock | Peer Review: stamp / page rip | Leios: sparkle / slide whistle down | a click per caption letter, the light switch, crickets, a snore |
| Saylor | STRC: mailbox thump | STRF: shield clang | STRK: ratchet / clatter | MSTR: ticker up + cha-ching / ticker down | each orange dot pops a little higher; the astronaut DJ gets a beat and a horn |
| Sergey | CCIP: a data chirp, then the punch | The Shirt: a hypnotic warble (whoever stares gets a dazed wobble on the turn they lose) | Bank Pilot: conference PA chime up / chime down | Next $600T: whoosh up + sparkle / phone busy signal (NO PRICE CALLS) | the target's line hangs, a bugle sounds the charge, boots and drums, a crowd swell; each of the 4 hits is a stomp |

**Levels:** each sound plays at a target loudness (punches and the K.O. on top, signatures a step under, the button tap quiet, music under the effects). `PEAK` in `js/audio.js` holds each recipe's measured raw peak. New sounds get measured with `tools/sfx-levels.js` (needs a local server and Playwright, see the file); after changing a recipe, pass its name so it's measured again. Sounds you didn't name keep their levels (noise makes every measurement differ a little). A limiter on the effects keeps stacked hits from clipping.

Nothing copies a real song: the Badger Dance groove is original (the famous badgers song is copyrighted), and no real voices are used.
