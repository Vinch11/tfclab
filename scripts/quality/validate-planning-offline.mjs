// On demand only. Executes existing engine functions under offline test doubles.
// No generation service, scientific API, scheduling, merge or deployment.
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
const out=resolve(process.argv[2]??'/tmp/tfcl-global-offline');
execFileSync(process.execPath,['node_modules/vitest/vitest.mjs','run','src/qa/sports-plan-lab/__tests__','src/hooks/__tests__/useCloudData.persistence.test.ts','src/hooks/__tests__/useAITrainingPlan.objectiveCatalogue.test.ts','src/engines/plan/__tests__/taperQuota.crossDiscipline.test.ts','src/engines/plan/__tests__/recoveryQuota.crossDiscipline.test.ts'],{stdio:'inherit',env:{...process.env,TFCL_GLOBAL_QA_OUTPUT:out}});

const matrix=JSON.parse(readFileSync(resolve(out,'matrix.json'),'utf8'));
const group=rows=>({cases:rows.length,weeks:rows.reduce((n,r)=>n+r.weekly.length,0),
 mechanicalBlockedCases:rows.filter(r=>Object.keys(r.preparationIssues).some(k=>k.startsWith('preflight_'))).length,
 catalogueDiversityWarningCases:rows.filter(r=>r.preparationIssues.catalogue_week_diversity_limited).length,
 catalogueShortfallCases:rows.filter(r=>r.preparationIssues.catalogue_week_sport_shortfall).length,
 minimumDoseWarningCases:rows.filter(r=>r.preparationIssues.minimum_catalogue_dose_exceeds_budget).length,
 casesWithAnySignal:rows.filter(r=>Object.keys(r.preparationIssues).length).length,
 verdict:'NO-GO for automatic sporting approval; technical readiness is scoped per configuration'});
const families=Object.fromEntries(matrix.coverage.objectives.map(objective=>[objective,{
 ...group(matrix.rows.filter(r=>r.objective===objective)),
 ambitions:Object.fromEntries(matrix.coverage.ambitions.map(ambition=>{
 const rows=matrix.rows.filter(r=>r.objective===objective&&r.ambition===ambition);
 return [ambition,{...group(rows),effectiveAmbitions:[...new Set(rows.map(r=>r.effectiveAmbition))],
 technicalGoCases:rows.filter(r=>r.quotaPath==='deterministic_matrix'&&Object.keys(r.preparationIssues).length===0).length,
 constructionEvidence:objective==='StartToRun'?'existing_static_generator_12_weeks':'matching_complete_model_outputs_not_attested_for_these_configurations',
 deterministicSportsValidation:'see_existing_corpus_replay_and_negative_controls',scientificHumanReview:'required'}];
})),
 levels:Object.fromEntries(matrix.coverage.levels.map(level=>[level,group(matrix.rows.filter(r=>r.objective===objective&&r.level===level))]))
}]));
writeFileSync(resolve(out,'summary.json'),JSON.stringify({coverage:matrix.coverage,families,
 limitations:['Mechanical blockers count cases, not summed duplicate rule messages.','Catalogue capacity follows existing weekly caps; limited diversity remains separate and does not prove prescription feasibility.','Zero signals on dedicated trail/static routes is not a complete safety check.','No model called; no complete model output invented.','Native PDF and real database not exercised.']},null,2)+'\n');

execFileSync(process.execPath,['scripts/quality/classify-planning-residuals.mjs',out],{stdio:'inherit'});
