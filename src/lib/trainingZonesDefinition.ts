/**
 * DÉFINITION UNIQUE DES ZONES D'ENTRAÎNEMENT (Z1 → Z7)
 * Source unique de vérité pour toute l'application.
 * Alignée avec la méthodologie VLamax / TTE / endurance longue.
 * 
 * ⚠️ AUCUNE AUTRE DÉFINITION DE ZONE N'EST AUTORISÉE AILLEURS.
 */

export type ZoneId = "Z1" | "Z2" | "Z3" | "Z4a" | "Z4b" | "Z5" | "Z6" | "Z7";

export type MetabolicImpact = {
  vlamax: "↓↓" | "↓" | "neutre" | "↑" | "↑↑";
  tte: "↓" | "neutre" | "↑" | "↑↑";
  vo2max: "neutre" | "↑" | "↑↑";
  notes?: string;
};

export interface TrainingZoneDefinition {
  id: ZoneId;
  label: string;
  description: string;
  
  // Intensités (%)
  fcMax: { min: number; max: number } | null; // null pour Z7
  vma: { min: number; max: number };         // % VMA (course)
  ftp: { min: number; max: number };         // % FTP (vélo)
  cpRun: { min: number; max: number };       // % CP (puissance course - Stryd)
  
  // Pédagogie staff-grade
  parametresTravailles: string;
  positionSeuils: string;
  impactMetabolique: MetabolicImpact;
  
  // Durée typique
  durationTypique: string;
  
  // Couleurs (Tailwind)
  color: string;
  bgColor: string;
  borderColor: string;
}

/**
 * GRILLE OFFICIELLE Z1 → Z7
 * Méthodologie Two For Coaching Lab (VLamax – TTE – endurance spécifique)
 */
