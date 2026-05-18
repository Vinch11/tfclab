/**
 * Bilan pré-objectif TFCL — Dialog plein écran
 * - Score de readiness (Compass + écart vs cibles ambition)
 * - Message personnalisé généré par Lovable AI (Gemini)
 * - Export PDF imprimable
 */

const AXIS_INTERPRETATION: Record<string, string> = {
  vo2max: "Plafond aérobie — la puissance maximale de ton moteur principal.",
  vlamax: "Équilibre glycolytique — une valeur maîtrisée limite l'acidose sur la durée.",
  ftpkg: "Puissance aérobie au kilo — le rendement brut de ton moteur.",
  vma: "Vitesse Maximale Aérobie — ta vitesse de référence pour les zones d'entraînement.",
  durability: "Capacité à tenir l'intensité sur toute la durée de l'objectif.",
  economy: "Efficience métabolique — l'énergie consommée pour avancer.",
};

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDown, Sparkles, RefreshCw, Trophy, AlertTriangle, Calendar, Bike, Footprints, Apple } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { computeCoachingCompass, type CoachingCompassInput } from "@/lib/coachingCompass";
import { computeRaceReadiness, type RaceReadinessResult } from "@/lib/raceReadiness/computeRaceReadiness";
import { buildRaceReadinessHTML } from "@/lib/raceReadiness/buildRaceReadinessHTML";
import { buildReadinessRadarSVG } from "@/lib/raceReadiness/buildReadinessRadarSVG";
import {
  buildBikePlan, buildRunPlan, buildNutritionPlan,
  type SyntheticPlanInputs,
} from "@/lib/raceReadiness/buildSyntheticPlans";
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

  // Plans à joindre au bilan (choix coach)
  const [attachBike, setAttachBike] = useState(false);
  const [attachRun, setAttachRun] = useState(false);
  const [attachNutrition, setAttachNutrition] = useState(false);

  const compassResult = useMemo(
    () => (compassInput ? computeCoachingCompass(compassInput) : null),
    [compassInput]
  );
  const readiness = useMemo(() => computeRaceReadiness(compassResult), [compassResult]);

  // Construction des plans synthétiques (sans coût, ne dépend que de compassInput)
  const planInputs = useMemo<SyntheticPlanInputs | null>(() => {
    if (!compassInput) return null;
    return {
      objectif,
      ambition,
      ftp: compassInput.ftp,
      paceThresholdSecKm: compassInput.paceThresholdSecPerKm,
      weightKg: compassInput.poids,
      vo2max: compassInput.vo2max,
      vlamax: compassInput.vlamaxEffectif?.value ?? null,
    };
  }, [compassInput, objectif, ambition]);

  const bikePlan = useMemo(() => (planInputs ? buildBikePlan(planInputs) : null), [planInputs]);
  const runPlan = useMemo(() => (planInputs ? buildRunPlan(planInputs) : null), [planInputs]);
  const nutritionPlan = useMemo(() => (planInputs ? buildNutritionPlan(planInputs) : null), [planInputs]);

  const daysRemaining = useMemo(() => {
    if (!nextRace) return null;
    const diff = Math.ceil((new Date(nextRace.race_date).getTime() - Date.now()) / 86400000);
    return Math.max(0, diff);
  }, [nextRace]);

  async function generateMessage() {
    if (!readiness) return;
    setLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke("race-readiness-message", {
        body: {
          athleteName,
          raceName: nextRace?.race_name ?? "Objectif de saison",
          raceType: nextRace?.race_type ?? objectif,
          raceDateISO: nextRace?.race_date ?? null,
          daysRemaining: daysRemaining ?? null,
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
    } catch (e: any) {
      console.error("[RaceReadiness] generateMessage error:", e);
      toast({ title: "Erreur", description: e?.message ?? "Impossible de générer le message", variant: "destructive" });
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
    if (!readiness) return;
    const html = buildRaceReadinessHTML({
      athleteName,
      raceName: nextRace?.race_name ?? "Objectif de saison",
      raceType: nextRace?.race_type ?? objectif,
      raceDateISO: nextRace?.race_date ?? new Date().toISOString(),
      daysRemaining: daysRemaining ?? 0,
      objectif,
      ambition,
      result: readiness,
      aiMessage: aiMessage || "Message non généré.",
      attachments: {
        bike: attachBike ? bikePlan : null,
        run: attachRun ? runPlan : null,
        nutrition: attachNutrition ? nutritionPlan : null,
      },
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

            {/* Radar — cartographie de la forme */}
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="text-sm font-semibold mb-1">Cartographie de ta forme</div>
                <p className="text-xs text-muted-foreground mb-3">
                  Plus le polygone est large et régulier, plus ton profil est équilibré pour le jour J.
                  Les axes les plus internes sont tes <strong>leviers de progression</strong>, pas des faiblesses.
                </p>
                <div
                  className="w-full max-w-md mx-auto"
                  dangerouslySetInnerHTML={{
                    __html: buildReadinessRadarSVG({ axes: readiness.axes, size: 300 }),
                  }}
                />
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
                          a.status === "gap" && "border-sky-600 text-sky-800",
                        )}
                      >
                        {a.score}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths / Leviers (ton positif) */}
            {(readiness.strengths.length > 0 || readiness.gaps.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {readiness.strengths.length > 0 && (
                  <Card className="border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/10">
                    <CardContent className="pt-3 pb-3">
                      <div className="text-xs font-semibold text-emerald-700 mb-1">Points forts à exploiter</div>
                      <p className="text-[11px] text-muted-foreground mb-2">Tes appuis solides pour construire la course.</p>
                      <div className="flex flex-wrap gap-1">
                        {readiness.strengths.map(s => (
                          <Badge key={s.key} className="bg-emerald-600 text-white text-xs">{s.label}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {readiness.gaps.length > 0 && (
                  <Card className="border-sky-200 bg-sky-50/40 dark:bg-sky-950/10">
                    <CardContent className="pt-3 pb-3">
                      <div className="text-xs font-semibold text-sky-700 mb-1">Leviers de progression</div>
                      <p className="text-[11px] text-muted-foreground mb-2">Pas des faiblesses — des marges de gain à activer.</p>
                      <div className="flex flex-wrap gap-1">
                        {readiness.gaps.map(g => (
                          <Badge key={g.key} className="bg-sky-600 text-white text-xs">{g.label}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Plans à joindre au bilan */}
            {(bikePlan || runPlan || nutritionPlan) && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="text-sm font-semibold">Ajouter au bilan</div>
                  <p className="text-xs text-muted-foreground">
                    Coche les plans stratégiques à inclure dans le PDF remis à l'athlète.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {bikePlan && (
                      <label className="flex items-start gap-2 p-2.5 rounded-md border bg-card cursor-pointer hover:bg-accent/30">
                        <Checkbox checked={attachBike} onCheckedChange={(v) => setAttachBike(v === true)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <Bike className="h-3.5 w-3.5" /> Plan Vélo
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            A : {bikePlan.planA.wattsLo}–{bikePlan.planA.wattsHi}W · B : {bikePlan.planB.wattsLo}–{bikePlan.planB.wattsHi}W
                          </div>
                        </div>
                      </label>
                    )}
                    {runPlan && (
                      <label className="flex items-start gap-2 p-2.5 rounded-md border bg-card cursor-pointer hover:bg-accent/30">
                        <Checkbox checked={attachRun} onCheckedChange={(v) => setAttachRun(v === true)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <Footprints className="h-3.5 w-3.5" /> Plan CAP
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            A : {runPlan.planA.paceLo} · B : {runPlan.planB.paceHi}
                          </div>
                        </div>
                      </label>
                    )}
                    {nutritionPlan && (
                      <label className="flex items-start gap-2 p-2.5 rounded-md border bg-card cursor-pointer hover:bg-accent/30">
                        <Checkbox checked={attachNutrition} onCheckedChange={(v) => setAttachNutrition(v === true)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <Apple className="h-3.5 w-3.5" /> Nutrition
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {nutritionPlan.baseRateGh} g/h · {nutritionPlan.totalCarbsG} g total
                          </div>
                        </div>
                      </label>
                    )}
                  </div>
                </CardContent>
              </Card>
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
