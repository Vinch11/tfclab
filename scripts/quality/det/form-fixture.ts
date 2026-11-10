import { buildAppPlanConfig, computeAppAthleteContext, type AppPlanFormState } from '@/lib/plan/appPlanningPipeline';

export interface Scenario {
  objective: string;
  weeks: number;
  hours: number;
  sessions?: number;
  distanceKm?: number;
  elevationM?: number;
}

export function inputFor(s: Scenario, trainingLevel: string, ambition: string, coachOrder: string[] = [], history: Partial<Pick<AppPlanFormState,'recentWeeklyHours' | 'recentWeeksCount'>> = {}, returnProfile=false) {
  const tri = ['703','IM','Sprint','Olympic'].includes(s.objective);
  const dedicated=s.objective.startsWith('Cyclisme')||s.objective.startsWith('Natation');
  const id = 'SYNTHETIC_DET_' + s.objective;
  const athlete = { id, name: 'Synthetic', objectif: dedicated?'703':s.objective, birth_date: '1988-03-11',
    sex: 'M', active_snapshot_id: 'SYNTHETIC_SNAPSHOT', refs: {} };
  const snapshot = { id: athlete.active_snapshot_id, athlete_id: id, date: '2026-11-04', source: 'manual',
    sport_main: tri ? 'tri' : s.objective.startsWith('Cyclisme') || s.objective==='CLM' ? 'bike' : s.objective.startsWith('Natation') ? 'swim' : 'run', vma: 18, ftp: 300, css: 95, pace_threshold_sec_per_km: 240,
    tss_7d: 380, fatigue_state: 'ok', vo2max: 58, weight_kg: 72, fc_max: 188,
    ...(s.objective === '10K' && !returnProfile ? { tte_observed_min_run: 25 } : {}),
    ...(returnProfile?{vma:13,ftp:170,pace_threshold_sec_per_km:380,tss_7d:90,vo2max:43,
      vlamax:0.65,vlamax_run:0.65,vlamax_source:'lab',vlamax_protocol:'SYNTHETIC LAB'}:{}) };
  const context = computeAppAthleteContext(athlete, s.objective, ambition, { snapshots: [snapshot], tests: [], checkins: [], programmeTarget:s.objective==='Cyclisme FTP'?320:s.objective==='Natation 1500m'?90:undefined });
  if (!context) throw Error('Synthetic snapshot did not produce an app diagnostic');
  const form: AppPlanFormState = {
    objective: s.objective, ambition, trainingLevel, planStartDate: new Date(2026, 10, 9),
    raceName: 'Synthetic ' + s.objective, raceDate: new Date(Date.UTC(2026, 10, 9 + s.weeks*7 - 1)).toISOString().slice(0, 10),
    raceFormat: 'continuous', raceGoals: [], trailDistanceKm: String(s.distanceKm ?? ''), trailElevationM: String(s.elevationM ?? ''),
    trailTargetTimeH: '', trailMaxAltitudeM: '', weeksAvailable: s.weeks, weeklyHours: String(s.hours),
    sessionsPerWeek: String(s.sessions ?? ''), maxSessionsPerDay: '2', strengthSessionsPerWeek: s.objective === 'Marathon' ? '2' : '1',
    deloadCadence: 'auto', constraints: '', terrainAvailability: 'auto', lockAmbition: false,
    crossTrainingVelo: false, crossTrainingNatation: false, chronicWeeklyHours: '', recentWeeklyHours: '', recentWeeksCount: '',
    maxDoubleDaysPerWeek: '', coachLimiterOrder: coachOrder, currentAthleteId: id, ...history,
  };
  const config = buildAppPlanConfig(context.diagnostic, form);
  return { athleteId: id, config, athlete: context.data, diagnostic: context.diagnostic, pageLimiterOrder: coachOrder };
}
