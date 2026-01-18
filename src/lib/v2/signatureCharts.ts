/**
 * GRAPHIQUES SIGNATURE TFCL™ — Two For Coaching Lab Method™
 * 
 * Documentation et logique métier pour les 4 graphiques officiels :
 * 1. Metabolic Performance Compass™
 * 2. Matrice Risque Performance / Blessure
 * 3. Évolution VLamax / TTE
 * 4. Cadence & Profil Métabolique
 * 
 * PRINCIPES UI :
 * - Mobile-first
 * - Tooltips pédagogiques
 * - Légendes claires
 * - Jamais de score isolé sans contexte
 */

// =============================================
// CONSTANTES & DOCUMENTATION
// =============================================

export const SIGNATURE_CHARTS_DOC = {
  title: "Graphiques Signature TFCL™",
  subtitle: "Two For Coaching Lab Method™",
  
  principle: `Ces graphiques doivent :
- Expliquer visuellement les modèles
- Montrer les limites
- Aider à la décision coach`,
  
  disclaimer: "Représentation modélisée — ne remplace pas une mesure directe."
};

// =============================================
// 1️⃣ METABOLIC PERFORMANCE COMPASS™
// =============================================

export const COMPASS_CHART = {
  id: "metabolic_compass",
  title: "Metabolic Performance Compass™",
  icon: "🧭",
  
  axes: [
    { 
      id: "puissance_durable", 
      label: "Puissance Durable", 
      formula: "(FTP / FTP_cible) × (TTE / TTE_cible) × 100",
      description: "Capacité à maintenir une puissance élevée dans le temps"
    },
    { 
      id: "robustesse", 
      label: "Robustesse", 
      formula: "100 - Fatigue_quantifiée",
      description: "Résistance à la fatigue et capacité de récupération"
    },
    { 
      id: "economie", 
      label: "Économie", 
      formula: "Score économie CAP ou Bike (selon sport)",
      description: "Efficacité biomécanique et métabolique"
    },
    { 
      id: "flexibilite_metabolique", 
      label: "Flexibilité Métabolique", 
      formula: "100 - |VLamax - VLamax_optimal| × 150",
      description: "Capacité à utiliser efficacement les substrats"
    }
  ],
  
  zones: {
    current: { color: "hsl(var(--primary))", label: "Zone actuelle", fill: 0.3 },
    realistic: { color: "hsl(142, 76%, 36%)", label: "Zone cible réaliste", fill: 0.2 },
    ambitious: { color: "hsl(45, 93%, 47%)", label: "Zone ambitieuse", fill: 0.15 },
    improbable: { color: "hsl(0, 84%, 60%)", label: "Zone improbable", fill: 0.1 }
  },
  
  pedagogy: `Le Compass montre l'équilibre entre les 4 piliers de la performance.
Un profil "arrondi" indique un développement harmonieux.
Un profil "pointu" révèle des forces et faiblesses à adresser.`,
  
  limits: [
    "Les axes sont normalisés (0-100), pas des valeurs absolues",
    "La zone cible dépend de l'objectif et du niveau d'ambition",
    "Un score élevé ne garantit pas la performance jour J"
  ]
};

export interface CompassZoneInput {
  ftp: number;
  ftpTarget: number;
  tte: number;
  tteTarget: number;
  fatigue: number; // 0-100
  economyScore: number; // 0-100
  vlamax: number;
  vlamaxOptimal: number;
  objectif: string;
}

export interface CompassZoneResult {
  current: { puissance: number; robustesse: number; economie: number; flexibilite: number };
  realistic: { puissance: number; robustesse: number; economie: number; flexibilite: number };
  ambitious: { puissance: number; robustesse: number; economie: number; flexibilite: number };
  improbable: { puissance: number; robustesse: number; economie: number; flexibilite: number };
}

