/**
 * Nolio Power/Pace Curve Importer
 * Imports CSV records from Nolio and pre-fills snapshot fields
 * Supports multi-file import: duration×power, duration×pace, distance×power, distance×pace
 * + VLamax V2 Enhanced auto-calculation with delta display
 */
import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, FileText, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Minus, Bike, PersonStanding, Zap, Plus, X, FlaskConical } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { parseNolioCurveCSV, mergeNolioCurveResultsMultiSport, NolioCurveResult, formatDuration, type MultiSportMergeResult } from "@/lib/nolioCurveParser";
import { calibrateVLamaxFromMLSS } from "@/lib/v2/maderMetabolicModel";
import { computeVLamaxBikeV2Enhanced, VLamaxBikeV2EnhancedResult, getVLamaxV2EnhancedCategory } from "@/lib/v2/vlamaxBikeV2Enhanced";
import { computeVLamaxRunV2Enhanced, VLamaxRunV2EnhancedResult, getRunVLamaxCategory, getRunGlycolyticCategoryColor } from "@/lib/v2/vlamaxRunV2Enhanced";
import { refineVlamaxWithGlycolyticProfile, GlycolyticRefinementResult, getConvergenceColor, getConvergenceBadgeVariant, getConvergenceLabel } from "@/lib/v2/glycolyticProfileRefinement";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, ReferenceLine, Legend } from "recharts";
import { generateMaderPowerDurationCurve, buildOverlayData } from "@/lib/v2/maderPowerDurationCurve";
import type { MaderProfile } from "@/lib/v2/maderMetabolicModel";

export interface NolioImportResult {
  // Bike fields
  pmax_5s?: string;
  p30s_w?: string;
  p60s_w?: string;
  map5min_w?: string;
  ftp?: string;
  // Run fields
  pace_threshold?: string;
  vma?: string;
  running_power_max?: string;
  running_power_threshold?: string;
  vlamax_run?: string; // VLamax CAP calculée
  // ✅ Running power granulaires (Score G CAP)
  running_power_1s?: string;
  running_power_5s?: string;
  running_power_30s?: string;
  running_power_60s?: string;
  running_power_5min?: string;
  // Meta
  date?: string;
  coach_notes?: string;
  is_semaine_test?: boolean;
  protocol_quality?: number;
}

interface NolioImporterProps {
  onImport: (values: NolioImportResult) => void;
  variant?: "inline" | "standalone";
  previousVLamax?: number | null;
  currentFtp?: number | null;
  currentWeight?: number | null;
  currentVo2max?: number | null;
  currentVlamax?: number | null;
  objectif?: string;
}

interface ParsedFile {
  name: string;
  result: NolioCurveResult;
  axisType: string;
  dataType: string;
}

