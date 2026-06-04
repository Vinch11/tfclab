import { useState, useEffect, useMemo, useCallback } from "react";
import { fatigueStateToScoreOrDefault } from "@/lib/fatigueStateMapping";
import { usePersistedDialogState } from "@/hooks/usePersistedFormState";
import { SidebarLayout } from "@/components/SidebarLayout";
import { MetricCard } from "@/components/MetricCard";
import { TrainingZonesCard } from "@/components/TrainingZonesCard";
import { TestProtocols } from "@/components/TestProtocols";
import { VLamaxTestingPage } from "@/components/VLamaxTestingPage";
import { RaceChecklist } from "@/components/RaceChecklist";
import { NolioMapping } from "@/components/NolioMapping";
import { AthleteProfile } from "@/components/AthleteProfile";
import { FeedbackNolioManager } from "@/components/FeedbackNolioManager";
import { TwoForCoachingAnalysis } from "@/components/TwoForCoachingAnalysis";
import { TestComparison } from "@/components/TestComparison";
import { PhysiologicalAnalysis } from "@/components/PhysiologicalAnalysis";

import { IndexSeancesView } from "@/components/IndexSeances";

import { ExportTools } from "@/components/ExportTools";
import { SnapshotManager } from "@/components/SnapshotManager";
import { LowCRRJustificationCard } from "@/components/LowCRRJustificationCard";
import { DashboardRecommendationsCard } from "@/components/DashboardRecommendationsCard";
import { SnapshotEvolutionChart } from "@/components/SnapshotEvolutionChart";
import { AthleteRefsPanel } from "@/components/AthleteRefsPanel";
import { FtpKgTargetsCard } from "@/components/FtpKgTargetsCard";
import { VmaTargetsCard } from "@/components/VmaTargetsCard";
import { MetricHelpButton } from "@/components/MetricHelpButton";
import { calculateAge } from "@/lib/ageAdjustment";
import { getVLamaxOptimal, getTTETargetByAmbition, getTargetsForAmbition } from "@/lib/physiologicalTargets";
import { AgeAdjustmentBadge } from "@/components/AgeAdjustmentBadge";

import { NutritionPredictive } from "@/components/NutritionPredictive";
import { NutritionTimingCard } from "@/components/NutritionTimingCard";
import { RunningEconomyModule } from "@/components/RunningEconomyModule";
import { RunningEconomySummaryCard } from "@/components/RunningEconomySummaryCard";
import { VLamaxCAPCard } from "@/components/VLamaxCAPCard";
import { useRunningFocusMode } from "@/hooks/useRunningFocusMode";
import { SaisonPhasesView } from "@/components/SaisonPhasesView";
import { StaffReport } from "@/components/StaffReport";
import { StaffBriefingCard } from "@/components/StaffBriefingCard";
import { AssistantDrawer } from "@/components/AssistantDrawer";
import { computeNutritionTiming } from "@/lib/nutritionTiming";
import { computeNutritionEstimate } from "@/lib/nutritionPredictive";
// Audit 2C F19 — migré V1 → V2 (score 0-100 + O2 cost canonique).
import { computeRunningEconomyV2 } from "@/lib/v2/runningEconomyV2";
import { computeEnergyDrift, EnergyDriftResult } from "@/lib/energyDrift";
import { DashboardGauges } from "@/components/DashboardGauges";
import { StaffDashboard } from "@/components/StaffDashboard";
import { ScientificChartsDashboard, MetabolicPerformanceCompass, MetabolicCompassCAP, AmbitionProgressChart, AmbitionProgressMini, CompactMetricsGrid, CarbBurnRateChart, MetabolicPowerCurve } from "@/components/charts";
import { ChargeRecenteCard } from "@/components/ChargeRecenteCard";
import { computeCRR } from "@/lib/chargeRecenteReference";
// ✅ Potentiel Physiologique - Carte unifiée (Phase 1c UX)
import { computeCompassScores, type CompassScores } from "@/lib/compassScoring";
import { DecisionReliabilityCard } from "@/components/DecisionReliabilityCard";
import { computeFullDRE, type DecisionReliabilityResult } from "@/engines/diagnostic";
import { useDecisionReliability } from "@/hooks/useDecisionReliability";
import { SortableSectionsContainer } from "@/components/SortableSectionsContainer";

// ✅ VLamax TFCL V2 - Carte unifiée (Phase 1 UX)
import { VLamaxUnifiedCard } from "@/components/VLamaxUnifiedCard";
import { VLamaxProfileScale } from "@/components/VLamaxProfileScale";
import { NolioAnalysisCard } from "@/components/NolioAnalysisCard";
import { VLamaxZoneConfidenceChart } from "@/components/charts/VLamaxZoneConfidenceChart";
import { VLamaxEstimationWidget } from "@/components/charts/VLamaxEstimationWidget";
import { Phase3Dashboard } from "@/components/Phase3Dashboard";
import { LorangTestChecklist } from "@/components/LorangTestChecklist";
import { FatMaxTFCLCard } from "@/components/FatMaxTFCLCard";
import { FatMaxRaceIntensityChart } from "@/components/charts/FatMaxRaceIntensityChart";
import { FatCarbOxidationChart } from "@/components/charts/FatCarbOxidationChart";
import { computeFatMaxTFCL, computeFatMaxAnchorPctFTP, FatMaxObjectif } from "@/lib/v2/fatmaxTFCL";
import { ObjectifPrincipal } from "@/lib/reference";
// ✅ Zones Métaboliques - Carte unifiée (Phase 1b UX)
import { MetabolicZonesUnifiedCard } from "@/components/MetabolicZonesUnifiedCard";

// ✅ TFCL Decision Matrix — Cœur décisionnel coach-grade
import { TFCLDecisionMatrixCard } from "@/components/TFCLDecisionMatrixCard";
import { TFCLDecisionMatrixTable } from "@/components/TFCLDecisionMatrixTable";
import { type TFCLDecisionInput, type TFCLObjective, type LorangStrategyInput, computeLorangStrategy, type LorangStrategyResult } from "@/engines/decision";
import { computeFatigueEffectif, type FatigueEffectif } from "@/engines/diagnostic";
import { computeLactateThresholdsTFCL } from "@/lib/thresholds/computeLactateThresholdsTFCL";

// ✅ Lorang Strategy Engine — Leviers opérationnels TFCL
import { LorangStrategyCard } from "@/components/LorangStrategyCard";
import { LorangDecisionFlowChart } from "@/components/LorangDecisionFlowChart";

// ✅ Coach Decision Center — Carte unifiée (Phase 2 Architecture)
import { CoachDecisionUnifiedCard } from "@/components/CoachDecisionUnifiedCard";
import { CoachingCompassCard } from "@/components/CoachingCompassCard";
import { RaceReadinessReportDialog } from "@/components/RaceReadinessReportDialog";

// ✅ Dashboard Simplifié — 4 sections linéaires
import { AnalyseSection } from "@/components/simplified/AnalyseSection";
import { LimiteursSection } from "@/components/simplified/LimiteursSection";
import { LeviersSection } from "@/components/simplified/LeviersSection";

// ✅ Engines unifiés
import { computeDiagnostic, type DiagnosticInput } from "@/engines/diagnostic";
import { estimateFromRaceChronos } from "@/engines/diagnostic/raceTimeEstimator";

// ✅ Cycle Intelligence Engine™
import { CycleIntelligenceCard } from "@/components/CycleIntelligenceCard";

// ✅ Adaptation Predictor™
import { AdaptationPredictorCard } from "@/components/AdaptationPredictorCard";
import { computeDecision, type DecisionInput } from "@/engines/decision";

// ✅ Profil & Ambition — Carte unifiée (Phase 1f UX)
import { ProfilAmbitionUnifiedCard } from "@/components/ProfilAmbitionUnifiedCard";

// ✅ Quick Actions Panel
import { QuickActionsPanel } from "@/components/QuickActionsPanel";

// ✅ W'bal Recovery Card — Repos optimaux individualisés
import { WbalRecoveryCard } from "@/components/WbalRecoveryCard";
// ✅ CP/W' Courbe Puissance-Durée
import { CPWPrimeCurveCard } from "@/components/CPWPrimeCurveCard";
// ✅ CP/W' computation for limiter detection
import { analyzeCriticalPower } from "@/lib/v2/criticalPowerModel";

// ✅ Roadmap Stratégique
import { RoadmapStrategique } from "@/components/RoadmapStrategique";
import { detectUnifiedLimiter, type UnifiedLimiterResult } from "@/engines/diagnostic";
// ✅ FIX 11 - Effective Refs (source unique de vérité)
import { getEffectiveRefs, computeFtpKg, getMissingFields } from "@/lib/effectiveRefs";
import { resolveCompassSportFocus } from "@/lib/sportMainDeduction";

// ✅ Guide interactif de complétion des données
import { DataCompletionGuide } from "@/components/DataCompletionGuide";

// ✅ Checklist de démarrage pour nouveaux coachs
import { GettingStartedChecklist, useGettingStartedVisibility } from "@/components/GettingStartedChecklist";

// ✅ Page de configuration (thèmes, préférences)
import { ConfigurationPage } from "@/components/ConfigurationPage";

// ✅ VO2max Age Comparison Card
import { VO2maxAgeComparisonCard } from "@/components/VO2maxAgeComparisonCard";

// ✅ Scénarios TTE & VLamax (3 niveaux: Conservateur, Optimal, Agressif)
import { TTEScenarioDisplay, VLamaxScenarioDisplay } from "@/components/ScenarioComparisonCard";
import { generateTTEScenarios, generateVLamaxScenarios } from "@/lib/v2/scenarioEngine";

// ✅ Athlete Objective Manager — Gestion des objectifs
import { AthleteObjectiveManager } from "@/components/AthleteObjectiveManager";
import { useAthleteRaceGoals } from "@/hooks/useAthleteRaceGoals";

// ✅ Header components - Quick selectors & Next Race
import { NextRaceIndicator } from "@/components/NextRaceIndicator";
import { QuickObjectiveSelector } from "@/components/QuickObjectiveSelector";

// ✅ Sections rapport intégrées dans les onglets
import { SyntheseExecutiveCard } from "@/components/SyntheseExecutiveCard";
import { NutritionUnifiedCard } from "@/components/NutritionUnifiedCard";
import { PacingEnvelopeCard } from "@/components/PacingEnvelopeCard";
import { DoubleBoucleCAPCard } from "@/components/DoubleBoucleCAPCard";
import { WahooSuggestionsCard } from "@/components/WahooSuggestionsCard";
import { ComprendreScoresCard } from "@/components/ComprendreScoresCard";
import { LactateCorrespondenceCard } from "@/components/LactateCorrespondenceCard";
import { CalibrationEvidenceSummaryCard } from "@/components/CalibrationEvidenceSummaryCard";
import { suggestWahooWorkouts, type SuggestionEngineContext } from "@/lib/wahoo/wahooSuggestionEngine";
import { computeNutritionV2 } from "@/lib/v2/nutritionV2";
import { type PacingEnvelopeInput } from "@/lib/v2/pacingEnvelopeEngine";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

