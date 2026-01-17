/**
 * VLamax V2 — Modèle Consolidé
 * 
 * Sources scientifiques de référence :
 * - Mader & Heck (1986–2006)
 * - Jones & Poole
 * - Burnley & Jones
 * - INSCYD public documentation
 * - PCr kinetics / sprint contribution
 * 
 * PRINCIPE V2 :
 * - La VLamax n'est JAMAIS une valeur unique
 * - Toujours exprimée comme une PLAGE avec confiance
 * - Bornes physiologiques strictes (0.20 – 1.00)
 */

import { PHYSIOLOGICAL_BOUNDS, CONFIDENCE_LEVELS, SCIENTIFIC_REFERENCES } from './scientificConfig';

// =============================================
// TYPES V2
// =============================================

export interface VLamaxRangeV2 {
  // Valeur centrale
  central: number;
  
  // Plage réaliste
  min: number;
  max: number;
  
  // Plage de confiance (plus large)
  confidenceMin: number;
  confidenceMax: number;
  
  // Niveau de confiance global (0-1)
  confidence: number;
  
  // Sources utilisées pour le calcul
  sources: VLamaxSourceV2[];
  
  // Métadonnées
  sport: 'velo' | 'cap' | 'both';
  label: string;
  isLocked: boolean; // Si mesure labo verrouille la valeur
  
  // Profil catégorisé
  category: VLamaxCategoryV2;
  categoryLabel: string;
  
  // Alertes éventuelles
  warnings: string[];
}

export type VLamaxSourceV2 = 
  | 'lactate_lab'      // Mesure lactate laboratoire
  | 'sprint_15s'       // Sprint 15 secondes terrain
  | 'sprint_power'     // Sprint puissance (Stryd/Garmin)
  | 'pmax_5s'          // Pmax 5s vélo
  | 'durability'       // Estimation via TTE/durabilité
  | 'ftp_pmax_ratio'   // Ratio FTP / Pmax
  | 'ramp_test'        // Test rampe
  | 'historical'       // Données historiques
  | 'estimated';       // Estimation pure

export type VLamaxCategoryV2 = 
  | 'ultra_endurance'  // ≤ 0.25 — Ultra-endurant
  | 'endurance'        // 0.26–0.35 — Profil endurant
  | 'balanced'         // 0.36–0.45 — Équilibré
  | 'power'            // 0.46–0.55 — Profil puissance
  | 'sprinter'         // 0.56–0.70 — Sprinter
  | 'extreme_sprinter'; // > 0.70 — Sprinter extrême

export interface VLamaxV2Input {
  // Données vélo
  pmax_5s?: number | null;
  pmax_10s?: number | null;
  ftp?: number | null;
  weight_kg?: number | null;
  cadence_avg?: number | null;
  tss_7d?: number | null;
  
  // Données CAP
  sprint_15s_distance?: number | null;  // Distance en mètres
  sprint_power?: number | null;         // Puissance sprint Stryd/Garmin
  vma?: number | null;
  css?: number | null;                  // Seuil CAP (sec/km)
  
  // TTE pour cross-validation
  tte_min?: number | null;
  
  // Mesures directes (priorité)
  vlamax_labo?: number | null;
  vlamax_test?: number | null;
  
  // Objectif pour contextualisation
  objectif?: string;
  
  // Sport principal
  sport?: 'velo' | 'cap' | 'both';
}

// =============================================
// HELPERS
// =============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function getVLamaxCategory(value: number): VLamaxCategoryV2 {
  if (value <= 0.25) return 'ultra_endurance';
  if (value <= 0.35) return 'endurance';
  if (value <= 0.45) return 'balanced';
  if (value <= 0.55) return 'power';
  if (value <= 0.70) return 'sprinter';
  return 'extreme_sprinter';
}

function getCategoryLabel(category: VLamaxCategoryV2): string {
  switch (category) {
    case 'ultra_endurance': return '🏔️ Ultra-endurant';
    case 'endurance': return '🚴 Profil endurant';
    case 'balanced': return '⚖️ Équilibré';
    case 'power': return '💪 Profil puissance';
    case 'sprinter': return '⚡ Sprinter';
    case 'extreme_sprinter': return '🔥 Sprinter extrême';
  }
}

// =============================================
// CALCUL V2 — VÉLO
// =============================================

