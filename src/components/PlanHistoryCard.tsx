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
import { Archive, Trash2, Loader2, Calendar, FileText, Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingRename, setSavingRename] = useState(false);

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

  const startEdit = (v: PlanVersion, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(v.id);
    setEditValue(v.plan_json?._label || "");
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
    setEditValue("");
  };

  const saveRename = async (v: PlanVersion, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavingRename(true);
    const newJson = { ...(v.plan_json || {}), _label: editValue.trim() || null };
    const { error } = await supabase
      .from("plan_versions")
      .update({ plan_json: newJson })
      .eq("id", v.id);
    if (error) {
      toast.error("Erreur renommage");
    } else {
      setVersions(prev => prev.map(p => p.id === v.id ? { ...p, plan_json: newJson } : p));
      toast.success("Version renommée");
      setEditingId(null);
      setEditValue("");
    }
    setSavingRename(false);
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
          versions.map(v => {
            const label = v.plan_json?._label as string | undefined;
            const dateStr = format(parseISO(v.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr });
            const isEditing = editingId === v.id;
            return (
              <div
                key={v.id}
                onClick={() => !isEditing && onLoadVersion(v)}
                className={`w-full flex items-center justify-between rounded-lg border border-border bg-card transition-colors p-3 ${isEditing ? "" : "cursor-pointer hover:bg-accent/50 hover:border-primary/40"}`}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <Input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveRename(v, e as any);
                          if (e.key === "Escape") cancelEdit(e as any);
                        }}
                        placeholder="Nom de la version…"
                        className="h-7 text-sm"
                      />
                    ) : (
                      <p className="text-sm font-medium truncate">
                        {label || dateStr}
                      </p>
                    )}
                    <div className="flex gap-1.5 mt-0.5 flex-wrap items-center">
                      {label && !isEditing && (
                        <span className="text-[10px] text-muted-foreground">{dateStr}</span>
                      )}
                      {v.objective && <Badge variant="secondary" className="text-[9px]">{v.objective}</Badge>}
                      {v.weeks_count && <Badge variant="secondary" className="text-[9px]">{v.weeks_count} sem.</Badge>}
                      {v.sessions_count && <Badge variant="secondary" className="text-[9px]">{v.sessions_count} séances</Badge>}
                    </div>
                  </div>
                </div>
                <div className="flex gap-0.5 shrink-0">
                  {isEditing ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => saveRename(v, e)}
                        disabled={savingRename}
                        title="Valider"
                      >
                        {savingRename ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-primary" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={cancelEdit}
                        disabled={savingRename}
                        title="Annuler"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => startEdit(v, e)}
                        title="Renommer"
                      >
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => handleDelete(v.id, e)}
                        disabled={deleting === v.id}
                        title="Supprimer cette version"
                      >
                        {deleting === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
