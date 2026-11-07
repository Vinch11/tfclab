/** Normal coach export is a user action, not a source/scientific attestation.
 * The endpoint supplies this binding only after authentication and ownership.
 * Historical engine versions remain exportable from their intact saved native blocks. */
export function coachPlanProblems(value:unknown,athleteId:string,_currentEngineVersion?:string):string[]{
 const plan=value as Record<string,unknown>|null;
 const p=plan?._provenance as Record<string,unknown>|undefined;
 const source=plan?._detSourceProposal as Record<string,unknown>|undefined;
 const input=p?.planningInput as Record<string,unknown>|undefined;
 const problems:string[]=[];
 if(!p||p.schema!=='tfcl.plan-provenance.v1'||p.engine!=='det'||p.mode!=='app-profile'||p.syntheticFixture!==false||typeof p.engineVersion!=='string'||!p.engineVersion.trim())problems.push('coach_plan_provenance_invalid');
 if(!source||source.kind!=='v3_plan_proposal'||source.athleteId!==athleteId||typeof input?.fingerprint!=='string'||!input.fingerprint||input.fingerprint!==source.planningInputFingerprint)problems.push('coach_plan_profile_binding_invalid');
 const checks=source?.checks;
 if(!Array.isArray(checks)||checks.some(c=>(c as {status?:string})?.status==='blocked'))problems.push('coach_plan_sporting_violation');
 const issues=plan?.finalValidationIssues;
 if(Array.isArray(issues)&&issues.some(i=>['blocking','error','critical'].includes(String((i as {severity?:string})?.severity))))problems.push('coach_plan_blocking_issue');
 return problems;
}

type Obj=Record<string,unknown>;
const object=(v:unknown):Obj|null=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Obj:null;
const canonical=(v:unknown):string=>JSON.stringify(v,(_key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])):value);
function nodesFrom(component:Obj):unknown[]|null{
 const rawTargets=object(component.targets)?.targets;if(!Array.isArray(rawTargets)||!Array.isArray(component.blocks))return null;
 const targets:unknown[]=rawTargets;
 function walk(blocks:unknown[]):unknown[]{return blocks.map(raw=>{
  const b=object(raw);if(!b)throw Error('block');
  if(b.kind==='repeat'){
   if(!Array.isArray(b.steps))throw Error('steps');
   return {kind:'repeat',label:b.label,count:object(b.count)?.base,betweenSec:b.betweenSec,restAfterLast:false,steps:walk(b.steps)};
  }
  const axis=b.kind==='time'?'seconds':b.kind==='distance'?'meters':b.kind==='reps'?'reps':null;if(!axis)throw Error('axis');
  const matches=targets.filter(t=>object(t)?.domain===b.domain);
  let target:unknown=null;
  if(b.domain!==null){
   if(matches.length===1){const t=object(matches[0])!;target={metric:t.metric,min:t.min,max:t.max,source:t.source,confidence:t.confidence};}
   else if(matches.length!==0||!b.rpeRange)throw Error('target');
  }
  return {kind:'step',role:b.role,label:b.label,domain:b.domain,dose:{[axis]:object(b[axis])?.base},target,...(b.repsTarget?{repsTarget:object(b.repsTarget)?.base}:{}),...(typeof b.sides==='number'?{sides:b.sides}:{}),...(b.rpeRange?{rpe:b.rpeRange}:{})};
 });}
 try{return walk(component.blocks);}catch{return null;}
}
function componentMatches(component:unknown,workout:unknown){
 const c=object(component),w=object(workout);if(!c||!w)return false;
 const nodes=nodesFrom(c);
 return !!nodes&&w.schema==='det-structured-workout-v1'&&w.sourceId===c.sourceId&&w.sport===c.sport&&w.chosenDurationMin===c.durationMinutes&&canonical(w.nodes)===canonical(nodes);
}
/** Compare the exported cache to the original native components. Editing the
 * displayed plan must not silently export a different cached prescription. */
export function nativeCoachPlanProblems(value:unknown):string[]{
 const p=object(value),source=object(p?._detSourceProposal);if(!Array.isArray(p?.weeks)||!Array.isArray(source?.weeks))return ['coach_plan_native_sources_missing'];
 try{
  for(const rawWeek of p.weeks){
   const w=object(rawWeek)!;const original=source.weeks.map(object).find(x=>x?.week===w.weekNumber);
   if(!original||!Array.isArray(original.days)||!Array.isArray(w.sessions))throw Error('week');
   for(let day=0;day<7;day++){
    const expected=object(original.days[day])?.sessions;
    const actual=w.sessions.map(object).filter(s=>s?.dayIndex===day&&s.isRest!==true);
    if(!Array.isArray(expected)||actual.length!==expected.length)throw Error('slots');
    for(let i=0;i<actual.length;i++){
     const a=actual[i]!,e=object(expected[i])!;if(canonical(a.detSourceComponents)!==canonical(e.components))throw Error('components');
     const components=e.components as unknown[];
     if(e.role==='race')continue;
     if(a.title!==components.map(c=>object(c)?.title).join(' + '))throw Error('title');
     if(components.length===1&&a.detStructuredWorkout&&!componentMatches(components[0],a.detStructuredWorkout))throw Error('workout');
     const c=object(a.detStructuredComponents);
     if(components.length===2&&c&&(!componentMatches(components[0],c.bike)||!componentMatches(components[1],c.run)))throw Error('brick');
    }
   }
  }
  if(p.weeks.length!==source.weeks.length)throw Error('weeks');
  return [];
 }catch{return ['coach_plan_native_prescription_changed'];}
}
