/**
 * Metadata and fail-closed compatibility rules used only by deterministic
 * post-generation repairs.  This payload is deliberately separate from the
 * compact catalogue shown to the model: repairs need the complete sporting
 * contract even when the prompt representation is shortened.
 */

export type RepairIntentFamily =
  | "endurance_fondamentale"
  | "seuil"
  | "vo2"
  | "sprint"
  | "technique"
  | "force"
  | "recuperation"
  | "test"
  | "race_pace"
  | "brick"
  | "fatmax"
  | "other";

export interface RepairWorkoutMetadata {
  metadataVersion: 1;
  complete: true;
  id: string;
  sport: string;
  title: string;
  objective: string;
  intentFamily: RepairIntentFamily;
  goals: string[];
  /** True only when the full fiche explicitly limits the session to named race goals. */
  objectiveSpecific: boolean;
  phases: string[];
  durationMin: [number, number];
  mainZoneMax: number;
  specialContext: string | null;
  prerequisiteKeys: string[];
  necessity: string;
  when: string;
  avoid: string;
  tags: string[];
  structure: string;
  zones: string[];
}

export interface RepairCompatibilityContext {
  objective?: string | null;
  phase?: string | null;
  weekType?: string | null;
  /** An insertion has no initial session whose role can be preserved. */
  operation?: "replacement" | "insertion";
  /**
   * A repair whose stated purpose is to reduce load may explicitly permit a
   * small set of destination intents. Omitted means strict intent equality.
   */
  allowedCandidateIntentFamilies?: RepairIntentFamily[];
}

export interface RepairCompatibilityResult {
  compatible: boolean;
  reasons: string[];
}

function normalizeToken(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function normalizeRepairSport(raw: unknown): string {
  const value = normalizeToken(raw);
  if (["run", "course", "cap", "course a pied"].includes(value)) return "run";
  if (["bike", "velo", "cyclisme"].includes(value)) return "bike";
  if (["swim", "natation", "nat"].includes(value)) return "swim";
  if (["strength", "renfo", "renforcement", "ppg", "force"].includes(value)) return "strength";
  if (["brick", "brique", "enchainement"].includes(value)) return "brick";
  if (["recovery", "recup", "recuperation"].includes(value)) return "recovery";
  return value || "unknown";
}

/** Convert plan objectives to the same stable keys as LibraryWorkout.goals. */
export function normalizeRepairGoal(raw: unknown): string | null {
  const value = normalizeToken(raw).replace(/\s+/g, " ");
  if (!value) return null;
  if (/start.?to.?run|debut.*cour|repris.*cour/.test(value)) return "start_to_run";
  if (/trail.*ultra|ultra.*trail|utmb|\bccc\b/.test(value)) return "trail_ultra";
  if (/trail.*(?:long|80|100)|(?:80|100).*trail/.test(value)) return "trail_long";
  if (/trail.*(?:mountain|montagne)/.test(value)) return "trail_mountain";
  if (/trail/.test(value)) return "trail_short";
  if (/ironman|\bim\b/.test(value) && !/70[.,]?3/.test(value)) return "ironman";
  if (/70[.,]?3|half.?ironman|triathlon.*(?:m|moyen)/.test(value)) return "half";
  if (/triathlon.*sprint|\bsprint\b/.test(value)) return "sprint";
  if (/triathlon.*olymp|distance.*olymp/.test(value)) return "olympic";
  if (/semi|half.?marathon|21[.,]?1/.test(value)) return "semi";
  if (/marathon|42[.,]?2/.test(value)) return "marathon";
  if (/(?:^|\D)10\s*k(?:m)?(?:\D|$)/.test(value)) return "10k";
  if (/(?:^|\D)5\s*k(?:m)?(?:\D|$)/.test(value)) return "5k";
  return null;
}

export function isRecoveryWeekType(raw: unknown): boolean {
  const value = normalizeToken(raw);
  return /recovery|deload|decharge|recup|regeneration/.test(value);
}

/**
 * A replacement is accepted only when its structured metadata proves the
 * same sporting role. Unknown metadata never acts as a wildcard.
 */
export function evaluateRepairSportingEquivalence(
  original: RepairWorkoutMetadata | null | undefined,
  candidate: RepairWorkoutMetadata | null | undefined,
  context: RepairCompatibilityContext = {},
): RepairCompatibilityResult {
  const reasons: string[] = [];
  if (!candidate?.complete || candidate.metadataVersion !== 1) {
    return { compatible: false, reasons: ["candidate_metadata_incomplete"] };
  }
  if (candidate.intentFamily === "other") reasons.push("candidate_intent_unknown");

  const operation = context.operation ?? (original ? "replacement" : "insertion");
  if (operation === "replacement") {
    if (!original?.complete || original.metadataVersion !== 1) {
      reasons.push("original_metadata_incomplete");
    } else {
      if (normalizeRepairSport(candidate.sport) !== normalizeRepairSport(original.sport)) {
        reasons.push(`sport:${normalizeRepairSport(original.sport)}->${normalizeRepairSport(candidate.sport)}`);
      }
      if (original.intentFamily === "other") reasons.push("original_intent_unknown");
      else if (
        candidate.intentFamily !== original.intentFamily &&
        !context.allowedCandidateIntentFamilies?.includes(candidate.intentFamily)
      ) {
        reasons.push(`intent:${original.intentFamily}->${candidate.intentFamily}`);
      }
      if (candidate.specialContext && candidate.specialContext !== original.specialContext) {
        reasons.push(`special_context:${candidate.specialContext}`);
      }
      const originalPrereqs = new Set(original.prerequisiteKeys.map(normalizeToken));
      const introduced = candidate.prerequisiteKeys
        .map(normalizeToken)
        .filter(Boolean)
        .filter(key => !originalPrereqs.has(key));
      if (introduced.length > 0) reasons.push(`prerequisite:${introduced.join(",")}`);
    }
  } else {
    if (candidate.specialContext) reasons.push(`special_context:${candidate.specialContext}`);
    if (candidate.prerequisiteKeys.length > 0) {
      reasons.push(`prerequisite:${candidate.prerequisiteKeys.map(normalizeToken).join(",")}`);
    }
  }

  const targetGoal = normalizeRepairGoal(context.objective);
  if (targetGoal && candidate.objectiveSpecific && !candidate.goals.map(normalizeToken).includes(targetGoal)) {
    reasons.push(`objective:${targetGoal}`);
  }

  const phase = normalizeToken(context.phase);
  const phases = candidate.phases.map(normalizeToken);
  if (phase && phases.length > 0 && !phases.includes(phase) && !phases.includes("any")) {
    reasons.push(`phase:${phase}`);
  }

  if (isRecoveryWeekType(context.weekType)) {
    if (candidate.mainZoneMax > 2) reasons.push(`recovery_zone:z${candidate.mainZoneMax}`);
    if (["seuil", "vo2", "sprint", "race_pace", "test", "fatmax"].includes(candidate.intentFamily)) {
      reasons.push(`recovery_intent:${candidate.intentFamily}`);
    }
  }

  return { compatible: reasons.length === 0, reasons };
}

