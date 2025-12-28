// =============================================
// BIBLIOTHÈQUE DE SÉANCES ÉLITE (A/B/C/D)
// Multi-sport + zones + variantes IM/70.3/Marathon/Semi
// =============================================

import { LibraryWorkout, WorkoutVariants } from "@/types/workoutLibrary";
import { ObjectifType, AthleteRefs } from "@/types/athlete";
import { SessionType, TrainingSport } from "@/types/planificateur";
import { ZonesConfig, computeAbsoluteRange, ZoneDefinition, AthleteRefsForZones } from "./zonesConfig";

// =============================================
// HELPER ZONES
// =============================================

function getZoneDef(metricKey: string, sportKey: string, zoneKey: string): ZoneDefinition | null {
  const metric = ZonesConfig[metricKey];
  if (!metric) return null;
  const table = metric.sports[sportKey];
  if (!table) return null;
  return table.find(z => z.key === zoneKey) || null;
}

export function zoneTargetTextForWorkout(
  refs: AthleteRefsForZones | undefined,
  metricKey: string,
  sportKey: string,
  zoneKey: string
): string {
  const z = getZoneDef(metricKey, sportKey, zoneKey);
  if (!z) return zoneKey;
  
  if (!refs) {
    return `${zoneKey} (${z.min}-${z.max}%)`;
  }
  
  const abs = computeAbsoluteRange(metricKey, sportKey, z, refs);
  if (abs && abs.ok) return `${zoneKey} (${z.min}-${z.max}%) → ${abs.display}`;
  
  return `${zoneKey} (${z.min}-${z.max}%)`;
}

// =============================================
// BIBLIOTHÈQUE COMPLÈTE
// =============================================

