/**
 * Bibliothèque de Protocoles de Tests Intégrés TFCL
 * Tests terrain standardisés pour alimenter les modèles V2
 * 
 * STRUCTURE ULTRA-DÉTAILLÉE PAR PROTOCOLE:
 * 1. Pré-requis
 * 2. Matériel
 * 3. Échauffement minute par minute
 * 4. Protocole minute par minute
 * 5. Critères de validité
 * 6. Table de saisie des résultats
 * 7. Calculs et traçabilité (VLamax, TTE, Confiance)
 */

export type TestCategory = "VLAMAX" | "TTE" | "FATMAX" | "ECONOMY" | "REFERENCE";
export type TestSport = "bike" | "run" | "triathlon";
export type TestDifficulty = "easy" | "moderate" | "hard";
export type ConfidenceLevel = "high" | "medium" | "low";

export interface TestEquipment {
  name: string;
  required: boolean;
  alternatives?: string[];
}

export interface TestValidityCondition {
  id: string;
  label: string;
  critical: boolean;
  details?: string;
}

export interface TestWarmupStep {
  minuteStart: number;
  minuteEnd: number;
  durationMin: number;
  description: string;
  intensity?: string;
  details?: string;
}

export interface TestMainStep {
  stepNumber: number;
  minuteStart?: number;
  minuteEnd?: number;
  description: string;
  durationMin?: number;
  repetitions?: number;
  recoveryMin?: number;
  notes?: string;
  criticalPoints?: string[];
}

export interface TestValidationCriteria {
  id: string;
  label: string;
  threshold?: string;
  invalidFlag?: string;
  consequence?: string;
}

export interface TestInputField {
  key: string;
  label: string;
  unit: string;
  type: "number" | "time" | "select";
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  options?: { value: string; label: string }[];
  required: boolean;
  helpText?: string;
}

export interface TestResult {
  primaryValue: number;
  normalizedValue: number;
  unit: string;
  label: string;
}

export interface TFCLImpact {
  parameter: string;
  confidenceBoost: number;
  description: string;
  formula?: string;
}

export interface CalculationStep {
  step: number;
  name: string;
  formula: string;
  description: string;
}

export interface IntegratedTestProtocol {
  id: string;
  name: string;
  shortName: string;
  sport: TestSport;
  category: TestCategory;
  difficulty: TestDifficulty;
  
  // Objectif clair
  objective: string;
  targetParameters: string[];
  
  // Précision attendue
  expectedPrecision: ConfidenceLevel;
  reliabilityScore: number; // 0-1
  
  // ✅ PRÉ-REQUIS (nouveaux champs détaillés)
  prerequisites: string[];
  
  // Matériel requis
  equipment: TestEquipment[];
  
  // Conditions de validité
  validityConditions: TestValidityCondition[];
  
  // Échauffement standardisé (avec minutes)
  warmup: TestWarmupStep[];
  warmupTotalMin: number;
  
  // Protocole de test (avec minutes)
  protocol: TestMainStep[];
  protocolTotalMin: number;
  
  // Règles de pacing/cadence
  pacingRules: string[];
  
  // Critères de validation
  validationCriteria: TestValidationCriteria[];
  
  // Champs de saisie
  inputFields: TestInputField[];
  
  // Impact TFCL
  tfclImpact: TFCLImpact[];
  
  // ✅ CALCULS ET TRAÇABILITÉ
  calculationSteps: CalculationStep[];
  
  // Calcul
  compute: (inputs: Record<string, number>, athleteWeight?: number) => {
    ok: boolean;
    result?: TestResult;
    error?: string;
    confidence: number;
    rawData: Record<string, number | string>;
    calculationTrace?: { step: string; value: number | string }[];
  };
}

// ========================================
// TESTS VÉLO
// ========================================

