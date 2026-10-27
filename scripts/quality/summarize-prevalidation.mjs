// Offline evidence only. Reads synthetic results; never calls a service.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const input=resolve(process.argv[2]??'/tmp/tfcl-prevalidation');
const output=resolve(process.argv[3]??input);mkdirSync(output,{recursive:true});
const {rows}=JSON.parse(readFileSync(resolve(input,'matrix.json'),'utf8'));
const baseline=JSON.parse(readFileSync('src/qa/sports-plan-lab/__tests__/catalogueCountingBaseline.json','utf8'));
const known=new Set(baseline.blockedIds);
const count=list=>Object.fromEntries([...new Set(list)].sort().map(k=>[k,list.filter(v=>v===k).length]));
const codes=(row,severity)=>[...new Set(row.report.issues.filter(i=>i.severity===severity).map(i=>i.code))].sort();
const group=list=>({cases:list.length,status:count(list.map(r=>r.report.status)),knownHistoricalRefusals:list.filter(r=>known.has(r.id)&&r.report.status==='blocked').length,
 blockingCasesByCode:count(list.flatMap(r=>codes(r,'blocking'))),warningCasesByCode:count(list.flatMap(r=>codes(r,'warning')))});
const summary={referenceCommit:'a8bd971c98c4af0eb6af80202336e27c146a1ac0',...group(rows),
 known58Retained:rows.filter(r=>known.has(r.id)&&r.report.status==='blocked').length,
 additionalBlocked:rows.filter(r=>!known.has(r.id)&&r.report.status==='blocked').length,
 additionalBlockingCodes:count(rows.filter(r=>!known.has(r.id)&&r.report.status==='blocked').flatMap(r=>codes(r,'blocking'))),
 historicalDiversityReplay:{contracts:11,result:'warning only, independently replayed under the exact historical phases and minima by the tests; not forced into different actual window contexts'},
 objectives:Object.fromEntries([...new Set(rows.map(r=>r.objective))].sort().map(o=>[o,group(rows.filter(r=>r.objective===o))])),
 byObjectiveFormatAmbition:Object.fromEntries([...new Set(rows.map(r=>`${r.objective}/${r.format}/${r.ambition}`))].sort().map(k=>[k,group(rows.filter(r=>`${r.objective}/${r.format}/${r.ambition}`===k))])),
 limitations:['Admissible means the evaluated configuration contracts, not model output or sporting/scientific approval.','Trail quota coverage is partial and yields review, never fabricated road quotas.','StartToRun has an existing static route; these cases do not authorize paid generation.','A custom-capable catalogue shortage or missing duration is not alone a mechanical impossibility.','Exact physiological intent is not always encoded per slot; existing role flags and admissible catalogue families are reported without inventing new constraints.','Load unknown remains a warning; no dose or frequency is increased.','No model/network or athlete database used by this evidence run.']};
if(rows.length!==600||summary.known58Retained!==58)throw Error('INCOMPLETE_PREVALIDATION_EVIDENCE');
writeFileSync(resolve(output,'summary.json'),JSON.stringify(summary,null,2)+'\n');
const csv=lines=>lines.map(line=>line.map(value=>`"${String(value??'').replaceAll('"','""')}"`).join(',')).join('\n')+'\n';
writeFileSync(resolve(output,'cases.csv'),csv([['case','objective','level','requested_ambition','effective_ambition','format','load','status','blocking_codes','warning_codes'],...rows.map(r=>[r.id,r.objective,r.level,r.ambition,r.effectiveAmbition,r.format,r.load,r.report.status,JSON.stringify(codes(r,'blocking')),JSON.stringify(codes(r,'warning'))])]));
const pools=new Map();
const weeks=rows.flatMap(r=>r.report.weeks.map(w=>{
 const ids=w.eligible.map(e=>e.id).sort();const pool=createHash('sha256').update(JSON.stringify(ids)).digest('hex');pools.set(pool,ids);
 return [r.id,w.week,w.cycleWeek??'',w.phase,w.expectedPhase??'',w.weekType,JSON.stringify(w.quota??null),JSON.stringify(w.volumeBudget??null),JSON.stringify(w.availability),w.minimumStructuredMinutes,w.minimumCatalogueMinutes,ids.length,pool,JSON.stringify(count(w.eligible.map(e=>e.intentFamily)))];
}));
writeFileSync(resolve(output,'weeks.csv'),csv([['case','plan_week','cycle_week','phase','prompt_week_phase','week_type','quota','volume_budget','availability','minimum_structured_minutes','minimum_catalogue_minutes','eligible_count','pool_ids_sha256','eligible_intents_counts'],...weeks]));
writeFileSync(resolve(output,'pools.jsonl'),[...pools].map(([sha256,ids])=>JSON.stringify({sha256,ids})).join('\n')+'\n');
let md='# Prévalidation : résultats par objectif, format et ambition\n\nContrats évalués, pas plans générés. Les avertissements demandent une revue coach ; ils ne sont pas transformés en contradictions. Les voies dédiées restent partiellement évaluables. Les familles et ambitions sont celles de TFCLab.\n\n| Objectif / format / ambition | Cas | Admissible | Revue coach | Bloqué |\n|---|---:|---:|---:|---:|\n';
for(const [key,value] of Object.entries(summary.byObjectiveFormatAmbition))md+=`| ${key} | ${value.cases} | ${value.status.admissible??0} | ${value.status.coach_review??0} | ${value.status.blocked??0} |\n`;
md+=`\nLes ${summary.known58Retained} refus historiques restent présents. ${summary.additionalBlocked} configuration(s) supplémentaire(s) sont bloquées : consulter leurs codes dans cases.csv. Les phases des fenêtres sont des tranches du calendrier complet existant, jamais une extension arbitraire de leur phase dominante. La qualification sportive et la revue des premières prescriptions restent nécessaires.\n`;
writeFileSync(resolve(output,'BY_OBJECTIVE_AMBITION.md'),md);
console.log(JSON.stringify({cases:summary.cases,status:summary.status,known58Retained:summary.known58Retained,additionalBlocked:summary.additionalBlocked,additionalBlockingCodes:summary.additionalBlockingCodes,uniquePools:pools.size},null,2));
