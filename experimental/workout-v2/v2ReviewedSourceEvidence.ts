/** First human-readable source-content review, experimental only.
 * Statements are deliberately narrow: a Z1 recovery session is not a
 * verified LT1 dose or an individual safe prescription.
 * Witnesses checked against actual V1 Main text, not IDs or category.
 */
import type {PhysiologicalIntent} from "@/types/workoutLibrary";
import {WorkoutLibrary} from "@/lib/workoutLibrary";

export const V2_REVIEWED_SOURCE_EVIDENCE:Readonly<Record<string,{
 intent:PhysiologicalIntent;sourceMainExcerpt:string;reason:string;
}>>={
 D_SEMI_RECOVERY_30:{intent:"recovery",sourceMainExcerpt:"Z1 très facile",
   reason:"Bloc principal 20–35 min Z1 très facile avec mobilité; récupération active, sans stimulus seuil."},
 D_SWIM_TRI_REGEN_1000:{intent:"recovery",sourceMainExcerpt:"très facile Z1",
   reason:"Bloc principal de nage très facile Z1 et éducatifs; récupération, non séance de qualité."},
 D_IM_BRICK_REGEN:{intent:"recovery",sourceMainExcerpt:"Z1 très relâché",
   reason:"Transition course 15–30 min Z1 relâchée après vélo; pas de preuve de stimulus seuil."},
 D_BIKE_RECOVERY:{intent:"recovery",sourceMainExcerpt:"Z1, très facile",
   reason:"Bloc principal vélo 30–60 min en Z1 facile; récupération, dose personnelle à vérifier."},
 D_RUN_REGEN:{intent:"recovery",sourceMainExcerpt:"Z1, relâché",
   reason:"Bloc principal course 20–45 min Z1 relâché; récupération sans preuve LT1."},
 D_SWIM_REGEN:{intent:"recovery",sourceMainExcerpt:"très facile",
   reason:"Bloc principal 800–1500 m de nage très facile et éducatifs; aucune cible seuil."},
};
export function inspectV2ReviewedSourceEvidence(){
 return Object.entries(V2_REVIEWED_SOURCE_EVIDENCE).map(([id,e])=>{
   const source=WorkoutLibrary.find(c=>c.id===id);
   const matching=source?.structure.some(s=>s.part==="Main"&&s.text.includes(e.sourceMainExcerpt));
   return {id,intent:e.intent,exists:!!source,matching:!!matching,sourceAlreadyDocumented:!!source?.physiology?.primary,
     coachDoseApproved:false as const,canAutoSelect:false as const};
 });
}
