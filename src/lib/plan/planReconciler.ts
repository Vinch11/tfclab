/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Reconciliateur déterministe post-génération (client-only)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Passe granularité SEMAINE (pas chunk). Pour chaque séance placée :
 *   1. PHASE       — si ficheAllowedPhases ne contient pas la phase de la semaine
 *                    → substituer par une fiche de même sport + même intention.
 *   2. DURÉE       — si sizing-matrix duration hors plage fiche
 *                    → substituer par candidat dont [dmin,dmax] la contient.
 *   3. DISCIPLINE  — si sport fiche ≠ sport séance
 *                    → substituer par fiche du bon sport / même intention.
 *   4. QUOTA
 *      a. FLOOR    — sport sous minimum ET 0 séance → INSÉRER depuis catalogue
 *      b. CEILING  — sport dépasse max → RETIRER la moins prioritaire
 *      c. re-vérifier SL floor via présence (déjà géré côté serveur, on ne
 *         casse rien : on préserve les séances key/SL des trims).
 *
 * Idempotence : max 2 passes ; en cas de conflit persistant → log
 * "reconcile_conflict" et on laisse B10/B11 le remonter.
 *
 * Contraintes :
 *   - Utilise `ficheAllowedPhases` (SOURCE UNIQUE avec B11).
 *   - Ne touche pas au traducteur d'intensités ni au parseur zone.
 *   - N'insère jamais silencieusement : chaque action journalisée.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { PlanChunk, PlanSession } from "@/lib/plan/planSchema";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import type { WeekQuotaEntry } from "@/lib/plan/validateWeeklyQuotas";
import { computePlanDiversity, formatDiversitySummary } from "./diversityMetrics";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import { ficheAllowedPhases, canonicalWeekPhase, type PlanPhase } from "@/lib/plan/phaseNormalization";
import { intentFamilyOf } from "@/lib/plan/intentFamily";
import { buildRepairWorkoutMetadata } from "@/lib/plan/repairCatalogMetadata";
import {
  evaluateRepairSportingEquivalence,
  type RepairIntentFamily,
} from "../../../supabase/functions/_shared/repairSportingEquivalence";
import { extractLimiterKeywords } from "@/lib/plan/limiterKeywords";
import { startToRunMaxSessionMin } from "@/engines/plan/sessionSizingMatrix";
import { isRaceSimIncompatibleWithObjective } from "./raceSimCompatibility";
import { isLevelPrerequisiteIncompatible, type BeginnerIntensitySignal } from "./levelPrerequisiteCompatibility";
import {
  parseAthleteConstraints,
  toConstraintSport,
  constraintSportLabel,
  WEEK_DAYS,
  type AthleteConstraintRules,
  type WeekDay,
} from "@/lib/plan/constraintRules";


// ── Types ───────────────────────────────────────────────────────────────────
type SchemaSport = "swim" | "bike" | "run" | "brick" | "strength" | "recovery" | "rest";
type NormSport = SchemaSport | "other";

export interface ReconcilerCounters {
  phase_substituted: number;
  phase_unresolved: number;
  id_substituted_duration: number;
  duration_unresolved: number;
  discipline_substituted: number;
  discipline_unresolved: number;
  quota_floor_inserted_from_catalog: number;
  quota_floor_unresolved: number;
  quota_ceiling_trimmed: number;
  reconcile_conflict: number;
  id_remapped_to_neighbor: number;
  id_remap_no_intent_match_fallback_custom: number;
  zone_hydrated?: number;
  early_consolidation_replaced?: number;
  taper_weeks_enforced?: number;
  s2r_duration_capped?: number;
  s2r_week_resequenced?: number;
  post_bike_run_moved?: number;
  post_bike_claim_neutralized?: number;
  s2r_ladder_smoothed?: number;
  s2r_long_run_removed?: number;
  race_day_inserted?: number;
  constraint_day_moved?: number;
  constraint_day_unresolved?: number;
  constraint_banned_sport_removed?: number;
  /** P0 "B-5K-BEGINNER round 2" : maxSessionsPerDay dépassé → séance déplacée
   *  vers le jour de la semaine le moins chargé encore sous le plafond. */
  max_sessions_per_day_moved?: number;
  /** Aucun jour de la semaine ne peut accueillir la séance sous le plafond
   *  (calendrier impossible) → laissée en place, jamais supprimée silencieusement. */
  max_sessions_per_day_unresolved?: number;
  /** Nombre d'occurrences de la fiche la plus répétée dans le plan final. */
  diversity_max_repeat?: number;
  /** Doublon de catalogId détecté DANS LA MÊME SEMAINE (introduit par les
   *  substitutions phase/durée/discipline ci-dessus, dont le ledger ne fait
   *  que pénaliser sans exclure) — remplacé par une alternative. */
  week_duplicate_replaced?: number;
  /** Même détection, mais aucune alternative disponible — doublon conservé
   *  tel quel, signalé plutôt que dégradé au hasard. */
  week_duplicate_unresolved?: number;
  /** Cumul de séances "à jeun" (Train Low/Sleep Low/Fasted) détecté DANS LA
   *  MÊME SEMAINE — introduit par les substitutions ci-dessus, qui n'ont
   *  aucune notion de ce plafond (contrairement au réconciliateur serveur) —
   *  remplacé par une alternative non-fasted. */
  week_fasted_cap_replaced?: number;
  /** Même détection, mais aucune alternative non-fasted disponible — cumul
   *  conservé tel quel, signalé plutôt que dégradé au hasard. */
  week_fasted_cap_unresolved?: number;
  /** P1 "B-5K-BEGINNER round 2" (consigne coach, suite PR #376) : séance de
   *  famille "vo2" en excès (au-delà de `demandingSessionCap`) dans une
   *  semaine d'un débutant confirmé (signal de niveau fiable) — DOWNGRADÉE
   *  vers une alternative threshold/easy plutôt que détectée après coup. */
  demanding_accumulation_downgraded?: number;
  /** Même détection, mais aucune alternative threshold/easy disponible —
   *  séance conservée telle quelle (jamais de suppression silencieuse), le
   *  conflit reste signalé et sera re-détecté par validateDemandingSessionAccumulation. */
  demanding_accumulation_unresolved?: number;

}


export interface ReconcilerResult {
  counters: ReconcilerCounters;
  logs: string[];
}

// ── Ledger de diversité (P0 anti-répétition) ────────────────────────────────
// Le réconciliateur choisissait toujours le MÊME « meilleur » remplaçant pour
// un triplet (sport, phase, durée) donné, faute d'état partagé entre sessions.
// Résultat : convergence mécanique vers un petit sous-ensemble de fiches sur
// un plan de 12-16 semaines. Le ledger compte les usages de chaque catalogId
// dans le plan courant et pénalise (puis exclut) les fiches sur-représentées.
export type UsageLedger = Map<string, number>;

/** Au-delà de ce nombre d'occurrences, une fiche n'est plus proposée en
 *  remplacement (sauf si aucun autre candidat n'existe). */
const MAX_FICHE_REPEATS = 3;
/** Pénalité de score par occurrence déjà placée. L'échelle d'intention vaut
 *  100 pts par point : 25 départage à intention égale sans jamais renverser
 *  une intention supérieure. */
const DIVERSITY_PENALTY = 25;

function ledgerKey(id: string | null | undefined): string {
  return String(id ?? "").toUpperCase();
}
function ledgerCount(ledger: UsageLedger | undefined, id: string | null | undefined): number {
  if (!ledger) return 0;
  return ledger.get(ledgerKey(id)) ?? 0;
}
function ledgerInc(ledger: UsageLedger | undefined, id: string | null | undefined): void {
  if (!ledger) return;
  const k = ledgerKey(id);
  if (!k) return;
  ledger.set(k, (ledger.get(k) ?? 0) + 1);
}
function ledgerDec(ledger: UsageLedger | undefined, id: string | null | undefined): void {
  if (!ledger) return;
  const k = ledgerKey(id);
  if (!k) return;
  const next = (ledger.get(k) ?? 0) - 1;
  if (next > 0) ledger.set(k, next);
  else ledger.delete(k);
}
/** Construit le ledger à partir de l'état courant du plan. */
function buildUsageLedger(chunks: PlanChunk[]): UsageLedger {
  const ledger: UsageLedger = new Map();
  for (const chunk of chunks) {
    for (const week of chunk.weeks ?? []) {
      for (const s of (week.sessions ?? []) as PlanSession[]) {
        if ((s as any).isRest || s.sport === "rest") continue;
        if (s.custom) continue;
        if (s.catalogId) ledgerInc(ledger, s.catalogId);
      }
    }
  }
  return ledger;
}



// ── Index fiches ────────────────────────────────────────────────────────────
const FICHES_BY_ID: Map<string, LibraryWorkout> = (() => {
  const m = new Map<string, LibraryWorkout>();
  for (const w of WorkoutLibrary) m.set(w.id.toUpperCase(), w);
  return m;
})();
const REPAIR_METADATA_BY_ID = new Map(
  WorkoutLibrary.map(workout => [workout.id.toUpperCase(), buildRepairWorkoutMetadata(workout)]),
);
function ficheFor(id: string | null | undefined): LibraryWorkout | null {
  if (!id) return null;
  return FICHES_BY_ID.get(id.toUpperCase()) ?? null;
}

// ── Normalisation sport ────────────────────────────────────────────────────
function normSport(s: string | null | undefined): NormSport {
  const x = (s ?? "").toLowerCase();
  if (x === "swim" || x === "natation") return "swim";
  if (x === "bike" || x === "cyclisme" || x === "vélo" || x === "velo") return "bike";
  if (x === "run" || x === "course" || x === "trail") return "run";
  if (x === "brick") return "brick";
  if (x === "strength" || x === "renforcement" || x === "renfo" || x === "str") return "strength";
  if (x === "recovery" || x === "récup" || x === "recup" || x === "récupération") return "recovery";
  if (x === "rest" || x === "repos" || x === "off") return "rest";
  return "other";
}

// ── Helpers fiche ──────────────────────────────────────────────────────────
// Exportée (P1, audit "B-5K-BEGINNER round 2") : réutilisée par
// workoutCatalogBuilder.ts pour le filtre d'intensité niveau-débutant —
// même définition de famille d'intensité partout (source unique).
export function ficheMainZoneMax(w: LibraryWorkout): number {
  const mains = (w.structure || []).filter(p => /main/i.test(p.part || ""));
  let mx = 0;
  for (const p of mains) for (const z of (p.zones || [])) {
    const m = String(z).match(/z\s*([1-7])/i);
    if (m) mx = Math.max(mx, Number(m[1]));
  }
  return mx;
}

/**
 * Audit réel (B-5K-BEGINNER, 15/10) : une semaine de décharge dont la note
 * coach ("Semaine allégée. Réduire l'intensité, rester strictement en
 * Z1-Z2...") plafonne explicitement l'intensité ne voyait ce plafond
 * vérifié qu'après coup (QA check B11, `checksB10B11.ts::extractCapZone`
 * — même regex, redéclarée ici plutôt qu'importée depuis un module QA :
 * la production ne doit pas dépendre de `src/lib/plan/qa/`, même patron
 * d'indépendance que `levelPrerequisiteCompatibility.ts`). Jamais consulté
 * par le réconciliateur au moment de choisir un candidat — `findReplacement`
 * pouvait donc réintroduire une fiche dépassant ce plafond (cas réel :
 * `A_RUN_FARTLEK_LIBRE`, Main jusqu'en Z4, substituée dans une semaine
 * plafonnée Z2). Ce plafond est PAR SEMAINE (`week.weeklyNotes`, posé par
 * l'IA à la génération) — jamais plan-entier, donc jamais inséré dans
 * `PhaseCtx` (constant pour tout le run) : chaque site d'appel de
 * `findReplacement` le calcule localement depuis la semaine qu'il traite
 * déjà, comme `weekPhase`/`targetDur`.
 */
export function extractWeekZoneCap(coachNotes: string | null | undefined): number | null {
  if (!coachNotes) return null;
  const rx1 = /ne pas d[ée]passer\s*z\s*([1-7])/i;
  const rx2 = /max(?:imum)?\s*z\s*([1-7])/i;
  const rx3 = /z\s*1\s*[-–]\s*z\s*([1-7])\s*(?:uniquement|only)?/i;
  const m = coachNotes.match(rx1) || coachNotes.match(rx2) || coachNotes.match(rx3);
  return m ? Number(m[1]) : null;
}
function resolveRepairWeekType(
  week: { weeklyNotes?: string | null; theme?: string | null },
  quota?: WeekQuotaEntry | null,
): string {
  if (quota?.weekType) return String(quota.weekType);
  const text = `${week.theme ?? ""} ${week.weeklyNotes ?? ""}`.toLowerCase();
  return /recovery|deload|d[ée]charge|r[ée]cup|r[ée]g[ée]n[ée]ration/.test(text) ? "recovery" : "load";
}
function resolveRepairWeekZoneCap(
  week: { weeklyNotes?: string | null; theme?: string | null },
  quota?: WeekQuotaEntry | null,
): number | null {
  return extractWeekZoneCap(week.weeklyNotes) ?? (resolveRepairWeekType(week, quota) === "recovery" ? 2 : null);
}
function ficheMedian(w: LibraryWorkout): number {
  const [a, b] = w.durationMin;
  return Math.round((a + b) / 2);
}
function ficheDurationContains(w: LibraryWorkout, dur: number): boolean {
  const [a, b] = w.durationMin;
  return dur >= a && dur <= b;
}

// ── Famille d'intensité (easy/threshold/vo2) ────────────────────────────────
// Audit "B-5K-BEGINNER round 2" (consigne coach, suite PR #376) : une
// réparation de durée/phase ne doit jamais transformer silencieusement une
// séance d'endurance facile en séance VO2max/lactique/sprint/VMA. Jusqu'ici
// cette famille ne servait qu'à un bonus de score SOUPLE dans intentScore
// (+2 points) — insuffisant pour empêcher un candidat de famille différente
// de l'emporter quand c'est le seul (ou le mieux noté) match sport/phase/
// durée disponible. Partagé par intentScore (bonus souple, inchangé) et par
// le garde-fou DUR de findReplacement ci-dessous (requireFamily/original).
export type IntensityFamily = "easy" | "threshold" | "vo2";
export function intensityFamily(zoneMax: number): IntensityFamily {
  return zoneMax <= 2 ? "easy" : zoneMax <= 4 ? "threshold" : "vo2";
}

// ── Score d'intention (même cat, goals partagés, famille zone) ─────────────
function intentScore(original: LibraryWorkout, candidate: LibraryWorkout): number {
  let score = 0;
  if (original.cat && candidate.cat && original.cat === candidate.cat) score += 4;
  const og = new Set((original.goals ?? []) as string[]);
  const cg = new Set((candidate.goals ?? []) as string[]);
  let shared = 0;
  for (const g of og) if (cg.has(g)) shared++;
  score += shared * 2;
  if (intensityFamily(ficheMainZoneMax(original)) === intensityFamily(ficheMainZoneMax(candidate))) score += 2;
  if (original.necessite === candidate.necessite) score += 1;
  return score;
}

