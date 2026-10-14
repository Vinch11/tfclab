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
import { inferWeekType } from "@/engines/plan/sessionSizingMatrix";

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

/**
 * Audit "B-5K-BEGINNER round 2" (suite, JSON réel) : bug réel confirmé — le
 * réconciliateur a substitué un fartlek incompatible phase par
 * `LYDIARD_RUN_TRACK_VMA` en S1/S2 ("[phase_substituted] ... → LYDIARD_RUN_TRACK_VMA
 * (phase=base)"), alors que cette fiche déclare explicitement
 * `avoid:"...Directement en phase base"`. Cause racine : `when` = "Build/Peak
 * — phase 3 Lydiard. Après 16-24 semaines de **base** + 4-6 semaines de
 * collines." — le mot "base" apparaît dans une clause de PRÉREQUIS, pas dans
 * la déclaration d'éligibilité, mais `parseWhenPhases` matchait le texte
 * entier sans distinction.
 *
 * Convention vérifiée sur le catalogue (~145 fiches utilisant "—") :
 * `when` suit systématiquement `<PHASE(S) ÉLIGIBLES> — <prose/prérequis>`.
 * On ne regarde donc QUE le segment avant le premier "—"/"–" pour détecter
 * les mots-clés — et on ne retombe sur le texte entier (comportement legacy
 * inchangé) QUE si ce segment d'en-tête n'a produit AUCUN mot-clé, pour ne
 * jamais régresser sur les ~679 fiches sans ce séparateur.
 */
function phaseKeywordHeader(when: string): string {
  const idx = when.search(/[—–]/);
  return idx >= 0 ? when.slice(0, idx) : when;
}

function scanPhaseKeywords(text: string): Set<PlanPhase> {
  const out = new Set<PlanPhase>();
  for (const { rx, phase } of WHEN_KEYWORDS) {
    if (rx.test(text)) out.add(phase);
  }
  return out;
}

/** Parse `when` free-text et renvoie l'ensemble des phases reconnues. */
export function parseWhenPhases(when: string | undefined | null): Set<PlanPhase> {
  if (!when) return new Set();
  const header = phaseKeywordHeader(when);
  const fromHeader = scanPhaseKeywords(header);
  return fromHeader.size > 0 ? fromHeader : scanPhaseKeywords(when);
}

/** Vérifie si `when` contient un mot-clé phase "fort" (=intention explicite),
 *  avec la même priorité en-tête-puis-repli que `parseWhenPhases` ci-dessus. */
export function hasStrongPhaseKeyword(when: string | undefined | null): boolean {
  if (!when) return false;
  const header = phaseKeywordHeader(when);
  const headerHasStrong = WHEN_KEYWORDS.some(k => k.strength === "strong" && k.rx.test(header));
  if (headerHasStrong) return true;
  const headerHasAny = scanPhaseKeywords(header).size > 0;
  if (headerHasAny) return false; // en-tête avec un mot-clé faible seulement → pas de repli sur la prose
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

/**
 * Phase CATALOGUE ("base"|"build"|"peak"|"taper") d'une semaine donnée, calculée
 * numériquement depuis sa position dans le plan — jamais déduite d'un libellé
 * libre (`week.phase`/`week.theme` peuvent contenir un texte de récap humain
 * incohérent avec le calcul réel, cf. `normalizeWeeksPhases.ts`).
 *
 * Même seuils que la référence serveur `inferPhaseFromWeek` (jsonPlanHandler.ts)
 * et que son port client déjà existant (`planWindowRegen.ts::catalogPhaseForGlobalWeek`,
 * `inferWeekType` ici réutilisé directement) : taper = fenêtre
 * `taperWeeksForObjective(objective)` avant la course, puis base ≤30%,
 * build ≤70%, peak au-delà.
 *
 * Audit "B-5K-BEGINNER round 2" : `checksB10B11.ts::normalizedPhase()` et la
 * passe de réconciliation phase/catalogue (`planReconciler.ts`) lisaient
 * jusqu'ici `week.phase` en texte libre — source de deux défauts démontrés
 * (ordre de priorité peak-avant-build, retour `null` silencieux sur libellé
 * non reconnu). Cette fonction remplace cette lecture de texte libre là où
 * `weekNumber`/`totalWeeks` sont disponibles (toujours le cas sur `MergedPlan`).
 */
export function canonicalWeekPhase(
  weekNumber: number,
  totalWeeks: number,
  objective: string | null | undefined,
): PlanPhase {
  const weekType = inferWeekType(weekNumber, totalWeeks, objective);
  if (weekType === "taper" || weekType === "race") return "taper";
  const pct = weekNumber / Math.max(totalWeeks, 1);
  if (pct <= 0.30) return "base";
  if (pct <= 0.70) return "build";
  return "peak";
}

/** True si la fiche est compatible avec au moins UNE des phases fournies (ou fiche libre). */
export function ficheCompatibleWithPhases(fiche: LibraryWorkout, phases: readonly PlanPhase[] | ReadonlySet<PlanPhase>): boolean {
  const allowed = ficheAllowedPhases(fiche);
  if (allowed.size === 0) return true; // pas de contrainte
  const set = phases instanceof Set ? phases : new Set<PlanPhase>(phases as readonly PlanPhase[]);
  for (const p of allowed) if (set.has(p)) return true;
  return false;
}
