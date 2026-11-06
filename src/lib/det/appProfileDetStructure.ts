import {timedSwimSources} from '../../../scripts/library-v3/completeSessionSources';
import {fingerprintV3SportingSource} from '../../../scripts/library-v3/sportingQualification800';
import {previewDetStructuredWorkout,type DetStructuredWorkout} from '../../../experimental/det-engine/v400-structured-workout';
import type {ProposedV3Session} from './appPlanningV3Proposal';
/** Serialize only the chosen blocks and resolved targets. No admission,
 * transition, missing pace or human review can be created by this adapter. */
type AppStructure={
 detStructuredWorkout?:DetStructuredWorkout;
 detStructuredComponents?:{schema:'det-brick-components-preview-v1';bike:DetStructuredWorkout;run:DetStructuredWorkout};
 detStructureAdmission?:'pending';detStructureRefusal?:{reason:string};
};
export function appProfileDetStructure(session:ProposedV3Session):AppStructure{
 if(session.role==='race')return {};
 if(session.components.length!==1){
  const [bike,run]=session.components;
  if(session.components.length===2&&bike.sport==='bike'&&run.sport==='run'){
   const b=appProfileDetStructure({...session,components:[bike]}),r=appProfileDetStructure({...session,components:[run]});
   if(b.detStructuredWorkout&&r.detStructuredWorkout)return {detStructuredComponents:{schema:'det-brick-components-preview-v1' as const,bike:b.detStructuredWorkout,run:r.detStructuredWorkout},detStructureAdmission:'pending',detStructureRefusal:{reason:'multisport_composition_and_transition_unreviewed'}};
  }
  return {detStructureRefusal:{reason:'multisport_composition_and_transition_unreviewed'}};
 }
 const c=session.components[0];
 const qualitative=timedSwimSources.find(w=>w.id===c.sourceId&&fingerprintV3SportingSource(w)===c.sourceFingerprint);
 const result=previewDetStructuredWorkout({...(qualitative?{qualitativeDomains:qualitative.prescription.physiologicalIntent.domainIds}:{}),sourceId:c.sourceId,sport:c.sport,blocks:c.blocks,targets:c.targets.targets,durationMinutes:c.durationMinutes});
 return result.status==='preview'?{detStructuredWorkout:result.workout,detStructureAdmission:result.sourceAdmission}:{detStructureRefusal:{reason:result.reason}};
}
