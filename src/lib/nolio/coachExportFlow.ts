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
 now?:()=>number;sleep?:(ms:number)=>Promise<void>;
};
function checkpoint(p:CoachFlowPorts){if(!p.current()||p.stopRequested())throw Error('Action interrompue. Les activités déjà envoyées restent vérifiables ; aucune relance automatique.');}
/** One deliberate export consent, then bounded automatic technical checks.
 * No invented review, prescription/scientific flag or re-POST of uncertainty. */
export async function runCoachExport(p:CoachFlowPorts,verifyOnly=false){
 const common={planVersionId:p.planVersionId,...(p.scope.kind==='all'?{}:{scope:p.scope})};
 async function call(name:string,body:Record<string,unknown>){checkpoint(p);const r=await p.invoke(name,body);checkpoint(p);return r as Record<string,unknown>;}
 p.progress('Vérification du plan et des correspondances Nolio…');
 let dry=parsePlanDryResp(await call('nolio-v2-plan-dry-run',{...common,action:'precheck'}));
 if(!dry?.precheck?.complete)throw Error(dry?.precheck?.rows.filter(r=>r.status==='refused').map(r=>`${r.title} : ${reasonFr(r.reason)}`).join('\n')||reasonFr(dry?.code??null)||'Le plan ne peut pas être exporté avec les correspondances actuelles.');
 if(dry.planSha256!==p.planSha256||!dry.refsSha256||!dry.opsSha256)throw Error('Version du plan divergente : export annulé.');
 const frozen={planSha256:dry.planSha256,refsSha256:dry.refsSha256,opsSha256:dry.opsSha256};
 const same=(value:unknown)=>{const r=value as {planSha256?:string;refsSha256?:string;opsSha256?:string}|null;return !!r&&r.planSha256===frozen.planSha256&&r.refsSha256===frozen.refsSha256&&r.opsSha256===frozen.opsSha256;};
 const sequence=await runPlanDrySequence({runBatch:async()=>{const r=parsePlanDryResp(await call('nolio-v2-plan-dry-run',{...common,action:'run'}));if(!r||!same(r))throw Error('Plan ou correspondances modifiés : export arrêté.');return r;},isCurrent:p.current,stopRequested:p.stopRequested,now:p.now??Date.now,sleep:p.sleep??(ms=>new Promise(resolve=>setTimeout(resolve,ms))),onProgress:r=>{p.onDry?.(r);p.progress(`Vérification Nolio : ${r.progress?.valid??0}/${r.progress?.totalOps??0} séances.`);}});
 if(sequence.stop!=='complete'||!sequence.last)throw Error(stopFr(sequence.stop));
 dry=sequence.last;checkpoint(p);
 if(!await p.confirmSimulation(dry))throw Error('Vérification des reçus impossible : aucun envoi supplémentaire.');checkpoint(p);
 const expected={...frozen,jobId:dry.progress!.jobId};
 const total=dry.manifest?.length??0;if(!total)throw Error('Sélection vide.');
 let verified=0,nextIndex=0;
 async function verifyThrough(target:number){
  for(let n=0;verified<target&&n<=total;n++){
   p.progress(`Vérification dans Nolio : ${verified}/${total} activités confirmées.`);
   const r=await call('nolio-v2-send-plan',{...common,workflow:'coach',action:'verify',expected,fromIndex:nextIndex});
   if(r.status==='NOTHING_SENT')throw Error('Aucune activité envoyée pour cette sélection.');
   if(r.status!=='VERIFY'||!same(r.preview as typeof frozen))throw Error('Résultat Nolio non confirmé. Vérifiez les activités avant de reprendre.');
   const read=await p.verifyReceipts(dry);checkpoint(p);
   if(read.total!==total||read.verified<=verified){
    const failed=Array.isArray(r.results)?r.results.find((x:{result?:string})=>x.result!=='verified_unique'):null;
    const entry=dry.manifest?.find(x=>x.opIndex===failed?.opIndex);
    const d=failed?.diagnostic;
    const detail=failed?.result==='not_sent'?'Cette séance n’a pas encore été envoyée. Utilisez « Exporter vers Nolio » pour poursuivre le plan.':failed?.result==='absent'?'Séance absente de Nolio (supprimée ou déplacée).':failed?.result==='ambiguous'&&d&&Number.isSafeInteger(d.candidates)&&Number.isSafeInteger(d.exact)?`${d.candidates} correspondance(s), ${d.exact} identique(s). Champs différents : ${Array.isArray(d.fields)?d.fields.filter((x:unknown)=>typeof x==='string'&&/^[a-z_]{1,30}$/.test(x)).join(', '):'non précisés'}.`:'Présence exacte dans Nolio non confirmée.';
    throw Error(`${entry?entry.sessionKey+' · '+entry.date+' : ':''}${detail}${formatRawTargetEvidence(d?.targets)?' Cibles : '+formatRawTargetEvidence(d.targets)+'.':''}${formatWorkoutReadbackDifferences(d?.workout)?' Détail : '+formatWorkoutReadbackDifferences(d.workout)+'.':''} Export arrêté ; les activités déjà envoyées sont conservées.`);
   }
   verified=read.verified;nextIndex=read.nextIndex;
  }
  if(verified<target)throw Error('Vérification incomplète.');
 }
 if(verifyOnly){await verifyThrough(total);return {verified,total};}
 const check=await call('nolio-v2-send-plan',{...common,workflow:'coach',action:'precheck',expected,consent:true});
 if(check.status!=='READY'||!Array.isArray(check.gate)||check.gate.length||!same(check.preview as typeof frozen))throw Error('Export bloqué : '+String((check.gate as string[]|undefined)?.map(reasonFr).join(', ')||check.reason||'contrôle serveur incomplet'));
 const prior=check.existingThroughIndex;
 if(!Number.isSafeInteger(prior)||Number(prior)<0||Number(prior)>total)throw Error('État des envois précédents inconnu : export arrêté.');
 if(Number(prior)>0)await verifyThrough(Number(prior));
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
