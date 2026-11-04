import{it,expect,vi,afterEach}from'vitest';import{mkdirSync,writeFileSync}from'node:fs';import{gzipSync}from'node:zlib';
import{planningCases,preparePlanningCaseContext}from'@/qa/sports-plan-lab/planningMatrix';import{buildIronmanCandidate,IM_MODELS}from'./v4-ironman';
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
it.skipIf(!process.env.TFCL_DET_V4_OUT)('compares component/calendar contracts on all 40 historical continuous Ironman cases twice',()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 const network=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});const rows=[],replay=[];
 for(const spec of planningCases().filter(c=>c.objective==='IM')){const{prepared}=preparePlanningCaseContext(spec);
  for(const model of IM_MODELS){const once=buildIronmanCandidate(prepared.athleteData,prepared.planConfig,model),again=buildIronmanCandidate(prepared.athleteData,prepared.planConfig,model);expect(once,`${spec.id}:${model}`).toEqual(again);
   if('candidate'in once&&once.candidate&&model.startsWith('components_')){
    expect(once.technical.valid).toBe(true);expect(once.global?.contractPassed).toBe(true);
    for(const w of once.candidate.weeks)for(const [index,s]of w.sessions.entries())if(s.sport==='brick'&&!s.custom)expect(once.ledger.some(d=>d.week===w.weekNumber&&d.session===index)).toBe(true);
   }
   rows.push({id:spec.id,level:spec.level,ambition:spec.ambition,effectiveAmbition:prepared.planConfig.ambition,...once});replay.push({id:spec.id,level:spec.level,ambition:spec.ambition,effectiveAmbition:prepared.planConfig.ambition,...again});
  }
 }
 const summary=IM_MODELS.map(model=>{const r=rows.filter(r=>r.model===model);return{model,cases:r.length,built:r.filter(r=>r.technicallyConstructed).length,
  candidateSportConformant:r.filter(r=>'constraintsSatisfied'in r&&r.constraintsSatisfied).length,referenceSportConformant:r.filter(r=>'originalIssues'in r&&r.originalIssues&&!r.originalIssues.some(i=>['error','critical','blocking'].includes(i.severity))).length,
  reasons:Object.fromEntries([...new Set(r.map(r=>r.reason??'candidate'))].map(reason=>[reason,r.filter(r=>(r.reason??'candidate')===reason).length])),
  byLevel:[...new Set(r.map(r=>r.level))].map(level=>({level,cases:r.filter(r=>r.level===level).length,built:r.filter(r=>r.level===level&&r.technicallyConstructed).length})),exactReplay:r.length};});
 const out=process.env.TFCL_DET_V4_OUT!;mkdirSync(out,{recursive:true});writeFileSync(`${out}/summary.json`,JSON.stringify({version:'det-v4-im-contracts-1',historicalSubset:true,models:summary,paidApiCalls:0},null,2));
 for(const [name,data]of [['candidate',rows],['replay',replay]]as const)writeFileSync(`${out}/${name}.json.gz`,gzipSync(JSON.stringify(data)));
 expect(rows).toHaveLength(160);expect(network).not.toHaveBeenCalled();
},720000);
