# Fighter art

Each fighter gets two images, made in Grok Imagine. The first seven got theirs Oct 3, 2026, Sergey Oct 4, CZ and Adeniyi Oct 7. A new fighter without art falls back to their emoji head and block body until theirs is made.

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

### Mert

Black tee, khakis and the left-arm tattoo sleeve come from the user's reference photos (described in words, not attached to Grok). No prop: the shades hooked on his collar are his real look and a nod to his 🕶️ Zolana button. Grok put the tattoos on his right arm; nobody minds, and when he's the CPU the mirrored sprite shows them on the left.

```
Late-1990s arcade fighting game character select portrait of Mert Mumtaz, head and shoulders, centered with empty space around the head. Drawn dead serious like a hardened martial arts hero: intense determined glare, jaw set, dramatic lighting with hard-edged shadows. Shaved bald head with a bright shine on top, full thick black beard, thick dark eyebrows. Plain black t-shirt with sunglasses hooked on the collar. Three-quarter view, facing right. Bold black ink lines, hard cel shading with two or three tones, rich saturated colors, anime-influenced hand-drawn 2D arcade art. Plain flat white background. No text, no logos or symbols on clothing, not photorealistic, not cute.
```

```
16-bit pixel art fighting game sprite of Mert Mumtaz, same character as the attached image, Sega Genesis era, full body. Shaved bald head with a bright shine on top, full thick black beard, serious determined face. Plain black t-shirt with sunglasses hooked on the collar, a full sleeve of tattoos on his left arm, khaki pants, white sneakers with red laces. Fighting stance facing right, both fists raised, his tattooed left arm toward the viewer. Whole body in frame with a little space around it, feet near the bottom edge. Chunky visible pixels, limited color palette, dark pixel outlines, no anti-aliasing, no blur. Plain flat white background, no floor, no shadow. No text, no logos or symbols on clothing.
```

### Garlinghouse

```
Late-1990s arcade fighting game character select portrait of Brad Garlinghouse, head and shoulders, centered with empty space around the head. Drawn dead serious like a hardened martial arts hero: intense determined glare, jaw set, dramatic lighting with hard-edged shadows. Navy blue suit jacket over an open-collar white shirt, no tie. Three-quarter view, facing right. Bold black ink lines, hard cel shading with two or three tones, rich saturated colors, anime-influenced hand-drawn 2D arcade art. Plain flat white background. No text, no logos or symbols on clothing, not photorealistic, not cute.
```

```
16-bit pixel art fighting game sprite of Brad Garlinghouse, same character as the attached image, Sega Genesis era, full body. Serious determined face. Navy blue suit jacket over an open-collar white shirt, no tie, matching suit pants, dress shoes. Fighting stance facing right, one fist raised, a beat-up leather briefcase in the other hand. Whole body in frame with a little space around it, feet near the bottom edge. Chunky visible pixels, limited color palette, dark pixel outlines, no anti-aliasing, no blur. Plain flat white background, no floor, no shadow. No text, no logos or symbols on clothing.
```

### Adam Back

The orange cap (worn backwards, the "now it's on" move), wire glasses and the striped shirt over a blue tee come from the user's reference photos, described in words. The pickaxe is proof of work and his ⛏️ Hashcash button.

```
Late-1990s arcade fighting game character select portrait of Adam Back, head and shoulders, centered with empty space around the head. Drawn dead serious like a hardened martial arts hero: intense determined glare, jaw set, dramatic lighting with hard-edged shadows. Plain orange baseball cap worn backwards, thin wire-rim rectangular glasses, short gray hair, short gray-white beard. Blue t-shirt under an open light blue striped button-up shirt. Three-quarter view, facing right. Bold black ink lines, hard cel shading with two or three tones, rich saturated colors, anime-influenced hand-drawn 2D arcade art. Plain flat white background. No text, no logos or symbols on clothing or the cap, no Bitcoin symbol, not photorealistic, not cute.
```

```
16-bit pixel art fighting game sprite of Adam Back, same character as the attached image, Sega Genesis era, full body. Plain orange baseball cap worn backwards, thin wire-rim glasses, short gray-white beard, serious determined face. Blue t-shirt under an open light blue striped button-up shirt, dark jeans, sneakers. Fighting stance facing right, one fist raised, a miner's pickaxe held in the other hand. Whole body in frame with a little space around it, feet near the bottom edge. Chunky visible pixels, limited color palette, dark pixel outlines, no anti-aliasing, no blur. Plain flat white background, no floor, no shadow. No text, no logos or symbols on clothing or the cap, no Bitcoin symbol.
```