/** Fix B3 (audit "génération de plan IA") + fix "traitement des limiteurs"
 *  (généralisation à TOUS les limiteurs identifiés, pas seulement L1) : même
 *  mécanisme que jsonPlanHandler.ts::bestLimiterRank côté serveur — renvoie
 *  le rang (0 = L1, 1 = L2, ...) du limiteur le plus critique dont un
 *  mot-clé apparaît dans l'objectif/la structure de la fiche, ou `null` si
 *  aucun limiteur identifié ne matche. Un athlète a couramment 3-4
 *  limiteurs classés — se limiter à L1 laissait L2+ sans aucun ciblage
 *  mécanique à l'insertion/substitution. */
function limiterMatchRank(w: LibraryWorkout, keywordsByRank: string[][]): number | null {
  if (keywordsByRank.length === 0) return null;
  const struct = (w.structure || []).map(p => p.text).join(" ");
  const text = `${w.objectif ?? w.id} ${struct}`.toLowerCase();
  for (let rank = 0; rank < keywordsByRank.length; rank++) {
    if (keywordsByRank[rank].some(kw => text.includes(kw.toLowerCase()))) return rank;
  }
  return null;
}
/** Bonus dominant (avant intention/durée/diversité) pour une fiche ciblant
 *  un limiteur identifié — même priorité absolue que le tri à 2 niveaux du
 *  serveur (rang du limiteur d'abord, proximité de durée ensuite). Décroît
 *  avec le rang (L1 > L2 > L3 > ...) mais reste, à chaque rang réaliste
 *  (jusqu'à une dizaine de limiteurs), très supérieur à la plage réaliste
 *  d'`intent*100` (max ~700) pour garantir qu'un match limiteur l'emporte
 *  toujours sur un candidat non ciblé, intention/durée/diversité ne servant
 *  que de départage AU SEIN de chaque groupe (matché à un rang donné /
 *  non matché). */
const LIMITER_MATCH_BONUS = 100_000;
const LIMITER_RANK_DECAY = 1_000;

// Même motif que le réconciliateur SERVEUR (jsonPlanHandler.ts, bloc (c2)) :
// Train Low, Sleep Low, Fasted run/bike sont TOUS la même stratégie
// physiologique (glycogène bas) sous des noms différents.
const FASTED_SESSION_PATTERN = /\bjeun\b|fasted|sleep[\s_-]*low|train[\s_-]*low/i;
function ficheIsFastedPattern(w: LibraryWorkout): boolean {
  const text = `${w.objectif ?? w.id} ${(w.structure || []).map(p => p.text).join(" ")}`;
  return FASTED_SESSION_PATTERN.test(text);
}
function sessionIsFastedPattern(s: PlanSession): boolean {
  return FASTED_SESSION_PATTERN.test(`${s.title ?? ""} ${s.details ?? ""}`);
}

// ── Contexte particulier NON CONFIRMÉ (Sleep Low, Altitude, FatMax, fatigue
// mentale) ──────────────────────────────────────────────────────────────
// Audit "B-5K-BEGINNER round 3" (JSON réel 2026-10-14, consigne coach) :
// findReplacement a remplacé une sortie longue facile STANDARD (SEILER_RUN_
// Z1_EASY_LONG, originellement choisie par Gemini) par FM_RUN_SLEEP_LOW_AM
// (S5) puis par V2_RUN_MENTAL_FATIGUE (S7) — uniquement parce que leur durée
// convenait, sans jamais vérifier qu'elles imposent un contexte (déplétion
// glycogénique nocturne, accès altitude >1500m, protocole de pré-fatigue
// cognitive) dont rien dans PlanConfig/athleteData ne confirme la
// disponibilité ou l'acceptation par l'athlète. Réutilise des métadonnées
// EXISTANTES — aucune nouvelle taxonomie :
//  - `ficheIsFastedPattern` (déjà défini ci-dessus) couvre Sleep Low/Train
//    Low/jeun.
//  - Préfixe ID "FM_" — module FatMax/Sleep-Low/Train-Low/Gut-Training
//    (enrichedWorkoutsFatMax.ts, 28 fiches) : chacune porte déjà un `avoid`
//    conditionné à "athlète non habitué"/"non validé"/"si Phase N non
//    validée" — le module entier documente lui-même un besoin de
//    confirmation préalable.
//  - Tags `altitude`/`fatigue-cognitive` — seules fiches du catalogue
//    portant ces tags (vérifié exhaustivement), hors module FM_.
// Comportement CONSERVATEUR (consigne coach) : exclue comme remplaçant SAUF
// si la séance D'ORIGINE portait déjà ce même contexte — jamais introduit
// par une réparation de durée/phase/discipline, mais jamais retiré non plus
// si déjà présent (une réparation de durée sur un Sleep Low existant reste
// un Sleep Low, elle ne doit juste pas inventer un NOUVEAU contexte spécial).
/**
 * Mission 2B (audit "sécurisation du catalogue injecté à Gemini", suite
 * PR #377) : ce garde-fou protégeait déjà `findReplacement` ci-dessous,
 * mais rien n'empêchait Gemini de choisir directement une de ces fiches
 * depuis le catalogue initial (`workoutCatalogBuilder.ts::buildWorkoutCatalog`)
 * — confirmé empiriquement sur le run réel B-5K-BEGINNER du 14/10 :
 * `CANOVA_RUN_INTRODUCTIVE_PHASE`/`FM_RUN_FATMAX_ZONE`/`ENR_ALTITUDE_EASY_RUN`/
 * `V2_RUN_MENTAL_FATIGUE` étaient bien présentes dans le catalogue transmis.
 * `ficheUnconfirmedContextReason` expose désormais LE MOTIF (pas seulement
 * un booléen) pour permettre à `buildWorkoutCatalog` de lever l'exclusion
 * UNIQUEMENT si ce motif précis est explicitement confirmé par l'appelant
 * (`options.confirmedSpecialContexts`) — jamais par défaut, l'absence
 * d'information n'étant jamais une confirmation.
 */
export type UnconfirmedContextReason = "fasted" | "fatmax_module" | "altitude" | "fatigue_cognitive" | "heat";

export function ficheUnconfirmedContextReason(w: LibraryWorkout): UnconfirmedContextReason | null {
  if (ficheIsFastedPattern(w)) return "fasted";
  if (String(w.id || "").toUpperCase().startsWith("FM_")) return "fatmax_module";
  const tags = (w.tags || []).map((t) => String(t).toLowerCase());
  if (tags.includes("heat") || tags.includes("sauna") || /(?:^|_)HEAT(?:_|$)/i.test(w.id)) return "heat";
  if (tags.includes("altitude")) return "altitude";
  if (tags.includes("fatigue-cognitive")) return "fatigue_cognitive";
  return null;
}

function ficheRequiresUnconfirmedContext(w: LibraryWorkout): boolean {
  return ficheUnconfirmedContextReason(w) !== null;
}

function introducesHeatContext(candidate: LibraryWorkout, original?: LibraryWorkout | null): boolean {
  return ficheUnconfirmedContextReason(candidate) === "heat" &&
    (!original || ficheUnconfirmedContextReason(original) !== "heat");
}

interface FindOpts {
  sport: NormSport;
  weekPhase: PlanPhase;
  targetDur: number;
  original?: LibraryWorkout | null;
  requireDurationContains?: boolean;
  requirePhase?: boolean;
  /** Si fourni, restreint les candidats aux IDs présents dans cet ensemble
   *  (catalogue effectivement injecté au LLM). Évite d'introduire par
   *  substitution phase/durée/discipline un ID absent du catalogue, ce qui
   *  reproduirait un FAIL B5 après coup. */
  restrictToIds?: Set<string>;
  /** Ledger d'usage du plan courant : pénalise/exclut les fiches déjà
   *  sur-représentées pour éviter la convergence vers toujours la même fiche. */
  ledger?: UsageLedger;
  /** Exclusion STRICTE (pas une pénalité) des catalogId déjà placés dans la
   *  semaine ciblée — utilisé par dedupeWithinWeek ci-dessous. Contrairement
   *  au ledger (pénalité globale -25, insuffisante dès que deux candidats
   *  ont un score d'intention différent — l'écart dépasse quasi toujours 25
   *  une fois multiplié ×100), cette exclusion garantit qu'un remplacement
   *  ne réintroduit jamais un doublon dans la même semaine. */
  excludeIdsThisWeek?: Set<string>;
  /** Exclut tout candidat matchant FASTED_SESSION_PATTERN (Train Low/Sleep
   *  Low/Fasted) — utilisé par dedupeFastedWithinWeek pour ne jamais
   *  réintroduire un cumul de séances à jeun en cherchant un remplacement. */
  excludeFastedPattern?: boolean;
  /** Fix B3 + fix "traitement des limiteurs" : mots-clés de TOUS les
   *  limiteurs identifiés de l'athlète, par rang (L1 en tête) — cf.
   *  limiterKeywords.ts. Une fiche matchant un rang plus critique est
   *  préférée à toute autre, avant intention/durée/diversité. */
  limiterKeywordsByRank?: string[][];
  /**
   * Audit "B-5K-BEGINNER round 2" (consigne coach, suite PR #376) — garde-fou
   * DUR (pas un bonus de score) : exclut tout candidat dont la famille
   * d'intensité (easy/threshold/vo2, via `intensityFamily`) diffère de celle
   * exigée. Deux sources, jamais combinées (l'explicite prime) :
   *  - `requireFamily` explicite — utilisé par l'insertion FLOOR (pas
   *    d'`original` à comparer) quand le plancher est spécifiquement une
   *    sortie longue facile (SL run/bike), jamais pour un plancher générique
   *    de présence (renfo, etc.) où aucune intention n'est déclarée.
   *  - `preserveOriginalFamily: true` — dérive la famille requise d'`original`
   *    SI elle est déterminable (`ficheMainZoneMax(original) > 0`). Réservé
   *    aux réparations qui ne remettent PAS en cause le bien-fondé de la
   *    séance d'origine (durée hors plage, doublon intra-semaine, cumul à
   *    jeun) : la substitution ne doit alors jamais changer de famille.
   *    La règle structurée d'équivalence conserve toujours l'intention fine,
   *    y compris pour une réparation de phase. Ce filtre historique ajoute
   *    un garde-fou de zone aux chemins qui le demandent explicitement.
   * Si ce filtre exclut tous les candidats → `findReplacement` renvoie
   * `null` comme n'importe quel autre filtre dur (phase/durée) : l'appelant
   * traite ça comme "non résolu", JAMAIS comme un repli vers une famille
   * différente — cf. consigne coach "conserver la séance initiale et
   * signaler le conflit est préférable à introduire une séance
   * physiologiquement incompatible."
   */
  requireFamily?: IntensityFamily;
  preserveOriginalFamily?: boolean;
  /**
   * P1 (audit "B-5K-BEGINNER round 2", consigne coach) — exclusion DURE de
   * toute fiche de cette famille, utilisée par `enforceDemandingAccumulation`
   * pour faire baisser une semaine en excès de séances "vo2" vers "threshold"
   * ou "easy" (jamais "VMA/côtes/fartlek interdits en général" — seule
   * l'accumulation est corrigée, une séance isolée de cette famille reste
   * autorisée ailleurs dans le plan).
   */
  excludeFamily?: IntensityFamily;
  /**
   * Mission 2D (palier 1, consigne coach) : distance de l'objectif courant
   * (ex. "5K"/"10K", même convention que `PhaseCtx.objectiveKey` /
   * `normalizeObjectiveKey`) — permet d'exclure les 5 fiches *_RACE_SIM
   * nominatives dont l'incompatibilité avec cette distance a été démontrée
   * (cf. raceSimCompatibility.ts), à CHAQUE étage de réparation (phase/
   * durée/discipline/floor/dédoublonnage), exactement comme le garde-fou
   * `ficheUnconfirmedContextReason` pour l'axe B. Jamais introduit par
   * défaut si absent (`undefined` → aucune exclusion, cohérent avec le
   * reste du fichier : l'absence d'info n'est jamais traitée comme une
   * incompatibilité).
   */
  objectiveKey?: string | null;
  /**
   * Mission Axe C (consigne coach) : signal de niveau d'entraînement
   * (même convention que `options.beginnerIntensitySignal` côté catalogue)
   * — permet d'exclure les 8 fiches à prérequis de niveau confirmé (cf.
   * levelPrerequisiteCompatibility.ts) à CHAQUE étage de réparation,
   * exactement comme `objectiveKey` pour l'axe A. Jamais introduit par
   * défaut si absent.
   */
  levelSignal?: BeginnerIntensitySignal | null;
  /**
   * Audit réel (B-5K-BEGINNER, 15/10) : plafond de zone de la semaine
   * ciblée (`extractWeekZoneCap(week.weeklyNotes)`), calculé par chaque
   * site d'appel depuis la semaine qu'il traite déjà — jamais plan-entier,
   * donc jamais dans `PhaseCtx`. `null`/absent = aucune semaine plafonnée
   * détectée, aucune exclusion (même convention que `objectiveKey`/
   * `levelSignal` : l'absence d'info n'est jamais traitée comme une
   * incompatibilité).
   */
  weekZoneCap?: number | null;
  /** Source fiable du caractère recovery/deload, issue des quotas quand disponible. */
  weekType?: string | null;
  /** Explicit destination intents for a repair whose purpose is load reduction. */
  allowedCandidateIntentFamilies?: RepairIntentFamily[];
}

