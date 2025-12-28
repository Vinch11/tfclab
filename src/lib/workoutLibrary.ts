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
    sport: "muscu",
    objectif: "Force générale & prévention blessures (trail)",
    necessite: "Obligatoire",
    when: "Toute l'année (1–2x/sem)",
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
    id: "C_TR_STRENGTH_HILLS",
    cat: "C",
    sport: "muscu",
    objectif: "Force spécifique montée (trail)",
    necessite: "Recommandé",
    when: "Base/Build",
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
    id: "C_TR_DOWNHILL_EASY",
    cat: "C",
    sport: "course",
    objectif: "Technique descente (facile, propre)",
    necessite: "Recommandé",
    when: "Toute l'année",
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
    sport: "muscu",
    objectif: "Force bas du corps (trail) – prévention blessures",
    necessite: "Obligatoire",
    when: "Toute l'année (1–2x/sem)",
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
    sport: "muscu",
    objectif: "Tolérance descente (excentrique quadriceps)",
    necessite: "Recommandé",
    when: "Base/Build",
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
    sport: "muscu",
    objectif: "Pied/cheville (proprioception) + prévention entorses",
    necessite: "Obligatoire",
    when: "Toute l'année",
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
    sport: "muscu",
    objectif: "Mobilité hanches/dos + gainage (trail)",
    necessite: "Recommandé",
    when: "Toute l'année",
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
    sport: "muscu",
    objectif: "Force spécifique montée (trail)",
    necessite: "Recommandé",
    when: "Build",
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
    sport: "muscu",
    objectif: "Repos actif + mobilité (jour off intelligent)",
    necessite: "Recommandé",
    when: "Toute l'année",
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
    avoid: "—",
    durationMin: [35, 55],
    metricKey: "cardiaque",
    sportKey: "tout sport",
    structure: [{ part: "Main", text: "30–45' facile + 6–10 descentes 45–60s 'propre' r=remontée easy", zones: ["Z1", "Z2"] }],
    variants: { trail_short: "utile", trail_mountain: "utile", trail_ultra: "utile", ironman: "—", half: "—", marathon: "—", semi: "—" },
    dPlusTargetM: { min: 150, max: 400 }
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