### Charles

He smiles in every photo, so he's the one fighter drawn grinning: the guy who already knows he's won. The user switched his shirt to blue plaid, which he's often photographed in. The papers are Peer Review, his pink button.

```
Late-1990s arcade fighting game character select portrait of Charles Hoskinson, head and shoulders, centered with empty space around the head. Drawn like a confident martial arts hero who already knows he's won: a big relaxed grin, calm eyes, dramatic lighting with hard-edged shadows. Brown cowboy hat, full beard. Blue plaid button-up shirt. Three-quarter view, facing right. Bold black ink lines, hard cel shading with two or three tones, rich saturated colors, anime-influenced hand-drawn 2D arcade art. Plain flat white background. No text, no logos or symbols on clothing or the hat, not photorealistic, not cute, not goofy.
```

```
16-bit pixel art fighting game sprite of Charles Hoskinson, same character as the attached image, Sega Genesis era, full body. Brown cowboy hat, full beard, a big confident grin. Blue plaid button-up shirt, jeans, cowboy boots. Fighting stance facing right, one fist raised, a thick stack of blank research papers tucked under the other arm. Whole body in frame with a little space around it, feet near the bottom edge. Chunky visible pixels, limited color palette, dark pixel outlines, no anti-aliasing, no blur. Plain flat white background, no floor, no shadow. No text, no logos or symbols on clothing or the hat.
```

### Saylor

The tank of the roster, so his prop is a shield: a plain orange one, for his 🛡️ STRF brace and a nod to Bitcoin orange without the logo. Charcoal suit and orange tie keep him apart from Garlinghouse's navy.

```
Late-1990s arcade fighting game character select portrait of Michael Saylor, head and shoulders, centered with empty space around the head. Drawn dead serious like a hardened martial arts hero: intense determined glare, jaw set, dramatic lighting with hard-edged shadows. Charcoal suit, white shirt, orange tie. Three-quarter view, facing right. Bold black ink lines, hard cel shading with two or three tones, rich saturated colors, anime-influenced hand-drawn 2D arcade art. Plain flat white background. No text, no logos or symbols on clothing, no Bitcoin symbol, not photorealistic, not cute.
```

```
16-bit pixel art fighting game sprite of Michael Saylor, same character as the attached image, Sega Genesis era, full body. Serious determined face. Charcoal suit, white shirt, orange tie, polished dress shoes. Braced fighting stance facing right, one fist raised, a plain round orange shield held up in the other hand. Whole body in frame with a little space around it, feet near the bottom edge. Chunky visible pixels, limited color palette, dark pixel outlines, no anti-aliasing, no blur. Plain flat white background, no floor, no shadow. No text, no logos or symbols on clothing or the shield, no Bitcoin symbol.
```

### Sergey

The flannel is his running joke, so it's the costume. The prompts asked for dark navy-and-black plaid to keep him apart from Charles; Grok came back with light blue-and-white plaid on the portrait (still easy to tell apart: Charles has the hat and a darker plaid) and gray plaid on the sprite, so the sprite's shirt gets tinted to match (below).

```
Late-1990s arcade fighting game character select portrait of Sergey Nazarov, co-founder of Chainlink, head and shoulders, centered with empty space around the head. Drawn dead serious and deadpan, completely calm, dramatic lighting with hard-edged shadows. Dark navy-and-black plaid flannel shirt, a conference lanyard with a blank badge. Three-quarter view, facing right. Bold black ink lines, hard cel shading with two or three tones, rich saturated colors, anime-influenced hand-drawn 2D arcade art. Plain flat white background. No text, no logos or symbols on clothing or the badge, not photorealistic, not cute.
```

```
16-bit pixel art fighting game sprite of Sergey Nazarov, same character as the attached image, Sega Genesis era, full body. Calm deadpan face. Dark navy-and-black plaid flannel shirt, conference lanyard with a blank badge, dark jeans, dress shoes. Fighting stance facing right, both fists raised. Whole body in frame with a little space around it, feet near the bottom edge. Chunky visible pixels, limited color palette, dark pixel outlines, no anti-aliasing, no blur. Plain flat white background, no floor, no shadow. No text, no logos or symbols on clothing or the badge.
```

### CZ

The four fingers are the whole bit (his "4" means ignore FUD), so they're in both images. Plain black hoodie, rimless glasses.

