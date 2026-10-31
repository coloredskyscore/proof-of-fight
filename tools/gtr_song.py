#!/usr/bin/env python3
"""Turn a Suno song's stems into a Guitar Battle song (?guitar): two small MP3s and the note charts.
Needs: pip install numpy librosa miniaudio lameenc onnxruntime, plus basic-pitch (pip install --no-deps basic-pitch)

  python3 tools/gtr_song.py STEMS_DIR gtr-1a --name "Arena Anthem" --rhythm 0:20 1:32 --solo 0:29 1:48

STEMS_DIR holds Suno's stem download (files ending in Guitar.mp3, Drums.mp3, Bass.mp3 and so on). Give the
start of each chugging section (--rhythm) and each solo section (--solo); each snaps to the nearest downbeat
and becomes a four-bar part, and a pick in the game draws one of them at random. The band file is every stem
except the guitar and the vocals; the guitar file is the guitar stem. Both hold the same clips at the same
times: a 2-bar loop the band vamps on between turns, then each section.

The charts come from the guitar stem: basic-pitch transcribes it, notes that start together become one
strum, and each part keeps its strongest strums with a minimum gap. Rhythm follows the low strings and Solo
the high lead, since one stem can hold several guitars. Strums are pinned to the guitar's attack, then onto
the drum grid (8ths for Rhythm, 16ths for Solo). The grid comes from the drum stem beat by beat, so a song
whose tempo drifts still lines up.
Writes audio/guitar/<id>-band.mp3, audio/guitar/<id>-guitar.mp3 and the song's entry in js/guitar-songs.js.
"""
import argparse
import glob
import json
import os
import re

import lameenc
import librosa
import miniaudio
import numpy as np

SR = 44100
BARS = 4                    # bars in a part
PAD = 0.025                 # what browsers add to the front of these MP3s (measured, as for the rap beats)
GAP = 0.4                   # silence between clips in the files
# Per part: min seconds between strums, most and fewest strums, and the register it follows. Suno can put
# every guitar on one stem, so Rhythm follows the low strings (the chugs) and Solo the high lead line.
PART = {
    'rhythm': {'gap': 0.26, 'max': 18, 'min': 12, 'lo': 0, 'hi': 60, 'div': 2},     # on 8ths
    'solo':   {'gap': 0.15, 'max': 28, 'min': 16, 'lo': 64, 'hi': 128, 'div': 4},   # on 16ths
}


