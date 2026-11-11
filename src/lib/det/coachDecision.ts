export type CoachDecisionKind = 'missing_data' | 'incompatible' | 'engine_limit' | 'outside_det';

export interface CoachDecision {
  kind: CoachDecisionKind;
  fields: string[];
  /** A different explicit frequency for the coach to try, not an assembled plan. */
  trialCardioSessionsPerWeek?: number;
}

export class DetDecisionError extends Error {
  constructor(message: string, readonly decision: CoachDecision) {
    super(message);
    this.name = 'DetDecisionError';
  }
}

export function missingData(message: string, ...fields: string[]): DetDecisionError {
  return new DetDecisionError(message, {kind: 'missing_data', fields});
}

export function incompatible(message: string, ...fields: string[]): DetDecisionError {
  return new DetDecisionError(message, {kind: 'incompatible', fields});
}

export function engineLimit(message: string): DetDecisionError {
  return new DetDecisionError(message, {kind: 'engine_limit', fields: []});
}
