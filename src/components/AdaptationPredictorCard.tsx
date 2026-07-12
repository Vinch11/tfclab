/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL Adaptation Predictor™ — UI Card
 * Simulation prédictive des adaptations physiologiques par levier
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Trophy,
  ArrowRight,
  Lightbulb,
  BarChart3,
  Target,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeAdaptationPrediction,
  getImpactScoreColor,
  getImpactScoreBgColor,
  TRAINING_LEVERS,
  type AdaptationPredictorResult,
  type AdaptationScenario,
  type MetricDelta,
  type TrainingLeverId,
} from "@/lib/v2/adaptationPredictor";

interface AdaptationPredictorCardProps {
  snapshot: Record<string, unknown>;
  limiterId: string | null;
  limiterLabel: string | null;
  objectif: string;
  /** Sport principal (run/bike/tri/trail). Sert à choisir le profil de
   *  pondération performance — Audit P0 B3. */
  sportMain?: string | null;
  /** Durée du plan (semaines). Module l'amplitude des deltas projetés
   *  — Audit P0 B2. Défaut 6 semaines (référence). */
  weeksAvailable?: number;
  /** Leviers réellement activés par computeLorangStrategy — restreint la
   *  simulation aux stratégies effectivement prescrites (propagation Lorang
   *  → Predictor). Si vide/omis, simule tout le catalogue (fallback). */
  selectedLeverIds?: TrainingLeverId[];
  staffMode?: boolean;
  className?: string;
}


function DeltaArrow({ direction, significance }: { direction: string; significance: string }) {
  if (significance === "none" || direction === "stable") {
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  }
  if (direction === "up") {
    return <TrendingUp className={cn(
      "h-3.5 w-3.5",
      significance === "major" ? "text-emerald-600" : significance === "moderate" ? "text-emerald-500" : "text-emerald-400"
    )} />;
  }
  return <TrendingDown className={cn(
    "h-3.5 w-3.5",
    significance === "major" ? "text-red-600" : significance === "moderate" ? "text-red-500" : "text-red-400"
  )} />;
}

