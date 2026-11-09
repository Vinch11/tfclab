import type { PlanPrevalidation, PrevalidationIssue } from '../../../supabase/functions/_shared/planPrevalidation';
export interface ContractWindow { from: number; to: number; objective?: string; report: PlanPrevalidation; }
export function mergeWindowEvidence(global:PlanPrevalidation, window:ContractWindow):PlanPrevalidation {
  const issues:PrevalidationIssue[]=window.report.issues.map(i=>({...i,week:i.week>0?window.from+i.week-1:0}));
  const combined=[...new Map([...global.issues,...issues].map(i=>[`${i.week}:${i.code}:${i.severity}`,i])).values()];
  return {...global,issues:combined,status:combined.some(i=>i.severity==='blocking')?'blocked':combined.length?'coach_review':'admissible'};
}
export function contractWindowLabel(window:Pick<ContractWindow,'from'|'to'|'objective'>):string {
  return `Fenêtre S${window.from}–S${window.to}${window.objective?` · ${window.objective}`:''}`;
}