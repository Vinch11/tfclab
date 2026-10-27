/** Read-only evidence, never a new training prescription or a substitute for validators. */
import type { ParsedPlan } from '@/lib/aiPlanParser';
import type { PlanConfig } from '@/hooks/useAITrainingPlan';
import type { LibraryWorkout } from '@/types/workoutLibrary';
import { WorkoutLibrary } from '@/lib/workoutLibrary';
import { normalizeObjectiveKey } from '@/lib/normalizeObjectiveKey';
import { isTrailWorkout } from '@/lib/plan/trailMarkers';
import { normalizeRepairSport } from '../../supabase/functions/_shared/repairSportingEquivalence';
import { catalogueTrainingMinimaForWeek } from '../../supabase/functions/_shared/catalogueTrainingMinima';
import { effectiveSessionQuota } from '../../supabase/functions/_shared/sessionQuotaAccounting';
import { isRaceDaySession } from '../../supabase/functions/_shared/raceDayIdentity';

export interface SportsAuditControl {
  id: string;
  execution: 'executed' | 'not_applicable' | 'not_implemented';
  result: 'pass' | 'fail' | 'unknown' | 'not_applicable';
  classification: 'contract' | 'descriptive' | 'expert_review';
  source: string;
  evidence: unknown;
}
export interface SportsAudit {
  objective: string;
  format: 'continuous' | 'lcw_3day';
  completeCalendar: boolean;
  controls: SportsAuditControl[];
}

/** Presence is checked against the existing quota, not a new universal weekly minimum.
 * Race/recovery weeks remain visible; no silent exemption from the timeline. */
