/**
 * AIPlanVolumeChart — Stacked bar chart + trend line showing volume evolution
 * Supports two views: by block/phase and by week
 */
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  CartesianGrid, Line, ComposedChart,
} from "recharts";
import { TrendingUp } from "lucide-react";
import type { ParsedPlan } from "@/lib/aiPlanParser";

const SPORT_COLORS: Record<string, string> = {
  natation: "hsl(200, 80%, 55%)",
  swim: "hsl(200, 80%, 55%)",
  vélo: "hsl(140, 60%, 45%)",
  velo: "hsl(140, 60%, 45%)",
  bike: "hsl(140, 60%, 45%)",
  cap: "hsl(25, 85%, 55%)",
  course: "hsl(25, 85%, 55%)",
  run: "hsl(25, 85%, 55%)",
  brick: "hsl(340, 70%, 55%)",
  brique: "hsl(340, 70%, 55%)",
  muscu: "hsl(270, 50%, 55%)",
  renfo: "hsl(270, 50%, 55%)",
  force: "hsl(270, 50%, 55%)",
  repos: "hsl(220, 10%, 60%)",
  rest: "hsl(220, 10%, 60%)",
};

function getSportColorHSL(sport: string): string {
  const s = sport.toLowerCase();
  for (const [key, color] of Object.entries(SPORT_COLORS)) {
    if (s.includes(key)) return color;
  }
  return "hsl(220, 15%, 50%)";
}

function normalizeSportName(sport: string): string {
  const s = sport.toLowerCase();
  if (s.includes("natation") || s.includes("swim") || s.includes("piscine")) return "Natation";
  if (s.includes("vélo") || s.includes("velo") || s.includes("bike") || s.includes("home trainer") || s.includes("ht")) return "Vélo";
  if (s.includes("cap") || s.includes("course") || s.includes("run") || s.includes("trail")) return "Course à pied";
  if (s.includes("brick") || s.includes("brique") || s.includes("enchaîn")) return "Brick";
  if (s.includes("muscu") || s.includes("force") || s.includes("renfo") || s.includes("gainage") || s.includes("plio")) return "Renforcement";
  if (s.includes("repos") || s.includes("rest") || s.includes("off")) return "Repos";
  return sport;
}

interface ChartDataPoint {
  label: string;
  total: number;
  [sport: string]: string | number;
}

function buildPhaseData(plan: ParsedPlan) {
  const phaseMap = new Map<string, Map<string, number>>();
  const allSports = new Set<string>();
  const orderedPhases: string[] = [];

  for (const week of plan.weeks) {
    const phase = week.phase || "Général";
    if (!phaseMap.has(phase)) {
      phaseMap.set(phase, new Map());
      orderedPhases.push(phase);
    }
    const sportMap = phaseMap.get(phase)!;
    for (const session of week.sessions) {
      if (session.isRest) continue;
      const normalized = normalizeSportName(session.sport);
      allSports.add(normalized);
      sportMap.set(normalized, (sportMap.get(normalized) || 0) + 1);
    }
  }

  const data: ChartDataPoint[] = orderedPhases.map(phase => {
    const sportMap = phaseMap.get(phase)!;
    const entry: ChartDataPoint = {
      label: phase.replace(/^(Phase|Bloc)\s*\d*\s*[:\-–—]\s*/i, "").slice(0, 25),
      total: 0,
    };
    for (const sport of allSports) {
      const val = sportMap.get(sport) || 0;
      entry[sport] = val;
      entry.total += val;
    }
    return entry;
  });

  return { data, sports: Array.from(allSports).filter(s => s !== "Repos").sort() };
}

function buildWeekData(plan: ParsedPlan) {
  const allSports = new Set<string>();

  const data: ChartDataPoint[] = plan.weeks.map(week => {
    const sportCounts = new Map<string, number>();
    for (const session of week.sessions) {
      if (session.isRest) continue;
      const normalized = normalizeSportName(session.sport);
      allSports.add(normalized);
      sportCounts.set(normalized, (sportCounts.get(normalized) || 0) + 1);
    }

    const entry: ChartDataPoint = {
      label: `S${week.weekNumber}`,
      total: 0,
    };
    for (const [sport, count] of sportCounts) {
      entry[sport] = count;
      entry.total += count;
    }
    return entry;
  });

  // Compute 3-week moving average for trend line
  for (let i = 0; i < data.length; i++) {
    const window = data.slice(Math.max(0, i - 1), Math.min(data.length, i + 2));
    const avg = window.reduce((sum, d) => sum + d.total, 0) / window.length;
    (data[i] as any).tendance = Math.round(avg * 10) / 10;
  }

  return { data, sports: Array.from(allSports).filter(s => s !== "Repos").sort() };
}

export function AIPlanVolumeChart({ plan }: { plan: ParsedPlan }) {
  const [view, setView] = useState<"week" | "block">("week");

  const phaseResult = useMemo(() => buildPhaseData(plan), [plan]);
  const weekResult = useMemo(() => buildWeekData(plan), [plan]);

  const { data: chartData, sports } = view === "week" ? weekResult : phaseResult;
  const showTrend = view === "week";

  if (chartData.length < 2) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Évolution des volumes par sport
          </CardTitle>
          <Tabs value={view} onValueChange={(v) => setView(v as "week" | "block")}>
            <TabsList className="h-7">
              <TabsTrigger value="week" className="text-xs px-2 py-0.5">Par semaine</TabsTrigger>
              <TabsTrigger value="block" className="text-xs px-2 py-0.5">Par bloc</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                interval={view === "week" && chartData.length > 16 ? 1 : 0}
                angle={view === "block" ? -20 : 0}
                textAnchor={view === "block" ? "end" : "middle"}
                height={view === "block" ? 60 : 30}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                label={{
                  value: "Séances",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "hsl(var(--popover-foreground))",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} iconSize={10} />
              {sports.map(sport => (
                <Bar
                  key={sport}
                  dataKey={sport}
                  stackId="a"
                  fill={getSportColorHSL(sport)}
                  radius={[0, 0, 0, 0]}
                />
              ))}
              {showTrend && (
                <Line
                  type="monotone"
                  dataKey="tendance"
                  name="Tendance charge"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  strokeDasharray="6 3"
                  dot={false}
                  legendType="line"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
