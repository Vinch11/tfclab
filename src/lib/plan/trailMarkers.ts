/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 2A.2 — Source UNIQUE des marqueurs "trail" utilisés par :
 *  - src/lib/plan/qa/checks.ts (B3)
 *  - src/lib/plan/mergePlanChunks.ts (validateSportObjective)
 *  - supabase/functions/ai-training-plan/trailMarkers.ts (MIRROR client → edge)
 *
 * Contraintes patterns (Phase 2A.2 task 2) :
 *  - PAS d'alternative `\+\d+m` (faux positifs sur "+ 400m souple", nat/CAP).
 *  - D+ chiffré couvert par :
 *      • `\d{2,}\s*m\s*(?:de\s+)?D\+`   → "800m D+", "800m de D+"
 *      • `\bD\+\s*\d{2,}\s*m?\b`        → "D+ 1200m", "D+1200"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export const TRAIL_DETAILS_CRITICAL_RX =
  /(?:\b\d{2,}\s*m\s*(?:de\s+)?D\+|\bD\+\s*\d{2,}\s*m?\b|montée\s+sèche|b[âa]tons|power[-\s]?hike|vertical[-\s]?km|\bVK\b|\ben\s+massif\b|\bmassif\s+(?:des?|du|central)\b|moyenne\s+montagne|\bardennes\b|\bvosges\b|\balpes\b|\bpyr[ée]n[ée]es\b|sentier\s+technique|trail\s+technique)/i;

export const TRAIL_DETAILS_WARNING_RX = /vallonn[ée]/i;

/**
 * Patterns d'IDs de séances trail — SOURCE DE VÉRITÉ UNIQUE.
 * Consommé par :
 *  - src/hooks/useAITrainingPlan.ts        (excludeIdPatterns → Stage 2 builder)
 *  - src/lib/workoutCatalogBuilder.ts      (hard-ban scoring)
 *  - src/lib/plan/qa/checks.ts             (B3 / B5 détection)
 *  - src/lib/plan/mergePlanChunks.ts       (validateSportObjective / B7)
 *  - supabase/functions/ai-training-plan/trailMarkers.ts (MIRROR edge)
 *
 * ⚠️ Toute divergence entre ces consommateurs = fuite trail. NE PAS recopier ce
 * tableau localement ; toujours l'importer d'ici.
 */
export const TRAIL_ID_PATTERNS: readonly RegExp[] = [
  /^HEDGEHOG_/i,
  /_HEDGEHOG_/i,
  /^URBAN_/i,
  /^TRAIL_/i,
  /_TRAIL_/i,
  /^[A-D]_TR(?:50)?_/i,
  /^EXPE_HORS_VILLE_/i,
  /^V3_TRAIL_/i,
];

/** Vrai si l'ID matche un pattern trail (toutes formes connues). */
export function isTrailCatalogId(id: string | null | undefined): boolean {
  if (!id) return false;
  return TRAIL_ID_PATTERNS.some((rx) => rx.test(id));
}

/**
 * Source de vérité unique « une séance est-elle trail ? » à partir d'une fiche
 * librairie (sport, tags, id). Insensible à la casse des tags.
 */
export function isTrailWorkout(w: {
  id?: string | null;
  sport?: string | null;
  tags?: readonly (string | null | undefined)[] | null;
}): boolean {
  if (isTrailCatalogId(w.id)) return true;
  if (String(w.sport ?? "").toLowerCase() === "trail") return true;
  return (w.tags ?? []).some((t) => String(t ?? "").toLowerCase() === "trail");
}
