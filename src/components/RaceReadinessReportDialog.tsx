/**
 * Bilan pré-objectif TFCL — Dialog plein écran
 * - Score de readiness (Compass + écart vs cibles ambition)
 * - Message personnalisé généré par Lovable AI (Gemini)
 * - Export PDF imprimable
 */

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDown, Sparkles, RefreshCw, Trophy, AlertTriangle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { computeCoachingCompass, type CoachingCompassInput } from "@/lib/coachingCompass";
import { computeRaceReadiness, type RaceReadinessResult } from "@/lib/raceReadiness/computeRaceReadiness";
import { buildRaceReadinessHTML } from "@/lib/raceReadiness/buildRaceReadinessHTML";
import { openPrintableHTML } from "@/lib/openPrintableHTML";

interface NextRace {
  race_name: string | null;
  race_type: string;
  race_date: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteName: string;
  objectif: string;
  ambition: string;
  nextRace: NextRace | null;
  compassInput: CoachingCompassInput | null;
}

const levelStyles = (level: RaceReadinessResult["level"]) => ({
  excellent: "from-emerald-500 to-green-600 text-emerald-50",
  good: "from-sky-500 to-blue-600 text-sky-50",
  moderate: "from-amber-500 to-orange-500 text-amber-50",
  low: "from-red-500 to-rose-600 text-red-50",
}[level]);

export function RaceReadinessReportDialog({
  open, onOpenChange, athleteName, objectif, ambition, nextRace, compassInput,
}: Props) {
  const [aiMessage, setAiMessage] = useState<string>("");
  const [loadingAI, setLoadingAI] = useState(false);

  const compassResult = useMemo(
    () => (compassInput ? computeCoachingCompass(compassInput) : null),
    [compassInput]
  );
  const readiness = useMemo(() => computeRaceReadiness(compassResult), [compassResult]);

  const daysRemaining = useMemo(() => {
    if (!nextRace) return null;
    const diff = Math.ceil((new Date(nextRace.race_date).getTime() - Date.now()) / 86400000);
    return Math.max(0, diff);
  }, [nextRace]);

  async function generateMessage() {
    if (!readiness || !nextRace || daysRemaining == null) return;
    setLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("race-readiness-message", {
        body: {
          athleteName,
          raceName: nextRace.race_name,
          raceType: nextRace.race_type,
          raceDateISO: nextRace.race_date,
          daysRemaining,
          ambition,
          objectif,
          readinessPct: readiness.scorePct,
          axes: readiness.axes.map(a => ({
            label: a.label, score: a.score, target: a.target, value: a.value, unit: a.unit,
          })),
          limiter: readiness.limiter,
          strengths: readiness.strengths.map(s => s.label),
          gaps: readiness.gaps.map(g => g.label),
        },
      });
      if (error) throw error;
      if (data?.error) {
        toast({ title: "Erreur IA", description: data.error, variant: "destructive" });
        return;
      }
      setAiMessage(data?.message ?? "");
    } catch (e) {
      console.error(e);
      toast({ title: "Erreur", description: "Impossible de générer le message", variant: "destructive" });
    } finally {
      setLoadingAI(false);
    }
  }

  useEffect(() => {
    if (open && readiness && !aiMessage && !loadingAI) {
      generateMessage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, readiness]);

  function handleExportPDF() {
    if (!readiness || !nextRace || daysRemaining == null) return;
    const html = buildRaceReadinessHTML({
      athleteName,
      raceName: nextRace.race_name,
      raceType: nextRace.race_type,
      raceDateISO: nextRace.race_date,
      daysRemaining,
      objectif,
      ambition,
      result: readiness,
      aiMessage: aiMessage || "Message non généré.",
    });
    openPrintableHTML(html, {
      filenameHint: `Bilan pré-objectif - ${athleteName}`,
      autoPrint: false,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Trophy className="h-5 w-5 text-primary" />
            Bilan pré-objectif TFCL
          </DialogTitle>
          {nextRace && daysRemaining != null && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>{nextRace.race_name ?? nextRace.race_type}</span>
              <Badge variant="outline" className="text-xs">J-{daysRemaining}</Badge>
              <Badge variant="outline" className="text-xs">{ambition}</Badge>
            </div>
          )}
        </DialogHeader>

        {!readiness ? (
          <div className="py-8 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              Données physiologiques insuffisantes pour générer le bilan.
              Renseigne au moins FTP, VMA/CSS et un sprint pour activer ce rapport.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Hero score */}
            <Card className={cn("border-0 bg-gradient-to-br shadow-lg", levelStyles(readiness.level))}>
              <CardContent className="pt-6 pb-5 text-center">
                <div className="text-6xl font-extrabold leading-none">{readiness.scorePct}%</div>
                <div className="text-base mt-2 font-medium">Prêt pour le jour J</div>
                <div className="text-xs mt-2 opacity-90">{readiness.levelLabel}</div>
              </CardContent>
            </Card>

            {/* AI message */}
            <Card className="border-amber-200 bg-amber-50/40 dark:bg-amber-950/10">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    Message du coach
                  </div>
                  <Button size="sm" variant="ghost" onClick={generateMessage} disabled={loadingAI} className="h-7 text-xs">
                    <RefreshCw className={cn("h-3 w-3 mr-1", loadingAI && "animate-spin")} />
                    Régénérer
                  </Button>
                </div>
                {loadingAI && !aiMessage ? (
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-5/6" />
                    <Skeleton className="h-3 w-4/6" />
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                    {aiMessage || "—"}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Axes */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Détail par axe physiologique</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {readiness.axes.map(a => (
                  <div key={a.key} className="flex items-center justify-between p-2.5 rounded-md border bg-card text-xs">
                    <span className="font-medium">{a.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {a.value != null ? `${a.value}${a.unit}` : "—"}
                        {a.target != null && <> / <span className="opacity-70">{a.target}{a.unit}</span></>}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-bold tabular-nums",
                          a.status === "strong" && "border-emerald-500 text-emerald-700",
                          a.status === "ok" && "border-sky-500 text-sky-700",
                          a.status === "below" && "border-amber-500 text-amber-700",
                          a.status === "gap" && "border-red-500 text-red-700",
                        )}
                      >
                        {a.score}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths / Gaps */}
            {(readiness.strengths.length > 0 || readiness.gaps.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {readiness.strengths.length > 0 && (
                  <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/10">
                    <CardContent className="pt-3 pb-3">
                      <div className="text-xs font-semibold text-emerald-700 mb-1">Points forts</div>
                      <div className="flex flex-wrap gap-1">
                        {readiness.strengths.map(s => (
                          <Badge key={s.key} className="bg-emerald-600 text-white text-xs">{s.label}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {readiness.gaps.length > 0 && (
                  <Card className="border-red-200 bg-red-50/40 dark:bg-red-950/10">
                    <CardContent className="pt-3 pb-3">
                      <div className="text-xs font-semibold text-red-700 mb-1">Points de vigilance</div>
                      <div className="flex flex-wrap gap-1">
                        {readiness.gaps.map(g => (
                          <Badge key={g.key} variant="destructive" className="text-xs">{g.label}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
              <Button onClick={handleExportPDF} disabled={!aiMessage}>
                <FileDown className="h-4 w-4 mr-2" />
                Exporter en PDF
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default RaceReadinessReportDialog;
