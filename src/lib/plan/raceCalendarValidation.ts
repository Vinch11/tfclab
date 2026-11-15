import { datedRaceGoals, raceProtectionForDay, strictRaceDate, RACE_DAYS, type RaceCalendarConfig } from '../../../supabase/functions/_shared/raceCalendarProtection';
import { isRaceDaySession } from '../../../supabase/functions/_shared/raceDayIdentity';
import { parseSessionDurationMin } from '@/engines/plan/planValidator';
import { WorkoutLibrary } from '@/lib/workoutLibrary';
import { buildRepairWorkoutMetadata } from './repairCatalogMetadata';
import type { FinalValidationPlanLike, FinalValidationSessionLike } from './qa/checkB13';
import type { FinalValidationIssue } from './qa/finalValidation';
const metadata = new Map(WorkoutLibrary.map(w => [w.id.toUpperCase(), buildRepairWorkoutMetadata(w)]));
export function raceSessionDay(s: FinalValidationSessionLike & {day?:string}): string {
  return (s.dayName ?? s.day ?? '').toLowerCase();
}
export function raceSessionDemanding(s: Partial<FinalValidationSessionLike>): boolean {
  const m = s.catalogId ? metadata.get(s.catalogId.toUpperCase()) : undefined;
  if (m) return m.mainZoneMax > 2 || !['endurance_fondamentale','recuperation','technique'].includes(m.intentFamily)
    || (s.zones ?? []).some(z=>/\bZ\s*[3-7]/i.test(z));
  const zones = `${s.zones?.join(' ') ?? ''} ${s.details}`;
  return /\bZ\s*[3-7]|seuil|MLSS|VO[₂2]max|VMA|tempo|sprint|allure marathon|race.?pace/i.test(`${s.title} ${zones}`);
}
/** Re-check actual dates after all repairs/assembly; no calendar mutations here. */
export function validateRaceCalendar(plan: Pick<FinalValidationPlanLike,'weeks'>, config: RaceCalendarConfig): FinalValidationIssue[] {
  if (!config.planStartDate) return [];
  const issues: FinalValidationIssue[] = [];
  const start = strictRaceDate(config.planStartDate);
  if (start === undefined) return [{rule:'race_calendar_invalid_date',severity:'error',message:'Date de début invalide : calendrier des courses non vérifiable.'}];
  for (const g of datedRaceGoals(config)) {
    const date = strictRaceDate(g.raceDate);
    if (date === undefined) continue;
    const weekNum = Math.floor((date-start)/604800000)+1-(config.globalWeekOffset ?? 0);
    const week = plan.weeks.find(w=>w.weekNumber===weekNum);
    if (!week) continue; // Another generation window: checked on complete assembly.
    const day = RACE_DAYS[(new Date(date).getUTCDay()+6)%7];
    const events = week.sessions.filter(isRaceDaySession);
    const matching = events.filter(s=>raceSessionDay(s)===day);
    if (matching.length !== 1 || events.some(s=>raceSessionDay(s)!==day)) issues.push({rule:'race_calendar_wrong_day',severity:'error',message:`S${weekNum}: ${g.raceName ?? g.objective} doit figurer une seule fois le ${day} ${g.raceDate}.`});
    if (week.sessions.some(s=>raceSessionDay(s)===day && !s.isRest && s.sport!=='rest' && !isRaceDaySession(s))) issues.push({rule:'race_calendar_extra_training',severity:'error',message:`S${weekNum}: entraînement ajouté le jour de compétition ${g.raceDate}.`});
  }
  for (const w of plan.weeks) for (const s of w.sessions) {
    if (s.isRest || s.sport==='rest' || isRaceDaySession(s)) continue;
    const p = raceProtectionForDay(config,w.weekNumber,raceSessionDay(s));
    if (!p || p.stage==='race') continue;
    const cap = p.maxMinutes[s.sport ?? ''];
    const duration = s.durationMin ?? parseSessionDurationMin(s as never);
    if (p.restOnly || cap === 0 || (cap !== undefined && (!duration || duration>cap)) || (p.easyOnly && raceSessionDemanding(s)))
      issues.push({rule:`race_calendar_${p.stage}_unsafe`,severity:'error',message:`S${w.weekNumber} ${raceSessionDay(s)} « ${s.title} » : incompatible avec ${p.stage==='recovery'?'la récupération après':'l’affûtage avant'} ${p.label} (${p.raceDate}).`});
  }
  return issues;
}