import{it,expect,vi,afterEach}from'vitest';import{TRAIL_FIXTURES,prepareTrailFixture}from'./v4-trail-fixtures';import{generateTrailPlan}from'./v4-trail';
import{writeFileSync}from'node:fs';import{gzipSync}from'node:zlib';
import{WorkoutLibrary}from'@/lib/workoutLibrary';import{buildRepairWorkoutMetadata}from'@/lib/plan/repairCatalogMetadata';import{generationEligibility}from'./v4-generation-eligibility';
afterEach(()=>{vi.restoreAllMocks();vi.useRealTimers();});
it('rejects absent geometry and does not infer permission for back-to-back from an objective',()=>{
 const f=structuredClone(TRAIL_FIXTURES[0]),{athlete,config}=prepareTrailFixture(f);
 expect(generateTrailPlan(athlete,config,{...f,event:{...f.event,distanceKm:NaN}},'separated_exposure').status).toBe('refused');
 expect(generateTrailPlan(athlete,config,f,'specific_back_to_back').status).toBe('refused');
});
it('requires positive evidence for a catalogue prerequisite and retains the original insertion rejection',()=>{
 const card=buildRepairWorkoutMetadata(WorkoutLibrary.find(w=>w.id==='A_TR_SL_ULTRA_BUILD')!);const context={objective:'TrailUltra',phase:'build',weekType:'load'};
 expect(generationEligibility(card,context,[]).compatible).toBe(false);
 const confirmed=generationEligibility(card,context,['ravitaillement']);expect(confirmed.compatible).toBe(true);expect(confirmed.repairInsertionReference.compatible).toBe(false);
});
it('builds or explicitly rejects a real catalogue calendar without fabricating a session',()=>{
 vi.useFakeTimers({toFake:['Date']});vi.setSystemTime(new Date('2026-10-26T12:00:00Z'));vi.spyOn(console,'log').mockImplementation(()=>{});vi.spyOn(console,'warn').mockImplementation(()=>{});
 const f=TRAIL_FIXTURES.find(f=>f.objective==='TrailShort'&&f.level==='trained')!,{athlete,config}=prepareTrailFixture(f);
 const result=generateTrailPlan(athlete,config,f,'separated_exposure');
 if(process.env.TFCL_DET_V4_DEBUG_OUT)writeFileSync(process.env.TFCL_DET_V4_DEBUG_OUT,gzipSync(JSON.stringify(result)));
 if(result.status==='candidate'){expect(result.technical.valid).toBe(true);expect(result.candidate.weeks).toHaveLength(f.weeks);expect(result.ledger.every(d=>d.dMinusM===null||d.source==='explicit_synthetic_route_observation'||d.dMinusM===0)).toBe(true);}
 else expect(result.reason).toBe('trail_role_has_no_catalogue_dose_within_candidate_contract');
});
