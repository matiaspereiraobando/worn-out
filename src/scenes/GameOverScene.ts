import Phaser from "phaser";
import { CONFIG } from "../config";
import { PHRASES } from "../phrases";
import type { RunResult } from "./GameScene";

/** End screen: one screen, variable text, the exploitation scoreboard (GDD §15). */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("gameover");
  }

  create(result: RunResult): void {
    const c = CONFIG.colors;
    const cx = CONFIG.width / 2;
    this.add.rectangle(0, 0, CONFIG.width, CONFIG.height, c.bg).setOrigin(0);

    const text = (
      y: number,
      str: string,
      size: number,
      color: number,
      origin: number = 0.5,
    ) =>
      this.add
        .bitmapText(cx, y, CONFIG.font.key, str, size)
        .setTint(color)
        .setOrigin(origin);

    text(40, "WORN OUT", CONFIG.font.sizeLg, c.text);
    text(66, `"${result.causeText}"`, CONFIG.font.sizeSm, c.danger);

    this.add.rectangle(cx, 92, 460, 1, c.grime).setOrigin(0.5);
    text(112, `HIGH SCORE: $${result.finalScore.toLocaleString()}`, CONFIG.font.sizeMd, c.money);
    text(
      134,
      `raw $${result.rawScore.toLocaleString()}  ×  ${result.mult}  (${result.archetypeLabel})`,
      CONFIG.font.sizeSm,
      c.textDim,
    );
    this.add.rectangle(cx, 156, 460, 1, c.grime).setOrigin(0.5);

    const left =
      `Bills paid:      $${result.billsPaid}\n` +
      `New appliances:  $${result.newApplianceValue}\n` +
      `Debt at break:   $${result.debt}\n` +
      `Days survived:   ${result.days}`;
    const right =
      `Meals eaten:  ${result.meals}\n` +
      `Showers:      ${result.showers}\n` +
      `Repairs:      ${result.repairs}\n` +
      `Cleans:       ${result.cleans}\n` +
      `Scrapped:     ${result.scraps}\n` +
      `Bought new:   ${result.buys}\n` +
      `Unplug actions: ${result.unplugActions}\n` +
      `Surges dodged:  ${result.surgesDodged}\n` +
      `Surges taken:   ${result.surgesTaken}`;

    this.add
      .bitmapText(cx - 230, 176, CONFIG.font.key, left, CONFIG.font.sizeSm)
      .setTint(c.text)
      .setOrigin(0, 0);
    this.add
      .bitmapText(cx + 30, 176, CONFIG.font.key, right, CONFIG.font.sizeSm)
      .setTint(c.text)
      .setOrigin(0, 0);

    text(400, `PLAYER TYPE: "${result.archetypeLabel}"`, CONFIG.font.sizeSm, c.money);
    text(420, PHRASES.manufacturer, CONFIG.font.sizeSm, c.textDim);

    const btn = this.add
      .rectangle(cx, 470, 160, 30, c.panel)
      .setStrokeStyle(2, c.money)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.add
      .bitmapText(cx, 466, CONFIG.font.key, "RETRY", CONFIG.font.sizeMd)
      .setTint(c.text)
      .setOrigin(0.5);
    btn.on("pointerover", () => btn.setFillStyle(c.grime));
    btn.on("pointerout", () => btn.setFillStyle(c.panel));
    btn.on("pointerdown", () => this.scene.start("game"));
    this.input.keyboard?.once("keydown-SPACE", () => this.scene.start("game"));
    this.input.keyboard?.once("keydown-ENTER", () => this.scene.start("game"));

    text(496, "[ click RETRY or press SPACE ]", CONFIG.font.sizeSm, c.textDim);
  }
}
