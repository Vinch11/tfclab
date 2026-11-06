import type { FrozenAppPlanningInput } from './appPlanningInput';
import { planningInputFor } from './appPlanningInput';
import { buildAppPlanningDetDraft, filterDraftV3Sources, type DraftRestrictions } from './appPlanningDetDraft';
import { familySourcePool } from './familySourcePools';
import { findSource } from './coachDetContext';
import { coachFamilyFor } from '../../../experimental/det-engine/v401-coach-inputs-core';
import { resolveDetLimiter } from '../../../experimental/det-engine/v403-limiter-semantics';
import { limiterSourceAffinity } from '../../../experimental/det-engine/v411-limiter-source-affinity';
import { previewV3SourceDose } from '../../../experimental/det-engine/v31-v3-catalogue';
import { fingerprintV3SportingSource } from '../../../scripts/library-v3/sportingQualification800';
import { evaluateV3Workout, type V3Block, type V3Workout } from '../../../scripts/library-v3/catalogueRuntime';
import { resolveV3IntensityTargets, type V3AthleteAnchors, type V3IntensityResolution } from '../../../scripts/library-v3/resolveV3Intensity';

/** A chosen source prescription proposed for review, NOT an admitted workout.
 * Deliberately incompatible with ParsedPlan, qualified DET and export schemas. */
export interface ProposedV3Workout {
  sourceId: string; sourceFingerprint: string; title: string; sport: string;
  blocks: V3Block[]; durationMinutes: number | null; distanceM: number;
  targets: V3IntensityResolution; limiterMatches: string[];
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
  checks: Array<{code:string;week?:number;status:'pending'|'passed';message:string}>;
}
export interface V3ProposalOptions extends DraftRestrictions {
  /** Explicit references entered by the coach, never inferred from CSS. */
  swimDomainPaces?: Record<string,{value:number;kind:'field_measurement'|'explicit_estimate'}>;
}
const easy=(source:V3Workout)=>source.sport==='strength'||
  source.prescription.physiologicalIntent.domainIds.every(d=>d==='recovery'||d==='moderate_lt1');

