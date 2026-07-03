import Phaser from "phaser";
import { CONFIG, type ApplianceKey } from "../config";
import { Appliance } from "../model/Appliance";
import { ApplianceView } from "../ui/ApplianceView";
import { Button } from "../ui/Button";
import { PHRASES } from "../phrases";
import { Player } from "../entities/Player";
import { ASSETS } from "../assets";

type GameOverCause = "hunger" | "hygiene" | "debt" | "uninhabitable";
type MenuMode = "none" | "appliance" | "vendor";

interface ActionOption {
  label: string;
  enabled: boolean;
  action: () => void;
  cooldown?: () => number;
}

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
  unplugActions: number;
  surgesDodged: number;
  surgesTaken: number;
}

interface Pickup {
  sprite: Phaser.GameObjects.Arc | Phaser.GameObjects.Sprite;
  label: Phaser.GameObjects.BitmapText;
  value: number;
  active: boolean;
  respawnIn: number;
}

interface ActiveEvent {
  type: "surge" | "hike";
  warningLeft: number;
  targetKey?: ApplianceKey;
}

export class GameScene extends Phaser.Scene {
  private readonly order: ApplianceKey[] = ["fridge", "heater"];
  private readonly appliancePos: Record<ApplianceKey, { x: number; y: number }> = {
    fridge: { x: 280, y: 300 },
    heater: { x: 680, y: 300 },
  };
  private readonly doorPos = { x: 900, y: 250 };

  private appliances!: Record<ApplianceKey, Appliance | null>;
  private views!: Record<ApplianceKey, ApplianceView>;
  private player!: Player;
  private nearestAppliance: ApplianceKey | null = null;

  private money = 0;
  private parts = 0;
  private debt = 0;
  private billsPaid = 0;
  private newApplianceValue = 0;
  private hunger = 0;
  private hygiene = 0;

  private meals = 0;
  private showers = 0;
  private repairs = 0;
  private cleans = 0;
  private scraps = 0;
  private buys = 0;
  private unplugActions = 0;
  private surgesDodged = 0;
  private surgesTaken = 0;
  private days = 0;

  private dayTimer = 0;
  private nextEventIn = 0;
  private nextVendorIn = 0;
  private nextBillMultiplier = 1;
  private activeEvent: ActiveEvent | null = null;
  private vendorState: "idle" | "warning" | "open" = "idle";
  private vendorTimer = 0;
  private gameEnded = false;
  private interactionPaused = false;
  private pickups: Pickup[] = [];

  private hungerBar!: Phaser.GameObjects.Rectangle;
  private hygieneBar!: Phaser.GameObjects.Rectangle;
  private hungerText!: Phaser.GameObjects.BitmapText;
  private hygieneText!: Phaser.GameObjects.BitmapText;
  private moneyText!: Phaser.GameObjects.BitmapText;
  private partsText!: Phaser.GameObjects.BitmapText;
  private hudText!: Phaser.GameObjects.BitmapText;
  private dayText!: Phaser.GameObjects.BitmapText;
  private logText!: Phaser.GameObjects.BitmapText;
  private eventBanner!: Phaser.GameObjects.Container;
  private eventText!: Phaser.GameObjects.BitmapText;
  private vendorText!: Phaser.GameObjects.BitmapText;
  private surgeIcon?: Phaser.GameObjects.Sprite;
  private door!: Phaser.GameObjects.Rectangle;
  private doorSprite?: Phaser.GameObjects.Sprite;
  private vendorNpc!: Phaser.GameObjects.Sprite;

  private menuContainer!: Phaser.GameObjects.Container;
  private menuTitle!: Phaser.GameObjects.BitmapText;
  private menuHint!: Phaser.GameObjects.BitmapText;
  private menuButtons: Button[] = [];
  private menuMode: MenuMode = "none";
  private menuTargetAppliance: ApplianceKey | null = null;
  private menuOptions: ActionOption[] = [];

  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyP!: Phaser.Input.Keyboard.Key;
  private keyNums: Phaser.Input.Keyboard.Key[] = [];

  constructor() {
    super("game");
  }

