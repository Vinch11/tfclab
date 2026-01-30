/**
 * CONFORMITY PANEL — Compliance to pacing envelope
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ConformityAnalysis } from "@/lib/v2/liveDecisionEngine";
import type { PacingEnvelopeResult } from "@/lib/v2/pacingEnvelopeEngine";

interface ConformityPanelProps {
  conformity: ConformityAnalysis;
  envelope: PacingEnvelopeResult;
  elapsedPct: number;
}

export function ConformityPanel({ conformity, envelope, elapsedPct }: ConformityPanelProps) {
  const { segments, currentStatus, timeOutsideEnvelopePct, currentIntensityPct, trend } = conformity;

  const TrendIcon = trend === "rising" ? TrendingUp : trend === "falling" ? TrendingDown : Minus;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Conformité au plan
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">
        {/* Current status indicator */}
        <div className={cn(
          "p-4 rounded-lg text-center",
          currentStatus === "green" && "bg-green-100 dark:bg-green-900/30",
          currentStatus === "orange" && "bg-orange-100 dark:bg-orange-900/30",
          currentStatus === "red" && "bg-red-100 dark:bg-red-900/30"
        )}>
          <div className="flex items-center justify-center gap-2">
            <div className={cn(
              "w-4 h-4 rounded-full",
              currentStatus === "green" && "bg-green-500",
              currentStatus === "orange" && "bg-orange-500",
              currentStatus === "red" && "bg-red-500"
            )} />
            <span className="text-2xl font-bold font-mono">
              {currentIntensityPct}%
            </span>
            <TrendIcon className={cn(
              "h-5 w-5",
              trend === "rising" && "text-orange-500",
              trend === "falling" && "text-blue-500",
              trend === "stable" && "text-muted-foreground"
            )} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Intensité actuelle (vs cible)
          </p>
        </div>

        {/* Zone reference */}
        <div className="flex gap-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded" />
            {envelope.boundary.lowPct}-{envelope.boundary.highPct}%
          </span>
          <span className="flex items-center gap-1 ml-2">
            <div className="w-2 h-2 bg-orange-500 rounded" />
            →{envelope.boundary.toleratedPct}%
          </span>
          <span className="flex items-center gap-1 ml-2">
            <div className="w-2 h-2 bg-red-500 rounded" />
            &gt;{envelope.boundary.toleratedPct}%
          </span>
        </div>

        {/* Timeline visualization */}
        <div className="flex-1 flex flex-col">
          <p className="text-xs text-muted-foreground mb-2">Timeline par segment (5min)</p>
          <div className="flex-1 flex gap-1 items-end">
            {segments.length === 0 ? (
              <div className="flex-1 bg-muted/50 rounded flex items-center justify-center text-xs text-muted-foreground">
                En attente de données...
              </div>
            ) : (
              segments.map((seg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex-1 rounded-t transition-all min-h-[20px]",
                    seg.status === "green" && "bg-green-500",
                    seg.status === "orange" && "bg-orange-500",
                    seg.status === "red" && "bg-red-500"
                  )}
                  style={{
                    height: `${Math.min(100, Math.max(20, (seg.averageIntensityPct - 60) * 2))}%`,
                  }}
                  title={`Segment ${i + 1}: ${seg.averageIntensityPct}%`}
                />
              ))
            )}
          </div>
          
          {/* Progress bar */}
          <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
            <div 
              className="h-full bg-primary transition-all"
              style={{ width: `${elapsedPct}%` }}
            />
          </div>
        </div>

        {/* Key metric */}
        <div className={cn(
          "p-3 rounded-lg text-center",
          timeOutsideEnvelopePct > 20 ? "bg-red-100 dark:bg-red-900/30" :
          timeOutsideEnvelopePct > 10 ? "bg-orange-100 dark:bg-orange-900/30" :
          "bg-muted/50"
        )}>
          <p className="text-xs text-muted-foreground">Temps hors enveloppe</p>
          <p className={cn(
            "text-xl font-bold font-mono",
            timeOutsideEnvelopePct > 20 && "text-red-600 dark:text-red-400",
            timeOutsideEnvelopePct > 10 && timeOutsideEnvelopePct <= 20 && "text-orange-600 dark:text-orange-400"
          )}>
            {timeOutsideEnvelopePct}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
