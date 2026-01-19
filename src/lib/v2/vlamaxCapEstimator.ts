/**
 * VLamax CAP Estimator
 * Estimation automatique de VLamax course à pied basée sur:
 * - Ratio Pace Seuil / VMA (durabilité)
 * - Sprint 15s terrain (distance)
 * - Puissance course (Stryd/Garmin Running Power)
 * - TTE (cross-validation)
 * 
 * ⚠️ CSS = Critical Swim Speed (natation) - NON UTILISÉ ici
 * On utilise pace_threshold_sec_per_km (pace seuil CAP)
 */

export interface VLamaxCapEstimateInput {
  vma: number | null;                    // VMA en km/h
  paceThresholdSecPerKm: number | null;  // Pace seuil CAP (sec/km)
  tteMin?: number | null;                // Time to Exhaustion en minutes
  sprint15sDistance?: number | null;     // Distance parcourue en 15s (mètres)
  runningPowerMax?: number | null;       // Puissance max course (W) - Stryd/Garmin
  runningPowerThreshold?: number | null; // Puissance seuil course (W)
}

export interface VLamaxCapEstimate {
  value: number;
  confidence: number;
  sources: string[];
  method: string;
  details?: string;
}

const clamp = (val: number, min: number, max: number): number => 
  Math.max(min, Math.min(max, val));

/**
 * Estime VLamax CAP à partir des données de course à pied
 * Hiérarchie des sources:
 * 1. Sprint 15s + Puissance (si disponibles) → meilleure estimation
 * 2. Ratio Pace Seuil/VMA → estimation principale
 * 3. VMA seule → fallback conservateur
 */
