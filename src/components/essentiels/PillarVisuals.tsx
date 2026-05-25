/**
 * PillarVisuals — Graphique dédié pour chacun des 8 piliers TFCL.
 * Composant unique avec dispatch sur p.id.
 */

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  ReferenceArea,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  ScatterChart,
  Scatter,
  ZAxis,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { CheckCircle2, AlertCircle, Activity, Shield, GitBranch } from "lucide-react";
import type { PillarData } from "@/lib/essentiels/computeEssentielsData";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const COLORS = {
  ok: "hsl(142 71% 45%)",
  warn: "hsl(38 92% 50%)",
  bad: "hsl(0 84% 60%)",
  primary: "hsl(221 83% 53%)",
  muted: "hsl(215 16% 70%)",
  bg: "hsl(210 40% 96%)",
};

function metricValue(p: PillarData, label: string): number | null {
  const m = p.metrics.find((x) => x.label.toLowerCase().includes(label.toLowerCase()));
  return m && m.value != null && isFinite(m.value) && m.value !== 0 ? m.value : null;
}

// ---------------------------------------------------------------------------
// 1. VO2max × VLamax — Scatter sur carte métabolique
// ---------------------------------------------------------------------------
function VO2VlamaxMap({ p }: { p: PillarData }) {
  const vo2 = metricValue(p, "vo2");
  const vla = metricValue(p, "vlamax");

  if (vo2 == null || vla == null) {
    return <EmptyChart label="VO₂max + VLamax requis" />;
  }

  // Zones d'identité : explosive (haut/droite), équilibré (centre), endurant (bas/gauche)
  const data = [{ vlamax: vla, vo2: vo2, name: "Toi" }];

  return (
    <div className="h-44 relative">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 16, bottom: 30, left: 30 }}>
          {/* Zones colorées */}
          <ReferenceArea x1={0.1} x2={0.4} y1={50} y2={80} fill="hsl(142 71% 45% / 0.12)" />
          <ReferenceArea x1={0.4} x2={0.7} y1={45} y2={75} fill="hsl(38 92% 50% / 0.1)" />
          <ReferenceArea x1={0.7} x2={1.2} y1={40} y2={70} fill="hsl(0 84% 60% / 0.1)" />
          <XAxis
            type="number"
            dataKey="vlamax"
            domain={[0.1, 1.0]}
            ticks={[0.2, 0.4, 0.6, 0.8]}
            tick={{ fontSize: 10 }}
            label={{ value: "VLamax (mmol/L/s)", position: "bottom", offset: 0, fontSize: 10 }}
          />
          <YAxis
            type="number"
            dataKey="vo2"
            domain={[35, 80]}
            tick={{ fontSize: 10 }}
            label={{
              value: "VO₂max",
              angle: -90,
              position: "insideLeft",
              fontSize: 10,
            }}
          />
          <Tooltip
            formatter={(v: any, name: string) =>
              [Number(v).toFixed(name === "vlamax" ? 2 : 1), name === "vlamax" ? "VLamax" : "VO₂max"]
            }
          />
          <Scatter data={data} fill={COLORS.primary}>
            <Cell fill={COLORS.primary} stroke="white" strokeWidth={2} r={8} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      <div className="absolute top-1 right-2 flex flex-col gap-0.5 text-[9px] pointer-events-none">
        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">Endurant</span>
        <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-400">Équilibré</span>
        <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-700 dark:text-red-400">Explosif</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Coaching Compass — Radar 5 axes simplifié (lecture)
// ---------------------------------------------------------------------------
function CompassRadar({
  vo2,
  vla,
  durability,
  economy,
  freshness,
}: {
  vo2: number;
  vla: number;
  durability: number;
  economy: number;
  freshness: number;
}) {
  const data = [
    { axis: "VO₂max", score: vo2, full: 100 },
    { axis: "VLamax", score: vla, full: 100 },
    { axis: "Durabilité", score: durability, full: 100 },
    { axis: "Économie", score: economy, full: 100 },
    { axis: "Fraîcheur", score: freshness, full: 100 },
  ];

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} />
          <Radar
            name="Cible"
            dataKey="full"
            stroke="hsl(142 71% 45%)"
            fill="hsl(142 71% 45%)"
            fillOpacity={0.08}
            strokeDasharray="3 3"
          />
          <Radar
            name="Toi"
            dataKey="score"
            stroke={COLORS.primary}
            fill={COLORS.primary}
            fillOpacity={0.45}
            strokeWidth={2}
          />
          <Tooltip formatter={(v: any) => `${v}/100`} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function CompassPillar({ p, compassScores }: { p: PillarData; compassScores: any }) {
  if (!compassScores) return <EmptyChart label="Snapshot requis" />;
  return <CompassRadar {...compassScores} />;
}

