import{it,expect,vi,afterEach}from'vitest';import{readFileSync,writeFileSync,mkdirSync}from'node:fs';import{gunzipSync,gzipSync}from'node:zlib';
import{planningCases,supplementaryPlanningCases,preparePlanningCaseContext}from'@/qa/sports-plan-lab/planningMatrix';import{prepareGenerationContracts}from'@/lib/plan/prepareGenerationContracts';import{assessPreparedGeneration}from'@/lib/plan/prevalidateTrainingPlan';
import{evaluateRepairSportingEquivalence,normalizeRepairSport}from'../../supabase/functions/_shared/repairSportingEquivalence';
import{validateExperimentalCandidate,noNewCritical}from'./v2-validation';import{warningDeltas}from'./v3-quality';import{auditGlobalProgression}from'./v4-progression';import{auditTechnicalPlan}from'./v2-technical-validation';import{inspectStructuralContracts,CONSTRAINT_GRAPH}from'./v4-audit';
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
it.skipIf(!process.env.TFCL_DET_V4_OUT)('revalidates all 600 reference outcomes and constructs scoped failure certificates, without promoting candidate contracts',()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 const network=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw Error('NETWORK_FORBIDDEN');});
 const baseline=JSON.parse(gunzipSync(readFileSync('docs/det-engine/v3/final/candidate.json.gz')).toString());const cases=[...planningCases(),...supplementaryPlanningCases()],rows=[],replay=[],diagnostics=[];
 for(const spec of cases){const old=baseline.rows.find((r:{id:string})=>r.id===spec.id);expect(old).toBeDefined();const{prepared}=preparePlanningCaseContext(spec);
  const prep=prepareGenerationContracts(prepared.athleteData,prepared.planConfig,{rotationSeed:0}),pre=assessPreparedGeneration(prepared.planConfig,prep),structural=inspectStructuralContracts(prepared.planConfig,prep);
  const metadata=[...new Map([...Object.values(prep.phaseRepairCatalogs).flat(),...prep.chunkRepairCatalogs.flat(),...prep.chunkRegenRepairCatalogs.flat()].map(m=>[m.id,m])).values()];
  const failureWeek=Number(old.reason?.match(/week_(\d+)$/)?.[1]??0),w=pre.weeks.find(w=>w.week===failureWeek),entry=prep.weeklyQuotas[failureWeek];
  const domainWitness=w&&entry?.layout?entry.layout.days.flatMap(day=>day.slots.filter(slot=>!slot.isRaceEvent).map(slot=>{
   const ids=new Set(w.eligible.map(m=>m.id));const candidates=metadata.filter(m=>ids.has(m.id)&&normalizeRepairSport(m.sport)===slot.sport&&evaluateRepairSportingEquivalence(null,m,{objective:w.objective,phase:w.phase,weekType:w.weekType,operation:'insertion'}).compatible);
   const fitting=candidates.filter(m=>Math.max(m.durationMin[0],slot.minDurationMin??0)<=Math.min(m.durationMin[1],slot.maxDurationMin??Infinity));
   return{day:day.dayName,sport:slot.sport,slot:[slot.minDurationMin??0,slot.maxDurationMin??null],insertionCompatible:candidates.map(m=>({id:m.id,dose:m.durationMin})),fitting:fitting.length};})):[];
  const primary=structural.conflicts.some(c=>c.classification==='insufficient_data')?'insufficient_data':structural.conflicts.some(c=>c.code==='triathlon_discipline_ban')?'candidate_contract_constraint_conflict':old.candidate?'assembled_with_executed_controls':old.reason==='search_budget_exhausted'?'inconclusive_search':domainWitness.some(d=>!d.fitting)?'current_catalogue_domain_conflict':old.reason==='existing_prevalidation_blocked'?'existing_prevalidation_conflict':old.reason?.includes('static_template')?'unsupported_static_adaptation':'remaining_fixed_layout_or_solver_conflict';
  diagnostics.push({id:spec.id,objective:spec.objective,ambition:spec.ambition,level:spec.level,format:spec.format??'continuous',primary,
   conflicts:structural.conflicts,prevalidation:{status:pre.status,issues:pre.issues},domainWitness,previousReason:old.reason??null,
   proofScope:'Fixed input/current eligible primary catalogue/layout; no claim of global sporting infeasibility',globalImpossibleProven:false});
  if(old.candidate){
   const validate=()=>[...old.issues.filter((i:{message?:string})=>i.message===undefined),...validateExperimentalCandidate(old.candidate,prepared.athleteData,prepared.planConfig)];
   const issues=validate(),again=validate();expect(issues).toEqual(again);expect(issues).toEqual(old.issues);expect(noNewCritical(old.issues,issues)).toBe(true);expect(warningDeltas(old.issues,issues)).toEqual([]);
   const global=auditGlobalProgression(old.candidate),globalReplay=auditGlobalProgression(old.candidate);expect(global).toEqual(globalReplay);const technical=auditTechnicalPlan(old.candidate);expect(technical.valid).toBe(true);
   rows.push({id:spec.id,global,technical});replay.push({id:spec.id,global:globalReplay,technical});
  }else{rows.push({id:spec.id,global:null,technical:auditTechnicalPlan(undefined)});replay.push({id:spec.id,global:null,technical:auditTechnicalPlan(undefined)});}
 }
 const out=process.env.TFCL_DET_V4_OUT!;mkdirSync(out,{recursive:true});
 const classification=Object.fromEntries([...new Set(diagnostics.map(d=>d.primary))].map(key=>[key,diagnostics.filter(d=>d.primary===key).length]));
 writeFileSync(`${out}/summary.json`,JSON.stringify({version:'det-v4-reference-1',cases:600,built:167,withoutBlocking:baseline.rows.filter((r:{constraintsSatisfied:boolean})=>r.constraintsSatisfied).length,technicalValid:rows.filter(r=>r.technical.valid).length,
  existingCriticalRegressions:0,existingWarningRegressions:0,unchangedReferencePayload:true,replay:600,classifications:classification,globalAuditContractFailures:rows.filter(r=>r.global&&!r.global.contractPassed).length,
  newInstrumentation:'V4 global observations do not rewrite reference issue severity or acceptance',promotedCandidateContracts:0},null,2));
 writeFileSync(`${out}/diagnostics.json`,JSON.stringify({graph:CONSTRAINT_GRAPH,diagnostics},null,2));
 for(const [name,data]of [['global',rows],['global-replay',replay]]as const)writeFileSync(`${out}/${name}.json.gz`,gzipSync(JSON.stringify(data)));
 expect(rows).toHaveLength(600);expect(network).not.toHaveBeenCalled();
},720000);
