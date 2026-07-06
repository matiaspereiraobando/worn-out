import Phaser from "phaser";
import { ASSETS } from "../assets";
import { CONFIG } from "../config";

/**
 * Loads external assets and generates deterministic fallback textures so the
 * game stays playable before final sprite delivery.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload(): void {
    this.load.bitmapFont(ASSETS.font.key, ASSETS.font.png, ASSETS.font.xml);

    // Asset-manifest wiring for real art (404-safe; fallbacks are generated in create).
    this.load.image(ASSETS.sprites.room.key, ASSETS.sprites.room.path);
    this.load.image(ASSETS.sprites.walkmask.key, ASSETS.sprites.walkmask.path);
    this.load.spritesheet(ASSETS.sprites.player.key, ASSETS.sprites.player.path, {
      frameWidth: 68,
      frameHeight: 68,
    });
    this.load.spritesheet(ASSETS.sprites.fridge.key, ASSETS.sprites.fridge.path, {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet(ASSETS.sprites.heater.key, ASSETS.sprites.heater.path, {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet(ASSETS.sprites.washer.key, ASSETS.sprites.washer.path, {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet(ASSETS.sprites.door.key, ASSETS.sprites.door.path, {
      frameWidth: 48,
      frameHeight: 48,
    });
    this.load.spritesheet(ASSETS.sprites.vendor.key, ASSETS.sprites.vendor.path, {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.image(ASSETS.sprites.cart.key, ASSETS.sprites.cart.path);
    this.load.spritesheet(ASSETS.sprites.coin.key, ASSETS.sprites.coin.path, {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet(ASSETS.sprites.icons.key, ASSETS.sprites.icons.path, {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.image(ASSETS.sprites.stripWarn.key, ASSETS.sprites.stripWarn.path);
    this.load.image(ASSETS.sprites.stripDanger.key, ASSETS.sprites.stripDanger.path);
    this.load.image(ASSETS.sprites.titleScreen.key, ASSETS.sprites.titleScreen.path);
    this.load.image(ASSETS.sprites.gameOverScreen.key, ASSETS.sprites.gameOverScreen.path);

    for (const sfx of Object.values(ASSETS.sfx)) {
      this.load.audio(sfx.key, sfx.path);
    }
    this.load.audio(ASSETS.music.theme.key, ASSETS.music.theme.path);
  }

  create(): void {
    this.makeFallback("fallback-room", 960, 540, CONFIG.colors.bg, CONFIG.colors.panelDark);
    this.makeFallback("fallback-player", 16, 16, CONFIG.colors.ok, CONFIG.colors.grime);
    this.makeFallback("fallback-fridge", 24, 30, CONFIG.colors.panel, CONFIG.colors.grime);
    this.makeFallback("fallback-heater", 24, 30, 0x434338, CONFIG.colors.grime);
    this.makeFallback("fallback-washer", 24, 30, 0x5f6b74, CONFIG.colors.grime);
    this.makeFallback("fallback-door", 24, 30, 0x564531, CONFIG.colors.grime);
    this.makeFallback("fallback-vendor", 24, 30, 0x7f8ba6, CONFIG.colors.grime);
    this.makeFallback("fallback-coin", 10, 10, CONFIG.colors.money, 0x8a7a2e);
    this.makeFallback("fallback-strip-warn", 960, 40, CONFIG.colors.warn, CONFIG.colors.grime);
    this.makeFallback("fallback-strip-danger", 960, 40, CONFIG.colors.danger, CONFIG.colors.grime);
    this.makeFallback("fallback-title-screen", 960, 540, CONFIG.colors.bg, CONFIG.colors.panelDark);
    this.makeFallback("fallback-game-over-screen", 960, 540, CONFIG.colors.bg, CONFIG.colors.panelDark);

    this.scene.launch("music");
    this.scene.start("menu");
  }

  private makeFallback(
    key: string,
    width: number,
    height: number,
    fill: number,
    stroke: number,
  ): void {
    if (this.textures.exists(key)) return;
    const g = this.add.graphics({ x: 0, y: 0 });
    g.setVisible(false);
    g.fillStyle(fill, 1);
    g.fillRect(0, 0, width, height);
    g.lineStyle(1, stroke, 1);
    g.strokeRect(0, 0, width, height);
    g.generateTexture(key, width, height);
    g.destroy();
  }
}

