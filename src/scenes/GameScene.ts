import Phaser from "phaser";
import { CONFIG, type ApplianceKey } from "../config";
import { Appliance } from "../model/Appliance";
import { ApplianceView } from "../ui/ApplianceView";
import { Button } from "../ui/Button";
import { PHRASES } from "../phrases";

type GameOverCause = "hunger" | "hygiene" | "debt" | "uninhabitable";

export interface RunResult {
  cause: GameOverCause;
  causeText: string;
  rawScore: number;
  mult: number;
  archetypeLabel: string;
  finalScore: number;
  billsPaid: number;
  newApplianceValue: number;
  debt: number;
  days: number;
  meals: number;
  showers: number;
  repairs: number;
  cleans: number;
  scraps: number;
  buys: number;
  unplugs: number;
  failedUnplugs: number;
}

interface Pickup {
  arc: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  value: number;
  active: boolean;
  respawnIn: number;
}

interface ActiveEvent {
  type: "surge" | "hike";
  warningLeft: number;
  targetKey?: ApplianceKey;
  mitigated: boolean;
}

export class GameScene extends Phaser.Scene {
  private readonly order: ApplianceKey[] = ["fridge", "heater"];

  private appliances!: Record<ApplianceKey, Appliance | null>;
  private views!: Record<ApplianceKey, ApplianceView>;
  private selected = 0;

  // Resources & score tracking
  private money = 0;
  private parts = 0;
  private debt = 0;
  private billsPaid = 0;
  private newApplianceValue = 0;

  // Stats
  private hunger = 0;
  private hygiene = 0;

  // Counters
  private meals = 0;
  private showers = 0;
  private repairs = 0;
  private cleans = 0;
  private scraps = 0;
  private buys = 0;
  private unplugs = 0;
  private failedUnplugs = 0;
  private days = 0;

  // Clocks
  private dayTimer = 0;
  private nextEventIn = 0;
  private nextVendorIn = 0;
  private nextBillMultiplier = 1;

  private activeEvent: ActiveEvent | null = null;

  private vendorState: "idle" | "warning" | "open" = "idle";
  private vendorTimer = 0;
  private paused = false;
  private gameEnded = false;

  private pickups: Pickup[] = [];

  // UI refs
  private hungerBar!: Phaser.GameObjects.Rectangle;
  private hygieneBar!: Phaser.GameObjects.Rectangle;
  private hungerText!: Phaser.GameObjects.Text;
  private hygieneText!: Phaser.GameObjects.Text;
  private hudText!: Phaser.GameObjects.Text;
  private dayText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private eventBanner!: Phaser.GameObjects.Container;
  private eventText!: Phaser.GameObjects.Text;
  private mitigateBtn!: Button;
  private vendorBanner!: Phaser.GameObjects.Container;
  private vendorText!: Phaser.GameObjects.Text;
  private vendorBuyBtn!: Button;
  private vendorCloseBtn!: Button;

  private btnUse!: Button;
  private btnRepair!: Button;
  private btnClean!: Button;
  private btnScrap!: Button;
  private btnBuy!: Button;

  constructor() {
    super("game");
  }

  create(): void {
    this.resetState();
    this.buildBackground();
    this.buildHud();
    this.buildAppliances();
    this.buildActionMenu();
    this.buildEventBanner();
    this.buildVendorBanner();
    this.buildLog();
    this.buildPickups();
    this.bindKeys();

    this.selectAppliance(0);
    this.log(PHRASES.intro);
    this.refreshHud();
    this.refreshActionMenu();
  }

  private resetState(): void {
    this.appliances = {
      fridge: new Appliance("fridge"),
      heater: new Appliance("heater"),
    };
    this.money = CONFIG.start.money;
    this.parts = CONFIG.start.parts;
    this.debt = 0;
    this.billsPaid = 0;
    this.newApplianceValue = 0;
    this.hunger = CONFIG.stats.hunger.start;
    this.hygiene = CONFIG.stats.hygiene.start;
    this.meals = this.showers = this.repairs = this.cleans = 0;
    this.scraps = this.buys = this.unplugs = this.failedUnplugs = this.days = 0;
    this.dayTimer = CONFIG.bills.dayLengthSec;
    this.nextEventIn = CONFIG.events.firstEventDelaySec;
    this.nextVendorIn = Phaser.Math.Between(
      CONFIG.vendor.minIntervalSec,
      CONFIG.vendor.maxIntervalSec,
    );
    this.nextBillMultiplier = 1;
    this.activeEvent = null;
    this.vendorState = "idle";
    this.vendorTimer = 0;
    this.paused = false;
    this.gameEnded = false;
    this.pickups = [];
    this.selected = 0;
  }

