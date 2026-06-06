/**
 * AdaptationProjectionSummary — Pre-generation visual summary
 * Shows projected physiological adaptations before the coach launches plan generation.
 * Allows switching the active scenario via lever selector.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Crosshair } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdaptationProjection } from "@/hooks/useAITrainingPlan";

interface Props {
  projections: AdaptationProjection[];
  selectedLeverId?: string;
  onSelectLever?: (leverId: string) => void;
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

export function AdaptationProjectionSummary({
  projections,
  selectedLeverId,
  onSelectLever,
}: Props) {
  if (!projections || projections.length === 0) return null;

  const activeId = selectedLeverId || projections[0].leverId;
  const active = projections.find((p) => p.leverId === activeId) || projections[0];
  const alternatives = projections.filter((p) => p.leverId !== active.leverId);

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-xs flex items-center gap-1.5">
          <Crosshair className="h-3.5 w-3.5 text-primary" />
          🔮 Projections Adaptation Predictor™
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {/* Lever selector */}
        {projections.length > 1 && onSelectLever && (
          <Select value={active.leverId} onValueChange={onSelectLever}>
            <SelectTrigger className="h-7 text-[11px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {projections.map((p) => (
                <SelectItem key={p.leverId} value={p.leverId} className="text-[11px]">
                  {p.leverLabel} — Impact {p.impactScore.toFixed(0)}/100
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Active scenario */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="text-[10px]">
              ⭐ {active.leverLabel}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              Impact {active.impactScore.toFixed(0)}/100
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {active.recommendation}
          </p>
        </div>

        {/* Metrics Before → After */}
        {active.metrics.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              Projections physiologiques
            </p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {active.metrics.map((m) => {
                const Icon = DIRECTION_ICON[m.direction];
                const color = DIRECTION_COLOR[m.direction];
                // VLamax vit dans la plage 0.3–0.9 → 2 décimales requises
                // pour éviter qu'une baisse réelle (ex 0.60→0.59) ne s'affiche
                // comme "0.6 → 0.6" (faux "stable" visuel).
                const isVla = /vlamax/i.test(m.label);
                const digits = isVla ? 2 : 1;
                const deltaSign = m.deltaPct > 0 ? "+" : "";
                return (
                  <div key={m.label} className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-1 min-w-0">
                      <Icon className={`h-3 w-3 ${color} shrink-0`} />
                      <span className="text-[10px] font-medium text-foreground truncate flex-1 min-w-0">
                        {m.label}
                      </span>
                      <span className={`text-[10px] font-mono shrink-0 ${color}`}>
                        {deltaSign}{m.deltaPct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="text-[9px] text-muted-foreground font-mono pl-4">
                      {m.current?.toFixed(digits) ?? "?"} → {m.projected?.toFixed(digits) ?? "?"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Performance impacts */}
        {active.performanceImpacts.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {active.performanceImpacts
              .filter((p) => p.improvementPct > 0)
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

        {/* Alternative scenarios (only if no selector or single projection) */}
        {!onSelectLever && alternatives.length > 0 && (
          <div className="pt-1.5 border-t border-border/40">
            <p className="text-[9px] text-muted-foreground mb-1">Alternatives :</p>
            <div className="flex flex-wrap gap-1">
              {alternatives.map((s) => (
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
