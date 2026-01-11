// src/data/wahooMapping.ts
// Table de correspondance Wahoo SYSTM → Two For Coaching Lab
// Couvre une large gamme d'entraînements avec alias pour matching flexible

export type WahooPhysioAxis =
  | "VLAMAX_DOWN"
  | "TTE_UP"
  | "VO2_UP"
  | "ENDURANCE_BASE"
  | "RECOVERY"
  | "HIGH_RISK"
  | "FORCE_ENDURANCE"
  | "THRESHOLD_MLSS";

export type WahooCategory =
  | "RECOVERY"
  | "Z2_ENDURANCE"
  | "Z2_LONG"
  | "TEMPO_DURABILITY"
  | "FORCE_ENDURANCE"
  | "THRESHOLD_MLSS"
  | "VO2_MAP"
  | "ANAEROBIC_AC"
  | "NEUROMUSCULAR_NM"
  | "WARMUP"
  | "UNKNOWN";

export type WahooSport = "bike" | "run";

export interface WahooWorkoutMapping {
  wahoo_id: string;
  wahoo_name: string;
  aliases: string[]; // For flexible matching
  tags?: string[]; // For filtering (e.g., ["endurance", "z2", "ironman"])
  category: WahooCategory;
  sport: WahooSport;
  duration_min_range: [number, number];
  intensity_profile: "low" | "moderate" | "high" | "mixed";
  primary_axis: WahooPhysioAxis;
  secondary_axis?: WahooPhysioAxis;
  vlamax_effect: "down" | "up" | "neutral";
  tte_effect: "up" | "neutral" | "down";
  risk_level: 0 | 1 | 2 | 3;
  staff_annotation: string;
  contraindications?: string[];
}

// ============= HELPER FUNCTIONS =============

export function getAxisLabel(axis: WahooPhysioAxis): string {
  const labels: Record<WahooPhysioAxis, string> = {
    VLAMAX_DOWN: "VLamax ↓",
    TTE_UP: "TTE ↑",
    VO2_UP: "VO₂max ↑",
    ENDURANCE_BASE: "Endurance fondamentale",
    RECOVERY: "Récupération",
    HIGH_RISK: "Haute intensité / Risque élevé",
    FORCE_ENDURANCE: "Force-Endurance",
    THRESHOLD_MLSS: "Seuil / MLSS",
  };
  return labels[axis];
}

export function getCategoryLabel(category: WahooCategory): string {
  const labels: Record<WahooCategory, string> = {
    RECOVERY: "Récupération",
    Z2_ENDURANCE: "Endurance Z2",
    Z2_LONG: "Endurance longue",
    TEMPO_DURABILITY: "Tempo / Durabilité",
    FORCE_ENDURANCE: "Force-Endurance",
    THRESHOLD_MLSS: "Seuil / MLSS",
    VO2_MAP: "VO₂max / MAP",
    ANAEROBIC_AC: "Anaérobie / AC",
    NEUROMUSCULAR_NM: "Neuromusculaire / NM",
    WARMUP: "Échauffement",
    UNKNOWN: "Non classifié",
  };
  return labels[category];
}

export function getRiskColor(level: 0 | 1 | 2 | 3): string {
  const colors: Record<number, string> = {
    0: "text-green-600 dark:text-green-400",
    1: "text-yellow-600 dark:text-yellow-400",
    2: "text-orange-600 dark:text-orange-400",
    3: "text-red-600 dark:text-red-400",
  };
  return colors[level];
}

export function getRiskLabel(level: 0 | 1 | 2 | 3): string {
  const labels: Record<number, string> = {
    0: "Très faible",
    1: "Modéré",
    2: "Élevé",
    3: "Très élevé",
  };
  return labels[level];
}

// ============= WAHOO WORKOUTS DATABASE =============

