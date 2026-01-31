/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PACING ENVELOPE RUN CARD — Carte complète avec zones, règles et scénarios
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Clock,
  Activity,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PacingEnvelopeRunChart } from "@/components/charts/PacingEnvelopeRunChart";
import {
  type PacingEnvelopeRunResult,
  type PacingScenarioRun,
  formatPace,
  PACING_ZONE_COLORS,
} from "@/lib/v2/pacingEnvelopeRunning";

interface PacingEnvelopeRunCardProps {
  result: PacingEnvelopeRunResult | null;
  isStaffMode?: boolean;
  className?: string;
}

function ScenarioCard({ scenario, thresholdPace }: { scenario: PacingScenarioRun; thresholdPace: number | null }) {
  const isRecommended = scenario.type === "DISCIPLINED";
  const isAggressive = scenario.type === "AGGRESSIVE";
  
  return (
    <div
      className={cn(
        "p-3 rounded-lg border",
        isRecommended && "border-success bg-success/5",
        scenario.type === "OPTIMISTIC" && "border-warning bg-warning/5",
        isAggressive && "border-destructive bg-destructive/5"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isRecommended && <CheckCircle2 className="w-4 h-4 text-success" />}
          {scenario.type === "OPTIMISTIC" && <AlertTriangle className="w-4 h-4 text-warning" />}
          {isAggressive && <XCircle className="w-4 h-4 text-destructive" />}
          <span className="font-medium text-sm">{scenario.label}</span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "text-xs",
            scenario.estimated_success_rate >= 80 && "border-success text-success",
            scenario.estimated_success_rate >= 50 && scenario.estimated_success_rate < 80 && "border-warning text-warning",
            scenario.estimated_success_rate < 50 && "border-destructive text-destructive"
          )}
        >
          {scenario.estimated_success_rate}% succès
        </Badge>
      </div>
      
      <p className="text-xs text-muted-foreground mb-2">{scenario.description}</p>
      
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-muted/50 rounded p-1.5 text-center">
          <span className="text-muted-foreground block">1er tiers</span>
          <span className="font-mono font-medium">{scenario.pacing_profile.first_third_pct}%</span>
        </div>
        <div className="bg-muted/50 rounded p-1.5 text-center">
          <span className="text-muted-foreground block">Milieu</span>
          <span className="font-mono font-medium">{scenario.pacing_profile.middle_third_pct}%</span>
        </div>
        <div className="bg-muted/50 rounded p-1.5 text-center">
          <span className="text-muted-foreground block">Final</span>
          <span className="font-mono font-medium">{scenario.pacing_profile.last_third_pct}%</span>
        </div>
      </div>
      
      {scenario.risk_warning && (
        <p className="text-xs text-destructive mt-2 italic">
          {scenario.risk_warning}
        </p>
      )}
    </div>
  );
}

export function PacingEnvelopeRunCard({
  result,
  isStaffMode = false,
  className,
}: PacingEnvelopeRunCardProps) {
  const [showAllScenarios, setShowAllScenarios] = useState(false);

  if (!result) {
    return (
      <Card className={cn("opacity-60", className)}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4" />
            Pacing Envelope™ CAP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
            Données insuffisantes pour générer l'enveloppe de pacing
          </div>
        </CardContent>
      </Card>
    );
  }

  const greenZone = result.zones.find((z) => z.zone === "GREEN");

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Pacing Envelope™ — {result.distance}
          </CardTitle>
          <Badge
            variant={result.discipline_required ? "default" : "secondary"}
            className="text-xs"
          >
            {result.discipline_required ? "Discipline requise" : "Pacing libre"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="chart" className="text-xs">Graphique</TabsTrigger>
            <TabsTrigger value="rules" className="text-xs">Règles</TabsTrigger>
            <TabsTrigger value="scenarios" className="text-xs">Scénarios</TabsTrigger>
          </TabsList>

          <TabsContent value="chart" className="mt-3">
            <PacingEnvelopeRunChart
              result={result}
              showAllScenarios={showAllScenarios}
              compact
            />
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs"
              onClick={() => setShowAllScenarios(!showAllScenarios)}
            >
              {showAllScenarios ? "Masquer les alternatives" : "Afficher tous les scénarios"}
            </Button>
          </TabsContent>

          <TabsContent value="rules" className="mt-3 space-y-3">
            {/* Zone verte info */}
            {greenZone && (
              <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: PACING_ZONE_COLORS.GREEN }} />
                  <span className="font-medium text-sm">Zone Verte — Sustainable</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Intensité : {greenZone.rangePctThreshold[0]}–{greenZone.rangePctThreshold[1]}% du seuil
                </p>
                {greenZone.rangeSecPerKm && (
                  <p className="text-xs font-mono mt-1">
                    Allure : {formatPace(greenZone.rangeSecPerKm[0])} – {formatPace(greenZone.rangeSecPerKm[1])}
                  </p>
                )}
              </div>
            )}

            {/* Règles par tiers */}
            <div className="space-y-2">
              <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg">
                <Badge variant="outline" className="text-xs shrink-0">1er tiers</Badge>
                <p className="text-xs">{result.rules.first_third.rule}</p>
              </div>
              <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg">
                <Badge variant="outline" className="text-xs shrink-0">Milieu</Badge>
                <p className="text-xs">{result.rules.middle_third.rule}</p>
              </div>
              <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg">
                <Badge variant="outline" className="text-xs shrink-0">Final</Badge>
                <p className="text-xs">{result.rules.last_third.rule}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scenarios" className="mt-3 space-y-3">
            {result.scenarios.map((scenario) => (
              <ScenarioCard
                key={scenario.type}
                scenario={scenario}
                thresholdPace={result.threshold_pace_sec_km}
              />
            ))}
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center italic">
          {result.disclaimer}
        </p>

        {/* Mode staff: méthodologie */}
        {isStaffMode && (
          <div className="bg-muted/30 rounded-lg p-3 text-xs">
            <p className="font-medium mb-1">Méthodologie</p>
            <p className="text-muted-foreground whitespace-pre-line">{result.methodology}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {result.sources_used.map((s) => (
                <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
