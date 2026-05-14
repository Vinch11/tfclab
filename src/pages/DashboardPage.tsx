import { fatigueStateToScoreOrDefault } from "@/lib/fatigueStateMapping";
import { computePotentielEffectif, type PotentielPhysiologiqueEffectif, getScoreColor, getPotentielTargets, getTargets, getWeightsBySport, generateAthleteReadiness, computePillarCalculations, type PotentielInput, type PotentielResult, computePotentielSignature } from "@/lib/potentielPhysiologiqueEffectif";
import { mapSnapshotToV2 } from "@/lib/mapSnapshotToV2";
// =============================================
// DASHBOARD STAFF - Two For Coaching Lab
// Tour de contrôle décisionnelle - Lisible en < 10 secondes
// Running Focus Mode™ Integration
// =============================================

import { useState, useMemo, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SortableSectionsContainer } from "@/components/SortableSectionsContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Zap, 
  Target, 
  Activity,
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Utensils,
  TrendingUp,
  Plus,
  Info,
  ChevronDown,
  ChevronUp,
  Star
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { useRunningFocusMode } from "@/hooks/useRunningFocusMode";
import { RunningFocusModeIndicator } from "@/components/RunningFocusModeIndicator";
import { RunningFocusWrapper } from "@/components/RunningFocusWrapper";

// Sources uniques de données
import { computeVLamaxEffectif, type VLamaxEffectif, getSourceColor, computeTTEEffectif, type TTEEffectif, getTTETarget, getSourceLabel, computeFatigueEffectif, type FatigueEffectif } from "@/engines/diagnostic";
import { getConfidenceLabel } from "@/lib/confidenceDisplay";
import { getVlamaxStatusWithLabel } from "@/lib/physiologicalTargets";
import { computeNutritionEstimate, type NutritionEstimate } from "@/lib/nutritionPredictive";

// Composants cibles et fatigue
import { FtpKgTargetsCard } from "@/components/FtpKgTargetsCard";
import { VLamaxTargetsCard } from "@/components/VLamaxTargetsCard";
import { FatigueCard } from "@/components/FatigueCard";
import { RunInjuryRiskCard } from "@/components/RunInjuryRiskCard";
import { InjuryRiskCAPCard } from "@/components/InjuryRiskCAPCard";
import { InjuryRiskBikeCard } from "@/components/InjuryRiskBikeCard";
import { QuickFatigueInput } from "@/components/QuickFatigueInput";
import { FatigueComparisonChart } from "@/components/FatigueComparisonChart";
import { computeRunInjuryRisk, RunInjuryRiskEnvelope } from "@/lib/runInjuryRisk";
import { computeCAPInjuryRisk, computeBikeInjuryRisk, type InjuryRiskEnvelope } from "@/lib/v2/injuryRiskUnified";
import { computeIFSC } from "@/lib/v2/ifsc";
import { AmbitionLevel, DEFAULT_AMBITION, getAthleteAmbition } from "@/types/ambitionLevel";
import { QuickAmbitionSelector } from "@/components/QuickAmbitionSelector";
import { AmbitionTargetsCard } from "@/components/AmbitionTargetsCard";

// Calibration TFCL V2
import { VLamaxV2DisplayCard } from "@/components/VLamaxV2DisplayCard";
import { VLamaxBikeV2EnhancedCard } from "@/components/VLamaxBikeV2EnhancedCard";
import { FatMaxTFCLCard } from "@/components/FatMaxTFCLCard";
import { CPWPrimeCurveCard } from "@/components/CPWPrimeCurveCard";
import { FatMaxRaceIntensityChart } from "@/components/charts/FatMaxRaceIntensityChart";
import { computeFatMaxTFCL, FatMaxObjectif } from "@/lib/v2/fatmaxTFCL";
import { ObjectifPrincipal } from "@/lib/reference";

// Système de transparence scientifique
import { DataQualityBlock, calculateDataQualityStats } from "@/components/DataQualityBlock";
import type { ScoreSource } from "@/lib/scoreEnvelope";

// Système de plages de performance réalistes
import { 
  computeFtpKgRange, 
  computeTTERange, 
  computeVLamaxRange,
  type PerformanceRangeContext 
} from "@/lib/performanceRanges";
import { PerformanceRangeDisplay } from "@/components/PerformanceRangeDisplay";
import { resolveBadgeSport } from "@/lib/sportMainDeduction";
import { VLamaxProfileScale } from "@/components/VLamaxProfileScale";

// =============================================
// HELPERS
// =============================================

const OBJECTIF_LABELS: Record<string, string> = {
  IM: "Ironman",
  Ironman: "Ironman",
  "703": "70.3 / Half Ironman",
  Half: "70.3 / Half Ironman",
  Marathon: "Marathon",
  Semi: "Semi-Marathon",
  Course: "Course à pied",
  Trail: "Trail",
  TrailCourt: "Trail Court",
  TrailLong: "Trail Long / Ultra",
  Ultra: "Ultra",
  Sprint: "Sprint",
  Olympic: "Olympique",
};

const PHASE_LABELS: Record<string, string> = {
  base: "Développement aérobie",
  build: "Consolidation métabolique",
  peak: "Spécifique",
  race: "Affûtage",
  recovery: "Récupération",
};

