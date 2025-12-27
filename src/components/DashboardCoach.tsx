import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  Target,
  Dumbbell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ResultatVLamax } from "@/types/resultatVLamax";
import {
  ReglesDanLorangResult,
  getSeancesRecommandees,
  getSeancesSpecifiques,
  PrioriteType,
} from "@/types/reglesDanLorang";
import { TestMetabolique } from "@/types/testMetabolique";
import { Athlete } from "@/types/athlete";

interface DashboardCoachProps {
  athlete: Athlete;
  resultat: ResultatVLamax;
  regles: ReglesDanLorangResult;
  testsHistorique: TestMetabolique[];
  tte: number;
  ftp_kg: number;
  seance_specifique_validee: boolean;
  fatigue_ok: boolean;
}

interface ChecklistItem {
  label: string;
  checked: boolean;
}

export function DashboardCoach({
  athlete,
  resultat,
  regles,
  testsHistorique,
  tte,
  ftp_kg,
  seance_specifique_validee,
  fatigue_ok,
}: DashboardCoachProps) {
  // 1. Graphique VLamax - historique
  const graphiqueData = useMemo(() => {
    if (testsHistorique.length === 0) {
      return [{ date: "Actuel", vlamax: resultat.vlamax }];
    }
    return testsHistorique
      .slice()
      .reverse()
      .map((test, idx) => ({
        date: test.date || `Test ${idx + 1}`,
        vlamax: test.pmax_5s && test.cp && athlete.poids
          ? 0.25 + ((0.4 * (test.pmax_5s / athlete.poids)) + 
              (0.35 * (((test.pmax_5s - test.cp) * 6) / athlete.poids)) - 
              (0.25 * (test.cp / athlete.poids)) - 
              (0.3 * ((test.tte || 2400) / 40))) * 0.45
          : resultat.vlamax,
      }))
      .map((d) => ({
        ...d,
        vlamax: Math.max(0.25, Math.min(1.0, d.vlamax)),
      }));
  }, [testsHistorique, resultat.vlamax, athlete.poids]);

  // 2. Alertes coach
  const alertes = regles.alertes.length > 0 ? regles.alertes : ["Tout OK"];

  // 3. Séances recommandées
  const seancesRecommandees = getSeancesRecommandees(regles.priorite);
  const seancesSpecifiques = getSeancesSpecifiques(athlete.objectif);
  const tableauSeances = [
    ...seancesRecommandees,
    ...seancesSpecifiques,
  ];

  // 4. Checklist Race Ready
  const tteTarget = athlete.objectif === "IM" ? 55 : 45;
  const ftpTarget = athlete.objectif === "IM" ? 4.6 : 4.8;

  const checklist: ChecklistItem[] = [
    {
      label: "VLamax dans cible (0.25-0.45)",
      checked: resultat.vlamax >= 0.25 && resultat.vlamax <= 0.45,
    },
    {
      label: `TTE OK (≥${tteTarget} min)`,
      checked: tte >= tteTarget,
    },
    {
      label: `FTP stable (≥${ftpTarget} W/kg)`,
      checked: regles.priorite !== "FTP_UTIL" && ftp_kg >= ftpTarget,
    },
    {
      label: "Séance spécifique validée",
      checked: seance_specifique_validee,
    },
    {
      label: "Fatigue OK",
      checked: fatigue_ok,
    },
  ];

  const checklistScore = checklist.filter((item) => item.checked).length;
  const isRaceReady = checklistScore === checklist.length;

  return (
    <div className="glass-card p-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 rounded-xl bg-primary/10 text-primary">
          <Activity className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">Dashboard Coach</h2>
          <p className="text-sm text-muted-foreground">
            Vue d'ensemble pour l'entraîneur
          </p>
        </div>
      </div>

      {/* Layout Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Graphique VLamax */}
        <div className="p-4 rounded-xl bg-secondary/30 border border-border">
          <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Évolution VLamax
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={graphiqueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis
                  domain={[0.2, 0.6]}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [value.toFixed(3), "VLamax"]}
                />
                <ReferenceLine
                  y={0.45}
                  stroke="hsl(var(--warning))"
                  strokeDasharray="5 5"
                  label={{ value: "Max", fontSize: 10, fill: "hsl(var(--warning))" }}
                />
                <ReferenceLine
                  y={0.25}
                  stroke="hsl(var(--success))"
                  strokeDasharray="5 5"
                  label={{ value: "Min", fontSize: 10, fill: "hsl(var(--success))" }}
                />
                <Line
                  type="monotone"
                  dataKey="vlamax"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-center">
            <span className="text-2xl font-bold font-mono text-primary">
              {resultat.vlamax.toFixed(3)}
            </span>
            <span className="text-sm text-muted-foreground ml-2">mmol/L/s</span>
          </div>
        </div>

        {/* Checklist Race Ready */}
        <div className="p-4 rounded-xl bg-secondary/30 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-accent" />
              Checklist Race Ready
            </h3>
            <div
              className={cn(
                "px-3 py-1 rounded-full text-xs font-semibold",
                isRaceReady
                  ? "bg-success/10 text-success"
                  : "bg-warning/10 text-warning"
              )}
            >
              {checklistScore}/{checklist.length}
            </div>
          </div>
          <div className="space-y-3">
            {checklist.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg transition-colors",
                  item.checked ? "bg-success/5" : "bg-destructive/5"
                )}
              >
                {item.checked ? (
                  <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                )}
                <span
                  className={cn(
                    "text-sm",
                    item.checked ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Alertes Coach */}
        <div className="p-4 rounded-xl bg-secondary/30 border border-border">
          <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Alertes Coach
          </h3>
          <div className="space-y-2">
            {alertes.map((alerte, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-2 p-3 rounded-lg",
                  alerte === "Tout OK"
                    ? "bg-success/10 border border-success/20"
                    : "bg-warning/10 border border-warning/20"
                )}
              >
                {alerte === "Tout OK" ? (
                  <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
                )}
                <span
                  className={cn(
                    "text-sm",
                    alerte === "Tout OK" ? "text-success" : "text-warning"
                  )}
                >
                  {alerte}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Séances Recommandées */}
        <div className="p-4 rounded-xl bg-secondary/30 border border-border">
          <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
            <Dumbbell className="w-4 h-4 text-primary" />
            Séances Recommandées
          </h3>
          {tableauSeances.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {tableauSeances.map((seance) => (
                <div
                  key={seance}
                  className={cn(
                    "p-3 rounded-lg text-center font-mono font-bold",
                    seance.startsWith("C")
                      ? "bg-accent/10 text-accent border border-accent/20"
                      : "bg-primary/10 text-primary border border-primary/20"
                  )}
                >
                  {seance}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Pas de séance spécifique
            </p>
          )}
          <div className="mt-4 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground">
              <span className="text-primary">●</span> Séances priorité &nbsp;
              <span className="text-accent">●</span> Séances spécifiques {athlete.objectif}
            </p>
          </div>
        </div>
      </div>

      {/* Race Ready Status Banner */}
      <div
        className={cn(
          "p-4 rounded-xl flex items-center justify-between",
          isRaceReady
            ? "bg-success/10 border border-success/30"
            : "bg-secondary/50 border border-border"
        )}
      >
        <div className="flex items-center gap-3">
          {isRaceReady ? (
            <CheckCircle2 className="w-8 h-8 text-success" />
          ) : (
            <Target className="w-8 h-8 text-muted-foreground" />
          )}
          <div>
            <p className={cn("font-semibold", isRaceReady ? "text-success" : "text-foreground")}>
              {isRaceReady ? "Race Ready!" : "En préparation"}
            </p>
            <p className="text-sm text-muted-foreground">
              {isRaceReady
                ? "Tous les indicateurs sont au vert"
                : `${checklist.length - checklistScore} critère(s) à valider`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold font-mono text-primary">
            {Math.round((checklistScore / checklist.length) * 100)}%
          </p>
          <p className="text-xs text-muted-foreground">Score global</p>
        </div>
      </div>
    </div>
  );
}