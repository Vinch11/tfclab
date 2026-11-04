import type {Case} from './v332-running-long-horizon-fixture';
import {strictMarathonCaseSettings} from './v356-marathon-acceptance-fixtures';
export const constrainedRunningCases:readonly (Case&{family:14|15})[]=[
  {...strictMarathonCaseSettings,id:'availability-10k-12w-four-days',family:14,
    fixture:'B-10K',goal:'10K',weeks:12,weeklyHours:6.5,declaredAmbition:'age_group',
    declaredPrimaryLimiter:'tte',verifiedRunningPhaseEvidence:true,
    declaredConstraints:'Lundi indisponible. Jeudi indisponible. Samedi indisponible.',
    marathonHorizonEvidence:undefined,marathonSpecificityReconciliation:undefined,
    measuredMarathonMesocycles:undefined,approvedTaperDose:undefined},
  {...strictMarathonCaseSettings,id:'individual-recovery-10k-12w-2to1-sprint-ban',family:15,
    fixture:'B-10K',goal:'10K',weeks:12,weeklyHours:7,declaredAmbition:'age_group',
    declaredPrimaryLimiter:'tte',verifiedRunningPhaseEvidence:true,declaredCadenceWeeks:3,
    declaredProhibitions:['Sprint Ban'],
    marathonHorizonEvidence:undefined,marathonSpecificityReconciliation:undefined,
    measuredMarathonMesocycles:undefined,approvedTaperDose:undefined},
];
