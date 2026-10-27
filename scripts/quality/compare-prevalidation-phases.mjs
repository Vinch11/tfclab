// Compare existing synthetic runs. No network, model, repair or data mutation.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
const [beforeFile,afterFile,outDir]=process.argv.slice(2);
if(!beforeFile||!afterFile||!outDir)throw Error('Usage: compare-prevalidation-phases.mjs before/matrix.json after/matrix.json output');
const before=JSON.parse(readFileSync(beforeFile,'utf8')).rows,after=JSON.parse(readFileSync(afterFile,'utf8')).rows;
const known=JSON.parse(readFileSync('src/qa/sports-plan-lab/__tests__/catalogueCountingBaseline.json','utf8')).blockedIds;
const old=new Map(before.map(r=>[r.id,r]));
const blocked=r=>r.report.issues.filter(i=>i.severity==='blocking').map(i=>i.code);
const phaseConflict=r=>blocked(r).includes('window_phase_contract_conflict');
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const rows=after.map(row=>{
 const prev=old.get(row.id);if(!prev)throw Error(`MISSING_BASELINE:${row.id}`);
 const weeks=row.report.weeks.map((w,i)=>{
  const p=prev.report.weeks[i];if(p.week!==w.week)throw Error('WEEK_POSITION_CHANGED');
  return {week:w.week,before:p.phase,after:w.phase,expected:w.expectedPhase,
   quotaUnchanged:equal(p.quota,w.quota),budgetUnchanged:equal(p.volumeBudget,w.volumeBudget),weekTypeUnchanged:p.weekType===w.weekType};
 });
 return {id:row.id,objective:row.objective,ambition:row.ambition,format:row.format,before:prev.report.status,after:row.report.status,
  oldPhaseConflict:phaseConflict(prev),remainingPhaseConflict:phaseConflict(row),blockingCodes:[...new Set(blocked(row))],
  limiterOrderUnchanged:equal(prev.report.limiterPriorities,row.report.limiterPriorities),weeks};
});
const count=list=>Object.fromEntries([...new Set(list)].sort().map(k=>[k,list.filter(v=>v===k).length]));
const summary={beforeCommit:'3d65f92fb241f30fa96a80d9c4c963ba4a3bb85a',cases:rows.length,before:count(before.map(r=>r.report.status)),after:count(after.map(r=>r.report.status)),
 oldPhaseConflictCases:rows.filter(r=>r.oldPhaseConflict).length,remainingPhaseConflictCases:rows.filter(r=>r.remainingPhaseConflict).length,
 phaseConflictCohortAfter:count(rows.filter(r=>r.oldPhaseConflict).map(r=>r.after)),
 additionalPhaseConflictCases:rows.filter(r=>r.oldPhaseConflict&&!known.includes(r.id)).length,
 additionalPhaseConflictCohortAfter:count(rows.filter(r=>r.oldPhaseConflict&&!known.includes(r.id)).map(r=>r.after)),
 historical58Retained:known.filter(id=>rows.find(r=>r.id===id)?.after==='blocked').length,
 changedQuotaWeeks:rows.flatMap(r=>r.weeks).filter(w=>!w.quotaUnchanged).length,
 changedBudgetWeeks:rows.flatMap(r=>r.weeks).filter(w=>!w.budgetUnchanged).length,
 changedWeekTypes:rows.flatMap(r=>r.weeks).filter(w=>!w.weekTypeUnchanged).length,
 changedLimiterOrders:rows.filter(r=>!r.limiterOrderUnchanged).length,
 changedPhaseWeeks:rows.flatMap(r=>r.weeks).filter(w=>w.before!==w.after).length};
mkdirSync(outDir,{recursive:true});writeFileSync(resolve(outDir,'phase-comparison.json'),JSON.stringify({summary,rows},null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
if(rows.length!==600||summary.historical58Retained!==58||summary.remainingPhaseConflictCases||summary.changedQuotaWeeks||summary.changedBudgetWeeks||summary.changedWeekTypes||summary.changedLimiterOrders)throw Error('PHASE_REGRESSION');
