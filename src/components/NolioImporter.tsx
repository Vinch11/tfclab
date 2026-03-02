/**
 * Nolio Power/Pace Curve Importer
 * Imports CSV records from Nolio and pre-fills snapshot fields
 */
import { useState, useRef } from "react";
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
import { Upload, FileText, CheckCircle, AlertCircle, TrendingUp, Bike, PersonStanding } from "lucide-react";
import { parseNolioCurveCSV, NolioCurveResult, formatDuration } from "@/lib/nolioCurveParser";
import { toast } from "sonner";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";

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
}

export function NolioImporter({ onImport, variant = "inline" }: NolioImporterProps) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<NolioCurveResult | null>(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      <DialogContent className="sm:max-w-[700px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Import Courbe de Puissance/Allure Nolio
          </DialogTitle>
          <DialogDescription>
            Importez vos records de puissance (vélo) ou d'allure (course) depuis un export CSV Nolio pour pré-remplir le profil physiologique.
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
