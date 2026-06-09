// =============================================
// BIBLIOTHÈQUE DE SÉANCES ÉLITE (A/B/C/D)
// Multi-sport + zones + variantes IM/70.3/Marathon/Semi
// =============================================

import { LibraryWorkout, WorkoutVariants, SessionType, TrainingSport } from "@/types/workoutLibrary";
import { ObjectifType, AthleteRefs } from "@/types/athlete";
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
    phase: ["base", "build", "peak"],
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
    phase: ["base", "build"],
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
    phase: ["base", "build"],
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
    phase: ["build", "peak"],
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
    phase: ["build", "peak"],
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
    phase: ["build", "peak"],
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
    phase: ["build", "peak"],
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
    phase: ["build", "peak"],
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
    phase: ["base", "build"],
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
    phase: ["base", "build"],
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
    phase: ["base", "build"],
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
    phase: ["base", "build"],
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
    phase: ["base", "build"],
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
    phase: ["taper"],
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
    phase: ["taper"],
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
    phase: ["taper"],
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
  },

  // =========================================================
  // 🟦 IRONMAN SPÉCIFIQUE
  // =========================================================
  
  // A – IM ENDURANCE SPÉCIFIQUE
  {
    id: "A_IM_BIKE_STEADY_LONG",
    cat: "A",
    sport: "cyclisme",
    objectif: "Endurance IM spécifique, stabilité métabolique",
    necessite: "Obligatoire",
    when: "Build / Peak IM",
    phase: ["build", "peak"],
    avoid: "Fatigue chronique",
    durationMin: [180, 300],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Warm-up", text: "20' Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "2h–4h Z2 stable (IM pace), nutrition race", zones: ["Z2"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { ironman: "Séance clé IM", half: "2h Z2", marathon: "—", semi: "—" }
  },
  {
    id: "A_IM_RUN_PACE",
    cat: "A",
    sport: "course",
    objectif: "Allure marathon IM, économie post-vélo",
    necessite: "Obligatoire",
    when: "Build / Peak IM",
    phase: ["build", "peak"],
    avoid: "Douleurs tendineuses",
    durationMin: [60, 120],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Main", text: "60–120' Z2 bas (IM pace)", zones: ["Z2"] }
    ],
    variants: { ironman: "Fondamental", half: "60–80'", marathon: "—", semi: "—" }
  },

  // B – IM QUALITÉ CONTRÔLÉE
  {
    id: "B_IM_BIKE_OVERUNDER",
    cat: "B",
    sport: "cyclisme",
    objectif: "Tolérance lactate contrôlée sans dérive VLamax",
    necessite: "Recommandé",
    when: "Build IM",
    phase: ["build"],
    avoid: "VLamax déjà élevée",
    durationMin: [75, 110],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Main", text: "3x15' (2' Z3 / 8' Z2 / 2' Z3) r=5' Z1", zones: ["Z3", "Z2", "Z1"] }
    ],
    variants: { ironman: "1x/10–14j", half: "1x/7–10j", marathon: "—", semi: "—" }
  },

  // C – IM TECHNIQUE / SUPPORT
  {
    id: "C_IM_AERO_HOLD",
    cat: "C",
    sport: "cyclisme",
    objectif: "Tenue position aéro IM",
    necessite: "Recommandé",
    when: "Toute l'année IM",
    phase: ["base", "build"],
    avoid: "Douleur lombaire",
    durationMin: [60, 120],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Main", text: "4x15' Z2 en position aéro r=5' Z1", zones: ["Z2", "Z1"] }
    ],
    variants: { ironman: "Essentiel", half: "utile", marathon: "—", semi: "—" }
  },

  // D – IM RÉCUP
  {
    id: "D_IM_BRICK_REGEN",
    cat: "D",
    sport: "course",
    objectif: "Transition vélo-course sans stress",
    necessite: "Recommandé",
    when: "Après long vélo IM",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Fatigue excessive",
    durationMin: [15, 30],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "15–30' Z1 très relâché", zones: ["Z1"] }
    ],
    variants: { ironman: "Excellent", half: "OK", marathon: "—", semi: "—" }
  },

  // =========================================================
  // 🟥 MARATHON SPÉCIFIQUE
  // =========================================================

  // A – MARATHON ENDURANCE
  {
    id: "A_MAR_LONG_RUN",
    cat: "A",
    sport: "course",
    objectif: "Endurance marathon, résistance mécanique",
    necessite: "Obligatoire",
    when: "Build / Peak marathon",
    phase: ["build", "peak"],
    avoid: "Accumulation fatigue",
    durationMin: [90, 150],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Main", text: "90–150' Z2", zones: ["Z2"] }
    ],
    variants: { marathon: "Fondamental", semi: "90' max", ironman: "—", half: "—" }
  },
  {
    id: "A_MAR_END_FAST_FINISH",
    cat: "A",
    sport: "course",
    objectif: "Endurance + finish marathon",
    necessite: "Recommandé",
    when: "Peak marathon",
    phase: ["peak"],
    avoid: "Tendon sensible",
    durationMin: [90, 140],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Main", text: "70–100' Z2 + 20–40' Z3", zones: ["Z2", "Z3"] }
    ],
    variants: { marathon: "Clé", semi: "—", ironman: "—", half: "—" }
  },

  // B – MARATHON QUALITÉ
  {
    id: "B_MAR_TEMPO_BLOCKS",
    cat: "B",
    sport: "course",
    objectif: "Allure marathon, tolérance aérobie",
    necessite: "Obligatoire",
    when: "Build marathon",
    phase: ["build"],
    avoid: "Fatigue nerveuse",
    durationMin: [60, 90],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Main", text: "3x20' Z3 (marathon pace) r=5' Z1", zones: ["Z3", "Z1"] }
    ],
    variants: { marathon: "Essentiel", semi: "2x15'", ironman: "—", half: "—" }
  },

  // C – MARATHON SUPPORT
  {
    id: "C_MAR_HILL_STRENGTH",
    cat: "C",
    sport: "course",
    objectif: "Force spécifique marathon",
    necessite: "Recommandé",
    when: "Base / Build",
    phase: ["base", "build"],
    avoid: "Achilles",
    durationMin: [45, 70],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "12x20s côtes Z4 r=marche + 30' Z2", zones: ["Z4", "Z2"] }
    ],
    variants: { marathon: "Très utile", semi: "utile", ironman: "—", half: "—" }
  },

  // D – MARATHON RÉCUP
  {
    id: "D_MAR_REGEN",
    cat: "D",
    sport: "course",
    objectif: "Régénération marathon",
    necessite: "Obligatoire",
    when: "Après séance B",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Douleur",
    durationMin: [25, 40],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "25–40' Z1", zones: ["Z1"] }
    ],
    variants: { marathon: "Indispensable", semi: "OK", ironman: "OK", half: "OK" }
  },

  // =========================================================
  // 🟩 BRICK SESSIONS (IM / 70.3)
  // =========================================================

  {
    id: "BRICK_IM_Z2_RUN",
    cat: "A",
    sport: "brick",
    objectif: "Adaptation neuromusculaire IM",
    necessite: "Obligatoire",
    when: "Build / Peak IM",
    phase: ["build", "peak"],
    avoid: "Fatigue excessive",
    durationMin: [120, 180],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Bike", text: "90–150' Z2", zones: ["Z2"] },
      { part: "Run", text: "20–40' Z2 IM pace", zones: ["Z2"] }
    ],
    variants: { ironman: "Séance clé", half: "90'+20'", marathon: "—", semi: "—" }
  },
  {
    id: "BRICK_FAST_FINISH",
    cat: "B",
    sport: "brick",
    objectif: "Finish course sous fatigue",
    necessite: "Recommandé",
    when: "Peak IM / 70.3",
    phase: ["peak"],
    avoid: "Risque blessure",
    durationMin: [120, 170],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Bike", text: "2h Z2 + 20' Z3", zones: ["Z2", "Z3"] },
      { part: "Run", text: "30' Z2 → Z3", zones: ["Z2", "Z3"] }
    ],
    variants: { ironman: "Très spécifique", half: "OK", marathon: "—", semi: "—" }
  },

  // =========================================================
  // 🟨 SEMI-MARATHON SPÉCIFIQUE
  // =========================================================

  {
    id: "A_SEMI_TEMPO_LONG",
    cat: "A",
    sport: "course",
    objectif: "Endurance spécifique semi",
    necessite: "Obligatoire",
    when: "Build / Peak semi",
    phase: ["build", "peak"],
    avoid: "Fatigue importante",
    durationMin: [60, 90],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Main", text: "60–90' Z2 avec 20' finish Z3", zones: ["Z2", "Z3"] }
    ],
    variants: { semi: "Fondamental", marathon: "utile", ironman: "—", half: "—" }
  },
  {
    id: "B_SEMI_RACE_PACE",
    cat: "B",
    sport: "course",
    objectif: "Allure spécifique semi-marathon",
    necessite: "Obligatoire",
    when: "Peak semi",
    phase: ["peak"],
    avoid: "Veille compétition",
    durationMin: [50, 70],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "2x15' allure semi (Z4a–Z4b) r=4' trot", zones: ["Z4a", "Z4b"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { semi: "Clé", marathon: "—", ironman: "—", half: "—" }
  },

  // =========================================================
  // 🟪 70.3 SPÉCIFIQUE
  // =========================================================

  {
    id: "A_703_BIKE_RACE_SIM",
    cat: "A",
    sport: "cyclisme",
    objectif: "Simulation 70.3 bike leg",
    necessite: "Obligatoire",
    when: "Peak 70.3",
    phase: ["peak"],
    avoid: "Fatigue chronique",
    durationMin: [150, 180],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Warm-up", text: "20' Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "2h–2h30 Z2–Z3 (race simulation)", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { half: "Séance clé", ironman: "—", marathon: "—", semi: "—" }
  },
  {
    id: "B_703_RUN_THRESHOLD",
    cat: "B",
    sport: "course",
    objectif: "Allure 70.3 run sous fatigue",
    necessite: "Recommandé",
    when: "Build / Peak 70.3",
    phase: ["build", "peak"],
    avoid: "Douleur",
    durationMin: [45, 65],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3x10' Z4a–Z4b r=3' trot", zones: ["Z4a", "Z4b"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { half: "Spécifique", ironman: "—", marathon: "—", semi: "—" }
  },
  {
    id: "BRICK_703_RACE_SIM",
    cat: "B",
    sport: "brick",
    objectif: "Simulation enchaînement 70.3",
    necessite: "Obligatoire",
    when: "Peak 70.3",
    phase: ["peak"],
    avoid: "Surcharge",
    durationMin: [150, 200],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Bike", text: "2h Z2–Z3 (race effort)", zones: ["Z2", "Z3"] },
      { part: "Run", text: "30–45' Z3 (race pace)", zones: ["Z3"] }
    ],
    variants: { half: "Séance clé", ironman: "—", marathon: "—", semi: "—" }
},

  // =========================================================
  // 🟫 TRAIL SPÉCIFIQUE
  // =========================================================

  // A – TRAIL ENDURANCE
  {
    id: "A_TR_LONG_HIKE_RUN_DPLUS",
    cat: "A",
    sport: "course",
    objectif: "Sortie longue trail (D+), endurance + économie en montée",
    necessite: "Obligatoire",
    when: "Build / Peak trail",
    phase: ["build", "peak"],
    avoid: "Fatigue extrême, douleur tendon",
    durationMin: [120, 240],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "2–4h Z1–Z2, priorité régularité en montée (alternance course/marche). Hydratation/gel.", zones: ["Z1", "Z2"] }
    ],
    variants: { trail_short: "1h45–2h30", trail_mountain: "2h–3h30", trail_ultra: "3h–4h+ (progressif)", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 800, max: 1600 }
  },
  {
    id: "A_TR_EASY_TECH",
    cat: "A",
    sport: "course",
    objectif: "Endurance facile + technique sentier",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [45, 75],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "45–75' Z1–Z2 + 10' éducatifs trail (appuis, relâchement descente).", zones: ["Z1", "Z2"] }
    ],
    variants: { trail_short: "45–60'", trail_mountain: "60–75'", trail_ultra: "45–70'", ironman: "—", half: "—", marathon: "—", semi: "—" }
  },
  {
    id: "A_TR_BACK_TO_BACK_1",
    cat: "A",
    sport: "course",
    objectif: "Back-to-back J1 (fatigue cumulée ultra)",
    necessite: "Recommandé",
    when: "Build ultra",
    phase: ["build"],
    avoid: "Si fragilité musculo-tendineuse",
    durationMin: [120, 210],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "2–3h30 Z1–Z2. Garder bas, marcher les côtes, nutrition.", zones: ["Z1", "Z2"] }
    ],
    variants: { trail_ultra: "J1 clé", trail_mountain: "optionnel", trail_short: "—", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 800, max: 1400 }
  },
  {
    id: "A_TR_BACK_TO_BACK_2",
    cat: "A",
    sport: "course",
    objectif: "Back-to-back J2 (économie sous fatigue)",
    necessite: "Recommandé",
    when: "Build ultra",
    phase: ["build"],
    avoid: "Douleur",
    durationMin: [60, 120],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "1–2h Z1–Z2 très contrôlé, focus relâchement.", zones: ["Z1", "Z2"] }
    ],
    variants: { trail_ultra: "J2 clé", trail_mountain: "optionnel", trail_short: "—", ironman: "—", half: "—", marathon: "—", semi: "—" }
  },
  {
    id: "A_TR_LONG_PROGRESSIVE",
    cat: "A",
    sport: "course",
    objectif: "Sortie longue progressive (fin plus soutenue)",
    necessite: "Recommandé",
    when: "Peak trail",
    phase: ["peak"],
    avoid: "Fatigue accumulée",
    durationMin: [120, 210],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "2–3h Z2 + 20–30' Z3 (si frais). Garder technique en descente.", zones: ["Z2", "Z3"] }
    ],
    variants: { trail_short: "90–120'", trail_mountain: "2h–2h30", trail_ultra: "2h30–3h30", ironman: "—", half: "—", marathon: "—", semi: "—" }
  },
  {
    id: "A_TR_RACE_SIMU",
    cat: "A",
    sport: "course",
    objectif: "Simulation course trail (effort continu + nutrition)",
    necessite: "Recommandé",
    when: "Peak (J-21 à J-10)",
    phase: ["peak"],
    avoid: "Trop proche compétition",
    durationMin: [90, 180],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "90–180' Z2 avec sections 'race effort' en Z3 sur montées. Nutrition comme le jour J.", zones: ["Z2", "Z3"] }
    ],
    variants: { trail_short: "90–120'", trail_mountain: "120–150'", trail_ultra: "150–180'", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 600, max: 1400 }
  },
  {
    id: "A_TR_BIKE_SUPPORT",
    cat: "A",
    sport: "cyclisme",
    objectif: "Support aérobie sans impact (trail)",
    necessite: "Recommandé",
    when: "Semaine lourde course / prévention blessures",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [60, 150],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Main", text: "60–150' Z2 vélo facile, cadence fluide", zones: ["Z2"] }
    ],
    variants: { trail_ultra: "très utile", trail_mountain: "utile", trail_short: "utile", ironman: "—", half: "—", marathon: "—", semi: "—" }
  },

  // B – TRAIL INTENSITÉ
  {
    id: "B_TR_HILL_REPS_SHORT",
    cat: "B",
    sport: "course",
    objectif: "Côtes courtes (puissance aérobie, recrutement)",
    necessite: "Recommandé",
    when: "Base/Build trail court & montagne",
    phase: ["base", "build"],
    avoid: "Achilles/mollet fragile",
    durationMin: [45, 70],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "12–20x30–45s côte Z5 (fort mais propre) r=descente lente complète", zones: ["Z5"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { trail_short: "18–20 reps", trail_mountain: "12–16 reps", trail_ultra: "8–12 reps (rare)", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 200, max: 500 }
  },
  {
    id: "B_TR_HILL_TEMPO",
    cat: "B",
    sport: "course",
    objectif: "Tempo en montée (seuil aérobie / endurance de côte)",
    necessite: "Obligatoire",
    when: "Build trail",
    phase: ["build"],
    avoid: "VLamax très haute + fatigue (réduire volume)",
    durationMin: [60, 90],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "3x10–15' montée continue Z3–Z4a r=descente Z1. Rester 'dur contrôlé'.", zones: ["Z3", "Z4a", "Z1"] }
    ],
    variants: { trail_short: "3x10'", trail_mountain: "3x12–15'", trail_ultra: "2x12' (optionnel)", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 400, max: 900 }
  },
  {
    id: "B_TR_DESCENT_TOLERANCE",
    cat: "B",
    sport: "course",
    objectif: "Tolérance excentrique (descente contrôlée)",
    necessite: "Recommandé",
    when: "Build/Peak trail montagne",
    phase: ["build", "peak"],
    avoid: "Douleur genou/quad",
    durationMin: [45, 75],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "6–10x2–3' descente technique 'vite mais propre' + remontée facile Z1. Focus appuis.", zones: ["Z2", "Z1"] }
    ],
    variants: { trail_mountain: "excellent", trail_short: "utile", trail_ultra: "prudent", ironman: "—", half: "—", marathon: "—", semi: "—" }
  },
  {
    id: "B_TR_FARTLEK_TRAIL",
    cat: "B",
    sport: "course",
    objectif: "Fartlek trail (relances, variation terrain)",
    necessite: "Recommandé",
    when: "Build trail",
    phase: ["build"],
    avoid: "Fatigue nerveuse",
    durationMin: [50, 75],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "10' Z2 + 10x(1' Z4a / 2' Z2) sur sentier + 10' easy", zones: ["Z2", "Z4a"] }
    ],
    variants: { trail_short: "12–15 reps", trail_mountain: "10 reps", trail_ultra: "8 reps", ironman: "—", half: "—", marathon: "—", semi: "—" }
  },

  // C – TRAIL FORCE/TECHNIQUE
  {
    id: "C_TR_STRENGTH_GENERAL",
    cat: "C",
    sport: "strength",
    objectif: "Force générale & prévention blessures (trail)",
    necessite: "Obligatoire",
    when: "Toute l'année (1–2x/sem)",
    phase: ["base", "build"],
    avoid: "Courbatures fortes en phase Peak",
    durationMin: [35, 55],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "35–55': squat, fente, hip-hinge, mollets, gainage, proprioception. RPE modéré.", zones: ["Z1"] }
    ],
    variants: { trail_ultra: "prioritaire", trail_mountain: "prioritaire", trail_short: "prioritaire", ironman: "—", half: "—", marathon: "—", semi: "—" }
  },
  {
    id: "C_TR_STRENGTH_HILLS_V29",
    cat: "C",
    sport: "strength",
    objectif: "Force spécifique montée (trail)",
    necessite: "Recommandé",
    when: "Base/Build",
    phase: ["base", "build"],
    avoid: "Courbatures excessives",
    durationMin: [40, 55],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "40–55': step-ups, split squat, mollets lourds, gainage, proprio. RPE 6–7.", zones: ["Z1"] }
    ],
    variants: { trail_ultra: "excellent", trail_mountain: "excellent", trail_short: "utile", ironman: "—", half: "—", marathon: "—", semi: "—" }
  },
  {
    id: "C_TR_SKILLS_TECH",
    cat: "C",
    sport: "course",
    objectif: "Technique trail (appuis, relance, lecture terrain)",
    necessite: "Recommandé",
    when: "Base/Build",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [30, 50],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "30–50' facile Z1–Z2 + 12x20s technique (relance, virages, marches) r=1'", zones: ["Z1", "Z2"] }
    ],
    variants: { trail_short: "top", trail_mountain: "top", trail_ultra: "top", ironman: "—", half: "—", marathon: "—", semi: "—" }
  },
  {
    id: "C_TR_DOWNHILL_EASY_V39",
    cat: "C",
    sport: "course",
    objectif: "Technique descente (facile, propre)",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "Douleur genou",
    durationMin: [35, 55],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "30–45' facile + 6–10 descentes 45–60s 'propre' r=remontée easy", zones: ["Z1", "Z2"] }
    ],
    variants: { trail_mountain: "excellent", trail_short: "utile", trail_ultra: "utile", ironman: "—", half: "—", marathon: "—", semi: "—" }
  },
  {
    id: "C_TR_POLES_SESSION",
    cat: "C",
    sport: "course",
    objectif: "Technique bâtons (si utilisé en course)",
    necessite: "Optionnel",
    when: "Build/Peak (montagne/ultra)",
    phase: ["build", "peak"],
    avoid: "—",
    durationMin: [45, 70],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "45–70' sentier facile + 6x4' montée avec bâtons (efficience) r=descente easy", zones: ["Z2", "Z1"] }
    ],
    variants: { trail_mountain: "utile", trail_ultra: "utile", trail_short: "—", ironman: "—", half: "—", marathon: "—", semi: "—" }
  },

  // D – TRAIL RÉCUP
  {
    id: "D_TR_RECOVERY_SOFT",
    cat: "D",
    sport: "course",
    objectif: "Récupération active trail (surface souple)",
    necessite: "Obligatoire",
    when: "Lendemain charge / semaine de choc",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Douleur",
    durationMin: [25, 45],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "25–45' Z1 sur terrain souple + mobilité chevilles/hips", zones: ["Z1"] }
    ],
    variants: { trail_short: "ok", trail_mountain: "ok", trail_ultra: "ok", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 0, max: 150 }
  },

  // =========================================================
  // 🟫 TRAIL ENRICHI (40+ séances supplémentaires)
  // =========================================================

  // A — ENDURANCE / SPÉCIFIQUE TRAIL (8 séances)
  {
    id: "A_TR_END_ROLLING_75",
    cat: "A",
    sport: "course",
    objectif: "Endurance facile sur terrain vallonné (économie)",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [60, 90],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "60–90' Z1–Z2 sur vallonné léger. Relâchement en descente.", zones: ["Z1", "Z2"] }],
    variants: { trail_short: "60–75'", trail_mountain: "75–90'", trail_ultra: "75–90'", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 150, max: 350 }
  },
  {
    id: "A_TR_LONG_DPLUS_2H",
    cat: "A",
    sport: "course",
    objectif: "Sortie longue trail D+ modéré (base trail)",
    necessite: "Obligatoire",
    when: "Base/Build",
    phase: ["base", "build"],
    avoid: "Fatigue excessive",
    durationMin: [110, 140],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "1h50–2h20 Z1–Z2. Monter en marche si besoin. Nutrition/hydratation.", zones: ["Z1", "Z2"] }],
    variants: { trail_short: "110–130'", trail_mountain: "120–140'", trail_ultra: "120–140'", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 500, max: 1000 }
  },
  {
    id: "A_TR_LONG_DPLUS_3H",
    cat: "A",
    sport: "course",
    objectif: "Sortie longue trail (trail long) – résistance mécanique",
    necessite: "Obligatoire",
    when: "Build/Peak trail_mountain",
    phase: ["build", "peak"],
    avoid: "Douleur tendon/genou",
    durationMin: [150, 210],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "2h30–3h30 Z1–Z2. Conserver technique descente. Nutrition course.", zones: ["Z1", "Z2"] }],
    variants: { trail_short: "—", trail_mountain: "150–210'", trail_ultra: "180–240'", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 900, max: 1600 }
  },
  {
    id: "A_TR_LONG_PROGRESSIVE_Z3_FINISH",
    cat: "A",
    sport: "course",
    objectif: "Sortie longue progressive (fin soutenue contrôlée)",
    necessite: "Recommandé",
    when: "Peak",
    phase: ["peak"],
    avoid: "Fatigue / charge élevée semaine",
    durationMin: [110, 170],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "70–120' Z2 + 20–30' Z3 (si frais) sur terrain stable.", zones: ["Z2", "Z3"] }],
    variants: { trail_short: "110–140'", trail_mountain: "130–170'", trail_ultra: "140–180'", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 600, max: 1300 }
  },
  {
    id: "A_TR_STEADY_CLIMB_CONTINUOUS",
    cat: "A",
    sport: "course",
    objectif: "Montée continue longue (endurance en côte)",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "Mollet/Achilles fragile",
    durationMin: [60, 95],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "1 montée continue 25–45' en Z2–Z3 (sans exploser) + retour easy.", zones: ["Z2", "Z3", "Z1"] }],
    variants: { trail_short: "25–35' montée", trail_mountain: "35–45' montée", trail_ultra: "40–50' montée", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 500, max: 900 }
  },
  {
    id: "A_TR_EASY_TRAIL_STRIDES",
    cat: "A",
    sport: "course",
    objectif: "Endurance facile + lignes droites (économie / coordination)",
    necessite: "Recommandé",
    when: "Base/Build",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [45, 70],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "45–70' Z1–Z2 + 6–10x12–15s accélérations (plat/descente douce) r=1'", zones: ["Z1", "Z2", "Z3"] }],
    variants: { trail_short: "top", trail_mountain: "top", trail_ultra: "top", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 100, max: 250 }
  },
  {
    id: "A_TR_RACE_SIMU_90_120",
    cat: "A",
    sport: "course",
    objectif: "Simulation course trail (effort continu + nutrition)",
    necessite: "Recommandé",
    when: "Peak (J-21 à J-10)",
    phase: ["peak"],
    avoid: "Trop proche course",
    durationMin: [90, 130],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "90–130' Z2 avec 3–5 montées Z3. Nutrition identique course.", zones: ["Z2", "Z3"] }],
    variants: { trail_short: "90–110'", trail_mountain: "110–130'", trail_ultra: "120–150'", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 600, max: 1200 }
  },
  {
    id: "A_TR_FLAT_SUPPORT_END",
    cat: "A",
    sport: "course",
    objectif: "Endurance sur roulant (capacité aérobie sans casse)",
    necessite: "Optionnel",
    when: "Semaine chargée trail",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [60, 100],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "60–100' Z2 roulant. Idéal pour 'remplir' sans D+.", zones: ["Z2"] }],
    variants: { trail_short: "60–80'", trail_mountain: "80–100'", trail_ultra: "80–100'", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 0, max: 200 }
  },

  // B — QUALITÉ SPÉCIFIQUE TRAIL (12 séances)
  {
    id: "B_TR_HILL_SPRINTS_10x10",
    cat: "B",
    sport: "course",
    objectif: "Côtes très courtes (recrutement + économie montée)",
    necessite: "Recommandé",
    when: "Base/Build",
    phase: ["base", "build"],
    avoid: "Achilles/mollet fragile",
    durationMin: [40, 55],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "10–14x10s côte 'explosif propre' r=2' marche/retour complet", zones: ["Z5"] },
      { part: "Cool-down", text: "10' easy", zones: ["Z1"] }
    ],
    variants: { trail_short: "12–14 reps", trail_mountain: "10–12 reps", trail_ultra: "8–10 reps", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 150, max: 300 }
  },
  {
    id: "B_TR_HILL_REPS_12x45",
    cat: "B",
    sport: "course",
    objectif: "Côtes courtes 45s (puissance aérobie/relances)",
    necessite: "Obligatoire",
    when: "Build",
    phase: ["build"],
    avoid: "Tendon sensible",
    durationMin: [50, 70],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "12–16x45s côte Z5 r=descente lente complète. Technique impeccable.", zones: ["Z5"] }],
    variants: { trail_short: "14–16 reps", trail_mountain: "12–14 reps", trail_ultra: "10–12 reps", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 250, max: 550 }
  },
  {
    id: "B_TR_UPHILL_TEMPO_3x12",
    cat: "B",
    sport: "course",
    objectif: "Tempo montée (seuil aérobie / endurance de côte)",
    necessite: "Obligatoire",
    when: "Build",
    phase: ["build"],
    avoid: "Fatigue élevée",
    durationMin: [60, 90],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "3x12' montée Z3–Z4a r=descente Z1", zones: ["Z3", "Z4a", "Z1"] }],
    variants: { trail_short: "3x10'", trail_mountain: "3x12–15'", trail_ultra: "2x15'", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 450, max: 900 }
  },
  {
    id: "B_TR_UPHILL_TEMPO_2x20",
    cat: "B",
    sport: "course",
    objectif: "Tempo long en montée (spécifique trail long)",
    necessite: "Recommandé",
    when: "Build/Peak trail_mountain",
    phase: ["build", "peak"],
    avoid: "Charge semaine élevée",
    durationMin: [70, 100],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "2x20' montée Z3 r=descente Z1. Tenir régulier.", zones: ["Z3", "Z1"] }],
    variants: { trail_short: "—", trail_mountain: "clé", trail_ultra: "clé", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 600, max: 1100 }
  },
  {
    id: "B_TR_FARTLEK_TRAIL_10x1_2",
    cat: "B",
    sport: "course",
    objectif: "Fartlek trail (variations, relances, technique)",
    necessite: "Recommandé",
    when: "Base/Build",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [50, 75],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "10x(1' Z4a / 2' Z2) sur sentier vallonné + 10' easy", zones: ["Z4a", "Z2", "Z1"] }],
    variants: { trail_short: "12 répétitions possible", trail_mountain: "10 répétitions", trail_ultra: "8 répétitions", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 250, max: 600 }
  },
  {
    id: "B_TR_CRUISE_HILLS_6x4",
    cat: "B",
    sport: "course",
    objectif: "Côtes moyennes (seuil/tempo) – efficacité montée",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Mollet fragile",
    durationMin: [55, 85],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "6x4' côte Z4a r=descente Z1. Rester 'propre' et stable.", zones: ["Z4a", "Z1"] }],
    variants: { trail_short: "6x4'", trail_mountain: "5–6x4'", trail_ultra: "5x4'", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 400, max: 900 }
  },
  {
    id: "B_TR_RACEPACE_BLOCKS_3x10",
    cat: "B",
    sport: "course",
    objectif: "Blocs 'race effort' (spécifique 20–80km)",
    necessite: "Obligatoire",
    when: "Peak",
    phase: ["peak"],
    avoid: "Confiance modèle faible",
    durationMin: [60, 90],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "3x10' Z3–Z4a sur terrain race-like r=5' Z1–Z2", zones: ["Z3", "Z4a", "Z1", "Z2"] }],
    variants: { trail_short: "intense", trail_mountain: "contrôlé", trail_ultra: "prudent", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 300, max: 800 }
  },
  {
    id: "B_TR_DESCENT_TOLERANCE_8x2",
    cat: "B",
    sport: "course",
    objectif: "Tolérance excentrique (descente) + relance",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Douleur genou/quad",
    durationMin: [45, 70],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "8–10x2' descente 'vite propre' + remontée Z1. Appuis/relâchement.", zones: ["Z2", "Z1"] }],
    variants: { trail_short: "8 reps", trail_mountain: "8–10 reps", trail_ultra: "10 reps", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 250, max: 700 }
  },
  {
    id: "B_TR_TECH_CLIMB_DESC_LOOP",
    cat: "B",
    sport: "course",
    objectif: "Boucle montée/descente (spécifique terrain technique)",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "—",
    durationMin: [55, 85],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "5–8 boucles : montée Z4a contrôlée + descente technique Z2. Récupération en bas si besoin.", zones: ["Z4a", "Z2", "Z1"] }],
    variants: { trail_short: "5–6 boucles", trail_mountain: "6–8 boucles", trail_ultra: "6–8 boucles", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 500, max: 1000 }
  },
  {
    id: "B_TR_VO2_HILLS_5x3",
    cat: "B",
    sport: "course",
    objectif: "VO2 en côte (puissance aérobie)",
    necessite: "Optionnel",
    when: "Build trail_short",
    phase: ["build"],
    avoid: "Fatigue élevée",
    durationMin: [45, 70],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "5–7x3' côte Z4b–Z5 r=descente lente complète", zones: ["Z4b", "Z5", "Z1"] }],
    variants: { trail_short: "très utile", trail_mountain: "à petite dose", trail_ultra: "rare", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 300, max: 700 }
  },
  {
    id: "B_TR_TEMPO_VARIANT_1",
    cat: "B",
    sport: "course",
    objectif: "Tempo trail variant #1 (seuil contrôlé)",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "—",
    durationMin: [55, 90],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "20' Z2 + 2x10' Z3–Z4a sur terrain vallonné r=4' easy + 10' cool.", zones: ["Z2", "Z3", "Z4a", "Z1"] }],
    variants: { trail_short: "ok", trail_mountain: "ok", trail_ultra: "ok", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 300, max: 700 }
  },
  {
    id: "B_TR_TEMPO_VARIANT_2",
    cat: "B",
    sport: "course",
    objectif: "Tempo trail variant #2 (seuil progressif)",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "—",
    durationMin: [55, 90],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "20' Z2 + 3x12' Z3–Z4a sur terrain vallonné r=4' easy + 10' cool.", zones: ["Z2", "Z3", "Z4a", "Z1"] }],
    variants: { trail_short: "ok", trail_mountain: "ok", trail_ultra: "ok", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 350, max: 800 }
  },

  // C — FORCE / TECHNIQUE / PRÉVENTION (8 séances)
  {
    id: "C_TR_STRENGTH_LOWER_45",
    cat: "C",
    sport: "strength",
    objectif: "Force bas du corps (trail) – prévention blessures",
    necessite: "Obligatoire",
    when: "Toute l'année (1–2x/sem)",
    phase: ["base", "build"],
    avoid: "Courbatures fortes en Peak",
    durationMin: [35, 55],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "45': split squat, step-up, hip hinge, mollets, gainage. RPE 6–7.", zones: ["Z1"] }],
    variants: { trail_short: "1–2x/sem", trail_mountain: "1–2x/sem", trail_ultra: "2x/sem", ironman: "—", half: "—", marathon: "—", semi: "—" }
  },
  {
    id: "C_TR_STRENGTH_ECCENTRIC_QUADS",
    cat: "C",
    sport: "strength",
    objectif: "Tolérance descente (excentrique quadriceps)",
    necessite: "Recommandé",
    when: "Base/Build",
    phase: ["base", "build"],
    avoid: "DOMS excessif proche course",
    durationMin: [30, 45],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "30–45': step-down, eccentric squat, split squat excentrique, isos. Progressif.", zones: ["Z1"] }],
    variants: { trail_short: "utile", trail_mountain: "très utile", trail_ultra: "très utile", ironman: "—", half: "—", marathon: "—", semi: "—" }
  },
  {
    id: "C_TR_SKILLS_DESCENT_40",
    cat: "C",
    sport: "course",
    objectif: "Technique descente (freinage, appuis, relâchement)",
    necessite: "Obligatoire",
    when: "Base/Build/Peak",
    phase: ["base", "build", "peak"],
    avoid: "Douleur genou",
    durationMin: [35, 50],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "40–50' easy + 8–12 descentes 45–60s 'propre' r=remontée easy.", zones: ["Z1", "Z2"] }],
    variants: { trail_short: "8–10 descentes", trail_mountain: "10–12 descentes", trail_ultra: "12 descentes", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 150, max: 400 }
  },
  {
    id: "C_TR_SKILLS_UPHILL_EFFICIENCY",
    cat: "C",
    sport: "course",
    objectif: "Technique montée (cadence, posture, marche efficace)",
    necessite: "Recommandé",
    when: "Base/Build",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [35, 55],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "45' easy + 10x1' montée technique (Z2–Z3) r=descente easy. Focus posture.", zones: ["Z2", "Z3", "Z1"] }],
    variants: { trail_short: "top", trail_mountain: "top", trail_ultra: "top", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 300, max: 600 }
  },
  {
    id: "C_TR_PROPRIO_ANKLE_FOOT",
    cat: "C",
    sport: "strength",
    objectif: "Pied/cheville (proprioception) + prévention entorses",
    necessite: "Obligatoire",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [20, 35],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "20–35': équilibre, sauts contrôlés, bande élastique, mobilité cheville. 2–3x/sem.", zones: ["Z1"] }],
    variants: { trail_short: "excellent", trail_mountain: "excellent", trail_ultra: "excellent", ironman: "—", half: "—", marathon: "—", semi: "—" }
  },
  {
    id: "C_TR_POLES_TECH_60",
    cat: "C",
    sport: "course",
    objectif: "Bâtons (si utilisés) – efficience + coordination",
    necessite: "Optionnel",
    when: "Build/Peak trail_mountain",
    phase: ["build", "peak"],
    avoid: "—",
    durationMin: [45, 70],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "45–70' sentier + 6x4' montée avec bâtons (Z2–Z3) r=descente easy.", zones: ["Z2", "Z3", "Z1"] }],
    variants: { trail_short: "—", trail_mountain: "utile", trail_ultra: "très utile", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 400, max: 900 }
  },
  {
    id: "C_TR_MOBILITY_HIPS_20",
    cat: "C",
    sport: "strength",
    objectif: "Mobilité hanches/dos + gainage (trail)",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [15, 25],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "15–25': mobilité hanches/ischios/chevilles + gainage anti-rotation.", zones: ["Z1"] }],
    variants: { trail_short: "idéal", trail_mountain: "idéal", trail_ultra: "idéal", ironman: "—", half: "—", marathon: "—", semi: "—" }
  },
  {
    id: "C_TR_STRENGTH_HILLS",
    cat: "C",
    sport: "strength",
    objectif: "Force spécifique montée (trail)",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "—",
    durationMin: [40, 55],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "40–55': step-ups, split squat, mollets lourds, gainage, proprio. RPE 6–7.", zones: ["Z1"] }],
    variants: { trail_short: "prioritaire", trail_mountain: "prioritaire", trail_ultra: "prioritaire", ironman: "—", half: "—", marathon: "—", semi: "—" }
  },

  // D — RÉCUP / SUPPORT (4 séances)
  {
    id: "D_TR_RECOVERY_SOFT_30",
    cat: "D",
    sport: "course",
    objectif: "Récupération active (surface souple)",
    necessite: "Obligatoire",
    when: "Après B / grosse sortie",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Douleur",
    durationMin: [25, 40],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "25–40' Z1 très facile + mobilité 10'", zones: ["Z1"] }],
    variants: { trail_short: "ok", trail_mountain: "ok", trail_ultra: "ok", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 0, max: 150 }
  },
  {
    id: "D_TR_BIKE_REGEN_60",
    cat: "D",
    sport: "cyclisme",
    objectif: "Récup sans impact (support trail)",
    necessite: "Recommandé",
    when: "Semaine chargée course",
    phase: ["base", "build", "peak", "taper"],
    avoid: "—",
    durationMin: [45, 75],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [{ part: "Main", text: "45–75' Z1–Z2 très facile, cadence fluide.", zones: ["Z1", "Z2"] }],
    variants: { trail_short: "utile", trail_mountain: "très utile", trail_ultra: "très utile", ironman: "—", half: "—", marathon: "—", semi: "—" }
  },
  {
    id: "D_TR_REST_MOBILITY",
    cat: "D",
    sport: "strength",
    objectif: "Repos actif + mobilité (jour off intelligent)",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build", "peak", "taper"],
    avoid: "—",
    durationMin: [15, 25],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "15–25' mobilité + auto-massage + respiration.", zones: ["Z1"] }],
    variants: { trail_short: "top", trail_mountain: "top", trail_ultra: "top", ironman: "—", half: "—", marathon: "—", semi: "—" }
  },
  {
    id: "D_TR_WALK_REGEN",
    cat: "D",
    sport: "course",
    objectif: "Marche active récupération",
    necessite: "Optionnel",
    when: "Post long run / ultra",
    phase: ["base", "build", "peak", "taper"],
    avoid: "—",
    durationMin: [30, 60],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "30–60' marche active + stretching léger.", zones: ["Z1"] }],
    variants: { trail_short: "ok", trail_mountain: "utile", trail_ultra: "très utile", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 0, max: 100 }
  },

  // PACKS "SEMAINE TYPE" (6 séances prêtes)
  {
    id: "B_TR_PACK_SHORT_RACEWEEK_1",
    cat: "B",
    sport: "course",
    objectif: "Pack trail_short – séance clé 'race effort'",
    necessite: "Recommandé",
    when: "Peak trail_short",
    phase: ["peak"],
    avoid: "Fatigue",
    durationMin: [55, 80],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "20' Z2 + 4x6' Z4a (côte modérée) r=3' Z1 + 10' cool", zones: ["Z2", "Z4a", "Z1"] }],
    variants: { trail_short: "clé", trail_mountain: "optionnel", trail_ultra: "—", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 250, max: 650 }
  },
  {
    id: "A_TR_PACK_SHORT_LONGRUN_2H",
    cat: "A",
    sport: "course",
    objectif: "Pack trail_short – long run spécifique (cap 2h30)",
    necessite: "Obligatoire",
    when: "Build/Peak trail_short",
    phase: ["build", "peak"],
    avoid: "Douleur",
    durationMin: [120, 150],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "2h–2h30 Z1–Z2 avec 3 montées Z3 (5–8'). Nutrition.", zones: ["Z1", "Z2", "Z3"] }],
    variants: { trail_short: "fondamental", trail_mountain: "échauffement pour long", trail_ultra: "—", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 700, max: 1200 }
  },
  {
    id: "B_TR_PACK_LONG_UPHILL_TEMPO",
    cat: "B",
    sport: "course",
    objectif: "Pack trail_mountain – tempo montée (spécifique 40–80km)",
    necessite: "Obligatoire",
    when: "Build/Peak trail_mountain",
    phase: ["build", "peak"],
    avoid: "Fatigue",
    durationMin: [70, 95],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "15' easy + 2x18–22' montée Z3–Z4a r=descente Z1 + 10' cool", zones: ["Z1", "Z3", "Z4a"] }],
    variants: { trail_mountain: "clé", trail_short: "optionnel", trail_ultra: "utile", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 600, max: 1100 }
  },
  {
    id: "C_TR_PACK_LONG_DESC_SKILL",
    cat: "C",
    sport: "course",
    objectif: "Pack trail_mountain – technique descente (volume modéré)",
    necessite: "Obligatoire",
    when: "Build/Peak trail_mountain",
    phase: ["build", "peak"],
    avoid: "Douleur genou",
    durationMin: [40, 60],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "40–60' easy + 10 descentes 45–60s (propre) r=remontée easy.", zones: ["Z1", "Z2"] }],
    variants: { trail_mountain: "prioritaire", trail_short: "utile", trail_ultra: "prioritaire", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 200, max: 500 }
  },
  {
    id: "A_TR_PACK_LONG_LONGRUN_3H",
    cat: "A",
    sport: "course",
    objectif: "Pack trail_mountain – long run (cap 3h30) + nutrition",
    necessite: "Obligatoire",
    when: "Peak trail_mountain",
    phase: ["peak"],
    avoid: "—",
    durationMin: [165, 210],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "2h45–3h30 Z1–Z2. Derniers 20' Z2 haut si frais. Nutrition course.", zones: ["Z1", "Z2"] }],
    variants: { trail_mountain: "clé", trail_short: "—", trail_ultra: "base", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 1200, max: 1800 }
  },
  {
    id: "C_TR_DOWNHILL_EASY",
    cat: "C",
    sport: "course",
    objectif: "Technique descente (facile, propre)",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "—",
    durationMin: [35, 55],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "30–45' facile + 6–10 descentes 45–60s 'propre' r=remontée easy", zones: ["Z1", "Z2"] }],
    variants: { trail_short: "utile", trail_mountain: "utile", trail_ultra: "utile", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 150, max: 400 }
  },

  // =========================================================
  // 🟠 10 KM SPÉCIFIQUE
  // =========================================================

  // A – 10K ENDURANCE
  {
    id: "A_10K_EASY_60",
    cat: "A",
    sport: "course",
    objectif: "Endurance fondamentale 10K (base aérobie)",
    necessite: "Obligatoire",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "Aucun",
    durationMin: [45, 70],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Main", text: "45–70' Z2 facile, focus relâchement", zones: ["Z2"] }
    ],
    variants: { "10k": "Fondamental", semi: "utile", marathon: "utile", ironman: "—", half: "—" }
  },
  {
    id: "A_10K_LONG_RUN_75",
    cat: "A",
    sport: "course",
    objectif: "Sortie longue 10K (endurance + résistance mécanique)",
    necessite: "Obligatoire",
    when: "Build / Peak 10K",
    phase: ["build", "peak"],
    avoid: "Fatigue accumulée",
    durationMin: [70, 95],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Main", text: "70–95' Z2 avec 10' finish Z3 si frais", zones: ["Z2", "Z3"] }
    ],
    variants: { "10k": "Clé", semi: "utile", marathon: "—", ironman: "—", half: "—" }
  },
  {
    id: "A_10K_PROGRESSIVE_60",
    cat: "A",
    sport: "course",
    objectif: "Sortie progressive 10K (negative split)",
    necessite: "Recommandé",
    when: "Build / Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue nerveuse",
    durationMin: [50, 70],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Main", text: "30' Z2 + 15' Z2 haut + 10' Z3 + 5' Z1 cool", zones: ["Z2", "Z3", "Z1"] }
    ],
    variants: { "10k": "Très utile", semi: "utile", marathon: "—", ironman: "—", half: "—" }
  },

  // B – 10K QUALITÉ
  {
    id: "B_10K_VO2_1000",
    cat: "B",
    sport: "course",
    objectif: "VO2max 1000m (puissance aérobie spécifique 10K)",
    necessite: "Obligatoire",
    when: "Build / Peak 10K",
    phase: ["build", "peak"],
    avoid: "Fatigue importante, douleur",
    durationMin: [50, 70],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2 + 4 accélérations", zones: ["Z1", "Z2"] },
      { part: "Main", text: "5–7x1000m Z5 (3'40–4'10/km) r=2'30 trot", zones: ["Z5"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { "10k": "Séance clé", semi: "utile", marathon: "—", ironman: "—", half: "—" }
  },
  {
    id: "B_10K_VO2_600",
    cat: "B",
    sport: "course",
    objectif: "VO2max 600m (VMA courte spécifique 10K)",
    necessite: "Recommandé",
    when: "Build 10K",
    phase: ["build"],
    avoid: "Fatigue nerveuse",
    durationMin: [45, 65],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2 + gammes", zones: ["Z1", "Z2"] },
      { part: "Main", text: "8–12x600m Z5 r=1'30–2' trot", zones: ["Z5"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { "10k": "Excellent", semi: "utile", marathon: "—", ironman: "—", half: "—" }
  },
  {
    id: "B_10K_RACE_PACE_BLOCKS",
    cat: "B",
    sport: "course",
    objectif: "Allure spécifique 10K (blocs race pace)",
    necessite: "Obligatoire",
    when: "Peak 10K",
    phase: ["peak"],
    avoid: "Veille compétition",
    durationMin: [50, 70],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3x10' allure 10K (Z4b) r=3' trot Z1", zones: ["Z4b", "Z1"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { "10k": "Clé", semi: "—", marathon: "—", ironman: "—", half: "—" }
  },
  {
    id: "B_10K_TEMPO_20",
    cat: "B",
    sport: "course",
    objectif: "Tempo soutenu (seuil 10K)",
    necessite: "Recommandé",
    when: "Build / Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue accumulée",
    durationMin: [45, 65],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "2x12' Z4a–Z4b r=4' trot", zones: ["Z4a", "Z4b"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { "10k": "Très utile", semi: "utile", marathon: "—", ironman: "—", half: "—" }
  },
  {
    id: "B_10K_FARTLEK_PYRAMIDE",
    cat: "B",
    sport: "course",
    objectif: "Fartlek pyramidal (versatilité VO2/seuil)",
    necessite: "Recommandé",
    when: "Build 10K",
    phase: ["build"],
    avoid: "—",
    durationMin: [50, 70],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "1'–2'–3'–4'–3'–2'–1' Z4b–Z5 r=1'–2' trot", zones: ["Z4b", "Z5"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { "10k": "Excellent", semi: "utile", marathon: "—", ironman: "—", half: "—" }
  },

  // C – 10K TECHNIQUE
  {
    id: "C_10K_STRIDES_SPEED",
    cat: "C",
    sport: "course",
    objectif: "Lignes droites / économie de course",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [40, 55],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Main", text: "35' Z2 + 10x15s accélérations (95%) r=1' trot", zones: ["Z2", "Z5"] }
    ],
    variants: { "10k": "Fondamental", semi: "utile", marathon: "utile", ironman: "—", half: "—" }
  },

  // D – 10K RÉCUP
  {
    id: "D_10K_RECOVERY_30",
    cat: "D",
    sport: "course",
    objectif: "Récupération active 10K",
    necessite: "Obligatoire",
    when: "Après séance B",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Douleur",
    durationMin: [20, 35],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "20–35' Z1 très relâché + étirements", zones: ["Z1"] }
    ],
    variants: { "10k": "Indispensable", semi: "ok", marathon: "ok", ironman: "ok", half: "ok" }
  },

  // =========================================================
  // 🟨 SEMI-MARATHON ENRICHI
  // =========================================================

  {
    id: "A_SEMI_LONG_RUN_90",
    cat: "A",
    sport: "course",
    objectif: "Sortie longue semi-marathon (résistance mécanique)",
    necessite: "Obligatoire",
    when: "Build / Peak semi",
    phase: ["build", "peak"],
    avoid: "Fatigue accumulée",
    durationMin: [80, 110],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Main", text: "80–110' Z2 (endurance fondamentale semi)", zones: ["Z2"] }
    ],
    variants: { semi: "Fondamental", marathon: "utile", "10k": "utile", ironman: "—", half: "—" }
  },
  {
    id: "A_SEMI_PROGRESSIVE_FINISH",
    cat: "A",
    sport: "course",
    objectif: "Long run progressif (negative split semi)",
    necessite: "Recommandé",
    when: "Peak semi",
    phase: ["peak"],
    avoid: "Fatigue nerveuse",
    durationMin: [75, 100],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Main", text: "50–70' Z2 + 20–30' Z3 (allure semi) + 5' Z1 cool", zones: ["Z2", "Z3", "Z1"] }
    ],
    variants: { semi: "Clé", marathon: "utile", "10k": "—", ironman: "—", half: "—" }
  },
  {
    id: "B_SEMI_VO2_1200",
    cat: "B",
    sport: "course",
    objectif: "VO2max 1200m (support puissance aérobie semi)",
    necessite: "Recommandé",
    when: "Build semi",
    phase: ["build"],
    avoid: "Fatigue nerveuse",
    durationMin: [50, 70],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2 + gammes", zones: ["Z1", "Z2"] },
      { part: "Main", text: "5–6x1200m Z5 r=3' trot", zones: ["Z5"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { semi: "Utile", "10k": "utile", marathon: "—", ironman: "—", half: "—" }
  },
  {
    id: "B_SEMI_TEMPO_LONG_30",
    cat: "B",
    sport: "course",
    objectif: "Tempo long (allure semi, seuil aérobie)",
    necessite: "Obligatoire",
    when: "Build / Peak semi",
    phase: ["build", "peak"],
    avoid: "Fatigue élevée",
    durationMin: [55, 75],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "25–35' continu Z3–Z4a (allure semi)", zones: ["Z3", "Z4a"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { semi: "Clé", marathon: "utile", "10k": "—", ironman: "—", half: "—" }
  },
  {
    id: "B_SEMI_RACE_PACE_2x15",
    cat: "B",
    sport: "course",
    objectif: "Allure course semi-marathon (blocs spécifiques)",
    necessite: "Obligatoire",
    when: "Peak semi",
    phase: ["peak"],
    avoid: "Veille compétition",
    durationMin: [55, 75],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "2x15' allure semi (Z4a) r=4' trot Z1", zones: ["Z4a", "Z1"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { semi: "Séance clé", marathon: "—", "10k": "—", ironman: "—", half: "—" }
  },
  {
    id: "B_SEMI_FARTLEK_CONTROLLED",
    cat: "B",
    sport: "course",
    objectif: "Fartlek contrôlé semi (changements de rythme)",
    necessite: "Recommandé",
    when: "Build semi",
    phase: ["build"],
    avoid: "—",
    durationMin: [50, 70],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "8x(2' Z4a / 2' Z2) + 5' Z1", zones: ["Z4a", "Z2", "Z1"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { semi: "Très utile", marathon: "utile", "10k": "utile", ironman: "—", half: "—" }
  },
  {
    id: "C_SEMI_HILL_STRENGTH",
    cat: "C",
    sport: "course",
    objectif: "Force côtes semi-marathon (économie + puissance)",
    necessite: "Recommandé",
    when: "Base / Build",
    phase: ["base", "build"],
    avoid: "Achilles sensible",
    durationMin: [40, 60],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "30' Z2 + 10x30s côtes Z4b r=descente lente + 10' Z1", zones: ["Z2", "Z4b", "Z1"] }
    ],
    variants: { semi: "Très utile", "10k": "utile", marathon: "utile", ironman: "—", half: "—" }
  },
  {
    id: "D_SEMI_RECOVERY_30",
    cat: "D",
    sport: "course",
    objectif: "Récupération active semi-marathon",
    necessite: "Obligatoire",
    when: "Après séance B / long run",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Douleur",
    durationMin: [20, 35],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "20–35' Z1 très facile + mobilité", zones: ["Z1"] }
    ],
    variants: { semi: "Indispensable", "10k": "ok", marathon: "ok", ironman: "ok", half: "ok" }
  },

  // =========================================================
  // 🟫 TRAIL 20-50 KM (TRAIL SHORT ENRICHI)
  // =========================================================

  // A – ENDURANCE SPÉCIFIQUE TRAIL 20-50KM
  {
    id: "A_TR50_LONG_RUN_2H30",
    cat: "A",
    sport: "course",
    objectif: "Sortie longue trail 20–50km (endurance + D+ modéré)",
    necessite: "Obligatoire",
    when: "Build / Peak trail_short",
    phase: ["build", "peak"],
    avoid: "Fatigue chronique",
    durationMin: [130, 180],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "2h10–3h Z1–Z2. Marcher les côtes raides. Nutrition/hydratation race.", zones: ["Z1", "Z2"] }
    ],
    variants: { trail_short: "Fondamental", trail_mountain: "utile", trail_ultra: "—", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 600, max: 1200 }
  },
  {
    id: "A_TR50_PROGRESSIVE_FINISH",
    cat: "A",
    sport: "course",
    objectif: "Long trail progressif (finish soutenu)",
    necessite: "Recommandé",
    when: "Peak trail_short",
    phase: ["peak"],
    avoid: "Fatigue élevée",
    durationMin: [110, 160],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "80–120' Z2 + 20–30' Z3 (dernières montées plus soutenues). Nutrition.", zones: ["Z2", "Z3"] }
    ],
    variants: { trail_short: "Clé", trail_mountain: "utile", trail_ultra: "—", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 500, max: 1100 }
  },
  {
    id: "A_TR50_RACE_SIMU_2H",
    cat: "A",
    sport: "course",
    objectif: "Simulation course trail 20–50km (effort + nutrition jour J)",
    necessite: "Recommandé",
    when: "Peak (J-21 à J-10)",
    phase: ["peak"],
    avoid: "Trop proche course",
    durationMin: [100, 150],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "100–150' Z2 avec 4–6 montées 'race effort' Z3. Nutrition identique course.", zones: ["Z2", "Z3"] }
    ],
    variants: { trail_short: "Clé", trail_mountain: "—", trail_ultra: "—", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 500, max: 1000 }
  },
  {
    id: "A_TR50_EASY_DPLUS_60",
    cat: "A",
    sport: "course",
    objectif: "Endurance facile + D+ léger (économie montée)",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [50, 75],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "50–75' Z1–Z2 terrain vallonné. Relâchement descente, régularité montée.", zones: ["Z1", "Z2"] }
    ],
    variants: { trail_short: "top", trail_mountain: "top", trail_ultra: "top", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 200, max: 450 }
  },

  // B – QUALITÉ SPÉCIFIQUE TRAIL 20-50KM
  {
    id: "B_TR50_HILL_TEMPO_3x8",
    cat: "B",
    sport: "course",
    objectif: "Tempo montée (seuil spécifique trail 20–50km)",
    necessite: "Obligatoire",
    when: "Build trail_short",
    phase: ["build"],
    avoid: "Fatigue élevée",
    durationMin: [55, 80],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3x8–10' montée Z3–Z4a r=descente Z1", zones: ["Z3", "Z4a", "Z1"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { trail_short: "Clé", trail_mountain: "utile", trail_ultra: "—", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 350, max: 700 }
  },
  {
    id: "B_TR50_RACE_EFFORT_5x5",
    cat: "B",
    sport: "course",
    objectif: "Blocs 'race effort' trail 20–50km",
    necessite: "Obligatoire",
    when: "Peak trail_short",
    phase: ["peak"],
    avoid: "Fatigue nerveuse",
    durationMin: [55, 80],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "5x5' Z3–Z4a terrain varié (côte + plat) r=3' Z1–Z2", zones: ["Z3", "Z4a", "Z1", "Z2"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { trail_short: "Séance clé", trail_mountain: "utile", trail_ultra: "—", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 300, max: 600 }
  },
  {
    id: "B_TR50_FARTLEK_SENTIER",
    cat: "B",
    sport: "course",
    objectif: "Fartlek sentier (relances terrain, spécifique trail court)",
    necessite: "Recommandé",
    when: "Build / Peak",
    phase: ["build", "peak"],
    avoid: "—",
    durationMin: [50, 70],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "15' Z2 + 8–10x(1'30 Z4a / 2'30 Z2) sur sentier + 10' Z1", zones: ["Z2", "Z4a", "Z1"] }
    ],
    variants: { trail_short: "Très utile", trail_mountain: "utile", trail_ultra: "—", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 200, max: 500 }
  },
  {
    id: "B_TR50_DESCENT_SPEED",
    cat: "B",
    sport: "course",
    objectif: "Vitesse descente (tolérance excentrique + technique)",
    necessite: "Recommandé",
    when: "Build / Peak",
    phase: ["build", "peak"],
    avoid: "Douleur genou/quad",
    durationMin: [45, 65],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "8–10x1'30 descente 'vite propre' + remontée Z1. Focus appuis.", zones: ["Z3", "Z1"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { trail_short: "Excellent", trail_mountain: "excellent", trail_ultra: "—", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 250, max: 550 }
  },

  // C – FORCE / TECHNIQUE TRAIL 20-50KM
  {
    id: "C_TR50_STRENGTH_EXPLOSIVE",
    cat: "C",
    sport: "strength",
    objectif: "Force explosive (spécifique trail court/moyen)",
    necessite: "Recommandé",
    when: "Base / Build",
    phase: ["base", "build"],
    avoid: "Courbatures en Peak",
    durationMin: [35, 50],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "35–50': jump squat, box jump, fentes sautées, mollets, gainage dynamique. RPE 7.", zones: ["Z1"] }
    ],
    variants: { trail_short: "Très utile", trail_mountain: "utile", trail_ultra: "—", ironman: "—", half: "—", marathon: "—", semi: "—" }
  },
  {
    id: "C_TR50_TECH_APPUIS",
    cat: "C",
    sport: "course",
    objectif: "Technique appuis sentier (coordination, lecture terrain)",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [35, 55],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "35–55' Z1–Z2 sentier technique + 10x20s exercices appuis (virages, pierrier, racines)", zones: ["Z1", "Z2"] }
    ],
    variants: { trail_short: "top", trail_mountain: "top", trail_ultra: "top", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 100, max: 300 }
  },

  // D – RÉCUP TRAIL 20-50KM
  {
    id: "D_TR50_RECOVERY_WALK_RUN",
    cat: "D",
    sport: "course",
    objectif: "Récupération marche/course (lendemain longue sortie)",
    necessite: "Obligatoire",
    when: "Après long run / séance B",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Douleur",
    durationMin: [25, 40],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "25–40' alternance marche 2'/trot Z1 3'. Très relâché + mobilité 10'", zones: ["Z1"] }
    ],
    variants: { trail_short: "Indispensable", trail_mountain: "ok", trail_ultra: "ok", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 0, max: 100 }
  },

  // =========================================================
  // 🏊 NATATION TRIATHLON SPÉCIFIQUE
  // =========================================================

  // A – ENDURANCE NATATION TRIATHLON
  {
    id: "A_SWIM_TRI_END_2500",
    cat: "A",
    sport: "natation",
    objectif: "Endurance natation triathlon (volume aérobie)",
    necessite: "Obligatoire",
    when: "Build / Peak IM & 70.3",
    phase: ["build", "peak"],
    avoid: "Douleur épaule",
    durationMin: [50, 75],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Warm-up", text: "400m facile + 4x50m éducatifs (r=10s)", zones: ["Z1"] },
      { part: "Main", text: "2000–2500m continu Z2 (CSS+8–10s/100). Respiration bilat tous les 3 ou 5.", zones: ["Z2"] },
      { part: "Cool-down", text: "200m souple", zones: ["Z1"] }
    ],
    variants: { ironman: "Fondamental", half: "Fondamental", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "A_SWIM_TRI_LONG_3500",
    cat: "A",
    sport: "natation",
    objectif: "Sortie longue natation IM (3500m+, résistance distance)",
    necessite: "Obligatoire",
    when: "Build / Peak IM",
    phase: ["build", "peak"],
    avoid: "Fatigue épaule chronique",
    durationMin: [65, 90],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Warm-up", text: "400m facile + 200m éducatifs", zones: ["Z1"] },
      { part: "Main", text: "3000–3500m continu Z2 (CSS+8–12s). Varier respiration. Hydratation au bord si possible.", zones: ["Z2"] },
      { part: "Cool-down", text: "200m souple", zones: ["Z1"] }
    ],
    variants: { ironman: "Séance clé", half: "utile", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "A_SWIM_TRI_OPEN_WATER_SIMU",
    cat: "A",
    sport: "natation",
    objectif: "Simulation eau libre (navigation, respiration, drafting)",
    necessite: "Recommandé",
    when: "Peak IM / 70.3 (si accès eau libre)",
    phase: ["peak"],
    avoid: "Eau froide sans combi",
    durationMin: [40, 70],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Main", text: "1500–2500m Z2 en eau libre. Pratiquer : visées tous les 8–10 coups, départs groupés, contournement bouées, drafting.", zones: ["Z2"] }
    ],
    variants: { ironman: "Essentiel", half: "Essentiel", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "A_SWIM_TRI_EASY_TECH_1500",
    cat: "A",
    sport: "natation",
    objectif: "Endurance facile + technique (base triathlon)",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [35, 50],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Warm-up", text: "300m facile", zones: ["Z1"] },
      { part: "Main", text: "6x(100m éducatifs + 150m Z2 propre) r=15s", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "200m souple", zones: ["Z1"] }
    ],
    variants: { ironman: "utile", half: "utile", marathon: "—", semi: "—", "10k": "—" }
  },

  // B – QUALITÉ NATATION TRIATHLON
  {
    id: "B_SWIM_TRI_CSS_10x200",
    cat: "B",
    sport: "natation",
    objectif: "CSS longue distance (seuil aérobie natation triathlon)",
    necessite: "Obligatoire",
    when: "Build / Peak IM & 70.3",
    phase: ["build", "peak"],
    avoid: "Épaule fragile",
    durationMin: [55, 80],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Warm-up", text: "400m facile + 4x50m prog", zones: ["Z1", "Z2"] },
      { part: "Main", text: "8–10x200m à CSS r=20–25s. Régularité absolue.", zones: ["Z3"] },
      { part: "Cool-down", text: "200m souple", zones: ["Z1"] }
    ],
    variants: { ironman: "Séance clé", half: "Séance clé", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "B_SWIM_TRI_CSS_5x400",
    cat: "B",
    sport: "natation",
    objectif: "CSS blocs longs (endurance seuil natation IM)",
    necessite: "Recommandé",
    when: "Build IM",
    phase: ["build"],
    avoid: "Fatigue technique",
    durationMin: [60, 85],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Warm-up", text: "400m facile + 200m éducatifs", zones: ["Z1"] },
      { part: "Main", text: "4–5x400m à CSS r=30–40s. Garder allure constante.", zones: ["Z3"] },
      { part: "Cool-down", text: "200m souple", zones: ["Z1"] }
    ],
    variants: { ironman: "Excellent", half: "utile", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "B_SWIM_TRI_RACE_PACE_IM",
    cat: "B",
    sport: "natation",
    objectif: "Allure course IM (3.8km pace, régularité)",
    necessite: "Obligatoire",
    when: "Peak IM",
    phase: ["peak"],
    avoid: "Veille compétition",
    durationMin: [60, 85],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Warm-up", text: "400m facile + 4x50m prog", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3x(800m allure course IM Z2 haut) r=1' facile. Viser régularité.", zones: ["Z2"] },
      { part: "Cool-down", text: "200m souple", zones: ["Z1"] }
    ],
    variants: { ironman: "Séance clé", half: "—", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "B_SWIM_TRI_RACE_PACE_703",
    cat: "B",
    sport: "natation",
    objectif: "Allure course 70.3 (1.9km pace, légèrement plus soutenu)",
    necessite: "Obligatoire",
    when: "Peak 70.3",
    phase: ["peak"],
    avoid: "Veille compétition",
    durationMin: [50, 70],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Warm-up", text: "400m facile + 4x50m prog", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3x(600m allure course 70.3 Z3 bas) r=1' facile. Rester propre.", zones: ["Z3"] },
      { part: "Cool-down", text: "200m souple", zones: ["Z1"] }
    ],
    variants: { half: "Séance clé", ironman: "—", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "B_SWIM_TRI_VO2_8x100",
    cat: "B",
    sport: "natation",
    objectif: "VO2max natation (puissance aérobie, support triathlon)",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "Fatigue / épaule douloureuse",
    durationMin: [45, 65],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Warm-up", text: "400m facile + 4x50m prog", zones: ["Z1", "Z2"] },
      { part: "Main", text: "8–10x100m Z4–Z5 (CSS-5 à -8s/100) r=20–30s", zones: ["Z4a", "Z5"] },
      { part: "Cool-down", text: "200m souple", zones: ["Z1"] }
    ],
    variants: { ironman: "utile", half: "utile", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "B_SWIM_TRI_NEGATIVE_SPLIT",
    cat: "B",
    sport: "natation",
    objectif: "Negative split (pacing triathlon – partir contrôlé, finir fort)",
    necessite: "Recommandé",
    when: "Peak IM / 70.3",
    phase: ["peak"],
    avoid: "—",
    durationMin: [50, 70],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Warm-up", text: "400m facile + 200m éducatifs", zones: ["Z1"] },
      { part: "Main", text: "3x(600m : 200m Z2 + 200m Z2 haut + 200m Z3) r=45s", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "200m souple", zones: ["Z1"] }
    ],
    variants: { ironman: "Excellent pacing", half: "Excellent pacing", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "B_SWIM_TRI_THRESHOLD_PYRAMID",
    cat: "B",
    sport: "natation",
    objectif: "Pyramide seuil (versatilité CSS / intensité variée)",
    necessite: "Recommandé",
    when: "Build / Peak",
    phase: ["build", "peak"],
    avoid: "—",
    durationMin: [50, 75],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Warm-up", text: "400m facile + 4x50m éducatifs", zones: ["Z1"] },
      { part: "Main", text: "100-200-300-400-500-400-300-200-100 à CSS (r=15–30s progressif)", zones: ["Z3"] },
      { part: "Cool-down", text: "200m souple", zones: ["Z1"] }
    ],
    variants: { ironman: "Excellent", half: "Excellent", marathon: "—", semi: "—", "10k": "—" }
  },

  // C – TECHNIQUE NATATION TRIATHLON
  {
    id: "C_SWIM_TRI_SIGHTING_DRILLS",
    cat: "C",
    sport: "natation",
    objectif: "Technique visée (sighting) + navigation eau libre",
    necessite: "Obligatoire",
    when: "Build / Peak (pré-compétition)",
    phase: ["build", "peak"],
    avoid: "—",
    durationMin: [35, 55],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Warm-up", text: "300m facile", zones: ["Z1"] },
      { part: "Main", text: "10x150m Z2 avec sighting toutes les 8 brasses (lever tête, viser cible) r=15s. + 4x50m nage en 'paquet' (simulation drafting).", zones: ["Z2"] },
      { part: "Cool-down", text: "200m souple", zones: ["Z1"] }
    ],
    variants: { ironman: "Essentiel", half: "Essentiel", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "C_SWIM_TRI_CATCH_PULL",
    cat: "C",
    sport: "natation",
    objectif: "Technique catch & pull (efficacité propulsion triathlon)",
    necessite: "Obligatoire",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [35, 55],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Warm-up", text: "300m facile", zones: ["Z1"] },
      { part: "Main", text: "8x(50m rattrapé + 50m poing fermé + 100m nage complète propre) r=15s", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "200m souple", zones: ["Z1"] }
    ],
    variants: { ironman: "Prioritaire", half: "Prioritaire", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "C_SWIM_TRI_DRAFTING_PACK",
    cat: "C",
    sport: "natation",
    objectif: "Drafting & nage en peloton (spécifique départ triathlon)",
    necessite: "Recommandé",
    when: "Peak (pré-compétition)",
    phase: ["peak"],
    avoid: "Si seul en bassin (adapter avec éducatifs)",
    durationMin: [35, 55],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Warm-up", text: "300m facile", zones: ["Z1"] },
      { part: "Main", text: "6x300m : 2 longueurs dans les pieds du partenaire + 2 longueurs côté (aspiration latérale) + 2 longueurs solo Z2. r=20s", zones: ["Z2"] },
      { part: "Cool-down", text: "200m souple", zones: ["Z1"] }
    ],
    variants: { ironman: "Très utile", half: "Très utile", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "C_SWIM_TRI_BILATERAL_BREATHING",
    cat: "C",
    sport: "natation",
    objectif: "Respiration bilatérale (adaptation eau libre / vagues)",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [30, 50],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Warm-up", text: "300m facile", zones: ["Z1"] },
      { part: "Main", text: "8x200m Z2 : 100m respiration tous les 3 coups + 100m respiration tous les 5 coups. r=15s", zones: ["Z2"] },
      { part: "Cool-down", text: "200m souple", zones: ["Z1"] }
    ],
    variants: { ironman: "Fondamental", half: "Fondamental", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "C_SWIM_TRI_KICK_EFFICIENCY",
    cat: "C",
    sport: "natation",
    objectif: "Battements économiques (réduire coût jambes pour vélo/course)",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [30, 50],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Warm-up", text: "300m facile", zones: ["Z1"] },
      { part: "Main", text: "6x(100m plaquette sans plaquette de battements + 100m nage complète '2 battements/cycle') r=15s. Focus : battements minimaux, propulsion bras.", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "200m souple", zones: ["Z1"] }
    ],
    variants: { ironman: "Prioritaire (épargner jambes)", half: "Très utile", marathon: "—", semi: "—", "10k": "—" }
  },

  // D – RÉCUP NATATION TRIATHLON
  {
    id: "D_SWIM_TRI_REGEN_1000",
    cat: "D",
    sport: "natation",
    objectif: "Récupération active natation triathlon (post-séance dure)",
    necessite: "Recommandé",
    when: "Lendemain séance B / brick / long vélo",
    phase: ["base", "build", "peak", "taper"],
    avoid: "—",
    durationMin: [20, 35],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Main", text: "800–1200m très facile Z1 : 200m crawl + 100m dos + 100m éducatifs. Répéter. Souplesse épaule.", zones: ["Z1"] }
    ],
    variants: { ironman: "Excellent récup", half: "Excellent récup", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "D_SWIM_TRI_PRE_RACE_ACTIVATION",
    cat: "D",
    sport: "natation",
    objectif: "Activation pré-course triathlon (J-1 ou matin course)",
    necessite: "Recommandé",
    when: "Veille ou matin compétition",
    phase: ["base", "build", "peak", "taper"],
    avoid: "—",
    durationMin: [15, 25],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Main", text: "600–800m : 200m facile + 4x50m prog (Z1→Z3) r=15s + 200m Z2 + 4x25m vif r=15s + 100m cool", zones: ["Z1", "Z2", "Z3"] }
    ],
    variants: { ironman: "Idéal veille", half: "Idéal veille", marathon: "—", semi: "—", "10k": "—" }
  },

  // =========================================================
  // 🚴 VÉLO AVANCÉ (SST, Force, Sprints, Race Sim, Train Low)
  // =========================================================

  {
    id: "B_BIKE_SST_1x30",
    cat: "B",
    sport: "cyclisme",
    objectif: "Sweet Spot long bloc (1x30' continu, durabilité seuil)",
    necessite: "Recommandé",
    when: "Build / Peak IM",
    phase: ["build", "peak"],
    avoid: "Fatigue accumulée",
    durationMin: [65, 90],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "1x30' Z3–Z4a (SST continu). Cadence régulière 85–95 rpm.", zones: ["Z3", "Z4a"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { ironman: "Clé", half: "Excellent", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "B_BIKE_SST_3x20",
    cat: "B",
    sport: "cyclisme",
    objectif: "Sweet Spot 3x20' (volume seuil élevé)",
    necessite: "Recommandé",
    when: "Build IM / 70.3",
    phase: ["build"],
    avoid: "Fatigue chronique",
    durationMin: [90, 120],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3x20' Z3–Z4a r=5' Z1–Z2", zones: ["Z3", "Z4a", "Z1", "Z2"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { ironman: "Volume clé", half: "Excellent", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "C_BIKE_FORCE_LOW_CAD",
    cat: "C",
    sport: "cyclisme",
    objectif: "Force basse cadence (50–60 rpm, recrutement neuromusculaire)",
    necessite: "Recommandé",
    when: "Base / Build",
    phase: ["base", "build"],
    avoid: "Problèmes genoux",
    durationMin: [60, 90],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2 cadence libre", zones: ["Z1", "Z2"] },
      { part: "Main", text: "6x5' Z3 cadence 50–60 rpm (assis) r=5' Z1 cadence libre", zones: ["Z3", "Z1"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { ironman: "Très utile", half: "utile", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "B_BIKE_SPRINT_NEUROMUSCULAR",
    cat: "B",
    sport: "cyclisme",
    objectif: "Sprints neuromusculaires (recrutement, W' recharge rapide)",
    necessite: "Optionnel",
    when: "Build (1x/10–14j)",
    phase: ["build"],
    avoid: "Si VLamax déjà élevée",
    durationMin: [50, 75],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Warm-up", text: "20' Z1→Z2 + 3 accélérations progressives", zones: ["Z1", "Z2"] },
      { part: "Main", text: "8–10x10s sprint maximal (départ arrêté ou lancé) r=4' Z1 complet", zones: ["Z5"] },
      { part: "Cool-down", text: "15' Z1", zones: ["Z1"] }
    ],
    variants: { ironman: "rare", half: "1x/10j", "10k": "—", marathon: "—", semi: "—" }
  },
  {
    id: "A_BIKE_ENDURANCE_PROGRESSIVE",
    cat: "A",
    sport: "cyclisme",
    objectif: "Endurance progressive (negative split vélo)",
    necessite: "Recommandé",
    when: "Build / Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue importante",
    durationMin: [90, 180],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Main", text: "60–120' Z2 bas + 30–45' Z2 haut + 15–20' Z3 (si frais). Cadence stable.", zones: ["Z2", "Z3"] }
    ],
    variants: { ironman: "Excellent pacing", half: "Très utile", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "B_BIKE_RACE_SIM_IM",
    cat: "B",
    sport: "cyclisme",
    objectif: "Simulation course IM (4–5h Z2, pacing CP/W', nutrition)",
    necessite: "Obligatoire",
    when: "Peak IM (J-21 à J-14)",
    phase: ["peak"],
    avoid: "Trop proche course",
    durationMin: [240, 300],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Warm-up", text: "20' Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3h30–4h30 Z2 (IM power). Nutrition identique jour J (60–90g CHO/h). Cadence cible.", zones: ["Z2"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { ironman: "Séance clé absolue", half: "—", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "B_BIKE_RACE_SIM_703",
    cat: "B",
    sport: "cyclisme",
    objectif: "Simulation course 70.3 (2h–2h30 Z2–Z3, pacing, nutrition)",
    necessite: "Obligatoire",
    when: "Peak 70.3 (J-21 à J-14)",
    phase: ["peak"],
    avoid: "Trop proche course",
    durationMin: [140, 180],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "2h–2h30 Z2–Z3 (70.3 race power). Nutrition 60–80g CHO/h.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { half: "Séance clé absolue", ironman: "—", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "A_BIKE_TRAIN_LOW",
    cat: "A",
    sport: "cyclisme",
    objectif: "Train Low (Z2 glycogène bas – Impey protocol, oxydation lipidique)",
    necessite: "Optionnel",
    when: "Base / Build (1x/sem max)",
    phase: ["base", "build"],
    avoid: "Si fatigue élevée ou séance B le même jour",
    durationMin: [60, 120],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Main", text: "60–120' Z2 strict (matin, sans petit-déjeuner ou après séance veille soir). Eau + électrolytes uniquement. Cadence 85–95 rpm.", zones: ["Z2"] }
    ],
    variants: { ironman: "Excellent fat adaptation", half: "utile", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "B_BIKE_OVERUNDER_EXTENDED",
    cat: "B",
    sport: "cyclisme",
    objectif: "Over-Under étendu (tolérance lactate, clearance – Lactate Shuttle)",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "VLamax déjà élevée",
    durationMin: [75, 105],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "4x10' (2' Z4a / 3' Z3 / 2' Z4a / 3' Z3) r=5' Z1", zones: ["Z3", "Z4a", "Z1"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { ironman: "Excellent clearance", half: "Clé", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "C_BIKE_AERO_POSITION_DRILLS",
    cat: "C",
    sport: "cyclisme",
    objectif: "Position aéro prolongée (confort + puissance en position)",
    necessite: "Recommandé",
    when: "Toute l'année IM / 70.3",
    phase: ["base", "build"],
    avoid: "Douleur cervicale/lombaire",
    durationMin: [60, 120],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Main", text: "Z2 avec 6x10' en position aéro (sans surpuissance) r=5' position relâchée Z1.", zones: ["Z2", "Z1"] }
    ],
    variants: { ironman: "Prioritaire", half: "Très utile", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "B_BIKE_VO2_5x5",
    cat: "B",
    sport: "cyclisme",
    objectif: "VO2max 5x5' (puissance aérobie maximale vélo)",
    necessite: "Recommandé",
    when: "Build / Peak 70.3",
    phase: ["build", "peak"],
    avoid: "VLamax très haute",
    durationMin: [60, 85],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2 + 2 accélérations", zones: ["Z1", "Z2"] },
      { part: "Main", text: "5x5' Z5 (105–115% FTP) r=5' Z1–Z2", zones: ["Z5", "Z1", "Z2"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { half: "Excellent", ironman: "utile (1x/10j)", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "B_BIKE_THRESHOLD_2x20",
    cat: "B",
    sport: "cyclisme",
    objectif: "Seuil 2x20' (FTP, durabilité au seuil)",
    necessite: "Recommandé",
    when: "Build / Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue accumulée",
    durationMin: [70, 95],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Warm-up", text: "15' Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "2x20' Z4a (95–100% FTP) r=8' Z1–Z2", zones: ["Z4a", "Z1", "Z2"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { half: "Clé", ironman: "utile", marathon: "—", semi: "—", "10k": "—" }
  },

  // =========================================================
  // 🏃 COURSE AVANCÉ (Allure spécifique, VMA longue, Train Low, Race Sim)
  // =========================================================

  {
    id: "B_RUN_VMA_2000",
    cat: "B",
    sport: "course",
    objectif: "VMA longue 2000m (puissance aérobie, capacité VO2max)",
    necessite: "Recommandé",
    when: "Build (10K, semi)",
    phase: ["build"],
    avoid: "Fatigue nerveuse, douleur",
    durationMin: [55, 75],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2 + gammes", zones: ["Z1", "Z2"] },
      { part: "Main", text: "4–5x2000m Z4b–Z5 r=3' trot", zones: ["Z4b", "Z5"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { "10k": "Séance clé", semi: "Très utile", marathon: "utile", ironman: "—", half: "—" }
  },
  {
    id: "B_RUN_MARATHON_PACE_3x5K",
    cat: "B",
    sport: "course",
    objectif: "Allure marathon blocs longs (3x5km race pace)",
    necessite: "Obligatoire",
    when: "Peak marathon",
    phase: ["peak"],
    avoid: "Veille compétition",
    durationMin: [75, 100],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3x5km allure marathon (Z3) r=4' trot Z1", zones: ["Z3", "Z1"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { marathon: "Séance clé absolue", semi: "—", "10k": "—", ironman: "—", half: "—" }
  },
  {
    id: "B_RUN_MARATHON_PACE_LONG",
    cat: "B",
    sport: "course",
    objectif: "Tempo marathon continu (30–40' allure course)",
    necessite: "Obligatoire",
    when: "Peak marathon",
    phase: ["peak"],
    avoid: "Fatigue élevée",
    durationMin: [65, 90],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "30–40' continu allure marathon (Z3). Pacing constant.", zones: ["Z3"] },
      { part: "Cool-down", text: "15' Z1", zones: ["Z1"] }
    ],
    variants: { marathon: "Clé", semi: "utile (Z3 haut)", "10k": "—", ironman: "—", half: "—" }
  },
  {
    id: "A_RUN_TRAIN_LOW",
    cat: "A",
    sport: "course",
    objectif: "Train Low course (Z2 glycogène bas – optimisation oxydation lipidique)",
    necessite: "Optionnel",
    when: "Base / Build (1x/sem max)",
    phase: ["base", "build"],
    avoid: "Fatigue élevée, séance B le même jour",
    durationMin: [45, 75],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Main", text: "45–75' Z2 strict (matin à jeun ou post-séance veille). Eau + électrolytes uniquement.", zones: ["Z2"] }
    ],
    variants: { ironman: "Excellent", half: "utile", marathon: "utile", semi: "—", "10k": "—" }
  },
  {
    id: "B_RUN_IM_RACE_SIM",
    cat: "B",
    sport: "course",
    objectif: "Simulation course IM (allure marathon IM, post effort vélo virtuel)",
    necessite: "Recommandé",
    when: "Peak IM (J-21)",
    phase: ["peak"],
    avoid: "Trop proche course",
    durationMin: [75, 110],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Main", text: "15' Z2 + 45–75' allure IM marathon Z2 haut (régularité absolue) + 10' Z1. Nutrition 30–60g CHO/h.", zones: ["Z2", "Z1"] }
    ],
    variants: { ironman: "Clé", half: "—", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "B_RUN_703_RACE_SIM",
    cat: "B",
    sport: "course",
    objectif: "Simulation course 70.3 (allure semi sous fatigue)",
    necessite: "Recommandé",
    when: "Peak 70.3 (J-21)",
    phase: ["peak"],
    avoid: "Trop proche course",
    durationMin: [55, 80],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Main", text: "10' Z2 + 35–55' Z3–Z4a (allure 70.3 run) + 10' Z1. Comme le jour J.", zones: ["Z2", "Z3", "Z4a", "Z1"] }
    ],
    variants: { half: "Clé", ironman: "—", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "B_RUN_TEMPO_PROGRESSIVE",
    cat: "B",
    sport: "course",
    objectif: "Tempo progressif (Z2→Z3→Z4a, pacing training)",
    necessite: "Recommandé",
    when: "Build / Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue importante",
    durationMin: [50, 75],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Main", text: "15' Z2 + 10' Z2 haut + 10' Z3 + 5' Z4a + 10' Z1 cool", zones: ["Z2", "Z3", "Z4a", "Z1"] }
    ],
    variants: { marathon: "Excellent", semi: "Excellent", "10k": "Très utile", ironman: "utile", half: "utile" }
  },
  {
    id: "B_RUN_CRUISE_INTERVALS",
    cat: "B",
    sport: "course",
    objectif: "Cruise intervals (seuil fractionné court repos, Daniels)",
    necessite: "Recommandé",
    when: "Build / Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue accumulée",
    durationMin: [50, 70],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "5x6' Z4a (seuil) r=1' trot (repos très court)", zones: ["Z4a"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { marathon: "Excellent", semi: "Excellent", "10k": "Très utile", ironman: "utile", half: "utile" }
  },
  {
    id: "B_RUN_VO2_LONG_4x5",
    cat: "B",
    sport: "course",
    objectif: "VO2max long (4x5', temps en zone maximal)",
    necessite: "Recommandé",
    when: "Build",
    phase: ["build"],
    avoid: "Fatigue nerveuse",
    durationMin: [55, 75],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2 + gammes", zones: ["Z1", "Z2"] },
      { part: "Main", text: "4x5' Z4b–Z5 r=4' trot", zones: ["Z4b", "Z5"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { "10k": "Excellent", semi: "Très utile", marathon: "utile", ironman: "—", half: "utile" }
  },

  // =========================================================
  // 🔄 BRICK AVANCÉ (5-stage progression, semi, activation)
  // =========================================================

  {
    id: "BRICK_STAGE1_INTRO",
    cat: "A",
    sport: "brick",
    objectif: "Brick Stage 1 – Introduction (Z2 bike + Z1 run, adaptation)",
    necessite: "Obligatoire",
    when: "Base (début bloc brick)",
    phase: ["base"],
    avoid: "—",
    durationMin: [60, 90],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Bike", text: "45–60' Z2 facile", zones: ["Z2"] },
      { part: "Run", text: "15–20' Z1 très facile (focus sensation transition)", zones: ["Z1"] }
    ],
    variants: { ironman: "Base", half: "Base", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "BRICK_STAGE2_BUILD",
    cat: "A",
    sport: "brick",
    objectif: "Brick Stage 2 – Build (Z2 bike prolongé + Z2 run)",
    necessite: "Obligatoire",
    when: "Build",
    phase: ["build"],
    avoid: "Fatigue importante",
    durationMin: [90, 135],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Bike", text: "75–105' Z2 stable", zones: ["Z2"] },
      { part: "Run", text: "20–30' Z2 (adaptation neuromusculaire)", zones: ["Z2"] }
    ],
    variants: { ironman: "Progression", half: "Progression", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "BRICK_STAGE3_QUALITY",
    cat: "B",
    sport: "brick",
    objectif: "Brick Stage 3 – Quality (bike SST + run tempo)",
    necessite: "Recommandé",
    when: "Build / Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue accumulée",
    durationMin: [100, 150],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Bike", text: "75–105' avec 3x10' Z3 (SST)", zones: ["Z2", "Z3"] },
      { part: "Run", text: "25–35' Z2 avec 10' Z3 (dernières minutes)", zones: ["Z2", "Z3"] }
    ],
    variants: { ironman: "Excellent", half: "Clé", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "BRICK_STAGE4_SPECIFIC",
    cat: "B",
    sport: "brick",
    objectif: "Brick Stage 4 – Specific (race intensity bike + race pace run)",
    necessite: "Recommandé",
    when: "Peak",
    phase: ["peak"],
    avoid: "Veille compétition",
    durationMin: [120, 180],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Bike", text: "90–140' race intensity Z2–Z3", zones: ["Z2", "Z3"] },
      { part: "Run", text: "30–40' race pace Z3 (70.3) ou Z2 haut (IM)", zones: ["Z2", "Z3"] }
    ],
    variants: { ironman: "Clé", half: "Séance clé", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "BRICK_STAGE5_RACE_SIM",
    cat: "B",
    sport: "brick",
    objectif: "Brick Stage 5 – Race Simulation (effort complet + nutrition)",
    necessite: "Recommandé",
    when: "Peak (J-21 à J-14)",
    phase: ["peak"],
    avoid: "Trop proche course",
    durationMin: [150, 240],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Bike", text: "Race effort complet (2h IM ou 1h30 70.3). Nutrition jour J.", zones: ["Z2", "Z3"] },
      { part: "Run", text: "30–45' race pace. Nutrition jour J.", zones: ["Z2", "Z3"] }
    ],
    variants: { ironman: "Absolument clé", half: "Absolument clé", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "BRICK_SEMI_SPECIFIQUE",
    cat: "B",
    sport: "brick",
    objectif: "Brick semi-marathon (vélo pré-fatigue + run semi pace)",
    necessite: "Recommandé",
    when: "Peak 70.3",
    phase: ["peak"],
    avoid: "Fatigue accumulée",
    durationMin: [90, 130],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Bike", text: "60–80' Z2–Z3 (pré-fatigue)", zones: ["Z2", "Z3"] },
      { part: "Run", text: "30–40' Z3–Z4a (allure semi sous fatigue)", zones: ["Z3", "Z4a"] }
    ],
    variants: { half: "Spécifique", ironman: "—", semi: "utile", marathon: "—", "10k": "—" }
  },
  {
    id: "BRICK_ACTIVATION_PRE_RACE",
    cat: "D",
    sport: "brick",
    objectif: "Brick activation pré-course (J-1, ouverture)",
    necessite: "Recommandé",
    when: "Veille compétition",
    phase: ["base", "build", "peak", "taper"],
    avoid: "—",
    durationMin: [30, 50],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Bike", text: "20–30' Z1–Z2 + 3x30s Z4a (ouverture)", zones: ["Z1", "Z2", "Z4a"] },
      { part: "Run", text: "10–15' Z1 + 4x20s accélération (Z4a) r=1'", zones: ["Z1", "Z4a"] }
    ],
    variants: { ironman: "Idéal veille", half: "Idéal veille", marathon: "—", semi: "—", "10k": "—" }
  },

  // =========================================================
  // ⚡ TAPER / AFFÛTAGE (Mujika, réduction exponentielle)
  // =========================================================

  {
    id: "D_TAPER_BIKE_OPENER",
    cat: "D",
    sport: "cyclisme",
    objectif: "Ouverture vélo taper (intensité maintenue, volume réduit)",
    necessite: "Obligatoire",
    when: "Taper S-1 (J-5 à J-3)",
    phase: ["taper"],
    avoid: "—",
    durationMin: [40, 60],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Main", text: "30' Z1–Z2 + 4x1' Z4a (ouverture) r=3' Z1 + 10' Z1 cool", zones: ["Z1", "Z2", "Z4a"] }
    ],
    variants: { ironman: "Essentiel", half: "Essentiel", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "D_TAPER_RUN_OPENER",
    cat: "D",
    sport: "course",
    objectif: "Ouverture course taper (rappel allure, sans fatigue)",
    necessite: "Obligatoire",
    when: "Taper S-1 (J-4 à J-2)",
    phase: ["taper"],
    avoid: "—",
    durationMin: [25, 40],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Main", text: "20' Z1–Z2 + 4x30s allure course (Z4a) r=2' Z1 + 5' Z1 cool", zones: ["Z1", "Z2", "Z4a"] }
    ],
    variants: { ironman: "Essentiel", half: "Essentiel", marathon: "Essentiel", semi: "Essentiel", "10k": "Essentiel" }
  },
  {
    id: "D_TAPER_SWIM_OPENER",
    cat: "D",
    sport: "natation",
    objectif: "Ouverture natation taper (technique + rappel allure)",
    necessite: "Recommandé",
    when: "Taper S-1 (J-3 à J-2)",
    phase: ["taper"],
    avoid: "—",
    durationMin: [20, 35],
    metricKey: "allure",
    sportKey: "natation",
    structure: [
      { part: "Main", text: "300m facile + 4x100m Z2 + 4x50m allure course (Z3) r=15s + 200m cool", zones: ["Z1", "Z2", "Z3"] }
    ],
    variants: { ironman: "Essentiel", half: "Essentiel", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "D_TAPER_SHAKEOUT",
    cat: "D",
    sport: "course",
    objectif: "Shakeout veille course (activation légère)",
    necessite: "Recommandé",
    when: "J-1",
    phase: ["base", "build", "peak", "taper"],
    avoid: "—",
    durationMin: [15, 25],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "15–20' Z1 + 3x15s accélérations (relâché) r=1' + 5' marche", zones: ["Z1"] }
    ],
    variants: { ironman: "OK", half: "OK", marathon: "Idéal", semi: "Idéal", "10k": "Idéal" }
  },

  // =========================================================
  // 💪 MUSCULATION AVANCÉE (Plio, Upper, Explosive, Concurrent)
  // =========================================================

  {
    id: "C_STR_PLYOMETRIC",
    cat: "C",
    sport: "strength",
    objectif: "Pliométrie (puissance réactive, économie de course)",
    necessite: "Recommandé",
    when: "Base / Build (2x/sem)",
    phase: ["base", "build"],
    avoid: "Phase taper, douleur articulaire",
    durationMin: [25, 40],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "25–40': drop jump, box jump, skipping, fentes sautées. 3–5 séries x 6–8 reps. Repos complet entre séries.", zones: ["Z1"] }
    ],
    variants: { "10k": "Excellent", semi: "Très utile", marathon: "utile", ironman: "optionnel", half: "optionnel" }
  },
  {
    id: "C_STR_UPPER_BODY_TRI",
    cat: "C",
    sport: "strength",
    objectif: "Haut du corps triathlon (épaules, dos, stabilité nage)",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "Douleur épaule",
    durationMin: [25, 40],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "25–40': tirages (rowing, pull), rotation externe épaule, pompes, face pull, Y-raise. 3x10–12. RPE 6.", zones: ["Z1"] }
    ],
    variants: { ironman: "Prioritaire", half: "Prioritaire", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "C_STR_EXPLOSIVE_LOWER",
    cat: "C",
    sport: "strength",
    objectif: "Force explosive bas du corps (recrutement neuromusculaire)",
    necessite: "Recommandé",
    when: "Base / Build",
    phase: ["base", "build"],
    avoid: "Phase taper",
    durationMin: [30, 45],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "30–45': squat jump, box jump, kettlebell swing, split squat explosif. 4x5–6 reps. Repos long (2–3').", zones: ["Z1"] }
    ],
    variants: { "10k": "Très utile", semi: "utile", marathon: "utile", ironman: "optionnel", half: "utile" }
  },
  {
    id: "C_STR_CONCURRENT_AM_PM",
    cat: "C",
    sport: "strength",
    objectif: "Force AM/PM (anti-interférence AMPK/mTOR – avant séance endurance PM)",
    necessite: "Optionnel",
    when: "Base / Build (espacement ≥6h avec endurance)",
    phase: ["base", "build"],
    avoid: "Séance B intense le même jour",
    durationMin: [30, 45],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "30–45' matin : squats lourds (3–5 RM), hip hinge, gainage. Priorité charge > volume. Séance endurance ≥6h après.", zones: ["Z1"] }
    ],
    variants: { ironman: "utile", half: "utile", marathon: "utile", semi: "utile", "10k": "utile" }
  },

  // =========================================================
  // 🎯 SÉANCES SPÉCIALES (Activation, Test, Pacing)
  // =========================================================

  {
    id: "D_PRE_RACE_ACTIVATION_RUN",
    cat: "D",
    sport: "course",
    objectif: "Activation pré-course (matin jour J)",
    necessite: "Recommandé",
    when: "Matin compétition (J)",
    phase: ["base", "build", "peak", "taper"],
    avoid: "—",
    durationMin: [10, 20],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [
      { part: "Main", text: "10–15' Z1 + 3x20s prog (Z2→Z4a) r=1' + 5' marche. Terminer 20' avant départ.", zones: ["Z1", "Z4a"] }
    ],
    variants: { marathon: "Idéal", semi: "Idéal", "10k": "Idéal", ironman: "utile", half: "utile" }
  },
  {
    id: "B_BIKE_CP_W_PRIME_TEST",
    cat: "B",
    sport: "cyclisme",
    objectif: "Test CP/W' (3' + 12' all-out, étalonnage modèle puissance critique)",
    necessite: "Optionnel",
    when: "Début cycle / toutes les 8–12 sem",
    phase: ["base"],
    avoid: "Fatigue, sans échauffement",
    durationMin: [45, 65],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Warm-up", text: "20' Z1→Z2 + 3 accélérations", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3' all-out + 15' Z1 récup + 12' all-out. Maximal.", zones: ["Z5"] },
      { part: "Cool-down", text: "15' Z1", zones: ["Z1"] }
    ],
    variants: { ironman: "Recommandé", half: "Recommandé", marathon: "—", semi: "—", "10k": "—" }
  },
  {
    id: "B_RUN_PACING_PRACTICE",
    cat: "B",
    sport: "course",
    objectif: "Entraînement pacing (discipline allure cible, negative split)",
    necessite: "Recommandé",
    when: "Peak (J-14 à J-7)",
    phase: ["peak"],
    avoid: "—",
    durationMin: [45, 65],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Warm-up", text: "15' Z1–Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "4x2km : 1km allure cible -3s/km + 1km allure cible exacte. r=2' trot. Focus montre/sensation.", zones: ["Z3", "Z4a"] },
      { part: "Cool-down", text: "10' Z1", zones: ["Z1"] }
    ],
    variants: { marathon: "Essentiel", semi: "Essentiel", "10k": "Très utile", ironman: "utile", half: "utile" }
  },
  {
    id: "A_RUN_DURABILITY_LONG",
    cat: "A",
    sport: "course",
    objectif: "Durabilité aérobie (long run avec monitoring drift HR/puissance)",
    necessite: "Recommandé",
    when: "Build IM / Marathon",
    phase: ["build"],
    avoid: "Fatigue chronique",
    durationMin: [100, 150],
    metricKey: "allure",
    sportKey: "course",
    structure: [
      { part: "Main", text: "100–150' Z2 strict. Monitorer drift FC (objectif <5% sur dernière heure). Si drift >8%, réduire allure.", zones: ["Z2"] }
    ],
    variants: { ironman: "Fondamental", marathon: "Fondamental", half: "utile", semi: "—", "10k": "—" }
  },
  {
    id: "B_BIKE_DURABILITY_TEST",
    cat: "B",
    sport: "cyclisme",
    objectif: "Test durabilité (Z2 long + check décalage puissance/FC)",
    necessite: "Recommandé",
    when: "Fin de Build / Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue",
    durationMin: [120, 180],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Main", text: "2–3h Z2 stable. Comparer ratio puissance/FC 1ère vs 2ème moitié. Objectif drift <5%.", zones: ["Z2"] }
    ],
    variants: { ironman: "Test clé", half: "Très utile", marathon: "—", semi: "—", "10k": "—" }
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
    case "5K":
    case "10K": return "10k";
    case "Trail":
    case "TrailMountain": return "trail_mountain";
    case "TrailShort": return "trail_short";
    case "TrailUltra": return "trail_ultra";
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

