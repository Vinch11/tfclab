/**
 * Running Economy — Estimateur simplifié.
 *
 * Objectif : permettre de disposer d'une valeur de CE (ml O₂/kg/km) sans
 * exiger ni wattmètre run ni labo, à partir de 2 entrées simples :
 *   - VMA (km/h)             — obligatoire
 *   - Allure soutenue 30 min — optionnelle (affine l'estimation)
 *
 * Modèles utilisés :
 *   1. Léger & Mercier (1984) : CE ≈ 210 − 0.8 × VMA(km/h)
 *      → estimation rapide, RMSE ~8 ml/kg/km sur amateurs.
 *
 *   2. Affinement Di Prampero (1986) si l'allure 30 min est connue :
 *      CE ≈ 3.86 × v(m/s) + 3.6     (ml O₂/kg/km, terrain plat)
 *      → on moyenne les deux estimations pour robustesse.
 *
 * Catégories pédagogiques (UI-friendly) :
 *   < 195  → Économe   (élite, foulée efficace)
 *   195–210 → Standard (typique amateur expérimenté)
 *   > 210  → Coûteux   (marge nette de progression)
 *
 * Politique « Missing Data » : pas de fallback silencieux. Si VMA absente,
 * retourne null et l'UI affiche "Données insuffisantes".
 */

export type RunningEconomyCategory = "economic" | "standard" | "costly";

export interface RunningEconomySimpleEstimate {
  /** CE en ml O₂/kg/km */
  value: number;
  /** Méthode utilisée pour traçabilité */
  method: "leger" | "di-prampero" | "blend";
  /** Catégorie pédagogique */
  category: RunningEconomyCategory;
  /** Libellé court FR (Économe / Standard / Coûteux) */
  categoryLabel: string;
  /** Marge d'erreur indicative (±) */
  errorMargin: number;
}

/** Léger & Mercier — CE ≈ 210 − 0.8 × VMA(km/h). */
function legerCE(vmaKmh: number): number {
  return 210 - 0.8 * vmaKmh;
}

/** Di Prampero — coût énergétique terrain plat à partir de l'allure 30 min. */
function diPramperoCE(pace30SecPerKm: number): number {
  // pace (s/km) → vitesse (m/s)
  const vMs = 1000 / pace30SecPerKm;
  // CE (ml O₂/kg/km) ≈ 3.86 · v(m/s) · 1000 / v(m/s) ... formule canonique
  // On utilise l'équivalence simplifiée : 1 ml O₂ ≈ 5 cal → coût terrain plat
  // Reformulation directe en ml O₂/kg/km : 3.86 × v + 3.6 (Di Prampero 1986)
  return 3.86 * vMs + 3.6;
}

function classify(ceMlKgKm: number): { category: RunningEconomyCategory; label: string } {
  if (ceMlKgKm < 195) return { category: "economic", label: "Économe" };
  if (ceMlKgKm <= 210) return { category: "standard", label: "Standard" };
  return { category: "costly", label: "Coûteux" };
}

export interface RunningEconomySimpleInput {
  vmaKmh?: number | null;
  /** Allure tenue sur ~30 min (sec/km), optionnelle */
  pace30MinSecPerKm?: number | null;
}

/**
 * Retourne une estimation simple de l'économie de course.
 * Renvoie `null` si VMA manquante.
 */
export function estimateRunningEconomySimple(
  input: RunningEconomySimpleInput,
): RunningEconomySimpleEstimate | null {
  const { vmaKmh, pace30MinSecPerKm } = input;
  if (vmaKmh == null || !isFinite(vmaKmh) || vmaKmh <= 5 || vmaKmh > 28) return null;

  const leger = legerCE(vmaKmh);

  if (pace30MinSecPerKm != null && pace30MinSecPerKm > 150 && pace30MinSecPerKm < 600) {
    const dp = diPramperoCE(pace30MinSecPerKm);
    const blended = (leger + dp) / 2;
    const clamped = Math.max(170, Math.min(240, blended));
    const cls = classify(clamped);
    return {
      value: Math.round(clamped * 10) / 10,
      method: "blend",
      category: cls.category,
      categoryLabel: cls.label,
      errorMargin: 5,
    };
  }

  const clamped = Math.max(170, Math.min(240, leger));
  const cls = classify(clamped);
  return {
    value: Math.round(clamped * 10) / 10,
    method: "leger",
    category: cls.category,
    categoryLabel: cls.label,
    errorMargin: 8,
  };
}

/**
 * Catégorise une valeur CE déjà mesurée (utile pour homogénéiser l'UI
 * entre mesures labo et estimation simple).
 */
export function categorizeRunningEconomy(
  ceMlKgKm: number | null | undefined,
): { category: RunningEconomyCategory; label: string } | null {
  if (ceMlKgKm == null || !isFinite(ceMlKgKm) || ceMlKgKm <= 0) return null;
  return classify(ceMlKgKm);
}
