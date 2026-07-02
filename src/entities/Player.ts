import Phaser from "phaser";
import { CONFIG } from "../config";

export class Player {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.add.sprite(x, y, "fallback-player").setOrigin(0.5);
    this.sprite.setDepth(10);
  }

  setTextureKey(textureKey: string): void {
    if (this.scene.textures.exists(textureKey)) {
      this.sprite.setTexture(textureKey);
      this.sprite.setDisplaySize(16, 16);
      this.sprite.setOrigin(0.5);
      this.sprite.setDepth(10);
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
    this.sprite.x += dx * speed * dt;
    this.sprite.y += dy * speed * dt;
    this.clampToWorld();
  }

  private clampToWorld(): void {
    const halfW = CONFIG.player.w / 2;
    const halfH = CONFIG.player.h / 2;
    this.sprite.x = Phaser.Math.Clamp(this.sprite.x, halfW, CONFIG.width - halfW);
    this.sprite.y = Phaser.Math.Clamp(
      this.sprite.y,
      CONFIG.world.floorTop + halfH,
      CONFIG.world.floorBottom - halfH,
    );
  }
}

