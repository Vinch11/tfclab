/**
 * PlanVsSimulationPaceChart — Compare l'allure cible du Plan A (négatif split)
 * et du Plan B (even/repli) avec l'allure simulée par le moteur de simulation
 * (scénarios Conservateur / Optimal / Agressif).
 *
 * But : vérifier la cohérence "plan vs simulation" sur la même course (semi, marathon,
 * 10 km, segment run d'un triathlon). Une divergence > 5 % entre Plan A et Optimal
 * révèle un désalignement (objectif d'ambition, vlamax/TTE, conditions).
 */

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, Info } from "lucide-react";
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
import {
  getPlans,
  runPace,
  paceSegments,
  runSegmentsForFormat,
} from "@/components/ObjectiveStrategyCard";
import { computeNegativeSplitDelta } from "@/lib/v2/pacingDisciplineRules";
import {
  computeRaceSimulation,
  type RaceSimulationInput,
  type RaceType,
} from "@/lib/v2/raceSimulation";
import type { PacingEnvelopeResult, RaceObjective } from "@/lib/v2/pacingEnvelopeEngine";

interface PlanVsSimulationPaceChartProps {
  raceObjective: RaceObjective;
  runEnvelope: PacingEnvelopeResult;
  paceThresholdSecKm: number;
  vma: number | null;
  vlamaxRun: number | null;
  tteMinRun: number | null;
  runDurationMin: number;
  weightKg?: number | null;
  className?: string;
}

const RACE_TO_SIM: Partial<Record<RaceObjective, RaceType>> = {
  "10km": "10km",
  Semi: "Semi",
  Marathon: "Marathon",
  "70.3": "Semi", // run leg approx ~ semi
  IM: "Marathon",
};

