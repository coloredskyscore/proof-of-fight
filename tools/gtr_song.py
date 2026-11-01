#!/usr/bin/env python3
"""Turn a Suno song's stems into a Guitar Battle song (?guitar): three small MP3s and the note charts.
Needs: pip install numpy scipy librosa miniaudio lameenc

  python3 tools/gtr_song.py STEMS_DIR gtr-1a --name "Arena Anthem" --rhythm 0:20 1:32 --solo 0:29 1:48

STEMS_DIR holds Suno's stem download (files ending in Guitar.mp3, Drums.mp3, Bass.mp3 and so on). Give the
start of each chugging section (--rhythm) and each solo section (--solo); each snaps to the nearest downbeat
and becomes an eight-bar part, and a pick in the game draws one of them at random. The Drums part plays over
every one of those sections, unless --drums gives sections of its own. The band file is every stem except the
guitar, the drums and the vocals; the drums file and the guitar file are those stems. All three hold the same
clips at the same times: a 2-bar loop the band vamps on between turns, each section, and the song's ending
(from the last downbeat, or --end, to the end of the file), which plays when the battle is over.

Every note sits where you hear something happen, never on a grid guess:
- Drums: each beat where the drum stem actually hits.
- Rhythm: each chug, found as a jump in the guitar's low end (60-500 Hz) that reaches the loud part of the
  section. Suno can put every guitar on one stem; the chugs are the only thing down there.
- Solo: each new note of the lead, found by tracking the loudest pitch in the lead's register (300-1600 Hz)
  along its smoothest path (so the tracker doesn't hop between two guitars) and starting a note where the
  pitch moves and holds, or the note is picked again. Vibrato, bends and trills stay one note, and a long
  note gets a tail.
A note's time is its attack plus 10 ms (when the ear places it, and where the sync check's clicks sit).
Writes audio/guitar/<id>-band.mp3, -drums.mp3 and -guitar.mp3, and the song's entry in js/guitar-songs.js.
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
from scipy.ndimage import median_filter
from scipy.signal import butter, sosfiltfilt, stft

SR = 44100
BARS = 8                    # bars in a part (a turn); --bars changes it
TAIL = 3.2                  # seconds kept after a section, so the music can ring out or fade when a turn ends
PAD = 0.025                 # what browsers add to the front of these MP3s (measured, as for the rap beats)
GAP = 0.4                   # silence between clips in the files
HOP = 220                   # analysis frames: 5 ms
FR = HOP / SR
PC = 0.010                  # where the ear places an attack: 10 ms after its steepest rise
MIN_GAP = 0.12              # closest two notes can be (a 16th at 125 BPM)
RING = 0.45                 # a note held at least this long gets a tail on the lane


def load(path):
    d = miniaudio.decode_file(path, output_format=miniaudio.SampleFormat.FLOAT32, nchannels=2, sample_rate=SR)
    return np.frombuffer(d.samples, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def secs(s):
    if ':' in s:
        m, x = s.split(':')
        return int(m) * 60 + float(x)
    return float(s)


# ---------- Attacks ----------
def band_db(x, lo, hi, win=0.01):
    """Level of one frequency band in dB, one value per 5 ms frame (frame i centred on sample i*HOP)."""
    y = sosfiltfilt(butter(4, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
    w = int(win * SR)
    return 10 * np.log10(np.convolve(y * y, np.ones(w) / w, mode='same')[::HOP] + 1e-10)


def attacks(db, rise, back=0.06, mind=0.06):
    """Where the level jumps at least `rise` dB above its low over the last `back` seconds:
    [(time of the steepest rise, frame, peak dB)]."""
    k, n = int(back / FR), len(db)
    slope = np.diff(db, prepend=db[0])
    out, i = [], k
    while i < n:
        lo = db[i - k:i].min()
        if db[i] - lo >= rise:
            j0 = i - k + int(np.argmin(db[i - k:i]))
            top = i + int(np.argmax(db[i:i + int(0.04 / FR)]))
            st = j0 + int(np.argmax(slope[j0 + 1:top + 1])) + 1
            out.append((st * FR, st, float(db[st:st + int(0.08 / FR)].max())))
            i = top + int(mind / FR)
        else:
            i += 1
    return out


def grid(drums):
    """Beat times from the drum stem, and the downbeats (the kick's strongest phase). The tracker's beats run
    late of the hits, so the whole grid moves onto the drum stem's own attacks."""
    mono = drums.mean(1)
    y = librosa.resample(mono, orig_sr=SR, target_sr=22050)
    oe = librosa.onset.onset_strength(y=y, sr=22050, hop_length=256)
    _, beats = librosa.beat.beat_track(onset_envelope=oe, sr=22050, hop_length=256, units='time', tightness=300)
    S = np.abs(librosa.stft(y, n_fft=1024, hop_length=256))
    f = librosa.fft_frequencies(sr=22050, n_fft=1024)
    kick = S[f < 120].sum(0)
    fr = librosa.time_to_frames(beats, sr=22050, hop_length=256)
    ks = np.array([kick[max(0, i - 2):i + 4].max() for i in fr])
    phase = int(np.argmax([ks[np.arange(len(beats)) % 4 == p].mean() for p in range(4)]))
    db = band_db(mono, 40, 12000)
    hits = np.array([a[0] + PC for a in attacks(db, 6.0, mind=0.1)])
    near = [hits[np.argmin(np.abs(hits - b))] - b for b in beats if np.min(np.abs(hits - b)) < 0.06]
    shift = float(np.median(near)) if near else 0.0
    print(f'beat grid: {len(beats)} beats, moved {shift * 1000:+.0f} ms onto the drum hits')
    beats = beats + shift
    soft = np.array([a[0] + PC for a in attacks(db, 3.0, mind=0.03)])  # quieter hits, and hits right after another
    return beats, beats[np.arange(len(beats)) % 4 == phase], (hits, soft, db)


def drum_notes(start, end, beats, drums):
    """A hit on every beat where the drums play one, at the hit's own time (a softer hit if that's all there
    is near the beat, or the beat itself when the drums are going but no single attack stands out)."""
    hits, soft, db = drums
    med = np.median(db[int(start / FR):int(end / FR)])
    out = []
    for b in beats:
        if not start - 0.04 <= b < end - 0.15:
            continue
        for pool in (hits, soft):
            j = int(np.argmin(np.abs(pool - b)))
            if abs(pool[j] - b) < 0.05:
                out.append([round(float(pool[j]) - start, 3), 0])
                break
        else:
            i = int(b / FR)
            if db[i - 6:i + 6].max() >= med:
                out.append([round(float(b) - start, 3), 0])
    return out


def rhythm_notes(low, start, end, rise=8.0, pct=85):
    """The chugs: jumps of `rise` dB in the guitar's low end that peak in the loudest (100 - pct)% of the
    section. A chug that rings gets a tail."""
    i0, i1 = int(start / FR), int(end / FR)
    top = np.percentile(low[i0:i1], pct)
    keep = []
    for t, fr, pk in attacks(low, rise):
        if start - 0.04 <= t + PC < end - 0.15 and pk >= top - 1.0 and not (keep and t - keep[-1][0] < MIN_GAP):
            keep.append((t, fr, pk))
    out = []
    for k, (t, fr, pk) in enumerate(keep):
        nxt = keep[k + 1][1] if k + 1 < len(keep) else i1
        e = fr
        while e < nxt and low[e] > pk - 8:
            e += 1
        ring = (e - fr) * FR
        out.append([round(t + PC - start, 3), round(ring, 3) if ring >= RING else 0])
    return out


# ---------- The lead ----------
def lead_salience(x, fmin=300, fmax=1600, nfft=2048):
    """How strongly each pitch (quarter-semitone steps) sounds in each frame, summing its first 4 harmonics."""
    f, _, Z = stft(x, fs=SR, window='hann', nperseg=nfft, noverlap=nfft - HOP, boundary='even', padded=True)
    M = np.abs(Z)
    q = np.arange(round(48 * np.log2(fmin / 440)), round(48 * np.log2(fmax / 440)))
    cands = 440 * 2 ** (q / 48)
    df = f[1] - f[0]
    sal = np.zeros((len(cands), M.shape[1]))
    for h, w in zip(range(1, 5), [1.0, 0.6, 0.4, 0.3]):
        fb = cands * h / df
        lo = np.floor(fb).astype(int)
        fr = fb - lo
        sal += w * (M[lo] * (1 - fr)[:, None] + M[lo + 1] * fr[:, None])
    return 69 + 12 * np.log2(cands / 440), sal


def lead_path(midis, sal, i0, i1, jump_cost=1.0):
    """The loudest smooth pitch path (Viterbi): each frame scores dB below its loudest pitch, and moving costs
    jump_cost dB per semitone, so vibrato is cheap and hopping between two guitars is not.
    Returns (pitch, level dB, how far it stands above the frame's median)."""
    S = 20 * np.log10(sal[:, i0:i1] + 1e-9)
    E = S - S.max(0)
    n, T = S.shape
    D = np.abs(midis[:, None] - midis[None, :]) * jump_cost
    score, back = E[:, 0].copy(), np.zeros((T, n), dtype=np.int32)
    for t in range(1, T):
        tot = score[None, :] - D
        b = np.argmax(tot, 1)
        score = tot[np.arange(n), b] + E[:, t]
        back[t] = b
    path = np.zeros(T, dtype=int)
    path[-1] = int(np.argmax(score))
    for t in range(T - 1, 0, -1):
        path[t - 1] = back[t, path[t]]
    level = S[path, np.arange(T)]
    return midis[path], level, level - np.median(S, 0)


def lead_segments(m, lv, con, t0, voiced=8.0, big=1.4, small=0.7, hold_big=0.04, hold_small=0.10, reatk=7.0,
                  mindur=0.07):
    """Notes along the lead's path: [(start, length, pitch)]. A new note starts where the pitch leaves the
    note's centre by more than `big` semitones for hold_big, or by more than `small` and holds steady for
    hold_small (vibrato swings that far but never holds); where the lead comes back after a gap; or where its
    level jumps `reatk` dB after a dip (picked again). A slow glide into the new pitch is a bend: same note."""
    m, lv = median_filter(m, 5), median_filter(lv, 3)
    v = median_filter((con >= voiced).astype(int), 9).astype(bool)
    hb, hs = int(hold_big / FR), int(hold_small / FR)
    notes, cur, i, n = [], None, 0, len(m)
    while i < n:
        if not v[i]:
            if cur is not None:
                notes.append((cur, i))
            cur = None
            i += 1
            continue
        if cur is None:
            cur = i
            i += 1
            continue
        c = np.median(m[cur:i])
        w1, w2 = m[i:i + hb], m[i:i + hs]
        if (len(w1) == hb and np.all(np.abs(w1 - c) > big)) or \
                (len(w2) == hs and np.all(np.abs(w2 - c) > small) and np.ptp(w2) < 0.4):
            k = i
            while k > cur and abs(m[k - 1] - c) > 0.35:
                k -= 1
            if (i - k) * FR > 0.07:
                i += 1
                continue
            notes.append((cur, i))
            cur = i
            i += 3
            continue
        if i - cur > 10:
            win = lv[max(cur, i - 16):i]
            if lv[i] - win.min() >= reatk and lv[i] >= win.max() - 0.5 and np.argmin(win) > len(win) // 3:
                notes.append((cur, i))
                cur = i
                i += 4
                continue
        i += 1
    if cur is not None:
        notes.append((cur, n))
    return [(t0 + a * FR, (b - a) * FR, float(np.median(m[a:b]))) for a, b in notes if (b - a) * FR >= mindur]


def solo_notes(midis, sal, start, end, low_pitch=69):
    """The lead's notes in a solo section: only notes up in the lead's range (A4 and up) and not much quieter
    than the section's lead; a quick wobble between two neighbouring pitches is one note; a slide into a long
    note joins it."""
    i0, i1 = int((start - 0.3) / FR), int((end + 0.1) / FR)
    m, lv, con = lead_path(midis, sal, i0, i1)
    raw = lead_segments(m, lv, con, i0 * FR)
    lvl = [float(np.median(lv[int(st / FR) - i0:int(st / FR) - i0 + max(1, int(du / FR))])) for st, du, _ in raw]
    ref = np.percentile(lvl, 75) if lvl else 0
    notes = [(st, du, p) for (st, du, p), lev in zip(raw, lvl) if p >= low_pitch and lev >= ref - 12]
    merged = []
    for st, du, p in notes:
        if len(merged) >= 2 and du < 0.16 and merged[-1][1] < 0.16 and abs(p - merged[-2][2]) < 0.5 \
                and abs(p - merged[-1][2]) <= 2.5 and st - (merged[-2][0] + merged[-2][1]) < 0.2:
            merged.pop()
            b = merged.pop()
            merged.append((b[0], st + du - b[0], b[2]))
            continue
        merged.append((st, du, p))
    keep = []
    for st, du, _ in merged:
        t = st + PC
        if not (start - 0.04 <= t < end - 0.15):
            continue
        if keep and t - keep[-1][0] < MIN_GAP:
            keep[-1][1] = max(keep[-1][1], t + du)
            continue
        keep.append([t, t + du])
    out = []
    for k, (t, e) in enumerate(keep):
        nxt = keep[k + 1][0] if k + 1 < len(keep) else end
        ring = min(e, nxt - 0.1, end) - t
        out.append([round(t - start, 3), round(ring, 3) if ring >= RING else 0])
    return out


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
    for p in ('rhythm', 'solo'):
        ap.add_argument('--' + p, required=True, nargs='+', help='where each such section starts (m:ss or seconds)')
    ap.add_argument('--drums', nargs='+', help='sections for the Drums part (default: every rhythm and solo section)')
    ap.add_argument('--vamp', help='where the 2-bar vamp starts (default: the first rhythm section)')
    ap.add_argument('--end', help='where the ending starts (default: the last downbeat); it snaps to a drum hit')
    ap.add_argument('--bars', type=int, default=BARS, help='bars in each part (default %(default)s)')
    ap.add_argument('--vol', type=float, default=0.8, help='playback volume for both files')
    ap.add_argument('--root', default=os.path.join(os.path.dirname(__file__), '..'))
    args = ap.parse_args()

    files = glob.glob(os.path.join(args.stems, '*.mp3'))
    def find(word):
        hit = [f for f in files if re.search(word + r'\.mp3$', f, re.I)]
        return hit[0] if hit else None
    gpath, dpath = find('guitar'), find('drums')
    band_paths = [f for f in files if f not in (gpath, dpath) and not re.search(r'(vocals|full.song)\.mp3$', f, re.I)]
    print('guitar:', os.path.basename(gpath))
    print('drums:', os.path.basename(dpath))
    print('band:', ', '.join(os.path.basename(f) for f in band_paths))
    guitar, drums = load(gpath), load(dpath)
    stems = [load(f) for f in band_paths]
    n = min([len(guitar), len(drums)] + [len(s) for s in stems])
    guitar, drums = guitar[:n], drums[:n]
    band = sum(s[:n] for s in stems)
    beats, downs, drum_hits = grid(drums)

    def snap(t):
        return float(downs[np.argmin(np.abs(downs - t))])

    def bar_after(t, k):  # the downbeat k bars after downbeat t
        i = int(np.argmin(np.abs(downs - t)))
        return float(downs[min(i + k, len(downs) - 1)])

    gmono = guitar.mean(1)
    low = band_db(gmono, 60, 500)
    midis, sal = lead_salience(gmono)
    song = {'name': args.name, 'vol': args.vol, 'parts': {'rhythm': [], 'solo': [], 'drums': []}}
    vs = snap(secs(args.vamp or args.rhythm[0]))
    ve = bar_after(vs, 2)
    clips = [(['vamp'], vs, vs - 0.1, ve + 0.25)]
    asked = [(p, t) for p in ('rhythm', 'solo') for t in getattr(args, p)] + [('drums', t) for t in (args.drums or [])]
    for p, t in asked:
        s = snap(secs(t))
        if (bar_after(s, args.bars) - s) < (ve - vs) * args.bars / 2 * 0.85:
            print(f'skipping {p} at {t}: the song ends before {args.bars} bars are up')
            continue
        clips.append(([p] if args.drums or p == 'drums' else [p, 'drums'], s, s - 0.1, bar_after(s, args.bars) + TAIL))
    hits = drum_hits[0]
    es = secs(args.end) if args.end else float(downs[-1])
    es = float(hits[np.argmin(np.abs(hits - es))]) if np.min(np.abs(hits - es)) < 0.5 else es
    clips.append((['end'], es, es - 0.1, n / SR))

    # Clips that overlap (a chug section running into a solo) share one stretch of the files.
    regions = [[clips[0][2], clips[0][3], True]]          # the vamp stands alone: its guitar is muted
    for c in sorted(clips[1:], key=lambda c: c[2]):
        if len(regions) > 1 and c[2] <= regions[-1][1] + 1.0:
            regions[-1][1] = max(regions[-1][1], c[3])
        else:
            regions.append([c[2], c[3], False])
    srcs = {'band': band, 'drums': drums, 'guitar': guitar}
    outs, at = {k: [np.zeros((int(0.3 * SR), 2))] for k in srcs}, 0.3
    starts = []
    for a, b, vamp in regions:
        ia, ib = int(a * SR), int(b * SR)
        segs = {k: x[ia:ib].copy() for k, x in srcs.items()}
        fade = int(0.01 * SR)
        for seg in segs.values():
            seg[:fade] *= np.linspace(0, 1, fade)[:, None]
            seg[-fade:] *= np.linspace(1, 0, fade)[:, None]
        if vamp:
            segs['guitar'][:] = 0  # the band waits for its guitarist
        starts.append((a, b, at, vamp))
        for k in srcs:
            outs[k].append(segs[k])
            outs[k].append(np.zeros((int(GAP * SR), 2)))
        at += (ib - ia) / SR + int(GAP * SR) / SR

    def file_time(s, vamp=False):  # where song time s sits in the files
        for a, b, t, v in starts:
            if v == vamp and a <= s <= b:
                return round(t + PAD + (s - a), 4)

    for parts, s, a, b in clips:
        if parts == ['vamp']:
            song['vamp'] = {'at': file_time(s, True), 'len': round(ve - vs, 4)}
        elif parts == ['end']:
            song['end'] = {'at': file_time(s), 'len': round(b - s, 4)}
        else:
            e = bar_after(s, args.bars)
            bar = (e - s) / args.bars
            local = [round(float(x) - s, 3) for x in beats if s - bar - 0.01 <= x <= e + 0.01]
            charts = {'drums': lambda: drum_notes(s, e, beats, drum_hits), 'rhythm': lambda: rhythm_notes(low, s, e),
                      'solo': lambda: solo_notes(midis, sal, s, e)}
            for p in parts:
                song['parts'][p].append({
                    'at': file_time(s),                      # file time of the section's first downbeat
                    'len': round(e - s, 4),                  # its bars
                    'beats': local,                          # from the bar before (the lead-in) to the end
                    'notes': charts[p](),
                    'src': round(s, 3)                       # where it is in the song
                })
    os.makedirs(os.path.join(args.root, 'audio', 'guitar'), exist_ok=True)
    for k in srcs:
        mp3(np.concatenate(outs[k]), os.path.join(args.root, 'audio', 'guitar', args.id + '-' + k + '.mp3'))
    for p, secs_ in song['parts'].items():
        for v in secs_:
            print(f"{p:6s} {v['src']:7.2f}s  {240 / v['len'] * args.bars:6.2f} BPM  {len(v['notes'])} notes")

    js = os.path.join(args.root, 'js', 'guitar-songs.js')
    songs = {}
    if os.path.exists(js):
        m = re.search(r'window\.POF_GUITAR_SONGS = (\{.*\});', open(js).read(), re.S)
        if m:
            songs = json.loads(m.group(1))
    songs[args.id] = song
    with open(js, 'w') as f:
        f.write('/* Guitar Battle songs (?guitar), written by tools/gtr_song.py from each song\'s Suno stems. Per song: the\n'
                '   band\'s 2-bar vamp, the ending, and per part its sections (file time of the first downbeat, length in\n'
                '   seconds, the beat grid and the notes: [seconds from the downbeat, how long it rings]). */\n')
        f.write('window.POF_GUITAR_SONGS = ' + json.dumps(songs, separators=(',', ':')) + ';\n')
    print('wrote', js)


if __name__ == '__main__':
    main()
