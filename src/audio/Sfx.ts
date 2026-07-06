import Phaser from "phaser";
import { ASSETS } from "../assets";

/** Thin wrapper around Phaser sound playback for Worn Out. */
export class Sfx {
  private readonly scene: Phaser.Scene;
  private footsteps?: Phaser.Sound.BaseSound;
  private lowStats?: Phaser.Sound.BaseSound;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  destroy(): void {
    this.stopFootsteps();
    this.stopLowStats();
  }

  setFootsteps(active: boolean): void {
    this.setLoop(this.footsteps, ASSETS.sfx.footsteps.key, active, 0.35, (s) => {
      this.footsteps = s;
    });
  }

  setLowStats(active: boolean): void {
    this.setLoop(this.lowStats, ASSETS.sfx.lowStats.key, active, 0.5, (s) => {
      this.lowStats = s;
    });
  }

  playApplianceDead(): void {
    this.play(ASSETS.sfx.applianceDead.key);
  }

  playCannibalize(): void {
    this.play(ASSETS.sfx.cannibalize.key);
  }

  playClean(): void {
    this.play(ASSETS.sfx.clean.key);
  }

  playDoorbell(): void {
    this.play(ASSETS.sfx.doorbell.key);
  }

  playDoorKnock(): void {
    this.play(ASSETS.sfx.doorKnock.key);
  }

  playDoorSlam(): void {
    this.play(ASSETS.sfx.doorSlam.key);
  }

  playEat(): void {
    this.play(ASSETS.sfx.eat.key);
  }

  playGetCoin(): void {
    this.play(ASSETS.sfx.getCoin.key);
  }

  playGameOver(): void {
    this.play(ASSETS.sfx.gameOver.key);
  }

  playHikeWarning(): void {
    this.play(ASSETS.sfx.hikeWarning.key);
  }

  playPayCash(): void {
    this.play(ASSETS.sfx.payCash.key);
  }

  playPlugUnplug(): void {
    this.play(ASSETS.sfx.plugUnplug.key);
  }

  playRepair(): void {
    this.play(ASSETS.sfx.repair.key);
  }

  playShower(): void {
    this.play(ASSETS.sfx.shower.key);
  }

  playSurgeDodged(): void {
    this.play(ASSETS.sfx.surgeDodged.key);
  }

  playSurgeHit(): void {
    this.play(ASSETS.sfx.surgeHit.key);
  }

  playWarningBeep(): void {
    this.play(ASSETS.sfx.warningBeep.key);
  }

  playWashFail(): void {
    this.play(ASSETS.sfx.washFail.key);
  }

  playWashSuccess(): void {
    this.play(ASSETS.sfx.washSuccess.key);
  }

  private stopFootsteps(): void {
    this.footsteps?.stop();
  }

  private stopLowStats(): void {
    this.lowStats?.stop();
  }

  private setLoop(
    current: Phaser.Sound.BaseSound | undefined,
    key: string,
    active: boolean,
    volume: number,
    assign: (sound: Phaser.Sound.BaseSound) => void,
  ): void {
    if (!this.scene.cache.audio.exists(key)) return;

    if (active) {
      const sound = current ?? this.scene.sound.add(key, { loop: true, volume });
      if (!current) assign(sound);
      if (!sound.isPlaying) sound.play();
      return;
    }
    current?.stop();
  }

  private play(key: string, config?: Phaser.Types.Sound.SoundConfig): void {
    if (!this.scene.cache.audio.exists(key)) return;
    this.scene.sound.play(key, config);
  }
}