export const BIKE_VLAMAX_SPRINT_15S: IntegratedTestProtocol = {
  id: "bike_vlamax_sprint_15s",
  name: "Test VLamax Vélo – Sprint 15s",
  shortName: "Sprint 15s Vélo",
  sport: "bike",
  category: "VLAMAX",
  difficulty: "moderate",
  
  objective: "Estimer la VLamax de manière précise en quantifiant la capacité glycolytique réelle via la puissance maximale sur 15 secondes. Ce test permet de calibrer le modèle métabolique pour optimiser nutrition et zones d'entraînement.",
  targetParameters: ["VLamax", "Pmax", "Sprint Ratio"],
  expectedPrecision: "high",
  reliabilityScore: 0.85,
  
  prerequisites: [
    "48h minimum sans séance à haute intensité (Z4+)",
    "Sommeil de qualité (≥7h) la nuit précédente",
    "Repas glucidique 2-3h avant le test (glycogène plein)",
    "Pas de caféine dans les 3h précédant le test",
    "Connaissance de votre FTP actuel (test <4 semaines)",
    "État de forme stable (pas de maladie récente)"
  ],
  
  equipment: [
    { name: "Home trainer à résistance directe OU piste/route plate sécurisée", required: true, alternatives: ["Parcours plat fermé à la circulation"] },
    { name: "Capteur de puissance calibré (Assioma, Garmin, Wahoo, SRM)", required: true },
    { name: "Compteur/montre affichant puissance moyenne par intervalle", required: true },
    { name: "Ceinture cardio-fréquencemètre (optionnel mais recommandé)", required: false },
    { name: "Cadence-mètre intégré au capteur", required: true }
  ],
  
  validityConditions: [
    { id: "rest48h", label: "48h sans intensité haute (Z4+)", critical: true, details: "Une séance intense récente fausse le résultat en réduisant le recrutement glycolytique" },
    { id: "glycemia", label: "Glycémie correcte (repas 2-3h avant)", critical: true, details: "Glycogène musculaire plein = puissance max disponible" },
    { id: "sleep", label: "Sommeil ≥7h la nuit précédente", critical: false, details: "Fatigue = recrutement neuromusculaire réduit" },
    { id: "temperature", label: "Température ambiante 18-24°C", critical: false, details: "Froid = muscles moins performants, chaud = fatigue prématurée" },
    { id: "noFatigue", label: "Pas de fatigue résiduelle (jambes fraîches)", critical: true, details: "Vérifier en échauffement que les sensations sont bonnes" },
    { id: "calibrated", label: "Capteur de puissance calibré le jour même", critical: true, details: "Calibration à zéro obligatoire avant le test" }
  ],
  
  warmup: [
    { minuteStart: 0, minuteEnd: 10, durationMin: 10, description: "Zone 2 progressive - Augmenter progressivement de 60% à 70% FTP", intensity: "60-70% FTP", details: "Pédalage souple, respiration nasale, échauffement articulaire" },
    { minuteStart: 10, minuteEnd: 15, durationMin: 5, description: "Montée vers Zone 3 - Maintenir à 75-80% FTP", intensity: "75-80% FTP", details: "Cadence naturelle 85-95 rpm, respiration plus ample" },
    { minuteStart: 15, minuteEnd: 21, durationMin: 6, description: "3 accélérations progressives de 10s chacune (80%-90%-100%)", intensity: "Progressif", details: "Min 15-16: 10s à 80% Pmax. Min 17-18: 10s à 90% Pmax. Min 19-20: 10s à 100% Pmax. Récup 1min40 entre chaque." },
    { minuteStart: 21, minuteEnd: 25, durationMin: 4, description: "Récupération complète Zone 1", intensity: "50% FTP", details: "Pédalage très léger, faire redescendre FC et respiration" }
  ],
  warmupTotalMin: 25,
  
  protocol: [
    { 
      stepNumber: 1, 
      minuteStart: 0, 
      minuteEnd: 0,
      description: "PRÉPARATION : Position de départ prête, cadence libre naturelle", 
      notes: "Départ lancé obligatoire : 20-25 km/h (ou 180-220W selon niveau)",
      criticalPoints: ["Capteur calibré", "Mode puissance moyenne 15s prêt", "Chronomètre prêt"]
    },
    { 
      stepNumber: 2, 
      minuteStart: 0, 
      minuteEnd: 0,
      durationMin: 0.25,
      description: "SPRINT 1 : ALL-OUT pendant exactement 15 secondes", 
      notes: "Engagement MAXIMAL dès le départ. Cadence libre mais consignée. Éviter >115 rpm forcé.",
      criticalPoints: ["Départ explosif", "Maintenir effort maximal 15s complètes", "Ne pas regarder le compteur pendant l'effort"]
    },
    { 
      stepNumber: 3, 
      minuteStart: 0,
      minuteEnd: 5,
      durationMin: 5, 
      description: "RÉCUPÉRATION active Zone 1", 
      notes: "Pédalage léger 40-50% FTP, laisser FC et respiration redescendre",
      criticalPoints: ["Ne pas s'arrêter complètement", "Respiration profonde et lente"]
    },
    { 
      stepNumber: 4,
      minuteStart: 5,
      minuteEnd: 5, 
      durationMin: 0.25,
      description: "SPRINT 2 : ALL-OUT pendant exactement 15 secondes", 
      notes: "Mêmes consignes que sprint 1. Viser la même puissance ou plus.",
      criticalPoints: ["Engagement identique au sprint 1", "Cadence similaire (±5 rpm)"]
    },
    { 
      stepNumber: 5, 
      minuteStart: 5,
      minuteEnd: 10,
      durationMin: 5, 
      description: "RÉCUPÉRATION active Zone 1",
      notes: "Identique à la récupération précédente"
    },
    { 
      stepNumber: 6, 
      minuteStart: 10,
      minuteEnd: 10,
      durationMin: 0.25,
      description: "SPRINT 3 (optionnel) : ALL-OUT 15 secondes", 
      notes: "À faire SI écart >5% entre les 2 premiers sprints. Sinon passer directement à la récupération finale.",
      criticalPoints: ["Uniquement si variance sprint 1-2 > 5%", "Mêmes consignes"]
    }
  ],
  protocolTotalMin: 12,
  
  pacingRules: [
    "Cadence libre mais CONSIGNÉE pour chaque sprint (noter la valeur exacte)",
    "Départ lancé obligatoire : 20-25 km/h ou 180-220W selon niveau",
    "Éviter les pics de cadence >115 rpm non naturels (force réduite)",
    "Engagement MAXIMAL dès le premier coup de pédale",
    "Maintenir l'effort maximal jusqu'au signal de fin des 15s",
    "Ne pas regarder le compteur pendant le sprint (focus sur l'effort)"
  ],
  
  validationCriteria: [
    { id: "variance", label: "Écart < 5% entre les 2 meilleurs sprints", threshold: "5%", invalidFlag: "variance_too_high", consequence: "Si >5%: 3ème sprint obligatoire. Si >10%: test invalide (fatigue ou motivation)" },
    { id: "power_stable", label: "Puissance stable ≥80% de la moyenne sur les 15s", threshold: "80%", consequence: "Chute brutale = pacing incorrect (départ trop violent)" },
    { id: "cadence", label: "Cadence cohérente entre sprints (±10 rpm)", threshold: "10 rpm", consequence: "Grande variation = technique différente, compare des choses différentes" },
    { id: "rpe", label: "RPE ≥ 9/10 en fin de sprint", threshold: "9/10", consequence: "Si RPE <9: engagement insuffisant, puissance sous-estimée" }
  ],
  
  inputFields: [
    { key: "ftp_reference", label: "FTP actuel (référence)", unit: "W", type: "number", min: 100, max: 500, step: 1, required: true, placeholder: "ex: 280", helpText: "Votre FTP testé il y a moins de 4 semaines" },
    { key: "power15s_1", label: "Puissance moyenne Sprint 1", unit: "W", type: "number", min: 200, max: 2500, step: 1, required: true, helpText: "Puissance moyenne sur les 15 secondes exactes" },
    { key: "power15s_2", label: "Puissance moyenne Sprint 2", unit: "W", type: "number", min: 200, max: 2500, step: 1, required: true, helpText: "Puissance moyenne sur les 15 secondes exactes" },
    { key: "power15s_3", label: "Puissance moyenne Sprint 3 (optionnel)", unit: "W", type: "number", min: 200, max: 2500, step: 1, required: false, helpText: "Uniquement si variance sprint 1-2 > 5%" },
    { key: "cadence_1", label: "Cadence moyenne Sprint 1", unit: "rpm", type: "number", min: 60, max: 150, step: 1, required: true, helpText: "Cadence moyenne pendant les 15s" },
    { key: "cadence_2", label: "Cadence moyenne Sprint 2", unit: "rpm", type: "number", min: 60, max: 150, step: 1, required: true, helpText: "Cadence moyenne pendant les 15s" },
    { key: "hr_max", label: "FC max atteinte", unit: "bpm", type: "number", min: 100, max: 220, step: 1, required: false, helpText: "FC pic en fin de sprint" }
  ],
  
  tfclImpact: [
    { parameter: "VLamax", confidenceBoost: 0.15, description: "Augmente la confiance VLamax de +15%", formula: "VLamax = 0.15 + (SprintRatio - 1.8) × 0.35" },
    { parameter: "Pmax", confidenceBoost: 0.10, description: "Calibre la puissance maximale aérobie", formula: "Pmax ≈ moyenne(P15s_1, P15s_2)" },
    { parameter: "Sprint Ratio", confidenceBoost: 0.10, description: "Ratio P15s/FTP caractérise le profil métabolique", formula: "SR = P15s_moy / FTP" }
  ],
  
  calculationSteps: [
    { step: 1, name: "Moyenne des sprints", formula: "P15s_moy = (P15s_1 + P15s_2) / 2", description: "On prend la moyenne des 2 meilleurs sprints (ou des 2 si variance OK)" },
    { step: 2, name: "Variance", formula: "Variance = |P15s_1 - P15s_2| / P15s_moy × 100", description: "Écart entre les 2 sprints en %. Si >5% : 3ème sprint. Si >10% : test invalide." },
    { step: 3, name: "Sprint Ratio", formula: "SR = P15s_moy / FTP", description: "Le Sprint Ratio caractérise le profil : <2.2 = endurant, 2.3-2.6 = équilibré, >2.7 = explosif" },
    { step: 4, name: "VLamax estimée", formula: "VLamax = 0.15 + (SR - 1.8) × 0.35", description: "Formule dérivée du modèle Mader/San Millán. Clampée entre 0.20 et 0.95 mmol/L/s" },
    { step: 5, name: "Confiance", formula: "Conf = 0.85 - (variance > 5% ? 0.15 : 0) - (sans FTP ? 0.15 : 0)", description: "Confiance de base 85%, réduite si variance élevée ou FTP non fourni" }
  ],
  
  compute: (inputs, athleteWeight) => {
    const p1 = inputs.power15s_1;
    const p2 = inputs.power15s_2;
    const p3 = inputs.power15s_3 || 0;
    const ftp = inputs.ftp_reference || 250;
    
    if (!p1 || !p2) {
      return { ok: false, error: "Puissances Sprint 1 et 2 requises", confidence: 0, rawData: inputs };
    }
    
    const trace: { step: string; value: number | string }[] = [];
    
    // Step 1: Average power
    const powers = [p1, p2, p3].filter(p => p > 0).sort((a, b) => b - a);
    const bestTwo = powers.slice(0, 2);
    const avgPower = (bestTwo[0] + bestTwo[1]) / 2;
    trace.push({ step: "Moyenne P15s", value: `${avgPower.toFixed(0)} W` });
    
    // Step 2: Variance
    const variance = Math.abs(bestTwo[0] - bestTwo[1]) / avgPower * 100;
    trace.push({ step: "Variance", value: `${variance.toFixed(1)}%` });
    
    let confidence = 0.85;
    if (variance > 5) confidence = 0.70;
    if (variance > 10) confidence = 0.55;
    
    // Step 3: Sprint Ratio
    const sprintRatio = avgPower / ftp;
    trace.push({ step: "Sprint Ratio (P15s/FTP)", value: sprintRatio.toFixed(2) });
    
    // Step 4: VLamax
    let vlamax = 0.15 + (sprintRatio - 1.8) * 0.35;
    vlamax = Math.max(0.20, Math.min(0.95, vlamax));
    trace.push({ step: "VLamax estimée", value: `${vlamax.toFixed(3)} mmol/L/s` });
    
    // Adjust confidence if no FTP
    if (!inputs.ftp_reference) {
      confidence *= 0.85;
      trace.push({ step: "Malus confiance (sans FTP)", value: "-15%" });
    }
    
    trace.push({ step: "Confiance finale", value: `${(confidence * 100).toFixed(0)}%` });
    
    return {
      ok: true,
      result: {
        primaryValue: avgPower,
        normalizedValue: vlamax,
        unit: "W",
        label: "Puissance 15s"
      },
      confidence,
      rawData: { 
        ...inputs, 
        avgPower, 
        variance, 
        sprintRatio,
        estimatedVlamax: vlamax,
        formula: "VLamax = 0.15 + (SR - 1.8) × 0.35"
      },
      calculationTrace: trace
    };
  }
};

