/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ROADMAP STRATÉGIQUE — Dashboard Component
 * Two For Coaching Lab™
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Target, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeStrategicRoadmap, type StrategicRoadmap, type RoadmapPhase } from "@/engines/decision";
import type { UnifiedLimiterResult } from "@/engines/diagnostic";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface RoadmapStrategiqueProps {
  objectif: string | null;
  limiterResult: UnifiedLimiterResult | null;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE BAR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function PhaseBar({ phase, totalWeeks }: { phase: RoadmapPhase; totalWeeks: number }) {
  const leftPct = ((phase.startWeek - 1) / totalWeeks) * 100;
  const widthPct = ((phase.endWeek - phase.startWeek + 1) / totalWeeks) * 100;
  const isDark = phase.color === "#1e3a5f";
  const isGreen = phase.color === "#86efac";

  return (
    <div className="relative mb-1">
      <div
        className="relative rounded-md transition-all"
        style={{
          marginLeft: `${leftPct}%`,
          width: `${widthPct}%`,
          backgroundColor: phase.color,
          minHeight: "36px",
        }}
      >
        <div className="flex items-center justify-center h-9 px-2">
          <span
            className="text-[10px] sm:text-xs font-semibold truncate"
            style={{ color: isDark ? "#ffffff" : isGreen ? "#1e3a5f" : "#1e293b" }}
          >
            {phase.subtitle}
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE DETAIL CARD
// ═══════════════════════════════════════════════════════════════════════════════

function PhaseDetail({ phase }: { phase: RoadmapPhase }) {
  return (
    <div className="p-3 rounded-lg border border-border bg-secondary/20 space-y-2">
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-sm shrink-0"
          style={{ backgroundColor: phase.color }}
        />
        <span className="font-semibold text-sm">{phase.name}</span>
        <Badge variant="outline" className="text-[10px] h-5">
          S{phase.startWeek}–S{phase.endWeek}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">{phase.focus}</p>
      {phase.levers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {phase.levers.map((lever, i) => (
            <Badge key={i} variant="secondary" className="text-[10px] h-5">
              {lever}
            </Badge>
          ))}
        </div>
      )}
      {phase.targets.length > 0 && (
        <div className="space-y-0.5">
          {phase.targets.map((target, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Target className="w-3 h-3 text-primary shrink-0" />
              <span>{target}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function RoadmapStrategique({
  objectif,
  limiterResult,
  className,
}: RoadmapStrategiqueProps) {
  const [isOpen, setIsOpen] = useState(true);

  const roadmap = useMemo(
    () => computeStrategicRoadmap({ objectif, limiterResult }),
    [objectif, limiterResult],
  );

  // Week markers
  const weekMarkers = useMemo(() => {
    const step = roadmap.totalWeeks <= 12 ? 1 : 2;
    const markers: number[] = [];
    for (let w = 1; w <= roadmap.totalWeeks; w += step) markers.push(w);
    return markers;
  }, [roadmap.totalWeeks]);

  return (
    <Card className={cn("border-primary/20", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger className="w-full text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">📋</span>
                <CardTitle className="text-base">Roadmap Stratégique</CardTitle>
                {roadmap.personalized && (
                  <Badge variant="default" className="text-[10px] h-5">
                    Personnalisée
                  </Badge>
                )}
              </div>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            {!isOpen && (
              <p className="text-xs text-muted-foreground mt-1">
                {roadmap.totalWeeks} semaines — {roadmap.phases.length} phases
                {roadmap.personalized ? " — adaptée au profil" : ""}
              </p>
            )}
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Limiter summary */}
            {roadmap.personalized && (
              <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-primary font-medium">
                  {roadmap.limiterSummary}
                </p>
              </div>
            )}

            {/* Gantt chart */}
            <div className="space-y-1">
              {/* Phase labels above bars */}
              {roadmap.phases.map((phase) => {
                const leftPct = ((phase.startWeek - 1) / roadmap.totalWeeks) * 100;
                const widthPct = ((phase.endWeek - phase.startWeek + 1) / roadmap.totalWeeks) * 100;
                return (
                  <div key={`label-${phase.id}`} className="relative h-5">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute text-[10px] font-semibold text-foreground truncate cursor-help"
                            style={{
                              left: `${leftPct}%`,
                              width: `${widthPct}%`,
                              textAlign: "center",
                            }}
                          >
                            {phase.name}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="font-semibold text-xs">{phase.name}</p>
                          <p className="text-xs text-muted-foreground">{phase.focus}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                );
              })}

              {/* Bars */}
              {roadmap.phases.map((phase) => (
                <PhaseBar key={phase.id} phase={phase} totalWeeks={roadmap.totalWeeks} />
              ))}

              {/* Week axis */}
              <div className="relative h-5 mt-1">
                {weekMarkers.map((w) => {
                  const leftPct = ((w - 0.5) / roadmap.totalWeeks) * 100;
                  return (
                    <span
                      key={w}
                      className="absolute text-[9px] text-muted-foreground"
                      style={{ left: `${leftPct}%`, transform: "translateX(-50%)" }}
                    >
                      S{w}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Phase details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {roadmap.phases.map((phase) => (
                <PhaseDetail key={phase.id} phase={phase} />
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
