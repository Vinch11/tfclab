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
