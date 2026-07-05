import type { ApplianceKey } from "../config";
import { CONFIG } from "../config";
import { TUTORIAL } from "../phrases";
import type { TutorialCardOptions } from "../ui/TutorialCard";

export type HudBarTarget = "hunger" | "hygiene" | "debt";

export interface TutorialHooks {
  showCard(msg: string, opts?: TutorialCardOptions): void;
  dismissCard(): void;
  pulseHudBar(target: HudBarTarget): void;
  pulseAppliance(key: ApplianceKey): void;
  spawnCoinNearPlayer(): void;
  scriptTutorialFridgeDamage(): void;
  setReceiptTutorialNote(note: string | null): void;
  setControlHintsVisible(visible: boolean): void;
  triggerTutorialBill(): void;
  transitionToDay1(): void;
}

/** Day 0 beat indices: 7 = receipt; 9 = farewell before Day 1. */
export type TutorialBeat = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * Orchestrates Day 0 orientation.
 * Safe mode: no events/vendor; world pauses on action beats; scripted first bill.
 */
export class TutorialManager {
  private active = false;
  private beat: TutorialBeat = 0;
  private beatTimer = 0;
  private playerMoved = false;

  constructor(private readonly hooks: TutorialHooks) {}

  isActive(): boolean {
    return this.active;
  }

  /** Pause sim clocks while the player completes the current beat. */
  shouldPauseWorld(): boolean {
    if (!this.active) return false;
    if (this.beat === 0 || this.beat === 7) return false;
    return true;
  }

  start(): void {
    this.active = true;
    this.beat = 0;
    this.beatTimer = 0;
    this.playerMoved = false;
    this.hooks.setControlHintsVisible(false);
    this.enterBeat(0);
  }

  skip(): void {
    if (!this.active) return;
    this.hooks.transitionToDay1();
  }

  tick(dt: number): void {
    if (!this.active) return;
    this.beatTimer += dt;

    const t = CONFIG.tutorial;

    if (this.beat === 0 && (this.playerMoved || this.beatTimer >= t.beat0MaxSec)) {
      this.goToBeat(1);
    } else if (this.beat === 6 && this.beatTimer >= t.beat6HoldSec) {
      this.hooks.dismissCard();
      this.beat = 7;
      this.beatTimer = 0;
      this.hooks.triggerTutorialBill();
    } else if (this.beat === 8 && this.beatTimer >= t.beat8HoldSec) {
      this.goToBeat(9);
    } else if (this.beat === 9 && this.beatTimer >= t.beat9HoldSec) {
      this.active = false;
      this.hooks.transitionToDay1();
    }
  }

  onPlayerMoved(): void {
    if (!this.active || this.beat !== 0) return;
    this.playerMoved = true;
  }

  onApplianceMenuOpen(key: ApplianceKey): void {
    if (!this.active) return;
    if (this.beat === 1 && key === "fridge") {
      this.goToBeat(2);
    } else if (this.beat === 2 && key === "fridge") {
      this.showBeatCard(2);
    } else if (this.beat === 3 && key === "fridge") {
      this.showBeatCard(3);
    } else if (this.beat === 5 && key === "heater") {
      this.showBeatCard(5);
      this.hooks.pulseAppliance("heater");
    }
  }

  onUse(key: ApplianceKey): void {
    if (!this.active) return;
    if (this.beat === 2 && key === "fridge") {
      this.hooks.scriptTutorialFridgeDamage();
      this.goToBeat(3);
    } else if (this.beat === 5 && key === "heater") {
      this.goToBeat(6);
    }
  }

  onRepair(key: ApplianceKey): void {
    if (!this.active || this.beat !== 3 || key !== "fridge") return;
    this.goToBeat(4);
  }

  onPickup(): void {
    if (!this.active || this.beat !== 4) return;
    this.goToBeat(5);
  }

  onBillReceiptOpen(): void {
    if (!this.active || this.beat !== 7) return;
    this.hooks.dismissCard();
    this.hooks.setReceiptTutorialNote(TUTORIAL.receiptNote);
  }

  onBillReceiptClose(): void {
    if (!this.active || this.beat !== 7) return;
    this.hooks.setReceiptTutorialNote(null);
    this.goToBeat(8);
  }

  private goToBeat(next: TutorialBeat): void {
    this.hooks.dismissCard();
    this.beat = next;
    this.beatTimer = 0;
    if (next === 7) return;
    this.enterBeat(next);
  }

  private enterBeat(id: TutorialBeat): void {
    switch (id) {
      case 0:
        this.showBeatCard(0);
        this.hooks.pulseHudBar("hunger");
        this.hooks.pulseHudBar("hygiene");
        break;
      case 1:
        this.showBeatCard(1);
        this.hooks.pulseAppliance("fridge");
        break;
      case 2:
        this.showBeatCard(2);
        break;
      case 3:
        this.showBeatCard(3);
        break;
      case 4:
        this.showBeatCard(4);
        this.hooks.spawnCoinNearPlayer();
        break;
      case 5:
        this.showBeatCard(5);
        this.hooks.pulseAppliance("heater");
        break;
      case 6:
        this.showBeatCard(6);
        this.hooks.pulseHudBar("debt");
        break;
      case 8:
        this.showBeatCard(8);
        break;
      case 9:
        this.hooks.showCard(TUTORIAL.complete, { showSkip: false });
        break;
      default:
        break;
    }
  }

  private showBeatCard(id: keyof typeof TUTORIAL.beats): void {
    this.hooks.showCard(TUTORIAL.beats[id], {
      showSkip: true,
      onSkip: () => this.skip(),
    });
  }
}
