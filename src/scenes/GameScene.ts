import Phaser from "phaser";
import { CONFIG, type ApplianceKey } from "../config";
import { Appliance } from "../model/Appliance";
import { ApplianceView } from "../ui/ApplianceView";
import { Button } from "../ui/Button";
import { Toast } from "../ui/Toast";
import { TutorialCard } from "../ui/TutorialCard";
import { PHRASES, TUTORIAL } from "../phrases";
import { Player } from "../entities/Player";
import { WalkMask } from "../model/WalkMask";
import { playerHitboxSamples } from "../playerHitbox";
import { ASSETS } from "../assets";
import { TutorialManager, type HudBarTarget } from "../tutorial/TutorialManager";
import { setTutorialDone } from "../tutorial/tutorialStorage";
import { tryShowTip } from "../tutorial/contextualTips";
import { detectArchetype, type ArchetypeId } from "../score/archetype";

export type GameMode = "day0" | "day1";

export interface GameSceneData {
  mode?: GameMode;
  fromDay0?: boolean;
}

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
  archetypeId: ArchetypeId;
  archetypeLabel: string;
  archetypeReason: string;
  archetypeBonusLine: string;
  manufacturerQuote: string;
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
  washes: number;
  unplugActions: number;
  surgesDodged: number;
  surgesTaken: number;
}

interface Pickup {
  sprite: Phaser.GameObjects.Arc | Phaser.GameObjects.Sprite;
  glow: Phaser.GameObjects.Arc;
  /** Outlined value painted on the coin face. */
  label: Phaser.GameObjects.Container;
  value: number;
  active: boolean;
  respawnIn: number;
  baseY: number;
  animT: number;
}

interface ActiveEvent {
  type: "surge" | "hike";
  warningLeft: number;
  targetKey?: ApplianceKey;
}

interface BillBreakdown {
  rent: number;
  electricity: number;
  water: number;
  food: number;
  fridgeBroken: boolean;
  heaterBroken: boolean;
  multiplier: number;
  subtotal: number;
  total: number;
}

export class GameScene extends Phaser.Scene {
  private readonly order: ApplianceKey[] = ["fridge", "heater", "washer"];
  private readonly appliancePos: Record<ApplianceKey, { x: number; y: number }> = CONFIG.layout.appliances;
  private readonly applianceSpriteKeys: Record<ApplianceKey, string> = {
    fridge: ASSETS.sprites.fridge.key,
    heater: ASSETS.sprites.heater.key,
    washer: ASSETS.sprites.washer.key,
  };
  private readonly doorPos = CONFIG.layout.door;

  private appliances!: Record<ApplianceKey, Appliance | null>;
  private views!: Record<ApplianceKey, ApplianceView>;
  private player!: Player;
  private walkMask!: WalkMask;
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
  private washes = 0;
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
  private endGameTransitioning = false;
  private interactionPaused = false;
  private receiptOpen = false;
  private receiptCloseLeft = 0;
  private pickups: Pickup[] = [];

  private hungerBar!: Phaser.GameObjects.Rectangle;
  private hygieneBar!: Phaser.GameObjects.Rectangle;
  private debtBar!: Phaser.GameObjects.Rectangle;
  private hungerText!: Phaser.GameObjects.BitmapText;
  private hygieneText!: Phaser.GameObjects.BitmapText;
  private debtText!: Phaser.GameObjects.BitmapText;
  private moneyText!: Phaser.GameObjects.BitmapText;
  private partsText!: Phaser.GameObjects.BitmapText;
  private dayText!: Phaser.GameObjects.BitmapText;
  private dayClockIcon: Phaser.GameObjects.Sprite | null = null;
  private receiptUI!: Phaser.GameObjects.Container;
  private receiptDayText!: Phaser.GameObjects.BitmapText;
  private receiptItemLabels: Phaser.GameObjects.BitmapText[] = [];
  private receiptItemAmounts: Phaser.GameObjects.BitmapText[] = [];
  private receiptHikeRow!: Phaser.GameObjects.Container;
  private receiptHikeAmount!: Phaser.GameObjects.BitmapText;
  private receiptTotalAmount!: Phaser.GameObjects.BitmapText;
  private receiptPaidAmount!: Phaser.GameObjects.BitmapText;
  private receiptDebtRow!: Phaser.GameObjects.Container;
  private receiptDebtAmount!: Phaser.GameObjects.BitmapText;
  private receiptScoreRow!: Phaser.GameObjects.Container;
  private receiptScoreAmount!: Phaser.GameObjects.BitmapText;
  private receiptCloseText!: Phaser.GameObjects.BitmapText;
  private receiptTutorialText!: Phaser.GameObjects.BitmapText;
  private toast!: Toast;
  private tutorialCard!: TutorialCard;
  private controlHintsText!: Phaser.GameObjects.BitmapText;
  private mode: GameMode = "day1";
  private tutorialManager: TutorialManager | null = null;
  private lastPlayerX = 0;
  private lastPlayerY = 0;
  private eventBanner!: Phaser.GameObjects.Container;
  private eventStrip!: Phaser.GameObjects.Image;
  private eventStripWarnKey = "fallback-strip-warn";
  private eventStripDangerKey = "fallback-strip-danger";
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

  private washing = false;
  private washTimeLeft = 0;
  private washNeedle = 0;
  private washDir = 1;
  private washGreenStart = 0;
  private washUI!: Phaser.GameObjects.Container;
  private washGreenZone!: Phaser.GameObjects.Rectangle;
  private washNeedleRect!: Phaser.GameObjects.Rectangle;
  private washTimerText!: Phaser.GameObjects.BitmapText;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyR!: Phaser.Input.Keyboard.Key;
  private keyX!: Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private keyNums: Phaser.Input.Keyboard.Key[] = [];
  private day1TransitionQueued = false;

  constructor() {
    super("game");
  }

  create(data: GameSceneData = {}): void {
    this.cameras.main.setAlpha(1);
    this.cameras.main.resetFX();
    this.day1TransitionQueued = false;

    this.mode = data.mode ?? "day1";
    this.resetState();
    this.buildBackground();
    this.walkMask = new WalkMask(this, ASSETS.sprites.walkmask.key);
    this.buildHud();
    this.buildAppliances();
    this.buildDoor();
    this.buildPlayer();
    this.player.setWalkable((x, y) => this.canPlayerStandAt(x, y));
    this.buildActionMenu();
    this.buildWashUI();
    this.buildBillReceipt();
    this.buildEventBanner();
    this.toast = new Toast(this);
    this.tutorialCard = new TutorialCard(this);
    this.buildPickups();
    this.bindKeys();
    this.initTutorial(data);
    this.lastPlayerX = this.player.sprite.x;
    this.lastPlayerY = this.player.sprite.y;
    this.refreshHud();
  }

