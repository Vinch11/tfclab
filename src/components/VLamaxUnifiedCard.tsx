/**
 * VLamaxUnifiedCard — Carte VLamax consolidée (Phase 1 UX)
 * Remplace: VLamaxV2DisplayCard, VLamaxExplainedCard, VLamaxRunExplainedCard,
 *           VLamaxCombinedCard, VLamaxCAPCard
 * 
 * Architecture:
 * - Header: valeur principale + zone + confiance
 * - Onglets internes: Vélo / CAP / Comparaison (contextuels)
 * - Sections collapsibles: Analyse, Calibration, Éducation
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatedTabsContent } from "@/components/ui/animated-tabs-content";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Zap,
  Bike,
  Footprints,
  ChevronDown,
  Info,
  Target,
  Check,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Lock,
  HelpCircle,
  TrendingUp,
  Brain,
  RefreshCw,
  CheckCircle,
  Cloud,
  CloudOff,
  Loader2,
  TrendingDown,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LazyTabsContent } from "@/components/ui/lazy-tabs-content";
import { SwipeableTabsContent } from "@/components/ui/swipeable-tabs";
import {
  calibrateVLamaxV2,
  ObjectifPrincipal,
} from "@/lib/reference";
import { getConfidenceBadgeClass } from "@/lib/scoreEnvelope";
import type { VLamaxV2Result } from "@/lib/v2/vlamaxV2Engine";
import {
  formatVLamaxAthlete,
  formatVLamaxStaff,
  getV2SourceColor,
  getV2SourceLabel,
  getV2SourceEmoji,
  getV2SourceBgColor,
} from "@/lib/v2/vlamaxV2Engine";
import { getVLamaxRange, normalizeObjective } from "@/lib/physiologicalTargets";
import { AmbitionLevel, DEFAULT_AMBITION, getAmbitionDefinition } from "@/types/ambitionLevel";
import { VLamaxInterpretationPanel } from "@/components/VLamaxInterpretationPanel";
import {
  getAgeAdjustedVLamaxProfil,
  type VLamaxProfil,
} from "@/lib/ageAdjustment";
import type { VLamaxEffectif } from "@/engines/diagnostic";
import { getConfidenceLabel, getConfidenceColorClass } from "@/lib/confidenceDisplay";
import { useRunningFocusMode } from "@/hooks/useRunningFocusMode";
import { useCalibrationEvidence } from "@/hooks/useCalibrationEvidence";
import { useRunningProfileCloud } from "@/hooks/useRunningProfileCloud";
import { RUNNING_RACE_LABELS, type RunningRaceType } from "@/lib/runningFocusMode";
import { RunMLSSCoherenceCard } from "@/components/RunMLSSCoherenceCard";

// =============================================
// TYPES
// =============================================

export interface VLamaxUnifiedCardProps {
  // Core data
  vlamaxEffectif: VLamaxEffectif;
  objectif: string;
  age?: number | null;
  sex?: "H" | "M" | "F";
  staffMode?: boolean;
  ambition?: AmbitionLevel;
  /** Sport principal (cap | bike | tri) pour offset des cibles VLamax */
  sport?: string;
  
  // Bike-specific
  ftp?: number | null;
  v2Result?: VLamaxV2Result;
  bikeInput?: {
    ftp: number;
    p30s_w: number | null;
    p60s_w: number | null;
    map5min_w: number | null;
    tte_min: number;
    pmax_5s?: number;
    weight_kg?: number;
    protocol_quality?: 1 | 2 | 3 | 4 | 5;
    objectif: string;
    vo2max?: number;
    sex?: "H" | "F";
  };
  
  // Run-specific
  vlamaxRun?: number | null;
  athleteId?: string;
  vo2max?: number | null;
  economyScore?: number | null;
  /** Run MLSS coherence (Modèle C) — depuis diagnostic.runMLSS */
  runMLSS?: import("@/engines/diagnostic").AthleteDiagnostic["runMLSS"];

  // Display options
  isTriathlon?: boolean;
  isRunningOnly?: boolean;
  className?: string;
}

// =============================================
// PROFILE CONFIG (shared)
// =============================================

