import {aeroExecutionV27,swimExecutionV27,strengthExecutionV27} from './v27-modal';
import type {parameterSetV28} from './v28-parameters';
type Set=ReturnType<typeof parameterSetV28>;
export interface TimelineV28 {model:any;events:any[];seconds:number|null;complete:boolean;intensityResolved:boolean;unknowns:string[];possibleSeconds?:number[];noFourByFifteenEquivalence?:boolean;cssTransferred?:boolean;neuromuscularLoadMode?:string|null;cardiovascularZoneUsed?:boolean;competenceDoesNotProveAssimilation?:boolean;}
const finite=(x:any)=>Number.isFinite(x)&&x>=0;
const positive=(x:any)=>Number.isFinite(x)&&x>0;
const policies=(x:any)=>['between_only','after_each'].includes(x);
const event=(kind:string,seconds:number,extra:any={})=>({kind,seconds,...extra});

/** Uses the literal V27 aero parser; only final recovery occurrence is parameterized. */
export function aeroTimelineV28(record:any,p:Set,targets:any[]):TimelineV28{
 const policy=p.get('aero.rest_policy','policy',policies),model=aeroExecutionV27(record,policy??null),events:any[]=[];
 if(model.complete)for(let i=0;i<model.repetitions!;i++){
  events.push(event('work',model.secondsPerBout!,{repetition:i+1,position:'aero',sourceZone:'Z2',intensity:targets.find(t=>t.zone==='Z2')??null,origin:'literal_source'}));
  if(i<model.repetitions!-1||policy==='after_each')events.push(event('rest',model.restSeconds!,{afterRepetition:i+1,position:'relaxed',sourceZone:'Z1',intensity:targets.find(t=>t.zone==='Z1')??null,origin:'literal_duration_parameterized_occurrence'}));
 }
 return{model,events,seconds:model.seconds??null,complete:model.complete===true,intensityResolved:events.length>0&&events.every(e=>Number.isFinite(e.intensity?.min)&&Number.isFinite(e.intensity?.max)),possibleSeconds:model.possibleElapsedSeconds,unknowns:!model.complete?['final_rest_occurrence_unresolved']:[],noFourByFifteenEquivalence:true};
}

/** Feeds the existing V18/V27 IR walker. Per-literal paces never come from CSS. */
export function swimTimelineV28(record:any,p:Set,bindings:Record<string,string>):TimelineV28{
 const literals=new Map<string,any>();function collect(nodes:any[]){for(const n of nodes){if(n.kind==='distance')literals.set(n.text,n);collect(n.children??[]);}}collect(record.sourceV18Recipe.nodes);
 const secondsPer100ByLiteral:Record<string,number>={},domains:Record<string,any>={};
 for(const[text,node]of literals){
  const pace=p.get('swim.pace:'+text,'s/100m',positive);if(pace!==undefined)secondsPer100ByLiteral[text]=pace;
  const zone=p.get('swim.zone:'+text,'source_zone',(z:any)=>(node.declaredPartZones??[]).includes(z)&&(!/\bZ2\b/.test(text)||z==='Z2'));
  if(zone!==undefined&&bindings[zone])domains[text]={sourceZone:zone,doctrineDomain:bindings[zone],origin:'explicit_synthetic_execution_target_not_a_measured_boundary'};
  else if(zone!==undefined)p.errors.push('doctrine_binding_missing:'+text);
 }
 const hasRepeat=(ns:any[]):boolean=>ns.some(n=>n.kind==='repeat'||hasRepeat(n.children??[]));
 const params:any={secondsPer100ByLiteral,transitionSeconds:p.get('swim.transition','s',finite),recoveryIncludesTransition:p.get('swim.recovery_includes_transition','boolean',v=>v===true)};
 if(hasRepeat(record.sourceV18Recipe.nodes)){
  params.restPolicy=p.get('swim.rest_policy','policy',policies);
  const hasUnstated=(ns:any[]):boolean=>ns.some(n=>n.kind==='repeat'&&!(n.children??[]).some((c:any)=>c.role==='rest')||hasUnstated(n.children??[]));
  if(hasUnstated(record.sourceV18Recipe.nodes))params.unstatedRestSeconds=p.get('swim.unstated_rest','s',finite);
 }
 const model=swimExecutionV27(record,params),events=model.events.map((e:any)=>e.kind==='distance'?{...e,intensity:domains[e.sourceText]??null}:e);
 const intensityResolved=events.some((e:any)=>e.kind==='distance')&&events.filter((e:any)=>e.kind==='distance').every((e:any)=>e.intensity&&positive(e.secondsPer100));
 return{model,events,seconds:model.fullDurationSeconds,complete:model.fullDurationVerified,intensityResolved,unknowns:model.unknowns,cssTransferred:false};
}

