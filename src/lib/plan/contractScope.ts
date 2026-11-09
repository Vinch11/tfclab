import type { PlanPrevalidation, PrevalidationIssue } from '../../../supabase/functions/_shared/planPrevalidation';
export interface GenerationWindow { from: number; to: number; objective?: string; }
export interface ContractWindow extends GenerationWindow { report: PlanPrevalidation; }
export type DisplayPrevalidation = PlanPrevalidation & { generationWindow?: GenerationWindow|null };
/** Window reports add evidence; they never replace the complete contract. */
export function mergeWindowEvidence(global:PlanPrevalidation, window:ContractWindow):PlanPrevalidation {
  const issues:PrevalidationIssue[]=window.report.issues.map(i=>({...i,week:i.week>0?window.from+i.week-1:0}));
  const combined=[...new Map([...global.issues,...issues].map(i=>[`${i.week}:${i.code}:${i.severity}`,i])).values()];
  return {...global,issues:combined,status:combined.some(i=>i.severity==='blocking')?'blocked':combined.length?'coach_review':'admissible'};
}
export function contractWindowLabel(window:GenerationWindow):string {
  return `Fenêtre S${window.from}–S${window.to}${window.objective?` · ${window.objective}`:''}`;
}