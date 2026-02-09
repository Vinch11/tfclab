/**
 * CSV Template Importer - Import training plans as templates
 * Format: semaine, jour, sport, titre, details, durée_min, phase
 */
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, FileText, CheckCircle, AlertCircle, Download } from "lucide-react";
import type { TemplateWeek, TemplateSession } from "@/lib/templates/docxTemplateLoader";
import { toast } from "sonner";

interface CSVTemplateImporterProps {
  onImport: (name: string, target: "IM" | "703" | "Marathon" | "Semi", weeks: TemplateWeek[], description?: string) => Promise<boolean>;
}

interface ParsedSessionRow {
  week: number;
  day: string;
  sport: string;
  title: string;
  details: string;
  durationMin: number;
  phase: string;
  valid: boolean;
  error?: string;
}

export function CSVTemplateImporter({ onImport }: CSVTemplateImporterProps) {
  const [open, setOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedSessionRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [target, setTarget] = useState<"IM" | "703" | "Marathon" | "Semi">("703");
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (content: string): ParsedSessionRow[] => {
    const lines = content.trim().split("\n");
    const results: ParsedSessionRow[] = [];

    // Skip header
    const startIndex = lines[0]?.toLowerCase().includes("semaine") || lines[0]?.toLowerCase().includes("week") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const fields = line.split(/[,;]/);

      try {
        const row: ParsedSessionRow = {
          week: parseInt(fields[0]) || 1,
          day: fields[1]?.trim() || "Lundi",
          sport: fields[2]?.trim() || "Vélo",
          title: fields[3]?.trim() || "",
          details: fields[4]?.trim() || "",
          durationMin: parseInt(fields[5]) || 60,
          phase: fields[6]?.trim() || "",
          valid: true,
        };

        if (!row.title) {
          row.valid = false;
          row.error = "Titre requis";
        }

        results.push(row);
      } catch {
        results.push({
          week: 0, day: "", sport: "", title: "", details: "",
          durationMin: 0, phase: "", valid: false, error: "Erreur de parsing",
        });
      }
    }
    return results;
  };

  const groupIntoWeeks = (rows: ParsedSessionRow[]): TemplateWeek[] => {
    const weekMap = new Map<number, { sessions: TemplateSession[]; phase: string }>();

    for (const row of rows.filter(r => r.valid)) {
      if (!weekMap.has(row.week)) {
        weekMap.set(row.week, { sessions: [], phase: row.phase });
      }
      const entry = weekMap.get(row.week)!;
      entry.sessions.push({
        day: row.day,
        sport: row.sport,
        title: row.title,
        details: row.details,
        durationMin: row.durationMin,
      });
    }

    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([num, data]) => ({
        weekNumber: num,
        theme: `Semaine ${num}`,
        phase: data.phase,
        sessions: data.sessions,
      }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (!templateName) setTemplateName(file.name.replace(/\.(csv|txt)$/i, ""));

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setParsedRows(parseCSV(content));
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!templateName.trim()) { toast.error("Nom du template requis"); return; }
    const validRows = parsedRows.filter(r => r.valid);
    if (validRows.length === 0) { toast.error("Aucune séance valide"); return; }

    setImporting(true);
    const weeks = groupIntoWeeks(validRows);
    const success = await onImport(templateName, target, weeks);
    setImporting(false);

    if (success) {
      toast.success(`Template "${templateName}" importé (${weeks.length} semaines)`);
      setOpen(false);
      setParsedRows([]);
      setFileName("");
      setTemplateName("");
    }
  };

  const downloadTemplate = () => {
    const template = "semaine;jour;sport;titre;details;duree_min;phase\n1;Lundi;Vélo;Endurance Z2;1h30 zone 2 aérobie;90;Endurance\n1;Mardi;Natation;Technique crawl;10x100m technique + éducatifs;60;Endurance\n1;Mercredi;CAP;Footing récup;45min allure facile;45;Endurance\n1;Jeudi;Vélo;Intervalles seuil;4x8min à FTP;75;Seuil\n1;Samedi;CAP;Sortie longue;1h30 progressif;90;Endurance\n2;Lundi;Vélo;Force sous-max;6x5min force 50rpm;80;Force\n2;Mercredi;CAP;Tempo;3x10min allure tempo;60;Seuil";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_plan_import.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedRows.filter(r => r.valid).length;
  const invalidCount = parsedRows.filter(r => !r.valid).length;
  const weekCount = new Set(parsedRows.filter(r => r.valid).map(r => r.week)).size;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Importer un plan CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Importer un plan d'entraînement
          </DialogTitle>
          <DialogDescription>
            Format : semaine, jour, sport, titre, détails, durée_min, phase
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template download */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
            <span className="text-sm text-muted-foreground">Télécharger le modèle CSV</span>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Template
            </Button>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Nom du template</Label>
              <Input
                value={templateName}
                onChange={e => setTemplateName(e.target.value)}
                placeholder="Mon plan 70.3"
                className="bg-secondary/50 border-border h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-muted-foreground text-xs">Objectif</Label>
              <Select value={target} onValueChange={v => setTarget(v as typeof target)}>
                <SelectTrigger className="bg-secondary/50 border-border h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="703">Ironman 70.3</SelectItem>
                  <SelectItem value="IM">Ironman 140.6</SelectItem>
                  <SelectItem value="Marathon">Marathon</SelectItem>
                  <SelectItem value="Semi">Semi-Marathon</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* File input */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs">Fichier CSV</Label>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileChange}
              className="bg-secondary/50 border-border"
            />
          </div>

          {/* Preview */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-medium text-foreground">{fileName}</span>
                <span className="flex items-center gap-1 text-xs text-green-600">
                  <CheckCircle className="w-3 h-3" />
                  {validCount} séance(s) · {weekCount} sem.
                </span>
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="w-3 h-3" />
                    {invalidCount} erreur(s)
                  </span>
                )}
              </div>

              <div className="max-h-40 overflow-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/50 sticky top-0">
                    <tr>
                      <th className="p-1.5 text-left text-muted-foreground">S.</th>
                      <th className="p-1.5 text-left text-muted-foreground">Jour</th>
                      <th className="p-1.5 text-left text-muted-foreground">Sport</th>
                      <th className="p-1.5 text-left text-muted-foreground">Titre</th>
                      <th className="p-1.5 text-left text-muted-foreground">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.map((row, idx) => (
                      <tr key={idx} className={row.valid ? "" : "bg-destructive/10"}>
                        <td className="p-1.5 text-foreground">{row.week}</td>
                        <td className="p-1.5 text-foreground">{row.day}</td>
                        <td className="p-1.5 text-foreground">{row.sport}</td>
                        <td className="p-1.5 text-foreground truncate max-w-[150px]">{row.title}</td>
                        <td className="p-1.5">
                          {row.valid ? (
                            <CheckCircle className="w-3 h-3 text-green-600" />
                          ) : (
                            <span className="text-destructive">{row.error}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
          <Button
            variant="glow"
            onClick={handleImport}
            disabled={validCount === 0 || !templateName.trim() || importing}
          >
            <Upload className="w-4 h-4 mr-2" />
            {importing ? "Import..." : `Importer (${weekCount} sem.)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