export const WAHOO_WORKOUTS: WahooWorkoutMapping[] = [
  // ─────────────────────────────────────────────────────
  // A) RECOVERY
  // ─────────────────────────────────────────────────────
  {
    wahoo_id: "recovery_ride",
    wahoo_name: "Recovery Ride",
    aliases: ["Recovery Ride", "Easy Spin", "Recovery", "Easy Recovery", "Recovery Spin", "Active Recovery"],
    tags: ["recovery", "easy", "z1"],
    category: "RECOVERY",
    sport: "bike",
    duration_min_range: [20, 60],
    intensity_profile: "low",
    primary_axis: "RECOVERY",
    vlamax_effect: "neutral",
    tte_effect: "neutral",
    risk_level: 0,
    staff_annotation: "Favorise l'absorption de la charge et limite le risque de surmenage. Objectif unique : récupérer.",
  },
  {
    wahoo_id: "serbia_upside_down",
    wahoo_name: "Serbia Upside Down",
    aliases: ["Serbia Upside Down", "Serbia", "Upside Down"],
    tags: ["recovery", "mental", "easy"],
    category: "RECOVERY",
    sport: "bike",
    duration_min_range: [45, 60],
    intensity_profile: "low",
    primary_axis: "RECOVERY",
    vlamax_effect: "neutral",
    tte_effect: "neutral",
    risk_level: 0,
    staff_annotation: "Séance récupération active avec focus mental et technique. Idéale après un bloc intensif.",
  },
  {
    wahoo_id: "easy_spin",
    wahoo_name: "Easy Spin",
    aliases: ["Easy Spin", "Spin", "Light Spin", "Easy"],
    tags: ["recovery", "easy", "z1"],
    category: "RECOVERY",
    sport: "bike",
    duration_min_range: [20, 45],
    intensity_profile: "low",
    primary_axis: "RECOVERY",
    vlamax_effect: "neutral",
    tte_effect: "neutral",
    risk_level: 0,
    staff_annotation: "Spin facile sans intensité. Récupération active minimale.",
  },
  {
    wahoo_id: "warm_up",
    wahoo_name: "Warm Up",
    aliases: ["Warm Up", "Warmup", "Warm-Up", "Pre-Race Warmup", "Race Warmup"],
    tags: ["warmup", "preparation"],
    category: "WARMUP",
    sport: "bike",
    duration_min_range: [10, 30],
    intensity_profile: "low",
    primary_axis: "RECOVERY",
    vlamax_effect: "neutral",
    tte_effect: "neutral",
    risk_level: 0,
    staff_annotation: "Échauffement progressif. Prépare le système cardiovasculaire et musculaire.",
  },
  {
    wahoo_id: "cool_down",
    wahoo_name: "Cool Down",
    aliases: ["Cool Down", "Cooldown", "Cool-Down", "Post-Race Cooldown"],
    tags: ["recovery", "cooldown"],
    category: "RECOVERY",
    sport: "bike",
    duration_min_range: [10, 20],
    intensity_profile: "low",
    primary_axis: "RECOVERY",
    vlamax_effect: "neutral",
    tte_effect: "neutral",
    risk_level: 0,
    staff_annotation: "Retour au calme. Favorise la récupération post-effort.",
  },

  // ─────────────────────────────────────────────────────
  // B) Z2_ENDURANCE
  // ─────────────────────────────────────────────────────
  {
    wahoo_id: "endurance_1_0",
    wahoo_name: "Endurance 1.0",
    aliases: ["Endurance 1.0", "Endurance 1", "Endurance 60", "Endurance 60min", "Endurance One"],
    tags: ["endurance", "z2", "aerobic", "base"],
    category: "Z2_ENDURANCE",
    sport: "bike",
    duration_min_range: [45, 75],
    intensity_profile: "low",
    primary_axis: "VLAMAX_DOWN",
    secondary_axis: "ENDURANCE_BASE",
    vlamax_effect: "down",
    tte_effect: "neutral",
    risk_level: 0,
    staff_annotation: "Séance idéale pour réduire la dépendance glycolytique et améliorer l'oxydation lipidique. Base aérobie.",
  },
  {
    wahoo_id: "endurance_1_5",
    wahoo_name: "Endurance 1.5",
    aliases: ["Endurance 1.5", "Endurance 90", "Endurance 90min", "Endurance One Point Five"],
    tags: ["endurance", "z2", "aerobic", "base", "ironman"],
    category: "Z2_ENDURANCE",
    sport: "bike",
    duration_min_range: [75, 105],
    intensity_profile: "low",
    primary_axis: "VLAMAX_DOWN",
    secondary_axis: "ENDURANCE_BASE",
    vlamax_effect: "down",
    tte_effect: "up",
    risk_level: 0,
    staff_annotation: "Longue sortie Z2 pour maximiser l'adaptation aérobie et baisser le VLamax. Pilier IM/70.3.",
  },
  {
    wahoo_id: "endurance_2_0",
    wahoo_name: "Endurance 2.0",
    aliases: ["Endurance 2.0", "Endurance 2", "Endurance 120", "Endurance 2h", "Endurance Two"],
    tags: ["endurance", "z2", "aerobic", "base", "ironman", "long"],
    category: "Z2_ENDURANCE",
    sport: "bike",
    duration_min_range: [105, 135],
    intensity_profile: "low",
    primary_axis: "ENDURANCE_BASE",
    secondary_axis: "VLAMAX_DOWN",
    vlamax_effect: "down",
    tte_effect: "up",
    risk_level: 0,
    staff_annotation: "Sortie longue fondamentale de 2h. Pilier de la préparation longue distance.",
  },
  {
    wahoo_id: "novid_endurance",
    wahoo_name: "NoVid Endurance",
    aliases: ["NoVid Endurance", "NoVid Endurance Ride", "NoVid", "No Video Endurance", "Free Ride Endurance"],
    tags: ["endurance", "z2", "free", "flexible"],
    category: "Z2_ENDURANCE",
    sport: "bike",
    duration_min_range: [30, 120],
    intensity_profile: "low",
    primary_axis: "ENDURANCE_BASE",
    secondary_axis: "RECOVERY",
    vlamax_effect: "down",
    tte_effect: "neutral",
    risk_level: 0,
    staff_annotation: "Séance sans vidéo pour endurance libre. Flexibilité totale sur la durée.",
  },
  {
    wahoo_id: "foundation_ride",
    wahoo_name: "Foundation Ride",
    aliases: ["Foundation Ride", "Foundation", "Base Ride", "Aerobic Foundation"],
    tags: ["endurance", "z2", "base", "foundation"],
    category: "Z2_ENDURANCE",
    sport: "bike",
    duration_min_range: [45, 90],
    intensity_profile: "low",
    primary_axis: "ENDURANCE_BASE",
    vlamax_effect: "down",
    tte_effect: "neutral",
    risk_level: 0,
    staff_annotation: "Séance fondatrice Z2. Prépare le terrain pour les intensités spécifiques.",
  },

  // ─────────────────────────────────────────────────────
  // C) Z2_LONG
  // ─────────────────────────────────────────────────────
  {
    wahoo_id: "long_endurance_ride",
    wahoo_name: "Long Endurance Ride",
    aliases: ["Long Endurance", "Longer Endurance", "Long Endurance Ride", "Endurance 2.5", "Endurance 3.0", "Endurance 3h", "Endurance 150"],
    tags: ["endurance", "z2", "long", "ironman", "nutrition"],
    category: "Z2_LONG",
    sport: "bike",
    duration_min_range: [120, 240],
    intensity_profile: "low",
    primary_axis: "ENDURANCE_BASE",
    secondary_axis: "VLAMAX_DOWN",
    vlamax_effect: "down",
    tte_effect: "up",
    risk_level: 1,
    staff_annotation: "Sortie longue durée pour développer l'endurance fondamentale et l'oxydation lipidique. Opportunité de répétition nutritionnelle.",
    contraindications: ["Fatigue accumulée importante"],
  },
  {
    wahoo_id: "aerobic_base_builder",
    wahoo_name: "Aerobic Base Builder",
    aliases: ["Aerobic Base Builder", "Aerobic Base", "Base Builder", "Aerobic Builder"],
    tags: ["endurance", "z2", "base", "mitochondria"],
    category: "Z2_LONG",
    sport: "bike",
    duration_min_range: [90, 180],
    intensity_profile: "low",
    primary_axis: "ENDURANCE_BASE",
    secondary_axis: "VLAMAX_DOWN",
    vlamax_effect: "down",
    tte_effect: "up",
    risk_level: 0,
    staff_annotation: "Construction de base aérobie. Stimule les adaptations cellulaires fondamentales (mitochondries, capillarisation).",
  },

  // ─────────────────────────────────────────────────────
  // D) TEMPO_DURABILITY
  // ─────────────────────────────────────────────────────
  {
    wahoo_id: "sustained_tempo",
    wahoo_name: "Sustained Tempo",
    aliases: ["Sustained Tempo", "Tempo Sustained", "Long Tempo", "Tempo Block"],
    tags: ["tempo", "z3", "tte", "durability", "ironman"],
    category: "TEMPO_DURABILITY",
    sport: "bike",
    duration_min_range: [60, 120],
    intensity_profile: "moderate",
    primary_axis: "TTE_UP",
    vlamax_effect: "neutral",
    tte_effect: "up",
    risk_level: 1,
    staff_annotation: "Séance clé si TTE insuffisant pour l'objectif longue distance. Développe la durabilité proche du seuil.",
  },
  {
    wahoo_id: "tempo_varying_cadence",
    wahoo_name: "Tempo With Varying Cadence",
    aliases: ["Tempo With Varying Cadence", "Tempo Varying Cadence", "Varying Cadence Tempo", "Cadence Tempo"],
    tags: ["tempo", "z3", "tte", "cadence", "technique"],
    category: "TEMPO_DURABILITY",
    sport: "bike",
    duration_min_range: [60, 90],
    intensity_profile: "moderate",
    primary_axis: "TTE_UP",
    secondary_axis: "VLAMAX_DOWN",
    vlamax_effect: "down",
    tte_effect: "up",
    risk_level: 1,
    staff_annotation: "Développe la durabilité au seuil avec variations de cadence pour l'économie motrice. Double bénéfice TTE + VLamax.",
  },
  {
    wahoo_id: "sweet_spot",
    wahoo_name: "Sweet Spot",
    aliases: ["Sweet Spot", "Sweetspot", "Sweet Spot Progression", "SST", "Sweet Spot Training"],
    tags: ["sweetspot", "z3-z4", "tte", "ftp"],
    category: "TEMPO_DURABILITY",
    sport: "bike",
    duration_min_range: [60, 90],
    intensity_profile: "moderate",
    primary_axis: "TTE_UP",
    vlamax_effect: "neutral",
    tte_effect: "up",
    risk_level: 1,
    staff_annotation: "Augmente la durabilité proche du seuil sans surcharge excessive. Zone 88-94% FTP.",
  },
  {
    wahoo_id: "sweet_spot_progressive",
    wahoo_name: "Sweet Spot Progressif",
    aliases: ["Sweet Spot Progressif", "Progressive Sweet Spot", "SST Progressive", "Ramp Sweet Spot"],
    tags: ["sweetspot", "z3-z4", "tte", "progressive"],
    category: "TEMPO_DURABILITY",
    sport: "bike",
    duration_min_range: [60, 90],
    intensity_profile: "moderate",
    primary_axis: "TTE_UP",
    vlamax_effect: "neutral",
    tte_effect: "up",
    risk_level: 1,
    staff_annotation: "Montée progressive vers le sweet spot pour améliorer la tolérance au seuil.",
  },
  {
    wahoo_id: "over_under_intervals",
    wahoo_name: "Over-Under Intervals",
    aliases: ["Over-Under", "Over Under", "Over-Under Intervals", "Criss Cross", "Under Over"],
    tags: ["threshold", "tte", "lactate", "tolerance"],
    category: "TEMPO_DURABILITY",
    sport: "bike",
    duration_min_range: [60, 90],
    intensity_profile: "moderate",
    primary_axis: "TTE_UP",
    secondary_axis: "THRESHOLD_MLSS",
    vlamax_effect: "neutral",
    tte_effect: "up",
    risk_level: 2,
    staff_annotation: "Alternance seuil/sur-seuil. Améliore la capacité à gérer les variations autour du seuil et le recyclage lactate.",
    contraindications: ["Fatigue élevée", "Débutant seuil"],
  },

  // ─────────────────────────────────────────────────────
  // E) FORCE_ENDURANCE
  // ─────────────────────────────────────────────────────
  {
    wahoo_id: "tempo_low_cadence",
    wahoo_name: "Tempo Low Cadence",
    aliases: ["Tempo Low Cadence", "Low Cadence Tempo", "Torque Tempo", "Low RPM Tempo", "Force Tempo"],
    tags: ["tempo", "force", "low-cadence", "vlamax", "ironman"],
    category: "FORCE_ENDURANCE",
    sport: "bike",
    duration_min_range: [60, 90],
    intensity_profile: "moderate",
    primary_axis: "VLAMAX_DOWN",
    secondary_axis: "TTE_UP",
    vlamax_effect: "down",
    tte_effect: "up",
    risk_level: 1,
    staff_annotation: "Excellent levier pour abaisser VLamax et améliorer l'économie mécanique. Cadence 60-70 rpm.",
    contraindications: ["Problèmes genoux", "Fatigue musculaire élevée"],
  },
  {
    wahoo_id: "strength_endurance",
    wahoo_name: "Strength Endurance",
    aliases: ["Strength Endurance", "Muscular Endurance", "Torque", "Force Endurance", "Big Gear Work"],
    tags: ["force", "endurance", "low-cadence", "muscular"],
    category: "FORCE_ENDURANCE",
    sport: "bike",
    duration_min_range: [60, 90],
    intensity_profile: "moderate",
    primary_axis: "FORCE_ENDURANCE",
    secondary_axis: "VLAMAX_DOWN",
    vlamax_effect: "down",
    tte_effect: "up",
    risk_level: 2,
    staff_annotation: "Travail de force-endurance. Développe la résistance musculaire et favorise le recrutement des fibres lentes.",
    contraindications: ["Problèmes articulaires", "Fatigue neuromusculaire"],
  },
  {
    wahoo_id: "torque_intervals",
    wahoo_name: "Torque Intervals",
    aliases: ["Torque Intervals", "Torque", "Big Gear Intervals", "Force Intervals"],
    tags: ["force", "intervals", "low-cadence"],
    category: "FORCE_ENDURANCE",
    sport: "bike",
    duration_min_range: [45, 75],
    intensity_profile: "moderate",
    primary_axis: "FORCE_ENDURANCE",
    vlamax_effect: "down",
    tte_effect: "neutral",
    risk_level: 2,
    staff_annotation: "Intervalles de force à basse cadence. Stress musculaire élevé mais excellent pour l'économie.",
    contraindications: ["Genoux fragiles", "Fatigue musculaire"],
  },

  // ─────────────────────────────────────────────────────
  // F) THRESHOLD_MLSS
  // ─────────────────────────────────────────────────────
  {
    wahoo_id: "threshold",
    wahoo_name: "Threshold",
    aliases: ["Threshold", "Long Threshold", "FTP Intervals", "Threshold Intervals", "LT Intervals"],
    tags: ["threshold", "ftp", "tte", "z4"],
    category: "THRESHOLD_MLSS",
    sport: "bike",
    duration_min_range: [45, 90],
    intensity_profile: "high",
    primary_axis: "TTE_UP",
    secondary_axis: "THRESHOLD_MLSS",
    vlamax_effect: "neutral",
    tte_effect: "up",
    risk_level: 2,
    staff_annotation: "Travail au seuil lactique. Développe le TTE et la tolérance au lactate. Stress énergétique élevé.",
    contraindications: ["Fatigue élevée", "Glycogène bas"],
  },
  {
    wahoo_id: "team_scream",
    wahoo_name: "Team Scream",
    aliases: ["Team Scream", "TeamScream"],
    tags: ["threshold", "hard", "group", "intense"],
    category: "THRESHOLD_MLSS",
    sport: "bike",
    duration_min_range: [60, 90],
    intensity_profile: "high",
    primary_axis: "THRESHOLD_MLSS",
    secondary_axis: "VO2_UP",
    vlamax_effect: "up",
    tte_effect: "up",
    risk_level: 3,
    staff_annotation: "Séance collective intense. Impact glycolytique majeur. Usage limité pour objectifs longue distance.",
    contraindications: ["VLamax déjà élevé", "Objectif Ironman/70.3", "Fatigue accumulée"],
  },
  {
    wahoo_id: "the_shovel",
    wahoo_name: "The Shovel",
    aliases: ["The Shovel", "Shovel"],
    tags: ["threshold", "hard", "intense", "suffer"],
    category: "THRESHOLD_MLSS",
    sport: "bike",
    duration_min_range: [60, 75],
    intensity_profile: "high",
    primary_axis: "THRESHOLD_MLSS",
    secondary_axis: "HIGH_RISK",
    vlamax_effect: "up",
    tte_effect: "down",
    risk_level: 3,
    staff_annotation: "Séance très intense. Développe la puissance mais augmente significativement le VLamax.",
    contraindications: ["VLamax élevé", "Objectif endurance", "Fatigue accumulée"],
  },
  {
    wahoo_id: "the_hunted",
    wahoo_name: "The Hunted",
    aliases: ["The Hunted", "Hunted"],
    tags: ["threshold", "race-sim", "intense"],
    category: "THRESHOLD_MLSS",
    sport: "bike",
    duration_min_range: [60, 90],
    intensity_profile: "high",
    primary_axis: "THRESHOLD_MLSS",
    vlamax_effect: "neutral",
    tte_effect: "up",
    risk_level: 2,
    staff_annotation: "Simulation de course avec efforts au seuil. Bon pour le TTE mais stress élevé.",
    contraindications: ["Fatigue importante"],
  },

  // ─────────────────────────────────────────────────────
  // G) VO2_MAP
  // ─────────────────────────────────────────────────────
  {
    wahoo_id: "vo2_intervals",
    wahoo_name: "VO2 Max Intervals",
    aliases: ["VO2 Max Intervals", "VO2 Intervals", "VO2max", "VO2 Max", "MAP Intervals"],
    tags: ["vo2max", "map", "z5", "high-intensity"],
    category: "VO2_MAP",
    sport: "bike",
    duration_min_range: [45, 75],
    intensity_profile: "high",
    primary_axis: "VO2_UP",
    vlamax_effect: "up",
    tte_effect: "neutral",
    risk_level: 2,
    staff_annotation: "Développe la cylindrée aérobie mais peut augmenter VLamax si surutilisé. Usage contrôlé.",
    contraindications: ["VLamax déjà élevé", "Fatigue centrale élevée", "Objectif IM"],
  },
  {
    wahoo_id: "a_very_dark_place",
    wahoo_name: "A Very Dark Place",
    aliases: ["A Very Dark Place", "AVDP", "Very Dark Place", "Dark Place"],
    tags: ["vo2max", "hard", "suffer", "mental"],
    category: "VO2_MAP",
    sport: "bike",
    duration_min_range: [60, 75],
    intensity_profile: "high",
    primary_axis: "VO2_UP",
    secondary_axis: "HIGH_RISK",
    vlamax_effect: "up",
    tte_effect: "neutral",
    risk_level: 3,
    staff_annotation: "Séance extrêmement difficile. Développe le VO2max et la résilience mentale. Usage très limité.",
    contraindications: ["VLamax élevé", "Fatigue", "Objectif longue distance"],
  },
  {
    wahoo_id: "the_rookie",
    wahoo_name: "The Rookie",
    aliases: ["The Rookie", "Rookie"],
    tags: ["vo2max", "intervals", "accessible"],
    category: "VO2_MAP",
    sport: "bike",
    duration_min_range: [45, 60],
    intensity_profile: "high",
    primary_axis: "VO2_UP",
    vlamax_effect: "up",
    tte_effect: "neutral",
    risk_level: 2,
    staff_annotation: "Introduction aux intervalles VO2max. Plus accessible que les séances avancées.",
    contraindications: ["VLamax très élevé"],
  },
  {
    wahoo_id: "half_is_easy",
    wahoo_name: "Half is Easy",
    aliases: ["Half is Easy", "Half Is Easy", "HIE"],
    tags: ["vo2max", "half", "mixed"],
    category: "VO2_MAP",
    sport: "bike",
    duration_min_range: [60, 75],
    intensity_profile: "high",
    primary_axis: "VO2_UP",
    vlamax_effect: "up",
    tte_effect: "neutral",
    risk_level: 2,
    staff_annotation: "Séance VO2max avec première moitié progressive. Stress aérobie élevé.",
    contraindications: ["VLamax déjà élevé", "Fatigue"],
  },
  {
    wahoo_id: "revolver",
    wahoo_name: "Revolver",
    aliases: ["Revolver", "The Revolver"],
    tags: ["vo2max", "repeats", "intense"],
    category: "VO2_MAP",
    sport: "bike",
    duration_min_range: [45, 60],
    intensity_profile: "high",
    primary_axis: "VO2_UP",
    vlamax_effect: "up",
    tte_effect: "neutral",
    risk_level: 2,
    staff_annotation: "Répétitions VO2max courtes et intenses. Développe la capacité de répétition.",
    contraindications: ["VLamax élevé", "Fatigue neuromusculaire"],
  },
  {
    wahoo_id: "nine_hammers",
    wahoo_name: "Nine Hammers",
    aliases: ["Nine Hammers", "9 Hammers", "NineHammers"],
    tags: ["vo2max", "iconic", "hard", "suffer"],
    category: "VO2_MAP",
    sport: "bike",
    duration_min_range: [60, 75],
    intensity_profile: "mixed",
    primary_axis: "HIGH_RISK",
    secondary_axis: "VO2_UP",
    vlamax_effect: "up",
    tte_effect: "down",
    risk_level: 3,
    staff_annotation: "Séance emblématique extrêmement agressive. À éviter si TTE faible ou objectif longue distance.",
    contraindications: ["Objectif Ironman", "Fatigue élevée", "Profil glycolytique"],
  },
  {
    wahoo_id: "there_is_no_try",
    wahoo_name: "There Is No Try",
    aliases: ["There Is No Try", "No Try", "TINT"],
    tags: ["vo2max", "hard", "star-wars"],
    category: "VO2_MAP",
    sport: "bike",
    duration_min_range: [60, 75],
    intensity_profile: "high",
    primary_axis: "VO2_UP",
    vlamax_effect: "up",
    tte_effect: "neutral",
    risk_level: 2,
    staff_annotation: "Séance VO2max intense. Développe le plafond aérobie avec stress glycolytique.",
    contraindications: ["VLamax déjà élevé"],
  },

  // ─────────────────────────────────────────────────────
  // H) ANAEROBIC_AC
  // ─────────────────────────────────────────────────────
  {
    wahoo_id: "short_kom",
    wahoo_name: "Short KOM",
    aliases: ["Short KOM", "KOM", "KOM Training Session", "Short KOM Training", "King of Mountain"],
    tags: ["anaerobic", "ac", "short", "power"],
    category: "ANAEROBIC_AC",
    sport: "bike",
    duration_min_range: [45, 60],
    intensity_profile: "high",
    primary_axis: "HIGH_RISK",
    secondary_axis: "VO2_UP",
    vlamax_effect: "up",
    tte_effect: "down",
    risk_level: 3,
    staff_annotation: "Effort court et intense. Stimule le VO₂max mais augmente VLamax significativement.",
    contraindications: ["Objectif longue distance", "VLamax déjà élevé"],
  },
  {
    wahoo_id: "violator",
    wahoo_name: "Violator",
    aliases: ["Violator", "The Violator"],
    tags: ["anaerobic", "ac", "extreme", "suffer"],
    category: "ANAEROBIC_AC",
    sport: "bike",
    duration_min_range: [45, 60],
    intensity_profile: "high",
    primary_axis: "HIGH_RISK",
    vlamax_effect: "up",
    tte_effect: "down",
    risk_level: 3,
    staff_annotation: "Séance anaérobie extrême. Impact glycolytique maximal. Usage très limité pour endurance.",
    contraindications: ["Objectif IM/70.3/Marathon", "VLamax > 0.50", "Fatigue"],
  },
  {
    wahoo_id: "the_trick",
    wahoo_name: "The Trick",
    aliases: ["The Trick", "Trick"],
    tags: ["anaerobic", "mixed", "hard"],
    category: "ANAEROBIC_AC",
    sport: "bike",
    duration_min_range: [45, 60],
    intensity_profile: "high",
    primary_axis: "HIGH_RISK",
    vlamax_effect: "up",
    tte_effect: "down",
    risk_level: 3,
    staff_annotation: "Séance anaérobie avec variations. Augmente VLamax. Non recommandé pour longue distance.",
    contraindications: ["Objectif endurance", "VLamax élevé"],
  },
  {
    wahoo_id: "ac_intervals",
    wahoo_name: "AC Intervals",
    aliases: ["AC Intervals", "AC", "Anaerobic Capacity", "Anaerobic Intervals"],
    tags: ["anaerobic", "ac", "power", "glycolytic"],
    category: "ANAEROBIC_AC",
    sport: "bike",
    duration_min_range: [45, 60],
    intensity_profile: "high",
    primary_axis: "HIGH_RISK",
    vlamax_effect: "up",
    tte_effect: "down",
    risk_level: 3,
    staff_annotation: "Capacité Anaérobie. Augmente VLamax significativement. Usage très limité pour longue distance.",
    contraindications: ["Objectif longue distance", "VLamax > seuil cible"],
  },

  // ─────────────────────────────────────────────────────
  // I) NEUROMUSCULAR_NM
  // ─────────────────────────────────────────────────────
  {
    wahoo_id: "nm_sprints",
    wahoo_name: "NM Sprints",
    aliases: ["NM Sprints", "NM", "Neuromuscular", "Sprints", "Sprint", "Sprint Intervals", "Neuromuscular Sprints"],
    tags: ["nm", "sprint", "power", "explosive"],
    category: "NEUROMUSCULAR_NM",
    sport: "bike",
    duration_min_range: [30, 45],
    intensity_profile: "high",
    primary_axis: "HIGH_RISK",
    vlamax_effect: "up",
    tte_effect: "down",
    risk_level: 3,
    staff_annotation: "Sprints neuromusculaires. Développe la puissance explosive mais impact VLamax élevé.",
    contraindications: ["Fatigue neuromusculaire", "Objectif ultra-endurance"],
  },
  {
    wahoo_id: "power_station",
    wahoo_name: "Power Station",
    aliases: ["Power Station", "PowerStation"],
    tags: ["nm", "power", "mixed"],
    category: "NEUROMUSCULAR_NM",
    sport: "bike",
    duration_min_range: [45, 60],
    intensity_profile: "high",
    primary_axis: "HIGH_RISK",
    vlamax_effect: "up",
    tte_effect: "neutral",
    risk_level: 2,
    staff_annotation: "Travail de puissance mixte. Développe la capacité de génération de force.",
    contraindications: ["Fatigue élevée"],
  },
  {
    wahoo_id: "cadence_builds",
    wahoo_name: "Cadence Builds",
    aliases: ["Cadence Builds", "Cadence Drills", "High Cadence", "Spin-Ups", "Leg Speed"],
    tags: ["cadence", "technique", "neuromuscular"],
    category: "NEUROMUSCULAR_NM",
    sport: "bike",
    duration_min_range: [30, 60],
    intensity_profile: "moderate",
    primary_axis: "ENDURANCE_BASE",
    vlamax_effect: "neutral",
    tte_effect: "neutral",
    risk_level: 1,
    staff_annotation: "Travail de cadence et technique de pédalage. Améliore l'économie motrice.",
  },

  // ─────────────────────────────────────────────────────
  // RUNNING - ENDURANCE
  // ─────────────────────────────────────────────────────
  {
    wahoo_id: "run_endurance_base",
    wahoo_name: "Run Endurance Base",
    aliases: ["Run Endurance", "Easy Run", "Endurance Run", "Base Run", "Z2 Run"],
    tags: ["run", "endurance", "z2", "base"],
    category: "Z2_ENDURANCE",
    sport: "run",
    duration_min_range: [45, 90],
    intensity_profile: "low",
    primary_axis: "ENDURANCE_BASE",
    secondary_axis: "VLAMAX_DOWN",
    vlamax_effect: "down",
    tte_effect: "neutral",
    risk_level: 0,
    staff_annotation: "Footing fondamental pour construire la base aérobie en course à pied.",
  },
  {
    wahoo_id: "run_long",
    wahoo_name: "Long Run",
    aliases: ["Long Run", "Sortie Longue", "SL", "Long Jog", "Endurance Long Run"],
    tags: ["run", "long", "endurance", "marathon", "ironman"],
    category: "Z2_LONG",
    sport: "run",
    duration_min_range: [75, 180],
    intensity_profile: "low",
    primary_axis: "ENDURANCE_BASE",
    secondary_axis: "VLAMAX_DOWN",
    vlamax_effect: "down",
    tte_effect: "up",
    risk_level: 1,
    staff_annotation: "Sortie longue CAP. Essentielle pour marathon et triathlon longue distance.",
    contraindications: ["Risque blessure CAP élevé", "Fatigue musculaire importante"],
  },
  {
    wahoo_id: "run_tempo",
    wahoo_name: "Run Tempo",
    aliases: ["Run Tempo", "Tempo Run", "Threshold Run", "Allure Spécifique"],
    tags: ["run", "tempo", "tte", "threshold"],
    category: "TEMPO_DURABILITY",
    sport: "run",
    duration_min_range: [45, 75],
    intensity_profile: "moderate",
    primary_axis: "TTE_UP",
    vlamax_effect: "neutral",
    tte_effect: "up",
    risk_level: 1,
    staff_annotation: "Séance tempo pour améliorer la durabilité au seuil en CAP.",
  },
  {
    wahoo_id: "run_threshold_intervals",
    wahoo_name: "Run Threshold Intervals",
    aliases: ["Run Threshold Intervals", "Threshold Intervals Run", "Seuil CAP", "LT Run"],
    tags: ["run", "threshold", "intervals", "tte"],
    category: "THRESHOLD_MLSS",
    sport: "run",
    duration_min_range: [45, 60],
    intensity_profile: "high",
    primary_axis: "TTE_UP",
    secondary_axis: "VO2_UP",
    vlamax_effect: "neutral",
    tte_effect: "up",
    risk_level: 2,
    staff_annotation: "Intervalles au seuil. Améliore le TTE mais stress musculaire élevé.",
    contraindications: ["Risque blessure CAP", "Fatigue accumulée"],
  },
  {
    wahoo_id: "run_recovery",
    wahoo_name: "Recovery Run",
    aliases: ["Recovery Run", "Easy Recovery Run", "Footing Récup", "Décrassage"],
    tags: ["run", "recovery", "easy"],
    category: "RECOVERY",
    sport: "run",
    duration_min_range: [20, 40],
    intensity_profile: "low",
    primary_axis: "RECOVERY",
    vlamax_effect: "neutral",
    tte_effect: "neutral",
    risk_level: 0,
    staff_annotation: "Footing récupération. Maintient la mobilité sans stress supplémentaire.",
  },
  {
    wahoo_id: "run_intervals_vo2",
    wahoo_name: "Run VO2 Intervals",
    aliases: ["Run VO2 Intervals", "VO2 Run", "VMA", "Fractionné Court", "30/30"],
    tags: ["run", "vo2max", "intervals", "vma"],
    category: "VO2_MAP",
    sport: "run",
    duration_min_range: [40, 60],
    intensity_profile: "high",
    primary_axis: "VO2_UP",
    vlamax_effect: "up",
    tte_effect: "neutral",
    risk_level: 2,
    staff_annotation: "Intervalles VMA/VO2max en course à pied. Développe le plafond aérobie.",
    contraindications: ["Risque blessure élevé", "VLamax déjà élevé"],
  },
];

