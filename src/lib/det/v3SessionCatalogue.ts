import type {ContractSession} from '../../../supabase/functions/_shared/sessionCatalogueContract';
import type {ProposedV3Workout} from './appPlanningV3Proposal';
import {componentMinutes} from './appPlanningV3Audit';
import {findSource} from './coachDetContext';
import {renderV3Prescription} from './v3PrescriptionText';

/** Source/dose correspondence only. This does not approve a plan or export. */
export function checkV3SessionCatalogue(session:ContractSession & {detSourceComponents?:unknown}):{errors:string[];unknown:string[]}|null {
 const native=session.detSourceComponents!==undefined||/^V3P_/.test(session.catalogId??'');
 if(!native)return null;
 const parts=session.detSourceComponents;
 if(Array.isArray(parts)&&!parts.length&&!session.catalogId)return null; // declared event has no training source
 if(!Array.isArray(parts)||!parts.length)return {errors:[],unknown:['v3_saved_blocks_missing']};
 try {
  const components=parts as ProposedV3Workout[];
  if(components.some(c=>componentMinutes(c)==='invalid'||findSource(c.sourceId)?.title!==c.title))return {errors:['v3_source_or_dose_mismatch'],unknown:[]};
  const errors:string[]=[];
  if(session.title!==components.map(c=>c.title).join(' + '))errors.push('v3_title_mismatch');
  if(session.sport!==(components.length===1?components[0].sport:'brick'))errors.push('v3_sport_mismatch');
  if(components.length===1&&session.catalogId!==components[0].sourceId)errors.push('v3_source_id_mismatch');
  const texts=[false,true].flatMap(guidance=>[false,true].flatMap(legacy=>[false,true].map(speedLegacy=>renderV3Prescription(components,guidance,legacy,speedLegacy)+(components.length>1?'\nTransition : durée à préciser.':''))));
  if(!texts.includes(session.details??''))errors.push('v3_prescription_text_mismatch');
  const minutes=components.length===1?components[0].durationMinutes:null;
  if(minutes===null?session.durationMin!==undefined:session.durationMin===undefined||Math.abs(session.durationMin-minutes)>1e-7)errors.push('v3_duration_mismatch');
  return {errors,unknown:[]};
 } catch {return {errors:['v3_saved_blocks_invalid'],unknown:[]};}
}