function getPhaseFromObjectif(objectif: string): string {
  // Simplified - in real app would come from planning module
  return "build"; 
}

function generateCoachSummary(
  vlamax: VLamaxEffectif,
  tte: TTEEffectif,
  readiness: PotentielPhysiologiqueEffectif,
  objectif: string
): string {
  const parts: string[] = [];
  
  // Analyse VLamax
  if (vlamax.value !== null) {
    if (vlamax.value > 0.50) {
      parts.push("Le profil métabolique reste orienté glycogène → vigilance nutritionnelle recommandée.");
    } else if (vlamax.value < 0.35) {
      parts.push("Excellent profil métabolique pour l'endurance.");
    } else {
      parts.push("Profil métabolique équilibré.");
    }
  }
  
  // Analyse TTE
  const tteTarget = getTTETarget(objectif);
  if (tte.tte_min < tteTarget - 5) {
    parts.push("Endurance spécifique au seuil encore limitante.");
  } else if (tte.tte_min >= tteTarget) {
    parts.push("Endurance spécifique validée.");
  }
  
  // Synthèse
  if (readiness.score >= 80) {
    return "Athlète globalement prêt. " + parts.join(" ");
  } else if (readiness.score >= 60) {
    return "Athlète en progression, mais " + parts.join(" ").toLowerCase();
  } else {
    return "Préparation à consolider. " + parts.join(" ");
  }
}

function getStatusIcon(status: "ok" | "warning" | "critical") {
  switch (status) {
    case "ok": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "warning": return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case "critical": return <XCircle className="h-4 w-4 text-red-500" />;
  }
}

function getStatusBadge(status: "ok" | "warning" | "critical", label: string) {
  const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    ok: "default",
    warning: "secondary",
    critical: "destructive",
  };
  return <Badge variant={variants[status]}>{label}</Badge>;
}

// VLamax status now uses centralized targets from physiologicalTargets.ts
// See getVlamaxStatusWithLabel imported below

function getTTEStatus(value: number, target: number): { status: "ok" | "warning" | "critical"; label: string } {
  const ratio = value / target;
  if (ratio >= 1) return { status: "ok", label: "OK" };
  if (ratio >= 0.85) return { status: "warning", label: "Insuffisant" };
  return { status: "critical", label: "Critique" };
}

function getPotentielStatus(score: number): { status: "ok" | "warning" | "critical"; label: string } {
  if (score >= 80) return { status: "ok", label: "Race Ready!" };
  if (score >= 60) return { status: "warning", label: "En progression" };
  return { status: "critical", label: "Non prêt" };
}

// =============================================
// MAIN COMPONENT
// =============================================

