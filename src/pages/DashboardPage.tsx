// =============================================
// ÉCRAN 4 - DASHBOARD ATHLÈTE MULTI-SPORT
// Avec VLamax, Confiance et Précision dynamiques
// + Dashboard Scientifique + Export + Comparaison
// =============================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Zap, 
  Flame, 
  Activity, 
  Target, 
  Calendar, 
  CalendarDays, 
  TrendingUp,
  Plus,
  AlertCircle,
  Bike,
  PersonStanding,
  Waves,
  AlertTriangle,
  Clock,
  BookOpen,
  Users,
  Download,
  List,
  Heart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudData, DbAthlete, DbSnapshot, DbTest } from "@/hooks/useCloudData";
import { getDernierSnapshot } from "@/types/athlete";
import { estimerTTESport, calculerAgeSnapshot, calculerPrecision, SportType } from "@/types/snapshotNolio";
import { calculVLamaxAvecConfiance } from "@/lib/athleteStore";
import { calculRaceReadiness, texteExplicatifAthlete, getDernierSnapshotParSport } from "@/lib/raceReadiness";
import { determinerPriorite, seancesParSport } from "@/types/seances";
import { ScientificDashboard } from "@/components/ScientificDashboard";
import { MetricBars } from "@/components/ColoredProgressBar";
import { Phase3Dashboard } from "@/components/Phase3Dashboard";
import { ExportTools } from "@/components/ExportTools";
import { AthleteComparison } from "@/components/AthleteComparison";
import { IndexSeancesView } from "@/components/IndexSeances";
import { PhysiologicalAnalysis } from "@/components/PhysiologicalAnalysis";
import { ZonesModule } from "@/components/ZonesModule";
import { TestProtocols } from "@/components/TestProtocols";

// Interface pour les données par sport
interface SportDashboardData {
  vlamax: number;
  confiance: number;
  precision: number;
  ageSnapshot: number;
  tte: number;
  priorite: string;
  seances: any[];
  vo2max: number | null;
  hrv: number | null;
  poids: number;
  date: string;
  ftp?: number;
  vma?: number;
  pace100?: number;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { currentAthlete, athletes } = useAthletes();
  const { snapshots, tests } = useCloudData();
  const [activeSport, setActiveSport] = useState<SportType>("vélo");
  const [showComparison, setShowComparison] = useState(false);
  const [showIndexSeances, setShowIndexSeances] = useState(false);
  const [showPhysiologicalAnalysis, setShowPhysiologicalAnalysis] = useState(false);
  const [showZones, setShowZones] = useState(false);
  const [showTestLibrary, setShowTestLibrary] = useState(false);