const PROFILE_CONFIG: Record<VLamaxProfil, {
  color: string;
  bgColor: string;
  label: string;
}> = {
  diesel: { color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-500/10", label: "Diesel" },
  endurant: { color: "text-cyan-600 dark:text-cyan-400", bgColor: "bg-cyan-500/10", label: "Endurant" },
  equilibre: { color: "text-green-600 dark:text-green-400", bgColor: "bg-green-500/10", label: "Équilibré" },
  explosif: { color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-500/10", label: "Explosif" },
  sprinter: { color: "text-red-600 dark:text-red-400", bgColor: "bg-red-500/10", label: "Sprinter" },
};

// =============================================
// MAIN COMPONENT
// =============================================

export function VLamaxUnifiedCard({
  vlamaxEffectif,
  objectif,
  age,
  sex = "H",
  staffMode = false,
  ambition = DEFAULT_AMBITION,
  sport,
  ftp,
  v2Result,
  bikeInput,
  vlamaxRun,
  athleteId,
  vo2max,
  economyScore,
  runMLSS,
  isTriathlon = false,
  isRunningOnly = false,
  className,
}: VLamaxUnifiedCardProps) {
  const [showEducation, setShowEducation] = useState(false);
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);
  
  const vlamaxBike = vlamaxEffectif.value;

  // Determine available tabs
  const showBike = !isRunningOnly;
  const showRun = isTriathlon || isRunningOnly;
  const showComparison = isTriathlon && vlamaxBike !== null && vlamaxRun != null;

  const defaultTab = isRunningOnly ? "run" : "bike";
  const effectiveTab = activeTab ?? defaultTab;

  // ✅ Cohérence: la valeur affichée et la cible suivent l'onglet actif.
  // En triathlon, l'onglet CAP doit refléter vlamaxRun, pas vlamaxBike.
  const isOnRunTab = effectiveTab === "run";
  const vlamax = isOnRunTab && vlamaxRun != null ? vlamaxRun : vlamaxBike;

  // Profile for header (basé sur la valeur de l'onglet actif)
  const { profil } = useMemo(
    () => getAgeAdjustedVLamaxProfil(vlamax, age),
    [vlamax, age]
  );

  const profileConfig = PROFILE_CONFIG[profil];
  
  // Unavailable state
  if (vlamax === null || !Number.isFinite(vlamax) || vlamax <= 0) {
    return (
      <Card className={cn("overflow-hidden opacity-60", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            VLamax TFCL™
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <Zap className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">VLamax non disponible</p>
            <p className="text-xs mt-1">Renseigner un test ou snapshot avec Pmax/FTP</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Display value — utilise v2Result uniquement sur l'onglet Vélo (v2Result est calibré vélo)
  const displayValue = v2Result && !isOnRunTab
    ? (staffMode ? formatVLamaxStaff(v2Result) : formatVLamaxAthlete(v2Result))
    : (staffMode ? `${vlamax.toFixed(2)}` : `≈ ${vlamax.toFixed(2)}`);

  // Cibles alignées sur l'onglet actif (Vélo vs CAP)
  const normalizedObj = normalizeObjective(objectif as ObjectifPrincipal);
  const sportForTargets = isOnRunTab ? "cap" : (sport === "run" ? "cap" : sport);
  const targets = getVLamaxRange(normalizedObj, ambition, sportForTargets);
  const ambitionDef = getAmbitionDefinition(ambition);
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* ═══ HEADER: Valeur + Zone + Confiance ═══ */}
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            VLamax TFCL™
            {v2Result?.isLocked && (
              <Lock className="h-3 w-3 text-blue-500" />
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-xs", profileConfig.color)}>
              {profileConfig.label}
            </Badge>
            <Badge variant="outline" className={cn("text-xs", getConfidenceBadgeClass(vlamaxEffectif.confidence * 100))}>
              {getConfidenceLabel(vlamaxEffectif.confidence)}
            </Badge>
          </div>
        </div>
        
        {/* Valeur principale compacte */}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-3xl font-bold tracking-tight font-mono">
            {displayValue}
          </span>
          <span className="text-xs text-muted-foreground">mmol/L/s</span>
          {staffMode && v2Result && (
            <Badge 
              variant="outline" 
              className={cn("text-[10px] gap-1", getV2SourceBgColor(v2Result.source), getV2SourceColor(v2Result.source))}
            >
              {getV2SourceEmoji(v2Result.source)} {getV2SourceLabel(v2Result.source)}
            </Badge>
          )}
          {staffMode && v2Result && (
            <span className="text-xs text-muted-foreground">± {v2Result.errorMargin.toFixed(2)}</span>
          )}
        </div>
        
        {/* Variation warning */}
        {v2Result?.variationWarning && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">{v2Result.variationMessage}</p>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4 pt-0">
        {/* ═══ TARGET COMPARISON (always visible) ═══ */}
        {targets && (
          <TargetComparisonBar vlamax={vlamax} targets={targets} ambitionDef={ambitionDef} />
        )}
        
        {/* ═══ TABS: Vélo / CAP / Comparaison ═══ */}
        {(showBike && showRun) ? (
          <Tabs value={effectiveTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${showComparison ? 3 : 2}, 1fr)` }}>
              {showBike && (
                <TabsTrigger value="bike" className="text-xs sm:text-sm gap-1 min-h-[44px]">
                  <Bike className="h-3 w-3" /> Vélo
                </TabsTrigger>
              )}
              {showRun && (
                <TabsTrigger value="run" className="text-xs sm:text-sm gap-1 min-h-[44px]">
                  <Footprints className="h-3 w-3" /> CAP
                </TabsTrigger>
              )}
              {showComparison && (
                <TabsTrigger value="compare" className="text-xs sm:text-sm min-h-[44px]">
                  Comparaison
                </TabsTrigger>
              )}
            </TabsList>

            <SwipeableTabsContent 
              tabs={[...(showBike ? ["bike"] : []), ...(showRun ? ["run"] : []), ...(showComparison ? ["compare"] : [])]} 
              activeTab={effectiveTab} 
              onTabChange={setActiveTab}
            >
            
            {showBike && (
              <AnimatedTabsContent value="bike" activeValue={effectiveTab} className="mt-3 space-y-3">
                <BikeAnalysisSection
                  vlamax={vlamax}
                  age={age}
                  objectif={objectif}
                  bikeInput={bikeInput}
                  ambitionLevel={ambition as "finisher" | "performance" | "podium" | "elite"}
                />
              </AnimatedTabsContent>
            )}
            
            {showRun && (
              <LazyTabsContent value="run" activeValue={effectiveTab} className="mt-3 space-y-3">
                <RunAnalysisSection
                  vlamax={vlamaxRun ?? vlamax}
                  age={age}
                  objectif={objectif}
                  athleteId={athleteId}
                  vlamaxSource={vlamaxEffectif.source}
                  vlamaxConfidence={vlamaxEffectif.confidence}
                  vo2max={vo2max}
                  economyScore={economyScore}
                />
                {runMLSS && <RunMLSSCoherenceCard runMLSS={runMLSS} variant="card" />}
              </LazyTabsContent>
            )}
            
            {showComparison && (
              <LazyTabsContent value="compare" activeValue={effectiveTab} className="mt-3 space-y-3">
                <ComparisonSection
                  vlamaxBike={vlamax}
                  vlamaxRun={vlamaxRun!}
                  age={age}
                  objectif={objectif}
                />
              </LazyTabsContent>
            )}
            </SwipeableTabsContent>
          </Tabs>
        ) : showBike ? (
          <BikeAnalysisSection
            vlamax={vlamax}
            age={age}
            objectif={objectif}
            bikeInput={bikeInput}
            ambitionLevel={ambition as "finisher" | "performance" | "podium" | "elite"}
          />
        ) : (
          <>
            <RunAnalysisSection
              vlamax={vlamax}
              age={age}
              objectif={objectif}
              athleteId={athleteId}
              vlamaxSource={vlamaxEffectif.source}
              vlamaxConfidence={vlamaxEffectif.confidence}
              vo2max={vo2max}
              economyScore={economyScore}
            />
            {runMLSS && <RunMLSSCoherenceCard runMLSS={runMLSS} variant="card" className="mt-3" />}
          </>
        )}
        
        {/* ═══ ÉDUCATION (collapsible) ═══ */}
        <Collapsible open={showEducation} onOpenChange={setShowEducation}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
              <span className="flex items-center gap-2">
                <HelpCircle className="h-3 w-3" />
                Qu'est-ce que le VLamax ?
              </span>
              <ChevronDown className={cn("h-3 w-3 transition-transform", showEducation && "rotate-180")} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2 text-xs text-muted-foreground">
            <p>
              <strong>VLamax</strong> (Vitesse maximale de production de lactate) mesure la capacité 
              du système glycolytique à produire de l'énergie rapidement.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-cyan-500/10 rounded">
                <p className="font-medium text-cyan-700 dark:text-cyan-300">VLamax basse (&lt;0.40)</p>
                <p className="mt-1">Profil endurant. Idéal Ironman, marathon.</p>
              </div>
              <div className="p-2 bg-red-500/10 rounded">
                <p className="font-medium text-red-700 dark:text-red-300">VLamax élevée (&gt;0.60)</p>
                <p className="mt-1">Profil explosif. Sprint, efforts courts.</p>
              </div>
            </div>
            <p className="italic">
              VLamax élevé n'est ni bon ni mauvais — c'est un trait métabolique à adapter à l'objectif.
            </p>
          </CollapsibleContent>
        </Collapsible>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 pt-2 border-t text-[10px] text-muted-foreground">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          <span>Estimation Two For Coaching Lab™ — Ne remplace pas un test lactate.</span>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================
// SUB: Target Comparison Bar (compact)
// =============================================

function TargetComparisonBar({ 
  vlamax, 
  targets, 
  ambitionDef 
}: { 
  vlamax: number; 
  targets: { min: number; max: number; optimal: number }; 
  ambitionDef: { label: string; icon: string };
}) {
  const isOptimal = vlamax >= targets.min && vlamax <= targets.max;
  const isTooHigh = vlamax > targets.max;
  const delta = isTooHigh ? vlamax - targets.max : vlamax < targets.min ? vlamax - targets.min : vlamax - targets.optimal;
  
  const statusColor = isOptimal 
    ? "text-green-600 dark:text-green-400" 
    : isTooHigh ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400";
  const statusBg = isOptimal 
    ? "bg-green-500/10 border-green-500/30" 
    : isTooHigh ? "bg-amber-500/10 border-amber-500/30" : "bg-blue-500/10 border-blue-500/30";
  const StatusIcon = isOptimal ? Check : isTooHigh ? ArrowUp : ArrowDown;
  const statusLabel = isOptimal ? "Dans la cible" : isTooHigh ? "Au-dessus" : "En-dessous";

  return (
    <div className={cn("p-2.5 rounded-lg border", statusBg)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <StatusIcon className={cn("h-3.5 w-3.5", statusColor)} />
          <span className={cn("text-xs font-semibold", statusColor)}>{statusLabel}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Cible: {targets.min.toFixed(2)}–{targets.max.toFixed(2)}</span>
          <span className="font-mono">Δ {delta >= 0 ? '+' : ''}{delta.toFixed(2)}</span>
          <Badge variant="outline" className="text-[9px] px-1">
            {ambitionDef.icon} {ambitionDef.label}
          </Badge>
        </div>
      </div>
      
      {/* Mini bar */}
      <div className="relative h-1.5 bg-muted rounded-full overflow-hidden mt-2">
        <div 
          className="absolute h-full bg-green-200/60 dark:bg-green-800/30"
          style={{ 
            left: `${Math.max(0, ((targets.min - 0.15) / 0.90) * 100)}%`, 
            width: `${((targets.max - targets.min) / 0.90) * 100}%` 
          }}
        />
        <div 
          className={cn("absolute top-0 bottom-0 w-2.5 h-2.5 rounded-full border-2 border-background -mt-0.5", 
            isOptimal ? "bg-green-500" : isTooHigh ? "bg-amber-500" : "bg-blue-500"
          )}
          style={{ left: `${Math.min(95, Math.max(2, ((vlamax - 0.15) / 0.90) * 100))}%`, transform: 'translateX(-50%)' }}
        />
      </div>
    </div>
  );
}

// =============================================
// SUB: Bike Analysis Section
// =============================================

function BikeAnalysisSection({
  vlamax,
  age,
  objectif,
  bikeInput,
  ambitionLevel,
}: {
  vlamax: number;
  age?: number | null;
  objectif: string;
  bikeInput?: VLamaxUnifiedCardProps["bikeInput"];
  ambitionLevel?: "finisher" | "performance" | "podium" | "elite";
}) {
  return (
    <VLamaxInterpretationPanel
      vlamax={vlamax}
      age={age}
      sport="bike"
      objectif={objectif}
      showAgeContext={true}
      showActions={true}
    />
  );
}

// =============================================
// SUB: Run Analysis Section
// =============================================

function RunAnalysisSection({
  vlamax,
  age,
  objectif,
  athleteId,
  vlamaxSource,
  vlamaxConfidence,
  vo2max,
  economyScore,
}: {
  vlamax: number;
  age?: number | null;
  objectif: string;
  athleteId?: string;
  vlamaxSource?: string;
  vlamaxConfidence?: number;
  vo2max?: number | null;
  economyScore?: number | null;
}) {
  // Calibration data if available
  const { raceType, targets: runTargets } = useRunningFocusMode();
  
  return (
    <div className="space-y-3">
      <VLamaxInterpretationPanel
        vlamax={vlamax}
        age={age}
        sport="run"
        objectif={objectif}
        showAgeContext={true}
        showActions={true}
      />
      
      {/* Run-specific metrics */}
      {(vo2max || economyScore) && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {vo2max && (
            <div className="p-2 bg-muted/30 rounded">
              <span className="text-muted-foreground">VO2max:</span>
              <span className="ml-1 font-medium">{vo2max} ml/kg/min</span>
            </div>
          )}
          {economyScore !== null && economyScore !== undefined && (
            <div className="p-2 bg-muted/30 rounded">
              <span className="text-muted-foreground">Économie:</span>
              <span className="ml-1 font-medium">{economyScore}/100</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================
// SUB: Comparison Section (Triathlon)
// =============================================

function ComparisonSection({
  vlamaxBike,
  vlamaxRun,
  age,
  objectif,
}: {
  vlamaxBike: number;
  vlamaxRun: number;
  age?: number | null;
  objectif: string;
}) {
  const bikeProfil = useMemo(() => getAgeAdjustedVLamaxProfil(vlamaxBike, age), [vlamaxBike, age]);
  const runProfil = useMemo(() => getAgeAdjustedVLamaxProfil(vlamaxRun, age), [vlamaxRun, age]);
  const delta = vlamaxBike - vlamaxRun;
  
  const bikeConfig = PROFILE_CONFIG[bikeProfil.profil];
  const runConfig = PROFILE_CONFIG[runProfil.profil];
  
  return (
    <div className="space-y-3">
      {/* Side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className={cn("p-3 rounded-lg border", bikeConfig.bgColor)}>
          <div className="flex items-center gap-2 mb-1">
            <Bike className={cn("h-4 w-4", bikeConfig.color)} />
            <span className="text-xs text-muted-foreground">Vélo</span>
          </div>
          <p className={cn("text-2xl font-bold font-mono", bikeConfig.color)}>
            {vlamaxBike.toFixed(2)}
          </p>
          <Badge variant="outline" className={cn("text-[10px] mt-1", bikeConfig.color)}>
            {bikeConfig.label}
          </Badge>
        </div>
        
        <div className={cn("p-3 rounded-lg border", runConfig.bgColor)}>
          <div className="flex items-center gap-2 mb-1">
            <Footprints className={cn("h-4 w-4", runConfig.color)} />
            <span className="text-xs text-muted-foreground">CAP</span>
          </div>
          <p className={cn("text-2xl font-bold font-mono", runConfig.color)}>
            {vlamaxRun.toFixed(2)}
          </p>
          <Badge variant="outline" className={cn("text-[10px] mt-1", runConfig.color)}>
            {runConfig.label}
          </Badge>
        </div>
      </div>
      
      {/* Delta analysis */}
      <div className="p-3 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2 mb-1">
          <Info className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">Analyse Δ = {delta > 0 ? '+' : ''}{delta.toFixed(2)}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          {Math.abs(delta) < 0.05 ? (
            <>Profils <strong className="text-foreground">cohérents</strong>. Stratégie nutritionnelle unifiée possible.</>
          ) : delta > 0 ? (
            <>Profil <strong className="text-orange-500">plus glycolytique</strong> à vélo. Attention gestion glucides sur segment vélo.</>
          ) : (
            <>Profil <strong className="text-orange-500">plus glycolytique</strong> en CAP. Vigilance sur le marathon après vélo.</>
          )}
        </p>
      </div>
    </div>
  );
}
