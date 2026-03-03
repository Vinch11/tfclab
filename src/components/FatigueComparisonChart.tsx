// =============================================
// FATIGUE COMPARISON CHART - Perçue vs Calculée (4 semaines)
// =============================================

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Activity, Brain } from "lucide-react";
import { format, subDays, parseISO, isAfter } from "date-fns";
import { fr } from "date-fns/locale";
import { DbCheckin, DbSnapshot, DbTest } from "@/hooks/useCloudData";
import { computeFatigueEffectif } from "@/lib/fatigueEffectif";
import { computeTTEEffectif, TTEEffectif } from "@/lib/tteEffectif";
import { computeRaceReadinessEffectif, RaceReadinessEffectif } from "@/lib/raceReadinessEffectif";
import { computeVLamaxEffectif, VLamaxEffectif } from "@/lib/vlamaxEffectif";

interface FatigueComparisonChartProps {
  checkins: DbCheckin[];
  activeSnapshot: DbSnapshot | null;
  athleteSnapshots: DbSnapshot[];
  athleteTests: DbTest[];
  athleteId: string;
  athleteAge?: number | null;
  objectif: string;
}

interface ChartDataPoint {
  date: string;
  dateLabel: string;
  fatiguePercue: number | null;      // 0-100 (scaled from 1-10)
  fatigueCalculee: number | null;    // 0-100
  ecart: number | null;              // Différence
}

// Convertit la fatigue perçue (1-10) en score 0-100
function scaleFatiguePercue(value: number | null): number | null {
  if (value == null) return null;
  // 1 = frais (0%), 10 = épuisé (100%)
  return Math.round(((value - 1) / 9) * 100);
}