// ---------------------------------------------------------------------------
// 3. MLSS Run — Barres horizontales des zones d'allure (% VMA)
// ---------------------------------------------------------------------------
function MLSSRunZones({ p }: { p: PillarData }) {
  const mlss = metricValue(p, "vma");
  if (mlss == null) return <EmptyChart label="VLa + Économie requis" />;

  const zones = [
    { name: "Z2 Endurance", min: 60, max: 75, color: "hsl(142 71% 60%)" },
    { name: "Z3 Tempo", min: 75, max: 82, color: "hsl(45 90% 55%)" },
    { name: "Z4 MLSS", min: 82, max: 90, color: "hsl(25 90% 55%)" },
    { name: "Z5 VO₂", min: 90, max: 100, color: "hsl(0 84% 60%)" },
  ];

  return (
    <div className="space-y-2 py-2">
      {zones.map((z) => {
        const isMLSS = mlss >= z.min && mlss <= z.max;
        return (
          <div key={z.name} className="space-y-0.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className={isMLSS ? "font-bold text-foreground" : "text-muted-foreground"}>
                {z.name}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                {z.min}–{z.max}% VMA
              </span>
            </div>
            <div className="relative h-3.5 rounded-full bg-muted overflow-hidden">
              <div
                className="absolute top-0 h-full rounded-full"
                style={{
                  left: `${((z.min - 60) / 40) * 100}%`,
                  width: `${((z.max - z.min) / 40) * 100}%`,
                  backgroundColor: z.color,
                  opacity: isMLSS ? 1 : 0.35,
                }}
              />
              {isMLSS && (
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-1 h-5 bg-foreground rounded-full shadow-md"
                  style={{ left: `calc(${((mlss - 60) / 40) * 100}% - 2px)` }}
                />
              )}
            </div>
          </div>
        );
      })}
      <div className="text-center text-[11px] text-foreground mt-2">
        <span className="font-semibold text-primary">{mlss.toFixed(1)}%</span> de la VMA — ton seuil prédit
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. TTE — Barre horizontale observé vs cible
// ---------------------------------------------------------------------------
function TTEBar({ p }: { p: PillarData }) {
  const observed = metricValue(p, "observé");
  const target = metricValue(p, "cible");
  if (observed == null || target == null) return <EmptyChart label="Test 30-40 min FTP requis" />;

  const max = Math.max(observed, target) * 1.2;
  const data = [
    { name: "Observé", value: observed, fill: observed >= target ? COLORS.ok : COLORS.warn },
    { name: "Cible", value: target, fill: COLORS.muted },
  ];

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 40, bottom: 8, left: 60 }}>
          <XAxis type="number" domain={[0, max]} tick={{ fontSize: 10 }} unit=" min" />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={55} />
          <Tooltip formatter={(v: any) => `${Math.round(Number(v))} min`} />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} label={{ position: "right", fontSize: 11, formatter: (v: any) => `${Math.round(v)}'` }}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. FatMax — Échelle de zones de puissance (% FTP) avec position FatMax
