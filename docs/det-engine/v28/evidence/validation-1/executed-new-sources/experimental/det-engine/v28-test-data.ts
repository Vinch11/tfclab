import fs from 'node:fs';import {loadV27Data,findV27Slot} from './v27-test-data';
import {declareSyntheticV28,type ContextV28} from './v28-parameters';
import {strengthExecutionV27} from './v27-modal';

export function loadV28Data(){return{...loadV27Data(),v28:JSON.parse(fs.readFileSync('docs/det-engine/v28/inputs.json','utf8'))};}
export function materializeV28Scenario(d:any,type:string,index=0){
 const row=type==='aero'?d.v28.aero[index]:type==='swim'?d.v28.swim[index]:d.v28.strength;
 const sourceId=type==='aero'?'C_BIKE_AERO_POSITION_DRILLS':row.sourceId,f=findV27Slot(d,sourceId);
 const context:ContextV28={scenarioId:row.id,objective:'IM',phase:'base',contextDate:d.v28.contextDate,contextVersion:d.v28.contextVersion,syntheticOnly:true};
 const params:any[]=[],add=(k:string,v:any,u:string)=>params.push(declareSyntheticV28(f.record,context,k,v,u));
 if(type==='aero')add('aero.rest_policy',row.policy,'policy');
 if(type==='swim'){
  for(const[text,pace]of Object.entries(row.params.secondsPer100ByLiteral??{})){add('swim.pace:'+text,pace,'s/100m');add('swim.zone:'+text,/Z2/.test(text)?'Z2':'Z1','source_zone');}
  add('swim.transition',row.params.transitionSeconds??null,'s');add('swim.recovery_includes_transition',row.params.recoveryIncludesTransition??null,'boolean');
  if('restPolicy'in row.params)add('swim.rest_policy',row.params.restPolicy,'policy');
  if('unstatedRestSeconds'in row.params)add('swim.unstated_rest',row.params.unstatedRestSeconds,'s');
 }
 if(type==='strength'){
  const model=strengthExecutionV27(f.record);for(const e of model.exercises)if(e.unit==='repetition')add('strength.tempo:'+e.name,row.secondsPerRep,'s/rep');
  add('strength.side_count',row.sideCount,'count');add('strength.side_execution',row.sideExecution,'mode');add('strength.side_change',row.sideChangeSeconds,'s');add('strength.exercise_rest',row.exerciseRestSeconds,'s');add('strength.round_rest',row.roundRestSeconds,'s');add('strength.transitions_in_rest',row.betweenExerciseTransitionsIncludedInRest,'boolean');add('strength.load_mode',row.loadMode,'mode');
 }
 return{row,type,f,context,parameters:params,availableMinutes:row.availableMinutes,options:d.v28.syntheticContext};
}