function computeVLamaxVeloV2(input: VLamaxV2Input): { value: number; confidence: number; sources: VLamaxSourceV2[] } {
  const sources: VLamaxSourceV2[] = [];
  const estimates: { value: number; weight: number; source: VLamaxSourceV2 }[] = [];
  
  const { pmax_5s, ftp, weight_kg, tte_min, tss_7d, cadence_avg } = input;
  
  // 1) Estimation via ratio FTP / Pmax (si disponible)
  if (pmax_5s && ftp && weight_kg && weight_kg > 0) {
    const ftpKg = ftp / weight_kg;
    const pmaxKg = pmax_5s / weight_kg;
    
    // Ratio Pmax/FTP : plus élevé = VLamax plus haute
    const ratio = pmaxKg / ftpKg;
    
    // Mapping empirique basé sur INSCYD et littérature
    // Ratio 3.0 ≈ VLamax 0.35, Ratio 4.0 ≈ VLamax 0.55
    let estimated = 0.20 + (ratio - 2.0) * 0.10;
    
    // Ajustement FTP/kg
    if (ftpKg >= 4.5) estimated -= 0.05; // Bon aérobie
    if (ftpKg >= 5.0) estimated -= 0.05;
    if (ftpKg < 3.5) estimated += 0.05;
    
    estimated = clamp(estimated, PHYSIOLOGICAL_BOUNDS.VLAMAX.MIN, PHYSIOLOGICAL_BOUNDS.VLAMAX.MAX);
    
    estimates.push({ value: estimated, weight: 0.35, source: 'ftp_pmax_ratio' });
    sources.push('ftp_pmax_ratio');
  }
  
  // 2) Estimation via Pmax seul
  if (pmax_5s && !ftp) {
    // Pmax > 1200W = typiquement VLamax élevée
    let estimated = 0.35;
    if (pmax_5s >= 1500) estimated = 0.60;
    else if (pmax_5s >= 1300) estimated = 0.50;
    else if (pmax_5s >= 1100) estimated = 0.45;
    else if (pmax_5s >= 900) estimated = 0.40;
    else estimated = 0.35;
    
    estimates.push({ value: estimated, weight: 0.20, source: 'pmax_5s' });
    sources.push('pmax_5s');
  }
  
  // 3) Estimation via durabilité/TTE (cross-validation)
  if (tte_min !== null && tte_min !== undefined) {
    // TTE élevé = VLamax probablement basse
    let estimated: number;
    if (tte_min >= 60) estimated = 0.30;
    else if (tte_min >= 50) estimated = 0.38;
    else if (tte_min >= 40) estimated = 0.45;
    else if (tte_min >= 30) estimated = 0.55;
    else estimated = 0.65;
    
    estimates.push({ value: estimated, weight: 0.25, source: 'durability' });
    sources.push('durability');
  }
  
  // 4) Ajustement via charge (TSS 7d)
  if (tss_7d !== null && tss_7d !== undefined && estimates.length > 0) {
    // Charge élevée → adaptation aérobie → tend vers VLamax plus basse
    let modifier = 0;
    if (tss_7d >= 600) modifier = -0.02;
    else if (tss_7d >= 400) modifier = -0.01;
    else if (tss_7d < 200) modifier = +0.02;
    
    estimates.forEach(e => {
      e.value = clamp(e.value + modifier, PHYSIOLOGICAL_BOUNDS.VLAMAX.MIN, PHYSIOLOGICAL_BOUNDS.VLAMAX.MAX);
    });
  }
  
  // Moyenne pondérée
  if (estimates.length === 0) {
    return { value: 0.42, confidence: 0.30, sources: ['estimated'] };
  }
  
  const totalWeight = estimates.reduce((sum, e) => sum + e.weight, 0);
  const weightedSum = estimates.reduce((sum, e) => sum + e.value * e.weight, 0);
  const value = clamp(weightedSum / totalWeight, PHYSIOLOGICAL_BOUNDS.VLAMAX.MIN, PHYSIOLOGICAL_BOUNDS.VLAMAX.MAX);
  
  // Confiance basée sur nombre de sources et qualité
  const confidence = Math.min(0.75, 0.40 + sources.length * 0.10);
  
  return { value, confidence, sources };
}

// =============================================
// CALCUL V2 — CAP
// =============================================