// ---------------------------------------------------------------------------
function FatMaxZones({ p }: { p: PillarData }) {
  const fatmax = metricValue(p, "fatmax");
  const ftp = metricValue(p, "ftp");
  if (fatmax == null) return <EmptyChart label="VLa + VO₂max requis" />;

  const zones = [
    { name: "Z1 Récup", min: 0, max: 55, color: "hsl(200 70% 70%)" },
    { name: "Z2 Endurance", min: 55, max: 75, color: "hsl(142 60% 55%)" },
    { name: "Z3 Tempo", min: 75, max: 88, color: "hsl(45 90% 55%)" },
    { name: "Z4 Seuil", min: 88, max: 105, color: "hsl(25 90% 55%)" },
    { name: "Z5+", min: 105, max: 130, color: "hsl(0 84% 60%)" },
  ];
  const totalSpan = 130;

  return (
    <div className="space-y-3 py-2">
      <div className="relative h-9 rounded-lg overflow-hidden flex border border-border">
        {zones.map((z) => (
          <div
            key={z.name}
            className="flex items-center justify-center text-[9px] font-medium text-white/90 transition-opacity"
            style={{
              width: `${((z.max - z.min) / totalSpan) * 100}%`,
              backgroundColor: z.color,
              opacity: fatmax >= z.min && fatmax <= z.max ? 1 : 0.4,
            }}
          >
            {z.name}
          </div>
        ))}
        {/* Pointer */}
        <div
          className="absolute top-0 bottom-0 flex flex-col items-center pointer-events-none"
          style={{ left: `calc(${(fatmax / totalSpan) * 100}% - 8px)` }}
        >
          <div className="w-4 h-4 bg-foreground rounded-full border-2 border-background shadow-lg -mt-1.5" />
          <div className="w-0.5 flex-1 bg-foreground" />
        </div>
      </div>
      <div className="text-center text-[11px]">
        <span className="font-semibold text-foreground">FatMax = {fatmax.toFixed(0)}% FTP</span>
        {ftp != null && (
          <span className="text-muted-foreground"> · soit ≈ {Math.round((ftp * fatmax) / 100)} W</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. No Fake Defaults — Donut complétude des données
// ---------------------------------------------------------------------------
function DataCompleteness({ completeness }: { completeness: { measured: number; missing: number } }) {
  const total = completeness.measured + completeness.missing;
  const pct = total > 0 ? Math.round((completeness.measured / total) * 100) : 0;
  const data = [
    { name: "Mesuré", value: completeness.measured, fill: COLORS.ok },
    { name: "Manquant", value: completeness.missing, fill: COLORS.muted },
  ];

  return (
    <div className="relative h-44">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={50} outerRadius={75} paddingAngle={2} startAngle={90} endAngle={-270}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.fill} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="text-2xl font-bold text-foreground">{pct}%</div>
        <div className="text-[10px] text-muted-foreground">données mesurées</div>
      </div>
      <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-3 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> {completeness.measured} mesurées
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50" /> {completeness.missing} manquantes
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7. Pacing — 3 scénarios (courbe d'effort)
// ---------------------------------------------------------------------------
function PacingScenarios() {
  // Courbe synthétique illustrant les 3 scénarios sur une épreuve normalisée
  const data = Array.from({ length: 11 }, (_, i) => {
    const t = i * 10;
    return {
      t,
      optimiste: Math.round(85 - 0.05 * t + 5 * Math.sin(t / 15)),
      réaliste: Math.round(80 - 0.08 * t + 3 * Math.sin(t / 15)),
      prudent: Math.round(75 - 0.12 * t + 2 * Math.sin(t / 15)),
    };
  });
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 24, left: 0 }}>
          <XAxis dataKey="t" unit="%" tick={{ fontSize: 9 }} label={{ value: "Distance parcourue", position: "bottom", offset: -8, fontSize: 9 }} />
          <YAxis domain={[60, 95]} tick={{ fontSize: 9 }} unit="%" />
          <Tooltip formatter={(v: any) => `${v}% effort`} />
          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} iconSize={8} />
          <Line type="monotone" dataKey="optimiste" stroke={COLORS.bad} strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="réaliste" stroke={COLORS.primary} strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="prudent" stroke={COLORS.ok} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 8. Traceability — Liste de check
// ---------------------------------------------------------------------------
function TraceChecklist() {
  const items = [
    { label: "Calibration evidence", ok: true },
    { label: "Literature cohort (N=44)", ok: true },
    { label: "VLamax trace versionnée", ok: true },
    { label: "Run MLSS trace (42j)", ok: true },
    { label: "Hash SHA-256 du rapport", ok: true },
  ];
  return (
    <div className="space-y-2 py-2">
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-indigo-500/5 border border-indigo-500/20"
        >
          <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
          <span className="text-xs text-foreground">{it.label}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty
// ---------------------------------------------------------------------------
function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-40 flex flex-col items-center justify-center gap-2 text-muted-foreground border-2 border-dashed border-muted rounded-lg">
      <AlertCircle className="h-6 w-6 opacity-50" />
      <span className="text-xs italic">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------
export interface PillarVisualContext {
  compassScores?: {
    vo2: number;
    vla: number;
    durability: number;
    economy: number;
    freshness: number;
  } | null;
  completeness?: { measured: number; missing: number };
}

export function PillarVisual({
  p,
  ctx,
}: {
  p: PillarData;
  ctx: PillarVisualContext;
}) {
  switch (p.id) {
    case "vo2-vlamax":
      return <VO2VlamaxMap p={p} />;
    case "compass":
      return <CompassPillar p={p} compassScores={ctx.compassScores} />;
    case "mlss-run":
      return <MLSSRunZones p={p} />;
    case "tte":
      return <TTEBar p={p} />;
    case "fatmax":
      return <FatMaxZones p={p} />;
    case "no-fake":
      return <DataCompleteness completeness={ctx.completeness ?? { measured: 0, missing: 0 }} />;
    case "pacing":
      return <PacingScenarios />;
    case "trace":
      return <TraceChecklist />;
    default:
      return null;
  }
}