def load(path):
    d = miniaudio.decode_file(path, output_format=miniaudio.SampleFormat.FLOAT32, nchannels=2, sample_rate=SR)
    return np.frombuffer(d.samples, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def secs(s):
    if ':' in s:
        m, x = s.split(':')
        return int(m) * 60 + float(x)
    return float(s)


def grid(drums):
    """Beat times from the drum stem, and which beats are downbeats (the kick's strongest phase)."""
    mono = drums.mean(1)
    y = librosa.resample(mono, orig_sr=SR, target_sr=22050)
    oe = librosa.onset.onset_strength(y=y, sr=22050, hop_length=256)
    tempo, beats = librosa.beat.beat_track(onset_envelope=oe, sr=22050, hop_length=256, units='time', tightness=300)
    S = np.abs(librosa.stft(y, n_fft=1024, hop_length=256))
    f = librosa.fft_frequencies(sr=22050, n_fft=1024)
    kick = S[f < 120].sum(0)
    fr = librosa.time_to_frames(beats, sr=22050, hop_length=256)
    ks = np.array([kick[max(0, i - 2):i + 4].max() for i in fr])
    phase = int(np.argmax([ks[np.arange(len(beats)) % 4 == p].mean() for p in range(4)]))
    return beats, beats[np.arange(len(beats)) % 4 == phase]


def transcribe(guitar_path):
    """basic-pitch notes on the guitar stem: [(start, end, midi pitch, amplitude)]."""
    from basic_pitch import ICASSP_2022_MODEL_PATH
    from basic_pitch.inference import predict
    _, _, notes = predict(guitar_path, ICASSP_2022_MODEL_PATH, onset_threshold=0.5, frame_threshold=0.3, minimum_note_length=60)
    return [(float(n[0]), float(n[1]), int(n[2]), float(n[3])) for n in notes]


def strums(notes):
    """Notes that start together become one strum: [{t, end, pitch, amp}]."""
    out = []
    for s, e, p, a in sorted(notes, key=lambda n: n[0]):
        if out and s - out[-1]['t'] < 0.045:
            c = out[-1]
            c['ps'].append(p)
            c['amp'] = max(c['amp'], a)
            c['end'] = max(c['end'], e)
        else:
            out.append({'t': float(s), 'end': float(e), 'ps': [p], 'amp': float(a)})
    for c in out:
        c['pitch'] = float(np.median(c['ps']))
    return out


def flux(guitar):
    """The guitar stem's attack strength (spectral flux), 100 frames a second, to pin each strum's start."""
    y = librosa.resample(guitar.mean(1), orig_sr=SR, target_sr=22050)
    return librosa.onset.onset_strength(y=y, sr=22050, hop_length=220, lag=1, max_size=3)


def pin(t, fl, beats, div):
    """Moves a strum to the strongest attack within 70 ms (basic-pitch starts are smeared), then onto the
    drum grid (div slots a beat), so the notes ride the beat you feel."""
    i = int(round(t * 100))
    w = fl[max(0, i - 7):i + 8]
    if len(w):
        t = (max(0, i - 7) + int(np.argmax(w))) / 100
    j = np.searchsorted(beats, t)
    if 0 < j < len(beats):
        q = np.linspace(beats[j - 1], beats[j], div + 1)
        t = float(q[np.argmin(np.abs(q - t))])
    return t


def chart(notes, part, start, end, beats, fl):
    P = PART[part]
    cands = strums([n for n in notes if P['lo'] <= n[2] < P['hi']])
    for c in cands:
        c['t'] = pin(c['t'], fl, beats, P['div'])
    pool = [c for c in cands if start - 0.04 <= c['t'] < end - 0.15]
    pool.sort(key=lambda c: -c['amp'] * (1 + 0.2 * len(c['ps'])))
    keep = []
    for c in pool:
        if len(keep) >= P['max']:
            break
        if all(abs(c['t'] - k['t']) >= P['gap'] for k in keep):
            keep.append(c)
    # Too few strums found: fill in on the beats the guitar left empty.
    if len(keep) < P['min']:
        for b in beats:
            if start <= b < end - 0.15 and all(abs(b - k['t']) >= P['gap'] for k in keep):
                keep.append({'t': float(b), 'end': float(b) + 0.2, 'ps': [], 'pitch': 0, 'amp': 0})
            if len(keep) >= P['min']:
                break
    keep.sort(key=lambda c: c['t'])
    notes = []
    for i, c in enumerate(keep):
        nxt = keep[i + 1]['t'] if i + 1 < len(keep) else end
        ring = min(c['end'], nxt - 0.12) - c['t']
        notes.append([round(c['t'] - start, 3), round(ring, 3) if ring > 0.45 else 0])
    return notes


def mp3(x, path):
    enc = lameenc.Encoder()
    enc.set_bit_rate(128)
    enc.set_in_sample_rate(SR)
    enc.set_channels(2)
    enc.set_quality(2)
    pcm = (np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()
    with open(path, 'wb') as f:
        f.write(enc.encode(pcm) + enc.flush())


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('stems')
    ap.add_argument('id')
    ap.add_argument('--name', required=True)
    for p in PART:
        ap.add_argument('--' + p, required=True, nargs='+', help='where each such section starts (m:ss or seconds)')
    ap.add_argument('--vamp', help='where the 2-bar vamp starts (default: the first rhythm section)')
    ap.add_argument('--vol', type=float, default=0.8, help='playback volume for both files')
    ap.add_argument('--root', default=os.path.join(os.path.dirname(__file__), '..'))
    args = ap.parse_args()

    files = glob.glob(os.path.join(args.stems, '*.mp3'))
    def find(word):
        hit = [f for f in files if re.search(word + r'\.mp3$', f, re.I)]
        return hit[0] if hit else None
    gpath = find('guitar')
    band_paths = [f for f in files if f != gpath and not re.search(r'(vocals|full.song)\.mp3$', f, re.I)]
    print('guitar:', os.path.basename(gpath))
    print('band:', ', '.join(os.path.basename(f) for f in band_paths))
    guitar = load(gpath)
    stems = [load(f) for f in band_paths]
    n = min([len(guitar)] + [len(s) for s in stems])
    guitar = guitar[:n]
    band = sum(s[:n] for s in stems)
    beats, downs = grid(load(find('drums'))[:n])

    def snap(t):
        return float(downs[np.argmin(np.abs(downs - t))])

    def bar_after(t, k):  # the downbeat k bars after downbeat t
        i = int(np.argmin(np.abs(downs - t)))
        return float(downs[min(i + k, len(downs) - 1)])

    notes = transcribe(gpath)
    fl = flux(guitar)
    song = {'name': args.name, 'vol': args.vol, 'parts': {p: [] for p in PART}}
    vs = snap(secs(args.vamp or args.rhythm[0]))
    ve = bar_after(vs, 2)
    clips = [('vamp', vs, vs - 0.1, ve + 0.25)]
    for p in PART:
        for t in getattr(args, p):
            s = snap(secs(t))
            if (bar_after(s, BARS) - s) < (ve - vs) * BARS / 2 * 0.85:
                print(f'skipping {p} at {t}: the song ends before four bars are up')
                continue
            clips.append((p, s, s - 0.1, bar_after(s, BARS) + 0.45))

    out_b, out_g, at = [np.zeros((int(0.3 * SR), 2))], [np.zeros((int(0.3 * SR), 2))], 0.3
    for name, s, a, b in clips:
        ia, ib = int(a * SR), int(b * SR)
        seg_b, seg_g = band[ia:ib].copy(), guitar[ia:ib].copy()
        fade = int(0.01 * SR)
        for seg in (seg_b, seg_g):
            seg[:fade] *= np.linspace(0, 1, fade)[:, None]
            seg[-fade:] *= np.linspace(1, 0, fade)[:, None]
        if name == 'vamp':
            seg_g[:] = 0  # the band waits for its guitarist
            song['vamp'] = {'at': round(at + PAD + (s - a), 4), 'len': round(ve - vs, 4)}
        else:
            e = bar_after(s, BARS)
            bar = (e - s) / BARS
            local = [round(float(x) - s, 3) for x in beats if s - bar - 0.01 <= x <= e + 0.01]
            song['parts'][name].append({
                'at': round(at + PAD + (s - a), 4),      # file time of the section's first downbeat
                'len': round(e - s, 4),                  # its four bars
                'beats': local,                          # from the bar before (the lead-in) to the end
                'notes': chart(notes, name, s, e, beats, fl),
                'src': round(s, 3)                       # where it is in the song
            })
        out_b.append(seg_b)
        out_g.append(seg_g)
        at += (ib - ia) / SR
        out_b.append(np.zeros((int(GAP * SR), 2)))
        out_g.append(np.zeros((int(GAP * SR), 2)))
        at += int(GAP * SR) / SR
    os.makedirs(os.path.join(args.root, 'audio', 'guitar'), exist_ok=True)
    mp3(np.concatenate(out_b), os.path.join(args.root, 'audio', 'guitar', args.id + '-band.mp3'))
    mp3(np.concatenate(out_g), os.path.join(args.root, 'audio', 'guitar', args.id + '-guitar.mp3'))
    for p, secs_ in song['parts'].items():
        for v in secs_:
            print(f"{p:6s} {v['src']:7.2f}s  {240 / v['len'] * BARS:6.2f} BPM  {len(v['notes'])} strums")

    js = os.path.join(args.root, 'js', 'guitar-songs.js')
    songs = {}
    if os.path.exists(js):
        m = re.search(r'window\.POF_GUITAR_SONGS = (\{.*\});', open(js).read(), re.S)
        if m:
            songs = json.loads(m.group(1))
    songs[args.id] = song
    with open(js, 'w') as f:
        f.write('/* Guitar Battle songs (?guitar), written by tools/gtr_song.py from each song\'s Suno stems. Per song: the\n'
                '   band\'s 2-bar vamp and, per part, its sections (file time of the first downbeat, four bars long,\n'
                '   the beat grid and the strums: [seconds from the downbeat, how long it rings]). */\n')
        f.write('window.POF_GUITAR_SONGS = ' + json.dumps(songs, separators=(',', ':')) + ';\n')
    print('wrote', js)


if __name__ == '__main__':
    main()