// ============= MATCHING FUNCTIONS =============

/**
 * Find a workout by exact name or alias (case-insensitive)
 */
export function findWahooWorkoutByName(name: string): WahooWorkoutMapping | undefined {
  const normalizedName = name.toLowerCase().trim();
  
  // Try exact match on wahoo_name first
  const exactMatch = WAHOO_WORKOUTS.find(w => 
    w.wahoo_name.toLowerCase() === normalizedName
  );
  if (exactMatch) return exactMatch;
  
  // Try alias match
  const aliasMatch = WAHOO_WORKOUTS.find(w =>
    w.aliases.some(alias => alias.toLowerCase() === normalizedName)
  );
  if (aliasMatch) return aliasMatch;
  
  // Try partial match (contains)
  const partialMatch = WAHOO_WORKOUTS.find(w =>
    w.aliases.some(alias => 
      normalizedName.includes(alias.toLowerCase()) || 
      alias.toLowerCase().includes(normalizedName)
    )
  );
  if (partialMatch) return partialMatch;
  
  return undefined;
}

/**
 * Find workout by ID
 */
export function findWahooWorkoutById(id: string): WahooWorkoutMapping | undefined {
  return WAHOO_WORKOUTS.find(w => w.wahoo_id === id);
}

/**
 * Check if a session name matches any known Wahoo workout
 */
