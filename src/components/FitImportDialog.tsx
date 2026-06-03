/**
 * FIT Import Dialog
 * Interface d'import et d'analyse de fichiers FIT (Nolio, Garmin, Wahoo)
 */

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  Upload,
  FileCheck,
  AlertTriangle,
  Zap,
  Heart,
  Timer,
  TrendingUp,
  Activity,
  Save,
  Database,
  ChevronDown,
  ChevronUp,
  Footprints,
  Gauge,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { DriftSegmentSelector } from "./DriftSegmentSelector";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

import {
  parseFitFile,
  validateFitFile,
  analyzeFitSession,
  calculateOverallConfidence,
  analyzeRunningEconomy,
  isEligibleForRunningEconomy,
  type FitAnalysisResult,
  type DetectedTestType,
  type ProfileUpdatePreview,
  type RunningEconomyFitResult,
} from "@/lib/fitImport";
import { getTFCLWeekSlot, formatTFCLSlot } from "@/lib/fitImport/testDetector";
import type { DbSnapshot } from "@/hooks/useCloudData";
import { estimateVLamaxCap } from "@/lib/v2/vlamaxCapEstimator";
import { computeVLamaxBikeV2Enhanced } from "@/lib/v2/vlamaxBikeV2Enhanced";

// Extended snapshot type for accessing power indices
interface ExtendedSnapshot extends DbSnapshot {
  p30s_w?: number | null;
  p60s_w?: number | null;
  map5min_w?: number | null;
  protocol_quality?: number | null;
}

interface FitImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: string;
  athleteName: string;
  currentSnapshot?: ExtendedSnapshot | null;
  onSaveTest: (data: FitTestSaveData) => Promise<void>;
  onUpdateProfile: (updates: ProfileUpdates) => Promise<void>;
}

export interface FitTestSaveData {
  type: DetectedTestType;
  date: string;
  metrics: {
    ftp?: number;
    map?: number;
    p30s?: number;
    p60s?: number;
    p5min?: number;
    tte_observed_min?: number;
    drift_percent?: number;
  };
  bestEfforts: unknown;
  protocolQuality: number;
  confidence: number;
  fileMeta: {
    fileName: string;
    fileSize: number;
    device?: string;
    sport?: string;
  };
  rawAnalysis: FitAnalysisResult;
  computedVlamax?: number;
  computedVlamaxRun?: number;
}

export interface ProfileUpdates {
  // Bike
  pmax_5s?: number;
  p30s_w?: number;
  p60s_w?: number;
  map5min_w?: number;
  ftp?: number;
  vlamax?: number;
  bike_cadence_rpm?: number;
  bike_hr_drift_flag?: boolean;
  // Run powers (Stryd / Garmin)
  running_power_1s?: number;
  running_power_5s?: number;
  running_power_30s?: number;
  running_power_60s?: number;
  running_power_5min?: number;
  running_power_max?: number;
  running_power_threshold?: number;
  vlamax_run?: number;
  // Common
  fc_max?: number;
  tte_observed_min?: number;
  tte_mode?: string;
  protocol_quality?: number;
  sport_main?: string;
  // Running Economy
  run_pace_ref_sec_per_km?: number;
  run_hr_ref_bpm?: number;
  run_duration_min?: number;
  run_hr_drift_pct?: number;
  run_economy_score?: number;
  run_economy_label?: string;
}

const TEST_TYPE_OPTIONS: { value: DetectedTestType; label: string }[] = [
  { value: "FTP_20MIN", label: "FTP 20 min" },
  { value: "FTP_2x8MIN", label: "FTP 2×8 min" },
  { value: "FTP_RAMP", label: "FTP Ramp" },
  { value: "MAP_5MIN", label: "MAP 5 min" },
  { value: "SPRINT_15S", label: "Sprint 15s" },
  { value: "SPRINT_30S", label: "Sprint 30s" },
  { value: "SPRINT_60S", label: "Sprint 60s" },
  { value: "Z2_DRIFT", label: "Sortie Z2 (Drift)" },
  { value: "TTE_THRESHOLD", label: "TTE au seuil" },
  { value: "RUN_ECONOMY", label: "🏃 Économie Course" },
  { value: "UNKNOWN", label: "Non identifié" },
];

