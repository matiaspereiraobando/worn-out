# Worn Out — PixelLab Sprite Production Sheet (Top-Down Slice)

This file defines every sprite currently needed for the **top-down retro pixel-art slice**.

> **Style source:** the palette anchors and tone below are derived from the
> Midjourney style/mood board in `docs/style/`:
> `worn-out_palette-01.png` (the 6-swatch color spine + weathered olive/rust
> machine texture), `worn-out_stye-ref-01.png` (grimy basement kitchen, warm
> lamp glow, red fridge, cash piling up), and `worn-out_stye-ref-02.png` (the
> closest pixel-art target: cold teal walls, cream fridge, white cylindrical
> wall boilers, red danger door, cool blue-green tile floor, scattered coins).
> Refs 01/02 are side-elevation rooms — borrow their **palette, mood, and object
> design**, but keep our **top-down 3-4 gameplay perspective**.

## Global style for all prompts

- Perspective: **top-down / slight 3-4 view**
- Style: **1990s gritty pixel art**, clean silhouettes, no anti-aliasing
- Palette anchors (locked to `worn-out_palette-01.png`):
  - slate blue-green (metal/trim): `#47534c`
  - bone / cream (appliances, UI text): `#e7e2cd`
  - muted olive green (healthy/ok): `#6e7b5a`
  - mustard / ochre gold (money, coins): `#c7a24a`
  - dark forest olive (grime, walls): `#505f3b`, `#3b4636`
  - rust / terracotta (weathering): `#ab4630`
  - shadow olive (bg): `#161a12`, `#1e2319`
  - danger red (accent, e.g. red door): `#bf4130`
  - warm lamp glow (lighting accent): `#f2c65a`
- Mood cues (from the board): cold olive/teal grimy walls; a single warm
  overhead lamp casting a yellow pool of light against cold surroundings; big
  appliances in **bone-cream** with rust streaks, fridge magnets and taped
  notes; exposed pipes and a wall AC unit; a stopped wall clock; peeling
  posters; a dead potted plant; scattered coins/bills and a small grime/blood
  stain for grit. Not clean or cute — lived-in, tired, faintly menacing.
- Export: transparent background for sprite assets (except full background image)
- PixelLab constraint: sprites must be **square** and at least `32x32`
- Grid: 8px-friendly shapes inside 32/48/64 px square canvases
- Tone: satirical, worn-down household machines with personality

---

## Required assets (current playable slice)

### 1) Room background

- **Path:** `public/assets/sprites/world/room_topdown_960x540.png`
- **Size:** `960x540`
- **Frames:** 1
- **Prompt:**
  > Top-down pixel art grimy apartment interior, 960x540 canvas, 1990s gritty style, cold olive/teal walls with peeling paint and water stains, cool blue-green tiled floor with cracks and a small dark grime stain, one warm overhead lamp casting a soft yellow pool of light in the center against the cold surroundings, fixed ambient props around the edges (exposed wall pipes, small wall AC unit, stopped wall clock stuck on an old time, calendar frozen on 2019, taped unpaid bills, toolbox, dead potted plant, peeling posters, a couple of scattered coins, one tiny cockroach), empty floor space for gameplay in the center, palette bone-cream + olive-green + rust-red + mustard, no characters, no machines, no text, no anti-aliasing, high readability, game-ready background.

### 1b) Walkable-area mask (paired with the room background)

- **Path:** `public/assets/sprites/world/walkmask_960x540.png`
- **Size:** `960x540` (same dimensions as the room background; smaller sizes work too and are scaled up)
- **Frames:** 1
- **Not rendered** in-game; it only defines where the player can walk and where coins spawn.
- **How to author:** overlay it on top of `room_topdown_960x540.png`, then paint the floor the player should be able to stand on as solid **white**. Paint everything blocked (walls, furniture, edges, out-of-bounds) as solid **black** or leave it **transparent**.
- **Rule used by the game:** a pixel is walkable when it is opaque (alpha >= 32) and light (average RGB > 100). So white = walkable, black/transparent = blocked.
- **Fallback:** if this file is absent, the game falls back to the plain rectangular floor bounds (`world.floorTop`..`world.floorBottom`, full width) and everything inside that box is walkable.

