/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PANEL 4 — Race Decision & Pacing (Jour J)
 * 
 * Race Readiness, Pacing Envelope™, simulation scénarios,
 * règles non négociables.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Flag, 
  Gauge, 
  Target,
  Shield,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalibrationResult } from "@/lib/calibration/vlamaxContinuous";
import { computePacingConservatism } from "@/lib/calibration/vlamaxContinuous";
import type { DbSnapshot } from "@/hooks/useCloudData";
import { useRunningFocusMode } from "@/hooks/useRunningFocusMode";
import type { AthleteDiagnostic } from "@/engines/diagnostic";

interface RaceDecisionPanelProps {
  athleteId: string;
  liveCalibration: CalibrationResult | null;
  activeSnapshot: DbSnapshot | null;
  /** Optional engine diagnostic for enriched race readiness */
  diagnostic?: AthleteDiagnostic | null;
}

type ScenarioType = "conservative" | "standard" | "aggressive";

interface PacingScenario {
  type: ScenarioType;
  label: string;
  description: string;
  pctThreshold: number;
  riskLevel: "low" | "medium" | "high";
  recommended: boolean;
}

export function RaceDecisionPanel({
  athleteId,
  liveCalibration,
  activeSnapshot,
  diagnostic,
}: RaceDecisionPanelProps) {
  const { raceType, targets, raceLabel } = useRunningFocusMode();

  // Race Readiness Score — prefer engine score when available
  const raceReadiness = useMemo(() => {
    // Use engine readiness if available (computed from full diagnostic)
    if (diagnostic?.readiness?.readiness?.score != null) {
      return diagnostic.readiness.readiness.score;
    }
    
    // Fallback: calibration-based estimation
    if (!liveCalibration) return 50;
    
    let score = 50;
    score += liveCalibration.confidence * 30;
    if (liveCalibration.recalibration_recommended) score -= 15;
    if (liveCalibration.evidence_count >= 3) score += 10;
    const range = liveCalibration.vlamax_range.p75 - liveCalibration.vlamax_range.p25;
    if (range < 0.05) score += 10;
    
    return Math.max(0, Math.min(100, score));
  }, [liveCalibration, diagnostic]);

  // Pacing conservatism
  const pacingConfig = useMemo(() => {
    const confidence = liveCalibration?.confidence ?? 0.5;
    return computePacingConservatism(confidence);
  }, [liveCalibration]);

  // Pacing scenarios
  const scenarios = useMemo((): PacingScenario[] => {
    const confidence = liveCalibration?.confidence ?? 0.5;
    const baseThreshold = targets?.pctVO2maxRace ?? 85;

    return [
      {
        type: "conservative",
        label: "Robuste",
        description: "Marge de sécurité maximale, finish garanti",
        pctThreshold: baseThreshold - 3,
        riskLevel: "low",
        recommended: confidence < 0.65 || !!liveCalibration?.recalibration_recommended,
      },
      {
        type: "standard",
        label: "Standard",
        description: "Équilibre risque/performance",
        pctThreshold: baseThreshold,
        riskLevel: "medium",
        recommended: confidence >= 0.65 && confidence < 0.80 && !liveCalibration?.recalibration_recommended,
      },
      {
        type: "aggressive",
        label: "Ambitieux",
        description: "Pousser vers le potentiel maximal",
        pctThreshold: baseThreshold + 2,
        riskLevel: "high",
        recommended: confidence >= 0.80 && !liveCalibration?.recalibration_recommended,
      },
    ];
  }, [liveCalibration, targets]);

  // Non-negotiable rules
  const nonNegotiables = useMemo(() => {
    const rules: { icon: React.ReactNode; text: string; critical: boolean }[] = [];
    
    rules.push({
      icon: <Clock className="h-4 w-4" />,
      text: "Premier tiers conservateur (−3% vs cible)",
      critical: true,
    });
    
    rules.push({
      icon: <Target className="h-4 w-4" />,
      text: "Ne pas dépasser le plafond de l'enveloppe",
      critical: true,
    });

    if (liveCalibration?.vlamax_calibrated && liveCalibration.vlamax_calibrated < 0.35) {
      rules.push({
        icon: <Shield className="h-4 w-4" />,
        text: "Profil sensible VLamax — discipline absolue",
        critical: true,
      });
    }

    rules.push({
      icon: <Gauge className="h-4 w-4" />,
      text: "Surveiller dérive FC > 5%",
      critical: false,
    });

    return rules;
  }, [liveCalibration]);

  const getReadinessColor = () => {
    if (raceReadiness >= 80) return "text-emerald-600";
    if (raceReadiness >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getRiskBadgeVariant = (risk: "low" | "medium" | "high") => {
    switch (risk) {
      case "low": return "secondary";
      case "medium": return "outline";
      case "high": return "destructive";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-primary" />
            Décision Course
          </CardTitle>
          {raceLabel && (
            <Badge variant="outline">{raceLabel}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Race Readiness */}
        <div className="p-4 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium">Race Readiness</span>
            <span className={cn("text-2xl font-bold font-mono", getReadinessColor())}>
              {raceReadiness.toFixed(0)}%
            </span>
          </div>
          <Progress value={raceReadiness} className="h-3" />
          <p className="text-xs text-muted-foreground mt-2">
            {raceReadiness >= 80 
              ? "Excellent — conditions optimales pour performer"
              : raceReadiness >= 60
                ? "Correct — performance attendue avec prudence"
                : "Faible — risque élevé, approche conservative recommandée"
            }
          </p>
        </div>

        <Separator />

        {/* Pacing Envelope Status */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            Enveloppe Pacing
          </h4>
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm">Mode:</span>
              <Badge variant="secondary">{pacingConfig.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {pacingConfig.description}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Coefficient:</span>
              <span className="font-mono text-sm">{(pacingConfig.coefficient * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Scenarios */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Scénarios simulation</h4>
          <div className="grid gap-2">
            {scenarios.map((scenario) => (
              <div
                key={scenario.type}
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  scenario.recommended 
                    ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" 
                    : "bg-card"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {scenario.recommended && (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    )}
                    <span className="font-medium text-sm">{scenario.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">
                      {scenario.pctThreshold}% seuil
                    </span>
                    <Badge variant={getRiskBadgeVariant(scenario.riskLevel)}>
                      {scenario.riskLevel === "low" ? "Faible" : 
                       scenario.riskLevel === "medium" ? "Moyen" : "Élevé"}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {scenario.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Non-Negotiables */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-600" />
            Règles non négociables
          </h4>
          <div className="space-y-2">
            {nonNegotiables.map((rule, i) => (
              <div 
                key={i}
                className={cn(
                  "flex items-center gap-2 p-2 rounded",
                  rule.critical 
                    ? "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200"
                    : "bg-muted/50"
                )}
              >
                <span className={rule.critical ? "text-amber-600" : "text-muted-foreground"}>
                  {rule.icon}
                </span>
                <span className="text-sm">{rule.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Calibration Warning */}
        {liveCalibration?.recalibration_recommended && (
          <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-800 dark:text-red-200">
                Attention: Recalibration recommandée
              </span>
            </div>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
              {liveCalibration.recalibration_reason}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