function computeVLamaxCapV2(input: VLamaxV2Input): { value: number; confidence: number; sources: VLamaxSourceV2[] } {
  const sources: VLamaxSourceV2[] = [];
  const estimates: { value: number; weight: number; source: VLamaxSourceV2 }[] = [];
  
  const { sprint_15s_distance, sprint_power, vma, css, tte_min } = input;
  
  // 1) Sprint 15s terrain (distance)
  if (sprint_15s_distance !== null && sprint_15s_distance !== undefined) {
    // Distance 15s : 80m = modéré, 95m = élevé
    let estimated: number;
    if (sprint_15s_distance >= 100) estimated = 0.70;
    else if (sprint_15s_distance >= 90) estimated = 0.55;
    else if (sprint_15s_distance >= 80) estimated = 0.45;
    else if (sprint_15s_distance >= 70) estimated = 0.38;
    else estimated = 0.32;
    
    estimates.push({ value: estimated, weight: 0.35, source: 'sprint_15s' });
    sources.push('sprint_15s');
  }
  
  // 2) Sprint puissance (Stryd/Garmin)
  if (sprint_power !== null && sprint_power !== undefined) {
    // Puissance sprint CAP : 800W = élevé, 500W = modéré
    let estimated: number;
    if (sprint_power >= 900) estimated = 0.70;
    else if (sprint_power >= 700) estimated = 0.55;
    else if (sprint_power >= 550) estimated = 0.45;
    else if (sprint_power >= 400) estimated = 0.38;
    else estimated = 0.32;
    
    estimates.push({ value: estimated, weight: 0.30, source: 'sprint_power' });
    sources.push('sprint_power');
  }
  
  // 3) Cross-validation VMA vs seuil
  if (vma !== null && vma !== undefined && css !== null && css !== undefined && css > 0) {
    // Convertir CSS (sec/km) en vitesse (km/h)
    const cssKmh = 3600 / css;
    const ratio = cssKmh / vma;
    
    // Ratio proche de 0.90 = VLamax basse, ratio < 0.80 = VLamax haute
    let estimated: number;
    if (ratio >= 0.90) estimated = 0.30;
    else if (ratio >= 0.85) estimated = 0.38;
    else if (ratio >= 0.80) estimated = 0.45;
    else if (ratio >= 0.75) estimated = 0.52;
    else estimated = 0.60;
    
    estimates.push({ value: estimated, weight: 0.25, source: 'durability' });
    sources.push('durability');
  }
  
  // 4) TTE pour cross-validation
  if (tte_min !== null && tte_min !== undefined && estimates.length > 0) {
    let modifier = 0;
    if (tte_min >= 55) modifier = -0.03;
    else if (tte_min >= 45) modifier = -0.01;
    else if (tte_min < 35) modifier = +0.03;
    
    estimates.forEach(e => {
      e.value = clamp(e.value + modifier, PHYSIOLOGICAL_BOUNDS.VLAMAX.MIN, PHYSIOLOGICAL_BOUNDS.VLAMAX.MAX);
    });
  }
  
  // Moyenne pondérée
  if (estimates.length === 0) {
    return { value: 0.42, confidence: 0.25, sources: ['estimated'] };
  }
  
  const totalWeight = estimates.reduce((sum, e) => sum + e.weight, 0);
  const weightedSum = estimates.reduce((sum, e) => sum + e.value * e.weight, 0);
  const value = clamp(weightedSum / totalWeight, PHYSIOLOGICAL_BOUNDS.VLAMAX.MIN, PHYSIOLOGICAL_BOUNDS.VLAMAX.MAX);
  
  // Confiance légèrement plus faible que vélo (moins de données précises)
  const confidence = Math.min(0.70, 0.35 + sources.length * 0.10);
  
  return { value, confidence, sources };
}

// =============================================
// FONCTION PRINCIPALE V2
// =============================================

