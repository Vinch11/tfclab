import {appProfileDetStructure} from './appProfileDetStructure';
import type {ParsedPlan,ParsedSession} from '@/lib/aiPlanParser';
import type {FrozenAppPlanningInput} from './appPlanningInput';
import {generateAppPlanningV3Proposal,type V3ProposalOptions} from './appPlanningV3Proposal';
import type {V3Block} from '../../../scripts/library-v3/catalogueRuntime';
import {getDoctrineDomain} from '@/lib/zones/tfclDoctrine';
import {bindAppPlanMetadata} from '@/lib/plan/generatedPlanMetadata';
import {PLAN_PROVENANCE_SCHEMA} from '@/lib/plan/planProvenance';
function describe(blocks:readonly V3Block[]):string{
 return blocks.map(b=>b.kind==='repeat'?`${b.count.base} × ${b.label} : ${describe(b.steps)} ; récupération ${b.betweenSec} s`: `${b.label} : ${b.kind==='time'?`${b.seconds!.base/60} min`:b.kind==='distance'?`${b.meters!.base} m`:`${b.reps!.base} répétitions`}${b.domain?` · ${getDoctrineDomain(b.domain).label}`:''}`).join('\n');
}
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
  return d.sessions.map(s=>({...base,sport:s.sport,title:s.role==='race'?'Épreuve déclarée':s.components.map(c=>c.title).join(' + '),details:s.role==='race'?'Épreuve du calendrier ; durée non inventée.':s.components.map(c=>`${c.title}\n${describe(c.blocks)}\n${c.targets.targets.map(t=>`${t.domain?getDoctrineDomain(t.domain).label:'Force'} : ${t.min===null?'à individualiser':`${t.min}${t.max!==null&&t.max!==t.min?`–${t.max}`:''} ${t.metric}`} · ${t.note}`).join('\n')}${c.targets.missing.length?'\nRepères à préciser : '+c.targets.missing.join(', '):''}\nArrêt : ${c.review.stopRule}`).join('\n\n')+(s.sport==='brick'?'\nTransition : durée à préciser.':''),isRest:false,isKeySession:s.role==='key',...(s.durationMinutes!==null?{durationMin:s.durationMinutes}:{}),...(s.components.length===1?{catalogId:s.components[0].sourceId}:{}),detSourceComponents:structuredClone(s.components),...appProfileDetStructure(s)}));
 })}));
 const plan:ParsedPlan={title:`Plan TFCL™ — ${proposal.objective}`,diagnostic:`Limiteurs : ${proposal.limiterOrder.join(' → ')}. Plan construit depuis le profil disponible, à relire.`,totalWeeks:weeks.length,weeks,finalValidationIssues:[...new Set(proposal.checks.filter(c=>c.status==='pending').map(c=>c.code))].map(code=>({rule:'det_'+code,severity:'warning' as const,message:proposal.checks.find(c=>c.code===code&&c.status==='pending')!.message})),phases:proposal.weeks.map(w=>({name:w.phase??'Préparation',weeks:String(w.week)}))};
 return bindAppPlanMetadata({...plan,_provenance:{schema:PLAN_PROVENANCE_SCHEMA,engine:'det',mode:'app-profile',engineVersion,planningInput:{source:'app_planning_pipeline',fingerprint:app.fingerprint},prescriptionAllowed:false,sportingAttestation:false,syntheticFixture:false,generatedAt:new Date().toISOString()},_detSourceProposal:proposal} as ParsedPlan,app);
}
