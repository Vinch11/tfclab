/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL Cycle Intelligence Engine™ — Carte UI
 * Affiche l'analyse d'évolution physiologique entre deux snapshots
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  ChevronDown,
  ChevronUp,
  Target,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ArrowRight,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeCycleIntelligence,
  snapshotToEngineData,
  canComputeCycleIntelligence,
  getAdaptationScoreColor,
  getAdaptationScoreBgColor,
  type CycleIntelligenceResult,
  type MetricAnalysis,
  type MetricEvolution,
  type SnapshotData,
} from "@/lib/v2/cycleIntelligence";

interface CycleIntelligenceCardProps {
  snapshots: Array<Record<string, unknown>>;
  currentSnapshotId?: string | null;
  previousLimiterId?: string | null;
  previousLimiterLabel?: string | null;
  objectif: string;
  staffMode?: boolean;
  className?: string;
  compact?: boolean;
}

function EvolutionIcon({ evolution, className }: { evolution: MetricEvolution; className?: string }) {
  switch (evolution) {
    case "positive":
      return <TrendingUp className={cn("h-4 w-4 text-emerald-600", className)} />;
    case "negative":
      return <TrendingDown className={cn("h-4 w-4 text-red-600", className)} />;
    default:
      return <Minus className={cn("h-4 w-4 text-muted-foreground", className)} />;
  }
}

function EvolutionBadge({ evolution }: { evolution: MetricEvolution }) {
  const config = {
    positive: { label: "Progression", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
    negative: { label: "Régression", className: "bg-red-500/10 text-red-700 border-red-500/30" },
    neutral: { label: "Stable", className: "bg-muted text-muted-foreground border-border" },
  }[evolution];

  return (
    <Badge variant="outline" className={cn("text-xs", config.className)}>
      {config.label}
    </Badge>
  );
}

function MetricRow({ metric }: { metric: MetricAnalysis }) {
  if (!metric.available) return null;

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <EvolutionIcon evolution={metric.evolution} />
        <span className="text-sm font-medium truncate">{metric.label}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <span className="text-xs text-muted-foreground">
            {metric.previousValue?.toFixed(metric.id === "vlamax" ? 2 : 1)}
          </span>
          <ArrowRight className="inline h-3 w-3 mx-1 text-muted-foreground" />
          <span className={cn(
            "text-sm font-mono font-medium",
            metric.evolution === "positive" && "text-emerald-600",
            metric.evolution === "negative" && "text-red-600",
          )}>
            {metric.currentValue?.toFixed(metric.id === "vlamax" ? 2 : 1)}
          </span>
        </div>
        <EvolutionBadge evolution={metric.evolution} />
      </div>
    </div>
  );
}