export function computeVLamaxV2(input: VLamaxV2Input): VLamaxRangeV2 {
  const warnings: string[] = [];
  const sport = input.sport || 'velo';
  
  // A) Priorité 1 : Mesure lactate labo (confiance 0.95)
  if (input.vlamax_labo !== null && input.vlamax_labo !== undefined) {
    const value = clamp(input.vlamax_labo, PHYSIOLOGICAL_BOUNDS.VLAMAX.MIN, PHYSIOLOGICAL_BOUNDS.VLAMAX.MAX);
    const uncertainty = 0.02; // Très faible incertitude labo
    const category = getVLamaxCategory(value);
    
    return {
      central: value,
      min: clamp(value - uncertainty, PHYSIOLOGICAL_BOUNDS.VLAMAX.MIN, PHYSIOLOGICAL_BOUNDS.VLAMAX.MAX),
      max: clamp(value + uncertainty, PHYSIOLOGICAL_BOUNDS.VLAMAX.MIN, PHYSIOLOGICAL_BOUNDS.VLAMAX.MAX),
      confidenceMin: clamp(value - uncertainty * 1.5, PHYSIOLOGICAL_BOUNDS.VLAMAX.MIN, PHYSIOLOGICAL_BOUNDS.VLAMAX.MAX),
      confidenceMax: clamp(value + uncertainty * 1.5, PHYSIOLOGICAL_BOUNDS.VLAMAX.MIN, PHYSIOLOGICAL_BOUNDS.VLAMAX.MAX),
      confidence: CONFIDENCE_LEVELS.MEASURED_LAB.value,
      sources: ['lactate_lab'],
      sport,
      label: `${value.toFixed(2)} mmol/L/s (labo)`,
      isLocked: true,
      category,
      categoryLabel: getCategoryLabel(category),
      warnings
    };
  }
  
  // B) Priorité 2 : Test terrain structuré (confiance 0.75)
  if (input.vlamax_test !== null && input.vlamax_test !== undefined) {
    const value = clamp(input.vlamax_test, PHYSIOLOGICAL_BOUNDS.VLAMAX.MIN, PHYSIOLOGICAL_BOUNDS.VLAMAX.MAX);
    const uncertainty = 0.05;
    const category = getVLamaxCategory(value);
    
    return {
      central: value,
      min: clamp(value - uncertainty, PHYSIOLOGICAL_BOUNDS.VLAMAX.MIN, PHYSIOLOGICAL_BOUNDS.VLAMAX.MAX),
      max: clamp(value + uncertainty, PHYSIOLOGICAL_BOUNDS.VLAMAX.MIN, PHYSIOLOGICAL_BOUNDS.VLAMAX.MAX),
      confidenceMin: clamp(value - uncertainty * 2, PHYSIOLOGICAL_BOUNDS.VLAMAX.MIN, PHYSIOLOGICAL_BOUNDS.VLAMAX.MAX),
      confidenceMax: clamp(value + uncertainty * 2, PHYSIOLOGICAL_BOUNDS.VLAMAX.MIN, PHYSIOLOGICAL_BOUNDS.VLAMAX.MAX),
      confidence: CONFIDENCE_LEVELS.ESTIMATED_STRONG.value,
      sources: ['sprint_15s'],
      sport,
      label: `${value.toFixed(2)} mmol/L/s (test)`,
      isLocked: false,
      category,
      categoryLabel: getCategoryLabel(category),
      warnings
    };
  }
  
  // C) Estimation selon sport
  let veloResult: { value: number; confidence: number; sources: VLamaxSourceV2[] } | null = null;
  let capResult: { value: number; confidence: number; sources: VLamaxSourceV2[] } | null = null;
  
  if (sport === 'velo' || sport === 'both') {
    veloResult = computeVLamaxVeloV2(input);
  }
  
  if (sport === 'cap' || sport === 'both') {
    capResult = computeVLamaxCapV2(input);
  }
  
  // Combiner si les deux sports
  let finalValue: number;
  let finalConfidence: number;
  let allSources: VLamaxSourceV2[];
  
  if (veloResult && capResult) {
    // Moyenne pondérée par confiance
    const totalConf = veloResult.confidence + capResult.confidence;
    finalValue = (veloResult.value * veloResult.confidence + capResult.value * capResult.confidence) / totalConf;
    finalConfidence = Math.max(veloResult.confidence, capResult.confidence);
    allSources = [...new Set([...veloResult.sources, ...capResult.sources])];
    
    // Comparer les profils
    const diff = Math.abs(veloResult.value - capResult.value);
    if (diff > 0.10) {
      if (veloResult.value > capResult.value) {
        warnings.push('Profil vélo plus glycolytique que CAP');
      } else {
        warnings.push('Profil CAP plus glycolytique que vélo');
      }
    }
  } else if (veloResult) {
    finalValue = veloResult.value;
    finalConfidence = veloResult.confidence;
    allSources = veloResult.sources;
  } else if (capResult) {
    finalValue = capResult.value;
    finalConfidence = capResult.confidence;
    allSources = capResult.sources;
  } else {
    // Aucune donnée — valeur par défaut
    finalValue = 0.42;
    finalConfidence = 0.25;
    allSources = ['estimated'];
    warnings.push('Données insuffisantes — estimation approximative');
  }
  
  // Calculer la plage d'incertitude basée sur la confiance
  const uncertaintyBase = 0.12 * (1 - finalConfidence);
  const uncertainty = Math.max(0.03, uncertaintyBase);
  
  const category = getVLamaxCategory(finalValue);
  
  // Alertes spécifiques
  if (finalValue >= PHYSIOLOGICAL_BOUNDS.VLAMAX.SPRINTER_EXTREME) {
    warnings.push('Profil sprinter extrême — vérifier cohérence avec objectif endurance');
  }
  if (finalValue <= PHYSIOLOGICAL_BOUNDS.VLAMAX.ULTRA_ENDURANCE) {
    warnings.push('Profil ultra-endurant — capacité glycolytique limitée');
  }
  
  return {
    central: Number(finalValue.toFixed(2)),
    min: Number(clamp(finalValue - uncertainty, PHYSIOLOGICAL_BOUNDS.VLAMAX.MIN, PHYSIOLOGICAL_BOUNDS.VLAMAX.MAX).toFixed(2)),
    max: Number(clamp(finalValue + uncertainty, PHYSIOLOGICAL_BOUNDS.VLAMAX.MIN, PHYSIOLOGICAL_BOUNDS.VLAMAX.MAX).toFixed(2)),
    confidenceMin: Number(clamp(finalValue - uncertainty * 1.5, PHYSIOLOGICAL_BOUNDS.VLAMAX.MIN, PHYSIOLOGICAL_BOUNDS.VLAMAX.MAX).toFixed(2)),
    confidenceMax: Number(clamp(finalValue + uncertainty * 1.5, PHYSIOLOGICAL_BOUNDS.VLAMAX.MIN, PHYSIOLOGICAL_BOUNDS.VLAMAX.MAX).toFixed(2)),
    confidence: Number(finalConfidence.toFixed(2)),
    sources: allSources,
    sport,
    label: `${finalValue.toFixed(2)} ± ${uncertainty.toFixed(2)} mmol/L/s`,
    isLocked: false,
    category,
    categoryLabel: getCategoryLabel(category),
    warnings
  };
}

