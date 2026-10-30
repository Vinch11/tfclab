/**
 * D1.4 — evidence-only diagnostic for the selected KEY sessions.
 * A layout flag or catalogue intent is not a physiological dose.
 * This audit does NOT add threshold/VO2 prescriptions or override the native
 * Lorang, recovery, polarization, injury, or weekly-load validators.
 */
export interface D14StimulusSession {
  id: string | null;
  sport: string;
  key: boolean;
  intentFamily?: string | null;
  /** Verified executed prescription structure, not an inferred zone from a title. */
  workSegments?: readonly {
    seconds: number;
    physiologicalTarget: "threshold" | "vo2" | "other";
    referenceVerified: boolean;
  }[] | null;
  /** Explicitly reviewed individual intensity dose; timed segments alone are not enough. */
  doseAdequacyReviewed?: boolean;
  limiterMatchVerified?: boolean;
  phaseCompatible?: boolean;
  readinessCompatible?: boolean;
}
export interface D14StimulusWeekEvidence {
  week: number;
  weekType: "load" | "recovery" | "taper" | "race";
  keyLabeledIds: string[];
  intensityIntentIds: string[];
  structuredTargetIds: string[];
  individuallySupportedIds: string[];
  selectedKeyWithoutStimulusEvidence: string[];
  status: "not_applicable" | "missing_verified_stimulus" | "supported_pending_coach_review";
  canAutoInsert: false;
  sportsGo: false;
}
const INTENSITY_FAMILIES = new Set(["seuil", "vo2", "sprint", "race_pace"]);
const TARGETS = new Set(["threshold", "vo2"]);

/** Counts only observable structured target segments; never guesses from tags. */
export function auditD14KeyStimulus(
  week: number,
  weekType: D14StimulusWeekEvidence["weekType"],
  sessions: readonly D14StimulusSession[],
): D14StimulusWeekEvidence {
  if (!Number.isSafeInteger(week) || week < 1) throw new Error("D14_INVALID_WEEK");
  const keys = sessions.filter(s => s.key);
  const intent = keys.filter(s => INTENSITY_FAMILIES.has(s.intentFamily ?? ""));
  const structured = keys.filter(s =>
    s.workSegments?.some(segment =>
      TARGETS.has(segment.physiologicalTarget) &&
      Number.isSafeInteger(segment.seconds) && segment.seconds > 0 &&
      segment.referenceVerified === true,
    ) === true,
  );
  const individuallySupported = structured.filter(s =>
    s.doseAdequacyReviewed === true &&
    s.limiterMatchVerified === true &&
    s.phaseCompatible === true &&
    s.readinessCompatible === true,
  );
  const ids = (entries: readonly D14StimulusSession[]) => entries.map(s => s.id ?? "(no-catalog-id)");
  const applicable = weekType === "load";
  return {
    week, weekType,
    keyLabeledIds: ids(keys),
    intensityIntentIds: ids(intent),
    structuredTargetIds: ids(structured),
    individuallySupportedIds: ids(individuallySupported),
    selectedKeyWithoutStimulusEvidence: ids(keys.filter(s => !individuallySupported.includes(s))),
    status: !applicable ? "not_applicable" :
      individuallySupported.length ? "supported_pending_coach_review" : "missing_verified_stimulus",
    canAutoInsert: false,
    sportsGo: false,
  };
}