function findReplacement(opts: FindOpts, excludeId?: string): LibraryWorkout | null {
  const { sport, weekPhase, targetDur, original, restrictToIds, ledger, limiterKeywordsByRank, excludeIdsThisWeek, excludeFastedPattern, objectiveKey, levelSignal, weekZoneCap, weekType } = opts;
  const requireDur = opts.requireDurationContains !== false;
  const requirePhase = opts.requirePhase !== false;
  const originalZoneMax = original ? ficheMainZoneMax(original) : 0;
  const requiredFamily: IntensityFamily | null =
    opts.requireFamily ?? (opts.preserveOriginalFamily && originalZoneMax > 0 ? intensityFamily(originalZoneMax) : null);
  // Audit "B-5K-BEGINNER round 3" (consigne coach) : garde-fou TOUJOURS actif
  // (pas un opt-in comme preserveOriginalFamily) — aucune réparation, quel
  // que soit l'étage (phase/durée/discipline/floor/dédoublonnage), ne doit
  // introduire un contexte spécial non confirmé que la séance d'origine ne
  // portait pas déjà. Cf. docstring ficheRequiresUnconfirmedContext.
  const originalRequiresContext = !!(original && ficheRequiresUnconfirmedContext(original));
  let best: { w: LibraryWorkout; key: number } | null = null;
  // Repli si TOUS les candidats valides sont déjà saturés (usage ≥ MAX) :
  // mieux vaut une répétition qu'une séance non résolue.
  let saturatedBest: { w: LibraryWorkout; key: number } | null = null;
  for (const w of WorkoutLibrary) {
    if (excludeId && w.id.toUpperCase() === excludeId.toUpperCase()) continue;
    if (restrictToIds && !restrictToIds.has(w.id.toUpperCase())) continue;
    if (excludeIdsThisWeek && excludeIdsThisWeek.has(w.id.toUpperCase())) continue;
    if (excludeFastedPattern && ficheIsFastedPattern(w)) continue;
    if (!originalRequiresContext && ficheRequiresUnconfirmedContext(w)) continue;
    // Un contexte altitude/jeûne ne constitue jamais un accord pour la chaleur.
    if (introducesHeatContext(w, original)) continue;
    if (isRaceSimIncompatibleWithObjective(w.id, objectiveKey)) continue;
    if (isLevelPrerequisiteIncompatible(w.id, levelSignal)) continue;
    if (weekZoneCap != null && ficheMainZoneMax(w) > weekZoneCap) continue;
    if (normSport(w.sport) !== sport) continue;
    const sportingCompatibility = evaluateRepairSportingEquivalence(
      original ? REPAIR_METADATA_BY_ID.get(original.id.toUpperCase()) : null,
      REPAIR_METADATA_BY_ID.get(w.id.toUpperCase()),
      {
        objective: objectiveKey,
        phase: weekPhase,
        weekType,
        operation: original ? "replacement" : "insertion",
        allowedCandidateIntentFamilies: opts.allowedCandidateIntentFamilies,
      },
    );
    if (!sportingCompatibility.compatible) continue;
    if (requiredFamily && intensityFamily(ficheMainZoneMax(w)) !== requiredFamily) continue;
    if (opts.excludeFamily && intensityFamily(ficheMainZoneMax(w)) === opts.excludeFamily) continue;
    if (requirePhase) {
      const allowed = ficheAllowedPhases(w);
      if (allowed.size > 0 && !allowed.has(weekPhase)) continue;
    }
    if (requireDur && targetDur > 0 && !ficheDurationContains(w, targetDur)) continue;
    const durPenalty = targetDur > 0 ? Math.abs(ficheMedian(w) - targetDur) / 10 : 0;
    const intent = original ? intentScore(original, w) : 0;
    const usage = ledgerCount(ledger, w.id);
    const limiterRank = limiterMatchRank(w, limiterKeywordsByRank ?? []);
    const limiterBonus = limiterRank === null ? 0 : Math.max(0, LIMITER_MATCH_BONUS - limiterRank * LIMITER_RANK_DECAY);
    // maximize limiter match (rang le plus critique d'abord), then intent, tiebreak by duration proximity, penalize repetition
    const key = limiterBonus + intent * 100 - durPenalty - usage * DIVERSITY_PENALTY;
    if (usage >= MAX_FICHE_REPEATS) {
      if (!saturatedBest || key > saturatedBest.key) saturatedBest = { w, key };
      continue;
    }
    if (!best || key > best.key) best = { w, key };
  }
  return (best ?? saturatedBest)?.w ?? null;
}


// ── Mutation session avec fiche ────────────────────────────────────────────
function assignFiche(session: PlanSession, fiche: LibraryWorkout, keepDuration?: number, ledger?: UsageLedger): void {
  const mut = session as any;
  // Ledger : la fiche sortante libère une occurrence, l'entrante en consomme une.
  if (ledger) {
    if (mut.catalogId) ledgerDec(ledger, mut.catalogId);
    ledgerInc(ledger, fiche.id);
  }
  const struct = (fiche.structure || []).map(p => `${p.part}: ${p.text}`).join(" | ");
  const zones = new Set<string>();
  for (const p of (fiche.structure || [])) for (const z of (p.zones || [])) zones.add(z);
  mut.title = fiche.objectif || fiche.id;
  mut.details = `${struct}. [ID: ${fiche.id}]`;
  mut.catalogId = fiche.id;
  mut.custom = false;
  mut.zones = Array.from(zones);
  mut.sport = normSport(fiche.sport);
  const [a, b] = fiche.durationMin;
  if (typeof keepDuration === "number" && keepDuration > 0) {
    mut.durationMin = Math.min(b, Math.max(a, keepDuration));
  } else if ((session.durationMin ?? 0) < a || (session.durationMin ?? 0) > b) {
    mut.durationMin = Math.round((a + b) / 2);
  }
}

/**
 * Contexte de résolution de phase, partagé par les passes ci-dessous.
 * `totalWeeks`/`weekOffset` = plan ENTIER (cf. RunReconcilerOptions.globalTotalWeeks/
 * globalWeekOffset), pas seulement les semaines couvertes par `chunks`.
 */
interface PhaseCtx {
  totalWeeks: number;
  weekOffset: number;
  objectiveKey: string | null | undefined;
  /**
   * Mission Axe C (consigne coach) : même signal que `beginnerIntensitySignal`
   * côté catalogue (`workoutCatalogBuilder.ts`) — propagé ici une seule fois
   * depuis `RunReconcilerOptions.beginnerIntensitySignal` (déjà reçu par
   * `runReconciler` pour `enforceDemandingAccumulation`, mais jamais
   * jusqu'ici accessible à `findReplacement`). `PhaseCtx` est déjà partagé
   * par les 4 fonctions qui appellent `findReplacement` (`runOnePass`,
   * `dedupeWithinWeek`, `dedupeFastedWithinWeek`, `enforceDemandingAccumulation`)
   * — l'ajouter ici évite de threader un 2e paramètre dans ces 4 signatures.
   */
  beginnerIntensitySignal?: BeginnerIntensitySignal | null;
}

/**
 * Audit "B-5K-BEGINNER round 2" (suite, consigne coach) : `week.phase`
 * peut être soit le `zPhase` auto-déclaré par le LLM (base/build/peak/taper),
 * soit déjà réécrit en libellé humain par `normalizeWeeksAndPhases` (ex:
 * "Phase 1 — Adaptation & Socle Aérobie", confirmé sur le JSON réel) — un
 * libellé que les passes ci-dessous ne doivent jamais reparser en texte
 * libre. Mais `week.phase`, MÊME syntaxiquement valide (un des 4 enums
 * propres), reste une AUTO-DÉCLARATION du LLM, jamais recroisée avec sa
 * position réelle dans le plan — rien n'empêchait jusqu'ici le LLM de se
 * tromper lui-même (déclarer "build" pour sa semaine 1 alors qu'elle est
 * numériquement "base"), ce qui neutralisait silencieusement tout contrôle
 * de compatibilité phase/fiche en aval. Consigne explicite : ne jamais faire
 * confiance à `week.phase`, quelle que soit sa forme — la phase CATALOGUE
 * utilisée pour vérifier l'éligibilité est TOUJOURS recalculée numériquement
 * (`canonicalWeekPhase`, mêmes seuils que la référence serveur
 * `inferPhaseFromWeek`), jamais déduite de ce que le LLM a écrit.
 */
function resolveWeekPhase(_rawPhase: string, weekNumber: number, ctx?: PhaseCtx): PlanPhase {
  // `ctx` est toujours fourni par runReconciler (jamais omis en pratique) ;
  // ce repli ne sert qu'à garder `phaseCtx` optionnel dans la signature des
  // passes ci-dessous (ordre des paramètres TS) sans jamais retomber sur
  // `_rawPhase` — repli numérique degénéré (semaine = totalWeeks) plutôt
  // qu'une confiance aveugle dans l'auto-déclaration du LLM.
  if (!ctx) return canonicalWeekPhase(weekNumber, weekNumber, undefined);
  return canonicalWeekPhase(weekNumber + ctx.weekOffset, ctx.totalWeeks, ctx.objectiveKey);
}

// ── Passe unique ───────────────────────────────────────────────────────────
function runOnePass(
  chunks: PlanChunk[],
  quotasByWeek: Record<number, WeekQuotaEntry>,
  counters: ReconcilerCounters,
  logs: string[],
  restrictToIds?: Set<string>,
  ledger?: UsageLedger,
  limiterKeywordsByRank?: string[][],
  phaseCtx?: PhaseCtx,
): boolean {
  let anyChange = false;
  const ctx: { week?: number; day?: string; sport?: string; catalogId?: string | null; family?: string } = {};
  try {

  for (const chunk of chunks) {
    for (const week of chunk.weeks ?? []) {
      const weekPhase = resolveWeekPhase(week.phase, week.weekNumber, phaseCtx);
      const quotaEntry = quotasByWeek[week.weekNumber] ?? null;

      // ── STEP 1-3 : per-session substitutions ───────────────────────────
      for (const s of (week.sessions ?? []) as PlanSession[]) {
        if ((s as any).isRest || s.sport === "rest") continue;
        if (s.custom) continue; // custom = pas de fiche à contrôler
        const fiche = ficheFor(s.catalogId);
        if (!fiche) continue;
        ctx.week = week.weekNumber; ctx.day = s.day; ctx.sport = s.sport; ctx.catalogId = s.catalogId;

        // 1. PHASE
        ctx.family = "phase";
        const allowed = ficheAllowedPhases(fiche);
        if (allowed.size > 0 && !allowed.has(weekPhase)) {
          const repl = findReplacement({
            sport: normSport(s.sport),
            weekPhase,
            targetDur: s.durationMin ?? 0,
            original: fiche,
            restrictToIds,
            ledger,
            limiterKeywordsByRank,
            objectiveKey: phaseCtx?.objectiveKey,
            levelSignal: phaseCtx?.beginnerIntensitySignal,
            weekZoneCap: resolveRepairWeekZoneCap(week, quotaEntry),
            weekType: resolveRepairWeekType(week, quotaEntry),
          }, fiche.id);
          if (repl) {
            const before = fiche.id;
            assignFiche(s, repl, s.durationMin, ledger);
            counters.phase_substituted++;
            anyChange = true;
            logs.push(`[phase_substituted] W${week.weekNumber}/${s.day} ${before}(${[...allowed].join(",")}) → ${repl.id} (phase=${weekPhase})`);
            continue; // re-evaluate on next pass
          } else {
            counters.phase_unresolved++;
            logs.push(`[phase_unresolved] W${week.weekNumber}/${s.day} sport=${s.sport} fiche=${fiche.id} weekPhase=${weekPhase} allowed=${[...allowed].join(",")}`);
          }
        }

        // Reload fiche after possible mutation
        const fiche2 = ficheFor(s.catalogId);
        if (!fiche2) continue;

        // 2. DURÉE
        ctx.family = "durée";
        const targetDur = s.durationMin ?? 0;
        if (targetDur > 0 && !ficheDurationContains(fiche2, targetDur)) {
          const repl = findReplacement({
            sport: normSport(s.sport),
            weekPhase,
            targetDur,
            original: fiche2,
            requireDurationContains: true,
            restrictToIds,
            ledger,
            limiterKeywordsByRank,
            // Audit "B-5K-BEGINNER round 2" (consigne coach) : une réparation
            // de DURÉE ne doit jamais changer la famille d'intensité (easy/
            // threshold/vo2) — la fiche d'origine n'est pas en cause ici,
            // seule sa durée l'est.
            preserveOriginalFamily: true,
            objectiveKey: phaseCtx?.objectiveKey,
            levelSignal: phaseCtx?.beginnerIntensitySignal,
            weekZoneCap: resolveRepairWeekZoneCap(week, quotaEntry),
            weekType: resolveRepairWeekType(week, quotaEntry),
          }, fiche2.id);
          if (repl) {
            const before = fiche2.id;
            assignFiche(s, repl, targetDur, ledger);
            counters.id_substituted_duration++;
            anyChange = true;
            logs.push(`[id_substituted_duration] W${week.weekNumber}/${s.day} ${before}(${fiche2.durationMin[0]}-${fiche2.durationMin[1]}) → ${repl.id} target=${targetDur}min`);
          } else {
            counters.duration_unresolved++;
            logs.push(`[reconcile_conflict] W${week.weekNumber}/${s.day} durée ${targetDur}min hors plage fiche ${fiche2.id} ${fiche2.durationMin[0]}-${fiche2.durationMin[1]} — pas de candidat phase=${weekPhase} sport=${s.sport}`);
            counters.reconcile_conflict++;
          }
        }

        // 3. DISCIPLINE
        ctx.family = "discipline";
        const fiche3 = ficheFor(s.catalogId);
        if (!fiche3) continue;
        const fSp = normSport(fiche3.sport);
        const iSp = normSport(s.sport);
        if (fSp !== "other" && iSp !== "other" && fSp !== iSp) {
          const repl = findReplacement({
            sport: iSp,
            weekPhase,
            targetDur: s.durationMin ?? 0,
            original: fiche3,
            restrictToIds,
            ledger,
            limiterKeywordsByRank,
            objectiveKey: phaseCtx?.objectiveKey,
            levelSignal: phaseCtx?.beginnerIntensitySignal,
            weekZoneCap: resolveRepairWeekZoneCap(week, quotaEntry),
            weekType: resolveRepairWeekType(week, quotaEntry),
          }, fiche3.id);
          if (repl) {
            const before = fiche3.id;
            assignFiche(s, repl, s.durationMin, ledger);
            counters.discipline_substituted++;
            anyChange = true;
            logs.push(`[discipline_substituted] W${week.weekNumber}/${s.day} ${before}(${fSp}) → ${repl.id}(${iSp})`);
          } else {
            counters.discipline_unresolved++;
            logs.push(`[reconcile_conflict] W${week.weekNumber}/${s.day} discipline: session=${iSp} fiche=${fiche3.id}(${fSp}) — pas de candidat`);
            counters.reconcile_conflict++;
          }
        }
      }

      // ── STEP 4 : QUOTAS ─────────────────────────────────────────────────
      if (!quotaEntry) continue;
      const q = quotaEntry.quota;
      const floors = quotaEntry.floors;
      const isTaperOrRace = quotaEntry.weekType === "race";

      // Recompte
      const bySport = new Map<string, PlanSession[]>();
      for (const s of (week.sessions ?? []) as PlanSession[]) {
        if ((s as any).isRest || s.sport === "rest") continue;
        const arr = bySport.get(s.sport) ?? [];
        arr.push(s);
        bySport.set(s.sport, arr);
      }
      const cnt = (sp: string) => (bySport.get(sp)?.length ?? 0);
      // Bug réel corrigé (audit "génération de plan IA", volet composition
      // hebdomadaire) : le plancher FLOOR ci-dessous ne se déclenchait que si
      // `cnt(sport) === 0` (aucune séance de ce sport DU TOUT) — un sport
      // avec 2-3 séances toutes classées récupération/technique passait sans
      // jamais recevoir de séance de qualité. `cntKey` compte les séances
      // réellement marquées `isKeySession` (signal posé par l'IA elle-même,
      // même source de confiance que la ligne de trim CEILING plus bas).
      const cntKey = (sp: string) => (bySport.get(sp)?.filter(s => (s as any).isKeySession === true).length ?? 0);

      // 4a. FLOOR — insertion depuis catalogue
      ctx.family = "quota-floor"; ctx.week = week.weekNumber; ctx.day = undefined; ctx.sport = undefined; ctx.catalogId = undefined;
      if (!isTaperOrRace) {
        const specs: Array<{ sport: SchemaSport; min: number }> = [
          { sport: "swim", min: q.swim.min },
          { sport: "bike", min: q.bike.min },
          { sport: "run", min: q.run.min },
          { sport: "strength", min: q.strength.min },
        ];
        // Disciplines endurance concernées par le plancher "séance clé", pas
        // "séance quelconque" — renfo garde l'ancien critère de présence
        // simple (sa notion de "clé" n'a pas le même sens).
        const KEY_FLOOR_SPORTS = new Set<SchemaSport>(["swim", "bike", "run"]);
        for (const sp of specs) {
          if (sp.min < 1) continue;
          if (KEY_FLOOR_SPORTS.has(sp.sport) ? cntKey(sp.sport) > 0 : cnt(sp.sport) > 0) continue;
          // Audit "B-5K-BEGINNER round 2" (consigne coach) : un plancher SL
          // (sortie longue run/bike) est SANS AMBIGUÏTÉ une séance facile —
          // `requireFamily: "easy"` l'impose en dur, jamais seulement un bonus
          // de score. Pas appliqué au plancher générique de présence (ex.
          // renfo), qui ne porte aucune intention "facile" déclarée.
          const isSLFloor =
            (sp.sport === "bike" && floors.longRideWeekly && !!floors.slLongRideMin) ||
            (sp.sport === "run" && floors.longRunWeekly && !!floors.slLongRunMin);
          const floor =
            sp.sport === "bike" && floors.longRideWeekly && floors.slLongRideMin ? floors.slLongRideMin :
            sp.sport === "run" && floors.longRunWeekly && floors.slLongRunMin ? floors.slLongRunMin :
            sp.sport === "strength" ? 45 : 60;
          const repl = findReplacement({
            sport: sp.sport as NormSport,
            weekPhase,
            targetDur: floor,
            original: null,
            requireDurationContains: true,
            restrictToIds,
            ledger,
            limiterKeywordsByRank,
            requireFamily: isSLFloor ? "easy" : undefined,
            objectiveKey: phaseCtx?.objectiveKey,
            levelSignal: phaseCtx?.beginnerIntensitySignal,
            weekZoneCap: resolveRepairWeekZoneCap(week, quotaEntry),
            weekType: resolveRepairWeekType(week, quotaEntry),
          });
          if (!repl) {
            counters.quota_floor_unresolved++;
            logs.push(`[reconcile_conflict] W${week.weekNumber} floor ${sp.sport}: min=${sp.min} présent=0 pas de fiche catalogue phase=${weekPhase} ≥${floor}min`);
            counters.reconcile_conflict++;
            continue;
          }
          const dayCounts = new Map<string, number>();
          for (const s of (week.sessions ?? []) as PlanSession[]) {
            dayCounts.set(s.day, (dayCounts.get(s.day) ?? 0) + 1);
          }
          const targetDay = (["mardi","jeudi","samedi","dimanche","mercredi","vendredi","lundi"] as const)
            .find(d => (dayCounts.get(d) ?? 0) < q.maxSessionsPerDay) ?? "mercredi";
          const [a, b] = repl.durationMin;
          const dur = Math.min(b, Math.max(a, floor));
          const zones = new Set<string>();
          for (const p of (repl.structure || [])) for (const z of (p.zones || [])) zones.add(z);
          const struct = (repl.structure || []).map(p => `${p.part}: ${p.text}`).join(" | ");
          const newSess: any = {
            day: targetDay,
            title: repl.objectif || repl.id,
            details: `${struct}. [ID: ${repl.id}]`,
            isKeySession: floor >= 60,
            durationMin: dur,
            zones: Array.from(zones),
            sport: sp.sport,
            custom: false,
            catalogId: repl.id,
          };
          (week.sessions as any[]).push(newSess);
          ledgerInc(ledger, repl.id);
          counters.quota_floor_inserted_from_catalog++;
          anyChange = true;
          logs.push(`[quota_floor_inserted_from_catalog] W${week.weekNumber} ${sp.sport} min=${sp.min} inséré ${repl.id} (${dur}min) le ${targetDay}`);
        }
      }

      // 4b. CEILING — trim
      ctx.family = "quota-ceiling";
      const trimSpecs: Array<{ sport: SchemaSport; max: number }> = [
        { sport: "swim", max: q.swim.max },
        { sport: "bike", max: q.bike.max },
        { sport: "run", max: q.run.max },
        { sport: "strength", max: q.strength.max },
      ];
      for (const sp of trimSpecs) {
        // recompute (may have inserted above)
        const arr = ((week.sessions ?? []) as PlanSession[]).filter(s => s.sport === sp.sport);
        if (arr.length <= sp.max) continue;
        // Priorité de retrait : plus haut = retirer d'abord
        const scored = arr.map(s => {
          let removeScore = 0;
          if ((s as any).isKeySession) removeScore -= 100;
          const fSp = normSport(sp.sport);
          const dur = s.durationMin ?? 0;
          if (sp.sport === "bike" && floors.slLongRideMin && dur >= floors.slLongRideMin) removeScore -= 80;
          if (sp.sport === "run" && floors.slLongRunMin && dur >= floors.slLongRunMin) removeScore -= 80;
          const zMax = (() => {
            let mx = 0;
            for (const z of (s.zones ?? [])) {
              const m = String(z).match(/z\s*([1-7])/i);
              if (m) mx = Math.max(mx, Number(m[1]));
            }
            return mx;
          })();
          if (zMax <= 2) removeScore += 5;
          if (zMax >= 5) removeScore -= 10;
          // sessions courtes Z1/Z2 = premières à sauter
          if (dur > 0 && dur < 60 && zMax <= 2) removeScore += 10;
          return { s, removeScore };
        }).sort((a, b) => b.removeScore - a.removeScore);
        const toRemove = arr.length - sp.max;
        for (let k = 0; k < toRemove; k++) {
          const victim = scored[k];
          if (!victim || victim.removeScore < 0) {
            logs.push(`[reconcile_conflict] W${week.weekNumber} ${sp.sport} surplus=${arr.length}>max=${sp.max} — aucune séance non-clé à retirer`);
            counters.reconcile_conflict++;
            break;
          }
          const idx = (week.sessions as PlanSession[]).indexOf(victim.s);
          if (idx >= 0) {
            (week.sessions as PlanSession[]).splice(idx, 1);
            counters.quota_ceiling_trimmed++;
            anyChange = true;
            logs.push(`[quota_ceiling_trimmed] W${week.weekNumber} ${sp.sport} max=${sp.max} retiré ${victim.s.day} "${victim.s.title}" (${victim.s.durationMin}min, catalogId=${victim.s.catalogId ?? "custom"})`);
          }
        }
      }
    }
  }

  return anyChange;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(
      `❌ [reconciler_exception] family=${ctx.family ?? "?"} W${ctx.week ?? "?"}/${ctx.day ?? "?"} sport=${ctx.sport ?? "?"} catalogId=${ctx.catalogId ?? "?"} — ${e instanceof Error ? `${e.name}: ${e.message}` : String(e)}`,
      e,
    );
    logs.push(`[reconciler_exception] family=${ctx.family ?? "?"} W${ctx.week ?? "?"}/${ctx.day ?? "?"} sport=${ctx.sport ?? "?"} catalogId=${ctx.catalogId ?? "?"} — ${e instanceof Error ? e.message : String(e)}`);
    throw e;
  }
}