// =============================================
// PRO PACK – ~160 SÉANCES ADDITIONNELLES
// =============================================

const GOALS_ALL: ("ironman" | "half" | "marathon" | "semi" | "trail_short" | "trail_long")[] = 
  ["ironman", "half", "marathon", "semi", "trail_short", "trail_long"];

function mkStructure(parts: [string, string, string[]][]): { part: string; text: string; zones: string[] }[] {
  return parts.map(p => ({ part: p[0], text: p[1], zones: p[2] || [] }));
}

// COURSE – A (Endurance)
const RUN_A_PRO: LibraryWorkout[] = [
  {
    id: "A_RUN_EASY_45_PRO",
    cat: "A",
    sport: "course",
    objectif: "Endurance facile",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [40, 55],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([["Main", "45–55' Z1–Z2, relâché, respiration facile", ["Z1", "Z2"]]]),
    variants: { marathon: "ok", semi: "ok", ironman: "ok", half: "ok" },
    goals: ["marathon", "semi", "ironman", "half"],
    tags: ["easy", "aerobic"]
  },
  {
    id: "A_RUN_LONG_PROG_PRO",
    cat: "A",
    sport: "course",
    objectif: "Sortie longue progressive",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue accumulée",
    durationMin: [90, 150],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([["Main", "Z2 majoritaire, finir 20–30' Z3 si frais", ["Z2", "Z3"]]]),
    variants: { marathon: "fondamental", semi: "excellent" },
    goals: ["marathon", "semi"],
    tags: ["longrun", "progressive"]
  },
  {
    id: "A_RUN_EASY_STRIDES_PRO",
    cat: "A",
    sport: "course",
    objectif: "Endurance + lignes droites",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [45, 75],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([["Main", "Z1–Z2 + 6–10x12–15s accélérations r=60–75s", ["Z1", "Z2", "Z3"]]]),
    variants: { marathon: "excellent", semi: "excellent", half: "ok", ironman: "ok", trail_short: "ok", trail_long: "ok" },
    goals: ["marathon", "semi", "half", "ironman", "trail_short", "trail_long"],
    tags: ["economy", "strides"]
  }
];

