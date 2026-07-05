import { hasSeenTip, markTipSeen } from "./tutorialStorage";

export type TipId = "repair" | "unplug" | "vendor" | "washer" | "debt" | "scrap-lock";

/** First-time contextual tips for players who skipped or missed the guided shift. */
export function tryShowTip(id: TipId, msg: string, show: (msg: string) => void): boolean {
  if (hasSeenTip(id)) return false;
  markTipSeen(id);
  show(msg);
  return true;
}
