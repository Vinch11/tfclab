/**
 * VLamaxV2DisplayCard — Carte d'affichage VLamax calibrée TFCL V2 Staff-Grade
 * Affiche:
 * - Athlète: ≈ 0.39 (jamais la valeur brute)
 * - Staff: 0.39 ± 0.05 + source badge
 * - Percentile, plage TFCL, warning de variation
 * - Comparaison avec cibles par ambition
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Zap, 
  AlertTriangle, 
  Target,
  TrendingUp,
  Lock,
  Info,
  ArrowDown,
  ArrowUp,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  calibrateVLamaxV2,
  ObjectifPrincipal,
  getConfidenceBadgeClass,
} from "@/lib/reference";
import type { VLamaxV2Result } from "@/lib/v2/vlamaxV2Engine";
import {
  formatVLamaxAthlete,
  formatVLamaxStaff,
  getV2SourceColor,
  getV2SourceLabel,
  getV2SourceEmoji,
  getV2SourceBgColor,
  VLAMAX_V2_ACADEMY_TEXT,
} from "@/lib/v2/vlamaxV2Engine";
import { getVLamaxRange, normalizeObjective, type VLamaxTargets } from "@/lib/physiologicalTargets";
import { AmbitionLevel, DEFAULT_AMBITION, getAmbitionDefinition } from "@/types/ambitionLevel";

interface VLamaxV2DisplayCardProps {
  objectif: ObjectifPrincipal;
  vlamax: number;
  vlamaxSource?: "estimation" | "test_terrain" | "test_labo";
  vo2max?: number;
  sex?: "H" | "F";
  age?: number;
  compact?: boolean;
  /** Mode staff: affiche marge d'erreur + source + détails */
  staffMode?: boolean;
  /** Résultat V2 complet (si disponible, enrichit l'affichage) */
  v2Result?: VLamaxV2Result;
  /** Niveau d'ambition pour les cibles */
  ambition?: AmbitionLevel;
  /** Sport principal (cap | bike | tri) pour offset des cibles VLamax */
  sport?: string;
}

