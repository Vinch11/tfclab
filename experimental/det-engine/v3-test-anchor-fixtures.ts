/** Synthetic anchors exclusively for isolated test fixtures. NEVER real athlete defaults. */
import type { V3AthleteAnchors } from '../../scripts/library-v3/resolveV3Intensity';
export const SYNTHETIC_V3_ANCHORS:V3AthleteAnchors={
  bikeFtpWatts:300,
  bikePmaWatts:390,
  bikeSprintPowerRangeWatts:[550,850],
  runThresholdPaceSecPerKm:240,
  runVvo2SpeedMps:5.0,
  runSprintSpeedRangeMps:[5.1,7.0],
  swimDomainPacesSecPer100m:{
    recovery:120,moderate_lt1:110,tempo:103,im_pace:108,
    '703_pace':102,marathon_pace:103,sub_threshold:98,semi_pace:98,
    mlss:95,vo2max:88,neuromuscular:84,
  },
  coachValidatedStrengthLoadAndRpe:true,
};
/** Explicitly distinguish synthetic tests from measured athlete data. */
export const syntheticV3ReviewAnchors=()=>structuredClone(SYNTHETIC_V3_ANCHORS);
