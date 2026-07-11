// =============================================
// COMPARAISON MULTI-ATHLÈTES
// =============================================

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trophy, Zap, Target, Bike, PersonStanding, Waves } from "lucide-react";
import { Athlete, getDernierSnapshot } from "@/types/athlete";
import { getVlamaxForGoal } from "@/lib/vlamaxResolver";
import { calculerScoreGlobal, genererBadges } from "@/lib/iaRecommandations";
import { cn } from "@/lib/utils";

interface AthleteComparisonProps {
  athletes: Athlete[];
}

export function AthleteComparison({ athletes }: AthleteComparisonProps) {
  if (athletes.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Aucun athlète à comparer
        </CardContent>
      </Card>
    );
  }

  // Calculer les données pour chaque athlète
  const athletesData = athletes.map(athlete => {
    const snapshot = getDernierSnapshot(athlete);
    // AUDIT #6 — Résolveur sport-aware (CAP-estimator pour run/trail, vélo sinon)
    // au lieu du legacy calculVLamaxAvecConfiance qui n'a pas la chaîne CAP.
    const vlamax = snapshot ? (getVlamaxForGoal(snapshot as any, { goal: athlete.objectif }) ?? 0) : 0;
    const score = calculerScoreGlobal(athlete);
    const badges = genererBadges(athlete).filter(b => b.obtenu);
    
    return {
      athlete,
      vlamax,
      score,
      badges,
      snapshot
    };
  });

  // Trier par score global
  athletesData.sort((a, b) => b.score - a.score);

  const maxScore = Math.max(...athletesData.map(d => d.score), 1);
  const maxVlamax = Math.max(...athletesData.map(d => d.vlamax), 0.5);

  const getSportIcon = (sport: string) => {
    switch (sport) {
      case "vélo": return <Bike className="h-4 w-4" />;
      case "course": return <PersonStanding className="h-4 w-4" />;
      case "natation": return <Waves className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getRankColor = (index: number) => {
    if (index === 0) return "text-amber-500";
    if (index === 1) return "text-slate-400";
    if (index === 2) return "text-amber-700";
    return "text-muted-foreground";
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Comparaison Athlètes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {athletesData.map((data, index) => (
          <div
            key={data.athlete.id}
            className={cn(
              "p-4 rounded-lg border transition-all",
              index === 0 
                ? "bg-amber-500/10 border-amber-500/30" 
                : "bg-secondary/30 border-border/50"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className={cn("text-2xl font-bold", getRankColor(index))}>
                  {getRankIcon(index)}
                </span>
                <div>
                  <h3 className="font-semibold">{data.athlete.nom}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Target className="h-4 w-4" />
                    <span>{data.athlete.objectif}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{data.score}</p>
                <p className="text-xs text-muted-foreground">Score global</p>
              </div>
            </div>

            {/* Barres de progression */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-16">Score</span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500 rounded-full"
                    style={{ width: `${(data.score / maxScore) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono w-12 text-right">{data.score}/100</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-16">VLamax</span>
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-accent transition-all duration-500 rounded-full"
                    style={{ width: `${(data.vlamax / maxVlamax) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono w-12 text-right">{data.vlamax.toFixed(2)}</span>
              </div>
            </div>

            {/* Badges */}
            {data.badges.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {data.badges.slice(0, 4).map(badge => (
                  <Badge key={badge.id} variant="secondary" className="text-xs py-0.5">
                    {badge.icon} {badge.nom}
                  </Badge>
                ))}
                {data.badges.length > 4 && (
                  <Badge variant="outline" className="text-xs py-0.5">
                    +{data.badges.length - 4}
                  </Badge>
                )}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
