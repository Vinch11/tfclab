// =============================================
// ÉCRAN 4 - DASHBOARD ATHLÈTE
// =============================================

import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Zap, 
  Flame, 
  Activity, 
  Target, 
  Calendar, 
  CalendarDays, 
  TrendingUp,
  Plus,
  AlertCircle
} from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";
import { getDernierSnapshot } from "@/types/athlete";
import { estimerTTE, scoreConfiance } from "@/types/snapshotNolio";
import { calculVLamaxSnapshot } from "@/lib/athleteStore";
import { calculRaceReadiness, texteExplicatifAthlete } from "@/lib/raceReadiness";
import { determinerPriorite } from "@/types/seances";

export default function DashboardPage() {
  const navigate = useNavigate();
  const { currentAthlete } = useAthletes();

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
              Aucune donnée pour {currentAthlete.nom}. Ajoutez un snapshot NOLIO.
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

  // Calculs
  const vlamax = calculVLamaxSnapshot(snapshot, currentAthlete.objectif);
  const tte = estimerTTE(snapshot.ftp, snapshot.tss_7j);
  const ftp_kg = snapshot.ftp / snapshot.poids;
  const confiance = scoreConfiance(snapshot);
  const priorite = determinerPriorite(vlamax, tte, currentAthlete.objectif);
  const readiness = calculRaceReadiness(currentAthlete);
  const texte = texteExplicatifAthlete(currentAthlete);

  const getPrioriteColor = (p: string) => {
    switch (p) {
      case "Réduire VLamax": return "destructive";
      case "Augmenter TTE": return "warning";
      default: return "success";
    }
  };

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6 animate-fade-in">
        {/* Métriques principales */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground">VLamax</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{vlamax.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">mmol/L/s</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-accent/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Flame className="h-4 w-4 text-accent" />
                <span className="text-xs text-muted-foreground">FTP</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{snapshot.ftp}W</p>
              <p className="text-xs text-muted-foreground">{ftp_kg.toFixed(1)} W/kg</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-4 w-4 text-success" />
                <span className="text-xs text-muted-foreground">TTE</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{tte}</p>
              <p className="text-xs text-muted-foreground">minutes</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-warning" />
                <span className="text-xs text-muted-foreground">VO2max</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {snapshot.vo2max || "—"}
              </p>
              <p className="text-xs text-muted-foreground">ml/kg/min</p>
            </CardContent>
          </Card>
        </div>

        {/* Race Readiness */}
        {readiness && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Race Readiness</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-foreground">
                  {readiness.score}%
                </span>
                <Badge variant={readiness.color as any}>{readiness.label}</Badge>
              </div>
              <Progress value={readiness.score} className="h-3" />
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">VLamax</p>
                  <p className="font-semibold">{readiness.details.vlamax}/25</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">TTE</p>
                  <p className="font-semibold">{readiness.details.endurance}/25</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">FTP</p>
                  <p className="font-semibold">{readiness.details.puissance}/25</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">HRV</p>
                  <p className="font-semibold">{readiness.details.fraicheur}/25</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Priorité */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Priorité Coaching</p>
                <p className="text-lg font-semibold text-foreground">{priorite}</p>
              </div>
              <Badge variant={getPrioriteColor(priorite) as any} className="text-sm">
                {confiance}% confiance
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Texte explicatif */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Analyse</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {texte.split("\n").map((line, i) => (
                <p key={i} className="text-sm text-muted-foreground mb-2">
                  {line}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-1 gap-3">
          <Button
            onClick={() => navigate("/semaine")}
            className="w-full justify-start gap-3 h-14"
            variant="outline"
          >
            <Calendar className="h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="font-medium">Générer semaine type</p>
              <p className="text-xs text-muted-foreground">Plan hebdomadaire personnalisé</p>
            </div>
          </Button>

          <Button
            onClick={() => navigate("/bloc")}
            className="w-full justify-start gap-3 h-14"
            variant="outline"
          >
            <CalendarDays className="h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="font-medium">Générer bloc 3 semaines</p>
              <p className="text-xs text-muted-foreground">Cycle progressif + récupération</p>
            </div>
          </Button>

          <Button
            onClick={() => navigate("/evolution")}
            className="w-full justify-start gap-3 h-14"
            variant="outline"
          >
            <TrendingUp className="h-5 w-5 text-primary" />
            <div className="text-left">
              <p className="font-medium">Voir évolution</p>
              <p className="text-xs text-muted-foreground">Historique et graphiques</p>
            </div>
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