// COURSE – B (Intensité)
const RUN_B_PRO: LibraryWorkout[] = [
  {
    id: "B_RUN_TEMPO_CRUISE_PRO",
    cat: "B",
    sport: "course",
    objectif: "Tempo / seuil contrôlé",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue importante",
    durationMin: [55, 90],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "15' Z1–Z2", ["Z1", "Z2"]],
      ["Main", "3x10' Z3–Z4a r=3–4' Z1", ["Z3", "Z4a", "Z1"]],
      ["Cool-down", "10' easy", ["Z1"]]
    ]),
    variants: { marathon: "excellent", semi: "excellent", half: "ok", ironman: "ok" },
    goals: ["marathon", "semi", "half", "ironman"],
    tags: ["threshold", "tempo"]
  },
  {
    id: "B_RUN_TEMPO_2x20_PRO",
    cat: "B",
    sport: "course",
    objectif: "Tempo 2x20'",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue importante",
    durationMin: [65, 95],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([["Main", "2x20' Z3–Z4a r=5' Z1", ["Z3", "Z4a", "Z1"]]]),
    variants: { marathon: "spécifique", semi: "spécifique" },
    goals: ["marathon", "semi", "half", "ironman"],
    tags: ["threshold", "tempo"]
  },
  {
    id: "B_RUN_TEMPO_HILLS_PRO",
    cat: "B",
    sport: "course",
    objectif: "Tempo vallonné",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue importante",
    durationMin: [55, 90],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([["Main", "Tempo Z3 sur terrain vallonné (montées régulières)", ["Z3"]]]),
    variants: { marathon: "excellent", semi: "excellent", trail_short: "parfait", trail_long: "parfait" },
    goals: ["marathon", "semi", "trail_short", "trail_long"],
    tags: ["threshold", "hills"]
  },
  {
    id: "B_RUN_VO2_5x3_PRO",
    cat: "B",
    sport: "course",
    objectif: "VO₂max (intervalles)",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue nerveuse",
    durationMin: [50, 80],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([["Main", "5–7x3' Z4b–Z5 r=2' easy", ["Z4b", "Z5", "Z1", "Z2"]]]),
    variants: { semi: "excellent", marathon: "ok", trail_short: "ok" },
    goals: ["semi", "marathon", "trail_short"],
    tags: ["vo2", "intervals"]
  },
  {
    id: "B_RUN_FARTLEK_60_PRO",
    cat: "B",
    sport: "course",
    objectif: "Fartlek (variations)",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["build", "peak"],
    avoid: "—",
    durationMin: [50, 75],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([["Main", "10x(1' Z4a / 2' Z2) sur terrain adapté", ["Z4a", "Z2"]]]),
    variants: { semi: "excellent", half: "ok", ironman: "ok", trail_short: "parfait", trail_long: "parfait" },
    goals: ["semi", "trail_short", "trail_long", "half", "ironman"],
    tags: ["fartlek", "variety"]
  }
];

