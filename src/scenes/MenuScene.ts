import Phaser from "phaser";
import { ASSETS } from "../assets";
import { CONFIG } from "../config";
import { MENU, TUTORIAL } from "../phrases";
import { Button } from "../ui/Button";
import { setTutorialDone, setTutorialSkipped } from "../tutorial/tutorialStorage";

/** Title screen → popup gate: orientation (Day 0) vs jump straight to Day 1. */
export class MenuScene extends Phaser.Scene {
  private menuOpen = false;
  private promptBanner!: Phaser.GameObjects.Container;
  private modalLayer!: Phaser.GameObjects.Container;

  constructor() {
    super("menu");
  }

  create(): void {
    const c = CONFIG.colors;
    const cx = CONFIG.width / 2;
    const cy = CONFIG.height / 2;

    const titleKey = this.textures.exists(ASSETS.sprites.titleScreen.key)
      ? ASSETS.sprites.titleScreen.key
      : "fallback-title-screen";
    this.add.image(0, 0, titleKey).setOrigin(0).setDepth(0);

    const stripKey = this.textures.exists(ASSETS.sprites.stripWarn.key)
      ? ASSETS.sprites.stripWarn.key
      : "fallback-strip-warn";
    const stripH = 40;
    const stripBottomMargin = 44;
    const strip = this.add.image(0, 0, stripKey).setOrigin(0.5);
    const promptText = this.add
      .bitmapText(0, 0, CONFIG.font.key, MENU.prompt, CONFIG.font.sizeSm)
      .setTint(c.bg)
      .setOrigin(0.5);

    this.promptBanner = this.add
      .container(cx, CONFIG.height - stripBottomMargin - stripH / 2, [strip, promptText])
      .setDepth(10);

    this.tweens.add({
      targets: this.promptBanner,
      alpha: 0.55,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.modalLayer = this.buildModal(cx, cy);
    this.modalLayer.setVisible(false).setAlpha(0).setScale(0.92).setDepth(20);

    this.input.keyboard?.on("keydown-E", () => this.openMenu());
    this.input.keyboard?.on("keydown-ENTER", () => this.openMenu());
    this.input.keyboard?.on("keydown-SPACE", () => this.openMenu());
  }

  private buildModal(cx: number, cy: number): Phaser.GameObjects.Container {
    const c = CONFIG.colors;
    const panelW = 320;
    const panelH = 228;

    const scrim = this.add
      .rectangle(-CONFIG.width / 2, -CONFIG.height / 2, CONFIG.width, CONFIG.height, c.bg, 0.72)
      .setOrigin(0);

    const panel = this.add
      .rectangle(0, 0, panelW, panelH, c.panelDark, 0.97)
      .setStrokeStyle(2, c.warn)
      .setOrigin(0.5);
    const panelInner = this.add
      .rectangle(0, 0, panelW - 10, panelH - 10, c.panel, 0.35)
      .setStrokeStyle(1, c.grime)
      .setOrigin(0.5);

    const title = this.add
      .bitmapText(0, -panelH / 2 + 28, CONFIG.font.key, MENU.popupTitle, CONFIG.font.sizeLg)
      .setTint(c.text)
      .setOrigin(0.5);
    const subtitle = this.add
      .bitmapText(0, -panelH / 2 + 52, CONFIG.font.key, MENU.popupSubtitle, CONFIG.font.sizeSm)
      .setTint(c.warn)
      .setOrigin(0.5);
    const preview = this.add
      .bitmapText(0, -panelH / 2 + 72, CONFIG.font.key, TUTORIAL.losePreview, CONFIG.font.sizeSm)
      .setTint(c.textDim)
      .setOrigin(0.5)
      .setCenterAlign()
      .setMaxWidth(panelW - 36);

    const teachBtn = new Button(this, 0, 18, 240, 28, TUTORIAL.gateTeach, () => {
      this.scene.start("game", { mode: "day0" });
    });
    const skipBtn = new Button(this, 0, 54, 240, 28, TUTORIAL.gateSkip, () => {
      setTutorialSkipped();
      setTutorialDone();
      this.scene.start("game", { mode: "day1" });
    });

    const modal = this.add.container(cx, cy, [
      scrim,
      panel,
      panelInner,
      title,
      subtitle,
      preview,
      teachBtn.container,
      skipBtn.container,
    ]);

    scrim.setInteractive({ useHandCursor: false });
    return modal;
  }

  private openMenu(): void {
    if (this.menuOpen) return;
    this.menuOpen = true;

    this.tweens.killTweensOf(this.promptBanner);
    this.tweens.add({
      targets: this.promptBanner,
      alpha: 0,
      duration: 180,
      onComplete: () => this.promptBanner.setVisible(false),
    });

    this.modalLayer.setVisible(true);
    this.tweens.add({
      targets: this.modalLayer,
      alpha: 1,
      scale: 1,
      duration: 260,
      ease: "Back.easeOut",
    });
  }
}
