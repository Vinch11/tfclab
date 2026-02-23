/**
 * SavedPlanCalendar — Calendar view of training_plan sessions saved from AI plans
 * Groups sessions by week with sport-colored cards
 */
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar, ChevronLeft, ChevronRight, Trash2, Waves, Bike,
  Footprints, Moon, Dumbbell, Loader2, AlertTriangle,
} from "lucide-react";
import { format, startOfWeek, addDays, isSameWeek, parseISO, isAfter, isBefore } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAthletes } from "@/contexts/AthleteContext";
import { toast } from "sonner";

interface TrainingPlanRow {
  id: string;
  date: string;
  phase: string | null;
  custom_workout_title: string | null;
  custom_workout_description: string | null;
  status: string;
  notes: string | null;
  workout_id: string | null;
  adjusted: boolean;
}

function getSportFromTitle(title: string | null): string {
  if (!title) return "autre";
  const t = title.toLowerCase();
  if (t.includes("natation") || t.includes("swim")) return "natation";
  if (t.includes("vélo") || t.includes("velo") || t.includes("bike")) return "vélo";
  if (t.includes("cap") || t.includes("course") || t.includes("run")) return "course";
  if (t.includes("repos") || t.includes("rest")) return "repos";
  if (t.includes("muscu") || t.includes("force") || t.includes("renfo")) return "force";
  if (t.includes("brick")) return "brick";
  return "autre";
}

function getSportIcon(sport: string) {
  switch (sport) {
    case "natation": return <Waves className="h-3.5 w-3.5" />;
    case "vélo": return <Bike className="h-3.5 w-3.5" />;
    case "course": return <Footprints className="h-3.5 w-3.5" />;
    case "repos": return <Moon className="h-3.5 w-3.5" />;
    case "force": return <Dumbbell className="h-3.5 w-3.5" />;
    default: return <Dumbbell className="h-3.5 w-3.5" />;
  }
}

function getSportStyle(sport: string): string {
  switch (sport) {
    case "natation": return "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30";
    case "vélo": return "bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30";
    case "course": return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30";
    case "repos": return "bg-muted text-muted-foreground border-border";
    case "brick": return "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30";
    default: return "bg-muted text-muted-foreground border-border";
  }
}

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function SavedPlanCalendar() {
  const { currentAthlete } = useAthletes();
  const [sessions, setSessions] = useState<TrainingPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Fetch sessions
  useEffect(() => {
    if (!currentAthlete) {
      setSessions([]);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("training_plan")
        .select("id, date, phase, custom_workout_title, custom_workout_description, status, notes, workout_id, adjusted")
        .eq("athlete_id", currentAthlete.id)
        .order("date", { ascending: true });

      if (error) {
        console.error("Fetch training plan error:", error);
        toast.error("Erreur chargement du planning");
      }
      setSessions((data as TrainingPlanRow[]) || []);
      setLoading(false);
    };
    fetch();
  }, [currentAthlete]);

  // Compute visible weeks
  const allWeeks = useMemo(() => {
    if (sessions.length === 0) return [];
    const weekMap = new Map<string, { weekStart: Date; sessions: TrainingPlanRow[] }>();

    for (const s of sessions) {
      const d = parseISO(s.date);
      const ws = startOfWeek(d, { weekStartsOn: 1 });
      const key = format(ws, "yyyy-MM-dd");
      if (!weekMap.has(key)) weekMap.set(key, { weekStart: ws, sessions: [] });
      weekMap.get(key)!.sessions.push(s);
    }

    return Array.from(weekMap.values()).sort((a, b) => a.weekStart.getTime() - b.weekStart.getTime());
  }, [sessions]);

  const currentWeekData = allWeeks[weekOffset] || null;

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from("training_plan").delete().eq("id", id);
    if (error) {
      toast.error("Erreur suppression");
    } else {
      setSessions(prev => prev.filter(s => s.id !== id));
      toast.success("Séance supprimée");
    }
    setDeleting(null);
  };

  if (!currentAthlete) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground text-sm">
          Sélectionnez un athlète pour voir le planning.
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allWeeks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-2">
          <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">
            Aucune séance planifiée. Générez un plan IA et sauvegardez-le pour le voir ici.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Planning Enregistré
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {sessions.length} séances • {allWeeks.length} semaines
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Week navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost" size="sm"
            disabled={weekOffset === 0}
            onClick={() => setWeekOffset(w => w - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Sem. préc.
          </Button>
          <div className="text-center">
            {currentWeekData && (
              <>
                <p className="text-sm font-semibold">
                  {format(currentWeekData.weekStart, "d MMM", { locale: fr })} — {format(addDays(currentWeekData.weekStart, 6), "d MMM yyyy", { locale: fr })}
                </p>
                {currentWeekData.sessions[0]?.phase && (
                  <p className="text-xs text-muted-foreground">{currentWeekData.sessions[0].phase}</p>
                )}
              </>
            )}
          </div>
          <Button
            variant="ghost" size="sm"
            disabled={weekOffset >= allWeeks.length - 1}
            onClick={() => setWeekOffset(w => w + 1)}
          >
            Sem. suiv. <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Calendar grid */}
        {currentWeekData && (
          <div className="grid grid-cols-7 gap-1.5">
            {/* Day headers */}
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}

            {/* Day cells */}
            {Array.from({ length: 7 }).map((_, dayIdx) => {
              const cellDate = addDays(currentWeekData.weekStart, dayIdx);
              const daySessions = currentWeekData.sessions.filter(
                s => format(parseISO(s.date), "yyyy-MM-dd") === format(cellDate, "yyyy-MM-dd")
              );
              const isToday = format(cellDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

              return (
                <div
                  key={dayIdx}
                  className={`min-h-[100px] rounded-lg border p-1.5 space-y-1 ${
                    isToday ? "border-primary bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <p className={`text-xs font-mono ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                    {format(cellDate, "d")}
                  </p>
                  {daySessions.map(s => {
                    const sport = getSportFromTitle(s.custom_workout_title);
                    const title = s.custom_workout_title?.replace(/^[^—]+—\s*/, "") || "Séance";
                    return (
                      <div
                        key={s.id}
                        className={`rounded p-1.5 border text-xs group relative ${getSportStyle(sport)}`}
                      >
                        <div className="flex items-center gap-1">
                          {getSportIcon(sport)}
                          <span className="font-medium truncate flex-1">{title}</span>
                        </div>
                        {s.custom_workout_description && (
                          <p className="text-[10px] opacity-70 mt-0.5 line-clamp-2">{s.custom_workout_description}</p>
                        )}
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/20"
                          disabled={deleting === s.id}
                        >
                          {deleting === s.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3 text-destructive" />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* Week counter */}
        <p className="text-xs text-center text-muted-foreground">
          Semaine {weekOffset + 1} / {allWeeks.length}
        </p>
      </CardContent>
    </Card>
  );
}
