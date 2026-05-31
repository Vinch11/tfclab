/**
 * Repères de comparaison à une cohorte de référence.
 *
 * Les scores readiness sont normalisés 0-100 où 100 = cible de l'ambition
 * choisie. Les seuils ci-dessous indiquent, pour cette même ambition,
 * où se situe statistiquement un athlète "moyen" et le seuil
 * "au-dessus de la moyenne" (top ~30%).
 *
 * Source : calibrage interne TFCL (cohorte coachs + littérature
 * Mader/Billat — voir mem://features/literature-cohort-extraction).
 */

export interface PeerReference {
  peerAvg: number;       // score "athlète médian" à ce niveau d'ambition
  peerAbove: number;     // seuil "au-dessus de la moyenne" (top ~30%)
  cohortLabel: string;   // texte court affiché dans la légende
}

export function getPeerReference(ambition: string): PeerReference {
  const a = (ambition || "").toLowerCase();
  if (a.includes("world") || a.includes("monde") || a === "wc" || a.includes("world_class") || a.includes("worldclass")) {
    return { peerAvg: 90, peerAbove: 96, cohortLabel: "World Class (Top 3% AG)" };
  }
  if (a.includes("elite") || a.includes("pro")) {
    return { peerAvg: 82, peerAbove: 92, cohortLabel: "Élite / Pro" };
  }
  if (a.includes("podium") || a.includes("top")) {
    return { peerAvg: 75, peerAbove: 88, cohortLabel: "Compétiteurs podium" };
  }
  if (a.includes("perf") || a.includes("competit") || a.includes("ambit")) {
    return { peerAvg: 65, peerAbove: 80, cohortLabel: "Compétiteurs ambitieux" };
  }
  if (a.includes("finish") || a.includes("loisir") || a.includes("decouv")) {
    return { peerAvg: 55, peerAbove: 70, cohortLabel: "Finishers / Loisir" };
  }
  // âge-groupe / défaut
  return { peerAvg: 62, peerAbove: 78, cohortLabel: "Athlètes similaires" };
}

export function peerVerdict(
  score: number,
  ref: PeerReference,
): { label: string; tone: "above" | "around" | "below" } {
  if (score >= ref.peerAbove) return { label: "Au-dessus de la moyenne", tone: "above" };
  if (score >= ref.peerAvg - 5) return { label: "Dans la moyenne", tone: "around" };
  return { label: "Sous la moyenne", tone: "below" };
}