```
Late-1990s arcade fighting game character select portrait of Changpeng Zhao (CZ), head and shoulders, centered with empty space around the head. Drawn dead serious like a hardened martial arts hero: calm unbothered stare, dramatic lighting with hard-edged shadows. Plain black hoodie. One hand raised beside his face holding up four fingers, thumb folded. Three-quarter view, facing right. Bold black ink lines, hard cel shading with two or three tones, rich saturated colors, anime-influenced hand-drawn 2D arcade art. Plain flat white background. No text, no logos or symbols on clothing, not photorealistic, not cute.
```

```
16-bit pixel art fighting game sprite of Changpeng Zhao (CZ), same character as the attached image, Sega Genesis era, full body. Calm unbothered face. Plain black hoodie, dark pants, sneakers. Fighting stance facing right, one fist raised, the other hand held up showing four fingers with the thumb folded. Whole body in frame with a little space around it, feet near the bottom edge. Chunky visible pixels, limited color palette, dark pixel outlines, no anti-aliasing, no blur. Plain flat white background, no floor, no shadow. No text, no logos or symbols on clothing.
```

### Adeniyi

The first draft had a megaphone and a shouting face; it read as an announcer, not him. The hype is in the attitude instead: a knowing half-grin, pointing at you. The ball of water is Sui (water) without the droplet logo. The shirt is black, not white, so the background cut can't eat it, and the track jacket has no stripes so it doesn't read as a brand.

```
Late-1990s arcade fighting game character select portrait of Adeniyi Abiodun, co-founder of Sui, head and shoulders, centered with empty space around the head. Drawn cool and supremely confident: a knowing half-grin, one eyebrow raised, like he knows something you don't. One hand raised beside his face, pointing straight at the viewer. Dramatic lighting with hard-edged shadows. Plain sky-blue track jacket zipped halfway over a plain black t-shirt. Three-quarter view, facing right. Bold black ink lines, hard cel shading with two or three tones, rich saturated colors, anime-influenced hand-drawn 2D arcade art. Plain flat white background. No text, no logos, stripes or symbols on clothing, not photorealistic, not cute.
```

```
16-bit pixel art fighting game sprite of Adeniyi Abiodun, same character as the attached image, Sega Genesis era, full body. Confident half-grin. Plain sky-blue track jacket over a plain black t-shirt, dark gray joggers, white sneakers. Light, bouncy fighting stance facing right, weight on the back foot like he's about to dash forward, one fist raised, the other hand held open at his side with a small swirling ball of water hovering just above the palm. Whole body in frame with a little space around it, feet near the bottom edge. Chunky visible pixels, limited color palette, dark pixel outlines, no anti-aliasing, no blur. Plain flat white background, no floor, no shadow. No text, no logos, stripes or symbols on clothing.
```

## What happens to the images

`tools/art.py` (needs Pillow) cuts out the white background and sizes them:

```
python3 tools/art.py head <portrait> art/<id>-head.webp     # 600×600, framed for round crops
python3 tools/art.py body <sprite> art/<id>-body.webp       # trimmed, 960 tall
```

It lists any white pockets the background cut can't reach (like the gap between an arm and the body); clear those with `--gap x,y`. Pockets that are part of the art (sneakers, a mug) stay. A colored logo gets painted out with `--delogo x0,y0,x1,y1` (a box around it, in source pixels); it's filled with the color around it. When the two images disagree on a color, `--tint x0,y0,x1,y1,RRGGBB` turns the grays in a box into shades of that color (whites stay white, outlines stay dark).

The exact commands used so far:

