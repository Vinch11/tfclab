import {engineLimit,incompatible,missingData} from './coachDecision';
import type {PlanAthleteData, PlanConfig} from '@/hooks/useAITrainingPlan';
import {prepareGenerationContracts} from '@/lib/plan/prepareGenerationContracts';
import {prepareTimeTrialCalendar} from './timeTrialPlanning';
import {isTimeTrial} from '../../../experimental/det-engine/v410-time-trial-contract';
import {parseAthleteConstraints} from '@/lib/plan/constraintRules';
import {buildWeeklySlotLayout, type LayoutSport} from '@/engines/plan/weeklySlotLayout';
import {inferWeekType, buildCoachVolumeBudget, type WeeklyQuota} from '@/engines/plan/sessionSizingMatrix';
import {declaredRaceSlotsForWeek} from '../../../supabase/functions/_shared/catalogueTrainingMinima';
import {coachFamilyFor} from '../../../experimental/det-engine/v401-coach-inputs-core';

export interface TrailLongRunLimits {
  recentMinutes: number;
  peakMinutes: number;
}

export function trailFamily(config: PlanConfig) {
  const family = coachFamilyFor(config.objective);
  return family?.sportFocus === 'trail' ? family : null;
}

/** Coach-review calendar. Source/route admission and terrain observations belong to the reviewed trail workflow. */
export function prepareDetGeneration(athlete: PlanAthleteData, config: PlanConfig) {
  const prepared = prepareGenerationContracts(athlete, config);
  if (isTimeTrial(String(config.objective))) {
    prepareTimeTrialCalendar(prepared,config,athlete);
    return prepared;
  }
  const family = trailFamily(config);
  if (!family) return prepared;
  const race = config.raceGoals?.find(g => g.priority === 'A' && coachFamilyFor(g.objective)?.key === family.key);
  if (!race || !Number.isFinite(race.distanceKm) || (race.distanceKm ?? 0) <= 0 || !Number.isFinite(race.elevationGainM) || (race.elevationGainM ?? 0) <= 0) {
    const fields: string[] = [], labels: string[] = [];
    if (!race) throw missingData('Déclarez la course A correspondant à cet objectif trail.', 'raceGoals');
    if (!(Number.isFinite(race.distanceKm) && Number(race.distanceKm) > 0)) { fields.push('raceGoals.distanceKm'); labels.push('la distance en km'); }
    if (!(Number.isFinite(race.elevationGainM) && Number(race.elevationGainM) > 0)) { fields.push('raceGoals.elevationGainM'); labels.push('le dénivelé positif en m'); }
    throw missingData('Trail : renseignez ' + labels.join(' et ') + ' pour la course A.', ...fields);
  }
  if (config.raceGoals?.length !== 1) throw engineLimit('DET prend actuellement en charge une seule épreuve dans ce calendrier trail. Sélectionnez une course A pour cette préparation.');
  if (config.terrainAvailability === 'plat') throw engineLimit('Les séances trail V3 disponibles demandent un parcours avec relief. DET ne couvre pas encore la préparation sur terrain exclusivement plat.');
  const start = Date.parse(config.planStartDate + 'T00:00:00Z');
  const finish = Date.parse(race.raceDate + 'T00:00:00Z');
  if (!Number.isFinite(start) || !Number.isFinite(finish) || new Date(start).getUTCDay()!==1 ||
      finish<start+(config.weeksAvailable!-1)*7*86400000 || finish>=start+config.weeksAvailable!*7*86400000)
    throw incompatible('Vérifiez la date de départ (lundi) et placez la course A en dernière semaine de préparation.', 'planStartDate', 'raceGoals.raceDate', 'weeksAvailable');
  const rules = parseAthleteConstraints(config.constraints ?? '');
  if (rules.ambiguousRestrictions.length) throw missingData('Précisez la disponibilité indiquée dans « ' + rules.ambiguousRestrictions.join(', ') + ' ».','constraints');
  const fixed = (n: number) => ({min:n,max:n});
  const level = config.ambitionMeta?.trainingLevel;
  const explicitLevel = ['manual','auto-tss'].includes(config.ambitionMeta?.trainingLevelSource ?? '');
  if (!level || !explicitLevel) throw missingData('Trail : renseignez le niveau actuel d’entraînement.','ambitionMeta.trainingLevel');
  // Four runs in the reviewed trail calendar. Reprise/light use a reduced run frequency.
  const defaultRuns = level === 'untrained' ? 2 : level === 'light' ? 3 : 4;
  const strength = config.strengthSessionsPerWeek ?? 1;
  const bike = Number(config.crossTrainingMaintenance?.velo === true);
  const swim = Number(config.crossTrainingMaintenance?.natation === true);
  const total = config.sessionsPerWeek ?? defaultRuns + strength + bike + swim;
  const runs = total - strength - bike - swim;
  if (!Number.isInteger(total) || runs < 2) throw incompatible('La fréquence déclarée laisse moins de deux sorties trail. Libérez un créneau course ou réduisez le nombre de compléments.', 'sessionsPerWeek','strengthSessionsPerWeek','crossTrainingMaintenance');
  const zero = fixed(0);
  for (let w=1; w<=config.weeksAvailable!; w++) {
    const type = inferWeekType(w,config.weeksAvailable!,config.objective,athlete.age,config.deloadCadenceWeeks);
    const reduced = type !== 'load';
    const minimumRuns = level === 'untrained' && type === 'taper' ? 1 : 2;
    const count = reduced ? Math.max(minimumRuns,runs-1) : runs;
    const force = type === 'race' ? 0 : strength;
    const quota: WeeklyQuota = {run:fixed(count), bike:fixed(bike), swim:fixed(swim), strength:fixed(force), brick:zero,
      totalSessions:fixed(count+bike+swim+force), maxSessionsPerDay:config.maxSessionsPerDay ?? 1,minFullRestDays:1,
      source:{tier:'practitioner_literature',ref:'Trail DET : calendrier proposé à partir de la disponibilité et du niveau du profil'}};
    const floors = {minStrengthPerWeek:force,longRunWeekly:type==='load'};
    const sports = new Set<LayoutSport>(['run']);
    if (bike) sports.add('bike');
    if (swim) sports.add('swim');
    if (force) sports.add('strength');
    if (rules.bannedSports.some(s=>s==='any'||sports.has(s as LayoutSport))) throw incompatible('Une discipline demandée est aussi exclue. Modifiez les compléments demandés ou confirmez vos disponibilités.', 'constraints','crossTrainingMaintenance');
    const events = declaredRaceSlotsForWeek(config,w);
    const layout = buildWeeklySlotLayout(quota,floors,type,{availableSports:sports,dayBans:rules.dayBans,raceEvents:events,taperRunFrequencyFloor:0});
    const slots = layout.days.flatMap(d=>d.slots);
    if (slots.length!==quota.totalSessions.min || layout.days.some(d=>d.slots.length>quota.maxSessionsPerDay || d.slots.some(s=>rules.dayBans.some(b=>b.day===d.dayName&&(b.sport==='any'||b.sport===s.sport)))) ||
      layout.days.filter(d=>d.slots.length>1).length>(config.maxDoubleDaysPerWeek??7) ||
      slots.filter(s=>s.isRaceEvent).length!==events.length) throw engineLimit('S'+w+' : DET n’a pas trouvé de placement respectant les jours disponibles, la fréquence et la date de course.');
    prepared.weeklyQuotas[w]={weekType:type,quota,floors,downgraded:false,layout,phase:prepared.phaseCalendar?.[w],limiterFocus:prepared.limiterMesocycles.byWeek[w],
      volumeBudget:buildCoachVolumeBudget(config.volumeRamp,w,type,config.weeklyHoursSource)};
  }
  return prepared;
}
