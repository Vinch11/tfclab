import {describe,expect,it,vi} from 'vitest';
import {inputFor} from '../../../../scripts/quality/det/form-fixture';
import {generateDetPlanFromPageInput} from '@/lib/plan/detEngineRun';
import type {V3PlanProposal} from '../appPlanningV3Proposal';
import type {TrailGuidanceReview} from '../trailGuidance';
import {previewDetGuidance} from '../nolioPreview';
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));

describe('personal terrain effort in the exported workout',()=>{
  it.each([
    ['TrailShort',12,7,30,1000],['TrailMountain',16,9,55,3000],['TrailUltra',20,12,90,4500],
  ] as const)('keeps the source blocks and passes only explicitly reviewed RPE for %s',async(objective,weeks,hours,distanceKm,elevationM)=>{
    const input=inputFor({objective,weeks,hours,distanceKm,elevationM},'trained','competitor');
    const original=await generateDetPlanFromPageInput(input);
    const proposal=(original as typeof original & {_detSourceProposal:V3PlanProposal})._detSourceProposal;
    const pieces=proposal.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions.flatMap(s=>s.components))).filter(c=>c.sport==='run');
    const sources=[...new Map(pieces.map(c=>[c.sourceId,c])).values()];
    const review:TrailGuidanceReview={planningInputFingerprint:proposal.planningInputFingerprint,entries:sources.map(c=>({
      athleteId:input.athleteId,sourceId:c.sourceId,sourceFingerprint:c.sourceFingerprint,
      fieldReviewReference:'SORTIE_SYNTHETIQUE',terrainContextId:'SEGMENT_SYNTHETIQUE',coachConfirmsFieldEffortReview:true,
      domainRpe:{recovery:[1,2],moderate_lt1:[3,4],sub_threshold:[5,6],mlss:[7,7],vo2max:[8,9]},
    }))};
    const before=await previewDetGuidance(original);
    expect(before.precheck.complete).toBe(false);
    expect(before.precheck.rows.some(r=>r.reason?.includes('run_terrain_effort_review_required'))).toBe(true);
    const guided=await generateDetPlanFromPageInput({...input,trailGuidanceReview:review});
    const after=(guided as typeof guided & {_detSourceProposal:V3PlanProposal})._detSourceProposal;
    expect(after.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions.flatMap(s=>s.components))).filter(c=>c.sport==='run')
      .map(c=>[c.sourceId,c.blocks])).toEqual(pieces.map(c=>[c.sourceId,c.blocks]));
    const full=await previewDetGuidance(guided);
    expect(full.precheck.complete,JSON.stringify(full.precheck.rows.filter(r=>r.status==='refused').slice(0,2))).toBe(true);
    const runRow=full.precheck.rows.find(r=>r.sport==='run'&&r.status==='operation')!;
    const one=await previewDetGuidance(guided,{kind:'sessions',keys:[runRow.sessionKey]});
    expect(one.ops[0].bodySha256).toBe(full.ops.find(o=>o.sessionKey===runRow.sessionKey)?.bodySha256);
    expect(JSON.stringify(one.ops[0].body)).toContain('"rpe"');
    expect(JSON.stringify(one.ops[0].body)).not.toContain('"/km"');
    const last=await previewDetGuidance(guided,{kind:'weeks',from:weeks,to:weeks});
    expect(last.precheck.complete).toBe(true);
    if(objective==='TrailShort'){
      const wrong=structuredClone(review);wrong.entries[0].athleteId='ANOTHER';
      await expect(generateDetPlanFromPageInput({...input,trailGuidanceReview:wrong})).rejects.toMatchObject({decision:{kind:'incompatible'}});
      const incomplete=structuredClone(review);incomplete.entries[0].domainRpe={};
      await expect(generateDetPlanFromPageInput({...input,trailGuidanceReview:incomplete})).rejects.toMatchObject({decision:{kind:'missing_data'}});
    }
  },120000);
});
