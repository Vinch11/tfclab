/**
 * NUTRITION UNIFIÉE TFCL™ — Moteur complet
 * 
 * Fusionne V1 (risque), V2 (calcul modulaire), Timing (phases)
 * + Hydratation & Sodium + Plan produit concret
 * + Toggle Staff / Athlète
 * 
 * Références:
 * - Jeukendrup 2017: glucose:fructose 2:1, 90-120g/h possible
 * - Burke 2019: elite marathoners 60-90g/h
 * - Sawka 2007 (ACSM): 400-800 ml/h, sodium 300-600 mg/h
 * - Pfeiffer 2012: Ironman 90-108g/h
 */

import { METHOD_VERSION_DISPLAY } from './scientificGovernance';
import { calculateCarbOxidation } from './maderMetabolicModel';

// =============================================
// TYPES
// =============================================

export type NutritionRisk = 'low' | 'moderate' | 'high' | 'critical';
export type NutritionSport = 'velo' | 'cap' | 'trail' | 'ultra';

export interface NutritionProduct {
  type: 'gel' | 'drink' | 'bar' | 'chew' | 'solid';
  label: string;
  carbsPerUnit: number;
  volumeMl?: number;
  frequency: string;
  notes?: string;
}

export interface NutritionPhaseUnified {
  name: 'PRE' | 'START' | 'MID' | 'LATE' | 'NIGHT';
  label: string;
  timeRange: string;
  carbsGh: number;
  carbsGhRange: string;
  /** F30 — durée effective de la phase en minutes (pour totaux cohérents). */
  durationMin: number;
  /** F30 — total CHO consommés sur la phase (g) = carbsGh × durationMin/60. */
  totalCarbsG: number;
  /** F30 — total kcal CHO sur la phase (4 kcal/g). */
  totalKcal: number;
  products: NutritionProduct[];
  hydrationMlH: number;
  sodiumMgH: number;
  frequencyMin: number;
  athleteMessage: string;
  staffMessage: string;
}

export interface HydrationPlan {
  baseMlH: number;
  heatAdjustedMlH: number;
  sodiumMgH: number;
  sodiumMgL: number;
  sweatRateEstimate: string;
  heatWarning: boolean;
  athleteMessage: string;
  staffMessage: string;
  recommendations: string[];
}

export interface NutritionContributorUnified {
  id: string;
  label: string;
  adjustment: number;
  direction: 'up' | 'down' | 'neutral';
  explanation: string;
}

export interface NutritionUnifiedResult {
  // Plage glucides
  carbsMin: number;
  carbsMax: number;
  carbsCentral: number;
  /** F30 — total CHO sur la course (somme phases START+MID+LATE × durée). */
  totalCarbsG: number;
  /** F30 — total kcal CHO (4 kcal/g). */
  totalKcal: number;

  // Risque
  risk: NutritionRisk;
  riskLabel: string;
  riskScore: number; // 0-4
  riskIcon: string;

  // Phases
  phases: NutritionPhaseUnified[];

  // Hydratation
  hydration: HydrationPlan;

  // Contributeurs
  contributors: NutritionContributorUnified[];

  // Messages (toggle staff/athlète)
  summaryAthlete: string;
  summaryStaff: string;
  whyAthlete: string;
  whyStaff: string;

  // Avertissements
  warnings: string[];
  athleteWarnings: string[];

  // Confiance
  confidence: number;

  // Contexte
  sport: NutritionSport;
  sportLabel: string;
  objectif: string;
  durationHours: number | null;

  // Disclaimer
  disclaimer: string;
}

export interface NutritionUnifiedInput {
  vlamaxValue: number | null;
  vlamaxConfidence?: number;
  vo2max?: number | null;
  tteMin: number | null;
  sport: NutritionSport;
  objectif: string;
  targetDurationHours: number | null;
  targetIntensityPct: number | null;
  weightKg: number | null;
  advancedGutTraining?: boolean;
  heatCondition?: boolean; // >28°C
  digestiveTolerance?: 'LOW' | 'MEDIUM' | 'HIGH';
}

// =============================================
// CONSTANTES
// =============================================

const DURATION_BY_OBJECTIF: Record<string, { velo: number; cap: number }> = {
  IM: { velo: 5.0, cap: 3.5 },
  Ironman: { velo: 5.0, cap: 3.5 },
  '70.3': { velo: 2.5, cap: 1.75 },
  Marathon: { velo: 0, cap: 3.5 },
  Semi: { velo: 0, cap: 1.67 },
  Trail: { velo: 0, cap: 4.0 },
  TrailLong: { velo: 0, cap: 6.0 },
  TrailUltra: { velo: 0, cap: 14.0 },
  '10K': { velo: 0, cap: 0.67 },
  '5K': { velo: 0, cap: 0.35 },
};

/** Sport→cap tolerance mapping (foot-based digestive constraints). */
const isCAPLike = (s: NutritionSport): boolean => s === 'cap' || s === 'trail' || s === 'ultra';
const isUltra = (s: NutritionSport): boolean => s === 'ultra';
const isTrailOrUltra = (s: NutritionSport): boolean => s === 'trail' || s === 'ultra';