// COURSE – C (Technique/Force)
const RUN_C_PRO: LibraryWorkout[] = [
  {
    id: "C_RUN_HILL_TECH_PRO",
    cat: "C",
    sport: "course",
    objectif: "Technique côte + coordination",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "Douleur tendon",
    durationMin: [35, 55],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([["Main", "10x1' côte technique Z2–Z3 r=descente easy + éducatifs", ["Z2", "Z3", "Z1"]]]),
    variants: { trail_short: "parfait", trail_long: "parfait", semi: "excellent", marathon: "excellent" },
    goals: ["trail_short", "trail_long", "semi", "marathon"],
    tags: ["skills", "hills"]
  },
  {
    id: "C_RUN_STRENGTH_30_PRO",
    cat: "C",
    sport: "strength",
    objectif: "Force coureur (bas du corps) 30–45'",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [30, 45],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([["Main", "Split squat/step-up/hip hinge/mollets/gainage RPE 6–7", ["Z1"]]]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "gym"]
  }
];

// COURSE – D (Récup)
const RUN_D_PRO: LibraryWorkout[] = [
  {
    id: "D_RUN_RECOVERY_30_PRO",
    cat: "D",
    sport: "course",
    objectif: "Footing récupération",
    necessite: "Recommandé",
    when: "Lendemain charge",
    phase: ["base", "build", "peak", "taper"],
    avoid: "—",
    durationMin: [25, 40],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([["Main", "Z1 très facile + mobilité 10'", ["Z1"]]]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["recovery", "easy"]
  }
];

// VÉLO – A
const BIKE_A_PRO: LibraryWorkout[] = [
  {
    id: "A_BIKE_END_90_PRO",
    cat: "A",
    sport: "cyclisme",
    objectif: "Endurance vélo",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [75, 105],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([["Main", "Z1–Z2 stable, cadence fluide", ["Z1", "Z2"]]]),
    variants: { ironman: "fondamental", half: "fondamental" },
    goals: ["ironman", "half", "trail_short", "trail_long", "marathon", "semi"],
    tags: ["aerobic", "endurance"]
  },
  {
    id: "A_BIKE_LONG_IM_PRO",
    cat: "A",
    sport: "cyclisme",
    objectif: "Long ride IM (spécifique)",
    necessite: "Recommandé",
    when: "Build/Peak IM",
    phase: ["build", "peak"],
    avoid: "Fatigue chronique",
    durationMin: [150, 240],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([["Main", "Z2 majoritaire + 3–5x10' Z3 (si frais)", ["Z2", "Z3"]]]),
    variants: { ironman: "séance clé" },
    goals: ["ironman"],
    tags: ["longride", "im"]
  }
];

// VÉLO – B
const BIKE_B_PRO: LibraryWorkout[] = [
  {
    id: "B_BIKE_SST_3x12_PRO",
    cat: "B",
    sport: "cyclisme",
    objectif: "Sweet spot / tempo",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue accumulée",
    durationMin: [60, 90],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([["Main", "3x12' Z3–Z4a r=5' Z2", ["Z3", "Z4a", "Z2"]]]),
    variants: { ironman: "excellent", half: "excellent" },
    goals: ["ironman", "half"],
    tags: ["sst", "tempo"]
  },
  {
    id: "B_BIKE_SST_2x20_PRO",
    cat: "B",
    sport: "cyclisme",
    objectif: "Sweet spot 2x20'",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue accumulée",
    durationMin: [70, 100],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([["Main", "2x20' Z3–Z4a r=7' Z2", ["Z3", "Z4a", "Z2"]]]),
    variants: { ironman: "spécifique", half: "spécifique" },
    goals: ["ironman", "half"],
    tags: ["sst", "tempo"]
  },
  {
    id: "B_BIKE_SST_OVERUNDER_PRO",
    cat: "B",
    sport: "cyclisme",
    objectif: "Over-Under light",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "VLamax élevée",
    durationMin: [65, 95],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([["Main", "3x12' : 2' Z3 / 1' Z4a (répéter) r=6'", ["Z3", "Z4a"]]]),
    variants: { ironman: "excellent", half: "excellent" },
    goals: ["ironman", "half"],
    tags: ["sst", "overunder"]
  },
  {
    id: "B_BIKE_SST_HILLS_PRO",
    cat: "B",
    sport: "cyclisme",
    objectif: "SST en montée",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Douleur genoux",
    durationMin: [70, 105],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([["Main", "Blocs SST sur montée régulière, cadence contrôlée", ["Z3", "Z4a"]]]),
    variants: { ironman: "excellent", half: "excellent" },
    goals: ["ironman", "half"],
    tags: ["sst", "hills"]
  },
  {
    id: "B_BIKE_VO2_6x3_PRO",
    cat: "B",
    sport: "cyclisme",
    objectif: "VO₂ vélo",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "VLamax trop haute",
    durationMin: [50, 75],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([["Main", "6x3' Z5 r=3' Z1–Z2", ["Z5", "Z1", "Z2"]]]),
    variants: { half: "1x/7j", trail_short: "ok" },
    goals: ["half", "trail_short"],
    tags: ["vo2", "intervals"]
  }
];

// VÉLO – C
const BIKE_C_PRO: LibraryWorkout[] = [
  {
    id: "C_BIKE_CADENCE_SKILLS_PRO",
    cat: "C",
    sport: "cyclisme",
    objectif: "Technique pédalage / cadence",
    necessite: "Optionnel",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "Fatigue lombaire",
    durationMin: [45, 70],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([["Main", "Z2 + 6x3' cadence 100–110 rpm (sans surpuissance)", ["Z2"]]]),
    variants: { ironman: "super utile", half: "utile" },
    goals: ["ironman", "half"],
    tags: ["skills", "cadence"]
  }
];

// VÉLO – D
const BIKE_D_PRO: LibraryWorkout[] = [
  {
    id: "D_BIKE_REGEN_60_PRO",
    cat: "D",
    sport: "cyclisme",
    objectif: "Récup vélo sans impact",
    necessite: "Recommandé",
    when: "Lendemain charge",
    phase: ["base", "build", "peak", "taper"],
    avoid: "—",
    durationMin: [45, 75],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: mkStructure([["Main", "Z1–Z2 très facile, 90–95rpm", ["Z1", "Z2"]]]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["recovery", "easy"]
  }
];

// NATATION – A
const SWIM_A_PRO: LibraryWorkout[] = [
  {
    id: "A_SWIM_END_CSS_PRO",
    cat: "A",
    sport: "natation",
    objectif: "Endurance technique (CSS-)",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "Épaules douloureuses",
    durationMin: [45, 70],
    metricKey: "allure",
    sportKey: "natation",
    structure: mkStructure([["Main", "Éducatifs + 3x400m (CSS+5 à +10s/100) r=45–60s", []]]),
    variants: { ironman: "fondamental", half: "fondamental" },
    goals: ["ironman", "half"],
    tags: ["technique", "endurance"]
  }
];

// NATATION – B
const SWIM_B_PRO: LibraryWorkout[] = [
  {
    id: "B_SWIM_CSS_12x100_PRO",
    cat: "B",
    sport: "natation",
    objectif: "Travail CSS",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Épaules douloureuses",
    durationMin: [50, 75],
    metricKey: "allure",
    sportKey: "natation",
    structure: mkStructure([["Main", "12–20x100m à CSS r=15–20s (qualité)", []]]),
    variants: { ironman: "excellent", half: "excellent" },
    goals: ["ironman", "half"],
    tags: ["css", "threshold"]
  },
  {
    id: "B_SWIM_CSS_8x200_PRO",
    cat: "B",
    sport: "natation",
    objectif: "CSS 8x200m",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Épaules douloureuses",
    durationMin: [55, 80],
    metricKey: "allure",
    sportKey: "natation",
    structure: mkStructure([["Main", "8x200m à CSS r=20–30s", []]]),
    variants: { ironman: "excellent", half: "excellent" },
    goals: ["ironman", "half"],
    tags: ["css", "threshold"]
  },
  {
    id: "B_SWIM_CSS_LADDER_PRO",
    cat: "B",
    sport: "natation",
    objectif: "CSS Ladder",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Épaules douloureuses",
    durationMin: [50, 75],
    metricKey: "allure",
    sportKey: "natation",
    structure: mkStructure([["Main", "100-200-300-400-300-200-100 à CSS (r=20–40s)", []]]),
    variants: { ironman: "excellent", half: "excellent" },
    goals: ["ironman", "half"],
    tags: ["css", "ladder"]
  },
  {
    id: "B_SWIM_SPEED_25S_PRO",
    cat: "B",
    sport: "natation",
    objectif: "Vitesse/puissance (court)",
    necessite: "Optionnel",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Technique dégradée",
    durationMin: [35, 55],
    metricKey: "allure",
    sportKey: "natation",
    structure: mkStructure([["Main", "2 blocs : 12x25m vite r=20–30s, récup longue entre blocs", []]]),
    variants: { half: "ok", ironman: "légère" },
    goals: ["half", "ironman"],
    tags: ["speed", "power"]
  }
];

// NATATION – C
const SWIM_C_PRO: LibraryWorkout[] = [
  {
    id: "C_SWIM_TECH_DRILLS_PRO",
    cat: "C",
    sport: "natation",
    objectif: "Technique pure (drills)",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [30, 50],
    metricKey: "allure",
    sportKey: "natation",
    structure: mkStructure([["Main", "Drills 20–30' + 8x50m propre (RPE 6)", []]]),
    variants: { ironman: "prioritaire", half: "prioritaire" },
    goals: ["ironman", "half"],
    tags: ["skills", "technique"]
  }
];

// NATATION – D
const SWIM_D_PRO: LibraryWorkout[] = [
  {
    id: "D_SWIM_EASY_PRO",
    cat: "D",
    sport: "natation",
    objectif: "Récup eau (souple)",
    necessite: "Optionnel",
    when: "Lendemain charge",
    phase: ["base", "build", "peak", "taper"],
    avoid: "—",
    durationMin: [25, 45],
    metricKey: "allure",
    sportKey: "natation",
    structure: mkStructure([["Main", "Nage facile + mobilité épaules", []]]),
    variants: { ironman: "excellent", half: "excellent" },
    goals: ["ironman", "half"],
    tags: ["recovery", "easy"]
  }
];

// TRAIL – Core
const TRAIL_CORE_PRO: LibraryWorkout[] = [
  {
    id: "A_TR_LONG_DPLUS_PRO",
    cat: "A",
    sport: "course",
    objectif: "Sortie longue trail D+ modéré",
    necessite: "Obligatoire",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue chronique",
    durationMin: [120, 210],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([["Main", "Z1–Z2 majoritaire. Marcher en forte pente. Nutrition.", ["Z1", "Z2"]]]),
    variants: { trail_short: "fondamental", trail_long: "fondamental" },
    goals: ["trail_short", "trail_long"],
    dPlusTargetM: { min: 700, max: 1800 },
    tags: ["trail", "longrun"]
  },
  {
    id: "B_TR_UPHILL_TEMPO_PRO",
    cat: "B",
    sport: "course",
    objectif: "Tempo en montée (seuil aérobie)",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue importante",
    durationMin: [60, 95],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([["Main", "3x10–15' montée Z3–Z4a r=descente Z1", ["Z3", "Z4a", "Z1"]]]),
    variants: { trail_short: "excellent", trail_long: "excellent" },
    goals: ["trail_short", "trail_long"],
    dPlusTargetM: { min: 500, max: 1100 },
    tags: ["trail", "hills", "threshold"]
  },
  {
    id: "B_TR_HILLREPS_PRO",
    cat: "B",
    sport: "course",
    objectif: "Côtes courtes (relances)",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue musculaire",
    durationMin: [45, 75],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([["Main", "12–18x45s Z5 r=descente complète", ["Z5", "Z1"]]]),
    variants: { trail_short: "excellent", trail_long: "excellent" },
    goals: ["trail_short", "trail_long"],
    dPlusTargetM: { min: 250, max: 650 },
    tags: ["trail", "hills", "vo2"]
  },
  {
    id: "B_TR_HILLREPS_8x2_PRO",
    cat: "B",
    sport: "course",
    objectif: "Côtes 8x2'",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue musculaire",
    durationMin: [50, 75],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([["Main", "8x2' Z4b r=descente", ["Z4b", "Z5", "Z1", "Z2"]]]),
    variants: { trail_short: "excellent", trail_long: "excellent" },
    goals: ["trail_short", "trail_long"],
    dPlusTargetM: { min: 300, max: 700 },
    tags: ["trail", "hills"]
  },
  {
    id: "B_TR_HILLREPS_6x3_PRO",
    cat: "B",
    sport: "course",
    objectif: "Côtes 6x3'",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue musculaire",
    durationMin: [50, 80],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([["Main", "6x3' Z4b–Z5 r=3'", ["Z4b", "Z5"]]]),
    variants: { trail_short: "excellent", trail_long: "excellent" },
    goals: ["trail_short", "trail_long"],
    dPlusTargetM: { min: 300, max: 750 },
    tags: ["trail", "hills"]
  },
  {
    id: "C_TR_DESC_TECH_PRO",
    cat: "C",
    sport: "course",
    objectif: "Technique descente (tolérance excentrique)",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "Douleur musculaire",
    durationMin: [40, 60],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([["Main", "8–12 descentes 45–60s 'propre' r=remontée easy", ["Z1", "Z2"]]]),
    variants: { trail_short: "parfait", trail_long: "parfait" },
    goals: ["trail_short", "trail_long"],
    dPlusTargetM: { min: 200, max: 500 },
    tags: ["trail", "skills", "eccentric"]
  },
  {
    id: "C_TR_STRENGTH_PRO",
    cat: "C",
    sport: "strength",
    objectif: "Force trail (quadris/mollets/fessiers + gainage)",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [35, 55],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([["Main", "Step-up, split squat, mollets, isos, gainage (RPE 6–7)", ["Z1"]]]),
    variants: { trail_short: "excellent", trail_long: "excellent" },
    goals: ["trail_short", "trail_long"],
    tags: ["trail", "strength"]
  }
];

// Trail Long runs variants (10)
const TRAIL_LONG_VARIANTS: LibraryWorkout[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `A_TR_LONG_V${i + 1}_PRO`,
  cat: "A" as const,
  sport: "course" as const,
  objectif: `Long D+ ${i < 5 ? "technique" : "progressif"} #${i + 1}`,
  necessite: "Recommandé" as const,
  when: "Build/Peak",
  phase: ["build", "peak"],
  avoid: "Fatigue chronique",
  durationMin: i < 5 ? [120 + 10 * i, 150 + 10 * i] as [number, number] : [150 + 10 * (i - 5), 190 + 10 * (i - 5)] as [number, number],
  metricKey: "cardiaque" as const,
  sportKey: "tout sport",
  structure: mkStructure([["Main", i < 5
    ? "Z1–Z2 + blocs technique descente (régularité, appuis)"
    : "Z2 majoritaire, finir 15–25' Z3 si frais (terrain stable)", ["Z1", "Z2", "Z3"]]]),
  variants: { trail_short: "ok", trail_long: "fondamental" },
  goals: ["trail_short", "trail_long"] as ("trail_short" | "trail_long")[],
  dPlusTargetM: i < 5 ? { min: 700 + 100 * i, max: 1100 + 120 * i } : { min: 900 + 120 * (i - 5), max: 1600 + 150 * (i - 5) },
  tags: ["trail", "longrun"]
}));

