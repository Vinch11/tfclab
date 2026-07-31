/**
 * DURABILITÉ SOUS-MAXIMALE — Découplage aérobie (Pw:HR / Pa:HR)
 * ------------------------------------------------------------
 * Objectif : répondre à la question « la durabilité est-elle un verrou ? »
 * SANS test jusqu'à l'épuisement.
 *
 * Principe (Coggan/Friel — Aerobic Decoupling ; Maunder 2021 — durability) :
 * sur un effort continu sous-maximal (Z2 stricte, 60–90 min), on compare le
 * ratio puissance/FC (vélo) ou allure/FC (CAP) entre la 1re et la 2e moitié.
 * Une dérive du couplage traduit une perte d'efficience à charge constante,
 * marqueur reconnu de faible durabilité.
 *
 * ⚠️ Ce module NE PRODUIT PAS de TTE chiffré et n'écrit JAMAIS dans
 * `tte_observed_min` / `tte_observed_min_run`. Il fournit une lecture
 * QUALITATIVE (limitant / suspect / non limitant) destinée au moteur de
 * limiteurs et à l'affichage.
 */

export type DurabilityVerdict = "non_limiting" | "watch" | "limiting" | "unknown";

export interface DecouplingInput {
  /** Puissance moyenne (W) ou vitesse moyenne (m/s) — 1re moitié */
  output1: number | null;
  /** FC moyenne (bpm) — 1re moitié */
  hr1: number | null;
  /** Puissance moyenne (W) ou vitesse moyenne (m/s) — 2e moitié */
  output2: number | null;
  /** FC moyenne (bpm) — 2e moitié */
  hr2: number | null;
}

export interface DecouplingResult {
  /** Découplage en % (positif = perte d'efficience) */
  decouplingPct: number | null;
  verdict: DurabilityVerdict;
  label: string;
  /** Confiance de la lecture qualitative (0-1) */
  confidence: number;
  explanation: string;
}

/** Seuils de lecture (littérature Coggan / Maunder) */
export const DECOUPLING_THRESHOLDS = {
  /** < 5 % : couplage stable → durabilité non limitante */
  stable: 5,
  /** 5–8 % : zone grise → à surveiller */
  watch: 8,
} as const;

/**
 * Calcule le découplage aérobie à partir des deux demi-efforts.
 * Retourne `null` si les données sont insuffisantes (politique projet :
 * aucune valeur neutre inventée).
 */
export function computeDecouplingPct(input: DecouplingInput): number | null {
  const { output1, hr1, output2, hr2 } = input;
  if (!output1 || !hr1 || !output2 || !hr2) return null;
  if (output1 <= 0 || hr1 <= 0 || output2 <= 0 || hr2 <= 0) return null;

  const ratio1 = output1 / hr1;
  const ratio2 = output2 / hr2;
  if (ratio1 <= 0) return null;

  return ((ratio1 - ratio2) / ratio1) * 100;
}

/**
 * Traduit un découplage en verdict qualitatif de durabilité.
 *
 * @param decouplingPct découplage en %
 * @param durationMin durée totale de l'effort (module la confiance :
 *                    <45 min = signal trop court, ≥75 min = signal robuste)
 * @param protocolValid conditions de validité respectées (Z2 stricte, nutrition, chaleur…)
 */
export function interpretDecoupling(
  decouplingPct: number | null,
  durationMin?: number | null,
  protocolValid = true,
): DecouplingResult {
  if (decouplingPct === null || !Number.isFinite(decouplingPct)) {
    return {
      decouplingPct: null,
      verdict: "unknown",
      label: "Données insuffisantes",
      confidence: 0,
      explanation:
        "Découplage non calculable : puissance/allure et FC des deux demi-efforts requises.",
    };
  }

  const d = decouplingPct;
  let verdict: DurabilityVerdict;
  let label: string;
  let explanation: string;

  if (d < DECOUPLING_THRESHOLDS.stable) {
    verdict = "non_limiting";
    label = "Durabilité non limitante";
    explanation =
      "Couplage puissance/FC stable sur toute la durée : la base aérobie tient la charge. La durabilité n'est pas le verrou prioritaire.";
  } else if (d <= DECOUPLING_THRESHOLDS.watch) {
    verdict = "watch";
    label = "Durabilité à surveiller";
    explanation =
      "Découplage modéré : efficience légèrement dégradée en seconde moitié. À recontrôler avant d'en faire un axe de travail dominant.";
  } else {
    verdict = "limiting";
    label = "Durabilité limitante";
    explanation =
      "Découplage marqué à charge constante : perte d'efficience nette. La durabilité est un verrou — travail de volume Z2 et de longues sorties spécifiques prioritaire.";
  }

  // Confiance : durée du signal × validité du protocole
  let confidence = 0.55;
  if (durationMin != null) {
    if (durationMin >= 75) confidence = 0.8;
    else if (durationMin >= 60) confidence = 0.7;
    else if (durationMin >= 45) confidence = 0.55;
    else confidence = 0.35;
  }
  if (!protocolValid) confidence = Math.max(0.2, confidence - 0.25);

  return { decouplingPct: d, verdict, label, confidence, explanation };
}

/** Couleur UI associée au verdict */
export function getDurabilityVerdictColor(verdict: DurabilityVerdict): string {
  switch (verdict) {
    case "non_limiting":
      return "text-green-600 dark:text-green-400";
    case "watch":
      return "text-amber-600 dark:text-amber-400";
    case "limiting":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-muted-foreground";
  }
}
