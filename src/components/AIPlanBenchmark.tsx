/**
 * AIPlanBenchmark — Benchmarks a generated plan against elite reference standards
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Trophy, TrendingUp, TrendingDown, Minus, AlertTriangle,
  CheckCircle2, Target, BarChart3, Zap,
} from "lucide-react";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import { getEliteReference, getEliteCeilingReference, type EliteReference } from "@/lib/eliteReferences";
import type { UnifiedLimiterResult } from "@/lib/v2/unifiedLimiterDetection";

interface AIPlanBenchmarkProps {
  plan: ParsedPlan;
  objective: string;
  ambition: string;
  athleteName?: string;
  limiterResult?: UnifiedLimiterResult | null;
}

interface MetricGauge {
  label: string;
  value: number;
  refMin: number;
  refMax: number;
  eliteMin: number;
  eliteMax: number;
  unit: string;
  icon: React.ReactNode;
}

function computePlanMetrics(plan: ParsedPlan) {
  const totalWeeks = plan.weeks.length;
  if (totalWeeks === 0) return null;

  let totalSessions = 0;
  let restDays = 0;
  const sportCounts: Record<string, number> = {};

  // Track per-week sessions for progression analysis
  const weeklySessionCounts: number[] = [];

  for (const week of plan.weeks) {
    let weekActive = 0;
    for (const s of week.sessions) {
      if (s.isRest) {
        restDays++;
        continue;
      }
      totalSessions++;
      weekActive++;
      const sport = categorizeSport(s.sport);
      // Split Brick sessions 50/50 between Vélo and Course for accurate tri distribution
      if (sport === "Brick") {
        sportCounts["Vélo"] = (sportCounts["Vélo"] || 0) + 0.5;
        sportCounts["Course"] = (sportCounts["Course"] || 0) + 0.5;
      } else {
        sportCounts[sport] = (sportCounts[sport] || 0) + 1;
      }
    }
    weeklySessionCounts.push(weekActive);
  }

  const avgSessionsPerWeek = totalSessions / totalWeeks;

  // Detect doubles (days with >1 session)
  // Also handle dayIndex === -1 by grouping on dayName fallback
  let totalDoubles = 0;
  for (const week of plan.weeks) {
    const dayCounts: Record<string, number> = {};
    for (const s of week.sessions) {
      if (s.isRest) continue;
      // Use dayIndex if valid, otherwise fallback to dayName
      const key = s.dayIndex >= 0 ? String(s.dayIndex) : s.dayName.toLowerCase();
      if (key) {
        dayCounts[key] = (dayCounts[key] || 0) + 1;
      }
    }
    for (const count of Object.values(dayCounts)) {
      if (count > 1) totalDoubles += count - 1;
    }
  }
  const avgDoublesPerWeek = totalDoubles / totalWeeks;

  // Detect key sessions — match AI markers: 🔑, intensity keywords, zone indicators
  let keySessions = 0;
  for (const week of plan.weeks) {
    for (const s of week.sessions) {
      if (s.isRest) continue;
      const text = `${s.title} ${s.details}`;
      // 🔑 is the primary AI marker for key sessions
      if (/🔑/.test(text)) {
        keySessions++;
        continue;
      }
      // Fallback: intensity keywords
      if (/seuil|threshold|interval|fractionn[ée]|vma|tempo|race[- ]?pace|sweet[- ]?spot|brick|clé|key|qualit[ée]|sp[ée]cifique|z[34567]|vo2|lactate|30\/30/i.test(text)) {
        keySessions++;
      }
    }
  }
  const avgKeyPerWeek = keySessions / totalWeeks;

  // Sport distribution percentages — computed only on tri-relevant sports (Natation/Vélo/Course)
  // so that Renfo/Autre don't dilute the comparison against elite references
  const triSports = ["Natation", "Vélo", "Course"];
  const totalTriSessions = triSports.reduce((sum, sp) => sum + (sportCounts[sp] || 0), 0);
  const sportPcts: Record<string, number> = {};
  for (const [k, v] of Object.entries(sportCounts)) {
    sportPcts[k] = totalTriSessions > 0 ? Math.round((v / totalTriSessions) * 100) : 0;
  }

  // Volume progression rate (avg week-over-week)
  let progressionRates: number[] = [];
  for (let i = 1; i < weeklySessionCounts.length; i++) {
    const prev = weeklySessionCounts[i - 1];
    if (prev > 0) {
      progressionRates.push(((weeklySessionCounts[i] - prev) / prev) * 100);
    }
  }

  // Detect load pattern (3:1 vs 2:1)
  let deloadWeeks = 0;
  for (let i = 1; i < weeklySessionCounts.length; i++) {
    if (weeklySessionCounts[i] < weeklySessionCounts[i - 1] * 0.75) {
      deloadWeeks++;
    }
  }
  const loadRatio = totalWeeks > 3 ? `${Math.round((totalWeeks - deloadWeeks) / Math.max(deloadWeeks, 1))}:1` : "N/A";

  return {
    totalWeeks,
    totalSessions,
    avgSessionsPerWeek: Math.round(avgSessionsPerWeek * 10) / 10,
    avgDoublesPerWeek: Math.round(avgDoublesPerWeek * 10) / 10,
    avgKeyPerWeek: Math.round(avgKeyPerWeek * 10) / 10,
    sportPcts,
    loadRatio,
    deloadWeeks,
  };
}

function categorizeSport(sport: string): string {
  const s = sport.toLowerCase();
  if (s.includes("natation") || s.includes("swim") || s.includes("nage") || s.includes("piscine")) return "Natation";
  if (s.includes("vélo") || s.includes("velo") || s.includes("bike") || s.includes("cyclisme") || s.includes("ht") || s.includes("home trainer")) return "Vélo";
  if (s.includes("cap") || s.includes("course") || s.includes("run") || s.includes("footing") || s.includes("sortie longue")) return "Course";
  if (s.includes("muscu") || s.includes("force") || s.includes("renfo") || s.includes("ppl") || s.includes("gym")) return "Renfo";
  if (s.includes("brick") || s.includes("enchaîn") || s.includes("enchaine")) return "Brick";
  return "Autre";
}

type GaugeStatus = "below" | "in_range" | "above";

function getGaugeStatus(value: number, min: number, max: number): GaugeStatus {
  if (value < min) return "below";
  if (value > max) return "above";
  return "in_range";
}

/**
 * Continuous proximity score [0-1] instead of binary in/out.
 * Returns 1.0 if value is within [min, max].
 * Falls off linearly: e.g. value at 50% of min → score 0.5
 */
