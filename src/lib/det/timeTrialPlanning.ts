import type { PlanAthleteData, PlanConfig } from '@/hooks/useAITrainingPlan';
import { parseAthleteConstraints } from '@/lib/plan/constraintRules';
import type { prepareGenerationContracts } from '@/lib/plan/prepareGenerationContracts';
import { buildCoachVolumeBudget } from '@/engines/plan/sessionSizingMatrix';
import { buildDedicatedSportCalendar } from '../../../experimental/det-engine/v359-dedicated-sport-preparation';
import { aeroLedger, timeTrialPhysiologyProblems, timeTrialProblems, TT_AERO_SOURCES, type TimeTrialDeclaration } from '../../../experimental/det-engine/v410-time-trial-contract';
import { appProfileDetStructure } from './appProfileDetStructure';
import type { ProposedV3Session, V3PlanProposal } from './appPlanningV3Proposal';

export const isTimeTrialSource = (id: string) => TT_AERO_SOURCES.some(source => source === id);

export function prepareTimeTrialCalendar(prepared: ReturnType<typeof prepareGenerationContracts>, config: PlanConfig, athlete: PlanAthleteData) {
  const declaration = config.timeTrialContext;
  const problems = [...timeTrialProblems(declaration, config.athleteId ?? '', config), ...timeTrialPhysiologyProblems(config, athlete)];
  if (!declaration || problems.length) throw Error(problems.join('\n'));
  const start = Date.parse(config.planStartDate + 'T00:00:00Z');
  const offset = (Date.parse(config.raceDate + 'T00:00:00Z') - start) / 86400000;
  if (!Number.isFinite(offset) || new Date(start).getUTCDay() !== 1 || offset < 0 ||
      Math.floor(offset / 7) + 1 !== config.weeksAvailable || config.raceGoals?.[0]?.priority !== 'A')
    throw Error('CLM : renseigner le lundi de début et la date de course A en dernière semaine.');
  const strength = config.strengthSessionsPerWeek ?? 0;
  const frequency = (config.sessionsPerWeek ?? 0) - strength;
  if (!Number.isInteger(frequency) || frequency < 3 || frequency > 6)
    throw Error('CLM : préciser une fréquence permettant 3 à 6 séances de vélo par semaine, en plus du renforcement choisi.');
  const rules = parseAthleteConstraints(config.constraints ?? '');
  if (rules.ambiguousRestrictions.length || rules.bannedSports.some(s => s === 'any' || s === 'bike' || (s === 'strength' && strength)))
    throw Error('CLM : les disponibilités ou les disciplines exclues ne permettent pas ce calendrier.');
  buildDedicatedSportCalendar(prepared, {...config, strengthSessionsPerWeek: strength}, 'bike', frequency);
  for (let week = 1; week <= config.weeksAvailable!; week++) {
    const quota = prepared.weeklyQuotas[week];
    quota.limiterFocus = prepared.limiterMesocycles.byWeek[week];
    quota.volumeBudget = buildCoachVolumeBudget(config.volumeRamp, week, quota.weekType, config.weeklyHoursSource);
    const days = quota.layout.days;
    const sessions = days.flatMap(d => d.slots);
    if (sessions.length !== quota.quota.totalSessions.min || days.filter(d => !d.slots.length).length < quota.quota.minFullRestDays ||
        days.some(d => d.slots.length > quota.quota.maxSessionsPerDay || d.slots.some(s =>
          rules.dayBans.some(b => b.day === d.dayName && (b.sport === 'any' || b.sport === s.sport)))) ||
        days.filter(d => d.slots.length > 1).length > (config.maxDoubleDaysPerWeek ?? 7))
      throw Error('CLM : les disponibilités et la fréquence sont incompatibles en semaine ' + week + '.');
    if (week === config.weeksAvailable && !days[offset % 7].slots.some(s => s.sport === 'bike' && s.isRaceEvent))
      throw Error('CLM : aucun créneau vélo réservé à la date de la compétition.');
    if (declaration.aeroWeeks.includes(week) && (quota.weekType !== 'load' || !['build','peak'].includes(quota.phase ?? '') ||
        !days[declaration.aeroDayIndex]?.slots.some(s => s.sport === 'bike' && !s.isRaceEvent)))
      throw Error('CLM : rendez-vous aéro incompatible avec le jour et la phase de charge en semaine ' + week + '.');
  }
}

function measuredPosture(session: ProposedV3Session) {
  const workout = appProfileDetStructure(session).detStructuredWorkout;
  return workout ? aeroLedger(workout) : null;
}

export function aeroSlotAccepts(session: ProposedV3Session, week: number, day: number, declaration: TimeTrialDeclaration) {
  const appointment = declaration.aeroWeeks.includes(week) && declaration.aeroDayIndex === day;
  if (!appointment) return !session.components.some(c => isTimeTrialSource(c.sourceId));
  if (session.components.length !== 1 || !isTimeTrialSource(session.components[0].sourceId)) return false;
  const dose = measuredPosture(session);
  return !!dose?.valid && dose.longestContinuousMinutes >= declaration.minimumContinuousAeroMinutes &&
    dose.longestContinuousMinutes <= declaration.longestContinuousAeroMinutes &&
    dose.totalAeroMinutes >= declaration.minimumAeroMinutesPerSession && dose.totalAeroMinutes <= declaration.maxAeroMinutesPerSession;
}

export function verifyTimeTrialWeeks(proposal: V3PlanProposal, declaration: TimeTrialDeclaration, weeklyHours: number) {
  const weeks = new Set<number>();
  let peak = false;
  for (const week of proposal.weeks) for (const [day, entry] of week.days.entries()) for (const session of entry.sessions) {
    if (session.sport !== 'bike' || session.role === 'race') continue;
    const dose = measuredPosture(session);
    const scheduled = declaration.aeroWeeks.includes(week.week) && declaration.aeroDayIndex === day;
    if (!scheduled && !dose?.totalAeroMinutes) continue;
    if (!scheduled || !aeroSlotAccepts(session, week.week, day, declaration) || weeks.has(week.week))
      throw Error('CLM : dose ou date de pratique aéro incohérente en semaine ' + week.week + '.');
    weeks.add(week.week);
    if (week.phase === 'peak') peak = true;
    proposal.checks.push({code:'time_trial_posture', status:'passed', week:week.week,
      message: dose!.totalAeroMinutes + ' min en position aéro, dont ' + dose!.longestContinuousMinutes + ' min en continu au maximum.'});
  }
  const eventWeek = proposal.weeks.find(w=>w.days.some(day=>day.sessions.some(s=>s.role==='race')));
  if(!eventWeek || eventWeek.knownMinutes + declaration.raceDurationMinutes > weeklyHours*60)
    throw Error('CLM : durée des entraînements et de la compétition incompatible avec le budget hebdomadaire.');
  if (!peak || weeks.size !== declaration.aeroWeeks.length || weeks.size < declaration.minimumAeroSessions)
    throw Error('CLM : le calendrier produit ne couvre pas la pratique aéro déclarée jusqu’à la phase spécifique.');
}