export const BIKE_TTE_FTP: IntegratedTestProtocol = {
  id: "bike_tte_ftp",
  name: "Test TTE Vélo – FTP Constant",
  shortName: "TTE Vélo",
  sport: "bike",
  category: "TTE",
  difficulty: "hard",
  
  objective: "Mesurer le Time To Exhaustion (temps jusqu'à épuisement) à FTP constant pour calibrer l'endurance au seuil. Ce test est le gold standard pour affiner les recommandations de nutrition et pacing en course longue.",
  targetParameters: ["TTE (minutes)", "Validation FTP", "Dérive cardiaque"],
  expectedPrecision: "high",
  reliabilityScore: 0.90,
  
  prerequisites: [
    "48-72h minimum sans séance à haute intensité",
    "FTP connu et testé il y a moins de 4 semaines",
    "Glycogène musculaire PLEIN (alimentation riche en glucides 48h avant)",
    "Hydratation optimale (urines claires)",
    "Sommeil de qualité la nuit précédente",
    "Pas de stress majeur (examen, voyage, etc.)"
  ],
  
  equipment: [
    { name: "Home trainer à résistance directe (mode ERG désactivé) OU parcours très plat", required: true },
    { name: "Capteur de puissance calibré", required: true },
    { name: "Cardio-fréquencemètre ceinture (précis)", required: true },
    { name: "Chronomètre ou compteur avec timer", required: true },
    { name: "Ventilateur (indoor) pour éviter surchauffe", required: false }
  ],
  
  validityConditions: [
    { id: "rest48h", label: "48-72h sans intensité haute (Z4+)", critical: true, details: "Fatigue résiduelle = TTE sous-estimé" },
    { id: "ftpKnown", label: "FTP connu et validé (<4 semaines)", critical: true, details: "FTP trop ancien = résultat non fiable" },
    { id: "nutrition", label: "Glycogène plein (glucides 48h avant)", critical: true, details: "Glycogène bas = TTE réduit de 20-40%" },
    { id: "hydration", label: "Hydratation optimale", critical: true, details: "Déshydratation = TTE réduit de 10-20%" },
    { id: "temperature", label: "Température stable 18-24°C", critical: false, details: "Chaleur excessive = TTE réduit significativement" },
    { id: "motivation", label: "Motivation élevée pour aller au bout", critical: true, details: "Ce test demande une volonté forte, mentalement exigeant" }
  ],
  
  warmup: [
    { minuteStart: 0, minuteEnd: 15, durationMin: 15, description: "Zone 2 progressive : de 55% à 70% FTP", intensity: "55-70% FTP", details: "Augmenter progressivement toutes les 5 minutes" },
    { minuteStart: 15, minuteEnd: 20, durationMin: 5, description: "Montée au seuil : stabiliser à 90% FTP", intensity: "90% FTP", details: "Préparer les jambes à l'effort" },
    { minuteStart: 20, minuteEnd: 30, durationMin: 10, description: "2×2 min à 100% FTP avec 3 min récup", intensity: "FTP", details: "Min 20-22: 2min à FTP. Min 22-25: récup 60%. Min 25-27: 2min à FTP. Min 27-30: récup 60%" },
    { minuteStart: 30, minuteEnd: 35, durationMin: 5, description: "Récupération complète Zone 1", intensity: "50% FTP", details: "Laisser FC et respiration revenir au calme" }
  ],
  warmupTotalMin: 35,
  
  protocol: [
    { 
      stepNumber: 1, 
      description: "DÉMARRAGE : Stabiliser à exactement 100% FTP", 
      notes: "Cadence stable 85-95 rpm, respiration ample et régulière",
      criticalPoints: ["Puissance = FTP ± 2%", "Cadence cible atteinte", "FC stabilisée après 2-3 min"]
    },
    { 
      stepNumber: 2, 
      description: "MAINTIEN : Tenir aussi longtemps que possible à 100% FTP", 
      notes: "Pacing TRÈS régulier. Pas de variation de puissance. Focus mental.",
      criticalPoints: ["Ne pas regarder le chrono constamment", "Se concentrer sur la technique", "Respiration régulière", "Boire par petites gorgées toutes les 10-15 min"]
    },
    { 
      stepNumber: 3, 
      description: "SURVEILLANCE : Critères d'arrêt du test", 
      notes: "Arrêter SI puissance <97% FTP pendant >30 secondes consécutives OU épuisement total",
      criticalPoints: ["Puissance qui chute = signal d'arrêt imminent", "Ne pas forcer au-delà du point de rupture"]
    },
    { 
      stepNumber: 4, 
      description: "FIN : Noter le temps exact en minutes et secondes", 
      notes: "Arrondir à la minute inférieure pour le calcul. Récupération active 10 min.",
      criticalPoints: ["Temps exact", "FC finale", "RPE ressenti"]
    }
  ],
  protocolTotalMin: 60,
  
  pacingRules: [
    "Cadence STABLE entre 85-95 rpm tout le test",
    "Pacing ultra-régulier : éviter absolument le positive split (départ trop fort)",
    "Puissance = FTP ± 2% maximum de variation",
    "Acceptable : légère augmentation les 3-5 dernières minutes si réserve mentale",
    "Si chute <97% FTP pendant >30 secondes → ARRÊT du test",
    "Ne jamais dépasser 102% FTP même en début de test"
  ],
  
  validationCriteria: [
    { id: "power_variance", label: "Variabilité de puissance <5% (Normalized Power / Avg Power)", threshold: "5%", consequence: "Pacing irrégulier = résultat moins fiable" },
    { id: "pacing", label: "Pacing constant (pas de pic initial >105% FTP)", invalidFlag: "pacing_error", consequence: "Départ trop fort = épuisement prématuré" },
    { id: "hr_drift", label: "Dérive FC normale (augmentation 5-15 bpm sur la durée)", threshold: "5-15 bpm", consequence: "Dérive <5 bpm = effort trop facile. >20 bpm = surchauffe ou déshydratation" },
    { id: "rpe", label: "RPE ≥ 9/10 à l'arrêt", threshold: "9/10", consequence: "RPE <9 = arrêt prématuré, TTE sous-estimé" }
  ],
  
  inputFields: [
    { key: "ftp_target", label: "FTP cible utilisé", unit: "W", type: "number", min: 100, max: 500, step: 1, required: true, helpText: "La puissance que vous avez maintenue pendant le test" },
    { key: "tte_minutes", label: "Durée totale tenue", unit: "min", type: "number", min: 10, max: 120, step: 1, required: true, helpText: "Temps en minutes jusqu'à l'arrêt (arrondir à la minute inf.)" },
    { key: "power_avg", label: "Puissance moyenne réelle", unit: "W", type: "number", min: 100, max: 500, step: 1, required: true, helpText: "Puissance moyenne sur toute la durée du test" },
    { key: "hr_start", label: "FC après 5 min (stabilisée)", unit: "bpm", type: "number", min: 80, max: 200, step: 1, required: true, helpText: "FC moyenne entre minute 3 et 5" },
    { key: "hr_end", label: "FC finale (à l'arrêt)", unit: "bpm", type: "number", min: 100, max: 220, step: 1, required: true, helpText: "FC au moment de l'arrêt du test" },
    { key: "rpe_final", label: "RPE final (échelle 1-10)", unit: "/10", type: "number", min: 1, max: 10, step: 1, required: false, helpText: "Perception de l'effort à l'arrêt" }
  ],
  
  tfclImpact: [
    { parameter: "TTE", confidenceBoost: 0.20, description: "Calibration directe du Time To Exhaustion (+20% confiance)", formula: "TTE = durée mesurée en minutes" },
    { parameter: "VLamax", confidenceBoost: 0.10, description: "Affine l'estimation VLamax via endurance au seuil", formula: "TTE long → VLamax basse (profil endurant)" },
    { parameter: "Dérive cardiaque", confidenceBoost: 0.05, description: "Mesure directe de la dérive cardiaque", formula: "Dérive = (FC_fin - FC_début) / durée" }
  ],
  
  calculationSteps: [
    { step: 1, name: "TTE brut", formula: "TTE = durée_tenue (min)", description: "Durée en minutes jusqu'à épuisement ou chute de puissance" },
    { step: 2, name: "Vérification puissance", formula: "Diff = |Pmoy - FTP| / FTP × 100", description: "La puissance moyenne doit être proche du FTP cible (±3%)" },
    { step: 3, name: "Dérive cardiaque", formula: "Dérive = FC_fin - FC_début", description: "Normale: 5-15 bpm. <5 = trop facile. >20 = problème thermo/hydratation" },
    { step: 4, name: "Catégorie TTE", formula: "<35min=faible, 35-50=modéré, 50-70=bon, >70=excellent", description: "Classification de l'endurance au seuil" },
    { step: 5, name: "Confiance", formula: "Conf = 0.90 - (diff>3% ? 0.15 : 0) - (diff>5% ? 0.15 : 0)", description: "Confiance de base 90%, réduite si puissance trop différente du FTP" }
  ],
  
  compute: (inputs) => {
    const tte = inputs.tte_minutes;
    const ftpTarget = inputs.ftp_target;
    const powerAvg = inputs.power_avg;
    const hrStart = inputs.hr_start;
    const hrEnd = inputs.hr_end;
    
    if (!tte || !ftpTarget || !powerAvg) {
      return { ok: false, error: "Données requises manquantes (TTE, FTP cible, Puissance moyenne)", confidence: 0, rawData: inputs };
    }
    
    const trace: { step: string; value: number | string }[] = [];
    
    // Step 1: TTE
    trace.push({ step: "TTE mesuré", value: `${tte} min` });
    
    // Step 2: Power diff
    const powerDiff = Math.abs(powerAvg - ftpTarget) / ftpTarget * 100;
    trace.push({ step: "Écart puissance vs FTP", value: `${powerDiff.toFixed(1)}%` });
    
    let confidence = 0.90;
    if (powerDiff > 3) confidence = 0.75;
    if (powerDiff > 5) confidence = 0.60;
    
    // Step 3: HR drift
    let hrDrift: number | undefined;
    if (hrStart && hrEnd) {
      hrDrift = hrEnd - hrStart;
      trace.push({ step: "Dérive cardiaque", value: `+${hrDrift} bpm` });
      if (hrDrift < 5 || hrDrift > 20) {
        confidence -= 0.05;
        trace.push({ step: "Malus dérive anormale", value: "-5%" });
      }
    }
    
    // Step 4: TTE Category
    let tteCategory: string;
    if (tte < 35) tteCategory = "Faible (améliorer endurance)";
    else if (tte < 50) tteCategory = "Modéré";
    else if (tte < 70) tteCategory = "Bon";
    else tteCategory = "Excellent (profil Ironman)";
    trace.push({ step: "Catégorie TTE", value: tteCategory });
    
    trace.push({ step: "Confiance finale", value: `${(confidence * 100).toFixed(0)}%` });
    
    return {
      ok: true,
      result: {
        primaryValue: tte,
        normalizedValue: tte,
        unit: "min",
        label: "TTE observé"
      },
      confidence,
      rawData: { 
        ...inputs, 
        powerDiff,
        hrDrift: hrDrift ?? 0,
        tte_minutes: tte,
        tteCategory,
        category: "TTE"
      },
      calculationTrace: trace
    };
  }
};

