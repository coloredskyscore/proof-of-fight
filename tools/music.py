#!/usr/bin/env python3
"""Turn a full song (e.g. from Suno) into a game music file that loops seamlessly.
Needs: pip install numpy miniaudio lameenc

  python3 tools/music.py SONG.mp3 audio/fight.mp3 --start 12.85 --loop 13.41 72.578

--start      where playback begins, in seconds of the original song
--loop A B   the looped part: when playback reaches B it jumps back to A. Pick A and B on bar
             lines (B - A a whole number of bars) so the beat never stumbles.

The seam is baked into the file: the last moments before B fade into the audio just before A,
and the final 60 ms before B are an exact copy of it. A browser that pads the start of an MP3
by a few milliseconds still loops without a click. Prints the loop points in seconds of the
new file, for js/audio.js.
"""
import argparse
import json
import miniaudio
import numpy as np
import lameenc

FADE = 0.20     # seconds before B where the crossfade into the pre-A audio starts
EXACT = 0.06    # last seconds before B that are an exact copy of the audio before A
TAIL = 0.25     # audio after B (a copy of what follows A), so the decoder never runs dry


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('source')
    ap.add_argument('out')
    ap.add_argument('--start', type=float, required=True)
    ap.add_argument('--loop', type=float, nargs=2, required=True, metavar=('A', 'B'))
    ap.add_argument('--kbps', type=int, default=128)
    args = ap.parse_args()

    d = miniaudio.decode_file(args.source, output_format=miniaudio.SampleFormat.FLOAT32)
    sr, ch = d.sample_rate, d.nchannels
    x = np.frombuffer(d.samples, dtype=np.float32).reshape(-1, ch).astype(np.float64)
    A, B = args.loop
    s0, a, b = (int(round(t * sr)) for t in (args.start, A, B))
    assert s0 <= a < b <= len(x), 'need start <= A < B <= song length'
    L = b - a

    seam = x[b - int(FADE * sr):b].copy()
    pre = x[b - int(FADE * sr) - L:b - L]               # the audio just before A
    n, exact = len(seam), int(EXACT * sr)
    w = np.clip(np.arange(n) / (n - exact), 0, 1)[:, None]
    w = 0.5 - 0.5 * np.cos(np.pi * w)                    # smooth fade
    body = np.concatenate([x[s0:b - n], seam * (1 - w) + pre * w, x[a:a + int(TAIL * sr)]])
    body[:int(0.005 * sr)] *= np.linspace(0, 1, int(0.005 * sr))[:, None]  # no click at the very start

    pcm = (np.clip(body, -1, 1) * 32767).astype('<i2')
    enc = lameenc.Encoder()
    enc.set_bit_rate(args.kbps)
    enc.set_in_sample_rate(sr)
    enc.set_channels(ch)
    enc.set_quality(2)
    mp3 = enc.encode(pcm.tobytes()) + enc.flush()
    with open(args.out, 'wb') as f:
        f.write(mp3)

    info = {'loopStart': round((a - s0) / sr, 4), 'loopEnd': round((b - s0) / sr, 4),
            'length': round(len(body) / sr, 3), 'kb': round(len(mp3) / 1024)}
    print(json.dumps(info))


if __name__ == '__main__':
    main()