export function FitImportDialog({
  open,
  onOpenChange,
  athleteId,
  athleteName,
  currentSnapshot,
  onSaveTest,
  onUpdateProfile,
}: FitImportDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "analysis" | "review">("upload");
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<FitAnalysisResult | null>(null);
  const [runningEconomyResult, setRunningEconomyResult] = useState<RunningEconomyFitResult | null>(null);
  const [selectedTestType, setSelectedTestType] = useState<DetectedTestType | null>(null);
  const [updateProfile, setUpdateProfile] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const resetState = useCallback(() => {
    setStep("upload");
    setFile(null);
    setAnalysis(null);
    setRunningEconomyResult(null);
    setSelectedTestType(null);
    setUpdateProfile(true);
    setShowDetails(false);
    setIsLoading(false);
    setIsSaving(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onOpenChange(false);
  }, [resetState, onOpenChange]);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    const validation = validateFitFile(selectedFile);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setFile(selectedFile);
    setIsLoading(true);
    setStep("analysis");

    try {
      const session = await parseFitFile(selectedFile);
      const result = analyzeFitSession(
        session,
        undefined,
        currentSnapshot?.ftp ?? undefined
      );
      setAnalysis(result);
      
      // Analyser l'économie de course si éligible
      const runEligibility = isEligibleForRunningEconomy(session);
      if (runEligibility.eligible) {
        const runEconomy = analyzeRunningEconomy(session, currentSnapshot?.fc_max);
        setRunningEconomyResult(runEconomy);
        // Si c'est une course ~60min, suggérer RUN_ECONOMY comme type
        if (session.movingTimeSec >= 2400 && runEconomy.isApplicable) {
          setSelectedTestType("RUN_ECONOMY");
        } else {
          setSelectedTestType(result.testType.type);
        }
      } else {
        setRunningEconomyResult(null);
        setSelectedTestType(result.testType.type);
      }
      
      setStep("review");
      toast.success("Fichier analysé avec succès");
    } catch (error) {
      console.error("FIT parsing error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Erreur lors de l'analyse du fichier"
      );
      setStep("upload");
    } finally {
      setIsLoading(false);
    }
  }, [currentSnapshot?.ftp]);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleTestTypeChange = useCallback(
    (newType: DetectedTestType) => {
      if (!analysis) return;
      setSelectedTestType(newType);
      // Re-analyze with new type
      const updatedAnalysis = analyzeFitSession(
        analysis.session,
        newType,
        currentSnapshot?.ftp ?? undefined
      );
      setAnalysis(updatedAnalysis);
    },
    [analysis, currentSnapshot?.ftp]
  );

  const getProfileUpdates = useCallback((): ProfileUpdatePreview[] => {
    if (!analysis) return [];

    const updates: ProfileUpdatePreview[] = [];
    const snap = currentSnapshot as ExtendedSnapshot | null;

    if (analysis.bestEfforts.p30s) {
      updates.push({
        field: "p30s_w",
        label: "P30s",
        currentValue: snap?.p30s_w ?? undefined,
        newValue: analysis.bestEfforts.p30s,
        source: "Best Effort FIT",
        willUpdate: true,
        requiresConfirmation: (snap?.p30s_w ?? 0) > 0,
      });
    }

    if (analysis.bestEfforts.p60s) {
      updates.push({
        field: "p60s_w",
        label: "P60s",
        currentValue: snap?.p60s_w ?? undefined,
        newValue: analysis.bestEfforts.p60s,
        source: "Best Effort FIT",
        willUpdate: true,
        requiresConfirmation: (snap?.p60s_w ?? 0) > 0,
      });
    }

    if (analysis.bestEfforts.p5min) {
      updates.push({
        field: "map5min_w",
        label: "MAP (P5min)",
        currentValue: snap?.map5min_w ?? undefined,
        newValue: analysis.bestEfforts.p5min,
        source: "Best Effort FIT",
        willUpdate: true,
        requiresConfirmation: (snap?.map5min_w ?? 0) > 0,
      });
    }

    if (analysis.ftpEstimate) {
      updates.push({
        field: "ftp",
        label: "FTP",
        currentValue: currentSnapshot?.ftp ?? undefined,
        newValue: analysis.ftpEstimate.ftpWatts,
        source: analysis.ftpEstimate.method,
        willUpdate: true,
        requiresConfirmation: (currentSnapshot?.ftp ?? 0) > 0,
      });
    }

    if (analysis.tteObservation) {
      updates.push({
        field: "tte_observed_min",
        label: "TTE observé",
        currentValue: currentSnapshot?.tte_observed_min ?? undefined,
        newValue: Math.round(analysis.tteObservation.tteMinutes),
        source: "Observation FIT",
        willUpdate: true,
        requiresConfirmation: (currentSnapshot?.tte_observed_min ?? 0) > 0,
      });
    }

    return updates;
  }, [analysis, currentSnapshot]);

  const handleSave = useCallback(async () => {
    if (!analysis || !file || !selectedTestType) return;

    setIsSaving(true);

    try {
      // Sport effectif déduit du fichier
      const sportRaw = (analysis.session.sport ?? "").toLowerCase();
      const isRun = sportRaw.includes("run") || selectedTestType === "RUN_ECONOMY";
      const sportEffective: "bike" | "run" = isRun ? "run" : "bike";

      // VLamax dérivée d'un sprint FIT (bike ou run)
      let computedVlamaxBike: number | null = null;
      let computedVlamaxRun: number | null = null;
      if (selectedTestType === "SPRINT_15S" || selectedTestType === "SPRINT_30S" || selectedTestType === "SPRINT_60S") {
        if (sportEffective === "bike") {
          const ftpForCalc = analysis.ftpEstimate?.ftpWatts ?? currentSnapshot?.ftp ?? null;
          if (ftpForCalc) {
            const r = computeVLamaxBikeV2Enhanced({
              ftp: ftpForCalc,
              p30s_w: analysis.bestEfforts.p30s ?? null,
              p60s_w: analysis.bestEfforts.p60s ?? null,
              map5min_w: analysis.bestEfforts.p5min ?? null,
              pmax_5s: analysis.bestEfforts.p5s ?? null,
              weight_kg: (currentSnapshot as { weight_kg?: number | null } | null)?.weight_kg ?? null,
            });
            if (r?.value) computedVlamaxBike = r.value;
          }
        } else {
          // Sprint course → si distance disponible (records)
          const r = estimateVLamaxCap({
            vma: null,
            paceThresholdSecPerKm: null,
            runningPowerMax: analysis.bestEfforts.p5s ?? analysis.bestEfforts.p15s ?? null,
            runningPowerThreshold: analysis.bestEfforts.p20min ?? null,
          });
          if (r?.value) computedVlamaxRun = r.value;
        }
      }

      // Préparer les données du test
      const testData: FitTestSaveData = {
        type: selectedTestType,
        date: analysis.session.startTime.toISOString().split("T")[0],
        metrics: {
          ftp: analysis.ftpEstimate?.ftpWatts,
          map: analysis.mapEstimate,
          p30s: analysis.bestEfforts.p30s,
          p60s: analysis.bestEfforts.p60s,
          p5min: analysis.bestEfforts.p5min,
          tte_observed_min: analysis.tteObservation
            ? Math.round(analysis.tteObservation.tteMinutes)
            : undefined,
          drift_percent: analysis.driftAnalysis?.driftPercent,
        },
        bestEfforts: analysis.bestEfforts as unknown,
        protocolQuality: analysis.protocolQuality.score,
        confidence: calculateOverallConfidence(analysis),
        fileMeta: {
          fileName: file.name,
          fileSize: file.size,
          device: analysis.session.deviceInfo?.manufacturer,
          sport: sportEffective,
        },
        rawAnalysis: analysis,
        // Ajouts: VLamax calculée + sport effectif (champs additionnels lus côté handler)
        ...(computedVlamaxBike != null ? { computedVlamax: computedVlamaxBike } : {}),
        ...(computedVlamaxRun != null ? { computedVlamaxRun } : {}),
      } as FitTestSaveData;

      await onSaveTest(testData);

      // Mettre à jour le profil si demandé
      if (updateProfile) {
        const profileUpdates: ProfileUpdates = {};

        if (sportEffective === "bike") {
          if (analysis.bestEfforts.p5s) profileUpdates.pmax_5s = analysis.bestEfforts.p5s;
          if (analysis.bestEfforts.p30s) profileUpdates.p30s_w = analysis.bestEfforts.p30s;
          if (analysis.bestEfforts.p60s) profileUpdates.p60s_w = analysis.bestEfforts.p60s;
          if (analysis.bestEfforts.p5min) profileUpdates.map5min_w = analysis.bestEfforts.p5min;
          if (analysis.ftpEstimate) profileUpdates.ftp = analysis.ftpEstimate.ftpWatts;
          if (computedVlamaxBike != null) profileUpdates.vlamax = Number(computedVlamaxBike.toFixed(3));
          if (analysis.session.avgCadence) profileUpdates.bike_cadence_rpm = Math.round(analysis.session.avgCadence);
          if (analysis.driftAnalysis?.isValid) {
            profileUpdates.bike_hr_drift_flag = analysis.driftAnalysis.driftLevel === "high";
          }
        } else {
          // Best efforts running power (Stryd / Garmin Running Power)
          if (analysis.bestEfforts.p5s) profileUpdates.running_power_5s = analysis.bestEfforts.p5s;
          if (analysis.bestEfforts.p30s) profileUpdates.running_power_30s = analysis.bestEfforts.p30s;
          if (analysis.bestEfforts.p60s) profileUpdates.running_power_60s = analysis.bestEfforts.p60s;
          if (analysis.bestEfforts.p5min) profileUpdates.running_power_5min = analysis.bestEfforts.p5min;
          if (analysis.session.maxPower) profileUpdates.running_power_max = analysis.session.maxPower;
          if (analysis.bestEfforts.p20min) profileUpdates.running_power_threshold = analysis.bestEfforts.p20min as unknown as number;
          if (computedVlamaxRun != null) profileUpdates.vlamax_run = Number(computedVlamaxRun.toFixed(3)) as unknown as number;
        }

        // Common
        if (analysis.session.maxHeartRate) profileUpdates.fc_max = analysis.session.maxHeartRate;
        if (analysis.tteObservation) {
          profileUpdates.tte_observed_min = Math.round(analysis.tteObservation.tteMinutes);
          profileUpdates.tte_mode = "OBSERVED";
        }
        profileUpdates.protocol_quality = analysis.protocolQuality.score;
        profileUpdates.sport_main = sportEffective;

        // Données économie de course si applicable
        if (selectedTestType === "RUN_ECONOMY" && runningEconomyResult?.isApplicable) {
          profileUpdates.run_pace_ref_sec_per_km = runningEconomyResult.runPaceRefSecPerKm;
          profileUpdates.run_hr_ref_bpm = runningEconomyResult.runHrRefBpm;
          profileUpdates.run_duration_min = runningEconomyResult.runDurationMin;
          profileUpdates.run_hr_drift_pct = runningEconomyResult.runHrDriftPct;
          profileUpdates.run_economy_score = runningEconomyResult.economyScore;
          profileUpdates.run_economy_label = runningEconomyResult.economyLabel;
        }

        await onUpdateProfile(profileUpdates);
        toast.success("Profil de référence mis à jour");
      }

      toast.success("Test observé enregistré");
      handleClose();
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  }, [
    analysis,
    file,
    selectedTestType,
    updateProfile,
    runningEconomyResult,
    onSaveTest,
    onUpdateProfile,
    handleClose,
  ]);

  const profileUpdates = getProfileUpdates();
  const hasConflicts = profileUpdates.some((u) => u.requiresConfirmation);
  const overallConfidence = analysis ? calculateOverallConfidence(analysis) : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Importer séance (.FIT)
          </DialogTitle>
          <DialogDescription>
            Analyse automatique de fichiers FIT pour détecter tests et métriques
          </DialogDescription>
        </DialogHeader>

        {/* Step: Upload */}
        {step === "upload" && (
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".fit"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFileSelect(f);
              }}
            />
            <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">
              Glissez-déposez un fichier .FIT
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              ou cliquez pour sélectionner
            </p>
            <p className="text-xs text-muted-foreground">
              Compatible Garmin, Wahoo, Zwift, TrainerRoad, Nolio...
            </p>
          </div>
        )}

        {/* Step: Analysis in progress */}
        {step === "analysis" && isLoading && (
          <div className="py-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin mb-4" />
            <p className="text-lg font-medium mb-2">Analyse en cours...</p>
            <p className="text-sm text-muted-foreground">
              Parsing du fichier et calcul des métriques
            </p>
            <Progress value={66} className="mt-4 max-w-xs mx-auto" />
          </div>
        )}

        {/* Step: Review */}
        {step === "review" && analysis && (
          <div className="space-y-4">
            {/* File info */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <FileCheck className="w-5 h-5 text-green-500" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {analysis.session.sport} •{" "}
                  {Math.round(analysis.session.movingTimeSec / 60)} min •{" "}
                  {analysis.session.startTime.toLocaleDateString("fr-FR")}
                </p>
              </div>
              <Badge
                variant={
                  overallConfidence >= 0.7
                    ? "default"
                    : overallConfidence >= 0.5
                    ? "secondary"
                    : "outline"
                }
              >
                Qualité: {overallConfidence >= 0.7 ? "Élevée" : overallConfidence >= 0.5 ? "Modérée" : "Limitée"}
              </Badge>
            </div>

            {/* Test Type Selection */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Type de test détecté
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-4">
                  <Select
                    value={selectedTestType ?? "UNKNOWN"}
                    onValueChange={(v) =>
                      handleTestTypeChange(v as DetectedTestType)
                    }
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEST_TYPE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground flex-1">
                    {analysis.testType.reasoning}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Best Efforts */}
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Best Efforts
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {analysis.bestEfforts.p5s && (
                    <MetricBadge label="P5s" value={`${analysis.bestEfforts.p5s}W`} />
                  )}
                  {analysis.bestEfforts.p15s && (
                    <MetricBadge label="P15s" value={`${analysis.bestEfforts.p15s}W`} />
                  )}
                  {analysis.bestEfforts.p30s && (
                    <MetricBadge label="P30s" value={`${analysis.bestEfforts.p30s}W`} highlight />
                  )}
                  {analysis.bestEfforts.p60s && (
                    <MetricBadge label="P60s" value={`${analysis.bestEfforts.p60s}W`} highlight />
                  )}
                  {analysis.bestEfforts.p5min && (
                    <MetricBadge label="P5min" value={`${analysis.bestEfforts.p5min}W`} highlight />
                  )}
                  {analysis.bestEfforts.p8min && (
                    <MetricBadge label="P8min" value={`${analysis.bestEfforts.p8min}W`} />
                  )}
                  {analysis.bestEfforts.p12min && (
                    <MetricBadge label="P12min" value={`${analysis.bestEfforts.p12min}W`} />
                  )}
                  {analysis.bestEfforts.p20min && (
                    <MetricBadge label="P20min" value={`${analysis.bestEfforts.p20min}W`} highlight />
                  )}
                  {analysis.bestEfforts.p40min && (
                    <MetricBadge label="P40min" value={`${analysis.bestEfforts.p40min}W`} />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              {analysis.ftpEstimate && (
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">
                        FTP estimée
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-primary">
                      {analysis.ftpEstimate.ftpWatts}W
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {analysis.ftpEstimate.method}
                    </p>
                  </CardContent>
                </Card>
              )}

              {analysis.tteObservation && (
                <Card className="bg-orange-500/5 border-orange-500/20">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Timer className="w-4 h-4 text-orange-500" />
                      <span className="text-xs text-muted-foreground">
                        TTE observé
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">
                      {analysis.tteObservation.tteMinutes.toFixed(1)} min
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ≥{Math.round(analysis.tteObservation.intensityThreshold * 100)}% FTP
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Running Economy Results - Affichage conditionnel */}
            {selectedTestType === "RUN_ECONOMY" && runningEconomyResult?.isApplicable && (
              <Card className="border-green-500/30 bg-green-500/5">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Footprints className="w-4 h-4 text-green-600" />
                    Économie de Course
                    <Badge 
                      variant={runningEconomyResult.economyLevel === "excellent" || runningEconomyResult.economyLevel === "good" ? "default" : "secondary"}
                      className="ml-2"
                    >
                      Qualité: {runningEconomyResult.confidence >= 70 ? "Élevée" : runningEconomyResult.confidence >= 50 ? "Modérée" : "Limitée"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  {/* Métriques principales */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 bg-background rounded-lg border">
                      <div className="flex items-center gap-2 mb-1">
                        <Timer className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Allure moy.</span>
                      </div>
                      <p className="text-lg font-bold">{formatPaceDisplay(runningEconomyResult.avgPaceSecPerKm)}</p>
                      <p className="text-xs text-muted-foreground">/km</p>
                    </div>
                    
                    <div className="p-3 bg-background rounded-lg border">
                      <div className="flex items-center gap-2 mb-1">
                        <Heart className="w-3 h-3 text-red-500" />
                        <span className="text-xs text-muted-foreground">FC moy.</span>
                      </div>
                      <p className="text-lg font-bold">{runningEconomyResult.avgHeartRate}</p>
                      <p className="text-xs text-muted-foreground">bpm</p>
                    </div>
                    
                    <div className="p-3 bg-background rounded-lg border">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-3 h-3 text-orange-500" />
                        <span className="text-xs text-muted-foreground">Dérive Pa:HR</span>
                      </div>
                      <p className={`text-lg font-bold ${
                        runningEconomyResult.hrDriftLevel === "excellent" ? "text-green-600" :
                        runningEconomyResult.hrDriftLevel === "good" ? "text-green-500" :
                        runningEconomyResult.hrDriftLevel === "moderate" ? "text-yellow-600" :
                        "text-red-500"
                      }`}>
                        {runningEconomyResult.hrDriftPct.toFixed(1)}%
                      </p>
                      <p className="text-xs text-muted-foreground">{runningEconomyResult.hrDriftLevel}</p>
                    </div>
                    
                    <div className="p-3 bg-background rounded-lg border border-green-500/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Gauge className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-muted-foreground">Score</span>
                      </div>
                      <p className="text-lg font-bold text-green-600">{runningEconomyResult.economyScore}</p>
                      <p className="text-xs text-muted-foreground">/100</p>
                    </div>
                  </div>

                  {/* Niveau d'économie */}
                  <div className="flex items-center justify-between p-3 bg-background rounded-lg border">
                    <span className="text-sm font-medium">Niveau d'économie</span>
                    <Badge 
                      variant={
                        runningEconomyResult.economyLevel === "excellent" ? "default" :
                        runningEconomyResult.economyLevel === "good" ? "default" :
                        runningEconomyResult.economyLevel === "average" ? "secondary" :
                        "outline"
                      }
                      className={
                        runningEconomyResult.economyLevel === "excellent" ? "bg-green-600" :
                        runningEconomyResult.economyLevel === "good" ? "bg-green-500" :
                        ""
                      }
                    >
                      {runningEconomyResult.economyLabel}
                    </Badge>
                  </div>

                  {/* Détails de dérive si disponible */}
                  {runningEconomyResult.driftAnalysis?.isValid && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
                          <span>Voir détails dérive 1ère/2ème moitié</span>
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="grid grid-cols-2 gap-3 p-3 bg-muted/50 rounded-lg text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">1ère moitié</p>
                            <p>Allure: {formatPaceDisplay(runningEconomyResult.driftAnalysis.pace1stHalf)}/km</p>
                            <p>FC: {runningEconomyResult.driftAnalysis.hr1stHalf} bpm</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">2ème moitié</p>
                            <p>Allure: {formatPaceDisplay(runningEconomyResult.driftAnalysis.pace2ndHalf)}/km</p>
                            <p>FC: {runningEconomyResult.driftAnalysis.hr2ndHalf} bpm</p>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}

                  {/* Notes de qualité et warnings */}
                  {(runningEconomyResult.qualityNotes.length > 0 || runningEconomyResult.warnings.length > 0) && (
                    <div className="space-y-2">
                      {runningEconomyResult.warnings.length > 0 && (
                        <Alert variant="destructive" className="py-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            {runningEconomyResult.warnings.join(" • ")}
                          </AlertDescription>
                        </Alert>
                      )}
                      {runningEconomyResult.qualityNotes.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {runningEconomyResult.qualityNotes.slice(0, 3).join(" • ")}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Drift Analysis with Manual Selection */}
            <DriftSegmentSelector
              session={analysis.session}
              initialDrift={analysis.driftAnalysis}
              onDriftCalculated={(drift) => {
                if (drift && analysis) {
                  setAnalysis({
                    ...analysis,
                    driftAnalysis: drift,
                  });
                }
              }}
            />

            {/* Protocol Quality */}
            <Card>
              <CardContent className="py-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Qualité protocole</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <div
                        key={star}
                        className={`w-3 h-3 rounded-full ${
                          star <= analysis.protocolQuality.score
                            ? "bg-primary"
                            : "bg-muted"
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm font-bold">
                      {analysis.protocolQuality.score}/5
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {analysis.protocolQuality.justification}
                </p>
              </CardContent>
            </Card>

            {/* Update Profile Option */}
            <Separator />

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="updateProfile"
                  checked={updateProfile}
                  onCheckedChange={(checked) =>
                    setUpdateProfile(checked === true)
                  }
                />
                <Label htmlFor="updateProfile" className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Alimenter le Profil de Référence
                </Label>
              </div>

              {updateProfile && profileUpdates.length > 0 && (
                <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      <span className="text-xs">
                        {profileUpdates.length} champ(s) à mettre à jour
                        {hasConflicts && (
                          <Badge variant="outline" className="ml-2 text-yellow-600">
                            Conflits
                          </Badge>
                        )}
                      </span>
                      {showDetails ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2">
                    <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                      {profileUpdates.map((update) => (
                        <div
                          key={update.field}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            {update.requiresConfirmation ? (
                              <AlertTriangle className="w-4 h-4 text-yellow-500" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            )}
                            <span>{update.label}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            {update.currentValue !== undefined && (
                              <>
                                <span className="line-through">
                                  {update.currentValue}
                                </span>
                                <span>→</span>
                              </>
                            )}
                            <span className="font-medium text-foreground">
                              {update.newValue}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}

              {updateProfile && hasConflicts && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Certaines valeurs existent déjà. Elles seront remplacées par
                    les nouvelles valeurs issues du fichier FIT.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === "review" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Enregistrer Test Observé
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper component
function MetricBadge({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-2 rounded-lg text-center ${
        highlight ? "bg-primary/10 border border-primary/20" : "bg-muted/50"
      }`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-bold ${highlight ? "text-primary" : ""}`}>{value}</p>
    </div>
  );
}

// Helper pour formater l'allure
function formatPaceDisplay(secPerKm: number): string {
  if (!secPerKm || secPerKm <= 0) return "—";
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}
