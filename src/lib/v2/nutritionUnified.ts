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

export interface NutritionProduct {
  type: 'gel' | 'drink' | 'bar' | 'chew';
  label: string;
  carbsPerUnit: number;
  volumeMl?: number;
  frequency: string;
  notes?: string;
}

export interface NutritionPhaseUnified {
  name: 'PRE' | 'START' | 'MID' | 'LATE';
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
  sport: 'velo' | 'cap';
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
  sport: 'velo' | 'cap';
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
  '10K': { velo: 0, cap: 0.67 },
  '5K': { velo: 0, cap: 0.35 },
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
  sport: 'velo' | 'cap',
  vo2max: number | null | undefined,
  vlamaxValue: number | null,
  intensityPct: number | null,
  durationHours: number | null,
  heatCondition?: boolean
): { baseRate: number; totalOxidation: number; method: 'mader' | 'fallback' } {
  const vo2 = vo2max ?? (sport === 'cap' ? 48 : 50);
  const vlx = vlamaxValue ?? 0.45;
  const intensity = intensityPct ?? 70;
  const duration = durationHours ?? 3;
  
  const carbOxGmin = calculateCarbOxidation(intensity, vo2, vlx, weightKg);
  let totalOxidationGh = carbOxGmin * 60;
  
  // Facteur chaleur: +10% oxydation CHO en conditions chaudes (>28°C)
  // Réf: Cao et al 2025, Febbraio 1994
  if (heatCondition) {
    totalOxidationGh *= 1.10;
  }
  
  // Modèle glycogène physiologique (Burke 2011, Gonzalez 2016)
  // Réserves: ~5g/kg (conservateur, Cao 2025: 380-500g total)
  const glycogenStores = weightKg * 5;
  const totalCarbNeeded = totalOxidationGh * duration;
  const accessFactor = Math.min(0.75, 0.35 + 0.40 * Math.exp(-0.25 * duration));
  const effectiveStores = glycogenStores * accessFactor;
  const glycogenCoverage = Math.min(0.85, effectiveStores / totalCarbNeeded);
  
  // Minimum exogène modulé par durée (Cao 2025)
  // <1h: rinçage buccal suffit, 1-2h: 25%, 2-3h: 40%, >3h: 50%
  const MIN_EXOGENOUS_FRACTION = duration < 1 ? 0 : duration < 2 ? 0.25 : duration < 3 ? 0.40 : 0.50;
  let exogenousGh = totalOxidationGh * Math.max(MIN_EXOGENOUS_FRACTION, 1 - glycogenCoverage);
  
  // CAP: clamp max réduit à 75g/h sans gut training (Pfeiffer 2012)
  // + tolérance digestive réduite de ~18% vs vélo
  if (sport === 'cap') {
    exogenousGh *= 0.82;
  }
  
  const capMax = sport === 'cap' ? 75 : 90;
  // F31 — Pas de plancher artificiel pour les épreuves courtes (<1h, ex: 10K).
  // Sur ces formats Mader-Heck recommande "rinçage buccal" (~0-25 g/h),
  // forcer 30 g/h reviendrait à bypasser la logique canonique.
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
  const isCAP = input.sport === 'cap';
  const isHeat = input.heatCondition ?? false;

  // Base: 7-10 ml/kg/h vélo, 5-8 ml/kg/h CAP (contrainte mécanique)
  const baseMultiplier = isCAP ? 6.5 : 8.5;
  const baseMlH = Math.round(weight * baseMultiplier);
  const heatFactor = isHeat ? 1.35 : 1.0;
  const heatAdjustedMlH = Math.round(baseMlH * heatFactor);

  // Sodium: 300-600 mg/h standard, augmenté en chaleur
  const baseSodiumMgH = isHeat ? 600 : 450;
  // Concentration sodium par litre
  const sodiumMgL = Math.round((baseSodiumMgH / heatAdjustedMlH) * 1000);

  const recs: string[] = [];
  
  if (isHeat) {
    recs.push('Augmenter les apports de 30-35% en conditions chaudes (>28°C)');
    recs.push('Pré-hydratation : 500ml dans les 2h avant le départ');
  }
  
  if (isCAP) {
    recs.push('Privilégier les petites gorgées régulières (toutes les 10-15 min)');
    recs.push('Éviter de boire plus de 200ml d\'un coup (risque gastrique)');
  } else {
    recs.push('Boire régulièrement toutes les 15-20 min');
    recs.push('Bidon isotonique (40-60g glucides/L + 400-600mg sodium/L)');
  }

  const athleteMsg = isHeat
    ? `Bois ${Math.round(heatAdjustedMlH / 4)} ml toutes les 15 min. Il fait chaud : augmente tes apports !`
    : `Bois ${Math.round(heatAdjustedMlH / 4)} ml toutes les 15 min, soit ~${Math.round(heatAdjustedMlH / 1000 * 2) / 2} bidon/h.`;

  const staffMsg = `Base ${baseMlH} ml/h (${baseMultiplier} ml/kg/h × ${weight} kg).${isHeat ? ` Correction chaleur ×1.35 → ${heatAdjustedMlH} ml/h.` : ''} Na+ ${baseSodiumMgH} mg/h (${sodiumMgL} mg/L). Réf: Sawka 2007 ACSM.`;

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

function generateProducts(carbsGh: number, sport: 'velo' | 'cap', tolerance: 'LOW' | 'MEDIUM' | 'HIGH'): NutritionProduct[] {
  const products: NutritionProduct[] = [];
  const isCAP = sport === 'cap';

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

  return products;
}

// =============================================
// PHASES CHRONOLOGIQUES
// =============================================

function generatePhases(
  carbsCentral: number,
  sport: 'velo' | 'cap',
  durationH: number | null,
  tolerance: 'LOW' | 'MEDIUM' | 'HIGH',
  vlamaxVal: number | null,
  maxBound: number = 90,
  isHeat: boolean = false,
): NutritionPhaseUnified[] {
  const durMin = durationH ? Math.round(durationH * 60) : 180;
  const lateStartMin = Math.round(durMin * 0.7);
  const isCAP = sport === 'cap';

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
  if (input.sport === 'cap') score++;

  const risk: NutritionRisk = score <= 1 ? 'low' : score === 2 ? 'moderate' : score === 3 ? 'high' : 'critical';
  const labels: Record<NutritionRisk, string> = { low: 'Faible', moderate: 'Modéré', high: 'Élevé', critical: 'Critique' };
  const icons: Record<NutritionRisk, string> = { low: '✅', moderate: '⚠️', high: '🔶', critical: '🛑' };
  return { score, risk, label: labels[risk], icon: icons[risk] };
}

// =============================================
// MESSAGES BILINGUES (staff / athlète)
// =============================================

function generateSummary(carbsCentral: number, risk: NutritionRisk, sport: 'velo' | 'cap', input: NutritionUnifiedInput): { athlete: string; staff: string } {
  const sportLabel = sport === 'cap' ? 'course à pied' : 'vélo';

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
  parts_staff.push(`Base: ${input.sport === 'cap' ? '1.05' : '0.9'} × ${w}kg.`);

  if (input.vlamaxValue !== null) {
    if (input.vlamaxValue > 0.55) {
      parts_ath.push('Ta VLamax élevée fait que tu brûles beaucoup de sucre.');
      parts_staff.push(`VLamax ${input.vlamaxValue.toFixed(2)} → +${input.vlamaxValue > 0.65 ? 20 : 10}g/h.`);
    } else if (input.vlamaxValue < 0.35) {
      parts_ath.push('Ta VLamax basse signifie que tu es économe en sucre — bonne nouvelle.');
      parts_staff.push(`VLamax ${input.vlamaxValue.toFixed(2)} → -10g/h.`);
    }
  }

  if (input.sport === 'cap') {
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

  if (input.sport === 'cap' && carbsCentral >= 70) {
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
  const durationH = input.targetDurationHours ?? (DURATION_BY_OBJECTIF[input.objectif]?.[sport] ?? null);

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
  const carbsCentral = clamp(Math.round(rawCarbs), 40, maxBound);
  const carbsMin = clamp(carbsCentral - 5, 35, maxBound);
  const carbsMax = clamp(carbsCentral + 5, 40, maxBound);

  // Risque
  const { score, risk, label: riskLabel, icon: riskIcon } = computeRisk(input);

  // Hydratation
  const hydration = computeHydration(input);

  // Phases — F30: passe maxBound + isHeat pour anti-empilement & clamp cohérent
  const isHeat = input.heatCondition ?? false;
  const phases = generatePhases(carbsCentral, sport, durationH, tolerance, input.vlamaxValue, maxBound, isHeat);
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
    sportLabel: sport === 'cap' ? 'Course à Pied' : 'Vélo',
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