  private resetState(): void {
    this.appliances = {
      fridge: new Appliance("fridge"),
      heater: new Appliance("heater"),
      washer: new Appliance("washer"),
    };
    this.money = CONFIG.start.money;
    this.parts = CONFIG.start.parts;
    this.debt = 0;
    this.billsPaid = 0;
    this.newApplianceValue = 0;
    this.hunger = CONFIG.stats.hunger.start;
    this.hygiene = CONFIG.stats.hygiene.start;
    this.meals = this.showers = this.repairs = this.cleans = 0;
    this.washes = 0;
    this.scraps = this.buys = this.unplugActions = this.surgesDodged = this.surgesTaken = this.days = 0;
    this.dayTimer = CONFIG.bills.dayLengthSec;
    this.nextEventIn = CONFIG.events.firstEventDelaySec;
    this.nextVendorIn = Phaser.Math.Between(CONFIG.vendor.minIntervalSec, CONFIG.vendor.maxIntervalSec);
    this.nextBillMultiplier = 1;
    this.activeEvent = null;
    this.clearAllSurgeWarnings();
    this.vendorState = "idle";
    this.vendorTimer = 0;
    this.interactionPaused = false;
    this.receiptOpen = false;
    this.receiptCloseLeft = 0;
    this.gameEnded = false;
    this.endGameTransitioning = false;
    this.pickups = [];
    this.nearestAppliance = null;
    this.menuMode = "none";
    this.menuTargetAppliance = null;
    this.washing = false;
    this.washTimeLeft = 0;
    this.washNeedle = 0;
    this.washDir = 1;
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
    this.add
      .rectangle(0, 0, CONFIG.width, CONFIG.world.hudHeight, c.panel, 0.78)
      .setOrigin(0)
      .setDepth(50);
    this.add
      .rectangle(0, CONFIG.world.hudHeight, CONFIG.width, 1, c.grime, 0.9)
      .setOrigin(0)
      .setDepth(50);
    this.bt(CONFIG.width / 2, CONFIG.world.hudHeight + 4, "APARTMENT", CONFIG.font.sizeSm)
      .setTint(CONFIG.colors.textDim)
      .setOrigin(0.5, 0);
  }

  private buildHud(): void {
    const c = CONFIG.colors;
    const hasIcons = this.textures.exists(ASSETS.sprites.icons.key);
    const barW = CONFIG.hud.barW;
    const debtBarW = CONFIG.hud.debtBarW;
    const midY = CONFIG.world.hudHeight / 2;
    const depth = 51;
    const mkBar = (x: number, width: number = barW) => {
      this.add
        .rectangle(x, midY, width, 8, c.panelDark)
        .setStrokeStyle(1, c.grime)
        .setOrigin(0, 0.5)
        .setDepth(depth);
      return this.add.rectangle(x + 1, midY, width - 2, 4, c.ok).setOrigin(0, 0.5).setDepth(depth);
    };
    // Value sits beside the icon (not on the fill) so it stays readable as the bar color shifts.
    const mkStatValue = (x: number) =>
      this.bt(x, midY, "", CONFIG.font.sizeSm).setOrigin(0, 0.5).setTint(c.text).setDepth(depth);

    // Stat blocks left→right: Hunger · Hygiene · Debt · Money · Parts (icon 32 · value · bar).
    const iconW = 32;
    const iconGap = 2;
    const valueSlot = 30;
    const blockGap = 12;
    const moneySlot = 45;

    const hungerX = 8;
    const hygieneX = hungerX + iconW + iconGap + valueSlot + barW + blockGap;
    const debtX = hygieneX + iconW + iconGap + valueSlot + barW + blockGap;
    const moneyX = debtX + iconW + iconGap + valueSlot + debtBarW + blockGap;
    const partsX = moneyX + iconW + 4 + moneySlot + blockGap;

    if (hasIcons) {
      const icon = (x: number, frame: number) =>
        this.add.sprite(x, midY, ASSETS.sprites.icons.key, frame).setOrigin(0, 0.5).setDepth(depth);
      icon(hungerX, 0);
      icon(hygieneX, 1);
      icon(debtX, 8);
      icon(moneyX, 2);
      icon(partsX, 3);
    }

    this.hungerText = mkStatValue(hungerX + iconW + iconGap);
    this.hungerBar = mkBar(hungerX + iconW + iconGap + valueSlot);
    this.hygieneText = mkStatValue(hygieneX + iconW + iconGap);
    this.hygieneBar = mkBar(hygieneX + iconW + iconGap + valueSlot);
    this.debtText = mkStatValue(debtX + iconW + iconGap);
    this.debtBar = mkBar(debtX + iconW + iconGap + valueSlot, debtBarW);
    this.moneyText = this.bt(moneyX + iconW + 4, midY, "", CONFIG.font.sizeSm).setOrigin(0, 0.5).setTint(c.money).setDepth(depth);
    this.partsText = this.bt(partsX + iconW + 4, midY, "", CONFIG.font.sizeSm).setOrigin(0, 0.5).setTint(c.text).setDepth(depth);
    const dayBlockRight = CONFIG.width - 8;
    const clockW = 32;
    const clockGap = 4;
    if (hasIcons) {
      this.dayClockIcon = this.add
        .sprite(dayBlockRight, midY, ASSETS.sprites.icons.key, 7)
        .setOrigin(1, 0.5)
        .setDepth(depth);
    } else {
      this.dayClockIcon = null;
    }
    const dayTextRight = this.dayClockIcon ? dayBlockRight - clockW - clockGap : dayBlockRight;
    this.dayText = this.bt(dayTextRight, midY, "", CONFIG.font.sizeSm).setOrigin(1, 0.5).setTint(c.money).setDepth(depth);
  }