// ========================================
// TESTS COURSE À PIED
// ========================================

export const RUN_VLAMAX_SPRINT_15S: IntegratedTestProtocol = {
  id: "run_vlamax_sprint_15s_12min",
  name: "Test VLamax CAP – Sprint 15s + 12 min",
  shortName: "VLamax Sprint CAP",
  sport: "run",
  category: "VLAMAX",
  difficulty: "hard",
  
  objective: "Estimer la VLamax en course à pied via la combinaison d'un sprint court (capacité glycolytique) et d'un effort de 12 minutes (capacité aérobie). Le Sprint Ratio calculé permet de caractériser le profil métabolique du coureur.",
  targetParameters: ["VLamax Run", "VMA estimée", "Sprint Ratio CAP"],
  expectedPrecision: "high",
  reliabilityScore: 0.80,
  
  prerequisites: [
    "48h minimum sans séance à haute intensité",
    "Sommeil de qualité (≥7h) la nuit précédente",
    "Repas glucidique 2-3h avant le test",
    "Chaussures de course légères ou pointes (optionnel)",
    "VMA approximative connue pour calibrer le 12 min",
    "Assistant pour chronométrer (obligatoire)"
  ],
  
  equipment: [
    { name: "Piste d'athlétisme 400m (idéal) ou terrain plat mesuré précisément", required: true, alternatives: ["Route fermée plate mesurée au GPS"] },
    { name: "Chronomètre précis (ou montre avec fonction lap)", required: true },
    { name: "Cônes de marquage (pour repérer la zone de départ sprint)", required: true },
    { name: "Montre GPS (pour le 12 min)", required: true },
    { name: "Ceinture cardio-fréquencemètre (optionnel)", required: false },
    { name: "Assistant pour chronométrer les sprints", required: true }
  ],
  
  validityConditions: [
    { id: "rest48h", label: "48h sans intensité haute", critical: true, details: "Jambes fraîches obligatoires pour sprint maximal" },
    { id: "surface", label: "Surface dure et régulière (piste synthétique idéale)", critical: true, details: "Surface irrégulière = risque blessure + mesure faussée" },
    { id: "weather", label: "Pas de vent fort (<10 km/h)", critical: true, details: "Vent = fausse la distance de sprint" },
    { id: "temperature", label: "Température <25°C", critical: false, details: "Chaleur excessive = performance réduite" },
    { id: "shoes", label: "Chaussures de compétition légères recommandées", critical: false, details: "Pointes optionnelles pour sprint" },
    { id: "assistant", label: "Assistant présent pour chronométrer", critical: true, details: "Impossible de chrono soi-même pendant un sprint maximal" }
  ],
  
  warmup: [
    { minuteStart: 0, minuteEnd: 15, durationMin: 15, description: "Footing Zone 2 progressif", intensity: "60-65% VMA", details: "Démarrer lent et accélérer progressivement" },
    { minuteStart: 15, minuteEnd: 20, durationMin: 5, description: "Gammes techniques + étirements dynamiques", intensity: "N/A", details: "Montées de genoux, talons-fesses, pas chassés, étirements actifs" },
    { minuteStart: 20, minuteEnd: 26, durationMin: 6, description: "4×20s accélérations progressives (70-80-90-95%)", intensity: "Progressif", details: "Récup marche 1 min entre chaque. Dernière à 95% pour activer le système" },
    { minuteStart: 26, minuteEnd: 30, durationMin: 4, description: "Repos debout / marche légère", intensity: "Récupération complète", details: "Respiration profonde, se concentrer mentalement" }
  ],
  warmupTotalMin: 30,
  
  protocol: [
    { 
      stepNumber: 1, 
      minuteStart: 0,
      minuteEnd: 0,
      durationMin: 0.25,
      description: "SPRINT 1 : Départ lancé (5m d'élan), 15s ALL-OUT", 
      notes: "Mesurer la distance EXACTE parcourue (cônes ou marquage)",
      criticalPoints: ["Départ lancé (pas arrêté)", "Effort MAXIMAL", "Assistant chronomètre"]
    },
    { 
      stepNumber: 2, 
      minuteStart: 0,
      minuteEnd: 5,
      durationMin: 5, 
      description: "RÉCUPÉRATION complète : marche + trot très léger", 
      notes: "Laisser FC et respiration revenir au calme complet",
      criticalPoints: ["Ne pas rester statique", "Marche active"]
    },
    { 
      stepNumber: 3,
      minuteStart: 5,
      minuteEnd: 5, 
      durationMin: 0.25,
      description: "SPRINT 2 : Départ lancé (5m d'élan), 15s ALL-OUT", 
      notes: "Mesurer la distance EXACTE (viser la même ou plus que sprint 1)",
      criticalPoints: ["Mêmes consignes que sprint 1", "Engagement maximal"]
    },
    { 
      stepNumber: 4, 
      minuteStart: 5,
      minuteEnd: 15,
      durationMin: 10, 
      description: "RÉCUPÉRATION active : footing très léger Zone 1", 
      notes: "Préparer le 12 min mentalement. Boire quelques gorgées.",
      criticalPoints: ["Récupération longue obligatoire avant effort 12 min"]
    },
    { 
      stepNumber: 5, 
      minuteStart: 15,
      minuteEnd: 27,
      durationMin: 12,
      description: "12 MINUTES ALL-OUT : Effort régulier et maximal", 
      notes: "Pacing TRÈS régulier du début à la fin. Noter distance totale.",
      criticalPoints: ["Départ contrôlé (pas trop vite)", "Accélérer légèrement dernière minute si possible", "Noter distance GPS ou tours de piste"]
    }
  ],
  protocolTotalMin: 27,
  
  pacingRules: [
    "Sprints : engagement MAXIMAL dès le départ (pas de retenue)",
    "Sprints : ne pas regarder le chrono pendant l'effort",
    "Sprints : laisser un assistant mesurer la distance",
    "12 min : pacing ultra-régulier du début à la fin",
    "12 min : éviter le départ trop rapide (erreur classique)",
    "12 min : viser un effort où on finit épuisé mais régulier"
  ],
  
  validationCriteria: [
    { id: "sprint_variance", label: "Écart <5% entre les 2 sprints", threshold: "5%", invalidFlag: "sprint_variance_high", consequence: "Si >5%: fatigue ou engagement inégal" },
    { id: "12min_pacing", label: "Pacing régulier sur 12 min (split négatif acceptable)", invalidFlag: "pacing_error", consequence: "Positive split fort = résultat faussé" },
    { id: "rpe", label: "RPE ≥9/10 en fin de 12 min", threshold: "9/10", consequence: "RPE <9 = effort sous-maximal, VMA sous-estimée" }
  ],
  
  inputFields: [
    { key: "dist_sprint_1", label: "Distance Sprint 1", unit: "m", type: "number", min: 50, max: 150, step: 0.1, required: true, helpText: "Distance exacte parcourue en 15s (mesurer au mètre)" },
    { key: "dist_sprint_2", label: "Distance Sprint 2", unit: "m", type: "number", min: 50, max: 150, step: 0.1, required: true, helpText: "Distance exacte parcourue en 15s" },
    { key: "dist_12min", label: "Distance 12 min", unit: "m", type: "number", min: 1500, max: 5000, step: 1, required: true, helpText: "Distance totale parcourue pendant les 12 minutes" },
    { key: "hr_max_sprint", label: "FC max sprint (optionnel)", unit: "bpm", type: "number", min: 100, max: 220, step: 1, required: false, helpText: "FC pic en fin de sprint" },
    { key: "hr_max_12min", label: "FC max 12 min (optionnel)", unit: "bpm", type: "number", min: 100, max: 220, step: 1, required: false, helpText: "FC max atteinte pendant le 12 min" }
  ],
  
  tfclImpact: [
    { parameter: "VLamax Run", confidenceBoost: 0.15, description: "Calibration directe VLamax course (+15%)", formula: "VLamax = f(SprintRatio_CAP)" },
    { parameter: "VMA", confidenceBoost: 0.10, description: "Estimation VMA via test 12 min (+10%)", formula: "VMA ≈ D12 / 12 × 1.05" }
  ],
  
  calculationSteps: [
    { step: 1, name: "Vitesse sprint (V15s)", formula: "V15s = D_sprint / 15 (m/s)", description: "Vitesse moyenne sur le meilleur sprint de 15s" },
    { step: 2, name: "Vitesse 12 min (V12)", formula: "V12 = D_12min / 720 (m/s)", description: "Vitesse moyenne sur les 12 minutes (720s)" },
    { step: 3, name: "Sprint Ratio CAP", formula: "SR_cap = V15s / V12", description: "Ratio caractérisant le profil: <1.55 = endurant, >1.75 = explosif" },
    { step: 4, name: "VLamax normalisée", formula: "VLamax = 0.25 + (SR - 1.55) / 0.35 × 0.55", description: "Formule de conversion SR → VLamax, clampée 0.25-0.95" },
    { step: 5, name: "VMA estimée", formula: "VMA ≈ V12 × 3.6 × 1.05 (km/h)", description: "VMA estimée à partir du 12 min avec facteur de correction" }
  ],
  
  compute: (inputs) => {
    const d1 = inputs.dist_sprint_1;
    const d2 = inputs.dist_sprint_2;
    const d12 = inputs.dist_12min;
    
    if (!d1 || !d2 || !d12) {
      return { ok: false, error: "Distances requises manquantes", confidence: 0, rawData: inputs };
    }
    
    const trace: { step: string; value: number | string }[] = [];
    
    // Best sprint distance
    const bestD15 = Math.max(d1, d2);
    const v15 = bestD15 / 15; // m/s
    trace.push({ step: "Vitesse sprint (meilleur)", value: `${v15.toFixed(2)} m/s = ${(v15 * 3.6).toFixed(1)} km/h` });
    
    const v12 = d12 / 720; // 12 min = 720s
    trace.push({ step: "Vitesse 12 min", value: `${v12.toFixed(2)} m/s = ${(v12 * 3.6).toFixed(1)} km/h` });
    
    // Sprint Ratio
    const srRun = v15 / v12;
    trace.push({ step: "Sprint Ratio CAP", value: srRun.toFixed(2) });
    
    // VLamax formula
    const normalized = Math.max(0, Math.min(1, (srRun - 1.55) / 0.35));
    let vlamax = 0.25 + 0.55 * normalized;
    vlamax = Math.max(0.25, Math.min(0.95, vlamax));
    trace.push({ step: "VLamax estimée", value: `${vlamax.toFixed(3)} mmol/L/s` });
    
    // VMA estimation
    const vmaEstimated = v12 * 3.6 * 1.05;
    trace.push({ step: "VMA estimée", value: `${vmaEstimated.toFixed(1)} km/h` });
    
    // Confidence based on variance
    const variance = Math.abs(d1 - d2) / bestD15 * 100;
    trace.push({ step: "Variance sprints", value: `${variance.toFixed(1)}%` });
    
    let confidence = 0.80;
    if (variance > 5) confidence = 0.65;
    if (variance > 10) confidence = 0.50;
    trace.push({ step: "Confiance finale", value: `${(confidence * 100).toFixed(0)}%` });
    
    return {
      ok: true,
      result: {
        primaryValue: vlamax,
        normalizedValue: vlamax,
        unit: "mmol/L/s",
        label: "VLamax estimée"
      },
      confidence,
      rawData: { 
        ...inputs, 
        v15, 
        v12, 
        srRun, 
        variance,
        vmaEstimated,
        estimatedVlamax: vlamax
      },
      calculationTrace: trace
    };
  }
};

