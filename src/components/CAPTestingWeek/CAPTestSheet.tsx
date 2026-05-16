/**
 * CAP Test Sheet - Modal for recording test data
 * Saves results to BOTH snapshots (profile) AND tests table (for calibration)
 */

import { useState, useMemo, useCallback } from "react";
import { usePersistedString } from "@/hooks/usePersistedFormState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Save, 
  AlertCircle, 
  CheckCircle2,
  Target,
  Zap,
  TrendingUp,
  Info
} from "lucide-react";
import { CAP_TESTING_WEEK, CAPTestDay } from "@/data/capTestingWeek";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { DbSnapshot } from "@/hooks/useCloudData";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SprintTimeConverter } from "./SprintTimeConverter";

interface CAPTestSheetProps {
  dayKey: string;
  athlete: { id: string; name: string; goal?: string | null; coach_id?: string };
  snapshot: DbSnapshot | null;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => Promise<void>;
}

// Helper to parse pace mm:ss to seconds
const parsePaceToSeconds = (v: string): number | null => {
  const trimmed = v.trim();
  if (!trimmed) return null;
  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    if (parts.length === 2) {
      const min = parseInt(parts[0], 10);
      const sec = parseInt(parts[1], 10);
      if (Number.isFinite(min) && Number.isFinite(sec) && min >= 0 && sec >= 0 && sec < 60) {
        return min * 60 + sec;
      }
    }
    return null;
  }
  const n = Number(trimmed);
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Format seconds to mm:ss
const formatSecsToMMSS = (secs: number): string => {
  const min = Math.floor(secs / 60);
  const sec = secs % 60;
  return `${min}:${sec.toString().padStart(2, "0")}`;
};

// Estimate VLamax CAP from sprint 15s distance — uses unified V2 estimator
import { estimateVLamaxCap } from "@/lib/v2/vlamaxCapEstimator";

const estimateVLamaxFromSprint = (distance15s: number): number | null => {
  if (!distance15s || distance15s < 50 || distance15s > 120) return null;
  const est = estimateVLamaxCap({
    vma: null,
    paceThresholdSecPerKm: null,
    sprint15sDistance: distance15s,
  });
  return est?.value ? Math.round(est.value * 100) / 100 : null;
};

// Estimate VO2max from VMA
const estimateVO2maxFromVMA = (vmaKmh: number): number | null => {
  if (!vmaKmh || vmaKmh < 10 || vmaKmh > 25) return null;
  // Léger formula: VO2max ≈ 3.5 * VMA (simplified)
  return Math.round(vmaKmh * 3.5 * 10) / 10;
};