  // ---------- BUILD ----------

  private buildBackground(): void {
    const c = CONFIG.colors;
    this.add.rectangle(0, 0, CONFIG.width, CONFIG.height, c.bg).setOrigin(0);
    // Floor band where coins spawn.
    this.add
      .rectangle(0, 415, CONFIG.width, CONFIG.height - 415, c.panelDark)
      .setOrigin(0)
      .setAlpha(0.6);
    this.add
      .text(CONFIG.width / 2, 92, "— apartment —", {
        fontFamily: "Courier New, monospace",
        fontSize: "12px",
        color: "#6b6858",
      })
      .setOrigin(0.5);
  }

  private buildHud(): void {
    const c = CONFIG.colors;
    this.add.rectangle(0, 0, CONFIG.width, 78, c.panel).setOrigin(0);
    this.add.rectangle(0, 78, CONFIG.width, 2, c.grime).setOrigin(0);

    const barW = 200;
    const mkBar = (x: number, y: number, label: string, color: number) => {
      this.add.text(x, y - 16, label, {
        fontFamily: "Courier New, monospace",
        fontSize: "13px",
        color: "#e8e4d0",
      });
      this.add
        .rectangle(x, y, barW, 16, c.panelDark)
        .setStrokeStyle(1, c.grime)
        .setOrigin(0, 0.5);
      const bar = this.add.rectangle(x + 1, y, barW - 2, 14, color).setOrigin(0, 0.5);
      const txt = this.add
        .text(x + barW / 2, y, "", {
          fontFamily: "Courier New, monospace",
          fontSize: "11px",
          color: "#14140f",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      return { bar, txt };
    };

    const h1 = mkBar(20, 34, "HUNGER", c.hunger);
    this.hungerBar = h1.bar;
    this.hungerText = h1.txt;
    const h2 = mkBar(250, 34, "HYGIENE", c.hygiene);
    this.hygieneBar = h2.bar;
    this.hygieneText = h2.txt;

    this.hudText = this.add.text(500, 12, "", {
      fontFamily: "Courier New, monospace",
      fontSize: "14px",
      color: "#e8e4d0",
      lineSpacing: 4,
    });
    this.dayText = this.add
      .text(CONFIG.width - 14, 12, "", {
        fontFamily: "Courier New, monospace",
        fontSize: "14px",
        color: "#c9b458",
        align: "right",
      })
      .setOrigin(1, 0);
  }

  private buildAppliances(): void {
    const y = 250;
    const xs = [280, 680];
    this.views = {} as Record<ApplianceKey, ApplianceView>;
    this.order.forEach((key, i) => {
      const def = CONFIG.appliances[key];
      const view = new ApplianceView(this, xs[i], y, def.label);
      view.bodyRect.setInteractive({ useHandCursor: true });
      view.bodyRect.on("pointerdown", () => this.selectAppliance(i));
      this.views[key] = view;
    });
  }

  private buildActionMenu(): void {
    const y = 470;
    const startX = 150;
    const gap = 132;
    const w = 124;
    const h = 34;
    this.btnUse = new Button(this, startX, y, w, h, "Use", () => this.doUse());
    this.btnRepair = new Button(this, startX + gap, y, w, h, "Repair", () => this.doRepair());
    this.btnClean = new Button(this, startX + gap * 2, y, w, h, "Clean", () => this.doClean());
    this.btnScrap = new Button(this, startX + gap * 3, y, w, h, "Cannibalize", () =>
      this.doCannibalize(),
    );
    this.btnBuy = new Button(this, startX + gap * 4, y, w, h, "Buy New", () => this.doBuyNew());

    this.add
      .text(CONFIG.width / 2, y + 30, "click a machine to select · keys: E use  R repair  L clean  C scrap  B buy  D unplug", {
        fontFamily: "Courier New, monospace",
        fontSize: "11px",
        color: "#6b6858",
      })
      .setOrigin(0.5);
  }

  private buildEventBanner(): void {
    const c = CONFIG.colors;
    const bg = this.add
      .rectangle(0, 0, 560, 40, c.panelDark)
      .setStrokeStyle(2, c.danger)
      .setOrigin(0.5);
    this.eventText = this.add
      .text(-250, 0, "", {
        fontFamily: "Courier New, monospace",
        fontSize: "14px",
        color: "#d23b2e",
      })
      .setOrigin(0, 0.5);
    this.mitigateBtn = new Button(this, 210, 0, 120, 28, "Unplug (D)", () => this.mitigateSurge());
    this.eventBanner = this.add
      .container(CONFIG.width / 2, 116, [bg, this.eventText, this.mitigateBtn.container])
      .setVisible(false);
  }

  private buildVendorBanner(): void {
    const c = CONFIG.colors;
    const bg = this.add
      .rectangle(0, 0, 620, 44, c.panelDark)
      .setStrokeStyle(2, c.money)
      .setOrigin(0.5);
    this.vendorText = this.add
      .text(-290, 0, "", {
        fontFamily: "Courier New, monospace",
        fontSize: "14px",
        color: "#c9b458",
      })
      .setOrigin(0, 0.5);
    this.vendorBuyBtn = new Button(
      this,
      150,
      0,
      150,
      30,
      "Buy parts",
      () => this.buyFromVendor(),
    );
    this.vendorCloseBtn = new Button(this, 250, 0, 90, 30, "Close", () => this.closeVendor());
    this.vendorBanner = this.add
      .container(CONFIG.width / 2, 158, [
        bg,
        this.vendorText,
        this.vendorBuyBtn.container,
        this.vendorCloseBtn.container,
      ])
      .setVisible(false);
  }

  private buildLog(): void {
    this.logText = this.add
      .text(CONFIG.width / 2, CONFIG.height - 24, "", {
        fontFamily: "Courier New, monospace",
        fontSize: "14px",
        color: "#9a9680",
        align: "center",
        wordWrap: { width: CONFIG.width - 60 },
      })
      .setOrigin(0.5);
  }

  private buildPickups(): void {
    for (let i = 0; i < CONFIG.pickups.count; i++) {
      const arc = this.add.circle(0, 0, 11, CONFIG.colors.money).setStrokeStyle(2, 0x8a7a2e);
      const label = this.add
        .text(0, 0, "$", {
          fontFamily: "Courier New, monospace",
          fontSize: "12px",
          color: "#14140f",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      const pickup: Pickup = { arc, label, value: 0, active: false, respawnIn: 0 };
      arc.setInteractive({ useHandCursor: true });
      arc.on("pointerdown", () => this.collectPickup(pickup));
      this.pickups.push(pickup);
      this.spawnPickup(pickup);
    }
  }

  private bindKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.on("keydown-ONE", () => this.selectAppliance(0));
    kb.on("keydown-TWO", () => this.selectAppliance(1));
    kb.on("keydown-E", () => this.doUse());
    kb.on("keydown-R", () => this.doRepair());
    kb.on("keydown-L", () => this.doClean());
    kb.on("keydown-C", () => this.doCannibalize());
    kb.on("keydown-B", () => this.doBuyNew());
    kb.on("keydown-D", () => this.mitigateSurge());
  }

  // ---------- SELECTION & ACTIONS ----------

  private get selectedKey(): ApplianceKey {
    return this.order[this.selected];
  }

  private selectAppliance(index: number): void {
    this.selected = Phaser.Math.Clamp(index, 0, this.order.length - 1);
    this.order.forEach((key, i) => this.views[key].setSelected(i === this.selected));
    this.refreshActionMenu();
  }

  private doUse(): void {
    if (this.gameEnded || this.paused) return;
    const a = this.appliances[this.selectedKey];
    if (!a || !a.alive) return;
    a.use();
    if (a.stat === "hunger") {
      this.hunger = Math.min(CONFIG.stats.hunger.max, this.hunger + CONFIG.stats.hunger.restoreOnUse);
      this.meals++;
    } else {
      this.hygiene = Math.min(
        CONFIG.stats.hygiene.max,
        this.hygiene + CONFIG.stats.hygiene.restoreOnUse,
      );
      this.showers++;
    }
    this.log(PHRASES.onUse);
    this.refreshActionMenu();
  }

  private doRepair(): void {
    if (this.gameEnded || this.paused) return;
    const a = this.appliances[this.selectedKey];
    if (!a) return;
    if (this.parts < CONFIG.actions.repair.partsCost) {
      this.log("Not enough parts to repair. Scrap something or wait for Don José.");
      return;
    }
    this.parts -= CONFIG.actions.repair.partsCost;
    a.repair();
    this.repairs++;
    this.log(PHRASES.onRepair);
    this.refreshHud();
    this.refreshActionMenu();
  }

  private doClean(): void {
    if (this.gameEnded || this.paused) return;
    const a = this.appliances[this.selectedKey];
    if (!a) return;
    if (this.money < CONFIG.actions.clean.moneyCost) {
      this.log("No money for cleaning supplies.");
      return;
    }
    if (!a.clean()) {
      this.log("Still on cleaning cooldown.");
      return;
    }
    this.money -= CONFIG.actions.clean.moneyCost;
    this.cleans++;
    this.log(a.alive ? PHRASES.onClean : PHRASES.onCleanDead);
    this.refreshHud();
    this.refreshActionMenu();
  }

  private doCannibalize(): void {
    if (this.gameEnded || this.paused) return;
    const key = this.selectedKey;
    const a = this.appliances[key];
    if (!a) return;
    if (!a.canScrap()) {
      this.log("Too new to scrap — the warranty is watching.");
      return;
    }
    const yielded = a.scrapYield();
    this.parts += yielded;
    this.scraps++;
    this.appliances[key] = null;

    const other = this.order.find((k) => k !== key && this.appliances[k]);
    if (other) {
      this.log(PHRASES.onCannibalize(a.label, this.appliances[other]!.label) + ` (+${yielded} parts)`);
    } else {
      this.log(PHRASES.onCannibalizeSolo(a.label) + ` (+${yielded} parts)`);
    }
    this.refreshHud();
    this.refreshActionMenu();
    this.checkGameOver();
  }

  private doBuyNew(): void {
    if (this.gameEnded || this.paused) return;
    const key = this.selectedKey;
    if (this.appliances[key]) return; // slot occupied
    const price = CONFIG.actions.buyNew.price;
    if (this.money < price) {
      this.log("Can't afford a new one. The system prefers it that way.");
      return;
    }
    this.money -= price;
    const fresh = new Appliance(key);
    fresh.scrapLockSec = CONFIG.actions.buyNew.scrapLockSec;
    this.appliances[key] = fresh;
    this.buys++;
    this.newApplianceValue += price;
    this.log(PHRASES.onBuyNew);
    this.refreshHud();
    this.refreshActionMenu();
  }

  // ---------- PICKUPS ----------

  private spawnPickup(p: Pickup): void {
    p.value = Phaser.Math.Between(CONFIG.pickups.minValue, CONFIG.pickups.maxValue);
    const x = Phaser.Math.Between(60, CONFIG.width - 60);
    const y = Phaser.Math.Between(445, CONFIG.height - 70);
    p.arc.setPosition(x, y).setVisible(true);
    p.label.setPosition(x, y).setText(`$${p.value}`).setVisible(true);
    p.active = true;
  }

  private collectPickup(p: Pickup): void {
    if (!p.active || this.gameEnded || this.paused) return;
    this.money += p.value;
    p.active = false;
    p.arc.setVisible(false);
    p.label.setVisible(false);
    p.respawnIn = Phaser.Math.Between(CONFIG.pickups.respawnMinSec, CONFIG.pickups.respawnMaxSec);
    this.refreshHud();
  }

  // ---------- MAIN LOOP ----------

  update(_time: number, deltaMs: number): void {
    if (this.gameEnded) return;
    const dtReal = deltaMs / 1000;
    this.tickVendor(dtReal);
    const dt = this.paused ? 0 : dtReal;

    if (dt > 0) {
      this.tickStats(dt);
      this.tickAppliances(dt);
      this.tickPickups(dt);
      this.tickBill(dt);
      this.tickEvents(dt);
    }

    this.order.forEach((key) => this.views[key].update(this.appliances[key], dtReal));
    this.refreshHud();
    if (dt > 0) this.checkGameOver();
  }

  private tickStats(dt: number): void {
    const h = CONFIG.stats.hunger;
    let hungerDecay = h.decayPerSec;
    if (!this.appliances.fridge?.alive) hungerDecay += h.deadPenaltyPerSec;
    this.hunger = Math.max(0, this.hunger - hungerDecay * dt);

    const g = CONFIG.stats.hygiene;
    let hygDecay = g.decayPerSec;
    if (!this.appliances.heater?.alive) hygDecay += g.deadPenaltyPerSec;
    this.hygiene = Math.max(0, this.hygiene - hygDecay * dt);
  }

  private tickAppliances(dt: number): void {
    this.order.forEach((key) => this.appliances[key]?.tick(dt));
  }

  private tickPickups(dt: number): void {
    for (const p of this.pickups) {
      if (p.active) continue;
      p.respawnIn -= dt;
      if (p.respawnIn <= 0) this.spawnPickup(p);
    }
  }

  private tickBill(dt: number): void {
    this.dayTimer -= dt;
    if (this.dayTimer <= 0) {
      this.dayTimer += CONFIG.bills.dayLengthSec;
      this.chargeBill();
    }
  }

  private chargeBill(): void {
    const b = CONFIG.bills;
    const fridgeBroken = !this.appliances.fridge?.alive;
    const heaterBroken = !this.appliances.heater?.alive;
    let total: number = b.rent;
    total += b.electricity;
    total += heaterBroken ? Math.round(b.water * b.brokenMultiplier) : b.water;
    total += fridgeBroken ? Math.round(b.food * b.brokenMultiplier) : b.food;
    total = Math.round(total * this.nextBillMultiplier);
    this.nextBillMultiplier = 1;
    this.days++;

    if (this.money >= total) {
      this.money -= total;
      this.billsPaid += total;
      this.log(PHRASES.onBill(total));
    } else {
      const shortfall = total - this.money;
      this.billsPaid += this.money;
      this.money = 0;
      this.debt += shortfall;
      this.log(PHRASES.onBill(total) + " " + PHRASES.onDebt);
    }
    this.flashBills();
    this.refreshHud();
  }

  // ---------- EVENTS ----------

  private tickEvents(dt: number): void {
    if (this.activeEvent) {
      this.activeEvent.warningLeft -= dt;
      if (this.activeEvent.warningLeft <= 0) this.resolveEvent();
      else this.updateEventBanner();
      return;
    }
    this.nextEventIn -= dt;
    if (this.nextEventIn <= 0) this.startEvent();
  }

  private startEvent(): void {
    const isSurge = Math.random() < 0.5;
    if (isSurge) {
      const alive = this.order.filter((k) => this.appliances[k]?.alive);
      const target = alive.length ? Phaser.Utils.Array.GetRandom(alive) : undefined;
      this.activeEvent = {
        type: "surge",
        warningLeft: CONFIG.events.powerSurge.warningSec,
        targetKey: target,
        mitigated: false,
      };
      this.log(PHRASES.onSurgeWarning);
    } else {
      this.activeEvent = {
        type: "hike",
        warningLeft: CONFIG.events.priceHike.warningSec,
        mitigated: false,
      };
      this.log(PHRASES.onPriceHike);
    }
    this.eventBanner.setVisible(true);
    this.updateEventBanner();
  }

  private updateEventBanner(): void {
    if (!this.activeEvent) return;
    const t = Math.ceil(this.activeEvent.warningLeft);
    if (this.activeEvent.type === "surge") {
      const target = this.activeEvent.targetKey
        ? CONFIG.appliances[this.activeEvent.targetKey].label
        : "a machine";
      this.eventText.setText(`⚡ POWER SURGE → ${target} in ${t}s`);
      this.mitigateBtn.setVisible(true).setEnabled(!this.activeEvent.mitigated);
    } else {
      this.eventText.setText(`💲 PRICE HIKE → next bill ×${CONFIG.events.priceHike.billMultiplier} in ${t}s`);
      this.mitigateBtn.setVisible(false);
    }
  }

  private mitigateSurge(): void {
    if (!this.activeEvent || this.activeEvent.type !== "surge" || this.activeEvent.mitigated) return;
    this.activeEvent.mitigated = true;
    this.unplugs++;
    this.log(PHRASES.onSurgeMitigated);
    this.updateEventBanner();
  }

  private resolveEvent(): void {
    const ev = this.activeEvent;
    if (!ev) return;
    if (ev.type === "surge") {
      if (!ev.mitigated) {
        this.failedUnplugs++;
        const target = ev.targetKey ? this.appliances[ev.targetKey] : null;
        if (target?.alive) {
          target.damage(target.maxHp * CONFIG.events.powerSurge.hpLossFraction);
          this.log(PHRASES.onSurgeHit);
        }
      }
    } else {
      this.nextBillMultiplier *= CONFIG.events.priceHike.billMultiplier;
    }
    this.activeEvent = null;
    this.eventBanner.setVisible(false);
    this.nextEventIn = CONFIG.events.minCooldownSec + Phaser.Math.Between(0, 10);
    this.checkGameOver();
  }

  // ---------- VENDOR ----------

  private tickVendor(dtReal: number): void {
    if (this.gameEnded) return;
    if (this.vendorState === "idle") {
      this.nextVendorIn -= dtReal;
      if (this.nextVendorIn <= 0) {
        this.vendorState = "warning";
        this.vendorTimer = CONFIG.vendor.warningSec;
        this.log(PHRASES.onVendorWarning);
      }
    } else if (this.vendorState === "warning") {
      this.vendorTimer -= dtReal;
      this.vendorBanner.setVisible(true);
      this.vendorText.setText(`🔔 Don José in ${Math.ceil(this.vendorTimer)}s...`);
      this.vendorBuyBtn.setVisible(false);
      this.vendorCloseBtn.setVisible(false);
      if (this.vendorTimer <= 0) this.openVendor();
    } else if (this.vendorState === "open") {
      this.vendorTimer -= dtReal;
      this.vendorBuyBtn.setVisible(true).setEnabled(this.money >= CONFIG.vendor.partsPrice);
      this.vendorCloseBtn.setVisible(true);
      this.vendorText.setText(
        `Don José: ${CONFIG.vendor.partsBundle} parts for $${CONFIG.vendor.partsPrice}.  (leaves in ${Math.ceil(this.vendorTimer)}s)`,
      );
      if (this.vendorTimer <= 0) {
        this.log(PHRASES.onVendorLeave);
        this.closeVendor();
      }
    }
  }

  private openVendor(): void {
    this.vendorState = "open";
    this.vendorTimer = CONFIG.vendor.stayOpenSec;
    this.paused = true; // global timer pauses while at the door (GDD §10)
  }

  private buyFromVendor(): void {
    if (this.vendorState !== "open") return;
    if (this.money < CONFIG.vendor.partsPrice) return;
    this.money -= CONFIG.vendor.partsPrice;
    this.parts += CONFIG.vendor.partsBundle;
    this.log(PHRASES.onVendorBuy);
    this.refreshHud();
    this.refreshActionMenu();
  }

  private closeVendor(): void {
    this.vendorState = "idle";
    this.paused = false;
    this.vendorBanner.setVisible(false);
    this.nextVendorIn = Phaser.Math.Between(
      CONFIG.vendor.minIntervalSec,
      CONFIG.vendor.maxIntervalSec,
    );
  }

  // ---------- HUD / MENU ----------

  private refreshHud(): void {
    const hFrac = this.hunger / CONFIG.stats.hunger.max;
    const gFrac = this.hygiene / CONFIG.stats.hygiene.max;
    this.hungerBar.width = Math.max(0, 198 * hFrac);
    this.hygieneBar.width = Math.max(0, 198 * gFrac);
    this.hungerBar.setFillStyle(hFrac < 0.25 ? CONFIG.colors.danger : CONFIG.colors.hunger);
    this.hygieneBar.setFillStyle(gFrac < 0.25 ? CONFIG.colors.danger : CONFIG.colors.hygiene);
    this.hungerText.setText(`${Math.ceil(this.hunger)}`);
    this.hygieneText.setText(`${Math.ceil(this.hygiene)}`);

    this.hudText.setText(
      `$ ${this.money}     PARTS ${this.parts}     DEBT $${this.debt}/${CONFIG.gameOver.debtLimit}\n` +
        `SCORE(so far) $${this.currentRawScore()}`,
    );
    this.dayText.setText(
      `DAY ${this.days + 1}\nbill in ${Math.ceil(this.dayTimer)}s${this.paused ? "  (PAUSED)" : ""}`,
    );
  }

  private refreshActionMenu(): void {
    const a = this.appliances[this.selectedKey];
    const empty = !a;
    const alive = !!a?.alive;

    this.btnUse
      .setVisible(!empty)
      .setText(a ? CONFIG.appliances[a.key].useActionLabel : "Use")
      .setEnabled(alive && !this.paused);
    this.btnRepair
      .setVisible(!empty)
      .setText(`Repair (${CONFIG.actions.repair.partsCost}p)`)
      .setEnabled(!empty && this.parts >= CONFIG.actions.repair.partsCost && !this.paused);
    this.btnClean
      .setVisible(!empty)
      .setText(`Clean ($${CONFIG.actions.clean.moneyCost})`)
      .setEnabled(!empty && (a?.cleanCooldownSec ?? 1) <= 0 && this.money >= CONFIG.actions.clean.moneyCost && !this.paused);
    this.btnScrap
      .setVisible(!empty)
      .setText(a ? `Scrap (+${a.scrapYield()}p)` : "Cannibalize")
      .setEnabled(!empty && !!a?.canScrap() && !this.paused);
    this.btnBuy
      .setVisible(empty)
      .setText(`Buy New ($${CONFIG.actions.buyNew.price})`)
      .setEnabled(empty && this.money >= CONFIG.actions.buyNew.price && !this.paused);
  }

  // ---------- FEEDBACK ----------

  private log(msg: string): void {
    this.logText.setText(msg);
    this.logText.setAlpha(1);
    this.tweens.killTweensOf(this.logText);
    this.tweens.add({ targets: this.logText, alpha: 0.45, delay: 2500, duration: 1500 });
  }

  private flashBills(): void {
    const flash = this.add
      .rectangle(CONFIG.width / 2, CONFIG.height / 2, CONFIG.width, CONFIG.height, CONFIG.colors.money)
      .setAlpha(0.18);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 400,
      onComplete: () => flash.destroy(),
    });
  }

  // ---------- SCORE / GAME OVER ----------

  private currentRawScore(): number {
    return Math.round(this.billsPaid + this.newApplianceValue + CONFIG.score.debtWeight * this.debt);
  }

  private checkGameOver(): void {
    if (this.gameEnded) return;
    if (this.hunger <= 0) return this.endGame("hunger");
    if (this.hygiene <= 0) return this.endGame("hygiene");
    if (this.debt >= CONFIG.gameOver.debtLimit) return this.endGame("debt");

    const criticals = this.order.filter((k) => CONFIG.appliances[k].critical);
    const allDead = criticals.every((k) => {
      const a = this.appliances[k];
      return !a || !a.alive;
    });
    if (allDead) return this.endGame("uninhabitable");
  }

  private endGame(cause: GameOverCause): void {
    this.gameEnded = true;

    let archetypeLabel: string;
    let mult: number;
    if (this.buys > this.scraps) {
      archetypeLabel = CONFIG.score.archetypes.consumer.label;
      mult = CONFIG.score.archetypes.consumer.mult;
    } else if (this.buys === 0 && this.repairs > this.scraps) {
      archetypeLabel = CONFIG.score.archetypes.technician.label;
      mult = CONFIG.score.archetypes.technician.mult;
    } else {
      archetypeLabel = CONFIG.score.archetypes.cannibal.label;
      mult = CONFIG.score.archetypes.cannibal.mult;
    }

    const raw = this.currentRawScore();
    const result: RunResult = {
      cause,
      causeText: PHRASES.gameOver[cause],
      rawScore: raw,
      mult,
      archetypeLabel,
      finalScore: Math.round(raw * mult),
      billsPaid: this.billsPaid,
      newApplianceValue: this.newApplianceValue,
      debt: this.debt,
      days: this.days,
      meals: this.meals,
      showers: this.showers,
      repairs: this.repairs,
      cleans: this.cleans,
      scraps: this.scraps,
      buys: this.buys,
      unplugs: this.unplugs,
      failedUnplugs: this.failedUnplugs,
    };
    this.scene.start("gameover", result);
  }
}