  create(): void {
    this.resetState();
    this.buildBackground();
    this.buildHud();
    this.buildAppliances();
    this.buildDoor();
    this.buildPlayer();
    this.buildActionMenu();
    this.buildEventBanner();
    this.buildLog();
    this.buildPickups();
    this.bindKeys();
    this.log(PHRASES.intro);
    this.refreshHud();
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
    this.scraps = this.buys = this.unplugActions = this.surgesDodged = this.surgesTaken = this.days = 0;
    this.dayTimer = CONFIG.bills.dayLengthSec;
    this.nextEventIn = CONFIG.events.firstEventDelaySec;
    this.nextVendorIn = Phaser.Math.Between(CONFIG.vendor.minIntervalSec, CONFIG.vendor.maxIntervalSec);
    this.nextBillMultiplier = 1;
    this.activeEvent = null;
    this.vendorState = "idle";
    this.vendorTimer = 0;
    this.interactionPaused = false;
    this.gameEnded = false;
    this.pickups = [];
    this.nearestAppliance = null;
    this.menuMode = "none";
    this.menuTargetAppliance = null;
  }

  private bt(x: number, y: number, text: string, size: number = CONFIG.font.sizeSm): Phaser.GameObjects.BitmapText {
    return this.add.bitmapText(x, y, CONFIG.font.key, text, size);
  }

  private buildBackground(): void {
    const c = CONFIG.colors;
    if (this.textures.exists(ASSETS.sprites.room.key)) {
      this.add.image(0, 0, ASSETS.sprites.room.key).setOrigin(0).setDepth(-5);
    } else {
      this.add.image(0, 0, "fallback-room").setOrigin(0).setDepth(-5);
    }
    this.add.rectangle(0, 0, CONFIG.width, CONFIG.world.hudHeight, c.panel).setOrigin(0);
    this.add.rectangle(0, CONFIG.world.hudHeight, CONFIG.width, 2, c.grime).setOrigin(0);
    this.bt(CONFIG.width / 2, CONFIG.world.hudHeight + 6, "APARTMENT", CONFIG.font.sizeSm)
      .setTint(CONFIG.colors.textDim)
      .setOrigin(0.5, 0);
  }

  private buildHud(): void {
    const c = CONFIG.colors;
    const hasIcons = this.textures.exists(ASSETS.sprites.icons.key);
    const barW = CONFIG.hud.barW;
    const mkBar = (x: number, y: number, color: number) => {
      this.add.rectangle(x, y, barW, 10, c.panelDark).setStrokeStyle(1, c.grime).setOrigin(0, 0.5);
      const bar = this.add.rectangle(x + 1, y, barW - 2, 6, color).setOrigin(0, 0.5);
      const txt = this.bt(x + barW / 2, y, "").setOrigin(0.5).setTint(0x14140f);
      return { bar, txt };
    };

    const h1 = mkBar(50, 32, c.hunger);
    const h2 = mkBar(278, 32, c.hygiene);
    this.hungerBar = h1.bar;
    this.hygieneBar = h2.bar;
    this.hungerText = h1.txt;
    this.hygieneText = h2.txt;
    if (hasIcons) {
      this.add.sprite(12, 32, ASSETS.sprites.icons.key, 0).setOrigin(0, 0.5).setDisplaySize(32, 32);
      this.add.sprite(240, 32, ASSETS.sprites.icons.key, 1).setOrigin(0, 0.5).setDisplaySize(32, 32);
      this.add.sprite(480, 32, ASSETS.sprites.icons.key, 2).setOrigin(0, 0.5).setDisplaySize(32, 32);
      this.add.sprite(600, 32, ASSETS.sprites.icons.key, 3).setOrigin(0, 0.5).setDisplaySize(32, 32);
      this.add.sprite(810, 32, ASSETS.sprites.icons.key, 7).setOrigin(0, 0.5).setDisplaySize(32, 32);
    }
    this.moneyText = this.bt(516, 20, "", CONFIG.font.sizeMd).setTint(c.money);
    this.partsText = this.bt(636, 20, "", CONFIG.font.sizeMd).setTint(c.text);
    this.hudText = this.bt(712, 22, "").setTint(c.textDim);
    this.dayText = this.bt(950, 12, "").setOrigin(1, 0).setTint(c.money);
  }

