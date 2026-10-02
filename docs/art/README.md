# Fighter art

Each fighter gets two images, made in Grok Imagine. Until a fighter has art, they keep their emoji head and block body, so art rolls out one fighter at a time.

## The look (locked Oct 2, 2026)

| Image | Style | Grok setting | Where it shows |
|---|---|---|---|
| **Portrait** | Late-1990s arcade character-select art: bold ink lines, hard shadows, dead-serious glare | **1:1 Square** | Title screen, fighter picker, Super cut-in, result card (round frames) |
| **Body** | 16-bit pixel-art fighting sprite | **2:3 Poster** | The stage |

The pairing is how that era did it: a detailed hand-drawn portrait on the select screen, a pixel sprite in the fight. The joke is drawing crypto founders like hardened martial-arts heroes; the outfit carries the comedy (Vitalik's unicorn tee and green tea).

## How to make one

1. Make the **portrait** first (1:1, ×4), pick the best.
2. Make the **body** (2:3, ×4) with the chosen portrait **attached**, so the face matches.
3. Paste both into the chat. Pasted images arrive full size; no upload needed.

Rules: caricature, never photo-realistic; no real photos; no official logos (no chain logos on shirts); plain white background; facing right (the game mirrors the CPU side); whole body in frame.

## Prompt templates

Swap the bracketed parts. Keep everything else word for word so the roster matches.

**Portrait (1:1 Square)**
```
Late-1990s arcade fighting game character select portrait of [NAME], head and shoulders, centered with empty space around the head. Drawn dead serious like a hardened martial arts hero: intense determined glare, jaw set, dramatic lighting with hard-edged shadows. [FACE AND HAIR]. [SHIRT IN HIS COLOR, WITH ONE JOKE DETAIL]. Three-quarter view, facing right. Bold black ink lines, hard cel shading with two or three tones, rich saturated colors, anime-influenced hand-drawn 2D arcade art. Plain flat white background. No text, no logos, not photorealistic, not cute.
```

**Body (2:3 Poster)**
```
16-bit pixel art fighting game sprite of [NAME], same character as the attached image, Sega Genesis era, full body. [BUILD, FACE AND HAIR], serious determined face. [OUTFIT]. Fighting stance facing right, [WHAT HIS HANDS DO / HIS PROP]. Whole body in frame with a little space around it, feet near the bottom edge. Chunky visible pixels, limited color palette, dark pixel outlines, no anti-aliasing, no blur. Plain flat white background, no floor, no shadow. No text, no logos.
```

### Example: Vitalik (the prompts that made his art)

```
Late-1990s arcade fighting game character select portrait of Vitalik Buterin, head and shoulders, centered with empty space around the head. Drawn dead serious like a hardened martial arts hero: intense determined glare, jaw set, dramatic lighting with hard-edged shadows. Long neck, short spiky dark hair, big forehead, big ears, wide-set eyes. Purple t-shirt with a cartoon unicorn on it. Three-quarter view, facing right. Bold black ink lines, hard cel shading with two or three tones, rich saturated colors, anime-influenced hand-drawn 2D arcade art. Plain flat white background. No text, no logos, not photorealistic, not cute.
```

```
16-bit pixel art fighting game sprite of Vitalik Buterin, same character as the attached image, Sega Genesis era, full body. Very tall and lanky with long thin arms and legs, long neck, short spiky dark hair, big ears, serious determined face. Purple t-shirt with a small white unicorn on it, loose pants, sneakers. Fighting stance facing right, one fist raised, a small cup of green tea in the other hand. Whole body in frame with a little space around it, feet near the bottom edge. Chunky visible pixels, limited color palette, dark pixel outlines, no anti-aliasing, no blur. Plain flat white background, no floor, no shadow. No text, no logos.
```

## What happens to the images

`tools/art.py` (needs Pillow) cuts out the white background and sizes them:

```
python3 tools/art.py head <portrait> art/<id>-head.webp     # 600×600, framed for round crops
python3 tools/art.py body <sprite> art/<id>-body.webp       # trimmed, 960 tall
```

It lists any white pockets the background cut can't reach (like the gap between an arm and the body); clear those with `--gap x,y`. Pockets that are part of the art (sneakers, a mug) stay.

Then the fighter gets `art: { head: 'art/<id>-head.webp', body: 'art/<id>-body.webp' }` in `js/data.js`. On stage the sprite stands about 18% taller than the block body; when KO'd it falls flat on its back at 70% size so it fits on a phone. A fighter with only a portrait shows it as the head on the block body.

## Status

| Fighter | Portrait | Body |
|---|---|---|
| Vitalik | ✅ purple unicorn tee | ✅ unicorn tee, green tea |
| Toly | | |
| Mert | | |
| Garlinghouse | | |
| Adam Back | | |
| Charles | | |
| Saylor | | |
