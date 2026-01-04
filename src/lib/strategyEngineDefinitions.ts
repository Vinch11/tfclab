// =============================================
// TWO 4 COACHING STRATEGY ENGINE — DÉFINITIONS
// Moteur d'analyse physiologique âge-dépendant
// Inspiré des principes de Dan Lorang
// =============================================

import { ObjectifType } from "@/types/athlete";

// =============================================
// DÉFINITION OFFICIELLE DU MOTEUR
// =============================================

export const STRATEGY_ENGINE_DEFINITION = {
  name: "Two 4 Coaching Strategy Engine – Age aware",
  subtitle: "Moteur d'analyse physiologique contextuel",
  
  definition: `Le Two 4 Coaching Strategy Engine est un moteur d'analyse physiologique inspiré des principes de Dan Lorang.

Il ne génère pas de plan d'entraînement.
Il structure la lecture des données pour aider le coach à prendre de meilleures décisions, au bon moment de la saison.

Il repose sur l'interaction entre :
• VLamax (profil glycolytique)
• TTE (durabilité métabolique)
• Charge récente
• Objectif de course
• Âge physiologique`,

  levers: [
    {
      id: "vlamax",
      emoji: "🔹",
      title: "VLamax → \"Type de moteur\"",
      description: "Indique la dominance glycolytique",
      impact: "Oriente la stratégie carburant / économie",
    },
    {
      id: "tte",
      emoji: "🔹",
      title: "TTE → \"Capacité à durer\"",
      description: "Indique la soutenabilité de la puissance",
      impact: "Sert de référence centrale (avant VO₂max)",
    },
    {
      id: "objectif",
      emoji: "🔹",
      title: "Objectif → \"Contraintes réelles\"",
      description: "Chaque objectif a ses exigences propres",
      impact: "Ironman ≠ Marathon ≠ 70.3 ≠ Sprint",
    },
  ],
  
  ageIntegration: {
    principle: "À valeurs physiologiques identiques, l'interprétation change avec l'âge.",
    note: "L'âge est un modulateur stratégique, jamais une pénalité.",
  },
  
  tteVsVo2max: {
    title: "Pourquoi le TTE est central",
    explanation: `La VO₂max représente un potentiel maximal.
Le TTE représente la capacité à utiliser ce potentiel longtemps.

En endurance réelle, c'est le TTE qui limite la performance, pas la VO₂max.`,
  },
  
  scientificPositioning: {
    title: "Two For Coaching Lab n'est pas une boîte noire",
    content: `Chaque recommandation est traçable :
• Quelle donnée
• Quel levier
• Quelle logique physiologique`,
  },
  
  raceReadinessFormula: {
    title: "Race Readiness",
    components: [
      "Cohérence VLamax ↔ objectif",
      "Suffisance TTE ↔ distance",
      "Charge compatible ↔ âge",
      "Risque nutritionnel ↔ VLamax + âge",
    ],
    message: "Ce score reflète votre état de préparation physiologique dans le contexte de votre âge et de votre objectif.",
  },
};

// =============================================
// PHASES PHYSIOLOGIQUES DE LA SAISON
// =============================================

export interface SeasonPhase {
  id: 1 | 2 | 3;
  name: string;
  shortName: string;
  priorityFocus: string;
  vlamaxNote: string;
  tteNote: string;
  nutritionNote: string;
  trainingFocus: string;
  risks: string[];
  color: string;
  bgColor: string;
  iconEmoji: string;
}

