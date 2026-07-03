/**
 * Worn Out — central balance config.
 *
 * EVERY tunable number lives here so the whole game can be retuned in one place
 * during the last hours of the jam (GDD concern #2). Systems read from this;
 * they never hardcode magic numbers.
 *
 * Vertical-slice scope: 2 appliances (fridge, water heater) and 2 stats
 * (hunger, hygiene). Mood/stove/washing-machine are deferred (GDD §19/slice).
 */

export const CONFIG = {
  /** Logical game resolution. Scaled to fit the window. */
  width: 960,
  height: 540,

  /**
   * Oppressive kitchen-grunge palette (GDD §17), derived from the Midjourney
   * style board in docs/style/ (worn-out_palette-01 + style-ref-02):
   * cold olive/teal walls, bone-cream appliances, mustard/ochre money,
   * rust-red danger, warm lamp glow. Hex ints for Phaser.
   */
  colors: {
    bg: 0x161a12, // near-black olive (walls in shadow)
    panel: 0x2a3125, // dark olive panel
    panelDark: 0x1e2319,
    grime: 0x3b4636, // mid olive grime
    steel: 0x47534c, // slate blue-green (appliance metal / trim)
    danger: 0xbf4130, // saturated rust-red (red door accent)
    rust: 0xab4630, // terracotta weathering accent
    warn: 0xcf9a3f, // caution ochre-orange
    money: 0xc7a24a, // mustard/ochre gold (coins)
    ok: 0x6e7b5a, // muted olive green
    text: 0xe7e2cd, // bone / cream
    textDim: 0x9a9782, // dim bone
    hp: 0x5f9ea0, // desaturated teal
    hunger: 0xcf8a3f, // warm ochre-orange
    hygiene: 0x5f9fb0, // cool teal-blue
    lamp: 0xf2c65a, // warm lamp glow (lighting accent)
  },

  /**
   * Player stats. RETUNED (GDD concern #1): decay is now PER SECOND, so stats
   * are the real clock that forces you to use appliances. Untouched, a stat
   * empties in ~70-90s, and a dead critical appliance turns that into a crisis.
   */
  stats: {
    hunger: {
      label: "Hunger",
      max: 100,
      start: 100,
      decayPerSec: 1.3, // ~77s to empty if you never eat
      deadPenaltyPerSec: 1.1, // extra drain while the fridge is dead (food rots)
      restoreOnUse: 42, // one "eat" refills a big chunk
    },
    hygiene: {
      label: "Hygiene",
      max: 100,
      start: 100,
      decayPerSec: 1.0, // ~100s to empty if you never shower
      deadPenaltyPerSec: 1.0, // extra drain while heater is dead (cold water)
      restoreOnUse: 48,
    },
  },

  /**
   * Appliances. Discrete "use" actions (one eat / one shower) rather than
   * hold-to-use timers — cleaner to read in a slice while preserving the trap
   * loop: every use chips HP, so to survive you use, and to use you kill it.
   */
  appliances: {
    fridge: {
      label: "Fridge",
      stat: "hunger" as const,
      critical: true,
      maxHp: 100,
      startHp: 100,
      passiveDecayPerSec: 0.8, // ~125s to fail untouched; faster with use
      useHpCost: 9, // HP lost per "eat"
      useActionLabel: "Eat",
    },
    heater: {
      label: "Water Heater",
      stat: "hygiene" as const,
      critical: true,
      maxHp: 100,
      startHp: 100,
      passiveDecayPerSec: 0.9,
      useHpCost: 13,
      useActionLabel: "Shower",
    },
  },

  /** Visual HP thresholds (GDD §5). Fractions of maxHp. */
  hpStates: {
    normal: 0.5, // >= 50%
    cracked: 0.2, // 20-49%
    blinking: 0.01, // 1-19%
    // 0% = dead
  },

  /** Player actions & costs. Parts is now a SINGLE resource (GDD concern #3). */
  actions: {
    repair: {
      partsCost: 1,
      moneyCost: 0,
      restoreToFraction: 0.9, // repairs to 90% HP
      key: "DIGIT2",
    },
    clean: {
      moneyCost: 5,
      hpGain: 10,
      decayReductionFactor: 0.7, // decay ×0.7 ...
      decayReductionSec: 10, // ... for 10s
      cooldownSec: 8,
      key: "DIGIT3",
    },
    cannibalize: {
      key: "DIGIT5",
      // Parts yielded by HP at scrap (single resource, GDD §7 simplified).
      curve: [
        { minHpFraction: 0.7, parts: 3 },
        { minHpFraction: 0.4, parts: 2 },
        { minHpFraction: 0.15, parts: 1 },
        { minHpFraction: 0.0, parts: 0 },
      ],
    },
    buyNew: {
      key: "DIGIT1",
      price: 35,
      // Anti-arbitrage (GDD concern #4): a freshly bought machine cannot be
      // scrapped for this many seconds, so you can't farm buy->scrap for parts.
      scrapLockSec: 25,
    },
    use: {
      key: "DIGIT1",
    },
    togglePlug: {
      key: "DIGIT4",
    },
  },

  /** Economy: coin pickups fund repairs and bills. */
  pickups: {
    count: 5, // simultaneous coins on the floor
    minValue: 3,
    maxValue: 7,
    respawnMinSec: 6,
    respawnMaxSec: 12,
    collectRange: 48,
  },

  /**
   * Bills: charged every `dayLengthSec` (a "day"). Unpayable remainder becomes
   * debt. Line items scale up when the relevant appliance is broken.
   */
  bills: {
    dayLengthSec: 60,
    rent: 20,
    electricity: 12,
    water: 10,
    food: 16,
    brokenMultiplier: 1.75,
  },

  /** Events (GDD §9). Slice keeps the two core events. */
  events: {
    minCooldownSec: 22,
    firstEventDelaySec: 20,
    powerSurge: {
      warningSec: 8,
      hpLossFraction: 0.25, // -25% HP to a random appliance
    },
    priceHike: {
      warningSec: 12,
      billMultiplier: 1.5, // next bill ×1.5
      // Slice: price hike is un-mitigated (no prepaid item yet); still telegraphed.
    },
  },

  /** Vendor Don José (GDD §10). Pauses the global clock while at the door. */
  vendor: {
    minIntervalSec: 45,
    maxIntervalSec: 70,
    warningSec: 12,
    stayOpenSec: 12,
    // Slice offer: cheap parts to keep the repair economy alive.
    partsPrice: 6,
    partsBundle: 2,
    spriteScale: 2,
  },

  /** Starting resources. */
  start: {
    money: 55,
    parts: 2,
  },

  /** Game over (GDD §14). */
  gameOver: {
    debtLimit: 100,
    // "All criticals dead" is evaluated over the critical appliances present.
  },

  /** Score & archetypes (GDD §13). */
  score: {
    debtWeight: 0.5,
    archetypes: {
      consumer: { label: "The Consumer", mult: 1.2 },
      cannibal: { label: "The Cannibal", mult: 1.0 },
      technician: { label: "The Technician", mult: 0.8 },
    },
  },

  /** Target for a satisfying run (GDD concern #7): aim ~2-4 min with a crisis. */
  targetRunSeconds: 180,

  player: {
    speed: 132,
    w: 20,
    h: 32,
    walkFps: 10,
    spriteScale: 2,
  },

  world: {
    hudHeight: 64,
    floorTop: 96,
    floorBottom: 500,
  },

  interaction: {
    applianceRange: 72,
    doorRange: 60,
  },

  hud: {
    barW: 170,
  },

  font: {
    key: "arcade",
    sizeSm: 8,
    sizeMd: 10,
    sizeLg: 16,
  },
} as const;

export type StatKey = "hunger" | "hygiene";
export type ApplianceKey = "fridge" | "heater";
