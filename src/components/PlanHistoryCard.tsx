import {Link} from 'react-router-dom';
import {QA_PLANNING_ORIGIN} from '@/lib/plan/engineDispatch';
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
import { Archive, Trash2, Loader2, Calendar, FileText, Pencil, Check, X, RotateCcw } from "lucide-react";
import { AppendOnlyPlanVersionSaver, READBACK_COLUMNS, type PlanVersionRow } from "@/lib/plan/appendOnlyPlanVersionSave";
import { RESTORE_MESSAGES, restoreVersionAsCurrent, saveRenamedVersion, supabaseCurrentPlanPorts, supabasePlanVersionTransport } from "@/lib/plan/planVersionEdits";
import { Input } from "@/components/ui/input";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface PlanVersion extends PlanVersionRow {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  plan_json: any;
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
  const [restoring, setRestoring] = useState<string | null>(null);
  const [saver] = useState(() => new AppendOnlyPlanVersionSaver({ transport: supabasePlanVersionTransport(supabase) }));

  useEffect(() => {
    if (!currentAthlete) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("plan_versions")
        .select(`${READBACK_COLUMNS},created_at`)
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

  // Versions IMMUABLES : renommer crée une nouvelle version (append-only),
  // l'ancienne ligne et sa provenance stockée restent intactes.
  const saveRename = async (v: PlanVersion, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavingRename(true);
    try {
      const { created_at: _c, ...stored } = v;
      const r = await saveRenamedVersion(saver, stored, editValue.trim() || null);
      if (r.status === "CONFIRMED") {
        toast.success("Nouvelle version enregistrée (l'ancienne est conservée)");
        setEditingId(null); setEditValue("");
        const { data } = await supabase.from("plan_versions").select(`${READBACK_COLUMNS},created_at`).eq("athlete_id", v.athlete_id).order("created_at", { ascending: false });
        if (data) setVersions(data as unknown as PlanVersion[]);
      } else if (r.status === "UNKNOWN") toast.warning("Enregistrement incertain : rechargez l'historique avant de réessayer.");
      else toast.error(`Nouvelle version non enregistrée (${r.status})`);
    } finally { setSavingRename(false); }
  };

  const restoreAsCurrent = async (v: PlanVersion, e: React.MouseEvent) => {
    e.stopPropagation();
    if (restoring) return;
    setRestoring(v.id);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user || u.user.id !== v.coach_id) { toast.error("Session non vérifiée : rien n'a été modifié."); return; }
      const { created_at: _c, ...stored } = v;
      const r = await restoreVersionAsCurrent({ ports: supabaseCurrentPlanPorts(supabase), saver, coachId: u.user.id, athleteId: v.athlete_id, version: stored });
      const msg = RESTORE_MESSAGES[r.status];
      if (r.status === "CONFIRMED" || r.status === "ALREADY_CURRENT") toast.success(msg);
      else if (r.status === "PARTIAL_CURRENT_UNKNOWN" || r.status === "NOT_STARTED") toast.warning(msg);
      else toast.error(msg);
    } finally { setRestoring(null); }
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
                          if (e.key === "Enter") saveRename(v, e as unknown as React.MouseEvent);
                          if (e.key === "Escape") cancelEdit(e as unknown as React.MouseEvent);
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
                      {(import.meta.env.DEV||window.location.origin===QA_PLANNING_ORIGIN)&&v.plan_json?._provenance?.engine&&<Button asChild variant="outline" size="sm"><Link onClick={e=>e.stopPropagation()} to={"/__qa/pilot-review?planVersionId="+encodeURIComponent(v.id)}>Préparer l’export Nolio</Link></Button>}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => restoreAsCurrent(v, e)}
                        disabled={restoring !== null}
                        title="Définir comme plan courant"
                        aria-label="Définir comme plan courant"
                      >
                        {restoring === v.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5 text-muted-foreground" />}
                      </Button>
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
