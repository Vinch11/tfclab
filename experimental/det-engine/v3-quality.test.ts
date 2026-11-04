import {it,expect,vi,afterEach} from 'vitest';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {planningCases,supplementaryPlanningCases,preparePlanningCaseContext} from '@/qa/sports-plan-lab/planningMatrix';
import {prepareGenerationContracts} from '@/lib/plan/prepareGenerationContracts';
import {validateExperimentalCandidate,criticalCounts,noNewCritical} from './v2-validation';
import {repairDeterministicCandidate,type V2Result} from './v2-engine';
import {assessRepairQuality,classifyWarning,warningDeltas,progressionRisks,WARNING_POLICY_VERSION} from './v3-quality';
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
const issue=(code:string,week=2)=>({code,week,severity:'warning',message:`S${week}: alerte ${code}`,control:'test'});
const plan=()=>({weeks:[],phases:[],totalWeeks:0,title:'fixture'}) as ParsedPlan;
it('protects new substantive warnings even when blocking errors disappear',()=>{
 expect(assessRepairQuality([{code:'polarization',severity:'error'}],[issue('limiter_coherence')],plan(),plan()).accepted).toBe(false);
 expect(classifyWarning(issue('key_session_self_declaration_mismatch')).reviewPriority).toBe('high');
 expect(classifyWarning(issue('unrecognized_rule')).reviewPriority).toBe('high');
});
it('does not net warnings in different weeks, subtypes or disciplines',()=>{
 expect(warningDeltas([issue('progression',2)],[issue('progression',3)]).filter(d=>d.delta>0)).toHaveLength(1);
 expect(warningDeltas([issue('progression')],[{...issue('progression'),message:'S2: sortie longue Vélo +30%'}]).filter(d=>d.delta>0)).toHaveLength(1);
 expect(warningDeltas([{...issue('polarization'),message:'S2: marginale 61%'}],[{...issue('polarization'),message:'S2: marginale 63%'}])).toEqual([]);
});
it('protects the measured magnitude of an existing intensity warning without changing its threshold',()=>{
 const warn=(pct:number)=>({...issue('polarization'),message:`S2: Polarisation marginale — ${pct}% en Z1-Z2 (recommandé ≥ 75%)`});
 expect(assessRepairQuality([warn(65)],[warn(61)],plan(),plan()).accepted).toBe(false);
 expect(assessRepairQuality([warn(61)],[warn(65)],plan(),plan()).accepted).toBe(true);
});
it('rejects a local reduction that makes the following week jump more, without defining a universal safe percentage',()=>{
 const p=plan();p.weeks=[100,110,120].map((durationMin,i)=>({weekNumber:i+1,phase:'base',theme:'base',sessions:[{sport:'run',durationMin,isRest:false,title:'Endurance',details:'Z2',dayIndex:1,dayName:'mardi',weekNumber:i+1,phase:'base',weekTheme:'base'}]}));
 p.weeklyQuotas=Object.fromEntries([1,2,3].map(w=>[w,{weekType:'load'}])) as ParsedPlan['weeklyQuotas'];
 const next=structuredClone(p);next.weeks[1].sessions[0].durationMin=90;
 expect(progressionRisks(next)['3:run']).toBeGreaterThan(progressionRisks(p)['3:run']);
 expect(assessRepairQuality([],[],p,next).accepted).toBe(false);
});
it.skipIf(!process.env.TFCL_DET_V3_QUALITY_OUT)('reconstructs and independently revalidates all 245 historical accepted repairs, then tests stricter continuation twice',()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));
 const network=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 type Row=V2Result&{id:string;objective:string};
 const read=(p:string)=>JSON.parse(gunzipSync(readFileSync(p)).toString()) as {version:string;controls:unknown[];rows:Row[]};
 const initial=read('docs/det-engine/v2/cycles/02/baseline.json.gz'),final=read('docs/det-engine/v2/final/candidate.json.gz');
 const cases=[...planningCases(),...supplementaryPlanningCases()];
 const records=[],classification:Record<string,{before:number;after:number;classification:ReturnType<typeof classifyWarning>}>= {},candidate=[],replayed=[];
 const count=(issues:Row['issues'])=>Object.values(criticalCounts(issues)).reduce((a,b)=>a+b,0);
 for(const row of final.rows){
  const base=initial.rows.find(r=>r.id===row.id)!;
  for(const [key,r] of [['before',base],['after',row]] as const)for(const i of r.issues.filter(i=>i.severity==='warning')){
   classification[i.code]??={before:0,after:0,classification:classifyWarning(i)};classification[i.code][key]++;
  }
  if(!row.candidate){candidate.push(row);replayed.push(row);continue;}
  const spec=cases.find(c=>c.id===row.id)!;const {prepared}=preparePlanningCaseContext(spec);
  const prep=prepareGenerationContracts(prepared.athleteData,prepared.planConfig,{rotationSeed:0});
  const metadata=[...Object.values(prep.phaseRepairCatalogs).flat(),...prep.chunkRepairCatalogs.flat(),...prep.chunkRegenRepairCatalogs.flat()];
  const replay=structuredClone(base.candidate!);let issues=base.issues;
  for(const record of row.repairs.filter(r=>r.accepted)){
   const week=replay.weeks.find(w=>w.weekNumber===record.week)!,old=week.sessions[record.session];
   expect({id:old.catalogId,duration:old.durationMin},`${row.id}:${record.attempt}`).toEqual(record.before);
   const m=metadata.find(m=>m.id===record.after.id)!;expect(m).toBeDefined();
   const beforePlan=structuredClone(replay);
   week.sessions[record.session]={...old,catalogId:m.id,title:m.title,details:m.structure,durationMin:record.after.duration,variantKey:undefined,zones:m.zones.length?m.zones:m.mainZoneMax?[`Z${m.mainZoneMax}`]:[]};
   const after=[...issues.filter(i=>i.message===undefined),...validateExperimentalCandidate(replay,prepared.athleteData,prepared.planConfig)];
   expect(criticalCounts(after)).toEqual(record.afterCritical);
   expect(noNewCritical(issues,after)).toBe(true);
   const quality=assessRepairQuality(issues,after,beforePlan,replay);
   records.push({id:row.id,attempt:record.attempt,week:record.week,before:record.before,after:record.after,
    criticalBefore:count(issues),criticalAfter:count(after),...quality,
    sameCodeDowngrades:quality.addedWarnings.filter(w=>{const week=w.issue.week??Number(w.issue.message?.match(/^S(\d+)\s*:/)?.[1]??0);const key=`${w.issue.code}:${week}`;return (criticalCounts(issues)[key]??0)>(criticalCounts(after)[key]??0);})});
   issues=after;
  }
  expect(replay,`${row.id}: exact final reconstruction`).toEqual(row.candidate);
  expect(issues).toEqual(row.issues);
  const next=repairDeterministicCandidate(row,prepared.athleteData,prepared.planConfig,{maxAttempts:16,maxAccepted:4},assessRepairQuality);
  const again=repairDeterministicCandidate(row,prepared.athleteData,prepared.planConfig,{maxAttempts:16,maxAccepted:4},assessRepairQuality);
  expect(next).toEqual(again);expect(noNewCritical(row.issues,next.issues)).toBe(true);
  expect(assessRepairQuality(row.issues,next.issues,row.candidate,next.candidate!).accepted).toBe(true);
  candidate.push({...row,...next});replayed.push({...row,...again});
 }
 expect(records).toHaveLength(245);expect(candidate).toHaveLength(600);expect(network).not.toHaveBeenCalled();
 const out=process.env.TFCL_DET_V3_QUALITY_OUT!;mkdirSync(out,{recursive:true});
 const bundle={version:WARNING_POLICY_VERSION,controls:final.controls,rows:candidate};
 const summary={version:WARNING_POLICY_VERSION,baseline:final.version,configurations:600,historicalRepairs:records.length,
  requalifiedWithNewWarnings:records.filter(r=>r.addedWarnings.length).length,
  requalifiedWithWorsenedProgression:records.filter(r=>r.worsenedProgression.length).length,
  requalifiedWithWorsenedIntensityWarning:records.filter(r=>r.worsenedWarningMagnitude.length).length,
  retrospectivelyPassStricterGuard:records.filter(r=>r.accepted).length,
  sameCodeDowngradeRepairs:records.filter(r=>r.sameCodeDowngrades.length).length,
  classification:Object.fromEntries(Object.entries(classification).map(([k,v])=>[k,{...v,delta:v.after-v.before}])),
  criticalBefore:final.rows.reduce((n,r)=>n+count(r.issues),0),criticalAfter:candidate.reduce((n,r)=>n+count(r.issues),0),
  built:candidate.filter(r=>r.technicallyConstructed).length,conformant:candidate.filter(r=>r.constraintsSatisfied).length,
  newAccepted:candidate.reduce((n,r,i)=>n+r.repairs.slice(final.rows[i].repairs.length).filter(x=>x.accepted).length,0),
  replayCases:600,candidateSha256:createHash('sha256').update(JSON.stringify(bundle)).digest('hex')};
 writeFileSync(`${out}/quality.json`,JSON.stringify({summary,records},null,2));
 writeFileSync(`${out}/candidate.json.gz`,gzipSync(JSON.stringify(bundle)));
 writeFileSync(`${out}/replay.json.gz`,gzipSync(JSON.stringify({...bundle,rows:replayed})));
},900000);
