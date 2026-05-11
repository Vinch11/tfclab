/**
 * PlanHistoryCard — Affiche l'historique des plans IA sauvegardés pour l'athlète courant.
 * Cliquer sur une version la charge dans la vue (sans toucher au planning).
 */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAthletes } from "@/contexts/AthleteContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Archive, Trash2, Loader2, Calendar, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface PlanVersion {
  id: string;
  plan_json: any;
  objective: string | null;
  weeks_count: number | null;
  sessions_count: number | null;
  created_at: string;
}

interface Props {
  refreshKey?: number;
  onLoadVersion: (v: PlanVersion) => void;
}

export function PlanHistoryCard({ refreshKey = 0, onLoadVersion }: Props) {
  const { currentAthlete } = useAthletes();
  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!currentAthlete) return;
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
  }, [currentAthlete, refreshKey]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Archive className="h-4 w-4 text-primary" />
          Historique des plans sauvegardés
          {versions.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-[10px]">
              {versions.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </>
        ) : versions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Aucune sauvegarde pour le moment. Les plans que vous sauvegarderez apparaîtront ici.
          </p>
        ) : (
          versions.map(v => (
            <button
              key={v.id}
              onClick={() => onLoadVersion(v)}
              className="w-full text-left flex items-center justify-between rounded-lg border border-border bg-card hover:bg-accent/50 hover:border-primary/40 transition-colors p-3"
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {format(parseISO(v.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
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
                className="h-8 w-8 shrink-0"
                onClick={(e) => handleDelete(v.id, e)}
                disabled={deleting === v.id}
                title="Supprimer cette version"
              >
                {deleting === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
              </Button>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