export const TRAINING_ZONES: TrainingZoneDefinition[] = [
  {
    id: "Z1",
    label: "Récupération",
    description: "Récupération, affûtage, échauffement, lactate de base",
    fcMax: { min: 0, max: 70 },
    vma: { min: 0, max: 60 },
    ftp: { min: 0, max: 55 },
    parametresTravailles: "Récupération, affûtage, échauffement, lactate de base",
    positionSeuils: "< SL1",
    impactMetabolique: {
      vlamax: "neutre",
      tte: "neutre",
      vo2max: "neutre",
      notes: "↓ stress, ↑ récupération, aucun stimulus VLamax"
    },
    durationTypique: "30-90 min",
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    borderColor: "border-blue-400/30"
  },
  {
    id: "Z2",
    label: "Endurance Fondamentale",
    description: "Lipolyse, volume mitochondrial, base aérobie",
    fcMax: { min: 70, max: 78 },
    vma: { min: 60, max: 70 },
    ftp: { min: 56, max: 75 },
    parametresTravailles: "Lipolyse, volume mitochondrial, base aérobie",
    positionSeuils: "Approche SV1",
    impactMetabolique: {
      vlamax: "↓",
      tte: "↑",
      vo2max: "neutre",
      notes: "↓ VLamax, ↑ robustesse, ↑ TTE indirect"
    },
    durationTypique: "1h30 - 6h",
    color: "text-green-400",
    bgColor: "bg-green-400/10",
    borderColor: "border-green-400/30"
  },
  {
    id: "Z3",
    label: "Endurance Active",
    description: "Base aérobie solide, force si basse cadence",
    fcMax: { min: 78, max: 83 },
    vma: { min: 70, max: 78 },
    ftp: { min: 76, max: 90 },
    parametresTravailles: "Base aérobie solide, force si basse cadence",
    positionSeuils: "= SV1 / SL1",
    impactMetabolique: {
      vlamax: "neutre",
      tte: "↑",
      vo2max: "neutre",
      notes: "Stabilisation VLamax, ↑ tolérance mécanique"
    },
    durationTypique: "45 min - 2h",
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
    borderColor: "border-yellow-400/30"
  },
  {
    id: "Z4a",
    label: "Allure Marathon / Sweet Spot",
    description: "Économie de course, durabilité, spécifique long",
    fcMax: { min: 83, max: 87 },
    vma: { min: 78, max: 83 },
    ftp: { min: 88, max: 93 },
    parametresTravailles: "Économie de course, durabilité, spécifique long",
    positionSeuils: "Entre SV1 et SV2",
    impactMetabolique: {
      vlamax: "↓",
      tte: "↑↑",
      vo2max: "neutre",
      notes: "↑ TTE, ↑ économie, VLamax neutre à ↓"
    },
    durationTypique: "20 min - 1h30",
    color: "text-orange-300",
    bgColor: "bg-orange-300/10",
    borderColor: "border-orange-300/30"
  },
  {
    id: "Z4b",
    label: "Allure Semi",
    description: "Tolérance à l'inconfort, mental, spécifique moyen",
    fcMax: { min: 87, max: 91 },
    vma: { min: 83, max: 88 },
    ftp: { min: 94, max: 98 },
    parametresTravailles: "Tolérance à l'inconfort, mental, spécifique moyen",
    positionSeuils: "Montée vers SV2",
    impactMetabolique: {
      vlamax: "neutre",
      tte: "↑",
      vo2max: "neutre",
      notes: "↑ TTE mais ↑ coût glycolytique"
    },
    durationTypique: "15 min - 45 min",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    borderColor: "border-orange-500/30"
  },
  {
    id: "Z5",
    label: "Seuil (MLSS)",
    description: "Repousser le seuil anaérobie, MLSS",
    fcMax: { min: 91, max: 94 },
    vma: { min: 88, max: 92 },
    ftp: { min: 99, max: 105 },
    parametresTravailles: "Repousser le seuil anaérobie, MLSS",
    positionSeuils: "= SV2 / SL2 (≈ 4 mmol/L)",
    impactMetabolique: {
      vlamax: "↓",
      tte: "↑↑",
      vo2max: "↑",
      notes: "↓ VLamax si bien dosé, ↑ TTE direct"
    },
    durationTypique: "8 - 30 min",
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    borderColor: "border-red-400/30"
  },
  {
    id: "Z6",
    label: "VO2max / VMA",
    description: "VO2max, cylindrée cardiaque",
    fcMax: { min: 95, max: 100 },
    vma: { min: 95, max: 105 },
    ftp: { min: 106, max: 120 },
    parametresTravailles: "VO2max, cylindrée cardiaque",
    positionSeuils: "> SV2 (zone rouge)",
    impactMetabolique: {
      vlamax: "↑",
      tte: "neutre",
      vo2max: "↑↑",
      notes: "↑ VO2max, ↑ VLamax (secondaire)"
    },
    durationTypique: "2 - 8 min",
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    borderColor: "border-purple-400/30"
  },
  {
    id: "Z7",
    label: "Neuromusculaire / Anaérobie Alactique",
    description: "Explosivité, force max, vitesse pure",
    fcMax: null, // N/A
    vma: { min: 120, max: 200 },
    ftp: { min: 150, max: 300 },
    parametresTravailles: "Explosivité, force max, vitesse pure",
    positionSeuils: "Anaérobie alactique",
    impactMetabolique: {
      vlamax: "↑↑",
      tte: "neutre",
      vo2max: "neutre",
      notes: "↑↑ VLamax"
    },
    durationTypique: "5 - 30 sec",
    color: "text-pink-400",
    bgColor: "bg-pink-400/10",
    borderColor: "border-pink-400/30"
  }
];

/**
 * Récupérer une zone par son ID
 */
export function getZoneById(id: ZoneId): TrainingZoneDefinition | undefined {
  return TRAINING_ZONES.find(z => z.id === id);
}

/**
 * Couleurs pour chaque zone (compatible avec l'ancien système)
 */
