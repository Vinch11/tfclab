/**
 * Nutrition Prédictive - Vince's Lab
 * Estimation des besoins glucidiques basée sur VLamax, sport et objectif
 * + Indice de Risque Nutritionnel avec plafonnement Race Readiness
 */

export type VLamaxCategory = 'very_low' | 'moderate' | 'high' | 'very_high';
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type Sport = 'velo' | 'cap' | 'triathlon';

export interface NutritionalRiskIndex {
  level: RiskLevel;
  label: string;
  color: 'success' | 'warning' | 'destructive';
  icon: '🟢' | '🟡' | '🟠' | '🔴';
  carbsRequired: number; // g/h estimé
  toleranceZone: number; // capacité absorption estimée g/h
  raceReadinessCap: number | null; // plafonnement Race Readiness (85, 75 ou null)
  mainRiskFactor: string;
  messageStaff: string;
  messagePedagogique: string;
}

export interface NutritionEstimate {
  carbsMin: number;
  carbsMax: number;
  riskLevel: RiskLevel;
  riskLabel: string;
  riskColor: 'success' | 'warning' | 'destructive';
  messageStaff: string;
  warnings: string[];
  vlamaxCategory: VLamaxCategory;
  vlamaxLabel: string;
  tteAdjustment: string | null;
  // Nouvel indice de risque nutritionnel
  nutritionalRiskIndex: NutritionalRiskIndex;
}

export function getVLamaxCategory(vlamax: number): VLamaxCategory {
  if (vlamax <= 0.30) return 'very_low';
  if (vlamax <= 0.45) return 'moderate';
  if (vlamax <= 0.60) return 'high';
  return 'very_high';
}

export function getVLamaxLabel(category: VLamaxCategory): string {
  switch (category) {
    case 'very_low': return 'Très bas (≤0.30)';
    case 'moderate': return 'Modéré (0.31–0.45)';
    case 'high': return 'Élevé (0.46–0.60)';
    case 'very_high': return 'Très élevé (>0.60)';
  }
}

// Tables de besoins glucidiques (g/h) par VLamax et objectif
const CARBS_TABLE_VELO: Record<VLamaxCategory, Record<string, [number, number] | null>> = {
  very_low: {
    ironman: [60, 70],
    im: [60, 70],
    ultra: [60, 70],
    '70.3': [70, 80],
    half: [70, 80],
    sprint: [80, 90],
    olympic: [80, 90],
    marathon: [60, 70],
    semi: [70, 80],
    trail: [60, 70],
  },
  moderate: {
    ironman: [70, 80],
    im: [70, 80],
    ultra: [70, 80],
    '70.3': [80, 90],
    half: [80, 90],
    sprint: [90, 100],
    olympic: [90, 100],
    marathon: [70, 80],
    semi: [80, 90],
    trail: [70, 80],
  },
  high: {
    ironman: [80, 90],
    im: [80, 90],
    ultra: [80, 90],
    '70.3': [90, 100],
    half: [90, 100],
    sprint: [100, 110],
    olympic: [100, 110],
    marathon: [80, 90],
    semi: [90, 100],
    trail: [80, 90],
  },
  very_high: {
    ironman: [90, 100],
    im: [90, 100],
    ultra: [90, 100],
    '70.3': [100, 120],
    half: [100, 120],
    sprint: null, // Risque élevé
    olympic: null,
    marathon: [90, 100],
    semi: [100, 110],
    trail: [90, 100],
  },
};

const CARBS_TABLE_CAP: Record<VLamaxCategory, Record<string, [number, number] | null>> = {
  very_low: {
    marathon: [50, 60],
    semi: [60, 70],
    sprint: [70, 80],
    '10k': [70, 80],
    ironman: [50, 60],
    im: [50, 60],
    '70.3': [60, 70],
    half: [60, 70],
    trail: [50, 60],
    ultra: [50, 60],
  },
  moderate: {
    marathon: [60, 70],
    semi: [70, 80],
    sprint: [80, 90],
    '10k': [80, 90],
    ironman: [60, 70],
    im: [60, 70],
    '70.3': [70, 80],
    half: [70, 80],
    trail: [60, 70],
    ultra: [60, 70],
  },
  high: {
    marathon: [70, 80],
    semi: [80, 90],
    sprint: null, // Limite tolérance
    '10k': null,
    ironman: [70, 80],
    im: [70, 80],
    '70.3': [80, 90],
    half: [80, 90],
    trail: [70, 80],
    ultra: [70, 80],
  },
  very_high: {
    marathon: null, // Non optimal
    semi: null, // Risqué
    sprint: null, // Déconseillé
    '10k': null,
    ironman: null,
    im: null,
    '70.3': null,
    half: null,
    trail: null,
    ultra: null,
  },
};

