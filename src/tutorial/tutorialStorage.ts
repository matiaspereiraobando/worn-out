const SKIPPED_KEY = "worn-out.tutorialSkipped";
const DONE_KEY = "worn-out.tutorialDone";
const SEEN_TIPS_KEY = "worn-out.seenTips";

function storageAvailable(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

export function isTutorialSkipped(): boolean {
  if (!storageAvailable()) return false;
  return localStorage.getItem(SKIPPED_KEY) === "1";
}

export function isTutorialDone(): boolean {
  if (!storageAvailable()) return false;
  return localStorage.getItem(DONE_KEY) === "1";
}

export function shouldShowTutorialGate(): boolean {
  return !isTutorialSkipped() && !isTutorialDone();
}

export function setTutorialSkipped(): void {
  if (!storageAvailable()) return;
  localStorage.setItem(SKIPPED_KEY, "1");
}

export function setTutorialDone(): void {
  if (!storageAvailable()) return;
  localStorage.setItem(DONE_KEY, "1");
}

export function hasSeenTip(id: string): boolean {
  if (!storageAvailable()) return false;
  try {
    const raw = localStorage.getItem(SEEN_TIPS_KEY);
    if (!raw) return false;
    const list = JSON.parse(raw) as string[];
    return Array.isArray(list) && list.includes(id);
  } catch {
    return false;
  }
}

export function markTipSeen(id: string): void {
  if (!storageAvailable()) return;
  try {
    const raw = localStorage.getItem(SEEN_TIPS_KEY);
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (!list.includes(id)) list.push(id);
    localStorage.setItem(SEEN_TIPS_KEY, JSON.stringify(list));
  } catch {
    // ignore quota / parse errors
  }
}
