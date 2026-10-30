import {scanQuantities} from './v18-compiler.mjs';
import {distanceFacts} from './v19-modal.mjs';

/** Safe grammar overlay: explicit external r=15s becomes a rest node; occurrence remains unknown. */
export function explicitRestNodesV27(nodes:any[]):any[]{return nodes.map(n=>{
 const copy=structuredClone(n);if(copy.children)copy.children=explicitRestNodesV27(copy.children);
 if(copy.kind==='unknown'&&/^\s*r\s*[:=]\s*\d+\s*(?:s|sec|["”])\s*$/i.test(copy.text)){
  const q=scanQuantities(copy.text,copy.partIndex,copy.sourceSpans[0].start)[0];
  if(q?.unit==='second'){copy.kind='time';copy.role='rest';copy.quantity=q;copy.grammar='v27_literal_external_rest_quantity_only';delete copy.reason;}
 }
 return copy;
});}

/** Complete elapsed time is computed only from explicit per-leaf declared paces and explicit transition/rest policies. */
export function swimExecutionV27(record:any,params:any={}){
 const nodes=explicitRestNodesV27(record.sourceV18Recipe.nodes),unknowns:string[]=[],events:any[]=[],hypotheses:any[]=[];
 const facts=distanceFacts(nodes),hasUnknown=(ns:any[]):boolean=>ns.some(n=>n.kind==='unknown'||hasUnknown(n.children??[]));
 const totalMeters=!hasUnknown(nodes)&&facts.every((f:any)=>f.derivedDeclaredDistance)?facts.reduce((n:number,f:any)=>n+f.derivedDeclaredDistance.min,0):null;
 const transition=(label:string)=>{if(!Number.isFinite(params.transitionSeconds)||params.transitionSeconds<0){unknowns.push('transition_time_not_declared:'+label);return;}events.push({kind:'transition',seconds:params.transitionSeconds,origin:'new_synthetic_declared_parameter',label});};
 function walk(n:any,path:string){
  if(n.kind==='distance'){
   const pace=params.secondsPer100ByLiteral?.[n.text];
   if(!(Number.isFinite(pace)&&pace>0)){unknowns.push('stroke_or_drill_time_missing:'+n.text);return;}
   if(n.quantity.min!==n.quantity.max){unknowns.push('distance_choice_unresolved:'+path);return;}
   events.push({kind:'distance',sourceText:n.text,meters:n.quantity.min,seconds:n.quantity.min/100*pace,secondsPer100:pace,origin:'new_synthetic_declared_parameter_not_CSS_transfer',sourceSpans:n.sourceSpans});return;
  }
  if(n.kind==='time'){if(n.quantity.min!==n.quantity.max){unknowns.push('time_range_unresolved:'+path);return;}events.push({kind:n.role==='rest'?'rest':'time',sourceText:n.text,seconds:n.quantity.min,origin:'literal_source_quantity',sourceSpans:n.sourceSpans});return;}
  if(n.kind==='sequence'){n.children.forEach((c:any,i:number)=>{if(i)transition(path+':'+i);walk(c,path+'.'+i);});return;}
  if(n.kind==='repeat'){
   if(n.count.min!==n.count.max){unknowns.push('repeat_count_unresolved:'+path);return;}
   const count=n.count.min,children=n.children??[],hasRest=children.some((c:any)=>c.role==='rest');
   const policy=n.restPolicy==='unknown'?params.restPolicy:n.restPolicy;
   if(!['between_only','after_each','explicit_inside_repeat'].includes(policy)){unknowns.push('final_rest_occurrence_unresolved:'+path);return;}
   if(params.recoveryIncludesTransition!==true){unknowns.push('recovery_transition_scope_not_declared:'+path);return;}
   if(n.restPolicy==='unknown')hypotheses.push({path,restPolicy:policy,origin:'new_synthetic_editorial_choice_not_source_fact'});
   for(let i=0;i<count;i++){
    children.forEach((c:any)=>{if(c.role!=='rest'||policy!=='between_only'||i<count-1)walk(c,path+'.repeat'+i);});
    if(!hasRest&&(policy!=='between_only'||i<count-1)){
     if(!Number.isFinite(params.unstatedRestSeconds)||params.unstatedRestSeconds<0)unknowns.push('unstated_recovery_duration_not_supplied:'+path);
     else events.push({kind:'rest',seconds:params.unstatedRestSeconds,origin:'new_synthetic_editorial_recovery_not_source_fact'});
    }
   }return;
  }
  if(n.kind==='annotation')return;
  unknowns.push('unresolved_source_node:'+path+':'+(n.reason??n.kind));
 }
 nodes.forEach((n:any,i:number)=>{if(i)transition('parts:'+i);walk(n,'nodes.'+i);});
 const missing=[...new Set(unknowns)],seconds=missing.length?null:events.reduce((s,e)=>s+e.seconds,0);
 return{kind:'swim_execution_v27',nodes,sourceDistanceFacts:facts,totalWrittenMeters:totalMeters,events,unknowns:missing,hypotheses,structureInMetersKnown:totalMeters!==null,fullDurationSeconds:seconds,fullDurationVerified:seconds!==null,
  cssUsedForOtherStrokes:false,individualToleranceVerified:false,syntheticParametersAreNotAthleteBData:true,sourceOriginalUnchanged:true};
}

export function aeroExecutionV27(record:any,restPolicy:string|null=null){
 const text=record.originalCanonical.original.effective.structure.map((p:any)=>p.text).join(' '),m=text.match(/(\d+)\s*x\s*(\d+)'[^]*?r\s*=\s*(\d+)'/i);
 if(!m)return{kind:'aero_execution_v27',complete:false,reason:'literal_aero_pattern_not_supported',seconds:null};
 const repetitions=+m[1],secondsPerBout=+m[2]*60,restSeconds=+m[3]*60;
 const between=repetitions*secondsPerBout+(repetitions-1)*restSeconds,afterEach=repetitions*(secondsPerBout+restSeconds);
 const recognized=['between_only','after_each'].includes(restPolicy??'');
 return{kind:'aero_execution_v27',repetitions,secondsPerBout,totalAeroSeconds:repetitions*secondsPerBout,restSeconds,possibleElapsedSeconds:[between,afterEach],restPolicy,complete:recognized,seconds:restPolicy==='between_only'?between:restPolicy==='after_each'?afterEach:null,
  interpretationOrigin:recognized?'new_synthetic_editorial_choice_not_a_source_fact':'source_does_not_specify_final_occurrence',maxContinuousAeroSeconds:secondsPerBout,posturalToleranceVerified:false,equalsFourByFifteen:false,sourceUnchanged:true};
}

export function strengthExecutionV27(record:any,competence:boolean|null=null){
 const raw=record.originalCanonical.original.effective,main=raw.structure.find((p:any)=>/main/i.test(p.part))?.text??'';
 const rounds=main.match(/^(\d+) tours:\s*/i),pieces=rounds?main.slice(rounds[0].length).split(',').map((s:string)=>s.trim()):[];
 const exercises=pieces.map((text:string)=>{const m=text.match(/^(.*?)\s+(\d+)(s)?(\/côté)?$/);return{sourceText:text,name:m?.[1]??text,perRoundDose:m?+m[2]:null,unit:m?.[3]?'second':m?'repetition':null,perSide:!!m?.[4],sideCount:null,tempo:null,rest:null,transition:null,load:null};});
 const peripherals=raw.structure.filter((p:any)=>!/main/i.test(p.part)).flatMap((p:any)=>scanQuantities(p.text).filter((q:any)=>q.unit==='second').slice(0,1).map((q:any)=>({part:p.part,seconds:q.min})));
 return{kind:'strength_execution_v27',historicalModel:record.executionModels.strength,rounds:rounds?+rounds[1]:null,exercises,peripherals,knownPeripheralSeconds:peripherals.reduce((s:any,p:any)=>s+p.seconds,0),
  instructions:raw.structure,restrictions:raw.avoid,competenceDeclared:competence,technicalPrerequisitesSatisfied:competence===true,assimilationObserved:false,wholeWorkoutSeconds:null,cardiovascularZoneUsedAsMuscularDose:false,
  unknowns:['rep tempo/execution duration','rests between exercises/rounds','transitions','loading or bodyweight mode where not explicit','bilateral execution timing','movement competence and source-specific tolerance'],individualToleranceVerified:false};
}
