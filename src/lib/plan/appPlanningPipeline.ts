/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Pipeline de planification de la page /plan-ia, extrait TEL QUEL de
 * AITrainingPlanPage (buildDiagnosticForAthlete, computeAthleteContext,
 * buildConfigFromDiag) pour être appelé à l'identique par la page et par les
 * tests d'intégration. Aucun changement d'équation ni de calibration.
 */
import { differenceInCalendarDays, parseISO, format, startOfDay } from "date-fns";
import type { PlanAthleteData, PlanConfig, RaceGoal } from "@/hooks/useAITrainingPlan";
import { computeDiagnostic, type AthleteDiagnostic, type DiagnosticInput } from "@/engines/diagnostic";
import { prepareTrainingPlanContext } from "@/engines/plan/prepareTrainingPlanContext";
import { buildPlanAthleteDataFromDiagnostic, type PlanFormConfig } from "@/engines/plan";
import { analyzeCriticalPower } from "@/lib/v2/criticalPowerModel";
import { getEffectiveRefs, computeFtpKg } from "@/lib/effectiveRefs";
import { normalizeAmbitionLevel } from "@/types/ambitionLevel";
import { AMBITIONS as RACE_AMBITIONS } from "@/lib/raceAnalysis";
import { computeVLamaxEffectif } from "@/lib/vlamaxEffectif";
import { mapSnapshotToV2 } from "@/lib/mapSnapshotToV2";
import { predictRaceDurationMin, AMBITION_LEVEL_TO_PREDICTOR } from "@/lib/raceTimePredictor";
import { computeFatMaxAnchorPctFTP } from "@/lib/v2/fatmaxTFCL";

export const OBJECTIVE_OPTIONS = [
  { value: "IM", label: "Ironman" },
  { value: "703", label: "Ironman 70.3" },
  { value: "Marathon", label: "Marathon" },
  { value: "Semi", label: "Semi-Marathon" },
  { value: "10K", label: "10 km" },
  { value: "StartToRun", label: "Start to Run (débutant · marche-course)" },
  { value: "TrailShort", label: "Trail court (20-40 km)" },
  { value: "TrailMountain", label: "Trail montagne (40-80 km)" },
  { value: "TrailUltra", label: "Ultra trail (80 km+)" },
];

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export interface AppAthleteSources { snapshots: any[]; tests: any[]; checkins: any[] | null | undefined }
export interface AppAthleteContext { data: PlanAthleteData; diagnostic: AthleteDiagnostic }

