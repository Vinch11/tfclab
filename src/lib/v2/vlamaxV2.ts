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
  | 'ultra_endurance'  // 0.20–0.35 : profil très aérobie
  | 'endurance'        // 0.35–0.55 : équilibré
  | 'power'            // 0.55–0.75 : glycolytique
  | 'sprinter';        // >0.75 : très glycolytique / sprinteur

export interface VLamaxV2Input {
  // ==============================================
  // DONNÉES VÉLO V2 OFFICIELLES (TFCL™)
  // ==============================================
  
  // OBLIGATOIRES (au moins 2):
  ftp?: number | null;           // FTP en Watts (OBLIGATOIRE)
  tte_min?: number | null;       // TTE effectif en minutes (OBLIGATOIRE)
  pmax_5s?: number | null;       // Pmax 5s en Watts (OBLIGATOIRE OU sprint test)
  
  // OPTIONNELLES (améliorent la précision):
  weight_kg?: number | null;     // Poids en kg (pour FTP/kg)
  cadence_avg?: number | null;   // Cadence moyenne au seuil
  age?: number | null;           // Âge pour corrections
  
  // Alternatives Pmax
  pmax_10s?: number | null;
  pmax_15s?: number | null;
  
  // Métriques secondaires
  tss_7d?: number | null;
  
  // ==============================================
  // DONNÉES CAP
  // ==============================================
  sprint_15s_distance?: number | null;
  sprint_power?: number | null;
  vma?: number | null;
  css?: number | null;
  
  // ==============================================
  // MESURES DIRECTES (priorité absolue)
  // ==============================================
  vlamax_labo?: number | null;   // Mesure lactate laboratoire
  vlamax_test?: number | null;   // Test terrain structuré
  
  // ==============================================
  // CONTEXTE & QUALITÉ
  // ==============================================
  objectif?: string;
  sport?: 'velo' | 'cap' | 'both';
  tte_is_measured?: boolean;     // TTE issu d'un test ou bloc stable
  pmax_is_real?: boolean;        // Pmax réel (pas estimé)
}

// =============================================
// HELPERS
// =============================================

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// =============================================
// 6️⃣ INTERPRÉTATION OFFICIELLE V2 — TFCL™
// =============================================

/**
 * ÉCHELLE OFFICIELLE TFCL™ VLamax Vélo
 * 
 * 0.20–0.35 : profil très aérobie
 * 0.35–0.55 : équilibré
 * 0.55–0.75 : glycolytique
 * >0.75 : très glycolytique / sprinteur
 */
export const VLAMAX_SCALE = {
  VERY_AEROBIC: { min: 0.20, max: 0.35, label: 'Profil très aérobie' },
  BALANCED: { min: 0.35, max: 0.55, label: 'Équilibré' },
  GLYCOLYTIC: { min: 0.55, max: 0.75, label: 'Glycolytique' },
  SPRINTER: { min: 0.75, max: 0.90, label: 'Très glycolytique / Sprinteur' }
} as const;

export function getVLamaxCategory(value: number): VLamaxCategoryV2 {
  if (value < 0.35) return 'ultra_endurance';
  if (value < 0.55) return 'endurance';
  if (value < 0.75) return 'power';
  return 'sprinter';
}

export function getCategoryLabel(category: VLamaxCategoryV2): string {
  switch (category) {
    case 'ultra_endurance': return '🏔️ Profil très aérobie';
    case 'endurance': return '⚖️ Équilibré';
    case 'power': return '⚡ Glycolytique';
    case 'sprinter': return '🚀 Très glycolytique / Sprinteur';
  }
}

export function getCategoryDescription(category: VLamaxCategoryV2): string {
  switch (category) {
    case 'ultra_endurance': 
      return 'Profil idéal pour les épreuves de très longue durée (Ironman, ultra). Excellente utilisation des graisses.';
    case 'endurance': 
      return 'Bon équilibre pour les épreuves d\'endurance (marathon, 70.3, CLM). Polyvalent.';
    case 'power': 
      return 'Profil orienté puissance. Capacité glycolytique élevée, attention sur efforts très longs.';
    case 'sprinter':
      return 'Profil très explosif. Sprint/track. Nécessite adaptation spécifique pour endurance.';
  }
}

