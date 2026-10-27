import {it,expect} from 'vitest';import {readFileSync,writeFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import type {ParsedPlan} from '@/lib/aiPlanParser';
import {brickDisciplineEvidence,reviewIronmanContinuity} from './v3-ironman-review';
it('does not credit running merely because a catalogue session is a brick',()=>{
 expect(brickDisciplineEvidence('V3_BRICK_SWIM_BIKE')).toMatchObject({swim:true,bike:true,run:false});
 expect(brickDisciplineEvidence('BRICK_STAGE1_INTRO')).toMatchObject({swim:false,bike:true,run:true});
 expect(brickDisciplineEvidence('UNKNOWN')).toMatchObject({swim:false,bike:false,run:false,source:'unknown_catalogue'});
});
it.skipIf(!process.env.TFCL_DET_V3_IM_REVIEW_OUT)('audits physical presence across all constructed Ironman model candidates, retaining every week',()=>{
 const rows=JSON.parse(gunzipSync(readFileSync(process.env.TFCL_DET_V3_IM_REVIEW_INPUT!)).toString()) as Array<{id:string;model:string;candidate?:ParsedPlan}>;
 const reviews=rows.filter(r=>r.candidate).map(r=>({id:r.id,model:r.model,...reviewIronmanContinuity(r.candidate!)}));
 expect(reviews.length).toBeGreaterThan(0);expect(reviews.every(r=>r.weeks.length>0)).toBe(true);
 writeFileSync(process.env.TFCL_DET_V3_IM_REVIEW_OUT!,JSON.stringify({version:'det-v3-physical-continuity-1',candidates:reviews.length,
  byModel:[...new Set(rows.map(r=>r.model))].map(model=>{const r=reviews.filter(r=>r.model===model);return {model,candidates:r.length,candidatesWithAbsentDiscipline:r.filter(r=>r.absent.length).length,candidatesWithUnknownPresence:r.filter(r=>r.unknown.length).length};}),reviews},null,2));
});
