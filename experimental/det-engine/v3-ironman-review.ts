/** More conservative descriptive continuity: 'brick' alone proves no particular discipline. */
import type {ParsedPlan} from '@/lib/aiPlanParser';import {WorkoutLibrary} from '@/lib/workoutLibrary';
import {isRaceDaySession} from '../../supabase/functions/_shared/raceDayIdentity';
export function brickDisciplineEvidence(id:string){
 const card=WorkoutLibrary.find(w=>w.id===id);if(!card)return {swim:false,bike:false,run:false,source:'unknown_catalogue'};
 const text=card.structure.map(p=>`${p.part}: ${p.text}`).join(' ');
 return {swim:/\b(swim|natation|nage)\b/i.test(text),bike:/\b(bike|v[ée]lo|cycling)\b/i.test(text),
  run:/\b(run|running|CAP)\b|course\s*[:：]|course\s+[àa]\s+pied/i.test(text),source:'explicit_catalogue_structure_terms_not_dose_allocation'};
}
export function reviewIronmanContinuity(plan:ParsedPlan){
 const weeks=plan.weeks.map(w=>{
  const training=w.sessions.filter(s=>!s.isRest&&!isRaceDaySession(s));
  const bricks=training.filter(s=>s.sport==='brick').map(s=>({id:s.catalogId??null,duration:s.durationMin??null,evidence:s.catalogId?brickDisciplineEvidence(s.catalogId):null}));
  const presence=Object.fromEntries(['swim','bike','run'].map(sport=>{
   const standalone=training.some(s=>s.sport===sport&&(s.durationMin??0)>0);
   const known=bricks.some(b=>b.evidence?.[sport as 'swim'|'bike'|'run']);
   const unknown=bricks.some(b=>!b.evidence||[b.evidence.swim,b.evidence.bike,b.evidence.run].filter(Boolean).length<2);
   return [sport,standalone||known?'present':unknown?'unknown':'absent'];
  }));
  return {week:w.weekNumber,phase:w.phase,weekType:plan.weeklyQuotas?.[w.weekNumber]?.weekType??'unknown',race:w.sessions.some(isRaceDaySession),presence,bricks,
   standaloneMinutes:Object.fromEntries(['swim','bike','run'].map(sport=>[sport,training.filter(s=>s.sport===sport).reduce((n,s)=>n+(s.durationMin??0),0)]))};
 });
 return {version:'det-v3-physical-continuity-1',weeks,
  absent:weeks.flatMap(w=>Object.entries(w.presence).filter(([,v])=>v==='absent').map(([sport])=>({week:w.week,weekType:w.weekType,race:w.race,sport}))),
  unknown:weeks.flatMap(w=>Object.entries(w.presence).filter(([,v])=>v==='unknown').map(([sport])=>({week:w.week,weekType:w.weekType,race:w.race,sport}))),
  interpretation:'Descriptive presence only; neither quota acceptance nor adequate physiological progression. Race/recovery/taper retained, never silently excluded.',
  doseAllocation:'unknown_except_explicit_component_ranges'};
}
