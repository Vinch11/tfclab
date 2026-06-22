/**
 * NolioSessionButton — Bouton "→ Nolio" par séance (envoi unitaire).
 * Discret, ouvre une mini-modale de confirmation avec date pré-remplie.
 */
import { useState, useMemo, type MouseEvent } from "react";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { WeekPicker, mondayOf } from "@/components/ui/week-picker";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { findLibraryWorkoutForSession } from "@/lib/aiPlanWorkoutEnricher";
import { getTrailSessionAlternatives } from "@/lib/trailSessionAlternatives";
import type { ParsedSession } from "@/lib/aiPlanParser";

const DAY_NAMES = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export interface NolioCtx {
  athleteId: string;
  nolioId: number;
  planStartDate: Date;
  refs: { ftp?: number | null; vma?: number | null; css?: number | null; fcMax?: number | null };
  isSent: (key: string) => boolean;
  markSent: (key: string) => void;
  // Bulk selection API
  isSelected: (key: string) => boolean;
  toggleSelected: (key: string) => void;
  setManySelected: (keys: string[], value: boolean) => void;
}

interface Props {
  session: ParsedSession;
  ctx: NolioCtx;
  sessionIndex?: number;
}

export function sessionKey(
  athleteId: string,
  weekNumber: number,
  dayIndex: number,
  sessionIndex = 0,
): string {
  return `${athleteId}:${weekNumber}:${dayIndex}:${sessionIndex}`;
}

export function NolioSessionButton({ session, ctx, sessionIndex = 0 }: Props) {
  const key = sessionKey(ctx.athleteId, session.weekNumber, session.dayIndex, sessionIndex);
  const initiallySent = ctx.isSent(key);
  const [sent, setSent] = useState(initiallySent);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  // Lundi par défaut de la semaine de cette séance
  const defaultMonday = useMemo(() => {
    return mondayOf(
      addDays(ctx.planStartDate, (session.weekNumber - 1) * 7),
    );
  }, [ctx.planStartDate, session.weekNumber]);
  const [selectedMonday, setSelectedMonday] = useState<Date>(defaultMonday);

  // Date effective de la séance = lundi sélectionné + dayIndex
  // Lundi de la Semaine 1 du plan = lundi sélectionné - (weekNumber-1)*7
  const { sessionDate, planStartMonday, computedPlanStart } = useMemo(() => {
    const sd = addDays(selectedMonday, Math.max(0, session.dayIndex));
    const ps = addDays(selectedMonday, -(session.weekNumber - 1) * 7);
    const toIso = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { sessionDate: sd, planStartMonday: ps, computedPlanStart: toIso(ps) };
  }, [selectedMonday, session.weekNumber, session.dayIndex]);

  if (session.isRest || session.dayIndex < 0) return null;

  function stop(e: MouseEvent) {
    e.stopPropagation();
  }

  function openDialog(e: MouseEvent) {
    e.stopPropagation();
    setOpen(true);
  }

  async function handleConfirm(e: MouseEvent) {
    e.stopPropagation();
    setSending(true);
    try {
      const lib = findLibraryWorkoutForSession({ title: session.title, details: session.details });
      const alternatives = getTrailSessionAlternatives({
        sport: session.sport ?? lib?.sport ?? "",
        title: session.title,
        details: session.details,
      }).map((a) => ({ icon: a.icon, label: a.label, hint: a.hint }));
      const enriched = {
        weekNumber: session.weekNumber,
        dayIndex: session.dayIndex,
        sessionIndex,
        sport: session.sport ?? lib?.sport ?? null,
        title: session.title,
        id: lib?.id ?? null,
        details: session.details,
        isRest: false,
        structure: lib?.structure ?? null,
        wbalProfile: lib?.wbalProfile ?? null,
        avoid: lib?.avoid ?? undefined,
        notes: lib?.notes ?? undefined,
        objectif: lib?.objectif ?? undefined,
        alternatives: alternatives.length > 0 ? alternatives : undefined,
      };

      // planStartDate (lundi semaine 1 du plan) recalculé depuis le lundi de la semaine choisie.
      const computedStart = computedPlanStart;

      const { data, error } = await supabase.functions.invoke("nolio-send-plan", {
        body: {
          athlete_id: ctx.athleteId,
          nolio_athlete_id: ctx.nolioId,
          planStartDate: computedStart,
          sessions: [enriched],
          refs: ctx.refs,
        },
      });
      if (error) throw error;
      const result = data as { sent?: number; errors?: { status: number; detail?: string }[] } | null;
      const sentCount = result?.sent ?? 0;
      const errs = result?.errors ?? [];
      if (sentCount > 0) {
        toast.success("Séance envoyée vers Nolio ✅");
        ctx.markSent(key);
        setSent(true);
        setOpen(false);
      } else {
        const first = errs[0];
        toast.error(`Échec Nolio${first ? ` — ${first.status} ${first.detail ?? ""}` : ""}`.slice(0, 200));
      }
    } catch (e) {
      toast.error(`Erreur Nolio : ${(e as Error).message ?? "inconnue"}`);
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled
        className="h-6 px-2 text-[10px] gap-1 text-muted-foreground"
        onClick={stop}
      >
        <CheckCircle2 className="h-3 w-3" /> Envoyé
      </Button>
    );
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-6 px-2 text-[10px] gap-1"
        onClick={openDialog}
        title="Envoyer cette séance vers Nolio"
      >
        <Send className="h-3 w-3" /> Nolio
      </Button>

      <Dialog open={open} onOpenChange={(v) => !sending && setOpen(v)}>
        <DialogContent onClick={stop}>
          <DialogHeader>
            <DialogTitle>Envoyer la séance vers Nolio</DialogTitle>
            <DialogDescription>
              Confirme la date d'envoi. Une séance déjà envoyée ne sera pas dupliquée
              (déduplication via <code className="px-1">id_partner</code>).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Séance</span>
              <span className="font-medium text-right max-w-[60%] truncate">{session.title}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Semaine / Jour</span>
              <span className="font-medium">
                Semaine {session.weekNumber} — {DAY_NAMES[session.dayIndex] ?? `Jour ${session.dayIndex + 1}`}
              </span>
            </div>
            <div className="space-y-2" onClick={stop}>
              <Label>Semaine de la séance :</Label>
              <WeekPicker
                selectedMonday={selectedMonday}
                onChange={setSelectedMonday}
                hideSummary
              />
              <div className="space-y-1 text-xs sm:text-sm rounded-md bg-muted/40 px-3 py-2 border border-border/60">
                <div className="flex items-start gap-2 flex-wrap">
                  <span>📅 Séance prévue le :</span>
                  <span className="font-semibold text-teal-700 dark:text-teal-300">
                    {format(sessionDate, "EEEE d MMMM yyyy", { locale: fr })}
                  </span>
                </div>
                {session.weekNumber > 1 && (
                  <div className="flex items-start gap-2 flex-wrap text-muted-foreground">
                    <span>→ Le plan complet débute donc le :</span>
                    <span className="font-medium text-foreground">
                      {format(planStartMonday, "EEEE d MMMM yyyy", { locale: fr })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={(e) => { stop(e); setOpen(false); }} disabled={sending}>
              Annuler
            </Button>
            <Button onClick={handleConfirm} disabled={sending}>
              {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Confirmer l'envoi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
