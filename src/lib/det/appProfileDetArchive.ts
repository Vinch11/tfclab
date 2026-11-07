import type {ParsedPlan} from '@/lib/aiPlanParser';
import {parseV3PlanProposal} from './v3ProposalLocalSave';
import {auditV3ProposalDoseIntegrity} from './appPlanningV3Audit';
import {PLAN_PROVENANCE_SCHEMA} from '@/lib/plan/planProvenance';
/** Archive readiness only, never prescription/export approval. Unknown inputs
 * are retained so a coach can save and reopen the exact version for review. */
export function appProfileDetArchiveSummary(plan:ParsedPlan,expectedAthleteId?:string){
 const p=plan as ParsedPlan & {_provenance?:{schema?:string;engine?:string;mode?:string;prescriptionAllowed?:boolean;sportingAttestation?:boolean;planningInput?:{fingerprint?:string}};_detSourceProposal?:unknown};
 const provenance=p._provenance;
 if(provenance?.schema!==PLAN_PROVENANCE_SCHEMA||provenance.engine!=='det'||provenance.mode!=='app-profile'||provenance.prescriptionAllowed!==false||provenance.sportingAttestation!==false)throw Error('Provenance DET incohérente : aucune version enregistrée.');
 const proposal=parseV3PlanProposal(p._detSourceProposal);
 if(provenance.planningInput?.fingerprint!==proposal.planningInputFingerprint)throw Error('Profil DET divergent : aucune version enregistrée.');
 if(expectedAthleteId&&proposal.athleteId!==expectedAthleteId)throw Error("Athlète DET différent : aucune version enregistrée.");
 const integrity=auditV3ProposalDoseIntegrity(proposal);
 if(integrity.some(c=>c.status==='blocked'))throw Error('Sources ou doses DET modifiées : revue nécessaire avant archivage.');
 return {status:'review_required',engine:'det',mode:'app-profile',prescriptionAllowed:false,sportingAttestation:false,sourceQualificationIsNotPlanApproval:true,planningInputFingerprint:proposal.planningInputFingerprint,checks:[...proposal.checks,...integrity],manualEditsNotRequalified:true};
}
