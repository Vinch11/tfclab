// =============================================
// DASHBOARD STAFF - Two For Coaching Lab
// Tour de contrôle décisionnelle - Lisible en < 10 secondes
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
import { useCloudData } from "@/hooks/useCloudData";

// Sources uniques de données
import { computeVLamaxEffectif, VLamaxEffectif, getSourceColor, getConfidenceLabel } from "@/lib/vlamaxEffectif";
import { computeTTEEffectif, TTEEffectif, getTTETarget, getSourceLabel } from "@/lib/tteEffectif";
import { computeRaceReadinessEffectif, RaceReadinessEffectif, getSportFromObjectif } from "@/lib/raceReadinessEffectif";
import { computeNutritionEstimate, NutritionEstimate } from "@/lib/nutritionPredictive";
import { computeFatigueEffectif, FatigueEffectif } from "@/lib/fatigueEffectif";

// Composants cibles et fatigue
import { FtpKgTargetsCard } from "@/components/FtpKgTargetsCard";
import { VLamaxTargetsCard } from "@/components/VLamaxTargetsCard";
import { FatigueCard } from "@/components/FatigueCard";
import { RunInjuryRiskCard } from "@/components/RunInjuryRiskCard";
import { QuickFatigueInput } from "@/components/QuickFatigueInput";
import { FatigueComparisonChart } from "@/components/FatigueComparisonChart";
import { computeRunInjuryRisk, RunInjuryRiskEnvelope } from "@/lib/runInjuryRisk";
import { AmbitionLevel, DEFAULT_AMBITION } from "@/types/ambitionLevel";
import { QuickAmbitionSelector } from "@/components/QuickAmbitionSelector";
import { AmbitionTargetsCard } from "@/components/AmbitionTargetsCard";

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
  readiness: RaceReadinessEffectif,
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

function getVLamaxStatus(value: number | null, objectif: string): { status: "ok" | "warning" | "critical"; label: string } {
  if (value === null) return { status: "critical", label: "Non disponible" };
  
  // Seuils selon objectif longue distance vs court
  const isLongDistance = ["IM", "Ironman", "Marathon", "Ultra", "TrailLong", "703", "Half"].includes(objectif);
  
  if (isLongDistance) {
    if (value <= 0.40) return { status: "ok", label: "Optimal" };
    if (value <= 0.50) return { status: "warning", label: "À surveiller" };
    return { status: "critical", label: "Limitant" };
  } else {
    if (value <= 0.55) return { status: "ok", label: "Cohérent" };
    if (value <= 0.65) return { status: "warning", label: "À surveiller" };
    return { status: "critical", label: "Élevé" };
  }
}

function getTTEStatus(value: number, target: number): { status: "ok" | "warning" | "critical"; label: string } {
  const ratio = value / target;
  if (ratio >= 1) return { status: "ok", label: "OK" };
  if (ratio >= 0.85) return { status: "warning", label: "Insuffisant" };
  return { status: "critical", label: "Critique" };
}