// BRICK – Core
const BRICK_CORE_PRO: LibraryWorkout[] = [
  {
    id: "BR_HALF_RACEPACE_PRO",
    cat: "B",
    sport: "brick",
    objectif: "Brick 70.3 spécifique (bike tempo + run tempo)",
    necessite: "Recommandé",
    when: "Build/Peak",
    phase: ["build", "peak"],
    avoid: "Fatigue accumulée",
    durationMin: [85, 135],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([
      ["Bike", "60–90' Z3–Z4a (SST) stable", ["Z3", "Z4a"]],
      ["Run", "20–30' Z2→Z3 (dernières 10' Z3)", ["Z2", "Z3"]]
    ]),
    variants: { half: "séance clé" },
    goals: ["half"],
    tags: ["brick", "race"]
  },
  {
    id: "BR_IM_STEADY_PRO",
    cat: "A",
    sport: "brick",
    objectif: "Brick IM (bike Z2 + run easy)",
    necessite: "Recommandé",
    when: "Build/Peak IM",
    phase: ["build", "peak"],
    avoid: "Fatigue chronique",
    durationMin: [110, 210],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([
      ["Bike", "2h–3h Z2, nutrition", ["Z2"]],
      ["Run", "20–40' Z1–Z2 (souple)", ["Z1", "Z2"]]
    ]),
    variants: { ironman: "fondamental" },
    goals: ["ironman"],
    tags: ["brick", "im"]
  }
];