export const WorkoutLibrary: LibraryWorkout[] = [
  // -------------------------
  // A – ENDURANCE / SOCLE
  // -------------------------
  {
    id: "A_BIKE_Z2_LONG",
    cat: "A",
    sport: "cyclisme",
    objectif: "Endurance aérobie, économie, oxydation lipidique",
    necessite: "Obligatoire",
    when: "Base/Build/Peak (IM surtout)",
    avoid: "Fatigue excessive, veille de test important",
    durationMin: [90, 240],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Warm-up", text: "15 min progressif Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "60–180 min Z2 stable, cadence libre (ajouter 3x10 min Z3 en fin si Build)", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Long Z2 (2h30–4h) + nutrition race",
      half: "2h Z2 + 3x10 min Z3",
      marathon: "1h30–2h vélo facile en support",
      semi: "1h15–1h45 vélo facile"
    }
  },
  {
    id: "A_RUN_Z2_EASY",
    cat: "A",
    sport: "course",
    objectif: "Endurance fondamentale, économie, récupération active",
    necessite: "Obligatoire",
    when: "Toute l'année",
    avoid: "Aucun (adapter volume si fatigue)",
    durationMin: [35, 90],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "10 min Z1–Z2 relâché", zones: ["Z1", "Z2"] },
      { part: "Main", text: "20–70 min Z2 (technique, relâchement)", zones: ["Z2"] },
      { part: "Cool-down", text: "5 min Z1 + éducatifs 5 min (optionnel)", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Z2 stable 45–75 min (ou brick après vélo)",
      half: "Z2 40–70 min",
      marathon: "Z2 50–90 min (socle majeur)",
      semi: "Z2 35–70 min"
    }
  },
  {
    id: "A_SWIM_AEROBIC",
    cat: "A",
    sport: "natation",
    objectif: "Aérobie spécifique, technique sous faible contrainte",
    necessite: "Recommandé",
    when: "Toute l'année",
    avoid: "Si épaules douloureuses",
    durationMin: [30, 60],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Warm-up", text: "400m facile + 6x50m éducatifs", zones: ["Z1", "Z2"] },
      { part: "Main", text: "6–10x200m Z2 r=20–30s", zones: ["Z2"] },
      { part: "Cool-down", text: "200m facile", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Volume + régularité (2–3k)",
      half: "Séries 200–300m",
      marathon: "1 séance technique/semaine",
      semi: "1 séance technique/semaine"
    }
  },

  // -------------------------
  // B – INTENSITÉ / QUALITÉ
  // -------------------------
  {
    id: "B_BIKE_VO2_3MIN",
    cat: "B",
    sport: "cyclisme",
    objectif: "VO2max, puissance aérobie max",
    necessite: "Recommandé",
    when: "Build/Peak",
    avoid: "Si VLamax trop haute (réduire fréquence) ou fatigue élevée",
    durationMin: [55, 85],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Warm-up", text: "20 min progressif + 3x30s Z5 r=60s", zones: ["Z1", "Z2", "Z5"] },
      { part: "Main", text: "5–7x3 min Z5 r=3 min Z1–Z2", zones: ["Z5", "Z1", "Z2"] },
      { part: "Cool-down", text: "10 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "1x/10j max selon profil",
      half: "1x/7j possible",
      marathon: "rare (plutôt VMA course)",
      semi: "rare"
    }
  },
  {
    id: "B_BIKE_THRESHOLD",
    cat: "B",
    sport: "cyclisme",
    objectif: "Seuil lactique, endurance musculaire haute intensité",
    necessite: "Recommandé",
    when: "Build/Peak",
    avoid: "Fatigue accumulée, veille compétition",
    durationMin: [60, 90],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Warm-up", text: "20 min progressif Z1→Z3", zones: ["Z1", "Z2", "Z3"] },
      { part: "Main", text: "2–3x15 min Z4 r=5 min Z1", zones: ["Z4", "Z1"] },
      { part: "Cool-down", text: "10 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2x20 min Z4 (spécifique race)",
      half: "3x15 min Z4",
      marathon: "support léger",
      semi: "support léger"
    }
  },
  {
    id: "B_RUN_VMA_400",
    cat: "B",
    sport: "course",
    objectif: "VO2max / VMA, économie haute intensité",
    necessite: "Recommandé",
    when: "Build/Peak (marathon/semi)",
    avoid: "Douleur, fatigue nerveuse, période IM très chargée",
    durationMin: [45, 75],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "15 min Z1–Z2 + éducatifs + 4 lignes droites", zones: ["Z1", "Z2"] },
      { part: "Main", text: "10–16x400m Z6 r=200m trot (ou 1 min)", zones: ["Z6"] },
      { part: "Cool-down", text: "10 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "petit volume, qualité (8–10x400)",
      half: "10–14x400",
      marathon: "10–16x400 en début build",
      semi: "12–16x400"
    }
  },
  {
    id: "B_RUN_THRESHOLD",
    cat: "B",
    sport: "course",
    objectif: "Seuil lactique, allure spécifique marathon/semi",
    necessite: "Recommandé",
    when: "Build/Peak",
    avoid: "Fatigue importante, début de cycle",
    durationMin: [50, 80],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "15 min Z1–Z2 + gammes", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3x10 min Z4b-Z5 r=3 min trot", zones: ["Z4b", "Z5"] },
      { part: "Cool-down", text: "10 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2x15 min allure IM",
      half: "3x12 min",
      marathon: "allure spécifique marathon",
      semi: "allure spécifique semi"
    }
  },
  {
    id: "B_SWIM_SPEED_25",
    cat: "B",
    sport: "natation",
    objectif: "Vitesse / puissance de nage, tolérance lactique",
    necessite: "Optionnel",
    when: "Build/Peak",
    avoid: "Si technique se dégrade / douleurs épaules",
    durationMin: [35, 55],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Warm-up", text: "300m facile + 8x50m éducatifs", zones: ["Z1", "Z2"] },
      { part: "Main", text: "2 blocs: 12x25m Z6 r=20s + 6x50m Z5 r=30s", zones: ["Z6", "Z5"] },
      { part: "Cool-down", text: "200m facile", zones: ["Z1"] }
    ],
    variants: {
      ironman: "1 séance vitesse légère / semaine max",
      half: "1 séance vitesse / semaine",
      marathon: "—",
      semi: "—"
    }
  },

  // -------------------------
  // C – TECHNIQUE / FORCE / SPEC
  // -------------------------
  {
    id: "C_RUN_HILL_SKILLS",
    cat: "C",
    sport: "course",
    objectif: "Technique + force spécifique, économie",
    necessite: "Recommandé",
    when: "Base/Build",
    avoid: "veille séance B dure ou si douleur tendon",
    durationMin: [35, 60],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Warm-up", text: "15 min Z1–Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "10–15x10–15s côte (technique) r=marche retour + 15 min Z2", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "côtes très courtes, faible volume",
      half: "ok",
      marathon: "excellent",
      semi: "excellent"
    }
  },
  {
    id: "C_RUN_STRIDES",
    cat: "C",
    sport: "course",
    objectif: "Coordination neuromusculaire, économie de course",
    necessite: "Recommandé",
    when: "Toute l'année",
    avoid: "Fatigue musculaire importante",
    durationMin: [40, 60],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "15 min Z2", zones: ["Z2"] },
      { part: "Main", text: "20 min Z2 + 8x100m progressifs (foulée ample) r=100m marche", zones: ["Z2", "Z5"] },
      { part: "Cool-down", text: "10 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "après sortie longue vélo",
      half: "2x/semaine ok",
      marathon: "intégrer aux footings",
      semi: "intégrer aux footings"
    }
  },
  {
    id: "C_BIKE_CADENCE",
    cat: "C",
    sport: "cyclisme",
    objectif: "Efficience pédalage, endurance musculaire légère",
    necessite: "Optionnel",
    when: "Toute l'année",
    avoid: "fatigue lombaire",
    durationMin: [45, 75],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Warm-up", text: "15 min Z1–Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "6x5 min Z2 cadence 95–105 + 3 min Z1", zones: ["Z2", "Z1"] },
      { part: "Cool-down", text: "10 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "super utile aero/position",
      half: "utile",
      marathon: "support",
      semi: "support"
    }
  },
  {
    id: "C_BIKE_FORCE",
    cat: "C",
    sport: "cyclisme",
    objectif: "Force spécifique, recrutement musculaire",
    necessite: "Optionnel",
    when: "Base/Build",
    avoid: "Problèmes de genoux",
    durationMin: [60, 90],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Warm-up", text: "20 min Z1–Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "6x3 min Z3 cadence 50–60 rpm r=3 min Z1", zones: ["Z3", "Z1"] },
      { part: "Cool-down", text: "15 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "excellent préparation",
      half: "utile",
      marathon: "optionnel",
      semi: "optionnel"
    }
  },
  {
    id: "C_SWIM_TECH_DRILLS",
    cat: "C",
    sport: "natation",
    objectif: "Technique (alignement, catch), économie de nage",
    necessite: "Obligatoire",
    when: "Toute l'année",
    avoid: "aucun",
    durationMin: [30, 55],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Warm-up", text: "300m facile", zones: ["Z1", "Z2"] },
      { part: "Main", text: "12x50m éducatifs (scull/catch) r=15–20s + 6x100m Z2", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "200m facile", zones: ["Z1"] }
    ],
    variants: {
      ironman: "prioritaire",
      half: "prioritaire",
      marathon: "—",
      semi: "—"
    }
  },

  // -------------------------
  // D – RÉCUP / RÉGÉN
  // -------------------------
  {
    id: "D_BIKE_RECOVERY",
    cat: "D",
    sport: "cyclisme",
    objectif: "Récupération, circulation, fraîcheur",
    necessite: "Obligatoire",
    when: "Taper / lendemain charge",
    avoid: "aucun",
    durationMin: [30, 60],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Main", text: "30–60 min Z1, très facile", zones: ["Z1"] }
    ],
    variants: {
      ironman: "parfait",
      half: "parfait",
      marathon: "optionnel",
      semi: "optionnel"
    }
  },
  {
    id: "D_RUN_REGEN",
    cat: "D",
    sport: "course",
    objectif: "Régénération, prévention blessures",
    necessite: "Recommandé",
    when: "lendemain séance B / taper",
    avoid: "si douleur",
    durationMin: [20, 45],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "20–45 min Z1, relâché", zones: ["Z1"] }
    ],
    variants: {
      ironman: "brick très facile ok",
      half: "ok",
      marathon: "ok",
      semi: "ok"
    }
  },
  {
    id: "D_SWIM_REGEN",
    cat: "D",
    sport: "natation",
    objectif: "Récupération active, mobilité",
    necessite: "Optionnel",
    when: "Lendemain charge / taper",
    avoid: "aucun",
    durationMin: [20, 35],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Main", text: "800–1500m très facile + éducatifs légers", zones: ["Z1"] }
    ],
    variants: {
      ironman: "excellent",
      half: "excellent",
      marathon: "optionnel",
      semi: "optionnel"
    }
  }
];