  private buildBillReceipt(): void {
    // Programmatic invoice: bone paper, left labels / right amounts, rules under lines.
    // Scene instances are reused on retry — rebuild fresh references each create().
    this.receiptItemLabels = [];
    this.receiptItemAmounts = [];
    const paperW = 260;
    const paperH = 320;
    const colL = -108;
    const colR = 108;
    const ruleW = colR - colL;
    const ink = CONFIG.colors.bg;
    const inkDim = CONFIG.colors.panel;
    const paperFill = 0xe8dcc8;
    const ruleColor = 0x8a8470;

    const scrim = this.add
      .rectangle(0, 0, CONFIG.width, CONFIG.height, CONFIG.colors.bg, 0.55)
      .setOrigin(0.5);
    const paper = this.add
      .rectangle(0, 0, paperW, paperH, paperFill)
      .setStrokeStyle(2, CONFIG.colors.grime)
      .setOrigin(0.5);

    const title = this.bt(0, -138, "DAILY BILL", CONFIG.font.sizeMd).setOrigin(0.5).setTint(ink);
    this.receiptDayText = this.bt(0, -120, "", CONFIG.font.sizeSm).setOrigin(0.5).setTint(inkDim);
    const headerRule = this.add.rectangle(0, -108, ruleW, 1, ruleColor).setOrigin(0.5);

    const children: Phaser.GameObjects.GameObject[] = [scrim, paper, title, this.receiptDayText, headerRule];

    const itemNames = ["RENT", "ELEC", "WATER", "FOOD"];
    let y = -88;
    for (const name of itemNames) {
      const label = this.bt(colL, y, name, CONFIG.font.sizeSm).setOrigin(0, 0.5).setTint(ink);
      const amount = this.bt(colR, y, "", CONFIG.font.sizeSm).setOrigin(1, 0.5).setTint(ink);
      const rule = this.add.rectangle(0, y + 9, ruleW, 1, ruleColor).setOrigin(0.5);
      this.receiptItemLabels.push(label);
      this.receiptItemAmounts.push(amount);
      children.push(label, amount, rule);
      y += 22;
    }

    // Optional price-hike surcharge row (hidden unless active).
    const hikeLabel = this.bt(colL, y, "HIKE", CONFIG.font.sizeSm).setOrigin(0, 0.5).setTint(CONFIG.colors.danger);
    this.receiptHikeAmount = this.bt(colR, y, "", CONFIG.font.sizeSm)
      .setOrigin(1, 0.5)
      .setTint(CONFIG.colors.danger);
    const hikeRule = this.add.rectangle(0, y + 9, ruleW, 1, ruleColor).setOrigin(0.5);
    this.receiptHikeRow = this.add.container(0, 0, [hikeLabel, this.receiptHikeAmount, hikeRule]).setVisible(false);
    children.push(this.receiptHikeRow);

    // Grand total block — extra air above, double rule, then TOTAL / PAID / DEBT.
    const totalTop = 48;
    children.push(this.add.rectangle(0, totalTop, ruleW, 1, ink).setOrigin(0.5));
    children.push(this.add.rectangle(0, totalTop + 3, ruleW, 1, ink).setOrigin(0.5));

    const totalLabel = this.bt(colL, totalTop + 22, "TOTAL", CONFIG.font.sizeMd).setOrigin(0, 0.5).setTint(ink);
    this.receiptTotalAmount = this.bt(colR, totalTop + 22, "", CONFIG.font.sizeMd)
      .setOrigin(1, 0.5)
      .setTint(ink);
    children.push(totalLabel, this.receiptTotalAmount);
    children.push(this.add.rectangle(0, totalTop + 34, ruleW, 1, ruleColor).setOrigin(0.5));

    const paidLabel = this.bt(colL, totalTop + 50, "PAID", CONFIG.font.sizeSm).setOrigin(0, 0.5).setTint(inkDim);
    this.receiptPaidAmount = this.bt(colR, totalTop + 50, "", CONFIG.font.sizeSm)
      .setOrigin(1, 0.5)
      .setTint(inkDim);
    children.push(paidLabel, this.receiptPaidAmount);
    children.push(this.add.rectangle(0, totalTop + 59, ruleW, 1, ruleColor).setOrigin(0.5));

    const debtLabel = this.bt(colL, totalTop + 74, "DEBT", CONFIG.font.sizeSm)
      .setOrigin(0, 0.5)
      .setTint(CONFIG.colors.danger);
    this.receiptDebtAmount = this.bt(colR, totalTop + 74, "", CONFIG.font.sizeSm)
      .setOrigin(1, 0.5)
      .setTint(CONFIG.colors.danger);
    const debtRule = this.add.rectangle(0, totalTop + 83, ruleW, 1, ruleColor).setOrigin(0.5);
    this.receiptDebtRow = this.add
      .container(0, 0, [debtLabel, this.receiptDebtAmount, debtRule])
      .setVisible(false);
    children.push(this.receiptDebtRow);

    const scoreLabel = this.bt(colL, totalTop + 98, "TO SCORE", CONFIG.font.sizeSm)
      .setOrigin(0, 0.5)
      .setTint(CONFIG.colors.money);
    this.receiptScoreAmount = this.bt(colR, totalTop + 98, "", CONFIG.font.sizeSm)
      .setOrigin(1, 0.5)
      .setTint(CONFIG.colors.money);
    const scoreRule = this.add.rectangle(0, totalTop + 107, ruleW, 1, ruleColor).setOrigin(0.5);
    this.receiptScoreRow = this.add
      .container(0, 0, [scoreLabel, this.receiptScoreAmount, scoreRule])
      .setVisible(false);
    children.push(this.receiptScoreRow);

    this.receiptCloseText = this.bt(0, 138, "", CONFIG.font.sizeSm).setOrigin(0.5).setTint(inkDim);
    this.receiptTutorialText = this.bt(0, 152, "", CONFIG.font.sizeSm)
      .setOrigin(0.5)
      .setTint(CONFIG.colors.warn)
      .setVisible(false);
    children.push(this.receiptCloseText, this.receiptTutorialText);

    this.receiptUI = this.add
      .container(CONFIG.width / 2, CONFIG.height / 2, children)
      .setVisible(false)
      .setDepth(1200);
  }

  private buildAppliances(): void {
    this.views = {} as Record<ApplianceKey, ApplianceView>;
    this.order.forEach((key) => {
      const def = CONFIG.appliances[key];
      const pos = this.appliancePos[key];
      const spriteKey = this.applianceSpriteKeys[key];
      const view = new ApplianceView(this, pos.x, pos.y, def.label.toUpperCase(), spriteKey);
      this.views[key] = view;
    });
  }