export function NolioImporter({ onImport, variant = "inline", previousVLamax, currentFtp, currentWeight, currentVo2max, currentVlamax, objectif }: NolioImporterProps) {
  const [open, setOpen] = useState(false);
  const [parsedFiles, setParsedFiles] = useState<ParsedFile[]>([]);
  const [isSemaineTest, setIsSemaineTest] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-sport merge from all files
  const multiSport = useMemo<MultiSportMergeResult | null>(() => {
    if (parsedFiles.length === 0) return null;
    return mergeNolioCurveResultsMultiSport(parsedFiles.map(f => f.result));
  }, [parsedFiles]);

  // Backward-compatible combined result
  const merged = multiSport?.combined ?? null;
  // Per-sport results
  const bikeResult = multiSport?.bike ?? null;
  const runResult = multiSport?.run ?? null;

  // VLamax V2 Enhanced (bike) — uses bike-specific result if available
  const vlamaxResult = useMemo<VLamaxBikeV2EnhancedResult | null>(() => {
    const bikeData = bikeResult ?? (merged?.sport === "bike" ? merged : null);
    if (!bikeData) return null;
    const { extracted } = bikeData;
    const ftp = extracted.ftp_estimated || (currentFtp ?? 0);
    if (!ftp || ftp <= 0) return null;
    return computeVLamaxBikeV2Enhanced({
      ftp,
      p30s_w: extracted.p30s_w ?? null,
      p60s_w: extracted.p60s_w ?? null,
      map5min_w: extracted.map5min_w ?? null,
      pmax_5s: extracted.pmax_5s ?? null,
      weight_kg: currentWeight ?? null,
      objectif,
    });
  }, [bikeResult, merged, currentFtp, currentWeight, objectif]);

  // VLamax Run V2 Enhanced — uses run-specific result if available
  const runVlamaxResult = useMemo<VLamaxRunV2EnhancedResult | null>(() => {
    const runData = runResult ?? (merged?.sport === "run" ? merged : null);
    if (!runData) return null;
    const { extracted } = runData;
    const rpt = extracted.run_power_threshold;
    if (!rpt || rpt <= 0) return null;
    return computeVLamaxRunV2Enhanced({
      runPowerThreshold: rpt,
      runPower1s: extracted.run_power_max ?? null,
      runPower5s: extracted.run_power_5s ?? null,
      runPower30s: extracted.run_power_30s ?? null,
      runPower60s: extracted.run_power_1min ?? null,
      runPower5min: extracted.run_power_5min ?? null,
      weightKg: currentWeight ?? null,
      vma: extracted.vma ?? null,
      paceThresholdSecPerKm: extracted.pace_threshold ?? null,
    });
  }, [runResult, merged, currentWeight]);

  // Glycolytic profile refinement (bike)
  const bikeGlycoRefinement = useMemo<GlycolyticRefinementResult | null>(() => {
    if (!vlamaxResult) return null;
    const gp = (bikeResult ?? merged)?.glycolyticProfile;
    if (!gp) return null;
    return refineVlamaxWithGlycolyticProfile({
      vlamaxScoreG: vlamaxResult.value,
      confidenceScoreG: vlamaxResult.confidence,
      rangeWidth: (vlamaxResult.rangeMax - vlamaxResult.rangeMin) / 2,
      glycolyticIndex: gp.glycolyticIndex,
      decayRate1to5: gp.decayRate1to5,
      decayRate5to30: gp.decayRate5to30,
      decayRate30to60: null,
      sport: "bike",
    });
  }, [vlamaxResult, bikeResult, merged]);

  // Glycolytic profile refinement (run)
  const runGlycoRefinement = useMemo<GlycolyticRefinementResult | null>(() => {
    if (!runVlamaxResult || !runVlamaxResult.runGlycolyticProfile) return null;
    const gp = runVlamaxResult.runGlycolyticProfile;
    return refineVlamaxWithGlycolyticProfile({
      vlamaxScoreG: runVlamaxResult.value,
      confidenceScoreG: runVlamaxResult.confidence,
      rangeWidth: (runVlamaxResult.rangeMax - runVlamaxResult.rangeMin) / 2,
      glycolyticIndex: gp.glycolyticIndex,
      decayRate1to5: gp.decayRate1to5,
      decayRate5to30: gp.decayRate5to30,
      decayRate30to60: gp.decayRate30to60,
      sport: "run",
    });
  }, [runVlamaxResult]);

  const activeGlycoRefinement = bikeGlycoRefinement ?? runGlycoRefinement;

  // Use refined value if available, otherwise raw
  const activeVlamax = bikeGlycoRefinement?.vlamaxRefined ?? runGlycoRefinement?.vlamaxRefined ?? vlamaxResult?.value ?? runVlamaxResult?.value ?? null;

  const delta = useMemo(() => {
    if (!activeVlamax || !previousVLamax || previousVLamax <= 0) return null;
    const diff = activeVlamax - previousVLamax;
    const pct = (diff / previousVLamax) * 100;
    return { diff, pct, direction: diff > 0.005 ? "up" : diff < -0.005 ? "down" : "stable" as "up" | "down" | "stable" };
  }, [activeVlamax, previousVLamax]);

  // Mader modeled power curve overlay (bike)
  const overlayData = useMemo(() => {
    const bikeData = bikeResult ?? (merged?.sport === "bike" ? merged : null);
    if (!bikeData) return null;
    const vo2 = currentVo2max;
    const vla = vlamaxResult?.value ?? currentVlamax;
    const wt = currentWeight ?? 70;
    if (!vo2 || vo2 <= 0 || !vla || vla <= 0) return null;
    const nolioWattsCurve = bikeData.curve.filter(p => 
      bikeData.records.some(r => r.durationSec === p.durationSec && r.unit === "W")
    );
    if (nolioWattsCurve.length < 3) return null;
    const profile: MaderProfile = { vo2max: vo2, vlamax: vla, weight: wt };
    const maderCurve = generateMaderPowerDurationCurve(profile, nolioWattsCurve.map(p => p.durationSec));
    const data = buildOverlayData(nolioWattsCurve, maderCurve.points);
    return { data, cp: maderCurve.cp, wPrime: maderCurve.wPrime, pMax: maderCurve.pMax };
  }, [bikeResult, merged, currentVo2max, currentVlamax, currentWeight, vlamaxResult]);

  // Mader overlay (run)
  const runOverlayData = useMemo(() => {
    const runData = runResult ?? (merged?.sport === "run" ? merged : null);
    if (!runData) return null;
    const vo2 = currentVo2max;
    const vla = runVlamaxResult?.value ?? currentVlamax;
    const wt = currentWeight ?? 70;
    if (!vo2 || vo2 <= 0 || !vla || vla <= 0) return null;
    const nolioWattsCurve = runData.curve.filter(p => 
      runData.records.some(r => r.durationSec === p.durationSec && r.unit === "W")
    );
    if (nolioWattsCurve.length < 3) return null;
    const profile: MaderProfile = { vo2max: vo2, vlamax: vla, weight: wt, efficiency: 0.25 };
    const maderCurve = generateMaderPowerDurationCurve(profile, nolioWattsCurve.map(p => p.durationSec));
    const data = buildOverlayData(nolioWattsCurve, maderCurve.points);
    return { data, cp: maderCurve.cp, wPrime: maderCurve.wPrime, pMax: maderCurve.pMax };
  }, [runResult, merged, currentVo2max, currentVlamax, currentWeight, runVlamaxResult]);

  const activeOverlay = overlayData ?? runOverlayData;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        try {
          const parsed = parseNolioCurveCSV(content);
          if (parsed.records.length === 0) {
            toast.error(`${file.name}: aucun record trouvé`);
            return;
          }
          const axisType = parsed.axisTypes.join("+");
          const dataType = parsed.dataTypes.join("+");
          setParsedFiles(prev => [...prev, { name: file.name, result: parsed, axisType, dataType }]);
          toast.success(`${file.name}: ${parsed.records.length} records (${dataType} × ${axisType})`);
        } catch {
          toast.error(`${file.name}: erreur de lecture CSV`);
        }
      };
      reader.readAsText(file);
    });
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setParsedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleImport = () => {
    if (!merged) return;
    const { latestDate } = merged;
    const values: NolioImportResult = { date: latestDate };
    const isMulti = multiSport?.isMultiSport ?? false;
    const sportLabel = isMulti ? "vélo + course" : (merged.sport === "bike" ? "vélo" : "course");
    const notes: string[] = [`Import Nolio (${parsedFiles.length} fichier(s), ${sportLabel})${isSemaineTest ? " 🧪 SEMAINE TEST" : ""}`];

    // === BIKE DATA ===
    const bikeEx = bikeResult?.extracted ?? (merged.sport === "bike" ? merged.extracted : null);
    if (bikeEx) {
      if (bikeEx.pmax_5s) values.pmax_5s = String(Math.round(bikeEx.pmax_5s));
      if (bikeEx.p30s_w) values.p30s_w = String(Math.round(bikeEx.p30s_w));
      if (bikeEx.p60s_w) values.p60s_w = String(Math.round(bikeEx.p60s_w));
      if (bikeEx.map5min_w) values.map5min_w = String(Math.round(bikeEx.map5min_w));
      if (bikeEx.ftp_estimated) {
        values.ftp = String(bikeEx.ftp_estimated);
        notes.push(`FTP estimé: ${bikeEx.ftp_source}`);
      }
      if (vlamaxResult) {
        notes.push(`🚴 VLamax Vélo: ${vlamaxResult.value.toFixed(2)} [${vlamaxResult.rangeMin.toFixed(2)}–${vlamaxResult.rangeMax.toFixed(2)}]`);
        if (bikeGlycoRefinement && bikeGlycoRefinement.convergence !== "insufficient") {
          notes.push(`VLamax vélo affinée: ${bikeGlycoRefinement.vlamaxRefined.toFixed(2)} (${getConvergenceLabel(bikeGlycoRefinement.convergence)})`);
        }
      }
    }

    // === RUN DATA ===
    const runEx = runResult?.extracted ?? (merged.sport === "run" ? merged.extracted : null);
    if (runEx) {
      if (runEx.vma) values.vma = String(runEx.vma.toFixed(1));
      if (runEx.pace_threshold) {
        const min = Math.floor(runEx.pace_threshold / 60);
        const sec = runEx.pace_threshold % 60;
        values.pace_threshold = `${min}:${String(sec).padStart(2, "0")}`;
      }
      if (runEx.run_power_max) values.running_power_max = String(Math.round(runEx.run_power_max));
      if (runEx.run_power_threshold) values.running_power_threshold = String(Math.round(runEx.run_power_threshold));
      if (runEx.vma) notes.push(`VMA: ${runEx.vma.toFixed(1)} km/h`);
      if (runEx.run_power_max) notes.push(`Pmax run: ${runEx.run_power_max}W`);
      if (runEx.run_power_threshold) notes.push(`Pseuil run: ${runEx.run_power_threshold}W`);
      if (runVlamaxResult) {
        // Sauvegarder la VLamax CAP calculée (affinée si disponible, sinon Score G)
        const runVlamaxValue = runGlycoRefinement?.vlamaxRefined ?? runVlamaxResult.value;
        values.vlamax_run = runVlamaxValue.toFixed(2);
        notes.push(`🏃 VLamax CAP: ${runVlamaxResult.value.toFixed(2)} [${runVlamaxResult.rangeMin.toFixed(2)}–${runVlamaxResult.rangeMax.toFixed(2)}]`);
        if (runVlamaxResult.runGlycolyticProfile) {
          notes.push(`Profil CAP: ${runVlamaxResult.runGlycolyticProfile.category}`);
        }
        if (runGlycoRefinement && runGlycoRefinement.convergence !== "insufficient") {
          notes.push(`VLamax CAP affinée: ${runGlycoRefinement.vlamaxRefined.toFixed(2)} (${getConvergenceLabel(runGlycoRefinement.convergence)})`);
        }
      }
      if (runEx.pace_5k) {
        const m5 = Math.floor(runEx.pace_5k / 60);
        const s5 = Math.round(runEx.pace_5k % 60);
        notes.push(`Allure 5K: ${m5}:${String(s5).padStart(2, "0")}/km`);
      }
      if (runEx.pace_10k) {
        const m10 = Math.floor(runEx.pace_10k / 60);
        const s10 = Math.round(runEx.pace_10k % 60);
        notes.push(`Allure 10K: ${m10}:${String(s10).padStart(2, "0")}/km`);
      }
    }

    // Key points summary
    const keyPoints = merged.curve.filter(p => [5, 30, 60, 300, 1200, 1800].includes(p.durationSec));
    if (keyPoints.length > 0) {
      notes.push("Records: " + keyPoints.map(p => `${formatDuration(p.durationSec)}=${p.value}${merged.records[0]?.unit === "W" ? "W" : ""}`).join(", "));
    }
    values.coach_notes = notes.join(" | ");
    values.is_semaine_test = isSemaineTest;
    values.protocol_quality = isSemaineTest ? 0.95 : 0.65;

    onImport(values);
    toast.success(`${merged.records.length} records importés depuis ${parsedFiles.length} fichier(s)${isMulti ? " (multi-sport)" : ""}${isSemaineTest ? " (semaine test 🧪)" : ""}`);

    setOpen(false);
    setParsedFiles([]);
    setIsSemaineTest(false);
  };

  const isMulti = multiSport?.isMultiSport ?? false;
  const sportIcon = isMulti ? <><Bike className="w-4 h-4" /><PersonStanding className="w-4 h-4" /></> : merged?.sport === "bike" ? <Bike className="w-4 h-4" /> : <PersonStanding className="w-4 h-4" />;
  const sportLabel = isMulti ? "Vélo + Course à pied" : merged?.sport === "bike" ? "Vélo" : merged?.sport === "run" ? "Course à pied" : merged?.sport || "";

  // Chart data — power curve by duration
  const powerChartData = merged?.curve
    .filter(p => merged.records.some(r => r.durationSec === p.durationSec && r.unit === "W"))
    .map(p => ({ duration: formatDuration(p.durationSec), durationSec: p.durationSec, value: p.value })) || [];

  // Chart data — pace/speed curve by duration
  const paceChartData = merged?.records
    .filter(r => r.axisType === "duration" && (r.unit === "min/km" || r.valueSpeed != null))
    .reduce((acc, r) => {
      const existing = acc.find(a => a.durationSec === r.durationSec);
      const speed = r.valueSpeed ?? (r.unit === "km/h" ? r.value : 0);
      if (!existing && speed > 0) {
        acc.push({ duration: formatDuration(r.durationSec), durationSec: r.durationSec, speed });
      } else if (existing && speed > existing.speed) {
        existing.speed = speed;
      }
      return acc;
    }, [] as { duration: string; durationSec: number; speed: number }[])
    .sort((a, b) => a.durationSec - b.durationSec) || [];

  // Distance chart data  
  const distPowerData = merged?.extracted.distancePowerCurve?.map(p => ({
    distance: p.distanceLabel,
    distanceM: p.distanceM,
    watts: p.watts,
  })) || [];

  const distPaceData = merged?.extracted.distanceCurve?.map(p => ({
    distance: p.distanceLabel,
    distanceM: p.distanceM,
    speed: p.speedKmh,
    pace: `${Math.floor(p.paceSecKm / 60)}:${String(Math.round(p.paceSecKm % 60)).padStart(2, "0")}`,
  })) || [];

  const formatPace = (secKm: number) => {
    const m = Math.floor(secKm / 60);
    const s = Math.round(secKm % 60);
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "inline" ? (
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="w-3.5 h-3.5" />
            Import Nolio
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="w-4 h-4" />
            Importer courbe Nolio
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[760px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Import Multi-Format Nolio
          </DialogTitle>
          <DialogDescription>
            Importez vos records depuis Nolio : puissance et/ou allure, par durée et/ou distance. Ajoutez plusieurs fichiers pour un profil complet.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* File input — multiple */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Fichiers CSV Nolio (multi-sélection possible)</Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                multiple
                onChange={handleFileChange}
                className="bg-secondary/50 border-border"
              />
              {parsedFiles.length > 0 && (
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="shrink-0 gap-1">
                  <Plus className="w-3.5 h-3.5" /> Ajouter
                </Button>
              )}
            </div>
          </div>

          {/* Semaine test toggle */}
          {parsedFiles.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-primary/30 bg-primary/5">
              <Checkbox
                id="semaine-test"
                checked={isSemaineTest}
                onCheckedChange={(v) => setIsSemaineTest(!!v)}
              />
              <label htmlFor="semaine-test" className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                <FlaskConical className="w-4 h-4 text-primary" />
                Semaine test
              </label>
              <span className="text-xs text-muted-foreground ml-auto">
                {isSemaineTest
                  ? "✅ Confiance & précision boostées (données contrôlées)"
                  : "Records issus d'entraînements classiques"}
              </span>
            </div>
          )}

          {/* Loaded files list */}
          {parsedFiles.length > 0 && (
            <div className="space-y-1.5">
              {parsedFiles.map((f, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded border border-border bg-secondary/20 text-sm">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate font-medium">{f.name}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">{f.dataType}</Badge>
                  <Badge variant="secondary" className="text-[10px] shrink-0">{f.axisType}</Badge>
                  <span className="text-xs text-muted-foreground">{f.result.records.length} rec.</span>
                  <Button variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0" onClick={() => removeFile(i)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Merged results */}
          {merged && merged.records.length > 0 && (
            <>
              {/* Sport & totals */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="gap-1.5">{sportIcon} {sportLabel}</Badge>
                {isMulti && <Badge variant="default" className="text-[10px]">Multi-sport</Badge>}
                <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  {merged.records.length} records total
                </span>
                {isMulti && multiSport && (
                  <>
                    <Badge variant="secondary" className="text-[10px]">🚴 {multiSport.sportCounts["bike"] ?? 0}</Badge>
                    <Badge variant="secondary" className="text-[10px]">🏃 {multiSport.sportCounts["run"] ?? 0}</Badge>
                  </>
                )}
                {merged.axisTypes.length > 1 && (
                  <Badge variant="secondary" className="text-[10px]">durée + distance</Badge>
                )}
                {merged.dataTypes.length > 1 && (
                  <Badge variant="secondary" className="text-[10px]">{merged.dataTypes.join(" + ")}</Badge>
                )}
                <span className="text-sm text-muted-foreground">Date: {merged.latestDate}</span>
              </div>

              {/* === POWER CURVE (by duration) === */}
              {powerChartData.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">⚡ Courbe de puissance (durée)</p>
                  <div className="h-40 w-full rounded-lg border border-border bg-background/50 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={powerChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="duration" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={45} />
                        <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} formatter={(v: number) => [`${v} W`, "Puissance"]} />
                        {merged.extracted.ftp_estimated && (
                          <ReferenceLine y={merged.extracted.ftp_estimated} stroke="hsl(var(--primary))" strokeDasharray="5 5" label={{ value: `FTP ≈ ${merged.extracted.ftp_estimated}W`, position: "right", fill: "hsl(var(--primary))", fontSize: 9 }} />
                        )}
                        <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2.5, fill: "hsl(var(--primary))" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* === OVERLAY: Nolio vs Mader Model === */}
              {activeOverlay && activeOverlay.data.length >= 3 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-muted-foreground">🔬 Terrain vs Modèle Mader</p>
                    <Badge variant="outline" className="text-[10px]">CP={activeOverlay.cp}W · W'={activeOverlay.wPrime}kJ</Badge>
                  </div>
                  <div className="h-48 w-full rounded-lg border-2 border-primary/20 bg-background/50 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={activeOverlay.data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={50} />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }}
                          formatter={(v: number | null, name: string) => {
                            if (v == null) return ["—", name];
                            return [`${v} W`, name === "nolio" ? "Terrain (Nolio)" : "Modèle (Mader)"];
                          }}
                          labelFormatter={(label) => `Durée: ${label}`}
                        />
                        <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v) => v === "nolio" ? "Terrain (Nolio)" : "Modèle (Mader)"} />
                        <ReferenceLine y={activeOverlay.cp} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: `CP ${activeOverlay.cp}W`, position: "right", fill: "hsl(var(--muted-foreground))", fontSize: 9 }} />
                        <Line type="monotone" dataKey="nolio" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--primary))" }} connectNulls={false} />
                        <Line type="monotone" dataKey="mader" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2.5, fill: "hsl(var(--destructive))" }} connectNulls={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Delta table */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
                    {activeOverlay.data
                      .filter(p => p.nolio != null && p.mader != null)
                      .map((p, i) => (
                        <div key={i} className="p-1.5 rounded border border-border bg-background/70 text-center">
                          <p className="text-[9px] text-muted-foreground">{p.label}</p>
                          <p className={`text-xs font-mono font-bold ${
                            p.delta != null && p.delta > 0 ? "text-emerald-600 dark:text-emerald-400" : 
                            p.delta != null && p.delta < -10 ? "text-destructive" : "text-muted-foreground"
                          }`}>
                            {p.delta != null ? `${p.delta > 0 ? "+" : ""}${p.delta}W` : "—"}
                          </p>
                          <p className="text-[9px] text-muted-foreground">
                            {p.deltaPct != null ? `${p.deltaPct > 0 ? "+" : ""}${p.deltaPct.toFixed(0)}%` : ""}
                          </p>
                        </div>
                      ))
                    }
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">
                    Δ positif = terrain au-dessus du modèle (sous-estimation VLamax ou meilleure efficacité). Δ négatif = terrain en-dessous (fatigue, conditions, ou surestimation).
                  </p>
                </div>
              )}

              {/* === SPEED CURVE (by duration) === */}
              {paceChartData.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">🏃 Courbe de vitesse (durée)</p>
                  <div className="h-40 w-full rounded-lg border border-border bg-background/50 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={paceChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="duration" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={45} unit=" km/h" />
                        <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} formatter={(v: number) => [`${v.toFixed(1)} km/h`, "Vitesse"]} />
                        {merged.extracted.vma && (
                          <ReferenceLine y={merged.extracted.vma} stroke="hsl(var(--destructive))" strokeDasharray="5 5" label={{ value: `VMA ≈ ${merged.extracted.vma.toFixed(1)}`, position: "right", fill: "hsl(var(--destructive))", fontSize: 9 }} />
                        )}
                        <Line type="monotone" dataKey="speed" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 2.5, fill: "hsl(var(--chart-2))" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* === DISTANCE POWER CURVE === */}
              {distPowerData.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">⚡ Puissance par distance</p>
                  <div className="h-36 w-full rounded-lg border border-border bg-background/50 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={distPowerData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="distance" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={45} />
                        <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} formatter={(v: number) => [`${v} W`, "Puissance"]} />
                        <Line type="monotone" dataKey="watts" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2.5, fill: "hsl(var(--primary))" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* === DISTANCE PACE/SPEED CURVE === */}
              {distPaceData.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">🏃 Vitesse par distance</p>
                  <div className="h-36 w-full rounded-lg border border-border bg-background/50 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={distPaceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="distance" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={45} unit=" km/h" />
                        <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} formatter={(v: number, _: string, props: any) => [`${v.toFixed(1)} km/h (${props.payload.pace}/km)`, "Vitesse"]} />
                        <Line type="monotone" dataKey="speed" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 2.5, fill: "hsl(var(--chart-2))" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* === EXTRACTED VALUES === */}
              <div className="p-3 rounded-lg border border-border bg-secondary/20">
                <p className="text-sm font-medium mb-2">📊 Valeurs extraites</p>
                
                {/* Running power — show if run data exists */}
                {(runResult ?? (merged.sport === "run" ? merged : null)) != null && (() => {
                  const rd = runResult ?? merged;
                  return rd.extracted.run_power_max != null ? (
                    <>
                      <p className="text-xs text-muted-foreground font-medium mb-1.5">⚡ Puissance course (durée)</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-sm mb-3">
                        {rd.extracted.run_power_max != null && <ExtractedField label="Pmax 1s" value={`${Math.round(rd.extracted.run_power_max)} W`} highlight />}
                        {rd.extracted.run_power_5s != null && <ExtractedField label="P5s" value={`${Math.round(rd.extracted.run_power_5s)} W`} />}
                        {rd.extracted.run_power_30s != null && <ExtractedField label="P30s" value={`${Math.round(rd.extracted.run_power_30s)} W`} highlight />}
                        {rd.extracted.run_power_1min != null && <ExtractedField label="P1'" value={`${Math.round(rd.extracted.run_power_1min)} W`} />}
                        {rd.extracted.run_power_5min != null && <ExtractedField label="P5'" value={`${Math.round(rd.extracted.run_power_5min)} W`} />}
                        {rd.extracted.run_power_threshold != null && <ExtractedField label="Pseuil" value={`${Math.round(rd.extracted.run_power_threshold)} W`} highlight />}
                        {rd.extracted.run_power_60min != null && <ExtractedField label="P60'" value={`${Math.round(rd.extracted.run_power_60min)} W`} />}
                      </div>
                    </>
                  ) : null;
                })()}

                {/* Running pace/speed */}
                {(runResult ?? (merged.sport === "run" ? merged : null)) != null && (() => {
                  const rd = runResult ?? merged;
                  return (rd.extracted.vma != null || rd.extracted.pace_threshold != null) ? (
                    <>
                      <p className="text-xs text-muted-foreground font-medium mb-1.5">🏃 Allure & Vitesse</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-sm mb-3">
                        {rd.extracted.vma != null && <ExtractedField label="VMA" value={`${rd.extracted.vma.toFixed(1)} km/h`} highlight />}
                        {rd.extracted.speed_max_30s != null && <ExtractedField label="Vmax 30s" value={`${rd.extracted.speed_max_30s.toFixed(1)} km/h`} />}
                        {rd.extracted.speed_max_1min != null && <ExtractedField label="Vmax 1'" value={`${rd.extracted.speed_max_1min.toFixed(1)} km/h`} />}
                        {rd.extracted.pace_threshold != null && <ExtractedField label="Allure seuil" value={`${formatPace(rd.extracted.pace_threshold)}/km`} highlight />}
                        {rd.extracted.pace_5k != null && <ExtractedField label="Allure 5K" value={`${formatPace(rd.extracted.pace_5k)}/km`} />}
                        {rd.extracted.pace_10k != null && <ExtractedField label="Allure 10K" value={`${formatPace(rd.extracted.pace_10k)}/km`} />}
                      </div>
                    </>
                  ) : null;
                })()}

                {/* Bike short power — show if bike data exists */}
                {(bikeResult ?? (merged.sport === "bike" ? merged : null)) != null && (() => {
                  const bd = bikeResult ?? merged;
                  return (
                    <>
                      <p className="text-xs text-muted-foreground font-medium mb-1.5">⚡ Puissance courte vélo</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-sm mb-3">
                        {bd.extracted.pmax_1s != null && <ExtractedField label="P1s" value={`${Math.round(bd.extracted.pmax_1s)} W`} highlight />}
                        {bd.extracted.pmax_3s != null && <ExtractedField label="P3s" value={`${Math.round(bd.extracted.pmax_3s)} W`} />}
                        {bd.extracted.pmax_5s != null && <ExtractedField label="P5s" value={`${Math.round(bd.extracted.pmax_5s)} W`} highlight />}
                        {bd.extracted.pmax_10s != null && <ExtractedField label="P10s" value={`${Math.round(bd.extracted.pmax_10s)} W`} />}
                        {bd.extracted.pmax_15s != null && <ExtractedField label="P15s" value={`${Math.round(bd.extracted.pmax_15s)} W`} />}
                        {bd.extracted.p30s_w != null && <ExtractedField label="P30s" value={`${Math.round(bd.extracted.p30s_w)} W`} highlight />}
                        {bd.extracted.p45s_w != null && <ExtractedField label="P45s" value={`${Math.round(bd.extracted.p45s_w)} W`} />}
                        {bd.extracted.p60s_w != null && <ExtractedField label="P60s" value={`${Math.round(bd.extracted.p60s_w)} W`} />}
                      </div>
                      <p className="text-xs text-muted-foreground font-medium mb-1.5">🫁 Puissance aérobie vélo</p>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-sm">
                        {bd.extracted.map5min_w != null && <ExtractedField label="MAP 5'" value={`${Math.round(bd.extracted.map5min_w)} W`} />}
                        {bd.extracted.ftp_estimated != null && <ExtractedField label="FTP est." value={`${bd.extracted.ftp_estimated} W`} hint={bd.extracted.ftp_source} />}
                        {bd.extracted.p45min_w != null && <ExtractedField label="P45'" value={`${Math.round(bd.extracted.p45min_w)} W`} />}
                        {bd.extracted.p60min_w != null && <ExtractedField label="P60'" value={`${Math.round(bd.extracted.p60min_w)} W`} />}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Glycolytic Profile */}
              {merged.glycolyticProfile && merged.glycolyticProfile.dataPoints.length >= 2 && (
                <div className="p-3 rounded-lg border-2 border-destructive/20 bg-destructive/5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-destructive" />
                    <p className="text-sm font-semibold">Profil Glycolytique</p>
                    <Badge variant="outline" className="ml-auto text-[10px] capitalize">{merged.glycolyticProfile.category}</Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {merged.glycolyticProfile.glycolyticIndex != null && (
                      <GlycoMetric label="P5s / FTP" value={merged.glycolyticProfile.glycolyticIndex.toFixed(2)} />
                    )}
                    {merged.glycolyticProfile.decayRate5to30 != null && (
                      <GlycoMetric label="Decay 5s→30s" value={`${merged.glycolyticProfile.decayRate5to30.toFixed(0)}%`} />
                    )}
                    {merged.glycolyticProfile.decayRate1to5 != null && (
                      <GlycoMetric label="Decay 1s→5s" value={`${merged.glycolyticProfile.decayRate1to5.toFixed(0)}%`} />
                    )}
                    {merged.glycolyticProfile.awcEstimate != null && (
                      <GlycoMetric label="AWC est." value={`${merged.glycolyticProfile.awcEstimate} kJ`} />
                    )}
                  </div>
                  {merged.glycolyticProfile.dataPoints.length >= 3 && (
                    <div className="h-28 w-full rounded border border-border bg-background/50 p-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={merged.glycolyticProfile.dataPoints.map(p => ({ duration: formatDuration(p.sec), watts: p.watts }))}>
                          <CartesianGrid strokeDasharray="2 2" stroke="hsl(var(--border))" />
                          <XAxis dataKey="duration" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} />
                          <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={45} />
                          <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "6px", fontSize: 11 }} formatter={(v: number) => [`${v} W`, "Puissance"]} />
                          <Line type="monotone" dataKey="watts" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3, fill: "hsl(var(--destructive))" }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground italic">{merged.glycolyticProfile.interpretation}</p>
                </div>
              )}

              {/* === GLYCOLYTIC REFINEMENT CONVERGENCE === */}
              {activeGlycoRefinement && activeGlycoRefinement.convergence !== "insufficient" && (
                <div className="p-3 rounded-lg border-2 border-primary/20 bg-primary/5 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Zap className="w-4 h-4 text-primary" />
                    <p className="text-sm font-semibold">Affinage Profil Glycolytique</p>
                    <Badge variant={getConvergenceBadgeVariant(activeGlycoRefinement.convergence)} className="ml-auto text-[10px]">
                      {getConvergenceLabel(activeGlycoRefinement.convergence)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2 rounded border border-border bg-background/70 text-center">
                      <p className="text-[9px] text-muted-foreground">Score G</p>
                      <p className="text-sm font-mono font-bold text-foreground">
                        {(vlamaxResult?.value ?? runVlamaxResult?.value ?? 0).toFixed(2)}
                      </p>
                    </div>
                    {activeGlycoRefinement.vlamaxGlyco != null && (
                      <div className="p-2 rounded border border-border bg-background/70 text-center">
                        <p className="text-[9px] text-muted-foreground">Profil Glyco</p>
                        <p className="text-sm font-mono font-bold text-foreground">
                          {activeGlycoRefinement.vlamaxGlyco.toFixed(2)}
                        </p>
                      </div>
                    )}
                    <div className="p-2 rounded border border-primary/30 bg-primary/10 text-center">
                      <p className="text-[9px] text-muted-foreground">VLamax Affinée</p>
                      <p className="text-lg font-mono font-bold text-primary">
                        {activeGlycoRefinement.vlamaxRefined.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-2 rounded border border-border bg-background/70 text-center">
                      <p className="text-[9px] text-muted-foreground">Confiance</p>
                      <p className="text-sm font-mono font-bold text-foreground">
                        {(activeGlycoRefinement.confidenceRefined * 100).toFixed(0)}%
                      </p>
                      {activeGlycoRefinement.adjustment !== 0 && (
                        <p className="text-[9px] text-muted-foreground">
                          Δ {activeGlycoRefinement.adjustment > 0 ? "+" : ""}{(activeGlycoRefinement.adjustment * 1000).toFixed(0)}‰
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground italic">{activeGlycoRefinement.explanation}</p>
                  {activeGlycoRefinement.additionalSources.length > 0 && (
                    <p className="text-[9px] text-muted-foreground">Sources: {activeGlycoRefinement.additionalSources.join(", ")}</p>
                  )}
                </div>
              )}


              {runVlamaxResult && (
                <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <PersonStanding className="w-5 h-5 text-primary" />
                    <p className="text-sm font-semibold">VLamax CAP V2 Enhanced</p>
                    <Badge variant="outline" className="ml-auto text-[10px]">{runVlamaxResult.formulaLabel}</Badge>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-center">
                      <p className="text-3xl font-mono font-bold text-primary">{runVlamaxResult.value.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">[{runVlamaxResult.rangeMin.toFixed(2)} – {runVlamaxResult.rangeMax.toFixed(2)}] mmol/L/s</p>
                    </div>
                    {delta && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background/80">
                        {delta.direction === "up" ? <TrendingUp className="w-5 h-5 text-destructive" /> : delta.direction === "down" ? <TrendingDown className="w-5 h-5 text-emerald-500" /> : <Minus className="w-5 h-5 text-muted-foreground" />}
                        <div>
                          <p className={`text-lg font-mono font-bold ${delta.direction === "up" ? "text-destructive" : delta.direction === "down" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                            {delta.diff > 0 ? "+" : ""}{delta.diff.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">{delta.pct > 0 ? "+" : ""}{delta.pct.toFixed(1)}% vs précédent ({previousVLamax?.toFixed(2)})</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-sm">
                    <Badge variant="secondary">{getRunVLamaxCategory(runVlamaxResult.value)}</Badge>
                    <span className="text-muted-foreground">Confiance: <span className="font-medium text-foreground">{(runVlamaxResult.confidence * 100).toFixed(0)}%</span></span>
                    {runVlamaxResult.sources.length > 0 && (
                      <span className="text-xs text-muted-foreground">Sources: {runVlamaxResult.sources.join(", ")}</span>
                    )}
                  </div>

                  {/* Running Glycolytic Profile */}
                  {runVlamaxResult.runGlycolyticProfile && (
                    <div className="p-3 rounded border border-border bg-background/50 space-y-2">
                      <div className="flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-destructive" />
                        <p className="text-xs font-semibold">Profil Glycolytique CAP</p>
                        <Badge variant="outline" className={`ml-auto text-[10px] capitalize ${getRunGlycolyticCategoryColor(runVlamaxResult.runGlycolyticProfile.category)}`}>
                          {runVlamaxResult.runGlycolyticProfile.category}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {runVlamaxResult.runGlycolyticProfile.glycolyticIndex != null && (
                          <GlycoMetric label="P5s / RPT" value={runVlamaxResult.runGlycolyticProfile.glycolyticIndex.toFixed(2)} />
                        )}
                        {runVlamaxResult.runGlycolyticProfile.decayRate1to5 != null && (
                          <GlycoMetric label="Decay 1s→5s" value={`${runVlamaxResult.runGlycolyticProfile.decayRate1to5.toFixed(0)}%`} />
                        )}
                        {runVlamaxResult.runGlycolyticProfile.decayRate5to30 != null && (
                          <GlycoMetric label="Decay 5s→30s" value={`${runVlamaxResult.runGlycolyticProfile.decayRate5to30.toFixed(0)}%`} />
                        )}
                        {runVlamaxResult.runGlycolyticProfile.decayRate30to60 != null && (
                          <GlycoMetric label="Decay 30s→60s" value={`${runVlamaxResult.runGlycolyticProfile.decayRate30to60.toFixed(0)}%`} />
                        )}
                        {runVlamaxResult.runGlycolyticProfile.thresholdWkg != null && (
                          <GlycoMetric label="RPT W/kg" value={`${runVlamaxResult.runGlycolyticProfile.thresholdWkg.toFixed(1)}`} />
                        )}
                        {runVlamaxResult.runGlycolyticProfile.p5sWkg != null && (
                          <GlycoMetric label="P5s W/kg" value={`${runVlamaxResult.runGlycolyticProfile.p5sWkg.toFixed(1)}`} />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground italic">{runVlamaxResult.runGlycolyticProfile.interpretation}</p>
                    </div>
                  )}

                  {/* Full calculation traceability — RUN */}
                  {runVlamaxResult.components && (
                    <ScoreGTraceability
                      sport="run"
                      components={runVlamaxResult.components}
                    />
                  )}

                  <p className="text-xs text-muted-foreground italic">{runVlamaxResult.pedagogicalMessage}</p>
                  {runVlamaxResult.warnings.length > 0 && (
                    <div className="space-y-1">
                      {runVlamaxResult.warnings.map((w, i) => (
                        <p key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground"><AlertCircle className="w-3 h-3 shrink-0" />{w}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Delta croisé vélo ↔ CAP */}
              {vlamaxResult && runVlamaxResult && (
                <CrossSportDelta
                  bikeVlamax={bikeGlycoRefinement?.vlamaxRefined ?? vlamaxResult.value}
                  runVlamax={runGlycoRefinement?.vlamaxRefined ?? runVlamaxResult.value}
                  bikeRange={[vlamaxResult.rangeMin, vlamaxResult.rangeMax]}
                  runRange={[runVlamaxResult.rangeMin, runVlamaxResult.rangeMax]}
                />
              )}

              {/* VLamax V2 Enhanced (bike) */}
              {vlamaxResult && (
                <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Bike className="w-5 h-5 text-primary" />
                    <p className="text-sm font-semibold">VLamax Vélo V2 Enhanced</p>
                    <Badge variant="outline" className="ml-auto text-[10px]">{vlamaxResult.formulaLabel}</Badge>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-center">
                      <p className="text-3xl font-mono font-bold text-primary">{vlamaxResult.value.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">[{vlamaxResult.rangeMin.toFixed(2)} – {vlamaxResult.rangeMax.toFixed(2)}] mmol/L/s</p>
                    </div>
                    {delta && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background/80">
                        {delta.direction === "up" ? <TrendingUp className="w-5 h-5 text-destructive" /> : delta.direction === "down" ? <TrendingDown className="w-5 h-5 text-emerald-500" /> : <Minus className="w-5 h-5 text-muted-foreground" />}
                        <div>
                          <p className={`text-lg font-mono font-bold ${delta.direction === "up" ? "text-destructive" : delta.direction === "down" ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                            {delta.diff > 0 ? "+" : ""}{delta.diff.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">{delta.pct > 0 ? "+" : ""}{delta.pct.toFixed(1)}% vs précédent ({previousVLamax?.toFixed(2)})</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-sm">
                    <Badge variant="secondary">{getVLamaxV2EnhancedCategory(vlamaxResult.value)}</Badge>
                    <span className="text-muted-foreground">Confiance: <span className="font-medium text-foreground">{(vlamaxResult.confidence * 100).toFixed(0)}%</span></span>
                  </div>

                  {/* Full calculation traceability — BIKE */}
                  {vlamaxResult.components && (
                    <ScoreGTraceability
                      sport="bike"
                      components={vlamaxResult.components}
                      ftp={(bikeResult ?? merged)?.extracted.ftp_estimated || currentFtp || undefined}
                      vo2max={currentVo2max || undefined}
                      weightKg={currentWeight || undefined}
                    />
                  )}

                  <p className="text-xs text-muted-foreground italic">{vlamaxResult.pedagogicalMessage}</p>
                  {vlamaxResult.warnings.length > 0 && (
                    <div className="space-y-1">
                      {vlamaxResult.warnings.map((w, i) => (
                        <p key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground"><AlertCircle className="w-3 h-3 shrink-0" />{w}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {merged && merged.records.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              Aucun record valide trouvé. Vérifiez le format d'export Nolio.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); setParsedFiles([]); }}>Annuler</Button>
          <Button onClick={handleImport} disabled={!merged || merged.records.length === 0} className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Pré-remplir le snapshot ({merged?.records.length || 0} records)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExtractedField({ label, value, hint, highlight }: { label: string; value: string; hint?: string; highlight?: boolean }) {
  return (
    <div className={`p-2 rounded border border-border ${highlight ? "bg-primary/10 border-primary/30" : "bg-background/70"}`}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-mono font-medium text-foreground ${highlight ? "text-primary" : ""}`}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

function GlycoMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded bg-background/70 border border-border text-center">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-lg font-mono font-bold text-foreground">{value}</p>
    </div>
  );
}

function CrossSportDelta({
  bikeVlamax,
  runVlamax,
  bikeRange,
  runRange,
}: {
  bikeVlamax: number;
  runVlamax: number;
  bikeRange: [number, number];
  runRange: [number, number];
}) {
  const diff = bikeVlamax - runVlamax;
  const absDiff = Math.abs(diff);
  const pct = runVlamax > 0 ? (diff / runVlamax) * 100 : 0;

  // Interpretation
  let interpretation: string;
  let badgeLabel: string;
  let badgeClass: string;

  if (absDiff < 0.03) {
    interpretation = "Profil glycolytique homogène entre vélo et course. Transfert de capacité cohérent, pas de déséquilibre majeur.";
    badgeLabel = "Équilibré";
    badgeClass = "bg-primary/15 text-primary border-primary/30";
  } else if (diff > 0) {
    if (diff > 0.10) {
      interpretation = "VLamax vélo nettement supérieure : dominance glycolytique en vélo. Peut indiquer un manque de travail aérobie vélo ou un profil sprint vélo marqué. Le transfert CAP semble mieux canalisé.";
      badgeLabel = "Vélo > CAP (fort)";
      badgeClass = "bg-destructive/15 text-destructive border-destructive/30";
    } else {
      interpretation = "VLamax vélo légèrement supérieure : profil habituel chez le triathlète, la course favorise naturellement un profil plus oxydatif.";
      badgeLabel = "Vélo > CAP";
      badgeClass = "bg-accent/50 text-accent-foreground border-accent";
    }
  } else {
    if (absDiff > 0.10) {
      interpretation = "VLamax CAP nettement supérieure : profil glycolytique plus marqué en course. Peut signaler un travail d'intervalle intensif en course sans équivalent vélo, ou un FTP vélo sous-estimé.";
      badgeLabel = "CAP > Vélo (fort)";
      badgeClass = "bg-destructive/15 text-destructive border-destructive/30";
    } else {
      interpretation = "VLamax CAP légèrement supérieure : possible si l'athlète fait plus d'intensité en course qu'en vélo. Vérifier la cohérence FTP/P5s.";
      badgeLabel = "CAP > Vélo";
      badgeClass = "bg-accent/50 text-accent-foreground border-accent";
    }
  }

  // Range overlap check
  const rangesOverlap = bikeRange[0] <= runRange[1] && runRange[0] <= bikeRange[1];

  return (
    <div className="p-4 rounded-lg border-2 border-border bg-muted/30 space-y-3">
      <div className="flex items-center gap-2">
        <Bike className="w-4 h-4 text-primary" />
        <span className="text-xs text-muted-foreground">↔</span>
        <PersonStanding className="w-4 h-4 text-primary" />
        <p className="text-sm font-semibold">Delta Croisé VLamax Vélo ↔ CAP</p>
        <Badge className={`ml-auto text-[10px] border ${badgeClass}`}>{badgeLabel}</Badge>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="p-2 rounded border border-border bg-background/70">
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Bike className="w-3 h-3" /> Vélo</p>
          <p className="text-xl font-mono font-bold text-foreground">{bikeVlamax.toFixed(2)}</p>
          <p className="text-[9px] text-muted-foreground">[{bikeRange[0].toFixed(2)}–{bikeRange[1].toFixed(2)}]</p>
        </div>
        <div className="p-2 rounded border border-border bg-background/70 flex flex-col items-center justify-center">
          <p className="text-[10px] text-muted-foreground">Δ</p>
          <p className={`text-2xl font-mono font-bold ${absDiff < 0.03 ? "text-primary" : absDiff > 0.10 ? "text-destructive" : "text-foreground"}`}>
            {diff > 0 ? "+" : ""}{diff.toFixed(2)}
          </p>
          <p className="text-[9px] text-muted-foreground">{pct > 0 ? "+" : ""}{pct.toFixed(0)}%</p>
        </div>
        <div className="p-2 rounded border border-border bg-background/70">
          <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><PersonStanding className="w-3 h-3" /> CAP</p>
          <p className="text-xl font-mono font-bold text-foreground">{runVlamax.toFixed(2)}</p>
          <p className="text-[9px] text-muted-foreground">[{runRange[0].toFixed(2)}–{runRange[1].toFixed(2)}]</p>
        </div>
      </div>

      {!rangesOverlap && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="w-3 h-3 shrink-0" />
          Les plages de confiance ne se chevauchent pas — différence significative entre les deux sports.
        </p>
      )}
      {rangesOverlap && absDiff >= 0.03 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <CheckCircle className="w-3 h-3 shrink-0 text-primary" />
          Plages de confiance se chevauchent — différence dans la marge d'erreur.
        </p>
      )}

      <p className="text-xs text-muted-foreground italic">{interpretation}</p>
    </div>
  );
}

/** Full Score G calculation traceability panel */
function ScoreGTraceability({
  sport,
  components,
  ftp,
  vo2max,
  weightKg,
}: {
  sport: "bike" | "run";
  components: { r30?: number | null; r60?: number | null; rfm?: number | null; S30?: number | null; S60?: number | null; E?: number | null; D?: number | null; scoreG: number; vlamax_raw: number; vlamax_final: number; r1?: number | null; r5?: number | null; S1?: number | null; S5?: number | null; paceRatioVlamax?: number | null; paceRatioDelta?: number | null };
  ftp?: number;
  vo2max?: number;
  weightKg?: number;
}) {
  const isBike = sport === "bike";
  const weights = isBike
    ? { S_pmax: 0.30, S30: 0.20, S60: 0.10, E: 0.25, D: 0.15 }
    : { S1: 0.10, S5: 0.25, S30: 0.30, S60: 0.15, E: 0.10, D: 0.10 };

  const formulaCoeff = isBike ? 0.80 : 0.68;
  const clampRange = isBike ? "[0.20 – 1.05]" : "[0.20 – 0.90]";

  // Build step rows
  type Step = { label: string; formula: string; value: string; weight?: string; contribution?: string; active: boolean };
  const steps: Step[] = [];

  // Ratios
  if (!isBike && components.r1 != null) steps.push({ label: "r1", formula: "P1s / Seuil", value: components.r1.toFixed(2), active: true });
  if (!isBike && components.r5 != null) steps.push({ label: "r5", formula: "P5s / Seuil", value: components.r5.toFixed(2), active: true });
  if (components.r30 != null) steps.push({ label: "r30", formula: isBike ? "P30s / FTP" : "P30s / Seuil", value: components.r30.toFixed(2), active: true });
  if (components.r60 != null) steps.push({ label: "r60", formula: isBike ? "P60s / FTP" : "P60s / Seuil", value: components.r60.toFixed(2), active: true });
  if (components.rfm != null) steps.push({ label: "rfm", formula: isBike ? "FTP / MAP5'" : "Seuil / P5'", value: components.rfm.toFixed(2), active: true });

  // Scores
  const scoreEntries: { key: string; s: number | null | undefined; w: number }[] = [];
  if (isBike && 'S_pmax' in components && (components as any).S_pmax != null) {
    scoreEntries.push({ key: "S_pmax", s: (components as any).S_pmax, w: (weights as any).S_pmax ?? 0.30 });
  }
  if (!isBike) {
    scoreEntries.push({ key: "S1", s: components.S1, w: (weights as any).S1 ?? 0 });
    scoreEntries.push({ key: "S5", s: components.S5, w: (weights as any).S5 ?? 0 });
  }
  scoreEntries.push({ key: "S30", s: components.S30, w: weights.S30 });
  scoreEntries.push({ key: "S60", s: components.S60, w: weights.S60 });
  scoreEntries.push({ key: "E", s: components.E, w: weights.E });
  scoreEntries.push({ key: "D", s: components.D, w: weights.D });

  return (
    <div className="p-3 rounded-lg border border-border bg-background/50 space-y-2">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="text-xs font-semibold text-muted-foreground">Traçabilité Score G — {isBike ? "Vélo" : "CAP"}</p>
      </div>

      {/* Ratios */}
      {steps.length > 0 && (
        <div className="space-y-0.5">
          <p className="text-[10px] text-muted-foreground font-medium">① Ratios bruts</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
            {steps.map(s => (
              <div key={s.label} className="flex items-center gap-1.5 p-1.5 rounded border border-border bg-muted/30 text-[10px]">
                <span className="font-mono font-bold text-foreground">{s.label}</span>
                <span className="text-muted-foreground">=</span>
                <span className="font-mono text-primary font-semibold">{s.value}</span>
                <span className="text-muted-foreground ml-auto truncate">({s.formula})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Normalized scores with weights */}
      <div className="space-y-0.5">
        <p className="text-[10px] text-muted-foreground font-medium">② Scores normalisés × poids</p>
        <div className="space-y-0.5">
          {scoreEntries.map(({ key, s, w }) => {
            const active = s != null;
            const contrib = active ? (s! * w).toFixed(3) : "—";
            const barWidth = active ? Math.min(100, s! * 100) : 0;
            return (
              <div key={key} className={`flex items-center gap-2 p-1.5 rounded border text-[10px] ${active ? "border-border bg-muted/20" : "border-border/50 bg-muted/10 opacity-50"}`}>
                <span className="font-mono font-bold w-6 text-foreground">{key}</span>
                <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${barWidth}%` }} />
                </div>
                <span className="font-mono text-foreground w-8 text-right">{active ? s!.toFixed(2) : "—"}</span>
                <span className="text-muted-foreground">×</span>
                <span className="font-mono text-muted-foreground w-8">{w.toFixed(2)}</span>
                <span className="text-muted-foreground">=</span>
                <span className="font-mono font-semibold text-primary w-10 text-right">{contrib}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Final calculation */}
      <div className="space-y-0.5">
        <p className="text-[10px] text-muted-foreground font-medium">③ Résultat</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 p-2 rounded border border-primary/30 bg-primary/5 text-xs font-mono">
          {components.scoreG != null && (
            <span><span className="text-muted-foreground">Score G =</span> <span className="font-bold text-foreground">{components.scoreG.toFixed(3)}</span></span>
          )}
          <span><span className="text-muted-foreground">→ 0.20 + {formulaCoeff} × G =</span> <span className="font-bold text-foreground">{components.vlamax_raw.toFixed(3)}</span></span>
          <span><span className="text-muted-foreground">clamp {clampRange} →</span> <span className="font-bold text-primary">{components.vlamax_final.toFixed(2)}</span></span>
        </div>
      </div>

      {/* Mader cross-validation (bike only, needs FTP + VO2max + weight) */}
      {isBike && ftp && vo2max && weightKg && (() => {
        const maderVlamax = calibrateVLamaxFromMLSS(ftp, vo2max, weightKg);
        const delta = components.vlamax_final - maderVlamax;
        const absDelta = Math.abs(delta);
        const convergent = absDelta < 0.05;
        const moderate = absDelta < 0.10;
        return (
          <div className="space-y-0.5">
            <p className="text-[10px] text-muted-foreground font-medium">④ Cross-validation Mader-Heck</p>
            <div className={`p-2 rounded border text-[10px] ${convergent ? "border-primary/30 bg-primary/5" : moderate ? "border-accent bg-accent/10" : "border-destructive/30 bg-destructive/5"}`}>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="text-center">
                  <p className="text-muted-foreground">Score G</p>
                  <p className="font-mono font-bold text-foreground text-sm">{components.vlamax_final.toFixed(2)}</p>
                </div>
                <span className="text-muted-foreground">vs</span>
                <div className="text-center">
                  <p className="text-muted-foreground">Mader (FTP→VLamax)</p>
                  <p className="font-mono font-bold text-foreground text-sm">{maderVlamax.toFixed(2)}</p>
                </div>
                <div className="text-center ml-auto">
                  <p className="text-muted-foreground">Δ</p>
                  <p className={`font-mono font-bold text-sm ${convergent ? "text-primary" : moderate ? "text-foreground" : "text-destructive"}`}>
                    {delta > 0 ? "+" : ""}{delta.toFixed(2)}
                  </p>
                </div>
                <Badge className={`text-[9px] border ${convergent ? "bg-primary/15 text-primary border-primary/30" : moderate ? "bg-accent/50 text-accent-foreground border-accent" : "bg-destructive/15 text-destructive border-destructive/30"}`}>
                  {convergent ? "Convergent ✓" : moderate ? "Modéré" : "Divergent ⚠"}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 italic">
                {convergent
                  ? "Score G et modèle Mader convergent : estimation fiable."
                  : moderate
                    ? "Écart modéré : possibles différences de protocole ou d'efficience mécanique."
                    : "Divergence notable : vérifier VO₂max, FTP ou qualité des records courts (P30s/P60s)."}
              </p>
              <p className="text-muted-foreground mt-0.5">
                Mader: calibrateVLamaxFromMLSS(FTP={ftp}W, VO₂max={vo2max}, {weightKg}kg)
              </p>
            </div>
          </div>
        );
      })()}

      {/* Cross-validation allure (run only) */}
      {components.paceRatioVlamax != null && (
        <p className="text-[10px] text-muted-foreground">
          Cross-validation allure: {components.paceRatioVlamax.toFixed(2)} (Δ{(components.paceRatioDelta ?? 0) > 0 ? "+" : ""}{components.paceRatioDelta?.toFixed(2)})
        </p>
      )}
    </div>
  );
}
