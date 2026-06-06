/**
 * AthleteImportExport
 * 
 * Composant pour exporter et importer des athlètes entre différentes
 * versions de l'application ou entre comptes.
 */

import { useState, useRef } from "react";
import { 
  Download, 
  Upload, 
  FileJson, 
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  FileUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { normalizeRaceTypeForDisplay } from "@/lib/raceTypeNormalization";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import type { DbAthlete, DbSnapshot, DbTest, DbCheckin } from "@/hooks/useCloudData";

// Type pour l'export complet
export interface AthleteExportData {
  version: string;
  exportedAt: string;
  exportedFrom: string;
  athletes: Array<{
    athlete: Omit<DbAthlete, "coach_id">;
    snapshots: Array<Omit<DbSnapshot, "coach_id">>;
    tests: Array<Omit<DbTest, "coach_id">>;
    checkins: Array<Omit<DbCheckin, "coach_id">>;
    planVersions?: Array<Record<string, any>>;
    coachOverrides?: Array<Record<string, any>>;
  }>;
}

interface AthleteImportExportProps {
  athletes: DbAthlete[];
  snapshots: DbSnapshot[];
  tests: DbTest[];
  checkins: DbCheckin[];
  onImport: (data: AthleteExportData) => Promise<{ imported: number; errors: string[] }>;
  /** Optional loader to attach plan_versions + coach_overrides to the export payload */
  fetchExtras?: (athleteIds: string[]) => Promise<Record<string, {
    planVersions: Array<Record<string, any>>;
    coachOverrides: Array<Record<string, any>>;
  }>>;
}

const EXPORT_VERSION = "2.1.0";


export function AthleteImportExport({
  athletes,
  snapshots,
  tests,
  checkins,
  onImport,
  fetchExtras,
}: AthleteImportExportProps) {

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set());
  const [importData, setImportData] = useState<AthleteExportData | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Toggle sélection athlète
  const toggleAthlete = (athleteId: string) => {
    setSelectedAthletes(prev => {
      const next = new Set(prev);
      if (next.has(athleteId)) {
        next.delete(athleteId);
      } else {
        next.add(athleteId);
      }
      return next;
    });
  };
  
  // Sélectionner tous
  const selectAll = () => {
    setSelectedAthletes(new Set(athletes.map(a => a.id)));
  };
  
  // Désélectionner tous
  const deselectAll = () => {
    setSelectedAthletes(new Set());
  };
  
  // Exporter les athlètes sélectionnés
  const handleExport = async () => {
    if (selectedAthletes.size === 0) {
      toast.error("Sélectionnez au moins un athlète");
      return;
    }

    const ids = Array.from(selectedAthletes);
    let extras: Record<string, { planVersions: any[]; coachOverrides: any[] }> = {};
    if (fetchExtras) {
      try {
        extras = await fetchExtras(ids);
      } catch (err) {
        toast.warning("Plans IA / overrides non inclus: " + (err instanceof Error ? err.message : "erreur"));
      }
    }

    const exportData: AthleteExportData = {
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      exportedFrom: window.location.origin,
      athletes: ids.map(athleteId => {
        const athlete = athletes.find(a => a.id === athleteId);
        if (!athlete) return null;
        
        // Récupérer les données associées
        const athleteSnapshots = snapshots.filter(s => s.athlete_id === athleteId);
        const athleteTests = tests.filter(t => t.athlete_id === athleteId);
        const athleteCheckins = checkins.filter(c => c.athlete_id === athleteId);
        
        // Retirer coach_id pour l'export (sera re-assigné à l'import)
        const { coach_id: _c1, ...athleteWithoutCoach } = athlete;
        const snapshotsWithoutCoach = athleteSnapshots.map(({ coach_id: _c, ...s }) => s);
        const testsWithoutCoach = athleteTests.map(({ coach_id: _c, ...t }) => t);
        const checkinsWithoutCoach = athleteCheckins.map(({ coach_id: _c, ...ch }) => ch);
        const extra = extras[athleteId];
        
        return {
          athlete: athleteWithoutCoach,
          snapshots: snapshotsWithoutCoach,
          tests: testsWithoutCoach,
          checkins: checkinsWithoutCoach,
          planVersions: extra?.planVersions ?? [],
          coachOverrides: extra?.coachOverrides ?? [],
        };
      }).filter(Boolean) as AthleteExportData["athletes"]
    };
    
    // Créer et télécharger le fichier
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `athletes-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    const totalPlans = Object.values(extras).reduce((s, e) => s + (e.planVersions?.length ?? 0), 0);
    const totalOverrides = Object.values(extras).reduce((s, e) => s + (e.coachOverrides?.length ?? 0), 0);
    toast.success(
      `${ids.length} athlète(s) exporté(s)` +
      (totalPlans || totalOverrides ? ` · ${totalPlans} plan(s) IA, ${totalOverrides} override(s)` : "")
    );
    setExportDialogOpen(false);
    setSelectedAthletes(new Set());
  };

  
  // Gérer le fichier importé
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content) as AthleteExportData;
        
        // Validation basique
        if (!data.version || !data.athletes || !Array.isArray(data.athletes)) {
          throw new Error("Format de fichier invalide");
        }
        
        setImportData(data);
        setImportResult(null);
      } catch (err) {
        toast.error("Fichier invalide: " + (err instanceof Error ? err.message : "format incorrect"));
        setImportData(null);
      }
    };
    reader.readAsText(file);
  };
  
  // Importer les données
  const handleImport = async () => {
    if (!importData) return;
    
    setImporting(true);
    try {
      const result = await onImport(importData);
      setImportResult(result);
      
      if (result.imported > 0) {
        toast.success(`${result.imported} athlète(s) importé(s)`);
      }
      
      if (result.errors.length > 0) {
        toast.warning(`${result.errors.length} erreur(s) lors de l'import`);
      }
    } catch (err) {
      toast.error("Erreur lors de l'import: " + (err instanceof Error ? err.message : "erreur inconnue"));
    } finally {
      setImporting(false);
    }
  };
  
  // Réinitialiser l'import
  const resetImport = () => {
    setImportData(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  
  // Compter les données pour un athlète
  const getAthleteDataCount = (athleteId: string) => {
    return {
      snapshots: snapshots.filter(s => s.athlete_id === athleteId).length,
      tests: tests.filter(t => t.athlete_id === athleteId).length,
      checkins: checkins.filter(c => c.athlete_id === athleteId).length
    };
  };
  
  return (
    <div className="flex gap-2">
      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Exporter
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileJson className="w-5 h-5 text-primary" />
              Exporter des athlètes
            </DialogTitle>
            <DialogDescription>
              Sélectionnez les athlètes à exporter avec leurs snapshots, tests et check-ins.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              {selectedAthletes.size} sur {athletes.length} sélectionné(s)
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Tout
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                Aucun
              </Button>
            </div>
          </div>
          
          <ScrollArea className="h-[300px] border rounded-md p-2">
            <div className="space-y-2">
              {athletes.map(athlete => {
                const counts = getAthleteDataCount(athlete.id);
                return (
                  <div 
                    key={athlete.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedAthletes.has(athlete.id) ? "bg-primary/10" : "hover:bg-muted/50"
                    }`}
                    onClick={() => toggleAthlete(athlete.id)}
                  >
                    <Checkbox 
                      checked={selectedAthletes.has(athlete.id)} 
                      onCheckedChange={() => toggleAthlete(athlete.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{athlete.name}</div>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {counts.snapshots > 0 && (
                          <span>{counts.snapshots} profil(s)</span>
                        )}
                        {counts.tests > 0 && (
                          <span>{counts.tests} test(s)</span>
                        )}
                        {counts.checkins > 0 && (
                          <span>{counts.checkins} check-in(s)</span>
                        )}
                      </div>
                    </div>
                    {athlete.goal && (
                      <Badge variant="outline" className="shrink-0">{normalizeRaceTypeForDisplay(athlete.goal)}</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleExport} disabled={selectedAthletes.size === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exporter {selectedAthletes.size} athlète(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="w-4 h-4" />
            Importer
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5 text-primary" />
              Importer des athlètes
            </DialogTitle>
            <DialogDescription>
              Importez des athlètes depuis un fichier JSON exporté précédemment.
            </DialogDescription>
          </DialogHeader>
          
          {!importData && !importResult && (
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <FileJson className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <Label htmlFor="import-file" className="cursor-pointer">
                <span className="text-primary hover:underline">Sélectionnez un fichier</span>
                <span className="text-muted-foreground"> ou glissez-déposez</span>
              </Label>
              <input
                ref={fileInputRef}
                id="import-file"
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Format: JSON exporté depuis TFCL
              </p>
            </div>
          )}
          
          {importData && !importResult && (
            <div className="space-y-4">
              <Alert>
                <FileJson className="h-4 w-4" />
                <AlertDescription>
                  <strong>{importData.athletes.length} athlète(s)</strong> trouvé(s) dans le fichier
                  <br />
                  <span className="text-xs text-muted-foreground">
                    Exporté le {new Date(importData.exportedAt).toLocaleDateString("fr-FR")}
                    {importData.exportedFrom && ` depuis ${importData.exportedFrom}`}
                  </span>
                </AlertDescription>
              </Alert>
              
              <ScrollArea className="h-[200px] border rounded-md p-2">
                <div className="space-y-2">
                  {importData.athletes.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                      <Users className="w-4 h-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.athlete.name}</div>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                          <span>{item.snapshots.length} profil(s)</span>
                          <span>{item.tests.length} test(s)</span>
                          <span>{item.checkins.length} check-in(s)</span>
                          {(item.planVersions?.length ?? 0) > 0 && (
                            <span>{item.planVersions!.length} plan(s) IA</span>
                          )}
                          {(item.coachOverrides?.length ?? 0) > 0 && (
                            <span>{item.coachOverrides!.length} override(s)</span>
                          )}

                        </div>
                      </div>
                      {item.athlete.goal && (
                        <Badge variant="outline">{normalizeRaceTypeForDisplay(item.athlete.goal)}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
              
              <Alert className="bg-orange-500/10 border-orange-500/30">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <AlertDescription className="text-sm">
                  Les athlètes seront ajoutés à votre compte. Les doublons ne seront pas détectés.
                </AlertDescription>
              </Alert>
            </div>
          )}
          
          {importResult && (
            <div className="space-y-4">
              {importResult.imported > 0 && (
                <Alert className="bg-green-500/10 border-green-500/30">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription>
                    <strong>{importResult.imported} athlète(s)</strong> importé(s) avec succès
                  </AlertDescription>
                </Alert>
              )}
              
              {importResult.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{importResult.errors.length} erreur(s)</strong>
                    <ul className="list-disc list-inside mt-1 text-xs">
                      {importResult.errors.slice(0, 5).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                      {importResult.errors.length > 5 && (
                        <li>... et {importResult.errors.length - 5} autres</li>
                      )}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
          
          <DialogFooter>
            {importData && !importResult ? (
              <>
                <Button variant="outline" onClick={resetImport}>
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
                <Button onClick={handleImport} disabled={importing}>
                  {importing ? "Import en cours..." : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Importer
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={() => { setImportDialogOpen(false); resetImport(); }}>
                Fermer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
