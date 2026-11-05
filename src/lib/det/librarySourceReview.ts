/** Human library review is reusable; athlete eligibility is always checked anew. */
import { canonicalJson, sha256Hex } from '@/lib/plan/appendOnlyPlanVersionSave';
import { findSource, sourceReviewSheet, type SourceQualification } from './coachDetContext';
import { poolLibraryProblems, type FamilySourcePool } from './familySourcePools';
import type { CoachAnswers, GenuineSourceReviews } from './athleteDetBridge';

export interface LibraryReviewManifest {
  schema: 'tfcl.det.library-review.v1';
  family: string;
  poolFingerprint: string;
  sources: ReturnType<typeof sourceReviewSheet>[];
  doses: FamilySourcePool['doses'];
  scientificAttestation: false;
  prescriptionAllowed: false;
}
export interface LibraryReviewRow {
  id: string; coach_id: string; family: string; manifest_hash: string;
  manifest: LibraryReviewManifest; decision: 'reviewed' | 'withdrawn';
  reviewer_notes: string; created_at: string;
}
export async function prepareLibraryReview(pool: FamilySourcePool) {
  const problems = await poolLibraryProblems(pool);
  if (problems.length) throw new Error(problems.join('; '));
  const manifest: LibraryReviewManifest = {
    schema: 'tfcl.det.library-review.v1', family: pool.family, poolFingerprint: pool.pinnedFingerprint,
    sources: [...pool.ids].sort().map(id => sourceReviewSheet(findSource(id)!)),
    doses: structuredClone(pool.doses), scientificAttestation: false, prescriptionAllowed: false,
  };
  return { manifest, hash: await sha256Hex(canonicalJson(manifest)) };
}
export function libraryReviewMatches(row: LibraryReviewRow | null, coachId: string, hash: string): boolean {
  return !!row && row.coach_id === coachId && row.manifest_hash === hash && row.decision === 'reviewed'
    && row.reviewer_notes.trim().length > 0 && Number.isFinite(Date.parse(row.created_at))
    && row.manifest.schema === 'tfcl.det.library-review.v1'
    && row.manifest.scientificAttestation === false && row.manifest.prescriptionAllowed === false;
}
/**
 * No library review supplies athlete facts. Only explicit current answers do.
 * The bridge still verifies every prerequisite, anchor, clock and source hash.
 * Triathlon bricks retain their separate Advanced review until a brick manifest exists.
 */
export function bindLibraryReview(input: {
  row: LibraryReviewRow | null; manifest: LibraryReviewManifest; hash: string;
  coachId: string; athleteId: string; fingerprint: string; answers: CoachAnswers;
}): GenuineSourceReviews | null {
  const { row, manifest, hash, coachId, athleteId, fingerprint, answers: a } = input;
  if (!libraryReviewMatches(row, coachId, hash) || canonicalJson(row!.manifest) !== canonicalJson(manifest)
    || !fingerprint || !a.recentLoad || !a.fatigue || a.injuryScreen !== 'cleared_by_coach'
    || !a.prerequisitesAllMet || !a.contraindicationsAllAbsent) return null;
  const qualifications=draftQualificationsForExplicitReview(manifest,a);
  return { origin: 'det_library_source_reviews', reviewContextId: row!.id, coachId, athleteId,
    reviewedAt: row!.created_at, planningInputFingerprint: fingerprint, qualifications, brickApprovals: [],
    libraryManifestHash: hash, libraryFamily: manifest.family, athleteChecksKey: canonicalJson(a) };
}

/** Draft only. The caller must obtain a human content review and persist/read it before reuse. */
export function draftQualificationsForExplicitReview(manifest:LibraryReviewManifest,a:CoachAnswers):SourceQualification[]{
  return manifest.sources.map(s => ({
    id: s.id, sourceFingerprint: s.fingerprint, preferReviewedV3: true,
    ...manifest.doses[s.id],
    evidence: {
      ...Object.fromEntries(Object.entries(a.general).filter(([, value]) => value === true)),
      stopRuleExplained: a.general.stopRuleExplained === true,
      environmentAndEquipmentConfirmed: a.general.environmentAndEquipmentConfirmed === true,
      limiterAndSportingGoalReviewed: a.general.limiterAndSportingGoalReviewed === true,
      trainingLoadCompatible: a.general.trainingLoadCompatible === true,
      recoveryContextReviewed: a.general.recoveryContextReviewed === true,
      coachReviewedSource: true, currentPhase: s.phases[0], recentLoad: a.recentLoad,
      fatigue: a.fatigue, injuryScreen: a.injuryScreen,
      checkedPrerequisites: s.prerequisites.filter(p => !a.unmetPrerequisites.includes(p)),
      checkedContraindications: s.contraindications.filter(c => !a.presentContraindications.includes(c)),
    } as SourceQualification['evidence'],
  }));
}
