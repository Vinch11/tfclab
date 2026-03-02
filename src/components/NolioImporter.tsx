/**
 * Nolio Power/Pace Curve Importer
 * Imports CSV records from Nolio and pre-fills snapshot fields
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
import { Upload, FileText, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Minus, Bike, PersonStanding, Zap } from "lucide-react";
import { parseNolioCurveCSV, NolioCurveResult, formatDuration } from "@/lib/nolioCurveParser";
import { computeVLamaxBikeV2Enhanced, VLamaxBikeV2EnhancedResult, getVLamaxV2EnhancedCategory } from "@/lib/v2/vlamaxBikeV2Enhanced";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid, ReferenceLine } from "recharts";

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
  // Meta
  date?: string;
  coach_notes?: string;
}

interface NolioImporterProps {
  /** Called with extracted values to pre-fill snapshot form */
  onImport: (values: NolioImportResult) => void;
  /** Render as inline button (in form) vs standalone */
  variant?: "inline" | "standalone";
  /** Previous VLamax value for delta comparison */
  previousVLamax?: number | null;
  /** Current FTP for context (used if not in curve) */
  currentFtp?: number | null;
  /** Current weight for context */
  currentWeight?: number | null;
  /** Athlete objective for cluster calibration */
  objectif?: string;
}

