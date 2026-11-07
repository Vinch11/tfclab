/**
 * DET V3.16 — review-grade evidence gate for native periodization warnings.
 * Native validation remains intact; warn-only native phase findings must
 * NEVER become a green "all sport gates pass" in the strict experiment.
 * No coach data, phase labels or race-specific workouts are synthesized.
 */
type NativeIssue={code:string;week?:number;severity:string;message?:string};
export interface StrictPeriodizationEvidence{
  verdict:'verified'|'blocked';
  flagged:Array<{week:number|null;severity:string;message:string|null}>;
  /** The native issue list is never rewritten or downgraded. */
  nativeIssuesPreserved:true;
}
export function assessStrictPeriodizationEvidence(
  nativeIssues:readonly NativeIssue[],
):StrictPeriodizationEvidence{
  const flagged=nativeIssues.filter(issue=>issue.code==='phase_coherence'&&
    ['warning','error','critical','blocking'].includes(issue.severity))
    .map(issue=>({week:issue.week??null,severity:issue.severity,
      message:issue.message??null}));
  return {verdict:flagged.length?'blocked':'verified',
    flagged,nativeIssuesPreserved:true};
}
