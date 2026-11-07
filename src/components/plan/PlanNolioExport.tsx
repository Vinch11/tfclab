import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {supabase} from '@/integrations/supabase/client';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {CHECKED_IN_PLAN_RELEASE_INFO} from '../../../supabase/functions/_shared/planReleaseManifest';
import {sameExportCapabilities} from '../../../supabase/functions/_shared/nolioV2/exportCapabilities';
import {canonical,sha256Hex} from '../../../supabase/functions/_shared/nolioV2/dryRun';
import {sessionsFromPlanJson} from '../../../supabase/functions/_shared/nolioV2/planSessions';
import {requiredExerciseLabels,raceIdentityOf} from '../../../supabase/functions/_shared/nolioV2/plannedMapper';
import type {NolioExportScope} from '../../../supabase/functions/_shared/nolioV2/exportScope';
import {confirmFullPlanDryRun,PLAN_DRY_JOB_COLS,PLAN_DRY_RECEIPT_COLS,type PlanDryResp} from '@/qa/pilot-review/planDryRunView';
import {NolioV2ProgressPanel,type V2StatusView} from '@/qa/pilot-review/NolioV2ProgressPanel';
import {runCoachExport} from '@/lib/nolio/coachExportFlow';
import {hasRetiredRecoveryGuidance} from '@/lib/nolio/guidedRecoveryVersion';
import {blocksLegacyNolioExport} from '@/lib/nolio/legacyExportGuard';
import {exportLegacyPlan,type LegacyExportContext} from '@/lib/nolio/legacyPlanExport';
import {planExportSummary,coachCalendarDate} from '@/lib/nolio/planExportSummary';
import {currentExportVerification} from '@/lib/nolio/exportVerification';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
const Context=createContext<((scope:NolioExportScope)=>void)|null>(null);
async function bounded<T>(p:PromiseLike<T>):Promise<T>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([Promise.resolve(p),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('Délai dépassé : résultat inconnu. Vérifiez dans Nolio avant de reprendre.')),40000);})]);}finally{clearTimeout(timer);}
}
export function NolioV2ScopeButton({scope,label}:{scope:NolioExportScope;label:string}){
 const open=useContext(Context);return open?<Button type="button" size="sm" variant="outline" onClick={e=>{e.stopPropagation();open(scope);}}>{label}</Button>:null;
}
function samePrescription(a:unknown,b:unknown){
 const normalize=(p:unknown)=>{const c=JSON.parse(JSON.stringify(p));if(c?._provenance)delete c._provenance.generatedAt;delete c._markdown;return canonical(c);};return normalize(a)===normalize(b);
}
/** Same coach action as IA: save if needed, validate, send and verify.
 * No QA checklist, release installation, fabricated review or scientific flag. */