// Capacité d'absorption estimée par sport
const TOLERANCE_BY_SPORT: Record<Sport, number> = {
  velo: 100,    // Vélo : tolérance digestive élevée
  triathlon: 90, // Triathlon : mixte
  cap: 75,      // CAP : tolérance réduite
};

// Seuils de risque critique par sport
const CRITICAL_THRESHOLD_BY_SPORT: Record<Sport, number> = {
  velo: 100,
  triathlon: 95,
  cap: 85,
};

function normalizeObjectif(objectif: string): string {
  const obj = objectif.toLowerCase().trim();
  if (obj.includes('ironman') || obj.includes('im ') || obj === 'im') return 'ironman';
  if (obj.includes('70.3') || obj.includes('half')) return '70.3';
  if (obj.includes('marathon') && !obj.includes('semi') && !obj.includes('half')) return 'marathon';
  if (obj.includes('semi') || obj.includes('half-marathon')) return 'semi';
  if (obj.includes('sprint') || obj.includes('olympic')) return 'sprint';
  if (obj.includes('trail') || obj.includes('ultra')) return 'trail';
  if (obj.includes('10k') || obj.includes('10 km')) return '10k';
  return 'marathon'; // Default
}

function detectSport(objectif: string): Sport {
  const obj = objectif.toLowerCase();
  if (obj.includes('cap') || obj.includes('marathon') || obj.includes('semi') || obj.includes('10k') || obj.includes('trail')) {
    return 'cap';
  }
  if (obj.includes('triathlon') || obj.includes('ironman') || obj.includes('70.3')) {
    return 'triathlon';
  }
  return 'velo';
}

/**
 * Calcul de l'Indice de Risque Nutritionnel
 * Définition: probabilité que la stratégie glucidique nécessaire dépasse 
 * la capacité physiologique ou digestive de l'athlète sur la durée de l'épreuve.
 */
function computeNutritionalRiskIndex(params: {
  carbsRequired: number;
  sport: Sport;
  vlamax: number;
  tteMin: number | null;
  tteTarget: number;
  vlamaxCategory: VLamaxCategory;
}): NutritionalRiskIndex {
  const { carbsRequired, sport, vlamax, tteMin, tteTarget, vlamaxCategory } = params;
  
  const toleranceZone = TOLERANCE_BY_SPORT[sport];
  const criticalThreshold = CRITICAL_THRESHOLD_BY_SPORT[sport];
  
  // Déterminer le facteur de risque principal
  let mainRiskFactor = 'Profil équilibré';
  if (vlamaxCategory === 'very_high' || vlamaxCategory === 'high') {
    mainRiskFactor = 'VLamax élevé';
  } else if (tteMin !== null && tteMin < tteTarget * 0.8) {
    mainRiskFactor = 'TTE insuffisant';
  } else if (carbsRequired > toleranceZone) {
    mainRiskFactor = 'Intensité cible trop élevée';
  }
  
  // Calcul du niveau de risque selon les seuils
  let level: RiskLevel;
  let label: string;
  let color: 'success' | 'warning' | 'destructive';
  let icon: '🟢' | '🟡' | '🟠' | '🔴';
  let raceReadinessCap: number | null = null;
  let messageStaff: string;
  let messagePedagogique: string;

  if (carbsRequired <= 60) {
    // RISQUE FAIBLE
    level = 'low';
    label = 'Faible';
    color = 'success';
    icon = '🟢';
    messageStaff = 'Oxydation lipidique suffisante, dépendance glucidique maîtrisée. Stratégie nutritionnelle standard.';
    messagePedagogique = 'Stratégie nutritionnelle réaliste et sécurisée';
  } else if (carbsRequired <= 80) {
    // RISQUE MODÉRÉ
    level = 'moderate';
    label = 'Modéré';
    color = 'warning';
    icon = '🟡';
    messageStaff = 'Stratégie nutritionnelle nécessaire mais réaliste. Prévoir un plan d\'alimentation testé à l\'entraînement.';
    messagePedagogique = 'Stratégie possible mais dépendante de l\'exécution';
  } else if (carbsRequired <= criticalThreshold) {
    // RISQUE ÉLEVÉ
    level = 'high';
    label = 'Élevé';
    color = 'destructive';
    icon = '🟠';
    raceReadinessCap = 85; // Plafonnement Race Readiness à 85%
    messageStaff = `Dépendance glucidique importante (${carbsRequired}g/h). Sensible aux erreurs d'alimentation. Race Readiness plafonné à 85%.`;
    messagePedagogique = 'Stratégie possible mais très dépendante de l\'exécution';
  } else {
    // RISQUE CRITIQUE
    level = 'critical';
    label = 'Critique';
    color = 'destructive';
    icon = '🔴';
    raceReadinessCap = 75; // Plafonnement Race Readiness à 75%
    messageStaff = `Très forte dépendance glucidique (>${criticalThreshold}g/h). Risque élevé de défaillance en course. Race Readiness plafonné à 75%.`;
    messagePedagogique = 'Risque nutritionnel majeur – revoir objectif ou préparation';
  }

  // Ajustement si TTE faible
  if (tteMin !== null && tteMin < tteTarget * 0.7 && level !== 'critical') {
    if (level === 'low') {
      level = 'moderate';
      label = 'Modéré';
      color = 'warning';
      icon = '🟡';
    } else if (level === 'moderate') {
      level = 'high';
      label = 'Élevé';
      color = 'destructive';
      icon = '🟠';
      raceReadinessCap = 85;
    }
    mainRiskFactor = 'TTE insuffisant';
    messageStaff += ' TTE faible = dérive métabolique probable.';
  }

  return {
    level,
    label,
    color,
    icon,
    carbsRequired,
    toleranceZone,
    raceReadinessCap,
    mainRiskFactor,
    messageStaff,
    messagePedagogique,
  };
}

