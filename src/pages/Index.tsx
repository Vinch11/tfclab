import { useState } from "react";
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
import { Zap, Target, Flame, Activity } from "lucide-react";
import { Athlete, defaultAthlete } from "@/types/athlete";
import { TestMetabolique, estimateVLamaxFromTest } from "@/types/testMetabolique";
import { FeedbackNolio } from "@/types/feedbackNolio";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  
  const [athlete, setAthlete] = useState<Athlete>(() => {
    const saved = localStorage.getItem("loranglab-athlete");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return { ...defaultAthlete, id: crypto.randomUUID() };
      }
    }
    return { ...defaultAthlete, id: crypto.randomUUID(), ftp: 280, vo2max: 65, poids: 70 };
  });

  const [testsMetaboliques, setTestsMetaboliques] = useState<TestMetabolique[]>(() => {
    const saved = localStorage.getItem("loranglab-tests");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

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

  const handleAthleteUpdate = (updatedAthlete: Athlete) => {
    setAthlete(updatedAthlete);
    localStorage.setItem("loranglab-athlete", JSON.stringify(updatedAthlete));
  };

  const handleTestsChange = (tests: TestMetabolique[]) => {
    setTestsMetaboliques(tests);
    localStorage.setItem("loranglab-tests", JSON.stringify(tests));
  };

  const handleFeedbacksChange = (feedbacks: FeedbackNolio[]) => {
    setFeedbacksNolio(feedbacks);
    localStorage.setItem("loranglab-feedbacks", JSON.stringify(feedbacks));
  };

  // Compute metrics from latest test
  const latestTest = testsMetaboliques[0];
  const previousTest = testsMetaboliques[1];
  const currentVlamax = latestTest 
    ? estimateVLamaxFromTest(latestTest, athlete.poids) 
    : athlete.vlamax || 0.45;
  const previousVlamax = previousTest 
    ? estimateVLamaxFromTest(previousTest, athlete.poids) 
    : undefined;
  const currentFtp = latestTest?.cp || athlete.ftp || 280;

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-8 animate-fade-in">
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
                value={(athlete.vo2max || 65).toString()}
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
              <VLamaxCalculator athlete={athlete} previousVlamax={previousVlamax} />
              <TrainingZones />
            </div>
          </div>
        );

      case "vlamax":
        return (
          <div className="space-y-6 animate-fade-in">
            <AthleteProfile athlete={athlete} onUpdate={handleAthleteUpdate} />
            <VLamaxCalculator athlete={athlete} previousVlamax={previousVlamax} />
            <TrainingZones />
          </div>
        );

      case "tests":
        return (
          <div className="space-y-6 animate-fade-in">
            <TestMetaboliqueManager
              tests={testsMetaboliques}
              onTestsChange={handleTestsChange}
              athletePoids={athlete.poids}
            />
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
