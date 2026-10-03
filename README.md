# Proof of Fight

A turn-based crypto founder brawl that runs in any browser. It looks like a 2D arcade fighter and plays like a card game: pick one of five buttons, the CPU picks at the same time, a short scene plays, repeat until someone hits 0 HP.

- **Daily Fight:** the same matchup and luck for everyone each day. One try, then share your emoji grid.
- **Free Play:** any of the seven fighters against any CPU.
- Parody. No wallet, no tokens, no sign-up.

The full design is in **[GAMEPLAN.md](GAMEPLAN.md)**.

## Play it

**On your computer:** download the repo and double-click `index.html`.

**On your phone (GitHub Pages, free):**
1. On GitHub, open the repo → **Settings** → **Pages**.
2. Under **Build and deployment**, set Source to **Deploy from a branch**.
3. Pick the branch with the game (e.g. `main`), folder **/ (root)**, then **Save**.
4. After a minute the game is live at `https://<your-github-username>.github.io/proof-of-fight/`.

The `github.io` address is only for testing. The plan is to point `proofoffight.com` at it later (GAMEPLAN.md, section 17).

## Tweak it

All numbers and joke lines are in `js/data.js`. After changing numbers, check balance:

```
node tools/sim.js            # win rates per fighter, balanced rules
node tools/sim.js original   # same, with the original draft numbers
node tools/check.js          # rules still behave (Supers can't be dodged, Blind skips a turn, ...)
```

Add `?speed=0.3` to the URL to play animations faster while testing.

`DAILY_EPOCH` in `js/data.js` sets which date is Daily Fight #1. Move it to launch day so the first public daily is #1.

## Files

| Path | What |
|---|---|
| `index.html` | The page |
| `css/style.css` | The look |
| `js/data.js` | Fighters, odds, damage, Supers, banners |
| `js/engine.js` | Game rules (no graphics; runs in Node too) |
| `js/app.js` | Screens, animations, Daily Fight, sharing |
| `tools/` | Balance simulator, rules checks, art cut-out, music loop cutter, sound level meter |
| `docs/supers/` | Fighter kits (Super concepts, button names), one per fighter, and the slots the game supports |
| `art/` | Fighter portraits and stage sprites |
| `docs/art/` | Art style, Grok prompt templates, which fighters have art |
| `js/audio.js` | Music and sound effects |
| `audio/` | The menu and fight songs |
| `docs/audio/` | How the sound works; `?sounds` opens a sound test |
