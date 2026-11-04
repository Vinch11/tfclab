/**
 * Historical and strict real-solver running witnesses. All fixtures are synthetic.
 */
import {afterEach,describe,expect,it,vi} from 'vitest';
import {buildDetV3ContractFromCatalogue} from './v31-v3-catalogue';
import {syntheticV3ReviewAnchors,syntheticV3SportingContext} from './v3-test-anchor-fixtures';
import {runScenario,type Case} from './v332-running-long-horizon-fixture';

const matrix:readonly Case[]=[
  {id:'semi-native-8w',fixture:'B-SEMI',goal:'Semi',weeks:8,weeklyHours:6},
  {id:'semi-30w',fixture:'B-SEMI',goal:'Semi',weeks:30,weeklyHours:6},
  {id:'marathon-native-16w',fixture:'B-MARATHON',goal:'Marathon',weeks:16,weeklyHours:9},
  {id:'marathon-30w',fixture:'B-MARATHON',goal:'Marathon',weeks:30,weeklyHours:9},
  {id:'marathon-40w',fixture:'B-MARATHON',goal:'Marathon',weeks:40,weeklyHours:9},
  // These are genuinely DIFFERENT synthetic coach declarations, not a repair
  // of the preceding infeasible athlete's availability or forbidden sports.
  {id:'semi-8w-declared-clock',fixture:'B-SEMI',goal:'Semi',weeks:8,
    weeklyHours:6,declaredClock:true},
  {id:'semi-30w-declared-clock',fixture:'B-SEMI',goal:'Semi',weeks:30,
    weeklyHours:6,declaredClock:true},
  {id:'marathon-16w-two-slots',fixture:'B-MARATHON',goal:'Marathon',weeks:16,
    weeklyHours:9,declaredTwoSlotsPerDay:true,unrestrictedSports:true},
  {id:'marathon-40w-two-slots',fixture:'B-MARATHON',goal:'Marathon',weeks:40,
    weeklyHours:9,declaredTwoSlotsPerDay:true,unrestrictedSports:true},
  // Separately declared *synthetic* appointments with increasing daily gaps;
  // these are comparisons, NOT a retrospective alteration of the baseline.
  {id:'semi-8w-wide-clock',fixture:'B-SEMI',goal:'Semi',weeks:8,
    weeklyHours:6,wideRecoveryClock:true},
  {id:'semi-30w-wide-clock',fixture:'B-SEMI',goal:'Semi',weeks:30,
    weeklyHours:6,wideRecoveryClock:true},
  {id:'marathon-16w-two-slots-wide-clock',fixture:'B-MARATHON',goal:'Marathon',
    weeks:16,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true},
  {id:'marathon-40w-two-slots-wide-clock',fixture:'B-MARATHON',goal:'Marathon',
    weeks:40,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true},
  // V333 paired A/B experiments: SAME reviewed sources, athlete and clock.
  // Only the necessary forward-check mode changes. Historical cases stay.
  {id:'semi-8w-wide-clock-forward',fixture:'B-SEMI',goal:'Semi',weeks:8,
    weeklyHours:6,wideRecoveryClock:true,forwardCheck:true},
  {id:'semi-30w-wide-clock-forward',fixture:'B-SEMI',goal:'Semi',weeks:30,
    weeklyHours:6,wideRecoveryClock:true,forwardCheck:true},
  {id:'marathon-16w-two-slots-wide-clock-forward',fixture:'B-MARATHON',
    goal:'Marathon',weeks:16,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true},
  {id:'marathon-40w-two-slots-wide-clock-forward',fixture:'B-MARATHON',
    goal:'Marathon',weeks:40,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true},
  // Coaches who actually declared a COMPATIBLE ambition, load and schedule:
  // no auto-downgrade of the original world-class/9-hour witness.
  {id:'marathon-16w-declared-competitor',fixture:'B-MARATHON',goal:'Marathon',
    weeks:16,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,declaredCompetitor:true},
  {id:'marathon-40w-declared-competitor',fixture:'B-MARATHON',goal:'Marathon',
    weeks:40,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,declaredCompetitor:true},
  {id:'marathon-16w-declared-worldclass-load',fixture:'B-MARATHON',goal:'Marathon',
    weeks:16,weeklyHours:14,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,declaredWorldClassCapacity:true},
  {id:'marathon-40w-declared-worldclass-load',fixture:'B-MARATHON',goal:'Marathon',
    weeks:40,weeklyHours:14,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,declaredWorldClassCapacity:true},
  // V334: controlled source coverage and solver budget experiments.
  // Same REAL existing V3 workouts, all individually approved in this
  // test-only synthetic fixture. Baselines above are never retrofitted.
  {id:'semi-8w-expanded-approved-sources',fixture:'B-SEMI',goal:'Semi',
    weeks:8,weeklyHours:6,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true},
  {id:'semi-30w-expanded-approved-sources',fixture:'B-SEMI',goal:'Semi',
    weeks:30,weeklyHours:6,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true},
  {id:'marathon-16w-expanded-approved-sources',fixture:'B-MARATHON',goal:'Marathon',
    weeks:16,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true},
  {id:'marathon-40w-expanded-3k',fixture:'B-MARATHON',goal:'Marathon',
    weeks:40,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true},
  {id:'marathon-40w-expanded-7k',fixture:'B-MARATHON',goal:'Marathon',
    weeks:40,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,largerSearchBudget:true},
  // V335: same V334 approved source pool but source/dose-derived peak proof.
  // It does not rename a workout or waive the native phase validator.
  {id:'semi-8w-certified-peak',fixture:'B-SEMI',goal:'Semi',weeks:8,
    weeklyHours:6,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true},
  {id:'semi-30w-certified-peak',fixture:'B-SEMI',goal:'Semi',weeks:30,
    weeklyHours:6,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true},
  {id:'marathon-16w-certified-peak',fixture:'B-MARATHON',goal:'Marathon',
    weeks:16,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true},
  {id:'marathon-40w-certified-peak',fixture:'B-MARATHON',goal:'Marathon',
    weeks:40,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true},
  // V337: isolate ONE genuinely source-bounded 28-minute easy workout.
  // Same athlete, original clock, original race, original source pool and
  // safety gates as the certified-peak witnesses above. Only the synthetic
  // coach's V3P_RUN_001 duration approval changes; baseline is preserved.
  {id:'marathon-16w-source-fit-28',fixture:'B-MARATHON',goal:'Marathon',
    weeks:16,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true},
  {id:'marathon-40w-source-fit-28',fixture:'B-MARATHON',goal:'Marathon',
    weeks:40,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true},
  // V341: exact same dose/athlete/sports as the V337 witnesses, but a
  // separately DECLARED non-overlapping per-sport appointment calendar.
  // Never silently edits a coach's original appointments.
  {id:'marathon-16w-source-fit-distinct-clock',fixture:'B-MARATHON',goal:'Marathon',
    weeks:16,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true,distinctSportClock:true},
  {id:'marathon-40w-source-fit-distinct-clock',fixture:'B-MARATHON',goal:'Marathon',
    weeks:40,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true,distinctSportClock:true},
  // V342: separate synthetic coach restriction, genuinely run-only.
  // Original semi fixtures unchanged; no auto-removal of a required bike.
  {id:'semi-8w-declared-run-only',fixture:'B-SEMI',goal:'Semi',weeks:8,
    weeklyHours:6,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    coachDeclaredRunOnly:true},
  {id:'semi-30w-declared-run-only',fixture:'B-SEMI',goal:'Semi',weeks:30,
    weeklyHours:6,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    coachDeclaredRunOnly:true},
  // V342: exact same athlete, clocks and V3 sources as V341, but require
  // REAL measured recovery. A merely labelled recovery is never approved.
  {id:'marathon-16w-measured-recovery-proof',fixture:'B-MARATHON',goal:'Marathon',
    weeks:16,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true,distinctSportClock:true,
    measuredRecoveryProof:true},
  {id:'marathon-40w-measured-recovery-proof',fixture:'B-MARATHON',goal:'Marathon',
    weeks:40,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true,distinctSportClock:true,
    measuredRecoveryProof:true},
  // V343: independent, opt-in source-backed QUALITY witnesses on the exact
  // V342 synthetic athlete/approved doses/clocks. Historical cases unchanged.
  {id:'marathon-16w-reviewed-running-quality',fixture:'B-MARATHON',goal:'Marathon',
    weeks:16,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true,distinctSportClock:true,
    measuredRecoveryProof:true,runningQualityProof:true},
  {id:'marathon-40w-reviewed-running-quality',fixture:'B-MARATHON',goal:'Marathon',
    weeks:40,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true,distinctSportClock:true,
    measuredRecoveryProof:true,runningQualityProof:true,largerSearchBudget:true},
  // V344 paired A/B against V343: same athlete, approvals, clocks, strict
  // quality and deload gates, and search budgets. Change ORDER only.
  {id:'marathon-16w-quality-key-first',fixture:'B-MARATHON',goal:'Marathon',
    weeks:16,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true,distinctSportClock:true,
    measuredRecoveryProof:true,runningQualityProof:true,runningQualityPriority:true},
  {id:'marathon-40w-quality-key-first',fixture:'B-MARATHON',goal:'Marathon',
    weeks:40,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true,distinctSportClock:true,
    measuredRecoveryProof:true,runningQualityProof:true,runningQualityPriority:true,
    largerSearchBudget:true},
  // V345: same V344 fixed-budget witnesses, now with ONLY an additional
  // necessary source matching certificate; never replaces native validation.
  {id:'marathon-16w-quality-matching-certificate',fixture:'B-MARATHON',
    goal:'Marathon',weeks:16,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true,distinctSportClock:true,
    measuredRecoveryProof:true,runningQualityProof:true,
    runningQualityPriority:true,runningMatchingAudit:true},
  {id:'marathon-40w-quality-matching-certificate',fixture:'B-MARATHON',
    goal:'Marathon',weeks:40,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true,distinctSportClock:true,
    measuredRecoveryProof:true,runningQualityProof:true,
    runningQualityPriority:true,runningMatchingAudit:true,
    largerSearchBudget:true},
  // V346 A/B: same athlete, clocks, reviewed doses, budgets and ALL sporting
  // constraints as V345. Fix the key-quality candidate sort precedence only.
  {id:'marathon-16w-quality-candidate-first',fixture:'B-MARATHON',
    goal:'Marathon',weeks:16,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true,distinctSportClock:true,
    measuredRecoveryProof:true,runningQualityProof:true,
    runningQualityPriority:true,runningMatchingAudit:true,
    runningCandidatePriority:true},
  {id:'marathon-40w-quality-candidate-first',fixture:'B-MARATHON',
    goal:'Marathon',weeks:40,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true,distinctSportClock:true,
    measuredRecoveryProof:true,runningQualityProof:true,runningQualityPriority:true,
    runningMatchingAudit:true,runningCandidatePriority:true,
    largerSearchBudget:true},
  // V347 paired A/B: first source-certified quality key, then rank by exact
  // V3 low-vs-nonlow minutes to find safe polarization sooner (ordering only).
  {id:'marathon-16w-quality-easy-margin-first',fixture:'B-MARATHON',
    goal:'Marathon',weeks:16,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true,distinctSportClock:true,
    measuredRecoveryProof:true,runningQualityProof:true,
    runningQualityPriority:true,runningMatchingAudit:true,
    runningCandidatePriority:true,runningEasyMarginPriority:true},
  {id:'marathon-40w-quality-easy-margin-first',fixture:'B-MARATHON',
    goal:'Marathon',weeks:40,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true,distinctSportClock:true,
    measuredRecoveryProof:true,runningQualityProof:true,
    runningQualityPriority:true,runningMatchingAudit:true,
    runningCandidatePriority:true,runningEasyMarginPriority:true,
    largerSearchBudget:true},
  // V349: SAME fixed approved sources, athlete, all strict sporting gates;
  // only bound the search at 25k/15s rather than 3k/2s or 7k/4.5s.
  // These witnesses are NOT approvals even if they construct more weeks.
  {id:'marathon-16w-strict-search-25k',fixture:'B-MARATHON',
    goal:'Marathon',weeks:16,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true,distinctSportClock:true,
    measuredRecoveryProof:true,runningQualityProof:true,
    runningQualityPriority:true,runningMatchingAudit:true,
    runningCandidatePriority:true,runningEasyMarginPriority:true,
    extendedStrictSearchBudget:true},
  {id:'marathon-40w-strict-search-25k',fixture:'B-MARATHON',
    goal:'Marathon',weeks:40,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true,distinctSportClock:true,
    measuredRecoveryProof:true,runningQualityProof:true,
    runningQualityPriority:true,runningMatchingAudit:true,
    runningCandidatePriority:true,runningEasyMarginPriority:true,
    extendedStrictSearchBudget:true},
  // V350: same V349 25k strict witnesses; ONLY the first certified quality
  // SLOT is prioritized by exact Z1/Z2 vs Z3–Z6 dose margin.
  {id:'marathon-16w-quality-slot-margin-25k',fixture:'B-MARATHON',
    goal:'Marathon',weeks:16,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true,distinctSportClock:true,
    measuredRecoveryProof:true,runningQualityProof:true,
    runningQualityPriority:true,runningMatchingAudit:true,
    runningCandidatePriority:true,runningEasyMarginPriority:true,
    extendedStrictSearchBudget:true,runningQualitySlotMargin:true,
    marathonHorizonEvidence:true,marathonSpecificityReconciliation:true,
    measuredMarathonMesocycles:true},
  {id:'marathon-40w-quality-slot-margin-25k',fixture:'B-MARATHON',
    goal:'Marathon',weeks:40,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true,distinctSportClock:true,
    measuredRecoveryProof:true,runningQualityProof:true,
    runningQualityPriority:true,runningMatchingAudit:true,
    runningCandidatePriority:true,runningEasyMarginPriority:true,
    extendedStrictSearchBudget:true,runningQualitySlotMargin:true,
    marathonHorizonEvidence:true,marathonSpecificityReconciliation:true,
    measuredMarathonMesocycles:true},
  // V355 isolated A/B: ONLY source-verified TTE preference differs from V353
  {id:'marathon-16w-tte-source-preferred',fixture:'B-MARATHON',
    goal:'Marathon',weeks:16,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true,distinctSportClock:true,
    measuredRecoveryProof:true,runningQualityProof:true,
    runningQualityPriority:true,runningMatchingAudit:true,
    runningCandidatePriority:true,runningEasyMarginPriority:true,
    extendedStrictSearchBudget:true,runningQualitySlotMargin:true,
    marathonHorizonEvidence:true,marathonSpecificityReconciliation:true,
    measuredMarathonMesocycles:true,tteSourcePreferred:true},
  {id:'marathon-40w-tte-source-preferred',fixture:'B-MARATHON',
    goal:'Marathon',weeks:40,weeklyHours:9,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,forwardCheck:true,
    expandedTaperSources:true,approvedTaperDose:true,sourceCertifiedPeak:true,
    shortEasyTaperApproved:true,distinctSportClock:true,
    measuredRecoveryProof:true,runningQualityProof:true,
    runningQualityPriority:true,runningMatchingAudit:true,
    runningCandidatePriority:true,runningEasyMarginPriority:true,
    extendedStrictSearchBudget:true,runningQualitySlotMargin:true,
    marathonHorizonEvidence:true,marathonSpecificityReconciliation:true,
    measuredMarathonMesocycles:true,tteSourcePreferred:true},
  // EXPLICIT, synthetic coach-approved reduction of the existing marathon/
  // semi race-pace workset within ORIGINAL V3 bounds; not an automatic trim.
  {id:'semi-8w-reviewed-taper-dose',fixture:'B-SEMI',goal:'Semi',
    weeks:8,weeklyHours:6,wideRecoveryClock:true,approvedTaperDose:true},
  {id:'marathon-16w-reviewed-taper-dose',fixture:'B-MARATHON',goal:'Marathon',
    weeks:16,weeklyHours:14,declaredTwoSlotsPerDay:true,
    unrestrictedSports:true,wideRecoveryClock:true,
    declaredWorldClassCapacity:true,approvedTaperDose:true},
];

afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('DET V3.32 — semi, marathon, 30–40 week real-solver safety matrix',()=>{
  it.each(matrix)('$id: full sporting gates or an explicit NO-GO',s=>{
    vi.stubGlobal('fetch',()=>{throw Error('DET_V332_NETWORK_FORBIDDEN');});
    runScenario(s);
  },45000);

  it('rejects a running source approval stolen from another synthetic athlete',()=>{
    const id='V3P_RUN_001';
    const source=syntheticV3SportingContext(id);
    if(!('sportingReview' in source))throw Error('missing_run_source');
    const {report}=buildDetV3ContractFromCatalogue([{
      id,objective:'Marathon',athleteLevel:'trained',
      athleteLevelSource:'manual',allPrerequisitesChecked:true,
      individualCoachApproval:true,
      expectedAthleteId:'synthetic-v332-athlete-A',
      sportingReview:{...source.sportingReview,athleteId:'synthetic-v332-athlete-B'},
      athleteAnchors:syntheticV3ReviewAnchors(),
    }]);
    expect(report.accepted.some(card=>card.id===id)).toBe(false);
    expect(report.rejected.find(item=>item.id===id)?.reason)
      .toContain('athlete_scoped_review_identity_missing_or_mismatched');
  });
});
