/**
 * TFCL Cluster Selector - Auto Cluster Selection V2
 * Two For Coaching Lab Method™
 * 
 * Sélection automatique du cluster de référence le plus pertinent
 * basée sur l'objectif, le sport, le sexe et le VO2max.
 * 
 * IMPORTANT: Le cluster sert uniquement de référentiel comparatif.
 * Il ne "classe" pas l'athlète.
 */

// =============================================
// TYPES
// =============================================

export type SportReference = "triathlon" | "running" | "cycling";

export type InferredLevel = 
  | "PRO" 
  | "ELITE"
  | "AG_PERF" 
  | "PERF"
  | "AMATEUR" 
  | "DEBUTANT" 
  | "UNKNOWN";

export interface ClusterSelectionEnvelope {
  sportRef: SportReference;
  clusterId: string;
  clusterLabel: string;
  inferredLevel: InferredLevel;
  confidence: number;
  rationale: string[];
  warnings: string[];
}

export interface ClusterSelectorInput {
  objectif: string;
  sex?: "H" | "F";
  vo2max?: number;
  vlamax?: number;
  sportFocus?: "bike" | "run" | "swim" | "all";
  forceCluster?: string;
  // Nouveau: ambition explicite de l'athlète
  ambitionLevel?: "finisher" | "performance" | "podium" | "elite";
  // Nouveau: temps cible (pour running)
  targetTime?: string; // ex: "sub3", "sub330", "sub4"
}

// =============================================
// CONSTANTS - VO2MAX THRESHOLDS
// =============================================

const VO2_THRESHOLDS = {
  triathlon: {
    H: { PRO: 75, AG_PERF: 62, AMATEUR: 50 },
    F: { PRO: 68, AG_PERF: 55, AMATEUR: 45 },
  },
  running: {
    H: { ELITE: 75, PERF: 62, AMATEUR: 50 },
    F: { ELITE: 65, PERF: 55, AMATEUR: 42 },
  },
  cycling: {
    H: { PRO: 70, PERF: 58, AMATEUR: 45 },
    F: { PRO: 60, PERF: 50, AMATEUR: 38 },
  },
};

// =============================================
// CLUSTER MAPPINGS
// =============================================

const TRIATHLON_CLUSTERS = {
  long: {
    PRO: "Pro_Long",
    AG_PERF: "AG_Perf_Long",
    AMATEUR: "AG_Finisher",
    DEBUTANT: "AG_Finisher",
    UNKNOWN: "AG_Perf_Long",
  },
  short: {
    PRO: "Pro_Short",
    AG_PERF: "AG_Sprint",
    AMATEUR: "AG_Sprint",
    DEBUTANT: "AG_Finisher",
    UNKNOWN: "AG_Sprint",
  },
};

const RUNNING_CLUSTERS = {
  marathon: {
    ELITE: "Elite_Marathon",
    PRO: "Elite_Marathon",
    PERF: "Sub3_Marathon",
    AG_PERF: "Sub3_Marathon",
    AMATEUR: "Sub330_Marathon",
    DEBUTANT: "Finisher_Marathon",
    UNKNOWN: "Sub330_Marathon",
  },
  semi: {
    ELITE: "Sub3_Marathon",
    PRO: "Sub3_Marathon",
    PERF: "Sub3_Marathon",
    AG_PERF: "Sub3_Marathon",
    AMATEUR: "Sub330_Marathon",
    DEBUTANT: "Finisher_Marathon",
    UNKNOWN: "Sub330_Marathon",
  },
  "10k": {
    ELITE: "Elite_5K10K",
    PRO: "Elite_5K10K",
    PERF: "Elite_5K10K",
    AG_PERF: "Elite_5K10K",
    AMATEUR: "Sub330_Marathon",
    DEBUTANT: "Finisher_Marathon",
    UNKNOWN: "Elite_5K10K",
  },
  trail: {
    ELITE: "Ultra_Trail",
    PRO: "Ultra_Trail",
    PERF: "Ultra_Trail",
    AG_PERF: "Ultra_Trail",
    AMATEUR: "Ultra_Trail",
    DEBUTANT: "Finisher_Marathon",
    UNKNOWN: "Ultra_Trail",
  },
};

