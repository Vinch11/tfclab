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
import { CheckinManager } from "@/components/CheckinManager";
import { QuickFatigueInput } from "@/components/QuickFatigueInput";
import { DisponibiliteTFCLCard } from "@/components/DisponibiliteTFCLCard";
import { TFCLDailyReadinessCheck } from "@/components/TFCLDailyReadinessCheck";
import { computeDisponibiliteTFCL, type TFCLReadinessInput, type DisponibiliteTFCL as DisponibiliteTFCLResult } from "@/lib/v2/disponibiliteTFCL";
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
import { EnergyDriftBadge } from "@/components/EnergyDriftBadge";
import { DashboardGauges } from "@/components/DashboardGauges";
import { StaffDashboard } from "@/components/StaffDashboard";
import { ScientificChartsDashboard, MetabolicPerformanceCompass, AmbitionProgressChart, AmbitionProgressMini, CompactMetricsGrid, CarbBurnRateChart, MetabolicPowerCurve } from "@/components/charts";
import { ChargeRecenteCard } from "@/components/ChargeRecenteCard";
import { computeCRR } from "@/lib/chargeRecenteReference";
import { RaceReadinessV2Module } from "@/components/RaceReadinessV2Module";
import { RaceReadinessSignatureChart, type RaceReadinessInput } from "@/components/RaceReadinessSignatureChart";
import { computeCompassScores, type CompassScores } from "@/lib/compassScoring";
import { DecisionReliabilityCard } from "@/components/DecisionReliabilityCard";
import { computeFullDRE, DecisionReliabilityResult } from "@/lib/v2/decisionReliabilityEngine";
import { useDecisionReliability } from "@/hooks/useDecisionReliability";
import { SortableSectionsContainer } from "@/components/SortableSectionsContainer";

// ✅ VLamax TFCL V2 - Calibration avec percentiles
import { VLamaxV2DisplayCard } from "@/components/VLamaxV2DisplayCard";
import { VLamaxExplainedCard } from "@/components/VLamaxExplainedCard";
import { VLamaxRunExplainedCard } from "@/components/VLamaxRunExplainedCard";
import { VLamaxCombinedCard } from "@/components/VLamaxCombinedCard";
import { FatMaxTFCLCard } from "@/components/FatMaxTFCLCard";
import { FatMaxRaceIntensityChart } from "@/components/charts/FatMaxRaceIntensityChart";
import { computeFatMaxTFCL, FatMaxObjectif } from "@/lib/v2/fatmaxTFCL";
import { ObjectifPrincipal } from "@/lib/reference";

// ✅ TFCL Decision Matrix — Cœur décisionnel coach-grade
import { TFCLDecisionMatrixCard } from "@/components/TFCLDecisionMatrixCard";
import { TFCLDecisionMatrixTable } from "@/components/TFCLDecisionMatrixTable";
import { type TFCLDecisionInput, type TFCLObjective } from "@/lib/v2/tfclDecisionMatrix";

// ✅ Lorang Strategy Engine — Leviers opérationnels TFCL
import { LorangStrategyCard } from "@/components/LorangStrategyCard";
import { LorangDecisionFlowChart } from "@/components/LorangDecisionFlowChart";
import { type LorangStrategyInput } from "@/lib/v2/lorangStrategyEngine";

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
import { computeVLamaxEffectif, VLamaxEffectif } from "@/lib/vlamaxEffectif";

// ✅ TTE EFFECTIF - Source unique de vérité
import { computeTTEEffectif, TTEEffectif, getSourceLabel } from "@/lib/tteEffectif";

// ✅ RACE READINESS EFFECTIF - Source unique de vérité
import { computeRaceReadinessEffectif, RaceReadinessEffectif, getScoreColor } from "@/lib/raceReadinessEffectif";

