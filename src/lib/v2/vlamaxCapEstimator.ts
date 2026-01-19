/**
 * VLamax CAP Estimator
 * Estimation automatique de VLamax course à pied basée sur VMA, CSS et pace seuil
 * 
 * Sources scientifiques:
 * - Ratio CSS/VMA reflète la durabilité et l'économie anaérobie
 * - TTE CAP cross-valide l'estimation
 */

export interface VLamaxCapEstimateInput {
  vma: number | null;              // VMA en km/h
  css: number | null;              // Critical Swim Speed ou pace seuil (sec/km)
  paceThreshold?: number | null;   // Pace seuil (sec/km) - alternatif à CSS
  tteMin?: number | null;          // Time to Exhaustion en minutes
}

export interface VLamaxCapEstimate {
  value: number;
  confidence: number;
  sources: string[];
  method: string;
}

const clamp = (val: number, min: number, max: number): number => 
  Math.max(min, Math.min(max, val));

/**
 * Estime VLamax CAP à partir des données de course à pied
 * Méthode principale : ratio CSS/VMA (durabilité)
 */
export function estimateVLamaxCap(input: VLamaxCapEstimateInput): VLamaxCapEstimate {
  const { vma, css, paceThreshold, tteMin } = input;
  const sources: string[] = [];
  const estimates: { value: number; weight: number }[] = [];

  // Méthode 1: Ratio CSS/VMA (méthode principale)
  const effectivePace = css || paceThreshold;
  
  if (vma !== null && vma > 0 && effectivePace !== null && effectivePace > 0) {
    // Convertir pace (sec/km) en vitesse (km/h)
    const paceKmh = 3600 / effectivePace;
    const ratio = paceKmh / vma;
    
    /**
     * Interprétation du ratio:
     * - ratio ≥ 0.92 → VLamax très basse (excellent endurance)
     * - ratio 0.85-0.92 → VLamax basse à modérée
     * - ratio 0.78-0.85 → VLamax modérée
     * - ratio < 0.78 → VLamax élevée (profil glycolytique)
     */
    let estimated: number;
    if (ratio >= 0.92) estimated = 0.28;
    else if (ratio >= 0.88) estimated = 0.34;
    else if (ratio >= 0.85) estimated = 0.40;
    else if (ratio >= 0.82) estimated = 0.46;
    else if (ratio >= 0.78) estimated = 0.52;
    else if (ratio >= 0.74) estimated = 0.58;
    else estimated = 0.65;
    
    estimates.push({ value: estimated, weight: 0.70 });
    sources.push("Ratio CSS/VMA");
  }

  // Méthode 2: VMA seule (fallback basique)
  if (vma !== null && vma > 0 && estimates.length === 0) {
    /**
     * VMA seule est un indicateur indirect:
     * - VMA élevée (>20) → souvent VLamax modérée à basse
     * - VMA modérée (16-20) → profil variable
     * - VMA faible (<16) → profil variable, estimation conservatrice
     */
    let estimated: number;
    if (vma >= 22) estimated = 0.38;
    else if (vma >= 20) estimated = 0.42;
    else if (vma >= 18) estimated = 0.45;
    else if (vma >= 16) estimated = 0.48;
    else estimated = 0.50;
    
    estimates.push({ value: estimated, weight: 0.40 });
    sources.push("VMA seule");
  }

  // Modificateur TTE si disponible
  if (tteMin !== null && tteMin > 0 && estimates.length > 0) {
    /**
     * TTE long → VLamax plus basse
     * TTE court → VLamax plus haute
     */
    let modifier = 0;
    if (tteMin >= 60) modifier = -0.04;
    else if (tteMin >= 50) modifier = -0.02;
    else if (tteMin >= 40) modifier = 0;
    else if (tteMin >= 30) modifier = +0.02;
    else modifier = +0.04;
    
    estimates.forEach(e => {
      e.value = clamp(e.value + modifier, 0.20, 0.80);
    });
    
    if (modifier !== 0) {
      sources.push("TTE");
    }
  }

  // Calcul final
  if (estimates.length === 0) {
    return {
      value: 0.42, // Valeur par défaut conservatrice
      confidence: 0.15,
      sources: ["Estimation par défaut"],
      method: "default"
    };
  }

  const totalWeight = estimates.reduce((sum, e) => sum + e.weight, 0);
  const weightedValue = estimates.reduce((sum, e) => sum + e.value * e.weight, 0) / totalWeight;
  const value = clamp(weightedValue, 0.20, 0.80);
  
  // Confiance basée sur les sources disponibles
  const baseConfidence = sources.includes("Ratio CSS/VMA") ? 0.55 : 0.35;
  const tteBonus = sources.includes("TTE") ? 0.10 : 0;
  const confidence = Math.min(0.75, baseConfidence + tteBonus);

  return {
    value: Math.round(value * 100) / 100,
    confidence,
    sources,
    method: sources.includes("Ratio CSS/VMA") ? "css_vma_ratio" : "vma_only"
  };
}

/**
 * Formate l'estimation pour affichage
 */
export function formatVLamaxCapEstimate(estimate: VLamaxCapEstimate): string {
  return `${estimate.value.toFixed(2)} mmol/L/s (${Math.round(estimate.confidence * 100)}%)`;
}

/**
 * Vérifie si suffisamment de données sont disponibles pour une estimation
 */
export function canEstimateVLamaxCap(input: VLamaxCapEstimateInput): boolean {
  const { vma, css, paceThreshold } = input;
  return (vma !== null && vma > 0) || 
         (css !== null && css > 0) || 
         (paceThreshold !== null && paceThreshold > 0);
}
