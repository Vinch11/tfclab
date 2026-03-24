/**
 * PlanHistory — Shows archived plan versions with restore & delete
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAthletes } from "@/contexts/AthleteContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Trash2, Loader2, Calendar, RotateCcw } from "lucide-react";
import { format, parseISO, startOfWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

interface PlanVersion {
  id: string;
  plan_json: any;
  objective: string | null;
  weeks_count: number | null;
  sessions_count: number | null;
  created_at: string;
}

interface PlanHistoryProps {
  onRestored?: () => void;
}

export function PlanHistory({ onRestored }: PlanHistoryProps) {
  const { currentAthlete } = useAthletes();
  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<PlanVersion | null>(null);
  const [restoreStartDate, setRestoreStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));

  useEffect(() => {
    if (!currentAthlete || !open) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("plan_versions")
        .select("id, plan_json, objective, weeks_count, sessions_count, created_at")
        .eq("athlete_id", currentAthlete.id)
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      setVersions((data as PlanVersion[]) || []);
      setLoading(false);
    };
    load();
  }, [currentAthlete, open]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from("plan_versions").delete().eq("id", id);
    if (error) toast.error("Erreur suppression");
    else {
      setVersions(prev => prev.filter(v => v.id !== id));
      toast.success("Version supprimée");
    }
    setDeleting(null);
  };

  const handleRestore = async (version: PlanVersion) => {
    if (!currentAthlete) return;
    setRestoring(version.id);
    setConfirmRestore(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const plan = version.plan_json;
      if (!plan?.weeks?.length) throw new Error("Plan invalide");

      const phaseMap: Record<string, string> = {
        base: "BASE", build: "PHASE2", peak: "PHASE3",
        taper: "PHASE4", race: "RACE", off: "OFF",
      };

      // Rebuild rows from archived plan_json
      const planStart = startOfWeek(restoreStartDate, { weekStartsOn: 1 });
      const rows: any[] = [];

      for (const week of plan.weeks) {
        const weekStart = addDays(planStart, ((week.weekNumber || 1) - 1) * 7);
        for (const session of week.sessions || []) {
          if (session.isRest) continue;
          const dayOffset = session.day != null ? session.day - 1 : 0;
          const sessionDate = addDays(weekStart, dayOffset);
          rows.push({
            athlete_id: currentAthlete.id,
            coach_id: user.id,
            date: format(sessionDate, "yyyy-MM-dd"),
            phase: session.phase ? (phaseMap[session.phase.toLowerCase()] || "BASE") : null,
            custom_workout_title: `${session.sport || "Autre"} — ${session.title || "Séance"}`,
            custom_workout_description: session.details || null,
            status: "PLANNED",
            notes: week.theme ? `Semaine ${week.weekNumber}: ${week.theme}` : null,
          });
        }
      }

      if (rows.length === 0) throw new Error("Aucune séance dans ce plan");

      // Delete all current sessions for this athlete
      await supabase
        .from("training_plan")
        .delete()
        .eq("athlete_id", currentAthlete.id);

      const { error } = await supabase.from("training_plan").insert(rows);
      if (error) throw error;

      toast.success(`Plan restauré : ${rows.length} séances à partir de cette semaine`);
      onRestored?.();
    } catch (err: any) {
      console.error("Restore error:", err);
      toast.error("Erreur restauration : " + (err.message || "Inconnu"));
    } finally {
      setRestoring(null);
    }
  };

  if (!currentAthlete) return null;

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground">
            <History className="h-3.5 w-3.5" />
            Historique des plans
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-2">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : versions.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              Aucun historique disponible. Les prochains plans sauvegardés apparaîtront ici.
            </p>
          ) : (
            versions.map(v => (
              <div key={v.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-2.5 text-xs">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {format(parseISO(v.created_at), "d MMM yyyy HH:mm", { locale: fr })}
                    </p>
                    <div className="flex gap-1.5 mt-0.5 flex-wrap">
                      {v.objective && <Badge variant="secondary" className="text-[9px]">{v.objective}</Badge>}
                      {v.weeks_count && <Badge variant="secondary" className="text-[9px]">{v.weeks_count} sem.</Badge>}
                      {v.sessions_count && <Badge variant="secondary" className="text-[9px]">{v.sessions_count} séances</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setConfirmRestore(v)}
                    disabled={restoring === v.id}
                    title="Restaurer ce plan"
                  >
                    {restoring === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3 text-primary" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDelete(v.id)}
                    disabled={deleting === v.id}
                    title="Supprimer cette version"
                  >
                    {deleting === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 text-destructive" />}
                  </Button>
                </div>
              </div>
            ))
          )}
        </CollapsibleContent>
      </Collapsible>

      <AlertDialog open={!!confirmRestore} onOpenChange={(o) => !o && setConfirmRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              Restaurer ce plan ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Le planning actuel sera remplacé par cette version
              {confirmRestore && (
                <span className="font-medium">
                  {" "}du {format(parseISO(confirmRestore.created_at), "d MMM yyyy", { locale: fr })}
                </span>
              )}
              . Les séances seront repositionnées à partir de cette semaine.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmRestore && handleRestore(confirmRestore)}>
              Restaurer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