  private buildWashUI(): void {
    const w = CONFIG.actions.wash;
    const barW = w.barW;
    const bg = this.add
      .rectangle(0, 0, barW, 12, CONFIG.colors.panelDark)
      .setStrokeStyle(1, CONFIG.colors.grime)
      .setOrigin(0.5);
    this.washGreenZone = this.add
      .rectangle(0, 0, barW * w.greenZoneFrac, 10, CONFIG.colors.ok, 0.45)
      .setOrigin(0, 0.5);
    this.washNeedleRect = this.add.rectangle(0, 0, 3, 14, CONFIG.colors.danger).setOrigin(0.5);
    this.washTimerText = this.bt(0, -16, "", CONFIG.font.sizeSm).setOrigin(0.5).setTint(CONFIG.colors.text);
    const hint = this.bt(0, 16, "Press E in green zone", CONFIG.font.sizeSm)
      .setOrigin(0.5)
      .setTint(CONFIG.colors.textDim);
    this.washUI = this.add
      .container(0, 0, [bg, this.washGreenZone, this.washNeedleRect, this.washTimerText, hint])
      .setVisible(false)
      .setDepth(1000);
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
    if (hasVendor) {
      vendorTex = ASSETS.sprites.vendor.key;
      vendorW = 64 * CONFIG.vendor.spriteScale;
      vendorH = 64 * CONFIG.vendor.spriteScale;
      const animKey = "vendor-idle";
      if (!this.anims.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(vendorTex, { start: 0, end: 6 }),
          frameRate: CONFIG.vendor.animFps,
          repeat: -1,
        });
      }
    } else if (hasCart) {
      vendorTex = ASSETS.sprites.cart.key;
      vendorW = 32;
      vendorH = 32;
    }
    this.vendorNpc = this.add
      .sprite(this.doorPos.x, this.doorPos.y + CONFIG.layout.door.vendorOffsetY, vendorTex)
      .setVisible(false)
      .setDisplaySize(vendorW, vendorH);
  }

  private buildPlayer(): void {
    this.player = new Player(this, CONFIG.layout.playerStart.x, CONFIG.layout.playerStart.y);
    if (this.textures.exists(ASSETS.sprites.player.key)) {
      this.player.setTextureKey(ASSETS.sprites.player.key);
    }
  }

  private buildActionMenu(): void {
    // Scene instances are reused across retries; drop stale Button wrappers whose
    // BitmapTexts were destroyed on shutdown (fontData becomes null → setText crash).
    this.menuButtons = [];
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

    this.controlHintsText = this.bt(
      CONFIG.width / 2,
      CONFIG.height - 56,
      "Arrows move  E interact  1-N action  R pickup",
      CONFIG.font.sizeSm,
    )
      .setOrigin(0.5)
      .setTint(CONFIG.colors.textDim);
  }

  private initTutorial(data: GameSceneData): void {
    this.tutorialManager = new TutorialManager({
      showCard: (msg, opts) => this.tutorialCard.show(msg, opts),
      dismissCard: () => this.tutorialCard.dismiss(),
      pulseHudBar: (target) => this.pulseHudBar(target),
      pulseAppliance: (key) => this.pulseAppliance(key),
      spawnCoinNearPlayer: () => this.spawnCoinNearPlayer(),
      scriptTutorialFridgeDamage: () => this.scriptTutorialFridgeDamage(),
      setReceiptTutorialNote: (note) => this.setReceiptTutorialNote(note),
      setControlHintsVisible: (visible) => this.controlHintsText.setVisible(visible),
      triggerTutorialBill: () => this.triggerTutorialBill(),
      transitionToDay1: () => this.transitionToDay1(),
    });

    if (this.mode === "day0") {
      this.tutorialManager.start();
      return;
    }

    if (data.fromDay0) {
      this.applyPostTutorialGrace();
      this.cameras.main.fadeIn(CONFIG.tutorial.dayTransitionFadeMs, 0, 0, 0);
      this.log(TUTORIAL.day1Start);
    } else {
      this.log(PHRASES.intro);
    }
  }

  private transitionToDay1(): void {
    if (this.day1TransitionQueued) return;
    this.day1TransitionQueued = true;

    const fadeMs = CONFIG.tutorial.dayTransitionFadeMs;
    this.tutorialCard.dismiss();
    this.setReceiptTutorialNote(null);
    this.controlHintsText.setVisible(true);
    this.cameras.main.fadeOut(fadeMs, 0, 0, 0, (_camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
      if (progress < 1) return;
      setTutorialDone();
      this.scene.restart({ mode: "day1", fromDay0: true });
    });
  }

  private scriptTutorialFridgeDamage(): void {
    const fridge = this.appliances.fridge;
    if (!fridge) return;
    fridge.hp = CONFIG.tutorial.fridgeHpAfterEat;
    fridge.alive = fridge.hp > 0;
  }

  private triggerTutorialBill(): void {
    if (this.mode !== "day0") return;
    this.chargeBill();
  }

  private isDay0(): boolean {
    return this.mode === "day0";
  }

  private applyPostTutorialGrace(): void {
    const grace = CONFIG.tutorial.postTutorialGraceSec;
    this.nextEventIn = CONFIG.events.firstEventDelaySec + grace;
    this.nextVendorIn = CONFIG.vendor.minIntervalSec + grace;
  }

  private setReceiptTutorialNote(note: string | null): void {
    if (note) {
      this.receiptTutorialText.setText(note).setVisible(true);
    } else {
      this.receiptTutorialText.setVisible(false);
    }
  }

  private pulseHudBar(target: HudBarTarget): void {
    const bar =
      target === "hunger" ? this.hungerBar : target === "hygiene" ? this.hygieneBar : this.debtBar;
    this.tweens.killTweensOf(bar);
    bar.setAlpha(1);
    this.tweens.add({
      targets: bar,
      alpha: 0.35,
      duration: 280,
      yoyo: true,
      repeat: 3,
      onComplete: () => bar.setAlpha(1),
    });
  }

  private pulseAppliance(key: ApplianceKey): void {
    const view = this.views[key] as ApplianceView;
    view.setInRange(true);
    this.tweens.killTweensOf(view.container);
    this.tweens.add({
      targets: view.container,
      scaleX: 1.06,
      scaleY: 1.06,
      duration: 300,
      yoyo: true,
      repeat: 2,
      onComplete: () => view.container.setScale(1),
    });
  }

  private spawnCoinNearPlayer(): void {
    const px = this.player.sprite.x;
    const py = this.player.sprite.y;
    let pickup = this.pickups.find((p) => !p.active);
    if (!pickup) pickup = this.pickups[0];
    if (!pickup) return;

    let cx = px + Phaser.Math.Between(-40, 40);
    let cy = py + Phaser.Math.Between(-30, 30);
    for (let i = 0; i < 20 && !this.walkMask.isWalkable(cx, cy); i++) {
      cx = px + Phaser.Math.Between(-40, 40);
      cy = py + Phaser.Math.Between(-30, 30);
    }
    this.spawnPickupAt(pickup, cx, cy);
  }

  private maybeShowTip(id: Parameters<typeof tryShowTip>[0], msg: string): void {
    if (this.isDay0()) return;
    tryShowTip(id, msg, (text) => this.toast.show(text));
  }

  private buildEventBanner(): void {
    // Full-width 960x40 strips; text sits in the centered 26px band (7px pad each side).
    this.eventStripWarnKey = this.textures.exists(ASSETS.sprites.stripWarn.key)
      ? ASSETS.sprites.stripWarn.key
      : "fallback-strip-warn";
    this.eventStripDangerKey = this.textures.exists(ASSETS.sprites.stripDanger.key)
      ? ASSETS.sprites.stripDanger.key
      : "fallback-strip-danger";
    this.eventStrip = this.add.image(0, 0, this.eventStripWarnKey).setOrigin(0.5);
    const hasIcons = this.textures.exists(ASSETS.sprites.icons.key);
    if (hasIcons) {
      this.surgeIcon = this.add
        .sprite(-440, 0, ASSETS.sprites.icons.key, 6)
        .setOrigin(0.5)
        .setVisible(false);
    }
    this.eventText = this.bt(0, -6, "", CONFIG.font.sizeSm).setOrigin(0.5).setTint(CONFIG.colors.bg);
    this.vendorText = this.bt(0, 6, "", CONFIG.font.sizeSm).setOrigin(0.5).setTint(CONFIG.colors.panel);
    const children: Phaser.GameObjects.GameObject[] = [this.eventStrip];
    if (this.surgeIcon) children.push(this.surgeIcon);
    children.push(this.eventText, this.vendorText);
    this.eventBanner = this.add
      .container(CONFIG.width / 2, CONFIG.world.hudHeight + 20, children)
      .setVisible(false)
      .setDepth(55);
  }

  /** Yellow warn strip for vendor/price hike; red danger strip for power surges. */
  private setEventStrip(kind: "warn" | "danger"): void {
    const key = kind === "danger" ? this.eventStripDangerKey : this.eventStripWarnKey;
    if (this.eventStrip.texture.key !== key) this.eventStrip.setTexture(key);
    // Dark ink on yellow, bone ink on red.
    if (kind === "danger") {
      this.eventText.setTint(CONFIG.colors.text);
      this.vendorText.setTint(CONFIG.colors.textDim);
    } else {
      this.eventText.setTint(CONFIG.colors.bg);
      this.vendorText.setTint(CONFIG.colors.panel);
    }
  }

  private buildPickups(): void {
    const hasCoinSprite = this.textures.exists(ASSETS.sprites.coin.key);
    const coinDepth = 6;
    for (let i = 0; i < CONFIG.pickups.count; i++) {
      // Soft mustard halo so coins pop on the grimy floor.
      const glow = this.add
        .circle(0, 0, 11, CONFIG.colors.money, 0.28)
        .setDepth(coinDepth - 1)
        .setVisible(false);
      const sprite = hasCoinSprite
        ? this.add.sprite(0, 0, ASSETS.sprites.coin.key, 0).setDisplaySize(20, 20).setDepth(coinDepth)
        : this.add.circle(0, 0, 8, CONFIG.colors.money).setStrokeStyle(2, CONFIG.colors.lamp).setDepth(coinDepth);
      // Dark digit on the coin face, bone outline for contrast on mustard gold.
      const label = this.makeOutlinedText("", CONFIG.colors.bg, CONFIG.colors.text).setDepth(coinDepth + 1);
      const pickup: Pickup = {
        sprite,
        glow,
        label,
        value: 0,
        active: false,
        respawnIn: 0,
        baseY: 0,
        animT: Math.random() * Math.PI * 2,
      };
      this.pickups.push(pickup);
      this.spawnPickup(pickup);
    }
  }

  private bindKeys(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    this.cursors = kb.createCursorKeys();
    this.keyE = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.keyR = kb.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.keyX = kb.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.keyEsc = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
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
    let px = Phaser.Math.Between(30, CONFIG.width - 30);
    let py = Phaser.Math.Between(CONFIG.world.floorTop + 20, CONFIG.world.floorBottom - 24);
    this.spawnPickupAt(p, px, py);
  }

  private spawnPickupAt(p: Pickup, px: number, py: number): void {
    p.value = Phaser.Math.Between(CONFIG.pickups.minValue, CONFIG.pickups.maxValue);
    // Only drop coins on walkable floor; retry a few times, then accept the last.
    for (let i = 0; i < 40 && !this.walkMask.isWalkable(px, py); i++) {
      px = Phaser.Math.Between(30, CONFIG.width - 30);
      py = Phaser.Math.Between(CONFIG.world.floorTop + 20, CONFIG.world.floorBottom - 24);
    }
    p.baseY = py;
    p.animT = Math.random() * Math.PI * 2;
    p.sprite.setPosition(px, py);
    p.glow.setPosition(px, py);
    p.label.setPosition(px, py);
    this.setOutlinedText(p.label, `${p.value}`);
    if (p.sprite instanceof Phaser.GameObjects.Sprite) {
      p.sprite.setFrame(0);
    }
    p.active = true;
    p.sprite.setVisible(true);
    p.glow.setVisible(true);
    p.label.setVisible(true);
  }

  private collectPickupsInRange(): void {
    if (this.gameEnded || this.interactionPaused || this.receiptOpen) return;
    let got = 0;
    let floatX = this.player.sprite.x;
    let floatY = this.player.sprite.y;
    for (const p of this.pickups) {
      if (!p.active) continue;
      const d = Phaser.Math.Distance.Between(this.player.sprite.x, this.player.sprite.y, p.sprite.x, p.sprite.y);
      if (d <= CONFIG.pickups.collectRange) {
        got += p.value;
        floatX = p.sprite.x;
        floatY = p.sprite.y;
        p.active = false;
        p.sprite.setVisible(false);
        p.glow.setVisible(false);
        p.label.setVisible(false);
        p.respawnIn = Phaser.Math.Between(CONFIG.pickups.respawnMinSec, CONFIG.pickups.respawnMaxSec);
      }
    }
    if (got > 0) {
      this.money += got;
      this.spawnMoneyFloat(floatX, floatY, got);
      this.tutorialManager?.onPickup();
      this.refreshHud();
    }
  }

  /** Arcade font has no `$`; floats use outlined `+N` (gold) or `-N` (danger). */
  private spawnMoneyFloat(x: number, y: number, amount: number): void {
    if (amount === 0) return;
    const spend = amount < 0;
    const label = spend ? `-${Math.abs(amount)}` : `+${amount}`;
    const startY = y - 8;
    const fill = spend ? CONFIG.colors.danger : CONFIG.colors.money;
    const outline = 0x0a0a08;
    const children: Phaser.GameObjects.GameObject[] = [];
    const size = CONFIG.font.sizeLg;
    for (const [ox, oy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ] as const) {
      children.push(this.bt(ox, oy, label, size).setOrigin(0.5).setTint(outline));
    }
    children.push(this.bt(0, 0, label, size).setOrigin(0.5).setTint(fill));
    const float = this.add.container(x, startY, children).setDepth(1500);
    this.tweens.add({
      targets: float,
      y: startY - CONFIG.pickups.floatRisePx,
      alpha: 0,
      duration: CONFIG.pickups.floatDurationMs,
      ease: "Quad.easeOut",
      onComplete: () => float.destroy(true),
    });
  }

  update(_time: number, deltaMs: number): void {
    if (this.gameEnded) return;

    const dtReal = deltaMs / 1000;

    if (Phaser.Input.Keyboard.JustDown(this.keyEsc) && this.isDay0() && this.tutorialManager?.isActive()) {
      this.tutorialManager.skip();
    }

    if (this.receiptOpen) {
      this.toast.setSuppressed(true);
      this.tickReceipt(dtReal);
      this.refreshHud();
      return;
    }
    this.toast.setSuppressed(false);

    this.handleInput(dtReal);
    if (this.washing) this.tickWash(dtReal);

    const day0 = this.isDay0();
    const tutorialPaused = this.tutorialManager?.shouldPauseWorld() ?? false;

    if (!day0) this.tickVendor(dtReal);

    const dt = this.interactionPaused || tutorialPaused ? 0 : dtReal;
    const beatDt = tutorialPaused ? dtReal : dt;

    const px = this.player.sprite.x;
    const py = this.player.sprite.y;
    if (Math.abs(px - this.lastPlayerX) > 1 || Math.abs(py - this.lastPlayerY) > 1) {
      this.tutorialManager?.onPlayerMoved();
      this.lastPlayerX = px;
      this.lastPlayerY = py;
    }

    if (day0) this.tutorialManager?.tick(beatDt);

    if (dt > 0) {
      this.tickStats(dt, day0);
      this.tickAppliances(dt);
      this.tickPickups(dt);
      this.tickBill(dt);
      if (!day0) this.tickEvents(dt);
    } else if (day0 && !tutorialPaused) {
      this.tickStats(dtReal, true);
    }

    this.updateNearestAppliance();
    this.updateMenuValidity();
    if (this.menuMode === "appliance" && this.menuContainer.visible) this.refreshMenuOptions();
    this.order.forEach((key) => this.views[key].update(this.appliances[key], dtReal));
    this.refreshHud();
    if (this.tutorialCard.isVisible()) this.controlHintsText.setVisible(false);
    else if (!this.isDay0()) this.controlHintsText.setVisible(true);
    if (dt > 0 && !this.isDay0()) this.checkGameOver();
  }

  private handleInput(dt: number): void {
    let vx = 0;
    let vy = 0;
    if (this.cursors.left?.isDown) vx -= 1;
    if (this.cursors.right?.isDown) vx += 1;
    if (this.cursors.up?.isDown) vy -= 1;
    if (this.cursors.down?.isDown) vy += 1;
    this.player.move(vx, vy, dt);

    if (Phaser.Input.Keyboard.JustDown(this.keyR)) this.collectPickupsInRange();
    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      if (this.washing) this.resolveWash(true);
      else this.interact();
    }

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
      if (inRangeKey === "washer") {
        this.maybeShowTip("washer", TUTORIAL.tips.washer);
      }
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

  private canPlayerStandAt(x: number, y: number): boolean {
    if (!this.walkMask.available) return true;
    return playerHitboxSamples(x, y).every(([sx, sy]) => this.walkMask.isWalkable(sx, sy));
  }

  private openApplianceMenu(key: ApplianceKey): void {
    this.menuMode = "appliance";
    this.menuTargetAppliance = key;
    this.interactionPaused = false;
    this.menuContainer.setPosition(this.views[key].worldX, this.views[key].worldY - 72).setVisible(true);
    this.refreshMenuOptions();
    this.tutorialManager?.onApplianceMenuOpen(key);
    this.checkRepairTip(key);
  }

  private checkRepairTip(key: ApplianceKey): void {
    const a = this.appliances[key];
    if (!a) return;
    const needsRepair = !a.alive || a.hp / a.maxHp < 0.25;
    if (needsRepair && this.parts >= CONFIG.actions.repair.partsCost) {
      this.maybeShowTip("repair", TUTORIAL.tips.repair);
    }
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
        const isWasher = key === "washer";
        options = [
          {
            label: `${a.useActionLabel}`,
            enabled:
              a.alive && a.plugged && !this.washing && (!isWasher || a.washCooldownSec <= 0),
            action: () => (isWasher ? this.startWash(key) : this.doUse(key)),
            cooldown: isWasher
              ? () => a.washCooldownSec / CONFIG.actions.wash.cooldownSec
              : undefined,
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
    } else if (a.stat === "hygiene") {
      this.hygiene = Math.min(CONFIG.stats.hygiene.max, this.hygiene + CONFIG.stats.hygiene.restoreOnUse);
      this.showers++;
    }
    this.log(PHRASES.onUse);
    this.tutorialManager?.onUse(key);
  }

  private startWash(key: ApplianceKey): void {
    if (this.gameEnded || this.interactionPaused || this.washing) return;
    const a = this.appliances[key];
    if (!a || key !== "washer" || a.washCooldownSec > 0 || !a.use()) return;

    a.washCooldownSec = CONFIG.actions.wash.cooldownSec;
    this.closeMenu();
    const w = CONFIG.actions.wash;
    this.washing = true;
    this.washTimeLeft = w.cycleSec;
    this.washNeedle = 0;
    this.washDir = 1;
    this.washGreenStart = Math.random() * (1 - w.greenZoneFrac);
    const view = this.views[key];
    this.washUI.setPosition(view.worldX, view.worldY - 90).setVisible(true);
    this.updateWashVisuals();
  }

  private tickWash(dt: number): void {
    const w = CONFIG.actions.wash;
    this.washNeedle += this.washDir * w.sweepsPerSec * dt;
    if (this.washNeedle >= 1) {
      this.washNeedle = 1;
      this.washDir = -1;
    } else if (this.washNeedle <= 0) {
      this.washNeedle = 0;
      this.washDir = 1;
    }
    this.washTimeLeft -= dt;
    this.updateWashVisuals();
    if (this.washTimeLeft <= 0) this.resolveWash(false);
  }

  private updateWashVisuals(): void {
    const w = CONFIG.actions.wash;
    const barW = w.barW;
    const half = barW / 2;
    this.washGreenZone.width = barW * w.greenZoneFrac;
    this.washGreenZone.x = -half + this.washGreenStart * barW;
    this.washNeedleRect.x = -half + this.washNeedle * barW;
    this.washTimerText.setText(`${Math.ceil(Math.max(0, this.washTimeLeft))}s`);
  }

  private resolveWash(pressed: boolean): void {
    if (!this.washing) return;
    const w = CONFIG.actions.wash;
    const inZone =
      this.washNeedle >= this.washGreenStart &&
      this.washNeedle <= this.washGreenStart + w.greenZoneFrac;
    if (pressed && inZone) {
      this.money += w.reward;
      this.washes++;
      const washer = this.views.washer;
      this.spawnMoneyFloat(washer.worldX, washer.worldY - 20, w.reward);
      this.log(PHRASES.onWashSuccess);
      this.refreshHud();
    } else {
      this.log(PHRASES.onWashFail);
    }
    this.washing = false;
    this.washUI.setVisible(false);
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
    if (this.isDay0()) this.tutorialManager?.onRepair(key);
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
    const cost = CONFIG.actions.clean.moneyCost;
    this.money -= cost;
    const view = this.views[key];
    this.spawnMoneyFloat(view.worldX, view.worldY - 20, -cost);
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
      this.maybeShowTip("scrap-lock", "Too new to scrap.");
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
    const view = this.views[key];
    this.spawnMoneyFloat(view.worldX, view.worldY - 20, -price);
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
    const cost = CONFIG.vendor.partsPrice;
    this.money -= cost;
    this.parts += CONFIG.vendor.partsBundle;
    this.spawnMoneyFloat(this.doorPos.x, this.doorPos.y - 20, -cost);
    this.log(PHRASES.onVendorBuy);
  }

  private tickStats(dt: number, tutorialActive = false): void {
    const decayScale = tutorialActive ? CONFIG.tutorial.statDecayMultiplier : 1;
    const h = CONFIG.stats.hunger;
    let hungerDecay = h.decayPerSec * decayScale;
    if (!this.appliances.fridge?.alive || !this.appliances.fridge?.plugged) {
      hungerDecay += h.deadPenaltyPerSec * decayScale;
    }
    this.hunger = Math.max(0, this.hunger - hungerDecay * dt);

    const g = CONFIG.stats.hygiene;
    let hygDecay = g.decayPerSec * decayScale;
    if (!this.appliances.heater?.alive || !this.appliances.heater?.plugged) {
      hygDecay += g.deadPenaltyPerSec * decayScale;
    }
    this.hygiene = Math.max(0, this.hygiene - hygDecay * dt);
  }

  private tickAppliances(dt: number): void {
    this.order.forEach((key) => this.appliances[key]?.tick(dt));
  }

  private tickPickups(dt: number): void {
    for (const p of this.pickups) {
      if (!p.active) {
        p.respawnIn -= dt;
        if (p.respawnIn <= 0) this.spawnPickup(p);
        continue;
      }
      // Bob + pulse + shine so coins read on the grimy floor.
      p.animT += dt;
      const bob = Math.sin(p.animT * 3.2) * 2.5;
      const pulse = 1 + Math.sin(p.animT * 4.5) * 0.08;
      const glowPulse = 0.22 + (Math.sin(p.animT * 4.5) + 1) * 0.1;
      p.sprite.setPosition(p.sprite.x, p.baseY + bob);
      if (p.sprite instanceof Phaser.GameObjects.Sprite) {
        // Texture is 32px; keep ~20px display while pulsing.
        const base = 20 / 32;
        p.sprite.setScale(base * pulse);
        p.sprite.setFrame(Math.sin(p.animT * 5) > 0 ? 1 : 0);
      } else {
        p.sprite.setScale(pulse);
      }
      p.glow.setPosition(p.sprite.x, p.baseY);
      p.glow.setScale(pulse * 1.15);
      p.glow.setAlpha(glowPulse);
      p.label.setPosition(p.sprite.x, p.baseY + bob);
    }
  }

  /** Outlined bitmap label (fill + 8-neighbor stroke), same trick as money floats. */
  private makeOutlinedText(
    text: string,
    fill: number,
    outline: number,
    size: number = CONFIG.font.sizeSm,
  ): Phaser.GameObjects.Container {
    const children: Phaser.GameObjects.GameObject[] = [];
    for (const [ox, oy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ] as const) {
      children.push(this.bt(ox, oy, text, size).setOrigin(0.5).setTint(outline));
    }
    children.push(this.bt(0, 0, text, size).setOrigin(0.5).setTint(fill));
    return this.add.container(0, 0, children);
  }

  private setOutlinedText(container: Phaser.GameObjects.Container, text: string): void {
    for (const child of container.list) {
      if (child instanceof Phaser.GameObjects.BitmapText) child.setText(text);
    }
  }

  private tickBill(dt: number): void {
    if (this.isDay0()) return;
    this.dayTimer -= dt;
    if (this.dayTimer <= 0) {
      this.dayTimer += CONFIG.bills.dayLengthSec;
      this.chargeBill();
    }
  }

  private computeBillBreakdown(): BillBreakdown {
    const b = CONFIG.bills;
    const fridgeBroken = !this.appliances.fridge?.alive || !this.appliances.fridge?.plugged;
    const heaterBroken = !this.appliances.heater?.alive || !this.appliances.heater?.plugged;
    const rent = b.rent;
    const electricity = b.electricity;
    const water = heaterBroken ? Math.round(b.water * b.brokenMultiplier) : b.water;
    const food = fridgeBroken ? Math.round(b.food * b.brokenMultiplier) : b.food;
    const subtotal = rent + electricity + water + food;
    const multiplier = this.nextBillMultiplier;
    const total = Math.round(subtotal * multiplier);
    return { rent, electricity, water, food, fridgeBroken, heaterBroken, multiplier, subtotal, total };
  }

  private chargeBill(): void {
    const bill = this.computeBillBreakdown();
    this.nextBillMultiplier = 1;
    this.days++;

    let paid = 0;
    let shortfall = 0;
    if (this.money >= bill.total) {
      this.money -= bill.total;
      this.billsPaid += bill.total;
      paid = bill.total;
      this.log(PHRASES.onBill(bill.total));
    } else {
      shortfall = bill.total - this.money;
      paid = this.money;
      this.billsPaid += this.money;
      this.money = 0;
      this.debt += shortfall;
      this.log(PHRASES.onBill(bill.total) + " " + PHRASES.onDebt);
      this.maybeShowTip("debt", PHRASES.onDebt);
    }
    if (paid > 0) {
      this.spawnMoneyFloat(this.player.sprite.x, this.player.sprite.y - 20, -paid);
    }
    this.closeMenu();
    this.showBillReceipt(bill, paid, shortfall);
    this.flashBills();
  }

  private showBillReceipt(bill: BillBreakdown, paid: number, shortfall: number): void {
    // Bare amounts on receipt; money icon carries meaning in HUD.
    this.receiptDayText.setText(`DAY ${this.days}`);
    const amounts = [bill.rent, bill.electricity, bill.water, bill.food];
    const labels = [
      "RENT",
      "ELEC",
      bill.heaterBroken ? "WATER !" : "WATER",
      bill.fridgeBroken ? "FOOD !" : "FOOD",
    ];
    for (let i = 0; i < 4; i++) {
      this.receiptItemLabels[i].setText(labels[i]);
      this.receiptItemAmounts[i].setText(`${amounts[i]}`);
    }

    if (bill.multiplier > 1) {
      const surcharge = bill.total - bill.subtotal;
      this.receiptHikeAmount.setText(`x${bill.multiplier}  +${surcharge}`);
      this.receiptHikeRow.setVisible(true);
    } else {
      this.receiptHikeRow.setVisible(false);
    }

    this.receiptTotalAmount.setText(`${bill.total}`);
    this.receiptPaidAmount.setText(`${paid}`);
    if (shortfall > 0) {
      this.receiptDebtAmount.setText(`+${shortfall}`);
      this.receiptDebtRow.setVisible(true);
    } else {
      this.receiptDebtRow.setVisible(false);
    }

    if (paid > 0) {
      this.receiptScoreAmount.setText(`+${paid}`);
      this.receiptScoreRow.setVisible(true);
    } else {
      this.receiptScoreRow.setVisible(false);
    }

    this.receiptCloseLeft = CONFIG.bills.receiptSec;
    this.receiptOpen = true;
    this.receiptUI.setVisible(true);
    this.updateReceiptCloseText();
    this.tutorialManager?.onBillReceiptOpen();
  }

  private tickReceipt(dt: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.keyX)) {
      this.closeBillReceipt();
      return;
    }
    this.receiptCloseLeft -= dt;
    this.updateReceiptCloseText();
    if (this.receiptCloseLeft <= 0) this.closeBillReceipt();
  }

  private updateReceiptCloseText(): void {
    const secs = Math.max(0, Math.ceil(this.receiptCloseLeft));
    this.receiptCloseText.setText(`CLOSE (${secs} s)`);
  }

  private closeBillReceipt(): void {
    this.receiptOpen = false;
    this.receiptCloseLeft = 0;
    this.receiptUI.setVisible(false);
    this.setReceiptTutorialNote(null);
    this.tutorialManager?.onBillReceiptClose();
    this.checkGameOver();
  }

  private tickEvents(dt: number): void {
    if (this.activeEvent) {
      this.activeEvent.warningLeft -= dt;
      if (this.activeEvent.warningLeft <= 0) this.resolveEvent();
      else {
        this.updateEventBanner();
        this.updateSurgeWarnings();
      }
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
      this.maybeShowTip("unplug", TUTORIAL.tips.unplug);
    } else {
      this.activeEvent = { type: "hike", warningLeft: CONFIG.events.priceHike.warningSec };
      this.log(PHRASES.onPriceHike);
    }
    this.eventBanner.setVisible(true);
    this.updateEventBanner();
    this.updateSurgeWarnings();
  }

  private updateEventBanner(): void {
    if (!this.activeEvent) {
      this.surgeIcon?.setVisible(false);
      this.eventBanner.setVisible(false);
      return;
    }
    const t = Math.ceil(this.activeEvent.warningLeft);
    if (this.activeEvent.type === "surge") {
      this.setEventStrip("danger");
      this.surgeIcon?.setVisible(true);
      const target = this.activeEvent.targetKey ? CONFIG.appliances[this.activeEvent.targetKey].label : "Machine";
      this.eventText.setText(`SURGE ${target.toUpperCase()} ${t}s`);
      this.vendorText.setText("Walk there and unplug in time.");
    } else {
      this.setEventStrip("warn");
      this.surgeIcon?.setVisible(false);
      this.eventText.setText(`PRICE HIKE ${t}s`);
      this.vendorText.setText(`Next bill x${CONFIG.events.priceHike.billMultiplier}`);
      this.clearAllSurgeWarnings();
    }
  }

  /** World-space telegraph: only the surge target pulses; urgency ramps in the last 2s. */
  private updateSurgeWarnings(): void {
    if (!this.views) return;
    const ev = this.activeEvent;
    if (!ev || ev.type !== "surge" || !ev.targetKey) {
      this.clearAllSurgeWarnings();
      return;
    }
    const left = Math.max(0, ev.warningLeft);
    // Urgency 0 until the last 2s, then ramps 0→1.
    const urgency = left <= 2 ? 1 - left / 2 : 0;
    for (const key of this.order) {
      this.views[key].setSurgeWarning(key === ev.targetKey, urgency);
    }
  }

  private clearAllSurgeWarnings(): void {
    if (!this.views) return;
    for (const key of this.order) this.views[key].setSurgeWarning(false);
  }

  private resolveEvent(): void {
    const ev = this.activeEvent;
    if (!ev) return;
    if (ev.type === "surge") {
      const target = ev.targetKey ? this.appliances[ev.targetKey] : null;
      const view = ev.targetKey ? this.views[ev.targetKey] : null;
      const hitMachine = !!(target?.plugged && target.alive);
      view?.playSurgeDischarge(hitMachine);
      if (target && !target.plugged) {
        this.surgesDodged++;
        this.log(PHRASES.onSurgeMitigated);
      } else if (target?.alive) {
        target.damage(target.maxHp * CONFIG.events.powerSurge.hpLossFraction);
        this.surgesTaken++;
        this.log(PHRASES.onSurgeHit);
      }
      this.clearAllSurgeWarnings();
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
        this.maybeShowTip("vendor", TUTORIAL.tips.vendor);
      }
    } else if (this.vendorState === "warning") {
      this.vendorTimer -= dtReal;
      if (!this.activeEvent) {
        this.setEventStrip("warn");
        this.surgeIcon?.setVisible(false);
        this.eventBanner.setVisible(true);
        this.eventText.setText("VENDOR");
        this.vendorText.setText(`DON JOSE in ${Math.ceil(this.vendorTimer)}s`);
      }
      if (this.vendorTimer <= 0) {
        this.vendorState = "open";
        this.vendorTimer = CONFIG.vendor.stayOpenSec;
        this.vendorNpc.setVisible(true);
        if (this.anims.exists("vendor-idle")) {
          this.vendorNpc.anims.play("vendor-idle");
        }
        this.playVendorDoorFx();
      }
    } else if (this.vendorState === "open") {
      if (!this.interactionPaused) this.vendorTimer -= dtReal;
      this.vendorNpc.setVisible(true);
      if (!this.activeEvent) {
        this.setEventStrip("warn");
        this.surgeIcon?.setVisible(false);
        this.eventBanner.setVisible(true);
        this.eventText.setText("DOOR ACTIVE");
        this.vendorText.setText(`Press E near door (${Math.ceil(this.vendorTimer)}s)`);
      }
      if (this.vendorTimer <= 0) this.closeVendor();
    }
  }

  private closeVendor(): void {
    this.vendorState = "idle";
    this.vendorNpc.anims.stop();
    this.vendorNpc.setVisible(false);
    this.playVendorDoorFx();
    if (this.menuMode === "vendor") this.closeMenu();
    this.nextVendorIn = Phaser.Math.Between(CONFIG.vendor.minIntervalSec, CONFIG.vendor.maxIntervalSec);
    if (!this.activeEvent) this.eventBanner.setVisible(false);
  }

  /**
   * Warm lamp/mustard motes at the door — arrival and leave both read as a slam.
   * Surge FX uses rust/danger and falls; this uses gold/lamp and drifts upward.
   */
  private playVendorDoorFx(): void {
    const key = "px-spark";
    if (!this.textures.exists(key)) {
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(0xffffff, 1);
      g.fillRect(0, 0, 2, 2);
      g.generateTexture(key, 2, 2);
      g.destroy();
    }
    const x = this.doorPos.x;
    const y = this.doorPos.y;
    const depth = 60;
    const burst = (ox: number, oy: number, count: number, angleMin: number, angleMax: number) => {
      const particles = this.add.particles(x + ox, y + oy, key, {
        speed: { min: 24, max: 70 },
        angle: { min: angleMin, max: angleMax },
        scale: { start: 2.2, end: 0 },
        alpha: { start: 0.95, end: 0 },
        lifespan: { min: 450, max: 800 },
        gravityY: -50,
        tint: [CONFIG.colors.lamp, CONFIG.colors.money, CONFIG.colors.warn, CONFIG.colors.text],
        emitting: false,
      });
      particles.setDepth(depth);
      particles.explode(count);
      this.time.delayedCall(900, () => {
        if (particles.active) particles.destroy();
      });
    };
    // Soft halo around the door, mostly rising into the room.
    burst(0, 0, 22, 220, 320);
    burst(-18, 8, 12, 200, 280);
    burst(18, 8, 12, 260, 340);
  }

  private refreshHud(): void {
    const hFrac = this.hunger / CONFIG.stats.hunger.max;
    const gFrac = this.hygiene / CONFIG.stats.hygiene.max;
    const dFrac = Phaser.Math.Clamp(this.debt / CONFIG.gameOver.debtLimit, 0, 1);
    const barFillW = CONFIG.hud.barW - 2;
    const debtFillW = CONFIG.hud.debtBarW - 2;
    this.hungerBar.width = Math.max(0, barFillW * hFrac);
    this.hygieneBar.width = Math.max(0, barFillW * gFrac);
    this.debtBar.width = Math.max(0, debtFillW * dFrac);
    this.hungerBar.setFillStyle(this.statBarColor(hFrac));
    this.hygieneBar.setFillStyle(this.statBarColor(gFrac));
    // Debt fills toward danger (inverse of hunger/hygiene).
    this.debtBar.setFillStyle(this.statBarColor(1 - dFrac));
    this.hungerText.setText(`${Math.ceil(this.hunger)}`);
    this.hygieneText.setText(`${Math.ceil(this.hygiene)}`);
    this.debtText.setText(`${this.debt}`);

    // Bare amounts in HUD; money icon carries the meaning.
    this.moneyText.setText(`${this.money}`);
    this.partsText.setText(`${this.parts}`);

    const bill = this.computeBillBreakdown();
    const pause = this.interactionPaused || this.receiptOpen ? " PAUSE" : "";
    if (this.isDay0()) {
      this.dayText.setText(`DAY 0  ORIENTATION${pause}`);
      this.dayText.setTint(CONFIG.colors.warn);
    } else {
      this.dayText.setText(`NEXT ${bill.total}  DAY ${this.days + 1}  ${Math.ceil(this.dayTimer)}s${pause}`);
      this.dayText.setTint(bill.multiplier > 1 ? CONFIG.colors.danger : CONFIG.colors.money);
    }
  }

  /** Shared fill: greenish at full, reddish near empty. */
  private statBarColor(frac: number): number {
    const t = Phaser.Math.Clamp(frac, 0, 1);
    const full = Phaser.Display.Color.IntegerToColor(CONFIG.colors.ok);
    const empty = Phaser.Display.Color.IntegerToColor(CONFIG.colors.danger);
    return Phaser.Display.Color.GetColor(
      Math.round(Phaser.Math.Linear(empty.red, full.red, t)),
      Math.round(Phaser.Math.Linear(empty.green, full.green, t)),
      Math.round(Phaser.Math.Linear(empty.blue, full.blue, t)),
    );
  }

  private log(msg: string): void {
    this.toast.show(msg);
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
    if (this.gameEnded) return;
    this.gameEnded = true;
    this.washing = false;
    this.washUI?.setVisible(false);
    this.receiptOpen = false;
    this.receiptUI?.setVisible(false);
    this.closeMenu();

    const archetype = detectArchetype({
      buys: this.buys,
      scraps: this.scraps,
      repairs: this.repairs,
      washes: this.washes,
    });

    const raw = this.currentRawScore();
    const result: RunResult = {
      cause,
      causeText: PHRASES.gameOver[cause],
      rawScore: raw,
      mult: archetype.mult,
      archetypeId: archetype.id,
      archetypeLabel: archetype.label,
      archetypeReason: archetype.reasonLine,
      archetypeBonusLine: archetype.bonusLine,
      manufacturerQuote: archetype.manufacturerQuote,
      finalScore: Math.round(raw * archetype.mult),
      billsPaid: this.billsPaid,
      newApplianceValue: this.newApplianceValue,
      debt: this.debt,
      days: this.days,
      meals: this.meals,
      showers: this.showers,
      washes: this.washes,
      repairs: this.repairs,
      cleans: this.cleans,
      scraps: this.scraps,
      buys: this.buys,
      unplugActions: this.unplugActions,
      surgesDodged: this.surgesDodged,
      surgesTaken: this.surgesTaken,
    };

    if (this.endGameTransitioning) return;
    this.endGameTransitioning = true;

    const cx = CONFIG.width / 2;
    const cy = CONFIG.height / 2;
    this.add
      .bitmapText(cx, cy - 30, CONFIG.font.key, result.causeText, CONFIG.font.sizeMd)
      .setTint(CONFIG.colors.danger)
      .setOrigin(0.5)
      .setDepth(2000)
      .setCenterAlign()
      .setMaxWidth(CONFIG.width - 80);

    this.time.delayedCall(CONFIG.gameOver.holdMs, () => {
      this.cameras.main.fadeOut(
        CONFIG.gameOver.fadeOutMs,
        0,
        0,
        0,
        (_camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
          if (progress < 1) return;
          this.scene.start("gameover", result);
        },
      );
    });
  }
}
