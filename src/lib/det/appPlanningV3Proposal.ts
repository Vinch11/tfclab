import type { FrozenAppPlanningInput } from './appPlanningInput';
import { planningInputFor } from './appPlanningInput';
import { buildAppPlanningDetDraft, filterDraftV3Sources, type DraftRestrictions } from './appPlanningDetDraft';
import { familySourcePool } from './familySourcePools';
import { findSource } from './coachDetContext';
import { coachFamilyFor,clockFor } from '../../../experimental/det-engine/v401-coach-inputs-core';
import { resolveDetLimiter } from '../../../experimental/det-engine/v403-limiter-semantics';
import { limiterSourceAffinity } from '../../../experimental/det-engine/v411-limiter-source-affinity';
import { previewV3SourceDose } from '../../../experimental/det-engine/v31-v3-catalogue';
import { fingerprintV3SportingSource } from '../../../scripts/library-v3/sportingQualification800';
import { evaluateV3Workout, type V3Block, type V3Workout } from '../../../scripts/library-v3/catalogueRuntime';
import { resolveV3IntensityTargets, type V3AthleteAnchors, type V3IntensityResolution } from '../../../scripts/library-v3/resolveV3Intensity';
import { structuredV3ZoneDose, type StructuredZoneDose } from '../../../experimental/det-engine/v310-structured-zone-dose';
import { assessStrictStructuredZoneTarget } from '../../../experimental/det-engine/v39-strict-native-polarization-target';
import { prepareGenerationContracts } from '@/lib/plan/prepareGenerationContracts';
import { auditV3ProposalRecovery,auditV3ProposalSportMinutes,auditV3ProposalDoseIntegrity,proposedRecoveryStatus } from './appPlanningV3Audit';
import type { ScheduledSport } from '../../../experimental/det-engine/v39-calendar-safe-recovery';
import { planTriathlonRatioTrajectory,triathlonCandidateDoseDistance,type TriContribution } from '../../../experimental/det-engine/v312-triathlon-dose-trajectory';
import { hasExactStrictTriathlonRatio,TRIATHLON_STRICT_MINUTE_RANGES } from '../../../experimental/det-engine/v314-cumulative-ratio-search';
import { normalizeRepairGoal } from '../../../supabase/functions/_shared/repairSportingEquivalence';
import { parseAthleteConstraints } from '@/lib/plan/constraintRules';
import { V34_SAFE_RUN_BRICKS } from '../../../experimental/det-engine/v34-v3-low-run-bricks';
import type { CoachConfirmedClock } from '../../../experimental/det-engine/v401-coach-inputs-core';

/** A chosen source prescription proposed for review, NOT an admitted workout.
 * Deliberately incompatible with ParsedPlan, qualified DET and export schemas. */
export interface ProposedV3Workout {
  sourceId: string; sourceFingerprint: string; title: string; sport: string;
  blocks: V3Block[]; durationMinutes: number | null; distanceM: number;
  targets: V3IntensityResolution; limiterMatches: string[];
  sourceDomain: V3Workout['primaryDomain'];
  /** Configured block arithmetic only; no source admission or athlete approval. */
  zoneMinutes: Pick<StructuredZoneDose,'low'|'mid'|'high'|'unknown'>|null;
  review: Pick<V3Workout,'minimumRecoveryHours'|'prerequisites'|'contraindications'|'stopRule'|'minimumLevel'>;
}
export interface ProposedV3Session {
  sport: string; role: 'race'|'long'|'key'|'support';
  components: ProposedV3Workout[];
  /** A composition is proposed, never an approved brick; no guessed transition. */
  transitionMinutes: null;
  knownMinutes: number; durationMinutes: number|null;
}
export interface V3PlanProposal {
  kind: 'v3_plan_proposal'; status: 'assembled_for_review';
  athleteId: string; planningInputFingerprint: string; objective: string;
  limiterOrder: string[]; prescriptionAllowed: false; sourceReview: 'pending';
  eventCalendar: NonNullable<FrozenAppPlanningInput['config']['raceGoals']>;
  weeks: Array<{week:number;phase:string|null;weekType:string;focus:string|null;
    days:Array<{day:string;rest:boolean;sessions:ProposedV3Session[]}>;
    knownMinutes:number;durationMinutes:number|null}>;
  checks: Array<{code:string;week?:number;status:'pending'|'passed'|'blocked';message:string}>;
}
export interface V3ProposalOptions extends DraftRestrictions {
  clock?: CoachConfirmedClock;
  invalidClockSports?: string[];
  /** Explicit references entered by the coach, never inferred from CSS. */
  swimDomainPaces?: Record<string,{value:number;kind:'field_measurement'|'explicit_estimate'}>;
}
const easy=(source:V3Workout)=>source.sport==='strength'||
  source.prescription.physiologicalIntent.domainIds.every(d=>d==='recovery'||d==='moderate_lt1');
