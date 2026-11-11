import type {PlanConfig} from '@/hooks/useAITrainingPlan';
import type {WeekQuotaEntry} from '@/lib/plan/validateWeeklyQuotas';
import type {V3Workout} from '../../../scripts/library-v3/catalogueRuntime';
import {roadReturnThresholdSource} from '../../../scripts/library-v3/roadReturnThreshold';
import {resolveDetLimiter} from '../../../experimental/det-engine/v403-limiter-semantics';
import {calendarOrConfirmedClockRecoverySafe,type ScheduledSport,type ConfirmedSlotStart} from '../../../experimental/det-engine/v39-calendar-safe-recovery';
import {detObjectiveGoal} from './ordinaryObjective';
import {engineLimit,missingData} from './coachDecision';
import {hasRankedWork,rankedSourceIntent} from './rankedLimiterPrescription';

export function isReturnThresholdTenK(config:PlanConfig) {
  const level=config.ambitionMeta;
  const priority=resolveDetLimiter(config.identifiedLimitersRaw?.[0]??'').key;
  return detObjectiveGoal(config.objective)==='10k' && level?.trainingLevel==='untrained' &&
    ['manual','auto-tss'].includes(level.trainingLevelSource) && level.effective==='finisher' &&
    (priority==='tte'||priority==='durability_race_relative');
}

export function returnThresholdRecovery(slot:ScheduledSport, duration:number, calendar:ScheduledSport[], start?:ConfirmedSlotStart) {
  return calendarOrConfirmedClockRecoverySafe(slot,duration,[{sourceId:roadReturnThresholdSource.id,sport:'run',
    hours:roadReturnThresholdSource.minimumRecoveryHours}],calendar,start);
}

/** Move only an unrestricted run to an empty day. Keep the full rest-day quota and the long run in place. */
export function prepareRoadReturnCalendar(config:PlanConfig, quotas:Record<number, WeekQuotaEntry>) {
  if (!isReturnThresholdTenK(config)||config.constraints?.trim()) return;
  function calendar():ScheduledSport[] {
    return Object.entries(quotas).flatMap(([week,q])=>(q.layout?.days??[]).flatMap((day,dayIndex)=>day.slots.map(s=>({
      week:Number(week),dayIndex,sport:s.sport,isRaceEvent:s.isRaceEvent
    }))));
  }
  for (const [entry,quota] of Object.entries(quotas)) {
    if (!quota.layout || quota.weekType!=='load'||!roadReturnThresholdSource.phase.includes(quota.phase??'')) continue;
    const week=Number(entry),days=quota.layout.days,slots=calendar();
    const keys=days.flatMap((day,dayIndex)=>day.slots.filter(s=>s.sport==='run'&&s.isKeySession&&!s.isLongSession&&!s.isRaceEvent)
      .map(slot=>({dayIndex,slot})));
    if (keys.some(k=>returnThresholdRecovery({week,dayIndex:k.dayIndex,sport:'run'},31,slots))) continue;
    // The key workout or the following easy appointment can move. Refuse a
    // displacement that creates three successive running days across a week boundary.
    let adjusted=false;
    for (const k of keys) {
      for (const targetIndex of [k.dayIndex-1,k.dayIndex+1]) {
        const from=days[k.dayIndex],to=days[targetIndex];
        if (!to||to.isRest||to.slots.length||from.slots.length>1 && days.filter(d=>!d.slots.length).length<=quota.quota.minFullRestDays) continue;
        const updated=slots.map(s=>s.week===week&&s.dayIndex===k.dayIndex&&s.sport==='run'?{...s,dayIndex:targetIndex}:s);
        const runDays=new Set(updated.filter(s=>s.sport==='run'||s.sport==='brick').map(s=>(s.week-1)*7+s.dayIndex));
        const moved=(week-1)*7+targetIndex;
        if ([moved-2,moved-1,moved].some(day=>runDays.has(day)&&runDays.has(day+1)&&runDays.has(day+2))) continue;
        if (!keys.some(key=>returnThresholdRecovery({week,sport:'run',dayIndex:key===k?targetIndex:key.dayIndex},31,updated))) continue;
        from.slots.splice(from.slots.indexOf(k.slot),1);
        to.slots.push(k.slot);
        adjusted=true;
        break;
      }
      if(adjusted)break;
    }
  }
}

export function returnThresholdRepetitions(config:PlanConfig, threshold:number|null|undefined, declared:number|undefined,
  exclusion:string|undefined, recoveryAvailable:boolean) {
  const first='10 km en reprise. Rang 1 · '+config.identifiedLimitersRaw![0]+'. ';
  if (exclusion) throw engineLimit(first+'Le seuil en fractions est exclu. '+exclusion+' Réexaminer la séance après récupération.');
  if (!recoveryAvailable) throw engineLimit(first+'DET ne trouve aucun créneau de construction ou de pic laissant les 48 h de récupération de la fiche de seuil avant la prochaine séance de course. Vérifier les jours et les horaires du calendrier.');
  if (declared===0||declared===1) throw engineLimit(first+'Le coach a confirmé '+declared+' fraction de 3 min au seuil pour cette séance. La plus petite dose de seuil de reprise proposée par DET est de 2 × 3 min. DET ne sait pas transposer une séance d’une autre forme. Privilégier la course facile tolérée et réexaminer ce travail au prochain bilan.');
  if (config.loadHistory?.recentWeeklyHours===0) throw engineLimit(first+'Le coach a indiqué 0 h de course ou d’entraînement récent. DET ne sait pas calibrer cette progression au seuil depuis une semaine sans pratique.');
  const fields:string[]=[], labels:string[]=[];
  if (!(typeof declared==='number' && Number.isSafeInteger(declared) && declared>=2)) {
    labels.push('le nombre de fractions de 3 min au seuil réellement courues et tolérées depuis la reprise, sur le plat, avec 10 min faciles avant, 3 min au trot entre les fractions et 6 min faciles après (0 si aucune)');
    fields.push('roadReturnThresholdReps');
  }
  if (!(typeof config.loadHistory?.recentWeeklyHours==='number' && Number.isFinite(config.loadHistory.recentWeeklyHours) && config.loadHistory.recentWeeklyHours>0)) {
    labels.push('le volume hebdomadaire récent, en heures par semaine'); fields.push('loadHistory.recentWeeklyHours');
  }
  if (!(typeof threshold==='number' && Number.isFinite(threshold) && threshold>0)) {
    labels.push('l’allure individuelle au seuil, en min/km'); fields.push('athlete.paceThresholdSecPerKm');
  }
  if(fields.length)throw missingData(first+'Pour doser le travail de seuil, renseigner '+labels.join(' et ')+'.',...fields);
  return Math.min(declared!,3);
}

export function returnRankGap(raw:string, sources:V3Workout[], event:'semi-marathon'|'marathon'='semi-marathon') {
  const key=resolveDetLimiter(raw).key;
  const threshold=key==='tte'||key==='durability_race_relative';
  if(!threshold && key!=='vo2max' && key!=='vma_velocity') return '';
  if (sources.some(s=>s.sport==='run' && rankedSourceIntent(s,raw) && hasRankedWork(s.blocks,s.primaryDomain))) return '';
  return threshold
    ? ' Aucune fiche de course au seuil admissible au niveau de reprise pour ce '+event+'. La marche-course disponible prépare l’endurance. DET ne sait pas en déduire une dose au seuil.'
    : ' Aucune fiche de course avec des fractions à vitesse aérobie admissible pour ce '+event+' en reprise. La VMA du bilan donne une vitesse de référence. Le moteur ne dispose pas d’une séance compatible pour l’utiliser.';
}