// ── Dédoublonnage intra-semaine (filet final) ──────────────────────────────
// Audit qualité plans IA (plan "Vince", 10K) : les substitutions phase/durée/
// discipline ci-dessus (runOnePass) peuvent choisir DEUX FOIS la même fiche
// de remplacement pour deux séances différentes de la MÊME semaine (ex:
// "Test tlim@vVO2max Billat" mardi ET mercredi, "Volume aérobie Lydiard"
// mardi ET mercredi). Cause : le ledger de diversité ne fait que PÉNALISER
// une fiche déjà utilisée (-25 par occurrence), il ne l'exclut qu'au-delà de
// MAX_FICHE_REPEATS (3, compté sur tout le plan) — or l'écart de score
// d'intention entre deux candidats différents est presque toujours ≥100
// (intentScore × 100), donc la pénalité de 25 ne suffit jamais à départager
// deux candidats non strictement à égalité. Pour une fiche très spécifique
// (test diagnostique, volume Base type Lydiard) où il n'existe quasiment
// aucune alternative de même phase/sport/durée, la même fiche "gagne" deux
// fois de suite. Filet final, même logique que le réconciliateur SERVEUR
// (jsonPlanHandler.ts, bloc (c) DÉDOUBLONNAGE) : garde la 1re occurrence
// intacte, tente une alternative hors fiches déjà placées cette semaine pour
// les suivantes (exclusion STRICTE, pas une pénalité), sinon signale sans
// dégrader silencieusement.
function dedupeWithinWeek(
  chunks: PlanChunk[],
  counters: ReconcilerCounters,
  logs: string[],
  ledger?: UsageLedger,
  restrictToIds?: Set<string>,
  phaseCtx?: PhaseCtx,
  quotasByWeek?: Record<number, WeekQuotaEntry>,
): void {
  for (const ch of chunks) {
    for (const wk of ch.weeks ?? []) {
      const weekPhase = resolveWeekPhase(wk.phase, wk.weekNumber, phaseCtx);
      const quotaEntry = quotasByWeek?.[wk.weekNumber] ?? null;
      const seenIds = new Set<string>();
      for (const s of (wk.sessions ?? []) as PlanSession[]) {
        if (s.sport === "rest") continue;
        if (s.custom) continue;
        const id = s.catalogId;
        if (!id) continue;
        const key = id.toUpperCase();
        if (!seenIds.has(key)) {
          seenIds.add(key);
          continue;
        }

        // Doublon détecté (2e+ occurrence de `key` cette semaine).
        const original = ficheFor(id);
        const repl = findReplacement({
          sport: normSport(s.sport),
          weekPhase,
          targetDur: s.durationMin ?? 0,
          original,
          restrictToIds,
          ledger,
          excludeIdsThisWeek: seenIds,
          // Audit "B-5K-BEGINNER round 2" : un doublon se résout en cherchant
          // une AUTRE fiche du même rôle, jamais en changeant de famille.
          preserveOriginalFamily: true,
          objectiveKey: phaseCtx?.objectiveKey,
          levelSignal: phaseCtx?.beginnerIntensitySignal,
          weekZoneCap: resolveRepairWeekZoneCap(wk, quotaEntry),
          weekType: resolveRepairWeekType(wk, quotaEntry),
        }, id);
        if (repl) {
          assignFiche(s, repl, s.durationMin, ledger);
          seenIds.add(repl.id.toUpperCase());
          counters.week_duplicate_replaced = (counters.week_duplicate_replaced ?? 0) + 1;
          logs.push(
            `[week_duplicate_replaced] S${wk.weekNumber} ${s.day} ${id} (déjà présent cette semaine) → ${repl.id}`,
          );
        } else {
          counters.week_duplicate_unresolved = (counters.week_duplicate_unresolved ?? 0) + 1;
          logs.push(
            `[week_duplicate_unresolved] S${wk.weekNumber} ${s.day} ${id} dupliqué cette semaine — aucune alternative disponible (phase=${weekPhase}, sport=${s.sport})`,
          );
        }
      }
    }
  }
}

// ── Plafond cumul "à jeun" intra-semaine (filet final) ─────────────────────
// Audit qualité plans IA (plan "Vince", 10K) : même angle mort que
// dedupeWithinWeek ci-dessus, mais pour le plafond "1 séance à jeun/semaine
// max" (Train Low, Sleep Low, Fasted — cf. FASTED_SESSION_PATTERN) — ce
// plafond n'existe QUE côté réconciliateur SERVEUR (jsonPlanHandler.ts, bloc
// (c2)), jamais côté client. La substitution phase/durée/discipline
// ci-dessus (runOnePass) peut donc choisir une fiche "à jeun" en
// remplacement d'une séance phase-incompatible, sans jamais vérifier si la
// semaine en a déjà une — réintroduisant un cumul que le serveur avait
// pourtant respecté à la génération. Même logique que le serveur : garde la
// 1re occurrence intacte, tente une alternative NON-fasted pour les
// suivantes, sinon signale sans dégrader silencieusement.
function dedupeFastedWithinWeek(
  chunks: PlanChunk[],
  counters: ReconcilerCounters,
  logs: string[],
  ledger?: UsageLedger,
  restrictToIds?: Set<string>,
  phaseCtx?: PhaseCtx,
  quotasByWeek?: Record<number, WeekQuotaEntry>,
): void {
  for (const ch of chunks) {
    for (const wk of ch.weeks ?? []) {
      const weekPhase = resolveWeekPhase(wk.phase, wk.weekNumber, phaseCtx);
      const quotaEntry = quotasByWeek?.[wk.weekNumber] ?? null;
      const sessions = (wk.sessions ?? []) as PlanSession[];
      const fastedSessions = sessions.filter(s => s.sport !== "rest" && sessionIsFastedPattern(s));
      if (fastedSessions.length < 2) continue;

      // Catalogue déjà utilisé cette semaine (hors les séances à jeun
      // elles-mêmes, gérées séparément) — évite qu'un remplacement non-fasted
      // réintroduise un doublon de catalogId que dedupeWithinWeek vient de corriger.
      const otherUsedIds = new Set<string>();
      for (const s of sessions) {
        if (s.sport === "rest" || s.custom || !s.catalogId) continue;
        otherUsedIds.add(s.catalogId.toUpperCase());
      }

      for (let i = 1; i < fastedSessions.length; i++) {
        const s = fastedSessions[i];
        const id = s.custom ? null : s.catalogId;
        const original = id ? ficheFor(id) : null;
        const repl = findReplacement({
          sport: normSport(s.sport),
          weekPhase,
          targetDur: s.durationMin ?? 0,
          original,
          restrictToIds,
          ledger,
          excludeIdsThisWeek: otherUsedIds,
          excludeFastedPattern: true,
          // Audit "B-5K-BEGINNER round 2" : remplacer une séance à jeun
          // excédentaire par une alternative non-fasted ne doit pas non plus
          // changer de famille d'intensité (ex. une sortie longue à jeun
          // facile ne doit pas devenir une séance qualité non-fasted).
          preserveOriginalFamily: true,
          // This repair deliberately removes the fasted/fatmax context while
          // retaining an easy aerobic session of the same sport and load.
          allowedCandidateIntentFamilies: ["endurance_fondamentale", "recuperation"],
          objectiveKey: phaseCtx?.objectiveKey,
          levelSignal: phaseCtx?.beginnerIntensitySignal,
          weekZoneCap: resolveRepairWeekZoneCap(wk, quotaEntry),
          weekType: resolveRepairWeekType(wk, quotaEntry),
        }, id ?? undefined);
        const label = id ?? "custom";
        if (repl) {
          assignFiche(s, repl, s.durationMin, ledger);
          otherUsedIds.add(repl.id.toUpperCase());
          counters.week_fasted_cap_replaced = (counters.week_fasted_cap_replaced ?? 0) + 1;
          logs.push(
            `[week_fasted_cap_replaced] S${wk.weekNumber} ${s.day} ${label} (${fastedSessions.length}× à jeun cette semaine) → ${repl.id}`,
          );
        } else {
          counters.week_fasted_cap_unresolved = (counters.week_fasted_cap_unresolved ?? 0) + 1;
          logs.push(
            `[week_fasted_cap_unresolved] S${wk.weekNumber} ${s.day} ${label} — ${fastedSessions.length}× séance à jeun cette semaine, aucune alternative non-fasted disponible (phase=${weekPhase}, sport=${s.sport})`,
          );
        }
      }
    }
  }
}

