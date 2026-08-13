/**
 * Tests Page - Module Protocoles de Tests Intégrés TFCL
 * Page principale avec 3 onglets : Bibliothèque, Tests Réalisés, Historique
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { 
  ChevronLeft,
  FlaskConical,
  BookOpen,
  ClipboardList,
  TrendingUp,
  Bike,
  PersonStanding,
  Target,
  Filter,
  Info,
  Users,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";

// Components
import { TestLibraryView } from "@/components/tests/TestLibraryView";
import { CompletedTestsView } from "@/components/tests/CompletedTestsView";
import { TestHistoryView } from "@/components/tests/TestHistoryView";
import { TestExecutionSheet } from "@/components/tests/TestExecutionSheet";
import { FitImportDialog, type FitTestSaveData, type ProfileUpdates } from "@/components/FitImportDialog";

import { IntegratedTestProtocol, INTEGRATED_TESTS_LIBRARY } from "@/data/testProtocolsLibrary";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";

export default function TestsPage() {
  const navigate = useNavigate();
  const { athletes, selectedAthleteId, setSelectedAthleteId } = useAthletes();
  const { tests, addTest, snapshots, updateSnapshot } = useCloudDataContext();
  
  const [activeTab, setActiveTab] = useState("library");
  const [activeTest, setActiveTest] = useState<IntegratedTestProtocol | null>(null);
  const [sportFilter, setSportFilter] = useState<"all" | "bike" | "run">("all");
  const [fitImportOpen, setFitImportOpen] = useState(false);
  
  const selectedAthlete = useMemo(
    () => athletes.find(a => a.id === selectedAthleteId) || null,
    [athletes, selectedAthleteId]
  );
  
  const athleteTests = useMemo(() => {
    if (!selectedAthlete) return [];
    return tests.filter(t => t.athlete_id === selectedAthlete.id);
  }, [tests, selectedAthlete]);

  const currentSnapshot = useMemo(() => {
    if (!selectedAthlete) return null;
    const athleteSnapshots = snapshots.filter(s => s.athlete_id === selectedAthlete.id);
    // Get active snapshot or most recent
    if (selectedAthlete.active_snapshot_id) {
      return athleteSnapshots.find(s => s.id === selectedAthlete.active_snapshot_id) ?? athleteSnapshots[0] ?? null;
    }
    return athleteSnapshots[0] ?? null;
  }, [snapshots, selectedAthlete]);
  
  const completedTestsCount = athleteTests.length;
  
  const handleStartTest = (test: IntegratedTestProtocol) => {
    setActiveTest(test);
  };
  
  const handleCloseTest = () => {
    setActiveTest(null);
  };
  
  const handleSaveTest = async (testData: Record<string, unknown>) => {
    if (!selectedAthlete || !activeTest) return;
    
    // Extraire les valeurs clés du résultat pour alimenter les calculs
    const confidence = (testData.confidence as number) || activeTest.reliabilityScore;
    const estimatedVlamax = testData.estimatedVlamax as number | null;
    const tteMinutes = testData.tte_minutes as number | null;
    const fatmaxW = testData.fatmaxW as number | null;
    const economyScore = testData.economyScore as number | null;
    
    // Déterminer la valeur VLamax à stocker selon le type de test
    let vlamaxValue: number | null = null;
    if (activeTest.category === "VLAMAX" && estimatedVlamax !== null && estimatedVlamax !== undefined) {
      vlamaxValue = estimatedVlamax;
    }
    
    // Enrichir les raw data avec les métadonnées du protocole
    // IMPORTANT: category est la clé pour le mapping dans useCalibration
    const enrichedRawData = {
      ...testData,
      protocolId: activeTest.id,
      category: activeTest.category, // VLAMAX, TTE, FATMAX, ECONOMY
      sport: activeTest.sport,
      targetParameters: activeTest.targetParameters,
      reliabilityScore: activeTest.reliabilityScore,
      // Stocker TTE explicitement si c'est un test TTE
      ...(activeTest.category === "TTE" && tteMinutes ? { tte_minutes: tteMinutes } : {}),
      // Stocker FatMax si c'est un test FatMax
      ...(activeTest.category === "FATMAX" && fatmaxW ? { fatmaxW } : {}),
      // Stocker Economy si c'est un test Economy
      ...(activeTest.category === "ECONOMY" && economyScore ? { economyScore } : {}),
      // Stocker VLamax estimée pour le mapping
      ...(activeTest.category === "VLAMAX" && estimatedVlamax ? { estimatedVlamax } : {}),
      // Stocker les impacts TFCL
      tfclImpact: activeTest.tfclImpact.map(i => ({
        parameter: i.parameter,
        confidenceBoost: i.confidenceBoost
      }))
    };
    
    // Utiliser la catégorie comme type pour faciliter le mapping
    await addTest(
      selectedAthlete.id,
      activeTest.category, // Utiliser la catégorie (VLAMAX, TTE, etc.) pour le mapping
      activeTest.name,
      activeTest.sport,
      confidence,
      vlamaxValue,
      enrichedRawData as Json,
      null
    );

    // === Écriture directe au snapshot (parité avec FIT / CAPTestSheet / labo) ===
    // TTE / FatMax / Économie / VLamax haute confiance -> propager au snapshot actif
    if (currentSnapshot) {
      const snapshotUpdates: Record<string, unknown> = {};
      const isRun = activeTest.sport === "run";

      if (activeTest.category === "TTE" && tteMinutes && tteMinutes > 0) {
        if (isRun) {
          snapshotUpdates.tte_observed_min_run = tteMinutes;
        } else {
          snapshotUpdates.tte_observed_min = tteMinutes;
          // `tte_mode` est le drapeau VÉLO : un test course ne doit pas le passer
          // à OBSERVED (sinon la durabilité vélo s'affiche "mesurée" sans valeur).
          snapshotUpdates.tte_mode = "OBSERVED";
        }
      }

      if (activeTest.category === "ECONOMY" && economyScore && economyScore > 0 && isRun) {
        snapshotUpdates.run_economy_score = economyScore;
      }

      // VLamax haute confiance (labo/protocole propre) écrase la valeur snapshot
      if (activeTest.category === "VLAMAX" && estimatedVlamax && confidence >= 0.75) {
        if (isRun) {
          snapshotUpdates.vlamax_run = estimatedVlamax;
        } else {
          snapshotUpdates.vlamax = estimatedVlamax;
        }
      }

      if (Object.keys(snapshotUpdates).length > 0) {
        try {
          await updateSnapshot(currentSnapshot.id, snapshotUpdates);
        } catch (e) {
          if (import.meta.env.DEV) console.error("snapshot update from test failed", e);
        }
      }
    }

    // === Persistance dans calibration_evidence (fenêtre glissante 42j) ===
    try {
      const evidenceType =
        activeTest.category === "VLAMAX" ? "SPRINT_15S" :
        activeTest.category === "TTE" ? "TTE_OBS" :
        activeTest.category === "FATMAX" ? "FATMAX" :
        activeTest.category === "ECONOMY" ? "ECONOMY" :
        "P30";

      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId) {
        await supabase.from("calibration_evidence").insert({
          athlete_id: selectedAthlete.id,
          coach_id: userId,
          date: new Date().toISOString().slice(0, 10),
          source_type: "MANUAL_TEST",
          evidence_type: evidenceType,
          raw_values: enrichedRawData as Json,
          protocol_quality: Math.max(1, Math.min(5, Math.round(activeTest.reliabilityScore * 5))),
          validity: "OK",
          confidence_evidence: confidence,
          used_in_calibration: true,
          calibration_weight: confidence,
          notes: `Test manuel • ${activeTest.name}`,
        });
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error("calibration_evidence insert failed", e);
    }

    handleCloseTest();
    toast.success("Test enregistré avec succès");
  };

  // Handler for FIT import
  const handleSaveFitTest = async (data: FitTestSaveData) => {
    if (!selectedAthlete) return;

    const sportFromFile = (data.fileMeta.sport ?? "").toLowerCase();
    const sportEffective: "bike" | "run" =
      sportFromFile.includes("run") || data.type === "RUN_ECONOMY" ? "run" : "bike";
    const vlamaxToStore =
      sportEffective === "run" ? data.computedVlamaxRun ?? null : data.computedVlamax ?? null;

    const rawData = {
      category: "FIT_IMPORT",
      source: "FIT_IMPORT",
      testType: data.type,
      metrics: data.metrics,
      bestEfforts: data.bestEfforts,
      protocolQuality: data.protocolQuality,
      fileMeta: data.fileMeta,
      sport: sportEffective,
      // Store key metrics at root level for calibration layer
      ftp: data.metrics.ftp,
      map5min: data.metrics.map,
      p30s: data.metrics.p30s,
      p60s: data.metrics.p60s,
      tte_observed_min: data.metrics.tte_observed_min,
      drift_percent: data.metrics.drift_percent,
      computedVlamax: data.computedVlamax ?? null,
      computedVlamaxRun: data.computedVlamaxRun ?? null,
    };

    await addTest(
      selectedAthlete.id,
      "FIT_IMPORT",
      `Import FIT - ${data.type}`,
      sportEffective,
      data.confidence,
      vlamaxToStore,
      rawData as Json,
      `Fichier: ${data.fileMeta.fileName}`
    );

    // Persistance dans calibration_evidence pour la fenêtre glissante 42j
    try {
      const evidenceType =
        data.type === "SPRINT_15S" ? "SPRINT_15S" :
        data.type === "SPRINT_30S" || data.type === "SPRINT_60S" ? "P30" :
        data.type === "MAP_5MIN" ? "MAP" :
        data.type === "Z2_DRIFT" ? "DRIFT" :
        data.type === "RUN_ECONOMY" ? "ECONOMY" :
        data.type === "TTE_THRESHOLD" ? "TTE_OBS" :
        data.type.startsWith("FTP") ? "P60" :
        "P30";

      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (userId) {
        await supabase.from("calibration_evidence").insert({
          athlete_id: selectedAthlete.id,
          coach_id: userId,
          date: data.date,
          source_type: "FIT_IMPORT",
          evidence_type: evidenceType,
          raw_values: {
            ...data.metrics,
            sport: sportEffective,
            file_name: data.fileMeta.fileName,
            device: data.fileMeta.device ?? null,
            vlamax_computed: vlamaxToStore,
            test_type: data.type,
          } as Json,
          protocol_quality: Math.max(1, Math.min(5, data.protocolQuality)),
          validity: "OK",
          confidence_evidence: data.confidence,
          used_in_calibration: true,
          calibration_weight: data.confidence,
          notes: `FIT ${data.type} • ${data.fileMeta.fileName}`,
        });
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error("calibration_evidence insert failed", e);
    }
  };

  const handleUpdateProfileFromFit = async (updates: ProfileUpdates) => {
    if (!currentSnapshot) {
      toast.error("Aucun snapshot actif pour mettre à jour");
      return;
    }

    await updateSnapshot(currentSnapshot.id, updates as Record<string, unknown>);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/diagnostic")}
                className="shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <FlaskConical className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-foreground">
                    Protocoles de Tests
                  </h1>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Tests terrain standardisés TFCL
                  </p>
                </div>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>
      
      {/* Content */}
      <main className="container mx-auto px-4 py-6 pb-24 max-w-5xl space-y-6">
        {/* Athlete Selector */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-xs">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
            <Select
                value={selectedAthleteId || ""}
                onValueChange={setSelectedAthleteId}
                disabled={athletes.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={athletes.length === 0 ? "Aucun athlète" : "Sélectionner un athlète"} />
                </SelectTrigger>
                <SelectContent>
                  {athletes.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      Aucun athlète disponible
                    </div>
                  ) : (
                    athletes.map((athlete) => (
                      <SelectItem key={athlete.id} value={athlete.id}>
                        {athlete.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {selectedAthlete && (
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setFitImportOpen(true)}
                className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-md"
              >
                <Upload className="w-4 h-4" />
                <span>Importer fichier .FIT</span>
              </Button>
              <Badge variant="secondary" className="gap-1">
                <ClipboardList className="w-3 h-3" />
                {completedTestsCount} test{completedTestsCount !== 1 ? "s" : ""}
              </Badge>
            </div>
          )}
        </div>
        
        {!selectedAthlete ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Sélectionnez un athlète pour accéder aux protocoles de tests et à l'historique.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Philosophy Banner */}
            <Alert className="bg-primary/5 border-primary/20">
              <Target className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                <strong>Philosophie TFCL :</strong> Un bon test ne rend pas le chiffre parfait, mais la décision plus robuste.
              </AlertDescription>
            </Alert>
            
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="library" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Bibliothèque</span>
                  <span className="sm:hidden">Biblio</span>
                </TabsTrigger>
                <TabsTrigger value="completed" className="gap-2">
                  <ClipboardList className="w-4 h-4" />
                  <span className="hidden sm:inline">Tests Réalisés</span>
                  <span className="sm:hidden">Réalisés</span>
                  {completedTestsCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {completedTestsCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="hidden sm:inline">Historique</span>
                  <span className="sm:hidden">Histo</span>
                </TabsTrigger>
              </TabsList>
              
              {/* Sport Filter */}
              <div className="flex items-center gap-2 mt-4">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <div className="flex gap-1">
                  <Button
                    variant={sportFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSportFilter("all")}
                  >
                    Tous
                  </Button>
                  <Button
                    variant={sportFilter === "bike" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSportFilter("bike")}
                    className="gap-1"
                  >
                    <Bike className="w-4 h-4" />
                    <span className="hidden sm:inline">Vélo</span>
                  </Button>
                  <Button
                    variant={sportFilter === "run" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSportFilter("run")}
                    className="gap-1"
                  >
                    <PersonStanding className="w-4 h-4" />
                    <span className="hidden sm:inline">CAP</span>
                  </Button>
                </div>
              </div>
              
              <TabsContent value="library" className="mt-6">
                <TestLibraryView
                  tests={INTEGRATED_TESTS_LIBRARY}
                  sportFilter={sportFilter}
                  onStartTest={handleStartTest}
                />
              </TabsContent>
              
              <TabsContent value="completed" className="mt-6">
                <CompletedTestsView
                  tests={athleteTests as any}
                  sportFilter={sportFilter}
                />
              </TabsContent>
              
              <TabsContent value="history" className="mt-6">
                <TestHistoryView
                  tests={athleteTests as any}
                  sportFilter={sportFilter}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
      
      {/* Test Execution Sheet */}
      {activeTest && selectedAthlete && (
        <TestExecutionSheet
          test={activeTest}
          athlete={selectedAthlete}
          onClose={handleCloseTest}
          onSave={handleSaveTest}
        />
      )}

      {/* FIT Import Dialog */}
      {selectedAthlete && (
        <FitImportDialog
          open={fitImportOpen}
          onOpenChange={setFitImportOpen}
          athleteId={selectedAthlete.id}
          athleteName={selectedAthlete.name}
          currentSnapshot={currentSnapshot}
          onSaveTest={handleSaveFitTest}
          onUpdateProfile={handleUpdateProfileFromFit}
        />
      )}
    </div>
  );
}
