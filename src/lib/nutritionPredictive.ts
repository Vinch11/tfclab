/**
 * Nutrition Prédictive – Two For Coaching Lab
 * 
 * Module scientifique d'estimation des besoins glucidiques basé sur :
 * - Modèle Mader (calculateCarbOxidation) pour l'oxydation totale
 * - VLamax (combustion glucidique)
 * - TTE (endurance métabolique)
 * - Potentiel Physiologique (adéquation physiologique)
 * - Sport (vélo vs course à pied)
 * 
 * La nutrition est une CONSÉQUENCE, pas une variable isolée.
 */

import { computeBaseRateMader } from './v2/nutritionUnified';

export type VLamaxCategory = 'very_low' | 'moderate' | 'high' | 'very_high';
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type Sport = 'velo' | 'cap' | 'triathlon';

// ============= TEXTE OFFICIEL À AFFICHER =============
export const NUTRITION_METHODOLOGY = {
  title: "Nutrition prédictive – Two For Coaching Lab",
  intro: `Les besoins glucidiques sont estimés à partir des caractéristiques physiologiques de l'athlète (VLamax, endurance, économie de mouvement).

Ces valeurs sont des plages recommandées, destinées à guider la stratégie nutritionnelle et non à remplacer les tests terrain.

Une préparation insuffisante ou une mauvaise économie de course peut limiter la capacité réelle d'absorption.`,
  
  principles: [
    "VLamax élevé → forte combustion glucidique",
    "TTE élevé → meilleure capacité à soutenir une intensité",
    "Économie faible → surcoût énergétique",
    "CAP > Vélo = contrainte mécanique + digestive plus élevée",
  ],
  
  veloLogic: {
    title: "Logique Vélo",
    points: [
      "Meilleure absorption digestive",
      "Intensité plus stable",
      "Contrainte mécanique plus faible",
    ],
    ranges: {
      low: "VLamax bas + Potentiel Physiologique élevée → 60–80 g/h",
      moderate: "VLamax moyen → 80–100 g/h", 
      high: "VLamax élevé → 90–120 g/h (prudence digestive)",
    },
  },
  
  capLogic: {
    title: "Logique Course à Pied",
    points: [
      "Absorption réduite vs vélo",
      "Dérive cardiaque plus rapide",
      "Impact mécanique majeur",
    ],
    adjustments: [
      "Réduction de 10 à 25% vs vélo",
      "Dépendance forte à l'économie de course",
      "Pénalité si Potentiel Physiologique CAP est faible",
    ],
    ranges: {
      good_economy: "Bonne économie + VLamax bas → 50–70 g/h",
      average_economy: "Économie moyenne → 45–60 g/h",
      poor_economy: "Économie faible / dérive élevée → 30–50 g/h",
    },
  },
  
  potentielPhysiologiqueLink: `Potentiel Physiologique influence directement les recommandations nutritionnelles.
Une Potentiel Physiologique faible réduit les apports conseillés et invalide toute stratégie nutritionnelle agressive.`,
  
  disclaimer: `⚠️ Aucun chiffre unique imposé. Toujours une plage. 
Mention explicite des limites physiologiques. 
Aucun conseil médical.`,
};

// ============= COMPARAISON VÉLO vs CAP =============
export const SPORT_NUTRITION_COMPARISON = {
  velo: {
    icon: '🚴',
    label: 'Vélo',
    tolerance: 100,
    criticalThreshold: 100,
    advantages: [
      "Tolérance digestive élevée",
      "Position stable",
      "Cadence ajustable",
    ],
    nutritionFactor: 1.0,
  },
  cap: {
    icon: '🏃',
    label: 'Course à Pied',
    tolerance: 75,
    criticalThreshold: 85,
    constraints: [
      "Tolérance digestive réduite (-25%)",
      "Impacts mécaniques répétés",
      "Dérive cardiaque plus rapide",
    ],
    nutritionFactor: 0.75, // Réduction de 25% vs vélo
  },
  triathlon: {
    icon: '🏊',
    label: 'Triathlon',
    tolerance: 90,
    criticalThreshold: 95,
    notes: [
      "Mixte vélo + CAP",
      "Transition digestive délicate",
    ],
    nutritionFactor: 0.90,
  },
};

