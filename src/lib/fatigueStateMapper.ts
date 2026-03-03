// =============================================
// FATIGUE STATE MAPPER
// Canonical values from snapshot form: fresh, ok, fatigued, high, injured
// =============================================

/** Canonical fatigue states stored in snapshot.fatigue_state */
export type FatigueState = "fresh" | "ok" | "fatigued" | "high" | "injured";

/** Map raw fatigue_state string to canonical value */
export function normalizeFatigueState(raw: string | null | undefined): FatigueState {
  if (!raw) return "ok";
  const v = raw.toLowerCase().trim();
  if (v === "fresh" || v === "frais") return "fresh";
  if (v === "ok" || v === "normal" || v === "moderate" || v === "modéré") return "ok";
  if (v === "fatigued" || v === "fatigué") return "fatigued";
  if (v === "high" || v === "élevé") return "high";
  if (v === "injured" || v === "blessé") return "injured";
  return "ok";
}

/** Map fatigue_state to DRE 3-level scale (fresh/normal/fatigued) */
export function fatigueStateToDRE(state: FatigueState): "fresh" | "normal" | "fatigued" {
  switch (state) {
    case "fresh": return "fresh";
    case "ok": return "normal";
    case "fatigued": return "fatigued";
    case "high": return "fatigued";
    case "injured": return "fatigued";
  }
}

/** Map fatigue_state to perceived form score (1-10, high = good form) for suggestion engine */
export function fatigueStateToScore(state: FatigueState): number {
  switch (state) {
    case "fresh": return 9;
    case "ok": return 6;
    case "fatigued": return 4;
    case "high": return 2;
    case "injured": return 1;
  }
}

/** Map fatigue_state to fatigue index (0-100, high = more fatigued) */
export function fatigueStateToIndex(state: FatigueState): number {
  switch (state) {
    case "fresh": return 15;
    case "ok": return 40;
    case "fatigued": return 60;
    case "high": return 80;
    case "injured": return 95;
  }
}

/** Map fatigue_state to display level string */
export function fatigueStateToLevel(state: FatigueState): string {
  switch (state) {
    case "fresh": return "FAIBLE";
    case "ok": return "MODERE";
    case "fatigued": return "MODERE_HAUT";
    case "high": return "ELEVE";
    case "injured": return "CRITIQUE";
  }
}

/** Map fatigue_state to suggestion engine status */
export function fatigueStateToStatus(state: FatigueState): "low" | "moderate" | "high" | "unknown" {
  switch (state) {
    case "fresh": return "low";
    case "ok": return "moderate";
    case "fatigued": return "moderate";
    case "high": return "high";
    case "injured": return "high";
  }
}
