/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VLAMAX CAP CARD V2 — Running Focus Mode™ + Calibration Continue + Cloud Sync
 * 
 * Affichage de la VLamax spécifique course à pied avec:
 * - Baseline vs Calibrated (transparence AVANT/APRÈS)
 * - Plage P25-P75
 * - Confiance et preuves utilisées
 * - Badge recalibration recommandée
 * - ✅ Cloud persistence via useRunningProfileCloud
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { getConfidenceLabel, getConfidenceColorClass } from "@/lib/confidenceDisplay";
import { useRunningFocusMode } from "@/hooks/useRunningFocusMode";
import { useCalibrationEvidence } from "@/hooks/useCalibrationEvidence";
import { useRunningProfileCloud } from "@/hooks/useRunningProfileCloud";
import { useAthletes } from "@/contexts/AthleteContext";
import { getAthleteAmbition } from "@/types/ambitionLevel";
import { getVLamaxRange } from "@/lib/physiologicalTargets";
import { 
  RUNNING_RACE_LABELS,
  type RunningRaceType 
} from "@/lib/runningFocusMode";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  RefreshCw, 
  CheckCircle,
  AlertTriangle,
  Brain,
  Lock,
  Cloud,
  CloudOff,
  Loader2,
} from "lucide-react";

interface VLamaxCAPCardProps {
  athleteId: string;
  vlamaxValue: number | null;
  vlamaxSource: "test" | "estimation" | "snapshot";
  vlamaxConfidence: number;
  vo2max?: number | null;
  economyScore?: number | null;
  className?: string;
}

