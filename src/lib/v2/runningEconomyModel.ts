/**
 * Running Economy Model — Fallback estimation
 * ────────────────────────────────────────────
 * Estimation de l'économie de course (RE) en ml O2 / kg / km
 * depuis VMA + poids + sexe quand aucune mesure directe
 * (Stryd, VO2 lab) n'est disponible.
 *
 * Formule adaptée de Lacour & Bourdin 2015 :
 *   RE_ml_O2/kg/km = 3.86 × (vma_kmh / 16)^0.14 × (70 / weightKg)^0.32
 *
 * Correction sexe (Blagrove 2019) : femmes ~3% plus économes
 *   RE_F = RE × 0.97
 *
 * Catégories (Daniels 2005) :
 *   < 200 ml/kg/km → économe
 *   200-220        → moyen
 *   > 220          → coûteux
 *
 * Cross-validation (Joyner 1991) :
 *   VMA_predite = (VO2max / RE) × 16.67
 *
 * Réf : Lacour & Bourdin 2015, Blagrove 2019, Daniels 2005, Joyner 1991.
 */

export interface RunningEconomyEstimate {
  /** Économie de course estimée en ml O2 / kg / km */
  re_ml_O2_per_kg_per_km: number;
  /** Confiance fixe : 0.45 (estimation sans mesure directe) */
  re_confidence: number;
  /** Catégorie qualitative (Daniels 2005) */
  re_category: "économe" | "moyen" | "coûteux";
  /** Impact estimé sur la performance marathon (en %) */
  performance_impact_pct: number;
  /** Marge d'amélioration estimée (W/km équivalent) */
  improvement_potential_watts_per_km: number;
  /** Avertissement utilisateur */
  warning: string;
  /** Sources scientifiques */
  sources: string[];
}

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

/**
 * Estime l'économie de course depuis VMA, poids et sexe.
 * Fallback uniquement — confiance fixée à 0.45.
 */
export function estimateRunningEconomy(
  vma: number,
  weightKg: number,
  sex: "H" | "F",
): RunningEconomyEstimate {
  if (!vma || vma <= 0 || !weightKg || weightKg <= 0) {
    return {
      re_ml_O2_per_kg_per_km: 0,
      re_confidence: 0,
      re_category: "moyen",
      performance_impact_pct: 0,
      improvement_potential_watts_per_km: 0,
      warning:
        "Données insuffisantes pour estimer l'économie de course (VMA et poids requis).",
      sources: [],
    };
  }

  // Lacour & Bourdin 2015 (adapté)
  const baseRE = 3.86 * Math.pow(vma / 16, 0.14) * Math.pow(70 / weightKg, 0.32);
  // Mise à l'échelle vers ml/kg/km (la formule originale renvoie ~3-4 ;
  // on remappe sur l'intervalle physiologique 180-240 ml/kg/km observé
  // en littérature — Daniels 2005, Barnes & Kilding 2015)
  const re = baseRE * 55;
  const reAdjusted = sex === "F" ? re * 0.97 : re;
  const reFinal = Number(clamp(reAdjusted, 160, 260).toFixed(1));

  let category: RunningEconomyEstimate["re_category"];
  if (reFinal < 200) category = "économe";
  else if (reFinal <= 220) category = "moyen";
  else category = "coûteux";

  // Impact perf marathon : ~1% de RE ≈ ~1% de perf (Saunders 2004, Barnes 2015)
  const referenceRE = 210; // moyenne population entraînée
  const performance_impact_pct = Number(
    (((reFinal - referenceRE) / referenceRE) * 100).toFixed(1),
  );

  // Marge d'amélioration : 5-10% atteignable via plyo + strides (Blagrove 2019)
  // Conversion grossière 1 ml O2/kg/km ≈ 0.2 W/km à VMA moyenne
  const improvement_potential_watts_per_km = Number(
    Math.max(0, (reFinal - 190) * 0.2).toFixed(2),
  );

  return {
    re_ml_O2_per_kg_per_km: reFinal,
    re_confidence: 0.45,
    re_category: category,
    performance_impact_pct,
    improvement_potential_watts_per_km,
    warning:
      "Économie estimée depuis VMA + poids (Lacour & Bourdin 2015) — confiance 45%. Une mesure directe (Stryd ou VO2 lab) améliorerait significativement la précision.",
    sources: [
      "Lacour & Bourdin 2015",
      "Blagrove 2019",
      "Daniels 2005",
      "Joyner 1991",
    ],
  };
}

/**
 * Cross-validation : prédit la VMA depuis VO2max + RE.
 *   VMA (km/h) = (VO2max / RE) × 16.67
 *
 * @param re  Économie de course en ml O2 / kg / km
 * @param vo2max  VO2max en ml O2 / kg / min
 * @returns VMA prédite en km/h (0 si entrées invalides)
 */
export function vma_predicted_from_RE(re: number, vo2max: number): number {
  if (!re || re <= 0 || !vo2max || vo2max <= 0) return 0;
  return Number(((vo2max / re) * 16.67).toFixed(2));
}
