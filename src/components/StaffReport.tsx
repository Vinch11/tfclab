/**
 * RAPPORT STAFF PRÉ-COURSE - Composant UI
 * Synthèse d'une page, lisible en < 2 minutes
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  FileText, 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  TrendingUp,
  Utensils,
  Activity,
  Download,
  Footprints,
  Info,
  Zap,
  ChevronDown,
  Clock,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StaffReport as StaffReportType, generateStaffReport, GenerateStaffReportParams } from "@/lib/staffReport";
import { VLamaxEffectif } from "@/lib/vlamaxEffectif";
import { TTEEffectif } from "@/lib/tteEffectif";
import { RaceReadinessEffectif } from "@/lib/raceReadinessEffectif";
import { NutritionEstimate } from "@/lib/nutritionPredictive";
import { RunningEconomyResult } from "@/lib/runningEconomy";
import { computeCAPInjuryRisk } from "@/lib/capInjuryRisk";
import { PerformanceRiskMatrixCompact } from "@/components/PerformanceRiskMatrix";
import { getAxisLabel, getAxisColor } from "@/lib/wahoo/wahooSuggestionEngine";
import { MetabolicPerformanceCompass } from "@/components/charts/MetabolicPerformanceCompass";
import { AmbitionLevel, DEFAULT_AMBITION } from "@/types/ambitionLevel";

interface StaffReportProps {
  athleteName: string;
  objectif: string;
  snapshotDate: string;
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  readiness: RaceReadinessEffectif;
  nutritionEstimate: NutritionEstimate | null;
  runningEconomy: RunningEconomyResult | null;
  ftp: number | null;
  poids: number | null;
  fcMax: number | null;
  tss7d?: number | null;
  ambition?: AmbitionLevel;
  onExportPDF?: () => void;
}

export function StaffReport({
  athleteName,
  objectif,
  snapshotDate,
  vlamaxEffectif,
  tteEffectif,
  readiness,
  nutritionEstimate,
  runningEconomy,
  ftp,
  poids,
  fcMax,
  tss7d,
  ambition,
  onExportPDF,
}: StaffReportProps) {
  // Générer le rapport
  const report = generateStaffReport({
    athleteName,
    objectif,
    snapshotDate,
    vlamaxEffectif,
    tteEffectif,
    readiness,
    nutritionEstimate,
    runningEconomy,
    ftp,
    poids,
    fcMax,
    ambition,
  });

  const getTrafficLightColors = (light: "green" | "orange" | "red") => {
    switch (light) {
      case "green":
        return "bg-green-500/20 border-green-500/50 text-green-700 dark:text-green-400";
      case "orange":
        return "bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-400";
      case "red":
        return "bg-red-500/20 border-red-500/50 text-red-700 dark:text-red-400";
    }
  };

  const getStatusColors = (status: "good" | "warning" | "critical") => {
    switch (status) {
      case "good":
        return "text-green-600 dark:text-green-400";
      case "warning":
        return "text-amber-600 dark:text-amber-400";
      case "critical":
        return "text-red-600 dark:text-red-400";
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto print:shadow-none print:border-0" id="staff-report">
      {/* En-tête du rapport */}
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
            <CardTitle className="text-xl font-bold tracking-tight">
                TWO FOR COACHING LAB — RAPPORT STAFF PRÉ-COURSE
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Synthèse décisionnelle • Généré le {report.generatedAt}
              </p>
            </div>
          </div>
          {onExportPDF && (
            <Button variant="outline" size="sm" onClick={onExportPDF} className="print:hidden">
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          )}
        </div>
        
        {/* Métadonnées athlète */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Athlète :</span>
              <span className="ml-2 font-semibold">{report.athleteName}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Objectif :</span>
              <span className="ml-2 font-semibold">{report.objectifLabel}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Ambition :</span>
              <span className="ml-2 font-semibold">{report.ambitionIcon} {report.ambitionLabel}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Snapshot :</span>
              <span className="ml-2 font-semibold">{report.snapshotDate}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 1️⃣ SYNTHÈSE EXECUTIVE */}
        <div className={cn(
          "p-4 rounded-xl border-2",
          getTrafficLightColors(report.executiveSummary.trafficLight)
        )}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{report.executiveSummary.trafficLightIcon}</span>
                <div>
                  <p className="text-2xl font-bold">
                    Race Readiness : {report.executiveSummary.raceReadinessScore}%
                  </p>
                  <p className="text-sm font-medium">
                    Statut : {report.executiveSummary.trafficLightLabel}
                  </p>
                </div>
              </div>
              
              <p className="text-sm mt-3 font-medium">
                {report.executiveSummary.executiveMessage}
              </p>
              
              {report.executiveSummary.mainLimitation !== "none" && (
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Limitation principale : <strong>{report.executiveSummary.mainLimitationLabel}</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2️⃣ INDICATEURS CLÉS */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            INDICATEURS CLÉS
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {report.keyIndicators.map((indicator, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-muted/30 border"
              >
                <p className="text-xs text-muted-foreground mb-1">{indicator.name}</p>
                <p className={cn("text-lg font-bold", getStatusColors(indicator.status))}>
                  {indicator.value}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">{indicator.source}</span>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                    {indicator.confidenceLabel}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          
          {/* Matrice Performance-Risk compacte */}
          <div className="mt-4">
            <PerformanceRiskMatrixCompact
              params={{
                capInjuryRisk: computeCAPInjuryRisk({
                  vlamaxValue: vlamaxEffectif.value,
                  tteValue: tteEffectif.tte_min,
                  objectif,
                }),
                vlamaxValue: vlamaxEffectif.value,
                vlamaxConfidence: vlamaxEffectif.confidence,
                tteValue: tteEffectif.tte_min,
                tteConfidence: tteEffectif.confidence,
                raceReadinessScore: readiness.score,
                objectif,
              }}
            />
          </div>
          
          {/* Compass compact pour export */}
          <div className="mt-4">
            <MetabolicPerformanceCompass
              data={{
                vlamaxEffectif,
                tteEffectif,
                ftp,
                poids,
                tss7d: tss7d ?? null,
                snapshotDate,
                objectif,
                ambition: ambition || DEFAULT_AMBITION,
              }}
              compact={true}
              className="print:break-inside-avoid"
            />
          </div>
        </div>

        <Separator />

        {/* 3️⃣ RISQUE BLESSURE CAP */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Footprints className="h-4 w-4" />
            ANALYSE DU RISQUE BLESSURE — COURSE À PIED (CAP)
            {report.capInjuryRisk.showWarning && (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
          </h3>
          
          <div className={cn(
            "p-4 rounded-lg border-2",
            report.capInjuryRisk.level === 0 ? "bg-green-500/5 border-green-500/30" :
            report.capInjuryRisk.level === 1 ? "bg-blue-500/5 border-blue-500/30" :
            report.capInjuryRisk.level === 2 ? "bg-amber-500/5 border-amber-500/30" :
            "bg-red-500/5 border-red-500/30"
          )}>
            {/* A) Indice global */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{report.capInjuryRisk.icon}</span>
              <div>
                <p className={cn(
                  "text-lg font-bold",
                  report.capInjuryRisk.level === 0 ? "text-green-700 dark:text-green-400" :
                  report.capInjuryRisk.level === 1 ? "text-blue-700 dark:text-blue-400" :
                  report.capInjuryRisk.level === 2 ? "text-amber-700 dark:text-amber-400" :
                  "text-red-700 dark:text-red-400"
                )}>
                  Indice de risque blessure CAP : {report.capInjuryRisk.levelLabel.toUpperCase()}
                </p>
              </div>
            </div>
            
            {/* B) Décomposition physiologique */}
            <div className="grid grid-cols-3 gap-3 mb-4 p-3 rounded-lg bg-background/50">
              <div>
                <p className="text-xs text-muted-foreground mb-1">VLamax effectif</p>
                <p className="font-bold">{report.capInjuryRisk.vlamaxValue}</p>
                <p className="text-[10px] text-muted-foreground">
                  {report.capInjuryRisk.vlamaxSource} • {Math.round(report.capInjuryRisk.vlamaxConfidence * 100)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">TTE effectif</p>
                <p className="font-bold">{report.capInjuryRisk.tteValue}</p>
                <p className="text-[10px] text-muted-foreground">
                  {report.capInjuryRisk.tteSource} • {Math.round(report.capInjuryRisk.tteConfidence * 100)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Objectif</p>
                <p className="font-bold">{report.capInjuryRisk.objectif}</p>
              </div>
            </div>
            
            {/* C) Interprétation staff-grade */}
            <div className="mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Analyse physiologique :</p>
              <div className="text-xs text-foreground whitespace-pre-line bg-muted/30 rounded p-2">
                {report.capInjuryRisk.interpretation}
              </div>
            </div>
            
            {/* Impact programmation */}
            <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Impact sur la programmation CAP
              </p>
              <p className="text-xs">{report.capInjuryRisk.programmingImpact}</p>
            </div>
            
            {/* Recommandations */}
            {report.capInjuryRisk.recommendations.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Recommandations staff :</p>
                <ul className="space-y-1">
                  {report.capInjuryRisk.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-xs flex items-start gap-2">
                      <span className="text-primary mt-0.5">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Disclaimer */}
            <p className="text-[10px] text-muted-foreground italic border-t border-border pt-3">
              {report.capInjuryRisk.disclaimer}
            </p>
          </div>
        </div>

        <Separator />

        {/* 4️⃣ PRÉDICTIONS D'AMBITION */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            PRÉDICTIONS D'AMBITION
          </h3>
          
          {/* Current Ambition Prediction Summary */}
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-3">
            <p className="font-medium text-sm">{report.ambitionPredictions.currentAmbitionPrediction}</p>
            <p className="text-xs text-muted-foreground mt-1">{report.ambitionPredictions.trendSummary}</p>
          </div>
          
          {/* Predictions Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {report.ambitionPredictions.predictions.map((prediction) => {
              const isCurrentAmbition = prediction.ambition === report.ambition;
              return (
                <div
                  key={prediction.ambition}
                  className={cn(
                    "p-3 rounded-lg border text-center",
                    isCurrentAmbition && "border-primary/50 bg-primary/5",
                    prediction.isReached && "bg-emerald-500/10 border-emerald-500/30"
                  )}
                >
                  <div className="font-medium text-sm mb-1">
                    {prediction.ambitionIcon} {prediction.ambitionLabel}
                  </div>
                  <div className={cn(
                    "text-lg font-bold",
                    prediction.isReached && "text-emerald-600 dark:text-emerald-400"
                  )}>
                    {prediction.delayLabel}
                  </div>
                  {prediction.currentProgress !== null && !prediction.isReached && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {prediction.currentProgress}% actuel
                    </div>
                  )}
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[9px] mt-2",
                      prediction.confidence === "high" && "border-emerald-500/50 text-emerald-600",
                      prediction.confidence === "medium" && "border-blue-500/50 text-blue-600",
                      prediction.confidence === "low" && "border-amber-500/50 text-amber-600"
                    )}
                  >
                    {prediction.confidence === "high" ? "Confiant" : 
                     prediction.confidence === "medium" ? "Estimé" : 
                     prediction.confidence === "low" ? "Incertain" : "?"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* TFCL REFERENCE WEEK — QUALITÉ DES TESTS */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            TFCL REFERENCE WEEK — QUALITÉ DES TESTS
            {report.tfclReferenceWeek.isComplete ? (
              <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-600">
                Profil complet
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-600">
                Profil partiel
              </Badge>
            )}
          </h3>
          
          <div className={cn(
            "p-4 rounded-lg border",
            report.tfclReferenceWeek.isComplete
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-amber-500/5 border-amber-500/20"
          )}>
            {/* Test Values Grid */}
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4">
              <div className="text-center p-2 rounded bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">P30s</p>
                <p className="font-bold text-lg">
                  {report.tfclReferenceWeek.testValues.p30s_w !== null 
                    ? `${report.tfclReferenceWeek.testValues.p30s_w}W` 
                    : "—"}
                </p>
              </div>
              <div className="text-center p-2 rounded bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">P60s</p>
                <p className="font-bold text-lg">
                  {report.tfclReferenceWeek.testValues.p60s_w !== null 
                    ? `${report.tfclReferenceWeek.testValues.p60s_w}W` 
                    : "—"}
                </p>
              </div>
              <div className="text-center p-2 rounded bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">MAP 5min</p>
                <p className="font-bold text-lg">
                  {report.tfclReferenceWeek.testValues.map5min_w !== null 
                    ? `${report.tfclReferenceWeek.testValues.map5min_w}W` 
                    : "—"}
                </p>
              </div>
              <div className="text-center p-2 rounded bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">FTP</p>
                <p className="font-bold text-lg">
                  {report.tfclReferenceWeek.testValues.ftp_w !== null 
                    ? `${report.tfclReferenceWeek.testValues.ftp_w}W` 
                    : "—"}
                </p>
              </div>
              <div className="text-center p-2 rounded bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">TTE</p>
                <p className="font-bold text-lg">
                  {report.tfclReferenceWeek.testValues.tte_observed_min !== null 
                    ? `${report.tfclReferenceWeek.testValues.tte_observed_min}min` 
                    : "—"}
                </p>
              </div>
            </div>
            
            {/* Protocol Quality & Confidence */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">Qualité du protocole (coach)</p>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">
                    {report.tfclReferenceWeek.testValues.protocol_quality ?? "—"}/5
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {report.tfclReferenceWeek.qualityLabel}
                  </Badge>
                </div>
              </div>
              <div className="p-3 rounded bg-background/50">
                <p className="text-xs text-muted-foreground mb-1">Impact sur la confiance</p>
                <p className={cn(
                  "font-semibold",
                  report.tfclReferenceWeek.confidenceAdjustment > 0 && "text-emerald-600 dark:text-emerald-400",
                  report.tfclReferenceWeek.confidenceAdjustment < 0 && "text-red-600 dark:text-red-400"
                )}>
                  {report.tfclReferenceWeek.confidenceAdjustmentLabel}
                </p>
              </div>
            </div>
            
            {/* Completed Tests */}
            {report.tfclReferenceWeek.completedTests.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Tests complétés :</p>
                <ul className="text-xs space-y-0.5">
                  {report.tfclReferenceWeek.completedTests.map((test, i) => (
                    <li key={i} className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle className="h-3 w-3" />
                      {test}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Missing Data */}
            {report.tfclReferenceWeek.missingData.length > 0 && (
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                  Données manquantes :
                </p>
                <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-0.5">
                  {report.tfclReferenceWeek.missingData.map((data, i) => (
                    <li key={i}>• {data}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Test Dates */}
            {report.tfclReferenceWeek.testDates && (
              <p className="text-xs text-muted-foreground mt-3">
                Dates des tests : {report.tfclReferenceWeek.testDates}
              </p>
            )}
          </div>
          
          <p className="text-[10px] text-muted-foreground mt-2 italic">
            💡 Confiance ajustée par qualité du protocole (coach).
            {!report.tfclReferenceWeek.isComplete && " Profil partiel — VLamax prudente."}
          </p>
        </div>

        <Separator />
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            INTERPRÉTATION STAFF
          </h3>
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="font-medium text-sm">{report.staffInterpretation.mainMessage}</p>
            {report.staffInterpretation.secondaryMessages.length > 0 && (
              <ul className="mt-3 space-y-1">
                {report.staffInterpretation.secondaryMessages.map((msg, index) => (
                  <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-primary mt-0.5">•</span>
                    {msg}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 5️⃣ STRATÉGIE DE COURSE */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* À FAIRE */}
          <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
            <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              À FAIRE
            </h4>
            <ul className="space-y-2">
              {report.raceStrategy.toDo.map((item, index) => (
                <li key={index} className="text-xs flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* À ÉVITER */}
          <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
            <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
              <XCircle className="h-4 w-4" />
              À ÉVITER
            </h4>
            <ul className="space-y-2">
              {report.raceStrategy.toAvoid.map((item, index) => (
                <li key={index} className="text-xs flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">✗</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Fenêtre nutritionnelle critique */}
        {report.raceStrategy.criticalNutritionWindow && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="font-medium text-amber-700 dark:text-amber-400">
              {report.raceStrategy.criticalNutritionWindow}
            </span>
          </div>
        )}

        <Separator />

        {/* 6️⃣ NUTRITION — VERSION STAFF */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            NUTRITION — VERSION STAFF
          </h3>
          <div className={cn(
            "p-4 rounded-lg border",
            report.nutritionSummary.isLimitingFactor 
              ? "bg-red-500/5 border-red-500/20" 
              : "bg-muted/30"
          )}>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Besoin estimé</p>
                <p className="font-bold text-lg">{report.nutritionSummary.carbsEstimate}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Risque</p>
                <p className="font-bold text-lg flex items-center gap-2">
                  <span>{report.nutritionSummary.riskIcon}</span>
                  {report.nutritionSummary.riskLevel}
                </p>
              </div>
              <div className="col-span-1">
                <p className="text-xs text-muted-foreground mb-1">Impact</p>
                <p className={cn(
                  "font-semibold text-sm",
                  report.nutritionSummary.isLimitingFactor ? "text-red-600 dark:text-red-400" : "text-muted-foreground"
                )}>
                  {report.nutritionSummary.keyMessage}
                </p>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 italic">
            ⚠️ Estimation uniquement. Pas de plan alimentaire détaillé – valider avec un nutritionniste.
          </p>
        </div>

        <Separator />

        {/* 7️⃣ SUGGESTIONS WAHOO SYSTM */}
        {report.wahooSuggestions.hasRecommendations && (
          <>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" />
                SUGGESTIONS WAHOO SYSTM
                <Badge variant="outline" className="text-xs">
                  {report.wahooSuggestions.suggestions.length} séance(s)
                </Badge>
              </h3>
              
              {/* Diagnostic Summary */}
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-4">
                <p className="text-xs text-muted-foreground mb-1">Analyse du profil :</p>
                <p className="text-sm font-medium">{report.wahooSuggestions.diagnosticSummary}</p>
              </div>
              
              {/* Suggestions List */}
              <div className="space-y-3">
                {report.wahooSuggestions.suggestions.map((suggestion, index) => (
                  <Collapsible key={index}>
                    <div className="p-3 rounded-lg border bg-card">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{suggestion.wahoo_name}</span>
                              <Badge 
                                variant="outline" 
                                className={cn("text-[10px]", getAxisColor(suggestion.targetAxis))}
                              >
                                {getAxisLabel(suggestion.targetAxis)}
                              </Badge>
                              {suggestion.riskLevel >= 2 && (
                                <Badge variant="destructive" className="text-[10px]">
                                  ⚠️ Risque {suggestion.riskLevel}/3
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {suggestion.expected_effects.slice(0, 2).join(" • ")}
                            </p>
                          </div>
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="pt-3 border-t mt-3 space-y-2">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Pourquoi cette séance :</p>
                          <p className="text-xs">{suggestion.why}</p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Effets attendus :</p>
                          <ul className="text-xs space-y-0.5">
                            {suggestion.expected_effects.map((effect, i) => (
                              <li key={i} className="flex items-start gap-1">
                                <span className="text-primary">•</span>
                                {effect}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {suggestion.cautions.length > 0 && (
                          <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                            <p className="text-[10px] font-medium text-amber-700 dark:text-amber-400 mb-1">⚠️ Précautions :</p>
                            <ul className="text-[10px] text-amber-700 dark:text-amber-400 space-y-0.5">
                              {suggestion.cautions.map((c, i) => (
                                <li key={i}>• {c}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground">
                          Confiance : {Math.round(suggestion.confidence * 100)}%
                        </p>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
              
              <p className="text-[10px] text-muted-foreground mt-3 italic">
                💡 Ces suggestions sont basées sur le profil physiologique de l'athlète et les objectifs déclarés.
                Elles sont indicatives et doivent être adaptées par le coach.
              </p>
            </div>
            <Separator />
          </>
        )}

        {/* 8️⃣ FEU TRICOLORE FINAL */}
        <div className={cn(
          "p-6 rounded-xl border-2 text-center",
          getTrafficLightColors(report.finalVerdict.trafficLight)
        )}>
          <div className="text-5xl mb-3">{report.finalVerdict.icon}</div>
          <h3 className="text-2xl font-bold mb-1">{report.finalVerdict.title}</h3>
          <p className="font-semibold text-sm mb-3">{report.finalVerdict.subtitle}</p>
          <p className="text-xs max-w-md mx-auto">{report.finalVerdict.explanation}</p>
        </div>

        {/* Avertissement légal */}
        <div className="text-[10px] text-muted-foreground text-center p-3 bg-muted/30 rounded-lg">
          <p>
            Ce rapport est une aide à la décision basée sur des estimations physiologiques.
            Il ne constitue pas un conseil médical et doit être validé par un professionnel de santé.
          </p>
          <p className="mt-1 font-medium">
            Two For Coaching Lab — Cet indicateur est une aide à la décision, interprétée par le coach.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
