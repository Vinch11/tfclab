import {formatWorkoutReadbackDifferences,formatRawTargetEvidence} from '../../../supabase/functions/_shared/nolioV2/readbackDifferences';
import {runPlanDrySequence,parsePlanDryResp,reasonFr,stopFr,type PlanDryResp} from '@/qa/pilot-review/planDryRunView';
import type {NolioExportScope} from '../../../supabase/functions/_shared/nolioV2/exportScope';
export type CoachFlowPorts={
 planVersionId:string;planSha256:string;scope:NolioExportScope;
 current:()=>boolean;stopRequested:()=>boolean;
 invoke:(name:string,body:Record<string,unknown>)=>Promise<unknown>;
 confirmSimulation:(r:PlanDryResp)=>Promise<boolean>;
 verifyReceipts:(r:PlanDryResp)=>Promise<{verified:number;total:number;fullyVerified:boolean;nextIndex:number}>;
 progress:(message:string)=>void;onDry?:(r:PlanDryResp)=>void;
 /** Only exceptional destructive-provider history needs a contextual decision.
  * The ordinary one-click Export action performs all technical checks itself. */
 confirmRecreation?:(rows:RecreationDecision['rows'])=>Promise<boolean>;
 now?:()=>number;sleep?:(ms:number)=>Promise<void>;
};
export type RecreationDecision={planSha256:string;refsSha256:string;opsSha256:string;rows:Array<{opIndex:number;sessionKey:string;date:string;title:string;binding:string}>};
type RecreationMode={kind:'inspect'}|{kind:'apply';decision:RecreationDecision};
type CoachExportResult={verified:number;total:number;recreationDecision?:RecreationDecision;inspected?:number};
function checkpoint(p:CoachFlowPorts){if(!p.current()||p.stopRequested())throw Error('Action interrompue. Les activités déjà envoyées restent vérifiables ; aucune relance automatique.');}
class MissingNolioActivity extends Error {}
/** One deliberate export consent, then bounded automatic technical checks.
 * No invented review, prescription/scientific flag or re-POST of uncertainty. */
