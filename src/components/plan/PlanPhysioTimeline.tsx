import { useEffect, useMemo, useRef, useState } from "react";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import { renderPlanTimelineSVG, type TimelinePalette, type TimelinePhaseRange } from "@/lib/plan/timeline/planTimeline";

const v = (t: string, a = 1) => (a === 1 ? `hsl(var(--${t}))` : `hsl(var(--${t}) / ${a})`);
const APP_PALETTE: TimelinePalette = {
  text: v("foreground"), muted: v("muted-foreground"), grid: v("border"), bg: "transparent",
  moderate: v("success"), heavy: v("warning"), severe: v("destructive"), strength: v("muted-foreground", 0.7),
  unclassified: v("muted-foreground", 0.3), recovery: v("primary"), race: v("foreground"),
  phases: [v("primary", 0.12), v("success", 0.14), v("warning", 0.16), v("destructive", 0.12), v("accent", 0.5), v("muted")],
};

/** Contenu de la « Timeline de la périodisation » : occupe toute la largeur disponible. */
export function PlanPhysioTimeline({ plan, phases, displayPhase, startDate }: { plan: ParsedPlan; phases?: TimelinePhaseRange[]; displayPhase?: (p: string) => string; startDate?: Date }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const svg = useMemo(() => (width ? renderPlanTimelineSVG(plan, { palette: APP_PALETTE, phases, displayPhase, startDate, width }) : ""), [plan, phases, displayPhase, startDate, width]);
  return (
    <div className="space-y-2">
      <div ref={ref} className="w-full overflow-x-auto pb-1" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="text-xs text-muted-foreground">
        Chaque colonne = une semaine. <b className="text-foreground">Chantier</b> = travail prioritaire de la semaine. <b className="text-foreground">Charge</b> = volume prévu : la courbe monte, redescend sur <span className="font-semibold text-primary">allège</span> (récupération) et <span className="font-semibold text-warning">affûte</span> (avant course). Survolez pour le détail.
      </p>
    </div>
  );
}
