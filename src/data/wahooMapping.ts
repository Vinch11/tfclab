// src/data/wahooMapping.ts

export type WahooPhysioAxis =
  | "VLAMAX_DOWN"
  | "TTE_UP"
  | "VO2_UP"
  | "ENDURANCE_BASE"
  | "RECOVERY"
  | "HIGH_RISK";

export type WahooSport = "bike" | "run";

export interface WahooWorkoutMapping {
  wahoo_id: string;
  wahoo_name: string;
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

// Helper pour obtenir le label lisible d'un axe
export function getAxisLabel(axis: WahooPhysioAxis): string {
  const labels: Record<WahooPhysioAxis, string> = {
    VLAMAX_DOWN: "VLamax ↓",
    TTE_UP: "TTE ↑",
    VO2_UP: "VO₂max ↑",
    ENDURANCE_BASE: "Endurance fondamentale",
    RECOVERY: "Récupération",
    HIGH_RISK: "Haute intensité / Risque élevé",
  };
  return labels[axis];
}

// Helper pour obtenir la couleur d'un niveau de risque
export function getRiskColor(level: 0 | 1 | 2 | 3): string {
  const colors: Record<number, string> = {
    0: "text-green-600 dark:text-green-400",
    1: "text-yellow-600 dark:text-yellow-400",
    2: "text-orange-600 dark:text-orange-400",
    3: "text-red-600 dark:text-red-400",
  };
  return colors[level];
}

// Helper pour obtenir le label d'un niveau de risque
export function getRiskLabel(level: 0 | 1 | 2 | 3): string {
  const labels: Record<number, string> = {
    0: "Très faible",
    1: "Modéré",
    2: "Élevé",
    3: "Très élevé",
  };
  return labels[level];
}

export const WAHOO_WORKOUTS: WahooWorkoutMapping[] = [
  // ─────────────────────────────
  // ENDURANCE / VLamax ↓
  // ─────────────────────────────
  {
    wahoo_id: "endurance_1",
    wahoo_name: "Endurance 1.0",
    sport: "bike",
    duration_min_range: [45, 90],
    intensity_profile: "low",
    primary_axis: "VLAMAX_DOWN",
    secondary_axis: "ENDURANCE_BASE",
    vlamax_effect: "down",
    tte_effect: "neutral",
    risk_level: 0,
    staff_annotation:
      "Séance idéale pour réduire la dépendance glycolytique et améliorer l'oxydation lipidique.",
  },
  {
    wahoo_id: "endurance_1_5",
    wahoo_name: "Endurance 1.5",
    sport: "bike",
    duration_min_range: [60, 120],
    intensity_profile: "low",
    primary_axis: "VLAMAX_DOWN",
    secondary_axis: "ENDURANCE_BASE",
    vlamax_effect: "down",
    tte_effect: "up",
    risk_level: 0,
    staff_annotation:
      "Longue sortie Z2 pour maximiser l'adaptation aérobie et baisser le VLamax.",
  },
  {
    wahoo_id: "endurance_2",
    wahoo_name: "Endurance 2.0",
    sport: "bike",
    duration_min_range: [90, 180],
    intensity_profile: "low",
    primary_axis: "ENDURANCE_BASE",
    secondary_axis: "VLAMAX_DOWN",
    vlamax_effect: "down",
    tte_effect: "up",
    risk_level: 0,
    staff_annotation:
      "Sortie longue fondamentale. Pilier de la préparation longue distance.",
  },
  {
    wahoo_id: "tempo_low_cadence",
    wahoo_name: "Tempo Low Cadence",
    sport: "bike",
    duration_min_range: [60, 90],
    intensity_profile: "moderate",
    primary_axis: "VLAMAX_DOWN",
    secondary_axis: "TTE_UP",
    vlamax_effect: "down",
    tte_effect: "up",
    risk_level: 1,
    staff_annotation:
      "Excellent levier pour abaisser VLamax et améliorer l'économie mécanique.",
  },
  {
    wahoo_id: "long_endurance_ride",
    wahoo_name: "Long Endurance Ride",
    sport: "bike",
    duration_min_range: [120, 240],
    intensity_profile: "low",
    primary_axis: "ENDURANCE_BASE",
    secondary_axis: "VLAMAX_DOWN",
    vlamax_effect: "down",
    tte_effect: "up",
    risk_level: 0,
    staff_annotation:
      "Sortie longue durée pour développer l'endurance fondamentale et l'oxydation lipidique.",
  },

  // ─────────────────────────────
  // TTE ↑
  // ─────────────────────────────
  {
    wahoo_id: "sweet_spot",
    wahoo_name: "Sweet Spot",
    sport: "bike",
    duration_min_range: [60, 90],
    intensity_profile: "moderate",
    primary_axis: "TTE_UP",
    vlamax_effect: "neutral",
    tte_effect: "up",
    risk_level: 1,
    staff_annotation:
      "Augmente la durabilité proche du seuil sans surcharge excessive.",
  },
  {
    wahoo_id: "sustained_tempo",
    wahoo_name: "Sustained Tempo",
    sport: "bike",
    duration_min_range: [75, 120],
    intensity_profile: "moderate",
    primary_axis: "TTE_UP",
    vlamax_effect: "neutral",
    tte_effect: "up",
    risk_level: 1,
    staff_annotation:
      "Séance clé si TTE insuffisant pour l'objectif longue distance.",
  },
  {
    wahoo_id: "tempo_varying_cadence",
    wahoo_name: "Tempo With Varying Cadence",
    sport: "bike",
    duration_min_range: [60, 90],
    intensity_profile: "moderate",
    primary_axis: "TTE_UP",
    secondary_axis: "VLAMAX_DOWN",
    vlamax_effect: "down",
    tte_effect: "up",
    risk_level: 1,
    staff_annotation:
      "Développe la durabilité au seuil avec variations de cadence pour l'économie motrice.",
  },
  {
    wahoo_id: "sweet_spot_progressive",
    wahoo_name: "Sweet Spot Progressif",
    sport: "bike",
    duration_min_range: [60, 90],
    intensity_profile: "moderate",
    primary_axis: "TTE_UP",
    vlamax_effect: "neutral",
    tte_effect: "up",
    risk_level: 1,
    staff_annotation:
      "Montée progressive vers le sweet spot pour améliorer la tolérance au seuil.",
  },

  // ─────────────────────────────
  // VO₂ ↑ (à encadrer)
  // ─────────────────────────────
  {
    wahoo_id: "vo2_intervals",
    wahoo_name: "VO2 Max Intervals",
    sport: "bike",
    duration_min_range: [45, 75],
    intensity_profile: "high",
    primary_axis: "VO2_UP",
    vlamax_effect: "up",
    tte_effect: "neutral",
    risk_level: 2,
    staff_annotation:
      "Développe la cylindrée aérobie mais peut augmenter VLamax si surutilisé.",
    contraindications: [
      "VLamax déjà élevé",
      "Fatigue centrale élevée",
    ],
  },
  {
    wahoo_id: "short_kom",
    wahoo_name: "Short KOM",
    sport: "bike",
    duration_min_range: [45, 60],
    intensity_profile: "high",
    primary_axis: "VO2_UP",
    vlamax_effect: "up",
    tte_effect: "down",
    risk_level: 2,
    staff_annotation:
      "Effort court et intense. Stimule le VO₂max mais augmente VLamax.",
    contraindications: [
      "Objectif longue distance",
      "VLamax déjà élevé",
    ],
  },
  {
    wahoo_id: "map_intervals",
    wahoo_name: "MAP Intervals",
    sport: "bike",
    duration_min_range: [45, 75],
    intensity_profile: "high",
    primary_axis: "VO2_UP",
    vlamax_effect: "up",
    tte_effect: "neutral",
    risk_level: 2,
    staff_annotation:
      "Puissance Maximale Aérobie. Utile en phase de développement mais à limiter pour IM/70.3.",
    contraindications: [
      "Fatigue accumulée",
      "Profil glycolytique",
    ],
  },

  // ─────────────────────────────
  // RÉCUPÉRATION
  // ─────────────────────────────
  {
    wahoo_id: "recovery_ride",
    wahoo_name: "Recovery Ride",
    sport: "bike",
    duration_min_range: [30, 60],
    intensity_profile: "low",
    primary_axis: "RECOVERY",
    vlamax_effect: "neutral",
    tte_effect: "neutral",
    risk_level: 0,
    staff_annotation:
      "Favorise l'absorption de la charge et limite le risque de surmenage.",
  },
  {
    wahoo_id: "easy_spin",
    wahoo_name: "Easy Spin",
    sport: "bike",
    duration_min_range: [20, 45],
    intensity_profile: "low",
    primary_axis: "RECOVERY",
    vlamax_effect: "neutral",
    tte_effect: "neutral",
    risk_level: 0,
    staff_annotation:
      "Récupération active légère. Idéal après une séance intense.",
  },
  {
    wahoo_id: "novid_endurance",
    wahoo_name: "NoVid Endurance",
    sport: "bike",
    duration_min_range: [30, 90],
    intensity_profile: "low",
    primary_axis: "RECOVERY",
    secondary_axis: "ENDURANCE_BASE",
    vlamax_effect: "neutral",
    tte_effect: "neutral",
    risk_level: 0,
    staff_annotation:
      "Séance sans vidéo pour récupération active ou endurance libre.",
  },
  {
    wahoo_id: "serbia_upside_down",
    wahoo_name: "Serbia Upside Down",
    sport: "bike",
    duration_min_range: [45, 60],
    intensity_profile: "low",
    primary_axis: "RECOVERY",
    vlamax_effect: "neutral",
    tte_effect: "neutral",
    risk_level: 0,
    staff_annotation:
      "Séance récupération active avec focus mental et technique.",
  },

  // ─────────────────────────────
  // HAUT RISQUE / ANAÉROBIE
  // ─────────────────────────────
  {
    wahoo_id: "nine_hammers",
    wahoo_name: "Nine Hammers",
    sport: "bike",
    duration_min_range: [60, 75],
    intensity_profile: "mixed",
    primary_axis: "HIGH_RISK",
    vlamax_effect: "up",
    tte_effect: "down",
    risk_level: 3,
    staff_annotation:
      "Séance extrêmement agressive. À éviter si TTE faible ou objectif longue distance.",
    contraindications: [
      "Objectif Ironman",
      "Fatigue élevée",
      "Profil glycolytique",
    ],
  },
  {
    wahoo_id: "the_shovel",
    wahoo_name: "The Shovel",
    sport: "bike",
    duration_min_range: [60, 75],
    intensity_profile: "high",
    primary_axis: "HIGH_RISK",
    vlamax_effect: "up",
    tte_effect: "down",
    risk_level: 3,
    staff_annotation:
      "Séance très intense. Développe la puissance mais augmente significativement VLamax.",
    contraindications: [
      "VLamax élevé",
      "Objectif endurance",
      "Fatigue accumulée",
    ],
  },
  {
    wahoo_id: "team_scream",
    wahoo_name: "Team Scream",
    sport: "bike",
    duration_min_range: [60, 90],
    intensity_profile: "high",
    primary_axis: "HIGH_RISK",
    secondary_axis: "VO2_UP",
    vlamax_effect: "up",
    tte_effect: "down",
    risk_level: 3,
    staff_annotation:
      "Séance collective intense. Impact glycolytique majeur.",
    contraindications: [
      "VLamax déjà élevé",
      "Objectif Ironman/70.3",
    ],
  },
  {
    wahoo_id: "ac_intervals",
    wahoo_name: "AC Intervals",
    sport: "bike",
    duration_min_range: [45, 60],
    intensity_profile: "high",
    primary_axis: "HIGH_RISK",
    vlamax_effect: "up",
    tte_effect: "down",
    risk_level: 3,
    staff_annotation:
      "Capacité Anaérobie. Augmente VLamax significativement. Usage limité pour longue distance.",
    contraindications: [
      "Objectif longue distance",
      "VLamax > seuil cible",
    ],
  },
  {
    wahoo_id: "nm_sprints",
    wahoo_name: "NM Sprints",
    sport: "bike",
    duration_min_range: [30, 45],
    intensity_profile: "high",
    primary_axis: "HIGH_RISK",
    vlamax_effect: "up",
    tte_effect: "down",
    risk_level: 2,
    staff_annotation:
      "Sprints neuromusculaires. Développe la puissance explosive mais impact VLamax.",
    contraindications: [
      "Fatigue neuromusculaire",
      "Objectif ultra-endurance",
    ],
  },

  // ─────────────────────────────
  // RUNNING - ENDURANCE
  // ─────────────────────────────
  {
    wahoo_id: "run_endurance_1",
    wahoo_name: "Run Endurance Base",
    sport: "run",
    duration_min_range: [45, 90],
    intensity_profile: "low",
    primary_axis: "ENDURANCE_BASE",
    secondary_axis: "VLAMAX_DOWN",
    vlamax_effect: "down",
    tte_effect: "neutral",
    risk_level: 0,
    staff_annotation:
      "Footing fondamental pour construire la base aérobie en course à pied.",
  },
  {
    wahoo_id: "run_long",
    wahoo_name: "Long Run",
    sport: "run",
    duration_min_range: [75, 150],
    intensity_profile: "low",
    primary_axis: "ENDURANCE_BASE",
    secondary_axis: "VLAMAX_DOWN",
    vlamax_effect: "down",
    tte_effect: "up",
    risk_level: 1,
    staff_annotation:
      "Sortie longue CAP. Essentielle pour marathon et triathlon longue distance.",
    contraindications: [
      "Risque blessure CAP élevé",
      "Fatigue musculaire importante",
    ],
  },

  // ─────────────────────────────
  // RUNNING - TEMPO / TTE
  // ─────────────────────────────
  {
    wahoo_id: "run_tempo",
    wahoo_name: "Run Tempo",
    sport: "run",
    duration_min_range: [45, 75],
    intensity_profile: "moderate",
    primary_axis: "TTE_UP",
    vlamax_effect: "neutral",
    tte_effect: "up",
    risk_level: 1,
    staff_annotation:
      "Séance tempo pour améliorer la durabilité au seuil en CAP.",
  },
  {
    wahoo_id: "run_threshold",
    wahoo_name: "Run Threshold Intervals",
    sport: "run",
    duration_min_range: [45, 60],
    intensity_profile: "high",
    primary_axis: "TTE_UP",
    secondary_axis: "VO2_UP",
    vlamax_effect: "neutral",
    tte_effect: "up",
    risk_level: 2,
    staff_annotation:
      "Intervalles au seuil. Améliore le TTE mais stress musculaire élevé.",
    contraindications: [
      "Risque blessure CAP",
      "Fatigue accumulée",
    ],
  },

  // ─────────────────────────────
  // RUNNING - RÉCUPÉRATION
  // ─────────────────────────────
  {
    wahoo_id: "run_recovery",
    wahoo_name: "Recovery Run",
    sport: "run",
    duration_min_range: [20, 40],
    intensity_profile: "low",
    primary_axis: "RECOVERY",
    vlamax_effect: "neutral",
    tte_effect: "neutral",
    risk_level: 0,
    staff_annotation:
      "Footing récupération. Maintient la mobilité sans stress supplémentaire.",
  },
];

// Recherche une séance par son ID
export function findWahooWorkoutById(id: string): WahooWorkoutMapping | undefined {
  return WAHOO_WORKOUTS.find((w) => w.wahoo_id === id);
}

// Recherche une séance par son nom (match partiel insensible à la casse)
export function findWahooWorkoutByName(name: string): WahooWorkoutMapping | undefined {
  const normalizedName = name.toLowerCase().trim();
  return WAHOO_WORKOUTS.find((w) =>
    w.wahoo_name.toLowerCase().includes(normalizedName) ||
    normalizedName.includes(w.wahoo_name.toLowerCase())
  );
}

// Filtre les séances par axe physiologique principal
export function getWorkoutsByAxis(axis: WahooPhysioAxis): WahooWorkoutMapping[] {
  return WAHOO_WORKOUTS.filter((w) => w.primary_axis === axis || w.secondary_axis === axis);
}

// Filtre les séances par sport
export function getWorkoutsBySport(sport: WahooSport): WahooWorkoutMapping[] {
  return WAHOO_WORKOUTS.filter((w) => w.sport === sport);
}

// Filtre les séances par niveau de risque maximum
export function getWorkoutsByMaxRisk(maxRisk: 0 | 1 | 2 | 3): WahooWorkoutMapping[] {
  return WAHOO_WORKOUTS.filter((w) => w.risk_level <= maxRisk);
}

// Vérifie si une séance a des contre-indications pour un objectif donné
export function hasContraindicationsForObjective(
  workout: WahooWorkoutMapping,
  objectif: string
): boolean {
  if (!workout.contraindications) return false;
  
  const normalizedObjectif = objectif.toLowerCase();
  return workout.contraindications.some((c) => {
    const normalizedContra = c.toLowerCase();
    if (normalizedContra.includes("ironman") && normalizedObjectif.includes("im")) return true;
    if (normalizedContra.includes("longue distance") && 
        (normalizedObjectif.includes("im") || normalizedObjectif.includes("marathon"))) return true;
    return false;
  });
}
