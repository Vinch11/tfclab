/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PLAN START TO RUN — TEMPLATE STATIQUE RÉUTILISABLE (sans génération IA)
 *
 * Motivation (audit "plan Mamou", 12 semaines Start-to-Run + jalon 10km) :
 * un plan Start-to-Run est un protocole standardisé (marche-course → course
 * continue, littérature "couch to 5K" / Nielsen 2012 / Bertelsen 2017), pas
 * un cas qui bénéficie d'une génération IA par athlète. La génération IA a
 * même produit des bugs propres à ce cas : régression S1→S2→S3 (S3 revenait
 * à un format plus facile que S2 au lieu de consolider), et une majorité de
 * séances [CUSTOM] improvisées à partir de S5 (le modèle comblait un vrai
 * trou de bibliothèque entre les fiches 3'/1' et 5'/1', et entre 5'/1' et le
 * premier continu 15min, en inventant du contenu hors catalogue — sans les
 * garde-fous de sécurité/traçabilité qu'un débutant à risque de blessure
 * modéré/élevé mérite). Root cause plus profonde documentée dans
 * `systemPrompt.ts`/`promptHelpers.ts` : le système suppose explicitement
 * qu'"un plan Start-to-Run n'est jamais lui-même multi-objectif en pratique"
 * — faux dès qu'un second objectif daté (ex. un 10km) suit le cycle S2R, ce
 * qui produit un mélange incohérent de règles S2R ("pas de seuil, pas de
 * sortie longue") et de contenu race-specific pour l'objectif final.
 *
 * Ce module construit donc un `ParsedPlan` 12 semaines ENTIÈREMENT
 * déterministe, à partir des fiches `EnrichedWorkoutsStartToRun` et de leurs
 * propres champs `when` (qui encodent déjà la progression canonique :
 * "Semaines 1-2", "Semaines 3-4", etc. — cf. enrichedWorkoutsStartToRun.ts).
 * Aucun appel réseau, aucune IA : le même calendrier pour tous les athlètes,
 * seule la date de début et le dosage de renforcement varient.
 *
 * Le `ParsedPlan` produit a exactement la même forme qu'un plan généré par
 * l'IA (voir aiPlanParser.ts) : il se branche donc directement sur
 * `<AIPlanViewer plan=... startDate=... athleteId=... athleteName=... />`
 * (visualisation, export PDF via impression navigateur, et les boutons Nolio
 * intégrés à AIPlanViewer/NolioSessionButton — rien à modifier côté export).
 *
 * Portée volontairement limitée à la sortie du cycle S2R (30min continu /
 * ~4-5km, cf. S2R_CONTINUOUS_30_LONG). Bâtir la spécificité d'une course
 * plus longue (10km, semi...) après ce cycle reste un plan IA SÉPARÉ,
 * généré une fois l'athlète gradué — ne pas essayer de faire porter les deux
 * objectifs par ce template, c'est exactement le mélange qui causait le bug.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type { LibraryWorkout } from "@/types/workoutLibrary";
import { EnrichedWorkoutsStartToRun } from "./enrichedWorkoutsStartToRun";
import type { ParsedPlan, ParsedSession, ParsedWeek } from "./aiPlanParser";

const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

const S2R = new Map<string, LibraryWorkout>(EnrichedWorkoutsStartToRun.map((w) => [w.id, w]));

function fiche(id: string): LibraryWorkout {
  const w = S2R.get(id);
  if (!w) throw new Error(`startToRunTemplate: fiche catalogue introuvable — ${id}`);
  return w;
}

/** "Warm-up: ... [Z1]. Main: ... [Z2]. Cool-down: ... [Z1]. [ID: XXX]" — même
 *  format condensé que celui affiché pour les séances catalogue d'un plan IA. */
function buildDetails(w: LibraryWorkout): string {
  const parts = (w.structure || [])
    .map((p) => `${p.part}: ${p.text}${p.zones.length > 0 ? ` [${p.zones.join(", ")}]` : ""}`)
    .join(" ");
  return `${parts} [ID: ${w.id}]`;
}

function midDuration(w: LibraryWorkout): number {
  return Math.round((w.durationMin[0] + w.durationMin[1]) / 2);
}

function formatVolume(totalMin: number): string {
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}min`;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

function ficheSession(
  ficheId: string,
  dayIndex: number,
  weekNumber: number,
  weekTheme: string,
  phase: string,
  isKeySession = false,
): ParsedSession {
  const w = fiche(ficheId);
  return {
    weekNumber,
    weekTheme,
    phase,
    dayName: DAY_NAMES[dayIndex],
    dayIndex,
    sport: w.sport,
    title: w.objectif,
    details: buildDetails(w),
    isRest: false,
    catalogId: w.id,
    isKeySession,
  };
}

function restSession(dayIndex: number, weekNumber: number, weekTheme: string, phase: string): ParsedSession {
  return {
    weekNumber,
    weekTheme,
    phase,
    dayName: DAY_NAMES[dayIndex],
    dayIndex,
    sport: "rest",
    title: "Repos complet",
    details: "Repos complet, hydratation et récupération.",
    isRest: true,
  };
}

export type S2RStrengthDose = "full" | "light" | "none";

interface DaySpec {
  dayIndex: number;
  /** IDs de fiches à placer ce jour (plusieurs séances possibles le même jour). */
  ficheIds: string[];
  isKeySession?: boolean;
}

interface WeekSpec {
  phase: "base" | "build" | "peak" | "taper";
  theme: string;
  /** Fiche(s) de renforcement du bloc, ajoutées automatiquement selon `strengthDose`. */
  strengthFicheId: string;
  /** Jours (0=Lundi..6=Dimanche) où poser une séance de renforcement quand dose="full" (2) ou "light" (1, le premier de la liste). */
  strengthDays: number[];
  days: DaySpec[];
}

const CAP_TECH = "S2R_TECHNIQUE_CADENCE_DRILLS";
const CAP_WALK_RECOVERY = "S2R_WALK_BRISK_RECOVERY";
const CAP_MOBILITY = "S2R_MOBILITY_RECOVERY";

/**
 * Calendrier canonique 12 semaines — construit à partir des champs `when`
 * de chaque fiche `enrichedWorkoutsStartToRun.ts` (source de vérité) :
 *   S1-2  → S2R_WALK_RUN_1_2   ("Semaines 1-2")
 *   S3    → S2R_WALK_RUN_2_2   ("Semaines 3-4", introduite ici)
 *   S4    → CONSOLIDATION (palier sur le format 2'/2' — jamais de régression)
 *   S5-6  → S2R_WALK_RUN_3_1   ("Semaines 5-6")
 *   S7    → S2R_WALK_RUN_5_1   ("Semaines 7-8", introduite ici)
 *   S8    → CONSOLIDATION (palier sur le format 5'/1')
 *   S9    → S2R_CONTINUOUS_15  ("Semaine 9, 1re séance" — 1er continu)
 *   S10-11→ S2R_CONTINUOUS_20_25 ("Semaines 10-11")
 *   S12   → S2R_CONTINUOUS_30_LONG ("Semaine 12, objectif final du cycle")
 * Renforcement : S2R_STR_FOUNDATION_BEGINNER (S1-4) / BLOC2 (S5-8) / BLOC3 (S9-12),
 * conformément à la table déterministe `S2R_STRENGTH_PROGRESSION`
 * (systemPrompt.ts, edge function — même source de vérité pour la génération
 * IA classique et ce template statique).
 */
const WEEKS: WeekSpec[] = [
  { phase: "base", theme: "Fondation — Marche-course 1'/2'", strengthFicheId: "S2R_STR_FOUNDATION_BEGINNER", strengthDays: [1, 3], days: [
    { dayIndex: 0, ficheIds: [] },
    { dayIndex: 1, ficheIds: ["S2R_WALK_RUN_1_2"] },
    { dayIndex: 2, ficheIds: [CAP_TECH] },
    { dayIndex: 3, ficheIds: ["S2R_WALK_RUN_1_2"] },
    { dayIndex: 4, ficheIds: [CAP_WALK_RECOVERY] },
    { dayIndex: 5, ficheIds: ["S2R_WALK_RUN_1_2"] },
    { dayIndex: 6, ficheIds: [] },
  ] },
  { phase: "base", theme: "Fondation — Marche-course 1'/2' (suite)", strengthFicheId: "S2R_STR_FOUNDATION_BEGINNER", strengthDays: [1, 3], days: [
    { dayIndex: 0, ficheIds: [] },
    { dayIndex: 1, ficheIds: ["S2R_WALK_RUN_1_2"] },
    { dayIndex: 2, ficheIds: [CAP_TECH] },
    { dayIndex: 3, ficheIds: ["S2R_WALK_RUN_1_2"] },
    { dayIndex: 4, ficheIds: [CAP_WALK_RECOVERY] },
    { dayIndex: 5, ficheIds: ["S2R_WALK_RUN_1_2"] },
    { dayIndex: 6, ficheIds: [] },
  ] },
  { phase: "base", theme: "Progression — Marche-course 2'/2'", strengthFicheId: "S2R_STR_FOUNDATION_BEGINNER", strengthDays: [1, 3], days: [
    { dayIndex: 0, ficheIds: [] },
    { dayIndex: 1, ficheIds: ["S2R_WALK_RUN_2_2"] },
    { dayIndex: 2, ficheIds: [CAP_TECH] },
    { dayIndex: 3, ficheIds: ["S2R_WALK_RUN_2_2"] },
    { dayIndex: 4, ficheIds: [CAP_WALK_RECOVERY] },
    { dayIndex: 5, ficheIds: ["S2R_WALK_RUN_2_2"] },
    { dayIndex: 6, ficheIds: [] },
  ] },
  { phase: "base", theme: "Jalon S4 — Palier de consolidation (2'/2')", strengthFicheId: "S2R_STR_FOUNDATION_BEGINNER", strengthDays: [1, 3], days: [
    { dayIndex: 0, ficheIds: [] },
    { dayIndex: 1, ficheIds: ["S2R_CONSOLIDATION_WEEK_SESSION"], isKeySession: true },
    { dayIndex: 2, ficheIds: [CAP_TECH] },
    { dayIndex: 3, ficheIds: ["S2R_CONSOLIDATION_WEEK_SESSION"] },
    { dayIndex: 4, ficheIds: [CAP_WALK_RECOVERY] },
    { dayIndex: 5, ficheIds: [] },
    { dayIndex: 6, ficheIds: [] },
  ] },
  { phase: "build", theme: "Construction — Marche-course 3'/1'", strengthFicheId: "S2R_STR_FOUNDATION_BLOC2", strengthDays: [1, 3], days: [
    { dayIndex: 0, ficheIds: [] },
    { dayIndex: 1, ficheIds: ["S2R_WALK_RUN_3_1"] },
    { dayIndex: 2, ficheIds: [CAP_TECH] },
    { dayIndex: 3, ficheIds: ["S2R_WALK_RUN_3_1"] },
    { dayIndex: 4, ficheIds: [CAP_WALK_RECOVERY] },
    { dayIndex: 5, ficheIds: ["S2R_WALK_RUN_3_1"] },
    { dayIndex: 6, ficheIds: [] },
  ] },
  { phase: "build", theme: "Construction — Marche-course 3'/1' (suite)", strengthFicheId: "S2R_STR_FOUNDATION_BLOC2", strengthDays: [1, 3], days: [
    { dayIndex: 0, ficheIds: [] },
    { dayIndex: 1, ficheIds: ["S2R_WALK_RUN_3_1"] },
    { dayIndex: 2, ficheIds: [CAP_TECH] },
    { dayIndex: 3, ficheIds: ["S2R_WALK_RUN_3_1"] },
    { dayIndex: 4, ficheIds: [CAP_WALK_RECOVERY] },
    { dayIndex: 5, ficheIds: ["S2R_WALK_RUN_3_1"] },
    { dayIndex: 6, ficheIds: [] },
  ] },
  { phase: "build", theme: "Progression — Marche-course 5'/1'", strengthFicheId: "S2R_STR_FOUNDATION_BLOC2", strengthDays: [1, 3], days: [
    { dayIndex: 0, ficheIds: [] },
    { dayIndex: 1, ficheIds: ["S2R_WALK_RUN_5_1"] },
    { dayIndex: 2, ficheIds: [CAP_TECH] },
    { dayIndex: 3, ficheIds: ["S2R_WALK_RUN_5_1"] },
    { dayIndex: 4, ficheIds: [CAP_WALK_RECOVERY] },
    { dayIndex: 5, ficheIds: ["S2R_WALK_RUN_5_1"] },
    { dayIndex: 6, ficheIds: [] },
  ] },
  { phase: "build", theme: "Palier S8 — Consolidation (5'/1')", strengthFicheId: "S2R_STR_FOUNDATION_BLOC2", strengthDays: [1, 3], days: [
    { dayIndex: 0, ficheIds: [] },
    { dayIndex: 1, ficheIds: ["S2R_CONSOLIDATION_WEEK_SESSION"], isKeySession: true },
    { dayIndex: 2, ficheIds: [CAP_MOBILITY] },
    { dayIndex: 3, ficheIds: ["S2R_CONSOLIDATION_WEEK_SESSION"] },
    { dayIndex: 4, ficheIds: [CAP_WALK_RECOVERY] },
    { dayIndex: 5, ficheIds: [] },
    { dayIndex: 6, ficheIds: [] },
  ] },
  { phase: "build", theme: "Semaine 9 — Première course continue (15min)", strengthFicheId: "S2R_STR_FOUNDATION_BLOC3", strengthDays: [1, 4], days: [
    { dayIndex: 0, ficheIds: [] },
    { dayIndex: 1, ficheIds: ["S2R_CONTINUOUS_15"], isKeySession: true },
    { dayIndex: 2, ficheIds: [CAP_MOBILITY] },
    { dayIndex: 3, ficheIds: [] },
    { dayIndex: 4, ficheIds: ["S2R_CONTINUOUS_15"] },
    { dayIndex: 5, ficheIds: [] },
    { dayIndex: 6, ficheIds: [] },
  ] },
  { phase: "peak", theme: "Endurance continue — 20-25min", strengthFicheId: "S2R_STR_FOUNDATION_BLOC3", strengthDays: [1, 4], days: [
    { dayIndex: 0, ficheIds: [] },
    { dayIndex: 1, ficheIds: ["S2R_CONTINUOUS_20_25"] },
    { dayIndex: 2, ficheIds: [CAP_MOBILITY] },
    { dayIndex: 3, ficheIds: [] },
    { dayIndex: 4, ficheIds: ["S2R_CONTINUOUS_20_25"] },
    { dayIndex: 5, ficheIds: [] },
    { dayIndex: 6, ficheIds: [] },
  ] },
  { phase: "peak", theme: "Endurance continue — 20-25min (suite)", strengthFicheId: "S2R_STR_FOUNDATION_BLOC3", strengthDays: [1, 4], days: [
    { dayIndex: 0, ficheIds: [] },
    { dayIndex: 1, ficheIds: ["S2R_CONTINUOUS_20_25"] },
    { dayIndex: 2, ficheIds: [CAP_MOBILITY] },
    { dayIndex: 3, ficheIds: [] },
    { dayIndex: 4, ficheIds: ["S2R_CONTINUOUS_20_25"] },
    { dayIndex: 5, ficheIds: [] },
    { dayIndex: 6, ficheIds: [] },
  ] },
  { phase: "taper", theme: "Semaine 12 — Validation finale (30min continu)", strengthFicheId: "S2R_STR_FOUNDATION_BLOC3", strengthDays: [2], days: [
    { dayIndex: 0, ficheIds: [] },
    { dayIndex: 1, ficheIds: [CAP_TECH] },
    { dayIndex: 2, ficheIds: [CAP_MOBILITY] },
    { dayIndex: 3, ficheIds: [] },
    { dayIndex: 4, ficheIds: [CAP_WALK_RECOVERY] },
    { dayIndex: 5, ficheIds: ["S2R_CONTINUOUS_30_LONG"], isKeySession: true },
    { dayIndex: 6, ficheIds: [] },
  ] },
];

export interface StartToRunTemplateOptions {
  /** "full" (2 séances/sem, défaut) · "light" (1 séance/sem) · "none" (aucune, coach l'a désactivé). */
  strengthDose?: S2RStrengthDose;
}

/**
 * Construit le plan Start-to-Run 12 semaines complet — déterministe, sans IA.
 * Ne prend pas de date de départ : les séances sont indexées par
 * weekNumber/dayIndex (cf. ParsedSession), les dates calendaires réelles
 * sont calculées à l'affichage par le consommateur (ex. `mapSessionsToDates`,
 * ou directement `startDate` passé à `<AIPlanViewer>`).
 */
export function buildStartToRunTemplatePlan(
  options: StartToRunTemplateOptions = {},
): ParsedPlan {
  const dose: S2RStrengthDose = options.strengthDose ?? "full";

  const weeks: ParsedWeek[] = WEEKS.map((spec, idx) => {
    const weekNumber = idx + 1;
    const sessions: ParsedSession[] = [];

    for (const day of spec.days) {
      const strengthDayRank = spec.strengthDays.indexOf(day.dayIndex);
      const includeStrengthToday =
        dose !== "none" &&
        strengthDayRank !== -1 &&
        (dose === "full" || strengthDayRank === 0);

      const ficheIdsToday = [...day.ficheIds];
      if (includeStrengthToday) ficheIdsToday.push(spec.strengthFicheId);

      if (ficheIdsToday.length === 0) {
        sessions.push(restSession(day.dayIndex, weekNumber, spec.theme, spec.phase));
        continue;
      }
      ficheIdsToday.forEach((id) => {
        sessions.push(ficheSession(id, day.dayIndex, weekNumber, spec.theme, spec.phase, day.isKeySession));
      });
    }

    const computedVolumeMin = sessions.reduce((sum, s) => {
      if (s.isRest || !s.catalogId) return sum;
      const w = S2R.get(s.catalogId);
      return sum + (w ? midDuration(w) : 0);
    }, 0);

    return {
      weekNumber,
      theme: spec.theme,
      phase: spec.phase,
      sessions,
      computedVolumeMin: computedVolumeMin > 0 ? computedVolumeMin : undefined,
      computedVolumeStr: computedVolumeMin > 0 ? formatVolume(computedVolumeMin) : undefined,
    };
  });

  return {
    title: "Plan TFCL™ — Start to Run (12 semaines)",
    diagnostic:
      "Protocole standard TFCL™ de mise en course progressive (marche-course → course continue), " +
      "identique pour tous les athlètes débutants. Intensité plafonnée en Z1-Z2 conversationnelle, " +
      "progression du volume couru encadrée (+≤10%/semaine), palier de consolidation toutes les 4 " +
      "semaines (S4, S8, S12), jamais 2 jours de course consécutifs, renforcement musculo-squelettique " +
      "systématique (le vrai limiteur d'un débutant n'est pas aérobie). " +
      "Objectif final : 30min de course continue (≈4-5km), porte d'entrée vers un plan course spécifique " +
      "(5K/10K/semi) généré séparément une fois ce cycle terminé.",
    phases: [
      { name: "Bloc 1 · Initiation", weeks: "S1-S4", objective: "Marche-course, tolérance à l'impact" },
      { name: "Bloc 2 · Construction", weeks: "S5-S8", objective: "Inversion du ratio marche/course" },
      { name: "Bloc 3 · Continu", weeks: "S9-S12", objective: "Course continue, validation 30min" },
    ],
    weeks,
    totalWeeks: WEEKS.length,
  };
}
