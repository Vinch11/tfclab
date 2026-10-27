import { balanced703,balancedIronman,marathonWithHalf,valid10kNoSwim,valid5kNoSwim,intenseRecoveryWeek,noSwim703 } from "./fixtures";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import { describe,it,expect,vi } from 'vitest';
import { mkdirSync,writeFileSync } from 'node:fs';
import archived from '@/lib/plan/qa/__tests__/fixtures/2026-10-15_B-5K-BEGINNER_run1.json';
import { jsonPlanToParsedPlan } from '@/lib/plan/jsonPlanToParsedPlan';
import type { MergedPlan } from '@/lib/plan/mergePlanChunks';
import { buildStartToRunTemplatePlan } from '@/lib/startToRunTemplate';
import { postProcessParsedPlan } from '@/engines/plan/computePlan';
import { validatePlan } from '@/engines/plan/planValidator';
import { restoreStructuredPlan } from '@/lib/plan/restoreStructuredPlan';
import { buildMarkdownFromPlan } from '@/pages/AITrainingPlanPage';
import { exportAIPlanToPDF } from '@/lib/aiPlanPDFExport';
import type { PlanGenerationConfig } from '@/engines/plan/types';
vi.mock('@/lib/openPrintableHTML',()=>({openPrintableHTML:vi.fn()}));
import { openPrintableHTML } from '@/lib/openPrintableHTML';

describe('existing complete plans through current transformations and exports',()=>{
 it('preserves edits through simulated save/reload, without converting legacy failures to successes',()=>{
  const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(()=>{throw new Error('offline_replay_network_forbidden');});
  const before=JSON.stringify(archived);
  const cases=[{name:'recorded-5K-20261015',origin:'archived_model_output',objective:'5K',plan:jsonPlanToParsedPlan(structuredClone(archived.output.mergedPlan) as unknown as MergedPlan),config:archived.input.planConfig as unknown as PlanGenerationConfig},
   ...(['full','light','none'] as const).map(strengthDose=>({name:`StartToRun-${strengthDose}`,origin:'existing_static_generator',objective:'StartToRun',plan:buildStartToRunTemplatePlan({strengthDose}),config:{objective:'StartToRun',weeksAvailable:12,mode:'ai'} as PlanGenerationConfig}))];
  const controls = [
    ['authored-703',balanced703,'703'],['authored-IM',balancedIronman,'IM'],
    ['authored-marathon-half',marathonWithHalf,'Marathon'],['authored-10K',valid10kNoSwim,'10K'],
    ['authored-5K',valid5kNoSwim,'5K'],['negative-recovery',intenseRecoveryWeek,'10K'],['negative-swim',noSwim703,'703'],
  ] as const;
  for(const [name,raw,objective] of controls) cases.push({name,origin:'existing_authored_control',objective,
    plan:{...structuredClone(raw),phases:[]} as unknown as ParsedPlan,
    config:{objective,weeksAvailable:raw.totalWeeks,mode:'ai'} as PlanGenerationConfig});
  const results=cases.map(c=>{
   const transformed=c.origin==='archived_model_output'?postProcessParsedPlan(structuredClone(c.plan),c.config).plan:structuredClone(c.plan);
   expect(transformed.weeks).toHaveLength(c.plan.weeks.length);
   const validation=validatePlan(transformed,c.objective);
   const editable=transformed.weeks.flatMap(w=>w.sessions).find(s=>!s.isRest)!;
   // A local title edit does not invent missing historical physiological fields.
   editable.title=`${editable.title} — édition offline`;
   const disk=JSON.stringify(transformed),reopened=restoreStructuredPlan(JSON.parse(disk))!;
   expect(reopened).toEqual(transformed);
   expect(buildMarkdownFromPlan(reopened)).toBe(buildMarkdownFromPlan(transformed));
   expect(buildMarkdownFromPlan(reopened)).toContain('édition offline');
   exportAIPlanToPDF(reopened,'Synthetic QA',new Date('2026-10-26T12:00:00Z'));
   const html=vi.mocked(openPrintableHTML).mock.calls.at(-1)![0];
   expect(html).toContain('édition offline');
   expect(validatePlan(reopened,c.objective)).toEqual(validatePlan(transformed,c.objective));
   return {case:c.name,origin:c.origin,weeks:reopened.weeks.length,validationErrors:validation.issues.filter(i=>i.severity==='error').length,validationWarnings:validation.issues.filter(i=>i.severity==='warning').length,rules:[...new Set(validation.issues.map(i=>i.rule))],stages:['adapter_or_static_generator',...(c.origin==='archived_model_output'?['postprocess']:[]),'validation','local_edit','simulated_json_persistence','reload','markdown','pdf_html'],scientificValidation:'not_attested',nativePDF:'not_exercised'};
  });
  expect(results[0].validationErrors).toBeGreaterThan(0); // The real archived defective plan must remain rejected.
  expect(JSON.stringify(archived)).toBe(before);
  expect(fetch).not.toHaveBeenCalled();fetch.mockRestore();
  if(process.env.TFCL_GLOBAL_QA_OUTPUT){mkdirSync(process.env.TFCL_GLOBAL_QA_OUTPUT,{recursive:true});writeFileSync(`${process.env.TFCL_GLOBAL_QA_OUTPUT}/replay.json`,JSON.stringify(results,null,2));}
 });
});

describe('a complete running archive cannot certify a different objective',()=>{
 it.each(['Sprint','Olympic','703','IM'])('%s rejects the same complete 5K archive for missing required disciplines',objective=>{
  const plan=jsonPlanToParsedPlan(structuredClone(archived.output.mergedPlan) as unknown as MergedPlan);
  expect(validatePlan(plan,objective).issues).toContainEqual(expect.objectContaining({rule:'objective_sport_conflict',severity:'error'}));
 });
 it.each(['TrailShort','TrailMountain','TrailUltra'])('%s keeps the missing elevation evidence visible on the complete running archive',objective=>{
  const plan=jsonPlanToParsedPlan(structuredClone(archived.output.mergedPlan) as unknown as MergedPlan);
  expect(validatePlan(plan,objective).issues.some(i=>i.rule==='trail_dplus_presence')).toBe(true);
 });
});
