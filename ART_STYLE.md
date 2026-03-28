# Wizard Arena — Art Style Reference

> This document covers only the assets loaded in `client/game.js`.

---

## Overall Style

**Low-resolution pixel art** — all assets use a limited palette, hard edges, and no anti-aliasing. The aesthetic is classic SNES/GBA-era RPG: dark fantasy atmosphere, muted jewel tones, and high contrast silhouettes.

---

## Background — Parallax Mountain Pack (5 layers)

A dusk/twilight mountain scene rendered in **flat, layered pixel silhouettes**. Each layer is a separate PNG with transparency, composited via Phaser's depth system.

| Layer key | File | Description |
|-----------|------|-------------|
| `bg1` | `parallax-mountain-bg.png` | Sky gradient — deep mauve/purple with a large white pixel moon and soft dithered clouds |
| `bg2` | `parallax-mountain-montain-far.png` | Single distant mountain peak — dusky pink highlight on dark plum body |
| `bg3` | `parallax-mountain-mountains.png` | Mid mountain range — dark purple/indigo flat silhouette, no texture |
| `bg4` | `parallax-mountain-trees.png` | Mid-ground pine treeline — near-black solid silhouette |
| `bg5` | `parallax-mountain-foreground-trees.png` | Foreground pine trees — dark brown/black, slightly more detailed individual tree shapes |

**Palette**: dusty mauve (`#8a6070`), dark plum (`#3a2040`), near-black silhouettes, soft white moon.  
**Technique**: flat fills, hard pixel edges, dithered sky gradients, no outlines.

---

## Character — Rogue Spritesheet (`rogue spritesheet calciumtrice.png`)

A **32×32 px per frame** spritesheet by *calciumtrice*. The character is a cloaked rogue/wizard figure rendered in a slightly higher-fidelity pixel style with subtle shading.

**Animations used (by frame row):**

| Animation key | Frames | Description |
|---------------|--------|-------------|
| `rogue-idle` | 0–9 | Subtle breathing/idle loop, cape sways gently |
| `rogue-cast` | 10–19 | Casting gesture — plays once on fireball |
| `rogue-run` | 20–29 | Running cycle |

**Style details:**
- Dark charcoal/slate armour with a deep brown cape
- Small token accent: pale skin face, muted red detail on chest
- No outline — shading is achieved through dark colour stepping
- Rendered at 3.5× scale in-game (`setScale(3.5)`) — roughly 112×112 px on screen
- `pixelArt: true` in Phaser config ensures nearest-neighbour scaling (no blur)

---

## Platforms — Classical Ruin Tiles (`classical_ruin_tiles.png`)

A tileset in a **Mediterranean/Greek ruin** style. Warm sandy limestone tones with ivy/vine overgrowth.

**How it's used in code:**
- A sub-texture named `plat_stone` is extracted from the sheet at offset `(192, 208)`, size `64×32`
- Rendered as a **tileSprite** at 1.5× scale to form three floating platforms
- The used section shows **dark grey stone brickwork** — rougher texture than the sandy foreground tiles, suggesting worn interior stone

**Palette of used section**: dark slate grey (`#555060`), mid grey mortar lines, occasional warm ochre variation.

---

## Fireball (procedural)

Not a texture file — generated at runtime via Phaser Graphics:

```js
createCircleTexture(this, 'fireball_tex', 10, 0xff8800);
```

A **20×20 px orange circle** (`#ff8800`). Intentionally simple; acts as a bright accent against the dark palette.

---

## Design Cohesion Notes

- **Mood**: dark fantasy dusk — the entire palette trends cool-purple in the bg, warming to amber only with fireballs
- **Resolution contract**: everything is low-res pixel art; `pixelArt: true` must stay on or sprites will look blurry at scale
- **Scale**: character sprites are 32 px native → all new character art should target **32×32 px frames**
- **New tiles**: should match the ruin tileset's dark grey stonework colour family to sit naturally on platforms
