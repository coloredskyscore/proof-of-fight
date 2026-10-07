#!/usr/bin/env python3
"""Turn a Grok image (plain white background) into game art. Needs Pillow: pip install pillow

  python3 tools/art.py head SOURCE art/<id>-head.webp     # round portrait, 600x600
  python3 tools/art.py body SOURCE art/<id>-body.webp     # stage sprite, 960 tall, trimmed

The white background is removed by flooding in from the edges. White pockets the flood can't
reach (the gap between an arm and the body) are listed; clear them by passing their position:
  --gap 390,600 --gap 412,980
Pockets inside the art (sneakers, a mug, eye whites) are listed too: leave those alone.

Grok sometimes draws a logo anyway (Toly's cap came back with the Solana mark). Paint a colored logo
out by giving a box around it; it's filled with the color right around it:
  --delogo 560,80,670,165

Grok sometimes colors the same shirt differently in the two images (Sergey's portrait plaid is blue,
his sprite's came back gray). Recolor the gray pixels inside a box to shades of a color; whites stay
white and dark outlines stay dark:
  --tint 290,270,960,910,486aaf

A head crop can reach past the image to zoom out (a wide hat brim); write it with = so a leading
minus isn't read as an option:  --crop=-0.06,-0.08,1.06,1.04

A glowing figure (Satoshi's golden aura) keeps its glow: the whole picture is kept and the white is
taken out of the light around the figure, so the glow fades softly over a dark screen:
  python3 tools/art.py glow SOURCE art/satoshi.webp      # 720x720
"""
import argparse
from PIL import Image, ImageDraw, ImageFilter

WHITE = 215    # a pixel this bright (every channel) can start a background flood
THRESH = 60    # how far the flood may drift from the starting white (JPEG noise, soft edges)
HEAD_CROP = (0.076, 0.034, 0.924, 0.88)  # portrait framing (left, top, right, bottom) of the source
HEAD_SIZE = 600
BODY_HEIGHT = 960
GLOW_SIZE = 720


def clear(im, x, y):
    r, g, b, a = im.getpixel((x, y))
    if a and min(r, g, b) > WHITE:
        ImageDraw.floodfill(im, (x, y), (255, 255, 255, 0), thresh=THRESH)


def cut_background(im, gaps, bottom=True):
    # A portrait's bottom edge is always clothing (a white shirt would get eaten), so heads skip it.
    w, h = im.size
    for x in range(0, w, 8):
        clear(im, x, 0)
        if bottom:
            clear(im, x, h - 1)
    for y in range(0, h, 8):
        clear(im, 0, y)
        clear(im, w - 1, y)
    for x, y in gaps:
        clear(im, x, y)
    return im