import {
  Zap,
  Target,
  Flame,
  Brain,
  Dumbbell,
  Plus,
  Trash2,
  LogOut,
  Loader2,
  User,
  Camera,
  ClipboardCheck,
  Settings2,
  CalendarDays,
  Star,
  Trophy,
  Calculator,
  Shield,
  Sparkles,
} from "lucide-react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import logo2fc from "@/assets/logo-2fc.png";
import { useAuth } from "@/contexts/AuthContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { useAthletes } from "@/contexts/AthleteContext";
import { DbAthlete, DbSnapshot } from "@/hooks/useCloudData";
import { FeedbackNolio } from "@/types/feedbackNolio";
import { toast } from "sonner";
import { usePlanSnapshotSync } from "@/hooks/usePlanSnapshotSync";
import { PlanSyncAlert } from "@/components/PlanSyncAlert";

// ✅ Legacy types/helpers (utilisés par tes composants actuels)
import { getDernierSnapshot } from "@/types/athlete";
import { computeVLamaxEffectif, type VLamaxEffectif, computeTTEEffectif, type TTEEffectif, getSourceLabel } from "@/engines/diagnostic";
import { mapSnapshotToV2 } from "@/lib/mapSnapshotToV2";

import { computePotentielEffectif, type PotentielPhysiologiqueEffectif, type PotentielInput } from "@/lib/potentielPhysiologiqueEffectif";
// ✅ RACE READINESS EFFECTIF - Source unique de vérité

