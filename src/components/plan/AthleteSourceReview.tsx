import {COACH_SHORT_TRI_BRICKS} from '../../../experimental/det-engine/v401-coach-inputs-core';
import {useEffect,useRef,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import {canonicalJson} from '@/lib/plan/appendOnlyPlanVersionSave';
import {prepareLibraryReview,draftQualificationsForExplicitReview} from '@/lib/det/librarySourceReview';
import {checkCoachReviewContext,describeSourceBlocks,INTENT_LABELS,findSource,hashCoachInputs,type CoachReviewContext,type CoachDetInputSnapshot} from '@/lib/det/coachDetContext';
import type {FamilySourcePool} from '@/lib/det/familySourcePools';
import type {CoachAnswers,GenuineSourceReviews} from '@/lib/det/athleteDetBridge';
import {previewV3SourceDose} from '../../../experimental/det-engine/v31-v3-catalogue';
import {withTimeout} from '@/pages/__qa/ReadOnlyRlsAuditPage';

/** Per-athlete human source review using the existing append-only review store. */
export function AthleteSourceReview(props:{pool:FamilySourcePool;snapshot:CoachDetInputSnapshot|null;answers:CoachAnswers;sourcesVersion:string|null;fingerprint:string|null;coachId:string;athleteId:string;clock:CoachReviewContext['clock'];guard:()=>Promise<{userId:string;athleteId:string}|null>;onResolved:(g:GenuineSourceReviews)=>void}){
 const [prepared,setPrepared]=useState<Awaited<ReturnType<typeof prepareLibraryReview>>|null>(null);
 const [checked,setChecked]=useState<Record<string,boolean>>({}),[opened,setOpened]=useState<Record<string,boolean>>({});
 const [brickChecks,setBrickChecks]=useState<Record<string,boolean>>({});
 const compositions=COACH_SHORT_TRI_BRICKS.filter(b=>props.pool.family===('triathlon_'+b.goal));
 const bricksReady=compositions.every(b=>brickChecks[b.id]===true&&checked[b.bikeId]&&checked[b.runId]);
 const brickApprovals=compositions.filter(b=>brickChecks[b.id]===true).map(b=>({id:b.id,transitionSeconds:180}));
 const [notes,setNotes]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[uncertain,setUncertain]=useState(false);
 const currentKey=`${props.athleteId}|${props.coachId}|${props.fingerprint}|${canonicalJson(props.answers)}|${props.sourcesVersion}`;
 const live=useRef(currentKey);live.current=currentKey;
 useEffect(()=>{setBusy(false);setBrickChecks({});setChecked({});setOpened({});setMessage('');setUncertain(false);},[currentKey]);
 useEffect(()=>{let current=true;setPrepared(null);void prepareLibraryReview(props.pool).then(p=>{if(current)setPrepared(p);}).catch(e=>{if(current)setMessage(String(e));});return()=>{current=false;};},[props.pool]);
 const save=async()=>{
  if(!bricksReady||!prepared||!props.snapshot||!props.sourcesVersion||!props.fingerprint||!notes.trim()||!prepared.manifest.sources.every(s=>checked[s.id]&&opened[s.id]))return;
  const key=currentKey;setBusy(true);setMessage('');
  try{
   const user=await props.guard();if(live.current!==key)return;
   if(!user||user.userId!==props.coachId||user.athleteId!==props.athleteId)throw Error('Session ou athlète changé.');
   const base=structuredClone(props.snapshot);delete base.sourceReviewProvenance;
   const snapshot:CoachDetInputSnapshot={...base,sourceContentReview:{notes:notes.trim(),manifestHash:prepared.hash,athleteChecksKey:canonicalJson(props.answers)}};
   const inputsHash=await hashCoachInputs(snapshot);if(live.current!==key)return;
   const qualifications=draftQualificationsForExplicitReview(prepared.manifest,props.answers);
   const ctx={coachId:props.coachId,athleteId:props.athleteId,qualifications,brickApprovals,clock:props.clock,inputsHash,sourcesVersion:props.sourcesVersion};
   const check=checkCoachReviewContext({ctx,current:{coachId:props.coachId,athleteId:props.athleteId,snapshot,inputsHash,sourcesVersion:props.sourcesVersion}});
   if(check.ok===false)throw Error(check.refusals.join(' ; '));
   const row={coach_id:props.coachId,athlete_id:props.athleteId,inputs_snapshot:snapshot as never,inputs_hash:inputsHash,sources_version:props.sourcesVersion,source_qualifications:qualifications as never,session_clock:props.clock as never,brick_approvals:brickApprovals};
   setUncertain(true);
   const inserted=await withTimeout(supabase.from('det_coach_review_contexts').insert(row).select('id').single(),'INSERT revue des séances');
   if(live.current!==key)return;
   if(inserted.error||!inserted.data)throw Error('Revue non enregistrée : '+(inserted.error?.message??'réponse absente'));
   setUncertain(true);
   const read=await withTimeout(supabase.from('det_coach_review_contexts').select('*').eq('id',inserted.data.id).single(),'SELECT revue des séances');
   if(live.current!==key)return;
   if(read.error||!read.data||Object.entries(row).some(([k,v])=>canonicalJson((read.data as Record<string,unknown>)[k])!==canonicalJson(v)))throw Error('Revue écrite, mais sa relecture exacte n’est pas confirmée. Rechargez avant de poursuivre.');
   props.onResolved({origin:'det_coach_review_contexts',reviewContextId:read.data.id,coachId:props.coachId,athleteId:props.athleteId,reviewedAt:read.data.created_at,qualifications,brickApprovals,planningInputFingerprint:props.fingerprint,athleteChecksKey:canonicalJson(props.answers)});
   setMessage('Revue enregistrée et relue pour cet athlète. Le plan reste à générer et à relire.');
  }catch(e){if(live.current===key)setMessage(e instanceof Error?e.message:String(e));}
  finally{if(live.current===key)setBusy(false);}
 };
 return <section className="space-y-2 border rounded-md p-3" aria-label="Revue des séances pour cet athlète"><h4 className="font-medium">Relire les séances pour cet athlète</h4><p className="text-xs">Ouvrez chaque séance, vérifiez ses blocs et sa dose, puis confirmez votre lecture. Cette revue ne vaut pas attestation scientifique ni approbation du plan.</p>
  {!props.snapshot&&<p className="text-xs">Complétez d’abord les données et vérifications de l’athlète pour enregistrer la revue.</p>}
  <div className="max-h-96 overflow-auto space-y-3">{prepared?.manifest.sources.map(s=>{const source=findSource(s.id)!;let blocks=s.blocks;let error='';try{blocks=previewV3SourceDose(findSource(s.id)!,props.pool.doses[s.id]??{}).blocks;}catch(e){error=String(e);}return <article key={s.id} className="border rounded p-2"><details onToggle={e=>{if(e.currentTarget.open)setOpened(p=>({...p,[s.id]:true}));}}><summary>{s.title}</summary><p className="text-xs">Intention : {INTENT_LABELS[source.primaryIntent]??source.primaryIntent}. {source.focus}</p><p className="text-xs">Phases : {s.phases.join(', ')} · récupération minimale source : {source.minimumRecoveryHours} h</p><p className="text-xs">Références de principes : {source.evidence.referenceIds.join(', ')}. Séance sans validation scientifique individuelle.</p><p className="text-xs">Arrêt : {source.stopRule}</p><ul className="text-xs">{describeSourceBlocks(blocks).map((b,i)=><li key={i}>{b}</li>)}</ul><p className="text-xs">Prérequis : {s.prerequisites.join(' ; ')}</p><p className="text-xs">Contre-indications : {s.contraindications.join(' ; ')}</p>{error&&<p className="text-xs">Dose non résolue : {error}</p>}</details><label className="flex gap-2 text-xs"><Checkbox disabled={busy||uncertain||!opened[s.id]||!!error} checked={checked[s.id]===true} onCheckedChange={v=>setChecked(p=>({...p,[s.id]:v===true}))}/>J’ai relu cette séance et sa dose pour cet athlète.</label></article>;})}</div>
  {compositions.map(b=><label key={b.id} className="flex gap-2 text-xs"><Checkbox disabled={busy||uncertain||!checked[b.bikeId]||!checked[b.runId]} checked={brickChecks[b.id]===true} onCheckedChange={v=>setBrickChecks(p=>({...p,[b.id]:v===true}))}/>J’ai revu l’enchaînement {b.id} pour cet athlète : {b.bikeId}, transition de 3 min, puis {b.runId}, avec les doses des deux sources affichées ci-dessus.</label>)}
  <textarea disabled={busy||uncertain} aria-label="Notes de revue des séances" className="border rounded p-2 w-full text-sm" maxLength={4000} placeholder="Observations de votre revue" value={notes} onChange={e=>setNotes(e.target.value)}/>
  <Button type="button" variant="outline" disabled={busy||uncertain||!bricksReady||!props.snapshot||!notes.trim()||!prepared?.manifest.sources.every(s=>checked[s.id]&&opened[s.id])} onClick={()=>void save()}>Enregistrer ma revue des séances</Button>{message&&<p className="text-xs" role="status">{message}</p>}
 </section>;
}
