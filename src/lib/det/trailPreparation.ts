import {prepareRoadReturnCalendar} from './roadReturnIntensity';
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
  // The common race template can reserve strength when the coach has selected
  // zero. Keep all the remaining appointments on their original days.
  if (config.strengthSessionsPerWeek === 0) {
    for (const entry of Object.values(prepared.weeklyQuotas)) {
      const {quota,layout} = entry;
      if (!layout) continue;
      entry.floors = {...entry.floors,minStrengthPerWeek:0};
      entry.quota = {...quota,strength:{min:0,max:0},totalSessions:{
        min:Math.max(0,quota.totalSessions.min-quota.strength.min),
        max:Math.max(0,quota.totalSessions.max-quota.strength.max),
      }};
      entry.layout = {...layout,targetsBySport:{...layout.targetsBySport,strength:0},days:layout.days.map(day=>{
        const slots=day.slots.filter(slot=>slot.sport!=='strength');
        return {...day,slots,isRest:day.isRest||slots.length===0};
      })};
    }
  }
  prepareRoadReturnCalendar(config,prepared.weeklyQuotas);
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
  const horizon = config.weeksAvailable;
  if (!Number.isFinite(start) || new Date(start).toISOString().slice(0,10)!==config.planStartDate)
    throw missingData('Renseignez une date de début valide pour la préparation trail.', 'planStartDate');
  if (!Number.isFinite(finish) || new Date(finish).toISOString().slice(0,10)!==race.raceDate)
    throw missingData('Renseignez une date valide pour la course A.', 'raceGoals.raceDate');
  if (horizon===undefined || !Number.isInteger(horizon) || horizon<=0)
    throw missingData('Renseignez la durée de la préparation trail en semaines entières positives.', 'weeksAvailable');
  const raceWeek=1+Math.floor((finish-start)/(7*86400000));
  if(raceWeek<1 || raceWeek>horizon)
    throw incompatible('La course A du '+race.raceDate+' se trouve en dehors des '+horizon+' semaines commençant le '+config.planStartDate+'. Pour inclure la course, modifiez les dates ou la durée du plan.', 'planStartDate','raceGoals.raceDate','weeksAvailable');
  if(new Date(start).getUTCDay()!==1)
    throw engineLimit('La préparation commence le '+config.planStartDate+'. DET sait actuellement placer les sorties trail dans des semaines commençant le lundi. Le coach peut conserver les dates ou choisir un lundi de départ pour essayer ce calendrier.');
  if(raceWeek!==horizon)
    throw engineLimit('La course A est en S'+raceWeek+' sur '+horizon+'. DET place actuellement le trail A en dernière semaine et ne sait pas encore construire les semaines suivantes. Le coach peut conserver son calendrier ou demander une préparation se terminant en S'+raceWeek+'.');
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
  if (!Number.isInteger(total)) throw missingData('Renseignez un nombre entier de séances par semaine.', 'sessionsPerWeek');
  if (runs<=0) throw incompatible('Les '+total+' séances hebdomadaires choisies et les compléments demandés ne laissent aucun créneau de course pour le trail. Libérez un créneau ou réduisez les compléments.', 'sessionsPerWeek','strengthSessionsPerWeek','crossTrainingMaintenance');
  if (runs===1) throw engineLimit('La disponibilité laisse une sortie trail par semaine. Le calendrier DET demande actuellement deux sorties pour répartir la sortie longue et les autres priorités. Le coach peut garder ce créneau ou en déclarer un deuxième s’il est réellement disponible.');
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
