import Phaser from "phaser";
import { ASSETS } from "../assets";
import { CONFIG } from "../config";
import { Appliance } from "../model/Appliance";

const SPARK_TEX = "px-spark";
/** Above HUD (50-51) and event banner (55); below menus (1000). */
const FX_DEPTH = 60;

/** Renders one appliance as a world object (top-down, proximity-based). */
export class ApplianceView {
  readonly container: Phaser.GameObjects.Container;
  private readonly scene: Phaser.Scene;
  private readonly restX: number;
  private readonly restY: number;
  private readonly body: Phaser.GameObjects.Rectangle;
  private readonly sprite?: Phaser.GameObjects.Sprite;
  private readonly title: Phaser.GameObjects.BitmapText;
  private readonly hpBarBg: Phaser.GameObjects.Rectangle;
  private readonly hpBar: Phaser.GameObjects.Rectangle;
  private readonly hpText: Phaser.GameObjects.BitmapText;
  private readonly status: Phaser.GameObjects.BitmapText;
  private readonly plugIcon?: Phaser.GameObjects.Sprite;
  private readonly surgeIcon?: Phaser.GameObjects.Sprite;
  private readonly selectionRing: Phaser.GameObjects.Rectangle;
  private blinkT = 0;
  private surgeWarning = false;
  private surgeUrgency = 0;
  private surgePulseT = 0;
  private damageFlashT = 0;
  private shakeT = 0;

  static readonly W = 72;
  static readonly H = 72;
  private static readonly PLUG_OX = ApplianceView.W / 2 + 20;
  private static readonly PLUG_OY = 0;
  private static readonly SURGE_ICON_Y = -ApplianceView.H / 2 - 28;

