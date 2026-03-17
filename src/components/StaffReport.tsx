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
  TrendingDown,
  Minus,
  Utensils,
  Activity,
  Download,
  Footprints,
  Info,
  Zap,
  ChevronDown,
  Clock,
  Calendar,
  Scale,
  Heart,
  Calculator,
  Shield,
  Lightbulb,
  Brain,
  Ban,
  ArrowRight,
  Crosshair,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getConfidenceLabel } from "@/lib/confidenceDisplay";
import { 
  StaffReport as StaffReportType, 
  generateStaffReport, 
  GenerateStaffReportParams,
  VO2maxAgeComparisonSection as VO2maxAgeComparisonSectionType 
} from "@/lib/staffReport";
import type { VLamaxEffectif, TTEEffectif } from "@/engines/diagnostic";
import { RaceReadinessEffectif } from "@/lib/raceReadinessEffectif";
import { NutritionEstimate } from "@/lib/nutritionPredictive";
import { RunningEconomyResult } from "@/lib/runningEconomy";
import { computeCAPInjuryRisk } from "@/lib/capInjuryRisk";
import { PerformanceRiskMatrixCompact } from "@/components/PerformanceRiskMatrix";
import { getAxisLabel, getAxisColor } from "@/lib/wahoo/wahooSuggestionEngine";
import { MetabolicPerformanceCompassV2 as MetabolicPerformanceCompass } from "@/components/charts/MetabolicPerformanceCompassV2";
import { AmbitionLevel, DEFAULT_AMBITION } from "@/types/ambitionLevel";
import { computePillarCalculations } from "@/components/ReadinessPillarDetail";
import { computeFullDRE, type DecisionReliabilityResult, type Scenario } from "@/engines/diagnostic";
import { DecisionReliabilityBadge, DecisionReliabilityProgress } from "@/components/DecisionReliabilityBadge";
import { computeLorangStrategy, type LorangStrategyInput, type LorangStrategyResult, LIMITER_DEFINITIONS, LEVER_DEFINITIONS } from "@/engines/decision";
import { 
  computeRaceReadinessSignature, 
  type RaceReadinessInput, 
  type RaceReadinessResult 
} from "@/components/RaceReadinessSignatureChart";
import { PacingEnvelopeBar, PacingEnvelopeBarInline } from "@/components/charts/PacingEnvelopeBar";
import { LongDistanceEnvelopeChart, LongDistanceEnvelopeInline } from "@/components/charts/LongDistanceEnvelopeChart";
import { computePacingEnvelope, type PacingEnvelopeInput, type RaceObjective } from "@/lib/v2/pacingEnvelopeEngine";
import { 
  computeLongDistanceEnvelope, 
  LONG_DISTANCE_THRESHOLD_HOURS,
  LONG_DISTANCE_PHILOSOPHY,
  type LongDistanceEnvelopeResult 
} from "@/lib/v2/pacingEnvelopeLongDistance";
import { computeFatMaxTFCL } from "@/lib/v2/fatmaxTFCL";
import type { DbSnapshot } from "@/hooks/useCloudData";
import { DoubleBoucleCAPSection } from "@/components/StaffReportDoubleBoucleCAP";
import type { RunningPhysioProfile, RunningWeeklyDecision } from "@/lib/v2/runningDoubleLoop";
import { LactateCorrespondenceCard } from "@/components/LactateCorrespondenceCard";
import { CoachingCompassCard } from "@/components/CoachingCompassCard";
import { computeCoachingCompass, type CoachingCompassInput } from "@/lib/coachingCompass";
import { computeFatigueEffectif } from "@/engines/diagnostic";
import { computeLactateThresholdsTFCL } from "@/lib/thresholds/computeLactateThresholdsTFCL";

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
  snapshotUpdatedAt?: string | null;
  athleteAge?: number | null;
  ambition?: AmbitionLevel;
  snapshot?: DbSnapshot | null;
  vo2max?: number | null;
  lorangInput?: LorangStrategyInput | null;
  raceReadinessSignatureInput?: RaceReadinessInput | null;
  runningProfile?: RunningPhysioProfile | null;
  runningWeeklyDecision?: RunningWeeklyDecision | null;
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
  snapshotUpdatedAt,
  athleteAge,
  ambition,
  snapshot,
  vo2max,
  lorangInput,
  raceReadinessSignatureInput,
  runningProfile,
  runningWeeklyDecision,
  onExportPDF,
}: StaffReportProps) {
  // Générer le rapport avec tous les paramètres pour calculs unifiés
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
    tss7d,
    snapshotUpdatedAt,
    athleteAge,
  });

  // ✅ DECISION RELIABILITY ENGINE - Calcul pour le rapport
  const decisionReliability: DecisionReliabilityResult = computeFullDRE({
    snapshotId: snapshot?.id ?? "",
    athleteId: snapshot?.athlete_id ?? "",
    coachId: snapshot?.coach_id ?? "",
    objective: objectif,
    
    vlamax: vlamaxEffectif.value,
    vlamaxConfidence: vlamaxEffectif.confidence,
    tteMin: tteEffectif.tte_min,
    tteConfidence: tteEffectif.confidence,
    fatmaxPct: null,
    vo2max: vo2max ?? null,
    ftp: ftp,
    weightKg: poids,
    p30s: (snapshot as unknown as Record<string, unknown>)?.p30s_w as number | null ?? null,
    p1min: (snapshot as unknown as Record<string, unknown>)?.p60s_w as number | null ?? null,
    map5min: (snapshot as unknown as Record<string, unknown>)?.map5min_w as number | null ?? null,
    pmax5s: snapshot?.pmax_5s ?? null,
    
    isReferenceWeek: (snapshot as unknown as Record<string, unknown>)?.vlamax_is_reference === true,
    fatigueState: ((snapshot as unknown as Record<string, unknown>)?.fatigue_state as string) === "fatigued" ? "fatigued" 
      : ((snapshot as unknown as Record<string, unknown>)?.fatigue_state as string) === "fresh" ? "fresh" 
      : "normal",
  });

  // ✅ PACING ENVELOPE™ TFCL - Calcul pour le rapport
  const raceObjectiveMap: Record<string, RaceObjective> = {
    "Ironman": "IM",
    "IM": "IM",
    "70.3": "70.3",
    "Ironman 70.3": "70.3",
    "Marathon": "Marathon",
    "Semi-Marathon": "Semi",
    "Semi": "Semi",
    "10km": "10km",
  };
  const pacingRaceObjective: RaceObjective = raceObjectiveMap[objectif] ?? "Marathon";
  const pacingSport: "bike" | "run" = objectif.includes("km") || objectif.includes("Marathon") || objectif.includes("Semi") ? "run" : "bike";
  
  const fatmax = computeFatMaxTFCL({
    vlamaxEffectif: vlamaxEffectif.value,
    vlamaxConfidence: vlamaxEffectif.confidence,
    vo2maxEffectif: vo2max ?? null,
    tteEffectif: tteEffectif.tte_min,
    tteConfidence: tteEffectif.confidence,
    fatigueIndex: null,
    objectif: pacingRaceObjective,
    ftp: ftp ?? null,
  });

  const pacingEnvelope = computePacingEnvelope({
    vlamaxEffectif,
    tteEffectif,
    fatmax,
    raceReadinessScore: readiness.score,
    fatigueIndex: null,
    raceObjective: pacingRaceObjective,
    sport: pacingSport,
    ftp: ftp ?? undefined,
    weight: poids ?? undefined,
  });

  // ✅ LONG DISTANCE PACING - Extension pour épreuves > 90min
  const raceDurationMap: Record<string, number> = {
    "Ironman": 10,
    "IM": 10,
    "70.3": 5,
    "Ironman 70.3": 5,
    "Marathon": 3.5,
    "Semi-Marathon": 1.75,
    "Semi": 1.75,
    "10km": 0.75,
  };
  const estimatedDurationHours = raceDurationMap[objectif] ?? 3;
  const isLongDistance = estimatedDurationHours >= LONG_DISTANCE_THRESHOLD_HOURS;

  const longDistanceEnvelope: LongDistanceEnvelopeResult | null = isLongDistance && pacingEnvelope
    ? computeLongDistanceEnvelope({
        baseEnvelope: pacingEnvelope,
        targetDurationHours: estimatedDurationHours,
        vlamaxValue: vlamaxEffectif.value,
        vlamaxConfidence: vlamaxEffectif.confidence,
        tteConfidence: tteEffectif.confidence,
        athleteAge: athleteAge ?? null,
        fatmaxPct: fatmax?.centerPctFTP ?? null,
        historicalFadePattern: null,
        glycogenAvailability: null,
      })
    : null;

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
        {/* 🧭 TFCL COACHING COMPASS™ — Première carte stratégique */}
        <StaffCompassSection
          vlamaxEffectif={vlamaxEffectif}
          tteEffectif={tteEffectif}
          readiness={readiness}
          ftp={ftp}
          poids={poids}
          vo2max={vo2max ?? null}
          tss7d={tss7d ?? null}
          snapshotDate={snapshotDate}
          snapshotUpdatedAt={snapshotUpdatedAt ?? null}
          snapshot={snapshot}
          lorangInput={lorangInput ?? null}
          ambition={ambition ?? DEFAULT_AMBITION}
          objectif={objectif}
          athleteAge={athleteAge ?? null}
        />

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

        {/* 1.5️⃣ DÉTAILS DE CALCUL RACE READINESS */}
        <RaceReadinessCalculationDetails readiness={readiness} />

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
                snapshotUpdatedAt: snapshotUpdatedAt ?? null,
                objectif,
                ambition: ambition || DEFAULT_AMBITION,
                athleteAge: athleteAge ?? null, // ✅ FIX: Ajout pour synchronisation TTE âge-ajusté
              }}
              compact={true}
              className="print:break-inside-avoid"
            />
          </div>
        </div>

        <Separator />

        {/* 2.4️⃣ CIBLES VO2MAX — COMPARATIF AVEC/SANS ÂGE */}
        <VO2maxAgeComparisonSection section={report.vo2maxAgeComparison} />

        {/* 2.4b CYCLE INTELLIGENCE ENGINE™ */}
        {report.cycleIntelligence && (
          <>
            <Separator />
            <div className="print:break-inside-avoid">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                🧠 CYCLE INTELLIGENCE™ — Analyse du bloc d'entraînement
              </h3>
              <div className="p-4 rounded-lg bg-muted/30 border mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold font-mono">{report.cycleIntelligence.adaptationScore}/100</span>
                  <span className="text-sm font-medium">{report.cycleIntelligence.verdictEmoji} {report.cycleIntelligence.verdictLabel}</span>
                </div>
                <p className="text-sm mb-2">{report.cycleIntelligence.summary}</p>
                <p className="text-xs text-muted-foreground">
                  Bloc de {report.cycleIntelligence.daysBetween} jours • {report.cycleIntelligence.previousDate} → {report.cycleIntelligence.currentDate}
                </p>
              </div>
              
              {/* Metrics table */}
              <table className="w-full text-xs mb-3">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 font-medium">Métrique</th>
                    <th className="text-center py-1 font-medium">Avant</th>
                    <th className="text-center py-1 font-medium">Après</th>
                    <th className="text-center py-1 font-medium">Évolution</th>
                  </tr>
                </thead>
                <tbody>
                  {report.cycleIntelligence.metrics.map((m, i) => (
                    <tr key={i} className="border-b border-muted/50">
                      <td className="py-1">{m.label}</td>
                      <td className="text-center font-mono">{m.previousValue}</td>
                      <td className="text-center font-mono">{m.currentValue}</td>
                      <td className="text-center">{m.evolution}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Limiter & Recommendation */}
              <div className="space-y-2 text-sm">
                <p><strong>Limiteur:</strong> {report.cycleIntelligence.limiterExplanation}</p>
                <p><strong>Recommandation:</strong> {report.cycleIntelligence.recommendationLabel} — {report.cycleIntelligence.recommendationDetail}</p>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* 2.5️⃣ DECISION RELIABILITY ENGINE™ — SCÉNARIOS DE COURSE */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" />
            DECISION RELIABILITY ENGINE™
            <DecisionReliabilityBadge 
              score={decisionReliability.decisionConfidenceScore} 
              level={decisionReliability.decisionLevel} 
            />
          </h3>
          
          {/* Score principal */}
          <div className="p-4 rounded-lg bg-muted/30 border mb-4">
            <DecisionReliabilityProgress 
              score={decisionReliability.decisionConfidenceScore} 
              level={decisionReliability.decisionLevel} 
            />
            <p className="text-sm text-center mt-2">{decisionReliability.mainMessage}</p>
            
            {decisionReliability.isReferenceWeek && (
              <div className="flex items-center justify-center gap-2 mt-2 text-xs text-primary">
                <CheckCircle className="w-3 h-3" />
                <span>Semaine de Référence TFCL (+{(decisionReliability.referenceWeekBoost * 100).toFixed(0)}% confiance)</span>
              </div>
            )}
          </div>
          
          {/* Scénarios de course */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              Scénarios de course
            </h4>
            <div className="grid md:grid-cols-3 gap-3">
              {decisionReliability.scenarios.map((scenario) => (
                <ScenarioCardCompact key={scenario.type} scenario={scenario} />
              ))}
            </div>
          </div>
          
          {/* Alertes */}
          {decisionReliability.warnings.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Alertes ({decisionReliability.warnings.length})
              </p>
              <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-1">
                {decisionReliability.warnings.slice(0, 3).map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}
          
          <p className="text-[10px] text-muted-foreground mt-3 italic">
            💡 "La meilleure décision possible, avec transparence sur l'incertitude" — DRE v1.0
          </p>
        </div>

        <Separator />

        {/* 2.6️⃣ LORANG STRATEGY ENGINE — LIMITER → LEVIER → DÉCISION */}
        {lorangInput && <LorangStrategySection input={lorangInput} />}

        {/* 2.7️⃣ RACE READINESS SIGNATURE — POTENTIEL × DISPONIBILITÉ → DÉCISION */}
        {raceReadinessSignatureInput && <RaceReadinessSignatureSection input={raceReadinessSignatureInput} />}

        {/* 2.8️⃣ DOUBLE BOUCLE CAP — PROFIL VERROUILLÉ + DÉCISION HEBDOMADAIRE */}
        {runningProfile && (
          <DoubleBoucleCAPSection 
            profile={runningProfile} 
            decision={runningWeeklyDecision} 
          />
        )}

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
                  {report.capInjuryRisk.vlamaxSource} • Fiabilité {getConfidenceLabel(report.capInjuryRisk.vlamaxConfidence)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">TTE effectif</p>
                <p className="font-bold">{report.capInjuryRisk.tteValue}</p>
                <p className="text-[10px] text-muted-foreground">
                  {report.capInjuryRisk.tteSource} • Fiabilité {getConfidenceLabel(report.capInjuryRisk.tteConfidence)}
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

        {/* 5.5️⃣ PACING ENVELOPE™ — DISCIPLINE MÉTABOLIQUE */}
        {pacingEnvelope && (
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              PACING ENVELOPE™ — DISCIPLINE MÉTABOLIQUE
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px]",
                  pacingEnvelope.confidenceLevel === "HIGH" && "border-emerald-500/50 text-emerald-600",
                  pacingEnvelope.confidenceLevel === "MEDIUM" && "border-blue-500/50 text-blue-600",
                  pacingEnvelope.confidenceLevel === "LOW" && "border-amber-500/50 text-amber-600"
                )}
              >
                Confiance {pacingEnvelope.confidenceLabel}
              </Badge>
            </h3>
            
            {/* Graphique signature TFCL */}
            <PacingEnvelopeBar
              envelope={pacingEnvelope}
              targetIntensityPct={pacingEnvelope.boundary.centerPct}
              targetLabel="Intensité cible course"
              showFatmaxMarker={true}
              showMLSSMarker={true}
              fatmaxPct={fatmax?.centerPctFTP}
              mlssPct={pacingEnvelope.boundary.highPct + 3}
              staffMode={true}
              compact={false}
              className="print:break-inside-avoid"
            />
            
            {/* Explication staff */}
            <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1">
                <Info className="h-3 w-3" />
                Pourquoi le pacing est contraint par la physiologie, pas l'ambition
              </p>
              <p className="text-xs text-muted-foreground">
                Pour cet athlète, aller plus fort en début de course <strong>réduira</strong> la performance finale.
                L'enveloppe de pacing est calculée à partir du profil métabolique réel: VLamax ({vlamaxEffectif.value?.toFixed(2) ?? "N/A"}), 
                TTE ({tteEffectif.tte_min}min), et FatMax estimé.
              </p>
              
              {pacingEnvelope.pacingProfile.type === "sensitive" && (
                <div className="mt-3 p-2 rounded bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <p className="text-[10px] text-purple-700 dark:text-purple-300">
                    ⚠️ <strong>Profil sensible détecté.</strong> {pacingEnvelope.pacingProfile.description}
                  </p>
                </div>
              )}
              
              {pacingEnvelope.readinessMessage && (
                <div className="mt-2 p-2 rounded bg-muted/50">
                  <p className="text-[10px] text-muted-foreground">
                    📉 Race Readiness: {pacingEnvelope.readinessMessage}
                  </p>
                </div>
              )}
            </div>
            
            <p className="text-[10px] text-muted-foreground mt-3 italic text-center">
              💡 "{pacingEnvelope.methodology}"
            </p>
          </div>
        )}

        {/* 5.6️⃣ LONG DISTANCE PACING DISCIPLINE — Pour événements > 90min */}
        {longDistanceEnvelope && (
          <div className="print:break-inside-avoid">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              LONG DISTANCE PACING DISCIPLINE
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px]",
                  longDistanceEnvelope.ldri.level === "low" && "border-emerald-500/50 text-emerald-600",
                  longDistanceEnvelope.ldri.level === "moderate" && "border-blue-500/50 text-blue-600",
                  longDistanceEnvelope.ldri.level === "high" && "border-amber-500/50 text-amber-600",
                  longDistanceEnvelope.ldri.level === "critical" && "border-red-500/50 text-red-600"
                )}
              >
                LDRI: {longDistanceEnvelope.ldri.score}/100
              </Badge>
              <Badge variant="outline" className="text-[10px]">
                ~{estimatedDurationHours}h
              </Badge>
            </h3>
            
            {/* Graphique Long Distance */}
            <LongDistanceEnvelopeChart
              envelope={longDistanceEnvelope}
              currentTargetPct={longDistanceEnvelope.disciplineBuffer.disciplineTargetPct}
              staffMode={true}
              compact={false}
              className="print:break-inside-avoid"
            />
            
            {/* Section explicative staff */}
            <div className="mt-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs font-medium text-primary mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {longDistanceEnvelope.keyMessages.staffReportMessage}
              </p>
              
              {/* Discipline Target vs Safe Zone */}
              <div className="grid grid-cols-2 gap-4 mt-3 p-3 rounded bg-muted/30">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground mb-1">Cible Discipline</p>
                  <p className="text-xl font-bold text-primary">
                    {longDistanceEnvelope.disciplineBuffer.disciplineTargetPct}%
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {longDistanceEnvelope.disciplineBuffer.bufferMarginPct}% sous le max
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground mb-1">Seuil Glycogène</p>
                  <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                    {longDistanceEnvelope.glycogenThreshold.thresholdPct}%
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    Max {longDistanceEnvelope.glycogenThreshold.maxDurationMinutes}min au-dessus
                  </p>
                </div>
              </div>
              
              {/* Avertissement banking time */}
              <div className="mt-3 p-2 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-[10px] text-red-700 dark:text-red-300">
                  <strong>⛔ INTERDICTION de "banker du temps"</strong> — 
                  Chaque minute gagnée précocement coûte 3-5 minutes en fin de course.
                </p>
              </div>
              
              {/* Conséquences scénarios */}
              <div className="mt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">Scénarios de pacing:</p>
                <div className="grid grid-cols-3 gap-2">
                  {longDistanceEnvelope.scenarios.map((scenario) => (
                    <div 
                      key={scenario.type}
                      className={cn(
                        "p-2 rounded-lg border text-center",
                        scenario.color === "green" && "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800",
                        scenario.color === "orange" && "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
                        scenario.color === "red" && "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                      )}
                    >
                      <p className={cn(
                        "text-[10px] font-bold",
                        scenario.color === "green" && "text-emerald-700 dark:text-emerald-300",
                        scenario.color === "orange" && "text-amber-700 dark:text-amber-300",
                        scenario.color === "red" && "text-red-700 dark:text-red-300"
                      )}>
                        {scenario.label}
                      </p>
                      <p className="text-lg font-bold">{scenario.avgIntensityPct}%</p>
                      <p className="text-[9px] text-muted-foreground">{scenario.outcome}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Phrase signature Long Distance */}
            <div className="mt-3 p-3 rounded-lg bg-muted/50 border text-center">
              <p className="text-xs italic text-muted-foreground">
                "{LONG_DISTANCE_PHILOSOPHY.discipline}"
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                L'objectif n'est pas de se sentir fort au départ. L'objectif est d'ÊTRE ENCORE FORT à l'arrivée.
              </p>
            </div>
          </div>
        )}

        <Separator />

        {/* 6️⃣ NUTRITION — VERSION STAFF */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Utensils className="h-4 w-4" />
            NUTRITION PRÉDICTIVE V2
            <Badge variant="outline" className="text-[10px]">
              {report.nutritionV2Detailed.glycogenRiskIcon} {report.nutritionV2Detailed.glycogenRisk}
            </Badge>
          </h3>
          <div className={cn(
            "p-4 rounded-lg border",
            report.nutritionV2Detailed.glycogenRiskScore >= 3 
              ? "bg-red-500/5 border-red-500/20" 
              : "bg-muted/30"
          )}>
            {/* Besoins principaux */}
            <div className="grid grid-cols-3 gap-4 text-sm mb-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Besoins glucides</p>
                <p className="font-bold text-lg">{report.nutritionV2Detailed.carbsMin}–{report.nutritionV2Detailed.carbsMax} g/h</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Risque déplétion</p>
                <p className="font-bold text-lg">{report.nutritionV2Detailed.glycogenRiskIcon} {report.nutritionV2Detailed.glycogenRisk}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Sport</p>
                <p className="font-bold">{report.nutritionV2Detailed.sportLabel}</p>
              </div>
            </div>
            
            {/* Contributeurs détaillés */}
            <div className="mb-4 p-3 rounded bg-background/50">
              <p className="text-xs font-medium text-muted-foreground mb-2">Composition du calcul :</p>
              <div className="space-y-1">
                {report.nutritionV2Detailed.contributors.map((c, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{c.label}</span>
                    <span className="font-mono">{c.adjustment}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Stratégie par segment (triathlon/marathon) */}
            {report.nutritionV2Detailed.segmentStrategy && (
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Stratégie par segment :</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1">Segment</th>
                        <th className="text-left py-1">Durée</th>
                        <th className="text-left py-1">g/h</th>
                        <th className="text-left py-1">Total</th>
                        <th className="text-left py-1">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.nutritionV2Detailed.segmentStrategy.map((seg, i) => (
                        <tr key={i} className="border-b border-muted">
                          <td className="py-1 font-medium">{seg.segment}</td>
                          <td className="py-1">{seg.duration}</td>
                          <td className="py-1">{seg.carbsPerHour}</td>
                          <td className="py-1 font-bold">{seg.totalGrams}g</td>
                          <td className="py-1 text-muted-foreground">{seg.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {report.nutritionV2Detailed.totalRaceCarbs && (
                  <p className="text-xs font-bold mt-2">
                    Total course : ~{report.nutritionV2Detailed.totalRaceCarbs}g de glucides
                  </p>
                )}
              </div>
            )}
            
            {/* Recommandations */}
            {report.nutritionV2Detailed.recommendations.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">Recommandations :</p>
                <ul className="text-xs space-y-0.5">
                  {report.nutritionV2Detailed.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-primary">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Warnings */}
            {report.nutritionV2Detailed.warnings.length > 0 && (
              <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20">
                {report.nutritionV2Detailed.warnings.map((w, i) => (
                  <p key={i} className="text-[10px] text-amber-700 dark:text-amber-400">⚠️ {w}</p>
                ))}
              </div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 italic">
            ⚠️ Estimation uniquement. Pas de plan alimentaire détaillé – valider avec un nutritionniste.
          </p>
        </div>

        <Separator />
        
        {/* 7️⃣ PROFIL MÉTABOLIQUE COMPLET */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Activity className="h-4 w-4" />
            PROFIL MÉTABOLIQUE COMPLET
            <Badge variant="outline" className="text-[10px]">
              {report.metabolicProfileComplete.overallBalanceLabel}
            </Badge>
          </h3>
          <div className="p-4 rounded-lg bg-muted/30 border">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 rounded bg-background/50">
                <p className="text-xs text-muted-foreground">VLamax</p>
                <p className="font-bold text-lg">{report.metabolicProfileComplete.vlamaxLabel}</p>
                <Badge variant="outline" className="text-[9px] mt-1">{report.metabolicProfileComplete.vlamaxCategory}</Badge>
              </div>
              <div className="text-center p-3 rounded bg-background/50">
                <p className="text-xs text-muted-foreground">TTE</p>
                <p className="font-bold text-lg">{report.metabolicProfileComplete.tteLabel}</p>
                <Badge variant="outline" className="text-[9px] mt-1">{report.metabolicProfileComplete.tteCategory}</Badge>
              </div>
              <div className="text-center p-3 rounded bg-background/50">
                <p className="text-xs text-muted-foreground">FTP/kg</p>
                <p className="font-bold text-lg">{report.metabolicProfileComplete.ftpKgLabel}</p>
                <Badge variant="outline" className="text-[9px] mt-1">{report.metabolicProfileComplete.ftpKgCategory}</Badge>
              </div>
            </div>
            
            <p className="text-sm mb-3">{report.metabolicProfileComplete.interpretation}</p>
            
            {report.metabolicProfileComplete.gaps.length > 0 && (
              <div className="p-3 rounded bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mb-2">Écarts à combler :</p>
                {report.metabolicProfileComplete.gaps.map((gap, i) => (
                  <p key={i} className="text-xs text-amber-700 dark:text-amber-400">
                    • <strong>{gap.metric}</strong> : {gap.gap}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        <Separator />
        
        {/* 8️⃣ LEVIERS D'ENTRAÎNEMENT */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            LEVIERS D'ENTRAÎNEMENT — {report.trainingLeversSection.sportLabel.toUpperCase()}
          </h3>
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-3">
            <p className="text-sm font-medium italic">"{report.trainingLeversSection.keyStatement}"</p>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
              <h4 className="text-xs font-semibold text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" /> Prioritaires
              </h4>
              {report.trainingLeversSection.priorityLevers.map((l, i) => (
                <div key={i} className="text-xs mb-2">
                  <p className="font-medium">{l.name}</p>
                  <p className="text-muted-foreground">{l.effect}</p>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Prudence
              </h4>
              {report.trainingLeversSection.cautionLevers.map((l, i) => (
                <div key={i} className="text-xs mb-2">
                  <p className="font-medium">{l.name}</p>
                  <p className="text-muted-foreground">Si : {l.conditions.join(", ")}</p>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
              <h4 className="text-xs font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-1">
                <XCircle className="h-3 w-3" /> À éviter
              </h4>
              {report.trainingLeversSection.discouragedLevers.map((l, i) => (
                <div key={i} className="text-xs mb-2">
                  <p className="font-medium">{l.name}</p>
                  <p className="text-muted-foreground">{l.reason}</p>
                </div>
              ))}
              {report.trainingLeversSection.discouragedLevers.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucune contre-indication majeure</p>
              )}
            </div>
          </div>
        </div>

        <Separator />
        
        {/* 9️⃣ MÉTHODOLOGIE RECOMMANDÉE */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            MÉTHODOLOGIE RECOMMANDÉE
          </h3>
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 mb-3">
            <p className="font-bold text-lg mb-1">{report.methodologyRecommendation.recommendedApproachLabel}</p>
            <p className="text-sm">{report.methodologyRecommendation.justification}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground mb-2">Principes clés :</p>
              <ul className="text-xs space-y-1">
                {report.methodologyRecommendation.keyPrinciples.map((p, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-primary">•</span> {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground mb-2">Alternatives :</p>
              {report.methodologyRecommendation.alternativeApproaches.map((a, i) => (
                <div key={i} className="text-xs flex justify-between mb-1">
                  <span>{a.name}</span>
                  <Badge variant="outline" className="text-[9px]">{a.suitability}</Badge>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 italic">
            {report.methodologyRecommendation.disclaimer}
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
                          Fiabilité : {getConfidenceLabel(suggestion.confidence)}
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

        {/* 8️⃣ SEUILS TFCL & CORRESPONDANCE LACTIQUE */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            💧 SEUILS TFCL & CORRESPONDANCE LACTIQUE
          </h3>
          <LactateCorrespondenceCard
            vlamaxEffectif={vlamaxEffectif}
            tteEffectif={tteEffectif}
            ftp={ftp}
            sport={objectif}
            staffMode={true}
          />
        </div>
        <Separator />

        {/* 9️⃣ FEU TRICOLORE FINAL */}
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

/**
 * Composant pour afficher les détails de calcul Race Readiness dans le rapport exporté
 */
function RaceReadinessCalculationDetails({ readiness }: { readiness: RaceReadinessEffectif }) {
  const calculations = computePillarCalculations(readiness);
  
  const pillars = [
    { key: "vlamax" as const, label: "VLamax", icon: <Zap className="w-4 h-4 text-primary" />, weight: readiness.weights.vlamax },
    { key: "endurance" as const, label: "Endurance (TTE)", icon: <Activity className="w-4 h-4 text-accent" />, weight: readiness.weights.tte },
    { key: "puissance" as const, label: "Puissance (FTP/kg)", icon: <TrendingUp className="w-4 h-4 text-warning" />, weight: readiness.weights.ftpKg },
    { key: "fraicheur" as const, label: "Disponibilité", icon: <Heart className="w-4 h-4 text-success" />, weight: readiness.weights.freshness },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "optimal": return "text-success bg-success/10 border-success/30";
      case "acceptable": return "text-warning bg-warning/10 border-warning/30";
      case "needs_work": return "text-destructive bg-destructive/10 border-destructive/30";
      default: return "text-muted-foreground bg-muted/30 border-border";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "optimal": return "Optimal";
      case "acceptable": return "Acceptable";
      case "needs_work": return "À améliorer";
      default: return "Manquant";
    }
  };

  return (
    <div className="print:break-inside-avoid">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <Calculator className="h-4 w-4" />
        DÉTAILS DE CALCUL — RACE READINESS ({readiness.score}/100)
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {pillars.map(pillar => {
          const calc = calculations[pillar.key];
          return (
            <div 
              key={pillar.key}
              className={cn(
                "p-3 rounded-lg border",
                getStatusColor(calc.status)
              )}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {pillar.icon}
                  <span className="font-semibold text-sm">{pillar.label}</span>
                  <span className="text-xs text-muted-foreground">({pillar.weight}%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{calc.finalScore}/25</span>
                  <Badge variant="outline" className="text-[10px]">
                    {getStatusLabel(calc.status)}
                  </Badge>
                </div>
              </div>
              
              {/* Valeurs */}
              <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                <div className="p-1.5 rounded bg-background/50">
                  <span className="text-muted-foreground">Actuel: </span>
                  <span className="font-mono font-medium">
                    {calc.currentValue !== null
                      ? pillar.key === "vlamax"
                        ? calc.currentValue.toFixed(2)
                        : pillar.key === "endurance"
                        ? `${calc.currentValue} min`
                        : pillar.key === "puissance"
                        ? `${calc.currentValue.toFixed(1)} W/kg`
                        : `${Math.round(calc.rawScore)}%`
                      : "—"}
                  </span>
                </div>
                <div className="p-1.5 rounded bg-primary/5">
                  <span className="text-muted-foreground">Cible: </span>
                  <span className="font-mono font-medium text-primary">
                    {pillar.key === "vlamax"
                      ? `≤${calc.targetValue.toFixed(2)}`
                      : pillar.key === "endurance"
                      ? `≥${calc.targetValue} min`
                      : pillar.key === "puissance"
                      ? `≥${calc.targetValue.toFixed(1)} W/kg`
                      : "≥70%"}
                  </span>
                </div>
              </div>
              
              {/* Formule */}
              <div className="p-2 rounded bg-muted/20 mb-2">
                <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Calcul:</p>
                <p className="text-[10px] font-mono">{calc.formula}</p>
              </div>
              
              {/* Explication */}
              <p className="text-[10px] text-muted-foreground italic">
                💡 {calc.explanation}
              </p>
            </div>
          );
        })}
      </div>
      
      {/* Légende */}
      <div className="mt-3 p-2 rounded-lg bg-muted/20 border text-[10px] text-muted-foreground">
        <strong>Score final:</strong> Σ (Score pilier × Poids) = {readiness.score}/100 • 
        <strong className="ml-2">Fiabilité :</strong> {getConfidenceLabel(readiness.confidence)}
      </div>
    </div>
  );
}

// =====================================================
// SCENARIO CARD COMPACT (pour StaffReport PDF)
// =====================================================

interface ScenarioCardCompactProps {
  scenario: Scenario;
}

function ScenarioCardCompact({ scenario }: ScenarioCardCompactProps) {
  const config = {
    conservative: {
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/30",
      icon: Shield
    },
    optimal: {
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
      icon: Target
    },
    aggressive: {
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/30",
      icon: TrendingUp
    }
  };

  const c = config[scenario.type];
  const Icon = c.icon;

  const riskIcon = (level: 'low' | 'medium' | 'high') => {
    if (level === 'low') return <TrendingDown className="w-2.5 h-2.5 text-emerald-500" />;
    if (level === 'medium') return <Minus className="w-2.5 h-2.5 text-yellow-500" />;
    return <TrendingUp className="w-2.5 h-2.5 text-red-500" />;
  };

  return (
    <div className={cn("p-3 rounded-lg border", c.bgColor, c.borderColor)}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn("w-4 h-4", c.color)} />
        <span className={cn("font-semibold text-sm", c.color)}>{scenario.label}</span>
      </div>
      <p className="text-[11px] text-muted-foreground mb-2 leading-relaxed">{scenario.recommendation}</p>
      <div className="flex gap-2 text-[9px] border-t pt-2 mt-2">
        <span className="flex items-center gap-0.5">
          {riskIcon(scenario.risks.fatigue)} Fatigue
        </span>
        <span className="flex items-center gap-0.5">
          {riskIcon(scenario.risks.injury)} Blessure
        </span>
        <span className="flex items-center gap-0.5">
          {riskIcon(scenario.risks.glycogenDepletion)} Glycogène
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VO2MAX AGE COMPARISON SECTION — Comparatif avec/sans ajustement d'âge
// ═══════════════════════════════════════════════════════════════════════════════

function VO2maxAgeComparisonSection({ section }: { section: VO2maxAgeComparisonSectionType }) {
  return (
    <div className="print:break-inside-avoid">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
        <Activity className="h-4 w-4" />
        CIBLES VO₂MAX — COMPARATIF AVEC/SANS ÂGE
        {section.hasAgeAdjustment && (
          <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/30">
            <Calendar className="w-3 h-3 mr-1" />
            {section.age} ans (−{section.reductionPercent}%)
          </Badge>
        )}
      </h3>
      
      {/* Contexte */}
      <div className="mb-4 p-3 rounded-lg bg-muted/30 border">
        <p className="text-xs text-muted-foreground">{section.explanation}</p>
      </div>
      
      {/* Tableau comparatif */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 font-medium text-muted-foreground">Ambition</th>
              <th className="text-center py-2 font-medium text-muted-foreground">Cible &lt;30 ans</th>
              <th className="text-center py-2 font-medium text-muted-foreground">
                Cible ajustée
                {section.hasAgeAdjustment && <Calendar className="w-3 h-3 inline ml-1" />}
              </th>
              <th className="text-center py-2 font-medium text-muted-foreground">Δ</th>
            </tr>
          </thead>
          <tbody>
            {section.rows.map((row) => (
              <tr 
                key={row.ambition}
                className={cn(
                  "border-b border-border/50",
                  row.isCurrent && "bg-primary/5"
                )}
              >
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <span>{row.emoji}</span>
                    <span className={cn("font-medium", row.isCurrent && "text-primary")}>
                      {row.ambitionLabel}
                    </span>
                    {row.isCurrent && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-primary/10 text-primary border-primary/30">
                        Actuel
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="text-center py-2 font-mono text-xs">
                  {row.baseTarget} ml/kg/min
                </td>
                <td className="text-center py-2">
                  <span className={cn(
                    "font-mono text-xs font-semibold",
                    section.hasAgeAdjustment ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                  )}>
                    {row.adjustedTarget} ml/kg/min
                  </span>
                </td>
                <td className="text-center py-2">
                  {section.hasAgeAdjustment ? (
                    <span className="font-mono text-[10px] text-amber-600 dark:text-amber-400">
                      {row.difference > 0 ? "+" : ""}{row.difference.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* VO2max actuel si disponible */}
      {section.currentVo2max !== null && (
        <div className="mt-3 p-3 bg-primary/10 rounded-lg border border-primary/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">VO₂max actuel</span>
            </div>
            <span className="font-mono font-bold text-primary">
              {Math.round(section.currentVo2max)} ml/kg/min
            </span>
          </div>
        </div>
      )}
      
      <p className="text-[10px] text-muted-foreground mt-3 italic">
        💡 "Le déclin naturel du VO₂max (~7-10%/décennie après 30 ans) est compensé pour maintenir des objectifs réalistes et motivants."
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LORANG STRATEGY SECTION — Pour le rapport PDF
// ═══════════════════════════════════════════════════════════════════════════════

function LorangStrategySection({ input }: { input: LorangStrategyInput }) {
  const result = computeLorangStrategy(input);
  
  // Config des couleurs pour les limiteurs
  const limiterColors: Record<string, { bg: string; border: string; text: string }> = {
    motor: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-700 dark:text-blue-400" },
    glycolytic: { bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive" },
    metabolic: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-700 dark:text-amber-400" },
    neuromuscular: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-700 dark:text-orange-400" },
    availability: { bg: "bg-slate-500/10", border: "border-slate-500/30", text: "text-slate-700 dark:text-slate-400" },
  };
  
  const limiterStyle = limiterColors[result.primaryLimiter] || limiterColors.motor;
  
  return (
    <>
      <Separator />
      
      <div className="print:break-inside-avoid">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Brain className="h-4 w-4" />
          TFCL STRATEGY ENGINE — LIMITER → LEVIER → DÉCISION
          <Badge variant="outline" className="text-[10px]">TFCL Method™</Badge>
        </h3>
        
        {/* Flow Chart Compact */}
        <div className="flex flex-col md:flex-row items-stretch gap-2 mb-4">
          {/* Block 1: Limiter */}
          <div className={cn(
            "flex-1 p-3 rounded-lg border",
            limiterStyle.bg,
            limiterStyle.border
          )}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{result.limiterIcon}</span>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Limiteur</p>
                <p className={cn("text-sm font-bold", limiterStyle.text)}>
                  {result.limiterLabel}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">{result.limiterExplanation}</p>
          </div>
          
          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center px-2">
            <ArrowRight className="h-4 w-4 text-primary" />
          </div>
          
          {/* Block 2: Levers */}
          <div className="flex-1 p-3 rounded-lg border border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Leviers</p>
                <p className="text-sm font-bold text-primary">
                  {result.activatedLevers.length} levier{result.activatedLevers.length > 1 ? 's' : ''} actif{result.activatedLevers.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="space-y-1">
              {result.activatedLevers.slice(0, 2).map((lever) => (
                <div key={lever.lever} className="flex items-center gap-1 text-xs">
                  <span>{lever.icon}</span>
                  <span className="font-medium">{lever.label}</span>
                  <Badge variant="outline" className="text-[8px] h-3 px-1">P{lever.priority}</Badge>
                </div>
              ))}
            </div>
          </div>
          
          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center px-2">
            <ArrowRight className="h-4 w-4 text-primary" />
          </div>
          
          {/* Block 3: Decision */}
          <div className="flex-1 p-3 rounded-lg border border-green-500/30 bg-green-500/5">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Décision</p>
                <p className="text-sm font-bold text-green-700 dark:text-green-400">
                  {result.templateSuggestion.weekLabel}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">{result.templateSuggestion.reasoning}</p>
          </div>
        </div>
        
        {/* Sprint Ban Warning */}
        {result.hasSprintBan && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 border border-destructive/30 mb-3">
            <Ban className="h-4 w-4 text-destructive" />
            <span className="text-xs font-medium text-destructive">Sprint Ban Mode ON — Sprints et micro-intervalles explosifs interdits</span>
          </div>
        )}
        
        {/* Summary */}
        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
            <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" /> Action principale
            </p>
            <p className="text-xs">{result.summary.mainAction}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{result.summary.whyThis}</p>
          </div>
          <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <p className="text-xs font-medium text-destructive mb-1 flex items-center gap-1">
              <XCircle className="h-3 w-3" /> À éviter
            </p>
            <p className="text-xs">{result.summary.whyNotOthers}</p>
          </div>
        </div>
        
        {/* Prohibitions */}
        {result.prohibitions.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-destructive mb-2">Interdictions actives :</p>
            <div className="flex flex-wrap gap-2">
              {result.prohibitions.map((p) => (
                <Badge key={p.prohibition} variant="outline" className="text-[10px] border-destructive/50 text-destructive">
                  ❌ {p.label}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Confidence */}
        <div className="flex items-center justify-between text-[10px]">
          <Badge 
            variant="outline" 
            className={cn(
              result.confidence === 'high' 
                ? "border-green-500/50 text-green-600"
                : result.confidence === 'moderate'
                ? "border-amber-500/50 text-amber-600"
                : "border-destructive/50 text-destructive"
            )}
          >
            Confiance : {result.confidenceLabel}
          </Badge>
          <span className="text-muted-foreground italic">{result.disclaimer}</span>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RACE READINESS SIGNATURE SECTION — Potentiel × Disponibilité → Décision
// ═══════════════════════════════════════════════════════════════════════════════

function RaceReadinessSignatureSection({ input }: { input: RaceReadinessInput }) {
  const result = computeRaceReadinessSignature(input);
  
  // Couleurs des zones de décision
  const zoneColors: Record<string, { bg: string; border: string; text: string }> = {
    red: { bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive" },
    orange: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-700 dark:text-amber-400" },
    green: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-700 dark:text-green-400" },
    blue: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-700 dark:text-blue-400" },
  };
  
  const zoneStyle = zoneColors[result.decisionZone] || zoneColors.orange;
  
  return (
    <>
      <Separator />
      
      <div className="print:break-inside-avoid">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Crosshair className="h-4 w-4" />
          RACE READINESS SIGNATURE — POTENTIEL × DISPONIBILITÉ → DÉCISION
          <Badge variant="outline" className="text-[10px]">TFCL Method™</Badge>
        </h3>
        
        {/* Matrice 2D simplifiée */}
        <div className="flex flex-col md:flex-row items-stretch gap-2 mb-4">
          {/* Block 1: Potentiel Physiologique */}
          <div className="flex-1 p-3 rounded-lg border border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Potentiel Physiologique</p>
                <p className="text-sm font-bold text-primary">
                  {result.potentialLabel} ({result.potentialScore}/100)
                </p>
              </div>
            </div>
            <div className="space-y-0.5">
              {result.potentialReasons.slice(0, 2).map((reason, i) => (
                <p key={i} className="text-[10px] text-muted-foreground">• {reason}</p>
              ))}
            </div>
          </div>
          
          {/* Opérateur × */}
          <div className="hidden md:flex items-center justify-center px-2">
            <span className="text-xl font-bold text-muted-foreground">×</span>
          </div>
          
          {/* Block 2: Disponibilité */}
          <div className="flex-1 p-3 rounded-lg border border-green-500/30 bg-green-500/5">
            <div className="flex items-center gap-2 mb-2">
              <Heart className="h-4 w-4 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Disponibilité / Fraîcheur</p>
                <p className="text-sm font-bold text-green-700 dark:text-green-400">
                  {result.availabilityLabel} ({result.availabilityScore}/100)
                </p>
              </div>
            </div>
            <div className="space-y-0.5">
              {result.availabilityReasons.slice(0, 2).map((reason, i) => (
                <p key={i} className="text-[10px] text-muted-foreground">• {reason}</p>
              ))}
            </div>
          </div>
          
          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center px-2">
            <ArrowRight className="h-4 w-4 text-primary" />
          </div>
          
          {/* Block 3: Décision */}
          <div className={cn(
            "flex-1 p-3 rounded-lg border",
            zoneStyle.bg,
            zoneStyle.border
          )}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{result.decisionIcon}</span>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Décision TFCL</p>
                <p className={cn("text-sm font-bold", zoneStyle.text)}>
                  {result.recommendation.title}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">{result.recommendation.message}</p>
          </div>
        </div>
        
        {/* Actions recommandées */}
        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs font-medium text-primary mb-1 flex items-center gap-1">
              <Lightbulb className="h-3 w-3" /> Actions recommandées
            </p>
            <ul className="space-y-0.5">
              {result.recommendation.actions.map((action, i) => (
                <li key={i} className="text-xs text-muted-foreground">• {action}</li>
              ))}
            </ul>
          </div>
          <div className={cn(
            "p-3 rounded-lg border",
            result.confidenceReasons.length > 0 ? "bg-amber-500/5 border-amber-500/20" : "bg-green-500/5 border-green-500/20"
          )}>
            <p className={cn(
              "text-xs font-medium mb-1 flex items-center gap-1",
              result.confidenceReasons.length > 0 ? "text-amber-700 dark:text-amber-400" : "text-green-700 dark:text-green-400"
            )}>
              <Info className="h-3 w-3" /> Confiance : {result.confidenceLabel}
            </p>
            {result.confidenceReasons.length > 0 ? (
              <ul className="space-y-0.5">
                {result.confidenceReasons.map((reason, i) => (
                  <li key={i} className="text-[10px] text-muted-foreground">⚠️ {reason}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[10px] text-muted-foreground">Données suffisantes pour une décision robuste.</p>
            )}
          </div>
        </div>
        
        {/* Philosophie */}
        <p className="text-[10px] text-muted-foreground italic">
          💡 "Race Readiness ≠ Fitness. Capacité à exprimer son potentiel le jour J, pas la valeur maximale de ce potentiel."
        </p>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAFF COMPASS SECTION — Intégration Compass dans le rapport PDF
// ═══════════════════════════════════════════════════════════════════════════════

function StaffCompassSection({
  vlamaxEffectif,
  tteEffectif,
  readiness,
  ftp,
  poids,
  vo2max,
  tss7d,
  snapshotDate,
  snapshotUpdatedAt,
  snapshot,
  lorangInput,
  ambition,
  objectif,
  athleteAge,
}: {
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  readiness: RaceReadinessEffectif;
  ftp: number | null;
  poids: number | null;
  vo2max: number | null;
  tss7d: number | null;
  snapshotDate: string;
  snapshotUpdatedAt: string | null;
  snapshot?: DbSnapshot | null;
  lorangInput: LorangStrategyInput | null;
  ambition: AmbitionLevel;
  objectif: string;
  athleteAge: number | null;
}) {
  // Compute Lorang Strategy if input available
  let lorangResult: LorangStrategyResult | null = null;
  if (lorangInput) {
    try { lorangResult = computeLorangStrategy(lorangInput); } catch { /* fallback */ }
  }

  // Compute fatigue
  const fatigueStateToPercue: Record<string, number> = { fresh: 2, ok: 4, fatigued: 7, very_fatigued: 9 };
  const fatiguePercue = fatigueStateToPercue[(snapshot as any)?.fatigue_state || "ok"] ?? 4;
  const fatigueEff = computeFatigueEffectif({
    tss7d,
    tss7dHabituel: null,
    fatiguePercue,
    tteEffectif,
    raceReadiness: readiness,
    vlamaxEffectif,
    age: athleteAge,
    objectif,
  });

  // Compute lactate thresholds
  const lt = computeLactateThresholdsTFCL({
    ftp,
    sport: snapshot?.sport_main,
    tteValue: tteEffectif.tte_min,
    tteSource: tteEffectif.source === 'observed' ? 'observed' : 'estimated',
    vlamaxValue: vlamaxEffectif.value,
    vlamaxSource: vlamaxEffectif.source === 'test' ? 'test' : 'estimated',
  });

  const compassInput: CoachingCompassInput = {
    ftp,
    poids,
    vo2max,
    tss7d,
    snapshotDate,
    snapshotUpdatedAt,
    pmax5s: snapshot?.pmax_5s ?? null,
    p30sW: snapshot?.p30s_w ?? null,
    p60sW: snapshot?.p60s_w ?? null,
    map5minW: snapshot?.map5min_w ?? null,
    runEconomyScore: snapshot?.run_economy_score ?? null,
    hrDriftPct: snapshot?.run_hr_drift_pct ?? null,
    vma: snapshot?.vma ?? null,
    paceThresholdSecPerKm: snapshot?.pace_threshold_sec_per_km ?? null,
    fatmax: null,
    vlamaxEffectif: { value: vlamaxEffectif.value, confidence: vlamaxEffectif.confidence, source: vlamaxEffectif.source },
    tteEffectif: { tte_min: tteEffectif.tte_min, confidence: tteEffectif.confidence, source: tteEffectif.source },
    fatigueEffectif: { score: fatigueEff.score, level: String(fatigueEff.level), confidence: fatigueEff.confidence },
    limiterResult: null,
    raceReadiness: {
      score: readiness.score,
      potential: (readiness as any).potential ?? readiness.score,
      availability: (readiness as any).availability ?? 80,
      governingFactor: (readiness as any).governingFactor ?? "potential",
      label: readiness.label || "",
      color: readiness.color || "warning",
    },
    strategyResult: lorangResult ? {
      primaryLimiter: lorangResult.primaryLimiter,
      limiterLabel: lorangResult.limiterLabel,
      limiterExplanation: lorangResult.limiterExplanation,
      activatedLevers: lorangResult.activatedLevers.map(l => ({
        lever: l.lever, label: l.label, priority: l.priority, reason: l.reason, prescription: l.prescription,
      })),
      prohibitions: lorangResult.prohibitions.map(p => ({ label: p.label, reason: p.reason })),
      hasSprintBan: lorangResult.hasSprintBan,
      summary: lorangResult.summary,
      templateSuggestion: lorangResult.templateSuggestion,
      athleteMessage: lorangResult.athleteMessage,
      confidence: lorangResult.confidence,
    } : null,
    lactateThresholds: {
      lt1: lt.lt1.watts != null ? { watts: lt.lt1.watts, pct_of_ftp: lt.lt1.pct_of_ftp, confidence: lt.lt1.confidence } : null,
      lt2: lt.lt2.watts != null ? { watts: lt.lt2.watts, pct_of_ftp: lt.lt2.pct_of_ftp, confidence: lt.lt2.confidence } : null,
    },
    wprimeKj: null,
    objectif,
    ambition,
    sportFocus: snapshot?.sport_main === "run" ? "run" : snapshot?.sport_main === "bike" ? "bike" : "triathlon",
    athleteAge,
  };

  return (
    <div className="print:break-inside-avoid">
      <Separator className="my-4" />
      <CoachingCompassCard input={compassInput} staffMode={true} className="border-0 shadow-none" />
    </div>
  );
}