/** Durée par défaut quand `targetDurationHours` absent ET sport trail/ultra. */
const DEFAULT_DURATION_BY_SPORT: Partial<Record<NutritionSport, number>> = {
  trail: 5,
  ultra: 14,
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// =============================================
// CALCUL GLUCIDES (fusion V2)
// =============================================



/**
 * Calcule le taux de base CHO (g/h) via le modèle Mader-Heck.
 *
 * Source canonique unique partagée entre :
 * - `nutritionUnified.computeNutritionUnified`
 * - `nutritionV2.computeNutritionV2`
 * - `nutritionPredictive.computeNutritionEstimate` (legacy V1)
 * - `nutritionTiming.computeNutritionTiming` (quand vo2max + weightKg fournis)
 *
 * Audit 2D F26 — élimine les divergences inter-modules de carbsCentral.
 */
export function computeBaseRateMader(
  weightKg: number, 
  sport: NutritionSport,
  vo2max: number | null | undefined,
  vlamaxValue: number | null,
  intensityPct: number | null,
  durationHours: number | null,
  heatCondition?: boolean
): { baseRate: number; totalOxidation: number; method: 'mader' | 'fallback' } {
  const capLike = isCAPLike(sport);
  const ultra = isUltra(sport);
  // F41 — insufficient-data guard : si vo2max OU vlamax manquent, on ne calcule
  // PAS un Mader-Heck déguisé avec des valeurs centrales. On flag `method:'fallback'`
  // pour que le caller/UI puisse afficher "Estimation par défaut — Données insuffisantes".
  const hasFullPhysio = vo2max != null && vlamaxValue != null;
  const vo2 = vo2max ?? (capLike ? 48 : 50);
  const vlx = vlamaxValue ?? 0.45;
  const intensity = intensityPct ?? 70;
  const duration = durationHours ?? 3;

  const carbOxGmin = calculateCarbOxidation(intensity, vo2, vlx, weightKg);
  let totalOxidationGh = carbOxGmin * 60;
  
  // Facteur chaleur: +10% oxydation CHO en conditions chaudes (>28°C)
  if (heatCondition) {
    totalOxidationGh *= 1.10;
  }
  
  // Modèle glycogène physiologique
  const glycogenStores = weightKg * 5;
  const totalCarbNeeded = totalOxidationGh * duration;
  const accessFactor = Math.min(0.75, 0.35 + 0.40 * Math.exp(-0.25 * duration));
  const effectiveStores = glycogenStores * accessFactor;
  const glycogenCoverage = Math.min(0.85, effectiveStores / totalCarbNeeded);
  
  const MIN_EXOGENOUS_FRACTION = duration < 1 ? 0 : duration < 2 ? 0.25 : duration < 3 ? 0.40 : 0.50;
  let exogenousGh = totalOxidationGh * Math.max(MIN_EXOGENOUS_FRACTION, 1 - glycogenCoverage);
  
  // CAP / trail / ultra : tolérance digestive réduite (~18%) vs vélo
  if (capLike) {
    exogenousGh *= 0.82;
  }
  // Ultra (>8h) : digestion dégradée → −15% additionnel (Pfeiffer 2012, Stellingwerff 2016)
  if (ultra && duration >= 6) {
    exogenousGh *= 0.82;
  }

  // Caps GI selon sport
  // velo 90, cap 75, trail 70 (montée=GI↓), ultra 60 (Pfeiffer 2012)
  const capMax = ultra ? 60 : sport === 'trail' ? 70 : capLike ? 75 : 90;
  const minFloor = duration < 1 ? 0 : 30;
  const baseRate = clamp(Math.round(exogenousGh), minFloor, capMax);
  const method = (vo2max != null && vlamaxValue != null) ? 'mader' : 'fallback';
  
  return { baseRate, totalOxidation: Math.round(totalOxidationGh), method };
}

function vlamaxAdj(v: number | null): { adj: number; explanation: string } {
  if (v === null) return { adj: 0, explanation: 'VLamax inconnue' };
  if (v < 0.35) return { adj: -10, explanation: `VLamax basse (${v.toFixed(2)}) → économie glucidique naturelle` };
  if (v <= 0.55) return { adj: 0, explanation: `VLamax équilibrée (${v.toFixed(2)})` };
  if (v <= 0.65) return { adj: 10, explanation: `VLamax élevée (${v.toFixed(2)}) → dépendance glucidique accrue` };
  return { adj: 20, explanation: `VLamax très élevée (${v.toFixed(2)}) → forte combustion` };
}

function tteAdj(tte: number | null): { adj: number; explanation: string } {
  if (tte === null) return { adj: 0, explanation: 'TTE inconnu' };
  if (tte < 45) return { adj: 10, explanation: `TTE court (${tte} min) → tolérance glycogène réduite` };
  if (tte > 55) return { adj: -5, explanation: `TTE long (${tte} min) → bonne endurance glycogène` };
  return { adj: 0, explanation: `TTE standard (${tte} min)` };
}

function durationAdj(h: number | null): { adj: number; explanation: string } {
  if (h === null) return { adj: 0, explanation: 'Durée inconnue' };
  if (h > 4) return { adj: 10, explanation: `Durée très longue (${h}h) → besoins augmentés` };
  if (h > 3) return { adj: 5, explanation: `Durée longue (${h}h)` };
  if (h < 1.5) return { adj: -5, explanation: `Durée courte (<1h30)` };
  return { adj: 0, explanation: `Durée standard` };
}

function intensityAdj(pct: number | null): { adj: number; explanation: string } {
  if (pct === null) return { adj: 0, explanation: 'Intensité inconnue' };
  if (pct >= 85) return { adj: 10, explanation: `Intensité haute (${pct}%) → combustion maximale` };
  if (pct >= 75) return { adj: 5, explanation: `Intensité seuil (${pct}%)` };
  if (pct <= 60) return { adj: -10, explanation: `Intensité basse (${pct}%) → économie glucidique` };
  return { adj: 0, explanation: `Intensité modérée (${pct}%)` };
}

// =============================================
// HYDRATATION (Sawka 2007 / ACSM)
// =============================================

function computeHydration(input: NutritionUnifiedInput): HydrationPlan {
  const weight = input.weightKg ?? 70;
  const sport = input.sport;
  const isCAP = isCAPLike(sport);
  const isHeat = input.heatCondition ?? false;
  const trailOrUltra = isTrailOrUltra(sport);
  const ultra = isUltra(sport);

  // Base: 7-10 ml/kg/h vélo, 5-8 ml/kg/h CAP/trail (contrainte mécanique).
  // Trail/ultra majoration légère car sudation prolongée + montagne.
  const baseMultiplier = trailOrUltra ? 8.0 : isCAP ? 6.5 : 8.5;
  const baseMlH = Math.round(weight * baseMultiplier);
  const heatFactor = isHeat ? 1.35 : 1.0;
  const heatAdjustedMlH = Math.round(baseMlH * heatFactor);

  // Sodium: trail 600-900 mg/h, ultra 800-1200 mg/h, standard 300-600.
  let baseSodiumMgH = isHeat ? 600 : 450;
  if (sport === 'trail') baseSodiumMgH = isHeat ? 900 : 750;
  if (ultra) baseSodiumMgH = isHeat ? 1200 : 1000;
  const sodiumMgL = Math.round((baseSodiumMgH / heatAdjustedMlH) * 1000);

  const recs: string[] = [];
  if (isHeat) {
    recs.push('Augmenter les apports de 30-35% en conditions chaudes (>28°C)');
    recs.push('Pré-hydratation : 500ml dans les 2h avant le départ');
  }
  if (isCAP) {
    recs.push('Privilégier les petites gorgées régulières (toutes les 10-15 min)');
    recs.push("Éviter de boire plus de 200ml d'un coup (risque gastrique)");
  } else {
    recs.push('Boire régulièrement toutes les 15-20 min');
    recs.push('Bidon isotonique (40-60g glucides/L + 400-600mg sodium/L)');
  }
  if (trailOrUltra) {
    recs.push('Sac/flasques : prévoir 500-750 ml entre 2 ravitos en montagne');
    recs.push('Pastilles de sel ou capsules Na+ (300-500 mg) toutes les 1-2h si chaleur');
  }
  if (ultra) {
    recs.push('Alterner boisson sucrée + eau plate (limiter écœurement)');
    recs.push('Bouillon/soupe chaude après 8h pour Na+ et confort digestif');
  }

  const athleteMsg = isHeat
    ? `Bois ${Math.round(heatAdjustedMlH / 4)} ml toutes les 15 min. Il fait chaud : augmente tes apports !`
    : `Bois ${Math.round(heatAdjustedMlH / 4)} ml toutes les 15 min, soit ~${Math.round(heatAdjustedMlH / 1000 * 2) / 2} bidon/h.`;

  const staffMsg = `Base ${baseMlH} ml/h (${baseMultiplier} ml/kg/h × ${weight} kg).${isHeat ? ` Correction chaleur ×1.35 → ${heatAdjustedMlH} ml/h.` : ''} Na+ ${baseSodiumMgH} mg/h (${sodiumMgL} mg/L).${trailOrUltra ? ' Trail/ultra : sudation prolongée + chaleur montagne.' : ''} Réf: Sawka 2007 ACSM${ultra ? ', Knechtle 2012' : ''}.`;

  return {
    baseMlH,
    heatAdjustedMlH,
    sodiumMgH: baseSodiumMgH,
    sodiumMgL,
    sweatRateEstimate: `${(heatAdjustedMlH / 1000).toFixed(1)} L/h estimé`,
    heatWarning: isHeat,
    athleteMessage: athleteMsg,
    staffMessage: staffMsg,
    recommendations: recs,
  };
}

// =============================================
// PLAN PRODUIT CONCRET
// =============================================

function generateProducts(carbsGh: number, sport: NutritionSport, tolerance: 'LOW' | 'MEDIUM' | 'HIGH'): NutritionProduct[] {
  const products: NutritionProduct[] = [];
  const isCAP = isCAPLike(sport);
  const trailOrUltra = isTrailOrUltra(sport);
  const ultra = isUltra(sport);

  if (carbsGh <= 50) {
    // Besoins faibles → boisson seule ou 1 gel
    products.push({
      type: 'drink',
      label: 'Boisson isotonique',
      carbsPerUnit: 30,
      volumeMl: 500,
      frequency: 'Bidon de 500ml / heure',
      notes: '40-60g de glucides/L'
    });
    if (carbsGh > 35) {
      products.push({
        type: 'gel',
        label: 'Gel énergétique',
        carbsPerUnit: 25,
        frequency: '1 gel toutes les 45 min',
        notes: isCAP ? 'Prendre avec une gorgée d\'eau' : undefined
      });
    }
  } else if (carbsGh <= 75) {
    // Besoins modérés → boisson + gel
    products.push({
      type: 'drink',
      label: 'Boisson isotonique',
      carbsPerUnit: 40,
      volumeMl: 500,
      frequency: '500ml / heure',
      notes: 'Glucose:Fructose 2:1 recommandé'
    });
    products.push({
      type: 'gel',
      label: 'Gel énergétique',
      carbsPerUnit: 25,
      frequency: '1 gel toutes les 25-30 min',
      notes: isCAP ? 'Prendre avec eau, éviter gels très concentrés' : undefined
    });
    if (!isCAP && tolerance !== 'LOW') {
      products.push({
        type: 'bar',
        label: 'Barre ou pâte de fruits',
        carbsPerUnit: 30,
        frequency: '1 toutes les 45-60 min (optionnel)',
        notes: 'Texture tendre, facile à mâcher'
      });
    }
  } else {
    // Besoins élevés (>75g/h) → multi-sources obligatoire
    products.push({
      type: 'drink',
      label: 'Boisson haute concentration',
      carbsPerUnit: 50,
      volumeMl: 500,
      frequency: '500-750ml / heure',
      notes: 'Glucose:Fructose 1:0.8, concentration 80-100g/L'
    });
    products.push({
      type: 'gel',
      label: 'Gel isotonique (glucose:fructose)',
      carbsPerUnit: 30,
      frequency: '1 gel toutes les 20-25 min',
      notes: 'Alterner avec boisson'
    });
    if (!isCAP) {
      products.push({
        type: 'chew',
        label: 'Gommes / bonbons énergétiques',
        carbsPerUnit: 20,
        frequency: '2-3 toutes les 30 min',
        notes: 'Variété de textures pour éviter l\'écoeurement'
      });
    }
    if (carbsGh >= 90) {
      products.push({
        type: 'drink',
        label: 'Cluster dextrine (optionnel)',
        carbsPerUnit: 40,
        volumeMl: 500,
        frequency: 'En complément du bidon isotonique',
        notes: 'Vidange gastrique rapide, très bien toléré'
      });
    }
  }

  // Trail / Ultra : ajouter aliments solides (dattes, banane, sandwich fromage)
  // Réf : Pfeiffer 2012 (ultra), Stellingwerff 2016 (mix solide/liquide)
  if (trailOrUltra) {
    products.push({
      type: 'solid',
      label: 'Dattes / banane / pâte de fruits',
      carbsPerUnit: 20,
      frequency: ultra ? 'Toutes les 30-45 min après 3h' : 'Toutes les 45 min',
      notes: 'Sucres rapides + texture solide pour confort gastrique',
    });
    products.push({
      type: 'solid',
      label: 'Sandwich fromage / pain saucisse',
      carbsPerUnit: 35,
      frequency: ultra ? '1 portion / 1h30 après 4h (mâcher lentement)' : 'Optionnel ravitaillement',
      notes: 'Apport solide + lipides + sel — privilégier en montée à allure modérée',
    });
    if (ultra) {
      products.push({
        type: 'solid',
        label: 'Bouillon / soupe chaude',
        carbsPerUnit: 10,
        volumeMl: 250,
        frequency: 'Après 8h + en phase NIGHT',
        notes: 'Sodium + chaleur + confort psychologique — réf. Knechtle 2012',
      });
    }
  }

  return products;
}

// =============================================
// PHASES CHRONOLOGIQUES
// =============================================

function generatePhases(
  carbsCentral: number,
  sport: NutritionSport,
  durationH: number | null,
  tolerance: 'LOW' | 'MEDIUM' | 'HIGH',
  vlamaxVal: number | null,
  maxBound: number = 90,
  isHeat: boolean = false,
  weightKg: number = 70,
): NutritionPhaseUnified[] {
  const durMin = durationH ? Math.round(durationH * 60) : 180;
  const lateStartMin = Math.round(durMin * 0.7);
  const isCAP = isCAPLike(sport);
  const trailOrUltra = isTrailOrUltra(sport);
  const ultra = isUltra(sport);
  const isNightUltra = ultra && (durationH ?? 0) > 12;

  // F30 — Anti-empilement chaleur :
  // Le facteur chaleur (+10%) est DÉJÀ appliqué dans `computeBaseRateMader` →
  // `carbsCentral` reflète déjà l'oxydation augmentée. La phase LATE ne doit
  // donc PAS empiler un +5% supplémentaire qui pousserait au-delà de la limite
  // GI (90 g/h sans gut training, 120 avec). Multiplicateur LATE :
  //   - Sans chaleur     → ×1.05 (progression naturelle)
  //   - Avec chaleur     → ×1.00 (chaleur déjà comptée dans la base)
  const lateMultiplier = isHeat ? 1.0 : 1.05;

  // Progressivité: START = 65% de la cible, MID = 100%, LATE = ×lateMultiplier
  const startCarbs = clamp(Math.round(carbsCentral * 0.65), 0, maxBound);
  const midCarbs = clamp(carbsCentral, 0, maxBound);
  const lateCarbs = clamp(Math.round(carbsCentral * lateMultiplier), 0, maxBound);

  // F30 — Durées effectives par phase (pour totaux énergie/CHO cohérents)
  const startDurMin = Math.min(30, durMin);
  const midEndMin = Math.min(lateStartMin, durMin);
  const midDurMin = Math.max(0, midEndMin - startDurMin);
  const lateDurMin = Math.max(0, durMin - midEndMin);

  const buildPhaseTotals = (carbsGh: number, durationMin: number) => {
    const totalCarbsG = Math.round((carbsGh * durationMin) / 60);
    const totalKcal = totalCarbsG * 4; // 4 kcal/g CHO
    return { durationMin, totalCarbsG, totalKcal };
  };

  const phases: NutritionPhaseUnified[] = [];

  // PRE-COURSE (pas une phase de course mais critique)
  phases.push({
    name: 'PRE',
    label: 'Avant le départ',
    timeRange: 'J-3 à H-0',
    carbsGh: 0,
    carbsGhRange: '—',
    durationMin: 0,
    totalCarbsG: 0,
    totalKcal: 0,
    products: [
      {
        type: 'bar',
        label: 'Charge glucidique J-3 à J-1',
        carbsPerUnit: 0,
        frequency: '8-10g/kg/jour pendant 2-3 jours',
        notes: 'Pâtes, riz, pain blanc, patate douce. Réduire fibres J-1.',
      },
      {
        type: 'bar',
        label: 'Petit-déjeuner jour J',
        carbsPerUnit: 0,
        frequency: '3h avant le départ',
        notes: '2-3g/kg: pain blanc + confiture + banane mûre + boisson sucrée',
      },
      {
        type: 'drink',
        label: 'Dernière prise',
        carbsPerUnit: 30,
        volumeMl: 250,
        frequency: '15-30 min avant le départ',
        notes: 'Gel ou boisson sucrée (30g glucides)',
      }
    ],
    hydrationMlH: 0,
    sodiumMgH: 0,
    frequencyMin: 0,
    athleteMessage: 'Charge tes réserves les 2-3 jours avant. Petit-déjeuner léger et digeste 3h avant.',
    staffMessage: 'Charge glycogène 8-10g/kg/j × 48-72h (Bussau 2002). Dernier repas 3h avant: 2-3g/kg CHO, faible en fibres/lipides. Dernier apport liquide 15-30 min pré-start.',
  });

  // START (0 → 30 min)
  phases.push({
    name: 'START',
    label: 'Démarrage',
    timeRange: `0 → 30 min`,
    carbsGh: startCarbs,
    carbsGhRange: `${Math.max(0, startCarbs - 5)}–${Math.min(maxBound, startCarbs + 5)}`,
    ...buildPhaseTotals(startCarbs, startDurMin),
    products: generateProducts(startCarbs, sport, tolerance),
    hydrationMlH: 0,
    sodiumMgH: 0,
    frequencyMin: tolerance === 'LOW' ? 10 : 15,
    athleteMessage: `Commence à manger dès les premières 10-15 min. Ne pas attendre d'avoir faim !`,
    staffMessage: `Objectif start: ${startCarbs} g/h (~65% cible). Amorcer l'absorption intestinale tôt. Tolérance digestive: ${tolerance}.`,
  });

  // MID (30 min → 70% durée)
  phases.push({
    name: 'MID',
    label: 'Phase principale',
    timeRange: `30 → ${lateStartMin} min`,
    carbsGh: midCarbs,
    carbsGhRange: `${Math.max(0, midCarbs - 5)}–${Math.min(maxBound, midCarbs + 5)}`,
    ...buildPhaseTotals(midCarbs, midDurMin),
    products: generateProducts(midCarbs, sport, tolerance),
    hydrationMlH: 0,
    sodiumMgH: 0,
    frequencyMin: tolerance === 'LOW' ? 10 : 15,
    athleteMessage: `Rythme de croisière : mange toutes les ${tolerance === 'LOW' ? '10' : '15-20'} min. Alterne boisson et gel.`,
    staffMessage: `Cible pleine: ${midCarbs} g/h. Fractionner toutes les ${tolerance === 'LOW' ? '10' : '15'} min. Ratio G:F 2:1 si > 60g/h.${isHeat ? ' (Chaleur déjà intégrée dans la base — pas de boost LATE.)' : ''}`,
  });

  // LATE (70% → fin)
  if (durMin > 60 && lateDurMin > 0) {
    phases.push({
      name: 'LATE',
      label: 'Dernier tiers',
      timeRange: `${lateStartMin} min → fin`,
      carbsGh: lateCarbs,
      carbsGhRange: `${Math.max(0, lateCarbs - 5)}–${Math.min(maxBound, lateCarbs + (isHeat ? 5 : 10))}`,
      ...buildPhaseTotals(lateCarbs, lateDurMin),
      products: generateProducts(lateCarbs, sport, tolerance),
      hydrationMlH: 0,
      sodiumMgH: 0,
      frequencyMin: tolerance === 'LOW' ? 10 : 12,
      athleteMessage: `Ne lâche rien ! C'est maintenant que la nutrition fait la différence.${isHeat ? ' Maintiens la cible — n\'augmente pas (chaleur déjà intégrée).' : ' Augmente légèrement si tu te sens bien.'}`,
      staffMessage: `Phase critique: ${lateCarbs} g/h ${isHeat ? '(maintien cible — chaleur déjà comptée dans base)' : '(+5% vs MID)'}. Compenser la fatigue digestive par le fractionnement. Renforcer Na+ si crampes.`,
    });
  }

  // NIGHT (ultra >12h) — caféine + aliments chauds
  // Réf : Knechtle 2012, Stellingwerff 2016
  if (isNightUltra) {
    const caffeineMgLow = Math.round(weightKg * 1);
    const caffeineMgHigh = Math.round(weightKg * 3);
    const nightCarbs = clamp(Math.round(carbsCentral * 0.85), 30, maxBound);
    const nightDurMin = Math.max(60, Math.round(durMin * 0.20));
    phases.push({
      name: 'NIGHT',
      label: 'Nuit / longue durée (>12h)',
      timeRange: 'Après 12h de course',
      carbsGh: nightCarbs,
      carbsGhRange: `${Math.max(30, nightCarbs - 10)}–${Math.min(maxBound, nightCarbs)}`,
      durationMin: nightDurMin,
      totalCarbsG: Math.round((nightCarbs * nightDurMin) / 60),
      totalKcal: Math.round((nightCarbs * nightDurMin) / 60) * 4,
      products: [
        ...generateProducts(nightCarbs, sport, tolerance),
        {
          type: 'solid',
          label: 'Bouillon chaud / soupe',
          carbsPerUnit: 10,
          volumeMl: 250,
          frequency: 'Toutes les 60-90 min',
          notes: 'Confort gastrique + sodium + chaleur (terrain froid)',
        },
        {
          type: 'drink',
          label: `Caféine ${caffeineMgLow}-${caffeineMgHigh} mg`,
          carbsPerUnit: 0,
          frequency: 'Toutes les 3-4h',
          notes: `1-3 mg/kg (poids ${weightKg} kg). Vigilance + perception effort. Réf. Burke 2008.`,
        },
      ],
      hydrationMlH: 0,
      sodiumMgH: 0,
      frequencyMin: 30,
      athleteMessage: "Ralentis le rythme alimentaire — petites bouchées fréquentes. Privilégie chaud (bouillon, soupe). Caféine pour rester lucide.",
      staffMessage: `NIGHT: ${nightCarbs} g/h (−15% vs MID), caféine ${caffeineMgLow}-${caffeineMgHigh} mg/3-4h, aliments chauds. Fenêtre gastrique réduite — fractionner ×30 min.`,
    });
  }

  return phases;
}

// =============================================
// RISQUE (fusion V1/V2)
// =============================================

function computeRisk(input: NutritionUnifiedInput): { score: number; risk: NutritionRisk; label: string; icon: string } {
  let score = 0;
  if (input.vlamaxValue !== null && input.vlamaxValue > 0.55) score++;
  if (input.tteMin !== null && input.tteMin < 45) score++;
  if (input.targetDurationHours !== null && input.targetDurationHours > 3) score++;
  if (isCAPLike(input.sport)) score++;
  if (isUltra(input.sport) && (input.targetDurationHours ?? 0) > 8) score++;

  const risk: NutritionRisk = score <= 1 ? 'low' : score === 2 ? 'moderate' : score === 3 ? 'high' : 'critical';
  const labels: Record<NutritionRisk, string> = { low: 'Faible', moderate: 'Modéré', high: 'Élevé', critical: 'Critique' };
  const icons: Record<NutritionRisk, string> = { low: '✅', moderate: '⚠️', high: '🔶', critical: '🛑' };
  return { score, risk, label: labels[risk], icon: icons[risk] };
}

// =============================================
// MESSAGES BILINGUES (staff / athlète)
// =============================================

function generateSummary(carbsCentral: number, risk: NutritionRisk, sport: NutritionSport, input: NutritionUnifiedInput): { athlete: string; staff: string } {
  const sportLabel = sport === 'cap' ? 'course à pied' : sport === 'trail' ? 'trail' : sport === 'ultra' ? 'ultra trail' : 'vélo';

  const athleteMessages: Record<NutritionRisk, string> = {
    low: `Bonne nouvelle : avec ~${carbsCentral}g de glucides par heure, ton estomac devrait gérer sans problème. Un bidon isotonique + 1 gel de temps en temps suffisent.`,
    moderate: `Tu as besoin de ~${carbsCentral}g/h. C'est gérable mais il faut t'entraîner à manger en ${sportLabel}. Prépare ton plan et teste-le.`,
    high: `Attention : ${carbsCentral}g/h c'est un gros défi pour ton estomac. Tu dois absolument entraîner ta digestion. Prévois un plan B avec des produits liquides.`,
    critical: `${carbsCentral}g/h, c'est au-delà de ce que la plupart des estomacs tolèrent. La nutrition est ton facteur limitant n°1. Consulte un nutritionniste sportif et entraîne ta digestion pendant 6-8 semaines.`,
  };

  const staffMessages: Record<NutritionRisk, string> = {
    low: `Oxydation CHO estimée ${carbsCentral}g/h. Profil métabolique favorable. Ratio lipides/glucides bien équilibré. Stratégie nutritionnelle standard.`,
    moderate: `Besoin CHO ${carbsCentral}g/h. Risque de déplétion glycogène modéré. Protocole gut training 3-4 semaines recommandé. G:F 2:1 au-delà de 60g/h.`,
    high: `Besoin CHO ${carbsCentral}g/h. Dépendance glycolytique significative. Entraînement digestif systématique requis. Surveiller VLamax pour réduction à moyen terme.`,
    critical: `Besoin CHO >${carbsCentral}g/h. Capacité d'absorption limite. Nutrition = facteur limitant de la performance. Travail métabolique (réduction VLamax) prioritaire. Potentiel Physiologique plafonné.`,
  };

  return { athlete: athleteMessages[risk], staff: staffMessages[risk] };
}

function generateWhyMessages(input: NutritionUnifiedInput, carbsCentral: number): { athlete: string; staff: string } {
  const parts_ath: string[] = [];
  const parts_staff: string[] = [];
  const w = input.weightKg ?? 70;

  parts_ath.push(`Ce chiffre de ${carbsCentral}g/h est basé sur ton poids (${w}kg) et ton profil métabolique.`);
  parts_staff.push(`Base: ${isCAPLike(input.sport) ? '1.05' : '0.9'} × ${w}kg.`);

  if (input.vlamaxValue !== null) {
    if (input.vlamaxValue > 0.55) {
      parts_ath.push('Ta VLamax élevée fait que tu brûles beaucoup de sucre.');
      parts_staff.push(`VLamax ${input.vlamaxValue.toFixed(2)} → +${input.vlamaxValue > 0.65 ? 20 : 10}g/h.`);
    } else if (input.vlamaxValue < 0.35) {
      parts_ath.push('Ta VLamax basse signifie que tu es économe en sucre — bonne nouvelle.');
      parts_staff.push(`VLamax ${input.vlamaxValue.toFixed(2)} → -10g/h.`);
    }
  }

  if (isCAPLike(input.sport)) {
    parts_ath.push('En course à pied, ton estomac tolère moins qu\'à vélo (impacts + chaleur).');
    parts_staff.push('Sport CAP: coût O₂ ↑, tolérance GI ↓.');
  }

  return { athlete: parts_ath.join(' '), staff: parts_staff.join(' ') };
}

// =============================================
// WARNINGS
// =============================================

function generateWarnings(input: NutritionUnifiedInput, carbsCentral: number, risk: NutritionRisk): { staff: string[]; athlete: string[] } {
  const staffW: string[] = [];
  const athleteW: string[] = [];

  if (isCAPLike(input.sport) && carbsCentral >= 70) {
    staffW.push('CAP ≥70g/h: limite de tolérance gastro-intestinale. Gut training obligatoire.');
    athleteW.push('Tes besoins sont élevés pour la course à pied. Entraîne ton estomac !');
  }
  if (input.vlamaxValue !== null && input.vlamaxValue > 0.60) {
    staffW.push(`VLamax ${input.vlamaxValue.toFixed(2)}: profil glycolytique. Considérer travail métabolique.`);
    athleteW.push('Tu brûles beaucoup de sucre — pense à travailler tes longues sorties en endurance.');
  }
  if (risk === 'critical') {
    staffW.push('Score risque 4/4 — nutrition = facteur limitant. Potentiel Physiologique plafonné à 75%.');
    athleteW.push('⚠️ La nutrition est ton point faible principal. Consulte un spécialiste.');
  }
  if (input.heatCondition) {
    staffW.push('Conditions chaudes: majorer hydratation +35%, Na+ 600mg/h.');
    athleteW.push('Il fait chaud : bois 30% de plus que d\'habitude et ajoute du sel.');
  }
  if (input.targetDurationHours && input.targetDurationHours > 4) {
    staffW.push('Durée >4h: fractionner, alterner textures, surveiller Na+.');
    athleteW.push('Course de plus de 4h : alterne les produits pour ne pas te dégoûter.');
  }
  if (isTrailOrUltra(input.sport)) {
    staffW.push('Trail/Ultra : tolérance GI réduite en montée — privilégier 60 g/h max sur les ascensions, solides en plat/descente.');
    athleteW.push('En montée, ton estomac digère moins bien. Vise 60g/h max et passe aux solides (dattes, banane) sur le plat.');
  }
  if (isUltra(input.sport)) {
    staffW.push('Ultra : après 8h, fenêtre gastrique réduite. Petites quantités fréquentes (15-20g toutes les 20min) plutôt que grosses prises. Réduction CHO liquides → solides après 6h (Pfeiffer 2012, Stellingwerff 2016).');
    athleteW.push('Après 8h, la fenêtre gastrique se réduit. Privilégiez les petites quantités fréquentes (15-20g toutes les 20min) plutôt que les grosses prises.');
  }

  return { staff: staffW, athlete: athleteW };
}

// =============================================
// FONCTION PRINCIPALE
// =============================================

export function computeNutritionUnified(input: NutritionUnifiedInput): NutritionUnifiedResult | null {
  if (input.weightKg === null || input.weightKg <= 0) return null;
  if (input.vlamaxValue === null && input.tteMin === null) return null;

  const sport = input.sport;
  const tolerance = input.digestiveTolerance ?? 'MEDIUM';
  const advancedGut = input.advancedGutTraining ?? false;

  // Durée estimée
  const durationH = input.targetDurationHours
    ?? DURATION_BY_OBJECTIF[input.objectif]?.[isCAPLike(sport) ? 'cap' : 'velo']
    ?? DEFAULT_DURATION_BY_SPORT[sport]
    ?? null;

  // Calcul glucides
  const maderResult = computeBaseRateMader(input.weightKg, sport, input.vo2max, input.vlamaxValue, input.targetIntensityPct, durationH, input.heatCondition);
  const base = maderResult.baseRate;
  // VLamax et Intensité : déjà dans Mader, pas de double-comptage
  const ta = tteAdj(input.tteMin);
  const da = durationAdj(durationH);

  const contributors: NutritionContributorUnified[] = [
    { id: 'base', label: 'Taux de base (Mader)', adjustment: base, direction: 'neutral', explanation: `Oxydation totale : ${maderResult.totalOxidation} g/h → exogène : ${base} g/h` },
  ];
  if (ta.adj !== 0) contributors.push({ id: 'tte', label: 'TTE', adjustment: ta.adj, direction: ta.adj > 0 ? 'up' : 'down', explanation: ta.explanation });
  if (da.adj !== 0) contributors.push({ id: 'duration', label: 'Durée', adjustment: da.adj, direction: da.adj > 0 ? 'up' : 'down', explanation: da.explanation });

  const rawCarbs = base + ta.adj + da.adj;
  const maxBound = advancedGut ? 120 : 90;
  // F31 — Plancher dynamique : 0 g/h pour les épreuves courtes (<1h, ex: 10K),
  // 40 g/h pour les épreuves d'endurance (≥1h). Évite le bypass artificiel.
  const minFloor = (durationH !== null && durationH < 1) ? 0 : 40;
  const carbsCentral = clamp(Math.round(rawCarbs), minFloor, maxBound);
  const carbsMin = clamp(carbsCentral - 5, Math.max(0, minFloor - 5), maxBound);
  const carbsMax = clamp(carbsCentral + 5, minFloor, maxBound);

  // Risque
  const { score, risk, label: riskLabel, icon: riskIcon } = computeRisk(input);

  // Hydratation
  const hydration = computeHydration(input);

  // Phases — F30: passe maxBound + isHeat pour anti-empilement & clamp cohérent
  const isHeat = input.heatCondition ?? false;
  const phases = generatePhases(carbsCentral, sport, durationH, tolerance, input.vlamaxValue, maxBound, isHeat, input.weightKg);
  // Fill hydration in each phase
  phases.forEach(p => {
    if (p.name !== 'PRE') {
      p.hydrationMlH = hydration.heatAdjustedMlH;
      p.sodiumMgH = hydration.sodiumMgH;
    }
  });

  // F30 — Totaux énergie/CHO cohérents (somme des phases en course)
  const totalCarbsG = phases.filter(p => p.name !== 'PRE').reduce((s, p) => s + p.totalCarbsG, 0);
  const totalKcal = totalCarbsG * 4;

  // Messages
  const summary = generateSummary(carbsCentral, risk, sport, input);
  const why = generateWhyMessages(input, carbsCentral);
  const warnings = generateWarnings(input, carbsCentral, risk);

  // F30 — Avertissement explicite si chaleur pousse au plafond GI
  if (isHeat && carbsCentral >= 85) {
    warnings.staff.push(`Chaleur + cible ${carbsCentral} g/h ≥ 85: limite GI atteinte. Boost LATE désactivé pour éviter le double-comptage. Gut training fortement recommandé.`);
    warnings.athlete.push(`⚠️ Il fait chaud et tes besoins en sucre sont déjà élevés (${carbsCentral} g/h). Reste sur la cible — n'augmente pas en fin de course.`);
  }

  // Confiance
  let confidence = 0.50;
  if (input.vlamaxValue !== null) confidence += 0.15;
  if (input.tteMin !== null) confidence += 0.10;
  if (durationH !== null) confidence += 0.10;
  if (input.targetIntensityPct !== null) confidence += 0.10;
  confidence = clamp(confidence, 0.45, 0.90);

  return {
    carbsMin,
    carbsMax,
    carbsCentral,
    totalCarbsG,
    totalKcal,
    risk,
    riskLabel,
    riskScore: score,
    riskIcon,
    phases,
    hydration,
    contributors,
    summaryAthlete: summary.athlete,
    summaryStaff: summary.staff,
    whyAthlete: why.athlete,
    whyStaff: why.staff,
    warnings: warnings.staff,
    athleteWarnings: warnings.athlete,
    confidence,
    sport,
    sportLabel: sport === 'cap' ? 'Course à Pied' : sport === 'trail' ? 'Trail' : sport === 'ultra' ? 'Ultra Trail' : 'Vélo',
    objectif: input.objectif,
    durationHours: durationH,
    disclaimer: 'Estimations basées sur le profil métabolique. Ne remplace pas un avis nutritionnel professionnel. Toujours tester en entraînement.',
  };
}

// =============================================
// HELPERS UI
// =============================================

export function getNutritionUnifiedBadgeClass(risk: NutritionRisk): string {
  switch (risk) {
    case 'low': return 'bg-success/20 text-success border-success/50';
    case 'moderate': return 'bg-warning/20 text-warning border-warning/50';
    case 'high': return 'bg-orange-500/20 text-orange-500 border-orange-500/50';
    case 'critical': return 'bg-destructive/20 text-destructive border-destructive/50';
  }
}

export function getNutritionUnifiedRiskColor(risk: NutritionRisk): string {
  switch (risk) {
    case 'low': return 'text-success';
    case 'moderate': return 'text-warning';
    case 'high': return 'text-orange-500';
    case 'critical': return 'text-destructive';
  }
}

// =============================================
// ESTIMATION SIMPLE (migration V1 → moteur unifié)
// =============================================
// Remplace nutritionPredictive.computeNutritionEstimate pour les consommateurs
// qui n'ont besoin que d'un chiffre unique (carbsMin/Max + risque), sans le
// détail par phase de NutritionUnifiedCard. Avant ce fix : ces consommateurs
// (ExportTools, TwoForCoachingAnalysis, l'assistant IA) utilisaient un moteur
// V1 séparé avec ses propres tables durée/intensité par objectif et son
// propre plafond digestif — divergent de celui affiché sur /course (moteur
// unifié, durée réelle de l'athlète) pour le même athlète.

/**
 * Objectif brut (clé canonique "70.3"/"IM" OU libellé "Ironman 70.3") →
 * clé attendue par DURATION_BY_OBJECTIF (fallback durée générique).
 */
function normalizeNutritionObjectif(objectif: string): string {
  const s = (objectif || "").toLowerCase();
  if (s.includes("70.3") || s === "703") return "70.3";
  if (s.includes("ironman") || s === "im") return "IM";
  if (s.includes("ultra")) return "TrailUltra";
  if (s.includes("trail")) return "TrailLong";
  if (s.includes("marathon")) return "Marathon";
  if (s.includes("semi") || s.includes("half")) return "Semi";
  if (s.includes("10k")) return "10K";
  if (s.includes("5k")) return "5K";
  return objectif;
}

type NutritionSimpleSport = NutritionSport | "triathlon";

/** IM/70.3/triathlon → traité en 2 legs (vélo + course) et combiné, voir plus bas. */
function mapNutritionSimpleSport(objectif: string): NutritionSimpleSport {
  const s = (objectif || "").toLowerCase();
  if (s.includes("ultra")) return "ultra";
  if (s.includes("trail")) return "trail";
  if (s.includes("70.3") || s === "703" || s.includes("ironman") || s === "im" || s.includes("triathlon")) return "triathlon";
  return "cap";
}

export interface NutritionEstimateSimpleInput {
  vlamax: number | null;
  /** VLamax course (leg run d'un triathlon) si distincte de `vlamax` (vélo). */
  vlamaxRun?: number | null;
  objectif: string;
  tteMin: number | null;
  /** TTE course (leg run d'un triathlon) si distinct de `tteMin` (vélo). */
  tteRunMin?: number | null;
  vo2max?: number | null;
  weightKg: number | null;
  /** Durée réelle de course si connue (sinon fallback table générique par objectif). */
  targetDurationHours?: number | null;
}

export interface NutritionEstimateSimpleResult {
  carbsMin: number;
  carbsMax: number;
  risk: NutritionRisk;
  riskLabel: string;
  riskIcon: string;
  /** Message pédagogique athlète (résumé en langage simple, cf. NutritionUnifiedCard). */
  summaryAthlete: string;
  /** Message pédagogique staff (résumé technique, cf. NutritionUnifiedCard). */
  summaryStaff: string;
  /** Sport dont les carbsMin/Max/risk sont issus — pour triathlon, le leg le plus exigeant. */
  sport: NutritionSport;
}

export function computeNutritionEstimateSimple(input: NutritionEstimateSimpleInput): NutritionEstimateSimpleResult | null {
  if (input.weightKg == null || input.weightKg <= 0) return null;
  if (input.vlamax == null && input.tteMin == null) return null;

  const objNorm = normalizeNutritionObjectif(input.objectif);
  const mapped = mapNutritionSimpleSport(input.objectif);

  const call = (sport: NutritionSport, vlamaxValue: number | null, tteMin: number | null, durationHours: number | null) =>
    computeNutritionUnified({
      vlamaxValue,
      vo2max: input.vo2max ?? null,
      tteMin,
      sport,
      objectif: objNorm,
      targetDurationHours: durationHours,
      targetIntensityPct: null,
      weightKg: input.weightKg,
    });

  if (mapped === "triathlon") {
    // Sans durée réelle par leg connue (ces consommateurs n'ont pas le split
    // physio vélo/course), on laisse chaque leg utiliser sa propre table
    // générique — le caller peut fournir targetDurationHours pour le leg
    // vélo uniquement (usage le plus fréquent : durée totale approx.).
    const bike = call("velo", input.vlamax, input.tteMin, input.targetDurationHours ?? null);
    const run = call("cap", input.vlamaxRun ?? input.vlamax, input.tteRunMin ?? input.tteMin, null);
    const legs: Array<{ sport: NutritionSport; result: NutritionUnifiedResult }> = [];
    if (bike) legs.push({ sport: "velo", result: bike });
    if (run) legs.push({ sport: "cap", result: run });
    if (legs.length === 0) return null;

    const dominant = legs.reduce((a, b) => (b.result.carbsCentral > a.result.carbsCentral ? b : a));
    const riskRank: Record<NutritionRisk, number> = { low: 0, moderate: 1, high: 2, critical: 3 };
    const worst = legs.reduce((a, b) => (riskRank[b.result.risk] > riskRank[a.result.risk] ? b : a));
    return {
      carbsMin: dominant.result.carbsMin,
      carbsMax: dominant.result.carbsMax,
      risk: worst.result.risk,
      riskLabel: worst.result.riskLabel,
      riskIcon: worst.result.riskIcon,
      summaryAthlete: worst.result.summaryAthlete,
      summaryStaff: worst.result.summaryStaff,
      sport: dominant.sport,
    };
  }

  const sport: NutritionSport = mapped;
  const result = call(sport, input.vlamax, input.tteMin, input.targetDurationHours ?? null);
  if (!result) return null;
  return {
    carbsMin: result.carbsMin,
    carbsMax: result.carbsMax,
    risk: result.risk,
    riskLabel: result.riskLabel,
    riskIcon: result.riskIcon,
    summaryAthlete: result.summaryAthlete,
    summaryStaff: result.summaryStaff,
    sport,
  };
}
