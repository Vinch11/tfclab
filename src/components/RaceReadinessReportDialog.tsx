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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COACH_TONES = [
  { id: "fire", label: "🔥 Feu sacré", hint: "Chauffe à blanc, énergie de combat" },
  { id: "calm", label: "🧘 Calme & rassurant", hint: "Apaise, confiance posée" },
  { id: "tactical", label: "🎯 Tactique & analytique", hint: "Lucide, stratège, factuel" },
  { id: "short", label: "⚡ Bref & direct", hint: "Punchy, 3-4 phrases max" },
  { id: "mentor", label: "🤝 Mentor bienveillant", hint: "Chaleureux, posture de coach senior" },
] as const;
type CoachToneId = typeof COACH_TONES[number]["id"];
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { computeCoachingCompass, type CoachingCompassInput } from "@/lib/coachingCompass";
import { computeRaceReadiness, type RaceReadinessResult } from "@/lib/raceReadiness/computeRaceReadiness";
import { buildRaceReadinessHTML } from "@/lib/raceReadiness/buildRaceReadinessHTML";
import { buildReadinessRadarSVG } from "@/lib/raceReadiness/buildReadinessRadarSVG";
import { getPeerReference, peerVerdict } from "@/lib/raceReadiness/peerReference";
import { getReadinessVerdict } from "@/lib/raceReadiness/readinessVerdict";
import { buildStrategyHtml, type ExportSections } from "@/components/ObjectiveStrategyCard";
import { computePacingEnvelope, type RaceObjective } from "@/lib/v2/pacingEnvelopeEngine";
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
  const [coachTone, setCoachTone] = useState<CoachToneId>("fire");

  const compassResult = useMemo(
    () => (compassInput ? computeCoachingCompass(compassInput) : null),
    [compassInput]
  );
  const readiness = useMemo(() => computeRaceReadiness(compassResult), [compassResult]);
  const peerRef = useMemo(() => getPeerReference(ambition), [ambition]);

  // Map objectif → RaceObjective utilisé par le moteur d'enveloppe & la carte Plan A/B
  const raceObjective: RaceObjective | null = useMemo(() => {
    const o = (objectif || "").toLowerCase();
    if (o.includes("70.3") || o.includes("half") || o.includes("703")) return "70.3";
    if (o.includes("ironman") || o === "im" || o.includes("full")) return "IM";
    if (o.includes("semi")) return "Semi";
    if (o.includes("marathon")) return "Marathon";
    if (o.includes("10")) return "10km";
    return null;
  }, [objectif]);

  const isTri = raceObjective === "IM" || raceObjective === "70.3";
  const isRunObj = raceObjective === "Marathon" || raceObjective === "Semi" || raceObjective === "10km";

  // Durées fallback par segment (min)
  const segmentDurationMin = useMemo(() => {
    if (raceObjective === "IM") return { bike: 330, run: 240 };
    if (raceObjective === "70.3") return { bike: 165, run: 100 };
    if (raceObjective === "Marathon") return { bike: 0, run: 210 };
    if (raceObjective === "Semi") return { bike: 0, run: 105 };
    if (raceObjective === "10km") return { bike: 0, run: 45 };
    return { bike: 0, run: 0 };
  }, [raceObjective]);

  const envelopeBike = useMemo(() => {
    if (!compassInput || !raceObjective || !isTri) return null;
    const cpWkg = compassInput.ftp && compassInput.poids
      ? (compassInput.ftp * 0.95) / compassInput.poids : null;
    return computePacingEnvelope({
      vlamaxEffectif: compassInput.vlamaxEffectif as any,
      tteEffectif: compassInput.tteEffectif as any,
      fatmax: compassInput.fatmax as any,
      potentielPhysiologiqueScore: compassInput.potentielPhysiologique?.score ?? null,
      fatigueIndex: null,
      raceObjective, sport: "bike",
      ftp: compassInput.ftp, vma: compassInput.vma,
      paceThreshold: compassInput.paceThresholdSecPerKm,
      weight: compassInput.poids,
      ambition: ambition as any, cpWkg, wPrimeJkg: null,
      predictedDurationMin: segmentDurationMin.bike || 180,
    });
  }, [compassInput, raceObjective, ambition, segmentDurationMin, isTri]);

  const envelopeRun = useMemo(() => {
    if (!compassInput || !raceObjective || (!isTri && !isRunObj)) return null;
    const cpWkg = compassInput.ftp && compassInput.poids
      ? (compassInput.ftp * 0.95) / compassInput.poids : null;
    return computePacingEnvelope({
      vlamaxEffectif: compassInput.vlamaxEffectif as any,
      tteEffectif: (compassInput.tteEffectifRun ?? compassInput.tteEffectif) as any,
      fatmax: compassInput.fatmax as any,
      potentielPhysiologiqueScore: compassInput.potentielPhysiologique?.score ?? null,
      fatigueIndex: null,
      raceObjective, sport: "run",
      ftp: compassInput.ftp, vma: compassInput.vma,
      paceThreshold: compassInput.paceThresholdSecPerKm,
      weight: compassInput.poids,
      ambition: ambition as any, cpWkg, wPrimeJkg: null,
      predictedDurationMin: segmentDurationMin.run || 180,
    });
  }, [compassInput, raceObjective, ambition, segmentDurationMin, isTri, isRunObj]);

  const hasBikeEnv = !!envelopeBike && !!compassInput?.ftp;
  const hasRunEnv = !!envelopeRun && !!compassInput?.paceThresholdSecPerKm;
  const canAttachStrategy = !!raceObjective && (hasBikeEnv || hasRunEnv);

  // Sections de la stratégie Plan A/B à inclure dans le PDF
  const [attachBike, setAttachBike] = useState(false);
  const [attachRun, setAttachRun] = useState(false);
  const [attachNutrition, setAttachNutrition] = useState(false);

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
          readinessVerdict: getReadinessVerdict(readiness.scorePct),
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

    // Construction de la stratégie Plan A & Plan B (si coch et données dispo)
    let strategyBodyHtml: string | null = null;
    const include: ExportSections = { bike: attachBike, run: attachRun, nutrition: attachNutrition };
    if (canAttachStrategy && (include.bike || include.run || include.nutrition)) {
      const fullHtml = buildStrategyHtml(
        {
          raceObjective: raceObjective!,
          bikeEnvelope: envelopeBike,
          runEnvelope: envelopeRun,
          ftp: compassInput?.ftp ?? null,
          paceThresholdSecKm: compassInput?.paceThresholdSecPerKm ?? null,
          weightKg: compassInput?.poids ?? null,
          vlamaxBike: compassInput?.vlamaxEffectif?.value ?? null,
          vlamaxRun: compassInput?.vlamaxEffectif?.value ?? null,
          vo2max: compassInput?.vo2max ?? null,
          tteMin: compassInput?.tteEffectif?.tte_min ?? null,
          tteMinRun: compassInput?.tteEffectifRun?.tte_min ?? null,
          bikeDurationMin: segmentDurationMin.bike || null,
          runDurationMin: segmentDurationMin.run || null,
          ambition: ambition as any,
        },
        {},
        include,
      );
      // Extraction du <body>...</body> (en retirant les boutons noprint et le script)
      const bodyMatch = fullHtml.match(/<body>([\s\S]*?)<\/body>/i);
      strategyBodyHtml = bodyMatch
        ? bodyMatch[1]
            .replace(/<div class="noprint"[\s\S]*?<\/div>/gi, "")
            .replace(/<script[\s\S]*?<\/script>/gi, "")
        : null;
    }

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
      peerRef,
      strategyBodyHtml,
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
            {/* Hero verdict (qualitatif, plus pédagogique qu'un % brut) */}
            {(() => {
              const verdict = getReadinessVerdict(readiness.scorePct);
              return (
                <Card className={cn("border-0 bg-gradient-to-br shadow-lg", levelStyles(readiness.level))}>
                  <CardContent className="pt-6 pb-5 text-center">
                    <div className="text-5xl leading-none">{verdict.emoji}</div>
                    <div className="text-3xl font-extrabold mt-3 leading-tight">{verdict.label}</div>
                    <div className="text-sm mt-2 opacity-90 italic">{verdict.tagline}</div>
                  </CardContent>
                </Card>
              );
            })()}

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
                  Comparée à la cohorte <strong>{peerRef.cohortLabel}</strong> : le trait gris marque la moyenne ({peerRef.peerAvg}),
                  le trait violet le seuil « au-dessus de la moyenne » ({peerRef.peerAbove}+ ★). La ligne verte à 100 = ta cible d'ambition.
                </p>
                <div
                  className="w-full max-w-md mx-auto"
                  dangerouslySetInnerHTML={{
                    __html: buildReadinessRadarSVG({ axes: readiness.axes, size: 300, peerRef }),
                  }}
                />
              </CardContent>
            </Card>

            {/* Axes */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Détail par axe physiologique</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {readiness.axes.map(a => {
                  const v = peerVerdict(a.score, peerRef);
                  return (
                  <div key={a.key} className="p-2.5 rounded-md border bg-card text-xs">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="font-medium">{a.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                          {AXIS_INTERPRETATION[a.key] ?? ""}
                        </div>
                        <div className={cn(
                          "text-[11px] mt-1 font-medium",
                          v.tone === "above" && "text-violet-700",
                          v.tone === "around" && "text-slate-600",
                          v.tone === "below" && "text-amber-700",
                        )}>
                          {v.tone === "above" && "★ "}{v.label} <span className="text-muted-foreground font-normal">vs {peerRef.cohortLabel} ({peerRef.peerAvg})</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
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
                  </div>
                  );
                })}
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

            {/* Stratégie TFCL Plan A & Plan B — sections à joindre au PDF */}
            {canAttachStrategy && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-4 pb-4 space-y-3">
                  <div className="text-sm font-semibold">Joindre la stratégie TFCL Plan A & Plan B</div>
                  <p className="text-xs text-muted-foreground">
                    Coche les sections de la carte stratégie (Plan A — course parfaite / Plan B — repli) à inclure dans le PDF.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {hasBikeEnv && (
                      <label className="flex items-start gap-2 p-2.5 rounded-md border bg-card cursor-pointer hover:bg-accent/30">
                        <Checkbox checked={attachBike} onCheckedChange={(v) => setAttachBike(v === true)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <Bike className="h-3.5 w-3.5" /> Section Vélo
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            NP cible, plage, plafond montées, segments — Plan A & B
                          </div>
                        </div>
                      </label>
                    )}
                    {hasRunEnv && (
                      <label className="flex items-start gap-2 p-2.5 rounded-md border bg-card cursor-pointer hover:bg-accent/30">
                        <Checkbox checked={attachRun} onCheckedChange={(v) => setAttachRun(v === true)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <Footprints className="h-3.5 w-3.5" /> Section Course
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Allure cible, plage, splits, cadence — Plan A & B
                          </div>
                        </div>
                      </label>
                    )}
                    <label className="flex items-start gap-2 p-2.5 rounded-md border bg-card cursor-pointer hover:bg-accent/30">
                      <Checkbox checked={attachNutrition} onCheckedChange={(v) => setAttachNutrition(v === true)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <Apple className="h-3.5 w-3.5" /> Section Nutrition
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          CHO/h, gels, barres, iso, eau — Plan A & B
                        </div>
                      </div>
                    </label>
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