export function VLamaxV2DisplayCard({
  objectif,
  vlamax,
  vlamaxSource = "estimation",
  vo2max,
  sex,
  age,
  compact = false,
  staffMode = false,
  v2Result,
  ambition = DEFAULT_AMBITION,
  sport,
}: VLamaxV2DisplayCardProps) {
  // Valeur manquante ou invalide
  if (!Number.isFinite(vlamax) || vlamax <= 0) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Calibration TFCL indisponible</p>
            <p className="text-xs">Renseigner une VLamax (test ou estimation)</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calibrer VLamax avec le système TFCL V2
  const display = calibrateVLamaxV2({
    objectif,
    vlamax,
    vlamaxSource,
    vo2max,
    sex,
    age,
  });

  if (!display) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">VLamax non calibrée</p>
            <p className="text-xs">Objectif non reconnu</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const zoneColors: Record<string, string> = {
    OPTIMAL: "text-green-600 dark:text-green-400",
    LOW: "text-blue-600 dark:text-blue-400",
    HIGH: "text-amber-600 dark:text-amber-400",
    VERY_LOW: "text-cyan-600 dark:text-cyan-400",
    VERY_HIGH: "text-red-600 dark:text-red-400",
  };

  const zoneBgColors: Record<string, string> = {
    OPTIMAL: "bg-green-500",
    LOW: "bg-blue-500",
    HIGH: "bg-amber-500",
    VERY_LOW: "bg-cyan-500",
    VERY_HIGH: "bg-red-500",
  };

  // Position du percentile sur la barre (0-100)
  const percentilePosition = Math.min(100, Math.max(0, display.percentile));

  // Formatage selon mode
  const displayValue = v2Result
    ? (staffMode ? formatVLamaxStaff(v2Result) : formatVLamaxAthlete(v2Result))
    : (staffMode ? `${display.value.toFixed(2)}` : `≈ ${display.value.toFixed(2)}`);

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 cursor-help">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className="font-mono font-bold">{displayValue}</span>
              {v2Result?.isLocked && <Lock className="h-3 w-3 text-blue-500" />}
              <Badge variant="outline" className="text-[10px]">
                P{display.percentile}
              </Badge>
              <span className={cn("text-sm", zoneColors[display.zone])}>
                {display.zoneLabel}
              </span>
              {v2Result?.variationWarning && (
                <AlertTriangle className="h-3 w-3 text-amber-500" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs space-y-1">
            <p className="text-xs">{display.interpretation}</p>
            {v2Result && staffMode && (
              <p className="text-xs text-muted-foreground">{v2Result.details}</p>
            )}
            {v2Result?.variationWarning && (
              <p className="text-xs text-amber-500">{v2Result.variationMessage}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          VLamax TFCL V2
          {v2Result?.isLocked && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Lock className="h-3 w-3" /> Verrouillée
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Valeur principale */}
        <div className="text-center">
          <div className="text-3xl font-bold tracking-tight font-mono">
            {displayValue}
          </div>
          <div className="text-xs text-muted-foreground">
            {display.unit}
          </div>
          {/* Staff: marge d'erreur + source */}
          {staffMode && v2Result && (
            <div className="mt-1 flex items-center justify-center gap-2 text-xs">
              <Badge 
                variant="outline" 
                className={cn(
                  "text-[10px] gap-1",
                  getV2SourceBgColor(v2Result.source),
                  getV2SourceColor(v2Result.source)
                )}
              >
                <span>{getV2SourceEmoji(v2Result.source)}</span>
                {getV2SourceLabel(v2Result.source)}
              </Badge>
              <span className="text-muted-foreground">
                ± {v2Result.errorMargin.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Warning variation */}
        {v2Result?.variationWarning && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {v2Result.variationMessage}
            </p>
          </div>
        )}

        {/* Zone et Percentile */}
        <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className={cn("text-sm font-medium", zoneColors[display.zone])}>
              {display.zoneLabel}
            </span>
          </div>
          <Badge variant="outline" className="font-mono">
            P{display.percentile}
          </Badge>
        </div>

        {/* Barre de percentile visuelle */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>P10</span>
            <span>P25</span>
            <span>P50</span>
            <span>P75</span>
            <span>P90</span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            {/* Zone optimale P25-P75 */}
            <div 
              className="absolute h-full bg-green-200 dark:bg-green-900/50"
              style={{ left: "25%", width: "50%" }}
            />
            {/* Plage d'erreur (si V2) */}
            {v2Result?.range && (
              <div 
                className="absolute h-full bg-amber-200/50 dark:bg-amber-900/30"
                style={{ 
                  left: `${Math.max(0, percentilePosition - v2Result.errorMargin * 100)}%`, 
                  width: `${Math.min(100, v2Result.errorMargin * 200)}%` 
                }}
              />
            )}
            {/* Indicateur de position */}
            <div 
              className={cn("absolute w-3 h-3 rounded-full -top-0.5 transform -translate-x-1/2 border-2 border-background", zoneBgColors[display.zone])}
              style={{ left: `${percentilePosition}%` }}
            />
          </div>
        </div>

        {/* Comparaison avec cibles par ambition */}
        <VLamaxTargetComparison 
          vlamax={vlamax} 
          objectif={objectif} 
          ambition={ambition} 
          sport={sport}
        />

        {/* Interprétation */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs">{display.interpretation}</p>
          </div>
        </div>

        {/* Staff: détails techniques */}
        {staffMode && v2Result && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground cursor-help">
                  <Info className="h-3 w-3" />
                  <span>{v2Result.details}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="text-xs font-medium mb-1">{VLAMAX_V2_ACADEMY_TEXT.title}</p>
                <p className="text-xs text-muted-foreground whitespace-pre-line">
                  {VLAMAX_V2_ACADEMY_TEXT.body}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================
// SUB-COMPONENT: Comparaison VLamax vs Cibles
// =============================================

function VLamaxTargetComparison({ 
  vlamax, 
  objectif, 
  ambition,
  sport,
}: { 
  vlamax: number; 
  objectif: ObjectifPrincipal; 
  ambition: AmbitionLevel;
  sport?: string;
}) {
  const normalizedObj = normalizeObjective(objectif);
  const targets = getVLamaxRange(normalizedObj, ambition, sport);
  const ambitionDef = getAmbitionDefinition(ambition);

  if (!targets) return null;

  const isTooHigh = vlamax > targets.max;
  const isTooLow = vlamax < targets.min;
  const isOptimal = vlamax >= targets.min && vlamax <= targets.max;
  const delta = isTooHigh 
    ? vlamax - targets.max 
    : isTooLow 
      ? vlamax - targets.min 
      : vlamax - targets.optimal;

  const statusColor = isOptimal 
    ? "text-green-600 dark:text-green-400" 
    : isTooHigh 
      ? "text-amber-600 dark:text-amber-400" 
      : "text-blue-600 dark:text-blue-400";
  
  const statusBg = isOptimal 
    ? "bg-green-500/10 border-green-500/30" 
    : isTooHigh 
      ? "bg-amber-500/10 border-amber-500/30" 
      : "bg-blue-500/10 border-blue-500/30";

  const StatusIcon = isOptimal ? Check : isTooHigh ? ArrowUp : ArrowDown;

  const statusLabel = isOptimal 
    ? "Dans la cible" 
    : isTooHigh 
      ? "Au-dessus de la cible" 
      : "En-dessous de la cible";

  const explanation = isOptimal
    ? `VLamax dans la plage optimale (${targets.min.toFixed(2)}–${targets.max.toFixed(2)}) pour un ${normalizedObj} niveau ${ambitionDef.label}.`
    : isTooHigh
      ? `VLamax trop élevée (+${delta.toFixed(2)}) par rapport au max ${targets.max.toFixed(2)} pour un ${normalizedObj} ${ambitionDef.label}. Dépendance glycolytique excessive — privilégier Z2/Tempo, réduire le travail VMA/Sprint.`
      : `VLamax basse (${Math.abs(delta).toFixed(2)} sous le min ${targets.min.toFixed(2)}) pour un ${normalizedObj} ${ambitionDef.label}. Capacité anaérobie réduite — possible manque de punch en fin de course.`;

  return (
    <div className={cn("p-3 rounded-lg border", statusBg)}>
      <div className="flex items-center gap-2 mb-2">
        <StatusIcon className={cn("h-4 w-4", statusColor)} />
        <span className={cn("text-xs font-semibold", statusColor)}>{statusLabel}</span>
        <Badge variant="outline" className="text-[10px] ml-auto">
          {ambitionDef.icon} {ambitionDef.label}
        </Badge>
      </div>
      
      {/* Barre visuelle cible vs actuel */}
      <div className="relative h-6 bg-muted/50 rounded-full overflow-hidden mb-2">
        {/* Zone cible */}
        <div 
          className="absolute h-full bg-green-200/60 dark:bg-green-800/30"
          style={{ 
            left: `${Math.max(0, ((targets.min - 0.15) / 0.90) * 100)}%`, 
            width: `${((targets.max - targets.min) / 0.90) * 100}%` 
          }}
        />
        {/* Optimal marker */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-green-600 dark:bg-green-400"
          style={{ left: `${((targets.optimal - 0.15) / 0.90) * 100}%` }}
        />
        {/* Athlete position */}
        <div 
          className={cn("absolute top-1 bottom-1 w-3 rounded-full border-2 border-background", 
            isOptimal ? "bg-green-500" : isTooHigh ? "bg-amber-500" : "bg-blue-500"
          )}
          style={{ left: `${Math.min(95, Math.max(2, ((vlamax - 0.15) / 0.90) * 100))}%`, transform: 'translateX(-50%)' }}
        />
      </div>

      {/* Labels */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
        <span>Cible: {targets.min.toFixed(2)}–{targets.max.toFixed(2)}</span>
        <span>Optimal: {targets.optimal.toFixed(2)}</span>
        <span>Δ {delta >= 0 ? '+' : ''}{delta.toFixed(2)}</span>
      </div>

      <p className="text-[11px] text-muted-foreground">{explanation}</p>
    </div>
  );
}
