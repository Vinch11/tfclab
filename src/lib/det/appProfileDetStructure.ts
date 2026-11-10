import {terrainWatchNodes} from './trailGuidance';
import {roadReturnSources} from '../../../scripts/library-v3/roadReturnSources';
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
 if(c.sport==='run' && c.targets.status==='unresolved' && c.targets.missing.some(key=>key.startsWith('run_terrain_effort_review.')))
  return {detStructureRefusal:{reason:'run_terrain_effort_review_required'}};
 const qualitative=timedSwimSources.find(w=>w.id===c.sourceId&&fingerprintV3SportingSource(w)===c.sourceFingerprint);
 const walkRun=roadReturnSources.some(w=>w.id===c.sourceId&&fingerprintV3SportingSource(w)===c.sourceFingerprint);
 const result=previewDetStructuredWorkout({...(walkRun?{qualitativeDomains:["recovery"]}:qualitative?{qualitativeDomains:qualitative.prescription.physiologicalIntent.domainIds}:{}),sourceId:c.sourceId,sport:c.sport,blocks:c.blocks,targets:c.targets.targets,durationMinutes:c.durationMinutes});
 if (result.status==='preview' && c.targets.targets.some(t=>t.metric==='coach_field_effort'))
   return {detStructuredWorkout:{...result.workout,nodes:terrainWatchNodes(result.workout.nodes)},detStructureAdmission:result.sourceAdmission};
 return result.status==='preview'?{detStructuredWorkout:result.workout,detStructureAdmission:result.sourceAdmission}:{detStructureRefusal:{reason:result.reason}};
}
