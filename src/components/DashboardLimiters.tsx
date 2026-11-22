import { FieldMetricComparison } from "@/components/charts/FieldComparison";
import { ReferenceGauge } from "@/components/charts/ReferenceGauge";
import type { compassFlow } from "@/lib/coachingCompass/compassFlow";

type Flow = ReturnType<typeof compassFlow>;

/**
 * Every ranked limiter, visible at once, in the order the Compass computed for
 * this objective and ambition. Display only: it reads `compassFlow` and adds no
 * ranking, target or threshold of its own.
 */
export function DashboardLimiters({ flow, objective, ambition }: { flow: Flow; objective: string; ambition: string }) {
  const ranked = flow.lead ? [flow.lead, ...flow.others] : [];
  const cautious = ranked.length > 0 && flow.title !== ranked[0].title;
  return (
    <section aria-labelledby="dashboard-limiters" className="min-w-0 space-y-4 rounded-3xl border bg-card p-5 sm:p-6">
      <div>
        <h2 id="dashboard-limiters" className="text-lg font-semibold tracking-tight">Limiteurs hiérarchisés</h2>
        <p className="text-sm text-muted-foreground">Pour l’objectif {objective} · ambition {ambition}</p>
      </div>
      {cautious && <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">Lecture prudente : {flow.title}. {flow.detail}</p>}
      {ranked.length ? (
        <ol className="space-y-4">
          {ranked.map((factor, index) => (
            <li key={factor.metric + factor.title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2">
              <span aria-hidden className={"flex size-8 items-center justify-center rounded-full text-sm font-semibold " +
                (index === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground")}>{index + 1}</span>
              <div className="min-w-0 space-y-2">
                <div>
                  <h3 className="text-base font-semibold leading-snug">
                    <span className="sr-only">Priorité {index + 1} : </span>{factor.title}
                  </h3>
                  <p className="text-xs font-medium text-muted-foreground">{factor.status}</p>
                </div>
                {factor.facts && <p className="text-sm leading-relaxed text-foreground/80">{factor.facts}</p>}
                {factor.observation && <FieldMetricComparison metric={factor.observation} hypothesis={factor.hypothesis} />}
                {factor.comparison && <ReferenceGauge {...factor.comparison} name={factor.title} />}
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <div className="space-y-1">
          <p className="text-base font-semibold">{flow.title}</p>
          <p className="text-sm leading-relaxed text-foreground/80">{flow.detail}</p>
        </div>
      )}
    </section>
  );
}
