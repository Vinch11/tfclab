import {trailReturnSources} from '../../../scripts/library-v3/trailReturnSources';
import {introductoryStrengthSources,completeStrengthSources,trainedStrengthSources,timedSwimSources} from '../../../scripts/library-v3/completeSessionSources';
import {library920CandidatesForProposal,library920Problems,library920SourceMetadata,library920Manifest} from '../../../scripts/library-v3/library920Catalogue';
import {library920ContextProblems,library920TimingPaces,resolveLibrary920Targets} from './library920Selection';
import type { FrozenAppPlanningInput } from './appPlanningInput';
import { planningInputFor } from './appPlanningInput';
import { buildAppPlanningDetDraft, filterDraftV3Sources, type DraftRestrictions, type AppPlanningDetDraft } from './appPlanningDetDraft';
import { familySourcePool } from './familySourcePools';
import { findSource,FATIGUE_LABELS,RECENT_LOAD_LABELS } from './coachDetContext';
import { coachFamilyFor,clockFor } from '../../../experimental/det-engine/v401-coach-inputs-core';
import { primaryRunningInputProblems } from '../../../experimental/det-engine/v408-primary-limiter-evidence';
import { resolveDetLimiter } from '../../../experimental/det-engine/v403-limiter-semantics';
import { limiterSourceAffinity } from '../../../experimental/det-engine/v411-limiter-source-affinity';
import { previewV3SourceDose } from '../../../experimental/det-engine/v31-v3-catalogue';
import { fingerprintV3SportingSource } from '../../../scripts/library-v3/sportingQualification800';
import { evaluateV3Workout, type V3Block, type V3Workout } from '../../../scripts/library-v3/catalogueRuntime';
import { resolveV3IntensityTargets, type V3AthleteAnchors, type V3IntensityResolution } from '../../../scripts/library-v3/resolveV3Intensity';
import { structuredV3ZoneDose, type StructuredZoneDose } from '../../../experimental/det-engine/v310-structured-zone-dose';
import { assessStrictStructuredZoneTarget } from '../../../experimental/det-engine/v39-strict-native-polarization-target';
import {prepareDetGeneration,trailFamily,type TrailLongRunLimits} from './trailPreparation';
import { auditV3ProposalRecovery,auditV3ProposalSportMinutes,auditV3ProposalDoseIntegrity,auditV3SportingPrescription,proposedRecoveryStatus } from './appPlanningV3Audit';
import type { ScheduledSport } from '../../../experimental/det-engine/v39-calendar-safe-recovery';
import { planTriathlonRatioTrajectory,triathlonCandidateDoseDistance,type TriContribution } from '../../../experimental/det-engine/v312-triathlon-dose-trajectory';
import { hasExactStrictTriathlonRatio,TRIATHLON_STRICT_MINUTE_RANGES } from '../../../experimental/det-engine/v314-cumulative-ratio-search';
import { normalizeRepairGoal } from '../../../supabase/functions/_shared/repairSportingEquivalence';
import { parseAthleteConstraints } from '@/lib/plan/constraintRules';
import { V34_SAFE_RUN_BRICKS } from '../../../experimental/det-engine/v34-v3-low-run-bricks';
import type { CoachConfirmedClock } from '../../../experimental/det-engine/v401-coach-inputs-core';
import {roadRunningPrescription,v3SourceContextProblems,domainMinutes,demandingRun,demandingRunDaysCompatible,primaryPrescriptionMatch} from './v3SportingPrescription';

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
  trailLongRunLimits?:TrailLongRunLimits;
  limiterOrder: string[]; prescriptionAllowed: false; sourceReview: 'pending';
  eventCalendar: NonNullable<FrozenAppPlanningInput['config']['raceGoals']>;
  weeks: Array<{week:number;phase:string|null;weekType:string;focus:string|null;
    days:Array<{day:string;rest:boolean;sessions:ProposedV3Session[]}>;
    knownMinutes:number;durationMinutes:number|null}>;
  checks: Array<{code:string;week?:number;status:'pending'|'passed'|'blocked';message:string}>;
}
export interface V3ProposalOptions extends DraftRestrictions {
  /** Ordinary imported candidates only; this does not grant source authority. */
  includeLibrary920?: boolean;
  clock?: CoachConfirmedClock;
  /** Only the normal pre-review app plan; strict reviewed pools stay unchanged. */
  completeSessions?: boolean;
  trailLongRunLimits?:TrailLongRunLimits;
  strengthLoadAndRpeConfirmed?: boolean;
  invalidClockSports?: string[];
  /** Explicit references entered by the coach, never inferred from CSS. */
  swimDomainPaces?: Record<string,{value:number;kind:'field_measurement'|'explicit_estimate'}>;
}
const easy=(source:V3Workout)=>source.sport==='strength'||
  source.prescription.physiologicalIntent.domainIds.every(d=>d==='recovery'||d==='moderate_lt1');