export function matchWahooSession(sessionText: string): {
  matched: boolean;
  workout: WahooWorkoutMapping | null;
  confidence: "exact" | "alias" | "partial" | "none";
} {
  const normalizedText = sessionText.toLowerCase().trim();
  
  // Exact match on name
  const exactMatch = WAHOO_WORKOUTS.find(w => 
    w.wahoo_name.toLowerCase() === normalizedText
  );
  if (exactMatch) {
    return { matched: true, workout: exactMatch, confidence: "exact" };
  }
  
  // Exact match on alias
  const aliasMatch = WAHOO_WORKOUTS.find(w =>
    w.aliases.some(alias => alias.toLowerCase() === normalizedText)
  );
  if (aliasMatch) {
    return { matched: true, workout: aliasMatch, confidence: "alias" };
  }
  
  // Partial match (session contains alias or alias contains session)
  const partialMatch = WAHOO_WORKOUTS.find(w =>
    w.aliases.some(alias => {
      const normalizedAlias = alias.toLowerCase();
      return normalizedText.includes(normalizedAlias) || 
             normalizedAlias.includes(normalizedText);
    })
  );
  if (partialMatch) {
    return { matched: true, workout: partialMatch, confidence: "partial" };
  }
  
  return { matched: false, workout: null, confidence: "none" };
}

