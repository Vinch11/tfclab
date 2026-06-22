/**
 * NolioSessionButton — Bouton "→ Nolio" par séance (envoi unitaire).
 * Discret, ouvre une mini-modale de confirmation avec date pré-remplie.
 */
import { useState, useMemo, type MouseEvent } from "react";
import { format, addDays, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  // Date par défaut de cette séance (calculée depuis planStartDate)
  const defaultSessionDate = addDays(
    ctx.planStartDate,
    (session.weekNumber - 1) * 7 + Math.max(0, session.dayIndex),
  );
  const [sessionDateStr, setSessionDateStr] = useState(format(defaultSessionDate, "yyyy-MM-dd"));

  // Lundi semaine 1 du plan recalculé depuis la date de la séance choisie
  const { sessionDate, computedPlanStart } = useMemo(() => {
    const sd = parseISO(`${sessionDateStr}T00:00:00Z`);
    const offsetDays = (session.weekNumber - 1) * 7 + Math.max(0, session.dayIndex);
    const ps = new Date(sd);
    ps.setUTCDate(ps.getUTCDate() - offsetDays);
    return {
      sessionDate: sd,
      computedPlanStart: ps.toISOString().slice(0, 10),
    };
  }, [sessionDateStr, session.weekNumber, session.dayIndex]);

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
            <div className="space-y-2">
              <Label htmlFor={`nolio-session-${key}`}>Date de cette séance :</Label>
              <Input
                id={`nolio-session-${key}`}
                type="date"
                value={sessionDateStr}
                onChange={(e) => setSessionDateStr(e.target.value)}
                onClick={stop}
              />
              <p className="text-[11px] text-muted-foreground">
                → Programmée le{" "}
                <span className="font-medium text-foreground">
                  {format(sessionDate, "EEEE d MMMM yyyy", { locale: fr })}
                </span>
                {session.weekNumber > 1 && (
                  <>
                    {" · "}Semaine 1 du plan débutera le{" "}
                    <span className="font-medium text-foreground">
                      {format(parseISO(`${computedPlanStart}T00:00:00Z`), "EEEE d MMMM yyyy", { locale: fr })}
                    </span>
                  </>
                )}
              </p>
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