export const RUN_TTE: IntegratedTestProtocol = {
  id: "run_tte",
  name: "Test TTE CAP – Effort Continu",
  shortName: "TTE CAP",
  sport: "run",
  category: "TTE",
  difficulty: "hard",
  
  objective: "Mesurer le Time To Exhaustion à allure seuil en course à pied pour calibrer l'endurance et affiner les prédictions de performance sur marathon et semi-marathon.",
  targetParameters: ["TTE Run (minutes)", "Validation allure seuil", "Dérive cardiaque CAP"],
  expectedPrecision: "high",
  reliabilityScore: 0.85,
  
  prerequisites: [
    "48-72h minimum sans séance à haute intensité",
    "Allure seuil connue et validée (<4 semaines)",
    "Glycogène musculaire plein",
    "Parcours plat et mesuré repéré à l'avance",
    "Conditions météo favorables prévues"
  ],
  
  equipment: [
    { name: "Piste d'athlétisme 400m ou parcours très plat (<1% dénivelé)", required: true },
    { name: "Montre GPS avec affichage allure instantanée", required: true },
    { name: "Cardio-fréquencemètre ceinture (précis)", required: true },
    { name: "Chronomètre backup", required: false }
  ],
  
  validityConditions: [
    { id: "rest48h", label: "48-72h sans intensité haute", critical: true, details: "Jambes fraîches obligatoires" },
    { id: "thresholdKnown", label: "Allure seuil connue (<4 semaines)", critical: true, details: "Test seuil récent obligatoire" },
    { id: "flat", label: "Parcours plat (<1% dénivelé)", critical: true, details: "Dénivelé = allure faussée" },
    { id: "weather", label: "Conditions météo favorables (<25°C, vent <15km/h)", critical: false, details: "Chaleur/vent = TTE réduit" }
  ],
  
  warmup: [
    { minuteStart: 0, minuteEnd: 15, durationMin: 15, description: "Footing progressif Zone 2", intensity: "60-70% VMA", details: "Démarrer lent, finir à allure confortable" },
    { minuteStart: 15, minuteEnd: 20, durationMin: 5, description: "Gammes + étirements dynamiques", intensity: "N/A", details: "Préparer les jambes techniquement" },
    { minuteStart: 20, minuteEnd: 28, durationMin: 8, description: "2×2 min à allure seuil avec 2 min récup", intensity: "Allure cible", details: "Validation de l'allure avant le test" },
    { minuteStart: 28, minuteEnd: 33, durationMin: 5, description: "Récupération trot léger", intensity: "Z1", details: "Laisser FC redescendre" }
  ],
  warmupTotalMin: 33,
  
  protocol: [
    { 
      stepNumber: 1, 
      description: "DÉMARRAGE : Stabiliser exactement à l'allure seuil cible",
      notes: "Premiers 500m = calibrer l'allure précisément",
      criticalPoints: ["Allure stable dès le départ", "Ne pas partir trop vite"]
    },
    { 
      stepNumber: 2, 
      description: "MAINTIEN : Tenir aussi longtemps que possible à l'allure seuil",
      notes: "Pacing très régulier, respiration ample et rythmée",
      criticalPoints: ["Concentration sur la technique", "Respiration régulière"]
    },
    { 
      stepNumber: 3, 
      description: "SURVEILLANCE : Critère d'arrêt",
      notes: "Arrêter si allure >5% plus lente pendant 1 minute consécutive",
      criticalPoints: ["Écouter son corps", "Arrêt quand impossible de maintenir"]
    },
    { 
      stepNumber: 4, 
      description: "FIN : Noter le temps exact en minutes",
      notes: "Noter aussi distance totale et FC finale"
    }
  ],
  protocolTotalMin: 60,
  
  pacingRules: [
    "Pacing ultra-régulier du premier au dernier mètre",
    "Éviter absolument le positive split (départ trop rapide)",
    "Acceptable : légère accélération finale si réserve",
    "Allure = seuil ± 3 sec/km maximum"
  ],
  
  validationCriteria: [
    { id: "pace_variance", label: "Variabilité d'allure <3%", threshold: "3%", consequence: "Pacing irrégulier = résultat moins fiable" },
    { id: "hr_drift", label: "Dérive cardiaque normale (5-15 bpm)", threshold: "5-15 bpm", consequence: "<5 = trop facile, >15 = surchauffe" },
    { id: "rpe", label: "RPE ≥9/10 à l'arrêt", threshold: "9/10", consequence: "RPE <9 = arrêt prématuré" }
  ],
  
  inputFields: [
    { key: "pace_target", label: "Allure seuil cible", unit: "sec/km", type: "number", min: 180, max: 480, step: 1, required: true, helpText: "Votre allure seuil en secondes par km (ex: 270 = 4:30/km)" },
    { key: "tte_minutes", label: "Durée totale tenue", unit: "min", type: "number", min: 10, max: 90, step: 1, required: true, helpText: "Temps en minutes jusqu'à l'arrêt" },
    { key: "pace_avg", label: "Allure moyenne réelle", unit: "sec/km", type: "number", min: 180, max: 480, step: 1, required: true, helpText: "Allure moyenne sur toute la durée" },
    { key: "distance_total", label: "Distance totale", unit: "m", type: "number", min: 2000, max: 30000, step: 1, required: true, helpText: "Distance totale parcourue" },
    { key: "hr_start", label: "FC après 5 min", unit: "bpm", type: "number", min: 100, max: 200, step: 1, required: false, helpText: "FC stabilisée minute 3-5" },
    { key: "hr_end", label: "FC finale", unit: "bpm", type: "number", min: 120, max: 220, step: 1, required: false, helpText: "FC à l'arrêt du test" }
  ],
  
  tfclImpact: [
    { parameter: "TTE Run", confidenceBoost: 0.20, description: "Calibration directe TTE course (+20%)", formula: "TTE = durée mesurée" },
    { parameter: "Seuil validation", confidenceBoost: 0.10, description: "Valide l'allure seuil utilisée (+10%)", formula: "Seuil OK si TTE 30-60 min" }
  ],
  
  calculationSteps: [
    { step: 1, name: "TTE brut", formula: "TTE = durée_tenue (min)", description: "Durée en minutes jusqu'à arrêt" },
    { step: 2, name: "Vérification allure", formula: "Diff = |Allure_moy - Allure_cible| / Allure_cible × 100", description: "L'allure doit être proche de la cible (±3%)" },
    { step: 3, name: "Dérive cardiaque", formula: "Dérive = FC_fin - FC_début", description: "5-15 bpm = normal" },
    { step: 4, name: "Confiance", formula: "Conf = 0.85 - (diff>3% ? 0.15 : 0) - (diff>5% ? 0.15 : 0)", description: "Confiance de base 85%" }
  ],
  
  compute: (inputs) => {
    const tte = inputs.tte_minutes;
    const paceTarget = inputs.pace_target;
    const paceAvg = inputs.pace_avg;
    
    if (!tte || !paceTarget || !paceAvg) {
      return { ok: false, error: "Données requises manquantes", confidence: 0, rawData: inputs };
    }
    
    const trace: { step: string; value: number | string }[] = [];
    
    trace.push({ step: "TTE mesuré", value: `${tte} min` });
    
    const paceDiff = Math.abs(paceAvg - paceTarget) / paceTarget * 100;
    trace.push({ step: "Écart allure", value: `${paceDiff.toFixed(1)}%` });
    
    let confidence = 0.85;
    if (paceDiff > 3) confidence = 0.70;
    if (paceDiff > 5) confidence = 0.55;
    
    // HR drift if available
    if (inputs.hr_start && inputs.hr_end) {
      const hrDrift = inputs.hr_end - inputs.hr_start;
      trace.push({ step: "Dérive cardiaque", value: `+${hrDrift} bpm` });
    }
    
    trace.push({ step: "Confiance finale", value: `${(confidence * 100).toFixed(0)}%` });
    
    return {
      ok: true,
      result: {
        primaryValue: tte,
        normalizedValue: tte,
        unit: "min",
        label: "TTE observé"
      },
      confidence,
      rawData: { 
        ...inputs, 
        paceDiff,
        tte_minutes: tte,
        category: "TTE"
      },
      calculationTrace: trace
    };
  }
};

