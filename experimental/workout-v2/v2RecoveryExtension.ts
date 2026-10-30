/** V2 extension batch 1: genuinely distinct recovery-dose families.
 * Experimental candidate recipes. Not included in production or the V2 pilot
 * selector. RPE is deliberately non-calibrated and coach review is required.
 */
import {WORKOUT_V2_MODELS, type WorkoutV2Model} from "./catalog";

const bound=(min:number,max:number,defaultValue:number,step=60)=>({min,max,default:defaultValue,step});
const allPhases=["base","build","peak","taper"] as const;
const goals=["sprint","olympic","half","ironman"] as const;
const recovery = (id:string,name:string,sport:"bike"|"swim"|"run",
  main:[number,number,number],warmup=300,cooldown=180):WorkoutV2Model=>({
  id,name,sport,goals:sport==="run"?["5k","10k","semi","marathon",...goals]:goals,
  phases:allPhases,minTrainingLevel:"light",intent:"recovery",mode:"steady",
  params:{warmupSec:bound(0,600,warmup),
    mainSec:bound(...main),cooldownSec:bound(0,600,cooldown)},
  target:{anchor:"rpe",lower:1,upper:3,
    description:"Récupération facile ; arrêter ou réduire si symptômes / fatigue inhabituelle"},
  evidence:[],
  coachNotes:"Séance facultative de récupération uniquement, sans prétention LT1, seuil, VO2 ou dose validée. Durée et pertinence à confirmer manuellement.",
  requiresCoachReview:true,
});
export const WORKOUT_V2_RECOVERY_EXTENSION:readonly WorkoutV2Model[]=[
  recovery("V2_BIKE_RECOVERY_01","Vélo de récupération", "bike",[600,3600,1200]),
  recovery("V2_RUN_RECOVERY_01","Footing de récupération", "run",[600,2700,1200]),
  recovery("V2_SWIM_RECOVERY_01","Natation de récupération aisée", "swim",[600,3300,1200]),
];
export const WORKOUT_V2_EXTENDED_CANDIDATES:readonly WorkoutV2Model[]=[
  ...WORKOUT_V2_MODELS,...WORKOUT_V2_RECOVERY_EXTENSION,
];
