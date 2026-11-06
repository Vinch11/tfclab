import {clockFor} from '../../../experimental/det-engine/v401-coach-inputs-core';
import {CHECKED_IN_PLAN_RELEASE_INFO} from '../../../supabase/functions/_shared/planReleaseManifest';
import {renderV3Prescription} from './v3PrescriptionText';
import {appProfileDetStructure} from './appProfileDetStructure';
import type {ParsedPlan,ParsedSession} from '@/lib/aiPlanParser';
import type {FrozenAppPlanningInput} from './appPlanningInput';
import {generateAppPlanningV3Proposal,type V3ProposalOptions} from './appPlanningV3Proposal';
import {bindAppPlanMetadata} from '@/lib/plan/generatedPlanMetadata';
import {PLAN_PROVENANCE_SCHEMA} from '@/lib/plan/planProvenance';
/** Common plan representation, not a qualified-runner outcome or review.
 * Unknown durations remain absent; the complete source proposal is retained.
 */
export async function generateAppProfileDetPlan(app:FrozenAppPlanningInput,athleteId:string,options:V3ProposalOptions={},engineVersion:string){
 const proposal=await generateAppPlanningV3Proposal(app,athleteId,{...options,completeSessions:true});
 const blocked=proposal.checks.filter(c=>c.status==='blocked');
 if(blocked.length)throw Error(blocked.map(c=>c.message).join('\n'));
 const enteredClock=options.clock?clockFor(options.clock,app.config.planStartDate!):null;
 const sessionClock=(week:number,dayIndex:number,sport:string,race:boolean)=>{
  if(race||!enteredClock||!options.clock)return {};
  const start=enteredClock({week,dayIndex,sport});if(!start)return {};
  const date=new Date(app.config.planStartDate!+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+(week-1)*7+dayIndex);
  return {coachStart:{provenance:'coach_confirmed' as const,localDate:date.toISOString().slice(0,10),timeZone:options.clock.timeZone,minuteOfDay:start.minuteOfDay,utcOffsetMinutes:start.utcOffsetMinutes}};
 };
 const raceTitle=(week:number,dayIndex:number)=>{const date=new Date(app.config.planStartDate!+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+(week-1)*7+dayIndex);const ymd=date.toISOString().slice(0,10);const event=proposal.eventCalendar.find(g=>g.raceDate===ymd);return 'COURSE : '+(event?.raceName||event?.objective||app.config.raceName||proposal.objective);};
 const weeks=proposal.weeks.map(w=>({weekNumber:w.week,theme:w.focus??'Maintien',phase:w.phase??'Préparation',coachNotes:w.durationMinutes===null?'Volume total non certifié : certaines durées restent à préciser.':undefined,sessions:w.days.flatMap((d,dayIndex):ParsedSession[]=>{
  const base={weekNumber:w.week,weekTheme:w.focus??'Maintien',phase:w.phase??'Préparation',dayName:d.day,dayIndex};
  if(d.rest)return [{...base,sport:'Repos',title:'Repos prévu',details:'',isRest:true}];
  return d.sessions.map(s=>({...base,sport:s.sport,title:s.role==='race'?raceTitle(w.week,dayIndex):s.components.map(c=>c.title).join(' + '),details:s.role==='race'?'Épreuve du calendrier ; durée non inventée.':renderV3Prescription(s.components,true)+(s.sport==='brick'?'\nTransition : durée à préciser.':''),isRest:false,isKeySession:s.role==='key',...(s.durationMinutes!==null?{durationMin:s.durationMinutes}:{}),...(s.components.length===1?{catalogId:s.components[0].sourceId}:{}),detSourceComponents:structuredClone(s.components),...appProfileDetStructure(s),...sessionClock(w.week,dayIndex,s.sport,s.role==='race')}));
 })}));
 const phases:ParsedPlan['phases']=[];
 for(const w of proposal.weeks){const name=w.phase??'Préparation',last=phases.at(-1);if(last?.name===name){const start=last.weeks.split('-')[0];last.weeks=start===String(w.week)?start:`${start}-${w.week}`;}else phases.push({name,weeks:String(w.week)});}
 const plan:ParsedPlan={title:`Plan TFCL™ — ${proposal.objective}`,diagnostic:`Limiteurs : ${proposal.limiterOrder.join(' → ')}. Plan construit depuis le profil disponible. Intensités calculées depuis les repères disponibles, à confirmer ; elles ne prouvent pas une mesure individuelle de LT1/MLSS.`,totalWeeks:weeks.length,weeks,finalValidationIssues:[...new Set(proposal.checks.filter(c=>c.status==='pending').map(c=>c.code))].map(code=>({rule:'det_'+code,severity:'warning' as const,message:proposal.checks.find(c=>c.code===code&&c.status==='pending')!.message})),phases};
 return bindAppPlanMetadata({...plan,_provenance:{schema:PLAN_PROVENANCE_SCHEMA,engine:'det',mode:'app-profile',engineVersion,releaseId:CHECKED_IN_PLAN_RELEASE_INFO.releaseId,planningInput:{source:'app_planning_pipeline',fingerprint:app.fingerprint},prescriptionAllowed:false,sportingAttestation:false,syntheticFixture:false,generatedAt:new Date().toISOString()},_detSourceProposal:proposal} as ParsedPlan,app);
}
