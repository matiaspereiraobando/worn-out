import Phaser from "phaser";
import { CONFIG } from "../config";
import { Appliance } from "../model/Appliance";

/** Renders one appliance slot (placeholder art via shapes + a little face). */
export class ApplianceView {
  readonly container: Phaser.GameObjects.Container;
  private readonly selectRing: Phaser.GameObjects.Rectangle;
  private readonly body: Phaser.GameObjects.Rectangle;
  private readonly face: Phaser.GameObjects.Text;
  private readonly title: Phaser.GameObjects.Text;
  private readonly hpBarBg: Phaser.GameObjects.Rectangle;
  private readonly hpBar: Phaser.GameObjects.Rectangle;
  private readonly hpText: Phaser.GameObjects.Text;
  private readonly status: Phaser.GameObjects.Text;
  private blinkT = 0;

  static readonly W = 200;
  static readonly H = 150;

  constructor(scene: Phaser.Scene, x: number, y: number, label: string) {
    const W = ApplianceView.W;
    const H = ApplianceView.H;

    this.selectRing = scene.add
      .rectangle(0, 0, W + 16, H + 16, 0x000000, 0)
      .setStrokeStyle(3, CONFIG.colors.warn)
      .setOrigin(0.5)
      .setVisible(false);

    this.body = scene.add
      .rectangle(0, 0, W, H, CONFIG.colors.panel)
      .setStrokeStyle(2, CONFIG.colors.grime)
      .setOrigin(0.5);

    this.face = scene.add
      .text(0, 4, "•‿•", {
        fontFamily: "Courier New, monospace",
        fontSize: "34px",
        color: "#cfcab0",
      })
      .setOrigin(0.5);

    this.title = scene.add
      .text(0, -H / 2 - 18, label, {
        fontFamily: "Courier New, monospace",
        fontSize: "16px",
        color: "#e8e4d0",
      })
      .setOrigin(0.5);

    this.hpBarBg = scene.add
      .rectangle(0, H / 2 + 16, W, 14, CONFIG.colors.panelDark)
      .setStrokeStyle(1, CONFIG.colors.grime)
      .setOrigin(0.5);
    this.hpBar = scene.add
      .rectangle(-W / 2 + 1, H / 2 + 16, W - 2, 12, CONFIG.colors.hp)
      .setOrigin(0, 0.5);
    this.hpText = scene.add
      .text(0, H / 2 + 16, "", {
        fontFamily: "Courier New, monospace",
        fontSize: "11px",
        color: "#14140f",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.status = scene.add
      .text(0, H / 2 + 36, "", {
        fontFamily: "Courier New, monospace",
        fontSize: "12px",
        color: "#9a9680",
      })
      .setOrigin(0.5);

    this.container = scene.add.container(x, y, [
      this.selectRing,
      this.body,
      this.face,
      this.title,
      this.hpBarBg,
      this.hpBar,
      this.hpText,
      this.status,
    ]);
  }

  get bodyRect(): Phaser.GameObjects.Rectangle {
    return this.body;
  }

  setSelected(sel: boolean): void {
    this.selectRing.setVisible(sel);
  }

  update(appliance: Appliance | null, dt: number): void {
    if (!appliance) {
      this.body.setFillStyle(CONFIG.colors.panelDark).setAlpha(0.5);
      this.face.setText("(gone)").setFontSize(16).setAlpha(0.6);
      this.hpBar.setVisible(false);
      this.hpText.setText("");
      this.hpBarBg.setFillStyle(CONFIG.colors.panelDark);
      this.status.setText("empty slot — Buy New").setColor("#c9b458");
      return;
    }

    this.hpBar.setVisible(true);
    const frac = appliance.hpFraction;
    const W = ApplianceView.W;
    this.hpBar.width = Math.max(0, (W - 2) * frac);

    let bodyColor: number = CONFIG.colors.panel;
    let barColor: number = CONFIG.colors.hp;
    let faceStr = "•‿•";
    this.face.setFontSize(34).setAlpha(1);

    switch (appliance.visualState) {
      case "normal":
        break;
      case "cracked":
        bodyColor = CONFIG.colors.grime;
        barColor = CONFIG.colors.warn;
        faceStr = "•~•";
        break;
      case "blinking":
        bodyColor = CONFIG.colors.grime;
        barColor = CONFIG.colors.danger;
        faceStr = "x_x";
        this.blinkT += dt;
        this.body.setAlpha(Math.sin(this.blinkT * 10) > 0 ? 1 : 0.55);
        break;
      case "dead":
        bodyColor = CONFIG.colors.panelDark;
        barColor = CONFIG.colors.panelDark;
        faceStr = "▪▪";
        this.body.setAlpha(0.6);
        this.face.setAlpha(0.5);
        break;
    }
    if (appliance.visualState !== "blinking" && appliance.visualState !== "dead") {
      this.body.setAlpha(1);
    }

    this.body.setFillStyle(bodyColor);
    this.hpBar.setFillStyle(barColor);
    this.face.setText(faceStr);
    this.hpText.setText(`${Math.ceil(appliance.hp)} / ${appliance.maxHp}`);

    // Status line: cleaning buff, cooldown, scrap lock.
    const bits: string[] = [];
    if (!appliance.alive) bits.push("DEAD");
    if (appliance.cleanBuffSec > 0) bits.push(`clean ${appliance.cleanBuffSec.toFixed(0)}s`);
    if (appliance.scrapLockSec > 0) bits.push(`scrap-lock ${appliance.scrapLockSec.toFixed(0)}s`);
    this.status
      .setText(bits.join("  ·  "))
      .setColor(!appliance.alive ? "#d23b2e" : "#9a9680");
  }
}