export function auditSportsContinuity(plan: ParsedPlan | undefined, config: PlanConfig,
  library: readonly LibraryWorkout[] = WorkoutLibrary): SportsAudit {
  const objective = normalizeObjectiveKey(config.objective ?? '');
  const tri = ['IM', '703', 'Sprint', 'Olympic'].includes(objective);
  const trail = objective.startsWith('Trail');
  const format = config.raceGoals?.some(g => g.raceFormat === 'lcw_3day') ? 'lcw_3day' : 'continuous';
  const totalWeeks = config.weeksAvailable ?? plan?.totalWeeks ?? 0;
  const index = new Map((plan?.weeks ?? []).map(w => [w.weekNumber, w]));
  const completeCalendar = totalWeeks > 0 && index.size === totalWeeks &&
    (plan?.weeks.length ?? 0) === totalWeeks && Array.from({ length: totalWeeks }, (_, i) => i + 1).every(n => index.has(n));
  const controls: SportsAuditControl[] = [];
  controls.push({ id: 'calendar_coverage', execution: plan ? 'executed' : 'not_implemented', result: !plan ? 'unknown' : completeCalendar ? 'pass' : 'fail',
    classification: 'contract', source: 'PlanConfig.weeksAvailable; ParsedWeek.weekNumber',
    evidence: { expectedWeeks: totalWeeks, observedWeeks: [...index.keys()].sort((a,b) => a-b) } });
  const timeline = Array.from({ length: totalWeeks }, (_, i) => {
    const weekNumber = i + 1;
    const week = index.get(weekNumber);
    const quota = plan?.weeklyQuotas?.[weekNumber];
    const active = week?.sessions.filter(s => !s.isRest && s.sport !== 'rest' && !isRaceDaySession(s)) ?? [];
    const trainingMinima = quota ? catalogueTrainingMinimaForWeek(quota.quota, config, weekNumber) : undefined;
    const allBricks = week?.sessions.filter(s => !s.isRest && normalizeRepairSport(s.sport) === 'brick').length ?? 0;
    const effective = quota ? effectiveSessionQuota(quota.quota, allBricks) : undefined;
    const sports = Object.fromEntries(['swim', 'bike', 'run'].map(sport => {
      const sessions = active.filter(s => normalizeRepairSport(s.sport) === sport);
      const bricks = sport === 'swim' ? [] : active.filter(s => normalizeRepairSport(s.sport) === 'brick');
      return [sport, { sessions: sessions.length, standaloneMinutes: sessions.reduce((n,s) => n + (s.durationMin ?? 0), 0),
        bricks: bricks.length, brickMinutesNotAllocated: bricks.reduce((n,s) => n + (s.durationMin ?? 0), 0),
        quotaMinimum: sport === 'bike' ? effective?.bike.min ?? null : trainingMinima?.[sport].min ?? null,
        nominalQuotaMinimum: quota?.quota[sport].min ?? null,
        presence: sessions.length + bricks.length > 0 }];
    })) as Record<'swim'|'bike'|'run', {sessions:number;standaloneMinutes:number;bricks:number;brickMinutesNotAllocated:number;quotaMinimum:number|null;nominalQuotaMinimum:number|null;presence:boolean}>;
    return { weekNumber, missingWeek: !week, phase: week?.phase ?? null, weekType: quota?.weekType ?? null,
      isRaceWeek: week?.sessions.some(isRaceDaySession) ?? false, sports };
  });
  if (tri) {
    const violations = timeline.flatMap(w => (['swim','bike','run'] as const)
      .filter(sport => w.sports[sport].quotaMinimum !== null && w.sports[sport].quotaMinimum! > 0 && !w.sports[sport].presence)
      .map(sport => ({ week: w.weekNumber, sport, requiredMinimum: w.sports[sport].quotaMinimum })));
    const missingContracts = timeline.filter(w => Object.values(w.sports).some(s => s.quotaMinimum === null)).map(w => w.weekNumber);
    controls.push({ id: 'triathlon_discipline_continuity', execution: plan ? 'executed' : 'not_implemented',
      result: !plan ? 'unknown' : violations.length || !completeCalendar ? 'fail' : missingContracts.length ? 'unknown' : 'pass',
      classification: 'contract', source: 'catalogueTrainingMinimaForWeek; effectiveSessionQuota; physical bike/run presence includes brick; declared competition excluded from training',
      evidence: { timeline, violations, missingContracts, note: 'Every week is retained, including recovery and competition. A zero quota minimum is not proof of physiological continuity.' } });
    const frequencyDeficits = timeline.flatMap(w => (['swim','bike','run'] as const).filter(sport => w.sports[sport].quotaMinimum !== null && w.sports[sport].sessions < w.sports[sport].quotaMinimum!).map(sport => ({week:w.weekNumber,sport,required:w.sports[sport].quotaMinimum,observed:w.sports[sport].sessions})));
    controls.push({id:'triathlon_training_frequency',execution:plan?'executed':'not_implemented',result:!plan?'unknown':frequencyDeficits.length||!completeCalendar?'fail':missingContracts.length?'unknown':'pass',classification:'contract',source:'catalogueTrainingMinimaForWeek + effectiveSessionQuota; standalone run quota is never replaced by a brick',evidence:{frequencyDeficits,timeline,note:'Physical presence and full quota-frequency compliance are distinct controls. Event slots are not fabricated as training.'}});
    controls.push({ id: 'triathlon_progression_by_discipline', execution: 'executed', result: 'unknown',
      classification: 'expert_review', source: 'prescribed durationMin, weeklyQuotas.weekType',
      evidence: { timeline, note: 'Measured standalone durations only. No new monotonic-growth rule; brick duration is not fabricated into bike/run shares. Existing load validators remain authoritative.' } });
  } else controls.push({ id: 'triathlon_discipline_continuity', execution: 'not_applicable', result: 'not_applicable',
    classification: 'contract', source: 'normalizeObjectiveKey', evidence: objective });
  if (trail) {
    const byId = new Map(library.map(w => [w.id,w]));
    const sessions = (plan?.weeks ?? []).flatMap(w => w.sessions.filter(s => !s.isRest && !isRaceDaySession(s))
      .flatMap(s => { const fiche = s.catalogId ? byId.get(s.catalogId) : undefined;
        if (normalizeRepairSport(s.sport) !== 'run' && !(fiche && isTrailWorkout(fiche))) return [];
        return [{week:w.weekNumber,id:s.catalogId??null,sourceVerified:!!fiche,
          structuredElevation:fiche?.dPlusTargetM??null,trailFiche:fiche?isTrailWorkout(fiche):false,
          muscularTags:(fiche?.tags??[]).filter(t=>['descente','excentrique','force','musculaire','technique'].includes(String(t).toLowerCase()))}]; }));
    controls.push({id:'trail_structured_elevation_provenance',execution:'executed',
      result:!sessions.length?'unknown':sessions.every(s=>s.sourceVerified&&s.structuredElevation!==null)?'pass':'unknown',
      classification:'descriptive',source:'LibraryWorkout.dPlusTargetM; isTrailWorkout (existing trail markers)',
      evidence:{sessions,note:'Catalogue target is source evidence, not proof that a numeric elevation dose was prescribed or progressed.'}});
    controls.push({id:'trail_muscular_specificity',execution:'executed',result:'unknown',classification:'expert_review',
      source:'existing catalogue tags descente/excentrique/force/musculaire/technique',
      evidence:{sessions: sessions.filter(s=>s.muscularTags.length),note:'Presence evidence only; no unsupported frequency, fatigue or dose threshold.'}});
    controls.push({id:'trail_elevation_progression',execution:'not_implemented',result:'unknown',classification:'expert_review',
      source:'planValidator.validateTrailDPlusPresence explicitly does not validate numeric elevation progression',
      evidence:'No source-authorized deterministic trail quota/progression prescription is inferred from road running.'});
  } else controls.push({id:'trail_elevation_progression',execution:'not_applicable',result:'not_applicable',classification:'expert_review',source:'normalizeObjectiveKey',evidence:objective});
  return {objective,format,completeCalendar,controls};
}
