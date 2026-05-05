/**
 * Déduit `sport_main` depuis l'objectif athlète.
 * Évite que des coureurs purs aient sport_main='bike' (défaut DB).
 */
export function deduceSportMainFromGoal(goal?: string | null): "run" | "bike" | "tri" | null {
  if (!goal) return null;
  const g = goal.toLowerCase();
  if (
    g === "semi" ||
    g === "marathon" ||
    g === "starttorun" ||
    g === "5k" ||
    g === "10k" ||
    g.startsWith("trail") ||
    g.includes("ultra")
  ) {
    return "run";
  }
  if (g === "im" || g === "703") return "tri";
  return "bike";
}

const RUN_GOALS = new Set(["semi", "marathon", "starttorun", "5k", "10k"]);
const TRI_GOALS = new Set(["im", "703"]);

/**
 * Vérifie si sport_main est incohérent avec l'objectif.
 * Retourne null si cohérent, sinon { expected, actual }.
 */
export function checkSportGoalCoherence(
  sportMain?: string | null,
  goal?: string | null
): { expected: "run" | "bike" | "tri"; actual: string } | null {
  if (!goal || !sportMain) return null;
  const expected = deduceSportMainFromGoal(goal);
  if (!expected) return null;
  const actual = sportMain.toLowerCase();
  // Normalise "velo" → "bike"
  const actualNorm = actual === "velo" ? "bike" : actual;
  if (expected === actualNorm) return null;
  return { expected, actual: sportMain };
}
