import { describe, expect, it } from 'vitest';
import { buildSyntheticDetV3ContractFromCatalogue, syntheticV3ReviewAnchors } from './v3-test-anchor-fixtures';
import type { V3ReviewedSettings } from './v31-v3-catalogue';
import type { V34SafeBrickReview } from './v34-v3-low-run-bricks';

const id = 'V3B_703_BASE_EASY_180';
const review: V34SafeBrickReview = { id, objective: '703', individualCoachApproval: true, transitionSeconds: 360 };
const sources = (): V3ReviewedSettings[] => [['V3P_BIKE_016', 139], ['V3P_RUN_001', 35]].map(([id, minutes]) => ({
  id: String(id), objective: '703', targetDurationMin: Number(minutes), athleteLevel: 'trained', athleteLevelSource: 'manual',
  allPrerequisitesChecked: true, individualCoachApproval: true, athleteAnchors: syntheticV3ReviewAnchors(),
}));
const build = (ss = sources(), rr: V34SafeBrickReview[] = [review]) => buildSyntheticDetV3ContractFromCatalogue(ss, [], [], rr);

describe('70.3 base composition: separate review and exact existing doses', () => {
  it('retains 139 min bike, 6 min transition and 35 min run as distinct saved components', () => {
    const r = build();
    expect(r.lowRunBrickReport.rejected).toEqual([]);
    expect(r.allBricks.find(s => s.id === id)).toMatchObject({ phases: ['base'], durationMin: [180, 180] });
    const structured = r.structuredWorkoutForId(id, 180);
    expect(structured).toMatchObject({ status: 'structured', workout: { exactSeconds: 10800, composition: {
      bike: { sourceId: 'V3P_BIKE_016', exactSeconds: 8340 }, run: { sourceId: 'V3P_RUN_001', exactSeconds: 2100 }, transitionSeconds: 360,
    } } });
  });
  it('build-phase review never grants base approval', () => {
    expect(build(sources(), [{ ...review, id: 'V3B_703_BUILD_EASY_180' }]).allBricks.some(s => s.id === id)).toBe(false);
    expect(build(sources(), []).allBricks).toEqual([]);
  });
  it('refuses missing component, changed dose, changed transition or wrong objective', () => {
    for (const r of [build(sources().slice(0, 1)), build(sources().map(s => ({ ...s, targetDurationMin: 138 }))),
      build(sources(), [{ ...review, transitionSeconds: 300 }]), build(sources(), [{ ...review, objective: 'IM' }])]) {
      expect(r.allBricks.some(s => s.id === id)).toBe(false);
      expect(r.lowRunBrickReport.rejected.length).toBeGreaterThan(0);
    }
  });
});
