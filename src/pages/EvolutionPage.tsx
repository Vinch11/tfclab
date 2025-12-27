// =============================================
// ÉCRAN 7 - ÉVOLUTION / COMPARAISON
// =============================================

import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertCircle, Calendar, Zap, Flame, Activity } from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";
import { comparerEvolution } from "@/lib/athleteStore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function EvolutionPage() {
  const navigate = useNavigate();
  const { currentAthlete } = useAthletes();

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

  const evolution = comparerEvolution(currentAthlete, currentAthlete.objectif);

  if (evolution.length === 0) {
    return (
      <AppLayout title="Évolution" showBack>
        <Card>
          <CardContent className="p-8 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Pas encore de données. Ajoutez des snapshots pour voir l'évolution.
            </p>
            <Button onClick={() => navigate("/snapshot")} className="mt-4">
              Ajouter des données
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  // Format dates for chart
  const chartData = evolution.map((e) => ({
    ...e,
    dateLabel: new Date(e.date).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "short",
    }),
  }));

  const latestData = evolution[evolution.length - 1];
  const previousData = evolution.length > 1 ? evolution[evolution.length - 2] : null;

  const getTrend = (current: number, previous: number | undefined) => {
    if (!previous) return null;
    const diff = current - previous;
    if (Math.abs(diff) < 0.01) return null;
    return diff > 0 ? "up" : "down";
  };

  return (
    <AppLayout title="Évolution" showBack>
      <div className="space-y-6 animate-fade-in">
        {/* Dernières valeurs */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <Zap className="h-4 w-4 text-primary mx-auto mb-1" />
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
              <Flame className="h-4 w-4 text-accent mx-auto mb-1" />
              <p className="text-lg font-bold">{latestData.ftp}W</p>
              <p className="text-[10px] text-muted-foreground">FTP</p>
              {previousData && getTrend(latestData.ftp, previousData.ftp) && (
                <Badge
                  variant={getTrend(latestData.ftp, previousData.ftp) === "up" ? "default" : "destructive"}
                  className="text-[10px] mt-1"
                >
                  {getTrend(latestData.ftp, previousData.ftp) === "up" ? "↑" : "↓"}
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 text-center">
              <Activity className="h-4 w-4 text-success mx-auto mb-1" />
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
        </div>

        {/* Graphique VLamax */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              VLamax
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
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
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="vlamax"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Graphique FTP */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Flame className="h-4 w-4 text-accent" />
              FTP (watts)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
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
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ftp"
                    stroke="hsl(var(--accent))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--accent))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Historique snapshots */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Historique
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {[...evolution].reverse().map((entry, i) => (
                <div key={i} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {new Date(entry.date).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Confiance: {entry.confiance}%
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p>VLamax: {entry.vlamax.toFixed(2)}</p>
                    <p className="text-muted-foreground">FTP: {entry.ftp}W</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
