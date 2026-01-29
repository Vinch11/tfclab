/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * STAFF PACING REPORT V2™ — Rapport Coach-Grade
 * Two For Coaching Lab Method™
 * 
 * Rapport technique complet pour le coach avec:
 * - Profil de tolérance au pacing
 * - Envelope technique
 * - Scénarios d'erreur
 * - Stratégie de communication
 * - Lien simulation
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Activity, 
  Target, 
  AlertTriangle, 
  MessageSquare,
  Link2,
  ChevronRight,
  TrendingUp,
  Shield,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  generateStaffPacingReport,
  getMetricStatusColor,
  getMetricStatusBg,
  getSeverityColor,
  getSeverityBadgeColor,
  type StaffPacingReportInput,
} from "@/lib/v2/staffPacingReport";

import { PacingDisciplineChart } from "@/components/charts/PacingDisciplineChart";

import type { PacingEnvelopeResult, RaceObjective } from "@/lib/v2/pacingEnvelopeEngine";
import type { DisciplineRulesResult } from "@/lib/v2/pacingDisciplineRules";
import type { ScenarioSimulationResult } from "@/lib/v2/pacingScenarioSimulator";
import type { VLamaxEffectif } from "@/lib/vlamaxEffectif";
import type { TTEEffectif } from "@/lib/tteEffectif";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface StaffPacingReportV2Props {
  athleteName: string;
  envelope: PacingEnvelopeResult;
  rules: DisciplineRulesResult;
  scenarios: ScenarioSimulationResult;
  vlamaxEffectif: VLamaxEffectif | null;
  tteEffectif: TTEEffectif | null;
  raceReadinessScore: number | null;
  raceObjective: RaceObjective;
  raceDurationMin?: number;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function StaffPacingReportV2({
  athleteName,
  envelope,
  rules,
  scenarios,
  vlamaxEffectif,
  tteEffectif,
  raceReadinessScore,
  raceObjective,
  raceDurationMin = 180,
  className,
}: StaffPacingReportV2Props) {
  // Générer le rapport
  const report = useMemo(() => {
    return generateStaffPacingReport({
      athleteName,
      envelope,
      rules,
      scenarios,
      vlamaxEffectif,
      tteEffectif,
      raceReadinessScore,
      raceObjective,
    });
  }, [athleteName, envelope, rules, scenarios, vlamaxEffectif, tteEffectif, raceReadinessScore, raceObjective]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {report.title}
          </h2>
          <p className="text-sm text-muted-foreground">{report.subtitle}</p>
        </div>
        <Badge variant="secondary">STAFF</Badge>
      </div>

      {/* SECTION A: Profil de tolérance */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-5 w-5" />
              Profil de tolérance au pacing
            </CardTitle>
            {report.toleranceProfile.badge && (
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  report.toleranceProfile.badgeColor === "purple" && "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300",
                  report.toleranceProfile.badgeColor === "orange" && "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300"
                )}
              >
                {report.toleranceProfile.badge}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Métriques */}
          <div className="grid grid-cols-3 gap-3">
            {report.toleranceProfile.metrics.map((metric) => (
              <div 
                key={metric.label}
                className={cn("p-3 rounded-lg text-center", getMetricStatusBg(metric.status))}
              >
                <div className={cn("text-lg font-bold font-mono", getMetricStatusColor(metric.status))}>
                  {metric.value}
                </div>
                <div className="text-[10px] text-muted-foreground">{metric.label}</div>
                <div className="text-[9px] text-muted-foreground/70">Conf: {metric.confidence}</div>
              </div>
            ))}
          </div>

          {/* Résumé */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              {report.toleranceProfile.summary}
            </AlertDescription>
          </Alert>

          {/* Interprétation */}
          <p className="text-xs text-muted-foreground italic">
            {report.toleranceProfile.interpretation}
          </p>
        </CardContent>
      </Card>

      {/* SECTION B: Pacing Envelope technique */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Pacing Envelope™ (Technique)
          </CardTitle>
          <CardDescription className="text-xs">
            {report.envelopeTechnical.justification}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Graphique */}
          <PacingDisciplineChart
            envelope={envelope}
            xAxisMode="time"
            totalDuration={raceDurationMin}
            staffMode
            height={220}
          />

          {/* Métriques de l'enveloppe */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
              <div className="text-sm font-bold text-blue-600">{report.envelopeTechnical.boundary.low}%</div>
              <div className="text-[9px] text-muted-foreground">Bas</div>
            </div>
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded">
              <div className="text-sm font-bold text-green-600">{report.envelopeTechnical.boundary.center}%</div>
              <div className="text-[9px] text-muted-foreground">Centre</div>
            </div>
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
              <div className="text-sm font-bold text-orange-600">{report.envelopeTechnical.boundary.high}%</div>
              <div className="text-[9px] text-muted-foreground">Haut</div>
            </div>
            <div className="p-2 bg-muted rounded">
              <div className="text-sm font-bold">±{report.envelopeTechnical.width}%</div>
              <div className="text-[9px] text-muted-foreground">{report.envelopeTechnical.widthLabel.split(" ")[0]}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION C: Scénarios d'erreur */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Scénarios d'erreur critiques
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {report.errorScenarios.map((scenario) => (
            <div 
              key={scenario.id}
              className={cn("p-3 rounded-lg border", getSeverityBadgeColor(scenario.severity))}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{scenario.title}</span>
                <Badge variant="outline" className={cn("text-[9px]", getSeverityColor(scenario.severity))}>
                  {scenario.severity.toUpperCase()}
                </Badge>
              </div>
              
              <div className="text-xs space-y-1">
                <div className="flex items-start gap-1">
                  <span className="text-muted-foreground font-medium shrink-0">SI:</span>
                  <span>{scenario.condition}</span>
                </div>
                <div className="flex items-start gap-1">
                  <ChevronRight className="h-3 w-3 mt-0.5 text-red-500 shrink-0" />
                  <span className={getSeverityColor(scenario.severity)}>{scenario.consequence}</span>
                </div>
                <div className="text-[10px] text-muted-foreground font-mono mt-1">
                  {scenario.impact}
                </div>
              </div>
              
              <div className="mt-2 pt-2 border-t text-[10px] text-muted-foreground">
                <span className="font-medium">Action coach:</span> {scenario.coachAction}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* SECTION D: Stratégie de communication */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            Stratégie de communication coach
          </CardTitle>
          <CardDescription className="text-xs">
            {report.coachCommunication.approach}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Phrases prêtes à l'emploi */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground">Phrases à utiliser</h4>
            {report.coachCommunication.phrases.map((phrase, i) => (
              <div 
                key={i}
                className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-2 border-blue-500"
              >
                <p className="text-sm italic">"{phrase}"</p>
              </div>
            ))}
          </div>

          <Separator />

          {/* Warnings et encouragements en 2 colonnes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-orange-600 dark:text-orange-400">⚠️ Points d'attention</h4>
              {report.coachCommunication.warnings.map((warning, i) => (
                <p key={i} className="text-xs text-muted-foreground">• {warning}</p>
              ))}
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-green-600 dark:text-green-400">✅ Encouragements</h4>
              {report.coachCommunication.encouragements.map((enc, i) => (
                <p key={i} className="text-xs text-muted-foreground">• {enc}</p>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION E: Lien simulation */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Lien avec la simulation de course
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm font-medium">{report.simulationLink.message}</p>
          <p className="text-xs text-orange-600 dark:text-orange-400">
            ⚠️ {report.simulationLink.warning}
          </p>
          <p className="text-xs text-muted-foreground italic">
            💡 {report.simulationLink.recommendation}
          </p>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="text-center text-[10px] text-muted-foreground italic">
        {report.disclaimer}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default StaffPacingReportV2;
