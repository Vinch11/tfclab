import {clockFor} from '../../../experimental/det-engine/v401-coach-inputs-core';
import {renderV3Prescription} from './v3PrescriptionText';
import {appProfileDetStructure} from './appProfileDetStructure';
import type {ParsedPlan,ParsedSession} from '@/lib/aiPlanParser';
import type {FrozenAppPlanningInput} from './appPlanningInput';
import {generateAppPlanningV3Proposal,type V3ProposalOptions} from './appPlanningV3Proposal';
import {bindAppPlanMetadata} from '@/lib/plan/generatedPlanMetadata';
import {PLAN_PROVENANCE_SCHEMA} from '@/lib/plan/planProvenance';
import {PACE_TARGET_FORMAT} from '../../../supabase/functions/_shared/nolioV2/paceTarget';
import {planningInputFor} from './appPlanningInput';
import {prepareDetGeneration} from './trailPreparation';
/** Common plan representation, not a qualified-runner outcome or review.
 * Unknown durations remain absent; the complete source proposal is retained.
 */
export async function generateAppProfileDetPlan(app:FrozenAppPlanningInput,athleteId:string,options:V3ProposalOptions={},engineVersion:string){
 const proposal=await generateAppPlanningV3Proposal(app,athleteId,{includeLibrary920:true,...options,completeSessions:true});
 const {athlete,config}=planningInputFor(app,'det');
 const weeklyQuotas=structuredClone(prepareDetGeneration(athlete,config).weeklyQuotas);
 for(const week of proposal.weeks){
  const phase=week.phase;
  if(proposal.checks.some(c=>c.code==='revised_key_days'&&c.week===week.week)){
    const days=weeklyQuotas[week.week].layout.days;
    week.days.forEach((day,d)=>day.sessions.forEach((session,i)=>{
      const slot=days[d]?.slots[i];
      if(!slot||slot.sport!==session.sport)throw Error('Calendrier DET révisé incohérent.');
      if(session.role==='support'||session.role==='key')slot.isKeySession=session.role==='key';
    }));
  }
  if(weeklyQuotas[week.week]&&(phase==='base'||phase==='build'||phase==='peak'||phase==='taper'))weeklyQuotas[week.week].phase=phase;
 }
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
 const weekTheme=(w:typeof proposal.weeks[number])=>w.weekType==='recovery'?'Récupération et assimilation':w.weekType==='taper'?'Affûtage':w.weekType==='race'?'Compétition':w.focus??'Préparation';
 const trailReview = proposal.checks.some(c => c.code === 'trail_route_review');
 const trailWeekNotes = (week:typeof proposal.weeks[number]) => {
  const sessions = week.days.flatMap(day => day.sessions);
  const runs = sessions.filter(s => s.sport === 'run' && s.role !== 'race');
  const longRun = runs.find(s => s.role === 'long');
  const dose = proposal.checks.find(c => c.week === week.week && c.code === 'trail_primary_dose');
  return [Math.round(runs.reduce((n,s) => n + s.knownMinutes,0)) + ' min de course hors compétition.',
   longRun ? 'Sortie longue de ' + Math.round(longRun.knownMinutes) + ' min.' : '',
   dose?.message, 'Dénivelé et effort à confirmer sur les parcours de cet athlète.'].filter(Boolean).join(' ');
 };
 const weekNotes = (week:typeof proposal.weeks[number]) => {
  const ranked=proposal.checks.filter(c=>c.week===week.week&&['ranked_limiter_work','adaptive_search','time_trial_posture'].includes(c.code)).map(c=>c.message);
  if(trailReview)return [trailWeekNotes(week),...ranked].join('\n');
  const taper=proposal.checks.find(c=>c.week===week.week&&c.code==='tri_taper_exercise_minutes');
  const volume=week.durationMinutes===null?'Volume total non certifié : certaines durées restent à préciser.':'';
  const dose=proposal.checks.find(c=>c.week===week.week&&['primary_dose_coverage','tri_primary_component_dose'].includes(c.code));
  return [dose?.message,...ranked,taper?.message,volume].filter(Boolean).join('\n') || undefined;
 };
 const weeks=proposal.weeks.map(w=>({weekNumber:w.week,theme:weekTheme(w),phase:w.phase??'Préparation',coachNotes:weekNotes(w),sessions:w.days.flatMap((d,dayIndex):ParsedSession[]=>{
  const base={weekNumber:w.week,weekTheme:weekTheme(w),phase:w.phase??'Préparation',dayName:d.day,dayIndex};
  if(d.rest)return [{...base,sport:'Repos',title:'Repos prévu',details:'',isRest:true}];
  return d.sessions.map(s=>({...base,sport:s.sport,title:s.role==='race'?raceTitle(w.week,dayIndex):s.components.map(c=>c.title).join(' + '),details:s.role==='race'?(config.timeTrialContext?'Durée de course estimée par le coach.':'Épreuve du calendrier ; durée non inventée.'):renderV3Prescription(s.components,true)+(s.sport==='brick'?'\nTransition : durée à préciser.':''),isRest:false,isKeySession:s.role==='key',...(s.role==='race'&&config.timeTrialContext?{durationMin:config.timeTrialContext.raceDurationMinutes}:s.durationMinutes!==null?{durationMin:s.durationMinutes}:{}),...(s.components.length===1?{catalogId:s.components[0].sourceId}:{}),detSourceComponents:structuredClone(s.components),...appProfileDetStructure(s),...sessionClock(w.week,dayIndex,s.sport,s.role==='race')}));
 })}));
 const phases:ParsedPlan['phases']=[];
 for(const w of proposal.weeks){const name=w.phase??'Préparation',last=phases.at(-1);if(last?.name===name){const start=last.weeks.split('-')[0];last.weeks=start===String(w.week)?start:`${start}-${w.week}`;}else phases.push({name,weeks:String(w.week)});}
 const plan:ParsedPlan={title:`Plan TFCL™ — ${proposal.objective}`,diagnostic:trailReview ? `Projet trail à relire pour ${proposal.eventCalendar[0]?.distanceKm} km et ${proposal.eventCalendar[0]?.elevationGainM} m D+. Limiteurs : ${proposal.limiterOrder.join(' → ')}. La durée des séances est proposée. Comparer les sorties longues, le dénivelé cumulé et la tolérance aux descentes avec les parcours réellement pratiqués avant prescription.` : `Limiteurs : ${proposal.limiterOrder.join(' → ')}. Plan construit depuis le profil disponible. Intensités calculées depuis les repères disponibles, à confirmer ; elles ne prouvent pas une mesure individuelle de LT1/MLSS.`,totalWeeks:weeks.length,weeks,weeklyQuotas,finalValidationIssues:[...new Set(proposal.checks.filter(c=>c.status==='pending').map(c=>c.code))].map(code=>({rule:'det_'+code,severity:'warning' as const,message:proposal.checks.find(c=>c.code===code&&c.status==='pending')!.message})),phases};
 return bindAppPlanMetadata({...plan,_nolioV2TargetFormat:PACE_TARGET_FORMAT,_provenance:{schema:PLAN_PROVENANCE_SCHEMA,engine:'det',mode:'app-profile',engineVersion,releaseId:engineVersion,planningInput:{source:'app_planning_pipeline',fingerprint:app.fingerprint},prescriptionAllowed:false,sportingAttestation:false,syntheticFixture:false,generatedAt:new Date().toISOString()},_detSourceProposal:proposal} as ParsedPlan,app);
}
