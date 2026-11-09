/**
 * V3.29 — proof of a genuine brief source-defined intensity reminder in
 * an individual, reviewed taper key slot. NEVER a native validation waiver.
 *
 * Source high minutes come from exact configured V3 BLOCKS, not Z4 labels,
 * title regexes, "seuil"/"CSS" wording, or guessed recovery. This proves
 * the stimulus exists; it does NOT scientifically approve its training dose.
 */
import type {ParsedSession} from '@/lib/aiPlanParser';
import type {RepairWorkoutMetadata} from '../../supabase/functions/_shared/repairSportingEquivalence';
import type {StructuredZoneDose} from './v310-structured-zone-dose';

export interface ProvenTaperStimulus {
  sourceId:string;durationMin:number;lowMin:number;midMin:number;
  highMin:number;unknownMin:number;reviewedSource:true;
  scientificAttestation:false;
}
export type TaperSourceEvidence=(id:string,durationMin:number|undefined)=>
  StructuredZoneDose|null|undefined;
export type TaperStimulusResult=
  |{verified:true;evidence:ProvenTaperStimulus}
  |{verified:false;reason:string};

const invalid=(reason:string):TaperStimulusResult=>({verified:false,reason});
const finiteNonnegative=(value:number)=>Number.isFinite(value)&&value>=0;

export function verifyReviewedTaperKeyStimulus(
  session:ParsedSession,card:RepairWorkoutMetadata|undefined,
  source:TaperSourceEvidence|undefined,
):TaperStimulusResult{
  if(!session.isKeySession||session.isRest)return invalid('not_a_training_key_slot');
  if(!session.catalogId||!card||card.id!==session.catalogId)
    return invalid('no_matching_approved_source');
  if(!card.phases.includes('taper')||
     !card.tags.includes('individual-coach-approval-recorded')||
     !card.tags.includes('v3-sporting-source-individually-reviewed-candidate')||
     !card.tags.includes('v3-intensity-anchors-individually-verified'))
    return invalid('taper_source_not_individually_reviewed');
  if(card.mainZoneMax<4)return invalid('no_source_z4_plus_domain');
  const duration=session.durationMin;
  if(typeof duration!=='number'||!Number.isFinite(duration)||duration<=0)
    return invalid('duration_not_measured');
  if(!source)return invalid('exact_source_evidence_unavailable');
  let dose:StructuredZoneDose|null|undefined;
  try{dose=source(card.id,duration);}catch{return invalid('source_evidence_provider_failed');}
  if(!dose||dose.provenance!=='v3_individually_configured_blocks_only'||
     dose.sourceIds.length!==1||dose.sourceIds[0]!==card.id)
    return invalid('source_provenance_unverified');
  if(![dose.low,dose.mid,dose.high,dose.unknown,dose.durationMin]
       .every(finiteNonnegative)||
     Math.abs(dose.durationMin-duration)>1e-7||
     Math.abs(dose.low+dose.mid+dose.high+dose.unknown-duration)>1e-7)
    return invalid('structured_minutes_inconsistent');
  if(dose.high<=0)return invalid('no_proven_z4_plus_minutes');
  // A taper *reminder* must be predominantly low-dose, not a new hard
  // workout. This conservative necessary screen is NOT a published
  // universal safety threshold; the coach still assesses absolute dose.
  if(dose.high>=dose.low||dose.unknown>dose.low)
    return invalid('not_conservatively_low_dominant');
  return {verified:true,evidence:{
    sourceId:card.id,durationMin:duration,lowMin:dose.low,midMin:dose.mid,
    highMin:dose.high,unknownMin:dose.unknown,reviewedSource:true,
    scientificAttestation:false,
  }};
}