export const SEASON_PHASES: SeasonPhase[] = [
  {
    id: 1,
    name: "Construction du potentiel",
    shortName: "Potentiel",
    priorityFocus: "VO₂max / Vitesse",
    vlamaxNote: "Risque glycolytique accepté",
    tteNote: "Secondaire",
    nutritionNote: "Standard",
    trainingFocus: "Développer la cylindrée maximale",
    risks: ["Fatigue nerveuse si mal dosé", "VLamax qui monte trop"],
    color: "text-blue-600",
    bgColor: "bg-blue-500/10 border-blue-500/30",
    iconEmoji: "🚀",
  },
  {
    id: 2,
    name: "Conversion métabolique",
    shortName: "Conversion",
    priorityFocus: "Baisse VLamax",
    vlamaxNote: "Réduction active",
    tteNote: "En construction",
    nutritionNote: "Début d'optimisation",
    trainingFocus: "Force endurance, économie",
    risks: ["Sous-estimation de la charge métabolique", "Plateau si volume insuffisant"],
    color: "text-amber-600",
    bgColor: "bg-amber-500/10 border-amber-500/30",
    iconEmoji: "🔄",
  },
  {
    id: 3,
    name: "Spécifique course",
    shortName: "Spécifique",
    priorityFocus: "TTE + Nutrition",
    vlamaxNote: "Doit être compatible objectif",
    tteNote: "Critique",
    nutritionNote: "Centrale (g/h, tolérance)",
    trainingFocus: "Minimisation du stress inutile",
    risks: ["Dérive métabolique", "Déplétion glucidique"],
    color: "text-orange-600",
    bgColor: "bg-orange-500/10 border-orange-500/30",
    iconEmoji: "🎯",
  },
];

// =============================================
// ADAPTATIONS PAR TRANCHE D'ÂGE
// =============================================

export interface AgeAdaptation {
  range: string;
  label: string;
  category: "young" | "prime" | "master1" | "master2";
  toleranceShock: string;
  vlamaxInterpretation: string;
  priorities: string[];
  blocIntense: string;
  nutritionCritical: boolean;
  freshnessFirst: boolean;
  raceReadinessModifiers: {
    riskLevel: "standard" | "elevated" | "high" | "critical";
    freshnessWeight: number; // 1.0 à 1.5
    nutritionWeight: number; // 1.0 à 1.3
  };
}

export const AGE_ADAPTATIONS: AgeAdaptation[] = [
  {
    range: "< 30 ans",
    label: "Athlète jeune",
    category: "young",
    toleranceShock: "Forte tolérance aux chocs",
    vlamaxInterpretation: "VLamax élevé exploitable",
    priorities: ["Potentiel maximal", "Volume progressif", "Bloc intensif acceptable"],
    blocIntense: "Acceptable",
    nutritionCritical: false,
    freshnessFirst: false,
    raceReadinessModifiers: {
      riskLevel: "standard",
      freshnessWeight: 1.0,
      nutritionWeight: 1.0,
    },
  },
  {
    range: "30–40 ans",
    label: "Athlète confirmé",
    category: "prime",
    toleranceShock: "Équilibre potentiel/durabilité",
    vlamaxInterpretation: "VLamax surveillé",
    priorities: ["TTE devient prioritaire", "Récupération plus structurée", "Intensité ciblée"],
    blocIntense: "Modéré",
    nutritionCritical: false,
    freshnessFirst: false,
    raceReadinessModifiers: {
      riskLevel: "elevated",
      freshnessWeight: 1.1,
      nutritionWeight: 1.1,
    },
  },
  {
    range: "40–50 ans",
    label: "Master",
    category: "master1",
    toleranceShock: "Durabilité > puissance",
    vlamaxInterpretation: "VLamax élevé = risque",
    priorities: ["Durabilité absolue", "Économie métabolique", "Nutrition critique"],
    blocIntense: "Limité",
    nutritionCritical: true,
    freshnessFirst: false,
    raceReadinessModifiers: {
      riskLevel: "high",
      freshnessWeight: 1.25,
      nutritionWeight: 1.2,
    },
  },
  {
    range: "≥ 50 ans",
    label: "Master 2",
    category: "master2",
    toleranceShock: "Économie + stabilité métabolique",
    vlamaxInterpretation: "VLamax bas recherché",
    priorities: ["Fraîcheur prioritaire", "Économie maximale", "Stabilité métabolique"],
    blocIntense: "Éviter",
    nutritionCritical: true,
    freshnessFirst: true,
    raceReadinessModifiers: {
      riskLevel: "critical",
      freshnessWeight: 1.5,
      nutritionWeight: 1.3,
    },
  },
];

