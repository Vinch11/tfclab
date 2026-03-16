import { useState, useEffect, useMemo, useCallback } from "react";
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
import { RaceReadinessCard } from "@/components/RaceReadinessCard";
import { PhysiologicalAnalysis } from "@/components/PhysiologicalAnalysis";

import { IndexSeancesView } from "@/components/IndexSeances";

import { ExportTools } from "@/components/ExportTools";
import { SnapshotManager } from "@/components/SnapshotManager";
import { LowCRRJustificationCard } from "@/components/LowCRRJustificationCard";
import { DashboardRecommendationsCard } from "@/components/DashboardRecommendationsCard";
import { SnapshotEvolutionChart } from "@/components/SnapshotEvolutionChart";
import { AthleteRefsPanel } from "@/components/AthleteRefsPanel";
import { FtpKgTargetsCard } from "@/components/FtpKgTargetsCard";
import { MetricHelpButton } from "@/components/MetricHelpButton";
import { calculateAge } from "@/lib/ageAdjustment";
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
import { AthleteReadinessReport } from "@/components/AthleteReadinessReport";
import { AssistantDrawer } from "@/components/AssistantDrawer";
import { computeNutritionTiming } from "@/lib/nutritionTiming";
import { RaceReadinessPage } from "@/components/RaceReadinessPage";
import { computeNutritionEstimate } from "@/lib/nutritionPredictive";
import { computeRunningEconomy } from "@/lib/runningEconomy";
import { generateAthleteReadiness } from "@/lib/athleteReadiness";
import { computeEnergyDrift, EnergyDriftResult } from "@/lib/energyDrift";
// EnergyDriftBadge removed - kept energyDrift computation for StaffDashboard/RaceReadinessPage
import { DashboardGauges } from "@/components/DashboardGauges";
import { StaffDashboard } from "@/components/StaffDashboard";
import { ScientificChartsDashboard, MetabolicPerformanceCompass, MetabolicCompassCAP, AmbitionProgressChart, AmbitionProgressMini, CompactMetricsGrid, CarbBurnRateChart, MetabolicPowerCurve } from "@/components/charts";
import { ChargeRecenteCard } from "@/components/ChargeRecenteCard";
import { computeCRR } from "@/lib/chargeRecenteReference";
import { RaceReadinessV2Module } from "@/components/RaceReadinessV2Module";
import { RaceReadinessSignatureChart, type RaceReadinessInput } from "@/components/RaceReadinessSignatureChart";
// ✅ Race Readiness - Carte unifiée (Phase 1c UX)
import { RaceReadinessUnifiedCard } from "@/components/RaceReadinessUnifiedCard";
import { computeCompassScores, type CompassScores } from "@/lib/compassScoring";
import { DecisionReliabilityCard } from "@/components/DecisionReliabilityCard";
import { computeFullDRE, type DecisionReliabilityResult } from "@/engines/diagnostic";
import { useDecisionReliability } from "@/hooks/useDecisionReliability";
import { SortableSectionsContainer } from "@/components/SortableSectionsContainer";

// ✅ VLamax TFCL V2 - Carte unifiée (Phase 1 UX)
import { VLamaxUnifiedCard } from "@/components/VLamaxUnifiedCard";
import { VLamaxZoneConfidenceChart } from "@/components/charts/VLamaxZoneConfidenceChart";
import { VLamaxEstimationWidget } from "@/components/charts/VLamaxEstimationWidget";
import { Phase3Dashboard } from "@/components/Phase3Dashboard";
import { LorangTestChecklist } from "@/components/LorangTestChecklist";
import { FatMaxTFCLCard } from "@/components/FatMaxTFCLCard";
import { FatMaxRaceIntensityChart } from "@/components/charts/FatMaxRaceIntensityChart";
import { computeFatMaxTFCL, FatMaxObjectif } from "@/lib/v2/fatmaxTFCL";
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

// ✅ Engines unifiés
import { computeDiagnostic, type DiagnosticInput } from "@/engines/diagnostic";
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
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

import logo2fc from "@/assets/logo-2fc.png";
import { useAuth } from "@/contexts/AuthContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { useAthletes } from "@/contexts/AthleteContext";
import { DbAthlete, DbSnapshot } from "@/hooks/useCloudData";
import { FeedbackNolio } from "@/types/feedbackNolio";
import { toast } from "sonner";

// ✅ Legacy types/helpers (utilisés par tes composants actuels)
import { getDernierSnapshot } from "@/types/athlete";
import { computeVLamaxEffectif, type VLamaxEffectif, computeTTEEffectif, type TTEEffectif, getSourceLabel } from "@/engines/diagnostic";