export async function runCoachExport(p:CoachFlowPorts,verifyOnly=false,calendarOnly=false,recreation?:RecreationMode):Promise<CoachExportResult>{
 const common={planVersionId:p.planVersionId,...(p.scope.kind==='all'?{}:{scope:p.scope})};
 async function call(name:string,body:Record<string,unknown>){checkpoint(p);const r=await p.invoke(name,body);checkpoint(p);return r as Record<string,unknown>;}
 p.progress('Vérification du plan et des correspondances Nolio…');
 let dry=parsePlanDryResp(await call('nolio-v2-plan-dry-run',{...common,action:'precheck'}));
 if(!dry?.precheck?.complete)throw Error(dry?.precheck?.rows.filter(r=>r.status==='refused').map(r=>`${r.title} : ${reasonFr(r.reason)}`).join('\n')||reasonFr(dry?.code??null)||'Le plan ne peut pas être exporté avec les correspondances actuelles.');
 if(dry.planSha256!==p.planSha256||!dry.refsSha256||!dry.opsSha256)throw Error('Version du plan divergente : export annulé.');
 const frozen={planSha256:dry.planSha256,refsSha256:dry.refsSha256,opsSha256:dry.opsSha256};
 const same=(value:unknown)=>{const r=value as {planSha256?:string;refsSha256?:string;opsSha256?:string}|null;return !!r&&r.planSha256===frozen.planSha256&&r.refsSha256===frozen.refsSha256&&r.opsSha256===frozen.opsSha256;};
 const total=dry.manifest?.length??0;if(!total)throw Error('Sélection vide.');
 if(recreation?.kind==='inspect'){
  const decision:RecreationDecision={planSha256:frozen.planSha256!,refsSha256:frozen.refsSha256!,opsSha256:frozen.opsSha256!,rows:[]};
  let from=0,attempted:number|undefined;const seen=new Set<number>();
  do{
   p.progress(`Contrôle des activités déjà envoyées : ${from} vérifiées…`);
   const r=await call('nolio-v2-send-plan',{...common,workflow:'coach',action:'repair_check',expected:frozen,fromIndex:from});
   if(r.status!=='RECREATION_CHECK'||!same(r.preview as typeof frozen)||r.fromIndex!==from||!Number.isSafeInteger(r.total)||Number(r.total)<0||Number(r.total)>total||!Array.isArray(r.rows)||r.rows.length>8||r.nextIndex!==from+r.rows.length||Number(r.nextIndex)>Number(r.total)||(!r.rows.length&&Number(r.total)!==0)||(attempted!==undefined&&attempted!==r.total))throw Error('Contrôle des activités manquantes incomplet. Aucune recréation.');
   attempted=Number(r.total);
   for(const row of r.rows){
    const entry=dry.manifest!.find(o=>o.opIndex===row.opIndex);
    if(!entry||seen.has(row.opIndex)||entry.sessionKey!==row.sessionKey||entry.date!==row.date)throw Error('Contrôle des activités manquantes divergent. Aucune recréation.');
    seen.add(row.opIndex);
    if(row.status==='blocked')throw Error(`${entry.sessionKey} · ${entry.date} : ${reasonFr(String(row.reason))}. Aucune recréation.`);
    if(row.status==='present'&&row.reason==='exact_unique')continue;
    if(row.status!=='deleted'||row.reason!=='known_resource_404_and_complete_day_absence'||typeof row.binding!=='string'||!/^[a-f0-9]{64}$/.test(row.binding))throw Error('Suppression non confirmée. Aucune recréation.');
    decision.rows.push({opIndex:entry.opIndex,sessionKey:entry.sessionKey,date:entry.date,title:dry.precheck!.rows.find(o=>o.opIndex===entry.opIndex)?.title??'Séance du plan',binding:row.binding});
   }
   from=Number(r.nextIndex);
  }while(from<attempted!);
  return {verified:0,total,inspected:attempted,recreationDecision:decision};
 }
 if(recreation?.kind==='apply'){
  const d=recreation.decision;
  if(!same(d)||!d.rows.length||d.rows.length>total||new Set(d.rows.map(r=>r.opIndex)).size!==d.rows.length||d.rows.some(r=>!dry!.manifest!.some(o=>o.opIndex===r.opIndex&&o.sessionKey===r.sessionKey&&o.date===r.date)||!/^[a-f0-9]{64}$/.test(r.binding)))throw Error('Décision de recréation périmée : contrôlez à nouveau les activités manquantes.');
 }
 // Read the entire selection before the first create. A regeneration changes
 // per-version operation keys, so prior-version conflicts need a separate check.
 if(!verifyOnly||calendarOnly){
  for(let from=0;from<total;){
   p.progress(`Vérification du calendrier Nolio : ${from}/${total} activités contrôlées.`);
   const r=await call('nolio-v2-send-plan',{...common,workflow:'coach',action:'conflicts',expected:frozen,fromIndex:from});
   if(r.status!=='CALENDAR_CHECK'||!same(r.preview as typeof frozen)||r.fromIndex!==from||r.total!==total||!Array.isArray(r.rows)||!r.rows.length||r.rows.length>8||r.nextIndex!==from+r.rows.length||Number(r.nextIndex)>total)throw Error('Rapprochement Nolio incomplet : '+reasonFr(String(r.reason??'calendar_read_failed'))+'. Aucun nouvel envoi.');
   for(let i=0;i<r.rows.length;i++){
    const row=r.rows[i],entry=dry.manifest![from+i];
    if(row.opIndex!==entry.opIndex||row.sessionKey!==entry.sessionKey||row.date!==entry.date)throw Error('Rapprochement Nolio divergent : aucun nouvel envoi.');
    if(row.status==='conflict'&&Number.isSafeInteger(row.count)&&row.count>0)throw Error(`${entry.sessionKey} · ${entry.date} : ${row.count} ancienne(s) activité(s) TFCLab présente(s) pour ce sport. Export bloqué pour éviter les doublons. Vérifiez ces séances dans Nolio ; aucune suppression ni modification automatique.`);
    if(row.status!=='clear'||row.count!==0||row.reason!=='calendar_clear')throw Error(`${entry.sessionKey} · ${entry.date} : lecture du calendrier non confirmée. Aucun nouvel envoi.`);
   }
   from=Number(r.nextIndex);
  }
  if(calendarOnly)return {verified:0,total};
 }
 const sequence=await runPlanDrySequence({runBatch:async()=>{const r=parsePlanDryResp(await call('nolio-v2-plan-dry-run',{...common,action:'run'}));if(!r||!same(r))throw Error('Plan ou correspondances modifiés : export arrêté.');return r;},isCurrent:p.current,stopRequested:p.stopRequested,now:p.now??Date.now,sleep:p.sleep??(ms=>new Promise(resolve=>setTimeout(resolve,ms))),onProgress:r=>{p.onDry?.(r);p.progress(`Vérification Nolio : ${r.progress?.valid??0}/${r.progress?.totalOps??0} séances.`);}});
 if(sequence.stop!=='complete'||!sequence.last)throw Error(stopFr(sequence.stop));
 dry=sequence.last;checkpoint(p);
 if(!await p.confirmSimulation(dry))throw Error('Vérification des reçus impossible : aucun envoi supplémentaire.');checkpoint(p);
 const expected={...frozen,jobId:dry.progress!.jobId};
 let verified=0,nextIndex=0;
 async function verifyThrough(target:number){
  let readRetries=0;
  for(let n=0;verified<target&&n<=total*3+2;n++){
   p.progress(`Vérification dans Nolio : ${verified}/${total} activités confirmées.`);
   const r=await call('nolio-v2-send-plan',{...common,workflow:'coach',action:'verify',expected,fromIndex:nextIndex});
   if(r.status==='NOTHING_SENT')throw Error('Aucune activité envoyée pour cette sélection.');
   if(r.status!=='VERIFY'||!same(r.preview as typeof frozen))throw Error('Résultat Nolio non confirmé. Vérifiez les activités avant de reprendre.');
   const read=await p.verifyReceipts(dry);checkpoint(p);
   const failed=Array.isArray(r.results)?r.results.find((x:{result?:string})=>x.result!=='verified_unique'):null;
   if(read.total===total&&read.verified>=verified&&failed?.result==='unknown'&&failed.retryableRead===true&&readRetries<2){
    // Retry only a bounded read. Keep the exact frozen binding and resume at
    // the first unverified operation; never return to send on uncertainty.
    verified=read.verified;nextIndex=read.nextIndex;readRetries++;
    p.progress(`Nolio répond lentement. Nouvelle vérification des activités déjà envoyées (${verified}/${total})…`);
    await (p.sleep??(ms=>new Promise(resolve=>setTimeout(resolve,ms))))(readRetries*1500);checkpoint(p);continue;
   }
   if(read.total!==total||read.verified<=verified||failed){
    const entry=dry.manifest?.find(x=>x.opIndex===failed?.opIndex);
    const d=failed?.diagnostic;
    const sport=dry.precheck?.rows.find(x=>x.opIndex===failed?.opIndex)?.sport;
    const targetDetail=formatRawTargetEvidence(d?.targets,sport);
    const readFailure=failed?.result==='unknown'?({rate_limited:'Nolio limite les requêtes. La vérification pourra reprendre sans renvoyer les séances.',authorization:'Nolio refuse la lecture des séances. Vérifiez la connexion Nolio.',deadline:'Le délai de lecture Nolio est dépassé.',network_unavailable:'La lecture Nolio est momentanément indisponible.',provider_error:'Nolio rencontre une erreur pendant la lecture.'} as Record<string,string>)[failed.readFailure]:null;
    const detail=failed?.result==='not_sent'?'Cette séance n’a pas encore été envoyée. Utilisez « Exporter vers Nolio » pour poursuivre le plan.':failed?.result==='absent'?'Séance absente de Nolio (supprimée ou déplacée).':failed?.result==='ambiguous'&&d&&Number.isSafeInteger(d.candidates)&&Number.isSafeInteger(d.exact)?`${d.candidates} correspondance(s), ${d.exact} identique(s). Champs différents : ${Array.isArray(d.fields)?d.fields.filter((x:unknown)=>typeof x==='string'&&/^[a-z_]{1,30}$/.test(x)).join(', '):'non précisés'}.`:readFailure||'Présence exacte dans Nolio non confirmée.';
    const message=`${entry?entry.sessionKey+' · '+entry.date+' : ':''}${detail}${targetDetail?' Cibles : '+targetDetail+'.':''}${formatWorkoutReadbackDifferences(d?.workout)?' Détail : '+formatWorkoutReadbackDifferences(d.workout)+'.':''} Export arrêté ; les activités déjà envoyées sont conservées.`;
    throw failed?.result==='absent'?new MissingNolioActivity(message):Error(message);
   }
   verified=read.verified;nextIndex=read.nextIndex;
   readRetries=0;
  }
  if(verified<target)throw Error('Vérification incomplète.');
 }
 if(verifyOnly){await verifyThrough(total);return {verified,total};}
 const check=await call('nolio-v2-send-plan',{...common,workflow:'coach',action:'precheck',expected,consent:true});
 if(check.status!=='READY'||!Array.isArray(check.gate)||check.gate.length||!same(check.preview as typeof frozen))throw Error('Export bloqué : '+String((check.gate as string[]|undefined)?.map(reasonFr).join(', ')||check.reason||'contrôle serveur incomplet'));
 const prior=check.existingThroughIndex;
 if(!Number.isSafeInteger(prior)||Number(prior)<0||Number(prior)>total)throw Error('État des envois précédents inconnu : export arrêté.');
 if(recreation?.kind==='apply')for(const row of recreation.decision.rows){
  p.progress(`Recréation de l’activité supprimée : ${row.title} · ${row.date}…`);
  const r=await call('nolio-v2-send-plan',{...common,workflow:'coach',action:'repair',expected,consent:true,repair:{opIndex:row.opIndex,binding:row.binding}});
  const results=r.results as Array<{sessionKey:string;state:string}>|undefined;
  if(r.status!=='DONE'||!same(r.preview as typeof frozen)||r.opIndex!==row.opIndex||!Array.isArray(results)||results.length!==1||results[0].sessionKey!==row.sessionKey||results[0].state!=='confirmed')throw Error('Recréation arrêtée : '+reasonFr(String(r.reason??'recreation_unconfirmed'))+'. Vérifiez dans Nolio ; aucune relance automatique.');
 }
 if(Number(prior)>0){
  try{await verifyThrough(Number(prior));}
  catch(error){
   if(!(error instanceof MissingNolioActivity)||!p.confirmRecreation||recreation?.kind==='apply')throw error;
   p.progress('Vérification des activités manquantes dans Nolio…');
   const inspection=await runCoachExport(p,false,false,{kind:'inspect'}),decision=inspection.recreationDecision;checkpoint(p);
   if(!decision?.rows.length)throw Error('Le calendrier Nolio a changé. Relancez l’export pour reprendre sa vérification.');
   if(!await p.confirmRecreation(decision.rows)){checkpoint(p);throw Error('Export annulé. Aucune activité supprimée n’a été recréée.');}
   checkpoint(p);
   return runCoachExport(p,false,false,{kind:'apply',decision});
  }
 }
 if(verified===total)return {verified,total};
 for(let batch=0;batch<=total;batch++){
  p.progress(`Export vers Nolio : ${verified}/${total} activités confirmées.`);
  const r=await call('nolio-v2-send-plan',{...common,workflow:'coach',action:'send',expected,consent:true});
  if(!same(r.preview as typeof frozen))throw Error('Réponse d’envoi divergente. Vérifiez dans Nolio avant de reprendre.');
  if(r.status!=='DONE'&&r.status!=='STOPPED_BATCH_LIMIT')throw Error('Export interrompu : '+reasonFr(String(r.reason??r.status))+'. Aucune relance automatique. Utilisez « Vérifier dans Nolio ».');
  const results=r.results as Array<{state:string}>|undefined;
  if(!Array.isArray(results)||!results.length||results.some(x=>!['confirmed','skipped_confirmed'].includes(x.state)))throw Error('Accusé d’envoi incomplet : vérifiez dans Nolio.');
  const posted=results.length;
  if(posted>total||posted<=verified)throw Error('Aucun progrès d’envoi confirmé : export arrêté.');
  await verifyThrough(posted);
  if(r.status==='DONE'){
   if(verified!==total)throw Error('Export partiel : vérification complète encore nécessaire.');
   return {verified,total};
  }
 }
 throw Error('Export interrompu : limite technique atteinte.');
}
