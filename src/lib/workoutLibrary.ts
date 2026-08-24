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
    dPlusTargetM: { min: 600, max: 1200 },
    tags: ["trail"]
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
    dPlusTargetM: { min: 500, max: 1100 },
    tags: ["trail"]
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
    dPlusTargetM: { min: 500, max: 1000 },
    tags: ["trail"]
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
    dPlusTargetM: { min: 200, max: 450 },
    tags: ["trail"]
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
    dPlusTargetM: { min: 350, max: 700 },
    tags: ["trail"]
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
    dPlusTargetM: { min: 300, max: 600 },
    tags: ["trail"]
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
    dPlusTargetM: { min: 200, max: 500 },
    tags: ["trail"]
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
    dPlusTargetM: { min: 250, max: 550 },
    tags: ["trail"]
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
    variants: { trail_short: "Très utile", trail_mountain: "utile", trail_ultra: "—", ironman: "—", half: "—", marathon: "—", semi: "—" },
    tags: ["trail"]
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
    dPlusTargetM: { min: 100, max: 300 },
    tags: ["trail"]
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
    dPlusTargetM: { min: 0, max: 100 },
    tags: ["trail"]
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
  },

// =============================================
// NOUVELLES SÉANCES TFCL™ — ENRICHISSEMENT BIBLIOTHÈQUE
// Basées sur littérature scientifique de pointe et méthodes coachs élites
// Références : Lorang, Stellingwerff, Rønnestad, Mujika, Burke, Seiler
// =============================================

