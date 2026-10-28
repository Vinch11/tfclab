import type {LibraryWorkout,PhysiologicalIntent} from '@/types/workoutLibrary';
import {WorkoutLibrary} from '@/lib/workoutLibrary';
import {buildRepairWorkoutMetadata} from '@/lib/plan/repairCatalogMetadata';
import {isLevelPrerequisiteIncompatible} from '@/lib/plan/levelPrerequisiteCompatibility';
import {generationEligibility} from './v4-generation-eligibility';
import {targetedTiming} from './v14-sources';
import {assertCanonicalIntegrity,digest,restoreHistorical} from './v16-canonical.mjs';
export interface CanonicalOfferCriteria {
 objective:string;phase:string;weekType:string;minutes:number;
 intention?:PhysiologicalIntent;
 trainingLevel:string;trainingLevelSource:string;weeklyHours?:number;
 confirmedPrerequisites?:readonly string[];confirmedContexts?:readonly string[];
 approvedAdvancedSessionIds?:readonly string[];
}
/** Review offers only: preserves existing guards and never promotes a record to a prescription. */
export function evaluateCanonicalOffer(c:any,criteria:CanonicalOfferCriteria){
 assertCanonicalIntegrity(c);
 const source=restoreHistorical(c) as LibraryWorkout,existing=WorkoutLibrary.find(w=>w.id===source.id);
 const sourceMatches=!!existing&&digest(existing)===digest(source);
 const metadata=buildRepairWorkoutMetadata(source);
 const historical=generationEligibility(metadata,criteria,criteria.confirmedPrerequisites??[],criteria.confirmedContexts??[]);
 const levelBlocked=isLevelPrerequisiteIncompatible(source.id,criteria);
 const reasons=[...historical.reasons,...(!sourceMatches?['source_not_current_operational_library']:[]),...(levelBlocked?['existing_level_or_advanced_prerequisite_guard']:[])];
 const range=c.prescription.durationMinutes;
 if(!range||!Number.isFinite(criteria.minutes)||criteria.minutes<range[0]||criteria.minutes>range[1])reasons.push('declared_duration_envelope');
 if(criteria.intention){if(!source.physiology)reasons.push('explicit_physiological_intent_missing');else if(source.physiology.primary!==criteria.intention&&!source.physiology.secondary?.includes(criteria.intention))reasons.push('explicit_physiological_intent_mismatch');}
 const timing=sourceMatches?targetedTiming(metadata):null;
 if(timing&&(criteria.minutes<timing.necessaryRange[0]||criteria.minutes>timing.necessaryRange[1]))reasons.push('existing_literal_timing_contract');
 return{legacyId:source.id,reviewOfferCompatible:reasons.length===0,reasons,historical,levelBlocked,sourceMatches,explicitIntent:source.physiology??null,criteria,timing,individualPrerequisitesConfirmed:false,automaticPrescription:false,scientificValidation:false,remainingConditions:c.conversion.unknowns,scope:'candidate for coach review; matching filters is not a validated or currently admissible sports prescription'};
}
