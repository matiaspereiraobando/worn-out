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
      color: string,
      bold = false,
    ) =>
      this.add
        .text(cx, y, str, {
          fontFamily: "Courier New, monospace",
          fontSize: `${size}px`,
          color,
          align: "center",
          fontStyle: bold ? "bold" : "normal",
          wordWrap: { width: CONFIG.width - 120 },
          lineSpacing: 6,
        })
        .setOrigin(0.5);

    text(60, "WORN OUT", 34, "#e8e4d0", true);
    text(104, `"${result.causeText}"`, 18, "#d23b2e");

    this.add.rectangle(cx, 140, 520, 2, c.grime).setOrigin(0.5);
    text(172, `HIGH SCORE: $${result.finalScore.toLocaleString()}`, 26, "#c9b458", true);
    text(
      212,
      `raw $${result.rawScore.toLocaleString()}  ×  ${result.mult}  (${result.archetypeLabel})`,
      14,
      "#9a9680",
    );
    this.add.rectangle(cx, 240, 520, 2, c.grime).setOrigin(0.5);

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
      `Unplugs:      ${result.unplugs}\n` +
      `Failed unplugs: ${result.failedUnplugs}`;

    this.add
      .text(cx - 230, 268, left, {
        fontFamily: "Courier New, monospace",
        fontSize: "14px",
        color: "#e8e4d0",
        lineSpacing: 6,
      })
      .setOrigin(0, 0);
    this.add
      .text(cx + 20, 268, right, {
        fontFamily: "Courier New, monospace",
        fontSize: "14px",
        color: "#e8e4d0",
        lineSpacing: 6,
      })
      .setOrigin(0, 0);

    text(430, `PLAYER TYPE: "${result.archetypeLabel}"`, 16, "#c9b458", true);
    text(470, PHRASES.manufacturer, 13, "#9a9680");

    const btn = this.add
      .rectangle(cx, 540, 200, 44, c.panel)
      .setStrokeStyle(2, c.money)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(cx, 540, "RETRY", {
        fontFamily: "Courier New, monospace",
        fontSize: "18px",
        color: "#e8e4d0",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    btn.on("pointerover", () => btn.setFillStyle(c.grime));
    btn.on("pointerout", () => btn.setFillStyle(c.panel));
    btn.on("pointerdown", () => this.scene.start("game"));
    this.input.keyboard?.once("keydown-SPACE", () => this.scene.start("game"));
    this.input.keyboard?.once("keydown-ENTER", () => this.scene.start("game"));

    text(578, "[ click RETRY or press SPACE ]", 11, "#6b6858");
  }
}