function getRaceReadinessStatus(score: number): { status: "ok" | "warning" | "critical"; label: string } {
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
  const { snapshots, tests, checkins } = useCloudData();
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
      snapshots: athleteSnapshots.map(s => ({
        id: s.id,
        athlete_id: s.athlete_id,
        date: s.date,
        vlamax: s.vlamax,
        ftp: s.ftp,
        pmax_5s: s.pmax_5s,
        weight_kg: s.weight_kg,
      })),
    });
    
    // TTE Effectif (source unique)
    const tteEffectif = computeTTEEffectif({
      ftp: activeSnapshot.ftp,
      tss_7d: activeSnapshot.tss_7d,
      tte_mode: activeSnapshot.tte_mode,
      tte_observed_min: activeSnapshot.tte_observed_min,
      objectif,
    });
    
    // Race Readiness Effectif (source unique)
    const raceReadiness = computeRaceReadinessEffectif({
      objectif,
      vlamaxEffectif,
      tteEffectif,
      ftp: activeSnapshot.ftp ?? null,
      poids: activeSnapshot.weight_kg ?? null,
      fatigue_ok: true, // Simplified
      seance_specifique_validee: false,
    });
    
    // Nutrition Prédictive
    const nutritionEstimate = computeNutritionEstimate({
      vlamax: vlamaxEffectif.value,
      objectif,
      tteMin: tteEffectif.tte_min,
      tteTarget: getTTETarget(objectif),
      raceReadiness: raceReadiness.score,
    });
    
    // FTP/kg
    const ftpKg = activeSnapshot.ftp && activeSnapshot.weight_kg && activeSnapshot.weight_kg > 0
      ? activeSnapshot.ftp / activeSnapshot.weight_kg
      : null;
    
    // Âge de l'athlète
    let athleteAge: number | null = null;
    if (currentAthlete.birth_date) {
      const birthDate = new Date(currentAthlete.birth_date);
      const today = new Date();
      athleteAge = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        athleteAge--;
      }
    }
    
    // Récupérer la fatigue perçue depuis les check-ins récents
    const athleteCheckins = checkins.filter(c => c.athlete_id === athleteId);
    const sortedCheckins = [...athleteCheckins].sort((a, b) => b.date_iso.localeCompare(a.date_iso));
    const latestFatiguePercue = sortedCheckins.length > 0 && sortedCheckins[0].fatigue != null
      ? sortedCheckins[0].fatigue
      : null;
    
    // Fatigue Effectif (source unique - combine objectif + subjectif)
    const fatigueEffectif = computeFatigueEffectif({
      tss7d: activeSnapshot.tss_7d,
      tss7dHabituel: null, // Non disponible pour l'instant
      fatiguePercue: latestFatiguePercue, // NEW: fatigue perçue depuis check-ins
      tteEffectif,
      raceReadiness,
      vlamaxEffectif,
      age: athleteAge,
      objectif,
    });
    
    // Run Injury Risk (risque blessure CAP)
    const runInjuryRisk = computeRunInjuryRisk({
      fatigueEffectif,
      vlamaxEffectif,
      tteEffectif,
      tss7d: activeSnapshot.tss_7d ?? null,
      runLoad7d: null, // Pas encore disponible
      age: athleteAge,
      objectif,
    });
    
    // Générer le résumé coach
    const coachSummary = generateCoachSummary(vlamaxEffectif, tteEffectif, raceReadiness, objectif);
    
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
    
    return {
      vlamaxEffectif,
      tteEffectif,
      raceReadiness,
      nutritionEstimate,
      fatigueEffectif,
      runInjuryRisk,
      ftpKg,
      athleteAge,
      snapshot: activeSnapshot,
      athleteSnapshots,
      athleteTests,
      coachSummary,
      phase,
      priorities,
      tteTarget,
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
    raceReadiness, 
    nutritionEstimate,
    fatigueEffectif,
    runInjuryRisk,
    ftpKg,
    athleteAge,
    snapshot,
    athleteSnapshots,
    athleteTests,
    coachSummary,
    phase,
    priorities,
    tteTarget,
  } = dashboardData;

  const objectif = currentAthlete.objectif || "IM";
  const vlamaxStatus = getVLamaxStatus(vlamaxEffectif.value, objectif);
  const tteStatus = getTTEStatus(tteEffectif.tte_min, tteTarget);
  const readinessStatus = getRaceReadinessStatus(raceReadiness.score);

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
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold mb-2">{currentAthlete.nom}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline" className="gap-1">
                <Target className="h-3 w-3" />
                {OBJECTIF_LABELS[objectif] || objectif}
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <Activity className="h-3 w-3" />
                {PHASE_LABELS[phase] || phase}
              </Badge>
            </div>
          </div>
          {/* Sélecteur rapide d'ambition - plus visible */}
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Ambition</span>
            <QuickAmbitionSelector
              currentAmbition={(currentAthlete.ambition as AmbitionLevel) || DEFAULT_AMBITION}
              onAmbitionChange={handleAmbitionChange}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderCoachSummary = (): ReactNode => (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="p-4">
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
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <span className="font-semibold">VLamax effectif</span>
            </div>
            {getStatusBadge(vlamaxStatus.status, vlamaxStatus.label)}
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono">
              {vlamaxEffectif.value !== null ? vlamaxEffectif.value.toFixed(2) : "—"}
            </span>
            <span className="text-sm text-muted-foreground">mmol/L/s</span>
          </div>
          
          <div className="flex items-center gap-4 text-xs">
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

      {/* PILIER 2: TTE Effectif */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <span className="font-semibold">TTE effectif</span>
            </div>
            {getStatusBadge(tteStatus.status, tteStatus.label)}
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono">{tteEffectif.tte_min}</span>
            <span className="text-sm text-muted-foreground">min</span>
            <span className="text-sm text-muted-foreground ml-2">
              (cible: {tteTarget} min)
            </span>
          </div>
          
          <Progress 
            value={Math.min(100, (tteEffectif.tte_min / tteTarget) * 100)} 
            className="h-2" 
          />
          
          <div className="flex items-center gap-4 text-xs">
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

      {/* PILIER 3: Race Readiness */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-green-500" />
              <span className="font-semibold">Race Readiness</span>
            </div>
            {getStatusBadge(readinessStatus.status, readinessStatus.label)}
          </div>
          
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono">{raceReadiness.score}</span>
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          
          <Progress 
            value={raceReadiness.score} 
            className="h-2" 
          />
          
          <p className="text-xs text-muted-foreground italic">
            Score pondéré selon l'objectif ({OBJECTIF_LABELS[objectif] || objectif})
          </p>
          
          {/* Détail par composante */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div className="p-2 bg-muted/50 rounded text-center">
              <p className="text-muted-foreground">Métabolisme</p>
              <p className="font-bold">{raceReadiness.details.vlamax}/25</p>
            </div>
            <div className="p-2 bg-muted/50 rounded text-center">
              <p className="text-muted-foreground">Endurance</p>
              <p className="font-bold">{raceReadiness.details.endurance}/25</p>
            </div>
            <div className="p-2 bg-muted/50 rounded text-center">
              <p className="text-muted-foreground">Puissance</p>
              <p className="font-bold">{raceReadiness.details.puissance}/25</p>
            </div>
          </div>
          
          <Separator />
          
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Message : </span>
            {raceReadiness.messageStaff}
          </p>
        </CardContent>
      </Card>
    </div>
  );

  const renderNutrition = (): ReactNode => {
    if (!nutritionEstimate) return null;
    
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
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
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Besoin glucidique estimé</p>
              <p className="text-xl font-bold">{nutritionEstimate.carbsMin}–{nutritionEstimate.carbsMax} g/h</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Facteur principal</p>
              <p className="text-sm font-medium">{nutritionEstimate.nutritionalRiskIndex.mainRiskFactor}</p>
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
              VLamax: {vlamaxEffectif.source} ({Math.round(vlamaxEffectif.confidence * 100)}%) • 
              TTE: {tteEffectif.source} ({Math.round(tteEffectif.confidence * 100)}%)
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
      />
    );
  };

  // =============================================
  // RENDER: AMBITION TARGETS CARD
  // =============================================
  
  const renderAmbitionTargets = (): ReactNode => (
    <AmbitionTargetsCard
      objectif={objectif}
      ambition={(currentAthlete.ambition as AmbitionLevel) || DEFAULT_AMBITION}
      currentVlamax={vlamaxEffectif.value}
      currentTTE={tteEffectif.tte_min}
      currentFtpKg={ftpKg}
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
  // RENDER: RUN INJURY RISK CARD
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
    const athleteCheckins = checkins.filter(c => c.athlete_id === currentAthlete.id);
    
    return (
      <FatigueComparisonChart
        checkins={athleteCheckins}
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
  // SECTIONS CONFIGURATION
  // =============================================

  const sections = [
    { id: "athlete-context", render: renderAthleteContext },
    { id: "ambition-targets", render: renderAmbitionTargets },
    { id: "quick-fatigue", render: renderQuickFatigueInput },
    { id: "fatigue", render: renderFatigueCard },
    { id: "fatigue-comparison", render: renderFatigueComparisonChart },
    { id: "run-injury-risk", render: renderRunInjuryRiskCard },
    { id: "coach-summary", render: renderCoachSummary },
    { id: "piliers", render: renderPiliers },
    { id: "ftp-targets", render: renderFtpKgTargets },
    { id: "vlamax-targets", render: renderVLamaxTargets },
    { id: "nutrition", render: renderNutrition },
    { id: "priorities", render: renderPriorities },
    { id: "scientific", render: renderScientific },
  ];

  // =============================================
  // RENDER: MAIN DASHBOARD
  // =============================================
  
  return (
    <AppLayout title="Dashboard">
      <div className="animate-fade-in max-w-2xl mx-auto">
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
