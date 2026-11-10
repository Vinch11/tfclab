import {useEffect, useRef, useState} from 'react';
import type {PlanAthleteData, PlanConfig} from '@/hooks/useAITrainingPlan';
import type {AthleteDiagnostic} from '@/engines/diagnostic';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {ClmGuidance} from './ClmGuidance';
import {emptyTimeTrial, enteredTimeTrial, TimeTrialFields} from './TimeTrialFields';

type PageInput = {
  athleteId:string; athlete:PlanAthleteData; config:PlanConfig; diagnostic:AthleteDiagnostic;
  pageLimiterOrder:readonly string[]; coachPayload?:{limiterOrder?:string[];excludedLimiterMetrics?:string[]}|null;
};
type DetPlan = ParsedPlan & {_provenance:{engine:string;engineVersion:string};_detSourceProposal:{limiterOrder:string[]}};
type WorkerClient = {runDet:(job:unknown,signal:AbortSignal)=>Promise<DetPlan>};

export function DetCoachPanel({readInput,disabled,revision,clm,defaultOpen=false}:{readInput:()=>PageInput;disabled:boolean;revision:string;clm:boolean;defaultOpen?:boolean}) {
  const [open,setOpen]=useState(defaultOpen);
  const [fields,setFields]=useState(emptyTimeTrial);
  const [trailKey,setTrailKey]=useState('');
  const [trail,setTrail]=useState({key:'',recent:'',peak:''});
  useEffect(()=>{
    if(!open||disabled||clm){setTrailKey('');return;}
    const input=readInput();
    setTrailKey(/^Trail/i.test(String(input.config.objective))?input.athleteId+'/'+input.config.objective:'');
  },[readInput,revision,open,disabled,clm]);
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<DetPlan|null>(null);
  const [error,setError]=useState('');
  const run=useRef<AbortController|null>(null);
  useEffect(()=>()=>{run.current?.abort();},[]);
  useEffect(()=>{
    run.current?.abort();setResult(null);setError('');setBusy(false);setFields(emptyTimeTrial());
  },[revision]);
  function resetResult(){run.current?.abort();setResult(null);setError('');setBusy(false);}
  async function generate(){
    resetResult();
    const controller=new AbortController();
    run.current=controller;setBusy(true);
    try {
      const input=readInput();
      const timeTrial=clm?enteredTimeTrial(fields,input.athleteId):undefined;
      let trailLongRunLimits;
      const currentKey=input.athleteId+'/'+input.config.objective;
      if(/^Trail/i.test(String(input.config.objective))){
        const required=input.config.ambitionMeta?.trainingLevel==='untrained';
        if(required && !(Number(input.config.loadHistory?.recentWeeklyHours)>0))
          throw Error('Renseigner le volume hebdomadaire récemment réalisé dans la configuration du plan.');
        if(required || (trail.key===currentKey && (trail.recent||trail.peak))){
          const recent=Number(trail.recent),peak=Number(trail.peak);
          if(trail.key!==currentKey||!Number.isFinite(recent)||!Number.isFinite(peak)||recent<=0||peak<recent)
            throw Error('Renseigner une sortie longue récemment tolérée et un plafond au moins égal, en minutes.');
          trailLongRunLimits={recentMinutes:recent,peakMinutes:peak};
        }
      }
      const url=new URL('/__det/v1/client.mjs',window.location.origin);
      const client:WorkerClient=await import(/* @vite-ignore */ url.href);
      const plan=await client.runDet({action:'generate',input:{...input,timeTrial,trailLongRunLimits}},controller.signal);
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
      {trailKey && <fieldset className="grid gap-2">
        <legend>Sortie longue en trail</legend>
        {([['recent','Durée récemment tolérée (min)'],['peak','Durée maximale en préparation (min)']] as const).map(([field,label])=>
          <label key={field} className="grid gap-1">{label}
            <input type="number" min="1" className="rounded border p-2" value={trail.key===trailKey?trail[field]:''}
              onChange={e=>{const value=e.target.value;resetResult();setTrail(previous=>({
                ...(previous.key===trailKey?previous:{key:trailKey,recent:'',peak:''}),[field]:value}));}}/>
          </label>)}
      </fieldset>}
      {clm && <TimeTrialFields value={fields} onChange={v=>{resetResult();setFields(v);}}/>}
      <button type="button" className="rounded-md border px-3 py-2" disabled={disabled||busy} onClick={()=>void generate()}>{busy?'Calcul DET en cours…':'Générer avec DET'}</button>
      {busy && <button type="button" className="ml-2" onClick={resetResult}>Annuler</button>}
      {error && <p role="alert" className="whitespace-pre-line">{error}</p>}
      {result && <div aria-live="polite">
        <h3 className="font-semibold">{result.title}</h3>
        <p>{result.weeks.length} semaines · {result._detSourceProposal.limiterOrder.join(' → ')}</p>
        <p className="text-xs" data-testid="det-provenance">Provenance : {result._provenance.engine} · {result._provenance.engineVersion} · ordre reçu par DET : {result._detSourceProposal.limiterOrder.join(' → ')}</p>
        {result.weeks.map(w=><details key={w.weekNumber}><summary>Semaine {w.weekNumber} · {w.theme}</summary>
          {w.coachNotes&&<p className="whitespace-pre-line">{w.coachNotes}</p>}
          {w.sessions.filter(s=>!s.isRest).map((s,i)=><div key={i} className="my-2"><strong>{s.dayName} · {s.title}</strong>{s.durationMin!=null && ' · '+s.durationMin+' min'}<p className="whitespace-pre-line">{s.details}</p></div>)}
        </details>)}
        {clm && <ClmGuidance plan={result}/>}
      </div>}
    </div>}
  </section>;
}
