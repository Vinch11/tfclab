import type {PlanConfig} from '@/hooks/useAITrainingPlan';
import {parseAthleteConstraints,WEEK_DAYS} from '@/lib/plan/constraintRules';
import {incompatible,missingData} from './coachDecision';
import type {V3PlanProposal} from './appPlanningV3Proposal';

export function checkAvailabilityInput(config: PlanConfig) {
  const rules=parseAthleteConstraints(config.constraints);
  if (rules.ambiguousRestrictions.length)
    throw missingData('Précisez dans quelles conditions la séance est possible pour cette restriction : « ' +
      rules.ambiguousRestrictions.join(' », « ') + ' ».','constraints');
  const closed=new Set(rules.dayBans.filter(b=>b.sport==='any').map(b=>b.day));
  if (closed.size === WEEK_DAYS.length || rules.bannedSports.includes('any'))
    throw incompatible('Tous les créneaux d’entraînement sont interdits. Ouvrez au moins un jour disponible ou corrigez la restriction saisie.', 'constraints');
}

/** Independently verify the final days, including sports embedded in a brick. */
export function verifyCoachAvailability(plan: V3PlanProposal, config: PlanConfig) {
  const rules=parseAthleteConstraints(config.constraints);
  const checks: V3PlanProposal['checks']=[];
  for (const week of plan.weeks) {
    const conflicts:string[]=[];
    for (const day of week.days) {
      const sports=day.sessions.flatMap(session=>[session.sport,...session.components.map(c=>c.sport)]);
      for (const ban of rules.dayBans) if (ban.day===day.day && sports.length && (ban.sport==='any'||sports.includes(ban.sport)))
        conflicts.push(day.day+' · '+ban.source);
      for (const ban of rules.bannedSports) if (sports.length && (ban==='any'||sports.includes(ban)))
        conflicts.push(day.day+' · discipline exclue '+ban);
      if(config.maxSessionsPerDay !== undefined && day.sessions.length>config.maxSessionsPerDay)
        conflicts.push(day.day+' · '+day.sessions.length+' séances pour un maximum de '+config.maxSessionsPerDay);
    }
    if(config.maxDoubleDaysPerWeek !== undefined && week.days.filter(d=>d.sessions.length>1).length>config.maxDoubleDaysPerWeek)
      conflicts.push('nombre de journées doubles supérieur au maximum déclaré');
    if(conflicts.length) checks.push({code:'coach_availability',week:week.week,status:'blocked',
      message:'S'+week.week+' · Le placement essayé par DET dépasse les disponibilités. '+[...new Set(conflicts)].join(' / ')+'.'});
  }
  return checks;
}
