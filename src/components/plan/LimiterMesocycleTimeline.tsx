import type { ParsedPlan } from '@/lib/aiPlanParser';
import { computeMesocycleLimiterFocus } from '@/engines/plan/planValidator';
import { limiterKeyLabel } from '@/lib/limiterSessionPatterns';
import {savedDetPreparationTimeline} from '@/lib/det/detPreparationTimeline';
/** Same planned/observed view for both engine outputs; no review authority. */
export function LimiterMesocycleTimeline({plan,limiterKeys}:{plan:ParsedPlan;limiterKeys:string[]}) {
  const saved=savedDetPreparationTimeline(plan);
  if(saved?.length)return <section aria-label="Chantiers de la préparation" className="rounded border p-3 text-sm">
    <h3 className="font-medium">Chantiers de la préparation</h3>
    <p className="text-xs text-muted-foreground mt-2">Priorités et séances de cette version enregistrée. Les associations aux limiteurs décrivent le choix des fiches ; elles ne prouvent pas une amélioration physiologique.</p>
    <ol className="space-y-3 mt-3">{saved.map(block=><li key={block.startWeek} className="border-l-2 pl-3">
      <b>S{block.startWeek}{block.endWeek!==block.startWeek?`–S${block.endWeek}`:''} · {block.mode==='recovery'?'Récupération et assimilation':block.mode==='taper'?'Affûtage':block.mode==='race'?'Compétition':block.focus?`Priorité : ${limiterKeyLabel(block.focus)}`:'Préparation'}</b>
      <p className="text-xs">Limiteur principal : {block.primary?limiterKeyLabel(block.primary):'non renseigné'}{block.maintenance.length?` · Maintien prévu : ${block.maintenance.map(limiterKeyLabel).join(', ')}`:''}</p>
      <p className="text-xs">{block.associations.map(row=>`${limiterKeyLabel(row.limiter)} : ${row.sessions}/${block.keySessions} séances clés ou longues associées`).join(' · ')}</p>
      <p className="text-xs text-muted-foreground">{Math.round(block.knownMinutes)} min d’exercice connues{block.totalMinutes===null?' · durée totale à préciser':''}</p>
      <details className="mt-1 text-xs"><summary className="cursor-pointer">Séances retenues ({block.sources.length} fiches)</summary><ul className="mt-1">{block.sources.map(source=><li key={source.id}>{source.title} · {source.id}</li>)}</ul></details>
    </li>)}</ol>
  </section>;
  const blocks=computeMesocycleLimiterFocus(plan,limiterKeys);
  if(!blocks.length)return null;
  return <details className="rounded border p-3 text-sm"><summary className="cursor-pointer font-medium">Travail des limiteurs par mésocycle</summary>
    <p className="text-xs text-muted-foreground mt-2">Focus prévu et correspondances dans les séances clés. Ces correspondances textuelles ne prouvent ni la dose physiologique ni une amélioration mesurée.</p>
    <ul className="space-y-2 mt-2">{blocks.map(block=><li key={block.block}><b>Bloc {block.block} · S{block.startWeek}–S{block.endWeek} · focus prévu : {block.plannedFocus}</b><p className="text-xs">{block.breakdown.map(item=>`${limiterKeyLabel(item.key)} : ${item.hits}/${block.totalKeySessions} séances clés`).join(' · ')}</p></li>)}</ul>
  </details>;
}
