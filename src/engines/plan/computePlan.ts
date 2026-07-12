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
  PlanGenerationConfig,
  ParsedPlan,
  ParsedWeek,
  ParsedSession,
} from "./types";
import type { PlanAthleteData } from "@/hooks/useAITrainingPlan";
import { applyWbalRecoveryRecalc, type WbalRecalcStats } from "./wbalPostProcessor";
import { computeWeekVolumeMin, formatMinutesToHm } from "@/lib/weeklyVolumeEstimator";

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

    const priorityLabel = goal.priority === "A" ? "🅰️" : goal.priority === "B" ? "🅱️" : "🅲";
    const raceName = goal.raceName || goal.objective;
    const pacingHint = buildPacingHint(goal.objective);

    // ─── LCW (Long Course Weekend) — 3 jours éclatés (Ven nat / Sam vélo / Dim run) ───
    if ((goal as any).raceFormat === "lcw_3day") {
      const raceDate = new Date(goal.raceDate);
      const stages = [
        { offset: -2, sport: "🏊 Natation", stage: "Étape 1/3 — Natation", hint: "1.9 km. Sighting régulier. Sortir frais." },
        { offset: -1, sport: "🚴 Vélo", stage: "Étape 2/3 — Vélo", hint: "90 km. Puissance 80-85% FTP. Nutrition 80-90g CHO/h. Refeed agressif post." },
        { offset: 0, sport: "🏃 Course", stage: "Étape 3/3 — Course", hint: "21.1 km sur jambes pré-fatiguées. Pacing négatif split. Nutrition 60g/h." },
      ];

      // Purge toute session existante sur les 3 jours LCW (récup, autres séances IA)
      const lcwDayIndices = new Set<number>();
      for (const st of stages) {
        const d = new Date(raceDate);
        d.setDate(d.getDate() + st.offset);
        lcwDayIndices.add(JS_TO_PLAN_DAY[d.getDay()]);
      }
      targetWeek.sessions = targetWeek.sessions.filter(s => !lcwDayIndices.has(s.dayIndex));

      // Injecter les 3 étapes
      for (const st of stages) {
        const d = new Date(raceDate);
        d.setDate(d.getDate() + st.offset);
        const planDayIndex = JS_TO_PLAN_DAY[d.getDay()];
        const dayName = PLAN_DAY_NAMES[planDayIndex];
        const dateStr = d.toISOString().slice(0, 10);
        targetWeek.sessions.push({
          weekNumber: targetWeekNum,
          weekTheme: targetWeek.theme,
          phase: targetWeek.phase,
          dayName,
          dayIndex: planDayIndex,
          sport: st.sport,
          title: `🏁 COURSE OBJECTIF ${priorityLabel} — ${raceName} · ${st.stage}`,
          details: `Jour J${st.offset === 0 ? "" : st.offset} — ${raceName} (${dateStr}, format LCW 3 jours). ${st.hint} ${pacingHint}`,
          isRest: false,
        });
      }

      targetWeek.sessions.sort((a, b) => a.dayIndex - b.dayIndex);
      continue;
    }

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
 * Déduplication jour J : si une même semaine contient plusieurs séances "course objectif"
 * sur le même jour, on garde une seule (préférence à celle préfixée "🏁") et on log.
 * Corrige aussi les incohérences d'allure (ex: "allure marathon cible" pour un semi)
 * en réalignant sur `buildPacingHint(objective)` de l'objectif rattaché.
 */
function dedupRaceDays(plan: ParsedPlan, config: PlanGenerationConfig): void {
  const goals = config.raceGoals ?? [];
  for (const week of plan.weeks) {
    const byDay = new Map<number, ParsedSession[]>();
    for (const s of week.sessions) {
      const text = `${s.sport} ${s.title} ${s.details}`;
      if (RACE_DAY_PATTERNS.test(text)) {
        const arr = byDay.get(s.dayIndex) ?? [];
        arr.push(s);
        byDay.set(s.dayIndex, arr);
      }
    }
    for (const [, sessions] of byDay) {
      if (sessions.length <= 1) continue;
      const keeper = sessions.find(s => s.title.trim().startsWith("🏁")) ?? sessions[0];
      const dropped = sessions.filter(s => s !== keeper);
      week.sessions = week.sessions.filter(s => !dropped.includes(s));
      // eslint-disable-next-line no-console
      console.log(`🏁 course unique vérifiée — S${week.weekNumber} ${keeper.dayName} : ${dropped.length} doublon(s) supprimé(s) (gardé : "${keeper.title.slice(0, 60)}")`);
    }
    // Correction micro-cohérence : si l'objectif n'est pas marathon mais les détails
    // parlent d'allure marathon (résidu de prompt example), on substitue le pacing hint canonique.
    if (goals.length) {
      for (const s of week.sessions) {
        const text = `${s.sport} ${s.title} ${s.details}`;
        if (!RACE_DAY_PATTERNS.test(text)) continue;
        const goal = goals.find(g => {
          if (!g.raceDate || !config.planStartDate) return false;
          return getRaceWeekNumber(g.raceDate, config.planStartDate, plan.weeks.length) === week.weekNumber;
        }) ?? goals[0];
        const obj = (goal?.objective ?? "").toLowerCase();
        if (obj && !obj.includes("marathon") && /allure\s+marathon/i.test(s.details)) {
          const hint = buildPacingHint(goal.objective);
          const before = s.details;
          s.details = s.details.replace(/allure\s+marathon\s+cible[^.]*\./gi, "").trim();
          if (!s.details.includes(hint)) s.details = `${s.details} ${hint}`.trim();
          // eslint-disable-next-line no-console
          console.log(`🏁 pacing corrigé — S${week.weekNumber} ${s.dayName} : objectif="${goal.objective}" (avant: "${before.slice(0, 80)}…")`);
        }
      }
    }
  }
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
  dedupRaceDays(plan, config);

  // #7 audit : calcul volume hebdo réel (remplace placeholder textuel identique)
  const { computeWeekVolumeMin, formatMinutesToHm } = require("@/lib/weeklyVolumeEstimator");
  for (const w of plan.weeks) {
    const min = computeWeekVolumeMin(w);
    w.computedVolumeMin = min;
    w.computedVolumeStr = formatMinutesToHm(min);
  }

  let wbalStats: WbalRecalcStats | undefined;
  if (athleteData) {
    wbalStats = applyWbalRecoveryRecalc(plan, athleteData);
  }

  return { plan, wbalStats };
}


