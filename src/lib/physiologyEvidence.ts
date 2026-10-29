import { qualifyReference, type ReferenceEvidence, type ScientificQualification } from "@/lib/scientificQualification";
import type { DbSnapshot } from "@/hooks/useCloudData";

export type ScientificOrigin = "direct_measurement" | "field_estimate" | "model_inference" | "coach_declared" | "unknown";
export interface PhysiologicalEvidence extends Partial<Omit<ReferenceEvidence, "value" | "unit" | "discipline" | "method" | "date">> {
  scientificQualification?: ScientificQualification;
  value: number;
  unit: string;
  discipline: "run" | "bike" | "swim" | "unknown";
  method: string | null;
  date: string | null; // test date; never silently replaced by storage date
  scientificOrigin: ScientificOrigin;
  storageSource: string | null;
  storageDate?: string | null;
  confidence: number | null;
  confidenceBasis: "extraction" | "heuristic" | "reported" | "unknown";
  errorMargin: number | null;
}
export type PhysiologicalEvidenceMap = Record<string, PhysiologicalEvidence>;
const MARKER = "TFCL_PHYSIOLOGY_V1:";
export function physiologyNarrative(notes: string | null | undefined): string {
  return (notes ?? "").split("\n").filter(line => !line.startsWith(MARKER)).join("\n").trim();
}

export function preservePhysiologyNotes(previous: string | null | undefined, next: string | null | undefined, changes: Partial<DbSnapshot> = {}): string {
  const incoming = metadataLines(next);
  if (incoming.length && (incoming.length !== 1 || !parseEnvelope(incoming[0]))) {
    throw new Error("Métadonnées physiologiques invalides — notes non sauvegardées.");
  }
  const metadata = incoming.length ? incoming : metadataLines(previous);
  const envelope = metadata.length === 1 ? parseEnvelope(metadata[0]) : null;
  let changed = false;
  if (envelope) {
    envelope.parameters = { ...envelope.parameters };
    for (const [field, parameter] of Object.entries(envelope.parameters)) {
      if (Object.prototype.hasOwnProperty.call(changes, field) && changes[field as keyof DbSnapshot] !== parameter.value) {
        delete envelope.parameters[field];
        changed = true;
      }
    }
  }
  if (next === undefined && !changed) return previous ?? "";
  return [next === undefined ? physiologyNarrative(previous) : physiologyNarrative(next),
    ...(changed ? [`${MARKER}${JSON.stringify(envelope)}`] : metadata)].filter(Boolean).join("\n");
}
const FIELDS = {
  vo2max: ["ml O2/kg/min", "unknown"], ftp: ["W", "bike"], vma: ["km/h", "run"],
  css: ["s/100m", "swim"], vlamax: ["mmol/L/s", "bike"], vlamax_run: ["mmol/L/s", "run"],
  tte_observed_min: ["min", "bike"], tte_observed_min_run: ["min", "run"],
  run_economy_score: ["score/100", "run"],
  weight_kg: ["kg", "unknown"], fat_pct: ["%", "unknown"], fc_max: ["bpm", "unknown"],
  pmax_5s: ["W", "bike"], p30s_w: ["W", "bike"], p60s_w: ["W", "bike"], map5min_w: ["W", "bike"],
} as const;
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

/** Existing predictor domain, no new score-to-cost conversion or extrapolation. */
export function validRunningEconomyCost(value: unknown): number | null {
  return finite(value) && value >= 150 && value <= 280 ? value : null;
}

interface Envelope {
  version: 1;
  date: string | null;
  storageSource: string;
  confidence: number | null;
  confidenceBasis: PhysiologicalEvidence["confidenceBasis"];
  parameters: Record<string, Pick<PhysiologicalEvidence, "value" | "unit" | "discipline"> & Partial<PhysiologicalEvidence>>;
}

const metadataLines = (notes: string | null | undefined) => (notes ?? "").split("\n").filter(line => line.startsWith(MARKER));
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
function parseEnvelope(line: string): Envelope | null {
  try {
    const value: unknown = JSON.parse(line.slice(MARKER.length));
    if (!record(value) || value.version !== 1 || !record(value.parameters)) return null;
    if (!Object.values(value.parameters).every(parameter => record(parameter) && finite(parameter.value) && typeof parameter.unit === "string")) return null;
    return value as unknown as Envelope;
  } catch { return null; }
}
function testDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : null;
}
const ownOr = <T>(parameter: Partial<PhysiologicalEvidence>, key: keyof PhysiologicalEvidence, fallback: T): unknown =>
  Object.prototype.hasOwnProperty.call(parameter, key) ? parameter[key] : fallback;

