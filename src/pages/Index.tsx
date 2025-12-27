import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { MetricCard } from "@/components/MetricCard";
import { VLamaxCalculator } from "@/components/VLamaxCalculator";
import { TrainingZones } from "@/components/TrainingZones";
import { TestProtocols } from "@/components/TestProtocols";
import { RaceChecklist } from "@/components/RaceChecklist";
import { NolioMapping } from "@/components/NolioMapping";
import { AthleteProfile } from "@/components/AthleteProfile";
import { TestMetaboliqueManager } from "@/components/TestMetaboliqueManager";
import { FeedbackNolioManager } from "@/components/FeedbackNolioManager";
import { DanLorangAnalysis } from "@/components/DanLorangAnalysis";
import { DashboardCoach } from "@/components/DashboardCoach";
import { AthleteSelector } from "@/components/AthleteSelector";
import { TestComparison } from "@/components/TestComparison";
import { Zap, Target, Flame, Activity } from "lucide-react";
import { Athlete } from "@/types/athlete";
import { TestMetabolique } from "@/types/testMetabolique";
import { FeedbackNolio } from "@/types/feedbackNolio";
import { calculVLamax, ResultatVLamax, defaultResultatVLamax } from "@/types/resultatVLamax";
import { reglesDanLorang } from "@/types/reglesDanLorang";
import {
  AthleteWithTests,
  chargerAthletes,
  sauvegarderAthletes,
  ajouterAthlete,
  supprimerAthlete,
  mettreAJourAthlete,
  ajouterTest,
  supprimerTest,
  creerAthleteExemple,
  getDernierTest,
  getHistoriqueVlamax,
} from "@/lib/athleteStore";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Multi-athlete state
  const [athletes, setAthletes] = useState<AthleteWithTests[]>(() => {
    const loaded = chargerAthletes();
    if (loaded.length > 0) return loaded;
    // Create example athlete if none exist
    return [creerAthleteExemple()];
  });

  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(
    () => {
      const loaded = chargerAthletes();
      if (loaded.length > 0) return loaded[0].id;
      return null;
    }
  );

  // Initialize selected athlete ID after athletes are loaded
  useEffect(() => {
    if (athletes.length > 0 && !selectedAthleteId) {
      setSelectedAthleteId(athletes[0].id);
    }
  }, [athletes, selectedAthleteId]);

  // Save athletes when they change
  useEffect(() => {
    sauvegarderAthletes(athletes);
  }, [athletes]);

  // Get current athlete
  const currentAthlete = athletes.find((a) => a.id === selectedAthleteId);

  // Feedbacks (shared for now)
  const [feedbacksNolio, setFeedbacksNolio] = useState<FeedbackNolio[]>(() => {
    const saved = localStorage.getItem("loranglab-feedbacks");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Handlers
  const handleAddAthlete = (athlete: AthleteWithTests) => {
    setAthletes((prev) => ajouterAthlete(prev, athlete));
    setSelectedAthleteId(athlete.id);
  };

  const handleDeleteAthlete = (athleteId: string) => {
    setAthletes((prev) => {
      const updated = supprimerAthlete(prev, athleteId);
      if (updated.length > 0) {
        setSelectedAthleteId(updated[0].id);
      }
      return updated;
    });
  };

  const handleAthleteUpdate = (updatedAthlete: Athlete) => {
    if (!currentAthlete) return;
    const updated: AthleteWithTests = {
      ...currentAthlete,
      ...updatedAthlete,
    };
    setAthletes((prev) => mettreAJourAthlete(prev, updated));
  };

  const handleTestsChange = (tests: TestMetabolique[]) => {
    if (!currentAthlete) return;
    const updated: AthleteWithTests = {
      ...currentAthlete,
      tests,
    };
    setAthletes((prev) => mettreAJourAthlete(prev, updated));
  };

  const handleFeedbacksChange = (feedbacks: FeedbackNolio[]) => {
    setFeedbacksNolio(feedbacks);
    localStorage.setItem("loranglab-feedbacks", JSON.stringify(feedbacks));
  };

  // Compute metrics for current athlete
  const latestTest = currentAthlete ? getDernierTest(currentAthlete) : null;
  const testsMetaboliques = currentAthlete?.tests || [];
  const previousTest = testsMetaboliques[1];

  // Calculate VLamax
  const vlamax_6sem_avant = 0.42;
  const previousVlamaxValue = previousTest && currentAthlete
    ? calculVLamax(previousTest, currentAthlete.poids).vlamax
    : vlamax_6sem_avant;

  const historiqueVlamax = currentAthlete ? getHistoriqueVlamax(currentAthlete) : [];

  const currentResultat: ResultatVLamax = latestTest && currentAthlete
    ? {
        ...calculVLamax(latestTest, currentAthlete.poids, previousVlamaxValue),
        historique: historiqueVlamax,
      }
    : { ...defaultResultatVLamax, vlamax: currentAthlete?.vlamax || 0.45, historique: [] };

  const currentVlamax = currentResultat.vlamax || currentAthlete?.vlamax || 0.45;
  const currentFtp = latestTest?.cp || currentAthlete?.ftp || 280;
  const currentTte = latestTest?.tte ? latestTest.tte / 60 : 60;
  const ftp_kg = currentFtp / (currentAthlete?.poids || 70);

  // State for coach dashboard inputs
  const [seanceSpecifiqueValidee, setSeanceSpecifiqueValidee] = useState(true);
  const [fatigueOk, setFatigueOk] = useState(true);

  // Calculate regles for dashboard coach
  const currentRegles = currentAthlete
    ? reglesDanLorang(
        currentAthlete,
        currentResultat,
        currentTte,
        ftp_kg,
        seanceSpecifiqueValidee,
        fatigueOk
      )
    : { priorite: "" as const, alertes: [], race_ready: false };

  if (!currentAthlete) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-8 animate-fade-in">
            {/* Athlete Selector */}
            <AthleteSelector
              athletes={athletes}
              selectedAthleteId={selectedAthleteId}
              onSelectAthlete={setSelectedAthleteId}
              onAddAthlete={handleAddAthlete}
              onDeleteAthlete={handleDeleteAthlete}
            />

            {/* Hero Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="VLamax Estimé"
                value={currentVlamax.toFixed(2)}
                unit="mmol/L/s"
                icon={Zap}
                trend="neutral"
                trendValue="stable"
                accentColor="primary"
              />
              <MetricCard
                title="FTP"
                value={currentFtp.toString()}
                unit="watts"
                icon={Flame}
                trend="up"
                trendValue="+5W"
                accentColor="accent"
              />
              <MetricCard
                title="VO2max"
                value={(currentAthlete.vo2max || 65).toString()}
                unit="ml/kg/min"
                icon={Activity}
                trend="up"
                trendValue="+2"
                accentColor="success"
              />
              <MetricCard
                title="Race Readiness"
                value={currentRegles.race_ready ? "100" : "78"}
                unit="%"
                icon={Target}
                trend={currentRegles.race_ready ? "up" : "neutral"}
                trendValue={currentRegles.race_ready ? "Ready!" : "En cours"}
                accentColor="warning"
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              <VLamaxCalculator athlete={currentAthlete} previousVlamax={previousVlamaxValue} />
              <TrainingZones />
            </div>

            {/* Dan Lorang Analysis */}
            <DanLorangAnalysis
              athlete={currentAthlete}
              resultat={currentResultat}
              tte={currentTte}
              ftp_kg={ftp_kg}
            />

            {/* Dashboard Coach */}
            <DashboardCoach
              athlete={currentAthlete}
              resultat={currentResultat}
              regles={currentRegles}
              testsHistorique={testsMetaboliques}
              tte={currentTte}
              ftp_kg={ftp_kg}
              seance_specifique_validee={seanceSpecifiqueValidee}
              fatigue_ok={fatigueOk}
            />
          </div>
        );

      case "vlamax":
        return (
          <div className="space-y-6 animate-fade-in">
            <AthleteSelector
              athletes={athletes}
              selectedAthleteId={selectedAthleteId}
              onSelectAthlete={setSelectedAthleteId}
              onAddAthlete={handleAddAthlete}
              onDeleteAthlete={handleDeleteAthlete}
            />
            <AthleteProfile athlete={currentAthlete} onUpdate={handleAthleteUpdate} />
            <VLamaxCalculator athlete={currentAthlete} previousVlamax={previousVlamaxValue} />
            <DanLorangAnalysis
              athlete={currentAthlete}
              resultat={currentResultat}
              tte={currentTte}
              ftp_kg={ftp_kg}
            />
            <TrainingZones />
          </div>
        );

      case "tests":
        return (
          <div className="space-y-6 animate-fade-in">
            <AthleteSelector
              athletes={athletes}
              selectedAthleteId={selectedAthleteId}
              onSelectAthlete={setSelectedAthleteId}
              onAddAthlete={handleAddAthlete}
              onDeleteAthlete={handleDeleteAthlete}
            />
            <TestMetaboliqueManager
              tests={testsMetaboliques}
              onTestsChange={handleTestsChange}
              athletePoids={currentAthlete.poids}
            />
            <TestComparison athlete={currentAthlete} />
            <TestProtocols />
          </div>
        );

      case "nolio":
        return (
          <div className="space-y-6 animate-fade-in">
            <FeedbackNolioManager
              feedbacks={feedbacksNolio}
              onFeedbacksChange={handleFeedbacksChange}
            />
            <NolioMapping />
          </div>
        );

      case "checklist":
        return (
          <div className="animate-fade-in">
            <RaceChecklist />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background Gradient */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="container mx-auto px-4 py-8 relative">
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>LorangLab • Méthodologie Dan Lorang • Optimisation Performance</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
