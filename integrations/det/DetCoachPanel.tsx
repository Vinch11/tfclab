import {marathonTimeLabel,withMarathonTime} from './marathonTarget';
import {useEffect, useRef, useState} from 'react';
import type {PlanAthleteData, PlanConfig} from '@/hooks/useAITrainingPlan';
import type {AthleteDiagnostic} from '@/engines/diagnostic';
import type {ParsedPlan} from '@/lib/aiPlanParser';
import {TrailGuidanceFields,type TrailSource,type TrailReview} from './TrailGuidanceFields';
import {PlanGuidance} from './PlanGuidance';
import {emptyTimeTrial, enteredTimeTrial, TimeTrialFields} from './TimeTrialFields';

type PageInput = {
  athleteId:string; athlete:PlanAthleteData; config:PlanConfig; diagnostic:AthleteDiagnostic;
  pageLimiterOrder:readonly string[]; coachPayload?:{limiterOrder?:string[];excludedLimiterMetrics?:string[]}|null;
};
type DetPlan = ParsedPlan & {_provenance:{engine:string;engineVersion:string};_detSourceProposal:{limiterOrder:string[];athleteId:string;objective:string;planningInputFingerprint:string;weeks:{days:{sessions:{components:TrailSource[]}[]}[]}[]}};
type WorkerClient = {runDet:(job:unknown,signal:AbortSignal)=>Promise<DetPlan>};

const emptyHistory = {recent:'', peak:'', ride:'', marathon:'',target:'',thresholdReps:''};

function historyForm(input: PageInput) {
  const objective=String(input.config.objective);
  const returning=input.config.ambitionMeta?.trainingLevel === 'untrained';
  const returningTen=returning && /^10\s*k(?:m)?$/i.test(objective) && input.config.ambitionMeta?.effective==='finisher' &&
    /^(?:Durabilité|TTE)$/i.test(input.config.identifiedLimitersRaw?.[0]??'');
  const kind=returningTen?'tenReturn':/trail/i.test(objective) ? 'trail' : /^marathon$/i.test(objective) ? (returning?'marathonReturn':'marathon') :
    returning && /ironman|70[.,]?3|^(?:im|703)$|triathlon.*(?:full|half)/i.test(objective) ? 'bike' : null;
  if (!kind) return null;
  const times=input.config.raceGoals?.filter(g=>g.priority==='A'&&/^marathon$/i.test(g.objective)).map(g=>g.targetTimeMinutes)??[];
  const time=times.length&&times.every(t=>t===times[0])?times[0]:undefined;
  return {kind,time,key:'tfcl.det.history.v1.' + JSON.stringify([input.athleteId,objective,input.config.planStartDate])};
}

function savedHistory(key:string) {
  try {
    const saved=JSON.parse(localStorage.getItem(key)??'null');
    if (saved && typeof saved==='object') return Object.fromEntries(Object.keys(emptyHistory).map(field=>
      [field,typeof saved[field]==='string'?saved[field]:''])) as typeof emptyHistory;
  } catch { /* A browser with unavailable storage can still use the current form. */ }
  return {...emptyHistory};
}