export interface NutritionalRiskIndex {
  level: RiskLevel;
  label: string;
  color: 'success' | 'warning' | 'destructive';
  icon: '🟢' | '🟡' | '🟠' | '🔴';
  carbsRequired: number;
  toleranceZone: number;
  potentielPhysiologiqueCap: number | null;
  mainRiskFactor: string;
  messageStaff: string;
  messagePedagogique: string;
  sportSpecific: {
    sport: Sport;
    sportLabel: string;
    nutritionFactor: number;
    constraints: string[];
  };
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
  nutritionalRiskIndex: NutritionalRiskIndex;
  sport: Sport;
  sportLabel: string;
  potentielPhysiologiqueImpact: {
    message: string;
    adjustedCarbs: boolean;
  } | null;
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

// F31 — CARBS_TABLE_VELO/CAP supprimées : code mort depuis F26 (le pipeline
// délègue désormais à `nutritionUnified.computeBaseRateMader`). Conserver les
// valeurs hardcodées (notamment 10K → [70-80] g/h) constituait un bypass
// silencieux du calcul canonique Mader-Heck.

// Capacité d'absorption estimée par sport (g/h)
const TOLERANCE_BY_SPORT: Record<Sport, number> = {
  velo: 100,    // Vélo : tolérance digestive élevée
  triathlon: 90, // Triathlon : mixte
  cap: 75,      // CAP : tolérance réduite de ~25%
};

// Seuils de risque critique par sport (g/h)
const CRITICAL_THRESHOLD_BY_SPORT: Record<Sport, number> = {
  velo: 100,
  triathlon: 95,
  cap: 85,
};

// Facteur de réduction nutrition CAP vs Vélo
const NUTRITION_REDUCTION_BY_SPORT: Record<Sport, number> = {
  velo: 1.0,
  triathlon: 0.90,
  cap: 0.75, // -25% vs vélo
};

// Labels sport pour UI
const SPORT_LABELS: Record<Sport, string> = {
  velo: 'Vélo',
  cap: 'Course à Pied',
  triathlon: 'Triathlon',
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
 * 
 * Interprétation staff:
 * 🟢 Risque faible = Stratégie réaliste et tolérable
 * 🟠 Risque modéré = Risque digestif possible → stratégie à tester
 * 🔴 Risque élevé = La nutrition devient le facteur limitant de la performance
 */
function computeNutritionalRiskIndex(params: {
  carbsRequired: number;
  sport: Sport;
  vlamax: number;
  tteMin: number | null;
  tteTarget: number | null;
  vlamaxCategory: VLamaxCategory;
  potentielPhysiologique?: number | null;
}): NutritionalRiskIndex {
  const { carbsRequired, sport, vlamax, tteMin, tteTarget, vlamaxCategory, potentielPhysiologique } = params;
  
  const toleranceZone = TOLERANCE_BY_SPORT[sport];
  const criticalThreshold = CRITICAL_THRESHOLD_BY_SPORT[sport];
  const sportLabel = SPORT_LABELS[sport];
  const nutritionFactor = NUTRITION_REDUCTION_BY_SPORT[sport];
  
  // Contraintes spécifiques au sport
  const sportConstraints = sport === 'cap' 
    ? ['Tolérance digestive réduite (-25%)', 'Impacts mécaniques', 'Dérive cardiaque']
    : sport === 'triathlon'
    ? ['Transition vélo→CAP délicate', 'Fatigue cumulative']
    : ['Tolérance digestive élevée', 'Position stable'];
  
  // Déterminer le facteur de risque principal
  let mainRiskFactor = 'Profil équilibré';
  if (vlamaxCategory === 'very_high' || vlamaxCategory === 'high') {
    mainRiskFactor = 'VLamax élevé → forte combustion glucidique';
  } else if (tteMin !== null && tteMin < tteTarget * 0.8) {
    mainRiskFactor = 'TTE insuffisant → dérive métabolique probable';
  } else if (carbsRequired > toleranceZone) {
    mainRiskFactor = `Besoins > tolérance ${sportLabel}`;
  } else if (potentielPhysiologique !== null && potentielPhysiologique !== undefined && potentielPhysiologique < 70) {
    mainRiskFactor = 'Potentiel Physiologique faible → stratégie agressive déconseillée';
  }
  
  // Calcul du niveau de risque selon les seuils
  let level: RiskLevel;
  let label: string;
  let color: 'success' | 'warning' | 'destructive';
  let icon: '🟢' | '🟡' | '🟠' | '🔴';
  let potentielPhysiologiqueCap: number | null = null;
  let messageStaff: string;
  let messagePedagogique: string;

  // Seuils ajustés par sport (CAP plus strict)
  const lowThreshold = sport === 'cap' ? 55 : 60;
  const moderateThreshold = sport === 'cap' ? 70 : 80;

  if (carbsRequired <= lowThreshold) {
    // 🟢 RISQUE FAIBLE - Stratégie réaliste et tolérable
    level = 'low';
    label = 'Faible';
    color = 'success';
    icon = '🟢';
    messageStaff = `Oxydation lipidique suffisante. Dépendance glucidique maîtrisée. Stratégie nutritionnelle standard en ${sportLabel.toLowerCase()}.`;
    messagePedagogique = `Ton métabolisme est économe en glucides. À l'intensité cible, ton corps utilise efficacement les lipides. Marge de sécurité nutritionnelle confortable.`;
  } else if (carbsRequired <= moderateThreshold) {
    // 🟡 RISQUE MODÉRÉ - Risque digestif possible → stratégie à tester
    level = 'moderate';
    label = 'Modéré';
    color = 'warning';
    icon = '🟡';
    messageStaff = `Stratégie nutritionnelle nécessaire mais réaliste en ${sportLabel.toLowerCase()}. Plan à tester à l'entraînement.`;
    messagePedagogique = `Ton métabolisme consomme une quantité modérée de glucides. Stratégie nutritionnelle rigoureuse nécessaire mais réaliste. Teste ton plan en entraînement.`;
  } else if (carbsRequired <= criticalThreshold) {
    // 🟠 RISQUE ÉLEVÉ - Potentiel Physiologique plafonné à 85%
    level = 'high';
    label = 'Élevé';
    color = 'destructive';
    icon = '🟠';
    potentielPhysiologiqueCap = 85;
    messageStaff = `Dépendance glucidique importante (${carbsRequired}g/h en ${sportLabel.toLowerCase()}). Sensible aux erreurs. Potentiel Physiologique max: 85%.`;
    messagePedagogique = `Ton métabolisme consomme beaucoup de glucides. Stratégie très rigoureuse obligatoire. Risque d'épuisement si apports insuffisants. Priorité: devenir plus économe.`;
  } else {
    // 🔴 RISQUE CRITIQUE - La nutrition devient le facteur limitant
    level = 'critical';
    label = 'Critique';
    color = 'destructive';
    icon = '🔴';
    potentielPhysiologiqueCap = 75;
    messageStaff = `Très forte dépendance glucidique (>${criticalThreshold}g/h). LA NUTRITION DEVIENT LE FACTEUR LIMITANT. Potentiel Physiologique max: 75%.`;
    messagePedagogique = `Tes besoins glucidiques dépassent ta capacité d'absorption digestive. Risque majeur de défaillance. Avant de penser nutrition, réduis ta dépendance glucidique (travail VLamax).`;
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
      potentielPhysiologiqueCap = 85;
    }
    mainRiskFactor = 'TTE insuffisant → dérive métabolique probable';
    messageStaff += ' ⚠️ TTE faible = dérive métabolique en course.';
  }

  // Ajustement si Potentiel Physiologique faible (invalide stratégie agressive)
  if (potentielPhysiologique !== null && potentielPhysiologique !== undefined && potentielPhysiologique < 60 && level === 'low') {
    level = 'moderate';
    label = 'Modéré';
    color = 'warning';
    icon = '🟡';
    messageStaff += ' Potentiel Physiologique faible → prudence sur la stratégie nutritionnelle.';
  }

  return {
    level,
    label,
    color,
    icon,
    carbsRequired,
    toleranceZone,
    potentielPhysiologiqueCap,
    mainRiskFactor,
    messageStaff,
    messagePedagogique,
    sportSpecific: {
      sport,
      sportLabel,
      nutritionFactor,
      constraints: sportConstraints,
    },
  };
}

export function computeNutritionEstimate(params: {
  vlamax: number | null;
  objectif: string;
  sport?: Sport;
  tteMin?: number | null;
  tteTarget?: number;
  potentielPhysiologique?: number | null;
  vo2max?: number | null;
  weightKg?: number | null;
}): NutritionEstimate | null {
  const { vlamax, objectif, sport: forcedSport, tteMin, tteTarget = 50, potentielPhysiologique, vo2max, weightKg } = params;

  if (vlamax === null || vlamax === undefined) {
    return null;
  }

  const vlamaxCategory = getVLamaxCategory(vlamax);
  const vlamaxLabel = getVLamaxLabel(vlamaxCategory);
  const normalizedObjectif = normalizeObjectif(objectif);
  const sport = forcedSport || detectSport(objectif);
  const sportLabel = SPORT_LABELS[sport];

  const warnings: string[] = [];
  let riskLevel: RiskLevel = 'low';
  let messageStaff = '';
  let carbsMin: number;
  let carbsMax: number;

  // --- Calcul Mader-based via source canonique unique ---
  // Audit 2D F26 — délégué à `nutritionUnified.computeBaseRateMader` pour
  // garantir l'égalité stricte avec NutritionV2/NutritionUnified/Index/Dashboard.
  const vo2 = vo2max ?? (sport === 'cap' ? 48 : 50);
  const weight = weightKg ?? 70;

  // Intensité typique par objectif
  const intensityMap: Record<string, number> = {
    ironman: 70, '70.3': 78, marathon: 82, semi: 88,
    sprint: 92, trail: 75, '10k': 90,
  };
  const intensity = intensityMap[normalizedObjectif] ?? 75;

  // Durée typique par objectif
  const durationMap: Record<string, number> = {
    ironman: 10, '70.3': 5, marathon: 3.5, semi: 1.75,
    sprint: 1.25, trail: 4, '10k': 0.67,
  };
  const duration = durationMap[normalizedObjectif] ?? 3;

  // `nutritionUnified` ne supporte que 'velo' | 'cap'. On mappe 'triathlon' → 'cap'
  // (sport dominant CHO en triathlon longue distance) et on ré-applique le facteur
  // tolérance digestive triathlon en post-traitement.
  const unifiedSport: 'velo' | 'cap' = sport === 'velo' ? 'velo' : 'cap';
  const { baseRate } = computeBaseRateMader(weight, unifiedSport, vo2, vlamax, intensity, duration);

  // Ajustement triathlon : réintroduire le facteur 0.90 (vs 0.82 CAP, 1.0 vélo)
  let centralCarbs = baseRate;
  if (sport === 'triathlon') {
    // Annule le -18% CAP appliqué par computeBaseRateMader puis applique -10% triathlon
    centralCarbs = Math.round(baseRate / 0.82 * 0.90);
  }

  const capMax = sport === 'cap' ? 75 : sport === 'triathlon' ? 85 : 120;
  // F31 — Plancher dynamique : 0 g/h pour 10K / sprint (<1h),
  // 30 g/h pour épreuves d'endurance. Pas de bypass des tables hardcodées.
  const isShortEvent = duration < 1;
  const minFloor = isShortEvent ? 0 : 30;
  centralCarbs = Math.max(minFloor, Math.min(capMax, centralCarbs));
  carbsMin = Math.max(Math.max(0, minFloor - 5), centralCarbs - 10);
  carbsMax = Math.min(120, centralCarbs + 10);

  // Détermination du niveau de risque
  if (vlamaxCategory === 'very_low') {
    riskLevel = 'low';
    messageStaff = `Profil favorable en ${sportLabel}. Bonne oxydation lipidique, dépendance glucidique modérée.`;
  } else if (vlamaxCategory === 'moderate') {
    riskLevel = 'low';
    messageStaff = `Profil équilibré. Besoins standards pour ${getObjectifLabel(objectif)} en ${sportLabel}.`;
  } else if (vlamaxCategory === 'high') {
    riskLevel = 'moderate';
    messageStaff = `VLamax élevé : dépendance glucidique importante en ${sportLabel}. Stratégie agressive à tester.`;
    warnings.push('Dépendance glucidique marquée');
    if (sport === 'cap') {
      warnings.push('Tolérance digestive réduite en CAP');
    }
  } else {
    // very_high VLamax
    riskLevel = sport === 'cap' ? 'critical' : 'high';
    messageStaff = sport === 'cap' 
      ? `Profil VLamax incompatible avec stratégie nutritionnelle viable en ${sportLabel}. Prioriser réduction VLamax.`
      : `Profil à risque sur longue durée en ${sportLabel}. Consommation glycogénique très rapide.`;
    warnings.push('Consommation glycogénique très rapide');
    warnings.push('Risque hypoglycémie si apports insuffisants');
  }

  // Ajustement TTE
  let tteAdjustment: string | null = null;
  if (tteMin !== null && tteMin !== undefined && tteMin < tteTarget) {
    tteAdjustment = `TTE inférieur à la cible (${tteMin} vs ${tteTarget} min) : dérive métabolique probable. Besoin glucidique potentiellement plus élevé mais tolérance réduite.`;
    if (riskLevel === 'low') riskLevel = 'moderate';
    warnings.push('TTE < cible : ajustement nutritionnel requis');
  }

  // ========== LIEN RACE READINESS → NUTRITION ==========
  let potentielPhysiologiqueImpact: { message: string; adjustedCarbs: boolean } | null = null;
  
  if (potentielPhysiologique !== null && potentielPhysiologique !== undefined) {
    if (potentielPhysiologique < 50) {
      // Potentiel Physiologique très faible → réduction apports conseillés
      const reduction = Math.round((carbsMax - carbsMin) * 0.3);
      carbsMax = Math.max(carbsMin, carbsMax - reduction);
      potentielPhysiologiqueImpact = {
        message: `Potentiel Physiologique < 50% : stratégie nutritionnelle agressive DÉCONSEILLÉE. Apports réduits de ${reduction}g/h.`,
        adjustedCarbs: true,
      };
      warnings.push('Potentiel Physiologique faible → prudence nutritionnelle');
      if (riskLevel === 'low') riskLevel = 'moderate';
    } else if (potentielPhysiologique < 70) {
      potentielPhysiologiqueImpact = {
        message: `Potentiel Physiologique modérée (${Math.round(potentielPhysiologique)}%) : valider la tolérance digestive à l'entraînement avant d'appliquer cette stratégie.`,
        adjustedCarbs: false,
      };
    }
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
    potentielPhysiologique,
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
    sport,
    sportLabel,
    potentielPhysiologiqueImpact,
  };
}

/**
 * Applique le plafonnement du Potentiel Physiologique basé sur le risque nutritionnel
 */
export function applyNutritionalCap(score: number, nutritionalRiskIndex: NutritionalRiskIndex | null): {
  cappedScore: number;
  wasCapped: boolean;
  capReason: string | null;
} {
  if (!nutritionalRiskIndex || nutritionalRiskIndex.potentielPhysiologiqueCap === null) {
    return { cappedScore: score, wasCapped: false, capReason: null };
  }

  const cap = nutritionalRiskIndex.potentielPhysiologiqueCap;
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