const quality=(session:ProposedV3Session)=>session.components.some(c=>
  c.zoneMinutes!==null&&c.zoneMinutes.high>0&&['mlss','vo2max'].includes(c.sourceDomain??''));
function polarization(sessions:readonly ProposedV3Session[]){
  if(sessions.some(s=>s.role==='race'))return null;
  const cardio=sessions.flatMap(s=>s.components).filter(c=>c.sport!=='strength');
  if(!cardio.length||cardio.some(c=>!c.zoneMinutes))return null;
  return {...assessStrictStructuredZoneTarget(cardio.map(c=>({low:c.zoneMinutes!.low,
    nonLow:c.zoneMinutes!.mid+c.zoneMinutes!.high,unknown:c.zoneMinutes!.unknown})),true),complete:!sessions.some(s=>s.sport==='brick'&&s.transitionMinutes===null)};
}
/** Exercise-only minutes: transitions are EXCLUDED, never presumed to last
 * zero minutes. This model cannot certify total slot/weekly duration. */
function exerciseMinutes(session:ProposedV3Session):TriContribution|null{
  if(session.role==='race'||session.sport==='strength'||session.components.some(c=>c.durationMinutes===null))return null;
  const out:TriContribution={swim:0,bike:0,run:0,transition:0};
  for(const c of session.components){if(!['swim','bike','run'].includes(c.sport))return null;out[c.sport as 'swim'|'bike'|'run']+=c.durationMinutes!;}
  return out;
}

