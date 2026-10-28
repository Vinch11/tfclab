import{reconcileExperimentalBudget}from'./v13-budget';
import type{V10Profile}from'./v10-profiles';import{fullPreparationFeasibility,poolForWeek}from'./v13-feasibility';import{reviewV12}from'./v13-review';import{auditRecipe,brickOverlay}from'./v13-integrity';
import{WorkoutLibrary}from'@/lib/workoutLibrary';import{buildRepairWorkoutMetadata}from'@/lib/plan/repairCatalogMetadata';
export function studyV13(profiles:V10Profile[]){
 const context=profiles.map(p=>{const correction=reconcileExperimentalBudget(p);return{profile:p.id,originalFeasibility:fullPreparationFeasibility(p),result:fullPreparationFeasibility(correction.candidate),budgetCorrection:correction.evidence,review:reviewV12(p)};});
 const cards=[...new Map([...profiles.flatMap(p=>Array.from({length:16},(_,i)=>poolForWeek(p,i+1)).flat()),...['C_BRICK_TRANSITION_DRILL','C_IM_AERO_HOLD','C_BIKE_AERO_POSITION_DRILLS','A_SWIM_AEROBIC_MULTI_NAGES','A_SWIM_CONTINUOUS_2K'].map(id=>buildRepairWorkoutMetadata(WorkoutLibrary.find(w=>w.id===id)!))].map(c=>[c.id,c])).values()];
 const audit=cards.map(auditRecipe),counts=Object.fromEntries([...new Set(audit.map(a=>a.status))].map(status=>[status,audit.filter(a=>a.status===status).length]));
 return{version:'det-v13-1',profiles:context,catalogue:{scope:'actual native16-week offers for both profiles plus five priority witnesses; bounded offer pool, not all920workouts',uniqueSources:cards.length,counts,audit},overlay:brickOverlay(),completePlansProduced:0,fullPlanConformityClaimed:false,sourceMethodologyPromoted:false,expertReviewed:0};
}