### 2) Player character spritesheet

- **Path:** `public/assets/sprites/character/player_topdown_8dir_68x68_sheet.png`
- **Size:** `476x544` (7 columns x 8 rows of `68x68`)
- **Frames layout:**
  - 8 rows total, one direction per row in order: `N, NE, E, SE, S, SW, W, NW`
  - 7 frames per row: frame 1 = idle, frames 2-7 = walk loop
  - Character is centered in an effective `20x32` gameplay hitbox inside each `68x68` frame (tune via `CONFIG.player.hitbox`)
- **Prompt:**
  > Pixel art top-down human character for gloomy apartment survival game, 68x68 per frame, spritesheet 476x544 with 8 directional rows (N, NE, E, SE, S, SW, W, NW), each row with 7 frames (idle + 6-frame walk cycle), simple readable silhouette, tired posture, worn muted clothes (faded olive-green shirt, dark slate trousers, bone-grey undershirt) with a small rust-red accent, transparent background, no anti-aliasing, palette olive-green + slate + bone with rust accent to match grimy apartment.

### 3) Fridge states

- **Path:** `public/assets/sprites/appliances/fridge_states_48x48.png`
- **Size:** `144x48` (3 frames horizontally, each `48x48`)
- **Frames:** normal, damaged, dead
- **Prompt:**
  > Top-down 3-4 view pixel art old two-door fridge, bone-cream body with rust streaks, chunky handles, fridge magnets and a couple of taped notes for personality, 48x48 per frame, 3-frame strip 144x48, frame1 normal but worn and grimy, frame2 damaged with dents/cracks and tiny sparks, frame3 dead/off dark and lifeless, transparent background, no anti-aliasing, palette bone-cream + rust + olive to match grimy apartment.

### 4) Water heater states

- **Path:** `public/assets/sprites/appliances/heater_states_48x48.png`
- **Size:** `144x48` (3 frames horizontally, each `48x48`)
- **Frames:** normal, damaged, dead
- **Prompt:**
  > Top-down 3-4 view pixel art old cylindrical water heater boiler tank, white/bone metal with rust drips and a small pressure gauge and pipes on top, 48x48 per frame, 3-frame strip 144x48, frame1 normal worn unit, frame2 damaged with water leak and sparks, frame3 dead dark inactive unit, readable silhouette, transparent background, no anti-aliasing, palette bone-cream + rust + slate to match grimy apartment.

### 4b) Washing machine states

- **Path:** `public/assets/sprites/appliances/washer_states_48x48.png`
- **Size:** `144x48` (3 frames horizontally, each `48x48`)
- **Frames:** normal, damaged, dead
- **Prompt:**
  > Top-down 3-4 view pixel art old front-loading washing machine, bone-cream and slate metal body with a round glass drum door and a small "MYSTERY" sticker on the front, 48x48 per frame, 3-frame strip 144x48, frame1 normal worn unit with faint vibration lines, frame2 damaged with leaking water and sparks, frame3 dead dark inactive unit, transparent background, no anti-aliasing, palette bone-cream + slate + rust to match grimy apartment.

### 5) Apartment door states

- **Path:** `public/assets/sprites/world/door_states_48x48.png`
- **Size:** `96x48` (2 frames horizontally, each `48x48`)
- **Frames:** closed/inactive, active/vendor-arrived
- **Prompt:**
  > Pixel art battered red metal apartment door in top-down 3-4 perspective, rust-red with scuffs, dents and a small taped notice, 48x48 per frame, two-frame strip 96x48, frame1 closed neutral door in cold light, frame2 highlighted active door with a warm yellow lamp glow spilling around it for vendor interaction, transparent background, no anti-aliasing, palette rust-red + bone + warm lamp glow.

### 6) Don Jose vendor