export function estimateVLamaxCap(input: VLamaxCapEstimateInput): VLamaxCapEstimate {
  const { 
    vma, 
    paceThresholdSecPerKm, 
    tteMin, 
    sprint15sDistance, 
    runningPowerMax, 
    runningPowerThreshold 
  } = input;
  
  const sources: string[] = [];
  const estimates: { value: number; weight: number; source: string }[] = [];
  let details = "";

  // =============================================
  // SOURCE 1: Sprint 15s terrain (HAUTE FIABILITÉ)
  // =============================================
  if (sprint15sDistance !== null && sprint15sDistance !== undefined && sprint15sDistance > 0) {
    /**
     * Distance 15s sprint terrain:
     * - ≥100m → Sprinter, VLamax très haute
     * - 90-100m → VLamax haute
     * - 80-90m → VLamax modérée-haute
     * - 70-80m → VLamax modérée
     * - <70m → VLamax basse
     */
    let estimated: number;
    if (sprint15sDistance >= 105) estimated = 0.75;
    else if (sprint15sDistance >= 95) estimated = 0.62;
    else if (sprint15sDistance >= 85) estimated = 0.50;
    else if (sprint15sDistance >= 75) estimated = 0.42;
    else if (sprint15sDistance >= 65) estimated = 0.35;
    else estimated = 0.30;
    
    estimates.push({ value: estimated, weight: 0.40, source: "Sprint 15s" });
    sources.push("Sprint 15s");
    details += `Sprint 15s: ${sprint15sDistance}m → ${estimated.toFixed(2)}. `;
  }

  // =============================================
  // SOURCE 2: Puissance course (Stryd/Garmin)
  // =============================================
  if (runningPowerMax !== null && runningPowerMax !== undefined && runningPowerMax > 0) {
    /**
     * Puissance max sprint CAP (Stryd/Garmin):
     * - ≥1000W → Sprinter élite
     * - 800-1000W → Très puissant
     * - 600-800W → Puissant
     * - 450-600W → Modéré
     * - <450W → Économe/endurant
     */
    let estimated: number;
    if (runningPowerMax >= 1000) estimated = 0.72;
    else if (runningPowerMax >= 850) estimated = 0.60;
    else if (runningPowerMax >= 700) estimated = 0.50;
    else if (runningPowerMax >= 550) estimated = 0.42;
    else if (runningPowerMax >= 400) estimated = 0.35;
    else estimated = 0.30;
    
    estimates.push({ value: estimated, weight: 0.35, source: "Puissance Max" });
    sources.push("Puissance CAP");
    details += `Pmax: ${runningPowerMax}W → ${estimated.toFixed(2)}. `;
  }

  // =============================================
  // SOURCE 3: Ratio Puissance (si threshold disponible)
  // =============================================
  if (runningPowerMax && runningPowerThreshold && runningPowerThreshold > 0) {
    const powerRatio = runningPowerThreshold / runningPowerMax;
    /**
     * Ratio Puissance seuil / Puissance max:
     * - ratio ≥0.75 → VLamax très basse (excellent durabilité)
     * - ratio 0.65-0.75 → VLamax basse-modérée
     * - ratio 0.55-0.65 → VLamax modérée
     * - ratio <0.55 → VLamax haute
     */
    let estimated: number;
    if (powerRatio >= 0.78) estimated = 0.28;
    else if (powerRatio >= 0.72) estimated = 0.35;
    else if (powerRatio >= 0.65) estimated = 0.42;
    else if (powerRatio >= 0.58) estimated = 0.50;
    else estimated = 0.60;
    
    estimates.push({ value: estimated, weight: 0.25, source: "Ratio Puissance" });
    sources.push("Ratio P");
    details += `Ratio P: ${(powerRatio * 100).toFixed(0)}% → ${estimated.toFixed(2)}. `;
  }

  // =============================================
  // SOURCE 4: Ratio Pace Seuil / VMA (CLASSIQUE)
  // =============================================
  if (vma !== null && vma > 0 && paceThresholdSecPerKm !== null && paceThresholdSecPerKm > 0) {
    // Convertir pace seuil (sec/km) en vitesse (km/h)
    const paceKmh = 3600 / paceThresholdSecPerKm;
    const ratio = paceKmh / vma;
    
    /**
     * Ratio Vitesse Seuil / VMA:
     * - ratio ≥0.92 → VLamax très basse (excellent endurance)
     * - ratio 0.88-0.92 → VLamax basse
     * - ratio 0.84-0.88 → VLamax modérée
     * - ratio 0.80-0.84 → VLamax modérée-haute
     * - ratio <0.80 → VLamax haute (profil glycolytique)
     */
    let estimated: number;
    if (ratio >= 0.92) estimated = 0.28;
    else if (ratio >= 0.88) estimated = 0.35;
    else if (ratio >= 0.84) estimated = 0.42;
    else if (ratio >= 0.80) estimated = 0.50;
    else if (ratio >= 0.76) estimated = 0.58;
    else estimated = 0.65;
    
    // Poids inférieur si on a déjà des sources directes (sprint/puissance)
    const weight = estimates.length > 0 ? 0.20 : 0.55;
    estimates.push({ value: estimated, weight, source: "Ratio Seuil/VMA" });
    sources.push("Seuil/VMA");
    details += `Ratio: ${(ratio * 100).toFixed(0)}% → ${estimated.toFixed(2)}. `;
  }

  // =============================================
  // SOURCE 5: VMA seule (FALLBACK)
  // =============================================
  if (vma !== null && vma > 0 && estimates.length === 0) {
    /**
     * VMA seule (fallback très approximatif):
     * - VMA élevée → souvent corrélée à capacité mixte
     * - Estimation conservatrice vers le centre
     */
    let estimated: number;
    if (vma >= 22) estimated = 0.40;
    else if (vma >= 20) estimated = 0.42;
    else if (vma >= 18) estimated = 0.44;
    else if (vma >= 16) estimated = 0.46;
    else estimated = 0.48;
    
    estimates.push({ value: estimated, weight: 0.30, source: "VMA seule" });
    sources.push("VMA");
    details += `VMA: ${vma} km/h → ${estimated.toFixed(2)} (fallback). `;
  }

  // =============================================
  // MODIFICATEUR TTE (Cross-validation)
  // =============================================
  if (tteMin !== null && tteMin > 0 && estimates.length > 0) {
    /**
     * TTE CAP modifie l'estimation:
     * - TTE long → VLamax probablement plus basse
     * - TTE court → VLamax probablement plus haute
     */
    let modifier = 0;
    if (tteMin >= 60) modifier = -0.04;
    else if (tteMin >= 50) modifier = -0.02;
    else if (tteMin >= 40) modifier = 0;
    else if (tteMin >= 30) modifier = +0.02;
    else modifier = +0.04;
    
    if (modifier !== 0) {
      estimates.forEach(e => {
        e.value = clamp(e.value + modifier, 0.20, 0.80);
      });
      sources.push("TTE");
      details += `TTE: ${tteMin}min → ajust. ${modifier > 0 ? '+' : ''}${modifier.toFixed(2)}. `;
    }
  }

  // =============================================
  // CALCUL FINAL
  // =============================================
  if (estimates.length === 0) {
    return {
      value: 0.42, // Valeur par défaut conservatrice
      confidence: 0.15,
      sources: ["Défaut"],
      method: "default",
      details: "Données insuffisantes pour estimation"
    };
  }

  const totalWeight = estimates.reduce((sum, e) => sum + e.weight, 0);
  const weightedValue = estimates.reduce((sum, e) => sum + e.value * e.weight, 0) / totalWeight;
  const value = clamp(weightedValue, 0.20, 0.80);
  
  // Confiance basée sur les sources disponibles
  let confidence = 0.30; // Base
  if (sources.includes("Sprint 15s")) confidence += 0.20;
  if (sources.includes("Puissance CAP")) confidence += 0.15;
  if (sources.includes("Ratio P")) confidence += 0.10;
  if (sources.includes("Seuil/VMA")) confidence += 0.10;
  if (sources.includes("TTE")) confidence += 0.05;
  confidence = Math.min(0.85, confidence);

  // Méthode utilisée
  let method = "combined";
  if (sources.length === 1) {
    method = sources[0].toLowerCase().replace(/\s+/g, '_');
  } else if (sources.includes("Sprint 15s") && sources.includes("Puissance CAP")) {
    method = "sprint_power";
  } else if (sources.includes("Seuil/VMA")) {
    method = "ratio_based";
  }

  return {
    value: Math.round(value * 100) / 100,
    confidence,
    sources,
    method,
    details: details.trim()
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
  const { vma, paceThresholdSecPerKm, sprint15sDistance, runningPowerMax } = input;
  return (vma !== null && vma > 0) || 
         (paceThresholdSecPerKm !== null && paceThresholdSecPerKm > 0) ||
         (sprint15sDistance !== null && sprint15sDistance > 0) ||
         (runningPowerMax !== null && runningPowerMax > 0);
}

/**
 * Retourne une description des sources utilisées
 */
export function getEstimationSourcesDescription(estimate: VLamaxCapEstimate): string {
  if (estimate.sources.length === 0) return "Aucune source";
  if (estimate.sources.includes("Sprint 15s") && estimate.sources.includes("Puissance CAP")) {
    return "Tests terrain + puissance (haute fiabilité)";
  }
  if (estimate.sources.includes("Sprint 15s")) {
    return "Test sprint 15s terrain";
  }
  if (estimate.sources.includes("Puissance CAP")) {
    return "Données puissance course";
  }
  if (estimate.sources.includes("Seuil/VMA")) {
    return "Ratio pace seuil / VMA";
  }
  return estimate.sources.join(" + ");
}
