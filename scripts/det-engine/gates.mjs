export function compareEvidence(baseline,current){
 if(current.length!==600||new Set(current.map(r=>r.id)).size!==600)throw Error('COVERAGE_REGRESSION');
 return (baseline??[]).filter(old=>{
  const next=current.find(r=>r.id===old.id);
  return !next||(old.technicallyConstructed&&!next.technicallyConstructed)||(old.constraintsSatisfied&&!next.constraintsSatisfied)||
   next.issues.some(i=>['critical','error','blocking'].includes(i.severity)&&!old.issues.some(p=>p.code===i.code&&p.week===i.week&&p.severity===i.severity));
 }).map(r=>r.id);
}
export function checkLimits({iteration,elapsedMs,maxIterations,maxDurationMs,apiBudgetUsd}){
 if(apiBudgetUsd!==0)return 'paid_api_forbidden';
 if(iteration>maxIterations)return 'iteration_limit';
 if(elapsedMs>=maxDurationMs)return 'duration_limit';
 return null;
}