export function computeCompassZones(input: CompassZoneInput): CompassZoneResult {
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  
  // Calcul des axes actuels
  const puissance = clamp((input.ftp / input.ftpTarget) * (input.tte / input.tteTarget) * 100, 0, 100);
  const robustesse = clamp(100 - input.fatigue, 0, 100);
  const economie = clamp(input.economyScore, 0, 100);
  const vlamaxDelta = Math.abs(input.vlamax - input.vlamaxOptimal);
  const flexibilite = clamp(100 - vlamaxDelta * 150, 0, 100);
  
  // Zones cibles basées sur les valeurs actuelles
  const realisticBoost = 1.10; // +10%
  const ambitiousBoost = 1.20; // +20%
  const improbableBoost = 1.35; // +35%
  
  return {
    current: { puissance, robustesse, economie, flexibilite },
    realistic: {
      puissance: clamp(puissance * realisticBoost, 0, 100),
      robustesse: clamp(robustesse * realisticBoost, 0, 100),
      economie: clamp(economie * realisticBoost, 0, 100),
      flexibilite: clamp(flexibilite * realisticBoost, 0, 100)
    },
    ambitious: {
      puissance: clamp(puissance * ambitiousBoost, 0, 100),
      robustesse: clamp(robustesse * ambitiousBoost, 0, 100),
      economie: clamp(economie * ambitiousBoost, 0, 100),
      flexibilite: clamp(flexibilite * ambitiousBoost, 0, 100)
    },
    improbable: {
      puissance: clamp(puissance * improbableBoost, 0, 100),
      robustesse: clamp(robustesse * improbableBoost, 0, 100),
      economie: clamp(economie * improbableBoost, 0, 100),
      flexibilite: clamp(flexibilite * improbableBoost, 0, 100)
    }
  };
}

// =============================================
// 2️⃣ MATRICE RISQUE PERFORMANCE / BLESSURE
// =============================================

export const RISK_MATRIX_CHART = {
  id: "risk_matrix",
  title: "Matrice Risque Performance / Blessure",
  icon: "⚠️",
  
  axes: {
    x: { label: "Gain Performance Potentiel", range: [0, 100] },
    y: { label: "Risque Blessure", range: [0, 100] }
  },
  
  quadrants: [
    { 
      id: "optimal", 
      label: "Optimal", 
      color: "hsl(142, 76%, 36%)", 
      position: "top-left",
      description: "Gain élevé, risque faible — Continuer sur cette trajectoire"
    },
    { 
      id: "agressif", 
      label: "Agressif", 
      color: "hsl(45, 93%, 47%)", 
      position: "top-right",
      description: "Gain élevé, risque élevé — Surveiller de près, ajuster si nécessaire"
    },
    { 
      id: "conservateur", 
      label: "Conservateur", 
      color: "hsl(210, 80%, 55%)", 
      position: "bottom-left",
      description: "Gain faible, risque faible — Possibilité d'augmenter la charge"
    },
    { 
      id: "dangereux", 
      label: "Dangereux", 
      color: "hsl(0, 84%, 60%)", 
      position: "bottom-right",
      description: "Gain faible, risque élevé — Réduire immédiatement la charge"
    }
  ],
  
  pedagogy: `La matrice positionne l'athlète selon deux axes :
- Horizontal: Potentiel de gain en performance
- Vertical: Niveau de risque blessure

L'objectif est de maximiser le gain tout en minimisant le risque.`,
  
  limits: [
    "Le positionnement est une estimation contextuelle",
    "Le point 'après' représente l'effet prévu des ajustements, pas garanti",
    "Des facteurs externes (sommeil, stress, technique) peuvent modifier le risque réel"
  ]
};

export interface RiskMatrixInput {
  performanceGain: number; // 0-100
  injuryRisk: number; // 0-100
  afterAdjustments?: {
    performanceGain: number;
    injuryRisk: number;
  };
}

export interface RiskMatrixResult {
  before: { x: number; y: number; quadrant: string };
  after?: { x: number; y: number; quadrant: string };
  improvement?: { deltaPerf: number; deltaRisk: number };
}

function getQuadrantId(perfGain: number, risk: number): string {
  const highPerf = perfGain >= 50;
  const highRisk = risk >= 50;
  
  if (highPerf && !highRisk) return "optimal";
  if (highPerf && highRisk) return "agressif";
  if (!highPerf && !highRisk) return "conservateur";
  return "dangereux";
}