export function FatigueComparisonChart({
  checkins,
  activeSnapshot,
  athleteSnapshots,
  athleteTests,
  athleteId,
  athleteAge,
  objectif,
}: FatigueComparisonChartProps) {
  // Pré-calculer VLamax et TTE effectif une seule fois
  const { vlamaxEffectif, tteEffectif, raceReadiness } = useMemo(() => {
    if (!activeSnapshot) {
      return { vlamaxEffectif: null, tteEffectif: null, raceReadiness: null };
    }

    const vlmx = computeVLamaxEffectif({
      athleteId,
      objectif,
      activeSnapshotId: activeSnapshot.id,
      tests: athleteTests.map(t => ({
        athlete_id: t.athlete_id,
        vlamax: t.vlamax,
        date: t.date,
        type: t.type,
        name: t.name,
      })),
      snapshots: athleteSnapshots.map(s => ({
        id: s.id,
        athlete_id: s.athlete_id,
        date: s.date,
        vlamax: s.vlamax,
        ftp: s.ftp,
        pmax_5s: s.pmax_5s,
        weight_kg: s.weight_kg,
      })),
    });

    const tte = computeTTEEffectif({
      ftp: activeSnapshot.ftp,
      tss_7d: activeSnapshot.tss_7d,
      tte_mode: activeSnapshot.tte_mode,
      tte_observed_min: activeSnapshot.tte_observed_min,
      objectif,
    });

    const rr = computeRaceReadinessEffectif({
      objectif,
      vlamaxEffectif: vlmx,
      tteEffectif: tte,
      ftp: activeSnapshot.ftp ?? null,
      poids: activeSnapshot.weight_kg ?? null,
      fatigue_ok: true,
      seance_specifique_validee: false,
      tss7d: activeSnapshot.tss_7d ?? null,
    });

    return { vlamaxEffectif: vlmx, tteEffectif: tte, raceReadiness: rr };
  }, [activeSnapshot, athleteSnapshots, athleteTests, athleteId, objectif]);

  const chartData = useMemo<ChartDataPoint[]>(() => {
    const fourWeeksAgo = subDays(new Date(), 28);

    // Filtrer les check-ins des 4 dernières semaines
    const recentCheckins = checkins
      .filter((c) => {
        const checkinDate = parseISO(c.date_iso);
        return isAfter(checkinDate, fourWeeksAgo);
      })
      .sort((a, b) => a.date_iso.localeCompare(b.date_iso));

    if (recentCheckins.length === 0 || !tteEffectif || !raceReadiness) return [];

    // Pour chaque check-in, calculer fatigue perçue et calculée
    return recentCheckins.map((checkin) => {
      const fatiguePercueRaw = checkin.fatigue;
      const fatiguePercueScaled = scaleFatiguePercue(fatiguePercueRaw);

      // Calcul de la fatigue effectif avec les données du snapshot actif
      let fatigueCalculee: number | null = null;

      if (activeSnapshot && tteEffectif && raceReadiness) {
        // Pour le graphique, on veut la fatigue "objective" sans la fatigue perçue
        const fatigueResultObjective = computeFatigueEffectif({
          tss7d: activeSnapshot.tss_7d,
          tss7dHabituel: null,
          fatiguePercue: null, // Sans fatigue perçue pour avoir la valeur calculée pure
          tteEffectif,
          raceReadiness,
          vlamaxEffectif,
          age: athleteAge,
          objectif,
        });

        fatigueCalculee = fatigueResultObjective.score;
      }

      const ecart =
        fatiguePercueScaled != null && fatigueCalculee != null
          ? fatiguePercueScaled - fatigueCalculee
          : null;

      return {
        date: checkin.date_iso,
        dateLabel: format(parseISO(checkin.date_iso), "d MMM", { locale: fr }),
        fatiguePercue: fatiguePercueScaled,
        fatigueCalculee,
        ecart,
      };
    });
  }, [checkins, activeSnapshot, tteEffectif, raceReadiness, vlamaxEffectif, athleteAge, objectif]);

  // Calcul des statistiques
  const stats = useMemo(() => {
    const validPoints = chartData.filter(
      (p) => p.fatiguePercue != null && p.fatigueCalculee != null
    );

    if (validPoints.length < 2) return null;

    const ecarts = validPoints.map((p) => p.ecart!);
    const avgEcart = Math.round(ecarts.reduce((a, b) => a + b, 0) / ecarts.length);
    const maxEcart = Math.max(...ecarts.map(Math.abs));

    // Tendance: compare première et dernière valeur
    const first = validPoints[0];
    const last = validPoints[validPoints.length - 1];
    const tendancePercue = (last.fatiguePercue ?? 0) - (first.fatiguePercue ?? 0);
    const tendanceCalculee = (last.fatigueCalculee ?? 0) - (first.fatigueCalculee ?? 0);

    return {
      avgEcart,
      maxEcart,
      tendancePercue,
      tendanceCalculee,
      nbPoints: validPoints.length,
    };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5" />
            Fatigue perçue vs calculée
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun check-in sur les 4 dernières semaines.</p>
            <p className="text-sm">
              Ajoute des check-ins avec la fatigue perçue pour voir l'évolution.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = (value: number) => {
    if (value > 5) return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (value < -5) return <TrendingDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5" />
            Fatigue perçue vs calculée (4 sem.)
          </CardTitle>
          {stats && (
            <div className="flex items-center gap-2">
              <Badge variant={Math.abs(stats.avgEcart) > 15 ? "destructive" : "secondary"}>
                Écart moyen: {stats.avgEcart > 0 ? "+" : ""}
                {stats.avgEcart}%
              </Badge>
            </div>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Compare le ressenti subjectif (1-10 → %) avec la fatigue calculée (TSS, TTE, fraîcheur).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Graphique */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${v}%`}
                className="text-muted-foreground"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const data = payload[0]?.payload as ChartDataPoint;
                  return (
                    <div className="bg-popover border border-border p-3 rounded-lg shadow-lg">
                      <p className="font-medium mb-2">{label}</p>
                      <div className="space-y-1 text-sm">
                        {data.fatiguePercue != null && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500" />
                            <span>Perçue: {data.fatiguePercue}%</span>
                          </div>
                        )}
                        {data.fatigueCalculee != null && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span>Calculée: {data.fatigueCalculee}%</span>
                          </div>
                        )}
                        {data.ecart != null && (
                          <div className="text-muted-foreground pt-1 border-t border-border mt-1">
                            Écart: {data.ecart > 0 ? "+" : ""}
                            {data.ecart}%
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                formatter={(value) =>
                  value === "fatiguePercue" ? "Perçue (subjectif)" : "Calculée (objectif)"
                }
              />
              <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
              <Line
                type="monotone"
                dataKey="fatiguePercue"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ fill: "#f97316", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
                name="fatiguePercue"
              />
              <Line
                type="monotone"
                dataKey="fatigueCalculee"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
                name="fatigueCalculee"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Statistiques & Interprétation */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Tendance perçue</div>
              <div className="flex items-center justify-center gap-1">
                {getTrendIcon(stats.tendancePercue)}
                <span className="font-medium">
                  {stats.tendancePercue > 0 ? "+" : ""}
                  {stats.tendancePercue}%
                </span>
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Tendance calculée</div>
              <div className="flex items-center justify-center gap-1">
                {getTrendIcon(stats.tendanceCalculee)}
                <span className="font-medium">
                  {stats.tendanceCalculee > 0 ? "+" : ""}
                  {stats.tendanceCalculee}%
                </span>
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Écart max</div>
              <span className="font-medium">{stats.maxEcart}%</span>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Points</div>
              <span className="font-medium">{stats.nbPoints}</span>
            </div>
          </div>
        )}

        {/* Interprétation */}
        {stats && Math.abs(stats.avgEcart) > 15 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <p className="text-sm">
              <strong>⚠️ Désaccord ressenti/charge:</strong>{" "}
              {stats.avgEcart > 0
                ? "L'athlète se sent plus fatigué que ce que les données objectives suggèrent. Vérifier stress externe, sommeil, ou surentraînement latent."
                : "L'athlète se sent moins fatigué que prévu. Potentiel de charge supplémentaire ou métriques de charge sous-estimées."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
