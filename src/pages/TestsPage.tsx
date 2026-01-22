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
    
    handleCloseTest();
    toast.success("Test enregistré avec succès");
  };

  // Handler for FIT import
  const handleSaveFitTest = async (data: FitTestSaveData) => {
    if (!selectedAthlete) return;
    
    const rawData = {
      category: "FIT_IMPORT",
      source: "FIT_IMPORT",
      testType: data.type,
      metrics: data.metrics,
      bestEfforts: data.bestEfforts,
      protocolQuality: data.protocolQuality,
      fileMeta: data.fileMeta,
      // Store key metrics at root level for calibration layer
      ftp: data.metrics.ftp,
      map5min: data.metrics.map,
      p30s: data.metrics.p30s,
      p60s: data.metrics.p60s,
      tte_observed_min: data.metrics.tte_observed_min,
      drift_percent: data.metrics.drift_percent,
    };

    await addTest(
      selectedAthlete.id,
      "FIT_IMPORT",
      `Import FIT - ${data.type}`,
      "bike",
      data.confidence,
      null,
      rawData as Json,
      `Fichier: ${data.fileMeta.fileName}`
    );
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
                onClick={() => navigate("/")}
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
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner un athlète" />
                </SelectTrigger>
                <SelectContent>
                  {athletes.map((athlete) => (
                    <SelectItem key={athlete.id} value={athlete.id}>
                      {athlete.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {selectedAthlete && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFitImportOpen(true)}
                className="gap-1"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">Importer .FIT</span>
              </Button>
              <Badge variant="secondary" className="gap-1">
                <ClipboardList className="w-3 h-3" />
                {completedTestsCount} test{completedTestsCount !== 1 ? "s" : ""} réalisé{completedTestsCount !== 1 ? "s" : ""}
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
