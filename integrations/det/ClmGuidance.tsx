import {useEffect, useRef, useState} from 'react';
import type {ParsedPlan} from '@/lib/aiPlanParser';

type Block = {
  kind:string;
  comment?:string;
  intensity?:string;
  duration?:{value:number;unit:string};
  targets?:{type:string;unit?:string;value?:number;value_max?:number}[];
  times?:number;
  steps?:Block[];
  skip_last?:boolean;
};
type Receipt = {
  precheck:{complete:boolean;rows:{status:string;reason:string|null;sessionKey:string}[]};
  ops:{sessionKey:string;date:string;body:{workout?:Block[]}}[];
};
type Client={runDet:(job:unknown,signal:AbortSignal)=>Promise<Receipt>};
const numbers=new Intl.NumberFormat('fr-BE',{maximumFractionDigits:2});

function duration(value:number,unit:string){
  if(unit!=='s')return numbers.format(value)+' '+unit;
  const mins=Math.floor(value/60),secs=value%60;
  return [mins?mins+' min':'',secs?numbers.format(secs)+' s':''].filter(Boolean).join(' ')||'0 s';
}
function Blocks({blocks}:{blocks:Block[]}){
  return <ol className="ml-5 list-decimal">{blocks.map((b,i)=>{
    if(b.kind==='repeat')return <li key={i}>{b.times} répétitions{b.skip_last?' · dernière récupération omise':''}<Blocks blocks={b.steps??[]}/></li>;
    const target=b.targets?.map(t=>t.type==='no_target'?'sans cible':t.value!=null?[numbers.format(t.value),t.value_max!=null&&t.value_max!==t.value?'–'+numbers.format(t.value_max):'',t.unit?' '+t.unit:''].join(''):t.type).join(' / ');
    const label=b.comment||({warmup:'Échauffement',rest:'Récupération',work:'Effort',cooldown:'Retour au calme'}[b.intensity??''])||'Étape';
    return <li key={i}>{[label,b.duration?duration(b.duration.value,b.duration.unit):'',target].filter(Boolean).join(' · ')}</li>;
  })}</ol>;
}

/** Read the structured Nolio translation, including repeats. No remote account or operation is used. */
export function ClmGuidance({plan}:{plan:ParsedPlan}){
  const [selection,setSelection]=useState('all');
  const [receipt,setReceipt]=useState<Receipt|null>(null);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const running=useRef<AbortController|null>(null);
  useEffect(()=>()=>running.current?.abort(),[]);
  const sessions=plan.weeks.flatMap(w=>w.sessions.map((s,i)=>({session:s,key:'S'+w.weekNumber+'-J'+s.dayIndex+'-'+i})));
  async function verify(){
    running.current?.abort();
    const controller=new AbortController();
    running.current=controller;
    setBusy(true);setError('');setReceipt(null);
    try{
      const race=sessions.find(row=>row.session.title.startsWith('COURSE : '))?.session;
      if(!race)throw Error('Course A introuvable dans le plan.');
      const date=(plan as ParsedPlan & {_raceDate:string})._raceDate;
      const refs={synthetic:true,athleteId:'usr_LOCAL_PREVIEW',sportIds:{bike:'spt_BIKE',strength:'spt_STRENGTH'},exerciseIds:{},
        competition:{name:race.title.slice('COURSE : '.length),date,sport:'bike',goalType:'a'}};
      const scope=selection==='all'?{kind:'all'}:selection.startsWith('week-')?{kind:'weeks',from:Number(selection.slice(5)),to:Number(selection.slice(5))}:{kind:'sessions',keys:[selection]};
      const client:Client=await import(/* @vite-ignore */ new URL('/__det/v1/client.mjs',window.location.origin).href);
      const result=await client.runDet({action:'verify',args:[plan,refs,'DET_LOCAL_PREVIEW',scope]},controller.signal);
      if(!controller.signal.aborted)setReceipt(result);
    }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:String(e));}
    finally{if(!controller.signal.aborted)setBusy(false);}
  }
  return <section className="space-y-2 border-t pt-3" aria-label="Guidage Nolio V2">
    <h4 className="font-semibold">Guidage Nolio V2</h4>
    <label>Portée du contrôle <select value={selection} onChange={e=>{running.current?.abort();setBusy(false);setReceipt(null);setError('');setSelection(e.target.value);}}>
      <option value="all">Plan complet</option>
      <optgroup label="Semaines">{plan.weeks.map(w=><option key={w.weekNumber} value={'week-'+w.weekNumber}>Semaine {w.weekNumber}</option>)}</optgroup>
      <optgroup label="Séances">{sessions.filter(row=>!row.session.isRest).map(row=><option key={row.key} value={row.key}>{row.key} · {row.session.title}</option>)}</optgroup>
    </select></label>
    <button type="button" className="rounded border px-2 py-1" disabled={busy} onClick={()=>void verify()}>{busy?'Vérification…':'Vérifier sans envoyer'}</button>
    {error&&<p role="alert">{error}</p>}
    {receipt&&<div aria-live="polite"><p>{receipt.ops.length} opération(s) préparée(s) en simulation locale. {receipt.precheck.complete?'Traduction complète.':'Traduction incomplète.'}</p>
      {receipt.precheck.rows.filter(r=>r.status==='refused').map(r=><p key={r.sessionKey}>{r.sessionKey} · {r.reason}</p>)}
      {receipt.ops.length===1&&receipt.ops[0].body.workout&&<><p>{receipt.ops[0].date} · Étapes attendues sur la montre</p><Blocks blocks={receipt.ops[0].body.workout}/></>}
    </div>}
  </section>;
}
