// =============================================
// COMPOSANT DASHBOARD PHASE 3 - IA & GAMIFICATION
// =============================================

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bike, Footprints, Waves, Brain, AlertTriangle, Trophy, Target, Sparkles } from "lucide-react";
import { Athlete } from "@/types/athlete";
import {
  genererRecommandationsIA,
  verifierAlertes,
  calculerScoreGlobal,
  genererBadges,
  getNiveauPerformance,
  Recommendation,
  Alert,
} from "@/lib/iaRecommandations";
import { SportType } from "@/types/snapshotNolio";
import { cn } from "@/lib/utils";

interface Phase3DashboardProps {
  athlete: Athlete;
}

const sportIcons: Record<SportType, React.ReactNode> = {
  vélo: <Bike className="h-4 w-4" />,
  course: <Footprints className="h-4 w-4" />,
  natation: <Waves className="h-4 w-4" />,
};

export function Phase3Dashboard({ athlete }: Phase3DashboardProps) {
  const recommendations = genererRecommandationsIA(athlete);
  const alertes = verifierAlertes(athlete);
  const scoreGlobal = calculerScoreGlobal(athlete);
  const badges = genererBadges(athlete);
  const niveau = getNiveauPerformance(scoreGlobal);

  const badgesObtenus = badges.filter((b) => b.obtenu);

  return (
    <div className="space-y-4">
      {/* Score Global & Niveau */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span className="font-medium">Score Global</span>
            </div>
            <Badge variant="outline" className={cn("text-sm", niveau.couleur)}>
              {niveau.icon} {niveau.niveau}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-4xl font-bold">{scoreGlobal}</span>
            <div className="flex-1">
              <Progress value={scoreGlobal} className="h-3" />
              <p className="text-xs text-muted-foreground mt-1">sur 100 points</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Badges */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Badges obtenus
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {badgesObtenus.map((badge) => (
              <Badge
                key={badge.id}
                variant="secondary"
                className="py-1.5 px-3 text-sm"
              >
                <span className="mr-1">{badge.icon}</span>
                {badge.nom}
              </Badge>
            ))}
            {badgesObtenus.length === 0 && (
              <p className="text-sm text-muted-foreground">Aucun badge obtenu</p>
            )}
          </div>
          {/* Badges non obtenus */}
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-2">Prochains objectifs :</p>
            <div className="flex flex-wrap gap-2">
              {badges
                .filter((b) => !b.obtenu)
                .slice(0, 3)
                .map((badge) => (
                  <Badge
                    key={badge.id}
                    variant="outline"
                    className="py-1 px-2 text-xs opacity-50"
                  >
                    {badge.icon} {badge.nom}
                  </Badge>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertes Intelligentes */}
      {alertes.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-warning">
              <AlertTriangle className="h-4 w-4" />
              Alertes ({alertes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertes.map((alerte, idx) => (
                <AlertRow key={idx} alerte={alerte} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommandations IA */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Recommandations IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.map((rec, idx) => (
              <RecommendationRow key={idx} recommendation={rec} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Alert Row Component
function AlertRow({ alerte }: { alerte: Alert }) {
  const typeStyles = {
    danger: "bg-destructive/10 border-destructive/30 text-destructive",
    warning: "bg-warning/10 border-warning/30 text-warning",
    info: "bg-primary/10 border-primary/30 text-primary",
  };

  return (
    <div
      className={cn(
        "p-3 rounded-lg border flex items-start gap-3",
        typeStyles[alerte.type]
      )}
    >
      <span className="text-lg">{alerte.icon}</span>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          {sportIcons[alerte.sport]}
          <span className="font-medium text-sm capitalize">{alerte.sport}</span>
        </div>
        <p className="text-sm">{alerte.message}</p>
      </div>
    </div>
  );
}

// Recommendation Row Component
function RecommendationRow({ recommendation }: { recommendation: Recommendation }) {
  const urgenceStyles = {
    haute: "bg-destructive/10 border-destructive/30",
    moyenne: "bg-warning/10 border-warning/30",
    basse: "bg-muted/50 border-border/50",
  };

  const urgenceBadge = {
    haute: "destructive",
    moyenne: "secondary",
    basse: "outline",
  };

  return (
    <div
      className={cn(
        "p-3 rounded-lg border flex items-start gap-3",
        urgenceStyles[recommendation.urgence]
      )}
    >
      <span className="text-lg">{recommendation.icon}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {sportIcons[recommendation.sport]}
            <span className="font-medium text-sm capitalize">{recommendation.sport}</span>
          </div>
          <Badge variant={urgenceBadge[recommendation.urgence] as any} className="text-xs">
            {recommendation.urgence}
          </Badge>
        </div>
        <p className="text-sm text-foreground">{recommendation.action}</p>
        <p className="text-xs text-muted-foreground mt-1">
          Priorité : {recommendation.priorite}
        </p>
      </div>
    </div>
  );
}
