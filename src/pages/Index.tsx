import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { MetricCard } from "@/components/MetricCard";
import { VLamaxCalculator } from "@/components/VLamaxCalculator";
import { TrainingZones } from "@/components/TrainingZones";
import { TestProtocols } from "@/components/TestProtocols";
import { VLamaxTestingPage } from "@/components/VLamaxTestingPage";
import { RaceChecklist } from "@/components/RaceChecklist";
import { NolioMapping } from "@/components/NolioMapping";
import { AthleteProfile } from "@/components/AthleteProfile";
import { FeedbackNolioManager } from "@/components/FeedbackNolioManager";
import { DanLorangAnalysis } from "@/components/DanLorangAnalysis";
import { TestComparison } from "@/components/TestComparison";
import { SemaineTypeView } from "@/components/SemaineTypeView";
import { RaceReadinessCard } from "@/components/RaceReadinessCard";
import { Bloc3SemainesView } from "@/components/Bloc3SemainesView";
import { PhysiologicalAnalysis } from "@/components/PhysiologicalAnalysis";
import { Planificateur } from "@/components/Planificateur";
import { WorkoutLibrary } from "@/components/WorkoutLibrary";
import { MonitoringDashboard } from "@/components/MonitoringDashboard";
import { ExportTools } from "@/components/ExportTools";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Zap, Target, Flame, Activity, BookOpen, Brain, Calendar, Dumbbell, TrendingUp, Plus, Trash2, LogOut, Loader2, User } from "lucide-react";
import logo2fc from "@/assets/logo-2fc.png";
import { useAuth } from "@/contexts/AuthContext";
import { useCloudData, DbAthlete } from "@/hooks/useCloudData";
import { FeedbackNolio } from "@/types/feedbackNolio";
import { toast } from "sonner";

