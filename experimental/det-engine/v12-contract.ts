/** Preregistered hypotheses. All numbers come from existing catalogue protocols or V10 envelopes. */
export const V12_SPEC = {
  version: 'det-v12-1', baseline: '0bf3d0a14738ea68ccf1cd347929b306b2b3b5b2',
  clock: '2026-10-26T12:00:00Z',
  progressionModels: ['justified_maintenance', 'priority_duration', 'rest_density', 'controlled_intensity', 'technical_segmentation'],
  recoveryModels: ['native_minima', 'bike_source_upper_bound', 'previous_swim_exposure'],
  technicalHypothesis: '6x10 Z2 r5 then 4x15 Z2 r5: equal nominal work60, longer uninterrupted posture, original rest per interval unchanged; not equal physiological cost',
  volumePolicy: 'reserve existing week roles, conserve development weekly totals; fund extra source recovery minutes from non-focus extensions above their native/source minima',
  releasePolicy: 'no observed response assumed; transition requires coach-reviewed, comparable, recovered, pain-free and stable-posture evidence, otherwise hold',
  recoveryPolicy: '250min retained as source/native lower-bound reference, not a universal percentage or optimal recovery dose',
  scientificBasis: ['V8 L175/L417: individual need, load response, continuity and re-evaluation', 'V8 M21/S25: no VLamax-to-duration causal prescription', 'V8 I20: no universal safe progression ratio'],
  sourceConvention: '6x10 and4x15 are catalogue programming conventions, not rules attributed to Lorang',
  expertReviewed: false, candidate: true,
} as const;
export interface PostureResponse {
  synthetic: true;
  sourceId: string;
  week: number;
  quality: 'usable' | 'missing';
  comparable: boolean | null;
  recovered: boolean | null;
  pain: boolean | null;
  stablePosition: boolean | null;
  provenance: string;
}
/** Returns a proposal only; even a scripted favourable response is not coach clearance. */
export function postureGate(observation?: PostureResponse) {
  if (!observation) return { action: 'hold_for_evidence', reason: 'response_missing', automaticRelease: false } as const;
  if (observation.synthetic !== true || observation.sourceId !== 'C_BIKE_AERO_POSITION_DRILLS' || observation.week !== 1)
    throw Error('RESPONSE_BINDING');
  if (observation.pain === true || observation.recovered === false)
    return { action: 'stop_for_review', reason: 'symptom_or_unrecovered', automaticRelease: false } as const;
  if (observation.quality !== 'usable' || observation.comparable !== true || observation.recovered !== true || observation.pain !== false || observation.stablePosition !== true)
    return { action: 'hold_for_evidence', reason: 'required_postural_response_unknown_or_unstable', automaticRelease: false } as const;
  return { action: 'candidate_transition', reason: 'scripted_response_supports_review_of_existing_15min_bout_not_capacity_growth', automaticRelease: false } as const;
}
