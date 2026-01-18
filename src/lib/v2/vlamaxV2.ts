/**
 * VLamax V2 — Modèle TFCL™ (Two For Coaching Lab)
 * VERSION OFFICIELLE V2 — Formule robuste et bornée
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
 * - Bornes physiologiques strictes (0.20 – 0.90)
 * 
 * CETTE FORMULE NE REMPLACE PAS UN TEST LACTATE.
 * Elle produit une ESTIMATION CONTEXTUALISÉE avec indice de confiance.
 */

import { PHYSIOLOGICAL_BOUNDS, CONFIDENCE_LEVELS, SCIENTIFIC_REFERENCES } from './scientificConfig';

// =============================================
// 1️⃣ RAPPEL CONCEPTUEL (TEXTE À AFFICHER)
// =============================================

export const VLAMAX_CONCEPT = {
  title: "VLamax — Définition",
  icon: "⚡",
  
  officialText: `VLamax représente la vitesse maximale de production de lactate
via la filière glycolytique.
Elle ne mesure pas la performance,
mais le PROFIL MÉTABOLIQUE.`,
  
  keyPoint: "VLamax élevé ≠ bonne ou mauvaise chose. C'est une caractéristique du profil.",
  
  whyEstimation: `Cette valeur est une estimation car elle nécessiterait un test lactate
pour être mesurée directement. La formule TFCL™ V2 utilise les données terrain
disponibles pour produire une approximation bornée et contextualisée.`
};

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
  
  // V2: Source officielle
  sourceLabel: string;
}

export type VLamaxSourceV2 = 
  | 'lactate_lab'      // Mesure lactate laboratoire
  | 'sprint_15s'       // Sprint 15 secondes terrain
  | 'sprint_power'     // Sprint puissance (Stryd/Garmin)
  | 'pmax_5s'          // Pmax 5s vélo
  | 'durability'       // Estimation via TTE/durabilité
  | 'ftp_pmax_ratio'   // Ratio FTP / Pmax
  | 'tfcl_v2'          // Formule TFCL V2 (nouvelle)
  | 'ramp_test'        // Test rampe
  | 'historical'       // Données historiques
  | 'estimated';       // Estimation pure

export type VLamaxCategoryV2 = 
  | 'ultra_endurance'  // ≤ 0.30 — Très endurant / profil IM
  | 'endurance'        // 0.30–0.45 — Endurance équilibrée
  | 'balanced'         // 0.45–0.60 — Profil mixte
  | 'power';           // > 0.60 — Profil glycolytique / explosif

export interface VLamaxV2Input {
  // Données vélo (V2 officielle)
  pmax_5s?: number | null;       // Pmax 5-15s (requis pour précision)
  pmax_10s?: number | null;
  pmax_15s?: number | null;      // Alternative à 5s
  ftp?: number | null;           // FTP en Watts (requis)
  weight_kg?: number | null;     // Poids (pour FTP/kg)
  tte_min?: number | null;       // TTE effectif en minutes (requis)
  age?: number | null;           // Âge pour correction
  
  // Métriques secondaires
  cadence_avg?: number | null;
  tss_7d?: number | null;
  
  // Données CAP
  sprint_15s_distance?: number | null;
  sprint_power?: number | null;
  vma?: number | null;
  css?: number | null;
  
  // Mesures directes (priorité)
  vlamax_labo?: number | null;
  vlamax_test?: number | null;
  
  // Contexte
  objectif?: string;
  sport?: 'velo' | 'cap' | 'both';
  
  // V2: Qualité des données
  tte_is_measured?: boolean;     // TTE issu d'un test ou bloc stable
  pmax_is_real?: boolean;        // Pmax réel (pas estimé)
}

// =============================================
// HELPERS
// =============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// =============================================
// 6️⃣ INTERPRÉTATION OFFICIELLE V2
// =============================================

export function getVLamaxCategory(value: number): VLamaxCategoryV2 {
  if (value < 0.30) return 'ultra_endurance';
  if (value <= 0.45) return 'endurance';
  if (value <= 0.60) return 'balanced';
  return 'power';
}

export function getCategoryLabel(category: VLamaxCategoryV2): string {
  switch (category) {
    case 'ultra_endurance': return '🏔️ Très endurant / profil IM';
    case 'endurance': return '🚴 Endurance équilibrée';
    case 'balanced': return '⚖️ Profil mixte';
    case 'power': return '⚡ Profil glycolytique / explosif';
  }
}

export function getCategoryDescription(category: VLamaxCategoryV2): string {
  switch (category) {
    case 'ultra_endurance': 
      return 'Profil idéal pour les épreuves de très longue durée (Ironman, ultra). Excellente utilisation des graisses.';
    case 'endurance': 
      return 'Bon équilibre pour les épreuves d\'endurance (marathon, 70.3). Bonne économie de substrat.';
    case 'balanced': 
      return 'Profil polyvalent. Peut performer sur des formats variés avec adaptation.';
    case 'power': 
      return 'Profil orienté puissance/sprint. Nécessite attention particulière sur efforts longs.';
  }
}