  constructor(scene: Phaser.Scene, x: number, y: number, label: string, spriteKey?: string) {
    this.scene = scene;
    this.restX = x;
    this.restY = y;
    const W = ApplianceView.W;
    const H = ApplianceView.H;

    this.body = scene.add
      .rectangle(0, 0, W, H, CONFIG.colors.panel)
      .setStrokeStyle(2, CONFIG.colors.grime)
      .setOrigin(0.5);
    if (spriteKey && this.scene.textures.exists(spriteKey)) {
      this.sprite = scene.add.sprite(0, 0, spriteKey, 0).setDisplaySize(72, 72).setOrigin(0.5);
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
        .sprite(ApplianceView.PLUG_OX, ApplianceView.PLUG_OY, ASSETS.sprites.icons.key, 4)
        .setDisplaySize(32, 32)
        .setVisible(false);
      // World-space (not in container) so it can sit above the HUD / event banner.
      this.surgeIcon = scene.add
        .sprite(x, y + ApplianceView.SURGE_ICON_Y, ASSETS.sprites.icons.key, 6)
        .setDisplaySize(28, 28)
        .setOrigin(0.5)
        .setDepth(FX_DEPTH)
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
    return this.restX;
  }

  get worldY(): number {
    return this.restY;
  }

  setInRange(sel: boolean): void {
    this.selectionRing.setVisible(sel);
  }

  /** Telegraph a power surge on this machine during the countdown. urgency 0..1. */
  setSurgeWarning(active: boolean, urgency = 0): void {
    this.surgeWarning = active;
    this.surgeUrgency = Phaser.Math.Clamp(urgency, 0, 1);
    if (!active) {
      this.surgePulseT = 0;
      this.surgeIcon
        ?.setVisible(false)
        .setAlpha(1)
        .setScale(1)
        .setPosition(this.restX, this.restY + ApplianceView.SURGE_ICON_Y);
      this.plugIcon?.clearTint().setScale(1).setAlpha(1);
      // Keep damage-flash tint if a discharge is in progress.
      if (this.damageFlashT <= 0) this.sprite?.clearTint();
    }
  }

  /** Outlet always sparks; body sparks/flash/shake only when the machine is hit. */
  playSurgeDischarge(hitMachine: boolean): void {
    this.ensureSparkTexture();
    this.burstSparks(
      ApplianceView.PLUG_OX,
      ApplianceView.PLUG_OY,
      hitMachine ? 14 : 8,
      hitMachine ? 1 : 0.7,
    );
    if (hitMachine) {
      // Origins on the body silhouette; each edge sprays outward (not a center blob).
      const hx = ApplianceView.W / 2;
      const hy = ApplianceView.H / 2;
      this.burstSparks(0, 0, 18, 1.2);
      this.burstSparks(-hx, 0, 20, 1.4, 150, 210); // left → west
      this.burstSparks(hx, 0, 20, 1.4, -30, 30); // right → east
      this.burstSparks(0, -hy, 20, 1.4, 240, 300); // top → north
      this.burstSparks(0, hy, 20, 1.4, 60, 120); // bottom → south
      this.burstSparks(-hx, -hy, 12, 1.25, 180, 270); // NW corner
      this.burstSparks(hx, -hy, 12, 1.25, 270, 360); // NE corner
      this.burstSparks(-hx, hy, 12, 1.25, 90, 180); // SW corner
      this.burstSparks(hx, hy, 12, 1.25, 0, 90); // SE corner
      this.damageFlashT = 0.22;
      this.shakeT = 0.2;
    }
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
      this.setSurgeWarning(false);
      this.status.setText("EMPTY");
      this.status.setTint(CONFIG.colors.money);
      this.tickImpactFx(dt);
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
    if (appliance.washCooldownSec > 0) bits.push(`W${appliance.washCooldownSec.toFixed(0)}s`);
    if (appliance.scrapLockSec > 0) bits.push(`S${appliance.scrapLockSec.toFixed(0)}s`);
    this.status.setText(bits.join(" "));
    if (this.plugIcon) {
      this.plugIcon.setFrame(appliance.plugged ? 4 : 5);
      this.plugIcon.setVisible(true);
    }
    this.status.setTint(!appliance.alive ? CONFIG.colors.danger : CONFIG.colors.textDim);

    this.tickSurgeWarning(dt, appliance.plugged);
    this.tickImpactFx(dt);
  }

  private tickSurgeWarning(dt: number, plugged: boolean): void {
    if (!this.surgeWarning) return;

    this.surgePulseT += dt;
    // Base pulse ~3 Hz, ramps to ~10 Hz as urgency approaches 1 (last ~2s of warning).
    const rate = Phaser.Math.Linear(3, 10, this.surgeUrgency);
    const wave = (Math.sin(this.surgePulseT * rate * Math.PI * 2) + 1) * 0.5;

    if (this.surgeIcon) {
      this.surgeIcon.setVisible(true);
      this.surgeIcon.setPosition(this.restX, this.restY + ApplianceView.SURGE_ICON_Y - wave * 4);
      this.surgeIcon.setAlpha(0.55 + wave * 0.45);
      this.surgeIcon.setScale(0.9 + wave * 0.2);
    }

    // Outlet always pulses — threat is at the plug either way.
    if (this.plugIcon) {
      this.plugIcon.setTint(CONFIG.colors.danger);
      this.plugIcon.setScale(1 + wave * 0.18);
      this.plugIcon.setAlpha(0.65 + wave * 0.35);
    }

    // Body only pulses while plugged; unplugging clears it until they plug back in.
    if (this.damageFlashT > 0) return;
    if (plugged) {
      const tintMix = wave > 0.5 ? CONFIG.colors.danger : 0xffffff;
      if (this.sprite) this.sprite.setTint(tintMix);
      else this.body.setFillStyle(wave > 0.5 ? CONFIG.colors.danger : CONFIG.colors.panel);
    } else if (this.sprite) {
      this.sprite.clearTint();
    }
  }

  private tickImpactFx(dt: number): void {
    if (this.damageFlashT > 0) {
      this.damageFlashT -= dt;
      const hot = this.damageFlashT > 0.1;
      const tint = hot ? CONFIG.colors.text : CONFIG.colors.danger;
      if (this.sprite) this.sprite.setTint(tint);
      else this.body.setFillStyle(tint);
      if (this.damageFlashT <= 0) {
        this.sprite?.clearTint();
        if (!this.surgeWarning) this.body.setFillStyle(CONFIG.colors.panel);
      }
    }

    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const amp = 3;
      this.container.setPosition(
        this.restX + (Math.random() - 0.5) * amp * 2,
        this.restY + (Math.random() - 0.5) * amp * 2,
      );
      if (this.shakeT <= 0) this.container.setPosition(this.restX, this.restY);
    }
  }

  private ensureSparkTexture(): void {
    if (this.scene.textures.exists(SPARK_TEX)) return;
    const g = this.scene.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 2, 2);
    g.generateTexture(SPARK_TEX, 2, 2);
    g.destroy();
  }

  private burstSparks(
    localX: number,
    localY: number,
    count: number,
    intensity: number,
    angleMin = 0,
    angleMax = 360,
  ): void {
    const x = this.restX + localX;
    const y = this.restY + localY;
    const particles = this.scene.add.particles(x, y, SPARK_TEX, {
      speed: { min: 50 * intensity, max: 140 * intensity },
      angle: { min: angleMin, max: angleMax },
      scale: { start: 1.8 * intensity, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: { min: 180, max: 380 },
      gravityY: 220,
      tint: [CONFIG.colors.lamp, CONFIG.colors.warn, CONFIG.colors.text, CONFIG.colors.danger],
      emitting: false,
    });
    particles.setDepth(FX_DEPTH);
    particles.explode(count);
    this.scene.time.delayedCall(450, () => {
      if (particles.active) particles.destroy();
    });
  }
}
