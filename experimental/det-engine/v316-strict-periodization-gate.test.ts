import {describe,expect,it} from 'vitest';
import {assessStrictPeriodizationEvidence} from './v316-strict-periodization-gate';

describe('DET V316 strict periodization — native findings never laundered into GO',()=>{
  it('rejects a real source/phase mismatch even when native marks it warning',()=>{
    const issues=[{code:'phase_coherence',week:13,severity:'warning',
      message:'S13: source inadapté en phase peak'}];
    const before=JSON.stringify(issues);
    const out=assessStrictPeriodizationEvidence(issues);
    expect(out.verdict).toBe('blocked');
    expect(out.flagged).toEqual([{
      week:13,severity:'warning',message:issues[0].message,
    }]);
    expect(JSON.stringify(issues)).toBe(before);
    expect(out.nativeIssuesPreserved).toBe(true);
  });
  it('rejects race-specific work entirely absent from a peak block',()=>{
    expect(assessStrictPeriodizationEvidence([{
      code:'phase_coherence',severity:'warning',
      message:'Bloc Race-Specific sans aucune séance allure course/race-pace/simulation',
    }]).verdict).toBe('blocked');
  });
  it('does not reclassify purely informational phase advice',()=>{
    expect(assessStrictPeriodizationEvidence([{
      code:'phase_coherence',severity:'info',
      message:'Fondation sans intensité détectée',
    }]).verdict).toBe('verified');
  });
  it('retains unrelated native blockers for the main result to enforce',()=>{
    const out=assessStrictPeriodizationEvidence([
      {code:'prohibition_compliance',severity:'error',message:'sprint banned'},
    ]);
    expect(out.verdict).toBe('verified');
    expect(out.flagged).toHaveLength(0);
    // "verified" here ONLY means phase evidence: never global sporting approval.
  });
});