// =============================================
// PICKER POUR LE PLANIFICATEUR
// =============================================

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickWorkoutFromLibrary(options: {
  cat: SessionType;
  sport?: TrainingSport;
  goal?: ObjectifType;
}): LibraryWorkout | null {
  let pool = WorkoutLibrary.filter(w => w.cat === options.cat);
  
  if (options.sport) {
    pool = pool.filter(w => w.sport === options.sport);
  }
  
  // Prioriser si variante existe pour l'objectif
  if (options.goal) {
    const goalKey = goalToVariantKey(options.goal);
    const withVar = pool.filter(w => w.variants && w.variants[goalKey]);
    if (withVar.length) pool = withVar;
  }
  
  return pool.length ? pick(pool) : null;
}

function goalToVariantKey(goal: ObjectifType): keyof WorkoutVariants {
  switch (goal) {
    case "IM": return "ironman";
    case "703": return "half";
    case "Marathon": return "marathon";
    case "Semi": return "semi";
    default: return "ironman";
  }
}

// =============================================
// FILTRES
// =============================================

export function filterWorkouts(options: {
  cat?: SessionType;
  sport?: TrainingSport;
  necessite?: string;
}): LibraryWorkout[] {
  let result = [...WorkoutLibrary];
  
  if (options.cat && options.cat !== "REST") {
    result = result.filter(w => w.cat === options.cat);
  }
  
  if (options.sport) {
    result = result.filter(w => w.sport === options.sport);
  }
  
  if (options.necessite) {
    result = result.filter(w => w.necessite === options.necessite);
  }
  
  return result;
}

// =============================================
// COULEURS PAR NÉCESSITÉ
// =============================================

export function getNecessiteColor(necessite: string): { bg: string; text: string } {
  switch (necessite) {
    case "Obligatoire":
      return { bg: "bg-red-500/20", text: "text-red-400" };
    case "Recommandé":
      return { bg: "bg-amber-500/20", text: "text-amber-400" };
    case "Optionnel":
      return { bg: "bg-blue-500/20", text: "text-blue-400" };
    default:
      return { bg: "bg-muted/30", text: "text-muted-foreground" };
  }
}

export function getCatColor(cat: SessionType): { bg: string; text: string; label: string } {
  switch (cat) {
    case "A":
      return { bg: "bg-blue-500/20", text: "text-blue-400", label: "Endurance" };
    case "B":
      return { bg: "bg-red-500/20", text: "text-red-400", label: "Intensité" };
    case "C":
      return { bg: "bg-amber-500/20", text: "text-amber-400", label: "Technique" };
    case "D":
      return { bg: "bg-green-500/20", text: "text-green-400", label: "Récupération" };
    default:
      return { bg: "bg-muted/30", text: "text-muted-foreground", label: "Repos" };
  }
}
