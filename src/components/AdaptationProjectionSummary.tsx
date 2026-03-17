/**
 * AdaptationProjectionSummary — Pre-generation visual summary
 * Shows projected physiological adaptations before the coach launches plan generation.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Crosshair } from "lucide-react";
import type { AdaptationProjection } from "@/hooks/useAITrainingPlan";

interface Props {
  projections: AdaptationProjection[];
}

const DIRECTION_ICON = {
  up: TrendingUp,
  down: TrendingDown,
  stable: Minus,
} as const;

const DIRECTION_COLOR = {
  up: "text-emerald-500",
  down: "text-sky-500",
  stable: "text-muted-foreground",
};

export function AdaptationProjectionSummary({ projections }: Props) {
  if (!projections || projections.length === 0) return null;

  const best = projections[0];

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <Crosshair className="h-3.5 w-3.5 text-primary" />
          🔮 Projections Adaptation Predictor™
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {/* Best scenario recommendation */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-[10px]">
              ⭐ {best.leverLabel}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Impact {best.impactScore.toFixed(0)}/100
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {best.recommendation}
          </p>
        </div>

        {/* Metrics Before → After */}
        {best.metrics.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Projections physiologiques
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {best.metrics.map((m) => {
                const Icon = DIRECTION_ICON[m.direction];
                const color = DIRECTION_COLOR[m.direction];
                return (
                  <div key={m.label} className="flex items-center gap-1.5">
                    <Icon className={`h-3 w-3 ${color} shrink-0`} />
                    <span className="text-[10px] text-foreground truncate">
                      {m.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap">
                      {m.current?.toFixed(1) ?? "?"} → {m.projected?.toFixed(1) ?? "?"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Performance impacts */}
        {best.performanceImpacts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {best.performanceImpacts
              .filter(p => p.improvementPct > 0)
              .map((p) => (
                <Badge
                  key={p.distance}
                  variant="secondary"
                  className="text-[9px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                >
                  {p.distance} +{p.improvementPct.toFixed(1)}%
                </Badge>
              ))}
          </div>
        )}

        {/* Alternative scenarios */}
        {projections.length > 1 && (
          <div className="pt-1.5 border-t border-border/40">
            <p className="text-[9px] text-muted-foreground mb-1">Alternatives :</p>
            <div className="flex flex-wrap gap-1">
              {projections.slice(1).map((s) => (
                <Badge key={s.leverId} variant="outline" className="text-[9px]">
                  {s.leverLabel} ({s.impactScore.toFixed(0)})
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
