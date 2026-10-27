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
  variants?: Record<string, string>;
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

const VERIFIED_REPAIR_INTENTS = new Set<RepairIntentFamily>([
  "endurance_fondamentale", "seuil", "vo2", "sprint", "technique", "force",
  "recuperation", "test", "race_pace", "brick", "fatmax",
]);

export function isCompleteRepairWorkoutMetadata(value: unknown): value is RepairWorkoutMetadata {
  if (!value || typeof value !== "object") return false;
  const metadata = value as Partial<RepairWorkoutMetadata>;
  return metadata.complete === true &&
    metadata.metadataVersion === 1 &&
    typeof metadata.id === "string" && metadata.id.trim().length > 0 &&
    typeof metadata.sport === "string" && metadata.sport.trim().length > 0 &&
    typeof metadata.title === "string" &&
    typeof metadata.objective === "string" &&
    typeof metadata.intentFamily === "string" &&
    VERIFIED_REPAIR_INTENTS.has(metadata.intentFamily as RepairIntentFamily) &&
    Array.isArray(metadata.goals) && metadata.goals.every(item => typeof item === "string") &&
    typeof metadata.objectiveSpecific === "boolean" &&
    Array.isArray(metadata.phases) && metadata.phases.every(item => typeof item === "string") &&
    Array.isArray(metadata.durationMin) && metadata.durationMin.length === 2 &&
    metadata.durationMin.every(item => typeof item === "number" && Number.isFinite(item) && item >= 0) &&
    metadata.durationMin[0] <= metadata.durationMin[1] &&
    typeof metadata.mainZoneMax === "number" && Number.isFinite(metadata.mainZoneMax) && metadata.mainZoneMax >= 0 &&
    (metadata.specialContext === null || typeof metadata.specialContext === "string") &&
    Array.isArray(metadata.prerequisiteKeys) && metadata.prerequisiteKeys.every(item => typeof item === "string") &&
    typeof metadata.necessity === "string" &&
    typeof metadata.when === "string" &&
    typeof metadata.avoid === "string" &&
    Array.isArray(metadata.tags) && metadata.tags.every(item => typeof item === "string") &&
    typeof metadata.structure === "string" &&
    Array.isArray(metadata.zones) && metadata.zones.every(item => typeof item === "string") &&
    (metadata.variants === undefined || (metadata.variants !== null && typeof metadata.variants === "object" &&
      !Array.isArray(metadata.variants) && Object.values(metadata.variants).every(item => typeof item === "string")));
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
  if (value === "half") return "half";
  if (value === "olympic") return "olympic";
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
  if (!isCompleteRepairWorkoutMetadata(candidate)) {
    return { compatible: false, reasons: ["candidate_metadata_incomplete"] };
  }

  const operation = context.operation ?? (original ? "replacement" : "insertion");
  if (operation === "replacement") {
    if (!isCompleteRepairWorkoutMetadata(original)) {
      reasons.push("original_metadata_incomplete");
    } else {
      if (normalizeRepairSport(candidate.sport) !== normalizeRepairSport(original.sport)) {
        reasons.push(`sport:${normalizeRepairSport(original.sport)}->${normalizeRepairSport(candidate.sport)}`);
      }
      if (
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

