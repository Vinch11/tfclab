/**
 * SavedPlanCalendar — Calendar view of training_plan sessions saved from AI plans
 * Groups sessions by week with sport-colored cards + inline edit
 */
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar, ChevronLeft, ChevronRight, Trash2, Waves, Bike,
  Footprints, Moon, Dumbbell, Loader2, Pencil, AlertTriangle, Download,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, startOfWeek, addDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAthletes } from "@/contexts/AthleteContext";
import { toast } from "sonner";
import { SessionEditDialog } from "@/components/SessionEditDialog";
import { PlanHistory } from "@/components/PlanHistory";
import { exportSessionsToNolioZip, triggerBlobDownload } from "@/lib/nolioExport";

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

function getStatusBadge(status: string) {
  switch (status) {
    case "COMPLETED": return <Badge className="text-[9px] bg-green-500/15 text-green-700 dark:text-green-300">✅</Badge>;
    case "SKIPPED": return <Badge className="text-[9px] bg-red-500/15 text-red-700 dark:text-red-300">⏭️</Badge>;
    case "ADJUSTED": return <Badge className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-300">🔄</Badge>;
    default: return null;
  }
}

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function SavedPlanCalendar() {
  const { currentAthlete } = useAthletes();
  const [sessions, setSessions] = useState<TrainingPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editSession, setEditSession] = useState<TrainingPlanRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const fetchSessions = async () => {
    if (!currentAthlete) { setSessions([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("training_plan")
      .select("id, date, phase, custom_workout_title, custom_workout_description, status, notes, workout_id, adjusted")
      .eq("athlete_id", currentAthlete.id)
      .order("date", { ascending: true });
    if (error) { console.error(error); toast.error("Erreur chargement planning"); }
    setSessions((data as TrainingPlanRow[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSessions();
  }, [currentAthlete]);

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
    if (error) toast.error("Erreur suppression");
    else { setSessions(prev => prev.filter(s => s.id !== id)); toast.success("Séance supprimée"); }
    setDeleting(null);
  };

  const handleDeleteAll = async () => {
    if (!currentAthlete) return;
    setDeleting("all");
    const { error } = await supabase
      .from("training_plan")
      .delete()
      .eq("athlete_id", currentAthlete.id);
    if (error) toast.error("Erreur suppression du plan");
    else { setSessions([]); setWeekOffset(0); toast.success("Plan entièrement supprimé"); }
    setDeleting(null);
  };

  const handleEdit = (s: TrainingPlanRow) => {
    setEditSession(s);
    setEditOpen(true);
  };

  const handleSaved = (updated: any) => {
    setSessions(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
  };

  if (!currentAthlete) {
    return (
      <Card><CardContent className="p-6 text-center text-muted-foreground text-sm">
        Sélectionnez un athlète pour voir le planning.
      </CardContent></Card>
    );
  }

  if (loading) {
    return (
      <Card><CardContent className="p-6 space-y-3">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </CardContent></Card>
    );
  }

  if (allWeeks.length === 0) {
    return (
      <Card><CardContent className="p-6 text-center space-y-2">
        <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto" />
        <p className="text-sm text-muted-foreground">
          Aucune séance planifiée. Générez un plan IA et sauvegardez-le.
        </p>
      </CardContent></Card>
    );
  }

  // Count statuses
  const completed = sessions.filter(s => s.status === "COMPLETED").length;
  const skipped = sessions.filter(s => s.status === "SKIPPED").length;

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Planning Enregistré
            </CardTitle>
            <div className="flex items-center gap-2">
              {completed > 0 && <Badge variant="secondary" className="text-[10px]">✅ {completed}</Badge>}
              {skipped > 0 && <Badge variant="secondary" className="text-[10px]">⏭️ {skipped}</Badge>}
              <Badge variant="secondary" className="text-xs">
                {sessions.length} séances • {allWeeks.length} sem.
              </Badge>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="h-7 text-xs" disabled={deleting === "all"}>
                    {deleting === "all" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    Tout supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                      Supprimer tout le plan ?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action supprimera les {sessions.length} séances du planning. Cette action est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Supprimer tout
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Week navigation */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" disabled={weekOffset === 0} onClick={() => setWeekOffset(w => w - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Préc.
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
            <Button variant="ghost" size="sm" disabled={weekOffset >= allWeeks.length - 1} onClick={() => setWeekOffset(w => w + 1)}>
              Suiv. <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {/* Calendar grid */}
          {currentWeekData && (
            <div className="grid grid-cols-7 gap-1.5">
              {DAY_NAMES.map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
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
                          className={`rounded p-1.5 border text-xs group relative cursor-pointer ${getSportStyle(sport)}`}
                          onClick={() => handleEdit(s)}
                        >
                          <div className="flex items-center gap-1">
                            {getSportIcon(sport)}
                            <span className="font-medium truncate flex-1">{title}</span>
                            {getStatusBadge(s.status)}
                          </div>
                          {s.custom_workout_description && (
                            <p className="text-[10px] opacity-70 mt-0.5 line-clamp-2">{s.custom_workout_description}</p>
                          )}
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEdit(s); }}
                              className="p-0.5 rounded hover:bg-primary/20"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                              className="p-0.5 rounded hover:bg-destructive/20"
                              disabled={deleting === s.id}
                            >
                              {deleting === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 text-destructive" />}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground">
            Semaine {weekOffset + 1} / {allWeeks.length} • Cliquez sur une séance pour la modifier
          </p>

          <PlanHistory onRestored={() => { setWeekOffset(0); fetchSessions(); }} />
        </CardContent>
      </Card>

      <SessionEditDialog
        session={editSession}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={handleSaved}
      />
    </>
  );
}
