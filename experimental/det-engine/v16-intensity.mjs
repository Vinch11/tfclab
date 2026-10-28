import {assertCanonicalIntegrity} from './v16-canonical.mjs';
import {getDoctrineDomain,resolveVO2maxRange} from '../../src/lib/zones/tfclDoctrine.ts';
/** A display conversion of a declared domain, never a physiological dose optimizer. */
export function personalizedIntensity(c,refs={}){
 assertCanonicalIntegrity(c);const id=c.prescription.doctrineDomains[0];if(!id)return{status:'unknown',reason:'no_explicit_doctrine_domain',value:null};
 const sourceText=[...c.original.effective.structure.map(p=>p.text),c.original.effective.avoid??'',c.original.effective.notes??''].join(' ');
 // Source percentages may contain distinct bounds, terrain exceptions or competing anchors.
 // Do not overwrite them with a broader generic domain; a source-specific resolver is required.
 if(/\d+(?:[.,]\d+)?\s*%/.test(sourceText))return{status:'unknown',reason:'source_specific_numeric_constraints_require_resolution',value:null,domain:id};
 const sport=c.prescription.discipline,domain=getDoctrineDomain(id),anchor=sport==='bike'?refs.ftpWatts:sport==='run'?refs.mlssSpeedKmh:null;
 if(!Number.isFinite(anchor)||anchor<=0||!refs.provenance)return{status:'unknown',reason:'individual_anchor_and_provenance_required',value:null,domain:id};
 let range=sport==='bike'?domain.bike:domain.run;if(!range)return{status:'unknown',reason:'domain_not_prescribed_by_numeric_threshold_fraction',value:null,domain:id};
 if(id==='vo2max'){const upper=sport==='bike'?refs.mapWatts:refs.vVO2SpeedKmh;if(!Number.isFinite(upper)||upper<=anchor)return{status:'unknown',reason:'individual_vo2_upper_anchor_required',value:null,domain:id};const resolved=resolveVO2maxRange(sport,upper/anchor);if(resolved.source!=='athlete')return{status:'unknown',reason:'upper_anchor_outside_existing_doctrine_resolution',value:null,domain:id};range=resolved.range;}
 return{status:'candidate_display',domain:id,unit:sport==='bike'?'W':'km/h',value:{min:Number((anchor*range.min).toFixed(2)),max:Number((anchor*range.max).toFixed(2))},anchor,provenance:refs.provenance,rule:'src/lib/zones/tfclDoctrine.ts',scientificIndividualValidation:false,changesSessionDuration:false,primaryStimulusOnly:true,warning:'TFCL domain convention, not an individually demonstrated optimal range or acquired tolerance.'};
}