// =============================================
// 4️⃣ FORMULE V2 OFFICIELLE TFCL™ — VÉLO
// =============================================

/**
 * FORMULE V2 OFFICIELLE pour l'estimation VLamax Vélo
 * 
 * Étape A — Indice Glycolytique Relatif (IGR)
 * IGR = clamp((Pmax / FTP) × (40 / TTE), 0.8, 2.2)
 * 
 * Étape B — Estimation brute
 * VLamax_brut = 0.25 + 0.45 × clamp((IGR - 1.0) / 1.0, 0, 1)
 * 
 * Étape C — Correction âge
 * Si âge > 40: -0.02
 * Si âge > 50: -0.04
 * 
 * Étape D — Bornage final
 * VLamax_final = clamp(VLamax, 0.20, 0.90)
 */
function computeVLamaxVeloV2(input: VLamaxV2Input): { 
  value: number; 
  confidence: number; 
  sources: VLamaxSourceV2[];
  formula: 'tfcl_v2' | 'fallback';
  components?: {
    igr: number;
    vlamaxBrut: number;
    ageCorrection: number;
  };
} {
  const sources: VLamaxSourceV2[] = [];
  const { ftp, weight_kg, tte_min, age, pmax_5s, pmax_10s, pmax_15s, tte_is_measured, pmax_is_real } = input;
  
  // Déterminer Pmax (prendre le meilleur disponible ≤15s)
  const pmax = pmax_5s ?? pmax_10s ?? pmax_15s ?? null;
  
  // =============================================
  // CAS IDÉAL: FTP + TTE + Pmax disponibles
  // → Formule TFCL V2 complète
  // =============================================
  if (ftp != null && ftp > 0 && tte_min != null && tte_min > 0 && pmax != null && pmax > 0) {
    sources.push('tfcl_v2');
    if (pmax_5s) sources.push('pmax_5s');
    sources.push('durability');
    
    // ÉTAPE A: Indice Glycolytique Relatif (IGR)
    // Référence: 40 min = endurance "neutre"
    const rawIGR = (pmax / ftp) * (40 / tte_min);
    const igr = clamp(rawIGR, 0.8, 2.2);
    
    // ÉTAPE B: Estimation brute VLamax
    // Mapping: IGR = 1.0 → VLamax = 0.25
    //          IGR = 2.0 → VLamax = 0.70
    const normalizedIGR = clamp((igr - 1.0) / 1.0, 0, 1);
    let vlamaxBrut = 0.25 + 0.45 * normalizedIGR;
    
    // ÉTAPE C: Correction âge
    let ageCorrection = 0;
    if (age != null) {
      if (age > 50) {
        ageCorrection = -0.04;
      } else if (age > 40) {
        ageCorrection = -0.02;
      }
    }
    
    const vlamaxWithAge = vlamaxBrut + ageCorrection;
    
    // ÉTAPE D: Bornage final
    const vlamaxFinal = clamp(vlamaxWithAge, 0.20, 0.90);
    
    // ÉTAPE 5: Calcul de la confiance
    let confidence = 0.55; // Base pour estimation
    
    // Bonus: données complètes (FTP + TTE + Pmax)
    confidence += 0.15;
    
    // Bonus: TTE mesuré (test ou bloc stable)
    if (tte_is_measured) {
      confidence += 0.10;
    }
    
    // Bonus: Pmax réel (pas estimé)
    if (pmax_is_real) {
      confidence += 0.10;
    }
    
    // Bornes de confiance: 0.55 - 0.90
    confidence = clamp(confidence, 0.55, 0.90);
    
    return {
      value: Number(vlamaxFinal.toFixed(2)),
      confidence,
      sources,
      formula: 'tfcl_v2',
      components: {
        igr: Number(igr.toFixed(2)),
        vlamaxBrut: Number(vlamaxBrut.toFixed(2)),
        ageCorrection
      }
    };
  }
  
  // =============================================
  // FALLBACK: FTP + TTE disponibles (sans Pmax)
  // → Estimation via durabilité uniquement
  // =============================================
  if (ftp != null && ftp > 0 && tte_min != null && tte_min > 0) {
    sources.push('durability');
    
    // TTE élevé = VLamax probablement basse
    let estimated: number;
    if (tte_min >= 60) estimated = 0.28;
    else if (tte_min >= 55) estimated = 0.32;
    else if (tte_min >= 50) estimated = 0.38;
    else if (tte_min >= 45) estimated = 0.44;
    else if (tte_min >= 40) estimated = 0.50;
    else if (tte_min >= 35) estimated = 0.55;
    else estimated = 0.62;
    
    // Ajustement FTP/kg si disponible
    if (weight_kg != null && weight_kg > 0) {
      const ftpKg = ftp / weight_kg;
      if (ftpKg >= 4.5) estimated -= 0.04;
      if (ftpKg >= 5.0) estimated -= 0.03;
      if (ftpKg < 3.5) estimated += 0.03;
    }
    
    // Correction âge
    if (age != null) {
      if (age > 50) estimated -= 0.03;
      else if (age > 40) estimated -= 0.02;
    }
    
    estimated = clamp(estimated, 0.20, 0.90);
    
    // Confiance plus faible sans Pmax
    let confidence = 0.50;
    if (tte_is_measured) confidence += 0.08;
    confidence = clamp(confidence, 0.45, 0.70);
    
    return {
      value: Number(estimated.toFixed(2)),
      confidence,
      sources,
      formula: 'fallback'
    };
  }
  
  // =============================================
  // FALLBACK: FTP + Pmax (sans TTE)
  // → Estimation via ratio uniquement
  // =============================================
  if (ftp != null && ftp > 0 && pmax != null && pmax > 0) {
    sources.push('ftp_pmax_ratio');
    if (pmax_5s) sources.push('pmax_5s');
    
    const ratio = pmax / ftp;
    
    // Mapping ratio → VLamax
    // Ratio 2.5 ≈ 0.35, Ratio 3.5 ≈ 0.50, Ratio 4.5 ≈ 0.65
    let estimated = 0.30 + (ratio - 2.0) * 0.12;
    
    // Ajustement FTP/kg
    if (weight_kg != null && weight_kg > 0) {
      const ftpKg = ftp / weight_kg;
      if (ftpKg >= 4.5) estimated -= 0.04;
      if (ftpKg >= 5.0) estimated -= 0.03;
      if (ftpKg < 3.5) estimated += 0.03;
    }
    
    estimated = clamp(estimated, 0.20, 0.90);
    
    let confidence = 0.48;
    if (pmax_is_real) confidence += 0.07;
    confidence = clamp(confidence, 0.40, 0.65);
    
    return {
      value: Number(estimated.toFixed(2)),
      confidence,
      sources,
      formula: 'fallback'
    };
  }
  
  // =============================================
  // AUCUNE DONNÉE SUFFISANTE
  // =============================================
  return { 
    value: 0.42, 
    confidence: 0.30, 
    sources: ['estimated'],
    formula: 'fallback'
  };
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
      warnings,
      sourceLabel: 'Mesuré (Lactate labo)'
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
      warnings,
      sourceLabel: 'Test terrain structuré'
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
  
  // Déterminer le label de source
  const sourceLabel = allSources.includes('tfcl_v2') 
    ? 'Modélisé (TFCL V2)' 
    : allSources.includes('lactate_lab') 
      ? 'Mesuré (Lactate labo)'
      : 'Estimé (données terrain)';
  
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
    warnings,
    sourceLabel
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
    tfcl_v2: "TFCL V2",
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
  }
}

