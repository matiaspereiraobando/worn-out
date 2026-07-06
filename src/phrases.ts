/** Satirical phrase catalog (GDD §18). The system is the comedian. */

export const PHRASES = {
  intro:
    "Welcome to your new apartment. The machines are already failing. Or is it the other way around?",
  onUse: "Yes, that costs useful life. Welcome to the system.",
  onCannibalize: (a: string, b: string) =>
    `You scrapped the ${a}. Its spirit will live on in the ${b}.`,
  onCannibalizeSolo: (a: string) =>
    `You scrapped the ${a}. Efficient. Cold. Correct.`,
  onRepair: "Patched up. It'll fail again - that's the design.",
  onClean: "Deep clean. It doesn't help, but you feel better.",
  onCleanDead: "You dusted it off. It still doesn't work, but at least it's clean.",
  onSurgeWarning: "Power surge incoming. You saw it coming, right?",
  onSurgeHit: "Bad luck. The insurance doesn't cover 'I didn't unplug it'.",
  onSurgeMitigated: "Unplugged in time. The system hates that.",
  onPriceHike: "Prices are going up. For your convenience.",
  onVendorWarning: "Don Jose at the door. He's here to 'help'.",
  onVendorBuy: "Don Jose: 'Come back soon.' (He knows you will.)",
  onVendorLeave: "Don Jose left. He'll be back. They always come back.",
  onBuyNew: "You did it! A brand new machine. Same model. Same problems.",
  onWashSuccess: "Spin cycle nailed. $15 and a warm hum of compliance.",
  onWashFail: "Off-balance. The drum shudders; no payout today.",
  onBill: (amount: number) => `Bill of the day: ${amount}. Pay up, or...`,
  onDebt: "You couldn't cover it. The difference is now debt. It compounds, spiritually.",
  billClose: (secs: number) => `CLOSE (${secs} s)  [X]`,
  gameOverMessages: {
    hunger: [
      "You died of hunger. The system won.",
      "Your stomach gave up before the lease did.",
      "One meal too few. The fridge sends condolences.",
    ],
    hygiene: [
      "The grime won.",
      "You became part of the apartment.",
      "Hygiene hit zero. The neighbors noticed.",
    ],
    debt: [
      "Repossessed. Your belongings go to auction. Starting price: $2.",
      "Debt limit reached. The bank thanks you for your service.",
      "You could not pay. The system forecloses with a smile.",
    ],
    uninhabitable: [
      "The building was condemned.",
      "Every critical machine is dead. So are your hopes.",
      "Health department called. They brought a padlock.",
    ],
  },
  manufacturer:
    'ElectroPlus: +12% sales of the FV-217. CEO: "Consumers have never been more satisfied."',
  archetypeQuotes: {
    consumer:
      'ElectroPlus: +12% sales of the FV-217. CEO: "Consumers have never been more satisfied."',
    cannibal: "SalvageCo: parts recovery up 340%. Legal says that is not cannibalism.",
    technician: "TechWorn Warranty: your repairs voided someone else's warranty. Proudly.",
    hustler: "SpinKing: side income logged. The building takes a cut starting Monday.",
    tenant: "Property Mgmt: tenant expired on schedule. Unit ready for re-letting.",
  },
  archetypeBonusLines: {
    consumer: "+20% loyalty bonus",
    cannibal: "no bonus",
    technician: "-20% technician penalty",
    hustler: "-10% off-books discount",
    tenant: "no bonus",
  },
  gameOverScoreTitle: "EXPLOITATION SCORE",
  gameOverScoreTagline: "The system scores your spending, not your survival.",
} as const;

/** Main menu / title screen copy. */
export const MENU = {
  prompt: "PRESS E TO SIGN THE LEASE. YOU HAVE NO CHOICE.",
  controlHints: "Arrows move\nE interact\n1-N action\nR pickup",
  popupTitle: "WORN OUT",
  popupSubtitle: "FIRST SHIFT?",
} as const;

/** Guided First Shift / Day 0 copy — lease orientation, not a coach. */
export const TUTORIAL = {
  gateTitle: "FIRST SHIFT?",
  gateTeach: "Show me around",
  gateSkip: "I know the drill",
  losePreview: "Lose to hunger, grime, debt, or a condemned unit.",
  skipLabel: "Skip",
  complete: "Orientation complete. The machines await.",
  day1Start: "Day 1. The lease officially begins.",
  receiptNote: "Rent every ~60s. Broken machines inflate line items.",
  beats: {
    0: "Hunger and hygiene fall whether you're ready or not.",
    1: "Walk to the fridge. Press E.",
    2: "Select Eat (1). Hunger up. Fridge life down.",
    3: "Fridge failing. Repair costs 1 part (2).",
    4: "Floor money. Press R near coins.",
    5: "Hygiene falls too. Shower at the water heater.",
    6: "First bill soon. Unpaid total becomes debt.",
    8: "Four ways out: hunger, grime, debt, condemned unit.",
  },
  tips: {
    repair: "Repair costs 1 part. It'll fail again - that's the design.",
    unplug: "Unplug before the timer hits zero.",
    vendor: "Door menu pauses the clock. Parts are cheaper than pride.",
    washer: "Optional income. Not required to survive.",
  },
} as const;
