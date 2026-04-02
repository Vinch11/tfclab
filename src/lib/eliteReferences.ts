/**
 * Elite reference benchmarks for plan comparison
 * Data sourced from the TFCL™ adaptive progression matrix
 */

export interface EliteReference {
  objective: string;
  ambition: string;
  label: string;
  weeklyHours: [number, number];       // min-max
  weeklyKmRun: [number, number];       // min-max
  sessionsPerWeek: [number, number];
  doublesPerWeek: [number, number];
  keySessions: [number, number];
  progressionPct: [number, number];
  loadPattern: string;                 // "3:1" or "2:1"
  swimPct?: [number, number];          // triathlon only
  bikePct?: [number, number];
  runPct?: [number, number];
  longRunMax?: string;                 // e.g. "35-38km" or "3.5-4h vélo"
}

const ELITE_REFS: EliteReference[] = [
  // ELITE
  { objective: "IM", ambition: "ELITE", label: "Ironman Élite", weeklyHours: [20, 30], weeklyKmRun: [50, 70], sessionsPerWeek: [12, 16], doublesPerWeek: [8, 12], keySessions: [3, 4], progressionPct: [5, 8], loadPattern: "3:1", swimPct: [15, 20], bikePct: [45, 55], runPct: [25, 35], longRunMax: "5-6h vélo" },
  { objective: "703", ambition: "ELITE", label: "70.3 Élite", weeklyHours: [15, 22], weeklyKmRun: [50, 70], sessionsPerWeek: [10, 14], doublesPerWeek: [5, 8], keySessions: [3, 3], progressionPct: [5, 8], loadPattern: "3:1", swimPct: [15, 20], bikePct: [40, 50], runPct: [30, 40], longRunMax: "3.5-4h vélo" },
  { objective: "Marathon", ambition: "ELITE", label: "Marathon Élite", weeklyHours: [12, 16], weeklyKmRun: [140, 190], sessionsPerWeek: [10, 13], doublesPerWeek: [4, 6], keySessions: [3, 3], progressionPct: [5, 8], loadPattern: "3:1", longRunMax: "35-38km" },
  { objective: "Semi", ambition: "ELITE", label: "Semi Élite", weeklyHours: [10, 14], weeklyKmRun: [100, 140], sessionsPerWeek: [8, 11], doublesPerWeek: [3, 5], keySessions: [3, 3], progressionPct: [5, 8], loadPattern: "3:1", longRunMax: "22-25km" },
  { objective: "10K", ambition: "ELITE", label: "10K Élite", weeklyHours: [9, 12], weeklyKmRun: [120, 160], sessionsPerWeek: [8, 10], doublesPerWeek: [3, 5], keySessions: [2, 3], progressionPct: [5, 7], loadPattern: "3:1", longRunMax: "20-22km" },

  // COMPETITOR
  { objective: "IM", ambition: "COMPETITOR", label: "Ironman Compétiteur", weeklyHours: [14, 20], weeklyKmRun: [35, 55], sessionsPerWeek: [8, 12], doublesPerWeek: [4, 7], keySessions: [2, 3], progressionPct: [5, 7], loadPattern: "3:1", swimPct: [15, 20], bikePct: [45, 55], runPct: [25, 35], longRunMax: "4-5h vélo" },
  { objective: "703", ambition: "COMPETITOR", label: "70.3 Compétiteur", weeklyHours: [10, 16], weeklyKmRun: [40, 60], sessionsPerWeek: [7, 10], doublesPerWeek: [3, 5], keySessions: [2, 3], progressionPct: [5, 7], loadPattern: "3:1", swimPct: [15, 20], bikePct: [40, 50], runPct: [30, 40], longRunMax: "3-3.5h vélo" },
  { objective: "Marathon", ambition: "COMPETITOR", label: "Marathon Compétiteur", weeklyHours: [8, 12], weeklyKmRun: [80, 130], sessionsPerWeek: [7, 10], doublesPerWeek: [1, 3], keySessions: [2, 3], progressionPct: [5, 7], loadPattern: "3:1", longRunMax: "30-35km" },
  { objective: "Semi", ambition: "COMPETITOR", label: "Semi Compétiteur", weeklyHours: [7, 10], weeklyKmRun: [60, 100], sessionsPerWeek: [6, 8], doublesPerWeek: [1, 2], keySessions: [2, 2], progressionPct: [5, 7], loadPattern: "3:1", longRunMax: "18-22km" },
  { objective: "10K", ambition: "COMPETITOR", label: "10K Compétiteur", weeklyHours: [6, 9], weeklyKmRun: [60, 100], sessionsPerWeek: [5, 7], doublesPerWeek: [1, 2], keySessions: [2, 2], progressionPct: [5, 5], loadPattern: "3:1", longRunMax: "16-20km" },

  // AGE_GROUP
  { objective: "IM", ambition: "AGE_GROUP", label: "Ironman Age Group", weeklyHours: [10, 15], weeklyKmRun: [25, 40], sessionsPerWeek: [6, 9], doublesPerWeek: [1, 3], keySessions: [2, 2], progressionPct: [3, 5], loadPattern: "3:1", swimPct: [15, 20], bikePct: [45, 55], runPct: [25, 30], longRunMax: "3.5-4h vélo" },
  { objective: "703", ambition: "AGE_GROUP", label: "70.3 Age Group", weeklyHours: [8, 12], weeklyKmRun: [30, 45], sessionsPerWeek: [5, 8], doublesPerWeek: [0, 2], keySessions: [2, 2], progressionPct: [3, 5], loadPattern: "3:1", swimPct: [15, 20], bikePct: [40, 50], runPct: [30, 40], longRunMax: "2.5-3h vélo" },
  { objective: "Marathon", ambition: "AGE_GROUP", label: "Marathon Age Group", weeklyHours: [6, 9], weeklyKmRun: [50, 80], sessionsPerWeek: [5, 7], doublesPerWeek: [0, 1], keySessions: [2, 2], progressionPct: [3, 5], loadPattern: "3:1", longRunMax: "25-30km" },
  { objective: "Semi", ambition: "AGE_GROUP", label: "Semi Age Group", weeklyHours: [5, 7], weeklyKmRun: [40, 65], sessionsPerWeek: [4, 6], doublesPerWeek: [0, 0], keySessions: [2, 2], progressionPct: [3, 5], loadPattern: "3:1", longRunMax: "16-18km" },
  { objective: "10K", ambition: "AGE_GROUP", label: "10K Age Group", weeklyHours: [4, 6], weeklyKmRun: [35, 55], sessionsPerWeek: [4, 5], doublesPerWeek: [0, 0], keySessions: [1, 2], progressionPct: [3, 5], loadPattern: "3:1", longRunMax: "14-16km" },

  // FINISHER
  { objective: "IM", ambition: "FINISHER", label: "Ironman Finisher", weeklyHours: [8, 12], weeklyKmRun: [20, 35], sessionsPerWeek: [5, 7], doublesPerWeek: [0, 0], keySessions: [1, 2], progressionPct: [3, 3], loadPattern: "2:1", swimPct: [15, 20], bikePct: [45, 55], runPct: [25, 30], longRunMax: "3h vélo" },
  { objective: "703", ambition: "FINISHER", label: "70.3 Finisher", weeklyHours: [6, 10], weeklyKmRun: [25, 40], sessionsPerWeek: [4, 6], doublesPerWeek: [0, 0], keySessions: [1, 2], progressionPct: [3, 3], loadPattern: "2:1", swimPct: [15, 20], bikePct: [40, 50], runPct: [30, 40], longRunMax: "2h vélo" },
  { objective: "Marathon", ambition: "FINISHER", label: "Marathon Finisher", weeklyHours: [4, 7], weeklyKmRun: [35, 60], sessionsPerWeek: [4, 5], doublesPerWeek: [0, 0], keySessions: [1, 2], progressionPct: [3, 3], loadPattern: "2:1", longRunMax: "22-25km" },
  { objective: "Semi", ambition: "FINISHER", label: "Semi Finisher", weeklyHours: [3, 5], weeklyKmRun: [25, 45], sessionsPerWeek: [3, 4], doublesPerWeek: [0, 0], keySessions: [1, 1], progressionPct: [3, 3], loadPattern: "2:1", longRunMax: "14-16km" },
  { objective: "10K", ambition: "FINISHER", label: "10K Finisher", weeklyHours: [3, 4], weeklyKmRun: [20, 35], sessionsPerWeek: [3, 4], doublesPerWeek: [0, 0], keySessions: [1, 1], progressionPct: [3, 3], loadPattern: "2:1", longRunMax: "12km" },
];