function MetricProjectionRow({ metric, higherIsBetter }: { metric: MetricDelta; higherIsBetter: boolean }) {
  if (!metric.available) return null;

  // For VLamax, decrease is good
  const isPositiveChange = higherIsBetter
    ? metric.deltaMidPct > 0
    : metric.deltaMidPct < 0;

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <DeltaArrow direction={metric.direction} significance={metric.significance} />
        <span className="text-sm truncate">{metric.label}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground font-mono">
          {metric.current?.toFixed(metric.id === "vlamax" ? 2 : 1)}
        </span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className={cn(
          "text-sm font-mono font-medium",
          isPositiveChange ? "text-emerald-600" : metric.significance === "none" ? "text-muted-foreground" : "text-red-500",
        )}>
          {metric.projected?.toFixed(metric.id === "vlamax" ? 2 : 1)}
        </span>
        <div className="flex flex-col items-end">
          <Badge variant="outline" className={cn(
            "text-[10px] px-1.5 font-mono",
            isPositiveChange
              ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
              : metric.significance === "none"
                ? "bg-muted text-muted-foreground"
                : "bg-red-500/10 text-red-700 border-red-500/30",
          )}>
            {metric.deltaMidPct > 0 ? "+" : ""}{metric.deltaMidPct.toFixed(1)}%
          </Badge>
          {/* Audit P0 — affichage fourchette physiologique */}
          {(metric.deltaMin !== metric.deltaMax) && (
            <span className="text-[9px] text-muted-foreground font-mono mt-0.5">
              [{metric.deltaMin > 0 ? "+" : ""}{metric.deltaMin}% → {metric.deltaMax > 0 ? "+" : ""}{metric.deltaMax}%]
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ScenarioPanel({ scenario, isBest }: { scenario: AdaptationScenario; isBest: boolean }) {
  const [showPerf, setShowPerf] = useState(false);
  const availableMetrics = scenario.metrics.filter(m => m.available);

  const higherIsBetterMap: Record<string, boolean> = {
    vo2max: true, vlamax: false, fatmax: true, lt2: true, tte: true, durability: true, economy: true,
  };

  return (
    <div className="space-y-3">
      {/* Impact Score */}
      <div className={cn("rounded-lg border p-3", getImpactScoreBgColor(scenario.overallImpactScore))}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            {isBest && <Star className="h-4 w-4 text-amber-500 fill-amber-500" />}
            <span className="text-xl font-bold font-mono">{scenario.overallImpactScore}</span>
            <span className="text-xs text-muted-foreground">/100</span>
          </div>
          <Badge variant="outline" className={cn("text-xs", getImpactScoreBgColor(scenario.overallImpactScore))}>
            {scenario.impactLabel}
          </Badge>
        </div>
        <Progress value={scenario.overallImpactScore} className="h-1.5" />
      </div>

      {/* Metrics */}
      <div className="space-y-0 divide-y divide-border">
        {availableMetrics.map(m => (
          <MetricProjectionRow key={m.id} metric={m} higherIsBetter={higherIsBetterMap[m.id] ?? true} />
        ))}
      </div>

      {/* Performance predictions toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowPerf(!showPerf)}
        className="w-full text-xs gap-1 text-muted-foreground"
      >
        {showPerf ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        {showPerf ? "Masquer" : "Impact performance"}
      </Button>

      {showPerf && (
        <div className="space-y-2">
          {scenario.performancePredictions.map(p => (
            <div key={p.distance} className="flex items-center justify-between text-sm p-2 rounded bg-muted/30">
              <span className="flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-primary" />
                {p.distance}
              </span>
              <span className={cn(
                "font-mono font-medium text-xs",
                p.improvementPct > 1 ? "text-emerald-600" : p.improvementPct > 0 ? "text-blue-600" : "text-red-500",
              )}>
                {p.improvementPct > 0 ? "+" : ""}{p.improvementPct}%
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recommendation */}
      <div className="p-2.5 rounded-lg bg-muted/40 text-xs text-muted-foreground">
        {scenario.recommendation}
      </div>
    </div>
  );
}

export function AdaptationPredictorCard({
  snapshot,
  limiterId,
  limiterLabel,
  objectif,
  sportMain,
  weeksAvailable,
  staffMode = false,
  className,
}: AdaptationPredictorCardProps) {
  const [expanded, setExpanded] = useState(false);

  const result = useMemo<AdaptationPredictorResult>(() => {
    return computeAdaptationPrediction({
      snapshot,
      limiterId,
      limiterLabel,
      objectif,
      sportMain,
      weeksAvailable,
    });
  }, [snapshot, limiterId, limiterLabel, objectif, sportMain, weeksAvailable]);

  const hasData = result.currentState.vo2max !== null || result.currentState.vlamax !== null || result.currentState.ftp !== null;

  if (!hasData) {
    return (
      <Card className={cn("overflow-hidden opacity-60", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Adaptation Predictor™
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Données physiologiques insuffisantes. Ajoutez un snapshot avec VO₂max, VLamax ou FTP.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort scenarios: best first
  const sortedScenarios = [...result.scenarios].sort((a, b) => {
    if (a.lever.id === result.bestScenarioId) return -1;
    if (b.lever.id === result.bestScenarioId) return 1;
    return b.overallImpactScore - a.overallImpactScore;
  });

  const bestScenario = sortedScenarios[0];
  const horizonLabel = weeksAvailable && weeksAvailable > 0
    ? `Projection sur ${weeksAvailable} semaine${weeksAvailable > 1 ? "s" : ""} (référence 6 sem.)`
    : "Projection sur un bloc de référence de 6 semaines";

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Adaptation Predictor™
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          {horizonLabel} — estimations modèle (fourchettes physiologiques typiques, non garanties).
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Best recommendation */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium mb-0.5">Meilleur levier recommandé</p>
            <p className="text-muted-foreground text-xs">{result.bestScenarioReason}</p>
          </div>
        </div>

        {/* Compact view: just best scenario */}
        {!expanded && (
          <>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{bestScenario.lever.emoji}</span>
              <span className="font-medium text-sm">{bestScenario.lever.label}</span>
              <Badge variant="outline" className="text-[10px] ml-auto">
                Recommandé
              </Badge>
            </div>
            <ScenarioPanel scenario={bestScenario} isBest={true} />
          </>
        )}

        {/* Expand to see all scenarios */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="w-full text-xs gap-1 text-muted-foreground"
        >
          {expanded ? (
            <><ChevronUp className="h-3 w-3" /> Vue compacte</>
          ) : (
            <><BarChart3 className="h-3 w-3" /> Comparer tous les scénarios</>
          )}
        </Button>

        {/* All scenarios in tabs */}
        {expanded && (
          <Tabs defaultValue={result.bestScenarioId} className="w-full">
            <TabsList className="w-full h-auto flex-wrap gap-1 bg-muted/50 p-1">
              {sortedScenarios.map(s => (
                <TabsTrigger
                  key={s.lever.id}
                  value={s.lever.id}
                  className="text-xs px-2 py-1.5 gap-1 data-[state=active]:shadow-sm"
                >
                  <span>{s.lever.emoji}</span>
                  <span className="hidden sm:inline">{s.lever.label}</span>
                  <span className="sm:hidden">{s.lever.label.split(" ")[0]}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            {sortedScenarios.map(s => (
              <TabsContent key={s.lever.id} value={s.lever.id} className="mt-3">
                <div className="mb-2">
                  <p className="text-xs text-muted-foreground">{s.lever.description}</p>
                </div>
                <ScenarioPanel scenario={s} isBest={s.lever.id === result.bestScenarioId} />
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* Staff mode extras */}
        {staffMode && expanded && (
          <>
            <Separator />
            <div className="p-3 rounded-lg bg-muted/30 border border-dashed text-xs font-mono text-muted-foreground space-y-1">
              <p>Limiteur: {result.limiterLabel ?? "—"} ({result.limiterId ?? "—"})</p>
              <p>Objectif: {result.objectif}</p>
              <p>Best lever: {result.bestScenarioId} (score: {bestScenario.overallImpactScore}/100)</p>
              <p>Métriques disponibles: {bestScenario.metrics.filter(m => m.available).length}/{bestScenario.metrics.length}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
