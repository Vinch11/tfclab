// =============================================
// DASHBOARD SCIENTIFIQUE - Contenu Multi-Sport
// =============================================

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bike, Footprints, Waves, BookOpen, Zap, Heart, Timer, Target } from "lucide-react";
import { SnapshotNolio, SportType, estimerTTESport } from "@/types/snapshotNolio";
import { calculVLamaxAvecConfiance } from "@/lib/athleteStore";
import { seancesParSport, determinerPriorite, Seance } from "@/types/seances";
import { ObjectifType } from "@/types/athlete";

interface ScientificDashboardProps {
  snapshots: SnapshotNolio[];
  objectif: ObjectifType;
  athleteNom: string;
}

interface SportData {
  sport: SportType;
  snapshot: SnapshotNolio;
  vlamax: number;
  precision: number;
  confiance: number;
  tte: number;
  vo2max: number;
  priorite: string;
  seances: Seance[];
}

const sportIcons: Record<SportType, React.ReactNode> = {
  vélo: <Bike className="h-5 w-5" />,
  course: <Footprints className="h-5 w-5" />,
  natation: <Waves className="h-5 w-5" />,
};

const sportLabels: Record<SportType, string> = {
  vélo: "Vélo",
  course: "Course",
  natation: "Natation",
};

export function ScientificDashboard({ snapshots, objectif, athleteNom }: ScientificDashboardProps) {
  // Get latest snapshot per sport
  const getSportData = (): SportData[] => {
    const sports: SportType[] = ["vélo", "course", "natation"];
    const data: SportData[] = [];

    for (const sport of sports) {
      const snapshot = snapshots.filter((s) => s.sport === sport).slice(-1)[0];
      if (snapshot) {
        const calc = calculVLamaxAvecConfiance(snapshot, objectif);
        const tte = estimerTTESport(snapshot);
        const priorite = determinerPriorite(calc.vlamax, tte, objectif);
        const seances = seancesParSport(priorite, sport);

        data.push({
          sport,
          snapshot,
          vlamax: calc.vlamax,
          precision: calc.precision,
          confiance: calc.confiance,
          tte,
          vo2max: snapshot.vo2max || 0,
          priorite,
          seances,
        });
      }
    }
    return data;
  };

  const sportsData = getSportData();

  if (sportsData.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-6 text-center text-muted-foreground">
          Aucun snapshot disponible pour l&apos;analyse scientifique.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          Dashboard Scientifique – {athleteNom}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={sportsData[0]?.sport} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            {sportsData.map((data) => (
              <TabsTrigger
                key={data.sport}
                value={data.sport}
                className="flex items-center gap-2"
              >
                {sportIcons[data.sport]}
                {sportLabels[data.sport]}
              </TabsTrigger>
            ))}
          </TabsList>

          {sportsData.map((data) => (
            <TabsContent key={data.sport} value={data.sport} className="space-y-6">
              {/* Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                  icon={<Zap className="h-5 w-5" />}
                  label="VLamax"
                  value={`${data.vlamax}`}
                  unit={`±${data.precision}%`}
                  progress={data.vlamax * 100}
                  color="bg-amber-500"
                />
                <MetricCard
                  icon={<Heart className="h-5 w-5" />}
                  label="VO2max"
                  value={data.vo2max > 0 ? `${data.vo2max}` : "N/A"}
                  unit="ml/min/kg"
                  progress={data.vo2max > 0 ? (data.vo2max / 80) * 100 : 0}
                  color="bg-rose-500"
                />
                <MetricCard
                  icon={<Timer className="h-5 w-5" />}
                  label="TTE estimé"
                  value={`${data.tte}`}
                  unit="min"
                  progress={(data.tte / 90) * 100}
                  color="bg-emerald-500"
                />
              </div>

              {/* Scientific Explanations */}
              <Card className="bg-muted/30 border-border/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                    🔬 Explications scientifiques
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {data.sport === "vélo" || data.sport === "course" ? (
                    <>
                      <p><strong>VLamax</strong> : Vitesse maximale de production de lactate. Influence la puissance anaérobie.</p>
                      <p><strong>VO2max</strong> : Capacité maximale d&apos;absorption d&apos;oxygène. Détermine l&apos;endurance aérobie.</p>
                      <p><strong>TTE</strong> : Durée maximale à intensité donnée. Sert à planifier durée des séances.</p>
                      <p><strong>Seuil lactique</strong> : Intensité où le lactate s&apos;accumule rapidement.</p>
                    </>
                  ) : (
                    <>
                      <p><strong>Pace 100m</strong> : Temps pour 100m, estimation de capacité anaérobie et endurance.</p>
                      <p><strong>CSS</strong> : Critical Swim Speed, équivalent du seuil lactique en natation.</p>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Visual Bars */}
              <Card className="bg-muted/30 border-border/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                    📊 Visualisation des métriques
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <MetricBar label="VLamax" value={data.vlamax * 100} max={100} color="bg-amber-500" />
                  <MetricBar label="TTE" value={(data.tte / 90) * 100} max={100} color="bg-emerald-500" />
                  <MetricBar label="VO2max" value={data.vo2max > 0 ? (data.vo2max / 80) * 100 : 0} max={100} color="bg-rose-500" />
                </CardContent>
              </Card>

              {/* Session Recommendations */}
              <Card className="bg-muted/30 border-border/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                    <Target className="h-4 w-4" />
                    Lien théorie → séances ({data.priorite})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.seances.slice(0, 3).map((seance) => (
                      <div key={seance.code} className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                        <Badge variant="outline" className="font-mono">
                          {seance.code}
                        </Badge>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{seance.nom}</p>
                          <p className="text-xs text-muted-foreground">
                            {seance.objectif} • {seance.intensite}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Scientific Sources */}
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-3 w-3" />
                Sources scientifiques : Two For Coaching Lab™ (inspiré Mader, Heck, Seiler, Coyle)
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

// Metric Card Component
function MetricCard({
  icon,
  label,
  value,
  unit,
  progress,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit: string;
  progress: number;
  color: string;
}) {
  return (
    <Card className="bg-muted/30 border-border/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          {icon}
          <span className="text-sm">{label}</span>
        </div>
        <div className="flex items-baseline gap-1 sm:gap-2">
          <span className="font-display font-semibold text-2xl sm:text-4xl tracking-tight tabular-nums">{value}</span>
          <span className="text-muted-foreground text-xs sm:text-sm">{unit}</span>
        </div>
        <Progress value={Math.min(progress, 100)} className="h-1.5 mt-2" />
      </CardContent>
    </Card>
  );
}

// Metric Bar Component
function MetricBar({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{Math.round(percentage)}%</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${color} transition-all duration-500 rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
