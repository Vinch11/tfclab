import { computePotentielEffectif, type PotentielPhysiologiqueEffectif } from "@/lib/potentielPhysiologiqueEffectif";
// =============================================
// STAFF DASHBOARD - Two For Coaching Lab
// Tour de contrôle décisionnelle - Lisible en < 10 secondes
// =============================================

import { useState, useMemo } from "react";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Zap, 
  Target, 
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Utensils,
  TrendingUp,
  Info,
  ChevronDown,
  ChevronUp,
  Star,
  Radar,
  User,
  Gauge
} from "lucide-react";
import { cn } from "@/lib/utils";

// Sources uniques de données
import { type VLamaxEffectif, getSourceColor, getConfidenceLabel, type TTEEffectif, getTTETarget, getSourceLabel } from "@/engines/diagnostic";
import { NutritionEstimate } from "@/lib/nutritionPredictive";
import { ProfileRadarChart } from "@/components/ProfileRadarChart";
import { EnergyDriftResult } from "@/lib/energyDrift";

import { getAgeAdjustedTargets, computeAgeAdjustmentIndex } from "@/lib/ageAdjustment";
import { AmbitionLevel, DEFAULT_AMBITION, AMBITION_DEFINITIONS } from "@/types/ambitionLevel";
import { getVlamaxStatusWithLabel } from "@/lib/physiologicalTargets";

// =============================================
// TYPES
// =============================================

interface StaffDashboardProps {
  athleteName: string;
  objectif: string;
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  potentielPhysiologique: PotentielPhysiologiqueEffectif;
  nutritionEstimate: NutritionEstimate | null;
  ftpKg: number | null;
  snapshotDate: string | null;
  athleteAge?: number | null;
  ambition?: AmbitionLevel;
  snapshot?: unknown;
  vo2max?: number | null;
  athlete?: any;
  energyDrift?: any;
}

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
  return "build"; 
}

