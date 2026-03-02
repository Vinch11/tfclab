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
import { Upload, FileText, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Minus, Bike, PersonStanding, Zap, Plus, X } from "lucide-react";
import { parseNolioCurveCSV, mergeNolioCurveResults, NolioCurveResult, formatDuration } from "@/lib/nolioCurveParser";
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
  // Meta
  date?: string;
  coach_notes?: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Merged result from all files
  const merged = useMemo<NolioCurveResult | null>(() => {
    if (parsedFiles.length === 0) return null;
    return mergeNolioCurveResults(parsedFiles.map(f => f.result));
  }, [parsedFiles]);

  // VLamax V2 Enhanced (bike)
  const vlamaxResult = useMemo<VLamaxBikeV2EnhancedResult | null>(() => {
    if (!merged || merged.sport !== "bike") return null;
    const { extracted } = merged;
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
  }, [merged, currentFtp, currentWeight, objectif]);

  // VLamax Run V2 Enhanced (running power curve)
  const runVlamaxResult = useMemo<VLamaxRunV2EnhancedResult | null>(() => {
    if (!merged || merged.sport !== "run") return null;
    const { extracted } = merged;
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
  }, [merged, currentWeight]);

  // Glycolytic profile refinement (bike)
  const bikeGlycoRefinement = useMemo<GlycolyticRefinementResult | null>(() => {
    if (!vlamaxResult || !merged?.glycolyticProfile) return null;
    const gp = merged.glycolyticProfile;
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
  }, [vlamaxResult, merged?.glycolyticProfile]);

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

  // Mader modeled power curve overlay
  const overlayData = useMemo(() => {
    if (!merged || merged.sport !== "bike") return null;
    const vo2 = currentVo2max;
    const vla = vlamaxResult?.value ?? currentVlamax;
    const wt = currentWeight ?? 70;
    if (!vo2 || vo2 <= 0 || !vla || vla <= 0) return null;
    const nolioWattsCurve = merged.curve.filter(p => 
      merged.records.some(r => r.durationSec === p.durationSec && r.unit === "W")
    );
    if (nolioWattsCurve.length < 3) return null;
    const profile: MaderProfile = { vo2max: vo2, vlamax: vla, weight: wt };
    const maderCurve = generateMaderPowerDurationCurve(profile, nolioWattsCurve.map(p => p.durationSec));
    const data = buildOverlayData(nolioWattsCurve, maderCurve.points);
    return { data, cp: maderCurve.cp, wPrime: maderCurve.wPrime, pMax: maderCurve.pMax };
  }, [merged, currentVo2max, currentVlamax, currentWeight, vlamaxResult]);

  const runOverlayData = useMemo(() => {
    if (!merged || merged.sport !== "run") return null;
    const vo2 = currentVo2max;
    const vla = runVlamaxResult?.value ?? currentVlamax;
    const wt = currentWeight ?? 70;
    if (!vo2 || vo2 <= 0 || !vla || vla <= 0) return null;
    const nolioWattsCurve = merged.curve.filter(p => 
      merged.records.some(r => r.durationSec === p.durationSec && r.unit === "W")
    );
    if (nolioWattsCurve.length < 3) return null;
    const profile: MaderProfile = { vo2max: vo2, vlamax: vla, weight: wt, efficiency: 0.25 };
    const maderCurve = generateMaderPowerDurationCurve(profile, nolioWattsCurve.map(p => p.durationSec));
    const data = buildOverlayData(nolioWattsCurve, maderCurve.points);
    return { data, cp: maderCurve.cp, wPrime: maderCurve.wPrime, pMax: maderCurve.pMax };
  }, [merged, currentVo2max, currentVlamax, currentWeight, runVlamaxResult]);

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
    const { extracted, latestDate, sport } = merged;
    const values: NolioImportResult = { date: latestDate };
    const notes: string[] = [`Import Nolio multi-fichier (${parsedFiles.length} fichiers, ${sport === "bike" ? "vélo" : "course"})`];

    if (sport === "bike") {
      if (extracted.pmax_5s) values.pmax_5s = String(Math.round(extracted.pmax_5s));
      if (extracted.p30s_w) values.p30s_w = String(Math.round(extracted.p30s_w));
      if (extracted.p60s_w) values.p60s_w = String(Math.round(extracted.p60s_w));
      if (extracted.map5min_w) values.map5min_w = String(Math.round(extracted.map5min_w));
      if (extracted.ftp_estimated) {
        values.ftp = String(extracted.ftp_estimated);
        notes.push(`FTP estimé: ${extracted.ftp_source}`);
      }
      if (vlamaxResult) {
        notes.push(`VLamax V2: ${vlamaxResult.value.toFixed(2)} [${vlamaxResult.rangeMin.toFixed(2)}–${vlamaxResult.rangeMax.toFixed(2)}]`);
        if (bikeGlycoRefinement && bikeGlycoRefinement.convergence !== "insufficient") {
          notes.push(`VLamax affinée: ${bikeGlycoRefinement.vlamaxRefined.toFixed(2)} (${getConvergenceLabel(bikeGlycoRefinement.convergence)}, conf: ${(bikeGlycoRefinement.confidenceRefined * 100).toFixed(0)}%)`);
        }
      }
    } else if (sport === "run") {
      if (extracted.vma) values.vma = String(extracted.vma.toFixed(1));
      if (extracted.pace_threshold) {
        const min = Math.floor(extracted.pace_threshold / 60);
        const sec = extracted.pace_threshold % 60;
        values.pace_threshold = `${min}:${String(sec).padStart(2, "0")}`;
      }
      if (extracted.run_power_max) values.running_power_max = String(Math.round(extracted.run_power_max));
      if (extracted.run_power_threshold) values.running_power_threshold = String(Math.round(extracted.run_power_threshold));
      
      // Detailed notes
      if (extracted.vma) notes.push(`VMA: ${extracted.vma.toFixed(1)} km/h`);
      if (extracted.run_power_max) notes.push(`Pmax run: ${extracted.run_power_max}W`);
      if (extracted.run_power_threshold) notes.push(`Pseuil run: ${extracted.run_power_threshold}W`);
      if (runVlamaxResult) {
        notes.push(`VLamax Run V2: ${runVlamaxResult.value.toFixed(2)} [${runVlamaxResult.rangeMin.toFixed(2)}–${runVlamaxResult.rangeMax.toFixed(2)}]`);
        if (runVlamaxResult.runGlycolyticProfile) {
          notes.push(`Profil: ${runVlamaxResult.runGlycolyticProfile.category}`);
        }
        if (runGlycoRefinement && runGlycoRefinement.convergence !== "insufficient") {
          notes.push(`VLamax CAP affinée: ${runGlycoRefinement.vlamaxRefined.toFixed(2)} (${getConvergenceLabel(runGlycoRefinement.convergence)}, conf: ${(runGlycoRefinement.confidenceRefined * 100).toFixed(0)}%)`);
        }
      }
      if (extracted.pace_5k) {
        const m5 = Math.floor(extracted.pace_5k / 60);
        const s5 = Math.round(extracted.pace_5k % 60);
        notes.push(`Allure 5K: ${m5}:${String(s5).padStart(2, "0")}/km`);
      }
      if (extracted.pace_10k) {
        const m10 = Math.floor(extracted.pace_10k / 60);
        const s10 = Math.round(extracted.pace_10k % 60);
        notes.push(`Allure 10K: ${m10}:${String(s10).padStart(2, "0")}/km`);
      }
    }

    // Key points summary
    const keyPoints = merged.curve.filter(p => [5, 30, 60, 300, 1200, 1800].includes(p.durationSec));
    if (keyPoints.length > 0) {
      notes.push("Records: " + keyPoints.map(p => `${formatDuration(p.durationSec)}=${p.value}${merged.records[0]?.unit === "W" ? "W" : ""}`).join(", "));
    }
    values.coach_notes = notes.join(" | ");

    onImport(values);
    toast.success(`${merged.records.length} records importés depuis ${parsedFiles.length} fichier(s)`);
    setOpen(false);
    setParsedFiles([]);
  };

  const sportIcon = merged?.sport === "bike" ? <Bike className="w-4 h-4" /> : <PersonStanding className="w-4 h-4" />;
  const sportLabel = merged?.sport === "bike" ? "Vélo" : merged?.sport === "run" ? "Course à pied" : merged?.sport || "";

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
                <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  {merged.records.length} records total
                </span>
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
                
                {/* Running power */}
                {merged.sport === "run" && merged.extracted.run_power_max != null && (
                  <>
                    <p className="text-xs text-muted-foreground font-medium mb-1.5">⚡ Puissance course (durée)</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-sm mb-3">
                      {merged.extracted.run_power_max != null && <ExtractedField label="Pmax 1s" value={`${Math.round(merged.extracted.run_power_max)} W`} highlight />}
                      {merged.extracted.run_power_5s != null && <ExtractedField label="P5s" value={`${Math.round(merged.extracted.run_power_5s)} W`} />}
                      {merged.extracted.run_power_30s != null && <ExtractedField label="P30s" value={`${Math.round(merged.extracted.run_power_30s)} W`} highlight />}
                      {merged.extracted.run_power_1min != null && <ExtractedField label="P1'" value={`${Math.round(merged.extracted.run_power_1min)} W`} />}
                      {merged.extracted.run_power_5min != null && <ExtractedField label="P5'" value={`${Math.round(merged.extracted.run_power_5min)} W`} />}
                      {merged.extracted.run_power_threshold != null && <ExtractedField label="Pseuil" value={`${Math.round(merged.extracted.run_power_threshold)} W`} highlight />}
                      {merged.extracted.run_power_60min != null && <ExtractedField label="P60'" value={`${Math.round(merged.extracted.run_power_60min)} W`} />}
                    </div>
                  </>
                )}

                {/* Running pace/speed */}
                {merged.sport === "run" && (merged.extracted.vma != null || merged.extracted.pace_threshold != null) && (
                  <>
                    <p className="text-xs text-muted-foreground font-medium mb-1.5">🏃 Allure & Vitesse</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-sm mb-3">
                      {merged.extracted.vma != null && <ExtractedField label="VMA" value={`${merged.extracted.vma.toFixed(1)} km/h`} highlight />}
                      {merged.extracted.speed_max_30s != null && <ExtractedField label="Vmax 30s" value={`${merged.extracted.speed_max_30s.toFixed(1)} km/h`} />}
                      {merged.extracted.speed_max_1min != null && <ExtractedField label="Vmax 1'" value={`${merged.extracted.speed_max_1min.toFixed(1)} km/h`} />}
                      {merged.extracted.pace_threshold != null && <ExtractedField label="Allure seuil" value={`${formatPace(merged.extracted.pace_threshold)}/km`} highlight />}
                      {merged.extracted.pace_5k != null && <ExtractedField label="Allure 5K" value={`${formatPace(merged.extracted.pace_5k)}/km`} />}
                      {merged.extracted.pace_10k != null && <ExtractedField label="Allure 10K" value={`${formatPace(merged.extracted.pace_10k)}/km`} />}
                    </div>
                  </>
                )}

                {/* Bike short power */}
                {merged.sport === "bike" && (
                  <>
                    <p className="text-xs text-muted-foreground font-medium mb-1.5">⚡ Puissance courte</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-sm mb-3">
                      {merged.extracted.pmax_1s != null && <ExtractedField label="P1s" value={`${Math.round(merged.extracted.pmax_1s)} W`} highlight />}
                      {merged.extracted.pmax_3s != null && <ExtractedField label="P3s" value={`${Math.round(merged.extracted.pmax_3s)} W`} />}
                      {merged.extracted.pmax_5s != null && <ExtractedField label="P5s" value={`${Math.round(merged.extracted.pmax_5s)} W`} highlight />}
                      {merged.extracted.pmax_10s != null && <ExtractedField label="P10s" value={`${Math.round(merged.extracted.pmax_10s)} W`} />}
                      {merged.extracted.pmax_15s != null && <ExtractedField label="P15s" value={`${Math.round(merged.extracted.pmax_15s)} W`} />}
                      {merged.extracted.p30s_w != null && <ExtractedField label="P30s" value={`${Math.round(merged.extracted.p30s_w)} W`} highlight />}
                      {merged.extracted.p45s_w != null && <ExtractedField label="P45s" value={`${Math.round(merged.extracted.p45s_w)} W`} />}
                      {merged.extracted.p60s_w != null && <ExtractedField label="P60s" value={`${Math.round(merged.extracted.p60s_w)} W`} />}
                    </div>
                    <p className="text-xs text-muted-foreground font-medium mb-1.5">🫁 Puissance aérobie</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 text-sm">
                      {merged.extracted.map5min_w != null && <ExtractedField label="MAP 5'" value={`${Math.round(merged.extracted.map5min_w)} W`} />}
                      {merged.extracted.ftp_estimated != null && <ExtractedField label="FTP est." value={`${merged.extracted.ftp_estimated} W`} hint={merged.extracted.ftp_source} />}
                      {merged.extracted.p45min_w != null && <ExtractedField label="P45'" value={`${Math.round(merged.extracted.p45min_w)} W`} />}
                      {merged.extracted.p60min_w != null && <ExtractedField label="P60'" value={`${Math.round(merged.extracted.p60min_w)} W`} />}
                    </div>
                  </>
                )}
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

                  {/* Components breakdown */}
                  {runVlamaxResult.components && (
                    <div className="p-2 rounded border border-border bg-background/50">
                      <p className="text-[10px] text-muted-foreground font-medium mb-1">Composants Score G = {runVlamaxResult.components.scoreG}</p>
                      <div className="flex gap-2 flex-wrap text-[10px] font-mono">
                        {runVlamaxResult.components.S1 != null && <span>S1={runVlamaxResult.components.S1.toFixed(2)}</span>}
                        {runVlamaxResult.components.S5 != null && <span className="font-bold">S5={runVlamaxResult.components.S5.toFixed(2)}</span>}
                        {runVlamaxResult.components.S30 != null && <span className="font-bold">S30={runVlamaxResult.components.S30.toFixed(2)}</span>}
                        {runVlamaxResult.components.S60 != null && <span>S60={runVlamaxResult.components.S60.toFixed(2)}</span>}
                        {runVlamaxResult.components.E != null && <span>E={runVlamaxResult.components.E.toFixed(2)}</span>}
                        {runVlamaxResult.components.D != null && <span>D={runVlamaxResult.components.D.toFixed(2)}</span>}
                      </div>
                      {runVlamaxResult.components.paceRatioVlamax != null && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Cross-validation allure: {runVlamaxResult.components.paceRatioVlamax.toFixed(2)} (Δ{runVlamaxResult.components.paceRatioDelta! > 0 ? "+" : ""}{runVlamaxResult.components.paceRatioDelta?.toFixed(2)})
                        </p>
                      )}
                    </div>
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

              {/* VLamax V2 Enhanced (bike) */}
              {vlamaxResult && (
                <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    <p className="text-sm font-semibold">VLamax V2 Enhanced</p>
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