export function computeRiskMatrixPosition(input: RiskMatrixInput): RiskMatrixResult {
  const before = {
    x: input.performanceGain,
    y: input.injuryRisk,
    quadrant: getQuadrantId(input.performanceGain, input.injuryRisk)
  };
  
  if (!input.afterAdjustments) {
    return { before };
  }
  
  const after = {
    x: input.afterAdjustments.performanceGain,
    y: input.afterAdjustments.injuryRisk,
    quadrant: getQuadrantId(input.afterAdjustments.performanceGain, input.afterAdjustments.injuryRisk)
  };
  
  return {
    before,
    after,
    improvement: {
      deltaPerf: after.x - before.x,
      deltaRisk: before.y - after.y // Inversion car réduction du risque = amélioration
    }
  };
}

// =============================================
// 3️⃣ ÉVOLUTION VLAMAX / TTE
// =============================================

export const EVOLUTION_CHART = {
  id: "evolution_vlamax_tte",
  title: "Évolution VLamax / TTE",
  icon: "📈",
  
  axes: {
    x: { label: "Timeline", type: "date" },
    y1: { label: "VLamax (mmol/L/s)", color: "#06b6d4", range: [0.20, 0.70] },
    y2: { label: "TTE (min)", color: "#f97316", range: [25, 75] }
  },
  
  features: {
    confidenceBand: { 
      enabled: true, 
      opacity: 0.2,
      description: "Bande de confiance basée sur la qualité des données"
    },
    trend: {
      enabled: true,
      description: "Tendance calculée sur les N derniers points"
    },
    annotations: {
      tests: { enabled: true, icon: "🧪", label: "Test labo" },
      races: { enabled: true, icon: "🏁", label: "Compétition" }
    }
  },
  
  pedagogy: `Ce graphique montre l'évolution des deux métriques clés :
- VLamax (cyan): Capacité glycolytique — tendance à la baisse = profil plus endurant
- TTE (orange): Durabilité au seuil — tendance à la hausse = meilleure résistance

La bande de confiance aide à distinguer l'adaptation réelle du bruit de mesure.`,
  
  interpretation: {
    vlamaxDown_tteUp: "Évolution positive vers un profil endurant",
    vlamaxDown_tteFlat: "Amélioration VLamax sans gain de durabilité — vérifier le volume",
    vlamaxFlat_tteUp: "Durabilité en hausse — le seuil tient mieux",
    vlamaxUp_tteDown: "⚠️ Régression — vérifier fatigue, surentraînement, maladie"
  },
  
  limits: [
    "Les variations < ±0.03 (VLamax) et ±3 min (TTE) peuvent être du bruit",
    "La tendance nécessite au moins 4 points sur 6-8 semaines",
    "Les valeurs estimées (confiance < 0.7) sont moins fiables pour l'évolution"
  ]
};

export interface EvolutionDataPoint {
  date: string;
  vlamax: number | null;
  vlamaxConfidence?: number;
  tte: number | null;
  tteConfidence?: number;
  source: "snapshot" | "test" | "estimate";
  annotation?: string;
}

export interface EvolutionChartResult {
  data: EvolutionDataPoint[];
  trend: {
    vlamax: "down" | "stable" | "up" | "insufficient";
    tte: "up" | "stable" | "down" | "insufficient";
    interpretation: string;
  };
  confidenceBands: {
    vlamax: { upper: number; lower: number };
    tte: { upper: number; lower: number };
  };
}

export function computeEvolutionTrend(data: EvolutionDataPoint[]): EvolutionChartResult["trend"] {
  const vlamaxValues = data.filter(d => d.vlamax !== null).map(d => d.vlamax!);
  const tteValues = data.filter(d => d.tte !== null).map(d => d.tte!);
  
  const getTrend = (values: number[], threshold: number): "up" | "stable" | "down" | "insufficient" => {
    if (values.length < 4) return "insufficient";
    const first = values.slice(0, Math.ceil(values.length / 2));
    const last = values.slice(Math.floor(values.length / 2));
    const avgFirst = first.reduce((a, b) => a + b, 0) / first.length;
    const avgLast = last.reduce((a, b) => a + b, 0) / last.length;
    const delta = avgLast - avgFirst;
    if (delta > threshold) return "up";
    if (delta < -threshold) return "down";
    return "stable";
  };
  
  const vlamaxTrend = getTrend(vlamaxValues, 0.03);
  const tteTrend = getTrend(tteValues, 3);
  
  let interpretation = "";
  if (vlamaxTrend === "down" && tteTrend === "up") {
    interpretation = EVOLUTION_CHART.interpretation.vlamaxDown_tteUp;
  } else if (vlamaxTrend === "down" && (tteTrend === "stable" || tteTrend === "insufficient")) {
    interpretation = EVOLUTION_CHART.interpretation.vlamaxDown_tteFlat;
  } else if ((vlamaxTrend === "stable" || vlamaxTrend === "insufficient") && tteTrend === "up") {
    interpretation = EVOLUTION_CHART.interpretation.vlamaxFlat_tteUp;
  } else if (vlamaxTrend === "up" && tteTrend === "down") {
    interpretation = EVOLUTION_CHART.interpretation.vlamaxUp_tteDown;
  } else {
    interpretation = "Tendance stable ou données insuffisantes pour conclure.";
  }
  
  return { vlamax: vlamaxTrend, tte: tteTrend, interpretation };
}

