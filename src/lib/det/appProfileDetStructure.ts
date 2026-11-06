import {previewDetStructuredWorkout} from '../../../experimental/det-engine/v400-structured-workout';
import type {ProposedV3Session} from './appPlanningV3Proposal';
/** Serialize only the chosen blocks and resolved targets. No admission,
 * transition, missing pace or human review can be created by this adapter. */
export function appProfileDetStructure(session:ProposedV3Session){
 if(session.role==='race')return {};
 if(session.components.length!==1)return {detStructureRefusal:{reason:'multisport_composition_and_transition_unreviewed'}};
 const c=session.components[0];
 const result=previewDetStructuredWorkout({sourceId:c.sourceId,sport:c.sport,blocks:c.blocks,targets:c.targets.targets,durationMinutes:c.durationMinutes});
 return result.status==='preview'?{detStructuredWorkout:result.workout,detStructureAdmission:result.sourceAdmission}:{detStructureRefusal:{reason:result.reason}};
}
