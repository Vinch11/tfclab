/**
 * AIPlanComparison — Side-by-side comparison of AI-generated plans for multiple athletes
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, Zap, Calendar, Dumbbell, Waves, Bike, Footprints,
  BarChart3, Target, TrendingUp,
} from "lucide-react";
import type { ParsedPlan, ParsedWeek } from "@/lib/aiPlanParser";

interface AthletePlanEntry {
  athleteId: string;
  athleteName: string;
  objective: string;
  ambition: string;
  limiterLabel?: string;
  limiterEmoji?: string;
  leverLabel?: string;
  leverEmoji?: string;
  parsedPlan: ParsedPlan;
}

interface AIPlanComparisonProps {
  plans: AthletePlanEntry[];
}

function countSessionsBySport(plan: ParsedPlan): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const week of plan.weeks) {
    for (const session of week.sessions) {
      if (session.isRest) continue;
      const sport = session.sport.toLowerCase();
      let key = "Autre";
      if (sport.includes("natation") || sport.includes("swim")) key = "Natation";
      else if (sport.includes("vélo") || sport.includes("velo") || sport.includes("bike")) key = "Vélo";
      else if (sport.includes("cap") || sport.includes("course") || sport.includes("run")) key = "Course";
      else if (sport.includes("muscu") || sport.includes("force") || sport.includes("renfo")) key = "Renfo";
      else if (sport.includes("brick")) key = "Brick";
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  return counts;
}

function getSportColorClass(sport: string): string {
  if (sport === "Natation") return "bg-blue-500/15 text-blue-700 dark:text-blue-300";
  if (sport === "Vélo") return "bg-green-500/15 text-green-700 dark:text-green-300";
  if (sport === "Course") return "bg-orange-500/15 text-orange-700 dark:text-orange-300";
  if (sport === "Renfo") return "bg-purple-500/15 text-purple-700 dark:text-purple-300";
  if (sport === "Brick") return "bg-amber-500/15 text-amber-700 dark:text-amber-300";
  return "bg-muted text-muted-foreground";
}

function PhaseTimeline({ plan, color }: { plan: ParsedPlan; color: string }) {
  return (
    <div className="flex gap-0.5 w-full">
      {plan.weeks.map((w, i) => (
        <div
          key={i}
          className={`h-3 flex-1 rounded-sm ${color} opacity-70`}
          title={`S${w.weekNumber}: ${w.phase} — ${w.theme}`}
        />
      ))}
    </div>
  );
}

const ATHLETE_COLORS = [
  "border-blue-500/50 bg-blue-500/5",
  "border-green-500/50 bg-green-500/5",
  "border-purple-500/50 bg-purple-500/5",
  "border-orange-500/50 bg-orange-500/5",
  "border-pink-500/50 bg-pink-500/5",
];

export function AIPlanComparison({ plans }: AIPlanComparisonProps) {
  const allSports = useMemo(() => {
    const sports = new Set<string>();
    plans.forEach(p => {
      const counts = countSessionsBySport(p.parsedPlan);
      Object.keys(counts).forEach(s => sports.add(s));
    });
    return Array.from(sports).sort();
  }, [plans]);

  if (plans.length < 2) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Comparaison des Plans ({plans.length} athlètes)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overview Table */}
        <ScrollArea className="w-full">
          <div className="min-w-[600px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium w-[140px]">Athlète</th>
                  {plans.map((p, i) => (
                    <th key={p.athleteId} className={`text-center py-2 px-3 font-semibold rounded-t-md ${ATHLETE_COLORS[i % ATHLETE_COLORS.length]}`}>
                      {p.athleteName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Objective */}
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 text-muted-foreground flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" /> Objectif
                  </td>
                  {plans.map(p => (
                    <td key={p.athleteId} className="py-2 px-3 text-center">
                      <Badge variant="secondary" className="text-[10px]">{p.objective}</Badge>
                    </td>
                  ))}
                </tr>
                {/* Ambition */}
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5" /> Ambition
                  </td>
                  {plans.map(p => (
                    <td key={p.athleteId} className="py-2 px-3 text-center">
                      <Badge variant="outline" className="text-[10px]">{p.ambition}</Badge>
                    </td>
                  ))}
                </tr>
                {/* Limiter */}
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 text-muted-foreground flex items-center gap-1">
                    <Zap className="h-3.5 w-3.5" /> Limiteur
                  </td>
                  {plans.map(p => (
                    <td key={p.athleteId} className="py-2 px-3 text-center">
                      {p.limiterLabel ? (
                        <Badge variant="destructive" className="text-[10px]">
                          {p.limiterEmoji} {p.limiterLabel}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                {/* Lever */}
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 text-muted-foreground">Levier</td>
                  {plans.map(p => (
                    <td key={p.athleteId} className="py-2 px-3 text-center">
                      {p.leverLabel ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {p.leverEmoji} {p.leverLabel}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                {/* Duration */}
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Semaines
                  </td>
                  {plans.map(p => (
                    <td key={p.athleteId} className="py-2 px-3 text-center font-semibold">
                      {p.parsedPlan.totalWeeks}
                    </td>
                  ))}
                </tr>
                {/* Phases */}
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 text-muted-foreground">Phases</td>
                  {plans.map(p => (
                    <td key={p.athleteId} className="py-2 px-3 text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {p.parsedPlan.phases.map((ph, i) => (
                          <Badge key={i} variant="outline" className="text-[9px]">
                            {ph.name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
                {/* Sport Distribution */}
                {allSports.map(sport => (
                  <tr key={sport} className="border-b border-border/50">
                    <td className="py-2 px-3 text-muted-foreground flex items-center gap-1">
                      <BarChart3 className="h-3.5 w-3.5" /> {sport}
                    </td>
                    {plans.map(p => {
                      const counts = countSessionsBySport(p.parsedPlan);
                      const total = Object.values(counts).reduce((a, b) => a + b, 0);
                      const count = counts[sport] || 0;
                      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <td key={p.athleteId} className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Badge className={`text-[10px] ${getSportColorClass(sport)}`}>
                              {count} ({pct}%)
                            </Badge>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Total sessions */}
                <tr>
                  <td className="py-2 px-3 text-muted-foreground font-medium">Total séances</td>
                  {plans.map(p => {
                    const total = p.parsedPlan.weeks.reduce(
                      (acc, w) => acc + w.sessions.filter(s => !s.isRest).length,
                      0
                    );
                    return (
                      <td key={p.athleteId} className="py-2 px-3 text-center font-bold text-primary">
                        {total}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Week-by-Week Comparison */}
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground">Comparaison semaine par semaine</h4>
          <ScrollArea className="w-full">
            <div className="min-w-[600px] space-y-1">
              {/* Header row */}
              <div className="grid gap-2" style={{ gridTemplateColumns: `100px repeat(${plans.length}, 1fr)` }}>
                <div className="text-xs text-muted-foreground py-1">Semaine</div>
                {plans.map((p, i) => (
                  <div key={p.athleteId} className={`text-xs font-semibold text-center py-1 rounded ${ATHLETE_COLORS[i % ATHLETE_COLORS.length]}`}>
                    {p.athleteName}
                  </div>
                ))}
              </div>

              {/* Week rows */}
              {Array.from({ length: Math.max(...plans.map(p => p.parsedPlan.weeks.length)) }, (_, weekIdx) => (
                <div
                  key={weekIdx}
                  className="grid gap-2 border-b border-border/30 py-1"
                  style={{ gridTemplateColumns: `100px repeat(${plans.length}, 1fr)` }}
                >
                  <div className="text-xs text-muted-foreground flex items-center">
                    S{weekIdx + 1}
                  </div>
                  {plans.map(p => {
                    const week = p.parsedPlan.weeks[weekIdx];
                    if (!week) return <div key={p.athleteId} className="text-xs text-muted-foreground text-center">—</div>;
                    const activeSessions = week.sessions.filter(s => !s.isRest).length;
                    return (
                      <div key={p.athleteId} className="text-center">
                        <div className="text-[10px] text-muted-foreground truncate" title={week.theme}>
                          {week.phase}
                        </div>
                        <div className="text-[10px] font-medium">{activeSessions} séances</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
