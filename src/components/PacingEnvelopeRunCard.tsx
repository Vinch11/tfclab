/**
 * PACING ENVELOPE RUN CARD — Zones, règles, scénarios + Simulation nutrition/glycogène
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Target, AlertTriangle, CheckCircle2, XCircle, Droplets, Zap, ArrowDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PacingEnvelopeRunChart } from "@/components/charts/PacingEnvelopeRunChart";
import {
  type PacingEnvelopeRunResult, type PacingScenarioRun, formatPace, PACING_ZONE_COLORS,
} from "@/lib/v2/pacingEnvelopeRunning";
import {
  computeRaceSimulation, type SimulationResult, type NutritionCue, formatPaceSecKm,
} from "@/lib/v2/raceSimulationTFCL";
import type { ReadinessState } from "@/lib/v2/potentielTypes";
import {
  PacingConceptCard,
  PacingWhyBox,
  PacingRacePlanBox,
  PacingVisualBar,
  buildDriversFromEnvelope,
  type RacePhase,
} from "@/components/pacing/PacingPedagogy";

// Format sec/km → "4'12/km"
function fmtPace(sec: number | null | undefined): string | null {
  if (!sec || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}'${s.toString().padStart(2, "0")}/km`;
}

function buildRunPhases(result: PacingEnvelopeRunResult): [RacePhase, RacePhase, RacePhase] {
  const th = result.threshold_pace_sec_km;
  const gLow = result.boundary_pct_threshold.lowPct;
  const gHigh = result.boundary_pct_threshold.highPct;
  const paceAt = (pct: number) => (th ? fmtPace(Math.round(th * (100 / pct))) : null);
  const mid = Math.round((gLow + gHigh) / 2);
  return [
    {
      label: "Départ",
      window: `0 → 33% (${result.distance})`,
      targetPct: `${gLow}–${mid}% seuil`,
      targetPace: paceAt(mid) ?? paceAt(gLow),
      do: result.rules.first_third?.rule ?? "Rester conservateur, laisser filer les rapides.",
      dont: "Suivre le peloton qui explose devant.",
    },
    {
      label: "Milieu",
      window: "33 → 66%",
      targetPct: `${mid}–${gHigh}% seuil`,
      targetPace: paceAt(gHigh),
      do: result.rules.middle_third?.rule ?? "Installer la cible, verrouiller la mécanique.",
      dont: "Attaquer une côte comme si c'était le finish.",
    },
    {
      label: "Finish",
      window: "66 → 100%",
      targetPct: `${gHigh}% seuil et +`,
      targetPace: paceAt(gHigh + 3),
      do: result.rules.last_third?.rule ?? "Si tu as tenu la discipline, monte l'intensité.",
      dont: "Attendre les 500 derniers mètres pour tout donner.",
    },
  ];
}


interface PacingEnvelopeRunCardProps {
  result: PacingEnvelopeRunResult | null;
  isStaffMode?: boolean;
  className?: string;
  simulationInputs?: {
    vlamax_run_v2: number | null;
    vo2max_run: number | null;
    durability_index: number | null;
    fatmax_intensity: number | null;
    race_readiness_state: ReadinessState;
    race_readiness_score: number;
    athlete_weight_kg?: number | null;
  } | null;
}

function ScenarioCard({ scenario, thresholdPace }: { scenario: PacingScenarioRun; thresholdPace: number | null }) {
  const isRecommended = scenario.type === "DISCIPLINED";
  const isAggressive = scenario.type === "AGGRESSIVE";
  return (
    <div className={cn("p-3 rounded-lg border",
      isRecommended && "border-success bg-success/5",
      scenario.type === "OPTIMISTIC" && "border-warning bg-warning/5",
      isAggressive && "border-destructive bg-destructive/5"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isRecommended && <CheckCircle2 className="w-4 h-4 text-success" />}
          {scenario.type === "OPTIMISTIC" && <AlertTriangle className="w-4 h-4 text-warning" />}
          {isAggressive && <XCircle className="w-4 h-4 text-destructive" />}
          <span className="font-medium text-sm">{scenario.label}</span>
        </div>
        <Badge variant="outline" className={cn("text-xs",
          scenario.estimated_success_rate >= 80 && "border-success text-success",
          scenario.estimated_success_rate >= 50 && scenario.estimated_success_rate < 80 && "border-warning text-warning",
          scenario.estimated_success_rate < 50 && "border-destructive text-destructive"
        )}>
          {scenario.estimated_success_rate}% succès
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mb-2">{scenario.description}</p>
      <div className="grid grid-cols-3 gap-2 text-xs">
        {(["first_third_pct", "middle_third_pct", "last_third_pct"] as const).map((key, i) => (
          <div key={key} className="bg-muted/50 rounded p-1.5 text-center">
            <span className="text-muted-foreground block">{["1er tiers", "Milieu", "Final"][i]}</span>
            <span className="font-mono font-medium">{scenario.pacing_profile[key]}%</span>
          </div>
        ))}
      </div>
      {scenario.risk_warning && (
        <p className="text-xs text-destructive mt-2 italic">{scenario.risk_warning}</p>
      )}
    </div>
  );
}

function NutritionCueIcon({ type }: { type: NutritionCue["type"] }) {
  if (type === "gel") return <Zap className="w-3 h-3 text-amber-500" />;
  return <Droplets className={cn("w-3 h-3", type === "iso" ? "text-blue-500" : "text-sky-400")} />;
}

function SimulationTab({ simulation }: { simulation: SimulationResult }) {
  const recommended = simulation.scenarios.find(s => s.type === simulation.recommended_scenario) ?? simulation.scenarios[0];
  const distanceKm = simulation.distance === "MARATHON" ? 42.2 : simulation.distance === "HM" ? 21.1 : 10;

  return (
    <div className="space-y-4">
      {/* Nutrition summary */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <Droplets className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Plan Nutrition</span>
        </div>
        <p className="text-xs text-muted-foreground">{simulation.nutrition_summary.plan_description}</p>
        {simulation.nutrition_summary.total_carbs_g > 0 && (
          <div className="flex gap-3 mt-2 text-xs">
            <Badge variant="secondary" className="text-[10px]">{simulation.nutrition_summary.total_carbs_g}g CHO</Badge>
            <Badge variant="secondary" className="text-[10px]">Max {simulation.nutrition_summary.max_carb_rate_gh}g/h</Badge>
          </div>
        )}
      </div>

      {recommended.negative_split && (
        <div className="flex items-center gap-2 p-2 bg-success/10 rounded-lg border border-success/20">
          <ArrowDownRight className="w-4 h-4 text-success" />
          <span className="text-xs text-success font-medium">{recommended.negative_split_description}</span>
        </div>
      )}

      {/* Glycogen comparison */}
      <div className="space-y-2">
        <p className="text-xs font-medium">Glycogène — {recommended.label}</p>
        <div className="space-y-1">
          {recommended.glycogen_curve.map((point) => {
            const km = Math.round((point.distance_pct / 100) * distanceKm * 10) / 10;
            const cuesAtPoint = recommended.nutrition_cues.filter(
              c => c.distance_pct >= point.distance_pct - 5 && c.distance_pct < point.distance_pct + 5
            );
            const pacing = recommended.pacing_curve.find(p => p.distance_pct === point.distance_pct);
            return (
              <div key={point.distance_pct} className="flex items-center gap-2 text-[11px]">
                <span className="w-10 text-right font-mono text-muted-foreground">{km}km</span>
                <span className="w-14 font-mono text-center">
                  {pacing?.pace_sec_km ? formatPaceSecKm(pacing.pace_sec_km) : "—"}
                </span>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PACING_ZONE_COLORS[point.zone_at_point] }} />
                <div className="flex-1 relative h-3 bg-muted/30 rounded overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-destructive/30 rounded" style={{ width: `${point.glycogen_remaining_pct}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-success/50 rounded" style={{ width: `${point.glycogen_with_nutrition_pct}%` }} />
                </div>
                <span className="w-8 text-right font-mono text-success">{point.glycogen_with_nutrition_pct}%</span>
                <div className="w-16 flex items-center gap-0.5">
                  {cuesAtPoint.length > 0 ? cuesAtPoint.map((cue, i) => (
                    <span key={i} className="flex items-center gap-0.5">
                      <NutritionCueIcon type={cue.type} />
                      <span className="text-[9px] text-muted-foreground">{cue.carbs_g > 0 ? `${cue.carbs_g}g` : ""}</span>
                    </span>
                  )) : <span className="text-muted-foreground/30">—</span>}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 text-[10px] text-muted-foreground mt-2">
          <div className="flex items-center gap-1"><div className="w-3 h-2 bg-success/50 rounded" /><span>Avec nutrition</span></div>
          <div className="flex items-center gap-1"><div className="w-3 h-2 bg-destructive/30 rounded" /><span>Sans nutrition</span></div>
        </div>
      </div>

      {/* Nutrition timeline */}
      {recommended.nutrition_cues.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium">Timeline Nutrition</p>
          <div className="grid grid-cols-2 gap-1.5">
            {recommended.nutrition_cues.map((cue, i) => (
              <div key={i} className="flex items-center gap-1.5 p-1.5 bg-muted/30 rounded text-[11px]">
                <NutritionCueIcon type={cue.type} />
                <span className="font-mono">{cue.km}km</span>
                <span className="text-muted-foreground truncate">{cue.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function PacingEnvelopeRunCard({ result, isStaffMode = false, className, simulationInputs }: PacingEnvelopeRunCardProps) {
  const [showAllScenarios, setShowAllScenarios] = useState(false);

  const simulation = useMemo<SimulationResult | null>(() => {
    if (!result || !simulationInputs) return null;
    try {
      return computeRaceSimulation({
        distance: result.distance,
        pacing_envelope: result,
        threshold_pace_sec_km: result.threshold_pace_sec_km,
        ...simulationInputs,
      });
    } catch { return null; }
  }, [result, simulationInputs]);

  if (!result) {
    return (
      <Card className={cn("opacity-60", className)}>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4" />Pacing Envelope™ CAP</CardTitle></CardHeader>
        <CardContent><div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Données insuffisantes pour générer l'enveloppe de pacing</div></CardContent>
      </Card>
    );
  }

  const greenZone = result.zones.find((z) => z.zone === "GREEN");
  const hasSimulation = simulation !== null;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Pacing Envelope™ — {result.distance}
          </CardTitle>
          <Badge variant={result.discipline_required ? "default" : "secondary"} className="text-xs">
            {result.discipline_required ? "Discipline requise" : "Pacing libre"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="chart" className="w-full">
          <TabsList className={cn("grid w-full h-8", hasSimulation ? "grid-cols-4" : "grid-cols-3")}>
            <TabsTrigger value="chart" className="text-xs">Graphique</TabsTrigger>
            <TabsTrigger value="rules" className="text-xs">Règles</TabsTrigger>
            <TabsTrigger value="scenarios" className="text-xs">Scénarios</TabsTrigger>
            {hasSimulation && <TabsTrigger value="simulation" className="text-xs"><Droplets className="w-3 h-3 mr-1" />Nutri</TabsTrigger>}
          </TabsList>
          <TabsContent value="chart" className="mt-3">
            <PacingEnvelopeRunChart result={result} showAllScenarios={showAllScenarios} compact />
            <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" onClick={() => setShowAllScenarios(!showAllScenarios)}>
              {showAllScenarios ? "Masquer les alternatives" : "Afficher tous les scénarios"}
            </Button>
          </TabsContent>
          <TabsContent value="rules" className="mt-3 space-y-3">
            {greenZone && (
              <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: PACING_ZONE_COLORS.GREEN }} />
                  <span className="font-medium text-sm">Zone Verte — Sustainable</span>
                </div>
                <p className="text-xs text-muted-foreground">Intensité : {greenZone.rangePctThreshold[0]}–{greenZone.rangePctThreshold[1]}% du seuil</p>
                {greenZone.rangeSecPerKm && <p className="text-xs font-mono mt-1">Allure : {formatPace(greenZone.rangeSecPerKm[0])} – {formatPace(greenZone.rangeSecPerKm[1])}</p>}
              </div>
            )}
            <div className="space-y-2">
              {[{ key: "first_third", label: "1er tiers" }, { key: "middle_third", label: "Milieu" }, { key: "last_third", label: "Final" }].map(({ key, label }) => (
                <div key={key} className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg">
                  <Badge variant="outline" className="text-xs shrink-0">{label}</Badge>
                  <p className="text-xs">{(result.rules as any)[key].rule}</p>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="scenarios" className="mt-3 space-y-3">
            {result.scenarios.map((scenario) => (
              <ScenarioCard key={scenario.type} scenario={scenario} thresholdPace={result.threshold_pace_sec_km} />
            ))}
          </TabsContent>
          {hasSimulation && (
            <TabsContent value="simulation" className="mt-3">
              <SimulationTab simulation={simulation} />
            </TabsContent>
          )}
        </Tabs>
        <Separator />
        <p className="text-[10px] text-muted-foreground text-center italic">{result.disclaimer}</p>
        {isStaffMode && (
          <div className="bg-muted/30 rounded-lg p-3 text-xs">
            <p className="font-medium mb-1">Méthodologie</p>
            <p className="text-muted-foreground whitespace-pre-line">{result.methodology}</p>
            <div className="flex flex-wrap gap-1 mt-2">
              {result.sources_used.map((s) => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
