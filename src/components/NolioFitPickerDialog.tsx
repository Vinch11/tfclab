/**
 * Sélecteur de séance Nolio réalisée — liste les dernières séances de
 * l'athlète (via nolio-training-probe) et télécharge le .fit choisi (via
 * nolio-download-fit) pour l'injecter directement dans le pipeline
 * d'analyse FIT existant (FitImportDialog), sans passer par un export/
 * import manuel.
 */
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface NolioRealizedSession {
  nolio_id: number;
  name?: string;
  date_start?: string;
  hour_start?: string;
  sport?: string;
  duration?: number;
  distance?: number;
  avg_watt?: number;
  max_watt?: number;
}

interface NolioFitPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nolioAthleteId: number | null;
  onFileReady: (file: File) => void;
}

function formatDuration(sec?: number): string {
  if (!sec || sec <= 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${m} min`;
}

async function readInvokeError(e: unknown): Promise<string> {
  const context = (e as { context?: Response }).context;
  if (context) {
    try {
      const body = await context.clone().json();
      if (body?.error) return body.error as string;
    } catch {
      // corps non-JSON (ex: octet-stream renvoyé sur une erreur inattendue)
    }
  }
  return (e as Error).message ?? "inconnue";
}

export function NolioFitPickerDialog({
  open,
  onOpenChange,
  nolioAthleteId,
  onFileReady,
}: NolioFitPickerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<NolioRealizedSession[] | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const loadSessions = useCallback(async () => {
    if (!nolioAthleteId) return;
    setLoading(true);
    setSessions(null);
    try {
      const { data, error } = await supabase.functions.invoke("nolio-training-probe", {
        body: { nolio_athlete_id: nolioAthleteId, limit: 15 },
      });
      if (error) throw error;
      const items = (data as { raw_items?: NolioRealizedSession[] } | null)?.raw_items ?? [];
      setSessions(items);
    } catch (e) {
      const detail = await readInvokeError(e);
      toast.error(`Erreur lecture Nolio : ${detail}`);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [nolioAthleteId]);

  useEffect(() => {
    if (open) loadSessions();
  }, [open, loadSessions]);

  async function handleImport(session: NolioRealizedSession) {
    if (!nolioAthleteId) return;
    setDownloadingId(session.nolio_id);
    try {
      const { data, error } = await supabase.functions.invoke("nolio-download-fit", {
        body: { nolio_athlete_id: nolioAthleteId, training_id: session.nolio_id },
      });
      if (error) throw error;
      if (!(data instanceof Blob)) throw new Error("Réponse inattendue (pas un fichier)");
      const file = new File([data], `nolio-${session.nolio_id}.fit`, { type: "application/octet-stream" });
      onFileReady(file);
      onOpenChange(false);
    } catch (e) {
      const detail = await readInvokeError(e);
      toast.error(`Erreur téléchargement : ${detail}`);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>Importer depuis Nolio</span>
            <Button variant="ghost" size="icon" onClick={loadSessions} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Choisissez une séance réalisée récente — le fichier .fit correspondant sera téléchargé et analysé automatiquement.
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="py-8 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Lecture des séances Nolio...</p>
          </div>
        )}

        {!loading && sessions && sessions.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Aucune séance réalisée trouvée récemment sur Nolio pour cet athlète.
          </p>
        )}

        {!loading && sessions && sessions.length > 0 && (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.nolio_id}
                className="flex items-center justify-between gap-3 rounded-md border border-border/40 p-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium truncate">{s.name ?? s.sport ?? "Séance"}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.date_start ? new Date(s.date_start).toLocaleDateString("fr-FR") : "—"}
                    {s.hour_start ? ` · ${s.hour_start.slice(0, 5)}` : ""}
                    {" · "}
                    {formatDuration(s.duration)}
                    {s.distance ? ` · ${s.distance.toFixed(1)} km` : ""}
                    {s.avg_watt ? ` · ${s.avg_watt}W moy` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={downloadingId !== null}
                  onClick={() => handleImport(s)}
                >
                  {downloadingId === s.nolio_id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
