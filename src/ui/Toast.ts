import Phaser from "phaser";
import { CONFIG } from "../config";

/** Full-width bottom toast for transient game log lines. */
export class Toast {
  private readonly container: Phaser.GameObjects.Container;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.BitmapText;
  private readonly restY: number;
  private readonly hiddenY: number;
  private visible = false;
  private suppressed = false;

  constructor(private readonly scene: Phaser.Scene) {
    const t = CONFIG.toast;
    this.restY = CONFIG.height - t.marginBottom - t.height / 2;
    this.hiddenY = CONFIG.height + 20 + t.height / 2;

    this.bg = scene.add
      .rectangle(0, 0, t.width, t.height, CONFIG.colors.panel, t.bgAlpha)
      .setStrokeStyle(2, CONFIG.colors.grime)
      .setOrigin(0.5);

    this.label = scene.add
      .bitmapText(0, 0, CONFIG.font.key, "", CONFIG.font.sizeSm)
      .setTint(CONFIG.colors.text)
      .setOrigin(0.5);

    this.container = scene.add
      .container(CONFIG.width / 2, this.hiddenY, [this.bg, this.label])
      .setDepth(t.depth)
      .setVisible(false)
      .setAlpha(0);
  }

  show(msg: string): void {
    if (this.suppressed) return;

    const t = CONFIG.toast;
    this.killTweens();
    this.label.setText(msg);

    this.container.setVisible(true);
    this.container.setAlpha(1);
    this.visible = true;

    this.container.y = this.hiddenY;
    this.scene.tweens.add({
      targets: this.container,
      y: this.restY,
      duration: t.slideMs,
      ease: "Quad.easeOut",
      onComplete: () => this.scheduleFadeOut(),
    });
  }

  dismiss(): void {
    if (!this.visible) return;
    this.fadeOut();
  }

  isVisible(): boolean {
    return this.visible;
  }

  /** Hide toast while bill receipt modal is open. */
  setSuppressed(suppressed: boolean): void {
    this.suppressed = suppressed;
    if (suppressed) {
      this.killTweens();
      this.container.setVisible(false);
      this.container.setAlpha(0);
      this.visible = false;
    }
  }

  destroy(): void {
    this.killTweens();
    this.container.destroy(true);
  }

  private scheduleFadeOut(): void {
    const t = CONFIG.toast;
    this.killTweens();
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      delay: t.holdMs,
      duration: t.fadeOutMs,
      onComplete: () => {
        this.container.setVisible(false);
        this.visible = false;
      },
    });
  }

  private fadeOut(): void {
    const t = CONFIG.toast;
    this.killTweens();
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: t.fadeOutMs,
      onComplete: () => {
        this.container.setVisible(false);
        this.visible = false;
      },
    });
  }

  private killTweens(): void {
    this.scene.tweens.killTweensOf(this.container);
  }
}
