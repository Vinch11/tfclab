/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL PLAN VALIDATOR™ — Post-Generation Quality Control
 * 
 * Validates AI-generated training plans against elite coaching principles:
 * 1. Polarization 80/20 (Seiler)
 * 2. Load/Deload pattern 3:1 or 2:1 (Rhea)
 * 3. Key sessions presence per week
 * 4. Volume progression across weeks
 * 5. Sport ratio coherence
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ParsedPlan, ParsedWeek, ParsedSession } from "@/lib/aiPlanParser";
import { inferWeekType, type WeekType } from "./sessionSizingMatrix";
import type { PlanAthleteData } from "./types";
import { parseAthleteConstraints, constraintSportLabel, type ConstraintSport } from "@/lib/plan/constraintRules";
import { extractCatalogId, extractAllCatalogIds } from "@/lib/catalogIdExtractor";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import type { LibraryWorkout } from "@/types/workoutLibrary";
import { HIGH_IMPACT_SESSION_PATTERNS } from "@/lib/limiterSessionPatterns";
import { computeGoalWeekFromDates, classifyMultiObjectiveGoalsClient, type ClassifiableRaceGoal } from "@/lib/plan/multiObjectiveClassification";
import { detectInterval, detectAllIntervals, isCyclingSession } from "./wbalPostProcessor";
import {
  analyzeCriticalPower,
  effectiveWprime,
  prescribeIntervalRecovery,
  calculateTau,
} from "@/lib/v2/criticalPowerModel";
import { LIMITER_SESSION_PATTERNS } from "@/lib/limiterSessionPatterns";
import { normalizeAmb, mapObjectiveToSport, VOLUME_CAP_MATRIX } from "@/lib/deriveRaceTargets";
import { AMBITIONS } from "@/lib/raceAnalysis";
import { AMBITION_DEFINITIONS, type AmbitionLevel } from "@/types/ambitionLevel";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  rule: string;
  severity: ValidationSeverity;
  week?: number;
  message: string;
  detail?: string;
}

export interface WeekMetrics {
  weekNumber: number;
  theme: string;
  totalSessions: number;
  activeSessions: number;
  restDays: number;
  sports: Record<string, number>;
  /**
   * Bug réel corrigé (audit "génération de plan IA", volet composition
   * hebdomadaire) : `keySessions` ci-dessous agrège toutes disciplines
   * confondues — une semaine avec 1 clé vélo + 1 clé course + 3 séances 100%
   * récup natation passait la règle 3 (validateKeySessions) avec un score
   * parfait. Ce compteur par discipline (Natation/Vélo/Course uniquement —
   * mêmes clés que `sports`, cf. normalizeSport) permet de détecter qu'une
   * discipline présente cette semaine n'a aucune séance clé, même si le
   * total hebdomadaire est correct.
   */
  keySessionsBySport: Record<string, number>;
  /** Estimated intensity distribution from session titles/details.
   *  low/mid/high sont des pourcentages du temps CLASSIFIABLE uniquement
   *  (somme à 100 entre eux) ; `unknownPct` est séparé, en % du temps TOTAL
   *  de la semaine — audit "fiabilité du validateur" : avant, ce temps non
   *  classifiable était silencieusement absorbé dans "low", ce qui pouvait
   *  faire passer une semaine réellement non polarisée pour conforme. */
  intensityProfile: {
    lowPct: number;   // Z1-Z2 (easy, endurance, récupération)
    midPct: number;   // Z3 (tempo, allure marathon)
    highPct: number;  // Z4-Z7 (seuil, VO2, VMA, sprint, intervalles)
    unknownPct: number; // temps non classifiable (ni zones, ni mot-clé) — % du temps TOTAL
  };
  /** Whether this looks like a deload/recovery week (basé sur le contenu
   *  observé — thème/phase, nombre de séances actives). */
  isDeload: boolean;
  /** Fix A7 (audit "génération de plan IA") : weekType canonique
   *  (inferWeekType, sessionSizingMatrix.ts) calculé à partir de la position
   *  réelle (weekNumber/totalWeeks/objective) — même fonction que la
   *  génération utilise pour le quota hebdo. `null` si totalWeeks
   *  indisponible à l'appel. Distinct d'isDeload (contenu observé) : utilisé
   *  en exemption ADDITIONNELLE par validateKeySessions (règle 3) uniquement
   *  — ne remplace pas isDeload pour les règles qui vérifient que la charge a
   *  RÉELLEMENT été réduite (validateLoadPattern). */
  scheduledWeekType: WeekType | null;
  /** Audit scientifique P0 — F4 : signal de décharge basé UNIQUEMENT sur un
   *  contenu/planning RÉEL (texte de thème OU scheduledWeekType calculé à la
   *  génération) — JAMAIS sur le simple nombre de séances actives, qui
   *  exemptait à tort une semaine courte mais 100% intense de la Règle #1
   *  (validatePolarization). Utilisé UNIQUEMENT par cette règle ; `isDeload`
   *  (qui inclut le proxy de comptage) reste inchangé pour les autres règles
   *  déjà calibrées sur cette définition plus large (Rule 2 décharge
   *  manquante, Rule 3 séances-clés, etc.) — ne pas réutiliser ailleurs sans
   *  vérifier chaque règle consommatrice individuellement. */
  isContentOrScheduleDeload: boolean;
  /** Whether this looks like a race week */
  isRaceWeek: boolean;
  /** Whether this is an explicitly-named threshold block (norvégien double-seuil,
   *  Sweet Spot étendu) — méthodologie différente et volontairement non polarisée,
   *  cf. THRESHOLD_BLOCK_PATTERNS. */
  isThresholdBlock: boolean;
  /** Key sessions count (🔑 or intensity sessions) */
  keySessions: number;
  /** F-23: Real total weekly duration extracted from session text (minutes) */
  totalDurationMin: number;
  /** F-23: Total duration of key sessions only (minutes) */
  keyDurationMin: number;
  /** F-23: Number of sessions with a parseable duration (sample size) */
  sessionsWithDuration: number;
  /**
   * Correction sprint qualité Marathon/Ironman (oct. 2026) : durée (min) de
   * la séance la PLUS LONGUE de la semaine, par discipline (mêmes clés que
   * `sports`/`keySessionsBySport`) — distinct de `totalDurationMin` (somme).
   * Alimente `validateLongSessionProgression` : rien ne suivait jusqu'ici
   * l'évolution semaine après semaine de la sortie longue (le facteur de
   * risque de surcharge le plus documenté), seulement le volume agrégé.
   * 0 si la discipline est absente cette semaine ou si aucune durée n'a pu
   * être extraite du texte (pas de distinction — les deux cas sont exclus
   * de la comparaison par la règle elle-même, cf. plus bas).
   */
  longestSessionMinBySport: Record<string, number>;
  /**
   * Correction sprint qualité Marathon/Ironman (oct. 2026), #A (demande
   * coach) : SOMME des durées réelles de la semaine par discipline (mêmes
   * clés que `sports`) — distinct de `longestSessionMinBySport` (la PLUS
   * LONGUE séance seule). Alimente `validateTaperVolumeReduction` : vérifier
   * qu'un affûtage réduit réellement le volume PAR DISCIPLINE (pas
   * seulement le volume agrégé, qui peut masquer une discipline qui ne
   * baisse pas du tout). 0 si aucune durée n'a pu être extraite — ne
   * distingue pas "discipline absente" de "durée non parseable", comme
   * `longestSessionMinBySport` (même choix, même raison : exclu de toute
   * comparaison par la règle elle-même plutôt que de deviner).
   */
  durationMinBySport: Record<string, number>;
}

export interface LimiterCoverageItem {
  rank: number;        // 1-4
  key: string;         // e.g. "vo2max", "vlamax"
  hits: number;
  totalKeySessions: number;
  pct: number;         // 0-100
  target: number;      // expected min %
  status: "ok" | "low" | "absent";
}

export interface CatalogUsageStats {
  uniqueCatalogIds: number;
  catalogSessions: number;
  customSessions: number;
  totalKeySessions: number;
  untaggedSessions: number;
}

export interface PlanValidationResult {
  score: number; // 0-100
  grade: "A" | "B" | "C" | "D" | "F";
  issues: ValidationIssue[];
  weekMetrics: WeekMetrics[];
  limiterCoverage: LimiterCoverageItem[];
  catalogStats: CatalogUsageStats;
  summary: {
    polarizationScore: number;
    loadPatternScore: number;
    keySessionsScore: number;
    progressionScore: number;
    sportRatioScore: number;
    catalogRatioScore: number;
    prohibitionComplianceScore: number;
    phaseCoherenceScore: number;
    raceDayScore: number;
    limiterCoherenceScore: number;
    wbalFeasibilityScore: number;
    /** Lot 3 : conformité activeSessions/jour et sessions/semaine vs config coach */
    sessionDensityScore: number;
    /** Lot 4 : conformité tags Lorang A-D vs polarisation Seiler (source: systemPrompt L528-536) */
    lorangCategoriesScore: number;
    /** Conformité charge à impact élevé (CAP/vélo) vs risque blessure CRITIQUE (injuryRiskUnified.ts) */
    injuryRiskComplianceScore: number;
    /** #18 lot 1 : titre H1 conforme à la RÈGLE #0 (BLOQUANTE) */
    titleFormatScore: number;
    /** #18 lot 1 : pas de "Bloc N" dupliqué ni de récap stratégique dont la numérotation redémarre */
    strategicRecapUniquenessScore: number;
    /** #18 lot 1 : jours "Repos" réellement complets (pas de récup active), ≥1/semaine */
    restDayCoherenceScore: number;
    /** #18 lot 1 : pas de séance identique au même jour 2 semaines consécutives */
    antiRepetitionScore: number;
    /** #18 lot 2 : Renfo Fondation présent chaque semaine (Start to Run uniquement — 100 sinon) */
    startToRunStrengthScore: number;
    /** #18 lot 2 : week-end back-to-back présent sur le bloc spécifique (Trail Montagne/Ultra uniquement — 100 sinon) */
    trailBackToBackScore: number;
    /** #18 lot 2 : D+ chiffré sur les séances CAP/Trail (objectifs trail uniquement — 100 sinon) */
    trailDPlusPresenceScore: number;
    /** #18 lot 2 : plancher 2-3 séances/jour (IM/70.3 World Class/Elite/Competitor uniquement — 100 sinon) */
    dailySessionFloorScore: number;
    /** Présence des séances signature LCW (Long Course Weekend) déclarées
     *  "bloquantes" par le prompt de génération (plans LCW uniquement — 100 sinon) */
    lcwSignaturePresenceScore: number;
    /** Fiches "jour J uniquement" (activation/shakeout) utilisées hors de la
     *  semaine de course — 100 si aucune mauvaise utilisation détectée */
    raceDayOnlyFichePlacementScore: number;
    overallComment: string;
  };
  /** Lot 4 : distribution A/B/C/D par semaine + par plan */
  lorangCategories: LorangCategoryDistribution;

}

/** Lot 4 — catégorisation Lorang A/B/C/D d'une séance (source: systemPrompt L528-536). */
export type LorangCategory = "A" | "B" | "C" | "D" | "unknown";

export interface LorangWeekBreakdown {
  weekNumber: number;
  isDeload: boolean;
  A: number;
  B: number;
  C: number;
  D: number;
  unknown: number;
  active: number;
  hasHighOrThreshold: boolean; // ≥1 A OU B (obligatoire hors décharge)
  /** Parmi A/B/C/D ci-dessus, combien proviennent du DERNIER RECOURS
   *  (préfixe-lettre du catalogId, ni zones ni mot-clé disponibles) — cf.
   *  classifyLorang. Confiance faible, cf. LorangCategoryDistribution. */
  uncertainTagging: number;
}

export interface LorangCategoryDistribution {
  totalActive: number;
  tagged: number;
  taggedPct: number;
  A: number; APct: number;
  B: number; BPct: number;
  C: number; CPct: number;
  D: number; DPct: number;
  /** Audit "fiabilité du validateur" (consigne coach) — nombre/% de séances
   *  dont la catégorie A/B/C/D ci-dessus provient UNIQUEMENT du préfixe-
   *  lettre du catalogId (zones ET mots-clés absents). Ce signal est un
   *  DERNIER RECOURS statistiquement peu fiable (vérifié sur le catalogue
   *  réel : la lettre encode une priorité/nécessité, pas la catégorie
   *  Lorang) — ne JAMAIS afficher cette distribution comme certaine sans
   *  tenir compte de ce chiffre. `validateLorangCategories` émet un
   *  avertissement dédié dès que `uncertainTagging > 0`. */
  uncertainTagging: number;
  uncertainTaggingPct: number;
  weeks: LorangWeekBreakdown[];
}


/** Lot 3 — config coach à respecter (sessions/semaine + max/jour) */
export interface SessionDensityConfig {
  sessionsPerWeek?: number;    // cible coach
  maxSessionsPerDay?: number;  // plafond coach (défaut 2)
  /**
   * Correction sprint qualité Marathon/Ironman (oct. 2026), #E : plafond
   * explicite du nombre de journées à ≥2 séances actives/jour, PAR SEMAINE
   * — distinct de `maxSessionsPerDay` (qui plafonne un jour donné, pas le
   * nombre de jours doubles). Coach-déclaré, jamais déduit automatiquement.
   * Omis = contrôle inactif (comportement inchangé).
   */
  maxDoubleDaysPerWeek?: number;
}

export type LimiterGapLike = {
  metric: string;
  weightedImpact: number;
  status?: string;
};

// ═══════════════════════════════════════════════════════════════════════════════
// INTENSITY CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

const LOW_INTENSITY_PATTERNS = /z[12]|endurance|ef\b|footing|récup|recovery|easy|facile|aérobie|z2|zone\s*[12]|fondament|repos actif|régénér|souplesse|mobilité|technique|drill|gammes|éducatif/i;
const MID_INTENSITY_PATTERNS = /z3|tempo\b|allure\s*marathon|sweet\s*spot|zone\s*3|endurance\s*active|fartlek\s*léger/i;
const HIGH_INTENSITY_PATTERNS = /z[4-7]|seuil|threshold|vo2|vma|interval|fractionné|sprint|hiit|30\/30|pma|over.under|norvégienne|billat|canova|race.pace|race.sim|compétition|course\b.*\brace|🏁|force\s*max|plio|rønnestad|sfr|côtes?\s*\d/i;
const KEY_SESSION_PATTERNS = /🔑|clé|key|séance\s*clé|interval|seuil|threshold|vo2|vma|sortie\s*longue|\bsl\b|long\s*(?:run|ride)|brick|race(?:[\s_.-]*sim|[\s_.-]*pace|[\s_.-]*power)|test|compétition|🏁|\bsst\b|sweet[\s_-]*spot|over.?under|train[\s_-]*low|fat\s*(?:max|ox)|lipid|tempo|norv[ée]gi|norwegian|double[\s_-]*threshold|pma|sprint|c[ôo]te|sfr|r[øo]nnestad|plio|strides|drill|force\s*max|[àa]\s*jeun|fasted|mlss|ftp|durabilit|simulation|endurance[\s_-]*long|z2[\s_-]*long|30[\/_ -]?30|allure|gut[\s_-]*train|back[\s_-]*to[\s_-]*back|renfo|ppg|muscul|gainage|core\b|strength/i;
/** Disciplines endurance couvertes par le plancher "séance clé par sport" (validateKeySessions) — Renfo/Brick/Repos ont une sémantique différente. */
const KEY_SESSION_ENDURANCE_SPORTS = ["Natation", "Vélo", "Course"] as const;
/** Clés normalizeObjectiveKey() correspondant à un objectif triathlon (natation+vélo+course). */
const TRIATHLON_OBJECTIVE_KEYS = new Set(["703", "IM", "Sprint", "Olympic"]);
const DELOAD_PATTERNS = /décharge|deload|récup|recovery|repos|allégé|réduit|taper|affûtage|régénér/i;
// Audit — l'ancien RACE_PATTERNS (mots génériques "course"/"race"/"objectif"/
// "marathon"/"ironman"/"triathlon"/"semi"/"trail"/"10k") matchait la quasi-
// totalité des thèmes de semaine normaux (ex. "Chantier Trail Montagne",
// "Consolidation — Allure Course") et désexemptait silencieusement plusieurs
// règles (anti_repetition, daily_session_floor, session_density, Rule 1
// Lorang) sur des semaines qui n'étaient PAS la semaine de course. Remplacé
// par RACE_DAY_PATTERNS (déjà utilisé par validateRaceDayPresence, seul
// signal fiable : marqueurs explicites de jour de course, pas juste une
// mention de l'objectif). Testé au niveau SÉANCE (weekHasRaceDay), pas sur
// le thème de la semaine — un thème peut mentionner l'objectif sans que la
// semaine soit celle de la course.
export { isRaceDaySession, NAMED_RACE_TITLE_PATTERN } from "../../../supabase/functions/_shared/raceDayIdentity";
import { isRaceDaySession, isRaceEventTitle, RACE_DAY_PATTERNS, PRE_RACE_ACTIVATION_PATTERNS } from "../../../supabase/functions/_shared/raceDayIdentity";

/** Vrai si la semaine contient une séance de jour de course réel — cf.
 *  `isRaceDaySession` ci-dessus. Exportée pour AITrainingPlanPage.tsx
 *  (verrou Jour J post-génération, audit "plan multi-objectifs Sables
 *  d'Olonne") — même détection que validateRaceDayPresence, sans dupliquer
 *  la regex. */
export function weekHasRaceDay(week: ParsedWeek): boolean {
  return week.sessions.some(isRaceDaySession);
}

/**
 * Verrou Jour J à la génération (audit "plan multi-objectifs Sables
 * d'Olonne") : le verrouillage du jour de course n'existait jusqu'ici qu'en
 * INSTRUCTION TEXTE dans le prompt (promptHelpers.ts) — rien ne l'imposait
 * mécaniquement, et `validateRaceDayPresence` (ci-dessous) ne s'exécutait
 * qu'au moment de la sauvegarde (handleSaveToPlan, AITrainingPlanPage.tsx),
 * jamais juste après la génération. Constaté sur un vrai plan Ironman 39
 * semaines : S39 (semaine de l'Ironman) finissait sur une séance de
 * mobilité, sans aucune trace du Jour J.
 *
 * Fonction PURE (testable sans React) : détecte si la DERNIÈRE semaine du
 * plan correspond à la date de l'objectif final daté le plus tardif, mais
 * n'en contient pas la séance de compétition elle-même. Le composant
 * appelant (AITrainingPlanPage.tsx) se contente de déclencher la
 * régénération ciblée de la semaine retournée — aucune logique de décision
 * dupliquée côté React.
 */
export function computeMissingFinalRaceDayFix(
  plan: ParsedPlan,
  datedRaceDates: Array<string | null | undefined>,
  planStartDateIso: string,
): { weekNumber: number; finalRaceDate: string } | null {
  if (!plan || plan.weeks.length === 0) return null;
  const dated = datedRaceDates.filter((d): d is string => !!d);
  if (dated.length === 0) return null;

  const finalRaceDate = [...dated].sort().pop()!;
  const finalRaceWeek = computeGoalWeekFromDates(planStartDateIso, finalRaceDate);
  if (finalRaceWeek == null) return null;

  const lastWeek = plan.weeks[plan.weeks.length - 1];
  if (finalRaceWeek !== lastWeek.weekNumber) return null; // le plan ne finit pas sur cet objectif — rien à verrouiller
  if (weekHasRaceDay(lastWeek)) return null; // Jour J déjà présent

  return { weekNumber: lastWeek.weekNumber, finalRaceDate };
}

/** Blocs explicitement nommés comme seuil concentré (méthode norvégienne
 *  double-seuil, Sweet Spot étendu) — cf. audit méthodologique Niveau 2 :
 *  ces semaines appliquent délibérément un modèle différent du polarisé
 *  Seiler (volume seuil élevé et contrôlé plutôt que 80/20), documenté comme
 *  tel dans systemPrompt.ts (FEWSHOT_NORVEGIENNE_SEMI, table Chantier). Ce
 *  n'est pas un plan qui rate la polarisation — c'est un plan qui suit une
 *  autre méthodologie sourcée sur CES semaines précisément nommées comme
 *  telles, à exempter du Rule 1 comme isDeload/isRaceWeek. */
const THRESHOLD_BLOCK_PATTERNS = /norvégien|double.?seuil|sweet.?spot/i;

// Strides / accélérations progressives : accroche neuromusculaire courte
// (10-30s × 4-10 répétitions) greffée en fin de séance EF — Seiler classe
// ces séances Z1-Z2 (volume négligeable, aucun stress métabolique), c'est
// le vocabulaire canonique de CETTE bibliothèque pour les distinguer d'un
// vrai bloc fractionné (30/30, VO2max, seuil, Norvégien...). Sans le garde
// ci-dessous, la simple mention de zone dans "45' Z2 + 6x20" accélérations
// progressives (Z2→Z5)" basculait toute la séance "high" — alors que la
// fiche catalogue correspondante ("EF + Strides", Cat A OBLIGATOIRE) est
// explicitement conçue pour rester polarisée.
const STRIDES_TAIL_PATTERN = /\bstrides?\b|acc[ée]l[ée]rations?\s*progressives?/i;
const GENUINE_INTERVAL_WORK_PATTERN = /seuil|threshold|vo2|vma\b|fractionn[ée]|30\s*\/\s*30|norv[ée]gien|billat|canova|over.under|\bsst\b|sweet\s*spot|pma/i;

/** Audit "fiabilité du validateur" — avant, toute séance sans mot-clé
 *  reconnu retombait silencieusement sur "low" (faux négatif confirmé par
 *  test : une séance réellement quasi-maximale décrite sans le vocabulaire
 *  attendu passait pour une récupération). "unknown" rend ce point mort
 *  explicite au lieu de l'absorber comme un repli sans risque — cf.
 *  validatePolarization, qui le signale désormais séparément plutôt que de
 *  le compter comme conforme. */
export type SessionTier = "low" | "mid" | "high" | "unknown";

/** Mappe les zones structurées (schéma JSON `zones: string[]`, ex. "Z4a",
 *  "Z2") sur Z1-Z7, même convention numérique que LOW/MID/HIGH_INTENSITY_
 *  PATTERNS (Z1-Z2 low, Z3 mid, Z4-Z7 high). Des entrées non numériques
 *  (RPE, %FTP, %VMA — le schéma les autorise aussi) sont ignorées plutôt que
 *  mal interprétées : on ne mappe que ce qui est sans ambiguïté. Zones
 *  mixtes (ex. ["Z2","Z5"]) → tier le plus élevé retenu (cohérent avec le
 *  "check high first" déjà appliqué au texte juste en dessous). Retourne
 *  `null` (pas "unknown") quand `zones` est absent/vide ou ne contient aucun
 *  Z1-Z7 reconnaissable, pour laisser la suite de la fonction retomber sur
 *  le texte sans présumer quoi que ce soit. */
function tierFromZones(zones: string[] | undefined): SessionTier | null {
  if (!zones || zones.length === 0) return null;
  let sawLow = false, sawMid = false, sawHigh = false;
  for (const raw of zones) {
    const m = /z\s*([1-7])/i.exec(raw);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (n <= 2) sawLow = true;
    else if (n === 3) sawMid = true;
    else sawHigh = true;
  }
  if (sawHigh) return "high";
  if (sawMid) return "mid";
  if (sawLow) return "low";
  return null;
}

function classifySessionIntensity(session: ParsedSession): SessionTier {
  const text = intensityContent(`${session.sport} ${session.title} ${session.details}`).toLowerCase();

  if (session.isRest) return "low";

  // Garde strides préservée AVANT la priorité aux zones structurées : une
  // séance EF avec quelques accélérations courtes en fin de séance reste
  // "low" même si `zones` contient un Z5 ponctuel pour ces accélérations
  // (nuance physiologique volontaire, cf. commentaire STRIDES_TAIL_PATTERN
  // — pas un oubli, donc pas écrasée par la priorité donnée aux zones).
  if (STRIDES_TAIL_PATTERN.test(text) && !GENUINE_INTERVAL_WORK_PATTERN.test(text)) {
    return "low";
  }

  // Priorité aux données structurées (audit "fiabilité du validateur",
  // consigne coach) : `zones` existe déjà sur ParsedSession (propagé depuis
  // MergedSession) et est posé par l'IA elle-même via le schéma JSON — plus
  // fiable qu'un regex sur du texte libre quand disponible.
  const zoneTier = tierFromZones(session.zones);
  if (zoneTier) return zoneTier;

  // Check high first (most specific patterns)
  if (HIGH_INTENSITY_PATTERNS.test(text)) return "high";
  if (MID_INTENSITY_PATTERNS.test(text)) return "mid";

  // Default: strength/renfo sessions count as mid
  if (/renfo|muscul|strength|ppg|gainage|core|poids/i.test(text)) return "mid";

  // Explicite : un mot-clé low RECONNU (Z1/Z2/EF/footing/récup...), pas un
  // simple défaut. Avant, ce test n'existait pas ici (LOW_INTENSITY_PATTERNS
  // n'était utilisé que par classifyLorang) et toute séance non reconnue
  // retombait directement sur "low" ci-dessous, qu'elle soit vraiment easy
  // ou non.
  if (LOW_INTENSITY_PATTERNS.test(text)) return "low";

  // Aucun signal exploitable (ni zones, ni mot-clé) : "unknown", plus "low"
  // par défaut — cf. docstring SessionTier.
  return "unknown";
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPS PAR ZONE (Rule 1 — polarisation 80/20, fidèle à Seiler)
// ═══════════════════════════════════════════════════════════════════════════════
// Seiler mesure la polarisation en TEMPS passé par zone, pas en nombre de
// séances. `classifySessionIntensity` classe une séance ENTIÈRE dans un seul
// bucket dès qu'un pattern matche n'importe où dans le texte — une séance
// "55min Z2 + 5min seuil" comptait donc 100% "high", pas 92% "low"/8% "high".
// Le fix des strides (ci-dessus) corrige le cas le plus flagrant, mais le
// problème de fond restait : on découpe maintenant le texte en clauses et on
// pondère chaque clause par sa propre durée avant de les agréger.

/** Découpe une séance en clauses (phrases/segments), unité d'analyse pour le
 *  temps par zone — chaque bloc warm-up/main/cool-down est typiquement sa
 *  propre clause dans le texte généré. */
function splitIntoClauses(text: string): string[] {
  return text
    .split(/[.;|]|\s+puis\s+|\s+→\s+/i)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

/** Minutes mentionnées dans une clause (heures, minutes, répétitions×durée). */
function clauseDurationMin(clause: string): number {
  let total = 0;

  const hRe = /(\d+)\s*h(?![a-zà-ÿ])\s*(\d{1,2})?(?!\d)/g;
  let m: RegExpExecArray | null;
  while ((m = hRe.exec(clause)) !== null) {
    const h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    if (h >= 0 && h <= 12 && min < 60) total += h * 60 + min;
  }

  // "6 x 20min", "2x20'" — répétitions × minutes
  const repMinRe = /(\d{1,2})\s*x\s*(\d{1,3})\s*(?:min(?:utes?)?|')(?!\d)/gi;
  while ((m = repMinRe.exec(clause)) !== null) {
    const reps = parseInt(m[1], 10);
    const mins = parseInt(m[2], 10);
    if (reps > 0 && reps <= 30 && mins > 0 && mins <= 60) total += reps * mins;
  }

  // "6x20s", "10x30"" — répétitions × secondes (strides, 30/30…)
  const repSecRe = /(\d{1,2})\s*x\s*(\d{1,3})\s*(?:s\b|"|″|sec)/gi;
  while ((m = repSecRe.exec(clause)) !== null) {
    const reps = parseInt(m[1], 10);
    const secs = parseInt(m[2], 10);
    if (reps > 0 && reps <= 40 && secs > 0 && secs <= 180) total += (reps * secs) / 60;
  }

  // Minutes nues — seulement si rien de plus spécifique n'a matché dans la
  // clause (évite de compter deux fois "20min" déjà capté par repMinRe).
  if (total === 0) {
    const mRe = /(?<!\d)(\d{1,3})\s*(?:min(?:utes?)?|'|′)(?!\d)/g;
    while ((m = mRe.exec(clause)) !== null) {
      const mm = parseInt(m[1], 10);
      if (mm >= 1 && mm <= 300) total += mm;
    }
  }

  return total;
}

/**
 * Distingue une clause réduite à un simple repère de durée (ex. "15min",
 * "10min WU" — raisonnablement supposée transition/WU-CD, cf. docstring
 * estimateSessionZoneMinutes) d'une clause qui porte un VRAI contenu
 * descriptif qu'on ne reconnaît simplement pas (ex. "à l'intensité la plus
 * élevée soutenable, format répété"). Seule la seconde doit déclencher
 * "unknown" plutôt qu'un repli "low" non justifié — sinon toute clause,
 * même vide de sens, deviendrait "unknown" et noierait le signal sous le
 * bruit. Heuristique volontairement simple (longueur du résidu après
 * retrait chiffres/unités/mots de liaison courants), pas une analyse
 * sémantique complète — documentée comme telle, pas cachée.
 */
function clauseHasUnrecognizedContent(clause: string): boolean {
  const stripped = clause
    .replace(/\d+/g, " ")
    .replace(/\b(h|min|minutes?|sec|s|wu|cd|puis|de|du|des|la|le|les|à|et|en|avec|pour|sur|dans|au|aux|un|une)\b/gi, " ")
    .replace(/[^a-zàâäéèêëïîôöùûüÿçœæ]+/gi, " ")
    .trim();
  return stripped.length >= 5;
}

/** Classe une clause (pas la séance entière) — même logique que
 *  classifySessionIntensity, appliquée à un fragment de texte.
 *  `zoneFallback` (zones structurées de la séance, cf. tierFromZones) est
 *  consulté UNIQUEMENT quand la clause porte du contenu descriptif non
 *  reconnu (cf. clauseHasUnrecognizedContent) — priorité aux données
 *  structurées sur ce cas précis, sans jamais écraser le repli "low" des
 *  clauses de transition nues (WU/CD sans zone dédiée), qui reste
 *  physiologiquement fondé et volontairement inchangé. */
function clauseTier(clause: string, zoneFallback: SessionTier | null = null): SessionTier {
  const t = intensityContent(clause).toLowerCase();
  if (STRIDES_TAIL_PATTERN.test(t) && !GENUINE_INTERVAL_WORK_PATTERN.test(t)) return "low";
  if (HIGH_INTENSITY_PATTERNS.test(t)) return "high";
  if (MID_INTENSITY_PATTERNS.test(t)) return "mid";
  if (/renfo|muscul|strength|ppg|gainage|core|poids/i.test(t)) return "mid";
  if (LOW_INTENSITY_PATTERNS.test(t)) return "low";
  // Audit "fiabilité du validateur" — avant, TOUTE clause sans mot-clé
  // reconnu retombait sur "low", qu'elle porte un contenu neutre (WU/CD nu)
  // ou un contenu réel juste mal formulé (faux négatif confirmé par test).
  // Priorité aux zones structurées quand elles existent ; sinon "unknown"
  // (signalé explicitement par validatePolarization) pour une clause avec
  // du contenu, "low" seulement pour un repère de durée nu.
  if (clauseHasUnrecognizedContent(t)) return zoneFallback ?? "unknown";
  return "low";
}

interface SessionZoneMinutes { low: number; mid: number; high: number; unknown: number }

/**
 * Estime la répartition low/mid/high(/unknown) EN MINUTES d'une séance, en
 * pondérant chaque clause par sa propre durée plutôt que de classer la
 * séance entière dans un seul bucket. Le temps non capté par une clause
 * reconnaissable est inconnu lorsque le total est structuré. Dans le chemin
 * legacy uniquement, le reliquat (transitions/WU/CD) est crédité à "low" — repli
 * conservateur et physiologiquement fondé (un WU/CD non précisé est presque
 * toujours easy), volontairement inchangé par l'audit "fiabilité du
 * validateur" (ce n'est pas le même point mort que celui ci-dessous).
 * Si AUCUNE clause n'est exploitable du tout (captured===0), on retombe sur
 * la classification globale de la séance (`classifySessionIntensity`), qui
 * peut désormais renvoyer "unknown" — ce temps est alors compté à part,
 * jamais absorbé dans "low" (cf. validatePolarization, qui le signale
 * explicitement plutôt que de présumer une conformité sur du temps non
 * classifiable).
 */
function estimateSessionZoneMinutes(
  session: ParsedSession,
  totalDurationMin: number | null,
): SessionZoneMinutes {
  const acc: SessionZoneMinutes = { low: 0, mid: 0, high: 0, unknown: 0 };
  if (session.isRest || !totalDurationMin || totalDurationMin <= 0) return acc;

  const text = intensityContent(`${session.title} ${session.details}`);
  const clauses = splitIntoClauses(text);
  const zoneFallback = tierFromZones(session.zones);
  let captured = 0;
  for (const clause of clauses) {
    const mins = clauseDurationMin(clause);
    if (mins <= 0) continue;
    acc[clauseTier(clause, zoneFallback)] += mins;
    captured += mins;
  }

  if (captured > totalDurationMin) {
    const scale = totalDurationMin / captured;
    acc.low *= scale;
    acc.mid *= scale;
    acc.high *= scale;
    acc.unknown *= scale;
    captured = totalDurationMin;
  }

  const remainder = totalDurationMin - captured;
  if (remainder > 0) {
    if (captured === 0) {
      acc[classifySessionIntensity(session)] += remainder;
    } else {
      // A preserved total does not prove that an unparsed remainder is easy.
      // Keep legacy WU/CD inference only when no structured total was supplied.
      if (typeof session.durationMin === 'number' && Number.isFinite(session.durationMin) && session.durationMin > 0) {
        acc.unknown += remainder;
      } else {
        acc.low += remainder;
      }
    }
  }
  return acc;
}

function isKeySession(session: ParsedSession): boolean {
  if (session.isRest) return false;
  // Signal structuré posé par l'IA elle-même (chemin JSON, défaut prod) : plus fiable
  // que la détection regex, qui a un historique de faux négatifs (cf. audits
  // AUDIT_LIMITEURS_SEANCES_V1-V3 — porte d'entrée trop restrictive). Le regex reste
  // le seul signal disponible sur le chemin Markdown legacy (isKeySession undefined).
  if (session.isKeySession === true) return true;
  const text = `${session.title} ${session.details}`;
  return KEY_SESSION_PATTERNS.test(text);
}

/**
 * Rule (fix A6, audit "génération de plan IA") : `isKeySession` est un
 * booléen AUTO-DÉCLARÉ par le LLM (chemin JSON) et prime sur toute autre
 * détection dans `isKeySession()` ci-dessus, sans jamais être confronté au
 * contenu réel de la séance (zones, durée, mots-clés d'intensité). Un LLM
 * qui sur-étiquette une séance de récupération en "clé" contournerait
 * silencieusement le plancher par sport (A1/A2) même corrigé — cette règle
 * ne change PAS `isKeySession()` (trop de règles en dépendent déjà pour un
 * changement de confiance non mesuré) mais signale, en avertissement
 * séparé, une déclaration suspecte : `isKeySession:true` sans AUCUN
 * marqueur d'intensité moyenne/haute (seuil, VO2, tempo, sweet spot...)
 * détectable dans le texte.
 */
function validateKeySessionSelfDeclaration(plan: ParsedPlan): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  let totalDeclared = 0;
  let mismatches = 0;
  for (const week of plan.weeks) {
    for (const s of week.sessions) {
      if (s.isRest || s.isKeySession !== true) continue;
      totalDeclared++;
      const text = `${s.title} ${s.details}`;
      if (!HIGH_INTENSITY_PATTERNS.test(text) && !MID_INTENSITY_PATTERNS.test(text)) {
        mismatches++;
        issues.push({
          rule: "key_session_self_declaration_mismatch",
          severity: "warning",
          week: week.weekNumber,
          message: `S${week.weekNumber}: séance déclarée "clé" par l'IA (isKeySession:true) sans marqueur d'intensité détecté dans le texte — "${s.title}"`,
        });
      }
    }
  }
  if (totalDeclared === 0) return { issues: [], score: 100 };
  return { issues, score: Math.round(((totalDeclared - mismatches) / totalDeclared) * 100) };
}

/**
 * Prefer the preserved prescribed duration. Text parsing is legacy fallback only.
 * Handles formats: "1h30", "1h", "90min", "45'", "45 min", "2h 15'".
 * Returns null if no duration found (do not invent a value).
 * If multiple durations appear (e.g. WU + main + CD), returns their SUM
 * up to a sane cap (4h) — typical for tri/trail bricks.
 */
export function parseSessionDurationMin(session: ParsedSession): number | null {
  if (session.isRest) return 0;
  if (typeof session.durationMin === 'number' && Number.isFinite(session.durationMin) && session.durationMin > 0) {
    return session.durationMin;
  }
  const text = `${session.title} ${session.details}`.toLowerCase();
  if (!text.trim()) return null;

  let total = 0;
  let found = false;

  // "1h", "1h30", "2 h 15" — hours (+ optional minutes)
  const hRe = /(\d+)\s*h(?![a-zà-ÿ])\s*(\d{1,2})?(?!\d)/g;
  let m: RegExpExecArray | null;
  while ((m = hRe.exec(text)) !== null) {
    const h = parseInt(m[1], 10);
    const min = m[2] ? parseInt(m[2], 10) : 0;
    if (h >= 0 && h <= 12 && min < 60) {
      total += h * 60 + min;
      found = true;
    }
  }

  // "45min", "45 min", "45'", "45′", "49.5min" — pure minutes (avoid "30/30"
  // or rep counts by requiring a unit). Partie décimale optionnelle : Sprint
  // 5 (audit "fiabilisation moteur", 2026-10-23) — sans elle, "49.5min"
  // matchait seulement "5min" (le groupe \d{1,3} ne retombait que sur le
  // chiffre juste avant "min", le "." cassant le match sur "49"), lisant 5
  // au lieu de 49-50 : un faux calcul issu d'un arrondi/format décimal, pas
  // d'une vraie répétition courte.
  const mRe = /(?<!\d)(\d{1,3}(?:[.,]\d+)?)\s*(?:min(?:utes?)?|'|′)(?!\d)/g;
  while ((m = mRe.exec(text)) !== null) {
    const mm = Math.round(parseFloat(m[1].replace(",", ".")));
    // Skip very small values that are likely interval lengths (e.g. "3'" in "5x3'")
    // Heuristic: minutes >= 15 are likely session durations, smaller are intervals
    if (mm >= 15 && mm <= 300) {
      total += mm;
      found = true;
    }
  }

  if (!found) return null;
  // Cap at 4h (single session) to avoid runaway sums from rep durations
  return Math.min(total, 240);
}

/**
 * GRAND SPRINT P0, Sprint 5 ("charge et prescription réelle"), 2026-10-23 :
 * `parseSessionDurationMin` s'abstient honnêtement (retourne `null`, jamais
 * une valeur inventée) quand une séance ne contient aucun jeton de durée
 * explicite reconnu (ex. "5x1km allure 10K" — un bloc en distance sans
 * allure fiable pour en déduire une durée, une alternance/répétition
 * décrite autrement qu'en min/h). Mais `WeekMetrics.totalDurationMin`
 * (extractWeekMetrics ci-dessus) ne fait QUE sommer les durées parseables —
 * une séance non calculable contribue 0, SILENCIEUSEMENT, exactement comme
 * si elle durait 0 minute. Sur une semaine où la plupart des séances ne
 * sont pas calculables, `totalDurationMin` peut donc afficher une fraction
 * minime du volume réellement prescrit (cas démontré : une semaine à
 * 235min réellement prescrites lue comme 55min, les ~180min restantes
 * venant de séances sans jeton min/h reconnu).
 *
 * `validateProgression` (ci-dessous, préexistant) se protégeait déjà de ce
 * cas via un seuil de couverture (`sessionsWithDuration/activeSessions
 * >= 0.6`) avant de faire confiance à `totalDurationMin`, repliant sur le
 * nombre de séances sinon — mais `validateTaperVolumeReduction`,
 * `validateMilestoneTransition` (check #2) et `validateWeeklyLoadConsistency`
 * comparaient `totalDurationMin` directement, sans ce garde-fou : une
 * semaine d'affûtage mal couverte pouvait paraître "correctement réduite"
 * (ou l'inverse) sur une comparaison faite de deux nombres largement sous-
 * comptés. Généralisé ici en un helper partagé, même seuil (0.6) que
 * `validateProgression` pour rester cohérent plan-entier : abstention
 * honnête (score 100, aucune issue) plutôt qu'un verdict fondé sur une
 * durée non fiablement calculable — jamais un signal fabriqué.
 */
function weekHasReliableDuration(w: WeekMetrics): boolean {
  return w.activeSessions === 0 || w.sessionsWithDuration / Math.max(1, w.activeSessions) >= 0.6;
}

/**
 * Sprint 5 : "rendre les durées non calculables explicitement identifiables"
 * — les contrôles ci-dessus s'ABSTIENNENT silencieusement dès qu'une
 * semaine n'a pas une couverture de durée fiable (cf. weekHasReliableDuration),
 * mais une abstention silencieuse reste une absence de signal, pas une
 * information positive pour le coach. Ce contrôle dédié rend l'incertitude
 * elle-même visible : severity "info" (jamais un score pondéré, jamais une
 * alerte bloquante) — ce n'est pas une anomalie du plan, c'est une limite
 * connue de l'extraction automatique de durée depuis le texte des séances.
 */
function validateDurationCoverage(metrics: WeekMetrics[]): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  for (const wm of metrics) {
    if (wm.activeSessions === 0 || weekHasReliableDuration(wm)) continue;
    issues.push({
      rule: "duration_not_calculable",
      severity: "info",
      week: wm.weekNumber,
      message: `S${wm.weekNumber}: durée non fiablement calculable pour ${wm.activeSessions - wm.sessionsWithDuration}/${wm.activeSessions} séance(s) (ex. blocs en distance/allure, alternances sans jeton min/h explicite)`,
      detail: `Les contrôles basés sur le volume horaire réel (affûtage, charge hebdomadaire, continuité post-jalon) s'abstiennent pour cette semaine plutôt que de comparer des durées partiellement sous-comptées — le volume réellement prescrit peut être supérieur à ce que ${wm.totalDurationMin}min laisse supposer.`,
    });
  }
  return { issues, score: 100 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEEK METRICS EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

function extractWeekMetrics(
  week: ParsedWeek,
  totalWeeks?: number,
  objective?: string | null,
  /** Fix F1 (audit "génération de plan IA", vague 6) : propage l'âge jusqu'à
   *  inferWeekType pour que `scheduledWeekType` reflète le cycle 2:1 (≥40
   *  ans) réellement appliqué à la génération, pas un cycle 3:1 par défaut. */
  athleteAge?: number | null,
  /** Override coach explicite (PlanConfig.deloadCadenceWeeks) — prime sur
   *  l'auto-détection par âge ci-dessus, cf. inferWeekType. */
  cadenceOverride?: 3 | 4 | null,
): WeekMetrics {
  const activeSessions = week.sessions.filter(s => !s.isRest);
  const restDays = new Set(
    week.sessions.filter(s => s.isRest).map(s => s.dayIndex)
  ).size;

  // Sport distribution
  const sports: Record<string, number> = {};
  const keySessionsBySport: Record<string, number> = {};
  for (const s of activeSessions) {
    const sport = normalizeSport(s.sport);
    sports[sport] = (sports[sport] || 0) + 1;
    if (isKeySession(s)) {
      keySessionsBySport[sport] = (keySessionsBySport[sport] || 0) + 1;
    }
  }

  // Deload detection — reste basé sur le CONTENU observé (regex thème/phase,
  // ou ≤3 séances actives) : plusieurs règles (validateLoadPattern en
  // particulier, "detects missing deload weeks") vérifient précisément que
  // la génération a RÉELLEMENT réduit la charge une semaine sur N — un
  // signal purement positionnel remplacerait ce contrôle de contenu par une
  // présomption automatique ("semaine 4 = toujours recovery"), qui ne
  // détecterait plus jamais l'absence réelle de décharge.
  const themeText = `${week.theme} ${week.phase}`.toLowerCase();
  const isDeload = DELOAD_PATTERNS.test(themeText) || activeSessions.length <= 3;
  // Fix A7 (audit "génération de plan IA") : weekType canonique (même
  // fonction que la génération utilise pour calculer le quota hebdo,
  // sessionSizingMatrix.ts::inferWeekType), calculé séparément d'isDeload —
  // consommé UNIQUEMENT par validateKeySessions (règle 3) en exemption
  // supplémentaire, pas par les règles qui vérifient le contenu réel.
  const scheduledWeekType = totalWeeks != null
    ? inferWeekType(week.weekNumber, totalWeeks, objective, athleteAge, cadenceOverride)
    : null;

  // Audit scientifique P0 — F4 : contrairement à isDeload ci-dessus, AUCUN
  // proxy de comptage (activeSessions<=3) — seulement du contenu/planning
  // réel. Repli sur le texte seul si scheduledWeekType est indisponible
  // (totalWeeks non fourni à l'appel), jamais sur le nombre de séances.
  const isContentOrScheduleDeload =
    DELOAD_PATTERNS.test(themeText) ||
    scheduledWeekType === "recovery" ||
    scheduledWeekType === "taper";

  // Race week detection
  const isRaceWeek = weekHasRaceDay(week);

  // Threshold block detection (Niveau 2) — nommage explicite du bloc/thème
  const isThresholdBlock = THRESHOLD_BLOCK_PATTERNS.test(themeText);

  // Key sessions
  const keySessions = activeSessions.filter(isKeySession).length;

  // F-23: Real durations (sum of parseable session durations) + intensity
  // distribution EN TEMPS (pas en nombre de séances — cf. estimateSessionZoneMinutes).
  let totalDurationMin = 0;
  let keyDurationMin = 0;
  let sessionsWithDuration = 0;
  let low = 0, mid = 0, high = 0, unknown = 0;
  const longestSessionMinBySport: Record<string, number> = {};
  const durationMinBySport: Record<string, number> = {};
  for (const s of activeSessions) {
    const d = parseSessionDurationMin(s);
    if (d !== null && d > 0) {
      totalDurationMin += d;
      sessionsWithDuration++;
      if (isKeySession(s)) keyDurationMin += d;
      const sport = normalizeSport(s.sport);
      longestSessionMinBySport[sport] = Math.max(longestSessionMinBySport[sport] || 0, d);
      durationMinBySport[sport] = (durationMinBySport[sport] || 0) + d;
    }
    const zoneMinutes = estimateSessionZoneMinutes(s, d);
    low += zoneMinutes.low;
    mid += zoneMinutes.mid;
    high += zoneMinutes.high;
    unknown += zoneMinutes.unknown;
  }
  // lowPct/midPct/highPct restent des % du temps CLASSIFIABLE (somme à 100
  // entre eux, comme avant) — unknownPct est séparé, en % du temps TOTAL,
  // pour ne pas fausser le ratio Seiler sur le temps qu'on sait classer.
  const knownTotal = low + mid + high || 1;
  const grandTotal = low + mid + high + unknown || 1;

  return {
    weekNumber: week.weekNumber,
    theme: week.theme,
    totalSessions: week.sessions.length,
    activeSessions: activeSessions.length,
    restDays,
    sports,
    keySessionsBySport,
    intensityProfile: {
      lowPct: Math.round((low / knownTotal) * 100),
      midPct: Math.round((mid / knownTotal) * 100),
      highPct: Math.round((high / knownTotal) * 100),
      unknownPct: Math.round((unknown / grandTotal) * 100),
    },
    isDeload,
    scheduledWeekType,
    isContentOrScheduleDeload,
    isRaceWeek,
    isThresholdBlock,
    keySessions,
    totalDurationMin,
    keyDurationMin,
    sessionsWithDuration,
    longestSessionMinBySport,
    durationMinBySport,
  };
}

function normalizeSport(sport: string): string {
  const s = sport.toLowerCase().trim();
  if (/nat|swim|crawl|piscine/i.test(s)) return "Natation";
  if (/vélo|bike|cycl|vtt/i.test(s)) return "Vélo";
  if (/cap|course|run|trail|footing/i.test(s)) return "Course";
  if (/renfo|muscul|strength|ppg|force|gainage|core/i.test(s)) return "Renfo";
  if (/brick|transition/i.test(s)) return "Brick";
  if (/repos|rest|off/i.test(s)) return "Repos";
  return sport;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RULES
// ═══════════════════════════════════════════════════════════════════════════════

/** Rule 1: Polarization 80/20 (Seiler) */
function validatePolarization(metrics: WeekMetrics[]): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  let compliant = 0;
  let evaluated = 0;

  for (const wm of metrics) {
    // Semaines exclues de l'évaluation (décharge / course / bloc seuil concentré
    // explicitement nommé — norvégien double-seuil, Sweet Spot étendu, cf. audit
    // Niveau 2 / <3 séances) : elles ne comptent NI au numérateur NI au
    // dénominateur (sinon score > 100).
    // Audit scientifique P0 — F4 : `isContentOrScheduleDeload` remplace
    // `isDeload` ICI spécifiquement — `isDeload` exemptait à tort toute
    // semaine à ≤3 séances actives, même 100% intense et sans aucun mot-clé
    // de décharge. `activeSessions < 3` reste un garde-fou séparé et
    // légitime : sous 3 séances, le ratio low/mid/high n'est de toute façon
    // pas un échantillon statistiquement significatif.
    if (wm.isContentOrScheduleDeload || wm.isRaceWeek || wm.isThresholdBlock || wm.activeSessions < 3) {
      continue;
    }


    const { lowPct, midPct, highPct, unknownPct } = wm.intensityProfile;

    // Audit "fiabilité du validateur" — gestion EXPLICITE du temps non
    // classifiable (ni zones structurées, ni mot-clé reconnu), au lieu de
    // l'absorber silencieusement dans "low" comme avant. Seuil 30% choisi
    // comme repère raisonnable (pas de référence Seiler sur ce point
    // précis) : au-delà, une part trop importante du volume hebdo échappe
    // à toute classification pour que lowPct/midPct/highPct ci-dessous
    // (calculés sur le seul temps classifiable) restent un signal fiable à
    // eux seuls. "warning", pas "error" : ce n'est pas une violation
    // constatée, c'est une limite de couverture du validateur lui-même.
    if (unknownPct > 30) {
      issues.push({
        rule: "polarization",
        severity: "warning",
        week: wm.weekNumber,
        message: `S${wm.weekNumber}: ${unknownPct}% du temps de la semaine n'a pas pu être classé (ni zones, ni mot-clé d'intensité reconnu) — la répartition Low/Mid/High ci-dessous ne porte que sur le temps classifiable, vérification manuelle recommandée`,
      });
    }

    // Aucun temps classifiable du tout (100% unknown) : lowPct/midPct
    // retombent sur le dénominateur de repli (cf. extractWeekMetrics,
    // `|| 1`) et afficheraient un trompeur "0% low" lu comme une violation
    // confirmée ("error") — alors qu'on n'a simplement AUCUNE base pour
    // juger la polarisation cette semaine-là. Semaine exclue du
    // numérateur ET du dénominateur de compliance, même traitement que les
    // autres exemptions ci-dessus (décharge/course/bloc seuil/<3 séances) :
    // l'avertissement unknownPct ci-dessus reste le seul signal pour cette
    // semaine.
    if (unknownPct >= 100) {
      continue;
    }

    evaluated++;
    // Low should be 70-85%, high 15-25%, mid < 10% ideally
    if (lowPct < 60) {
      issues.push({
        rule: "polarization",
        severity: "error",
        week: wm.weekNumber,
        message: `S${wm.weekNumber}: Distribution non polarisée — seulement ${lowPct}% en Z1-Z2 (cible ≥ 75%)`,
        detail: `Low: ${lowPct}%, Mid: ${midPct}%, High: ${highPct}%`,
      });
    } else if (lowPct < 70) {
      issues.push({
        rule: "polarization",
        severity: "warning",
        week: wm.weekNumber,
        message: `S${wm.weekNumber}: Polarisation marginale — ${lowPct}% en Z1-Z2 (recommandé ≥ 75%)`,
      });
      compliant += 0.5;
    } else {
      compliant++;
    }

    if (midPct > 25) {
      issues.push({
        rule: "polarization",
        severity: "warning",
        week: wm.weekNumber,
        message: `S${wm.weekNumber}: Trop de Z3 "black hole" — ${midPct}% (cible < 10%)`,
      });
    }
  }

  // `evaluated` (compté dans la boucle ci-dessus) remplace l'ancien
  // recomptage séparé par `metrics.filter(...)` — celui-ci ne reflétait de
  // toute façon pas exactement les mêmes exemptions (isThresholdBlock,
  // nouvelle exemption unknownPct>=100 ci-dessus) ; une seule source de
  // vérité évite que les deux dérivent l'une de l'autre.
  const total = evaluated || 1;
  return { issues, score: Math.max(0, Math.min(100, Math.round((compliant / total) * 100))) };

}

/** Rule 1bis : Densité de jours "qualité" dans la semaine — bug réel observé
 *  (audit PDF, coach) : semaine "Développement TTE" avec Sweet Spot (mardi),
 *  test durabilité Z2 2h30 (mercredi), Seuil Gimenez (jeudi), Tempo Marathon
 *  Canova (vendredi), sortie longue avec blocs Z3 (samedi), negative split
 *  race-pace (dimanche) — 6 jours sur 6 avec un stimulus modéré/dur quelque
 *  part, aucun jour réellement protégé. La Règle #1 ci-dessus (ratio TEMPS
 *  low/mid/high sur toute la semaine) peut très bien rester dans les clous
 *  malgré ça : chaque bloc dur est individuellement court face au volume
 *  Z1-Z2 du jour qui le porte. C'est un problème de RÉCUPÉRATION (espacement
 *  des jours qualité) distinct du ratio temps agrégé — non couvert par
 *  Rule 1. Alimente le même score "polarizationScore", pas de nouveau
 *  poids. */
const HARD_DAY_THRESHOLD_MIN = 15;
const DAYS_IN_WEEK = 7;
const MAX_CONSECUTIVE_HARD_DAYS = 3;

/** Un jour du calendrier réel du plan (pas seulement de la semaine courante).
 *  `calIdx` est une clé d'ordre strictement croissante dans le temps ;
 *  `weekHasRaceDay`/bloc seuil concentré restent des exemptions légitimes
 *  (contenu volontairement concentré/final), jamais le nombre de séances ou
 *  le texte "décharge" — cf. Audit scientifique P0, F4/F6. Un jour appartenant
 *  à une semaine exemptée est simplement ABSENT de la timeline (pas un
 *  isHard=false) : son absence crée un vrai trou dans `calIdx`, qui casse
 *  naturellement toute continuité de séquence avec les semaines voisines —
 *  on ne veut ni qu'un bloc seuil concentré compte contre lui-même, ni qu'il
 *  "contamine" la séquence d'une semaine adjacente normale. */
interface HardDayEntry {
  calIdx: number;
  weekNumber: number;
  dayIndex: number;
  isHard: boolean;
}

function buildHardDayTimeline(plan: ParsedPlan): HardDayEntry[] {
  const entries: HardDayEntry[] = [];
  for (const week of plan.weeks) {
    const themeText = `${week.theme} ${week.phase}`.toLowerCase();
    if (weekHasRaceDay(week) || THRESHOLD_BLOCK_PATTERNS.test(themeText)) continue;

    const activeSessions = week.sessions.filter((s) => !s.isRest);
    const hardMinutesByDay = new Map<number, number>();
    for (const s of activeSessions) {
      const d = parseSessionDurationMin(s);
      const zone = estimateSessionZoneMinutes(s, d);
      hardMinutesByDay.set(s.dayIndex, (hardMinutesByDay.get(s.dayIndex) ?? 0) + zone.mid + zone.high);
    }
    for (let d = 0; d < DAYS_IN_WEEK; d++) {
      entries.push({
        calIdx: week.weekNumber * DAYS_IN_WEEK + d,
        weekNumber: week.weekNumber,
        dayIndex: d,
        isHard: (hardMinutesByDay.get(d) ?? 0) > HARD_DAY_THRESHOLD_MIN,
      });
    }
  }
  entries.sort((a, b) => a.calIdx - b.calIdx);
  return entries;
}

/** Audit scientifique P0 — F4/F6 : densité des stimuli durs calculée sur UNE
 *  SEULE timeline chronologique couvrant tout le plan reçu (pas de reset aux
 *  frontières de semaine), et jamais exemptée par le texte du thème ou le
 *  nombre de séances — seulement par un contenu structurellement différent
 *  (jour de course, bloc seuil concentré explicitement nommé). Une semaine
 *  courte ou une semaine de décharge n'ont besoin d'aucune exemption dédiée :
 *  leur contenu réel (peu/aucun jour dur) ne déclenchera naturellement rien.
 *  F12/F6 : les jours à séances multiples (doubles/triples) sont déjà
 *  agrégés par jour via `hardMinutesByDay` ci-dessus (somme des minutes
 *  mid+high de TOUTES les séances de ce jour), pas seulement la première. */
function validateWeeklyHardDayDensity(plan: ParsedPlan): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  const timeline = buildHardDayTimeline(plan);

  // ── Jours protégés par semaine (métrique par semaine — "charge globale
  //    de récupération" de CETTE semaine, distincte de l'enchaînement
  //    ci-dessous) : reste par semaine réelle, pas de notion de fenêtre
  //    glissante nécessaire ici, mais sans l'exemption de comptage/thème. ──
  const byWeek = new Map<number, HardDayEntry[]>();
  for (const e of timeline) {
    const arr = byWeek.get(e.weekNumber) ?? [];
    arr.push(e);
    byWeek.set(e.weekNumber, arr);
  }
  let compliant = 0;
  let checked = 0;
  for (const [weekNumber, days] of byWeek) {
    const hardDays = days.filter((d) => d.isHard).length;
    const protectedDays = DAYS_IN_WEEK - hardDays;
    checked++;
    if (protectedDays <= 1) {
      issues.push({
        rule: "polarization",
        severity: "warning",
        week: weekNumber,
        message: `S${weekNumber}: ${hardDays}/7 jours avec un stimulus modéré/dur (>${HARD_DAY_THRESHOLD_MIN}min) — seulement ${protectedDays} jour(s) réellement protégé(s) dans la semaine, risque de surcharge malgré un ratio temps low/mid/high polarisé`,
      });
    } else {
      compliant++;
    }
  }

  // ── Enchaînement de jours durs — CONTINU sur tout le plan reçu, ne
  //    s'arrête plus aux frontières de semaine (corrige F6). Rattaché au
  //    numéro de semaine où le streak maximal COMMENCE, pour rester
  //    actionnable pour le coach. ──
  let longestStreak = 0;
  let streakStart: HardDayEntry | null = null;
  let currentStreak = 0;
  let currentStart: HardDayEntry | null = null;
  let prevCalIdx: number | null = null;
  for (const e of timeline) {
    const contiguous = prevCalIdx !== null && e.calIdx === prevCalIdx + 1;
    if (!contiguous) {
      currentStreak = 0;
      currentStart = null;
    }
    if (e.isHard) {
      if (currentStreak === 0) currentStart = e;
      currentStreak++;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        streakStart = currentStart;
      }
    } else {
      currentStreak = 0;
      currentStart = null;
    }
    prevCalIdx = e.calIdx;
  }
  if (longestStreak > MAX_CONSECUTIVE_HARD_DAYS && streakStart) {
    issues.push({
      rule: "polarization",
      severity: "warning",
      week: streakStart.weekNumber,
      message: `S${streakStart.weekNumber} (à partir du jour ${streakStart.dayIndex + 1}) : ${longestStreak} jours consécutifs avec un stimulus modéré/dur (>${HARD_DAY_THRESHOLD_MIN}min), sans jour facile intercalé (max recommandé: ${MAX_CONSECUTIVE_HARD_DAYS}) — risque de surcharge/blessure malgré un ratio ou un total hebdomadaire conformes`,
    });
  }

  return { issues, score: checked === 0 ? 100 : Math.max(0, Math.min(100, Math.round((compliant / checked) * 100))) };
}

/**
 * Audit "B-5K-BEGINNER round 2" (JSON réel, run post-PR#375) : S4 cumulait
 * sprints + côtes + fartlek intense, S10 cumulait finish kick + côtes VO2max
 * + pyramide lactique — 3 stimuli "high" distincts la même semaine, pour une
 * débutante post-Start-to-Run sur un plan à seulement 3 séances/semaine.
 * `validateWeeklyHardDayDensity` ci-dessus ne détecte que les semaines à
 * très forte fréquence (seuil absolu ≥6/7 jours durs sur toute la semaine
 * calendaire) : une semaine de 3 séances où les 3 sont "high" ne le
 * déclenche jamais, le dénominateur (7 jours) écrasant le signal.
 *
 * Portée volontairement restreinte : ne s'active QUE si le signal de niveau
 * est RÉELLEMENT fiable — jamais sur le fallback "light" par défaut
 * (`trainingLevelSource==="fallback-prudent"`, cf. ambitionDowngrade.ts,
 * qui n'est explicitement pas une mesure fiable du niveau réel de
 * l'athlète). Et seulement pour untrained/light — un confirmé/compétiteur
 * visant finisher garde l'accès complet au catalogue avancé (`ambition`
 * et `trainingLevel` restent deux axes distincts, jamais assimilés).
 *
 * N'interdit JAMAIS VMA/côtes/fartlek/accélérations en général — seule
 * l'ACCUMULATION (calculée via `classifySessionIntensity`, qui lit déjà les
 * zones structurées en priorité) est signalée ; chaque séance individuelle
 * reste autorisée.
 *
 * P1 (consigne coach, suite PR #376) : seuil rendu PROPORTIONNEL au nombre
 * de séances actives de la semaine (`demandingSessionCap`) plutôt qu'une
 * valeur fixe — un plan à 3 séances/semaine (cas réel B-5K-BEGINNER, S4/S10 :
 * 3 séances exigeantes sur 3) et un plan à 6 séances/semaine n'ont pas la
 * même tolérance raisonnable à l'accumulation. Même formule que le garde-fou
 * côté réconciliateur (`enforceDemandingAccumulation`, planReconciler.ts) —
 * la détection et la correction doivent s'accorder sur le même seuil.
 */
const BEGINNER_TRAINING_LEVELS = new Set(["untrained", "light"]);
const RELIABLE_TRAINING_LEVEL_SOURCES = new Set(["manual", "auto-tss"]);

/**
 * Audit "B-5K-BEGINNER round 3" (JSON réel 2026-10-14, consigne coach) : S11
 * (taper) signalait "2 séance(s) exigeante(s) sur 3" — les deux "séances
 * exigeantes" citées étaient `D_TAPER_RUN_OPENER` (20' Z1-Z2 + SEULEMENT
 * 4×30s à allure course + 5' Z1, structure réelle du catalogue) et un
 * shakeout similaire : des openers d'affûtage standards (présents dans TOUS
 * les plans course avant compétition), pas de vraies séances qualité.
 * `classifySessionIntensity` classe par ZONE MAXIMALE atteinte dans le texte
 * (ici "Z4a" sur 2 des ~27 minutes de la séance) — exactement l'angle mort
 * que ce correctif cible : distinguer la zone max atteinte (inchangée pour
 * toutes les AUTRES règles qui consomment `classifySessionIntensity` —
 * prohibition_compliance, phase_coherence, lorang_categories… — où même une
 * trace brève d'une zone interdite doit rester détectée) du TEMPS RÉELLEMENT
 * passé à cette intensité, réutilisant le même calcul pondéré par clause que
 * `validatePolarization`/`estimateSessionZoneMinutes` (déjà vérifié fiable,
 * cf. consigne coach "vérifie séparément le calcul de polarisation").
 *
 * Seuils (OR, pas AND — couvre aussi bien une séance courte qu'un plan à
 * faible volume) : au moins 10 minutes cumulées en zone haute, OU au moins
 * 25% de la durée totale de la séance. Un opener (2 min sur 25-30min, ~8%)
 * échoue les deux ; un vrai bloc seuil/VO2max (típicamente ≥15-20min sur
 * 45-60min, ≥25-30%) passe largement les deux. Repli sur
 * `classifySessionIntensity` (comportement identique à avant) si la durée de
 * la séance n'est pas exploitable — mieux qu'une absence totale de signal.
 */
const DEMANDING_MIN_HIGH_MINUTES = 10;
const DEMANDING_MIN_HIGH_RATIO = 0.25;

function isGenuinelyDemandingSession(session: ParsedSession): boolean {
  if (session.isRest) return false;
  const d = parseSessionDurationMin(session);
  if (d === null || d <= 0) return classifySessionIntensity(session) === "high";
  const zone = estimateSessionZoneMinutes(session, d);
  if (zone.high <= 0) return false;
  return zone.high >= DEMANDING_MIN_HIGH_MINUTES || zone.high / d >= DEMANDING_MIN_HIGH_RATIO;
}
/** Au plus la moitié (arrondi bas, minimum 1) des séances actives de la
 *  semaine peut être "exigeante" pour un débutant confirmé. Exporté pour que
 *  le garde-fou proactif côté réconciliateur (`enforceDemandingAccumulation`,
 *  planReconciler.ts) applique exactement le même seuil — la détection
 *  (ici) et la correction (là) doivent s'accorder. */
export function demandingSessionCap(activeCount: number): number {
  return Math.max(1, Math.floor(activeCount / 2));
}

/**
 * Dernière correction ciblée (consigne coach explicite, contre-vérification
 * Codex sur b691980), point B — INTENSITÉ : "STRUCTURE AMBITION (non
 * négociable)" (promptHelpers.ts) impose un nombre fixe de qualités/semaine
 * selon l'ambition (ex. 3 pour "elite") — SEULEMENT dans le prompt envoyé au
 * modèle, sans jamais être vérifié sur le plan RÉELLEMENT généré, ni adapté
 * au type de semaine réellement programmée. Rien n'empêchait jusqu'ici une
 * semaine `scheduledWeekType==="recovery"` d'hériter du même nombre de
 * séances exigeantes qu'une semaine de charge — une semaine de récupération
 * doit réduire charge ET intensité ensemble, pas seulement le volume.
 *
 * Ne reformule PAS le prompt (déjà fait, Correction P0-2) : contrôle le
 * RÉSULTAT réellement généré, seule garantie fiable contre un LLM qui
 * n'applique pas la nuance demandée dans le texte d'instruction.
 *
 * Réutilise `isGenuinelyDemandingSession` (même classifieur que
 * `validateDemandingSessionAccumulation`/`validateWeeklyHardDayDensity` —
 * jamais une 2e définition de "séance exigeante" qui risquerait de diverger).
 * Seuil volontairement bas (>1) : une semaine de récupération peut
 * légitimement garder UNE touche d'intensité courte (maintien neuromusculaire),
 * jamais 2 ou plus — au-delà, ce n'est plus une semaine de récupération.
 */
const RECOVERY_WEEK_DEMANDING_SESSIONS_CAP = 1;

function validateRecoveryWeekIntensity(
  plan: ParsedPlan,
  weekMetrics: WeekMetrics[],
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  const weekTypeByNumber = new Map(weekMetrics.map((m) => [m.weekNumber, m.scheduledWeekType]));
  let compliant = 0;
  let checked = 0;
  for (const week of plan.weeks) {
    if (weekTypeByNumber.get(week.weekNumber) !== "recovery") continue;
    const active = week.sessions.filter((s) => !s.isRest);
    if (active.length === 0) continue;
    checked++;
    const demanding = active.filter((s) => isGenuinelyDemandingSession(s));
    if (demanding.length > RECOVERY_WEEK_DEMANDING_SESSIONS_CAP) {
      issues.push({
        rule: "recovery_week_intensity",
        severity: "error",
        week: week.weekNumber,
        message: `S${week.weekNumber}: ${demanding.length} séance(s) exigeante(s) ("${demanding.map((s) => s.title).join('", "')}") pendant une semaine de RÉCUPÉRATION — incompatible avec ce type de semaine (max ${RECOVERY_WEEK_DEMANDING_SESSIONS_CAP} toléré).`,
        detail: `Le nombre de qualités/semaine fixé par l'ambition ("STRUCTURE AMBITION") ne doit jamais s'appliquer tel quel à une semaine de récupération — charge ET intensité doivent baisser ensemble, pas seulement le volume.`,
      });
    } else {
      compliant++;
    }
  }
  return { issues, score: checked === 0 ? 100 : Math.max(0, Math.min(100, Math.round((compliant / checked) * 100))) };
}

export interface TrainingLevelSignal {
  trainingLevel: string;
  trainingLevelSource: string;
}

function validateDemandingSessionAccumulation(
  plan: ParsedPlan,
  trainingLevelSignal?: TrainingLevelSignal | null,
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  if (
    !trainingLevelSignal ||
    !RELIABLE_TRAINING_LEVEL_SOURCES.has(trainingLevelSignal.trainingLevelSource) ||
    !BEGINNER_TRAINING_LEVELS.has(trainingLevelSignal.trainingLevel)
  ) {
    return { issues, score: 100 };
  }

  let compliant = 0;
  let checked = 0;
  for (const week of plan.weeks) {
    const active = week.sessions.filter((s) => !s.isRest);
    if (active.length === 0 || weekHasRaceDay(week)) continue;
    checked++;
    const demanding = active.filter((s) => isGenuinelyDemandingSession(s));
    if (demanding.length > demandingSessionCap(active.length)) {
      issues.push({
        rule: "demanding_session_accumulation",
        severity: "error",
        week: week.weekNumber,
        message: `S${week.weekNumber}: ${demanding.length} séance(s) exigeante(s) sur ${active.length} ("${demanding.map((s) => s.title).join('", "')}") — accumulation excessive pour un niveau ${trainingLevelSignal.trainingLevel} (source ${trainingLevelSignal.trainingLevelSource})`,
      });
    } else {
      compliant++;
    }
  }

  return { issues, score: checked === 0 ? 100 : Math.max(0, Math.min(100, Math.round((compliant / checked) * 100))) };
}

/** Nom de bloc/thème identifiant une semaine "Race-Specific" (bloc LCW,
 *  cf. plan TFCL — "Bloc 3 · Race-Specific LCW", thème "Spécifique LCW &
 *  Race Power"). */
const RACE_SPECIFIC_BLOCK_PATTERNS = /race[\s-]*specific|sp[ée]cifique.*(?:race|course)|race[\s-]*power/i;

/** Rule 1ter : Écart d'intensité entre sports dans une semaine "Race-Specific"
 *  — bug réel (audit PDF, coach) : la semaine "Spécifique LCW & Race Power"
 *  (Bloc 3) porte TOUT le travail modéré/dur sur le vélo (Sweet Spot Hills,
 *  TT Position Aéro, TT Race Pace LCW), tandis que les 4 séances de course de
 *  la même semaine sont EXACTEMENT la même fiche générique de récupération Z2
 *  (A_RUN_Z2_EASY) — zéro contenu qualité/spécifique course dans une semaine
 *  dont le nom même promet "Race Power". Ni la Règle #1 (ratio temps
 *  agrégé TOUS sports confondus) ni la Règle #1bis (densité de jours durs)
 *  ne voient cet écart : chacune raisonne all-sports-confondus, pas par
 *  sport. Détecte spécifiquement le cas où un sport porte du contenu
 *  modéré/dur pendant qu'un autre sport, présent plusieurs fois la même
 *  semaine, reste strictement bas-régime — alors que la semaine se déclare
 *  elle-même "spécifique course". */
function validateRaceSpecificSportGap(plan: ParsedPlan): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  let compliant = 0;
  let checked = 0;
  const MIN_QUALITY_MIN = 20;

  for (const week of plan.weeks) {
    const themeText = `${week.theme} ${week.phase}`.toLowerCase();
    if (
      !RACE_SPECIFIC_BLOCK_PATTERNS.test(themeText) ||
      DELOAD_PATTERNS.test(themeText) ||
      weekHasRaceDay(week)
    ) {
      continue;
    }

    const activeSessions = week.sessions.filter((s) => !s.isRest);
    const bySport = new Map<string, { qualityMin: number; count: number }>();
    for (const s of activeSessions) {
      const sport = normalizeSport(s.sport);
      if (sport !== "Course" && sport !== "Vélo") continue;
      const d = parseSessionDurationMin(s);
      const zone = estimateSessionZoneMinutes(s, d);
      const rec = bySport.get(sport) ?? { qualityMin: 0, count: 0 };
      rec.qualityMin += zone.mid + zone.high;
      rec.count += 1;
      bySport.set(sport, rec);
    }

    const course = bySport.get("Course");
    const velo = bySport.get("Vélo");
    if (!course || !velo || course.count < 2 || velo.count < 2) continue;

    checked++;
    let starvedSport: string | null = null;
    let loadedSport: string | null = null;
    let loadedMin = 0;
    if (course.qualityMin === 0 && velo.qualityMin >= MIN_QUALITY_MIN) {
      starvedSport = "Course"; loadedSport = "Vélo"; loadedMin = velo.qualityMin;
    } else if (velo.qualityMin === 0 && course.qualityMin >= MIN_QUALITY_MIN) {
      starvedSport = "Vélo"; loadedSport = "Course"; loadedMin = course.qualityMin;
    }

    if (starvedSport) {
      const starvedCount = starvedSport === "Course" ? course.count : velo.count;
      issues.push({
        rule: "polarization",
        severity: "warning",
        week: week.weekNumber,
        message: `S${week.weekNumber}: semaine "${week.theme}" déclarée race-specific — ${loadedSport} porte ${Math.round(loadedMin)}min de travail modéré/dur, ${starvedSport} reste 100% bas-régime (0min) sur ${starvedCount} séance(s), incohérent avec la spécificité annoncée`,
      });
    } else {
      compliant++;
    }
  }

  return { issues, score: checked === 0 ? 100 : Math.max(0, Math.min(100, Math.round((compliant / checked) * 100))) };
}

/** Rule 2: Load/Deload pattern 3:1 or 2:1 */
function validateLoadPattern(metrics: WeekMetrics[]): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];

  if (metrics.length < 4) {
    return { issues: [], score: 100 }; // Too short to validate
  }

  // Check that deload weeks appear at regular intervals
  let maxConsecutiveLoad = 0;
  let currentStreak = 0;
  let deloadCount = 0;

  for (const wm of metrics) {
    if (wm.isDeload || wm.isRaceWeek) {
      if (currentStreak > maxConsecutiveLoad) maxConsecutiveLoad = currentStreak;
      currentStreak = 0;
      deloadCount++;
    } else {
      currentStreak++;
    }
  }
  if (currentStreak > maxConsecutiveLoad) maxConsecutiveLoad = currentStreak;

  // Expected: deload every 2-4 weeks
  const expectedDeloads = Math.floor((metrics.length - 1) / 3); // 3:1 pattern
  const minDeloads = Math.max(1, Math.floor(metrics.length / 5)); // 4:1 at worst

  if (deloadCount < minDeloads) {
    issues.push({
      rule: "load_pattern",
      severity: "error",
      message: `Seulement ${deloadCount} semaine(s) de décharge sur ${metrics.length} semaines (minimum attendu: ${minDeloads})`,
      detail: `Pattern recommandé: 3:1 (3 semaines charge + 1 décharge) ou 2:1`,
    });
  }

  if (maxConsecutiveLoad > 4) {
    issues.push({
      rule: "load_pattern",
      severity: "error",
      message: `${maxConsecutiveLoad} semaines consécutives sans décharge (max recommandé: 3-4)`,
      detail: `Risque de surcharge chronique. Insérer une semaine de décharge (-30 à -40% volume).`,
    });
  } else if (maxConsecutiveLoad === 4) {
    issues.push({
      rule: "load_pattern",
      severity: "warning",
      message: `4 semaines consécutives de charge — acceptable en 4:1 mais surveiller la fatigue`,
    });
  }

  // Score: penalize missing deloads
  const ratio = deloadCount / Math.max(1, expectedDeloads);
  const streakPenalty = maxConsecutiveLoad > 4 ? 20 : maxConsecutiveLoad === 4 ? 5 : 0;
  return { issues, score: Math.max(0, Math.min(100, Math.round(ratio * 100) - streakPenalty)) };
}

/** Rule 3: Key sessions presence */
function validateKeySessions(
  metrics: WeekMetrics[],
  objective?: string,
  ambition?: string,
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  let compliant = 0;

  // Batch 3 — même exemption que validateLorangCategories (Batch 2) : cette
  // règle sœur ("≥1 séance clé/semaine") pénalisait à tort chaque semaine
  // d'un plan Finisher/Start to Run conforme à sa propre doctrine "1-2"/"0"
  // séance(s) clé(s) par semaine — cf. isFinisherOrStartToRunPlan. Retour
  // anticipé (score neutre) plutôt qu'un ratio compliant/total dégénéré
  // (numérateur à 0 sur un dénominateur non filtré aurait donné un score 0).
  if (isFinisherOrStartToRunPlan(objective, ambition)) {
    return { issues: [], score: 100 };
  }

  // Le plancher par sport (ci-dessous) ne porte que sur les disciplines
  // réellement structurantes de l'objectif : Natation/Vélo uniquement pour
  // un triathlon (703/IM/Sprint/Olympic) — sinon une simple séance vélo de
  // cross-training incidentelle dans un plan Marathon/Trail serait à tort
  // signalée comme "sport sans séance clé". "Course" reste vérifiée pour
  // tout objectif : aucun objectif de cette app n'est un pur objectif vélo
  // (cf. audit Cluster 4).
  const objKeyForKeySessions = normalizeObjectiveKey(objective || "");
  const isTriathlonObjective = TRIATHLON_OBJECTIVE_KEYS.has(objKeyForKeySessions);
  const keySessionSportsToCheck = isTriathlonObjective
    ? KEY_SESSION_ENDURANCE_SPORTS
    : KEY_SESSION_ENDURANCE_SPORTS.filter(s => s === "Course");

  for (const wm of metrics) {
    // Décharge / semaine de course : hors périmètre d'évaluation (num. ET dénom.)
    // Fix A7 (audit "génération de plan IA") : quand le contexte le permet
    // (scheduledWeekType non-null), l'exemption se base sur le weekType
    // RÉELLEMENT calculé à la génération plutôt que sur isDeload (heuristique
    // de contenu — ≤3 séances actives ou thème par regex). Sans ce fix, une
    // semaine "load" compressée à ≤3 séances (voyage, blessure) était
    // exemptée à tort de cette règle par isDeload — alors qu'elle DOIT être
    // vérifiée puisqu'elle n'est pas réellement une semaine de récupération
    // planifiée. Repli sur isDeload uniquement si le contexte est absent.
    const isDeloadOrTaperForKeySessions = wm.scheduledWeekType != null
      ? wm.scheduledWeekType === "recovery" || wm.scheduledWeekType === "taper"
      : wm.isDeload;
    if (isDeloadOrTaperForKeySessions || wm.isRaceWeek) {
      continue;
    }

    let weekCompliant: number;

    if (wm.keySessions === 0) {
      issues.push({
        rule: "key_sessions",
        severity: "error",
        week: wm.weekNumber,
        // Audit fix — ce message annonçait "1-3" alors que le code plus bas
        // (2-4 = pleinement conforme, >4 = avertissement) et le prompt
        // (systemPrompt.ts, "Cible : 2-4 séances 🔑 par semaine") ciblent
        // tous deux 2-4. 4 formulations différentes existaient pour la même
        // règle avant ce fix — désormais toutes alignées sur 2-4.
        message: `S${wm.weekNumber}: Aucune séance clé détectée (attendu: 2-4 séances d'intensité/semaine)`,
      });
      weekCompliant = 0;
    } else if (wm.keySessions === 1 && wm.activeSessions >= 5) {
      issues.push({
        rule: "key_sessions",
        severity: "warning",
        week: wm.weekNumber,
        message: `S${wm.weekNumber}: Seulement 1 séance clé pour ${wm.activeSessions} séances actives (recommandé: 2-4)`,
      });
      weekCompliant = 0.5;
    } else if (wm.keySessions > 4) {
      issues.push({
        rule: "key_sessions",
        severity: "warning",
        week: wm.weekNumber,
        message: `S${wm.weekNumber}: ${wm.keySessions} séances clés — risque de surcharge d'intensité`,
      });
      weekCompliant = 0.5;
    } else {
      weekCompliant = 1;
    }

    // Bug réel corrigé (audit "génération de plan IA", volet composition
    // hebdomadaire) : les branches ci-dessus ne regardent que le TOTAL
    // hebdomadaire de séances clés, toutes disciplines confondues — une
    // semaine avec 1 clé vélo + 1 clé course + 3 séances 100% récup
    // natation passait déjà cette règle avec le score maximal. On vérifie
    // ici, en plus, qu'aucune discipline structurante de l'objectif,
    // PRÉSENTE cette semaine, ne se retrouve à 0 séance clé — mêmes
    // exemptions deload/course/Finisher-Start-to-Run que ci-dessus.
    const missingKeyBySport = keySessionSportsToCheck.filter(
      sport => (wm.sports[sport] ?? 0) > 0 && (wm.keySessionsBySport[sport] ?? 0) === 0,
    );
    if (missingKeyBySport.length > 0) {
      for (const sport of missingKeyBySport) {
        issues.push({
          rule: "key_sessions_per_sport",
          severity: "error",
          week: wm.weekNumber,
          message: `S${wm.weekNumber}: ${sport} — ${wm.sports[sport]} séance(s) cette semaine, aucune classée séance clé (toutes récupération/technique)`,
        });
      }
      weekCompliant = 0;
    }

    compliant += weekCompliant;
  }

  // Correction sprint qualité Marathon/Ironman (oct. 2026), #3 : la boucle
  // ci-dessus exclut déjà chaque semaine via `isDeloadOrTaperForKeySessions`
  // (Fix A7, weekType réellement calculé) — mais ce dénominateur recalculait
  // l'exclusion sur le `m.isDeload` brut (texte OU ≤3 séances), une
  // définition PLUS LARGE. Une semaine "load" compressée à ≤3 séances (pas
  // un vrai déload) contribuait alors à `compliant` (boucle, définition
  // étroite) sans jamais compter dans `total` (ici, définition large) :
  // score potentiellement >100% / incohérent pour un plan à faible volume.
  const total = metrics.filter(m => !m.isContentOrScheduleDeload && !m.isRaceWeek).length || 1;
  return { issues, score: Math.max(0, Math.min(100, Math.round((compliant / total) * 100))) };
}

/** Rule 4: Volume progression — F-23: uses real durations when ≥60% of sessions have one */
function validateProgression(metrics: WeekMetrics[]): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];

  if (metrics.length < 3) return { issues: [], score: 100 };

  // Correction sprint qualité Marathon/Ironman (oct. 2026), #5 (découvert en
  // écrivant un test réel du comportement d'affûtage Ironman) : le message
  // de cette règle dit lui-même "hors semaines de décharge ET taper", mais
  // `loadWeeks` ne filtrait que sur `isDeload` (texte OU activeSessions<=3)
  // — une semaine de taper RÉELLE (3 semaines pour IM, scheduledWeekType
  // correctement calculé par position) mais dont le champ `phase` n'a pas
  // (encore) été relabellisé "taper"/"Affûtage" par la génération (même
  // classe de bug que taperVolumeOverride.ts, commentaire "C1" : seule la
  // dernière semaine de taper est parfois correctement étiquetée) restait
  // comptée ici. Un affûtage IM réel et bien formé (volume qui baisse
  // légitimement sur 3 semaines) se faisait alors signaler à tort "Volume en
  // baisse" — repro exacte dans planValidator.imTaper.test.ts. `isContentOrS
  // choleDeload` (déjà utilisé par validatePolarization/validateSportRatio/
  // le saut brusque ci-dessous) exclut ces semaines sur la base du planning
  // RÉELLEMENT calculé à la génération, pas du texte.
  const loadWeeks = metrics.filter(m => !m.isContentOrScheduleDeload && !m.isRaceWeek);
  if (loadWeeks.length < 3) return { issues: [], score: 100 };

  // F-23: prefer real weekly duration if coverage is decent (≥60% sessions parsed)
  const useDuration = loadWeeks.every(w => w.activeSessions === 0 || w.sessionsWithDuration / Math.max(1, w.activeSessions) >= 0.6)
    && loadWeeks.some(w => w.totalDurationMin > 0);
  const volumeOf = (w: WeekMetrics) => useDuration ? w.totalDurationMin : w.activeSessions;
  const volUnit = useDuration ? "min" : "séances";

  // Trend: first third vs last third
  const thirdLen = Math.max(1, Math.floor(loadWeeks.length / 3));
  const firstThird = loadWeeks.slice(0, thirdLen);
  const lastThird = loadWeeks.slice(-thirdLen);

  const avgFirst = firstThird.reduce((s, w) => s + volumeOf(w), 0) / firstThird.length;
  const avgLast = lastThird.reduce((s, w) => s + volumeOf(w), 0) / lastThird.length;

  if (avgLast < avgFirst * 0.85) {
    issues.push({
      rule: "progression",
      severity: "warning",
      message: `Volume en baisse: moyenne ${avgFirst.toFixed(0)}${volUnit}/sem (début) → ${avgLast.toFixed(0)}${volUnit} (fin)`,
      detail: `Une progression positive est attendue hors semaines de décharge et taper.${useDuration ? " (Calculé sur durées réelles)" : ""}`,
    });
  }

  // Sudden jumps (> +30% week to week)
  // Correction sprint qualité Marathon/Ironman (oct. 2026), #3 : `isDeload`
  // (texte OU activeSessions<=3) exemptait à tort cette vérification pour
  // toute semaine à ≤3 séances, même chargée (pas un vrai déload) — exactement
  // le profil à faible fréquence des nouveaux athlètes. `prev.activeSessions
  // < 3` juste après reste un plancher de bruit DIFFÉRENT et toujours
  // légitime (une variation en % n'est pas fiable sur de très petits nombres
  // absolus) — conservé tel quel, seule l'identification du déload change.
  for (let i = 1; i < metrics.length; i++) {
    const prev = metrics[i - 1];
    const curr = metrics[i];
    if (prev.isContentOrScheduleDeload || curr.isContentOrScheduleDeload || curr.isRaceWeek || prev.activeSessions < 3) continue;

    const prevVol = volumeOf(prev);
    const currVol = volumeOf(curr);
    if (prevVol < (useDuration ? 60 : 3)) continue;

    const jump = (currVol - prevVol) / Math.max(1, prevVol);
    if (jump > 0.35) {
      issues.push({
        rule: "progression",
        severity: "warning",
        week: curr.weekNumber,
        message: `S${curr.weekNumber}: Saut de volume +${Math.round(jump * 100)}% vs S${prev.weekNumber} (${prevVol.toFixed(0)} → ${currVol.toFixed(0)} ${volUnit})`,
        detail: `Progression recommandée: +5-10%/semaine maximum.${useDuration ? " (Calculé sur durées réelles)" : ""}`,
      });
    }
  }


  // Check that intensity increases over the plan (key sessions should increase mid-plan)
  const firstHalfKeys = metrics.slice(0, Math.floor(metrics.length / 2))
    .filter(m => !m.isDeload)
    .reduce((s, m) => s + m.keySessions, 0);
  const secondHalfKeys = metrics.slice(Math.floor(metrics.length / 2))
    .filter(m => !m.isDeload && !m.isRaceWeek)
    .reduce((s, m) => s + m.keySessions, 0);

  // It's OK if second half has same or fewer key sessions (taper effect)
  // But first half having 0 is a problem
  if (firstHalfKeys === 0 && loadWeeks.length > 4) {
    issues.push({
      rule: "progression",
      severity: "error",
      message: `Aucune séance clé dans la première moitié du plan`,
    });
  }

  const progressionOk = avgLast >= avgFirst * 0.85 && issues.filter(i => i.severity === "error").length === 0;
  return { issues, score: progressionOk ? 90 : 60 };
}

/**
 * Progression de la sortie longue — correction sprint qualité Marathon/
 * Ironman (oct. 2026). `validateProgression` ci-dessus ne regarde que le
 * volume AGRÉGÉ de la semaine ; rien ne suivait l'évolution de la séance la
 * PLUS LONGUE d'une discipline donnée — le facteur de risque de surcharge le
 * plus documenté (course à pied comme vélo/triathlon longue distance) et
 * explicitement demandé par le coach pour Marathon (course) et Ironman
 * (vélo ET course séparément).
 *
 * Avertissement seulement (pas bloquant) pour ce premier lot de correctifs :
 * un faux positif mal calibré sous pression de délai serait pire qu'un
 * contrôle encore permissif — cf. plan d'exécution 5 jours. Seuil +20%
 * dérivé de la même marge de sécurité déjà citée dans ce fichier et dans le
 * prompt (ACWR ≤ 1.3, Gabbett) pour la rampe de volume globale — plus
 * tolérant que le +10% strict de la rampe Sem 1-2 (une seule séance varie
 * naturellement plus que le volume total), mais plus strict que le +35%
 * déjà utilisé par `validateProgression` pour le volume agrégé (c'est
 * justement l'élément le plus à risque, pas l'ensemble de la semaine).
 * Calibrage ouvert à révision coach — ce n'est pas un seuil qu'aucune
 * donnée réelle n'est encore venue confirmer.
 *
 * N'utilise PAS `isDeload` (motif encore défectueux à plusieurs endroits de
 * ce fichier, cf. correction dédiée) mais directement
 * `isContentOrScheduleDeload`, déjà correct, pour cette règle neuve.
 */
const LONG_SESSION_JUMP_WARNING_PCT = 0.20;
const LONG_SESSION_MIN_BASELINE_MIN = 30; // ignore le bruit sous ~30min (pas une "sortie longue")

function validateLongSessionProgression(
  metrics: WeekMetrics[],
  objective?: string | null,
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  if (metrics.length < 3) return { issues: [], score: 100 };

  const objKey = normalizeObjectiveKey(objective || "");
  const isTriathlon = TRIATHLON_OBJECTIVE_KEYS.has(objKey);
  // Marathon/Semi/10K/5K/Trail*/StartToRun : seule la sortie longue course
  // compte. IM/70.3/Sprint/Olympic : vélo ET course, suivies séparément —
  // une progression saine du vélo ne compense pas une sortie longue course
  // qui s'allonge trop vite (fatigue croisée), et inversement.
  const sportsToTrack = isTriathlon ? ["Vélo", "Course"] : ["Course"];

  const loadWeeksCount = metrics.filter(m => !m.isContentOrScheduleDeload && !m.isRaceWeek).length;
  if (loadWeeksCount < 3) return { issues: [], score: 100 };

  // Comme validateProgression : on NE comble PAS le trou d'une semaine de
  // décharge/course en comparant les deux semaines de charge qui l'encadrent
  // comme si elles étaient consécutives — une paire touchant un déload/une
  // course est simplement ignorée, pas pontée (un retour de volume normal
  // après déload ne doit pas être confondu avec un saut dangereux).
  let worstJump = 0;
  for (const sport of sportsToTrack) {
    for (let i = 1; i < metrics.length; i++) {
      const prev = metrics[i - 1];
      const curr = metrics[i];
      if (prev.isContentOrScheduleDeload || curr.isContentOrScheduleDeload || prev.isRaceWeek || curr.isRaceWeek) continue;

      const prevMin = prev.longestSessionMinBySport[sport] || 0;
      const currMin = curr.longestSessionMinBySport[sport] || 0;
      if (prevMin < LONG_SESSION_MIN_BASELINE_MIN || currMin === 0) continue;

      const jump = (currMin - prevMin) / prevMin;
      if (jump > LONG_SESSION_JUMP_WARNING_PCT) {
        worstJump = Math.max(worstJump, jump);
        issues.push({
          rule: "progression",
          severity: "warning",
          week: curr.weekNumber,
          message: `S${curr.weekNumber}: sortie longue ${sport} +${Math.round(jump * 100)}% vs S${prev.weekNumber} (${prevMin}min → ${currMin}min)`,
          detail: `Progression de la sortie longue recommandée ≤${Math.round(LONG_SESSION_JUMP_WARNING_PCT * 100)}%/semaine (marge de sécurité, calibrage ouvert à révision coach) — c'est l'élément le plus associé au risque de surcharge, distinct du volume hebdomadaire agrégé déjà vérifié par ailleurs.`,
        });
      }
    }
  }

  const score = worstJump === 0 ? 100 : worstJump > 0.50 ? 60 : 80;
  return { issues, score };
}

/**
 * Correction sprint qualité Marathon/Ironman (oct. 2026), #A (demande coach
 * explicite, suite au sprint qualité initial) : vérifie le volume RÉELLEMENT
 * PRESCRIT (durées extraites du texte, `durationMinBySport`/`totalDurationMin`
 * — jamais le libellé "Affûtage"/la phase déclarée) pendant les semaines
 * d'affûtage (taper + semaine de course, cf. `scheduledWeekType`) — distinct
 * de `validateLongSessionProgression` (sortie longue, hausse dangereuse) et
 * de `validateProgression` (tendance globale sur le PLAN ENTIER) : ici, le
 * contrôle est RESTREINT à la fenêtre d'affûtage elle-même et vérifie une
 * BAISSE réelle, discipline par discipline, pas juste l'absence de hausse.
 *
 * Volontairement AUTO-RÉFÉRENCÉ (jamais un pourcentage universel) :
 * - « volume antérieur » : moyenne ET minimum des semaines de charge
 *   (scheduledWeekType==="load") qui précèdent IMMÉDIATEMENT l'affûtage de
 *   CE plan — jamais une cible externe. Deux athlètes au même niveau mais
 *   des volumes différents ont donc des bornes différentes, calculées
 *   depuis LEUR propre plan.
 * - « répartition des disciplines » : Natation/Vélo/Course vérifiées
 *   SÉPARÉMENT (une baisse vélo ne masque jamais une natation figée).
 * - « niveau de l'athlète » : honoré PAR CONSTRUCTION — en comparant
 *   chaque athlète uniquement à ses propres semaines précédentes (jamais à
 *   un autre athlète ni à un volume absolu externe), le contrôle s'adapte
 *   automatiquement à n'importe quel volume hebdomadaire, du Finisher à
 *   l'Elite/World Class, sans qu'aucun seuil numérique n'ait besoin d'être
 *   différent selon le niveau déclaré.
 *
 * Deux signaux, jamais une correction automatique (lecture seule, comme
 * tout ce fichier) :
 *  1. Par discipline, sur CHAQUE semaine d'affûtage : le volume ne doit pas
 *     être ≥ (avec une marge de 5% pour le bruit d'extraction de texte) la
 *     moyenne récente de CETTE discipline — sinon elle n'a tout simplement
 *     pas été réduite.
 *  2. Sur la DERNIÈRE semaine d'affûtage (la plus proche de la course) :
 *     le volume total doit être strictement inférieur à la PLUS LÉGÈRE des
 *     semaines de charge récentes — un affûtage dont la dernière semaine
 *     porte encore plus de volume que la semaine la plus légère du bloc
 *     précédent n'est pas un affûtage, quel que soit le niveau ou la
 *     répartition.
 */
const TAPER_VOLUME_PRIOR_LOOKBACK_WEEKS = 4;
const TAPER_VOLUME_NOISE_TOLERANCE = 1.05; // 5% — bruit d'extraction de texte, pas un seuil physiologique

function validateTaperVolumeReduction(
  metrics: WeekMetrics[],
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];

  const taperWindow = metrics.filter(
    m => m.scheduledWeekType === "taper" || m.scheduledWeekType === "race",
  );
  if (taperWindow.length === 0) return { issues: [], score: 100 };

  const firstTaperIdx = metrics.findIndex(m => m === taperWindow[0]);
  const priorWeeks: WeekMetrics[] = [];
  for (let i = firstTaperIdx - 1; i >= 0 && priorWeeks.length < TAPER_VOLUME_PRIOR_LOOKBACK_WEEKS; i--) {
    if (metrics[i].scheduledWeekType !== "load") break; // s'arrête à la 1ère semaine non "charge" (décharge, autre bloc d'affûtage...)
    priorWeeks.unshift(metrics[i]);
  }
  // Pas assez de semaines de charge de référence juste avant l'affûtage —
  // s'abstenir plutôt que deviner (même logique que primaryTotal<10 ailleurs
  // dans ce fichier : silence honnête, pas un signal fabriqué).
  if (priorWeeks.length < 2) return { issues: [], score: 100 };

  // Sprint 5 : couverture de durée insuffisante sur l'une des semaines
  // comparées (référence OU affûtage) — abstention plutôt qu'un verdict
  // fondé sur un totalDurationMin largement sous-compté (cf. docstring
  // weekHasReliableDuration ci-dessus). Exclut la semaine de course elle-
  // même de cette exigence : son contenu réel est volontairement bref
  // (Jour J, pacing/nutrition) — une faible couverture de durée y est
  // attendue, pas un signal d'extraction défaillante comme pour une
  // semaine de contenu d'entraînement normal.
  const nonRaceTaperWeeks = taperWindow.filter(w => w.scheduledWeekType !== "race");
  if (!priorWeeks.every(weekHasReliableDuration) || !nonRaceTaperWeeks.every(weekHasReliableDuration)) {
    return { issues: [], score: 100 };
  }

  const priorAvgTotal = priorWeeks.reduce((s, w) => s + w.totalDurationMin, 0) / priorWeeks.length;
  const priorMinTotal = Math.min(...priorWeeks.map(w => w.totalDurationMin));
  if (priorAvgTotal <= 0) return { issues: [], score: 100 }; // aucune durée exploitable sur la référence — rien à comparer

  const sportsTracked = ["Natation", "Vélo", "Course"];
  const priorAvgBySport: Record<string, number> = {};
  for (const sport of sportsTracked) {
    const avg = priorWeeks.reduce((s, w) => s + (w.durationMinBySport[sport] || 0), 0) / priorWeeks.length;
    if (avg > 0) priorAvgBySport[sport] = avg;
  }

  for (const wm of taperWindow) {
    for (const sport of Object.keys(priorAvgBySport)) {
      const weekVal = wm.durationMinBySport[sport] || 0;
      const prior = priorAvgBySport[sport];
      if (weekVal >= prior * TAPER_VOLUME_NOISE_TOLERANCE) {
        issues.push({
          rule: "progression",
          severity: "warning",
          week: wm.weekNumber,
          message: `S${wm.weekNumber}: volume ${sport} pendant l'affûtage non réduit (${weekVal}min vs moyenne récente ${Math.round(prior)}min)`,
          detail: `Semaine d'affûtage (${wm.scheduledWeekType}) — le volume réel de cette discipline reste au niveau (ou au-dessus) des semaines de charge qui précèdent, mesuré sur CE plan (pas un seuil externe). Vérifie que la réduction annoncée par le thème/la phase de la semaine correspond au contenu réellement prescrit.`,
        });
      }
    }
  }

  const lastTaperWeek = taperWindow[taperWindow.length - 1];
  if (lastTaperWeek.totalDurationMin >= priorMinTotal) {
    issues.push({
      rule: "progression",
      severity: "warning",
      week: lastTaperWeek.weekNumber,
      message: `S${lastTaperWeek.weekNumber}: volume total de la dernière semaine d'affûtage (${lastTaperWeek.totalDurationMin}min) pas clairement inférieur à la semaine de charge la plus légère récente (${Math.round(priorMinTotal)}min)`,
      detail: `Même la semaine de charge la plus légère du bloc précédent (sur CE plan) porte autant ou plus de volume que la dernière semaine d'affûtage avant la course — l'affûtage n'est pas visible dans le contenu réellement prescrit, quel que soit le niveau de l'athlète ou la répartition des disciplines.`,
    });
  }

  const score = issues.length === 0 ? 100 : issues.length === 1 ? 75 : 55;
  return { issues, score };
}

/**
 * Correction sprint qualité Marathon/Ironman (oct. 2026), #B (demande coach
 * explicite) : validation APRÈS génération des semaines qui ENTOURENT un
 * jalon run-only (ex. 10K) dans un plan dont l'objectif FINAL est triathlon
 * (703/IM) — même périmètre que la correction #6 (rappel de prompt natation/
 * vélo/briques pour ce même jalon), mais ici on vérifie le PLAN RÉELLEMENT
 * GÉNÉRÉ plutôt que le texte envoyé au modèle : rien ne garantit qu'un
 * rappel de prompt soit suivi à 100% — cette règle le constate sur le
 * contenu réel, sans jamais le corriger (lecture seule, comme tout ce
 * fichier) : "Une anomalie doit être signalée explicitement au coach, et
 * non corrigée silencieusement" (demande coach).
 *
 * Trois signaux, chacun sur une fenêtre de semaines précise autour du
 * jalon (jamais sur la moyenne du plan entier, qui masquerait un creux
 * localisé) :
 *  1. Maintien natation/vélo pendant la préparation du jalon (S-2/S-1
 *     avant sa date) — la discipline ne doit pas disparaître des séances.
 *  2. Récupération réelle la semaine suivant le jalon — volume en baisse
 *     par rapport à la préparation, pas une reprise immédiate à charge
 *     pleine (même logique auto-référencée que `validateTaperVolumeReduction`
 *     ci-dessus, appliquée ici à une seule semaine de récupération plutôt
 *     qu'à un bloc d'affûtage complet).
 *  3. Continuité de la préparation vers l'objectif final 2-3 semaines après
 *     le jalon — le volume doit reprendre une tendance vers le haut après
 *     la récupération, pas rester durablement déprimé (plan coupé en deux
 *     blocs déconnectés plutôt qu'une préparation continue).
 *
 * `raceGoals`/`planStartDate` optionnels : omis (plan mono-objectif, ou
 * contexte de date indisponible), cette règle est simplement inactive
 * (score 100, comportement historique inchangé) — jamais un signal fabriqué
 * sans données réelles de date.
 */
const MILESTONE_SPECIFICITY_TOLERANCE_PP = 15; // points de pourcentage — tolérance au bruit, pas un seuil physiologique

function validateMilestoneTransition(
  metrics: WeekMetrics[],
  totalWeeks: number,
  objective: string | undefined,
  raceGoals: ClassifiableRaceGoal[] | undefined,
  planStartDate: string | undefined,
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  if (!raceGoals || raceGoals.length < 2 || !planStartDate) return { issues: [], score: 100 };

  const finalObjKey = normalizeObjectiveKey(objective || "");
  const finalIsTriathlon = finalObjKey === "IM" || finalObjKey === "703";
  if (!finalIsTriathlon) return { issues: [], score: 100 };

  const byWeek = new Map(metrics.map(m => [m.weekNumber, m]));
  const milestones = classifyMultiObjectiveGoalsClient(raceGoals)
    .filter(c => !c.isFullPeak && c.goal.raceDate);

  for (const milestone of milestones) {
    const goalWeek = computeGoalWeekFromDates(planStartDate, milestone.goal.raceDate);
    if (goalWeek == null || goalWeek < 1 || goalWeek > totalWeeks) continue; // hors plan — rien à vérifier
    const label = milestone.goal.raceName || milestone.goal.objective;

    // 1) Maintien natation/vélo pendant la préparation (S-2/S-1 avant le jalon).
    const prepWeekNums: number[] = [];
    for (let w = Math.max(1, goalWeek - 2); w <= goalWeek - 1; w++) prepWeekNums.push(w);
    const prepWeeks = prepWeekNums.map(w => byWeek.get(w)).filter((w): w is WeekMetrics => !!w);

    for (const wm of prepWeeks) {
      for (const sport of ["Natation", "Vélo"]) {
        if ((wm.sports[sport] || 0) === 0) {
          issues.push({
            rule: "progression",
            severity: "warning",
            week: wm.weekNumber,
            message: `S${wm.weekNumber}: ${sport} absente pendant la préparation du jalon ${label} (S${goalWeek})`,
            detail: `Objectif final triathlon (${objective}) — les semaines spécifiques course à pied avant un jalon run-only ne doivent pas faire disparaître ${sport.toLowerCase()} du plan (risque de décrochage technique/aérobie en pleine saison triathlon). Si ${sport.toLowerCase()} est explicitement bannie par l'athlète, cette alerte est un faux positif attendu — à confirmer par le coach.`,
          });
        }
      }
    }

    // 2) Récupération réelle la semaine suivant le jalon.
    const recoveryWeek = byWeek.get(goalWeek + 1);
    // Sprint 5 : couverture de durée insuffisante sur une des semaines
    // comparées — abstention plutôt qu'un verdict fondé sur un
    // totalDurationMin sous-compté (cf. weekHasReliableDuration).
    const durationReliable = prepWeeks.every(weekHasReliableDuration)
      && (!recoveryWeek || weekHasReliableDuration(recoveryWeek));
    const prepAvgTotal = durationReliable && prepWeeks.length > 0
      ? prepWeeks.reduce((s, w) => s + w.totalDurationMin, 0) / prepWeeks.length
      : null;
    if (recoveryWeek && prepAvgTotal !== null && prepAvgTotal > 0
      && recoveryWeek.totalDurationMin >= prepAvgTotal * TAPER_VOLUME_NOISE_TOLERANCE) {
      issues.push({
        rule: "progression",
        severity: "warning",
        week: recoveryWeek.weekNumber,
        message: `S${recoveryWeek.weekNumber}: pas de récupération visible après le jalon ${label} (${recoveryWeek.totalDurationMin}min vs moyenne préparation ${Math.round(prepAvgTotal)}min)`,
        detail: `La semaine suivant un jalon devrait montrer une baisse de volume réelle (récupération), pas une reprise immédiate à charge pleine vers l'objectif final.`,
      });
    }

    // 3) Continuité de la préparation finale 2-3 semaines après le jalon.
    const resumeWeekNums: number[] = [];
    for (let w = goalWeek + 2; w <= Math.min(totalWeeks, goalWeek + 3); w++) resumeWeekNums.push(w);
    const resumeWeeks = resumeWeekNums.map(w => byWeek.get(w)).filter((w): w is WeekMetrics => !!w);
    if (recoveryWeek && weekHasReliableDuration(recoveryWeek) && resumeWeeks.length > 0
      && resumeWeeks.every(weekHasReliableDuration)) {
      const resumeAvgTotal = resumeWeeks.reduce((s, w) => s + w.totalDurationMin, 0) / resumeWeeks.length;
      if (resumeAvgTotal > 0 && resumeAvgTotal <= recoveryWeek.totalDurationMin) {
        issues.push({
          rule: "progression",
          severity: "warning",
          week: resumeWeeks[0].weekNumber,
          message: `S${resumeWeeks[0].weekNumber}-S${resumeWeeks[resumeWeeks.length - 1].weekNumber}: la reprise après le jalon ${label} ne progresse pas vers l'objectif final (moyenne ${Math.round(resumeAvgTotal)}min vs semaine de récupération ${recoveryWeek.totalDurationMin}min)`,
          detail: `Après la récupération post-jalon, le volume devrait reprendre une tendance vers le haut en direction de l'objectif final — un volume qui reste au niveau de la récupération (ou en-dessous) sur plusieurs semaines suggère un plan coupé en deux blocs déconnectés plutôt qu'une préparation continue.`,
        });
      }
    }

    // 4) Réorientation de la spécificité (natation/vélo) pendant la reprise —
    //    demande coach explicite : signaler l'absence de réorientation SANS
    //    imposer une répartition fixe à toutes les phases. Comparaison
    //    auto-référencée à la répartition moyenne du reste de CE plan
    //    (semaines de charge hors fenêtre du jalon), jamais un pourcentage
    //    universel.
    const exclusionWeeks = new Set<number>([...prepWeekNums, goalWeek, goalWeek + 1, ...resumeWeekNums]);
    const baselineWeeks = metrics.filter(
      (m) => m.scheduledWeekType === "load" && !exclusionWeeks.has(m.weekNumber) && m.totalDurationMin > 0,
    );
    if (baselineWeeks.length >= 2 && resumeWeeks.length > 0) {
      const swimBikeShare = (weeks: WeekMetrics[]): number | null => {
        const total = weeks.reduce((s, w) => s + w.totalDurationMin, 0);
        if (total <= 0) return null;
        const swimBike = weeks.reduce(
          (s, w) => s + (w.durationMinBySport["Natation"] || 0) + (w.durationMinBySport["Vélo"] || 0),
          0,
        );
        return (swimBike / total) * 100;
      };
      const baselineShare = swimBikeShare(baselineWeeks);
      const resumeShare = swimBikeShare(resumeWeeks);
      if (
        baselineShare !== null && resumeShare !== null
        && resumeShare < baselineShare - MILESTONE_SPECIFICITY_TOLERANCE_PP
      ) {
        issues.push({
          rule: "progression",
          severity: "warning",
          week: resumeWeeks[0].weekNumber,
          message: `S${resumeWeeks[0].weekNumber}-S${resumeWeeks[resumeWeeks.length - 1].weekNumber}: part natation+vélo pendant la reprise après le jalon ${label} nettement inférieure à la part habituelle de CE plan (${Math.round(resumeShare)}% vs ${Math.round(baselineShare)}% en moyenne hors fenêtre du jalon)`,
          detail: `La reprise semble rester centrée sur la course à pied plutôt que de réorienter vers la spécificité de l'objectif final triathlon. Une reprise progressive (course d'abord, natation/vélo réintroduits ensuite) peut être volontaire ponctuellement — mais ne doit pas durer indéfiniment. Comparaison auto-référencée à la répartition moyenne du reste de CE plan (semaines de charge hors fenêtre du jalon) — jamais une répartition fixe imposée.`,
        });
      }
    }
  }

  const score = issues.length === 0 ? 100 : issues.length <= 2 ? 75 : 55;
  return { issues, score };
}

/**
 * Correction sprint qualité Marathon/Ironman (oct. 2026), #C (demande coach
 * explicite, après lecture des scénarios de validation) : vérifie la
 * COHÉRENCE de la charge hebdomadaire réellement prescrite — par rapport à
 * l'historique de CE plan et, quand elle est fournie, à la charge habituelle
 * et/ou à la disponibilité maximale déclarées par le coach pour cet athlète.
 *
 * Volontairement INACTIF si `loadContext` est entièrement omis (aucun
 * appelant existant n'en dispose encore) — comportement historique inchangé,
 * même logique que `raceGoals`/`planStartDate` pour #B.
 *
 * Point 1 (demande coach) : `habitualWeeklyHours` n'est JAMAIS traité comme
 * un plafond absolu — une semaine de pic au-dessus de la charge habituelle
 * n'est PAS en soi signalée. Seule une HAUSSE BRUTALE par rapport à
 * l'historique récent de CE plan l'est (ratio charge aiguë / charge
 * chronique > 1.3 — règle ACWR de Gabbett, déjà la référence utilisée
 * ailleurs dans ce code pour la rampe de volume initiale — cf.
 * planConfigBuilder.ts — pas un seuil inventé ici pour l'occasion).
 * `maxAvailableWeeklyHours`, quand fourni, ne déclenche JAMAIS une alerte
 * seul — il sert uniquement à ESCALADER en "error" (bloquant, point 4) une
 * hausse déjà détectée qui dépasse EN PLUS ce plafond explicitement déclaré.
 * Sans disponibilité max déclarée, toute hausse détectée reste "warning" (à
 * valider par le coach) — jamais bloquante par défaut sans donnée réelle.
 *
 * Point 3 : deux niveaux de comparaison, une charge globale stable peut
 * masquer une hausse excessive d'une seule discipline :
 *  1. Volume TOTAL de la semaine vs moyenne des semaines de charge
 *     (`scheduledWeekType==="load"`) qui précèdent, sur CE plan.
 *  2. Volume PAR DISCIPLINE (Natation/Vélo/Course séparément) — signalé en
 *     plus UNIQUEMENT si le volume total n'a pas déjà déclenché le signal 1
 *     (éviter de signaler deux fois le même pic).
 *
 * Point 5 (repli documenté) : si CE plan n'a pas encore assez de semaines de
 * charge antérieures (début de plan) MAIS que `habitualWeeklyHours` est
 * fourni, il sert de référence de repli — le `detail` de l'issue le précise
 * explicitement. Sans aucune des deux données pour une semaine donnée, elle
 * est ignorée (silence honnête, pas de signal fabriqué).
 *
 * Hors périmètre volontairement : semaines `scheduledWeekType` "recovery"/
 * "taper"/"race" — une baisse y est attendue (couverte par
 * `validateTaperVolumeReduction`/`validateLoadPattern`), signaler une
 * "hausse" y serait hors-sujet pour cette règle précise.
 */
const WEEKLY_LOAD_LOOKBACK_WEEKS = 4;
const WEEKLY_LOAD_ACWR_THRESHOLD = 1.3; // Gabbett ACWR — même référence que la rampe de volume (planConfigBuilder.ts)

export interface WeeklyLoadContext {
  /** Charge hebdo habituelle RÉELLEMENT effectuée récemment (déclarative ou mesurée), en heures. Jamais traité comme un plafond.
   *  Correction #E : conservé pour compatibilité ascendante — un appelant qui fournit `chronicWeeklyHours`/`recentWeeklyHours`
   *  ci-dessous obtient une distinction plus précise ; `habitualWeeklyHours` seul reste le repli historique inchangé (Correction #C). */
  habitualWeeklyHours?: number;
  /** Disponibilité maximale déclarée par le coach, en heures — distincte de la charge habituelle (point 1). Optionnelle : absente, aucune alerte n'est jamais escaladée en "error". */
  maxAvailableWeeklyHours?: number;
  /**
   * Correction sprint qualité Marathon/Ironman (oct. 2026), #E (demande
   * coach explicite, suite à une hausse réelle 8h→17h/sem sur 4 semaines) :
   * historique de charge DÉCLARATIF (heures, jamais un TSS fictif — le
   * garde-fou CRR/TSS mesuré de `chargeRecenteReference.ts` reste
   * entièrement séparé et inchangé). Pilote exclusivement
   * `validateLoadHistoryCoherence`. Omis = contrôle inactif (comportement
   * inchangé pour tout appelant existant, y compris ceux qui ne fournissent
   * que `habitualWeeklyHours`/`maxAvailableWeeklyHours` ci-dessus).
   */
  /** Volume hebdo chronique tenu AVANT la hausse récente (si une hausse a eu lieu). */
  chronicWeeklyHours?: number;
  /** Volume hebdo RÉELLEMENT effectué récemment — peut différer de la cible/disponibilité du plan. */
  recentWeeklyHours?: number;
  /** Nombre de semaines consécutives à ce volume récent. Absent = durée inconnue, jamais estimée. */
  recentWeeksCount?: number;
}

function validateWeeklyLoadConsistency(
  metrics: WeekMetrics[],
  loadContext: WeeklyLoadContext | null | undefined,
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  if (!loadContext || (!loadContext.habitualWeeklyHours && !loadContext.maxAvailableWeeklyHours)) {
    return { issues: [], score: 100 };
  }
  const habitualTotalMin = loadContext.habitualWeeklyHours ? loadContext.habitualWeeklyHours * 60 : null;
  const maxAvailableMin = loadContext.maxAvailableWeeklyHours ? loadContext.maxAvailableWeeklyHours * 60 : null;
  const sportsTracked = ["Natation", "Vélo", "Course"];

  for (let i = 0; i < metrics.length; i++) {
    const wm = metrics[i];
    if (wm.scheduledWeekType !== "load") continue; // pics de décharge/affûtage/course : hors périmètre de cette règle

    const priorWeeks: WeekMetrics[] = [];
    for (let j = i - 1; j >= 0 && priorWeeks.length < WEEKLY_LOAD_LOOKBACK_WEEKS; j--) {
      if (metrics[j].scheduledWeekType !== "load") break; // s'arrête à la 1ère semaine non "charge"
      priorWeeks.unshift(metrics[j]);
    }

    let chronicAvgTotal: number | null = null;
    let usedDeclaredFallback = false;
    // Sprint 5 : un historique de CE plan dérivé de semaines à couverture de
    // durée insuffisante n'est pas une référence fiable — abstention sur
    // cette référence (repli sur la charge déclarée si disponible) plutôt
    // qu'un ratio calculé sur un totalDurationMin sous-compté.
    if (priorWeeks.length >= 2 && priorWeeks.every(weekHasReliableDuration)) {
      const avg = priorWeeks.reduce((s, w) => s + w.totalDurationMin, 0) / priorWeeks.length;
      if (avg > 0) chronicAvgTotal = avg;
    }
    if (chronicAvgTotal === null && habitualTotalMin) {
      chronicAvgTotal = habitualTotalMin;
      usedDeclaredFallback = true;
    }
    if (chronicAvgTotal === null) continue; // ni historique de CE plan, ni donnée déclarée exploitable
    // La semaine courante elle-même doit aussi être fiablement calculable —
    // sinon le ratio compare une référence valide à un totalDurationMin
    // sous-compté pour CETTE semaine.
    if (!weekHasReliableDuration(wm)) continue;

    const ratio = wm.totalDurationMin / chronicAvgTotal;
    let totalFlagged = false;
    if (ratio > WEEKLY_LOAD_ACWR_THRESHOLD) {
      totalFlagged = true;
      const exceedsMaxAvailable = maxAvailableMin != null && wm.totalDurationMin > maxAvailableMin;
      const baselineNote = usedDeclaredFallback
        ? `Pas encore assez de semaines de charge antérieures sur CE plan — comparaison faite à la charge habituelle déclarée par le coach (${loadContext.habitualWeeklyHours}h/semaine), pas à l'historique du plan.`
        : `Comparaison auto-référencée aux ${priorWeeks.length} semaines de charge précédentes de CE plan.`;
      const escalationNote = exceedsMaxAvailable
        ? ` Le volume dépasse en plus la disponibilité maximale déclarée (${loadContext.maxAvailableWeeklyHours}h) — anomalie bloquante, pas seulement à valider.`
        : ` Ratio > ${WEEKLY_LOAD_ACWR_THRESHOLD} (ACWR Gabbett) : hausse notable, PAS automatiquement une erreur — une semaine de pic de périodisation peut être légitime, à valider par le coach.`;
      issues.push({
        rule: "progression",
        severity: exceedsMaxAvailable ? "error" : "warning",
        week: wm.weekNumber,
        message: `S${wm.weekNumber}: hausse brute de charge totale (${(wm.totalDurationMin / 60).toFixed(1)}h vs ${(chronicAvgTotal / 60).toFixed(1)}h de référence, ratio ${ratio.toFixed(2)})${exceedsMaxAvailable ? " — dépasse la disponibilité maximale déclarée" : ""}`,
        detail: baselineNote + escalationNote,
      });
    }

    if (!totalFlagged && priorWeeks.length >= 2) {
      // Point 3 : une charge globale stable peut masquer une discipline en hausse excessive.
      for (const sport of sportsTracked) {
        const priorAvgSport = priorWeeks.reduce((s, w) => s + (w.durationMinBySport[sport] || 0), 0) / priorWeeks.length;
        if (priorAvgSport <= 0) continue;
        const weekVal = wm.durationMinBySport[sport] || 0;
        const sportRatio = weekVal / priorAvgSport;
        if (sportRatio > WEEKLY_LOAD_ACWR_THRESHOLD) {
          issues.push({
            rule: "progression",
            severity: "warning",
            week: wm.weekNumber,
            message: `S${wm.weekNumber}: hausse brute ${sport} (${Math.round(weekVal)}min vs ${Math.round(priorAvgSport)}min de référence) alors que la charge totale de la semaine reste stable`,
            detail: `La charge hebdomadaire globale ne signale rien d'anormal, mais ${sport.toLowerCase()} augmente seul(e) de plus de ${Math.round((WEEKLY_LOAD_ACWR_THRESHOLD - 1) * 100)}% par rapport aux semaines de charge précédentes de CE plan — une autre discipline a probablement baissé en compensation. À valider par le coach, pas une anomalie bloquante en soi.`,
          });
        }
      }
    }
  }

  const hasError = issues.some((i) => i.severity === "error");
  const score = issues.length === 0 ? 100 : hasError ? 45 : issues.length === 1 ? 75 : 55;
  return { issues, score };
}

/**
 * Correction sprint qualité Marathon/Ironman (oct. 2026), #E (demande coach
 * explicite, suite à la découverte d'une charge réelle passée de 8h/sem à
 * 17h/sem sur seulement 4 semaines) : signale qu'une hausse DÉCLARATIVE
 * (heures renseignées par le coach, jamais mesurées) importante a eu lieu
 * récemment, et que la fenêtre de consolidation n'est peut-être pas encore
 * terminée — sans jamais la présenter comme un ACWR (ratio charge aiguë/
 * chronique MESURÉ, cf. `validateWeeklyLoadConsistency` ci-dessus, qui
 * reste la seule règle à utiliser ce terme, sur des données de CE plan) :
 * demande coach explicite, point 4. Garde-fou CRR/TSS mesuré
 * (`chargeRecenteReference.ts`/`resolveVolumeRampLoadAdjustment`)
 * entièrement CONSERVÉ et séparé — ce contrôle ne le remplace ni ne le
 * modifie, et ne transforme jamais `chronicWeeklyHours`/`recentWeeklyHours`
 * en TSS (point 3).
 *
 * Deux signaux, jamais une correction automatique :
 *  1. Hausse déclarative notable : `recentWeeklyHours` / `chronicWeeklyHours`
 *     > 1.3 (même marge que l'ACWR Gabbett utilisé ailleurs dans ce
 *     fichier — réutilisée comme repère, pas revendiquée comme une mesure
 *     physiologique ici). Toujours "warning" (jamais "error") : une donnée
 *     déclarative ne bloque jamais automatiquement (point 6).
 *  2. Fenêtre de consolidation (seulement si le signal 1 s'est déclenché) :
 *     les premières semaines de CE plan (fenêtre = `recentWeeksCount` si
 *     connu, sinon 4 — le mésocycle déjà utilisé par ce fichier pour le
 *     motif de décharge 3:1/2:1, PAS un nouveau nombre inventé) ne devraient
 *     pas dépasser le volume RÉCENT déjà démontré — jamais une réduction
 *     imposée, seulement un signal si le plan généré remonte plus haut
 *     avant la fin de cette fenêtre (point 6 : aucune progression/réduction
 *     automatique, seulement une observation auto-référencée à CET
 *     athlète).
 *
 * Inactif si `chronicWeeklyHours` OU `recentWeeklyHours` est absent —
 * jamais de signal fabriqué sur un historique partiel (point 5 : ne jamais
 * deviner la durée/l'ampleur d'une hausse non déclarée).
 */
const LOAD_HISTORY_INCREASE_THRESHOLD = 1.3; // repère Gabbett réutilisé — jamais revendiqué comme ACWR mesuré ici
const LOAD_HISTORY_DEFAULT_CONSOLIDATION_WEEKS = 4; // même mésocycle que le motif de décharge 3:1/2:1 de ce fichier
// Dernière correction ciblée (consigne coach explicite, contre-vérification
// Codex sur b691980), point A : tolérance en MINUTES (bruit d'arrondi
// d'extraction de texte), jamais un pourcentage — `TAPER_VOLUME_NOISE_TOLERANCE`
// (5%, pensé pour un usage différent plus haut dans ce fichier) masquait un
// dépassement réel de la limite effective de consolidation (ex. 17h48 vs 17h,
// +4,7%, sous ce seuil de 5%).
const CONSOLIDATION_CEILING_TOLERANCE_MIN = 5;

function validateLoadHistoryCoherence(
  metrics: WeekMetrics[],
  totalWeeks: number,
  loadContext: WeeklyLoadContext | null | undefined,
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  const chronic = loadContext?.chronicWeeklyHours;
  const recent = loadContext?.recentWeeklyHours;
  if (!chronic || !recent || chronic <= 0) return { issues, score: 100 };

  const ratio = recent / chronic;
  if (ratio <= LOAD_HISTORY_INCREASE_THRESHOLD) return { issues, score: 100 };

  const weeksLabel = loadContext?.recentWeeksCount != null
    ? `depuis ${loadContext.recentWeeksCount} semaine(s)`
    : "depuis une durée non précisée";
  issues.push({
    rule: "load_history",
    severity: "warning",
    message: `Hausse de charge déclarative importante : ${chronic}h/sem (charge chronique antérieure) → ${recent}h/sem (charge récente, ${weeksLabel})`,
    detail: `Comparaison DÉCLARATIVE (heures renseignées par le coach) — pas un ACWR mesuré sur des données d'entraînement réelles. Le volume récent n'est peut-être pas encore durablement assimilé : à valider par le coach avant de considérer ${recent}h/sem comme un palier stable, et avant toute nouvelle hausse.`,
  });

  const consolidationWeeks = Math.max(1, Math.min(
    loadContext?.recentWeeksCount ?? LOAD_HISTORY_DEFAULT_CONSOLIDATION_WEEKS,
    totalWeeks,
  ));
  const recentTotalMin = recent * 60;
  for (const wm of metrics.slice(0, consolidationWeeks)) {
    if (wm.scheduledWeekType !== "load") continue; // affûtage/décharge/course : hors périmètre, déjà couverts ailleurs
    // Sprint 5 : une semaine à couverture de durée insuffisante peut afficher
    // un totalDurationMin largement sous-compté — ce contrôle manquerait
    // alors un VRAI dépassement de la limite de consolidation plutôt que
    // d'en inventer un (cf. weekHasReliableDuration).
    if (!weekHasReliableDuration(wm)) continue;
    // Dernière correction ciblée (consigne coach explicite, contre-vérification
    // Codex sur b691980), point A — VOLUME : la limite EFFECTIVE de la fenêtre
    // de consolidation (`recent`, ex. 17h) n'était vérifiée qu'avec la marge de
    // bruit d'extraction de texte réutilisée ailleurs dans ce fichier
    // (`TAPER_VOLUME_NOISE_TOLERANCE`, 5% — pensée pour du bruit d'extraction,
    // jamais revendiquée comme une marge physiologique), ET toujours en
    // "warning" — un dépassement de 17h48 (+4,7%) passait sous ce seuil et
    // n'était même pas signalé. Remplacée ici par une tolérance minute dédiée
    // (pur bruit d'arrondi d'extraction, pas un pourcentage) et une sévérité
    // "error" : CETTE limite effective est désormais une contrainte vérifiée
    // à la validation finale, pas seulement une recommandation dans le prompt
    // (Correction P0-1). Reste strictement scopée à la fenêtre de
    // consolidation déclarée par le coach (`consolidationWeeks` ci-dessus,
    // jamais au-delà) et seulement quand `loadHistory` signale une hausse
    // récente — jamais un plafond permanent/universel : une fois la fenêtre
    // passée (ou en l'absence de ce signal déclaratif), rien n'empêche une
    // progression individualisée vers la cible ambition.
    if (wm.totalDurationMin > recentTotalMin + CONSOLIDATION_CEILING_TOLERANCE_MIN) {
      issues.push({
        rule: "load_history",
        severity: "error",
        week: wm.weekNumber,
        message: `S${wm.weekNumber}: le plan dépasse la limite EFFECTIVE de consolidation (${Math.round(wm.totalDurationMin / 60 * 10) / 10}h vs ${recent}h/sem, limite réellement appliquée pour ce plan) pendant la fenêtre de consolidation (${consolidationWeeks} semaine(s))`,
        detail: `La charge récente de CET athlète (${recent}h/sem) n'est documentée que ${weeksLabel} — tant que cette fenêtre de consolidation n'est pas terminée, ${recent}h/sem est la limite EFFECTIVE de ce plan (cf. Correction P0-1, prompt de génération), pas seulement une recommandation. Ceci n'est PAS un plafond permanent : une fois la fenêtre passée, ou si le coach valide explicitement un nouveau palier, la progression vers la cible ambition reste individualisée et possible.`,
      });
    }
  }

  const score = issues.length <= 1 ? 85 : issues.length <= 3 ? 65 : 50;
  return { issues, score };
}

/**
 * Correction sprint qualité Marathon/Ironman (oct. 2026), #D (demande coach
 * explicite, suite à l'audit "ambition brute vs ambitionEffective") :
 * trace explicitement, à titre PUREMENT INFORMATIF (jamais un score), tout
 * déclassement d'ambition entre ce que le coach a demandé (`saisie`) et ce
 * qui a RÉELLEMENT été utilisé pour générer ce plan (`effective` — la même
 * valeur que celle passée au paramètre `ambition` de `validatePlan`, cf. sa
 * doc). But explicite : que les règles sportives de cette validation
 * (séances-clés, plancher séances/jour Elite+, catégories Lorang — toutes
 * pilotées par ce même `ambition`) jugent le plan sur le niveau RÉELLEMENT
 * utilisé, jamais sur celui initialement demandé — sinon un déclassement
 * physiologiquement justifié (niveau d'entraînement insuffisant) produit de
 * fausses alertes sur un plan qui a pourtant fait exactement ce qu'il
 * fallait.
 *
 * Réutilise les sources canoniques déjà utilisées par la génération
 * (`normalizeAmb`/`mapObjectiveToSport`/`VOLUME_CAP_MATRIX` de
 * deriveRaceTargets.ts, `AMBITIONS` de raceAnalysis.ts) pour que les
 * chiffres cités ici (plafond de volume, séances qualité/semaine) soient
 * EXACTEMENT ceux appliqués à la génération — jamais une 2e copie
 * recalculée séparément qui risquerait de diverger. Ne modifie PAS le
 * mapping ambition↔niveau (ambitionDowngrade.ts) ni les matrices
 * elles-mêmes — lecture seule, comme tout ce fichier.
 *
 * Inactif si `ambitionAudit` est omis (comportement historique inchangé
 * pour tout appelant existant) ou si aucun déclassement n'a eu lieu
 * (`downgraded` falsy) — rien à signaler.
 */
export interface AmbitionAudit {
  /** Ambition CANONIQUE (AmbitionLevel) demandée par le coach, avant tout déclassement. */
  saisie: string;
  /** Ambition CANONIQUE (AmbitionLevel) RÉELLEMENT utilisée pour générer ce plan. */
  effective: string;
  downgraded: boolean;
  /** Motif lisible du déclassement (ex: ambitionResolution.diagnosticNote). */
  reason?: string | null;
}

function validateAmbitionCoherence(
  objective: string | undefined,
  ambitionAudit: AmbitionAudit | null | undefined,
): { issues: ValidationIssue[] } {
  if (!ambitionAudit || !ambitionAudit.downgraded) return { issues: [] };

  const sport = mapObjectiveToSport(objective);
  const localSaisie = normalizeAmb(ambitionAudit.saisie);
  const localEffective = normalizeAmb(ambitionAudit.effective);
  const capSaisie = VOLUME_CAP_MATRIX[sport][localSaisie];
  const capEffective = VOLUME_CAP_MATRIX[sport][localEffective];
  const qSaisie = AMBITIONS.find((a) => a.key === localSaisie)?.qualitesParSemaine;
  const qEffective = AMBITIONS.find((a) => a.key === localEffective)?.qualitesParSemaine;

  const labelSaisie = AMBITION_DEFINITIONS[ambitionAudit.saisie as AmbitionLevel]?.label ?? ambitionAudit.saisie;
  const labelEffective = AMBITION_DEFINITIONS[ambitionAudit.effective as AmbitionLevel]?.label ?? ambitionAudit.effective;

  return {
    issues: [{
      rule: "ambition_coherence",
      severity: "info",
      message: `Ambition déclassée pour la génération : "${labelSaisie}" → "${labelEffective}" — ce plan a été généré ET validé sur "${labelEffective}"`,
      detail: `Motif : ${ambitionAudit.reason ?? "niveau d'entraînement déclaré/mesuré insuffisant pour l'ambition demandée"}. `
        + `Conséquences concrètes (sport "${sport}") : plafond de volume hebdo ${capSaisie}h → ${capEffective}h ; `
        + `séances qualité/semaine ${qSaisie ?? "?"} → ${qEffective ?? "?"}. `
        + `Les règles sportives de cette validation (séances-clés, plancher séances/jour Elite+, catégories Lorang) jugent ce plan sur "${labelEffective}" — jamais sur "${labelSaisie}" — pour éviter une fausse alerte sur un déclassement volontaire et physiologiquement justifié.`,
    }],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPORT RATIO VALIDATION (Rule 5)
// ═══════════════════════════════════════════════════════════════════════════════

// Exported (pas seulement interne) pour permettre un test de couverture
// "Definition of Done" par objectif (cf. objectiveCoverage.definitionOfDone.
// test.ts) : vérifie mécaniquement qu'aucun objectif de ObjectifType n'est
// jamais oublié ici, plutôt que de compter sur un audit manuel ponctuel.
export const SPORT_RATIO_TARGETS: Record<string, { swim?: [number, number]; bike?: [number, number]; run?: [number, number] }> = {
  IM:       { swim: [15, 20], bike: [45, 55], run: [25, 35] },
  "703":    { swim: [15, 20], bike: [40, 50], run: [30, 40] },
  // Audit fix — absents jusqu'ici : le contrôle de ratio par sport retombait
  // silencieusement sur un simple "3 sports présents ?" pour ces deux
  // objectifs (cf. normalizeObjectiveKey.ts). Plages agrégées (min des mins,
  // max des maxs) sur les 5 paliers d'ambition de sportRatioMatrix.ts
  // (edge function — Bevegård/Millet 2011, ITU pathway 2020, Etxebarria 2019).
  Sprint:   { swim: [18, 28], bike: [40, 50], run: [28, 34] },
  Olympic:  { swim: [15, 24], bike: [45, 52], run: [28, 34] },
  Marathon: { run: [85, 100] },
  Semi:     { run: [85, 100] },
  "10K":    { run: [85, 100] },
  "5K":     { run: [85, 100] },
  Trail:    { run: [70, 85] },
  TrailShort: { run: [70, 80] },
  TrailMountain: { run: [65, 80] },
  TrailUltra: { run: [65, 75] },
};

// Use shared normalizer — keep edge function's copy in sync manually
import { normalizeObjectiveKey } from "@/lib/normalizeObjectiveKey";

/** Bug réel (audit PDF, plan "Vince" 70.3 LCW, natation bannie volontairement
 *  par le coach — champ "Contraintes") : les cibles SPORT_RATIO_TARGETS
 *  supposent toujours les 3 disciplines présentes (natation 15-20% etc.).
 *  Quand le coach bannit une discipline via le champ libre "Contraintes",
 *  `sessionSizingMatrix.ts::applyBannedSportsToQuota` redistribue déjà
 *  CORRECTEMENT son quota vers les disciplines restantes en génération —
 *  mais ce validateur, lui, continuait de comparer le plan résultant (0%
 *  natation, par construction) aux cibles génériques 3-disciplines, ce qui
 *  produit un faux-positif "ERREUR GRAVE" sur un plan qui respecte
 *  exactement la contrainte demandée. On redistribue ici la plage cible de
 *  la discipline bannie vers les disciplines restantes, au prorata de leurs
 *  cibles respectives — même logique que la redistribution de quota, sans
 *  dupliquer son code (celui-ci vit côté edge function / hors de portée de
 *  ce module frontend).
 */
function redistributeTargetsForBannedSports(
  target: { swim?: [number, number]; bike?: [number, number]; run?: [number, number] },
  bannedSports: Set<string>,
): { swim?: [number, number]; bike?: [number, number]; run?: [number, number] } {
  const sports: Array<"swim" | "bike" | "run"> = ["swim", "bike", "run"];
  const banned = sports.filter((s) => bannedSports.has(s) && target[s]);
  if (banned.length === 0) return target;
  const remaining = sports.filter((s) => !banned.includes(s) && target[s]);
  if (remaining.length === 0) return target;

  const freedMin = banned.reduce((sum, s) => sum + target[s]![0], 0);
  const freedMax = banned.reduce((sum, s) => sum + target[s]![1], 0);
  const remainingMidSum = remaining.reduce((sum, s) => sum + (target[s]![0] + target[s]![1]) / 2, 0);

  const adjusted: { swim?: [number, number]; bike?: [number, number]; run?: [number, number] } = {};
  for (const s of banned) adjusted[s] = [0, 0]; // discipline bannie : 0% EST la cible correcte.
  for (const s of remaining) {
    const mid = (target[s]![0] + target[s]![1]) / 2;
    const share = remainingMidSum > 0 ? mid / remainingMidSum : 1 / remaining.length;
    adjusted[s] = [
      Math.round(target[s]![0] + freedMin * share),
      Math.round(target[s]![1] + freedMax * share),
    ];
  }
  return adjusted;
}

function validateSportRatio(
  metrics: WeekMetrics[],
  objective?: string,
  constraintsText?: string,
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];

  // Aggregate sport counts across all non-deload weeks
  // Correction sprint qualité Marathon/Ironman (oct. 2026), #3 : `wm.isDeload`
  // (texte OU activeSessions<=3) exemptait à tort TOUTE semaine à ≤3 séances
  // — pour un plan à faible volume (débutant/finisseur, exactement le profil
  // visé par les nouveaux athlètes), chaque semaine satisfait trivialement
  // cette condition, donc `totals` restait vide/nul pour tout le plan : cette
  // règle devenait silencieuse sur un déséquilibre réel. `isContentOrSchedule
  // Deload` (texte OU weekType réellement calculé à la génération, jamais le
  // simple nombre de séances) est déjà la définition correcte — réservée à la
  // polarisation jusqu'ici (cf. doc du champ), étendue ici après vérification
  // que cette règle a bien le même besoin ("la semaine est-elle HONNÊTEMENT
  // une décharge ?", pas "la charge a-t-elle été RÉELLEMENT réduite ?").
  const totals: Record<string, number> = {};
  for (const wm of metrics) {
    if (wm.isContentOrScheduleDeload || wm.isRaceWeek) continue;
    for (const [sport, count] of Object.entries(wm.sports)) {
      totals[sport] = (totals[sport] || 0) + count;
    }
  }

  // Only count primary sports (exclude Renfo, Repos)
  const swim = (totals["Natation"] || 0);
  const bike = (totals["Vélo"] || 0);
  const run = (totals["Course"] || 0) + Math.round((totals["Brick"] || 0) * 0.5);
  const bikeAdj = bike + Math.round((totals["Brick"] || 0) * 0.5);
  const primaryTotal = swim + bikeAdj + run;

  if (primaryTotal < 10) {
    return { issues: [], score: 80 }; // Not enough data
  }

  const swimPct = Math.round((swim / primaryTotal) * 100);
  const bikePct = Math.round((bikeAdj / primaryTotal) * 100);
  const runPct = Math.round((run / primaryTotal) * 100);

  // Find target ratios using proper normalization
  const objKey = normalizeObjectiveKey(objective || "");
  const rawTarget = SPORT_RATIO_TARGETS[objKey];
  const bannedSports = new Set(parseAthleteConstraints(constraintsText).bannedSports);
  const target = rawTarget ? redistributeTargetsForBannedSports(rawTarget, bannedSports) : rawTarget;

  if (!target) {
    // No specific target — just check basic diversity for triathlon-like plans.
    // Une discipline explicitement bannie par le coach est retirée de l'exigence
    // de diversité : son absence est voulue, pas un défaut de génération.
    if ((swim > 0 || bannedSports.has("swim")) && (bike > 0 || bannedSports.has("bike")) && (run > 0 || bannedSports.has("run"))) {
      return { issues: [], score: 90 };
    }
    return { issues: [], score: 80 };
  }

  let deviations = 0;
  let checks = 0;

  if (target.swim) {
    checks++;
    if (swimPct < target.swim[0] - 3 || swimPct > target.swim[1] + 3) {
      issues.push({
        rule: "sport_ratio",
        severity: swimPct < target.swim[0] - 8 || swimPct > target.swim[1] + 8 ? "error" : "warning",
        message: `Natation ${swimPct}% (cible ${target.swim[0]}-${target.swim[1]}%, tolérance ±3%)`,
        detail: `Total: Nat ${swimPct}%, Vélo ${bikePct}%, Course ${runPct}%`,
      });
      deviations++;
    }
  }

  if (target.bike) {
    checks++;
    if (bikePct < target.bike[0] - 3 || bikePct > target.bike[1] + 3) {
      issues.push({
        rule: "sport_ratio",
        severity: bikePct < target.bike[0] - 8 || bikePct > target.bike[1] + 8 ? "error" : "warning",
        message: `Vélo ${bikePct}% (cible ${target.bike[0]}-${target.bike[1]}%, tolérance ±3%)`,
        detail: `Total: Nat ${swimPct}%, Vélo ${bikePct}%, Course ${runPct}%`,
      });
      deviations++;
    }
  }

  if (target.run) {
    checks++;
    if (runPct < target.run[0] - 3 || runPct > target.run[1] + 3) {
      issues.push({
        rule: "sport_ratio",
        severity: runPct < target.run[0] - 8 || runPct > target.run[1] + 8 ? "error" : "warning",
        message: `Course ${runPct}% (cible ${target.run[0]}-${target.run[1]}%, tolérance ±3%)`,
        detail: `Total: Nat ${swimPct}%, Vélo ${bikePct}%, Course ${runPct}%`,
      });
      deviations++;
    }
  }

  const score = checks > 0 ? Math.round(((checks - deviations) / checks) * 100) : 80;
  return { issues, score };
}

// ═══════════════════════════════════════════════════════════════════════════════
// OBJECTIVE ↔ SPORT CONTENT COHERENCE (bloquant, hors score pondéré)
// ═══════════════════════════════════════════════════════════════════════════════

const SPORT_RATIO_KEY_TO_LABEL: Record<"swim" | "bike" | "run", string> = {
  swim: "Natation", bike: "Vélo", run: "Course",
};
const SPORT_RATIO_KEY_TO_CONSTRAINT_SPORT: Record<"swim" | "bike" | "run", ConstraintSport> = {
  swim: "swim", bike: "bike", run: "run",
};

/**
 * Bug réel (B-5K-BEGINNER, 2026-10-13) : un plan "premier 5 km" généré avec
 * 0 séance de course (35 vélo, 12 renfo) a noté 69/100 sans AUCUN signal
 * bloquant — `validateSportRatio` ci-dessus reste muet ici car son garde-fou
 * `primaryTotal < 10` (ligne ~1476) ni ses déviations de ratio ne couvrent
 * le cas "0 séance tout court" d'un objectif mono-discipline (run-only :
 * Marathon/Semi/10K/5K/Trail*, cf. SPORT_RATIO_TARGETS), et aucune autre
 * règle ne relie objectif↔contenu réel. Ce contrôle ADDITIONNEL (n'entre
 * PAS dans PLAN_VALIDATION_WEIGHTS, même traitement que sportObjective/
 * injuryRiskCompliance ci-dessus) détecte spécifiquement : objectif dont
 * SPORT_RATIO_TARGETS n'a QU'UNE seule discipline (donc non-négociable, pas
 * un triathlon où un déséquilibre est tolérable) + 0 séance réelle de cette
 * discipline sur tout le plan. Distingue deux cas pour la décision du coach :
 * - une contrainte explicite bannit vraiment cette discipline → signale
 *   l'incompatibilité objectif/contraintes (texte coach cité en détail) ;
 * - aucune contrainte ne justifie cette absence → signale une anomalie de
 *   génération. Dans les deux cas : erreur bloquante (severity "error", donc
 *   CRITICAL_SCORE_CEILING s'applique), jamais une substitution silencieuse
 *   d'une autre discipline.
 *
 * Audit "plan 70.3 sans natation" (2026-10-23) : un objectif MULTI-discipline
 * (IM/703/Sprint/Olympic) sortait jusqu'ici immédiatement de ce contrôle
 * ("hors scope") — cas réel constaté : plan 70.3 de 32 semaines généré avec
 * 0 natation, 7 vélo, 163 course. `validateSportRatio` (seul autre contrôle
 * de discipline pour le multi-sport) ne couvre que les ÉCARTS DE RATIO : si
 * une discipline est absente, son % cible est par construction redistribué
 * vers les disciplines restantes (`redistributeTargetsForBannedSports`),
 * donc 0% peut devenir "conforme" sans qu'aucun bannissement explicite ne le
 * justifie. Le bloc ci-dessous ajoute un filet de PRÉSENCE (jamais un quota
 * hebdomadaire — uniquement "0 séance sur l'ensemble du plan") pour chaque
 * discipline que SPORT_RATIO_TARGETS déclare attendue (borne basse de sa
 * plage de ratio > 0), avec la même exception de bannissement explicite du
 * coach que ci-dessus.
 */
function validateObjectiveSportCoherence(
  metrics: WeekMetrics[],
  objective: string | undefined,
  constraintsText: string | undefined,
): { issues: ValidationIssue[]; score: number } {
  const objKey = normalizeObjectiveKey(objective || "");
  const target = SPORT_RATIO_TARGETS[objKey];
  if (!target) return { issues: [], score: 100 };

  const hasAnyActiveSession = metrics.some((wm) =>
    Object.entries(wm.sports).some(([sport, count]) => sport !== "Repos" && count > 0),
  );
  if (!hasAnyActiveSession) return { issues: [], score: 100 }; // plan vide — couvert par d'autres règles

  const rules = parseAthleteConstraints(constraintsText);
  const sportKeys = Object.keys(target) as Array<"swim" | "bike" | "run">;

  if (sportKeys.length === 1) {
    const mandatory = sportKeys[0];
    const label = SPORT_RATIO_KEY_TO_LABEL[mandatory];
    const totalSessions = metrics.reduce((sum, wm) => sum + (wm.sports[label] || 0), 0);
    if (totalSessions > 0) return { issues: [], score: 100 };

    const constraintSport = SPORT_RATIO_KEY_TO_CONSTRAINT_SPORT[mandatory];
    const banned = rules.bannedSports.includes(constraintSport);
    const excerpt = rules.rawText.length > 200 ? `${rules.rawText.slice(0, 200)}…` : rules.rawText;

    const message = banned
      ? `Objectif "${objective}" repose entièrement sur ${label}, et une contrainte du texte libre l'interdit explicitement (« ${excerpt} ») — incompatibilité objectif/contraintes à trancher par le coach avant d'utiliser ce plan (0 séance de ${label} sur l'ensemble du plan).`
      : `Objectif "${objective}" repose entièrement sur ${label}, mais 0 séance de ${label} sur l'ensemble du plan, sans contrainte explicite le justifiant — anomalie de génération à corriger avant utilisation (pas de substitution silencieuse d'une autre discipline).`;

    return {
      issues: [{ rule: "objective_sport_conflict", severity: "error", message }],
      score: 0,
    };
  }

  // Multi-sport : absence totale d'une discipline obligatoire (borne basse
  // de ratio > 0), sauf bannissement explicite du coach.
  const missingMandatory = sportKeys.filter((sportKey) => {
    const lo = target[sportKey]![0];
    if (lo <= 0) return false; // pas "obligatoire" pour cet objectif
    const label = SPORT_RATIO_KEY_TO_LABEL[sportKey];
    const totalSessions = metrics.reduce((sum, wm) => sum + (wm.sports[label] || 0), 0);
    if (totalSessions > 0) return false;
    const constraintSport = SPORT_RATIO_KEY_TO_CONSTRAINT_SPORT[sportKey];
    return !rules.bannedSports.includes(constraintSport);
  });

  if (missingMandatory.length === 0) return { issues: [], score: 100 };

  const excerpt = rules.rawText.length > 200 ? `${rules.rawText.slice(0, 200)}…` : rules.rawText;
  const issues: ValidationIssue[] = missingMandatory.map((sportKey) => {
    const label = SPORT_RATIO_KEY_TO_LABEL[sportKey];
    const [lo, hi] = target[sportKey]!;
    return {
      rule: "objective_sport_conflict",
      severity: "error",
      message: `Objectif "${objective}" (multi-discipline) attend ${label} (${lo}-${hi}% du plan), mais 0 séance de ${label} sur l'ensemble du plan, sans contrainte explicite le justifiant (contraintes renseignées : « ${excerpt || "aucune"} ») — anomalie de génération à corriger avant utilisation (pas de substitution silencieuse d'une autre discipline).`,
    };
  });

  return { issues, score: 0 };
}

const CONSTRAINT_SPORT_TO_PLAN_LABEL: Partial<Record<ConstraintSport, string>> = {
  swim: "Natation", bike: "Vélo", run: "Course", strength: "Renfo",
};

/**
 * Sprint 3 (audit "fiabilisation moteur", 2026-10-23) — "empêcher toute
 * substitution automatique de réintroduire une violation critique" : le
 * réconciliateur SERVEUR (jsonPlanHandler.ts) ne consulte `bannedSports`
 * nulle part dans ses fonctions d'insertion/substitution/déduplication
 * (`findCatalogCandidateForSport` et consorts) — seul le bloc PROMPT
 * (`buildAthleteConstraintsBlock`) en a connaissance. Si une correction
 * déterministe post-génération réintroduit même UNE séance de la discipline
 * explicitement bannie par le coach (ex. quota floor, dédoublonnage), rien
 * ne le détectait jusqu'ici : `validateSportRatio` tolère une discipline à
 * target=[0,0] jusqu'à ±3% (donc un faible nombre de séances réintroduites
 * peut rester sous ce seuil et passer inaperçu), et `validateObjectiveSportCoherence`
 * ne vérifie que l'ABSENCE d'une discipline obligatoire, jamais la PRÉSENCE
 * d'une discipline bannie (ce n'est, par définition, jamais "obligatoire").
 * Erreur bloquante (severity "error", jamais une tolérance de %) : une
 * discipline explicitement bannie par le coach n'admet aucune séance, pas
 * même une seule — contrairement à un écart de ratio, il n'y a ici aucune
 * ambiguïté de seuil possible.
 */
function validateBannedSportNotReintroduced(
  metrics: WeekMetrics[],
  constraintsText: string | undefined,
): { issues: ValidationIssue[]; score: number } {
  const rules = parseAthleteConstraints(constraintsText);
  if (rules.bannedSports.length === 0) return { issues: [], score: 100 };

  const issues: ValidationIssue[] = [];
  for (const sportKey of rules.bannedSports) {
    const label = CONSTRAINT_SPORT_TO_PLAN_LABEL[sportKey];
    if (!label) continue; // "any" (ban de jour générique) hors scope de ce contrôle
    // Une séance "Brick" (bike+run combiné) réintroduit implicitement du vélo
    // ET de la course — jamais de la natation (même convention que le calcul
    // de ratio ci-dessus, L.2388-2389).
    const brickContribution = label === "Vélo" || label === "Course" ? 1 : 0;
    const total = metrics.reduce((sum, wm) =>
      sum + (wm.sports[label] || 0) + brickContribution * (wm.sports["Brick"] || 0), 0);
    if (total > 0) {
      issues.push({
        rule: "banned_sport_reintroduced",
        severity: "error",
        message: `${label} explicitement interdite par le coach, mais ${total} séance(s) présente(s) dans le plan final — une correction ou une substitution automatique a probablement réintroduit cette discipline après génération.`,
        detail: `Contraintes renseignées : « ${rules.rawText} ». Aucune correction automatique ne doit pouvoir réintroduire silencieusement une discipline explicitement bannie — vérifiez le plan et, si disponible, la trace de réparation (réconciliateur) pour cette discipline avant utilisation.`,
      });
    }
  }
  return { issues, score: issues.length > 0 ? 0 : 100 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINAL OBJECTIVE ↔ MAIN GOAL COHERENCE (bloquant, hors score pondéré)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Bug réel démontré (audit "plan 70.3 sans natation", 2026-10-23) : un plan
 * dont l'objectif principal déclaré est "703" a été généré avec 0 natation,
 * 7 vélo, 163 course, et une compétition finale "Corrida WSL 10 km" au lieu
 * du 70.3. Cause tracée : `classifyMultiObjectiveGoalsClient` (cf.
 * multiObjectiveClassification.ts) classe les objectifs datés PAR DATE
 * SEULE — la priorité coach ("A"/"B"/"C") n'est utilisée que si une date
 * manque — et désigne INCONDITIONNELLEMENT le dernier objectif daté comme
 * pic final (`isFullPeak: true`), sans passer par les filtres d'éligibilité
 * (`canBeIndependentPeak`/`minGapWeeksForFullPeak`) qui ne s'appliquent
 * qu'aux objectifs non-derniers. Si un jalon secondaire (priorité B/C, ex.
 * un 10K de préparation) a une date postérieure à celle de l'objectif
 * principal (priorité A) — même par une simple erreur de saisie — ce jalon
 * devient le pic final du plan : son objectif devient `catalogObjective`
 * pour la fenêtre de génération correspondante (`planWindowRegen.ts`,
 * `jsonPlanHandler.ts`), qui pilote à son tour le verrou de répartition
 * disciplines du prompt système (`buildObjectiveSportLock`,
 * `systemPrompt.ts`) — d'où l'absence de natation/vélo et la compétition
 * finale erronée, par UN SEUL mécanisme.
 *
 * Ce contrôle ne corrige PAS la classification elle-même (hors scope de ce
 * correctif — voir AGENTS.md pour la recommandation de correction à la
 * source, non implémentée ici par décision du coach) : il détecte, en
 * réutilisant la MÊME fonction de classification déjà utilisée par
 * `validateMilestoneTransition` ci-dessus sur les MÊMES `raceGoals` déjà
 * transmis à `validatePlan`, si l'objectif du pic final qu'elle calcule
 * diverge de l'objectif principal déclaré par le coach — signal direct
 * d'une substitution d'objectif final, qu'elle vienne de ce mécanisme
 * précis ou d'un autre. Erreur bloquante (non-dérogeable, voir
 * NON_DEROGABLE_RULES côté AITrainingPlanPage.tsx) : jamais une correction
 * silencieuse, toujours une décision du coach.
 */
function validateFinalObjectiveMatchesMainGoal(
  objective: string | undefined,
  raceGoals: ClassifiableRaceGoal[] | undefined,
): { issues: ValidationIssue[]; score: number } {
  if (!objective || !raceGoals || raceGoals.length < 2) return { issues: [], score: 100 };

  // Correction Sprint 1 (hiérarchie multiobjectifs, 2026-10-23) :
  // `classifyMultiObjectiveGoalsClient` n'accorde plus `isFullPeak: true`
  // au dernier objectif daté sans condition — seul le dernier objectif daté
  // ÉLIGIBLE à un pic indépendant (`canBeIndependentPeak`) l'obtient
  // désormais. `isLast` (littéralement "dernier objectif daté") n'est donc
  // PLUS un proxy fiable du "pic final gouvernant" : un jalon inéligible
  // (ex. 10K) resté chronologiquement après l'objectif principal reste
  // `isLast: true` mais `isFullPeak: false` — le chercher via `isLast`
  // produirait un FAUX POSITIF ici (la classification a déjà correctement
  // neutralisé ce cas). Le "pic final gouvernant" est maintenant le DERNIER
  // élément, par date, parmi ceux dont `isFullPeak` est vrai — exactement
  // le même critère que `computeObjectiveCycleSegments` utilise pour
  // désigner `isLastCycle: true` (dernier `goalWeek` parmi les pics
  // complets). Plusieurs pics complets légitimes (PR #389, ex. Marathon A +
  // Ironman B lointain) restent sans faux positif : le pic gouvernant est
  // alors le plus TARDIF d'entre eux, cohérent avec l'objectif déclaré quel
  // que soit celui qui vient chronologiquement en premier.
  const classified = classifyMultiObjectiveGoalsClient(raceGoals);
  const fullPeaks = classified.filter((c) => c.isFullPeak && c.goal.raceDate);
  const fullPeak = fullPeaks[fullPeaks.length - 1];
  if (!fullPeak) return { issues: [], score: 100 };

  const mainObjKey = normalizeObjectiveKey(objective);
  const peakObjKey = normalizeObjectiveKey(fullPeak.goal.objective || "");
  if (!mainObjKey || !peakObjKey || mainObjKey === peakObjKey) return { issues: [], score: 100 };

  const label = fullPeak.goal.raceName || fullPeak.goal.objective;
  return {
    issues: [{
      rule: "final_objective_mismatch",
      severity: "error",
      message: `L'objectif principal déclaré ("${objective}") ne correspond pas au pic final calculé pour ce plan ("${label}") — un objectif secondaire semble avoir remplacé l'objectif principal en fin de plan.`,
      detail: `Vérifiez les dates et priorités des objectifs saisis : un objectif secondaire dont la date tombe après celle de l'objectif principal peut lui prendre la place de pic final, même si sa priorité est inférieure (A > B > C). Cette incohérence doit être corrigée (date ou priorité) avant d'utiliser ce plan — aucune correction automatique ne doit la contourner silencieusement.`,
    }],
    score: 0,
  };
}

/**
 * Sprint 1/4 (audit "fiabilisation moteur", 2026-10-23) — "Détecter les
 * incohérences calendaires" : les objectifs datés transmis à `validatePlan`
 * (`raceGoals`/`planStartDate`, déjà câblés pour `validateMilestoneTransition`/
 * `validateFinalObjectiveMatchesMainGoal`) peuvent contenir des dates
 * incohérentes avec le plan généré — une date de course ANTÉRIEURE à la
 * date de début du plan (erreur de saisie probable : année ou mois inversé),
 * ou une date qui tombe largement AU-DELÀ de la durée réelle du plan
 * (`plan.totalWeeks`). Avant ce correctif, ce genre d'incohérence n'était
 * jamais signalé en tant que tel : une date antérieure au départ est
 * silencieusement exclue du calcul de `raceNums` (AITrainingPlanPage.tsx,
 * `if (days >= 0) raceNums.push(...)`), et une date hors plan produit un
 * numéro de semaine qui ne correspond à aucune semaine réelle (cf. le fix
 * ci-dessus sur `validateRaceDayPresence`, qui ne fait que réagir à la
 * conséquence sans jamais nommer la cause calendaire elle-même). Avertissement
 * uniquement (jamais bloquant) : une tolérance de +1 semaine est acceptée
 * (même tolérance que `computeObjectiveCycleSegments`, décalage normal
 * dates↔durée de plan), et un jalon légitimement positionné APRÈS le pic
 * final du plan (ex. une course de clôture post-saison) reste possible —
 * signalé pour confirmation du coach, jamais corrigé silencieusement.
 */
function validateRaceCalendarCoherence(
  raceGoals: ClassifiableRaceGoal[] | undefined,
  planStartDate: string | undefined,
  totalWeeks: number,
): { issues: ValidationIssue[]; score: number } {
  if (!raceGoals || raceGoals.length === 0 || !planStartDate || !(totalWeeks > 0)) {
    return { issues: [], score: 100 };
  }

  const issues: ValidationIssue[] = [];
  for (const goal of raceGoals) {
    if (!goal.raceDate) continue;
    const label = goal.raceName || goal.objective;
    const week = computeGoalWeekFromDates(planStartDate, goal.raceDate);
    if (week === undefined) {
      issues.push({
        rule: "calendar_incoherence",
        severity: "warning",
        message: `📅 Course "${label}" datée avant le début du plan (${goal.raceDate}) — vérifiez la date saisie (année/mois probablement inversé).`,
        detail: "Une course dont la date tombe avant le début du plan n'est prise en compte par aucun calcul de semaine (jour de course, jalon, pic final) — elle est silencieusement ignorée tant que la date n'est pas corrigée.",
      });
    } else if (week > totalWeeks + 1) {
      issues.push({
        rule: "calendar_incoherence",
        severity: "warning",
        message: `📅 Course "${label}" datée S${week}, au-delà des ${totalWeeks} semaines réelles de ce plan — vérifiez la date de la course ou la durée du plan.`,
        detail: "Cette course ne peut être prise en compte (jour de course, jalon, affûtage) car sa date calculée tombe hors des semaines réellement générées.",
      });
    }
  }
  return { issues, score: issues.length > 0 ? 70 : 100 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOGUE/CUSTOM RATIO VALIDATION (Rule 6)
// ═══════════════════════════════════════════════════════════════════════════════

const CUSTOM_PATTERN = /\[Custom\]/gi;

// ═══════════════════════════════════════════════════════════════════════════════
// SPORT-OBJECTIVE COHERENCE — bloque trail dans plans triathlon/CAP route
// ═══════════════════════════════════════════════════════════════════════════════

const OFFSPORT_TRAIL_RX = /\b([A-D]_TR(?:50)?_[A-Z0-9_]+|[A-Z]+_TRAIL_[A-Z0-9_]+|TRAIL_[A-Z0-9_]+|EXPE_HORS_VILLE_[A-Z0-9_]+|URBAN_[A-Z0-9_]+|HEDGEHOG_[A-Z0-9_]+|V3_TRAIL_[A-Z0-9_]+)\b/i;

function isNonTrailObjective(objective?: string): boolean {
  const o = (objective || "").toLowerCase();
  if (!o) return false;
  const isTrail = o.includes("trail") || o.includes("utmb") || o.includes("ccc") || o.includes("occ") ||
    (o.includes("ultra") && !o.includes("ironman"));
  if (isTrail) return false;
  const isTri = o.includes("70.3") || o === "703" || o.includes("ironman") || o === "im" || o.includes("triathlon");
  const isRoad = o.includes("semi") || o.includes("marathon") ||
    o.includes("10k") || o.includes("10 km") || o.includes("10km") ||
    o.includes("5k") || o.includes("5 km") || o.includes("5km") ||
    o.includes("start") || o.includes("débutant") || o.includes("beginner");
  return isTri || isRoad;
}

function validateSportObjectiveCoherence(
  plan: ParsedPlan,
  objective?: string,
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  if (!isNonTrailObjective(objective)) return { issues, score: 100 };
  let violations = 0;
  let totalSessions = 0;
  for (const week of plan.weeks) {
    for (const s of week.sessions) {
      if (s.isRest) continue;
      totalSessions++;
      const text = `${s.title || ""} ${s.details || ""}`;
      if (OFFSPORT_TRAIL_RX.test(text)) {
        violations++;
        issues.push({
          rule: "sport_objective_coherence",
          severity: "error",
          week: week.weekNumber,
          message: `S${week.weekNumber} ${s.dayName} — séance trail interdite dans un plan "${objective}"`,
          detail: s.title || "",
        });
      }
    }
  }
  const score = totalSessions === 0 ? 100 : Math.max(0, 100 - Math.round((violations / totalSessions) * 400));
  return { issues, score };
}


function validateCatalogRatio(plan: ParsedPlan): { issues: ValidationIssue[]; score: number; catalogPct: number; catalogStats: CatalogUsageStats } {
  const issues: ValidationIssue[] = [];
  let catalogSessions = 0;
  let customSessions = 0;
  let totalKeySessions = 0;
  const uniqueCatalogIds = new Set<string>();

  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      if (session.isRest) continue;
      const text = `${session.title} ${session.details}`;
      const isKey = KEY_SESSION_PATTERNS.test(text);
      if (!isKey) continue;

      totalKeySessions++;
      // Fix E3 (audit "génération de plan IA") : remplace la copie locale
      // incomplète du détecteur d'identifiant (CATALOG_ID_PATTERN, supprimée)
      // par extractAllCatalogIds (catalogIdExtractor.ts) — regex à jour,
      // déjà utilisée ailleurs dans ce fichier via extractCatalogId.
      // L'ancienne regex locale ratait ~20% des identifiants réels (préfixes
      // HEAT_, BILLAT_, NORWEGIAN_, FATMAX_, etc., ajoutés depuis côté
      // extracteur partagé mais jamais reportés ici), comptés à tort comme
      // "hors catalogue" sur le chemin Markdown de secours. La variante
      // multi-ID (pas extractCatalogId) est nécessaire pour préserver F-05 :
      // une séance brick/pyramide peut mentionner plusieurs fiches dans son
      // texte, chacune comptant pour la diversité catalogue réelle.
      const ids = extractAllCatalogIds(session.title, session.details, session.catalogId);
      const isCustom = CUSTOM_PATTERN.test(text);
      CUSTOM_PATTERN.lastIndex = 0;

      if (ids.length > 0) {
        catalogSessions++;
        for (const id of ids) uniqueCatalogIds.add(id);
      } else if (isCustom) {
        customSessions++;
      }
    }
  }

  const stats: CatalogUsageStats = {
    uniqueCatalogIds: uniqueCatalogIds.size,
    catalogSessions,
    customSessions,
    totalKeySessions,
    untaggedSessions: totalKeySessions - catalogSessions - customSessions,
  };

  if (totalKeySessions === 0 || plan.weeks.length < 4) {
    return { issues: [], score: 70, catalogPct: 0, catalogStats: stats };
  }

  const catalogPct = Math.round((catalogSessions / totalKeySessions) * 100);
  const customPct = Math.round((customSessions / totalKeySessions) * 100);
  const untaggedPct = 100 - catalogPct - customPct;

  if (catalogPct < 50) {
    issues.push({
      rule: "catalog_ratio",
      severity: "warning",
      message: `Seulement ${catalogPct}% de séances clés utilisent le catalogue TFCL™ (cible ≥80%)`,
      detail: `Catalogue: ${catalogSessions}/${totalKeySessions}, Custom: ${customSessions}, Non-tagué: ${totalKeySessions - catalogSessions - customSessions}`,
    });
  } else if (catalogPct < 80) {
    issues.push({
      rule: "catalog_ratio",
      severity: "warning",
      message: `${catalogPct}% de séances clés utilisent le catalogue (cible ≥80%)`,
      detail: `Catalogue: ${catalogSessions}/${totalKeySessions}, Custom: ${customSessions}`,
    });
  }

  if (untaggedPct > 30) {
    issues.push({
      rule: "catalog_ratio",
      severity: "info",
      message: `${untaggedPct}% de séances clés sans ID catalogue ni tag [Custom] — traçabilité réduite`,
    });
  }

  const score = catalogPct >= 80 ? 100 : catalogPct >= 60 ? 75 : catalogPct >= 40 ? 50 : 30;
  return { issues, score, catalogPct, catalogStats: stats };
}

/** Rule 6bis : Ratio catalogue GLOBAL, TOUTES séances actives — bug réel
 *  (audit PDF, coach : "à partir de S5, aucune intensité, aucun travail
 *  spécifique"). La Règle #6 ci-dessus (validateCatalogRatio) ne mesure le
 *  ratio catalogue QUE sur les séances "clés" (KEY_SESSION_PATTERNS) — les
 *  séances de remplissage/faciles ("Endurance Z2" générique, "Activation
 *  aéro"…) échappent totalement à ce contrôle. Sur S5 du plan audité : 5 des
 *  12 séances (42%) sont custom (catalogId=null), bien au-delà du "≤20%
 *  custom, dernier recours" que le prompt de génération impose explicitement
 *  (invariant #8, systemPromptJSON.ts). Vérifié empiriquement (buildWorkoutCatalog
 *  pour cette semaine précise) que le catalogue injecté contenait pourtant
 *  des fiches génériques adaptées (A_RUN_Z2_EASY, D_10K_RECOVERY_30…) — ce
 *  n'est pas un manque de couverture catalogue, l'IA a choisi le custom sans
 *  nécessité. Sévérité warning (pas error) : une séance custom reste
 *  autorisée par le schéma jusqu'à 20%, ce n'est pas en soi une violation de
 *  méthodologie comme le sont les règles LCW. */
function validateOverallCatalogRatio(plan: ParsedPlan): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  let compliant = 0;
  let checked = 0;
  const CUSTOM_CEILING_PCT = 30; // marge au-dessus du 20% cible du prompt avant de flaguer

  for (const week of plan.weeks) {
    const themeText = `${week.theme} ${week.phase}`.toLowerCase();
    if (DELOAD_PATTERNS.test(themeText) || weekHasRaceDay(week)) continue;
    const active = week.sessions.filter((s) => !s.isRest);
    if (active.length < 4) continue;

    let customCount = 0;
    for (const s of active) {
      if (!extractCatalogId(s.title, s.details, s.catalogId)) customCount++;
    }
    checked++;
    const customPct = Math.round((customCount / active.length) * 100);
    if (customPct > CUSTOM_CEILING_PCT) {
      issues.push({
        rule: "overall_catalog_ratio",
        severity: "warning",
        week: week.weekNumber,
        message: `S${week.weekNumber}: ${customCount}/${active.length} séances (${customPct}%) sans fiche catalogue identifiable — le prompt de génération cible ≤20% de séances custom (invariant #8), ce plan en a nettement plus`,
      });
    } else {
      compliant++;
    }
  }

  const score = checked === 0 ? 100 : Math.max(0, Math.min(100, Math.round((compliant / checked) * 100)));
  return { issues, score };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE COHERENCE VALIDATION (Rule 8)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Canonical phase ordering for TFCL™ Hybride Lorang periodization.
 * Higher index = later in the plan. Phases must not regress.
 */
// Audit — chemin JSON (défaut prod, cf. isJsonBetaEnabled) : le schéma impose
// `phase` ∈ {"base","build","peak","taper"} (planSchema.ts), un vocabulaire à
// 4 valeurs strictement différent des 5 noms de bloc français ci-dessous.
// "base" ne matchait aucune clé → tout contrôle de contenu Fondation était
// silencieusement sauté sur la quasi-totalité des plans de prod. Alias
// ajoutés ci-dessous pour les 4 valeurs JSON, alignés sur le mapping déjà
// utilisé côté catalogue (jsonPlanHandler.ts, resolvePhaseCatalog) :
// base→Fondation, build→Chantier/Consolidation (les deux collapsent sur la
// même valeur JSON, PHASE_SESSION_SIGNATURES[2] élargie en conséquence),
// peak→Race-Specific (PAS un "Peak compressé" séparé — cf. note historique
// ci-dessous), taper→Affûtage (déjà aliasé).
//
// Ancienne régression corrigée ici : une clé "peak" séparée (index 3.5)
// avait été ajoutée pour le scénario Ultra-Trail compressé (garde-fou
// promptHelpers.ts, "Peak 1 sem"). Mais "peak" est la valeur JSON UNIVERSELLE
// pour Race-Specific (tous objectifs confondus, cf. resolvePhaseCatalog) —
// cette clé interceptait donc aussi le Race-Specific normal de tous les
// autres plans (IM, 70.3, Marathon...) et flaguait à tort leur contenu
// race-pace/simulation pourtant explicitement exigé. Le cas Ultra-Trail
// compressé est maintenant traité par objectif dans validatePhaseCoherence
// (isUltraCompressedTrail), pas par une clé PHASE_ORDER dédiée.
const PHASE_ORDER: Record<string, number> = {
  // Metabolic naming (preferred)
  "fondation": 1, "adaptation": 1, "base": 1,
  "chantier": 2, "développement": 2, "build": 2,
  "consolidation": 3,
  "race-specific": 4, "race specific": 4, "spécifique": 4, "specific": 4, "peak": 4,
  "affûtage": 5, "taper": 5, "affutage": 5,
};

/**
 * Audit "fiabilité du validateur" (consigne coach) — faux positif confirmé
 * par test : `validatePlanPaces` (Option A, déjà en prod) injecte des tags
 * du type "[Z2 · endurance 65-75% VMA]" dans `details` — une RÉFÉRENCE
 * D'ALLURE (VMA/VO2max/FTP utilisés comme DÉNOMINATEUR pour décrire une
 * intensité easy/Z2), jamais le contenu réel d'une séance de travail VMA/
 * VO2max. `PHASE_SESSION_SIGNATURES[5].forbidden` (et
 * ULTRA_COMPRESSED_PEAK_SESSION_SIGNATURE) contenaient `vma`/`vo2max` sans
 * distinguer ce cas — une séance d'affûtage par ailleurs exemplaire ("35min
 * Z2 facile") se faisait flaguer CRITIQUE à tort sur le seul mot "VMA" du
 * tag. Retire ces dénominateurs numériques avant le test `forbidden`, sans
 * toucher aux mentions du mot "VMA"/"VO2max" ailleurs dans le texte (ex.
 * "séance VMA", "fractionné VO2max"), qui continuent de déclencher la règle
 * normalement — seule la forme "N[-N]% VMA/VO2max/FTP" est retirée.
 */
const PACE_REFERENCE_DENOMINATOR_RX = /\d{1,3}(?:\s*[-–]\s*\d{1,3})?\s*%\s*(?:de\s*)?(?:la\s*)?(?:vma|vo2\s*max|ftp)/gi;

function stripPaceReferenceDenominators(text: string): string {
  return text.replace(PACE_REFERENCE_DENOMINATOR_RX, "");
}

/** Les annotations d'affichage et IDs ne sont pas des blocs d'effort. */
function intensityContent(text: string): string {
  return stripPaceReferenceDenominators(text
    .replace(/\[(?:VO2(?:\/VMA|\/PMA|\/CSS)?|Race pace|Race power|Marathon|Endurance longue|Seuil|LT2|Tempo|Z2)\b[^\]]*·[^\]]*\]/gi, "")
    .replace(/\[ID:\s*[^\]]+\]/gi, ""));
}

/** Phase-specific session patterns — sessions expected in each phase */
const PHASE_SESSION_SIGNATURES: Record<number, { expected: RegExp; forbidden: RegExp }> = {
  1: { // Fondation: Force max, VO2max courts, Z2 volume, technique
    expected: /force\s*max|z2|endurance|technique|drill|gammes|éducatif|VO2.{0,10}court|reverse/i,
    forbidden: /race.?pace|simulation\s*(ironman|marathon|70\.3|course)|gut\s*train|affûtage|taper/i,
  },
  2: { // Chantier/Consolidation : la valeur JSON "build" collapse les deux
    // (cf. resolvePhaseCatalog) — signature élargie pour couvrir le contenu
    // attendu des deux, pas seulement Chantier, sinon un plan JSON dont le
    // "build" recouvre en réalité une Consolidation se fait flaguer à tort.
    expected: /chantier|limiteur|norvégi|billat|sweet\s*spot|train\s*low|sfr|seuil|consolid|maintien|rappel|allure|durabilité/i,
    forbidden: /taper|affûtage|supercomp|activation\s*j-?2/i,
  },
  3: { // Consolidation (nommage Markdown explicite uniquement — le chemin JSON
    // n'atteint jamais cet index, cf. "build" ci-dessus) : Limiter #2, maintain #1
    expected: /consolid|maintien|rappel|seuil|allure|durabilité/i,
    forbidden: /taper|affûtage|supercomp/i,
  },
  4: { // Race-Specific: Race-pace, simulations, Gut Training
    expected: /race.?pace|simulation|brique|gut\s*train|allure\s*course|spécifique/i,
    forbidden: /force\s*max\s*3.?[45]|adaptation|fondation.*progressi/i,
  },
  5: { // Affûtage/Taper: Volume reduction, activation, rappels courts
    expected: /taper|affûtage|rappel|activation|supercomp|-\d{2,3}%\s*vol|réduction/i,
    // Audit "cohérence placement des séances" — constat n°3 : ce motif ne
    // contenait aucun mot-clé VO2max/VMA/fractionné/seuil, alors que ce sont
    // précisément les contenus qui n'ont rien à faire en semaine d'affûtage
    // (charge neuro-métabolique trop élevée à quelques jours de la course).
    // Mots-clés ajoutés ci-dessous, avec limite de mot (\b) pour rester
    // spécifique (ex. ne pas matcher "vasoconstriction" sur "vma").
    forbidden: /chantier|force\s*max|blocs?\s*concentré|build|\bvo2\s*max\b|\bvma\b|fractionn[eé]|\bseuil\b/i,
  },
};

/** Signature dédiée pour le segment "Peak" du garde-fou Ultra-Trail compressé
 *  (promptHelpers.ts, "Fondation 2 sem · Build 2 sem · Peak 1 sem · Taper 1
 *  sem") : volume Z2 + D+ progressif, JAMAIS de VMA/seuil dur ni de
 *  race-pace/simulation — garde-fou "finir sans blessure". Remplace
 *  PHASE_SESSION_SIGNATURES[4] uniquement quand isUltraCompressedTrail est
 *  vrai (cf. validatePhaseCoherence) : sur tout autre plan, la valeur JSON
 *  "peak" désigne le Race-Specific normal (PHASE_SESSION_SIGNATURES[4]),
 *  qui EXIGE exactement le contenu interdit ici. */
const ULTRA_COMPRESSED_PEAK_SESSION_SIGNATURE = {
  expected: /z2|endurance|d\+|dénivelé|volume|technique/i,
  forbidden: /race.?pace|simulation|vma|seuil\s*(dur|long)|fractionn|force\s*max\s*3.?[45]/i,
};

/** Contenu "spécificité de course" — race-pace, simulations, allure course, gut
 *  training, briques orientées course. Sert à vérifier que le bloc Race-Specific
 *  concentre effectivement plus de ce travail que les blocs antérieurs, comme
 *  le prescrit le prompt de génération (Lorang/Canova : spécificité concentrée
 *  près de la course, pas diluée sur tout le plan) — mais que rien ne vérifiait
 *  jusqu'ici après coup sur le plan généré. */
const RACE_SPECIFICITY_PATTERN = /race.?pace|race.?sim|simulation\s*(ironman|marathon|70\.3|course|semi)|allure\s*(course|marathon|semi)|gut\s*train|brique.*(race|course)/i;

/** Acceptable phase duration range in weeks */
const PHASE_DURATION_RANGE: Record<number, [number, number]> = {
  1: [2, 6],   // Fondation
  2: [2, 6],   // Chantier
  3: [2, 6],   // Consolidation
  4: [2, 6],   // Race-Specific (sauf scénario Ultra-Trail compressé, cf. isUltraCompressedTrail)
  5: [1, 3],   // Affûtage
};
/** Plage dédiée pour le segment "Peak" du garde-fou Ultra-Trail compressé
 *  (promptHelpers.ts, "Fondation 2 sem · Build 2 sem · Peak 1 sem · Taper 1
 *  sem") — remplace PHASE_DURATION_RANGE[4] uniquement quand
 *  isUltraCompressedTrail est vrai, cf. validatePhaseCoherence. */
const ULTRA_COMPRESSED_PEAK_DURATION_RANGE: [number, number] = [1, 2];

function getPhaseIndex(phaseName: string): number | null {
  const lower = phaseName.toLowerCase().trim();
  for (const [key, idx] of Object.entries(PHASE_ORDER)) {
    if (lower.includes(key)) return idx;
  }
  return null;
}

/**
 * Reconstruit la structure de phases à partir du champ `phase` des semaines
 * lorsque le plan n'expose pas de bloc "Phases" (chemin JSON / plans legacy).
 * Purement dérivé : aucune invention de contenu.
 */
export function derivePhasesFromWeeks(plan: ParsedPlan): ParsedPlan["phases"] {
  const derived: ParsedPlan["phases"] = [];
  let current: { name: string; start: number; end: number } | null = null;
  for (const w of plan.weeks) {
    const name = (w.phase || "").trim();
    if (!name) continue;
    if (current && current.name.toLowerCase() === name.toLowerCase()) {
      current.end = w.weekNumber;
    } else {
      if (current) derived.push({ name: current.name, weeks: `S${current.start}-S${current.end}` });
      current = { name, start: w.weekNumber, end: w.weekNumber };
    }
  }
  if (current) derived.push({ name: current.name, weeks: `S${current.start}-S${current.end}` });
  return derived;
}

function validatePhaseCoherence(plan: ParsedPlan, objective?: string): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];

  // Source unique : bloc "Phases" déclaré, sinon reconstruction depuis les semaines.
  const phases = plan.phases && plan.phases.length >= 2 ? plan.phases : derivePhasesFromWeeks(plan);

  if (phases.length < 2) {
    // Can't validate if no phases parsed
    if (plan.weeks.length >= 6) {
      issues.push({
        rule: "phase_coherence",
        severity: "warning",
        message: `Plan de ${plan.weeks.length} semaines sans structure de phases/blocs détectée — périodisation incertaine`,
      });
      return { issues, score: 50 };
    }
    return { issues: [], score: 80 };
  }

  let score = 100;

  // Scénario Ultra-Trail compressé (garde-fou promptHelpers.ts, "DÉLAI
  // SOUS-CRITIQUE" — même condition de déclenchement que ce garde-fou) : la
  // valeur JSON "peak" y désigne le segment compressé "Peak 1 sem", pas le
  // Race-Specific standard — cf. constantes ULTRA_COMPRESSED_PEAK_*.
  const isUltraCompressedTrail = normalizeObjectiveKey(objective || "") === "TrailUltra" && plan.weeks.length <= 6;

  // 1. Phase ordering — no regression
  let lastPhaseIdx = 0;
  for (const phase of phases) {

    const idx = getPhaseIndex(phase.name);
    if (idx === null) continue;
    if (idx < lastPhaseIdx) {
      // Niveau 2 : un cycle Chantier↔Consolidation explicitement répété (nouveau
      // bloc plus spécifique après consolidation d'un premier limiteur) est une
      // structure Issurin légitime, pas une régression — cf. Block Periodization
      // par limiteur (systemPrompt.ts). On ne tolère ce recul QUE dans la fenêtre
      // Chantier(2)/Consolidation(3) : un retour à Fondation(1), ou un recul
      // depuis Race-Specific(4)/Affûtage(5) déjà atteint, reste une vraie erreur.
      const isToleratedBlockCycle = idx >= 2 && idx <= 3 && lastPhaseIdx <= 3;
      if (!isToleratedBlockCycle) {
        issues.push({
          rule: "phase_coherence",
          severity: "error",
          message: `Régression de phase détectée : "${phase.name}" (${phase.weeks}) apparaît APRÈS une phase plus avancée`,
          detail: `La périodisation doit progresser : Fondation → Chantier → Consolidation → Race-Specific → Affûtage. Pas de retour en arrière (un nouveau cycle Chantier↔Consolidation reste toléré).`,
        });
        score -= 25;
      }
    }
    lastPhaseIdx = idx;
  }

  // 2. Phase durations — check each phase's week count
  for (const phase of phases) {
    const idx = getPhaseIndex(phase.name);
    if (idx === null) continue;
    const range = idx === 4 && isUltraCompressedTrail ? ULTRA_COMPRESSED_PEAK_DURATION_RANGE : PHASE_DURATION_RANGE[idx];
    if (!range) continue;

    // Parse weeks range like "S1-S4", "S1-S6" (préfixe "S" sur les deux
    // nombres, format produit par derivePhasesFromWeeks ET par l'exemple
    // JSON du prompt lui-même, systemPromptJSON.ts) ou "Semaines 1-4".
    const weekMatch = phase.weeks.match(/(\d+)\s*[-–àto]\s*S?(\d+)/i);
    if (weekMatch) {
      const duration = parseInt(weekMatch[2]) - parseInt(weekMatch[1]) + 1;
      if (duration < range[0]) {
        issues.push({
          rule: "phase_coherence",
          severity: "warning",
          message: `Phase "${phase.name}" trop courte : ${duration} sem (minimum ${range[0]})`,
          detail: `Un bloc de ${duration} semaine(s) ne permet pas d'adaptations physiologiques significatives.`,
        });
        score -= 10;
      } else if (duration > range[1]) {
        issues.push({
          rule: "phase_coherence",
          severity: "warning",
          message: `Phase "${phase.name}" trop longue : ${duration} sem (maximum recommandé ${range[1]})`,
          detail: `Les blocs concentrés > ${range[1]} sem perdent en spécificité. Considérer un découpage.`,
        });
        score -= 5;
      }
    }
  }

  // 3. Session-phase alignment — check that session content matches declared phase
  for (const week of plan.weeks) {
    const phaseIdx = getPhaseIndex(week.phase);
    if (phaseIdx === null) continue;
    const signatures = phaseIdx === 4 && isUltraCompressedTrail
      ? ULTRA_COMPRESSED_PEAK_SESSION_SIGNATURE
      : PHASE_SESSION_SIGNATURES[phaseIdx];
    if (!signatures) continue;

    // Affûtage/Taper (index 5) : seule phase escaladée en "error" (bloque la
    // sauvegarde via une confirmation explicite — cf. pendingCriticalIssues,
    // usePlanAdaptation.ts / AITrainingPlanPage.tsx). C'est la semaine où une
    // erreur de placement coûte le plus cher (à quelques jours de la course)
    // et où un simple "warning" pouvait passer totalement inaperçu. Les 4
    // autres phases restent "warning" : élargir l'escalade à toutes reviendrait
    // à bloquer potentiellement des plans par ailleurs légitimes sans
    // validation préalable sur données réelles (risque de faux positifs).
    const severity: ValidationIssue["severity"] = phaseIdx === 5 ? "error" : "warning";

    for (const session of week.sessions) {
      if (session.isRest) continue;
      // Exempter uniquement l'épreuve elle-même, jamais toute la race-week
      // ni une simulation/activation qui évoque la compétition objectif.
      const raceTitle = intensityContent(session.title).trim();
      if (phaseIdx === 5 && RACE_DAY_PATTERNS.exec(raceTitle)?.index === 0 &&
          !PRE_RACE_ACTIVATION_PATTERNS.test(raceTitle) &&
          !/simulation|race[\s_-]*sim|répétition|repetition/i.test(raceTitle) &&
          /^(?:run|course|bike|vélo|swim|natation|brick|triathlon)$/i.test(session.sport)) continue;
      const text = stripPaceReferenceDenominators(`${session.title} ${session.details}`);

      if (signatures.forbidden.test(text)) {
        issues.push({
          rule: "phase_coherence",
          severity,
          week: week.weekNumber,
          message: `S${week.weekNumber}: "${session.title}" inadapté en phase "${week.phase}" — contenu typique d'une phase différente`,
          detail: `Vérifier la cohérence entre le contenu de séance et la phase déclarée.`,
        });
        score -= severity === "error" ? 15 : 3;
      }
    }
  }

  // 4. Final phase should be Affûtage/Taper for plans ≥ 8 weeks
  if (plan.weeks.length >= 8 && phases.length >= 2) {
    const lastPhase = phases[phases.length - 1];
    const lastIdx = getPhaseIndex(lastPhase.name);
    if (lastIdx !== null && lastIdx < 5) {
      issues.push({
        rule: "phase_coherence",
        severity: "warning",
        message: `Le plan se termine par "${lastPhase.name}" — un bloc d'affûtage est attendu pour les plans ≥ 8 semaines`,
      });
      score -= 10;
    }
  }

  // 5. Reverse Periodization check — Fondation should contain some intensity
  // Exempté pour Start to Run : par doctrine (grille Volume/Intensité par
  // Ambition, systemPrompt.ts), ce format est quasi-exclusivement Z1-Z2, 0
  // séance clé — un vrai débutant n'a rien à faire avec des blocs VO2max dès
  // la phase 1. Sans cette exemption, un plan strictement conforme à cette
  // doctrine recevait quand même une recommandation physiologiquement
  // absurde pour cette population (audit non-triathlon).
  const isStartToRun = normalizeObjectiveKey(objective || "") === "StartToRun";
  if (phases.length >= 2 && !isStartToRun) {
    const fondationPhase = phases.find(p => getPhaseIndex(p.name) === 1);
    if (fondationPhase) {
      const fondationWeeks = plan.weeks.filter(w => getPhaseIndex(w.phase) === 1);
      const hasIntensity = fondationWeeks.some(w =>
        w.sessions.some(s => /vo2|interval|force\s*max|VO2max|fractionné/i.test(`${s.title} ${s.details}`))
      );
      if (!hasIntensity && fondationWeeks.length >= 2) {
        issues.push({
          rule: "phase_coherence",
          severity: "info",
          message: `Bloc Fondation sans intensité détectée — la Reverse Periodization Lorang recommande des blocs VO2max courts dès la phase 1`,
        });
        score -= 5;
      }
    }
  }

  // 6. Race-specificity ramp — le bloc Race-Specific doit concentrer davantage
  // de travail allure course / simulations / gut training que les blocs
  // antérieurs (Lorang/Canova : la spécificité de course se construit près de
  // l'échéance, elle n'est pas répartie uniformément sur tout le plan). Le
  // prompt de génération le demande déjà explicitement ; rien ne vérifiait
  // jusqu'ici que le plan produit s'y conforme réellement.
  if (phases.length >= 2) {
    const raceSpecificActive = plan.weeks
      .filter(w => getPhaseIndex(w.phase) === 4)
      .flatMap(w => w.sessions.filter(s => !s.isRest));

    if (raceSpecificActive.length >= 2) {
      const raceSpecificFrac =
        raceSpecificActive.filter(s => RACE_SPECIFICITY_PATTERN.test(`${s.title} ${s.details}`)).length /
        raceSpecificActive.length;

      if (raceSpecificFrac === 0) {
        issues.push({
          rule: "phase_coherence",
          severity: "warning",
          message: `Bloc Race-Specific sans aucune séance allure course/race-pace/simulation détectée — la spécificité de course attendue dans ce bloc (Lorang/Canova) est absente`,
        });
        score -= 8;
      } else {
        const chantierActive = plan.weeks
          .filter(w => getPhaseIndex(w.phase) === 2)
          .flatMap(w => w.sessions.filter(s => !s.isRest));

        if (chantierActive.length >= 2) {
          const chantierFrac =
            chantierActive.filter(s => RACE_SPECIFICITY_PATTERN.test(`${s.title} ${s.details}`)).length /
            chantierActive.length;

          if (raceSpecificFrac <= chantierFrac) {
            issues.push({
              rule: "phase_coherence",
              severity: "info",
              message: `Le bloc Race-Specific (${Math.round(raceSpecificFrac * 100)}% de séances allure course/simulation) ne concentre pas plus de spécificité que le bloc Chantier (${Math.round(chantierFrac * 100)}%) — la logique Lorang/Canova voudrait une densité croissante vers la course`,
            });
            score -= 5;
          }
        }
      }
    }
  }

  return { issues, score: Math.max(0, Math.min(100, score)) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROHIBITION VIOLATION DETECTION (Rule 7)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Patterns that indicate Sprint Ban violations.
 *
 * Bug réel (audit "génération solide ?", passe 2) : le catalogue TFCL réel
 * note quasi-systématiquement les secondes avec un guillemet ("10\"", "10''")
 * plutôt qu'un "s" littéral, et écrit les reps/durées en plage ("10-15",
 * "6-8"). L'ancien pattern numérique (`\d+...\d{1,2}s...`) ne matchait aucune
 * de ces deux notations réelles — des fiches côte explicitement taguées
 * "neuromusculaire pur"/"puissance" (ex. 12×8" sprint côte raide, 10-15x10-15"
 * sprint en côte) passaient totalement inaperçues sous Sprint Ban. Élargi
 * pour couvrir "|guillemet(s)|sec" et les plages sur les deux nombres.
 * Négation ajoutée sur "plyo explo" (pré-existant, même passe) : "pas de
 * plyo explosive" — une séance qui RESPECTE l'interdiction — était comptée
 * comme violation faute de gérer la négation française la plus commune.
 * Limite connue, non résolue : un "sprint" hors plage numérique adjacente
 * (ex. "10×10s pente ... 60m sprint en fin de série", où "sprint" n'est ni
 * dans la plage-secondes ni suivi d'un qualificatif all-out/max/neuro à
 * proximité) reste un angle mort — distinguer fiablement par regex un
 * effort contrôlé ("rapide mais pas max") d'un sprint all-out nécessiterait
 * une analyse sémantique, pas seulement lexicale.
 *
 * Audit "fiabilité du validateur" (consigne coach) : la négation ad hoc
 * `(?<!pas de |sans |aucun(?:e)? )` ci-dessous a été RETIRÉE — elle ne
 * couvrait que 3 tournures exactes immédiatement adjacentes au mot-clé
 * ("jamais de plyo explosive" n'était pas couvert). La négation est
 * désormais gérée UNE SEULE FOIS, au niveau de la clause entière (pas
 * seulement les mots immédiatement adjacents), avec un vocabulaire élargi,
 * par `isProhibitedPrescription` ci-dessous — partagée par les deux
 * détections Sprint Ban (stricte + mention large sans catalogId).
 */
const SPRINT_BAN_VIOLATION_PATTERNS = /tabata|sprint\s*(all[- ]out|neuro|max)|(\d{1,3}(?:[-–]\d{1,3})?\s*[×x]\s*\d{1,3}(?:[-–]\d{1,3})?\s*(?:s\b|''|"|sec)\s*(sprint|all[- ]out))|micro[- ]interv|drop\s*jump|hurdle\s*rebound|band\s*sprint|plyo\s*explo/i;
/** Même famille que SPRINT_BAN_VIOLATION_PATTERNS mais en mention large
 *  (sans exiger de contexte numérique) — utilisée pour la 2e détection
 *  (séance custom sans ID catalogue), cf. validateProhibitionCompliance. */
const SPRINT_FAMILY_BROAD_PATTERNS = /\b(sprint|pmax|neuromuscul|all[- ]out|explosif|plyo|pliom[ée]tri|force[\s-]*vitesse)\b/i;
/** Signaux non-numériques (indépendants de la durée/%FTP) de violation VO2max lourde. */
const VO2MAX_HEAVY_VIOLATION_TEXT_PATTERNS = /tabata\s*vo2|30\/30\s*(?:long|×\s*[2-9]\d)/i;

/**
 * Vocabulaire de négation/interdiction élargi (audit "fiabilité du
 * validateur", consigne coach : "ne pas se contenter d'ajouter quelques
 * négations isolées"). Préfixes volontairement larges (`[a-z]*`) pour
 * couvrir les formes fléchies courantes (interdit/interdite/interdiction,
 * proscrit/proscrite, évite/éviter/évitons, exclu/exclue, bannir/banni,
 * prohibé) sans énumérer chaque forme une à une.
 */
const NEGATION_MARKERS_RX = /\b(pas\s+de|sans|aucun(?:e)?|jamais|interdi[a-z]*|proscri[a-z]*|[ée]vit[a-z]*|exclu[a-z]*|banni[a-z]*|prohib[a-z]*)\b/i;

/**
 * Distingue PRESCRIPTION EFFECTIVE (violation réelle), INTERDICTION
 * (mention conforme — rappel de ce qui est exclu) et SIMPLE MENTION du nom
 * même de l'interdiction (ex. "Sprint Ban" répété en rappel de contexte,
 * jamais une prescription) — à l'échelle de la CLAUSE (segment de phrase,
 * `splitIntoClauses`), pas seulement des quelques mots immédiatement
 * adjacents au mot-clé comme avant. Une négation présente N'IMPORTE OÙ
 * dans la même clause ("Jamais de sprint cette semaine, privilégier
 * l'endurance") vaut mention conforme, pas prescription — contrairement à
 * l'ancienne lookbehind qui n'aurait reconnu que "pas de sprint"/"sans
 * sprint"/"aucun sprint" immédiatement avant le mot-clé.
 */
function isProhibitedPrescription(clause: string, termPattern: RegExp): boolean {
  if (!termPattern.test(clause)) return false;
  // Rappel du NOM de l'interdiction elle-même ("Sprint Ban") — jamais une
  // prescription, quel que soit le reste de la clause.
  if (/sprint\s*ban|ban\s*sprint/i.test(clause)) return false;
  if (NEGATION_MARKERS_RX.test(clause)) return false;
  return true;
}

/**
 * Bug réel (audit "génération solide ?", passe 3) : l'ancien pattern
 * numérique (`[5-9]×5(min|')@?(1[1-9]\d|115|120)%FTP`) exigeait un "@"
 * littéral (ou rien) ET une durée d'EXACTEMENT "5" min ET 5-9 répétitions —
 * or le catalogue réel écrit systématiquement "à" (pas "@"), des durées
 * variées (4, 6, 8, 10-12 min...) et des reps hors [5-9] (3, 4, 4-5...), et
 * sépare parfois durée et %FTP par un label de zone ("6' Z5 à 108-115%
 * FTP"). Sur un échantillon de 10 fiches catalogue réelles ≥5min à >110%
 * FTP (dont l'exemple "5×5' à 110-115% FTP" que le commentaire d'origine
 * citait lui-même comme cas cible), AUCUNE n'était détectée — le contrôle
 * était un no-op de fait sous restriction VO2max. Remplacé par une
 * extraction numérique (durée, %FTP) tolérante aux plages des deux côtés et
 * à un court texte intercalé (ex. un label de zone), avec comparaison
 * explicite au seuil de la règle (≥5min ET >110% FTP, borne haute de chaque
 * plage utilisée — lecture pire cas) plutôt qu'un pattern figé sur un seul
 * format d'écriture.
 */
function extractFtpIntervalBlocks(text: string): Array<{ durationMinHigh: number; ftpPctHigh: number }> {
  const blocks: Array<{ durationMinHigh: number; ftpPctHigh: number }> = [];
  const RX = /(\d{1,3})(?:[-–](\d{1,3}))?\s*(?:min|')[\s\S]{0,20}?(\d{1,3})(?:[-–](\d{1,3}))?\s*%\s*FTP/gi;
  let m: RegExpExecArray | null;
  while ((m = RX.exec(text))) {
    const durationMinHigh = m[2] ? parseInt(m[2], 10) : parseInt(m[1], 10);
    const ftpPctHigh = m[4] ? parseInt(m[4], 10) : parseInt(m[3], 10);
    blocks.push({ durationMinHigh, ftpPctHigh });
  }
  return blocks;
}

function hasVo2maxHeavyViolation(text: string): boolean {
  if (VO2MAX_HEAVY_VIOLATION_TEXT_PATTERNS.test(text)) return true;
  return extractFtpIntervalBlocks(text).some((b) => b.durationMinHigh >= 5 && b.ftpPctHigh > 110);
}

function validateProhibitionCompliance(
  plan: ParsedPlan,
  prohibitions?: string[]
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];

  if (!prohibitions || prohibitions.length === 0) {
    return { issues: [], score: 100 };
  }

  const hasSprintBan = prohibitions.some(p => /sprint\s*ban/i.test(p));
  const hasVO2Restriction = prohibitions.some(p => /restriction\s*vo2/i.test(p));

  if (!hasSprintBan && !hasVO2Restriction) {
    return { issues: [], score: 100 };
  }

  let violations = 0;

  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      if (session.isRest) continue;
      const text = `${session.title} ${session.details}`.toLowerCase();
      // Analyse à l'échelle de la clause (pas de la séance entière) : la
      // négation peut porter sur un segment précis sans concerner le reste
      // de la séance — cf. isProhibitedPrescription.
      const clauses = splitIntoClauses(text);
      const units = clauses.length > 0 ? clauses : [text];

      const strictHit = hasSprintBan ? units.find((u) => isProhibitedPrescription(u, SPRINT_BAN_VIOLATION_PATTERNS)) : undefined;
      if (strictHit) {
        violations++;
        issues.push({
          rule: "prohibition_compliance",
          severity: "error",
          week: week.weekNumber,
          message: `S${week.weekNumber}: 🚫 VIOLATION SPRINT BAN — "${session.title}" contient des sprints/Tabata/pliométrie explosive interdits`,
          detail: `Le profil VLamax élevé interdit ce type de séance (all-out ≤20s, pmax, neuromusculaire pur). Remplacer par Sweet Spot, seuil ou Z2 volume. Rappel : 30/30 Billat à 100-110% VMA reste AUTORISÉ (VO2max, pas sprint).`,
        });
      }

      // FIX #4 (audit Cath juillet 2026, Étage B) — Sous Sprint Ban, une séance
      // custom (sans catalogId TFCL) qui mentionne sprint/pmax/neuro/all-out est
      // rejetée MÊME si le pattern strict SPRINT_BAN_VIOLATION_PATTERNS ne match pas.
      // Force l'IA à utiliser des IDs catalogue plutôt qu'inventer des séances sprint.
      if (hasSprintBan && !strictHit) {
        const catalogId = extractCatalogId(session.title, session.details);
        const isCustom = /\[custom\]/i.test(text) || !catalogId;
        const broadHit = units.find((u) => isProhibitedPrescription(u, SPRINT_FAMILY_BROAD_PATTERNS));
        if (isCustom && broadHit) {
          violations++;
          issues.push({
            rule: "prohibition_compliance",
            severity: "error",
            week: week.weekNumber,
            message: `S${week.weekNumber}: 🚫 SPRINT BAN — séance CUSTOM "${session.title}" mentionne sprint/pmax/neuromusculaire sans ID catalogue TFCL`,
            detail: `Sous Sprint Ban, toute séance de la famille sprint/pmax/neuro DOIT provenir du catalogue (avec ID validé). Interdit d'inventer des formats [Custom] sprint. Remplacer par un ID VO2max/seuil/Z2 du catalogue.`,
          });
        }
      }

      if (hasVO2Restriction && hasVo2maxHeavyViolation(text)) {
        violations++;
        issues.push({
          rule: "prohibition_compliance",
          severity: "error",
          week: week.weekNumber,
          message: `S${week.weekNumber}: 🚫 VIOLATION VO2max LOURD — "${session.title}" programme des blocs VO2max ≥5min @>110% FTP`,
          detail: `Seuls les intervalles courts (3-4×3min @105-110% FTP) sont autorisés. Les 30/30 courts (≤10min total) restent OK ; interdits : 30/30 longs ≥20 répétitions. Remplacer par sweet spot ou seuil.`,
        });
      }
    }
  }

  const totalSessions = plan.weeks.reduce((sum, w) => sum + w.sessions.filter(s => !s.isRest).length, 0);
  const violationRate = totalSessions > 0 ? violations / totalSessions : 0;
  const score = violations === 0 ? 100 : violationRate < 0.05 ? 60 : violationRate < 0.1 ? 30 : 0;

  return { issues, score };
}

/**
 * Rule: Injury risk compliance — le risque blessure calculé (Fatigue + VLamax +
 * TTE, injuryRiskUnified.ts) était jusqu'ici affiché au coach mais jamais
 * vérifié sur le plan généré : `scoreWorkout` applique un malus (pas une
 * exclusion) sur les séances à impact élevé, donc un plan qui les prescrit
 * quand même reste possible. Cette règle ferme la boucle : au niveau CRITIQUE,
 * un plan qui garde une charge à impact élevé "normale" (comme si le risque
 * n'existait pas) est une vraie violation de sécurité, pas juste sous-optimal
 * — même tier que le Sprint Ban (bloque la sauvegarde, cf. PR#3).
 * ÉLEVÉ reste volontairement non bloquant (avertissement ailleurs dans le
 * plan, mais pas de blocage) : c'est un niveau de vigilance, pas d'alerte.
 */
function validateInjuryRiskCompliance(
  plan: ParsedPlan,
  injuryRisk?: { run?: { level: string }; bike?: { level: string } },
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];

  const runCritique = injuryRisk?.run?.level === "CRITIQUE";
  const bikeCritique = injuryRisk?.bike?.level === "CRITIQUE";
  if (!runCritique && !bikeCritique) return { issues: [], score: 100 };

  // Pas zéro : une progression totalement à l'arrêt n'est ni réaliste ni
  // souhaitable. Le seuil intercepte un plan qui ignore le risque, pas un
  // plan prudent qui garde un minimum de qualité.
  const MAX_HIGH_IMPACT_PER_WEEK_CRITIQUE = 2;

  let violationWeeks = 0;
  let evaluableWeeks = 0;

  for (const week of plan.weeks) {
    const activeSessions = week.sessions.filter(s => !s.isRest);
    if (activeSessions.length === 0) continue;
    evaluableWeeks++;

    let highImpactCount = 0;
    for (const session of activeSessions) {
      const sport = normalizeSport(session.sport);
      const text = `${session.title} ${session.details}`.toLowerCase();
      if (runCritique && sport === "Course" &&
          (HIGH_IMPACT_SESSION_PATTERNS.run_long.test(text) || HIGH_IMPACT_SESSION_PATTERNS.run_intensity.test(text))) {
        highImpactCount++;
      }
      if (bikeCritique && sport === "Vélo" && HIGH_IMPACT_SESSION_PATTERNS.bike_force.test(text)) {
        highImpactCount++;
      }
    }

    if (highImpactCount > MAX_HIGH_IMPACT_PER_WEEK_CRITIQUE) {
      violationWeeks++;
      issues.push({
        rule: "injury_risk_compliance",
        severity: "error",
        week: week.weekNumber,
        message: `S${week.weekNumber}: 🚨 Risque blessure CRITIQUE non respecté — ${highImpactCount} séances à impact mécanique élevé (max recommandé ${MAX_HIGH_IMPACT_PER_WEEK_CRITIQUE}/sem)`,
        detail: `Le diagnostic signale un risque blessure critique (${runCritique ? "CAP" : ""}${runCritique && bikeCritique ? " + " : ""}${bikeCritique ? "Vélo" : ""}). Réduire les sorties longues / fractionné-côtes (CAP) ou le travail force basse cadence (vélo) cette semaine.`,
      });
    }
  }

  const score = evaluableWeeks === 0
    ? 100
    : Math.max(0, Math.round(((evaluableWeeks - violationWeeks) / evaluableWeeks) * 100));
  return { issues, score };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIMITER ↔ SESSION COHERENCE VALIDATION (Rule 10)
// ═══════════════════════════════════════════════════════════════════════════════

/** Maps limiter keywords to expected session content patterns.
 * IMPORTANT: Patterns are MUTUALLY EXCLUSIVE to prevent priority-dedup from starving lower-rank limiters.
 * Each limiter has its own distinctive patterns that don't overlap with others.
 * A session matching L1 is NOT double-counted for L2/L3/L4 (priority dedup in validator),
 * EXCEPT for proven physiological synergies defined in VLAMAX_CO_CONTRIBUTOR_PATTERNS.
 *
 * OVERLAP AUDIT (2026-04-04):
 * - VLamax vs FatMax: VLamax = glycolytic suppression (train low + Z2 long volume). FatMax = fat oxidation (fat max, lipid, oxydation).
 * - TTE vs FTP: TTE = sustained threshold endurance (seuil continu LONG, norvégienne, MLSS). FTP = power at threshold (sweet spot, over-under, FTP watts).
 * - VLamax vs Durabilité: VLamax = metabolic context (train low, glycolytique). Durabilité = distance context (sortie longue, SL, brick, finish rapide).
 */
// LIMITER_SESSION_PATTERNS est importé en haut du fichier depuis
// src/lib/limiterSessionPatterns.ts (source unique).


const LIMITER_ALIAS_HINTS: Array<{ pattern: RegExp; aliases: string }> = [
  {
    pattern: /norwegian|norv[ée]gi|double[\s_-]*threshold|mlss|threshold[\s_-]*long|tempo[\s_-]*long|cruise/i,
    aliases: "seuil continu norvégienne mlss threshold long tte",
  },
  {
    pattern: /\bsst\b|sweet[\s_-]*spot|over[\s_-]*under|race[\s_-]*(?:power|pace).*(?:3[\sx_/-]*20|2[\sx_/-]*20|20)|ftp/i,
    aliases: "sweet spot over under ftp seuil puissance race pace threshold power",
  },
  {
    pattern: /train[\s_-]*low|fasted|z2[\s_-]*long|endurance[\s_-]*long|fondation[\s_-]*z2|aerobic[\s_-]*(?:base|endurance)/i,
    aliases: "train low à jeun z2 long endurance fondamentale aérobie pure vlamax",
  },
  {
    pattern: /sfr|low[\s_-]*cadence|force[\s_-]*low[\s_-]*cadence|cadence[\s_-]*(?:40|50|60)|r[øo]nnestad/i,
    aliases: "sfr force basse cadence économie vlamax",
  },
  {
    pattern: /vo2|vma|pma|billat|30[\/_ -]?30/i,
    aliases: "vo2max vma pma billat",
  },
  {
    pattern: /long[\s_-]*run|sortie[\s_-]*longue|brick|race[\s_-]*sim|simulation/i,
    aliases: "sortie longue long run brick durabilité simulation course",
  },
  {
    pattern: /fatmax|fat[\s_-]*(?:ox|max)|lipid|oxydation/i,
    aliases: "fatmax fat max lipid oxydation glycogène train low vlamax",
  },
  {
    pattern: /hill|côte|cote|tech|éducatif|gamme|strides|drill/i,
    aliases: "côtes technique économie strides drill gammes éducatif",
  },
  {
    pattern: /over[\s_-]*under|over_under/i,
    aliases: "over under ftp sweet spot seuil puissance threshold power",
  },
];

const FALLBACK_ZONE_MAP: Record<string, RegExp> = {
  "vo2max": /z[56]|zone\s*[56]|vo2|vma|pma/i,
  "tte": /seuil|threshold|tempo|z4|zone\s*4|race[\s_-]*pace|allure|css/i,
  "ftp": /\bsst\b|sweet[\s_-]*spot|over.?under|ftp|race[\s_-]*power|cp/i,
  "durabilit": /sortie\s*longue|\bsl\b|long(?:\s*(?:run|ride))?|brick|progressive|fartlek|back.to.back|steady/i,
  "vlamax": /z2|endurance|ef\b|train[\s_-]*low|fasted|heat|altitude/i,
  "fatmax": /fat[\s_-]*(?:max|ox)|lipid|oxydation|glycogène|gut/i,
  "économie": /côte|sfr|strides|drill|gammes|technique|éducatif|hill|tech|strength|force|renfo|core|ppg|proprio|mobilit|gainage/i,
};

function buildLimiterMatchText(session: ParsedSession): string {
  const rawText = `${session.sport} ${session.title} ${session.details}`.toLowerCase();
  const catalogId = extractCatalogId(session.title, session.details)?.toLowerCase() ?? "";
  const catalogText = catalogId.replace(/_/g, " ");
  const aliasText = LIMITER_ALIAS_HINTS
    .filter(({ pattern }) => pattern.test(rawText) || (catalogText ? pattern.test(catalogText) : false))
    .map(({ aliases }) => aliases)
    .join(" ");

  return `${rawText} ${catalogText} ${aliasText}`.trim();
}

function detectLimiterKeyFromText(limiterText: string): string | null {
  const lower = limiterText.toLowerCase();
  if (/vo2max/i.test(lower)) return "vo2max";
  if (/vlamax/i.test(lower)) return "vlamax";
  if (/tte|time.to.exhaust/i.test(lower)) return "tte";
  if (/fatmax|fat\s*ox|lipid/i.test(lower)) return "fatmax";
  if (/[ée]conom/i.test(lower)) return "économie";
  if (/ftp.*kg|ftp\/kg|puissance.*a[ée]rob/i.test(lower)) return "ftp";
  if (/durabilit/i.test(lower)) return "durabilit";
  if (/sprint|pmax|neuro/i.test(lower)) return "sprint";
  return null;
}

function detectLimiterKeyFromMetric(metric: string): string | null {
  const lower = metric.toLowerCase();
  if (/vo2max|vma/i.test(lower)) return "vo2max";
  if (/vlamax/i.test(lower)) return "vlamax";
  if (/tte/i.test(lower)) return "tte";
  if (/fatmax|fat\s*ox|lipid/i.test(lower)) return "fatmax";
  if (/[ée]conom/i.test(lower)) return "économie";
  if (/ftp.*kg|ftp\/kg|puissance.*a[ée]rob/i.test(lower)) return "ftp";
  if (/durabilit/i.test(lower)) return "durabilit";
  if (/sprint|pmax|neuro/i.test(lower)) return "sprint";
  return null;
}

export function deriveLimiterKeysFromGapAnalysis(
  gapAnalysis: LimiterGapLike[],
  coachLimiterOrder?: string[]
): string[] {
  if (!gapAnalysis || gapAnalysis.length === 0) return [];

  let rankedGaps = [...gapAnalysis]
    .filter((gap) => gap.weightedImpact > 0 && gap.status !== "unknown")
    .sort((a, b) => b.weightedImpact - a.weightedImpact);

  if (coachLimiterOrder && coachLimiterOrder.length > 0) {
    rankedGaps = rankedGaps.sort((a, b) => {
      const idxA = coachLimiterOrder.indexOf(a.metric);
      const idxB = coachLimiterOrder.indexOf(b.metric);
      const posA = idxA >= 0 ? idxA : 999;
      const posB = idxB >= 0 ? idxB : 999;
      if (posA !== posB) return posA - posB;
      return b.weightedImpact - a.weightedImpact;
    });
  }

  const limiterKeys: string[] = [];
  for (const gap of rankedGaps) {
    const key = detectLimiterKeyFromMetric(gap.metric);
    if (key && !limiterKeys.includes(key)) limiterKeys.push(key);
    if (limiterKeys.length >= 4) break;
  }

  return limiterKeys;
}

/**
 * Compte, parmi les séances clés d'un ensemble de semaines données, combien
 * matchent chaque limiteur (priority dedup L1>L2>L3>L4 + synergies prouvées
 * VLamax/TTE/FTP — voir commentaires inline). Extrait de `validateLimiterCoherence`
 * pour être réutilisable PAR BLOC (`computePhaseLimiterFocus` ci-dessous),
 * sans dupliquer cette logique de matching (source unique avec le scoring
 * catalogue — `LIMITER_SESSION_PATTERNS`, `limiterSessionPatterns.ts`).
 */
function computeLimiterHitsForWeeks(
  weeks: ParsedWeek[],
  limiterKeys: string[]
): { limiterHits: Record<string, number>; totalKeySessions: number } {
  const limiterHits: Record<string, number> = {};
  let totalKeySessions = 0;

  // Co-contributor patterns: sessions that contribute to VLamax reduction via proven synergies
  // - Seuil long continu (TTE work) → glycolytic depletion → VLamax↓ (Billat, Bosquet 2002)
  // - SFR / Force basse cadence → Type I fiber recruitment → VLamax↓ (Rønnestad 2015)
  // - Sweet Spot long À BASSE CADENCE (55-65 RPM) → forced Type IIa aerobic recruitment +
  //   glycogen depletion → VLamax↓. Un Sweet Spot standard (cadence normale) est un travail
  //   FTP, pas un stimulus VLamax prouvé (cf. promptHelpers.ts L1389 : la matrice ne prescrit
  //   ce lever QUE qualifié "basse cadence"). D'où l'exigence du même qualificatif ici — retirer
  //   \bsst\b|sweet[\s_-]*spot bruts gonflait artificiellement la couverture VLamax (double
  //   comptage sur un simple Sweet Spot FTP classique).
  const VLAMAX_CO_CONTRIBUTOR_PATTERNS = /seuil\s*(?:continu|long|2[×x]|1[×x])|norv[ée]gi|mlss|tempo\s*(?:long|continu|soutenu)|sfr|r[øo]nnestad|force\s*(?:basse|50|40|60)\s*(?:rpm|cadence)|cadence\s*(?:basse|lente|50|40|60)|(?:basse|lente)\s*cadence|\b(?:4\d|5\d|60)\s*(?:rpm|tr\/?min)\b|seuil.*(?:\d+\s*min)|interval.*seuil/i;
  const TTE_FTP_CROSSOVER_PATTERNS = /\bsst\b|sweet[\s_-]*spot|over.?under|ftp|threshold(?:[\s_-]*(?:power|long|cruise))?|race[\s_-]*(?:pace|power).*(?:2[\sx_/-]*20|3[\sx_/-]*20|20\s*min)|tempo\s*(?:long|continu)|double[\s_-]*threshold|norwegian/i;

  const hasVlamaxLimiter = limiterKeys.includes("vlamax");
  const hasFtpLimiter = limiterKeys.includes("ftp");
  const hasTteLimiter = limiterKeys.includes("tte");
  // Correction ciblée "plan multiobjectifs réel" (2026-10-24), puis revue
  // scientifique ciblée avant fusion (même date) : la première version de ce
  // correctif créditait FatMax pour TOUTE séance assignée à VLamax — y
  // compris une simple Z2/endurance fondamentale générique. Rejeté en revue :
  // un stimulus susceptible d'influencer VLamax n'est pas nécessairement un
  // stimulus ciblé et suffisamment dosé pour FatMax ; cette équivalence
  // générale risquait de fabriquer une couverture plutôt que de la mesurer
  // (le test associé, `fatmax.hits === vlamax.hits`, validait d'ailleurs ce
  // problème au lieu de le détecter).
  //
  // Version corrigée, restreinte au SEUL sous-cas scientifiquement défendable
  // déjà présent dans le pattern VLamax ci-dessus (`LIMITER_SESSION_PATTERNS
  // .vlamax`) : l'entraînement à jeun / "train low" ("train low", "fasted",
  // "à/a jeun"). Ce protocole n'est pas une simple séance aérobie générique —
  // c'est, par définition, le protocole de référence pour l'adaptation
  // FatMax (déplétion glycogénique ciblée → upregulation des enzymes
  // d'oxydation lipidique). Une séance Z2/endurance fondamentale SANS ce
  // marqueur explicite n'est PAS créditée : en l'absence de dose/ciblage
  // FatMax démontrable dans le texte, la couverture reste basse/absente
  // plutôt que fabriquée (cf. FATMAX_SPECIFIC_CO_CONTRIBUTOR_PATTERN).
  const hasFatmaxLimiter = limiterKeys.includes("fatmax");
  const FATMAX_SPECIFIC_CO_CONTRIBUTOR_PATTERN = /train[\s_-]*low|fasted|[àa]\s*jeun/i;

  for (const week of weeks) {
    for (const session of week.sessions) {
      if (session.isRest) continue;
      const rawText = `${session.title} ${session.details}`;
      // Porte d'entrée "séance clé" : signal structuré posé par l'IA (chemin JSON, défaut
      // prod) en priorité, sinon fallback regex (seul signal dispo côté Markdown legacy).
      if (session.isKeySession !== true && !KEY_SESSION_PATTERNS.test(rawText)) continue;
      const text = buildLimiterMatchText(session);

      // Assign to highest-priority matching limiter
      let assignedKey: string | null = null;
      for (const lKey of limiterKeys) {
        const pattern = LIMITER_SESSION_PATTERNS[lKey];
        if (pattern && pattern.test(text)) {
          limiterHits[lKey] = (limiterHits[lKey] || 0) + 1;
          assignedKey = lKey;
          break; // Priority dedup: stop at first (highest-rank) match
        }
      }

      // Fallback: if no limiter matched but session has zone/intensity markers,
      // try a relaxed match (e.g. "Z5" → vo2max, "seuil" → tte, "sortie longue" → durabilité)
      if (!assignedKey) {
        for (const lKey of limiterKeys) {
          const fallback = FALLBACK_ZONE_MAP[lKey];
          if (fallback && fallback.test(text)) {
            limiterHits[lKey] = (limiterHits[lKey] || 0) + 1;
            assignedKey = lKey;
            break;
          }
        }
      }

      // Double-counting for proven VLamax co-contributors:
      // If session was assigned to TTE or Économie, also count it for VLamax (if VLamax is a limiter)
      let isLimiterRelevant = assignedKey !== null;

      if (hasVlamaxLimiter && assignedKey !== "vlamax" && (assignedKey === "tte" || assignedKey === "économie" || assignedKey === "ftp")) {
        if (VLAMAX_CO_CONTRIBUTOR_PATTERNS.test(text)) {
          limiterHits["vlamax"] = (limiterHits["vlamax"] || 0) + 1;
          isLimiterRelevant = true;
        }
      }

      // Synergie FatMax↔VLamax restreinte au jeûne/train-low (cf. commentaire
      // sur hasFatmaxLimiter ci-dessus) — jamais sur un simple assignedKey
      // === "vlamax" générique.
      if (hasFatmaxLimiter && assignedKey === "vlamax" && FATMAX_SPECIFIC_CO_CONTRIBUTOR_PATTERN.test(text)) {
        limiterHits["fatmax"] = (limiterHits["fatmax"] || 0) + 1;
        isLimiterRelevant = true;
      }

      if (hasTteLimiter && hasFtpLimiter && TTE_FTP_CROSSOVER_PATTERNS.test(text)) {
        if (assignedKey === "tte") {
          limiterHits["ftp"] = (limiterHits["ftp"] || 0) + 1;
          isLimiterRelevant = true;
        } else if (assignedKey === "ftp") {
          limiterHits["tte"] = (limiterHits["tte"] || 0) + 1;
          isLimiterRelevant = true;
        }
      }

      if (isLimiterRelevant) {
        totalKeySessions++;
      }
    }
  }

  return { limiterHits, totalKeySessions };
}

/**
 * Calcule, PAR BLOC (regroupement de semaines contiguës de même `week.phase`
 * — même logique que `derivePhasesFromWeeks`), quels limiteurs identifiés
 * sont réellement travaillés par les séances clés générées. Demande coach
 * (plan 10K/10 sem — "j'aimerais que la timeline donne aussi les chantiers
 * attaqués pendant le bloc") : calcul DÉRIVÉ des vraies séances plutôt que
 * dépendant du `strategicRecap` optionnel écrit par l'IA (potentiellement
 * incomplet, jamais vérifié après coup) — même source de vérité que la
 * validation `validateLimiterCoherence` ci-dessous, appliquée bloc par bloc
 * au lieu de sur tout le plan.
 */
export interface PhaseLimiterFocus {
  phaseName: string;
  startWeek: number;
  endWeek: number;
  weeksLabel: string;
  /** Classé par nombre de hits décroissant, limiteurs sans aucun hit exclus. */
  breakdown: { key: string; hits: number; pct: number }[];
}

export function computePhaseLimiterFocus(
  plan: ParsedPlan,
  limiterKeys: string[] | undefined
): PhaseLimiterFocus[] {
  if (!limiterKeys || limiterKeys.length === 0 || plan.weeks.length === 0) return [];
  const rankedKeys = limiterKeys.slice(0, 4);

  const groups: { name: string; weeks: ParsedWeek[] }[] = [];
  for (const w of plan.weeks) {
    const name = (w.phase || "").trim();
    if (!name) continue;
    const last = groups[groups.length - 1];
    if (last && last.name.toLowerCase() === name.toLowerCase()) {
      last.weeks.push(w);
    } else {
      groups.push({ name, weeks: [w] });
    }
  }

  return groups.map((group) => {
    const startWeek = group.weeks[0].weekNumber;
    const endWeek = group.weeks[group.weeks.length - 1].weekNumber;
    const { limiterHits, totalKeySessions } = computeLimiterHitsForWeeks(group.weeks, rankedKeys);

    const breakdown = totalKeySessions === 0
      ? []
      : rankedKeys
          .map((key) => ({
            key,
            hits: limiterHits[key] || 0,
            pct: Math.round(((limiterHits[key] || 0) / totalKeySessions) * 100),
          }))
          .filter((b) => b.hits > 0)
          .sort((a, b) => b.hits - a.hits);

    return {
      phaseName: group.name,
      startWeek,
      endWeek,
      weeksLabel: startWeek === endWeek ? `S${startWeek}` : `S${startWeek}-S${endWeek}`,
      breakdown,
    };
  });
}

function validateLimiterCoherence(
  plan: ParsedPlan,
  identifiedLimiters?: string[],
  identifiedLimiterKeys?: string[]
): { issues: ValidationIssue[]; score: number; coverage: LimiterCoverageItem[] } {
  const issues: ValidationIssue[] = [];
  const coverage: LimiterCoverageItem[] = [];

  if (((!identifiedLimiters || identifiedLimiters.length === 0) && (!identifiedLimiterKeys || identifiedLimiterKeys.length === 0)) || plan.weeks.length < 3) {
    return { issues, score: 100, coverage };
  }

  const limiterKeys: string[] = [];

  if (identifiedLimiterKeys && identifiedLimiterKeys.length > 0) {
    for (const key of identifiedLimiterKeys) {
      if (key && !limiterKeys.includes(key)) limiterKeys.push(key);
      if (limiterKeys.length >= 4) break;
    }
  } else if (identifiedLimiters) {
    // Fallback for legacy callers: extract from prompt text
    for (const limText of identifiedLimiters) {
      const key = detectLimiterKeyFromText(limText);
      if (key && !limiterKeys.includes(key)) limiterKeys.push(key);
      if (limiterKeys.length >= 4) break;
    }
  }

  if (limiterKeys.length === 0) return { issues, score: 80, coverage };

  // Count sessions that match each limiter's expected patterns
  // Priority dedup: each session is assigned to the HIGHEST-PRIORITY limiter it matches (L1 > L2 > L3 > L4)
  // EXCEPTION: Proven synergies allow double-counting (e.g. seuil long → TTE + VLamax, SFR → Économie + VLamax)
  const { limiterHits, totalKeySessions } = computeLimiterHitsForWeeks(plan.weeks, limiterKeys);

  if (totalKeySessions === 0) return { issues, score: 50, coverage };

  // Target thresholds per rank
  const TARGET_BY_RANK = [30, 15, 5, 5];
  let score = 100;

  for (let i = 0; i < limiterKeys.length; i++) {
    const lKey = limiterKeys[i];
    const hits = limiterHits[lKey] || 0;
    const pct = Math.round((hits / totalKeySessions) * 100);
    const target = TARGET_BY_RANK[i] ?? 5;
    const rank = i + 1;
    const status: LimiterCoverageItem["status"] = pct >= target ? "ok" : pct >= target / 3 ? "low" : "absent";

    coverage.push({ rank, key: lKey, hits, totalKeySessions, pct, target, status });

    // Scoring & issues
    if (i === 0) {
      // L1
      if (pct < 15) {
        issues.push({
          rule: "limiter_coherence",
          severity: "error",
          message: `Limiteur #1 (${lKey}) quasi-absent des séances clés : ${pct}% de correspondance (cible ≥${target}%)`,
          detail: `Le plan ne travaille pas suffisamment le limiteur principal détecté par le diagnostic. ${hits}/${totalKeySessions} séances clés ciblent ce limiteur.`,
        });
        score -= 40;
      } else if (pct < target) {
        issues.push({
          rule: "limiter_coherence",
          severity: "warning",
          message: `Limiteur #1 (${lKey}) sous-représenté dans les séances clés : ${pct}% (cible ≥${target}%)`,
          detail: `${hits}/${totalKeySessions} séances clés ciblent ce limiteur.`,
        });
        score -= 15;
      }
    } else if (i === 1) {
      // L2 — Correction ciblée "plan multiobjectifs réel" (2026-10-24) : bug
      // réel confirmé — un plan affichait L2 à 6% (`status` déjà calculé
      // "low" ci-dessus, cible 15%) mais AUCUNE pénalité n'était appliquée
      // car ce bloc ignorait `target`/`status` et testait un seuil fixe
      // `pct < 5`, jamais aligné sur la cible réelle du rang. Le score global
      // (95/100) ne reflétait donc pas la sous-couverture pourtant déjà
      // visible dans `coverage` (affichage). Utilise désormais `status` —
      // seule source de vérité partagée avec l'affichage — comme pour L1.
      if (status === "absent") {
        issues.push({
          rule: "limiter_coherence",
          severity: "warning",
          message: `Limiteur #2 (${lKey}) absent des séances clés : ${pct}% (cible ≥${target}%)`,
          detail: `${hits}/${totalKeySessions} séances clés ciblent ce limiteur secondaire.`,
        });
        score -= 15;
      } else if (status === "low") {
        issues.push({
          rule: "limiter_coherence",
          severity: "warning",
          message: `Limiteur #2 (${lKey}) sous-représenté dans les séances clés : ${pct}% (cible ≥${target}%)`,
          detail: `${hits}/${totalKeySessions} séances clés ciblent ce limiteur secondaire.`,
        });
        score -= 8;
      }
    } else {
      // L3/L4 — même correction que L2 ci-dessus : `status` remplace le
      // seuil fixe `pct < 5` pour rester cohérent avec sa propre cible et
      // avec l'affichage `coverage`.
      if (status === "absent") {
        issues.push({
          rule: "limiter_coherence",
          severity: "info",
          message: `Limiteur #${rank} (${lKey}) non ciblé : ${pct}% des séances clés (recommandé ≥${target}%)`,
          detail: `${hits}/${totalKeySessions} séances clés. Non injecté dans le prompt — couverture attendue via synergies ou séances secondaires.`,
        });
        score -= 5;
      } else if (status === "low") {
        issues.push({
          rule: "limiter_coherence",
          severity: "info",
          message: `Limiteur #${rank} (${lKey}) sous-représenté : ${pct}% des séances clés (recommandé ≥${target}%)`,
          detail: `${hits}/${totalKeySessions} séances clés. Non injecté dans le prompt — couverture attendue via synergies ou séances secondaires.`,
        });
        score -= 2;
      }
    }
  }

  return { issues, score: Math.max(0, score), coverage };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATOR
// ═══════════════════════════════════════════════════════════════════════════════

// RACE DAY PRESENCE VALIDATION (Rule 9)
// RACE_DAY_PATTERNS déplacé plus haut (ligne ~197, avec DELOAD_PATTERNS) —
// désormais réutilisé aussi par weekHasRaceDay() pour toutes les exemptions
// "semaine de course" du fichier, plus seulement cette règle.

function validateRaceDayPresence(plan: ParsedPlan, raceWeekNumbers?: number[]): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  // A race is an event, never a training catalog prescription. Do not strip
  // its ID: its details may already be a simulation and need coach correction.
  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      if (session.isRest || !isRaceEventTitle(session)) continue;
      const ids = extractAllCatalogIds(session.title, session.details, session.catalogId);
      if (ids.length > 0) issues.push({
        rule: "race_catalog_conflict", severity: "error", week: week.weekNumber,
        message: `S${week.weekNumber} ${session.dayName}: compétition réelle associée à une fiche d'entraînement (${ids.join(", ")})`,
        detail: "Conserver la date, la distance, le nom et les consignes de compétition ; corriger la prescription, sans la convertir en simulation ni supprimer silencieusement son identifiant.",
      });
    }
  }
  if (plan.weeks.length === 0) return { issues, score: 100 };

  // Determine which weeks should contain a race day
  const targetWeeks: number[] = raceWeekNumbers && raceWeekNumbers.length > 0
    ? raceWeekNumbers
    : [plan.weeks[plan.weeks.length - 1].weekNumber]; // fallback: last week

  let score = 100;
  const penaltyPerMissing = Math.floor(100 / targetWeeks.length);

  for (const weekNum of targetWeeks) {
    const week = plan.weeks.find(w => w.weekNumber === weekNum);
    if (!week) {
      // Sprint 4 (audit "fiabilisation moteur", 2026-10-23) : avant ce fix,
      // une semaine cible calculée (date de course → numéro de semaine) qui
      // ne correspond à AUCUNE semaine réelle du plan généré (erreur de
      // calendrier : date de course mal positionnée, plan plus court que
      // prévu, décalage de durée) désactivait silencieusement tout le
      // contrôle `race_day` pour cette course — ni signal "jour de course
      // absent" ni aucun autre avertissement, alors que l'incohérence est
      // justement la cause qui empêche de la détecter normalement. Devient
      // un avertissement explicite plutôt qu'une correction silencieuse.
      issues.push({
        rule: "race_day",
        severity: "warning",
        week: weekNum,
        message: `📅 Incohérence calendaire — la semaine S${weekNum} calculée pour une course n'existe pas dans ce plan de ${plan.weeks.length} semaine(s)`,
        detail: "La date de cette course, une fois convertie en numéro de semaine depuis la date de début du plan, tombe hors des semaines réellement générées — vérifiez la date de la course et la durée du plan avant d'utiliser ce plan.",
      });
      score = Math.min(score, 50);
      continue;
    }

    const allSessions = week.sessions || [];
    const realSessions = allSessions.filter(s => !s.isRest);
    const hasRaceDay = weekHasRaceDay(week);

    if (!hasRaceDay) {
      issues.push({
        rule: "race_day",
        severity: "error",
        week: weekNum,
        message: `🏁 Jour de course absent — S${weekNum} ne contient aucune séance "Jour J" ou "🏁 COURSE OBJECTIF"`,
        detail: "Cette semaine doit inclure le jour de la compétition avec stratégie de pacing et consignes nutrition",
      });
      score -= penaltyPerMissing;
    }

    // Race Week completeness: minimum 4 real sessions expected — aligné sur
    // le prompt (systemPrompt.ts, RÈGLES INVIOLABLES §4) et sur son propre
    // exemple few-shot (FEWSHOT_RACEWEEK_MARATHON : 4 séances réelles hors
    // repos). Audit fix — ce garde-fou exigeait 5, le prompt exigeait 6, et
    // l'exemple donné à l'IA comme référence n'en démontrait que 4 : un plan
    // fidèle à l'exemple était donc rejeté par ce garde-fou.
    const MIN_RACE_WEEK_SESSIONS = 4;
    if (realSessions.length < MIN_RACE_WEEK_SESSIONS) {
      issues.push({
        rule: "race_day",
        severity: "warning",
        week: weekNum,
        message: `⚠️ Race Week sous-peuplée — S${weekNum} : seulement ${realSessions.length} séance(s) réelle(s) sur ${MIN_RACE_WEEK_SESSIONS} attendues`,
        detail: "La semaine de course doit inclure rappels race-pace, activation pré-course et Jour J",
      });
      score = Math.min(score, 50);
    }
  }

  // Course non déclarée (audit "correction ciblée plan multiobjectifs réel",
  // 2026-10-24) : bug réel confirmé — un plan 70.3 + UN SEUL 10K déclaré (déjà
  // présent à sa semaine réelle) s'est vu attribuer un DEUXIÈME 10K inventé à
  // une autre semaine. Jusqu'ici aucun contrôle ne vérifiait la direction
  // inverse de ce fichier : `targetWeeks` (ci-dessus) ne sert qu'à vérifier
  // qu'un Jour J est bien PRÉSENT aux semaines attendues, jamais qu'aucun
  // Jour J n'apparaît AILLEURS. Uniquement activé quand `raceWeekNumbers` est
  // explicitement fourni (liste complète et fiable des courses réellement
  // déclarées par le coach, cf. AITrainingPlanPage.tsx/AIPlanBenchmark.tsx) —
  // sans cette liste (ex. profils QA synthétiques sans raceDate), le seul
  // repli possible serait "dernière semaine uniquement", insuffisant pour
  // distinguer une vraie course supplémentaire légitime d'une fausse
  // correspondance de motif, donc on s'abstient plutôt que de spéculer.
  if (raceWeekNumbers && raceWeekNumbers.length > 0) {
    const declaredWeeks = new Set(targetWeeks);
    for (const week of plan.weeks) {
      if (declaredWeeks.has(week.weekNumber)) continue;
      if (!weekHasRaceDay(week)) continue;
      issues.push({
        rule: "race_day_unexpected",
        severity: "error",
        week: week.weekNumber,
        message: `🏁 Course non déclarée — S${week.weekNumber} contient un Jour de Course alors qu'aucune course n'est déclarée cette semaine-là`,
        detail: `Courses déclarées aux semaines : ${[...declaredWeeks].sort((a, b) => a - b).join(", ")}. Une compétition supplémentaire a été ajoutée au plan sans être demandée par le coach — vérifier S${week.weekNumber} avant d'utiliser ce plan.`,
      });
      score = Math.min(score, 40);
    }
  }

  return { issues, score: Math.max(0, score) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE 11: W'BAL FEASIBILITY (Skiba 2012)
// Détecte les intervalles cyclistes où la combinaison intensité/durée/repos
// dépasse la capacité W' de l'athlète (séances physiologiquement infaisables).
// No-op si l'athlète n'a pas de CP/W' calculable.
// ═══════════════════════════════════════════════════════════════════════════════
function validateWbalFeasibility(
  plan: ParsedPlan,
  athleteData?: PlanAthleteData
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];

  if (!athleteData) {
    return { issues: [], score: 100 };
  }

  const cpResult = analyzeCriticalPower({
    pmax_5s: athleteData.pmax5s ?? null,
    p30s_w: athleteData.p30s ?? null,
    p60s_w: athleteData.p60s ?? null,
    map5min_w: athleteData.map5min ?? null,
    ftp: athleteData.ftp ?? null,
    weight_kg: athleteData.weightKg ?? null,
  });

  if (!cpResult) {
    return { issues: [], score: 100 };
  }

  const cp = cpResult.effectiveCP;
  const wprime = effectiveWprime(cpResult.wprime);
  const ftp = athleteData.ftp ?? cp;
  const wKJ = Math.round(wprime / 100) / 10;

  let scanned = 0;
  let infeasible = 0;
  let tight = 0;

  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      if (session.isRest) continue;
      if (!isCyclingSession(session)) continue;

      const blocks = detectAllIntervals(session.details);
      if (blocks.length === 0) continue;

      for (const detected of blocks) {
        scanned++;

        const refWatts = detected.intensityRef === "FTP" ? ftp : cp;
        const intervalPowerW = Math.round((refWatts * detected.pctIntensity) / 100);

        // Sub-CP intervals: W' n'est pas drainé → toujours faisable
        if (intervalPowerW <= cp) continue;

        // Coût d'1 rep vs W' total (cap physiologique strict)
        const singleRepCostJ = (intervalPowerW - cp) * detected.durationSec;
        if (singleRepCostJ > wprime) {
          infeasible++;
          issues.push({
            rule: "wbal_feasibility",
            severity: "error",
            week: week.weekNumber,
            message: `S${week.weekNumber} — "${session.title}" : 1 rep dépasse W' disponible`,
            detail: `Coût ${Math.round(singleRepCostJ / 100) / 10}kJ > W'=${wKJ}kJ (CP=${cp}W, ${intervalPowerW}W = ${detected.pctIntensity}%${detected.intensityRef}, ${detected.durationSec}s). L'athlète atteindra l'épuisement avant la fin du 1er intervalle.`,
          });
          continue;
        }

        // Simulation multi-rep avec le repos prescrit par le plan
        const prescription = prescribeIntervalRecovery(cp, wprime, intervalPowerW, detected.durationSec, 0);
        const tau = calculateTau(cp, 0); // Skiba 2015 — recoveryPower=0 (passive)
        const wCostPerRep = singleRepCostJ;

        let simWbal = wprime;
        let achievableReps = 0;
        for (let r = 0; r < detected.reps; r++) {
          simWbal = simWbal - wCostPerRep;
          if (simWbal <= 0) break;
          achievableReps++;
          if (r < detected.reps - 1) {
            const depletedNow = wprime - simWbal;
            simWbal = wprime - depletedNow * Math.exp(-detected.originalRestSec / tau);
          }
        }

        if (achievableReps < detected.reps) {
          infeasible++;
          issues.push({
            rule: "wbal_feasibility",
            severity: "error",
            week: week.weekNumber,
            message: `S${week.weekNumber} — "${session.title}" : ${achievableReps}/${detected.reps} reps réalisables`,
            detail: `W'=${wKJ}kJ, CP=${cp}W, ${intervalPowerW}W, repos ${detected.originalRestSec}s → épuisement avant le rep #${achievableReps + 1}. Repos W'bal optimal : ${prescription.optimalRecoverySec}s pour ${prescription.maxReps} reps max.`,
          });
        } else if (prescription.maxReps < detected.reps) {
          // Réalisable au sens strict mais marge W'bal serrée vs optimal
          tight++;
          issues.push({
            rule: "wbal_feasibility",
            severity: "warning",
            week: week.weekNumber,
            message: `S${week.weekNumber} — "${session.title}" : marge W'bal serrée`,
            detail: `${detected.reps} reps demandés, repos ${detected.originalRestSec}s court. Repos optimal W'bal : ${prescription.optimalRecoverySec}s pour préserver la qualité des derniers intervalles.`,
          });
        }
      }
    }
  }

  if (scanned === 0) {
    return { issues: [], score: 100 };
  }

  const failureRate = infeasible / scanned;
  const tightRate = tight / scanned;
  const score = Math.max(0, Math.round(100 - failureRate * 100 - tightRate * 30));

  return { issues, score };
}

/**
 * Lot 3 — Rule 12: Session density (sessions/semaine + max sessions/jour).
 * Vérifie que le plan respecte la config coach envoyée à l'IA :
 *  • activeSessions par semaine ∈ [target−1 ; target+1] (deload/race semaine exclus)
 *  • aucun jour ne dépasse `maxSessionsPerDay` (défaut 2)
 */
function validateSessionDensity(
  plan: ParsedPlan,
  cfg?: SessionDensityConfig,
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  const maxPerDay = cfg?.maxSessionsPerDay ?? 2;
  const target = cfg?.sessionsPerWeek;
  let compliant = 0;
  let scanned = 0;

  for (const w of plan.weeks) {
    const active = w.sessions.filter((s) => !s.isRest);

    // Density par jour
    const byDay = new Map<number, number>();
    for (const s of active) {
      if (s.dayIndex == null || s.dayIndex < 0) continue;
      byDay.set(s.dayIndex, (byDay.get(s.dayIndex) ?? 0) + 1);
    }
    for (const [day, count] of byDay) {
      if (count > maxPerDay) {
        issues.push({
          rule: "session_density",
          severity: "error",
          week: w.weekNumber,
          message: `S${w.weekNumber}: ${count} séances le jour ${day + 1} (max autorisé ${maxPerDay})`,
        });
      }
    }

    // Correction sprint qualité Marathon/Ironman (oct. 2026), #E (demande
    // coach explicite, contrainte d'agenda "max 4 journées doubles/semaine") :
    // distinct du plafond `maxPerDay` ci-dessus (qui borne UN jour donné) —
    // ici on compte le nombre de JOURS à ≥2 séances actives sur la semaine.
    if (cfg?.maxDoubleDaysPerWeek != null) {
      const doubleDays = Array.from(byDay.values()).filter((count) => count >= 2).length;
      if (doubleDays > cfg.maxDoubleDaysPerWeek) {
        issues.push({
          rule: "session_density",
          severity: "warning",
          week: w.weekNumber,
          message: `S${w.weekNumber}: ${doubleDays} journées à 2 séances (max déclaré ${cfg.maxDoubleDaysPerWeek}/semaine)`,
          detail: `Contrainte d'agenda déclarée par le coach — distincte du plafond séances/jour. À valider : cette semaine dépasse le nombre de journées doubles disponibles pour cet athlète.`,
        });
      }
    }

    // Sessions/semaine vs cible coach
    if (target && target > 0) {
      scanned++;
      const isDeload = DELOAD_PATTERNS.test(`${w.theme} ${w.phase}`.toLowerCase());
      const isRaceWeek = weekHasRaceDay(w);
      if (isDeload || isRaceWeek) {
        compliant++;
        continue;
      }
      const delta = active.length - target;
      if (Math.abs(delta) <= 1) {
        compliant++;
      } else if (Math.abs(delta) === 2) {
        issues.push({
          rule: "session_density",
          severity: "warning",
          week: w.weekNumber,
          message: `S${w.weekNumber}: ${active.length} séances vs cible coach ${target} (Δ${delta > 0 ? "+" : ""}${delta})`,
        });
        compliant += 0.5;
      } else {
        issues.push({
          rule: "session_density",
          severity: "error",
          week: w.weekNumber,
          message: `S${w.weekNumber}: ${active.length} séances vs cible coach ${target} (Δ${delta > 0 ? "+" : ""}${delta}) — hors tolérance ±1`,
        });
      }
    }
  }

  const score = scanned > 0
    ? Math.round((compliant / scanned) * 100) - Math.min(30, issues.filter((i) => i.severity === "error" && /jour/.test(i.message)).length * 10)
    : Math.max(0, 100 - issues.length * 20);
  return { issues, score: Math.max(0, Math.min(100, score)) };
}

/**
 * GRAND SPRINT P0, Sprint 6 ("décisions du coach"), 2026-10-23 — "contrôler
 * la présence du renforcement demandé" : `strengthSessionsPerWeek` (UI
 * "Renforcement/sem", 0-3) est transmis au prompt système comme une
 * instruction stricte ("Inclure EXACTEMENT N séance(s) de renforcement/PPG
 * par semaine"), mais rien ne vérifiait jusqu'ici que le plan réellement
 * généré respecte ce nombre — ni sa présence (N>0), ni son absence stricte
 * (N=0, "Aucun" explicitement choisi par le coach). Comparaison STRICTE
 * (delta=0 attendu), pas la tolérance ±1 de `validateSessionDensity`
 * ci-dessus : le prompt demande un nombre EXACT, pas approximatif. Semaines
 * de décharge/course exclues (hors périmètre, comme partout ailleurs dans
 * ce fichier). `strengthSessionsPerWeek` omis/`null` = contrôle inactif —
 * aucune donnée de contrat disponible, jamais un signal fabriqué.
 */
function validateStrengthSessionsRequested(
  plan: ParsedPlan,
  metrics: WeekMetrics[],
  strengthSessionsPerWeek: number | null | undefined,
): { issues: ValidationIssue[]; score: number } {
  if (strengthSessionsPerWeek == null || strengthSessionsPerWeek < 0) return { issues: [], score: 100 };

  const issues: ValidationIssue[] = [];
  let scanned = 0;
  let compliant = 0;
  for (let i = 0; i < plan.weeks.length; i++) {
    const w = plan.weeks[i];
    const wm = metrics[i];
    if (!wm || wm.isContentOrScheduleDeload || wm.isRaceWeek) continue; // hors périmètre, comme ailleurs dans ce fichier
    scanned++;
    const actual = wm.sports["Renfo"] || 0;
    const delta = actual - strengthSessionsPerWeek;
    if (delta === 0) {
      compliant++;
      continue;
    }
    issues.push({
      rule: "strength_sessions_requested",
      severity: Math.abs(delta) === 1 ? "warning" : "error",
      week: w.weekNumber,
      message: `S${w.weekNumber}: ${actual} séance(s) de renforcement vs ${strengthSessionsPerWeek} demandée(s) par le coach (Δ${delta > 0 ? "+" : ""}${delta})`,
      detail: `Le coach a demandé EXACTEMENT ${strengthSessionsPerWeek} séance(s) de renforcement/PPG par semaine (UI "Renforcement/sem") — cette instruction est transmise au prompt système mais son respect n'était jusqu'ici jamais vérifié sur le plan réellement généré.`,
    });
  }

  const score = scanned > 0 ? Math.round((compliant / scanned) * 100) : 100;
  return { issues, score };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOT 4 — Rule 13 : Lorang A/B/C/D categories (systemPrompt L528-536)
// A = HIT (Z5/Z6, VO2/VMA)        cible 15-20% vol
// B = Seuil / Sweet Spot (Z4)      cible ≤ ~15% vol (Z3 >30' compte B)
// C = Endurance fondamentale (Z1-Z2) cible 75-85% vol
// D = Récupération stricte
// Règle : hors décharge, chaque semaine ≥ 1 séance A OU B.
//
// Audit fix — les seuils de ce garde-fou (35% A+B / 55% C au niveau hebdo,
// 30% A+B / 60% C au niveau global) étaient nettement plus laxistes que ce
// que le prompt demande explicitement (POLARIZED TRAINING, §3 : 80% Z1-Z2 /
// 0-5% Z3 / 15-20% Z4-Z5+, soit A+B ≤ 25% max ; table A-D : C = 75-85%), ET
// divergents entre eux (deux paires de chiffres différentes pour la même
// règle). Un plan à 34% A+B passait le contrôle hebdo sans avertissement
// alors que le prompt vise ≤25% — le garde-fou n'empêchait quasiment rien de
// ce qu'il prétendait vérifier. Seuils unifiés ci-dessous, utilisés
// identiquement aux deux niveaux (hebdo et global).
// ═══════════════════════════════════════════════════════════════════════════════

/** A+B combinés ne doivent pas dépasser 25% du volume (0-5% Z3 + 15-20% Z4-Z5+, cf. prompt §3). */
const LORANG_HI_INTENSITY_MAX_PCT = 25;
/** C (endurance fondamentale) doit représenter au moins 75% du volume (cf. table A-D, prompt). */
const LORANG_ENDURANCE_MIN_PCT = 75;

const LORANG_EXPLICIT_TAG_RX = /\[\s*([ABCD])\s*\]/i;
/**
 * Bug réel (audit "génération solide ?", passe 4) : sur les 61 préfixes
 * distincts réellement utilisés dans le catalogue (enrichedWorkouts*.ts,
 * workoutLibrary.ts), 8 échappaient à ce pattern — B_LCW et 7 fiches "D"
 * (D_ACTIVATION*, D_COLD*, D_DELOAD*, D_FOAM*, D_MOBILITY*, D_VISUALIZATION*,
 * D_YOGA*). Ces fiches retombaient sur le fallback mot-clé (LORANG_D_RX /
 * LOW_INTENSITY_PATTERNS) qui ne les couvre pas toutes non plus (ex. "foam
 * rolling", "activation pré-course" n'ont pas de mot-clé dédié) — ces
 * fiches, pourtant explicitement catégorisées dans leur propre catalogId,
 * n'étaient comptées ni dans le bon bucket A/B/C/D ni dans le taux
 * d'étiquetage "tagged" (ce pattern alimente directement `tagged` dans
 * validateLorangCategories, pas seulement `classifyLorang`), faussant à la
 * fois la distribution Lorang et la traçabilité méthodologique affichées au
 * coach. Élargi pour couvrir les 61 préfixes réels (vérifié : 0 miss après
 * ce correctif).
 */
const LORANG_CATALOG_PREFIX_RX = /\b([ABCD])_(?:BIKE|RUN|SWIM|TR|STR|BR|RECOVERY|10K|703|IM|MAR|SEMI|HEAT|TAPER|RECUP|RACE|MENTAL|HALF|PAP|ALTITUDE|RESP|PRE|LCW|ACTIVATION|COLD|DELOAD|FOAM|MOBILITY|VISUALIZATION|YOGA)/;
const LORANG_A_RX = /vo2|vma|billat|30[\/_ -]?30|15[\/_ -]?15|pma|tabata|z\s*[56]|zone\s*[56]|hiit|sprint\s*(?:max|all.?out)|neuro\s*muscul/i;
const LORANG_B_RX = /seuil|threshold|mlss|sweet[\s_-]*spot|\bsst\b|over.?under|ftp|cruise|norvégi|norwegian|double[\s_-]*threshold|race[\s_-]*pace|allure\s*(?:course|semi|marathon|10k|5k|70\.?3|im\b|ironman|spécifiq)|tempo\s*(?:long|\d{2,3}\s*min|\d+\s*x\s*\d+)|z\s*4/i;
const LORANG_D_RX = /décharge|recovery\s*ride|spin\s*facile|yoga|marche|mobilit|souplesse|activation\s*courte|régénér/i;

/**
 * Mappe les zones structurées (ParsedSession.zones) sur les catégories
 * Lorang A (HIT/VO2max)/B (seuil)/C (endurance) — même convention
 * numérique que LORANG_A_RX ("z[56]")/LORANG_B_RX ("z4")/LOW_INTENSITY_
 * PATTERNS ("z[12]"), étendue à Z7 dans le bucket A (non couvert par les
 * regex texte ci-dessus — gap préexistant — mais cohérent avec
 * HIGH_INTENSITY_PATTERNS "z[4-7]" et LORANG_A_RX qui inclut déjà
 * "neuromuscul"). Ne retourne jamais "D" : repos/mobilité ne se distingue
 * pas d'une séance easy par la seule zone (souvent aussi Z1-Z2) — reste
 * détecté par isRest/mot-clé, comme avant. Z3 (ambigu dans une taxonomie à
 * 4 catégories) n'est pas mappé non plus, laissé au texte/"unknown".
 *
 * IMPORTANT (audit "fiabilité du validateur") : le préfixe-lettre d'un
 * catalogId ([ABCD]_...) N'EST PAS une méthode fiable pour cette
 * classification — vérifié sur le catalogue réel (`workoutLibrary.ts`) :
 * "A_RUN_Z2_EASY" (cat "A" = priorité "Obligatoire") a `zones: ["Z1","Z2"]`
 * — un Lorang C, pas A ; "B_RUN_VMA_400" (cat "B" = "Recommandé") est une
 * séance VMA — un Lorang A, pas B. La lettre de catalogId encode une
 * PRIORITÉ/NÉCESSITÉ (Obligatoire/Recommandé/...), une taxonomie différente
 * qui partage juste les mêmes 4 lettres par coïncidence — jamais la
 * catégorie Lorang. L'ancienne étape "catalog ID prefix" de `classifyLorang`
 * reposait sur cette confusion ; elle n'avait simplement jamais été
 * exercée en pratique (testée sur title/details, où l'ID catalogue
 * n'apparaît jamais) donc le mauvais mapping restait invisible. Remplacée
 * ici par `zones`, qui n'a pas ce problème (numérique, sans ambiguïté).
 */
function lorangTierFromZones(zones: string[] | undefined): "A" | "B" | "C" | null {
  if (!zones || zones.length === 0) return null;
  let sawA = false, sawB = false, sawC = false;
  for (const raw of zones) {
    const m = /z\s*([1-7])/i.exec(raw);
    if (!m) continue;
    const n = parseInt(m[1], 10);
    if (n >= 5) sawA = true;
    else if (n === 4) sawB = true;
    else if (n <= 2) sawC = true;
  }
  if (sawA) return "A";
  if (sawB) return "B";
  if (sawC) return "C";
  return null;
}

/** Résultat de `classifyLorang` — `uncertain: true` signale une catégorie
 *  déduite UNIQUEMENT du préfixe-lettre du catalogId (dernier recours, ni
 *  zones ni mot-clé disponibles) : cf. docstring `LorangCategoryDistribution
 *  .uncertainTagging` — statistiquement peu fiable, ne jamais afficher ou
 *  utiliser comme une catégorie certaine. */
interface LorangClassification { category: LorangCategory; uncertain: boolean }

function classifyLorang(session: ParsedSession): LorangClassification {
  if (session.isRest) return { category: "D", uncertain: false };
  const text = `${session.title} ${session.details}`;
  // 1) explicit tag [A]/[B]/[C]/[D]
  const explicit = text.match(LORANG_EXPLICIT_TAG_RX);
  if (explicit) return { category: explicit[1].toUpperCase() as LorangCategory, uncertain: false };
  // 2) zones structurées (priorité aux données structurées, cf. docstring
  //    lorangTierFromZones ci-dessus — remplace l'ancien mapping par
  //    préfixe de catalogId, confirmé incorrect).
  const zoneTier = lorangTierFromZones(session.zones);
  if (zoneTier) return { category: zoneTier, uncertain: false };
  // 3) keyword fallback (A > B > D > C)
  if (LORANG_A_RX.test(text)) return { category: "A", uncertain: false };
  if (LORANG_B_RX.test(text)) return { category: "B", uncertain: false };
  if (LORANG_D_RX.test(text)) return { category: "D", uncertain: false };
  // 4) low-intensity endurance = C by default when we can identify at least a sport session
  if (LOW_INTENSITY_PATTERNS.test(text)) return { category: "C", uncertain: false };
  // 5) DERNIER RECOURS, confiance FAIBLE : préfixe-lettre du catalogId
  // (structuré OU littéralement présent dans le texte, chemin Markdown
  // legacy) — vérifié sur le catalogue réel (`workoutLibrary.ts`, 186
  // fiches) : cette lettre encode une PRIORITÉ/NÉCESSITÉ (Obligatoire/
  // Recommandé/...), pas la catégorie Lorang (0/50 fiches "A" n'ont de zone
  // haute — "A" n'y veut pas dire HIT). Gardé seulement en dernier recours,
  // après zones ET mots-clés, PLUTÔT que de renvoyer "unknown" quand c'est
  // le seul signal disponible — mieux qu'aucune information, mais jamais
  // prioritaire sur un signal plus fiable NI présenté comme certain :
  // `uncertain: true`, compté à part (LorangCategoryDistribution
  // .uncertainTagging) et signalé par un avertissement dédié (consigne
  // coach : "ne doit pas être considérée comme certaine").
  if (session.catalogId) {
    const catalogStructured = LORANG_CATALOG_PREFIX_RX.exec(session.catalogId);
    if (catalogStructured) return { category: catalogStructured[1].toUpperCase() as LorangCategory, uncertain: true };
  }
  const catalogInText = text.match(LORANG_CATALOG_PREFIX_RX);
  if (catalogInText) return { category: catalogInText[1].toUpperCase() as LorangCategory, uncertain: true };
  return { category: "unknown", uncertain: false };
}

/**
 * Vrai si le plan cible une population "quasi-exclusivement Z1-Z2, pas
 * d'intensités max" (Finisher : 1-2 séances clés/semaine ; Start to Run : 0
 * — cf. "Grille Volume/Intensité par Ambition", systemPrompt.ts). Facteur
 * commun extrait ici après un oubli constaté en audit (Batch 3) :
 * validateLorangCategories avait déjà cette exemption (Batch 2, règle 1
 * "≥1 A/B par semaine") mais validateKeySessions — une règle sœur au même
 * genre d'exigence ("≥1 séance clé par semaine") — ne l'avait pas reçue, et
 * pénalisait donc à tort en erreur chaque semaine d'un plan Start to Run
 * strictement conforme à sa propre doctrine "0 séance clé". Un helper
 * partagé évite qu'une troisième règle du même genre soit oubliée à son tour.
 */
function isFinisherOrStartToRunPlan(objective?: string, ambition?: string): boolean {
  const amb = (ambition || "").toLowerCase();
  return amb === "finisher" || normalizeObjectiveKey(objective || "") === "StartToRun";
}

function validateLorangCategories(
  plan: ParsedPlan,
  objective?: string,
  ambition?: string,
): { issues: ValidationIssue[]; score: number; distribution: LorangCategoryDistribution } {
  const issues: ValidationIssue[] = [];
  const weeks: LorangWeekBreakdown[] = [];
  let A = 0, B = 0, C = 0, D = 0, unknown = 0, totalActive = 0, tagged = 0, uncertainTagging = 0;

  // Batch 2 — Règle 1 (≥1 séance A/B par semaine) exemptée pour Finisher et
  // Start to Run : la "Grille Volume/Intensité par Ambition" (systemPrompt.ts)
  // prescrit explicitement 1-2 séances clés/semaine pour Finisher et 0 pour
  // Start to Run — ces plans sont censés être quasi-exclusivement Z1-Z2
  // (doctrine "pas d'intensités max", périodisation linéaire progressive).
  // Sans cette exemption, un plan strictement conforme à cette doctrine se
  // faisait pénaliser en erreur quasiment chaque semaine par une règle
  // pensée pour les niveaux Age Group+/objectifs intenses. Les règles 2/4
  // (polarisation, distribution globale) restent actives — seule la règle 1
  // (présence stricte d'A/B) est exemptée.
  const isFinisherOrStartToRun = isFinisherOrStartToRunPlan(objective, ambition);

  for (const w of plan.weeks) {
    const active = w.sessions.filter((s) => !s.isRest);
    const weekThemeText = `${w.theme} ${w.phase}`.toLowerCase();
    // Correction sprint qualité Marathon/Ironman (oct. 2026), #3 : l'ancien
    // `|| active.length <= 3` exemptait à tort la Règle 1 (≥1 séance A/B)
    // pour toute semaine à EXACTEMENT 3 séances (le plancher `bd.active>=3`
    // ci-dessous l'aurait sinon évaluée) même si c'était 3 séances toutes
    // maximales — pas un déload. Texte seul (même définition que
    // validateSessionDensity, déjà sans ce proxy de comptage).
    const isDeload = DELOAD_PATTERNS.test(weekThemeText);
    // Niveau 2 : bloc seuil concentré explicitement nommé (norvégien double-seuil,
    // Sweet Spot étendu) — même exemption que Rule 1, cf. THRESHOLD_BLOCK_PATTERNS.
    const isThresholdBlock = THRESHOLD_BLOCK_PATTERNS.test(weekThemeText);
    const bd: LorangWeekBreakdown = {
      weekNumber: w.weekNumber, isDeload,
      A: 0, B: 0, C: 0, D: 0, unknown: 0, uncertainTagging: 0,
      active: active.length, hasHighOrThreshold: false,
    };
    for (const s of active) {
      const { category: cat, uncertain } = classifyLorang(s);
      bd[cat === "unknown" ? "unknown" : cat]++;
      if (uncertain) bd.uncertainTagging++;
      totalActive++;
      // consider "tagged" any session with explicit tag OR catalog ID — la
      // simple PRÉSENCE d'un catalogId structuré suffit ici (traçable au
      // catalogue, par opposition à une séance inventée par l'IA) : pas
      // besoin que son préfixe-lettre matche LORANG_CATALOG_PREFIX_RX, ce
      // qui exclurait à tort des ID réels hors de son énumération de
      // suffixes (cf. docstring lorangTierFromZones — la lettre de
      // catalogId n'est de toute façon pas la catégorie Lorang). Conservé en
      // plus : LORANG_CATALOG_PREFIX_RX sur le texte, pour le chemin
      // Markdown legacy où catalogId structuré est absent.
      const text = `${s.title} ${s.details}`;
      if (LORANG_EXPLICIT_TAG_RX.test(text) || LORANG_CATALOG_PREFIX_RX.test(text) || !!s.catalogId) tagged++;
    }
    bd.hasHighOrThreshold = bd.A > 0 || bd.B > 0;
    A += bd.A; B += bd.B; C += bd.C; D += bd.D; unknown += bd.unknown;
    uncertainTagging += bd.uncertainTagging;
    weeks.push(bd);

    // Règle 1 : hors décharge/race, ≥1 A ou B (exemptée Finisher/Start to Run, cf. commentaire ci-dessus)
    const isRaceWeek = weekHasRaceDay(w);
    if (!isDeload && !isRaceWeek && !isFinisherOrStartToRun && !bd.hasHighOrThreshold && bd.active >= 3) {
      issues.push({
        rule: "lorang_categories",
        severity: "error",
        week: w.weekNumber,
        message: `S${w.weekNumber} : aucune séance Lorang A (HIT) ni B (seuil) — chaque semaine hors décharge doit en contenir au moins 1`,
      });
    }

    // Règle 2 : polarisation intra-semaine (hors décharge / bloc seuil concentré)
    if (!isDeload && !isThresholdBlock && bd.active >= 4) {
      const hiPct = ((bd.A + bd.B) / bd.active) * 100;
      if (hiPct > LORANG_HI_INTENSITY_MAX_PCT) {
        issues.push({
          rule: "lorang_categories",
          severity: "warning",
          week: w.weekNumber,
          message: `S${w.weekNumber} : ${Math.round(hiPct)}% A+B (cible ≤ ${LORANG_HI_INTENSITY_MAX_PCT}%) — polarisation Seiler compromise`,
        });
      }
      const cPct = (bd.C / bd.active) * 100;
      if (cPct < LORANG_ENDURANCE_MIN_PCT) {
        issues.push({
          rule: "lorang_categories",
          severity: "warning",
          week: w.weekNumber,
          message: `S${w.weekNumber} : ${Math.round(cPct)}% C (endurance fondamentale) — cible ${LORANG_ENDURANCE_MIN_PCT}-85%`,
        });
      }
    }
  }

  const pct = (n: number) => (totalActive > 0 ? Math.round((n / totalActive) * 100) : 0);
  const taggedPct = totalActive > 0 ? Math.round((tagged / totalActive) * 100) : 0;

  // Règle 3 : taux d'étiquetage explicite (tag [A-D] ou ID catalogue A_/B_/...)
  if (totalActive >= 10 && taggedPct < 50) {
    issues.push({
      rule: "lorang_categories",
      severity: "warning",
      message: `Seulement ${taggedPct}% des séances portent un tag Lorang [A/B/C/D] ou ID catalogue — traçabilité méthodologique réduite (cible ≥70%)`,
    });
  }

  // Règle 3bis (audit "fiabilité du validateur", consigne coach) : signale
  // explicitement toute séance dont la catégorie A/B/C/D vient UNIQUEMENT du
  // dernier recours (préfixe-lettre du catalogId, zones et mots-clés
  // absents) — vérifié peu fiable sur le catalogue réel (cf. docstring
  // classifyLorang). La distribution A/B/C/D ci-dessous reste la MEILLEURE
  // estimation disponible, mais ne doit jamais être lue comme certaine sans
  // ce chiffre à côté.
  const uncertainTaggingPct = totalActive > 0 ? Math.round((uncertainTagging / totalActive) * 100) : 0;
  if (uncertainTagging > 0) {
    issues.push({
      rule: "lorang_categories",
      severity: "warning",
      message: `${uncertainTagging} séance(s) (${uncertainTaggingPct}%) classée(s) A/B/C/D uniquement via le préfixe-lettre du catalogId (zones et mots-clés absents) — catégorie NON certaine, vérification manuelle recommandée`,
    });
  }

  // Règle 4 : distribution globale polarisée
  const APct = pct(A), BPct = pct(B), CPct = pct(C);
  if (totalActive >= 12) {
    if (APct + BPct > LORANG_HI_INTENSITY_MAX_PCT) {
      issues.push({
        rule: "lorang_categories",
        severity: "warning",
        message: `Distribution globale ${APct + BPct}% A+B / ${CPct}% C — dépasse la cible polarisée Seiler (≤${LORANG_HI_INTENSITY_MAX_PCT}% A+B)`,
      });
    }
    if (CPct < LORANG_ENDURANCE_MIN_PCT) {
      issues.push({
        rule: "lorang_categories",
        severity: "warning",
        message: `Seulement ${CPct}% de séances C (endurance fondamentale) sur l'ensemble du plan — cible ≥ ${LORANG_ENDURANCE_MIN_PCT}%`,
      });
    }
  }

  // Score : pondère erreurs (semaine sans A|B) et distributions hors cible
  const errs = issues.filter((i) => i.severity === "error").length;
  const warns = issues.filter((i) => i.severity === "warning").length;
  let score = 100 - errs * 20 - warns * 6;
  // bonus si tagged ≥ 70%
  if (taggedPct >= 70) score = Math.min(100, score + 5);
  score = Math.max(0, Math.min(100, score));

  const distribution: LorangCategoryDistribution = {
    totalActive, tagged, taggedPct,
    A, APct, B, BPct, C, CPct, D, DPct: pct(D),
    uncertainTagging, uncertainTaggingPct,
    weeks,
  };
  return { issues, score, distribution };
}

// ═══════════════════════════════════════════════════════════════════════════════
// #18 — RÈGLES INVIOLABLE/OBLIGATOIRE SANS CONTRÔLE POST-GÉNÉRATION (lot 1+2)
// ═══════════════════════════════════════════════════════════════════════════════
// Audit méthodologique : 10 règles marquées INVIOLABLE/OBLIGATOIRE/BLOQUANTE
// dans systemPrompt.ts n'avaient aucun contrôle correspondant dans ce fichier
// — un plan pouvait les violer sans jamais faire baisser son score QA.
// Lot 1 (Rule 14-17, ci-dessous après Rule 18-21) : titre H1, unicité du
// récap stratégique, cohérence jour de repos, anti-répétition — pondérées
// dans PLAN_VALIDATION_WEIGHTS.
// Lot 2 (Rule 18-21 ci-dessous) : renfo Start-to-Run, back-to-back trail,
// ramp D+, plancher séances/jour élite. Ces 4 règles sont spécifiques à un
// objectif/une ambition — comme sportObjective/injuryRiskCompliance déjà
// dans ce fichier, elles alimentent `issues` et `summary` mais restent HORS
// du score pondéré (pas de rééquilibrage de PLAN_VALIDATION_WEIGHTS pour
// elles) : elles ne s'appliquent qu'à une minorité de plans (Start-to-Run,
// Trail Montagne/Ultra, IM/70.3 Elite+), donc les inclure au score pondéré
// global pénaliserait à tort tous les autres plans à poids constant, ou
// nécessiterait un rééquilibrage à chaque fois qu'aucune de ces règles ne
// s'applique — pas justifié pour des règles conditionnelles. Composition
// séances clés trail (5e règle du lot 2 initialement prévue) délibérément
// DIFFÉRÉE : matcher 3-5 catégories de contenu par objectif de façon fiable
// en regex aurait un taux de faux positifs trop élevé pour la confiance
// qu'on veut donner à ce score — laissé en note de suivi (cf. PR #43).

/** Rule 18 : Renforcement Fondation OBLIGATOIRE chaque semaine (Start to Run,
 *  systemPrompt.ts S2R_STRENGTH_PROGRESSION : "Chaque semaine DOIT contenir 2
 *  séances 'Renforcement fondation' (1 seule en dernière semaine)" — limiteur
 *  d'un débutant étant musculo-squelettique, ce bloc prévient la blessure. */
const S2R_STRENGTH_PATTERN = /renforcement\s*fondation|S2R_STR_FOUNDATION/i;

function validateStartToRunWeeklyStrength(
  plan: ParsedPlan,
  objective?: string,
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  if (normalizeObjectiveKey(objective || "") !== "StartToRun") return { issues, score: 100 };

  const lastWeekNumber = Math.max(...plan.weeks.map((w) => w.weekNumber));
  let weeksChecked = 0;
  let weeksOk = 0;
  for (const week of plan.weeks) {
    weeksChecked++;
    const strengthCount = week.sessions.filter(
      (s) => !s.isRest && S2R_STRENGTH_PATTERN.test(`${s.title} ${s.details} ${s.catalogId ?? ""}`),
    ).length;
    const minExpected = week.weekNumber === lastWeekNumber ? 1 : 2;
    if (strengthCount < minExpected) {
      issues.push({
        rule: "start_to_run_strength",
        severity: "error",
        week: week.weekNumber,
        message: `S${week.weekNumber}: ${strengthCount} séance(s) "Renforcement fondation" (attendu ≥${minExpected}) — OBLIGATOIRE chaque semaine pour Start to Run (prévention blessure musculo-squelettique)`,
      });
    } else {
      weeksOk++;
    }
  }
  const score = weeksChecked === 0 ? 100 : Math.round((weeksOk / weeksChecked) * 100);
  return { issues, score };
}

/** Rule 19 : Back-to-back weekend OBLIGATOIRE (Trail Montagne/Ultra, Chantier/
 *  Peak/Consolidation) — systemPrompt.ts : "Back-to-back OBLIGATOIRE en
 *  Build/Peak" / "B2B OBLIGATOIRE" (Trail Ultra). Vérifie la PRÉSENCE d'au
 *  moins un week-end Samedi+Dimanche actifs sur le bloc spécifique — pas
 *  chaque semaine (le prompt ne le demande pas non plus), ce serait trop
 *  strict pour un pattern qui revient périodiquement dans le bloc. */
function validateTrailBackToBack(
  plan: ParsedPlan,
  objective?: string,
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  const objKey = normalizeObjectiveKey(objective || "");
  if (objKey !== "TrailMountain" && objKey !== "TrailUltra") return { issues, score: 100 };

  // Chantier(2)/Consolidation(3)/Peak compressé(3.5) — le bloc "spécifique"
  // du plan trail, hors Fondation et Affûtage.
  const specificWeeks = plan.weeks.filter((w) => {
    const idx = getPhaseIndex(w.phase);
    return idx !== null && idx >= 2 && idx <= 4;
  });
  if (specificWeeks.length === 0) return { issues, score: 100 };

  const hasBackToBack = specificWeeks.some((w) => {
    const saturdayActive = w.sessions.some((s) => !s.isRest && s.dayIndex === 5);
    const sundayActive = w.sessions.some((s) => !s.isRest && s.dayIndex === 6);
    return saturdayActive && sundayActive;
  });

  if (!hasBackToBack) {
    issues.push({
      rule: "trail_back_to_back",
      severity: "warning",
      message: `Aucun week-end back-to-back (SL J1 + sortie technique J2) détecté sur le bloc spécifique — OBLIGATOIRE pour ${objKey === "TrailUltra" ? "Trail Ultra" : "Trail Montagne"} (simule la fatigue cumulée trail, cf. systemPrompt.ts)`,
    });
    return { issues, score: 50 };
  }
  return { issues, score: 100 };
}

/** Détection d'un plan format LCW (Long Course Weekend). Fix D1 (audit
 *  "génération de plan IA") : `validatePlan` ne recevait jamais le
 *  `raceFormat` authoritative (RaceGoal.raceFormat === "lcw_3day"), déjà lu
 *  par le composant appelant — la détection retombait donc toujours sur du
 *  texte libre (titre H1, thème de bloc), fragile par nature. `isLcwFormatHint`
 *  est maintenant la source primaire quand l'appelant la fournit ; le texte
 *  libre reste le repli pour les appelants qui n'ont pas ce contexte (tests,
 *  AIPlanBenchmark). */
const LCW_FORMAT_PATTERN = /\bLCW\b|long\s*course\s*weekend/i;

function isLCWFormatPlan(plan: ParsedPlan, isLcwFormatHint?: boolean | null): boolean {
  if (isLcwFormatHint != null) return isLcwFormatHint;
  if (LCW_FORMAT_PATTERN.test(plan.title || "")) return true;
  return plan.weeks.some((w) => LCW_FORMAT_PATTERN.test(`${w.theme} ${w.phase}`));
}

/** Rule : Présence des séances signature LCW — bug réel (audit PDF, coach :
 *  "la partie course à pied est très timide... ça ne correspond pas à la
 *  phase du plan"). Le prompt de génération (promptHelpers.ts, "FORMAT LONG
 *  COURSE WEEKEND (LCW)") déclare une checklist explicitement "bloquante"
 *  avant de finaliser un plan LCW : `B_LCW_BIKE_LONG_RACE_SAT` +
 *  `B_LCW_RUN_OFF_LEGS_SUN` consécutifs (≥1 weekend Build, ≥2 weekends Peak)
 *  et `B_LCW_BACK_TO_BACK_PEAK` (1x, Peak J-21 à J-28) — mais RIEN en aval ne
 *  vérifie réellement cette checklist, elle n'est que DEMANDÉE au LLM. Sur un
 *  plan LCW confirmé réellement généré (diagnostic "athlète confirmé
 *  préparant un format LCW 3 jours", bloc "Race-Specific LCW"), aucune de ces
 *  trois fiches n'apparaît nulle part dans les 7 semaines — c'est la cause
 *  racine du symptôme observé : `B_LCW_RUN_OFF_LEGS_SUN` (course sur jambes
 *  fatiguées post-vélo veille) est justement LE stimulus spécifique course du
 *  bloc LCW, et son absence pure et simple se lit comme "course timide",
 *  pas comme un manque de variété. */
function validateLcwSignaturePresence(
  plan: ParsedPlan,
  isLcwFormatHint?: boolean | null,
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  if (!isLCWFormatPlan(plan, isLcwFormatHint)) return { issues, score: 100 };

  const REQUIRED_IDS: Array<{ id: string; label: string }> = [
    { id: "B_LCW_BIKE_LONG_RACE_SAT", label: "long ride race-pace samedi (B_LCW_BIKE_LONG_RACE_SAT)" },
    { id: "B_LCW_RUN_OFF_LEGS_SUN", label: "long run sur jambes fatiguées dimanche (B_LCW_RUN_OFF_LEGS_SUN)" },
    { id: "B_LCW_BACK_TO_BACK_PEAK", label: "simulation complète week-end Peak (B_LCW_BACK_TO_BACK_PEAK)" },
  ];

  const presentIds = new Set<string>();
  for (const week of plan.weeks) {
    for (const s of week.sessions) {
      if (s.isRest) continue;
      const id = extractCatalogId(s.title, s.details, s.catalogId)?.toUpperCase();
      if (id) presentIds.add(id);
    }
  }

  const missing = REQUIRED_IDS.filter((r) => !presentIds.has(r.id));
  if (missing.length > 0) {
    issues.push({
      rule: "lcw_signature_missing",
      severity: "error",
      message: `Plan LCW (Long Course Weekend) sans le(s) week-end(s) signature déclaré(s) "bloquant(s)" par le prompt de génération : ${missing.map((m) => m.label).join(", ")} — absent(s) des ${plan.weeks.length} semaines du plan.`,
    });
    return { issues, score: 0 };
  }
  return { issues, score: 100 };
}

/** Fiches dont le catalogue restreint EXPLICITEMENT le placement au jour de
 *  course lui-même ("Matin compétition (J)") ou à la veille de course
 *  ("Veille de course") — des rituels de jour J, jamais du contenu hebdo
 *  générique. */
const RACE_DAY_ONLY_PATTERN = /matin\s*comp[ée]tition|jour\s*j\b|veille\s*de\s*course/i;

/** Rule : Placement d'une fiche "jour J uniquement" hors semaine de course —
 *  bug réel (audit PDF, coach : "à partir de S5, aucune intensité, aucun
 *  travail spécifique"). Deux fiches conçues comme rituels de jour de course
 *  se sont retrouvées utilisées comme contenu hebdomadaire ordinaire :
 *  `D_PRE_RACE_ACTIVATION_RUN` (`when`="Matin compétition (J)") placée un
 *  MARDI ordinaire de S5, 2 semaines avant la course, et
 *  `ENR_TAPER_SHAKEOUT_RUN` (`when`="Veille de course") placée un JEUDI de
 *  S6, 8 jours avant la course. Aucun contrôle existant ne détectait ce
 *  sens-là : `checkB11`/`flagsFor` (checksB10B11.ts) vérifie uniquement
 *  qu'une fiche N'EST PAS exclue de la race-week (ex: fiches interdites en
 *  taper) — jamais qu'une fiche réservée au jour J y est CONFINÉE. Ces
 *  fiches "jour J" étant très courtes et peu spécifiques par nature
 *  (activation/shakeout — 10-25min, Z1), leur utilisation répétée comme
 *  contenu de semaine ordinaire produit exactement le symptôme observé :
 *  une semaine qui semble n'être que de la récupération/activation, sans
 *  travail spécifique, alors que le vrai travail spécifique (LCW, Sweet
 *  Spot…) est noyé au milieu de ce remplissage. */
function validateRaceDayOnlyFichePlacement(plan: ParsedPlan): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  const catalogById = getCatalogById();
  let misplaced = 0;

  for (const week of plan.weeks) {
    if (weekHasRaceDay(week)) continue; // semaine de course elle-même : placement légitime
    for (const s of week.sessions) {
      if (s.isRest) continue;
      const rawId = extractCatalogId(s.title, s.details, s.catalogId);
      if (!rawId) continue;
      const id = rawId.toUpperCase();
      const entry = catalogById.get(id);
      if (!entry || !RACE_DAY_ONLY_PATTERN.test(entry.when || "")) continue;
      misplaced++;
      issues.push({
        rule: "race_day_only_fiche_misplaced",
        severity: "error",
        week: week.weekNumber,
        message: `S${week.weekNumber} ${s.dayName}: "${entry.objectif}" (${id}) — fiche réservée au jour de course ou à la veille ("${entry.when}"), utilisée hors semaine de course`,
      });
    }
  }

  const score = misplaced === 0 ? 100 : Math.max(0, 100 - misplaced * 20);
  return { issues, score };
}

/** Rule 20 : D+ (dénivelé) chiffré OBLIGATOIRE pour trail (systemPrompt.ts,
 *  "RÈGLES D+ — OBLIGATOIRE POUR TRAIL" : "CHAQUE séance trail doit
 *  mentionner le D+ cible"). Vérifie la présence d'un D+ chiffré sur les
 *  séances CAP/Trail — la progression hebdomadaire chiffrée n'est PAS
 *  vérifiée ici (nécessiterait un seuil de tolérance arbitraire sur une
 *  extraction texte forcément approximative — trop de faux positifs pour la
 *  confiance qu'on veut donner à ce score). */
const DPLUS_MENTION_PATTERN = /D\+|dénivelé|\bDplus\b/i;

function validateTrailDPlusPresence(
  plan: ParsedPlan,
  objective?: string,
): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  const objKey = normalizeObjectiveKey(objective || "");
  const isTrailObjective = objKey === "TrailShort" || objKey === "TrailMountain" || objKey === "TrailUltra" || objKey === "Trail";
  if (!isTrailObjective) return { issues, score: 100 };

  let trailSessions = 0;
  let missingDPlus = 0;
  for (const week of plan.weeks) {
    for (const s of week.sessions) {
      if (s.isRest) continue;
      if (normalizeSport(s.sport) !== "Course") continue;
      trailSessions++;
      if (!DPLUS_MENTION_PATTERN.test(`${s.title} ${s.details}`)) {
        missingDPlus++;
      }
    }
  }
  if (trailSessions === 0) return { issues, score: 100 };

  const missingPct = missingDPlus / trailSessions;
  if (missingPct > 0.3) {
    issues.push({
      rule: "trail_dplus_presence",
      severity: missingPct > 0.6 ? "warning" : "info",
      message: `${missingDPlus}/${trailSessions} séances CAP/Trail sans D+ chiffré — chaque séance trail doit mentionner le D+ cible (OBLIGATOIRE, systemPrompt.ts)`,
    });
  }
  const score = Math.max(0, Math.round((1 - missingPct) * 100));
  return { issues, score };
}

/** Rule 21 : Plancher séances/jour Elite+ — DÉSACTIVÉE (décision coach,
 *  revue du premier plan réel B-10K-TO-70.3, 2026-10-21).
 *
 *  Cette règle flaguait en "ERREUR GRAVE" tout jour (hors repos) n'ayant
 *  qu'1 séance pour World Class/Elite/Competitor IM/70.3, au nom d'un
 *  plancher "2-3 séances/jour OBLIGATOIRE" (systemPrompt.ts /
 *  promptHelpers.ts). Décision explicite du coach : 1 ou 2 séances/jour
 *  restent des choix sportifs légitimes ; l'ambition elite ne doit JAMAIS
 *  imposer artificiellement une séance supplémentaire — ni en génération
 *  (cf. jsonPlanHandler.ts::applyDailySessionFloorEnforcement, même
 *  décision, même date), ni en validation après coup. Conservée en no-op
 *  (plutôt que supprimée) pour garder la trace de la règle et permettre
 *  une réactivation future si la doctrine change à nouveau. `objective`/
 *  `ambition` restent acceptés pour ne pas changer la signature appelante. */
function validateDailySessionFloor(
  _plan: ParsedPlan,
  _objective?: string,
  _ambition?: string,
): { issues: ValidationIssue[]; score: number } {
  return { issues: [], score: 100 };
}

/** Rule 14 : Titre H1 (systemPrompt.ts "RÈGLE #0 — BLOQUANTE").
 *  Gabarit : "Plan TFCL™ — <FORMAT_COURSE> <NOM_ATHLETE> — <N> semaines" — le
 *  "#" de tête est déjà retiré par le parser (aiPlanParser.ts). Le milieu doit
 *  contenir au moins 2 tokens (format course + nom athlète) : un titre du
 *  type "Plan TFCL™ — 70.3 — 12 semaines" (nom athlète omis, cf. exemple
 *  INTERDIT explicite du prompt) ne doit pas passer.
 */
const H1_TITLE_PATTERN = /^Plan TFCL™ — \S+(?:\s+\S+)+ — \d+\s*semaines?$/u;

function validateTitleFormat(plan: ParsedPlan): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  const title = (plan.title || "").trim();
  if (!title) {
    issues.push({
      rule: "title_format",
      severity: "warning",
      message: `Titre H1 absent — attendu "Plan TFCL™ — <format course> <nom athlète> — <N> semaines"`,
    });
    return { issues, score: 50 };
  }
  if (!H1_TITLE_PATTERN.test(title)) {
    issues.push({
      rule: "title_format",
      severity: "error",
      message: `Titre H1 non conforme au gabarit RÈGLE #0 : "${title}"`,
      detail: `Attendu "Plan TFCL™ — <FORMAT_COURSE> <NOM_ATHLETE> — <N> semaines" (nom athlète et nombre de semaines requis, jamais un slogan comme "Structure Qualifiable").`,
    });
    return { issues, score: 30 };
  }
  return { issues, score: 100 };
}

/** Rule 15 : Unicité du Récapitulatif Stratégique (systemPrompt.ts, "bloquante").
 *  Deux signaux structurels d'une table dupliquée : (a) un même "Bloc N"
 *  apparaît plusieurs fois parmi les phases parsées, (b) la numérotation "#"
 *  du récap (StrategicLimiter.rank) n'est pas strictement croissante/continue
 *  depuis 1 — signe classique d'un redémarrage à 1 en milieu de table. */
function validateStrategicRecapUniqueness(plan: ParsedPlan): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  let score = 100;

  const blocNumbers = plan.phases
    .map((p) => p.name.match(/^Bloc\s+(\d+)/i)?.[1])
    .filter((n): n is string => !!n);
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const n of blocNumbers) {
    if (seen.has(n)) duplicated.add(n);
    seen.add(n);
  }
  if (duplicated.size > 0) {
    issues.push({
      rule: "strategic_recap",
      severity: "error",
      message: `Bloc ${[...duplicated].join(", ")} apparaît plusieurs fois dans le plan — signe de deux tables/sections dupliquées`,
      detail: `Chaque "Bloc N" doit apparaître une seule fois (table ET corps du plan) — fusionner en une seule structure cohérente.`,
    });
    score -= 30;
  }

  // Audit — le préfixe "Bloc N" ci-dessus est une convention Markdown legacy
  // (systemPromptJSON.ts:41 la liste explicitement parmi les règles de
  // format ANNULÉES en mode JSON — chemin de prod par défaut) : sur ce
  // chemin, `phases[].name` est un texte libre sans ce préfixe, donc le
  // contrôle ci-dessus est inerte. Détection complémentaire, indépendante du
  // format : un même nom de phase (normalisé) répété plusieurs fois est en
  // soi un signe de doublon, quel que soit le vocabulaire utilisé.
  const seenNames = new Set<string>();
  const duplicatedNames = new Set<string>();
  for (const p of plan.phases) {
    const key = p.name.trim().toLowerCase();
    if (!key) continue;
    if (seenNames.has(key)) duplicatedNames.add(p.name);
    seenNames.add(key);
  }
  if (duplicatedNames.size > 0) {
    issues.push({
      rule: "strategic_recap",
      severity: "error",
      message: `Phase "${[...duplicatedNames].join(", ")}" apparaît plusieurs fois dans le plan (bloc "Phases") — signe de doublon`,
      detail: `Chaque phase doit apparaître une seule fois dans la structure du plan.`,
    });
    score -= 30;
  }

  const ranks = plan.strategicRecap?.limiters.map((l) => l.rank) ?? [];
  for (let i = 0; i < ranks.length; i++) {
    if (ranks[i] !== i + 1) {
      issues.push({
        rule: "strategic_recap",
        severity: "warning",
        message: `Numérotation du Récapitulatif Stratégique non continue (rang ${ranks[i]} en position ${i + 1}) — signe possible d'une deuxième table collée`,
      });
      score -= 15;
      break;
    }
  }

  return { issues, score: Math.max(0, score) };
}

/** Rule 16 : Cohérence jour de repos (systemPrompt.ts "RÈGLE REPOS — COHÉRENCE
 *  ABSOLUE" : "Un jour Repos est COMPLET. Récupération active (vélo Z1 30min)
 *  n'est pas un jour repos. 1 jour repos complet/semaine min.").
 *  Note : le parser (isRestSession, aiPlanParser.ts) classe déjà "récupération"
 *  comme isRest=true — ce contrôle rattrape donc aussi les séances de récup
 *  active mal étiquetées "Repos" en amont, pas seulement une régression du
 *  validateur. */
// Audit "B-5K-BEGINNER round 2" (JSON réel) : 4 faux positifs démontrés sur
// ce contrôle —
//  1. "renfo"/"muscul" sans frontière de mot matchaient à l'intérieur d'un
//     mot plus long non lié ("neuromusculaire") → \b ajouté.
//  2. "course\b" matchait "veille de course"/"jour de course" (l'ÉVÉNEMENT
//     course, pas une séance de course à pied) → exclu par lookbehind
//     ciblé, sans toucher aux vraies séances ("30 min de course").
//  3. Négation ignorée : "Journée sans entraînement cardio ni
//     renforcement." matchait "renfo" malgré la négation explicite
//     ("sans...ni") → cf. hasNonNegatedActiveContent ci-dessous.
// Ne modifie aucune règle physiologique — uniquement la détection de ce
// contrôle de cohérence texte, pour arrêter de signaler du contenu qui
// n'existe pas.
const ACTIVE_CONTENT_IN_REST_PATTERN = /z[1-7]\b|vélo|natation|course\b|\brenfo|\bmuscu(?:lation)?\b|\d+\s*(?:min|km|w)\b|ftp/i;

const NEGATION_BEFORE_ACTIVE_CONTENT_RX = /\b(?:sans|aucun(?:e)?|ni|pas de|pas d['’])\b/i;

/** Vrai si AU MOINS UNE occurrence du pattern n'est pas précédée, dans la
 *  même clause (bornée par . ; ! ?), d'un marqueur de négation ("sans",
 *  "ni", "aucun", "pas de"). Une seule occurrence négative ("sans... ni
 *  renforcement") ne doit pas flaguer le jour "Repos". */
function hasNonNegatedActiveContent(text: string): boolean {
  // Préparation logistique / calendrier de course, sans prescription sportive.
  text = text.replace(/\b(?:veille|jour|semaine|affaires)\s+de\s+course\b/gi, "");
  const rx = new RegExp(ACTIVE_CONTENT_IN_REST_PATTERN.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text)) !== null) {
    const before = text.slice(0, m.index);
    const clauseStart = Math.max(before.lastIndexOf("."), before.lastIndexOf(";"), before.lastIndexOf("!"), before.lastIndexOf("?"));
    const clause = text.slice(clauseStart + 1, m.index);
    if (!NEGATION_BEFORE_ACTIVE_CONTENT_RX.test(clause)) return true;
    if (m.index === rx.lastIndex) rx.lastIndex++; // garde-fou match vide
  }
  return false;
}

function validateRestDayCoherence(plan: ParsedPlan): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  let flaggedActive = 0;
  let totalRestSessions = 0;
  let weeksWithNoFullRestDay = 0;
  let weeksChecked = 0;

  for (const week of plan.weeks) {
    // Semaines trop courtes (course, décharge minimaliste) exemptées du
    // minimum 1 repos/semaine — pas assez de jours pour que ça soit un signal.
    if (week.sessions.length < 4) continue;
    weeksChecked++;

    let hasFullRestDay = false;
    for (const s of week.sessions) {
      if (!s.isRest) continue;
      totalRestSessions++;
      const text = `${s.title} ${s.details}`.trim();
      if (text && hasNonNegatedActiveContent(text)) {
        flaggedActive++;
        issues.push({
          rule: "rest_day_coherence",
          severity: "warning",
          week: week.weekNumber,
          message: `S${week.weekNumber} ${s.dayName}: jour "Repos" contient du contenu actif ("${s.title}") — un jour repos complet n'a aucun contenu, la récupération active n'en est pas un`,
        });
      } else {
        hasFullRestDay = true;
      }
    }
    if (!hasFullRestDay) weeksWithNoFullRestDay++;
  }

  if (weeksWithNoFullRestDay > 0) {
    issues.push({
      rule: "rest_day_coherence",
      severity: "warning",
      message: `${weeksWithNoFullRestDay}/${weeksChecked} semaine(s) sans aucun jour repos complet réel — minimum 1/semaine attendu`,
    });
  }

  const restDayScore = weeksChecked === 0 ? 100 : Math.max(0, 100 - Math.round((weeksWithNoFullRestDay / weeksChecked) * 60));
  const activeContentScore = totalRestSessions === 0 ? 100 : Math.max(0, 100 - Math.round((flaggedActive / totalRestSessions) * 100));
  const score = Math.round((restDayScore + activeContentScore) / 2);
  return { issues, score };
}

/** Rule 17 : Anti-Répétition (systemPrompt.ts "DIVERSITÉ ET PROGRESSION DES
 *  SÉANCES — CRITIQUE" : "Règle #1 : JAMAIS la même séance 2 semaines
 *  consécutives."). Comparaison au même jour de la semaine, titre normalisé
 *  (emoji/casse ignorés) — volontairement strict (titre identique) plutôt que
 *  flou (similarité de contenu), pour éviter les faux positifs sur des
 *  séances simplement du même TYPE. Semaines décharge/course exemptées : un
 *  rappel identique y est attendu, pas une répétition non désirée. */
function normalizeSessionTitleForRepetitionCheck(title: string): string {
  return title.toLowerCase().replace(/[🔑🏁]/g, "").trim();
}

/** Catalogue plein (id → fiche), indexé une seule fois — utilisé par le
 *  contrôle de duplication INTRA-semaine ci-dessous (cf. isOneTimeTestProtocol
 *  / parseWeeklyFrequencyCap). */
let catalogByIdCache: Map<string, LibraryWorkout> | null = null;
function getCatalogById(): Map<string, LibraryWorkout> {
  if (!catalogByIdCache) {
    catalogByIdCache = new Map();
    for (const w of WorkoutLibrary) catalogByIdCache.set(w.id.toUpperCase(), w);
  }
  return catalogByIdCache;
}

/** Une fiche tagguée "test" est un protocole de calibration/évaluation
 *  (FTP, VMA, CSS, FatMax zone finder, lactate…) : par nature à usage unique,
 *  jamais une séance d'entraînement répétable dans la même semaine. */
function isOneTimeTestProtocol(entry: LibraryWorkout): boolean {
  return (entry.tags || []).some((t) => String(t).toLowerCase() === "test");
}

/** Extrait un plafond hebdomadaire explicite du champ `when` de la fiche
 *  (ex: "Base/Build, 1x/semaine max") — cf. bug réel : SFR (V3_BIKE_FORCE_SFR,
 *  "1x/semaine max") généré 2x dans la même semaine, plafond jamais vérifié. */
function parseWeeklyFrequencyCap(when: string | undefined | null): number | null {
  if (!when) return null;
  const match = /(\d+)\s*x\s*\/\s*semaine\s*max/i.exec(when);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Rule 17bis : Duplication INTRA-semaine (bug réel audit PDF — test FatMax
 *  identique 3x dans S2, SFR "1x/semaine max" généré 2x dans S1). Distinct du
 *  contrôle inter-semaines ci-dessus (Rule 17) : compare les occurrences d'une
 *  même fiche catalogue AU SEIN d'une seule semaine, pas d'une semaine à
 *  l'autre — un axe de répétition que Rule 17 ne couvre pas. Volontairement
 *  restreint aux fiches dont le catalogue documente explicitement une
 *  contrainte de fréquence (tag "test" = usage unique, ou `when` "Nx/semaine
 *  max"), pour éviter les faux positifs sur des séances génériques (EF,
 *  récupération) légitimement répétées plusieurs fois par semaine.
 *  Alimente le même compteur repeated/checked que Rule 17 (même score
 *  "antiRepetitionScore", pas de nouveau poids à financer). */
function validateIntraWeekFrequencyCaps(
  plan: ParsedPlan,
): { issues: ValidationIssue[]; repeated: number; checked: number } {
  const issues: ValidationIssue[] = [];
  const catalogById = getCatalogById();
  let repeated = 0;
  let checked = 0;

  for (const week of plan.weeks) {
    const occurrences = new Map<string, ParsedSession[]>();
    for (const s of week.sessions) {
      if (s.isRest) continue;
      const rawId = extractCatalogId(s.title, s.details, s.catalogId);
      if (!rawId) continue;
      const id = rawId.toUpperCase();
      if (!catalogById.has(id)) continue;
      const list = occurrences.get(id) ?? [];
      list.push(s);
      occurrences.set(id, list);
    }

    for (const [id, sessions] of occurrences) {
      if (sessions.length < 2) continue;
      const entry = catalogById.get(id)!;
      checked++;
      const days = sessions.map((s) => s.dayName).join(", ");

      if (isOneTimeTestProtocol(entry)) {
        repeated++;
        issues.push({
          rule: "anti_repetition",
          severity: "warning",
          week: week.weekNumber,
          message: `S${week.weekNumber}: "${entry.objectif}" (${id}) — protocole de test/calibration à usage unique, généré ${sessions.length}x dans la même semaine (${days})`,
        });
        continue;
      }

      const cap = parseWeeklyFrequencyCap(entry.when);
      if (cap !== null && sessions.length > cap) {
        repeated++;
        issues.push({
          rule: "anti_repetition",
          severity: "warning",
          week: week.weekNumber,
          message: `S${week.weekNumber}: "${entry.objectif}" (${id}) — fiche limitée à ${cap}x/semaine max, générée ${sessions.length}x (${days})`,
        });
      }
    }
  }

  return { issues, repeated, checked };
}

/** Fiches catalogue documentant explicitement une progression D'UNE SEMAINE
 *  À L'AUTRE (ex: LYDIARD_RUN_AEROBIC_BASE_LONG, `when` = "Volume progressif
 *  sur 16-24 semaines") — distinct d'une progression INTRA-séance (ex: un
 *  bloc SST "3x20' progressif" dont la puissance grimpe pendant LA séance
 *  elle-même, sans rapport avec les semaines). Le motif exige "sur N
 *  semaines" pour ne cibler que le premier type. */
const WEEKLY_PROGRESSION_PATTERN = /progressi[fv]e?\s+sur\s+\d+/i;

function isDeclaredWeeklyProgressivePillar(entry: LibraryWorkout): boolean {
  return WEEKLY_PROGRESSION_PATTERN.test(entry.when || "");
}

/** Rule 4bis : Stagnation d'un pilier hebdomadaire déclaré progressif — bug
 *  réel (audit PDF, coach) : la sortie longue Base aérobie Lydiard a été
 *  générée avec EXACTEMENT la même durée (1h45) en S1 et S2, alors que sa
 *  propre fiche affirme noir sur blanc "La DURÉE augmente, pas l'intensité"
 *  et documente une table de progression explicite. La Règle #4 Progression
 *  (validateProgression) ne voit que le VOLUME TOTAL de la semaine (toutes
 *  séances confondues) — une fiche-pilier figée peut s'y noyer si d'autres
 *  séances de la même semaine compensent en durée. Ce contrôle compare
 *  directement les occurrences successives d'UNE MÊME fiche déclarée
 *  progressive : si la durée ne progresse pas (stagne ou diminue) d'une
 *  occurrence à l'autre, c'est un signal direct que l'IA n'a pas suivi sa
 *  propre consigne de progression — indépendamment du volume hebdo global.
 *  Alimente le même score "progression" (Rule 4), pas de nouveau poids. */
function validatePillarProgressionStagnation(
  plan: ParsedPlan,
): { issues: ValidationIssue[]; stagnant: number; checked: number } {
  const issues: ValidationIssue[] = [];
  const catalogById = getCatalogById();
  let stagnant = 0;
  let checked = 0;

  const occurrencesById = new Map<string, { week: number; durationMin: number | null }[]>();
  for (const week of plan.weeks) {
    for (const s of week.sessions) {
      if (s.isRest) continue;
      const rawId = extractCatalogId(s.title, s.details, s.catalogId);
      if (!rawId) continue;
      const id = rawId.toUpperCase();
      const entry = catalogById.get(id);
      if (!entry || !isDeclaredWeeklyProgressivePillar(entry)) continue;
      const list = occurrencesById.get(id) ?? [];
      list.push({ week: week.weekNumber, durationMin: parseSessionDurationMin(s) });
      occurrencesById.set(id, list);
    }
  }

  for (const [id, occurrences] of occurrencesById) {
    if (occurrences.length < 2) continue;
    occurrences.sort((a, b) => a.week - b.week);
    const entry = catalogById.get(id)!;
    for (let i = 1; i < occurrences.length; i++) {
      const prev = occurrences[i - 1];
      const curr = occurrences[i];
      if (prev.durationMin === null || curr.durationMin === null) continue;
      checked++;
      if (curr.durationMin <= prev.durationMin) {
        stagnant++;
        issues.push({
          rule: "progression",
          severity: "warning",
          week: curr.week,
          message: `S${curr.week}: "${entry.objectif}" (${id}) — fiche déclarée progressive d'une semaine à l'autre ("${entry.when}"), mais la durée n'a pas progressé depuis S${prev.week} (${prev.durationMin}min → ${curr.durationMin}min)`,
        });
      }
    }
  }

  return { issues, stagnant, checked };
}

function validateAntiRepetition(plan: ParsedPlan): { issues: ValidationIssue[]; score: number } {
  const issues: ValidationIssue[] = [];
  const weeksByNumber = new Map<number, ParsedWeek>();
  for (const w of plan.weeks) weeksByNumber.set(w.weekNumber, w);

  let repeated = 0;
  let checked = 0;

  for (const week of plan.weeks) {
    const themeText = `${week.theme} ${week.phase}`.toLowerCase();
    if (DELOAD_PATTERNS.test(themeText) || weekHasRaceDay(week)) continue;
    const prev = weeksByNumber.get(week.weekNumber - 1);
    if (!prev) continue;
    const prevThemeText = `${prev.theme} ${prev.phase}`.toLowerCase();
    if (DELOAD_PATTERNS.test(prevThemeText) || weekHasRaceDay(prev)) continue;

    for (const s of week.sessions) {
      if (s.isRest) continue;
      const prevSame = prev.sessions.find((p) => !p.isRest && p.dayIndex === s.dayIndex);
      if (!prevSame) continue;
      const norm = normalizeSessionTitleForRepetitionCheck(s.title);
      checked++;
      if (norm.length > 0 && norm === normalizeSessionTitleForRepetitionCheck(prevSame.title)) {
        repeated++;
        issues.push({
          rule: "anti_repetition",
          severity: "warning",
          week: week.weekNumber,
          message: `S${week.weekNumber} ${s.dayName}: "${s.title}" identique à la séance de S${week.weekNumber - 1} — varier format/durée/intensité (Règle #1 Anti-Répétition)`,
        });
      }
    }
  }

  const intraWeek = validateIntraWeekFrequencyCaps(plan);
  issues.push(...intraWeek.issues);
  repeated += intraWeek.repeated;
  checked += intraWeek.checked;

  const score = checked === 0 ? 100 : Math.max(0, 100 - Math.round((repeated / checked) * 100));
  return { issues, score };
}

/** Poids du score pondéré (17 rules) — module-level pour être testable
 *  directement (somme attendue = 1.00, cf. __tests__/planValidator.test.ts
 *  "la somme des poids reste 1.00") sans dépendre d'un plan fixture
 *  "parfait" sur les 17 dimensions à la fois. */
export const PLAN_VALIDATION_WEIGHTS = {
  polarization: 0.09,
  loadPattern: 0.07,
  keySessions: 0.07,
  progression: 0.04,
  sportRatio: 0.04,
  catalogRatio: 0.03,
  prohibitionCompliance: 0.14,
  phaseCoherence: 0.08,
  raceDayPresence: 0.06,
  limiterCoherence: 0.10,
  wbalFeasibility: 0.10,
  sessionDensity: 0.02,
  lorangCategories: 0.03,
  titleFormat: 0.03,
  strategicRecapUniqueness: 0.03,
  restDayCoherence: 0.03,
  antiRepetition: 0.04,
} as const;

export function validatePlan(
  plan: ParsedPlan,
  objective?: string,
  prohibitions?: string[],
  raceWeekNumbers?: number[],
  identifiedLimiters?: string[],
  identifiedLimiterKeys?: string[],
  athleteData?: PlanAthleteData,
  coachLimiterOrder?: string[],
  sessionDensity?: SessionDensityConfig,
  injuryRisk?: { run?: { level: string }; bike?: { level: string } },
  /** #18 lot 2 : clé interne ("world_class"/"elite"/"competitor"/"age_group"/
   *  "finisher", cf. ambitionLevel.ts) — nécessaire au plancher séances/jour
   *  Elite+ (validateDailySessionFloor), absente des paramètres précédents.
   *
   *  Correction sprint qualité Marathon/Ironman (oct. 2026), #D (demande
   *  coach explicite) : DOIT être l'ambition EFFECTIVE — celle RÉELLEMENT
   *  utilisée pour générer ce plan, après déclassement éventuel par
   *  `computeAmbitionEffective` (ambitionDowngrade.ts) — JAMAIS l'ambition
   *  brute initialement demandée par le coach. Un appelant qui passerait
   *  encore l'ambition brute ici ferait juger le plan (séances-clés,
   *  plancher séances/jour, catégories Lorang) sur un niveau différent de
   *  celui réellement généré, produisant de fausses alertes sur un
   *  déclassement pourtant justifié. Pour conserver l'ambition brute à des
   *  fins de traçabilité/affichage, utiliser `ambitionAudit` ci-dessous —
   *  jamais ce paramètre. */
  ambition?: string,
  /** Champ libre "Contraintes" de l'athlète (PlanConfig.constraints) — permet
   *  à validateSportRatio de détecter une discipline bannie par le coach et
   *  de ne pas la traiter comme un défaut de génération (voir
   *  redistributeTargetsForBannedSports ci-dessus). */
  constraintsText?: string,
  /** Fix D1 (audit "génération de plan IA") : signal authoritative
   *  RaceGoal.raceFormat === "lcw_3day", calculé par l'appelant — prime sur
   *  la détection par texte libre (titre/thème) dans isLCWFormatPlan. */
  isLcwFormatHint?: boolean | null,
  /** Override coach explicite du cycle de décharge (PlanConfig.deload
   *  CadenceWeeks, UI plan config) : 3 = 2:1, 4 = 3:1. Prime sur l'auto-
   *  détection par âge dans extractWeekMetrics/inferWeekType. */
  deloadCadenceWeeks?: 3 | 4 | null,
  /**
   * P1 (audit "B-5K-BEGINNER round 2") : signal de niveau RÉEL de
   * l'athlète (PlanConfig.ambitionMeta.trainingLevel/trainingLevelSource),
   * distinct de `ambition` (objectif visé) — pilote exclusivement
   * validateDemandingSessionAccumulation ci-dessus. `null`/absent = contrôle
   * inactif (comportement legacy inchangé), jamais un plafond déduit par défaut.
   */
  trainingLevelSignal?: TrainingLevelSignal | null,
  /**
   * Correction sprint qualité Marathon/Ironman (oct. 2026), #B : objectifs
   * datés du plan (même forme que `ClassifiableRaceGoal`, déjà utilisée par
   * `multiObjectiveClassification.ts` pour la frise stratégique) — pilote
   * exclusivement `validateMilestoneTransition` (jalon run-only dans un
   * plan triathlon, ex. 10K → 70.3). Omis = contrôle inactif (comportement
   * inchangé pour tout appelant qui ne les fournit pas encore).
   */
  raceGoals?: ClassifiableRaceGoal[],
  /** Date de début du plan (ISO "YYYY-MM-DD") — nécessaire à `validateMilestoneTransition`
   *  pour convertir les dates de `raceGoals` en numéros de semaine. */
  planStartDate?: string,
  /**
   * Correction sprint qualité Marathon/Ironman (oct. 2026), #C : charge
   * habituelle/disponibilité maximale déclarées par le coach — pilote
   * exclusivement `validateWeeklyLoadConsistency`. Omis = contrôle inactif
   * (comportement inchangé pour tout appelant qui ne les fournit pas
   * encore).
   */
  loadContext?: WeeklyLoadContext | null,
  /**
   * Correction sprint qualité Marathon/Ironman (oct. 2026), #D : trace
   * l'ambition brute demandée par le coach ET le déclassement éventuel vers
   * l'ambition effective (passée dans `ambition` ci-dessus) — pilote
   * exclusivement `validateAmbitionCoherence` (issue purement informative,
   * jamais un score). Omis = contrôle inactif (comportement inchangé pour
   * tout appelant qui ne le fournit pas encore).
   */
  ambitionAudit?: AmbitionAudit | null,
  /**
   * GRAND SPRINT P0, Sprint 6 ("décisions du coach"), 2026-10-23 : nombre
   * de séances de renforcement/PPG EXACTEMENT demandées par semaine
   * (PlanConfig.strengthSessionsPerWeek, UI "Renforcement/sem", 0-3) —
   * transmis au prompt système ("Inclure EXACTEMENT N séance(s) de
   * renforcement... par semaine") mais jusqu'ici jamais vérifié sur le plan
   * réellement généré. Pilote exclusivement `validateStrengthSessionsRequested`.
   * Omis/`null` = contrôle inactif (comportement inchangé pour tout
   * appelant qui ne le fournit pas encore) — jamais un signal fabriqué en
   * l'absence de cette donnée du contrat.
   */
  strengthSessionsPerWeek?: number | null,
): PlanValidationResult {
  // F-14: defensive re-sort of identifiedLimiterKeys by coach override.
  // Upstream callers (deriveLimiterKeysFromGapAnalysis) usually already pass them
  // sorted, but if a caller forgets, this guarantees L1/L2 in validateLimiterCoherence
  // match the coach's manual order.
  let effectiveLimiterKeys = identifiedLimiterKeys;
  if (coachLimiterOrder && coachLimiterOrder.length > 0 && identifiedLimiterKeys && identifiedLimiterKeys.length > 0) {
    const coachKeyOrder = coachLimiterOrder
      .map((m) => detectLimiterKeyFromMetric(m))
      .filter((k): k is string => !!k);
    effectiveLimiterKeys = [...identifiedLimiterKeys].sort((a, b) => {
      const idxA = coachKeyOrder.indexOf(a);
      const idxB = coachKeyOrder.indexOf(b);
      const posA = idxA >= 0 ? idxA : 999;
      const posB = idxB >= 0 ? idxB : 999;
      return posA - posB;
    });
  }

  // Extract metrics for each week
  const weekMetrics = plan.weeks.map((w) => extractWeekMetrics(w, plan.totalWeeks, objective, athleteData?.age, deloadCadenceWeeks));

  // Run all validation rules
  const polarizationBase = validatePolarization(weekMetrics);
  const hardDayDensity = validateWeeklyHardDayDensity(plan);
  const raceSpecificSportGap = validateRaceSpecificSportGap(plan);
  const demandingAccumulation = validateDemandingSessionAccumulation(plan, trainingLevelSignal);
  const recoveryWeekIntensity = validateRecoveryWeekIntensity(plan, weekMetrics);
  const polarization = {
    issues: [...polarizationBase.issues, ...hardDayDensity.issues, ...raceSpecificSportGap.issues, ...demandingAccumulation.issues, ...recoveryWeekIntensity.issues],
    score: Math.round((polarizationBase.score + hardDayDensity.score + raceSpecificSportGap.score + demandingAccumulation.score + recoveryWeekIntensity.score) / 5),
  };
  const loadPattern = validateLoadPattern(weekMetrics);
  const keySessions = validateKeySessions(weekMetrics, objective, ambition);
  const progressionBase = validateProgression(weekMetrics);
  const pillarStagnation = validatePillarProgressionStagnation(plan);
  const longSessionProgression = validateLongSessionProgression(weekMetrics, objective);
  const taperVolumeReduction = validateTaperVolumeReduction(weekMetrics);
  const milestoneTransition = validateMilestoneTransition(weekMetrics, plan.totalWeeks, objective, raceGoals, planStartDate);
  const weeklyLoadConsistency = validateWeeklyLoadConsistency(weekMetrics, loadContext);
  const loadHistoryCoherence = validateLoadHistoryCoherence(weekMetrics, plan.totalWeeks, loadContext);
  const progression = {
    issues: [
      ...progressionBase.issues, ...pillarStagnation.issues, ...longSessionProgression.issues,
      ...taperVolumeReduction.issues, ...milestoneTransition.issues, ...weeklyLoadConsistency.issues,
      ...loadHistoryCoherence.issues,
    ],
    score: Math.min(
      pillarStagnation.stagnant > 0
        ? Math.max(0, progressionBase.score - Math.min(30, pillarStagnation.stagnant * 15))
        : progressionBase.score,
      longSessionProgression.score,
      taperVolumeReduction.score,
      milestoneTransition.score,
      weeklyLoadConsistency.score,
      loadHistoryCoherence.score,
    ),
  };
  const sportRatio = validateSportRatio(weekMetrics, objective, constraintsText);
  const catalogRatioBase = validateCatalogRatio(plan);
  const overallCatalogRatio = validateOverallCatalogRatio(plan);
  const catalogRatio = {
    ...catalogRatioBase,
    issues: [...catalogRatioBase.issues, ...overallCatalogRatio.issues],
    score: Math.round((catalogRatioBase.score + overallCatalogRatio.score) / 2),
  };
  const prohibitionCompliance = validateProhibitionCompliance(plan, prohibitions);
  const phaseCoherence = validatePhaseCoherence(plan, objective);
  const raceDayPresence = validateRaceDayPresence(plan, raceWeekNumbers);
  const limiterCoherence = validateLimiterCoherence(plan, identifiedLimiters, effectiveLimiterKeys);
  const wbalFeasibility = validateWbalFeasibility(plan, athleteData);
  const sessionDensity_ = validateSessionDensity(plan, sessionDensity);
  const strengthSessionsRequested = validateStrengthSessionsRequested(plan, weekMetrics, strengthSessionsPerWeek);
  const lorang_ = validateLorangCategories(plan, objective, ambition);
  const sportObjective = validateSportObjectiveCoherence(plan, objective);
  const objectiveSportConflict = validateObjectiveSportCoherence(weekMetrics, objective, constraintsText);
  const bannedSportReintroduced = validateBannedSportNotReintroduced(weekMetrics, constraintsText);
  const finalObjectiveMismatch = validateFinalObjectiveMatchesMainGoal(objective, raceGoals);
  const raceCalendarCoherence = validateRaceCalendarCoherence(raceGoals, planStartDate, plan.totalWeeks);
  const durationCoverage = validateDurationCoverage(weekMetrics);
  const injuryRiskCompliance = validateInjuryRiskCompliance(plan, injuryRisk);
  // #18 lot 1 : règles INVIOLABLE/OBLIGATOIRE sans contrôle post-génération jusqu'ici
  const titleFormat = validateTitleFormat(plan);
  const strategicRecapUniqueness = validateStrategicRecapUniqueness(plan);
  const restDayCoherence = validateRestDayCoherence(plan);
  const antiRepetition = validateAntiRepetition(plan);
  // #18 lot 2 : règles conditionnelles (objectif/ambition spécifiques) — hors
  // score pondéré, cf. commentaire au-dessus des fonctions (même traitement
  // que sportObjective/injuryRiskCompliance déjà hors PLAN_VALIDATION_WEIGHTS).
  const startToRunStrength = validateStartToRunWeeklyStrength(plan, objective);
  const trailBackToBack = validateTrailBackToBack(plan, objective);
  const trailDPlusPresence = validateTrailDPlusPresence(plan, objective);
  const dailySessionFloor = validateDailySessionFloor(plan, objective, ambition);
  const lcwSignaturePresence = validateLcwSignaturePresence(plan, isLcwFormatHint);
  const raceDayOnlyFichePlacement = validateRaceDayOnlyFichePlacement(plan);
  const keySessionSelfDeclaration = validateKeySessionSelfDeclaration(plan);
  const ambitionCoherence = validateAmbitionCoherence(objective, ambitionAudit);

  // Combine all issues
  const allIssues = [
    ...polarization.issues,
    ...loadPattern.issues,
    ...keySessions.issues,
    ...progression.issues,
    ...sportRatio.issues,
    ...catalogRatio.issues,
    ...prohibitionCompliance.issues,
    ...phaseCoherence.issues,
    ...ambitionCoherence.issues,
    ...raceDayPresence.issues,
    ...limiterCoherence.issues,
    ...wbalFeasibility.issues,
    ...sessionDensity_.issues,
    ...strengthSessionsRequested.issues,
    ...lorang_.issues,
    ...startToRunStrength.issues,
    ...trailBackToBack.issues,
    ...trailDPlusPresence.issues,
    ...dailySessionFloor.issues,
    ...sportObjective.issues,
    ...objectiveSportConflict.issues,
    ...bannedSportReintroduced.issues,
    ...finalObjectiveMismatch.issues,
    ...raceCalendarCoherence.issues,
    ...durationCoverage.issues,
    ...injuryRiskCompliance.issues,
    ...titleFormat.issues,
    ...strategicRecapUniqueness.issues,
    ...restDayCoherence.issues,
    ...antiRepetition.issues,
    ...lcwSignaturePresence.issues,
    ...raceDayOnlyFichePlacement.issues,
    ...keySessionSelfDeclaration.issues,
  ];

  // Weighted score (17 rules) — Lot 4 introduit lorangCategories (5%),
  // rééquilibré depuis polarization (12→10) et sessionDensity (5→3) pour éviter double comptage
  // (polarization approximative sur classification texte vs Lorang tag-based).
  // #18 lot 1 introduit 4 règles jusqu'ici sans contrôle (titre H1, unicité
  // récap, cohérence repos, anti-répétition — 13% cumulé), rééquilibré par
  // petites retenues sur les rules les moins critiques (jamais sur
  // prohibitionCompliance/limiterCoherence/wbalFeasibility, les 3 gardes-fous
  // sécurité/fidélité diagnostic) — somme totale inchangée à 1.00, vérifié par
  // un test dédié sur PLAN_VALIDATION_WEIGHTS (garde-fou anti-drift).
  const weights = PLAN_VALIDATION_WEIGHTS;
  const clamp100 = (n: number) => Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));
  const uncappedWeightedScore = Math.round(
    clamp100(polarization.score) * weights.polarization +
    clamp100(loadPattern.score) * weights.loadPattern +
    clamp100(keySessions.score) * weights.keySessions +
    clamp100(progression.score) * weights.progression +
    clamp100(sportRatio.score) * weights.sportRatio +
    clamp100(catalogRatio.score) * weights.catalogRatio +
    clamp100(prohibitionCompliance.score) * weights.prohibitionCompliance +
    clamp100(phaseCoherence.score) * weights.phaseCoherence +
    clamp100(raceDayPresence.score) * weights.raceDayPresence +
    clamp100(limiterCoherence.score) * weights.limiterCoherence +
    clamp100(wbalFeasibility.score) * weights.wbalFeasibility +
    clamp100(sessionDensity_.score) * weights.sessionDensity +
    clamp100(lorang_.score) * weights.lorangCategories +
    clamp100(titleFormat.score) * weights.titleFormat +
    clamp100(strategicRecapUniqueness.score) * weights.strategicRecapUniqueness +
    clamp100(restDayCoherence.score) * weights.restDayCoherence +
    clamp100(antiRepetition.score) * weights.antiRepetition
  );

  /**
   * Audit "fiabilité du validateur" (consigne coach, point 8) — anomalie
   * confirmée : `weightedScore` est une MOYENNE PONDÉRÉE de 17 sous-scores
   * indépendants. Chaque poids plafonne la contribution MAXIMALE de sa
   * règle : phaseCoherence pèse 8%, donc même 2 erreurs critiques de phase
   * (score interne -30, cf. validatePhaseCoherence) ne peuvent faire
   * bouger le score global que de ≤ 8 points — largement compensable par
   * de simples écarts favorables sur d'autres règles à poids cumulé plus
   * élevé. Constaté en pratique sur le corpus Mode A disponible (Tâche 2) :
   * un plan avec 2 erreurs critiques de phase notait 92/A, AU-DESSUS d'un
   * plan sans aucune erreur critique (91/A) — la seule différence venait de
   * règles sans rapport (moins de répétition détectée sur un plan à une
   * semaine de moins).
   *
   * Plutôt que de modifier les 17 poids existants (effet difficile à
   * borner sans aussi déplacer le problème — ex. remonter phaseCoherence
   * change aussi le score d'un plan SANS erreur de phase mais avec un
   * phaseCoherence.score bas pour une autre raison), on plafonne le score
   * global : dès qu'AU MOINS UNE erreur critique ("error", même sémantique
   * que le blocage réel de sauvegarde via handleSaveToPlan) existe, le
   * score ne peut plus atteindre les paliers A/B (cf. barème grade
   * ci-dessous) — un plan avec une violation confirmée ne doit jamais se
   * lire comme "prêt à l'emploi" au seul regard du score global. N'affecte
   * AUCUN poids ni AUCUN sous-score individuel (tous restés inchangés,
   * visibles tels quels dans `summary`) : seul le score AGRÉGÉ d'un plan
   * ayant ≥1 erreur critique est concerné, et seulement s'il dépasserait
   * sinon ce plafond.
   */
  const hasCriticalIssue = allIssues.some((i) => i.severity === "error");
  const CRITICAL_SCORE_CEILING = 69;
  const weightedScore = hasCriticalIssue
    ? Math.min(uncappedWeightedScore, CRITICAL_SCORE_CEILING)
    : uncappedWeightedScore;

  // Grade
  const grade = weightedScore >= 85 ? "A" : weightedScore >= 70 ? "B" : weightedScore >= 55 ? "C" : weightedScore >= 40 ? "D" : "F";

  // Summary comment
  const errorCount = allIssues.filter(i => i.severity === "error").length;
  const warningCount = allIssues.filter(i => i.severity === "warning").length;
  const prohibitionViolations = prohibitionCompliance.issues.filter(i => i.severity === "error").length;
  const phaseErrors = phaseCoherence.issues.filter(i => i.severity === "error").length;
  const missingRaceWeeks = raceDayPresence.issues
    .filter(i => i.rule === "race_day" && i.severity === "error")
    .map(i => `S${i.week}`);
  const unexpectedRaceCount = raceDayPresence.issues.filter(i => i.rule === "race_day_unexpected" && i.severity === "error").length;
  const raceCatalogConflictCount = raceDayPresence.issues.filter(i => i.rule === "race_catalog_conflict" && i.severity === "error").length;
  const limiterErrors = limiterCoherence.issues.filter(i => i.severity === "error").length;
  const wbalErrors = wbalFeasibility.issues.filter(i => i.severity === "error").length;
  const injuryRiskErrors = injuryRiskCompliance.issues.filter(i => i.severity === "error").length;
  const objectiveSportConflictErrors = objectiveSportConflict.issues.filter(i => i.severity === "error").length;
  const bannedSportReintroducedErrors = bannedSportReintroduced.issues.filter(i => i.severity === "error").length;
  const finalObjectiveMismatchErrors = finalObjectiveMismatch.issues.filter(i => i.severity === "error").length;
  const overallComment = prohibitionViolations > 0
    ? `🚫 ${prohibitionViolations} VIOLATION(S) DE PROHIBITION DÉTECTÉE(S) — Plan NON CONFORME au diagnostic physiologique`
    : finalObjectiveMismatchErrors > 0
    ? `🏁 Objectif final incohérent — la compétition de fin de plan ne correspond pas à l'objectif principal déclaré, voir détail — décision du coach requise avant utilisation`
    : bannedSportReintroducedErrors > 0
    ? `🚫 Discipline bannie par le coach réintroduite dans le plan final — une correction automatique a probablement annulé une interdiction explicite, voir détail`
    : objectiveSportConflictErrors > 0
    ? `🎯 Objectif/contenu incompatible — 0 séance de la discipline exigée par l'objectif, voir détail — décision du coach requise avant utilisation`
    : injuryRiskErrors > 0
    ? `🚨 ${injuryRiskErrors} semaine(s) avec charge à impact élevé non réduite malgré un risque blessure CRITIQUE — Plan NON CONFORME au diagnostic physiologique`
    : wbalErrors > 0
    ? `⚡ ${wbalErrors} séance(s) infaisable(s) selon le W'bal de l'athlète — intensité, durée ou repos à revoir`
    : limiterErrors > 0
    ? `⚠️ ${limiterErrors} incohérence(s) limiteur↔séances — le plan ne cible pas les limiteurs détectés par le diagnostic`
    : missingRaceWeeks.length > 0
    ? `🏁 Jour de course absent — ${missingRaceWeeks.join(", ")} : le plan doit inclure le Jour J déclaré`
    : unexpectedRaceCount > 0
    ? `🏁 ${unexpectedRaceCount} course(s) non déclarée(s) détectée(s) — voir les semaines concernées`
    : raceCatalogConflictCount > 0
    ? `🏁 ${raceCatalogConflictCount} compétition(s) associée(s) à une fiche d'entraînement — identité et prescription à vérifier`
    : phaseErrors > 0
    ? `⚠️ ${phaseErrors} incohérence(s) de phase détectée(s) — périodisation à corriger`
    : errorCount === 0 && warningCount === 0
    ? "✅ Plan conforme aux standards élite TFCL™"
    : errorCount === 0
    ? `⚠️ ${warningCount} avertissement(s) mineur(s) — plan globalement conforme`
    : `❌ ${errorCount} problème(s) critique(s) et ${warningCount} avertissement(s) détectés`;

  return {
    score: weightedScore,
    grade,
    issues: allIssues,
    weekMetrics,
    limiterCoverage: limiterCoherence.coverage,
    catalogStats: catalogRatio.catalogStats,
    lorangCategories: lorang_.distribution,
    summary: {
      polarizationScore: clamp100(polarization.score),
      loadPatternScore: clamp100(loadPattern.score),
      keySessionsScore: clamp100(keySessions.score),
      progressionScore: clamp100(progression.score),
      sportRatioScore: clamp100(sportRatio.score),
      catalogRatioScore: catalogRatio.score,
      prohibitionComplianceScore: prohibitionCompliance.score,
      phaseCoherenceScore: clamp100(phaseCoherence.score),
      raceDayScore: raceDayPresence.score,
      limiterCoherenceScore: clamp100(limiterCoherence.score),
      wbalFeasibilityScore: wbalFeasibility.score,
      sessionDensityScore: sessionDensity_.score,
      lorangCategoriesScore: lorang_.score,
      injuryRiskComplianceScore: injuryRiskCompliance.score,
      titleFormatScore: clamp100(titleFormat.score),
      strategicRecapUniquenessScore: clamp100(strategicRecapUniqueness.score),
      restDayCoherenceScore: clamp100(restDayCoherence.score),
      antiRepetitionScore: clamp100(antiRepetition.score),
      startToRunStrengthScore: startToRunStrength.score,
      trailBackToBackScore: trailBackToBack.score,
      trailDPlusPresenceScore: trailDPlusPresence.score,
      dailySessionFloorScore: dailySessionFloor.score,
      lcwSignaturePresenceScore: lcwSignaturePresence.score,
      raceDayOnlyFichePlacementScore: raceDayOnlyFichePlacement.score,
      overallComment,
    },
  };
}


/**
 * Format validation result as a human-readable markdown string
 */
export function formatValidationReport(result: PlanValidationResult): string {
  const lines: string[] = [];
  
  lines.push(`## 📊 Rapport Qualité TFCL™ — Score: ${result.score}/100 (${result.grade})`);
  lines.push("");
  lines.push(`| Critère | Score | Statut |`);
  lines.push(`|---------|-------|--------|`);
  lines.push(`| Polarisation 80/20 | ${result.summary.polarizationScore}/100 | ${result.summary.polarizationScore >= 75 ? "✅" : result.summary.polarizationScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| Décharge 3:1/2:1 | ${result.summary.loadPatternScore}/100 | ${result.summary.loadPatternScore >= 75 ? "✅" : result.summary.loadPatternScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| Séances clés | ${result.summary.keySessionsScore}/100 | ${result.summary.keySessionsScore >= 75 ? "✅" : result.summary.keySessionsScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| Progression volume | ${result.summary.progressionScore}/100 | ${result.summary.progressionScore >= 75 ? "✅" : result.summary.progressionScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| Ratio sportif | ${result.summary.sportRatioScore}/100 | ${result.summary.sportRatioScore >= 75 ? "✅" : result.summary.sportRatioScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| Catalogue TFCL™ | ${result.summary.catalogRatioScore}/100 | ${result.summary.catalogRatioScore >= 75 ? "✅" : result.summary.catalogRatioScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| 🚫 Conformité prohibitions | ${result.summary.prohibitionComplianceScore}/100 | ${result.summary.prohibitionComplianceScore >= 75 ? "✅" : result.summary.prohibitionComplianceScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| 📦 Cohérence des phases | ${result.summary.phaseCoherenceScore}/100 | ${result.summary.phaseCoherenceScore >= 75 ? "✅" : result.summary.phaseCoherenceScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| 🏁 Jour de course | ${result.summary.raceDayScore}/100 | ${result.summary.raceDayScore >= 100 ? "✅" : "❌"} |`);
  lines.push(`| 🎯 Cohérence limiteurs↔séances | ${result.summary.limiterCoherenceScore}/100 | ${result.summary.limiterCoherenceScore >= 75 ? "✅" : result.summary.limiterCoherenceScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| ⚡ Faisabilité W'bal | ${result.summary.wbalFeasibilityScore}/100 | ${result.summary.wbalFeasibilityScore >= 90 ? "✅" : result.summary.wbalFeasibilityScore >= 70 ? "⚠️" : "❌"} |`);
  lines.push(`| 🎨 Catégories Lorang A-D | ${result.summary.lorangCategoriesScore}/100 | ${result.summary.lorangCategoriesScore >= 75 ? "✅" : result.summary.lorangCategoriesScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| 🛡️ Risque blessure (charge impact élevé) | ${result.summary.injuryRiskComplianceScore}/100 | ${result.summary.injuryRiskComplianceScore >= 75 ? "✅" : result.summary.injuryRiskComplianceScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| 🔴 Titre H1 (RÈGLE #0) | ${result.summary.titleFormatScore}/100 | ${result.summary.titleFormatScore >= 75 ? "✅" : result.summary.titleFormatScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| 📋 Unicité récap stratégique | ${result.summary.strategicRecapUniquenessScore}/100 | ${result.summary.strategicRecapUniquenessScore >= 75 ? "✅" : result.summary.strategicRecapUniquenessScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| 😴 Cohérence jour de repos | ${result.summary.restDayCoherenceScore}/100 | ${result.summary.restDayCoherenceScore >= 75 ? "✅" : result.summary.restDayCoherenceScore >= 50 ? "⚠️" : "❌"} |`);
  lines.push(`| 🔄 Anti-répétition | ${result.summary.antiRepetitionScore}/100 | ${result.summary.antiRepetitionScore >= 75 ? "✅" : result.summary.antiRepetitionScore >= 50 ? "⚠️" : "❌"} |`);
  if (result.summary.startToRunStrengthScore < 100) {
    lines.push(`| 🏋️ Renfo Fondation hebdo (Start to Run) | ${result.summary.startToRunStrengthScore}/100 | ${result.summary.startToRunStrengthScore >= 75 ? "✅" : result.summary.startToRunStrengthScore >= 50 ? "⚠️" : "❌"} |`);
  }
  if (result.summary.trailBackToBackScore < 100) {
    lines.push(`| ⛰️ Back-to-back trail | ${result.summary.trailBackToBackScore}/100 | ${result.summary.trailBackToBackScore >= 75 ? "✅" : "⚠️"} |`);
  }
  if (result.summary.trailDPlusPresenceScore < 100) {
    lines.push(`| 📈 D+ chiffré (trail) | ${result.summary.trailDPlusPresenceScore}/100 | ${result.summary.trailDPlusPresenceScore >= 75 ? "✅" : result.summary.trailDPlusPresenceScore >= 50 ? "⚠️" : "❌"} |`);
  }
  if (result.summary.dailySessionFloorScore < 100) {
    lines.push(`| 🔥 Plancher séances/jour (Elite+) | ${result.summary.dailySessionFloorScore}/100 | ${result.summary.dailySessionFloorScore >= 75 ? "✅" : result.summary.dailySessionFloorScore >= 50 ? "⚠️" : "❌"} |`);
  }
  if (result.summary.lcwSignaturePresenceScore < 100) {
    lines.push(`| 🏴 Week-ends signature LCW | ${result.summary.lcwSignaturePresenceScore}/100 | ${result.summary.lcwSignaturePresenceScore >= 75 ? "✅" : "❌"} |`);
  }
  if (result.summary.raceDayOnlyFichePlacementScore < 100) {
    lines.push(`| 🎽 Fiches "jour J" mal placées | ${result.summary.raceDayOnlyFichePlacementScore}/100 | ${result.summary.raceDayOnlyFichePlacementScore >= 75 ? "✅" : "❌"} |`);
  }
  lines.push("");
  {
    const d = result.lorangCategories;
    lines.push(`**Distribution Lorang** — A ${d.APct}% · B ${d.BPct}% · C ${d.CPct}% · D ${d.DPct}% (tags explicites : ${d.taggedPct}%)`);
  }
  lines.push("");
  lines.push(`**${result.summary.overallComment}**`);


  if (result.issues.length > 0) {
    lines.push("");
    lines.push("### Détails");
    
    // Prohibition violations first (most critical)
    const prohibitionErrors = result.issues.filter(i => i.rule === "prohibition_compliance");
    const phaseErrors = result.issues.filter(i => i.rule === "phase_coherence" && i.severity === "error");
    const raceDayErrors = result.issues.filter(i => i.rule === "race_day");
    const wbalErrors = result.issues.filter(i => i.rule === "wbal_feasibility" && i.severity === "error");
    const otherErrors = result.issues.filter(i => i.severity === "error" && !["prohibition_compliance", "phase_coherence", "race_day", "wbal_feasibility"].includes(i.rule));
    const warnings = result.issues.filter(i => i.severity === "warning");

    if (prohibitionErrors.length > 0) {
      lines.push("\n**🚫 Violations de prohibition (CRITIQUE — incohérence avec le diagnostic) :**");
      prohibitionErrors.forEach(e => lines.push(`- ${e.message}`));
      if (prohibitionErrors[0]?.detail) lines.push(`  → ${prohibitionErrors[0].detail}`);
    }
    if (wbalErrors.length > 0) {
      lines.push("\n**⚡ Séances infaisables selon le W'bal de l'athlète (Skiba 2012) :**");
      wbalErrors.slice(0, 8).forEach(e => {
        lines.push(`- ${e.message}`);
        if (e.detail) lines.push(`  → ${e.detail}`);
      });
      if (wbalErrors.length > 8) lines.push(`- ... et ${wbalErrors.length - 8} autres séances infaisables`);
    }
    if (phaseErrors.length > 0) {
      lines.push("\n**📦 Incohérences de phase (CRITIQUE — périodisation non conforme) :**");
      phaseErrors.forEach(e => lines.push(`- ${e.message}`));
      if (phaseErrors[0]?.detail) lines.push(`  → ${phaseErrors[0].detail}`);
    }
    if (raceDayErrors.length > 0) {
      lines.push("\n**🏁 Jour de course manquant :**");
      raceDayErrors.forEach(e => lines.push(`- ${e.message}`));
    }
    if (otherErrors.length > 0) {
      lines.push("\n**❌ Erreurs critiques :**");
      otherErrors.forEach(e => lines.push(`- ${e.message}`));
    }
    if (warnings.length > 0) {
      lines.push("\n**⚠️ Avertissements :**");
      warnings.slice(0, 10).forEach(w => lines.push(`- ${w.message}`));
      if (warnings.length > 10) lines.push(`- ... et ${warnings.length - 10} autres`);
    }
  }

  return lines.join("\n");
}