// =============================================
// 3️⃣ NORMALISATIONS TFCL™
// =============================================

/**
 * TTE_FACTOR officiel TFCL™
 * 
 * - >55 min → 0.6 (très endurant)
 * - 45–55 min → 0.8 (équilibré)
 * - <45 min → 1.0 (glycolytique)
 */
function computeTteFactor(tte_min: number): number {
  if (tte_min > 55) return 0.6;
  if (tte_min >= 45) return 0.8;
  return 1.0;
}

/**
 * DEFAULT_PMAX_RATIO officiel TFCL™
 * Utilisé si Pmax absent : valeur prudente = 1.9
 */
const DEFAULT_PMAX_RATIO = 1.9;

// =============================================
// 4️⃣ FORMULE V2 OFFICIELLE TFCL™ — VÉLO
// =============================================

/**
 * FORMULE VLAMAX VÉLO V2 OFFICIELLE — Two For Coaching Lab Method™
 * 
 * PHILOSOPHIE SCIENTIFIQUE:
 * VLamax est un TAUX de production glycolytique.
 * Sans lactate sanguin, TFCL produit une ESTIMATION CONTRAINTE, PAS UNE MESURE.
 * 
 * FORMULE CŒUR:
 * VLamax_raw = 0.30
 *   + 0.20 × clamp((pmax_ratio - 1.8) / 0.6, 0, 1)
 *   + 0.15 × clamp((ftp_kg - 4.5) / 1.5, 0, 1)
 *   + 0.15 × (1 - tte_factor)
 * 
 * BORNES PHYSIOLOGIQUES STRICTES:
 * VLamax_final = clamp(VLamax_raw, 0.20, 0.90)
 * 
 * Sources scientifiques:
 * - Mader & Heck (1986–2006)
 * - Jones & Poole (durabilité)
 * - Burnley & Jones (TTE)
 * - INSCYD public documentation
 */
export interface VLamaxBikeV2Result {
  value: number;
  confidence: number;
  sources: VLamaxSourceV2[];
  formula: 'tfcl_v2' | 'fallback_tte' | 'fallback_pmax' | 'insufficient';
  components?: {
    pmax_ratio: number;
    pmax_ratio_factor: number;
    ftp_kg: number;
    ftp_kg_factor: number;
    tte_factor: number;
    tte_contribution: number;
    vlamax_raw: number;
  };
  pedagogicalMessage: string;
}