const CYCLING_CLUSTERS = {
  default: {
    PRO: "Elite_Road",
    PERF: "Amateur_Perf",
    AG_PERF: "Amateur_Perf",
    AMATEUR: "Amateur_Loisir",
    DEBUTANT: "Amateur_Loisir",
    UNKNOWN: "Amateur_Perf",
  },
  sprint: {
    PRO: "Track_Sprint",
    PERF: "Track_Sprint",
    AMATEUR: "Amateur_Perf",
    DEBUTANT: "Amateur_Loisir",
    UNKNOWN: "Amateur_Perf",
  },
};

const CLUSTER_LABELS: Record<string, string> = {
  // Triathlon
  Pro_Long: "Triathlète Pro Long Distance",
  AG_Perf_Long: "Age Grouper Performance Long",
  Pro_Short: "Triathlète Pro Short Distance",
  AG_Sprint: "Age Grouper Sprint/Olympique",
  AG_Finisher: "Age Grouper Finisher",
  
  // Running
  Elite_Marathon: "Marathonien Élite",
  Sub3_Marathon: "Marathon Sub 3h",
  Sub330_Marathon: "Marathon Sub 3h30",
  Finisher_Marathon: "Marathonien Finisher",
  Elite_5K10K: "Coureur Élite 5K/10K",
  Ultra_Trail: "Ultra-Traileur",
  
  // Cycling
  Elite_Road: "Cycliste Route Élite",
  Amateur_Perf: "Cycliste Amateur Performance",
  Amateur_Loisir: "Cycliste Loisir",
  Track_Sprint: "Pistard Sprint",
};

// =============================================
// CORE FUNCTIONS
// =============================================

/**
 * Sélectionne le sport de référence basé sur l'objectif
 */
export function selectReferenceSport(
  objectif: string,
  sportFocus?: "bike" | "run" | "swim" | "all"
): SportReference {
  const obj = objectif.toLowerCase();
  
  // Triathlon keywords
  if (obj.includes("im") || obj.includes("ironman") || obj.includes("703") || 
      obj.includes("70.3") || obj.includes("triathlon") || obj.includes("od") ||
      obj.includes("sprint tri") || obj.includes("olympique")) {
    return "triathlon";
  }
  
  // Running keywords
  if (obj.includes("marathon") || obj.includes("semi") || obj.includes("10k") ||
      obj.includes("5k") || obj.includes("trail") || obj.includes("ultra") ||
      obj.includes("course") || obj.includes("running")) {
    return "running";
  }
  
  // Cycling keywords
  if (obj.includes("cycl") || obj.includes("vélo") || obj.includes("bike") ||
      obj.includes("clm") || obj.includes("gravel") || obj.includes("route")) {
    return "cycling";
  }
  
  // Fallback based on sportFocus
  if (sportFocus === "bike") return "cycling";
  if (sportFocus === "run") return "running";
  
  // Default to triathlon (most comprehensive)
  return "triathlon";
}

/**
 * Infère le niveau de l'athlète basé sur VO2max ET l'ambition déclarée
 * L'ambition a priorité si elle est explicitement déclarée
 */
export function inferLevelByVo2(
  sex: "H" | "F" | undefined,
  sportRef: SportReference,
  vo2max: number | undefined,
  ambitionLevel?: "finisher" | "performance" | "podium" | "elite"
): InferredLevel {
  // Si ambition explicitement déclarée, l'utiliser comme guide principal
  if (ambitionLevel) {
    switch (ambitionLevel) {
      case "elite": return sportRef === "running" ? "ELITE" : "PRO";
      case "podium": return sportRef === "triathlon" ? "AG_PERF" : "PERF";
      case "performance": return sportRef === "triathlon" ? "AG_PERF" : "PERF";
      case "finisher": return "AMATEUR";
    }
  }
  
  if (!vo2max || vo2max <= 0) {
    return "UNKNOWN";
  }
  
  const sexKey = sex || "H"; // Default to male thresholds if unknown
  const thresholds = VO2_THRESHOLDS[sportRef][sexKey];
  
  if (sportRef === "triathlon") {
    const t = thresholds as { PRO: number; AG_PERF: number; AMATEUR: number };
    if (vo2max >= t.PRO) return "PRO";
    if (vo2max >= t.AG_PERF) return "AG_PERF";
    if (vo2max >= t.AMATEUR) return "AMATEUR";
    return "DEBUTANT";
  }
  
  if (sportRef === "running") {
    const t = thresholds as { ELITE: number; PERF: number; AMATEUR: number };
    if (vo2max >= t.ELITE) return "ELITE";
    if (vo2max >= t.PERF) return "PERF";
    if (vo2max >= t.AMATEUR) return "AMATEUR";
    return "DEBUTANT";
  }
  
  if (sportRef === "cycling") {
    const t = thresholds as { PRO: number; PERF: number; AMATEUR: number };
    if (vo2max >= t.PRO) return "PRO";
    if (vo2max >= t.PERF) return "PERF";
    if (vo2max >= t.AMATEUR) return "AMATEUR";
    return "DEBUTANT";
  }
  
  return "UNKNOWN";
}

