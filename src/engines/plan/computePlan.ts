/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL PLAN ENGINE™ — Orchestrateur
 * 
 * Prépare le contexte décisionnel pour l'IA et orchestre la génération.
 * 
 * FLUX :
 * 1. Extraire le contexte décisionnel de la TrainingPrescription
 * 2. Construire le PlanConfig enrichi (limiters, levers, prohibitions)
 * 3. Déléguer la génération à useAITrainingPlan (edge function)
 * 4. Parser le résultat via aiPlanParser
 * 
 * NOTE : La génération IA elle-même reste dans l'edge function.
 * Le Plan Engine prépare les inputs et post-traite les outputs.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  ParsedPlan,
  ParsedWeek,
  ParsedSession,
} from "./types";
import type { PlanAthleteData, PlanConfig } from "@/hooks/useAITrainingPlan";
import { applyWbalRecoveryRecalc, type WbalRecalcStats } from "./wbalPostProcessor";

// ═══════════════════════════════════════════════════════════════════════════════
// POST-TRAITEMENT (extractPlanContext / buildEnrichedPlanConfig / buildPlanOutput
// supprimés — dead code. PlanConfig est construit par buildPlanConfigFromDiagnostic.)
// ═══════════════════════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════════════════════
// POST-TRAITEMENT
// ═══════════════════════════════════════════════════════════════════════════════

const RACE_DAY_PATTERNS = /🏁|jour\s*j|course\s*objectif|race\s*day|compétition|épreuve\s*(objectif|cible)|jour\s*de\s*(course|compétition)/i;

const DAY_INDEX_MAP: Record<number, string> = {
  0: "Dimanche", 1: "Lundi", 2: "Mardi", 3: "Mercredi",
  4: "Jeudi", 5: "Vendredi", 6: "Samedi",
};

// Lundi=0 in our plan system
const JS_TO_PLAN_DAY: Record<number, number> = {
  0: 6, // Dimanche → 6
  1: 0, // Lundi → 0
  2: 1, // Mardi → 1
  3: 2, // Mercredi → 2
  4: 3, // Jeudi → 3
  5: 4, // Vendredi → 4
  6: 5, // Samedi → 5
};

const PLAN_DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/**
 * Calcule la semaine du plan (1-indexed) pour une date de course donnée
 */
function getRaceWeekNumber(raceDate: string, planStartDate: string, totalWeeks: number): number {
  const race = new Date(raceDate);
  const start = new Date(planStartDate);
  const diffMs = race.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weekNum = Math.floor(diffDays / 7) + 1;
  return Math.max(1, Math.min(weekNum, totalWeeks));
}

/**
 * Vérifie si une semaine contient déjà un jour de course
 */
function weekHasRaceDay(week: ParsedWeek): boolean {
  return week.sessions.some(s => {
    const text = `${s.sport} ${s.title} ${s.details}`;
    return RACE_DAY_PATTERNS.test(text);
  });
}

/**
 * Ancrage automatique des jours de course :
 * 1. Pour chaque objectif (A/B/C), vérifie si la semaine cible contient un jour de course
 * 2. Si absent, injecte une séance "🏁 COURSE OBJECTIF" à la date exacte
 * 3. Si présent mais décalé (±1 semaine), recale vers la bonne semaine
 */