export function NolioImporter({ onImport, variant = "inline", previousVLamax, currentFtp, currentWeight, objectif }: NolioImporterProps) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<NolioCurveResult | null>(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute VLamax V2 Enhanced from extracted curve data
  const vlamaxResult = useMemo<VLamaxBikeV2EnhancedResult | null>(() => {
    if (!result || result.sport !== "bike") return null;
    const { extracted } = result;
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
  }, [result, currentFtp, currentWeight, objectif]);

  // Delta with previous VLamax
  const delta = useMemo(() => {
    if (!vlamaxResult || !previousVLamax || previousVLamax <= 0) return null;
    const diff = vlamaxResult.value - previousVLamax;
    const pct = (diff / previousVLamax) * 100;
    return { diff, pct, direction: diff > 0.005 ? "up" : diff < -0.005 ? "down" : "stable" as "up" | "down" | "stable" };
  }, [vlamaxResult, previousVLamax]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        const parsed = parseNolioCurveCSV(content);
        setResult(parsed);
        if (parsed.records.length === 0) {
          toast.error("Aucun record trouvé dans le fichier");
        }
      } catch {
        toast.error("Erreur de lecture du fichier CSV");
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!result) return;
    const { extracted, latestDate, sport } = result;
    const values: NolioImportResult = { date: latestDate };
    const notes: string[] = [`Import courbe Nolio (${sport === "bike" ? "vélo" : sport === "run" ? "course" : sport})`];

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
        notes.push(`VLamax V2 Enhanced: ${vlamaxResult.value.toFixed(2)} [${vlamaxResult.rangeMin.toFixed(2)}–${vlamaxResult.rangeMax.toFixed(2)}] (${vlamaxResult.formulaLabel}, confiance ${(vlamaxResult.confidence * 100).toFixed(0)}%)`);
        if (delta) {
          notes.push(`Δ VLamax: ${delta.diff > 0 ? "+" : ""}${delta.diff.toFixed(2)} (${delta.pct > 0 ? "+" : ""}${delta.pct.toFixed(1)}%)`);
        }
      }
    } else if (sport === "run") {
      if (extracted.pace_threshold) {
        const min = Math.floor(extracted.pace_threshold / 60);
        const sec = extracted.pace_threshold % 60;
        values.pace_threshold = `${min}:${String(sec).padStart(2, "0")}`;
      }
    }

    // Add curve summary to notes
    const keyPoints = result.curve.filter(p => [5, 30, 60, 300, 1200, 1800].includes(p.durationSec));
    if (keyPoints.length > 0) {
      notes.push("Records: " + keyPoints.map(p => `${formatDuration(p.durationSec)}=${p.value}W`).join(", "));
    }
    values.coach_notes = notes.join(" | ");

    onImport(values);
    toast.success(`${result.curve.length} records importés — snapshot pré-rempli`);
    setOpen(false);
    setResult(null);
    setFileName("");
  };

  const sportIcon = result?.sport === "bike" ? <Bike className="w-4 h-4" /> : <PersonStanding className="w-4 h-4" />;
  const sportLabel = result?.sport === "bike" ? "Vélo" : result?.sport === "run" ? "Course" : result?.sport || "";

  const chartData = result?.curve.map(p => ({
    duration: formatDuration(p.durationSec),
    durationSec: p.durationSec,
    value: p.value,
  })) || [];

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
      <DialogContent className="sm:max-w-[720px] bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Import Courbe de Puissance/Allure Nolio
          </DialogTitle>
          <DialogDescription>
            Importez vos records de puissance (vélo) ou d'allure (course) depuis un export CSV Nolio. La VLamax sera recalculée automatiquement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* File input */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Fichier CSV Nolio (export records)</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="bg-secondary/50 border-border"
            />
          </div>

          {/* Results */}
          {result && result.records.length > 0 && (
            <>
              {/* Sport & stats */}
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="gap-1.5">
                  {sportIcon} {sportLabel}
                </Badge>
                <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle className="w-4 h-4" />
                  {result.curve.length} records
                </span>
                <span className="text-sm text-muted-foreground">
                  Date: {result.latestDate}
                </span>
              </div>

              {/* Power/pace curve chart */}
              <div className="h-48 w-full rounded-lg border border-border bg-background/50 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="duration" 
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      width={50}
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12 
                      }}
                      formatter={(value: number) => [`${value} W`, "Puissance"]}
                    />
                    {result.extracted.ftp_estimated && (
                      <ReferenceLine 
                        y={result.extracted.ftp_estimated} 
                        stroke="hsl(var(--primary))" 
                        strokeDasharray="5 5" 
                        label={{ value: `FTP ≈ ${result.extracted.ftp_estimated}W`, position: "right", fill: "hsl(var(--primary))", fontSize: 10 }}
                      />
                    )}
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ r: 3, fill: "hsl(var(--primary))" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Extracted values */}
              <div className="p-3 rounded-lg border border-border bg-secondary/20">
                <p className="text-sm font-medium mb-2">📊 Valeurs extraites pour le snapshot</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  {result.extracted.pmax_5s && (
                    <ExtractedField label="Pmax 5s" value={`${Math.round(result.extracted.pmax_5s)} W`} />
                  )}
                  {result.extracted.p30s_w && (
                    <ExtractedField label="P30s" value={`${Math.round(result.extracted.p30s_w)} W`} />
                  )}
                  {result.extracted.p60s_w && (
                    <ExtractedField label="P60s" value={`${Math.round(result.extracted.p60s_w)} W`} />
                  )}
                  {result.extracted.map5min_w && (
                    <ExtractedField label="MAP 5min" value={`${Math.round(result.extracted.map5min_w)} W`} />
                  )}
                  {result.extracted.ftp_estimated && (
                    <ExtractedField label="FTP estimé" value={`${result.extracted.ftp_estimated} W`} hint={result.extracted.ftp_source} />
                  )}
                  {result.extracted.pace_threshold && (
                    <ExtractedField label="Allure seuil" value={`${Math.floor(result.extracted.pace_threshold / 60)}:${String(result.extracted.pace_threshold % 60).padStart(2, "0")} /km`} />
                  )}
                </div>
              </div>

              {/* ============================================= */}
              {/* VLamax V2 Enhanced — Auto-calculated from curve */}
              {/* ============================================= */}
              {vlamaxResult && (
                <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    <p className="text-sm font-semibold">VLamax V2 Enhanced — Calculée depuis la courbe</p>
                    <Badge variant="outline" className="ml-auto text-[10px]">{vlamaxResult.formulaLabel}</Badge>
                  </div>

                  {/* Main VLamax value + delta */}
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* New VLamax */}
                    <div className="text-center">
                      <p className="text-3xl font-mono font-bold text-primary">{vlamaxResult.value.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        [{vlamaxResult.rangeMin.toFixed(2)} – {vlamaxResult.rangeMax.toFixed(2)}] mmol/L/s
                      </p>
                    </div>

                    {/* Delta */}
                    {delta && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background/80">
                        {delta.direction === "up" ? (
                          <TrendingUp className="w-5 h-5 text-destructive" />
                        ) : delta.direction === "down" ? (
                          <TrendingDown className="w-5 h-5 text-emerald-500" />
                        ) : (
                          <Minus className="w-5 h-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className={`text-lg font-mono font-bold ${
                            delta.direction === "up" ? "text-destructive" : 
                            delta.direction === "down" ? "text-emerald-600 dark:text-emerald-400" : 
                            "text-muted-foreground"
                          }`}>
                            {delta.diff > 0 ? "+" : ""}{delta.diff.toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {delta.pct > 0 ? "+" : ""}{delta.pct.toFixed(1)}% vs précédent ({previousVLamax?.toFixed(2)})
                          </p>
                        </div>
                      </div>
                    )}

                    {/* No previous for comparison */}
                    {!delta && previousVLamax == null && (
                      <div className="px-3 py-2 rounded-lg border border-dashed border-border">
                        <p className="text-xs text-muted-foreground">Première estimation — pas de delta disponible</p>
                      </div>
                    )}
                  </div>

                  {/* Category + Confidence */}
                  <div className="flex items-center gap-3 flex-wrap text-sm">
                    <Badge variant="secondary">{getVLamaxV2EnhancedCategory(vlamaxResult.value)}</Badge>
                    <span className="text-muted-foreground">
                      Confiance: <span className="font-medium text-foreground">{(vlamaxResult.confidence * 100).toFixed(0)}%</span> ({vlamaxResult.confidenceLabel})
                    </span>
                    <span className="text-muted-foreground">
                      Sources: {vlamaxResult.sources.join(", ")}
                    </span>
                  </div>

                  {/* Pedagogical message */}
                  <p className="text-xs text-muted-foreground italic">{vlamaxResult.pedagogicalMessage}</p>

                  {/* Components breakdown (staff detail) */}
                  {vlamaxResult.components && (
                    <div className="grid grid-cols-4 gap-2">
                      {vlamaxResult.components.S30 !== null && (
                        <ComponentScore label="S30" value={vlamaxResult.components.S30} ratio={vlamaxResult.components.r30} ratioLabel="P30/FTP" />
                      )}
                      {vlamaxResult.components.S60 !== null && (
                        <ComponentScore label="S60" value={vlamaxResult.components.S60} ratio={vlamaxResult.components.r60} ratioLabel="P60/FTP" />
                      )}
                      {vlamaxResult.components.E !== null && (
                        <ComponentScore label="E" value={vlamaxResult.components.E} ratio={vlamaxResult.components.rfm} ratioLabel="FTP/MAP" />
                      )}
                      {vlamaxResult.components.D !== null && (
                        <ComponentScore label="D" value={vlamaxResult.components.D} ratio={null} ratioLabel="TTE" />
                      )}
                    </div>
                  )}

                  {/* Warnings */}
                  {vlamaxResult.warnings.length > 0 && (
                    <div className="space-y-1">
                      {vlamaxResult.warnings.map((w, i) => (
                        <p key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <AlertCircle className="w-3 h-3 shrink-0" />
                          {w}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Missing data warnings */}
              {result.sport === "bike" && !result.extracted.pmax_5s && (
                <div className="flex items-center gap-2 text-sm text-warning">
                  <AlertCircle className="w-4 h-4" />
                  Pas de record 5s trouvé — Pmax 5s ne sera pas rempli
                </div>
              )}
            </>
          )}

          {result && result.records.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              Aucun record valide trouvé dans le fichier. Vérifiez le format d'export Nolio.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setOpen(false); setResult(null); setFileName(""); }}>
            Annuler
          </Button>
          <Button
            onClick={handleImport}
            disabled={!result || result.records.length === 0}
            className="gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Pré-remplir le snapshot
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExtractedField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="p-2 rounded bg-background/70 border border-border">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-mono font-medium text-foreground">{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

function ComponentScore({ label, value, ratio, ratioLabel }: { label: string; value: number; ratio: number | null; ratioLabel: string }) {
  const pct = Math.round(value * 100);
  const barColor = value > 0.6 ? "bg-destructive" : value > 0.3 ? "bg-primary" : "bg-emerald-500";
  return (
    <div className="p-2 rounded bg-background/70 border border-border text-center">
      <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
      <div className="h-1.5 w-full rounded-full bg-muted mt-1 mb-1">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <p className="text-xs font-mono font-bold">{pct}%</p>
      {ratio !== null && (
        <p className="text-[9px] text-muted-foreground">{ratioLabel}: {ratio.toFixed(2)}</p>
      )}
    </div>
  );
}
