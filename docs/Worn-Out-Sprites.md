# Worn Out — PixelLab Sprite Production Sheet (Top-Down Slice)

This file defines every sprite currently needed for the **top-down retro pixel-art slice**.

## Global style for all prompts

- Perspective: **top-down / slight 3-4 view**
- Style: **1990s gritty pixel art**, clean silhouettes, no anti-aliasing
- Palette anchors:
  - background/grime: `#1c1c14`, `#2b2b20`, `#3a3a2a`
  - danger: `#d23b2e`
  - warning: `#d9a441`
  - money: `#c9b458`
  - ui/light: `#e8e4d0`, `#9a9680`
- Export: transparent background for sprite assets (except full background image)
- Grid: 8px-friendly shapes inside 16/32/48 px canvases
- Tone: satirical, worn-down household machines with personality

---

## Required assets (current playable slice)

### 1) Room background

- **Path:** `public/assets/sprites/world/room_topdown_640x360.png`
- **Size:** `640x360`
- **Frames:** 1
- **Prompt:**
  > Top-down pixel art apartment interior, 640x360 canvas, retro gritty style, dirty green-brown kitchen/living space, worn floor tiles, grimy walls, fixed ambient props (old calendar stuck on 2019, pile of unpaid bills on table, toolbox on floor, one cockroach as tiny detail), empty floor space for gameplay in center, no characters, no machines, no text, no anti-aliasing, high readability, game-ready background.

### 2) Player character spritesheet

- **Path:** `public/assets/sprites/character/player_topdown_32x32_sheet.png`
- **Size:** `128x96` (4 columns x 3 rows of `32x32`)
- **Frames layout:**
  - Row 1: down facing `idle, walk1, idle, walk2`
  - Row 2: left facing `idle, walk1, idle, walk2`
  - Row 3: up facing `idle, walk1, idle, walk2`
  - Right facing will be mirrored in code from left row
- **Prompt:**
  > Pixel art top-down human character for gloomy apartment survival game, 32x32 per frame, spritesheet 128x96, 3 directional rows (down, left, up), each row with 4 frames idle/walk cycle, simple readable silhouette, worn clothes, slight satirical style, limited dirty palette, transparent background, no anti-aliasing.

### 3) Fridge states

- **Path:** `public/assets/sprites/appliances/fridge_states_32x48.png`
- **Size:** `96x48` (3 frames horizontally, each `32x48`)
- **Frames:** normal, damaged, dead
- **Prompt:**
  > Top-down 3-4 view pixel art old fridge, 32x48 per frame, 3-frame strip 96x48, frame1 normal but worn, frame2 damaged with cracks and tiny sparks, frame3 dead/off dark and lifeless, include personality sticker detail, transparent background, no anti-aliasing, same palette family as grimy apartment.

### 4) Water heater states

- **Path:** `public/assets/sprites/appliances/heater_states_32x48.png`
- **Size:** `96x48` (3 frames horizontally, each `32x48`)
- **Frames:** normal, damaged, dead
- **Prompt:**
  > Top-down 3-4 view pixel art old water heater boiler, 32x48 per frame, 3-frame strip 96x48, frame1 normal worn unit, frame2 damaged with leak/sparks, frame3 dead dark inactive unit, readable silhouette, transparent background, no anti-aliasing.

### 5) Apartment door states

- **Path:** `public/assets/sprites/world/door_states_32x48.png`
- **Size:** `64x48` (2 frames horizontally, each `32x48`)
- **Frames:** closed/inactive, active/vendor-arrived
- **Prompt:**
  > Pixel art apartment door in top-down 3-4 perspective, 32x48 per frame, two-frame strip 64x48, frame1 closed neutral door, frame2 highlighted active door with subtle warm light cue for vendor interaction, transparent background, no anti-aliasing.

### 6) Don Jose vendor

- **Path:** `public/assets/sprites/props/vendor_don_jose_32x48.png`
- **Size:** `32x48`
- **Frames:** 1
- **Prompt:**
  > Top-down 3-4 pixel art handyman vendor character, overalls, awkward friendly smile, slightly shady vibe, 32x48, transparent background, no anti-aliasing, readable silhouette.

### 7) Tool cart prop (optional but recommended)

- **Path:** `public/assets/sprites/props/vendor_cart_32x32.png`
- **Size:** `32x32`
- **Frames:** 1
- **Prompt:**
  > Pixel art small repair tool cart in top-down 3-4 perspective, old metal, cluttered tools, 32x32, transparent background, no anti-aliasing.

### 8) Coin pickup

- **Path:** `public/assets/sprites/props/coin_16x16_strip.png`
- **Size:** `32x16` (2 frames, each `16x16`)
- **Frames:** base, shine
- **Prompt:**
  > Pixel art coin pickup icon for grimy apartment game, 16x16 per frame, 2-frame strip 32x16 with subtle shine variation, dim yellow/gold palette, transparent background, no anti-aliasing.

### 9) UI icon sheet

- **Path:** `public/assets/sprites/ui/icons_16x16_sheet.png`
- **Size:** `128x16` (8 icons horizontally, each `16x16`)
- **Icons in order:**
  1. hunger
  2. hygiene
  3. money
  4. parts
  5. plug-on
  6. plug-off
  7. surge/lightning
  8. day/clock
- **Prompt:**
  > Pixel art UI icon strip, 8 icons horizontally, each 16x16, total 128x16, icons for hunger, hygiene, money, spare parts, plug on, plug off, lightning surge warning, and day/clock, high readability on dark background, limited gritty palette, transparent background, no anti-aliasing.

---

## Optional post-slice assets (later expansion)

### Stove states (post-slice)
- **Path:** `public/assets/sprites/appliances/stove_states_32x48.png`
- **Size:** `96x48`

### Washing machine states (post-slice)
- **Path:** `public/assets/sprites/appliances/washer_states_32x48.png`
- **Size:** `96x48`

### Mood icon (post-slice)
- **Path:** `public/assets/sprites/ui/icon_mood_16x16.png`
- **Size:** `16x16`

---

## Naming and export checklist

- Keep filenames exactly as listed so code wiring is plug-and-play.
- Keep exact dimensions; avoid auto-cropping.
- PNG only.
- Transparent background for all sprites except `room_topdown_640x360.png`.
- If PixelLab exports with padding, trim to exact target size before final drop.
