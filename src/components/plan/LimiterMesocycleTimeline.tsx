import type { ParsedPlan } from '@/lib/aiPlanParser';
import { computeMesocycleLimiterFocus } from '@/engines/plan/planValidator';
import { limiterKeyLabel } from '@/lib/limiterSessionPatterns';
/** Same planned/observed view for both engine outputs; no review authority. */
export function LimiterMesocycleTimeline({plan,limiterKeys}:{plan:ParsedPlan;limiterKeys:string[]}) {
  const blocks=computeMesocycleLimiterFocus(plan,limiterKeys);
  if(!blocks.length)return null;
  return <details className="rounded border p-3 text-sm"><summary className="cursor-pointer font-medium">Travail des limiteurs par mésocycle</summary>
    <p className="text-xs text-muted-foreground mt-2">Focus prévu et correspondances dans les séances clés. Ces correspondances textuelles ne prouvent ni la dose physiologique ni une amélioration mesurée.</p>
    <ul className="space-y-2 mt-2">{blocks.map(block=><li key={block.block}><b>Bloc {block.block} · S{block.startWeek}–S{block.endWeek} · focus prévu : {block.plannedFocus}</b><p className="text-xs">{block.breakdown.map(item=>`${limiterKeyLabel(item.key)} : ${item.hits}/${block.totalKeySessions} séances clés`).join(' · ')}</p></li>)}</ul>
  </details>;
}
