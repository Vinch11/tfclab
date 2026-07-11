import { computePotentielEffectif, type PotentielPhysiologiqueEffectif } from "@/lib/potentielPhysiologiqueEffectif";
import { mapSnapshotToV2 } from "@/lib/mapSnapshotToV2";
// =============================================
// FATIGUE COMPARISON CHART - Snapshot fatigue_state vs Calculée
// Modèle centré snapshot: compare l'état déclaré dans chaque snapshot
// avec la fatigue calculée objectivement (TSS, TTE, fraîcheur)
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
import { TrendingUp, TrendingDown, Minus, Activity, Battery } from "lucide-react";
import { format, subDays, parseISO, isAfter } from "date-fns";
import { fr } from "date-fns/locale";
import { DbSnapshot, DbTest } from "@/hooks/useCloudData";
import { computeFatigueEffectif, computeTTEEffectif, computeVLamaxEffectif } from "@/engines/diagnostic";
import {
  fatigueStateToScore100OrDefault,
  FATIGUE_STATE_LABELS,
} from "@/lib/fatigueStateMapping";

// F34: Use canonical mapping (1-10 ×10 → fresh=20, ok=40, fatigued=60, high=80, injured=100)
function fatigueStateToScore(state: string | null): number {
  return fatigueStateToScore100OrDefault(state);
}

interface FatigueComparisonChartProps {
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
  fatigueDeclaree: number | null;    // 0-100 (from fatigue_state)
  fatigueCalculee: number | null;    // 0-100
  ecart: number | null;
  stateLabel: string;
}

