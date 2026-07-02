import { CONFIG, type ApplianceKey, type StatKey } from "../config";

export type ApplianceVisualState = "normal" | "cracked" | "blinking" | "dead";

/**
 * Pure gameplay model for one appliance. No Phaser here so the balance is easy
 * to reason about and unit-testable if we ever add tests.
 */
export class Appliance {
  readonly key: ApplianceKey;
  readonly label: string;
  readonly stat: StatKey;
  readonly critical: boolean;
  readonly maxHp: number;
  readonly passiveDecayPerSec: number;
  readonly useHpCost: number;
  readonly useActionLabel: string;

  hp: number;
  alive = true;
  plugged = true;
  /** Seconds of remaining "clean" decay-reduction buff. */
  cleanBuffSec = 0;
  /** Seconds of remaining clean cooldown. */
  cleanCooldownSec = 0;
  /** Seconds until this appliance can be cannibalized (anti-arbitrage). */
  scrapLockSec = 0;

  constructor(key: ApplianceKey) {
    const def = CONFIG.appliances[key];
    this.key = key;
    this.label = def.label;
    this.stat = def.stat;
    this.critical = def.critical;
    this.maxHp = def.maxHp;
    this.passiveDecayPerSec = def.passiveDecayPerSec;
    this.useHpCost = def.useHpCost;
    this.useActionLabel = def.useActionLabel;
    this.hp = def.startHp;
  }

  get hpFraction(): number {
    return this.hp / this.maxHp;
  }

  get visualState(): ApplianceVisualState {
    if (!this.alive) return "dead";
    const f = this.hpFraction;
    if (f >= CONFIG.hpStates.normal) return "normal";
    if (f >= CONFIG.hpStates.cracked) return "cracked";
    return "blinking";
  }

  /** Advance timers and passive decay. dt in seconds. */
  tick(dt: number): void {
    if (this.cleanCooldownSec > 0) this.cleanCooldownSec = Math.max(0, this.cleanCooldownSec - dt);
    if (this.scrapLockSec > 0) this.scrapLockSec = Math.max(0, this.scrapLockSec - dt);
    if (!this.alive) return;
    if (!this.plugged) return;

    let decay = this.passiveDecayPerSec;
    if (this.cleanBuffSec > 0) {
      decay *= CONFIG.actions.clean.decayReductionFactor;
      this.cleanBuffSec = Math.max(0, this.cleanBuffSec - dt);
    }
    this.damage(decay * dt);
  }

  damage(amount: number): void {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    if (this.hp <= 0) this.alive = false;
  }

  /** Use the appliance (eat/shower). Returns true if it worked. */
  use(): boolean {
    if (!this.alive || !this.plugged) return false;
    this.damage(this.useHpCost);
    return true;
  }

  repair(): void {
    this.alive = true;
    this.hp = this.maxHp * CONFIG.actions.repair.restoreToFraction;
  }

  unplug(): void {
    this.plugged = false;
  }

  plug(): void {
    this.plugged = true;
  }

  clean(): boolean {
    if (this.cleanCooldownSec > 0) return false;
    this.cleanCooldownSec = CONFIG.actions.clean.cooldownSec;
    this.cleanBuffSec = CONFIG.actions.clean.decayReductionSec;
    if (this.alive) {
      this.hp = Math.min(this.maxHp, this.hp + CONFIG.actions.clean.hpGain);
    }
    return true;
  }

  /** Parts yielded if scrapped right now (based on current HP). */
  scrapYield(): number {
    const f = this.hpFraction;
    for (const step of CONFIG.actions.cannibalize.curve) {
      if (f >= step.minHpFraction) return step.parts;
    }
    return 0;
  }

  canScrap(): boolean {
    return this.scrapLockSec <= 0;
  }
}