// =============================================
// 4️⃣ CADENCE & PROFIL MÉTABOLIQUE (VÉLO)
// =============================================

export const CADENCE_PROFILE_CHART = {
  id: "cadence_profile",
  title: "Cadence & Profil Métabolique",
  icon: "🚴",
  sport: "velo",
  
  axes: {
    x: { label: "Cadence Seuil (RPM)", range: [70, 110] },
    y: { label: "VLamax", range: [0.20, 0.70] }
  },
  
  zones: [
    { 
      id: "force_aerobic", 
      label: "Force + Aérobie", 
      cadence: [70, 85], 
      vlamax: [0.20, 0.40],
      color: "hsl(210, 80%, 55%)",
      description: "Profil très endurant, travail en force possible"
    },
    { 
      id: "balanced", 
      label: "Équilibré", 
      cadence: [80, 95], 
      vlamax: [0.35, 0.55],
      color: "hsl(142, 76%, 36%)",
      description: "Profil polyvalent, cadence standard"
    },
    { 
      id: "spin_glyco", 
      label: "Vélocité + Glyco", 
      cadence: [90, 110], 
      vlamax: [0.45, 0.70],
      color: "hsl(45, 93%, 47%)",
      description: "Profil puissance, travail vélocité naturel"
    }
  ],
  
  keyMessage: "Cadence élevée ≠ profil aérobie",
  
  pedagogy: `Ce graphique croise la cadence préférée au seuil avec le profil VLamax.
Il aide à comprendre si l'athlète utilise sa cadence de manière cohérente avec son profil.

Points clés :
- Une VLamax basse avec cadence élevée peut indiquer une inefficacité
- Une VLamax haute avec cadence basse peut limiter l'expression de la puissance
- Le profil optimal dépend de l'objectif (CLM, montagne, sprint)`,
  
  limits: [
    "La cadence seuil peut varier selon le terrain et la fatigue",
    "Le graphique ne prend pas en compte la puissance absolue",
    "La relation cadence/VLamax n'est pas déterministe"
  ]
};

export interface CadenceProfileInput {
  cadenceSeuil: number; // RPM
  vlamax: number;
  objectif?: string;
}

export interface CadenceProfileResult {
  position: { x: number; y: number };
  zone: string;
  zoneLabel: string;
  color: string;
  message: string;
  recommendations: string[];
}