// ── Hydratation de zone (filet post-génération) ────────────────────────────
// Réutilise ficheMainZoneMax (déjà défini plus haut). Ne touche QUE les séances
// non-custom dont l'instance ne contient PAS la zone-max de la fiche
// (dilution réelle, même critère que B10). Ajout non-destructif : la zone-max
// est insérée dans le tableau `zones`, les zones existantes (warm-up, récup)
// sont conservées.
const CARDIO_SPORTS_FOR_HYDRATION = new Set<NormSport>(["swim", "bike", "run", "brick"]);
function instanceMaxZone(s: PlanSession): number {
  let mx = 0;
  for (const z of ((s as any).zones ?? [])) {
    const m = String(z).match(/z\s*([1-7])/i);
    if (m) mx = Math.max(mx, Number(m[1]));
  }
  return mx;
}
function hydrateDilutedZones(
  chunks: PlanChunk[],
  counters: ReconcilerCounters,
  logs: string[],
): void {
  for (const ch of chunks) {
    for (const wk of ch.weeks ?? []) {
      for (const s of (wk.sessions ?? []) as PlanSession[]) {
        if ((s as any).custom === true) continue;
        const id = (s as any).catalogId as string | null | undefined;
        if (!id) continue;
        const fiche = ficheFor(id);
        if (!fiche) continue;
        const sp = normSport(fiche.sport);
        if (!CARDIO_SPORTS_FOR_HYDRATION.has(sp)) continue;
        const fMax = ficheMainZoneMax(fiche);
        if (fMax < 3) continue; // fiche facile → pas de bloc intense à garantir
        const zonesArr: string[] = ((s as any).zones ?? []).map((z: unknown) => String(z));
        const already = zonesArr.some(z => new RegExp(`z\\s*${fMax}`, "i").test(z));
        if (already) continue;
        const iMax = instanceMaxZone(s);
        const cur = new Set<string>(zonesArr);
        cur.add(`Z${fMax}`);
        (s as any).zones = Array.from(cur);
        counters.zone_hydrated = (counters.zone_hydrated ?? 0) + 1;
        logs.push(
          `[zone_hydrated] S${wk.weekNumber} ${(s as any).day ?? ""} · ${id} — bloc intense Z${fMax} restauré (instance était max Z${iMax})`,
        );
      }
    }
  }
}

// ── Semaine de consolidation impossible avant S4 ───────────────────────────
// La fiche S2R_CONSOLIDATION_WEEK_SESSION demande de « répéter exactement le
// format de la semaine précédente » : elle n'a aucun sens en S1-S3 (il n'y a
// pas encore de volume antérieur à répéter). Filet déterministe : on la
// remplace par la fiche marche-course de base et on réécrit le texte.
const CONSOLIDATION_ID = "S2R_CONSOLIDATION_WEEK_SESSION";
const CONSOLIDATION_MIN_WEEK = 4;
const CONSOLIDATION_FALLBACK_ID = "S2R_WALK_RUN_1_2";

function ficheToText(f: LibraryWorkout): string {
  return (f.structure ?? [])
    .map(p => `${p.part}: ${p.text}`)
    .join(" | ");
}

function fixEarlyConsolidationSessions(
  chunks: PlanChunk[],
  counters: ReconcilerCounters,
  logs: string[],
): void {
  const fallback = ficheFor(CONSOLIDATION_FALLBACK_ID);
  if (!fallback) return;
  for (const ch of chunks) {
    for (const wk of ch.weeks ?? []) {
      if ((wk.weekNumber ?? 0) >= CONSOLIDATION_MIN_WEEK) continue;
      for (const s of (wk.sessions ?? []) as PlanSession[]) {
        if ((s as any).catalogId !== CONSOLIDATION_ID) continue;
        const compatibility = evaluateRepairSportingEquivalence(
          REPAIR_METADATA_BY_ID.get(CONSOLIDATION_ID),
          REPAIR_METADATA_BY_ID.get(fallback.id.toUpperCase()),
          { objective: "start_to_run", phase: String(wk.phase ?? "base"), operation: "replacement" },
        );
        if (!compatibility.compatible) {
          logs.push(`[early_consolidation_unresolved] S${wk.weekNumber} ${CONSOLIDATION_ID} — alternative ${fallback.id} non équivalente (${compatibility.reasons.join(",")})`);
          continue;
        }
        (s as any).catalogIdOrigin = CONSOLIDATION_ID;
        (s as any).catalogId = fallback.id;
        (s as any).title = fallback.objectif;
        (s as any).details = `${ficheToText(fallback)} [ID: ${fallback.id}]`;
        counters.early_consolidation_replaced =
          (counters.early_consolidation_replaced ?? 0) + 1;
        logs.push(
          `[early_consolidation_replaced] S${wk.weekNumber} ${(s as any).day ?? ""} ${CONSOLIDATION_ID} → ${fallback.id} (palier impossible avant S${CONSOLIDATION_MIN_WEEK})`,
        );
      }
    }
  }
}

// ── Start to Run : plafond déterministe de durée + interdiction "sortie longue"
// Un plan Start to Run s'adresse à un débutant ou à une reprise post-blessure
// grave : aucune séance ne doit dépasser le plafond hebdo (35 min en S1-S2 →
// 60 min en fin de plan), et le vocabulaire "sortie longue" est banni au profit
// de "marche-course progressive".
const S2R_LONG_RUN_RE = /sortie longue|long ?run|SL\b/i;

function capStartToRunSessions(
  chunks: PlanChunk[],
  counters: ReconcilerCounters,
  logs: string[],
): void {
  for (const ch of chunks) {
    for (const wk of ch.weeks ?? []) {
      const weekNumber = wk.weekNumber ?? 1;
      const cap = startToRunMaxSessionMin(weekNumber);
      for (const s of (wk.sessions ?? []) as PlanSession[]) {
        const sport = String((s as any).sport ?? "").toLowerCase();
        if (sport === "rest") continue;
        // Renfo fondation : 30 min max quelle que soit la semaine.
        const localCap = sport === "strength" ? Math.min(30, cap) : cap;
        const dur = (s as any).durationMin ?? 0;
        if (dur > localCap) {
          (s as any).durationMin = localCap;
          counters.s2r_duration_capped = (counters.s2r_duration_capped ?? 0) + 1;
          logs.push(
            `[s2r_duration_capped] S${weekNumber} ${(s as any).day ?? ""} "${(s as any).title ?? ""}" ${dur}min → ${localCap}min (plafond débutant)`,
          );
        }
        const title = String((s as any).title ?? "");
        if (S2R_LONG_RUN_RE.test(title)) {
          (s as any).title = title
            .replace(/sortie longue/gi, "marche-course progressive")
            .replace(/long ?run/gi, "marche-course progressive")
            .replace(/\bSL\b/g, "marche-course");
          (s as any).isLongSession = false;
          counters.s2r_long_run_removed = (counters.s2r_long_run_removed ?? 0) + 1;
          logs.push(
            `[s2r_long_run_removed] S${weekNumber} ${(s as any).day ?? ""} "${title}" → "${(s as any).title}" (pas de sortie longue en Start to Run)`,
          );
        }
      }
    }
  }
}

// ── Start to Run : échelle de progression marche-course ────────────────────
// Rang croissant = exposition à l'impact croissante (ratio course/marche puis
// course continue). Deux filets déterministes en découlent :
//  (1) intra-semaine : la première séance de la semaine doit être la plus
//      douce (première exposition), la dernière la plus exigeante ;
//  (2) inter-semaines : pas de saut de plus d'un palier d'une semaine à
//      l'autre (progression graduelle — pas de S7 → S9 sans marche
//      intermédiaire).
const S2R_LADDER: Record<string, number> = {
  S2R_WALK_RUN_1_2: 1,
  S2R_WALK_RUN_2_2: 2,
  S2R_WALK_RUN_3_1: 3,
  S2R_WALK_RUN_5_1: 4,
  S2R_CONTINUOUS_15: 5,
  S2R_CONTINUOUS_20_25: 6,
  S2R_CONTINUOUS_30_LONG: 7,
  S2R_FIRST_5K_WALK_RUN: 8,
};
const S2R_BY_RANK = new Map<number, string>(
  Object.entries(S2R_LADDER).map(([id, r]) => [r, id]),
);

const DAY_RANK: Record<string, number> = {
  lundi: 0, mardi: 1, mercredi: 2, jeudi: 3, vendredi: 4, samedi: 5, dimanche: 6,
};

/**
 * Cohérence "run sur jambes fatiguées" : certaines fiches (durabilité IM, LCW,
 * off-legs) affirment explicitement un gros vélo la veille. Si le placement réel
 * ne le vérifie pas, l'énoncé devient faux pour l'athlète.
 * Stratégie : 1) déplacer la séance au lendemain du plus gros vélo de la semaine
 * si le créneau est libre ; 2) sinon neutraliser l'affirmation dans le texte.
 */
const PREV_DAY_BIKE_CLAIM_RX =
  /\(?\s*lendemain\s+(?:d'un\s+|d'une\s+|du\s+|de\s+la\s+)?(?:gros|grosse|longue?|long)\s+(?:v[ée]lo|sortie\s+v[ée]lo|SST[^).,;]*)[^).,;]*\)?|sur\s+jambes\s+(?:fatigu[ée]es\s+)?(?:v[ée]lo\s+)?(?:de\s+la\s+)?veille|jambes\s+lourdes\s+veille/gi;
const NEUTRAL_CLAIM = "en fatigue accumulée de fin de bloc";
const LONG_BIKE_MIN = 90;

function alignPostBikeRunClaims(
  chunks: PlanChunk[],
  counters: ReconcilerCounters,
  logs: string[],
): void {
  for (const ch of chunks) {
    for (const wk of ch.weeks ?? []) {
      const sessions = (wk.sessions ?? []) as PlanSession[];
      const rankOf = (s: PlanSession) => DAY_RANK[String((s as any).day ?? "").toLowerCase()] ?? -1;
      const bikes = sessions.filter(
        s => ["bike", "brick"].includes(String((s as any).sport)) && Number((s as any).durationMin ?? 0) >= LONG_BIKE_MIN,
      );
      const occupied = new Set(sessions.map(rankOf));

      for (const s of sessions) {
        if (String((s as any).sport) !== "run") continue;
        const text = `${(s as any).title ?? ""} ${(s as any).details ?? ""}`;
        if (!PREV_DAY_BIKE_CLAIM_RX.test(text)) continue;
        PREV_DAY_BIKE_CLAIM_RX.lastIndex = 0;

        const r = rankOf(s);
        const satisfied = bikes.some(b => rankOf(b) === r - 1);
        if (satisfied) continue;

        // 1) tentative de replacement au lendemain du plus gros vélo
        const biggest = bikes
          .slice()
          .sort((a, b) => Number((b as any).durationMin ?? 0) - Number((a as any).durationMin ?? 0))[0];
        const targetRank = biggest ? rankOf(biggest) + 1 : -1;
        const targetDay = Object.keys(DAY_RANK).find(d => DAY_RANK[d] === targetRank);
        if (targetDay && targetRank <= 6 && !occupied.has(targetRank)) {
          occupied.delete(r);
          (s as any).day = targetDay;
          occupied.add(targetRank);
          counters.post_bike_run_moved = (counters.post_bike_run_moved ?? 0) + 1;
          logs.push(
            `[post_bike_run_moved] S${wk.weekNumber} "${String((s as any).title).slice(0, 60)}" → ${targetDay} (lendemain du long vélo)`,
          );
          continue;
        }

        // 2) sinon : neutraliser l'affirmation trompeuse
        const strip = (v: string) =>
          v
            .replace(PREV_DAY_BIKE_CLAIM_RX, NEUTRAL_CLAIM)
            .replace(/\(\s*(?:ou\s+)?fin de bloc[^)]*\)/gi, "(fin de bloc)")
            .replace(/\s{2,}/g, " ");
        (s as any).title = strip(String((s as any).title ?? ""));
        (s as any).details = strip(String((s as any).details ?? ""));
        counters.post_bike_claim_neutralized = (counters.post_bike_claim_neutralized ?? 0) + 1;
        logs.push(
          `[post_bike_claim_neutralized] S${wk.weekNumber} ${(s as any).day} — aucun long vélo la veille, énoncé corrigé`,
        );
      }
    }
  }
}

/** Réécrit une séance sur la fiche cible (titre + détails + catalogId). */
function applyFiche(
  s: PlanSession,
  fiche: LibraryWorkout,
  phase: string,
  allowedCandidateIntentFamilies?: RepairIntentFamily[],
): boolean {
  const originalId = String(s.catalogId ?? "");
  const compatibility = evaluateRepairSportingEquivalence(
    REPAIR_METADATA_BY_ID.get(originalId.toUpperCase()),
    REPAIR_METADATA_BY_ID.get(fiche.id.toUpperCase()),
    {
      objective: "start_to_run",
      phase,
      operation: "replacement",
      allowedCandidateIntentFamilies,
    },
  );
  if (!compatibility.compatible) return false;
  (s as any).catalogIdOrigin = (s as any).catalogIdOrigin ?? (s as any).catalogId;
  (s as any).catalogId = fiche.id;
  (s as any).title = fiche.objectif;
  (s as any).details = `${ficheToText(fiche)} [ID: ${fiche.id}]`;
  return true;
}

function orderStartToRunWeek(
  chunks: PlanChunk[],
  counters: ReconcilerCounters,
  logs: string[],
): void {
  for (const ch of chunks) {
    for (const wk of ch.weeks ?? []) {
      const slots = ((wk.sessions ?? []) as PlanSession[])
        .filter(s => S2R_LADDER[String((s as any).catalogId ?? "")] !== undefined)
        .sort(
          (a, b) =>
            (DAY_RANK[String((a as any).day ?? "").toLowerCase()] ?? 9) -
            (DAY_RANK[String((b as any).day ?? "").toLowerCase()] ?? 9),
        );
      if (slots.length < 2) continue;
      const ranks = slots
        .map(s => S2R_LADDER[String((s as any).catalogId)])
        .sort((a, b) => a - b);
      const already = slots.every(
        (s, i) => S2R_LADDER[String((s as any).catalogId)] === ranks[i],
      );
      if (already) continue;
      slots.forEach((s, i) => {
        const wanted = S2R_BY_RANK.get(ranks[i]);
        if (!wanted || wanted === (s as any).catalogId) return;
        const before = String((s as any).catalogId);
        const fiche = ficheFor(wanted);
        if (!fiche) return;
        if (!applyFiche(s, fiche, String(wk.phase ?? "base"), ["endurance_fondamentale", "technique"])) {
          logs.push(`[s2r_week_resequence_unresolved] S${wk.weekNumber} ${before} → ${wanted} non équivalent`);
          return;
        }
        counters.s2r_week_resequenced = (counters.s2r_week_resequenced ?? 0) + 1;
        logs.push(
          `[s2r_week_resequenced] S${wk.weekNumber} ${(s as any).day ?? ""} ${before} → ${wanted} (première exposition = format le plus doux)`,
        );
      });
    }
  }
}