export function computeNutritionEstimate(params: {
  vlamax: number | null;
  objectif: string;
  sport?: Sport;
  tteMin?: number | null;
  tteTarget?: number;
}): NutritionEstimate | null {
  const { vlamax, objectif, sport: forcedSport, tteMin, tteTarget = 50 } = params;

  if (vlamax === null || vlamax === undefined) {
    return null;
  }

  const vlamaxCategory = getVLamaxCategory(vlamax);
  const vlamaxLabel = getVLamaxLabel(vlamaxCategory);
  const normalizedObjectif = normalizeObjectif(objectif);
  const sport = forcedSport || detectSport(objectif);

  // Sélection de la table selon le sport
  const isCAP = sport === 'cap';
  const table = isCAP ? CARBS_TABLE_CAP : CARBS_TABLE_VELO;
  const carbsRange = table[vlamaxCategory]?.[normalizedObjectif];

  const warnings: string[] = [];
  let riskLevel: RiskLevel = 'low';
  let messageStaff = '';
  let carbsMin: number;
  let carbsMax: number;

  // Gestion des cas à risque (null dans la table)
  if (carbsRange === null) {
    // VLamax trop élevé pour cet objectif/sport
    if (isCAP) {
      if (vlamaxCategory === 'very_high') {
        riskLevel = 'critical';
        messageStaff = 'Profil VLamax incompatible avec une stratégie nutritionnelle viable sur cette distance en CAP. Prioriser un travail de réduction du VLamax ou ajuster l\'objectif.';
        warnings.push('VLamax très élevé : dépendance glucidique excessive');
        warnings.push('Tolérance digestive insuffisante en CAP');
        carbsMin = 90;
        carbsMax = 100;
      } else {
        riskLevel = 'high';
        messageStaff = 'Limite de tolérance digestive atteinte. Stratégie nutritionnelle à tester minutieusement à l\'entraînement.';
        warnings.push('VLamax élevé : proche des limites physiologiques');
        carbsMin = 85;
        carbsMax = 95;
      }
    } else {
      riskLevel = 'high';
      messageStaff = 'Besoins glucidiques très élevés. Risque de détresse digestive sur effort court et intense.';
      warnings.push('Besoins supérieurs à 100g/h : risque digestif');
      carbsMin = 100;
      carbsMax = 120;
    }
  } else {
    [carbsMin, carbsMax] = carbsRange;

    // Détermination du niveau de risque
    if (vlamaxCategory === 'very_low') {
      riskLevel = 'low';
      messageStaff = 'Profil favorable à une nutrition stable. Dépendance glucidique modérée, bonne capacité d\'oxydation des lipides.';
    } else if (vlamaxCategory === 'moderate') {
      riskLevel = 'low';
      messageStaff = 'Profil équilibré. Besoins glucidiques standards pour l\'objectif. Stratégie nutritionnelle classique recommandée.';
    } else if (vlamaxCategory === 'high') {
      riskLevel = 'moderate';
      messageStaff = 'VLamax élevé : dépendance glucidique importante. Prévoir une stratégie nutritionnelle agressive et testée.';
      warnings.push('Dépendance glucidique marquée');
      if (isCAP) {
        warnings.push('Tolérance digestive à surveiller');
      }
    } else {
      riskLevel = 'high';
      messageStaff = 'Profil à risque sur longue durée. VLamax très élevé impliquant une consommation glycogénique rapide. Stratégie à affiner avec le staff.';
      warnings.push('Consommation glycogénique très rapide');
      warnings.push('Risque d\'hypoglycémie si apports insuffisants');
    }
  }

  // Ajustement TTE
  let tteAdjustment: string | null = null;
  if (tteMin !== null && tteMin !== undefined && tteMin < tteTarget) {
    tteAdjustment = `TTE inférieur à la cible (${tteMin} vs ${tteTarget} min) : dérive métabolique probable, besoin glucidique potentiellement plus élevé mais tolérance réduite.`;
    if (riskLevel === 'low') riskLevel = 'moderate';
    warnings.push('TTE < cible : ajustement nutritionnel recommandé');
  }

  // Calcul de l'Indice de Risque Nutritionnel
  const avgCarbs = (carbsMin + carbsMax) / 2;
  const nutritionalRiskIndex = computeNutritionalRiskIndex({
    carbsRequired: avgCarbs,
    sport,
    vlamax,
    tteMin: tteMin ?? null,
    tteTarget,
    vlamaxCategory,
  });

  const riskLabel = riskLevel === 'low' ? 'Faible' : riskLevel === 'moderate' ? 'Modéré' : riskLevel === 'critical' ? 'Critique' : 'Élevé';
  const riskColor = riskLevel === 'low' ? 'success' : riskLevel === 'moderate' ? 'warning' : 'destructive';

  return {
    carbsMin,
    carbsMax,
    riskLevel,
    riskLabel,
    riskColor,
    messageStaff,
    warnings,
    vlamaxCategory,
    vlamaxLabel,
    tteAdjustment,
    nutritionalRiskIndex,
  };
}