function proximityScore(value: number, min: number, max: number): number {
  if (value >= min && value <= max) return 1.0;
  if (value < min) {
    // How close are we to min? Use min as reference distance
    if (min === 0) return value === 0 ? 1.0 : 0;
    return Math.max(0, value / min); // e.g. 8/12 = 0.67
  }
  // above max - less penalizing (being above ref is often acceptable)
  if (max === 0) return 1.0;
  const overshoot = (value - max) / max;
  return Math.max(0, 1 - overshoot * 0.5); // gentle penalty for exceeding
}

function StatusIcon({ status }: { status: GaugeStatus }) {
  if (status === "in_range") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "below") return <TrendingDown className="h-4 w-4 text-amber-500" />;
  return <TrendingUp className="h-4 w-4 text-blue-500" />;
}

function statusLabel(status: GaugeStatus): string {
  if (status === "in_range") return "Dans la norme";
  if (status === "below") return "Sous la référence";
  return "Au-dessus";
}

function statusColor(status: GaugeStatus): string {
  if (status === "in_range") return "bg-green-500/15 text-green-700 dark:text-green-300";
  if (status === "below") return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-blue-500/15 text-blue-700 dark:text-blue-300";
}

function GaugeRow({ label, value, refMin, refMax, eliteMin, eliteMax, unit, icon }: MetricGauge) {
  const status = getGaugeStatus(value, refMin, refMax);
  // Position within the elite range for the progress bar
  const range = eliteMax - 0;
  const pct = range > 0 ? Math.min(Math.max((value / eliteMax) * 100, 5), 100) : 50;
  const refMinPct = range > 0 ? (refMin / eliteMax) * 100 : 0;
  const refMaxPct = range > 0 ? (refMax / eliteMax) * 100 : 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          {icon}
          {label}
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-[10px] ${statusColor(status)}`}>
            <StatusIcon status={status} />
            <span className="ml-1">{statusLabel(status)}</span>
          </Badge>
          <span className="text-sm font-bold tabular-nums">{value}{unit}</span>
        </div>
      </div>
      <div className="relative h-3 rounded-full bg-muted overflow-hidden">
        {/* Reference range band */}
        <div
          className="absolute h-full bg-green-500/20 rounded-full"
          style={{ left: `${refMinPct}%`, width: `${refMaxPct - refMinPct}%` }}
        />
        {/* Value indicator */}
        <div
          className="absolute h-full w-1.5 rounded-full bg-primary"
          style={{ left: `${Math.min(pct, 98)}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Réf: {refMin}-{refMax}{unit}</span>
        <span>Élite: {eliteMin}-{eliteMax}{unit}</span>
      </div>
    </div>
  );
}

