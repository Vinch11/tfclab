// =============================================
// MODULE ÉCONOMIE DE COURSE (CAP) - Staff + Cloud Sync
// =============================================

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Footprints, 
  Heart, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  Zap,
  Activity,
  Info,
  ChevronDown,
  Utensils,
  BookOpen,
  Cloud,
  CloudOff,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  RunningEconomyResult,
  computeRunningEconomy,
  getEconomyColorClass,
  getEconomyBadgeClass,
  RUNNING_ECONOMY_METHODOLOGY,
  type RunningEconomyInput,
} from "@/lib/runningEconomy";
import { computeRunningEconomyV2 } from "@/lib/v2/runningEconomyV2";
import { useRunningProfileCloud } from "@/hooks/useRunningProfileCloud";

interface RunningEconomyModuleProps {
  athleteId?: string;
  fcMax: number | null;
  fcMoyenneEndurance?: number | null;
  allureEndurance?: number | null;
  deriveCardiaque?: number | null;
  tteMin: number | null;
  objectif: string;
  vlamax?: number | null;
  sport?: string;
  staffMode?: boolean;
  weightKg?: number | null;
  powerEndurance?: number | null;
  /** Fallback RAW depuis chronos course (raceTimeEstimator) */
  raceChrono?: {
    CE_mlO2_kg_km?: number | null;
    durabilityIndex?: number | null;
    confidence?: number | null;
  } | null;
}

