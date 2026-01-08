/**
 * Template Reference Profiles
 * Defines performance vs intermediate profiles for each template
 * Used for staff-grade annotations comparison
 */

export type RiskTolerance = "EXTREMELY_LOW" | "VERY_LOW" | "LOW" | "MEDIUM" | "HIGH";

export type LongRunTolerance = "LOW" | "MEDIUM" | "HIGH";

export type BikeDominance = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" | "EXTREME";
export type RunAfterBikeTolerance = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

// CAP-specific types (Dan Lorang methodology)
export type EconomyPriority = "STANDARD" | "HIGH" | "VERY_HIGH" | "EXTREME";
export type IntensityTolerance = "LOW" | "MEDIUM" | "HIGH" | "CONTROLLED";
export type InjuryRiskSensitivity = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" | "EXTREME";

export interface TemplateProfile {
  id: string;
  name: string;
  level: "PERFORMANCE" | "INTERMEDIAIRE" | "ELITE";
  targetTime: string;
  description: string;
  targets: {
    vlamax_min: number;
    vlamax_max: number;
    tte_min: number;
    ftpkg_min: number;
    run_economy: "excellent" | "good" | "ok" | "poor";
    run_economy_score_min?: number; // For marathon: score >= 75 = good/excellent
    nutrition_min_gph: number;
    nutrition_max_gph: number;
    // IM-specific fields
    nutrition_run_min_gph?: number;
    nutrition_run_max_gph?: number;
    risk_tolerance?: RiskTolerance;
    // Marathon-specific fields
    long_run_tolerance?: LongRunTolerance;
    // CAP-specific fields (Dan Lorang methodology)
    economy_priority?: EconomyPriority;
    intensity_tolerance?: IntensityTolerance;
    injury_risk_sensitivity?: InjuryRiskSensitivity;
    max_weekly_volume_km?: number; // Maximum recommended weekly volume
    // 70.3-specific fields
    bike_dominance?: BikeDominance;
    run_after_bike_tolerance?: RunAfterBikeTolerance;
  };
}

export interface TemplateProfilePair {
  templateId: string;
  performance: TemplateProfile;
  intermediaire: TemplateProfile;
}

// Semi-Marathon profiles (Dan Lorang methodology)
const SEMI_PERFORMANCE: TemplateProfile = {
  id: "semi-perf",
  name: "Performance Semi",
  level: "PERFORMANCE",
  targetTime: "~1h20-1h30",
  description: "Athlète semi-marathon avec forte durabilité au seuil, VLamax contrôlée (0.40-0.65), économie prioritaire. Tolérance intensité haute.",
  targets: {
    vlamax_min: 0.40,
    vlamax_max: 0.65,
    tte_min: 45,
    ftpkg_min: 3.8,
    run_economy: "good",
    run_economy_score_min: 70,
    nutrition_min_gph: 60,
    nutrition_max_gph: 90,
    economy_priority: "HIGH",
    intensity_tolerance: "HIGH",
    injury_risk_sensitivity: "HIGH",
    max_weekly_volume_km: 90,
    risk_tolerance: "LOW",
  },
};

const SEMI_INTERMEDIAIRE: TemplateProfile = {
  id: "semi-inter",
  name: "Intermédiaire Semi",
  level: "INTERMEDIAIRE",
  targetTime: "~1h35-1h55",
  description: "Athlète semi en progression. VLamax modérée, durabilité à consolider. Priorité économie + gestion blessure.",
  targets: {
    vlamax_min: 0.55,
    vlamax_max: 0.80,
    tte_min: 40,
    ftpkg_min: 3.2,
    run_economy: "ok",
    run_economy_score_min: 55,
    nutrition_min_gph: 40,
    nutrition_max_gph: 70,
    economy_priority: "HIGH",
    intensity_tolerance: "MEDIUM",
    injury_risk_sensitivity: "VERY_HIGH",
    max_weekly_volume_km: 70,
    risk_tolerance: "MEDIUM",
  },
};

// Marathon profiles (Dan Lorang methodology - CAP-dominant)
const MARATHON_PERFORMANCE: TemplateProfile = {
  id: "marathon-perf",
  name: "Performance Marathon",
  level: "PERFORMANCE",
  targetTime: "~2h50-3h15",
  description: "Marathonien performant. VLamax basse (0.30-0.50), TTE élevé ≥55. Économie TRÈS HAUTE priorité. Tolérance intensité modérée.",
  targets: {
    vlamax_min: 0.30,
    vlamax_max: 0.50,
    tte_min: 55,
    ftpkg_min: 3.8,
    run_economy: "excellent",
    run_economy_score_min: 80,
    nutrition_min_gph: 70,
    nutrition_max_gph: 100,
    economy_priority: "VERY_HIGH",
    intensity_tolerance: "MEDIUM",
    injury_risk_sensitivity: "VERY_HIGH",
    max_weekly_volume_km: 100,
    long_run_tolerance: "HIGH",
    risk_tolerance: "LOW",
  },
};