// ✅ RACE READINESS EFFECTIF - Source unique de vérité
import { computeRaceReadinessEffectif, RaceReadinessEffectif, getScoreColor } from "@/lib/raceReadinessEffectif";

// ✅ Ambition (modulateur des cibles)
import {
  AmbitionLevel,
  AMBITION_LEVELS_ORDERED,
  DEFAULT_AMBITION,
  getAmbitionDefinition,
  getAthleteAmbition,
  normalizeAmbitionLevel,
} from "@/types/ambitionLevel";

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Cloud data pour les données brutes (snapshots, tests, checkins)
  const { snapshots, tests, checkins, loading, loadData, addAthlete, updateAthlete, deleteAthlete, addTest, deleteTest, updateSnapshot, addCheckin, updateCheckin, getCheckinsForAthlete } = useCloudDataContext();
  
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
      sexe: (refs.sexe as "M" | "F") || "M",
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
      snapshots: snapshots.map(s => ({
        id: s.id,
        athlete_id: s.athlete_id,
        date: s.date,
        vlamax: s.vlamax,
        ftp: s.ftp,
        pmax_5s: s.pmax_5s,
        weight_kg: s.weight_kg,
        sport_main: s.sport_main,
        p30s_w: s.p30s_w,
        p60s_w: s.p60s_w,
        map5min_w: s.map5min_w,
        tte_observed_min: s.tte_observed_min,
        protocol_quality: s.protocol_quality,
        objectif: s.objectif,
        vo2max: s.vo2max,
      })),
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
    });
  }, [effectiveCloudSnapshot, currentAthlete]);

  // ✅ Valeur TTE affichée partout (Index) - fallback 0 pour compatibilité
  const tte = useMemo(() => {
    return tteEffectif?.tte_min ?? 0;
  }, [tteEffectif]);

  // ✅ RACE READINESS EFFECTIF - Source unique de vérité
  const raceReadinessEffectif = useMemo<RaceReadinessEffectif>(() => {
    return computeRaceReadinessEffectif({
      objectif: currentAthlete?.goal || "IM",
      vlamaxEffectif,
      tteEffectif,
      ftp,
      poids: poids ?? undefined,
      fatigue_ok: true,
      seance_specifique_validee: false,
      fcMax: effectiveRefs.fcMax ?? null,
      deriveCardiaque: effectiveCloudSnapshot?.run_hr_drift_pct ?? null,
      athleteAge: currentAthlete?.birth_date ? calculateAge(currentAthlete.birth_date) : null,
      ambition: currentAmbition,
      // ✅ AJOUT: TSS 7j pour calcul Disponibilité (MIN architecture)
      tss7d: effectiveCloudSnapshot?.tss_7d ?? null,
    });
  }, [currentAthlete, vlamaxEffectif, tteEffectif, ftp, poids, effectiveRefs, effectiveCloudSnapshot, currentAmbition]);

  // ✅ NUTRITION ESTIMATE - Pour rapport staff
  const nutritionEstimate = useMemo(() => {
    return computeNutritionEstimate({
      vlamax: vlamaxEffectif.value,
      objectif: currentAthlete?.goal || "IM",
      tteMin: tteEffectif.tte_min,
      tteTarget: tteEffectif.target,
    });
  }, [vlamaxEffectif, currentAthlete, tteEffectif]);

  // ✅ RUNNING ECONOMY - Pour rapport staff
  const runningEconomyResult = useMemo(() => {
    return computeRunningEconomy({
      fcMax: effectiveRefs.fcMax ?? null,
      fcMoyenneEndurance: null,
      allureEndurance: null,
      // ✅ FIX: Utiliser la dérive cardiaque du snapshot
      deriveCardiaque: effectiveCloudSnapshot?.run_hr_drift_pct ?? null,
      tteMin: tteEffectif.tte_min,
      objectif: currentAthlete?.goal || "IM",
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
    });
  }, [currentAthlete, effectiveCloudSnapshot, ftp_kg, vlamaxEffectif, tteEffectif, currentAmbition, wprimeKjForLimiter, cpResultForLimiter]);

  // ✅ FATIGUE EFFECTIF — Pour Coaching Compass
  const fatigueEffectifForCompass = useMemo<FatigueEffectif | null>(() => {
    if (!effectiveCloudSnapshot || !currentAthlete) return null;
    const fatigueStateToPercue: Record<string, number> = { fresh: 2, ok: 4, fatigued: 7, very_fatigued: 9 };
    const fatiguePercue = fatigueStateToPercue[effectiveCloudSnapshot.fatigue_state || "ok"] ?? 4;
    return computeFatigueEffectif({
      tss7d: effectiveCloudSnapshot.tss_7d ?? null,
      tss7dHabituel: null,
      fatiguePercue,
      tteEffectif,
      raceReadiness: raceReadinessEffectif,
      vlamaxEffectif,
      age: currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null,
      objectif: currentAthlete.goal || "IM",
    });
  }, [effectiveCloudSnapshot, currentAthlete, tteEffectif, raceReadinessEffectif, vlamaxEffectif]);

  // ✅ LORANG STRATEGY — Pour Coaching Compass
  const lorangStrategyForCompass = useMemo<LorangStrategyResult | null>(() => {
    if (!currentAthlete || !effectiveCloudSnapshot) return null;
    const vlamaxTarget = currentAmbition === "elite" ? 0.35 : currentAmbition === "competitor" ? 0.45 : 0.55;
    const vo2maxTarget = currentAmbition === "elite" ? 70 : currentAmbition === "competitor" ? 62 : 55;
    const tteTarget = currentAmbition === "elite" ? 50 : currentAmbition === "competitor" ? 40 : 35;
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
      });
    } catch { return null; }
  }, [currentAthlete, effectiveCloudSnapshot, currentAmbition, ftp_kg, vlamaxEffectif, tteEffectif, fatigueEffectifForCompass]);

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
      raceReadiness: raceReadinessEffectif ? {
        score: raceReadinessEffectif.score,
        potential: (raceReadinessEffectif as any).potential ?? raceReadinessEffectif.score,
        availability: (raceReadinessEffectif as any).availability ?? 80,
        governingFactor: (raceReadinessEffectif as any).governingFactor ?? "potential",
        label: raceReadinessEffectif.label || "",
        color: raceReadinessEffectif.color || "warning",
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
      sportFocus: (effectiveCloudSnapshot.sport_main === "run" ? "run" : effectiveCloudSnapshot.sport_main === "bike" ? "bike" : "triathlon") as "bike" | "run" | "triathlon",
      athleteAge: currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null,
    };
  }, [currentAthlete, effectiveCloudSnapshot, effectiveRefs, vlamaxEffectif, tteEffectif, fatigueEffectifForCompass, unifiedLimiterResult, raceReadinessEffectif, lorangStrategyForCompass, lactateThresholdsForCompass, wprimeKjForLimiter, currentAmbition]);

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
                        return (
                          <SelectItem key={level} value={level}>
                            {def.icon} {def.label}
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
                      return (
                        <SelectItem key={level} value={level}>
                          {def.icon} {def.label}
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
      case "dashboard":
        // ═══════════════════════════════════════════════════════════
        // DASHBOARD SIMPLIFIÉ — 5 sections + Quick Actions
        // Flux: Compass → Profil → Decision → Race Readiness → Objectifs
        // ═══════════════════════════════════════════════════════════
        const dashboardSections = [
          // ✅ Quick Actions Panel
          {
            id: "quick-actions",
            render: () => (
              <QuickActionsPanel
                onCreateSnapshot={() => {
                  setShowSnapshots(true);
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
                onNavigateToProfile={() => navigate(`/athlete/${currentAthlete.id}`)}
                onNavigateToTests={() => navigate("/diagnostic/tests")}
                onNavigateToAcademy={() => navigate("/academy")}
                onDismiss={gettingStartedVisibility.hide}
              />
            ),
          },
          // ✅ 1. TFCL Coaching Compass™ — Centre décisionnel
          {
            id: "coaching-compass",
            render: () => compassInputMemo ? (
              <CoachingCompassCard
                input={compassInputMemo}
                staffMode={staffMode}
              />
            ) : null,
          },
          // ✅ 2. Profil Physiologique + Objectifs (combiné)
          {
            id: "profil-ambition-unified",
            render: () => currentAthlete && (
              <ProfilAmbitionUnifiedCard
                athlete={currentAthlete}
                snapshots={snapshots}
                effectiveCloudSnapshot={effectiveCloudSnapshot}
                raceGoals={raceGoals}
                onGoalChange={async (goal) => {
                  await updateAthleteGoal(goal);
                  await loadData();
                }}
                onAddRaceGoal={async (goal) => {
                  await addRaceGoal(goal);
                }}
                onDeleteRaceGoal={deleteRaceGoal}
                onRestoreRaceGoal={restoreRaceGoal}
                onUpdateRaceGoalDate={updateRaceGoalDate}
                raceGoalsLoading={raceGoalsLoading}
                ambition={currentAmbition}
                weightKg={effectiveRefs.weightKg}
                onNavigateToProfile={() => navigate(`/athlete/${currentAthlete.id}`)}
                onNavigateToCAPTest={() => navigate("/diagnostic/testing-week-cap")}
                onNavigateToTFCLTest={() => navigate("/diagnostic/testing-week-tfcl")}
                onUpdate={() => loadData()}
              />
            ),
          },
          // ✅ 3. Coach Decision Center
          {
            id: "coach-decision-unified",
            render: () => {
              if (!currentAthlete) return null;
              
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
                weightKg: effectiveCloudSnapshot?.weight_kg ?? null,
                objectif: currentAthlete.goal || "IM",
                ambition: currentAmbition,
                sportFocus: isRunningOnly ? "run" : "bike",
                vo2max: effectiveCloudSnapshot?.vo2max ?? null,
                ftp: effectiveCloudSnapshot?.ftp ?? null,
                ftpKg: ftp_kg,
                pmax5s: effectiveCloudSnapshot?.pmax_5s ?? null,
                p30sW: effectiveCloudSnapshot?.p30s_w ?? null,
                p60sW: effectiveCloudSnapshot?.p60s_w ?? null,
                map5minW: effectiveCloudSnapshot?.map5min_w ?? null,
                vma: effectiveCloudSnapshot?.vma ?? null,
                css: effectiveCloudSnapshot?.css ?? null,
                vlamax: effectiveCloudSnapshot?.vlamax ?? null,
                vlamaxRun: effectiveCloudSnapshot?.vlamax_run ?? null,
                vlamaxSource: effectiveCloudSnapshot?.vlamax_source ?? null,
                vlamaxProtocol: effectiveCloudSnapshot?.vlamax_protocol ?? null,
                vlamaxIsReference: effectiveCloudSnapshot?.vlamax_is_reference ?? false,
                tteObservedMin: effectiveCloudSnapshot?.tte_observed_min ?? null,
                tteMode: effectiveCloudSnapshot?.tte_mode ?? null,
                tss7d: effectiveCloudSnapshot?.tss_7d ?? null,
                fatigueState: effectiveCloudSnapshot?.fatigue_state ?? null,
                runEconomyScore: effectiveCloudSnapshot?.run_economy_score ?? null,
                runHrDriftPct: effectiveCloudSnapshot?.run_hr_drift_pct ?? null,
                paceThresholdSecPerKm: effectiveCloudSnapshot?.pace_threshold_sec_per_km ?? null,
                runningPower1s: effectiveCloudSnapshot?.running_power_1s ?? null,
                runningPower5s: effectiveCloudSnapshot?.running_power_5s ?? null,
                runningPower30s: effectiveCloudSnapshot?.running_power_30s ?? null,
                runningPower60s: effectiveCloudSnapshot?.running_power_60s ?? null,
                runningPower5min: effectiveCloudSnapshot?.running_power_5min ?? null,
                runningPowerThreshold: effectiveCloudSnapshot?.running_power_threshold ?? null,
                sprint15sDistance: effectiveCloudSnapshot?.sprint_15s_distance ?? null,
                bikeCadenceRpm: effectiveCloudSnapshot?.bike_cadence_rpm ?? null,
                bikeHrDriftFlag: effectiveCloudSnapshot?.bike_hr_drift_flag ?? false,
                protocolQuality: effectiveCloudSnapshot?.protocol_quality ?? null,
                wprimeKj: wprimeKjForLimiter,
                cpDataQuality: cpResultForLimiter?.dataQuality ?? null,
                fatmax: vlamaxEffectif.value != null ? Math.max(0, 65 - (vlamaxEffectif.value - 0.3) * 80) : null,
                forceDevMode: effectiveCloudSnapshot?.force_development_mode ?? false,
                giIssuesFlag: effectiveCloudSnapshot?.gi_issues_flag ?? false,
                checkinData: latestCheckin ? {
                  sleep: latestCheckin.sleep,
                  fatigue: latestCheckin.fatigue,
                  soreness: latestCheckin.soreness,
                  stress: latestCheckin.stress,
                  motivation: latestCheckin.motivation,
                  painFlag: latestCheckin.pain_flag ?? false,
                } : undefined,
              };
              
              const diagnostic = computeDiagnostic(diagnosticInput);
              
              const decisionInput: DecisionInput = {
                diagnostic,
                context: {
                  daysToRace: null,
                  isRaceWeek: false,
                  currentPhase: "build",
                },
                load: {
                  tss7d: effectiveCloudSnapshot?.tss_7d ?? null,
                  tss28d: effectiveCloudSnapshot?.tss_7d ? effectiveCloudSnapshot.tss_7d * 4 : null,
                },
              };
              
              const prescription = computeDecision(decisionInput);
              
              return (
                <CoachDecisionUnifiedCard
                  diagnostic={diagnostic}
                  prescription={prescription}
                  staffMode={staffMode}
                  compact={!staffMode}
                />
              );
            },
          },
          // ✅ 4. Race Readiness
          {
            id: "race-readiness-unified",
            render: () => {
              if (!currentAthlete) return null;
              
              const athleteCheckins = getCheckinsForAthlete(currentAthlete.id);
              const sortedCheckins = [...athleteCheckins].sort((a, b) => 
                new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime()
              );
              const latestCheckin = sortedCheckins[0] || null;
              
              const crr = computeCRR({
                tss7d: effectiveCloudSnapshot?.tss_7d ?? null,
                snapshotDate: effectiveCloudSnapshot?.date ?? null,
                snapshotUpdatedAt: effectiveCloudSnapshot?.updated_at ?? null,
              });
              const compass = computeCompassScores({
                ftp: effectiveRefs.ftp,
                poids: effectiveRefs.weightKg,
                vlamaxEffectif,
                tteEffectif,
                crr,
                objectif: currentAthlete.goal || "IM",
                ambition: currentAmbition,
                athleteAge: currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null,
              });
              
              const objectiveData = effectiveCloudSnapshot ? {
                tss7d: effectiveCloudSnapshot.tss_7d ?? null,
                tssTarget: 350,
              } : undefined;
              
              // Fatigue warning from snapshot
              const fatigueState = effectiveCloudSnapshot?.fatigue_state;
              const hasFatigueWarning = fatigueState === "fatigued" || fatigueState === "very_fatigued";
              
              // Signature chart input
              const vlamaxTarget = currentAmbition === "elite" ? 0.35 : currentAmbition === "competitor" ? 0.45 : 0.55;
              const vo2maxTarget = currentAmbition === "elite" ? 70 : currentAmbition === "competitor" ? 62 : 55;
              const tteTarget = currentAmbition === "elite" ? 50 : currentAmbition === "competitor" ? 40 : 35;
              const disciplineMap: Record<string, 'IM' | '703' | 'marathon' | 'semi' | '10k' | 'cycling' | 'trail'> = {
                'IM': 'IM', '703': '703', 'Marathon': 'marathon', 'Semi': 'semi',
              };
              const discipline = disciplineMap[currentAthlete.goal || '703'] || '703';
              const tss7d = effectiveCloudSnapshot?.tss_7d ?? null;
              const tss28d = tss7d ? tss7d * 4 : null;
              
              const signatureInput: RaceReadinessInput = {
                physiology: {
                  vo2max: effectiveCloudSnapshot?.vo2max ?? null,
                  vo2maxTarget,
                  vlamax: vlamaxEffectif.value,
                  vlamaxTarget,
                  tte: tteEffectif.tte_min,
                  tteTarget,
                  economy: effectiveCloudSnapshot?.run_economy_score ?? null,
                  trend: undefined,
                },
                availability: {
                  hrvStatus: null,
                  tss7d,
                  tss28d,
                  subjectiveFatigue: null,
                  sleepQuality: null,
                  motivation: null,
                  soreness: null,
                  stress: null,
                  hasRedFlags: false,
                },
                discipline,
                ambition: currentAmbition,
                daysToRace: null,
              };
              
              return (
                <div className="space-y-3">
                  {/* Fatigue warning */}
                  {hasFatigueWarning && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
                      <span className="text-warning">⚠️</span>
                      <span className="text-warning-foreground font-medium">
                        Attention : ce snapshot a été réalisé sous fatigue.
                      </span>
                    </div>
                  )}
                  <RaceReadinessUnifiedCard
                    compass={compass}
                    latestCheckin={latestCheckin}
                    objectiveData={objectiveData}
                    guardrails={{
                      fatigueIndex: effectiveCloudSnapshot?.tss_7d ? Math.min(100, (effectiveCloudSnapshot.tss_7d / 7)) : undefined,
                    }}
                    signatureInput={signatureInput}
                    athleteName={currentAthlete.name}
                    objectif={currentAthlete.goal || "IM"}
                    staffMode={staffMode}
                  />
                </div>
              );
            },
          },
          // ✅ 5. Compact Metrics Grid
          {
            id: "compact-metrics-grid",
            render: () => currentAthlete && effectiveCloudSnapshot && (
              <CompactMetricsGrid
                ftp={ftp}
                weight={poids ?? undefined}
                vo2max={effectiveCloudSnapshot.vo2max ?? null}
                vlamax={vlamaxEffectif.value}
                tteMin={tteEffectif.tte_min}
                vma={effectiveCloudSnapshot.vma ?? null}
                objectif={currentAthlete.goal || "IM"}
              />
            ),
          },
          // ✅ 6. VLamax TFCL™ Unified Card
          {
            id: "vlamax-v2-calibration",
            render: () => currentAthlete && (
              <VLamaxUnifiedCard
                vlamaxEffectif={vlamaxEffectif}
                objectif={currentAthlete.goal || "IM"}
                staffMode={staffMode}
                ambition={currentAmbition}
                athleteId={currentAthlete.id}
                vo2max={effectiveCloudSnapshot?.vo2max ?? null}
                age={currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null}
              />
            ),
          },
          // ✅ 7. Metabolic Zones TFCL™
          {
            id: "fatmax-tfcl",
            render: () => currentAthlete && (
              <MetabolicZonesUnifiedCard
                vlamaxEffectif={vlamaxEffectif}
                tteEffectif={tteEffectif}
                objectif={currentAthlete.goal || "IM"}
                ftp={ftp}
                staffMode={staffMode}
              />
            ),
          },
          // ✅ 8. FTP/kg Targets
          {
            id: "ftp-targets",
            render: () => currentAthlete && (
              <FtpKgTargetsCard
                objectif={currentAthlete.goal || "IM"}
                currentFtpKg={ftp_kg}
                age={currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null}
              />
            ),
          },
          // ✅ 9. Running Economy Summary
          {
            id: "running-economy-summary",
            render: () => currentAthlete && (
              <RunningEconomySummaryCard
                snapshots={snapshots.filter(s => s.athlete_id === currentAthlete.id)}
                staffMode={staffMode}
              />
            ),
          },
          // ✅ 10. Dashboard Recommendations
          {
            id: "dashboard-recommendations",
            render: () => currentAthlete && (
              <DashboardRecommendationsCard />
            ),
          },
          // ✅ 11. CP/W' Curve
          {
            id: "cpw-prime-curve",
            render: () => currentAthlete && effectiveCloudSnapshot && (
              <CPWPrimeCurveCard
                pmax5s={effectiveCloudSnapshot.pmax_5s}
                p30s={effectiveCloudSnapshot.p30s_w}
                p60s={effectiveCloudSnapshot.p60s_w}
                map5min={effectiveCloudSnapshot.map5min_w}
                ftp={effectiveCloudSnapshot.ftp}
                weightKg={effectiveCloudSnapshot.weight_kg}
              />
            ),
          },
          // ✅ 12. W'bal Recovery
          {
            id: "wbal-recovery",
            render: () => currentAthlete && effectiveCloudSnapshot && (
              <WbalRecoveryCard
                ftp={effectiveCloudSnapshot.ftp}
                pmax5s={effectiveCloudSnapshot.pmax_5s}
                p30s={effectiveCloudSnapshot.p30s_w}
                p60s={effectiveCloudSnapshot.p60s_w}
                map5min={effectiveCloudSnapshot.map5min_w}
                weightKg={effectiveCloudSnapshot.weight_kg}
              />
            ),
          },
          // ✅ 13. Metabolic Power Curve
          {
            id: "metabolic-power-curve",
            render: () => currentAthlete && effectiveCloudSnapshot && (
              <MetabolicPowerCurve
                ftp={ftp}
                pMax5s={effectiveCloudSnapshot.pmax_5s ?? undefined}
                p30s={effectiveCloudSnapshot.p30s_w ?? undefined}
                p60s={effectiveCloudSnapshot.p60s_w ?? undefined}
                map5min={effectiveCloudSnapshot.map5min_w ?? undefined}
                weight={poids ?? 70}
                vlamax={vlamaxEffectif.value ?? 0}
                vo2max={effectiveCloudSnapshot.vo2max ?? 50}
              />
            ),
          },
          // ✅ 14. VO2max Age Comparison
          {
            id: "vo2max-age-comparison",
            render: () => currentAthlete && (
              <VO2maxAgeComparisonCard
                age={currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null}
                currentVo2max={effectiveCloudSnapshot?.vo2max ?? currentAthlete.vo2max ?? null}
                objectif={currentAthlete.goal || "IM"}
                ambition={currentAmbition}
              />
            ),
          },
          // ✅ 15. Roadmap Stratégique (AI Coaching Progression)
          {
            id: "ai-coaching-progression",
            render: () => currentAthlete && unifiedLimiterResult && (
              <RoadmapStrategique
                limiterResult={unifiedLimiterResult}
                objectif={currentAthlete.goal || "IM"}
              />
            ),
          },
          // ✅ 16. Lorang Test Checklist
          {
            id: "lorang-test-checklist",
            render: () => currentAthlete && effectiveCloudSnapshot && (
              <LorangTestChecklist
                snapshot={effectiveCloudSnapshot}
              />
            ),
          },
          // ✅ 17. Data Completion Guide
          {
            id: "data-completion-guide",
            render: () => currentAthlete && effectiveCloudSnapshot && (
              <DataCompletionGuide
                snapshot={effectiveCloudSnapshot}
                athleteGoal={currentAthlete.goal || "IM"}
                onNavigateToProfile={() => navigate(`/athlete/${currentAthlete.id}`)}
                onNavigateToCAPTest={() => navigate("/diagnostic/testing-week-cap")}
                onNavigateToTFCLTest={() => navigate("/diagnostic/testing-week-tfcl")}
              />
            ),
          },
          // ✅ 18. Decision Reliability (Staff)
          {
            id: "decision-reliability",
            render: () => currentAthlete && staffMode && (
              <DecisionReliabilityCard
                result={decisionReliability}
              />
            ),
          },
          // ✅ 19. Staff Dashboard (visible en mode staff)
          {
            id: "staff-dashboard",
            render: () => currentAthlete && legacyAthlete && staffMode && (
              <StaffDashboard
                athleteName={currentAthlete.name}
                objectif={currentAthlete.goal || "IM"}
                vlamaxEffectif={vlamaxEffectif}
                tteEffectif={tteEffectif}
                raceReadiness={raceReadinessEffectif}
                nutritionEstimate={nutritionEstimate}
                ftpKg={ftp_kg}
                snapshotDate={effectiveCloudSnapshot?.date ?? null}
                athleteAge={currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null}
                ambition={currentAmbition}
                snapshot={effectiveCloudSnapshot}
                vo2max={effectiveCloudSnapshot?.vo2max ?? null}
                athlete={legacyAthlete}
                energyDrift={energyDrift}
              />
            ),
          },
          // ✅ 20. Low CRR Justification
          {
            id: "low-crr-justification",
            render: () => currentAthlete && effectiveCloudSnapshot && (
              <LowCRRJustificationCard
                snapshot={effectiveCloudSnapshot}
              />
            ),
          },
          // ✅ 21. Scientific Charts (Staff)
          {
            id: "scientific-charts",
            render: () => currentAthlete && effectiveCloudSnapshot && staffMode && (
              <ScientificChartsDashboard
                vlamaxValue={vlamaxEffectif.value}
                vlamaxSource={vlamaxEffectif.source}
                vlamaxConfidence={vlamaxEffectif.confidence}
                tteValue={tteEffectif.tte_min}
                tteSource={tteEffectif.source}
                tteConfidence={tteEffectif.confidence}
                readinessScore={raceReadinessEffectif.score}
                objectif={currentAthlete.goal || "IM"}
                vo2max={effectiveCloudSnapshot.vo2max ?? null}
                ftp={ftp}
                weight={poids ?? undefined}
                initialStaffMode={staffMode}
              />
            ),
          },
        ];

        return (
          <div className="space-y-3 sm:space-y-4 md:space-y-6 animate-fade-in">
            {renderAthleteSelector()}
            
            <SortableSectionsContainer
              tabId="dashboard"
              tabLabel="Dashboard"
              sections={dashboardSections}
            />
          </div>
        );

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
                vlamaxEffectif={vlamaxEffectif}
                tteEffectif={tteEffectif}
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
                vlamaxEffectif={vlamaxEffectif}
                tteEffectif={tteEffectif}
                readiness={raceReadinessEffectif}
                onGoToSnapshots={() => setShowSnapshots(true)}
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
            render: () => legacyAthlete && (
              <TrainingZonesCard athlete={legacyAthlete} />
            ),
          },
          // Seuils Lactiques TFCL
          {
            id: "lactate-thresholds-profil",
            render: () => currentAthlete && (
              <LactateCorrespondenceCard
                vlamaxEffectif={vlamaxEffectif}
                tteEffectif={tteEffectif}
                ftp={ftp}
                sport={effectiveCloudSnapshot?.sport_main || "velo"}
                staffMode={staffMode}
              />
            ),
          },
          // VLamax V2 Calibration (profil)
          {
            id: "vlamax-v2-calibration-profil",
            render: () => currentAthlete && (
              <VLamaxUnifiedCard
                vlamaxEffectif={vlamaxEffectif}
                objectif={currentAthlete.goal || "IM"}
                staffMode={staffMode}
                ambition={currentAmbition}
                athleteId={currentAthlete.id}
                vo2max={effectiveCloudSnapshot?.vo2max ?? null}
                age={currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null}
              />
            ),
          },
          // FTP/kg Targets (profil)
          {
            id: "ftp-targets-profil",
            render: () => currentAthlete && (
              <FtpKgTargetsCard
                objectif={currentAthlete.goal || "IM"}
                currentFtpKg={ftp_kg}
                age={currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null}
              />
            ),
          },
          // FatMax TFCL (profil)
          {
            id: "fatmax-tfcl-profil",
            render: () => currentAthlete && (
              <MetabolicZonesUnifiedCard
                vlamaxEffectif={vlamaxEffectif}
                tteEffectif={tteEffectif}
                objectif={currentAthlete.goal || "IM"}
                ftp={ftp}
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
                vlamaxValue={vlamaxEffectif.value}
                vlamaxSource={vlamaxEffectif.source}
                vlamaxConfidence={vlamaxEffectif.confidence}
                tteValue={tteEffectif.tte_min}
                tteSource={tteEffectif.source}
                tteConfidence={tteEffectif.confidence}
                readinessScore={raceReadinessEffectif.score}
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
          // Synthèse Executive
          {
            id: "synthese-executive",
            render: () => currentAthlete && (
              <SyntheseExecutiveCard
                athleteName={currentAthlete.name}
                objectif={currentAthlete.goal || "IM"}
                vlamaxEffectif={vlamaxEffectif}
                tteEffectif={tteEffectif}
                raceReadiness={raceReadinessEffectif}
                ftp={ftp}
                poids={poids ?? null}
                vo2max={effectiveCloudSnapshot?.vo2max ?? null}
                tss7d={effectiveCloudSnapshot?.tss_7d ?? null}
                completude={(() => {
                  const missing = getMissingFields(currentAthlete, snapshots);
                  return { score: Math.max(0, 100 - missing.length * 10), manquants: missing };
                })()}
                ambition={currentAmbition}
              />
            ),
          },
          // Nutrition V2
          {
            id: "nutrition-v2",
            render: () => currentAthlete && (
              <NutritionUnifiedCard
                vlamaxValue={vlamaxEffectif.value}
                vlamaxConfidence={vlamaxEffectif.confidence}
                tteMin={tteEffectif.tte_min}
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
                  vlamaxEffectif,
                  tteEffectif,
                  fatmax: null,
                  raceReadinessScore: raceReadinessEffectif.score,
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
          // Double Boucle CAP
          {
            id: "double-boucle-cap",
            render: () => currentAthlete && (
              <DoubleBoucleCAPCard
                vlamaxRun={effectiveCloudSnapshot?.vlamax_run ?? vlamaxEffectif.value}
                vo2max={effectiveCloudSnapshot?.vo2max ?? null}
                durability={tteEffectif.tte_min}
                objectif={currentAthlete.goal || "IM"}
                readinessScore={raceReadinessEffectif.score}
                confidence={vlamaxEffectif.confidence}
                ambition={currentAmbition}
              />
            ),
          },
          // Correspondances Lactiques TFCL
          {
            id: "lactate-correspondence",
            render: () => currentAthlete && (
              <LactateCorrespondenceCard
                vlamaxEffectif={vlamaxEffectif}
                tteEffectif={tteEffectif}
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
                vlamaxValue={vlamaxEffectif.value}
                tteMin={tteEffectif.tte_min}
                ftpKg={ftp_kg}
                vo2max={effectiveCloudSnapshot?.vo2max ?? null}
                readinessScore={raceReadinessEffectif.score}
                objectif={currentAthlete.goal || "IM"}
                ambition={currentAmbition}
              />
            ),
          },
          // Séances & Bibliothèque
          {
            id: "seances-library",
            render: () => currentAthlete && legacyAthlete && (
              <IndexSeancesView
                athlete={legacyAthlete}
                snapshot={snapshotLegacy}
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
        {renderContent()}
      </div>

      {/* Snapshot Manager (triggered by Quick Actions) */}
      {showSnapshots && currentAthlete && (
        <div className="max-w-7xl mx-auto mt-4">
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
    </SidebarLayout>
  );
};

export default Index;