export function AIPlanBenchmark({ plan, objective, ambition, athleteName }: AIPlanBenchmarkProps) {
  const metrics = useMemo(() => computePlanMetrics(plan), [plan]);
  const ref = useMemo(() => getEliteReference(objective, ambition), [objective, ambition]);
  const eliteRef = useMemo(() => getEliteCeilingReference(objective), [objective]);

  if (!metrics || !ref) return null;
  const elite = eliteRef || ref;

  const gauges: MetricGauge[] = [
    {
      label: "Séances / semaine",
      value: metrics.avgSessionsPerWeek,
      refMin: ref.sessionsPerWeek[0],
      refMax: ref.sessionsPerWeek[1],
      eliteMin: elite.sessionsPerWeek[0],
      eliteMax: elite.sessionsPerWeek[1],
      unit: "",
      icon: <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />,
    },
    {
      label: "Doubles / semaine",
      value: metrics.avgDoublesPerWeek,
      refMin: ref.doublesPerWeek[0],
      refMax: ref.doublesPerWeek[1],
      eliteMin: elite.doublesPerWeek[0],
      eliteMax: elite.doublesPerWeek[1],
      unit: "",
      icon: <Zap className="h-3.5 w-3.5 text-muted-foreground" />,
    },
    {
      label: "Séances clés / semaine",
      value: metrics.avgKeyPerWeek,
      refMin: ref.keySessions[0],
      refMax: ref.keySessions[1],
      eliteMin: elite.keySessions[0],
      eliteMax: elite.keySessions[1],
      unit: "",
      icon: <Target className="h-3.5 w-3.5 text-muted-foreground" />,
    },
  ];

  // Sport distribution comparison for triathlon
  const isTriathlon = ref.swimPct != null;
  const sportComparisons = isTriathlon && ref.swimPct && ref.bikePct && ref.runPct
    ? [
        { sport: "Natation", pct: metrics.sportPcts["Natation"] || 0, refMin: ref.swimPct[0], refMax: ref.swimPct[1] },
        { sport: "Vélo", pct: metrics.sportPcts["Vélo"] || 0, refMin: ref.bikePct[0], refMax: ref.bikePct[1] },
        { sport: "Course", pct: metrics.sportPcts["Course"] || 0, refMin: ref.runPct[0], refMax: ref.runPct[1] },
      ]
    : null;

  // Overall conformity score — continuous proximity instead of binary
  const proximityScores = gauges.map(g => proximityScore(g.value, g.refMin, g.refMax));
  if (sportComparisons) {
    sportComparisons.forEach(sc => proximityScores.push(proximityScore(sc.pct, sc.refMin, sc.refMax)));
  }
  const avgProximity = proximityScores.reduce((a, b) => a + b, 0) / proximityScores.length;
  const conformityPct = Math.round(avgProximity * 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Benchmark vs Référence {athleteName ? `— ${athleteName}` : ""}
          </CardTitle>
          <Badge
            variant="outline"
            className={conformityPct >= 80 ? "border-green-500/50 text-green-700 dark:text-green-300" :
              conformityPct >= 50 ? "border-amber-500/50 text-amber-700 dark:text-amber-300" :
                "border-destructive/50 text-destructive"}
          >
            {conformityPct}% conforme
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Comparaison du plan généré avec les standards <span className="font-semibold">{ref.label}</span>
          {ref.longRunMax && <> · SL max: {ref.longRunMax}</>}
          {" · "}Charge: {ref.loadPattern}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main gauges */}
        {gauges.map(g => (
          <GaugeRow key={g.label} {...g} />
        ))}

        {/* Sport distribution for triathlon */}
        {sportComparisons && (
          <div className="space-y-2 pt-2 border-t border-border">
            <h4 className="text-xs font-semibold text-muted-foreground">Répartition sportive</h4>
            <div className="grid grid-cols-3 gap-3">
              {sportComparisons.map(sc => {
                const status = getGaugeStatus(sc.pct, sc.refMin, sc.refMax);
                return (
                  <div key={sc.sport} className="text-center space-y-1">
                    <div className="text-xs text-muted-foreground">{sc.sport}</div>
                    <div className="text-lg font-bold">{sc.pct}%</div>
                    <div className="text-[10px] text-muted-foreground">Réf: {sc.refMin}-{sc.refMax}%</div>
                    <Badge className={`text-[9px] ${statusColor(status)}`}>
                      <StatusIcon status={status} />
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Load pattern */}
        <div className="flex items-center justify-between pt-2 border-t border-border text-sm">
          <span className="text-muted-foreground">Pattern de charge détecté</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">{metrics.loadRatio}</Badge>
            {metrics.loadRatio === ref.loadPattern ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
            <span className="text-xs text-muted-foreground">Réf: {ref.loadPattern}</span>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
          <p><strong>{metrics.totalSessions}</strong> séances sur <strong>{metrics.totalWeeks}</strong> semaines · <strong>{metrics.deloadWeeks}</strong> semaines de décharge</p>
          {conformityPct < 50 && (
            <p className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Écart significatif avec les standards — vérifier la cohérence du plan
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