// ========================================
// TESTS FATMAX VÉLO
// ========================================

export const BIKE_FATMAX_ESTIMATION: IntegratedTestProtocol = {
  id: "bike_fatmax_estimation",
  name: "Test FatMax Vélo – Estimation Oxydation Lipidique",
  shortName: "FatMax Vélo",
  sport: "bike",
  category: "FATMAX",
  difficulty: "moderate",
  
  objective: "Estimer la zone FatMax (puissance à laquelle l'oxydation des graisses est maximale) via un protocole par paliers progressifs. Crucial pour optimiser la nutrition en course longue.",
  targetParameters: ["FatMax W", "FatMax %FTP", "Zone lipidique optimale"],
  expectedPrecision: "medium",
  reliabilityScore: 0.75,
  
  prerequisites: [
    "À jeun depuis ≥10h OU repas très léger >3h avant",
    "24-48h sans intensité haute",
    "Hydratation normale (eau uniquement)",
    "Pas de caféine le jour du test",
    "FTP connu"
  ],
  
  equipment: [
    { name: "Home trainer ou parcours plat", required: true },
    { name: "Capteur de puissance calibré", required: true },
    { name: "Cardio-fréquencemètre précis", required: true },
    { name: "Chronomètre", required: true }
  ],
  
  validityConditions: [
    { id: "fasted", label: "À jeun depuis ≥10h OU repas léger >3h avant", critical: true, details: "Estomac vide pour maximiser l'oxydation lipidique" },
    { id: "rest24h", label: "24-48h sans intensité haute", critical: true, details: "Glycogène partiellement vidé = meilleure lecture FatMax" },
    { id: "hydration", label: "Hydratation normale (eau uniquement)", critical: true, details: "Pas de boissons sucrées" },
    { id: "caffeine", label: "Pas de caféine le jour du test", critical: false, details: "Caféine modifie le métabolisme lipidique" },
    { id: "temperature", label: "Température stable (18-22°C)", critical: false, details: "Chaleur = shift vers glucides" }
  ],
  
  warmup: [
    { minuteStart: 0, minuteEnd: 10, durationMin: 10, description: "Zone 1 très facile", intensity: "50% FTP", details: "Pédalage très léger pour activation" },
    { minuteStart: 10, minuteEnd: 15, durationMin: 5, description: "Légère montée vers Z2", intensity: "55-60% FTP", details: "Préparer le protocole par paliers" }
  ],
  warmupTotalMin: 15,
  
  protocol: [
    { stepNumber: 1, durationMin: 6, description: "PALIER 1 : 45% FTP", notes: "Cadence stable 85-95 rpm. Noter FC moyenne minute 5-6." },
    { stepNumber: 2, durationMin: 6, description: "PALIER 2 : 50% FTP", notes: "Noter FC moyenne et RPE fin de palier" },
    { stepNumber: 3, durationMin: 6, description: "PALIER 3 : 55% FTP", notes: "Noter FC moyenne et RPE fin de palier" },
    { stepNumber: 4, durationMin: 6, description: "PALIER 4 : 60% FTP", notes: "Noter FC moyenne et RPE fin de palier" },
    { stepNumber: 5, durationMin: 6, description: "PALIER 5 : 65% FTP", notes: "Noter FC moyenne et RPE fin de palier" },
    { stepNumber: 6, durationMin: 6, description: "PALIER 6 : 70% FTP (optionnel)", notes: "Si respiration encore nasale possible" },
    { stepNumber: 7, description: "ANALYSE : Identifier le palier où RPE passe de 3-4 à 5-6", notes: "= Point de crossover estimé (transition lipides→glucides)" }
  ],
  protocolTotalMin: 42,
  
  pacingRules: [
    "Cadence stable 85-95 rpm tout le test",
    "Respiration principalement nasale sur paliers bas",
    "Ne pas parler pendant les paliers",
    "Boire par petites gorgées d'eau si nécessaire"
  ],
  
  validationCriteria: [
    { id: "hr_stable", label: "FC stable (<5 bpm de variation) sur chaque palier", threshold: "5 bpm", consequence: "FC instable = données non fiables" },
    { id: "rpe_progression", label: "RPE progresse logiquement avec paliers", invalidFlag: "rpe_incoherent", consequence: "RPE qui ne monte pas = effort trop facile" },
    { id: "crossover_clear", label: "Point de crossover identifiable", invalidFlag: "crossover_unclear", consequence: "Si pas de point clair, étendre les paliers" }
  ],
  
  inputFields: [
    { key: "ftp", label: "FTP utilisé", unit: "W", type: "number", min: 100, max: 500, step: 1, required: true, helpText: "Votre FTP de référence" },
    { key: "hr_45pct", label: "FC moyenne à 45%", unit: "bpm", type: "number", min: 80, max: 180, step: 1, required: true, helpText: "FC min 5-6 du palier 45%" },
    { key: "hr_50pct", label: "FC moyenne à 50%", unit: "bpm", type: "number", min: 80, max: 180, step: 1, required: true, helpText: "FC min 5-6 du palier 50%" },
    { key: "hr_55pct", label: "FC moyenne à 55%", unit: "bpm", type: "number", min: 80, max: 180, step: 1, required: true, helpText: "FC min 5-6 du palier 55%" },
    { key: "hr_60pct", label: "FC moyenne à 60%", unit: "bpm", type: "number", min: 80, max: 190, step: 1, required: true, helpText: "FC min 5-6 du palier 60%" },
    { key: "hr_65pct", label: "FC moyenne à 65%", unit: "bpm", type: "number", min: 90, max: 200, step: 1, required: true, helpText: "FC min 5-6 du palier 65%" },
    { key: "rpe_crossover_pct", label: "% FTP au crossover (RPE 4→5)", unit: "%", type: "number", min: 45, max: 80, step: 5, required: true, helpText: "Le palier où le RPE passe de confortable (4) à modéré (5)" },
    { key: "respiration_nasal_max_pct", label: "% FTP max respiration nasale", unit: "%", type: "number", min: 45, max: 75, step: 5, required: false, helpText: "Dernier palier où respiration nasale encore possible" }
  ],
  
  tfclImpact: [
    { parameter: "FatMax", confidenceBoost: 0.15, description: "Calibration zone FatMax (+15%)", formula: "FatMax = crossover - 5%" },
    { parameter: "Nutrition longue distance", confidenceBoost: 0.10, description: "Affine les recommandations nutrition (+10%)" }
  ],
  
  calculationSteps: [
    { step: 1, name: "Point de crossover", formula: "Crossover = palier où RPE 4→5", description: "Transition métabolique lipides→glucides" },
    { step: 2, name: "FatMax estimé", formula: "FatMax% = Crossover% - 5%", description: "La zone juste avant le crossover = oxydation lipidique max" },
    { step: 3, name: "FatMax en Watts", formula: "FatMax_W = FTP × FatMax% / 100", description: "Puissance correspondant à la zone FatMax" },
    { step: 4, name: "Zone FatMax", formula: "Zone = [FatMax% - 5%, FatMax% + 5%]", description: "Plage de puissance recommandée pour course longue" }
  ],
  
  compute: (inputs) => {
    const ftp = inputs.ftp;
    const crossoverPct = inputs.rpe_crossover_pct;
    const nasalMaxPct = inputs.respiration_nasal_max_pct;
    
    if (!ftp || !crossoverPct) {
      return { ok: false, error: "Données requises manquantes", confidence: 0, rawData: inputs };
    }
    
    const trace: { step: string; value: number | string }[] = [];
    
    // FatMax = crossover - 5%
    const fatmaxPct = crossoverPct - 5;
    trace.push({ step: "FatMax %FTP", value: `${fatmaxPct}%` });
    
    const fatmaxW = Math.round(ftp * fatmaxPct / 100);
    trace.push({ step: "FatMax Watts", value: `${fatmaxW} W` });
    
    // Zone FatMax
    const fatmaxLow = Math.round(ftp * (fatmaxPct - 5) / 100);
    const fatmaxHigh = Math.round(ftp * (fatmaxPct + 5) / 100);
    trace.push({ step: "Zone FatMax", value: `${fatmaxLow}-${fatmaxHigh} W` });
    
    // Confidence
    let confidence = 0.75;
    
    // Check HR progression
    const hrs = [inputs.hr_45pct, inputs.hr_50pct, inputs.hr_55pct, inputs.hr_60pct, inputs.hr_65pct].filter(Boolean);
    if (hrs.length >= 4) {
      const progressionOk = hrs.every((hr, i) => i === 0 || hr >= hrs[i - 1]);
      if (!progressionOk) {
        confidence -= 0.10;
        trace.push({ step: "Malus FC non progressive", value: "-10%" });
      }
    }
    
    // Bonus if nasal breathing consistent
    if (nasalMaxPct && Math.abs(nasalMaxPct - crossoverPct) <= 10) {
      confidence += 0.05;
      trace.push({ step: "Bonus cohérence nasale", value: "+5%" });
    }
    
    trace.push({ step: "Confiance finale", value: `${(Math.min(0.85, confidence) * 100).toFixed(0)}%` });
    
    return {
      ok: true,
      result: {
        primaryValue: fatmaxW,
        normalizedValue: fatmaxPct,
        unit: "W",
        label: `FatMax ~${fatmaxW}W (${fatmaxPct}% FTP)`
      },
      confidence: Math.min(0.85, confidence),
      rawData: { 
        ...inputs, 
        fatmaxW, 
        fatmaxPct, 
        fatmaxLow, 
        fatmaxHigh,
        estimatedFatmax: fatmaxPct
      },
      calculationTrace: trace
    };
  }
};