/**
 * Applique le plafonnement du Race Readiness basé sur le risque nutritionnel
 */
export function applyNutritionalCap(score: number, nutritionalRiskIndex: NutritionalRiskIndex | null): {
  cappedScore: number;
  wasCapped: boolean;
  capReason: string | null;
} {
  if (!nutritionalRiskIndex || nutritionalRiskIndex.raceReadinessCap === null) {
    return { cappedScore: score, wasCapped: false, capReason: null };
  }

  const cap = nutritionalRiskIndex.raceReadinessCap;
  if (score > cap) {
    return {
      cappedScore: cap,
      wasCapped: true,
      capReason: `Limitation nutritionnelle identifiée – préparation métabolique incomplète (risque ${nutritionalRiskIndex.label})`,
    };
  }

  return { cappedScore: score, wasCapped: false, capReason: null };
}

export function getObjectifLabel(objectif: string): string {
  const obj = normalizeObjectif(objectif);
  const labels: Record<string, string> = {
    ironman: 'Ironman',
    '70.3': '70.3 / Half',
    marathon: 'Marathon',
    semi: 'Semi-Marathon',
    sprint: 'Sprint / Olympic',
    trail: 'Trail / Ultra',
    '10k': '10K',
  };
  return labels[obj] || objectif;
}

/**
 * Définition officielle de l'Indice de Risque Nutritionnel
 */
export const NUTRITIONAL_RISK_DEFINITION = 
  "Indice de Risque Nutritionnel = probabilité que la stratégie glucidique nécessaire dépasse la capacité physiologique ou digestive de l'athlète sur la durée de l'épreuve.";
