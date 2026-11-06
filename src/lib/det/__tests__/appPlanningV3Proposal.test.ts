import { prepareGenerationContracts } from '@/lib/plan/prepareGenerationContracts';
import { planningInputFor } from '../appPlanningInput';
import { beforeAll, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { computeAppAthleteContext, buildAppPlanConfig, type AppPlanFormState } from '@/lib/plan/appPlanningPipeline';
import { freezeAppPlanningInput } from '../appPlanningInput';
import { filterDraftV3Sources } from '../appPlanningDetDraft';
import { generateAppPlanningV3Proposal } from '../appPlanningV3Proposal';
import { findSource } from '../coachDetContext';

const ATHLETE = 'SYNTHETIC_DRAFT_A';
async function shared(objective = 'Ironman 70.3', weeks = 12, hours = 10, limiters?: string[], overrides: Partial<AppPlanFormState> = {}) {
  const athlete = { id: ATHLETE, name: 'SYNTHETIC DRAFT ONLY', birth_date: '1991-01-01', sex: 'M', active_snapshot_id: 'SYNTH_SNAP', refs: {} };
  const snapshots = [{ id: 'SYNTH_SNAP', athlete_id: ATHLETE, date: '2026-11-04', source: 'manual', sport_main: 'tri', vma: 18, ftp: 300, css: 95, pace_threshold_sec_per_km: 240, tss_7d: 380, fatigue_state: 'ok', vo2max: 58, weight_kg: 72, fc_max: 188 }];
  const ctx = computeAppAthleteContext(athlete, objective, 'age_group', { snapshots, tests: [], checkins: [] })!;
  const st: AppPlanFormState = { objective, ambition: 'age_group', planStartDate: new Date(2026,10,2), raceName: '', raceDate: new Date(Date.UTC(2026,10,2 + weeks * 7 - 1)).toISOString().slice(0,10), raceFormat: 'continuous', raceGoals: [], trailDistanceKm: '', trailElevationM: '', trailTargetTimeH: '', trailMaxAltitudeM: '', weeksAvailable: weeks, weeklyHours: String(hours), sessionsPerWeek: /Ironman/.test(objective) ? '8' : '4', maxSessionsPerDay: '2', strengthSessionsPerWeek: '1', deloadCadence: 'auto', constraints: '', trainingLevel: 'auto', terrainAvailability: 'auto', lockAmbition: false, crossTrainingVelo: false, crossTrainingNatation: false, chronicWeeklyHours: '', recentWeeklyHours: '', recentWeeksCount: '', maxDoubleDaysPerWeek: '', coachLimiterOrder: [], currentAthleteId: ATHLETE, ...overrides };
  const config = buildAppPlanConfig(ctx.diagnostic, st);
  if (limiters) {
    // Isolated prioritization probe: no competing prohibition/risk filter.
    // The real unmodified-pipeline cases above/below retain those filters.
    config.identifiedLimitersRaw = limiters; config.prohibitions = []; config.injuryRisk = undefined;
  }
  return freezeAppPlanningInput({ athleteId: ATHLETE, athlete: ctx.data, config, planStartDate: '2026-11-02', appAutomaticLimiters: config.identifiedLimitersRaw ?? [], coachOverride: limiters ?? null });
}
beforeAll(() => { vi.spyOn(console,'log').mockImplementation(() => {}); vi.spyOn(console,'warn').mockImplementation(() => {}); vi.spyOn(globalThis,'fetch').mockImplementation(() => { throw Error('NETWORK_FORBIDDEN'); }); });

describe('full V3 source proposal from the existing app profile',()=>{
 it.each([['Ironman 70.3',12,10],['Marathon',16,8],['Marathon',40,9],['Semi',8,6]] as const)('%s / %s weeks: a chosen bounded V3 prescription in every non-race slot',async(objective,weeks,hours)=>{
  const app=await shared(objective,weeks,hours),before=JSON.stringify(app);
  const plan=await generateAppPlanningV3Proposal(app,ATHLETE);
  expect(plan.weeks).toHaveLength(weeks);
  expect(plan.prescriptionAllowed).toBe(false);expect(plan.sourceReview).toBe('pending');
  expect(plan.limiterOrder).toEqual(app.limiters.applied);
  expect(plan.planningInputFingerprint).toBe(app.fingerprint);
  expect(plan.eventCalendar).toEqual(app.config.raceGoals??[]);
  for(const week of plan.weeks){
   expect(week.days).toHaveLength(7);expect(week.knownMinutes).toBeLessThanOrEqual(hours*60+1e-7);
   const ids=week.days.flatMap(d=>d.sessions.flatMap(s=>s.components.map(c=>c.sourceId)));
   expect(new Set(ids).size).toBe(ids.length);
   for(const day of week.days)for(const session of day.sessions){
    expect(session.components.length).toBe(session.role==='race'?0:session.sport==='brick'?2:1);
    for(const part of session.components){expect(findSource(part.sourceId)?.title).toBe(part.title);expect(part.blocks.length).toBeGreaterThan(0);}
   }
  }
  expect(JSON.stringify(app)).toBe(before);
  expect(JSON.stringify(plan)).not.toContain('individualCoachApproval');
  expect(JSON.stringify(plan)).not.toContain('coach_confirmed');
  expect(plan).toEqual(await generateAppPlanningV3Proposal(app,ATHLETE));
 },60000);
 it('does not infer swimming domain paces from CSS95 and retains a pending total',async()=>{
  const p=await generateAppPlanningV3Proposal(await shared(),ATHLETE);
  const swims=p.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions.flatMap(s=>s.components))).filter(c=>c.sport==='swim');
  expect(swims.length).toBeGreaterThan(0);expect(swims.filter(c=>c.distanceM>0).every(c=>c.durationMinutes===null)).toBe(true);
  expect(p.checks.some(c=>c.code==='individual_targets'&&c.message.includes('swim_domain_pace'))).toBe(true);
  expect(p.weeks.every(w=>w.durationMinutes===null)).toBe(true);
 });
 it('refuses an injured context and another athlete without inventing replacement sessions',async()=>{
  const app=await shared();
  await expect(generateAppPlanningV3Proposal(app,ATHLETE,{injuryScreen:'contraindication'})).rejects.toThrow('aucune dose');
  await expect(generateAppPlanningV3Proposal(app,'OTHER')).rejects.toThrow('différent');
  await expect(generateAppPlanningV3Proposal(await shared('Ironman 70.3',12,10,['UNKNOWN']),ATHLETE)).rejects.toThrow('non raccordé');
 });
});

it('V3 domains prevent ordinary strength repetitions being treated as banned VO2 blocks',async()=>{
 const source=findSource('V3P_STRENGTH_101')!,vo2=findSource('V3P_RUN_167')!;
 const config={prohibitions:['🚫 RESTRICTION VO2max LOURD']};
 expect(filterDraftV3Sources([source,vo2],config,{}).map(s=>s.id)).toEqual([source.id]);
 expect(filterDraftV3Sources([source],config,{presentContraindications:[source.contraindications[0]]})).toEqual([]);
});
