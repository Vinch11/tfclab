import type {LibraryWorkout} from '@/types/workoutLibrary';
/** Coaching reminders at J-14; not peak sessions, not race-week openers. */
export const EnrichedWorkoutsRaceTaper:LibraryWorkout[]=[
 {id:'A_IM_TAPER_BIKE_ENDURANCE_120',cat:'A',sport:'cyclisme',objectif:'Ironman — repère vélo d’affûtage',necessite:'Recommandé',
  when:'Entre J−14 et J−8 Ironman, hors semaine de course',phase:['taper'],avoid:'Douleur, fatigue persistante ; pas en récupération après une course',
  durationMin:[120,150],metricKey:'puissance',sportKey:'bike',goals:['ironman'],tags:['ironman','long-ride','endurance','taper'],variants:{},
  structure:[{part:'Warm-up',text:'15min faciles sous LT1, progression souple.',zones:['Z1','Z2']},
   {part:'Main',text:'90–120min sous LT1 dont 2×15min à effort Ironman personnel dans le domaine modéré, séparées par 10min faciles. Aucun tempo ni seuil. Nutrition habituelle testée pour la course ; pas de nouveau produit.',zones:['Z2']},
   {part:'Cool-down',text:'15min faciles. Réduire le volume des autres séances cette semaine.',zones:['Z1']}],notes:'Choisir une durée unique selon la fatigue et le budget d’affûtage ; effort Ironman non converti en pourcentage universel.'},
 {id:'A_IM_TAPER_RUN_ENDURANCE_60',cat:'A',sport:'course',objectif:'Ironman — repère course d’affûtage',necessite:'Recommandé',
  when:'Entre J−14 et J−8 Ironman, hors semaine de course',phase:['taper'],avoid:'Douleur, foulée modifiée ou récupération marathon incomplète',
  durationMin:[60,75],metricKey:'allure',sportKey:'run',goals:['ironman'],tags:['ironman','long-run','endurance','taper'],variants:{},
  structure:[{part:'Warm-up',text:'10min faciles sous LT1.',zones:['Z1']},
   {part:'Main',text:'40–55min faciles dont 2×10min à allure Ironman personnelle dans le domaine modéré, séparées par 5min faciles. Ne pas courir à allure marathon sec ni au seuil.',zones:['Z2']},
   {part:'Cool-down',text:'10min faciles. Pas de finish rapide.',zones:['Z1']}],notes:'Repère entretenu, pas séance de développement ; retirer du volume ailleurs.'},
];