/** Neuromuscular circuit execution, not a metabolic zone model. No repetition has an implicit tempo. */
export function strengthTimelineV28(record:any,p:Set):TimelineV28{
 const model=strengthExecutionV27(record),events:any[]=[],sideCount=p.get('strength.side_count','count',v=>v===2),sideMode=p.get('strength.side_execution','mode',v=>v==='sequential');
 const sideChange=p.get('strength.side_change','s',finite),exerciseRest=p.get('strength.exercise_rest','s',finite),roundRest=p.get('strength.round_rest','s',finite);
 const exerciseRestPolicy=p.get('strength.exercise_rest_policy','policy',policies),roundRestPolicy=p.get('strength.round_rest_policy','policy',policies);
 const peripheralTransition=p.get('strength.peripheral_transition','s',finite),roundTransitionsIncluded=p.get('strength.round_transitions_in_rest','boolean',v=>v===true),boundaryComposition=p.get('strength.boundary_rest_composition','mode',v=>v==='additive_separate_segments');
 const included=p.get('strength.transitions_in_rest','boolean',v=>v===true),load=p.get('strength.load_mode','mode',v=>v==='bodyweight');
 const tempos=new Map<string,number>();for(const e of model.exercises)if(e.unit==='repetition'){const v=p.get('strength.tempo:'+e.name,'s/rep',positive);if(v!==undefined)tempos.set(e.name,v);}
 let complete=!!model.rounds&&model.exercises.length===6&&[sideCount,sideMode,sideChange,exerciseRest,roundRest,exerciseRestPolicy,roundRestPolicy,peripheralTransition,roundTransitionsIncluded,boundaryComposition,included,load].every(x=>x!==undefined)&&tempos.size===model.exercises.filter((e:any)=>e.unit==='repetition').length;
 const raw=record.originalCanonical.original.effective.structure;
 if(complete){events.push(event('warmup',model.peripherals[0].seconds,{instructions:raw[0].text,origin:'literal_source'}));
  events.push(event('peripheral_transition',peripheralTransition,{position:'warmup_to_main',origin:'explicit_synthetic_parameter'}));
  for(let round=1;round<=model.rounds!;round++){
   model.exercises.forEach((e:any,i:number)=>{
    const count=e.perSide?sideCount:1,perSideSeconds=e.unit==='second'?e.perRoundDose:e.perRoundDose*tempos.get(e.name)!;
    for(let side=1;side<=count;side++){
     events.push(event(e.unit==='second'?'hold':'repetitions',perSideSeconds,{round,name:e.name,side:e.perSide?side:null,repetitions:e.unit==='repetition'?e.perRoundDose:null,secondsPerRep:tempos.get(e.name)??null,loadMode:load,sourceText:e.sourceText,origin:e.unit==='second'?'source_hold_duration':'explicit_synthetic_tempo',cardiovascularZone:null}));
     if(side<count)events.push(event('side_change',sideChange,{round,name:e.name,origin:'explicit_synthetic_parameter'}));
    }
    if(i<model.exercises.length-1||exerciseRestPolicy==='after_each')events.push(event('exercise_rest_and_transition',exerciseRest,{round,origin:'explicit_synthetic_parameter',occurrencePolicy:exerciseRestPolicy}));
   });
   if(round<model.rounds!||roundRestPolicy==='after_each')events.push(event('round_rest_and_transition',roundRest,{round,origin:'explicit_synthetic_parameter',occurrencePolicy:roundRestPolicy}));
  }
  events.push(event('peripheral_transition',peripheralTransition,{position:'main_to_cooldown',origin:'explicit_synthetic_parameter'}));
  events.push(event('cooldown',model.peripherals[1].seconds,{instructions:raw[raw.length-1].text,origin:'literal_source'}));
 }
 return{model,events,seconds:complete?events.reduce((n,e)=>n+e.seconds,0):null,complete,intensityResolved:complete,neuromuscularLoadMode:load??null,cardiovascularZoneUsed:false,unknowns:complete?[]:['explicit_tempo_rest_occurrence_sides_or_load_missing'],competenceDoesNotProveAssimilation:true};
}