export async function generateAppPlanningV3Proposal(app:FrozenAppPlanningInput,athleteId:string,options:V3ProposalOptions={}):Promise<V3PlanProposal> {
  // Reuse the existing identity, fingerprint, family and negative-input guards.
  const study=await buildAppPlanningDetDraft(app,athleteId,options);
  const {athlete,config}=planningInputFor(app,'det');
  const preparation=prepareGenerationContracts(athlete,config);
  const pool=familySourcePool(coachFamilyFor(study.objective)!.key);
  const levels=['untrained','light','trained','highly_trained'];
  const signal=config.ambitionMeta;
  const knownLevel=signal&&['manual','auto-tss'].includes(signal.trainingLevelSource)?levels.indexOf(signal.trainingLevel):-1;
  const sources=filterDraftV3Sources(pool.ids.map(findSource).filter((s):s is V3Workout=>!!s),config,options)
    .filter(source=>knownLevel<0||levels.indexOf(source.minimumLevel)<=knownLevel);
  const supplied=Object.entries(options.swimDomainPaces??{});
  if(supplied.some(([,p])=>!Number.isFinite(p.value)||p.value<=0||!['field_measurement','explicit_estimate'].includes(p.kind)))throw Error('Référence natation invalide.');
  const swimPaces=Object.fromEntries(supplied.map(([d,p])=>[d,p.value]));
  const anchors:V3AthleteAnchors={
    bikeFtpWatts:athlete.ftp??undefined,runThresholdPaceSecPerKm:athlete.paceThresholdSecPerKm??undefined,
    runVvo2SpeedMps:typeof athlete.vma==='number'?athlete.vma/3.6:undefined,
    anchorReferenceKinds:{bikeFtpWatts:'app_reference',runThresholdPaceSecPerKm:'app_reference',runVvo2SpeedMps:'app_reference'},
    swimDomainPacesSecPer100m:swimPaces,swimDomainPaceKinds:Object.fromEntries(supplied.map(([d,p])=>[d,p.kind])),
  };
  const priorities=study.limiterOrder.map(raw=>({raw,resolution:resolveDetLimiter(raw)}));
  if(priorities[0]?.resolution.status!=='supported')throw Error('Limiteur principal non raccordé : aucune priorité de remplacement n’est inventée.');
  const matches=(s:V3Workout,raw:string)=>{
    const r=resolveDetLimiter(raw);return r.status==='supported'&&limiterSourceAffinity({primaryDomain:s.primaryDomain,limiterKeys:s.prescription.physiologicalIntent.limiterKeys},r.key);
  };
  const cache=new Map<string,ProposedV3Workout[]>(),usage=new Map<string,number>();
  const allSlots:ScheduledSport[]=study.weeks.flatMap(week=>week.days.flatMap((day,dayIndex)=>day.slots.map(slot=>({week:week.week,dayIndex,sport:slot.sport,isRaceEvent:slot.role==='race'}))));
  const clock=options.clock?clockFor(options.clock,config.planStartDate!):undefined;
  const clockCache=new Map<string,ReturnType<NonNullable<typeof clock>>>();
  const start=(slot:ScheduledSport)=>{
    if(slot.isRaceEvent||!clock)return null;
    const key=`${slot.week}:${slot.dayIndex}:${slot.sport}`;
    if(!clockCache.has(key))clockCache.set(key,clock(slot));
    return clockCache.get(key)??null;
  };
  function choices(source:V3Workout,min:number|null):ProposedV3Workout[] {
    const key=source.id+':'+min;if(cache.has(key))return cache.get(key)!;
    const brickDoses=normalizeRepairGoal(config.objective)==='half'?V34_SAFE_RUN_BRICKS.flatMap<{targetDurationMin:number;allowWorksetChange:boolean}>(r=>r.bikeId===source.id?[{targetDurationMin:r.bikeMin,allowWorksetChange:false}]:r.runId===source.id?[{targetDurationMin:r.runMin,allowWorksetChange:false}]:[]):[];
    const settings=[pool.doses[source.id]??{},...brickDoses,...(min!==null?[{targetDurationMin:min,allowWorksetChange:false}]:[])];
    const out:ProposedV3Workout[]=[];
    for(const setting of settings)try{
      const configured=previewV3SourceDose(source,setting,swimPaces),duration=evaluateV3Workout(configured,{swimPaces});
      const minutes=duration.status==='confirmed'?duration.minutes:null;
      const dose=structuredV3ZoneDose({id:source.id,sport:source.sport,blocks:configured.blocks},swimPaces);
      // A long slot cannot be fulfilled using an unknown or shorter duration.
      if(min!==null&&(minutes===null||minutes+1e-7<min))continue;
      if(out.some(c=>JSON.stringify(c.blocks)===JSON.stringify(configured.blocks)))continue;
      out.push({sourceId:source.id,sourceFingerprint:fingerprintV3SportingSource(source),title:source.title,sport:source.sport,
        blocks:configured.blocks,durationMinutes:minutes,distanceM:duration.distanceM,
        targets:resolveV3IntensityTargets(configured,anchors),limiterMatches:priorities.filter(p=>matches(source,p.raw)).map(p=>p.raw),
        sourceDomain:source.primaryDomain,zoneMinutes:dose?{low:dose.low,mid:dose.mid,high:dose.high,unknown:dose.unknown}:null,
        review:{minimumRecoveryHours:source.minimumRecoveryHours,prerequisites:[...source.prerequisites],contraindications:[...source.contraindications],stopRule:source.stopRule,minimumLevel:source.minimumLevel}});
    }catch{/* A bounded source/dose that cannot be configured is ineligible. */}
    cache.set(key,out);return out;
  }
  const result:V3PlanProposal={kind:'v3_plan_proposal',status:'assembled_for_review',athleteId,planningInputFingerprint:app.fingerprint,
    objective:study.objective,limiterOrder:[...study.limiterOrder],eventCalendar:structuredClone(config.raceGoals??[]),prescriptionAllowed:false,sourceReview:'pending',weeks:[],checks:[]};
  let priorLoad:number|null=null;
  const goal=normalizeRepairGoal(config.objective);
  const triObjective=({half:'703',ironman:'IM',sprint:'Sprint',olympic:'Olympic'} as const)[goal as 'half'|'ironman'|'sprint'|'olympic'];
  const ratioObjective=parseAthleteConstraints(config.constraints).bannedSports.length?undefined:triObjective;
  const minuteLedger={swim:0,bike:0,run:0};let minuteLedgerKnown=true;
  const finalLoad=study.weeks.filter(w=>w.weekType==='load'&&!w.days.some(d=>d.slots.some(s=>s.role==='race'))).at(-1)?.week;
  for(const week of study.weeks){
    const eligible=sources.filter(s=>(!week.phase||s.phase.includes(week.phase))&&(week.weekType!=='recovery'||easy(s)));
    const slots=week.days.flatMap((day,dayIndex)=>day.slots.map(slot=>({slot,dayIndex})));
    const domains=slots.map(({slot,dayIndex})=>{
      if(slot.role==='race')return [{sport:slot.sport,role:slot.role,components:[],transitionMinutes:null,knownMinutes:0,durationMinutes:null} satisfies ProposedV3Session];
      const single=(sport:string,min:number|null)=>eligible.filter(s=>s.sport===sport&&
        (sport==='strength'||(slot.role==='key'?true:easy(s)))).flatMap(s=>choices(s,min));
      let rows:ProposedV3Session[];
      if(slot.sport==='brick'){
        // For 70.3 base/build/peak, retain only the documented V34 component
        // doses. This does not invoke reviewed composers or approve a transition.
        const recipes=goal==='half'?V34_SAFE_RUN_BRICKS.filter(r=>r.phase===week.phase):[];
        const bikes=eligible.filter(s=>s.sport==='bike'&&(easy(s)||recipes.some(r=>r.bikeId===s.id))).flatMap(s=>choices(s,null));
        const runs=eligible.filter(s=>s.sport==='run'&&easy(s)).flatMap(s=>choices(s,null));
        rows=bikes.flatMap(bike=>runs.flatMap(run=>{
          if(bike.durationMinutes===null||run.durationMinutes===null)return [];
          if(recipes.length&&!recipes.some(r=>r.bikeId===bike.sourceId&&r.runId===run.sourceId&&Math.abs(r.bikeMin-bike.durationMinutes!)<1e-7&&Math.abs(r.runMin-run.durationMinutes!)<1e-7))return [];
          const known=bike.durationMinutes+run.durationMinutes;
          if(slot.minimumMinutes!==null&&known<slot.minimumMinutes)return [];
          return [{sport:'brick',role:slot.role,components:[bike,run],transitionMinutes:null,knownMinutes:known,durationMinutes:null} satisfies ProposedV3Session];
        }));
      }else rows=single(slot.sport,slot.sport==='strength'?null:slot.minimumMinutes).map(c=>({sport:slot.sport,role:slot.role,components:[c],transitionMinutes:null,knownMinutes:c.durationMinutes??0,durationMinutes:c.durationMinutes}));
      const score=(row:ProposedV3Session)=>{
        const hits=row.components.flatMap(c=>c.limiterMatches);
        return (slot.role==='key'||slot.role==='long'?priorities.reduce((n,p,index)=>n+(hits.includes(p.raw)?10/(index+1):0),0)+(week.limiterFocus.focus&&hits.includes(week.limiterFocus.focus)?20:0):0);
      };
      return rows.filter(row=>proposedRecoveryStatus(row,{week:week.week,dayIndex,sport:slot.sport},allSlots,start)!=='blocked').sort((a,b)=>score(b)-score(a)||
        Number(a.durationMinutes===null)-Number(b.durationMinutes===null)||a.components.reduce((n,c)=>n+(usage.get(c.sourceId)??0),0)-b.components.reduce((n,c)=>n+(usage.get(c.sourceId)??0),0)||
        a.knownMinutes-b.knownMinutes||a.components.map(c=>c.sourceId).join().localeCompare(b.components.map(c=>c.sourceId).join()));
    });
    const missing=domains.findIndex(domain=>!domain.length);
    if(missing>=0)throw Error(`S${week.week} ${week.days[slots[missing].dayIndex].day} : aucune dose V3 compatible pour ${slots[missing].slot.sport}. Aucun créneau vide ni remplacement historique n’est produit.`);
    const budget=preparation.weeklyQuotas[week.week]?.volumeBudget;
    const baseCeiling=Math.min(config.weeklyHours!*60,budget?.maxMinutes??Infinity);
    const ceiling=priorLoad!==null&&budget?Math.min(baseCeiling,priorLoad*(week.weekType==='recovery'?0.7:1+budget.weeklyIncreasePctMax)):baseCeiling;
    const requiresQuality=week.weekType==='load'&&config.ambition!=='finisher'&&!slots.some(s=>s.slot.role==='race');
    const trajectory=ratioObjective&&minuteLedgerKnown&&week.weekType==='load'?planTriathlonRatioTrajectory(ratioObjective,
      domains.flatMap((domain,index)=>slots[index].slot.sport==='strength'||slots[index].slot.role==='race'?[]:[{id:String(index),choices:domain.map(exerciseMinutes)}]),minuteLedger,ceiling):null;
    const distance=(session:ProposedV3Session,index:number)=>trajectory?triathlonCandidateDoseDistance(exerciseMinutes(session),trajectory.preferredBySlot[String(index)]):0;
    // Visit the required quality domain first. Remaining domains favor a
    // high easy-minute margin; every candidate remains subject to all gates.
    const order=domains.map((domain,index)=>({domain,index})).sort((a,b)=>
      Number(slots[a.index].slot.sport==='strength')-Number(slots[b.index].slot.sport==='strength')||Number(slots[b.index].slot.role==='key'&&b.domain.some(quality))-Number(slots[a.index].slot.role==='key'&&a.domain.some(quality))||a.domain.length-b.domain.length||a.index-b.index);
    const margin=(session:ProposedV3Session)=>session.components.filter(c=>c.sport!=='strength')
      .reduce((n,c)=>n+(c.zoneMinutes?c.zoneMinutes.low-3*(c.zoneMinutes.mid+c.zoneMinutes.high+c.zoneMinutes.unknown):0),0);
    for(const [index,item] of order.entries())item.domain.sort((a,b)=>
      requiresQuality&&index===0?Number(quality(b))-Number(quality(a))||
        (trajectory?Number(b.components.some(c=>c.limiterMatches.includes(week.limiterFocus.focus??study.limiterOrder[0])))-Number(a.components.some(c=>c.limiterMatches.includes(week.limiterFocus.focus??study.limiterOrder[0])))||distance(a,item.index)-distance(b,item.index):0):
        distance(a,item.index)-distance(b,item.index)||margin(b)-margin(a));
    const selected:ProposedV3Session[]=[];
    const weekSources=new Set<string>();
    const suffix=Array(order.length+1).fill(0) as number[];
    const qualitySuffix=Array(order.length+1).fill(false) as boolean[];
    for(let i=order.length-1;i>=0;i--){suffix[i]=suffix[i+1]+Math.min(...order[i].domain.map(c=>c.knownMinutes));qualitySuffix[i]=qualitySuffix[i+1]||order[i].domain.some(quality);}
    const ratioSuffix=order.map(item=>item.domain.map(s=>s.sport==='strength'?{swim:0,bike:0,run:0,transition:0}:exerciseMinutes(s)));
    const ratioBounds=ratioObjective&&minuteLedgerKnown&&week.week===finalLoad&&ratioSuffix.every(d=>d.every(Boolean))?ratioSuffix.map(domain=>Object.fromEntries((['swim','bike','run'] as const).map(sport=>[sport,{min:Math.min(...domain.map(c=>c![sport])),max:Math.max(...domain.map(c=>c![sport]))}])) as Record<'swim'|'bike'|'run',{min:number;max:number}>):null;
    const zoneKnown=order.every(item=>item.domain.every(session=>session.role!=='race'&&session.components.filter(c=>c.sport!=='strength').every(c=>c.zoneMinutes!==null)));
    const marginSuffix=Array(order.length+1).fill(0) as number[];
    for(let i=order.length-1;i>=0;i--)marginSuffix[i]=marginSuffix[i+1]+Math.max(...order[i].domain.map(margin));
    let nodes=0;
    function solve(index:number,total:number):boolean {
      if(++nodes>50000||total+suffix[index]>ceiling+1e-7)return false;
      if(requiresQuality&&!selected.some(quality)&&!qualitySuffix[index])return false;
      if(week.weekType==='load'&&zoneKnown&&selected.reduce((n,s)=>n+margin(s),0)+marginSuffix[index]<-1e-7)return false;
      if(ratioBounds&&ratioObjective){
        const chosen=selected.filter(s=>s.sport!=='strength').map(exerciseMinutes);
        const ranges=Object.fromEntries((['swim','bike','run'] as const).map(sport=>[sport,{
          min:minuteLedger[sport]+chosen.reduce((n,c)=>n+c![sport],0)+ratioBounds.slice(index).reduce((n,b)=>n+b[sport].min,0),
          max:minuteLedger[sport]+chosen.reduce((n,c)=>n+c![sport],0)+ratioBounds.slice(index).reduce((n,b)=>n+b[sport].max,0),
        }])) as Record<'swim'|'bike'|'run',{min:number;max:number}>;
        for(const sport of ['swim','bike','run'] as const){
          const others=(['swim','bike','run'] as const).filter(s=>s!==sport),[lo,hi]=TRIATHLON_STRICT_MINUTE_RANGES[ratioObjective][sport];
          if(100*ranges[sport].min>hi*(ranges[sport].min+others.reduce((n,s)=>n+ranges[s].max,0))+1e-7||100*ranges[sport].max<lo*(ranges[sport].max+others.reduce((n,s)=>n+ranges[s].min,0))-1e-7)return false;
        }
      }
      if(index===order.length){
        const exact=selected.every(s=>s.durationMinutes!==null);
        const zones=polarization(selected);
        const parts=selected.filter(s=>s.sport!=='strength').map(exerciseMinutes);
        if(ratioObjective&&minuteLedgerKnown&&week.week===finalLoad&&parts.every(p=>p!==null)&&!hasExactStrictTriathlonRatio(ratioObjective,minuteLedger,parts))return false;
        return !(week.weekType==='recovery'&&exact&&priorLoad!==null&&total>priorLoad*0.7+1e-7)&&
          !(requiresQuality&&!selected.some(quality))&&!(week.weekType==='load'&&zones&&!zones.admissible);
      }
      for(const choice of order[index].domain){
        const ids=choice.components.map(c=>c.sourceId);
        if(ids.some(id=>weekSources.has(id)))continue;
        // Reject only proved same-day overlaps. Unknown clocks/durations stay pending.
        const position=slots[order[index].index];
        const here=start({week:week.week,dayIndex:position.dayIndex,sport:choice.sport,isRaceEvent:choice.role==='race'});
        if(here&&selected.some((prior,i)=>{
          const other=slots[order[i].index];if(other.dayIndex!==position.dayIndex)return false;
          const time=start({week:week.week,dayIndex:other.dayIndex,sport:prior.sport,isRaceEvent:prior.role==='race'});if(!time)return false;
          const a=here.minuteOfDay-here.utcOffsetMinutes,b=time.minuteOfDay-time.utcOffsetMinutes;
          return a<b+prior.knownMinutes&&b<a+choice.knownMinutes;
        }))continue;
        for(const id of ids)weekSources.add(id);
        selected.push(choice);if(solve(index+1,total+choice.knownMinutes))return true;selected.pop();
        for(const id of ids)weekSources.delete(id);
      }
      return false;
    }
    if(!solve(0,0))throw Object.assign(Error(`S${week.week} : aucune combinaison V3 trouvée dans le budget, les décharges, les intensités et les proportions vérifiables. Aucun dépassement n’est masqué.`),{code:'v3_proposal_search_refused',week:week.week,searchNodes:nodes,priorSportMinutes:{...minuteLedger},noCompletePlanReturned:true});
    // Search order is internal. Restore the exact original calendar positions.
    const calendarSelected=selected.map((session,index)=>({session,index:order[index].index})).sort((a,b)=>a.index-b.index).map(row=>row.session);
    const knownMinutes=selected.reduce((n,s)=>n+s.knownMinutes,0);
    const durationMinutes=selected.every(s=>s.durationMinutes!==null)?knownMinutes:null;
    const days=week.days.map((day,index)=>({day:day.day,rest:!day.slots.length,sessions:calendarSelected.filter((_,i)=>slots[i].dayIndex===index)}));
    for(const session of selected)for(const component of session.components)usage.set(component.sourceId,(usage.get(component.sourceId)??0)+1);
    result.weeks.push({week:week.week,phase:week.phase,weekType:week.weekType,focus:week.limiterFocus.focus,days,knownMinutes,durationMinutes});
    result.checks.push({code:'weekly_minutes',week:week.week,status:durationMinutes===null?'pending':'passed',message:durationMinutes===null?'Durée totale inconnue : allures, durée de force ou transition manquantes ; plafond non certifié.':'Somme des doses calculées dans le plafond horaire.'});
    if(week.weekType==='load'){
      const zones=polarization(selected);
      result.checks.push({code:'structured_polarization',week:week.week,status:zones?.complete?'passed':'pending',message:zones?.complete?`Blocs configurés : ${zones.lowPct?.toFixed(1)} % de temps facile, ${zones.unknownPct?.toFixed(1)} % non classé. Cibles de construction respectées, sans attestation sportive.`:'Répartition totale des intensités non vérifiable : durée cardio ou transition inconnue. Les composantes connues ne peuvent pas contourner les cibles existantes.'});
      if(requiresQuality)result.checks.push({code:'source_quality',week:week.week,status:'passed',message:'Une dose positive de seuil ou VO₂max est présente dans les blocs configurés ; ce contrôle ne vaut pas preuve de couverture du limiteur.'});
    }
    if(week.limiterFocus.focus&&!selected.some(s=>s.components.some(c=>c.limiterMatches.includes(week.limiterFocus.focus!))))result.checks.push({code:'weekly_focus_unmatched',week:week.week,status:'pending',message:`Focus ${week.limiterFocus.focus} : aucune correspondance source retenue cette semaine ; ne vaut pas couverture physiologique.`});
    if(week.weekType==='load')priorLoad=durationMinutes;
    if(week.weekType==='load'&&!selected.some(s=>s.role==='race')){
      const contributions=selected.filter(s=>s.sport!=='strength').map(exerciseMinutes);
      if(contributions.some(c=>c===null))minuteLedgerKnown=false;
      else for(const contribution of contributions)for(const sport of ['swim','bike','run'] as const)minuteLedger[sport]+=contribution![sport];
    }
  }
  const selected=result.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions.flatMap(s=>s.components)));
  const missingTargets=[...new Set(selected.flatMap(s=>s.targets.missing))];
  if(missingTargets.length)result.checks.push({code:'individual_targets',status:'pending',message:'Repères encore nécessaires : '+missingTargets.join(', ')});
  for(const priority of priorities)if(!selected.some(s=>s.limiterMatches.includes(priority.raw)))result.checks.push({code:'limiter_without_source_match',status:'pending',message:`${priority.raw} : aucune source correspondante retenue ; sa couverture n’est pas validée.`});
  result.checks.push({code:'sporting_review',status:'pending',message:'Revue des doses, proportions, progression, récupération, disponibilité et situation actuelle de l’athlète nécessaire avant utilisation. Aucune approbation créée.'});
  result.checks.push(...auditV3ProposalRecovery(result,config.planStartDate!,options.clock),...auditV3ProposalSportMinutes(result,config.constraints),...auditV3ProposalDoseIntegrity(result));
  if(options.invalidClockSports?.length)result.checks.push({code:'invalid_entered_clock',status:'blocked',message:'Horaires invalides à corriger : '+options.invalidClockSports.join(', ')});
  return result;
}
