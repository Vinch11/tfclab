import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Upload, FileText, CheckCircle, AlertCircle, Download } from "lucide-react";
import { SnapshotNolio, creerSnapshotVide } from "@/types/snapshotNolio";
import { toast } from "sonner";

interface CSVImporterProps {
  onImport: (snapshots: SnapshotNolio[]) => void;
}

interface ParsedRow {
  date: string;
  ftp: number;
  pmax_5s: number;
  poids: number;
  vo2max: number;
  tss_7j: number;
  hrv: number;
  valid: boolean;
  error?: string;
}

export function CSVImporter({ onImport }: CSVImporterProps) {
  const [open, setOpen] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (content: string): ParsedRow[] => {
    const lines = content.trim().split("\n");
    const results: ParsedRow[] = [];

    // Skip header if present
    const startIndex = lines[0]?.toLowerCase().includes("date") ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const fields = line.split(/[,;]/);
      
      try {
        const row: ParsedRow = {
          date: fields[0]?.trim() || new Date().toISOString().slice(0, 10),
          ftp: parseFloat(fields[1]) || 0,
          pmax_5s: parseFloat(fields[2]) || 0,
          poids: parseFloat(fields[3]) || 0,
          vo2max: parseFloat(fields[4]) || 0,
          tss_7j: parseFloat(fields[5]) || 0,
          hrv: parseFloat(fields[6]) || 0,
          valid: true
        };

        // Validate required fields
        if (!row.ftp || !row.poids) {
          row.valid = false;
          row.error = "FTP et Poids requis";
        }

        results.push(row);
      } catch {
        results.push({
          date: "",
          ftp: 0,
          pmax_5s: 0,
          poids: 0,
          vo2max: 0,
          tss_7j: 0,
          hrv: 0,
          valid: false,
          error: "Erreur de parsing"
        });
      }
    }

    return results;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseCSV(content);
      setParsedData(parsed);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    const validRows = parsedData.filter(row => row.valid);
    
    if (validRows.length === 0) {
      toast.error("Aucune ligne valide à importer");
      return;
    }

    const snapshots: SnapshotNolio[] = validRows.map(row => ({
      ...creerSnapshotVide(),
      id: crypto.randomUUID(),
      date: row.date,
      ftp: row.ftp,
      pmax_5s: row.pmax_5s,
      poids: row.poids,
      vo2max: row.vo2max,
      tss_7j: row.tss_7j,
      hrv: row.hrv
    }));

    onImport(snapshots);
    toast.success(`${snapshots.length} profil(s) importé(s)`);
    setOpen(false);
    setParsedData([]);
    setFileName("");
  };

  const downloadTemplate = () => {
    const template = "date,ftp,pmax_5s,poids,vo2max,tss_7j,hrv\n2024-01-15,280,1200,70,55,450,52\n2024-02-01,285,1220,69,56,480,54";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_import.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedData.filter(r => r.valid).length;
  const invalidCount = parsedData.filter(r => !r.valid).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="w-4 h-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Importer CSV
          </DialogTitle>
          <DialogDescription>
            Importez vos données depuis un fichier CSV. Format attendu : date, FTP, Pmax5s, Poids, VO2max, TSS7j, HRV
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

          {/* File input */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Fichier CSV</Label>
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="bg-secondary/50 border-border"
              />
            </div>
          </div>

          {/* Preview */}
          {parsedData.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-foreground">{fileName}</span>
                <span className="flex items-center gap-1 text-sm text-success">
                  <CheckCircle className="w-4 h-4" />
                  {validCount} valide(s)
                </span>
                {invalidCount > 0 && (
                  <span className="flex items-center gap-1 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4" />
                    {invalidCount} erreur(s)
                  </span>
                )}
              </div>

              <div className="max-h-48 overflow-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 sticky top-0">
                    <tr>
                      <th className="p-2 text-left text-muted-foreground">Date</th>
                      <th className="p-2 text-left text-muted-foreground">FTP</th>
                      <th className="p-2 text-left text-muted-foreground">Pmax</th>
                      <th className="p-2 text-left text-muted-foreground">Poids</th>
                      <th className="p-2 text-left text-muted-foreground">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.map((row, idx) => (
                      <tr key={idx} className={row.valid ? "" : "bg-destructive/10"}>
                        <td className="p-2 text-foreground">{row.date}</td>
                        <td className="p-2 text-foreground">{row.ftp}</td>
                        <td className="p-2 text-foreground">{row.pmax_5s}</td>
                        <td className="p-2 text-foreground">{row.poids}</td>
                        <td className="p-2">
                          {row.valid ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : (
                            <span className="text-xs text-destructive">{row.error}</span>
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
          <Button variant="outline" onClick={() => setOpen(false)}>
            Annuler
          </Button>
          <Button 
            variant="glow" 
            onClick={handleImport}
            disabled={validCount === 0}
          >
            <Upload className="w-4 h-4 mr-2" />
            Importer {validCount > 0 && `(${validCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
