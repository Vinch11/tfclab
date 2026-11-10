export type ExportScope={kind:'all'}|{kind:'weeks';from:number;to:number}|{kind:'sessions';keys:string[]};
type RemoteResult={status:string;reason?:string;planVersionId?:string;total?:number;confirmed?:number;createdThisBatch?:number;
  expected?:number;present?:number;totalConfirmed?:number;nextIndex?:number|null;missing?:unknown[];unknown?:unknown[];
  problems?:string[];refused?:{session:string;reason:string}[]};
export type CallNolio=(input:Record<string,unknown>,signal:AbortSignal)=>Promise<RemoteResult>;
const reasons:Record<string,string>={athlete_not_linked:'Associez cet athlète TFCLab à son profil Nolio V2.',scopes_missing_reconnect:'La connexion Nolio doit autoriser la lecture et l’écriture des séances planifiées.',not_connected:'Connectez le compte Nolio du coach pour l’export DET.',scope_incomplete:'Des séances de la sélection restent sans traduction complète.',link_read_failed:'Le service ne peut pas lire l’association de cet athlète.',ledger_read_failed:'Le journal Nolio est inaccessible. Vérifiez les opérations déjà envoyées.',athlete_link_from_previous_connection_relink:'Vérifiez l’association de cet athlète après le changement de connexion Nolio.'};
function expectStatus(value:RemoteResult,status:string){
  if(value.status===status)return;
  const reason=value.reason??value.status;
  throw Error([reasons[reason]??reason,...(value.problems??[]),...(value.refused??[]).map(r=>r.session+' · '+r.reason)].join('\n'));
}
export function scopeFor(selection:string):ExportScope {
  if(selection==='all')return {kind:'all'};
  if(selection.startsWith('week-')){const week=Number(selection.slice(5));return {kind:'weeks',from:week,to:week};}
  return {kind:'sessions',keys:[selection]};
}
export async function deliverToNolio(call:CallNolio,plan:unknown,scope:ExportScope,signal:AbortSignal,progress:(message:string)=>void){
  const saved=await call({action:'archive',plan},signal);
  expectStatus(saved,'ARCHIVED');
  if(!saved.planVersionId)throw Error('Identifiant de version du plan absent.');
  const base={planVersionId:saved.planVersionId,scope};
  const start=await call({action:'prepare',...base},signal);
  expectStatus(start,'PREPARED');
  const total=start.total??0;
  if(total<1)throw Error('Aucune activité à exporter pour cette sélection.');
  let confirmed=start.confirmed??0;
  while(confirmed<total){
    progress('Nolio · '+confirmed+' / '+total+' activités confirmées.');
    const batch=await call({action:'send',...base},signal);
    if(batch.status!=='DONE')expectStatus(batch,'PROGRESS');
    if(batch.total!==total || batch.confirmed===undefined || batch.confirmed<=confirmed || batch.confirmed>total)
      throw Error('Envoi interrompu. Relancez la même sélection pour reprendre depuis le journal Nolio.');
    confirmed=batch.confirmed;
  }
  let present=0,fromIndex=0;
  for(;;){
    const verify=await call({action:'verify',...base,fromIndex},signal);
    expectStatus(verify,'VERIFIED');
    if(verify.expected!==total||verify.totalConfirmed!==total||verify.missing?.length||verify.unknown?.length)
      throw Error('Nolio n’a pas confirmé la présence et le contenu de chaque activité. Le journal conserve les opérations déjà envoyées.');
    present+=verify.present??0;
    if(verify.nextIndex==null)break;
    if(verify.nextIndex<=fromIndex || verify.nextIndex>=total)throw Error('La relecture Nolio doit être reprise.');
    fromIndex=verify.nextIndex;
  }
  if(present!==total)throw Error('Relecture Nolio incomplète.');
  return total+' activité(s) relue(s) sur Nolio avec les étapes prévues. La réception sur la montre reste à vérifier.';
}
