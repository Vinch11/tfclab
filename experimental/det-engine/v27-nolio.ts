import {nolioTextFixture} from './v18-outputs.mjs';
import {validateNolioV1Payload} from './v16-nolio.mjs';
/** Text fixture only for execution-ready sources. Never a network sender or structured workout claim. */
export function simulateExecutionTextV27(e:any,record:any,planStartDate:string){
 const refuse=(reason:string)=>({status:'refused',reason,payload:null,realExportPermitted:false,networkRequests:0});
 if(!e.technicallyExecutable)return refuse('technical_execution_contract_not_satisfied');
 const date=new Date(Date.parse(planStartDate+'T00:00:00Z')+((e.week-1)*7+e.day)*86400000).toISOString().slice(0,10);
 const raw=nolioTextFixture(record.originalCanonical,record.sourceV18Recipe,{synthetic:true,apiVersion:'v1',mode:'text_only',acknowledgeUnstructured:true,dateStart:date,minutes:e.minutesReserved,occurrence:(e.week-1)*7+e.day});
 if(!raw.payload)return refuse(raw.reasons.join(';'));
 const targets=e.intensity.numericTargets.map((t:any)=>`${t.zone} / ${t.domain}: ${t.min}–${t.max} ${t.unit}; domaine candidat, minimum0 = absence de borne basse prescrite`).join('\n');
 const payload={...raw.payload,description:raw.payload.description+'\n\nV27 — structure technique candidate\n'+targets+'\nDurée complète : '+e.execution.seconds+' secondes. Enveloppe déclarée : '+e.currentCapacity+' minutes. Tolérance, récupération et dose individuelle non approuvées ; revue coach obligatoire.'};
 const contract=validateNolioV1Payload(payload);if(!contract.valid)return refuse(contract.errors.join(';'));
 return{status:'local_text_contract_pass',payload,contract,workoutStructured:false,individualPrescriptionApproved:false,remoteAcceptanceVerified:false,realExportPermitted:false,networkRequests:0};
}