export function buildAppDiagnosticInput(athlete: any, obj: string, amb: string, src: AppAthleteSources): DiagnosticInput {
    const athleteSnapshots = src.snapshots;
    const athleteTests = src.tests;
    const refs = getEffectiveRefs(athlete, athleteSnapshots);
    // Coach form entry point: allow a synthetic (empty) snapshot when the athlete
    // has no lab data yet. The coach form injects limiters manually downstream,
    // so the diagnostic just needs a shape to hydrate from refs (fcMax/ftp/vma/css).
    const activeSnap: any = refs.snapshotUsed ?? {};

    const ftpKg = computeFtpKg(refs);

    // Compute W' for diagnostic input
    const cpResult = analyzeCriticalPower({
      pmax_5s: activeSnap.pmax_5s,
      p30s_w: activeSnap.p30s_w,
      p60s_w: activeSnap.p60s_w,
      map5min_w: activeSnap.map5min_w,
      ftp: refs.ftp,
    });

    const age = calculateAge(athlete.birth_date ?? athlete.dateNaissance ?? null);

    // Determine sportFocus from objectif first (running objectives → "run"),
    // then fall back to snapshot.sport_main. This guarantees that for a runner
    // (Marathon, Semi, 10km, 5K, Trail, TrailLong, Ultra), the limiter engine
    // uses VMA instead of FTP/kg as the aerobic-expression metric, even if the
    // active snapshot still has bike data attached.
    // Running objectives use raw form values from OBJECTIVE_OPTIONS.
    // We list both raw + normalized aliases to be robust to upstream changes.
    const RUNNING_OBJECTIVES = new Set([
      "Marathon", "Semi", "10K", "10km", "5K",
      "StartToRun", "starttorun",
      "Trail", "TrailShort", "TrailMountain", "TrailLong", "TrailUltra", "Ultra",
    ]);
    const sportFocus: "run" | "bike" =
      RUNNING_OBJECTIVES.has(obj) || activeSnap.sport_main === "run"
        ? "run"
        : "bike";

    // ✅ Alignement Dashboard (Index.tsx) — précalcul des inputs partagés
    // pour garantir que le diagnostic du plan IA part exactement du même
    // état que le dashboard : VLamax effectif fusionné, FatMax canonique,
    // durée cible course (F-24) et dernier check-in.
    const vlamaxEffectifPrecomputed = computeVLamaxEffectif({
      athleteId: athlete.id,
      objectif: obj,
      activeSnapshotId: athlete.active_snapshot_id,
      tests: athleteTests.map(t => ({
        athlete_id: t.athlete_id,
        vlamax: t.vlamax,
        date: t.date,
        type: t.type,
        name: t.name,
      })),
      snapshots: athleteSnapshots.map(mapSnapshotToV2),
    });

    const raceChronos = {
      time_5k_sec: (activeSnap as any).time_5k_sec ?? null,
      time_10k_sec: (activeSnap as any).time_10k_sec ?? null,
      time_20k_sec: (activeSnap as any).time_20k_sec ?? null,
      time_half_sec: (activeSnap as any).time_half_sec ?? null,
      time_marathon_sec: (activeSnap as any).time_marathon_sec ?? null,
      time_5k_date: (activeSnap as any).time_5k_date ?? null,
      time_10k_date: (activeSnap as any).time_10k_date ?? null,
      time_20k_date: (activeSnap as any).time_20k_date ?? null,
      time_half_date: (activeSnap as any).time_half_date ?? null,
      time_marathon_date: (activeSnap as any).time_marathon_date ?? null,
    };
    const targetRaceDurationMin = predictRaceDurationMin({
      objective: obj,
      ambition: AMBITION_LEVEL_TO_PREDICTOR[normalizeAmbitionLevel(amb)],
      raceChronos,
      vmaKmh: refs.vma ?? null,
      thresholdPaceSecPerKm: (activeSnap as any).pace_threshold_sec_km ?? activeSnap.pace_threshold_sec_per_km ?? null,
      ftp: refs.ftp ?? null,
      weightKg: refs.weightKg ?? null,
      vlamaxRun: vlamaxEffectifPrecomputed.value ?? null,
    })?.targetRaceDurationMin ?? null;

    const latestCheckin = (src.checkins ?? [])
      .slice()
      .sort((a, b) => new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime())[0] ?? null;

    // Build DiagnosticInput and delegate to the Diagnostic Engine
    const diagnosticInput: DiagnosticInput = {
      athleteId: athlete.id,
      athleteName: athlete.name,
      age,
      sex: (athlete.sex === "M" || athlete.sex === "F") ? athlete.sex : null,
      weightKg: refs.weightKg,
      objectif: obj,
      ambition: normalizeAmbitionLevel(amb),
      sportFocus,
      vo2max: refs.vo2max,
      ftp: refs.ftp,
      ftpKg,
      pmax5s: activeSnap.pmax_5s,
      p30sW: activeSnap.p30s_w,
      p60sW: activeSnap.p60s_w,
      map5minW: activeSnap.map5min_w,
      vma: refs.vma,
      css: refs.css,
      vlamax: activeSnap.vlamax,
      vlamaxRun: activeSnap.vlamax_run,
      vlamaxSource: activeSnap.vlamax_source,
      vlamaxProtocol: activeSnap.vlamax_protocol,
      vlamaxIsReference: activeSnap.vlamax_is_reference ?? false,
      vlamaxEffectifPrecomputed,
      tteObservedMin: activeSnap.tte_observed_min,
      tteObservedMinRun: (activeSnap as any).tte_observed_min_run ?? null,
      tteMode: activeSnap.tte_mode,
      tss7d: activeSnap.tss_7d,
      snapshotDate: activeSnap.date ?? null,
      fatigueState: activeSnap.fatigue_state,
      runEconomyScore: activeSnap.run_economy_score,
      runHrDriftPct: activeSnap.run_hr_drift_pct,
      paceThresholdSecPerKm: activeSnap.pace_threshold_sec_per_km,
      runningPower1s: activeSnap.running_power_1s,
      runningPower5s: activeSnap.running_power_5s,
      runningPower30s: activeSnap.running_power_30s,
      runningPower60s: activeSnap.running_power_60s,
      runningPower5min: activeSnap.running_power_5min,
      runningPowerThreshold: activeSnap.running_power_threshold,
      sprint15sDistance: activeSnap.sprint_15s_distance,
      bikeCadenceRpm: activeSnap.bike_cadence_rpm,
      bikeHrDriftFlag: activeSnap.bike_hr_drift_flag ?? false,
      protocolQuality: activeSnap.protocol_quality,
      wprimeKj: cpResult?.wprimeKJ ?? null,
      cpDataQuality: cpResult?.dataQuality ?? null,
      fatmax: computeFatMaxAnchorPctFTP(vlamaxEffectifPrecomputed.value, refs.vo2max ?? null),
      forceDevMode: activeSnap.force_development_mode ?? false,
      giIssuesFlag: activeSnap.gi_issues_flag ?? false,
      checkinData: latestCheckin ? {
        sleep: latestCheckin.sleep,
        fatigue: latestCheckin.fatigue,
        soreness: latestCheckin.soreness,
        stress: latestCheckin.stress,
        motivation: latestCheckin.motivation,
        painFlag: latestCheckin.pain_flag ?? false,
      } : undefined,
      raceChronos,
      targetRaceDurationMin,
    };

    return diagnosticInput;
}

