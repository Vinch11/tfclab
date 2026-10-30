/** D1.17: explicit, fail-closed physiological stimulus contract.
 * Experimental pure policy only. No production planner integration or approval.
 * A calendar's isKeySession flag NEVER provides physiological evidence.
 */
export type RequiredStimulus = "recovery" | "easy_aerobic" | "threshold" | "vo2max";
export type DocumentedStimulus = RequiredStimulus | "unknown";
export type StimulusEvidence = {
  /** Source-verified physiological intent. Unknown must never be upgraded. */
  documented: DocumentedStimulus;
  /** Provenance from the curated library, not a calendar or title. */
  provenance: "curated_card" | "missing";
};
export type StimulusDecision = {
  compatible: boolean;
  reason: "supported_exact_stimulus" | "missing_source_evidence" | "stimulus_mismatch";
  keySlotDoesNotImplyQuality: true;
};
/** Strict equality is deliberate: any equivalence needs an explicit scientific
 * review and a separate audited rule, not a shortcut from isKeySession.
 */
export function examineD117Stimulus(
  required: RequiredStimulus,
  evidence: StimulusEvidence,
  _calendarIsKey: boolean,
): StimulusDecision {
  const fixed = {keySlotDoesNotImplyQuality: true as const};
  if (evidence.provenance !== "curated_card" || evidence.documented === "unknown")
    return {...fixed,compatible:false,reason:"missing_source_evidence"};
  if (required !== evidence.documented)
    return {...fixed,compatible:false,reason:"stimulus_mismatch"};
  return {...fixed,compatible:true,reason:"supported_exact_stimulus"};
}
