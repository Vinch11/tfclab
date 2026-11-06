/* eslint-disable */
// TEST ONLY: diagnostic callback preserved from main e31ffaba7, before DET integration.
// Never imported by application code. No new physiological model.
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

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function legacyAppDiagnostic(athlete: any, obj: string, amb: string, src: {snapshots: any[]; tests: any[]; checkins: any[]}): AthleteDiagnostic | null {
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

    return computeDiagnostic(diagnosticInput);
}