export function computeAppAthleteContext(athlete: any, obj: string, amb: string, src: AppAthleteSources): AppAthleteContext | null {
  const diagnostic = computeDiagnostic(buildAppDiagnosticInput(athlete, obj, amb, src));
  if (!diagnostic) return null;
  const data = buildPlanAthleteDataFromDiagnostic(diagnostic);
  const refs = getEffectiveRefs(athlete, src.snapshots);
  data.fcMax = refs.fcMax;
  if (!data.sex && athlete.sex) data.sex = athlete.sex;
  return { data, diagnostic };
}

export interface AppPlanFormState {
  objective: string; ambition: string; planStartDate: Date;
  raceName: string; raceDate: string; raceTargetMinutes?: string; raceFormat: any; raceGoals: Array<{ objective: string; raceName?: string; raceDate?: string; priority: any; targetTimeMinutes?: number | null }>;
  trailDistanceKm: string; trailElevationM: string; trailTargetTimeH: string; trailMaxAltitudeM: string;
  weeksAvailable: number | null | undefined; weeklyHours: string; sessionsPerWeek: string; maxSessionsPerDay: string; strengthSessionsPerWeek: string;
  deloadCadence: string; constraints: string; trainingLevel: string; terrainAvailability: string; lockAmbition: boolean;
  crossTrainingVelo: any; crossTrainingNatation: any;
  chronicWeeklyHours: string; recentWeeklyHours: string; recentWeeksCount: string; maxDoubleDaysPerWeek: string;
  coachLimiterOrder: string[]; currentAthleteId?: string;
}

