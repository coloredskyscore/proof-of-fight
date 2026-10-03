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

Rules: caricature, never photo-realistic; no real photos; no official logos (no chain logos on shirts or caps); plain white background; facing right (the game mirrors the CPU side); whole body in frame.

Grok sometimes adds a logo anyway (Toly's cap came back with the Solana mark in both images). Those get painted out with `--delogo` (below) rather than regenerated.

## Prompt templates

Swap the bracketed parts. Keep everything else word for word so the roster matches.

**Portrait (1:1 Square)**
```
Late-1990s arcade fighting game character select portrait of [NAME], head and shoulders, centered with empty space around the head. Drawn dead serious like a hardened martial arts hero: intense determined glare, jaw set, dramatic lighting with hard-edged shadows. [FACE AND HAIR]. [SHIRT IN HIS COLOR, WITH ONE JOKE DETAIL]. Three-quarter view, facing right. Bold black ink lines, hard cel shading with two or three tones, rich saturated colors, anime-influenced hand-drawn 2D arcade art. Plain flat white background. No text, no logos or symbols on clothing, not photorealistic, not cute.
```

**Body (2:3 Poster)**
```
16-bit pixel art fighting game sprite of [NAME], same character as the attached image, Sega Genesis era, full body. [BUILD, FACE AND HAIR], serious determined face. [OUTFIT]. Fighting stance facing right, [WHAT HIS HANDS DO / HIS PROP]. Whole body in frame with a little space around it, feet near the bottom edge. Chunky visible pixels, limited color palette, dark pixel outlines, no anti-aliasing, no blur. Plain flat white background, no floor, no shadow. No text, no logos or symbols on clothing.
```

### Example: Vitalik (the prompts that made his art)

```
Late-1990s arcade fighting game character select portrait of Vitalik Buterin, head and shoulders, centered with empty space around the head. Drawn dead serious like a hardened martial arts hero: intense determined glare, jaw set, dramatic lighting with hard-edged shadows. Long neck, short spiky dark hair, big forehead, big ears, wide-set eyes. Purple t-shirt with a cartoon unicorn on it. Three-quarter view, facing right. Bold black ink lines, hard cel shading with two or three tones, rich saturated colors, anime-influenced hand-drawn 2D arcade art. Plain flat white background. No text, no logos, not photorealistic, not cute.
```

```
16-bit pixel art fighting game sprite of Vitalik Buterin, same character as the attached image, Sega Genesis era, full body. Very tall and lanky with long thin arms and legs, long neck, short spiky dark hair, big ears, serious determined face. Purple t-shirt with a small white unicorn on it, loose pants, sneakers. Fighting stance facing right, one fist raised, a small cup of green tea in the other hand. Whole body in frame with a little space around it, feet near the bottom edge. Chunky visible pixels, limited color palette, dark pixel outlines, no anti-aliasing, no blur. Plain flat white background, no floor, no shadow. No text, no logos.
```

### Toly

```
Late-1990s arcade fighting game character select portrait of Anatoly Yakovenko, head and shoulders, centered with empty space around the head. Drawn dead serious like a hardened martial arts hero: intense determined glare, jaw set, dramatic lighting with hard-edged shadows. Teal t-shirt under an ill-fitting salesman blazer. Three-quarter view, facing right. Bold black ink lines, hard cel shading with two or three tones, rich saturated colors, anime-influenced hand-drawn 2D arcade art. Plain flat white background. No text, no logos, not photorealistic, not cute.
```

```
16-bit pixel art fighting game sprite of Anatoly Yakovenko, same character as the attached image, Sega Genesis era, full body. Serious determined face. Teal t-shirt under an ill-fitting salesman blazer, jeans, sneakers. Fighting stance facing right, one fist raised, the other hand holding up a chunky smartphone with a huge camera bump like he's selling it to you. Whole body in frame with a little space around it, feet near the bottom edge. Chunky visible pixels, limited color palette, dark pixel outlines, no anti-aliasing, no blur. Plain flat white background, no floor, no shadow. No text, no logos.
```

Grok added the cap and headset mic on its own; both stay.

## What happens to the images

`tools/art.py` (needs Pillow) cuts out the white background and sizes them:

```
python3 tools/art.py head <portrait> art/<id>-head.webp     # 600×600, framed for round crops
python3 tools/art.py body <sprite> art/<id>-body.webp       # trimmed, 960 tall
```

It lists any white pockets the background cut can't reach (like the gap between an arm and the body); clear those with `--gap x,y`. Pockets that are part of the art (sneakers, a mug) stay. A colored logo gets painted out with `--delogo x0,y0,x1,y1` (a box around it, in source pixels); it's filled with the color around it.

The exact commands used so far:

```
python3 tools/art.py head vitalik-portrait.webp art/vitalik-head.webp
python3 tools/art.py body vitalik-sprite.jpg art/vitalik-body.webp --gap 416,548
python3 tools/art.py head toly-portrait.jpg art/toly-head.webp --delogo 680,90,850,225
python3 tools/art.py body toly-sprite.jpg art/toly-body.webp --delogo 560,80,670,165
```

Then the fighter gets `art: { head: 'art/<id>-head.webp', body: 'art/<id>-body.webp' }` in `js/data.js`. On stage the sprite stands about 18% taller than the block body (a very wide pose shrinks to stay on screen); when KO'd it falls flat on its back at 70% size so it fits on a phone. A fighter with only a portrait shows it as the head on the block body.

## Status

| Fighter | Portrait | Body |
|---|---|---|
| Vitalik | ✅ purple unicorn tee | ✅ unicorn tee, green tea |
| Toly | ✅ black cap, blazer, headset mic (Solana logo painted off the cap) | ✅ blazer, holding a phone up to sell it |
| Mert | | |
| Garlinghouse | | |
| Adam Back | | |
| Charles | | |
| Saylor | | |