export function computeCadenceProfilePosition(input: CadenceProfileInput): CadenceProfileResult {
  const { cadenceSeuil, vlamax, objectif = "IM" } = input;
  
  // Déterminer la zone
  let zone = "balanced";
  let zoneLabel = "Équilibré";
  let color = "hsl(142, 76%, 36%)";
  let message = "";
  const recommendations: string[] = [];
  
  // Force + Aérobie
  if (cadenceSeuil < 85 && vlamax < 0.40) {
    zone = "force_aerobic";
    zoneLabel = "Force + Aérobie";
    color = "hsl(210, 80%, 55%)";
    message = "Profil très endurant avec préférence force. Idéal pour CLM long et montagne.";
    if (objectif.includes("IM")) {
      recommendations.push("Profil adapté à l'Ironman, conserver les séances force");
    }
  }
  // Spin + Glyco
  else if (cadenceSeuil > 95 && vlamax > 0.50) {
    zone = "spin_glyco";
    zoneLabel = "Vélocité + Glycolytique";
    color = "hsl(45, 93%, 47%)";
    message = "Profil explosif avec vélocité naturelle. Attention à l'endurance longue.";
    if (objectif.includes("IM") || objectif.includes("703")) {
      recommendations.push("Travailler l'abaissement VLamax via endurance longue");
      recommendations.push("Possibilité de baisser légèrement la cadence pour économie");
    }
  }
  // Mismatch: VLamax basse + cadence haute
  else if (cadenceSeuil > 95 && vlamax < 0.40) {
    zone = "mismatch_high_spin";
    zoneLabel = "Cadence élevée / Profil aérobie";
    color = "hsl(270, 70%, 60%)";
    message = "Cadence élevée pour un profil très aérobie — vérifier l'économie.";
    recommendations.push("Tester une cadence légèrement plus basse pour l'efficacité");
    recommendations.push("Surveiller la dérive cardiaque sur efforts longs");
  }
  // Mismatch: VLamax haute + cadence basse
  else if (cadenceSeuil < 80 && vlamax > 0.50) {
    zone = "mismatch_low_spin";
    zoneLabel = "Cadence basse / Profil glyco";
    color = "hsl(0, 84%, 60%)";
    message = "Cadence basse pour un profil glycolytique — risque de fatigue musculaire.";
    recommendations.push("Augmenter progressivement la cadence vers 85-90 RPM");
    recommendations.push("Attention au risque blessure sur efforts longs");
  }
  // Zone équilibrée
  else {
    message = "Profil équilibré, cadence cohérente avec le profil métabolique.";
    recommendations.push("Ajuster selon l'objectif: plus de force (montagne) ou vélocité (CLM)");
  }
  
  return {
    position: { x: cadenceSeuil, y: vlamax },
    zone,
    zoneLabel,
    color,
    message,
    recommendations
  };
}

// =============================================
// GARDE-FOUS & DISCLAIMERS
// =============================================

export const CHART_DISCLAIMERS = {
  global: "Représentation modélisée — ne remplace pas une mesure directe.",
  compass: "Les axes sont normalisés et contextualisés selon l'objectif.",
  riskMatrix: "Le positionnement est une estimation contextuelle, pas un diagnostic.",
  evolution: "Les variations mineures peuvent être du bruit de mesure.",
  cadence: "La relation cadence/VLamax n'est pas déterministe."
};

// =============================================
// ACADEMY MODULES
// =============================================

export const ACADEMY_CHARTS_MODULES = [
  {
    id: "compass_reading",
    title: "Lire le Metabolic Performance Compass™",
    content: {
      shows: [
        "Équilibre entre les 4 piliers de la performance",
        "Forces et faiblesses du profil actuel",
        "Zones cibles selon l'objectif et l'ambition"
      ],
      doesNotShow: [
        "La performance jour J garantie",
        "Un classement entre athlètes",
        "Des valeurs absolues (tout est normalisé 0-100)"
      ],
      decisionHelp: [
        "Prioriser le pilier le plus faible",
        "Viser d'abord la zone réaliste avant l'ambitieuse",
        "Un profil équilibré est souvent préférable à un profil pointu"
      ]
    }
  },
  {
    id: "risk_matrix_reading",
    title: "Utiliser la Matrice Risque / Performance",
    content: {
      shows: [
        "Position actuelle dans l'espace risque/gain",
        "Effet attendu des ajustements proposés",
        "Quadrant de classification (optimal, agressif, conservateur, dangereux)"
      ],
      doesNotShow: [
        "Une prédiction de blessure",
        "Une mesure absolue du risque",
        "Les facteurs externes (technique, équipement, terrain)"
      ],
      decisionHelp: [
        "Objectif: rester ou aller vers le quadrant Optimal",
        "Si Agressif: surveiller de près, réduire si fatigue monte",
        "Si Dangereux: réduire immédiatement la charge"
      ]
    }
  },
  {
    id: "evolution_reading",
    title: "Interpréter l'Évolution VLamax / TTE",
    content: {
      shows: [
        "Tendance sur plusieurs semaines/mois",
        "Distinction entre adaptation réelle et bruit",
        "Corrélation entre les deux métriques"
      ],
      doesNotShow: [
        "Les causes des variations (entraînement, vie)",
        "La valeur optimale universelle",
        "Une prédiction future"
      ],
      decisionHelp: [
        "VLamax ↓ + TTE ↑ = évolution positive vers l'endurance",
        "VLamax ↑ + TTE ↓ = signal d'alerte, vérifier fatigue/maladie",
        "Ignorer les variations < ±0.03 VLamax et ±3 min TTE"
      ]
    }
  },
  {
    id: "cadence_reading",
    title: "Analyser le Profil Cadence / VLamax",
    content: {
      shows: [
        "Cohérence entre cadence préférée et profil métabolique",
        "Zones de référence pour différents objectifs",
        "Potentiels d'optimisation"
      ],
      doesNotShow: [
        "La cadence 'parfaite' pour tous",
        "L'impact sur la puissance absolue",
        "Les contraintes biomécaniques individuelles"
      ],
      decisionHelp: [
        "Cadence élevée ≠ profil aérobie",
        "Un mismatch n'est pas forcément à corriger si l'athlète est efficace",
        "Tester les changements de cadence sur blocs dédiés"
      ]
    }
  }
];

