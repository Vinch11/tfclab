import { Compass } from "lucide-react";
import { FieldMetricComparison } from "@/components/charts/FieldComparison";
import { ReferenceGauge } from "@/components/charts/ReferenceGauge";
import type { compassFlow } from "@/lib/coachingCompass/compassFlow";

type Flow = ReturnType<typeof compassFlow>;

/**
 * Every ranked limiter, visible at once, in the order the Compass computed for
 * this objective and ambition. Display only: it reads `compassFlow` and adds no
 * ranking, target or threshold of its own. Bevel reserves the ink surface for the
 * current coaching priority, which is exactly this ranking.
 */
export function DashboardLimiters({ flow, objective, ambition }: { flow: Flow; objective: string; ambition: string }) {
  const ranked = flow.lead ? [flow.lead, ...flow.others] : [];
  const cautious = ranked.length > 0 && flow.title !== ranked[0].title;
  return (
    <section aria-labelledby="dashboard-limiters" className="compass-priority min-w-0 space-y-5 rounded-3xl border p-5 sm:p-7">
      <div className="priority-label flex items-center gap-2 text-sm font-semibold"><Compass aria-hidden className="size-5" /> Priorité du Compass</div>
      <div className="space-y-1">
        <h2 id="dashboard-limiters" className="text-balance text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">Limiteurs hiérarchisés</h2>
        <p className="priority-detail text-sm">Pour l’objectif {objective} · ambition {ambition}</p>
        <p className="priority-detail text-xs leading-relaxed">Le Compass ne classe comme limiteurs que les facteurs situés sous le repère TFCL du moteur de plans. Tous les écarts à l’idéal sourcé sont classés plus haut.</p>
      </div>
      {cautious && <p className="priority-warning rounded-lg p-3 text-sm">Lecture prudente : {flow.title}. {flow.detail}</p>}
      {ranked.length ? (
        <ol className="space-y-5">
          {ranked.map((factor, index) => (
            <li key={factor.metric + factor.title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
              <span aria-hidden className={"flex size-9 items-center justify-center rounded-full text-sm font-semibold " +
                (index === 0 ? "bg-[#d7f5c9] text-[#263828]" : "border border-white/25 bg-white/10 text-white")}>{index + 1}</span>
              <div className="min-w-0 space-y-2">
                <div>
                  <h3 className="text-lg font-semibold leading-snug tracking-tight">
                    <span className="sr-only">Priorité {index + 1} : </span>{factor.title}
                  </h3>
                  <p className="priority-detail text-xs font-medium">{factor.status}</p>
                </div>
                {factor.facts && <p className="priority-detail text-sm leading-relaxed">{factor.facts}</p>}
                {(factor.observation || factor.comparison) && (
                  <div className="space-y-3 rounded-2xl bg-[#fcfbff] p-4 text-foreground">
                    {factor.observation && <FieldMetricComparison metric={factor.observation} hypothesis={factor.hypothesis} />}
                    {factor.comparison && <ReferenceGauge {...factor.comparison} name={factor.title} />}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="space-y-1">
          <p className="text-lg font-semibold">{flow.title}</p>
          <p className="priority-detail text-sm leading-relaxed">{flow.detail}</p>
        </div>
      )}
    </section>
  );
}
