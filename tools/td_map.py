#!/usr/bin/env python3
"""Fit a Grok map painting to a Tower Defense grid (art/td/<map>-map.webp). Needs Pillow and numpy.

  python3 tools/td_map.py hearing SOURCE art/td/hearing-map.webp

Grok never paints a perfect grid: the path's straight runs land a little off where the tiles are.
So the painting is stretched, a few percent here and there, until the middle of every straight run of
path sits on the middle of a row or column of tiles. Each axis is stretched on its own, between
knots: (a pixel in the painting, the tile line it belongs on). Path runs stay straight, nothing tilts.
Past the outer knots it keeps the painting's own scale (EDGE pixels per tile).

To fit a new painting: measure the middle of each straight run (the sand between its edging), list
them as knots, run this, and read off where the walls, trees and pool landed to fill in the map's
tiles and heights in js/td-core.js. The printed `art` line goes in the map's definition.
"""
import sys

import numpy as np
from PIL import Image

PX = 80   # pixels per tile in the saved map (a phone draws a tile at about 60 px)

MAPS = {
    # The Hearing (Grok, 1008 x 1792). Columns from the six up-and-down runs, rows from the five
    # side-to-side runs. The path is the one in js/td-core.js: columns 6, 2, 9, 3, 8, 4; rows 4, 7, 10, 13, 16.
    'hearing': {
        'x': [(237, 2.5), (322, 3.5), (393, 4.5), (540, 6.5), (708, 8.5), (781, 9.5)],
        'y': [(504, 4.5), (768, 7.5), (1024, 10.5), (1264, 13.5), (1498, 16.5)],
        'edge_x': 78, 'edge_y': 82.8,
    },
}


def knots(pairs, edge, size):
    """The knots plus the painting's two edges, as (source px, tile) arrays."""
    src = [p for p, _ in pairs]
    dst = [t for _, t in pairs]
    src = [0] + src + [size]
    dst = [dst[0] - pairs[0][0] / edge] + dst + [dst[-1] + (size - pairs[-1][0]) / edge]
    return np.array(src, float), np.array(dst, float)


def main():
    if len(sys.argv) != 4 or sys.argv[1] not in MAPS:
        sys.exit(__doc__)
    m = MAPS[sys.argv[1]]
    im = np.asarray(Image.open(sys.argv[2]).convert('RGB'), dtype=np.float32)
    h, w = im.shape[:2]
    sx, tx = knots(m['x'], m['edge_x'], w)
    sy, ty = knots(m['y'], m['edge_y'], h)
    # every output pixel's tile position, then back to a painting pixel (the stretch is monotone,
    # so swapping the arrays inverts it)
    ow, oh = round((tx[-1] - tx[0]) * PX), round((ty[-1] - ty[0]) * PX)
    gx = tx[0] + (np.arange(ow) + 0.5) / PX
    gy = ty[0] + (np.arange(oh) + 0.5) / PX
    px = np.clip(np.interp(gx, tx, sx) - 0.5, 0, w - 1)
    py = np.clip(np.interp(gy, ty, sy) - 0.5, 0, h - 1)
    # bilinear sample
    x0 = np.floor(px).astype(int); x1 = np.minimum(x0 + 1, w - 1); fx = (px - x0)[None, :, None]
    y0 = np.floor(py).astype(int); y1 = np.minimum(y0 + 1, h - 1); fy = (py - y0)[:, None, None]
    top = im[y0][:, x0] * (1 - fx) + im[y0][:, x1] * fx
    bot = im[y1][:, x0] * (1 - fx) + im[y1][:, x1] * fx
    out = (top * (1 - fy) + bot * fy).round().clip(0, 255).astype(np.uint8)
    Image.fromarray(out).save(sys.argv[3], 'WEBP', quality=88, method=6)
    for name, s, t in (('x', sx, tx), ('y', sy, ty)):
        k = np.diff(s) / np.diff(t)
        print('%s: %s px per tile between knots' % (name, ', '.join('%.0f' % v for v in k)))
    print('%s: %dx%d' % (sys.argv[3], ow, oh))
    print("art: { src: '%s', x: %.3f, y: %.3f, w: %.3f, h: %.3f }" % (
        sys.argv[3], tx[0], ty[0], tx[-1] - tx[0], ty[-1] - ty[0]))


if __name__ == '__main__':
    main()
