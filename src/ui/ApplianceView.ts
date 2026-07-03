import Phaser from "phaser";
import { ASSETS } from "../assets";
import { CONFIG } from "../config";
import { Appliance } from "../model/Appliance";

/** Renders one appliance as a world object (top-down, proximity-based). */
export class ApplianceView {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly body: Phaser.GameObjects.Rectangle;
  private readonly sprite?: Phaser.GameObjects.Sprite;
  private readonly title: Phaser.GameObjects.BitmapText;
  private readonly hpBarBg: Phaser.GameObjects.Rectangle;
  private readonly hpBar: Phaser.GameObjects.Rectangle;
  private readonly hpText: Phaser.GameObjects.BitmapText;
  private readonly status: Phaser.GameObjects.BitmapText;
  private readonly plugIcon?: Phaser.GameObjects.Sprite;
  private readonly selectionRing: Phaser.GameObjects.Rectangle;
  private blinkT = 0;

  static readonly W = 48;
  static readonly H = 48;

  constructor(scene: Phaser.Scene, x: number, y: number, label: string, spriteKey?: string) {
    this.scene = scene;
    const W = ApplianceView.W;
    const H = ApplianceView.H;

    this.body = scene.add
      .rectangle(0, 0, W, H, CONFIG.colors.panel)
      .setStrokeStyle(2, CONFIG.colors.grime)
      .setOrigin(0.5);
    if (spriteKey && this.scene.textures.exists(spriteKey)) {
      this.sprite = scene.add.sprite(0, 0, spriteKey, 0).setDisplaySize(48, 48).setOrigin(0.5);
      this.body.setVisible(false);
    }

    this.title = scene.add
      .bitmapText(0, -H / 2 - 12, CONFIG.font.key, label, CONFIG.font.sizeSm)
      .setTint(CONFIG.colors.text)
      .setOrigin(0.5);

    this.hpBarBg = scene.add
      .rectangle(0, H / 2 + 12, W, 6, CONFIG.colors.panelDark)
      .setStrokeStyle(1, CONFIG.colors.grime)
      .setOrigin(0.5);
    this.hpBar = scene.add
      .rectangle(-W / 2 + 1, H / 2 + 12, W - 2, 4, CONFIG.colors.hp)
      .setOrigin(0, 0.5);
    this.hpText = scene.add
      .bitmapText(0, H / 2 + 12, CONFIG.font.key, "", CONFIG.font.sizeSm)
      .setTint(0x14140f)
      .setOrigin(0.5);

    this.status = scene.add
      .bitmapText(0, H / 2 + 24, CONFIG.font.key, "", CONFIG.font.sizeSm)
      .setTint(CONFIG.colors.textDim)
      .setOrigin(0.5);
    if (scene.textures.exists(ASSETS.sprites.icons.key)) {
      this.plugIcon = scene.add
        .sprite(W / 2 + 20, 0, ASSETS.sprites.icons.key, 4)
        .setDisplaySize(32, 32)
        .setVisible(false);
    }

    this.selectionRing = scene.add
      .rectangle(0, 0, W + 8, H + 8, 0, 0)
      .setStrokeStyle(2, CONFIG.colors.warn)
      .setVisible(false);

    this.container = scene.add.container(x, y, [
      this.selectionRing,
      this.body,
      ...(this.sprite ? [this.sprite] : []),
      this.title,
      this.hpBarBg,
      this.hpBar,
      this.hpText,
      this.status,
      ...(this.plugIcon ? [this.plugIcon] : []),
    ]);
  }

  get worldX(): number {
    return this.container.x;
  }

  get worldY(): number {
    return this.container.y;
  }

  setInRange(sel: boolean): void {
    this.selectionRing.setVisible(sel);
  }

  update(appliance: Appliance | null, dt: number): void {
    if (!appliance) {
      if (this.sprite) this.sprite.setVisible(false);
      this.body.setVisible(true);
      this.body.setFillStyle(CONFIG.colors.panelDark).setAlpha(0.5);
      this.hpBar.setVisible(false);
      this.hpText.setText("");
      this.hpBarBg.setFillStyle(CONFIG.colors.panelDark);
      this.plugIcon?.setVisible(false);
      this.status.setText("EMPTY");
      this.status.setTint(CONFIG.colors.money);
      return;
    }

    if (this.sprite) {
      this.sprite.setVisible(true);
      const frame = appliance.visualState === "normal" ? 0 : appliance.visualState === "cracked" ? 1 : 2;
      this.sprite.setFrame(frame);
      this.body.setVisible(false);
    } else {
      this.body.setVisible(true);
    }

    this.hpBar.setVisible(true);
    const frac = appliance.hpFraction;
    const W = ApplianceView.W;
    this.hpBar.width = Math.max(0, (W - 2) * frac);

    let bodyColor: number = CONFIG.colors.panel;
    let barColor: number = CONFIG.colors.hp;

    switch (appliance.visualState) {
      case "normal":
        break;
      case "cracked":
        bodyColor = CONFIG.colors.grime;
        barColor = CONFIG.colors.warn;
        break;
      case "blinking":
        bodyColor = CONFIG.colors.grime;
        barColor = CONFIG.colors.danger;
        this.blinkT += dt;
        this.body.setAlpha(Math.sin(this.blinkT * 10) > 0 ? 1 : 0.55);
        break;
      case "dead":
        bodyColor = CONFIG.colors.panelDark;
        barColor = CONFIG.colors.panelDark;
        this.body.setAlpha(0.6);
        break;
    }
    if (appliance.visualState !== "blinking" && appliance.visualState !== "dead") {
      this.body.setAlpha(1);
    }

    this.body.setFillStyle(bodyColor);
    this.hpBar.setFillStyle(barColor);
    this.hpText.setText(`${Math.ceil(appliance.hp)}`);

    const bits: string[] = [];
    if (!appliance.alive) bits.push("DEAD");
    if (!appliance.plugged && !this.plugIcon) bits.push("UNPLUG");
    if (appliance.cleanBuffSec > 0) bits.push(`C${appliance.cleanBuffSec.toFixed(0)}s`);
    if (appliance.scrapLockSec > 0) bits.push(`S${appliance.scrapLockSec.toFixed(0)}s`);
    this.status.setText(bits.join(" "));
    if (this.plugIcon) {
      this.plugIcon.setFrame(appliance.plugged ? 4 : 5);
      this.plugIcon.setVisible(true);
    }
    this.status.setTint(!appliance.alive ? CONFIG.colors.danger : CONFIG.colors.textDim);
  }
}
