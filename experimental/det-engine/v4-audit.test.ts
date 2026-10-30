import{it,expect,vi,afterEach}from'vitest';import{readFileSync,writeFileSync,mkdirSync}from'node:fs';import{gunzipSync}from'node:zlib';
import{planningCases,supplementaryPlanningCases,preparePlanningCaseContext}from'@/qa/sports-plan-lab/planningMatrix';
import{prepareGenerationContracts}from'@/lib/plan/prepareGenerationContracts';import{inspectStructuralContracts,CONSTRAINT_GRAPH}from'./v4-audit';
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
it('distinguishes missing trail geometry from a contradictory triathlon training ban',()=>{
 const empty={weeklyQuotas:{},phaseRepairCatalogs:{},chunkRepairCatalogs:[],chunkRegenRepairCatalogs:[]} as never;
 expect(inspectStructuralContracts({objective:'TrailMountain'},empty).conflicts.map(c=>c.classification)).toContain('insufficient_data');
 expect(inspectStructuralContracts({objective:'IM',constraints:'Pas de natation'},empty).conflicts[0].classification).toBe('contradictory_constraints');
 expect(inspectStructuralContracts({objective:'IM',constraints:'Pas de natation'},empty).globalImpossibilityProven).toBe(false);
});
it.skipIf(!process.env.TFCL_DET_V4_OUT)('audits the preserved 600 cases and records graph witnesses without replacement search',()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 const network=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 const baseline=JSON.parse(gunzipSync(readFileSync('docs/det-engine/v3/final/candidate.json.gz')).toString());
 const rows=[...planningCases(),...supplementaryPlanningCases()].map(spec=>{const{prepared}=preparePlanningCaseContext(spec),prep=prepareGenerationContracts(prepared.athleteData,prepared.planConfig,{rotationSeed:0}),old=baseline.rows.find((r:{id:string})=>r.id===spec.id);
  return{id:spec.id,objective:spec.objective,ambition:spec.ambition,level:spec.level,format:spec.format??'continuous',...inspectStructuralContracts(prepared.planConfig,prep),previousAssembly:!!old.candidate,previousReason:old.reason??null};});
 const roots=Object.fromEntries([...new Set(rows.flatMap(r=>r.conflicts.map(c=>c.code)))].map(code=>[code,{cases:rows.filter(r=>r.conflicts.some(c=>c.code===code)).length,witnesses:rows.reduce((n,r)=>n+r.conflicts.filter(c=>c.code===code).length,0)}]));
 mkdirSync(process.env.TFCL_DET_V4_OUT!,{recursive:true});writeFileSync(`${process.env.TFCL_DET_V4_OUT}/audit.json`,JSON.stringify({version:'det-v4-structural-audit-1',cases:600,graph:CONSTRAINT_GRAPH,roots,rows,scope:'Necessary contradictions and missing contracts only; residual solver/catalogue causes retain V3 diagnosis',globalImpossibleClaims:0},null,2));
 expect(rows).toHaveLength(600);expect(network).not.toHaveBeenCalled();
},720000);