function enforceStartToRunLadder(
  chunks: PlanChunk[],
  counters: ReconcilerCounters,
  logs: string[],
  globalWeekOffset?: number | null,
): void {
  // Fix B1 (audit "génération de plan IA") : même faille que
  // ensureRaceDaySession — `chunks` peut ne couvrir qu'une fenêtre du plan
  // (régénération partielle). `prevMax` repartait de 0 à chaque appel,
  // aveugle à la progression déjà atteinte dans les semaines RÉELLEMENT
  // antérieures mais hors de cette fenêtre, pouvant faire régresser
  // l'échelle marche-course affichée. Sans visibilité sur cette progression
  // réelle, mieux vaut ne rien lisser que lisser à tort (offset>0 = la
  // fenêtre ne débute pas en S1 du plan réel).
  if ((globalWeekOffset ?? 0) > 0) {
    logs.push(
      `[s2r_ladder_skipped] fenêtre ne débute pas en S1 du plan réel (offset=${globalWeekOffset}) — pas de visibilité sur la progression déjà atteinte, filet désactivé pour cet appel`,
    );
    return;
  }
  const allWeeks = chunks
    .flatMap(ch => ch.weeks ?? [])
    .sort((a, b) => (a.weekNumber ?? 0) - (b.weekNumber ?? 0));
  let prevMax = 0;
  for (const wk of allWeeks) {
    const slots = ((wk.sessions ?? []) as PlanSession[]).filter(
      s => S2R_LADDER[String((s as any).catalogId ?? "")] !== undefined,
    );
    if (!slots.length) continue;
    const allowedMax = prevMax === 0 ? 2 : prevMax + 1;
    for (const s of slots) {
      const rank = S2R_LADDER[String((s as any).catalogId)];
      if (rank <= allowedMax) continue;
      const wanted = S2R_BY_RANK.get(allowedMax);
      const fiche = wanted ? ficheFor(wanted) : null;
      if (!fiche) continue;
      const before = String((s as any).catalogId);
      if (!applyFiche(s, fiche, String(wk.phase ?? "base"), ["endurance_fondamentale", "technique"])) {
        logs.push(`[s2r_ladder_unresolved] S${wk.weekNumber} ${before} → ${fiche.id} non équivalent`);
        continue;
      }
      counters.s2r_ladder_smoothed = (counters.s2r_ladder_smoothed ?? 0) + 1;
      logs.push(
        `[s2r_ladder_smoothed] S${wk.weekNumber} ${(s as any).day ?? ""} ${before}(rang ${rank}) → ${fiche.id}(rang ${allowedMax}) — palier manquant, progression graduelle imposée`,
      );
    }
    prevMax = Math.max(
      prevMax,
      ...slots.map(s => S2R_LADDER[String((s as any).catalogId)] ?? 0),
    );
  }
}




// ── Affûtage : nombre minimal de semaines `taper` (Mujika & Padilla 2003,
//    Bosquet 2007 : 2 à 3 semaines de réduction de volume pour les épreuves
//    longues). Règle déterministe : on reclasse les N dernières semaines du
//    plan en `taper` si l'IA n'en a pas produit assez.
export function minTaperWeeksFor(objectiveKey: string, totalWeeks: number): number {
  const full =
    ["IM", "TrailUltra"].includes(objectiveKey) ? 3
    : ["703", "Marathon", "Semi", "Trail", "TrailMountain"].includes(objectiveKey) ? 2
    : 1;
  // Plan court : on rogne l'affûtage plutôt que les phases de développement.
  return Math.max(1, Math.min(full, Math.floor(totalWeeks * 0.2)));
}

function enforceTaperWeeks(
  chunks: PlanChunk[],
  counters: ReconcilerCounters,
  logs: string[],
  objectiveKey: string | null | undefined,
): void {
  if (!objectiveKey) return;
  const allWeeks = chunks
    .flatMap(ch => (ch.weeks ?? []))
    .sort((a, b) => (a.weekNumber ?? 0) - (b.weekNumber ?? 0));
  const totalWeeks = allWeeks.length;
  if (totalWeeks < 4) return;

  const required = minTaperWeeksFor(objectiveKey, totalWeeks);
  const current = allWeeks.filter(w => w.phase === "taper").length;
  if (current >= required) return;

  // On ne reclasse QUE des semaines terminales (pas de trou au milieu).
  const missing = required - current;
  const candidates = allWeeks
    .slice(Math.max(0, totalWeeks - required))
    .filter(w => w.phase !== "taper");
  let done = 0;
  for (const w of candidates) {
    if (done >= missing) break;
    const before = w.phase;
    w.phase = "taper";
    done++;
    counters.taper_weeks_enforced = (counters.taper_weeks_enforced ?? 0) + 1;
    logs.push(
      `[taper_weeks_enforced] S${w.weekNumber} ${before} → taper (objectif=${objectiveKey}, requis=${required}, présentes=${current})`,
    );
  }
  if (done < missing) {
    logs.push(
      `[taper_weeks_unresolved] objectif=${objectiveKey} requis=${required} obtenues=${current + done}`,
    );
  }
}


// ── Jour de course (Rule 9) : la semaine terminale doit contenir le Jour J.
//    Certains plans (chemin JSON) s'arrêtent à l'activation pré-course sans
//    jamais matérialiser l'épreuve. Filet déterministe : on insère une séance
//    « 🏁 COURSE OBJECTIF — Jour J » le dimanche de la dernière semaine.
const RACE_DAY_RX = /🏁|jour\s*j\b|course\s*objectif|race\s*day|compétition|épreuve\s*(objectif|cible)|jour\s*de\s*(course|compétition)/i;

const RACE_DAY_SPEC: Record<string, { sport: "run" | "bike" | "brick" | "swim"; durationMin: number; label: string }> = {
  IM: { sport: "brick", durationMin: 720, label: "Ironman" },
  "703": { sport: "brick", durationMin: 330, label: "Ironman 70.3" },
  Olympique: { sport: "brick", durationMin: 165, label: "Triathlon olympique" },
  Sprint: { sport: "brick", durationMin: 90, label: "Triathlon sprint" },
  Marathon: { sport: "run", durationMin: 240, label: "Marathon" },
  Semi: { sport: "run", durationMin: 110, label: "Semi-marathon" },
  "10K": { sport: "run", durationMin: 50, label: "10 km" },
  "5K": { sport: "run", durationMin: 25, label: "5 km" },
  Trail: { sport: "run", durationMin: 300, label: "Trail" },
  TrailShort: { sport: "run", durationMin: 150, label: "Trail court" },
  TrailMountain: { sport: "run", durationMin: 420, label: "Trail montagne" },
  TrailUltra: { sport: "run", durationMin: 900, label: "Ultra-trail" },
};

/** Étapes du Long Course Weekend (format 3 jours éclaté). */
const LCW_STAGES: Array<{
  day: "vendredi" | "samedi" | "dimanche";
  sport: "swim" | "bike" | "run";
  durationMin: number;
  label: string;
  details: string;
}> = [
  {
    day: "vendredi",
    sport: "swim",
    durationMin: 55,
    label: "Étape 1 · Natation (1.9 km)",
    details:
      "Étape natation du Long Course Weekend, vendredi soir. Échauffement à sec + 400 m progressifs, " +
      "départ contrôlé (30 premières minutes sous l'allure cible), sighting régulier. " +
      "Recharge glycogénique immédiate en sortie d'eau (protocole inter-étapes).",
  },
  {
    day: "samedi",
    sport: "bike",
    durationMin: 180,
    label: "Étape 2 · Vélo (90 km)",
    details:
      "Étape vélo du Long Course Weekend, samedi. Pacing IF 0.78-0.82 (pas de brique derrière : " +
      "puissance légèrement plus haute autorisée), nutrition 80-100 g CHO/h. " +
      "Recharge agressive dès l'arrivée + nuit courte anticipée avant l'étape course.",
  },
  {
    day: "dimanche",
    sport: "run",
    durationMin: 110,
    label: "Étape 3 · Course à pied (semi-marathon)",
    details:
      "Étape course du Long Course Weekend, dimanche, sur jambes fatiguées des deux étapes précédentes. " +
      "Départ 10-15 s/km au-dessus de l'allure semi fraîche, ravitaillement à chaque poste, " +
      "gestion thermique et relance progressive sur les 7 derniers kilomètres.",
  },
];

function makeRaceSession(
  day: string,
  title: string,
  details: string,
  sport: string,
  durationMin: number,
): PlanSession {
  return {
    day,
    title,
    details,
    isKeySession: true,
    durationMin,
    zones: [] as string[],
    sport,
    custom: true as const,
    catalogId: null,
  } as unknown as PlanSession;
}

function ensureRaceDaySession(
  chunks: PlanChunk[],
  counters: ReconcilerCounters,
  logs: string[],
  objectiveKey: string | null | undefined,
  isLcw3Day = false,
  globalTotalWeeks?: number | null,
  globalWeekOffset?: number | null,
): void {
  const allWeeks = chunks
    .flatMap(ch => (ch.weeks ?? []))
    .sort((a, b) => (a.weekNumber ?? 0) - (b.weekNumber ?? 0));
  const last = allWeeks[allWeeks.length - 1];
  if (!last) return;

  // Fix B1 (audit "génération de plan IA") : `chunks` peut ne couvrir qu'une
  // FENÊTRE du plan (régénération partielle) — sans ce garde-fou, la
  // dernière semaine REÇUE était traitée comme la dernière semaine du plan
  // ENTIER, fabriquant un faux "🏁 Jour J" au milieu du plan (ex. semaines
  // 9-12 d'un plan de 16 → jour J inséré à S12). globalTotalWeeks non fourni
  // = comportement legacy (chunks supposés couvrir le plan entier, ex. B10/
  // B11 appelés en tests unitaires sans ce contexte).
  if (globalTotalWeeks != null) {
    const globalLastWeek = (last.weekNumber ?? 0) + (globalWeekOffset ?? 0);
    if (globalLastWeek !== globalTotalWeeks) {
      logs.push(
        `[race_day_skipped] fenêtre (dernière semaine locale=${last.weekNumber}, offset=${globalWeekOffset ?? 0} → globale=${globalLastWeek}) ne couvre pas la dernière semaine réelle du plan (${globalTotalWeeks}) — aucun jour de course fabriqué`,
      );
      return;
    }
  }

  const sessions = (last.sessions ?? []) as PlanSession[];

  // ── Format Long Course Weekend : 3 étapes (Ven natation / Sam vélo / Dim course).
  if (isLcw3Day) {
    for (const stage of LCW_STAGES) {
      const dayLower = stage.day;
      const existing = sessions.filter(
        s => String((s as { day?: string }).day ?? "").toLowerCase() === dayLower,
      );
      const hasRace = existing.some(s => RACE_DAY_RX.test(`${s.title ?? ""} ${s.details ?? ""}`));
      if (hasRace) continue;

      const stageSession = makeRaceSession(
        stage.day,
        `🏁 COURSE OBJECTIF — ${stage.label}`,
        stage.details,
        stage.sport,
        stage.durationMin,
      );
      const restIdx = sessions.findIndex(
        s =>
          String((s as { day?: string }).day ?? "").toLowerCase() === dayLower &&
          (s.sport === "rest" || s.sport === "recovery"),
      );
      if (restIdx >= 0) sessions.splice(restIdx, 1, stageSession);
      else sessions.push(stageSession);

      counters.race_day_inserted = (counters.race_day_inserted ?? 0) + 1;
      logs.push(
        `[race_day_inserted] S${last.weekNumber} — LCW ${stage.day} : ${stage.label} (${stage.sport}, ${stage.durationMin} min)`,
      );
    }
    last.sessions = sessions;
    return;
  }

  const already = sessions.some(s =>
    RACE_DAY_RX.test(`${s.title ?? ""} ${s.details ?? ""}`),
  );
  if (already) return;

  const spec = RACE_DAY_SPEC[String(objectiveKey ?? "")] ?? {
    sport: "run" as const,
    durationMin: 90,
    label: String(objectiveKey ?? "Course objectif"),
  };

  const raceSession = makeRaceSession(
    "dimanche",
    `🏁 COURSE OBJECTIF — Jour J (${spec.label})`,
    `Jour de course. Échauffement selon protocole, pacing conforme à la stratégie validée ` +
      `(allure/puissance cible, contrôle des premières minutes), nutrition et hydratation ` +
      `selon le plan de ravitaillement établi en amont.`,
    spec.sport,
    spec.durationMin,
  );

  // Remplace la séance de repos du dimanche si elle existe, sinon on ajoute.
  const sundayRestIdx = sessions.findIndex(s => s.day === "dimanche" && s.sport === "rest");
  if (sundayRestIdx >= 0) sessions.splice(sundayRestIdx, 1, raceSession);
  else sessions.push(raceSession);
  last.sessions = sessions;

  counters.race_day_inserted = (counters.race_day_inserted ?? 0) + 1;
  logs.push(
    `[race_day_inserted] S${last.weekNumber} — Jour J ajouté (objectif=${objectiveKey ?? "?"}, sport=${spec.sport}, ${spec.durationMin} min)`,
  );
}



// ── API publique ───────────────────────────────────────────────────────────


