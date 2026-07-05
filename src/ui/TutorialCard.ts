import Phaser from "phaser";
import { CONFIG } from "../config";
import { TUTORIAL } from "../phrases";

export interface TutorialCardOptions {
  showSkip?: boolean;
  onSkip?: () => void;
}

/** Right-side persistent panel for guided-shift beat instructions. */
export class TutorialCard {
  private readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.BitmapText;
  private readonly skipBg: Phaser.GameObjects.Rectangle;
  private readonly skipLabel: Phaser.GameObjects.BitmapText;
  private readonly restX: number;
  private readonly restY: number;
  private readonly hiddenX: number;
  private visible = false;
  private onSkip?: () => void;

  constructor(private readonly scene: Phaser.Scene) {
    const c = CONFIG.tutorialCard;
    this.restX = CONFIG.width - c.marginX - c.width / 2;
    this.restY =
      CONFIG.world.hudHeight +
      c.eventStripOffset +
      c.stripHeight / 2 +
      c.marginBelowEvent +
      c.height / 2;
    this.hiddenX = CONFIG.width + c.width / 2;

    this.bg = scene.add
      .rectangle(0, 0, c.width, c.height, CONFIG.colors.panelDark, c.bgAlpha)
      .setStrokeStyle(2, CONFIG.colors.warn)
      .setOrigin(0.5);

    this.label = scene.add
      .bitmapText(0, 0, CONFIG.font.key, "", CONFIG.font.sizeSm)
      .setTint(CONFIG.colors.text)
      .setOrigin(0, 0)
      .setLineSpacing(c.lineSpacing);

    this.skipBg = scene.add
      .rectangle(0, 0, c.skipW, 20, CONFIG.colors.panel)
      .setStrokeStyle(1, CONFIG.colors.grime)
      .setOrigin(0.5)
      .setVisible(false);
    this.skipLabel = scene.add
      .bitmapText(0, 0, CONFIG.font.key, TUTORIAL.skipLabel, CONFIG.font.sizeSm)
      .setTint(CONFIG.colors.textDim)
      .setOrigin(0.5)
      .setVisible(false);

    this.skipBg.setInteractive({ useHandCursor: true });
    this.skipBg.on("pointerover", () => this.skipBg.setFillStyle(CONFIG.colors.grime));
    this.skipBg.on("pointerout", () => this.skipBg.setFillStyle(CONFIG.colors.panel));
    this.skipBg.on("pointerdown", () => this.onSkip?.());

    this.container = scene.add
      .container(this.hiddenX, this.restY, [this.bg, this.label, this.skipBg, this.skipLabel])
      .setDepth(c.depth)
      .setVisible(false)
      .setAlpha(0);
  }

  show(msg: string, opts?: TutorialCardOptions): void {
    const c = CONFIG.tutorialCard;
    this.onSkip = opts?.onSkip;
    const showSkip = opts?.showSkip ?? false;

    this.killTweens();
    this.skipBg.setVisible(showSkip);
    this.skipLabel.setVisible(showSkip);
    this.layoutText(msg, showSkip);

    this.container.setVisible(true);
    this.container.setAlpha(0);
    this.visible = true;
    this.container.x = this.hiddenX;

    this.scene.tweens.add({
      targets: this.container,
      x: this.restX,
      alpha: 1,
      duration: c.slideMs,
      ease: "Quad.easeOut",
    });
  }

  dismiss(): void {
    if (!this.visible) return;
    this.onSkip = undefined;
    this.skipBg.setVisible(false);
    this.skipLabel.setVisible(false);

    const c = CONFIG.tutorialCard;
    this.killTweens();
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: c.fadeOutMs,
      onComplete: () => {
        this.container.setVisible(false);
        this.visible = false;
      },
    });
  }

  isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.killTweens();
    this.container.destroy(true);
  }

  private layoutText(msg: string, showSkip: boolean): void {
    const c = CONFIG.tutorialCard;
    const innerW = c.width - c.textPad * 2;
    const skipGap = 6;
    const textW = showSkip ? innerW - c.skipW - skipGap : innerW;

    this.label.setMaxWidth(textW);
    this.label.setText(msg);

    const left = -c.width / 2 + c.textPad;
    const top = -c.height / 2 + c.textPad;
    this.label.setPosition(left, top);

    if (showSkip) {
      const skipX = c.width / 2 - c.textPad - c.skipW / 2;
      const skipY = c.height / 2 - c.textPad - 10;
      this.skipBg.setPosition(skipX, skipY);
      this.skipLabel.setPosition(skipX, skipY);
    }
  }

  private killTweens(): void {
    this.scene.tweens.killTweensOf(this.container);
  }
}
