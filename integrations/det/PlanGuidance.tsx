import {detClientUrl} from './detClientUrl';
import {deliverToNolio,scopeFor,type NolioReceipt} from './nolioDelivery';
import {useEffect, useRef, useState} from 'react';
import type {ParsedPlan} from '@/lib/aiPlanParser';

type Block = {
  kind:string;
  comment?:string;
  intensity?:string;
  duration?:{value:number;unit:string};
  targets?:{type:string;unit?:string;value?:number|string;value_max?:number|string;rpe?:number;rpe_max?:number}[];
  times?:number;
  steps?:Block[];
  skip_last?:boolean;
};
type Receipt = {
  precheck:{complete:boolean;planProblems:string[];rows:{status:string;reason:string|null;sessionKey:string}[]};
  ops:{sessionKey:string;date:string;body:{workout?:Block[]}}[];
};
type Client={runDet:(job:unknown,signal:AbortSignal)=>Promise<Receipt>};
const numbers=new Intl.NumberFormat('fr-BE',{maximumFractionDigits:2});

function duration(value:number,unit:string){
  if(unit!=='s')return numbers.format(value)+' '+unit;
  const mins=Math.floor(value/60),secs=value%60;
  return [mins?mins+' min':'',secs?numbers.format(secs)+' s':''].filter(Boolean).join(' ')||'0 s';
}
function targetLabel(t: NonNullable<Block['targets']>[number]) {
  if (t.type === 'no_target') return 'sans cible';
  if (t.type === 'rpe') return 'RPE ' + t.rpe + (t.rpe_max === undefined ? '' : '–' + t.rpe_max) + '/10';
  if (t.value === undefined) return t.type;
  const show = (v: number|string) => typeof v === 'string' ? v : numbers.format(v);
  const range = show(t.value) + (t.value_max !== undefined && t.value_max !== t.value ? '–' + show(t.value_max) : '');
  const unit = t.unit === '/km' ? 'min/km' : t.unit === '/100m' ? 'min/100 m' : t.unit;
  return [range, unit].filter(Boolean).join(' ');
}
function Blocks({blocks}:{blocks:Block[]}){
  return <ol className="ml-5 list-decimal">{blocks.map((b,i)=>{
    if(b.kind==='repeat')return <li key={i}>{b.times} répétitions{b.skip_last?' · dernière récupération omise':''}<Blocks blocks={b.steps??[]}/></li>;
    const target=b.targets?.map(targetLabel).join(' / ');
    const label=b.comment||({warmup:'Échauffement',rest:'Récupération',work:'Effort',cooldown:'Retour au calme'}[b.intensity??''])||'Étape';
    return <li key={i}>{[label,b.duration?duration(b.duration.value,b.duration.unit):'',target].filter(Boolean).join(' · ')}</li>;
  })}</ol>;
}

/** Read the structured Nolio translation, including repeats. No remote account or operation is used. */
export function PlanGuidance({plan}:{plan:ParsedPlan}){
  const [selection,setSelection]=useState('all');
  const [receipt,setReceipt]=useState<Receipt|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const [delivery,setDelivery]=useState('');
  const [remoteReceipt,setRemoteReceipt]=useState<NolioReceipt|null>(null);
  const running=useRef<AbortController|null>(null);
  useEffect(()=>()=>running.current?.abort(),[]);
  const sessions=plan.weeks.flatMap(w=>w.sessions.map((s,i)=>({session:s,key:'S'+w.weekNumber+'-J'+s.dayIndex+'-'+i})));
  async function verify(){
    running.current?.abort();
    const controller=new AbortController();
    running.current=controller;
    setBusy(true);setError('');setReceipt(null);
    try{
      const scope=scopeFor(selection);
      const client:Client=await import(/* @vite-ignore */ detClientUrl());
      const result=await client.runDet({action:'preview',plan,scope},controller.signal);
      if(!controller.signal.aborted)setReceipt(result);
    }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:String(e));}
    finally{if(!controller.signal.aborted)setBusy(false);}
  }
  async function send(){
    running.current?.abort();
    const controller=new AbortController();running.current=controller;
    setError('');setRemoteReceipt(null);setDelivery('Vérification de la connexion et de l’athlète Nolio…');setBusy(true);
    try{
      const {callNolio}=await import('./nolioRemote');
      const result=await deliverToNolio(callNolio,plan,scopeFor(selection),controller.signal,message=>{if(!controller.signal.aborted)setDelivery(message);});
      if(!controller.signal.aborted){setDelivery(result.message);setRemoteReceipt(result);}
    }catch(error){if(!controller.signal.aborted){setDelivery('');setError(error instanceof Error?error.message:String(error));}}
    finally{if(!controller.signal.aborted)setBusy(false);}
  }
  return <section className="space-y-2 border-t pt-3" aria-label="Guidage Nolio V2">
    <h4 className="font-semibold">Guidage Nolio V2</h4>
    <p>Ce contrôle prépare les étapes sur des associations simulées. L’envoi au calendrier Nolio et la réception sur la montre demandent une vérification séparée.</p>
    <label>Portée du contrôle <select value={selection} onChange={e=>{running.current?.abort();setBusy(false);setReceipt(null);setError('');setDelivery('');setRemoteReceipt(null);setSelection(e.target.value);}}>
      <option value="all">Plan complet</option>
      <optgroup label="Semaines">{plan.weeks.map(w=><option key={w.weekNumber} value={'week-'+w.weekNumber}>Semaine {w.weekNumber}</option>)}</optgroup>
      <optgroup label="Séances">{sessions.filter(row=>!row.session.isRest).map(row=><option key={row.key} value={row.key}>{row.key} · {row.session.title}</option>)}</optgroup>
    </select></label>
    <button type="button" className="rounded border px-2 py-1" disabled={busy} onClick={()=>void verify()}>{busy?'Vérification…':'Vérifier sans envoyer'}</button>
    <button type="button" className="rounded border px-2 py-1" disabled={busy} onClick={()=>void send()}>Exporter {selection==='all'?'le plan':selection.startsWith('week-')?'la semaine':'la séance'} vers Nolio</button>
    {!!delivery&&<p role="status">{delivery}</p>}
    {remoteReceipt && <details><summary>Identifiants d’envoi et de relecture Nolio</summary>
      <p>Version TFCLab · {remoteReceipt.planVersionId}</p>
      <ul>{remoteReceipt.matched.map(row=><li key={row.opKey}>{row.date} · {row.sessionKey} · Identifiant envoyé {row.sentId} · Identifiant relu {row.readId}</li>)}</ul>
    </details>}
    {error&&<p role="alert" className="whitespace-pre-line">{error}</p>}
    {receipt&&<div aria-live="polite"><p>{receipt.ops.length} opération(s) préparée(s) en simulation locale. {receipt.precheck.complete?'Traduction complète.':'Traduction incomplète.'}</p>
      {receipt.precheck.planProblems.map(reason=><p key={reason}>{reason}</p>)}
      {receipt.precheck.rows.filter(r=>r.status==='refused').map(r=><p key={r.sessionKey}>{r.sessionKey} · {r.reason}</p>)}
      {selection.startsWith('S') && receipt.ops.filter(op=>op.body.workout?.length).map(op=><div key={op.sessionKey}><p>{op.date} · Étapes attendues sur la montre</p><Blocks blocks={op.body.workout!}/></div>)}
    </div>}
  </section>;
}