  private buildAppliances(): void {
    this.views = {} as Record<ApplianceKey, ApplianceView>;
    this.order.forEach((key) => {
      const def = CONFIG.appliances[key];
      const pos = this.appliancePos[key];
      const spriteKey = key === "fridge" ? ASSETS.sprites.fridge.key : ASSETS.sprites.heater.key;
      const view = new ApplianceView(this, pos.x, pos.y, def.label.toUpperCase(), spriteKey);
      this.views[key] = view;
    });
  }

  private buildDoor(): void {
    this.door = this.add
      .rectangle(this.doorPos.x, this.doorPos.y, 72, 72, 0x564531)
      .setStrokeStyle(2, CONFIG.colors.grime);
    if (this.textures.exists(ASSETS.sprites.door.key)) {
      this.doorSprite = this.add
        .sprite(this.doorPos.x, this.doorPos.y, ASSETS.sprites.door.key, 0)
        .setDisplaySize(72, 72)
        .setOrigin(0.5);
      this.door.setVisible(false);
    }
    this.bt(this.doorPos.x, this.doorPos.y - 42, "DOOR").setOrigin(0.5).setTint(CONFIG.colors.textDim);
    const hasVendor = this.textures.exists(ASSETS.sprites.vendor.key);
    const hasCart = this.textures.exists(ASSETS.sprites.cart.key);
    let vendorTex = "fallback-vendor";
    let vendorW = 32;
    let vendorH = 32;
    let flipX = false;
    let vendorFrame: number | undefined;
    if (hasVendor) {
      vendorTex = ASSETS.sprites.vendor.key;
      vendorW = 64 * CONFIG.vendor.spriteScale;
      vendorH = 64 * CONFIG.vendor.spriteScale;
      vendorFrame = 2; // Sheet order S,N,W,E -> face into the room (W).
      flipX = false;
    } else if (hasCart) {
      vendorTex = ASSETS.sprites.cart.key;
      vendorW = 32;
      vendorH = 32;
      // Source cart faces right; mirror it so it faces into the room.
      flipX = true;
    }
    this.vendorNpc = this.add
      .sprite(this.doorPos.x - 40, this.doorPos.y + 10, vendorTex, vendorFrame)
      .setVisible(false)
      .setDisplaySize(vendorW, vendorH)
      .setFlipX(flipX);
  }

  private buildPlayer(): void {
    this.player = new Player(this, 480, 430);
    if (this.textures.exists(ASSETS.sprites.player.key)) {
      this.player.setTextureKey(ASSETS.sprites.player.key);
    }
  }

  private buildActionMenu(): void {
    const bg = this.add
      .rectangle(0, 0, 200, 120, CONFIG.colors.panelDark)
      .setStrokeStyle(2, CONFIG.colors.warn)
      .setOrigin(0.5);
    this.menuTitle = this.bt(0, -48, "", CONFIG.font.sizeMd).setOrigin(0.5).setTint(CONFIG.colors.text);
    this.menuHint = this.bt(0, 44, "1-N select", CONFIG.font.sizeSm).setOrigin(0.5).setTint(CONFIG.colors.textDim);
    this.menuContainer = this.add.container(0, 0, [bg, this.menuTitle, this.menuHint]).setVisible(false).setDepth(1000);

    for (let i = 0; i < 6; i++) {
      const btn = new Button(this, 0, -24 + i * 16, 184, 12, "", () => this.triggerMenuOption(i));
      btn.setVisible(false);
      this.menuButtons.push(btn);
      this.menuContainer.add(btn.container);
    }

    this.bt(
      CONFIG.width / 2,
      CONFIG.height - 16,
      "WASD move  E interact  1-N action  P pickup",
      CONFIG.font.sizeSm,
    )
      .setOrigin(0.5)
      .setTint(CONFIG.colors.textDim);
  }

