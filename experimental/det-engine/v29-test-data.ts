import fs from 'node:fs';import {loadV28Data,materializeV28Scenario} from './v28-test-data';import {createEvidenceRegistryV29} from './v29-evidence';
export function loadV29Data(){const d=loadV28Data(),registration=JSON.parse(fs.readFileSync('docs/det-engine/v29/inputs.json','utf8')),registry=createEvidenceRegistryV29(registration,d.prepared);return{...d,registration,registry};}
export function scenarioV29(d:any,id:string){
 const row=d.registry.get(id),type=id.startsWith('aero_')?'aero':id.startsWith('strength_')?'strength':'swim',list=type==='aero'?d.v28.aero:type==='strength'?d.v28Strength.variants:d.v28.swim;
 const index=list.findIndex((s:any)=>s.id===id);if(index<0)throw Error('V29_REGISTERED_SCENARIO_NOT_MATERIALIZABLE');
 const s=materializeV28Scenario(d,type,index),request={scenarioId:id,...d.registry.binding(id),reservedMinutes:row.fixture.availableMinutes,semantics:'synthetic_upper_bound',envelopeAcknowledged:true};return{...s,row,request};
}
