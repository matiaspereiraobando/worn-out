import { CONFIG } from "../config";
import { PHRASES } from "../phrases";

export type ArchetypeId = "consumer" | "cannibal" | "technician" | "hustler" | "tenant";

export interface ArchetypeInput {
  buys: number;
  scraps: number;
  repairs: number;
  washes: number;
}

export interface ArchetypeResult {
  id: ArchetypeId;
  label: string;
  mult: number;
  bonusLine: string;
  manufacturerQuote: string;
  reasonLine: string;
}

function resolveArchetype(id: ArchetypeId, reasonLine: string): ArchetypeResult {
  const def = CONFIG.score.archetypes[id];
  return {
    id,
    label: def.label,
    mult: def.mult,
    bonusLine: PHRASES.archetypeBonusLines[id],
    manufacturerQuote: PHRASES.archetypeQuotes[id],
    reasonLine,
  };
}

/** First-match priority: consumer → cannibal → technician → hustler → tenant. */
export function detectArchetype(input: ArchetypeInput): ArchetypeResult {
  const { buys, scraps, repairs, washes } = input;

  if (buys > scraps) {
    return resolveArchetype("consumer", `${buys} bought vs ${scraps} scrapped`);
  }
  if (scraps > buys) {
    return resolveArchetype("cannibal", `${scraps} scrapped vs ${buys} bought`);
  }
  if (buys === 0 && repairs > 0 && repairs > scraps) {
    return resolveArchetype("technician", `${repairs} repairs, 0 new buys`);
  }
  if (washes >= 2 && washes > repairs) {
    return resolveArchetype("hustler", `${washes} wash payouts`);
  }
  return resolveArchetype("tenant", "No dominant play style");
}
