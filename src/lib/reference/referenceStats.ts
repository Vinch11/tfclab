/**
 * TFCL Reference Stats - Statistiques par cluster
 * Two For Coaching Lab Method™
 * 
 * Ce module calcule les statistiques (moyenne, écart-type, percentiles)
 * pour chaque cluster du référentiel TFCL.
 */

// =============================================
// TYPES
// =============================================

export interface ReferenceDataPoint {
  id: string;
  type: string;
  sex: "H" | "F" | null;
  weight_kg: number;
  vo2max_mlkgmin: number;
  vlamax_mmol_l_s: number;
}

export interface ReferenceDataset {
  sport: "cycling" | "triathlon" | "running";
  description: string;
  lastUpdated: string;
  source: string;
  data: ReferenceDataPoint[];
}

export interface ClusterStats {
  cluster: string;
  sport: string;
  type: string;
  sex: "H" | "F" | "all";
  n: number;
  // VO2max stats
  mean_vo2max: number;
  sd_vo2max: number;
  p10_vo2max: number;
  p25_vo2max: number;
  p50_vo2max: number;
  p75_vo2max: number;
  p90_vo2max: number;
  // VLamax stats
  mean_vlamax: number;
  sd_vlamax: number;
  p10_vlamax: number;
  p25_vlamax: number;
  p50_vlamax: number;
  p75_vlamax: number;
  p90_vlamax: number;
}

export interface ReferenceStats {
  sport: string;
  totalN: number;
  clusters: ClusterStats[];
  lastUpdated: string;
}

// =============================================
// HELPER FUNCTIONS
// =============================================

/**
 * Calcule un percentile sur un tableau trié
 */
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/**
 * Calcule la moyenne
 */
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
}

/**
 * Calcule l'écart-type
 */
function standardDeviation(arr: number[]): number {
  if (arr.length < 2) return 0;
  const avg = mean(arr);
  const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
  const avgSquareDiff = mean(squareDiffs);
  return Math.sqrt(avgSquareDiff);
}

/**
 * Génère un ID de cluster unique
 */
function getClusterId(sport: string, type: string, sex: "H" | "F" | "all"): string {
  return `${sport}_${type}_${sex}`.replace(/\s+/g, "_");
}

// =============================================
// MAIN FUNCTIONS
// =============================================

/**
 * Construit les statistiques de référence pour un dataset
 */
export function buildReferenceStats(dataset: ReferenceDataset): ReferenceStats {
  const { sport, data, lastUpdated } = dataset;
  
  // Grouper par type + sex
  const groups = new Map<string, ReferenceDataPoint[]>();
  
  for (const point of data) {
    // Cluster avec sexe
    if (point.sex) {
      const keyWithSex = `${point.type}|${point.sex}`;
      if (!groups.has(keyWithSex)) groups.set(keyWithSex, []);
      groups.get(keyWithSex)!.push(point);
    }
    
    // Cluster "all" (sans distinction de sexe)
    const keyAll = `${point.type}|all`;
    if (!groups.has(keyAll)) groups.set(keyAll, []);
    groups.get(keyAll)!.push(point);
  }
  
  const clusters: ClusterStats[] = [];
  
  for (const [key, points] of groups) {
    const [type, sex] = key.split("|") as [string, "H" | "F" | "all"];
    
    const vo2maxValues = points.map(p => p.vo2max_mlkgmin);
    const vlamaxValues = points.map(p => p.vlamax_mmol_l_s);
    
    clusters.push({
      cluster: getClusterId(sport, type, sex),
      sport,
      type,
      sex,
      n: points.length,
      // VO2max
      mean_vo2max: Number(mean(vo2maxValues).toFixed(1)),
      sd_vo2max: Number(standardDeviation(vo2maxValues).toFixed(1)),
      p10_vo2max: Number(percentile(vo2maxValues, 10).toFixed(1)),
      p25_vo2max: Number(percentile(vo2maxValues, 25).toFixed(1)),
      p50_vo2max: Number(percentile(vo2maxValues, 50).toFixed(1)),
      p75_vo2max: Number(percentile(vo2maxValues, 75).toFixed(1)),
      p90_vo2max: Number(percentile(vo2maxValues, 90).toFixed(1)),
      // VLamax
      mean_vlamax: Number(mean(vlamaxValues).toFixed(3)),
      sd_vlamax: Number(standardDeviation(vlamaxValues).toFixed(3)),
      p10_vlamax: Number(percentile(vlamaxValues, 10).toFixed(3)),
      p25_vlamax: Number(percentile(vlamaxValues, 25).toFixed(3)),
      p50_vlamax: Number(percentile(vlamaxValues, 50).toFixed(3)),
      p75_vlamax: Number(percentile(vlamaxValues, 75).toFixed(3)),
      p90_vlamax: Number(percentile(vlamaxValues, 90).toFixed(3)),
    });
  }
  
  // Trier par type puis par sexe
  clusters.sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.sex.localeCompare(b.sex);
  });
  
  return {
    sport,
    totalN: data.length,
    clusters,
    lastUpdated,
  };
}

/**
 * Récupère les stats d'un cluster spécifique
 */
export function getClusterStats(
  stats: ReferenceStats,
  type: string,
  sex?: "H" | "F"
): ClusterStats | null {
  const targetSex = sex || "all";
  return stats.clusters.find(c => c.type === type && c.sex === targetSex) || null;
}

/**
 * Trouve le meilleur cluster correspondant à un profil
 */
export function findBestMatchingCluster(
  stats: ReferenceStats,
  type: string,
  sex?: "H" | "F"
): ClusterStats | null {
  // 1. Essayer avec le sexe spécifique
  if (sex) {
    const withSex = getClusterStats(stats, type, sex);
    if (withSex && withSex.n >= 3) return withSex;
  }
  
  // 2. Fallback sur "all"
  const all = getClusterStats(stats, type);
  if (all) return all;
  
  // 3. Pas trouvé
  return null;
}

/**
 * Liste tous les types disponibles dans un dataset
 */
export function getAvailableTypes(stats: ReferenceStats): string[] {
  const types = new Set<string>();
  for (const cluster of stats.clusters) {
    types.add(cluster.type);
  }
  return Array.from(types).sort();
}

// =============================================
// CLUSTER TYPE MAPPINGS
// =============================================

export const CLUSTER_TYPE_LABELS: Record<string, string> = {
  // Cycling
  Elite_Road: "Cycliste Route Élite",
  Amateur_Perf: "Cycliste Amateur Performance",
  Amateur_Loisir: "Cycliste Loisir",
  Track_Sprint: "Pistard Sprint",
  
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
};

export function getClusterLabel(type: string): string {
  return CLUSTER_TYPE_LABELS[type] || type;
}

// =============================================
// SPORT LABELS
// =============================================

export const SPORT_LABELS: Record<string, string> = {
  cycling: "Cyclisme",
  triathlon: "Triathlon",
  running: "Course à pied",
};

export function getSportLabel(sport: string): string {
  return SPORT_LABELS[sport] || sport;
}
