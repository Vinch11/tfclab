/**
 * AI Training Plan Page — TFCL™ Plan Generator
 * Generates personalized training plans using AI + TFCL methodology
 * Supports multi-athlete batch generation + comparison
 */

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft, Sparkles, Calendar, Target, Clock, Loader2,
  AlertTriangle, Zap, User, RotateCcw, Copy, CheckCircle2,
  FileText, LayoutGrid, Users, GitCompareArrows,
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
import { AmbitionLevel, DEFAULT_AMBITION, getAthleteAmbition } from "@/types/ambitionLevel";
import { parseAIPlan, mapSessionsToDates, type ParsedPlan } from "@/lib/aiPlanParser";
import { AIPlanViewer } from "@/components/AIPlanViewer";
import { AIPlanComparison } from "@/components/AIPlanComparison";
import { AIPlanBenchmark } from "@/components/AIPlanBenchmark";
import { RacePaceSimulation } from "@/components/RacePaceSimulation";
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

const LEVER_LABELS: Record<string, string> = {
  increase_vo2max: "Développer VO2max",
  decrease_vlamax: "Réduire VLamax (Sprint Ban)",
  increase_tte: "Augmenter TTE",
  increase_fat_oxidation: "Améliorer FatMax / Train Low",
  recovery: "Récupération prioritaire",
  force_endurance: "Force Max / SFR",
  increase_ftp_kg: "Développer FTP/kg",
};

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// ---- Types for multi-athlete plans ----
interface AthleteComputedContext {
  data: PlanAthleteData;
  limiterResult: ReturnType<typeof detectUnifiedLimiter>;
}

interface MultiPlanEntry {
  athleteId: string;
  athleteName: string;
  objective: string;
  ambition: string;
  response: string;
  parsedPlan: ParsedPlan | null;
  limiterResult: ReturnType<typeof detectUnifiedLimiter> | null;
}

