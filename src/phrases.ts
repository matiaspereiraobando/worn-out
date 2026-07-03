/** Satirical phrase catalog (GDD §18). The system is the comedian. */

export const PHRASES = {
  intro:
    "Welcome to your new apartment. The machines are already failing. Or is it the other way around?",
  onUse: "Yes, that costs useful life. Welcome to the system.",
  onCannibalize: (a: string, b: string) =>
    `You scrapped the ${a}. Its spirit will live on in the ${b}.`,
  onCannibalizeSolo: (a: string) =>
    `You scrapped the ${a}. Efficient. Cold. Correct.`,
  onRepair: "Patched up. It'll fail again — that's the design.",
  onClean: "Deep clean. It doesn't help, but you feel better.",
  onCleanDead: "You dusted it off. It still doesn't work, but at least it's clean.",
  onSurgeWarning: "Power surge incoming. You saw it coming, right?",
  onSurgeHit: "Bad luck. The insurance doesn't cover 'I didn't unplug it'.",
  onSurgeMitigated: "Unplugged in time. The system hates that.",
  onPriceHike: "Prices are going up. For your convenience.",
  onVendorWarning: "Don José at the door. He's here to 'help'.",
  onVendorBuy: "Don José: 'Come back soon.' (He knows you will.)",
  onVendorLeave: "Don José left. He'll be back. They always come back.",
  onBuyNew: "You did it! A brand new machine. Same model. Same problems.",
  onWashSuccess: "Spin cycle nailed. $15 and a warm hum of compliance.",
  onWashFail: "Off-balance. The drum shudders; no payout today.",
  onBill: (amount: number) => `Bill of the day: ${amount}. Pay up, or...`,
  onDebt: "You couldn't cover it. The difference is now debt. It compounds, spiritually.",
  gameOver: {
    hunger: "You died of hunger. The system won.",
    hygiene: "The grime won.",
    debt: "Repossessed. Your belongings go to auction. Starting price: $2.",
    uninhabitable: "The building was condemned.",
  },
  manufacturer:
    'ElectroPlus: +12% sales of the FV-217. CEO: "Consumers have never been more satisfied."',
} as const;
