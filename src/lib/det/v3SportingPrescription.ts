/** Construction rules from the existing app inputs. No assimilation is inferred.
 * Source context is distinct from minimum admission level and catalogue affinity.
 */
import type {PlanConfig} from '@/hooks/useAITrainingPlan';
import type {V3Block,V3Workout} from '../../../scripts/library-v3/catalogueRuntime';
import {normalizeRepairGoal} from '../../../supabase/functions/_shared/repairSportingEquivalence';
import {normalizeSizingAmbition} from '@/engines/plan/sessionSizingMatrix';
import {AMBITIONS} from '@/lib/raceAnalysis';
import {getDoctrineDomain} from '@/lib/zones/tfclDoctrine';
import type {ProposedV3Session,ProposedV3Workout} from './appPlanningV3Proposal';
import type {DetLimiterKey} from '../../../experimental/det-engine/v403-limiter-semantics';
import {verifyPrimaryRunningSession} from '../../../experimental/det-engine/v408-primary-limiter-evidence';
import {structuredV3ZoneDose} from '../../../experimental/det-engine/v310-structured-zone-dose';

const normalized=(text:string)=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const levels=['untrained','light','trained','highly_trained'];
export function roadRunningPrescription(config:PlanConfig){
 const goal=normalizeRepairGoal(config.objective);
 if(!['marathon','semi','10k','5k'].includes(goal))return null;
 const ambition=normalizeSizingAmbition(config.ambitionMeta?.effective??config.ambition);
 const key=({finisher:'finish',age_group:'perf',competitor:'sub',elite:'elite',world_class:'world_class'} as const)[ambition];
 const signal=config.ambitionMeta;
 const level=signal&&['manual','auto-tss'].includes(signal.trainingLevelSource)?signal.trainingLevel:undefined;
 return {goal,level,ambition,keySessions:AMBITIONS.find(a=>a.key===key)!.qualitesParSemaine,
   raceDomain:goal==='marathon'?'marathon_pace' as const:goal==='semi'?'semi_pace' as const:null};
}
export function v3SourceContextProblems(source:V3Workout,config:PlanConfig,weekType?:string):string[]{
 const problems:string[]=[],signal=config.ambitionMeta;
 const level=signal&&['manual','auto-tss'].includes(signal.trainingLevelSource)?levels.indexOf(signal.trainingLevel):-1;
 if(level>=0&&levels.indexOf(source.minimumLevel)>level)problems.push('minimum_training_level');
 const road=roadRunningPrescription(config),title=normalized(source.title);
 if(!title.trim())problems.push('source_title_missing');
 if(/double journee|double seuil|special block.*matin/.test(title))problems.push('multi_session_method_requires_explicit_composition');
 if(source.sport==='run'&&road){
  if(level>=2&&/marche[\s/-]*course|marche\/course|premiere continuite|debutant|alternance.*marche|recuperation active par marche/.test(title))problems.push('initiation_recipe_for_trained_runner');
  const eventDomains=['im_pace','703_pace','marathon_pace','semi_pace'];
  if(eventDomains.includes(source.primaryDomain??'')&&source.primaryDomain!==road.raceDomain)problems.push('different_race_specificity');
  if(source.primaryIntent==='recovery'){
   const event=/10\s?k/.test(title)?'10k':/semi/.test(title)?'semi':/marathon/.test(title)?'marathon':null;
   if(event&&event!==road.goal)problems.push('recovery_recipe_for_different_event');
  }
 }
 // A post-event recovery protocol cannot become pre-race training because its
 // phase list happens to contain taper. Inspect the source's actual work cues.
 const context=normalized(source.title+' '+source.focus+' '+JSON.stringify(source.blocks));
 if(/post[ -]?(course|competition|marathon|semi)|apres (la |une |le )?(course|competition|marathon|semi)|lendemain (de |du |d.un )?(marathon|semi|competition)/.test(context))problems.push('post_race_recipe_requires_event_context');
 if(/conditions chaudes|adaptation sudation|pacing chaleur/.test(title)&&!/(chaleur|chaud|heat)/i.test(config.constraints??''))problems.push('heat_context_not_declared');
 if(weekType==='load'&&/taper|affutage|rappel allege/.test(title))problems.push('taper_recipe_in_development');
 return problems;
}
export function domainMinutes(blocks:readonly V3Block[],domain:string):number{
 return blocks.reduce((n,b)=>n+(b.kind==='repeat'?b.count.base*domainMinutes(b.steps,domain):b.kind==='time'&&b.domain===domain?b.seconds!.base/60:0),0);
}
export function demandingRun(session:ProposedV3Session):boolean{
 return session.components.some(c=>c.sport==='run'&&c.blocks.some(function demanding(b):boolean{
  return b.kind==='repeat'?b.steps.some(demanding):b.role==='main'&&b.domain!==null&&getDoctrineDomain(b.domain).metabolic!=='moderate';
 }));
}
/** Day order is the conservative calendar screen; exact rest hours retain their
 * existing independent clock check. This also covers the previous week. */
export function demandingRunDaysCompatible(days:readonly number[]):boolean{
 const ordered=[...days].sort((a,b)=>a-b);
 return ordered.every((day,index)=>index===0||day-ordered[index-1]>=2);
}
/** Reuse the engine's existing exact 20-min threshold / 8-min VO2 / 40-min
 * aerobic prescription tests. This does not admit a source or predict a gain. */
export function primaryPrescriptionMatch(component:ProposedV3Workout,source:V3Workout,key:DetLimiterKey):boolean{
 if(component.durationMinutes===null||component.sport!=='run')return false;
 const dose=structuredV3ZoneDose({id:component.sourceId,sport:source.sport,blocks:component.blocks},{});
 return verifyPrimaryRunningSession({weekNumber:1,weekTheme:'',phase:'',dayName:'',dayIndex:0,sport:'run',title:component.title,details:'',catalogId:component.sourceId,durationMin:component.durationMinutes,isKeySession:true,isRest:false},key,{
  dose:()=>dose,limiterKeys:()=>source.prescription.physiologicalIntent.limiterKeys,primaryDomain:()=>source.primaryDomain,
 }).verified;
}
