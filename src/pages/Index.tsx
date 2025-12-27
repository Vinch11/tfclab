import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { MetricCard } from "@/components/MetricCard";
import { VLamaxCalculator } from "@/components/VLamaxCalculator";
import { TrainingZones } from "@/components/TrainingZones";
import { TestProtocols } from "@/components/TestProtocols";
import { RaceChecklist } from "@/components/RaceChecklist";
import { NolioMapping } from "@/components/NolioMapping";
import { AthleteProfile } from "@/components/AthleteProfile";
import { FeedbackNolioManager } from "@/components/FeedbackNolioManager";
import { DanLorangAnalysis } from "@/components/DanLorangAnalysis";
import { AthleteSelector } from "@/components/AthleteSelector";
import { TestComparison } from "@/components/TestComparison";
import { Zap, Target, Flame, Activity } from "lucide-react";
import { Athlete, getDernierSnapshot } from "@/types/athlete";
import { FeedbackNolio } from "@/types/feedbackNolio";
import { estimerTTE, scoreConfiance } from "@/types/snapshotNolio";
import {
  chargerAthletes,
  sauvegarderAthletes,
  ajouterAthlete,
  supprimerAthlete,
  mettreAJourAthlete,
  creerAthleteExemple,
  calculVLamaxSnapshot,
  getHistoriqueVlamax,
} from "@/lib/athleteStore";
import { reglesDanLorang } from "@/types/reglesDanLorang";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");

  // Multi-athlete state
  const [athletes, setAthletes] = useState<Athlete[]>(() => {
    const loaded = chargerAthletes();
    if (loaded.length > 0) return loaded;
    return [creerAthleteExemple()];
  });

  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(
    () => {
      const loaded = chargerAthletes();
      if (loaded.length > 0) return loaded[0].id;
      return null;
    }
  );

  useEffect(() => {
    if (athletes.length > 0 && !selectedAthleteId) {
      setSelectedAthleteId(athletes[0].id);
    }
  }, [athletes, selectedAthleteId]);

  useEffect(() => {
    sauvegarderAthletes(athletes);
  }, [athletes]);

  const currentAthlete = athletes.find((a) => a.id === selectedAthleteId);
  const snapshot = currentAthlete ? getDernierSnapshot(currentAthlete) : null;

  // Feedbacks
  const [feedbacksNolio, setFeedbacksNolio] = useState<FeedbackNolio[]>(() => {
    const saved = localStorage.getItem("loranglab-feedbacks");
    if (saved) {
      try { return JSON.parse(saved); } catch { return []; }
    }
    return [];
  });

  // Handlers
  const handleAddAthlete = (athlete: Athlete) => {
    setAthletes((prev) => ajouterAthlete(prev, athlete));
    setSelectedAthleteId(athlete.id);
  };

  const handleDeleteAthlete = (athleteId: string) => {
    setAthletes((prev) => {
      const updated = supprimerAthlete(prev, athleteId);
      if (updated.length > 0) setSelectedAthleteId(updated[0].id);
      return updated;
    });
  };

  const handleAthleteUpdate = (updatedAthlete: Athlete) => {
    setAthletes((prev) => mettreAJourAthlete(prev, updatedAthlete));
  };

  const handleFeedbacksChange = (feedbacks: FeedbackNolio[]) => {
    setFeedbacksNolio(feedbacks);
    localStorage.setItem("loranglab-feedbacks", JSON.stringify(feedbacks));
  };

  // Computed values
  const vlamax = snapshot && currentAthlete ? calculVLamaxSnapshot(snapshot, currentAthlete.objectif) : 0.45;
  const tte = snapshot ? estimerTTE(snapshot.ftp, snapshot.tss_7j) : 55;
  const ftp_kg = snapshot ? snapshot.ftp / snapshot.poids : 4.0;
  const confiance = snapshot ? scoreConfiance(snapshot) : 0;

  const currentRegles = currentAthlete
    ? reglesDanLorang(currentAthlete, vlamax, tte, ftp_kg, true, true)
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
            <AthleteSelector
              athletes={athletes}
              selectedAthleteId={selectedAthleteId}
              onSelectAthlete={setSelectedAthleteId}
              onAddAthlete={handleAddAthlete}
              onDeleteAthlete={handleDeleteAthlete}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="VLamax Estimé"
                value={vlamax.toFixed(2)}
                unit="mmol/L/s"
                icon={Zap}
                trend="neutral"
                trendValue="stable"
                accentColor="primary"
              />
              <MetricCard
                title="FTP"
                value={(snapshot?.ftp || 0).toString()}
                unit="watts"
                icon={Flame}
                trend="up"
                trendValue={`${ftp_kg.toFixed(1)} W/kg`}
                accentColor="accent"
              />
              <MetricCard
                title="TTE Estimé"
                value={tte.toString()}
                unit="min"
                icon={Activity}
                trend="up"
                trendValue="TSS-based"
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

            <div className="grid lg:grid-cols-2 gap-6">
              <VLamaxCalculator athlete={currentAthlete} />
              <TrainingZones />
            </div>

            <DanLorangAnalysis athlete={currentAthlete} />
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
            <VLamaxCalculator athlete={currentAthlete} />
            <DanLorangAnalysis athlete={currentAthlete} />
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
            <AthleteProfile athlete={currentAthlete} onUpdate={handleAthleteUpdate} />
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
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="container mx-auto px-4 py-8 relative">
        {renderContent()}
      </main>

      <footer className="border-t border-border mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>LorangLab • Méthodologie Dan Lorang • Données NOLIO</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
