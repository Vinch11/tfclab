import type { DbSnapshot } from "@/hooks/useCloudData";

export type ScientificOrigin = "direct_measurement" | "field_estimate" | "model_inference" | "coach_declared" | "unknown";
export interface PhysiologicalEvidence {
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

export function preservePhysiologyNotes(previous: string | null | undefined, next: string | null | undefined): string {
  if (next?.split("\n").some(line => line.startsWith(MARKER))) return next;
  const metadata = previous?.split("\n").find(line => line.startsWith(MARKER));
  return [next ?? "", metadata].filter(Boolean).join("\n");
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
      storageSource: snapshot.source ?? null, storageDate: snapshot.date ?? null, confidence: finite(snapshot.confidence) ? snapshot.confidence : null,
      confidenceBasis: "unknown", errorMargin: null };
  }
  const line = snapshot.coach_notes?.split("\n").find(line => line.startsWith(MARKER));
  if (!line) return result;
  try {
    const envelope = JSON.parse(line.slice(MARKER.length)) as Envelope;
    if (envelope.version !== 1 || !envelope.parameters || typeof envelope.parameters !== "object") return result;
    for (const [field, parameter] of Object.entries(envelope.parameters)) {
      if (!parameter || !finite(parameter.value) || typeof parameter.unit !== "string") continue;
      const definition = FIELDS[field as keyof typeof FIELDS];
      // An edited scalar must not inherit stale evidence from a previous value.
      if (definition && (snapshot[field as keyof DbSnapshot] !== parameter.value || parameter.unit !== definition[0])) continue;
      if (field === "runningEconomyCostMlKgKm" && (parameter.discipline !== "run" || parameter.unit !== "ml O2/kg/km" || validRunningEconomyCost(parameter.value) === null)) continue;
      const confidence = parameter.confidence ?? envelope.confidence;
      const date = parameter.date ?? envelope.date;
      const origin = parameter.scientificOrigin;
      const basis = parameter.confidenceBasis ?? envelope.confidenceBasis;
      result[field] = {
        value: parameter.value, unit: parameter.unit,
        discipline: ["run", "bike", "swim"].includes(parameter.discipline) ? parameter.discipline : "unknown",
        method: typeof parameter.method === "string" ? parameter.method : null,
        date: typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
        scientificOrigin: ["direct_measurement", "field_estimate", "model_inference", "coach_declared"].includes(origin) ? origin : "unknown",
        storageSource: envelope.storageSource ?? snapshot.source ?? null,
        storageDate: snapshot.date ?? null,
        confidence: finite(confidence) && confidence >= 0 && confidence <= 1 ? confidence : null,
        confidenceBasis: ["extraction", "heuristic", "reported"].includes(basis) ? basis : "unknown",
        errorMargin: finite(parameter.errorMargin) && parameter.errorMargin >= 0 ? parameter.errorMargin : null,
      };
    }
  } catch { /* Unreadable metadata is unknown; never extract a cost from free text. */ }
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
  const cost = validRunningEconomyCost(diagnostic._rawInput.runningEconomyCostMlKgKm);
  if (cost !== null && !evidence.runningEconomyCostMlKgKm) evidence.runningEconomyCostMlKgKm = {
    value: cost, unit: "ml O2/kg/km", discipline: "run", method: null, date: null,
    scientificOrigin: "unknown", storageSource: null, confidence: null, confidenceBasis: "unknown", errorMargin: null,
  };
  const discipline = diagnostic.sportFocus === "run" ? "run" : "bike";
  if (vlamax.value !== null) evidence.vlamaxEffective = {
    value: vlamax.value, unit: "mmol/L/s", discipline,
    method: vlamax.v2?.source ?? vlamax.details?.protocol ?? null, date: vlamax.details?.date ?? null,
    scientificOrigin: vlamax.v2?.source === "test_labo" ? "direct_measurement" : ["test_terrain", "semaine_reference"].includes(vlamax.v2?.source) ? "field_estimate" : "model_inference",
    storageSource: vlamax.source, confidence: vlamax.confidence, confidenceBasis: "heuristic",
    errorMargin: vlamax.errorMargin ?? null,
  };
  if (tte.source !== "unknown") evidence.tteEffective = {
    value: tte.tte_min, unit: "min", discipline, method: tte.source, date: null,
    scientificOrigin: tte.source === "observed" ? "direct_measurement" : "model_inference",
    storageSource: null, confidence: tte.confidence, confidenceBasis: "heuristic", errorMargin: null,
  };
  return evidence;
}
