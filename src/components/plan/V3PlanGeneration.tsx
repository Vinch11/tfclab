import { useEffect,useRef,useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog,DialogContent,DialogHeader,DialogTitle } from '@/components/ui/dialog';
import type { FrozenAppPlanningInput } from '@/lib/det/appPlanningInput';
import { generateAppPlanningV3Proposal,type V3PlanProposal,type V3ProposalOptions,type ProposedV3Workout } from '@/lib/det/appPlanningV3Proposal';
import type { V3Block } from '../../../scripts/library-v3/catalogueRuntime';
import { getDoctrineDomain } from '@/lib/zones/tfclDoctrine';
import { LIMITER_LABELS } from '@/lib/det/coachDetContext';
const SPORTS:Record<string,string>={run:'Course',bike:'Vélo',swim:'Natation',strength:'Renforcement',brick:'Enchaînement vélo-course'};
const number=(n:number)=>new Intl.NumberFormat('fr-BE',{maximumFractionDigits:3}).format(n);
function duration(seconds:number){const minutes=Math.floor(seconds/60),rest=seconds-minutes*60;return [minutes?`${minutes} min`:'',rest?`${number(rest)} s`:''].filter(Boolean).join(' ')||'0 s';}
function blocksText(blocks:readonly V3Block[],level=0):string {
  return blocks.map(b=>{
    const prefix='  '.repeat(level);
    if(b.kind==='repeat')return `${prefix}${b.count.base} × ${b.label}\n${blocksText(b.steps,level+1)}${b.betweenSec?`\n${prefix}Récupération entre répétitions : ${duration(b.betweenSec)}`:''}`;
    const dose=b.kind==='time'?duration(b.seconds!.base):b.kind==='distance'?`${number(b.meters!.base)} m`:`${b.reps!.base} répétitions`;
    const domain=b.domain?` · ${getDoctrineDomain(b.domain).label}`:'';
    const reps=b.repsTarget?` · cible ${b.repsTarget.base} répétitions`:'',rpe=b.rpeRange?` · RPE ${b.rpeRange.min}–${b.rpeRange.max}`:'';
    return `${prefix}${b.label} : ${dose}${domain}${reps}${rpe}`;
  }).join('\n');
}
function Workout({part}:{part:ProposedV3Workout}){
  return <article className="space-y-2 rounded border p-3">
    <h5 className="font-medium">{part.title}</h5>
    <p className="text-xs">{part.durationMinutes===null?'Durée à préciser':duration(part.durationMinutes*60)}{part.distanceM>0?` · ${number(part.distanceM)} m`:''}</p>
    <p className="whitespace-pre-wrap text-sm">{blocksText(part.blocks)}</p>
    {part.targets.targets.length>0&&<ul className="text-xs space-y-1">{part.targets.targets.map((target,i)=><li key={i}>{target.domain?getDoctrineDomain(target.domain).label:'Force'} : {target.min===null?'charge individuelle à revoir':`${number(target.min)}${target.max!==null&&target.max!==target.min?`–${number(target.max)}`:target.max===null?' et plus':''} ${{watts:'W',sec_per_km:'s/km',sec_per_100m:'s/100 m',m_per_sec:'m/s',coach_rpe_load:'',coach_field_effort:'RPE'}[target.metric]}`} · {target.note}</li>)}</ul>}
    {part.targets.missing.length>0&&<p className="text-xs text-muted-foreground">Certains repères individuels restent à préciser dans la revue.</p>}
    <details className="text-xs"><summary>Source et conditions de la séance</summary><p>{part.sourceId} · niveau minimal : {part.review.minimumLevel} · récupération minimale de la source : {part.review.minimumRecoveryHours} h</p><p>Prérequis : {part.review.prerequisites.join(', ')}</p><p>Contre-indications : {part.review.contraindications.join(', ')}</p><p>Arrêt : {part.review.stopRule}</p></details>
  </article>;
}
export function V3PlanGeneration({app,athleteId,coachId,guard,options}:{app:FrozenAppPlanningInput|null;athleteId:string;coachId:string;guard:()=>Promise<{userId:string;athleteId:string}|null>;options:V3ProposalOptions}){
  const [plan,setPlan]=useState<V3PlanProposal|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[open,setOpen]=useState(false);
  const key=JSON.stringify([coachId,athleteId,app?.fingerprint,options]),live=useRef(key);live.current=key;
  useEffect(()=>{setPlan(null);setOpen(false);setError('');setBusy(false);},[key]);
  async function generate(){
    if(!app||busy)return;const started=key;setBusy(true);setError('');
    try{
      const before=await guard();if(started!==live.current)return;
      if(!before||before.userId!==coachId||before.athleteId!==athleteId)throw Error('Connexion et athlète à vérifier avant génération.');
      const next=await generateAppPlanningV3Proposal(app,athleteId,options);if(started!==live.current)return;
      const after=await guard();if(started!==live.current)return;
      if(!after||after.userId!==coachId||after.athleteId!==athleteId)throw Error('Connexion modifiée pendant la génération : résultat écarté.');
      setPlan(next);setOpen(true);
    }catch(e){if(started===live.current)setError(e instanceof Error?e.message:'Génération V3 interrompue.');}
    finally{if(started===live.current)setBusy(false);}
  }
  return <section className="rounded border p-3 space-y-2" aria-label="Génération du plan V3">
    <p className="font-medium">Plan V3 depuis le profil existant</p>
    <p className="text-sm">Une séance retenue par créneau, avec ses blocs. Les priorités et le calendrier viennent de la configuration commune.</p>
    <Button disabled={!app||busy} onClick={()=>{void generate();}}>{busy?'Assemblage V3…':'Générer le plan V3 à revoir'}</Button>
    {error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Plan V3 assemblé — à revoir</DialogTitle></DialogHeader>
      {plan&&<div className="space-y-4 text-sm"><p><b>{plan.objective}</b> · {plan.weeks.length} semaines</p>
        <p>Limiteurs : {plan.limiterOrder.map(raw=>LIMITER_LABELS[raw]??raw).join(' → ')}</p>
        {!!plan.eventCalendar?.length&&<details><summary>Épreuves du calendrier</summary><ul>{plan.eventCalendar.map((event,i)=><li key={i}>{event.raceDate??'Date à préciser'} · {event.raceName||event.objective} · priorité {event.priority}</li>)}</ul></details>}
        <p role="status">Proposition de séances non approuvée pour utilisation. Les durées inconnues et les contrôles sportifs encore nécessaires restent indiqués ; aucune revue n’est préremplie.</p>
        <details><summary>Contrôles et points à revoir</summary><ul className="list-disc pl-5">{plan.checks.filter(c=>c.status==='pending').map((check,i)=><li key={i}>{check.week?`S${check.week} : `:''}{check.message}</li>)}</ul></details>
        {plan.weeks.map(week=><details key={week.week} open={week.week===1} className="rounded border p-3"><summary className="font-medium cursor-pointer">Semaine {week.week} · {week.phase} · {week.focus?`focus ${LIMITER_LABELS[week.focus]??week.focus}`:'maintien / intégration'} · {week.durationMinutes===null?`${number(week.knownMinutes)} min calculées, total incomplet`:duration(week.durationMinutes*60)}</summary>
          <div className="grid gap-3 sm:grid-cols-2 mt-3">{week.days.map(day=><section key={day.day} className="rounded border p-3 space-y-2"><h4 className="font-semibold capitalize">{day.day}</h4>{day.rest&&<p>Repos prévu</p>}{day.sessions.map((session,i)=><div key={i} className="space-y-2"><p className="font-medium">{SPORTS[session.sport]??session.sport}{session.role==='race'?' · Épreuve déclarée':''}</p>{session.sport==='brick'&&<p className="text-xs">Composition proposée vélo puis course ; transition et récupération à confirmer.</p>}{session.components.map(part=><Workout key={part.sourceId} part={part}/>)}</div>)}</section>)}</div>
        </details>)}
      </div>}
    </DialogContent></Dialog>
  </section>;
}
