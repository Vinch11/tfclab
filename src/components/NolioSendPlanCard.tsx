/**
 * NolioSendPlanCard — Bouton + modale pour envoyer un plan IA vers Nolio.
 * Visible uniquement si l'athlète sélectionné a un `nolio_id` en base.
 *
 * Enrichit chaque séance avec :
 *   - structure (depuis la fiche bibliothèque)
 *   - wbalProfile (depuis la fiche bibliothèque) → converti en structured_workout côté edge
 *   - refs athlète (ftp/vma/css/fcMax depuis snapshot actif) pour calculs absolus
 */
import { useEffect, useMemo, useState } from "react";
import { format, addDays, startOfWeek, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import type { ParsedPlan } from "@/lib/aiPlanParser";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { getEffectiveRefs } from "@/lib/effectiveRefs";
import { findLibraryWorkoutForSession } from "@/lib/aiPlanWorkoutEnricher";
import { getTrailSessionAlternatives } from "@/lib/trailSessionAlternatives";

interface Props {
  athleteId: string;
  athleteName?: string;
  parsedPlan: ParsedPlan | null;
  planStartDate: Date;
}

function nextMonday(from: Date = new Date()): Date {
  const mon = startOfWeek(from, { weekStartsOn: 1 });
  return mon <= from ? addDays(mon, 7) : mon;
}

export function NolioSendPlanCard({ athleteId, athleteName, parsedPlan, planStartDate }: Props) {
  const { athletes, snapshots } = useCloudDataContext();
  const [nolioId, setNolioId] = useState<number | null>(null);
  const [loadingNolioId, setLoadingNolioId] = useState(true);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [startDateStr, setStartDateStr] = useState<string>(() =>
    format(planStartDate ?? nextMonday(), "yyyy-MM-dd"),
  );

  useEffect(() => {
    let cancelled = false;
    setLoadingNolioId(true);
    supabase
      .from("athletes")
      .select("nolio_id")
      .eq("id", athleteId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const raw = (data as { nolio_id?: number | null } | null)?.nolio_id;
        setNolioId(typeof raw === "number" ? raw : null);
        setLoadingNolioId(false);
      });
    return () => { cancelled = true; };
  }, [athleteId]);

  const refs = useMemo(() => {
    const athlete = athletes.find((a) => a.id === athleteId) ?? null;
    const r = getEffectiveRefs(athlete, snapshots);
    // Garde défensive : Nolio attend la CSS natation en secondes/100m (ex: 95 = 1:35/100m).
    // Si la valeur reçue est < 10, on l'interprète comme min/100m (ex: 1.58) et on convertit.
    const cssRaw = r.css;
    const cssSeconds = cssRaw == null
      ? null
      : cssRaw < 10
        ? Math.round(cssRaw * 60)
        : cssRaw;
    return {
      ftp: r.ftp,
      vma: r.vma,
      css: cssSeconds,
      fcMax: r.fcMax,
    };
  }, [athletes, snapshots, athleteId]);

  const sessions = useMemo(() => {
    if (!parsedPlan) return [];
    return (parsedPlan.weeks ?? []).flatMap((w) =>
      (w.sessions ?? []).map((s) => {
        const lib = findLibraryWorkoutForSession({ title: s.title, details: s.details });
        const alternatives = getTrailSessionAlternatives({
          sport: s.sport ?? lib?.sport ?? "",
          title: s.title,
          details: s.details,
        }).map((a) => ({ icon: a.icon, label: a.label, hint: a.hint }));
        return {
          weekNumber: s.weekNumber,
          dayIndex: s.dayIndex,
          sport: s.sport ?? lib?.sport ?? null,
          title: s.title,
          id: lib?.id ?? null,
          details: s.details,
          isRest: s.isRest,
          structure: lib?.structure ?? null,
          wbalProfile: lib?.wbalProfile ?? null,
          avoid: lib?.avoid ?? undefined,
          notes: lib?.notes ?? undefined,
          objectif: lib?.objectif ?? undefined,
          alternatives: alternatives.length > 0 ? alternatives : undefined,
        };
      }),
    );
  }, [parsedPlan]);

  const activeCount = sessions.filter((s) => !s.isRest && s.dayIndex >= 0).length;

  if (loadingNolioId) return null;

  if (nolioId == null) {
    return (
      <Card className="border-amber-300/50 bg-amber-50/40 dark:bg-amber-950/10">
        <CardContent className="p-4 flex items-start gap-3 text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
          <div>
            <p className="font-medium">Nolio — athlète non lié</p>
            <p className="text-muted-foreground">
              Athlète non lié à Nolio — synchroniser d'abord depuis la page Configuration.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  async function handleSend() {
    if (!parsedPlan) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("nolio-send-plan", {
        body: {
          athlete_id: athleteId,
          nolio_athlete_id: nolioId,
          planStartDate: startDateStr,
          sessions,
          refs,
        },
      });
      if (error) throw error;
      const sent = (data as { sent?: number; errors?: unknown[] } | null)?.sent ?? 0;
      const errs = (data as { errors?: { status: number; detail?: string }[] } | null)?.errors ?? [];
      if (errs.length > 0 && sent === 0) {
        toast.error(`Échec Nolio — ${errs[0].status} ${errs[0].detail ?? ""}`.slice(0, 200));
      } else if (errs.length > 0) {
        toast.warning(`${sent} séances envoyées, ${errs.length} échecs (ex: ${errs[0].status})`);
      } else {
        toast.success(`${sent} séances envoyées vers Nolio`);
      }
      setOpen(false);
    } catch (e) {
      toast.error(`Erreur Nolio : ${(e as Error).message ?? "inconnue"}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-medium">Nolio — athlète lié (id #{nolioId})</p>
            <p className="text-muted-foreground">
              Envoyer les {activeCount} séances planifiées (hors repos) sur le compte Nolio de l'athlète.
            </p>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} disabled={!parsedPlan || activeCount === 0}>
          <Send className="h-4 w-4 mr-2" />
          Envoyer tout vers Nolio
        </Button>
      </CardContent>

      <Dialog open={open} onOpenChange={(v) => !sending && setOpen(v)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envoyer le plan vers Nolio</DialogTitle>
            <DialogDescription>
              Confirme les paramètres d'envoi. Les séances déjà envoyées (même
              <code className="px-1">id_partner</code>) ne seront pas dupliquées.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Athlète</span>
              <span className="font-medium">{athleteName ?? "—"}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Séances à envoyer</span>
              <span className="font-medium">{activeCount} (hors repos)</span>
            </div>
            <div className="flex justify-between border-b pb-2 text-xs text-muted-foreground">
              <span>Refs athlète</span>
              <span>
                FTP {refs.ftp ?? "—"}W · VMA {refs.vma ?? "—"}km/h · CSS {refs.css ?? "—"}s/100 · FCmax {refs.fcMax ?? "—"}
              </span>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nolio-start-date">Cette semaine commence le :</Label>
              <Input
                id="nolio-start-date"
                type="date"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                → Semaine 1 du plan débutera le{" "}
                <span className="font-medium text-foreground">
                  {(() => {
                    try { return format(parseISO(`${startDateStr}T00:00:00Z`), "EEEE d MMMM yyyy", { locale: fr }); }
                    catch { return startDateStr; }
                  })()}
                </span>
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={sending}>
              Annuler
            </Button>
            <Button onClick={handleSend} disabled={sending || activeCount === 0}>
              {sending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Envoi en cours…</>
              ) : (
                <><Send className="h-4 w-4 mr-2" /> Confirmer l'envoi</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