/**
 * Filter workouts by category
 */
export function getWorkoutsByCategory(category: WahooCategory): WahooWorkoutMapping[] {
  return WAHOO_WORKOUTS.filter(w => w.category === category);
}

/**
 * Filter workouts by tag
 */
export function getWorkoutsByTag(tag: string): WahooWorkoutMapping[] {
  const normalizedTag = tag.toLowerCase();
  return WAHOO_WORKOUTS.filter(w => 
    w.tags?.some(t => t.toLowerCase() === normalizedTag)
  );
}

/**
 * Filter workouts by primary axis
 */
export function getWorkoutsByAxis(axis: WahooPhysioAxis): WahooWorkoutMapping[] {
  return WAHOO_WORKOUTS.filter(w => w.primary_axis === axis || w.secondary_axis === axis);
}

/**
 * Filter workouts by sport
 */
export function getWorkoutsBySport(sport: WahooSport): WahooWorkoutMapping[] {
  return WAHOO_WORKOUTS.filter(w => w.sport === sport);
}

/**
 * Filter workouts by maximum risk level
 */
export function getWorkoutsByMaxRisk(maxRisk: 0 | 1 | 2 | 3): WahooWorkoutMapping[] {
  return WAHOO_WORKOUTS.filter(w => w.risk_level <= maxRisk);
}

