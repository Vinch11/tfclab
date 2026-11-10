import {useEffect, useRef, useState} from 'react';
import type {PlanAthleteData, PlanConfig} from '@/hooks/useAITrainingPlan';
import type {AthleteDiagnostic} from '@/engines/diagnostic';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {emptyTimeTrial, enteredTimeTrial, TimeTrialFields} from './TimeTrialFields';

type PageInput = {
  athleteId:string; athlete:PlanAthleteData; config:PlanConfig; diagnostic:AthleteDiagnostic;
  pageLimiterOrder:readonly string[]; coachPayload?:{limiterOrder?:string[];excludedLimiterMetrics?:string[]}|null;
};
type DetPlan = ParsedPlan & {_provenance:{engine:string;engineVersion:string};_detSourceProposal:{limiterOrder:string[]}};
type WorkerClient = {runDet:(job:unknown,signal:AbortSignal)=>Promise<DetPlan>};

export function DetCoachPanel({readInput,disabled,revision}:{readInput:()=>PageInput;disabled:boolean;revision:string}) {
  const [open,setOpen]=useState(false);
  const [clm,setClm]=useState(false);
  const [fields,setFields]=useState(emptyTimeTrial);
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<DetPlan|null>(null);
  const [error,setError]=useState('');
  const run=useRef<AbortController|null>(null);
  useEffect(()=>()=>{run.current?.abort();},[]);
  useEffect(()=>{
    run.current?.abort();setResult(null);setError('');setBusy(false);setFields(emptyTimeTrial());setClm(false);
  },[revision]);
  function resetResult(){run.current?.abort();setResult(null);setError('');setBusy(false);}
  async function generate(){
    resetResult();
    const controller=new AbortController();
    run.current=controller;setBusy(true);
    try {
      const input=readInput();
      const timeTrial=clm?enteredTimeTrial(fields,input.athleteId):undefined;
      const url=new URL('/__det/v1/client.mjs',window.location.origin);
      const client:WorkerClient=await import(/* @vite-ignore */ url.href);
      const plan=await client.runDet({action:'generate',input:{...input,timeTrial}},controller.signal);
      if(controller.signal.aborted)return;
      if(plan._provenance?.engine!=='det')throw Error('Provenance du plan DET inconnue.');
      setResult(plan);
    }catch(reason){
      if(!controller.signal.aborted)setError(reason instanceof Error?reason.message:String(reason));
    }finally{if(!controller.signal.aborted)setBusy(false);}
  }
  return <section className="space-y-3 rounded-lg border p-3" aria-label="Génération déterministe">
    <button className="font-semibold" type="button" aria-expanded={open} onClick={()=>setOpen(!open)}>DET-ENGINE</button>
    {open && <div className="space-y-3">
      <label className="flex items-center gap-2"><input type="checkbox" checked={clm} onChange={e=>{resetResult();setClm(e.target.checked);}}/> Préparer un contre-la-montre vélo pour la course A</label>
      {clm && <TimeTrialFields value={fields} onChange={v=>{resetResult();setFields(v);}}/>}
      <button type="button" className="rounded-md border px-3 py-2" disabled={disabled||busy} onClick={()=>void generate()}>{busy?'Calcul DET en cours…':'Générer avec DET'}</button>
      {busy && <button type="button" className="ml-2" onClick={resetResult}>Annuler</button>}
      {error && <p role="alert" className="whitespace-pre-line">{error}</p>}
      {result && <div aria-live="polite">
        <h3 className="font-semibold">{result.title}</h3>
        <p>{result.weeks.length} semaines · {result._detSourceProposal.limiterOrder.join(' → ')}</p>
        {result.weeks.map(w=><details key={w.weekNumber}><summary>Semaine {w.weekNumber} · {w.theme}</summary>
          {w.coachNotes&&<p className="whitespace-pre-line">{w.coachNotes}</p>}
          {w.sessions.filter(s=>!s.isRest).map((s,i)=><div key={i} className="my-2"><strong>{s.dayName} · {s.title}</strong>{s.durationMin!=null && ' · '+s.durationMin+' min'}<p className="whitespace-pre-line">{s.details}</p></div>)}
        </details>)}
      </div>}
    </div>}
  </section>;
}
