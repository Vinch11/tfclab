import {NolioAppBrickPreparation} from './NolioAppBrickPreparation';
import {HumanCoachReview} from '@/components/plan/HumanCoachReview';
import {NolioV2ProgressPanel,type V2StatusView} from '@/qa/pilot-review/NolioV2ProgressPanel';
import {sessionsFromPlanJson} from '../../../supabase/functions/_shared/nolioV2/planSessions';
import {requiredExerciseLabels,raceIdentityOf} from '../../../supabase/functions/_shared/nolioV2/plannedMapper';
import {CHECKED_IN_PLAN_RELEASE_INFO} from '../../../supabase/functions/_shared/planReleaseManifest';
import {sameExportCapabilities} from '../../../supabase/functions/_shared/nolioV2/exportCapabilities';
import {currentExportVerification} from '@/lib/nolio/exportVerification';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {supabase} from '@/integrations/supabase/client';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {canonical,sha256Hex} from '../../../supabase/functions/_shared/nolioV2/dryRun';
import type {NolioExportScope} from '../../../supabase/functions/_shared/nolioV2/exportScope';
import {confirmFullPlanDryRun,PLAN_DRY_JOB_COLS,PLAN_DRY_RECEIPT_COLS,parsePlanDryResp,reasonFr,type PlanDryResp} from '@/qa/pilot-review/planDryRunView';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
const Context=createContext<((scope:NolioExportScope)=>void)|null>(null);
async function bounded<T>(p:PromiseLike<T>):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([Promise.resolve(p),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Délai dépassé : résultat inconnu. Vérifiez Nolio avant de réessayer.')),35000);})]);}
 finally{clearTimeout(timer);}
}
export function NolioV2ScopeButton({scope,label}:{scope:NolioExportScope;label:string}){
 const open=useContext(Context);
 return open?<Button type="button" size="sm" variant="outline" onClick={e=>{e.stopPropagation();open(scope);}}>{label}</Button>:null;
}
function samePrescription(a:unknown,b:unknown){
 const normalize=(p:unknown)=>{const c=JSON.parse(JSON.stringify(p));if(c?._provenance)delete c._provenance.generatedAt;delete c._markdown;return canonical(c);};
 return normalize(a)===normalize(b);
}
const explanations:Record<string,string>={
 plan_not_prescription_allowed:'Ce plan n’est pas encore autorisé à la prescription.',
 release_sporting_attestation_absent:'La validation sportive de la version du moteur reste manquante.',
 release_sporting_attestation_invalid_or_stale:'La validation sportive ne correspond plus à cette version du moteur ou sa signature est invalide.',
 coach_review_absent_or_stale:'La revue du coach est absente ou ne correspond plus à cette version.',
 human_plan_attestation_absent:'La revue du plan doit être enregistrée.',
 dry_run_job_absent:'La simulation de cette sélection reste à effectuer.',
 coach_consent_for_this_plan_absent:'Confirmez explicitement cette sélection avant l’envoi.',
 precheck_incomplete:'Certaines séances de cette sélection ne sont pas encore convertibles.',
};
/** Common viewer actions, backed only by the owned saved version and V2.
 * No legacy catalogue replacement, no implicit send or fabricated review. */
export function NolioV2ExportProvider({plan:inputPlan,athleteId,planVersionId:inputVersionId,enabled,children}:{plan:ParsedPlan;athleteId?:string;planVersionId?:string|null;enabled:boolean;children:ReactNode}){
 const [preparedVersion,setPreparedVersion]=useState<{id:string;plan:ParsedPlan}|null>(null);
 useEffect(()=>{setPreparedVersion(null);},[inputPlan,inputVersionId,athleteId]);
 const plan=preparedVersion?.plan??inputPlan,planVersionId=preparedVersion?.id??inputVersionId;
 const [scope,setScope]=useState<NolioExportScope|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[dry,setDry]=useState<PlanDryResp|null>(null),[consent,setConsent]=useState(false),[ready,setReady]=useState(false);
 const [simulationConfirmed,setSimulationConfirmed]=useState(false),[releaseReady,setReleaseReady]=useState<boolean|null>(null),[verifyFrom,setVerifyFrom]=useState(0);
 const [reviewPlan,setReviewPlan]=useState<unknown|null>(null),[showReview,setShowReview]=useState(false),[refsView,setRefsView]=useState<V2StatusView|null>(null);
 const epoch=useRef(0),lock=useRef(false);
 useEffect(()=>{epoch.current++;setScope(null);setDry(null);setSimulationConfirmed(false);setReleaseReady(null);setVerifyFrom(0);setConsent(false);setReady(false);setMessage('');setReviewPlan(null);setShowReview(false);setRefsView(null);return()=>{epoch.current++;};},[plan,athleteId,planVersionId]);
 useEffect(()=>{const subscription=supabase.auth.onAuthStateChange?.(event=>{if(event==='TOKEN_REFRESHED'||event==='INITIAL_SESSION')return;epoch.current++;setDry(null);setSimulationConfirmed(false);setConsent(false);setReady(false);setMessage('Session modifiée : les contrôles doivent être relus.');});return()=>subscription?.data.subscription.unsubscribe();},[]);
 const open=(s:NolioExportScope)=>{epoch.current++;setScope(s);setDry(null);setSimulationConfirmed(false);setReleaseReady(null);setVerifyFrom(0);setConsent(false);setReady(false);setMessage('');setReviewPlan(null);setShowReview(false);setRefsView(null);};
 async function action(kind:'precheck'|'run'|'send-check'|'send'|'verify'){
  if(lock.current||!scope)return;
  lock.current=true;setBusy(true);const token=epoch.current;
  const current=()=>token===epoch.current;
  try{
   if(!athleteId||!planVersionId)throw Error('Enregistrez ce plan dans l’historique, puis ouvrez la version sauvegardée pour l’exporter.');
   const user=await bounded(supabase.auth.getUser());const uid=user.data.user?.id;if(user.error||!uid)throw Error('Session expirée : reconnectez-vous.');
   const row=await bounded(supabase.from('plan_versions').select('id,athlete_id,coach_id,plan_json').eq('id',planVersionId).eq('athlete_id',athleteId).eq('coach_id',uid).maybeSingle());
   if(!current())return;
   if(row.error||!row.data||row.data.id!==planVersionId||row.data.athlete_id!==athleteId||row.data.coach_id!==uid||!samePrescription(row.data.plan_json,plan))throw Error('Le plan affiché diffère de la version sauvegardée : enregistrez les modifications avant l’export.');
   setReviewPlan(row.data.plan_json);
   const second=await bounded(supabase.auth.getUser());if(second.error||second.data.user?.id!==uid||!current())throw Error('Session modifiée : action annulée.');
   const planHash=await sha256Hex(canonical(row.data.plan_json));if(!current())return;
   const common={planVersionId,...(scope.kind==='all'?{}:{scope})};
   const capabilities=await Promise.all(['nolio-v2-plan-dry-run','nolio-v2-send-plan'].map(async functionName=>{const r=await bounded(supabase.functions.invoke(functionName,{body:{planVersionId,action:'capabilities'}}));if(r.error||!sameExportCapabilities(r.data,functionName,CHECKED_IN_PLAN_RELEASE_INFO.releaseId))throw Error('Le serveur Nolio et cette application ne sont pas synchronisés. Les fonctions d’export doivent être déployées ensemble ; aucun envoi effectué.');return r.data;}));
   if(!current())return;setReleaseReady(capabilities[1].sportingReleaseAuthorized===true);
   if(kind==='precheck'||kind==='run'){
    const result=await bounded(supabase.functions.invoke('nolio-v2-plan-dry-run',{body:{...common,action:kind}}));
    if(!current())return;
    if(result.error)throw Error('Le contrôle Nolio a échoué. Le service doit prendre en charge cette sélection (plan, semaine ou séance). Aucun envoi effectué.');
    const parsed=parsePlanDryResp(result.data);if(!parsed)throw Error('Réponse Nolio non vérifiable.');
    if(parsed.planSha256&&parsed.planSha256!==planHash)throw Error('Version Nolio divergente : rien n’est envoyé.');
    let confirmed=false;
    if(parsed.progress?.fullyValidated){
     const [job,receipts]=await Promise.all([bounded(supabase.from('qa_nolio_v2_plan_dry_run_jobs').select(PLAN_DRY_JOB_COLS).eq('id',parsed.progress.jobId).eq('coach_id',uid).eq('plan_version_id',planVersionId).maybeSingle()),bounded(supabase.from('qa_nolio_v2_plan_dry_run_receipts').select(PLAN_DRY_RECEIPT_COLS).eq('job_id',parsed.progress.jobId).eq('coach_id',uid))]);
     if(!current())return;
     if(!job.error&&!receipts.error)confirmed=(await confirmFullPlanDryRun({planVersionId,coachId:uid,resp:parsed,job:job.data,receipts:receipts.data,localPlanSha256:planHash})).confirmed;
    }
    if(!current())return;
    setDry(parsed);setSimulationConfirmed(confirmed);setReady(false);
    setMessage(parsed.precheck?.complete?`Sélection contrôlée : ${parsed.precheck.operations} opération(s). ${parsed.progress?.fullyValidated?confirmed?'Simulation confirmée par relecture des reçus.':'Simulation annoncée complète, mais reçus non confirmés : envoi bloqué.':parsed.progress?`${parsed.progress.valid}/${parsed.progress.totalOps} simulées ; reprendre uniquement si aucun résultat incertain.`:'Simulation à effectuer avant l’envoi.'}`:reasonFr(parsed.code)||parsed.code);
   }else{
    if(!dry?.progress||!dry.planSha256||!dry.refsSha256||!dry.opsSha256||dry.planSha256!==planHash||(kind!=='verify'&&(!consent||!simulationConfirmed)))throw Error('Simulation concordante et confirmation de cette sélection nécessaires.');
    const expected={planSha256:dry.planSha256,refsSha256:dry.refsSha256,opsSha256:dry.opsSha256,jobId:dry.progress.jobId};
    const result=await bounded(supabase.functions.invoke('nolio-v2-send-plan',{body:{...common,action:kind==='verify'?'verify':kind==='send'?'send':'precheck',...(kind==='verify'?{fromIndex:verifyFrom}:{}),expected,consent:consent===true}}));
    if(!current())return;
    if(result.error)throw Error('Résultat d’envoi inconnu : vérifiez Nolio avant toute nouvelle tentative.');
    const d=result.data as {status?:string;gate?:string[];preview?:{planSha256?:string;refsSha256?:string;opsSha256?:string};reason?:string};
    if(d.preview?.planSha256!==expected.planSha256||d.preview?.refsSha256!==expected.refsSha256||d.preview?.opsSha256!==expected.opsSha256)throw Error('Réponse d’envoi divergente : résultat non confirmé.');
    setReady(kind==='send-check'&&d.status==='READY'&&Array.isArray(d.gate)&&!d.gate.length);
    if(kind==='verify'){
     if(d.status!=='VERIFY')throw Error(d.reason??'Vérification non confirmée.');
     const receipts=await bounded(supabase.from('qa_nolio_v2_plan_verify_receipts').select('*').eq('coach_id',uid).eq('plan_version_id',planVersionId).eq('plan_sha256',expected.planSha256).eq('refs_sha256',expected.refsSha256).eq('ops_sha256',expected.opsSha256).order('created_at',{ascending:false}).limit(1000));
     if(!current())return;if(receipts.error)throw Error('Relecture des preuves Nolio impossible : résultat inconnu.');
     const checked=currentExportVerification({coachId:uid,planVersionId,resp:dry,receipts:receipts.data});setVerifyFrom(checked.nextIndex);
     setMessage(`${checked.verified}/${checked.total} activité(s) confirmée(s) par lecture exacte et unique dans Nolio.${checked.fullyVerified?' Sélection intégralement vérifiée.':' Poursuivre la vérification ; aucune activité n’est renvoyée.'}`);
    }else setMessage(d.gate?.length?d.gate.map(c=>explanations[c]??c).join(' '):kind==='send-check'?'Conditions d’envoi vérifiées pour cette sélection.':d.status==='DONE'?'Lot traité : vérifiez maintenant les activités dans Nolio pour confirmer leur présence.':`Envoi interrompu (${d.status??'résultat inconnu'}). Vérifiez dans Nolio avant de reprendre ; aucune relance automatique.`);
   }
  }catch(e){if(current()){setMessage((e as Error).message);setReady(false);}}finally{lock.current=false;setBusy(false);}
 }
 async function loadOwnedVersion(){
  if(lock.current||!planVersionId||!athleteId)return;lock.current=true;setBusy(true);const token=epoch.current;
  try{
   const u=await bounded(supabase.auth.getUser());const uid=u.data.user?.id;if(u.error||!uid)throw Error('Session expirée.');
   const r=await bounded(supabase.from('plan_versions').select('id,athlete_id,coach_id,plan_json').eq('id',planVersionId).eq('coach_id',uid).eq('athlete_id',athleteId).maybeSingle());
   const again=await bounded(supabase.auth.getUser());if(token!==epoch.current)return;
   if(again.error||again.data.user?.id!==uid||r.error||!r.data||r.data.id!==planVersionId||r.data.coach_id!==uid||r.data.athlete_id!==athleteId||!samePrescription(r.data.plan_json,plan))throw Error('Version sauvegardée ou identité différente.');
   setReviewPlan(r.data.plan_json);setMessage('Version sauvegardée relue. Vous pouvez préparer ses enchaînements et relire la revue coach.');
  }catch(e){if(token===epoch.current)setMessage((e as Error).message);}finally{lock.current=false;setBusy(false);}
 }
 async function refsAction(body:Record<string,unknown>){
  if(lock.current||!athleteId||!planVersionId||!['status','load_refs','update_refs'].includes(String(body.action)))return;
  lock.current=true;setBusy(true);const token=epoch.current;
  try{
   const u=await bounded(supabase.auth.getUser());const uid=u.data.user?.id;if(u.error||!uid)throw Error('Session expirée.');
   const row=await bounded(supabase.from('plan_versions').select('id,athlete_id,coach_id,plan_json').eq('id',planVersionId).eq('coach_id',uid).eq('athlete_id',athleteId).maybeSingle());
   if(token!==epoch.current)return;
   if(row.error||!row.data||row.data.id!==planVersionId||row.data.coach_id!==uid||row.data.athlete_id!==athleteId||!samePrescription(row.data.plan_json,plan))throw Error('Version sauvegardée différente : action annulée.');
   const again=await bounded(supabase.auth.getUser());if(again.error||again.data.user?.id!==uid||token!==epoch.current)throw Error('Identité modifiée.');
   const r=await bounded(supabase.functions.invoke('nolio-v2-oauth',{body:{...body,athleteId}}));if(token!==epoch.current)return;
   if(r.error||!r.data||r.data.status==='BLOCKED')throw Error('Correspondances Nolio indisponibles : '+String(r.data?.reason??'connexion à vérifier'));
   setReviewPlan(row.data.plan_json);setRefsView(r.data as V2StatusView);setDry(null);setSimulationConfirmed(false);setConsent(false);setReady(false);setMessage('Correspondances relues. Toute modification impose une nouvelle simulation.');
  }catch(e){if(token===epoch.current)setMessage((e as Error).message);}finally{lock.current=false;setBusy(false);}
 }
 const extracted=sessionsFromPlanJson(reviewPlan??plan).sessions;
 const sports=[...new Set(extracted.filter(s=>!s.isRest).flatMap(s=>s.sport==='brick'&&(s.detStructuredWorkout||s.detStructuredComponents)?['bike','run']:[s.sport]))];
 const races=extracted.map(raceIdentityOf).filter((r):r is NonNullable<typeof r>=>!!r);
 const title=scope?.kind==='all'?'le plan entier':scope?.kind==='weeks'?scope.from===scope.to?`la semaine ${scope.from}`:`les semaines ${scope.from} à ${scope.to}`:`${scope?.keys.length??0} séance(s)`;
 return <Context.Provider value={enabled?open:null}>{children}
  <Dialog open={!!scope} onOpenChange={v=>{if(!v){epoch.current++;setScope(null);setReady(false);}}}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Exporter vers Nolio</DialogTitle><DialogDescription>Exporter {title}, avec les dates et prescriptions sauvegardées. Le contrôle ne crée aucune activité.</DialogDescription></DialogHeader>
   {scope&&<div className="space-y-2 text-sm">
    <label>Contenu à exporter <select aria-label="Contenu à exporter" value={scope.kind} disabled={busy} onChange={e=>open(e.target.value==='all'?{kind:'all'}:e.target.value==='weeks'?{kind:'weeks',from:1,to:1}:{kind:'sessions',keys:[]})} className="border rounded p-1"><option value="all">Plan entier</option><option value="weeks">Une semaine ou une plage</option><option value="sessions">Séances sélectionnées</option></select></label>
    {scope.kind==='weeks'&&<div className="flex gap-2"><label>De S<input aria-label="Première semaine Nolio" type="number" min={1} max={104} value={scope.from} disabled={busy} className="w-16 border rounded" onChange={e=>open({...scope,from:Number(e.target.value)})}/></label><label>à S<input aria-label="Dernière semaine Nolio" type="number" min={scope.from} max={104} value={scope.to} disabled={busy} className="w-16 border rounded" onChange={e=>open({...scope,to:Number(e.target.value)})}/></label></div>}
    {scope.kind==='sessions'&&<div className="max-h-48 overflow-auto space-y-1">{plan.weeks.flatMap(w=>w.sessions.map((s,i)=>({s,key:`S${s.weekNumber}-J${s.dayIndex}-${i}`}))).filter(({s})=>!s.isRest).map(({s,key})=><label className="flex gap-2" key={key}><input type="checkbox" disabled={busy} checked={scope.keys.includes(key)} onChange={e=>open({kind:'sessions',keys:e.target.checked?[...scope.keys,key]:scope.keys.filter(k=>k!==key)})}/><span>S{s.weekNumber} · {s.dayName} · {s.title}</span></label>)}</div>}
   </div>}
   <Button disabled={busy||!planVersionId} variant="outline" onClick={()=>void loadOwnedVersion()}>Préparer la version sauvegardée</Button>
   {preparedVersion&&<p className="text-sm">Version préparée sauvegardée dans l’historique. Les exports suivants utilisent cette nouvelle version ; le plan d’origine est conservé.</p>}
   {reviewPlan&&planVersionId&&athleteId&&<NolioAppBrickPreparation plan={reviewPlan as ParsedPlan} planVersionId={planVersionId} athleteId={athleteId} onSaved={(id,next)=>{epoch.current++;setPreparedVersion({id,plan:next});}}/>}
   <Button disabled={busy||!planVersionId} variant="outline" onClick={()=>void refsAction({action:"status"})}>Corriger les associations Nolio</Button>
   {refsView&&<NolioV2ProgressPanel status={refsView} busy={busy} ready={!!planVersionId} identityKey={`${athleteId}|${planVersionId}`} planSports={sports} exerciseLabels={requiredExerciseLabels(extracted)} raceSource={races.length===1?races[0]:null} act={refsAction} simulation={simulationConfirmed?"CONFIRMED":"NONE"}/>}
   {reviewPlan&&<Button disabled={busy} variant="outline" onClick={()=>setShowReview(v=>!v)}>Relire ma revue coach</Button>}
   {showReview&&reviewPlan&&planVersionId&&<HumanCoachReview planVersionId={planVersionId} plan={reviewPlan}/>}
   <Button disabled={busy} onClick={()=>void action('precheck')}>Contrôler cette sélection</Button>
   {dry?.precheck&&<div className="text-sm"><p>{dry.precheck.operations} convertible(s) · {dry.precheck.refused} refusée(s) · {dry.precheck.excludedRest} repos exclus</p>{dry.precheck.rows.filter(r=>r.status==='refused').map(r=><p key={r.sessionKey}>{r.title} : {reasonFr(r.reason)}</p>)}</div>}
   {dry?.precheck?.complete&&!dry.progress?.fullyValidated&&<Button disabled={busy||!!dry.progress?.unknown||!!dry.progress?.refused} onClick={()=>void action('run')}>Simuler le prochain lot sans envoi</Button>}
   {simulationConfirmed&&releaseReady===true&&<><label className="flex gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e=>{setConsent(e.target.checked);setReady(false);}}/>Je confirme l’envoi de cette sélection à cet athlète.</label><Button disabled={busy||!consent} onClick={()=>void action('send-check')}>Vérifier les conditions d’envoi</Button></>}
   {releaseReady===false&&<p className="text-sm text-destructive">La validation sportive signée de cette version du moteur n’est pas installée sur le serveur. Les sélections restent contrôlables, mais aucun envoi n’est autorisé.</p>}
   {dry?.progress&&<Button disabled={busy} variant="outline" onClick={()=>void action('verify')}>Vérifier dans Nolio sans renvoyer</Button>}
   {ready&&<Button disabled={busy||!consent} onClick={()=>void action('send')}>Envoyer le prochain lot vers Nolio</Button>}
   <p role="status" className="text-sm">{busy?'Contrôle en cours…':message}</p>
  </DialogContent></Dialog>
 </Context.Provider>;
}