  private buildEventBanner(): void {
    const bg = this.add
      .rectangle(0, 0, 520, 40, CONFIG.colors.panelDark)
      .setStrokeStyle(1, CONFIG.colors.danger)
      .setOrigin(0.5);
    const hasIcons = this.textures.exists(ASSETS.sprites.icons.key);
    if (hasIcons) {
      this.surgeIcon = this.add
        .sprite(-248, 0, ASSETS.sprites.icons.key, 6)
        .setOrigin(0, 0.5)
        .setDisplaySize(32, 32)
        .setVisible(false);
    }
    this.eventText = this.bt(-204, -8, "", CONFIG.font.sizeSm).setTint(CONFIG.colors.danger).setOrigin(0, 0);
    this.vendorText = this.bt(-204, 8, "", CONFIG.font.sizeSm).setTint(CONFIG.colors.money).setOrigin(0, 0);
    const children: Phaser.GameObjects.GameObject[] = [bg];
    if (this.surgeIcon) children.push(this.surgeIcon);
    children.push(this.eventText, this.vendorText);
    this.eventBanner = this.add
      .container(CONFIG.width / 2, CONFIG.world.hudHeight + 28, children)
      .setVisible(false);
  }

  private buildLog(): void {
    this.logText = this.bt(CONFIG.width / 2, CONFIG.height - 34, "").setOrigin(0.5).setTint(CONFIG.colors.textDim);
  }

  private buildPickups(): void {
    const hasCoinSprite = this.textures.exists(ASSETS.sprites.coin.key);
    for (let i = 0; i < CONFIG.pickups.count; i++) {
      const sprite = hasCoinSprite
        ? this.add.sprite(0, 0, ASSETS.sprites.coin.key, 0).setDisplaySize(16, 16)
        : this.add.circle(0, 0, 7, CONFIG.colors.money).setStrokeStyle(1, 0x8a7a2e);
      const label = this.bt(0, 0, "", CONFIG.font.sizeSm).setOrigin(0.5).setTint(0x14140f);
      const pickup: Pickup = { sprite, label, value: 0, active: false, respawnIn: 0 };
      this.pickups.push(pickup);
      this.spawnPickup(pickup);
    }
  }