const MARATHON_INTERMEDIAIRE: TemplateProfile = {
  id: "marathon-inter",
  name: "Intermédiaire Marathon",
  level: "INTERMEDIAIRE",
  targetTime: "~3h30-4h15",
  description: "Marathonien en développement. VLamax modérée (0.45-0.60), TTE à consolider ≥50. Économie et mécanique prioritaires.",
  targets: {
    vlamax_min: 0.45,
    vlamax_max: 0.60,
    tte_min: 50,
    ftpkg_min: 3.2,
    run_economy: "good",
    run_economy_score_min: 65,
    nutrition_min_gph: 50,
    nutrition_max_gph: 80,
    economy_priority: "VERY_HIGH",
    intensity_tolerance: "LOW",
    injury_risk_sensitivity: "VERY_HIGH",
    max_weekly_volume_km: 80,
    long_run_tolerance: "MEDIUM",
    risk_tolerance: "MEDIUM",
  },
};

// Marathon ELITE profile (Dan Lorang methodology)
const MARATHON_ELITE: TemplateProfile = {
  id: "marathon-elite",
  name: "Elite Marathon",
  level: "ELITE",
  targetTime: "~2h20-2h45",
  description: "Elite marathonien. VLamax très basse (0.25-0.45), TTE extrême ≥60. Économie PRIORITÉ ABSOLUE. Intensité contrôlée. Sensibilité blessure EXTRÊME.",
  targets: {
    vlamax_min: 0.25,
    vlamax_max: 0.45,
    tte_min: 60,
    ftpkg_min: 4.2,
    run_economy: "excellent",
    run_economy_score_min: 85,
    nutrition_min_gph: 90,
    nutrition_max_gph: 120,
    economy_priority: "EXTREME",
    intensity_tolerance: "CONTROLLED",
    injury_risk_sensitivity: "EXTREME",
    max_weekly_volume_km: 140,
    long_run_tolerance: "HIGH",
  },
};

// 70.3 profiles - Triathlon longue distance avec priorité vélo
const IM703_PERFORMANCE: TemplateProfile = {
  id: "im703-perf",
  name: "Performance 70.3",
  level: "PERFORMANCE",
  targetTime: "~4h15-4h45",
  description: "Triathlète complet avec VLamax basse (<0.45), TTE élevé (≥50), forte capacité vélo. Priorité vélo, CAP post-vélo maîtrisée. Nutrition vélo 80-100g/h.",
  targets: {
    vlamax_min: 0.28,
    vlamax_max: 0.45,
    tte_min: 50,
    ftpkg_min: 4.2,
    run_economy: "good",
    nutrition_min_gph: 80,
    nutrition_max_gph: 100,
    nutrition_run_min_gph: 50,
    nutrition_run_max_gph: 75,
    risk_tolerance: "LOW",
    bike_dominance: "HIGH",
    run_after_bike_tolerance: "HIGH",
  },
};

const IM703_INTERMEDIAIRE: TemplateProfile = {
  id: "im703-inter",
  name: "Finisher Ambitieux 70.3",
  level: "INTERMEDIAIRE",
  targetTime: "~5h30-6h30",
  description: "Triathlète en progression. VLamax modérée (0.35-0.55), TTE à consolider (≥45). Besoin de renforcer vélo avant CAP. Nutrition 60-80g/h vélo.",
  targets: {
    vlamax_min: 0.35,
    vlamax_max: 0.55,
    tte_min: 45,
    ftpkg_min: 3.6,
    run_economy: "ok",
    nutrition_min_gph: 60,
    nutrition_max_gph: 80,
    nutrition_run_min_gph: 40,
    nutrition_run_max_gph: 60,
    risk_tolerance: "MEDIUM",
    bike_dominance: "MEDIUM",
    run_after_bike_tolerance: "MEDIUM",
  },
};

// ============= IRONMAN FULL DISTANCE PROFILES =============

// Profil FINISHER IM Full
const IMFULL_FINISHER: TemplateProfile = {
  id: "imfull-finisher",
  name: "Finisher IM Full",
  level: "INTERMEDIAIRE",
  targetTime: "~12h-15h",
  description: "Finisher Ironman. VLamax modérée (0.30-0.45), TTE ≥50. Vélo dominant (VERY_HIGH). Nutrition critique 70-90g/h vélo, 50-65g/h CAP. Tolérance erreur: FAIBLE.",
  targets: {
    vlamax_min: 0.30,
    vlamax_max: 0.45,
    tte_min: 50,
    ftpkg_min: 3.8,
    run_economy: "good",
    nutrition_min_gph: 70,
    nutrition_max_gph: 90,
    nutrition_run_min_gph: 50,
    nutrition_run_max_gph: 65,
    risk_tolerance: "LOW",
    bike_dominance: "VERY_HIGH",
    run_after_bike_tolerance: "MEDIUM",
  },
};

