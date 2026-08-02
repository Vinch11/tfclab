/**
 * AI Training Plan Page — TFCL™ Plan Generator
 * Generates personalized training plans using AI + TFCL methodology
 * Supports multi-athlete batch generation + comparison
 */

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  FileText, LayoutGrid, Users, GitCompareArrows, Plus, X, Crosshair,
} from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { FinisherQuickStartDialog, type FinisherExpressPayload } from "@/components/FinisherQuickStartDialog";
import { CoachProfileForm, type CoachProfileFormPayload, type CoachProfilePrefill, type MetabolicProfile } from "@/components/CoachProfileForm";
import { QuickStartWizard } from "@/components/QuickStartWizard";
import { differenceInCalendarDays, parseISO, addDays, startOfWeek, format, startOfDay } from "date-fns";

import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { useAITrainingPlan, type PlanAthleteData, type PlanConfig, type RaceGoal } from "@/hooks/useAITrainingPlan";
import { computeDiagnostic, type AthleteDiagnostic, type DiagnosticInput } from "@/engines/diagnostic";
import { buildPlanConfigFromDiagnostic, buildPlanAthleteDataFromDiagnostic, deriveLimiterKeysFromGapAnalysis, postProcessParsedPlan, type PlanFormConfig } from "@/engines/plan";
import { validatePlan } from "@/engines/plan/planValidator";
import { analyzeCriticalPower } from "@/lib/v2/criticalPowerModel";
import { getEffectiveRefs, computeFtpKg } from "@/lib/effectiveRefs";
import { AmbitionLevel, DEFAULT_AMBITION, getAthleteAmbition, normalizeAmbitionLevel, AMBITION_DEFINITIONS, AMBITION_LEVELS_ORDERED } from "@/types/ambitionLevel";
import { parseAIPlan, mapSessionsToDates, sanitizeTrailFromTriathlonPlan, type ParsedPlan } from "@/lib/aiPlanParser";
import { upgradeLegacyTaper, inferLegacyPlanStartDate } from "@/lib/plan/legacyPlanUpgrade";

import { isJsonBetaEnabled, setJsonBetaEnabled } from "@/lib/plan/planGenerationStats";
import { deriveRaceTargets, mapObjectiveToSport } from "@/lib/deriveRaceTargets";
import { computeAmbitionEffective } from "@/lib/ambitionDowngrade";
import { validatePlanPaces } from "@/lib/validatePlanPaces";
import { applyTaperVolumeOverride } from "@/lib/taperVolumeOverride";
import { resolveEffectiveWeeklyHours } from "@/lib/defaultWeeklyHours";
import { AMBITIONS as RACE_AMBITIONS } from "@/lib/raceAnalysis";

import { extractCatalogId } from "@/lib/catalogIdExtractor";
import { AIPlanViewer } from "@/components/AIPlanViewer";
import { CollapsibleCard } from "@/components/ui/collapsible-card";

import { AIPlanComparison } from "@/components/AIPlanComparison";
import { AIPlanBenchmark } from "@/components/AIPlanBenchmark";
import { RacePaceSimulation } from "@/components/RacePaceSimulation";
import { AdaptationProjectionSummary } from "@/components/AdaptationProjectionSummary";
import { LimiterHierarchyEditor } from "@/components/LimiterHierarchyEditor";
import { PlanHistoryCard } from "@/components/PlanHistoryCard";
import { PlanAdaptationDialog } from "@/components/plan/PlanAdaptationDialog";
import { usePlanSnapshotSync } from "@/hooks/usePlanSnapshotSync";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { computeVLamaxEffectif } from "@/lib/vlamaxEffectif";
import { mapSnapshotToV2 } from "@/lib/mapSnapshotToV2";
import { predictRaceDurationMin } from "@/lib/raceTimePredictor";
import { computeFatMaxAnchorPctFTP } from "@/lib/v2/fatmaxTFCL";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NutritionUnifiedCard } from "@/components/NutritionUnifiedCard";
import { getEffectiveSnapshot } from "@/lib/effectiveRefs";
import { computeVLamaxEffectif as computeVLamaxEffectifDiag, computeTTEEffectif } from "@/engines/diagnostic";
import { Apple } from "lucide-react";

const OBJECTIVE_OPTIONS = [
  { value: "IM", label: "Ironman" },
  { value: "703", label: "Ironman 70.3" },
  { value: "Marathon", label: "Marathon" },
  { value: "Semi", label: "Semi-Marathon" },
  { value: "10K", label: "10 km" },
  { value: "StartToRun", label: "Start to Run (débutant · marche-course)" },
  { value: "TrailShort", label: "Trail court (20-40 km)" },
  { value: "TrailMountain", label: "Trail montagne (40-80 km)" },
  { value: "TrailUltra", label: "Ultra trail (80 km+)" },
];

// Source unique : AMBITION_DEFINITIONS (5 paliers "Parcours athlète", clés canoniques lowercase).
// Évite la dérive vs dashboard (Découverte/Confirmé/Compétiteur/Qualifiable/Elite).
const AMBITION_OPTIONS = AMBITION_LEVELS_ORDERED.map(level => ({
  value: level,
  label: `${AMBITION_DEFINITIONS[level].icon} ${AMBITION_DEFINITIONS[level].label}`,
}));

const LEVER_LABELS: Record<string, string> = {
  increase_vo2max: "Développer VO2max",
  decrease_vlamax: "Réduire VLamax (Sprint Ban)",
  increase_tte: "Augmenter TTE",
  increase_fat_oxidation: "Améliorer FatMax / Train Low",
  recovery: "Récupération prioritaire",
  force_endurance: "Force Max / SFR",
  increase_ftp_kg: "Développer FTP/kg",
  adjust_anaerobic: "Ajuster W'",
  maintain: "Maintenir le profil",
};

/** Literature-based recommended volume/sessions per objective × ambition (clés canoniques lowercase, 5 paliers). */
const RECOMMENDED_RANGES: Record<string, Record<string, { hours: string; sessions: string }>> = {
  IM:        { world_class: { hours: "22-30", sessions: "12-16" }, elite: { hours: "18-25", sessions: "10-14" }, competitor: { hours: "15-20", sessions: "9-12" }, age_group: { hours: "10-15", sessions: "6-9" }, finisher: { hours: "8-12", sessions: "5-7" } },
  "703":     { world_class: { hours: "16-22", sessions: "10-14" }, elite: { hours: "14-18", sessions: "8-12" }, competitor: { hours: "12-16", sessions: "7-10" }, age_group: { hours: "8-12", sessions: "5-8" }, finisher: { hours: "6-10", sessions: "4-6" } },
  Marathon:  { world_class: { hours: "12-18", sessions: "9-13" }, elite: { hours: "10-14", sessions: "7-10" }, competitor: { hours: "8-12", sessions: "6-8" }, age_group: { hours: "6-9", sessions: "5-7" }, finisher: { hours: "4-7", sessions: "4-5" } },
  Semi:      { world_class: { hours: "10-14", sessions: "8-11" }, elite: { hours: "8-12", sessions: "6-9" }, competitor: { hours: "7-10", sessions: "5-7" }, age_group: { hours: "5-7", sessions: "4-6" }, finisher: { hours: "3-5", sessions: "3-4" } },
  "10K":     { world_class: { hours: "9-12", sessions: "7-10" }, elite: { hours: "8-10", sessions: "6-8" }, competitor: { hours: "6-8", sessions: "5-7" }, age_group: { hours: "4-6", sessions: "4-5" }, finisher: { hours: "3-4", sessions: "3-4" } },
  StartToRun:{ world_class: { hours: "3-5", sessions: "3" }, elite: { hours: "3-5", sessions: "3" }, competitor: { hours: "3-5", sessions: "3" }, age_group: { hours: "2-4", sessions: "3" }, finisher: { hours: "2-4", sessions: "3" } },
};

function getRecommendedRange(objective: string, ambition: string): { hours: string; sessions: string } | null {
  const objRanges = RECOMMENDED_RANGES[objective];
  if (!objRanges) return null;
  const key = normalizeAmbitionLevel(ambition);
  return objRanges[key] || objRanges["age_group"] || null;
}


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
  diagnostic: AthleteDiagnostic;
}

interface MultiPlanEntry {
  athleteId: string;
  athleteName: string;
  objective: string;
  ambition: string;
  response: string;
  parsedPlan: ParsedPlan | null;
  diagnostic: AthleteDiagnostic | null;
}

