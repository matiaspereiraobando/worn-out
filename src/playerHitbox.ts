import { CONFIG } from "./config";

/** World-space center of the player walk/collision hitbox. */
export function playerHitboxCenter(spriteX: number, spriteY: number): { x: number; y: number } {
  const hb = CONFIG.player.hitbox;
  return { x: spriteX + hb.offsetX, y: spriteY + hb.offsetY };
}

/** Sample points used to test walk-mask collision for a sprite position. */
export function playerHitboxSamples(spriteX: number, spriteY: number): Array<[number, number]> {
  const { x: cx, y: cy } = playerHitboxCenter(spriteX, spriteY);
  const hw = CONFIG.player.hitbox.w / 2;
  const hh = CONFIG.player.hitbox.h / 2;
  return [
    [cx, cy],
    [cx - hw, cy],
    [cx + hw, cy],
    [cx, cy - hh],
    [cx, cy + hh],
    [cx - hw, cy - hh],
    [cx + hw, cy - hh],
    [cx - hw, cy + hh],
    [cx + hw, cy + hh],
  ];
}

/** Clamp sprite origin so the hitbox stays inside world bounds. */
export function clampPlayerSprite(spriteX: number, spriteY: number): { x: number; y: number } {
  const hb = CONFIG.player.hitbox;
  const hw = hb.w / 2;
  const hh = hb.h / 2;
  const minX = hw - hb.offsetX;
  const maxX = CONFIG.width - hw - hb.offsetX;
  const minY = CONFIG.world.floorTop + hh - hb.offsetY;
  const maxY = CONFIG.world.floorBottom - hh - hb.offsetY;
  return {
    x: Math.min(Math.max(spriteX, minX), maxX),
    y: Math.min(Math.max(spriteY, minY), maxY),
  };
}