// ========================================
// TESTS ÉCONOMIE DE COURSE
// ========================================

export const RUN_ECONOMY: IntegratedTestProtocol = {
  id: "run_economy",
  name: "Test Économie de Course – Coût Énergétique",
  shortName: "Économie CAP",
  sport: "run",
  category: "ECONOMY",
  difficulty: "moderate",
  
  objective: "Estimer l'économie de course (coût énergétique par km) via un test sous-maximal avec mesure de la fréquence cardiaque à allure constante. Plus la FC est basse à une allure donnée, meilleure est l'économie.",
  targetParameters: ["Économie (HR/pace)", "Coût cardiaque", "Efficience relative"],
  expectedPrecision: "medium",
  reliabilityScore: 0.70,
  
  prerequisites: [
    "24-48h sans intensité haute",
    "Surface plate et régulière disponible",
    "Conditions météo stables prévues",
    "Allure marathon et semi approximatives connues",
    "Ceinture cardio précise (obligatoire)"
  ],
  
  equipment: [
    { name: "Piste 400m ou parcours plat mesuré", required: true },
    { name: "Montre GPS avec allure instantanée", required: true },
    { name: "Cardio-fréquencemètre précis (ceinture obligatoire)", required: true },
    { name: "Capteur de puissance running (optionnel)", required: false, alternatives: ["Stryd", "Garmin Running Power"] }
  ],
  
  validityConditions: [
    { id: "rest24h", label: "24-48h sans intensité haute", critical: true, details: "Jambes fraîches pour lecture FC fiable" },
    { id: "flat", label: "Surface plate et régulière", critical: true, details: "Dénivelé = FC augmentée artificiellement" },
    { id: "weather", label: "Conditions météo stables (pas de vent >10 km/h)", critical: true, details: "Vent = effort supplémentaire non mesurable" },
    { id: "nutrition", label: "Repas léger 2-3h avant", critical: false, details: "Digestion peut augmenter FC" },
    { id: "shoes", label: "Chaussures habituelles d'entraînement", critical: false, details: "Pas de chaussures neuves" }
  ],
  
  warmup: [
    { minuteStart: 0, minuteEnd: 15, durationMin: 15, description: "Footing très progressif Z1-Z2", intensity: "55-65% VMA", details: "Démarrer très lent" },
    { minuteStart: 15, minuteEnd: 20, durationMin: 5, description: "Gammes techniques légères", intensity: "N/A", details: "Activation neuromusculaire" },
    { minuteStart: 20, minuteEnd: 25, durationMin: 5, description: "3×30s à l'allure marathon", intensity: "Allure marathon", details: "Calibrer les sensations" }
  ],
  warmupTotalMin: 25,
  
  protocol: [
    { stepNumber: 1, durationMin: 6, description: "PALIER 1 : 6 min à allure marathon + 30 sec/km", notes: "Allure très confortable, respiration facile", criticalPoints: ["Allure TRÈS stable", "Ignorer les 3 premières minutes pour FC"] },
    { stepNumber: 2, durationMin: 2, description: "RÉCUPÉRATION : marche ou trot très léger", notes: "Laisser FC redescendre" },
    { stepNumber: 3, durationMin: 6, description: "PALIER 2 : 6 min à allure marathon", notes: "Allure marathon estimée", criticalPoints: ["Noter FC moyenne min 3-6"] },
    { stepNumber: 4, durationMin: 2, description: "RÉCUPÉRATION : marche ou trot très léger" },
    { stepNumber: 5, durationMin: 6, description: "PALIER 3 : 6 min à allure semi-marathon", notes: "Allure semi estimée", criticalPoints: ["Noter FC moyenne min 3-6"] },
    { stepNumber: 6, description: "ANALYSE : Comparer FC à chaque allure pour calculer le coût cardiaque" }
  ],
  protocolTotalMin: 22,
  
  pacingRules: [
    "Allure TRÈS stable sur chaque palier (variabilité <5 sec/km)",
    "Cadence naturelle (ne pas forcer une cadence particulière)",
    "Respiration régulière, ne pas parler",
    "Laisser la FC se stabiliser (ignorer les 3 premières minutes de chaque palier)"
  ],
  
  validationCriteria: [
    { id: "pace_stable", label: "Allure stable sur chaque palier (<5 sec/km)", threshold: "5 sec/km", consequence: "Allure instable = FC instable = résultat faussé" },
    { id: "hr_stable", label: "FC stabilisée (<3 bpm de variation) sur 3 dernières min", threshold: "3 bpm", consequence: "FC qui continue de monter = palier trop court" },
    { id: "hr_progression", label: "FC augmente logiquement entre paliers", invalidFlag: "hr_incoherent", consequence: "FC qui baisse = erreur de mesure" }
  ],
  
  inputFields: [
    { key: "pace_1", label: "Allure palier 1 (lent)", unit: "sec/km", type: "number", min: 240, max: 600, step: 1, required: true, helpText: "Allure marathon + 30 sec/km" },
    { key: "hr_1", label: "FC moyenne palier 1 (min 3-6)", unit: "bpm", type: "number", min: 100, max: 180, step: 1, required: true, helpText: "FC moyenne minutes 3 à 6" },
    { key: "pace_2", label: "Allure palier 2 (marathon)", unit: "sec/km", type: "number", min: 210, max: 480, step: 1, required: true, helpText: "Allure marathon estimée" },
    { key: "hr_2", label: "FC moyenne palier 2 (min 3-6)", unit: "bpm", type: "number", min: 110, max: 190, step: 1, required: true, helpText: "FC moyenne minutes 3 à 6" },
    { key: "pace_3", label: "Allure palier 3 (semi)", unit: "sec/km", type: "number", min: 180, max: 420, step: 1, required: true, helpText: "Allure semi estimée" },
    { key: "hr_3", label: "FC moyenne palier 3 (min 3-6)", unit: "bpm", type: "number", min: 120, max: 200, step: 1, required: true, helpText: "FC moyenne minutes 3 à 6" },
    { key: "fc_max", label: "FC max connue", unit: "bpm", type: "number", min: 150, max: 220, step: 1, required: false, helpText: "Permet de calculer %FCmax" },
    { key: "power_avg", label: "Puissance moyenne (si dispo)", unit: "W", type: "number", min: 150, max: 500, step: 1, required: false, helpText: "Si capteur de puissance disponible" }
  ],
  
  tfclImpact: [
    { parameter: "Économie de course", confidenceBoost: 0.15, description: "Calibration économie via test terrain (+15%)", formula: "Économie = FC / vitesse" },
    { parameter: "Prédiction performance", confidenceBoost: 0.10, description: "Affine les prédictions marathon/semi (+10%)" }
  ],
  
  calculationSteps: [
    { step: 1, name: "Vitesse par palier", formula: "V = 3600 / allure (km/h)", description: "Convertir allure (sec/km) en vitesse (km/h)" },
    { step: 2, name: "Coût cardiaque par palier", formula: "Coût = FC / V (bpm par km/h)", description: "Plus le coût est bas, meilleure est l'économie" },
    { step: 3, name: "Coût moyen", formula: "Coût_moy = (C1 + C2 + C3) / 3", description: "Moyenne des 3 paliers" },
    { step: 4, name: "Classification", formula: "≤11: Excellente, 12-13: Très bonne, 14-15: Bonne, 16-17: Moyenne, >17: À améliorer", description: "Référence pour interpréter le résultat" }
  ],
  
  compute: (inputs) => {
    const { pace_1, hr_1, pace_2, hr_2, pace_3, hr_3, fc_max, power_avg } = inputs;
    
    if (!pace_1 || !hr_1 || !pace_2 || !hr_2 || !pace_3 || !hr_3) {
      return { ok: false, error: "Données requises manquantes", confidence: 0, rawData: inputs };
    }
    
    const trace: { step: string; value: number | string }[] = [];
    
    // Speeds
    const speed1 = 3600 / pace_1;
    const speed2 = 3600 / pace_2;
    const speed3 = 3600 / pace_3;
    trace.push({ step: "Vitesses", value: `${speed1.toFixed(1)} / ${speed2.toFixed(1)} / ${speed3.toFixed(1)} km/h` });
    
    // Costs
    const costPerKmh_1 = hr_1 / speed1;
    const costPerKmh_2 = hr_2 / speed2;
    const costPerKmh_3 = hr_3 / speed3;
    trace.push({ step: "Coûts cardiaques", value: `${costPerKmh_1.toFixed(1)} / ${costPerKmh_2.toFixed(1)} / ${costPerKmh_3.toFixed(1)} bpm/(km/h)` });
    
    const avgCost = (costPerKmh_1 + costPerKmh_2 + costPerKmh_3) / 3;
    trace.push({ step: "Coût moyen", value: `${avgCost.toFixed(1)} bpm/(km/h)` });
    
    // Classification
    let economyLabel: string;
    let economyScore: number;
    
    if (avgCost <= 11) {
      economyLabel = "Excellente";
      economyScore = 95;
    } else if (avgCost <= 13) {
      economyLabel = "Très bonne";
      economyScore = 85;
    } else if (avgCost <= 15) {
      economyLabel = "Bonne";
      economyScore = 70;
    } else if (avgCost <= 17) {
      economyLabel = "Moyenne";
      economyScore = 55;
    } else {
      economyLabel = "À améliorer";
      economyScore = 40;
    }
    trace.push({ step: "Classification", value: economyLabel });
    
    // Confidence
    let confidence = 0.70;
    
    // Check logical progression
    if (hr_1 < hr_2 && hr_2 < hr_3) {
      confidence += 0.05;
      trace.push({ step: "Bonus progression FC logique", value: "+5%" });
    } else {
      confidence -= 0.10;
      trace.push({ step: "Malus progression FC illogique", value: "-10%" });
    }
    
    // Bonus if FC max known
    if (fc_max) {
      confidence += 0.05;
    }
    
    // Bonus if power available
    if (power_avg) {
      confidence += 0.05;
    }
    
    trace.push({ step: "Confiance finale", value: `${(Math.min(0.85, confidence) * 100).toFixed(0)}%` });
    
    return {
      ok: true,
      result: {
        primaryValue: economyScore,
        normalizedValue: avgCost,
        unit: "bpm/(km/h)",
        label: `Économie : ${economyLabel} (${avgCost.toFixed(1)} bpm/km/h)`
      },
      confidence: Math.min(0.85, confidence),
      rawData: { 
        ...inputs, 
        speed1, speed2, speed3,
        costPerKmh_1, costPerKmh_2, costPerKmh_3,
        avgCost,
        economyScore,
        economyLabel
      },
      calculationTrace: trace
    };
  }
};