export function PlanNolioExportProvider({plan,athleteId,athleteName,planVersionId,ensureSaved,enabled,legacy,children}:{plan:ParsedPlan;athleteId?:string;athleteName?:string;planVersionId?:string|null;ensureSaved?:()=>Promise<string|null>;enabled:boolean;legacy?:LegacyExportContext;children:ReactNode}){
 const structured=blocksLegacyNolioExport(plan);
 const [scope,setScope]=useState<NolioExportScope|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[refsView,setRefsView]=useState<V2StatusView|null>(null);
 const epoch=useRef(0),lock=useRef(false),stop=useRef(false),savedId=useRef(planVersionId),incomingId=useRef(planVersionId);
 incomingId.current=planVersionId;
 useEffect(()=>{const token=++epoch.current;stop.current=true;setScope(null);setMessage('');setRefsView(null);savedId.current=incomingId.current;return()=>{epoch.current=token+1;stop.current=true;};},[plan,athleteId,legacy?.nolioId,legacy?.startDate,legacy?.refs]);
 useEffect(()=>{if(!lock.current)savedId.current=planVersionId;},[planVersionId]);
 useEffect(()=>{const s=supabase.auth.onAuthStateChange?.(event=>{if(event==='TOKEN_REFRESHED'||event==='INITIAL_SESSION')return;epoch.current++;stop.current=true;setMessage('Session modifiée : action arrêtée.');});return()=>s?.data.subscription.unsubscribe();},[]);
 const open=(s:NolioExportScope)=>{if(lock.current)return;epoch.current++;stop.current=false;setScope(s);setMessage('');setRefsView(null);};
 async function owned(id:string,uid:string){return bounded(supabase.from('plan_versions').select('id,athlete_id,coach_id,plan_json').eq('id',id).eq('coach_id',uid).eq('athlete_id',athleteId).maybeSingle());}
 async function run(verifyOnly=false){
  if(lock.current||!scope)return;lock.current=true;setBusy(true);stop.current=false;const token=epoch.current;
  const current=()=>token===epoch.current;
  const guard=()=>{if(!current()||stop.current)throw Error('Action arrêtée. Les activités déjà envoyées restent vérifiables.');};
  try{
   if(!athleteId)throw Error('Sélectionnez un athlète.');
   const u=await bounded(supabase.auth.getUser());const uid=u.data.user?.id;if(u.error||!uid)throw Error('Reconnectez-vous.');guard();
   let id=savedId.current;
   let row=id?await owned(id,uid):null;guard();
   if(!row||row.error||!row.data||!samePrescription(row.data.plan_json,plan)){
    if(verifyOnly)throw Error('Ouvrez la version sauvegardée de ce plan pour vérifier Nolio sans nouvel envoi.');
    if(!ensureSaved)throw Error('Enregistrez ce plan avant l’export.');
    setMessage('Enregistrement du plan…');id=await ensureSaved();guard();
    if(!id)throw Error('Sauvegarde non confirmée : aucun envoi.');row=await owned(id,uid);guard();
   }
   if(row.error||!row.data||row.data.id!==id||row.data.coach_id!==uid||row.data.athlete_id!==athleteId||!samePrescription(row.data.plan_json,plan))throw Error('Version sauvegardée différente : export annulé.');
   savedId.current=id;
   if(structured&&!verifyOnly&&hasRetiredRecoveryGuidance(row.data.plan_json))throw Error('Ce plan sauvegardé utilise les anciens plafonds de récupération. Régénérez-le avec les plages guidées. Les séances déjà présentes dans Nolio doivent être rapprochées avant tout nouvel export aux mêmes dates ; elles ne seront pas remplacées automatiquement.');
   const snapshot=row.data.plan_json,hash=await sha256Hex(canonical(snapshot));guard();
   async function invoke(name:string,body:Record<string,unknown>){
    guard();const auth=await bounded(supabase.auth.getUser());guard();if(auth.error||auth.data.user?.id!==uid)throw Error('Identité modifiée : action annulée.');
    const r=await bounded(supabase.functions.invoke(name,{body}));guard();if(r.error)throw Error('Service Nolio indisponible ou réponse inconnue. Aucun lot incertain n’est renvoyé.');return r.data;
   }
   if(!structured){
    if(verifyOnly)throw Error('La relecture indépendante nécessite une connexion Nolio V2.');
    if(!legacy)throw Error('Connexion Nolio du plan à vérifier.');
    const result=await exportLegacyPlan({plan:snapshot as unknown as ParsedPlan,scope,athleteId,context:legacy,invoke,progress:m=>{if(current())setMessage(m);},current:()=>current()&&!stop.current});guard();
    setMessage(`${result.accepted}/${result.total} séances acceptées par Nolio. Export terminé.`);return;
   }
   if(plan.weeks.some(w=>w.sessions.some(s=>s.sport==='brick'&&s.title.startsWith('COURSE :')))){
    setMessage('Vérification des sports Nolio de l’athlète…');
    const refs=await invoke('nolio-v2-oauth',{action:'load_refs',athleteId});if(refs.status!=='REFS_LOADED')throw Error('Lecture des sports Nolio impossible. Vérifiez la connexion avant de reprendre.');
   }
   const caps=await Promise.all(['nolio-v2-plan-dry-run','nolio-v2-send-plan'].map(async name=>{const r=await invoke(name,{planVersionId:id,action:'capabilities'});if(!sameExportCapabilities(r,name,CHECKED_IN_PLAN_RELEASE_INFO.releaseId)||r.coachWorkflow!==true)throw Error('Le serveur Nolio doit être synchronisé avec cette version de l’application.');return r;}));guard();if(caps.length!==2)throw Error('Contrôle du serveur incomplet.');
   const confirmSimulation=async(r:PlanDryResp)=>{
    const [job,receipts]=await Promise.all([bounded(supabase.from('qa_nolio_v2_plan_dry_run_jobs').select(PLAN_DRY_JOB_COLS).eq('id',r.progress!.jobId).eq('coach_id',uid).eq('plan_version_id',id).maybeSingle()),bounded(supabase.from('qa_nolio_v2_plan_dry_run_receipts').select(PLAN_DRY_RECEIPT_COLS).eq('job_id',r.progress!.jobId).eq('coach_id',uid))]);guard();
    return !job.error&&!receipts.error&&(await confirmFullPlanDryRun({planVersionId:id!,coachId:uid,resp:r,job:job.data,receipts:receipts.data,localPlanSha256:hash})).confirmed;
   };
   const verifyReceipts=async(r:PlanDryResp)=>{const receipts=await bounded(supabase.from('qa_nolio_v2_plan_verify_receipts').select('*').eq('coach_id',uid).eq('plan_version_id',id).eq('plan_sha256',r.planSha256).eq('refs_sha256',r.refsSha256).eq('ops_sha256',r.opsSha256).order('created_at',{ascending:false}).limit(1000));guard();if(receipts.error)throw Error('Relecture Nolio indisponible : résultat non confirmé.');return currentExportVerification({coachId:uid,planVersionId:id!,resp:r,receipts:receipts.data});};
   const result=await runCoachExport({planVersionId:id!,planSha256:hash,scope,current,stopRequested:()=>stop.current,invoke,confirmSimulation,verifyReceipts,progress:m=>{if(current())setMessage(m);}},verifyOnly);guard();
   setMessage(`${result.verified}/${result.total} activités confirmées dans Nolio. Export terminé.`);
  }catch(e){if(current())setMessage((e as Error).message);}finally{lock.current=false;setBusy(false);}
 }
 async function readZones(){
  const id=savedId.current??planVersionId;if(lock.current||!id||!athleteId)return;
  lock.current=true;setBusy(true);const token=epoch.current;
  try{
   setMessage('Lecture des zones de travail Nolio de cet athlète…');
   const u=await bounded(supabase.auth.getUser());if(u.error||!u.data.user)throw Error('Reconnectez-vous.');
   const row=await owned(id,u.data.user.id);if(token!==epoch.current)return;
   if(row.error||!row.data||row.data.id!==id||row.data.coach_id!==u.data.user.id||row.data.athlete_id!==athleteId||!samePrescription(row.data.plan_json,plan))throw Error('Version sauvegardée différente : lecture annulée.');
   const r=await bounded(supabase.functions.invoke('nolio-v2-send-plan',{body:{workflow:'coach',action:'zones',planVersionId:id}}));if(token!==epoch.current)return;
   if(r.error||r.data?.status!=='ZONES_READ'||typeof r.data.summary!=='string'||r.data.summary.length>16000)throw Error(r.data?.reason==='zones_settings_read_scope_missing'?'La connexion Nolio n’autorise pas encore la lecture des zones (settings:read). Aucune séance modifiée.':'Lecture des zones indisponible : '+String(r.data?.reason??'service indisponible'));
   setMessage(r.data.summary);
  }catch(e){if(token===epoch.current)setMessage((e as Error).message);}finally{lock.current=false;setBusy(false);}
 }
 async function refsAction(body:Record<string,unknown>){
  if(lock.current||!athleteId||!['status','load_refs','update_refs'].includes(String(body.action)))return;lock.current=true;setBusy(true);const token=epoch.current;
  try{const u=await bounded(supabase.auth.getUser());if(u.error||!u.data.user)throw Error('Reconnectez-vous.');const r=await bounded(supabase.functions.invoke('nolio-v2-oauth',{body:{...body,athleteId}}));if(token!==epoch.current)return;if(r.error||!r.data||r.data.status==='BLOCKED')throw Error('Connexion Nolio à vérifier : '+String(r.data?.reason??'service indisponible'));setRefsView(r.data);setMessage('Correspondances Nolio relues.');}catch(e){if(token===epoch.current)setMessage((e as Error).message);}finally{lock.current=false;setBusy(false);}
 }
 const extracted=sessionsFromPlanJson(plan).sessions;
 const summary=scope?planExportSummary(plan,scope,structured?undefined:legacy?.startDate):null;
 const sports=[...new Set(extracted.filter(s=>!s.isRest).flatMap(s=>s.sport==='brick'&&(s.detStructuredWorkout||s.detStructuredComponents)?['bike','run']:[s.sport]))];
 const races=extracted.map(raceIdentityOf).filter((r):r is NonNullable<typeof r>=>!!r);
 const title=scope?.kind==='all'?'le plan entier':scope?.kind==='weeks'?scope.from===scope.to?`la semaine ${scope.from}`:`les semaines ${scope.from} à ${scope.to}`:`${scope?.keys.length??0} séance(s)`;
 return <Context.Provider value={enabled?open:null}>{children}<Dialog open={!!scope} onOpenChange={v=>{if(!v){stop.current=true;epoch.current++;setScope(null);}}}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Exporter vers Nolio</DialogTitle><DialogDescription>{title}{athleteName?` · ${athleteName}`:''}. Les prescriptions et les dates du plan sont conservées.</DialogDescription></DialogHeader>
  {scope&&<div className="space-y-2 text-sm"><label>Contenu à exporter <select aria-label="Contenu à exporter" value={scope.kind} disabled={busy} onChange={e=>open(e.target.value==='all'?{kind:'all'}:e.target.value==='weeks'?{kind:'weeks',from:1,to:1}:{kind:'sessions',keys:[]})} className="border rounded p-1"><option value="all">Plan entier</option><option value="weeks">Une semaine ou une plage</option><option value="sessions">Séances sélectionnées</option></select></label>
  {scope.kind==='weeks'&&<div className="flex gap-2"><label>De S<input aria-label="Première semaine Nolio" type="number" min={1} max={104} value={scope.from} disabled={busy} className="w-16 border rounded" onChange={e=>open({...scope,from:Number(e.target.value)})}/></label><label>à S<input aria-label="Dernière semaine Nolio" type="number" min={scope.from} max={104} value={scope.to} disabled={busy} className="w-16 border rounded" onChange={e=>open({...scope,to:Number(e.target.value)})}/></label></div>}
  {scope.kind==='sessions'&&<div className="max-h-48 overflow-auto">{plan.weeks.flatMap(w=>w.sessions.map((s,i)=>({s,key:`S${s.weekNumber}-J${s.dayIndex}-${i}`}))).filter(({s})=>!s.isRest).map(({s,key})=><label key={key} className="flex gap-2"><input type="checkbox" disabled={busy} checked={scope.keys.includes(key)} onChange={e=>open({kind:'sessions',keys:e.target.checked?[...scope.keys,key]:scope.keys.filter(k=>k!==key)})}/><span>S{s.weekNumber} · {s.dayName} · {s.title}</span></label>)}</div>}</div>}
  {summary&&summary.count>0&&!summary.problems.length&&<div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-sm" aria-label="Résumé de l’export"><p className="font-medium">{summary.count} séance{summary.count>1?'s':''} · {summary.weeks} semaine{summary.weeks>1?'s':''}</p><p>{summary.firstDate===summary.lastDate?coachCalendarDate(summary.firstDate!):`Du ${coachCalendarDate(summary.firstDate!)} au ${coachCalendarDate(summary.lastDate!)}`}</p><p className="text-muted-foreground">Les jours de repos sont exclus. Les séances conservent leurs dates et leur contenu.</p></div>}
  <Button disabled={busy||!athleteId||(scope?.kind==='sessions'&&!scope.keys.length)} onClick={()=>void run(false)}>Exporter vers Nolio</Button>
  {busy&&<Button variant="outline" onClick={()=>{stop.current=true;setMessage('Arrêt demandé ; vérification du lot en cours…');}}>Arrêter après l’opération en cours</Button>}
  {structured&&!busy&&<Button disabled={!savedId.current&&!planVersionId} variant="outline" onClick={()=>void run(true)}>Vérifier dans Nolio sans renvoyer</Button>}
  {structured&&<Button disabled={busy||(!savedId.current&&!planVersionId)} variant="outline" onClick={()=>void readZones()}>Lire les zones de travail Nolio</Button>}
  <p role="status" className="text-sm whitespace-pre-wrap">{message}</p>
  {structured&&<details><summary>Correspondances Nolio</summary><Button variant="outline" disabled={busy} onClick={()=>void refsAction({action:'status'})}>Vérifier la connexion et les correspondances</Button>{refsView&&<NolioV2ProgressPanel status={refsView} busy={busy} ready={!!athleteId} identityKey={`${athleteId}|${savedId.current}`} planSports={sports} exerciseLabels={requiredExerciseLabels(extracted,{timedCoachStrength:true})} raceSource={races.length===1?races[0]:null} act={refsAction} simulation="NONE"/>}</details>}
 </DialogContent></Dialog></Context.Provider>;
}

/** Compatibility names for isolated QA callers. Normal viewer uses the common provider. */
export const NolioV2ExportProvider=PlanNolioExportProvider;
export const PlanNolioScopeButton=NolioV2ScopeButton;