export async function generateAppPlanningV3Proposal(app:FrozenAppPlanningInput,athleteId:string,options:V3ProposalOptions={}):Promise<V3PlanProposal> {
  // Reuse the existing identity, fingerprint, family and negative-input guards.
  const study=await buildAppPlanningDetDraft(app,athleteId,options);
  const {athlete,config}=planningInputFor(app,'det');
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
  function choices(source:V3Workout,min:number|null):ProposedV3Workout[] {
    const key=source.id+':'+min;if(cache.has(key))return cache.get(key)!;
    const settings=[pool.doses[source.id]??{},...(min!==null?[{targetDurationMin:min,allowWorksetChange:false}]:[])];
    const out:ProposedV3Workout[]=[];
    for(const setting of settings)try{
      const configured=previewV3SourceDose(source,setting,swimPaces),duration=evaluateV3Workout(configured,{swimPaces});
      const minutes=duration.status==='confirmed'?duration.minutes:null;
      // A long slot cannot be fulfilled using an unknown or shorter duration.
      if(min!==null&&(minutes===null||minutes+1e-7<min))continue;
      if(out.some(c=>JSON.stringify(c.blocks)===JSON.stringify(configured.blocks)))continue;
      out.push({sourceId:source.id,sourceFingerprint:fingerprintV3SportingSource(source),title:source.title,sport:source.sport,
        blocks:configured.blocks,durationMinutes:minutes,distanceM:duration.distanceM,
        targets:resolveV3IntensityTargets(configured,anchors),limiterMatches:priorities.filter(p=>matches(source,p.raw)).map(p=>p.raw),
        review:{minimumRecoveryHours:source.minimumRecoveryHours,prerequisites:[...source.prerequisites],contraindications:[...source.contraindications],stopRule:source.stopRule,minimumLevel:source.minimumLevel}});
    }catch{/* A bounded source/dose that cannot be configured is ineligible. */}
    cache.set(key,out);return out;
  }
  const result:V3PlanProposal={kind:'v3_plan_proposal',status:'assembled_for_review',athleteId,planningInputFingerprint:app.fingerprint,
    objective:study.objective,limiterOrder:[...study.limiterOrder],eventCalendar:structuredClone(config.raceGoals??[]),prescriptionAllowed:false,sourceReview:'pending',weeks:[],checks:[]};
  let priorLoad:number|null=null;
  for(const week of study.weeks){
    const eligible=sources.filter(s=>(!week.phase||s.phase.includes(week.phase))&&(week.weekType!=='recovery'||easy(s)));
    const slots=week.days.flatMap((day,dayIndex)=>day.slots.map(slot=>({slot,dayIndex})));
    const domains=slots.map(({slot})=>{
      if(slot.role==='race')return [{sport:slot.sport,role:slot.role,components:[],transitionMinutes:null,knownMinutes:0,durationMinutes:null} satisfies ProposedV3Session];
      const single=(sport:string,min:number|null)=>eligible.filter(s=>s.sport===sport&&
        (sport==='strength'||(slot.role==='key'?true:easy(s)))).flatMap(s=>choices(s,min));
      let rows:ProposedV3Session[];
      if(slot.sport==='brick'){
        // Propose two genuine V3 prescriptions; transition remains unconfirmed.
        const bikes=eligible.filter(s=>s.sport==='bike'&&easy(s)).flatMap(s=>choices(s,null));
        const runs=eligible.filter(s=>s.sport==='run'&&easy(s)).flatMap(s=>choices(s,null));
        rows=bikes.flatMap(bike=>runs.flatMap(run=>{
          if(bike.durationMinutes===null||run.durationMinutes===null)return [];
          const known=bike.durationMinutes+run.durationMinutes;
          if(slot.minimumMinutes!==null&&known<slot.minimumMinutes)return [];
          return [{sport:'brick',role:slot.role,components:[bike,run],transitionMinutes:null,knownMinutes:known,durationMinutes:null} satisfies ProposedV3Session];
        }));
      }else rows=single(slot.sport,slot.sport==='strength'?null:slot.minimumMinutes).map(c=>({sport:slot.sport,role:slot.role,components:[c],transitionMinutes:null,knownMinutes:c.durationMinutes??0,durationMinutes:c.durationMinutes}));
      const score=(row:ProposedV3Session)=>{
        const hits=row.components.flatMap(c=>c.limiterMatches);
        return (slot.role==='key'||slot.role==='long'?priorities.reduce((n,p,index)=>n+(hits.includes(p.raw)?10/(index+1):0),0)+(week.limiterFocus.focus&&hits.includes(week.limiterFocus.focus)?20:0):0);
      };
      return rows.sort((a,b)=>score(b)-score(a)||
        a.components.reduce((n,c)=>n+(usage.get(c.sourceId)??0),0)-b.components.reduce((n,c)=>n+(usage.get(c.sourceId)??0),0)||
        a.knownMinutes-b.knownMinutes||a.components.map(c=>c.sourceId).join().localeCompare(b.components.map(c=>c.sourceId).join()));
    });
    const missing=domains.findIndex(domain=>!domain.length);
    if(missing>=0)throw Error(`S${week.week} ${week.days[slots[missing].dayIndex].day} : aucune dose V3 compatible pour ${slots[missing].slot.sport}. Aucun créneau vide ni remplacement historique n’est produit.`);
    const ceiling=config.weeklyHours!*60;
    const selected:ProposedV3Session[]=[];
    const weekSources=new Set<string>();
    const suffix=Array(domains.length+1).fill(0) as number[];
    for(let i=domains.length-1;i>=0;i--)suffix[i]=suffix[i+1]+Math.min(...domains[i].map(c=>c.knownMinutes));
    let nodes=0;
    function solve(index:number,total:number):boolean {
      if(++nodes>50000||total+suffix[index]>ceiling+1e-7)return false;
      if(index===domains.length){
        const exact=selected.every(s=>s.durationMinutes!==null);
        return !(week.weekType==='recovery'&&exact&&priorLoad!==null&&total>priorLoad*0.7+1e-7);
      }
      for(const choice of domains[index]){
        const ids=choice.components.map(c=>c.sourceId);
        if(ids.some(id=>weekSources.has(id)))continue;
        for(const id of ids)weekSources.add(id);
        selected.push(choice);if(solve(index+1,total+choice.knownMinutes))return true;selected.pop();
        for(const id of ids)weekSources.delete(id);
      }
      return false;
    }
    if(!solve(0,0))throw Error(`S${week.week} : aucune combinaison V3 trouvée dans le budget et les décharges vérifiables. Aucun dépassement n’est masqué.`);
    const knownMinutes=selected.reduce((n,s)=>n+s.knownMinutes,0);
    const durationMinutes=selected.every(s=>s.durationMinutes!==null)?knownMinutes:null;
    const days=week.days.map((day,index)=>({day:day.day,rest:!day.slots.length,sessions:selected.filter((_,i)=>slots[i].dayIndex===index)}));
    for(const session of selected)for(const component of session.components)usage.set(component.sourceId,(usage.get(component.sourceId)??0)+1);
    result.weeks.push({week:week.week,phase:week.phase,weekType:week.weekType,focus:week.limiterFocus.focus,days,knownMinutes,durationMinutes});
    result.checks.push({code:'weekly_minutes',week:week.week,status:durationMinutes===null?'pending':'passed',message:durationMinutes===null?'Durée totale inconnue : allures, durée de force ou transition manquantes ; plafond non certifié.':'Somme des doses calculées dans le plafond horaire.'});
    if(week.limiterFocus.focus&&!selected.some(s=>s.components.some(c=>c.limiterMatches.includes(week.limiterFocus.focus!))))result.checks.push({code:'weekly_focus_unmatched',week:week.week,status:'pending',message:`Focus ${week.limiterFocus.focus} : aucune correspondance source retenue cette semaine ; ne vaut pas couverture physiologique.`});
    if(week.weekType==='load')priorLoad=durationMinutes;
  }
  const selected=result.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions.flatMap(s=>s.components)));
  const missingTargets=[...new Set(selected.flatMap(s=>s.targets.missing))];
  if(missingTargets.length)result.checks.push({code:'individual_targets',status:'pending',message:'Repères encore nécessaires : '+missingTargets.join(', ')});
  for(const priority of priorities)if(!selected.some(s=>s.limiterMatches.includes(priority.raw)))result.checks.push({code:'limiter_without_source_match',status:'pending',message:`${priority.raw} : aucune source correspondante retenue ; sa couverture n’est pas validée.`});
  result.checks.push({code:'sporting_review',status:'pending',message:'Revue des doses, proportions, progression, récupération, disponibilité et situation actuelle de l’athlète nécessaire avant utilisation. Aucune approbation créée.'});
  return result;
}