export const ZONE_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  Z1: { text: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30" },
  Z2: { text: "text-green-400", bg: "bg-green-400/10", border: "border-green-400/30" },
  Z3: { text: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30" },
  Z4: { text: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/30" }, // Legacy compat
  Z4a: { text: "text-orange-300", bg: "bg-orange-300/10", border: "border-orange-300/30" },
  Z4b: { text: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/30" },
  Z5: { text: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30" },
  Z6: { text: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/30" },
  Z7: { text: "text-pink-400", bg: "bg-pink-400/10", border: "border-pink-400/30" }
};

/**
 * Avertissements staff pour les zones à risque glycolytique
 */
export function getZoneWarnings(zoneId: ZoneId): string[] {
  const warnings: string[] = [];
  
  if (zoneId === "Z4b" || zoneId === "Z5") {
    warnings.push("Zone Z4b/Z5 prolongée = charge glycolytique élevée");
  }
  if (zoneId === "Z6") {
    warnings.push("Zone Z6 = stimulus VLamax secondaire. Limiter si VLamax déjà élevée.");
  }
  if (zoneId === "Z7") {
    warnings.push("Zone Z7 = ↑↑ VLamax. Usage limité pour profils endurance.");
  }
  
  return warnings;
}

/**
 * Calculer les valeurs absolues pour une zone donnée
 */
export interface ZoneAbsoluteValues {
  fcBpm?: { min: number; max: number };
  vmaKmh?: { min: number; max: number };
  ftpWatts?: { min: number; max: number };
  paceMinPerKm?: { min: string; max: string };
}

export interface AthleteZoneRefs {
  fcMax?: number | null;
  vma?: number | null;
  ftp?: number | null;
}

export function computeZoneAbsoluteValues(
  zone: TrainingZoneDefinition,
  refs: AthleteZoneRefs
): ZoneAbsoluteValues {
  const result: ZoneAbsoluteValues = {};
  
  // FC (bpm)
  if (zone.fcMax && refs.fcMax) {
    result.fcBpm = {
      min: Math.round((zone.fcMax.min / 100) * refs.fcMax),
      max: Math.round((zone.fcMax.max / 100) * refs.fcMax)
    };
  }
  
  // VMA (km/h) + pace
  if (refs.vma) {
    const vmaMin = (zone.vma.min / 100) * refs.vma;
    const vmaMax = (zone.vma.max / 100) * refs.vma;
    result.vmaKmh = { min: vmaMin, max: vmaMax };
    
    // Pace (min/km) - inversé car plus vite = plus court
    if (vmaMin > 0 && vmaMax > 0) {
      const paceMax = 60 / vmaMin; // plus lent
      const paceMin = 60 / vmaMax; // plus vite
      result.paceMinPerKm = {
        min: formatPace(paceMin),
        max: formatPace(paceMax)
      };
    }
  }
  
  // FTP (Watts)
  if (refs.ftp) {
    result.ftpWatts = {
      min: Math.round((zone.ftp.min / 100) * refs.ftp),
      max: Math.round((zone.ftp.max / 100) * refs.ftp)
    };
  }
  
  return result;
}

function formatPace(minPerKm: number): string {
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/**
 * Obtenir l'icône appropriée pour une zone (pour import dans les composants)
 */
export function getZoneIconName(zoneId: ZoneId): string {
  const iconMap: Record<ZoneId, string> = {
    Z1: "Heart",
    Z2: "Wind",
    Z3: "Activity",
    Z4a: "TrendingUp",
    Z4b: "Gauge",
    Z5: "Flame",
    Z6: "Mountain",
    Z7: "Zap"
  };
  return iconMap[zoneId];
}

/**
 * Message pédagogique global
 */
export const ZONES_METHODOLOGY_NOTE = 
  "Ces zones sont alignées avec la méthodologie Two For Coaching Lab (VLamax – TTE – endurance spécifique). Les zones ne sont PAS de simples plages d'intensité : ce sont des leviers physiologiques.";