function generateCoachSummary(
  vlamax: VLamaxEffectif,
  tte: TTEEffectif,
  readiness: PotentielPhysiologiqueEffectif,
  objectif: string
): string {
  const parts: string[] = [];
  
  if (vlamax.value !== null) {
    if (vlamax.value > 0.50) {
      parts.push("Le profil métabolique reste orienté glycogène → vigilance nutritionnelle recommandée.");
    } else if (vlamax.value < 0.35) {
      parts.push("Excellent profil métabolique pour l'endurance.");
    } else {
      parts.push("Profil métabolique équilibré.");
    }
  }
  
  const tteTarget = getTTETarget(objectif);
  if (tte.tte_min < tteTarget - 5) {
    parts.push("Endurance spécifique au seuil encore limitante.");
  } else if (tte.tte_min >= tteTarget) {
    parts.push("Endurance spécifique validée.");
  }
  
  if (readiness.score >= 80) {
    return "Athlète globalement prêt. " + parts.join(" ");
  } else if (readiness.score >= 60) {
    return "Athlète en progression, mais " + parts.join(" ").toLowerCase();
  } else {
    return "Préparation à consolider. " + parts.join(" ");
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


// =============================================
// MAIN COMPONENT
// =============================================

export function StaffDashboard({
  athleteName,
  objectif,
  vlamaxEffectif,
  tteEffectif,
  potentielPhysiologique,
  nutritionEstimate,
  ftpKg,
  snapshotDate,
  athleteAge,
  ambition = DEFAULT_AMBITION,
  snapshot,
  vo2max,
  athlete,
  energyDrift,
}: StaffDashboardProps) {
  const [showScientificDetails, setShowScientificDetails] = useState(false);

  // Récupérer le label de l'ambition pour affichage
  const ambitionLabel = AMBITION_DEFINITIONS[ambition]?.shortLabel || "AG";

  // Cibles basées sur OBJECTIF + AMBITION (VLamax n'est plus ajustée par âge)
  const ageAdjustedTargets = useMemo(() => 
    getAgeAdjustedTargets(objectif, athleteAge ?? null, ambition), 
    [objectif, athleteAge, ambition]
  );
  const ageInfo = useMemo(() => 
    computeAgeAdjustmentIndex(athleteAge ?? null), 
    [athleteAge]
  );
  
  const tteTarget = ageAdjustedTargets.tteTarget;
  const coachSummary = generateCoachSummary(vlamaxEffectif, tteEffectif, potentielPhysiologique, objectif);
  const phase = getPhaseFromObjectif(objectif);
  
  const vlamaxStatus = getVlamaxStatusWithLabel(vlamaxEffectif.value, objectif, ambition);
  const tteStatus = getTTEStatus(tteEffectif.tte_min, tteTarget);
  const readinessStatus = { status: potentielPhysiologique.score >= 80 ? "ok" as const : potentielPhysiologique.score >= 60 ? "warning" as const : "critical" as const, label: potentielPhysiologique.label };

  // Priorités d'entraînement
  const priorities = useMemo(() => {
    const list: string[] = [];
    
    if (tteEffectif.tte_min < tteTarget) {
      list.push("Allonger le TTE (priorité principale)");
    }
    if (vlamaxEffectif.value !== null && vlamaxEffectif.value > 0.45) {
      list.push("Réduire progressivement le VLamax");
    }
    if (nutritionEstimate && nutritionEstimate.riskLevel !== "low") {
      list.push("Sécuriser la nutrition à l'effort");
    }
    if (list.length === 0) {
      list.push("Maintenir le profil actuel");
      list.push("Affiner la stratégie de course");
    }
    
    return list;
  }, [tteEffectif, tteTarget, vlamaxEffectif, nutritionEstimate]);

  // =============================================
  // RADAR CHART SCORES CALCULATIONS
  // =============================================
  
  // Utilisation des cibles ajustées par âge depuis ageAdjustedTargets
  const radarTargets = useMemo(() => ({
    vlamaxIdeal: ageAdjustedTargets.vlamaxOptimal,
    tteTarget: ageAdjustedTargets.tteTarget,
    ftpKgTarget: ageAdjustedTargets.ftpKgTarget,
  }), [ageAdjustedTargets]);

  // Normaliser VLamax (0-100): plus on est proche de l'idéal, plus le score est élevé
  const normalizeVlamax = (value: number | null): number => {
    if (value === null) return 0;
    const ideal = radarTargets.vlamaxIdeal;
    const maxDeviation = 0.5;
    const deviation = Math.abs(value - ideal);
    return Math.max(0, Math.min(100, Math.round((1 - deviation / maxDeviation) * 100)));
  };

  // Normaliser TTE (0-100): score basé sur l'atteinte de la cible
  const normalizeTTE = (value: number): number => {
    const target = radarTargets.tteTarget;
    if (value >= target) return 100;
    return Math.max(0, Math.round((value / target) * 100));
  };

  // Normaliser FTP/kg (0-100)
  const normalizeFtpKg = (value: number | null): number => {
    if (!value) return 0;
    const target = radarTargets.ftpKgTarget;
    if (value >= target) return 100;
    return Math.max(0, Math.round((value / target) * 100));
  };

  // Scores radar calculés
  const radarScores = useMemo(() => ({
    currentVlamax: normalizeVlamax(vlamaxEffectif.value),
    currentTTE: normalizeTTE(tteEffectif.tte_min),
    currentFtpKg: normalizeFtpKg(ftpKg),
    targetVlamax: 100,
    targetTTE: 100,
    targetFtpKg: 100,
  }), [vlamaxEffectif.value, tteEffectif.tte_min, ftpKg, radarTargets]);

  // Déterminer le sport pour le radar
  const sportType: "velo" | "course" | "triathlon" = useMemo(() => {
    const runObjectifs = ["Marathon", "Semi", "Trail", "TrailCourt", "TrailLong", "Ultra", "Course"];
    const triObjectifs = ["IM", "Ironman", "703", "Half", "Olympic", "Sprint"];
    if (runObjectifs.includes(objectif)) return "course";
    if (triObjectifs.includes(objectif)) return "triathlon";
    return "velo";
  }, [objectif]);

  return (
    <div className="space-y-4 animate-fade-in">
      
      {/* BLOC 1: IDENTITÉ ATHLÈTE & CONTEXTE */}
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-4">
          <h1 className="text-xl font-bold mb-2">{athleteName}</h1>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="outline" className="gap-1">
              <Target className="h-3 w-3" />
              {OBJECTIF_LABELS[objectif] || objectif}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Activity className="h-3 w-3" />
              {PHASE_LABELS[phase] || phase}
            </Badge>
            {athleteAge !== null && athleteAge !== undefined && (
              <Badge 
                variant="outline" 
                className={cn(
                  "gap-1",
                  ageInfo.category === "master1" && "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                  ageInfo.category === "master2" && "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400"
                )}
              >
                <User className="h-3 w-3" />
                {athleteAge} ans
                {(ageInfo.category === "master1" || ageInfo.category === "master2") && (
                  <span className="ml-1 opacity-75">• Master</span>
                )}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* BLOC 2: RÉSUMÉ EXPRESS COACH */}
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

      {/* BLOC 3: LES 3 PILIERS PHYSIOLOGIQUES */}
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
                <span className="text-muted-foreground">Source:</span>
                <span className={getSourceColor(vlamaxEffectif.source)}>
                  {vlamaxEffectif.label}
                </span>
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
                <span className="text-muted-foreground">Source:</span>
                <span>{getSourceLabel(tteEffectif.source)}</span>
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

        {/* RADAR CHART: Profil Métabolique Complet */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Radar className="h-5 w-5 text-primary" />
              Profil Métabolique Complet
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Visualisation radar des 3 métriques clés vs cibles {OBJECTIF_LABELS[objectif] || objectif}
            </p>
          </CardHeader>
          <CardContent className="pt-0">
            <ProfileRadarChart
              currentVlamax={radarScores.currentVlamax}
              currentTTE={radarScores.currentTTE}
              currentFtpKg={radarScores.currentFtpKg}
              targetVlamax={radarScores.targetVlamax}
              targetTTE={radarScores.targetTTE}
              targetFtpKg={radarScores.targetFtpKg}
              objectif={OBJECTIF_LABELS[objectif] || objectif}
              sport={sportType}
            />
            
            {/* Valeurs brutes pour contexte */}
            <div className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
              <div className="p-1.5 sm:p-2 bg-cyan-500/10 rounded-lg text-center">
                <p className="text-cyan-600 dark:text-cyan-400 font-medium">VLamax</p>
                <p className="font-bold text-foreground">
                  {vlamaxEffectif.value !== null ? vlamaxEffectif.value.toFixed(2) : "—"}
                </p>
                <p className="text-muted-foreground truncate">cible: {radarTargets.vlamaxIdeal}</p>
              </div>
              <div className="p-1.5 sm:p-2 bg-orange-500/10 rounded-lg text-center">
                <p className="text-orange-600 dark:text-orange-400 font-medium">TTE</p>
                <p className="font-bold text-foreground">{tteEffectif.tte_min} min</p>
                <p className="text-muted-foreground truncate">cible: {radarTargets.tteTarget} min</p>
              </div>
              <div className="p-1.5 sm:p-2 bg-green-500/10 rounded-lg text-center">
                <p className="text-green-600 dark:text-green-400 font-medium">FTP/kg</p>
                <p className="font-bold text-foreground">
                  {ftpKg !== null ? ftpKg.toFixed(2) : "—"}
                </p>
                <p className="text-muted-foreground truncate">cible: {radarTargets.ftpKgTarget}</p>
              </div>
            </div>
            
            {/* Bloc Ajustement Âge */}
            {athleteAge !== null && athleteAge !== undefined && (
              <div className={cn(
                "mt-3 p-3 rounded-lg border text-xs",
                ageInfo.category === "master1" || ageInfo.category === "master2"
                  ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                  : "bg-muted/30 border-border"
              )}>
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-foreground">Cibles physiologiques</span>
                  <Badge variant="outline" className="text-xs py-0 h-5 border-primary/50 text-primary">
                    {ambitionLabel}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">VLamax cible</p>
                    <p className="font-medium text-foreground font-mono">{radarTargets.vlamaxIdeal.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">TTE cible</p>
                    <p className="font-medium text-foreground font-mono">{radarTargets.tteTarget} min</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">FTP/kg cible</p>
                    <p className="font-medium text-foreground font-mono">{radarTargets.ftpKgTarget}</p>
                  </div>
                </div>
                <p className="mt-2 text-muted-foreground leading-relaxed text-xs">
                  Cibles définies par <span className="font-medium text-foreground">objectif ({OBJECTIF_LABELS[objectif] || objectif})</span> et <span className="font-medium text-foreground">ambition ({ambitionLabel})</span>.
                  {ageAdjustedTargets.ageAdjustmentApplied && (
                    <span> TTE ajusté pour {ageInfo.label}.</span>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* BLOC 4: NUTRITION PRÉDICTIVE */}
      {nutritionEstimate && (
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
      )}

      {/* BLOC 5: PRIORITÉS D'ENTRAÎNEMENT */}
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


      {/* BLOC 7: CADRE SCIENTIFIQUE & LIMITES */}
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
              <p>• La précision dépend de la qualité des profils</p>
              <p>• Les indicateurs guident la décision, ils ne remplacent pas l'expertise du coach</p>
              <Separator className="my-2" />
              <p className="italic">
                {snapshotDate ? `Profil du ${snapshotDate}` : "Pas de profil"} • 
                VLamax: {vlamaxEffectif.source} • 
                TTE: {tteEffectif.source}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
