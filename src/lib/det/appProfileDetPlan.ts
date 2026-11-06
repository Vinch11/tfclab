import {coachBlocks,coachTarget,coachMissingReference} from '@/lib/plan/coachPrescriptionText';
import {appProfileDetStructure} from './appProfileDetStructure';
import type {ParsedPlan,ParsedSession} from '@/lib/aiPlanParser';
import type {FrozenAppPlanningInput} from './appPlanningInput';
import {generateAppPlanningV3Proposal,type V3ProposalOptions} from './appPlanningV3Proposal';
import {getDoctrineDomain} from '@/lib/zones/tfclDoctrine';
import {bindAppPlanMetadata} from '@/lib/plan/generatedPlanMetadata';
import {PLAN_PROVENANCE_SCHEMA} from '@/lib/plan/planProvenance';
/** Common plan representation, not a qualified-runner outcome or review.
 * Unknown durations remain absent; the complete source proposal is retained.
 */
export async function generateAppProfileDetPlan(app:FrozenAppPlanningInput,athleteId:string,options:V3ProposalOptions={},engineVersion:string){
 const proposal=await generateAppPlanningV3Proposal(app,athleteId,options);
 const blocked=proposal.checks.filter(c=>c.status==='blocked');
 if(blocked.length)throw Error(blocked.map(c=>c.message).join('\n'));
 const weeks=proposal.weeks.map(w=>({weekNumber:w.week,theme:w.focus??'Maintien',phase:w.phase??'Préparation',coachNotes:w.durationMinutes===null?'Volume total non certifié : certaines durées restent à préciser.':undefined,sessions:w.days.flatMap((d,dayIndex):ParsedSession[]=>{
  const base={weekNumber:w.week,weekTheme:w.focus??'Maintien',phase:w.phase??'Préparation',dayName:d.day,dayIndex};
  if(d.rest)return [{...base,sport:'Repos',title:'Repos prévu',details:'',isRest:true}];
  return d.sessions.map(s=>({...base,sport:s.sport,title:s.role==='race'?'Épreuve déclarée':s.components.map(c=>c.title).join(' + '),details:s.role==='race'?'Épreuve du calendrier ; durée non inventée.':s.components.map(c=>`${c.title}\n${coachBlocks(c.blocks)}\n${c.targets.targets.map(t=>`${t.domain?getDoctrineDomain(t.domain).label:'Force'} : ${coachTarget(t)}`).join('\n')}${c.targets.missing.length?'\nRepères à préciser : '+[...new Set(c.targets.missing.map(coachMissingReference))].join(', '):''}\nArrêt : ${c.review.stopRule}`).join('\n\n')+(s.sport==='brick'?'\nTransition : durée à préciser.':''),isRest:false,isKeySession:s.role==='key',...(s.durationMinutes!==null?{durationMin:s.durationMinutes}:{}),...(s.components.length===1?{catalogId:s.components[0].sourceId}:{}),detSourceComponents:structuredClone(s.components),...appProfileDetStructure(s)}));
 })}));
 const phases:ParsedPlan['phases']=[];
 for(const w of proposal.weeks){const name=w.phase??'Préparation',last=phases.at(-1);if(last?.name===name){const start=last.weeks.split('-')[0];last.weeks=start===String(w.week)?start:`${start}-${w.week}`;}else phases.push({name,weeks:String(w.week)});}
 const plan:ParsedPlan={title:`Plan TFCL™ — ${proposal.objective}`,diagnostic:`Limiteurs : ${proposal.limiterOrder.join(' → ')}. Plan construit depuis le profil disponible. Intensités calculées depuis les repères disponibles, à confirmer ; elles ne prouvent pas une mesure individuelle de LT1/MLSS.`,totalWeeks:weeks.length,weeks,finalValidationIssues:[...new Set(proposal.checks.filter(c=>c.status==='pending').map(c=>c.code))].map(code=>({rule:'det_'+code,severity:'warning' as const,message:proposal.checks.find(c=>c.code===code&&c.status==='pending')!.message})),phases};
 return bindAppPlanMetadata({...plan,_provenance:{schema:PLAN_PROVENANCE_SCHEMA,engine:'det',mode:'app-profile',engineVersion,planningInput:{source:'app_planning_pipeline',fingerprint:app.fingerprint},prescriptionAllowed:false,sportingAttestation:false,syntheticFixture:false,generatedAt:new Date().toISOString()},_detSourceProposal:proposal} as ParsedPlan,app);
}