// ✅ Ambition (modulateur des cibles)
import {
  AmbitionLevel,
  AMBITION_LEVELS_ORDERED,
  DEFAULT_AMBITION,
  getAmbitionDefinition,
} from "@/types/ambitionLevel";

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Cloud data pour les données brutes (snapshots, tests, checkins)
  const { snapshots, tests, checkins, loading, addAthlete, updateAthlete, deleteAthlete, addTest, deleteTest, updateSnapshot, addCheckin, updateCheckin, getCheckinsForAthlete } = useCloudDataContext();
  
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

  // Tabs valides gérés par cette page
  const validTabs = ["dashboard", "profil", "race-readiness", "seances", "configuration"];
  
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
    const navigationState = location.state as { activeTab?: string } | null;
    if (navigationState?.activeTab && validTabs.includes(navigationState.activeTab)) {
      setActiveTab(navigationState.activeTab);
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
    const refs = (currentAthlete?.refs || {}) as Record<string, any>;
    return (refs.ambition as AmbitionLevel) || DEFAULT_AMBITION;
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
      // ✅ FIX: Passer âge et ambition pour synchroniser avec Compass
      athleteAge: currentAthlete?.birth_date ? calculateAge(currentAthlete.birth_date) : null,
      ambition: currentAmbition,
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

  // ✅ PERSISTANCE AUTOMATIQUE DRE - Hook pour sauvegarder en base
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
              <div className="hidden sm:flex flex-1 min-w-[20px]" />

              {/* Sélecteur ambition compact - visible sur desktop uniquement dans cette ligne */}
              {currentAthlete && (
                <div className="hidden md:block shrink-0">
                  <Select
                    value={currentAmbition}
                    onValueChange={(v) => updateCurrentAthleteAmbition(v as AmbitionLevel)}
                  >
                    <SelectTrigger className="h-9 w-auto min-w-[110px] max-w-[140px] text-sm">
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
        // Sections réorganisables pour le Dashboard
        const dashboardSections = [
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
                onNavigateToProfile={() => {
                  setActiveTab("profil");
                  setShowSnapshots(true);
                }}
                onNavigateToTests={() => setActiveTab("tests")}
                onNavigateToAcademy={() => navigate("/academy")}
                onDismiss={gettingStartedVisibility.hide}
              />
            ),
          },
          {
            id: "athlete-refs",
            render: () => currentAthlete && (
              <AthleteRefsPanel
                athlete={currentAthlete}
                snapshots={snapshots}
                snapshot={effectiveCloudSnapshot}
                athleteGoal={currentAthlete.goal || "IM"}
                onNavigateToProfile={() => {
                  setActiveTab("profil");
                  setShowSnapshots(true);
                }}
                onNavigateToCAPTest={() => navigate("/cap-testing-week")}
                onNavigateToTFCLTest={() => navigate("/tfcl-testing-week")}
                compact
              />
            ),
          },
          {
            id: "disponibilite-tfcl",
            render: () => {
              if (!currentAthlete) return null;
              const athleteCheckins = getCheckinsForAthlete(currentAthlete.id);
              const sortedCheckins = [...athleteCheckins].sort((a, b) => 
                new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime()
              );
              const latestCheckin = sortedCheckins[0] || null;
              const previousCheckin = sortedCheckins[1] || null;
              
              // Données objectives depuis le snapshot
              const objectiveData = effectiveCloudSnapshot ? {
                tss7d: effectiveCloudSnapshot.tss_7d ?? null,
                tssTarget: 350, // Cible par défaut, à ajuster selon profil
              } : undefined;
              
              return (
                <DisponibiliteTFCLCard
                  latestCheckin={latestCheckin}
                  previousCheckin={previousCheckin}
                  objectiveData={objectiveData}
                  showDetails={staffMode}
                  showTrend={true}
                />
              );
            },
          },
          {
            id: "daily-readiness-check",
            render: () => {
              if (!currentAthlete) return null;
              
              const handleReadinessSubmit = async (input: TFCLReadinessInput, result: DisponibiliteTFCLResult) => {
                const today = new Date();
                const weekTag = `${today.getFullYear()}-W${String(Math.ceil((today.getDate() + new Date(today.getFullYear(), 0, 1).getDay()) / 7)).padStart(2, "0")}`;
                const todayISO = today.toISOString().slice(0, 10);
                
                // Vérifier si un check-in existe déjà aujourd'hui
                const athleteCheckins = getCheckinsForAthlete(currentAthlete.id);
                const existingToday = athleteCheckins.find(c => c.date_iso === todayISO);
                
                const checkinData = {
                  sleep: input.sleep,
                  fatigue: input.fatigue,
                  soreness: input.soreness,
                  stress: input.stress,
                  motivation: input.motivation,
                  pain_flag: input.alerts?.joint_pain || input.alerts?.illness || input.alerts?.asymmetric_pain || false,
                  readiness: Math.round(result.score / 10), // Convertir score 0-100 en 0-10
                  notes: `Disponibilité TFCL: ${result.levelLabel} (${result.score}/100) - Confiance: ${result.confidenceLabel}`,
                };
                
                if (existingToday) {
                  await updateCheckin(existingToday.id, checkinData);
                  toast.success("Check-in mis à jour", { description: `Disponibilité: ${result.levelLabel}` });
                } else {
                  await addCheckin({
                    athlete_id: currentAthlete.id,
                    coach_id: "",
                    date_iso: todayISO,
                    week_tag: weekTag,
                    ...checkinData,
                    rpe_key1: null,
                    rpe_key2: null,
                  });
                  toast.success("Check-in enregistré", { description: `Disponibilité: ${result.levelLabel}` });
                }
              };
              
              // Données objectives depuis le snapshot
              const objectiveData = effectiveCloudSnapshot ? {
                tss7d: effectiveCloudSnapshot.tss_7d ?? null,
                tssTarget: 350,
              } : undefined;
              
              return (
                <TFCLDailyReadinessCheck
                  athleteId={currentAthlete.id}
                  athleteName={currentAthlete.name}
                  objectiveData={objectiveData}
                  onSubmit={handleReadinessSubmit}
                  showStaffAlerts={staffMode}
                  compact={false}
                />
              );
            },
          },
          {
            id: "low-crr-justification",
            render: () => currentAthlete && effectiveCloudSnapshot && (
              <LowCRRJustificationCard
                snapshot={effectiveCloudSnapshot}
                threshold={250}
              />
            ),
          },
          {
            id: "ftp-targets",
            render: () => currentAthlete && (
              <FtpKgTargetsCard
                objectif={currentAthlete.goal || "IM"}
                age={calculateAge(currentAthlete.birth_date)}
                currentFtpKg={ftp_kg ?? null}
                vo2max={effectiveCloudSnapshot?.vo2max ?? currentAthlete.vo2max ?? null}
                vlamax={vlamaxEffectif.value}
                weeklyVolume={null}
              />
            ),
          },
          {
            id: "vlamax-v2-calibration",
            render: () => currentAthlete && (
              <div className="space-y-3">
                <VLamaxV2DisplayCard
                  objectif={(
                    (currentAthlete.goal === "IM" ? "Ironman" : currentAthlete.goal) || "Ironman"
                  ) as ObjectifPrincipal}
                  vlamax={vlamaxEffectif.value ?? Number.NaN}
                  vlamaxSource={vlamaxEffectif.source === "test" ? "test_terrain" : "estimation"}
                  vo2max={effectiveCloudSnapshot?.vo2max ?? currentAthlete.vo2max ?? undefined}
                  sex={legacyAthlete?.sexe === "F" ? "F" : "H"}
                  age={calculateAge(currentAthlete.birth_date) ?? undefined}
                />
                {/* Analyse détaillée Vélo - repliée par défaut */}
                {effectiveCloudSnapshot && (
                  <VLamaxExplainedCard
                    vlamaxEffectif={vlamaxEffectif}
                    age={calculateAge(currentAthlete.birth_date)}
                    input={{
                      ftp: effectiveCloudSnapshot.ftp ?? 0,
                      p30s_w: (effectiveCloudSnapshot as unknown as Record<string, unknown>).p30s_w as number | null,
                      p60s_w: (effectiveCloudSnapshot as unknown as Record<string, unknown>).p60s_w as number | null,
                      map5min_w: (effectiveCloudSnapshot as unknown as Record<string, unknown>).map5min_w as number | null,
                      tte_min: effectiveCloudSnapshot.tte_observed_min ?? tteEffectif.tte_min,
                      pmax_5s: effectiveCloudSnapshot.pmax_5s ?? undefined,
                      weight_kg: effectiveCloudSnapshot.weight_kg ?? undefined,
                      protocol_quality: ((effectiveCloudSnapshot as unknown as Record<string, unknown>).protocol_quality as 1 | 2 | 3 | 4 | 5) ?? 3,
                      objectif: currentAthlete.goal || "IM",
                      vo2max: effectiveCloudSnapshot.vo2max ?? currentAthlete.vo2max ?? undefined,
                      sex: legacyAthlete?.sexe === "F" ? "F" : "H",
                    }}
                    ambitionLevel={currentAmbition as "finisher" | "performance" | "podium" | "elite"}
                    defaultCollapsed={true}
                  />
                )}
                {/* Analyse détaillée CAP - pour multi-sport (Marathon, Semi) */}
                {effectiveCloudSnapshot && (currentAthlete.goal === "Marathon" || currentAthlete.goal === "Semi") && (
                  <VLamaxRunExplainedCard
                    vlamax={vlamaxEffectif.value}
                    age={calculateAge(currentAthlete.birth_date)}
                    objectif={currentAthlete.goal || "Marathon"}
                    defaultCollapsed={true}
                  />
                )}
              </div>
            ),
          },
          {
            id: "vlamax-combined",
            render: () => {
              if (!currentAthlete) return null;
              
              const isTriathlon = currentAthlete.goal === "IM" || currentAthlete.goal === "70.3" || currentAthlete.goal === "703";
              const isRunning = currentAthlete.goal === "Marathon" || currentAthlete.goal === "Semi" || currentAthlete.goal === "10km";
              
              // Triathlon: comparaison Vélo vs CAP
              if (isTriathlon) {
                return (
                  <VLamaxCombinedCard
                    vlamaxBike={vlamaxEffectif.value}
                    vlamaxRun={effectiveCloudSnapshot?.vlamax_run ?? null}
                    age={calculateAge(currentAthlete.birth_date)}
                    objectif={currentAthlete.goal === "IM" ? "Ironman" : "70.3"}
                    defaultCollapsed={false}
                  />
                );
              }
              
              // Course à pied: VLamax CAP détaillée, dépliée par défaut
              if (isRunning) {
                return (
                  <VLamaxRunExplainedCard
                    vlamax={vlamaxEffectif.value}
                    age={calculateAge(currentAthlete.birth_date)}
                    objectif={currentAthlete.goal || "Marathon"}
                    defaultCollapsed={false}
                  />
                );
              }
              
              return null;
            },
          },
          // ✅ RUNNING FOCUS MODE SECTIONS — affiché uniquement en mode CAP
          {
            id: "vlamax-cap-card",
            render: () => {
              // Afficher uniquement en Running Focus Mode
              if (!isRunningOnly || !currentAthlete) return null;
              
              return (
                <VLamaxCAPCard
                  athleteId={currentAthlete.id}
                  vlamaxValue={vlamaxEffectif.value}
                  vlamaxSource={vlamaxEffectif.source === "test" ? "test" : vlamaxEffectif.source === "snapshot" ? "snapshot" : "estimation"}
                  vlamaxConfidence={vlamaxEffectif.confidence}
                  vo2max={effectiveCloudSnapshot?.vo2max ?? currentAthlete.vo2max ?? null}
                  economyScore={effectiveCloudSnapshot?.run_economy_score ?? null}
                />
              );
            },
          },
          {
            id: "running-economy-module",
            render: () => {
              // Afficher uniquement en Running Focus Mode
              if (!isRunningOnly || !currentAthlete) return null;
              
              return (
                <RunningEconomyModule
                  athleteId={currentAthlete.id}
                  fcMax={effectiveRefs.fcMax ?? null}
                  fcMoyenneEndurance={effectiveCloudSnapshot?.run_hr_ref_bpm ?? null}
                  allureEndurance={effectiveCloudSnapshot?.run_pace_ref_sec_per_km ?? null}
                  deriveCardiaque={effectiveCloudSnapshot?.run_hr_drift_pct ?? null}
                  tteMin={tteEffectif.tte_min}
                  objectif={currentAthlete.goal || "Marathon"}
                  vlamax={vlamaxEffectif.value}
                  sport="run"
                  staffMode={staffMode}
                />
              );
            },
          },
          {
            id: "vo2max-age-comparison",
            render: () => currentAthlete && (
              <VO2maxAgeComparisonCard
                objectif={currentAthlete.goal || "IM"}
                age={calculateAge(currentAthlete.birth_date)}
                currentVo2max={effectiveCloudSnapshot?.vo2max ?? currentAthlete.vo2max ?? null}
                currentTTE={effectiveCloudSnapshot?.tte_observed_min ?? null}
                ambition={currentAmbition}
              />
            ),
          },
          {
            id: "fatmax-tfcl",
            render: () => currentAthlete && (
              <FatMaxTFCLCard
                vlamaxEffectif={vlamaxEffectif.value}
                vlamaxConfidence={vlamaxEffectif.confidence}
                tteEffectif={tteEffectif.tte_min}
                tteConfidence={tteEffectif.confidence}
                fatigueIndex={null}
                objectif={(currentAthlete.goal === "IM" ? "Ironman" : currentAthlete.goal) || "Ironman"}
                ftp={effectiveRefs.ftp}
              />
            ),
          },
          {
            id: "fatmax-chart",
            render: () => {
              if (!currentAthlete) return null;
              const normalizedObjectif = ((currentAthlete.goal === "IM" ? "Ironman" : currentAthlete.goal) || "Ironman") as FatMaxObjectif;
              const fatmaxResult = computeFatMaxTFCL({
                vlamaxEffectif: vlamaxEffectif.value,
                vlamaxConfidence: vlamaxEffectif.confidence,
                vo2maxEffectif: null,
                tteEffectif: tteEffectif.tte_min,
                tteConfidence: tteEffectif.confidence,
                fatigueIndex: null,
                objectif: normalizedObjectif,
                ftp: effectiveRefs.ftp ?? null,
              });
              if (!fatmaxResult) return null;
              // Intensité course cible selon objectif
              const raceIntensityMap: Record<string, number> = {
                Ironman: 70,
                "70.3": 78,
                Marathon: 82,
                Semi: 86,
                "10km": 92,
              };
              const raceIntensity = raceIntensityMap[normalizedObjectif] ?? 75;
              return (
                <FatMaxRaceIntensityChart
                  fatmax={fatmaxResult}
                  raceIntensityPct={raceIntensity}
                />
              );
            },
          },
          {
            id: "scenarios-tte-vlamax",
            render: () => {
              if (!currentAthlete) return null;
              
              // Générer les scénarios TTE
              const tteSource = tteEffectif.source === 'observed' ? 'observed' : 'estimated';
              const tteScenarios = generateTTEScenarios({
                centralValue: tteEffectif.tte_min,
                confidence: tteEffectif.confidence,
                source: tteSource,
              });
              
              // Générer les scénarios VLamax
              // Source 'test' = test terrain, 'snapshot' = labo potentiellement
              const vlamaxSource = vlamaxEffectif.source === 'test' ? 'test_terrain' : 
                                   vlamaxEffectif.source === 'snapshot' ? 'test_labo' : 'estimation';
              const vlamaxScenarios = generateVLamaxScenarios({
                centralValue: vlamaxEffectif.value ?? 0.5,
                confidence: vlamaxEffectif.confidence,
                source: vlamaxSource,
              });
              
              // Si les deux sont observés, pas besoin d'afficher les scénarios
              if (tteScenarios.isObserved && vlamaxScenarios.isObserved) {
                return null;
              }
              
              return (
                <div className="space-y-4">
                  {!tteScenarios.isObserved && (
                    <TTEScenarioDisplay scenarios={tteScenarios} compact={!staffMode} />
                  )}
                  {!vlamaxScenarios.isObserved && (
                    <VLamaxScenarioDisplay scenarios={vlamaxScenarios} compact={!staffMode} />
                  )}
                </div>
              );
            },
          },
          {
            id: "race-readiness-signature",
            render: () => {
              if (!currentAthlete) return null;
              
              // Récupérer le dernier checkin
              const athleteCheckins = (checkins || []).filter(c => c.athlete_id === currentAthlete.id);
              const sortedCheckins = [...athleteCheckins].sort((a, b) => 
                new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime()
              );
              const checkin = sortedCheckins[0] || null;
              
              // Cibles selon ambition
              const vlamaxTarget = currentAmbition === "elite" ? 0.35 : currentAmbition === "competitor" ? 0.45 : 0.55;
              const vo2maxTarget = currentAmbition === "elite" ? 70 : currentAmbition === "competitor" ? 62 : 55;
              const tteTarget = currentAmbition === "elite" ? 50 : currentAmbition === "competitor" ? 40 : 35;
              
              // Mapper discipline
              const disciplineMap: Record<string, 'IM' | '703' | 'marathon' | 'semi' | '10k' | 'cycling' | 'trail'> = {
                'IM': 'IM',
                '703': '703',
                'Marathon': 'marathon',
                'Semi': 'semi',
              };
              const discipline = disciplineMap[currentAthlete.goal || '703'] || '703';
              
              // Calcul du ratio charge aiguë/chronique
              const tss7d = effectiveCloudSnapshot?.tss_7d ?? null;
              const tss28d = tss7d ? tss7d * 4 : null; // Estimation basée sur la charge 7j
              
              // Construire l'input
              const raceReadinessInput: RaceReadinessInput = {
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
                  subjectiveFatigue: checkin?.fatigue ?? null,
                  sleepQuality: checkin?.sleep ?? null,
                  motivation: checkin?.motivation ?? null,
                  soreness: checkin?.soreness ?? null,
                  stress: checkin?.stress ?? null,
                  hasRedFlags: false,
                },
                discipline,
                ambition: currentAmbition,
                daysToRace: null,
              };
              
              return (
                <RaceReadinessSignatureChart
                  input={raceReadinessInput}
                  compact={!staffMode}
                />
              );
            },
          },
          {
            id: "race-readiness-v2",
            render: () => {
              if (!currentAthlete) return null;
              
              // Récupérer les check-ins et calculer les données
              const athleteCheckins = getCheckinsForAthlete(currentAthlete.id);
              const sortedCheckins = [...athleteCheckins].sort((a, b) => 
                new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime()
              );
              const latestCheckin = sortedCheckins[0] || null;
              
              // Données objectives depuis le snapshot
              const objectiveData = effectiveCloudSnapshot ? {
                tss7d: effectiveCloudSnapshot.tss_7d ?? null,
                tssTarget: 350,
              } : undefined;
              
              // Calculer le Compass si les données sont disponibles
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
              
              return (
                <RaceReadinessV2Module
                  compass={compass}
                  latestCheckin={latestCheckin}
                  objectiveData={objectiveData}
                  guardrails={{
                    fatigueIndex: effectiveCloudSnapshot?.tss_7d ? Math.min(100, (effectiveCloudSnapshot.tss_7d / 7)) : undefined,
                  }}
                  athleteName={currentAthlete.name}
                  objectif={currentAthlete.goal || "IM"}
                  compact={!staffMode}
                  defaultTab="overview"
                />
              );
            },
          },
          {
            id: "dashboard-recommendations",
            render: () => currentAthlete && (
              <DashboardRecommendationsCard
                onNavigateToLibrary={() => setActiveTab("seances")}
                maxSuggestions={4}
              />
            ),
          },
          {
            id: "action-buttons",
            render: () => (
              <>
                {/* Boutons - responsive grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:flex lg:flex-wrap gap-2 sm:gap-3">
                  <Button
                    variant={showPhysioAnalysis ? "default" : "outline"}
                    onClick={() => {
                      setShowPhysioAnalysis(!showPhysioAnalysis);
                      setShowSnapshots(false);
                      setShowCheckins(false);
                    }}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-9 sm:h-10"
                  >
                    <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    <span className="truncate">Analyse</span>
                  </Button>

                  <Button
                    variant={showSnapshots ? "default" : "outline"}
                    onClick={() => {
                      setShowSnapshots(!showSnapshots);
                      setShowPhysioAnalysis(false);
                      setShowCheckins(false);
                    }}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-9 sm:h-10"
                  >
                    <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    <span className="truncate">Profils</span>
                  </Button>

                  <Button
                    variant={showCheckins ? "default" : "outline"}
                    onClick={() => {
                      setShowCheckins(!showCheckins);
                      setShowPhysioAnalysis(false);
                      setShowSnapshots(false);
                    }}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-9 sm:h-10"
                  >
                    <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    <span className="truncate">Check-ins</span>
                  </Button>

                  {/* Bouton Simulation de Course */}
                  <Button
                    variant="outline"
                    onClick={() => navigate('/race-simulation')}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-9 sm:h-10"
                  >
                    <Calculator className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    <span className="truncate">Simulation</span>
                  </Button>

                  {currentAthlete && (
                    <ExportTools 
                      athlete={currentAthlete}
                      snapshots={snapshots}
                      tests={tests}
                      staffMode={staffMode}
                      ambition={currentAmbition}
                    />
                  )}
                </div>

                {/* Contenu conditionnel */}
                {showPhysioAnalysis && <PhysiologicalAnalysis 
                  athlete={legacyAthlete} 
                  vlamaxEffectif={vlamaxEffectif} 
                  tteEffectif={tteEffectif} 
                  readiness={raceReadinessEffectif} 
                  ambition={currentAmbition}
                  athleteAge={currentAthlete?.birth_date ? calculateAge(currentAthlete.birth_date) : null}
                  onGoToSnapshots={() => {
                    setShowSnapshots(true);
                    setShowPhysioAnalysis(false);
                  }} 
                />}
                
                {showSnapshots && currentAthlete && (
                  <SnapshotManager
                    athleteId={currentAthlete.id}
                    athleteName={currentAthlete.name}
                    athleteGoal={currentAthlete.goal || "IM"}
                    activeSnapshotId={currentAthlete.active_snapshot_id}
                    staffMode={staffMode}
                  />
                )}
                {showCheckins && currentAthlete && (
                  <CheckinManager athleteId={currentAthlete.id} athleteName={currentAthlete.name} />
                )}
              </>
            ),
          },
          {
            id: "charge-recente",
            render: () => currentAthlete && staffMode && effectiveCloudSnapshot && (
              <ChargeRecenteCard
                crr={computeCRR({
                  tss7d: effectiveCloudSnapshot.tss_7d ?? null,
                  snapshotDate: effectiveCloudSnapshot.date ?? null,
                  snapshotUpdatedAt: effectiveCloudSnapshot.updated_at ?? null,
                })}
                objectif={currentAthlete.goal || "IM"}
                staffMode={staffMode}
                onUpdate={async (value) => {
                  await updateSnapshot(effectiveCloudSnapshot.id, { tss_7d: value });
                }}
              />
            ),
          },
          {
            id: "athlete-profile-card",
            render: () => currentAthlete && legacyAthlete && (
              <AthleteProfile 
                athlete={legacyAthlete} 
                onUpdate={() => {}} 
                onSaveToCloud={async (data) => {
                  await updateAthlete(currentAthlete.id, { 
                    ...data,
                    sex: data.sex 
                  });
                }}
                onUpdateMasseGrasse={async (val) => {
                  const existingRefs = (currentAthlete.refs as Record<string, unknown>) || {};
                  await updateAthlete(currentAthlete.id, { 
                    refs: { ...existingRefs, fatPct: val } as any
                  });
                }}
                snapshotFatPct={effectiveCloudSnapshot?.fat_pct}
                onOpenSnapshots={() => {
                  setActiveTab("profil");
                  setShowSnapshots(true);
                }}
                vlamaxEffectif={vlamaxEffectif}
                tteEffectif={tteEffectif}
              />
            ),
          },
          {
            id: "compact-metrics-grid",
            render: () => currentAthlete && (
              <CompactMetricsGrid
                vo2max={effectiveCloudSnapshot?.vo2max}
                vlamax={vlamaxEffectif.value}
                ftp={effectiveRefs.ftp}
                weight={effectiveRefs.weightKg}
                tteMin={tteEffectif.tte_min}
                fatmax={effectiveCloudSnapshot?.ftp ? Math.round((effectiveCloudSnapshot.ftp) * 0.65) : null}
                fatPct={effectiveCloudSnapshot?.fat_pct}
                fcMax={effectiveCloudSnapshot?.fc_max}
                vma={effectiveCloudSnapshot?.vma}
                tss7d={effectiveCloudSnapshot?.tss_7d}
                readinessScore={null}
                objectif={currentAthlete.goal === "IM" ? "Ironman Kona" : currentAthlete.goal === "703" ? "Ironman 70.3" : currentAthlete.goal || "Marathon"}
              />
            ),
          },
          {
            id: "tfcl-decision-matrix",
            render: () => {
              if (!currentAthlete) return null;
              
              // Calculer FatMax pour l'input
              const normalizedObjectif = ((currentAthlete.goal === "IM" ? "Ironman" : currentAthlete.goal) || "Ironman") as FatMaxObjectif;
              const fatmaxResult = computeFatMaxTFCL({
                vlamaxEffectif: vlamaxEffectif.value,
                vlamaxConfidence: vlamaxEffectif.confidence,
                vo2maxEffectif: effectiveCloudSnapshot?.vo2max ?? null,
                tteEffectif: tteEffectif.tte_min,
                tteConfidence: tteEffectif.confidence,
                fatigueIndex: null,
                objectif: normalizedObjectif,
                ftp: effectiveRefs.ftp,
              });
              
              // Obtenir le dernier checkin pour la disponibilité
              const athleteCheckins = (checkins || []).filter(c => c.athlete_id === currentAthlete.id);
              const sortedCheckins = [...athleteCheckins].sort((a, b) => 
                new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime()
              );
              const checkin = sortedCheckins[0] || null;
              
              // Calculer disponibilité si on a un checkin
              let disponibiliteScore: number | null = null;
              if (checkin) {
                const dispResult = computeDisponibiliteTFCL({
                  sleep: checkin.sleep,
                  fatigue: checkin.fatigue,
                  soreness: checkin.soreness,
                  stress: checkin.stress,
                  motivation: checkin.motivation,
                  objective: {
                    tss7d: effectiveCloudSnapshot?.tss_7d ?? null,
                  },
                });
                disponibiliteScore = dispResult.score;
              }
              
              return (
                <TFCLDecisionMatrixCard
                  input={{
                    vo2max: { 
                      value: effectiveCloudSnapshot?.vo2max ?? null, 
                      source: effectiveCloudSnapshot?.vo2max ? "snapshot" : "estimation",
                      sourceLabel: effectiveCloudSnapshot?.vo2max ? "Snapshot athlète" : undefined
                    },
                    vlamax: { 
                      value: vlamaxEffectif.value, 
                      source: vlamaxEffectif.source === "snapshot" ? "snapshot" : vlamaxEffectif.source === "estimated" ? "estimation" : "test",
                      sourceLabel: vlamaxEffectif.source === "snapshot" ? "Snapshot athlète" : vlamaxEffectif.source === "estimated" ? "Estimation physiologique" : "Test terrain"
                    },
                    tte: { 
                      value: tteEffectif.tte_min, 
                      source: tteEffectif.source === "observed" ? "test" : tteEffectif.source === "estimated" ? "estimation" : "estimation",
                      sourceLabel: tteEffectif.source === "observed" ? "TTE observé" : "Estimation physiologique"
                    },
                    fatMaxPctVO2: { 
                      value: fatmaxResult?.centerPctFTP ?? null, 
                      source: fatmaxResult ? "calcul" : "estimation",
                      sourceLabel: fatmaxResult ? "Calcul FatMax TFCL" : undefined
                    },
                    fatOxidationMax: { value: null, source: "estimation" },
                    crossoverPctVO2: { value: null, source: "estimation" },
                    freshnessScore: { 
                      value: disponibiliteScore, 
                      source: checkin ? "checkin" : "calcul",
                      sourceLabel: checkin ? "Check-in quotidien" : "Score calculé"
                    },
                    tss7d: { 
                      value: effectiveCloudSnapshot?.tss_7d ?? null, 
                      source: effectiveCloudSnapshot?.tss_7d ? "snapshot" : "estimation",
                      sourceLabel: effectiveCloudSnapshot?.tss_7d ? "Charge TSS 7j" : undefined
                    },
                    tss28d: { value: null, source: "estimation" },
                    subjectiveFatigue: { 
                      value: checkin?.fatigue ?? null, 
                      source: checkin?.fatigue ? "checkin" : "estimation",
                      sourceLabel: checkin?.fatigue ? "Check-in quotidien" : undefined
                    },
                    confidenceScore: Math.round((vlamaxEffectif.confidence + tteEffectif.confidence) / 2 * 100),
                    discipline: currentAthlete.goal === "Marathon" || currentAthlete.goal === "Semi" ? "cap" : "tri",
                    objective: (currentAthlete.goal || "703") as TFCLObjective,
                    ambition: currentAmbition,
                    age: currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null,
                  }}
                  compact={!staffMode}
                />
              );
            },
          },
          {
            id: "tfcl-symptom-matrix",
            render: () => {
              if (!currentAthlete) return null;
              
              // Cibles pour la catégorisation des métriques
              const vlamaxTarget = currentAmbition === "elite" ? 0.35 : currentAmbition === "competitor" ? 0.45 : 0.55;
              const vo2maxTarget = currentAmbition === "elite" ? 70 : currentAmbition === "competitor" ? 62 : 55;
              const tteTarget = currentAmbition === "elite" ? 50 : currentAmbition === "competitor" ? 40 : 35;
              const fatmaxTarget = currentAmbition === "elite" ? 60 : currentAmbition === "competitor" ? 55 : 50;
              
              // Score de fraîcheur depuis le dernier checkin
              const athleteCheckins = (checkins || []).filter(c => c.athlete_id === currentAthlete.id);
              const sortedCheckins = [...athleteCheckins].sort((a, b) => 
                new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime()
              );
              const checkin = sortedCheckins[0] || null;
              
              let freshnessScore: number | null = null;
              if (checkin) {
                const dispResult = computeDisponibiliteTFCL({
                  sleep: checkin.sleep,
                  fatigue: checkin.fatigue,
                  soreness: checkin.soreness,
                  stress: checkin.stress,
                  motivation: checkin.motivation,
                  objective: { tss7d: effectiveCloudSnapshot?.tss_7d ?? null },
                });
                freshnessScore = dispResult.score;
              }
              
              return (
                <TFCLDecisionMatrixTable
                  metrics={{
                    vo2max: effectiveCloudSnapshot?.vo2max ?? null,
                    vo2maxTarget,
                    vlamax: vlamaxEffectif.value,
                    vlamaxTarget,
                    tte: tteEffectif.tte_min,
                    tteTarget,
                    fatmax: null, // Pas de valeur directe FatMax
                    fatmaxTarget,
                    freshness: freshnessScore,
                  }}
                />
              );
            },
          },
          {
            id: "lorang-strategy",
            render: () => {
              if (!currentAthlete) return null;
              
              // Cibles pour la stratégie
              const vlamaxTarget = currentAmbition === "elite" ? 0.35 : currentAmbition === "competitor" ? 0.45 : 0.55;
              const vo2maxTarget = currentAmbition === "elite" ? 70 : currentAmbition === "competitor" ? 62 : 55;
              const tteTarget = currentAmbition === "elite" ? 50 : currentAmbition === "competitor" ? 40 : 35;
              const fatmaxTarget = currentAmbition === "elite" ? 60 : currentAmbition === "competitor" ? 55 : 50;
              
              // Score de disponibilité depuis le dernier checkin
              const athleteCheckins = (checkins || []).filter(c => c.athlete_id === currentAthlete.id);
              const sortedCheckins = [...athleteCheckins].sort((a, b) => 
                new Date(b.date_iso).getTime() - new Date(a.date_iso).getTime()
              );
              const checkin = sortedCheckins[0] || null;
              
              let availabilityScore = 50;
              let availabilityLevel: 'high' | 'moderate' | 'low' | 'critical' = 'moderate';
              let hasAlerts = false;
              let hrvOutOfRange2Days = false;
              
              if (checkin) {
                const dispResult = computeDisponibiliteTFCL({
                  sleep: checkin.sleep,
                  fatigue: checkin.fatigue,
                  soreness: checkin.soreness,
                  stress: checkin.stress,
                  motivation: checkin.motivation,
                  objective: { tss7d: effectiveCloudSnapshot?.tss_7d ?? null },
                });
                availabilityScore = dispResult.score;
                availabilityLevel = dispResult.level;
                hasAlerts = dispResult.hasAlerts;
              }
              
              // Mapper discipline
              const disciplineMap: Record<string, 'IM' | '703' | 'marathon' | 'semi' | '10k' | 'cycling' | 'trail'> = {
                'IM': 'IM',
                '703': '703',
                'Marathon': 'marathon',
                'Semi': 'semi',
              };
              const discipline = disciplineMap[currentAthlete.goal || '703'] || '703';
              
              const lorangInput: LorangStrategyInput = {
                physiology: {
                  vo2max: effectiveCloudSnapshot?.vo2max ?? null,
                  vo2maxTarget,
                  ftpKg: effectiveCloudSnapshot?.ftp && effectiveCloudSnapshot?.weight_kg
                    ? effectiveCloudSnapshot.ftp / effectiveCloudSnapshot.weight_kg
                    : null,
                  ftpKgTarget: null, // Sera calculé automatiquement par le moteur
                  vlamax: vlamaxEffectif.value,
                  vlamaxTarget,
                  tte: tteEffectif.tte_min,
                  tteTarget,
                  fatmax: null,
                  fatmaxTarget,
                  economy: effectiveCloudSnapshot?.run_economy_score ?? null,
                },
                athlete: {
                  age: currentAthlete.birth_date ? calculateAge(currentAthlete.birth_date) : null,
                  discipline,
                  ambition: currentAmbition,
                  hasGIIssues: (effectiveCloudSnapshot as any)?.gi_issues_flag ?? false,
                },
                availability: {
                  score: availabilityScore,
                  level: availabilityLevel,
                  hasAlerts,
                  hrvOutOfRange2Days,
                },
                context: {
                  daysToRace: null,
                  isRaceWeek: false,
                  currentPhase: 'build',
                },
                load: {
                  tss7d: effectiveCloudSnapshot?.tss_7d ?? null,
                  tss28d: null,
                },
              };
              
              return (
                <div className="space-y-4">
                  {/* Graphique Signature TFCL - Limiter → Levier → Décision */}
                  <LorangDecisionFlowChart
                    input={lorangInput}
                    showStaffLevers={staffMode}
                  />
                  
                  {/* Carte détaillée (visible uniquement en mode staff) */}
                  {staffMode && (
                    <LorangStrategyCard
                      input={lorangInput}
                      showStaffLevers={staffMode}
                      compact={false}
                    />
                  )}
                </div>
              );
            },
          },
          {
            id: "compass",
            render: () => currentAthlete && (
              <MetabolicPerformanceCompass
                data={{
                  vlamaxEffectif: vlamaxEffectif,
                  tteEffectif: tteEffectif,
                  ftp: effectiveRefs.ftp,
                  poids: effectiveRefs.weightKg,
                  tss7d: effectiveCloudSnapshot?.tss_7d ?? null,
                  snapshotDate: effectiveCloudSnapshot?.date ?? null,
                  snapshotUpdatedAt: effectiveCloudSnapshot?.updated_at ?? null,
                  objectif: currentAthlete.goal || "IM",
                  ambition: currentAmbition,
                  athleteAge: currentAthlete?.birth_date ? calculateAge(currentAthlete.birth_date) : null,
                }}
                staffMode={staffMode}
              />
            ),
          },
          {
            id: "scientific-charts",
            render: () => currentAthlete && (
              <ScientificChartsDashboard
                vlamaxValue={vlamaxEffectif.value}
                vlamaxSource={vlamaxEffectif.source}
                vlamaxConfidence={vlamaxEffectif.confidence}
                tteValue={tteEffectif.tte_min}
                tteSource={tteEffectif.source}
                tteConfidence={tteEffectif.confidence}
                readinessScore={raceReadinessEffectif.score}
                readinessDetails={{
                  vlamax: raceReadinessEffectif.details?.vlamax ?? 0,
                  endurance: raceReadinessEffectif.details?.endurance ?? 0,
                  puissance: raceReadinessEffectif.details?.puissance ?? 0,
                  fraicheur: raceReadinessEffectif.details?.fraicheur ?? 0,
                }}
                objectif={currentAthlete.goal || "IM"}
                tss7d={effectiveCloudSnapshot?.tss_7d}
                sport="velo"
                initialStaffMode={staffMode}
              />
            ),
          },
          {
            id: "decision-reliability",
            render: () => currentAthlete && staffMode && (
              <DecisionReliabilityCard
                result={decisionReliability}
                onMarkAsReference={async () => {
                  if (!effectiveCloudSnapshot) return;
                  // Utiliser le hook pour marquer ET persister
                  await markAsReferenceWeek(effectiveCloudSnapshot.id);
                  // Recalculer et persister le DRE avec le bonus
                  await persistDRE(effectiveCloudSnapshot);
                }}
                onOpenTests={() => setActiveTab("tests")}
                defaultExpanded={false}
              />
            ),
          },
          {
            id: "ambition-progress",
            render: () => currentAthlete && (
              <AmbitionProgressChart
                snapshots={snapshots.filter(s => s.athlete_id === currentAthlete.id)}
                objectif={currentAthlete.goal || "IM"}
                ambition={currentAmbition}
                weightKg={effectiveRefs.weightKg}
              />
            ),
          },
          {
            id: "staff-dashboard",
            render: () => currentAthlete && legacyAthlete && (
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
          {
            id: "tfcl-analysis",
            render: () => currentAthlete && legacyAthlete && (
              <TwoForCoachingAnalysis 
                athlete={legacyAthlete} 
                vlamaxEffectif={vlamaxEffectif} 
                tteEffectif={tteEffectif} 
                readiness={raceReadinessEffectif} 
                onGoToSnapshots={() => setShowSnapshots(true)} 
              />
            ),
          },
          {
            id: "running-economy-summary",
            render: () => currentAthlete && (
              <RunningEconomySummaryCard
                snapshots={snapshots.filter(s => s.athlete_id === currentAthlete.id)}
                staffMode={staffMode}
              />
            ),
          },
          {
            id: "metabolic-power-curve",
            render: () => currentAthlete && effectiveCloudSnapshot && (
              <MetabolicPowerCurve
                vo2max={effectiveCloudSnapshot.vo2max ?? 55}
                vlamax={vlamaxEffectif.value ?? 0.45}
                weight={effectiveRefs.weightKg ?? 70}
                ftp={effectiveRefs.ftp ?? 250}
                pMax5s={effectiveCloudSnapshot.pmax_5s ?? undefined}
              />
            ),
          },
        ];

        return (
          <div className="space-y-4 sm:space-y-6 md:space-y-8 animate-fade-in">
            {renderAthleteSelector()}
            
            <SortableSectionsContainer
              tabId="dashboard"
              tabLabel="Dashboard"
              sections={dashboardSections}
            />
          </div>
        );

      case "profil":
        // Sections réorganisables pour l'onglet Profil
        const profilSections = [
          {
            id: "athlete-refs",
            render: () => currentAthlete && (
              <AthleteRefsPanel
                athlete={currentAthlete}
                snapshots={snapshots}
              />
            ),
          },
          {
            id: "athlete-profile",
            render: () => (
              <>
                <AthleteProfile 
                  athlete={legacyAthlete} 
                  onUpdate={() => {}} 
                  onSaveToCloud={async (data) => {
                    if (!currentAthlete) return;
                    await updateAthlete(currentAthlete.id, { 
                      ...data,
                      sex: data.sex 
                    });
                  }}
                  onUpdateMasseGrasse={async (val) => {
                    if (!currentAthlete) return;
                    const existingRefs = (currentAthlete.refs as Record<string, unknown>) || {};
                    await updateAthlete(currentAthlete.id, { 
                      refs: { ...existingRefs, fatPct: val } as any
                    });
                  }}
                  snapshotFatPct={effectiveCloudSnapshot?.fat_pct}
                  onOpenSnapshots={() => setShowSnapshots(true)}
                  vlamaxEffectif={vlamaxEffectif}
                  tteEffectif={tteEffectif}
                />
                {showSnapshots && currentAthlete && (
                  <SnapshotManager
                    athleteId={currentAthlete.id}
                    athleteName={currentAthlete.name}
                    athleteGoal={currentAthlete.goal || "IM"}
                    activeSnapshotId={currentAthlete.active_snapshot_id}
                    staffMode={staffMode}
                  />
                )}
              </>
            ),
          },
          {
            id: "two-for-coaching",
            render: () => (
              <TwoForCoachingAnalysis 
                athlete={legacyAthlete} 
                vlamaxEffectif={vlamaxEffectif} 
                tteEffectif={tteEffectif} 
                readiness={raceReadinessEffectif} 
                onGoToSnapshots={() => setShowSnapshots(true)} 
              />
            ),
          },
          {
            id: "evolution-chart",
            render: () => (
              <SnapshotEvolutionChart 
                snapshots={snapshots.filter(s => s.athlete_id === currentAthlete?.id)}
                tests={tests.filter(t => t.athlete_id === currentAthlete?.id)}
                athleteName={legacyAthlete?.nom || ""}
              />
            ),
          },
          {
            id: "training-zones",
            render: () => <TrainingZonesCard staffMode={staffMode} />,
          },
        ];

        return (
          <div className="space-y-6 animate-fade-in">
            {renderAthleteSelector()}
            
            <SortableSectionsContainer
              tabId="profil"
              tabLabel="Profil"
              sections={profilSections}
            />
          </div>
        );

      case "tests":
        // ✅ Rediriger vers le module Tests détaillé (/tests)
        navigate("/tests");
        return null;

      case "nolio":
        return (
          <div className="space-y-6 animate-fade-in">
            <FeedbackNolioManager feedbacks={feedbacksNolio} onFeedbacksChange={handleFeedbacksChange} />
            <NolioMapping />
          </div>
        );

      case "saison-phases":
        return (
          <div className="animate-fade-in">
            {renderAthleteSelector()}
            {legacyAthlete && (
              <div className="mt-6">
                <SaisonPhasesView
                  athleteName={currentAthlete?.name || "Athlète"}
                  objectif={currentAthlete?.goal || "IM"}
                  dateCible={null}
                  vlamaxEffectif={vlamaxEffectif}
                  tteEffectif={tteEffectif}
                  readiness={raceReadinessEffectif}
                  onGoToRaceReadiness={() => setActiveTab("race-readiness")}
                  onGoToPhysioAnalysis={() => {
                    setActiveTab("dashboard");
                    setShowPhysioAnalysis(true);
                  }}
                />
              </div>
            )}
          </div>
        );

      case "race-readiness": {
        // Vérification des données minimales requises
        const hasVlamax = vlamaxEffectif !== null && vlamaxEffectif !== undefined;
        const hasTTE = tteEffectif !== null && tteEffectif !== undefined;
        const hasFTP = ftp !== null && ftp !== undefined && ftp > 0;
        const hasPoids = poids !== null && poids !== undefined && poids > 0;
        const hasObjectif = currentAthlete?.goal !== null && currentAthlete?.goal !== undefined;
        
        const missingData: Array<{ key: string; label: string; description: string; priority: string }> = [];
        if (!hasVlamax) missingData.push({ key: "vlamax", label: "VLamax", description: "Capacité glycolytique maximale", priority: "critique" });
        if (!hasTTE) missingData.push({ key: "tte", label: "TTE", description: "Time To Exhaustion à FTP", priority: "critique" });
        if (!hasFTP) missingData.push({ key: "ftp", label: "FTP", description: "Functional Threshold Power", priority: "important" });
        if (!hasPoids) missingData.push({ key: "poids", label: "Poids", description: "Poids corporel (kg)", priority: "important" });
        if (!hasObjectif) missingData.push({ key: "objectif", label: "Objectif", description: "Distance/format de course cible", priority: "recommandé" });
        
        const hasCriticalData = hasVlamax && hasTTE;
        const completionPercent = Math.round(([hasVlamax, hasTTE, hasFTP, hasPoids, hasObjectif].filter(Boolean).length / 5) * 100);
        
        return (
          <div className="animate-fade-in">
            {renderAthleteSelector()}
            {legacyAthlete ? (
              hasCriticalData ? (
                <div className="mt-6">
                  <RaceReadinessPage
                    athleteName={currentAthlete?.name || "Athlète"}
                    objectif={currentAthlete?.goal || "IM"}
                    snapshotDate={effectiveCloudSnapshot?.date || null}
                    legacyAthlete={legacyAthlete}
                    vlamaxEffectif={vlamaxEffectif}
                    tteEffectif={tteEffectif}
                    readiness={raceReadinessEffectif}
                    nutritionEstimate={nutritionEstimate}
                    runningEconomy={runningEconomyResult}
                    energyDrift={energyDrift}
                    ftp={ftp}
                    poids={poids ?? null}
                    fcMax={effectiveRefs.fcMax ?? null}
                    tss7d={effectiveCloudSnapshot?.tss_7d ?? null}
                    snapshotUpdatedAt={effectiveCloudSnapshot?.updated_at ?? null}
                    athleteAge={currentAthlete?.birth_date ? calculateAge(currentAthlete.birth_date) : null}
                    ambition={currentAmbition}
                    onGoToSnapshots={() => {
                      setShowSnapshots(true);
                      setShowPhysioAnalysis(false);
                      setShowCheckins(false);
                    }}
                    onGoToMethodology={() => setActiveTab("methodology")}
                  />
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  {/* Barre de progression */}
                  <Card className="border-warning/30 bg-warning/5">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <ClipboardCheck className="w-5 h-5 text-warning-foreground" />
                          Profil incomplet pour Race Readiness
                        </CardTitle>
                        <Badge variant="secondary" className="bg-warning/20 text-warning-foreground border-warning/30">
                          {completionPercent}% complété
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="w-full bg-warning/20 rounded-full h-2.5">
                        <div 
                          className="bg-warning h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${completionPercent}%` }}
                        />
                      </div>
                      
                      <p className="text-sm text-muted-foreground">
                        L'analyse Race Readiness nécessite des données physiologiques minimales pour fournir des recommandations fiables.
                      </p>

                      {/* Liste des données manquantes */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-foreground">Données manquantes :</p>
                        <div className="grid gap-2">
                          {missingData.map((item) => (
                            <div 
                              key={item.key}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                item.priority === "critique" 
                                  ? "bg-destructive/10 border-destructive/30" 
                                  : item.priority === "important"
                                  ? "bg-warning/10 border-warning/30"
                                  : "bg-muted/50 border-border"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${
                                  item.priority === "critique" ? "bg-destructive" : 
                                  item.priority === "important" ? "bg-warning" : "bg-muted-foreground"
                                }`} />
                                <div>
                                  <p className="text-sm font-medium">{item.label}</p>
                                  <p className="text-xs text-muted-foreground">{item.description}</p>
                                </div>
                              </div>
                              <Badge 
                                variant={item.priority === "critique" ? "destructive" : "outline"}
                                className="text-xs"
                              >
                                {item.priority}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col sm:flex-row gap-3 pt-2">
                        <Button 
                          onClick={() => {
                            setActiveTab("profil");
                            setShowSnapshots(true);
                          }}
                          className="flex-1"
                        >
                          <Settings2 className="w-4 h-4 mr-2" />
                          Compléter le profil
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => setActiveTab("tests")}
                          className="flex-1"
                        >
                          <Zap className="w-4 h-4 mr-2" />
                          Réaliser des tests
                        </Button>
                      </div>

                      {/* Guide rapide */}
                      <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-xs text-primary">
                          <strong>💡 Guide rapide :</strong> Pour obtenir VLamax et TTE, effectuez un test de puissance critique 
                          (CP test) ou utilisez l'estimateur TFCL dans l'onglet Profil. Un test terrain de 20-40 min suffit 
                          pour les premières estimations.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            ) : (
              <div className="mt-6 flex flex-col items-center justify-center py-16 px-4">
                <div className="text-center max-w-md space-y-4">
                  <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                    <Trophy className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    Aucun athlète sélectionné
                  </h3>
                  <p className="text-muted-foreground">
                    Sélectionnez un athlète avec un profil complet pour afficher son analyse Race Readiness.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab("profil")}
                    className="mt-4"
                  >
                    <Calculator className="w-4 h-4 mr-2" />
                    Créer un profil
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      }



      case "seances":
        return (
          <div className="space-y-6">
            <IndexSeancesView />
          </div>
        );

      case "configuration":
        return <ConfigurationPage />;

      default:
        // Fallback vers le dashboard pour les tabs inconnus
        // On force le retour au dashboard pour éviter les écrans vides
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
    </SidebarLayout>
  );
};

export default Index;