// Profil PERFORMANCE IM Full
const IMFULL_PERFORMANCE: TemplateProfile = {
  id: "imfull-perf",
  name: "Performance IM Full",
  level: "PERFORMANCE",
  targetTime: "~9h30-11h",
  description: "Athlète IM performant. VLamax basse (0.25-0.40), TTE élevé ≥55. Vélo VERY_HIGH, CAP post-vélo maîtrisée. Nutrition 90-110g/h vélo, 60-75g/h CAP. Tolérance erreur: TRÈS FAIBLE.",
  targets: {
    vlamax_min: 0.25,
    vlamax_max: 0.40,
    tte_min: 55,
    ftpkg_min: 4.2,
    run_economy: "excellent",
    nutrition_min_gph: 90,
    nutrition_max_gph: 110,
    nutrition_run_min_gph: 60,
    nutrition_run_max_gph: 75,
    risk_tolerance: "VERY_LOW",
    bike_dominance: "VERY_HIGH",
    run_after_bike_tolerance: "HIGH",
  },
};

// Profil KONA / ELITE IM Full
const IMFULL_KONA: TemplateProfile = {
  id: "imfull-kona",
  name: "Kona / Elite",
  level: "PERFORMANCE",
  targetTime: "~8h30-9h30",
  description: "Elite Ironman / Kona. VLamax très basse (0.20-0.35), TTE extrême ≥60. Vélo EXTREME dominant. CAP post-vélo excellente. Nutrition 100-120g/h vélo, 70-90g/h CAP. Tolérance erreur: EXTRÊMEMENT FAIBLE.",
  targets: {
    vlamax_min: 0.20,
    vlamax_max: 0.35,
    tte_min: 60,
    ftpkg_min: 4.8,
    run_economy: "excellent",
    nutrition_min_gph: 100,
    nutrition_max_gph: 120,
    nutrition_run_min_gph: 70,
    nutrition_run_max_gph: 90,
    risk_tolerance: "EXTREMELY_LOW",
    bike_dominance: "EXTREME",
    run_after_bike_tolerance: "VERY_HIGH",
  },
};

// Template profiles map
export const TEMPLATE_PROFILES: Record<string, TemplateProfilePair> = {
  "semi-12w": {
    templateId: "semi-12w",
    performance: SEMI_PERFORMANCE,
    intermediaire: SEMI_INTERMEDIAIRE,
  },
  "semi": {
    templateId: "semi",
    performance: SEMI_PERFORMANCE,
    intermediaire: SEMI_INTERMEDIAIRE,
  },
  "marathon": {
    templateId: "marathon",
    performance: MARATHON_PERFORMANCE,
    intermediaire: MARATHON_INTERMEDIAIRE,
  },
  "marathon-24-semaines": {
    templateId: "marathon-24-semaines",
    performance: MARATHON_PERFORMANCE,
    intermediaire: MARATHON_INTERMEDIAIRE,
  },
  "marathon-24w": {
    templateId: "marathon-24w",
    performance: MARATHON_PERFORMANCE,
    intermediaire: MARATHON_INTERMEDIAIRE,
  },
  "im703": {
    templateId: "im703",
    performance: IM703_PERFORMANCE,
    intermediaire: IM703_INTERMEDIAIRE,
  },
  "703": {
    templateId: "703",
    performance: IM703_PERFORMANCE,
    intermediaire: IM703_INTERMEDIAIRE,
  },
  "ironman-703-24-semaines": {
    templateId: "ironman-703-24-semaines",
    performance: IM703_PERFORMANCE,
    intermediaire: IM703_INTERMEDIAIRE,
  },
  "im703-24w": {
    templateId: "im703-24w",
    performance: IM703_PERFORMANCE,
    intermediaire: IM703_INTERMEDIAIRE,
  },
  // IM Full profiles - 3 levels: Finisher, Performance, Kona
  "imfull": {
    templateId: "imfull",
    performance: IMFULL_PERFORMANCE,
    intermediaire: IMFULL_FINISHER,
  },
  "ironman-full": {
    templateId: "ironman-full",
    performance: IMFULL_PERFORMANCE,
    intermediaire: IMFULL_FINISHER,
  },
  "ironman": {
    templateId: "ironman",
    performance: IMFULL_PERFORMANCE,
    intermediaire: IMFULL_FINISHER,
  },
  "im": {
    templateId: "im",
    performance: IMFULL_PERFORMANCE,
    intermediaire: IMFULL_FINISHER,
  },
  // Kona-specific - elite level
  "imkona": {
    templateId: "imkona",
    performance: IMFULL_KONA,
    intermediaire: IMFULL_PERFORMANCE,
  },
  "kona": {
    templateId: "kona",
    performance: IMFULL_KONA,
    intermediaire: IMFULL_PERFORMANCE,
  },
  "im-kona-detaille": {
    templateId: "im-kona-detaille",
    performance: IMFULL_KONA,
    intermediaire: IMFULL_PERFORMANCE,
  },
  "elite": {
    templateId: "elite",
    performance: IMFULL_KONA,
    intermediaire: IMFULL_PERFORMANCE,
  },
};