export function VLamaxCAPCard({
  athleteId,
  vlamaxValue,
  vlamaxSource,
  vlamaxConfidence,
  vo2max,
  economyScore,
  className,
}: VLamaxCAPCardProps) {
  const { raceType, targets } = useRunningFocusMode();
  const { currentAthlete } = useAthletes();
  const { 
    liveCalibration, 
    latestSnapshot, 
    windowEvidences,
    isLocked,
  } = useCalibrationEvidence(athleteId);
  
  // ✅ Cloud persistence
  const {
    runningProfile,
    hasProfile: hasCloudProfile,
    loading: cloudLoading,
    saving: cloudSaving,
  } = useRunningProfileCloud(athleteId);
  
  // Use Cloud data if available, fallback to props
  const cloudVlamax = runningProfile?.vlamax_run?.value ?? null;
  const cloudVo2max = runningProfile?.vo2max_run?.value ?? null;
  const cloudEconomy = runningProfile?.economy_run?.value ?? null;
  
  // Valeurs calibrées ou fallback (prioritize Cloud data)
  const effectiveVlamax = cloudVlamax ?? vlamaxValue;
  const modelledVlamax = liveCalibration?.vlamax_modelled ?? effectiveVlamax;
  const calibratedVlamax = liveCalibration?.vlamax_calibrated ?? effectiveVlamax;
  const confidence = liveCalibration?.confidence ?? runningProfile?.vlamax_run?.confidence ?? vlamaxConfidence;
  const delta = liveCalibration?.delta ?? 0;
  const hasCalibration = liveCalibration !== null && windowEvidences.length > 0;
  
  // Effective VO2max and Economy (Cloud or props)
  const effectiveVo2max = cloudVo2max ?? vo2max;
  const effectiveEconomy = cloudEconomy ?? economyScore;
  
  if (!raceType || !targets) {
    return null;
  }
  
  const optimal = targets.vlamax.optimal;
  const max = targets.vlamax.max;
  
  // Statut selon les cibles (basé sur valeur calibrée)
  const getStatus = (): { label: string; color: string; icon: string } => {
    if (calibratedVlamax === null) {
      return { label: "Non disponible", color: "text-muted-foreground", icon: "❓" };
    }
    if (calibratedVlamax <= optimal) {
      return { label: "Optimal", color: "text-emerald-600 dark:text-emerald-400", icon: "✅" };
    }
    if (calibratedVlamax <= max) {
      return { label: "Acceptable", color: "text-amber-600 dark:text-amber-400", icon: "⚠️" };
    }
    return { label: "Limitant", color: "text-red-600 dark:text-red-400", icon: "🚨" };
  };
  
  const status = getStatus();
  
  // Pourcentage de progression vers l'optimal
  const progressPct = calibratedVlamax !== null
    ? Math.max(0, Math.min(100, ((max - calibratedVlamax) / (max - optimal * 0.8)) * 100))
    : 0;
  
  // Source label
  const sourceLabel = hasCalibration
    ? `Calibrée (${windowEvidences.length} preuve${windowEvidences.length > 1 ? "s" : ""})`
    : {
        test: "Test terrain CAP",
        estimation: "Estimation",
        snapshot: "Snapshot",
      }[vlamaxSource];
  
  // Delta display
  const getDeltaDisplay = () => {
    if (!hasCalibration || Math.abs(delta) < 0.005) {
      return null;
    }
    
    const isImprovement = delta < 0;
    return {
      icon: isImprovement ? TrendingDown : TrendingUp,
      color: isImprovement ? "text-emerald-600" : "text-amber-600",
      label: `${delta > 0 ? "+" : ""}${delta.toFixed(3)}`,
    };
  };
  
  const deltaDisplay = getDeltaDisplay();
  
  return (
    <Card className={cn("border-primary/20", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span>🏃</span>
            VLamax CAP
            {hasCalibration && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Brain className="h-3 w-3" />
                V2
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {/* Cloud sync indicator */}
            {cloudLoading ? (
              <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
              </Badge>
            ) : hasCloudProfile ? (
              <Badge variant="outline" className="text-xs gap-1 text-emerald-600 border-emerald-300">
                <Cloud className="h-3 w-3" />
                Synced
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                <CloudOff className="h-3 w-3" />
              </Badge>
            )}
            {isLocked && (
              <Badge variant="outline" className="text-xs gap-1">
                <Lock className="h-3 w-3" />
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              Running Focus Mode™
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Valeurs Baseline vs Calibrée */}
        {hasCalibration && modelledVlamax !== null ? (
          <div className="grid grid-cols-2 gap-3">
            {/* Baseline */}
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Modélisée
              </p>
              <p className="text-xl font-bold font-mono text-muted-foreground">
                {modelledVlamax.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">baseline</p>
            </div>
            
            {/* Calibrated */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-xs text-primary uppercase tracking-wide mb-1">
                Calibrée
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-xl font-bold font-mono text-primary">
                  {calibratedVlamax?.toFixed(2) ?? "—"}
                </p>
                {deltaDisplay && (
                  <span className={cn("text-xs font-mono flex items-center gap-0.5", deltaDisplay.color)}>
                    <deltaDisplay.icon className="h-3 w-3" />
                    {deltaDisplay.label}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">effective</p>
            </div>
          </div>
        ) : (
          /* Single value display when no calibration */
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono">
                {calibratedVlamax !== null ? calibratedVlamax.toFixed(2) : "—"}
              </span>
              <span className="text-sm text-muted-foreground">mmol/L/s</span>
            </div>
            <div className={cn("flex items-center gap-1.5 text-sm font-medium", status.color)}>
              <span>{status.icon}</span>
              <span>{status.label}</span>
            </div>
          </div>
        )}
        
        {/* Plage P25-P75 si calibration */}
        {liveCalibration && (
          <div className="p-2 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Plage P25-P75</span>
              <span className="font-mono">
                {liveCalibration.vlamax_range.p25.toFixed(2)} — {liveCalibration.vlamax_range.p75.toFixed(2)}
              </span>
            </div>
          </div>
        )}
        
        {/* Progress vers l'optimal */}
        {calibratedVlamax !== null && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progression vers l'optimal</span>
              <span>Cible: ≤ {optimal} mmol/L/s</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
        )}
        
        {/* Cibles pour l'objectif */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded text-center">
            <p className="text-muted-foreground">Optimal</p>
            <p className="font-bold text-emerald-600 dark:text-emerald-400">
              ≤ {optimal}
            </p>
          </div>
          <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-center">
            <p className="text-muted-foreground">Max</p>
            <p className="font-bold text-amber-600 dark:text-amber-400">
              ≤ {max}
            </p>
          </div>
          <div className="p-2 bg-muted/50 rounded text-center">
            <p className="text-muted-foreground">Objectif</p>
            <p className="font-bold">{RUNNING_RACE_LABELS[raceType]}</p>
          </div>
        </div>
        
        <Separator />
        
        {/* Métadonnées */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Source:</span>
            <span className={cn(
              "font-medium flex items-center gap-1",
              hasCalibration ? "text-primary" : vlamaxSource === "test" ? "text-emerald-600" : "text-amber-600"
            )}>
              {hasCalibration && <CheckCircle className="h-3 w-3" />}
              {sourceLabel}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Fiabilité:</span>
            <span className={cn("ml-1 font-medium", getConfidenceColorClass(confidence))}>
              {getConfidenceLabel(confidence)}
            </span>
          </div>
          {effectiveVo2max && (
            <div>
              <span className="text-muted-foreground">VO2max:</span>
              <span className="ml-1 font-medium">{effectiveVo2max} ml/kg/min</span>
              {cloudVo2max && <Cloud className="inline h-3 w-3 ml-1 text-emerald-500" />}
            </div>
          )}
          {effectiveEconomy !== null && effectiveEconomy !== undefined && (
            <div>
              <span className="text-muted-foreground">Économie:</span>
              <span className="ml-1 font-medium">{effectiveEconomy}/100</span>
              {cloudEconomy && <Cloud className="inline h-3 w-3 ml-1 text-emerald-500" />}
            </div>
          )}
        </div>
        
        {/* Recalibration Warning */}
        {liveCalibration?.recalibration_recommended && (
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-amber-600 animate-spin" style={{ animationDuration: "3s" }} />
              <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                Recalibration recommandée
              </span>
            </div>
            {liveCalibration.recalibration_reason && (
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                {liveCalibration.recalibration_reason}
              </p>
            )}
          </div>
        )}
        
        {/* Interprétation */}
        <div className="p-3 bg-muted/30 rounded-lg text-sm">
          <p className="font-medium mb-1">Interprétation</p>
          <p className="text-muted-foreground text-xs">
            {calibratedVlamax === null ? (
              "VLamax CAP non disponible. Effectuez un test sprint 15s ou un test lactate terrain."
            ) : calibratedVlamax <= optimal ? (
              `Excellent profil pour le ${RUNNING_RACE_LABELS[raceType]}. Votre capacité à oxyder les lipides permet une épargne glycogénique optimale.`
            ) : calibratedVlamax <= max ? (
              `Profil acceptable mais perfectible. Travail aérobie continu recommandé pour réduire la dépendance aux glucides.`
            ) : (
              `VLamax trop élevée pour le ${RUNNING_RACE_LABELS[raceType]}. Risque d'épuisement glycogénique précoce. Priorité : volume Z2 et réduction des séances lactiques.`
            )}
          </p>
        </div>
        
        {/* Preuves utilisées */}
        {hasCalibration && windowEvidences.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Preuves utilisées ({windowEvidences.length})
            </p>
            <div className="flex flex-wrap gap-1">
              {windowEvidences.slice(0, 5).map((e) => (
                <Badge key={e.id} variant="outline" className="text-xs">
                  {e.evidence_type.replace("_", " ")}
                </Badge>
              ))}
              {windowEvidences.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{windowEvidences.length - 5}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