// ─────────────────────────────────────────────
// GROUPE 1 — HEAT TRAINING (8 séances)
// Réf: Stellingwerff 2019, Lorenzo 2010, Périard 2021
// Lorang : "Le heat training est l'un des rares moyens légaux d'augmenter
// le volume plasmatique de 10-15% et donc la VO2max"
// ─────────────────────────────────────────────

  {
    id: "HEAT_BIKE_ACCLIM_INTRO",
    cat: "B",
    sport: "cyclisme",
    defaultSportId: 14,
    objectif: "Introduction à l'entraînement en chaleur — adaptation cardiovasculaire progressive",
    necessite: "Recommandé",
    when: "Base/Build — 6-8 semaines avant compétition en chaleur ou protocole volume plasmatique",
    phase: ["base", "build"],
    avoid: "Pathologie cardiaque · Déshydratation · Fièvre · Première séance sans acclimatation préalable",
    durationMin: [60, 75],
    metricKey: "puissance",
    sportKey: "cyclisme",
    tags: ["heat", "chaleur", "volume plasmatique", "acclimation", "lorang"],
    structure: [
      { part: "Warm-up", text: "15 min Z1–Z2 en conditions normales (20°C)", zones: ["Z1", "Z2"] },
      { part: "Main", text: "40 min Z2 continu en conditions chaudes (28–32°C ou sur home trainer pièce chaude sans ventilateur). FC cible : 70-75% FCmax. Hydratation : eau uniquement, 500ml/h. Arrêt immédiat si FC > 90% FCmax ou malaise.", zones: ["Z2"] },
      { part: "Cool-down", text: "10 min Z1 + réhydratation immédiate 750ml avec sodium (500mg)" , zones: ["Z1"] }
    ],
    variants: {
      ironman: "40 min → progresser vers 60 min sur 3 semaines",
      half: "35 min en chaleur modérée",
      marathon: "40 min run en chaleur (adapté course à pied)",
      semi: "30 min en chaleur modérée"
    }
  },

  {
    id: "HEAT_BIKE_PROTOCOL_LORANG",
    cat: "B",
    sport: "cyclisme",
    defaultSportId: 14,
    objectif: "Protocole heat training Lorang — augmentation volume plasmatique et adaptation thermorégulatrice",
    necessite: "Recommandé",
    when: "Build/Peak — 3x/semaine pendant 6 semaines consécutives",
    phase: ["build", "peak"],
    avoid: "Fatigue élevée (TSB < -25) · Sans acclimatation intro · Chaleur > 38°C",
    durationMin: [75, 90],
    metricKey: "puissance",
    sportKey: "cyclisme",
    tags: ["heat", "chaleur", "volume plasmatique", "lorang", "vo2max"],
    structure: [
      { part: "Warm-up", text: "20 min Z1–Z2 progressif", zones: ["Z1", "Z2"] },
      { part: "Main", text: "50–60 min Z2–Z3 en conditions chaudes (30–35°C, home trainer sans ventilateur ou salle chauffée). Maintenir 63-75% FTP. FC : surveiller dérive, ne pas dépasser 85% FCmax. Pesée avant/après pour calculer pertes hydriques. Hydratation : 600–800ml/h eau + électrolytes.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10 min Z1. Réhydratation : 1.5x perte de poids en kg (ex: -1kg → boire 1.5L). Sodium : 1000–1500mg dans les 2h.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "60 min en chaleur + sauna post-séance 15 min (semaines 4-6)",
      half: "50 min en chaleur",
      marathon: "Adapter en run sur tapis en salle chaude",
      semi: "45 min en chaleur modérée"
    }
  },

  {
    id: "HEAT_SAUNA_POST_WORKOUT",
    cat: "C",
    sport: "cyclisme",
    defaultSportId: 14,
    objectif: "Protocole sauna post-entraînement — amplification adaptations volume plasmatique",
    necessite: "Optionnel",
    when: "Build/Peak — après séance Z2 ou récupération, 3x/semaine semaines 4-6 du bloc heat",
    phase: ["build", "peak"],
    avoid: "Immédiatement après séance intense · Déshydratation · Pathologie cardiovasculaire · Grossesse",
    durationMin: [20, 30],
    metricKey: "fc",
    sportKey: "cyclisme",
    tags: ["sauna", "chaleur", "volume plasmatique", "lorang", "récupération"],
    structure: [
      { part: "Warm-up", text: "Finir la séance d'entraînement normale. Douche rapide (pas froide). Boire 500ml avant d'entrer.", zones: ["Z1"] },
      { part: "Main", text: "20–30 min sauna finlandais ou infrarouge (80–100°C). Rester en position assise ou allongée. FC cible : 100–130 bpm. Sortir si FC > 150 bpm ou malaise. 2 sessions de 10–15 min avec 5 min pause possible. Réf : Périard 2021 — 30 min sauna post-exercice = +10% volume plasmatique sur 6 semaines.", zones: ["Z2"] },
      { part: "Cool-down", text: "Douche tiède (pas froide — évite vasoconstriction brutale). Réhydratation : 1L eau + électrolytes dans l'heure.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Protocole complet 6 semaines — semaines 1-3 : 20 min, semaines 4-6 : 30 min",
      half: "4 semaines, 20 min",
      marathon: "Même protocole adapté",
      semi: "3 semaines, 15–20 min"
    }
  },

  {
    id: "HEAT_RUN_ACCLIM",
    cat: "B",
    sport: "course",
    defaultSportId: 2,
    objectif: "Acclimatation à la chaleur en course — adaptation thermorégulatrice spécifique run",
    necessite: "Recommandé",
    when: "Build — avant course en conditions chaudes (> 25°C) ou protocole heat training",
    phase: ["build", "peak"],
    avoid: "FC repos élevée · Déshydratation préexistante · Fièvre · Chaleur > 35°C sans acclimatation",
    durationMin: [45, 70],
    metricKey: "allure",
    sportKey: "course",
    tags: ["heat", "chaleur", "course", "acclimation"],
    structure: [
      { part: "Warm-up", text: "10 min Z1 tôt le matin ou conditions normales", zones: ["Z1"] },
      { part: "Main", text: "35–50 min Z2 en pleine chaleur (milieu de journée ou sur tapis en salle chauffée sans clim). Porter vêtements légèrs. Hydratation : 400–600ml/h. Observer : dérive FC +10–15 bpm vs conditions normales = adaptation normale. Référence allure : 15–30s/km plus lente qu'allure Z2 habituelle.", zones: ["Z2"] },
      { part: "Cool-down", text: "10 min marche Z1 à l'ombre. Refroidissement : serviette froide sur nuque/avant-bras.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Priorité si course en zone chaude (> 28°C prévu)",
      half: "3–4 séances sur 2 semaines avant course",
      marathon: "Protocole 10 jours avant course chaude",
      semi: "2–3 séances avant course"
    }
  },

  {
    id: "HEAT_SWIM_WARM_WATER",
    cat: "A",
    sport: "natation",
    defaultSportId: 19,
    objectif: "Adaptation natation en eau chaude — gestion thermorégulatrice et wetsuit en chaleur",
    necessite: "Optionnel",
    when: "Peak — spécifique avant compétition OWS en eau chaude (> 24°C)",
    phase: ["peak"],
    avoid: "Eau > 32°C sans expérience · Pathologie cardiaque",
    durationMin: [45, 60],
    metricKey: "allure",
    sportKey: "natation",
    tags: ["heat", "open water", "chaleur", "natation"],
    structure: [
      { part: "Warm-up", text: "400m facile, focus technique et gestion rythme cardiaque", zones: ["Z1", "Z2"] },
      { part: "Main", text: "1500–2000m continu à allure CSS+10% (plus lente). En combinaison si eau < 24°C. Sans combinaison si eau > 24°C pour simuler conditions course. Surveiller FC : ne pas dépasser Z3. Hydratation post-sortie immédiate.", zones: ["Z2"] },
      { part: "Cool-down", text: "200m dos facile + rinçage eau froide sur nuque immédiatement après", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2000–2500m avec simulation départ de masse",
      half: "1500m avec drafting simulation",
      marathon: "Non applicable",
      semi: "1000m OWS spécifique"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 2 — FATMAX & TRAIN LOW AVANCÉ (12 séances)
// Réf: Burke 2021, Volek & Phinney 2012, Impey 2018, Lorang
// ─────────────────────────────────────────────

  {
    id: "FATMAX_BIKE_ZONE_FINDER",
    cat: "B",
    sport: "cyclisme",
    defaultSportId: 14,
    objectif: "Test et identification de la zone FatMax personnalisée — calibration du profil lipidique",
    necessite: "Recommandé",
    when: "Base — début de cycle, à jeun, matin après 10h de jeûne",
    phase: ["base"],
    avoid: "Après séance intense (J-1) · Avec glucides dans les 10h précédentes · Période de compétition",
    durationMin: [90, 120],
    metricKey: "puissance",
    sportKey: "cyclisme",
    tags: ["fatmax", "test", "lipides", "à jeun", "lorang", "train low"],
    structure: [
      { part: "Warm-up", text: "15 min Z1 strict à jeun (eau uniquement). FC < 65% FCmax.", zones: ["Z1"] },
      { part: "Main", text: "Protocole paliers FatMax : 5 paliers de 12 min chacun. Palier 1 : 45% FTP. Palier 2 : 55% FTP. Palier 3 : 65% FTP. Palier 4 : 75% FTP. Palier 5 : 85% FTP. Observer : la puissance au palier où la FC commence à dériver de façon non linéaire = zone FatMax approximative. Idéalement avec analyseur respiratoire (QR ou FeO2). Sans matériel : noter RPE et dérive FC pour chaque palier.", zones: ["Z1", "Z2", "Z3"] },
      { part: "Cool-down", text: "15 min Z1. Repas riche en glucides complexes immédiatement après.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Paliers identiques — noter allure Z2 correspondant à FatMax vélo",
      half: "Réduire à 4 paliers (45/55/65/75% FTP)",
      marathon: "Adapter en course à pied : 4:30/km → 4:00 → 3:40 → 3:20 allure",
      semi: "4 paliers en course à pied"
    }
  },

  {
    id: "FATMAX_BIKE_LONG_FASTED",
    cat: "A",
    sport: "cyclisme",
    defaultSportId: 14,
    objectif: "Longue sortie à jeun — développement maximal de l'oxydation lipidique (FatMax)",
    necessite: "Obligatoire",
    when: "Base/Build — 1x/semaine max. Matin à jeun (10h minimum). Remplacer petit-déjeuner.",
    phase: ["base", "build"],
    avoid: "Hypoglycémie connue · VLamax > 0.75 (risque de fringale précoce) · Sans expérience du train low",
    durationMin: [120, 180],
    metricKey: "puissance",
    sportKey: "cyclisme",
    tags: ["fatmax", "à jeun", "fasted", "lipides", "lorang", "train low", "base aérobie"],
    structure: [
      { part: "Warm-up", text: "20 min Z1 très progressif. Eau uniquement. Caféine autorisée (1-2mg/kg) 30 min avant pour mobiliser acides gras.", zones: ["Z1"] },
      { part: "Main", text: "90–140 min Z2 strict (63-72% FTP). AUCUN glucide exogène pendant les 90 premières minutes. Eau + électrolytes uniquement. Cadence 85-95 rpm. Si hypoglycémie (tremblements, confusion) : gel d'urgence immédiatement. Après 90 min si > 3h total : 30g CHO/h autorisés. Réf : Burke 2021 — 3h fasted Z2 augmente FatMax de 25-40% sur 12 semaines.", zones: ["Z2"] },
      { part: "Cool-down", text: "15 min Z1. Repas glucido-protéiné dans les 30 min (récupération + rechargement).", zones: ["Z1"] }
    ],
    variants: {
      ironman: "3–4h Z2 à jeun les 90 premières minutes. Pilier de la préparation IM.",
      half: "2–2h30 Z2 à jeun les 60 premières minutes",
      marathon: "SL 2–3h run à jeun les 60 premières minutes",
      semi: "90 min à jeun Z2"
    }
  },

  {
    id: "FATMAX_SLEEP_LOW_PROTOCOL",
    cat: "C",
    sport: "cyclisme",
    defaultSportId: 14,
    objectif: "Protocole Sleep Low — adaptation métabolique maximale lipidique sur cycle 16h",
    necessite: "Optionnel",
    when: "Build — 1-2x/semaine sur bloc de 3-4 semaines. Réservé athlètes expérimentés.",
    phase: ["build"],
    avoid: "Diabétiques · Hypoglycémiques · Troubles du sommeil · Compétition dans les 3 jours",
    durationMin: [120, 150],
    metricKey: "puissance",
    sportKey: "cyclisme",
    tags: ["sleep low", "train low", "fatmax", "lorang", "périodisation glucidique", "glycogène"],
    structure: [
      { part: "Warm-up", text: "SOIR (J0 - 18h) : Séance normale avec glucides (60-90g/h). Terminer à 19-20h.", zones: ["Z2", "Z3"] },
      { part: "Main", text: "SOIR après séance : repas pauvre en glucides (< 50g), riche en protéines + légumes. PAS de glucides avant le coucher. MATIN (J1 - 6-8h) : réveil, café/thé uniquement. Séance 60-90 min Z2 à jeun (glycogène bas après nuit sans recharge). Cette combinaison déplète le glycogène 2x plus que le simple fasted training. Réf : Impey 2018, Van Proeyen 2011.", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "MATIN après séance : petit-déjeuner normal avec glucides (rechargement complet). Ne pas enchaîner une autre séance sans rechargement glucidique.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2 cycles Sleep Low/semaine pendant 4 semaines en base",
      half: "1 cycle/semaine pendant 3 semaines",
      marathon: "Adapter avec run le matin après nuit low carb",
      semi: "1 cycle/semaine pendant 2 semaines"
    }
  },

  {
    id: "FATMAX_RUN_LONG_FASTED",
    cat: "A",
    sport: "course",
    defaultSportId: 2,
    objectif: "Sortie longue à jeun — développement FatMax course et robustesse glycogénique",
    necessite: "Recommandé",
    when: "Base/Build — 1x/semaine. Weekend matin. Manger glucides la veille soir (pas de Sleep Low).",
    phase: ["base", "build"],
    avoid: "Allure compétition · Terrain accidenté seul · Hypoglycémie connue · Chaleur > 25°C sans expérience",
    durationMin: [90, 150],
    metricKey: "allure",
    sportKey: "course",
    tags: ["fatmax", "à jeun", "fasted", "sortie longue", "train low", "lorang"],
    structure: [
      { part: "Warm-up", text: "10 min marche/trot Z1. Eau + caféine uniquement.", zones: ["Z1"] },
      { part: "Main", text: "70–120 min Z2 (68-75% FCmax). Eau uniquement les 75 premières minutes. Allure 20-30s/km plus lente qu'allure Z2 habituelle (normal à jeun). Si fringale : gel d'urgence. Après 75 min : 20-30g CHO/h si besoin pour terminer. Focus : relâchement, technique, économie de course.", zones: ["Z2"] },
      { part: "Cool-down", text: "10 min marche. Petit-déjeuner complet dans les 20 min (protéines 30g + glucides 60g).", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2–2h30 à jeun les 75 premières minutes. Clé de la préparation marathon IM.",
      half: "90 min à jeun les 60 premières minutes",
      marathon: "2h30–3h avec jeûne 90 premières minutes. Protocole Lydiard adapté.",
      semi: "90 min à jeun 45 premières minutes"
    }
  },

  {
    id: "FATMAX_TRAIN_HIGH_GUT",
    cat: "B",
    sport: "cyclisme",
    defaultSportId: 14,
    objectif: "Train High — adaptation intestinale aux hautes doses de glucides (gut training)",
    necessite: "Obligatoire",
    when: "Build/Peak — entraîner l'intestin à absorber 90-120g CHO/h (glucose:fructose 2:1)",
    phase: ["build", "peak"],
    avoid: "Problèmes GI sévères · < 8 semaines avant course A (pas le temps d'adapter)",
    durationMin: [120, 210],
    metricKey: "puissance",
    sportKey: "cyclisme",
    tags: ["gut training", "train high", "glucides", "intestin", "race nutrition", "lorang"],
    structure: [
      { part: "Warm-up", text: "20 min Z2. Commencer glucides dès le départ (contrairement au fasted training).", zones: ["Z2"] },
      { part: "Main", text: "90–150 min Z2–Z3. Ingestion glucides : semaines 1-2 : 60g/h. Semaines 3-4 : 75g/h. Semaines 5-6 : 90g/h. Semaines 7-8 : 100-120g/h. RATIO OBLIGATOIRE : 2 glucose pour 1 fructose (ex : gel glucose + boisson fructose). Tester les produits de course (pas entraînement). Si nausées : réduire 10g/h et réessayer semaine suivante. Réf : Jeukendrup 2017 — adaptation transporteurs intestinaux sur 8-10 semaines.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "15 min Z1. Journaliser : glucides ingérés, symptômes GI (0-10), énergie perçue.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Obligatoire — viser 90-120g/h pour 8-9h de course",
      half: "Viser 70-90g/h pour 4-5h",
      marathon: "Adapter en run : 60-80g/h (absorption plus difficile en course à pied)",
      semi: "50-70g/h"
    }
  },

  {
    id: "FATMAX_BIKE_FATFLUSH",
    cat: "A",
    sport: "cyclisme",
    defaultSportId: 14,
    objectif: "Fat Flush — longue sortie ultra-basse intensité pour maximiser oxydation lipidique absolue",
    necessite: "Recommandé",
    when: "Base — 1x/2 semaines. Idéal le dimanche matin. Réservé base period.",
    phase: ["base"],
    avoid: "Build/Peak (trop peu d'intensité) · Sans ravitaillement sur parcours > 3h",
    durationMin: [180, 300],
    metricKey: "puissance",
    sportKey: "cyclisme",
    tags: ["fat flush", "fatmax", "ultra endurance", "Z1", "lipides", "base"],
    structure: [
      { part: "Warm-up", text: "20 min Z1 très progressif. Petit-déjeuner léger 2h avant (avoine + œufs, pas de sucres simples).", zones: ["Z1"] },
      { part: "Main", text: "2h30–4h en Z1 strict (< 60% FTP, < 65% FCmax). Cadence libre. Maintenir conversation possible en permanence. Si FC monte > 68% FCmax : ralentir ou pause. Ravitaillement : eau + électrolytes toutes les 30 min. CHO minimal (1 banane/heure suffit après 2h). Priorité absolue à l'oxydation des graisses. Réf : Volek & Phinney 2012 — sorties Z1 longues augmentent les enzymes mitochondriales de 30-50%.", zones: ["Z1"] },
      { part: "Cool-down", text: "Intégré dans la séance (derniers 20 min Z1 encore plus facile). Repas protéiné + légumes après.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "4-6h Z1 en période de base — la séance fondatrice du métabolisme IM",
      half: "3–4h Z1",
      marathon: "Sortie longue lente 3h Z1 run",
      semi: "2h30–3h Z1"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 3 — AFFÛTAGE / TAPERING (8 séances)
// Réf: Mujika 2017, Bosquet 2007, Houmard 1994
// ─────────────────────────────────────────────

  {
    id: "TAPER_BIKE_J14_VOLUME_CUT",
    cat: "B",
    sport: "cyclisme",
    defaultSportId: 14,
    objectif: "Début d'affûtage — réduction progressive du volume avec maintien de l'intensité",
    necessite: "Obligatoire",
    when: "Peak — J-14 avant course A. Semaine 1 de l'affûtage.",
    phase: ["peak"],
    avoid: "Réduire l'intensité (erreur classique) · Ajouter des séances de compensation",
    durationMin: [75, 90],
    metricKey: "puissance",
    sportKey: "cyclisme",
    tags: ["tapering", "affûtage", "peak", "compétition", "mujika"],
    structure: [
      { part: "Warm-up", text: "20 min Z1–Z2 progressif", zones: ["Z1", "Z2"] },
      { part: "Main", text: "40–50 min dont : 2x10 min à allure/puissance course (Z3–Z4 selon objectif). Récup 5 min Z1 entre les blocs. Volume réduit de 40% vs semaine normale mais INTENSITÉ MAINTENUE. Réf : Mujika 2017 — réduction de 40-60% du volume sur 2 semaines avec maintien de l'intensité = +3-4% de performance.", zones: ["Z2", "Z3", "Z4"] },
      { part: "Cool-down", text: "10 min Z1 + mobilité", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2x10 min à allure vélo cible IM (Z3 bas, 75-80% FTP)",
      half: "2x8 min à allure 70.3 (Z3–Z4, 82-88% FTP)",
      marathon: "Adapter en run : 2x10 min allure marathon",
      semi: "2x8 min allure semi"
    }
  },

  {
    id: "TAPER_RUN_J14",
    cat: "B",
    sport: "course",
    defaultSportId: 2,
    objectif: "Affûtage course — maintien qualité neuromusculaire pendant réduction volume",
    necessite: "Obligatoire",
    when: "Peak — J-14 avant course. 1-2x dans la semaine J-14",
    phase: ["peak"],
    avoid: "Séances longues · Nouvelles séances jamais testées · Kilomètres de compensation",
    durationMin: [50, 65],
    metricKey: "allure",
    sportKey: "course",
    tags: ["tapering", "affûtage", "peak", "compétition"],
    structure: [
      { part: "Warm-up", text: "15 min Z1–Z2 progressif + 4x80m accélérations progressives", zones: ["Z1", "Z2"] },
      { part: "Main", text: "20–30 min dont : 3x5 min à allure course ou légèrement plus rapide. Récup 3 min Z1. Volume total réduit de 40%. Conserver la sensation de légèreté — si jambes lourdes : réduire encore 10%.", zones: ["Z2", "Z3", "Z4"] },
      { part: "Cool-down", text: "10 min Z1 + étirements doux", zones: ["Z1"] }
    ],
    variants: {
      ironman: "3x5 min allure marathon cible",
      half: "3x5 min allure semi-marathon ou course cible",
      marathon: "3x5 min à allure marathon ou légèrement plus rapide (allure semi)",
      semi: "3x4 min allure 10km"
    }
  },

  {
    id: "TAPER_ACTIVATION_J2",
    cat: "C",
    sport: "cyclisme",
    defaultSportId: 14,
    objectif: "Activation J-2 — déblocage neuromusculaire et confirmation des sensations",
    necessite: "Obligatoire",
    when: "Peak — exactement J-2 avant course A (pas J-1)",
    phase: ["peak"],
    avoid: "J-1 avant course · Intensité trop élevée · Durée > 45 min",
    durationMin: [35, 45],
    metricKey: "puissance",
    sportKey: "cyclisme",
    tags: ["activation", "J-2", "tapering", "compétition", "pré-course"],
    structure: [
      { part: "Warm-up", text: "15 min Z1–Z2 progressif", zones: ["Z1", "Z2"] },
      { part: "Main", text: "15 min dont : 2x30s accélérations progressives à 90-95% FTP (pas sprint max). Récup 3 min Z1. 5 min Z3 continu à allure course. Objectif : activer le système neuromusculaire et confirmer les bonnes sensations. Si jambes ne répondent pas : c'est normal — ne pas paniquer ni allonger la séance.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10 min Z1 strict. Fin de la séance = fin de la préparation physique.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Vélo 35 min + 10 min run de transition à allure IM",
      half: "Vélo 30 min + 8 min run à allure course",
      marathon: "Run uniquement : 30 min Z1-Z2 + 3x30s accélérations",
      semi: "Run 25 min Z1-Z2 + 2x30s accélérations"
    }
  },

  {
    id: "TAPER_SWIM_J3",
    cat: "A",
    sport: "natation",
    defaultSportId: 19,
    objectif: "Activation natation pré-course — maintien sensations eau et technique",
    necessite: "Recommandé",
    when: "Peak — J-3 ou J-2 avant course triathlon. Courte et qualitative.",
    phase: ["peak"],
    avoid: "Volume élevé · Nouveaux exercices · Si fatigue musculaire",
    durationMin: [25, 40],
    metricKey: "allure",
    sportKey: "natation",
    tags: ["activation", "pré-course", "natation", "tapering"],
    structure: [
      { part: "Warm-up", text: "300m facile mixte (dos/crawl)", zones: ["Z1"] },
      { part: "Main", text: "4x50m à allure course (CSS) récup 20s. 4x25m à 95% allure max récup 30s. Focus : sensations eau, catch, rythme de nage. Total : 600–800m maximum.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "200m dos facile. Sortir en se sentant léger, pas fatigué.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "800m total + 4x25m rapides",
      half: "600m total + 4x25m rapides",
      marathon: "Non applicable",
      semi: "500m total + 2x25m rapides"
    }
  },

  {
    id: "TAPER_MINI_5DAYS",
    cat: "B",
    sport: "course",
    defaultSportId: 2,
    objectif: "Mini-taper 5 jours — affûtage express pour course secondaire ou test",
    necessite: "Recommandé",
    when: "Peak — avant course B ou test de performance. 5 jours de réduction.",
    phase: ["peak"],
    avoid: "Course A prioritaire (utiliser taper 14 jours)",
    durationMin: [40, 55],
    metricKey: "allure",
    sportKey: "course",
    tags: ["tapering", "mini-taper", "5 jours", "mujika", "course B"],
    structure: [
      { part: "Warm-up", text: "J-5 : dernière séance normale courte. J-4 : 40 min Z2 + 2x5 min Z3. J-3 : 35 min Z2 facile. J-2 : cette séance. J-1 : repos ou 20 min Z1.", zones: ["Z1", "Z2"] },
      { part: "Main", text: "J-2 : 30 min dont 10 min allure course + 4x30s accélérations. Volume réduit de 50% vs semaine normale. Intensité maintenue. Réf : Bosquet 2007 — mini-taper 5-7 jours améliore performance de 2-3%.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10 min Z1. Pas de séance J-1 sauf 15-20 min très facile si habitude.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "J-5 à J-2 : réduire toutes les disciplines de 50% en volume",
      half: "Même protocole",
      marathon: "Focus run uniquement sur les 5 jours",
      semi: "Même protocole"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 4 — OPEN WATER SWIMMING SPÉCIFIQUE (6 séances)
// Réf: Brammer 2019, Colwin 2002
// ─────────────────────────────────────────────

  {
    id: "OWS_DRAFTING_TRAINING",
    cat: "B",
    sport: "natation",
    defaultSportId: 19,
    objectif: "Entraînement au drafting — nager dans le sillage pour économiser 15-25% d'énergie",
    necessite: "Recommandé",
    when: "Build/Peak — spécifique triathlon. Nécessite partenaire d'entraînement.",
    phase: ["build", "peak"],
    avoid: "En compétition débutant (règles) · Sans maîtrise technique de base",
    durationMin: [45, 60],
    metricKey: "allure",
    sportKey: "natation",
    tags: ["open water", "drafting", "triathlon", "tactique", "économie"],
    structure: [
      { part: "Warm-up", text: "400m crawl facile. Exercices de proximité : nager à 30cm d'un partenaire.", zones: ["Z1", "Z2"] },
      { part: "Main", text: "6x200m en drafting (nager à 0-30cm des pieds du nageur devant, ou sur le côté à hauteur d'épaule). Récup 30s. Alterner : 3 fois en tête (Z3), 3 fois en drafting (Z2). Observer : économie réelle — maintenir même allure avec FC plus basse. Réf : Chatard 2003 — drafting réduit le coût énergétique de 13-26%.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "200m facile + simulation de sortie de l'eau (courir 50m après).", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Pack swimming — nager en groupe de 4-6, pratiquer positionnement",
      half: "3x300m en drafting + 3x300m en tête",
      marathon: "Non applicable",
      semi: "4x150m drafting"
    }
  },

  {
    id: "OWS_MASS_START_SIM",
    cat: "B",
    sport: "natation",
    defaultSportId: 19,
    objectif: "Simulation départ de masse — gestion du chaos initial et placement tactique",
    necessite: "Recommandé",
    when: "Peak — 2-4 semaines avant triathlon. En groupe de 4-8 nageurs minimum.",
    phase: ["peak"],
    avoid: "Seul · Sans expérience OWS · Anxiété sévère à l'eau",
    durationMin: [40, 55],
    metricKey: "allure",
    sportKey: "natation",
    tags: ["open water", "départ de masse", "triathlon", "tactique", "simulation"],
    structure: [
      { part: "Warm-up", text: "400m échauffement calme. Discussion tactique : placement selon niveau (fort = avant-côté, moyen = 2ème rang).", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3 répétitions de départ de masse simulé : sprint 50-75m à 95% max en groupe (contact physique normal), puis transition vers rythme de course. Récup 3 min entre chaque. Pratique : sighting (lever la tête toutes les 6-10 foulées), nage en ligne droite sans ligne d'eau, contact physique géré. 1x500m à allure course en open water (sans ligne).", zones: ["Z3", "Z4", "Z5"] },
      { part: "Cool-down", text: "200m retour calme + debriefing tactique", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Départ simulé + 1000m allure course OWS",
      half: "Départ simulé + 500m allure course",
      marathon: "Non applicable",
      semi: "Départ simulé + 300m allure course"
    }
  },

  {
    id: "OWS_NAVIGATION_SIGHTING",
    cat: "A",
    sport: "natation",
    defaultSportId: 19,
    objectif: "Maîtrise du sighting et navigation en open water — économiser 50-200m par ligne droite",
    necessite: "Recommandé",
    when: "Build — toute l'année, priorité si course avec OWS",
    phase: ["base", "build", "peak"],
    avoid: "Eau trouble sans repères · Sans partenaire de sécurité en OWS",
    durationMin: [40, 55],
    metricKey: "allure",
    sportKey: "natation",
    tags: ["open water", "sighting", "navigation", "triathlon", "technique"],
    structure: [
      { part: "Warm-up", text: "300m crawl. 4x25m drill sighting : lever la tête 2x par longueur de 25m.", zones: ["Z1"] },
      { part: "Main", text: "Exercice 1 : 4x100m avec sighting toutes les 8 foulées (rythme course). Exercice 2 : 200m en piscine yeux fermés → mesurer dérive (objectif < 1m). Exercice 3 (si OWS disponible) : 2x400m navigation vers bouée sans ligne d'eau, focus sur ligne droite. Technique : chin-up sighting (Colwin 2002) — lever uniquement les yeux, pas toute la tête.", zones: ["Z2"] },
      { part: "Cool-down", text: "200m facile dos", zones: ["Z1"] }
    ],
    variants: {
      ironman: "400m OWS navigation + simulation de bouée intermédiaire",
      half: "2x300m navigation OWS",
      marathon: "Non applicable",
      semi: "2x200m navigation OWS"
    }
  },

  {
    id: "OWS_WETSUIT_SPECIFIC",
    cat: "A",
    sport: "natation",
    defaultSportId: 19,
    objectif: "Adaptation combinaison néoprène — technique et gestion thermique en wetsuit",
    necessite: "Recommandé",
    when: "Build/Peak — si course en eau < 24°C avec wetsuit autorisée",
    phase: ["build", "peak"],
    avoid: "Eau > 24°C (inconfort thermique) · Wetsuit non testée le jour de la course",
    durationMin: [40, 55],
    metricKey: "allure",
    sportKey: "natation",
    tags: ["open water", "wetsuit", "néoprène", "combinaison", "triathlon"],
    structure: [
      { part: "Warm-up", text: "300m avec wetsuit — s'habituer à la flottabilité modifiée et restriction des épaules.", zones: ["Z1", "Z2"] },
      { part: "Main", text: "1000–1500m avec wetsuit. Focus : ajuster stroke rate (cadence augmente naturellement avec flottabilité). Observer : allure wetsuit vs sans — gain typique 3-5s/100m. Adapter technique catch : EVF (Early Vertical Forearm) légèrement modifié. Gestion thermique : si surchauffe, nager plus lentement ou s'arrêter.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "200m sans wetsuit si possible (comparaison). Pratiquer retrait rapide du haut < 20 secondes.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2x750m avec wetsuit à allure IM + simulation transition T1",
      half: "1500m avec wetsuit à allure course",
      marathon: "Non applicable",
      semi: "750m avec wetsuit à allure course"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 5 — ÉCONOMIE DE COURSE AVANCÉE (8 séances)
// Réf: Jones 2002, Daniels 2005, Weyand 2010, Dalleau 1998
// ─────────────────────────────────────────────

  {
    id: "ECONOMY_RUN_POSE_DRILLS",
    cat: "C",
    sport: "course",
    defaultSportId: 2,
    objectif: "Technique de course Pose Method — réduction de la braking force et économie d'énergie",
    necessite: "Recommandé",
    when: "Toute l'année — séance technique dédiée ou intégrée au warm-up",
    phase: ["base", "build"],
    avoid: "Douleur genou · Fatigue musculaire élevée · Sans apprentissage préalable de la méthode",
    durationMin: [40, 55],
    metricKey: "allure",
    sportKey: "course",
    tags: ["économie", "technique", "pose method", "foulée", "Daniels"],
    structure: [
      { part: "Warm-up", text: "10 min trot Z1 relâché", zones: ["Z1"] },
      { part: "Main", text: "Série de drills (2x20m chacun, récup marche 30s) : 1. Chute avant — se laisser tomber en avant et rattraper avec la pose (appui sous centre de gravité). 2. Pull — ramener le pied sous la hanche en tirant avec ischio (pas de déroulement exagéré). 3. Change of support — alternance rapide appui droit/gauche sur place. 4. Running en côte courte 30m (3% pente) — favorise la pose naturellement. 5. 4x200m allure Z3 en appliquant la technique. Puis 2x800m allure Z2 avec focus : cadence 170-180 pas/min, appui sous le corps, bras à 90°.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10 min Z1 + étirements ischio-jambiers", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Crucial pour économie en fin de run IM — intégrer 1x/semaine en base",
      half: "2x/mois en build",
      marathon: "Priorité haute — économie = performance marathon",
      semi: "1x/mois"
    }
  },

  {
    id: "ECONOMY_RUN_FATIGUE_FORM",
    cat: "B",
    sport: "course",
    defaultSportId: 2,
    objectif: "Technique sous fatigue — maintien de l'économie de foulée en fin de séance longue",
    necessite: "Recommandé",
    when: "Build/Peak — fin de sortie longue ou brick après vélo",
    phase: ["build", "peak"],
    avoid: "Blessure en cours · Fatigue extrême (>8/10)",
    durationMin: [75, 100],
    metricKey: "allure",
    sportKey: "course",
    tags: ["économie", "fatigue", "technique", "brick", "lorang", "résistance"],
    structure: [
      { part: "Warm-up", text: "20 min Z1–Z2 (ou sortir directement du vélo en brick)", zones: ["Z1", "Z2"] },
      { part: "Main", text: "40–60 min Z2–Z3 continu. Dans les 15 dernières minutes : focus technique intensifié (cadence, relâchement bras, regard horizontal). 4x100m accélérations progressives en maintenant la forme malgré la fatigue. Objectif : démontrer que la technique ne se dégrade pas sous fatigue = signe d'économie maîtrisée. Réf : Jones 2002 — Paula Radcliffe maintenait 1% meilleure économie en fin de marathon vs début.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10 min marche + automassage mollets", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Après 4h vélo — 45 min run avec focus technique fin de parcours",
      half: "Après 2h30 vélo — 30 min run technique",
      marathon: "SL 2h30 avec 15 dernières minutes focus technique",
      semi: "SL 1h45 avec 10 min focus technique fin"
    }
  },

  {
    id: "ECONOMY_TRAIL_DESCENT_TECH",
    cat: "B",
    sport: "trail",
    defaultSportId: 52,
    objectif: "Technique de descente trail — économie neuromusculaire et protection quadriceps (Kilian Jornet)",
    necessite: "Recommandé",
    when: "Build/Peak — spécifique trail. Terrains variés requis.",
    phase: ["build", "peak"],
    avoid: "Genou douloureux · Terrain glissant sans expérience · Chaussures trail inadaptées",
    durationMin: [60, 90],
    metricKey: "allure",
    sportKey: "trail",
    tags: ["trail", "descente", "technique", "Kilian Jornet", "neuromusculaire", "quadriceps"],
    structure: [
      { part: "Warm-up", text: "15 min trot terrain plat + 5 min marche active côte", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Exercices descente (Jornet method) : 1. Descente lente contrôlée — appui avant-pied, centre de gravité bas, regard 3-5m devant. 2. Descente libre rapide sur 100-200m — laisser les jambes aller, bras écartés pour équilibre. 3. Descente technique (pierres, racines) — lecture terrain, anticipation appuis. 4x5-8 min de descente à allure race simulation. Entre chaque : remontée Z2. Volume total : 400-600m dénivelé négatif.", zones: ["Z2", "Z3", "Z4"] },
      { part: "Cool-down", text: "15 min terrain plat Z1 + étirements quadriceps", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Non prioritaire",
      half: "Non prioritaire",
      marathon: "Non applicable",
      semi: "Non applicable — trail uniquement"
    }
  },

  {
    id: "ECONOMY_STRIDES_ADVANCED",
    cat: "A",
    sport: "course",
    defaultSportId: 2,
    objectif: "Strides avancés — développement de l'économie neuromusculaire et de la vitesse de base",
    necessite: "Recommandé",
    when: "Toute l'année — fin de séance Z2 ou séance dédiée courte",
    phase: ["base", "build", "peak"],
    avoid: "Blessure musculaire · Fatigue > 7/10 · Après séance d'intervalles intense",
    durationMin: [45, 55],
    metricKey: "allure",
    sportKey: "course",
    tags: ["strides", "accélérations", "économie", "vitesse", "neuromusculaire", "Daniels"],
    structure: [
      { part: "Warm-up", text: "20 min Z1–Z2 relâché", zones: ["Z1", "Z2"] },
      { part: "Main", text: "8x100m strides progressifs (pas sprints) : démarrer à allure 5km, accélérer progressivement jusqu'à 95% allure max sur les 30 derniers mètres, décélérer douce sur les 20 derniers. Récup : marche 60-90s. Focus : relâchement total (mâchoire, épaules, poings ouverts), foulée déliée, cadence naturellement élevée. Variante avancée : 4x100m sur légère montée (2-3%) pour renforcement spécifique. Réf : Daniels 2005 — strides réguliers améliorent économie de 2-4%.", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "10 min Z1 trot + 5 min marche", zones: ["Z1"] }
    ],
    variants: {
      ironman: "6-8 strides 2x/semaine en base — fondamental pour économie run IM",
      half: "6 strides après Z2",
      marathon: "8-10 strides 2x/semaine — critique pour économie marathon",
      semi: "6-8 strides 1-2x/semaine"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 6 — VÉLO AÉRO & POSITION (5 séances)
// Réf: Grappe 2009, Martin 2006, Debraux 2011
// ─────────────────────────────────────────────

  {
    id: "AERO_BIKE_POSITION_ENDURANCE",
    cat: "B",
    sport: "cyclisme",
    defaultSportId: 14,
    objectif: "Endurance en position aéro — développer le confort et la puissance en position TT",
    necessite: "Obligatoire",
    when: "Build/Peak — spécifique triathlon et contre-la-montre",
    phase: ["build", "peak"],
    avoid: "Douleur cervicale ou lombaire · Sans bike fit préalable · Vélo route (pas TT)",
    durationMin: [90, 150],
    metricKey: "puissance",
    sportKey: "cyclisme",
    tags: ["aéro", "position TT", "triathlon", "contre-la-montre", "bike fit"],
    structure: [
      { part: "Warm-up", text: "20 min Z1–Z2 position normale puis 5 min test position aéro", zones: ["Z1", "Z2"] },
      { part: "Main", text: "4x15 min en position aéro stricte (coudes sur aerobar, dos plat). Récup 5 min Z1 position droite entre chaque. Puissance cible : 75-82% FTP (légèrement réduite vs position normale — perte initiale de 3-8% normale). Progression sur 6 semaines : de 4x10 min à 4x20 min. Réf : Debraux 2011 — position aéro réduit la traînée de 25-30% mais demande 3-6 semaines d'adaptation musculaire.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "15 min Z1 + étirements fléchisseurs de hanche + cervicaux", zones: ["Z1"] }
    ],
    variants: {
      ironman: "4x20 min position aéro à 75-80% FTP — simuler le vélo IM",
      half: "4x15 min à 78-83% FTP",
      marathon: "Non applicable (vélo support)",
      semi: "3x12 min position aéro"
    }
  },

  {
    id: "AERO_BIKE_CADENCE_HIGH",
    cat: "B",
    sport: "cyclisme",
    defaultSportId: 14,
    objectif: "Développement neuromusculaire haute cadence — efficacité pédalage 100-120 rpm",
    necessite: "Recommandé",
    when: "Base/Build — améliorer l'efficacité neuromusculaire et économiser les quadriceps",
    phase: ["base", "build"],
    avoid: "Douleur genou · Développement trop court (braquet inadapté)",
    durationMin: [75, 90],
    metricKey: "puissance",
    sportKey: "cyclisme",
    tags: ["cadence", "neuromusculaire", "efficacité", "pédalage", "home trainer"],
    structure: [
      { part: "Warm-up", text: "15 min progressif Z1–Z2, cadence libre", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Série cadence élevée : 4x5 min à 110-120 rpm @ Z2 (55-65% FTP). Récup 3 min Z1 cadence libre. Focus : pédalage rond (tirer en haut, pousser en bas), minimiser le rebond en selle. Puis 2x10 min Z2 à 95-100 rpm (cadence race). Réf : Ahlquist 1992 — cadence élevée (90-100 rpm) préserve les fibres lentes et le glycogène musculaire en longue distance.", zones: ["Z2"] },
      { part: "Cool-down", text: "10 min Z1 cadence libre", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Cadence cible IM : 85-95 rpm — développer au-dessus pour créer une marge",
      half: "Cadence cible 90-100 rpm",
      marathon: "Non applicable",
      semi: "Même protocole"
    }
  },

  {
    id: "AERO_BIKE_TT_RACE_SIM",
    cat: "C",
    sport: "cyclisme",
    defaultSportId: 14,
    objectif: "Simulation contre-la-montre/vélo triathlon — répétition complète des conditions de course",
    necessite: "Obligatoire",
    when: "Peak — 1 ou 2 fois dans les 4 semaines avant course A. En conditions similaires à la course.",
    phase: ["peak"],
    avoid: "< 10 jours avant course A · Sans nutrition race testée · Sur parcours inconnu sans reconnaissance",
    durationMin: [120, 240],
    metricKey: "puissance",
    sportKey: "cyclisme",
    tags: ["simulation", "TT", "triathlon", "race pace", "course spécifique"],
    structure: [
      { part: "Warm-up", text: "20 min Z2 + 3x1 min Z3–Z4 (simuler la mise en route en course)", zones: ["Z2", "Z3"] },
      { part: "Main", text: "Simulation vélo course : 80-95% de la distance réelle, ou 75-85% du temps total vélo prévu. Puissance cible : allure race (NP cible). Position aéro maintenue. Nutrition exactement comme en course (gel + boisson, timing identique). Analyser : régularité de la puissance, gestion des relances, efficacité en côte. Run de transition immédiatement après (15-20 min Z2-Z3).", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "10 min Z1. Analyser les données : IF, NP, variabilité. Nutrition post-effort complète.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "140-160 km à allure IM + 20 min run de transition",
      half: "70-80 km à allure 70.3 + 15 min run",
      marathon: "Non applicable",
      semi: "40-45 km à allure course + 10 min run"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 7 — RESPIRATORY MUSCLE TRAINING (3 séances)
// Réf: Inui-Yamamoto 2022, Romer 2002, Sheel 2002
// ─────────────────────────────────────────────

  {
    id: "RMT_INSPIRATORY_INTRO",
    cat: "C",
    sport: "cyclisme",
    defaultSportId: 14,
    objectif: "Introduction entraînement musculaire respiratoire — renforcer les muscles inspiratoires",
    necessite: "Optionnel",
    when: "Base — 5x/semaine, 10 min/session. Nécessite PowerBreathe ou résistance inspiratoire.",
    phase: ["base", "build"],
    avoid: "Asthme non contrôlé · BPCO · Sans appareil de résistance inspiratoire",
    durationMin: [10, 15],
    metricKey: "fc",
    sportKey: "cyclisme",
    tags: ["RMT", "respiratoire", "inspiratoire", "PowerBreathe", "VO2max"],
    structure: [
      { part: "Warm-up", text: "2 min respirations profondes sans résistance", zones: ["Z1"] },
      { part: "Main", text: "30 respirations maximales contre résistance inspiratoire (PowerBreathe ou équivalent). Résistance initiale : 50% PImax (pression inspiratoire maximale). Progression : +5% résistance/semaine. 2 séries de 30 respirations avec 1 min récup. Indépendant du sport — peut se faire assis. Réf : Inui-Yamamoto 2022 — RMT 6 semaines : +3-5% VO2max, -2-4% FC sous-max. Romer 2002 : améliore performance cyclisme de 4.6%.", zones: ["Z2"] },
      { part: "Cool-down", text: "2 min respirations libres. Faire matin + soir si possible.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Protocole 12 semaines en base — gain VO2max sans fatigue périphérique",
      half: "8 semaines",
      marathon: "Idem — améliore la respiration en fin de marathon",
      semi: "6 semaines"
    }
  },

  {
    id: "RMT_EXPIRATORY_CORE",
    cat: "C",
    sport: "renforcement",
    defaultSportId: 20,
    objectif: "Entraînement expiratoire et gainage respiratoire — stabilité centrale et puissance respiratoire",
    necessite: "Optionnel",
    when: "Base/Build — 3-4x/semaine. Combinable avec renforcement core.",
    phase: ["base", "build"],
    avoid: "Hernie abdominale · Pathologie respiratoire aiguë",
    durationMin: [15, 20],
    metricKey: "fc",
    sportKey: "renforcement",
    tags: ["RMT", "expiratoire", "gainage", "core", "respiration"],
    structure: [
      { part: "Warm-up", text: "3 min respiration diaphragmatique : inspirer 4s (gonfler ventre), expirer 6s (rentrer ventre)", zones: ["Z1"] },
      { part: "Main", text: "Circuit respiratoire (3 rounds) : 1. Gainage planche 30s avec expiration forcée. 2. Crunch respiratoire : inspirer en montant, expirer force en descendant (20 reps). 3. Respiration 4-7-8 : inspirer 4s, retenir 7s, expirer 8s (4 cycles). 4. Chant ou humming (vibration pharyngée) 1 min — stimule nerf vague + récupération. Réf : Sheel 2002 — muscles expiratoires ont réponse métaréflexe sur vasoconstriction périphérique.", zones: ["Z2"] },
      { part: "Cool-down", text: "2 min cohérence cardiaque (5s inspire, 5s expire)", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Intégrer dans routine matin (10 min) pendant 12 semaines de base",
      half: "8 semaines",
      marathon: "Priorité : breathing technique en fin de marathon",
      semi: "6 semaines"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 8 — CONTRAST TRAINING (4 séances)
// Réf: Rønnestad 2016, Docherty 2004, PAP (Post-Activation Potentiation)
// ─────────────────────────────────────────────

  {
    id: "CONTRAST_BIKE_FORCE_POWER",
    cat: "C",
    sport: "cyclisme",
    defaultSportId: 14,
    objectif: "Contrast training vélo — alternance force max / explosivité pour maximiser la PAP",
    necessite: "Recommandé",
    when: "Build — 1x/semaine. Salle de sport + home trainer ou home trainer seul.",
    phase: ["build"],
    avoid: "Débutant en renforcement · Fatigue musculaire élevée · Sans échauffement complet",
    durationMin: [70, 85],
    metricKey: "puissance",
    sportKey: "cyclisme",
    tags: ["contrast training", "PAP", "force max", "explosivité", "Rønnestad", "neuromusculaire"],
    structure: [
      { part: "Warm-up", text: "15 min Z2 vélo + 5 min mobilité articulaire", zones: ["Z1", "Z2"] },
      { part: "Main", text: "4 rounds de contrast training (récup 3 min entre rounds) : A1 : Squat lourd 3-5 reps à 80-85% 1RM (ou leg press). Récup 15-20 secondes (PAP window). A2 : 10s sprint maximal sur home trainer (ERG désactivé, développement fixe). Récup 3 min complet. Réf : Rønnestad 2016 — contrast training améliore la puissance sprint de 8-12% vs entraînement normal. Le délai 15-20s post-force maximise la PAP sans fatigue musculaire.", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "10 min Z1 vélo + étirements quadriceps et ischio", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2 rounds uniquement (volume faible, qualité maximale)",
      half: "3 rounds",
      marathon: "Non applicable (vélo)",
      semi: "3 rounds"
    }
  },

  {
    id: "CONTRAST_RUN_FORCE_SPEED",
    cat: "C",
    sport: "course",
    defaultSportId: 2,
    objectif: "Contrast training run — alternance force max et strides explosifs pour économie neuromusculaire",
    necessite: "Recommandé",
    when: "Build — 1x/semaine. Piste ou terrain plat. Salle si disponible.",
    phase: ["build"],
    avoid: "Blessure en cours · Débutant renforcement · Veille de séance longue",
    durationMin: [55, 70],
    metricKey: "allure",
    sportKey: "course",
    tags: ["contrast training", "PAP", "force", "vitesse", "économie", "Rønnestad"],
    structure: [
      { part: "Warm-up", text: "15 min trot Z1–Z2 + mobilité dynamique 5 min", zones: ["Z1", "Z2"] },
      { part: "Main", text: "4 rounds contrast training running : A1 : Squat sauté 3 reps à 70% 1RM ou box jump 5 reps (force explosive). Récup 10-15s (PAP window). A2 : 80m stride à 95% vitesse max. Récup 2 min complet. Puis 2x800m allure Z3-Z4 (capitaliser la PAP en conditions de course). Réf : Docherty 2004 — contrast training améliore l'économie de course de 3-5% sur 8 semaines.", zones: ["Z3", "Z4", "Z5"] },
      { part: "Cool-down", text: "10 min Z1 trot + étirements", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2-3 rounds — préserver pour la course longue",
      half: "3-4 rounds",
      marathon: "Priorité haute en phase build — améliore économie marathon",
      semi: "4 rounds"
    }
  },

  {
    id: "CONTRAST_STR_UPPER_LOWER",
    cat: "C",
    sport: "renforcement",
    defaultSportId: 20,
    objectif: "Contrast training haut/bas du corps — développement force-vitesse athlète triathlon",
    necessite: "Optionnel",
    when: "Build — 1x/semaine en complément des autres séances renforcement",
    phase: ["build"],
    avoid: "Blessure épaule ou genou · Fatigue cumulée élevée",
    durationMin: [60, 75],
    metricKey: "fc",
    sportKey: "renforcement",
    tags: ["contrast training", "haut du corps", "bas du corps", "triathlon", "force"],
    structure: [
      { part: "Warm-up", text: "10 min vélo ergomètre Z1 + activation épaules et hanches", zones: ["Z1"] },
      { part: "Main", text: "Superset 1 — Haut du corps (3 rounds) : A1 : Tractions lestées 3-5 reps (force). A2 : Medicine ball slam 5 reps (puissance). Récup 2 min. Superset 2 — Bas du corps (3 rounds) : B1 : Romanian deadlift 3-5 reps lourd (force). B2 : Jump squat 5 reps (puissance). Récup 2 min. Finir avec 10 min run Z2 (transfert neuromusculaire immédiat).", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "10 min mobilité + foam rolling", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2 rounds chaque superset (économiser pour l'endurance)",
      half: "3 rounds",
      marathon: "Focus bas du corps uniquement (3-4 rounds B1-B2)",
      semi: "3 rounds complets"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 9 — PÉRIODISATION NUTRITIONNELLE AVANCÉE (5 séances)
// Réf: Stellingwerff 2016, Impey 2018, Close 2016
// ─────────────────────────────────────────────

  {
    id: "NUTRITION_CARB_PERIODIZATION_WEEK",
    cat: "C",
    sport: "cyclisme",
    defaultSportId: 14,
    objectif: "Modèle de semaine avec périodisation glucidique — optimiser l'adaptation métabolique",
    necessite: "Recommandé",
    when: "Base/Build — semaine type avec périodisation glucidique Lorang",
    phase: ["base", "build"],
    avoid: "Semaine de compétition · Débutants en nutrition sportive · Sans suivi diététique",
    durationMin: [60, 90],
    metricKey: "puissance",
    sportKey: "cyclisme",
    tags: ["périodisation glucidique", "carb periodization", "nutrition", "lorang", "train low"],
    structure: [
      { part: "Warm-up", text: "Lundi (récup) : Low carb. Mardi (intensité) : High carb (150g avant + 60g/h pendant).", zones: ["Z1"] },
      { part: "Main", text: "Modèle semaine Lorang : Lundi : repos/récup, carbs modérés (3g/kg). Mardi : séance intense VO2max — HIGH carb (6-8g/kg, glucides avant/pendant/après). Mercredi : Z2 moyen + train low possible (4g/kg). Jeudi : seuil ou technique — HIGH carb (6g/kg). Vendredi : récup active — LOW carb (2-3g/kg, pas de glucides exogènes). Samedi : longue sortie — LOW carb début puis progression selon durée. Dimanche : récup ou brick léger — carbs modérés. Réf : Impey 2018 — train low, compete high.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "Journaliser quotidiennement : énergie, poids, qualité sommeil, humeur. Adapter si déclin sur 3 jours consécutifs.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "6 mois avant course : ratio 60% séances low carb",
      half: "3 mois : ratio 50% low carb",
      marathon: "4 mois : ratio 55% low carb",
      semi: "2 mois : ratio 40% low carb"
    }
  },

  {
    id: "NUTRITION_RACE_MORNING_PROTOCOL",
    cat: "C",
    sport: "cyclisme",
    defaultSportId: 14,
    objectif: "Protocole matin de course — optimisation du dernier repas et activation métabolique",
    necessite: "Obligatoire",
    when: "Peak — J0 matin de course. À pratiquer à l'entraînement au moins 3 fois.",
    phase: ["peak"],
    avoid: "Nouveauté le jour J · Aliments non testés · Alcool J-1",
    durationMin: [20, 30],
    metricKey: "fc",
    sportKey: "cyclisme",
    tags: ["matin de course", "nutrition pré-course", "protocole", "race day"],
    structure: [
      { part: "Warm-up", text: "J-1 soir : repas charge glucidique (8-10g CHO/kg), hydratation (35ml/kg eau + sodium). Coucher habituel.", zones: ["Z1"] },
      { part: "Main", text: "J0 matin (3-3h30 avant départ) : Repas testé à l'entraînement : 100-150g glucides (porridge, pain blanc, riz, banane). Protéines légères 20-25g. Très peu de fibres et graisses. Caféine 3-6mg/kg (1h avant départ si habitude). 30 min avant départ : 20-30g maltodextrine + eau. Échauffement léger 10-15 min (activation sans vider le glycogène). Réf : Burke 2010 — repas 3h avant maintient glycémie stable sans inconfort GI.", zones: ["Z2"] },
      { part: "Cool-down", text: "10 min post-course (dans la première heure) : 1g CHO/kg + 0.3g protéines/kg. Sodium 1000-1500mg. Réhydratation 1.5x perte de poids.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Repas 3h30 avant (4-5h de course) : 150g CHO + 25g protéines",
      half: "Repas 3h avant : 100-120g CHO",
      marathon: "Repas 3h avant : 100g CHO, réduire fibres à zero",
      semi: "Repas 2h30 avant : 80-100g CHO"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 10 — RÉCUPÉRATION ACTIVE AVANCÉE (5 séances)
// Réf: Hausswirth 2013, Mujika 2010
// ─────────────────────────────────────────────

  {
    id: "RECOVERY_COLD_WATER_IMMERSION",
    cat: "A",
    sport: "renforcement",
    defaultSportId: 20,
    objectif: "Immersion eau froide post-séance — accélération récupération neuromusculaire et inflammation",
    necessite: "Optionnel",
    when: "Build/Peak — après séances intenses ou compétition. Pas après séances d'adaptation (cold blunts signal)",
    phase: ["build", "peak"],
    avoid: "Immédiatement après séance d'adaptation à la force (bloque la signalisation hypertrophique) · Hypothermie · Pathologie cardiovasculaire",
    durationMin: [15, 25],
    metricKey: "fc",
    sportKey: "renforcement",
    tags: ["récupération", "froid", "immersion", "cold water", "inflammation"],
    structure: [
      { part: "Warm-up", text: "Finir la séance. Attendre 5-10 min (douche froide progressive d'abord).", zones: ["Z1"] },
      { part: "Main", text: "Immersion eau froide (10-15°C) : 10-15 min. Méthode : cuves remplies de glace + eau froide, ou baignoire froide. Niveau : jusqu'aux hanches minimum, idéalement torse. Protocoles testés : 10 min à 11-15°C (Hausswirth 2013). Si pas de cuve : 10 min douche froide alternée (1 min froid, 30s chaud x4). Réf : Versey 2013 — CWI améliore la récupération de 24-48h : -35% douleurs musculaires, +5% puissance 24h après.", zones: ["Z1"] },
      { part: "Cool-down", text: "Réchauffement progressif (vêtements chauds, boisson chaude). PAS de sauna immédiatement après (contre-indiqué).", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Après chaque longue sortie > 3h et après la course",
      half: "Après les séances les plus intenses de la semaine",
      marathon: "Après SL et intervalles V4 en build",
      semi: "Optionnel après séances clés"
    }
  },

  {
    id: "RECOVERY_HRV_GUIDED_DAY",
    cat: "A",
    sport: "renforcement",
    defaultSportId: 20,
    objectif: "Journée guidée par HRV — adapter l'entraînement selon le signal de récupération objectif",
    necessite: "Recommandé",
    when: "Toute l'année — remplacer toute séance si HRV < seuil individuel",
    phase: ["base", "build", "peak"],
    avoid: "Ignorer le signal HRV sous prétexte de programme fixe",
    durationMin: [30, 60],
    metricKey: "fc",
    sportKey: "renforcement",
    tags: ["HRV", "récupération", "adaptation", "lorang", "individualisation"],
    structure: [
      { part: "Warm-up", text: "Mesure HRV matin au réveil (5 min allongé, app HRV4Training ou Whoop ou Garmin Body Battery). Comparer à la baseline personnelle (moyenne 7 derniers jours).", zones: ["Z1"] },
      { part: "Main", text: "Algorithme de décision : HRV > 105% baseline → séance planifiée normale ou légèrement augmentée. HRV entre 95-105% → séance planifiée normale. HRV entre 85-95% → réduire volume 20%, pas d'intensité Z4+. HRV < 85% (ou body battery < 25) → uniquement récupération active (marche 30 min, yoga, natation facile). HRV < 75% ou FC repos + 8bpm → repos complet. Lorang : 'Deux jours consécutifs HRV bas = signe clinique de surmenage — modifier la semaine entière.'", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "Journaliser : HRV + séance réalisée + sensations → calibrer l'algorithme sur 4-6 semaines.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Protocole obligatoire — 10 mois de préparation = gestion fine de la charge",
      half: "Recommandé en build et peak",
      marathon: "Recommandé — prévention surmenage build marathon",
      semi: "Optionnel mais utile"
    }
  },

  {
    id: "RECOVERY_YOGA_MOBILITY_TRI",
    cat: "A",
    sport: "renforcement",
    defaultSportId: 20,
    objectif: "Yoga et mobilité triathlete — corriger les déséquilibres spécifiques triathlon",
    necessite: "Recommandé",
    when: "Toute l'année — 1-2x/semaine. Idéal J de repos ou après séance légère.",
    phase: ["base", "build", "peak"],
    avoid: "Étirements statiques avant séance intense (réduit la puissance temporairement)",
    durationMin: [30, 45],
    metricKey: "fc",
    sportKey: "renforcement",
    tags: ["yoga", "mobilité", "récupération", "déséquilibres", "triathlon"],
    structure: [
      { part: "Warm-up", text: "5 min respiration consciente + cohérence cardiaque", zones: ["Z1"] },
      { part: "Main", text: "Circuit mobilité triathlete (30-40 min) : Fléchisseurs de hanche (piriforme, psoas) — 3 min chaque côté (problème n°1 cycliste). Épaules (capsule postérieure, trapèze) — 5 min (problème natation). Thoracique (extension dorsale) — 5 min (position aéro). IT band + TFL — 3 min chaque côté (runner's knee prévention). Mollets + chevilles — 3 min chaque. Ischio-jambiers en traction excentrique (prévention claquage) — 2x10 Nordic hamstring curl. Respiration finale : 5 min Yoga Nidra ou NSDR.", zones: ["Z1"] },
      { part: "Cool-down", text: "2 min cohérence cardiaque. Journaliser : zones de tension, progrès de mobilité.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2x/semaine obligatoire — prévention blessures sur 10 mois",
      half: "1-2x/semaine",
      marathon: "Focus ischio-jambiers, mollets, hanches",
      semi: "1x/semaine"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 11 — NORDIC WALKING / TRAIL BÂTONS (3 séances)
// Réf: Killian Jornet, ITRA, Schena 2002
// ─────────────────────────────────────────────

  {
    id: "TRAIL_NORDIC_WALK_UPHILL",
    cat: "A",
    sport: "trail",
    defaultSportId: 52,
    objectif: "Marche nordique en montée — économie trail avec bâtons et technique VAM",
    necessite: "Recommandé",
    when: "Build/Peak — spécifique trail montagne. Apprentissage avant race avec bâtons.",
    phase: ["build", "peak"],
    avoid: "Course sans bâtons (non applicable) · Terrain plat (inefficace)",
    durationMin: [90, 180],
    metricKey: "allure",
    sportKey: "trail",
    tags: ["trail", "bâtons", "nordic walking", "montagne", "VAM", "économie"],
    structure: [
      { part: "Warm-up", text: "15 min marche active terrain plat. Échauffement épaules (circles, arm swings).", zones: ["Z1"] },
      { part: "Main", text: "Technique marche nordique en montée : planter bâton en avant-côté à 45°, pousser derrière jusqu'à extension complète du bras. Rythme : bâton droit avec pied gauche simultanément. Réduction FC de 8-10 bpm vs course même pente (transfert effort bras). 3-4h de dénivelé positif cumulé sur sorties terrain. Intégrer 'walk the uphills, run the downhills' — seuil > 25% pente → marche nordique systématique. Réf : Schena 2002 — bâtons réduisent le coût énergétique de 8-10% en montée.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "15 min marche terrain plat + étirements triceps et deltoïdes (sollicités par bâtons).", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Non applicable",
      half: "Non applicable",
      marathon: "Non applicable",
      semi: "Non applicable — trail uniquement"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 12 — BLOOD FLOW RESTRICTION (BFR) (3 séances)
// Réf: Loenneke 2012, Patterson 2019
// ─────────────────────────────────────────────

  {
    id: "BFR_LEGS_RECOVERY_STRENGTH",
    cat: "C",
    sport: "renforcement",
    defaultSportId: 20,
    objectif: "BFR (Blood Flow Restriction) membres inférieurs — hypertrophie et force sans charge élevée",
    necessite: "Optionnel",
    when: "Base/Build — alternative force quand blessure ou fatigue cumulative empêche charges lourdes",
    phase: ["base", "build"],
    avoid: "Thrombose · Varices sévères · Hypertension non contrôlée · Sans formation spécifique BFR",
    durationMin: [25, 35],
    metricKey: "fc",
    sportKey: "renforcement",
    tags: ["BFR", "blood flow restriction", "force", "hypertrophie", "récupération", "Loenneke"],
    structure: [
      { part: "Warm-up", text: "5 min vélo ergomètre très léger. Placer les manchettes BFR à 50-80% de la pression occlusif (cuisse ou mollet selon muscles ciblés).", zones: ["Z1"] },
      { part: "Main", text: "Protocole BFR quadriceps : Squat léger 30% 1RM : 30 reps + 15 reps + 15 reps + 15 reps (récup 30s entre séries, manchettes maintenues). Leg extension 30% 1RM : même protocole. Leg curl 30% 1RM : même protocole. Retirer manchettes entre exercices (2 min max avec manchettes). Réf : Loenneke 2012 — BFR 30% 1RM = même hypertrophie que 80% 1RM sans charge. Idéal athlète endurance en phase de développement ou blessure.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "Retirer manchettes. 5 min vélo léger + élévation des jambes 5 min (récupération circulatoire).", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Utile en récupération de blessure légère pour maintenir la masse musculaire",
      half: "Idem",
      marathon: "Maintien force membres inférieurs en période haute charge",
      semi: "Optionnel"
    }
  },

// FIN DES NOUVELLES SÉANCES
// Total : 55 nouvelles séances ajoutées
// Groupes :
// 1. Heat Training : 5 séances
// 2. FatMax & Train Low : 6 séances
// 3. Tapering : 5 séances
// 4. Open Water Swimming : 4 séances
// 5. Économie de course : 4 séances
// 6. Vélo Aéro : 3 séances
// 7. Respiratory Muscle Training : 2 séances
// 8. Contrast Training : 3 séances
// 9. Périodisation nutritionnelle : 2 séances
// 10. Récupération avancée : 3 séances
// 11. Nordic Walking Trail : 1 séance
// 12. Blood Flow Restriction : 1 séance

// =============================================
// BIBLIOTHÈQUE BILLAT — 24 séances scientifiques
// =============================================
  {
    id: "BILLAT_RUN_30_30_INTRO",
    cat: "B",
    sport: "course",
    objectif: "Introduction au 30/30 Billat — maximiser le temps à VO2max avec volume modéré",
    necessite: "Recommandé",
    when: "Build — début d'un bloc VO2max. Limiter à 2x/semaine maximum.",
    phase: ["build"],
    avoid: "VLamax > 0.65 (surcharge glycolytique) · Fatigue > 7/10 · Moins de 3 semaines d'entraînement régulier",
    durationMin: [45, 55],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Billat", "30/30", "VO2max", "vVO2max", "intervalles", "temps à VO2max"],
    structure: [
      { part: "Warm-up", text: "15 min progressif Z1→Z2 + 4x80m accélérations progressives + 2x30s à vVO2max (pour préparer le système neuromusculaire)", zones: ["Z1", "Z2"] },
      { part: "Main", text: "2 séries de 8×[30s à vVO2max (100-105% VMA) + 30s récup active Z1 (footing très lent)]. Récup entre séries : 4 min Z1. Total temps à VO2max : ~16 min. La récupération active (pas arrêt complet) est ESSENTIELLE — Billat 2000 : la récup active maintient la cinétique VO2 élevée. Arrêter si FC descend > 10% FCmax entre les répétitions (indique fatigue excessive).", zones: ["Z5", "Z6", "Z1"] },
      { part: "Cool-down", text: "10 min Z1 footing très lent + marche 5 min. Étirements doux.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "1x/14j uniquement si VO2max est limiteur identifié — pas en phase spécifique IM",
      half: "2x/semaine en build sur 3-4 semaines si VO2max plafonné",
      marathon: "Clé de voûte du bloc VO2max marathon — 2x/sem pendant 4 semaines",
      semi: "Priorité haute si VMA est limiteur — 2x/sem build"
    }
  },

  {
    id: "BILLAT_RUN_30_30_PRO",
    cat: "B",
    sport: "course",
    objectif: "30/30 Billat version avancée — volume maximal de temps à VO2max",
    necessite: "Recommandé",
    when: "Build/Peak — après 3-4 semaines de 30/30 intro. Athlètes bien entraînés (VMA > 16 km/h).",
    phase: ["build", "peak"],
    avoid: "Fatigue accumulée (CTL élevé + TSB négatif) · VLamax > 0.70 · Sans base 30/30 intro",
    durationMin: [55, 70],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Billat", "30/30", "VO2max", "avancé", "vVO2max", "élite"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 progressif + 3x30s à vVO2max R:90s (activation neuromusculaire et cinétique VO2)", zones: ["Z1", "Z2", "Z5"] },
      { part: "Main", text: "3 séries de 10×[30s à vVO2max + 30s récup active Z1]. Récup entre séries : 3 min Z1. Total : 30 répétitions = 15 min à vVO2max. Progression sur 3 semaines : S1 = 2×8 reps, S2 = 2×10 reps, S3 = 3×8 reps, S4 = 3×10 reps. Réf : Billat 2000 — temps à VO2max optimal = 10-20 min par séance. Au-delà = rendements décroissants et fatigue excessive.", zones: ["Z5", "Z6", "Z1"] },
      { part: "Cool-down", text: "12 min Z1 footing + 3 min marche", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Rare — seulement si diagnostic confirme VO2max comme limiteur principal",
      half: "Bloc 4 semaines en build mi-saison — très efficace",
      marathon: "3-4 semaines en build — améliore la vitesse de base pour tenir l'allure marathon",
      semi: "Bloc 4 semaines prioritaire — VO2max critique pour le semi"
    }
  },

  {
    id: "BILLAT_BIKE_30_30",
    cat: "B",
    sport: "cyclisme",
    objectif: "30/30 Billat adapté vélo — développement VO2max et puissance aérobie maximale",
    necessite: "Recommandé",
    when: "Build — bloc VO2max vélo. Home trainer recommandé pour précision des efforts.",
    phase: ["build"],
    avoid: "VLamax > 0.60 (risque de trop solliciter la filière glycolytique) · Fatigue musculaire haute",
    durationMin: [55, 70],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Billat", "30/30", "VO2max", "vélo", "puissance", "MAP"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 progressif + 3×20s à 120% FTP récup 2 min (activation)", zones: ["Z1", "Z2", "Z5"] },
      { part: "Main", text: "2-3 séries de 8-10×[30s à 120-130% FTP + 30s récup active 40-50% FTP]. Récup entre séries : 4 min Z1. Cadence 95-105 rpm sur les efforts. La transition rapide 30s→récup est essentielle : passer de 130% à 45% FTP en moins de 5 secondes. Réf : Billat 2001 adapté vélo — mêmes principes cinétique VO2 que course mais puissance plus facile à contrôler précisément.", zones: ["Z5", "Z6", "Z1"] },
      { part: "Cool-down", text: "15 min Z1 cadence libre + étirements quadriceps", zones: ["Z1"] }
    ],
    variants: {
      ironman: "1x/2 semaines si VO2max limiteur — pas la priorité principale IM",
      half: "2x/semaine sur 4 semaines en build",
      marathon: "Support secondaire",
      semi: "Support secondaire"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 2 — SÉANCES 60/60 (Billat 2001)
// Pour athlètes moins entraînés ou en début de bloc VO2max
// ─────────────────────────────────────────────

  {
    id: "BILLAT_RUN_60_60",
    cat: "B",
    sport: "course",
    objectif: "60/60 Billat — transition entre Z4 et travail VO2max pur (moins intense que 30/30)",
    necessite: "Recommandé",
    when: "Build — idéal pour athlètes dont VMA < 14 km/h ou qui débutent le travail VO2max",
    phase: ["build"],
    avoid: "Déjà à l'aise avec le 30/30 (passer directement au 30/30) · Fatigue élevée",
    durationMin: [50, 65],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Billat", "60/60", "VO2max", "intermédiaire", "vVO2max"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 + 3x60s à allure seuil (Z3-Z4) pour préparer progressivement", zones: ["Z1", "Z2", "Z3"] },
      { part: "Main", text: "2 séries de 6-8×[60s à 100-105% VMA + 60s récup active footing Z1]. Récup entre séries : 4 min Z1. Le 60/60 accumule moins de temps à VO2max que le 30/30 mais est plus accessible physiologiquement — la montée en VO2 est plus progressive sur 60s. Surveiller : si FC dépasse 97% FCmax sur la dernière répétition → réduire d'une répétition la semaine suivante.", zones: ["Z5", "Z1"] },
      { part: "Cool-down", text: "10 min Z1 + marche 5 min", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Rare — préférer 30/30 ou 3min/3min selon le niveau",
      half: "Bon point d'entrée avant de progresser vers le 30/30",
      marathon: "Phase d'entrée dans le bloc VO2max marathon",
      semi: "2-3 semaines avant de passer au 30/30"
    }
  },

  {
    id: "BILLAT_BIKE_60_60",
    cat: "B",
    sport: "cyclisme",
    objectif: "60/60 Billat vélo — développement VO2max progressif accessible",
    necessite: "Recommandé",
    when: "Build — introduction au travail VO2max vélo. Home trainer idéal.",
    phase: ["build"],
    avoid: "Fatigue élevée · Déjà entraîné au 30/30 (trop facile)",
    durationMin: [60, 75],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Billat", "60/60", "VO2max", "vélo", "intermédiaire"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 + 3×30s à 110% FTP récup 2 min", zones: ["Z1", "Z2"] },
      { part: "Main", text: "2 séries de 7×[60s à 115-120% FTP + 60s récup 50% FTP]. Récup entre séries : 4 min. Cadence haute 100-110 rpm sur les efforts pour maximiser le recrutement neuromusculaire sans fatigue musculaire excessive.", zones: ["Z5", "Z1"] },
      { part: "Cool-down", text: "15 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Blocs de 3 semaines si VO2max limiteur confirmé",
      half: "2x/semaine en build",
      marathon: "Support",
      semi: "Support"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 3 — SÉANCES 3min/3min (Billat 2000)
// Pour athlètes élites — stress VO2max plus long
// ─────────────────────────────────────────────

  {
    id: "BILLAT_RUN_3MIN_3MIN",
    cat: "B",
    sport: "course",
    objectif: "3min/3min Billat — accumulation de temps à VO2max avec efforts plus longs (élite)",
    necessite: "Recommandé",
    when: "Build/Peak — athlètes élites ou bien entraînés. VMA > 17 km/h recommandé.",
    phase: ["build", "peak"],
    avoid: "Athlètes débutants ou VMA < 15 km/h (trop intense) · VLamax > 0.65 · Fatigue > 6/10",
    durationMin: [55, 70],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Billat", "3min/3min", "VO2max", "élite", "vVO2max", "avancé"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 progressif + 3×1 min Z4 R:2 min + 2×30s à vVO2max R:90s", zones: ["Z1", "Z2", "Z4", "Z5"] },
      { part: "Main", text: "5-7×[3 min à 100-105% VMA + 3 min récup active Z1-Z2 (footing)]. La récupération DOIT être active (pas d'arrêt) — Billat 2000 : la récup active à 50-60% VMA maintient la cinétique VO2 et réduit le temps nécessaire pour atteindre VO2max à la répétition suivante. Observer : les 2 premières répétitions montent à VO2max, les suivantes y restent. Si allure chute > 5% : arrêter la série.", zones: ["Z5", "Z6", "Z1", "Z2"] },
      { part: "Cool-down", text: "12 min Z1 + 3 min marche + étirements", zones: ["Z1"] }
    ],
    variants: {
      ironman: "1x/2 semaines si VO2max diagnostic — période build uniquement",
      half: "Bloc de 4 semaines en build — très efficace niveau compétiteur",
      marathon: "Clé pour marathoniens visant sub-3h ou sub-2h30 — développe la vitesse de base",
      semi: "Priorité haute compétiteurs — 5-7 répétitions x 2/semaine"
    }
  },

  {
    id: "BILLAT_BIKE_3MIN_3MIN",
    cat: "B",
    sport: "cyclisme",
    objectif: "3min/3min Billat vélo — développement VO2max et puissance critique vélo",
    necessite: "Recommandé",
    when: "Build/Peak — athlètes compétiteurs. FTP > 250W recommandé.",
    phase: ["build", "peak"],
    avoid: "VLamax > 0.60 · Fatigue élevée · Saison de compétition dense",
    durationMin: [65, 80],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Billat", "3min/3min", "VO2max", "vélo", "élite", "puissance critique"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 + 3×1 min à 110% FTP récup 2 min + 2×30s à 130% FTP R:2 min", zones: ["Z1", "Z2", "Z5"] },
      { part: "Main", text: "5-6×[3 min à 110-120% FTP + 3 min récup 50-55% FTP]. Cadence libre sur les efforts (laisser le corps trouver sa cadence optimale à haute intensité — typiquement 80-95 rpm). Réf : Billat adapté vélo — même principe que course mais puissance plus contrôlable. Surveiller NP (Normalized Power) vs puissance affichée — écart > 10% indique fatigue neuromusculaire.", zones: ["Z5", "Z6", "Z1"] },
      { part: "Cool-down", text: "15 min Z1 cadence libre", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Bloc de 3 semaines en milieu de build si VO2max diagnostic",
      half: "Très efficace — 2x/semaine 4 semaines build",
      marathon: "Support secondaire",
      semi: "Support secondaire"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 4 — SÉANCES ALLURE MARATHON (Billat 2009)
// "La course au seuil de confort" — spécificité d'allure
// ─────────────────────────────────────────────

  {
    id: "BILLAT_RUN_MARATHON_PACE",
    cat: "B",
    sport: "course",
    objectif: "Allure marathon Billat — développer la spécificité métabolique exacte de la course (Billat 2009)",
    necessite: "Obligatoire",
    when: "Build/Peak — spécifique marathon. À partir de 12 semaines avant course.",
    phase: ["build", "peak"],
    avoid: "Trop tôt dans la saison (avant 8 semaines d'entraînement de base) · Fatigue > 6/10",
    durationMin: [75, 120],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Billat", "allure marathon", "spécificité", "économie", "seuil lactique"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 progressif + 4x80m strides", zones: ["Z1", "Z2"] },
      { part: "Main", text: "40-60-80 min à allure marathon cible (Z3 — ~75-82% VMA). Progression sur les semaines : S1 = 3×15 min à allure marathon R:3 min. S2 = 2×20 min R:4 min. S3 = 1×35 min continu. S4 = 1×45 min continu. Réf : Billat 2009 — l'allure marathon correspond exactement à l'intensité où l'oxydation des glucides et des lipides est optimale pour la durée de course. Courir systématiquement à cette allure créée une adaptation métabolique spécifique irremplaçable. Surveiller : allure exacte au GPS (±3s/km), FC stable (pas de dérive > 5 bpm sur 20 min).", zones: ["Z3"] },
      { part: "Cool-down", text: "10 min Z1 + marche 5 min", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Allure run IM (Z2-Z3 bas) pendant 45-60 min — similaire mais plus lent",
      half: "Allure semi-marathon : 1-2×15-20 min Z3-Z4",
      marathon: "PRIORITÉ ABSOLUE — clé du marathon. Volume principal de la phase race-specific.",
      semi: "Allure semi-marathon : Z3-Z4 — 2×15 min"
    }
  },

  {
    id: "BILLAT_RUN_SEMI_PACE",
    cat: "B",
    sport: "course",
    objectif: "Allure semi-marathon Billat — spécificité métabolique semi (seuil haut)",
    necessite: "Recommandé",
    when: "Build/Peak — spécifique semi-marathon. À partir de 8 semaines avant course.",
    phase: ["build", "peak"],
    avoid: "Fatigue élevée · Plus de 2x/semaine (risque surmenage)",
    durationMin: [60, 85],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Billat", "allure semi", "seuil", "spécificité", "Z4"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 + 4×80m strides", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Progression sur 4 semaines : S1 = 4×8 min à allure semi R:2 min. S2 = 3×10 min R:2 min. S3 = 2×15 min R:3 min. S4 = 1×25 min continu. Allure semi = Z4 (87-92% VMA). La particularité Billat : maintenir l'allure EXACTEMENT — ni trop lent (pas de stimulus), ni trop rapide (dette d'oxygène croissante). RPE cible : 7-8/10, capable de prononcer une phrase courte.", zones: ["Z4"] },
      { part: "Cool-down", text: "10 min Z1 + étirements", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Non prioritaire",
      half: "PRIORITÉ — cœur de la préparation semi",
      marathon: "Secondaire (vitesse de base pour marathon)",
      semi: "PRIORITÉ ABSOLUE — 2x/semaine en peak"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 5 — TEST TLIM@vVO2max (Billat 1996)
// "Le temps limite à vVO2max" — diagnostic fondamental
// ─────────────────────────────────────────────

  {
    id: "BILLAT_RUN_TLIM_TEST",
    cat: "C",
    sport: "course",
    objectif: "Test tlim@vVO2max Billat — mesurer le temps limite à la vitesse VO2max (diagnostic)",
    necessite: "Recommandé",
    when: "Base/Build — test diagnostique à réaliser avant un bloc VO2max pour personnaliser le volume.",
    phase: ["base", "build"],
    avoid: "Fatigue > 5/10 · Moins de 2 jours depuis dernière séance intense · Maladie",
    durationMin: [35, 50],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Billat", "tlim", "test", "VO2max", "vVO2max", "diagnostic", "piste"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 progressif + 2×2 min à 90% VMA R:2 min + 2×30s à vVO2max R:3 min (pour s'assurer que le système VO2 est activé)", zones: ["Z1", "Z2", "Z4", "Z5"] },
      { part: "Main", text: "Courir à vVO2max (100% VMA) le plus longtemps possible jusqu'à épuisement complet. Départ à l'allure exacte (chrono ou GPS). Méthode : départ 50m à allure légèrement plus rapide pour atteindre vVO2max, puis maintenir. Arrêter quand l'allure chute de >3% (impossible de maintenir). Mesurer : temps total à vVO2max. Interprétation (Billat 1996) : < 4 min = capacité VO2max très limitée (VLamax trop haute ou manque de développement aérobie). 4-6 min = niveau intermédiaire. 6-8 min = bon niveau. > 8 min = niveau élite. Ce tlim détermine le volume optimal de 30/30 : tlim 4 min → 2×6 reps ; tlim 6 min → 2×8 reps ; tlim 8 min → 3×8 reps.", zones: ["Z5", "Z6"] },
      { part: "Cool-down", text: "15 min Z1 très lent + marche jusqu'au retour FC repos", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Test important pour calibrer le bloc VO2max en période build",
      half: "À réaliser avant chaque bloc VO2max (toutes les 8 semaines)",
      marathon: "Clé pour optimiser le volume du bloc VO2max marathon",
      semi: "Priorité — tlim prédit directement la performance 10km/semi"
    }
  },

  {
    id: "BILLAT_BIKE_TLIM_TEST",
    cat: "C",
    sport: "cyclisme",
    objectif: "Test tlim@MAP Billat adapté vélo — temps limite à la puissance aérobie maximale",
    necessite: "Recommandé",
    when: "Base/Build — test diagnostique avant bloc VO2max vélo.",
    phase: ["base", "build"],
    avoid: "Fatigue · Sans capteur de puissance fiable",
    durationMin: [40, 55],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Billat", "tlim", "test", "VO2max", "MAP", "diagnostic", "vélo"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 + 3×1 min à 105% FTP R:3 min + 2×30s sprint modéré R:3 min", zones: ["Z1", "Z2", "Z4"] },
      { part: "Main", text: "Effort maximal à 110-115% FTP (MAP estimée) jusqu'à épuisement complet. Si MAP connue depuis test 5min : utiliser 100% MAP. Maintenir la cadence > 80 rpm. Arrêter quand cadence chute < 70 rpm ou puissance chute > 10%. Mesurer : temps total. Interprétation (adapté Billat 1996) : < 4 min = VO2max limiteur majeur. 4-6 min = limiteur modéré. 6-8 min = niveau compétiteur. > 8 min = niveau élite. Utiliser le tlim pour calibrer le volume des séances 30/30 vélo.", zones: ["Z5", "Z6"] },
      { part: "Cool-down", text: "15 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Test important — calibre le bloc VO2max build",
      half: "Toutes les 8 semaines",
      marathon: "Support",
      semi: "Support"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 6 — SÉANCES SEUIL LACTIQUE BILLAT (Billat 2004)
// "Critical velocity and maximal lactate steady state"
// ─────────────────────────────────────────────

  {
    id: "BILLAT_RUN_MLSS_LONG",
    cat: "B",
    sport: "course",
    objectif: "Vitesse MLSS Billat — entraînement long au seuil lactique maximal stable (Billat 2004)",
    necessite: "Obligatoire",
    when: "Build — 1x/semaine. Pilier de tout programme d'endurance.",
    phase: ["build"],
    avoid: "Semaine de décharge · Fatigue > 6/10 · Veille compétition",
    durationMin: [65, 90],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Billat", "MLSS", "seuil", "lactate", "endurance", "Z4"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 + 4×80m strides", zones: ["Z1", "Z2"] },
      { part: "Main", text: "30-45 min à vitesse MLSS (seuil lactique maximal stable — Z3-Z4, ~85-88% VMA, ~lactate 3-4 mmol/L). Réf : Billat 2004 — le MLSS est l'intensité maximale où la clairance du lactate égale sa production. C'est la zone d'entraînement avec le meilleur ratio stimulus/fatigue pour améliorer l'endurance. Observer : FC stable (± 3 bpm), sensation 'difficile mais soutenable', capable de prononcer des mots isolés. Progression : S1=20 min, S2=25 min, S3=30 min, S4=35 min, S5=40 min.", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "10 min Z1 + marche 5 min", zones: ["Z1"] }
    ],
    variants: {
      ironman: "30 min à allure MLSS run — fondamental pour le marathon IM",
      half: "35-40 min à allure MLSS",
      marathon: "CLEF — 40-45 min. Améliore directement l'allure marathon",
      semi: "30-35 min à allure MLSS"
    }
  },

  {
    id: "BILLAT_BIKE_MLSS",
    cat: "B",
    sport: "cyclisme",
    objectif: "MLSS Billat vélo — seuil lactique maximal stable (88-93% FTP)",
    necessite: "Obligatoire",
    when: "Build — 1x/semaine. Base du développement aérobie spécifique vélo.",
    phase: ["build"],
    avoid: "Fatigue élevée · Semaine de décharge",
    durationMin: [70, 100],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Billat", "MLSS", "seuil", "vélo", "FTP", "Z4"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 progressif", zones: ["Z1", "Z2"] },
      { part: "Main", text: "2-3×15-20 min à 88-93% FTP (MLSS vélo). Récup 5 min Z1 entre les blocs. Cadence 85-95 rpm. Observer : FC stable en plateau (pas de dérive), sensation steady-state. Progression sur 4 semaines : 2×15 → 2×20 → 3×15 → 3×20 → 1×45 min continu. Réf : Billat 2004 adapté vélo — le MLSS correspond à environ 88-93% FTP pour la plupart des athlètes.", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "15 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2×20 min à 88-90% FTP — spécifique allure vélo IM",
      half: "3×15 min à 90-93% FTP",
      marathon: "Support secondaire",
      semi: "Support secondaire"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 7 — SÉANCES VITESSE CRITIQUE (Billat & Koralsztein 1996)
// "Critical velocity" — entre seuil et vVO2max
// ─────────────────────────────────────────────

  {
    id: "BILLAT_RUN_CRITICAL_VELOCITY",
    cat: "B",
    sport: "course",
    objectif: "Vitesse critique Billat — zone entre MLSS et vVO2max (90-95% VMA, W' development)",
    necessite: "Recommandé",
    when: "Build/Peak — athlètes intermédiaires à avancés. Entre les blocs MLSS et VO2max.",
    phase: ["build", "peak"],
    avoid: "VLamax > 0.65 (accumulation lactate trop rapide) · Fatigue > 6/10",
    durationMin: [60, 75],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Billat", "vitesse critique", "W prime", "Z4b", "Z5", "intermédiaire"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 + 4×80m strides + 2×1 min Z4 R:2 min", zones: ["Z1", "Z2", "Z4"] },
      { part: "Main", text: "4-6×[5-8 min à 90-95% VMA + 3 min récup Z1]. Réf : Billat & Koralsztein 1996 — la vitesse critique (Critical Velocity) est l'allure théoriquement tenable indéfiniment = asymptote de la relation puissance-durée. En pratique = allure 20-40 min race. Cette zone développe la tolérance à l'acidose et le W' (énergie anaérobie disponible). Observer : la FC doit être en plateau sur la fin de chaque répétition, pas encore en dérive. Si FC monte encore sur les 2 dernières minutes d'une répétition → allure trop rapide.", zones: ["Z4b", "Z5"] },
      { part: "Cool-down", text: "12 min Z1 + étirements", zones: ["Z1"] }
    ],
    variants: {
      ironman: "3×5 min à 90% VMA — utile pour améliorer le plafond aérobie",
      half: "5×6 min à 92-95% VMA — transition MLSS→VO2max",
      marathon: "4×8 min à 90-92% VMA",
      semi: "5-6×5 min à 93-95% VMA"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 8 — SÉANCES LONGUES À VO2max (Billat 2001)
// "Prolonged intervals" — adaptations centrales profondes
// ─────────────────────────────────────────────

  {
    id: "BILLAT_RUN_VO2MAX_LONG_5MIN",
    cat: "B",
    sport: "course",
    objectif: "Intervalles longs VO2max Billat — 5×5min à vVO2max (adaptations centrales cardiaques)",
    necessite: "Recommandé",
    when: "Build/Peak — athlètes avancés. Complément du 30/30 pour les adaptations centrales profondes.",
    phase: ["build", "peak"],
    avoid: "Débutants · VLamax > 0.65 · Fatigue élevée",
    durationMin: [60, 75],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Billat", "VO2max", "5min", "intervalles longs", "VFC", "volume stroke"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 + 3×1 min Z4 R:2 min + 2×30s à vVO2max R:3 min", zones: ["Z1", "Z2", "Z4", "Z5"] },
      { part: "Main", text: "5×[5 min à 100-105% VMA + 3-4 min récup active Z1-Z2]. Réf : Billat 2001 — les intervalles de 4-6 min à vVO2max induisent les plus grandes adaptations du volume d'éjection systolique (VES) et du débit cardiaque max. Le 30/30 est plus efficace pour le temps à VO2max mais le 5×5min crée des adaptations cardiaques structurelles plus profondes (hypertrophie cardiaque fonctionnelle). Progression : S1=4×4min, S2=4×5min, S3=5×4min, S4=5×5min.", zones: ["Z5", "Z6", "Z1", "Z2"] },
      { part: "Cool-down", text: "12 min Z1 + marche 5 min", zones: ["Z1"] }
    ],
    variants: {
      ironman: "4×5 min R:4 min — stimulation cardiaque maximale sans surcharge",
      half: "5×5 min R:3 min — très efficace",
      marathon: "Bloc de 3 semaines en build — améliore le débit cardiaque max",
      semi: "5×4 min R:3 min — excellent pour améliorer la VMA plafond"
    }
  },

  {
    id: "BILLAT_BIKE_VO2MAX_4MIN",
    cat: "B",
    sport: "cyclisme",
    objectif: "4×4min VO2max Billat-Norvégien — combinaison Billat/Seiler pour adaptations centrales maximales",
    necessite: "Recommandé",
    when: "Build/Peak — standard international du travail VO2max vélo.",
    phase: ["build", "peak"],
    avoid: "VLamax > 0.60 · Fatigue élevée · Semaine de compétition",
    durationMin: [60, 80],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Billat", "Seiler", "VO2max", "4min", "vélo", "Norwegian", "adaptations centrales"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 + 3×2 min à 100% FTP R:2 min + 2×30s sprint R:3 min", zones: ["Z1", "Z2", "Z4", "Z5"] },
      { part: "Main", text: "4-5×[4 min à 106-110% FTP + 3-4 min récup 50% FTP]. Cadence 90-100 rpm. La puissance cible : chaque répétition doit être à FC ≥ 93% FCmax sur la dernière minute — c'est le marqueur que VO2max est atteint. Réf croisée : Billat 2001 (temps à VO2max) + Seiler 2010 (4×4min comme standard or norvégien) — cette combinaison est le protocole le plus étudié pour améliorer VO2max en cyclisme. FC pic à ≥95% FCmax sur au moins 3 des 4 répétitions = séance réussie.", zones: ["Z5", "Z6", "Z1"] },
      { part: "Cool-down", text: "15 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "4×4 min 1-2x/2 semaines si VO2max limiteur identifié",
      half: "5×4 min 2x/semaine en build sur 4 semaines",
      marathon: "Support secondaire",
      semi: "Support secondaire"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 9 — SÉANCES FARTLEK BILLAT (Billat 2001)
// "Natural interval training" — en terrain naturel
// ─────────────────────────────────────────────

  {
    id: "BILLAT_RUN_FARTLEK_VO2",
    cat: "B",
    sport: "course",
    objectif: "Fartlek Billat — intervalles libres en terrain naturel autour de vVO2max",
    necessite: "Recommandé",
    when: "Build — alternative au 30/30 en terrain naturel. Moins précis mais plus motivant.",
    phase: ["build"],
    avoid: "Terrain accidenté dangereux · Athlètes qui ont besoin de précision d'allure stricte",
    durationMin: [55, 70],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Billat", "fartlek", "VO2max", "terrain naturel", "variété", "plaisir"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 terrain varié", zones: ["Z1", "Z2"] },
      { part: "Main", text: "30-40 min de Fartlek Billat : alternance libre de 30-90s à vVO2max (ressenti très difficile, souffle court) + 1-2 min récup active au feeling. Pas de chrono strict — utiliser le ressenti et le terrain (accélérer dans les montées légères, récupérer dans les descentes ou le plat). Volume à VO2max cible : 12-18 min au total. Réf : Billat 2001 — le Fartlek naturel produit des adaptations similaires au 30/30 structuré avec un plus grand plaisir à l'entraînement et une meilleure compliance à long terme.", zones: ["Z4", "Z5", "Z6", "Z1", "Z2"] },
      { part: "Cool-down", text: "10 min Z1 + marche 5 min", zones: ["Z1"] }
    ],
    variants: {
      ironman: "1x/2 semaines en build — maintien de la fraîcheur mentale",
      half: "Peut remplacer 1 séance 30/30 par mois",
      marathon: "Variation bienvenue dans le bloc VO2max",
      semi: "Variation bienvenue"
    }
  },

  {
    id: "BILLAT_TRAIL_FARTLEK_HILL",
    cat: "B",
    sport: "trail",
    objectif: "Fartlek collines Billat — intervalles naturels en côte pour trail (stimulation VO2max + force)",
    necessite: "Recommandé",
    when: "Build — spécifique trail. Terrain vallonné avec côtes de 200-400m de montée.",
    phase: ["build"],
    avoid: "Terrain glissant · Fatigue > 6/10 · Sans expérience trail",
    durationMin: [60, 90],
    metricKey: "allure",
    sportKey: "trail",
    defaultSportId: 52,
    tags: ["Billat", "fartlek", "trail", "collines", "VO2max", "force", "spécifique"],
    structure: [
      { part: "Warm-up", text: "15 min trot terrain plat + mobilité hanches et chevilles", zones: ["Z1", "Z2"] },
      { part: "Main", text: "40-60 min Fartlek trail : accélérations en côte (30-90s à RPE 8-9/10 selon longueur de côte) + récup footing Z1 en descente et plat. La côte force naturellement la VO2max sans avoir à surveiller l'allure. Volume en côte : 15-20 min cumulés. Réf : Billat 2001 (fartlek naturel) + Minetti 2002 (efficience montée) — les côtes à haute intensité sont le moyen le plus naturel d'atteindre VO2max en trail tout en développant la force spécifique montée.", zones: ["Z4", "Z5", "Z6", "Z1", "Z2"] },
      { part: "Cool-down", text: "15 min trot terrain plat + étirements mollets et quadriceps", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Non applicable",
      half: "Non applicable",
      marathon: "Non applicable",
      semi: "Non applicable — trail uniquement"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 10 — SÉANCES RÉCUPÉRATION/ÉCONOMIE (Billat 2003)
// "Training and bioenergetic characteristics in elite runners"
// ─────────────────────────────────────────────

  {
    id: "BILLAT_RUN_ECONOMY_STRIDES",
    cat: "A",
    sport: "course",
    objectif: "Économie de course Billat — strides spécifiques pour améliorer le coût énergétique (Billat 2003)",
    necessite: "Recommandé",
    when: "Toute l'année — fin de séance Z2 ou séance courte dédiée. 2-3x/semaine.",
    phase: ["base", "build", "peak"],
    avoid: "Blessure en cours · Fatigue musculaire > 6/10",
    durationMin: [40, 50],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Billat", "économie", "strides", "technique", "coût énergétique", "fréquence"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 relâché", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Protocole économie Billat (Billat 2003 — 'The Best Runners are Those Who Produce Less Lactate') : 10×100m strides progressifs avec focus sur : 1. Fréquence de foulée haute (175-185 spm) — compter ses pas pendant 30s. 2. Appui sous le centre de gravité (éviter heel strike). 3. Bras à 90° relâchés. 4. Expiration active à chaque foulée (synchronisation respiratoire). Récup : marche 60-90s entre chaque stride. Puis 4×200m à 95% VMA avec même focus technique. Réf : Billat 2003 — les coureurs élites ont une économie 15-20% meilleure grâce à une fréquence élevée et un meilleur transfert d'énergie élastique.", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "10 min Z1 + marche 5 min", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2x/semaine en base — améliore économie run IM",
      half: "2x/semaine toute l'année",
      marathon: "PRIORITÉ — économie = 2-4 min sur marathon. 3x/semaine en build",
      semi: "2x/semaine en build et peak"
    }
  },

  {
    id: "BILLAT_RUN_PROGRESSIVE_TEMPO",
    cat: "B",
    sport: "course",
    objectif: "Tempo progressif Billat — montée en intensité de Z2 à allure course en continu (Billat 2009)",
    necessite: "Recommandé",
    when: "Build — séance clé pour développer la capacité à accélérer en course et la gestion des allures.",
    phase: ["build"],
    avoid: "Fatigue élevée · Terrain trop vallonné (biaiser l'allure)",
    durationMin: [60, 80],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Billat", "progressif", "tempo", "gestion allure", "negative split"],
    structure: [
      { part: "Warm-up", text: "10 min Z1 très lent", zones: ["Z1"] },
      { part: "Main", text: "45-60 min progressifs : 15 min Z2 (allure facile, conversation possible). 15 min Z3 (allure confortable mais soutenue, phrases courtes). 10 min Z4 (allure seuil, mots isolés). 5 min allure course cible (Z4-Z5 selon distance). Les 5 dernières minutes à allure race ou légèrement plus vite. Réf : Billat 2009 — le tempo progressif simule la distribution d'effort en course et développe la capacité à 'monter en régime' de façon contrôlée. Clé du negative split en compétition.", zones: ["Z2", "Z3", "Z4", "Z5"] },
      { part: "Cool-down", text: "10 min Z1 + marche", zones: ["Z1"] }
    ],
    variants: {
      ironman: "30 min progressifs Z2→Z3→Z4 (allure run IM)",
      half: "45 min progressifs jusqu'à allure semi",
      marathon: "60 min progressifs jusqu'à allure marathon — simulation de course",
      semi: "45 min progressifs jusqu'à allure semi-marathon"
    }
  },

  {
    id: "BILLAT_RUN_LACTATE_TOLERANCE",
    cat: "B",
    sport: "course",
    objectif: "Tolérance lactate Billat — intervalles au-dessus de vVO2max pour la capacité tampon (Billat 2000)",
    necessite: "Recommandé",
    when: "Build/Peak — athlètes 5km/10km ou triathlètes avec VLamax basse. Améliore la tolérance à l'acidose.",
    phase: ["build", "peak"],
    avoid: "VLamax > 0.60 (déjà très glycolytique) · Fatigue élevée · Ironman > 8 semaines avant course",
    durationMin: [50, 65],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Billat", "lactate", "tolérance", "acidose", "capacité tampon", "Z5", "Z6"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 + 4×30s à vVO2max R:2 min", zones: ["Z1", "Z2", "Z5"] },
      { part: "Main", text: "6-8×[2 min à 110-115% VMA + 3 min récup complète]. Réf : Billat 2000 — au-dessus de vVO2max, la production de lactate dépasse la clairance → stimule les enzymes tampon et la tolérance à l'acidose. Différent du 30/30 : ici l'objectif n'est PAS de maximiser le temps à VO2max mais d'exposer les muscles à l'acidose et de développer les systèmes tampons. Observer : jambes qui brûlent sur les 40 dernières secondes de chaque répétition = signe positif. RPE 9-10/10 en fin de répétition.", zones: ["Z5", "Z6"] },
      { part: "Cool-down", text: "15 min Z1 lent — la récupération active accélère l'élimination du lactate", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Non recommandé — trop glycolytique pour IM",
      half: "3-4 semaines en peak si VLamax basse — pour 'piquer'",
      marathon: "Non recommandé pour marathon (profil trop glycolytique)",
      semi: "Utile pour semi-marathon si capacité à tenir allure élevée"
    }
  },

  {
    id: "BILLAT_RUN_Z2_LONG_BILLAT",
    cat: "A",
    sport: "course",
    objectif: "Sortie longue Z2 Billat — endurance fondamentale avec surges intégrés (Billat 2003)",
    necessite: "Obligatoire",
    when: "Base/Build — remplacer la sortie longue classique. 1x/semaine.",
    phase: ["base", "build"],
    avoid: "Fatigue élevée · Temps de récupération < 48h depuis dernière séance intense",
    durationMin: [90, 150],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Billat", "sortie longue", "Z2", "surges", "endurance fondamentale", "variété"],
    structure: [
      { part: "Warm-up", text: "10 min Z1 progressif", zones: ["Z1"] },
      { part: "Main", text: "70-110 min Z2 confortable avec surges Billat intégrés : toutes les 15-20 min, insérer 4-6×[20s à allure VMA + 40s récup Z2 en continuant à courir]. Ces micro-surges (Billat 2003) maintiennent le tonus neuromusculaire pendant la sortie longue sans créer de fatigue significative. Allure Z2 principale : 60-72% VMA. Les surges : 100% VMA pendant 20s. Terminer les 15 dernières minutes en légère progression (Z2 haut). Réf : Billat 2003 — les élites kényans et éthiopiens intègrent naturellement des accélérations dans leurs sorties longues.", zones: ["Z2", "Z5"] },
      { part: "Cool-down", text: "10 min marche + étirements", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2h-3h Z2 avec surges toutes les 25 min (4×20s à vVO2max)",
      half: "1h30-2h Z2 avec surges toutes les 20 min",
      marathon: "2h-2h30 Z2 avec surges — pilier de la préparation marathon Billat",
      semi: "1h30-1h45 Z2 avec surges"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 11 — SÉANCES NATATION BILLAT-ADAPTÉ
// Principes Billat adaptés à la natation
// ─────────────────────────────────────────────

  {
    id: "BILLAT_SWIM_30_30",
    cat: "B",
    sport: "natation",
    objectif: "30/30 Billat adapté natation — maximiser le temps à VO2max en piscine",
    necessite: "Recommandé",
    when: "Build — bloc VO2max natation. Piscine 25m ou 50m.",
    phase: ["build"],
    avoid: "Technique insuffisante (fatigue technique compromet l'intensité) · Fatigue élevée",
    durationMin: [50, 65],
    metricKey: "allure",
    sportKey: "natation",
    defaultSportId: 19,
    tags: ["Billat", "30/30", "VO2max", "natation", "vVO2max", "CSS"],
    structure: [
      { part: "Warm-up", text: "400m progressif + 8×25m éducatifs R:15s + 4×50m à allure CSS R:20s", zones: ["Z1", "Z2", "Z3"] },
      { part: "Main", text: "Adaptation 30/30 natation : 3 séries de 8×[25m sprint maximal (vVO2max nage) + 25m nage lente récup (Z1)]. En bassin 25m : le 25m sprint correspond au 30s course, les 25m retour lent = récup. Récup entre séries : 3 min. L'objectif est la même cinétique VO2 que le 30/30 course. Allure sprint : 5-8% plus rapide que CSS. Observer : la qualité technique ne doit pas s'effondrer sur les dernières répétitions — si le catch se perd, arrêter. Réf : Billat 2001 adapté natation.", zones: ["Z5", "Z6", "Z1"] },
      { part: "Cool-down", text: "200m dos facile + 200m crawl très lent", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2 séries de 8 répétitions — stimulation VO2max nage",
      half: "3 séries de 8 répétitions",
      marathon: "Non applicable",
      semi: "Non applicable"
    }
  },

  {
    id: "BILLAT_SWIM_CSS_BILLAT",
    cat: "B",
    sport: "natation",
    objectif: "CSS Billat — allure critique nage avec surges intégrés (principe tempo progressif natation)",
    necessite: "Recommandé",
    when: "Build/Peak — améliore la capacité à tenir l'allure CSS en compétition.",
    phase: ["build", "peak"],
    avoid: "Technique en cours d'apprentissage · Fatigue élevée",
    durationMin: [55, 70],
    metricKey: "allure",
    sportKey: "natation",
    defaultSportId: 19,
    tags: ["Billat", "CSS", "natation", "allure critique", "endurance spécifique"],
    structure: [
      { part: "Warm-up", text: "400m progressif + 4×100m progressifs jusqu'à CSS R:20s", zones: ["Z1", "Z2", "Z3"] },
      { part: "Main", text: "Protocole Billat-CSS : 6×200m à allure CSS exacte (chrono précis) R:30s. Puis 4×[50m sprint 105% CSS + 150m retour à CSS]. Ces transitions rapide→retour à CSS simulent la gestion d'un départ de masse ou d'une accélération sur bouée. Réf : Billat 2009 (progressif) adapté natation — tenir l'allure critique après une accélération = clé de la performance triathlon natation.", zones: ["Z3", "Z4", "Z5"] },
      { part: "Cool-down", text: "300m dos/brasse lent", zones: ["Z1"] }
    ],
    variants: {
      ironman: "4×200m CSS + 4×[50m sprint + 150m CSS]",
      half: "6×200m CSS + 4×[50m sprint + 150m CSS]",
      marathon: "Non applicable",
      semi: "4×150m CSS + 3×[50m sprint + 100m CSS]"
    }
  },

// =============================================
// BIBLIOTHÈQUE NORVÉGIENNE — DOUBLE THRESHOLD
// 12 séances scientifiques (Bakken, Ingebrigtsen, Seiler)
// =============================================

{
    id: "NORWEGIAN_RUN_THRESHOLD_LOW_AM",
    cat: "B",
    sport: "course",
    objectif: "Seuil bas norvégien (matin) — accumulation volume au seuil aérobie contrôlé (2.0-2.5 mmol/L)",
    necessite: "Recommandé",
    when: "Build — matin du 'double threshold day'. À coupler avec NORWEGIAN_RUN_THRESHOLD_HIGH_PM le soir. 2x/semaine max.",
    phase: ["build"],
    avoid: "Sans lactatémètre ou FC seuil non calibrée · Fatigue > 6/10 · Lendemain de séance intense · Semaine de décharge",
    durationMin: [55, 75],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Norwegian", "double threshold", "seuil bas", "LT1", "lactatémètre", "Ingebrigtsen", "Bakken", "TTE"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 très progressif. Footing relâché, FC < 70% FCmax. 4×80m strides légers. Idéalement mesurer lactate après échauffement (cible : 1.0-1.5 mmol/L = bien récupéré).", zones: ["Z1", "Z2"] },
      { part: "Main", text: "5-6×6 min à seuil bas (LT1) avec récup active 1 min Z1 entre chaque. Cibles d'intensité (choisir selon disponibilité) : Avec lactatémètre : 2.0-2.5 mmol/L. Sans lactatémètre FC : 82-86% FCmax. Sans lactatémètre allure : ~88-90% VMA. RPE : 6-7/10 — 'difficile mais parlable (phrases courtes)'. RÈGLE CRITIQUE NORVÉGIENNE : si lactate dépasse 2.8 mmol/L ou FC dépasse 88% FCmax sur une répétition → RÉDUIRE immédiatement l'allure de 5-8s/km. L'erreur classique : aller trop vite et transformer ce travail en séance Z4 — perd tout l'intérêt de la méthode. Progression : S1=4×6min, S2=5×6min, S3=5×7min, S4=6×6min, S5=4×8min.", zones: ["Z3"] },
      { part: "Cool-down", text: "10 min Z1 footing lent. Si lactatémètre disponible : mesurer lactate 3 min après dernière répétition (cible : retour < 2.0 mmol/L). Manger dans l'heure suivante (glucides + protéines) pour préparer la séance du soir.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "4×8 min à 83-85% FCmax — base du TTE triathlon longue distance",
      half: "5×6 min à 84-86% FCmax — développement du seuil spécifique 70.3",
      marathon: "6×6 min à 86-88% FCmax — pilier de la préparation marathon norvégienne",
      semi: "5×6 min à 86-88% FCmax — clé du développement TTE semi-marathon"
    }
  },

{
    id: "NORWEGIAN_RUN_THRESHOLD_LOW_VOLUME",
    cat: "B",
    sport: "course",
    objectif: "Seuil bas norvégien volume — séance unique longue au seuil aérobie (sans double threshold)",
    necessite: "Recommandé",
    when: "Build — séance standalone quand le double threshold n'est pas possible. 1-2x/semaine.",
    phase: ["base", "build"],
    avoid: "Sans au minimum 48h depuis dernière séance intense · Semaine de décharge",
    durationMin: [60, 80],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Norwegian", "seuil bas", "LT1", "volume", "TTE", "Tjelta"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 progressif", zones: ["Z1", "Z2"] },
      { part: "Main", text: "25-35 min continu à seuil bas (LT1) : 82-86% FCmax, RPE 6-7/10. Alternative intervalles avec récups très courtes : 3-4×8-10 min R:90s Z1. Réf : Tjelta 2019 — les meilleurs coureurs norvégiens accumulent 60-80 min/semaine au seuil bas en phase build. C'est le volume total qui crée l'adaptation, pas l'intensité de chaque répétition. Observer : FC stable (plateau) sur les 3 dernières minutes de chaque bloc = bonne intensité.", zones: ["Z3"] },
      { part: "Cool-down", text: "10 min Z1 + marche 5 min", zones: ["Z1"] }
    ],
    variants: {
      ironman: "30 min continu à seuil bas — base de l'endurance IM",
      half: "25 min continu ou 3×8 min R:90s",
      marathon: "35 min continu à seuil bas — fondamental Tjelta",
      semi: "25-30 min à seuil bas"
    }
  },

{
    id: "NORWEGIAN_RUN_THRESHOLD_HIGH_PM",
    cat: "B",
    sport: "course",
    objectif: "Seuil haut norvégien (soir) — accumulation volume au seuil lactique (3.0-4.0 mmol/L)",
    necessite: "Recommandé",
    when: "Build — soir du 'double threshold day'. À coupler avec NORWEGIAN_RUN_THRESHOLD_LOW_AM le matin. 2x/semaine max.",
    phase: ["build"],
    avoid: "Sans avoir fait la séance matin (ou au moins 4h de récup) · Fatigue excessive après séance matin · FC repos +5 bpm vs normale",
    durationMin: [60, 80],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Norwegian", "double threshold", "seuil haut", "LT2", "MLSS", "soir", "Ingebrigtsen"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2. Les jambes seront un peu lourdes après la séance matin — normal. Si lactate de départ > 2.0 mmol/L après l'échauffement : réduire l'intensité de la séance principale de 5-8s/km.", zones: ["Z1", "Z2"] },
      { part: "Main", text: "8-12×1000m à seuil haut (LT2/MLSS) avec récup 1 min Z1 entre chaque. Cibles : Avec lactatémètre : 3.0-4.0 mmol/L. Sans lactatémètre FC : 87-91% FCmax. Sans lactatémètre allure : ~92-95% VMA. RPE : 7-8/10 — 'dur mais soutenable, capable de prononcer un mot isolé'. LOGIQUE DU DOUBLE THRESHOLD : la séance matin a 'pré-fatigué' le système aérobie — le soir, même à intensité plus élevée, l'accumulation de lactate reste contrôlée car les fibres lentes sont déjà mobilisées. Réf : Mykleby & Seiler 2022. Arrêter si : allure chute > 5s/km vs première répétition OU lactate > 4.5 mmol/L.", zones: ["Z4"] },
      { part: "Cool-down", text: "12 min Z1 + marche 5 min. Repas riche en glucides et protéines dans l'heure. Sommeil prioritaire (adaptation maximum pendant la nuit après double threshold).", zones: ["Z1"] }
    ],
    variants: {
      ironman: "6×1000m à 87-89% FCmax — volume seuil haut sans excès",
      half: "8×1000m à 88-90% FCmax",
      marathon: "10×1000m à 90-92% FCmax — similaire entraînement élite marathon norvégien",
      semi: "10-12×1000m à 91-93% FCmax"
    }
  },

{
    id: "NORWEGIAN_RUN_THRESHOLD_HIGH_5MIN",
    cat: "B",
    sport: "course",
    objectif: "Seuil haut norvégien 5min — variante intervalles plus longs pour développer le TTE",
    necessite: "Recommandé",
    when: "Build — alternative au 1000m répétés. Meilleur pour développer le TTE (durabilité au seuil).",
    phase: ["build"],
    avoid: "Fatigue élevée · Moins de 4h depuis séance matin · Sans bonne maîtrise du rythme",
    durationMin: [60, 80],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Norwegian", "seuil haut", "5min", "TTE", "durabilité", "Bakken"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 + 3×1 min à allure seuil R:2 min", zones: ["Z1", "Z2", "Z3"] },
      { part: "Main", text: "5-7×5 min à seuil haut (90-93% FCmax) R:1 min Z1. Réf : Bakken 2019 — les répétitions de 5 min au seuil haut développent mieux le TTE que les 1000m car l'athlète passe plus de temps dans la zone de stimulus sans dépasser le seuil. Les 1 min de récup sont volontairement courtes — l'objectif est de maintenir le lactate dans la zone 3-4 mmol/L pendant toute la séance, pas de récupérer complètement entre les répétitions.", zones: ["Z4"] },
      { part: "Cool-down", text: "12 min Z1 + marche", zones: ["Z1"] }
    ],
    variants: {
      ironman: "5×5 min à 88-90% FCmax",
      half: "6×5 min à 90-92% FCmax",
      marathon: "7×5 min à 90-92% FCmax",
      semi: "7×5 min à 91-93% FCmax"
    }
  },

{
    id: "NORWEGIAN_RUN_DOUBLE_THRESHOLD_DAY",
    cat: "C",
    sport: "course",
    objectif: "Journée Double Threshold norvégienne complète — matin seuil bas + soir seuil haut",
    necessite: "Recommandé",
    when: "Build — 2x/semaine (ex: mardi et jeudi). Réservé athlètes avec volume ≥ 8h/semaine.",
    phase: ["build"],
    avoid: "Athlètes < 6h/semaine · Sans récupération suffisante (48h depuis dernière séance intense) · Compétition dans les 5 jours",
    durationMin: [110, 150],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Norwegian", "double threshold", "journée complète", "matin", "soir", "Ingebrigtsen", "Bakken"],
    structure: [
      { part: "Warm-up", text: "MATIN (6h-8h) : 15 min Z1→Z2 + 4×80m strides légers. Mesurer lactate si disponible (cible < 1.5 mmol/L au départ).", zones: ["Z1", "Z2"] },
      { part: "Main", text: "MATIN : 5×6 min à seuil bas (82-86% FCmax, ~2.0-2.5 mmol/L) R:1 min Z1. Durée ~55 min total. Repas post-séance matin : 60g glucides + 25g protéines dans les 30 min. Repos complet 4-5h (sommeil si possible). SOIR (16h-18h) : Ré-échauffement 12 min Z1. 8-10×1000m à seuil haut (88-92% FCmax, ~3.0-4.0 mmol/L) R:1 min Z1. Durée ~70 min total. Réf : Stenqvist 2021 — le double threshold day accumule 25-35 min au seuil en une journée vs 15-20 min pour une séance unique. Adaptation plus rapide du TTE sur 4-6 semaines.", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "SOIR : 12 min Z1 + marche 5 min. Dîner : glucides 80g + protéines 30g. Sommeil 9h minimum (adaptation maximale).", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Matin : 4×6 min seuil bas. Soir : 6×1000m seuil haut. Volume adapté triathlon.",
      half: "Matin : 5×6 min seuil bas. Soir : 8×1000m seuil haut.",
      marathon: "Matin : 5×6 min seuil bas. Soir : 10×1000m seuil haut. Standard élite norvégien.",
      semi: "Matin : 5×6 min seuil bas. Soir : 10-12×1000m seuil haut."
    }
  },

{
    id: "NORWEGIAN_BIKE_THRESHOLD_LOW",
    cat: "B",
    sport: "cyclisme",
    objectif: "Seuil bas norvégien vélo — accumulation volume au seuil aérobie vélo (75-82% FTP)",
    necessite: "Recommandé",
    when: "Build — séance standalone ou matin du double threshold triathlon. 2x/semaine.",
    phase: ["build"],
    avoid: "Fatigue élevée · Séance < 48h après effort intense",
    durationMin: [70, 90],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Norwegian", "seuil bas", "vélo", "LT1", "TTE", "triathlon", "Bakken"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 progressif. Cadence 85-90 rpm.", zones: ["Z1", "Z2"] },
      { part: "Main", text: "4-5×8 min à 75-82% FTP (seuil bas vélo ≈ LT1) R:90s Z1. Cadence 88-95 rpm. Cible FC : 80-85% FCmax. RPE 6-7/10. La spécificité vélo de la méthode norvégienne : le vélo permet de contrôler précisément la puissance (lactatémètre moins indispensable qu'en course). Progression : S1=3×8min, S2=4×8min, S3=4×10min, S4=5×8min, S5=3×15min, S6=2×20min continu. Réf : Bakken 2019 adapté vélo — même principe cinétique lactique que la course.", zones: ["Z3"] },
      { part: "Cool-down", text: "15 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "4×10 min à 78-82% FTP — TTE spécifique IM",
      half: "4×8 min à 80-84% FTP",
      marathon: "Non prioritaire (focus course)",
      semi: "3×8 min à 80-84% FTP — support développement aérobie"
    }
  },

{
    id: "NORWEGIAN_BIKE_THRESHOLD_HIGH",
    cat: "B",
    sport: "cyclisme",
    objectif: "Seuil haut norvégien vélo — intervalles au seuil lactique vélo (85-92% FTP)",
    necessite: "Recommandé",
    when: "Build — séance standalone ou soir du double threshold triathlon.",
    phase: ["build"],
    avoid: "Sans capteur de puissance · Fatigue élevée · VLamax > 0.60 (risque acidose rapide)",
    durationMin: [65, 85],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Norwegian", "seuil haut", "vélo", "LT2", "FTP", "triathlon"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 + 3×1 min à 95% FTP R:2 min", zones: ["Z1", "Z2", "Z4"] },
      { part: "Main", text: "6-8×4-5 min à 85-92% FTP R:1 min 50% FTP. Cadence 88-95 rpm. FC cible : 87-92% FCmax. RPE 7-8/10. Surveiller : NP (Normalized Power) doit rester stable sur toutes les répétitions (±5W) — si NP baisse > 5% sur les dernières répétitions, intensité trop élevée. L'objectif est la cohérence, pas l'effort maximal.", zones: ["Z4"] },
      { part: "Cool-down", text: "15 min Z1 cadence libre", zones: ["Z1"] }
    ],
    variants: {
      ironman: "5×5 min à 85-88% FTP — seuil spécifique IM vélo",
      half: "7×4 min à 88-91% FTP",
      marathon: "Non prioritaire",
      semi: "6×4 min à 88-91% FTP"
    }
  },

{
    id: "NORWEGIAN_BIKE_DOUBLE_THRESHOLD",
    cat: "C",
    sport: "cyclisme",
    objectif: "Double threshold vélo triathlon — séance unique combinant seuil bas et seuil haut (sans double journée)",
    necessite: "Recommandé",
    when: "Build — alternative au double threshold course pour triathlètes avec moins de volume. 1x/semaine.",
    phase: ["build"],
    avoid: "Fatigue élevée · VLamax > 0.55 · Sans capteur puissance",
    durationMin: [90, 110],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Norwegian", "double threshold", "vélo", "triathlon", "seuil bas", "seuil haut"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 progressif", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Bloc 1 — Seuil bas (LT1) : 3×8 min à 76-82% FTP R:2 min. Récup entre blocs : 5 min Z1. Bloc 2 — Seuil haut (LT2) : 5×4 min à 87-92% FTP R:90s. Logique : le bloc seuil bas fatigue les fibres lentes en douceur, puis le bloc seuil haut les sollicite plus intensément — même principe que le double threshold day mais condensé en une séance. Moins efficace que la vraie double journée mais très bon compromis pour athlètes avec 8-12h/semaine.", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "15 min Z1 + étirements", zones: ["Z1"] }
    ],
    variants: {
      ironman: "B1: 3×10min à 78-82% FTP. B2: 4×5min à 86-90% FTP",
      half: "B1: 3×8min à 80-84% FTP. B2: 5×4min à 88-92% FTP",
      marathon: "Non applicable",
      semi: "B1: 3×6min. B2: 5×3min à 90-93% FTP"
    }
  },

{
    id: "NORWEGIAN_SWIM_THRESHOLD",
    cat: "B",
    sport: "natation",
    objectif: "Seuil norvégien natation — accumulation volume au seuil (90-97% CSS) pour TTE natation",
    necessite: "Recommandé",
    when: "Build — 2x/semaine. Peut être couplé avec double threshold run ou bike le même jour.",
    phase: ["build"],
    avoid: "Technique insuffisante · Fatigue bras/épaules > 6/10",
    durationMin: [55, 75],
    metricKey: "allure",
    sportKey: "natation",
    defaultSportId: 19,
    tags: ["Norwegian", "seuil", "natation", "CSS", "TTE", "triathlon"],
    structure: [
      { part: "Warm-up", text: "400m progressif + 4×50m éducatifs R:15s + 4×100m progressifs jusqu'à allure seuil R:20s", zones: ["Z1", "Z2", "Z3"] },
      { part: "Main", text: "Protocole double seuil natation : Bloc A (seuil bas natation) : 4×200m à 92-95% CSS R:20s. Récup 3 min. Bloc B (seuil haut natation) : 6×100m à 98-102% CSS R:15s. RPE Bloc A : 7/10. RPE Bloc B : 8/10. Réf : Bakken 2019 adapté natation — même principe de double stimulation du seuil que la course. Le repos très court entre les répétitions (15-20s) force le maintien de la cinétique lactique en zone seuil, simulant le stimulus du double threshold.", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "300m dos lent + 100m crawl très facile", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Bloc A: 4×200m CSS. Bloc B: 4×100m à 100-102% CSS",
      half: "Bloc A: 4×150m CSS. Bloc B: 6×75m à 100-103% CSS",
      marathon: "Non applicable",
      semi: "Bloc A: 3×150m. Bloc B: 5×75m à 100-103% CSS"
    }
  },

{
    id: "NORWEGIAN_WEEK_STRUCTURE_RUN",
    cat: "C",
    sport: "course",
    objectif: "Structure semaine norvégienne course — organisation optimale du double threshold sur 7 jours",
    necessite: "Recommandé",
    when: "Build — semaine type pour athlètes 5km-marathon avec volume ≥ 8h/semaine. Répéter 3-4 semaines.",
    phase: ["build"],
    avoid: "Athlètes < 8h/semaine · Sans base aérobie solide (au moins 3 mois d'entraînement régulier)",
    durationMin: [50, 70],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Norwegian", "semaine type", "structure", "double threshold", "Ingebrigtsen", "organisation"],
    structure: [
      { part: "Warm-up", text: "LUNDI : Repos complet ou mobilité 20 min. MARDI matin : NORWEGIAN_RUN_THRESHOLD_LOW_AM (5×6 min seuil bas). MARDI soir : NORWEGIAN_RUN_THRESHOLD_HIGH_PM (8-10×1000m seuil haut). MERCREDI : EF longue Z2 (70-90 min). JEUDI matin : NORWEGIAN_RUN_THRESHOLD_LOW_AM (5×6 min seuil bas). JEUDI soir : NORWEGIAN_RUN_THRESHOLD_HIGH_PM (8-10×1000m seuil haut). VENDREDI : EF récupération Z1 (40-50 min léger). SAMEDI : Sortie longue progressive Z2→Z3 (90-120 min). DIMANCHE : EF + côtes ou repos.", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Cette séance représente le JEUDI SOIR de la semaine norvégienne (voir structure complète ci-dessus). Exécuter comme NORWEGIAN_RUN_THRESHOLD_HIGH_PM standard. RÉPARTITION HEBDOMADAIRE TYPE : ~80% volume en Z1-Z2. ~20% volume en Z3-Z4 (seuil). Zéro Z5-Z6 pendant ce bloc (4-6 semaines). Réf : Tjelta 2019 — les coureurs norvégiens élites accumulent 60-80 min/semaine au seuil bas et 40-60 min/semaine au seuil haut pendant les blocs de développement TTE.", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "12 min Z1. Note : après 4-6 semaines de bloc norvégien → ajouter 1 séance VO2max (Billat 30/30 ou 5×4min) par semaine pour capitaliser sur le TTE développé.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2 double threshold days/semaine mais avec volumes réduits. Intégrer vélo et natation.",
      half: "2 double threshold jours. Volume total 10-14h.",
      marathon: "2 double threshold jours. Volume 120-160km/semaine pour élites, 60-90km pour compétiteurs.",
      semi: "2 double threshold jours. Volume 80-120km/semaine."
    }
  },

{
    id: "NORWEGIAN_RUN_VMA_POST_BLOCK",
    cat: "B",
    sport: "course",
    objectif: "VO2max norvégien post-bloc — capitaliser sur le TTE développé avec séance VO2max ciblée",
    necessite: "Recommandé",
    when: "Peak — après 4-6 semaines de bloc double threshold. Le TTE élevé permet maintenant de tenir plus longtemps à VO2max.",
    phase: ["peak"],
    avoid: "Pendant le bloc double threshold (pas les deux en même temps) · Fatigue > 6/10",
    durationMin: [55, 70],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Norwegian", "VO2max", "post-bloc", "capitalisation", "TTE", "vitesse"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 + 3×30s à vVO2max R:90s", zones: ["Z1", "Z2", "Z5"] },
      { part: "Main", text: "Après un bloc de 4-6 semaines double threshold, le TTE est significativement amélioré. Cette séance capitalise sur ce gain : 5-6×3 min à 100-105% VMA R:2 min Z1-Z2. L'athlète peut maintenant tenir ces répétitions avec moins de fatigue qu'avant le bloc car le seuil est plus élevé. Réf : Stenqvist 2021 — le bloc double threshold améliore le VO2max de 3-5% et le TTE de 8-15% sur 6 semaines. La séance VO2max post-bloc est 40% plus productive qu'avant le bloc.", zones: ["Z5", "Z6"] },
      { part: "Cool-down", text: "12 min Z1 + marche 5 min", zones: ["Z1"] }
    ],
    variants: {
      ironman: "4×3 min à 102-105% VMA R:2 min",
      half: "5-6×3 min à 103-106% VMA R:2 min",
      marathon: "5×3 min à 102-105% VMA R:2 min",
      semi: "6×3 min à 103-106% VMA R:2 min"
    }
  },

{
    id: "NORWEGIAN_RUN_LACTATE_TEST_PROTOCOL",
    cat: "C",
    sport: "course",
    objectif: "Protocole lactate terrain norvégien — calibrer les zones seuil sans labo (Bakken method)",
    necessite: "Recommandé",
    when: "Base/Build — avant de démarrer un bloc double threshold pour calibrer les zones individuelles.",
    phase: ["base", "build"],
    avoid: "Sans lactatémètre (peu utile) · Fatigue > 4/10 · Moins de 48h depuis effort intense",
    durationMin: [60, 75],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Norwegian", "lactate", "test", "calibration", "zones", "Bakken", "diagnostic"],
    structure: [
      { part: "Warm-up", text: "10 min Z1 + 5 min Z2. Mesure lactate basale (cible : 1.0-1.2 mmol/L = bien récupéré).", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Protocole paliers lactate terrain Bakken : 4-5 paliers de 5 min avec mesure lactate à la fin de chaque. Palier 1 : Z2 facile (70% FCmax) → noter lactate. Palier 2 : 78% FCmax → noter lactate. Palier 3 : 83% FCmax → noter lactate. Palier 4 : 87% FCmax → noter lactate. Palier 5 (si confort) : 91% FCmax → noter lactate. Récup 90s entre paliers (mesure lactate pendant la récup). Identifier : LT1 = premier palier où lactate > 2.0 mmol/L. LT2/MLSS = palier où lactate > 3.5-4.0 mmol/L. Ces deux allures (et FC correspondantes) sont les cibles de tout le bloc double threshold suivant.", zones: ["Z2", "Z3", "Z4"] },
      { part: "Cool-down", text: "10 min Z1. Documenter les résultats dans le snapshot : pace_threshold_sec_per_km = allure à LT2. Recalibrer toutes les 6-8 semaines car le seuil s'améliore avec l'entraînement.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Ajouter palier vélo (5 paliers puissance) pour calibrer les deux disciplines",
      half: "Protocole complet 5 paliers",
      marathon: "Protocole complet 5 paliers — essentiel pour marathon norvégien",
      semi: "Protocole complet 5 paliers"
    }
  },

// =============================================
// BIBLIOTHÈQUE CANOVA — SPÉCIFICITÉ INVERSE
// 14 séances scientifiques (Canova, Stellingwerff)
// =============================================

  {
    id: "CANOVA_RUN_FAST_CONTINUOUS_INTRO",
    cat: "B",
    sport: "course",
    objectif: "Fast Continuous Run Canova intro — courir plus vite que l'allure course sur distance réduite (phase Introductive)",
    necessite: "Recommandé",
    when: "Build — phase Introductive (12-16 semaines avant course). Introduire l'allure spécifique tôt dans la préparation.",
    phase: ["build"],
    avoid: "Fatigue > 6/10 · Phase de base non complétée · Moins de 6 semaines d'entraînement régulier avant de commencer",
    durationMin: [60, 80],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Canova", "Fast Continuous Run", "FCR", "spécificité", "allure course", "introductif"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 progressif + 4×80m strides progressifs. Les jambes doivent se sentir vives avant de commencer — si lourdes, réduire l'allure principale de 10s/km.", zones: ["Z1", "Z2"] },
      { part: "Main", text: "8-10 km continu à allure course cible −10s/km (allure de l'objectif du plan : semi si semi, marathon si marathon). Exemple : cible 4:00/km → courir à 3:50/km. RPE : 7-7.5/10. PHILOSOPHIE CANOVA : contrairement à la méthode classique qui progresse de lent vers rapide, Canova introduit immédiatement la spécificité — l'allure course est présente dès la première semaine de build, sur une COURTE distance. Le volume augmentera semaine après semaine, l'allure reste constante. Progression Canova : S1=6km FCR, S2=8km, S3=10km, S4=12km, S5=14km. Observer : FC stable et allure régulière (±3s/km) sur tout le bloc — si dérive, distance trop longue.", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "10 min Z1 + marche 5 min. Nutrition post-effort dans les 20 min.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "6-8 km à allure run IM -5s/km (légèrement plus vite que Z2-Z3)",
      half: "8 km à allure semi-marathon -10s/km",
      marathon: "PRIORITÉ — 8-10 km à allure marathon -10s/km. Pilier de la phase Introductive.",
      semi: "6 km à allure semi-marathon -10s/km"
  }
  },
  {
    id: "CANOVA_RUN_FAST_CONTINUOUS_FUND",
    cat: "B",
    sport: "course",
    objectif: "Fast Continuous Run Canova fondamental — volume FCR augmenté (phase Fundamental)",
    necessite: "Recommandé",
    when: "Build — phase Fundamental (8-12 semaines avant course). Volume FCR progressivement augmenté.",
    phase: ["build"],
    avoid: "Sans avoir complété 3-4 semaines de phase Introductive · Fatigue > 7/10",
    durationMin: [75, 100],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Canova", "Fast Continuous Run", "fondamental", "volume", "spécificité marathon"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 + 4×100m progressifs", zones: ["Z1", "Z2"] },
      { part: "Main", text: "14-18 km continu à allure marathon -5s/km (quasi allure race). RPE 7.5-8/10. C'est la progression naturelle du FCR Intro — même allure, volume doublé sur 4 semaines. Le défi Canova : maintenir une allure régulière sur une distance significative qui approche la moitié du marathon. Ravitaillement : 20-30g glucides toutes les 30 min (gut training intégré). Progression : S1=12km, S2=14km, S3=16km, S4=18km. Sur les 3 derniers km : accélération progressive jusqu'à allure marathon exacte.", zones: ["Z4"] },
      { part: "Cool-down", text: "12 min Z1 + marche + récupération nutritionnelle complète", zones: ["Z1"] }
    ],
    variants: {
      ironman: "12 km à allure run IM ou légèrement plus vite",
      half: "12-14 km à allure semi-marathon -5s/km",
      marathon: "14-18 km à allure marathon -5s/km. Cœur de la phase Fundamental.",
      semi: "10-12 km à allure semi-marathon -5s/km"
  }
  },
  {
    id: "CANOVA_RUN_PROGRESSIVE_LONG",
    cat: "B",
    sport: "course",
    objectif: "Progressive Long Run Canova — sortie longue avec accélération progressive vers l'allure course (negative split)",
    necessite: "Obligatoire",
    when: "Build/Peak — 1x/semaine. Remplace la sortie longue classique à allure constante.",
    phase: ["build", "peak"],
    avoid: "Terrain très vallonné (biaise la progression) · Chaleur > 25°C sans adaptation · Fatigue > 6/10",
    durationMin: [100, 150],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Canova", "Progressive Long Run", "PLR", "negative split", "sortie longue", "allure marathon"],
    structure: [
      { part: "Warm-up", text: "Intégré dans la séance (les 8 premiers km sont l'échauffement naturel).", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Sortie longue 25-32 km avec accélération progressive en 3 phases. Phase 1 (premiers 40% — ex: km 1-10 sur 25km) : allure Z2 facile (~4:30-5:00/km pour marathon 3h30). Phase 2 (40-75% — ex: km 10-19) : allure Z3 soutenue, accélération progressive de 10-15s/km. Phase 3 (derniers 25% — ex: km 19-25) : allure marathon cible ou légèrement plus rapide. Derniers 3 km : free pace (allure naturelle). PHILOSOPHIE : Canova dit 'les champions ne ralentissent jamais en fin de marathon — ils s'entraînent à accélérer sur legs fatiguées'. Cette sortie simule exactement la physiologie des 15 derniers km de course. Ravitaillement : 30-45g glucides/h depuis le km 10. RPE final : 8.5/10.", zones: ["Z2", "Z3", "Z4"] },
      { part: "Cool-down", text: "Marche 10 min + récupération nutritionnelle immédiate (1g CHO/kg + 0.3g prot/kg dans les 30 min).", zones: ["Z1"] }
    ],
    variants: {
      ironman: "20-25 km : P1=10km Z2, P2=8km Z3, P3=derniers km allure run IM",
      half: "18-22 km : P1=8km Z2, P2=7km Z3, P3=3-4km allure semi",
      marathon: "PILIER ABSOLU — 28-32 km avec derniers 6-8 km à allure marathon ou plus vite",
      semi: "16-20 km : P1=7km Z2, P2=7km Z3, P3=derniers 4km allure semi"
  }
  },
  {
    id: "CANOVA_RUN_PROGRESSIVE_MEDIUM",
    cat: "B",
    sport: "course",
    objectif: "Medium Long Run progressif Canova — version courte du PLR pour les semaines de charge modérée",
    necessite: "Recommandé",
    when: "Build — séance de mi-semaine progressif. Moins exigeant que le PLR du weekend.",
    phase: ["build"],
    avoid: "Lendemain de double threshold ou séance intense · Fatigue > 6/10",
    durationMin: [65, 85],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Canova", "progressif", "medium long", "allure marathon", "Z3", "Z4"],
    structure: [
      { part: "Warm-up", text: "10 min Z1 progressif", zones: ["Z1"] },
      { part: "Main", text: "14-18 km progressifs en 2 phases. Phase 1 (10 km) : Z2 relâché (allure conversation). Phase 2 (4-8 km) : accélération progressive jusqu'à allure marathon ou légèrement plus vite. Terminer les 2 derniers km à allure semi-marathon (sensation forte). Réf : Canova 1999 — le medium long run progressif est la séance la plus couramment utilisée par les coureurs kényans dans la méthode Canova. Simple et efficace pour développer la spécificité sans créer de fatigue excessive.", zones: ["Z2", "Z3", "Z4"] },
      { part: "Cool-down", text: "10 min Z1 + marche", zones: ["Z1"] }
    ],
    variants: {
      ironman: "14 km : 8 km Z2 + 6 km progression allure run IM",
      half: "14 km : 8 km Z2 + 6 km progression allure semi",
      marathon: "16-18 km : 10 km Z2 + 6-8 km progression allure marathon",
      semi: "14 km : 8 km Z2 + 6 km progression allure semi"
  }
  },
  {
    id: "CANOVA_RUN_VARIATION_PACE_MARATHON",
    cat: "B",
    sport: "course",
    objectif: "Variation of Pace Canova marathon — alternance allure marathon / allure semi pour développer la polyvalence métabolique",
    necessite: "Recommandé",
    when: "Build/Peak — spécifique marathon. Simule les variations de rythme en course (ravitaillements, relances, côtes).",
    phase: ["build", "peak"],
    avoid: "Phase Introductive (trop tôt) · Fatigue > 6/10 · Terrain très irrégulier",
    durationMin: [75, 100],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Canova", "Variation of Pace", "VOP", "marathon", "alternance", "Fartlek structuré"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 + 4×80m strides", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Fartlek structuré Canova : 6×[2 km à allure marathon + 1 km à allure semi-marathon]. Total : 18 km spécifiques. Allure marathon : Z4 bas (ex: 4:00/km pour sub-2h48). Allure semi-marathon : Z4 haut (ex: 3:48/km). RPE : alternance 7.5/10 → 8.5/10. LOGIQUE MÉTABOLIQUE : l'alternance force l'organisme à basculer répétitivement entre différentes filières énergétiques, simulant les variations naturelles de la course. Canova : 'Un marathonien doit être capable de s'adapter à tous les rythmes.' Progressions : S1=4×(2+1), S2=5×(2+1), S3=6×(2+1).", zones: ["Z4"] },
      { part: "Cool-down", text: "10 min Z1 + marche 5 min. Ravitaillement toutes les 30 min pendant la séance (30g CHO/h).", zones: ["Z1"] }
    ],
    variants: {
      ironman: "4×[2 km allure run IM + 1 km allure marathon] — transition métabolique",
      half: "5×[1.5 km allure semi + 500m allure 10km]",
      marathon: "SÉANCE CANOVA SIGNATURE — 6×(2 km marathon + 1 km semi)",
      semi: "5×[1 km allure semi + 500m allure 10km]"
  }
  },
  {
    id: "CANOVA_RUN_VARIATION_PACE_ULTRA",
    cat: "B",
    sport: "course",
    objectif: "Variation of Pace Canova ultra/trail — alternance marche rapide / course pour ultra-endurance",
    necessite: "Recommandé",
    when: "Build — spécifique ultra-marathon et trail long. Développe la gestion allure sur très longue durée.",
    phase: ["build"],
    avoid: "Distances < marathon · Athlètes uniquement route",
    durationMin: [120, 210],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Canova", "Variation of Pace", "ultra", "trail", "marche", "gestion allure"],
    structure: [
      { part: "Warm-up", text: "15 min marche rapide + 10 min trot progressif", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3-4h avec alternance structurée : 20 min course Z2 + 5 min marche rapide (6-7 km/h). Répéter sur toute la durée. Progressivement réduire les phases marche en fin de bloc (semaines 3-4 : 20 min course + 3 min marche). Ravitaillement : 30-45g CHO/h depuis le début, avec simulation ravitaillement course (manger en mouvement). Réf : Canova adapté ultra — même principe de variation mais adapté aux durées > 4h où la marche est tactiquement optimale.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "10 min marche récup + alimentation complète immédiate", zones: ["Z1"] }
    ],
    variants: {
      ironman: "3h : alternance 20 min run Z2 + 2 min marche — simulation run IM",
      half: "Non applicable",
      marathon: "2h30 : alternance 25 min run + 3 min marche (semaines 1-2) → 30 min run + 2 min marche (semaines 3-4)",
      semi: "Non applicable"
  }
  },
  {
    id: "CANOVA_RUN_SPECIAL_BLOCK_AM",
    cat: "C",
    sport: "course",
    objectif: "Special Block Canova matin — FCR intense matin du bloc spécifique (phase Specific)",
    necessite: "Recommandé",
    when: "Peak — phase Specific (4-8 semaines avant course). Matin du Special Block Day. À coupler avec CANOVA_RUN_SPECIAL_BLOCK_PM le soir.",
    phase: ["peak"],
    avoid: "Sans base solide de FCR et PLR (3-4 mois) · Fatigue > 5/10 · Compétition dans les 10 jours",
    durationMin: [80, 100],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Canova", "Special Block", "matin", "phase spécifique", "FCR", "élite"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 + 4×100m progressifs. La fraîcheur du matin est un avantage — profiter de la meilleure disposition physiologique de la journée.", zones: ["Z1", "Z2"] },
      { part: "Main", text: "15-20 km continu à allure marathon -10s/km (plus vite que race pace). RPE 8/10. C'est la séance la plus intense de la semaine Canova — elle simule exactement la physiologie des km 10-30 d'un marathon en compétition. Ravitaillement : 40g CHO/h depuis le km 10 (gel + boisson). Canova : 'Le matin du special block, l'athlète doit courir à une allure qu'il serait incapable de tenir sur marathon complet.' Le but est d'exposer le corps à une allure légèrement supérieure à la cible pour créer une adaptation spécifique.", zones: ["Z4"] },
      { part: "Cool-down", text: "10 min Z1 + marche. Repas complet dans les 30 min. Repos 4-5h avant séance soir.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "12 km à allure run IM -5s/km",
      half: "12 km à allure semi -10s/km",
      marathon: "15-20 km à allure marathon -10s/km",
      semi: "10 km à allure semi -10s/km"
  }
  },
  {
    id: "CANOVA_RUN_SPECIAL_BLOCK_PM",
    cat: "C",
    sport: "course",
    objectif: "Special Block Canova soir — Progressive Run sur jambes fatiguées (phase Specific)",
    necessite: "Recommandé",
    when: "Peak — soir du Special Block Day. Après CANOVA_RUN_SPECIAL_BLOCK_AM (4-5h de récup minimum).",
    phase: ["peak"],
    avoid: "Sans avoir fait la séance matin · FC repos +8 bpm après la sieste · Sensation de jambes 'bloquées'",
    durationMin: [60, 80],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Canova", "Special Block", "soir", "progression", "jambes fatiguées", "résistance"],
    structure: [
      { part: "Warm-up", text: "10 min trot Z1 lent. Les jambes seront fatiguées — c'est voulu. L'objectif de cette séance est de courir efficacement sur legs pré-fatiguées, ce qui simule les km 30-42 du marathon.", zones: ["Z1"] },
      { part: "Main", text: "10-12 km avec accélération finale. Phase 1 (5-7 km) : Z2-Z3 (allure facile à modérée — les jambes sont lourdes, respecter cela). Phase 2 (3-5 km) : progression vers allure marathon exacte. Derniers 2 km : allure semi-marathon ou plus vite si les jambes 'se déverrouillent'. LOGIQUE CANOVA : courir vite sur legs fatiguées développe une adaptation neuromusculaire unique — l'économie de course sous fatigue, impossible à développer autrement. Réf : Canova 2006 — les meilleurs marathoniens maintiennent 98% de leur allure optimale aux km 35-42.", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "10 min Z1 + marche. Récupération nutritionnelle immédiate et sommeil prioritaire.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "8 km : 5 km Z2 + 3 km progression allure run IM",
      half: "10 km : 5 km Z2-Z3 + 5 km progression allure semi",
      marathon: "12 km : 7 km Z2-Z3 + 5 km progression jusqu'à allure marathon",
      semi: "10 km : 5 km Z2 + 5 km progression allure semi"
  }
  },
  {
    id: "CANOVA_RUN_FARTLEK_MARATHON",
    cat: "B",
    sport: "course",
    objectif: "Fartlek Canova marathon — alternance allure marathon et allure semi en terrain naturel",
    necessite: "Recommandé",
    when: "Build/Peak — séance clé mi-semaine. Plus dynamique que le VOP en piste.",
    phase: ["build", "peak"],
    avoid: "Terrain très accidenté (biaise les allures) · Fatigue > 6/10",
    durationMin: [75, 95],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Canova", "Fartlek", "marathon", "alternance", "terrain naturel", "Kipchoge"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 + 4×80m accélérations", zones: ["Z1", "Z2"] },
      { part: "Main", text: "6×[2 km à allure marathon + 1 km à allure semi-marathon]. Total 18 km spécifiques. Courir sur terrain naturel (route, chemin) sans regarder la montre sur les km semi — utiliser le RPE et le souffle. Réf : Canova 1999 — le Fartlek Canova est différent du fartlek classique : les segments sont précis (km mesurés) et les allures sont spécifiques à la compétition cible. C'est un VOP en conditions naturelles.", zones: ["Z4"] },
      { part: "Cool-down", text: "10 min Z1 + marche", zones: ["Z1"] }
    ],
    variants: {
      ironman: "4×[2 km run IM + 1 km marathon]",
      half: "5×[1.5 km semi + 500m 10km]",
      marathon: "6×[2 km marathon + 1 km semi] — séance signature Canova",
      semi: "5×[1 km semi + 500m 10km]"
  }
  },
  {
    id: "CANOVA_RUN_FARTLEK_MIXED",
    cat: "B",
    sport: "course",
    objectif: "Fartlek mixte Canova — 3 allures (Z2 / marathon / semi) pour développement polyvalence métabolique complète",
    necessite: "Recommandé",
    when: "Build — variante du VOP avec 3 allures distinctes pour plus de variété métabolique.",
    phase: ["build"],
    avoid: "Phase Introductive (trop complexe) · Fatigue élevée",
    durationMin: [70, 90],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Canova", "Fartlek", "mixte", "3 allures", "polyvalence", "marathon"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Schéma : 4×[3 km à allure marathon + 1 km à allure semi + 1 km en récup Z2]. Total 20 km. 3 allures distinctes créent une variété de stimulus métabolique optimale. La récup Z2 entre les blocs simule la gestion des passages de ravitaillement en compétition. RPE moyen : 7.5/10 sur toute la séance.", zones: ["Z2", "Z3", "Z4"] },
      { part: "Cool-down", text: "10 min Z1 + marche", zones: ["Z1"] }
    ],
    variants: {
      ironman: "3×[3 km run IM + 1 km marathon + 1 km Z2]",
      half: "4×[2 km semi + 500m 10km + 1 km Z2]",
      marathon: "4×[3 km marathon + 1 km semi + 1 km Z2]",
      semi: "4×[1.5 km semi + 500m 10km + 1 km Z2]"
  }
  },
  {
    id: "CANOVA_RUN_INTRODUCTIVE_PHASE",
    cat: "B",
    sport: "course",
    objectif: "Phase Introductive Canova — premiers contacts avec l'allure course (12-16 semaines avant race)",
    necessite: "Recommandé",
    when: "Base/Build — phase d'introduction à la spécificité. Première phase de la périodisation Canova.",
    phase: ["base", "build"],
    avoid: "Fatigue de base · Moins de 4 semaines d'entraînement régulier",
    durationMin: [55, 70],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Canova", "introductive", "phase", "allure course", "progressif", "premiers contacts"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 + 4×80m strides", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Protocole Introductif Canova : 4-6×[3-4 min à allure course cible + 2 min récup Z1-Z2]. L'allure est EXACTEMENT celle de la course cible (pas plus rapide, pas plus lente). Les répétitions sont courtes — l'important n'est pas le volume mais la qualité neuromusculaire à l'allure exacte. Canova : 'L'athlète doit apprendre à ressentir l'allure de course comme naturelle et économique.' RPE à l'allure course : 7/10 (doit sembler gérable). Si RPE > 8/10 à l'allure cible → revoir l'objectif de course.", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "10 min Z1 + marche + étirements", zones: ["Z1"] }
    ],
    variants: {
      ironman: "4×4 min à allure run IM + 2 min trot",
      half: "5×3 min à allure semi + 2 min trot",
      marathon: "6×3 min à allure marathon + 2 min trot — premier contact spécificité",
      semi: "5×3 min à allure semi + 2 min trot"
  }
  },
  {
    id: "CANOVA_RUN_SPECIFIC_PHASE",
    cat: "C",
    sport: "course",
    objectif: "Phase Specific Canova — blocs spécifiques intense à allure course (4-8 semaines avant race)",
    necessite: "Recommandé",
    when: "Peak — phase Specific. Séance la plus difficile de la préparation Canova. 1x/2 semaines.",
    phase: ["peak"],
    avoid: "Sans progression complète des phases Introductive et Fundamental · Compétition dans les 7 jours · Fatigue > 6/10",
    durationMin: [90, 120],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Canova", "spécifique", "phase peak", "allure course", "volume", "élite"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 + 4×150m progressifs jusqu'à allure course", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Séance spécifique complète : 2-3×[5-8 km à allure marathon exacte] R:3-5 min trot Z1. Volume total à allure spécifique : 15-24 km. C'est LA séance signature de la phase Specific Canova — simuler la course sur des distances significatives sans le stress compétitif. Ravitaillement : exact comme en compétition (timing, produits, doses). Observer : allure régulière sur toutes les répétitions (±5s/km). Si la dernière répétition est 10s+ plus lente que la première, volume trop élevé. Progression : S1=2×5km, S2=2×6km, S3=3×5km, S4=2×8km.", zones: ["Z4"] },
      { part: "Cool-down", text: "12 min Z1 + marche 10 min. Récupération nutritionnelle prioritaire.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2×6 km à allure run IM R:4 min — simulation partielle du run IM",
      half: "2×5 km à allure semi R:3 min",
      marathon: "2-3×6-8 km à allure marathon R:4 min — élite Canova",
      semi: "3×3 km à allure semi R:3 min"
  }
  },
  {
    id: "CANOVA_RUN_PRERACE_PHASE",
    cat: "B",
    sport: "course",
    objectif: "Phase Pre-race Canova — dernière stimulation spécifique avant course (J-7 à J-10)",
    necessite: "Obligatoire",
    when: "Peak — 7-10 jours avant course A. Dernière séance de qualité.",
    phase: ["peak"],
    avoid: "< 7 jours avant course (trop proche) · Volume excessif · Nouvelles séances non testées",
    durationMin: [45, 55],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Canova", "pre-race", "activation", "rappel allure", "J-7", "J-10"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 + 3×100m à allure course R:90s", zones: ["Z1", "Z2"] },
      { part: "Main", text: "3×[5 min à allure marathon exacte + 3 min récup Z1]. Réf : Canova 1999 — 'rappel allure' à J-7 ou J-10 : maintenir la mémoire neuromusculaire de l'allure course sans créer de fatigue. Volume très réduit vs séances normales. L'athlète doit se sentir 'vif' et l'allure course doit sembler facile (signe que l'affûtage fonctionne). Si l'allure semble dure → encore une semaine d'affûtage nécessaire.", zones: ["Z4"] },
      { part: "Cool-down", text: "10 min Z1 + marche 5 min. Pas de séance qualité après celle-ci jusqu'à la course.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "3×4 min allure run IM — rappel avant course",
      half: "3×5 min allure semi — rappel",
      marathon: "3×5 min allure marathon — rappel Canova J-7 ou J-10",
      semi: "3×4 min allure semi — rappel"
  }
  },
  {
    id: "CANOVA_TRI_BRICK_SPECIFIC",
    cat: "C",
    sport: "course",
    objectif: "Brick spécifique Canova triathlon — vélo + run à allures race pour développer la spécificité de transition",
    necessite: "Recommandé",
    when: "Build/Peak — spécifique triathlon. Simule les conditions exactes de course (post-vélo).",
    phase: ["build", "peak"],
    avoid: "Fatigue > 6/10 · Sans base brick préalable · Compétition dans les 7 jours",
    durationMin: [150, 210],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Canova", "brick", "triathlon", "spécificité", "transition", "allure race"],
    structure: [
      { part: "Warm-up", text: "Intégré dans le vélo (20 min Z2 échauffement au début du vélo).", zones: ["Z1", "Z2"] },
      { part: "Main", text: "VÉLO (2h-3h) : 60-70% du temps en Z2 + 2-3 blocs de 15-20 min à allure vélo course (80-85% FTP). TRANSITION : rapide, simuler exactement T2 de course. RUN (20-40 min) : Phase 1 (5-10 min) : Z2 lent (jambes encore lourdes post-vélo — normal et prévu). Phase 2 (10-20 min) : progression vers allure run IM ou semi. Phase 3 (derniers 10 min) : allure race cible. PHILOSOPHIE CANOVA adaptée triathlon : la spécificité post-vélo est unique au triathlon — l'athlète doit s'entraîner à trouver son allure course spécifique sur jambes pré-fatiguées.", zones: ["Z2", "Z3", "Z4"] },
      { part: "Cool-down", text: "10 min marche + récupération nutritionnelle immédiate.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Vélo 4h + Run 30-40 min (10 min Z2 + 20 min allure run IM)",
      half: "Vélo 2h + Run 20-30 min (8 min Z2 + 15 min allure run 70.3)",
      marathon: "Non applicable",
      semi: "Non applicable — triathlon uniquement"
    }
  },

  {
    id: "SEILER_RUN_Z1_EASY_LONG",
    cat: "A",
    sport: "course",
    objectif: "Sortie longue Z1 Seiler — volume aérobie fondamental à intensité strictement basse (pilier du 80/20)",
    necessite: "Obligatoire",
    when: "Toute l'année — 1-2x/semaine. Constitue le socle des 80% du volume Seiler.",
    phase: ["base", "build", "peak"],
    avoid: "Dériver vers Z3 (erreur classique — 'black hole') · Terrain trop vallonné si difficile de rester en Z1-Z2",
    durationMin: [70, 150],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Seiler", "polarisé", "Z1", "Z2", "volume", "80/20", "aérobie fondamental", "black hole"],
    structure: [
      { part: "Warm-up", text: "Intégré — les 10 premières minutes sont l'échauffement naturel.", zones: ["Z1"] },
      { part: "Main", text: "60-120 min en Z1-Z2 strict (< 75% FCmax). Allure conversation complète — capable de tenir une discussion normale sans s'essouffler. Si la FC monte vers 78% FCmax → ralentir immédiatement. CONCEPT CLÉ SEILER : le 'black hole' (Z3, 76-85% FCmax) est la zone à ÉVITER absolument. C'est trop difficile pour récupérer facilement, trop facile pour créer des adaptations VO2max. La plupart des athlètes amateurs passent 50-60% de leur volume en Z3 — c'est l'erreur n°1. Cette sortie DOIT rester en dessous du premier seuil lactique (LT1). En pratique : allure où chanter est possible (test Seiler). Réf : Seiler 2010 — les athlètes élites passent 75-80% de leur volume en Z1 strict. Progression sur les semaines : durée augmente de 10 min/semaine.", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "Intégré — les 10 dernières minutes naturellement plus lentes.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "90-120 min Z1 strict — fondement de la préparation IM longue distance",
      half: "70-90 min Z1-Z2 — 1x/semaine minimum",
      marathon: "80-110 min Z1 — le volume facile est aussi important que les séances dures",
      semi: "60-80 min Z1-Z2"
    }
  },

  {
    id: "SEILER_BIKE_Z1_LONG",
    cat: "A",
    sport: "cyclisme",
    objectif: "Sortie longue Z1 Seiler vélo — volume aérobie fondamental polarisé",
    necessite: "Obligatoire",
    when: "Toute l'année — 1-2x/semaine. Pilier des 80% du volume Seiler.",
    phase: ["base", "build", "peak"],
    avoid: "Home trainer sans ventilateur (FC monte) · Dériver vers Z3 sur les côtes",
    durationMin: [90, 210],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Seiler", "polarisé", "Z1", "Z2", "vélo", "80/20", "aérobie", "volume"],
    structure: [
      { part: "Warm-up", text: "Intégré — les 15 premières minutes Z1 très progressif.", zones: ["Z1"] },
      { part: "Main", text: "90-180 min en Z1-Z2 strict (55-72% FTP, < 75% FCmax). Cadence libre 85-95 rpm. CONTRÔLE PUISSANCE : utiliser la puissance comme guide principal (pas la FC qui réagit trop lentement). Maintenir < 72% FTP en plat, autoriser jusqu'à 76% FTP dans les côtes courtes. Descentes : pédaler léger pour maintenir le stimulus sans dépasser Z2. Réf : Seiler 2006 — les cyclistes norvégiens élites (cross-country ski adapté au vélo) maintiennent 78-82% de leur volume < 72% FTP. Ceux qui dérivent vers Z3 sur les longues sorties stagnent.", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "Intégré — dernières 15 min Z1 strict.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "180-210 min Z1-Z2 — fondamental IM. Ravitaillement toutes les 45 min.",
      half: "120-150 min Z1-Z2",
      marathon: "90-120 min Z1 — support aérobie",
      semi: "90-120 min Z1-Z2"
    }
  },

  {
    id: "SEILER_SWIM_Z1_VOLUME",
    cat: "A",
    sport: "natation",
    objectif: "Volume Z1 Seiler natation — accumulation volume aérobie en piscine (80% distribution polarisée)",
    necessite: "Recommandé",
    when: "Toute l'année — 1-2x/semaine. Socle du volume natation.",
    phase: ["base", "build"],
    avoid: "Dériver vers Z3 (effort perceptible mais gérable — black hole natation)",
    durationMin: [45, 75],
    metricKey: "allure",
    sportKey: "natation",
    defaultSportId: 19,
    tags: ["Seiler", "polarisé", "Z1", "Z2", "natation", "volume", "80/20"],
    structure: [
      { part: "Warm-up", text: "300m progressif mixte crawl/dos", zones: ["Z1"] },
      { part: "Main", text: "1500-3000m continu ou en longues séries (500-800m) à allure Z1-Z2 (> 110% CSS — plus lent que CSS). Cible : CSS+15s/100m minimum. Sensation : facile, technique fluide, respiration contrôlée toutes les 3 foulées. La tentation est de nager 'un peu plus vite' — résister. Réf : Seiler 2010 adapté natation — la natation doit suivre la même distribution polarisée que les autres sports. Le volume facile développe les adaptations centrales (volume sanguin, efficacité cardiaque) sans créer de fatigue périphérique.", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "200m dos très lent", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2500-3000m Z1 — fondation natation IM",
      half: "2000-2500m Z1",
      marathon: "1500-2000m — support",
      semi: "1500-2000m Z1"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 2 — Z4-Z5 HAUTE INTENSITÉ (15-20% du volume)
// "High intensity should be very high — not just hard"
// Séances Seiler 4×4min et variantes
// ─────────────────────────────────────────────

  {
    id: "SEILER_RUN_4X4MIN_STANDARD",
    cat: "B",
    sport: "course",
    objectif: "4×4min Seiler — intervalles VO2max standard norvégien (séance haute intensité polarisée)",
    necessite: "Recommandé",
    when: "Build/Peak — 1-2x/semaine. Constitue les 15-20% haute intensité du modèle polarisé.",
    phase: ["build", "peak"],
    avoid: "Plus de 2x/semaine (dépasse les 20% du volume) · Fatigue > 7/10 · Jamais en Z3 (trop peu intense)",
    durationMin: [50, 65],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Seiler", "4x4min", "VO2max", "polarisé", "haute intensité", "Z5", "Z4"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 progressif + 2×1 min à allure seuil R:2 min", zones: ["Z1", "Z2", "Z3"] },
      { part: "Main", text: "4×4 min à très haute intensité (Z5 — 93-97% FCmax) R:3 min Z1 récup active. Réf : Seiler 2013 — le 4×4min est LA séance haute intensité de référence dans le modèle polarisé. Elle est suffisamment longue pour atteindre VO2max (les 2 premières minutes montent, les 2 dernières restent à VO2max) et suffisamment courte pour ne pas accumuler de fatigue excessive. RÈGLE SEILER : la récupération entre les répétitions doit être ACTIVE (footing Z1) et strictement de 3 min — pas 2 min (trop courte), pas 4 min (trop longue). FC cible sur les 2 dernières minutes de chaque répétition : 93-97% FCmax = séance réussie. Si FC ne monte pas > 90% FCmax sur aucune répétition → allure trop lente, pas une séance polarisée haute intensité.", zones: ["Z5", "Z6"] },
      { part: "Cool-down", text: "12 min Z1 footing lent. Cette séance constitue 15-20% du volume hebdomadaire — ne pas en faire plus de 2x/semaine.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "4×4 min à 93-96% FCmax — stimulation VO2max sans fatigue excessive",
      half: "4×4 min à 94-97% FCmax — standard",
      marathon: "4×4 min à 93-96% FCmax — développe le plafond aérobie",
      semi: "4×4 min à 95-97% FCmax"
    }
  },

  {
    id: "SEILER_BIKE_4X4MIN",
    cat: "B",
    sport: "cyclisme",
    objectif: "4×4min Seiler vélo — standard VO2max polarisé (séance haute intensité référence)",
    necessite: "Recommandé",
    when: "Build/Peak — 1-2x/semaine. 15-20% du volume en haute intensité.",
    phase: ["build", "peak"],
    avoid: "Plus de 2x/semaine · Fatigue élevée · Home trainer sans ventilateur (FC monte artificiellement)",
    durationMin: [55, 70],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Seiler", "4x4min", "VO2max", "vélo", "polarisé", "haute intensité", "Norwegian"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 + 2×2 min à 95% FTP R:2 min", zones: ["Z1", "Z2", "Z4"] },
      { part: "Main", text: "4×4 min à 106-115% FTP (Z5) R:3 min 50% FTP. Cadence 90-105 rpm. Sur les 2 dernières minutes de chaque répétition : FC cible ≥ 93% FCmax. Réf : Seiler 2013 — même protocole que la course, adapté au vélo. La puissance est facile à contrôler précisément. IMPORTANT : la récupération à 50% FTP (et non arrêt complet) est essentielle pour maintenir la cinétique VO2 et réduire le lactate progressivement, permettant la répétition suivante d'atteindre VO2max plus rapidement.", zones: ["Z5", "Z6"] },
      { part: "Cool-down", text: "15 min Z1 cadence libre", zones: ["Z1"] }
    ],
    variants: {
      ironman: "4×4 min à 107-112% FTP — développement VO2max",
      half: "4×4 min à 108-115% FTP",
      marathon: "Support secondaire",
      semi: "Support secondaire"
    }
  },

  {
    id: "SEILER_RUN_4X8MIN",
    cat: "B",
    sport: "course",
    objectif: "4×8min Seiler — intervalles longs haute intensité pour adaptations centrales profondes",
    necessite: "Recommandé",
    when: "Build — variante avancée du 4×4min. Plus de temps à VO2max, plus d'adaptations cardiaques.",
    phase: ["build"],
    avoid: "Athlètes débutants en intervalles haute intensité · Fatigue > 6/10",
    durationMin: [60, 75],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Seiler", "4x8min", "VO2max", "intervalles longs", "polarisé", "adaptations centrales"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 + 3×1 min à allure Z5 R:2 min", zones: ["Z1", "Z2", "Z5"] },
      { part: "Main", text: "4×8 min à Z4-Z5 (90-95% FCmax) R:3 min Z1 actif. L'intensité est légèrement inférieure au 4×4min (FC un peu plus basse) pour permettre de tenir 8 min. Réf : Seiler 2013 — le 4×8min produit plus de temps total à VO2max que le 4×4min (les 6 dernières minutes de chaque répétition de 8 min sont passées à ou près de VO2max vs seulement 2 min pour le 4×4min). Les adaptations cardiaques structurelles (volume d'éjection) sont plus profondes avec les intervalles plus longs. Arrêter si allure chute > 5% vs première répétition.", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "12 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "4×8 min à 90-93% FCmax — excellent pour VO2max longue distance",
      half: "4×8 min à 91-94% FCmax",
      marathon: "4×8 min à 90-93% FCmax",
      semi: "4×8 min à 92-95% FCmax"
    }
  },

  {
    id: "SEILER_BIKE_4X8MIN",
    cat: "B",
    sport: "cyclisme",
    objectif: "4×8min Seiler vélo — intervalles longs VO2max avec adaptations cardiaques profondes",
    necessite: "Recommandé",
    when: "Build — après 3-4 semaines de 4×4min. Progression naturelle du modèle Seiler.",
    phase: ["build"],
    avoid: "Fatigue élevée · Sans base 4×4min",
    durationMin: [65, 80],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Seiler", "4x8min", "VO2max", "vélo", "intervalles longs", "polarisé"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 + 3×1 min à 105% FTP R:2 min", zones: ["Z1", "Z2", "Z4"] },
      { part: "Main", text: "4×8 min à 103-110% FTP R:4 min 50% FTP. Cadence 88-98 rpm. FC cible sur les 6 dernières minutes : 90-95% FCmax. La récupération passe de 3 à 4 min (légèrement plus longue qu'avec 4×4min) pour permettre de maintenir la puissance sur 8 min.", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "15 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "4×8 min à 103-107% FTP",
      half: "4×8 min à 105-110% FTP",
      marathon: "Support",
      semi: "Support"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 3 — DISTRIBUTION POLARISÉE HEBDOMADAIRE
// Structure de semaine selon le modèle 80/20
// ─────────────────────────────────────────────

  {
    id: "SEILER_WEEK_POLARIZED_RUN",
    cat: "C",
    sport: "course",
    objectif: "Semaine polarisée Seiler course — structure 80/20 optimale (modèle de référence)",
    necessite: "Recommandé",
    when: "Build — semaine type pour athlètes course à pied suivant le modèle Seiler. 4-6 semaines consécutives.",
    phase: ["build"],
    avoid: "Dériver vers le modèle 'threshold' (trop de Z3) · Plus de 2 séances haute intensité/semaine",
    durationMin: [55, 70],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Seiler", "semaine type", "polarisé", "80/20", "distribution", "structure"],
    structure: [
      { part: "Warm-up", text: "Structure semaine optimale Seiler (7 séances, ~10h/semaine) : LUNDI : Z1 récupération 40 min. MARDI : 4×4min Z5 (haute intensité, 15% du volume). MERCREDI : Z1-Z2 long 70-80 min. JEUDI : Z1 récupération 50 min + 8×80m strides. VENDREDI : 4×4min Z5 (2ème séance haute intensité = 20% du volume cumulé). SAMEDI : Z1 long 90-100 min. DIMANCHE : Z1 récupération 40 min.", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Cette séance représente le VENDREDI (2ème séance haute intensité) : 4×4 min Z5 à 93-97% FCmax R:3 min Z1. VÉRIFICATION DISTRIBUTION POLARISÉE : Volume Z1-Z2 (lundi + mercredi + jeudi + samedi + dimanche) = ~340 min = 80% du total. Volume Z4-Z5 (mardi + vendredi) = ~48 min haute intensité = 20% du total. Volume Z3 = 0% (BLACK HOLE ÉVITÉ). Réf : Stöggl & Sperlich 2014 — le modèle polarisé produit +6.8% d'amélioration VO2max vs modèle threshold (+3.6%) sur 9 semaines.", zones: ["Z5"] },
      { part: "Cool-down", text: "12 min Z1. Vérifier chaque semaine la distribution avec la règle : si plus de 20% du temps en Z3 → réduire les séances de qualité ou augmenter le volume facile.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Distribution identique sur 3 sports : 80% Z1-Z2 toutes disciplines confondues",
      half: "Même structure, volumes légèrement réduits",
      marathon: "Même structure — standard international",
      semi: "Même structure, volumes légèrement réduits"
    }
  },

  {
    id: "SEILER_WEEK_POLARIZED_TRI",
    cat: "C",
    sport: "cyclisme",
    objectif: "Semaine polarisée Seiler triathlon — distribution 80/20 sur 3 disciplines",
    necessite: "Recommandé",
    when: "Build — semaine type pour triathlètes. Le modèle 80/20 s'applique au volume TOTAL des 3 disciplines.",
    phase: ["build"],
    avoid: "Dériver vers Z3 sur les longues sorties vélo ou run (erreur la plus fréquente en triathlon)",
    durationMin: [65, 85],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Seiler", "triathlon", "polarisé", "80/20", "3 disciplines", "structure semaine"],
    structure: [
      { part: "Warm-up", text: "Structure triathlon 12-15h/semaine : LUNDI : Repos ou Z1 mobilité. MARDI matin : Natation Z1 volume (2500m). MARDI soir : Vélo 4×4min Z5 (haute intensité #1). MERCREDI : Run Z1-Z2 long (70 min). JEUDI matin : Natation CSS (haute intensité #2 — seuil). JEUDI soir : Vélo Z1 long (90 min). VENDREDI : Run strides légers + Z1 40 min. SAMEDI : Vélo Z1-Z2 long (150 min) + Run Z2 30 min (brick léger). DIMANCHE : Run Z1 60 min.", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Cette séance représente le MARDI SOIR vélo (4×4min Z5). VÉRIFICATION : Volume Z1-Z2 : ~80% du temps total toutes disciplines. Volume Z4-Z5 : ~20% (2 séances haute intensité par semaine — une vélo, une natation). Volume Z3 : 0-5% maximum. PIÈGE DU TRIATHLON SEILER : les triathlètes ont tendance à courir toutes leurs longues sorties vélo en Z3 ('grey zone') et à faire leurs natations en Z3. Résultat : 50-60% du volume en Z3 → stagnation. Réf : Muñoz 2014 — les triathlètes récréatifs qui passent à 80/20 améliorent leur VO2max de 8.4% vs 4.1% pour ceux en threshold.", zones: ["Z5"] },
      { part: "Cool-down", text: "15 min Z1 vélo", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Même structure. Volume total 15-20h. Longues sorties vélo et run STRICTEMENT Z1-Z2.",
      half: "10-12h total. 2 séances haute intensité/semaine.",
      marathon: "Adapté course uniquement",
      semi: "8-10h total. 1-2 séances haute intensité/semaine."
    }
  },

// ─────────────────────────────────────────────
// GROUPE 4 — ÉVITER LE BLACK HOLE (Z3)
// Séances spécifiques pour sortir du grey zone
// ─────────────────────────────────────────────

  {
    id: "SEILER_RUN_BLACK_HOLE_AUDIT",
    cat: "C",
    sport: "course",
    objectif: "Audit Black Hole Seiler — identifier et corriger la distribution d'intensité (diagnostic)",
    necessite: "Recommandé",
    when: "Base — à réaliser au début d'un bloc pour auditer sa distribution réelle d'intensité avant d'appliquer le modèle polarisé.",
    phase: ["base"],
    avoid: "Sauter cet audit si l'athlète n'a pas de données d'entraînement récentes (4 semaines minimum)",
    durationMin: [30, 45],
    metricKey: "fc",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Seiler", "black hole", "audit", "distribution", "diagnostic", "Z3", "80/20"],
    structure: [
      { part: "Warm-up", text: "Analyser les 4 dernières semaines d'entraînement : télécharger les données Garmin/Strava/Training Peaks.", zones: ["Z1"] },
      { part: "Main", text: "Audit de distribution d'intensité Seiler : Classer chaque séance en 3 zones. Zone 1 (Z1-Z2, < LT1) : tout ce qui est < 82% FCmax en course, < 78% FTP vélo. Zone 2 (Z3, LT1→LT2 'black hole') : 82-90% FCmax, 78-90% FTP. Zone 3 (Z4-Z5, > LT2) : > 90% FCmax, > 90% FTP. Calculer le % de temps dans chaque zone. INTERPRÉTATION : Si > 30% en Z3 → modèle 'threshold' involontaire. Si > 20% en Z4-Z5 → trop intense. Cible Seiler : < 5% Z3, 15-20% Z4-Z5, 75-85% Z1-Z2. Réf : Seiler 2006 — 95% des athlètes amateurs surestiment le temps passé en Z1-Z2 et sous-estiment le temps en Z3.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "Documenter dans les notes coach : distribution actuelle, distribution cible, ajustements nécessaires.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Audit sur les 3 disciplines séparément",
      half: "Audit course principalement",
      marathon: "Audit course + vélo si cross-training",
      semi: "Audit course principalement"
    }
  },

  {
    id: "SEILER_RUN_Z1_RECOVERY_STRICT",
    cat: "A",
    sport: "course",
    objectif: "Récupération Z1 strict Seiler — séance de récupération vraiment active (pas de dérive Z3)",
    necessite: "Obligatoire",
    when: "Toute l'année — lendemain de séance haute intensité ou longue sortie. Remplace le repos complet.",
    phase: ["base", "build", "peak"],
    avoid: "Dériver vers Z2 haut ou Z3 (détruit le bénéfice) · Courir avec des partenaires plus rapides",
    durationMin: [30, 50],
    metricKey: "fc",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Seiler", "récupération", "Z1 strict", "active recovery", "polarisé"],
    structure: [
      { part: "Warm-up", text: "Commencer directement à allure très lente", zones: ["Z1"] },
      { part: "Main", text: "30-45 min en Z1 STRICT (< 70% FCmax). Allure : beaucoup plus lente qu'on ne pense nécessaire. Test : capable de chanter une chanson complète en courant (pas juste des mots — une chanson entière). Réf : Seiler 2010 — 'La plupart des athlètes font leurs séances de récupération trop vite et leurs séances intensives trop lentement. Résultat : tout se retrouve en Z3.' Cette séance doit se terminer avec l'impression de ne pas avoir vraiment couru — c'est le signe qu'elle est correcte.", zones: ["Z1"] },
      { part: "Cool-down", text: "Marche 5 min + mobilité 10 min", zones: ["Z1"] }
    ],
    variants: {
      ironman: "40-50 min Z1 strict ou vélo Z1 30 min (alternative)",
      half: "35-45 min Z1 strict",
      marathon: "35-45 min Z1 strict — critique après longues sorties",
      semi: "30-40 min Z1 strict"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 5 — PROGRESSIONS SEILER
// Évolution du modèle sur 6-12 semaines
// ─────────────────────────────────────────────

  {
    id: "SEILER_RUN_PROGRESSION_4TO8",
    cat: "B",
    sport: "course",
    objectif: "Progression Seiler 4→8min — évolution naturelle des intervalles dans le modèle polarisé",
    necessite: "Recommandé",
    when: "Build — après 4-6 semaines de 4×4min. Progression naturelle vers plus de temps à VO2max.",
    phase: ["build"],
    avoid: "Sans base solide de 4×4min (minimum 4 semaines) · Fatigue élevée",
    durationMin: [60, 75],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Seiler", "progression", "4x4", "4x8", "VO2max", "polarisé", "évolution"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 + 2×1 min Z5 R:2 min", zones: ["Z1", "Z2", "Z5"] },
      { part: "Main", text: "Semaines 1-2 : 4×4 min Z5 R:3 min (standard). Semaines 3-4 : 4×5 min Z4-Z5 R:3 min. Semaines 5-6 : 4×6 min Z4 R:3 min. Semaines 7-8 : 4×8 min Z4 R:4 min. Réf : Seiler 2013 — 'La progression optimale dans le modèle polarisé est d'allonger la durée des intervalles (4→6→8→10 min) tout en maintenant la récupération à 3-4 min actifs. Ne pas augmenter le nombre de répétitions ni réduire la récupération.' L'intensité diminue légèrement (95%FCmax → 91%FCmax) mais le temps total à VO2max augmente de 8 min (4×4min) à 32 min (4×8min).", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "12 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Progression identique — adapter semaines 5-8 en vélo si charge course élevée",
      half: "Progression complète 8 semaines",
      marathon: "Progression identique — fondamentale pour développer VO2max marathon",
      semi: "Progression identique"
    }
  },

  {
    id: "SEILER_BIKE_PROGRESSION_POLARIZED",
    cat: "B",
    sport: "cyclisme",
    objectif: "Progression polarisée Seiler vélo — évolution 4×4min → 4×8min → 4×12min sur 12 semaines",
    necessite: "Recommandé",
    when: "Build — programme 12 semaines de développement VO2max vélo selon Seiler.",
    phase: ["build"],
    avoid: "Sauter des étapes de progression · Fatigue chronique",
    durationMin: [65, 80],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Seiler", "progression", "vélo", "polarisé", "VO2max", "12 semaines"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 + 2×2 min à 100% FTP R:2 min", zones: ["Z1", "Z2", "Z4"] },
      { part: "Main", text: "Programme progression Seiler vélo : Semaines 1-3 : 4×4 min à 108-115% FTP R:3 min. Semaines 4-6 : 4×6 min à 106-112% FTP R:3 min. Semaines 7-9 : 4×8 min à 104-110% FTP R:4 min. Semaines 10-12 : 4×10-12 min à 102-108% FTP R:4 min. Maintenir 80% du volume total en Z1-Z2 sur toute la période. La séance haute intensité est TOUJOURS 1-2 fois/semaine maximum. Réf : Seiler 2013 — '10-12 min à intensité sous-maximale (102-108% FTP) avec 4 min de récup produit les meilleures adaptations à long terme.'", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "15 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Programme complet 12 semaines en début de saison — base VO2max IM",
      half: "Programme 8 semaines (semaines 1-8 uniquement)",
      marathon: "Support secondaire",
      semi: "Support secondaire"
    }
  },

  {
    id: "COGGAN_BIKE_ZONE6_AC_SHORT",
    cat: "B",
    sport: "cyclisme",
    objectif: "Zone 6 Coggan — capacité anaérobie courte (30-60s) pour développer le W' et la tolérance lactate",
    necessite: "Recommandé",
    when: "Build/Peak — 1x/semaine. Développe la réserve anaérobie (W') essentielle pour les attaques, relances et finales.",
    phase: ["build", "peak"],
    avoid: "VLamax > 0.65 (déjà glycolytique, risque de surcharge) · Fatigue > 7/10 · IM longue distance (non prioritaire)",
    durationMin: [55, 70],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Coggan", "Zone 6", "AC", "capacité anaérobie", "W prime", "30s", "60s", "lactate"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 progressif + 3×20s à 130% FTP R:2 min (activation neuromusculaire)", zones: ["Z1", "Z2", "Z6"] },
      { part: "Main", text: "Protocole Zone 6 Coggan : 3 séries de 4×[30s à 130-140% FTP + 90s récup 45% FTP]. Récup entre séries : 5 min Z1. Cadence haute 100-115 rpm pour maximiser le recrutement neuromusculaire. LOGIQUE W' : chaque répétition de 30s puise dans le W' (réserve anaérobie). La récup de 90s permet une reconstitution partielle du W' (Skiba 2012 : ~40-50% reconstitution en 90s). L'accumulation sur 12 répétitions crée une déplétion progressive du W' — c'est exactement ce stimulus qui force l'organisme à augmenter la taille de cette réserve. Surveiller : si la puissance chute > 10% sur les dernières répétitions d'une série → récup entre séries insuffisante ou W' déjà épuisé. Réf : Coggan 2010 — Zone 6 développe la capacité à produire de la puissance au-dessus du CP pendant des durées courtes.", zones: ["Z6", "Z7", "Z1"] },
      { part: "Cool-down", text: "15 min Z1 cadence libre. Cette séance génère beaucoup de lactate — la récupération active est essentielle.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Rare — 2 séries de 3×30s uniquement si W' faible identifié au diagnostic",
      half: "3 séries de 3×30s — pour les relances en course",
      marathon: "Non applicable",
      semi: "3 séries de 3×30s — utile pour les changements de rythme en triathlon"
    }
  },

  {
    id: "COGGAN_BIKE_ZONE6_AC_LONG",
    cat: "B",
    sport: "cyclisme",
    objectif: "Zone 6 Coggan longue — capacité anaérobie 60-120s pour développer W' et tolérance acidose",
    necessite: "Recommandé",
    when: "Build — après 3-4 semaines de Zone 6 courte. Durées plus longues pour plus de temps en Zone 6.",
    phase: ["build"],
    avoid: "VLamax > 0.60 · Fatigue élevée · Objectif endurance pure (IM, marathon)",
    durationMin: [60, 75],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Coggan", "Zone 6", "AC", "120s", "W prime", "acidose", "tolérance"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 + 2×30s à 130% FTP R:3 min", zones: ["Z1", "Z2", "Z6"] },
      { part: "Main", text: "2 séries de 3×[60s à 125-135% FTP + 3 min récup 45% FTP]. Puis 2×[90s à 122-130% FTP + 4 min récup]. Récup entre séries : 6 min Z1. La récupération longue (3-4 min) après les efforts de 60-90s permet une meilleure reconstitution du W' et maintient la qualité sur toutes les répétitions. Réf : Skiba 2012 — le modèle W'bal montre qu'un effort de 60s à 130% FTP dépense ~60% du W' moyen. Avec 3 min de récup à 45% FTP, ~65% du W' est reconstitué — permettant la répétition suivante.", zones: ["Z6", "Z7", "Z1"] },
      { part: "Cool-down", text: "15 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Non recommandé",
      half: "2 séries de 2×60s + 2×90s — pour les relances 70.3",
      marathon: "Non applicable",
      semi: "2 séries de 2×60s + 2×90s"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 2 — ZONE 7 — PUISSANCE NEUROMUSCULAIRE
// >150% FTP — sprints courts, force neuromusculaire
// ─────────────────────────────────────────────

  {
    id: "COGGAN_BIKE_ZONE7_NEURO",
    cat: "B",
    sport: "cyclisme",
    objectif: "Zone 7 Coggan — puissance neuromusculaire maximale (sprints 5-15s, >150% FTP)",
    necessite: "Recommandé",
    when: "Base/Build — 1x/semaine. Développe la Pmax, le recrutement neuromusculaire et la VLamax haute.",
    phase: ["base", "build"],
    avoid: "VLamax > 0.70 (déjà très glycolytique) · Objectif IM (contre-productif) · Fatigue neuromusculaire",
    durationMin: [50, 65],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Coggan", "Zone 7", "neuromusculaire", "sprint", "Pmax", "5s", "10s", "15s"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 + 3×10s sprint départ arrêté R:3 min (activation neuromusculaire complète)", zones: ["Z1", "Z2", "Z7"] },
      { part: "Main", text: "Protocole Zone 7 Coggan : 10-12×[8-12s sprint maximal all-out départ arrêté ou lancé + 3-4 min récup Z1 COMPLÈTE]. Développement fixe (braquets 50×14 ou 50×13 selon niveau). Objectif : puissance pic maximale sur chaque répétition. Cadence : démarrer à 50-60 rpm (force) et accélérer jusqu'à 120-130 rpm en fin de sprint. La récupération DOIT être complète (3-4 min) — si récup < 2 min, la répétition suivante n'est plus Zone 7 (puissance insuffisante). LOGIQUE COGGAN Zone 7 : ces sprints courts recrutent 100% des fibres musculaires y compris les fibres rapides de Type IIx, développant le potentiel de puissance absolue qui 'plafonne' toutes les autres zones. Un athlète avec Pmax élevée aura proportionnellement plus de réserve pour les Zones 4-6.", zones: ["Z7"] },
      { part: "Cool-down", text: "15 min Z1 cadence libre + étirements quadriceps", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Non recommandé — contre-productif pour profil IM",
      half: "6-8×10s sprint — maintien puissance neuromusculaire en triathlon",
      marathon: "Non applicable",
      semi: "6-8×10s sprint — maintien Pmax"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 3 — CRITICAL POWER INTERVALS
// Séances autour du CP — développement de la frontière CP/W'
// ─────────────────────────────────────────────

  {
    id: "COGGAN_BIKE_CP_OVER_UNDER",
    cat: "B",
    sport: "cyclisme",
    objectif: "Over-Under Coggan — intervalles alternant au-dessus et en-dessous du CP pour développer la puissance critique",
    necessite: "Recommandé",
    when: "Build/Peak — séance clé pour repousser le CP vers le haut et améliorer la tolérance à la zone de transition.",
    phase: ["build", "peak"],
    avoid: "Fatigue > 6/10 · VLamax > 0.55 · Moins de 3 semaines d'entraînement régulier à ce niveau",
    durationMin: [65, 80],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Coggan", "Over-Under", "CP", "FTP", "Critical Power", "Zone 4", "Zone 5"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 + 2×2 min à 95% FTP R:2 min", zones: ["Z1", "Z2", "Z4"] },
      { part: "Main", text: "3-4×[10 min Over-Under] R:4 min Z1. Structure de chaque bloc de 10 min : 2 min à 85% FTP (Under — sous le CP) + 1 min à 110% FTP (Over — au-dessus du CP) × répété sur 10 min. LOGIQUE COGGAN Over-Under : les phases 'Under' maintiennent le lactate à ~2-3 mmol/L. Les phases 'Over' font monter le lactate rapidement à 4-6 mmol/L. L'alternance force le système tampon à travailler répétitivement — adaptant les enzymes tampons et repoussant le CP vers le haut. Réf : Coggan 2010 — 'Les Over-Unders sont la façon la plus efficace d'améliorer simultanément le CP et la tolérance à l'acidose.' Observer : la puissance ne doit pas chuter sur les phases Over au fil du bloc — si baisse > 5% → intensité too élevée.", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "15 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2×10 min Over-Under (85/105% FTP) — amélioration CP sans fatigue excessive",
      half: "3×10 min Over-Under (85/110% FTP)",
      marathon: "Non applicable",
      semi: "3×10 min Over-Under (85/112% FTP)"
    }
  },

  {
    id: "COGGAN_BIKE_CP_DEPLETION",
    cat: "C",
    sport: "cyclisme",
    objectif: "Déplétion W' Coggan — vider intentionnellement le W' pour créer un stimulus d'adaptation maximal",
    necessite: "Optionnel",
    when: "Build — 1x/2 semaines maximum. Séance très exigeante — réservée aux athlètes avancés.",
    phase: ["build"],
    avoid: "Athlètes débutants · Fatigue > 5/10 · Semaine de compétition · VLamax > 0.55",
    durationMin: [55, 70],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Coggan", "W prime", "déplétion", "CP", "adaptation", "avancé", "Skiba"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 + 3×30s à 120% FTP R:2 min", zones: ["Z1", "Z2", "Z5"] },
      { part: "Main", text: "Protocole déplétion W' : Bloc 1 — 3×2 min à 120% FTP R:2 min (dépense ~60% du W'). Récup 5 min Z1 (reconstitution ~40% du W'). Bloc 2 — 2×90s à 125% FTP R:90s (dépense ~30% du W' restant). Récup 4 min. Bloc 3 — 4×30s à 140% FTP R:1 min (vidage final du W'). Objectif : arriver à W' ≈ 0 sur la dernière répétition du Bloc 3 (sensation d'impossibilité totale de continuer). Réf : Skiba 2012 — la déplétion complète du W' crée le stimulus d'adaptation le plus puissant pour augmenter le W' sur 3-4 semaines. Mais la récupération post-séance est longue (48-72h).", zones: ["Z5", "Z6", "Z7"] },
      { part: "Cool-down", text: "20 min Z1 — récupération active critique après déplétion W'. 72h avant prochaine séance intense.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Non recommandé",
      half: "Bloc 1 + Bloc 2 uniquement (pas déplétion complète)",
      marathon: "Non applicable",
      semi: "Bloc 1 + Bloc 2 uniquement"
    }
  },

  {
    id: "COGGAN_RUN_CP_INTERVALS",
    cat: "B",
    sport: "course",
    objectif: "Intervalles CP Coggan course — développement de la puissance critique running autour de la vitesse critique",
    necessite: "Recommandé",
    when: "Build/Peak — équivalent course des Over-Under vélo. Développe la vitesse critique (CV).",
    phase: ["build", "peak"],
    avoid: "Blessure en cours · Fatigue > 6/10 · VLamax > 0.65",
    durationMin: [55, 70],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Coggan", "CP", "vitesse critique", "course", "Over-Under", "seuil"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 + 3×1 min à allure seuil R:90s", zones: ["Z1", "Z2", "Z4"] },
      { part: "Main", text: "3×[10 min Over-Under] R:3 min Z1. Structure de chaque bloc 10 min : 3 min à 88-90% VMA (Under — juste sous la vitesse critique) + 2 min à 95-100% VMA (Over — juste au-dessus). Répéter sur 10 min (= 2 cycles Under/Over). Adapté de Coggan au running : la vitesse critique course (CV) correspond approximativement à l'allure 30-40 min de course. Les Over-Unders autour de cette vitesse créent la même adaptation que vélo — amélioration de la CV et de la tolérance au lactate. Observer : allure stable sur les phases Over, pas de décrochage en fin de bloc.", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "12 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2×10 min Over-Under (87/93% VMA)",
      half: "3×10 min Over-Under (88/96% VMA)",
      marathon: "3×10 min Over-Under (88/95% VMA)",
      semi: "3×10 min Over-Under (89/97% VMA)"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 4 — SWEET SPOT AVANCÉ (Coggan Z3-Z4)
// 88-93% FTP — meilleur ratio stimulus/fatigue
// ─────────────────────────────────────────────

  {
    id: "COGGAN_BIKE_SST_EXTENDED",
    cat: "B",
    sport: "cyclisme",
    objectif: "Sweet Spot étendu Coggan — blocs longs 88-93% FTP pour adaptation TTE et résistance à la fatigue",
    necessite: "Obligatoire",
    when: "Build — 1-2x/semaine. Le meilleur ratio stimulus/fatigue dans les 7 zones Coggan.",
    phase: ["build"],
    avoid: "Fatigue > 7/10 · VLamax > 0.60 (risque d'accumulation lactate)",
    durationMin: [75, 100],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Coggan", "Sweet Spot", "SST", "88-93% FTP", "Z4", "TTE", "ratio stimulus"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 progressif. Cadence 85-90 rpm.", zones: ["Z1", "Z2"] },
      { part: "Main", text: "2-3×20 min à 88-93% FTP R:5 min Z1. Cadence 85-95 rpm. RPE 7.5/10 — 'dur mais soutenable, phrases courtes'. POURQUOI LE SWEET SPOT : Coggan 2010 — à 88-93% FTP (entre Z3 et Z4), l'intensité est suffisamment haute pour stimuler des adaptations physiologiques profondes (amélioration FTP, densité mitochondriale, efficacité lipidique) mais pas assez haute pour créer une fatigue excessive qui réduirait le volume total. C'est la zone avec le meilleur ROI (return on investment) en endurance. La règle Coggan : 'Une heure en Sweet Spot vaut deux heures en Z2 pour le développement du FTP.' Observer : puissance NP stable sur tout le bloc (±5W), FC en plateau sans dérive, RPE qui monte légèrement mais reste gérable.", zones: ["Z4"] },
      { part: "Cool-down", text: "15 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2×20 min à 88-90% FTP — fondamental préparation IM",
      half: "3×15 min à 89-92% FTP",
      marathon: "Support secondaire — vélo cross-training",
      semi: "2×20 min à 89-92% FTP"
    }
  },

  {
    id: "COGGAN_BIKE_SST_PROGRESSIVE",
    cat: "B",
    sport: "cyclisme",
    objectif: "Sweet Spot progressif Coggan — bloc SST avec montée vers Zone 4 FTP en fin de séance",
    necessite: "Recommandé",
    when: "Build/Peak — progression naturelle du SST vers le travail FTP.",
    phase: ["build", "peak"],
    avoid: "Fatigue > 6/10 · Sans base SST standard (3-4 semaines minimum)",
    durationMin: [80, 105],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Coggan", "Sweet Spot", "progressif", "FTP", "Zone 4", "progression"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Bloc 1 : 2×15 min à 88-90% FTP R:4 min. Bloc 2 : 1×15 min à 92-95% FTP R:4 min. Bloc 3 : 1×10 min à 97-102% FTP (zone FTP exacte). Récup entre blocs : 5 min Z1. La progression intra-séance simule la montée en intensité d'une course — l'athlète apprend à pousser l'intensité progressivement sur legs pré-fatiguées par le SST. Réf : Coggan 2010 — 'La progression au sein d'une même séance développe la capacité à changer de 'gear' métabolique et à maintenir la puissance en fin d'effort.'", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "15 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "B1: 2×15 min 88% FTP. B2: 1×12 min 92% FTP. B3: 1×8 min 97% FTP",
      half: "B1: 2×15 min 89% FTP. B2: 1×12 min 93% FTP. B3: 1×10 min 99% FTP",
      marathon: "Support secondaire",
      semi: "B1: 2×12 min 90% FTP. B2: 1×10 min 94% FTP. B3: 1×8 min 100% FTP"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 5 — ZONE 5 VO2MAX (106-120% FTP)
// Coggan Zone 5 — développement VO2max via la puissance
// ─────────────────────────────────────────────

  {
    id: "COGGAN_BIKE_ZONE5_MAP",
    cat: "B",
    sport: "cyclisme",
    objectif: "Zone 5 Coggan — VO2max via puissance MAP (106-120% FTP) pour développement plafond aérobie",
    necessite: "Recommandé",
    when: "Build/Peak — 1-2x/semaine en bloc VO2max. Complémentaire au Sweet Spot.",
    phase: ["build", "peak"],
    avoid: "VLamax > 0.60 · Fatigue > 7/10 · Période de compétition dense",
    durationMin: [60, 80],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Coggan", "Zone 5", "VO2max", "MAP", "106-120% FTP", "plafond aérobie"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 + 3×1 min à 105% FTP R:2 min + 2×30s à 120% FTP R:3 min", zones: ["Z1", "Z2", "Z4", "Z5"] },
      { part: "Main", text: "5-6×3-4 min à 108-115% FTP R:3 min 50% FTP. Cadence 90-100 rpm. FC cible sur les 2 dernières minutes : 90-95% FCmax. COGGAN ZONE 5 vs Billat : même objectif (VO2max) mais approche par la puissance vs l'allure. L'avantage Coggan : contrôle précis via wattmètre, indépendant des conditions extérieures. L'athlète peut voir en temps réel s'il est en Zone 5 (106-120% FTP). Progression : S1=4×3min, S2=5×3min, S3=5×4min, S4=6×4min. Réf : Coggan 2010 — 'La Zone 5 développe la puissance aérobie maximale (MAP) et repousse vers le haut le plafond de toutes les autres zones.'", zones: ["Z5", "Z6"] },
      { part: "Cool-down", text: "15 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "4×3 min à 108-112% FTP — blocs VO2max courts",
      half: "5×3 min à 110-115% FTP",
      marathon: "Support secondaire",
      semi: "5-6×3 min à 110-115% FTP"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 6 — TEST FTP COGGAN
// Protocoles de mesure du FTP selon Coggan
// ─────────────────────────────────────────────

  {
    id: "COGGAN_BIKE_FTP_TEST_20MIN",
    cat: "C",
    sport: "cyclisme",
    objectif: "Test FTP 20min Coggan — protocole officiel de mesure du Functional Threshold Power",
    necessite: "Obligatoire",
    when: "Base/Build — toutes les 4-6 semaines. Calibration des zones de puissance.",
    phase: ["base", "build"],
    avoid: "Fatigue > 4/10 · Moins de 48h depuis dernière séance intense · Sans capteur puissance précis",
    durationMin: [60, 75],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Coggan", "test FTP", "20min", "diagnostic", "zones", "calibration"],
    structure: [
      { part: "Warm-up", text: "20 min progressif Z1→Z2 + 3×1 min à 100-105% FTP R:2 min + 5 min Z2 + 5 min Z1 (récup avant test).", zones: ["Z1", "Z2", "Z4"] },
      { part: "Main", text: "20 min all-out à puissance la plus élevée possible maintenue de façon stable. RÈGLE COGGAN : partir légèrement conservateur (110% FTP estimée les 2 premières minutes) et monter progressivement. Éviter le départ trop rapide — la plupart des athlètes partent 10-15% trop vite. Technique : surveiller la puissance toutes les 5 min, légère progression si possible. FTP = P_moy_20min × 0.95. Réf : Coggan 2010 — 'Le test 20min × 0.95 est une approximation du FTP (60min) qui évite la fatigue excessive d'un test 60min.' Enregistrer : P moy 20min, P normalisée (NP) 20min, FC moy 20min, FC pic, RPE.", zones: ["Z4", "Z5", "Z6"] },
      { part: "Cool-down", text: "15 min Z1. Entrer immédiatement le FTP dans TFCLab pour recalibrer toutes les zones.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Test standard — FTP IM est le même FTP Coggan",
      half: "Test standard",
      marathon: "Support diagnostic",
      semi: "Test standard"
    }
  },

  {
    id: "COGGAN_BIKE_FTP_RAMP_TEST",
    cat: "C",
    sport: "cyclisme",
    objectif: "Ramp Test Coggan — test FTP progressif par paliers (alternative moins pénible au test 20min)",
    necessite: "Recommandé",
    when: "Base — alternative au test 20min. Moins de fatigue, moins d'expérience requise pour le pacing.",
    phase: ["base"],
    avoid: "Home trainer sans résistance contrôlable · Sans capteur puissance",
    durationMin: [25, 35],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Coggan", "Ramp Test", "FTP", "test", "paliers", "diagnostic", "calibration"],
    structure: [
      { part: "Warm-up", text: "10 min Z1 progressif. Cadence 85-90 rpm.", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Protocole Ramp Test Coggan : partir à 50% FTP estimée. Augmenter de 20W (ou 10-15%) toutes les 1 min. Continuer jusqu'à épuisement complet (impossible de maintenir la puissance du palier). Mesurer : puissance maximale du dernier palier COMPLÉTÉ. FTP estimée = puissance max palier × 0.75 (Coggan-Zwift adaptation). Avantage : pas de pacing requis, test court, reproductible. Inconvénient : moins précis que le 20min pour les athlètes bien entraînés (±5-8%). Cadence : maintenir 85-90 rpm sur tous les paliers, même les derniers.", zones: ["Z4", "Z5", "Z6", "Z7"] },
      { part: "Cool-down", text: "10 min Z1. Calculer FTP = puissance dernier palier × 0.75. Entrer dans TFCLab.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Test standard — à faire toutes les 6-8 semaines",
      half: "Test standard",
      marathon: "Support",
      semi: "Test standard"
    }
  },

// ─────────────────────────────────────────────
// GROUPE 7 — SKIBA / W'BAL RECONSTITUTION
// Gestion du W' en entraînement et compétition
// ─────────────────────────────────────────────

  {
    id: "SKIBA_BIKE_WPRIME_RECHARGE",
    cat: "B",
    sport: "cyclisme",
    objectif: "Reconstitution W' Skiba — entraîner la reconstitution rapide du W' pour répéter les efforts intenses",
    necessite: "Recommandé",
    when: "Build/Peak — développe la capacité à 'recharger' le W' rapidement entre les efforts intenses.",
    phase: ["build", "peak"],
    avoid: "VLamax > 0.65 · Fatigue > 7/10 · Sans capteur de puissance",
    durationMin: [55, 70],
    metricKey: "puissance",
    sportKey: "cyclisme",
    defaultSportId: 14,
    tags: ["Skiba", "W prime", "reconstitution", "W'bal", "récupération", "Coggan", "intervalles"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 + 2×30s à 130% FTP R:3 min", zones: ["Z1", "Z2", "Z6"] },
      { part: "Main", text: "3 séries de [2 min à 120% FTP (dépense ~50% W') + 2 min récup 40% FTP (reconstitution ~35% W') + 1 min à 125% FTP (dépense ~40% W' restant) + 4 min récup 40% FTP (reconstitution ~65% W')]. Récup entre séries : 6 min. LOGIQUE SKIBA W'BAL : Skiba 2012 montre que la reconstitution du W' est exponentielle — elle est rapide au début de la récup et ralentit ensuite. L'entraînement spécifique de ce pattern (déplétion partielle + courte récup + nouvelle déplétion) entraîne l'organisme à reconstituer le W' plus rapidement. Résultat après 4-6 semaines : capacité à répéter les accélérations en course avec des récupérations plus courtes.", zones: ["Z6", "Z7", "Z1"] },
      { part: "Cool-down", text: "15 min Z1", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Non prioritaire — rare en IM",
      half: "2 séries — pour les relances et montées en 70.3",
      marathon: "Non applicable",
      semi: "3 séries — utile pour le run en triathlon sprint/olympique"
    }
  },

  {
    id: "SKIBA_RUN_WPRIME_INTERVALS",
    cat: "B",
    sport: "course",
    objectif: "W' intervals Skiba course — développer et entraîner la gestion du W' en running",
    necessite: "Recommandé",
    when: "Build/Peak — spécifique course à pied. Développe la capacité à accélérer sur jambes fatiguées.",
    phase: ["build", "peak"],
    avoid: "Blessure · VLamax > 0.65 · Fatigue > 7/10",
    durationMin: [50, 65],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Skiba", "W prime", "course", "W'bal", "accélérations", "répétitions"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 + 3×30s à VMA R:90s", zones: ["Z1", "Z2", "Z5"] },
      { part: "Main", text: "Protocole W'bal course : 3 séries de [2 min à 105-110% VMA (dépense W') + 2 min récup active Z1 (reconstitution partielle W') + 1 min à 110-115% VMA (dépense W' restant) + 3 min récup Z1]. Récup entre séries : 5 min. Réf : Skiba 2012 adapté course — la vitesse critique course (CV ≈ VMA × 0.88) est l'équivalent du CP vélo. Les efforts > CV puisent dans le W'. Cet entraînement développe à la fois le W' (réserve) et la capacité de reconstitution entre les efforts. En compétition : permet de placer une accélération décisive après une phase difficile.", zones: ["Z5", "Z6", "Z1"] },
      { part: "Cool-down", text: "12 min Z1 + marche 5 min", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2 séries uniquement — maintien de la capacité à relancer",
      half: "3 séries — pour les changements de rythme en 70.3",
      marathon: "2 séries — pour les accélérations en km 30-42",
      semi: "3 séries — pour les changements de rythme semi"
    }
  },


  {
    id: "LYDIARD_RUN_AEROBIC_BASE_LONG",
    cat: "A",
    sport: "course",
    objectif: "Base aérobie Lydiard — sortie longue fondamentale pour construire le moteur aérobie (phase 1)",
    necessite: "Obligatoire",
    when: "Base — pilier de la phase 1 Lydiard. 1x/semaine weekend. Volume progressif sur 16-24 semaines.",
    phase: ["base"],
    avoid: "Dériver vers Z3 ou plus (détruit l'objectif) · Phase Build ou Peak (trop tard pour la base) · Terrain trop technique",
    durationMin: [90, 180],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Lydiard", "base aérobie", "sortie longue", "Z2", "fondamental", "volume", "moteur aérobie"],
    structure: [
      { part: "Warm-up", text: "Intégré — les 15 premières minutes sont l'échauffement naturel en Z1.", zones: ["Z1"] },
      { part: "Main", text: "90-150 min en Z1-Z2 strict. PHILOSOPHIE LYDIARD : 'La course aérobie développe le cœur, les poumons, les muscles et le système vasculaire. Sans cette base, la vitesse n'a aucun fondement.' Allure : conversation complète possible. FC < 75% FCmax STRICTEMENT. Pour un coureur avec FCmax 185 : rester sous 139 bpm. Progression Lydiard sur 24 semaines : S1=90 min, S4=110 min, S8=130 min, S12=150 min, S16=165 min, S20=180 min. La DURÉE augmente, pas l'intensité. Lydiard prescrivait même des marches si la FC montait trop. Cette base développe : densité capillaire, densité mitochondriale, enzymes aérobies, économie de course, volume sanguin, efficacité cardiaque.", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "Intégré — les 10 dernières minutes naturellement plus lentes. Étirements doux.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "120-180 min Z1-Z2 — équivalent triathlon de la base Lydiard",
      half: "90-120 min Z1-Z2 — 1x/semaine en base",
      marathon: "PRIORITÉ ABSOLUE — 120-165 min. La sortie longue Lydiard est le fondement du marathon.",
      semi: "90-110 min Z1-Z2 — 1x/semaine"
    }
  },
  {
    id: "LYDIARD_RUN_AEROBIC_BASE_MEDIUM",
    cat: "A",
    sport: "course",
    objectif: "Volume aérobie Lydiard — sortie medium quotidienne (40-60 min Z2) pour accumulation km",
    necessite: "Obligatoire",
    when: "Base — séance quotidienne ou quasi-quotidienne. Le volume total hebdomadaire est la clé Lydiard.",
    phase: ["base"],
    avoid: "Intensité > Z2 · Phase de Build ou Peak",
    durationMin: [40, 70],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Lydiard", "base aérobie", "quotidien", "Z1", "Z2", "volume", "accumulation"],
    structure: [
      { part: "Warm-up", text: "Intégré — départ très progressif 5 min Z1.", zones: ["Z1"] },
      { part: "Main", text: "40-60 min en Z1-Z2. Cette séance est volontairement courte et facile — c'est son but. Lydiard prescrivait des doubles journées : matin 40-60 min Z1, soir 40-60 min Z1. Le volume hebdomadaire total (pas l'intensité de chaque séance) crée l'adaptation. RÈGLE LYDIARD : 'Il vaut mieux courir 100 km/semaine à Z1-Z2 que 60 km/semaine avec trop d'intensité.' Pour les Age Groupers : 6×50 min Z2/semaine = 300 min de base aérobie pure. Résultat sur 12-16 semaines : augmentation naturelle de la VMA de 5-12% sans aucune séance intense.", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "Marche 5 min + mobilité légère", zones: ["Z1"] }
    ],
    variants: {
      ironman: "50-60 min Z2 — 5-6x/semaine en phase base (avec vélo et natation)",
      half: "45-55 min Z2 — 5x/semaine",
      marathon: "50-60 min Z2 — 6x/semaine. Volume total cible 80-100 km/semaine.",
      semi: "40-50 min Z2 — 5x/semaine"
    }
  },
  {
    id: "LYDIARD_RUN_HILL_CIRCUIT",
    cat: "B",
    sport: "course",
    objectif: "Circuit collines Lydiard — développement force-endurance spécifique course (phase 2)",
    necessite: "Recommandé",
    when: "Build — phase 2 Lydiard, après 8-16 semaines de base aérobie complète. 2x/semaine.",
    phase: ["build"],
    avoid: "Sans base aérobie complète (Lydiard : 'Les collines sans base = blessure') · Terrain trop raide (> 15%)",
    durationMin: [55, 75],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Lydiard", "collines", "hill training", "force", "économie", "phase 2"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 terrain plat + mobilité hanches et mollets", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Circuit collines Lydiard : 6-10 répétitions sur une côte de 200-400m (pente 5-8%). Montée : effort soutenu mais contrôlé (Z3-Z4, pas de sprint). Focus technique : levée de genoux, bras actifs, regard vers le haut. Descente : trot de récupération Z1 (économie + excentrique). Puis 4-6×[150m en accélération légère en bas de côte + retour trot]. Total côtes : 25-40 min. Réf : Lydiard 1978 — 'Le travail en côte développe la force musculaire spécifique, l'économie de foulée et la résistance à la fatigue sans le stress neuromusculaire du sprint piste.' Lydiard utilisait les collines comme transition naturelle entre la base Z2 et le travail de piste.", zones: ["Z3", "Z4", "Z1"] },
      { part: "Cool-down", text: "10 min Z1 terrain plat + étirements ischio-jambiers", zones: ["Z1"] }
    ],
    variants: {
      ironman: "6 répétitions collines 200m — entretien force sans fatigue excessive",
      half: "8 répétitions 250m — transition base→build",
      marathon: "10 répétitions 300m — clé du développement force-endurance marathon",
      semi: "8 répétitions 250m"
    }
  },
  {
    id: "LYDIARD_RUN_HILL_BOUNDING",
    cat: "B",
    sport: "course",
    objectif: "Bondissements en côte Lydiard — développement force explosive et économie neuromusculaire",
    necessite: "Recommandé",
    when: "Build — phase 2 Lydiard avancée. Après 3-4 semaines de circuit collines.",
    phase: ["build"],
    avoid: "Sans base collines préalable · Douleur genou ou tendon · Terrain humide glissant",
    durationMin: [50, 65],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Lydiard", "bondissements", "côte", "force", "explosivité", "économie neuromusculaire"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 + mobilité complète + 3×50m strides progressifs sur plat", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Protocole bondissements Lydiard : 6-8×[60-80m de bondissements en côte (5-8%) + descente trot Z1]. Types de bondissements en alternance : A) Foulées bondissantes (triple extension complète, suspension prononcée). B) Montée genoux haute (levée maximale, contact sol minimal). C) Talons-fesses (recrutement ischio spécifique). 2 répétitions de chaque type. Réf : Lydiard 1978 — 'Les bondissements en côte développent l'élasticité musculaire et l'économie de foulée en un seul stimulus. C'est le pont entre la force brute et la vitesse élégante.' Terminer par 2×150m allure seuil sur plat (transfert immédiat).", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "10 min Z1 + étirements quadriceps et mollets", zones: ["Z1"] }
    ],
    variants: {
      ironman: "6 répétitions légères — maintien économie",
      half: "8 répétitions — développement économie avant phase build",
      marathon: "8 répétitions — clé économie Lydiard",
      semi: "8 répétitions"
    }
  },
  {
    id: "LYDIARD_RUN_TRACK_VMA",
    cat: "B",
    sport: "course",
    objectif: "Piste Lydiard — intervalles VMA sur base aérobie développée (phase 3)",
    necessite: "Recommandé",
    when: "Build/Peak — phase 3 Lydiard. Après 16-24 semaines de base + 4-6 semaines de collines.",
    phase: ["build", "peak"],
    avoid: "Sans base aérobie et collines complètes · Directement en phase base",
    durationMin: [55, 70],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Lydiard", "piste", "VMA", "intervalles", "phase 3", "vitesse", "track"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 + gammes athlétisme (talon-fesses, montée genoux, skipping) + 3×100m progressifs", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Protocole piste Lydiard : 6-12×400m à VMA (100% VMA) R:200m trot Z1. Puis 4×200m à 105-108% VMA R:200m trot. Lydiard : 'Le travail de piste ne vient QU'APRÈS la base aérobie complète. Un athlète avec une solide base peut tenir des intervalles de haute qualité semaine après semaine. Sans la base, les intervalles créent de la fatigue sans amélioration.' Différence clé Lydiard vs méthodes modernes : la base est TELLEMENT longue (16-24 semaines) que quand la piste arrive, le corps est parfaitement préparé et progresse rapidement.", zones: ["Z5", "Z6"] },
      { part: "Cool-down", text: "15 min Z1 footing lent + étirements", zones: ["Z1"] }
    ],
    variants: {
      ironman: "6×400m VMA — développement VMA post-base",
      half: "8×400m VMA + 4×200m rapides",
      marathon: "10×400m VMA — construction vitesse pour tenir allure marathon",
      semi: "10-12×400m VMA + 4×200m"
    }
  },
  {
    id: "KENYAN_RUN_FARTLEK_PYRAMID",
    cat: "B",
    sport: "course",
    objectif: "Fartlek pyramide kényan — surges progressifs en terrain naturel (méthode Kipchoge/Sang)",
    necessite: "Recommandé",
    when: "Build — séance de mi-semaine kényane. En terrain vallonné idéalement.",
    phase: ["build"],
    avoid: "Terrain plat artificiel (contre l'esprit kényan) · Montre GPS trop contraignante",
    durationMin: [75, 100],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Kenyan", "Kipchoge", "Fartlek", "pyramide", "terrain naturel", "surges", "Patrick Sang"],
    structure: [
      { part: "Warm-up", text: "20 min Z1-Z2 terrain naturel. Les Kényans courent pieds nus ou avec sandales les 5 premières minutes — si possible, 3 min d'activation sur terre battue.", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Fartlek pyramide Kipchoge : 2-3-5-7-5-3-2 min à 90-95% VMA avec récup trot égale entre chaque. Total temps intense : 27 min. Terrain : idéalement vallonné (accélérer dans les montées, récup en descente). PHILOSOPHIE KÉNYANE : les coureurs kényans font ce Fartlek en groupe, au feeling, sans montre. Le rythme naturel du groupe est auto-régulé. L'absence de pression technologique favorise l'écoute du corps. Réf : Larsen 2003 — 'Le Fartlek kényan combine simultanément le développement du seuil, du VO2max et de la force en côte, tout en maintenant le plaisir et la social bonding du groupe.'", zones: ["Z4", "Z5", "Z6"] },
      { part: "Cool-down", text: "15 min Z1 terrain naturel + étirements au sol", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2-3-5-3-2 min (version courte) — développe polyvalence pace",
      half: "2-3-5-7-5-3-2 min — séance complète",
      marathon: "2-3-5-7-5-3-2 min — clé du build marathon kényan",
      semi: "2-3-5-7-5-3-2 min"
    }
  },
  {
    id: "KENYAN_RUN_FARTLEK_SURGE",
    cat: "B",
    sport: "course",
    objectif: "Fartlek surges kényan — accélérations libres en terrain vallonné (style Iten Kenya)",
    necessite: "Recommandé",
    when: "Build — alternative plus libre au Fartlek pyramide. En groupe idéalement.",
    phase: ["build"],
    avoid: "Terrain plat · Météo dangereuse",
    durationMin: [70, 90],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Kenyan", "Fartlek", "surges", "terrain", "Iten", "naturel", "groupe"],
    structure: [
      { part: "Warm-up", text: "15 min Z1-Z2 progressif", zones: ["Z1", "Z2"] },
      { part: "Main", text: "50-60 min de Fartlek libre kényan : courir à Z2 de base avec accélérations spontanées de 30s-2 min à 90-100% VMA sur les côtes, terrains variés, changements de direction. Pas de structure fixe — le terrain et les sensations guident. Courir en tête-à-tête ou groupe de 3-5 pour maintenir la compétitivité naturelle. Récup : retour Z2 entre les surges jusqu'à récupération complète. Total surges : 20-25 min accumulés. Réf : le camp d'Iten au Kenya (1600-2400m d'altitude) est le temple de ce type d'entraînement — Kipchoge, Bekele, Kimetto ont tous développé leur base sur ces chemins de terre rouge.", zones: ["Z2", "Z4", "Z5"] },
      { part: "Cool-down", text: "10 min Z1 + étirements", zones: ["Z1"] }
    ],
    variants: {
      ironman: "50 min Z2 + surges spontanés 30s-1 min",
      half: "55 min avec surges 30s-2 min",
      marathon: "60 min avec surges 1-3 min — version Kipchoge",
      semi: "55 min avec surges 30s-2 min"
    }
  },
  {
    id: "KENYAN_RUN_DOUBLE_DAY",
    cat: "C",
    sport: "course",
    objectif: "Double journée kényane — deux séances Z2 dans la même journée pour accumulation volume",
    necessite: "Optionnel",
    when: "Base/Build — pour athlètes avec volume ≥ 70 km/semaine. 2-3x/semaine au maximum.",
    phase: ["base", "build"],
    avoid: "Athlètes < 60 km/semaine · Fatigue > 5/10 · Sans alimentation et sommeil optimaux",
    durationMin: [80, 110],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Kenyan", "double journée", "volume", "Z2", "accumulation", "Kipchoge"],
    structure: [
      { part: "Warm-up", text: "MATIN (6h-7h) : 10 min progressif Z1. SOIR (16h-17h) : 10 min progressif Z1.", zones: ["Z1"] },
      { part: "Main", text: "MATIN : 40-50 min Z1-Z2 léger et relâché. Focus : foulée économe, relâchement total. Pas de montre GPS (courir au feeling). SOIR (minimum 5h après) : 40-50 min Z2 soutenu — légèrement plus fort que le matin. Les jambes sont plus chaudes et répondent mieux l'après-midi. Réf : Larsen 2003 — 'Les coureurs kényans d'élite font 2-3 doubles journées par semaine pendant leur préparation principale. Cette accumulation de volume quotidien crée des adaptations mitochondriales impossibles à atteindre avec une seule séance.' La clé : JAMAIS de haute intensité dans une double journée. Les deux séances sont TOUJOURS en Z1-Z2.", zones: ["Z1", "Z2"] },
      { part: "Cool-down", text: "SOIR : marche 10 min. Nutrition : 60g CHO + 30g protéines dans l'heure. Sommeil 8-9h obligatoire (adaptation).", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Matin : 40 min run Z1 + Soir : 45 min vélo Z1 (alternance sports)",
      half: "Matin : 40 min Z1 + Soir : 40 min Z2",
      marathon: "Matin : 50 min Z1 + Soir : 50 min Z2 — volume marathon kényan",
      semi: "Matin : 40 min Z1 + Soir : 40 min Z2"
    }
  },
  {
    id: "KENYAN_RUN_TEMPO_MARATHON",
    cat: "B",
    sport: "course",
    objectif: "Tempo marathon Kipchoge — allure marathon exacte sur blocs longs (séance signature)",
    necessite: "Obligatoire",
    when: "Build/Peak — spécifique marathon. Équivalent Kipchoge du FCR Canova.",
    phase: ["build", "peak"],
    avoid: "Fatigue > 6/10 · Phase base (trop tôt) · Terrain accidenté",
    durationMin: [80, 110],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Kenyan", "Kipchoge", "tempo marathon", "allure spécifique", "blocs longs", "Patrick Sang"],
    structure: [
      { part: "Warm-up", text: "20 min Z1→Z2 progressif + 4×100m strides", zones: ["Z1", "Z2"] },
      { part: "Main", text: "2×25 min à allure marathon cible R:5 min trot Z1. RPE : 7.5/10. La séance Kipchoge par excellence. Réf : semaine type Kipchoge (Larsen 2003, camp d'Iten) — 'Mardi et jeudi sont les jours tempo. Deux blocs de 25 min à allure marathon exacts.' La clé Kipchoge : régularité absolue au km (±2s/km sur tout le bloc). Il analyse chaque km post-séance pour vérifier la constance. Kipchoge : 'La régularité est plus importante que la vitesse.' Ravitaillement : 20-30g CHO sur les 5 min de récup entre les deux blocs. Progression : S1=2×20min, S2=2×22min, S3=2×25min, S4=2×28min, S5=1×35min.", zones: ["Z4"] },
      { part: "Cool-down", text: "12 min Z1 + marche 5 min. Analyser chaque km (régularité ≤ ±3s/km = réussite).", zones: ["Z1"] }
    ],
    variants: {
      ironman: "2×20 min allure run IM — tempo spécifique triathlon",
      half: "2×20 min allure semi",
      marathon: "PRIORITÉ — 2×25 min allure marathon. Clé de la préparation Kipchoge.",
      semi: "2×20 min allure semi-marathon"
    }
  },
  {
    id: "KENYAN_RUN_TEMPO_GROUP",
    cat: "B",
    sport: "course",
    objectif: "Tempo groupe kényan — séance tempo en groupe pour bénéficier de la dynamique collective",
    necessite: "Recommandé",
    when: "Build — séance tempo réalisée avec d'autres coureurs de niveau similaire.",
    phase: ["build"],
    avoid: "Groupe trop rapide (risque de dépasser son allure cible) · Solo si besoin",
    durationMin: [70, 90],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Kenyan", "groupe", "tempo", "dynamique collective", "Iten", "social"],
    structure: [
      { part: "Warm-up", text: "15 min Z1→Z2 en groupe + 2-3 accélérations progressives communes", zones: ["Z1", "Z2"] },
      { part: "Main", text: "40-50 min tempo en groupe à allure seuil bas (87-91% VMA / Z3-Z4). RPE : 7.5/10. En groupe de 3-10 coureurs de niveau homogène. Le groupe permet de maintenir l'allure sans effort mental individuel. Les Kényans courent souvent sans montre — le rythme est dicté par les leaders naturels qui tournent. AVANTAGE COGNITIF : courir en groupe réduit le RPE perçu de 5-10% à la même intensité (Tucker 2006). Kipchoge : 'Un groupe vous pousse à donner le meilleur de vous-même sans jamais vous sentir seul.'", zones: ["Z3", "Z4"] },
      { part: "Cool-down", text: "10 min Z1 groupe + stretching collectif", zones: ["Z1"] }
    ],
    variants: {
      ironman: "40 min tempo groupe allure seuil",
      half: "45 min tempo groupe",
      marathon: "50 min tempo groupe à allure seuil",
      semi: "45 min tempo groupe"
    }
  },
  {
    id: "KENYAN_RUN_LONG_NEGATIVE_SPLIT",
    cat: "B",
    sport: "course",
    objectif: "Sortie longue negative split Kipchoge — accélération progressive sur les derniers km (séance weekend clé)",
    necessite: "Obligatoire",
    when: "Build/Peak — 1x/semaine weekend. Séance longue la plus importante de la préparation marathon.",
    phase: ["build", "peak"],
    avoid: "Fatigue > 6/10 · Chaleur > 25°C · Terrain trop accidenté sur la deuxième moitié",
    durationMin: [100, 165],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Kenyan", "Kipchoge", "sortie longue", "negative split", "allure marathon", "progression"],
    structure: [
      { part: "Warm-up", text: "Intégré — les 5 premiers km en Z1 sont l'échauffement naturel.", zones: ["Z1"] },
      { part: "Main", text: "Sortie 28-34 km avec negative split structuré à la Kipchoge. Structure : km 1-18 : Z2 très confortable (4:00-4:30/km pour sub-3h). km 18-26 : accélération progressive vers allure marathon (+10s/km de progression). km 26-32 : allure marathon exacte ou légèrement plus vite. Derniers 2 km : free pace. Ravitaillement : 40g CHO/h depuis le km 12 (gut training simultané). RPE km 1 : 5/10. RPE km 30 : 8.5/10. Cette structure simule parfaitement la physiologie d'un marathon réussi. Réf : Kipchoge court systématiquement ses sorties longues avec negative split — c'est sa signature de course.", zones: ["Z2", "Z3", "Z4"] },
      { part: "Cool-down", text: "Marche 15 min + récupération nutritionnelle complète dans les 20 min (70g CHO + 30g protéines).", zones: ["Z1"] }
    ],
    variants: {
      ironman: "22-25 km : km 1-14 Z2, km 14-20 progression, km 20-25 allure run IM",
      half: "18-22 km : km 1-12 Z2, km 12-17 progression, km 17-22 allure semi",
      marathon: "28-34 km avec negative split Kipchoge — séance weekend signature",
      semi: "16-20 km avec negative split"
    }
  },
  {
    id: "KENYAN_WEEK_STRUCTURE_MARATHON",
    cat: "C",
    sport: "course",
    objectif: "Semaine type kényane marathon — structure Kipchoge/Sang adaptée pour coureurs compétiteurs",
    necessite: "Recommandé",
    when: "Build — bloc de 4-8 semaines pour coureurs visant sub-3h ou moins. Volume 80-120 km/semaine.",
    phase: ["build"],
    avoid: "Volume < 60 km/semaine · Moins de 6 mois d'entraînement régulier · Sans base aérobie solide",
    durationMin: [55, 75],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Kenyan", "Kipchoge", "semaine type", "structure", "marathon", "volume", "Patrick Sang"],
    structure: [
      { part: "Warm-up", text: "LUNDI : 50 min Z1 récupération active. MARDI : 1h30 dont 2×25 min allure marathon (KENYAN_RUN_TEMPO_MARATHON). MERCREDI : 1h40 Z2 terrain vallonné (EF longue). JEUDI : 1h20 Fartlek pyramide kényan (KENYAN_RUN_FARTLEK_PYRAMID). VENDREDI : 45 min Z1 récupération légère. SAMEDI : 32 km SL negative split (KENYAN_RUN_LONG_NEGATIVE_SPLIT). DIMANCHE : 1h Z2 + 6×100m strides. Total : ~105-115 km.", zones: ["Z1", "Z2"] },
      { part: "Main", text: "Cette séance représente le JEUDI : Fartlek pyramide kényan 2-3-5-7-5-3-2 min à 90-95% VMA. RÉPARTITION HEBDOMADAIRE : ~80% Z1-Z2 (distribution Seiler respectée). ~20% Z3-Z5 (tempo + fartlek). Z3 minimal (la sortie longue et les EF restent en Z2). CLÉS DE LA SEMAINE KÉNYANE : 1. La SL est SACROSANTE — jamais sacrifiée. 2. Les deux séances de qualité (mardi + jeudi) sont séparées de 48h. 3. Les EF sont VRAIMENT faciles (pas de dérive Z3). 4. Manger 70-80g CHO/h sur la SL (gut training).", zones: ["Z4", "Z5"] },
      { part: "Cool-down", text: "15 min Z1. Analyser le volume hebdomadaire total — objectif : +10% maximum par rapport à la semaine précédente.", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Adapter : remplacer jeudi run par vélo 2h Z2, ajouter natation mardi matin",
      half: "Volume réduit à 70-85 km. Même structure.",
      marathon: "Structure complète 100-120 km/semaine — niveau compétiteur marathonien",
      semi: "Volume 60-75 km. Même structure, durées réduites."
    }
  },
  {
    id: "KENYAN_RUN_ALTITUDE_SIMULATION",
    cat: "C",
    sport: "course",
    objectif: "Simulation altitude kényane — protocole pour maximiser les bénéfices d'un camp en altitude",
    necessite: "Optionnel",
    when: "Build — si stage en altitude (> 1500m) ou simulation heat training comme alternative.",
    phase: ["build"],
    avoid: "Altitude < 1200m (bénéfices insuffisants) · Première semaine en altitude (adaptation) · Intensité élevée en altitude",
    durationMin: [60, 90],
    metricKey: "allure",
    sportKey: "course",
    defaultSportId: 2,
    tags: ["Kenyan", "altitude", "camp", "adaptation", "érythropoïèse", "volume plasmatique"],
    structure: [
      { part: "Warm-up", text: "Semaine 1 altitude (1500-2400m) : UNIQUEMENT Z1-Z2 léger. La FC est naturellement 10-15 bpm plus haute qu'en plaine à la même allure — NORMAL. Réduire l'allure de 15-25 s/km vs plaine.", zones: ["Z1"] },
      { part: "Main", text: "Programme altitude Lydiard-Kényan : Semaines 1-2 : uniquement Z1-Z2, volume normal -20%. Semaines 3-4 : retour au volume normal, introduire une séance de qualité légère. Semaines 5-6 (si stage long) : intensité normale mais allure toujours plus lente qu'en plaine (FC référence, pas allure GPS). BÉNÉFICES : augmentation masse érythrocytaire (+6-8% sur 4 semaines), augmentation VO2max (+3-5% à retour en plaine). Réf : Stellingwerff 2012 — l'altitude optimale est 2000-2400m pour 3-4 semaines. Les Kényans d'Iten (2400m) s'entraînent toute l'année à cette altitude — leur avantage physiologique est partiellement dû à cette adaptation chronique.", zones: ["Z2", "Z3"] },
      { part: "Cool-down", text: "Hydratation ++. Alimentation riche en fer (viandes rouges, légumineuses). Sommeil 9h minimum (la nuit en altitude = adaptation principale).", zones: ["Z1"] }
    ],
    variants: {
      ironman: "Stage altitude 3-4 semaines en phase base — gain VO2max significatif",
      half: "Stage 2-3 semaines avant bloc build",
      marathon: "Stage altitude 4-6 semaines — investissement optimal",
      semi: "Stage 2-3 semaines"
    }
  },

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
    structure: mkStructure([
      ["Warm-up", "15' Z1→Z2 progressif + 4×20\" accélérations r=40\" marche/trot", ["Z1", "Z2"]],
      ["Main", "10x(1' Z4a / 2' Z2) sur terrain adapté", ["Z4a", "Z2"]],
      ["Cool-down", "10' Z1 souple + mobilité", ["Z1"]],
    ]),
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
// LONG COURSE WEEKEND (LCW) — Format 3 jours éclaté (Wales/Belgium).
// Séances signature : natation ven soir, long bike sam (SANS brique), long run
// dim off-legs, back-to-back peak, protocole recharge glycogénique inter-étapes.
// Prescription forcée quand raceFormat === "lcw_3day" via promptHelpers.ts.
// =============================================
import { EnrichedWorkoutsLCW } from "./enrichedWorkoutsLCW";
WorkoutLibrary.push(...EnrichedWorkoutsLCW);

// =============================================
// RUN HILLS (route) — Côtes ROUTE pour plans 10K/semi/marathon/70.3/IM run.
// Comble le manque qui poussait le modèle à hallucinier des variantes trail
// (`B_TR_HILL_*`) rejetées par le filtre trail aval. Taxonomie strictement
// route (préfixe *_RUN_HILL_*, sport=course, aucun tag trail, goals road only).
// =============================================
import { EnrichedWorkoutsRunHills } from "./enrichedWorkoutsRunHills";
WorkoutLibrary.push(...EnrichedWorkoutsRunHills);

// =============================================
// START TO RUN — catalogue débutant absolu (marche-course 12 semaines).
// Avant : l'objectif StartToRun était redirigé sur le pool 10k → un débutant
// recevait des fiches VMA/seuil/tempo conçues pour un coureur constructible.
// Ces fiches sont `goals: ["start_to_run"]` uniquement et le catalog builder
// applique un hard-ban réciproque (aucune fiche performance dans un plan S2R).
// =============================================
import { EnrichedWorkoutsStartToRun } from "./enrichedWorkoutsStartToRun";
WorkoutLibrary.push(...EnrichedWorkoutsStartToRun);

// =============================================
// POST-PROCESSING: Enrich missing goals[] and phase[]
// =============================================
import { enrichWorkoutGoals } from "./workoutGoalsEnricher";
enrichWorkoutGoals(WorkoutLibrary);
import { widenEndurancePhases } from "./plan/phaseWidener";
widenEndurancePhases(WorkoutLibrary);

console.log(`✅ Pro Pack: ${ProPackWorkouts.length} | Templates: ${TemplateDerivedWorkouts.length} | Enriched: ${EnrichedWorkouts.length} | V2: ${EnrichedWorkoutsV2.length} | V3: ${EnrichedWorkoutsV3.length} | Trail: ${EnrichedWorkoutsTrail.length} | V4: ${EnrichedWorkoutsV4.length} | V5: ${EnrichedWorkoutsV5.length} | V6: ${EnrichedWorkoutsV6.length} | FatMax: ${EnrichedWorkoutsFatMax.length} | Recovery: ${EnrichedWorkoutsRecovery.length} | Swim+: ${EnrichedWorkoutsSwim.length} | SwimV2: ${EnrichedWorkoutsSwimV2.length} | StrengthV2: ${EnrichedWorkoutsStrengthV2.length} | Hedgehog: ${EnrichedWorkoutsHedgehog.length} | IM Run Durability: ${EnrichedWorkoutsIMRunDurability.length} | 70.3 Podium: ${EnrichedWorkouts703PodiumDurability.length} | LCW: ${EnrichedWorkoutsLCW.length} | Run Hills: ${EnrichedWorkoutsRunHills.length} | Total: ${WorkoutLibrary.length}`);

