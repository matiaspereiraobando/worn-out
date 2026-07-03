import Phaser from "phaser";
import { CONFIG } from "../config";

/** Minimal clickable button (rectangle + label). Mouse-first UI. */
export class Button {
  readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly cooldownBar: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.BitmapText;
  private readonly w: number;
  private readonly h: number;
  private enabled = true;
  private onClick: () => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    onClick: () => void,
  ) {
    this.onClick = onClick;
    this.w = w;
    this.h = h;
    this.bg = scene.add
      .rectangle(0, 0, w, h, CONFIG.colors.panelDark)
      .setStrokeStyle(1, CONFIG.colors.grime)
      .setOrigin(0.5);
    this.cooldownBar = scene.add
      .rectangle(-w / 2, 0, w, h, CONFIG.colors.grime, 0.55)
      .setOrigin(0, 0.5)
      .setVisible(false);
    this.label = scene.add
      .bitmapText(0, 0, CONFIG.font.key, text, CONFIG.font.sizeSm)
      .setTint(CONFIG.colors.text)
      .setOrigin(0.5);

    this.container = scene.add.container(x, y, [this.bg, this.cooldownBar, this.label]);
    this.bg.setInteractive({ useHandCursor: true });
    this.bg.on("pointerover", () => this.enabled && this.bg.setFillStyle(CONFIG.colors.grime));
    this.bg.on("pointerout", () => this.bg.setFillStyle(CONFIG.colors.panelDark));
    this.bg.on("pointerdown", () => {
      if (this.enabled) this.onClick();
    });
  }

  setText(text: string): this {
    // Guard against stale wrappers after scene shutdown destroyed the label.
    if (!this.label.active || !this.label.fontData) return this;
    this.label.setText(text);
    return this;
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.label.setTint(enabled ? CONFIG.colors.text : 0x6b6858);
    this.bg.setFillStyle(CONFIG.colors.panelDark);
    return this;
  }

  setCooldown(frac: number): this {
    const f = Phaser.Math.Clamp(frac, 0, 1);
    if (f <= 0) {
      this.cooldownBar.setVisible(false);
      return this;
    }
    this.cooldownBar.setVisible(true);
    this.cooldownBar.width = Math.max(1, this.w * f);
    this.cooldownBar.x = -this.w / 2;
    this.cooldownBar.y = 0;
    this.cooldownBar.height = this.h;
    return this;
  }

  setVisible(v: boolean): this {
    this.container.setVisible(v);
    return this;
  }

  setHandler(fn: () => void): this {
    this.onClick = fn;
    return this;
  }

  destroy(): void {
    this.container.destroy();
  }
}
