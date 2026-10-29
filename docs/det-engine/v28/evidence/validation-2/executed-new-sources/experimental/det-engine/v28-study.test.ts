import fs from 'node:fs';import zlib from 'node:zlib';import {it,expect,vi} from 'vitest';
import {loadV28Data,materializeV28Scenario} from './v28-test-data';import {buildV26Prescription} from './v26-prescription';
import {resolveParametricV28,phaseVariantOptionsV28,reviewParametricBlockV28} from './v28-execution';
import {assessExecutionV27} from './v27-execution';import {findV27Slot} from './v27-test-data';import {digest} from './v9-prospective';
it('replays the original A/B/C calendars unchanged and builds bounded parameterized sidecar scenarios',()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-29T12:00:00Z'));vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});vi.stubGlobal('fetch',()=>{throw Error('NETWORK_FORBIDDEN');});
 try{const d=loadV28Data(),out=process.env.TFCL_DET_V28_OUT;
  const originals=d.prepared.slice(0,3).map((v:any,i:number)=>{const r=buildV26Prescription(v,d.a,d.canonical,d.knowledge,d.spec.clock);expect(r.retained).toEqual(d.baseline26[i].retained);return{caseId:v.caseId,input:v.input,result:r.retained,executions:r.retained.calendar.weeks.flatMap((w:any)=>w.slots.map((s:any)=>assessExecutionV27(s,r.retained.decisions.find((x:any)=>x.slotKey===s.key),w,v,d.a,d.canonical.get(s.card.id))))};});
  const scenarios=[...d.v28.aero.map((_:any,i:number)=>materializeV28Scenario(d,'aero',i)),...d.v28.swim.map((_:any,i:number)=>materializeV28Scenario(d,'swim',i)),...d.v28Strength.variants.map((_:any,i:number)=>materializeV28Scenario(d,'strength',i))].map(s=>{const result=resolveParametricV28(s.f,s.context,s.parameters,s.availableMinutes,s.options);return{fixture:s.row,parameters:s.parameters,context:s.context,options:s.options,sourceId:s.f.record.legacyId,sourceSnapshot:{canonical:s.f.record.originalCanonical,recipe:s.f.record.sourceV18Recipe},result,wholeBlockReview:reviewParametricBlockV28(originals[1].result,s.f.v,s.f.slot.key,result)};});
  const phases=[1,2,3,4].map(w=>phaseVariantOptionsV28(findV27Slot(d,'SEILER_BIKE_Z1_LONG',w)));
  expect(originals[1].executions.filter((e:any)=>e.technicallyExecutable)).toHaveLength(3);expect(originals[0].result.decisions.filter((x:any)=>x.sport==='run'&&x.state==='not_admissible')).toHaveLength(7);expect(originals[2].result.decisions.filter((x:any)=>x.state==='not_admissible')).toHaveLength(26);
  expect(scenarios.every(s=>s.result.approved_by_coach===false&&s.result.individually_admissible===false&&s.wholeBlockReview.automaticallyApplied===false)).toBe(true);
  if(out){if(!out.startsWith('docs/det-engine/v28/evidence/')||fs.existsSync(out))throw Error('V28_FRESH_OUTPUT_REQUIRED');fs.mkdirSync(out,{recursive:true});for(const[name,data]of Object.entries({inputs:d.v28,strengthRegistration:d.v28Strength,originals,scenarios,phases}))fs.writeFileSync(out+'/'+name+'.json.gz',zlib.gzipSync(JSON.stringify(data,null,2)));}
 }finally{vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();}
});