export function FatigueComparisonChart({
  activeSnapshot,
  athleteSnapshots,
  athleteTests,
  athleteId,
  athleteAge,
  objectif,
}: FatigueComparisonChartProps) {
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!athleteSnapshots || athleteSnapshots.length === 0) return [];

    // Trier par date croissante, limiter aux 12 derniers
    const sorted = [...athleteSnapshots]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-12);

    return sorted.map((snap) => {
      const fatigueDeclaree = fatigueStateToScore(snap.fatigue_state);

      // Calculer la fatigue objective pour ce snapshot
      let fatigueCalculee: number | null = null;

      const vlmx = computeVLamaxEffectif({
        athleteId,
        objectif,
        activeSnapshotId: snap.id,
        tests: athleteTests.map(t => ({
          athlete_id: t.athlete_id,
          vlamax: t.vlamax,
          date: t.date,
          type: t.type,
          name: t.name,
        })),
        snapshots: athleteSnapshots.map(mapSnapshotToV2),
      });

      const tte = computeTTEEffectif({
        ftp: snap.ftp,
        tss_7d: snap.tss_7d,
        tte_mode: snap.tte_mode,
        tte_observed_min: snap.tte_observed_min,
        tte_observed_min_run: (snap as any).tte_observed_min_run ?? null,
        objectif,
      });

      const rr = computePotentielEffectif({
        objectif,
        vlamaxEffectif: vlmx,
        tteEffectif: tte,
        ftp: snap.ftp ?? null,
        poids: snap.weight_kg ?? null,
        fatigue_ok: true,
        seance_specifique_validee: false,
      });

      const fatigueResult = computeFatigueEffectif({
        tss7d: snap.tss_7d,
        tss7dHabituel: null,
        fatiguePercue: null, // Sans subjectif pour la valeur calculée pure
        tteEffectif: tte,
        potentielPhysiologique: rr,
        vlamaxEffectif: vlmx,
        age: athleteAge,
        objectif,
      });

      fatigueCalculee = fatigueResult.score;

      const ecart =
        fatigueDeclaree != null && fatigueCalculee != null
          ? fatigueDeclaree - fatigueCalculee
          : null;

      return {
        date: snap.date,
        dateLabel: format(parseISO(snap.date), "d MMM", { locale: fr }),
        fatigueDeclaree,
        fatigueCalculee,
        ecart,
        stateLabel: FATIGUE_STATE_LABELS[snap.fatigue_state || "ok"] || "Normal",
      };
    });
  }, [athleteSnapshots, athleteTests, athleteId, athleteAge, objectif]);

  // Stats
  const stats = useMemo(() => {
    const validPoints = chartData.filter(
      (p) => p.fatigueDeclaree != null && p.fatigueCalculee != null
    );
    if (validPoints.length < 2) return null;

    const ecarts = validPoints.map((p) => p.ecart!);
    const avgEcart = Math.round(ecarts.reduce((a, b) => a + b, 0) / ecarts.length);
    const maxEcart = Math.max(...ecarts.map(Math.abs));

    const first = validPoints[0];
    const last = validPoints[validPoints.length - 1];
    const tendanceDeclaree = (last.fatigueDeclaree ?? 0) - (first.fatigueDeclaree ?? 0);
    const tendanceCalculee = (last.fatigueCalculee ?? 0) - (first.fatigueCalculee ?? 0);

    return { avgEcart, maxEcart, tendanceDeclaree, tendanceCalculee, nbPoints: validPoints.length };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-5 w-5" />
            Fatigue déclarée vs calculée
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Battery className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucun snapshot avec état de forme enregistré.</p>
            <p className="text-sm">
              L'état de forme (frais/normal/fatigué/...) est capturé lors de chaque profil physiologique.
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
            Fatigue déclarée vs calculée
          </CardTitle>
          {stats && (
            <Badge variant={Math.abs(stats.avgEcart) > 15 ? "destructive" : "secondary"}>
              Écart moyen: {stats.avgEcart > 0 ? "+" : ""}{stats.avgEcart}%
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Compare l'état de forme déclaré (snapshot) avec la fatigue calculée (TSS, TTE, fraîcheur).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="dateLabel" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} className="text-muted-foreground" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const data = payload[0]?.payload as ChartDataPoint;
                  return (
                    <div className="bg-popover border border-border p-3 rounded-lg shadow-lg">
                      <p className="font-medium mb-2">{label}</p>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-orange-500" />
                          <span>Déclarée: {data.stateLabel} ({data.fatigueDeclaree}%)</span>
                        </div>
                        {data.fatigueCalculee != null && (
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span>Calculée: {data.fatigueCalculee}%</span>
                          </div>
                        )}
                        {data.ecart != null && (
                          <div className="text-muted-foreground pt-1 border-t border-border mt-1">
                            Écart: {data.ecart > 0 ? "+" : ""}{data.ecart}%
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              <Legend formatter={(value) => value === "fatigueDeclaree" ? "Déclarée (snapshot)" : "Calculée (objectif)"} />
              <ReferenceLine y={50} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
              <Line type="monotone" dataKey="fatigueDeclaree" stroke="#f97316" strokeWidth={2} dot={{ fill: "#f97316", strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} connectNulls name="fatigueDeclaree" />
              <Line type="monotone" dataKey="fatigueCalculee" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", strokeWidth: 0, r: 4 }} activeDot={{ r: 6 }} connectNulls name="fatigueCalculee" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Tendance déclarée</div>
              <div className="flex items-center justify-center gap-1">
                {getTrendIcon(stats.tendanceDeclaree)}
                <span className="font-medium">{stats.tendanceDeclaree > 0 ? "+" : ""}{stats.tendanceDeclaree}%</span>
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Tendance calculée</div>
              <div className="flex items-center justify-center gap-1">
                {getTrendIcon(stats.tendanceCalculee)}
                <span className="font-medium">{stats.tendanceCalculee > 0 ? "+" : ""}{stats.tendanceCalculee}%</span>
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Écart max</div>
              <span className="font-medium">{stats.maxEcart}%</span>
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1">Snapshots</div>
              <span className="font-medium">{stats.nbPoints}</span>
            </div>
          </div>
        )}

        {stats && Math.abs(stats.avgEcart) > 15 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <p className="text-sm">
              <strong>⚠️ Désaccord ressenti/charge:</strong>{" "}
              {stats.avgEcart > 0
                ? "L'athlète se déclare plus fatigué que les données objectives. Vérifier stress externe, sommeil, ou surentraînement latent."
                : "L'athlète se déclare moins fatigué que prévu. Potentiel de charge supplémentaire ou métriques sous-estimées."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