export function CAPTestSheet({ dayKey, athlete, snapshot, onClose, onSave }: CAPTestSheetProps) {
  const { updateSnapshot, addTest } = useCloudDataContext();
  const { user } = useAuth();
  const day = CAP_TESTING_WEEK.days.find((d) => d.dayKey === dayKey);
  
  // Form state based on day — persisted to survive iOS sleep / background kill
  const persistKey = (field: string) => `cap-test:${athlete.id}:${dayKey}:${field}`;
  const [sprint15s_1, setSprint15s_1, clearSprint1] = usePersistedString(persistKey("sprint15s_1"), "");
  const [sprint15s_2, setSprint15s_2, clearSprint2] = usePersistedString(persistKey("sprint15s_2"), "");
  const [sprint15s_3, setSprint15s_3, clearSprint3] = usePersistedString(persistKey("sprint15s_3"), "");
  const [vma, setVma, clearVma] = usePersistedString(persistKey("vma"), snapshot?.vma?.toString() || "");
  const [vmaDistance, setVmaDistance, clearVmaDistance] = usePersistedString(persistKey("vmaDistance"), "");
  const [paceThreshold, setPaceThreshold, clearPaceThreshold] = usePersistedString(
    persistKey("paceThreshold"),
    snapshot?.pace_threshold_sec_per_km 
      ? formatSecsToMMSS(snapshot.pace_threshold_sec_per_km)
      : ""
  );
  const [tteObserved, setTteObserved, clearTte] = usePersistedString(persistKey("tteObserved"), snapshot?.tte_observed_min?.toString() || "");
  const [runPowerMax, setRunPowerMax, clearRunPowerMax] = usePersistedString(persistKey("runPowerMax"), snapshot?.running_power_max?.toString() || "");
  const [runPowerThreshold, setRunPowerThreshold, clearRunPowerThreshold] = usePersistedString(persistKey("runPowerThreshold"), snapshot?.running_power_threshold?.toString() || "");
  const [hrMax, setHrMax, clearHrMax] = usePersistedString(persistKey("hrMax"), "");
  const [hrAvg, setHrAvg, clearHrAvg] = usePersistedString(persistKey("hrAvg"), "");
  const [hrDrift, setHrDrift, clearHrDrift] = usePersistedString(persistKey("hrDrift"), "");
  const [notes, setNotes, clearNotes] = usePersistedString(persistKey("notes"), "");
  const snapWithQuality = snapshot as unknown as { protocol_quality?: number | null } | null;
  const [protocolQuality, setProtocolQuality, clearProtocolQuality] = usePersistedString(persistKey("protocolQuality"), snapWithQuality?.protocol_quality?.toString() || "3");
  const [saving, setSaving] = useState(false);

  const clearAllPersisted = useCallback(() => {
    clearSprint1(); clearSprint2(); clearSprint3();
    clearVma(); clearVmaDistance(); clearPaceThreshold();
    clearTte(); clearRunPowerMax(); clearRunPowerThreshold();
    clearHrMax(); clearHrAvg(); clearHrDrift(); clearNotes();
    clearProtocolQuality();
  }, [clearSprint1, clearSprint2, clearSprint3, clearVma, clearVmaDistance, clearPaceThreshold, clearTte, clearRunPowerMax, clearRunPowerThreshold, clearHrMax, clearHrAvg, clearHrDrift, clearNotes, clearProtocolQuality]);

  // Calculate best sprint from 3 attempts
  const bestSprint = useMemo(() => {
    const attempts = [sprint15s_1, sprint15s_2, sprint15s_3]
      .map(v => parseFloat(v))
      .filter(v => Number.isFinite(v) && v > 0);
    return attempts.length > 0 ? Math.max(...attempts) : null;
  }, [sprint15s_1, sprint15s_2, sprint15s_3]);

  // Calculate VMA from 6min distance
  const calculatedVMA = useMemo(() => {
    const distance = parseFloat(vmaDistance);
    if (Number.isFinite(distance) && distance > 0) {
      return Math.round((distance / 1000 / 6 * 60) * 10) / 10;
    }
    return null;
  }, [vmaDistance]);

  // Estimated VLamax from sprint
  const estimatedVlamax = useMemo(() => {
    return bestSprint ? estimateVLamaxFromSprint(bestSprint) : null;
  }, [bestSprint]);

  // Estimated VO2max from VMA
  const estimatedVO2max = useMemo(() => {
    const vmaValue = calculatedVMA || parseFloat(vma);
    return vmaValue ? estimateVO2maxFromVMA(vmaValue) : null;
  }, [calculatedVMA, vma]);

  if (!day) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const quality = parseInt(protocolQuality) || 3;
      const confidence = 0.5 + (quality - 3) * 0.1; // 0.3 to 0.7 based on quality
      
      // Build snapshot updates
      const snapshotUpdates: Record<string, unknown> = {
        protocol_quality: quality,
        // Force le routage CAP côté moteur VLamax (sinon le dashboard retombe sur l'estimation vélo)
        sport_main: "run",
      };
      
      // Build test data for calibration
      let testType = "";
      let testName = "";
      const rawData: Record<string, unknown> = {
        dayKey,
        category: "CAP_TEST",
        source: "CAP_TESTING_WEEK",
        protocolQuality: quality,
        hrMax: hrMax ? parseInt(hrMax) : null,
        hrAvg: hrAvg ? parseInt(hrAvg) : null,
        notes,
      };

      // Add data based on day
      if (dayKey === "D1" && bestSprint) {
        testType = "VLAMAX";
        testName = "Sprint 15s CAP";
        snapshotUpdates.sprint_15s_distance = bestSprint;
        rawData.sprint_attempts = [
          sprint15s_1 ? parseFloat(sprint15s_1) : null,
          sprint15s_2 ? parseFloat(sprint15s_2) : null,
          sprint15s_3 ? parseFloat(sprint15s_3) : null,
        ].filter(v => v !== null);
        rawData.bestDistance = bestSprint;
        rawData.estimatedVlamax = estimatedVlamax;
        // NOTE: on n'écrit plus snapshot.vlamax_run depuis le sprint 15s.
        // Le sprint reste un signal alimentant `vlamaxCapEstimator` (multi-sources)
        // via `sprint_15s_distance`. Voir mémoire `cap-vlamax-unified-source`.
        
      } else if (dayKey === "D3") {
        testType = "VMA";
        testName = "Test VMA 6min";
        const finalVMA = calculatedVMA || (vma ? parseFloat(vma) : null);
        if (finalVMA) {
          snapshotUpdates.vma = finalVMA;
          rawData.vma = finalVMA;
          rawData.distance6min = vmaDistance ? parseFloat(vmaDistance) : null;
          rawData.estimatedVO2max = estimatedVO2max;
        }
        
      } else if (dayKey === "D5") {
        testType = "TTE";
        testName = "Test Seuil 30min + TTE";
        const paceSeconds = parsePaceToSeconds(paceThreshold);
        if (paceSeconds) {
          snapshotUpdates.pace_threshold_sec_per_km = paceSeconds;
          rawData.paceThreshold = paceSeconds;
          rawData.paceThresholdFormatted = paceThreshold;
        }
        if (tteObserved) {
          snapshotUpdates.tte_observed_min = parseInt(tteObserved);
          snapshotUpdates.tte_mode = "OBSERVED";
          rawData.tteObserved = parseInt(tteObserved);
        }
        if (runPowerMax) {
          snapshotUpdates.running_power_max = parseFloat(runPowerMax);
          rawData.runPowerMax = parseFloat(runPowerMax);
        }
        if (runPowerThreshold) {
          snapshotUpdates.running_power_threshold = parseFloat(runPowerThreshold);
          rawData.runPowerThreshold = parseFloat(runPowerThreshold);
        }
        if (hrDrift) {
          snapshotUpdates.run_hr_drift_pct = parseFloat(hrDrift);
          rawData.hrDrift = parseFloat(hrDrift);
        }
        
      } else if (dayKey === "D6") {
        testType = "ECONOMY";
        testName = "Validation Endurance Z2";
        if (hrDrift) {
          rawData.hrDrift = parseFloat(hrDrift);
          snapshotUpdates.run_hr_drift_pct = parseFloat(hrDrift);
        }
      }

      // 1. Update snapshot with profile data
      if (snapshot && Object.keys(snapshotUpdates).length > 1) {
        const snapshotUpdated = await updateSnapshot(snapshot.id, snapshotUpdates);
        if (!snapshotUpdated) return;
      }
      
      // 2. Save as test entry for calibration (only for main test days)
      if (testType && ["D1", "D3", "D5"].includes(dayKey)) {
        const vlamaxValue = dayKey === "D1" ? estimatedVlamax : null;
        
        await addTest(
          athlete.id,
          testType,
          testName,
          "run",
          confidence,
          vlamaxValue,
          rawData as Json,
          notes || null
        );

        // Create calibration_evidence row to feed the 42-day continuous calibration window
        if (user) {
          const evidenceTypeMap: Record<string, string> = {
            D1: "SPRINT_15S",
            D3: "MAP",
            D5: "TTE_OBS",
          };
          await supabase.from("calibration_evidence").insert({
            athlete_id: athlete.id,
            coach_id: user.id,
            date: new Date().toISOString().split("T")[0],
            source_type: "TEST_PROTOCOL",
            evidence_type: evidenceTypeMap[dayKey] || "SPRINT_15S",
            raw_values: rawData as Json,
            protocol_quality: quality,
            confidence_evidence: confidence,
            validity: "OK",
            notes: notes || null,
            used_in_calibration: false,
            calibration_weight: 0,
          });
        }
        
        toast.success(
          <div className="space-y-1">
            <p className="font-medium">Test enregistré ✓</p>
            <p className="text-sm text-muted-foreground">
              {testName} sauvegardé pour calibration VLamax CAP
            </p>
          </div>
        );
      } else {
        toast.success("Données enregistrées");
      }
      
      await onSave(snapshotUpdates);
      clearAllPersisted();
    } catch (error) {
      console.error("Error saving CAP test:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const renderFormFields = () => {
    switch (dayKey) {
      case "D1":
        return (
          <div className="space-y-4">
            <Alert className="bg-primary/5 border-primary/20">
              <Zap className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                Le sprint 15s mesure la capacité glycolytique maximale — clé pour estimer VLamax CAP.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <Label className="text-base font-medium">3 tentatives Sprint 15s</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Essai 1</Label>
                  <div className="flex gap-1 items-center mt-1">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 82"
                      value={sprint15s_1}
                      onChange={(e) => setSprint15s_1(e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground">m</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Essai 2</Label>
                  <div className="flex gap-1 items-center mt-1">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 85"
                      value={sprint15s_2}
                      onChange={(e) => setSprint15s_2(e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground">m</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Essai 3</Label>
                  <div className="flex gap-1 items-center mt-1">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Ex: 84"
                      value={sprint15s_3}
                      onChange={(e) => setSprint15s_3(e.target.value)}
                    />
                    <span className="text-xs text-muted-foreground">m</span>
                  </div>
                </div>
              </div>
              
              <SprintTimeConverter
                onApply={(distance, source) => {
                  // Fill the first empty slot with the converted value
                  if (!sprint15s_1) {
                    setSprint15s_1(distance.toString());
                  } else if (!sprint15s_2) {
                    setSprint15s_2(distance.toString());
                  } else if (!sprint15s_3) {
                    setSprint15s_3(distance.toString());
                  } else {
                    // All filled: replace the smallest value
                    const values = [sprint15s_1, sprint15s_2, sprint15s_3].map(Number);
                    const minIdx = values.indexOf(Math.min(...values));
                    if (minIdx === 0) setSprint15s_1(distance.toString());
                    else if (minIdx === 1) setSprint15s_2(distance.toString());
                    else setSprint15s_3(distance.toString());
                  }
                  toast.success(`Distance ${distance}m appliquée (estimée depuis sprint ${source})`);
                }}
              />
              
              {bestSprint && (
                <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800 dark:text-green-200">
                        Meilleur essai: {bestSprint}m
                      </span>
                    </div>
                    {estimatedVlamax && (
                      <Badge variant="secondary" className="bg-green-100 dark:bg-green-900">
                        VLamax CAP ≈ {estimatedVlamax.toFixed(2)} mmol/L/s
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <Label>FC Max atteinte (optionnel)</Label>
              <div className="flex gap-2 items-center mt-1">
                <Input
                  type="number"
                  placeholder="Ex: 185"
                  value={hrMax}
                  onChange={(e) => setHrMax(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">bpm</span>
              </div>
            </div>
          </div>
        );
      
      case "D3":
        return (
          <div className="space-y-4">
            <Alert className="bg-primary/5 border-primary/20">
              <TrendingUp className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                La VMA calibre votre VO₂max et les allures d'entraînement intensives.
              </AlertDescription>
            </Alert>
            
            <div>
              <Label>Distance parcourue en 6 min (option calcul auto)</Label>
              <div className="flex gap-2 items-center mt-1">
                <Input
                  type="number"
                  placeholder="Ex: 1650"
                  value={vmaDistance}
                  onChange={(e) => setVmaDistance(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">m</span>
              </div>
              {calculatedVMA && (
                <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  VMA calculée: {calculatedVMA} km/h
                </p>
              )}
            </div>
            
            <div>
              <Label>VMA mesurée (ou saisie directe)</Label>
              <div className="flex gap-2 items-center mt-1">
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 17.5"
                  value={vma}
                  onChange={(e) => setVma(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">km/h</span>
              </div>
            </div>
            
            {estimatedVO2max && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800 dark:text-blue-200">
                    VO₂max estimé: ~{estimatedVO2max} ml/kg/min
                  </span>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>FC Max atteinte</Label>
                <div className="flex gap-2 items-center mt-1">
                  <Input
                    type="number"
                    placeholder="Ex: 192"
                    value={hrMax}
                    onChange={(e) => setHrMax(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">bpm</span>
                </div>
              </div>
              <div>
                <Label>FC Moyenne</Label>
                <div className="flex gap-2 items-center mt-1">
                  <Input
                    type="number"
                    placeholder="Ex: 182"
                    value={hrAvg}
                    onChange={(e) => setHrAvg(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">bpm</span>
                </div>
              </div>
            </div>
          </div>
        );
      
      case "D5":
        return (
          <div className="space-y-4">
            <Alert className="bg-primary/5 border-primary/20">
              <Target className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                L'allure seuil et le TTE sont critiques pour calibrer votre durabilité et vos cibles marathon.
              </AlertDescription>
            </Alert>
            
            <div>
              <Label className="text-base font-medium">Allure Seuil (30 min test)</Label>
              <div className="flex gap-2 items-center mt-1">
                <Input
                  type="text"
                  placeholder="4:30 ou 270"
                  value={paceThreshold}
                  onChange={(e) => setPaceThreshold(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">/km</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Allure moyenne sur le test de 30 min (format mm:ss ou secondes)
              </p>
            </div>
            
            <div>
              <Label className="text-base font-medium">TTE observé</Label>
              <div className="flex gap-2 items-center mt-1">
                <Input
                  type="number"
                  placeholder="Ex: 45"
                  value={tteObserved}
                  onChange={(e) => setTteObserved(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">minutes</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Durée totale à l'allure seuil jusqu'à l'épuisement
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>FC Moyenne</Label>
                <div className="flex gap-2 items-center mt-1">
                  <Input
                    type="number"
                    placeholder="Ex: 168"
                    value={hrAvg}
                    onChange={(e) => setHrAvg(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">bpm</span>
                </div>
              </div>
              <div>
                <Label>Dérive FC (%)</Label>
                <div className="flex gap-2 items-center mt-1">
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 5.2"
                    value={hrDrift}
                    onChange={(e) => setHrDrift(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            </div>

            <Separator />
            <p className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Données de puissance (optionnel)
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Puissance Max CAP</Label>
                <div className="flex gap-2 items-center mt-1">
                  <Input
                    type="number"
                    placeholder="Ex: 450"
                    value={runPowerMax}
                    onChange={(e) => setRunPowerMax(e.target.value)}
                  />
                  <span className="text-sm text-muted-foreground">W</span>
                </div>
              </div>
              <div>
                <Label>Puissance Seuil CAP</Label>
                <div className="flex gap-2 items-center mt-1">
                  <Input
                    type="number"
                    placeholder="Ex: 280"
                    value={runPowerThreshold}
                    onChange={(e) => setRunPowerThreshold(e.target.value)}
                  />
                  <span className="text-sm text-muted-foreground">W</span>
                </div>
              </div>
            </div>
          </div>
        );
      
      case "D6":
        return (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Session de validation — vérification de la récupération et cohérence du profil.
              </AlertDescription>
            </Alert>
            
            <div>
              <Label>Dérive FC sur 50 min (%)</Label>
              <div className="flex gap-2 items-center mt-1">
                <Input
                  type="number"
                  step="0.1"
                  placeholder="Ex: 3.5"
                  value={hrDrift}
                  onChange={(e) => setHrDrift(e.target.value)}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Critère de validation: drift &lt; 5%
              </p>
              {hrDrift && parseFloat(hrDrift) < 5 && (
                <p className="text-sm text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Bonne récupération confirmée
                </p>
              )}
            </div>
          </div>
        );
      
      default:
        return (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Ce jour n'a pas de données spécifiques à enregistrer — session de récupération.
            </AlertDescription>
          </Alert>
        );
    }
  };

  return (
    <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">{day.dayKey}</Badge>
            {day.title}
          </SheetTitle>
          <SheetDescription>
            {day.goal}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-220px)] pr-4">
          <div className="space-y-6 py-4">
            {/* Protocol Summary */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Protocole
              </h4>
              
              {day.protocol.main.map((step, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/50 text-sm">
                  <div className="font-medium">{step.intensityLabel}</div>
                  {step.notes && (
                    <p className="text-muted-foreground text-xs mt-1">{step.notes}</p>
                  )}
                </div>
              ))}
            </div>

            <Separator />

            {/* Validity Criteria */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Critères de validité
              </h4>
              <ul className="space-y-1">
                {day.protocol.validityCriteria.map((criteria, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />
                    {criteria}
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            {/* Form Fields */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">📊 Données à enregistrer</h4>
              {renderFormFields()}
            </div>

            <Separator />

            {/* Notes */}
            <div>
              <Label>Notes (conditions, sensations...)</Label>
              <Textarea
                placeholder="Conditions météo, fatigue ressentie, remarques..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>

            {/* Protocol Quality */}
            <div>
              <Label>Qualité du protocole (1–5)</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((q) => (
                  <Button
                    key={q}
                    type="button"
                    variant={protocolQuality === String(q) ? "default" : "outline"}
                    size="sm"
                    onClick={() => setProtocolQuality(String(q))}
                    className="w-10"
                  >
                    {q}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                1 = Conditions difficiles, 3 = Correct, 5 = Conditions optimales
              </p>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
