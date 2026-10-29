import fs from 'node:fs';import zlib from 'node:zlib';import {it,expect,vi} from 'vitest';
import {loadV27Data,findV27Slot} from './v27-test-data';import {buildV26Prescription} from './v26-prescription';
import {assessExecutionV27} from './v27-execution';import {swimExecutionV27,aeroExecutionV27,strengthExecutionV27} from './v27-modal';
import {searchExecutionAlternativesV27} from './v27-alternatives';import {simulateExecutionTextV27} from './v27-nolio';
import {validateFourWeekScopeV23} from './v23-scope';import {digest} from './v9-prospective';

it('replays A/B/C unchanged and produces thirty independent execution contracts for B plus separate synthetic timing scenarios',()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-29T12:00:00Z'));vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});vi.stubGlobal('fetch',()=>{throw Error('NETWORK_FORBIDDEN');});
 try{const d=loadV27Data(),out=process.env.TFCL_DET_V27_OUT;
 if(out){if(fs.existsSync(out)||!out.startsWith('docs/det-engine/v27/evidence/'))throw Error('FRESH_V27_OUTPUT_REQUIRED');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(out+'/registered-inputs.json',JSON.stringify(d.v27,null,2)+'\n');fs.writeFileSync(out+'/original-cases.json',JSON.stringify(d.cases.slice(0,3),null,2)+'\n');}
 const rows=d.prepared.slice(0,3).map((v:any,i:number)=>{
  const r=buildV26Prescription(v,d.a,d.canonical,d.knowledge,d.spec.clock);expect(r.retained).toEqual(d.baseline26[i].retained);
  const pin=digest(r.retained),executions=r.retained.calendar.weeks.flatMap((w:any)=>w.slots.map((s:any)=>assessExecutionV27(s,r.retained.decisions.find((x:any)=>x.slotKey===s.key),w,v,d.a,d.canonical.get(s.card.id))));
  expect(digest(r.retained)).toBe(pin);const nolio=executions.map((e:any)=>({slotKey:e.slotKey,result:simulateExecutionTextV27(e,d.canonical.get(e.sourceId),v.profile.config.planStartDate)}));
  const oldFacts=r.retained.decisions.map((x:any)=>({slotKey:x.slotKey,sourceRecipeClass:d.canonical.get(x.sourceId).sourceV18Recipe.classification,numericTargetsPreviouslyAvailable:x.targets.some((t:any)=>'min'in t),sourceGenericTimingPreviouslyKnown:x.canonicalReview?.timing?.timingCompleteForDeclaredRecipe??false,objectiveVariantPreviouslyResolved:x.canonicalReview?.goalVariantStatus==='not_present_in_source'}));
  const alternatives=i===1?searchExecutionAlternativesV27(r.retained,v,d.a,d.canonical,executions):null;
  return{caseId:v.caseId,input:v.input,profileFrame:{config:v.profile.config,normalCaps:v.profile.normalCaps,longCaps:v.profile.longCaps},calendarHash:pin,calendar:r.retained,scope:validateFourWeekScopeV23(r.retained,v.profile),beforeV26:oldFacts,executionContractPreviouslyImplemented:false,executions,alternatives,nolio};
 });
 expect(rows[1].executions).toHaveLength(30);expect(rows[1].executions.filter((e:any)=>e.technicallyExecutable).map((e:any)=>e.sourceId)).toEqual(['A_RUN_EASY_45_PRO','A_RUN_EASY_45_PRO','A_RUN_EASY_45_PRO']);
 expect(rows[0].calendar.decisions.filter((x:any)=>x.sport==='run'&&x.state==='not_admissible')).toHaveLength(7);expect(rows[2].executions.every((e:any)=>!e.technicallyExecutable)).toBe(true);
 const long=findV27Slot(d,'SEILER_BIKE_Z1_LONG'),easy=findV27Slot(d,'A_RUN_EASY_45_PRO');
 const fixtures={equipment:d.v27.equipment.map((f:any)=>({input:f,result:assessExecutionV27(long.slot,long.decision,long.week,long.v,long.spec,long.record,{equipment:f})})),
  swim:d.v27.swim.map((f:any)=>({input:f,result:swimExecutionV27(d.canonical.get(f.sourceId),f.params),notAthleteBData:true})),
  aero:d.v27.aero.map((f:any)=>({input:f,result:aeroExecutionV27(d.canonical.get('C_BIKE_AERO_POSITION_DRILLS'),f.restPolicy)})),
  strength:[true,false,null].map(competence=>({competence,result:strengthExecutionV27(d.canonical.get('A_STR_STABILITY_CORE'),competence),notAthleteBData:true})),
  negativeRun:d.v27.negativeRun.map((f:any)=>({input:f,result:assessExecutionV27(easy.slot,easy.decision,easy.week,easy.v,easy.spec,easy.record,f)}))};
 if(out){fs.writeFileSync(out+'/results.json.gz',zlib.gzipSync(JSON.stringify(rows,null,2)));fs.writeFileSync(out+'/fixtures.json.gz',zlib.gzipSync(JSON.stringify(fixtures,null,2)));}
 }finally{vi.useRealTimers();vi.restoreAllMocks();vi.unstubAllGlobals();}
});
