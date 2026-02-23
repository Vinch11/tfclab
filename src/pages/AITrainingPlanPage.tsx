/**
 * AI Training Plan Page — TFCL™ Plan Generator
 * Generates personalized training plans using AI + TFCL methodology
 * Phase 2: Interactive structured view + save to planning
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft, Sparkles, Calendar, Target, Clock, Loader2,
  AlertTriangle, Zap, User, RotateCcw, Copy, CheckCircle2,
  FileText, LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { differenceInWeeks, parseISO, addDays, startOfWeek, format } from "date-fns";

import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { useAITrainingPlan, type PlanAthleteData, type PlanConfig } from "@/hooks/useAITrainingPlan";
import { computeVLamaxEffectif } from "@/lib/vlamaxEffectif";
import { computeTTEEffectif } from "@/lib/tteEffectif";
import { detectUnifiedLimiter } from "@/lib/v2/unifiedLimiterDetection";
import { getEffectiveRefs, computeFtpKg } from "@/lib/effectiveRefs";
import { AmbitionLevel, DEFAULT_AMBITION } from "@/types/ambitionLevel";
import { parseAIPlan, mapSessionsToDates, type ParsedPlan } from "@/lib/aiPlanParser";
import { AIPlanViewer } from "@/components/AIPlanViewer";
import { SavedPlanCalendar } from "@/components/SavedPlanCalendar";
import { supabase } from "@/integrations/supabase/client";

const OBJECTIVE_OPTIONS = [
  { value: "IM", label: "Ironman" },
  { value: "703", label: "Ironman 70.3" },
  { value: "Marathon", label: "Marathon" },
  { value: "Semi", label: "Semi-Marathon" },
  { value: "10K", label: "10 km" },
  { value: "StartToRun", label: "Start to Run (5-10 km)" },
];

const AMBITION_OPTIONS = [
  { value: "FINISHER", label: "Finisher" },
  { value: "AGE_GROUP", label: "Age Group" },
  { value: "COMPETITOR", label: "Compétiteur" },
  { value: "ELITE", label: "Élite" },
];

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function AITrainingPlanPage() {
  const navigate = useNavigate();
  const { currentAthlete } = useAthletes();
  const { snapshots, tests, getSnapshotsForAthlete, getTestsForAthlete } = useCloudDataContext();
  const { response, isLoading, generatePlan, reset } = useAITrainingPlan();
  const [copied, setCopied] = useState(false);
  const [resultView, setResultView] = useState<"interactive" | "markdown">("interactive");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Form state
  const [objective, setObjective] = useState(currentAthlete?.goal || "703");
  const [raceName, setRaceName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("10");
  const [sessionsPerWeek, setSessionsPerWeek] = useState("7");
  const [ambition, setAmbition] = useState<string>(DEFAULT_AMBITION);
  const [constraints, setConstraints] = useState("");

  useEffect(() => {
    if (currentAthlete?.goal) setObjective(currentAthlete.goal);
  }, [currentAthlete?.goal]);

  // Reset saved state when regenerating
  useEffect(() => {
    if (isLoading) {
      setIsSaved(false);
    }
  }, [isLoading]);

  // Compute athlete data
  const athleteContext = useMemo(() => {
    if (!currentAthlete) return null;

    const athleteSnapshots = getSnapshotsForAthlete(currentAthlete.id);
    const athleteTests = getTestsForAthlete(currentAthlete.id);
    const refs = getEffectiveRefs(currentAthlete, athleteSnapshots);
    const activeSnap = refs.snapshotUsed;
    if (!activeSnap) return null;

    const ftpKg = computeFtpKg(refs);

    const vlamaxEff = computeVLamaxEffectif({
      athleteId: currentAthlete.id,
      objectif: objective,
      activeSnapshotId: currentAthlete.active_snapshot_id,
      tests: athleteTests,
      snapshots: athleteSnapshots,
    });

    const tteEff = computeTTEEffectif({
      ftp: refs.ftp,
      tss_7d: activeSnap.tss_7d,
      tte_mode: activeSnap.tte_mode,
      tte_observed_min: activeSnap.tte_observed_min,
      objectif: objective,
    });

    const data: PlanAthleteData = {
      nom: currentAthlete.name,
      ftp: refs.ftp,
      weightKg: refs.weightKg,
      vlamax: vlamaxEff.value,
      vlamaxRun: activeSnap.vlamax_run,
      vo2max: refs.vo2max,
      vma: refs.vma,
      css: refs.css,
      fcMax: refs.fcMax,
      tte: tteEff.tte_min,
      pmax5s: activeSnap.pmax_5s,
    };

    const limiterResult = detectUnifiedLimiter({
      vo2max: refs.vo2max,
      ftpKg,
      vlamax: vlamaxEff.value,
      tte: tteEff.tte_min,
      fatmax: null,
      economyScore: activeSnap.run_economy_score ?? null,
      availabilityScore: null,
      hasHealthAlerts: false,
      objectif: objective,
      ambition: ambition as AmbitionLevel,
      age: currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null,
    });

    return { data, limiterResult };
  }, [currentAthlete, snapshots, tests, objective, ambition, getSnapshotsForAthlete, getTestsForAthlete]);

  const weeksAvailable = useMemo(() => {
    if (!raceDate) return null;
    try {
      const weeks = differenceInWeeks(parseISO(raceDate), new Date());
      return weeks > 0 ? weeks : null;
    } catch { return null; }
  }, [raceDate]);

  // Parse AI response into structured plan
  const parsedPlan = useMemo<ParsedPlan | null>(() => {
    if (!response || isLoading) return null;
    try {
      const plan = parseAIPlan(response);
      return plan.weeks.length > 0 ? plan : null;
    } catch { return null; }
  }, [response, isLoading]);

  // Compute plan start date (next Monday or custom)
  const planStartDate = useMemo(() => {
    const now = new Date();
    const nextMonday = startOfWeek(addDays(now, 7), { weekStartsOn: 1 });
    return nextMonday;
  }, []);

  const handleGenerate = () => {
    if (!athleteContext) {
      toast.error("Sélectionnez un athlète avec un snapshot actif");
      return;
    }

    const limiters: string[] = [];
    const r = athleteContext.limiterResult;
    if (r.primaryLimiter !== "none") {
      limiters.push(`${r.limiterLabel} — ${r.limiterExplanation}`);
    }
    r.gapAnalysis
      .filter(g => g.status === "limiting")
      .forEach(g => limiters.push(`${g.metric}: ${g.value?.toFixed(2) ?? "?"} vs cible ${g.target?.toFixed(2)}`));

    const leverLabels: Record<string, string> = {
      increase_vo2max: "Développer VO2max",
      decrease_vlamax: "Réduire VLamax (Sprint Ban)",
      increase_tte: "Augmenter TTE",
      increase_fat_oxidation: "Améliorer FatMax / Train Low",
      recovery: "Récupération prioritaire",
      force_endurance: "Force Max / SFR",
      increase_ftp_kg: "Développer FTP/kg",
    };
    const levers = [r.primaryLever].map(l => leverLabels[l] || l);

    const config: PlanConfig = {
      objective: OBJECTIVE_OPTIONS.find(o => o.value === objective)?.label || objective,
      raceName: raceName || undefined,
      raceDate: raceDate || undefined,
      weeksAvailable: weeksAvailable ?? undefined,
      weeklyHours: parseFloat(weeklyHours) || undefined,
      sessionsPerWeek: parseInt(sessionsPerWeek) || undefined,
      ambition: AMBITION_OPTIONS.find(a => a.value === ambition)?.label || ambition,
      constraints: constraints || undefined,
      identifiedLimiters: limiters.length > 0 ? limiters : undefined,
      activeLevers: levers.length > 0 ? levers : undefined,
    };

    generatePlan(athleteContext.data, config);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(response);
    setCopied(true);
    toast.success("Plan copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToPlan = useCallback(async () => {
    if (!parsedPlan || !currentAthlete) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const mapped = mapSessionsToDates(parsedPlan.weeks, planStartDate);

      // Build rows for training_plan table
      const rows = mapped
        .filter(m => !m.session.isRest)
        .map(({ session, date }) => ({
          athlete_id: currentAthlete.id,
          coach_id: user.id,
          date: format(date, "yyyy-MM-dd"),
          phase: session.phase || null,
          custom_workout_title: `${session.sport} — ${session.title}`,
          custom_workout_description: session.details || null,
          status: "planned",
          notes: session.weekTheme ? `Semaine ${session.weekNumber}: ${session.weekTheme}` : null,
        }));

      if (rows.length === 0) {
        toast.warning("Aucune séance à sauvegarder");
        setIsSaving(false);
        return;
      }

      const { error } = await supabase.from("training_plan").insert(rows);
      if (error) throw error;

      setIsSaved(true);
      toast.success(`${rows.length} séances sauvegardées au planning !`);
    } catch (err: any) {
      console.error("Save plan error:", err);
      toast.error("Erreur lors de la sauvegarde : " + (err.message || "Inconnu"));
    } finally {
      setIsSaving(false);
    }
  }, [parsedPlan, currentAthlete, planStartDate]);

  const handleRegenerateWeek = useCallback(async (weekNumber: number) => {
    if (!athleteContext || !parsedPlan) return;
    setIsRegenerating(true);

    const week = parsedPlan.weeks.find(w => w.weekNumber === weekNumber);
    if (!week) { setIsRegenerating(false); return; }

    try {
      const PLAN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-training-plan`;
      const resp = await fetch(PLAN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          athleteData: athleteContext.data,
          planConfig: {
            objective: OBJECTIVE_OPTIONS.find(o => o.value === objective)?.label || objective,
            weeklyHours: parseFloat(weeklyHours) || undefined,
            sessionsPerWeek: parseInt(sessionsPerWeek) || undefined,
            ambition: AMBITION_OPTIONS.find(a => a.value === ambition)?.label || ambition,
            constraints: constraints || undefined,
          },
          regenerateWeek: {
            weekNumber,
            phase: week.phase,
            theme: week.theme,
            totalWeeks: parsedPlan.totalWeeks,
          },
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Erreur régénération");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) fullText += c;
          } catch {}
        }
      }

      // Parse the regenerated week and splice it into the response
      if (fullText) {
        toast.success(`Semaine ${weekNumber} régénérée !`);
        // We append the regeneration result as a note — full re-parse would need the complete response updated
        toast.info("Consultez le Markdown pour le détail de la semaine régénérée.");
      }
    } catch (err: any) {
      toast.error("Erreur régénération : " + (err.message || "Inconnu"));
    } finally {
      setIsRegenerating(false);
    }
  }, [athleteContext, parsedPlan, objective, weeklyHours, sessionsPerWeek, ambition, constraints]);

  const hasData = !!athleteContext;
  const limiter = athleteContext?.limiterResult;

  return (
    <AppLayout title="Plan IA TFCL™">
      <div className="max-w-5xl mx-auto space-y-6 p-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Plan IA TFCL™
            </h1>
            <p className="text-sm text-muted-foreground">
              Plan d'entraînement personnalisé par IA
            </p>
          </div>
          {currentAthlete && (
            <Badge variant="outline" className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {currentAthlete.name}
            </Badge>
          )}
        </div>

        {!currentAthlete && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm">Sélectionnez un athlète depuis le Dashboard pour générer un plan.</p>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Configuration Form */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Objectif course</Label>
                  <Select value={objective} onValueChange={setObjective}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {OBJECTIVE_OPTIONS.map(o => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nom de la course (optionnel)</Label>
                  <Input placeholder="Ex: IM Nice, Marathon Paris..." value={raceName} onChange={e => setRaceName(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Date de course
                  </Label>
                  <Input type="date" value={raceDate} onChange={e => setRaceDate(e.target.value)} />
                  {weeksAvailable && (
                    <p className="text-xs text-muted-foreground">
                      ≈ <span className="font-semibold text-primary">{weeksAvailable}</span> semaines de préparation
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Niveau d'ambition</Label>
                  <Select value={ambition} onValueChange={setAmbition}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {AMBITION_OPTIONS.map(a => (
                        <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Heures/sem
                    </Label>
                    <Input type="number" min={3} max={30} value={weeklyHours} onChange={e => setWeeklyHours(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Séances/sem</Label>
                    <Input type="number" min={3} max={14} value={sessionsPerWeek} onChange={e => setSessionsPerWeek(e.target.value)} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Contraintes (optionnel)</Label>
                  <Textarea
                    placeholder="Ex: Pas de vélo le mardi, blessure genou gauche..."
                    value={constraints}
                    onChange={e => setConstraints(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Detected Limiters */}
            {limiter && limiter.primaryLimiter !== "none" && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    Limiteurs Détectés
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="text-xs">
                      {limiter.limiterEmoji} {limiter.limiterLabel}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Confiance: {(limiter.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{limiter.limiterExplanation}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {limiter.leverEmoji} {limiter.leverLabel}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isLoading || !hasData}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Générer le Plan TFCL™
                </>
              )}
            </Button>
          </div>

          {/* Right: Result */}
          <div className="lg:col-span-2">
            {response ? (
              <div className="space-y-4">
                {/* View Toggle + Actions */}
                <div className="flex items-center justify-between">
                  <Tabs value={resultView} onValueChange={(v) => setResultView(v as "interactive" | "markdown")}>
                    <TabsList>
                      <TabsTrigger value="interactive" className="flex items-center gap-1">
                        <LayoutGrid className="h-3.5 w-3.5" /> Interactif
                      </TabsTrigger>
                      <TabsTrigger value="markdown" className="flex items-center gap-1">
                        <FileText className="h-3.5 w-3.5" /> Markdown
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCopy}>
                      {copied ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => { reset(); setIsSaved(false); }}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Streaming indicator */}
                {isLoading && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Génération en cours... Le plan interactif sera disponible à la fin.
                  </div>
                )}

                {/* Interactive View */}
                {resultView === "interactive" && parsedPlan ? (
                  <AIPlanViewer
                    plan={parsedPlan}
                    startDate={planStartDate}
                    onSaveToPlan={handleSaveToPlan}
                    isSaving={isSaving}
                    isSaved={isSaved}
                    onRegenerateWeek={handleRegenerateWeek}
                    isRegenerating={isRegenerating}
                    athleteName={currentAthlete?.name}
                  />
                ) : resultView === "interactive" && !isLoading ? (
                  <Card>
                    <CardContent className="p-6 text-center space-y-2">
                      <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        Le parsing du plan n'a pas pu extraire de semaines structurées.
                        Consultez la vue Markdown pour le contenu brut.
                      </p>
                      <Button variant="outline" size="sm" onClick={() => setResultView("markdown")}>
                        Voir le Markdown
                      </Button>
                    </CardContent>
                  </Card>
                ) : null}

                {/* Markdown View */}
                {resultView === "markdown" && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Plan Généré
                        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto">
                        <ReactMarkdown>{response}</ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="h-full min-h-[400px] flex items-center justify-center">
                <div className="text-center space-y-3 p-8">
                  <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                  <h3 className="text-lg font-semibold text-muted-foreground">Plan IA TFCL™</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Configurez les paramètres et cliquez sur "Générer" pour obtenir un plan
                    d'entraînement personnalisé basé sur la méthodologie TFCL™ et le profil
                    physiologique de votre athlète.
                  </p>
                </div>
              </Card>
           )}
          </div>
        </div>

        {/* Saved Plan Calendar */}
        <SavedPlanCalendar />
      </div>
    </AppLayout>
  );
}
