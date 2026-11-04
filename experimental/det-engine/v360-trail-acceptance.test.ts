import {afterEach,describe,expect,it,vi} from 'vitest';
import {trailCases,runTrail} from './v360-trail-fixture';

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('V360 complete trail reference calendars',()=>{
 it.each(trailCases)('$id: complete native acceptance plus independent terrain evidence',s=>{
  vi.stubGlobal('fetch',()=>{throw Error('DET_V360_NETWORK_FORBIDDEN');});
  const {out,proof}=runTrail(s);
  expect(out.technicallyConstructed).toBe(true);
  expect(out.constraintsSatisfied).toBe(true);
  expect(out.candidate?.weeks).toHaveLength(s.weeks);
  expect(out.issues.filter(i=>['critical','blocking','error'].includes(i.severity))).toEqual([]);
  expect(out.issues.filter(i=>['quota_floor_violation','quota_range_drift','layout_drift'].includes(i.code))).toEqual([]);
  expect(proof?.verified).toBe(true);
  expect(proof?.evidence.matchedKeys).toBeGreaterThanOrEqual(proof!.evidence.keys*.3);
  expect(out.humanReviewRequired).toBe(true);
  expect(out.sportingRelevance).toBe('not_attested');
  expect(proof?.evidence.prescriptionAllowed).toBe(false);
  expect(proof?.evidence.productionAllowed).toBe(false);
 },60000);
});
