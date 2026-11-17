import type { LibraryWorkout } from "@/types/workoutLibrary";
import { getDoctrineDomain } from "./zones/tfclDoctrine";

const marathonZone = getDoctrineDomain("marathon_pace").zone;
/** Fixed executable examples; doses are coaching choices, not trial-proven optima.
 * Taper principles: Bosquet et al. 2007, DOI 10.1249/mss.0b013e31806010e0.
 * Session design: Tønnessen et al. 2024, DOI 10.1007/s40279-024-02067-4.
 */
export const EnrichedWorkoutsRacePreparation: LibraryWorkout[] = [
  {
    id: "B_RUN_MARATHON_CONTROLLED_3X8", cat: "B", sport: "course",
    objectif: "Marathon — introduction contrôlée 3×8 min", necessite: "Optionnel",
    when: "Préparation d’un marathon déclaré, y compris B avant un Ironman", phase: ["base", "build"],
    avoid: "Douleur, récupération marathon, affûtage final ; allure marathon non établie",
    durationMin: [60,60], sportKey: "run", metricKey: "allure", goals: ["marathon","ironman"], variants: {},
    tags: ["marathon", "race-pace"], prerequisites: {minimumTrainingLevel:"trained"},
    physiology: {primary:"race_specific", rationale:"24 min à allure marathon, domaine lourd sous MLSS, sans séance au seuil."},
    structure: [
      {part:"Warm-up",text:"15min Z1–Z2 faciles sous LT1.",zones:["Z1","Z2"]},
      {part:"Main",text:"3×8min à allure marathon personnelle, domaine marathon_pace sous MLSS (Z4 bas), avec 3min Z1 entre les répétitions (2 récupérations). Puis 5min Z2 faciles. Pas d’accélération finale ; ralentir si l’effort dérive vers le seuil.",zones:[marathonZone]},
      {part:"Cool-down",text:"10min Z1 faciles.",zones:["Z1"]},
    ],
    notes:"60min = 15 + 24 + 6 + 5 + 10. Espacer des autres charges course importantes. Exemple de progression ajustable par le coach, pas dose optimale validée expérimentalement.",
  },
  {
    id:"B_RUN_MARATHON_TAPER_2X8",cat:"B",sport:"course",objectif:"Marathon — rappel d’affûtage 2×8 min",necessite:"Optionnel",
    when:"J−14 à J−8 marathon, ou avant le mini-affûtage B",phase:["build","peak","taper"],
    avoid:"J−7 à J0 si plafond quotidien incompatible ; douleur, récupération après course",durationMin:[45,45],
    sportKey:"run",metricKey:"allure",goals:["marathon","ironman"],variants:{},tags:["marathon","race-pace","taper"],
    physiology:{primary:"race_specific",rationale:"16 min à allure marathon sous MLSS : rappel spécifique sans développement."},
    structure:[
      {part:"Warm-up",text:"12min Z1–Z2 faciles.",zones:["Z1","Z2"]},
      {part:"Main",text:"2×8min à allure marathon personnelle (marathon_pace, Z4 bas sous MLSS), 3min Z1 entre les répétitions. Puis 4min Z2 faciles.",zones:[marathonZone]},
      {part:"Cool-down",text:"10min Z1 faciles.",zones:["Z1"]},
    ],notes:"45min = 12 + 16 + 3 + 4 + 10. Bosquet 2007 soutient le maintien de l’intensité avec baisse du volume, pas cette dose exacte ni un affûtage B de deux semaines.",
  },
  {
    id:"A_IM_TAPER_BIKE_EASY_60",cat:"A",sport:"cyclisme",objectif:"Ironman — entretien facile d’affûtage 60 min",necessite:"Optionnel",
    when:"Créneau vélo secondaire en affûtage, pas remplacement du repère long J−14/J−8",phase:["taper"],
    avoid:"Jour de course, repos obligatoire ; plafond calendaire inférieur à 60 min",durationMin:[60,60],
    sportKey:"bike",metricKey:"puissance",goals:["ironman"],variants:{},tags:["ironman","endurance","taper"],
    physiology:{primary:"moderate_lt1",rationale:"Entretien facile sous LT1 sans bloc seuil ni surcharge d’affûtage."},
    structure:[
      {part:"Warm-up",text:"10min Z1 faciles.",zones:["Z1"]},
      {part:"Main",text:"40min Z2 sous LT1 personnel, cadence habituelle, aucun tempo ni seuil.",zones:["Z2"]},
      {part:"Cool-down",text:"10min Z1 faciles.",zones:["Z1"]},
    ],notes:"60min = 10 + 40 + 10. Maintien de fréquence selon budget et fatigue ; ne remplace pas le vélo long protégé.",
  },
];