  private bindKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyE = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyP = kb.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.keyNums = [
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.ONE),
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.TWO),
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.THREE),
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.FOUR),
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.FIVE),
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.SIX),
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.SEVEN),
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.EIGHT),
      kb.addKey(Phaser.Input.Keyboard.KeyCodes.NINE),
    ];
  }

  private spawnPickup(p: Pickup): void {
    p.value = Phaser.Math.Between(CONFIG.pickups.minValue, CONFIG.pickups.maxValue);
    p.sprite.setPosition(
      Phaser.Math.Between(30, CONFIG.width - 30),
      Phaser.Math.Between(CONFIG.world.floorTop + 20, CONFIG.world.floorBottom - 24),
    );
    p.label.setPosition(p.sprite.x, p.sprite.y - 20).setText(`${p.value}`);
    if (p.sprite instanceof Phaser.GameObjects.Sprite) {
      p.sprite.setFrame(Phaser.Math.Between(0, 1));
    }
    p.active = true;
    p.sprite.setVisible(true);
    p.label.setVisible(true);
  }

  private collectPickupsInRange(): void {
    if (this.gameEnded || this.interactionPaused) return;
    let got = 0;
    for (const p of this.pickups) {
      if (!p.active) continue;
      const d = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, p.sprite.x, p.sprite.y);
      if (d <= CONFIG.pickups.collectRange) {
        got += p.value;
        p.active = false;
        p.sprite.setVisible(false);
        p.label.setVisible(false);
        p.respawnIn = Phaser.Math.Between(CONFIG.pickups.respawnMinSec, CONFIG.pickups.respawnMaxSec);
      }
    }
    if (got > 0) {
      this.money += got;
      this.log(`Picked up $${got}`);
      this.refreshHud();
    }
  }

  update(_time: number, deltaMs: number): void {
    if (this.gameEnded) return;

    const dtReal = deltaMs / 1000;
    this.handleInput(dtReal);
    this.tickVendor(dtReal);
    const dt = this.interactionPaused ? 0 : dtReal;

    if (dt > 0) {
      this.tickStats(dt);
      this.tickAppliances(dt);
      this.tickPickups(dt);
      this.tickBill(dt);
      this.tickEvents(dt);
    }

    this.updateNearestAppliance();
    this.updateMenuValidity();
    if (this.menuMode === "appliance" && this.menuContainer.visible) this.refreshMenuOptions();
    this.order.forEach((key) => this.views[key].update(this.appliances[key], dtReal));
    this.refreshHud();
    if (dt > 0) this.checkGameOver();
  }

  private handleInput(dt: number): void {
    let vx = 0;
    let vy = 0;
    if (this.keyA?.isDown) vx -= 1;
    if (this.keyD?.isDown) vx += 1;
    if (this.keyW?.isDown) vy -= 1;
    if (this.keyS?.isDown) vy += 1;
    this.player.move(vx, vy, dt);

    if (Phaser.Input.Keyboard.JustDown(this.keyP)) this.collectPickupsInRange();
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) this.interact();

    this.keyNums.forEach((k, i) => {
      if (Phaser.Input.Keyboard.JustDown(k)) this.triggerMenuOption(i);
    });
  }

  private interact(): void {
    if (this.vendorState === "open" && this.distanceToDoor() <= CONFIG.interaction.doorRange) {
      if (this.menuMode === "vendor") this.closeMenu();
      else this.openVendorMenu();
      return;
    }
    const key = this.nearestAppliance;
    if (key) {
      this.openApplianceMenu(key);
    } else {
      this.closeMenu();
    }
  }

  private updateNearestAppliance(): void {
    let best: ApplianceKey | null = null;
    let bestD = Number.POSITIVE_INFINITY;
    this.order.forEach((key) => {
      const view = this.views[key] as ApplianceView;
      const d = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, view.worldX, view.worldY);
      if (d <= CONFIG.interaction.applianceRange && d < bestD) {
        bestD = d;
        best = key;
      }
      view.setInRange(false);
    });
    this.nearestAppliance = best;
    if (best !== null) {
      const inRangeKey: ApplianceKey = best;
      (this.views[inRangeKey] as ApplianceView).setInRange(true);
    }
  }

  private updateMenuValidity(): void {
    if (this.menuMode === "appliance" && this.menuTargetAppliance) {
      const view = this.views[this.menuTargetAppliance];
      const d = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, view.worldX, view.worldY);
      if (d > CONFIG.interaction.applianceRange) this.closeMenu();
    }
    if (this.menuMode === "vendor" && this.distanceToDoor() > CONFIG.interaction.doorRange) {
      this.closeMenu();
    }
    this.door.setStrokeStyle(2, this.distanceToDoor() <= CONFIG.interaction.doorRange ? CONFIG.colors.money : CONFIG.colors.grime);
    if (this.doorSprite) {
      const active = this.vendorState === "open";
      this.doorSprite.setFrame(active ? 1 : 0);
    }
  }

  private distanceToDoor(): number {
    return Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, this.doorPos.x, this.doorPos.y);
  }

  private openApplianceMenu(key: ApplianceKey): void {
    this.menuMode = "appliance";
    this.menuTargetAppliance = key;
    this.interactionPaused = false;
    this.menuContainer.setPosition(this.views[key].worldX, this.views[key].worldY - 72).setVisible(true);
    this.refreshMenuOptions();
  }

  private openVendorMenu(): void {
    this.menuMode = "vendor";
    this.menuTargetAppliance = null;
    this.interactionPaused = true;
    this.menuContainer.setPosition(this.doorPos.x - 6, this.doorPos.y - 72).setVisible(true);
    this.refreshMenuOptions();
  }

  private closeMenu(): void {
    this.menuMode = "none";
    this.menuTargetAppliance = null;
    this.menuContainer.setVisible(false);
    this.interactionPaused = false;
  }

  private refreshMenuOptions(): void {
    let options: ActionOption[] = [];
    if (this.menuMode === "vendor") {
      this.menuTitle.setText("DON JOSE");
      options = [
        {
          label: `Buy ${CONFIG.vendor.partsBundle} parts ($${CONFIG.vendor.partsPrice})`,
          enabled: this.money >= CONFIG.vendor.partsPrice,
          action: () => this.buyFromVendor(),
        },
        {
          label: "Close",
          enabled: true,
          action: () => this.closeMenu(),
        },
      ];
    } else if (this.menuMode === "appliance" && this.menuTargetAppliance) {
      const key = this.menuTargetAppliance;
      const a = this.appliances[key];
      this.menuTitle.setText(CONFIG.appliances[key].label.toUpperCase());
      if (!a) {
        options = [
          {
            label: `Buy New ($${CONFIG.actions.buyNew.price})`,
            enabled: this.money >= CONFIG.actions.buyNew.price,
            action: () => this.doBuyNew(key),
          },
        ];
      } else {
        options = [
          {
            label: `${a.useActionLabel}`,
            enabled: a.alive && a.plugged,
            action: () => this.doUse(key),
          },
          {
            label: `Repair (${CONFIG.actions.repair.partsCost}p)`,
            enabled: this.parts >= CONFIG.actions.repair.partsCost,
            action: () => this.doRepair(key),
          },
          {
            label: `Clean ($${CONFIG.actions.clean.moneyCost})`,
            enabled:
              this.money >= CONFIG.actions.clean.moneyCost && (a.cleanCooldownSec ?? 1) <= 0,
            action: () => this.doClean(key),
            cooldown: () => a.cleanCooldownSec / CONFIG.actions.clean.cooldownSec,
          },
          {
            label: a.plugged ? "Unplug" : "Plug",
            enabled: true,
            action: () => this.doTogglePlug(key),
          },
          {
            label: `Scrap (+${a.scrapYield()}p)`,
            enabled: a.canScrap(),
            action: () => this.doCannibalize(key),
            cooldown: () => a.scrapLockSec / CONFIG.actions.buyNew.scrapLockSec,
          },
        ];
      }
    }

    this.menuOptions = options;
    this.menuHint.setText("1-N select");
    this.menuButtons.forEach((btn, i) => {
      const opt = options[i];
      if (!opt) {
        btn.setVisible(false);
        return;
      }
      btn.setVisible(true).setText(`${i + 1}. ${opt.label}`).setEnabled(opt.enabled);
      btn.setCooldown(opt.cooldown ? opt.cooldown() : 0);
      btn.setHandler(() => this.triggerMenuOption(i));
    });
  }

  private triggerMenuOption(index: number): void {
    if (!this.menuContainer.visible) return;
    const opt = this.menuOptions[index];
    if (!opt || !opt.enabled) return;
    opt.action();
    if (this.menuMode !== "none") this.refreshMenuOptions();
  }

  private doUse(key: ApplianceKey): void {
    if (this.gameEnded || this.interactionPaused) return;
    const a = this.appliances[key];
    if (!a || !a.use()) return;
    if (a.stat === "hunger") {
      this.hunger = Math.min(CONFIG.stats.hunger.max, this.hunger + CONFIG.stats.hunger.restoreOnUse);
      this.meals++;
    } else {
      this.hygiene = Math.min(CONFIG.stats.hygiene.max, this.hygiene + CONFIG.stats.hygiene.restoreOnUse);
      this.showers++;
    }
    this.log(PHRASES.onUse);
  }

  private doRepair(key: ApplianceKey): void {
    if (this.gameEnded || this.interactionPaused) return;
    const a = this.appliances[key];
    if (!a) return;
    if (this.parts < CONFIG.actions.repair.partsCost) {
      this.log("Not enough parts.");
      return;
    }
    this.parts -= CONFIG.actions.repair.partsCost;
    a.repair();
    this.repairs++;
    this.log(PHRASES.onRepair);
  }

  private doClean(key: ApplianceKey): void {
    if (this.gameEnded || this.interactionPaused) return;
    const a = this.appliances[key];
    if (!a) return;
    if (this.money < CONFIG.actions.clean.moneyCost) {
      this.log("No money for cleaning.");
      return;
    }
    if (!a.clean()) {
      this.log("Still on cleaning cooldown.");
      return;
    }
    this.money -= CONFIG.actions.clean.moneyCost;
    this.cleans++;
    this.log(a.alive ? PHRASES.onClean : PHRASES.onCleanDead);
  }

  private doTogglePlug(key: ApplianceKey): void {
    if (this.gameEnded || this.interactionPaused) return;
    const a = this.appliances[key];
    if (!a) return;
    if (a.plugged) {
      a.unplug();
      this.log(`${a.label} unplugged.`);
    } else {
      a.plug();
      this.log(`${a.label} plugged in.`);
    }
    this.unplugActions++;
  }

  private doCannibalize(key: ApplianceKey): void {
    if (this.gameEnded || this.interactionPaused) return;
    const a = this.appliances[key];
    if (!a) return;
    if (!a.canScrap()) {
      this.log("Too new to scrap.");
      return;
    }
    const yielded = a.scrapYield();
    this.parts += yielded;
    this.scraps++;
    this.appliances[key] = null;
    this.log(PHRASES.onCannibalizeSolo(a.label) + ` (+${yielded} parts)`);
    this.closeMenu();
    this.checkGameOver();
  }

  private doBuyNew(key: ApplianceKey): void {
    if (this.gameEnded || this.interactionPaused) return;
    if (this.appliances[key]) return;
    const price = CONFIG.actions.buyNew.price;
    if (this.money < price) {
      this.log("Can't afford a new one.");
      return;
    }
    this.money -= price;
    const fresh = new Appliance(key);
    fresh.scrapLockSec = CONFIG.actions.buyNew.scrapLockSec;
    this.appliances[key] = fresh;
    this.buys++;
    this.newApplianceValue += price;
    this.log(PHRASES.onBuyNew);
  }

  private buyFromVendor(): void {
    if (this.vendorState !== "open") return;
    if (this.money < CONFIG.vendor.partsPrice) return;
    this.money -= CONFIG.vendor.partsPrice;
    this.parts += CONFIG.vendor.partsBundle;
    this.log(PHRASES.onVendorBuy);
  }

  private tickStats(dt: number): void {
    const h = CONFIG.stats.hunger;
    let hungerDecay = h.decayPerSec;
    if (!this.appliances.fridge?.alive || !this.appliances.fridge?.plugged) hungerDecay += h.deadPenaltyPerSec;
    this.hunger = Math.max(0, this.hunger - hungerDecay * dt);

    const g = CONFIG.stats.hygiene;
    let hygDecay = g.decayPerSec;
    if (!this.appliances.heater?.alive || !this.appliances.heater?.plugged) hygDecay += g.deadPenaltyPerSec;
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
    const fridgeBroken = !this.appliances.fridge?.alive || !this.appliances.fridge?.plugged;
    const heaterBroken = !this.appliances.heater?.alive || !this.appliances.heater?.plugged;
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
  }

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
      const candidates = this.order.filter((k) => this.appliances[k]);
      const target = candidates.length ? Phaser.Utils.Array.GetRandom(candidates) : undefined;
      this.activeEvent = {
        type: "surge",
        warningLeft: CONFIG.events.powerSurge.warningSec,
        targetKey: target,
      };
      this.log(PHRASES.onSurgeWarning);
    } else {
      this.activeEvent = { type: "hike", warningLeft: CONFIG.events.priceHike.warningSec };
      this.log(PHRASES.onPriceHike);
    }
    this.eventBanner.setVisible(true);
    this.updateEventBanner();
  }

  private updateEventBanner(): void {
    if (!this.activeEvent) {
      this.surgeIcon?.setVisible(false);
      this.eventBanner.setVisible(false);
      return;
    }
    const t = Math.ceil(this.activeEvent.warningLeft);
    if (this.activeEvent.type === "surge") {
      this.surgeIcon?.setVisible(true);
      const target = this.activeEvent.targetKey ? CONFIG.appliances[this.activeEvent.targetKey].label : "Machine";
      this.eventText.setText(`SURGE ${target.toUpperCase()} ${t}s`);
      this.vendorText.setText("Walk there and unplug in time.");
    } else {
      this.surgeIcon?.setVisible(false);
      this.eventText.setText(`PRICE HIKE ${t}s`);
      this.vendorText.setText(`Next bill x${CONFIG.events.priceHike.billMultiplier}`);
    }
  }

  private resolveEvent(): void {
    const ev = this.activeEvent;
    if (!ev) return;
    if (ev.type === "surge") {
      const target = ev.targetKey ? this.appliances[ev.targetKey] : null;
      if (target && !target.plugged) {
        this.surgesDodged++;
        this.log(PHRASES.onSurgeMitigated);
      } else if (target?.alive) {
        target.damage(target.maxHp * CONFIG.events.powerSurge.hpLossFraction);
        this.surgesTaken++;
        this.log(PHRASES.onSurgeHit);
      }
    } else {
      this.nextBillMultiplier *= CONFIG.events.priceHike.billMultiplier;
    }
    this.activeEvent = null;
    this.eventBanner.setVisible(false);
    this.nextEventIn = CONFIG.events.minCooldownSec + Phaser.Math.Between(0, 10);
    this.checkGameOver();
  }

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
      this.eventBanner.setVisible(true);
      this.surgeIcon?.setVisible(false);
      this.vendorText.setText(`DON JOSE in ${Math.ceil(this.vendorTimer)}s`);
      if (this.vendorTimer <= 0) {
        this.vendorState = "open";
        this.vendorTimer = CONFIG.vendor.stayOpenSec;
      }
    } else if (this.vendorState === "open") {
      if (!this.interactionPaused) this.vendorTimer -= dtReal;
      this.vendorNpc.setVisible(true);
      if (!this.activeEvent) {
        this.eventBanner.setVisible(true);
        this.surgeIcon?.setVisible(false);
        this.eventText.setText("DOOR ACTIVE");
        this.vendorText.setText(`Press E near door (${Math.ceil(this.vendorTimer)}s)`);
      }
      if (this.vendorTimer <= 0) this.closeVendor();
    }
  }

  private closeVendor(): void {
    this.vendorState = "idle";
    this.vendorNpc.setVisible(false);
    if (this.menuMode === "vendor") this.closeMenu();
    this.nextVendorIn = Phaser.Math.Between(CONFIG.vendor.minIntervalSec, CONFIG.vendor.maxIntervalSec);
    if (!this.activeEvent) this.eventBanner.setVisible(false);
  }

  private refreshHud(): void {
    const hFrac = this.hunger / CONFIG.stats.hunger.max;
    const gFrac = this.hygiene / CONFIG.stats.hygiene.max;
    const barFillW = CONFIG.hud.barW - 2;
    this.hungerBar.width = Math.max(0, barFillW * hFrac);
    this.hygieneBar.width = Math.max(0, barFillW * gFrac);
    this.hungerBar.setFillStyle(hFrac < 0.25 ? CONFIG.colors.danger : CONFIG.colors.hunger);
    this.hygieneBar.setFillStyle(gFrac < 0.25 ? CONFIG.colors.danger : CONFIG.colors.hygiene);
    this.hungerText.setText(`${Math.ceil(this.hunger)}`);
    this.hygieneText.setText(`${Math.ceil(this.hygiene)}`);

    this.moneyText.setText(`${this.money}`);
    this.partsText.setText(`${this.parts}`);
    this.hudText.setText(`DEBT ${this.debt}/${CONFIG.gameOver.debtLimit}`);
    this.dayText.setText(`DAY ${this.days + 1}\nBILL ${Math.ceil(this.dayTimer)}s${this.interactionPaused ? " PAUSE" : ""}`);
  }

  private log(msg: string): void {
    this.logText.setText(msg);
    this.logText.setAlpha(1);
    this.tweens.killTweensOf(this.logText);
    this.tweens.add({ targets: this.logText, alpha: 0.4, delay: 2200, duration: 900 });
  }

  private flashBills(): void {
    const flash = this.add
      .rectangle(CONFIG.width / 2, CONFIG.height / 2, CONFIG.width, CONFIG.height, CONFIG.colors.money)
      .setAlpha(0.16)
      .setDepth(200);
    this.tweens.add({ targets: flash, alpha: 0, duration: 220, onComplete: () => flash.destroy() });
  }

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
    this.closeMenu();

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
      unplugActions: this.unplugActions,
      surgesDodged: this.surgesDodged,
      surgesTaken: this.surgesTaken,
    };
    this.scene.start("gameover", result);
  }
}
