import { useMemo } from "react";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import { renderPlanTimelineSVG, type TimelinePalette, type TimelinePhaseRange } from "@/lib/plan/timeline/planTimeline";

const v = (t: string, a = 1) => (a === 1 ? `hsl(var(--${t}))` : `hsl(var(--${t}) / ${a})`);
const APP_PALETTE: TimelinePalette = {
  text: v("foreground"), muted: v("muted-foreground"), grid: v("border"), bg: "transparent",
  moderate: v("success"), heavy: v("warning"), severe: v("destructive"), strength: v("muted-foreground", 0.7),
  unclassified: v("muted-foreground", 0.3), recovery: v("primary"), race: v("foreground"),
  phases: [v("primary", 0.12), v("success", 0.14), v("warning", 0.16), v("destructive", 0.12), v("accent", 0.5), v("muted")],
};

/** Contenu de la « Timeline de la périodisation » : phases datées, chantier de la semaine, courbe de charge. */
export function PlanPhysioTimeline({ plan, phases, displayPhase, startDate }: { plan: ParsedPlan; phases?: TimelinePhaseRange[]; displayPhase?: (p: string) => string; startDate?: Date }) {
  const svg = useMemo(() => renderPlanTimelineSVG(plan, { palette: APP_PALETTE, phases, displayPhase, startDate }), [plan, phases, displayPhase, startDate]);
  if (!svg) return null;
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto pb-1" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="text-xs text-muted-foreground">
        Chaque colonne = une semaine. <b className="text-foreground">Chantier</b> = limiteur prioritaire travaillé (« + n » : autres entretenus). <b className="text-foreground">Charge</b> = volume prévu : la courbe monte, redescend sur <span className="font-semibold text-primary">allège</span> (récupération) et <span className="font-semibold text-warning">affûte</span> (avant course). Survolez pour le détail.
      </p>
    </div>
  );
}
