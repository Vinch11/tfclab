import{it,expect,vi,afterEach}from'vitest';import{mkdirSync,writeFileSync,readFileSync}from'node:fs';import{gzipSync,gunzipSync}from'node:zlib';
import{TRAIL_FIXTURES,prepareTrailFixture}from'./v4-trail-fixtures';import{generateTrailPlan,TRAIL_CALENDAR_MODELS}from'./v4-trail';
import{selectWholePlanProposal}from'./v4-plan-selection';
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
it.skipIf(!process.env.TFCL_DET_V4_OUT)('builds complete synthetic trail calendars with explicit refusals, original validation and exact replay',()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 const network=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});const rows=[],replay=[];
 for(const fixture of TRAIL_FIXTURES){const{athlete,config}=prepareTrailFixture(fixture);
  for(const model of TRAIL_CALENDAR_MODELS){const result=generateTrailPlan(athlete,config,fixture,model),again=generateTrailPlan(athlete,config,fixture,model);expect(result,`${fixture.id}:${model}`).toEqual(again);
   if(result.status==='candidate'){
    expect(result.candidate.weeks).toHaveLength(fixture.weeks);expect(result.technical.valid).toBe(true);expect(result.global.contractPassed).toBe(true);
    for(const week of result.candidate.weeks){expect(new Set(week.sessions.map(s=>s.dayIndex)).size).toBe(7);for(const s of week.sessions)if(!s.isRest&&!s.custom)expect(s.catalogId).toBeTruthy();}
   }
   rows.push({objective:fixture.objective,level:fixture.level,fixture,...result});replay.push({objective:fixture.objective,level:fixture.level,fixture,...again});
  }
 }
 const prior=process.env.TFCL_DET_V4_TRAIL_COMPARE?JSON.parse(gunzipSync(readFileSync(process.env.TFCL_DET_V4_TRAIL_COMPARE)).toString())as typeof rows:[];
 const decisions=rows.map(row=>{const previous=prior.find(p=>p.fixtureId===row.fixtureId&&p.model===row.model);return{fixtureId:row.fixtureId,model:row.model,...selectWholePlanProposal(previous,row)};});
 const retained=decisions.map(d=>d.selected),built=rows.filter(r=>r.status==='candidate');
 for(const old of prior.filter(r=>r.status==='candidate'))expect(retained.find(r=>r.fixtureId===old.fixtureId&&r.model===old.model)?.status).toBe('candidate');
 const summary={version:'det-v4-trail-matrix-3',cohort:'new_explicit_synthetic_only',cases:rows.length,built:built.length,technicalValid:built.filter(r=>r.technical.valid).length,sportConformant:built.filter(r=>r.candidateSportConformant).length,
  byModel:TRAIL_CALENDAR_MODELS.map(model=>({model,cases:rows.filter(r=>r.model===model).length,built:built.filter(r=>r.model===model).length})),
  byObjective:TRAIL_FIXTURES.map(f=>f.objective).filter((v,i,a)=>a.indexOf(v)===i).map(objective=>({objective,cases:rows.filter(r=>r.objective===objective).length,built:built.filter(r=>r.objective===objective).length})),
  reasons:Object.fromEntries([...new Set(rows.filter(r=>r.status==='refused').map(r=>r.reason))].map(reason=>[reason,rows.filter(r=>r.status==='refused'&&r.reason===reason).length])),exactReplay:rows.length,paidApiCalls:0,
  retention:{previousBuilt:prior.filter(r=>r.status==='candidate').length,retainedBuilt:retained.filter(r=>r.status==='candidate').length,acceptedWholePlanCorrections:decisions.filter(d=>d.acceptedCorrection).length,decisions:decisions.map(({selected:_selected,...d})=>d)}};
 const out=process.env.TFCL_DET_V4_OUT!;mkdirSync(out,{recursive:true});writeFileSync(`${out}/summary.json`,JSON.stringify(summary,null,2));
 for(const [name,data]of [['candidate',rows],['replay',replay]]as const)writeFileSync(`${out}/${name}.json.gz`,gzipSync(JSON.stringify(data)));
 writeFileSync(`${out}/retained.json.gz`,gzipSync(JSON.stringify(retained)));
 expect(rows).toHaveLength(36);expect(network).not.toHaveBeenCalled();
 // This is a functional generator requirement, never satisfied by fake sessions or discarded refusals.
 expect(built.length).toBeGreaterThan(0);
},720000);