- **Path:** `public/assets/sprites/props/vendor_don_jose_4dir_64x64_sheet.png`
- **Size:** `256x64` (4 frames horizontally, each `64x64`)
- **Frames:** 4 idle facings in order `S, N, W, E` (no walk cycle)
- **Gameplay note:** character is centered in an effective `20x32` gameplay hitbox inside each `64x64` frame
- **Prompt:**
  > Top-down 3-4 pixel art handyman vendor character, grimy mustard/ochre overalls over a bone undershirt, rust-red cap, awkward friendly smile, slightly shady vibe, 64x64 per frame, 4 idle facings only in order S/N/W/E, no walk cycle, transparent background, no anti-aliasing, readable silhouette, palette mustard + rust + bone + olive to match grimy apartment.

### 7) Tool cart prop (optional but recommended)

- **Path:** `public/assets/sprites/props/vendor_cart_32x32.png`
- **Size:** `32x32`
- **Frames:** 1
- **Note:** filename is `vendor_cart_32x32.png` (fixed from accidental `.png.png`)
- **Prompt:**
  > Pixel art small repair tool cart in top-down 3-4 perspective, old slate blue-green metal frame with rust streaks, cluttered tools with mustard and bone highlights, 32x32, transparent background, no anti-aliasing, palette slate + rust + mustard + bone to match grimy apartment.

### 8) Coin pickup

- **Path:** `public/assets/sprites/props/coin_32x32_strip.png`
- **Size:** `64x32` (2 frames, each `32x32`)
- **Frames:** base, shine
- **Prompt:**
  > Pixel art coin pickup icon for grimy apartment game, 32x32 per frame, 2-frame strip 64x32 with subtle shine variation, grimy mustard/ochre-gold coin with a slightly tarnished edge, transparent background, no anti-aliasing, palette mustard-gold + rust shadow.

### 9) UI icon sheet

- **Path:** `public/assets/sprites/ui/icons_32x32_sheet.png`
- **Size:** `256x32` (8 icons horizontally, each `32x32`)
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
  > Pixel art UI icon strip, 8 icons horizontally, each 32x32, total 256x32, icons for hunger, hygiene, money, spare parts, plug on, plug off, lightning surge warning, and day/clock, high readability on dark olive background, bone-cream line work with palette-coded fills (hunger warm ochre-orange, hygiene cool teal-blue, money mustard-gold, plug-on olive-green, plug-off/surge rust-red, clock bone), transparent background, no anti-aliasing.

### 9b) Bill receipt paper

- **Path:** `public/assets/sprites/ui/bill_receipt_paper.png`
- **Size:** `200x280` (or similar; code scales fallback to this)
- **Use:** Modal daily-bill breakdown overlay (line items, total, paid, debt shortfall, `CLOSE (N s)` footer)
- **Note:** Arcade bitmap font has no `$` glyph — receipt text uses bare amounts. Optional future: add `$` to `arcade.png` / `arcade.xml`.
- **Prompt:**
  > Pixel art worn paper bill / invoice sheet for grimy apartment game UI, 200x280, bone-cream paper with grime edges and faint fold lines, empty center area for overlaid text, no anti-aliasing, palette bone + olive grime + rust accent, transparent background outside the paper.

---


## Optional post-slice assets (later expansion)

### Stove states (post-slice)
- **Path:** `public/assets/sprites/appliances/stove_states_48x48.png`
- **Size:** `144x48`

### Washing machine states (post-slice)
- **Path:** `public/assets/sprites/appliances/washer_states_48x48.png`
- **Size:** `144x48`

### Mood icon (post-slice)
- **Path:** `public/assets/sprites/ui/icon_mood_32x32.png`
- **Size:** `32x32`

---

## Naming and export checklist

- Keep filenames exactly as listed so code wiring is plug-and-play.
- Keep exact dimensions; avoid auto-cropping.
- PNG only.
- Transparent background for all sprites except `room_topdown_960x540.png`.
- If PixelLab exports with padding, trim to exact target size before final drop.
