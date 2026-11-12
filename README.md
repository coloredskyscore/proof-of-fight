# Proof of Fight

Proof of Fight is an arcade of crypto games at **https://proofoffight.com**. The home page is the arcade; each game has its own folder and address:

| Address | Game |
|---|---|
| `/` (`index.html`) | The arcade: today's Daily Fight and Daily Coin, a cabinet per game, and what's in the lab |
| `/fight/` | **Proof of Fight**, the fighting game (below) |
| `/ride/` | **Ride the Chart**, the one-button ride over a real price chart |

The game pages keep their files (`css/`, `js/`, `art/`, `audio/`) at the site root and reach them through `<base href="../">`. Old links that put a game behind `?something` on the home page (`?dip`, `?ride&race=`, `?daily`, `?td`, ...) are forwarded to the right game's page by a script at the top of `index.html`. To add a game: a new folder with its own `index.html` (with `<base href="../">` and its own link preview), plus a cabinet in `index.html`.

The fighting game: a turn-based crypto founder brawl that runs in any browser. It looks like a 2D arcade fighter and plays like a card game: pick one of five buttons, the CPU picks at the same time, a short scene plays, repeat until someone hits 0 HP.

- **Daily Fight:** the same matchup and luck for everyone each day. One try, then share your emoji grid.
- **Free Play:** any fighter against any CPU.
- **Story**: beat five bosses in a row with one founder (Schiff, Dimon, Warren, Sam Bankman-Fried, then WICK, the market itself), with an ally's assist and Satoshi's one revive. See [docs/story/](docs/story/README.md).
- Parody. No wallet, no tokens, no sign-up.

The full design is in **[GAMEPLAN.md](GAMEPLAN.md)**.

## Play it

**On your computer:** download the repo, run `python3 -m http.server` in it, and open `http://localhost:8000`. (Double-clicking `fight/index.html` also works for the fight.)

**On your phone (GitHub Pages, free):**
1. On GitHub, open the repo → **Settings** → **Pages**.
2. Under **Build and deployment**, set Source to **Deploy from a branch**.
3. Pick the branch with the game (e.g. `main`), folder **/ (root)**, then **Save**.
4. After a minute the game is live at `https://<your-github-username>.github.io/proof-of-fight/`.

The game is live at **https://proofoffight.com**: GitHub Pages serves `main`, and the domain (registered at Porkbun) points at it. The `CNAME` file tells GitHub which domain this repo answers to; the old `github.io` address redirects there.

## Tweak it

All numbers and joke lines are in `js/data.js`. After changing numbers, check balance:

```
node tools/sim.js            # win rates per fighter, balanced rules
node tools/sim.js original   # same, with the original draft numbers
node tools/check.js          # rules still behave (Supers can't be dodged, Blind skips a turn, ...)
node tools/td-sim.js         # Tower Defense (?td): bots play the Hearing
node tools/dip-sim.js        # Ride the Chart (?ride): bots ride each chain's chart, how far each gets
```

Add `?speed=0.3` to the URL to play animations faster while testing.

`DAILY_EPOCH` in `js/data.js` sets which date is Daily Fight #1. Move it to launch day so the first public daily is #1.

## Files

| Path | What |
|---|---|
| `index.html`, `css/arcade.css`, `js/arcade.js` | The arcade home page: cabinets, today's dailies, your bests from this browser, live previews drawn in code |
| `fight/index.html` | The fighting game's page (`?td`, `?rap`, `?guitar` test modes still open from here) |
| `ride/index.html` | Ride the Chart's page |
| `404.html` | Shown for any URL that doesn't exist (GitHub Pages serves it automatically) |
| `css/style.css` | The look |
| `js/data.js` | Fighters, odds, damage, Supers, banners |
| `js/engine.js` | Game rules (no graphics; runs in Node too) |
| `js/app.js` | Screens, animations, Daily Fight, sharing |
| `js/td-core.js`, `js/td.js`, `css/td.css` | Tower Defense test (`?td`): the rules (run in Node too), then the drawing and taps |
| `js/dip-core.js`, `js/dip.js`, `js/dip-chains.js`, `css/dip.css` | Ride the Chart (`/ride`, `?ride`, formerly Buy the Dip at `?dip`): the rules (run in Node too), the drawing and sound (all made in code, no image or audio files), and the chains you can ride (landmarks, made-up future and colors for each) |
| `worker/`, `tools/build-worker.js` | Ride the Chart server: a Cloudflare Worker (`pof-dip.brianboode.workers.dev`) with a D1 database for short race links and the leaderboards. It replays every run before storing it. `node tools/build-worker.js` bundles the game rules with `worker/src/index.js` into `worker/dist/worker.js`; tables are in `worker/schema.sql` |
| `js/dip-data.js`, `js/dip-data-sol.js` | Ride the Chart price files: Bitcoin and Solana daily closing prices (see the header of each file for the source) |
| `art/td/` | Tower Defense map, towers, enemies and node: the map fitted to the grid with `tools/td_map.py`, the rest cut from Grok sheets with `tools/td_art.py` |
| `tools/` | Balance simulator, rules checks, art cut-out, music loop cutter, sound clip cutter, sound level meter |
| `docs/supers/` | Fighter kits (Super concepts, button names), one per fighter, and the slots the game supports |
| `art/` | Fighter portraits and stage sprites |
| `docs/art/` | Art style, Grok prompt templates, which fighters have art |
| `js/audio.js` | Music and sound effects |
| `audio/` | The menu and fight songs; `audio/sfx/` the recorded sounds (free CC0 packs) |
| `docs/audio/` | How the sound works; `?sounds` opens a sound test |
| `docs/social/` | X account kit: profile photo, header, bio, first posts; `art/social/og.jpg` is the link-preview image |