/** Normalize objective labels to match reference keys */
function normalizeObjective(obj: string): string {
  const lower = obj.toLowerCase();
  if (lower.includes("ironman") && !lower.includes("70")) return "IM";
  if (lower.includes("70.3") || lower === "703") return "703";
  if (lower.includes("marathon") && !lower.includes("semi")) return "Marathon";
  if (lower.includes("semi")) return "Semi";
  if (lower.includes("10")) return "10K";
  return obj;
}

function normalizeAmbition(amb: string): string {
  const upper = amb.toUpperCase().replace(/[^A-Z_]/g, "");
  if (upper.includes("ELITE")) return "ELITE";
  if (upper.includes("COMPET") || upper.includes("COMPETITOR")) return "COMPETITOR";
  if (upper.includes("AGE") || upper.includes("GROUP")) return "AGE_GROUP";
  if (upper.includes("FINISH")) return "FINISHER";
  return upper;
}

export function getEliteReference(objective: string, ambition: string): EliteReference | null {
  const normObj = normalizeObjective(objective);
  const normAmb = normalizeAmbition(ambition);
  return ELITE_REFS.find(r => r.objective === normObj && r.ambition === normAmb) || null;
}

/** Get the elite-level reference for the same objective (for upward comparison) */
export function getEliteCeilingReference(objective: string): EliteReference | null {
  const normObj = normalizeObjective(objective);
  return ELITE_REFS.find(r => r.objective === normObj && r.ambition === "ELITE") || null;
}

export type { EliteReference as EliteRef };
