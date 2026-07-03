import Phaser from "phaser";
import { CONFIG } from "../config";

/**
 * Walkability lookup backed by a mask image. Author the mask by painting
 * walkable floor WHITE (opaque) and everything blocked BLACK or transparent.
 * The mask can be any size (it is scaled to the world); a 960x540 mask maps 1:1.
 *
 * Pixels are read once into memory on construction, so per-frame lookups are
 * O(1). When the mask texture is missing, every point is considered walkable so
 * the game falls back to the plain rectangular floor bounds.
 */
export class WalkMask {
  private data: Uint8ClampedArray | null = null;
  private maskW = 0;
  private maskH = 0;
  private scaleX = 1;
  private scaleY = 1;

  private static readonly ALPHA_MIN = 32;
  private static readonly LUMA_MIN = 100;

  constructor(scene: Phaser.Scene, key: string) {
    if (!scene.textures.exists(key)) return;
    const source = scene.textures.get(key).getSourceImage() as CanvasImageSource & {
      width: number;
      height: number;
    };
    const w = source.width;
    const h = source.height;
    if (!w || !h) return;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(source, 0, 0);
    try {
      this.data = ctx.getImageData(0, 0, w, h).data;
    } catch {
      this.data = null;
      return;
    }
    this.maskW = w;
    this.maskH = h;
    this.scaleX = w / CONFIG.width;
    this.scaleY = h / CONFIG.height;
  }

  /** True when a real mask was loaded and sampled. */
  get available(): boolean {
    return this.data !== null;
  }

  /** Whether the given world-space point sits on walkable floor. */
  isWalkable(worldX: number, worldY: number): boolean {
    if (!this.data) return true;
    const mx = Math.floor(worldX * this.scaleX);
    const my = Math.floor(worldY * this.scaleY);
    if (mx < 0 || my < 0 || mx >= this.maskW || my >= this.maskH) return false;
    const idx = (my * this.maskW + mx) * 4;
    if (this.data[idx + 3] < WalkMask.ALPHA_MIN) return false;
    const luma = (this.data[idx] + this.data[idx + 1] + this.data[idx + 2]) / 3;
    return luma > WalkMask.LUMA_MIN;
  }
}