// ========================================
// SEMAINE DE RÉFÉRENCE TFCL
// ========================================

export interface ReferenceWeekDay {
  day: number;
  type: "rest" | "test" | "recovery";
  testId?: string;
  title: string;
  description: string;
}

export const TFCL_REFERENCE_WEEK: {
  title: string;
  objective: string;
  days: ReferenceWeekDay[];
  completionBadge: string;
  globalConfidenceBoost: number;
} = {
  title: "Semaine de Référence TFCL",
  objective: "Collecter des données standardisées pour calibrer TOUS les modèles V2 avec un niveau de confiance maximal.",
  days: [
    { day: 1, type: "test", testId: "bike_vlamax_sprint_15s", title: "Sprint Vélo", description: "Test VLamax Vélo Sprint 15s" },
    { day: 2, type: "recovery", title: "Récupération", description: "Z1-Z2 récupération active 30-45 min" },
    { day: 3, type: "test", testId: "bike_tte_ftp", title: "TTE Vélo", description: "Test TTE Vélo FTP constant" },
    { day: 4, type: "rest", title: "Repos", description: "Repos complet ou marche légère" },
    { day: 5, type: "test", testId: "run_vlamax_sprint_15s_12min", title: "Sprint CAP", description: "Test VLamax CAP Sprint 15s + 12 min" },
    { day: 6, type: "recovery", title: "Récupération", description: "Z1-Z2 récupération active 30-45 min" },
    { day: 7, type: "test", testId: "run_tte", title: "TTE CAP", description: "Test TTE CAP effort continu" }
  ],
  completionBadge: "Profil TFCL Calibré ✓",
  globalConfidenceBoost: 0.25
};

// ========================================
// BIBLIOTHÈQUE COMPLÈTE
// ========================================

import { BIKE_DURABILITY_SUBMAX, RUN_DURABILITY_SUBMAX } from "./testProtocolsDurability";

export { BIKE_DURABILITY_SUBMAX, RUN_DURABILITY_SUBMAX };



export const INTEGRATED_TESTS_LIBRARY: IntegratedTestProtocol[] = [
  BIKE_VLAMAX_SPRINT_15S,
  BIKE_TTE_FTP,
  BIKE_DURABILITY_SUBMAX,
  BIKE_FATMAX_ESTIMATION,
  RUN_VLAMAX_SPRINT_15S,
  RUN_TTE,
  RUN_DURABILITY_SUBMAX,
  RUN_ECONOMY
];

// Helpers
export function getTestById(id: string): IntegratedTestProtocol | undefined {
  return INTEGRATED_TESTS_LIBRARY.find(t => t.id === id);
}

export function getTestsBySport(sport: TestSport): IntegratedTestProtocol[] {
  return INTEGRATED_TESTS_LIBRARY.filter(t => t.sport === sport);
}

export function getTestsByCategory(category: TestCategory): IntegratedTestProtocol[] {
  return INTEGRATED_TESTS_LIBRARY.filter(t => t.category === category);
}

export function getConfidenceLabel(confidence: number): { label: string; color: string } {
  if (confidence >= 0.80) return { label: "Élevée", color: "text-green-500" };
  if (confidence >= 0.65) return { label: "Moyenne", color: "text-yellow-500" };
  return { label: "Faible", color: "text-orange-500" };
}

export function getDifficultyLabel(difficulty: TestDifficulty): { label: string; color: string } {
  switch (difficulty) {
    case "easy": return { label: "Facile", color: "text-green-500" };
    case "moderate": return { label: "Modéré", color: "text-yellow-500" };
    case "hard": return { label: "Difficile", color: "text-red-500" };
  }
}
