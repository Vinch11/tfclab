// =============================================
// ÉCRAN 7 - ÉVOLUTION MULTI-SPORT + DASHBOARD SCIENTIFIQUE
// =============================================

import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, AlertCircle, Calendar, Zap, Flame, Activity, Bike, PersonStanding, Waves, Target, BookOpen } from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";
import { calculVLamaxSnapshot, calculVLamaxAvecConfiance } from "@/engines/diagnostic";
import { estimerTTESport, scoreConfiance, SportType } from "@/types/snapshotNolio";
import { HistoricalChart } from "@/components/HistoricalChart";
import { ScientificDashboard } from "@/components/ScientificDashboard";
import { SortableSectionsContainer } from "@/components/SortableSectionsContainer";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function EvolutionPage() {
  const navigate = useNavigate();
  const { currentAthlete } = useAthletes();
  const [activeSport, setActiveSport] = useState<SportType>("vélo");

  if (!currentAthlete) {
    return (
      <AppLayout title="Évolution" showBack>
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

  // Filtrer par sport
  const getEvolutionBySport = (sport: SportType) => {
    const snapshots = currentAthlete.historique.filter(s => s.sport === sport);
    return snapshots.map(snapshot => ({
      date: snapshot.date,
      dateLabel: new Date(snapshot.date).toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "short",
      }),
      vlamax: calculVLamaxSnapshot(snapshot, currentAthlete.objectif),
      tte: estimerTTESport(snapshot),
      confiance: scoreConfiance(snapshot),
      // Sport-specific metrics
      ftp: snapshot.ftp,
      vma: snapshot.vma,
      pace100: snapshot.pace100,
    }));
  };

  const evolution = getEvolutionBySport(activeSport);

  const getSportIcon = (sport: SportType) => {
    switch (sport) {
      case "vélo": return <Bike className="h-4 w-4" />;
      case "course": return <PersonStanding className="h-4 w-4" />;
      case "natation": return <Waves className="h-4 w-4" />;
    }
  };

  const renderSportEvolution = useCallback(() => {
    if (evolution.length === 0) {
      return (
        <Card>
          <CardContent className="p-8 text-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Pas de données {activeSport}
            </p>
            <Button size="sm" onClick={() => navigate("/snapshot")}>
              Ajouter
            </Button>
          </CardContent>
        </Card>
      );
    }

    const latestData = evolution[evolution.length - 1];
    const previousData = evolution.length > 1 ? evolution[evolution.length - 2] : null;

    const getTrend = (current: number, previous: number | undefined) => {
      if (!previous) return null;
      const diff = current - previous;
      if (Math.abs(diff) < 0.01) return null;
      return diff > 0 ? "up" : "down";
    };

    return (
      <div className="space-y-4">
        {/* Dernières valeurs */}
        <div className="grid grid-cols-3 gap-2">
          <Card>
            <CardContent className="p-3 text-center">
              <Zap className="h-3 w-3 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold">{latestData.vlamax.toFixed(2)}</p>
              <p className="text-[10px] text-muted-foreground">VLamax</p>
              {previousData && getTrend(latestData.vlamax, previousData.vlamax) && (
                <Badge
                  variant={getTrend(latestData.vlamax, previousData.vlamax) === "down" ? "default" : "destructive"}
                  className="text-[10px] mt-1"
                >
                  {getTrend(latestData.vlamax, previousData.vlamax) === "down" ? "↓" : "↑"}
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 text-center">
              <Activity className="h-3 w-3 text-accent mx-auto mb-1" />
              <p className="text-lg font-bold">{latestData.tte}</p>
              <p className="text-[10px] text-muted-foreground">TTE (min)</p>
              {previousData && getTrend(latestData.tte, previousData.tte) && (
                <Badge
                  variant={getTrend(latestData.tte, previousData.tte) === "up" ? "default" : "destructive"}
                  className="text-[10px] mt-1"
                >
                  {getTrend(latestData.tte, previousData.tte) === "up" ? "↑" : "↓"}
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 text-center">
              <Target className="h-3 w-3 text-warning mx-auto mb-1" />
              {activeSport === "vélo" && latestData.ftp && (
                <>
                  <p className="text-lg font-bold">{latestData.ftp}W</p>
                  <p className="text-[10px] text-muted-foreground">FTP</p>
                </>
              )}
              {activeSport === "course" && latestData.vma && (
                <>
                  <p className="text-lg font-bold">{latestData.vma}</p>
                  <p className="text-[10px] text-muted-foreground">VMA</p>
                </>
              )}
              {activeSport === "natation" && latestData.pace100 && (
                <>
                  <p className="text-lg font-bold">{latestData.pace100}s</p>
                  <p className="text-[10px] text-muted-foreground">Pace 100m</p>
                </>
              )}
              {!latestData.ftp && !latestData.vma && !latestData.pace100 && (
                <>
                  <p className="text-lg font-bold">—</p>
                  <p className="text-[10px] text-muted-foreground">N/A</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Graphique VLamax */}
        {evolution.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-3 w-3 text-primary" />
                VLamax
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolution}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="dateLabel"
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tick={{ fontSize: 10 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        border: "1px solid hsl(var(--border))",
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="vlamax"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))", r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historique */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-3 w-3" />
              Historique {activeSport}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border max-h-64 overflow-y-auto">
              {[...evolution].reverse().map((entry, i) => (
                <div key={i} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {new Date(entry.date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Confiance: {entry.confiance}%
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p>VLamax: {entry.vlamax.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">TTE: {entry.tte} min</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }, [evolution, activeSport, navigate]);

  // Sections réorganisables pour l'onglet Evolution
  const evolutionSections = useMemo(() => [
    {
      id: "historical-chart",
      render: () => <HistoricalChart athlete={currentAthlete} />,
    },
    {
      id: "scientific-dashboard",
      render: () => (
        <ScientificDashboard 
          snapshots={currentAthlete.historique}
          objectif={currentAthlete.objectif}
          athleteNom={currentAthlete.nom}
        />
      ),
    },
    {
      id: "sport-analysis",
      render: () => (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Analyse détaillée par sport
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                {renderSportEvolution()}
              </TabsContent>
              <TabsContent value="course" className="mt-4">
                {renderSportEvolution()}
              </TabsContent>
              <TabsContent value="natation" className="mt-4">
                {renderSportEvolution()}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      ),
    },
  ], [currentAthlete, activeSport, renderSportEvolution]);

  return (
    <AppLayout title="Évolution" showBack>
      <div className="space-y-4 animate-fade-in">
        <SortableSectionsContainer
          tabId="evolution"
          tabLabel="Évolution"
          sections={evolutionSections}
        />

        {/* Bouton ajouter données */}
        <Button 
          onClick={() => navigate("/snapshot")} 
          className="w-full gap-2" 
          variant="outline"
        >
          Ajouter un snapshot
        </Button>
      </div>
    </AppLayout>
  );
}
