import Phaser from "phaser";
import { ASSETS } from "../assets";
import { CONFIG } from "../config";
import { fmtArcadeNum } from "../fontSafe";
import { PHRASES } from "../phrases";
import { Button } from "../ui/Button";
import type { RunResult } from "./GameScene";

/** End screen: background art + bill-style exploitation receipt (GDD §15). */
export class GameOverScene extends Phaser.Scene {
  private popupLayer!: Phaser.GameObjects.Container;
  private key1!: Phaser.Input.Keyboard.Key;
  private key2!: Phaser.Input.Keyboard.Key;

  constructor() {
    super("gameover");
  }

  create(result: RunResult): void {
    const cx = CONFIG.width / 2;
    const receiptCy = 242;
    const paperH = 416;

    this.buildBackground();
    this.popupLayer = this.buildScoreReceipt(result, cx, receiptCy, paperH);
    this.popupLayer.setDepth(20).setVisible(true).setAlpha(0).setScale(0.92);

    const paperBottom = receiptCy + paperH / 2;
    this.buildActions(cx, paperBottom + 22);

    this.cameras.main.fadeIn(CONFIG.gameOver.fadeInMs, 0, 0, 0, () => {
      this.tweens.add({
        targets: this.popupLayer,
        alpha: 1,
        scale: 1,
        duration: 260,
        ease: "Back.easeOut",
      });
    });

    const kb = this.input.keyboard;
    if (kb) {
      this.key1 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
      this.key2 = kb.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    }

    this.input.keyboard?.once("keydown-SPACE", () => this.startRetry());
    this.input.keyboard?.once("keydown-ENTER", () => this.startRetry());
  }

  update(): void {
    if (this.key1 && Phaser.Input.Keyboard.JustDown(this.key1)) this.startRetry();
    if (this.key2 && Phaser.Input.Keyboard.JustDown(this.key2)) this.startMenu();
  }

  private startMenu(): void {
    this.scene.start("menu");
  }

  private startRetry(): void {
    this.scene.start("game", { mode: "day1" });
  }

  private buildBackground(): void {
    const c = CONFIG.colors;
    const bgKey = this.textures.exists(ASSETS.sprites.gameOverScreen.key)
      ? ASSETS.sprites.gameOverScreen.key
      : "fallback-game-over-screen";
    this.add.image(0, 0, bgKey).setOrigin(0).setDepth(0);

    this.add
      .rectangle(0, 0, CONFIG.width, CONFIG.height, c.bg, 0.55)
      .setOrigin(0)
      .setDepth(5);
  }