// =============================================
// PDF EXPORT SECTION
// =============================================

export const PDF_CHARTS_SECTION = {
  title: "Graphiques Signature TFCL™",
  
  compassSection: {
    title: "Metabolic Performance Compass™",
    interpretation: "Analyse des 4 piliers avec zones cibles",
    methodNote: "Axes normalisés 0-100, adaptés à l'objectif et au niveau d'ambition"
  },
  
  riskMatrixSection: {
    title: "Matrice Risque / Performance",
    interpretation: "Position actuelle et effet des ajustements",
    methodNote: "Estimation contextuelle, pas un diagnostic médical"
  },
  
  evolutionSection: {
    title: "Évolution VLamax & TTE",
    interpretation: "Tendance sur la période analysée",
    methodNote: "Variations < ±0.03 VLamax et ±3 min TTE = bruit potentiel"
  },
  
  cadenceSection: {
    title: "Profil Cadence / VLamax",
    interpretation: "Cohérence cadence seuil vs profil métabolique",
    methodNote: "Relation non déterministe, à croiser avec l'efficacité mesurée"
  },
  
  legalDisclaimer: "Les graphiques sont des représentations modélisées. Ils éclairent la décision, ils ne la remplacent pas."
};

// =============================================
// CHATBOT ALIGNMENT
// =============================================

export const CHARTS_CHATBOT_QA = [
  {
    question: "Comment lire le Metabolic Performance Compass ?",
    answer: `Le Compass affiche 4 axes normalisés (0-100):
1. Puissance Durable — FTP × TTE
2. Robustesse — inverse de la fatigue
3. Économie — score d'efficacité
4. Flexibilité Métabolique — écart à la VLamax optimale

Vise un profil équilibré et progresse vers la zone réaliste avant l'ambitieuse.`
  },
  {
    question: "Que signifient les quadrants de la matrice risque/performance ?",
    answer: `Les 4 quadrants:
- Optimal: Gain élevé, risque faible — Continuer
- Agressif: Gain élevé, risque élevé — Surveiller de près
- Conservateur: Gain faible, risque faible — Possibilité d'augmenter
- Dangereux: Gain faible, risque élevé — Réduire immédiatement

L'objectif est de rester ou aller vers Optimal.`
  },
  {
    question: "Comment interpréter l'évolution VLamax/TTE ?",
    answer: `Tendances positives:
- VLamax ↓ + TTE ↑ = profil plus endurant
- VLamax stable + TTE ↑ = meilleure durabilité

Signaux d'alerte:
- VLamax ↑ + TTE ↓ = possible surmenage

Ignore les variations < ±0.03 VLamax et ±3 min TTE.`
  },
  {
    question: "Cadence élevée = profil aérobie ?",
    answer: `Non, c'est un mythe courant.
Le graphique Cadence/VLamax montre que la relation n'est pas directe.

Un athlète avec VLamax basse (aérobie) peut pédaler à cadence basse ou haute.
La cadence optimale dépend de l'objectif (CLM, montagne, sprint) et de l'efficacité individuelle.`
  }
];