```
python3 tools/art.py head vitalik-portrait.webp art/vitalik-head.webp
python3 tools/art.py body vitalik-sprite.jpg art/vitalik-body.webp --gap 416,548
python3 tools/art.py head toly-portrait.jpg art/toly-head.webp --delogo 680,90,850,225
python3 tools/art.py body toly-sprite.jpg art/toly-body.webp --delogo 560,80,670,165
python3 tools/art.py head mert-portrait.jpg art/mert-head.webp --crop 0.0,-0.04,1.0,0.96
python3 tools/art.py body mert-sprite.jpg art/mert-body.webp
python3 tools/art.py head garlinghouse-portrait.jpg art/garlinghouse-head.webp
python3 tools/art.py body garlinghouse-sprite.jpg art/garlinghouse-body.webp --gap 408,612
python3 tools/art.py head adam-portrait.jpg art/adam-head.webp --gap 1044,504 --crop 0.0,-0.04,1.0,0.96
python3 tools/art.py body adam-sprite.jpg art/adam-body.webp --gap 376,608
python3 tools/art.py head charles-portrait.jpg art/charles-head.webp --crop=0,0,1,1
python3 tools/art.py body charles-sprite.jpg art/charles-body.webp
python3 tools/art.py head saylor-portrait.jpg art/saylor-head.webp --crop=0.0,-0.04,1.0,0.96
python3 tools/art.py body saylor-sprite.jpg art/saylor-body.webp
python3 tools/art.py head sergey-portrait.jpg art/sergey-head.webp --crop=0.11,0,0.93,0.661
python3 tools/art.py body sergey-sprite.jpg art/sergey-body.webp --tint 280,260,970,915,486aaf
python3 tools/art.py head cz-portrait.jpg art/cz-head.webp --crop=0.0,-0.04,1.0,0.96
python3 tools/art.py body cz-sprite.jpg art/cz-body.webp
python3 tools/art.py head adeniyi-portrait.jpg art/adeniyi-head.webp --gap 960,372 --crop=0.0,-0.04,1.0,0.96
python3 tools/art.py body adeniyi-sprite.jpg art/adeniyi-body.webp
```

Mert's head filled the top of the frame, so his crop starts above the image (the extra space is transparent) to keep the round frames from clipping his dome. The two white pockets the tool listed on his sprite are his sneakers, so they stay. Garlinghouse's pocket was a thin sliver of background between his sleeve and his jacket, so it was cleared. Portraits never flood in from the bottom edge, since that's always clothing (his white shirt would have been erased). Adam's portrait pocket was background seen through his glasses past his cheek, and his cap touched the top of the image, so he got Mert's extra headroom too. Charles's hat brim ran wide, so his crop uses the whole image. Sergey's portrait came back taller than wide (1264×1568), so his crop picks a square: the full width minus a little, from the top down to his collar. The white pockets listed on him are the plaid's white squares and his badge, so they stay. CZ's and Adeniyi's heads touched the top of the frame, so they got Mert's headroom; Adeniyi's portrait pocket was background seen through his glasses past his cheek (cleared, like Adam's), and the pockets on his sprite are his white sneakers (kept). A crop can also reach past an edge to zoom out (write `--crop=` with an equals sign when a number starts with a minus), but only past edges the art doesn't touch: his first crop reached past the bottom and right, where his shirt runs off the image, and left a strip of his red showing under it. The tool now warns about that.

Then the fighter gets `art: { head: 'art/<id>-head.webp', body: 'art/<id>-body.webp' }` in `js/data.js`. On stage the sprite stands about 18% taller than the block body (a very wide pose shrinks to stay on screen); when KO'd it falls flat on its back at 70% size so it fits on a phone. A fighter with only a portrait shows it as the head on the block body.

## Status

| Fighter | Portrait | Body |
|---|---|---|
| Vitalik | ✅ purple unicorn tee | ✅ unicorn tee, green tea |
| Toly | ✅ black cap, blazer, headset mic (Solana logo painted off the cap) | ✅ blazer, holding a phone up to sell it |
| Mert | ✅ bald with the shine, full beard, black tee | ✅ black tee, khakis, tattoo sleeve, shades on the collar, white sneakers with red laces |
| Garlinghouse | ✅ gray hair, stubble, navy suit, open white collar | ✅ navy suit, beat-up leather briefcase |
| Adam Back | ✅ orange cap backwards, wire glasses, gray beard, striped shirt over a blue tee | ✅ same outfit, miner's pickaxe |
| Charles | ✅ cowboy hat, glasses, beard, blue plaid, the knowing grin | ✅ same outfit, cowboy boots, a stack of papers (Peer Review) |
| Saylor | ✅ gray hair, charcoal suit, orange tie | ✅ same suit, plain orange shield (STRF) |
| Sergey | ✅ beard, blue-and-white plaid, red lanyard, blank badge | ✅ same plaid (tinted from gray), blank badge, jeans |
| CZ | ✅ short black hair, rimless glasses, black hoodie, four fingers up | ✅ same hoodie, fist up, four fingers raised |
| Adeniyi | ✅ bald, beard, square black glasses, half-grin, pointing, sky-blue track jacket | ✅ same outfit, gray joggers, a swirling ball of water over his palm |