  if (!currentAthlete) {
    return (
      <AppLayout title="Dashboard">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Sélectionnez un athlète</p>
            <Button onClick={() => navigate("/")} className="mt-4">
              Voir les athlètes
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const snapshot = getDernierSnapshot(currentAthlete);

  if (!snapshot) {
    return (
      <AppLayout title="Dashboard">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Aucune donnée pour {currentAthlete.nom}. Ajoutez un snapshot.
            </p>
            <Button onClick={() => navigate("/snapshot")} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter des données
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  // Charger données multi-sport avec confiance et précision
  const chargerDonneesSport = (sport: SportType): SportDashboardData | null => {
    const sportSnapshot = getDernierSnapshotParSport(currentAthlete, sport);
    if (!sportSnapshot) return null;

    const calc = calculVLamaxAvecConfiance(sportSnapshot, currentAthlete.objectif);
    const tte = estimerTTESport(sportSnapshot);
    const priorite = determinerPriorite(calc.vlamax, tte, currentAthlete.objectif);
    const seances = seancesParSport(priorite, sport);

    return {
      vlamax: calc.vlamax,
      confiance: calc.confiance,
      precision: calc.precision,
      ageSnapshot: calc.ageSnapshot,
      tte,
      priorite,
      seances,
      vo2max: sportSnapshot.vo2max || null,
      hrv: sportSnapshot.hrv || null,
      poids: sportSnapshot.poids,
      date: sportSnapshot.date,
      ftp: sportSnapshot.ftp,
      vma: sportSnapshot.vma,
      pace100: sportSnapshot.pace100,
    };
  };

  // Global readiness
  const readiness = calculRaceReadiness(currentAthlete);
  
  // Générer texte explicatif multi-sport avec confiance/précision
  const genererTexteMultiSport = (): string => {
    const sports: SportType[] = ["vélo", "course", "natation"];
    let texte = "";
    
    sports.forEach(sport => {
      const data = chargerDonneesSport(sport);
      if (data) {
        const emoji = sport === "vélo" ? "🚴" : sport === "course" ? "🏃" : "🏊";
        texte += `${emoji} ${sport.toUpperCase()} : VLamax ${data.vlamax.toFixed(2)} ±${data.precision}%, Confiance ${data.confiance}%\n`;
        texte += `   Priorité : ${data.priorite}\n`;
        texte += `   TTE estimé : ${data.tte} min\n\n`;
      }
    });
    
    texte += `🏅 Score global Race Readiness : ${readiness?.score || "N/A"}/100`;
    return texte;
  };

  const texte = genererTexteMultiSport();

  const getSportIcon = (sport: SportType) => {
    switch (sport) {
      case "vélo": return <Bike className="h-4 w-4" />;
      case "course": return <PersonStanding className="h-4 w-4" />;
      case "natation": return <Waves className="h-4 w-4" />;
    }
  };

  const getPrioriteColor = (p: string) => {
    switch (p) {
      case "Réduire VLamax": return "destructive";
      case "Augmenter TTE": return "secondary";
      default: return "default";
    }
  };

  const getConfianceColor = (confiance: number) => {
    if (confiance >= 80) return "text-success";
    if (confiance >= 60) return "text-warning";
    return "text-destructive";
  };

  const getConfianceBg = (confiance: number) => {
    if (confiance >= 80) return "bg-success/10 border-success/30";
    if (confiance >= 60) return "bg-warning/10 border-warning/30";
    return "bg-destructive/10 border-destructive/30";
  };

  const renderSportTab = (sport: SportType) => {
    const data = chargerDonneesSport(sport);
    
    if (!data) {
      return (
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Pas de données {sport}
            </p>
            <Button size="sm" onClick={() => navigate("/snapshot")}>
              Ajouter
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {/* VLamax avec confiance et précision */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">VLamax</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <AlertTriangle className="h-3 w-3" />
                <span>±{data.precision}%</span>
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono">{data.vlamax.toFixed(2)}</span>
              <span className="text-sm text-muted-foreground">mmol/L/s</span>
            </div>
            <Progress 
              value={Math.min(100, ((data.vlamax - 0.2) / 0.5) * 100)} 
              className="h-2 mt-2" 
            />
          </CardContent>
        </Card>

        {/* Confiance avec âge snapshot */}
        <Card className={cn("border", getConfianceBg(data.confiance))}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                <span className="text-sm">Confiance données</span>
              </div>
              {data.ageSnapshot > 0 && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{data.ageSnapshot}j</span>
                </div>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-2xl font-bold font-mono", getConfianceColor(data.confiance))}>
                {data.confiance}%
              </span>
              <span className="text-xs text-muted-foreground">
                (±{data.precision}% erreur)
              </span>
            </div>
            {data.ageSnapshot > 7 && (
              <p className="text-xs text-muted-foreground mt-1">
                Données de {Math.floor(data.ageSnapshot / 7)} semaine{data.ageSnapshot >= 14 ? 's' : ''} - pénalité appliquée
              </p>
            )}
          </CardContent>
        </Card>

        {/* Métriques secondaires */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-3 w-3 text-accent" />
                <span className="text-xs text-muted-foreground">TTE</span>
              </div>
              <p className="text-xl font-bold">{data.tte} min</p>
            </CardContent>
          </Card>

          {sport === "vélo" && data.ftp && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="h-3 w-3 text-warning" />
                  <span className="text-xs text-muted-foreground">FTP</span>
                </div>
                <p className="text-xl font-bold">{data.ftp}W</p>
                <p className="text-xs text-muted-foreground">
                  {(data.ftp / data.poids).toFixed(1)} W/kg
                </p>
              </CardContent>
            </Card>
          )}

          {sport === "course" && data.vma && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-3 w-3 text-warning" />
                  <span className="text-xs text-muted-foreground">VMA</span>
                </div>
                <p className="text-xl font-bold">{data.vma} km/h</p>
              </CardContent>
            </Card>
          )}

          {sport === "natation" && data.pace100 && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-3 w-3 text-warning" />
                  <span className="text-xs text-muted-foreground">Pace 100m</span>
                </div>
                <p className="text-xl font-bold">{data.pace100}s</p>
              </CardContent>
            </Card>
          )}

          {data.vo2max && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-3 w-3 text-primary" />
                  <span className="text-xs text-muted-foreground">VO2max</span>
                </div>
                <p className="text-xl font-bold">{data.vo2max}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Priorité */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Priorité</span>
              <Badge variant={getPrioriteColor(data.priorite) as any}>{data.priorite}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Séances recommandées */}
        <Card>
          <CardHeader className="pb-2 pt-3 px-3">
            <CardTitle className="text-sm">Séances recommandées</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2">
              {data.seances.slice(0, 3).map((seance, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{seance.code}</Badge>
                    <span>{seance.nom}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{seance.intensite}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-4 animate-fade-in">
        {/* Header avec Export et Comparaison */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {currentAthlete && (
            <ExportTools 
              athlete={{
                id: currentAthlete.id,
                coach_id: "", // Not needed for export
                name: currentAthlete.nom,
                goal: currentAthlete.objectif,
                refs: currentAthlete.refs,
                vo2max: currentAthlete.vo2max,
                active_snapshot_id: currentAthlete.active_snapshot_id,
                created_at: ""
              } as DbAthlete}
              snapshots={snapshots}
              tests={tests}
            />
          )}
          <Button
            variant={showComparison ? "default" : "outline"}
            size="sm"
            onClick={() => setShowComparison(!showComparison)}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            {showComparison ? "Masquer" : "Comparer"}
          </Button>
        </div>

        {/* Comparaison Multi-Athlètes */}
        {showComparison && athletes.length > 1 && (
          <AthleteComparison athletes={athletes} />
        )}

        {/* Race Readiness Global */}
        {readiness && (
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Race Readiness</span>
                <Badge variant={readiness.color as any}>{readiness.label}</Badge>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold">{readiness.score}%</span>
                <Progress value={readiness.score} className="flex-1 h-2" />
              </div>
              {readiness.parSport && readiness.parSport.length > 0 && (
                <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                  {readiness.parSport.map((s, i) => (
                    <div key={i} className="flex items-center gap-1">
                      {getSportIcon(s.sport)}
                      <span>{s.score}%</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Onglets par sport */}
        <Tabs value={activeSport} onValueChange={(v) => setActiveSport(v as SportType)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="vélo" className="gap-1">
              <Bike className="h-4 w-4" />
              Vélo
            </TabsTrigger>
            <TabsTrigger value="course" className="gap-1">
              <PersonStanding className="h-4 w-4" />
              Course
            </TabsTrigger>
            <TabsTrigger value="natation" className="gap-1">
              <Waves className="h-4 w-4" />
              Natation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vélo" className="mt-4">
            {renderSportTab("vélo")}
          </TabsContent>
          <TabsContent value="course" className="mt-4">
            {renderSportTab("course")}
          </TabsContent>
          <TabsContent value="natation" className="mt-4">
            {renderSportTab("natation")}
          </TabsContent>
        </Tabs>

        {/* Phase 3 - IA, Alertes, Gamification */}
        <Phase3Dashboard athlete={currentAthlete} />

        {/* Dashboard Scientifique */}
        <ScientificDashboard 
          snapshots={currentAthlete.historique}
          objectif={currentAthlete.objectif}
          athleteNom={currentAthlete.nom}
        />

        {/* Actions */}
        <div className="grid grid-cols-1 gap-2">
          <Button
            onClick={() => navigate("/evolution")}
            className="w-full justify-start gap-3 h-12"
            variant="outline"
          >
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm">Voir évolution</span>
          </Button>

          <Button
            onClick={() => setShowIndexSeances(!showIndexSeances)}
            className="w-full justify-start gap-3 h-12"
            variant={showIndexSeances ? "default" : "outline"}
          >
            <List className="h-4 w-4 text-primary" />
            <span className="text-sm">Index Séances A/B/C/D</span>
          </Button>

          <Button
            onClick={() => setShowPhysiologicalAnalysis(!showPhysiologicalAnalysis)}
            className="w-full justify-start gap-3 h-12"
            variant={showPhysiologicalAnalysis ? "default" : "outline"}
          >
            <Activity className="h-4 w-4 text-primary" />
            <span className="text-sm">Analyse Physiologique Élite</span>
          </Button>

          <Button
            onClick={() => setShowZones(!showZones)}
            className="w-full justify-start gap-3 h-12"
            variant={showZones ? "default" : "outline"}
          >
            <Heart className="h-4 w-4 text-primary" />
            <span className="text-sm">Zones (Cardiaque / Puissance / Allure)</span>
          </Button>

          <Button
            onClick={() => setShowTestLibrary(!showTestLibrary)}
            className="w-full justify-start gap-3 h-12"
            variant={showTestLibrary ? "default" : "outline"}
          >
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm">Bibliothèque de Tests</span>
          </Button>
        </div>

        {/* Index des Séances */}
        {showIndexSeances && (
          <IndexSeancesView />
        )}

        {/* Analyse Physiologique Élite */}
        {showPhysiologicalAnalysis && (
          <PhysiologicalAnalysis athlete={currentAthlete} />
        )}

        {/* Zones Module */}
        {showZones && (
          <ZonesModule />
        )}

        {/* Bibliothèque de Tests */}
        {showTestLibrary && (
          <TestProtocols />
        )}
      </div>
    </AppLayout>
  );
}
