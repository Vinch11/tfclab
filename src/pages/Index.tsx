import { useState, useEffect, useMemo, useCallback } from "react";
import { Navigation } from "@/components/Navigation";
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
import { ScientificChartsDashboard, MetabolicPerformanceCompass, AmbitionProgressChart } from "@/components/charts";
import { ChargeRecenteCard } from "@/components/ChargeRecenteCard";
import { computeCRR } from "@/lib/chargeRecenteReference";
import { SortableSectionsContainer } from "@/components/SortableSectionsContainer";

// ✅ VLamax TFCL V2 - Calibration avec percentiles
import { VLamaxV2DisplayCard } from "@/components/VLamaxV2DisplayCard";
import { FatMaxTFCLCard } from "@/components/FatMaxTFCLCard";
import { FatMaxRaceIntensityChart } from "@/components/charts/FatMaxRaceIntensityChart";
import { computeFatMaxTFCL, FatMaxObjectif } from "@/lib/v2/fatmaxTFCL";
import { ObjectifPrincipal } from "@/lib/reference";

// ✅ FIX 11 - Effective Refs (source unique de vérité)
import { getEffectiveRefs, computeFtpKg, getMissingFields } from "@/lib/effectiveRefs";

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
  BookOpen,
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
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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

  // ✅ Cloud data pour les données brutes (snapshots, tests)
  const { snapshots, tests, loading, addAthlete, updateAthlete, deleteAthlete, addTest, deleteTest, updateSnapshot } = useCloudDataContext();
  
  // ✅ Utiliser AthleteContext pour la synchronisation avec les composants de recommandation
  const { 
    athletes, 
    currentAthlete: contextCurrentAthlete, 
    selectedAthleteId, 
    setSelectedAthleteId 
  } = useAthletes();

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

  const [activeTab, setActiveTab] = useState(() => {
    // Restaurer l'onglet depuis localStorage au chargement
    const saved = localStorage.getItem("vlab-active-tab");
    return saved || "dashboard";
  });
  
  // Persister l'onglet actif dans localStorage
  useEffect(() => {
    localStorage.setItem("vlab-active-tab", activeTab);
  }, [activeTab]);
  
  const [showTestLibrary, setShowTestLibrary] = useState(false);
  const [showPhysioAnalysis, setShowPhysioAnalysis] = useState(false);
  
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [showCheckins, setShowCheckins] = useState(false);

  // ✅ Mode Staff toggle (affichage expert avec indices de confiance)
  const [staffMode, setStaffMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("vlab-staff-mode");
    return saved === "true";
  });

  useEffect(() => {
    localStorage.setItem("vlab-staff-mode", staffMode.toString());
  }, [staffMode]);

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
      poids: poids ?? undefined, // ✅ FIX 11: null -> undefined pour calculs
      fatigue_ok: true,
      seance_specifique_validee: false,
      fcMax: effectiveRefs.fcMax ?? null,
      // ✅ FIX: Passer la dérive cardiaque depuis le snapshot
      deriveCardiaque: effectiveCloudSnapshot?.run_hr_drift_pct ?? null,
    });
  }, [currentAthlete, vlamaxEffectif, tteEffectif, ftp, poids, effectiveRefs, effectiveCloudSnapshot]);

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
      <CardHeader className="pb-2 sm:pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
            Athlète
          </CardTitle>
          <div className="flex items-center gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 text-xs sm:text-sm">
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1" />
                  Ajouter
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[90vw] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base sm:text-lg">Nouvel athlète</DialogTitle>
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
                      Utilisée pour ajuster les cibles physiologiques
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
                  <Button onClick={handleAddAthlete} className="w-full">
                    Créer l'athlète
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {athletes.length > 0 && (
              <Button size="sm" variant="ghost" onClick={handleDeleteAthlete} className="h-8 w-8 p-0">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {athletes.length === 0 ? (
          <p className="text-muted-foreground text-xs sm:text-sm">Aucun athlète. Cliquez sur Ajouter pour commencer.</p>
        ) : (
          <div className="space-y-2">
            <Select value={selectedAthleteId || ""} onValueChange={setSelectedAthleteId}>
              <SelectTrigger className="h-9 sm:h-10 text-sm">
                <SelectValue placeholder="Sélectionner un athlète" />
              </SelectTrigger>
              <SelectContent>
                {athletes.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nom} ({a.objectif || "IM"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Affichage âge + AAI */}
            {currentAthlete && (
              <AgeAdjustmentBadge birthDate={currentAthlete.birth_date} variant="inline" />
            )}

            {/* Ambition (visible sur mobile) */}
            {currentAthlete && (
              <div className="rounded-xl border bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Ambition</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {getAmbitionDefinition(currentAmbition).icon} {getAmbitionDefinition(currentAmbition).shortLabel}
                  </Badge>
                </div>

                <Select
                  value={currentAmbition}
                  onValueChange={(v) => updateCurrentAthleteAmbition(v as AmbitionLevel)}
                >
                  <SelectTrigger className="mt-2 h-10">
                    <SelectValue placeholder="Choisir un niveau" />
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

                <p className="text-xs text-muted-foreground mt-2">
                  Les cibles VLamax, TTE et FTP/kg ainsi que les recommandations s'ajustent selon ce niveau.
                </p>
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
            id: "athlete-refs",
            render: () => currentAthlete && (
              <AthleteRefsPanel
                athlete={currentAthlete}
                snapshots={snapshots}
                compact
              />
            ),
          },
          {
            id: "quick-fatigue",
            render: () => currentAthlete && (
              <QuickFatigueInput
                athleteId={currentAthlete.id}
                athleteName={currentAthlete.name}
              />
            ),
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
                    variant={showTestLibrary ? "default" : "outline"}
                    onClick={() => {
                      setShowTestLibrary(!showTestLibrary);
                      setShowPhysioAnalysis(false);
                      setShowSnapshots(false);
                      setShowCheckins(false);
                    }}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-9 sm:h-10"
                  >
                    <BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    <span className="truncate">Tests</span>
                  </Button>

                  <Button
                    variant={showPhysioAnalysis ? "default" : "outline"}
                    onClick={() => {
                      setShowPhysioAnalysis(!showPhysioAnalysis);
                      setShowTestLibrary(false);
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
                      setShowTestLibrary(false);
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
                      setShowTestLibrary(false);
                      setShowPhysioAnalysis(false);
                      setShowSnapshots(false);
                    }}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm h-9 sm:h-10"
                  >
                    <ClipboardCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                    <span className="truncate">Check-ins</span>
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
                {showTestLibrary && <TestProtocols athlete={legacyAthlete} />}
                {showPhysioAnalysis && <PhysiologicalAnalysis athlete={legacyAthlete} vlamaxEffectif={vlamaxEffectif} tteEffectif={tteEffectif} readiness={raceReadinessEffectif} onGoToSnapshots={() => {
                  setShowSnapshots(true);
                  setShowPhysioAnalysis(false);
                }} />}
                
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
            render: () => currentAthlete && (
              <StaffDashboard
                athleteName={currentAthlete.name}
                objectif={currentAthlete.goal || "IM"}
                vlamaxEffectif={vlamaxEffectif}
                tteEffectif={tteEffectif}
                raceReadiness={raceReadinessEffectif}
                nutritionEstimate={nutritionEstimate}
                ftpKg={ftp_kg}
                snapshotDate={effectiveCloudSnapshot?.date ?? null}
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
        return (
          <div className="space-y-6 animate-fade-in">
            {renderAthleteSelector()}
            <VLamaxTestingPage 
              athlete={legacyAthlete} 
              cloudTests={tests.filter(t => t.athlete_id === currentAthlete?.id)}
              onAddTest={addTest}
              onDeleteTest={deleteTest}
            />
            <TestComparison athlete={legacyAthlete} />
            <TestProtocols athlete={legacyAthlete} />
          </div>
        );

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

      case "race-readiness":
        return (
          <div className="animate-fade-in">
            {renderAthleteSelector()}
            {legacyAthlete && (
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
                  onGoToSnapshots={() => {
                    setShowSnapshots(true);
                    setShowTestLibrary(false);
                    setShowPhysioAnalysis(false);
                    setShowCheckins(false);
                  }}
                  onGoToMethodology={() => setActiveTab("methodology")}
                />
              </div>
            )}
          </div>
        );



      case "seances":
        return (
          <div className="space-y-6">
            <IndexSeancesView />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Header user + Mode Staff toggle */}
      <div className="container mx-auto px-4 pt-4">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="text-sm text-muted-foreground">Connecté: {user?.email}</div>
          <div className="flex items-center gap-4">
            {/* Mode Staff Toggle */}
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="staff-mode" className="text-sm font-medium cursor-pointer">
                Mode Staff
              </Label>
              <Switch
                id="staff-mode"
                checked={staffMode}
                onCheckedChange={setStaffMode}
              />
            </div>
            <Button variant="ghost" size="sm" onClick={async () => signOut()}>
              <LogOut className="h-4 w-4 mr-2" />
              Déconnexion
            </Button>
          </div>
        </div>
        {staffMode && (
          <div className="mt-2 text-xs text-success bg-success/10 px-3 py-1 rounded-full inline-flex items-center gap-1">
            <span>🟢</span> Affichage Expert — Indices de confiance visibles
          </div>
        )}
      </div>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 lg:py-10 relative max-w-7xl">
        {renderContent()}
      </main>

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
    </div>
  );
};

export default Index;