// Brick variants (20)
const BRICK_HALF_VARIANTS: LibraryWorkout[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `BR_HALF_V${i + 1}_PRO`,
  cat: "B" as const,
  sport: "brick" as const,
  objectif: `Brick 70.3 variante #${i + 1}`,
  necessite: "Recommandé" as const,
  when: "Build/Peak",
  phase: ["build", "peak"],
  avoid: "Fatigue accumulée",
  durationMin: [85 + 5 * i, 135 + 5 * i] as [number, number],
  metricKey: "cardiaque" as const,
  sportKey: "tout sport",
  structure: mkStructure([
    ["Bike", `${60 + 3 * i}–${80 + 3 * i}' Z3–Z4a (contrôlé)`, ["Z3", "Z4a"]],
    ["Run", `${18 + 2 * i}–${25 + 2 * i}' Z2→Z3`, ["Z2", "Z3"]]
  ]),
  variants: { half: "ok" },
  goals: ["half"] as ("half")[],
  tags: ["brick", "race"]
}));

const BRICK_IM_VARIANTS: LibraryWorkout[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `BR_IM_V${i + 1}_PRO`,
  cat: "A" as const,
  sport: "brick" as const,
  objectif: `Brick IM variante #${i + 1}`,
  necessite: "Recommandé" as const,
  when: "Build/Peak IM",
  phase: ["build", "peak"],
  avoid: "Fatigue chronique",
  durationMin: [120 + 10 * i, 210] as [number, number],
  metricKey: "cardiaque" as const,
  sportKey: "tout sport",
  structure: mkStructure([
    ["Bike", `${120 + 10 * i}' Z2 + 3x10' Z3 (si frais)`, ["Z2", "Z3"]],
    ["Run", `${15 + 3 * i}–${30 + 3 * i}' Z1–Z2`, ["Z1", "Z2"]]
  ]),
  variants: { ironman: "ok" },
  goals: ["ironman"] as ("ironman")[],
  tags: ["brick", "im"]
}));

