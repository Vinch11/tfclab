import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {supabase} from '@/integrations/supabase/client';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {canonical,sha256Hex} from '../../../supabase/functions/_shared/nolioV2/dryRun';
import type {NolioExportScope} from '../../../supabase/functions/_shared/nolioV2/exportScope';
import {parsePlanDryResp,reasonFr,type PlanDryResp} from '@/qa/pilot-review/planDryRunView';
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
 coach_review_absent_or_stale:'La revue du coach est absente ou ne correspond plus à cette version.',
 human_plan_attestation_absent:'La revue du plan doit être enregistrée.',
 dry_run_job_absent:'La simulation de cette sélection reste à effectuer.',
 coach_consent_for_this_plan_absent:'Confirmez explicitement cette sélection avant l’envoi.',
 precheck_incomplete:'Certaines séances de cette sélection ne sont pas encore convertibles.',
};
/** Common viewer actions, backed only by the owned saved version and V2.
 * No legacy catalogue replacement, no implicit send or fabricated review. */
export function NolioV2ExportProvider({plan,athleteId,planVersionId,enabled,children}:{plan:ParsedPlan;athleteId?:string;planVersionId?:string|null;enabled:boolean;children:ReactNode}){
 const [scope,setScope]=useState<NolioExportScope|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[dry,setDry]=useState<PlanDryResp|null>(null),[consent,setConsent]=useState(false),[ready,setReady]=useState(false);
 const epoch=useRef(0),lock=useRef(false);
 useEffect(()=>{epoch.current++;setScope(null);setDry(null);setConsent(false);setReady(false);setMessage('');return()=>{epoch.current++;};},[plan,athleteId,planVersionId]);
 const open=(s:NolioExportScope)=>{epoch.current++;setScope(s);setDry(null);setConsent(false);setReady(false);setMessage('');};
 async function action(kind:'precheck'|'run'|'send-check'|'send'){
  if(lock.current||!scope)return;
  lock.current=true;setBusy(true);const token=epoch.current;
  const current=()=>token===epoch.current;
  try{
   if(!athleteId||!planVersionId)throw Error('Enregistrez ce plan dans l’historique, puis ouvrez la version sauvegardée pour l’exporter.');
   const user=await bounded(supabase.auth.getUser());const uid=user.data.user?.id;if(user.error||!uid)throw Error('Session expirée : reconnectez-vous.');
   const row=await bounded(supabase.from('plan_versions').select('id,athlete_id,coach_id,plan_json').eq('id',planVersionId).eq('athlete_id',athleteId).eq('coach_id',uid).maybeSingle());
   if(!current())return;
   if(row.error||!row.data||row.data.id!==planVersionId||row.data.athlete_id!==athleteId||row.data.coach_id!==uid||!samePrescription(row.data.plan_json,plan))throw Error('Le plan affiché diffère de la version sauvegardée : enregistrez les modifications avant l’export.');
   const second=await bounded(supabase.auth.getUser());if(second.error||second.data.user?.id!==uid||!current())throw Error('Session modifiée : action annulée.');
   const planHash=await sha256Hex(canonical(row.data.plan_json));if(!current())return;
   const common={planVersionId,...(scope.kind==='all'?{}:{scope})};
   if(kind==='precheck'||kind==='run'){
    const result=await bounded(supabase.functions.invoke('nolio-v2-plan-dry-run',{body:{...common,action:kind}}));
    if(!current())return;
    if(result.error)throw Error('Le contrôle Nolio a échoué. Le service doit prendre en charge cette sélection (plan, semaine ou séance). Aucun envoi effectué.');
    const parsed=parsePlanDryResp(result.data);if(!parsed)throw Error('Réponse Nolio non vérifiable.');
    if(parsed.planSha256&&parsed.planSha256!==planHash)throw Error('Version Nolio divergente : rien n’est envoyé.');
    setDry(parsed);setReady(false);
    setMessage(parsed.precheck?.complete?`Sélection contrôlée : ${parsed.precheck.operations} opération(s). ${parsed.progress?.fullyValidated?'Simulation validée côté serveur.':parsed.progress?`${parsed.progress.valid}/${parsed.progress.totalOps} simulées ; reprendre uniquement si aucun résultat incertain.`:'Simulation à effectuer avant l’envoi.'}`:reasonFr(parsed.code)||parsed.code);
   }else{
    if(!consent||!dry?.progress?.fullyValidated||!dry.planSha256||!dry.refsSha256||!dry.opsSha256||dry.planSha256!==planHash)throw Error('Simulation concordante et confirmation de cette sélection nécessaires.');
    const expected={planSha256:dry.planSha256,refsSha256:dry.refsSha256,opsSha256:dry.opsSha256,jobId:dry.progress.jobId};
    const result=await bounded(supabase.functions.invoke('nolio-v2-send-plan',{body:{...common,action:kind==='send'?'send':'precheck',expected,consent:true}}));
    if(!current())return;
    if(result.error)throw Error('Résultat d’envoi inconnu : vérifiez Nolio avant toute nouvelle tentative.');
    const d=result.data as {status?:string;gate?:string[];preview?:{planSha256?:string;refsSha256?:string;opsSha256?:string};reason?:string};
    if(d.preview?.planSha256!==expected.planSha256||d.preview?.refsSha256!==expected.refsSha256||d.preview?.opsSha256!==expected.opsSha256)throw Error('Réponse d’envoi divergente : résultat non confirmé.');
    setReady(kind==='send-check'&&d.status==='READY'&&Array.isArray(d.gate)&&!d.gate.length);
    setMessage(d.gate?.length?d.gate.map(c=>explanations[c]??c).join(' '):kind==='send-check'?'Conditions d’envoi vérifiées pour cette sélection.':'Lot traité ; vérifier les activités dans Nolio avant de poursuivre. Aucun succès global présumé.');
   }
  }catch(e){if(current()){setMessage((e as Error).message);setReady(false);}}finally{lock.current=false;setBusy(false);}
 }
 const title=scope?.kind==='all'?'le plan entier':scope?.kind==='weeks'?scope.from===scope.to?`la semaine ${scope.from}`:`les semaines ${scope.from} à ${scope.to}`:`${scope?.keys.length??0} séance(s)`;
 return <Context.Provider value={enabled?open:null}>{children}
  <Dialog open={!!scope} onOpenChange={v=>{if(!v){epoch.current++;setScope(null);setReady(false);}}}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Exporter vers Nolio</DialogTitle><DialogDescription>Exporter {title}, avec les dates et prescriptions sauvegardées. Le contrôle ne crée aucune activité.</DialogDescription></DialogHeader>
   {scope&&<div className="space-y-2 text-sm">
    <label>Contenu à exporter <select aria-label="Contenu à exporter" value={scope.kind} disabled={busy} onChange={e=>open(e.target.value==='all'?{kind:'all'}:e.target.value==='weeks'?{kind:'weeks',from:1,to:1}:{kind:'sessions',keys:[]})} className="border rounded p-1"><option value="all">Plan entier</option><option value="weeks">Une semaine ou une plage</option><option value="sessions">Séances sélectionnées</option></select></label>
    {scope.kind==='weeks'&&<div className="flex gap-2"><label>De S<input aria-label="Première semaine Nolio" type="number" min={1} max={104} value={scope.from} disabled={busy} className="w-16 border rounded" onChange={e=>open({...scope,from:Number(e.target.value)})}/></label><label>à S<input aria-label="Dernière semaine Nolio" type="number" min={scope.from} max={104} value={scope.to} disabled={busy} className="w-16 border rounded" onChange={e=>open({...scope,to:Number(e.target.value)})}/></label></div>}
    {scope.kind==='sessions'&&<div className="max-h-48 overflow-auto space-y-1">{plan.weeks.flatMap(w=>w.sessions.map((s,i)=>({s,key:`S${s.weekNumber}-J${s.dayIndex}-${i}`}))).filter(({s})=>!s.isRest).map(({s,key})=><label className="flex gap-2" key={key}><input type="checkbox" disabled={busy} checked={scope.keys.includes(key)} onChange={e=>open({kind:'sessions',keys:e.target.checked?[...scope.keys,key]:scope.keys.filter(k=>k!==key)})}/><span>S{s.weekNumber} · {s.dayName} · {s.title}</span></label>)}</div>}
   </div>}
   <Button disabled={busy} onClick={()=>void action('precheck')}>Contrôler cette sélection</Button>
   {dry?.precheck&&<div className="text-sm"><p>{dry.precheck.operations} convertible(s) · {dry.precheck.refused} refusée(s) · {dry.precheck.excludedRest} repos exclus</p>{dry.precheck.rows.filter(r=>r.status==='refused').map(r=><p key={r.sessionKey}>{r.title} : {reasonFr(r.reason)}</p>)}</div>}
   {dry?.precheck?.complete&&!dry.progress?.fullyValidated&&<Button disabled={busy||!!dry.progress?.unknown||!!dry.progress?.refused} onClick={()=>void action('run')}>Simuler le prochain lot sans envoi</Button>}
   {dry?.progress?.fullyValidated&&<><label className="flex gap-2 text-sm"><input type="checkbox" checked={consent} onChange={e=>{setConsent(e.target.checked);setReady(false);}}/>Je confirme l’envoi de cette sélection à cet athlète.</label><Button disabled={busy||!consent} onClick={()=>void action('send-check')}>Vérifier les conditions d’envoi</Button></>}
   {ready&&<Button disabled={busy||!consent} onClick={()=>void action('send')}>Envoyer le prochain lot vers Nolio</Button>}
   <p role="status" className="text-sm">{busy?'Contrôle en cours…':message}</p>
  </DialogContent></Dialog>
 </Context.Provider>;
}
