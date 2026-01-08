/**
 * Template Reference Profiles
 * Defines performance vs intermediate profiles for each template
 * Used for staff-grade annotations comparison
 */

export type RiskTolerance = "LOW" | "MEDIUM" | "HIGH";

export interface TemplateProfile {
  id: string;
  name: string;
  level: "PERFORMANCE" | "INTERMEDIAIRE";
  targetTime: string;
  description: string;
  targets: {
    vlamax_min: number;
    vlamax_max: number;
    tte_min: number;
    ftpkg_min: number;
    run_economy: "excellent" | "good" | "ok" | "poor";
    nutrition_min_gph: number;
    nutrition_max_gph: number;
    // IM-specific fields
    nutrition_run_min_gph?: number;
    nutrition_run_max_gph?: number;
    risk_tolerance?: RiskTolerance;
  };
}

export interface TemplateProfilePair {
  templateId: string;
  performance: TemplateProfile;
  intermediaire: TemplateProfile;
}

// Semi-Marathon 12 semaines profiles
const SEMI_PERFORMANCE: TemplateProfile = {
  id: "semi-12w-perf",
  name: "Performance",
  level: "PERFORMANCE",
  targetTime: "~1h25",
  description: "Athlète avec forte durabilité au seuil, faible dépendance glucidique, capacité à maintenir Z4b pendant 1h20+.",
  targets: {
    vlamax_min: 0.30,
    vlamax_max: 0.45,
    tte_min: 50,
    ftpkg_min: 4.0,
    run_economy: "good",
    nutrition_min_gph: 60,
    nutrition_max_gph: 90,
  },
};

const SEMI_INTERMEDIAIRE: TemplateProfile = {
  id: "semi-12w-inter",
  name: "Intermédiaire",
  level: "INTERMEDIAIRE",
  targetTime: "~1h35-1h50",
  description: "Athlète en progression, durabilité moyenne, dépendance glucidique modérée à surveiller.",
  targets: {
    vlamax_min: 0.45,
    vlamax_max: 0.75,
    tte_min: 40,
    ftpkg_min: 3.2,
    run_economy: "ok",
    nutrition_min_gph: 30,
    nutrition_max_gph: 60,
  },
};

// Marathon profiles
const MARATHON_PERFORMANCE: TemplateProfile = {
  id: "marathon-perf",
  name: "Performance",
  level: "PERFORMANCE",
  targetTime: "~3h00",
  description: "Athlète endurant avec excellente économie de course, faible VLamax, TTE élevé.",
  targets: {
    vlamax_min: 0.25,
    vlamax_max: 0.40,
    tte_min: 55,
    ftpkg_min: 3.8,
    run_economy: "excellent",
    nutrition_min_gph: 60,
    nutrition_max_gph: 90,
  },
};

const MARATHON_INTERMEDIAIRE: TemplateProfile = {
  id: "marathon-inter",
  name: "Intermédiaire",
  level: "INTERMEDIAIRE",
  targetTime: "~3h30-4h00",
  description: "Athlète en développement endurance, nécessite travail sur durabilité.",
  targets: {
    vlamax_min: 0.40,
    vlamax_max: 0.65,
    tte_min: 45,
    ftpkg_min: 3.0,
    run_economy: "ok",
    nutrition_min_gph: 40,
    nutrition_max_gph: 70,
  },
};

// 70.3 profiles
const IM703_PERFORMANCE: TemplateProfile = {
  id: "im703-perf",
  name: "Performance",
  level: "PERFORMANCE",
  targetTime: "~4h30",
  description: "Triathlète complet avec forte capacité aérobie, économe sur les 3 sports.",
  targets: {
    vlamax_min: 0.30,
    vlamax_max: 0.50,
    tte_min: 50,
    ftpkg_min: 4.2,
    run_economy: "good",
    nutrition_min_gph: 70,
    nutrition_max_gph: 100,
  },
};

const IM703_INTERMEDIAIRE: TemplateProfile = {
  id: "im703-inter",
  name: "Intermédiaire",
  level: "INTERMEDIAIRE",
  targetTime: "~5h30-6h30",
  description: "Triathlète en progression, besoin de consolider endurance vélo avant CAP.",
  targets: {
    vlamax_min: 0.50,
    vlamax_max: 0.75,
    tte_min: 40,
    ftpkg_min: 3.4,
    run_economy: "ok",
    nutrition_min_gph: 50,
    nutrition_max_gph: 80,
  },
};

// IM Kona profiles - Ultra-specific for Ironman distance
const IMKONA_PERFORMANCE: TemplateProfile = {
  id: "imkona-perf",
  name: "Performance (Kona/Elite)",
  level: "PERFORMANCE",
  targetTime: "~9h30",
  description: "Athlète ultra-endurant avec VLamax très basse (<0.40), TTE élevé (55+), maîtrise nutrition extrême (80-100g/h vélo). Tolérance aux erreurs: FAIBLE.",
  targets: {
    vlamax_min: 0.25,
    vlamax_max: 0.40,
    tte_min: 55,
    ftpkg_min: 4.6,
    run_economy: "excellent",
    nutrition_min_gph: 80,
    nutrition_max_gph: 100,
    nutrition_run_min_gph: 50,
    nutrition_run_max_gph: 80,
    risk_tolerance: "LOW",
  },
};

const IMKONA_INTERMEDIAIRE: TemplateProfile = {
  id: "imkona-inter",
  name: "Intermédiaire (IM Finisher)",
  level: "INTERMEDIAIRE",
  targetTime: "~11h-13h",
  description: "Finisher avancé avec focus gestion énergétique. VLamax modérée (0.35-0.55), TTE correct (50+). Nutrition validée requise.",
  targets: {
    vlamax_min: 0.35,
    vlamax_max: 0.55,
    tte_min: 50,
    ftpkg_min: 4.0,
    run_economy: "good",
    nutrition_min_gph: 70,
    nutrition_max_gph: 90,
    nutrition_run_min_gph: 40,
    nutrition_run_max_gph: 70,
    risk_tolerance: "MEDIUM",
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
  "imkona": {
    templateId: "imkona",
    performance: IMKONA_PERFORMANCE,
    intermediaire: IMKONA_INTERMEDIAIRE,
  },
  "im": {
    templateId: "im",
    performance: IMKONA_PERFORMANCE,
    intermediaire: IMKONA_INTERMEDIAIRE,
  },
  "im-kona-detaille": {
    templateId: "im-kona-detaille",
    performance: IMKONA_PERFORMANCE,
    intermediaire: IMKONA_INTERMEDIAIRE,
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
  
  // Try partial match
  if (lowerId.includes("semi")) return TEMPLATE_PROFILES["semi"];
  if (lowerId.includes("marathon") && !lowerId.includes("semi")) return TEMPLATE_PROFILES["marathon"];
  if (lowerId.includes("703")) return TEMPLATE_PROFILES["703"];
  if (lowerId.includes("kona") || lowerId.includes("im")) return TEMPLATE_PROFILES["im"];
  
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
