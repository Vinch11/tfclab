/**
 * AIPlanVolumeChart — Stacked area chart showing volume evolution by sport across blocks/weeks
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleCard } from "@/components/ui/collapsible-card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
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
  if (s.includes("natation") || s.includes("swim")) return "Natation";
  if (s.includes("vélo") || s.includes("velo") || s.includes("bike")) return "Vélo";
  if (s.includes("cap") || s.includes("course") || s.includes("run")) return "Course à pied";
  if (s.includes("brick") || s.includes("brique")) return "Brick";
  if (s.includes("muscu") || s.includes("force") || s.includes("renfo")) return "Renforcement";
  if (s.includes("repos") || s.includes("rest")) return "Repos";
  return sport;
}

interface PhaseVolumeData {
  phase: string;
  [sport: string]: string | number;
}

export function AIPlanVolumeChart({ plan }: { plan: ParsedPlan }) {
  const { chartData, sports } = useMemo(() => {
    // Group weeks by phase
    const phaseMap = new Map<string, Map<string, number>>();
    const allSports = new Set<string>();

    for (const week of plan.weeks) {
      const phase = week.phase || "Général";
      if (!phaseMap.has(phase)) phaseMap.set(phase, new Map());
      const sportMap = phaseMap.get(phase)!;

      for (const session of week.sessions) {
        if (session.isRest) continue;
        const normalized = normalizeSportName(session.sport);
        allSports.add(normalized);
        sportMap.set(normalized, (sportMap.get(normalized) || 0) + 1);
      }
    }

    // Build chart data preserving phase order
    const orderedPhases: string[] = [];
    for (const week of plan.weeks) {
      const phase = week.phase || "Général";
      if (!orderedPhases.includes(phase)) orderedPhases.push(phase);
    }

    const data: PhaseVolumeData[] = orderedPhases.map(phase => {
      const sportMap = phaseMap.get(phase)!;
      const entry: PhaseVolumeData = { phase: phase.replace(/^(Phase|Bloc)\s*\d+\s*[:\-–—]\s*/i, "").slice(0, 25) };
      for (const sport of allSports) {
        entry[sport] = sportMap.get(sport) || 0;
      }
      return entry;
    });

    const sortedSports = Array.from(allSports).filter(s => s !== "Repos").sort();

    return { chartData: data, sports: sortedSports };
  }, [plan]);

  if (chartData.length < 2) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Évolution des volumes par sport et bloc
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis
                dataKey="phase"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                label={{ value: "Séances", angle: -90, position: "insideLeft", style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" } }}
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
              <Legend
                wrapperStyle={{ fontSize: "11px" }}
                iconSize={10}
              />
              {sports.map(sport => (
                <Bar
                  key={sport}
                  dataKey={sport}
                  stackId="a"
                  fill={getSportColorHSL(sport)}
                  radius={[0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
