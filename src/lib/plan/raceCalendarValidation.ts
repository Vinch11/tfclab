import { datedRaceGoals, raceProtectionForDay, strictRaceDate, RACE_DAYS, type RaceCalendarConfig } from '../../../supabase/functions/_shared/raceCalendarProtection';
import { isRaceDaySession } from '../../../supabase/functions/_shared/raceDayIdentity';
import { parseSessionDurationMin } from '@/engines/plan/planValidator';
import { WorkoutLibrary } from '@/lib/workoutLibrary';
import { buildRepairWorkoutMetadata } from './repairCatalogMetadata';
import type { FinalValidationPlanLike, FinalValidationSessionLike } from './qa/checkB13';
import type { FinalValidationIssue } from './qa/finalValidation';
import { racePaceMinutes } from './specificPaceQuotas';
import {normalizeRepairSport} from '../../../supabase/functions/_shared/repairSportingEquivalence';
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
    const cap = p.maxMinutes[normalizeRepairSport(s.sport)];
    const duration = s.durationMin ?? parseSessionDurationMin(s as never);
    if (p.restOnly || cap === 0 || (cap !== undefined && (!duration || duration>cap)) || (p.easyOnly && raceSessionDemanding(s)))
      issues.push({rule:`race_calendar_${p.stage}_unsafe`,severity:'error',message:`S${w.weekNumber} ${raceSessionDay(s)} « ${s.title} » : incompatible avec ${p.stage==='recovery'?'la récupération après':'l’affûtage avant'} ${p.label} (${p.raceDate}).`});
  }
  issues.push(...validateRaceTrajectory(plan, config));
  return issues;
}

/** Coach decision 2026-11-16: trajectory targets (re-entry intensity, marathon reminders,
 * Ironman taper long sessions) are warnings; only a re-entry volume more than 10 % above
 * its ceiling refuses a plan. Race-day and protected-day safety stays blocking above. */
export const REENTRY_REFUSAL_FACTOR = 1.1;

/** Dated continuity checks survive missing budgets and assembled generation windows.
 * Coaching ceilings, not a claim that a fixed percentage certifies recovery. */
export function validateRaceTrajectory(plan: Pick<FinalValidationPlanLike,'weeks'>, config: RaceCalendarConfig): FinalValidationIssue[] {
  const start = strictRaceDate(config.planStartDate);
  if (start === undefined) return [];
  const issues: FinalValidationIssue[] = [];
  const minutes = (w: FinalValidationPlanLike['weeks'][number]) => w.sessions.reduce((n,s) =>
    n + (s.isRest || normalizeRepairSport(s.sport) === 'rest' || normalizeRepairSport(s.sport) === 'strength' || isRaceDaySession(s) ? 0 : s.durationMin ?? parseSessionDurationMin(s as never) ?? 0), 0);
  for (const goal of datedRaceGoals(config)) {
    const date = strictRaceDate(goal.raceDate);
    if (date === undefined) continue;
    const key = raceProtectionForDay({...config, planStartDate:goal.raceDate, globalWeekOffset:0},1,RACE_DAYS[(new Date(date).getUTCDay()+6)%7])?.objective;
    const raceWeek = Math.floor((date-start)/604800000)+1-(config.globalWeekOffset ?? 0);
    if (key === 'marathon') {
      const prep = plan.weeks.filter(w => w.weekNumber >= raceWeek-4 && w.weekNumber <= raceWeek-2);
      const reference = prep.length ? Math.max(...prep.map(minutes)) : 0;
      for (const week of plan.weeks.filter(w=>w.weekNumber > raceWeek && w.weekNumber <= raceWeek+3)) {
        const distance = week.weekNumber-raceWeek;
        const ceiling = reference * ([0,.45,.7,.9][distance] ?? 1);
        if (reference > 0 && minutes(week) > ceiling + 5) issues.push({rule:'race_calendar_reentry_jump',severity:minutes(week) > ceiling*REENTRY_REFUSAL_FACTOR + 5 ? 'error' : 'warning',message:`S${week.weekNumber}: reprise après ${goal.raceName ?? 'marathon'} trop forte (${minutes(week)} min > ${Math.round(ceiling)} min), référence pré-course ${reference} min, hors renforcement.`});
        if (distance === 3) {
          const demanding = week.sessions.filter(s=>!s.isRest && raceSessionDemanding(s));
          const severe = demanding.some(s=>/Z\s*[5-7]|VO[₂2]max|VMA|pyramide/i.test(`${s.title} ${s.details} ${s.zones?.join(' ')}`));
          if (demanding.length > 2 || severe) issues.push({rule:'race_calendar_reentry_intensity',severity:'warning',message:`S${week.weekNumber}: reprise marathon limitée à deux séances clés non maximales ; pas de VO₂max/Z5 ni de cumul exigeant.`});
        }
      }
      const reminderWeek = plan.weeks.find(w=>w.weekNumber === raceWeek-1);
      if (reminderWeek) {
        const reminders = reminderWeek.sessions.filter(s=>!s.isRest && normalizeRepairSport(s.sport)==='run' && /allure\s*marathon|\bAM\b/i.test(`${s.title} ${s.details}`));
        const amount = reminders.reduce((n,s)=>n+racePaceMinutes(`${s.title} ${s.details}`),0);
        if (amount < 15) issues.push({rule:'race_calendar_marathon_reminder_missing',severity:'warning',message:`S${reminderWeek.weekNumber}: conserver 1–2 rappels totalisant au moins 15 min à allure marathon, sans séance de développement.`});
      }
    }
    if (key === 'ironman') {
      const week = plan.weeks.find(w=>w.weekNumber===raceWeek-2);
      if (week) for (const [sport,min] of [['bike',120],['run',60]] as const) {
        if (!week.sessions.some(s=>!s.isRest && normalizeRepairSport(s.sport)===sport && (s.durationMin ?? parseSessionDurationMin(s as never) ?? 0)>=min))
          issues.push({rule:'race_calendar_taper_long_missing',severity:'warning',message:`S${week.weekNumber}: affûtage Ironman sans repère long ${sport==='bike'?'vélo (120–150 min)':'course (60–75 min)'} ; conserver ce repère en réduisant le volume ailleurs.`});
      }
    }
  }
  return issues;
}