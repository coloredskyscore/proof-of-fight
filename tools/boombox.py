#!/usr/bin/env python3
"""Builds the extra song files for the hub's boombox (audio/box/). Every other boombox song plays a game's own file.
Needs: pip install numpy miniaudio lameenc

  python3 tools/boombox.py PROJECT_FILES RENDER_DIR

PROJECT_FILES  the project's shared folder (has rap-battle/beats-source/ and guitar-battle/songs-source/)
RENDER_DIR     WAVs from `node tools/boombox-render.js RENDER_DIR` (51% Attack and Ride the Chart, made in code)

- Rap Battle: the full Suno beats (the game only ships 40-second loops).
- Guitar Battle: Arena Anthem's full song.
- Fighting game: only the game's loop cuts survive, so each plays its intro, then its loop until about two minutes,
  then fades out. The loops are seamless (tools/music.py bakes the seam in), so the repeats never stumble.
- 51% Attack and Ride the Chart: the rendered WAVs, with a fade in and out.
New songs are levelled to -16 LUFS (ffmpeg loudnorm, like the game files) and everything is saved at 112 kbps.
"""
import os
import sys
import miniaudio
import numpy as np
import lameenc
import subprocess

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', 'audio', 'box')


def load(path):
    d = miniaudio.decode_file(path, output_format=miniaudio.SampleFormat.FLOAT32, nchannels=2, sample_rate=SR)
    return np.frombuffer(d.samples, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def fade(x, fin=0.0, fout=0.0):
    x = x.copy()
    if fin: n = int(fin * SR); x[:n] *= np.linspace(0, 1, n)[:, None]
    if fout: n = int(fout * SR); x[-n:] *= np.linspace(1, 0, n)[:, None] ** 2
    return x


def save(x, name, level=True):
    os.makedirs(OUT, exist_ok=True)
    if level:   # ffmpeg's loudnorm: -16 LUFS with a true-peak ceiling, so quiet code-made music is lifted without clipping
        pcm = (np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af',
                        'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', str(SR), '-b:a', '112k', os.path.join(OUT, name + '.mp3')], input=pcm, check=True)
        print(f'{name}.mp3  {len(x) / SR:6.1f}s')
        return
    peak = np.max(np.abs(x))
    if peak > 0.98: x = x * 0.98 / peak
    enc = lameenc.Encoder()
    enc.set_bit_rate(112); enc.set_in_sample_rate(SR); enc.set_channels(2); enc.set_quality(2)
    pcm = (x * 32767).astype(np.int16).tobytes()
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name + '.mp3'), 'wb') as f:
        f.write(enc.encode(pcm) + enc.flush())
    print(f'{name}.mp3  {len(x) / SR:6.1f}s')


def extend(src, name, loop_start, loop_end, target=120.0, out_fade=6.0):
    x = load(src)
    a, b = int(round(loop_start * SR)), int(round(loop_end * SR))
    parts, total = [x[:b]], b
    while total < target * SR:
        parts.append(x[a:b]); total += b - a
    parts.append(x[a:a + int(out_fade * SR)])   # the fade-out runs into the start of one more pass
    y = np.concatenate(parts)
    n = int(out_fade * SR)
    y[-n:] *= np.linspace(1, 0, n)[:, None] ** 2
    save(y, name, level=False)   # the game files are already levelled


def main():
    pf, rd = sys.argv[1], sys.argv[2]
    beats = os.path.join(pf, 'rap-battle', 'beats-source')
    for name, f in [('rap-detroit', 'Detroit-Beat.mp3'), ('rap-glitch-chop', 'East-2-Glitch-Chop.mp3'), ('rap-cold-streets', 'East-3.mp3'),
                    ('rap-gangsta', 'West-1.mp3'), ('rap-the-bounce', 'West-2.mp3'), ('rap-night-ride', 'West-3.mp3'),
                    ('rap-final-round', 'Final_Round.mp3'), ('rap-the-riff', 'Battle-2-The-Riff.mp3'), ('rap-showdown', 'Battle-3-Showdown.mp3')]:
        save(fade(load(os.path.join(beats, f)), fout=0.05), name)
    save(load(os.path.join(pf, 'guitar-battle', 'songs-source', 'gtr-1a', 'gtr-1a-Full-Song.mp3')), 'arena-anthem')
    # Loop points: MUSIC in js/audio.js.
    root = os.path.join(os.path.dirname(__file__), '..', 'audio')
    for name, lo, hi in [('menu', 3.3674, 43.7774), ('fight', 0.56, 59.728), ('schiff', 3.233, 34.557), ('dimon', 3.363, 53.319),
                         ('warren', 6.432, 57.632), ('sbf', 2.771, 49.083), ('wick', 1.625, 40.02)]:
        extend(os.path.join(root, name + '.mp3'), 'pof-' + name, lo, hi)
    save(fade(load(os.path.join(rd, 'a51.wav')), 0.5, 8), 'a51-hold-the-line')
    save(fade(load(os.path.join(rd, 'ride.wav')), 0.3, 8), 'ride-buy-the-dip')


if __name__ == '__main__':
    main()
