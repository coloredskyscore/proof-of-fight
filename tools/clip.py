#!/usr/bin/env python3
"""Turn a short recorded sound (an announcer line, a Suno one-shot) into a game clip.
Needs: pip install numpy miniaudio lameenc

  python3 tools/clip.py you_win.ogg audio/vo/you_win.mp3

Trims the silence before and after, mixes to mono, levels the peak to -1 dB so every clip starts
equally loud (js/audio.js sets how loud each one plays), adds tiny fades so nothing clicks, and
saves a small MP3 (every browser plays MP3; iPhones don't all play OGG).
"""
import argparse
import json
import miniaudio
import numpy as np
import lameenc

START = 0.01       # the sound starts where it first gets this loud (of full scale)...
LEAD = 0.02        # ...minus this many seconds, so a soft first consonant ("flawless") survives
END = 0.003        # it ends where it last gets this loud, so a reverb tail isn't chopped...
TAIL = 0.05        # ...plus this many seconds, faded out
PEAK = 10 ** (-1 / 20)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('source')
    ap.add_argument('out')
    ap.add_argument('--kbps', type=int, default=96)
    args = ap.parse_args()

    d = miniaudio.decode_file(args.source, output_format=miniaudio.SampleFormat.FLOAT32)
    sr = d.sample_rate
    x = np.frombuffer(d.samples, dtype=np.float32).reshape(-1, d.nchannels).mean(axis=1).astype(np.float64)
    loud, tail = np.where(np.abs(x) > START)[0], np.where(np.abs(x) > END)[0]
    assert len(loud), 'the file is silent'
    a = max(0, loud[0] - int(LEAD * sr))
    b = min(len(x), tail[-1] + int(TAIL * sr))
    x = x[a:b] * (PEAK / np.abs(x[a:b]).max())
    fin, fout = min(int(0.005 * sr), len(x) // 4), min(int(TAIL * sr), len(x) // 2)  # a very short click gets shorter fades
    x[:fin] *= np.linspace(0, 1, fin)
    x[-fout:] *= np.linspace(1, 0, fout)

    enc = lameenc.Encoder()
    enc.set_bit_rate(args.kbps)
    enc.set_in_sample_rate(sr)
    enc.set_channels(1)
    enc.set_quality(2)
    mp3 = enc.encode((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()) + enc.flush()
    with open(args.out, 'wb') as f:
        f.write(mp3)
    print(json.dumps({'out': args.out, 'seconds': round(len(x) / sr, 3), 'kb': round(len(mp3) / 1024, 1)}))


if __name__ == '__main__':
    main()
