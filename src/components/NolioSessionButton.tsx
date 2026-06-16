/**
 * NolioSessionButton — Bouton "→ Nolio" par séance (envoi unitaire).
 * Discret, ouvre une mini-modale de confirmation avec date pré-remplie.
 */
import { useState, type MouseEvent } from "react";
import { format, addDays } from "date-fns";
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
}

export function sessionKey(athleteId: string, weekNumber: number, dayIndex: number): string {
  return `${athleteId}:${weekNumber}:${dayIndex}`;
}

export function NolioSessionButton({ session, ctx }: Props) {
  const key = sessionKey(ctx.athleteId, session.weekNumber, session.dayIndex);
  const initiallySent = ctx.isSent(key);
  const [sent, setSent] = useState(initiallySent);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const defaultDate = addDays(
    ctx.planStartDate,
    (session.weekNumber - 1) * 7 + Math.max(0, session.dayIndex),
  );
  const [dateStr, setDateStr] = useState(format(defaultDate, "yyyy-MM-dd"));

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
      const enriched = {
        weekNumber: session.weekNumber,
        dayIndex: session.dayIndex,
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
      };

      // Recalibre planStartDate côté serveur pour que addDays(planStartDate, (w-1)*7+d) = dateStr.
      const offsetDays = (session.weekNumber - 1) * 7 + session.dayIndex;
      const dt = new Date(`${dateStr}T00:00:00Z`);
      dt.setUTCDate(dt.getUTCDate() - offsetDays);
      const computedStart = dt.toISOString().slice(0, 10);

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
              <Label htmlFor={`nolio-date-${key}`}>Date</Label>
              <Input
                id={`nolio-date-${key}`}
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                onClick={stop}
              />
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