/**
 * Explique pourquoi ce niveau a été choisi
 */
export function explainLevelInference(
  sex: "H" | "F" | undefined,
  sportRef: SportReference,
  vo2max: number | undefined,
  ambitionLevel?: "finisher" | "performance" | "podium" | "elite"
): string {
  if (ambitionLevel) {
    return `Niveau basé sur l'ambition déclarée: "${ambitionLevel}"`;
  }
  
  if (!vo2max) {
    return "VO2max non renseigné → niveau par défaut (conservateur)";
  }
  
  const sexKey = sex || "H";
  const thresholds = VO2_THRESHOLDS[sportRef][sexKey];
  const gender = sex === "F" ? "femme" : "homme";
  
  return `VO2max = ${vo2max.toFixed(1)} ml/kg/min (${gender}) → seuils ${sportRef}`;
}

/**
 * Détermine la catégorie de distance pour l'objectif
 */
function getDistanceCategory(objectif: string): "long" | "short" | "marathon" | "semi" | "10k" | "trail" | "default" | "sprint" {
  const obj = objectif.toLowerCase();
  
  // Triathlon
  if (obj.includes("im") || obj.includes("ironman") || obj.includes("703") || obj.includes("70.3")) {
    return "long";
  }
  if (obj.includes("sprint") || obj.includes("od") || obj.includes("olympique")) {
    return "short";
  }
  
  // Running
  if (obj.includes("marathon") && !obj.includes("semi")) {
    return "marathon";
  }
  if (obj.includes("semi") || obj.includes("half")) {
    return "semi";
  }
  if (obj.includes("10k") || obj.includes("5k")) {
    return "10k";
  }
  if (obj.includes("trail") || obj.includes("ultra")) {
    return "trail";
  }
  
  // Cycling
  if (obj.includes("sprint") || obj.includes("piste")) {
    return "sprint";
  }
  
  return "default";
}

/**
 * Sélectionne le cluster approprié
 */
export function selectCluster(
  objectif: string,
  sex: "H" | "F" | undefined,
  sportRef: SportReference,
  inferredLevel: InferredLevel,
  vlamax?: number
): string {
  const category = getDistanceCategory(objectif);
  const level = inferredLevel === "UNKNOWN" ? "AMATEUR" : inferredLevel;
  
  // Special case for cycling with VLamax data
  if (sportRef === "cycling" && vlamax !== undefined) {
    if (vlamax > 0.75) {
      return inferredLevel === "PRO" || inferredLevel === "ELITE" ? "Track_Sprint" : "Amateur_Perf";
    }
  }
  
  if (sportRef === "triathlon") {
    const clusters = category === "short" ? TRIATHLON_CLUSTERS.short : TRIATHLON_CLUSTERS.long;
    return clusters[level as keyof typeof clusters] || "AG_Perf_Long";
  }
  
  if (sportRef === "running") {
    const clusterMap = RUNNING_CLUSTERS[category as keyof typeof RUNNING_CLUSTERS] || RUNNING_CLUSTERS.marathon;
    return clusterMap[level as keyof typeof clusterMap] || "Sub330_Marathon";
  }
  
  if (sportRef === "cycling") {
    const clusterMap = category === "sprint" ? CYCLING_CLUSTERS.sprint : CYCLING_CLUSTERS.default;
    return clusterMap[level as keyof typeof clusterMap] || "Amateur_Perf";
  }
  
  return "AG_Perf_Long";
}

/**
 * Calcule la confiance de la sélection de cluster
 */
