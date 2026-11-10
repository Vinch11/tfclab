import { useMemo } from "react";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import { renderPlanTimelineSVG, timelineLegendItems, type TimelinePalette, type TimelinePhaseRange } from "@/lib/plan/timeline/planTimeline";

const v = (t: string, a = 1) => (a === 1 ? `hsl(var(--${t}))` : `hsl(var(--${t}) / ${a})`);
const APP_PALETTE: TimelinePalette = {
  text: v("foreground"), muted: v("muted-foreground"), grid: v("border"), bg: "transparent",
  moderate: v("success"), heavy: v("warning"), severe: v("destructive"), strength: v("muted-foreground", 0.7),
  unclassified: v("muted-foreground", 0.3), recovery: v("primary"), race: v("foreground"),
  phases: [v("primary", 0.12), v("success", 0.14), v("warning", 0.16), v("destructive", 0.12), v("accent", 0.5), v("muted")],
};

/** Contenu de la « Timeline de la périodisation » (phases + semaines + intensités). */
export function PlanPhysioTimeline({ plan, phases, displayPhase }: { plan: ParsedPlan; phases?: TimelinePhaseRange[]; displayPhase?: (p: string) => string }) {
  const svg = useMemo(() => renderPlanTimelineSVG(plan, { palette: APP_PALETTE, phases, displayPhase }), [plan, phases, displayPhase]);
  if (!svg) return null;
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto pb-1" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/80">
        {timelineLegendItems(APP_PALETTE).map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: l.color }} />{l.label}
          </span>
        ))}
        <span>🏁 course</span>
        <span className="text-destructive">● séance clé</span>
        <span className="text-primary">allégée = semaine de récupération</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Bandes violettes = chantiers (limiteurs travaillés, #1 = priorité) sur leurs semaines. Chaque barre = une semaine : hauteur = volume prévu (écrit au-dessus), couleurs = temps dans chaque zone d'intensité. Survolez une semaine pour le détail.
      </p>
    </div>
  );
}