export function RunningEconomyModule({
  athleteId,
  fcMax,
  fcMoyenneEndurance = null,
  allureEndurance = null,
  deriveCardiaque = null,
  tteMin,
  objectif,
  vlamax = null,
  sport,
  staffMode = false,
  weightKg = null,
  powerEndurance = null,
  raceChrono = null,
}: RunningEconomyModuleProps) {
  // ✅ Cloud persistence - get economy from Cloud if available
  const {
    runningProfile,
    hasProfile: hasCloudProfile,
    loading: cloudLoading,
  } = useRunningProfileCloud(athleteId ?? null);
  
  // Use Cloud economy if available
  const cloudEconomy = runningProfile?.economy_run?.value ?? null;
  const cloudDurability = runningProfile?.durability_run?.value ?? null;
  const effectiveTteMin = cloudDurability ?? tteMin;
  // Calculer l'économie de course
  const input: RunningEconomyInput = {
    fcMax,
    fcMoyenneEndurance,
    allureEndurance,
    deriveCardiaque,
    tteMin: effectiveTteMin,
    objectif,
    sport,
  };
  
  const economy = computeRunningEconomy(input);
  
  // Estimation coût O2 (ml/kg/km) — V2 physiologique
  const paceMinPerKm = allureEndurance ? allureEndurance / 60 : null;
  const o2CostResult = computeRunningEconomyV2({
    fcMax,
    fcEndurance: fcMoyenneEndurance,
    paceEndurance: paceMinPerKm,
    powerEndurance,
    hrDriftPct: deriveCardiaque,
    tteMin: effectiveTteMin,
    weightKg,
    objectif,
    sport,
    raceChrono,
  }).estimatedO2Cost;
  
  // Si non applicable (vélo, triathlon vélo-focus), ne pas afficher
  if (!economy.isApplicable) {
    return null;
  }
  
  const getLevelIcon = () => {
    switch (economy.level) {
      case "excellent": return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "correct": return <Activity className="h-5 w-5 text-yellow-500" />;
      case "weak": return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "very_weak": return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", getEconomyColorClass(economy.color))}>
              <Footprints className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Économie de Course
                <Badge variant="outline" className="text-xs">CAP</Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Facteur limitant majeur de la performance en course à pied
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Cloud sync indicator */}
            {cloudLoading ? (
              <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
              </Badge>
            ) : hasCloudProfile && cloudEconomy !== null ? (
              <Badge variant="outline" className="text-xs gap-1 text-emerald-600 border-emerald-300">
                <Cloud className="h-3 w-3" />
                Cloud
              </Badge>
            ) : null}
            
            <Badge className={cn("px-3 py-1", getEconomyBadgeClass(economy.color))}>
              {economy.levelIcon} {economy.levelLabel}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Définition officielle */}
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {RUNNING_ECONOMY_METHODOLOGY.definition}
          </p>
        </div>
        
        {/* Indicateurs clés */}
        <div className="grid grid-cols-2 gap-3">
          {/* Pace économique de référence */}
          <div className="p-3 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Pace Économique Réf.</span>
            </div>
            <div className="text-lg font-mono font-bold text-foreground">
              {economy.paceEconomiqueRef !== null 
                ? `${economy.paceEconomiqueRef.toFixed(1)} min/km` 
                : "Non renseigné"}
            </div>
            {economy.fcPct75 !== null && (
              <div className="text-xs text-muted-foreground">
                à ~75% FCmax ({economy.fcPct75} bpm)
              </div>
            )}
          </div>
          
          {/* Dérive cardiaque */}
          <div className="p-3 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Heart className="h-4 w-4 text-red-500" />
              <span className="text-xs text-muted-foreground">Dérive Cardiaque</span>
            </div>
            <div className="text-lg font-mono font-bold text-foreground">
              {economy.deriveEstimee !== null 
                ? `~${economy.deriveEstimee}%` 
                : "—"}
            </div>
            <div className="text-xs text-muted-foreground">
              {economy.deriveLabel}
            </div>
          </div>
        </div>
        
        {/* Coût O2 estimé (ml/kg/km) — métrique physiologique */}
        {o2CostResult && (
          <div className="p-3 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Coût O₂ estimé</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {o2CostResult.sourceLabel}
                </Badge>
              </div>
              <span className="text-xs">{o2CostResult.levelEmoji}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono font-bold text-foreground">
                {o2CostResult.value}
              </span>
              <span className="text-sm text-muted-foreground">ml/kg/km</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>{o2CostResult.levelLabel}</span>
              <span className="italic">{o2CostResult.referenceRange}</span>
            </div>
            {o2CostResult.source === 'acsm' && (
              <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                ⚠️ Estimation ACSM (allure seule). Pour une estimation plus précise, ajoutez la puissance de course (Stryd/Garmin) et le poids.
              </p>
            )}
          </div>
        )}
        
        {/* Échelle d'économie - Staff */}
        {staffMode && (
          <Collapsible>
            <CollapsibleTrigger className="w-full">
              <div className="p-3 rounded-lg bg-muted/30 border border-border hover:bg-muted/50 transition-colors cursor-pointer flex items-center justify-between">
                <div className="text-xs font-medium text-foreground flex items-center gap-2">
                  <Info className="h-3 w-3" />
                  Seuils Staff-Grade (Interprétation)
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-3 rounded-lg bg-secondary/20 border border-border">
                <div className="grid gap-2 text-xs">
                  <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 font-medium text-green-600">
                      <span>🟢</span> Très bonne économie
                    </div>
                    <p className="text-muted-foreground mt-1">
                      FC stable, faible dérive (&lt;5%), allure soutenue confortable → <strong>Bonus Potentiel Physiologique CAP</strong>
                    </p>
                  </div>
                  <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                    <div className="flex items-center gap-2 font-medium text-yellow-600">
                      <span>🟡</span> Économie correcte
                    </div>
                    <p className="text-muted-foreground mt-1">
                      Légère dérive (5-8%), stabilité acceptable → Potentiel Physiologique neutre
                    </p>
                  </div>
                  <div className="p-2 rounded bg-orange-500/10 border border-orange-500/20">
                    <div className="flex items-center gap-2 font-medium text-orange-600">
                      <span>🟠</span> Économie faible
                    </div>
                    <p className="text-muted-foreground mt-1">
                      Dérive rapide (8-12%), hausse FC à allure constante → <strong>Pénalité Potentiel Physiologique CAP</strong>
                    </p>
                  </div>
                  <div className="p-2 rounded bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 font-medium text-red-600">
                      <span>🔴</span> Économie très faible
                    </div>
                    <p className="text-muted-foreground mt-1">
                      FC élevée, dérive critique (&gt;12%) → <strong>Facteur limitant majeur</strong>
                    </p>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Interprétation */}
        <div className={cn("p-3 rounded-lg border", getEconomyColorClass(economy.color))}>
          <div className="flex items-start gap-3">
            {getLevelIcon()}
            <div>
              <p className="text-sm font-medium text-foreground">
                {economy.analysisMessage}
              </p>
            </div>
          </div>
        </div>
        
        {/* Impact sur Potentiel Physiologique */}
        {economy.capScore !== null && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                Impact sur Potentiel Physiologique
              </span>
            </div>
            <p className="text-sm text-destructive/80">
              Score plafonné à <strong>{economy.capScore}%</strong> — {economy.capMessage}
            </p>
            <p className="text-xs text-destructive/60 mt-1">
              Un bon métabolisme NE COMPENSE PAS une mauvaise économie de course.
            </p>
          </div>
        )}
        
        {/* 🍞 LIEN NUTRITION - NOUVEAU */}
        {economy.nutritionImpact && (
          <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Utensils className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-foreground">Impact Nutritionnel</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {economy.nutritionImpact}
            </p>
            <p className="text-xs text-amber-600 mt-2">
              💡 Deux athlètes au même rythme peuvent avoir des besoins nutritionnels très différents selon leur économie.
            </p>
          </div>
        )}
        
        {/* Leviers d'optimisation */}
        {economy.optimisationLevier.length > 0 && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Leviers d'optimisation</span>
            </div>
            <ul className="space-y-1">
              {economy.optimisationLevier.map((levier, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  {levier}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Lien VLamax/TTE */}
        {economy.metabolicImpact && (
          <div className="p-3 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-medium text-foreground">Lien VLamax / TTE</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {economy.metabolicImpact}
            </p>
            {vlamax !== null && (
              <p className="text-xs text-muted-foreground mt-1">
                VLamax actuel: <span className="font-mono font-bold">{vlamax.toFixed(2)}</span>
              </p>
            )}
          </div>
        )}
        
        {/* Données utilisées - collapsible */}
        <Collapsible>
          <CollapsibleTrigger className="w-full">
            <div className="p-2 rounded-lg bg-muted/20 border border-dashed border-border hover:bg-muted/30 transition-colors cursor-pointer flex items-center justify-between">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <BookOpen className="h-3 w-3" />
                Données utilisées & Méthodologie
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border space-y-2">
              <p className="text-xs font-medium text-foreground">Données estimées à partir de :</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                {RUNNING_ECONOMY_METHODOLOGY.dataUsed.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground italic mt-2">
                {RUNNING_ECONOMY_METHODOLOGY.noLabRequired}
              </p>
              <div className="p-2 rounded bg-warning/10 border border-warning/20 mt-2">
                <p className="text-xs text-warning">
                  ⚠️ {RUNNING_ECONOMY_METHODOLOGY.disclaimer}
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
