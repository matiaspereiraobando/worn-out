/** Satirical phrase catalog (GDD §18). The system is the comedian. */
/** All player-facing strings must use arcade-font-safe characters only. */

export const PHRASES = {
  intro:
    "Welcome to your new apartment. The machines are already failing. Or is it the other way around?",
  onUse: "Yes that costs useful life. Welcome to the system.",
  onCannibalize: (a: string, b: string) =>
    `You scrapped the ${a}. Its spirit will live on in the ${b}.`,
  onCannibalizeSolo: (a: string) =>
    `You scrapped the ${a}. Efficient. Cold. Correct.`,
  onRepair: "Patched up. It will fail again. That is the design.",
  onClean: "Deep clean. It does not help but you feel better.",
  onCleanDead: "You dusted it off. Still broken. At least it is clean.",
  onSurgeWarning: "Power surge incoming. You saw it coming right?",
  onSurgeHit: "Bad luck. Insurance does not cover not unplugging it.",
  onSurgeMitigated: "Unplugged in time. The system hates that.",
  onPriceHike: "Prices are going up. For your convenience.",
  onVendorWarning: "Don Jose at the door. He is here to help.",
  onVendorBuy: "Don Jose: Come back soon. He knows you will.",
  onVendorLeave: "Don Jose left. He will be back. They always do.",
  onBuyNew: "You did it! A brand new machine. Same model. Same problems.",
  onWashSuccess: "Spin cycle nailed. +15 and a warm hum of compliance.",
  onWashFail: "Off-balance. The drum shudders. No payout today.",
  onBill: (amount: number) => `Bill of the day: ${amount}. Pay up or else.`,
  onDebt: "Could not cover it. The rest is debt now. It compounds spiritually.",
  gameOver: {
    hunger: "You died of hunger. The system won.",
    hygiene: "The grime won.",
    debt: "Repossessed. Belongings go to auction. Starting price: 2.",
    uninhabitable: "The building was condemned.",
  },
  manufacturer:
    "ElectroPlus +12% sales FV-217. CEO says consumers have never been more satisfied.",
} as const;

/** Main menu / title screen copy. */
export const MENU = {
  prompt: "PRESS E TO SIGN THE LEASE. YOU HAVE NO CHOICE.",
  popupTitle: "WORN OUT",
  popupSubtitle: "FIRST SHIFT?",
} as const;

/** Guided First Shift / Day 0 copy — lease orientation, not a coach. */
export const TUTORIAL = {
  gateTitle: "FIRST SHIFT?",
  gateTeach: "Show me around",
  gateSkip: "I know the drill",
  losePreview: "LOSE TO HUNGER GRIME DEBT OR CONDEMNED UNIT.",
  skipLabel: "Skip",
  complete: "Orientation complete. The machines await.",
  day1Start: "Day 1. The lease officially begins.",
  receiptNote: "Rent every 60s. Broken machines inflate line items.",
  beats: {
    0: "Hunger and hygiene fall whether you are ready or not.",
    1: "Walk to the fridge. Press E.",
    2: "Select Eat (1). Hunger up. Fridge life down.",
    3: "Fridge failing. Repair costs 1 part (2).",
    4: "Floor money. Press R near coins.",
    5: "Hygiene falls too. Shower at the water heater.",
    6: "First bill soon. Unpaid total becomes debt.",
    8: "Four ways out: hunger grime debt or condemned unit.",
  },
  tips: {
    repair: "Repair costs 1 part. It will fail again. That is the design.",
    unplug: "Unplug before the timer hits zero.",
    vendor: "Door menu pauses the clock. Parts beat pride.",
    washer: "Optional income. Not required to survive.",
  },
} as const;
