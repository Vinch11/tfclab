import{WorkoutLibrary}from'@/lib/workoutLibrary';
import type{RepairWorkoutMetadata}from'../../supabase/functions/_shared/repairSportingEquivalence';import{sourcePlacement}from'./v6-placement';import type{PlanConfig}from'@/hooks/useAITrainingPlan';
/** Conservative prospective scope filter, not a catalogue reclassification. */
export function prospectiveSourceEvidence(card:RepairWorkoutMetadata,role:string,config:PlanConfig){const reasons:string[]=[];const label=`${card.id} ${card.title}`.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(!Array.from({length:7},(_,d)=>sourcePlacement(card,1,d,config)).some(p=>p.compatible))reasons.push('source_timing_or_format_incompatible');
 const explicitModerate=WorkoutLibrary.find(w=>w.id===card.id)?.physiology?.primary==='moderate_lt1';
 if(role!=='support_skill'&&!explicitModerate&&/techni|drill|respir|kick|cadence|proprio|mobility|yoga|recup|recovery|regen|taper|shakeout|activation/.test(label))reasons.push('source_role_not_endurance');
 if(role!=='support_skill'&&!explicitModerate&&!/endurance|fondament|aerobic|aerobie|\bef\b|z[12].*(?:easy|long)|easy.*z[12]/.test(label))reasons.push('explicit_endurance_intent_unproven');
 return{compatible:!reasons.length,reasons,sourceTiming:'V6 sourcePlacement unchanged',uncertainty:'candidate refuses ambiguous source roles, does not assert they are unsafe'};
}