// ── Contraintes athlète (filet déterministe) ───────────────────────────────
// Le champ libre "Contraintes" est injecté en tête de prompt (edge function),
// mais le modèle peut encore placer une séance sur un jour interdit. Ce filet
// DÉPLACE la séance sur le premier jour libre de la même semaine (jamais de
// suppression silencieuse) et supprime les disciplines totalement interdites.
function normalizeDayLabel(raw: string | null | undefined): WeekDay | null {
  const d = String(raw ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
  if (!d) return null;
  return (
    WEEK_DAYS.find(
      (w) => w.normalize("NFD").replace(/[\u0300-\u036f]/g, "") === d,
    ) ?? null
  );
}

function enforceAthleteConstraints(
  chunks: PlanChunk[],
  rules: AthleteConstraintRules,
  counters: ReconcilerCounters,
  logs: string[],
): void {
  if (!rules.hasHardRules) return;

  for (const chunk of chunks) {
    for (const week of (chunk as any)?.weeks ?? []) {
      const sessions: PlanSession[] = Array.isArray(week?.sessions) ? week.sessions : [];
      const weekNum = week?.weekNumber ?? week?.week ?? "?";

      // 1) Disciplines totalement interdites
      if (rules.bannedSports.length > 0) {
        for (let i = sessions.length - 1; i >= 0; i--) {
          const cs = toConstraintSport((sessions[i] as any)?.sport);
          if (cs !== "any" && rules.bannedSports.includes(cs)) {
            logs.push(
              `[constraint_banned_sport] S${weekNum} — suppression "${(sessions[i] as any)?.title ?? (sessions[i] as any)?.catalogId ?? "?"}" (${constraintSportLabel(cs)} interdit par le coach)`,
            );
            sessions.splice(i, 1);
            counters.constraint_banned_sport_removed =
              (counters.constraint_banned_sport_removed ?? 0) + 1;
          }
        }
      }

      // 2) Jours interdits → déplacement
      if (rules.dayBans.length === 0) continue;
      for (const s of sessions) {
        const day = normalizeDayLabel((s as any)?.day);
        if (!day) continue;
        const cs = toConstraintSport((s as any)?.sport);
        const hit = rules.dayBans.find(
          (b) => b.day === day && (b.sport === "any" || b.sport === cs),
        );
        if (!hit) continue;

        const bannedForThis = new Set(
          rules.dayBans
            .filter((b) => b.sport === "any" || b.sport === cs)
            .map((b) => b.day),
        );
        const load: Record<string, number> = {};
        for (const other of sessions) {
          const d = normalizeDayLabel((other as any)?.day);
          if (d) load[d] = (load[d] ?? 0) + 1;
        }
        const candidates = WEEK_DAYS.filter((d) => !bannedForThis.has(d)).sort(
          (a, b) => (load[a] ?? 0) - (load[b] ?? 0),
        );
        const target = candidates[0];
        if (!target || (load[target] ?? 0) >= 2) {
          counters.constraint_day_unresolved =
            (counters.constraint_day_unresolved ?? 0) + 1;
          logs.push(
            `[constraint_day_unresolved] S${weekNum} — "${(s as any)?.title ?? "?"}" reste sur ${day} (aucun jour libre disponible)`,
          );
          continue;
        }
        (s as any).day = target;
        counters.constraint_day_moved = (counters.constraint_day_moved ?? 0) + 1;
        logs.push(
          `[constraint_day_moved] S${weekNum} — "${(s as any)?.title ?? (s as any)?.catalogId ?? "?"}" ${day} → ${target} (contrainte : « ${hit.source} »)`,
        );
      }
    }
  }
}

// ── maxSessionsPerDay (filet déterministe) ─────────────────────────────────
// Audit "B-5K-BEGINNER round 2" (JSON réel) : `planConfig.maxSessionsPerDay=1`
// transmis au prompt, mais rien ne le fait respecter en aval si le LLM ne
// s'y conforme pas — 8 semaines (S1-S8) d'un run réel avaient 2 séances le
// même jour malgré cette consigne explicite (`validateSessionDensity`,
// planValidator.ts, le DÉTECTE déjà — rien ne le CORRIGEAIT). Même principe
// que `enforceAthleteConstraints` ci-dessus : DÉPLACE l'excédent vers le
// jour de la semaine le moins chargé encore sous le plafond, ne supprime
// JAMAIS une séance pour satisfaire la contrainte. Si aucun jour de la
// semaine ne peut l'accueillir (calendrier impossible : trop de séances pour
// le nombre de jours × maxSessionsPerDay), la séance reste en place et le
// conflit est journalisé explicitement plutôt que résolu silencieusement.
function enforceMaxSessionsPerDay(
  chunks: PlanChunk[],
  maxSessionsPerDay: number | null | undefined,
  counters: ReconcilerCounters,
  logs: string[],
): void {
  if (!maxSessionsPerDay || maxSessionsPerDay <= 0) return;

  function computeLoad(sessions: PlanSession[]): Record<string, number> {
    const load: Record<string, number> = {};
    for (const other of sessions) {
      if (other.sport === "rest") continue;
      const d = normalizeDayLabel(other.day);
      if (d) load[d] = (load[d] ?? 0) + 1;
    }
    return load;
  }

  for (const chunk of chunks) {
    for (const week of chunk.weeks ?? []) {
      const sessions = (week.sessions ?? []) as PlanSession[];
      const weekNum = week.weekNumber;

      const byDay = new Map<string, PlanSession[]>();
      for (const s of sessions) {
        if (s.sport === "rest") continue;
        const day = normalizeDayLabel(s.day);
        if (!day) continue;
        const arr = byDay.get(day) ?? [];
        arr.push(s);
        byDay.set(day, arr);
      }

      for (const [day, daySessions] of byDay) {
        if (daySessions.length <= maxSessionsPerDay) continue;
        // Conserve en priorité les séances-clé sur leur jour d'origine ;
        // déplace l'excédent (ordre d'origine sinon, jamais aléatoire).
        const ordered = [...daySessions].sort((a, b) => {
          const ak = a.isKeySession ? 0 : 1;
          const bk = b.isKeySession ? 0 : 1;
          return ak - bk;
        });
        const toMove = ordered.slice(maxSessionsPerDay);
        for (const s of toMove) {
          const load = computeLoad(sessions); // recalculé : un déplacement précédent a pu changer la charge
          const candidates = WEEK_DAYS.filter((d) => d !== day).sort(
            (a, b) => (load[a] ?? 0) - (load[b] ?? 0),
          );
          const target = candidates[0];
          if (!target || (load[target] ?? 0) >= maxSessionsPerDay) {
            counters.max_sessions_per_day_unresolved = (counters.max_sessions_per_day_unresolved ?? 0) + 1;
            logs.push(
              `[max_sessions_per_day_unresolved] S${weekNum} — "${s.title ?? s.catalogId ?? "?"}" reste sur ${day} ` +
              `(${daySessions.length} séances ce jour, max autorisé ${maxSessionsPerDay} — aucun jour de la semaine disponible sous le plafond)`,
            );
            continue;
          }
          s.day = target;
          // Audit "B-5K-BEGINNER round 3" (JSON réel 2026-10-14, consigne
          // coach) : `target` était jusqu'ici choisi PARCE QUE `load[target]`
          // est nul (aucune séance non-rest ce jour) — très souvent parce que
          // ce jour porte justement le placeholder `sport==="rest"` de la
          // semaine. Sans ce retrait, le plan final affichait DEUX entrées
          // contradictoires pour le même jour ("Lundi : Repos" ET "Lundi :
          // Renforcement") — confirmé sur 8/12 semaines du run réel. Retire
          // ce placeholder (jamais un vrai jour de repos "en trop" : un
          // placeholder rest existe par construction pour chaque jour sans
          // séance active, donc en retirer un ici ne fait qu'enregistrer que
          // ce jour N'EST PLUS un jour de repos — exactement ce que ce
          // déplacement vient de décider).
          for (let i = sessions.length - 1; i >= 0; i--) {
            const other = sessions[i];
            if (other === s) continue;
            if (other.sport === "rest" && normalizeDayLabel(other.day) === target) {
              sessions.splice(i, 1);
            }
          }
          counters.max_sessions_per_day_moved = (counters.max_sessions_per_day_moved ?? 0) + 1;
          logs.push(
            `[max_sessions_per_day_moved] S${weekNum} — "${s.title ?? s.catalogId ?? "?"}" ${day} → ${target} ` +
            `(maxSessionsPerDay=${maxSessionsPerDay} dépassé sur ${day})`,
          );
        }
      }
    }
  }
}

// ── Accumulation de séances exigeantes (garde-fou proactif) ────────────────
// Audit "B-5K-BEGINNER round 2" (JSON réel, consigne coach P1 suite PR #376) :
// S4/S10 cumulaient 3 séances "vo2" (sprints côtes + fartlek intense + VMA
// piste) dans la MÊME semaine d'une débutante à 3 séances/semaine.
// `validateDemandingSessionAccumulation` (planValidator.ts) DÉTECTE déjà ce
// cas après génération — mais rien ne l'empêchait d'apparaître. Même seuil
// PROPORTIONNEL (`demandingSessionCap`, dupliqué volontairement : le client
// ne dépend pas du moteur serveur/validateur pour une formule aussi simple,
// cf. docstring planValidator.ts) — un plan à 3 séances/semaine tolère au
// plus 1 séance "vo2", un plan à 6 séances/semaine en tolère 3.
//
// Strictement scopé comme le validateur : seulement si le signal de niveau
// est RÉELLEMENT fiable (jamais le fallback-prudent) et seulement pour
// untrained/light — un confirmé (même visant "finisher") garde l'accès
// complet. N'interdit JAMAIS la famille "vo2" en général : seule
// la séance EXCÉDENTAIRE (au-delà du seuil) est downgradée vers
// threshold/easy, en préservant en priorité les séances-clé. Si aucune
// alternative compatible n'existe (phase + sport + durée + famille
// threshold/easy), la séance initiale est CONSERVÉE et le conflit
// signalé — jamais de suppression ni de dégradation incompatible
// silencieuse (cf. consigne coach).
const DEMANDING_ACCUMULATION_LEVELS = new Set(["untrained", "light"]);
const DEMANDING_ACCUMULATION_RELIABLE_SOURCES = new Set(["manual", "auto-tss"]);

function demandingSessionCap(activeCount: number): number {
  return Math.max(1, Math.floor(activeCount / 2));
}

function sessionZoneMaxForFamily(s: PlanSession): number {
  if (!s.custom && s.catalogId) {
    const fiche = ficheFor(s.catalogId);
    if (fiche) return ficheMainZoneMax(fiche);
  }
  return instanceMaxZone(s);
}

function enforceDemandingAccumulation(
  chunks: PlanChunk[],
  trainingLevelSignal: { trainingLevel: string; trainingLevelSource: string } | null | undefined,
  counters: ReconcilerCounters,
  logs: string[],
  ledger?: UsageLedger,
  restrictToIds?: Set<string>,
  phaseCtx?: PhaseCtx,
  quotasByWeek?: Record<number, WeekQuotaEntry>,
): void {
  if (!trainingLevelSignal) return;
  if (!DEMANDING_ACCUMULATION_RELIABLE_SOURCES.has(trainingLevelSignal.trainingLevelSource)) return;
  if (!DEMANDING_ACCUMULATION_LEVELS.has(trainingLevelSignal.trainingLevel)) return;

  for (const ch of chunks) {
    for (const wk of ch.weeks ?? []) {
      const quotaEntry = quotasByWeek?.[wk.weekNumber] ?? null;
      const sessions = (wk.sessions ?? []) as PlanSession[];
      const active = sessions.filter(s => s.sport !== "rest");
      if (active.length === 0) continue;

      const cap = demandingSessionCap(active.length);
      const demanding = active.filter(s => intensityFamily(sessionZoneMaxForFamily(s)) === "vo2");
      if (demanding.length <= cap) continue;

      // Conserve en priorité les séances-clé (même logique que
      // enforceMaxSessionsPerDay) ; downgrade l'excédent, ordre d'origine sinon.
      const ordered = [...demanding].sort((a, b) => {
        const ak = a.isKeySession ? 0 : 1;
        const bk = b.isKeySession ? 0 : 1;
        return ak - bk;
      });
      const excess = ordered.slice(cap);
      const weekPhase = resolveWeekPhase(wk.phase, wk.weekNumber, phaseCtx);

      for (const s of excess) {
        const id = s.custom ? null : s.catalogId;
        const original = id ? ficheFor(id) : null;
        const repl = findReplacement({
          sport: normSport(s.sport),
          weekPhase,
          targetDur: s.durationMin ?? 0,
          original,
          restrictToIds,
          ledger,
          excludeFamily: "vo2",
          allowedCandidateIntentFamilies: ["seuil", "endurance_fondamentale", "recuperation"],
          objectiveKey: phaseCtx?.objectiveKey,
          levelSignal: phaseCtx?.beginnerIntensitySignal,
          weekZoneCap: resolveRepairWeekZoneCap(wk, quotaEntry),
          weekType: resolveRepairWeekType(wk, quotaEntry),
        }, id ?? undefined);
        const label = id ?? s.title ?? "custom";
        if (repl) {
          assignFiche(s, repl, s.durationMin, ledger);
          counters.demanding_accumulation_downgraded = (counters.demanding_accumulation_downgraded ?? 0) + 1;
          logs.push(
            `[demanding_accumulation_downgraded] S${wk.weekNumber} ${s.day} ${label} (${demanding.length} séances "vo2" sur ${active.length} actives > seuil ${cap}, niveau ${trainingLevelSignal.trainingLevel}/${trainingLevelSignal.trainingLevelSource}) → ${repl.id}`,
          );
        } else {
          counters.demanding_accumulation_unresolved = (counters.demanding_accumulation_unresolved ?? 0) + 1;
          logs.push(
            `[demanding_accumulation_unresolved] S${wk.weekNumber} ${s.day} ${label} — aucune alternative threshold/easy disponible (${demanding.length} séances "vo2" sur ${active.length} actives > seuil ${cap}, phase=${weekPhase})`,
          );
        }
      }
    }
  }
}

export interface RunReconcilerOptions {
  /** Clé d'objectif normalisée (normalizeObjectiveKey) — pilote l'affûtage minimal. */
  objectiveKey?: string | null;
  /** Format Long Course Weekend (3 jours éclatés Ven/Sam/Dim) — 3 étapes de course. */
  isLcw3Day?: boolean;
  /** Champ libre "Contraintes" saisi par le coach (jours off, sports interdits, blessures). */
  constraints?: string | null;
  /**
   * P0 "B-5K-BEGINNER round 2" : plafond coach explicite (PlanConfig.maxSessionsPerDay)
   * — déplace toute séance excédentaire vers un jour disponible de la même
   * semaine (jamais de suppression silencieuse), cf. enforceMaxSessionsPerDay.
   * Non fourni ou ≤0 = aucune application (comportement legacy inchangé).
   */
  maxSessionsPerDay?: number | null;
  /**
   * Nombre RÉEL de semaines du plan entier (PlanConfig.globalTotalWeeks) —
   * distinct du nombre de semaines couvertes par `chunks` en régénération
   * partielle (fenêtre ou semaine seule). Non fourni = comportement legacy
   * (chunks supposés couvrir le plan entier).
   */
  globalTotalWeeks?: number | null;
  /**
   * Décalage entre le numéro de semaine LOCAL des `chunks` reçus et sa
   * position RÉELLE dans le plan entier (PlanConfig.globalWeekOffset,
   * = semaine réelle − 1 pour la 1ère semaine locale). 0 = les numéros
   * locaux sont déjà les numéros réels (génération complète, régénération
   * semaine seule).
   */
  globalWeekOffset?: number | null;
  /**
   * Fix B3 (audit "génération de plan IA") + fix "traitement des limiteurs"
   * (généralisation à TOUS les limiteurs, pas seulement L1) : libellés BRUTS
   * de TOUS les limiteurs identifiés de l'athlète, PAR RANG (L1 en tête) —
   * même liste que `identifiedLimiters`/`identifiedLimitersRaw` transmise
   * côté serveur à `extractLimiterKeywords`/`applyReconciler`
   * (jsonPlanHandler.ts). Sans ce contexte, le réconciliateur client n'avait
   * AUCUNE notion de facteur limitant — il pouvait remplacer une insertion
   * serveur ciblant le limiteur par une fiche générique, sans jamais tenir
   * compte du ciblage déjà fait côté serveur. Se limiter à `[0]` (L1 seul)
   * laissait L2/L3/L4 — pourtant fréquents (3-4 limiteurs classés n'est pas
   * un cas rare) — sans aucun ciblage mécanique côté client non plus.
   */
  identifiedLimiters?: string[] | null;
  /**
   * P1 "B-5K-BEGINNER round 2" (consigne coach, suite PR #376) : signal de
   * niveau réel de l'athlète (PlanConfig.ambitionMeta.trainingLevel/
   * trainingLevelSource) — même convention que
   * `workoutCatalogBuilder.ts::beginnerIntensitySignal`. Pilote
   * `enforceDemandingAccumulation` : downgrade proactivement l'excédent de
   * séances "vo2" dans une semaine, mais SEULEMENT si la source est fiable
   * (manual/auto-tss, jamais fallback-prudent) et le niveau untrained/light.
   * `null`/absent = contrôle inactif (comportement legacy inchangé).
   */
  beginnerIntensitySignal?: { trainingLevel: string; trainingLevelSource: string } | null;
}


export function runReconciler(
  chunks: PlanChunk[],
  quotasByWeek: Record<number, WeekQuotaEntry>,
  maxPasses = 2,
  injectedCatalogIds?: ReadonlyArray<string> | ReadonlySet<string>,
  opts: RunReconcilerOptions = {},
): ReconcilerResult {

  const counters: ReconcilerCounters = {
    phase_substituted: 0,
    phase_unresolved: 0,
    id_substituted_duration: 0,
    duration_unresolved: 0,
    discipline_substituted: 0,
    discipline_unresolved: 0,
    quota_floor_inserted_from_catalog: 0,
    quota_floor_unresolved: 0,
    quota_ceiling_trimmed: 0,
    reconcile_conflict: 0,
    id_remapped_to_neighbor: 0,
    id_remap_no_intent_match_fallback_custom: 0,
  };
  const logs: string[] = [];

  // Audit "B-5K-BEGINNER round 2" : `globalTotalWeeks` non fourni (tests
  // unitaires, appels legacy) → comportement inchangé, le plan ENTIER est
  // supposé être couvert par `chunks` (même repli que ensureRaceDaySession
  // ci-dessous — Math.max 1 pour éviter une division par zéro).
  const legacyTotalWeeks = Math.max(1, ...chunks.flatMap(ch => (ch.weeks ?? []).map(w => w.weekNumber ?? 0)));
  const phaseCtx: PhaseCtx = {
    totalWeeks: opts.globalTotalWeeks ?? legacyTotalWeeks,
    weekOffset: opts.globalWeekOffset ?? 0,
    objectiveKey: opts.objectiveKey,
    beginnerIntensitySignal: opts.beginnerIntensitySignal,
  };

  // ── Filet de mapping voisin (Reco 3 + Reco B) ──
  // Passe PRÉLIMINAIRE : remap catalogId absent du catalogue injecté vers
  //   un voisin sûr du catalogue injecté (5 garde-fous stricts).
  // Passe POSTÉRIEURE : runOnePass (phase/durée/discipline) restreint ses
  //   candidats à `injected` grâce à `restrictToIds`, mais on relance quand
  //   même le filet voisin après pour nettoyer tout ID hors-catalogue qui
  //   aurait été introduit par une insertion FLOOR ou par un chemin non
  //   couvert. Coût : quelques ms, gain : garantit qu'aucun catalogId final
  //   n'est absent du catalogue injecté (sauf pur_hallucination irrattrapable).
  const debugStats = {
    injectedCatalogIdsProvided: injectedCatalogIds != null,
    injectedSize: 0,
    sessionsScanned: 0,
    sessionsWithCatalogId: 0,
    idsAlreadyInInjected: 0,
    idsAbsentInLibrary: 0,       // pur_hallucination
    idsCandidateForSubstitution: 0,
  };
  let injected: Set<string> | undefined;
  let injectedByBucket: Map<string, LibraryWorkout[]> | undefined;
  if (injectedCatalogIds) {
    injected = injectedCatalogIds instanceof Set
      ? new Set([...injectedCatalogIds].map(x => String(x).toUpperCase()))
      : new Set(Array.from(injectedCatalogIds as ReadonlyArray<string>).map(x => String(x).toUpperCase()));
    debugStats.injectedSize = injected.size;
    if (injected.size > 0) {
      injectedByBucket = new Map<string, LibraryWorkout[]>();
      for (const w of WorkoutLibrary) {
        if (!injected.has(w.id.toUpperCase())) continue;
        const key = `${normSport(w.sport)}::${intentFamilyOf(w)}`;
        const arr = injectedByBucket.get(key) ?? [];
        arr.push(w);
        injectedByBucket.set(key, arr);
      }
    }
  }

  function neighborRemapPass(passLabel: "pre" | "post"): { substituted: number; noSafe: number } {
    if (!injected || !injectedByBucket) return { substituted: 0, noSafe: 0 };
    let substituted = 0;
    let noSafe = 0;
    for (const chunk of chunks) {
      for (const week of chunk.weeks ?? []) {
        const weekPhase = resolveWeekPhase(week.phase, week.weekNumber, phaseCtx);
        const quotaEntry = quotasByWeek[week.weekNumber] ?? null;
        for (const s of (week.sessions ?? []) as PlanSession[]) {
          if ((s as any).isRest || s.sport === "rest") continue;
          if (passLabel === "pre") debugStats.sessionsScanned++;
          if (s.custom) continue;
          const cid = s.catalogId;
          if (!cid) continue;
          if (passLabel === "pre") debugStats.sessionsWithCatalogId++;
          const idUp = cid.toUpperCase();
          if (injected.has(idUp)) {
            if (passLabel === "pre") debugStats.idsAlreadyInInjected++;
            continue;
          }
          const original = FICHES_BY_ID.get(idUp);
          if (!original) {
            if (passLabel === "pre") debugStats.idsAbsentInLibrary++;
            continue; // pur_hallucination
          }
          if (passLabel === "pre") debugStats.idsCandidateForSubstitution++;
          const sessionSport = normSport(s.sport);
          const origFamily = intentFamilyOf(original);
          const bucket = injectedByBucket.get(`${sessionSport}::${origFamily}`) ?? [];
          const origMedian = ficheMedian(original);
          const targetDur = s.durationMin ?? origMedian;
          const durBound = Math.max(1, Math.round(0.25 * (targetDur || origMedian || 60)));
          let best: { w: LibraryWorkout; score: number; intent: number; candMedian: number } | null = null;
          const rejects = { sporting_incompatible: 0, phase_incompatible: 0, duration_out_of_range: 0, score_too_low: 0 };
          let sameSportOtherFamily = 0;
          if (bucket.length === 0) {
            for (const [key, arr] of injectedByBucket) {
              if (key.startsWith(`${sessionSport}::`)) sameSportOtherFamily += arr.length;
            }
          }
          for (const cand of bucket) {
            if (cand.id.toUpperCase() === idUp) continue;
            const sportingCompatibility = evaluateRepairSportingEquivalence(
              REPAIR_METADATA_BY_ID.get(original.id.toUpperCase()),
              REPAIR_METADATA_BY_ID.get(cand.id.toUpperCase()),
              {
                objective: phaseCtx?.objectiveKey,
                phase: weekPhase,
                weekType: resolveRepairWeekType(week, quotaEntry),
                operation: "replacement",
              },
            );
            if (!sportingCompatibility.compatible) { rejects.sporting_incompatible++; continue; }
            if (introducesHeatContext(cand, original)) continue;
            const allowedPhases = ficheAllowedPhases(cand);
            if (allowedPhases.size > 0 && !allowedPhases.has(weekPhase)) { rejects.phase_incompatible++; continue; }
            const candMedian = ficheMedian(cand);
            if (Math.abs(candMedian - (targetDur || origMedian)) > durBound) { rejects.duration_out_of_range++; continue; }
            const intent = intentScore(original, cand);
            if (intent < 1) { rejects.score_too_low++; continue; }
            const durPenalty = Math.abs(candMedian - targetDur) / 10;
            const score = intent * 100 - durPenalty;
            if (!best || score > best.score) best = { w: cand, score, intent, candMedian };
          }
          if (best) {
            const before = original.id;
            (s as any).catalogIdOrigin = before;
            (s as any).catalogIdSubstituted = true;
            const origAllowedPhases = ficheAllowedPhases(original);
            const reason = origAllowedPhases.size > 0 && !origAllowedPhases.has(weekPhase)
              ? "retiré_par_filtre_phase"
              : "retiré_aval_filtre";
            const deltaPct = origMedian > 0
              ? Math.round((100 * Math.abs(best.candMedian - origMedian)) / origMedian)
              : 0;
            assignFiche(s, best.w, s.durationMin);
            counters.id_remapped_to_neighbor++;
            substituted++;
            logs.push(
              `[catalog_id_substituted] pass=${passLabel} S${week.weekNumber} ${s.day} ${before} → ${best.w.id} [reason=${reason}, family=${origFamily}, score=${best.intent}, Δdur=${deltaPct}%]`,
            );
          } else {
            counters.id_remap_no_intent_match_fallback_custom++;
            noSafe++;
            let dominant: string;
            if (bucket.length === 0) {
              dominant = sameSportOtherFamily > 0
                ? `family_mismatch (sameSportOtherFamily=${sameSportOtherFamily})`
                : "sport_mismatch (aucun voisin même discipline)";
            } else {
              const entries = Object.entries(rejects).sort((a, b) => b[1] - a[1]);
              dominant = `${entries[0][0]} (${entries.map(([k, v]) => `${k}=${v}`).join(", ")}, bucket=${bucket.length})`;
            }
            logs.push(
              `[catalog_id_no_safe_neighbor] pass=${passLabel} S${week.weekNumber} ${s.day} id=${cid} sport=${sessionSport} famille=${origFamily} — dominant=${dominant} — B5 flaggera`,
            );
          }
        }
      }
    }
    return { substituted, noSafe };
  }

  // Passe préliminaire (avant runOnePass)
  const preStats = neighborRemapPass("pre");

  // Ledger de diversité : construit APRÈS la passe préliminaire (les remaps
  // voisins ont déjà figé leurs IDs) et mis à jour à chaque substitution.
  const usageLedger = buildUsageLedger(chunks);
  logs.push(
    `[recon_substitute_debug] injectedProvided=${debugStats.injectedCatalogIdsProvided} injectedSize=${debugStats.injectedSize} ` +
    `sessionsScanned=${debugStats.sessionsScanned} sessionsWithCatalogId=${debugStats.sessionsWithCatalogId} ` +
    `alreadyInInjected=${debugStats.idsAlreadyInInjected} absentInLibrary=${debugStats.idsAbsentInLibrary} ` +
    `candidateForSubstitution=${debugStats.idsCandidateForSubstitution} ` +
    `→ substituted(pre)=${preStats.substituted} noSafeNeighbor(pre)=${preStats.noSafe}`
  );

  // Fix B3 + fix "traitement des limiteurs" : calculé une seule fois, transmis
  // à chaque passe — cf. RunReconcilerOptions.identifiedLimiters.
  const limiterKeywordsByRank: string[][] = (opts.identifiedLimiters ?? []).map(l => extractLimiterKeywords(l));

  // runOnePass — restreint aux IDs du catalogue injecté quand disponible,
  // pour ne PAS réintroduire d'ID hors-catalogue via phase/durée/discipline.
  let anyOnePassChange = false;
  for (let i = 0; i < maxPasses; i++) {
    const changed = runOnePass(chunks, quotasByWeek, counters, logs, injected, usageLedger, limiterKeywordsByRank, phaseCtx);
    if (changed) anyOnePassChange = true;
    if (!changed) break;
  }

  // Filet final dédoublonnage intra-semaine — voir commentaire au site de
  // définition de dedupeWithinWeek. Tourne inconditionnellement (indépendant
  // de anyOnePassChange) : un doublon peut déjà être présent en sortie du
  // générateur, pas uniquement introduit par runOnePass.
  dedupeWithinWeek(chunks, counters, logs, usageLedger, injected, phaseCtx, quotasByWeek);

  // Filet final plafond cumul "à jeun" — voir commentaire au site de
  // définition de dedupeFastedWithinWeek. Tourne après dedupeWithinWeek :
  // réutilise un ledger/catalogue déjà à jour pour ne pas réintroduire un
  // doublon de catalogId en corrigeant un cumul à jeun.
  dedupeFastedWithinWeek(chunks, counters, logs, usageLedger, injected, phaseCtx, quotasByWeek);

  // Passe POSTÉRIEURE — filet final : nettoie tout ID hors-catalogue qui
  // aurait été introduit malgré tout (ex : insertion FLOOR sans injected).
  // Gated : ne relance que si runOnePass a effectivement muté quelque chose,
  // sinon rien de nouveau à nettoyer et on éviterait de doubler les compteurs
  // noSafeNeighbor sur les cas déjà rejetés en pré-passe.
  if (anyOnePassChange && injected && injected.size > 0) {
    const postStats = neighborRemapPass("post");
    logs.push(
      `[recon_substitute_debug_post] substituted(post)=${postStats.substituted} noSafeNeighbor(post)=${postStats.noSafe}`
    );
  }

  fixEarlyConsolidationSessions(chunks, counters, logs);
  if (String(opts.objectiveKey ?? "").toLowerCase().includes("start")) {
    capStartToRunSessions(chunks, counters, logs);
    enforceStartToRunLadder(chunks, counters, logs, opts.globalWeekOffset);
    orderStartToRunWeek(chunks, counters, logs);
  }
  enforceTaperWeeks(chunks, counters, logs, opts.objectiveKey);
  ensureRaceDaySession(chunks, counters, logs, opts.objectiveKey, !!opts.isLcw3Day, opts.globalTotalWeeks, opts.globalWeekOffset);
  alignPostBikeRunClaims(chunks, counters, logs);

  // Métrique de diversité finale (observabilité P0).
  try {
    const div = computePlanDiversity(chunks as any);
    counters.diversity_max_repeat = div.maxRepeat;
    logs.push(`[diversity] ${formatDiversitySummary(div)}`);
  } catch { /* ignore */ }

  hydrateDilutedZones(chunks, counters, logs);
  enforceDemandingAccumulation(chunks, opts.beginnerIntensitySignal, counters, logs, usageLedger, injected, phaseCtx, quotasByWeek);
  enforceAthleteConstraints(chunks, parseAthleteConstraints(opts.constraints), counters, logs);
  enforceMaxSessionsPerDay(chunks, opts.maxSessionsPerDay, counters, logs);
  return { counters, logs };
}
