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
  CheckCircle2,
  Loader2,
} from "lucide-react";
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
  type FitAnalysisResult,
  type DetectedTestType,
  type ProfileUpdatePreview,
} from "@/lib/fitImport";
import type { DbSnapshot } from "@/hooks/useCloudData";

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
}

export interface ProfileUpdates {
  p30s_w?: number;
  p60s_w?: number;
  map5min_w?: number;
  ftp?: number;
  tte_observed_min?: number;
  protocol_quality?: number;
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
  const [selectedTestType, setSelectedTestType] = useState<DetectedTestType | null>(null);
  const [updateProfile, setUpdateProfile] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const resetState = useCallback(() => {
    setStep("upload");
    setFile(null);
    setAnalysis(null);
    setSelectedTestType(null);
    setUpdateProfile(false);
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
      setSelectedTestType(result.testType.type);
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
          sport: analysis.session.sport,
        },
        rawAnalysis: analysis,
      };

      await onSaveTest(testData);

      // Mettre à jour le profil si demandé
      if (updateProfile) {
        const profileUpdates: ProfileUpdates = {};
        
        if (analysis.bestEfforts.p30s) {
          profileUpdates.p30s_w = analysis.bestEfforts.p30s;
        }
        if (analysis.bestEfforts.p60s) {
          profileUpdates.p60s_w = analysis.bestEfforts.p60s;
        }
        if (analysis.bestEfforts.p5min) {
          profileUpdates.map5min_w = analysis.bestEfforts.p5min;
        }
        if (analysis.ftpEstimate) {
          profileUpdates.ftp = analysis.ftpEstimate.ftpWatts;
        }
        if (analysis.tteObservation) {
          profileUpdates.tte_observed_min = Math.round(
            analysis.tteObservation.tteMinutes
          );
        }
        profileUpdates.protocol_quality = analysis.protocolQuality.score;

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
                Confiance: {Math.round(overallConfidence * 100)}%
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

            {/* Drift Analysis */}
            {analysis.driftAnalysis?.isValid && (
              <Card>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-medium">
                        Drift Pa:HR
                      </span>
                    </div>
                    <Badge
                      variant={
                        analysis.driftAnalysis.driftLevel === "low"
                          ? "default"
                          : analysis.driftAnalysis.driftLevel === "moderate"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {analysis.driftAnalysis.driftPercent.toFixed(1)}% (
                      {analysis.driftAnalysis.driftLevel === "low"
                        ? "Faible"
                        : analysis.driftAnalysis.driftLevel === "moderate"
                        ? "Modéré"
                        : "Élevé"}
                      )
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

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