// MUSCU / PREHAB (20)
// ====================================================================
// STRENGTH_PRO — Bibliothèque renforcement musculaire détaillée
// 4 familles : (1) Force générale, (2) Trail-spécifique, (3) Route/CAP-spécifique, (4) Préhab/mobilité
// Format Pro complet : Warm-up structuré + Main détaillé (séries×reps, tempo, charge %RM ou RPE, repos)
//                      + Cool-down + Progression hebdomadaire indicative
// Réfs : Rønnestad & Mujika (2014), Blagrove et al. (2018), Beattie et al. (2017),
//        Vikmoen et al. (2016), Berryman et al. (2018) — Concurrent training endurance.
// ====================================================================
const STRENGTH_PRO: LibraryWorkout[] = [
  // ───────────── FAMILLE 1 — FORCE GÉNÉRALE ─────────────
  {
    id: "C_STR_LOWER_PRO",
    cat: "C",
    sport: "strength",
    objectif: "Force max bas du corps (squat/hip hinge)",
    necessite: "Recommandé",
    when: "Base & début Build (≥6 sem avant course A)",
    phase: ["base", "build"],
    avoid: "Semaine de course A · Fatigue >7/10",
    durationMin: [45, 60],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "8' : 5' vélo Z1 + activation (glute bridge 2×10, bird-dog 2×8/côté, squat PdC 2×10, mobilité cheville 1'/côté)", ["Z1"]],
      ["Main", "A) Back squat ou Goblet squat : 4×5 @ 80-85% 1RM (ou RPE 8) · tempo 3-1-1-0 · repos 2'30-3' entre séries.\nB) Romanian deadlift : 3×6 @ RPE 7-8 · tempo 3-0-1-0 · repos 2'.\nC) Bulgarian split squat : 3×6/jambe @ haltères modérés (RPE 7) · repos 90s.\nD) Mollets debout (calf raise lourd) : 3×8 tempo 2-2-1-0 · repos 60s.", []],
      ["Cool-down", "8' : mobilité hanches (pigeon 1'/côté), psoas stretch (1'/côté), respiration nasale 3'", []],
      ["Progression", "Sem 1-2 : ancrer technique (RPE 7). Sem 3-4 : monter à RPE 8-8.5. Sem 5 : décharge -30% volume. Cycle 4+1.", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "lower", "max-force"]
  },
  {
    id: "C_STR_UPPER_PRO",
    cat: "C",
    sport: "strength",
    objectif: "Force haut du corps (poussée/tirage) — posture & natation",
    necessite: "Recommandé",
    when: "Toute l'année (1× / 10j minimum)",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [35, 50],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "6' : rotations épaules (band pull-apart 2×15), cat-cow 1', scapular push-up 2×10", []],
      ["Main", "A) Pull-up assisté ou Lat pulldown : 4×6-8 @ RPE 7-8 · repos 2'.\nB) DB bench press ou pompes lestées : 4×6-8 @ RPE 7 · tempo 2-1-1-0 · repos 2'.\nC) Row haltère un bras : 3×8/côté @ RPE 7-8 · repos 90s.\nD) Face pull (élastique ou poulie) : 3×15 lent · repos 60s — coiffe des rotateurs.", []],
      ["Cool-down", "6' : étirements pec doorway 30s/côté, lat stretch 30s/côté, doorway shoulder rotation 1'", []],
      ["Progression", "Volume stable, augmenter charge +2.5% quand 4×8 tenu à RPE 7. Décharge sem 5.", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "upper", "posture"]
  },
  {
    id: "C_STR_CORE_PRO",
    cat: "C",
    sport: "strength",
    objectif: "Gainage anti-rotation & transfert force",
    necessite: "Recommandé",
    when: "Toute l'année (2-3×/sem possible)",
    phase: ["base", "build", "peak"],
    avoid: "—",
    durationMin: [25, 40],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "5' : dead bug lent 2×8/côté, cat-cow 1', glute bridge 2×10", []],
      ["Main", "Circuit 3-4 tours (repos 60s entre tours) :\n• Pallof press (élastique/poulie) : 12/côté lent — anti-rotation.\n• Side plank avec leg-lift : 30s/côté.\n• Bird-dog tempo 2-2-2 : 10/côté.\n• Farmer's carry lourd : 30m (charge = 50% poids corps total).\n• Hollow hold : 30-45s.", []],
      ["Cool-down", "5' : child pose 1', respiration diaphragmatique 3' (4-6s in / 6-8s out)", []],
      ["Progression", "Sem 1-2 : 3 tours · Sem 3-4 : 4 tours + charge farmer +5kg. Pas de décharge nécessaire (faible charge SNC).", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "core", "anti-rotation"]
  },
  {
    id: "C_STR_FULL_BODY_PRO",
    cat: "C",
    sport: "strength",
    objectif: "Full body intégré (compromis temps/efficacité)",
    necessite: "Recommandé",
    when: "Coachés à volume limité (1 séance/sem possible)",
    phase: ["base", "build"],
    avoid: "—",
    durationMin: [40, 55],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "8' : vélo/erg Z1 5' + activation full body (squat PdC 10, push-up 8, glute bridge 10, scap pull 10)", ["Z1"]],
      ["Main", "Superset A (3 tours, repos 2'30 entre tours) :\n• Trap-bar deadlift ou hip hinge : 5 reps @ RPE 8.\n• DB bench ou pompes lestées : 6-8 reps @ RPE 7.\nSuperset B (3 tours, repos 90s) :\n• Bulgarian split squat : 6/jambe.\n• Row haltère : 8/côté.\nFinisher (2 tours, repos 45s) :\n• Pallof press 12/côté + Calf raise 12 + Dead bug 8/côté.", []],
      ["Cool-down", "7' : mobilité hanches/épaules + respiration nasale 3'", []],
      ["Progression", "Charge +2.5% Sem 2-3 sur lifts principaux. Décharge sem 4.", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "full-body", "time-efficient"]
  },

  // ───────────── FAMILLE 2 — TRAIL-SPÉCIFIQUE ─────────────
  {
    id: "C_STR_ECC_QUAD_PRO",
    cat: "C",
    sport: "strength",
    objectif: "Excentriques quadris — résistance descente (trail)",
    necessite: "Recommandé",
    when: "Base & début Build (≥4 sem avant trail long)",
    phase: ["base", "build"],
    avoid: "Tapering · Courbatures résiduelles · 48h avant longue descente",
    durationMin: [35, 50],
    metricKey: "cardiaque",
    sportKey: "trail",
    structure: mkStructure([
      ["Warm-up", "10' : vélo Z1 5' + activation (squat PdC 2×10, fentes alternées 2×8/côté, mobilité cheville 1'/côté)", ["Z1"]],
      ["Main", "A) Step-down excentrique (banc 30-40cm) : 4×6/jambe — descente 4-5s contrôlée, remontée aide bras · repos 90s.\nB) Squat excentrique (back ou goblet) : 4×5 @ RPE 7-8 — descente 5s, remontée 1s · repos 2'30.\nC) Reverse Nordic curl (quadris) : 3×6-8 — descente lente jusqu'à amplitude tolérée · repos 90s.\nD) Isos wall sit avec rebond léger : 3×30s · repos 60s.", []],
      ["Cool-down", "8' : foam rolling quadris 3', stretch quad debout 30s/côté ×2, marche 3'", []],
      ["Progression", "Sem 1 : volume 60% (test toleration courbatures J+2-J+3). Sem 2-4 : volume plein. Sem 5 décharge. STOP 10j avant course A.", []]
    ]),
    variants: {},
    goals: ["trail_short", "trail_long", "ironman", "half"],
    tags: ["strength", "trail", "eccentric", "downhill"]
  },
  {
    id: "C_STR_CALF_HEAVY_PRO",
    cat: "C",
    sport: "strength",
    objectif: "Mollets lourds — raideur tendon Achille (trail/CAP)",
    necessite: "Recommandé",
    when: "Base & Build",
    phase: ["base", "build"],
    avoid: "Tendinopathie Achille phase aiguë",
    durationMin: [25, 35],
    metricKey: "cardiaque",
    sportKey: "trail",
    structure: mkStructure([
      ["Warm-up", "5' : marche dynamique + mobilité cheville (squat profond tenu 30s ×2, dorsiflexion contre mur 10/côté)", []],
      ["Main", "A) Calf raise debout (chargé barre ou Smith) : 4×6 @ RPE 8 — tempo 2-2-1-1 (excentrique 2s, iso bas 1s) · repos 2'.\nB) Calf raise assis (soléaire) : 3×10 @ charge lourde · tempo 2-1-2-0 · repos 90s.\nC) Single-leg calf raise marche d'escalier amplitude max : 3×12/jambe · repos 60s.\nD) Heel drop excentrique (escalier, descente lente 4s) : 2×15/jambe — préhab tendon.", []],
      ["Cool-down", "5' : stretch mollets (gastro & soléaire) 30s/côté ×2, mobilité cheville 2'", []],
      ["Progression", "Charge +2.5kg/sem si tempo respecté. Décharge sem 5.", []]
    ]),
    variants: {},
    goals: ["trail_short", "trail_long", "marathon", "semi"],
    tags: ["strength", "calf", "achilles", "trail"]
  },
  {
    id: "C_STR_DOWNHILL_PLYO_PRO",
    cat: "C",
    sport: "strength",
    objectif: "Plyo descente — amortissement & rigidité réactive",
    necessite: "Recommandé",
    when: "Build & Peak (≥3 sem avant course A)",
    phase: ["build", "peak"],
    avoid: "Débutant · Tendinopathie · Surcharge récente",
    durationMin: [30, 40],
    metricKey: "cardiaque",
    sportKey: "trail",
    structure: mkStructure([
      ["Warm-up", "12' : 5' jog Z1 + 3' éducatifs (talons-fesses, montées genoux) + activation plyo basse (pogo jumps 2×15)", ["Z1"]],
      ["Main", "A) Drop jumps (boîte 30cm → sol → saut max) : 4×5 — contact sol <250ms · repos 2' (qualité avant volume).\nB) Box step-down avec rebond contrôlé : 3×6/jambe — absorber puis renvoyer · repos 90s.\nC) Lateral bounds : 3×8/côté · repos 90s — stabilité frontale.\nD) Pogo jumps (rigidité Achille) : 3×20s · repos 60s.", []],
      ["Cool-down", "8' : marche 3' + foam rolling mollets/quadris 5'", []],
      ["Progression", "Sem 1 : hauteur boîte 20cm. Sem 2-3 : 30cm. STOP J-10 course A. Volume total contacts <80/séance.", []]
    ]),
    variants: {},
    goals: ["trail_short", "trail_long"],
    tags: ["strength", "plyo", "trail", "downhill", "reactive"]
  },
  {
    id: "C_STR_TRAIL_CORE_PRO",
    cat: "C",
    sport: "strength",
    objectif: "Core montagne — stabilité tronc terrain instable",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build", "peak"],
    avoid: "—",
    durationMin: [25, 35],
    metricKey: "cardiaque",
    sportKey: "trail",
    structure: mkStructure([
      ["Warm-up", "5' : mobilité hanches/colonne (cat-cow, hip CARs 5/côté)", []],
      ["Main", "Circuit 4 tours (repos 45s entre tours) :\n• Single-leg deadlift haltère (équilibre) : 8/jambe.\n• Side plank avec rotation hanche : 8/côté.\n• Suitcase carry asymétrique (charge 1 main) : 30m/côté.\n• Plank avec touche épaule alternée : 12 (anti-rotation).\n• Step-up avec genou haut tenu 2s : 8/jambe.", []],
      ["Cool-down", "5' : child pose + respiration 3'", []],
      ["Progression", "Tours 3→5 sur 4 sem. Charge carry +5kg sem 3.", []]
    ]),
    variants: {},
    goals: ["trail_short", "trail_long"],
    tags: ["strength", "core", "trail", "stability"]
  },

  // ───────────── FAMILLE 3 — ROUTE/CAP-SPÉCIFIQUE ─────────────
  {
    id: "C_STR_PLYO_BASIC_PRO",
    cat: "C",
    sport: "strength",
    objectif: "Pliométrie de base — économie de course (route)",
    necessite: "Recommandé",
    when: "Base & début Build",
    phase: ["base", "build"],
    avoid: "Débutant total · Blessure pied/cheville récente",
    durationMin: [25, 35],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "10' : 5' jog Z1 + éducatifs (skipping, talons-fesses, foulée bondissante légère 2×20m)", ["Z1"]],
      ["Main", "A) Pogo jumps (2 pieds) : 4×15 contacts — rigidité, contact <200ms · repos 75s.\nB) Saut sur banc bas (20-30cm) : 3×8 — atterrir doux, redescendre marche · repos 90s.\nC) Skip A & Skip B : 3×20m/exercice · repos 60s.\nD) Single-leg hops linéaires : 3×8/jambe · repos 60s.", []],
      ["Cool-down", "8' : jog easy 3' + stretch mollets/quadris 5'", []],
      ["Progression", "Sem 1 : 60% volume (apprentissage). Sem 2-4 : volume plein. Décharge sem 5. Contacts <120/séance.", []]
    ]),
    variants: {},
    goals: ["marathon", "semi", "ironman", "half"],
    tags: ["strength", "plyo", "running-economy", "cap"]
  },
  {
    id: "C_STR_PLYO_ADVANCED_PRO",
    cat: "C",
    sport: "strength",
    objectif: "Pliométrie avancée — puissance réactive sub-10s",
    necessite: "Recommandé",
    when: "Build & Peak",
    phase: ["build", "peak"],
    avoid: "Pré-compétition (J-7) · Fatigue >6/10",
    durationMin: [30, 40],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "12' : 5' jog Z1 + 4' éducatifs + 3' activation plyo basse (pogo 2×15, skip A 2×20m)", ["Z1"]],
      ["Main", "A) Depth jumps boîte 40cm (contact bref → saut max H) : 4×5 · repos 2'30 (qualité maximale).\nB) Bounds alternés (foulée bondissante) : 4×20m · repos 90s.\nC) Single-leg hops chargés (gilet 5-10% PdC) : 3×6/jambe · repos 90s.\nD) Hurdle hops 30cm : 3×6 · repos 90s.", []],
      ["Cool-down", "8' : jog 3' + foam rolling complet jambes 5'", []],
      ["Progression", "Sem 1 : volume 70%. Sem 2-3 : plein. Sem 4 décharge. STOP J-10 course A. Total contacts <80.", []]
    ]),
    variants: {},
    goals: ["marathon", "semi"],
    tags: ["strength", "plyo", "power", "advanced", "cap"]
  },
  {
    id: "C_STR_RUN_DRILLS_PRO",
    cat: "C",
    sport: "strength",
    objectif: "Éducatifs foulée — technique & économie",
    necessite: "Recommandé",
    when: "Toute l'année (1-2×/sem 15')",
    phase: ["base", "build", "peak"],
    avoid: "—",
    durationMin: [20, 30],
    metricKey: "cardiaque",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "5' jog Z1 + mobilité hanches dynamique", ["Z1"]],
      ["Main", "Sur 40m (repos = retour marche, 3-4 tours du circuit) :\n• Skipping A (genoux hauts, pose pied avant) : 40m.\n• Skipping B (extension hanche complète) : 40m.\n• Talons-fesses rapides : 40m.\n• Foulée bondissante longue : 40m.\n• Strides accélérés (80-90% allure max) : 4×60m repos 1' marche.", []],
      ["Cool-down", "5' jog Z1 + étirements ischios/quadris", ["Z1"]],
      ["Progression", "Stable. Ajouter 1 tour sem 3. À placer en pré-fractionné ou jour easy.", []]
    ]),
    variants: {},
    goals: ["marathon", "semi", "ironman", "half"],
    tags: ["strength", "drills", "technique", "cap"]
  },
  {
    id: "C_STR_HILL_SPRINTS_PRO",
    cat: "C",
    sport: "strength",
    objectif: "Sprints courts en côte — force-vitesse & VLamax CAP",
    necessite: "Recommandé",
    when: "Base & début Build",
    phase: ["base", "build"],
    avoid: "Pré-compétition · Sprint ban actif (voir Lorang)",
    durationMin: [30, 45],
    metricKey: "allure",
    sportKey: "course",
    structure: mkStructure([
      ["Warm-up", "15' : 10' jog Z1-Z2 + 4×strides 80m + mobilité hanches", ["Z1", "Z2"]],
      ["Main", "8-10 × sprint 8-12s en côte 6-10% pente · effort 95-100% · récupération descente marche 2-3' (complète).\nFocus : foulée puissante, bras dynamiques, départ debout (pas crouch).", []],
      ["Cool-down", "10' jog easy Z1 + mobilité", ["Z1"]],
      ["Progression", "Sem 1 : 6 reps. Sem 2-3 : 8-10 reps. Sem 4 décharge. À placer en début phase, pas dans 3 dernières sem avant course A.", []]
    ]),
    variants: {},
    goals: ["semi", "marathon"],
    tags: ["strength", "sprint", "hill", "vlamax", "cap"]
  },

  // ───────────── FAMILLE 4 — PRÉHAB & MOBILITÉ ─────────────
  {
    id: "C_STR_HIP_MOBILITY_PRO",
    cat: "C",
    sport: "strength",
    objectif: "Mobilité hanches + activation fessiers (préhab)",
    necessite: "Recommandé",
    when: "Toute l'année (2-3×/sem possible)",
    phase: ["base", "build", "peak", "taper"],
    avoid: "—",
    durationMin: [20, 30],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "3' : cat-cow + hip CARs lents 5/côté", []],
      ["Main", "A) Mobilité (1-2 tours) :\n• 90/90 hip switches : 8/côté.\n• Couch stretch (psoas) : 45s/côté.\n• Pigeon pose active : 45s/côté.\n• Squat profond tenu (Asian squat) : 60s.\nB) Activation fessiers (2 tours, repos 30s) :\n• Glute bridge mono-jambe : 12/côté.\n• Clamshell élastique : 15/côté.\n• Hip thrust haltère : 10 @ RPE 6.\n• Monster walks élastique : 10 pas × 4 directions.", []],
      ["Cool-down", "3' respiration diaphragmatique", []],
      ["Progression", "Volume stable. Idéal en récup ou pré-séance qualité. Pas de décharge nécessaire.", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "mobility", "hip", "prehab", "glute-activation"]
  },
  {
    id: "C_STR_ANKLE_PROPRIO_PRO",
    cat: "C",
    sport: "strength",
    objectif: "Cheville/pied — proprio & prévention entorse",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build", "peak", "taper"],
    avoid: "Entorse aiguë <3 sem",
    durationMin: [20, 30],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "3' : mobilité cheville (dorsiflexion contre mur 10/côté, cercles cheville)", []],
      ["Main", "A) Équilibre yeux ouverts/fermés mono-jambe : 30-45s × 2/côté (progression : surface molle).\nB) Calf raise mono-jambe excentrique escalier : 3×12/jambe (descente 3s).\nC) Sauts unipodaux contrôlés (avant/arrière/latéral) : 3×8/direction/jambe · repos 60s.\nD) Renfo tibial antérieur (toe raises chargés) : 3×15.\nE) Renfo péroniers (élastique éversion) : 3×15/côté.", []],
      ["Cool-down", "3' : mobilité cheville + auto-massage voûte plantaire (balle) 1'/côté", []],
      ["Progression", "Surface dure → molle (coussin proprio) sem 3. Yeux fermés sem 4.", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "ankle", "proprio", "prehab"]
  },
  {
    id: "C_STR_HAMSTRING_HEALTH_PRO",
    cat: "C",
    sport: "strength",
    objectif: "Ischio-jambiers — prévention lésions (Nordic & Romanian)",
    necessite: "Recommandé",
    when: "Toute l'année (1-2×/sem)",
    phase: ["base", "build", "peak"],
    avoid: "Lésion ischio <4 sem · Tapering course A (J-7)",
    durationMin: [25, 35],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "6' : glute bridge 2×10, leg swing avant/arrière 10/côté, hip CARs", []],
      ["Main", "A) Nordic curl excentrique (partenaire ou strap) : 3×5-6 — descente contrôlée 3-4s · repos 2'30 (référence Petersen 2011, -51% blessures).\nB) Romanian deadlift haltères : 3×8 @ RPE 7 · tempo 3-0-1-0 · repos 90s.\nC) Single-leg RDL : 3×8/jambe @ haltères modérés · repos 90s.\nD) Glute-ham raise machine ou banc : 2×8 (si dispo).", []],
      ["Cool-down", "6' : stretch ischios doux (foam roll 2', stretch debout 30s/côté ×2)", []],
      ["Progression", "Sem 1 : 2×5 Nordic (forte courbatures normales). Sem 2-4 : 3×6. Décharge sem 5. Cycle 4+1.", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "hamstring", "prehab", "nordic", "injury-prevention"]
  },
  {
    id: "C_STR_THORACIC_SHOULDER_PRO",
    cat: "C",
    sport: "strength",
    objectif: "Mobilité thoracique & épaule — posture vélo/natation",
    necessite: "Recommandé",
    when: "Toute l'année",
    phase: ["base", "build", "peak", "taper"],
    avoid: "—",
    durationMin: [20, 30],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: mkStructure([
      ["Warm-up", "3' : cat-cow + shoulder CARs 5/côté", []],
      ["Main", "A) Mobilité :\n• Thoracic extension foam roll : 2×60s.\n• Open book : 8/côté tempo lent.\n• Wall slides : 2×10.\n• Doorway pec stretch : 30s/côté ×2.\nB) Renfo postural :\n• Band pull-apart : 3×15.\n• Face pull (élastique) : 3×15.\n• Y-T-W au sol ou banc : 2×10 chaque lettre.\n• Prone scapular retraction : 2×12.", []],
      ["Cool-down", "3' respiration nasale lente", []],
      ["Progression", "Stable. Idéal après séance vélo longue ou avant natation.", []]
    ]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "mobility", "thoracic", "shoulder", "prehab"]
  },

  // ───────────── FALLBACK VARIANTES (qualité moindre, dernier recours) ─────────────
  ...Array.from({ length: 15 }).map((_, i) => ({
    id: `C_STR_VAR_${i + 1}_PRO`,
    cat: "C" as const,
    sport: "strength" as const,
    objectif: `Force/Préhab — fallback variante #${i + 1}`,
    necessite: "Recommandé" as const,
    when: "Toute l'année",
    phase: ["base", "build"] as ("base" | "build" | "peak" | "taper")[],
    avoid: "—",
    durationMin: [25 + (i % 3) * 5, 45 + (i % 4) * 5] as [number, number],
    metricKey: "cardiaque" as const,
    sportKey: "tout sport",
    structure: mkStructure([["Main", `Circuit ${i + 1}: 5–7 exos, RPE 6–7, focus qualité mouvement`, []]]),
    variants: {},
    goals: GOALS_ALL,
    tags: ["strength", "prehab", "fallback"]
  }))
];