// =============================================
// HELPERS
// =============================================

export function getAgeAdaptation(age: number | null): AgeAdaptation {
  if (age === null || age < 0) {
    return AGE_ADAPTATIONS[1]; // Default to prime (30-40)
  }
  if (age < 30) return AGE_ADAPTATIONS[0];
  if (age < 40) return AGE_ADAPTATIONS[1];
  if (age < 50) return AGE_ADAPTATIONS[2];
  return AGE_ADAPTATIONS[3];
}

export function determinePhase(
  vlamax: number | null,
  tte: number | null,
  tteTarget: number,
  readinessScore: number,
  objectif: ObjectifType
): { phase: SeasonPhase; confidence: "faible" | "modéré" | "élevé"; reasons: string[] } {
  const reasons: string[] = [];
  let confidence: "faible" | "modéré" | "élevé" = "modéré";
  
  if (vlamax === null || tte === null) {
    return {
      phase: SEASON_PHASES[0],
      confidence: "faible",
      reasons: ["Données insuffisantes pour déterminer la phase"],
    };
  }
  
  const isLongDistance = ["IM", "703", "70.3", "Half", "Marathon", "TrailLong", "TrailUltra", "TrailMountain"].includes(objectif);
  
  // Phase 1: Potentiel (VLamax élevé, TTE pas encore construit)
  if (vlamax > 0.50 && tte < tteTarget * 0.7) {
    reasons.push("VLamax élevé (> 0.50) indique une phase de développement");
    reasons.push("TTE encore loin de la cible");
    confidence = "élevé";
    return { phase: SEASON_PHASES[0], confidence, reasons };
  }
  
  // Phase 2: Conversion (VLamax en baisse, TTE en construction)
  if (vlamax > 0.35 && vlamax <= 0.50 && tte < tteTarget * 0.9) {
    reasons.push("VLamax en zone de conversion (0.35-0.50)");
    reasons.push("TTE en progression mais pas encore atteint");
    confidence = "élevé";
    return { phase: SEASON_PHASES[1], confidence, reasons };
  }
  
  // Phase 3: Spécifique (VLamax compatible, TTE proche cible)
  if (vlamax <= 0.40 && tte >= tteTarget * 0.85) {
    reasons.push("VLamax compatible avec l'objectif longue distance");
    reasons.push("TTE proche ou supérieur à la cible");
    if (isLongDistance && vlamax > 0.40) {
      reasons.push("⚠️ VLamax encore limite pour objectif très long");
      confidence = "modéré";
    } else {
      confidence = "élevé";
    }
    return { phase: SEASON_PHASES[2], confidence, reasons };
  }
  
  // Default: Phase 2
  reasons.push("Profil intermédiaire — phase de conversion probable");
  return { phase: SEASON_PHASES[1], confidence, reasons };
}

/**
 * Retourne le modificateur Race Readiness selon l'âge
 */
export function getAgeRaceReadinessModifier(age: number | null): {
  riskLabel: string;
  freshnessEmphasis: string;
  nutritionEmphasis: string;
  staffMessage: string;
} {
  const adaptation = getAgeAdaptation(age);
  
  const riskLabels: Record<string, string> = {
    standard: "Standard",
    elevated: "Élevé",
    high: "Haut",
    critical: "Critique",
  };
  
  return {
    riskLabel: riskLabels[adaptation.raceReadinessModifiers.riskLevel],
    freshnessEmphasis: adaptation.freshnessFirst 
      ? "Priorité absolue à la fraîcheur" 
      : adaptation.raceReadinessModifiers.freshnessWeight > 1.1 
        ? "Fraîcheur prioritaire" 
        : "Standard",
    nutritionEmphasis: adaptation.nutritionCritical 
      ? "Nutrition critique — risque accru" 
      : "Standard",
    staffMessage: `À niveau de préparation égal, l'âge modifie la tolérance au stress métabolique. Les recommandations sont ajustées en conséquence.`,
  };
}
