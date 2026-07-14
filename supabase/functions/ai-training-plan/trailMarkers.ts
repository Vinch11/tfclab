/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PHASE 2A.2 — MIRROR-OF `src/lib/plan/trailMarkers.ts`
 * ═══════════════════════════════════════════════════════════════════════════════
 * Deno n'importe pas directement le module client (chemin `@/…`, module
 * TypeScript sans extension). Ce fichier duplique la source UNIQUE côté edge.
 * Un test d'égalité (`trailMarkers.mirror.test.ts`) garantit que les patterns
 * restent strictement identiques (source + flags) au module client.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export const TRAIL_DETAILS_CRITICAL_RX =
  /(?:\b\d{2,}\s*m\s*(?:de\s+)?D\+|\bD\+\s*\d{2,}\s*m?\b|montée\s+sèche|b[âa]tons|power[-\s]?hike|vertical[-\s]?km|\bVK\b|\ben\s+massif\b|\bmassif\s+(?:des?|du|central)\b|moyenne\s+montagne|\bardennes\b|\bvosges\b|\balpes\b|\bpyr[ée]n[ée]es\b|sentier\s+technique|trail\s+technique)/i;

export const TRAIL_DETAILS_WARNING_RX = /vallonn[ée]/i;
