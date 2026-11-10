import { useMemo } from "react";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import { renderPlanTimelineSVG, type TimelinePalette } from "@/lib/plan/timeline/planTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const v = (t: string, a = 1) => (a === 1 ? `hsl(var(--${t}))` : `hsl(var(--${t}) / ${a})`);
const APP_PALETTE: TimelinePalette = {
  text: v("foreground"), muted: v("muted-foreground"), grid: v("border"), bg: "transparent",
  moderate: v("success"), heavy: v("warning"), severe: v("destructive"), strength: v("muted-foreground"),
  unclassified: v("muted"), recovery: v("primary"), race: v("foreground"),
  phases: [v("primary", 0.12), v("success", 0.14), v("warning", 0.16), v("destructive", 0.12), v("muted"), v("accent", 0.4)],
};

export function PlanPhysioTimeline({ plan, displayPhase }: { plan: ParsedPlan; displayPhase?: (p: string) => string }) {
  const svg = useMemo(() => renderPlanTimelineSVG(plan, { palette: APP_PALETTE, displayPhase }), [plan, displayPhase]);
  if (!svg) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Ligne du temps physiologique</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[640px]" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Hauteur = volume prévu ; couleurs = temps par domaine (LT1 → MLSS → VO₂max). Les séances sans durée ou intensité identifiable restent « non classées ».
        </p>
      </CardContent>
    </Card>
  );
}
