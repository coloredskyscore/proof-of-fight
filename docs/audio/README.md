# Sound

Two songs (made by the user in Suno), seven recorded sounds picked from free CC0 packs, and about 75 synthesized arcade sound effects. Everything lives in `js/audio.js`; the songs are `audio/menu.mp3` and `audio/fight.mp3`, the recorded sounds are in `audio/sfx/`.

## How it plays

- **PRESS START.** Browsers only allow sound after a tap, so every visit opens on a blinking PRESS START. The tap starts the menu song 8 beats before its drop: a fighter portrait pops in on each beat and the logo slams in on the drop (with a screen shake and flash). A second tap during the build slams right away. With music and sounds both off, there's no PRESS START: the intro plays straight through, quickly and silently.
- **Menu song** on the title, fighter picker and result screens (it comes back about 2 seconds after the win/lose tune). It loops seamlessly from the drop.
- **Fight song** from the first turn, opening on its drop hit. It ducks to 30% under every Super cut-in and cuts out at the K.O.
- **Sound effects** for every button outcome, every Super (timed to its animation), the K.O. (a boom and a boxing bell), the win/lose tunes, the Super-ready chime, and a soft tap on buttons.
- **Switches:** `🎵 Music` and `🔊 Sounds` on the title screen, and a 🔊/🔇 button in the fight HUD that mutes everything. Remembered per device. Music off also means the songs aren't downloaded.
- **Sound test:** add `?sounds` to the address (`.../proof-of-fight/?sounds`) to get a panel of every sound, by name, after PRESS START.

## The songs

| File | From | Tempo | Cut | Loop |
|---|---|---|---|---|
| `audio/menu.mp3` | Title_Screen_Drop.mp3 (202s) | 142.5 BPM | starts 2 bars before the first drop (30.19s) | the 24 bars from the first drop (33.56s) to the second (73.97s) |
| `audio/fight.mp3` | Fight_Track.mp3 (77s) | 150 BPM | starts at the drop hit (12.85s) | the 37 bars of full energy (13.41s to 72.58s) |
| `audio/schiff.mp3` | Schiff-music.mp3 (193s), story boss 1 | 153 BPM | starts at the last drop's hit (142.97s) | the 20 bars after it (146.20s to 177.53s), the loudest stretch |
| `audio/dimon.mp3` | Final_Boss_Theme.mp3 (150s), story boss 2 | 144 BPM | starts at the first big drop (52.92s) | the 30 bars after it (56.28s to 106.24s) |
| `audio/warren.mp3` | warren-music.mp3 (187s), story boss 3 | 150 BPM | starts at the first drop (22.36s) | the 32 bars after it (28.79s to 79.99s) |

The loop points were found by fitting a beat grid and matching the audio on both sides of the seam; the menu loop's best match landed on exactly 24 bars. `tools/music.py` bakes a crossfade into the seam, so it loops without a click even when a browser pads the start of an MP3. To swap a song:

```
pip install numpy miniaudio lameenc
python3 tools/music.py NEW_SONG.mp3 audio/fight.mp3 --start 12.85 --loop 13.41 72.578
```

then copy the printed `loopStart` / `loopEnd` into `MUSIC` in `js/audio.js` (and `drop` for the menu song).

## Recorded sounds (picked Oct 4, 2026)

The shared sounds that play most often are recordings, chosen by ear on a listening board. Each one replaces the synth sound of the same name; if a file can't load, the synth version plays. All are CC0: free for any use, no royalties, no credit required (credited here anyway).

| Sound | File | Plays | Source |
|---|---|---|---|
| `hit` | `audio/sfx/hit.mp3` | every red and pink hit, under each fighter's own sound | "hit25" from [37 Hits/Punches](https://opengameart.org/content/37-hitspunches) by qubodup (OpenGameArt) |
| `heavy` | `audio/sfx/heavy.mp3` | every purple hit and Super hit | "hit20" from the same pack. Most of its lead-in swish is skipped (`skip: 0.09`) so the hit lands on the frame |
| `ko.bell` | `audio/sfx/ko-bell.mp3` | at the K.O., ringing over the synth boom | `impactBell_heavy_000` from Kenney's [Impact Sounds](https://kenney.nl/assets/impact-sounds) |
| `win` | `audio/sfx/win.mp3` | result screen, you won | `jingles_NES12` from Kenney's [Music Jingles](https://kenney.nl/assets/music-jingles) |
| `lose` | `audio/sfx/lose.mp3` | result screen, you lost | `jingles_NES00` from the same pack |
| `ready` | `audio/sfx/ready.mp3` | your Super meter fills | `confirmation_002` from Kenney's [Interface Sounds](https://kenney.nl/assets/interface-sounds) |
| `tap` | `audio/sfx/tap.mp3` | any button | `select_001` from the same pack |
| `satoshi` | `audio/sfx/satoshi.mp3` | Story: Satoshi's revive and the ending | the first 6.2 seconds of the user's Suno track Soft_Bell_Pads (stereo, 1.4s fade): `python3 tools/clip.py Soft_Bell_Pads.mp3 audio/sfx/satoshi.mp3 --from 0 --to 6.2 --fade 1.4 --stereo` |

The files came from the [open-game-sfx-index](https://github.com/Mcamento8/open-game-sfx-index) mirror (kenney.nl and OpenGameArt aren't reachable from the build machine); each matched the mirror's checksum. `tools/clip.py` trims the silence, makes them mono, levels every file to the same peak and saves a small MP3; `CLIPS` in `js/audio.js` sets how loud each plays. To swap one:

```
python3 tools/clip.py new_sound.ogg audio/sfx/hit.mp3
```

A Kenney fighting-game announcer was tried and dropped (the voice didn't fit).

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
| CZ | SAFU: the vault door, latched | Ignore FUD: four taps ("4."); every hit that bounces off him is a dull thunk | Top 4 List: four notes up / only three, then a thud | Da Moon: yacht horn, then up / the horn sputters, a rope creaks | the SUV rolls in and brakes, FUD, FAKE NEWS and ATTACKS shatter one by one, then a chord stab |
| Adeniyi | Zero Fee: a quick zip | Walrus: a bubble, then a "saved" chime (again when a dodged hit is stored) | YOLO: dice rattle + a win ding / dice, then a sliding "…wait" | Agents 24/7: machine-speed beeps + zap / a glitching robot | the wave rolls in with bots chirping on the crest; each of the 8 hits is a splash |
| Sergey | CCIP: a data chirp, then the punch | The Shirt: a hypnotic warble (whoever stares gets a dazed wobble on the turn they lose) | Bank Pilot: conference PA chime up / chime down | Next $600T: whoosh up + sparkle / phone busy signal (NO PRICE CALLS) | the target's line hangs, a bugle sounds the charge, boots and drums, a crowd swell; each of the 4 hits is a stomp |

**Levels:** each sound plays at a target loudness (punches and the K.O. on top, signatures a step under, the button tap quiet, music under the effects). `PEAK` in `js/audio.js` holds each recipe's measured raw peak. New sounds get measured with `tools/sfx-levels.js` (needs a local server and Playwright, see the file); after changing a recipe, pass its name so it's measured again. Sounds you didn't name keep their levels (noise makes every measurement differ a little). A limiter on the effects keeps stacked hits from clipping.

**Replacing them with recorded sounds:** [suno-prompts.md](suno-prompts.md) has a Suno prompt for every sound (plus the announcer lines and the Super parts), named by the IDs above. A sound without a file keeps its synthesized version.

Nothing copies a real song: the Badger Dance groove is original (the famous badgers song is copyrighted), and no real voices are used.
