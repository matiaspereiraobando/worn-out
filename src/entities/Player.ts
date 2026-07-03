import Phaser from "phaser";
import { CONFIG } from "../config";
import { clampPlayerSprite } from "../playerHitbox";

type Facing = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

const DIRS: Facing[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const FRAMES_PER_ROW = 7;

export class Player {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly scene: Phaser.Scene;
  private animated = false;
  private facing: Facing = "S";
  private isWalkable: (x: number, y: number) => boolean = () => true;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.add.sprite(x, y, "fallback-player").setOrigin(0.5);
    this.sprite.setDepth(10);
  }

  /** Supply a walkability test; blocked target positions are rejected per-axis. */
  setWalkable(fn: (x: number, y: number) => boolean): void {
    this.isWalkable = fn;
  }

  setTextureKey(textureKey: string): void {
    if (this.scene.textures.exists(textureKey)) {
      this.sprite.setTexture(textureKey);
      this.sprite.setOrigin(0.5);
      this.sprite.setDepth(10);
      this.sprite.setScale(CONFIG.player.spriteScale);
      this.animated = true;
      this.ensureWalkAnimations(textureKey);
      this.setIdleFrame(this.facing);
    }
  }

  move(vx: number, vy: number, dt: number): void {
    const speed = CONFIG.player.speed;
    let dx = vx;
    let dy = vy;
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      dx /= len;
      dy /= len;
    }

    const nextX = this.clampX(this.sprite.x + dx * speed * dt);
    if (this.isWalkable(nextX, this.sprite.y)) this.sprite.x = nextX;
    const nextY = this.clampY(this.sprite.y + dy * speed * dt);
    if (this.isWalkable(this.sprite.x, nextY)) this.sprite.y = nextY;

    this.updateAnimation(vx, vy);
  }

  private ensureWalkAnimations(textureKey: string): void {
    DIRS.forEach((dir, row) => {
      const key = `player-walk-${dir}`;
      if (this.scene.anims.exists(key)) return;
      this.scene.anims.create({
        key,
        frames: this.scene.anims.generateFrameNumbers(textureKey, {
          start: row * FRAMES_PER_ROW + 1,
          end: row * FRAMES_PER_ROW + 6,
        }),
        frameRate: CONFIG.player.walkFps,
        repeat: -1,
      });
    });
  }

  private setIdleFrame(dir: Facing): void {
    const row = DIRS.indexOf(dir);
    this.sprite.setFrame(row * FRAMES_PER_ROW);
  }

  private directionFromInput(vx: number, vy: number): Facing {
    if (vy < 0) {
      if (vx < 0) return "NW";
      if (vx > 0) return "NE";
      return "N";
    }
    if (vy > 0) {
      if (vx < 0) return "SW";
      if (vx > 0) return "SE";
      return "S";
    }
    if (vx < 0) return "W";
    return "E";
  }

  private updateAnimation(vx: number, vy: number): void {
    if (!this.animated) return;
    if (vx === 0 && vy === 0) {
      this.sprite.anims.stop();
      this.setIdleFrame(this.facing);
      return;
    }

    this.facing = this.directionFromInput(vx, vy);
    this.sprite.anims.play(`player-walk-${this.facing}`, true);
  }

  private clampX(x: number): number {
    return clampPlayerSprite(x, this.sprite.y).x;
  }

  private clampY(y: number): number {
    return clampPlayerSprite(this.sprite.x, y).y;
  }
}