/**
 * Get profile pair for a template
 */
export function getTemplateProfiles(templateId: string): TemplateProfilePair | null {
  // Try direct match
  const lowerId = templateId.toLowerCase();
  if (TEMPLATE_PROFILES[lowerId]) {
    return TEMPLATE_PROFILES[lowerId];
  }
  
  // Try partial match (order matters: 703 before im/kona)
  if (lowerId.includes("semi")) return TEMPLATE_PROFILES["semi"];
  if (lowerId.includes("marathon") && !lowerId.includes("semi")) return TEMPLATE_PROFILES["marathon"];
  if (lowerId.includes("703") || lowerId.includes("70.3")) return TEMPLATE_PROFILES["703"];
  if (lowerId.includes("kona") || (lowerId.includes("im") && !lowerId.includes("703"))) return TEMPLATE_PROFILES["im"];
  
  return null;
}

/**
 * Determine which profile an athlete is closer to
 */
export function getClosestProfile(
  vlamax: number | null,
  tte: number | null,
  ftpkg: number | null,
  profiles: TemplateProfilePair
): { closest: "PERFORMANCE" | "INTERMEDIAIRE"; score: number; details: string } {
  let perfScore = 0;
  let interScore = 0;
  const details: string[] = [];

  // VLamax comparison
  if (vlamax != null) {
    const perfVlaCenter = (profiles.performance.targets.vlamax_min + profiles.performance.targets.vlamax_max) / 2;
    const interVlaCenter = (profiles.intermediaire.targets.vlamax_min + profiles.intermediaire.targets.vlamax_max) / 2;
    
    const perfVlaDist = Math.abs(vlamax - perfVlaCenter);
    const interVlaDist = Math.abs(vlamax - interVlaCenter);
    
    if (perfVlaDist < interVlaDist) {
      perfScore += 35;
      details.push(`VLamax ${vlamax.toFixed(2)} proche cible perf (${perfVlaCenter.toFixed(2)})`);
    } else {
      interScore += 35;
      details.push(`VLamax ${vlamax.toFixed(2)} proche cible inter (${interVlaCenter.toFixed(2)})`);
    }
  }

  // TTE comparison
  if (tte != null) {
    if (tte >= profiles.performance.targets.tte_min) {
      perfScore += 35;
      details.push(`TTE ${tte.toFixed(0)}' ≥ cible perf (${profiles.performance.targets.tte_min}')`);
    } else if (tte >= profiles.intermediaire.targets.tte_min) {
      interScore += 25;
      perfScore += 10;
      details.push(`TTE ${tte.toFixed(0)}' entre inter et perf`);
    } else {
      interScore += 35;
      details.push(`TTE ${tte.toFixed(0)}' < cible inter (${profiles.intermediaire.targets.tte_min}')`);
    }
  }

  // FTP/kg comparison
  if (ftpkg != null) {
    if (ftpkg >= profiles.performance.targets.ftpkg_min) {
      perfScore += 30;
      details.push(`FTP/kg ${ftpkg.toFixed(1)} ≥ cible perf (${profiles.performance.targets.ftpkg_min})`);
    } else if (ftpkg >= profiles.intermediaire.targets.ftpkg_min) {
      interScore += 20;
      perfScore += 10;
      details.push(`FTP/kg ${ftpkg.toFixed(1)} entre inter et perf`);
    } else {
      interScore += 30;
      details.push(`FTP/kg ${ftpkg.toFixed(1)} < cible inter (${profiles.intermediaire.targets.ftpkg_min})`);
    }
  }

  const total = perfScore + interScore;
  const closest = perfScore >= interScore ? "PERFORMANCE" : "INTERMEDIAIRE";
  const score = total > 0 ? Math.round((Math.max(perfScore, interScore) / total) * 100) : 50;

  return { closest, score, details: details.join(" • ") };
}
