import {describe,expect,it,vi} from 'vitest';
import {generateDetPlanFromPageInput} from '@/lib/plan/detEngineRun';
import {inputFor} from '../../../../scripts/quality/det/form-fixture';
import {parseV3PlanProposal} from '../v3ProposalLocalSave';
import {previewDetGuidance} from '../nolioPreview';
import type {V3PlanProposal} from '../appPlanningV3Proposal';
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
const ten={objective:'10K', weeks:8, hours:6, sessions:4};
const trail={objective:'TrailShort', weeks:12, hours:3, distanceKm:8, elevationM:150};

describe('coach decisions at the application entry point',()=>{
  it('routes Start to Run to its own protocol before requesting a diagnostic',async()=>{
    const input=inputFor({...ten,objective:'StartToRun'},'untrained','finisher');
    await expect(generateDetPlanFromPageInput({...input,diagnostic:undefined as never})).rejects.toMatchObject({decision:{kind:'outside_det',fields:[]}});
  });
  it('keeps an evaluable profile with no deficit unranked through weekly plans and watch translation',async()=>{
    const input=inputFor(ten,'trained','finisher');
    const plan=await generateDetPlanFromPageInput(input);
    const proposal=(plan as typeof plan & {_detSourceProposal:V3PlanProposal})._detSourceProposal;
    expect(proposal.weeks).toHaveLength(8);
    expect(proposal.limiterOrder).toEqual([]);
    expect(plan.diagnostic).toContain('Aucun déficit dominant');
    expect(proposal.checks.some(c=>c.code==='ranked_limiter_work'||c.code==='primary_prescription')).toBe(false);
    const guided=await previewDetGuidance(plan);
    expect(guided.precheck.complete).toBe(true);
    expect(JSON.stringify(guided.ops)).toContain('"/km"');
  });
  it('names the critical missing measurement and preserves exclusions and athlete identity',async()=>{
    const sparse=inputFor(ten,'trained','finisher');
    sparse.diagnostic.limiter={...sparse.diagnostic.limiter,insufficientData:true,missingMetrics:['VMA','TTE',"W'"]};
    await expect(generateDetPlanFromPageInput(sparse)).rejects.toMatchObject({decision:{kind:'missing_data',fields:['diagnostic.VMA','diagnostic.TTE']}});
    const ranked=inputFor(ten,'trained','competitor');
    ranked.config.identifiedLimitersRaw=[];
    await expect(generateDetPlanFromPageInput(ranked)).rejects.toMatchObject({decision:{kind:'incompatible',fields:['identifiedLimitersRaw']}});
    await expect(generateDetPlanFromPageInput({...ranked,athleteId:'OTHER'})).rejects.toMatchObject({decision:{kind:'incompatible'}});
  });
  it('distinguishes an absent assessment and an explicit exclusion of a required sport',async()=>{
    const input=inputFor(ten,'trained','finisher');
    await expect(generateDetPlanFromPageInput({...input,diagnostic:undefined as never})).rejects.toMatchObject({decision:{kind:'missing_data',fields:['diagnostic']}});
    await expect(generateDetPlanFromPageInput({...input,config:{...input.config,constraints:'Course à pied interdite'}})).rejects.toMatchObject({decision:{kind:'incompatible',fields:['objective','constraints']}});
  });
  it('asks for absent trail history and applies an intentionally reduced future ceiling',async()=>{
    const withVolume=inputFor(trail,'untrained','finisher',[],{recentWeeklyHours:'3',recentWeeksCount:'4'});
    const missing=inputFor(trail,'untrained','finisher');
    const durations={recentMinutes:50,peakMinutes:75};
    await expect(generateDetPlanFromPageInput({...missing,trailLongRunLimits:durations})).rejects.toMatchObject({decision:{kind:'missing_data',fields:['loadHistory.recentWeeklyHours']}});
    await expect(generateDetPlanFromPageInput({...withVolume,trailLongRunLimits:{recentMinutes:50} as typeof durations})).rejects.toMatchObject({decision:{kind:'missing_data',fields:['trailLongRunLimits.peakMinutes']}});
    await expect(generateDetPlanFromPageInput({...withVolume,trailLongRunLimits:{...durations,peakMinutes:0}})).rejects.toMatchObject({decision:{kind:'incompatible',fields:['objective','trailLongRunLimits.peakMinutes']}});
    await expect(generateDetPlanFromPageInput({...withVolume,trailLongRunLimits:{...durations,recentMinutes:0}})).rejects.toMatchObject({decision:{kind:'engine_limit'}});
    const stopped={...withVolume,config:{...withVolume.config,loadHistory:{recentWeeklyHours:0,recentWeeksCount:4}}};
    await expect(generateDetPlanFromPageInput({...stopped,trailLongRunLimits:durations})).rejects.toMatchObject({decision:{kind:'engine_limit'}});
    const reduced={recentMinutes:95,peakMinutes:75};
    const plan=await generateDetPlanFromPageInput({...withVolume,trailLongRunLimits:reduced});
    const proposal=(plan as typeof plan & {_detSourceProposal:V3PlanProposal})._detSourceProposal;
    expect(parseV3PlanProposal(JSON.parse(JSON.stringify(proposal))).trailLongRunLimits).toEqual(reduced);
    expect(Math.max(...proposal.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions.filter(s=>s.sport==='run' && s.role!=='race').map(s=>s.knownMinutes))))).toBeLessThanOrEqual(75);
  });
});
