/* Rap Battle prototype (?rap). Toly vs Vitalik, three rounds over a boom-bap beat.
   Each turn you pick your next couplet: the safer the line, the likelier it lands. A line that lands moves
   the crowd meter your way; a line that misses gets booed and the DJ cuts the beat.
   The rappers "talk" in chiptune babble (one blip per syllable, on the beat), not real or cloned voices. */
(function () {
  if (!/[?&]rap\b/i.test(location.search)) return;
  var D = window.POF_DATA, AU = window.POF_AUDIO;

  var BPM = 90, BEAT = 60 / BPM, STEP = BEAT / 4, BAR = BEAT * 4;

  // Each fighter's babble: waveform, base pitch (Hz), the vowel filter's Q, a touch of grit.
  var VOICE = {
    toly:    { w: 'sawtooth', f: 150, q: 2.5, drive: 1.6, vib: null },
    vitalik: { w: 'square',   f: 270, q: 4,   drive: 0,   vib: [7, 6] }
  };

  var CPU_ODDS = 0.65, CPU_HIT = 14, CPU_MISS = 8, MISS = 10;
  var RISK = {
    safe:    { label: 'Safe',         odds: 0.75, gain: 10 },
    spicy:   { label: 'Spicy',        odds: 0.5,  gain: 18 },
    nuclear: { label: 'Nuclear',      odds: 0.25, gain: 34 },
    skibidi: { label: 'Skibidi mode', odds: 0.35, gain: 40 }
  };

  // Vitalik opens each round; you answer. `fast` raps in double time (two syllables per beat-step).
  var ROUNDS = [
    {
      cpu: ['Your chain is so fast that it forgot to stay on', 'Validators on Discord asking where it has gone'],
      picks: [
        { risk: 'safe', lines: ['I ship phones to your hands, you ship posts to your blog', 'Every swap on your chain is a gas-guzzling slog'] },
        { risk: 'spicy', lines: ['Your gas got so high, man, it needs an intervention', 'Fifty layer twos and not one gets a mention'] },
        { risk: 'nuclear', lines: ['Ultrasound money? Bro, your speaker is on mute', 'Took six years to merge in a unicorn suit'] }
      ]
    },
    {
      cpu: ['You sell a phone like a late-night infomercial', 'My roadmap is so deep that it is barely commercial'],
      picks: [
        { risk: 'safe', lines: ['Four hundred milliseconds, my block is done in a blink', 'Your transaction is pending, go pour you a drink'] },
        { risk: 'spicy', lines: ['Your roadmap is a maze where the exit is a rollup', 'Read the blog post, then the sequel, then the follow-up'] },
        { risk: 'nuclear', lines: ['You dance like a badger that lost all its keys', 'Even your meme coins pay gas to say please'] }
      ]
    },
    {
      cpu: ['When your network goes down, do you call it a feature?', 'Seventeen hours off, even mainnet needs a breather'],
      picks: [
        { risk: 'safe', lines: ['Cheap, fast, chain, gud, that is the whole creed', 'Your swap costs a kidney, mine costs a seed'] },
        { risk: 'spicy', lines: ['I put a chain in a phone and the phone in your hand', 'You put a roadmap in a blog that nobody can understand'] },
        { risk: 'skibidi', fast: true, lines: [
          'Slop, kino, skibidi bop, I do not stop, I hop on the block, ship it to prod, top of the charts',
          'Chewing on glass while you blog it in parts, skibidi, skibidi, cheap fast chain, SKIBIDI BOP'
        ] }
      ]
    }
  ];

  var S = null;                      // the battle in progress
  var $ = function (q, el) { return (el || document).querySelector(q); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // ---------- Clock ----------
  // The audio clock when sound is running (so words land on the beat), else the page clock.
  function now() { return AU.ready && AU.time > 0 ? AU.time : performance.now() / 1000; }
  function nextBar() {
    var t = now() + 0.15;
    return S.t0 + Math.ceil((t - S.t0) / BAR) * BAR;
  }
  function untilTime(t) { return wait(Math.max(0, (t - now()) * 1000)); }

  // ---------- Beat ----------
  // Boom-bap: kick on 1 and the "and" of 3, snare on 2 and 4, hats on the eighths, a bass note under each kick.
  var BASS = [55, 55, 43.65, 49];
  function barVoices(k) {
    var vs = [], b = BASS[k % 4];
    [0, 7, 10].forEach(function (s) {
      vs.push({ w: 'sine', f: [160, 42], t: s * STEP, d: 0.28, v: 0.6 });
      vs.push({ w: 'triangle', f: b * 2, t: s * STEP, d: s === 0 ? STEP * 6 : STEP * 2.5, v: 0.24, lp: 400, hold: 0.6 });
    });
    [4, 12].forEach(function (s) {
      vs.push({ w: 'noise', t: s * STEP, d: 0.17, v: 0.32, bp: 1900, q: 0.8 });
      vs.push({ w: 'triangle', f: [210, 160], t: s * STEP, d: 0.08, v: 0.3 });
    });
    for (var s = 0; s < 16; s += 2) vs.push({ w: 'noise', t: s * STEP, d: s === 14 ? 0.12 : 0.03, v: s % 4 ? 0.07 : 0.11, hp: 7500 });
    return vs;
  }
  function startBeat() {
    S.t0 = now() + 0.2;
    S.barsDone = 0;
    S.cutBar = -1;
    function tick() {
      if (!S || S.over) return;
      var horizon = now() + 0.5;
      while (S.t0 + S.barsDone * BAR < horizon) {
        var k = S.barsDone++;
        if (k !== S.cutBar) AU.playVoices(barVoices(k), S.t0 + k * BAR, 'music');
      }
    }
    tick();
    S.beatTimer = setInterval(tick, 100);
    document.documentElement.style.setProperty('--rap-beat', BEAT + 's');
  }
  // The DJ cuts the beat for the next bar (after a boo). Bars already scheduled play out.
  function cutBeat() { S.cutBar = S.barsDone; }

  // ---------- Babble voice ----------
  // Syllables: vowel groups per word, with a silent final e.
  function syllables(word) {
    var w = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!w) return [];
    var groups = w.match(/[aeiouy]+/g) || ['a'];
    var n = groups.length;
    if (n > 1 && /[^aeiouy]e$/.test(w) && !/[^aeiouy]le$/.test(w)) n--;
    var out = [];
    for (var i = 0; i < n; i++) out.push({ vowel: groups[Math.min(i, groups.length - 1)][0], hard: i === 0 && /^[^aeiouy]/.test(w) });
    return out;
  }
  // Vowel to filter center: open vowels bright, closed ones dark, so the blips sound like talking.
  var FORMANT = { a: 1100, e: 1700, i: 2200, o: 750, u: 600, y: 2000 };

  // Lays a line's words on 16th steps from `start` (32nds when `fast`). Returns the words with their times.
  function layout(text, start, fast) {
    var step = fast ? STEP / 2 : STEP;
    var words = text.split(/\s+/).map(function (w) { return { text: w, syl: syllables(w) }; });
    var count = words.reduce(function (n, w) { return n + Math.max(1, w.syl.length); }, 0);
    var slots = fast ? 32 : 16;
    var t = start + Math.max(0, Math.floor((slots - count) / 2)) * step;
    words.forEach(function (w) {
      w.t = t;
      if (/[,.?!]$/.test(w.text) && !fast) t += step; // a breath at punctuation
      t += Math.max(1, w.syl.length) * step;
    });
    return { words: words, step: step, end: t };
  }

  function babble(who, lay) {
    var V = VOICE[who], vs = [], all = [], t0 = lay.words[0].t;
    lay.words.forEach(function (w) {
      (w.syl.length ? w.syl : [{ vowel: 'a', hard: false }]).forEach(function (s, i) {
        all.push({ t: w.t - t0 + i * lay.step, s: s, loud: /[A-Z]{3,}/.test(w.text) });
      });
    });
    all.forEach(function (x, i) {
      var last = i === all.length - 1;
      // Rap cadence: flat-ish, a lift every fourth syllable, and the last word lands low and long.
      var semis = (i % 4 === 0 ? 2 : 0) + (Math.random() * 2 - 1) + (last ? -3 : 0);
      var f = V.f * Math.pow(2, semis / 12);
      var d = last ? lay.step * 2.5 : lay.step * 0.85;
      var o = { w: V.w, f: [f * 1.04, f], fd: 0.04, t: x.t, d: d, v: x.loud ? 0.2 : 0.13, bp: FORMANT[x.s.vowel] || 1200, q: V.q, a: 0.006, hold: 0.5 };
      if (V.drive) o.drive = V.drive;
      if (V.vib) o.vib = V.vib;
      vs.push(o);
      if (x.s.hard) vs.push({ w: 'noise', t: x.t, d: 0.018, v: 0.08, hp: 3500 }); // the consonant's click
    });
    return AU.playVoices(vs, t0, 'sfx');
  }

  // ---------- Crowd ----------
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function cheer(big) {
    var t = now() + 0.02, vs = [];
    for (var i = 0; i < 5; i++) vs.push({ w: 'noise', t: rnd(0, 0.15), d: big ? 2.4 : 1.6, v: 0.13, bp: rnd(900, 2600), q: 0.7, a: 0.25, hold: 0.5 });
    for (var j = 0; j < (big ? 8 : 4); j++) { var f = rnd(500, 900); vs.push({ w: 'sine', f: [f, f * 1.7, f * 1.3], t: rnd(0.05, 0.6), d: rnd(0.4, 0.7), v: 0.05, vib: [6, 12] }); }
    for (var k = 0; k < 10; k++) vs.push({ w: 'noise', t: 0.1 + k * 0.11 + rnd(0, 0.05), d: 0.03, v: 0.16, bp: 1400 }); // claps
    if (big) [0, 0.28, 0.56].forEach(function (dt) { // air horn
      [466, 470].forEach(function (hf) { vs.push({ w: 'sawtooth', f: hf, t: dt, d: dt === 0.56 ? 0.5 : 0.2, v: 0.08, lp: 3000, drive: 2 }); });
    });
    AU.playVoices(vs, t, 'sfx');
  }
  function boo() {
    var t = now() + 0.02, vs = [];
    vs.push({ w: 'noise', f: 0, t: 0, d: 0.4, v: 0.45, bp: [3200, 700, 2400, 400], q: 4 }); // record scratch
    for (var i = 0; i < 7; i++) { var f = rnd(120, 190); vs.push({ w: 'sawtooth', f: [f * 1.06, f, f * 0.8], t: 0.25 + rnd(0, 0.2), d: 1.7, v: 0.07, lp: 650, a: 0.25, hold: 0.55, vib: [rnd(4, 6), 3] }); }
    AU.playVoices(vs, t, 'sfx');
  }

  // ---------- Screen ----------
  function sprite(id) {
    var F = D.FIGHTERS[id];
    return F.art && F.art.body ? '<img src="' + F.art.body + '" alt="' + esc(F.name) + '" decoding="async">' : '<span>' + F.emoji + '</span>';
  }
  function build() {
    if ($('#screen-rap')) return;
    var sec = document.createElement('section');
    sec.id = 'screen-rap';
    sec.className = 'screen rap';
    sec.hidden = true;
    sec.innerHTML =
      '<div class="rap-top"><button class="btn btn-ghost btn-sm" id="rap-back" type="button">← Menu</button>' +
        '<span class="rap-round" id="rap-round"></span></div>' +
      '<div class="rap-meter"><span class="rap-mface" style="--c:' + D.FIGHTERS.toly.color + '"><img src="' + D.FIGHTERS.toly.art.head + '" alt=""></span>' +
        '<div class="rap-bar"><div class="rap-fill" id="rap-fill"></div><div class="rap-mid"></div></div>' +
        '<span class="rap-mface" style="--c:' + D.FIGHTERS.vitalik.color + '"><img src="' + D.FIGHTERS.vitalik.art.head + '" alt=""></span></div>' +
      '<p class="rap-meter-label">CROWD</p>' +
      '<div class="rap-stage" id="rap-stage">' +
        '<div class="rap-lyrics" id="rap-lyrics"></div>' +
        '<div class="rapper you" id="rap-you">' + sprite('toly') + '<b>' + esc(D.FIGHTERS.toly.name) + '</b></div>' +
        '<div class="rapper cpu" id="rap-cpu">' + sprite('vitalik') + '<b>' + esc(D.FIGHTERS.vitalik.name) + '</b></div>' +
        '<div class="rap-pop" id="rap-pop" hidden></div>' +
      '</div>' +
      '<div class="rap-crowd" id="rap-crowd">' + Array.apply(null, Array(14)).map(function (_, i) { return '<i style="--d:' + (i % 3) * 0.08 + 's;--h:' + (180 + i * 37 % 140) + '"></i>'; }).join('') + '</div>' +
      '<div class="rap-picks" id="rap-picks"></div>';
    $('#app').appendChild(sec);
    $('#rap-back').addEventListener('click', leave);
  }
  function show(id) { document.querySelectorAll('.screen').forEach(function (el) { el.hidden = el.id !== id; }); }

  function setMeter() {
    $('#rap-fill').style.width = S.meter + '%';
    $('#rap-fill').classList.toggle('losing', S.meter < 50);
  }
  function pop(text, kind) {
    var p = $('#rap-pop');
    p.textContent = text;
    p.className = 'rap-pop ' + kind;
    p.hidden = false;
    void p.offsetWidth;
    p.classList.add('go');
  }
  function crowd(mood) {
    var c = $('#rap-crowd');
    c.classList.remove('hype', 'boo');
    if (mood) { void c.offsetWidth; c.classList.add(mood); }
  }

  // Raps a couplet: karaoke words light up as the babble hits them. Resolves when the last word is out.
  async function rap(who, lines, fast) {
    var box = $('#rap-lyrics');
    $('#rap-you').classList.toggle('on', who === 'toly');
    $('#rap-cpu').classList.toggle('on', who === 'vitalik');
    box.className = 'rap-lyrics ' + (who === 'toly' ? 'from-you' : 'from-cpu') + (fast ? ' fast' : '');
    var start = nextBar(), lays = [], t = start;
    lines.forEach(function (line) {
      var lay = layout(line, t, fast);
      lays.push(lay);
      t = start + Math.ceil((lay.end - start - 0.001) / BAR) * BAR; // a long line spills into the next bar
    });
    box.innerHTML = lays.map(function (lay) {
      return '<p>' + lay.words.map(function (w) { return '<span>' + esc(w.text) + '</span>'; }).join(' ') + '</p>';
    }).join('');
    var spans = box.querySelectorAll('span'), k = 0;
    lays.forEach(function (lay) {
      babble(who, lay);
      lay.words.forEach(function (w) {
        var el = spans[k++];
        setTimeout(function () { el.classList.add('on'); }, Math.max(0, (w.t - now()) * 1000));
      });
    });
    await untilTime(lays[lays.length - 1].end + STEP * 2);
    $('#rap-you').classList.remove('on');
    $('#rap-cpu').classList.remove('on');
  }

  async function verdict(landed, gain, mine, big) {
    if (landed) {
      S.meter = Math.max(0, Math.min(100, S.meter + (mine ? gain : -gain)));
      cheer(big);
      crowd('hype');
      pop(big ? 'OHHHHH!' : 'YEAH!', 'land');
    } else {
      S.meter = Math.max(0, Math.min(100, S.meter + (mine ? -MISS : CPU_MISS)));
      cutBeat();
      boo();
      crowd('boo');
      pop('BOOOO!', 'miss');
    }
    setMeter();
    await wait(1700);
    crowd(null);
    $('#rap-pop').hidden = true;
  }

  function pickHTML(p, i) {
    var R = RISK[p.risk];
    return '<button class="rap-pick risk-' + p.risk + '" type="button" data-i="' + i + '">' +
      '<span class="rap-tag">' + R.label + ' · ' + Math.round(R.odds * 100) + '%</span>' +
      p.lines.map(function (l) { return '<span class="rap-line">' + esc(l) + '</span>'; }).join('') + '</button>';
  }
  function choose(round) {
    var box = $('#rap-picks');
    box.innerHTML = '<p class="rap-your">Your bars</p>' + round.picks.map(pickHTML).join('');
    return new Promise(function (resolve) {
      box.onclick = function (e) {
        var b = e.target.closest('.rap-pick');
        if (!b) return;
        box.onclick = null;
        box.innerHTML = '';
        AU.play('tap');
        resolve(round.picks[+b.dataset.i]);
      };
    });
  }

  async function battle() {
    var id = S.id;
    for (var r = 0; r < ROUNDS.length; r++) {
      if (!S || S.id !== id) return;
      var round = ROUNDS[r];
      $('#rap-round').textContent = 'Round ' + (r + 1) + ' of ' + ROUNDS.length;
      $('#rap-lyrics').innerHTML = '<p class="rap-call">' + (r === 0 ? 'Vitalik has the mic' : 'Round ' + (r + 1)) + '</p>';
      await wait(r === 0 ? 1200 : 700);
      if (!S || S.id !== id) return;
      await rap('vitalik', round.cpu);
      if (!S || S.id !== id) return;
      await verdict(Math.random() < CPU_ODDS, CPU_HIT, false, false);
      if (!S || S.id !== id) return;
      var pick = await choose(round);
      if (!S || S.id !== id) return;
      await rap('toly', pick.lines, pick.fast);
      if (!S || S.id !== id) return;
      var R = RISK[pick.risk];
      await verdict(Math.random() < R.odds, R.gain, true, R.gain >= 30);
    }
    if (!S || S.id !== id) return;
    finish();
  }

  function finish() {
    var won = S.meter > 50, tie = S.meter === 50;
    var who = won ? 'Toly' : 'Vitalik';
    if (won) { cheer(true); crowd('hype'); }
    $('#rap-lyrics').innerHTML = '<p class="rap-result">' + (tie ? 'DRAW' : esc(who.toUpperCase()) + ' TAKES THE CROWD') + '</p>' +
      '<p class="rap-sub">' + (tie ? 'The crowd wants a rematch.' : won ? 'Slop, kino, skibidi bop.' : 'Back to the blog.') + '</p>';
    $('#rap-picks').innerHTML = '<button class="btn btn-gold btn-big" id="rap-again" type="button">Run it back</button>';
    $('#rap-again').onclick = function () { AU.play('tap'); start(); };
  }

  function stop() {
    if (!S) return;
    S.over = true;
    clearInterval(S.beatTimer);
    S = null;
  }
  function start() {
    stop();
    build();
    S = { id: Math.random(), meter: 50 };
    show('screen-rap');
    AU.stopMusic(0.4);
    $('#rap-picks').innerHTML = '';
    $('#rap-round').textContent = '';
    crowd(null);
    setMeter();
    startBeat();
    battle();
  }
  function leave() {
    stop();
    show('screen-title');
    AU.music('menu', { from: 'loop', fade: 0.8 });
  }

  // The title gets a Rap Battle button while ?rap is in the URL.
  function addButton() {
    var story = $('#btn-story');
    if (!story || $('#btn-rap')) return;
    var b = document.createElement('button');
    b.id = 'btn-rap';
    b.type = 'button';
    b.className = 'btn btn-big btn-arcade btn-rap';
    b.innerHTML = '<svg class="ico" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0a3 3 0 0 1 3 3v4a3 3 0 0 1-6 0V3a3 3 0 0 1 3-3zM3 6.5h1.5V7a3.5 3.5 0 0 0 7 0v-.5H13V7a5 5 0 0 1-4.25 4.94V14H11v2H5v-2h2.25v-2.06A5 5 0 0 1 3 7z"/></svg>Rap Battle <small>Test</small>';
    story.insertAdjacentElement('afterend', b);
    b.addEventListener('click', start);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addButton); else addButton();
})();
