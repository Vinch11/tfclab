/**
 * PlanHistory — Shows archived plan versions with metadata
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAthletes } from "@/contexts/AthleteContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { History, Trash2, Loader2, Calendar } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface PlanVersion {
  id: string;
  objective: string | null;
  weeks_count: number | null;
  sessions_count: number | null;
  created_at: string;
}

export function PlanHistory() {
  const { currentAthlete } = useAthletes();
  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!currentAthlete || !open) return;
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("plan_versions")
        .select("id, objective, weeks_count, sessions_count, created_at")
        .eq("athlete_id", currentAthlete.id)
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      setVersions((data as PlanVersion[]) || []);
      setLoading(false);
    };
    fetch();
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

  if (!currentAthlete) return null;

  return (
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
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => handleDelete(v.id)}
                disabled={deleting === v.id}
              >
                {deleting === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3 text-destructive" />}
              </Button>
            </div>
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
