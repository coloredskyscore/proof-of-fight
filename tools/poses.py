#!/usr/bin/env python3
"""Rap Battle poses: cut out a rapper's Grok poses and put them, with his stage sprite, on one canvas.
Needs Pillow: pip install pillow

  python3 tools/poses.py toly rap=toly-rap.jpg listen=toly-listen.jpg lose=toly-lose.jpg win=toly-win.jpg \\
      --shirt 005c74 --scale listen=1.1 --scale lose=1.07 --scale win=1.08 --flip win --gap lose=668,868

Writes art/<id>-<pose>.webp for each pose, plus art/<id>-stand.webp (his stage sprite, art/<id>-body.webp),
all the same size, so the rapper doesn't grow, shrink or slide when the pose changes:
- Each pose is cut like `art.py body` (background out, trimmed, 960 tall), then resized by its --scale.
  Grok fits every pose to the frame, so an upright pose comes back drawn smaller than a crouched one; the
  scale puts the person back at the stage sprite's size (compare heads, shoes and shirt with it).
- Feet sit on the bottom edge, and the shirt (--shirt, its main color) lines up across the poses.
- --flip mirrors a pose Grok drew facing left.
White pockets are listed per pose, as with art.py; clear one with --gap pose=x,y (source pixels).
"""
import argparse
import os
import sys
from PIL import Image

sys.dont_write_bytecode = True  # importing art.py shouldn't leave a cache in tools/
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import art  # noqa: E402


def shirt_x(im, color, tol=60):
    """The median x of the pixels close to the shirt color: the point the poses line up on."""
    px, (w, h) = im.load(), im.size
    xs = []
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b, a = px[x, y]
            if a > 200 and abs(r - color[0]) + abs(g - color[1]) + abs(b - color[2]) < tol:
                xs.append(x)
    if not xs:
        sys.exit('no pixels near the shirt color %s; pick it from the shirt' % (color,))
    xs.sort()
    return xs[len(xs) // 2]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('id')
    ap.add_argument('poses', nargs='+', help='pose=source image (rap, listen, lose, win)')
    ap.add_argument('--shirt', required=True, help='RRGGBB: the shirt color the poses line up on')
    ap.add_argument('--scale', action='append', default=[], help='pose=factor against the stage sprite')
    ap.add_argument('--flip', action='append', default=[], help='a pose to mirror')
    ap.add_argument('--gap', action='append', default=[], help='pose=x,y of a white pocket to clear')
    ap.add_argument('--out', default='art')
    args = ap.parse_args()

    color = tuple(int(args.shirt.lstrip('#')[i:i + 2], 16) for i in (0, 2, 4))
    scales = {k: float(v) for k, v in (s.split('=') for s in args.scale)}
    gaps = {}
    for g in args.gap:
        name, xy = g.split('=')
        gaps.setdefault(name, []).append(tuple(int(v) for v in xy.split(',')))

    figs = [('stand', Image.open(os.path.join(args.out, args.id + '-body.webp')).convert('RGBA'))]
    for spec in args.poses:
        name, src = spec.split('=', 1)
        im = art.cut_background(Image.open(src).convert('RGBA'), gaps.get(name, []))
        for area, seed, box in art.pockets(im, im.size[0] * im.size[1] // 2000):
            print('%s: white pocket %6d px at --gap %s=%d,%d  (box %s)' % (name, area, name, seed[0], seed[1], box))
        im = im.crop(im.getbbox())
        k = art.BODY_HEIGHT / im.size[1] * scales.get(name, 1)
        im = im.resize((round(im.size[0] * k), round(im.size[1] * k)), Image.LANCZOS)
        if name in args.flip:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        figs.append((name, im))

    xs = [shirt_x(im, color) for _, im in figs]
    left = max(xs)
    width = left + max(im.size[0] - x for (_, im), x in zip(figs, xs))
    height = max(im.size[1] for _, im in figs)
    for (name, im), x in zip(figs, xs):
        canvas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        canvas.alpha_composite(im, (left - x, height - im.size[1]))
        path = os.path.join(args.out, '%s-%s.webp' % (args.id, name))
        canvas.save(path, 'WEBP', quality=90, method=6)
        print('%s: %dx%d' % (path, width, height))


if __name__ == '__main__':
    main()