export function computeClusterMatchConfidence(input: ClusterSelectorInput): number {
  let confidence = 0.6; // Base
  
  // +0.15 if sex known
  if (input.sex) {
    confidence += 0.15;
  }
  
  // +0.15 if vo2max known
  if (input.vo2max && input.vo2max > 0) {
    confidence += 0.15;
  }
  
  // +0.15 if ambition explicitly set (strong signal)
  if (input.ambitionLevel) {
    confidence += 0.15;
  }
  
  // +0.10 if objective maps clearly
  const obj = input.objectif.toLowerCase();
  const clearObjectives = ["im", "ironman", "703", "marathon", "semi", "10k", "trail"];
  if (clearObjectives.some(o => obj.includes(o))) {
    confidence += 0.10;
  }
  
  // +0.05 if target time specified
  if (input.targetTime) {
    confidence += 0.05;
  }
  
  // +0.10 if inferred level is not UNKNOWN
  const sportRef = selectReferenceSport(input.objectif, input.sportFocus);
  const level = inferLevelByVo2(input.sex, sportRef, input.vo2max, input.ambitionLevel);
  if (level !== "UNKNOWN") {
    confidence += 0.10;
  }
  
  // Penalties (reduced if ambition is set)
  if (!input.vo2max && !input.ambitionLevel) {
    confidence -= 0.15;
  }
  if (!input.sex) {
    confidence -= 0.10;
  }
  
  // Cap
  return Math.min(0.95, Math.max(0.35, confidence));
}

/**
 * Construit l'enveloppe complète de sélection de cluster
 */
export function buildClusterSelectionEnvelope(input: ClusterSelectorInput): ClusterSelectionEnvelope {
  const { objectif, sex, vo2max, vlamax, sportFocus, forceCluster, ambitionLevel, targetTime } = input;
  
  const rationale: string[] = [];
  const warnings: string[] = [];
  
  // 1. Sport reference
  const sportRef = selectReferenceSport(objectif, sportFocus);
  rationale.push(`Objectif "${objectif}" → référentiel ${getSportRefLabel(sportRef)}`);
  
  // 2. Infer level with ambition priority
  const inferredLevel = inferLevelByVo2(sex, sportRef, vo2max, ambitionLevel);
  
  if (ambitionLevel) {
    rationale.push(`Ambition déclarée "${ambitionLevel}" → niveau ${getInferredLevelLabel(inferredLevel)}`);
    if (vo2max) {
      // Vérifier cohérence ambition / VO2max
      const vo2Level = inferLevelByVo2(sex, sportRef, vo2max);
      if (vo2Level !== inferredLevel && vo2Level !== "UNKNOWN") {
        warnings.push(`Attention: VO2max (${vo2max.toFixed(1)}) suggère niveau ${getInferredLevelLabel(vo2Level)}, mais ambition est "${ambitionLevel}"`);
      }
    }
  } else if (vo2max) {
    rationale.push(`VO2max = ${vo2max.toFixed(1)} ml/kg/min (${sex || "sexe non précisé"}) → niveau ${getInferredLevelLabel(inferredLevel)}`);
  } else {
    rationale.push(`Ni VO2max ni ambition renseignés → niveau estimé conservateur (${getInferredLevelLabel(inferredLevel)})`);
    warnings.push("Renseigner l'ambition ou le VO2max pour un référentiel plus précis");
  }
  
  // 3. Select cluster
  let clusterId: string;
  if (forceCluster) {
    clusterId = forceCluster;
    rationale.push(`Cluster forcé : ${forceCluster}`);
  } else {
    clusterId = selectCluster(objectif, sex, sportRef, inferredLevel, vlamax);
    rationale.push(`Cluster sélectionné : ${clusterId}`);
  }
  
  // 4. Confidence
  const confidence = computeClusterMatchConfidence(input);
  
  // 5. Additional warnings
  if (!sex) {
    warnings.push("Sexe non renseigné : seuils masculins utilisés par défaut");
  }
  if (confidence < 0.6) {
    warnings.push("Confiance faible : interprétation prudente requise");
  }
  if (inferredLevel === "UNKNOWN") {
    warnings.push("Niveau non inférable : cluster par défaut utilisé");
  }
  
  return {
    sportRef,
    clusterId,
    clusterLabel: CLUSTER_LABELS[clusterId] || clusterId,
    inferredLevel,
    confidence,
    rationale,
    warnings,
  };
}