export default function AITrainingPlanPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { athletes, currentAthlete, setSelectedAthleteId } = useAthletes();
  const { snapshots, tests, getSnapshotsForAthlete, getTestsForAthlete, getCheckinsForAthlete, getPlan, addSnapshot } = useCloudDataContext();
  const { response, isLoading, chunkProgress, generatePlan, reset, setResponse, parsedPlan: jsonParsedPlan, sportObjectiveIssues } = useAITrainingPlan();
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
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [selectedProjectionLever, setSelectedProjectionLever] = useState<string | undefined>();
  const [coachLimiterOrder, setCoachLimiterOrder] = useState<string[]>([]);
  const [showSyncBanner, setShowSyncBanner] = useState(false);
  const [isAdaptDialogOpen, setIsAdaptDialogOpen] = useState(false);
  const [coachId, setCoachId] = useState<string>("");

  // F-EXPRESS — Démarrage rapide (finisher) — DEPRECATED, remplacé par CoachProfileForm.
  const [expressDialogOpen, setExpressDialogOpen] = useState(false);
  const [pendingExpressGen, setPendingExpressGen] = useState(false);
  const expressFlagRef = useRef(false);

  // COACH FORM — Saisie manuelle des limiteurs Lorang (remplace Express Finisher).
  const [coachFormOpen, setCoachFormOpen] = useState(false);

  // QUICK-START WIZARD — Questionnaire guidé pour coach/athlète débutant.
  const [wizardOpen, setWizardOpen] = useState(false);

  // Handle navigation from PlanSyncAlert or ProfileChoiceDialog
  useEffect(() => {
    const navState = location.state as {
      athleteId?: string;
      autoRegenerate?: boolean;
      openExpress?: boolean;
      openCoachForm?: boolean;
      openQuickWizard?: boolean;
    } | null;
    if (navState?.athleteId && navState?.autoRegenerate) {
      setSelectedAthleteId(navState.athleteId);
      setShowSyncBanner(true);
      window.history.replaceState({}, document.title);
    }
    if (navState?.openExpress) {
      if (navState.athleteId) setSelectedAthleteId(navState.athleteId);
      setExpressDialogOpen(true);
      window.history.replaceState({}, document.title);
    }
    if (navState?.openCoachForm) {
      if (navState.athleteId) setSelectedAthleteId(navState.athleteId);
      setCoachFormOpen(true);
      window.history.replaceState({}, document.title);
    }
    if (navState?.openQuickWizard) {
      if (navState.athleteId) setSelectedAthleteId(navState.athleteId);
      setWizardOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, setSelectedAthleteId]);

  // Coach ID for adaptation dialog
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCoachId(user.id);
    });
  }, []);

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
  // Active plan key (full plan JSON + generation timestamp, never overwritten without explicit confirmation)
  const activePlanKey = currentAthlete ? `plan_active_${currentAthlete.id}` : null;
  const [loadedFromCacheAt, setLoadedFromCacheAt] = useState<string | null>(null);

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
  const [raceFormat, setRaceFormat] = useState<"continuous" | "lcw_3day">("continuous");
  const [raceDate, setRaceDate] = useState("");
  const [weeklyHours, setWeeklyHours] = useState("");
  const [sessionsPerWeek, setSessionsPerWeek] = useState("");
  const [ambition, setAmbition] = useState<string>(DEFAULT_AMBITION);
  const [maxSessionsPerDay, setMaxSessionsPerDay] = useState("3");
  const [strengthSessionsPerWeek, setStrengthSessionsPerWeek] = useState("2");
  const [trainingLevel, setTrainingLevel] = useState<string>("auto");
  const [lockAmbition, setLockAmbition] = useState<boolean>(false);

  const [constraints, setConstraints] = useState("");
  // Trail-only: profil de course (D+, distance, temps cible, altitude max)
  const [trailDistanceKm, setTrailDistanceKm] = useState("");
  const [trailElevationM, setTrailElevationM] = useState("");
  const [trailTargetTimeH, setTrailTargetTimeH] = useState(""); // h:mm
  const [trailMaxAltitudeM, setTrailMaxAltitudeM] = useState("");
  // Terrain dispo athlète (lieu de vie) — clé pour athlètes urbains préparant un trail montagne
  const [terrainAvailability, setTerrainAvailability] = useState<string>("auto");

  // Multi-objective state
  const [raceGoals, setRaceGoals] = useState<RaceGoal[]>([]);
  const isMultiObjective = raceGoals.length > 0;

  const addRaceGoal = () => {
    setRaceGoals(prev => [...prev, { objective: "Marathon", raceName: "", raceDate: "", priority: prev.length === 0 ? "B" : "C" }]);
  };
  const removeRaceGoal = (idx: number) => {
    setRaceGoals(prev => prev.filter((_, i) => i !== idx));
  };
  const updateRaceGoal = (idx: number, field: keyof RaceGoal, value: string) => {
    setRaceGoals(prev => prev.map((g, i) => i === idx ? { ...g, [field]: value } : g));
  };

  // Restore persisted plan + config on athlete change (single mode only)
  useEffect(() => {
    if (isMultiMode) return;
    // Try plan_active_<id> first (full plan + timestamp)
    let activeRestored = false;
    if (activePlanKey) {
      try {
        const rawActive = localStorage.getItem(activePlanKey);
        if (rawActive) {
          const parsed = JSON.parse(rawActive);
          if (parsed?.response) {
            setResponse(parsed.response);
            setLoadedFromCacheAt(parsed.generatedAt || null);
            activeRestored = true;
          }
        }
      } catch {}
    }
    if (!activeRestored) setLoadedFromCacheAt(null);

    if (savedState) {
      if (!activeRestored && savedState.response) setResponse(savedState.response);
      if (savedState.objective) setObjective(savedState.objective);
      else if (currentAthlete?.objectif) setObjective(currentAthlete.objectif);
      if (savedState.raceName) setRaceName(savedState.raceName);
      if (savedState.raceFormat) setRaceFormat(savedState.raceFormat);
      if (savedState.raceDate) setRaceDate(savedState.raceDate);
      if (savedState.weeklyHours) setWeeklyHours(savedState.weeklyHours);
      if (savedState.sessionsPerWeek) setSessionsPerWeek(savedState.sessionsPerWeek);
      if (savedState.ambition) setAmbition(savedState.ambition);
      else { const a = getAthleteAmbition(currentAthlete); setAmbition(a); }
      if (savedState.constraints) setConstraints(savedState.constraints);
      if (savedState.maxSessionsPerDay) setMaxSessionsPerDay(savedState.maxSessionsPerDay);
      if (savedState.strengthSessionsPerWeek) setStrengthSessionsPerWeek(savedState.strengthSessionsPerWeek);
      if (savedState.trainingLevel) setTrainingLevel(savedState.trainingLevel);
      if (typeof savedState.lockAmbition === "boolean") setLockAmbition(savedState.lockAmbition);

      if (savedState.raceGoals && Array.isArray(savedState.raceGoals)) setRaceGoals(savedState.raceGoals);
      if (savedState.trailDistanceKm) setTrailDistanceKm(savedState.trailDistanceKm);
      if (savedState.trailElevationM) setTrailElevationM(savedState.trailElevationM);
      if (savedState.trailTargetTimeH) setTrailTargetTimeH(savedState.trailTargetTimeH);
      if (savedState.trailMaxAltitudeM) setTrailMaxAltitudeM(savedState.trailMaxAltitudeM);
      if (savedState.terrainAvailability) setTerrainAvailability(savedState.terrainAvailability);
    } else {
      if (currentAthlete?.objectif) setObjective(currentAthlete.objectif);
      { const a = getAthleteAmbition(currentAthlete); setAmbition(a); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persistKey]);

  // Reset saved state when regenerating
  useEffect(() => {
    if (isLoading) {
      setIsSaved(false);
      setLoadedFromCacheAt(null); // fresh generation in progress, indicator clears
    }
  }, [isLoading]);

  // Persist single-athlete plan + config to localStorage after generation completes
  useEffect(() => {
    if (isMultiMode || !persistKey || isLoading || !response) return;
    const state = {
      response,
      objective,
      raceName,
      raceFormat,
      raceDate,
      weeklyHours,
      sessionsPerWeek,
      ambition,
      constraints,
      maxSessionsPerDay,
      strengthSessionsPerWeek,
      trainingLevel,
      lockAmbition,

      raceGoals,
      trailDistanceKm,
      trailElevationM,
      trailTargetTimeH,
      trailMaxAltitudeM,
      terrainAvailability,
    };
    localStorage.setItem(persistKey, JSON.stringify(state));

    // Persist active plan with generation timestamp.
    // Only write when this is a fresh generation (not when restored from cache),
    // to avoid overwriting a saved plan without explicit coach confirmation.
    if (activePlanKey && !loadedFromCacheAt) {
      try {
        const existing = localStorage.getItem(activePlanKey);
        const existingResp = existing ? (JSON.parse(existing)?.response ?? null) : null;
        if (existingResp !== response) {
          const payload = { response, generatedAt: new Date().toISOString() };
          localStorage.setItem(activePlanKey, JSON.stringify(payload));
        }
      } catch {
        const payload = { response, generatedAt: new Date().toISOString() };
        localStorage.setItem(activePlanKey, JSON.stringify(payload));
      }
    }
  }, [isMultiMode, persistKey, activePlanKey, loadedFromCacheAt, isLoading, response, objective, raceName, raceFormat, raceDate, weeklyHours, sessionsPerWeek, ambition, constraints, maxSessionsPerDay, strengthSessionsPerWeek, trainingLevel, lockAmbition, raceGoals, trailDistanceKm, trailElevationM, trailTargetTimeH, trailMaxAltitudeM, terrainAvailability]);

  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD DIAGNOSTIC — Replaces manual sub-engine calls
  // ═══════════════════════════════════════════════════════════════════════════

  const buildDiagnosticForAthlete = useCallback((athlete: any, obj: string, amb: string): AthleteDiagnostic | null => {
    const athleteSnapshots = getSnapshotsForAthlete(athlete.id);
    const athleteTests = getTestsForAthlete(athlete.id);
    const refs = getEffectiveRefs(athlete, athleteSnapshots);
    // Coach form entry point: allow a synthetic (empty) snapshot when the athlete
    // has no lab data yet. The coach form injects limiters manually downstream,
    // so the diagnostic just needs a shape to hydrate from refs (fcMax/ftp/vma/css).
    const activeSnap: any = refs.snapshotUsed ?? {};

    const ftpKg = computeFtpKg(refs);

    // Compute W' for diagnostic input
    const cpResult = analyzeCriticalPower({
      pmax_5s: activeSnap.pmax_5s,
      p30s_w: activeSnap.p30s_w,
      p60s_w: activeSnap.p60s_w,
      map5min_w: activeSnap.map5min_w,
      ftp: refs.ftp,
    });

    const age = calculateAge(athlete.birth_date ?? athlete.dateNaissance ?? null);

    // Determine sportFocus from objectif first (running objectives → "run"),
    // then fall back to snapshot.sport_main. This guarantees that for a runner
    // (Marathon, Semi, 10km, 5K, Trail, TrailLong, Ultra), the limiter engine
    // uses VMA instead of FTP/kg as the aerobic-expression metric, even if the
    // active snapshot still has bike data attached.
    // Running objectives use raw form values from OBJECTIVE_OPTIONS.
    // We list both raw + normalized aliases to be robust to upstream changes.
    const RUNNING_OBJECTIVES = new Set([
      "Marathon", "Semi", "10K", "10km", "5K",
      "StartToRun", "starttorun",
      "Trail", "TrailShort", "TrailMountain", "TrailLong", "TrailUltra", "Ultra",
    ]);
    const sportFocus: "run" | "bike" =
      RUNNING_OBJECTIVES.has(obj) || activeSnap.sport_main === "run"
        ? "run"
        : "bike";

    // ✅ Alignement Dashboard (Index.tsx) — précalcul des inputs partagés
    // pour garantir que le diagnostic du plan IA part exactement du même
    // état que le dashboard : VLamax effectif fusionné, FatMax canonique,
    // durée cible course (F-24) et dernier check-in.
    const vlamaxEffectifPrecomputed = computeVLamaxEffectif({
      athleteId: athlete.id,
      objectif: obj,
      activeSnapshotId: athlete.active_snapshot_id,
      tests: athleteTests.map(t => ({
        athlete_id: t.athlete_id,
        vlamax: t.vlamax,
        date: t.date,
        type: t.type,
        name: t.name,
      })),
      snapshots: athleteSnapshots.map(mapSnapshotToV2),
    });

    const raceChronos = {
      time_5k_sec: (activeSnap as any).time_5k_sec ?? null,
      time_10k_sec: (activeSnap as any).time_10k_sec ?? null,
      time_20k_sec: (activeSnap as any).time_20k_sec ?? null,
      time_half_sec: (activeSnap as any).time_half_sec ?? null,
      time_marathon_sec: (activeSnap as any).time_marathon_sec ?? null,
      time_5k_date: (activeSnap as any).time_5k_date ?? null,
      time_10k_date: (activeSnap as any).time_10k_date ?? null,
      time_20k_date: (activeSnap as any).time_20k_date ?? null,
      time_half_date: (activeSnap as any).time_half_date ?? null,
      time_marathon_date: (activeSnap as any).time_marathon_date ?? null,
    };
    const targetRaceDurationMin = predictRaceDurationMin({
      objective: obj,
      ambition: normalizeAmbitionLevel(amb) as any,
      raceChronos,
      vmaKmh: refs.vma ?? null,
      thresholdPaceSecPerKm: (activeSnap as any).pace_threshold_sec_km ?? activeSnap.pace_threshold_sec_per_km ?? null,
    })?.targetRaceDurationMin ?? null;

    const latestCheckin = (getCheckinsForAthlete(athlete.id) ?? [])
      .slice()
      .sort((a, b) => new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime())[0] ?? null;

    // Build DiagnosticInput and delegate to the Diagnostic Engine
    const diagnosticInput: DiagnosticInput = {
      athleteId: athlete.id,
      athleteName: athlete.name,
      age,
      sex: (athlete.sex === "M" || athlete.sex === "F") ? athlete.sex : null,
      weightKg: refs.weightKg,
      objectif: obj,
      ambition: normalizeAmbitionLevel(amb),
      sportFocus,
      vo2max: refs.vo2max,
      ftp: refs.ftp,
      ftpKg,
      pmax5s: activeSnap.pmax_5s,
      p30sW: activeSnap.p30s_w,
      p60sW: activeSnap.p60s_w,
      map5minW: activeSnap.map5min_w,
      vma: refs.vma,
      css: refs.css,
      vlamax: activeSnap.vlamax,
      vlamaxRun: activeSnap.vlamax_run,
      vlamaxSource: activeSnap.vlamax_source,
      vlamaxProtocol: activeSnap.vlamax_protocol,
      vlamaxIsReference: activeSnap.vlamax_is_reference ?? false,
      vlamaxEffectifPrecomputed,
      tteObservedMin: activeSnap.tte_observed_min,
      tteObservedMinRun: (activeSnap as any).tte_observed_min_run ?? null,
      tteMode: activeSnap.tte_mode,
      tss7d: activeSnap.tss_7d,
      fatigueState: activeSnap.fatigue_state,
      runEconomyScore: activeSnap.run_economy_score,
      runHrDriftPct: activeSnap.run_hr_drift_pct,
      paceThresholdSecPerKm: activeSnap.pace_threshold_sec_per_km,
      runningPower1s: activeSnap.running_power_1s,
      runningPower5s: activeSnap.running_power_5s,
      runningPower30s: activeSnap.running_power_30s,
      runningPower60s: activeSnap.running_power_60s,
      runningPower5min: activeSnap.running_power_5min,
      runningPowerThreshold: activeSnap.running_power_threshold,
      sprint15sDistance: activeSnap.sprint_15s_distance,
      bikeCadenceRpm: activeSnap.bike_cadence_rpm,
      bikeHrDriftFlag: activeSnap.bike_hr_drift_flag ?? false,
      protocolQuality: activeSnap.protocol_quality,
      wprimeKj: cpResult?.wprimeKJ ?? null,
      cpDataQuality: cpResult?.dataQuality ?? null,
      fatmax: computeFatMaxAnchorPctFTP(vlamaxEffectifPrecomputed.value, refs.vo2max ?? null),
      forceDevMode: activeSnap.force_development_mode ?? false,
      giIssuesFlag: activeSnap.gi_issues_flag ?? false,
      checkinData: latestCheckin ? {
        sleep: latestCheckin.sleep,
        fatigue: latestCheckin.fatigue,
        soreness: latestCheckin.soreness,
        stress: latestCheckin.stress,
        motivation: latestCheckin.motivation,
        painFlag: latestCheckin.pain_flag ?? false,
      } : undefined,
      raceChronos,
      targetRaceDurationMin,
    };

    return computeDiagnostic(diagnosticInput);
  }, [getSnapshotsForAthlete, getTestsForAthlete, getCheckinsForAthlete]);

  // Compute athlete context for a given athlete (diagnostic + athlete data)
  const computeAthleteContext = useCallback((athlete: any, obj: string, amb: string): AthleteComputedContext | null => {
    const diagnostic = buildDiagnosticForAthlete(athlete, obj, amb);
    if (!diagnostic) return null;

    // Extract PlanAthleteData from diagnostic, add fcMax from refs
    const data = buildPlanAthleteDataFromDiagnostic(diagnostic);
    const athleteSnapshots = getSnapshotsForAthlete(athlete.id);
    const refs = getEffectiveRefs(athlete, athleteSnapshots);
    data.fcMax = refs.fcMax;
    if (!data.sex && athlete.sex) data.sex = athlete.sex;

    return { data, diagnostic };
  }, [buildDiagnosticForAthlete, getSnapshotsForAthlete]);

  // Current athlete context (single mode)
  const athleteContext = useMemo(() => {
    if (!currentAthlete) return null;
    return computeAthleteContext(currentAthlete, objective, ambition);
  }, [currentAthlete, snapshots, tests, objective, ambition, computeAthleteContext]);

  // F-EXPRESS — after snapshot creation, wait until the Express snapshot is visible in
  // the snapshots cache AND athleteContext reflects it, then auto-trigger generation.
  useEffect(() => {
    if (!pendingExpressGen || !currentAthlete) return;
    const expressSnap = snapshots
      .filter((s: any) => s.athlete_id === currentAthlete.id && s.source === "finisher-express")
      .sort((a: any, b: any) => +new Date(b.date) - +new Date(a.date))[0];
    if (!expressSnap || !athleteContext) return;
    setPendingExpressGen(false);
    expressFlagRef.current = true;
    void handleGenerate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingExpressGen, snapshots, athleteContext, currentAthlete]);

  // Plan start date: defaults to Monday of the CURRENT week, but can be
  // overridden when restoring an archived plan (so dates match the original).
  const [planStartDate, setPlanStartDate] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const weeksAvailable = useMemo(() => {
    // Use the latest race date across all goals (primary A + additional B/C), relative to plan start week
    const allDates = [raceDate, ...raceGoals.map(g => g.raceDate)].filter(Boolean) as string[];
    if (allDates.length === 0) return null;
    try {
      const latestDate = allDates.sort().pop()!;
      const race = startOfDay(parseISO(latestDate));
      const start = startOfDay(planStartDate);
      const days = differenceInCalendarDays(race, start);
      return days >= 0 ? Math.floor(days / 7) + 1 : null;
    } catch { return null; }
  }, [raceDate, raceGoals, planStartDate]);

  // Parse AI response into structured plan + apply taper volume override + validate paces.
  // Chantier 3 — taper/validation appliqués UNE SEULE FOIS après assemblage complet de tous les chunks
  // (garde par ref sur la longueur du markdown final ; jamais par chunk).
  const postProcessKeyRef = useRef<string | null>(null);
  const rawParsedPlan = useMemo<ParsedPlan | null>(() => {
    // Phase 1B — JSON path prioritaire. `jsonParsedPlan` est déjà validé Zod,
    // mergé, et neutralisé des volumes LLM. Le validator sport↔objectif tourne
    // dans le hook et loggue les issues critiques dans `sportObjectiveIssues`.
    if (jsonParsedPlan && !isLoading) {
      if (sportObjectiveIssues && sportObjectiveIssues.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `⚠️ [Plan JSON] ${sportObjectiveIssues.length} issue(s) sport↔objectif :`,
          sportObjectiveIssues.slice(0, 5),
        );
      }
      if (jsonParsedPlan.weeks.length === 0) return null;
      const key = `json:${jsonParsedPlan.weeks.length}:${jsonParsedPlan.title}`;
      if (postProcessKeyRef.current !== key) {
        postProcessKeyRef.current = key;
      }
      return jsonParsedPlan;
    }
    if (!response || isLoading) return null;
    try {
      const rawPlan = parseAIPlan(response);
      // 🚫 Filet de sécurité anti-trail pour plans triathlon (IM / 70.3 / LCW)
      const { plan, removed: removedTrail } = sanitizeTrailFromTriathlonPlan(rawPlan, objective);
      if (removedTrail.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(
          `🚫 [Plan] ${removedTrail.length} séance(s) trail retirée(s) du plan triathlon "${objective}" : ` +
          removedTrail.slice(0, 5).map(r => `S${r.week}/${r.day}/${r.title}`).join(" • ") +
          (removedTrail.length > 5 ? ` … (+${removedTrail.length - 5})` : ""),
        );
      }
      if (plan.weeks.length === 0) return null;


      const key = `${response.length}:${plan.weeks.length}`;
      if (postProcessKeyRef.current !== key) {
        postProcessKeyRef.current = key;
        // eslint-disable-next-line no-console
        console.log(`📦 postProcess START — plan assemblé (${plan.weeks.length} semaines, ${response.length} chars)`);
        try {
          // (1) Ambition effective D'ABORD — le fallback weeklyHours doit être indexé
          // sur l'ambition consommée par le plan, pas l'ambition saisie.
          const ambRes = computeAmbitionEffective({
            ambitionSaisie: ambition,
            trainingLevel: trainingLevel === "auto" ? undefined : (trainingLevel as any),
            tss7d: athleteContext?.diagnostic?._rawInput?.tss7d ?? null,
            lockAmbition,
          });


          // (2) weeklyHours — user prime, sinon fallback sur l'ambition EFFECTIVE
          const userWH = parseFloat(weeklyHours);
          const userWHValid = Number.isFinite(userWH) && userWH > 0;
          const effectiveWH = resolveEffectiveWeeklyHours(
            weeklyHours,
            objective,
            ambRes.ambitionEffective,
          );
          const usedFallback = !userWHValid && effectiveWH != null;

          const d = deriveRaceTargets({
            vmaKmh: athleteContext?.data?.vma ?? null,
            thresholdPaceSecPerKm: athleteContext?.data?.paceThresholdSecPerKm ?? null,
            objective,
            ambition: ambRes.ambitionEffective,
            weeklyHours: effectiveWH,
            trainingLevel: trainingLevel === "auto" ? undefined : (trainingLevel as any),
            sport: mapObjectiveToSport(objective),
          });

          // (3) Race week index — dérivé de raceDate + planStartDate quand dispo,
          // fallback à la dernière semaine du plan. Sert à l'override taper/race.
          let raceWeekNumber: number | null = null;
          try {
            const allDates = [raceDate, ...raceGoals.map(g => g.raceDate)].filter(Boolean) as string[];
            if (allDates.length > 0 && planStartDate) {
              const latest = allDates.sort().pop()!;
              const race = startOfDay(parseISO(latest));
              const start = startOfDay(planStartDate);
              const days = differenceInCalendarDays(race, start);
              if (days >= 0) {
                raceWeekNumber = Math.min(Math.floor(days / 7) + 1, plan.weeks.length);
              }
            }
            if (!raceWeekNumber) raceWeekNumber = plan.weeks.length;
          } catch { raceWeekNumber = plan.weeks.length; }

          applyTaperVolumeOverride(plan, d.volumeCible, { raceWeekNumber });
          validatePlanPaces(plan, d.paceTargets, objective);

          // (4) Récapitulatif post-process — visibilité prioritaire via console.warn
          // pour éviter la troncature console sur les longs plans.
          const isTaper = (w: typeof plan.weeks[0]) =>
            (raceWeekNumber !== null && (w.weekNumber === raceWeekNumber || w.weekNumber === raceWeekNumber - 1))
            || /taper|aff[uû]t|volume\s*cut|race\s*week/i.test(`${w.theme} ${w.phase} ${w.coachNotes || ""}`);
          const taperWeeks = plan.weeks.filter(isTaper);
          const applied = taperWeeks.filter(w => /(affûtage|affutage|course)/i.test(w.volumeTarget || "")).length;
          const skipped = taperWeeks.length - applied;

          // Instrumentation : semaines observées + headers ### Semaine détectés dans le markdown
          const weekNums = plan.weeks.map(w => w.weekNumber).join(",");
          const headerSet = new Set<number>();
          for (const m of response.match(/###?\s*\*{0,2}\s*Semaine\s*(\d+)/gi) || []) {
            const n = parseInt(m.replace(/\D/g, ""), 10);
            if (Number.isFinite(n)) headerSet.add(n);
          }
          const headerNums = Array.from(headerSet).sort((a, b) => a - b).join(",");
          const expected = weeksAvailable ?? plan.weeks.length;
          const parity = plan.weeks.length === expected ? "OK" : "MISMATCH";

          // eslint-disable-next-line no-console
          console.warn(
            `📦 SUMMARY: ${plan.weeks.length}/${expected} semaines [${parity}], ${applied} applied, ${skipped} skipped, fallback: ${usedFallback ? "oui" : "non"}` +
            ` — parsed=[${weekNums}] headersInMarkdown=[${headerNums}] raceWeek=${raceWeekNumber}` +
            ` (userWH=${userWHValid ? userWH + "h" : "vide"}, effectiveWH=${effectiveWH ?? "null"}h, volumeCible=${d.volumeCible ?? "null"}h,` +
            ` ambitionSaisie=${ambRes.ambitionSaisie}, ambitionEffective=${ambRes.ambitionEffective}${ambRes.downgraded ? " ⬇️" : ""})`
          );
          if (parity === "MISMATCH") {
            // eslint-disable-next-line no-console
            console.warn(
              `📦 SUMMARY MISMATCH — parser=${plan.weeks.length}, expected=${expected}, headersInMarkdown=${headerNums.split(",").filter(Boolean).length}.` +
              ` Fin de markdown (400 derniers chars) : …${response.slice(-400)}`
            );
          }
        } catch (e) {
          console.warn("📦 postProcess FAILED", e);
        }
      }
      return plan;
    } catch { return null; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response, isLoading, objective, ambition, weeklyHours, trainingLevel, lockAmbition, athleteContext, raceDate, raceGoals, planStartDate, weeksAvailable, jsonParsedPlan, sportObjectiveIssues]);


  // ═══════════════════════════════════════════════════════════════════════════
  // BUILD PLAN CONFIG — Delegates to Plan Engine
  // ═══════════════════════════════════════════════════════════════════════════

  // Compute plan start date: Monday of the CURRENT week (not next week)
  // (weeksAvailable already computed above)

  const buildConfigFromDiag = useCallback((diagnostic: AthleteDiagnostic, athleteAmbition?: string): PlanConfig => {
    const amb = athleteAmbition || ambition;

    // Build raceGoals array for multi-objective
    const computeWeeksUntilRace = (date?: string) => {
      if (!date) return undefined;
      try {
        const race = startOfDay(parseISO(date));
        const start = startOfDay(planStartDate);
        const days = differenceInCalendarDays(race, start);
        return days >= 0 ? Math.floor(days / 7) + 1 : undefined;
      } catch {
        return undefined;
      }
    };

    const allRaceGoals: RaceGoal[] = [];
    // Parse trail target time "h:mm" → minutes
    const parseTargetTimeMin = (s: string): number | null => {
      if (!s) return null;
      const m = s.match(/^(\d{1,2})\s*[:hH]\s*(\d{0,2})$/);
      if (m) return parseInt(m[1], 10) * 60 + parseInt(m[2] || "0", 10);
      const asInt = parseInt(s, 10);
      return Number.isFinite(asInt) && asInt > 0 ? asInt : null;
    };
    // Les champs distance/D+/temps/altitude sont saisis dans la section TRAIL du
    // formulaire uniquement. Pour tout objectif standard (semi/marathon/10K/IM/…),
    // la distance est CANONIQUE (dérivée de l'objectif côté promptHelpers) — on ne
    // laisse PAS un `trailDistanceKm` résiduel écraser cette valeur.
    const isTrailPrimary = (objective || "").toLowerCase().startsWith("trail");
    const trailDistKm = isTrailPrimary ? (parseFloat(trailDistanceKm) || null) : null;
    const trailDPlus = isTrailPrimary ? (parseInt(trailElevationM, 10) || null) : null;
    const trailTargetMin = isTrailPrimary ? parseTargetTimeMin(trailTargetTimeH) : null;
    const trailMaxAlt = isTrailPrimary ? (parseInt(trailMaxAltitudeM, 10) || null) : null;
    // Primary objective = A
    allRaceGoals.push({
      objective: OBJECTIVE_OPTIONS.find(o => o.value === objective)?.label || objective,
      raceName: raceName || undefined,
      raceDate: raceDate || undefined,
      weeksUntilRace: computeWeeksUntilRace(raceDate),
      priority: "A",
      raceFormat: (objective === "703" || objective === "70.3") ? raceFormat : "continuous",
      distanceKm: trailDistKm,
      elevationGainM: trailDPlus,
      targetTimeMinutes: trailTargetMin,
      maxAltitudeM: trailMaxAlt,
    });
    // Additional goals
    for (const g of raceGoals) {
      allRaceGoals.push({
        objective: OBJECTIVE_OPTIONS.find(o => o.value === g.objective)?.label || g.objective,
        raceName: g.raceName || undefined,
        raceDate: g.raceDate || undefined,
        weeksUntilRace: computeWeeksUntilRace(g.raceDate),
        priority: g.priority,
      });
    }

    const formConfig: PlanFormConfig = {
      objective: OBJECTIVE_OPTIONS.find(o => o.value === objective)?.label || objective,
      raceName: raceName || undefined,
      raceDate: raceDate || undefined,
      raceGoals: allRaceGoals,
      planStartDate: format(planStartDate, "yyyy-MM-dd"),
      weeksAvailable: weeksAvailable ?? undefined,
      weeklyHours: parseFloat(weeklyHours) || undefined,
      sessionsPerWeek: (() => {
        const n = parseInt(sessionsPerWeek);
        if (!Number.isFinite(n) || n <= 0) return undefined;
        // (a) — Conflit sessionsPerWeek utilisateur vs recommandation ambition (qualitesParSemaine = proxy min).
        // Règle : le formulaire PRIME. On log une alerte si l'utilisateur descend en dessous du minimum
        // requis pour placer les séances de qualité de son ambition.
        try {
          const ambKey = (amb || "").toLowerCase();
          const ambDef = RACE_AMBITIONS.find((a: any) => a.key === ambKey || a.label?.toLowerCase() === ambKey);
          const minRec = ambDef?.qualitesParSemaine;
          if (typeof minRec === "number" && n < minRec) {
            // eslint-disable-next-line no-console
            console.warn(`⚠️ sessionsPerWeek user (${n}) < recommandé ambition (${minRec}) — le formulaire prime, l'IA sera forcée à ${n} séances/sem.`);
          }
        } catch { /* noop */ }
        return n;
      })(),
      maxSessionsPerDay: parseInt(maxSessionsPerDay) || undefined,
      strengthSessionsPerWeek: parseInt(strengthSessionsPerWeek) || undefined,
      ambition: AMBITION_OPTIONS.find(a => a.value === amb)?.label || amb,
      constraints: constraints || undefined,
      trainingLevel: trainingLevel === "auto" ? undefined : (trainingLevel as any),
      terrainAvailability: terrainAvailability === "auto" ? undefined : (terrainAvailability as any),
      lockAmbition,
    };

    return buildPlanConfigFromDiagnostic(diagnostic, formConfig, coachLimiterOrder.length > 0 ? coachLimiterOrder : undefined);
  }, [objective, raceName, raceFormat, raceDate, raceGoals, weeksAvailable, weeklyHours, sessionsPerWeek, maxSessionsPerDay, strengthSessionsPerWeek, ambition, constraints, planStartDate, coachLimiterOrder, trainingLevel, lockAmbition, terrainAvailability]);


  const parsedPlan = useMemo<ParsedPlan | null>(() => {
    if (!rawParsedPlan) return null;
    if (!athleteContext) return rawParsedPlan;

    const clonedPlan: ParsedPlan = {
      ...rawParsedPlan,
      phases: rawParsedPlan.phases.map((phase) => ({ ...phase })),
      weeks: rawParsedPlan.weeks.map((week) => ({
        ...week,
        sessions: week.sessions.map((session) => ({ ...session })),
      })),
      strategicRecap: rawParsedPlan.strategicRecap
        ? {
            limiters: rawParsedPlan.strategicRecap.limiters.map((limiter) => ({ ...limiter })),
            synergies: [...rawParsedPlan.strategicRecap.synergies],
          }
        : undefined,
    };

    const config = buildConfigFromDiag(athleteContext.diagnostic);
    const { plan } = postProcessParsedPlan(
      clonedPlan,
      {
        ...config,
        weeksAvailable: config.weeksAvailable ?? clonedPlan.weeks.length,
        mode: "ai",
      },
      athleteContext.data
    );

    // Mise à niveau des plans ANCIENS : affûtage minimal déterministe.
    // Idempotent — no-op si le plan respecte déjà la règle.
    const taperFix = upgradeLegacyTaper(plan, objective || null);
    if (taperFix) {
      // eslint-disable-next-line no-console
      console.log("🩹 [legacy] taper corrigé", taperFix);
    }
    return plan;
  }, [rawParsedPlan, athleteContext, buildConfigFromDiag, objective]);


  const { archiveCurrentPlan } = usePlanSnapshotSync();

  // Single athlete generation (archives plan if triggered by sync)
  // F-EXPRESS — submit Démarrage rapide → snapshot + auto-générer
  const handleExpressSubmit = async (data: FinisherExpressPayload) => {
    if (!currentAthlete) {
      toast.error("Sélectionnez un athlète");
      return;
    }
    try {
      const newSnap = await addSnapshot({
        athlete_id: currentAthlete.id,
        date: new Date().toISOString().slice(0, 10),
        source: "finisher-express",
        ftp: Math.max(50, Math.round(data.ftpEst)),
        vma: data.vmaEst,
        // TODO : valeurs FC par défaut pour Express — à écraser par les vraies
        // FC de l'athlète si disponibles dans athlete.refs
        fc_max: data.fcMax || 180,
        fc_repos: data.fcRepos || 60,
        weight_kg: data.poids,
        objectif: data.objectif,
        coach_notes: "Profil estimé depuis niveau déclaré + VMA — précision ~60% — à affiner avec les Test Days TFCL",
      } as any);

      if (!newSnap?.id) {
        toast.error("Échec: " + (newSnap === null ? "snapshot null - voir console" : "ok"));
        return;
      }
      setObjective(data.objectif);
      setWeeklyHours(String(data.weeklyHours));
      expressFlagRef.current = true;
      setPendingExpressGen(true);
      toast.success("Profil Express créé — génération du plan en cours…");
    } catch (e: any) {
      toast.error("Erreur création snapshot: " + (e?.message ?? e));
      throw e;
    }
  };

  const handleGenerate = async () => {
    if (!athleteContext) {
      toast.error("Sélectionnez un athlète avec un snapshot actif");
      return;
    }

    // Guard: trail objectives REQUIRE distance + D+ to compute trailProfile (no fake defaults)
    const isTrailObj = objective.startsWith("Trail");
    if (isTrailObj) {
      const km = parseFloat(trailDistanceKm) || 0;
      const dPlus = parseInt(trailElevationM, 10) || 0;
      if (km <= 0 || dPlus <= 0) {
        toast.error("Renseignez la distance (km) et le D+ total de la course trail avant de générer le plan.");
        return;
      }
    }


    // Archive current plan if this is a sync-triggered regeneration
    if (showSyncBanner && currentAthlete) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const archived = await archiveCurrentPlan(
          currentAthlete.id,
          user.id,
          "Auto-archive avant régénération suite à changement de métriques"
        );
        if (archived) {
          toast.info("Plan précédent archivé dans l'historique");
        }
      }
      setShowSyncBanner(false);
    }

    const config = buildConfigFromDiag(athleteContext.diagnostic);
    // F-EXPRESS — inject flag if active snapshot was created via Démarrage Express
    const activeSnap = currentAthlete ? getSnapshotsForAthlete(currentAthlete.id)
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;
    if (expressFlagRef.current || (activeSnap as any)?.source === "finisher-express") {
      config._expressFinisher = true;
      config._expressFinisherPromptPrefix = `PROFIL EXPRESS FINISHER — confiance 60%. Pour toutes les prescriptions d’intensité, utiliser UNIQUEMENT les pourcentages de FCmax et le RPE. Format obligatoire : « 65-75% FCmax (RPE 5-6/10 — effort confortable, conversation possible) ». Ne jamais écrire de valeurs absolues en bpm, watts ou min/km. Exemples corrects : « Z2 : 65-75% FCmax (RPE 5-6/10) », « Z3 : 75-83% FCmax (RPE 6-7/10) », « Z4 : 83-90% FCmax (RPE 7-8/10) ». Exemples interdits : « 130 bpm », « 250W », « 4:30/km ». Pour la natation : utiliser uniquement RPE et description sensorielle (« allure où tu peux souffler toutes les 3 foulées »). Pour les durées : toujours en minutes, jamais en km. Objectif unique : que l’athlète termine la course en bonne santé et avec le sourire.`;
    }
    expressFlagRef.current = false;
    if (isJsonBetaEnabled()) (config as any)._outputFormat = "json";
    generatePlan(athleteContext.data, config);
  };

  // ─── COACH FORM — Apply Lorang limiter overrides to config ────────────────
  // Le coach saisit ce qu'il SAIT. Ces limiteurs REMPLACENT ceux du diagnostic
  // dans identifiedLimiters/identifiedLimitersRaw/prohibitions transmis à
  // useAITrainingPlan. On ne réinvente pas le moteur : on alimente le même flux.
  const buildCoachOverrides = useCallback((payload: CoachProfileFormPayload, baseConfig: PlanConfig): PlanConfig => {
    const cfg: PlanConfig = { ...baseConfig };

    const primaryMetric = payload.primaryLimiterMetric;
    const secondaryMetric = payload.secondaryLimiterMetric;

    // identifiedLimitersRaw — noms de métriques (ordre coach = priorité)
    const rawList = [primaryMetric];
    if (secondaryMetric && secondaryMetric !== primaryMetric) rawList.push(secondaryMetric);
    cfg.identifiedLimitersRaw = rawList;

    // identifiedLimiters — markdown injecté chunk 1 (format coach-authored)
    const md: string[] = [];
    md.push(`## ⚙️ LIMITEURS SAISIS PAR LE COACH (source manuelle, prime sur inférence auto)`);
    md.push(`Profil métabolique : **${payload.metabolicProfile === "sprinter" ? "Sprinteur / explosif (VLamax haute probable)" : payload.metabolicProfile === "diesel" ? "Diesel / endurant (moteur aérobie à développer)" : "Équilibré (aucun dominant métabolique)"}**`);
    md.push("");
    md.push(`### Limiteur #1 — ${primaryMetric} (jugement coach)`);
    md.push(`- 🎯 PRIORITÉ ABSOLUE : Ce limiteur doit recevoir la séance clé #1 de chaque semaine (Base/Build).`);
    md.push(`- Catégorie Lorang : ${payload.primaryLimiter}`);
    md.push("");
    if (secondaryMetric) {
      md.push(`### Limiteur #2 — ${secondaryMetric} (jugement coach)`);
      md.push(`- ⚡ PRIORITÉ HAUTE : Ce limiteur doit recevoir la séance clé #2 de chaque semaine.`);
      md.push(`- Catégorie Lorang : ${payload.secondaryLimiter}`);
      md.push("");
    } else {
      md.push(`_Limiteur secondaire non renseigné par le coach → l'IA élargit son incertitude (aucun défaut inventé)._`);
      md.push("");
    }
    md.push(`## RÈGLE DE PÉRIODISATION`);
    md.push(`- Phase Base : Focus principal sur le Limiteur #1. #2 en maintien.`);
    md.push(`- Phase Build : #1 toujours prioritaire, #2 monte en importance.`);
    md.push(`- Phase Spécifique : intégration race-specific.`);
    cfg.identifiedLimiters = md;

    // Prohibitions — traduction texte pour le prompt
    const prohibitionLabels: Record<string, string> = {
      sprints: "🚫 Pas de sprints all-out (jugement coach).",
      micro_intervals: "🚫 Pas de micro-intervalles explosifs <20s (jugement coach).",
      vo2_heavy_blocks: "🚫 Pas de blocs VO2max longs ≥5min (jugement coach).",
      erratic_pacing: "🚫 Pas de pacing erratique (jugement coach).",
      train_low: "🚫 Pas de train-low / sleep-low (jugement coach).",
    };
    const prohibText = payload.prohibitions.map((p) => prohibitionLabels[p] || p);
    if (prohibText.length > 0) {
      // Merge sans dupliquer les prohibitions objectif-driven déjà présentes.
      cfg.prohibitions = [...(cfg.prohibitions || []), ...prohibText];
    }

    if (payload.sessionsPerWeek && payload.sessionsPerWeek > 0) {
      cfg.sessionsPerWeek = payload.sessionsPerWeek;
    }

    return cfg;
  }, []);

  // Pre-fill from auto diagnostic (metric names → Lorang categories, best-effort).
  const coachPrefill = useMemo<CoachProfilePrefill | null>(() => {
    if (!athleteContext) return null;
    const ranked = [...athleteContext.diagnostic.limiter.gapAnalysis]
      .filter((g) => g.weightedImpact > 0)
      .sort((a, b) => b.weightedImpact - a.weightedImpact);
    const primary = ranked[0]?.metric;
    const secondary = ranked[1]?.metric;

    // Métabolique estimé depuis VLamax vs cible (si connu).
    const vla = athleteContext.diagnostic.effectifs?.vlamax?.value ?? null;
    let metabolic: MetabolicProfile | undefined;
    if (typeof vla === "number") {
      if (vla >= 0.55) metabolic = "sprinter";
      else if (vla <= 0.35) metabolic = "diesel";
      else metabolic = "balanced";
    }
    return {
      metabolicProfile: metabolic,
      primaryLimiterMetric: primary,
      secondaryLimiterMetric: secondary,
    };
  }, [athleteContext]);

  const handleCoachFormGenerate = useCallback((payload: CoachProfileFormPayload) => {
    if (!athleteContext) {
      toast.error("Aucun contexte athlète — sélectionne un athlète d'abord.");
      return;
    }
    if (!payload.weeksAvailable || payload.weeksAvailable <= 0) {
      toast.error("Durée du plan manquante — renseigne une date de course ou une durée libre.");
      return;
    }
    const baseConfig = buildConfigFromDiag(athleteContext.diagnostic);
    const config = buildCoachOverrides(payload, baseConfig);

    // ─── Durée pilotée par le coach form (mode date OU durée libre) ───
    config.weeksAvailable = payload.weeksAvailable;
    if (payload.durationMode === "free") {
      // Pas de course datée : on retire raceDate/raceGoals pour que le moteur
      // périodise base→build→peak sur N semaines sans taper de course.
      config.raceDate = undefined;
      config.raceGoals = undefined;
    } else if (payload.raceDate) {
      config.raceDate = payload.raceDate;
    }

    // eslint-disable-next-line no-console
    console.log("[CoachProfileForm] identifiedLimiters transmis:", {
      raw: config.identifiedLimitersRaw,
      prohibitions: config.prohibitions,
      weeksAvailable: config.weeksAvailable,
      durationMode: payload.durationMode,
      raceDate: config.raceDate ?? null,
      overriddenByCoach: payload.overriddenByCoach,
    });
    toast.success(`Plan ${config.weeksAvailable} sem — limiteurs: ${config.identifiedLimitersRaw?.join(" + ")}.`);
    if (isJsonBetaEnabled()) (config as any)._outputFormat = "json";
    generatePlan(athleteContext.data, config);
  }, [athleteContext, buildConfigFromDiag, buildCoachOverrides, generatePlan]);

  const handleCoachFormSave = useCallback((payload: CoachProfileFormPayload) => {
    // eslint-disable-next-line no-console
    console.log("[CoachProfileForm] Profil enregistré (sans génération):", payload);
    toast.success("Profil coach enregistré. Ouvre à nouveau le formulaire pour générer.");
  }, []);

  // ─── QUICK-START WIZARD handlers ──────────────────────────────────────────
  /** Persiste les chronos du wizard dans le snapshot actif (ou crée un minimal). */
  const persistWizardChronos = useCallback(async (
    extras: import("@/components/QuickStartWizard").QuickStartExtras,
  ) => {
    const entries = Object.entries(extras.chronos || {});
    if (entries.length === 0 || !currentAthlete?.id) return;
    const CHRONO_FIELD_MAP: Record<string, { sec: string; date: string }> = {
      "5k":       { sec: "time_5k_sec",       date: "time_5k_date" },
      "10k":      { sec: "time_10k_sec",      date: "time_10k_date" },
      "half":     { sec: "time_half_sec",     date: "time_half_date" },
      "marathon": { sec: "time_marathon_sec", date: "time_marathon_date" },
    };
    try {
      const athleteSnaps = snapshots
        .filter((s) => s.athlete_id === currentAthlete.id)
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      let snapshotId = athleteSnaps[0]?.id;
      if (!snapshotId) {
        const created = await addSnapshot({
          athlete_id: currentAthlete.id,
          coach_id: "",
          date: new Date().toISOString().split("T")[0],
          source: "quick_start_wizard",
        } as any);
        snapshotId = created?.id;
      }
      if (!snapshotId) return;
      const update: Record<string, unknown> = {};
      for (const [dist, val] of entries) {
        const fields = CHRONO_FIELD_MAP[dist];
        if (!fields || !val) continue;
        update[fields.sec] = val.sec;
        update[fields.date] = val.date;
      }
      if (Object.keys(update).length > 0) {
        await supabase.from("snapshots").update(update).eq("id", snapshotId);
      }
    } catch (e) {
      console.warn("[QuickStartWizard] persistWizardChronos failed:", e);
    }
  }, [currentAthlete?.id, snapshots, addSnapshot]);

  const handleWizardGenerate = useCallback(async (result: import("@/components/QuickStartWizard").QuickStartResult) => {
    setObjective(result.objective);
    await persistWizardChronos(result.extras);
    handleCoachFormGenerate(result.payload);
  }, [handleCoachFormGenerate, persistWizardChronos]);

  const handleWizardReview = useCallback(async (result: import("@/components/QuickStartWizard").QuickStartResult) => {
    setObjective(result.objective);
    await persistWizardChronos(result.extras);
    // Pré-remplit CoachProfileForm via localStorage (même clé que le form utilise pour restore).
    try {
      const p = result.payload;
      const key = `tfcl:coachProfileForm:${currentAthlete?.nom ?? "default"}`;
      const draft = {
        metabolic: p.metabolicProfile,
        primary: p.primaryLimiter,
        secondary: p.secondaryLimiter ?? "unknown",
        prohibitions: p.prohibitions,
        sessionsPerWeek: p.sessionsPerWeek != null ? String(p.sessionsPerWeek) : "",
        durationMode: p.durationMode,
        raceDate: p.raceDate ?? "",
        freeWeeks: p.durationMode === "free" ? String(p.weeksAvailable) : "",
        touchedPrimary: true,
        touchedSecondary: !!p.secondaryLimiter,
        optionalOpen: p.prohibitions.length > 0,
      };
      window.localStorage.setItem(key, JSON.stringify(draft));
    } catch { /* ignore */ }
    setCoachFormOpen(true);
  }, [currentAthlete?.nom, persistWizardChronos]);

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

      const config = buildConfigFromDiag(ctx.diagnostic, athleteAmb);
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
          const rawPlan = parseAIPlan(fullText);
          const { plan } = sanitizeTrailFromTriathlonPlan(rawPlan, athleteObj);
          parsed = plan.weeks.length > 0 ? plan : null;
        } catch {}

        const entry: MultiPlanEntry = {
          athleteId,
          athleteName: athlete.nom,
          objective: OBJECTIVE_OPTIONS.find(o => o.value === athleteObj)?.label || athleteObj,
          ambition: AMBITION_OPTIONS.find(a => a.value === athleteAmb)?.label || athleteAmb,
          response: fullText,
          parsedPlan: parsed,
          diagnostic: ctx.diagnostic,
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
  }, [selectedAthleteIds, athletes, objective, ambition, computeAthleteContext, buildConfigFromDiag]);

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

      const sessionsCount = (parsedPlan.weeks || [])
        .flatMap(w => w.sessions || [])
        .filter(s => !s.isRest).length;

      // F-16: compute validator score at save time and persist alongside the plan
      // so we can measure AI plan quality drift over time (per athlete/objective).
      let validatorScore: number | null = null;
      let validatorGrade: string | null = null;
      let validatorSummary: Record<string, unknown> | null = null;
      try {
        if (athleteContext) {
          const cfg = buildConfigFromDiag(athleteContext.diagnostic);
          const limiterKeys = deriveLimiterKeysFromGapAnalysis(
            athleteContext.diagnostic.limiter.gapAnalysis,
            coachLimiterOrder.length > 0 ? coachLimiterOrder : undefined,
          );
          const raceNums: number[] = [];
          const allGoals = [{ raceDate, priority: "A" as const }, ...raceGoals];
          for (const g of allGoals) {
            if (!g.raceDate) continue;
            try {
              const days = differenceInCalendarDays(parseISO(g.raceDate), planStartDate);
              if (days >= 0) raceNums.push(Math.floor(days / 7) + 1);
            } catch { /* ignore */ }
          }
          const vr = validatePlan(
            parsedPlan,
            objective,
            cfg?.prohibitions,
            raceNums.length > 0 ? raceNums : undefined,
            cfg?.identifiedLimiters,
            limiterKeys,
            athleteContext.data,
            coachLimiterOrder.length > 0 ? coachLimiterOrder : undefined,
            {
              sessionsPerWeek: (() => { const n = parseInt(sessionsPerWeek); return Number.isFinite(n) && n > 0 ? n : undefined; })(),
              maxSessionsPerDay: (() => { const n = parseInt(maxSessionsPerDay); return Number.isFinite(n) && n > 0 ? n : undefined; })(),
            },
          );
          validatorScore = vr.score;
          validatorGrade = vr.grade;
          validatorSummary = vr.summary as unknown as Record<string, unknown>;
        }
      } catch (vErr) {
        console.warn("[F-16] validator failed, persisting plan without score:", vErr);
      }

      // Archive this plan version (history only — no write to training_plan)
      const { error } = await supabase.from("plan_versions").insert({
        athlete_id: currentAthlete.id,
        coach_id: user.id,
        plan_json: {
          ...(parsedPlan as any),
          _markdown: response,
          _planStartDate: format(planStartDate, "yyyy-MM-dd"),
          _objective: objective,
          _raceName: raceName,
          _raceDate: raceDate,
        } as any,
        objective: objective || currentAthlete.goal || null,
        weeks_count: parsedPlan.weeks?.length || null,
        sessions_count: sessionsCount,
        validator_score: validatorScore,
        validator_grade: validatorGrade,
        validator_summary: validatorSummary as any,
      });
      if (error) throw error;

      setIsSaved(true);
      setHistoryRefreshKey(k => k + 1);
      toast.success("Plan sauvegardé dans l'historique !");
    } catch (err: any) {
      console.error("Save plan error:", err);
      toast.error("Erreur lors de la sauvegarde : " + (err.message || "Inconnu"));
    } finally {
      setIsSaving(false);
    }
  }, [parsedPlan, currentAthlete, planStartDate, response, objective, raceName, raceDate, athleteContext, buildConfigFromDiag, coachLimiterOrder, raceGoals]);

  const [pendingVersion, setPendingVersion] = useState<{ plan_json: any } | null>(null);

  const applyLoadedVersion = useCallback((version: { plan_json: any }, startDate: Date) => {
    const pj = version.plan_json || {};
    let md: string | null = pj._markdown || null;
    if (!md && Array.isArray(pj.weeks) && pj.weeks.length > 0) {
      const lines: string[] = [];
      if (pj.title) lines.push(`# ${pj.title}`, "");
      for (const w of pj.weeks) {
        const theme = w.theme ? ` — ${w.theme}` : "";
        lines.push(`### Semaine ${w.weekNumber}${theme}`, "");
        if (w.coachNotes) lines.push(`**Consignes coach :** ${w.coachNotes}`, "");
        lines.push("| Jour | Sport | Séance | Détails |", "|---|---|---|---|");
        for (const s of (w.sessions || [])) {
          const day = s.dayName || "";
          const sport = (s.sport || "").replace(/\|/g, "/");
          const title = (s.title || "").replace(/\|/g, "/");
          const details = (s.details || "").replace(/\|/g, "/").replace(/\n/g, " ");
          lines.push(`| ${day} | ${sport} | ${title} | ${details} |`);
        }
        lines.push("");
      }
      md = lines.join("\n");
    }
    if (!md) {
      toast.error("Cette version n'a pas de contenu exploitable");
      return;
    }
    setResponse(md);
    setPlanStartDate(startOfWeek(startDate, { weekStartsOn: 1 }));
    if (pj._objective) setObjective(pj._objective);
    if (pj._raceName !== undefined) setRaceName(pj._raceName || "");
    if (pj._raceDate !== undefined) setRaceDate(pj._raceDate || "");
    setResultView("interactive");
    setIsSaved(true);
    toast.success("Version chargée");
  }, [setResponse]);

  const handleLoadVersion = useCallback((version: { plan_json: any }) => {
    // Ancrage calendaire automatique des plans ANCIENS : si la date de début
    // est absente mais que la date de course est connue, on la reconstruit
    // (S dernière = semaine de course) sans demander au coach.
    const pj = version.plan_json || {};
    const totalWeeks = Array.isArray(pj.weeks) ? pj.weeks.length : (pj._weeksCount ?? 0);
    if (!pj._planStartDate && pj._raceDate) {
      const inferred = inferLegacyPlanStartDate(pj, totalWeeks);
      if (inferred) {
        applyLoadedVersion(version, inferred);
        toast.info("Plan ancré au calendrier depuis la date de course");
        return;
      }
    }
    setPendingVersion(version);
  }, [applyLoadedVersion]);


  // Compute the current week number relative to planStartDate
  const currentWeekNumber = useMemo(() => {
    const now = new Date();
    const days = differenceInCalendarDays(now, planStartDate);
    if (days < 0) return 0;
    return Math.floor(days / 7) + 1;
  }, [planStartDate]);

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

  /**
   * Regenerate only future weeks (after today) while preserving past weeks.
   * Archives current plan, generates a new plan for remaining weeks, then merges.
   */
  const handleRegenerateFutureWeeks = useCallback(async () => {
    if (!athleteContext || !parsedPlan || !currentAthlete) return;
    
    const futureStartWeek = currentWeekNumber + 1;
    const totalWeeks = parsedPlan.totalWeeks;
    
    if (futureStartWeek > totalWeeks) {
      toast.warning("Toutes les semaines du plan sont déjà passées.");
      return;
    }

    // Archive current plan first
    setIsRegenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await archiveCurrentPlan(
          currentAthlete.id,
          user.id,
          `Archive avant régénération partielle (S${futureStartWeek}-S${totalWeeks})`
        );
      }

      // Keep past weeks from current plan
      const pastWeeks = parsedPlan.weeks.filter(w => w.weekNumber <= currentWeekNumber);
      const futureWeeksCount = totalWeeks - currentWeekNumber;

      // Build config for future weeks only
      const config = buildConfigFromDiag(athleteContext.diagnostic);
      config.weeksAvailable = futureWeeksCount;
      // Add context about past weeks in constraints
      const pastPhaseSummary = pastWeeks.length > 0
        ? pastWeeks.map(w => `S${w.weekNumber}: ${w.phase} — ${w.theme}`).join("; ")
        : "";
      config.constraints = [
        config.constraints || "",
        `CONTEXTE IMPORTANT: Ce plan est une CONTINUATION. Les semaines 1 à ${currentWeekNumber} sont déjà réalisées. Génère UNIQUEMENT les semaines ${futureStartWeek} à ${totalWeeks}. Numérote-les de S${futureStartWeek} à S${totalWeeks}. Phase déjà couverte : ${pastPhaseSummary}`,
      ].filter(Boolean).join("\n");

      // Generate the future weeks via AI
      const PLAN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-training-plan`;
      const resp = await fetch(PLAN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          athleteData: athleteContext.data,
          planConfig: config,
        }),
      });

      if (!resp.ok || !resp.body) throw new Error("Erreur régénération partielle");

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

      if (!fullText) {
        toast.error("Aucune réponse de l'IA");
        return;
      }

      // Parse the new future weeks
      const rawFuture = parseAIPlan(fullText);
      const { plan: futurePlan } = sanitizeTrailFromTriathlonPlan(rawFuture, objective);

      if (futurePlan.weeks.length === 0) {
        toast.error("Impossible de parser les semaines futures générées");
        return;
      }

      // Merge: past weeks (unchanged) + future weeks (newly generated)
      const mergedWeeks = [
        ...pastWeeks,
        ...futurePlan.weeks,
      ];
      mergedWeeks.sort((a, b) => a.weekNumber - b.weekNumber);

      // Rebuild the full markdown by combining past response + new response
      const pastWeekNumbers = new Set(pastWeeks.map(w => w.weekNumber));
      // Build merged response: keep original markdown lines for past weeks, append new for future
      const mergedMarkdown = response + "\n\n--- RÉGÉNÉRATION PARTIELLE (S" + futureStartWeek + "+) ---\n\n" + fullText;

      // Update the response with merged content
      setResponse(mergedMarkdown);
      
      toast.success(`Semaines ${futureStartWeek}-${totalWeeks} régénérées ! Les semaines 1-${currentWeekNumber} sont intactes.`);
    } catch (err: any) {
      console.error("Partial regen error:", err);
      toast.error("Erreur régénération partielle : " + (err.message || "Inconnu"));
    } finally {
      setIsRegenerating(false);
    }
  }, [athleteContext, parsedPlan, currentAthlete, currentWeekNumber, response, buildConfigFromDiag, archiveCurrentPlan, setResponse]);

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
    const diag = buildDiagnosticForAthlete(athlete, obj, amb);
    return diag?.limiter || null;
  }, [buildDiagnosticForAthlete, objective, ambition]);

  const hasData = !!athleteContext;
  const limiter = athleteContext?.diagnostic.limiter ?? null;

  // Comparison data for multi-plans
  const comparisonData = useMemo(() => {
    return multiPlans
      .filter(p => p.parsedPlan !== null)
      .map(p => ({
        athleteId: p.athleteId,
        athleteName: p.athleteName,
        objective: p.objective,
        ambition: p.ambition,
        limiterLabel: p.diagnostic?.limiter.limiterLabel,
        limiterEmoji: p.diagnostic?.limiter.limiterEmoji,
        leverLabel: p.diagnostic ? (LEVER_LABELS[p.diagnostic.limiter.primaryLever] || p.diagnostic.limiter.leverLabel) : undefined,
        leverEmoji: p.diagnostic?.limiter.leverEmoji,
        parsedPlan: p.parsedPlan!,
      }));
  }, [multiPlans]);

  // Currently viewed multi-plan athlete
  const [viewedMultiAthleteId, setViewedMultiAthleteId] = useState<string | null>(null);
  const viewedMultiPlan = multiPlans.find(p => p.athleteId === viewedMultiAthleteId);

  return (
    <AppLayout title="Plan IA TFCL™" showBack>
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
          {/* WIZARD launcher — questionnaire guidé 8 étapes */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setWizardOpen(true)}
            className="flex items-center gap-1.5"
            title="Questionnaire guidé pour coach/athlète débutant (8 étapes)"
          >
            <Sparkles className="h-4 w-4" />
            Démarrage guidé
          </Button>
          {/* COACH FORM launcher — saisie manuelle limiteurs Lorang */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCoachFormOpen(true)}
            className="flex items-center gap-1.5"
            title="Saisir manuellement les limiteurs Lorang de cet athlète"
          >
            <User className="h-4 w-4" />
            Profil coach
          </Button>
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
          <CollapsibleCard
            title={isMultiMode ? `Athlètes (${selectedAthleteIds.length}/${athletes.length})` : (currentAthlete?.nom || "Athlète")}
            icon={isMultiMode ? <Users className="h-4 w-4 text-primary" /> : <User className="h-4 w-4 text-primary" />}
            defaultOpen={false}
            storageKey="ai_plan_athlete_selector"
            rightSlot={
              !isMultiMode && currentAthlete && limiter && limiter.primaryLimiter !== "none" ? (
                <Badge variant="destructive" className="text-[10px]">
                  {limiter.limiterEmoji} {limiter.limiterLabel}
                </Badge>
              ) : null
            }
          >
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

                  {/* F-EXPRESS — Démarrage rapide déplacé dans ProfileChoiceDialog (création athlète) */}

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
          </CollapsibleCard>
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
            <CollapsibleCard
              title={<>Configuration {isMultiMode && "(commune)"}</>}
              icon={<Target className="h-4 w-4 text-primary" />}
              defaultOpen={false}
              storageKey="ai_plan_configuration"
            >
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5" />
                    Objectif principal (A)
                  </Label>
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

                {(objective === "703" || objective === "70.3") && (
                  <div className="space-y-2">
                    <Label>Format de course</Label>
                    <Select value={raceFormat} onValueChange={(v) => setRaceFormat(v as "continuous" | "lcw_3day")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="continuous">Standard — 1 jour (continu)</SelectItem>
                        <SelectItem value="lcw_3day">Long Course Weekend — 3 jours (Ven nat / Sam vélo / Dim run)</SelectItem>
                      </SelectContent>
                    </Select>
                    {raceFormat === "lcw_3day" && (
                      <p className="text-[11px] text-muted-foreground">
                        LCW Wales/Belgium → back-to-back overnight au lieu de bricks T2, pacing vélo +3% (85-88% FTP), recharge glycogénique inter-étapes.
                      </p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5" />
                    Date de course (objectif A)
                  </Label>
                  <Input type="date" value={raceDate} onChange={e => setRaceDate(e.target.value)} />
                  {weeksAvailable && (
                    <p className="text-xs text-muted-foreground">
                      ≈ <span className="font-semibold text-primary">{weeksAvailable}</span> semaines de préparation
                    </p>
                  )}
                </div>

                {/* Trail-specific profile (distance + D+ + time + altitude) */}
                {/Trail|Ultra/i.test(objective) && (() => {
                  const km = parseFloat(trailDistanceKm) || 0;
                  const dPlus = parseInt(trailElevationM, 10) || 0;
                  const ratio = km > 0 && dPlus > 0 ? Math.round(dPlus / km) : null;
                  const terrainLabel = ratio === null ? null :
                    ratio < 20 ? "Roulant" :
                    ratio < 35 ? "Vallonné" :
                    ratio < 55 ? "Montagne" : "Haute montagne";
                  return (
                    <div className="space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                      <Label className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                        ⛰️ Profil de course trail
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[11px]">Distance (km) *</Label>
                          <Input
                            type="number"
                            min="1"
                            step="0.1"
                            placeholder="ex: 50"
                            value={trailDistanceKm}
                            onChange={e => setTrailDistanceKm(e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">D+ total (m) *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="50"
                            placeholder="ex: 3500"
                            value={trailElevationM}
                            onChange={e => setTrailElevationM(e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Temps cible (h:mm)</Label>
                          <Input
                            placeholder="ex: 8:30"
                            value={trailTargetTimeH}
                            onChange={e => setTrailTargetTimeH(e.target.value)}
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Altitude max (m)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="100"
                            placeholder="ex: 2400"
                            value={trailMaxAltitudeM}
                            onChange={e => setTrailMaxAltitudeM(e.target.value)}
                            className="h-9"
                          />
                        </div>
                      </div>
                      {ratio !== null && terrainLabel && (
                        <p className="text-[11px] text-muted-foreground">
                          → <span className="font-semibold text-amber-700 dark:text-amber-400">{ratio} m/km</span> — profil <span className="font-semibold">{terrainLabel}</span>
                          {km > 0 && dPlus > 0 && (
                            <> · D+ hebdo cible peak ≈ <span className="font-semibold">{Math.round(dPlus * 0.12)}m</span></>
                          )}
                        </p>
                      )}
                      {(!trailDistanceKm || !trailElevationM) && (
                        <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80">
                          ⚠️ Renseigne distance + D+ pour que l'IA adapte le plan au profil exact de ta course.
                        </p>
                      )}

                      {/* Terrain dispo athlète — substitutions urbaines */}
                      <div className="space-y-1 pt-2 border-t border-amber-500/20">
                        <Label className="text-[11px] flex items-center gap-1">
                          🏙️ Terrain accessible (lieu de vie)
                        </Label>
                        <Select value={terrainAvailability} onValueChange={setTerrainAvailability}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="auto">🤖 Auto (montagne supposée)</SelectItem>
                            <SelectItem value="plat">🏙️ Plat — urbain (ex: Bruxelles, Amsterdam)</SelectItem>
                            <SelectItem value="vallonne">🌳 Vallonné — collines 50-200m (ex: Liège, Lyon)</SelectItem>
                            <SelectItem value="mixte">🚗 Mixte — urbain semaine + montagne weekend</SelectItem>
                            <SelectItem value="montagne">⛰️ Montagne — accès direct (ex: Chamonix, Grenoble)</SelectItem>
                          </SelectContent>
                        </Select>
                        {(terrainAvailability === "plat" || terrainAvailability === "vallonne" || terrainAvailability === "mixte") && (
                          <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80">
                            💡 L'IA substituera les séances montagne par des compensations urbaines (escaliers, tapis incliné, côtes urbaines, sorties weekend programmées).
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}



                {/* Multi-objective section */}
                {raceGoals.map((goal, idx) => (
                  <div key={idx} className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-3 relative">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          {goal.priority === "B" ? "🅱️ B" : "🆎 C"}
                        </Badge>
                        Objectif {idx + 2}
                      </Label>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeRaceGoal(idx)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Select value={goal.objective} onValueChange={v => updateRaceGoal(idx, "objective", v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OBJECTIVE_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Nom de course"
                        value={goal.raceName || ""}
                        onChange={e => updateRaceGoal(idx, "raceName", e.target.value)}
                        className="h-9 text-xs"
                      />
                      <Input
                        type="date"
                        value={goal.raceDate || ""}
                        onChange={e => updateRaceGoal(idx, "raceDate", e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <Select value={goal.priority} onValueChange={v => updateRaceGoal(idx, "priority", v)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="B">🅱️ Intermédiaire (mini-taper)</SelectItem>
                        <SelectItem value="C">🆎 Secondaire (pas de taper)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs gap-1.5"
                  onClick={addRaceGoal}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter un objectif intermédiaire
                </Button>

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

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Niveau d'entraînement actuel
                    <span className="text-[10px] text-muted-foreground">(charge récente estimée)</span>
                  </Label>
                  <Select value={trainingLevel} onValueChange={setTrainingLevel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">🤖 Auto (TSS 7j si disponible)</SelectItem>
                      <SelectItem value="untrained">🛌 Pas du tout entraîné (reprise)</SelectItem>
                      <SelectItem value="light">🚶 Un peu entraîné (1-3 séances/sem)</SelectItem>
                      <SelectItem value="trained">🏃 Bien entraîné (régulier)</SelectItem>
                      <SelectItem value="highly_trained">🔥 Très chargé (en pic de forme)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">
                    Utilisé uniquement si le TSS 7j n'est pas renseigné dans le snapshot. Aide l'IA à calibrer la progression initiale.
                  </p>

                  {/* Coach override : verrou anti-déclassement d'ambition */}
                  <div className="flex items-start gap-2 mt-2 p-2 rounded-md border border-amber-500/30 bg-amber-500/5">
                    <Checkbox
                      id="lockAmbition"
                      checked={lockAmbition}
                      onCheckedChange={(v) => setLockAmbition(v === true)}
                      className="mt-0.5"
                    />
                    <div className="space-y-1 flex-1">
                      <Label htmlFor="lockAmbition" className="text-xs font-medium cursor-pointer flex items-center gap-1">
                        🔒 Verrouiller l'ambition (bypass déclassement auto)
                      </Label>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        Coche cette case si tu juges que l'athlète est prêt pour l'ambition saisie malgré une charge récente faible (tests physio récents, retour de blessure documenté, pic de forme planifié). Le plan sera calibré sur l'ambition saisie sans filet de sécurité.
                      </p>
                    </div>
                  </div>
                </div>


                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Heures/sem
                    </Label>
                    <Input
                      type="number" min={3} max={30}
                      value={weeklyHours}
                      onChange={e => setWeeklyHours(e.target.value)}
                      placeholder={(() => {
                        const rec = getRecommendedRange(objective, ambition);
                        return rec ? rec.hours : "Auto";
                      })()}
                    />
                    {!weeklyHours && (
                      <p className="text-[10px] text-muted-foreground">
                        📚 Auto : basé sur la littérature ({getRecommendedRange(objective, ambition)?.hours || "—"}h)
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Séances/sem</Label>
                    <Input
                      type="number" min={3} max={14}
                      value={sessionsPerWeek}
                      onChange={e => setSessionsPerWeek(e.target.value)}
                      placeholder={(() => {
                        const rec = getRecommendedRange(objective, ambition);
                        return rec ? rec.sessions : "Auto";
                      })()}
                    />
                    {!sessionsPerWeek && (
                      <p className="text-[10px] text-muted-foreground">
                        📚 Auto : basé sur la littérature ({getRecommendedRange(objective, ambition)?.sessions || "—"})
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Max séances par jour</Label>
                    <Select value={maxSessionsPerDay} onValueChange={setMaxSessionsPerDay}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 séance/jour max</SelectItem>
                        <SelectItem value="2">2 doubles max</SelectItem>
                        <SelectItem value="3">3 triples max</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      Elite : 3 • Age Group : 2 • Finisher : 1
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Renforcement/sem</Label>
                    <Select value={strengthSessionsPerWeek} onValueChange={setStrengthSessionsPerWeek}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0 — Aucun</SelectItem>
                        <SelectItem value="1">1 séance</SelectItem>
                        <SelectItem value="2">2 séances</SelectItem>
                        <SelectItem value="3">3 séances</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      2 recommandé • 0 si blessure
                    </p>
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
            </CollapsibleCard>

            {/* Detected Limiters — editable hierarchy (single mode only) */}
            {!isMultiMode && limiter && limiter.gapAnalysis.some(g => g.weightedImpact > 0) && (
              <CollapsibleCard
                title={<span className="text-sm">Hiérarchie des Limiteurs</span>}
                icon={<Zap className="h-4 w-4 text-primary" />}
                defaultOpen={false}
                storageKey="ai_plan_limiter_hierarchy"
                className="border-primary/30 bg-primary/5"
              >
                <LimiterHierarchyEditor
                  gaps={limiter.gapAnalysis}
                  confidence={limiter.confidence}
                  limiterLabel={limiter.limiterLabel}
                  limiterExplanation={limiter.limiterExplanation}
                  leverEmoji={limiter.leverEmoji}
                  leverLabel={limiter.leverLabel}
                  primaryLimiter={limiter.primaryLimiter}
                  onOrderChange={setCoachLimiterOrder}
                />
              </CollapsibleCard>
            )}

            {/* Adaptation Projections Summary */}
            {!isMultiMode && athleteContext && (() => {
              const projections = buildConfigFromDiag(athleteContext.diagnostic).adaptationProjections;
              return projections && projections.length > 0 ? (
                <CollapsibleCard
                  className="border-primary/20 bg-primary/5"
                  defaultOpen={false}
                  storageKey="ai_plan_adaptation_projections"
                  icon={<Crosshair className="h-4 w-4 text-primary" />}
                  title={<span className="text-sm">🔮 Projections Adaptation Predictor™</span>}
                >
                  <AdaptationProjectionSummary
                    projections={projections}
                    selectedLeverId={selectedProjectionLever}
                    onSelectLever={setSelectedProjectionLever}
                  />
                </CollapsibleCard>
              ) : null;
            })()}

            {/* Sync Banner — plan needs update */}
            {showSyncBanner && currentAthlete && (
              <Alert className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
                <RefreshCw className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                  Métriques mises à jour — {currentAthlete.nom}
                </AlertTitle>
                <AlertDescription className="text-xs text-amber-700 dark:text-amber-300">
                  Des données physiologiques clés ont changé. Cliquez sur «&nbsp;Générer&nbsp;» pour mettre à jour le plan.
                  Le plan actuel sera automatiquement archivé dans l'historique avant la régénération.
                </AlertDescription>
              </Alert>
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
                    {chunkProgress && chunkProgress.totalChunks > 1
                      ? `Bloc ${chunkProgress.currentChunk}/${chunkProgress.totalChunks} en cours... (S${chunkProgress.currentWeek}/${chunkProgress.totalWeeks})`
                      : "Génération en cours..."}
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
              (response || parsedPlan) ? (
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
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1.5">
                            <Apple className="h-4 w-4" /> Plan Nutritionnel
                          </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
                          <SheetHeader>
                            <SheetTitle>🍎 Plan Nutritionnel — {currentAthlete?.nom ?? 'Athlète'}</SheetTitle>
                          </SheetHeader>
                          <div className="mt-4">
                            {(() => {
                              if (!currentAthlete) return <p className="text-sm text-muted-foreground">Aucun athlète sélectionné.</p>;
                              const athleteSnaps = snapshots.filter(s => s.athlete_id === currentAthlete.id);
                              const snap = getEffectiveSnapshot(currentAthlete as any, athleteSnaps);
                              const objStr = String((snap as any)?.objectif || objective || currentAthlete.goal || '').toLowerCase();
                              const sport: 'velo' | 'cap' = /velo|bike|v[ée]lo/.test(objStr) ? 'velo' : 'cap';
                              const vlaRes = computeVLamaxEffectifDiag({
                                athleteId: currentAthlete.id,
                                objectif: objective || currentAthlete.goal || 'IM',
                                activeSnapshotId: currentAthlete.active_snapshot_id ?? null,
                                tests: tests ?? [],
                                snapshots: athleteSnaps,
                                sportOverride: sport === 'cap' ? 'cap' : undefined,
                              });
                              const tteRes = snap ? computeTTEEffectif({
                                ftp: snap.ftp,
                                tss_7d: (snap as any).tss_7d,
                                tte_mode: (snap as any).tte_mode,
                                tte_observed_min: (snap as any).tte_observed_min,
                                tte_observed_min_run: (snap as any).tte_observed_min_run,
                                sport: sport === 'cap' ? 'run' : 'bike',
                                objectif: objective || currentAthlete.goal || 'IM',
                              }) : null;
                              const goalLabel = raceGoals?.[0]?.objective || objective || currentAthlete.goal || 'IM';
                              return (
                                <NutritionUnifiedCard
                                  vlamaxValue={vlaRes?.value ?? null}
                                  vlamaxConfidence={vlaRes?.confidence ?? 0.7}
                                  vo2max={snap?.vo2max ?? null}
                                  tteMin={tteRes?.tte_min ?? null}
                                  sport={sport}
                                  objectif={String(goalLabel)}
                                  weightKg={snap?.weight_kg ?? null}
                                />
                              );
                            })()}
                          </div>
                        </SheetContent>
                      </Sheet>
                      {parsedPlan && athleteContext && currentAthlete && coachId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsAdaptDialogOpen(true)}
                          className="gap-1.5"
                        >
                          <Zap className="h-4 w-4" /> Adapter le plan
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={handleCopy}>
                        {copied ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { if (!window.confirm("Supprimer le plan sauvegardé pour cet athlète ? Cette action est irréversible.")) return; reset(); setIsSaved(false); setLoadedFromCacheAt(null); if (persistKey) localStorage.removeItem(persistKey); if (activePlanKey) localStorage.removeItem(activePlanKey); }}>
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Streaming indicator */}
                  {isLoading && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {chunkProgress && chunkProgress.totalChunks > 1 ? (
                          <span>
                            Bloc <strong>{chunkProgress.currentChunk}/{chunkProgress.totalChunks}</strong> en cours...
                            {" — "}Semaine <strong>{chunkProgress.currentWeek}</strong>/{chunkProgress.totalWeeks}
                          </span>
                        ) : (
                          <span>Génération en cours... Le plan interactif sera disponible à la fin.</span>
                        )}
                      </div>
                      {chunkProgress && chunkProgress.totalChunks > 1 && (
                        <Progress value={(chunkProgress.currentWeek / chunkProgress.totalWeeks) * 100} className="h-1.5" />
                      )}
                    </div>
                  )}

                  {/* Interactive View */}
                  {resultView === "interactive" && parsedPlan ? (
                    <>
                      <AIPlanBenchmark
                        plan={parsedPlan}
                        objective={objective}
                        ambition={ambition}
                        ambitionEffective={athleteContext ? buildConfigFromDiag(athleteContext.diagnostic)?.ambitionMeta?.effective : undefined}
                        ambitionEffectiveLabel={athleteContext ? buildConfigFromDiag(athleteContext.diagnostic)?.ambitionMeta?.effectiveLabel : undefined}
                        ambitionSaisieLabel={athleteContext ? buildConfigFromDiag(athleteContext.diagnostic)?.ambitionMeta?.saisieLabel : undefined}
                        athleteName={currentAthlete?.nom}
                        limiterResult={athleteContext?.diagnostic.limiter ?? null}
                        prohibitions={athleteContext ? buildConfigFromDiag(athleteContext.diagnostic)?.prohibitions : undefined}
                        identifiedLimiters={athleteContext ? buildConfigFromDiag(athleteContext.diagnostic)?.identifiedLimiters : undefined}
                        identifiedLimiterKeys={athleteContext ? deriveLimiterKeysFromGapAnalysis(athleteContext.diagnostic.limiter.gapAnalysis, coachLimiterOrder.length > 0 ? coachLimiterOrder : undefined) : undefined}
                        coachLimiterOrder={coachLimiterOrder.length > 0 ? coachLimiterOrder : undefined}
                        athleteData={athleteContext?.data}
                        raceWeekNumbers={(() => {
                          const allGoals = [
                            { raceDate: raceDate, priority: "A" as const },
                            ...raceGoals,
                          ];
                          const nums: number[] = [];
                          for (const g of allGoals) {
                            if (!g.raceDate) continue;
                            try {
                              const days = differenceInCalendarDays(parseISO(g.raceDate), planStartDate);
                              if (days >= 0) nums.push(Math.floor(days / 7) + 1);
                            } catch {}
                          }
                          return nums.length > 0 ? nums : undefined;
                        })()}
                      />
                      <RacePaceSimulation
                        objective={objective}
                        ambition={ambition}
                        vma={athleteContext?.data?.vma ?? null}
                        thresholdPace={athleteContext?.data?.paceThresholdSecPerKm ?? null}
                        vlamaxRun={athleteContext?.data?.vlamaxRun ?? null}
                        vo2max={athleteContext?.data?.vo2max ?? null}
                        weightKg={athleteContext?.data?.weightKg ?? null}
                        athleteName={currentAthlete?.nom}
                        intensityCenterPct={(() => {
                          // Centre d'intensité aligné sur les zones du coach IA (méthode TFCL).
                          // Marathon ≈ 88% seuil, Semi ≈ 93%, modulé par ambition.
                          const obj = objective.toLowerCase();
                          let center = obj.includes("marathon") && !obj.includes("semi") ? 88
                                     : obj.includes("semi") ? 93
                                     : null;
                          if (center == null) return null;
                          const a = (ambition || "").toLowerCase();
                          if (a.includes("elite") || a.includes("élite")) center += 2;
                          else if (a.includes("compet") || a.includes("compét")) center += 1;
                          else if (a.includes("loisir") || a.includes("découverte") || a.includes("decouverte")) center -= 2;
                          return center;
                        })()}
                        calibrationSource={
                          athleteContext?.data?.paceThresholdSecPerKm
                            ? "Plan IA · allure seuil mesurée"
                            : "Plan IA · estimation depuis VMA"
                        }
                      />
                      {/* Nolio sending panel is now rendered at the top of AIPlanViewer */}
                      <AIPlanViewer
                        plan={parsedPlan}
                        startDate={planStartDate}
                        raceGoals={[
                          {
                            priority: "A" as const,
                            objective,
                            raceName: raceName || undefined,
                            raceDate: raceDate || undefined,
                            distanceKm: (objective || "").toLowerCase().startsWith("trail") ? (parseFloat(trailDistanceKm) || undefined) : undefined,
                            elevationGainM: (objective || "").toLowerCase().startsWith("trail") ? (parseInt(trailElevationM, 10) || undefined) : undefined,
                            maxAltitudeM: (objective || "").toLowerCase().startsWith("trail") ? (parseInt(trailMaxAltitudeM, 10) || undefined) : undefined,
                          },
                          ...raceGoals,
                        ].filter(goal => goal.raceDate)}
                        onSaveToPlan={handleSaveToPlan}
                        isSaving={isSaving}
                        isSaved={isSaved}
                        onRegenerateWeek={handleRegenerateWeek}
                        onRegenerateFutureWeeks={handleRegenerateFutureWeeks}
                        isRegenerating={isRegenerating}
                        athleteName={currentAthlete?.nom}
                        athleteId={currentAthlete?.id}
                        currentWeekNumber={currentWeekNumber}
                        loadedFromCacheAt={loadedFromCacheAt}
                        adaptationProjections={
                          athleteContext
                            ? buildConfigFromDiag(athleteContext.diagnostic).adaptationProjections
                            : undefined
                        }
                        gapContext={(() => {
                          const ambRes = computeAmbitionEffective({
                            ambitionSaisie: ambition,
                            trainingLevel: trainingLevel === "auto" ? undefined : (trainingLevel as any),
                            tss7d: athleteContext?.diagnostic?._rawInput?.tss7d ?? null,
                            lockAmbition,
                          });

                          return {
                            ambition, // saisie — gap calculé vers l'objectif visé par l'utilisateur
                            ambitionEffective: ambRes.ambitionEffective, // toujours propagée : titre/PDF/Récap consomment l'effective
                            objective,
                            weeklyHours: parseFloat(weeklyHours) || null,
                            vmaKmh: athleteContext?.data?.vma ?? null,
                            thresholdPaceSecPerKm: athleteContext?.data?.paceThresholdSecPerKm ?? null,
                          };
                        })()}
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

        {/* Plan history (saved versions) */}
        <PlanHistoryCard refreshKey={historyRefreshKey} onLoadVersion={handleLoadVersion} />
      </div>
      <LoadVersionDialog
        version={pendingVersion}
        onClose={() => setPendingVersion(null)}
        onConfirm={(startDate) => {
          if (pendingVersion) applyLoadedVersion(pendingVersion, startDate);
          setPendingVersion(null);
        }}
      />
      {parsedPlan && athleteContext && currentAthlete && coachId && (
        <PlanAdaptationDialog
          open={isAdaptDialogOpen}
          onOpenChange={setIsAdaptDialogOpen}
          athleteId={currentAthlete.id}
          coachId={coachId}
          athleteName={currentAthlete.nom}
          currentPlan={parsedPlan}
          athleteData={athleteContext.data}
          baseConfig={buildConfigFromDiag(athleteContext.diagnostic)}
          onAdapted={() => {
            toast.success("Plan adapté — l'historique est mis à jour");
            setHistoryRefreshKey(k => k + 1);
          }}
        />
      )}
      <FinisherQuickStartDialog
        open={expressDialogOpen}
        onOpenChange={setExpressDialogOpen}
        defaultObjectif={currentAthlete?.objectif}
        onSubmit={handleExpressSubmit}
      />
      <CoachProfileForm
        open={coachFormOpen}
        onOpenChange={setCoachFormOpen}
        athleteName={currentAthlete?.nom}
        objectifLabel={OBJECTIVE_OPTIONS.find(o => o.value === objective)?.label || objective}
        prefill={coachPrefill}
        onSubmit={handleCoachFormSave}
        onGenerate={handleCoachFormGenerate}
      />
      <QuickStartWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        athleteName={currentAthlete?.nom}
        defaultObjective={currentAthlete?.objectif || objective}
        onGenerate={handleWizardGenerate}
        onReview={handleWizardReview}
      />
    </AppLayout>
  );
}

type LoadChoice = "created" | "today" | "monday";

function LoadVersionDialog({
  version,
  onClose,
  onConfirm,
}: {
  version: { plan_json: any; created_at?: string } | null;
  onClose: () => void;
  onConfirm: (startDate: Date) => void;
}) {
  const [choice, setChoice] = useState<LoadChoice>("monday");
  const pj = version?.plan_json || {};
  const originalRaw: string | undefined = pj._planStartDate || version?.created_at;
  const original = originalRaw ? parseISO(originalRaw) : null;
  const hasOriginal = !!(original && !isNaN(original.getTime()));

  // Default to "created" if available, else "monday"
  useEffect(() => {
    if (version) setChoice(hasOriginal ? "created" : "monday");
  }, [version, hasOriginal]);

  const resolveDate = (): Date => {
    if (choice === "created" && hasOriginal) return original!;
    if (choice === "today") return new Date();
    return startOfWeek(new Date(), { weekStartsOn: 1 });
  };

  return (
    <AlertDialog open={!!version} onOpenChange={(o) => { if (!o) onClose(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Date de début du plan</AlertDialogTitle>
          <AlertDialogDescription>
            Choisissez à partir de quelle date afficher les semaines de ce plan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <RadioGroup value={choice} onValueChange={(v) => setChoice(v as LoadChoice)} className="space-y-2 py-2">
          {hasOriginal && (
            <label className="flex items-start gap-2 cursor-pointer rounded-md border border-border p-3 hover:bg-accent/50">
              <RadioGroupItem value="created" className="mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">Date de création d'origine</div>
                <div className="text-xs text-muted-foreground">
                  {format(original!, "d MMMM yyyy")} — voir l'état d'avancement
                </div>
              </div>
            </label>
          )}
          <label className="flex items-start gap-2 cursor-pointer rounded-md border border-border p-3 hover:bg-accent/50">
            <RadioGroupItem value="monday" className="mt-0.5" />
            <div className="text-sm">
              <div className="font-medium">Lundi de la semaine actuelle</div>
              <div className="text-xs text-muted-foreground">
                {format(startOfWeek(new Date(), { weekStartsOn: 1 }), "d MMMM yyyy")}
              </div>
            </div>
          </label>
          <label className="flex items-start gap-2 cursor-pointer rounded-md border border-border p-3 hover:bg-accent/50">
            <RadioGroupItem value="today" className="mt-0.5" />
            <div className="text-sm">
              <div className="font-medium">Aujourd'hui</div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(), "d MMMM yyyy")}
              </div>
            </div>
          </label>
        </RadioGroup>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(resolveDate())}>
            Charger
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
