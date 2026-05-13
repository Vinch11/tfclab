// =============================================
// Lab Import Dialog - Import PDF Lab Reports
// =============================================

import { useState, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { FileUp, AlertTriangle, CheckCircle, XCircle, Loader2, FlaskConical, Eye, EyeOff, ChevronLeft, ChevronRight, ZoomIn, X } from "lucide-react";
import { toast } from "sonner";

import { extractTextFromPdf, getAllPagesAsImages } from "@/lib/labImport/pdfExtractor";
import { performOcr } from "@/lib/labImport/ocrProcessor";
import { parseLabReport, ReportType } from "@/lib/labImport/parsers";
import { LabExtract, ExtractedField } from "@/lib/labImport/types";
import { extractToValidationFields, applyFieldEdits, mapExtractToSnapshot, compareWithPrevious } from "@/lib/labImport/snapshotMapper";
import { DbSnapshot, useCloudData } from "@/contexts/CloudDataContext";
import { usePersistedDialogState } from "@/hooks/usePersistedFormState";

interface LabImportDialogProps {
  athleteId: string;
  athleteName: string;
  athleteGoal: string;
  previousSnapshot: DbSnapshot | null;
  onImportComplete?: (snapshot: DbSnapshot) => void;
}

type ImportStep = "upload" | "analyzing" | "validation" | "complete";

export function LabImportDialog({ 
  athleteId, 
  athleteName, 
  athleteGoal,
  previousSnapshot,
  onImportComplete 
}: LabImportDialogProps) {
  const { addSnapshot, addTest } = useCloudDataContext();
  
  // Use persisted dialog state to survive page minimize/restore
  const [isOpen, setIsOpen] = usePersistedDialogState(`lab-import-${athleteId}`, false);
  const [step, setStep] = useState<ImportStep>("upload");
  const [reportType, setReportType] = useState<ReportType>("auto");
  const [createLinkedTest, setCreateLinkedTest] = useState(true);
  
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState("");
  
  const [extract, setExtract] = useState<LabExtract | null>(null);
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [parserUsed, setParserUsed] = useState<string | null>(null);
  const [usedOcr, setUsedOcr] = useState(false);
  
  const [createdSnapshot, setCreatedSnapshot] = useState<DbSnapshot | null>(null);
  
  // PDF preview images
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [selectedPage, setSelectedPage] = useState<number>(0);
  const [showPreview, setShowPreview] = useState(true);

  // Persist validation fields in sessionStorage to survive page minimize
  const STORAGE_KEY = `lab-import-fields-${athleteId}`;
  const PDF_PAGES_KEY = `lab-import-pdf-${athleteId}`;
  
  // Save fields, edited values, and FULL extract to sessionStorage when they change
  useEffect(() => {
    if (step === "validation" && fields.length > 0) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          fields,
          editedValues,
          parserUsed,
          usedOcr,
          extract, // Save FULL extract object for snapshot creation
        }));
      } catch (e) {
        console.warn("Failed to persist lab import state:", e);
      }
    }
  }, [fields, editedValues, step, parserUsed, usedOcr, extract, STORAGE_KEY]);

  // Persist PDF pages separately (can be large)
  useEffect(() => {
    if (step === "validation" && pdfPages.length > 0) {
      try {
        sessionStorage.setItem(PDF_PAGES_KEY, JSON.stringify({ pdfPages, selectedPage }));
      } catch (e) {
        // PDF pages might be too large for sessionStorage, that's OK
        console.warn("Failed to persist PDF pages (may be too large):", e);
      }
    }
  }, [pdfPages, selectedPage, step, PDF_PAGES_KEY]);

  // Restore state when dialog opens and we were in validation step
  useEffect(() => {
    if (isOpen && step === "upload") {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          if (data.fields && data.fields.length > 0) {
            setFields(data.fields);
            setEditedValues(data.editedValues || {});
            setParserUsed(data.parserUsed || null);
            setUsedOcr(data.usedOcr || false);
            // Restore FULL extract object
            if (data.extract) {
              setExtract(data.extract);
            }
            setStep("validation");
          }
        }
        
        // Also try to restore PDF pages
        const pdfStored = sessionStorage.getItem(PDF_PAGES_KEY);
        if (pdfStored) {
          const pdfData = JSON.parse(pdfStored);
          if (pdfData.pdfPages) {
            setPdfPages(pdfData.pdfPages);
            setSelectedPage(pdfData.selectedPage || 0);
          }
        }
      } catch (e) {
        console.warn("Failed to restore lab import state:", e);
      }
    }
  }, [isOpen, STORAGE_KEY, PDF_PAGES_KEY]);

  const resetState = () => {
    setStep("upload");
    setProgress(0);
    setProgressText("");
    setExtract(null);
    setFields([]);
    setEditedValues({});
    setParserUsed(null);
    setUsedOcr(false);
    setCreatedSnapshot(null);
    setPdfPages([]);
    setSelectedPage(0);
    setShowPreview(true);
    // Clear persisted state
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(PDF_PAGES_KEY);
    } catch (e) {
      console.warn("Failed to clear lab import state:", e);
    }
  };

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Veuillez sélectionner un fichier PDF");
      return;
    }

    setStep("analyzing");
    setProgress(10);
    setProgressText("Extraction du texte...");

    try {
      // Step 1: Extract text
      const pdfResult = await extractTextFromPdf(file);
      setProgress(20);

      // Step 1.5: Generate PDF page previews in parallel
      setProgressText("Génération des aperçus...");
      const pageImages = await getAllPagesAsImages(file);
      setPdfPages(pageImages);
      setProgress(30);

      let textByPage = pdfResult.textByPage;
      let ocrUsed = false;

      // Step 2: Check if OCR is needed
      if (pdfResult.isScanned) {
        setProgressText("PDF scanné détecté - OCR en cours...");
        setProgress(40);
        
        const ocrResult = await performOcr(pageImages, (prog, status) => {
          setProgress(40 + prog * 0.4);
          setProgressText(status);
        });
        
        textByPage = ocrResult.textByPage;
        ocrUsed = true;
        setUsedOcr(true);
      }

      setProgress(85);
      setProgressText("Analyse des données...");

      // Step 3: Parse
      const result = parseLabReport(textByPage, reportType, ocrUsed);
      
      if (!result.success || !result.extract) {
        toast.error(result.error || "Erreur d'analyse");
        setStep("upload");
        return;
      }

      setExtract(result.extract);
      setParserUsed(result.parserUsed);
      
      // Step 4: Prepare validation fields
      const validationFields = extractToValidationFields(result.extract);
      setFields(validationFields);
      
      // Initialize edited values
      const initialEdits: Record<string, string> = {};
      validationFields.forEach(f => {
        initialEdits[f.key] = f.value?.toString() || "";
      });
      setEditedValues(initialEdits);

      setProgress(100);
      setStep("validation");
      
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Erreur lors de l'import du PDF");
      setStep("upload");
    }
  }, [reportType]);

  const handleFieldEdit = (key: string, value: string) => {
    setEditedValues(prev => ({ ...prev, [key]: value }));
  };

  const handleCreateSnapshot = async () => {
    if (!extract) return;

    try {
      // Apply edits
      const editedExtract = applyFieldEdits(extract, 
        Object.fromEntries(
          Object.entries(editedValues).map(([k, v]) => [
            k, 
            v === "" ? null : (isNaN(Number(v)) ? v : Number(v))
          ])
        )
      );

      // Map to snapshot
      const snapshotData = mapExtractToSnapshot(editedExtract, athleteGoal);

      // Create snapshot
      const newSnapshot = await addSnapshot({
        athlete_id: athleteId,
        coach_id: "",
        ...snapshotData,
      } as any);

      if (!newSnapshot) {
        // addSnapshot affiche déjà une erreur plus précise (validation/DB/auth)
        return;
      }

      // Optionally create linked test
      if (createLinkedTest) {
        await addTest(
          athleteId,
          "LAB",
          `Test labo importé (${editedExtract.meta.reportType})`,
          editedExtract.performance.sport,
          editedExtract.meta.sourceConfidence,
          editedExtract.vlamax.value,
          JSON.parse(JSON.stringify({ labExtract: editedExtract })),
          `Import PDF - ${editedExtract.meta.reportDate || "Date inconnue"}`
        );
      }

      setCreatedSnapshot(newSnapshot);
      setStep("complete");
      toast.success("Snapshot créé avec succès !");
      onImportComplete?.(newSnapshot);
      
    } catch (error) {
      console.error("Create snapshot error:", error);
      toast.error("Erreur lors de la création");
    }
  };

  const getStatusIcon = (status: ExtractedField["status"]) => {
    switch (status) {
      case "ok": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "verify": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "not_found": return <XCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const deltas = createdSnapshot && previousSnapshot 
    ? compareWithPrevious(createdSnapshot, previousSnapshot) 
    : [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FlaskConical className="h-4 w-4 mr-2" />
          Importer Test Labo (PDF)
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Importer un rapport de test labo
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <FileUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <Label htmlFor="pdf-upload" className="cursor-pointer">
                <span className="text-lg font-medium">Sélectionner un PDF</span>
                <p className="text-sm text-muted-foreground mt-1">
                  Rapports Quentin/SOC ou Mika/Cosmed supportés
                </p>
              </Label>
              <Input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button variant="secondary" className="mt-4" onClick={() => document.getElementById("pdf-upload")?.click()}>
                Choisir un fichier
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type de rapport</Label>
                <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-détection</SelectItem>
                    <SelectItem value="quentin">Quentin / SOC Brussels</SelectItem>
                    <SelectItem value="mika">Mika / Cosmed Quark</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2 pt-6">
                <Switch checked={createLinkedTest} onCheckedChange={setCreateLinkedTest} />
                <Label>Créer un Test Labo lié (traçabilité)</Label>
              </div>
            </div>
          </div>
        )}

        {step === "analyzing" && (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary" />
            <p className="font-medium">{progressText}</p>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {step === "validation" && extract && (
          <div className="space-y-4">
            {/* Header with badges and preview toggle */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={parserUsed === "generic" || parserUsed === "ocr" ? "secondary" : "default"}>
                  Parser: {parserUsed}
                </Badge>
                {usedOcr && <Badge variant="outline">🔍 OCR utilisé</Badge>}
                <Badge variant="outline">
                  Confiance: {Math.round((extract.meta.sourceConfidence || 0) * 100)}%
                </Badge>
              </div>
              
              {pdfPages.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowPreview(!showPreview)}
                  className="gap-1"
                >
                  {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showPreview ? "Masquer PDF" : "Voir PDF"}
                </Button>
              )}
            </div>

            {usedOcr && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
                <AlertTriangle className="h-4 w-4 inline mr-2 text-yellow-500" />
                Ce PDF est scanné. Les valeurs ont été extraites par OCR — vérifiez attentivement.
              </div>
            )}

            {/* PDF Preview Panel */}
            {showPreview && pdfPages.length > 0 && (
              <div className="border rounded-lg p-3 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">
                    Aperçu PDF — Page {selectedPage + 1} / {pdfPages.length}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      disabled={selectedPage === 0}
                      onClick={() => setSelectedPage(p => Math.max(0, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      disabled={selectedPage >= pdfPages.length - 1}
                      onClick={() => setSelectedPage(p => Math.min(pdfPages.length - 1, p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Thumbnails */}
                {pdfPages.length > 1 && (
                  <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                    {pdfPages.map((page, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedPage(idx)}
                        className={`flex-shrink-0 border-2 rounded transition-all ${
                          selectedPage === idx 
                            ? "border-primary ring-2 ring-primary/30" 
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <img 
                          src={page} 
                          alt={`Page ${idx + 1}`} 
                          className="h-16 w-auto object-contain bg-white"
                        />
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Main preview */}
                <div className="flex justify-center bg-white rounded border max-h-[30vh] overflow-auto">
                  <img 
                    src={pdfPages[selectedPage]} 
                    alt={`Page ${selectedPage + 1}`}
                    className="max-w-full h-auto object-contain"
                  />
                </div>
              </div>
            )}

            {/* Validation table */}
            <div className="max-h-[35vh] overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="text-left p-2">Champ</th>
                    <th className="text-left p-2">Valeur</th>
                    <th className="text-center p-2 w-16">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {fields.map(field => (
                    <tr key={field.key} className="border-t">
                      <td className="p-2 font-medium">{field.label}</td>
                      <td className="p-2">
                        <Input
                          value={editedValues[field.key] || ""}
                          onChange={(e) => handleFieldEdit(field.key, e.target.value)}
                          placeholder="Non trouvé"
                          className="h-8"
                        />
                      </td>
                      <td className="p-2 text-center">{getStatusIcon(field.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setStep("upload"); resetState(); }}>
                Annuler
              </Button>
              <Button onClick={handleCreateSnapshot}>
                Créer Profil PRO
              </Button>
            </div>
          </div>
        )}

        {step === "complete" && createdSnapshot && (
          <div className="space-y-4 py-4">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-semibold">Snapshot créé !</h3>
              <p className="text-muted-foreground">Date: {createdSnapshot.date}</p>
            </div>

            {deltas.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-2">Comparaison avec le snapshot précédent</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {deltas.map(d => (
                      <div key={d.field} className="flex justify-between">
                        <span className="text-muted-foreground">{d.label}</span>
                        <span className={d.delta.startsWith("+") ? "text-green-600" : d.delta.startsWith("-") ? "text-red-600" : ""}>
                          {d.delta}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button className="w-full" onClick={() => setIsOpen(false)}>
              Fermer
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