// =============================================
// HELPERS UI
// =============================================

export function formatVLamaxRangeLabel(range: VLamaxRangeV2): string {
  return `${range.min.toFixed(2)} – ${range.max.toFixed(2)} mmol/L/s`;
}

export function getVLamaxConfidenceLabel(confidence: number): string {
  if (confidence >= 0.90) return "Très fiable (labo)";
  if (confidence >= 0.75) return "Fiable (test)";
  if (confidence >= 0.60) return "Modérée";
  if (confidence >= 0.40) return "Limitée";
  return "Approximative";
}

export function getVLamaxSourcesLabel(sources: VLamaxSourceV2[]): string {
  const labels: Record<VLamaxSourceV2, string> = {
    lactate_lab: "Lactate labo",
    sprint_15s: "Sprint 15s",
    sprint_power: "Puissance sprint",
    pmax_5s: "Pmax 5s",
    durability: "Durabilité",
    ftp_pmax_ratio: "FTP/Pmax",
    ramp_test: "Test rampe",
    historical: "Historique",
    estimated: "Estimation",
  };
  
  return sources.map(s => labels[s]).join(", ");
}

export function getVLamaxCategoryColor(category: VLamaxCategoryV2): string {
  switch (category) {
    case 'ultra_endurance':
    case 'endurance':
      return 'text-blue-600 dark:text-blue-400';
    case 'balanced':
      return 'text-green-600 dark:text-green-400';
    case 'power':
      return 'text-amber-600 dark:text-amber-400';
    case 'sprinter':
    case 'extreme_sprinter':
      return 'text-red-600 dark:text-red-400';
  }
}
