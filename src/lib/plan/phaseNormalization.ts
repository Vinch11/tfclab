/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Phase 2C.3 — Normalisation phase FICHE ↔ PHASE PLAN (source unique)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Consommée par :
 *   • `workoutCatalogBuilder` (pré-filtrage catalogue injecté par chunk)
 *   • `checksB10B11.flagsFor` (B11 phaseAllowed) — SOURCE UNIQUE
 *
 * Règle : les libellés libres du champ `when` (ex "Phase Spécifique (S9-S11)",
 * "Peak — J-14", "Taper/Race week") portent souvent une intention plus fine
 * que le tag `phase: PhaseTag[]` structuré (parfois erroné). On parse d'abord
 * `when`. Si aucun mot-clé phase reconnu → on retombe sur `phase[]`.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { LibraryWorkout, PhaseTag } from "@/types/workoutLibrary";

export type PlanPhase = "base" | "build" | "peak" | "taper";

/** Table de mapping mots-clés → phases plan. Ordre = importance (peak > build). */
const WHEN_KEYWORDS: Array<{ rx: RegExp; phase: PlanPhase; strength: "strong" | "weak" }> = [
  // ─── TAPER (le plus spécifique en premier) ────────────────────────────────
  { rx: /\btaper\b|\baff[uû]tage\b|\baff[uû]t\b|\brace[- ]?week\b|\bsemaine de course\b|\bJ\s*-\s*[1-6]\b/i, phase: "taper", strength: "strong" },
  { rx: /\bpre[- ]?race\b|\bpr[eé][- ]?course\b|\bpr[eé][- ]?comp[eé]tition\b/i, phase: "taper", strength: "weak" },

  // ─── PEAK / SPÉCIFIQUE ────────────────────────────────────────────────────
  { rx: /\bpeak\b/i, phase: "peak", strength: "strong" },
  { rx: /phase\s+sp[eé]cifique|phase\s+force\s*(?:&|et)\s*sp[eé]cifique/i, phase: "peak", strength: "strong" },
  { rx: /\bsp[eé]cifique\s+\d+K|\bsp[eé]cifique\s+70\.3|\bsp[eé]cifique\s+marathon|\bsp[eé]cifique\s+semi|\bsp[eé]cifique\s+IM/i, phase: "peak", strength: "strong" },
  { rx: /\bJ\s*-\s*(?:1[0-9]|2[0-1])\b/i, phase: "peak", strength: "strong" }, // J-10 à J-21
  { rx: /\bpr[eé][- ]?comp[eé]tition\b/i, phase: "peak", strength: "weak" },

  // ─── BUILD / DÉVELOPPEMENT ────────────────────────────────────────────────
  { rx: /\bbuild\b|\bd[eé]veloppement\b/i, phase: "build", strength: "strong" },
  { rx: /phase\s+d[eé]veloppement\s+moteur/i, phase: "build", strength: "strong" },
  { rx: /\bintroductive?\b/i, phase: "build", strength: "weak" },

  // ─── BASE / FONDATION ─────────────────────────────────────────────────────
  { rx: /\bbase\b|\bfondation\b|\bpr[eé]paration\s+g[eé]n[eé]rale\b/i, phase: "base", strength: "strong" },
];

/** Parse `when` free-text et renvoie l'ensemble des phases reconnues. */
export function parseWhenPhases(when: string | undefined | null): Set<PlanPhase> {
  const out = new Set<PlanPhase>();
  if (!when) return out;
  for (const { rx, phase } of WHEN_KEYWORDS) {
    if (rx.test(when)) out.add(phase);
  }
  return out;
}

/** Vérifie si `when` contient un mot-clé phase "fort" (=intention explicite). */
export function hasStrongPhaseKeyword(when: string | undefined | null): boolean {
  if (!when) return false;
  return WHEN_KEYWORDS.some(k => k.strength === "strong" && k.rx.test(when));
}

/**
 * Renvoie l'ensemble des phases plan autorisées pour une fiche.
 *
 * Règle :
 *   1. Si `when` contient au moins un mot-clé fort → utiliser parseWhenPhases(when)
 *      (source de vérité, écrase le tag `phase` structuré qui peut être erroné).
 *   2. Sinon si `phase[]` non vide → utiliser `phase[]` tel quel.
 *   3. Sinon → Set vide (fiche sans contrainte = disponible toute l'année).
 *
 * Cas mixtes : quand `when` n'a qu'un mot-clé faible (ex "pré-course"),
 * on prend l'UNION `phase[]` ∪ whenParsed pour rester tolérant.
 */
export function ficheAllowedPhases(fiche: LibraryWorkout): Set<PlanPhase> {
  const fromWhen = parseWhenPhases(fiche.when);
  const fromTag = new Set<PlanPhase>();
  for (const p of (fiche.phase ?? [])) {
    if (p === "base" || p === "build" || p === "peak" || p === "taper") fromTag.add(p);
  }
  if (hasStrongPhaseKeyword(fiche.when)) return fromWhen;
  if (fromWhen.size > 0 && fromTag.size > 0) {
    const union = new Set<PlanPhase>([...fromTag, ...fromWhen]);
    return union;
  }
  if (fromWhen.size > 0) return fromWhen;
  return fromTag;
}

/** True si la fiche est compatible avec au moins UNE des phases fournies (ou fiche libre). */
export function ficheCompatibleWithPhases(fiche: LibraryWorkout, phases: readonly PlanPhase[] | ReadonlySet<PlanPhase>): boolean {
  const allowed = ficheAllowedPhases(fiche);
  if (allowed.size === 0) return true; // pas de contrainte
  const set = phases instanceof Set ? phases : new Set<PlanPhase>(phases as readonly PlanPhase[]);
  for (const p of allowed) if (set.has(p)) return true;
  return false;
}