def delogo(im, box):
    """Fill the colorful pixels inside box with the median color just around them."""
    x0, y0, x1, y1 = box
    src = im.load()
    mask = Image.new('L', im.size, 0)
    m = mask.load()
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b = src[x, y][:3]
            if max(r, g, b) - min(r, g, b) > 28 and max(r, g, b) > 55:
                m[x, y] = 255
    mask = mask.filter(ImageFilter.MaxFilter(7))   # take the logo's soft edges too
    ring = mask.filter(ImageFilter.MaxFilter(15))  # the surface it sits on
    m, rg = mask.load(), ring.load()
    around = sorted((src[x, y] for y in range(y0, y1) for x in range(x0, x1) if rg[x, y] and not m[x, y]),
                    key=lambda c: sum(c[:3]))
    if not around:
        return 0
    fill, n = around[len(around) // 2], 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            if m[x, y]:
                src[x, y] = fill
                n += 1
    return n


def tint(im, box, color):
    """Turn the gray pixels inside box into shades of color (light grays toward white)."""
    x0, y0, x1, y1 = box
    c = tuple(int(color[i:i + 2], 16) for i in (0, 2, 4))
    src, n = im.load(), 0
    for y in range(y0, y1):
        for x in range(x0, x1):
            r, g, b, a = src[x, y]
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            if not a or max(r, g, b) - min(r, g, b) > 40 or lum < 60 or lum >= 232:
                continue
            if lum <= 150:
                new = tuple(round(v * lum / 150) for v in c)
            else:
                t = min(1, (lum - 150) / 90)
                new = tuple(round(v + (255 - v) * t) for v in c)
            src[x, y] = new + (a,)
            n += 1
    return n


def unblend_glow(im):
    """Light pixels reachable from the edges (white, or a warm glow) become see-through: each keeps
    only what it adds over white, so a pale gold glow turns into transparent gold. The figure, and
    neutral highlights on it, stay solid."""
    w, h = im.size
    src = im.load()
    mask = Image.new('L', im.size, 0)
    m = mask.load()
    for y in range(h):
        for x in range(w):
            r, g, b, _ = src[x, y]
            if r >= 200 and (min(r, g, b) >= 230 or r - b >= 25):
                m[x, y] = 255
    for x in range(0, w, 4):
        for y in (0, h - 1):
            if m[x, y] == 255:
                ImageDraw.floodfill(mask, (x, y), 128)
    for y in range(0, h, 4):
        for x in (0, w - 1):
            if m[x, y] == 255:
                ImageDraw.floodfill(mask, (x, y), 128)
    for y in range(h):
        for x in range(w):
            if m[x, y] != 128:
                continue
            r, g, b, _ = src[x, y]
            a = 1 - min(r, g, b) / 255
            if a < 0.02:
                src[x, y] = (0, 0, 0, 0)
                continue
            un = [max(0, min(255, round((c - 255 * (1 - a)) / a))) for c in (r, g, b)]
            src[x, y] = (un[0], un[1], un[2], round(a * 255))
    return im


def pockets(im, min_area):
    """Opaque near-white areas left after the cut: candidate gaps, or white parts of the art."""
    w, h = im.size
    mask = Image.new('L', im.size, 0)
    src, m = im.load(), mask.load()
    for y in range(h):
        for x in range(w):
            r, g, b, a = src[x, y]
            if a and min(r, g, b) > 240:
                m[x, y] = 255
    found, k = [], 1
    for y in range(0, h, 4):
        for x in range(0, w, 4):
            if m[x, y] == 255 and k < 255:
                ImageDraw.floodfill(mask, (x, y), k)
                found.append((k, x, y))
                k += 1
    hist = mask.histogram()
    out = []
    for k, x, y in found:
        if hist[k] >= min_area:
            box = mask.point(lambda v, k=k: 255 if v == k else 0).getbbox()
            out.append((hist[k], (x, y), box))
    return sorted(out, reverse=True)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('kind', choices=['head', 'body', 'glow'])
    ap.add_argument('source')
    ap.add_argument('out')
    ap.add_argument('--gap', action='append', default=[], help='x,y of a white pocket to clear (source pixels)')
    ap.add_argument('--crop', help='head framing as left,top,right,bottom fractions of the source')
    ap.add_argument('--delogo', action='append', default=[], help='x0,y0,x1,y1 box around a logo to paint out')
    ap.add_argument('--tint', action='append', default=[], help='x0,y0,x1,y1,RRGGBB: recolor the grays in a box')
    args = ap.parse_args()

    im = Image.open(args.source).convert('RGBA')
    if args.kind == 'glow':
        im = unblend_glow(im).resize((GLOW_SIZE, GLOW_SIZE), Image.LANCZOS)
        im.save(args.out, 'WEBP', quality=90, method=6)
        print('%s: %dx%d' % (args.out, im.size[0], im.size[1]))
        return
    for d in args.delogo:
        print('logo painted out: %d px' % delogo(im, tuple(int(v) for v in d.split(','))))
    gaps = [tuple(int(v) for v in g.split(',')) for g in args.gap]
    cut_background(im, gaps, bottom=args.kind == 'body')
    for t in args.tint:
        *box, color = t.split(',')
        print('tinted: %d px' % tint(im, tuple(int(v) for v in box), color.lstrip('#')))

    left = pockets(im, min_area=im.size[0] * im.size[1] // 2000)
    for area, seed, box in left:
        print('white pocket: %6d px at --gap %d,%d  (box %s)' % (area, seed[0], seed[1], box))

    if args.kind == 'head':
        c = [float(v) for v in args.crop.split(',')] if args.crop else HEAD_CROP
        w, h = im.size
        # Reaching past an edge the art touches leaves an empty strip with a straight cut (Charles's
        # shirt once ended short of the frame, showing his red behind it).
        a = im.getchannel('A')
        edges = {'left': (c[0] < 0, [a.getpixel((0, y)) for y in range(h)]),
                 'top': (c[1] < 0, [a.getpixel((x, 0)) for x in range(w)]),
                 'right': (c[2] > 1, [a.getpixel((w - 1, y)) for y in range(h)]),
                 'bottom': (c[3] > 1, [a.getpixel((x, h - 1)) for x in range(w)])}
        for side, (past, line) in edges.items():
            if past and sum(1 for v in line if v) > len(line) // 100:
                print('WARNING: the crop reaches past the %s edge, where the art touches it; '
                      'that edge will show a straight cut in the round frames' % side)
        im = im.crop((round(c[0] * w), round(c[1] * h), round(c[2] * w), round(c[3] * h)))
        im = im.resize((HEAD_SIZE, HEAD_SIZE), Image.LANCZOS)
    else:
        im = im.crop(im.getbbox())
        im = im.resize((round(im.size[0] * BODY_HEIGHT / im.size[1]), BODY_HEIGHT), Image.LANCZOS)
    im.save(args.out, 'WEBP', quality=90, method=6)
    print('%s: %dx%d' % (args.out, im.size[0], im.size[1]))


if __name__ == '__main__':
    main()