/** Persist in the existing notes field; no new DB column or migration. */
export function appendPhysiologyEvidence(notes: string, envelope: Envelope): string {
  const narrative = notes.split("\n").filter(line => !line.startsWith(MARKER)).join("\n");
  return `${narrative}\n${MARKER}${JSON.stringify(envelope)}`.trim();
}

function readSnapshotPhysiologyEvidence(snapshot: Partial<DbSnapshot> | null | undefined): PhysiologicalEvidenceMap {
  if (!snapshot) return {};
  const result: PhysiologicalEvidenceMap = {};
  for (const [field, [unit, discipline]] of Object.entries(FIELDS)) {
    const value = snapshot[field as keyof DbSnapshot];
    if (!finite(value)) continue;
    result[field] = { value, unit, discipline, method: null, date: null, scientificOrigin: "unknown",
      storageSource: snapshot.source ?? null, storageDate: snapshot.date ?? null, confidence: null, // Global snapshot confidence is not per-parameter scientific evidence.
      confidenceBasis: "unknown", errorMargin: null };
  }
  const lines = metadataLines(snapshot.coach_notes);
  if (lines.length !== 1) return result;
  const envelope = parseEnvelope(lines[0]);
  if (!envelope) return result;
  try {
    for (const [field, parameter] of Object.entries(envelope.parameters)) {
      if (!parameter || !finite(parameter.value) || typeof parameter.unit !== "string") continue;
      const definition = FIELDS[field as keyof typeof FIELDS];
      // An edited scalar must not inherit stale evidence from a previous value.
      if (definition && (snapshot[field as keyof DbSnapshot] !== parameter.value || parameter.unit !== definition[0])) continue;
      if (field === "runningEconomyCostMlKgKm" && (parameter.discipline !== "run" || parameter.unit !== "ml O2/kg/km" || validRunningEconomyCost(parameter.value) === null)) continue;
      const confidence = ownOr(parameter, "confidence", envelope.confidence);
      const date = ownOr(parameter, "date", envelope.date);
      const origin = parameter.scientificOrigin;
      const basis = ownOr(parameter, "confidenceBasis", envelope.confidenceBasis);
      const storageSource = ownOr(parameter, "storageSource", envelope.storageSource ?? snapshot.source ?? null);
      result[field] = {
        ...Object.fromEntries(["subjectId", "quantity", "sourceRef", "nature", "methodKind", "primaryMeasurementSourceRef", "documentedUncertainty"].filter(key => parameter[key] !== undefined).map(key => [key, parameter[key]])),
        value: parameter.value, unit: parameter.unit,
        discipline: ["run", "bike", "swim"].includes(parameter.discipline) ? parameter.discipline : "unknown",
        method: typeof parameter.method === "string" ? parameter.method : null,
        date: testDate(date),
        scientificOrigin: ["direct_measurement", "field_estimate", "model_inference", "coach_declared"].includes(origin) ? origin : "unknown",
        storageSource: typeof storageSource === "string" ? storageSource : null,
        storageDate: snapshot.date ?? null,
        confidence: finite(confidence) && confidence >= 0 && confidence <= 1 ? confidence : null,
        confidenceBasis: basis === "extraction" || basis === "heuristic" || basis === "reported" ? basis : "unknown",
        errorMargin: finite(parameter.errorMargin) && parameter.errorMargin >= 0 ? parameter.errorMargin : null,
      };
    }
  } catch { /* Unreadable metadata is unknown; never extract a cost from free text. */ }
  for (const field of ["vlamax", "vlamax_run"]) {
    const parameter = result[field];
    if (!parameter) continue;
    const qualification = qualifyReference(parameter, { subjectId: snapshot.athlete_id ?? "", quantity: "vlamax", discipline: field === "vlamax_run" ? "run" : "bike", value: parameter.value, unit: "mmol/L/s" });
    parameter.scientificQualification = qualification;
    parameter.scientificOrigin = qualification.status === "unknown" ? "unknown" : qualification.nature === "declared" ? "coach_declared" : qualification.nature === "estimated" ? "field_estimate" : "model_inference";
  }
  return result;
}