export default function DashboardPage() {
  const navigate = useNavigate();
  const { currentAthlete, updateAthlete } = useAthletes();
  const { snapshots, tests, checkins } = useCloudDataContext();
  const { isRunningOnly, raceLabel } = useRunningFocusMode();
  const [showScientificDetails, setShowScientificDetails] = useState(false);

  // =============================================
  // CALCUL DES DONNÉES EFFECTIVES
  // =============================================
  
  const dashboardData = useMemo(() => {
    if (!currentAthlete) return null;

    const athleteId = currentAthlete.id;
    const objectif = currentAthlete.objectif || "IM";
    const activeSnapshotId = currentAthlete.active_snapshot_id;
    
    // Récupérer le snapshot actif
    const athleteSnapshots = snapshots.filter(s => s.athlete_id === athleteId);
    let activeSnapshot = athleteSnapshots.find(s => s.id === activeSnapshotId);
    if (!activeSnapshot && athleteSnapshots.length > 0) {
      activeSnapshot = [...athleteSnapshots].sort((a, b) => b.date.localeCompare(a.date))[0];
    }
    
    if (!activeSnapshot) return null;
    
    // VLamax Effectif (source unique)
    const vlamaxEffectif = computeVLamaxEffectif({
      athleteId,
      objectif,
      activeSnapshotId: activeSnapshot.id,
      tests: tests.map(t => ({
        athlete_id: t.athlete_id,
        vlamax: t.vlamax,
        date: t.date,
        type: t.type,
        name: t.name,
      })),
      snapshots: athleteSnapshots.map(mapSnapshotToV2),
    });
    
    // TTE Effectif (source unique)
    const tteEffectif = computeTTEEffectif({
      ftp: activeSnapshot.ftp,
      tss_7d: activeSnapshot.tss_7d,
      tte_mode: activeSnapshot.tte_mode,
      tte_observed_min: activeSnapshot.tte_observed_min,
      objectif,
    });
    
    // Potentiel Physiologique Effectif (source unique)
    // Calculer l'âge
    const athleteAge = currentAthlete.birth_date ? (() => {
      const birthDate = new Date(currentAthlete.birth_date);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    })() : null;
    
    // Nutrition Prédictive
    const nutritionEstimate = computeNutritionEstimate({
      vlamax: vlamaxEffectif.value,
      objectif,
      tteMin: tteEffectif.tte_min,
      tteTarget: getTTETarget(objectif),
      
    });
    
    // FTP/kg
    const ftpKg = activeSnapshot.ftp && activeSnapshot.weight_kg && activeSnapshot.weight_kg > 0
      ? activeSnapshot.ftp / activeSnapshot.weight_kg
      : null;
    
    // athleteAge déjà calculé plus haut pour Potentiel Physiologique
    
    const fatiguePercueFromSnapshot = fatigueStateToScoreOrDefault(activeSnapshot.fatigue_state);
    
    // Fatigue Effectif (source unique - combine objectif + subjectif)
    const fatigueEffectif = computeFatigueEffectif({
      tss7d: activeSnapshot.tss_7d,
      tss7dHabituel: null,
      fatiguePercue: fatiguePercueFromSnapshot,
      tteEffectif,
      potentielPhysiologique,
      vlamaxEffectif,
      age: athleteAge,
      objectif,
    });
    
    // Run Injury Risk (risque blessure CAP) - Legacy
    const runInjuryRisk = computeRunInjuryRisk({
      fatigueEffectif,
      vlamaxEffectif,
      tteEffectif,
      tss7d: activeSnapshot.tss_7d ?? null,
      runLoad7d: null, // Pas encore disponible
      age: athleteAge,
      objectif,
    });
    
    // NEW: Injury Risk Unified (CAP)
    const capInjuryRisk = computeCAPInjuryRisk({
      vlamaxValue: vlamaxEffectif.value,
      economyLevel: activeSnapshot.run_economy_label ?? null,
      tteMin: tteEffectif.tte_min,
      fatiguePct: fatigueEffectif.score,
      tss7d: activeSnapshot.tss_7d ?? null,
      runLoad7d: null,
      age: athleteAge,
      objectif,
    });
    
    // NEW: Compute IFSC for bike injury risk
    const ifscResult = computeIFSC({
      ftp: activeSnapshot.ftp ?? null,
      weightKg: activeSnapshot.weight_kg ?? null,
      tteMin: tteEffectif.tte_min,
      tteSource: tteEffectif.source,
      vlamax: vlamaxEffectif.value,
      vlamaxConfidence: vlamaxEffectif.confidence,
      spontaneousCadenceRpm: (activeSnapshot as any).bike_cadence_rpm ?? null,
      objectif,
      age: athleteAge,
    });
    
    // NEW: Injury Risk Unified (Vélo)
    const bikeInjuryRisk = computeBikeInjuryRisk({
      vlamaxValue: vlamaxEffectif.value,
      ifscScore: ifscResult.score,
      tteMin: tteEffectif.tte_min,
      fatiguePct: fatigueEffectif.score,
      tss7d: activeSnapshot.tss_7d ?? null,
      longRideDurationMin: null, // Pas encore disponible
      age: athleteAge,
      objectif,
    });
    
    // Générer le résumé coach
    const coachSummary = generateCoachSummary(vlamaxEffectif, tteEffectif, potentielPhysiologique, objectif);
    
    // Phase actuelle
    const phase = getPhaseFromObjectif(objectif);
    
    // Priorités d'entraînement
    const priorities: string[] = [];
    const tteTarget = getTTETarget(objectif);
    
    if (tteEffectif.tte_min < tteTarget) {
      priorities.push("Allonger le TTE (priorité principale)");
    }
    if (vlamaxEffectif.value !== null && vlamaxEffectif.value > 0.45) {
      priorities.push("Réduire progressivement le VLamax");
    }
    if (nutritionEstimate && nutritionEstimate.riskLevel !== "low") {
      priorities.push("Sécuriser la nutrition à l'effort");
    }
    // Ajouter recommandations fatigue si élevée
    if (fatigueEffectif.score >= 45) {
      priorities.unshift("⚠️ Fatigue élevée : prioriser la récupération");
    }
    if (priorities.length === 0) {
      priorities.push("Maintenir le profil actuel");
      priorities.push("Affiner la stratégie de course");
    }
    
    // Filtrer tests pour cet athlète
    const athleteTests = tests.filter(t => t.athlete_id === athleteId);
    
    // Calculer les statistiques de qualité des données
    // Map les sources des différentes métriques vers ScoreSource
    const mapToScoreSource = (source: string): ScoreSource => {
      switch (source) {
        case "snapshot": return "MEASURED";
        case "test": return "ESTIMATED";
        case "estimated": return "MODELLED";
        case "observed": return "MEASURED";
        case "chrono": return "MEASURED";
        case "tss": return "ESTIMATED";
        case "default": return "MODELLED";
        default: return "UNKNOWN";
      }
    };
    
    const dataSources: (ScoreSource | undefined)[] = [
      mapToScoreSource(vlamaxEffectif.source),
      mapToScoreSource(tteEffectif.source),
      // FTP/kg depuis snapshot = mesuré si présent
      activeSnapshot.ftp ? "MEASURED" as ScoreSource : undefined,
      // VO2max depuis snapshot
      activeSnapshot.vo2max ? "MEASURED" as ScoreSource : undefined,
      // Fatigue = toujours modélisée (composite)
      "MODELLED" as ScoreSource,
    ].filter(Boolean);
    
    const dataQualityStats = calculateDataQualityStats(dataSources);
    
    // Calculer les plages de performance réalistes
    const rangeContext: PerformanceRangeContext = {
      age: athleteAge,
      discipline: objectif,
      vlamaxEffectif: vlamaxEffectif.value,
      vo2max: activeSnapshot.vo2max,
      weeklyVolume: null,
      currentValue: ftpKg,
    };
    
    const ftpKgRange = computeFtpKgRange(rangeContext);
    const tteRange = computeTTERange({ ...rangeContext, currentValue: tteEffectif.tte_min });
    const vlamaxRange = computeVLamaxRange({ ...rangeContext, currentValue: vlamaxEffectif.value });
    
    return {
      vlamaxEffectif,
      tteEffectif,
      potentielPhysiologique,
      nutritionEstimate,
      fatigueEffectif,
      runInjuryRisk,
      capInjuryRisk,
      bikeInjuryRisk,
      ifscResult,
      ftpKg,
      athleteAge,
      snapshot: activeSnapshot,
      athleteSnapshots,
      athleteTests,
      coachSummary,
      phase,
      priorities,
      tteTarget,
      dataQualityStats,
      // Nouvelles plages de performance
      ftpKgRange,
      tteRange,
      vlamaxRange,
    };
  }, [currentAthlete, snapshots, tests, checkins]);

  // =============================================
  // RENDER: NO ATHLETE SELECTED
  // =============================================
  
  if (!currentAthlete) {
    return (
      <AppLayout title="Dashboard">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Sélectionnez un athlète</p>
            <Button onClick={() => navigate("/")} className="mt-4">
              Voir les athlètes
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  // =============================================
  // RENDER: NO DATA
  // =============================================
  
  if (!dashboardData) {
    return (
      <AppLayout title="Dashboard">
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Aucune donnée pour {currentAthlete.nom}. Ajoutez un snapshot.
            </p>
            <Button onClick={() => navigate("/snapshot")} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter des données
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const { 
    vlamaxEffectif, 
    tteEffectif, 
    potentielPhysiologique, 
    nutritionEstimate,
    fatigueEffectif,
    runInjuryRisk,
    capInjuryRisk,
    bikeInjuryRisk,
    ifscResult,
    ftpKg,
    athleteAge,
    snapshot,
    athleteSnapshots,
    athleteTests,
    coachSummary,
    phase,
    dataQualityStats,
    priorities,
    tteTarget,
    ftpKgRange,
    tteRange,
    vlamaxRange,
  } = dashboardData;

  const objectif = currentAthlete.objectif || "IM";
  const ambition = getAthleteAmbition(currentAthlete);
  // Sport pour offset VLamax CAP — résolveur central (snapshot.sport_main → goal)
  const sportForVlamaxBadge = resolveBadgeSport(snapshot, { goal: objectif });
  const vlamaxStatus = getVlamaxStatusWithLabel(vlamaxEffectif.value, objectif, ambition, sportForVlamaxBadge ?? undefined);
  const tteStatus = getTTEStatus(tteEffectif.tte_min, tteTarget);
  const readinessStatus = getPotentielStatus(potentielPhysiologique.score);

  // =============================================
  // RENDER: MAIN DASHBOARD
  // =============================================
  
  // =============================================
  // SECTIONS RENDER FUNCTIONS
  // =============================================

  // Handler pour modifier l'ambition depuis le dashboard
  const handleAmbitionChange = async (newAmbition: AmbitionLevel): Promise<boolean> => {
    if (!currentAthlete) return false;
    const updatedAthlete = {
      ...currentAthlete,
      ambition: newAmbition,
      refs: {
        ...((currentAthlete.refs as Record<string, unknown>) || {}),
        ambition: newAmbition,
      },
    };
    const success = await updateAthlete(updatedAthlete);
    return success;
  };


  const renderAthleteContext = (): ReactNode => (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* Ligne 1: Nom et objectif */}
        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold mb-1.5 sm:mb-2 truncate">{currentAthlete.nom}</h1>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-sm">
              <Badge variant="outline" className="gap-1 text-[11px] sm:text-xs">
                <Target className="h-3 w-3 shrink-0" />
                {OBJECTIF_LABELS[objectif] || objectif}
              </Badge>
              <Badge variant="secondary" className="gap-1 text-[11px] sm:text-xs">
                <Activity className="h-3 w-3 shrink-0" />
                {PHASE_LABELS[phase] || phase}
              </Badge>
            </div>
          </div>
          {/* Desktop: Sélecteur d'ambition en haut à droite */}
          <div className="hidden sm:flex flex-col items-end gap-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Ambition</span>
            <QuickAmbitionSelector
              currentAmbition={getAthleteAmbition(currentAthlete)}
              onAmbitionChange={handleAmbitionChange}
              objectif={objectif}
              sexe={currentAthlete.sexe === "F" ? "F" : "M"}
            />
          </div>
        </div>
        
        {/* Mobile: Sélecteur d'ambition en pleine largeur */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Niveau d'ambition</span>
            </div>
            <QuickAmbitionSelector
              currentAmbition={getAthleteAmbition(currentAthlete)}
              onAmbitionChange={handleAmbitionChange}
              objectif={objectif}
              sexe={currentAthlete.sexe === "F" ? "F" : "M"}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderCoachSummary = (): ReactNode => (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Info className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Lecture rapide coach
            </p>
            <p className="text-sm leading-relaxed">
              {coachSummary}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderPiliers = (): ReactNode => (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
        Piliers Physiologiques
      </h2>

      {/* PILIER 1: VLamax Effectif */}
      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <span className="font-semibold">VLamax effectif</span>
            </div>
            {getStatusBadge(vlamaxStatus.status, vlamaxStatus.label)}
          </div>
          
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono">
              {vlamaxEffectif.value !== null ? vlamaxEffectif.value.toFixed(2) : "—"}
            </span>
            <span className="text-xs sm:text-sm text-muted-foreground">mmol/L/s</span>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Source:</span>
              <span className={getSourceColor(vlamaxEffectif.source)}>
                {vlamaxEffectif.label}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Confiance:</span>
              <div className="flex items-center gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star 
                    key={i} 
                    className={cn(
                      "h-3 w-3",
                      i <= Math.round(vlamaxEffectif.confidence * 5) 
                        ? "text-amber-500 fill-amber-500" 
                        : "text-muted-foreground/30"
                    )} 
                  />
                ))}
              </div>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Interprétation : </span>
              {vlamaxEffectif.value !== null && vlamaxEffectif.value > 0.50
                ? "Un VLamax élevé indique une forte dépendance aux glucides. Pour cet objectif, cela augmente le risque d'épuisement glycogénique."
                : vlamaxEffectif.value !== null && vlamaxEffectif.value < 0.35
                ? "Un VLamax bas favorise l'utilisation des lipides, excellent pour l'endurance longue distance."
                : "VLamax dans une zone équilibrée pour l'objectif."}
            </p>
            <p className="text-primary font-medium">
              <span className="font-medium">Action : </span>
              {vlamaxEffectif.value !== null && vlamaxEffectif.value > 0.45
                ? "Prioriser endurance fondamentale et force endurance pour réduire progressivement le VLamax."
                : "Maintenir le profil actuel."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* PILIER 1bis: VLamax TFCL V2 - Calibration avec percentiles */}
      <VLamaxV2DisplayCard
        objectif={(objectif === "IM" ? "Ironman" : objectif) as ObjectifPrincipal}
        vlamax={vlamaxEffectif.value ?? Number.NaN}
        vlamaxSource={vlamaxEffectif.source === "test" ? "test_terrain" : "estimation"}
        vo2max={snapshot.vo2max ?? undefined}
        sex={currentAthlete.sexe === "F" ? "F" : "H"}
        age={athleteAge ?? undefined}
        ambition={ambition}
        sport={sportForVlamaxBadge ?? undefined}
      />

      {/* PILIER 2: TTE Effectif */}
      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="font-semibold">TTE effectif</span>
            </div>
            {getStatusBadge(tteStatus.status, tteStatus.label)}
          </div>
          
          <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-2xl sm:text-3xl font-bold font-mono">{tteEffectif.tte_min}</span>
            <span className="text-xs sm:text-sm text-muted-foreground">min</span>
            <span className="text-xs sm:text-sm text-muted-foreground ml-1 sm:ml-2">
              (cible: {tteTarget} min)
            </span>
          </div>
          
          <Progress 
            value={Math.min(100, (tteEffectif.tte_min / tteTarget) * 100)} 
            className="h-2" 
          />
          
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-xs">
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Source:</span>
              <span className={tteEffectif.source === "observed" ? "text-green-600" : "text-amber-600"}>
                {getSourceLabel(tteEffectif.source)}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Confiance:</span>
              <span>{getConfidenceLabel(tteEffectif.confidence)}</span>
            </div>
          </div>
          
          <Separator />
          
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Interprétation : </span>
              {tteEffectif.tte_min < tteTarget
                ? "TTE actuellement insuffisant pour soutenir l'allure cible sans dérive physiologique."
                : "TTE suffisant pour maintenir l'intensité cible sur la durée de l'épreuve."}
            </p>
            <p className="text-primary font-medium">
              <span className="font-medium">Action : </span>
              {tteEffectif.tte_min < tteTarget
                ? "Allonger les blocs continus à intensité stable et consolider l'endurance spécifique."
                : "Maintenir la charge d'endurance actuelle."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* PILIER 3: Potentiel Physiologique */}
      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              <span className="font-semibold">Potentiel Physiologique</span>
            </div>
            {!potentielPhysiologique.isInsufficient && getStatusBadge(readinessStatus.status, readinessStatus.label)}
          </div>
          
          {potentielPhysiologique.isInsufficient ? (
            <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
              <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm text-center">Données insuffisantes</p>
              <p className="text-xs mt-1">Renseignez VLamax, FTP et/ou TTE pour obtenir un score</p>
            </div>
          ) : (
            <>
              <div className="flex items-baseline gap-1.5 sm:gap-2">
                <span className="text-2xl sm:text-3xl font-bold font-mono">{potentielPhysiologique.score}</span>
                <span className="text-xs sm:text-sm text-muted-foreground">%</span>
              </div>
              
              <Progress 
                value={potentielPhysiologique.score} 
                className="h-2" 
              />
              
              <p className="text-xs text-muted-foreground italic">
                Score pondéré selon l'objectif ({OBJECTIF_LABELS[objectif] || objectif})
              </p>
              
              {/* Détail par composante */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                <div className="p-1.5 sm:p-2 bg-muted/50 rounded text-center">
                  <p className="text-muted-foreground truncate">Métabolisme</p>
                  <p className="font-bold">{potentielPhysiologique.details.vlamax}/25</p>
                </div>
                <div className="p-1.5 sm:p-2 bg-muted/50 rounded text-center">
                  <p className="text-muted-foreground truncate">Endurance</p>
                  <p className="font-bold">{potentielPhysiologique.details.endurance}/25</p>
                </div>
                <div className="p-1.5 sm:p-2 bg-muted/50 rounded text-center">
                  <p className="text-muted-foreground truncate">Puissance</p>
                  <p className="font-bold">{potentielPhysiologique.details.puissance}/25</p>
                </div>
              </div>
              
              <Separator />
              
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Message : </span>
                {potentielPhysiologique.messageStaff}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderNutrition = (): ReactNode => {
    if (!nutritionEstimate) return null;
    
    return (
      <Card>
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-orange-500" />
              <span className="font-semibold">Nutrition Prédictive</span>
            </div>
            <Badge 
              variant={nutritionEstimate.riskLevel === "low" ? "default" : 
                      nutritionEstimate.riskLevel === "moderate" ? "secondary" : "destructive"}
            >
              {nutritionEstimate.nutritionalRiskIndex.icon} Risque {nutritionEstimate.nutritionalRiskIndex.label}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Besoin glucidique estimé</p>
              <p className="text-lg sm:text-xl font-bold">{nutritionEstimate.carbsMin}–{nutritionEstimate.carbsMax} g/h</p>
            </div>
            <div>
              <p className="text-[11px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1">Facteur principal</p>
              <p className="text-xs sm:text-sm font-medium">{nutritionEstimate.nutritionalRiskIndex.mainRiskFactor}</p>
            </div>
          </div>
          
          {nutritionEstimate.riskLevel !== "low" && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                ⚠️ {nutritionEstimate.messageStaff}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPriorities = (): ReactNode => (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Priorités d'entraînement
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ol className="space-y-2">
          {priorities.map((priority, index) => (
            <li key={index} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
                {index + 1}
              </span>
              <span className="text-sm pt-0.5">{priority}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );

  const renderScientific = (): ReactNode => (
    <Card className="bg-muted/30 border-dashed">
      <CardContent className="p-4">
        <Button
          variant="ghost"
          className="w-full flex items-center justify-between p-0 h-auto"
          onClick={() => setShowScientificDetails(!showScientificDetails)}
        >
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Cadre scientifique & limites
          </span>
          {showScientificDetails ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        
        {showScientificDetails && (
          <div className="mt-3 space-y-2 text-xs text-muted-foreground">
            <p>• Les valeurs sont issues d'estimations terrain</p>
            <p>• La précision dépend de la qualité des snapshots</p>
            <p>• Les indicateurs guident la décision, ils ne remplacent pas l'expertise du coach</p>
            <Separator className="my-2" />
            <p className="italic">
              Snapshot du {snapshot.date} • 
              VLamax: {vlamaxEffectif.source} (Fiabilité {getConfidenceLabel(vlamaxEffectif.confidence)}) • 
              TTE: {tteEffectif.source} (Fiabilité {getConfidenceLabel(tteEffectif.confidence)})
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // =============================================
  // RENDER: FTP/kg TARGETS
  // =============================================
  
  const renderFtpKgTargets = (): ReactNode => {
    // Calculer l'âge depuis birth_date si disponible
    let age: number | null = null;
    if (currentAthlete.birth_date) {
      const birthDate = new Date(currentAthlete.birth_date);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }
    
    return (
      <FtpKgTargetsCard
        objectif={objectif}
        age={age}
        currentFtpKg={ftpKg}
        vo2max={snapshot.vo2max}
        vlamax={vlamaxEffectif.value}
        weeklyVolume={null} // Pas encore disponible dans le snapshot
      />
    );
  };

  // =============================================
  // RENDER: VLamax TARGETS
  // =============================================
  
  const renderVLamaxTargets = (): ReactNode => {
    // Calculer l'âge depuis birth_date si disponible
    let age: number | null = null;
    if (currentAthlete.birth_date) {
      const birthDate = new Date(currentAthlete.birth_date);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }
    
    return (
      <VLamaxTargetsCard
        objectif={objectif}
        age={age}
        currentVlamax={vlamaxEffectif.value}
        vo2max={snapshot.vo2max}
        weeklyVolume={null}
        ambition={getAthleteAmbition(currentAthlete)}
        sport={(snapshot as any)?.sport_main ?? null}
      />
    );
  };

  // =============================================
  // RENDER: AMBITION TARGETS CARD
  // =============================================
  
  const renderAmbitionTargets = (): ReactNode => (
    <AmbitionTargetsCard
      objectif={objectif}
      ambition={getAthleteAmbition(currentAthlete)}
      currentVlamax={vlamaxEffectif.value}
      currentTTE={tteEffectif.tte_min}
      currentFtpKg={ftpKg}
      sport={(snapshot as any)?.sport_main ?? null}
    />
  );

  // =============================================
  // RENDER: FATIGUE CARD
  // =============================================
  
  const renderFatigueCard = (): ReactNode => (
    <FatigueCard
      fatigue={fatigueEffectif}
      isStaffMode={true}
    />
  );

  // =============================================
  // RENDER: RUN INJURY RISK CARD (Legacy)
  // =============================================
  
  const renderRunInjuryRiskCard = (): ReactNode => {
    // Afficher uniquement si objectif implique la CAP
    const capObjectifs = ["Marathon", "Semi", "Course", "Trail", "TrailCourt", "TrailLong", "Ultra", "IM", "Ironman", "703", "Half", "Sprint", "Olympic"];
    if (!capObjectifs.includes(objectif)) return null;
    
    return (
      <RunInjuryRiskCard
        riskEnvelope={runInjuryRisk}
        isStaffMode={true}
      />
    );
  };

  // =============================================
  // RENDER: CAP INJURY RISK CARD (Unified V2)
  // =============================================
  
  const renderCAPInjuryRiskCard = (): ReactNode => {
    // Afficher uniquement si objectif implique la CAP
    const capObjectifs = ["Marathon", "Semi", "Course", "Trail", "TrailCourt", "TrailLong", "Ultra", "IM", "Ironman", "703", "Half", "Sprint", "Olympic"];
    if (!capObjectifs.includes(objectif)) return null;
    
    return (
      <InjuryRiskCAPCard
        riskEnvelope={capInjuryRisk}
        isStaffMode={true}
      />
    );
  };

  // =============================================
  // RENDER: BIKE INJURY RISK CARD (Unified V2)
  // =============================================
  
  const renderBikeInjuryRiskCard = (): ReactNode => {
    // Afficher uniquement si objectif implique le vélo
    const bikeObjectifs = ["IM", "Ironman", "703", "Half", "Sprint", "Olympic"];
    if (!bikeObjectifs.includes(objectif)) return null;
    
    return (
      <InjuryRiskBikeCard
        riskEnvelope={bikeInjuryRisk}
        isStaffMode={true}
      />
    );
  };

  // =============================================
  // RENDER: QUICK FATIGUE INPUT
  // =============================================
  
  const renderQuickFatigueInput = (): ReactNode => (
    <QuickFatigueInput
      athleteId={currentAthlete.id}
      athleteName={currentAthlete.nom}
    />
  );

  // =============================================
  // RENDER: FATIGUE COMPARISON CHART
  // =============================================
  
  const renderFatigueComparisonChart = (): ReactNode => {
    return (
      <FatigueComparisonChart
        activeSnapshot={snapshot}
        athleteSnapshots={athleteSnapshots}
        athleteTests={athleteTests}
        athleteId={currentAthlete.id}
        athleteAge={athleteAge}
        objectif={objectif}
      />
    );
  };

  // =============================================
  // RENDER: DATA QUALITY BLOCK
  // =============================================
  
  const renderDataQuality = (): ReactNode => (
    <DataQualityBlock stats={dataQualityStats} />
  );

  // =============================================
  // RENDER: FATMAX TFCL CARD
  // =============================================
  
  const renderFatMaxTFCL = (): ReactNode => {
    // Normaliser l'objectif pour FatMax
    const normalizedObjectif = (objectif === "IM" ? "Ironman" : objectif) as FatMaxObjectif;
    
    return (
      <FatMaxTFCLCard
        vlamaxEffectif={vlamaxEffectif.value}
        vlamaxConfidence={vlamaxEffectif.confidence}
        vo2max={snapshot.vo2max ?? null}
        tteEffectif={tteEffectif.tte_min}
        tteConfidence={tteEffectif.confidence}
        fatigueIndex={fatigueEffectif.score}
        objectif={normalizedObjectif}
        ftp={snapshot.ftp}
      />
    );
  };

  // =============================================
  // RENDER: FATMAX RACE INTENSITY CHART
  // =============================================
  
  const renderFatMaxChart = (): ReactNode => {
    // Normaliser l'objectif pour FatMax
    const normalizedObjectif = (objectif === "IM" ? "Ironman" : objectif) as FatMaxObjectif;
    
    const fatmaxResult = computeFatMaxTFCL({
      vlamaxEffectif: vlamaxEffectif.value,
      vlamaxConfidence: vlamaxEffectif.confidence,
      vo2maxEffectif: snapshot.vo2max ?? null,
      tteEffectif: tteEffectif.tte_min,
      tteConfidence: tteEffectif.confidence,
      fatigueIndex: fatigueEffectif.score,
      objectif: normalizedObjectif,
      ftp: snapshot.ftp,
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
        staffMode={true}
      />
    );
  };

  // =============================================
  // RENDER: PERFORMANCE RANGES (Plages réalistes)
  // =============================================
  
  const renderPerformanceRanges = (): ReactNode => (
    <div className="space-y-4">
      <PerformanceRangeDisplay range={ftpKgRange} title="Plage FTP/kg réaliste à moyen terme" />
      <PerformanceRangeDisplay range={tteRange} title="Plage TTE réaliste" />
    </div>
  );

  // =============================================
  // SECTIONS CONFIGURATION
  // =============================================

  // =============================================
  // RENDER: VLAMAX BIKE V2 ENHANCED
  // =============================================
  
  const renderVLamaxBikeV2Enhanced = (): ReactNode => (
    <VLamaxBikeV2EnhancedCard
      input={{
        ftp: snapshot.ftp ?? 0,
        p30s_w: (snapshot as unknown as Record<string, unknown>).p30s_w as number | null,
        p60s_w: (snapshot as unknown as Record<string, unknown>).p60s_w as number | null,
        map5min_w: (snapshot as unknown as Record<string, unknown>).map5min_w as number | null,
        tte_min: snapshot.tte_observed_min ?? tteEffectif.tte_min,
        pmax_5s: snapshot.pmax_5s ?? undefined,
        weight_kg: snapshot.weight_kg ?? undefined,
        protocol_quality: ((snapshot as unknown as Record<string, unknown>).protocol_quality as 1 | 2 | 3 | 4 | 5) ?? 3,
        objectif,
        vo2max: snapshot.vo2max ?? undefined,
        sex: currentAthlete.sexe === "F" ? "F" : "H",
      }}
    />
  );

  // =============================================
  // SECTIONS CONFIGURATION - Running Focus Mode Aware
  // =============================================
  
  // Sections communes (toujours affichées)
  const commonSections = [
    { id: "athlete-context", render: renderAthleteContext },
    { id: "data-quality", render: renderDataQuality },
    { id: "ambition-targets", render: renderAmbitionTargets },
    { id: "performance-ranges", render: renderPerformanceRanges },
    { id: "quick-fatigue", render: renderQuickFatigueInput },
    { id: "fatigue", render: renderFatigueCard },
    { id: "fatigue-comparison", render: renderFatigueComparisonChart },
    { id: "cap-injury-risk", render: renderCAPInjuryRiskCard },
    { id: "coach-summary", render: renderCoachSummary },
    { id: "piliers", render: renderPiliers },
    { id: "fatmax-tfcl", render: renderFatMaxTFCL },
    { id: "fatmax-chart", render: renderFatMaxChart },
    { id: "vlamax-targets", render: renderVLamaxTargets },
    { id: "vlamax-profile-scale", render: () => (
      <VLamaxProfileScale
        vlamax={vlamaxEffectif.value}
        objectif={objectif}
        sportMain={(snapshot as any)?.sport_main ?? null}
        age={athleteAge ?? null}
      />
    )},
    { id: "cpw-prime-curve", render: () => (
      <CPWPrimeCurveCard
        ftp={snapshot.ftp}
        pmax5s={snapshot.pmax_5s}
        p30s={(snapshot as unknown as Record<string, unknown>).p30s_w as number | null}
        p60s={(snapshot as unknown as Record<string, unknown>).p60s_w as number | null}
        map5min={(snapshot as unknown as Record<string, unknown>).map5min_w as number | null}
        weightKg={snapshot.weight_kg}
      />
    )},
    { id: "nutrition", render: renderNutrition },
    { id: "priorities", render: renderPriorities },
    { id: "scientific", render: renderScientific },
  ];
  
  // Sections vélo uniquement (masquées en Running Focus Mode)
  const bikeSections = [
    { id: "vlamax-bike-v2-enhanced", render: renderVLamaxBikeV2Enhanced },
    { id: "bike-injury-risk", render: renderBikeInjuryRiskCard },
    { id: "ftp-targets", render: renderFtpKgTargets },
  ];
  
  // Construire les sections finales en fonction du mode
  const sections = isRunningOnly 
    ? commonSections // Mode running: uniquement sections communes
    : [
        // Mode triathlon/vélo: inclure les sections vélo au bon endroit
        ...commonSections.slice(0, 2), // athlete-context, data-quality
        ...bikeSections.slice(0, 1),   // vlamax-bike-v2-enhanced
        ...commonSections.slice(2, 10), // ambition-targets -> piliers
        ...bikeSections.slice(1, 2),   // bike-injury-risk
        ...commonSections.slice(10, 14), // fatmax-tfcl -> vlamax-targets
        ...bikeSections.slice(2, 3),   // ftp-targets
        ...commonSections.slice(14),   // nutrition -> scientific
      ];

  // =============================================
  // RENDER: MAIN DASHBOARD
  // =============================================
  
  return (
    <AppLayout title="Dashboard">
      <div className="animate-fade-in max-w-2xl mx-auto space-y-3 sm:space-y-4">
        {/* Running Focus Mode Indicator */}
        {isRunningOnly && (
          <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg border border-primary/20">
            <div className="flex items-center gap-3">
              <RunningFocusModeIndicator showDetails compact={false} />
              {raceLabel && (
                <span className="text-sm text-muted-foreground">
                  Objectif: <span className="font-medium text-foreground">{raceLabel}</span>
                </span>
              )}
            </div>
            <Badge variant="outline" className="text-xs">
              100% CAP
            </Badge>
          </div>
        )}
        
        <SortableSectionsContainer
          tabId="dashboard"
          tabLabel="Dashboard"
          sections={sections}
          className="space-y-4"
        />
      </div>
    </AppLayout>
  );
}