// =============================================
// UI HELPERS
// =============================================

export function getInferredLevelLabel(level: InferredLevel): string {
  const labels: Record<InferredLevel, string> = {
    PRO: "Professionnel",
    ELITE: "Élite",
    AG_PERF: "Age Grouper Performance",
    PERF: "Performance",
    AMATEUR: "Amateur",
    DEBUTANT: "Débutant",
    UNKNOWN: "Inconnu",
  };
  return labels[level];
}

export function getInferredLevelColor(level: InferredLevel): string {
  const colors: Record<InferredLevel, string> = {
    PRO: "text-purple-600 dark:text-purple-400",
    ELITE: "text-purple-600 dark:text-purple-400",
    AG_PERF: "text-blue-600 dark:text-blue-400",
    PERF: "text-blue-600 dark:text-blue-400",
    AMATEUR: "text-green-600 dark:text-green-400",
    DEBUTANT: "text-amber-600 dark:text-amber-400",
    UNKNOWN: "text-muted-foreground",
  };
  return colors[level];
}

export function getSportRefLabel(sport: SportReference): string {
  const labels: Record<SportReference, string> = {
    triathlon: "Triathlon",
    running: "Course à pied",
    cycling: "Cyclisme",
  };
  return labels[sport];
}

export function getClusterLabel(clusterId: string): string {
  return CLUSTER_LABELS[clusterId] || clusterId;
}

// =============================================
// ACADEMY CONTENT
// =============================================

export const ACADEMY_CLUSTER_SELECTION = {
  id: "cluster-selection",
  title: "Pourquoi TFCL utilise des référentiels (clusters)",
  sections: [
    {
      title: "Qu'est-ce qu'un cluster ?",
      content: `
Un cluster est un groupe de profils physiologiques similaires utilisé comme **référentiel comparatif**.

TFCL sélectionne automatiquement le cluster le plus pertinent en fonction de :
- L'objectif de l'athlète (Ironman, Marathon, etc.)
- Le niveau estimé via VO2max
- Le sexe (si renseigné)

**Ce que fait le cluster :**
- Contextualise les valeurs (percentiles)
- Identifie les plages typiques
- Signale les valeurs atypiques

**Ce que le cluster ne fait PAS :**
- Classer ou juger l'athlète
- Définir des objectifs à atteindre
- Remplacer un diagnostic médical
      `.trim(),
    },
    {
      title: "Comment le cluster est-il choisi ?",
      content: `
1. **Détection du sport** : L'objectif détermine le référentiel (triathlon/running/cycling)

2. **Inférence du niveau** : VO2max permet d'estimer le niveau
   - Triathlon H : >75 PRO, 62-75 AG_PERF, 50-62 AMATEUR
   - Running H : >75 ELITE, 62-75 PERF, 50-62 AMATEUR
   - Cyclisme H : >70 PRO, 58-70 PERF, 45-58 AMATEUR

3. **Sélection du cluster** : Combinaison objectif + niveau = cluster

4. **Calcul de confiance** : 
   - Base 60%
   - +15% si sexe connu
   - +15% si VO2max connu
   - +10% si objectif clair
      `.trim(),
    },
    {
      title: "Quand le référentiel est-il approximatif ?",
      content: `
⚠️ **Confiance < 60%** = référentiel approximatif

Causes possibles :
- VO2max non renseigné
- Sexe non renseigné
- Objectif ambigu
- Niveau difficile à inférer

Dans ce cas :
- Un badge "Référentiel approximatif" s'affiche
- L'interprétation doit être prudente
- Un test laboratoire est recommandé
      `.trim(),
    },
    {
      title: "Quand faire un test laboratoire ?",
      content: `
Un test laboratoire devient nécessaire quand :

1. **Enjeu compétitif élevé** : Qualification, objectif temps précis
2. **Valeurs atypiques** : VLamax hors plage P10-P90
3. **Confiance faible** : Référentiel approximatif
4. **Décision stratégique majeure** : Changement de nutrition, intensité clé

Le référentiel TFCL est un **outil de contextualisation**, pas un substitut à la mesure directe.
      `.trim(),
    },
  ],
};
