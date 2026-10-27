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
