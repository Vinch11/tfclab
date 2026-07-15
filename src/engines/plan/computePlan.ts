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
import { normalizeWeeksAndPhases } from "./normalizeWeeksPhases";
import { deriveTriathlonZones } from "@/lib/v2/triathlonZones";
import { deriveRaceTargets, formatSecPerKm } from "@/lib/deriveRaceTargets";
import { postProcessSessionText } from "./sessionTextPostProcessor";

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
 * ═══════════════════════════════════════════════════════════════════════════════
 * DERIVED RACE STAGE HINTS — Source unique = triathlonZones + deriveRaceTargets
 * ═══════════════════════════════════════════════════════════════════════════════
 * P0.1 fix : élimine tout template texte de cibles course en dur (ex:
 * "80-85% FTP", "60-80g/h") et construit chaque étape à partir du snapshot.
 * Si l'IA a laissé traîner des valeurs de cibles dans le JSON, elles sont
 * IGNORÉES et surchargées (log warning "race_block_target_overridden").
 * Si snapshot manquant → texte "Cibles course : données insuffisantes"
 * (jamais de valeur par défaut inventée).
 */

function fmtCssPace(cssSecPer100m: number | null | undefined): string | null {
  if (!cssSecPer100m || cssSecPer100m <= 0) return null;
  const m = Math.floor(cssSecPer100m / 60);
  const s = Math.round(cssSecPer100m - m * 60);
  return `${m}:${String(s).padStart(2, "0")}/100m`;
}

/** Nutrition CHO/h dérivée : Ironman 90 g/h, 70.3 80 g/h, run route 60 g/h.
 *  Valeurs canoniques nutritionUnified (déjà utilisées ailleurs) — pas un template libre. */
function nutritionCarbsForObjective(obj: string): { bike: number; run: number } | null {
  const s = obj.toLowerCase();
  if (s.includes("ironman") && !s.includes("70.3")) return { bike: 90, run: 60 };
  if (s.includes("70.3") || s.includes("half") || s === "703") return { bike: 80, run: 60 };
  return null;
}

interface RaceStageHints {
  swim?: string;
  bike?: string;
  run?: string;
  /** Fallback single-day (marathon/semi/…) */
  single?: string;
}

function buildRaceStageHints(
  objective: string,
  ambition: string | undefined,
  athlete: PlanAthleteData | undefined,
): RaceStageHints {
  const amb = ambition || "age_group";
  const objLower = objective.toLowerCase();
  const isTri = objLower.includes("ironman") || objLower.includes("70.3") || objLower === "im" || objLower === "703";

  if (isTri) {
    const zones = deriveTriathlonZones({
      ftpW: athlete?.ftp ?? null,
      vmaKmh: athlete?.vma ?? null,
      objective,
      ambition: amb,
      tteMinBike: athlete?.tte ?? null,
    });
    const nut = nutritionCarbsForObjective(objective);
    const hints: RaceStageHints = {};

    const swimPace = fmtCssPace(athlete?.css);
    hints.swim = swimPace
      ? `Sighting régulier, allure CSS ~${swimPace}. Sortir frais.`
      : `Sighting régulier, allure CSS contrôlée. Sortir frais.`;

    if (zones.bike?.racePowerW) {
      const w = zones.bike.racePowerW;
      const pct = Math.round(zones.bike.raceIF * 100);
      const nutBike = nut ? ` Nutrition ${nut.bike} g CHO/h.` : "";
      const capNote = zones.bike.raceIfWasCapped ? " (bridé par TTE)" : "";
      hints.bike = `Puissance cible ${w}W (${pct}% FTP)${capNote}.${nutBike}`;
    } else {
      const nutBike = nut ? ` Nutrition ${nut.bike} g CHO/h.` : "";
      hints.bike = `Puissance cible : données FTP insuffisantes — cible à définir avec le coach.${nutBike}`;
    }

    if (zones.run?.racePaceSecPerKm) {
      const pace = formatSecPerKm(zones.run.racePaceSecPerKm);
      const nutRun = nut ? ` Nutrition ${nut.run} g CHO/h.` : "";
      hints.run = `Allure cible ${pace}.${nutRun} Pacing négatif split.`;
    } else {
      const nutRun = nut ? ` Nutrition ${nut.run} g CHO/h.` : "";
      hints.run = `Allure cible : données VMA insuffisantes.${nutRun} Pacing négatif split.`;
    }
    return hints;
  }

  // Single-day run objectives
  const tgt = deriveRaceTargets({
    vmaKmh: athlete?.vma ?? null,
    thresholdPaceSecPerKm: athlete?.paceThresholdSecPerKm ?? null,
    objective,
    ambition: amb,
  });
  if (tgt.source === "snapshot" && tgt.racePaceSecPerKm) {
    const pace = formatSecPerKm(tgt.racePaceSecPerKm);
    const nut = objLower.includes("marathon") ? 60 : objLower.includes("semi") ? 40 : 30;
    return { single: `Allure cible ${pace}. Nutrition ${nut} g CHO/h. Négatif split.` };
  }
  return { single: "Cibles course : données insuffisantes — exécution selon plan validé coach." };
}

/**
 * Ancrage automatique des jours de course :
 * 1. Pour chaque objectif (A/B/C), vérifie si la semaine cible contient un jour de course
 * 2. Si absent, injecte une séance "🏁 COURSE OBJECTIF" à la date exacte
 * 3. Si présent mais décalé (±1 semaine), recale vers la bonne semaine
 */