export default function AITrainingPlanPage() {
  const navigate = useNavigate();
  const { athletes, currentAthlete, setSelectedAthleteId } = useAthletes();
  const { snapshots, tests, getSnapshotsForAthlete, getTestsForAthlete } = useCloudDataContext();
  const { response, isLoading, generatePlan, reset, setResponse } = useAITrainingPlan();
  const [copied, setCopied] = useState(false);
  const [resultView, setResultView] = useState<"interactive" | "markdown" | "compare">(() => {
    try {
      const raw = localStorage.getItem("tfcl_ai_multi_plan");
      const s = raw ? JSON.parse(raw) : null;
      return s?.resultView ?? "interactive";
    } catch { return "interactive"; }
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Multi-athlete mode — restore from localStorage
  const MULTI_PERSIST_KEY = "tfcl_ai_multi_plan";
  const savedMultiState = useMemo(() => {
    try {
      const raw = localStorage.getItem(MULTI_PERSIST_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const [isMultiMode, setIsMultiMode] = useState(() => savedMultiState?.isMultiMode ?? false);
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>(() => savedMultiState?.selectedAthleteIds ?? []);
  const [multiPlans, setMultiPlans] = useState<MultiPlanEntry[]>(() => savedMultiState?.multiPlans ?? []);
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0, currentName: "" });
  const batchAbortRef = useRef(false);

  // Persist multi-athlete state when it changes (after generation)
  useEffect(() => {
    if (!isMultiMode) {
      localStorage.removeItem(MULTI_PERSIST_KEY);
      return;
    }
    if (isBatchGenerating) return; // don't persist mid-generation
    const state = {
      isMultiMode,
      selectedAthleteIds,
      multiPlans,
      resultView,
    };
    localStorage.setItem(MULTI_PERSIST_KEY, JSON.stringify(state));
  }, [isMultiMode, selectedAthleteIds, multiPlans, resultView, isBatchGenerating]);

  // Persistence key per athlete
  const persistKey = currentAthlete ? `tfcl_ai_plan_${currentAthlete.id}` : null;

  // Form state — restore from localStorage if available
  const savedState = useMemo(() => {
    if (!persistKey) return null;
    try {
      const raw = localStorage.getItem(persistKey);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, [persistKey]);

  const [objective, setObjective] = useState(currentAthlete?.objectif || "703");
  const [raceName, setRaceName] = useState("");
  const [raceDate, setRaceDate] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("10");
  const [sessionsPerWeek, setSessionsPerWeek] = useState("7");
  const [ambition, setAmbition] = useState<string>(DEFAULT_AMBITION);
  const [maxSessionsPerDay, setMaxSessionsPerDay] = useState("3");
  const [constraints, setConstraints] = useState("");

  // Restore persisted plan + config on athlete change (single mode only)
  // Priority: localStorage saved state > athlete default > fallback
  useEffect(() => {
    if (isMultiMode) return;
    if (savedState) {
      if (savedState.response) setResponse(savedState.response);
      if (savedState.objective) setObjective(savedState.objective);
      else if (currentAthlete?.objectif) setObjective(currentAthlete.objectif);
      if (savedState.raceName) setRaceName(savedState.raceName);
      if (savedState.raceDate) setRaceDate(savedState.raceDate);
      if (savedState.weeklyHours) setWeeklyHours(savedState.weeklyHours);
      if (savedState.sessionsPerWeek) setSessionsPerWeek(savedState.sessionsPerWeek);
      if (savedState.ambition) setAmbition(savedState.ambition);
      else { const a = getAthleteAmbition(currentAthlete); setAmbition(a); }
      if (savedState.constraints) setConstraints(savedState.constraints);
      if (savedState.maxSessionsPerDay) setMaxSessionsPerDay(savedState.maxSessionsPerDay);
    } else {
      // No saved state — use athlete defaults
      if (currentAthlete?.objectif) setObjective(currentAthlete.objectif);
      { const a = getAthleteAmbition(currentAthlete); setAmbition(a); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistKey]);

  // Reset saved state when regenerating
  useEffect(() => {
    if (isLoading) {
      setIsSaved(false);
    }
  }, [isLoading]);

  // Compute athlete context for a given athlete
  const computeAthleteContext = useCallback((athlete: any, obj: string, amb: string): AthleteComputedContext | null => {
    const athleteSnapshots = getSnapshotsForAthlete(athlete.id);
    const athleteTests = getTestsForAthlete(athlete.id);
    const refs = getEffectiveRefs(athlete, athleteSnapshots);
    const activeSnap = refs.snapshotUsed;
    if (!activeSnap) return null;

    const ftpKg = computeFtpKg(refs);

    const vlamaxEff = computeVLamaxEffectif({
      athleteId: athlete.id,
      objectif: obj,
      activeSnapshotId: athlete.active_snapshot_id,
      tests: athleteTests,
      snapshots: athleteSnapshots,
    });

    const tteEff = computeTTEEffectif({
      ftp: refs.ftp,
      tss_7d: activeSnap.tss_7d,
      tte_mode: activeSnap.tte_mode,
      tte_observed_min: activeSnap.tte_observed_min,
      objectif: obj,
    });

    const data: PlanAthleteData = {
      nom: athlete.nom,
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
      objectif: obj,
      ambition: amb as AmbitionLevel,
      age: athlete.dateNaissance ? calculateAge(athlete.dateNaissance) : null,
    });

    return { data, limiterResult };
  }, [getSnapshotsForAthlete, getTestsForAthlete]);

  // Current athlete context (single mode)
  const athleteContext = useMemo(() => {
    if (!currentAthlete) return null;
    return computeAthleteContext(currentAthlete, objective, ambition);
  }, [currentAthlete, snapshots, tests, objective, ambition, computeAthleteContext]);

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

  // Build config for generation
  const buildConfig = useCallback((limiterResult: ReturnType<typeof detectUnifiedLimiter> | null, athleteAmbition?: string): PlanConfig => {
    const limiters: string[] = [];
    if (limiterResult && limiterResult.primaryLimiter !== "none") {
      limiters.push(`${limiterResult.limiterLabel} — ${limiterResult.limiterExplanation}`);
      limiterResult.gapAnalysis
        .filter(g => g.status === "limiting")
        .forEach(g => limiters.push(`${g.metric}: ${g.value?.toFixed(2) ?? "?"} vs cible ${g.target?.toFixed(2)}`));
    }

    const levers = limiterResult ? [limiterResult.primaryLever].map(l => LEVER_LABELS[l] || l) : [];

    const amb = athleteAmbition || ambition;
    return {
      objective: OBJECTIVE_OPTIONS.find(o => o.value === objective)?.label || objective,
      raceName: raceName || undefined,
      raceDate: raceDate || undefined,
      weeksAvailable: weeksAvailable ?? undefined,
      weeklyHours: parseFloat(weeklyHours) || undefined,
      sessionsPerWeek: parseInt(sessionsPerWeek) || undefined,
      maxSessionsPerDay: parseInt(maxSessionsPerDay) || undefined,
      ambition: AMBITION_OPTIONS.find(a => a.value === amb)?.label || amb,
      constraints: constraints || undefined,
      identifiedLimiters: limiters.length > 0 ? limiters : undefined,
      activeLevers: levers.length > 0 ? levers : undefined,
    };
  }, [objective, raceName, raceDate, weeksAvailable, weeklyHours, sessionsPerWeek, maxSessionsPerDay, ambition, constraints]);

  // Single athlete generation
  const handleGenerate = () => {
    if (!athleteContext) {
      toast.error("Sélectionnez un athlète avec un snapshot actif");
      return;
    }
    const config = buildConfig(athleteContext.limiterResult);
    generatePlan(athleteContext.data, config);
  };

  // Multi-athlete batch generation
  const handleBatchGenerate = useCallback(async () => {
    if (selectedAthleteIds.length === 0) {
      toast.error("Sélectionnez au moins un athlète");
      return;
    }

    batchAbortRef.current = false;
    setIsBatchGenerating(true);
    setMultiPlans([]);
    setBatchProgress({ current: 0, total: selectedAthleteIds.length, currentName: "" });

    const PLAN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-training-plan`;
    const results: MultiPlanEntry[] = [];

    for (let i = 0; i < selectedAthleteIds.length; i++) {
      if (batchAbortRef.current) break;

      const athleteId = selectedAthleteIds[i];
      const athlete = athletes.find(a => a.id === athleteId);
      if (!athlete) continue;

      const athleteAmb = getAthleteAmbition(athlete);
      const athleteObj = athlete.objectif || objective;
      const ctx = computeAthleteContext(athlete, athleteObj, athleteAmb);
      
      setBatchProgress({ current: i + 1, total: selectedAthleteIds.length, currentName: athlete.nom });

      if (!ctx) {
        toast.warning(`${athlete.nom} : aucun snapshot actif, ignoré.`);
        continue;
      }

      const config = buildConfig(ctx.limiterResult, athleteAmb);
      // Override objective with athlete's own
      config.objective = OBJECTIVE_OPTIONS.find(o => o.value === athleteObj)?.label || athleteObj;

      try {
        const resp = await fetch(PLAN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ athleteData: ctx.data, planConfig: config }),
        });

        if (!resp.ok || !resp.body) {
          toast.error(`Erreur pour ${athlete.nom}`);
          continue;
        }

        // Stream the response
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

        let parsed: ParsedPlan | null = null;
        try {
          const plan = parseAIPlan(fullText);
          parsed = plan.weeks.length > 0 ? plan : null;
        } catch {}

        const entry: MultiPlanEntry = {
          athleteId,
          athleteName: athlete.nom,
          objective: OBJECTIVE_OPTIONS.find(o => o.value === athleteObj)?.label || athleteObj,
          ambition: AMBITION_OPTIONS.find(a => a.value === athleteAmb)?.label || athleteAmb,
          response: fullText,
          parsedPlan: parsed,
          limiterResult: ctx.limiterResult,
        };
        results.push(entry);
        setMultiPlans([...results]);
      } catch (err: any) {
        toast.error(`Erreur pour ${athlete.nom}: ${err.message}`);
      }
    }

    setIsBatchGenerating(false);
    if (results.length > 0) {
      toast.success(`${results.length} plan(s) généré(s) !`);
      if (results.length > 1) setResultView("compare");
    }
  }, [selectedAthleteIds, athletes, objective, ambition, computeAthleteContext, buildConfig]);

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

      if (fullText) {
        toast.success(`Semaine ${weekNumber} régénérée !`);
        toast.info("Consultez le Markdown pour le détail de la semaine régénérée.");
      }
    } catch (err: any) {
      toast.error("Erreur régénération : " + (err.message || "Inconnu"));
    } finally {
      setIsRegenerating(false);
    }
  }, [athleteContext, parsedPlan, objective, weeklyHours, sessionsPerWeek, ambition, constraints]);

  // Toggle athlete selection (multi mode)
  const toggleAthleteSelection = (id: string) => {
    setSelectedAthleteIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Compute limiter for any athlete (for display in selector)
  const getAthleteLimiter = useCallback((athlete: any) => {
    const obj = athlete.objectif || objective;
    const amb = getAthleteAmbition(athlete);
    const ctx = computeAthleteContext(athlete, obj, amb);
    return ctx?.limiterResult || null;
  }, [computeAthleteContext, objective, ambition]);

  const hasData = !!athleteContext;
  const limiter = athleteContext?.limiterResult;

  // Comparison data for multi-plans
  const comparisonData = useMemo(() => {
    return multiPlans
      .filter(p => p.parsedPlan !== null)
      .map(p => ({
        athleteId: p.athleteId,
        athleteName: p.athleteName,
        objective: p.objective,
        ambition: p.ambition,
        limiterLabel: p.limiterResult?.limiterLabel,
        limiterEmoji: p.limiterResult?.limiterEmoji,
        leverLabel: p.limiterResult ? (LEVER_LABELS[p.limiterResult.primaryLever] || p.limiterResult.leverLabel) : undefined,
        leverEmoji: p.limiterResult?.leverEmoji,
        parsedPlan: p.parsedPlan!,
      }));
  }, [multiPlans]);

  // Currently viewed multi-plan athlete
  const [viewedMultiAthleteId, setViewedMultiAthleteId] = useState<string | null>(null);
  const viewedMultiPlan = multiPlans.find(p => p.athleteId === viewedMultiAthleteId);

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
          {/* Multi/Single toggle */}
          <Button
            variant={isMultiMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const next = !isMultiMode;
              setIsMultiMode(next);
              if (!next) {
                setSelectedAthleteIds([]);
                setMultiPlans([]);
                localStorage.removeItem(MULTI_PERSIST_KEY);
              }
            }}
            className="flex items-center gap-1.5"
          >
            {isMultiMode ? <Users className="h-4 w-4" /> : <User className="h-4 w-4" />}
            {isMultiMode ? "Multi-athlètes" : "Mono"}
          </Button>
        </div>

        {/* Athlete Selector */}
        {athletes.length > 0 ? (
          <Card>
            <CardContent className="p-4">
              {!isMultiMode ? (
                /* Single athlete selector */
                <>
                  <Label className="text-xs text-muted-foreground mb-2 block">Athlète</Label>
                  <Select
                    value={currentAthlete?.id || ""}
                    onValueChange={(id) => {
                      setSelectedAthleteId(id);
                      reset();
                      setIsSaved(false);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un athlète" />
                    </SelectTrigger>
                    <SelectContent>
                      {athletes.map((a) => {
                        const objLabel = OBJECTIVE_OPTIONS.find(o => o.value === a.objectif)?.label || a.objectif;
                        const ambLabel = AMBITION_OPTIONS.find(o => o.value === getAthleteAmbition(a))?.label || a.ambition;
                        return (
                          <SelectItem key={a.id} value={a.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{a.nom}</span>
                              <span className="text-xs text-muted-foreground">• {objLabel}</span>
                              {ambLabel && <span className="text-xs text-muted-foreground">• {ambLabel}</span>}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  {currentAthlete && limiter && limiter.primaryLimiter !== "none" && (
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">
                        {OBJECTIVE_OPTIONS.find(o => o.value === currentAthlete.objectif)?.label || currentAthlete.objectif}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {(() => { const a = getAthleteAmbition(currentAthlete); return AMBITION_OPTIONS.find(o => o.value === a)?.label || a; })()}
                      </Badge>
                      <Badge variant="destructive" className="text-[10px]">
                        {limiter.limiterEmoji} {limiter.limiterLabel}
                      </Badge>
                    </div>
                  )}
                </>
              ) : (
                /* Multi athlete selector */
                <>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      Sélectionnez les athlètes ({selectedAthleteIds.length}/{athletes.length})
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        if (selectedAthleteIds.length === athletes.length) {
                          setSelectedAthleteIds([]);
                        } else {
                          setSelectedAthleteIds(athletes.map(a => a.id));
                        }
                      }}
                    >
                      {selectedAthleteIds.length === athletes.length ? "Tout désélectionner" : "Tout sélectionner"}
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {athletes.map((a) => {
                      const objLabel = OBJECTIVE_OPTIONS.find(o => o.value === a.objectif)?.label || a.objectif;
                      const ambLabel = AMBITION_OPTIONS.find(o => o.value === getAthleteAmbition(a))?.label || a.ambition;
                      const athleteLimiter = getAthleteLimiter(a);
                      const isSelected = selectedAthleteIds.includes(a.id);
                      const generatedPlan = multiPlans.find(p => p.athleteId === a.id);

                      return (
                        <div
                          key={a.id}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                            isSelected ? "border-primary/50 bg-primary/5" : "border-border hover:border-muted-foreground/30"
                          }`}
                          onClick={() => toggleAthleteSelection(a.id)}
                        >
                          <Checkbox checked={isSelected} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{a.nom}</span>
                              {generatedPlan?.parsedPlan && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <Badge variant="secondary" className="text-[9px]">{objLabel}</Badge>
                              <Badge variant="outline" className="text-[9px]">{ambLabel}</Badge>
                              {athleteLimiter && athleteLimiter.primaryLimiter !== "none" && (
                                <Badge variant="destructive" className="text-[9px]">
                                  {athleteLimiter.limiterEmoji} {athleteLimiter.limiterLabel}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-sm">Aucun athlète disponible. Créez un athlète depuis le Dashboard.</p>
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
                  Configuration {isMultiMode && "(commune)"}
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
                  {isMultiMode && (
                    <p className="text-[10px] text-muted-foreground">
                      💡 L'objectif propre de chaque athlète sera utilisé si différent.
                    </p>
                  )}
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

                {!isMultiMode && (
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
                )}

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
                  <Label>Max séances par jour</Label>
                  <Select value={maxSessionsPerDay} onValueChange={setMaxSessionsPerDay}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 séance/jour max</SelectItem>
                      <SelectItem value="2">2 séances/jour max (doubles)</SelectItem>
                      <SelectItem value="3">3 séances/jour max (triples)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    IM/70.3 Elite : 3 recommandé • Age Group : 2 • Finisher : 1
                  </p>
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

            {/* Detected Limiters (single mode only) */}
            {!isMultiMode && limiter && limiter.primaryLimiter !== "none" && (
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
            {!isMultiMode ? (
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
            ) : (
              <div className="space-y-2">
                <Button
                  onClick={handleBatchGenerate}
                  disabled={isBatchGenerating || selectedAthleteIds.length === 0}
                  className="w-full"
                  size="lg"
                >
                  {isBatchGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      {batchProgress.currentName} ({batchProgress.current}/{batchProgress.total})
                    </>
                  ) : (
                    <>
                      <Users className="h-4 w-4 mr-2" />
                      Générer {selectedAthleteIds.length} plan{selectedAthleteIds.length > 1 ? "s" : ""}
                    </>
                  )}
                </Button>
                {isBatchGenerating && (
                  <Progress value={(batchProgress.current / batchProgress.total) * 100} className="h-1.5" />
                )}
                {isBatchGenerating && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => { batchAbortRef.current = true; }}
                  >
                    Annuler
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Right: Result */}
          <div className="lg:col-span-2">
            {isMultiMode ? (
              /* Multi-athlete results */
              multiPlans.length > 0 ? (
                <div className="space-y-4">
                  {/* View toggle */}
                  <Tabs value={resultView} onValueChange={(v) => setResultView(v as any)}>
                    <TabsList>
                      <TabsTrigger value="compare" className="flex items-center gap-1" disabled={comparisonData.length < 2}>
                        <GitCompareArrows className="h-3.5 w-3.5" /> Comparaison
                      </TabsTrigger>
                      <TabsTrigger value="interactive" className="flex items-center gap-1">
                        <LayoutGrid className="h-3.5 w-3.5" /> Détail
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>

                  {resultView === "compare" && comparisonData.length >= 2 && (
                    <AIPlanComparison plans={comparisonData} />
                  )}

                  {resultView === "interactive" && (
                    <div className="space-y-4">
                      {/* Athlete tabs for individual view */}
                      <div className="flex flex-wrap gap-2">
                        {multiPlans.map(p => (
                          <Button
                            key={p.athleteId}
                            variant={viewedMultiAthleteId === p.athleteId ? "default" : "outline"}
                            size="sm"
                            onClick={() => setViewedMultiAthleteId(p.athleteId)}
                            className="text-xs"
                          >
                            <User className="h-3 w-3 mr-1" />
                            {p.athleteName}
                            {p.parsedPlan && <CheckCircle2 className="h-3 w-3 ml-1" />}
                          </Button>
                        ))}
                      </div>

                      {viewedMultiPlan?.parsedPlan ? (
                        <AIPlanViewer
                          plan={viewedMultiPlan.parsedPlan}
                          startDate={planStartDate}
                          athleteName={viewedMultiPlan.athleteName}
                        />
                      ) : viewedMultiPlan ? (
                        <Card>
                          <CardContent className="p-6">
                            <div className="prose prose-sm dark:prose-invert max-w-none overflow-x-auto">
                              <ReactMarkdown>{viewedMultiPlan.response}</ReactMarkdown>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <Card>
                          <CardContent className="p-6 text-center text-sm text-muted-foreground">
                            Sélectionnez un athlète ci-dessus pour voir son plan en détail.
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </div>
              ) : !isBatchGenerating ? (
                <Card className="h-full min-h-[400px] flex items-center justify-center">
                  <div className="text-center space-y-3 p-8">
                    <Users className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                    <h3 className="text-lg font-semibold text-muted-foreground">Plans Multi-Athlètes</h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Sélectionnez plusieurs athlètes et générez leurs plans pour les comparer
                      côte à côte. Chaque plan utilisera l'objectif, l'ambition et les faiblesses
                      propres à chaque athlète.
                    </p>
                  </div>
                </Card>
              ) : null
            ) : (
              /* Single athlete results */
              response ? (
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
                      <Button variant="ghost" size="sm" onClick={() => { reset(); setIsSaved(false); if (persistKey) localStorage.removeItem(persistKey); }}>
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
                    <>
                      <AIPlanBenchmark
                        plan={parsedPlan}
                        objective={objective}
                        ambition={ambition}
                        athleteName={currentAthlete?.nom}
                      />
                      <RacePaceSimulation
                        objective={objective}
                        ambition={ambition}
                        vma={athleteContext?.data?.vma ?? null}
                        thresholdPace={null}
                        vlamaxRun={athleteContext?.data?.vlamaxRun ?? null}
                        vo2max={athleteContext?.data?.vo2max ?? null}
                        weightKg={athleteContext?.data?.weightKg ?? null}
                        athleteName={currentAthlete?.nom}
                      />
                      <AIPlanViewer
                        plan={parsedPlan}
                        startDate={planStartDate}
                        onSaveToPlan={handleSaveToPlan}
                        isSaving={isSaving}
                        isSaved={isSaved}
                        onRegenerateWeek={handleRegenerateWeek}
                        isRegenerating={isRegenerating}
                        athleteName={currentAthlete?.nom}
                      />
                    </>
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
              )
            )}
          </div>
        </div>

        {/* Saved Plan Calendar */}
        <SavedPlanCalendar />
      </div>
    </AppLayout>
  );
}
