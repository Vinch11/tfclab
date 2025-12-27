import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { MetricCard } from "@/components/MetricCard";
import { VLamaxCalculator } from "@/components/VLamaxCalculator";
import { TrainingZones } from "@/components/TrainingZones";
import { TestProtocols } from "@/components/TestProtocols";
import { RaceChecklist } from "@/components/RaceChecklist";
import { NolioMapping } from "@/components/NolioMapping";
import { AthleteProfile } from "@/components/AthleteProfile";
import { Zap, Target, Flame, Activity } from "lucide-react";
import { Athlete, defaultAthlete } from "@/types/athlete";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [athlete, setAthlete] = useState<Athlete>(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem("loranglab-athlete");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { ...defaultAthlete, id: crypto.randomUUID() };
      }
    }
    return { ...defaultAthlete, id: crypto.randomUUID(), ftp: 280, vo2max: 65 };
  });

  const handleAthleteUpdate = (updatedAthlete: Athlete) => {
    setAthlete(updatedAthlete);
    localStorage.setItem("loranglab-athlete", JSON.stringify(updatedAthlete));
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-8 animate-fade-in">
            {/* Hero Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="VLamax Estimé"
                value="0.45"
                unit="mmol/L/s"
                icon={Zap}
                trend="neutral"
                trendValue="stable"
                accentColor="primary"
              />
              <MetricCard
                title="FTP"
                value="280"
                unit="watts"
                icon={Flame}
                trend="up"
                trendValue="+5W"
                accentColor="accent"
              />
              <MetricCard
                title="VO2max"
                value="65"
                unit="ml/kg/min"
                icon={Activity}
                trend="up"
                trendValue="+2"
                accentColor="success"
              />
              <MetricCard
                title="Race Readiness"
                value="78"
                unit="%"
                icon={Target}
                trend="up"
                trendValue="+12%"
                accentColor="warning"
              />
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
              <VLamaxCalculator />
              <TrainingZones />
            </div>
          </div>
        );

      case "vlamax":
        return (
          <div className="space-y-6 animate-fade-in">
            <AthleteProfile athlete={athlete} onUpdate={handleAthleteUpdate} />
            <VLamaxCalculator />
            <TrainingZones />
          </div>
        );

      case "tests":
        return (
          <div className="animate-fade-in">
            <TestProtocols />
          </div>
        );

      case "nolio":
        return (
          <div className="animate-fade-in">
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
