import{it,expect}from'vitest';import{allocateBrick,componentContract,raceEveDay}from'./v4-ironman';import{effectiveSessionQuota}from'../../supabase/functions/_shared/sessionQuotaAccounting';
it('allocates explicit components inside source ranges and rejects an inconsistent primary total',()=>{
 expect(allocateBrick('BRICK_STAGE1_INTRO',60)).toEqual({bike:45,run:15,source:'BRICK_STAGE1_INTRO'});
 expect(allocateBrick('BRICK_STAGE1_INTRO',90)).toBeNull();expect(allocateBrick('UNKNOWN',60)).toBeNull();
 expect(allocateBrick('BRICK_STAGE2_BUILD',95)).toEqual({bike:75,run:20,source:'BRICK_STAGE2_BUILD'});
 expect(allocateBrick('BRICK_STAGE2_BUILD',120,100)).toEqual({bike:100,run:20,source:'BRICK_STAGE2_BUILD'});
});
it('does not silently allow a race-eve card during an ordinary taper week',()=>{
 const contract=componentContract('components_recovery_relief').contract;
 expect(contract.filterCandidate!({id:'BRICK_ACTIVATION_PRE_RACE'}as never,{slot:{sport:'brick'},week:10,weekType:'taper',phase:'taper',dayIndex:5})).toBe(false);
 expect(contract.filterCandidate!({id:'BRICK_ACTIVATION_PRE_RACE'}as never,{slot:{sport:'brick'},week:12,weekType:'race',phase:'taper',dayIndex:5})).toBe(false);
 expect(raceEveDay(4,[{dayName:'samedi'}])).toBe(true);expect(raceEveDay(5,[{dayName:'dimanche'}])).toBe(true);expect(raceEveDay(5,[])).toBe(false);
});
it('preserves the existing physical total when a nominal brick is removed',()=>{const original={bike:{min:3,max:3},totalSessions:{min:11,max:12}};const effective=effectiveSessionQuota(original,1);expect(effectiveSessionQuota({...original,totalSessions:effective.totalSessions},0).totalSessions).toEqual({min:10,max:11});});