export function CycleIntelligenceCard({
  snapshots: rawSnapshots,
  currentSnapshotId,
  previousLimiterId,
  previousLimiterLabel,
  objectif,
  staffMode = false,
  className,
  compact = false,
}: CycleIntelligenceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedSnapA, setSelectedSnapA] = useState<string>("");
  const [selectedSnapB, setSelectedSnapB] = useState<string>("");

  // Sort snapshots by date desc
  const sortedSnapshots = useMemo(() => {
    return [...rawSnapshots]
      .filter(s => s.date && s.id)
      .sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime());
  }, [rawSnapshots]);

  // Convert to engine data
  const engineSnapshots = useMemo(() => 
    sortedSnapshots.map(s => snapshotToEngineData(s)),
  [sortedSnapshots]);

  // Default: compare current (active or latest) vs previous
  const defaultResult = useMemo<CycleIntelligenceResult | null>(() => {
    if (!canComputeCycleIntelligence(engineSnapshots)) return null;
    
    let currentIdx = 0;
    if (currentSnapshotId) {
      const idx = engineSnapshots.findIndex(s => s.id === currentSnapshotId);
      if (idx >= 0) currentIdx = idx;
    }
    
    const previousIdx = currentIdx + 1;
    if (previousIdx >= engineSnapshots.length) return null;

    return computeCycleIntelligence({
      previousSnapshot: engineSnapshots[previousIdx],
      currentSnapshot: engineSnapshots[currentIdx],
      previousLimiterId,
      previousLimiterLabel,
      objectif,
    });
  }, [engineSnapshots, currentSnapshotId, previousLimiterId, previousLimiterLabel, objectif]);

  // Custom comparison result
  const compareResult = useMemo<CycleIntelligenceResult | null>(() => {
    if (!compareMode || !selectedSnapA || !selectedSnapB) return null;
    const snapA = engineSnapshots.find(s => s.id === selectedSnapA);
    const snapB = engineSnapshots.find(s => s.id === selectedSnapB);
    if (!snapA || !snapB) return null;

    // A = older, B = newer
    const [older, newer] = new Date(snapA.date) < new Date(snapB.date) 
      ? [snapA, snapB] : [snapB, snapA];

    return computeCycleIntelligence({
      previousSnapshot: older,
      currentSnapshot: newer,
      previousLimiterId,
      previousLimiterLabel,
      objectif,
    });
  }, [compareMode, selectedSnapA, selectedSnapB, engineSnapshots, previousLimiterId, previousLimiterLabel, objectif]);

  const result = compareMode ? compareResult : defaultResult;

  // Not enough data
  if (engineSnapshots.length < 2) {
    return (
      <Card className={cn("overflow-hidden opacity-60", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Cycle Intelligence™
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Au moins 2 snapshots nécessaires pour analyser l'évolution d'un cycle d'entraînement.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Cycle Intelligence™
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sélectionnez deux snapshots pour comparer.
          </p>
        </CardContent>
      </Card>
    );
  }

  const availableMetrics = result.metrics.filter(m => m.available);
  const positiveCount = availableMetrics.filter(m => m.evolution === "positive").length;
  const negativeCount = availableMetrics.filter(m => m.evolution === "negative").length;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Cycle Intelligence™
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant={compareMode ? "default" : "outline"}
              size="sm"
              onClick={() => setCompareMode(!compareMode)}
              className="text-xs h-7 gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Comparer
            </Button>
          </div>
        </div>
        {!compareMode && (
          <p className="text-xs text-muted-foreground mt-1">
            Bloc de {result.daysBetween} jours • {new Date(result.previousSnapshotDate).toLocaleDateString("fr-FR")} → {new Date(result.currentSnapshotDate).toLocaleDateString("fr-FR")}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Compare Mode Selectors */}
        {compareMode && (
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedSnapA} onValueChange={setSelectedSnapA}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Snapshot A" />
              </SelectTrigger>
              <SelectContent>
                {sortedSnapshots.map(s => (
                  <SelectItem key={s.id as string} value={s.id as string}>
                    {new Date(s.date as string).toLocaleDateString("fr-FR")}
                    {s.source ? ` (${s.source})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ArrowRight className="h-4 w-4 self-center text-muted-foreground shrink-0" />
            <Select value={selectedSnapB} onValueChange={setSelectedSnapB}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Snapshot B" />
              </SelectTrigger>
              <SelectContent>
                {sortedSnapshots.map(s => (
                  <SelectItem key={s.id as string} value={s.id as string}>
                    {new Date(s.date as string).toLocaleDateString("fr-FR")}
                    {s.source ? ` (${s.source})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Score & Verdict */}
        <div className={cn("rounded-lg border p-4", getAdaptationScoreBgColor(result.adaptationScore))}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-2xl font-bold font-mono">
                {result.adaptationScore}
              </span>
              <span className="text-sm text-muted-foreground ml-1">/100</span>
            </div>
            <Badge variant="outline" className={cn(
              "text-sm font-medium",
              getAdaptationScoreBgColor(result.adaptationScore),
            )}>
              {result.verdictEmoji} {result.verdictLabel}
            </Badge>
          </div>
          <Progress
            value={result.adaptationScore}
            className="h-2"
          />
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-600" />
              {positiveCount} progression{positiveCount > 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-red-600" />
              {negativeCount} régression{negativeCount > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Summary */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm">{result.summary}</p>
        </div>

        {/* Metrics Chart (compact radar-like) */}
        {!compact && (
          <>
            <div className="space-y-0 divide-y divide-border">
              {availableMetrics.map(metric => (
                <MetricRow key={metric.id} metric={metric} />
              ))}
            </div>
          </>
        )}

        {/* Expand for details */}
        {(compact || !expanded) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="w-full text-xs gap-1 text-muted-foreground"
          >
            {expanded ? (
              <><ChevronUp className="h-3 w-3" /> Réduire</>
            ) : (
              <><ChevronDown className="h-3 w-3" /> {compact ? "Voir les métriques" : "Analyse détaillée"}</>
            )}
          </Button>
        )}

        {expanded && (
          <>
            {/* Compact mode: show metrics */}
            {compact && (
              <div className="space-y-0 divide-y divide-border">
                {availableMetrics.map(metric => (
                  <MetricRow key={metric.id} metric={metric} />
                ))}
              </div>
            )}

            <Separator />

            {/* Limiter Analysis */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-1.5">
                <Target className="h-4 w-4 text-primary" />
                Analyse du Limiteur
              </h4>
              <div className={cn(
                "p-3 rounded-lg border text-sm",
                result.limiterAnalysis.limiterVerdict === "effective" && "bg-emerald-500/5 border-emerald-500/20",
                result.limiterAnalysis.limiterVerdict === "ineffective" && "bg-red-500/5 border-red-500/20",
                result.limiterAnalysis.limiterVerdict === "partial" && "bg-amber-500/5 border-amber-500/20",
                result.limiterAnalysis.limiterVerdict === "unknown" && "bg-muted/50 border-border",
              )}>
                {result.limiterAnalysis.limiterVerdict === "effective" && <CheckCircle2 className="inline h-4 w-4 text-emerald-600 mr-1.5" />}
                {result.limiterAnalysis.limiterVerdict === "ineffective" && <AlertTriangle className="inline h-4 w-4 text-red-600 mr-1.5" />}
                {result.limiterAnalysis.explanation}
              </div>
            </div>

            <Separator />

            {/* Recommendation */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-1.5">
                <Brain className="h-4 w-4 text-primary" />
                Recommandation
              </h4>
              <div className={cn(
                "p-3 rounded-lg border text-sm",
                result.recommendation === "continue" && "bg-emerald-500/5 border-emerald-500/20",
                result.recommendation === "change_lever" && "bg-red-500/5 border-red-500/20",
                result.recommendation === "adapt" && "bg-amber-500/5 border-amber-500/20",
              )}>
                <p className="font-medium mb-1">{result.recommendationLabel}</p>
                <p className="text-muted-foreground">{result.recommendationDetail}</p>
              </div>
            </div>

            {/* Staff Note */}
            {staffMode && (
              <>
                <Separator />
                <div className="p-3 rounded-lg bg-muted/30 border border-dashed border-border">
                  <p className="text-xs text-muted-foreground font-mono">{result.staffNote}</p>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