// ✅ Ambition (modulateur des cibles)
import {
  AmbitionLevel,
  AMBITION_LEVELS_ORDERED,
  DEFAULT_AMBITION,
  getAmbitionDefinition,
  getAthleteAmbition,
  getRunningTimeHint,
  normalizeAmbitionLevel,
} from "@/types/ambitionLevel";

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Cloud data pour les données brutes (snapshots, tests, checkins)
  const { snapshots, tests, checkins, loading, loadData, addAthlete, updateAthlete, deleteAthlete, addTest, deleteTest, updateSnapshot: rawUpdateSnapshot, addCheckin, updateCheckin, getCheckinsForAthlete, plans, getPlan } = useCloudDataContext();
  
  // ✅ Plan Sync — détecte les changements de métriques clés
  const { pendingSync, isAlertVisible, detectKeyMetricChanges, dismissSync } = usePlanSnapshotSync();

  // Wrapper updateSnapshot pour détecter les changements impactant le plan IA
  const updateSnapshot = async (id: string, updates: Partial<DbSnapshot>) => {
    const oldSnapshot = snapshots.find(s => s.id === id);
    const result = await rawUpdateSnapshot(id, updates);
    
    if (result && oldSnapshot) {
      const athlete = athletes.find(a => a.active_snapshot_id === id);
      if (athlete) {
        const hasPlan = !!getPlan(athlete.id);
        detectKeyMetricChanges(oldSnapshot, updates, athlete.id, athlete.nom, hasPlan);
      }
    }
    return result;
  };


  // ✅ Utiliser AthleteContext pour la synchronisation avec les composants de recommandation
  const { 
    athletes, 
    currentAthlete: contextCurrentAthlete, 
    selectedAthleteId, 
    setSelectedAthleteId 
  } = useAthletes();

  // ✅ Running Focus Mode - activé automatiquement pour objectifs CAP
  const { isRunningOnly, raceType, raceLabel, targets: runningTargets } = useRunningFocusMode();

  // Mapper currentAthlete du contexte vers le format DbAthlete attendu par Index
  const currentAthlete = useMemo(() => {
    if (!contextCurrentAthlete) return null;
    // Retourner un format compatible DbAthlete pour les composants existants
    return {
      id: contextCurrentAthlete.id,
      name: contextCurrentAthlete.nom,
      goal: contextCurrentAthlete.objectif,
      refs: contextCurrentAthlete.refs,
      vo2max: contextCurrentAthlete.vo2max,
      active_snapshot_id: contextCurrentAthlete.active_snapshot_id,
      birth_date: contextCurrentAthlete.dateNaissance,
      coach_id: "", // Non utilisé dans Index
      created_at: "", // Non utilisé dans Index
    } as DbAthlete;
  }, [contextCurrentAthlete]);

  // ✅ Race Goals - Gestion des objectifs de course (après currentAthlete)
  const { 
    raceGoals, 
    addRaceGoal, 
    deleteRaceGoal, 
    updateAthleteGoal, 
    restoreRaceGoal,
    updateRaceGoalDate,
    loading: raceGoalsLoading,
  } = useAthleteRaceGoals(currentAthlete?.id ?? null);

  // Tabs valides gérés par cette page
  const validTabs = ["dashboard", "profil", "strategie", "configuration"];
  
  const [activeTab, setActiveTab] = useState(() => {
    // D'abord, vérifier si on a un state de navigation
    const navigationState = location.state as { activeTab?: string } | null;
    if (navigationState?.activeTab && validTabs.includes(navigationState.activeTab)) {
      return navigationState.activeTab;
    }
    
    // Sinon, restaurer l'onglet depuis localStorage
    const saved = localStorage.getItem("vlab-active-tab");
    // Valider que le tab existe, sinon fallback sur dashboard
    return saved && validTabs.includes(saved) ? saved : "dashboard";
  });
  
  // Écouter les changements de navigation pour mettre à jour le tab si nécessaire
  useEffect(() => {
    const navigationState = location.state as { activeTab?: string; openExport?: boolean } | null;
    if (navigationState?.activeTab && validTabs.includes(navigationState.activeTab)) {
      setActiveTab(navigationState.activeTab);
    }
    if (navigationState?.openExport) {
      setExportOpen(true);
    }
  }, [location.state]);
  
  // Persister l'onglet actif dans localStorage
  useEffect(() => {
    localStorage.setItem("vlab-active-tab", activeTab);
  }, [activeTab]);
  
  const [showPhysioAnalysis, setShowPhysioAnalysis] = useState(false);
  
  // ✅ Persisted state for snapshot panel to survive page minimize/restore
  const [showSnapshots, setShowSnapshots] = usePersistedDialogState("vlab-show-snapshots", false);
  const [showCheckins, setShowCheckins] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [readinessOpen, setReadinessOpen] = useState(false);

  // ✅ Mode Staff toggle (affichage expert avec indices de confiance)
  const [staffMode, setStaffMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("vlab-staff-mode");
    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("vlab-staff-mode", staffMode.toString());
  }, [staffMode]);

  // ✅ Visibilité persistante du guide "Bien démarrer"
  const gettingStartedVisibility = useGettingStartedVisibility();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAthleteName, setNewAthleteName] = useState("");
  const [newAthleteGoal, setNewAthleteGoal] = useState("IM");
  const [newAthleteBirthDate, setNewAthleteBirthDate] = useState("");

  // Feedbacks (localStorage pour l'instant)
  const [feedbacksNolio, setFeedbacksNolio] = useState<FeedbackNolio[]>(() => {
    const saved = localStorage.getItem("loranglab-feedbacks");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });

  // Ambition courante (stockée dans athlete.refs.ambition)
  const currentAmbition: AmbitionLevel = useMemo(() => {
    return getAthleteAmbition(currentAthlete);
  }, [currentAthlete]);

  const updateCurrentAthleteAmbition = useCallback(
    async (ambition: AmbitionLevel) => {
      if (!currentAthlete) return;
      const refs = (currentAthlete.refs || {}) as Record<string, any>;
      const ok = await updateAthlete(currentAthlete.id, {
        refs: { ...refs, ambition } as any,
      });
      if (ok) toast.success("Ambition mise à jour");
    },
    [currentAthlete, updateAthlete],
  );

  // ============================================
  // ✅ FIX 3B — Snapshot "effectif" (actif sinon dernier)
  // ============================================
  const pickEffectiveSnapshot = (athleteId: string, activeSnapshotId?: string | null): DbSnapshot | null => {
    const list = (snapshots || []).filter((s) => s.athlete_id === athleteId);
    if (list.length === 0) return null;

    if (activeSnapshotId) {
      const active = list.find((s) => s.id === activeSnapshotId);
      if (active) return active;
    }

    // Dernier par date
    return [...list].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  };

  // ============================================
  // ✅ FIX 3C — Convert DbAthlete -> Athlete "legacy" + historique depuis snapshot cloud
  //     + IMPORTANT: map TSS_7d -> tss_7j (compat legacy)
  // ============================================
  const convertToLegacyAthlete = (dbAthlete: DbAthlete) => {
    const refs = (dbAthlete.refs || {}) as Record<string, unknown>;
    const effective = pickEffectiveSnapshot(dbAthlete.id, dbAthlete.active_snapshot_id);
    const legacyAmbition = getAthleteAmbition(dbAthlete);

    // Snapshot compat (format SnapshotNolio minimal) pour alimenter tes composants existants
    const legacySnapshot = effective
      ? ({
          id: effective.id,
          date: effective.date,
          sport: "vélo",
          // ✅ FIX 11: null au lieu de 70 (pas de fallback inventé)
          poids: effective.weight_kg ?? undefined,
          ftp: effective.ftp ?? 0,
          pmax_5s: effective.pmax_5s ?? undefined,

          // ✅ KEY: tu veux tss_7d -> on le remonte ici pour que tes composants legacy lisent un TSS réel
          // (ils attendent tss_7j, on garde le champ legacy)
          tss_7j: effective.tss_7d ?? 0,

          vo2max: effective.vo2max ?? undefined,
          vma: effective.vma ?? undefined,
          css: effective.css ?? undefined,
          source: (effective.source as any) ?? "manual",

          // (optionnel) on passe aussi les champs PRO si tu veux les exploiter plus tard
          tte_mode: effective.tte_mode ?? undefined,
          tte_observed_min: effective.tte_observed_min ?? undefined,
        } as any)
      : null;

    return {
      id: dbAthlete.id,
      nom: dbAthlete.name,
      sexe: (dbAthlete.sex as "M" | "F") || (refs.sexe as "M" | "F") || "M", // ✅ FIX: Priorité colonne DB
      objectif: (dbAthlete.goal as any) || "IM",
      ambition: legacyAmbition,
      // ✅ FIX: Mapper fatPct (format Cloud) vers masse_grasse (format legacy)
      masse_grasse: typeof refs.fatPct === "number" ? refs.fatPct : 
                    typeof refs.masse_grasse === "number" ? refs.masse_grasse : undefined,
      historique: legacySnapshot ? [legacySnapshot] : [],
      tests: [],
      refs: {
        fcMax: (refs.fcMax as number) || null,
        vma: (refs.vma as number) || null,
        ftp: (refs.ftp as number) || null,
        css: (refs.css as number) || null,
        ambition: legacyAmbition,
      },
      vo2max: dbAthlete.vo2max || undefined,
    };
  };

  const legacyAthlete = useMemo(() => {
    if (!currentAthlete) return null;
    return convertToLegacyAthlete(currentAthlete);
  }, [currentAthlete, snapshots]);

  // ============================================
  // ✅ FIX 3B (suite) — métriques dashboard basées sur snapshot cloud, plus mock
  //     + TTE PRO (2 modules) -> redevient pertinent
  // ============================================
  const snapshotLegacy = legacyAthlete ? (getDernierSnapshot(legacyAthlete) as any) : null;

  // On reprend aussi le snapshot cloud effectif pour calculs PRO fiables
  const effectiveCloudSnapshot = useMemo(() => {
    if (!currentAthlete) return null;
    return pickEffectiveSnapshot(currentAthlete.id, currentAthlete.active_snapshot_id);
  }, [currentAthlete, snapshots]);

  // ✅ VLamax EFFECTIF - Source unique de vérité (utilise données Cloud)
  const vlamaxEffectif = useMemo<VLamaxEffectif>(() => {
    if (!currentAthlete) {
      return { value: null, source: "unknown", confidence: 0, label: "VLamax (non disponible)" };
    }
    return computeVLamaxEffectif({
      athleteId: currentAthlete.id,
      objectif: currentAthlete.goal || "IM",
      activeSnapshotId: currentAthlete.active_snapshot_id,
      tests: tests.map(t => ({
        athlete_id: t.athlete_id,
        vlamax: t.vlamax,
        date: t.date,
        type: t.type,
        name: t.name,
      })),
      snapshots: snapshots.map(mapSnapshotToV2),
    });
  }, [currentAthlete, tests, snapshots]);

  const vlamax = vlamaxEffectif.value ?? 0;

  // ✅ FIX 11 - Effective Refs centralisées (plus de fallback 70kg/18%)
  const effectiveRefs = useMemo(() => {
    return getEffectiveRefs(currentAthlete, snapshots);
  }, [currentAthlete, snapshots]);

  // FTP et poids depuis les refs effectives (null si non renseigné, pas de fallback)
  const ftp = useMemo(() => effectiveRefs.ftp ?? 0, [effectiveRefs]);
  const poids = useMemo(() => effectiveRefs.weightKg, [effectiveRefs]);
  const ftp_kg = useMemo(() => computeFtpKg(effectiveRefs), [effectiveRefs]);

  // ✅ TTE EFFECTIF - Source unique de vérité
  const tteEffectif = useMemo<TTEEffectif>(() => {
    if (!effectiveCloudSnapshot || !currentAthlete) {
      return {
        tte_min: 45,
        source: "unknown",
        confidence: 0,
        label: "TTE (non disponible)",
        target: 45,
        status: "warning",
        status_message: "Aucune donnée"
      };
    }
    return computeTTEEffectif({
      ftp: effectiveCloudSnapshot.ftp ?? null,
      tss_7d: effectiveCloudSnapshot.tss_7d ?? null,
      tte_mode: effectiveCloudSnapshot.tte_mode ?? "LOAD",
      tte_observed_min: effectiveCloudSnapshot.tte_observed_min ?? null,
      objectif: currentAthlete.goal || "IM",
      age: currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null, // F33
    });
  }, [effectiveCloudSnapshot, currentAthlete]);

  // TTE CAP (run) séparé : alimente la durabilité du Compass pour triathlon (min bike/run).
  const tteEffectifRun = useMemo(() => {
    if (!effectiveCloudSnapshot || !currentAthlete) return null;
    return computeTTEEffectif({
      ftp: effectiveCloudSnapshot.ftp ?? null,
      tss_7d: effectiveCloudSnapshot.tss_7d ?? null,
      tte_observed_min_run: (effectiveCloudSnapshot as any).tte_observed_min_run ?? null,
      sport: "run",
      objectif: currentAthlete.goal || "IM",
      age: currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null,
    });
  }, [effectiveCloudSnapshot, currentAthlete]);

  // ✅ Valeur TTE affichée partout (Index) - fallback 0 pour compatibilité
  const tte = useMemo(() => {
    return tteEffectif?.tte_min ?? 0;
  }, [tteEffectif]);

  // Potentiel Physiologique stub (module removed)
  const potentielPhysiologiqueEffectif = useMemo(() => {
    return computePotentielEffectif({
      objectif: currentAthlete?.goal || "IM",
      vlamaxEffectif,
      tteEffectif,
      ftp,
      poids: poids ?? undefined,
      fatigue_ok: true,
      seance_specifique_validee: false,
      ambition: currentAmbition,
      tss7d: effectiveCloudSnapshot?.tss_7d ?? null,
    });
  }, [currentAthlete, vlamaxEffectif, tteEffectif, ftp, poids, effectiveCloudSnapshot, currentAmbition]);


  // ✅ NUTRITION ESTIMATE - Pour rapport staff
  const nutritionEstimate = useMemo(() => {
    return computeNutritionEstimate({
      vlamax: vlamaxEffectif.value,
      objectif: currentAthlete?.goal || "IM",
      tteMin: tteEffectif.tte_min,
      tteTarget: tteEffectif.target,
      vo2max: effectiveCloudSnapshot?.vo2max ?? currentAthlete?.vo2max ?? null,
      weightKg: poids ?? null,
    });
  }, [vlamaxEffectif, currentAthlete, tteEffectif]);

  // ✅ RUNNING ECONOMY - Pour rapport staff
  const runningEconomyResult = useMemo(() => {
    return computeRunningEconomyV2({
      fcMax: effectiveRefs.fcMax ?? null,
      // Dérive cardiaque mesurée depuis les sessions FIT
      hrDriftPct: effectiveCloudSnapshot?.run_hr_drift_pct ?? null,
      tteMin: tteEffectif.tte_min,
      weightKg: effectiveRefs.weightKg ?? null,
      objectif: currentAthlete?.goal || "IM",
      sport: (currentAthlete as any)?.sport_main ?? undefined,
    });
  }, [effectiveRefs, tteEffectif, currentAthlete, effectiveCloudSnapshot]);

  // ✅ ENERGY DRIFT - Source unique de vérité
  const energyDrift = useMemo<EnergyDriftResult>(() => {
    return computeEnergyDrift({
      vlamaxEffectif,
      tteEffectif,
      objectif: currentAthlete?.goal || "IM",
      tss7d: effectiveCloudSnapshot?.tss_7d ?? null,
    });
  }, [vlamaxEffectif, tteEffectif, currentAthlete, effectiveCloudSnapshot]);

  // ✅ DECISION RELIABILITY ENGINE - Score de confiance décisionnelle
  const decisionReliability = useMemo<DecisionReliabilityResult>(() => {
    return computeFullDRE({
      snapshotId: effectiveCloudSnapshot?.id ?? "",
      athleteId: currentAthlete?.id ?? "",
      coachId: user?.id ?? "",
      objective: currentAthlete?.goal || "IM",
      
      vlamax: vlamaxEffectif.value,
      vlamaxConfidence: vlamaxEffectif.confidence,
      tteMin: tteEffectif.tte_min,
      tteConfidence: tteEffectif.confidence,
      fatmaxPct: null,
      vo2max: effectiveCloudSnapshot?.vo2max ?? null,
      ftp: effectiveCloudSnapshot?.ftp ?? null,
      weightKg: effectiveCloudSnapshot?.weight_kg ?? null,
      p30s: (effectiveCloudSnapshot as unknown as Record<string, unknown>)?.p30s_w as number | null ?? null,
      p1min: (effectiveCloudSnapshot as unknown as Record<string, unknown>)?.p60s_w as number | null ?? null,
      map5min: (effectiveCloudSnapshot as unknown as Record<string, unknown>)?.map5min_w as number | null ?? null,
      pmax5s: effectiveCloudSnapshot?.pmax_5s ?? null,
      
      isReferenceWeek: (effectiveCloudSnapshot as unknown as Record<string, unknown>)?.vlamax_is_reference === true,
      fatigueState: ((effectiveCloudSnapshot as unknown as Record<string, unknown>)?.fatigue_state as string) === "fatigued" ? "fatigued" 
        : ((effectiveCloudSnapshot as unknown as Record<string, unknown>)?.fatigue_state as string) === "fresh" ? "fresh" 
        : "normal",
    });
  }, [currentAthlete, user, effectiveCloudSnapshot, vlamaxEffectif, tteEffectif]);

  // ✅ W' computation for limiter detection
  const cpResultForLimiter = useMemo(() => {
    if (!effectiveCloudSnapshot) return null;
    return analyzeCriticalPower({
      pmax_5s: effectiveCloudSnapshot.pmax_5s,
      p30s_w: effectiveCloudSnapshot.p30s_w,
      p60s_w: effectiveCloudSnapshot.p60s_w,
      map5min_w: effectiveCloudSnapshot.map5min_w,
      ftp: effectiveCloudSnapshot.ftp,
    });
  }, [effectiveCloudSnapshot]);

  const wprimeKjForLimiter = cpResultForLimiter?.wprimeKJ ?? null;

  // ✅ UNIFIED LIMITER - Pour Roadmap Stratégique
  const unifiedLimiterResult = useMemo<UnifiedLimiterResult | null>(() => {
    if (!currentAthlete) return null;
    return detectUnifiedLimiter({
      vo2max: effectiveCloudSnapshot?.vo2max ?? null,
      ftpKg: ftp_kg,
      vlamax: vlamaxEffectif.value,
      wprimeKj: wprimeKjForLimiter,
      cpDataQuality: cpResultForLimiter?.dataQuality ?? null,
      tte: tteEffectif.tte_min,
      fatmax: null,
      economyScore: effectiveCloudSnapshot?.run_economy_score ?? null,
      availabilityScore: null,
      hasHealthAlerts: false,
      objectif: currentAthlete.goal || "IM",
      ambition: currentAmbition,
      age: currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null,
      vma: effectiveCloudSnapshot?.vma ?? null,
      sportFocus: isRunningOnly ? "run" : "bike",
    });
  }, [currentAthlete, effectiveCloudSnapshot, ftp_kg, vlamaxEffectif, tteEffectif, currentAmbition, wprimeKjForLimiter, cpResultForLimiter, isRunningOnly]);

  // ✅ DIAGNOSTIC & PRESCRIPTION UNIFIÉS — Source unique pour TOUS les onglets
  const { dashDiagnostic, dashPrescription } = useMemo(() => {
    if (!currentAthlete || !effectiveCloudSnapshot) {
      return { dashDiagnostic: null, dashPrescription: null };
    }
    const age = currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null;
    const athleteCheckins = getCheckinsForAthlete(currentAthlete.id);
    const sortedCheckins = [...athleteCheckins].sort((a, b) =>
      new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime()
    );
    const latestCheckin = sortedCheckins[0] || null;

    const diagnosticInput: DiagnosticInput = {
      athleteId: currentAthlete.id,
      athleteName: currentAthlete.name,
      age,
      sex: (currentAthlete.sex === "M" || currentAthlete.sex === "F") ? currentAthlete.sex : null,
      weightKg: effectiveCloudSnapshot.weight_kg ?? null,
      objectif: currentAthlete.goal || "IM",
      ambition: currentAmbition,
      sportFocus: isRunningOnly ? "run" : "bike",
      vo2max: effectiveCloudSnapshot.vo2max ?? null,
      ftp: effectiveCloudSnapshot.ftp ?? null,
      ftpKg: ftp_kg,
      pmax5s: effectiveCloudSnapshot.pmax_5s ?? null,
      p30sW: effectiveCloudSnapshot.p30s_w ?? null,
      p60sW: effectiveCloudSnapshot.p60s_w ?? null,
      map5minW: effectiveCloudSnapshot.map5min_w ?? null,
      vma: effectiveCloudSnapshot.vma ?? null,
      css: effectiveCloudSnapshot.css ?? null,
      vlamax: effectiveCloudSnapshot.vlamax ?? null,
      vlamaxRun: effectiveCloudSnapshot.vlamax_run ?? null,
      vlamaxSource: effectiveCloudSnapshot.vlamax_source ?? null,
      vlamaxProtocol: effectiveCloudSnapshot.vlamax_protocol ?? null,
      vlamaxIsReference: effectiveCloudSnapshot.vlamax_is_reference ?? false,
      // ✅ Cohérence globale : on injecte le VLamax effectif déjà calculé pour
      // que dashDiagnostic.effectifs.vlamax === vlamaxEffectif partout.
      vlamaxEffectifPrecomputed: vlamaxEffectif,
      tteObservedMin: effectiveCloudSnapshot.tte_observed_min ?? null,
      tteMode: effectiveCloudSnapshot.tte_mode ?? null,
      tss7d: effectiveCloudSnapshot.tss_7d ?? null,
      fatigueState: effectiveCloudSnapshot.fatigue_state ?? null,
      runEconomyScore: effectiveCloudSnapshot.run_economy_score ?? null,
      runHrDriftPct: effectiveCloudSnapshot.run_hr_drift_pct ?? null,
      paceThresholdSecPerKm: effectiveCloudSnapshot.pace_threshold_sec_per_km ?? null,
      runningPower1s: effectiveCloudSnapshot.running_power_1s ?? null,
      runningPower5s: effectiveCloudSnapshot.running_power_5s ?? null,
      runningPower30s: effectiveCloudSnapshot.running_power_30s ?? null,
      runningPower60s: effectiveCloudSnapshot.running_power_60s ?? null,
      runningPower5min: effectiveCloudSnapshot.running_power_5min ?? null,
      runningPowerThreshold: effectiveCloudSnapshot.running_power_threshold ?? null,
      sprint15sDistance: effectiveCloudSnapshot.sprint_15s_distance ?? null,
      bikeCadenceRpm: effectiveCloudSnapshot.bike_cadence_rpm ?? null,
      bikeHrDriftFlag: effectiveCloudSnapshot.bike_hr_drift_flag ?? false,
      protocolQuality: effectiveCloudSnapshot.protocol_quality ?? null,
      wprimeKj: wprimeKjForLimiter,
      cpDataQuality: cpResultForLimiter?.dataQuality ?? null,
      // Audit 2D F29: ancre FatMax canonique unifiée (computeFatMaxAnchorPctFTP)
      // Formule: clamp(78 − 52·(VLa−0.25) + 0.15·(VO2−50), 48, 82)
      fatmax: computeFatMaxAnchorPctFTP(vlamaxEffectif.value, effectiveCloudSnapshot.vo2max ?? null),
      forceDevMode: effectiveCloudSnapshot.force_development_mode ?? false,
      giIssuesFlag: effectiveCloudSnapshot.gi_issues_flag ?? false,
      checkinData: latestCheckin ? {
        sleep: latestCheckin.sleep,
        fatigue: latestCheckin.fatigue,
        soreness: latestCheckin.soreness,
        stress: latestCheckin.stress,
        motivation: latestCheckin.motivation,
        painFlag: latestCheckin.pain_flag ?? false,
      } : undefined,
      raceChronos: {
        time_5k_sec: (effectiveCloudSnapshot as any).time_5k_sec ?? null,
        time_10k_sec: (effectiveCloudSnapshot as any).time_10k_sec ?? null,
        time_20k_sec: (effectiveCloudSnapshot as any).time_20k_sec ?? null,
        time_half_sec: (effectiveCloudSnapshot as any).time_half_sec ?? null,
        time_marathon_sec: (effectiveCloudSnapshot as any).time_marathon_sec ?? null,
        time_5k_date: (effectiveCloudSnapshot as any).time_5k_date ?? null,
        time_10k_date: (effectiveCloudSnapshot as any).time_10k_date ?? null,
        time_20k_date: (effectiveCloudSnapshot as any).time_20k_date ?? null,
        time_half_date: (effectiveCloudSnapshot as any).time_half_date ?? null,
        time_marathon_date: (effectiveCloudSnapshot as any).time_marathon_date ?? null,
      },
    };

    const diagnostic = computeDiagnostic(diagnosticInput);
    const prescription = computeDecision({
      diagnostic,
      context: { daysToRace: null, isRaceWeek: false, currentPhase: "build" },
      load: {
        tss7d: effectiveCloudSnapshot.tss_7d ?? null,
        tss28d: effectiveCloudSnapshot.tss_7d ? effectiveCloudSnapshot.tss_7d * 4 : null,
      },
    });

    return { dashDiagnostic: diagnostic, dashPrescription: prescription };
  }, [currentAthlete, effectiveCloudSnapshot, currentAmbition, isRunningOnly, ftp_kg, wprimeKjForLimiter, cpResultForLimiter, vlamaxEffectif]);

  // ✅ VLamax & TTE alignés sur le diagnostic unifié.
  // Avec vlamaxEffectifPrecomputed injecté plus haut, la valeur retournée par
  // dashDiagnostic.effectifs.vlamax est strictement IDENTIQUE à vlamaxEffectif.
  // → cohérence garantie entre Dashboard, Profil, Compass, Strategie, exports.
  const alignedVlamaxEffectif = useMemo<VLamaxEffectif>(() => {
    return (dashDiagnostic?.effectifs.vlamax as VLamaxEffectif | undefined) ?? vlamaxEffectif;
  }, [dashDiagnostic, vlamaxEffectif]);

  const alignedTteEffectif = useMemo(() => {
    if (dashDiagnostic) {
      return {
        tte_min: dashDiagnostic.effectifs.tte.tte_min,
        confidence: dashDiagnostic.effectifs.tte.confidence,
        source: dashDiagnostic.effectifs.tte.source,
        label: `TTE (${dashDiagnostic.effectifs.tte.source})`,
      } as TTEEffectif;
    }
    return tteEffectif;
  }, [dashDiagnostic, tteEffectif]);

  const alignedLimiterResult = useMemo(() => {
    return dashDiagnostic ? dashDiagnostic.limiter : unifiedLimiterResult;
  }, [dashDiagnostic, unifiedLimiterResult]);

  // ✅ FATIGUE EFFECTIF — Pour Coaching Compass
  const fatigueEffectifForCompass = useMemo<FatigueEffectif | null>(() => {
    if (!effectiveCloudSnapshot || !currentAthlete) return null;
    const fatiguePercue = fatigueStateToScoreOrDefault(effectiveCloudSnapshot.fatigue_state);
    return computeFatigueEffectif({
      tss7d: effectiveCloudSnapshot.tss_7d ?? null,
      tss7dHabituel: null,
      fatiguePercue,
      tteEffectif,
      potentielPhysiologique: potentielPhysiologiqueEffectif,
      vlamaxEffectif,
      age: currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null,
      objectif: currentAthlete.goal || "IM",
    });
  }, [effectiveCloudSnapshot, currentAthlete, tteEffectif, potentielPhysiologiqueEffectif, vlamaxEffectif]);

  // ✅ LORANG STRATEGY — Pour Coaching Compass
  const lorangStrategyForCompass = useMemo<LorangStrategyResult | null>(() => {
    if (!currentAthlete || !effectiveCloudSnapshot) return null;
    // ✅ AUDIT FIX : cibles VLamax/TTE/VO2max issues de la source unique (objectif × ambition × sport)
    const sportForTargets = isRunningOnly ? "run" : "bike";
    const goalForTargets = currentAthlete.goal || "IM";
    const vlamaxTarget = getVLamaxOptimal(goalForTargets, currentAmbition, sportForTargets);
    const tteTarget = getTTETargetByAmbition(goalForTargets, currentAmbition);
    // VO2max target reste indicatif (pas géré par physiologicalTargets) — barème ambition uniquement
    const vo2maxTarget = currentAmbition === "elite" ? 70 : currentAmbition === "competitor" ? 62 : currentAmbition === "age_group" ? 58 : 52;
    const disciplineMap: Record<string, 'IM' | '703' | 'marathon' | 'semi' | '10k' | 'cycling' | 'trail'> = {
      'IM': 'IM', 'Ironman': 'IM', '70.3': '703', 'Ironman70.3': '703',
      'Marathon': 'marathon', 'Semi': 'semi', '10K': '10k', '5K': '10k',
      'Trail': 'trail', 'TrailLong': 'trail',
    };
    const discipline = disciplineMap[currentAthlete.goal || 'IM'] || 'IM';
    const ambitionMap: Record<string, 'finisher' | 'age_group' | 'competitor' | 'elite'> = {
      finisher: 'finisher', age_group: 'age_group', competitor: 'competitor', elite: 'elite',
    };
    const ambition = ambitionMap[currentAmbition] || 'age_group';
    const availabilityScore = fatigueEffectifForCompass ? Math.max(0, 100 - fatigueEffectifForCompass.score) : 80;
    try {
      return computeLorangStrategy({
        physiology: {
          vo2max: effectiveCloudSnapshot.vo2max ?? null,
          vo2maxTarget,
          ftpKg: ftp_kg,
          ftpKgTarget: null,
          vlamax: vlamaxEffectif.value,
          vlamaxTarget,
          tte: tteEffectif.tte_min,
          tteTarget,
          fatmax: null,
          fatmaxTarget: 0,
          economy: effectiveCloudSnapshot.run_economy_score ?? null,
        },
        athlete: {
          age: currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null,
          discipline,
          ambition,
          hasGIIssues: effectiveCloudSnapshot.gi_issues_flag ?? false,
        },
        availability: {
          score: availabilityScore,
          level: availabilityScore >= 80 ? 'high' : availabilityScore >= 60 ? 'moderate' : availabilityScore >= 40 ? 'low' : 'critical',
          hasAlerts: false,
          hrvOutOfRange2Days: false,
        },
        context: {
          daysToRace: null,
          isRaceWeek: false,
          currentPhase: 'build',
        },
        load: {
          tss7d: effectiveCloudSnapshot.tss_7d ?? null,
          tss28d: effectiveCloudSnapshot.tss_7d ? effectiveCloudSnapshot.tss_7d * 4 : null,
        },
        // ✅ Passer le résultat du moteur unifié pour cohérence maximale
        unifiedLimiterResult: unifiedLimiterResult ? {
          primaryLimiter: unifiedLimiterResult.primaryLimiter,
          gapAnalysis: unifiedLimiterResult.gapAnalysis,
          aerobicWeaknessDetail: unifiedLimiterResult.aerobicWeaknessDetail,
        } : undefined,
      });
    } catch { return null; }
  }, [currentAthlete, effectiveCloudSnapshot, currentAmbition, ftp_kg, vlamaxEffectif, tteEffectif, fatigueEffectifForCompass, unifiedLimiterResult]);

  // ✅ LACTATE THRESHOLDS — Pour Coaching Compass
  const lactateThresholdsForCompass = useMemo(() => {
    if (!effectiveCloudSnapshot) return null;
    const thresholds = computeLactateThresholdsTFCL({
      ftp: effectiveCloudSnapshot.ftp,
      sport: effectiveCloudSnapshot.sport_main,
      tteValue: tteEffectif.tte_min,
      tteSource: tteEffectif.source === 'observed' ? 'observed' : 'estimated',
      vlamaxValue: vlamaxEffectif.value,
      vlamaxSource: vlamaxEffectif.source === 'test' ? 'test' : vlamaxEffectif.source === 'snapshot' ? 'snapshot' : 'estimated',
    });
    return {
      lt1: thresholds.lt1.watts != null ? { watts: thresholds.lt1.watts, pct_of_ftp: thresholds.lt1.pct_of_ftp, confidence: thresholds.lt1.confidence } : null,
      lt2: thresholds.lt2.watts != null ? { watts: thresholds.lt2.watts, pct_of_ftp: thresholds.lt2.pct_of_ftp, confidence: thresholds.lt2.confidence } : null,
    };
  }, [effectiveCloudSnapshot, tteEffectif, vlamaxEffectif]);

  // ✅ COMPASS INPUT mémorisé — réutilisé par CoachingCompassCard + AthleteProfile
  const compassInputMemo = useMemo(() => {
    if (!currentAthlete || !effectiveCloudSnapshot) return null;
    return {
      ftp: effectiveRefs.ftp,
      poids: effectiveRefs.weightKg,
      vo2max: effectiveCloudSnapshot.vo2max ?? currentAthlete.vo2max ?? null,
      tss7d: effectiveCloudSnapshot.tss_7d ?? null,
      snapshotDate: effectiveCloudSnapshot.date ?? null,
      snapshotUpdatedAt: effectiveCloudSnapshot.updated_at ?? null,
      pmax5s: effectiveCloudSnapshot.pmax_5s ?? null,
      p30sW: effectiveCloudSnapshot.p30s_w ?? null,
      p60sW: effectiveCloudSnapshot.p60s_w ?? null,
      map5minW: effectiveCloudSnapshot.map5min_w ?? null,
      runEconomyScore: effectiveCloudSnapshot.run_economy_score ?? null,
      hrDriftPct: effectiveCloudSnapshot.run_hr_drift_pct ?? null,
      vma: effectiveCloudSnapshot.vma ?? null,
      paceThresholdSecPerKm: effectiveCloudSnapshot.pace_threshold_sec_per_km ?? null,
      fatmax: null as number | null,
      vlamaxEffectif: { value: vlamaxEffectif.value, confidence: vlamaxEffectif.confidence, source: vlamaxEffectif.source },
      tteEffectif: { tte_min: tteEffectif.tte_min, confidence: tteEffectif.confidence, source: tteEffectif.source },
      tteEffectifRun: tteEffectifRun ? { tte_min: tteEffectifRun.tte_min, confidence: tteEffectifRun.confidence, source: tteEffectifRun.source } : null,
      fatigueEffectif: fatigueEffectifForCompass ? {
        score: fatigueEffectifForCompass.score,
        level: String(fatigueEffectifForCompass.level),
        confidence: fatigueEffectifForCompass.confidence,
      } : null,
      limiterResult: unifiedLimiterResult ? {
        primaryLimiter: unifiedLimiterResult.primaryLimiter,
        gapAnalysis: unifiedLimiterResult.gapAnalysis,
        confidence: unifiedLimiterResult.confidence,
        fatigueWarning: (unifiedLimiterResult as any).fatigueWarning ?? null,
      } : null,
      potentielPhysiologique: potentielPhysiologiqueEffectif ? {
        score: potentielPhysiologiqueEffectif.score,
        potential: (potentielPhysiologiqueEffectif as any).potential ?? potentielPhysiologiqueEffectif.score,
        availability: (potentielPhysiologiqueEffectif as any).availability ?? 80,
        governingFactor: (potentielPhysiologiqueEffectif as any).governingFactor ?? "potential",
        label: potentielPhysiologiqueEffectif.label || "",
        color: potentielPhysiologiqueEffectif.color || "warning",
      } : null,
      strategyResult: lorangStrategyForCompass ? {
        primaryLimiter: lorangStrategyForCompass.primaryLimiter,
        limiterLabel: lorangStrategyForCompass.limiterLabel,
        limiterExplanation: lorangStrategyForCompass.limiterExplanation,
        activatedLevers: lorangStrategyForCompass.activatedLevers.map(l => ({
          lever: l.lever, label: l.label, priority: l.priority, reason: l.reason, prescription: l.prescription,
        })),
        prohibitions: lorangStrategyForCompass.prohibitions.map(p => ({ label: p.label, reason: p.reason })),
        hasSprintBan: lorangStrategyForCompass.hasSprintBan,
        summary: lorangStrategyForCompass.summary,
        templateSuggestion: lorangStrategyForCompass.templateSuggestion,
        athleteMessage: lorangStrategyForCompass.athleteMessage,
        confidence: lorangStrategyForCompass.confidence,
      } : null,
      lactateThresholds: lactateThresholdsForCompass,
      wprimeKj: wprimeKjForLimiter ?? null,
      objectif: currentAthlete.goal || "IM",
      ambition: currentAmbition,
      sportFocus: isRunningOnly
        ? "run"
        : resolveCompassSportFocus(effectiveCloudSnapshot, { goal: currentAthlete.goal }, "triathlon"),
      athleteAge: currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null,
    };
  }, [currentAthlete, effectiveCloudSnapshot, effectiveRefs, vlamaxEffectif, tteEffectif, fatigueEffectifForCompass, unifiedLimiterResult, potentielPhysiologiqueEffectif, lorangStrategyForCompass, lactateThresholdsForCompass, wprimeKjForLimiter, currentAmbition, isRunningOnly]);

  const { 
    calculateAndPersist: persistDRE, 
    markAsReferenceWeek 
  } = useDecisionReliability(
    currentAthlete?.id ?? null, 
    effectiveCloudSnapshot?.id ?? null
  );

  // ✅ Persistance automatique quand le snapshot change
  useEffect(() => {
    if (!effectiveCloudSnapshot || !currentAthlete || !user) return;
    
    // Persister le DRE en base de données
    const persistAsync = async () => {
      try {
        await persistDRE(effectiveCloudSnapshot);
        console.log("[DRE] Score de fiabilité persisté pour snapshot:", effectiveCloudSnapshot.id);
      } catch (err) {
        console.error("[DRE] Erreur persistance:", err);
      }
    };
    
    // Debounce pour éviter trop d'appels
    const timeoutId = setTimeout(persistAsync, 1000);
    return () => clearTimeout(timeoutId);
  }, [effectiveCloudSnapshot?.id, currentAthlete?.id, user?.id, persistDRE]);

  // Handlers
  const handleAddAthlete = async () => {
    if (!newAthleteName.trim()) {
      toast.error("Nom requis");
      return;
    }
    const athlete = await addAthlete(newAthleteName.trim(), newAthleteGoal, { ambition: DEFAULT_AMBITION } as any);
    if (athlete) {
      // Si date de naissance fournie, mettre à jour l'athlète
      if (newAthleteBirthDate) {
        await updateAthlete(athlete.id, { birth_date: newAthleteBirthDate });
      }
      setSelectedAthleteId(athlete.id);
      setNewAthleteName("");
      setNewAthleteGoal("IM");
      setNewAthleteBirthDate("");
      setIsAddDialogOpen(false);
    }
  };

  const handleDeleteAthlete = async () => {
    if (!currentAthlete) return;
    const confirmed = confirm(`Supprimer ${currentAthlete.name} ?`);
    if (!confirmed) return;

    await deleteAthlete(currentAthlete.id);

    // reselect proprement
    const remaining = athletes.filter((a) => a.id !== currentAthlete.id);
    setSelectedAthleteId(remaining[0]?.id || null);
  };

  const handleFeedbacksChange = (feedbacks: FeedbackNolio[]) => {
    setFeedbacksNolio(feedbacks);
    localStorage.setItem("loranglab-feedbacks", JSON.stringify(feedbacks));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement des données...</p>
        </div>
      </div>
    );
  }

  const renderAthleteSelector = () => (
    <Card className="border-border/50">
      <CardContent className="py-3 px-3 sm:px-4">
        {athletes.length === 0 ? (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground text-sm">Aucun athlète</span>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8">
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[90vw] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Nouvel athlète</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <label className="text-sm font-medium">Nom</label>
                    <Input
                      value={newAthleteName}
                      onChange={(e) => setNewAthleteName(e.target.value)}
                      placeholder="Nom de l'athlète"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Date de naissance</label>
                    <Input
                      type="date"
                      value={newAthleteBirthDate}
                      onChange={(e) => setNewAthleteBirthDate(e.target.value)}
                      max={new Date().toISOString().split("T")[0]}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Objectif</label>
                    <Select value={newAthleteGoal} onValueChange={setNewAthleteGoal}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IM">Ironman</SelectItem>
                        <SelectItem value="703">70.3 / Half</SelectItem>
                        <SelectItem value="Marathon">Marathon</SelectItem>
                        <SelectItem value="Semi">Semi-Marathon</SelectItem>
                        <SelectItem value="10K">10K</SelectItem>
                        <SelectItem value="5K">5K</SelectItem>
                        <SelectItem value="TrailShort">Trail court</SelectItem>
                        <SelectItem value="TrailMountain">Trail montagne</SelectItem>
                        <SelectItem value="TrailUltra">Ultra trail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddAthlete} className="w-full">Créer</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Ligne 1: Sélecteur athlète + Badge âge + Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Sélecteur athlète */}
              <Select value={selectedAthleteId || ""} onValueChange={setSelectedAthleteId}>
                <SelectTrigger className="h-9 w-auto min-w-[120px] max-w-[180px] text-sm shrink-0">
                  <User className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                  <SelectValue placeholder="Athlète" />
                </SelectTrigger>
                <SelectContent>
                  {athletes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nom} ({a.objectif || "IM"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Badge âge compact */}
              {currentAthlete && (
                <div className="shrink-0">
                  <AgeAdjustmentBadge birthDate={currentAthlete.birth_date} variant="inline" />
                </div>
              )}

              {/* Spacer pour pousser les actions à droite sur desktop */}
              <div className="hidden sm:flex flex-1 min-w-[8px]" />

              {/* Sélecteur objectif rapide - visible sur desktop */}
              {currentAthlete && (
                <div className="hidden md:block shrink-0">
                  <QuickObjectiveSelector
                    currentGoal={currentAthlete.goal}
                    onGoalChange={async (goal) => {
                      await updateAthleteGoal(goal);
                      await loadData();
                    }}
                  />
                </div>
              )}

              {/* Sélecteur ambition compact - visible sur desktop uniquement dans cette ligne */}
              {currentAthlete && (
                <div className="hidden md:block shrink-0">
                  <Select
                    value={currentAmbition}
                    onValueChange={(v) => updateCurrentAthleteAmbition(v as AmbitionLevel)}
                  >
                    <SelectTrigger className="h-9 w-auto min-w-[120px] max-w-[160px] text-sm">
                      <SelectValue placeholder="Ambition">
                        {(() => {
                          const def = getAmbitionDefinition(currentAmbition);
                          return (
                            <span className="flex items-center gap-1.5 truncate">
                              <span>{def.icon}</span>
                              <span className="truncate">{def.label}</span>
                            </span>
                          );
                        })()}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {AMBITION_LEVELS_ORDERED.map((level) => {
                        const def = getAmbitionDefinition(level);
                        const timeHint = currentAthlete ? getRunningTimeHint(currentAthlete.goal || "IM", level, currentAthlete.sex === "F" ? "F" : "M") : null;
                        return (
                          <SelectItem key={level} value={level}>
                            {def.icon} {def.label}{timeHint ? ` — ${timeHint}` : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Prochaine course - visible sur desktop, cliquable */}
              {currentAthlete && raceGoals.length > 0 && (
                <div className="hidden lg:block shrink-0">
                  <NextRaceIndicator
                    raceGoals={raceGoals}
                    currentGoal={currentAthlete.goal}
                    compact
                    onClick={() => {
                      const el = document.getElementById("section-objective-manager");
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  />
                </div>
              )}

              {/* Bilan pré-objectif TFCL — toujours visible, accentué en race week */}
              {currentAthlete && (() => {
                const future = (raceGoals || [])
                  .filter(g => new Date(g.race_date) >= new Date())
                  .sort((a, b) => new Date(a.race_date).getTime() - new Date(b.race_date).getTime());
                const next = future[0];
                const days = next ? Math.ceil((new Date(next.race_date).getTime() - Date.now()) / 86400000) : null;
                const isRaceWeek = days !== null && days <= 7;
                return (
                  <Button
                    size="sm"
                    variant={isRaceWeek ? "default" : "outline"}
                    className={cn("shrink-0 gap-1.5", isRaceWeek && "animate-pulse")}
                    onClick={() => setReadinessOpen(true)}
                    title={isRaceWeek ? "Race week — bilan disponible" : days !== null ? `J-${days} avant la course` : "Bilan pré-objectif TFCL"}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span className="hidden sm:inline">Bilan pré-objectif</span>
                    <span className="sm:hidden">Bilan</span>
                    {days !== null && (
                      <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">J-{days}</Badge>
                    )}
                  </Button>
                );
              })()}

              {/* CTA — Voir ma stratégie : ouvre directement l'étape 3 de la simulation */}
              {currentAthlete && (
                <Button asChild size="sm" className="shrink-0 gap-1.5">
                  <Link to="/race?step=3">
                    <Target className="h-4 w-4" />
                    <span>Voir ma stratégie</span>
                  </Link>
                </Button>
              )}

              {/* Running Focus Mode Badge - visible quand actif */}
              {isRunningOnly && (
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">
                  <span>🏃</span>
                  <span>Running Only</span>
                </div>
              )}

              {/* Mini aperçu progression - visible sur desktop */}
              {currentAthlete && (
                <div className="hidden md:block shrink-0">
                  <AmbitionProgressMini
                    snapshots={snapshots.filter(s => s.athlete_id === currentAthlete.id)}
                    objectif={currentAthlete.goal || "IM"}
                    ambition={currentAmbition}
                    weightKg={effectiveRefs.weightKg}
                    onClick={() => {
                      const el = document.getElementById("section-ambition-progress");
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    onMetricClick={(sectionId) => {
                      const el = document.getElementById(`section-${sectionId}`);
                      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                  />
                </div>
              )}

              {/* Actions compactes */}
              <div className="flex items-center gap-1">
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[90vw] sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Nouvel athlète</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                      <div>
                        <label className="text-sm font-medium">Nom</label>
                        <Input
                          value={newAthleteName}
                          onChange={(e) => setNewAthleteName(e.target.value)}
                          placeholder="Nom de l'athlète"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Date de naissance</label>
                        <Input
                          type="date"
                          value={newAthleteBirthDate}
                          onChange={(e) => setNewAthleteBirthDate(e.target.value)}
                          max={new Date().toISOString().split("T")[0]}
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Pour ajuster les cibles physiologiques
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Objectif</label>
                        <Select value={newAthleteGoal} onValueChange={setNewAthleteGoal}>
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="IM">Ironman</SelectItem>
                            <SelectItem value="703">70.3 / Half</SelectItem>
                            <SelectItem value="Marathon">Marathon</SelectItem>
                            <SelectItem value="Semi">Semi-Marathon</SelectItem>
                            <SelectItem value="10K">10K</SelectItem>
                            <SelectItem value="5K">5K</SelectItem>
                            <SelectItem value="TrailShort">Trail court</SelectItem>
                            <SelectItem value="TrailMountain">Trail montagne</SelectItem>
                            <SelectItem value="TrailUltra">Ultra trail</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAddAthlete} className="w-full">Créer</Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button size="sm" variant="ghost" onClick={handleDeleteAthlete} className="h-8 w-8 p-0">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>

            {/* Ligne 2 (mobile only): Ambition + Progress */}
            {currentAthlete && (
              <div className="flex items-center gap-2 md:hidden flex-wrap">
                <Select
                  value={currentAmbition}
                  onValueChange={(v) => updateCurrentAthleteAmbition(v as AmbitionLevel)}
                >
                  <SelectTrigger className="h-9 flex-1 min-w-[120px] text-sm">
                    <Star className="h-3.5 w-3.5 mr-1.5 text-primary shrink-0" />
                    <SelectValue placeholder="Ambition" />
                  </SelectTrigger>
                  <SelectContent>
                    {AMBITION_LEVELS_ORDERED.map((level) => {
                      const def = getAmbitionDefinition(level);
                      const timeHint = currentAthlete ? getRunningTimeHint(currentAthlete.goal || "IM", level, currentAthlete.sex === "F" ? "F" : "M") : null;
                      return (
                        <SelectItem key={level} value={level}>
                          {def.icon} {def.label}{timeHint ? ` — ${timeHint}` : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                <AmbitionProgressMini
                  snapshots={snapshots.filter(s => s.athlete_id === currentAthlete.id)}
                  objectif={currentAthlete.goal || "IM"}
                  ambition={currentAmbition}
                  weightKg={effectiveRefs.weightKg}
                  onClick={() => {
                    const el = document.getElementById("section-ambition-progress");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  onMetricClick={(sectionId) => {
                    const el = document.getElementById(`section-${sectionId}`);
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderContent = () => {
    if (!legacyAthlete || athletes.length === 0) {
      return (
        <div className="space-y-8 animate-fade-in">
          <Card className="border-dashed border-2 border-primary/20">
            <CardContent className="py-16 text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">Aucun athlète</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Crée un athlète pour commencer à utiliser Vince’s Lab.
                </p>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="lg" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Créer mon premier athlète
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Nouvel athlète</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="text-sm font-medium">Nom</label>
                      <Input
                        value={newAthleteName}
                        onChange={(e) => setNewAthleteName(e.target.value)}
                        placeholder="Nom de l'athlète"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Date de naissance</label>
                      <Input
                        type="date"
                        value={newAthleteBirthDate}
                        onChange={(e) => setNewAthleteBirthDate(e.target.value)}
                        max={new Date().toISOString().split("T")[0]}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Utilisée pour ajuster les cibles physiologiques
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Objectif</label>
                      <Select value={newAthleteGoal} onValueChange={setNewAthleteGoal}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IM">Ironman</SelectItem>
                          <SelectItem value="703">70.3 / Half</SelectItem>
                          <SelectItem value="Marathon">Marathon</SelectItem>
                          <SelectItem value="Semi">Semi-Marathon</SelectItem>
                          <SelectItem value="10K">10K</SelectItem>
                          <SelectItem value="5K">5K</SelectItem>
                          <SelectItem value="TrailShort">Trail court</SelectItem>
                          <SelectItem value="TrailMountain">Trail montagne</SelectItem>
                          <SelectItem value="TrailUltra">Ultra trail</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddAthlete} className="w-full">
                      Créer l'athlète
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      );
    }

    switch (activeTab) {
      case "dashboard": {
        // ═══════════════════════════════════════════════════════════
        // DASHBOARD SIMPLIFIÉ — 4 sections linéaires
        // Flux: Snapshot → Analyse → Limiteurs → Leviers
        // dashDiagnostic & dashPrescription sont calculés en useMemo au niveau composant
        // ═══════════════════════════════════════════════════════════

        const dashboardSections = [
          // ✅ 1. SNAPSHOT — Quick Actions + Données actuelles
          {
            id: "quick-actions",
            render: () => (
              <QuickActionsPanel
              onCreateSnapshot={() => {
                  setShowSnapshots(true);
                  setTimeout(() => {
                    const el = document.getElementById("snapshot-manager-section");
                    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 100);
                }}
              />
            ),
          },
          // ✅ Getting Started (conditionally shown)
          {
            id: "getting-started",
            render: () => currentAthlete && !gettingStartedVisibility.isHidden && (
              <GettingStartedChecklist
                athlete={{
                  id: currentAthlete.id,
                  name: currentAthlete.name,
                  goal: currentAthlete.goal,
                }}
                snapshot={effectiveCloudSnapshot}
                extraSignals={{ vlamaxEffective: vlamaxEffectif?.value ?? null }}
                onNavigateToProfile={() => navigate(`/athlete/${currentAthlete.id}`)}
                onNavigateToTests={() => navigate("/diagnostic/tests")}
                onNavigateToAcademy={() => navigate("/academy")}
                onDismiss={gettingStartedVisibility.hide}
              />
            ),
          },
          // ✅ 2. ANALYSE — Radar Compass + Métriques avec explications
          {
            id: "coaching-compass",
            render: () => {
              // Construit l'input Compass depuis le Diagnostic Engine pour garantir la cohérence
              if (!dashDiagnostic || !compassInputMemo) return null;
              // Override les données clés depuis le diagnostic unifié
              const alignedInput = {
                ...compassInputMemo,
                vlamaxEffectif: { 
                  value: dashDiagnostic.effectifs.vlamax.value, 
                  confidence: dashDiagnostic.effectifs.vlamax.confidence, 
                  source: dashDiagnostic.effectifs.vlamax.source 
                },
                tteEffectif: { 
                  tte_min: dashDiagnostic.effectifs.tte.tte_min, 
                  confidence: dashDiagnostic.effectifs.tte.confidence, 
                  source: dashDiagnostic.effectifs.tte.source 
                },
                fatigueEffectif: dashDiagnostic.effectifs.fatigue ? {
                  score: dashDiagnostic.effectifs.fatigue.score,
                  level: String(dashDiagnostic.effectifs.fatigue.level),
                  confidence: dashDiagnostic.effectifs.fatigue.confidence,
                } : null,
                limiterResult: {
                  primaryLimiter: dashDiagnostic.limiter.primaryLimiter,
                  limiterLabel: dashDiagnostic.limiter.limiterLabel,
                  limiterEmoji: dashDiagnostic.limiter.limiterEmoji,
                  limiterExplanation: dashDiagnostic.limiter.limiterExplanation,
                  gapAnalysis: dashDiagnostic.limiter.gapAnalysis,
                  confidence: dashDiagnostic.limiter.confidence,
                  fatigueWarning: (dashDiagnostic.limiter as any).fatigueWarning ?? null,
                },
                // Supprimer le potentiel physiologique (Disponibilité supprimée)
                potentielPhysiologique: null,
              };
              return (
                <CoachingCompassCard
                  input={alignedInput}
                  staffMode={staffMode}
                />
              );
            },
          },
          {
            id: "analyse-section",
            render: () => dashDiagnostic ? (
              <AnalyseSection diagnostic={dashDiagnostic} />
            ) : null,
          },
          // ✅ 3. LIMITEURS — Facteurs limitants avec explications pédagogiques
          {
            id: "limiteurs-section",
            render: () => dashDiagnostic ? (
              <LimiteursSection diagnostic={dashDiagnostic} />
            ) : null,
          },
          // ✅ 4. LEVIERS — Actions concrètes avec explications + CTA Plan IA
          {
            id: "leviers-section",
            render: () => dashDiagnostic && dashPrescription ? (
              <LeviersSection
                diagnostic={dashDiagnostic}
                prescription={dashPrescription}
              />
            ) : null,
          },
          // ✅ 5. SYNTHÈSE EXECUTIVE — Alignée sur le diagnostic unifié
          {
            id: "synthese-executive-dashboard",
            render: () => currentAthlete ? (
              <SyntheseExecutiveCard
                athleteName={currentAthlete.name}
                objectif={currentAthlete.goal || "IM"}
                vlamaxEffectif={alignedVlamaxEffectif}
                tteEffectif={alignedTteEffectif}
                limiterResult={alignedLimiterResult}
                ftp={ftp}
                poids={poids ?? null}
                vo2max={effectiveCloudSnapshot?.vo2max ?? null}
                completude={(() => {
                  const missing = getMissingFields(effectiveRefs, ["weightKg", "ftp", "vo2max", "vma", "fcMax"]);
                  return { score: Math.max(0, 100 - missing.length * 10), manquants: missing };
                })()}
                ambition={currentAmbition}
                athleteAge={currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null}
                sportFocus={dashDiagnostic?.sportFocus ?? (isRunningOnly ? "run" : "bike")}
              />
            ) : null,
          },
          {
            id: "vlamax-profile-scale",
            render: () => currentAthlete ? (
              <VLamaxProfileScale
                vlamax={alignedVlamaxEffectif.value}
                objectif={currentAthlete.goal || null}
                sportMain={(effectiveCloudSnapshot as any)?.sport_main ?? null}
                age={currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null}
              />
            ) : null,
          },
        ];

        return (
          <div className="space-y-3 sm:space-y-4 md:space-y-6 animate-fade-in">
            {renderAthleteSelector()}
            
            {isAlertVisible && pendingSync && (
              <PlanSyncAlert
                athleteName={pendingSync.athleteName}
                athleteId={pendingSync.athleteId}
                changes={pendingSync.changes}
                onDismiss={() => dismissSync(pendingSync.athleteId)}
              />
            )}
            
            <SortableSectionsContainer
              tabId="dashboard"
              tabLabel="Dashboard"
              sections={dashboardSections}
            />
          </div>
        );
      }

      case "profil": {
        const profilSections = [
          // Références Athlète (édition rapide)
          {
            id: "athlete-refs",
            render: () => currentAthlete && (
              <AthleteRefsPanel
                athlete={currentAthlete}
                snapshots={snapshots}
                snapshot={effectiveCloudSnapshot}
                athleteGoal={currentAthlete.goal || "IM"}
                onUpdate={() => loadData()}
                onNavigateToProfile={() => navigate(`/athlete/${currentAthlete.id}`)}
                onNavigateToCAPTest={() => navigate("/diagnostic/testing-week-cap")}
                onNavigateToTFCLTest={() => navigate("/diagnostic/testing-week-tfcl")}
              />
            ),
          },
          // Profil Athlète (legacy analysis card)
          {
            id: "athlete-profile",
            render: () => legacyAthlete && (
              <AthleteProfile
                athlete={legacyAthlete}
                onUpdate={() => {}}
                vlamaxEffectif={alignedVlamaxEffectif}
                tteEffectif={alignedTteEffectif}
                onOpenSnapshots={() => setShowSnapshots(true)}
              />
            ),
          },
          // Two For Coaching Analysis
          {
            id: "two-for-coaching",
            render: () => legacyAthlete && (
              <TwoForCoachingAnalysis
                athlete={legacyAthlete}
                vlamaxEffectif={alignedVlamaxEffectif}
                tteEffectif={alignedTteEffectif}
                readiness={potentielPhysiologiqueEffectif}
                onGoToSnapshots={() => setShowSnapshots(true)}
                unifiedLimiterResult={alignedLimiterResult}
              />
            ),
          },
          // ✅ Analyse Nolio persistante (édition + recalcul V2 live)
          {
            id: "nolio-analysis",
            render: () => currentAthlete && effectiveCloudSnapshot && (
              <NolioAnalysisCard
                snapshot={effectiveCloudSnapshot}
                staffMode={staffMode}
                objectif={currentAthlete.goal || "IM"}
                onSnapshotUpdated={() => loadData()}
              />
            ),
          },
          // Évolution des snapshots
          {
            id: "evolution-chart",
            render: () => currentAthlete && (
              <SnapshotEvolutionChart
                snapshots={snapshots.filter(s => s.athlete_id === currentAthlete.id)}
                athleteName={currentAthlete.name}
              />
            ),
          },
          // Zones d'entraînement
          {
            id: "training-zones",
            render: () => (
              <TrainingZonesCard staffMode={staffMode} />
            ),
          },
          // Seuils Lactiques TFCL
          {
            id: "lactate-thresholds-profil",
            render: () => currentAthlete && (
              <LactateCorrespondenceCard
                vlamaxEffectif={alignedVlamaxEffectif}
                tteEffectif={alignedTteEffectif}
                ftp={ftp}
                sport={effectiveCloudSnapshot?.sport_main || "velo"}
                staffMode={staffMode}
              />
            ),
          },
          // VLamax V2 Calibration (profil)
          {
            id: "vlamax-v2-calibration-profil",
            render: () => {
              if (!currentAthlete) return null;
              const goal = currentAthlete.goal || "IM";
              const isTriGoal = ["IM", "Ironman", "70.3", "703", "TriathlonLD"].includes(goal);
              const sportMain = (effectiveCloudSnapshot as any)?.sport_main ?? undefined;
              return (
                <VLamaxUnifiedCard
                  vlamaxEffectif={alignedVlamaxEffectif}
                  objectif={goal}
                  staffMode={staffMode}
                  ambition={currentAmbition}
                  sport={sportMain ?? (isRunningOnly ? "cap" : isTriGoal ? "tri" : "bike")}
                  sex={currentAthlete.sex === "F" ? "F" : "H"}
                  ftp={ftp}
                  athleteId={currentAthlete.id}
                  vo2max={effectiveCloudSnapshot?.vo2max ?? null}
                  age={currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null}
                  vlamaxRun={(effectiveCloudSnapshot as any)?.vlamax_run ?? null}
                  economyScore={effectiveCloudSnapshot?.run_economy_score ?? null}
                  isRunningOnly={isRunningOnly}
                  isTriathlon={isTriGoal && !isRunningOnly}
                  runMLSS={dashDiagnostic?.runMLSS ?? null}
                />
              );
            },
          },
          // Profil VLamax — Échelle par sport (profil)
          {
            id: "vlamax-profile-scale-profil",
            render: () => currentAthlete && (
              <VLamaxProfileScale
                vlamax={alignedVlamaxEffectif.value}
                objectif={currentAthlete.goal || null}
                sportMain={(effectiveCloudSnapshot as any)?.sport_main ?? null}
                age={currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null}
              />
            ),
          },
          // FTP/kg or VMA Targets (profil)
          {
            id: "ftp-targets-profil",
            render: () => currentAthlete && (
              isRunningOnly ? (
                <VmaTargetsCard
                  objectif={currentAthlete.goal || "Marathon"}
                  currentVma={effectiveCloudSnapshot?.vma ?? null}
                  age={currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null}
                  vo2max={effectiveCloudSnapshot?.vo2max ?? null}
                  vlamax={alignedVlamaxEffectif.value}
                />
              ) : (
                <FtpKgTargetsCard
                  objectif={currentAthlete.goal || "IM"}
                  currentFtpKg={ftp_kg}
                  age={currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null}
                />
              )
            ),
          },
          // FatMax TFCL (profil) — runner sans FTP : affichage en allure (min/km) via VMA
          {
            id: "fatmax-tfcl-profil",
            render: () => currentAthlete && !(isRunningOnly && (!ftp || ftp <= 0) && !(effectiveCloudSnapshot?.vma)) && (
              <MetabolicZonesUnifiedCard
                vlamaxEffectif={alignedVlamaxEffectif}
                tteEffectif={alignedTteEffectif}
                objectif={currentAthlete.goal || "IM"}
                ftp={ftp}
                vma={effectiveCloudSnapshot?.vma ?? null}
                staffMode={staffMode}
              />
            ),
          },
          // Combustion Lipides / Glucides — runner sans FTP : affichage en allure
          {
            id: "fat-carb-combustion-profil",
            render: () => currentAthlete && effectiveCloudSnapshot && !(isRunningOnly && (!ftp || ftp <= 0) && !effectiveCloudSnapshot.vma) && (
              <FatCarbOxidationChart
                vo2max={effectiveCloudSnapshot.vo2max ?? null}
                vlamax={alignedVlamaxEffectif.value}
                ftp={ftp}
                vma={effectiveCloudSnapshot.vma ?? null}
                paceMode={isRunningOnly && (!ftp || ftp <= 0)}
                weight={poids ?? 70}
                staffMode={staffMode}
              />
            ),
          },
          // VO2max Age Comparison (profil)
          {
            id: "vo2max-age-profil",
            render: () => currentAthlete && (
              <VO2maxAgeComparisonCard
                age={currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null}
                currentVo2max={effectiveCloudSnapshot?.vo2max ?? currentAthlete.vo2max ?? null}
                objectif={currentAthlete.goal || "IM"}
                ambition={currentAmbition}
              />
            ),
          },
          // Scientific Charts (profil, staff)
          {
            id: "scientific-charts-profil",
            render: () => currentAthlete && effectiveCloudSnapshot && staffMode && (
              <ScientificChartsDashboard
                vlamaxValue={alignedVlamaxEffectif.value}
                vlamaxSource={alignedVlamaxEffectif.source}
                vlamaxConfidence={alignedVlamaxEffectif.confidence}
                tteValue={alignedTteEffectif.tte_min}
                tteSource={alignedTteEffectif.source}
                tteConfidence={alignedTteEffectif.confidence}
                potentielScore={potentielPhysiologiqueEffectif.score}
                objectif={currentAthlete.goal || "IM"}
                vo2max={effectiveCloudSnapshot.vo2max ?? null}
                ftp={ftp}
                weight={poids ?? undefined}
                initialStaffMode={staffMode}
              />
            ),
          },
          // Decision Reliability (profil, staff)
          {
            id: "decision-reliability-profil",
            render: () => currentAthlete && staffMode && (
              <DecisionReliabilityCard
                result={decisionReliability}
                onMarkAsReference={async () => {
                  if (effectiveCloudSnapshot?.id) {
                    await markAsReferenceWeek(effectiveCloudSnapshot.id);
                    toast.success("Semaine marquée comme référence");
                  }
                }}
                onOpenTests={() => navigate("/diagnostic/tests")}
              />
            ),
          },
          // Calibration Evidence Summary (profil, staff)
          {
            id: "calibration-evidence-profil",
            render: () => currentAthlete && staffMode && (
              <CalibrationEvidenceSummaryCard
                athleteId={currentAthlete.id}
              />
            ),
          },
          // ✅ Cycle Intelligence Engine™ (profil)
          {
            id: "cycle-intelligence-profil",
            render: () => currentAthlete && (
              <CycleIntelligenceCard
                snapshots={snapshots.filter(s => s.athlete_id === currentAthlete.id) as unknown as Array<Record<string, unknown>>}
                currentSnapshotId={effectiveCloudSnapshot?.id}
                previousLimiterId={alignedLimiterResult?.primaryLimiter ?? null}
                previousLimiterLabel={alignedLimiterResult?.limiterLabel ?? null}
                objectif={currentAthlete.goal || "IM"}
                staffMode={staffMode}
              />
            ),
          },
          // 🔮 Adaptation Predictor™ (profil)
          {
            id: "adaptation-predictor-profil",
            render: () => currentAthlete && effectiveCloudSnapshot && (
              <AdaptationPredictorCard
                snapshot={effectiveCloudSnapshot as unknown as Record<string, unknown>}
                limiterId={alignedLimiterResult?.primaryLimiter ?? null}
                limiterLabel={alignedLimiterResult?.limiterLabel ?? null}
                objectif={currentAthlete.goal || "IM"}
                staffMode={staffMode}
              />
            ),
          },
          // ✅ CP/W' Courbe Puissance-Durée (déplacé du dashboard)
          {
            id: "cp-wprime-curve-profil",
            render: () => currentAthlete && effectiveCloudSnapshot && (
              <CPWPrimeCurveCard
                pmax5s={effectiveCloudSnapshot.pmax_5s ?? null}
                p30s={effectiveCloudSnapshot.p30s_w ?? null}
                p60s={effectiveCloudSnapshot.p60s_w ?? null}
                map5min={effectiveCloudSnapshot.map5min_w ?? null}
                ftp={ftp}
                weightKg={effectiveCloudSnapshot.weight_kg ?? undefined}
              />
            ),
          },
          // ✅ W'bal Recovery (déplacé du dashboard)
          {
            id: "wbal-recovery-profil",
            render: () => currentAthlete && effectiveCloudSnapshot && (
              <WbalRecoveryCard
                pmax5s={effectiveCloudSnapshot.pmax_5s ?? null}
                p30s={effectiveCloudSnapshot.p30s_w ?? null}
                p60s={effectiveCloudSnapshot.p60s_w ?? null}
                map5min={effectiveCloudSnapshot.map5min_w ?? null}
                ftp={ftp}
                weightKg={effectiveCloudSnapshot.weight_kg ?? undefined}
              />
            ),
          },
        ];

        return (
          <div className="space-y-3 sm:space-y-4 md:space-y-6 animate-fade-in">
            {renderAthleteSelector()}
            <SortableSectionsContainer
              tabId="profil"
              tabLabel="Profil"
              sections={profilSections}
            />
          </div>
        );
      }

      case "strategie": {
        const strategieSections = [
          // Synthèse Executive — Alignée sur le diagnostic unifié
          {
            id: "synthese-executive",
            render: () => currentAthlete && (
              <SyntheseExecutiveCard
                athleteName={currentAthlete.name}
                objectif={currentAthlete.goal || "IM"}
                vlamaxEffectif={alignedVlamaxEffectif}
                tteEffectif={alignedTteEffectif}
                limiterResult={alignedLimiterResult}
                ftp={ftp}
                poids={poids ?? null}
                vo2max={effectiveCloudSnapshot?.vo2max ?? null}
                completude={(() => {
                  const missing = getMissingFields(effectiveRefs, ["weightKg", "ftp", "vo2max", "vma", "fcMax"]);
                  return { score: Math.max(0, 100 - missing.length * 10), manquants: missing };
                })()}
                ambition={currentAmbition}
                athleteAge={currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null}
                sportFocus={dashDiagnostic?.sportFocus ?? (isRunningOnly ? "run" : "bike")}
              />
            ),
          },
          // Nutrition V2
          {
            id: "nutrition-v2",
            render: () => currentAthlete && (
              <NutritionUnifiedCard
                vlamaxValue={alignedVlamaxEffectif.value}
                vlamaxConfidence={alignedVlamaxEffectif.confidence}
                vo2max={effectiveCloudSnapshot?.vo2max ?? currentAthlete.vo2max ?? null}
                tteMin={alignedTteEffectif.tte_min}
                sport={isRunningOnly ? "cap" : "velo"}
                objectif={currentAthlete.goal || "IM"}
                weightKg={poids ?? null}
                staffMode={staffMode}
              />
            ),
          },
          // Pacing Envelope
          {
            id: "pacing-envelope",
            render: () => currentAthlete && effectiveCloudSnapshot && (
              <PacingEnvelopeCard
                input={{
                  vlamaxEffectif: alignedVlamaxEffectif,
                  tteEffectif: alignedTteEffectif,
                  fatmax: null,
                  potentielPhysiologiqueScore: potentielPhysiologiqueEffectif.score,
                  fatigueIndex: null,
                  raceObjective: (currentAthlete.goal === "703" ? "70.3" : currentAthlete.goal === "IM" ? "IM" : currentAthlete.goal === "Marathon" ? "Marathon" : currentAthlete.goal === "Semi" ? "Semi" : "IM") as any,
                  sport: isRunningOnly ? "run" : "bike",
                  ftp: effectiveCloudSnapshot.ftp,
                  vma: effectiveCloudSnapshot.vma,
                  paceThreshold: effectiveCloudSnapshot.pace_threshold_sec_per_km,
                  weight: effectiveCloudSnapshot.weight_kg,
                }}
                raceDurationMin={(() => {
                  const g = currentAthlete.goal || "IM";
                  if (g === "IM") return 300;
                  if (g === "703") return 150;
                  if (g === "Marathon") return 210;
                  if (g === "Semi") return 100;
                  return 180;
                })()}
                staffMode={staffMode}
              />
            ),
          },
          // Correspondances Lactiques TFCL
          {
            id: "lactate-correspondence",
            render: () => currentAthlete && (
              <LactateCorrespondenceCard
                vlamaxEffectif={alignedVlamaxEffectif}
                tteEffectif={alignedTteEffectif}
                ftp={ftp}
                sport={effectiveCloudSnapshot?.sport_main || "velo"}
                staffMode={staffMode}
              />
            ),
          },
          // Comprendre mes Scores
          {
            id: "comprendre-scores",
            render: () => currentAthlete && (
              <ComprendreScoresCard
                vlamaxValue={alignedVlamaxEffectif.value}
                tteMin={alignedTteEffectif.tte_min}
                ftpKg={ftp_kg}
                vo2max={effectiveCloudSnapshot?.vo2max ?? null}
                potentielScore={potentielPhysiologiqueEffectif.score}
                objectif={currentAthlete.goal || "IM"}
                ambition={currentAmbition}
                athleteAge={currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null}
              />
            ),
          },
        ];

        return (
          <div className="space-y-3 sm:space-y-4 md:space-y-6 animate-fade-in">
            {renderAthleteSelector()}
            <SortableSectionsContainer
              tabId="strategie"
              tabLabel="Stratégie"
              sections={strategieSections}
            />
          </div>
        );
      }

      case "configuration":
        return <ConfigurationPage />;

      default:
        if (activeTab !== "dashboard") {
          setActiveTab("dashboard");
        }
        return null;
    }
  };

  return (
    <SidebarLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      staffMode={staffMode}
      onStaffModeChange={setStaffMode}
      onExportClick={() => setExportOpen(true)}
    >
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto">
        {/* Tab navigation bar */}
        {activeTab !== "configuration" && legacyAthlete && athletes.length > 0 && (
          <div className="flex gap-1 p-1 rounded-lg bg-muted/50 mb-3">
            {[
              { id: "dashboard", label: "Dashboard", icon: "📊" },
              { id: "profil", label: "Profil", icon: "👤" },
              { id: "strategie", label: "Stratégie", icon: "🎯" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all",
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        )}
        {renderContent()}
      </div>

      {/* Snapshot Manager (triggered by Quick Actions) */}
      {showSnapshots && currentAthlete && (
        <div className="max-w-7xl mx-auto mt-4" id="snapshot-manager-section">
          <SnapshotManager
            athleteId={currentAthlete.id}
            athleteName={currentAthlete.name}
            athleteGoal={currentAthlete.goal || "IM"}
            activeSnapshotId={currentAthlete.active_snapshot_id}
            staffMode={staffMode}
          />
        </div>
      )}

      <footer className="border-t border-border mt-8 sm:mt-12 py-4 sm:py-6 safe-area-inset-bottom">
        <div className="container mx-auto px-4 text-center text-xs sm:text-sm text-muted-foreground">
          <p>Two For Coaching Lab • Analyse physiologique & décision coaching</p>
        </div>
      </footer>
      
      {/* Assistant Chatbot */}
      <AssistantDrawer 
        selectedAthleteId={selectedAthleteId} 
        currentPage={activeTab} 
      />

      {/* Export Tools - triggered from sidebar */}
      {exportOpen && currentAthlete && (
        <ExportTools 
          athlete={currentAthlete}
          snapshots={snapshots}
          tests={tests}
          staffMode={staffMode}
          ambition={currentAmbition}
          open={exportOpen}
          onOpenChange={setExportOpen}
        />
      )}
      {exportOpen && !currentAthlete && (
        <ExportTools 
          athlete={null as any}
          snapshots={[]}
          tests={[]}
          staffMode={staffMode}
          ambition={"loisir" as any}
          open={exportOpen}
          onOpenChange={setExportOpen}
        />
      )}

      {/* Bilan pré-objectif TFCL */}
      {currentAthlete && (() => {
        const future = raceGoals
          .filter(g => new Date(g.race_date) >= new Date())
          .sort((a, b) => new Date(a.race_date).getTime() - new Date(b.race_date).getTime());
        const next = future[0];
        return (
          <RaceReadinessReportDialog
            open={readinessOpen}
            onOpenChange={setReadinessOpen}
            athleteName={currentAthlete.name}
            objectif={currentAthlete.goal || "IM"}
            ambition={currentAmbition}
            nextRace={next ? { race_name: next.race_name, race_type: next.race_type, race_date: next.race_date } : null}
            compassInput={compassInputMemo}
          />
        );
      })()}
    </SidebarLayout>
  );
};

export default Index;