export function buildAppPlanFormConfig(st: AppPlanFormState, athleteAmbition?: string, objectiveOverride?: string): PlanFormConfig {
  const { objective, ambition, planStartDate, raceName, raceDate, raceFormat, raceGoals, trailDistanceKm, trailElevationM, trailTargetTimeH, trailMaxAltitudeM,
    weeksAvailable, weeklyHours, sessionsPerWeek, maxSessionsPerDay, strengthSessionsPerWeek, deloadCadence, constraints, trainingLevel, terrainAvailability,
    lockAmbition, crossTrainingVelo, crossTrainingNatation, chronicWeeklyHours, recentWeeklyHours, recentWeeksCount, maxDoubleDaysPerWeek } = st;
    const amb = athleteAmbition || ambition;
    // ⚠️ setObjective() est asynchrone : le wizard doit pouvoir imposer son
    // objectif immédiatement, sinon la config part sur l'objectif précédent
    // (ex. plan "Semi-Marathon" généré alors que le coach a choisi Start to Run).
    const objEff = objectiveOverride || objective;


    // Build raceGoals array for multi-objEff
    const computeWeeksUntilRace = (date?: string) => {
      if (!date) return undefined;
      try {
        const race = startOfDay(parseISO(date));
        const start = startOfDay(planStartDate);
        const days = differenceInCalendarDays(race, start);
        return days >= 0 ? Math.floor(days / 7) + 1 : undefined;
      } catch {
        return undefined;
      }
    };

    const allRaceGoals: RaceGoal[] = [];
    // Parse trail target time "h:mm" → minutes
    const parseTargetTimeMin = (s: string): number | null => {
      if (!s) return null;
      const m = s.match(/^(\d{1,2})\s*[:hH]\s*(\d{0,2})$/);
      if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2] || "0", 10);
      const asInt = parseInt(s, 10);
      return Number.isFinite(asInt) && asInt > 0 ? asInt : null;
    };
    // Les champs distance/D+/temps/altitude sont saisis dans la section TRAIL du
    // formulaire uniquement. Pour tout objectif standard (semi/marathon/10K/IM/…),
    // la distance est CANONIQUE (dérivée de l'objectif côté promptHelpers) — on ne
    // laisse PAS un `trailDistanceKm` résiduel écraser cette valeur.
    const isTrailPrimary = (objEff || "").toLowerCase().startsWith("trail");
    const trailDistKm = isTrailPrimary ? (parseFloat(trailDistanceKm) || null) : null;
    const trailDPlus = isTrailPrimary ? (parseInt(trailElevationM, 10) || null) : null;
    const trailTargetMin = isTrailPrimary ? parseTargetTimeMin(trailTargetTimeH) : null;
    const trailMaxAlt = isTrailPrimary ? (parseInt(trailMaxAltitudeM, 10) || null) : null;
    // Primary objEff = A
    allRaceGoals.push({
      objective: OBJECTIVE_OPTIONS.find(o => o.value === objEff)?.label || objEff,
      raceName: raceName || undefined,
      raceDate: raceDate || undefined,
      weeksUntilRace: computeWeeksUntilRace(raceDate),
      priority: "A",
      raceFormat: (objEff === "703" || objEff === "70.3") ? raceFormat : "continuous",
      distanceKm: trailDistKm,
      elevationGainM: trailDPlus,
      targetTimeMinutes: isTrailPrimary ? trailTargetMin : (st.raceTargetMinutes?.trim() ? Number(st.raceTargetMinutes) : null),
      maxAltitudeM: trailMaxAlt,
    });
    // Additional goals
    for (const g of raceGoals) {
      allRaceGoals.push({
        objective: OBJECTIVE_OPTIONS.find(o => o.value === g.objective)?.label || g.objective,
        raceName: g.raceName || undefined,
        raceDate: g.raceDate || undefined,
        weeksUntilRace: computeWeeksUntilRace(g.raceDate),
        priority: g.priority,
        ...(g.targetTimeMinutes !== undefined ? { targetTimeMinutes: g.targetTimeMinutes } : {}),
      });
    }

    const formConfig: PlanFormConfig = {
      objective: OBJECTIVE_OPTIONS.find(o => o.value === objEff)?.label || objEff,
      raceName: raceName || undefined,
      raceDate: raceDate || undefined,
      raceGoals: allRaceGoals,
      planStartDate: format(planStartDate, "yyyy-MM-dd"),
      weeksAvailable: weeksAvailable ?? undefined,
      weeklyHours: parseFloat(weeklyHours) || undefined,
      sessionsPerWeek: (() => {
        const n = parseInt(sessionsPerWeek);
        if (!Number.isFinite(n) || n <= 0) return undefined;
        // (a) — Conflit sessionsPerWeek utilisateur vs recommandation ambition (qualitesParSemaine = proxy min).
        // Règle : le formulaire PRIME. On log une alerte si l'utilisateur descend en dessous du minimum
        // requis pour placer les séances de qualité de son ambition.
        try {
          const ambKey = (amb || "").toLowerCase();
          const ambDef = RACE_AMBITIONS.find((a: any) => a.key === ambKey || a.label?.toLowerCase() === ambKey);
          const minRec = ambDef?.qualitesParSemaine;
          if (typeof minRec === "number" && n < minRec) {
            // eslint-disable-next-line no-console
            console.warn(`⚠️ sessionsPerWeek user (${n}) < recommandé ambition (${minRec}) — le formulaire prime, l'IA sera forcée à ${n} séances/sem.`);
          }
        } catch { /* noop */ }
        return n;
      })(),
      maxSessionsPerDay: parseInt(maxSessionsPerDay) || undefined,
      strengthSessionsPerWeek: parseInt(strengthSessionsPerWeek) || undefined,
      deloadCadenceWeeks: deloadCadence === "auto" ? undefined : (parseInt(deloadCadence, 10) as 3 | 4),
      // ⚠️ NE PAS résoudre `amb` (clé canonique, ex. "world_class") vers son label
      // AMBITION_OPTIONS ici : ce label inclut l'icône emoji ("👑 Elite"), et
      // `normalizeAmbitionLevel` (appelé plus loin par computeAmbitionEffective)
      // échoue silencieusement sur ce préfixe et retombe sur DEFAULT_AMBITION
      // ("Confirmé") — bug réel : "Ambition visée" affichait Confirmé au lieu
      // d'Elite malgré "Verrouiller l'ambition". `buildPlanConfigFromDiagnostic`
      // re-dérive de toute façon un label propre depuis la clé résolue.
      ambition: amb,
      constraints: constraints || undefined,
      trainingLevel: trainingLevel === "auto" ? undefined : (trainingLevel as any),
      terrainAvailability: terrainAvailability === "auto" ? undefined : (terrainAvailability as any),
      lockAmbition,
      crossTrainingMaintenance: { velo: crossTrainingVelo, natation: crossTrainingNatation },
      // Correction sprint qualité Marathon/Ironman (oct. 2026), #E : simple
      // passthrough déclaratif (heures) — jamais consommé par ce builder
      // pour la rampe de volume/weeklyHours (voir PlanConfig.loadHistory).
      loadHistory: (() => {
        const chronic = parseFloat(chronicWeeklyHours);
        const recent = parseFloat(recentWeeklyHours);
        const weeks = parseInt(recentWeeksCount, 10);
        const hasAny = Number.isFinite(chronic) || Number.isFinite(recent) || Number.isFinite(weeks);
        if (!hasAny) return undefined;
        return {
          chronicWeeklyHours: Number.isFinite(chronic) && chronic > 0 ? chronic : undefined,
          recentWeeklyHours: Number.isFinite(recent) && recent > 0 ? recent : undefined,
          recentWeeksCount: Number.isFinite(weeks) && weeks > 0 ? weeks : undefined,
        };
      })(),
      maxDoubleDaysPerWeek: (() => {
        const n = parseInt(maxDoubleDaysPerWeek, 10);
        // Correction #F : 0 est une valeur significative ("aucune journée
        // double autorisée"), distincte de "champ absent" — ne pas la
        // perdre en la traitant comme falsy.
        return Number.isFinite(n) && n >= 0 ? n : undefined;
      })(),
    };

    return formConfig;
}

/** `buildConfigFromDiag` de la page : formulaire → prepareTrainingPlanContext → planConfig (+ athleteId). */
export function buildAppPlanConfig(
  diagnostic: AthleteDiagnostic, st: AppPlanFormState,
  athleteAmbition?: string, objectiveOverride?: string, athleteIdOverride?: string,
): PlanConfig {
  const { coachLimiterOrder, currentAthleteId } = st;
  const formConfig = buildAppPlanFormConfig(st, athleteAmbition, objectiveOverride);
    const built = prepareTrainingPlanContext({
      diagnostic,
      formConfig,
      coachLimiterOrder: coachLimiterOrder.length > 0 ? coachLimiterOrder : undefined,
    }).planConfig;
    // P3 diversité : l'ID athlète permet de charger l'historique de fiches déjà servies.
    return { ...built, athleteId: athleteIdOverride ?? currentAthleteId };
}
