import { useMemo } from "react";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import { renderPlanTimelineHTML, type TimelinePalette, type TimelinePhaseRange } from "@/lib/plan/timeline/planTimeline";

const v = (t: string, a = 1) => (a === 1 ? `hsl(var(--${t}))` : `hsl(var(--${t}) / ${a})`);
const APP_PALETTE: TimelinePalette = {
  text: v("foreground"), muted: v("muted-foreground"), grid: v("border"), bg: "transparent",
  moderate: v("success"), heavy: v("warning"), severe: v("destructive"), strength: v("muted-foreground", 0.7),
  unclassified: v("muted-foreground", 0.3), recovery: v("primary"), race: v("foreground"),
  phases: [v("primary", 0.12), v("success", 0.14), v("warning", 0.16), v("destructive", 0.12), v("accent", 0.5), v("muted")],
};

/** Contenu de la « Timeline de la périodisation » : occupe toute la largeur disponible. */
export function PlanPhysioTimeline({ plan, phases, displayPhase, startDate }: { plan: ParsedPlan; phases?: TimelinePhaseRange[]; displayPhase?: (p: string) => string; startDate?: Date }) {
  const html=useMemo(()=>renderPlanTimelineHTML(plan,displayPhase,startDate,{palette:APP_PALETTE,phases,screen:true}),[plan,phases,displayPhase,startDate]);
  return (
    <div className="w-full min-w-0" dangerouslySetInnerHTML={{__html:html}} />
  );
}
