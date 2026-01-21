/**
 * Tests Page - Module Protocoles de Tests Intégrés TFCL
 * Page principale avec 3 onglets : Bibliothèque, Tests Réalisés, Historique
 */

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";

// Components
import { TestLibraryView } from "@/components/tests/TestLibraryView";
import { CompletedTestsView } from "@/components/tests/CompletedTestsView";
import { TestHistoryView } from "@/components/tests/TestHistoryView";
import { TestExecutionSheet } from "@/components/tests/TestExecutionSheet";
import { AthleteSelector } from "@/components/AthleteSelector";

import { IntegratedTestProtocol, INTEGRATED_TESTS_LIBRARY } from "@/data/testProtocolsLibrary";

export default function TestsPage() {
  const navigate = useNavigate();
  const { athletes, selectedAthleteId, setSelectedAthleteId } = useAthletes();
  const { tests, addTest } = useCloudDataContext();
  
  const [activeTab, setActiveTab] = useState("library");
  const [activeTest, setActiveTest] = useState<IntegratedTestProtocol | null>(null);
  const [sportFilter, setSportFilter] = useState<"all" | "bike" | "run">("all");
  
  const selectedAthlete = useMemo(
    () => athletes.find(a => a.id === selectedAthleteId) || null,
    [athletes, selectedAthleteId]
  );
  
  const athleteTests = useMemo(() => {
    if (!selectedAthlete) return [];
    return tests.filter(t => t.athlete_id === selectedAthlete.id);
  }, [tests, selectedAthlete]);
  
  const completedTestsCount = athleteTests.length;
  
  const handleStartTest = (test: IntegratedTestProtocol) => {
    setActiveTest(test);
  };
  
  const handleCloseTest = () => {
    setActiveTest(null);
  };
  
  const handleSaveTest = async (testData: Record<string, unknown>) => {
    if (!selectedAthlete || !activeTest) return;
    
    await addTest({
      athlete_id: selectedAthlete.id,
      type: activeTest.category,
      name: activeTest.name,
      sport: activeTest.sport,
      raw: testData,
      reliability: activeTest.reliabilityScore,
      vlamax: testData.estimatedVlamax as number || null
    });
    
    handleCloseTest();
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
            <AthleteSelector
              athletes={athletes}
              selectedId={selectedAthleteId}
              onSelect={setSelectedAthleteId}
            />
          </div>
          
          {selectedAthlete && (
            <div className="flex items-center gap-2">
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
                  tests={athleteTests}
                  sportFilter={sportFilter}
                />
              </TabsContent>
              
              <TabsContent value="history" className="mt-6">
                <TestHistoryView
                  tests={athleteTests}
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
    </div>
  );
}
