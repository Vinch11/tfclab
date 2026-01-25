// =============================================
// EXCEL PLAN IMPORTER
// Import training plans from Excel/CSV files
// =============================================

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, 
  ChevronDown, Info, FileText, Trash2, Download
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { parseCSV, rowsToTemplateWeeks, type ParsedExcelTemplate } from "@/lib/templates/excelTemplateParser";
import type { TemplateWeek } from "@/lib/templates/docxTemplateLoader";

interface ImportedPlan {
  id: string;
  name: string;
  type: "running" | "triathlon";
  goal: string;
  weeks: TemplateWeek[];
  importedAt: string;
}

interface ExcelPlanImporterProps {
  onImport?: (plan: ImportedPlan) => void;
}

const STORAGE_KEY = "tfcl-imported-plans";

function loadImportedPlans(): ImportedPlan[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveImportedPlans(plans: ImportedPlan[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  } catch {
    console.warn("Failed to save imported plans to localStorage");
  }
}

export function ExcelPlanImporter({ onImport }: ExcelPlanImporterProps) {
  const [importedPlans, setImportedPlans] = useState<ImportedPlan[]>(loadImportedPlans);
  const [parseResult, setParseResult] = useState<ParsedExcelTemplate | null>(null);
  const [planName, setPlanName] = useState("");
  const [planGoal, setPlanGoal] = useState<string>("marathon");
  const [isOpen, setIsOpen] = useState(false);
  const [showFormat, setShowFormat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Accept CSV and Excel files
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    
    // Also check extension for flexibility
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!validTypes.includes(file.type) && !["csv", "xlsx", "xls"].includes(ext || "")) {
      toast.error("Format non supporté. Utilisez un fichier CSV ou Excel.");
      return;
    }

    try {
      const text = await file.text();
      const rows = parseCSV(text);
      
      if (rows.length === 0) {
        toast.error("Fichier vide ou format invalide");
        return;
      }

      const result = rowsToTemplateWeeks(rows);
      setParseResult(result);
      
      // Auto-detect name from file
      const baseName = file.name.replace(/\.(csv|xlsx|xls)$/i, "");
      setPlanName(baseName);
      
      // Auto-detect goal
      if (result.metadata.isTriathlon) {
        setPlanGoal("ironman");
      } else {
        const lower = baseName.toLowerCase();
        if (lower.includes("marathon") && !lower.includes("semi")) {
          setPlanGoal("marathon");
        } else if (lower.includes("semi") || lower.includes("21")) {
          setPlanGoal("semi");
        } else if (lower.includes("703") || lower.includes("70.3")) {
          setPlanGoal("703");
        } else if (lower.includes("ironman") || lower.includes("im")) {
          setPlanGoal("ironman");
        }
      }
      
      toast.success(`Fichier analysé: ${result.metadata.weekCount} semaines, ${result.metadata.sessionCount} séances`);
    } catch (err) {
      console.error("Parse error:", err);
      toast.error("Erreur lors de l'analyse du fichier");
    }
  };

  const handleConfirmImport = () => {
    if (!parseResult || !planName.trim()) {
      toast.error("Veuillez donner un nom au plan");
      return;
    }

    const newPlan: ImportedPlan = {
      id: `imported-${Date.now()}`,
      name: planName.trim(),
      type: parseResult.metadata.isTriathlon ? "triathlon" : "running",
      goal: planGoal,
      weeks: parseResult.weeks,
      importedAt: new Date().toISOString(),
    };

    const updated = [...importedPlans, newPlan];
    setImportedPlans(updated);
    saveImportedPlans(updated);
    
    setParseResult(null);
    setPlanName("");
    
    onImport?.(newPlan);
    toast.success(`Plan "${newPlan.name}" importé avec succès!`);
  };

  const handleDeletePlan = (id: string) => {
    const updated = importedPlans.filter(p => p.id !== id);
    setImportedPlans(updated);
    saveImportedPlans(updated);
    toast.success("Plan supprimé");
  };

  const handleDownloadTemplate = () => {
    const csvContent = `Semaine;Jour;Discipline;Titre;Détails;Durée;Zone;Notes;Phase;Thème
1;Lundi;Natation;Technique;45' éduc + sprints;45;Z2;Focus technique;Phase 1;Semaine Test
1;Mardi;CAP;VMA Courte;20' WU + 10x30"/30" + 10' CD;60;Z5;Explosivité;Phase 1;Semaine Test
1;Mercredi;Vélo;Endurance;1h30 Z2 stable;90;Z2;;Phase 1;Semaine Test
1;Jeudi;Natation;CSS;15x100m CSS;60;Z4;;Phase 1;Semaine Test
1;Vendredi;Repos;OFF;Repos complet;0;;;Phase 1;Semaine Test
1;Samedi;Vélo;Force;2h avec côtes;120;Z3;Force en côte;Phase 1;Semaine Test
1;Dimanche;Vélo + CAP;Brique;2h vélo + 20' CAP;140;Z2-Z3;Transition;Phase 1;Semaine Test
2;Lundi;Natation;Récup;40' Z2;40;Z2;;Phase 1;Développement
2;Mardi;CAP;Tempo;1h dont 30' Z3;60;Z3;;Phase 1;Développement`;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "TEMPLATE_PLAN_ENTRAINEMENT.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Template CSV téléchargé");
  };

  return (
    <Card className="border-dashed border-2 border-muted-foreground/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-green-600" />
            <CardTitle className="text-sm">Importer un Plan Excel</CardTitle>
          </div>
          <Badge variant="outline" className="text-xs">
            {importedPlans.length} plan{importedPlans.length !== 1 ? "s" : ""} importé{importedPlans.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Importez vos propres plans d'entraînement au format CSV/Excel
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Format Info */}
        <Collapsible open={showFormat} onOpenChange={setShowFormat}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-xs h-8">
              <span className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                Format du fichier Excel requis
              </span>
              <ChevronDown className={cn("h-3 w-3 transition-transform", showFormat && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <Alert className="text-xs">
              <FileText className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p className="font-semibold">Colonnes attendues (séparées par ; ou ,) :</p>
                <div className="grid grid-cols-2 gap-1 text-[10px] bg-muted/50 p-2 rounded">
                  <span><strong>Semaine</strong> : Numéro (1, 2, 3...)</span>
                  <span><strong>Jour</strong> : Lundi, Mardi...</span>
                  <span><strong>Discipline</strong> : Natation, Vélo, CAP...</span>
                  <span><strong>Titre</strong> : Nom de la séance</span>
                  <span><strong>Détails</strong> : Description complète</span>
                  <span><strong>Durée</strong> : En minutes (60, 90...)</span>
                  <span><strong>Zone</strong> : Z1, Z2, Z3... (optionnel)</span>
                  <span><strong>Notes</strong> : Commentaires (optionnel)</span>
                  <span><strong>Phase</strong> : Phase 1, BUILD... (optionnel)</span>
                  <span><strong>Thème</strong> : Objectif semaine (optionnel)</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2 h-7 text-xs"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Télécharger un template CSV vide
                </Button>
              </AlertDescription>
            </Alert>
          </CollapsibleContent>
        </Collapsible>

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileSelect}
        />
        
        <Button
          variant="outline"
          className="w-full border-dashed h-12"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          Sélectionner un fichier CSV/Excel
        </Button>

        {/* Parse Result Preview */}
        {parseResult && (
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Fichier analysé</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-background rounded p-2 text-center">
                <div className="text-lg font-bold">{parseResult.metadata.weekCount}</div>
                <div className="text-muted-foreground">Semaines</div>
              </div>
              <div className="bg-background rounded p-2 text-center">
                <div className="text-lg font-bold">{parseResult.metadata.sessionCount}</div>
                <div className="text-muted-foreground">Séances</div>
              </div>
              <div className="bg-background rounded p-2 text-center">
                <Badge variant={parseResult.metadata.isTriathlon ? "default" : "secondary"} className="text-[10px]">
                  {parseResult.metadata.isTriathlon ? "Triathlon" : "Running"}
                </Badge>
              </div>
            </div>

            {parseResult.metadata.warnings.length > 0 && (
              <Alert variant="destructive" className="py-2">
                <AlertTriangle className="h-3 w-3" />
                <AlertDescription className="text-xs">
                  {parseResult.metadata.warnings.join(", ")}
                </AlertDescription>
              </Alert>
            )}

            {/* Name & Goal */}
            <div className="space-y-2">
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="Nom du plan..."
                className="w-full px-3 py-2 text-sm border rounded-md bg-background"
              />
              <select
                value={planGoal}
                onChange={(e) => setPlanGoal(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md bg-background"
              >
                <optgroup label="Running">
                  <option value="marathon">Marathon</option>
                  <option value="semi">Semi-Marathon</option>
                </optgroup>
                <optgroup label="Triathlon">
                  <option value="ironman">Ironman</option>
                  <option value="703">Ironman 70.3</option>
                </optgroup>
              </select>
            </div>

            <Button 
              className="w-full" 
              size="sm"
              onClick={handleConfirmImport}
              disabled={!planName.trim()}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Confirmer l'import
            </Button>
          </div>
        )}

        {/* Imported Plans List */}
        {importedPlans.length > 0 && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between text-xs h-8">
                <span>Plans importés ({importedPlans.length})</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 space-y-2">
              {importedPlans.map(plan => (
                <div 
                  key={plan.id}
                  className="flex items-center justify-between p-2 bg-muted/30 rounded text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-medium">{plan.name}</div>
                    <div className="text-muted-foreground flex items-center gap-2">
                      <Badge variant="outline" className="text-[9px] px-1">
                        {plan.type === "triathlon" ? "Tri" : "Run"}
                      </Badge>
                      <span>{plan.weeks.length} sem.</span>
                      <span>•</span>
                      <span>{plan.goal}</span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => handleDeletePlan(plan.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================
// HOOK TO ACCESS IMPORTED PLANS
// =============================================

export function useImportedPlans() {
  const [plans, setPlans] = useState<ImportedPlan[]>(loadImportedPlans);

  const refresh = () => {
    setPlans(loadImportedPlans());
  };

  return { plans, refresh };
}