function fmtPaceTick(sec: number): string {
  if (!Number.isFinite(sec) || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec - m * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function paceFromVMA(vma: number, intensityPct: number): number {
  if (vma <= 0 || intensityPct <= 0) return 0;
  return 3600 / (vma * (intensityPct / 100));
}

export function PlanVsSimulationPaceChart({
  raceObjective,
  runEnvelope,
  paceThresholdSecKm,
  vma,
  vlamaxRun,
  tteMinRun,
  runDurationMin,
  weightKg = null,
  className,
}: PlanVsSimulationPaceChartProps) {
  const simRaceType = RACE_TO_SIM[raceObjective];

  // ── Plans A/B — pace cible par quart de course ───────────────────────────
  const plans = React.useMemo(() => getPlans(raceObjective), [raceObjective]);
  const planA = plans[0];
  const planB = plans[1];

  const pA = React.useMemo(
    () => runPace(runEnvelope, paceThresholdSecKm, planA.intensityFactor, raceObjective),
    [runEnvelope, paceThresholdSecKm, planA.intensityFactor, raceObjective]
  );
  const pB = React.useMemo(
    () => runPace(runEnvelope, paceThresholdSecKm, planB.intensityFactor, raceObjective),
    [runEnvelope, paceThresholdSecKm, planB.intensityFactor, raceObjective]
  );

  const deltaA = React.useMemo(() => {
    if (raceObjective === "Marathon" || raceObjective === "10km") {
      return computeNegativeSplitDelta(
        raceObjective,
        vlamaxRun,
        tteMinRun,
        runDurationMin
      ).targetPct;
    }
    if (raceObjective === "Semi") {
      // Semi : on emprunte la logique 10 km (course tempo / proche seuil)
      return computeNegativeSplitDelta(
        "10km",
        vlamaxRun,
        tteMinRun,
        runDurationMin
      ).targetPct;
    }
    return 1.2;
  }, [raceObjective, vlamaxRun, tteMinRun, runDurationMin]);

  const segsA = React.useMemo(
    () => paceSegments(pA.targetPaceSec, planA.splitBias, deltaA, raceObjective),
    [pA.targetPaceSec, planA.splitBias, deltaA, raceObjective]
  );
  const segsB = React.useMemo(
    () => paceSegments(pB.targetPaceSec, planB.splitBias, deltaA, raceObjective),
    [pB.targetPaceSec, planB.splitBias, deltaA, raceObjective]
  );
  const shares = React.useMemo(() => runSegmentsForFormat(raceObjective), [raceObjective]);

  // ── Simulation — 3 scénarios × 10 segments ───────────────────────────────
  const simResult = React.useMemo(() => {
    if (!simRaceType || !vma || vma <= 0) return null;
    const input: RaceSimulationInput = {
      raceType: simRaceType,
      raceDate: null,
      distanceKm: null,
      targetDurationMin: null,
      heat: "moderate",
      terrain: "flat",
      ambientTempC: null,
      humidityPct: null,
      acclimatized: null,
      plannedCarbsGH: 60,
      gutTraining: false,
      nutritionType: "mixed",
      ambition: "perf",
      vlamaxEffectif: vlamaxRun,
      vlamaxConfidence: 0.6,
      vlamaxDiscipline: "run",
      tteMin: tteMinRun,
      tteConfidence: 0.6,
      fatmaxCenterPct: null,
      fatmaxRange: null,
      disponibiliteScore: null,
      disponibiliteLevel: null,
      injuryRiskLevel: null,
      ftp: null,
      vma,
      paceThreshold: paceThresholdSecKm,
      weight: weightKg,
      readinessModifiers: null,
    };
    try {
      return computeRaceSimulation(input);
    } catch (e) {
      console.warn("[PlanVsSimChart] simulation failed:", e);
      return null;
    }
  }, [simRaceType, vma, vlamaxRun, tteMinRun, paceThresholdSecKm, weightKg]);

  const simOptimal = simResult?.scenarios.find((s) => s.type === "optimal") ?? null;
  const simConservative = simResult?.scenarios.find((s) => s.type === "conservative") ?? null;

  // ── Construction des données pour le chart (X = % distance) ──────────────
  const data = React.useMemo(() => {
    const points: Record<string, number | null> & { distPct: number }[] = [];

    // Plan A/B : pace constante au sein du quart, affichée au début et fin de chaque quart
    let cumul = 0;
    const planAByPct: { x: number; v: number }[] = [];
    const planBByPct: { x: number; v: number }[] = [];
    shares.forEach((s, i) => {
      const start = cumul * 100;
      cumul += s.share;
      const end = cumul * 100;
      planAByPct.push({ x: start, v: segsA[i].paceSec });
      planAByPct.push({ x: end, v: segsA[i].paceSec });
      planBByPct.push({ x: start, v: segsB[i].paceSec });
      planBByPct.push({ x: end, v: segsB[i].paceSec });
    });

    // Simulation : pace par segment de fin (10 segments de 10 %)
    const simByPct: { x: number; vO: number | null; vC: number | null }[] = [];
    if (simOptimal && vma && vma > 0) {
      // Point de départ à 0 % aligné sur le 1er segment
      simByPct.push({
        x: 0,
        vO: paceFromVMA(vma, simOptimal.segments[0].intensityPct),
        vC: simConservative ? paceFromVMA(vma, simConservative.segments[0].intensityPct) : null,
      });
      simOptimal.segments.forEach((seg, i) => {
        const xPct = ((i + 1) / simOptimal.segments.length) * 100;
        simByPct.push({
          x: xPct,
          vO: paceFromVMA(vma, seg.intensityPct),
          vC: simConservative
            ? paceFromVMA(vma, simConservative.segments[i]?.intensityPct ?? seg.intensityPct)
            : null,
        });
      });
    }

    // Merge sur axe X commun
    const xs = Array.from(
      new Set([
        ...planAByPct.map((p) => +p.x.toFixed(2)),
        ...planBByPct.map((p) => +p.x.toFixed(2)),
        ...simByPct.map((p) => +p.x.toFixed(2)),
      ])
    ).sort((a, b) => a - b);

    const lookup = (arr: { x: number; v: number }[], x: number): number | null => {
      // step-after : on prend le dernier point dont x <= cible
      let last: number | null = null;
      for (const p of arr) {
        if (p.x <= x + 0.01) last = p.v;
        else break;
      }
      return last;
    };
    const lookupSim = (x: number, key: "vO" | "vC"): number | null => {
      // interpolation linéaire entre 2 points encadrants
      let prev = simByPct[0];
      for (let i = 0; i < simByPct.length; i++) {
        if (simByPct[i].x >= x - 0.01) {
          if (i === 0) return simByPct[0][key];
          const a = simByPct[i - 1];
          const b = simByPct[i];
          const va = a[key];
          const vb = b[key];
          if (va == null || vb == null) return vb ?? va;
          const t = (x - a.x) / Math.max(0.01, b.x - a.x);
          return va + (vb - va) * t;
        }
        prev = simByPct[i];
      }
      return prev?.[key] ?? null;
    };

    return xs.map((x) => ({
      distPct: x,
      planA: lookup(planAByPct, x),
      planB: lookup(planBByPct, x),
      simOptimal: simOptimal ? lookupSim(x, "vO") : null,
      simConservative: simConservative ? lookupSim(x, "vC") : null,
    }));
  }, [shares, segsA, segsB, simOptimal, simConservative, vma]);

  // ── Cohérence Plan A vs Simulation Optimal (moyenne) ─────────────────────
  const coherence = React.useMemo(() => {
    if (!simOptimal || !vma || vma <= 0) return null;
    const simAvgPace =
      simOptimal.segments.reduce((sum, s) => sum + paceFromVMA(vma, s.intensityPct), 0) /
      simOptimal.segments.length;
    const planAvg = pA.targetPaceSec;
    const deltaSec = simAvgPace - planAvg;
    const deltaPct = (deltaSec / planAvg) * 100;
    return { simAvgPace, planAvg, deltaSec, deltaPct };
  }, [simOptimal, vma, pA.targetPaceSec]);

  // ── Garde-fous ───────────────────────────────────────────────────────────
  if (!simRaceType) {
    return null;
  }
  if (!vma || vma <= 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Cohérence Plan vs Simulation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xs text-muted-foreground italic">
            VMA manquante — impossible de convertir l'intensité simulée en allure.
          </div>
        </CardContent>
      </Card>
    );
  }

  // Échelle Y inversée (allure plus rapide en haut). On garde domaine auto avec marge.
  const allValues = data
    .flatMap((d) => [d.planA, d.planB, d.simOptimal, d.simConservative])
    .filter((v): v is number => v != null && Number.isFinite(v));
  const minPace = Math.min(...allValues);
  const maxPace = Math.max(...allValues);
  const padding = Math.max(8, (maxPace - minPace) * 0.1);

  const divergenceWarning =
    coherence && Math.abs(coherence.deltaPct) > 5
      ? `Plan A et Simulation Optimal divergent de ${coherence.deltaPct >= 0 ? "+" : ""}${coherence.deltaPct.toFixed(1)} % (${coherence.deltaSec >= 0 ? "+" : ""}${coherence.deltaSec.toFixed(0)} s/km). Vérifier ambition / VLamax / TTE.`
      : null;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
          <Activity className="h-4 w-4 text-primary" />
          Cohérence Plan vs Simulation — {raceObjective}
          {coherence && (
            <Badge
              variant={Math.abs(coherence.deltaPct) > 5 ? "destructive" : "secondary"}
              className="text-[10px] ml-auto"
            >
              Δ Plan A vs Sim. : {coherence.deltaPct >= 0 ? "+" : ""}
              {coherence.deltaPct.toFixed(1)} %
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-[11px] text-muted-foreground leading-relaxed">
          Allure cible (négatif split, paliers Plan A) confrontée à la trajectoire d'allure
          générée par le moteur de simulation (ambition <em>perf</em>, conditions neutres).
          Une divergence &gt; 5 % entre Plan A et Simulation Optimal indique un désalignement.
        </div>

        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
              <XAxis
                dataKey="distPct"
                type="number"
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                label={{
                  value: "Distance",
                  position: "insideBottom",
                  offset: -2,
                  style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                }}
              />
              <YAxis
                reversed
                domain={[minPace - padding, maxPace + padding]}
                tickFormatter={fmtPaceTick}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                width={48}
                label={{
                  value: "Allure (m:ss/km)",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                }}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  fontSize: 11,
                  borderRadius: 6,
                }}
                formatter={(value: number, name: string) => [
                  fmtPaceTick(value) + "/km",
                  name,
                ]}
                labelFormatter={(label) => `Distance : ${Number(label).toFixed(0)} %`}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} iconSize={10} />
              <ReferenceLine
                y={paceThresholdSecKm}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="2 4"
                label={{
                  value: `Seuil ${fmtPaceTick(paceThresholdSecKm)}`,
                  fontSize: 9,
                  fill: "hsl(var(--muted-foreground))",
                  position: "insideTopRight",
                }}
              />
              <Line
                type="stepAfter"
                dataKey="planA"
                name="Plan A (négatif split)"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={false}
                connectNulls
              />
              <Line
                type="stepAfter"
                dataKey="planB"
                name="Plan B (repli)"
                stroke="hsl(var(--primary))"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="simOptimal"
                name="Simulation — Optimal"
                stroke="hsl(var(--destructive))"
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="simConservative"
                name="Simulation — Conservateur"
                stroke="hsl(var(--destructive))"
                strokeWidth={1.5}
                strokeDasharray="2 3"
                dot={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {coherence && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-md border border-border/60 bg-muted/20 p-2">
              <div className="text-muted-foreground">Plan A — allure moy.</div>
              <div className="font-mono font-semibold">{fmtPaceTick(coherence.planAvg)}/km</div>
            </div>
            <div className="rounded-md border border-border/60 bg-muted/20 p-2">
              <div className="text-muted-foreground">Sim. Optimal — allure moy.</div>
              <div className="font-mono font-semibold">
                {fmtPaceTick(coherence.simAvgPace)}/km
              </div>
            </div>
            <div className="rounded-md border border-border/60 bg-muted/20 p-2">
              <div className="text-muted-foreground">Écart</div>
              <div
                className={
                  "font-mono font-semibold " +
                  (Math.abs(coherence.deltaPct) > 5
                    ? "text-destructive"
                    : "text-emerald-600 dark:text-emerald-400")
                }
              >
                {coherence.deltaSec >= 0 ? "+" : ""}
                {coherence.deltaSec.toFixed(0)} s/km
              </div>
            </div>
          </div>
        )}

        {divergenceWarning ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-[11px]">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span className="text-foreground/90 leading-relaxed">{divergenceWarning}</span>
          </div>
        ) : coherence ? (
          <div className="flex items-start gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/5 p-2 text-[11px]">
            <Info className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
            <span className="text-foreground/90 leading-relaxed">
              Plan A et Simulation Optimal sont cohérents (écart &lt; 5 %). L'allure cible est
              physiologiquement réaliste.
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default PlanVsSimulationPaceChart;
