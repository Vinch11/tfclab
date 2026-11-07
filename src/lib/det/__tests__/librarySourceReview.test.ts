import { describe, it, expect } from 'vitest';
import { canonicalJson } from '@/lib/plan/appendOnlyPlanVersionSave';
import { bindLibraryReview, libraryReviewMatches, prepareLibraryReview, type LibraryReviewRow } from '../librarySourceReview';
import { familySourcePool } from '../familySourcePools';
import type { CoachAnswers } from '../athleteDetBridge';

const answers = { recentLoad: 'moderate', fatigue: 'ready', injuryScreen: 'cleared_by_coach',
  prerequisitesAllMet: true, contraindicationsAllAbsent: true, general: { stopRuleExplained: true },
  unmetPrerequisites: [], presentContraindications: [] } as unknown as CoachAnswers;
async function reviewed() {
  const p = await prepareLibraryReview(familySourcePool('marathon'));
  const row: LibraryReviewRow = { id: 'synthetic-library-review', coach_id: 'coach-a', family: 'marathon',
    manifest_hash: p.hash, manifest: p.manifest, decision: 'reviewed', reviewer_notes: 'SYNTHETIC human-action test only', created_at: '2026-11-04T12:00:00Z' };
  return { ...p, row, coachId: 'coach-a', athleteId: 'athlete-a', fingerprint: 'a'.repeat(64), answers };
}
describe('reusable library review, never an athlete clearance or attestation', () => {
  it('binds a real-action-shaped receipt to each current athlete without changing its original content review', async () => {
    const input = await reviewed(), result = bindLibraryReview(input)!;
    expect(result.origin).toBe('det_library_source_reviews');
    expect(result.reviewContextId).toBe(input.row.id);
    expect(result.libraryManifestHash).toBe(input.hash);
    expect(result.athleteChecksKey).toBe(canonicalJson(answers));
    expect(result.qualifications).toHaveLength(input.manifest.sources.length);
    expect(input.manifest.scientificAttestation).toBe(false);
    expect(input.manifest.prescriptionAllowed).toBe(false);
    expect(bindLibraryReview({ ...input, athleteId: 'athlete-b' })!.athleteId).toBe('athlete-b');
    expect(result.qualifications[0].evidence).not.toHaveProperty('highIntensityHistoryConfirmed');
  });
  it('refuses absent review, another coach, stale hash, withdrawn review or fabricated content', async () => {
    const input = await reviewed();
    expect(bindLibraryReview({ ...input, row: null })).toBeNull();
    expect(bindLibraryReview({ ...input, coachId: 'coach-b' })).toBeNull();
    expect(bindLibraryReview({ ...input, hash: '0'.repeat(64) })).toBeNull();
    expect(bindLibraryReview({ ...input, row: { ...input.row, decision: 'withdrawn' } })).toBeNull();
    expect(bindLibraryReview({ ...input, row: { ...input.row, manifest: { ...input.manifest, sources: [] } } })).toBeNull();
    expect(libraryReviewMatches({ ...input.row, reviewer_notes: '' }, input.coachId, input.hash)).toBe(false);
  });
  it('never obtains current athlete facts from the library and preserves unconfirmed flags and exclusions', async () => {
    const input = await reviewed();
    for (const patch of [{ prerequisitesAllMet: false }, { contraindicationsAllAbsent: false }, { fatigue: '' }, { injuryScreen: 'contraindication' }])
      expect(bindLibraryReview({ ...input, answers: { ...answers, ...patch } as CoachAnswers })).toBeNull();
    const source = input.manifest.sources.find(s => s.prerequisites.length > 0)!;
    const a = { ...answers, unmetPrerequisites: [source.prerequisites[0]] };
    const result = bindLibraryReview({ ...input, answers: a })!;
    expect(result.qualifications.find(q => q.id === source.id)!.evidence.checkedPrerequisites).not.toContain(source.prerequisites[0]);
    expect(result.athleteChecksKey).not.toBe(canonicalJson(answers));
    expect(result.brickApprovals).toEqual([]);
  });
});
