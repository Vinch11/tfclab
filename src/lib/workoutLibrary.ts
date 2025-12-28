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
    avoid: "Surcharge",
    durationMin: [150, 200],
    metricKey: "puissance",
    sportKey: "cyclisme",
    structure: [
      { part: "Bike", text: "2h Z2–Z3 (race effort)", zones: ["Z2", "Z3"] },
      { part: "Run", text: "30–45' Z3 (race pace)", zones: ["Z3"] }
    ],
    variants: { half: "Séance clé", ironman: "—", marathon: "—", semi: "—" }
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