  private buildScoreReceipt(
    result: RunResult,
    cx: number,
    cy: number,
    paperH: number,
  ): Phaser.GameObjects.Container {
    const paperW = 280;
    const colL = -118;
    const colR = 118;
    const statsColL = -118;
    const statsColR = 4;
    const ruleW = colR - colL;
    const ink = CONFIG.colors.bg;
    const inkDim = CONFIG.colors.panel;
    const paperFill = 0xe8dcc8;
    const ruleColor = 0x8a8470;
    const c = CONFIG.colors;
    const debtContribution = Math.round(result.debt * CONFIG.score.debtWeight);

    const paper = this.add
      .rectangle(0, 0, paperW, paperH, paperFill)
      .setStrokeStyle(2, c.grime)
      .setOrigin(0.5);

    const bt = (x: number, y: number, str: string, size: number, tint: number = ink) =>
      this.add.bitmapText(x, y, CONFIG.font.key, str, size).setTint(tint).setOrigin(0, 0.5);

    const btr = (x: number, y: number, str: string, size: number, tint: number = ink) =>
      this.add.bitmapText(x, y, CONFIG.font.key, str, size).setTint(tint).setOrigin(1, 0.5);

    const btc = (x: number, y: number, str: string, size: number, tint: number = ink) =>
      this.add.bitmapText(x, y, CONFIG.font.key, str, size).setTint(tint).setOrigin(0.5);

    const children: Phaser.GameObjects.GameObject[] = [paper];
    let y = -paperH / 2 + 24;

    children.push(btc(0, y, PHRASES.gameOverScoreTitle, CONFIG.font.sizeMd, ink));
    y += 18;
    children.push(
      btc(0, y, PHRASES.gameOverScoreTagline, CONFIG.font.sizeSm, inkDim)
        .setMaxWidth(paperW - 24),
    );
    y += 18;
    children.push(this.add.rectangle(0, y, ruleW, 1, ruleColor).setOrigin(0.5));
    y += 12;

    const addRow = (label: string, amount: string, tint: number = ink) => {
      children.push(bt(colL, y, label, CONFIG.font.sizeSm, tint));
      children.push(btr(colR, y, amount, CONFIG.font.sizeSm, tint));
      y += 16;
      children.push(this.add.rectangle(0, y - 3, ruleW, 1, ruleColor).setOrigin(0.5));
      y += 3;
    };

    addRow("BILLS PAID", fmtArcadeNum(result.billsPaid));
    addRow("NEW APPL.", fmtArcadeNum(result.newApplianceValue));
    addRow("DEBT x0.5", fmtArcadeNum(debtContribution));

    y += 2;
    children.push(this.add.rectangle(0, y, ruleW, 1, ink).setOrigin(0.5));
    children.push(this.add.rectangle(0, y + 2, ruleW, 1, ink).setOrigin(0.5));
    y += 14;

    addRow("SUBTOTAL", fmtArcadeNum(result.rawScore));

    children.push(
      btc(0, y, `PLAYER TYPE: ${result.archetypeLabel}`, CONFIG.font.sizeSm, inkDim),
    );
    y += 14;
    children.push(
      btc(0, y, `x${result.mult}  ${result.archetypeBonusLine}`, CONFIG.font.sizeSm, c.money),
    );
    y += 14;
    children.push(btc(0, y, result.archetypeReason, CONFIG.font.sizeSm, inkDim));
    y += 14;

    y += 2;
    children.push(this.add.rectangle(0, y, ruleW, 1, ink).setOrigin(0.5));
    children.push(this.add.rectangle(0, y + 2, ruleW, 1, ink).setOrigin(0.5));
    y += 14;

    children.push(bt(colL, y, "FINAL", CONFIG.font.sizeMd, ink));
    children.push(btr(colR, y, fmtArcadeNum(result.finalScore), CONFIG.font.sizeMd, c.money));
    y += 18;

    children.push(this.add.rectangle(0, y, ruleW, 1, ruleColor).setOrigin(0.5));
    y += 10;

    const mfgQuote = btc(0, y, result.manufacturerQuote, CONFIG.font.sizeSm, inkDim)
      .setMaxWidth(paperW - 28)
      .setCenterAlign()
      .setOrigin(0.5, 0);
    children.push(mfgQuote);
    y += mfgQuote.height + 10;

    children.push(this.add.rectangle(0, y, ruleW, 1, ruleColor).setOrigin(0.5));
    y += 8;
    children.push(btc(0, y, "STATISTICS", CONFIG.font.sizeSm, ink));
    y += 12;

    const leftStats =
      `Days: ${result.days}\n` +
      `Meals: ${result.meals}\n` +
      `Showers: ${result.showers}\n` +
      `Washes: ${result.washes}\n` +
      `Repairs: ${result.repairs}`;
    const rightStats =
      `Cleans: ${result.cleans}\n` +
      `Scrapped: ${result.scraps}\n` +
      `Bought: ${result.buys}\n` +
      `Unplugs: ${result.unplugActions}\n` +
      `Dodged: ${result.surgesDodged}\n` +
      `Hit: ${result.surgesTaken}`;

    children.push(
      this.add
        .bitmapText(statsColL, y, CONFIG.font.key, leftStats, CONFIG.font.sizeSm)
        .setTint(inkDim)
        .setOrigin(0, 0),
    );
    children.push(
      this.add
        .bitmapText(statsColR, y, CONFIG.font.key, rightStats, CONFIG.font.sizeSm)
        .setTint(inkDim)
        .setOrigin(0, 0),
    );

    return this.add.container(cx, cy, children);
  }

  private buildActions(cx: number, actionsY: number): void {
    const retryBtn = new Button(this, 0, 0, 160, 28, "1. RETRY", () => this.startRetry());
    const menuBtn = new Button(this, 0, 32, 160, 28, "2. MENU", () => this.startMenu());

    this.add.container(cx, actionsY, [retryBtn.container, menuBtn.container]).setDepth(30);
  }
}