function anchorRaceDays(plan: ParsedPlan, config: PlanGenerationConfig): void {
  const goals = config.raceGoals;
  if (!goals?.length || !config.planStartDate) return;

  for (const goal of goals) {
    if (!goal.raceDate) continue;

    const targetWeekNum = getRaceWeekNumber(goal.raceDate, config.planStartDate, plan.weeks.length);
    const targetWeek = plan.weeks.find(w => w.weekNumber === targetWeekNum);
    if (!targetWeek) continue;

    // Already has a race day in the correct week → skip
    if (weekHasRaceDay(targetWeek)) continue;

    // Check if a neighboring week has a misplaced race day for this objective
    const neighborWeeks = plan.weeks.filter(
      w => Math.abs(w.weekNumber - targetWeekNum) === 1
    );
    let relocated = false;
    for (const nw of neighborWeeks) {
      const raceSessions = nw.sessions.filter(s => {
        const text = `${s.sport} ${s.title} ${s.details}`;
        return RACE_DAY_PATTERNS.test(text);
      });
      if (raceSessions.length > 0) {
        // Move race sessions to the correct week
        for (const rs of raceSessions) {
          nw.sessions = nw.sessions.filter(s => s !== rs);
          rs.weekNumber = targetWeekNum;
          rs.weekTheme = targetWeek.theme;
          rs.phase = targetWeek.phase;
          targetWeek.sessions.push(rs);
        }
        relocated = true;
        break;
      }
    }

    if (relocated) continue;

    // No race day found anywhere nearby → inject one
    const raceDate = new Date(goal.raceDate);
    const jsDayOfWeek = raceDate.getDay(); // 0=Sun
    const planDayIndex = JS_TO_PLAN_DAY[jsDayOfWeek];
    const dayName = PLAN_DAY_NAMES[planDayIndex];

    const priorityLabel = goal.priority === "A" ? "🅰️" : goal.priority === "B" ? "🅱️" : "🅲";
    const raceName = goal.raceName || goal.objective;

    // Build pacing hint based on objective
    const pacingHint = buildPacingHint(goal.objective);

    const raceSession: ParsedSession = {
      weekNumber: targetWeekNum,
      weekTheme: targetWeek.theme,
      phase: targetWeek.phase,
      dayName,
      dayIndex: planDayIndex,
      sport: "🏁 Course",
      title: `🏁 COURSE OBJECTIF ${priorityLabel} — ${raceName}`,
      details: `Jour J — ${raceName} (${goal.raceDate}). ${pacingHint} Discipline > ambition. Exécuter le plan.`,
      isRest: false,
    };

    // Remove any existing rest session on race day
    targetWeek.sessions = targetWeek.sessions.filter(
      s => !(s.dayIndex === planDayIndex && s.isRest)
    );

    targetWeek.sessions.push(raceSession);

    // Sort sessions by dayIndex
    targetWeek.sessions.sort((a, b) => a.dayIndex - b.dayIndex);
  }
}

function buildPacingHint(objective: string): string {
  const obj = objective.toLowerCase();
  if (obj.includes("ironman") && !obj.includes("70.3")) {
    return "Pacing conservateur 1er tiers. Nutrition 80-90g/h. Négatif split marathon.";
  }
  if (obj.includes("70.3") || obj.includes("half")) {
    return "Puissance vélo contrôlée (80-85% FTP). Nutrition 60-80g/h. CAP régulière.";
  }
  if (obj.includes("marathon")) {
    return "Allure marathon cible régulière. Nutrition 60g/h. Négatif split.";
  }
  if (obj.includes("semi")) {
    return "Allure semi constante. Hydratation régulière. Finish fort.";
  }
  if (obj.includes("10k") || obj.includes("10 km")) {
    return "Départ contrôlé. Accélération progressive. Finish maximal.";
  }
  if (obj.includes("trail")) {
    return "Gestion effort montées. Nutrition solide + liquide. Bâtons si D+.";
  }
  return "Stratégie de pacing validée. Exécuter le plan de course.";
}

/**
 * Applique les post-traitements déterministes au plan parsé.
 * Utile côté UI pour garder la même cohérence que le pipeline moteur.
 *
 * Si `athleteData` est fourni, déclenche aussi le recalcul des temps de
 * repos via W'bal (Skiba 2012) pour les intervalles cyclistes supra-CP.
 */
export function postProcessParsedPlan(
  plan: ParsedPlan,
  config: PlanGenerationConfig,
  athleteData?: PlanAthleteData
): { plan: ParsedPlan; wbalStats?: WbalRecalcStats } {
  anchorRaceDays(plan, config);

  let wbalStats: WbalRecalcStats | undefined;
  if (athleteData) {
    wbalStats = applyWbalRecoveryRecalc(plan, athleteData);
  }

  return { plan, wbalStats };
}

/**
 * Parse le markdown brut de l'IA et produit le PlanOutput final
 */
export function buildPlanOutput(
  rawMarkdown: string,
  input: PlanInput,
  chunksUsed: number
): PlanOutput {
  const plan = parseAIPlan(rawMarkdown);
  const context = extractPlanContext(input.prescription);

  // POST-TRAITEMENT : ancrage course + recalcul W'bal individualisé
  const { wbalStats } = postProcessParsedPlan(plan, input.config, input.athleteData);

  if (wbalStats && wbalStats.rewritten > 0) {
    console.info(
      `[PlanEngine] W'bal recalc — ${wbalStats.rewritten}/${wbalStats.scanned} sessions cyclistes recalculées`
    );
  }

  return {
    plan,
    rawMarkdown,
    generation: {
      mode: input.config.mode,
      chunksUsed,
      totalWeeks: input.config.weeksAvailable,
      generatedAt: new Date().toISOString(),
    },
    injectedContext: context,
    meta: {
      version: PLAN_ENGINE_VERSION,
      disclaimer: PLAN_ENGINE_DISCLAIMER,
    },
  };
}

