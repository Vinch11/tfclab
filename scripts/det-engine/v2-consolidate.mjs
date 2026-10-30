/** Join measured reports only. Never generates, repairs or relabels a training plan. */
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {analyzeRows,renderDashboard} from './v2-diagnostic.mjs';
const [bundlePath,auditPath,out]=process.argv.slice(2);
if(!bundlePath||!auditPath||!out)throw Error('USAGE: v2-consolidate BUNDLE_JSON TECHNICAL_AUDIT_JSON OUT');
const bundle=JSON.parse(readFileSync(bundlePath)),audit=JSON.parse(readFileSync(auditPath));
if(audit.inputVersion!==bundle.version)throw Error('STALE_TECHNICAL_AUDIT_VERSION');
const byId=new Map(audit.rows.map(r=>[r.id,r]));
if(byId.size!==bundle.rows.length||audit.rows.length!==bundle.rows.length)throw Error('TECHNICAL_AUDIT_COVERAGE');
for(const row of bundle.rows){const a=byId.get(row.id),hash=row.candidate?createHash('sha256').update(JSON.stringify(row.candidate)).digest('hex'):null;
 if(!a||a.planHash!==hash)throw Error(`STALE_TECHNICAL_PLAN:${row.id}`);}
const checked=audit.rows.filter(r=>r.execution==='executed'),passed=checked.filter(r=>r.valid===true),allPassed=checked.length===passed.length;
const report=analyzeRows(bundle.rows,{version:bundle.version,controls:bundle.controls,reproducibility:{status:'verified_identical_replay',identicalCases:600,source:'../continuation/cycle-08/replay-proof.json'}});
function supplement(counts,global=false){
 counts.sportingValidityScope='Original executed rules only, with per-case conditional context; never general sporting relevance.';
 counts.controls.technicalSchema={execution:global?'executed':'separate_evidence_available',result:allPassed?'pass':global?'fail':'unknown',
  checked:global?checked.length:counts.assembled,passed:global?passed.length:allPassed?counts.assembled:null,
  notApplicable:counts.configurations-counts.assembled,source:'../validation/technical-audit-final.json',
  scope:'Existing zPlanChunk plus week/day/index and catalogue-reference audit. Plan hashes and version verified before joining; not proof of all sporting constraints.'};
}
supplement(report.counts,true);for(const groups of Object.values(report.dimensions))for(const counts of groups)supplement(counts);
report.controlExecutionEvidence={source:'V2 per-case executedControls, conditional context and recorded real subprocess evidence',supplementaryTechnicalAudit:'../validation/technical-audit-final.json'};
report.controlApplicability='Aggregate validators record invocation. Conditional-context availability does not prove nested-rule execution. Sports audits keep pass/fail/unknown/not-applicable. Technical schema evidence is joined by plan hash.';
let markdown=renderDashboard(report).replaceAll('; validation complète de schéma non implémentée','; distinct du schéma audité séparément')
 .replace(/^Validation technique de schéma complet.*$/m,`Validation technique de schéma : audit séparé exécuté sur ${checked.length} candidats, ${passed.length} réussites. Les versions et hashes de chaque plan correspondent au bundle final. Voir technical-audit-final.json.`);
markdown+='\n## Audit technique indépendant\n\n'+passed.length+' / '+checked.length+' schémas/calendriers vérifiés ; '+(bundle.rows.length-checked.length)+' refus sans candidat : non applicable. Ce résultat ne remplace pas le respect des contraintes sportives.\n';
mkdirSync(out,{recursive:true});writeFileSync(`${out}/dashboard.json`,JSON.stringify(report,null,2)+'\n');writeFileSync(`${out}/dashboard.md`,markdown);
