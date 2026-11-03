import {strictMarathonCaseSettings} from './v356-marathon-acceptance-fixtures';
import type {Case} from './v332-running-long-horizon-fixture';
export const multiGoalCase:Case={
  ...strictMarathonCaseSettings,id:'10k-B-to-semi-A-16w-reference',fixture:'B-SEMI',goal:'Semi',
  weeks:16,weeklyHours:8,declaredAmbition:'age_group',
  marathonHorizonEvidence:undefined,marathonSpecificityReconciliation:undefined,
  measuredMarathonMesocycles:undefined,verifiedRunningPhaseEvidence:true,
  declaredPrimaryLimiter:'tte',
  declaredRaceGoals:[
    {objective:'10K',raceDate:'2026-12-19',priority:'B',targetTimeMinutes:40},
    {objective:'Semi',raceDate:'2027-02-14',priority:'A',targetTimeMinutes:95},
  ],
};
