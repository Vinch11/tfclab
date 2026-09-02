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
import { inferWeekType } from "./sessionSizingMatrix";
import { extractCatalogId } from "@/lib/catalogIdExtractor";

/** IDs signature du bloc LCW (Long Course Weekend) — cf. promptHelpers.ts
 *  "FORMAT LONG COURSE WEEKEND", checklist déclarée "bloquante". */
const LCW_SIGNATURE_IDS = ["B_LCW_BIKE_LONG_RACE_SAT", "B_LCW_RUN_OFF_LEGS_SUN", "B_LCW_BACK_TO_BACK_PEAK"];

/** Le plan entier (pas seulement la fenêtre régénérée) contient-il déjà au
 *  moins une occurrence de chaque fiche signature LCW ? Bug réel (coach) :
 *  régénérer une fenêtre ne changeait rien à l'absence du week-end LCW,
 *  parce que rien ne rappelait explicitement à l'IA que cette checklist
 *  multi-semaines n'était pas encore satisfaite ailleurs dans le plan. */
function planHasLcwSignature(plan: ParsedPlan): { hasBikeSat: boolean; hasRunSun: boolean; hasBackToBack: boolean } {
  const present = new Set<string>();
  for (const week of plan.weeks) {
    for (const s of week.sessions) {
      if (s.isRest) continue;
      const id = extractCatalogId(s.title, s.details, s.catalogId)?.toUpperCase();
      if (id) present.add(id);
    }
  }
  return {
    hasBikeSat: present.has("B_LCW_BIKE_LONG_RACE_SAT"),
    hasRunSun: present.has("B_LCW_RUN_OFF_LEGS_SUN"),
    hasBackToBack: present.has("B_LCW_BACK_TO_BACK_PEAK"),
  };
}

/**
 * Phase catalogue ("base"|"build"|"peak"|"taper") pour une semaine GLOBALE
 * donnée, avec les mêmes seuils que `inferPhaseFromWeek` côté edge
 * (jsonPlanHandler.ts) — utilisé pour garder cohérente la sélection du
 * catalogue envoyé à l'IA avec la résolution faite côté serveur.
 */
function catalogPhaseForGlobalWeek(globalWeek: number, globalTotalWeeks: number): "base" | "build" | "peak" | "taper" {
  const pct = globalWeek / Math.max(globalTotalWeeks, 1);
  if (pct <= 0.30) return "base";
  if (pct <= 0.70) return "build";
  if (pct <= 0.92) return "peak";
  return "taper";
}

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

  // ─── Position GLOBALE réelle de la fenêtre dans le plan complet ───────────
  // Sans ça, le pipeline traiterait la fenêtre comme un mini-plan frais de
  // `windowSize` semaines avec son propre cycle base/build/peak/taper — ex.
  // la dernière semaine de la fenêtre serait vue comme "taper" (>80% d'un
  // cycle de 4 sem) alors qu'elle est en plein bloc Build dans le plan réel.
  const globalTotalWeeks = req.currentPlan.totalWeeks;
  const globalWeekOffset = req.fromWeek - 1;
  const perWeekPhase: string[] = [];
  const phaseCounts: Record<string, number> = {};
  const periodizationLines: string[] = [];
  for (let i = 1; i <= windowSize; i++) {
    const globalWeek = i + globalWeekOffset;
    const phase = catalogPhaseForGlobalWeek(globalWeek, globalTotalWeeks);
    const weekType = inferWeekType(globalWeek, globalTotalWeeks, req.baseConfig.objective || "");
    perWeekPhase.push(phase);
    phaseCounts[phase] = (phaseCounts[phase] ?? 0) + 1;
    periodizationLines.push(
      `  - Sem locale ${i} (= S${globalWeek} globale) : phase "${phase}", type de semaine "${weekType}".`
    );
  }
  // Phase dominante de la fenêtre (majorité ; égalité → dernière semaine),
  // utilisée pour forcer le bon catalogue de séances côté edge.
  let dominantPhase = perWeekPhase[perWeekPhase.length - 1];
  let dominantCount = 0;
  for (const [phase, count] of Object.entries(phaseCounts)) {
    if (count > dominantCount) { dominantPhase = phase; dominantCount = count; }
  }

  // Rappel LCW explicite — bug réel (coach) : régénérer une fenêtre ne
  // suffisait pas à faire apparaître le week-end signature LCW parce que rien
  // ne signalait explicitement à l'IA que cette checklist multi-semaines
  // (promptHelpers.ts, "FORMAT LONG COURSE WEEKEND") n'était pas déjà
  // satisfaite ailleurs dans le plan. Ici on a la visibilité complète sur le
  // plan (passé + fenêtre), donc on peut vérifier réellement — pas deviner.
  const isLCWPlan = (req.baseConfig.raceGoals || []).some((g) => g?.raceFormat === "lcw_3day");
  let lcwReminderLines: string[] = [];
  if (isLCWPlan) {
    const existing = planHasLcwSignature(req.currentPlan);
    const missing: string[] = [];
    if (!existing.hasBikeSat) missing.push("`B_LCW_BIKE_LONG_RACE_SAT` (long ride race-pace samedi)");
    if (!existing.hasRunSun) missing.push("`B_LCW_RUN_OFF_LEGS_SUN` (long run jambes fatiguées dimanche)");
    if (missing.length > 0) {
      lcwReminderLines = [
        "",
        `🏴 FORMAT LCW — checklist "bloquante" ENCORE NON SATISFAITE sur le plan entier (passé + cette fenêtre) : ${missing.join(" et ")} n'apparaissent nulle part. Cette fenêtre DOIT inclure au moins un week-end SAMEDI+DIMANCHE consécutif avec ces deux IDs catalogue exacts — ne les remplace pas par des fiches génériques (brick T2 immédiat interdit).`,
      ];
    }
  }

  const constraintsBlock = [
    req.baseConfig.constraints ?? "",
    "",
    `🔄 RÉGÉNÉRATION PARTIELLE — Fenêtre ${windowSize} semaines (S${req.fromWeek}→S${req.toWeek} dans le plan global de ${globalTotalWeeks} semaines).`,
    `Génère ces ${windowSize} semaines numérotées 1 à ${windowSize} (elles seront renumérotées).`,
    "",
    `📅 PÉRIODISATION RÉELLE DE CHAQUE SEMAINE DE LA FENÊTRE (position dans le plan GLOBAL, pas un cycle isolé) :`,
    ...periodizationLines,
    ...lcwReminderLines,
    "",
    `📚 CONTEXTE PASSÉ (4 dernières semaines réalisées) :`,
    pastSummary,
    "",
    `🎯 ANCRAGE FUTUR : ${futureAnchor}`,
    "",
    `⚠️ Contraintes de continuité :`,
    `- Sem 1 doit raccorder progressivement avec ce qui précède (pas de saut brutal de charge)`,
    `- Dernière sem doit préparer la transition vers le futur`,
    `- Respecte STRICTEMENT la phase/type indiqués ci-dessus pour chaque semaine locale — ce n'est PAS un mini-plan autonome, c'est un extrait d'un plan de ${globalTotalWeeks} semaines.`,
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
    // Position globale pour la périodisation côté client (catalogues, quotas)
    // et côté edge (sélection du catalogue de phase) — cf. PlanConfig doc.
    globalTotalWeeks,
    globalWeekOffset,
    windowRegenPhase: dominantPhase,
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
