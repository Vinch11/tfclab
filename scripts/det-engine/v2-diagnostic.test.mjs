import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {analyzeRows,classifyCase,renderDashboard} from './v2-diagnostic.mjs';
const row=(extra={})=>({id:'synthetic',objective:'10K',ambition:'finisher',level:'light',format:'continuous',issues:[],status:'refused',technicallyConstructed:false,constraintsSatisfied:false,...extra});
test('resource exhaustion is unknown, never impossible or catalogue insufficiency',()=>{
 const diagnosed=classifyCase(row({reason:'search_budget_exhausted'}));
 assert.equal(diagnosed.disposition,'inconclusive');assert.equal(diagnosed.globalInfeasibilityProven,false);
 assert.equal(diagnosed.rootCause.scope,'unknown');
});
test('catalogue-domain and budget contradictions are only local proofs',()=>{
 for(const reason of ['empty_catalogue_domain_week_1','minimum_catalogue_dose_exceeds_budget_week_1','no_catalogue_assignment_week_2']){
  const d=classifyCase(row({reason}));assert.equal(d.rootCause.scope,'fixed_pool_and_layout_only');
  assert.equal(d.globalInfeasibilityProven,false);assert.equal(d.disposition,'rejected_current_contract');
 }
});
test('unsupported sport routes and static adapters are separated from software failure',()=>{
 for(const reason of ['dedicated_route_without_deterministic_quota','static_template_configuration_requires_review']){
  const d=classifyCase(row({reason}));assert.equal(d.disposition,'unsupported');assert.equal(d.category,'sport_specificity');
 }
});
test('a valid constructed candidate retains warnings without inventing a failure category',()=>{
 const d=classifyCase(row({technicallyConstructed:true,constraintsSatisfied:true,issues:[{code:'coach_initial_load_unverified',severity:'warning'}]}));
 assert.equal(d.disposition,'passes_executed_controls');assert.equal(d.warningCount,1);assert.equal(d.category,null);
});
test('software metrics cannot absorb sporting errors or certify all rules',()=>{
 const report=analyzeRows([row({technicallyConstructed:true,issues:[{code:'polarization',severity:'error'}]})]);
 assert.equal(report.counts.technicalWithoutRecordedStructuralBlocker,1);
 assert.equal(report.counts.sportingWithoutRecordedBlockingError,0);
 assert.equal(report.counts.withoutRecordedBlockingError,0);
 assert.equal(report.counts.scientificRelevance,'not_attested');
});
test('duplicate IDs and malformed evidence cannot bias denominators',()=>{
 assert.throws(()=>analyzeRows([row(),row()]),/DUPLICATE/);
 assert.throws(()=>classifyCase({id:'x'}),/INVALID_EVIDENCE_ROW/);
});
test('the committed 600-case baseline is verified rather than inferred from prose',()=>{
 const rows=JSON.parse(gunzipSync(readFileSync('docs/det-engine/evidence-final/matrix.json.gz')).toString('utf8'));
 const report=analyzeRows(rows,{version:'f933ced243d15bd759a0704b88aa140ac9b4f4d9'});
 assert.equal(report.counts.configurations,600);assert.equal(report.counts.assembled,167);
 assert.equal(report.counts.withoutRecordedBlockingError,7);assert.equal(report.counts.constructedNonconformant,160);
 assert.equal(report.counts.refused,433);assert.equal(report.counts.unsupported,200);
 assert.equal(report.counts.inconclusive,29);assert.equal(report.counts.globalInfeasibilityProven,0);
 assert.equal(report.rootCauseCounts.empty_filtered_slot_domain,92);
 assert.equal(report.rootCauseCounts.fixed_slot_minimum_dose_exceeds_ceiling,38);
 assert.equal(report.rootCauseCounts.fixed_contract_prevalidation_conflict,58);
 assert.equal(report.rootCauseCounts.no_assignment_in_current_search_space,16);
 assert.equal(report.dimensions.sportFamily.find(g=>g.key==='trail').assembled,0);
 assert.equal(report.dimensions.objectiveAmbition.length,75);
 assert.equal(report.dimensions.level.length,4);
 assert.equal(Object.values(report.counts.warnings).reduce((a,b)=>a+b,0),rows.flatMap(r=>r.issues.filter(i=>i.severity==='warning')).length);
 assert.match(renderDashboard(report),/433 refus/);
 assert.match(renderDashboard(report),/167 plans assemblés/);
 assert.deepEqual(analyzeRows(rows),analyzeRows(rows));
});
test('V2 repairs and recorded applicability are counted without conflating context and rule execution',()=>{
 const rows=[row({id:'constructed',technicallyConstructed:true,constraintsSatisfied:true,effectiveAmbition:'age_group',physiologicalContext:{version:1},
  executedControls:['full_validator'],repairs:[
   {accepted:true,rule:'replacement',defect:['polarization'],beforeCritical:{'polarization:1':3},afterCritical:{'polarization:1':1}},
   {accepted:false,rule:'replacement',defect:['polarization'],beforeCritical:{'polarization:1':1},afterCritical:{'polarization:1':2}},
  ],coverage:{conditional:{limiterKeys:'executed',physiologicalResponse:'not_implemented',loadHistory:'not_applicable'},sportsAudit:{controls:[
   {id:'calendar',execution:'executed',result:'pass',classification:'contract'},
   {id:'progression',execution:'executed',result:'unknown',classification:'expert_review'},
  ]}}}),row({id:'refused',reason:'search_budget_exhausted',executedControls:[],repairs:[],coverage:{conditional:{limiterKeys:'executed'},sportsAudit:{controls:[
   {id:'calendar',execution:'not_implemented',result:'unknown',classification:'contract'},
   {id:'trail',execution:'not_applicable',result:'not_applicable',classification:'expert_review'},
  ]}}})];
 const report=analyzeRows(rows,{version:'det-v2',controls:[{id:'full_validator',version:'2'}]});
 assert.deepEqual({attempts:report.counts.repairs.attempts,accepted:report.counts.repairs.accepted,rejected:report.counts.repairs.rejected,corrected:report.counts.repairs.corrected},{attempts:2,accepted:1,rejected:1,corrected:2});
 const frequencies=report.counts.controls.controlFrequencies;
 assert.deepEqual(frequencies.find(c=>c.id==='full_validator').statuses,{executed:1,not_executed:1});
 assert.deepEqual(frequencies.find(c=>c.id==='limiterKeys').statuses,{executed:2});
 assert.equal(frequencies.find(c=>c.id==='limiterKeys').namespace,'conditional_context');
 assert.deepEqual(frequencies.find(c=>c.id==='calendar').statuses,{executed:1,not_implemented:1});
 assert.deepEqual(report.counts.controls.physicalContractAudit.results,{pass:1});
 assert.equal(report.counts.controls.technicalSchema.execution,'not_implemented');
 assert.equal(report.counts.controls.generalSportingRelevance.result,'expert_review_required');
 assert.equal(report.caseDiagnostics[0].effectiveAmbition,'age_group');
 assert.equal(report.caseDiagnostics[0].physiologicalContextRecorded,true);
 assert.match(renderDashboard(report),/2 tentatives ; 1 acceptées ; 1 rejetées/);
 assert.match(renderDashboard(report),/conditional_context décrivent le contexte fourni/);
});
test('legacy evidence never fabricates zero repairs or recorded applicability',()=>{
 const report=analyzeRows([row({reason:'search_budget_exhausted'})]);
 assert.equal(report.counts.repairs.attempts,null);assert.equal(report.counts.repairs.accepted,null);
 assert.equal(report.counts.controls.unrecordedCases,1);assert.equal(report.caseDiagnostics[0].controlEvidence,null);
 assert.equal(report.caseDiagnostics[0].effectiveAmbition,null);assert.equal(report.caseDiagnostics[0].physiologicalContextRecorded,false);
 assert.equal(report.counts.controls.controlFrequencies.length,0);
});
test('the committed V2 cycle records measurable repair transitions',()=>{
 const evidence=JSON.parse(gunzipSync(readFileSync('docs/det-engine/v2/cycles/02/candidate.json.gz')).toString('utf8'));
 const report=analyzeRows(evidence.rows,{version:evidence.version,controls:evidence.controls});
 assert.equal(report.counts.configurations,600);assert.equal(report.counts.assembled,167);
 assert.equal(report.counts.withoutRecordedBlockingError,11);
 assert.equal(report.counts.repairs.attempts,2417);assert.equal(report.counts.repairs.accepted,81);
 assert.equal(report.counts.repairs.rejected,2336);assert.equal(report.counts.repairs.corrected,85);
 assert.equal(report.counts.controls.recordedCases,600);
 assert.equal(report.controls.length,evidence.controls.length);
 assert.equal(report.counts.controls.controlFrequencies.find(c=>c.namespace==='aggregate_validator'&&c.id==='weekly_quotas').statuses.executed,167);
 assert.deepEqual(analyzeRows(evidence.rows,{controls:evidence.controls}),analyzeRows(evidence.rows,{controls:evidence.controls}));
});
