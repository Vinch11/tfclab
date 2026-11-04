import{it,expect}from'vitest';import type{ParsedPlan}from'@/lib/aiPlanParser';import{auditGlobalProgression,compareGlobalCorrection}from'./v4-progression';
import{selectWholePlanProposal}from'./v4-plan-selection';
const plan=(durations:number[])=>({title:'Fixture',phases:[],totalWeeks:durations.length,weeks:durations.map((d,i)=>({weekNumber:i+1,phase:'base',theme:'base',sessions:[{weekNumber:i+1,weekTheme:'base',phase:'base',dayIndex:1,dayName:'mardi',sport:'run',title:'Endurance',details:'Fixture',durationMin:d,isRest:false}]}))})as ParsedPlan;
it('checks every 2/3/4-week window and rejects padding even when an adjacent ratio improves',()=>{
 const a=plan([40,35,90,100]);const b=plan([40,90,90,100]);const result=compareGlobalCorrection(a,b);expect(result.accepted).toBe(false);expect(result.increases.some(i=>i.from===1&&i.to===3)).toBe(true);expect(auditGlobalProgression(a).windows).toHaveLength(6);
});
it('retains the last proposal when removing a local error pads a multiweek exposure window',()=>{
 const before={status:'candidate',candidate:plan([40,35,90,100]),issues:[{code:'progression',severity:'error',week:3}],technical:{valid:true}};
 const after={...before,candidate:plan([40,90,90,100]),issues:[]};
 const decision=selectWholePlanProposal(before,after);expect(decision.acceptedCorrection).toBe(false);expect(decision.selected).toEqual(before);
});
it('never invents vertical dose or brick shares and detects inconsistent explicit components',()=>{
 const p=plan([60]);p.weeks[0].sessions[0].sport='brick';p.weeks[0].sessions[0].catalogId='BRICK_STAGE1_INTRO';
 const audit=auditGlobalProgression(p);expect(audit.weeks[0].bike).toBe(0);expect(audit.weeks[0].brickUnknownMinutes).toBe(60);
 const failed=auditGlobalProgression(p,[{week:1,session:0,dPlusM:null,dMinusM:null,eccentric:false,runWalk:false,source:'test',components:{bike:45,run:30,source:'test'}}]);expect(failed.contractPassed).toBe(false);
});
it('detects recovery intent violations without claiming a universal safety percentage',()=>{
 const p=plan([100,110]);p.weeklyQuotas={1:{weekType:'load'},2:{weekType:'recovery'}}as unknown as ParsedPlan['weeklyQuotas'];
 expect(auditGlobalProgression(p).issues.some(i=>i.code==='declared_recovery_not_lower'&&i.classification==='methodological')).toBe(true);
});
