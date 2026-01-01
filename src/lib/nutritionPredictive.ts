/**
 * Nutrition Prédictive - Vince's Lab
 * Estimation des besoins glucidiques basée sur VLamax, sport et objectif
 */

export type VLamaxCategory = 'very_low' | 'moderate' | 'high' | 'very_high';
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';
export type Sport = 'velo' | 'cap' | 'triathlon';

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

  // Gestion des cas à risque (null dans la table)
  if (carbsRange === null) {
    // VLamax trop élevé pour cet objectif/sport
    if (isCAP) {
      if (vlamaxCategory === 'very_high') {
        riskLevel = 'critical';
        messageStaff = 'Profil VLamax incompatible avec une stratégie nutritionnelle viable sur cette distance en CAP. Prioriser un travail de réduction du VLamax ou ajuster l\'objectif.';
        warnings.push('VLamax très élevé : dépendance glucidique excessive');
        warnings.push('Tolérance digestive insuffisante en CAP');
      } else {
        riskLevel = 'high';
        messageStaff = 'Limite de tolérance digestive atteinte. Stratégie nutritionnelle à tester minutieusement à l\'entraînement.';
        warnings.push('VLamax élevé : proche des limites physiologiques');
      }
    } else {
      riskLevel = 'high';
      messageStaff = 'Besoins glucidiques très élevés. Risque de détresse digestive sur effort court et intense.';
      warnings.push('Besoins supérieurs à 100g/h : risque digestif');
    }

    return {
      carbsMin: isCAP ? 80 : 100,
      carbsMax: isCAP ? 90 : 120,
      riskLevel,
      riskLabel: riskLevel === 'critical' ? 'Critique' : 'Élevé',
      riskColor: 'destructive',
      messageStaff,
      warnings,
      vlamaxCategory,
      vlamaxLabel,
      tteAdjustment: null,
    };
  }

  const [carbsMin, carbsMax] = carbsRange;

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

  // Ajustement TTE
  let tteAdjustment: string | null = null;
  if (tteMin !== null && tteMin !== undefined && tteMin < tteTarget) {
    tteAdjustment = `TTE inférieur à la cible (${tteMin} vs ${tteTarget} min) : dérive métabolique probable, besoin glucidique potentiellement plus élevé mais tolérance réduite.`;
    if (riskLevel === 'low') riskLevel = 'moderate';
    warnings.push('TTE < cible : ajustement nutritionnel recommandé');
  }

  const riskLabel = riskLevel === 'low' ? 'Faible' : riskLevel === 'moderate' ? 'Modéré' : 'Élevé';
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
  };
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
