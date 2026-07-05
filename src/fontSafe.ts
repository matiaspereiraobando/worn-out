/**
 * Arcade bitmap font (assets/fonts/arcade) supports:
 * A-Z a-z 0-9 space and ! ? . : ( ) + - & =
 * No apostrophe, comma, quotes, $, accents, or brackets.
 */

/** Integer display for HUD / receipts / score (no locale commas or $). */
export function fmtArcadeNum(n: number): string {
  return String(Math.round(n));
}
