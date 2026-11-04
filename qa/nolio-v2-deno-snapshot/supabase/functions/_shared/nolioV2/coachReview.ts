/** Ordinary coach review, never an independent scientific or release attestation. */
export const REVIEW_CATEGORIES = ['prescriptions','load_recovery','safety','race_dates','exercise_associations'] as const;
export type ReviewDecisions = Record<typeof REVIEW_CATEGORIES[number], 'accepted'|'blocked'>;
export function parseReview(value: unknown): { decisions: ReviewDecisions; blockers: string[]; reviewedByCoach: true } | null {
 const v=value as Record<string,unknown>|null;
 if (!v || Object.keys(v).some(k=>!['decisions','blockers','reviewedByCoach'].includes(k)) || v.reviewedByCoach!==true || !Array.isArray(v.blockers) || v.blockers.length>30 || !v.blockers.every(x=>typeof x==='string' && x.trim().length>0 && x.length<=300)) return null;
 const d=v.decisions as Record<string,unknown>|null;
 if (!d || Object.keys(d).length!==REVIEW_CATEGORIES.length || !REVIEW_CATEGORIES.every(k=>d[k]==='accepted'||d[k]==='blocked')) return null;
 if (REVIEW_CATEGORIES.some(k=>d[k]==='blocked') && !v.blockers.length) return null;
 return {decisions:d as ReviewDecisions,blockers:v.blockers as string[],reviewedByCoach:true};
}
export type ReviewBinding={coachId:string;athleteId:string;planVersionId:string;planSha256:string;refsSha256:string;opsSha256:string};
export function matchingCoachReview(row: unknown,b:ReviewBinding): boolean {
 const r=row as Record<string,unknown>|null;
 return !!r && r.coach_id===b.coachId && r.athlete_id===b.athleteId && r.plan_version_id===b.planVersionId && r.plan_sha256===b.planSha256 && r.refs_sha256===b.refsSha256 && r.ops_sha256===b.opsSha256 && r.reviewed_by_coach===true && r.prescription_allowed===false && r.scientific_attestation===false && !!parseReview({decisions:r.decisions,blockers:r.blockers,reviewedByCoach:r.reviewed_by_coach});
}
export function reviewAccepted(row:unknown,b:ReviewBinding):boolean {
 if(!matchingCoachReview(row,b))return false;
 const r=row as Record<string,unknown>; const p=parseReview({decisions:r.decisions,blockers:r.blockers,reviewedByCoach:true});
 return !!p && p.blockers.length===0 && REVIEW_CATEGORIES.every(k=>p.decisions[k]==='accepted');
}
