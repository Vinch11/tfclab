// Mapping pédagogique du score de readiness en verdict qualitatif.
// Remplace l'affichage du pourcentage global en en-tête (UI + PDF).

export interface ReadinessVerdict {
  label: string;       // ex: "En feu"
  emoji: string;       // ex: "🔥"
  tagline: string;     // ex: "ça va faire mal à la concurrence"
}

export function getReadinessVerdict(scorePct: number): ReadinessVerdict {
  if (scorePct >= 90) return { label: "En feu",                emoji: "🔥", tagline: "ça va faire mal à la concurrence" };
  if (scorePct >= 75) return { label: "Prêt",                  emoji: "✅", tagline: "exécute ton plan avec confiance" };
  if (scorePct >= 60) return { label: "Prêt avec réserves",    emoji: "🟡", tagline: "reste lucide sur les zones fragiles" };
  if (scorePct >= 45) return { label: "Moyennement prêt",      emoji: "🟠", tagline: "vise la gestion, pas la performance" };
  return                        { label: "Mieux vaudrait reporter", emoji: "🔴", tagline: "risque élevé d'échec ou de blessure" };
}