const thresholdQuality=(session:ProposedV3Session)=>session.components.some(c=>
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

function minimumDistinctExerciseMinutes(domains:ProposedV3Session[][]):number{
  const ordered=domains.map(rows=>[...rows].sort((a,b)=>a.knownMinutes-b.knownMinutes)).sort((a,b)=>a.length-b.length);
  const suffix=Array(ordered.length+1).fill(0) as number[];
  for(let i=ordered.length-1;i>=0;i--)suffix[i]=suffix[i+1]+Math.min(...ordered[i].map(s=>s.knownMinutes));
  let best=Infinity,nodes=0,exhausted=false;const used=new Set<string>();
  function visit(index:number,total:number){
    if(++nodes>50000){exhausted=true;return;}
    if(total+suffix[index]>=best-1e-7)return;
    if(index===ordered.length){best=total;return;}
    for(const s of ordered[index]){
      const ids=s.components.map(c=>c.sourceId);if(ids.some(id=>used.has(id)))continue;
      for(const id of ids)used.add(id);visit(index+1,total+s.knownMinutes);for(const id of ids)used.delete(id);
      if(exhausted)return;
    }
  }
  visit(0,0);
  // A bounded search must never present its best upper bound as a minimum.
  return exhausted||!Number.isFinite(best)?suffix[0]:best;
}

export async function generateAppPlanningV3Proposal(app:FrozenAppPlanningInput,athleteId:string,options:V3ProposalOptions={}):Promise<V3PlanProposal> {
  // Reuse the existing identity, fingerprint, family and negative-input guards.
  const study=await buildAppPlanningDetDraft(app,athleteId,options);
  const {athlete,config}=planningInputFor(app,'det');
  const preparation=prepareDetGeneration(athlete,config);
  const road=roadRunningPrescription(config);
  const trail=trailFamily(config);
  const trailLimits=options.trailLongRunLimits;
  if(trailLimits&&(!trail||![trailLimits.recentMinutes,trailLimits.peakMinutes].every(n=>Number.isFinite(n)&&n>0)||
    trailLimits.peakMinutes<trailLimits.recentMinutes))throw Error('Trail : préciser une sortie longue tolérée et un plafond de préparation au moins égal.');
  if(options.completeSessions&&road&&!road.level)throw Object.assign(Error('Renseignez le niveau d’entraînement actuel dans la configuration commune ; aucune capacité ni assimilation n’est déduite de l’ambition ou de la VMA.'),{code:'v3_training_level_missing',noCompletePlanReturned:true});
  const quality=(session:ProposedV3Session)=>thresholdQuality(session)||!!road?.raceDomain&&session.components.some(c=>c.sport==='run'&&domainMinutes(c.blocks,road.raceDomain!)>0);
  const pool=familySourcePool(coachFamilyFor(study.objective)!.key);
  const levels=['untrained','light','trained','highly_trained'];
  const signal=config.ambitionMeta;
  const knownLevel=signal&&['manual','auto-tss'].includes(signal.trainingLevelSource)?levels.indexOf(signal.trainingLevel):-1;
  const recentTraining = config.loadHistory?.recentWeeklyHours;
  if(trail&&knownLevel===0&&(!trailLimits||!Number.isFinite(recentTraining)||(recentTraining??0)<=0))
    throw Error('Trail en reprise : renseigner le volume hebdomadaire récent, la sortie longue récemment tolérée et son plafond pour doser les premières semaines.');
  const timedSwim=options.completeSessions&&(!options.swimDomainPaces?.recovery||!options.swimDomainPaces?.moderate_lt1);
  const selectedSources=pool.ids.map(findSource).filter((s):s is V3Workout=>!!s).filter(s=>!options.completeSessions||s.sport!=='strength').filter(s=>!timedSwim||s.sport!=='swim');
  if(options.completeSessions){
    const strengthSources = knownLevel===0 ? introductoryStrengthSources : road&&knownLevel>=2 ? trainedStrengthSources : completeStrengthSources;
    selectedSources.push(...strengthSources);
  }
  if(options.completeSessions && trail?.key==='trail_short' && knownLevel===0)selectedSources.push(...trailReturnSources);
  if(timedSwim)selectedSources.push(...timedSwimSources);
  let librarySources:V3Workout[]=[];
  if(options.includeLibrary920){
    const problems=library920Problems();if(problems.length)throw Error(problems.join('; '));
    const level=knownLevel>=0?levels[knownLevel]:undefined;
    librarySources=filterDraftV3Sources(library920CandidatesForProposal().filter(s=>
      library920ContextProblems(s,config.objective,level).length===0&&
      (!options.completeSessions||s.sport!=='strength')&&(!timedSwim||s.sport!=='swim')),config,options);
  }
  const sources=filterDraftV3Sources(selectedSources,config,options)
    .filter(source=>knownLevel<0||levels.indexOf(source.minimumLevel)<=knownLevel)
    .filter(source=>v3SourceContextProblems(source,config).length===0);
  librarySources=librarySources.filter(source=>v3SourceContextProblems(source,config).length===0);
  const supplied=Object.entries(options.swimDomainPaces??{});
  if(supplied.some(([,p])=>!Number.isFinite(p.value)||p.value<=0||!['field_measurement','explicit_estimate'].includes(p.kind)))throw Error('Référence natation invalide.');
  const swimPaces=Object.fromEntries(supplied.map(([d,p])=>[d,p.value]));
  const anchors:V3AthleteAnchors={
    bikeFtpWatts:athlete.ftp??undefined,runThresholdPaceSecPerKm:athlete.paceThresholdSecPerKm??undefined,
    runVvo2SpeedMps:typeof athlete.vma==='number'?athlete.vma/3.6:undefined,
    anchorReferenceKinds:{bikeFtpWatts:'app_reference',runThresholdPaceSecPerKm:'app_reference',runVvo2SpeedMps:'app_reference'},
    ...(options.strengthLoadAndRpeConfirmed===true?{coachValidatedStrengthLoadAndRpe:true as const}:{}),
    swimDomainPacesSecPer100m:swimPaces,swimDomainPaceKinds:Object.fromEntries(supplied.map(([d,p])=>[d,p.kind])),
  };
  if(road?.raceDomain){
    const event=config.raceGoals?.find(g=>normalizeRepairGoal(g.objective)===road.goal&&g.priority==='A'&&typeof g.targetTimeMinutes==='number'&&g.targetTimeMinutes>0);
    if(event?.targetTimeMinutes)anchors.runRacePacesSecPerKm={[road.raceDomain]:event.targetTimeMinutes*60/(road.goal==='marathon'?42.195:21.0975)};
  }
  const priorities=study.limiterOrder.map(raw=>({raw,resolution:resolveDetLimiter(raw)}));
  if(priorities[0]?.resolution.status!=='supported')throw Error('Limiteur principal non raccordé : aucune priorité de remplacement n’est inventée.');
  const primaryKey=priorities[0].resolution.key;
  if(trail && primaryRunningInputProblems(config).length)throw Error(primaryRunningInputProblems(config).join(' '));
  const primaryMatchCache=new Map<ProposedV3Workout,boolean>();
  function componentMatchesPrimary(c:ProposedV3Workout):boolean {
    if(!primaryMatchCache.has(c))primaryMatchCache.set(c,primaryPrescriptionMatch(c,findSource(c.sourceId)!,primaryKey));
    return primaryMatchCache.get(c)!;
  }
  const matchesPrimary=(session:ProposedV3Session)=>!!(road||trail)&&session.components.some(c=>c.sport==='run'&&componentMatchesPrimary(c));
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
  function choices(source:V3Workout,min:number|null,desired?:number):ProposedV3Workout[] {
    const key=source.id+':'+min+':'+desired;if(cache.has(key))return cache.get(key)!;
    const brickDoses=normalizeRepairGoal(config.objective)==='half'?V34_SAFE_RUN_BRICKS.flatMap<{targetDurationMin:number;allowWorksetChange:boolean}>(r=>r.bikeId===source.id?[{targetDurationMin:r.bikeMin,allowWorksetChange:false}]:r.runId===source.id?[{targetDurationMin:r.runMin,allowWorksetChange:false}]:[]):[];
    // These are proposed doses inside the source's declared bounds, not human
    // approvals. The qualified runner and its explicit review remain separate.
    const introDoses = trailReturnSources.includes(source) ? source.prescription.parameters
      .filter(p => p.path === '1.count')
      .flatMap(p => Array.from({length:p.max-p.min+1}, (_,i) =>
        ({overrides:{'1.count':p.min+i},allowWorksetChange:true}))) : [];
    const settings=[pool.doses[source.id]??{},...brickDoses,...introDoses,...(min!==null?[{targetDurationMin:min,allowWorksetChange:false}]:[]),
      ...(desired!==undefined?[desired,...(trail&&knownLevel===0&&trailLimits?[Math.floor(desired)]:[]),Math.floor(desired/5)*5,Math.ceil(desired/5)*5].map(targetDurationMin=>({targetDurationMin,allowWorksetChange:true})):[])];
    const out:ProposedV3Workout[]=[];
    for(const setting of settings)try{
      const timingPaces=library920TimingPaces(source,swimPaces);
      const configured=previewV3SourceDose(source,setting,timingPaces),duration=evaluateV3Workout(configured,{swimPaces:timingPaces});
      const minutes=duration.status==='confirmed'?duration.minutes:null;
      const dose=structuredV3ZoneDose({id:source.id,sport:source.sport,blocks:configured.blocks},timingPaces);
      // A long slot cannot be fulfilled using an unknown or shorter duration.
      if(min!==null&&(minutes===null||minutes+1e-7<min))continue;
      if(out.some(c=>JSON.stringify(c.blocks)===JSON.stringify(configured.blocks)))continue;
      out.push({sourceId:source.id,sourceFingerprint:fingerprintV3SportingSource(source),title:source.title,sport:source.sport,
        blocks:configured.blocks,durationMinutes:minutes,distanceM:duration.distanceM,
        targets:trail&&configured.sport==='run'?{status:'unresolved',targets:[],missing:['run_terrain_effort_review.'+source.id],candidateOnly:true,notScientificValidation:true} as const:resolveLibrary920Targets(configured,anchors),limiterMatches:priorities.filter(p=>matches(source,p.raw)).map(p=>p.raw),
        sourceDomain:source.primaryDomain,zoneMinutes:dose?{low:dose.low,mid:dose.mid,high:dose.high,unknown:dose.unknown}:null,
        review:{minimumRecoveryHours:source.minimumRecoveryHours,prerequisites:[...source.prerequisites],contraindications:[...source.contraindications],stopRule:source.stopRule,minimumLevel:source.minimumLevel}});
    }catch{/* A bounded source/dose that cannot be configured is ineligible. */}
    cache.set(key,out);return out;
  }
  const result:V3PlanProposal={kind:'v3_plan_proposal',status:'assembled_for_review',athleteId,planningInputFingerprint:app.fingerprint,
    ...(trailLimits?{trailLongRunLimits:{...trailLimits}}:{}),objective:study.objective,limiterOrder:[...study.limiterOrder],eventCalendar:structuredClone(config.raceGoals??[]),prescriptionAllowed:false,sourceReview:'pending',weeks:[],checks:[]};
  let priorLoad:number|null=null;
  let peakKnownMinutes=0,previousSpecificMinutes=0;
  let previousSpecificPhase:string|null=null;
  let priorLongRunMinutes:number|null=null;
  const demandingDays:number[]=[];
  let doseCeiling:number|undefined;
  const goal=normalizeRepairGoal(config.objective);
  const triObjective=({half:'703',ironman:'IM',sprint:'Sprint',olympic:'Olympic'} as const)[goal as 'half'|'ironman'|'sprint'|'olympic'];
  // The bike/run evidence rules operate on configured blocks. For VLamax
  // they describe reduction only when the app actually documents that direction.
  const triDoseApplicable=!!triObjective&&primaryRunningInputProblems(config).length===0;
  const triDoseMatch=(c:ProposedV3Workout)=>triDoseApplicable&&c.targets.status==='resolved'&&componentMatchesPrimary(c);
  const ratioObjective=parseAthleteConstraints(config.constraints).bannedSports.length?undefined:triObjective;
  const minuteLedger={swim:0,bike:0,run:0};let minuteLedgerKnown=true;
  const finalLoad=study.weeks.filter(w=>w.weekType==='load'&&!w.days.some(d=>d.slots.some(s=>s.role==='race'))).at(-1)?.week;
  function weekDomains(week:AppPlanningDetDraft['weeks'][number],includeImported=!!road||!!trail):{eligible:V3Workout[];slots:Array<{slot:AppPlanningDetDraft['weeks'][number]['days'][number]['slots'][number];dayIndex:number}>;domains:ProposedV3Session[][]}{
    const eligible=[...sources,...(includeImported?librarySources:[])].filter(s=>(!week.phase||s.phase.includes(week.phase))&&(week.weekType!=='recovery'||easy(s))&&v3SourceContextProblems(s,config,week.weekType).length===0);
    const slots=week.days.flatMap((day,dayIndex)=>day.slots.map(slot=>({slot,dayIndex})));
    const cardio=slots.filter(s=>s.slot.sport==='run'&&s.slot.role!=='race');
    const strength=sources.filter(s=>s.sport==='strength'&&(!week.phase||s.phase.includes(week.phase))).flatMap(s=>choices(s,null)).map(c=>c.durationMinutes).filter((n):n is number=>n!==null);
    const strengthReserve=strength.length?Math.min(...strength)*slots.filter(s=>s.slot.sport==='strength').length:0;
    // Search allocation, not a mandatory distance: marathon long slots receive
    // more of the coach's available dose than ordinary footings. All individual
    // ramp, source bounds and recovery constraints still apply.
    const longWeight=road?.goal==='marathon'?3:2;
    const weight=cardio.reduce((n,s)=>n+(s.slot.role==='long'?longWeight:1),0);
    const desiredBase=(road||trail&&trailLimits)&&doseCeiling!==undefined&&weight?Math.max(0,doseCeiling-strengthReserve)/weight:undefined;
    const domains=slots.map(({slot,dayIndex})=>{
      if(slot.role==='race')return [{sport:slot.sport,role:slot.role,components:[],transitionMinutes:null,knownMinutes:0,durationMinutes:null} satisfies ProposedV3Session];
      const longRun=!!road&&knownLevel>=2&&slot.sport==='run'&&slot.role==='long';
      const longFloor=longRun&&week.weekType==='load'&&priorLongRunMinutes!==null?Math.max(slot.minimumMinutes??0,priorLongRunMinutes*.9):slot.minimumMinutes;
      const trailLongCeiling = Math.min(trailLimits?.peakMinutes ?? Infinity,
        priorLongRunMinutes === null ? trailLimits?.recentMinutes ?? Infinity :
          priorLongRunMinutes * (1 + (config.volumeRamp?.weeklyIncreasePctMax ?? 0)));
      const longCeiling=trail&&slot.role==='long'?trailLongCeiling:longRun?(week.weekType==='recovery'&&priorLongRunMinutes!==null?Math.max(slot.minimumMinutes??0,priorLongRunMinutes*.7):week.weekType==='load'?(priorLongRunMinutes===null?slot.minimumMinutes??Infinity:Math.max(slot.minimumMinutes??0,priorLongRunMinutes*(1+(preparation.weeklyQuotas[week.week]?.volumeBudget?.weeklyIncreasePctMax??.1)))):Infinity):Infinity;
      const single=(sport:string,min:number|null)=>eligible.filter(s=>s.sport===sport&&
        (sport==='strength'||slot.role==='key'||easy(s)||(road&&slot.role==='long'&&['build','peak'].includes(week.phase??'')&&s.primaryDomain===road.raceDomain)))
        .flatMap(s=>choices(s,min,desiredBase!==undefined&&sport==='run'?Math.max(min??0,Math.min(longCeiling,desiredBase*(slot.role==='long'?longWeight:1))):undefined));
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
      }else rows=single(slot.sport,slot.sport==='strength'?null:longFloor).map(c=>({sport:slot.sport,role:slot.role,components:[c],transitionMinutes:null,knownMinutes:c.durationMinutes??0,durationMinutes:c.durationMinutes}));
      if(trail&&slot.sport==='run')rows=rows.filter(row=>row.durationMinutes!==null&&(!trailLimits||row.durationMinutes<=(week.week===1?trailLimits.recentMinutes:trailLimits.peakMinutes)));
      if(trail&&week.weekType==='load'&&slot.role==='long'){
        // Native long trail prescriptions contain timed main blocks on slopes or trails.
        const nativeTerrainLong = ['V3P_RUN_086','V3P_RUN_089','V3P_RUN_092','V3P_RUN_205'];
        rows=rows.filter(row=>row.components.some(c=>c.sourceDomain==='moderate_lt1' &&
          (nativeTerrainLong.includes(c.sourceId)||library920SourceMetadata(c.sourceId)?.terrainEffortRequired)));
      }
      const score=(row:ProposedV3Session)=>{
        const hits=row.components.flatMap(c=>c.limiterMatches);
        return (slot.role==='key'||slot.role==='long'?priorities.reduce((n,p,index)=>n+(hits.includes(p.raw)?10/(index+1):0),0)+(week.limiterFocus.focus&&hits.includes(week.limiterFocus.focus)?20:0):0);
      };
      return rows.filter(row=>!road||row.role==='race'||row.components.every(c=>c.sport!=='run'||c.durationMinutes!==null&&c.targets.status==='resolved'))
        .filter(row=>!(longRun||trail&&slot.role==='long')||row.knownMinutes<=longCeiling+1e-7)
        .filter(row=>!slot.maximumMinutes||(row.durationMinutes!==null&&row.durationMinutes<=slot.maximumMinutes+1e-7)).filter(row=>proposedRecoveryStatus(row,{week:week.week,dayIndex,sport:slot.sport},allSlots,start)!=='blocked').sort((a,b)=>score(b)-score(a)||
        Number(a.durationMinutes===null)-Number(b.durationMinutes===null)||a.components.reduce((n,c)=>n+(usage.get(c.sourceId)??0),0)-b.components.reduce((n,c)=>n+(usage.get(c.sourceId)??0),0)||
        a.knownMinutes-b.knownMinutes||a.components.map(c=>c.sourceId).join().localeCompare(b.components.map(c=>c.sourceId).join()));
    });
    const missing=domains.findIndex(domain=>!domain.length);
    if(missing>=0){
      if(!includeImported&&librarySources.length)return weekDomains(week,true);
      throw Error(`S${week.week} ${week.days[slots[missing].dayIndex].day} : aucune dose V3 compatible pour ${slots[missing].slot.sport}. Aucun créneau vide ni remplacement historique n’est produit.`);
    }
    // Prove a distinct-source shortage before broadening the established pool.
    // Single-component slots form a bipartite matching problem; bricks remain
    // with the existing composition solver, never reduced to one source here.
    if(!includeImported&&librarySources.length&&domains.every(rows=>rows.every(s=>s.components.length<=1))){
      const assigned=new Map<string,number>();
      const keys=domains.map(rows=>[...new Set(rows.flatMap(s=>s.components.map(c=>c.sourceId)))]);
      const match=(index:number,seen:Set<string>):boolean=>keys[index].some(id=>{
        if(seen.has(id))return false;seen.add(id);
        const previous=assigned.get(id);
        if(previous!==undefined&&!match(previous,seen))return false;
        assigned.set(id,index);return true;
      });
      if(keys.some((ids,index)=>ids.length>0&&!match(index,new Set())))return weekDomains(week,true);
    }
    return {eligible,slots,domains};
  }
  for(const week of study.weeks){
    const budget=preparation.weeklyQuotas[week.week]?.volumeBudget;
    const firstWeekRecentMinutes = options.completeSessions && week.week === 1 && Number.isFinite(recentTraining) && (recentTraining??0)>0
      ? recentTraining! * 60 : undefined;
    const baseCeiling=Math.min(config.weeklyHours!*60,budget?.maxMinutes??Infinity,firstWeekRecentMinutes??Infinity);
    const taperIndex=study.weeks.filter(w=>w.weekType==='taper'&&w.week<=week.week).length;
    const taperCeiling=(road||trail)&&peakKnownMinutes>0&&['taper','race'].includes(week.weekType)?peakKnownMinutes*(week.weekType==='race'?.4:taperIndex===1?.6:.5):Infinity;
    const ceiling=Math.min(baseCeiling,taperCeiling,priorLoad===null?Infinity:week.weekType==='recovery'?priorLoad*0.7:budget?priorLoad*(1+budget.weeklyIncreasePctMax):Infinity);
    doseCeiling=ceiling;
    const {eligible,slots,domains}=weekDomains(week);
    // Do not greedily choose a small load week that makes the next recovery
    // week's existing slot floors impossible. This is an exercise-dose lower
    // bound only; unknown transitions/totals remain explicitly unknown.
    if(firstWeekRecentMinutes!==undefined){
      // Lower bound across all slots. Several slots might compete for the same
      // source, so the true minimum may be higher. Unknown durations contribute zero.
      const minimum = domains.reduce((n,rows)=>n+Math.min(...rows.map(r=>r.knownMinutes)),0);
      if(minimum>firstWeekRecentMinutes+1e-7) throw Error(
        `S1 : les créneaux demandés totalisent au moins ${Math.floor(minimum*10)/10} min pour ${Number(firstWeekRecentMinutes.toFixed(1))} min hebdomadaires récemment réalisées. Revoir le calendrier ou le volume récent avec le coach.`);
    }
    const next=study.weeks.find(w=>w.week===week.week+1);
    const nextDomains=week.weekType==='load'&&next?.weekType==='recovery'?weekDomains(next).domains:null;
    const floor=Math.max(nextDomains&&nextDomains.every(rows=>rows.every(s=>s.components.every(c=>c.durationMinutes!==null)))?
      minimumDistinctExerciseMinutes(nextDomains)/0.7:0,
      // A 10% construction tolerance accommodates discrete source recipes. It
      // is not a physiological load rule or a claim of athlete assimilation.
      road&&week.weekType==='load'&&priorLoad!==null?priorLoad*.9:0,
      road&&week.weekType==='taper'?peakKnownMinutes*.4:0);
    const requiresQuality=week.weekType==='load'&&config.ambition!=='finisher'&&!slots.some(s=>s.slot.role==='race');
    const requiresSpecific=!!road?.raceDomain&&road.ambition!=='finisher'&&(
      week.weekType==='load'&&['build','peak'].includes(week.phase??'')||['taper','race'].includes(week.weekType));
    const specificLoadWeeks=study.weeks.filter(w=>w.weekType==='load'&&['build','peak'].includes(w.phase??''));
    // Progressive SEARCH preference within the existing structured-intensity
    // budget. Source bounds, primary dose, recovery and actual feasibility win.
    // This is a plan trajectory, never an estimate of load assimilation.
    const specificProgress=(specificLoadWeeks.findIndex(w=>w.week===week.week)+1)/Math.max(1,specificLoadWeeks.length);
    const primaryWorkReserve=road&&road.keySessions>=3?(primaryKey==='vo2max'||primaryKey==='vma_velocity'?8:20):0;
    const specificTarget=week.weekType==='load'?Math.max(previousSpecificMinutes,Math.max(0,ceiling*.25-primaryWorkReserve)*specificProgress):0;
    const specificMinutes=(s:ProposedV3Session)=>road?.raceDomain?s.components.reduce((n,c)=>n+(c.sport==='run'?domainMinutes(c.blocks,road.raceDomain!):0),0):0;
    // A source-phase transition may change a discrete recipe (e.g. 95 → 92
    // min). Keep the same 10% construction tolerance as volume continuity;
    // never demand an unavailable source merely to preserve exact equality.
    const sourcePhaseChanged=previousSpecificPhase!==null&&previousSpecificPhase!==week.phase;
    const specificFloor=week.weekType==='load'?Math.max(Number.EPSILON,previousSpecificMinutes*(sourcePhaseChanged?.9:1)):Number.EPSILON;
    const demandingTarget=road&&requiresQuality?Math.max(1,road.keySessions-1):road&&['taper','race'].includes(week.weekType)&&requiresSpecific?1:null;
    const trajectory=ratioObjective&&minuteLedgerKnown&&week.weekType==='load'?planTriathlonRatioTrajectory(ratioObjective,
      domains.flatMap((domain,index)=>slots[index].slot.sport==='strength'||slots[index].slot.role==='race'?[]:[{id:String(index),choices:domain.map(exerciseMinutes)}]),minuteLedger,ceiling):null;
    const distance=(session:ProposedV3Session,index:number)=>trajectory?triathlonCandidateDoseDistance(exerciseMinutes(session),trajectory.preferredBySlot[String(index)]):0;
    // Visit the required quality domain first. Remaining domains favor a
    // limiter focus, source rotation and shorter bounded doses. Polarization is
    // enforced by the solver, not by maximizing long easy sessions up front.
    const order=domains.map((domain,index)=>({domain,index})).sort((a,b)=>
      Number(slots[a.index].slot.sport==='strength')-Number(slots[b.index].slot.sport==='strength')||Number(slots[b.index].slot.role==='key'&&b.domain.some(quality))-Number(slots[a.index].slot.role==='key'&&a.domain.some(quality))||(trail?Number(slots[b.index].slot.role==='long')-Number(slots[a.index].slot.role==='long'):0)||a.domain.length-b.domain.length||a.index-b.index);
    const programmeCardioSlots=slots.filter(s=>!['strength'].includes(s.slot.sport)&&s.slot.role!=='race').length;
    const programmeStrengthMinimum=domains.reduce((n,rows,index)=>n+(slots[index].slot.sport==='strength'?Math.min(...rows.map(r=>r.knownMinutes)):0),0);
    const programmeTarget=(config.planningGoalContext||road||trail)&&programmeCardioSlots?Math.max(0,(ceiling-programmeStrengthMinimum)/programmeCardioSlots):null;
    const longWeight=road?.goal==='marathon'?3:2;
    const runWeights=slots.filter(s=>s.slot.sport==='run'&&s.slot.role!=='race').reduce((n,s)=>n+(s.slot.role==='long'?longWeight:1),0);
    const programmeDistance=(s:ProposedV3Session)=>{
      if(programmeTarget===null||s.sport==='strength'||s.durationMinutes===null)return 0;
      const desired=(road||trail)&&s.sport==='run'&&runWeights?(ceiling-programmeStrengthMinimum)/runWeights*(s.role==='long'?longWeight:1):programmeTarget;
      return Math.abs(s.durationMinutes-desired);
    };
    const margin=(session:ProposedV3Session)=>session.components.filter(c=>c.sport!=='strength')
      .reduce((n,c)=>n+(c.zoneMinutes?c.zoneMinutes.low-3*(c.zoneMinutes.mid+c.zoneMinutes.high+c.zoneMinutes.unknown):0),0);
    for(const [index,item] of order.entries())item.domain.sort((a,b)=>
      (road&&requiresSpecific&&index===0?Number(specificMinutes(b)>0)-Number(specificMinutes(a)>0):0)||
      (road&&requiresSpecific&&index===0&&specificMinutes(a)>0&&specificMinutes(b)>0?Math.abs(specificMinutes(a)-specificTarget)-Math.abs(specificMinutes(b)-specificTarget):0)||
      ((road||trail)&&requiresQuality&&!requiresSpecific&&index===0?Number(matchesPrimary(b))-Number(matchesPrimary(a)):0)||
      (requiresQuality&&index===0?Number(quality(b))-Number(quality(a))||
        (trajectory?Number(b.components.some(c=>c.limiterMatches.includes(week.limiterFocus.focus??study.limiterOrder[0])))-Number(a.components.some(c=>c.limiterMatches.includes(week.limiterFocus.focus??study.limiterOrder[0])))||distance(a,item.index)-distance(b,item.index):0):
        distance(a,item.index)-distance(b,item.index)||programmeDistance(a)-programmeDistance(b)||
        Number(b.components.some(c=>c.limiterMatches.includes(week.limiterFocus.focus??study.limiterOrder[0])))-Number(a.components.some(c=>c.limiterMatches.includes(week.limiterFocus.focus??study.limiterOrder[0])))||
        a.components.reduce((n,c)=>n+(usage.get(c.sourceId)??0),0)-b.components.reduce((n,c)=>n+(usage.get(c.sourceId)??0),0)||a.knownMinutes-b.knownMinutes));
    const selected:ProposedV3Session[]=[];
    const weekSources=new Set<string>();
    const suffix=Array(order.length+1).fill(0) as number[];
    const maximumSuffix=Array(order.length+1).fill(0) as number[];
    const specificSuffix=Array(order.length+1).fill(0) as number[];
    const qualitySuffix=Array(order.length+1).fill(false) as boolean[];
    const primarySuffix=Array(order.length+1).fill(false) as boolean[];
    const primaryNonLowSuffix=Array(order.length+1).fill(Infinity) as number[];
    const thresholdNonLowSuffix=Array(order.length+1).fill(Infinity) as number[];
    const demandingSuffix=Array(order.length+1).fill(0) as number[];
    const nonLow=(s:ProposedV3Session)=>s.components.filter(c=>c.sport!=='strength').reduce((n,c)=>n+(c.zoneMinutes?c.zoneMinutes.mid+c.zoneMinutes.high+c.zoneMinutes.unknown:0),0);
    for(let i=order.length-1;i>=0;i--){suffix[i]=suffix[i+1]+Math.min(...order[i].domain.map(c=>c.knownMinutes));maximumSuffix[i]=maximumSuffix[i+1]+Math.max(...order[i].domain.map(c=>c.knownMinutes));specificSuffix[i]=specificSuffix[i+1]+Math.max(...order[i].domain.map(specificMinutes));qualitySuffix[i]=qualitySuffix[i+1]||order[i].domain.some(quality);}
    for(let i=order.length-1;i>=0;i--){primarySuffix[i]=primarySuffix[i+1]||order[i].domain.some(matchesPrimary);primaryNonLowSuffix[i]=Math.min(primaryNonLowSuffix[i+1],...order[i].domain.filter(matchesPrimary).map(nonLow));}
    for(let i=order.length-1;i>=0;i--){thresholdNonLowSuffix[i]=Math.min(thresholdNonLowSuffix[i+1],...order[i].domain.filter(thresholdQuality).map(nonLow));demandingSuffix[i]=demandingSuffix[i+1]+Number(order[i].domain.some(demandingRun));}
    const ratioSuffix=order.map(item=>item.domain.map(s=>s.sport==='strength'?{swim:0,bike:0,run:0,transition:0}:exerciseMinutes(s)));
    const ratioBounds=ratioObjective&&minuteLedgerKnown&&week.week===finalLoad&&ratioSuffix.every(d=>d.every(Boolean))?ratioSuffix.map(domain=>Object.fromEntries((['swim','bike','run'] as const).map(sport=>[sport,{min:Math.min(...domain.map(c=>c![sport])),max:Math.max(...domain.map(c=>c![sport]))}])) as Record<'swim'|'bike'|'run',{min:number;max:number}>):null;
    const zoneKnown=order.every(item=>item.domain.every(session=>session.role!=='race'&&session.components.filter(c=>c.sport!=='strength').every(c=>c.zoneMinutes!==null)));
    const marginSuffix=Array(order.length+1).fill(0) as number[];
    for(let i=order.length-1;i>=0;i--)marginSuffix[i]=marginSuffix[i+1]+Math.max(...order[i].domain.map(margin));
    let nodes=0;
    if(requiresQuality&&!qualitySuffix[0])throw Object.assign(Error(`S${week.week} : aucune séance de qualité V3 compatible avec le niveau, les restrictions et la phase de ce profil. L’ambition demandée ne peut pas être satisfaite avec les sources disponibles ; aucun niveau ni limiteur n’est modifié.`),{code:'v3_quality_source_unavailable',week:week.week,noCompletePlanReturned:true});
    function solve(index:number,total:number):boolean {
      if(++nodes>50000||total+suffix[index]>ceiling+1e-7)return false;
      if(total+maximumSuffix[index]<floor-1e-7)return false;
      if(requiresSpecific&&selected.reduce((n,s)=>n+specificMinutes(s),0)+specificSuffix[index]<specificFloor)return false;
      if(requiresQuality&&!selected.some(quality)&&!qualitySuffix[index])return false;
      if((road||trail)&&requiresQuality&&!selected.some(matchesPrimary)&&!primarySuffix[index])return false;
      if(road&&requiresQuality&&zoneKnown){
        const primaryReserve=selected.some(matchesPrimary)?0:primaryNonLowSuffix[index];
        const thresholdReserve=road.keySessions>=3&&!selected.some(thresholdQuality)?thresholdNonLowSuffix[index]:0;
        if(selected.reduce((n,s)=>n+nonLow(s),0)+Math.max(primaryReserve,thresholdReserve)>(ceiling-programmeStrengthMinimum)*.25+1e-7)return false;
      }
      if(demandingTarget!==null&&selected.filter(demandingRun).length+demandingSuffix[index]<demandingTarget)return false;
      if(road&&zoneKnown&&week.weekType==='load'){
        const chosenDays=selected.flatMap((s,i)=>demandingRun(s)?[7*(week.week-1)+slots[order[i].index].dayIndex]:[]);
        const hardFull=demandingTarget!==null&&chosenDays.length>=demandingTarget;
        let upperMargin=selected.reduce((n,s)=>n+margin(s),0),upperMinutes=total;
        // Necessary forward bounds after the actual chosen source IDs and hard
        // days. Unavailable repeats or extra hard work cannot inflate the easy
        // minutes that supposedly make a large specific block feasible.
        for(const item of order.slice(index)){
          const day=7*(week.week-1)+slots[item.index].dayIndex;
          const remaining=item.domain.filter(s=>!s.components.some(c=>weekSources.has(c.sourceId))&&(!demandingRun(s)||!hardFull&&demandingRunDaysCompatible([...demandingDays,...chosenDays,day])));
          if(!remaining.length)return false;
          upperMargin+=Math.max(...remaining.map(margin));upperMinutes+=Math.max(...remaining.map(s=>s.knownMinutes));
        }
        if(upperMargin<-1e-7||upperMinutes<floor-1e-7)return false;
      }
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
        const zones=polarization(selected);
        const parts=selected.filter(s=>s.sport!=='strength').map(exerciseMinutes);
        if(ratioObjective&&minuteLedgerKnown&&week.week===finalLoad&&parts.every(p=>p!==null)&&!hasExactStrictTriathlonRatio(ratioObjective,minuteLedger,parts))return false;
        return total+1e-7>=floor&&!(week.weekType==='recovery'&&priorLoad!==null&&total>priorLoad*0.7+1e-7)&&
          !(requiresSpecific&&selected.reduce((n,s)=>n+specificMinutes(s),0)<specificFloor)&&
          !(demandingTarget!==null&&selected.filter(demandingRun).length<demandingTarget)&&
          !(road&&requiresQuality&&road.keySessions>=3&&!selected.some(thresholdQuality))&&
          !((road||trail)&&requiresQuality&&!selected.some(matchesPrimary))&&
          !(requiresQuality&&!selected.some(quality))&&!(week.weekType==='load'&&zones&&!zones.admissible);
      }
      for(const choice of order[index].domain){
        const ids=choice.components.map(c=>c.sourceId);
        if(ids.some(id=>weekSources.has(id)))continue;
        // Reject only proved same-day overlaps. Unknown clocks/durations stay pending.
        const position=slots[order[index].index];
        if((road||trail)&&demandingRun(choice)){
          const absoluteDay=7*(week.week-1)+position.dayIndex;
          const current=selected.flatMap((s,i)=>demandingRun(s)?[7*(week.week-1)+slots[order[i].index].dayIndex]:[]);
          if(!demandingRunDaysCompatible([...demandingDays,...current,absoluteDay])||demandingTarget!==null&&current.length>=demandingTarget)continue;
        }
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
    if(!solve(0,0))throw Object.assign(Error(`S${week.week} : aucune combinaison V3 trouvée dans le budget, les décharges, les intensités et les proportions vérifiables. Aucun dépassement n’est masqué.`),{code:'v3_proposal_search_refused',week:week.week,searchNodes:nodes,priorSportMinutes:{...minuteLedger},priorExerciseMinutes:priorLoad,ceilingMinutes:ceiling,minimumMinutes:floor,previousSpecificMinutes,domains:domains.map(d=>({count:d.length,max:Math.max(...d.map(s=>s.knownMinutes)),specific:Math.max(...d.map(specificMinutes))})),noCompletePlanReturned:true});
    // Rotate whole source prescriptions AFTER solving the weekly dose ledger.
    // A feasible ratio target must not repeatedly select the same recipe just
    // because its duration wins by a fraction. Alternatives must retain the
    // exact sport/domain/minutes/zone dose and every limiter match; their own
    // recovery and missing anchors are checked. This preserves future budgets.
    // On a triathlon key/long slot, choose between equivalently dosed
    // recipes using the existing sport-specific evidence before rotating IDs.
    const comparePrimary=(a:ProposedV3Workout,b:ProposedV3Workout)=>
      Number(triDoseMatch(b))-Number(triDoseMatch(a));
    const trackPrimary=(session:ProposedV3Session)=>triDoseApplicable&&week.weekType==='load'&&
      (session.role==='key'||session.role==='long');
    const occupied=new Set(selected.flatMap(s=>s.components.map(c=>c.sourceId)));
    for(const [selectionIndex,session] of selected.entries()){
      if((trail&&(session.role==='key'||session.role==='long'))||session.role==='race'||session.components.length!==1||session.durationMinutes===null)continue;
      const original=session.components[0];
      const alternatives=eligible.filter(s=>s.sport===original.sport&&s.primaryDomain===original.sourceDomain&&
        (session.role==='key'||s.sport==='strength'||easy(s))).flatMap(s=>choices(s,original.durationMinutes)).filter(c=>
        (!occupied.has(c.sourceId)||c.sourceId===original.sourceId)&&c.durationMinutes!==null&&Math.abs(c.durationMinutes-original.durationMinutes!)<1e-7&&
        c.targets.missing.every(key=>original.targets.missing.includes(key))&&original.limiterMatches.every(key=>c.limiterMatches.includes(key))&&
        c.zoneMinutes?.low===original.zoneMinutes?.low&&c.zoneMinutes?.mid===original.zoneMinutes?.mid&&c.zoneMinutes?.high===original.zoneMinutes?.high&&c.zoneMinutes?.unknown===original.zoneMinutes?.unknown&&
        proposedRecoveryStatus({...session,components:[c]},
          {week:week.week,dayIndex:slots[order[selectionIndex].index].dayIndex,sport:session.sport},allSlots,start)!=='blocked')
        .filter(c=>!trackPrimary(session)||!triDoseMatch(original)||triDoseMatch(c))
        .sort((a,b)=>(trackPrimary(session)?comparePrimary(a,b):0)||(usage.get(a.sourceId)??0)-(usage.get(b.sourceId)??0)||a.sourceId.localeCompare(b.sourceId));
      const replacement=alternatives[0];
      if(replacement){occupied.delete(original.sourceId);occupied.add(replacement.sourceId);session.components=[replacement];}
    }
    // Preserve the native horizon's budgets and progression. Imported recipes
    // compete as exact-dose alternatives after assembly: same sport, primary
    // domain, duration, zone ledger and limiter matches, explicit recovery
    // checks and no new missing anchors. A broader pool must not shorten
    // an early week and make a later deload/long slot impossible.
    const importOccupied=new Set(selected.flatMap(s=>s.components.map(c=>c.sourceId)));
    for(const [selectionIndex,session] of selected.entries()){
      if((trail&&(session.role==='key'||session.role==='long'))||session.role==='race'||session.components.length!==1||session.durationMinutes===null)continue;
      const original=session.components[0];
      const alternatives=librarySources.filter(s=>s.sport===original.sport&&s.primaryDomain===original.sourceDomain&&
        v3SourceContextProblems(s,config,week.weekType).length===0&&
        (!week.phase||s.phase.includes(week.phase))&&
        (week.weekType!=='recovery'||easy(s))).flatMap(s=>choices(s,null)).filter(c=>
        !importOccupied.has(c.sourceId)&&c.durationMinutes!==null&&Math.abs(c.durationMinutes-original.durationMinutes!)<1e-7&&
        c.targets.missing.every(key=>original.targets.missing.includes(key))&&
        original.limiterMatches.every(key=>c.limiterMatches.includes(key))&&
        JSON.stringify(c.zoneMinutes)===JSON.stringify(original.zoneMinutes)&&
        proposedRecoveryStatus({...session,components:[c]},
          {week:week.week,dayIndex:slots[order[selectionIndex].index].dayIndex,sport:session.sport},allSlots,start)!=='blocked')
        .filter(c=>!trackPrimary(session)||!triDoseMatch(original)||triDoseMatch(c))
        .sort((a,b)=>(trackPrimary(session)?comparePrimary(a,b):0)||(usage.get(a.sourceId)??0)-(usage.get(b.sourceId)??0)||a.sourceId.localeCompare(b.sourceId));
      const replacement=alternatives[0];
      if(replacement){importOccupied.delete(original.sourceId);importOccupied.add(replacement.sourceId);session.components=[replacement];}
    }
    // Restore the exact original calendar positions.
    const calendarSelected=selected.map((session,index)=>({session,index:order[index].index})).sort((a,b)=>a.index-b.index).map(row=>row.session);
    const knownMinutes=selected.reduce((n,s)=>n+s.knownMinutes,0);
    const durationMinutes=selected.every(s=>s.durationMinutes!==null)?knownMinutes:null;
    const days=week.days.map((day,index)=>({day:day.day,rest:!day.slots.length,sessions:calendarSelected.filter((_,i)=>slots[i].dayIndex===index)}));
    for(const session of selected)for(const component of session.components)usage.set(component.sourceId,(usage.get(component.sourceId)??0)+1);
    result.weeks.push({week:week.week,phase:week.phase,weekType:week.weekType,focus:week.limiterFocus.focus,days,knownMinutes,durationMinutes});
    result.checks.push({code:'weekly_minutes',week:week.week,status:durationMinutes===null?'pending':'passed',message:durationMinutes===null?'Durée totale inconnue : allures, durée de force ou transition manquantes ; plafond non certifié.':'Somme des doses calculées dans le plafond horaire.'});
    if(firstWeekRecentMinutes!==undefined)result.checks.push({code:'initial_recent_volume',week:1,
      status:durationMinutes===null?'pending':'passed',
      message:`Volume initial : ${Math.round(knownMinutes)} min de blocs chronométrés pour ${Math.round(firstWeekRecentMinutes)} min hebdomadaires récemment déclarées.`+
        (durationMinutes===null?' Durée complète en attente, notamment pour les transitions ou la compétition.':'')});
    if(trail&&week.weekType==='load'){
      const matching=calendarSelected.filter(s=>(s.role==='long'||s.role==='key')&&matchesPrimary(s));
      result.checks.push({code:'trail_primary_dose',week:week.week,status:matching.length?'passed':requiresQuality?'blocked':'pending',
        message:`S${week.week} · ${priorities[0].raw} : ${matching.map(s=>s.components.map(c=>c.sourceId).join('+')).join(', ')||'dose spécifique à revoir'}.`});
    }
    if(triObjective&&week.weekType==='load'){
      const keySlots=calendarSelected.filter(s=>s.role==='key'||s.role==='long');
      const matches=keySlots.flatMap(s=>s.components.filter(triDoseMatch));
      const detail=matches.map(c=>c.sport+' '+c.sourceId).join(', ');
      result.checks.push({code:'tri_primary_component_dose',week:week.week,status:matches.length?'passed':'pending',
        message:matches.length
          ?`${priorities[0].raw} · composantes vélo/course dont les blocs satisfont le critère de séance : ${detail}. La couverture de la préparation complète reste à évaluer.`
          :`${priorities[0].raw} · S${week.week} : aucune dose vélo/course démontrée sur les séances clés ou longues par les critères applicables. Couverture du limiteur à revoir.`});
    }
    if(week.weekType==='load'){
      const zones=polarization(selected);
      result.checks.push({code:'structured_polarization',week:week.week,status:zones?.complete?'passed':'pending',message:zones?.complete?`Blocs configurés : ${zones.lowPct?.toFixed(1)} % de temps facile, ${zones.unknownPct?.toFixed(1)} % non classé. Cibles de construction respectées, sans attestation sportive.`:'Répartition totale des intensités non vérifiable : durée cardio ou transition inconnue. Les composantes connues ne peuvent pas contourner les cibles existantes.'});
      if(requiresQuality)result.checks.push({code:'source_quality',week:week.week,status:'passed',message:'Une dose positive de seuil, VO₂max ou allure spécifique à l’objectif est présente dans les blocs configurés ; ce contrôle ne vaut pas preuve de couverture du limiteur.'});
      if(road&&requiresQuality)result.checks.push({code:'primary_prescription',week:week.week,status:'passed',message:`${priorities[0].raw} : présence d’une prescription correspondant aux critères de dose du moteur, calculée depuis les blocs. Aucune amélioration physiologique ni approbation individuelle déduite.`});
    }
    if(week.limiterFocus.focus&&!selected.some(s=>s.components.some(c=>c.limiterMatches.includes(week.limiterFocus.focus!))))result.checks.push({code:'weekly_focus_unmatched',week:week.week,status:'pending',message:`Focus ${week.limiterFocus.focus} : aucune correspondance source retenue cette semaine ; ne vaut pas couverture physiologique.`});
    // Unknown transitions keep the TOTAL pending. They must not disable
    // exercise-volume progression and deloads for the known component doses.
    if(week.weekType==='load')priorLoad=selected.every(s=>s.role!=='race'&&s.components.every(c=>c.durationMinutes!==null))?knownMinutes:null;
    if(road||trail){
      for(const [index,s] of calendarSelected.entries())if(demandingRun(s))demandingDays.push(7*(week.week-1)+slots[index].dayIndex);
      if(week.weekType==='load'){peakKnownMinutes=Math.max(peakKnownMinutes,knownMinutes);if(requiresSpecific){previousSpecificMinutes=selected.reduce((n,s)=>n+specificMinutes(s),0);previousSpecificPhase=week.phase;}priorLongRunMinutes=selected.find(s=>s.sport==='run'&&s.role==='long')?.durationMinutes??priorLongRunMinutes;}
    }
    if(week.weekType==='load'&&!selected.some(s=>s.role==='race')){
      const contributions=selected.filter(s=>s.sport!=='strength').map(exerciseMinutes);
      if(contributions.some(c=>c===null))minuteLedgerKnown=false;
      else for(const contribution of contributions)for(const sport of ['swim','bike','run'] as const)minuteLedger[sport]+=contribution![sport];
    }
  }
  const selected=result.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions.flatMap(s=>s.components)));
  if(trail)result.checks.push({code:'trail_route_review',status:'pending',message:'Projet trail à relire sur les parcours de cet athlète : D+/D− réellement tolérés, descentes, durée de la sortie longue et effort en montée. Les dénivelés de course ne renseignent pas la tolérance individuelle. Les cibles terrain et le guidage restent à préciser.'});
  const missingTargets=[...new Set(selected.flatMap(s=>s.targets.missing))];
  if(options.includeLibrary920){
    const imported=selected.filter(s=>library920SourceMetadata(s.sourceId));
    const eligible=library920CandidatesForProposal().length;
    result.checks.push({code:'library920_engineering_registration',status:'passed',message:`${library920Manifest.total} fiches enregistrées : ${library920Manifest.ordinary} ordinaires (${eligible} passent les contrôles des sources, ${library920Manifest.ordinary-eligible} en réserve), ${library920Manifest.special} fiches à routage spécifique ; ${new Set(imported.map(s=>s.sourceId)).size} nouvelles sources retenues après filtres techniques, objectif, niveau, phase et calendrier. Ce contrôle ne vaut pas validation scientifique ou individuelle.`});
    result.checks.push({code:'athlete_current_context',status:'pending',message:`Contexte actuel : fatigue ${FATIGUE_LABELS[options.currentFatigue??'unknown']}, charge qualitative ${RECENT_LOAD_LABELS[options.recentLoad??'unknown']}. Prérequis, contre-indications et tolérance de la dose à revoir pour cet athlète ; aucun accord déduit d’une donnée absente.`});
  }
  if(missingTargets.length)result.checks.push({code:'individual_targets',status:'pending',message:'Repères encore nécessaires : '+missingTargets.join(', ')});
  for(const priority of priorities)if(!selected.some(s=>s.limiterMatches.includes(priority.raw)))result.checks.push({code:'limiter_without_source_match',status:'pending',message:`${priority.raw} : aucune source correspondante retenue ; sa couverture n’est pas validée.`});
  result.checks.push({code:'sporting_review',status:'pending',message:'Revue des doses, proportions, progression, récupération, disponibilité et situation actuelle de l’athlète nécessaire avant utilisation. Aucune approbation créée.'});
  result.checks.push(...auditV3ProposalRecovery(result,config.planStartDate!,options.clock),...auditV3ProposalSportMinutes(result,config.constraints),...auditV3ProposalDoseIntegrity(result),...auditV3SportingPrescription(result,config));
  if(options.invalidClockSports?.length)result.checks.push({code:'invalid_entered_clock',status:'blocked',message:'Horaires invalides à corriger : '+options.invalidClockSports.join(', ')});
  return result;
}