const Index = () => {
  const { user, signOut } = useAuth();
  const { athletes, loading, addAthlete, updateAthlete, deleteAthlete, getTestsForAthlete } = useCloudData();
  
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showTestLibrary, setShowTestLibrary] = useState(false);
  const [showPhysioAnalysis, setShowPhysioAnalysis] = useState(false);
  const [showPlanner, setShowPlanner] = useState(false);
  const [showWorkoutLibrary, setShowWorkoutLibrary] = useState(false);
  const [showMonitoring, setShowMonitoring] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAthleteName, setNewAthleteName] = useState("");
  const [newAthleteGoal, setNewAthleteGoal] = useState("IM");

  // Feedbacks (localStorage pour l'instant)
  const [feedbacksNolio, setFeedbacksNolio] = useState<FeedbackNolio[]>(() => {
    const saved = localStorage.getItem("loranglab-feedbacks");
    if (saved) {
      try { return JSON.parse(saved); } catch { return []; }
    }
    return [];
  });

  // Select first athlete when loaded
  if (!loading && athletes.length > 0 && !selectedAthleteId) {
    setSelectedAthleteId(athletes[0].id);
  }

  const currentAthlete = athletes.find((a) => a.id === selectedAthleteId);

  // Handlers
  const handleAddAthlete = async () => {
    if (!newAthleteName.trim()) {
      toast.error("Nom requis");
      return;
    }
    const athlete = await addAthlete(newAthleteName.trim(), newAthleteGoal, {});
    if (athlete) {
      setSelectedAthleteId(athlete.id);
      setNewAthleteName("");
      setNewAthleteGoal("IM");
      setIsAddDialogOpen(false);
    }
  };

  const handleDeleteAthlete = async () => {
    if (!currentAthlete || athletes.length <= 1) return;
    const confirmed = confirm(`Supprimer ${currentAthlete.name} ?`);
    if (confirmed) {
      await deleteAthlete(currentAthlete.id);
      if (athletes.length > 1) {
        setSelectedAthleteId(athletes.find(a => a.id !== currentAthlete.id)?.id || null);
      }
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleFeedbacksChange = (feedbacks: FeedbackNolio[]) => {
    setFeedbacksNolio(feedbacks);
    localStorage.setItem("loranglab-feedbacks", JSON.stringify(feedbacks));
  };

  // Convert DbAthlete to legacy Athlete format for components
  const convertToLegacyAthlete = (dbAthlete: DbAthlete) => {
    const refs = (dbAthlete.refs || {}) as Record<string, unknown>;
    return {
      id: dbAthlete.id,
      nom: dbAthlete.name,
      sexe: (refs.sexe as "M" | "F") || "M",
      objectif: (dbAthlete.goal as "IM" | "703" | "Marathon" | "Semi") || "IM",
      masse_grasse: (refs.masse_grasse as number) || 18,
      historique: [],
      tests: [],
      refs: {
        fcMax: (refs.fcMax as number) || null,
        vma: (refs.vma as number) || null,
        ftp: (refs.ftp as number) || null,
        css: (refs.css as number) || null,
      },
      vo2max: dbAthlete.vo2max || undefined,
    };
  };

  const legacyAthlete = currentAthlete ? convertToLegacyAthlete(currentAthlete) : null;

  // Computed values (mocked since we don't have snapshots yet)
  const vlamax = 0.45;
  const tte = 55;
  const ftp = (legacyAthlete?.refs?.ftp || 250);
  const poids = 70;
  const ftp_kg = ftp / poids;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des données...</p>
        </div>
      </div>
    );
  }

  const renderAthleteSelector = () => (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="h-5 w-5" />
            Athlète
          </CardTitle>
          <div className="flex items-center gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-1" />
                  Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nouvel athlète</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium">Nom</label>
                    <Input
                      value={newAthleteName}
                      onChange={(e) => setNewAthleteName(e.target.value)}
                      placeholder="Nom de l'athlète"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Objectif</label>
                    <Select value={newAthleteGoal} onValueChange={setNewAthleteGoal}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IM">Ironman</SelectItem>
                        <SelectItem value="703">70.3 / Half</SelectItem>
                        <SelectItem value="Marathon">Marathon</SelectItem>
                        <SelectItem value="Semi">Semi-Marathon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddAthlete} className="w-full">
                    Créer l'athlète
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {athletes.length > 1 && (
              <Button size="sm" variant="ghost" onClick={handleDeleteAthlete}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {athletes.length === 0 ? (
          <p className="text-muted-foreground text-sm">Aucun athlète. Cliquez sur Ajouter pour commencer.</p>
        ) : (
          <Select value={selectedAthleteId || ""} onValueChange={setSelectedAthleteId}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un athlète" />
            </SelectTrigger>
            <SelectContent>
              {athletes.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} ({a.goal || "IM"})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    if (!legacyAthlete) {
      return (
        <div className="space-y-8 animate-fade-in">
          {renderAthleteSelector()}
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Ajoutez un athlète pour commencer</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard":
        return (
          <div className="space-y-8 animate-fade-in">
            {renderAthleteSelector()}

            {/* Boutons Bibliothèque Tests + Analyse Physio + Planificateur + Séances + Suivi */}
            <div className="flex flex-wrap gap-3">
              <Button 
                variant={showTestLibrary ? "default" : "outline"}
                onClick={() => {
                  setShowTestLibrary(!showTestLibrary);
                  setShowPhysioAnalysis(false);
                  setShowPlanner(false);
                  setShowWorkoutLibrary(false);
                  setShowMonitoring(false);
                }}
                className="flex items-center gap-2"
              >
                <BookOpen className="h-4 w-4" />
                📚 Tests
              </Button>
              <Button 
                variant={showPhysioAnalysis ? "default" : "outline"}
                onClick={() => {
                  setShowPhysioAnalysis(!showPhysioAnalysis);
                  setShowTestLibrary(false);
                  setShowPlanner(false);
                  setShowWorkoutLibrary(false);
                  setShowMonitoring(false);
                }}
                className="flex items-center gap-2"
              >
                <Brain className="h-4 w-4" />
                🧠 Analyse Physio
              </Button>
              <Button 
                variant={showPlanner ? "default" : "outline"}
                onClick={() => {
                  setShowPlanner(!showPlanner);
                  setShowTestLibrary(false);
                  setShowPhysioAnalysis(false);
                  setShowWorkoutLibrary(false);
                  setShowMonitoring(false);
                }}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                📅 Planificateur
              </Button>
              <Button 
                variant={showWorkoutLibrary ? "default" : "outline"}
                onClick={() => {
                  setShowWorkoutLibrary(!showWorkoutLibrary);
                  setShowTestLibrary(false);
                  setShowPhysioAnalysis(false);
                  setShowPlanner(false);
                  setShowMonitoring(false);
                }}
                className="flex items-center gap-2"
              >
                <Dumbbell className="h-4 w-4" />
                🏋️ Séances
              </Button>
              <Button 
                variant={showMonitoring ? "default" : "outline"}
                onClick={() => {
                  setShowMonitoring(!showMonitoring);
                  setShowTestLibrary(false);
                  setShowPhysioAnalysis(false);
                  setShowPlanner(false);
                  setShowWorkoutLibrary(false);
                }}
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                📈 Suivi
              </Button>
              <ExportTools athlete={legacyAthlete} />
            </div>

            {/* Contenu conditionnel */}
            {showTestLibrary && <TestProtocols athlete={legacyAthlete} />}
            {showPhysioAnalysis && <PhysiologicalAnalysis athlete={legacyAthlete} />}
            {showPlanner && <Planificateur athlete={legacyAthlete} />}
            {showWorkoutLibrary && <WorkoutLibrary athlete={legacyAthlete} />}
            {showMonitoring && <MonitoringDashboard athlete={legacyAthlete} />}

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
                value={ftp.toString()}
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
                value="78"
                unit="%"
                icon={Target}
                trend="neutral"
                trendValue="En cours"
                accentColor="warning"
              />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <VLamaxCalculator athlete={legacyAthlete} />
              <TrainingZones />
            </div>

            <RaceReadinessCard athlete={legacyAthlete} />
            <DanLorangAnalysis athlete={legacyAthlete} />
            <SemaineTypeView athlete={legacyAthlete} />
            <Bloc3SemainesView athlete={legacyAthlete} />
          </div>
        );

      case "vlamax":
        return (
          <div className="space-y-6 animate-fade-in">
            {renderAthleteSelector()}
            <AthleteProfile athlete={legacyAthlete} onUpdate={() => {}} />
            <VLamaxCalculator athlete={legacyAthlete} />
            <DanLorangAnalysis athlete={legacyAthlete} />
            <TrainingZones />
          </div>
        );

      case "tests":
        return (
          <div className="space-y-6 animate-fade-in">
            {renderAthleteSelector()}
            <VLamaxTestingPage 
              athlete={legacyAthlete} 
              onSaveTests={(tests) => {
                console.log("Tests saved:", tests);
              }}
            />
            <TestComparison athlete={legacyAthlete} />
            <TestProtocols athlete={legacyAthlete} />
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

      {/* Header with user info */}
      <div className="container mx-auto px-4 pt-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            Connecté: {user?.email}
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8 relative">
        {/* Logo en grand format */}
        <div className="flex justify-center mb-8">
          <img 
            src={logo2fc} 
            alt="Two For Coaching - Vince's Lab" 
            className="h-24 md:h-32 w-auto object-contain"
          />
        </div>
        
        {renderContent()}
      </main>

      <footer className="border-t border-border mt-12 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>LorangLab • Méthodologie Dan Lorang • Données Cloud</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
