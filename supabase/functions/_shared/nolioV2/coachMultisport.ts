/** Lossless normal-coach representation: two dated, ordered linked activities.
 * An unknown transition remains unknown; no invented elapsed gap or run time. */
import {canonicalJson,detWorkoutProblems,type PlanSessionInput} from './plannedMapper.ts';
export async function expandCoachBricks(sessions:PlanSessionInput[]):Promise<{sessions:PlanSessionInput[];problems:string[]}>{
 const out:PlanSessionInput[]=[],problems:string[]=[];
 for(const s of sessions){
  const c=s.detStructuredComponents;
  if(s.isRest||s.sport!=='brick'||s.detStructuredWorkout||!c){out.push(s);continue;}
  if(c.schema!=='det-brick-components-preview-v1'||c.bike?.sport!=='bike'||c.run?.sport!=='run'||c.bike.sourceId===c.run.sourceId||detWorkoutProblems(c.bike).length||detWorkoutProblems(c.run).length||'composition' in c.bike||'composition' in c.run){problems.push(`${s.sessionKey}:brick_component_structure_invalid`);continue;}
  // A clock on the parent names the bike start only. The run retains the
  // plan's declared date, without claiming a start derived from an unknown gap.
  if(s.coachStart&&c.bike.exactSeconds!==null&&s.coachStart.minuteOfDay+c.bike.exactSeconds/60>=1440){problems.push(`${s.sessionKey}:brick_run_date_requires_transition`);continue;}
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(canonicalJson(s)));
  const link=Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
  for(const [part,w] of [['bike',c.bike],['run',c.run]] as const){
   out.push({sessionKey:s.sessionKey+'~'+part,date:s.date,title:s.title+(part==='bike'?' — 1/2 Vélo':' — 2/2 Course'),sport:part,catalogId:w.sourceId,durationMin:w.chosenDurationMin,detStructuredWorkout:structuredClone(w),...(part==='bike'&&s.coachStart?{coachStart:structuredClone(s.coachStart)}:{}),details:`Enchaînement TFCLab ${s.sessionKey} (${link}). Vélo puis course ; transition non minutée, aucun horaire de course déduit.\n${s.details??''}`});
  }
 }
 if(new Set(out.map(s=>s.sessionKey)).size!==out.length)problems.push('split_session_key_collision');
 return {sessions:problems.length?[]:out,problems};
}