export function DetCoachPanel({readInput,disabled,revision,clm,defaultOpen=false}:{readInput:()=>PageInput;disabled:boolean;revision:string;clm:boolean;defaultOpen?:boolean}) {
  const [open,setOpen]=useState(defaultOpen);
  const [fields,setFields]=useState(emptyTimeTrial);
  const [history,setHistory]=useState({key:'',kind:'',time:undefined as number|undefined,...emptyHistory});
  useEffect(()=>{
    const record=open && !disabled && !clm ? historyForm(readInput()) : null;
    setHistory(prev=>{
      if(!record)return prev.key ? {key:'',kind:'',time:undefined,...emptyHistory} : prev;
      if(prev.key===record.key && prev.kind===record.kind && prev.time===record.time)return prev;
      const fields=prev.key===record.key ? prev : savedHistory(record.key);
      const target=record.time ? marathonTimeLabel(record.time) : prev.key===record.key && prev.time!==undefined ? '' : fields.target;
      return {...fields,...record,target};
    });
  },[readInput,revision,open,disabled,clm]);
  const [busy,setBusy]=useState(false);
  const [result,setResult]=useState<DetPlan|null>(null);
  const [error,setError]=useState('');
  const [review,setReview]=useState<TrailReview|null>(null);
  const run=useRef<AbortController|null>(null);
  useEffect(()=>()=>{run.current?.abort();},[]);
  useEffect(()=>{
    run.current?.abort();setResult(null);setReview(null);setError('');setBusy(false);setFields(emptyTimeTrial());
  },[revision]);
  function resetResult(){run.current?.abort();setResult(null);setReview(null);setError('');setBusy(false);}
  function updateHistory(field:keyof typeof emptyHistory,value:string){
    const next={...history,[field]:value};
    resetResult();setHistory(next);
    try{localStorage.setItem(next.key,JSON.stringify(Object.fromEntries(Object.keys(emptyHistory).map(k=>[k,next[k as keyof typeof emptyHistory]]))));}
    catch{ /* Values remain in this form if storage is unavailable. */ }
  }
  async function generate(trailGuidanceReview?:TrailReview){
    if(!trailGuidanceReview)resetResult();
    else {run.current?.abort();setError('');}
    const controller=new AbortController();
    run.current=controller;setBusy(true);
    try {
      const input=readInput();
      const timeTrial=clm?enteredTimeTrial(fields,input.athleteId):undefined;
      const record=historyForm(input);
      const values=record?.key===history.key ? history : emptyHistory;
      const trailLongRunLimits=record?.kind==='trail' && (values.recent || values.peak)
        ? {recentMinutes:Number(values.recent),peakMinutes:Number(values.peak)} : undefined;
      const recentLongRideMinutes=record?.kind==='bike' && values.ride ? Number(values.ride) : undefined;
      if(record?.kind.startsWith('marathon'))input.config=withMarathonTime(input.config,values.target);
      const roadReturnThresholdReps=record?.kind==='tenReturn' && values.thresholdReps!=='' ? Number(values.thresholdReps) : undefined;
      const marathonRecentLongRunMinutes=record?.kind==='marathonReturn' && values.marathon ? Number(values.marathon) : undefined;
      const url=new URL('/__det/v1/client.mjs',window.location.origin);
      const client:WorkerClient=await import(/* @vite-ignore */ url.href);
      const plan=await client.runDet({action:'generate',input:{...input,timeTrial,trailLongRunLimits,recentLongRideMinutes,marathonRecentLongRunMinutes,roadReturnThresholdReps,trailGuidanceReview}},controller.signal);
      if(controller.signal.aborted)return;
      if(plan._provenance?.engine!=='det')throw Error('Provenance du plan DET inconnue.');
      setResult(plan);setReview(trailGuidanceReview??null);
    }catch(reason){
      if(!controller.signal.aborted) {
        const kind=(reason as {decision?:{kind?:string}})?.decision?.kind;
        const label=kind==='missing_data'?'Donnée à compléter':kind==='incompatible'?'Paramètres incompatibles':kind==='engine_limit'?'Limite du moteur':'';
        setError([label,reason instanceof Error?reason.message:String(reason)].filter(Boolean).join('\n'));
      }
    }finally{if(!controller.signal.aborted)setBusy(false);}
  }
  const proposal=result?._detSourceProposal;
  const trailSources=proposal && /trail/i.test(proposal.objective) ?
    [...new Map(proposal.weeks.flatMap(w=>w.days.flatMap(d=>d.sessions.flatMap(s=>s.components)))
      .filter(c=>c.sport==='run').map(c=>[c.sourceId,c])).values()] : [];
  const pendingTerrain=trailSources.filter(source=>source.targets?.status==='unresolved').length;
  return <section className="space-y-3 rounded-lg border p-3" aria-label="Génération déterministe">
    <button className="font-semibold" type="button" aria-expanded={open} onClick={()=>setOpen(!open)}>DET-ENGINE</button>
    {open && <div className="space-y-3">
      {history.key && <fieldset className="grid gap-2">
        <legend>{history.kind==='trail'?'Sortie longue en trail':history.kind==='bike'?'Reprise du vélo':history.kind==='tenReturn'?'Reprise du 10 km':'Objectif marathon'}</legend>
        {history.kind==='tenReturn' && <label className="grid gap-1">Fractions de 3 min au seuil récemment courues et tolérées depuis la reprise
          <select value={history.thresholdReps} onChange={e=>updateHistory('thresholdReps',e.target.value)}>
            <option value="">À renseigner</option><option value="0">Aucune</option><option value="1">1</option><option value="2">2</option><option value="3">3 ou plus</option>
          </select>
          <small>Sur le plat, après 10 min faciles, avec 3 min au trot entre les fractions, puis 6 min faciles et une récupération satisfaisante.</small>
        </label>}
        {(history.kind==='tenReturn' ? [] : history.kind==='trail' ? [['recent','Durée récemment tolérée (min)'],['peak','Durée maximale en préparation (min)']] as const :
          history.kind==='marathonReturn'? [['target','Chrono marathon visé (h:mm:ss ou minutes)'],['marathon','Durée d’une sortie longue à pied récemment tolérée (min)']] as const :
          history.kind==='marathon'? [['target','Chrono marathon visé (h:mm:ss ou minutes)']] as const :
          [['ride','Sortie vélo facile la plus longue récemment tolérée (min)']] as const).map(([field,label])=>
          <label key={field} className="grid gap-1">{label}
            <input type={field==='target'?'text':'number'} min={field==='target'?undefined:1} className="rounded border p-2" value={history[field]}
              onChange={e=>updateHistory(field,e.target.value)}/>
          </label>)}
      </fieldset>}
      {clm && <TimeTrialFields value={fields} onChange={v=>{resetResult();setFields(v);}}/>}
      <button type="button" className="rounded-md border px-3 py-2" disabled={disabled||busy} onClick={()=>void generate()}>{busy?'Calcul DET en cours…':'Générer avec DET'}</button>
      {busy && <button type="button" className="ml-2" onClick={resetResult}>Annuler</button>}
      {error && <p role="alert" className="whitespace-pre-line">{error}</p>}
      {result && <div aria-live="polite">
        <h3 className="font-semibold">{result.title}</h3>
        <p>Plan assemblé · Revue sportive du coach en attente.</p>
        {pendingTerrain>0 && <p>Guidage trail à compléter pour {pendingTerrain} fiche(s) V3. Renseignez le parcours observé, la sortie de référence et les efforts par bloc avant l’export.</p>}
        <p>{result.weeks.length} semaines{result._detSourceProposal.limiterOrder.length>0?' · '+result._detSourceProposal.limiterOrder.join(' → '):''}</p>
        <p className="whitespace-pre-line">{result.diagnostic}</p>
        {!!result.finalValidationIssues?.length && <details><summary>Points à vérifier avant prescription</summary>
          <ul>{result.finalValidationIssues.map((issue,i)=><li key={i}>{issue.message}</li>)}</ul></details>}
        <p className="text-xs" data-testid="det-provenance">Provenance : {result._provenance.engine} · {result._provenance.engineVersion} · ordre reçu par DET : {result._detSourceProposal.limiterOrder.join(' → ')}</p>
        {result.weeks.map(w=><details key={w.weekNumber}><summary>Semaine {w.weekNumber} · {w.theme}</summary>
          {w.coachNotes&&<p className="whitespace-pre-line">{w.coachNotes}</p>}
          {w.sessions.filter(s=>!s.isRest).map((s,i)=><div key={i} className="my-2"><strong>{s.dayName} · {s.title}</strong>{s.durationMin!=null && ' · '+s.durationMin+' min'}<p className="whitespace-pre-line">{s.details}</p></div>)}
        </details>)}
        {proposal && trailSources.length>0 && <TrailGuidanceFields key={proposal.planningInputFingerprint}
          sources={trailSources} review={review} athleteId={proposal.athleteId} fingerprint={proposal.planningInputFingerprint}
          busy={busy} onApply={value=>void generate(value)}/>}
        <PlanGuidance key={result._provenance.engineVersion+JSON.stringify(review)} plan={result} athleteId={result._detSourceProposal.athleteId}/>
      </div>}
    </div>}
  </section>;
}
