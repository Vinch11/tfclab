/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PLAN WINDOW REGEN — Option 2 : Régénération partielle ciblée (IA légère)
 *
 * Régénère une fenêtre de N semaines (typ. 3-4) au sein d'un plan existant.
 * Stratégie « zero-edge-change » : on réutilise l'edge function `ai-training-plan`
 * tel quel en :
 *  1. Passant `weeksAvailable = windowSize`
 *  2. Injectant le résumé du passé + l'ancrage du futur dans `constraints`
 *  3. Renumérotant les semaines générées (1..N → fromWeek..toWeek) avant merge
 *  4. Reconcaténant past + window + future en une seule ParsedPlan
 *
 * ⚠ Le coach valide via le dialog avant que le résultat ne soit persisté.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ParsedPlan, ParsedWeek } from "@/lib/aiPlanParser";
import { summarizePastWeeks } from "./planPatcher";
import type { PlanConfig, PlanAthleteData } from "@/hooks/useAITrainingPlan";

export interface WindowRegenRequest {
  fromWeek: number;
  toWeek: number;
  /** Plan complet existant (servira au merge) */
  currentPlan: ParsedPlan;
  /** Snapshot physiologique courant pour brief IA */
  athleteData: PlanAthleteData;
  /** Config originale du plan (objective, weeklyHours, etc.) */
  baseConfig: PlanConfig;
  reason?: string;
}

/**
 * Construit la PlanConfig à passer à `useAITrainingPlan.generatePlan` pour
 * régénérer uniquement la fenêtre demandée.
 *
 * Le hook orchestrateur (`usePlanAdaptation`) appelle ensuite `generatePlan`
 * avec cette config puis fusionne le résultat via `mergeWindowIntoPlan`.
 */
export function buildWindowRegenConfig(req: WindowRegenRequest): {
  config: PlanConfig;
  athleteData: PlanAthleteData;
  expectedWeeks: number;
} {
  const windowSize = req.toWeek - req.fromWeek + 1;
  const pastWeeks = req.currentPlan.weeks.filter((w) => w.weekNumber < req.fromWeek);
  const futureWeeks = req.currentPlan.weeks.filter((w) => w.weekNumber > req.toWeek);

  const pastSummary = summarizePastWeeks(pastWeeks);
  const futureAnchor = futureWeeks[0]
    ? `Sem ${futureWeeks[0].weekNumber} qui suit = ${futureWeeks[0].phase || futureWeeks[0].theme}.`
    : "Pas de semaines après la fenêtre — la dernière semaine régénérée doit clôturer le bloc.";

  const constraintsBlock = [
    req.baseConfig.constraints ?? "",
    "",
    `🔄 RÉGÉNÉRATION PARTIELLE — Fenêtre ${windowSize} semaines (S${req.fromWeek}→S${req.toWeek} dans le plan global).`,
    `Génère ces ${windowSize} semaines numérotées 1 à ${windowSize} (elles seront renumérotées).`,
    "",
    `📚 CONTEXTE PASSÉ (4 dernières semaines réalisées) :`,
    pastSummary,
    "",
    `🎯 ANCRAGE FUTUR : ${futureAnchor}`,
    "",
    `⚠️ Contraintes de continuité :`,
    `- Sem 1 doit raccorder progressivement avec ce qui précède (pas de saut brutal de charge)`,
    `- Dernière sem doit préparer la transition vers le futur`,
    req.reason ? `- Motif de la régénération : ${req.reason}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const windowConfig: PlanConfig = {
    ...req.baseConfig,
    weeksAvailable: windowSize,
    constraints: constraintsBlock,
    // On désactive la rampe initiale : on n'est PAS en début de prépa
    volumeRamp: undefined,
  };

  return { config: windowConfig, athleteData: req.athleteData, expectedWeeks: windowSize };
}

/**
 * Fusionne les semaines régénérées dans le plan existant.
 * - Renumérote les semaines IA (1..N) vers (fromWeek..toWeek)
 * - Remplace les semaines de la fenêtre dans `currentPlan`
 * - Préserve passé et futur intacts
 */
export function mergeWindowIntoPlan(
  currentPlan: ParsedPlan,
  windowPlan: ParsedPlan,
  fromWeek: number,
  toWeek: number
): ParsedPlan {
  const windowSize = toWeek - fromWeek + 1;
  // Map sem 1..N → fromWeek..toWeek
  const renumbered: ParsedWeek[] = windowPlan.weeks
    .slice(0, windowSize)
    .map((w, i) => {
      const targetNum = fromWeek + i;
      return {
        ...w,
        weekNumber: targetNum,
        sessions: w.sessions.map((s) => ({ ...s, weekNumber: targetNum })),
      };
    });

  const past = currentPlan.weeks.filter((w) => w.weekNumber < fromWeek);
  const future = currentPlan.weeks.filter((w) => w.weekNumber > toWeek);

  return {
    ...currentPlan,
    weeks: [...past, ...renumbered, ...future].sort((a, b) => a.weekNumber - b.weekNumber),
  };
}
