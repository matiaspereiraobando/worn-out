import Phaser from "phaser";
import { ASSETS } from "../assets";
import { CONFIG } from "../config";

const BGM_STARTED = "bgmStarted";

/**
 * Invisible scene that owns the looping theme. Launched once from boot and kept
 * running so menu / game / game-over transitions never restart the music.
 */
export class MusicScene extends Phaser.Scene {
  private theme?: Phaser.Sound.BaseSound;

  constructor() {
    super({ key: "music", active: false, visible: false });
  }

  create(): void {
    if (this.registry.get(BGM_STARTED)) return;

    const key = ASSETS.music.theme.key;
    if (!this.cache.audio.exists(key)) return;

    this.theme = this.sound.add(key, {
      loop: true,
      volume: CONFIG.audio.musicVolume,
    });
    this.registry.set(BGM_STARTED, true);

    this.startTheme();
    this.bindAutoplayUnlock();
  }

  private startTheme(): void {
    if (!this.theme || this.theme.isPlaying) return;
    this.theme.play();
  }

  /** Browsers may block audio until the first user gesture. */
  private bindAutoplayUnlock(): void {
    if (!this.sound.locked) return;

    const unlock = () => {
      if (this.sound.locked) this.sound.unlock();
      this.startTheme();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
  }
}