/**
 * Check if a workout has contraindications for a given objective
 */
export function hasContraindicationsForObjective(
  workout: WahooWorkoutMapping,
  objectif: string
): boolean {
  if (!workout.contraindications) return false;
  
  const normalizedObjectif = objectif.toLowerCase();
  
  return workout.contraindications.some(contra => {
    const normalizedContra = contra.toLowerCase();
    
    // Check for Ironman/IM
    if ((normalizedContra.includes("ironman") || normalizedContra.includes("im")) && 
        (normalizedObjectif.includes("im") || normalizedObjectif === "ironman")) {
      return true;
    }
    
    // Check for 70.3/Half
    if (normalizedContra.includes("70.3") && 
        (normalizedObjectif.includes("70.3") || normalizedObjectif.includes("703") || normalizedObjectif === "half")) {
      return true;
    }
    
    // Check for Marathon
    if (normalizedContra.includes("marathon") && normalizedObjectif.includes("marathon")) {
      return true;
    }
    
    // Check for long distance generic
    if (normalizedContra.includes("longue distance") && 
        ["im", "ironman", "marathon", "70.3", "703", "half", "ultra", "traillong"].some(ld => 
          normalizedObjectif.includes(ld)
        )) {
      return true;
    }
    
    // Check for endurance generic
    if (normalizedContra.includes("endurance") && 
        ["im", "ironman", "marathon", "70.3", "703", "half", "ultra"].some(ld => 
          normalizedObjectif.includes(ld)
        )) {
      return true;
    }
    
    return false;
  });
}

/**
 * Get safe workouts for a given context
 */
export function getSafeWorkoutsForContext(params: {
  objectif: string;
  vlamaxHigh: boolean;
  fatigueHigh: boolean;
  sport?: WahooSport;
}): WahooWorkoutMapping[] {
  const { objectif, vlamaxHigh, fatigueHigh, sport } = params;
  
  let workouts = WAHOO_WORKOUTS;
  
  // Filter by sport if specified
  if (sport) {
    workouts = workouts.filter(w => w.sport === sport);
  }
  
  // Filter out high risk if fatigue is high
  if (fatigueHigh) {
    workouts = workouts.filter(w => w.risk_level <= 1);
  }
  
  // Filter out VLamax-increasing workouts if VLamax is already high
  if (vlamaxHigh) {
    workouts = workouts.filter(w => w.vlamax_effect !== "up");
  }
  
  // Filter out workouts with contraindications for the objective
  workouts = workouts.filter(w => !hasContraindicationsForObjective(w, objectif));
  
  return workouts;
}