export function snapshotPhysiologyEvidence(
  snapshot: Partial<DbSnapshot> | null | undefined,
  references?: import("@/lib/effectiveRefs").EffectiveRefs,
): PhysiologicalEvidenceMap {
  const result = readSnapshotPhysiologyEvidence(snapshot);
  if (!references) return result;
  const keys = { weight_kg: "weightKg", fat_pct: "fatPct", fc_max: "fcMax", ftp: "ftp", css: "css", vma: "vma", vo2max: "vo2max" } as const;
  for (const [field, reference] of Object.entries(keys)) {
    const value = references[reference];
    if (value === null) { delete result[field]; continue; }
    if (references.sources[reference] !== "profile") continue;
    const [unit, discipline] = FIELDS[field];
    result[field] = { value, unit, discipline, date: null, method: null, scientificOrigin: "unknown",
      storageSource: "athlete.refs", storageDate: null, confidence: null, confidenceBasis: "unknown", errorMargin: null };
  }
  return result;
}

export function runningEconomyCostFromSnapshot(snapshot: Partial<DbSnapshot> | null | undefined): number | null {
  return validRunningEconomyCost(snapshotPhysiologyEvidence(snapshot).runningEconomyCostMlKgKm?.value);
}

export function diagnosticPhysiologicalEvidence(diagnostic: import("@/engines/diagnostic/types").AthleteDiagnostic): PhysiologicalEvidenceMap {
  const { vlamax, tte } = diagnostic.effectifs;
  const evidence = { ...(diagnostic._rawInput.physiologicalEvidence ?? {}) };
  for (const [field, discipline] of [["vlamax", "bike"], ["vlamax_run", "run"]] as const) {
    const parameter = evidence[field];
    if (!parameter) continue;
    const q = qualifyReference(parameter, { subjectId: diagnostic._rawInput.athleteId, quantity: "vlamax", discipline, value: field === "vlamax_run" ? diagnostic._rawInput.vlamaxRun : diagnostic._rawInput.vlamax, unit: "mmol/L/s" });
    evidence[field] = { ...parameter, scientificQualification: q, scientificOrigin: q.status === "unknown" ? "unknown" : q.nature === "declared" ? "coach_declared" : q.nature === "estimated" ? "field_estimate" : "model_inference" };
  }
  const cost = validRunningEconomyCost(diagnostic._rawInput.runningEconomyCostMlKgKm);
  if (cost !== null && !evidence.runningEconomyCostMlKgKm) evidence.runningEconomyCostMlKgKm = {
    value: cost, unit: "ml O2/kg/km", discipline: "run", method: null, date: null,
    scientificOrigin: "unknown", storageSource: null, confidence: null, confidenceBasis: "unknown", errorMargin: null,
  };
  const discipline = diagnostic.sportFocus === "run" ? "run" : "bike";
  const storedVLamax = evidence[discipline === "run" ? "vlamax_run" : "vlamax"];
  const matchingVLamax = vlamax.source === "snapshot" && vlamax.v2?.source === "test_labo"
    && storedVLamax?.value === vlamax.value && storedVLamax.discipline === discipline
    && storedVLamax.unit === "mmol/L/s" ? storedVLamax : null;
  const qualification = qualifyReference(vlamax.scientificQualification?.evidence ?? matchingVLamax, { subjectId: diagnostic._rawInput.athleteId, quantity: "vlamax", discipline, value: vlamax.value, unit: "mmol/L/s" });
  if (vlamax.value !== null) evidence.vlamaxEffective = {
    value: vlamax.value, unit: "mmol/L/s", discipline,
    method: qualification.method, date: qualification.observedAt,
    scientificOrigin: qualification.status === "unknown" ? "unknown" : qualification.nature === "declared" ? "coach_declared" : qualification.nature === "estimated" ? "field_estimate" : "model_inference",
    storageSource: matchingVLamax ? matchingVLamax.storageSource : null, confidence: vlamax.confidence, confidenceBasis: "heuristic",
    errorMargin: vlamax.errorMargin ?? null, scientificQualification: qualification,
  };
  if (tte.source !== "unknown") evidence.tteEffective = {
    value: tte.tte_min, unit: "min", discipline, method: tte.source, date: null,
    scientificOrigin: tte.source === "observed" ? "direct_measurement" : "model_inference",
    storageSource: null, confidence: tte.confidence, confidenceBasis: "heuristic", errorMargin: null,
  };
  return evidence;
}
