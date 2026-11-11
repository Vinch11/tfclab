import type {V3Workout} from '../../../scripts/library-v3/catalogueRuntime';
import {resolveDetLimiter} from '../../../experimental/det-engine/v403-limiter-semantics';
import {hasRankedWork,rankedSourceIntent} from './rankedLimiterPrescription';
import type {AppPlanningDetDraft} from './appPlanningDetDraft';
import {engineLimit,missingData} from './coachDecision';

type DraftWeek=AppPlanningDetDraft['weeks'][number];

/** A mixed-sport weekly total or FTP cannot tell us the duration of a recent
 * continuous ride. The complete early-return cards stop at 30 minutes. */
export function prepareReturnBikeProgression(weeks:DraftWeek[],recent:number|undefined,recentWeeklyHours:number|undefined,ramp:number){
  const loadWeeks=weeks.filter(w=>w.weekType==='load');
  const scheduled=loadWeeks.flatMap(week=>{
    const long=week.days.flatMap(d=>d.slots).find(slot=>slot.role==='long'&&['bike','brick'].includes(slot.sport));
    return long?[{week:week.week,min:Math.max(0,(long.minimumMinutes??0)-(long.sport==='brick'?20:0))}]:[];
  });
  const firstDemand=scheduled.find(s=>s.min>30);
  if(!firstDemand)return null;
  if(recentWeeklyHours===0||recent===0){
    const measured=[typeof recentWeeklyHours==='number'?recentWeeklyHours+' h/semaine toutes disciplines':null,
      typeof recent==='number'?recent+' min de vélo continu':null].filter(Boolean).join(' et ');
    throw engineLimit('Reprise en triathlon. Le coach a déclaré '+measured+'. Le calendrier prévoit au moins '+firstDemand.min+
      ' min de vélo en S'+firstDemand.week+'. DET ne dispose pas d’une progression de reprise depuis cette absence de pratique pour ce calendrier. Réexaminer le délai et une première période de reprise.');
  }
  const fields:Array<[string,string]>=[];
  if(!Number.isFinite(recentWeeklyHours)||Number(recentWeeklyHours)<=0)
    fields.push(['loadHistory.recentWeeklyHours','le volume hebdomadaire récemment réalisé toutes disciplines confondues (heures/semaine)']);
  if(recent===undefined||!Number.isFinite(recent)||recent<=0)
    fields.push(['recentLongRideMinutes','la durée du vélo facile en continu récemment tolérée (minutes)']);
  if(fields.length)throw missingData('Reprise en triathlon : renseignez '+fields.map(([,label])=>label).join(' et ')+
    '. La sortie de S'+firstDemand.week+' prévoit au moins '+firstDemand.min+' min de vélo. Ces repères déterminent les doses de départ.',...fields.map(([key])=>key));
  const tolerated=recent!;
  const peak=Math.max(...scheduled.map(w=>w.min));
  const lastPeak=scheduled.map(s=>s.min).lastIndexOf(peak);
  const final=scheduled[lastPeak];
  const possible=tolerated*Math.pow(1+ramp,lastPeak);
  if(possible+1e-7<peak){
    const extra=ramp>0?Math.ceil(Math.log(peak/possible)/Math.log(1+ramp)):null;
    throw engineLimit(`Le calendrier proposé par DET ne convient pas à cette progression. Avec une sortie tolérée de ${tolerated} min et ${lastPeak+1} sorties longues de charge, la progression autorisée (${Math.round(100*ramp)} % entre deux semaines de charge) atteint au plus ${Math.floor(possible)} min avant S${final.week}. Le calendrier de DET prévoit ${peak} min. `+
      (extra?`Pour conserver ce repère et cette rampe, le calendrier demanderait au moins ${extra} semaine(s) de charge supplémentaire(s), auxquelles s’ajoutent les décharges. Le coach peut aussi réexaminer le repère de sortie longue.`:'Le coach peut réexaminer le repère de sortie longue et le calendrier de préparation.'));
  }
  const ceilings=new Map<number,number>();
  let attainable=tolerated;
  for(const week of scheduled){ceilings.set(week.week,attainable);attainable=Math.floor(attainable*(1+ramp)+1e-8);}
  return {recent:tolerated,ceilings};
}

export interface ReturnTriathlonTrace {
  recentLongRideMinutes:number;
  adjustments:{week:number;sport:'bike'|'brick'|'run';from:number;to:number}[];
}

/** Use the introductory floor for running and the reported starting ride.
 * Apply the common ramp across load appointments and reduce recovery doses.
 * The final event-specific floor and explicit slot maxima stay intact. */
export function adjustReturnLongFloors(weeks:DraftWeek[],progression:NonNullable<ReturnType<typeof prepareReturnBikeProgression>>,ramp:number):ReturnTriathlonTrace {
  const loads=weeks.filter(w=>w.weekType==='load');
  const firstLongRun=loads[0]?.days.flatMap(d=>d.slots).find(s=>s.role==='long'&&s.sport==='run')?.minimumMinutes;
  let possibleRun=firstLongRun??Infinity;
  let lastBike=progression.recent,lastRun=possibleRun;
  const adjustments:ReturnTriathlonTrace['adjustments']=[];
  for(const week of weeks){
    const bike=progression.ceilings.get(week.week);
    if(bike===undefined&&week.weekType!=='recovery')continue;
    for(const slot of week.days.flatMap(day=>day.slots)){
      const sport=slot.sport;
      if(slot.role!=='long'||slot.minimumMinutes===null||!(sport==='bike'||sport==='brick'||sport==='run'))continue;
      const cap=week.weekType==='recovery'?(sport==='run'?lastRun:lastBike)*.7:
        sport==='run'?(week.week===loads.at(-1)?.week?Infinity:possibleRun):bike!;
      const to=Math.min(slot.minimumMinutes,Math.floor(cap)+(sport==='brick'?20:0));
      if(to===slot.minimumMinutes)continue;
      adjustments.push({week:week.week,sport,from:slot.minimumMinutes,to});
      slot.minimumMinutes=to;
    }
    if(bike!==undefined){
      lastBike=bike;lastRun=possibleRun;
      possibleRun=Math.floor(possibleRun*(1+ramp)+1e-7);
    }
  }
  return {recentLongRideMinutes:progression.recent,adjustments};
}


export function returnTriathlonRankGap(raw:string,sources:V3Workout[]){
  const requirements:Record<string,string>={
    durability_race_relative:'des blocs de course au seuil avec tolérance aux impacts pour la durabilité à l’allure d’épreuve',
    tte:'des blocs de travail au seuil pour le temps de soutien',
    vo2max:'des fractions dans le domaine VO₂max',
    ftp_relative:'des blocs de puissance à vélo sous le seuil, au seuil ou dans le domaine VO₂max',
    ftp:'des blocs de puissance à vélo sous le seuil, au seuil ou dans le domaine VO₂max',
    fatmax:'un travail ciblé sur FatMax',
  };
  const required=requirements[resolveDetLimiter(raw).key??(raw==='FatMax'?'fatmax':'')];
  if(!required||sources.some(s=>rankedSourceIntent(s,raw)&&hasRankedWork(s.blocks,s.primaryDomain)))return '';
  return ' Le critère de DET demande '+required+'. Aucune fiche V3 admissible à ce niveau de reprise pour cet objectif ne fournit ce travail. La durée du vélo facile renseigne la tolérance en endurance.';
}