function anchorRaceDays(
  plan: ParsedPlan,
  config: PlanGenerationConfig,
  athlete?: PlanAthleteData,
): void {
  const goals = config.raceGoals;
  if (!goals?.length || !config.planStartDate) return;

  for (const goal of goals) {
    if (!goal.raceDate) continue;

    const targetWeekNum = getRaceWeekNumber(goal.raceDate, config.planStartDate, plan.weeks.length);
    const targetWeek = plan.weeks.find(w => w.weekNumber === targetWeekNum);
    if (!targetWeek) continue;

    const priorityLabel = goal.priority === "A" ? "🅰️" : goal.priority === "B" ? "🅱️" : "🅲";
    const raceName = goal.raceName || goal.objective;
    const stageHints = buildRaceStageHints(goal.objective, config.ambition, athlete);

    // ─── LCW (Long Course Weekend) — 3 jours éclatés (Ven nat / Sam vélo / Dim run) ───
    if ((goal as any).raceFormat === "lcw_3day") {
      const raceDate = new Date(goal.raceDate);
      const stages = [
        { offset: -2, sport: "🏊 Natation", stage: "Étape 1/3 — Natation", hint: `1.9 km. ${stageHints.swim ?? ""}` },
        { offset: -1, sport: "🚴 Vélo", stage: "Étape 2/3 — Vélo", hint: `90 km. ${stageHints.bike ?? ""} Refeed agressif post.` },
        { offset: 0, sport: "🏃 Course", stage: "Étape 3/3 — Course", hint: `21.1 km sur jambes pré-fatiguées. ${stageHints.run ?? ""}` },
      ];

      // Purge toute session existante sur les 3 jours LCW (récup, autres séances IA)
      const lcwDayIndices = new Set<number>();
      for (const st of stages) {
        const d = new Date(raceDate);
        d.setDate(d.getDate() + st.offset);
        lcwDayIndices.add(JS_TO_PLAN_DAY[d.getDay()]);
      }
      const purged = targetWeek.sessions.filter(s => lcwDayIndices.has(s.dayIndex));
      if (purged.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `race_block_target_overridden — S${targetWeekNum} LCW : ${purged.length} séance(s) IA purgée(s), remplacée(s) par cibles dérivées (triathlonZones + snapshot).`,
          purged.map(p => ({ title: p.title.slice(0, 60), details: p.details.slice(0, 80) }))
        );
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
          details: `Jour J${st.offset === 0 ? "" : st.offset} — ${raceName} (${dateStr}, format LCW 3 jours). ${st.hint}`.replace(/\s+/g, " ").trim(),
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
    const singleHint = stageHints.single ?? stageHints.run ?? "Exécuter le plan.";

    const raceSession: ParsedSession = {
      weekNumber: targetWeekNum,
      weekTheme: targetWeek.theme,
      phase: targetWeek.phase,
      dayName,
      dayIndex: planDayIndex,
      sport: "🏁 Course",
      title: `🏁 COURSE OBJECTIF ${priorityLabel} — ${raceName}`,
      details: `Jour J — ${raceName} (${goal.raceDate}). ${singleHint} Discipline > ambition.`,
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
    // parlent d'allure marathon (résidu de prompt example), on supprime la mention.
    // La cible correcte est réinjectée par anchorRaceDays via buildRaceStageHints.
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
          const before = s.details;
          s.details = s.details.replace(/allure\s+marathon\s+cible[^.]*\./gi, "").trim();
          // eslint-disable-next-line no-console
          console.warn(`race_block_target_overridden — S${week.weekNumber} ${s.dayName} : mention "allure marathon" retirée (objectif="${goal.objective}", avant: "${before.slice(0, 80)}…")`);
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
  // AUDIT Claude juillet 2026 : normalisation weekNumber + phase AVANT tout autre
  // post-processing → drop ghost weeks (ex: "S17" en plan 11 sem), ré-assigne
  // les phases depuis le recap canonique, nettoie les labels hors-range.
  const normStats = normalizeWeeksAndPhases(plan, config);
  if (normStats.droppedGhostWeeks.length > 0 || normStats.phaseReassignedCount > 0 || normStats.labelCleanedCount > 0) {
    // eslint-disable-next-line no-console
    console.log(`🧭 normalizeWeeksAndPhases — ghosts drop: [${normStats.droppedGhostWeeks.join(",")}] · phases reassignées: ${normStats.phaseReassignedCount} · labels nettoyés: ${normStats.labelCleanedCount}`);
  }

  anchorRaceDays(plan, config, athleteData);
  dedupRaceDays(plan, config);

  // PHASE 2C — dédup annotations "(X% FTP)" doublonnées + résolution des plages
  // de durée > 30 min d'amplitude dans les Main. Filet non silencieux.
  let totalDupCollapsed = 0, totalDupMismatched = 0, totalRangesResolved = 0;
  const postLogs: string[] = [];
  for (const w of plan.weeks) {
    for (const s of w.sessions) {
      const st = postProcessSessionText(s, config.ambition);
      totalDupCollapsed += st.duplicatesCollapsed;
      totalDupMismatched += st.duplicatesMismatched;
      totalRangesResolved += st.durationRangesResolved;
      for (const l of st.logs) postLogs.push(`S${w.weekNumber} ${s.dayName}: ${l}`);
    }
  }
  if (totalDupCollapsed || totalDupMismatched || totalRangesResolved) {
    // eslint-disable-next-line no-console
    console.warn(
      `🧹 sessionTextPostProcessor — collapsed=${totalDupCollapsed} mismatched=${totalDupMismatched} rangesResolved=${totalRangesResolved}`,
      postLogs,
    );
  }

  // #7 audit : calcul volume hebdo réel (remplace placeholder textuel identique)
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


