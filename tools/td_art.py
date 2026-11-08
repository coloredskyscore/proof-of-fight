#!/usr/bin/env python3
"""Cut Grok sheets into Tower Defense sprites (art/td/). Needs Pillow: pip install pillow

A sheet is one Grok image with several things standing in a row on white (four towers, four
people). The white is flooded out from the edges, the row is split at the empty columns between
the things, and each one is trimmed and saved at OUT_PPT pixels per map tile, so the game knows
its size in tiles from its size in pixels.

  python3 tools/td_art.py sheet SOURCE art/td --names strike,privacy,mint,rug --ppt 400
  python3 tools/td_art.py sheet SOURCE art/td --names enemy-armored,-,enemy-boss:330 --ppt 560

--names: one name per thing, left to right; '-' skips one. name:N gives that one its own --ppt.
--ppt: how many source pixels make one map tile (bigger number, smaller sprite).
--gap x,y: a white pocket inside the art to clear (the space inside a frame), as in tools/art.py.

A single picture (Toly's node) is the same with 'one'. --lights also saves the glowing teal
pixels as their own layer (<name>-lights.webp), so the game can blink them, or turn them red.

  python3 tools/td_art.py one SOURCE art/td --names node-toly --ppt 560 --lights
"""
import argparse
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from art import cut_background, pockets  # noqa: E402

OUT_PPT = 160       # pixels per tile in the saved sprite (a phone draws a tile at about 30 to 70 px)
MIN_WIDTH = 24      # a run of columns narrower than this is JPEG noise, not a thing


def segments(im):
    """Runs of columns that hold some art, left to right."""
    a = im.getchannel('A').point(lambda v: 255 if v > 40 else 0)
    w, h = im.size
    cols = [a.crop((x, 0, x + 1, h)).getbbox() is not None for x in range(w)]
    runs, start = [], None
    for x, on in enumerate(cols + [False]):
        if on and start is None:
            start = x
        elif not on and start is not None:
            if x - start >= MIN_WIDTH:
                runs.append((start, x))
            start = None
    return runs


def is_light(r, g, b):
    return g > 150 and b > 150 and r < 140 and g - r > 70


def save(im, out, ppt, lights):
    im = im.crop(im.getchannel('A').getbbox())
    k = OUT_PPT / ppt
    size = (max(1, round(im.size[0] * k)), max(1, round(im.size[1] * k)))
    small = im.resize(size, Image.LANCZOS)
    small.save(out + '.webp', 'WEBP', quality=90, method=6)
    print('%s.webp: %dx%d px, %.2f x %.2f tiles' % (out, size[0], size[1], size[0] / OUT_PPT, size[1] / OUT_PPT))
    if lights:
        src, lay = im.load(), Image.new('RGBA', im.size, (0, 0, 0, 0))
        dst = lay.load()
        for y in range(im.size[1]):
            for x in range(im.size[0]):
                r, g, b, a = src[x, y]
                if a and is_light(r, g, b):
                    dst[x, y] = (r, g, b, 255)
        lay.resize(size, Image.LANCZOS).save(out + '-lights.webp', 'WEBP', quality=90, method=6)
        print('%s-lights.webp' % out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('kind', choices=['sheet', 'one'])
    ap.add_argument('source')
    ap.add_argument('outdir')
    ap.add_argument('--names', required=True)
    ap.add_argument('--ppt', type=float, required=True)
    ap.add_argument('--gap', action='append', default=[])
    ap.add_argument('--lights', action='store_true')
    args = ap.parse_args()

    im = Image.open(args.source).convert('RGBA')
    gaps = [tuple(int(v) for v in g.split(',')) for g in args.gap]
    cut_background(im, gaps)
    for area, seed, box in pockets(im, min_area=im.size[0] * im.size[1] // 4000):
        print('white pocket: %6d px at --gap %d,%d  (box %s)' % (area, seed[0], seed[1], box))

    names = args.names.split(',')
    runs = segments(im) if args.kind == 'sheet' else [(0, im.size[0])]
    print('found %d: %s' % (len(runs), ', '.join('%d-%d' % r for r in runs)))
    if len(runs) != len(names):
        sys.exit('%d names for %d things' % (len(names), len(runs)))
    os.makedirs(args.outdir, exist_ok=True)
    for (x0, x1), name in zip(runs, names):
        if name == '-':
            continue
        ppt = args.ppt
        if ':' in name:
            name, ppt = name.split(':')[0], float(name.split(':')[1])
        save(im.crop((x0, 0, x1, im.size[1])), os.path.join(args.outdir, name), ppt, args.lights)


if __name__ == '__main__':
    main()