export function computeVLamaxBikeV2(input: VLamaxV2Input): VLamaxBikeV2Result {
  const sources: VLamaxSourceV2[] = [];
  const { ftp, weight_kg, tte_min, pmax_5s, pmax_10s, pmax_15s, tte_is_measured, pmax_is_real } = input;
  
  // Déterminer Pmax (prendre le meilleur disponible ≤15s)
  const pmax = pmax_5s ?? pmax_10s ?? pmax_15s ?? null;
  
  // Vérifier données minimales (au moins 2 sur 3: FTP, TTE, Pmax)
  const hasData = [
    ftp != null && ftp > 0,
    tte_min != null && tte_min > 0,
    pmax != null && pmax > 0
  ].filter(Boolean).length;
  
  // =============================================
  // CAS IDÉAL: FTP + TTE + Pmax disponibles
  // → Formule TFCL V2 complète officielle
  // =============================================
  if (ftp != null && ftp > 0 && tte_min != null && tte_min > 0) {
    sources.push('tfcl_v2');
    if (pmax) sources.push('pmax_5s');
    sources.push('durability');
    
    // ÉTAPE 1: Calcul pmax_ratio
    // Si Pmax absent → utiliser valeur par défaut prudente = 1.9
    const pmax_ratio = pmax != null && pmax > 0 
      ? pmax / ftp 
      : DEFAULT_PMAX_RATIO;
    
    // ÉTAPE 2: Calcul ftp_kg
    const ftp_kg = weight_kg != null && weight_kg > 0 
      ? ftp / weight_kg 
      : 4.0; // Valeur neutre si poids inconnu
    
    // ÉTAPE 3: Calcul tte_factor
    const tte_factor = computeTteFactor(tte_min);
    
    // =============================================
    // FORMULE OFFICIELLE VLAMAX V2 TFCL™
    // =============================================
    
    // Composant A: Ratio Pmax/FTP (poids 0.20)
    // Mapping: 1.8 → 0, 2.4 → 1
    const pmax_ratio_factor = clamp((pmax_ratio - 1.8) / 0.6, 0, 1);
    const pmax_contribution = 0.20 * pmax_ratio_factor;
    
    // Composant B: FTP/kg (poids 0.15)
    // Mapping: 4.5 W/kg → 0, 6.0 W/kg → 1
    const ftp_kg_factor = clamp((ftp_kg - 4.5) / 1.5, 0, 1);
    const ftp_kg_contribution = 0.15 * ftp_kg_factor;
    
    // Composant C: TTE (poids 0.15)
    // tte_factor: 0.6 (endurant) → 1.0 (glycolytique)
    // Contribution: (1 - tte_factor) varie de 0 à 0.4
    const tte_contribution = 0.15 * (1 - tte_factor);
    
    // BASE + CONTRIBUTIONS
    const vlamax_raw = 0.30 + pmax_contribution + ftp_kg_contribution + tte_contribution;
    
    // =============================================
    // BORNES PHYSIOLOGIQUES STRICTES
    // =============================================
    const vlamax_final = clamp(vlamax_raw, 0.20, 0.90);
    
    // =============================================
    // 7️⃣ INDICE DE CONFIANCE
    // =============================================
    let confidence: number;
    let pedagogicalMessage: string;
    
    if (pmax_is_real && tte_is_measured) {
      // Sprint test + TTE mesuré = confiance 0.90
      confidence = 0.90;
      pedagogicalMessage = "Estimation modélisée – précision ±0.05";
    } else if (pmax != null && pmax > 0 && tte_min != null) {
      // Pmax + TTE estimé = confiance 0.75
      confidence = pmax_is_real || tte_is_measured ? 0.80 : 0.75;
      pedagogicalMessage = "Estimation modélisée – précision ±0.07";
    } else {
      // FTP seul + heuristique = confiance 0.60
      confidence = 0.60;
      pedagogicalMessage = "Estimation modélisée – précision ±0.10";
    }
    
    return {
      value: Number(vlamax_final.toFixed(2)),
      confidence,
      sources,
      formula: 'tfcl_v2',
      components: {
        pmax_ratio: Number(pmax_ratio.toFixed(2)),
        pmax_ratio_factor: Number(pmax_ratio_factor.toFixed(3)),
        ftp_kg: Number(ftp_kg.toFixed(2)),
        ftp_kg_factor: Number(ftp_kg_factor.toFixed(3)),
        tte_factor: Number(tte_factor.toFixed(2)),
        tte_contribution: Number(tte_contribution.toFixed(3)),
        vlamax_raw: Number(vlamax_raw.toFixed(3))
      },
      pedagogicalMessage
    };
  }
  
  // =============================================
  // FALLBACK: FTP + Pmax (sans TTE)
  // → Estimation via ratio uniquement
  // =============================================
  if (ftp != null && ftp > 0 && pmax != null && pmax > 0) {
    sources.push('ftp_pmax_ratio');
    if (pmax_5s) sources.push('pmax_5s');
    
    const pmax_ratio = pmax / ftp;
    
    // Mapping ratio → VLamax (heuristique)
    // Ratio 1.8 → 0.30, Ratio 2.4 → 0.50, Ratio 3.0 → 0.70
    const pmax_ratio_factor = clamp((pmax_ratio - 1.8) / 0.6, 0, 1);
    let estimated = 0.30 + 0.40 * pmax_ratio_factor;
    
    // Ajustement FTP/kg si disponible
    if (weight_kg != null && weight_kg > 0) {
      const ftpKg = ftp / weight_kg;
      const ftp_kg_factor = clamp((ftpKg - 4.5) / 1.5, 0, 1);
      estimated += 0.10 * ftp_kg_factor;
    }
    
    estimated = clamp(estimated, 0.20, 0.90);
    
    const confidence = pmax_is_real ? 0.65 : 0.55;
    
    return {
      value: Number(estimated.toFixed(2)),
      confidence,
      sources,
      formula: 'fallback_pmax',
      pedagogicalMessage: "Estimation approximative sans TTE – précision ±0.12"
    };
  }
  
  // =============================================
  // FALLBACK: FTP + TTE (sans Pmax)
  // → Utiliser pmax_ratio par défaut (1.9)
  // =============================================
  if (ftp != null && ftp > 0 && tte_min != null && tte_min > 0) {
    sources.push('durability');
    
    const pmax_ratio = DEFAULT_PMAX_RATIO; // Valeur prudente
    const tte_factor = computeTteFactor(tte_min);
    
    const ftp_kg = weight_kg != null && weight_kg > 0 
      ? ftp / weight_kg 
      : 4.0;
    
    // Formule simplifiée avec pmax_ratio par défaut
    const pmax_ratio_factor = clamp((pmax_ratio - 1.8) / 0.6, 0, 1);
    const ftp_kg_factor = clamp((ftp_kg - 4.5) / 1.5, 0, 1);
    
    const vlamax_raw = 0.30 
      + 0.20 * pmax_ratio_factor 
      + 0.15 * ftp_kg_factor 
      + 0.15 * (1 - tte_factor);
    
    const estimated = clamp(vlamax_raw, 0.20, 0.90);
    
    const confidence = tte_is_measured ? 0.65 : 0.55;
    
    return {
      value: Number(estimated.toFixed(2)),
      confidence,
      sources,
      formula: 'fallback_tte',
      pedagogicalMessage: "Estimation sans Pmax (ratio par défaut 1.9) – précision ±0.10"
    };
  }
  
  // =============================================
  // AUCUNE DONNÉE SUFFISANTE
  // =============================================
  return { 
    value: 0.42, 
    confidence: 0.30, 
    sources: ['estimated'],
    formula: 'insufficient',
    pedagogicalMessage: "Données insuffisantes – estimation très approximative"
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
    const bikeResult = computeVLamaxBikeV2(input);
    veloResult = { value: bikeResult.value, confidence: bikeResult.confidence, sources: bikeResult.sources };
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
  if (confidence >= 0.90) return "Très fiable (sprint + TTE mesuré)";
  if (confidence >= 0.75) return "Fiable (Pmax + TTE estimé)";
  if (confidence >= 0.60) return "Modérée (FTP + heuristique)";
  if (confidence >= 0.40) return "Limitée";
  return "Approximative";
}

export function getVLamaxSourcesLabel(sources: VLamaxSourceV2[]): string {
  const labels: Record<VLamaxSourceV2, string> = {
    lactate_lab: "Lactate labo",
    sprint_15s: "Sprint 15s",
    sprint_power: "Puissance sprint",
    pmax_5s: "Pmax 5s",
    durability: "Durabilité (TTE)",
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
      return 'text-blue-600 dark:text-blue-400';
    case 'endurance':
      return 'text-green-600 dark:text-green-400';
    case 'power':
      return 'text-amber-600 dark:text-amber-400';
    case 'sprinter':
      return 'text-red-600 dark:text-red-400';
  }
}

// =============================================
// 8️⃣ ALIGNEMENT ACADEMY — COMPRENDRE VLAMAX VÉLO V2
// =============================================

export const VLAMAX_ESTIMATION_EXPLAINER = {
  title: "Comprendre VLamax Vélo V2 — Two For Coaching Lab Method™",
  icon: "🔬",
  
  philosophy: `VLamax est un TAUX de production glycolytique.
Sans lactate sanguin, TFCL produit une ESTIMATION CONTRAINTE, PAS UNE MESURE.

La formule V2 :
- est bornée physiologiquement (0.20–0.90)
- évite les dérives extrêmes
- explique clairement ses hypothèses`,
  
  formula: {
    name: "Formule TFCL V2 Officielle",
    expression: `VLamax_raw = 0.30
  + 0.20 × clamp((pmax_ratio - 1.8) / 0.6, 0, 1)
  + 0.15 × clamp((ftp_kg - 4.5) / 1.5, 0, 1)
  + 0.15 × (1 - tte_factor)

VLamax_final = clamp(VLamax_raw, 0.20, 0.90)`,
    
    normalizations: {
      ftp_kg: "FTP / poids",
      pmax_ratio: "Pmax_5s / FTP (si absent → défaut prudent = 1.9)",
      tte_factor: ">55 min → 0.6 | 45–55 min → 0.8 | <45 min → 1.0"
    }
  },
  
  interpretation: {
    very_aerobic: "0.20–0.35 : profil très aérobie",
    balanced: "0.35–0.55 : équilibré",
    glycolytic: "0.55–0.75 : glycolytique",
    sprinter: ">0.75 : très glycolytique / sprinteur"
  },
  
  confidenceLevels: {
    high: "0.90 → sprint test + TTE mesuré",
    medium: "0.75 → Pmax + TTE estimé",
    low: "0.60 → FTP seul + heuristique"
  },
  
  hypotheses: [
    "Le rapport Pmax/FTP reflète le potentiel glycolytique relatif",
    "Le TTE (durabilité au seuil) est inversement corrélé à la VLamax",
    "Le ratio FTP/kg influence modérément le profil métabolique"
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
  
  compatibility: [
    "Si VLamax labo existe → priorité labo",
    "Sinon → V2",
    "Ne jamais mélanger V1 et V2"
  ],
  
  whenToMeasure: [
    "Objectif Ironman ou ultra-endurance avec enjeu de performance",
    "Doute sur l'orientation du profil métabolique",
    "Stagnation malgré entraînement adapté",
    "Préparation d'un pic de forme majeur"
  ],
  
  disclaimer: "VLamax est estimée à partir de votre profil puissance et durabilité. Estimation modélisée – précision ±0.05 à ±0.10."
};

// =============================================
// CHATBOT ALIGNMENT
// =============================================

export const VLAMAX_CHATBOT_QA = [
  {
    question: "Comment est calculée ma VLamax vélo ?",
    answer: `La formule TFCL V2 utilise trois composantes :
1. Ratio Pmax/FTP (20%) — mesure du potentiel glycolytique
2. Ratio FTP/kg (15%) — contexte de puissance relative
3. Facteur TTE (15%) — durabilité au seuil

Base = 0.30, bornée entre 0.20 et 0.90 mmol/L/s.`
  },
  {
    question: "Que signifie le niveau de confiance ?",
    answer: `La confiance dépend de la qualité des données :
- 0.90 : Sprint test réel + TTE mesuré
- 0.75 : Pmax + TTE estimé
- 0.60 : FTP seul + heuristique

Plus la confiance est élevée, plus l'estimation est précise.`
  },
  {
    question: "Ma VLamax est-elle bonne ou mauvaise ?",
    answer: `VLamax n'est ni bonne ni mauvaise — c'est une caractéristique du profil métabolique.
- VLamax basse (0.20–0.35) = profil endurant, idéal pour Ironman/ultra
- VLamax équilibrée (0.35–0.55) = polyvalent
- VLamax élevée (>0.55) = profil puissance/sprint

L'objectif guide l'interprétation.`
  },
  {
    question: "Dois-je faire un test lactate ?",
    answer: `Un test lactate est recommandé si :
- Objectif Ironman/ultra avec enjeu de performance
- Doute sur l'orientation du profil métabolique
- Stagnation malgré entraînement adapté
- Préparation d'un pic de forme majeur

Sinon, l'estimation TFCL V2 est suffisante pour orienter l'entraînement.`
  }
];