// RECOVERY VARIANTS (10)
const RECOVERY_VARIANTS: LibraryWorkout[] = Array.from({ length: 10 }).map((_, i) => ({
  id: `D_RECOVERY_VAR_${i + 1}_PRO`,
  cat: "D" as const,
  sport: (i % 3 === 0 ? "natation" : (i % 3 === 1 ? "course" : "cyclisme")) as "natation" | "course" | "cyclisme",
  objectif: `Récupération active — variante #${i + 1}`,
  necessite: "Recommandé" as const,
  when: "Lendemain charge",
  phase: ["base", "build", "peak", "taper"],
  avoid: "—",
  durationMin: [20 + (i % 4) * 5, 35 + (i % 5) * 5] as [number, number],
  metricKey: "cardiaque" as const,
  sportKey: "tout sport",
  structure: mkStructure([["Main", "Z1 très facile + mobilité/respiration 10'", ["Z1"]]]),
  variants: {},
  goals: GOALS_ALL,
  tags: ["recovery"]
}));

// Concat all Pro Pack workouts
export const ProPackWorkouts: LibraryWorkout[] = [
  ...RUN_A_PRO,
  ...RUN_B_PRO,
  ...RUN_C_PRO,
  ...RUN_D_PRO,
  ...BIKE_A_PRO,
  ...BIKE_B_PRO,
  ...BIKE_C_PRO,
  ...BIKE_D_PRO,
  ...SWIM_A_PRO,
  ...SWIM_B_PRO,
  ...SWIM_C_PRO,
  ...SWIM_D_PRO,
  ...TRAIL_CORE_PRO,
  ...TRAIL_LONG_VARIANTS,
  ...BRICK_CORE_PRO,
  ...BRICK_HALF_VARIANTS,
  ...BRICK_IM_VARIANTS,
  ...STRENGTH_PRO,
  ...RECOVERY_VARIANTS
];

// Add Pro Pack to main library
WorkoutLibrary.push(...ProPackWorkouts);

// =============================================
// TEMPLATE-DERIVED WORKOUTS
// Séances extraites des plans Semi, Marathon, IM Kona, 70.3
// =============================================
import { TemplateDerivedWorkouts } from "./templateDerivedWorkouts";
WorkoutLibrary.push(...TemplateDerivedWorkouts);

// =============================================
// ENRICHED WORKOUTS — Protocoles modernes & variantes avancées
// Norwegian, Fartlek, Train Low, Durabilité, Race-Sim, etc.
// =============================================
import { EnrichedWorkouts } from "./enrichedWorkouts";
WorkoutLibrary.push(...EnrichedWorkouts);

// =============================================
// ENRICHED WORKOUTS V2 — SFR, TT, 5K, Trail avancé, FatMax,
// Gut Training, Technique natation, Sprint, Aquathlon, etc.
// =============================================
import { EnrichedWorkoutsV2 } from "./enrichedWorkoutsV2";
WorkoutLibrary.push(...EnrichedWorkoutsV2);

// =============================================
// ENRICHED WORKOUTS V3 — Cyclisme (+20), Race-Sim (+15),
// Tests (+10), Bricks (+10), Récup (+8), Trail goals, 10K
// =============================================
import { EnrichedWorkoutsV3 } from "./enrichedWorkoutsV3";
WorkoutLibrary.push(...EnrichedWorkoutsV3);

// =============================================
// ENRICHED WORKOUTS TRAIL — 40+ séances trail spécialisées
// Trail Court, Trail Montagne, Trail Ultra
// D+, descente, back-to-back, marche/course, nocturne, nutrition
// =============================================
import { EnrichedWorkoutsTrail } from "./enrichedWorkoutsTrail";
WorkoutLibrary.push(...EnrichedWorkoutsTrail);

// =============================================
// ENRICHED WORKOUTS V4 — Gap-fill Audit
// Strength A/B, Brick C/D/Taper, Kick drills, 10K, Bike taper
// =============================================
import { EnrichedWorkoutsV4 } from "./enrichedWorkoutsV4";
WorkoutLibrary.push(...EnrichedWorkoutsV4);

// =============================================
// ENRICHED WORKOUTS V5 — Méthodologies Élite
// Isométrique, Nordic, Heat, Lactate Shuttle, Respiratory, PAP, Swim Cord, Mental
// =============================================
import { EnrichedWorkoutsV5 } from "./enrichedWorkoutsV5";
WorkoutLibrary.push(...EnrichedWorkoutsV5);

// =============================================
// ENRICHED WORKOUTS V6 — Formats Anti-Monotonie
// Pyramide, Dégressif, Fartlek Libre, Circuit Cardio-Technique
// =============================================
import { EnrichedWorkoutsV6 } from "./enrichedWorkoutsV6";
WorkoutLibrary.push(...EnrichedWorkoutsV6);

// =============================================
// ENRICHED WORKOUTS FATMAX — Oxydation Lipidique
// Z2 à jeun, Fat oxidation, Gut Training progressif, Sleep Low
// =============================================
import { EnrichedWorkoutsFatMax } from "./enrichedWorkoutsFatMax";
WorkoutLibrary.push(...EnrichedWorkoutsFatMax);

// =============================================
// ENRICHED WORKOUTS RECOVERY — REST, Récup, Mobilité, Activation
// =============================================
import { EnrichedWorkoutsRecovery } from "./enrichedWorkoutsRecovery";
WorkoutLibrary.push(...EnrichedWorkoutsRecovery);

// =============================================
// ENRICHED WORKOUTS SWIM — Natation supplémentaire
// Endurance, CSS, VO2, Technique, Race Sim
// =============================================
import { EnrichedWorkoutsSwim } from "./enrichedWorkoutsSwim";
WorkoutLibrary.push(...EnrichedWorkoutsSwim);

// =============================================
// ENRICHED WORKOUTS SWIM V2 — Sprint, Lactate, Fartlek, Taper
// =============================================
import { EnrichedWorkoutsSwimV2 } from "./enrichedWorkoutsSwimV2";
WorkoutLibrary.push(...EnrichedWorkoutsSwimV2);

// =============================================
// ENRICHED WORKOUTS STRENGTH V2 — 4 familles Pro complet
// Force générale · Trail-spé · Route/CAP-spé · Préhab/mobilité
// Warm-up + Main détaillé + Cool-down + Progression hebdo + Réfs (Petersen, Rønnestad, Blagrove)
// =============================================
import { EnrichedWorkoutsStrengthV2 } from "./enrichedWorkoutsStrengthV2";
WorkoutLibrary.push(...EnrichedWorkoutsStrengthV2);

// =============================================
// ENRICHED WORKOUTS HEDGEHOG 🦔 — Côtes urbaines / escaliers
// Substitut montagne pour profils trail sans accès dénivelé long
// =============================================
import { EnrichedWorkoutsHedgehog } from "./enrichedWorkoutsHedgehog";
WorkoutLibrary.push(...EnrichedWorkoutsHedgehog);

// =============================================
// ENRICHED WORKOUTS IM RUN DURABILITY — Élite Ironman (long run 2h, brick long,
// late-race fractions, back-to-back, marathon split, neg split). Force la
// rotation ≥3 séances en Build/Peak via le rappel IM dans promptHelpers.ts.
// =============================================
import { EnrichedWorkoutsIMRunDurability } from "./enrichedWorkoutsIMRunDurability";
WorkoutLibrary.push(...EnrichedWorkoutsIMRunDurability);

// =============================================
// 70.3 PODIUM DURABILITY — Long race-pace CAP, brick race-pace, OWS race-sim,
// quick start + drafting (piscine), negative split 70.3, off-bike fast finish.
// Comble les angles morts identifiés par audit coach 70.3 podium/elite.
// Prescription forcée via le rappel 70.3 dans promptHelpers.ts.
// =============================================
import { EnrichedWorkouts703PodiumDurability } from "./enrichedWorkouts703PodiumDurability";
WorkoutLibrary.push(...EnrichedWorkouts703PodiumDurability);

// =============================================
// POST-PROCESSING: Enrich missing goals[] and phase[]
// =============================================
import { enrichWorkoutGoals } from "./workoutGoalsEnricher";
enrichWorkoutGoals(WorkoutLibrary);

console.log(`✅ Pro Pack: ${ProPackWorkouts.length} | Templates: ${TemplateDerivedWorkouts.length} | Enriched: ${EnrichedWorkouts.length} | V2: ${EnrichedWorkoutsV2.length} | V3: ${EnrichedWorkoutsV3.length} | Trail: ${EnrichedWorkoutsTrail.length} | V4: ${EnrichedWorkoutsV4.length} | V5: ${EnrichedWorkoutsV5.length} | V6: ${EnrichedWorkoutsV6.length} | FatMax: ${EnrichedWorkoutsFatMax.length} | Recovery: ${EnrichedWorkoutsRecovery.length} | Swim+: ${EnrichedWorkoutsSwim.length} | SwimV2: ${EnrichedWorkoutsSwimV2.length} | StrengthV2: ${EnrichedWorkoutsStrengthV2.length} | Hedgehog: ${EnrichedWorkoutsHedgehog.length} | IM Run Durability: ${EnrichedWorkoutsIMRunDurability.length} | 70.3 Podium: ${EnrichedWorkouts703PodiumDurability.length} | Total: ${WorkoutLibrary.length}`);
