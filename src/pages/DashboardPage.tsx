// =============================================
// ÉCRAN 4 - DASHBOARD ATHLÈTE MULTI-SPORT
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
  Waves
} from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";
import { getDernierSnapshot } from "@/types/athlete";
import { estimerTTESport, scoreConfiance, SportType } from "@/types/snapshotNolio";
import { calculVLamaxSnapshot } from "@/lib/athleteStore";
import { calculRaceReadiness, texteExplicatifAthlete, getDernierSnapshotParSport } from "@/lib/raceReadiness";
import { determinerPriorite, seancesParSport } from "@/types/seances";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { currentAthlete } = useAthletes();
  const [activeSport, setActiveSport] = useState<SportType>("vélo");

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

  // Global readiness
  const readiness = calculRaceReadiness(currentAthlete);
  const texte = texteExplicatifAthlete(currentAthlete);

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

  const renderSportTab = (sport: SportType) => {
    const sportSnapshot = getDernierSnapshotParSport(currentAthlete, sport);
    
    if (!sportSnapshot) {
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

    const vlamax = calculVLamaxSnapshot(sportSnapshot, currentAthlete.objectif);
    const tte = estimerTTESport(sportSnapshot);
    const confiance = scoreConfiance(sportSnapshot);
    const priorite = determinerPriorite(vlamax, tte, currentAthlete.objectif);
    const seances = seancesParSport(priorite, sport);

    return (
      <div className="space-y-4">
        {/* Métriques */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-3 w-3 text-primary" />
                <span className="text-xs text-muted-foreground">VLamax</span>
              </div>
              <p className="text-xl font-bold">{vlamax.toFixed(2)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-3 w-3 text-accent" />
                <span className="text-xs text-muted-foreground">TTE</span>
              </div>
              <p className="text-xl font-bold">{tte} min</p>
            </CardContent>
          </Card>

          {sport === "vélo" && sportSnapshot.ftp && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="h-3 w-3 text-warning" />
                  <span className="text-xs text-muted-foreground">FTP</span>
                </div>
                <p className="text-xl font-bold">{sportSnapshot.ftp}W</p>
                <p className="text-xs text-muted-foreground">
                  {(sportSnapshot.ftp / sportSnapshot.poids).toFixed(1)} W/kg
                </p>
              </CardContent>
            </Card>
          )}

          {sport === "course" && sportSnapshot.vma && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-3 w-3 text-warning" />
                  <span className="text-xs text-muted-foreground">VMA</span>
                </div>
                <p className="text-xl font-bold">{sportSnapshot.vma} km/h</p>
              </CardContent>
            </Card>
          )}

          {sport === "natation" && sportSnapshot.pace100 && (
            <Card>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-3 w-3 text-warning" />
                  <span className="text-xs text-muted-foreground">Pace 100m</span>
                </div>
                <p className="text-xl font-bold">{sportSnapshot.pace100}s</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-3 w-3" />
                <span className="text-xs text-muted-foreground">Confiance</span>
              </div>
              <p className="text-xl font-bold">{confiance}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Priorité */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Priorité</span>
              <Badge variant={getPrioriteColor(priorite) as any}>{priorite}</Badge>
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
              {seances.slice(0, 3).map((seance, i) => (
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

        {/* Texte explicatif */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Analyse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground space-y-1">
              {texte.split("\n").slice(0, 5).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-1 gap-2">
          <Button
            onClick={() => navigate("/semaine")}
            className="w-full justify-start gap-3 h-12"
            variant="outline"
          >
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm">Générer semaine type</span>
          </Button>

          <Button
            onClick={() => navigate("/bloc")}
            className="w-full justify-start gap-3 h-12"
            variant="outline"
          >
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="text-sm">Générer bloc 3 semaines</span>
          </Button>

          <Button
            onClick={() => navigate("/evolution")}
            className="w-full justify-start gap-3 h-12"
            variant="outline"
          >
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="text-sm">Voir évolution</span>
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