// =============================================
// 8️⃣ ALIGNEMENT ACADEMY — POURQUOI CETTE VLAMAX EST UNE ESTIMATION
// =============================================

export const VLAMAX_ESTIMATION_EXPLAINER = {
  title: "Pourquoi cette VLamax est une estimation",
  icon: "🔬",
  
  hypotheses: [
    "Le rapport Pmax/FTP reflète le potentiel glycolytique relatif",
    "Le TTE (durabilité au seuil) est inversement corrélé à la VLamax",
    "L'âge influence légèrement la capacité glycolytique maximale"
  ],
  
  limits: [
    "La VLamax réelle ne peut être mesurée que par test lactate",
    "Les valeurs terrain peuvent être influencées par la fatigue du jour",
    "Le Pmax dépend aussi de facteurs neuromusculaires non-métaboliques",
    "Cette estimation est valable dans un contexte d'entraînement structuré"
  ],
  
  vsLabTest: `Un test lactate laboratoire mesure directement la cinétique de production 
et d'élimination du lactate sous effort standardisé. Il fournit une VLamax avec 
une précision de ±0.02 mmol/L/s.

La formule TFCL V2 produit une estimation avec une précision de ±0.05-0.10 mmol/L/s 
selon la qualité des données d'entrée. Cette estimation est suffisante pour 
orienter les choix d'entraînement mais ne remplace pas une mesure directe 
pour un diagnostic fin.`,
  
  whenToMeasure: [
    "Objectif Ironman ou ultra-endurance avec enjeu de performance",
    "Doute sur l'orientation du profil métabolique",
    "Stagnation malgré entraînement adapté",
    "Préparation d'un pic de forme majeur"
  ]
};
