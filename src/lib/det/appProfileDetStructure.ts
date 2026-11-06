import {timedSwimSources} from '../../../scripts/library-v3/completeSessionSources';
import {fingerprintV3SportingSource} from '../../../scripts/library-v3/sportingQualification800';
import {previewDetStructuredWorkout} from '../../../experimental/det-engine/v400-structured-workout';
import type {ProposedV3Session} from './appPlanningV3Proposal';
/** Serialize only the chosen blocks and resolved targets. No admission,
 * transition, missing pace or human review can be created by this adapter. */
export function appProfileDetStructure(session:ProposedV3Session){
 if(session.role==='race')return {};
 if(session.components.length!==1)return {detStructureRefusal:{reason:'multisport_composition_and_transition_unreviewed'}};
 const c=session.components[0];
 const qualitative=timedSwimSources.find(w=>w.id===c.sourceId&&fingerprintV3SportingSource(w)===c.sourceFingerprint);
 const result=previewDetStructuredWorkout({...(qualitative?{qualitativeDomains:qualitative.prescription.physiologicalIntent.domainIds}:{}),sourceId:c.sourceId,sport:c.sport,blocks:c.blocks,targets:c.targets.targets,durationMinutes:c.durationMinutes});
 return result.status==='preview'?{detStructuredWorkout:result.workout,detStructureAdmission:result.sourceAdmission}:{detStructureRefusal:{reason:result.reason}};
}
