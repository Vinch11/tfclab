/**
 * Performance Prediction Chart – INSCYD-style
 * Prédiction de temps et puissance/pace pour courses vélo, CAP, triathlon
 * Avec 3 scénarios (Conservateur, Optimal, Agressif)
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Timer, Bike, PersonStanding, Trophy, Zap, Droplets, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computePerformancePredictions,
  type PerformancePredictionInput,
  type ScenarioPrediction,
  type RacePrediction,
  type ScenarioLevel,
} from "@/lib/v2/performancePrediction";

// =============================================
// TYPES
// =============================================

interface PerformancePredictionChartProps {
  vo2max: number | null;
  vlamax: number | null;
  ftp: number | null;
  weight?: number;
  vma?: number | null;
  css?: number | null;
  runEconomyScore?: number | null;
  confidence?: number;
  staffMode?: boolean;
  className?: string;
}

// =============================================
// SCENARIO BADGE
// =============================================

const SCENARIO_STYLES: Record<ScenarioLevel, { bg: string; text: string; border: string }> = {
  conservative: { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/30" },
  optimal: { bg: "bg-sky-500/10", text: "text-sky-600", border: "border-sky-500/30" },
  aggressive: { bg: "bg-orange-500/10", text: "text-orange-600", border: "border-orange-500/30" },
};

function GlycogenBadge({ risk }: { risk: "low" | "moderate" | "high" }) {
  const styles = {
    low: "bg-emerald-500/10 text-emerald-600",
    moderate: "bg-yellow-500/10 text-yellow-600",
    high: "bg-red-500/10 text-red-600",
  };
  const labels = { low: "Faible", moderate: "Modéré", high: "Élevé" };
  return (
    <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full font-medium", styles[risk])}>
      {labels[risk]}
    </span>
  );
}

// =============================================
// RACE ROW
// =============================================

function RaceRow({
  prediction,
  scenarioLevel,
  showDetails,
}: {
  prediction: RacePrediction;
  scenarioLevel: ScenarioLevel;
  showDetails: boolean;
}) {
  const style = SCENARIO_STYLES[scenarioLevel];
  const sportIcon = prediction.sport === "velo"
    ? Bike
    : prediction.sport === "cap"
      ? PersonStanding
      : Trophy;
  const Icon = sportIcon;

  return (
    <div className={cn("rounded-lg border p-3 space-y-1.5", style.border, style.bg)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-3.5 w-3.5", style.text)} />
          <div>
            <div className="text-xs font-semibold">{prediction.raceName}</div>
            <div className="text-[10px] text-muted-foreground">{prediction.distance}</div>
          </div>
        </div>
        <div className="text-right">
          <div className={cn("text-base font-mono font-bold", style.text)}>
            {prediction.timeFormatted}
          </div>
        </div>
      </div>

      {showDetails && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px] pt-1 border-t border-border/30">
          {prediction.powerWatts && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Puissance</span>
              <span className="font-mono font-medium">{prediction.powerWatts}W ({prediction.intensityPctFTP}% FTP)</span>
            </div>
          )}
          {prediction.paceFormatted && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Allure</span>
              <span className="font-mono font-medium">{prediction.paceFormatted}</span>
            </div>
          )}
          {prediction.carbsNeeded != null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">CHO cible</span>
              <span className="font-mono font-medium">{prediction.carbsNeeded} g/h</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Risque glycogène</span>
            <GlycogenBadge risk={prediction.glycogenRisk} />
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// SCENARIO COLUMN
// =============================================

function ScenarioColumn({
  scenario,
  showDetails,
}: {
  scenario: ScenarioPrediction;
  showDetails: boolean;
}) {
  const style = SCENARIO_STYLES[scenario.scenario];

  return (
    <div className="space-y-2">
      <div className="text-center">
        <Badge className={cn("text-[10px]", style.bg, style.text, style.border, "border")}>
          {scenario.label} ({scenario.probability})
        </Badge>
      </div>
      <div className="space-y-2">
        {scenario.predictions.map((pred) => (
          <RaceRow
            key={pred.raceId}
            prediction={pred}
            scenarioLevel={scenario.scenario}
            showDetails={showDetails}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================
// COMPARISON TABLE (compact view)
// =============================================

function ComparisonTable({ scenarios }: { scenarios: ScenarioPrediction[] }) {
  if (!scenarios.length) return null;
  const races = scenarios[0].predictions;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b">
            <th className="text-left py-1.5 font-medium text-muted-foreground">Course</th>
            {scenarios.map((s) => (
              <th key={s.scenario} className="text-center py-1.5 font-medium">
                <Badge variant="outline" className={cn("text-[9px]", SCENARIO_STYLES[s.scenario].text)}>
                  {s.label}
                </Badge>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {races.map((race, i) => (
            <tr key={race.raceId} className={i % 2 === 0 ? "bg-muted/20" : ""}>
              <td className="py-1.5 pr-2">
                <div className="font-medium text-[11px]">{race.raceName}</div>
                <div className="text-[9px] text-muted-foreground">{race.distance}</div>
              </td>
              {scenarios.map((s) => {
                const pred = s.predictions[i];
                return (
                  <td key={s.scenario} className="text-center py-1.5">
                    <div className={cn("font-mono font-bold text-[11px]", SCENARIO_STYLES[s.scenario].text)}>
                      {pred.timeFormatted}
                    </div>
                    {pred.powerWatts && (
                      <div className="text-[9px] text-muted-foreground">{pred.powerWatts}W</div>
                    )}
                    {pred.paceFormatted && (
                      <div className="text-[9px] text-muted-foreground">{pred.paceFormatted}</div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function PerformancePredictionChart({
  vo2max,
  vlamax,
  ftp,
  weight = 70,
  vma,
  css,
  runEconomyScore,
  confidence,
  staffMode = false,
  className,
}: PerformancePredictionChartProps) {
  const [sportFilter, setSportFilter] = useState<"all" | "velo" | "cap" | "triathlon">("all");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");

  const valid = vo2max && vlamax && vo2max > 0 && vlamax > 0;

  const output = useMemo(() => {
    if (!valid) return null;
    const input: PerformancePredictionInput = {
      vo2max: vo2max!,
      vlamax: vlamax!,
      weight,
      ftp,
      vma,
      css,
      runEconomyScore,
      confidence: confidence ?? 0.7,
    };
    return computePerformancePredictions(
      input,
      sportFilter === "all" ? undefined : sportFilter
    );
  }, [vo2max, vlamax, weight, ftp, vma, css, runEconomyScore, confidence, sportFilter, valid]);

  if (!valid) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            VO₂max et VLamax requis pour les prédictions de performance
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 bg-gradient-to-r from-sky-500/10 via-transparent to-orange-500/5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Timer className="h-4 w-4 text-sky-500" />
            Prédiction de Performance
            <Badge variant="outline" className="text-[9px] font-normal">
              3 Scénarios
            </Badge>
          </CardTitle>
          <div className="flex gap-1">
            <Badge variant="secondary" className="text-[9px] font-mono">
              VO₂ {vo2max}
            </Badge>
            <Badge variant="secondary" className="text-[9px] font-mono">
              VLa {vlamax!.toFixed(2)}
            </Badge>
            {ftp && (
              <Badge variant="secondary" className="text-[9px] font-mono">
                FTP {ftp}W
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pt-3">
        {/* Sport filter tabs */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Tabs value={sportFilter} onValueChange={(v) => setSportFilter(v as any)}>
            <TabsList className="h-7">
              <TabsTrigger value="all" className="text-[10px] px-2 h-5">Tous</TabsTrigger>
              <TabsTrigger value="velo" className="text-[10px] px-2 h-5">🚴 Vélo</TabsTrigger>
              <TabsTrigger value="cap" className="text-[10px] px-2 h-5">🏃 CAP</TabsTrigger>
              <TabsTrigger value="triathlon" className="text-[10px] px-2 h-5">🏊 Tri</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
            <TabsList className="h-7">
              <TabsTrigger value="table" className="text-[10px] px-2 h-5">Tableau</TabsTrigger>
              <TabsTrigger value="cards" className="text-[10px] px-2 h-5">Cartes</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Predictions */}
        {output && viewMode === "table" && (
          <ComparisonTable scenarios={output.scenarios} />
        )}

        {output && viewMode === "cards" && (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
            {output.scenarios.map((s) => (
              <ScenarioColumn
                key={s.scenario}
                scenario={s}
                showDetails={staffMode}
              />
            ))}
          </div>
        )}

        {/* Scenario legend */}
        <div className="flex flex-wrap gap-3 justify-center pt-1">
          {[
            { label: "Conservateur (95%)", color: "text-emerald-600", dot: "bg-emerald-500" },
            { label: "Optimal (80%)", color: "text-sky-600", dot: "bg-sky-500" },
            { label: "Agressif (60%)", color: "text-orange-600", dot: "bg-orange-500" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1">
              <div className={cn("w-2 h-2 rounded-full", s.dot)} />
              <span className={cn("text-[9px]", s.color)}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Key insight */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border">
          <TrendingUp className="h-4 w-4 mt-0.5 shrink-0 text-sky-600" />
          <div>
            <div className="text-xs font-semibold text-sky-600">Impact métabolique</div>
            <div className="text-[11px] text-muted-foreground">
              {vlamax! < 0.35
                ? "VLamax basse → excellente économie glycogénique. Prédictions longue distance fiables."
                : vlamax! > 0.55
                  ? "VLamax élevée → consommation CHO rapide. Risque glycogène accru sur distance longue."
                  : "Profil équilibré → bonnes prédictions sur toutes distances. Marge d'optimisation possible."}
            </div>
          </div>
        </div>

        {/* Staff block */}
        {staffMode && output && (
          <div className="rounded-lg bg-muted/20 border border-dashed p-3 text-[10px] font-mono text-muted-foreground space-y-1">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-foreground/60 mb-1">
              Modèle de prédiction — Données techniques
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <span>VO₂max: {vo2max} ml/kg/min</span>
              <span>VLamax: {vlamax!.toFixed(2)} mmol/L/s</span>
              <span>Poids: {weight}kg</span>
              <span>FTP: {ftp ?? "estimé"}W</span>
              <span>VMA: {vma ? `${vma} km/h` : "estimée"}</span>
              <span>Confiance: {Math.round((output.confidence ?? 0.7) * 100)}%</span>
            </div>
            <p className="text-[9px] opacity-60 pt-1 border-t border-border/30">
              {output.modelNote}
            </p>
          </div>
        )}

        <p className="text-[9px] text-muted-foreground text-center pt-2 border-t">
          Estimations basées sur VO₂max × VLamax × Économie. Conditions optimales. Variables terrain non incluses.
        </p>
      </CardContent>
    </Card>
  );
}
