/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL LONG DISTANCE PACING ENVELOPE™ — Graphique Signature Dual-Layer
 * Two For Coaching Lab Method™
 * 
 * Visualisation complète pour épreuves longue distance:
 * - Layer 1: Barre d'intensité (Safe/Risk/Forbidden)
 * - Layer 2: Gradient temporel de risque
 * - Marqueurs: Discipline Target, Glycogen Threshold, FatMax
 * - Scénarios: Disciplined / Ambitious / Aggressive
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  AlertTriangle, 
  Shield, 
  Target, 
  Flame, 
  Clock, 
  TrendingDown,
  Zap,
  Battery,
  BatteryLow,
  BatteryWarning
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LongDistanceEnvelopeResult, PacingScenario } from "@/lib/v2/pacingEnvelopeLongDistance";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface LongDistanceEnvelopeChartProps {
  envelope: LongDistanceEnvelopeResult;
  
  /** Intensité cible course actuelle */
  currentTargetPct?: number;
  
  /** Affichage mode staff */
  staffMode?: boolean;
  
  /** Compacte pour mobile */
  compact?: boolean;
  
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LDRI BADGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function LDRIBadge({ ldri }: { ldri: LongDistanceEnvelopeResult["ldri"] }) {
  const colors = {
    low: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    moderate: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300",
    high: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    critical: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={cn("text-[10px] cursor-help", colors[ldri.level])}>
            LDRI: {ldri.score}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-medium">{ldri.label}</p>
          <p className="text-xs text-muted-foreground mt-1">{ldri.message}</p>
          <div className="mt-2 text-xs space-y-1">
            <div className="flex justify-between">
              <span>Durée</span>
              <span className="font-mono">{ldri.components.durationRisk}</span>
            </div>
            <div className="flex justify-between">
              <span>VLamax</span>
              <span className="font-mono">{ldri.components.vlamaxRisk}</span>
            </div>
            <div className="flex justify-between">
              <span>Âge</span>
              <span className="font-mono">{ldri.components.ageRisk}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIO CARD
// ═══════════════════════════════════════════════════════════════════════════════

function ScenarioCard({ scenario, compact }: { scenario: PacingScenario; compact?: boolean }) {
  const colors = {
    green: "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20",
    orange: "border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20",
    red: "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20",
  };

  const icons = {
    disciplined: Shield,
    ambitious: Zap,
    aggressive: Flame,
  };

  const Icon = icons[scenario.type];

  return (
    <div className={cn(
      "p-3 rounded-lg border",
      colors[scenario.color],
      compact && "p-2"
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={cn(
          "h-4 w-4",
          scenario.color === "green" && "text-green-600",
          scenario.color === "orange" && "text-orange-600",
          scenario.color === "red" && "text-red-600"
        )} />
        <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
          {scenario.label}
        </span>
        <Badge variant="outline" className="text-[9px] ml-auto">
          {scenario.avgIntensityPct}%
        </Badge>
      </div>
      
      {!compact && (
        <>
          <p className="text-xs text-muted-foreground mb-2">{scenario.description}</p>
          
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-muted-foreground">Sensation début:</span>
              <p className="font-medium">{scenario.earlyFeeling}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Sensation fin:</span>
              <p className="font-medium">{scenario.lateFeeling}</p>
            </div>
          </div>
          
          <div className="mt-2 pt-2 border-t border-current/10">
            <div className="flex items-center gap-2 text-[10px]">
              <TrendingDown className="h-3 w-3" />
              <span>Décroissance finale: -{scenario.lateRaceDecayPct}%</span>
            </div>
            <p className="text-[10px] font-medium mt-1">{scenario.outcome}</p>
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GLYCOGEN INDICATOR
// ═══════════════════════════════════════════════════════════════════════════════

function GlycogenIndicator({ 
  scenario, 
  compact 
}: { 
  scenario: PacingScenario; 
  compact?: boolean;
}) {
  const multiplier = scenario.glycogenDepletionMultiplier;
  
  let Icon = Battery;
  let color = "text-green-600";
  let label = "Optimal";
  
  if (multiplier >= 1.4) {
    Icon = BatteryLow;
    color = "text-red-600";
    label = "Déplétion rapide";
  } else if (multiplier >= 1.1) {
    Icon = BatteryWarning;
    color = "text-orange-600";
    label = "Déplétion accélérée";
  }

  return (
    <div className={cn("flex items-center gap-1", compact && "text-[10px]")}>
      <Icon className={cn("h-4 w-4", color)} />
      {!compact && <span className="text-xs">{label}</span>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LongDistanceEnvelopeChart({
  envelope,
  currentTargetPct,
  staffMode = false,
  compact = false,
  className,
}: LongDistanceEnvelopeChartProps) {
  const { 
    adjustedBoundary, 
    disciplineBuffer, 
    glycogenThreshold, 
    scenarios, 
    ldri,
    penalties,
    keyMessages,
    targetDurationHours,
  } = envelope;

  // Échelle de la barre
  const scaleMin = 50;
  const scaleMax = 100;
  const scaleRange = scaleMax - scaleMin;
  
  const toBarPosition = (pct: number) => {
    return Math.max(0, Math.min(100, ((pct - scaleMin) / scaleRange) * 100));
  };

  // Positions
  const safeStart = toBarPosition(adjustedBoundary.lowPct);
  const safeEnd = toBarPosition(adjustedBoundary.highPct);
  const riskEnd = toBarPosition(adjustedBoundary.toleratedPct);
  const disciplinePos = toBarPosition(disciplineBuffer.disciplineTargetPct);
  const glycogenPos = toBarPosition(glycogenThreshold.thresholdPct);
  const targetPos = currentTargetPct ? toBarPosition(currentTargetPct) : null;

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h${m.toString().padStart(2, "0")}` : `${h}h`;
  };

  return (
    <Card className={cn("print:break-inside-avoid", className)}>
      <CardHeader className={cn("pb-2", compact && "pb-1")}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className={cn("flex items-center gap-2", compact ? "text-sm" : "text-base")}>
              <Clock className="h-4 w-4 text-primary" />
              TFCL Long Distance Envelope™
            </CardTitle>
            {!compact && (
              <CardDescription className="text-xs mt-1">
                Durée estimée: {formatDuration(targetDurationHours)} — % de {adjustedBoundary.referenceShortLabel}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <LDRIBadge ldri={ldri} />
            {penalties.totalReductionPct > 0 && (
              <Badge variant="outline" className="text-[10px] bg-purple-100 dark:bg-purple-900/30">
                Réduction: -{penalties.totalReductionPct}%
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn("space-y-4", compact && "space-y-2")}>
        {/* Avertissement LDRI élevé */}
        {(ldri.level === "high" || ldri.level === "critical") && (
          <div className={cn(
            "p-2 rounded-lg border text-xs flex items-start gap-2",
            ldri.level === "critical" 
              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
              : "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300"
          )}>
            <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div>
              <strong>{keyMessages.coachWarning}</strong>
              <p className="mt-1 text-muted-foreground">{ldri.message}</p>
            </div>
          </div>
        )}

        {/* LAYER 1: Barre d'intensité */}
        <div className="relative">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1 px-1">
            <span>{scaleMin}%</span>
            <span>Discipline Target</span>
            <span>{scaleMax}%</span>
          </div>

          <div className={cn(
            "relative w-full rounded-lg overflow-hidden",
            compact ? "h-10" : "h-12"
          )}>
            {/* Zone sous-exploitation */}
            <div 
              className="absolute top-0 h-full bg-blue-100 dark:bg-blue-900/30"
              style={{ left: 0, width: `${safeStart}%` }}
            />
            
            {/* SAFE ZONE */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="absolute top-0 h-full bg-gradient-to-r from-green-400 to-green-500 dark:from-green-600 dark:to-green-700 cursor-help flex items-center justify-center"
                    style={{ left: `${safeStart}%`, width: `${safeEnd - safeStart}%` }}
                  >
                    <div className="text-white text-[10px] font-bold drop-shadow-sm flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      <span className="hidden sm:inline">SAFE</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium text-green-600">Zone Safe Longue Distance</p>
                  <p className="text-xs">{adjustedBoundary.lowPct}–{adjustedBoundary.highPct}% {adjustedBoundary.referenceShortLabel}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* RISK ZONE */}
            <div 
              className="absolute top-0 h-full bg-gradient-to-r from-orange-400 to-orange-500 dark:from-orange-600 dark:to-orange-700 flex items-center justify-center"
              style={{ left: `${safeEnd}%`, width: `${riskEnd - safeEnd}%` }}
            >
              <span className="text-white text-[10px] font-bold hidden sm:block">RISK</span>
            </div>

            {/* FORBIDDEN ZONE */}
            <div 
              className="absolute top-0 h-full bg-gradient-to-r from-red-500 to-red-600 dark:from-red-700 dark:to-red-800 flex items-center justify-center"
              style={{ left: `${riskEnd}%`, width: `${100 - riskEnd}%` }}
            >
              <span className="text-white text-[10px] font-bold hidden sm:block">FORBIDDEN</span>
            </div>

            {/* Marqueur Discipline Target */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="absolute top-0 h-full w-1 bg-purple-600 dark:bg-purple-400 cursor-help z-10"
                    style={{ left: `${disciplinePos}%` }}
                  >
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                      🎯 {disciplineBuffer.disciplineTargetPct}%
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">Discipline Target</p>
                  <p className="text-xs">{disciplineBuffer.message}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Marqueur Glycogen Threshold */}
            {staffMode && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="absolute top-0 h-full w-0.5 border-l-2 border-dashed border-yellow-600 dark:border-yellow-400 cursor-help"
                      style={{ left: `${glycogenPos}%` }}
                    >
                      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-medium text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
                        ⚡ Glyco
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-medium">Glycogen Collapse Threshold</p>
                    <p className="text-xs mt-1">{glycogenThreshold.warningMessage}</p>
                    <p className="text-xs mt-1 text-muted-foreground">
                      Max {glycogenThreshold.maxDurationMinutes} min cumulées au-dessus
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Marqueur intensité actuelle */}
            {targetPos !== null && (
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-black shadow-lg z-20"
                style={{ left: `calc(${targetPos}% - 8px)` }}
              >
                <Target className="h-2 w-2 text-black absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
            )}
          </div>

          {/* LAYER 2: Gradient temporel de risque */}
          {!compact && staffMode && (
            <div className="mt-2">
              <div className="text-[10px] text-muted-foreground mb-1">Risque temporel →</div>
              <div 
                className="h-2 rounded-full"
                style={{
                  background: `linear-gradient(to right, 
                    hsl(var(--primary) / 0.2) 0%, 
                    hsl(var(--primary) / 0.4) 40%, 
                    hsl(var(--warning) / 0.5) 70%, 
                    hsl(var(--destructive) / 0.6) 100%)`
                }}
              />
              <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                <span>Départ</span>
                <span>Mi-course</span>
                <span>Dernier tiers</span>
              </div>
            </div>
          )}
        </div>

        {/* Valeurs clés */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800">
            <div className="text-lg font-bold font-mono text-purple-700 dark:text-purple-300">
              {disciplineBuffer.disciplineTargetPct}%
            </div>
            <div className="text-[10px] text-purple-600 dark:text-purple-400">Cible Discipline</div>
          </div>
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
            <div className="text-lg font-bold font-mono text-green-700 dark:text-green-300">
              {adjustedBoundary.lowPct}–{adjustedBoundary.highPct}%
            </div>
            <div className="text-[10px] text-green-600 dark:text-green-400">Zone Safe</div>
          </div>
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
            <div className="text-lg font-bold font-mono text-red-700 dark:text-red-300">
              &gt;{adjustedBoundary.toleratedPct}%
            </div>
            <div className="text-[10px] text-red-600 dark:text-red-400">Forbidden</div>
          </div>
        </div>

        {/* Scénarios (Staff mode uniquement) */}
        {staffMode && (
          <div className="space-y-2">
            <div className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Scénarios de Pacing
            </div>
            <div className={cn(
              "grid gap-2",
              compact ? "grid-cols-3" : "grid-cols-1 md:grid-cols-3"
            )}>
              {scenarios.map((scenario) => (
                <ScenarioCard key={scenario.type} scenario={scenario} compact={compact} />
              ))}
            </div>
          </div>
        )}

        {/* Message athlète */}
        {!staffMode && (
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="text-sm font-medium">{keyMessages.athleteMessage}</p>
            <p className="text-xs text-muted-foreground mt-1">
              "L'objectif n'est pas de se sentir fort au départ. L'objectif est d'être ENCORE fort à l'arrivée."
            </p>
          </div>
        )}

        {/* Disclaimer */}
        {!compact && (
          <p className="text-[10px] text-muted-foreground italic text-center">
            Intensités en % de {adjustedBoundary.referenceLabel}.
            {adjustedBoundary.isFallbackReference && " (estimation indirecte)"}
            {penalties.totalReductionPct > 0 && ` Réduction longue distance: -${penalties.totalReductionPct}%`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPACT INLINE VERSION
// ═══════════════════════════════════════════════════════════════════════════════

interface LongDistanceEnvelopeInlineProps {
  envelope: LongDistanceEnvelopeResult;
  currentTargetPct?: number;
  className?: string;
}

export function LongDistanceEnvelopeInline({
  envelope,
  currentTargetPct,
  className,
}: LongDistanceEnvelopeInlineProps) {
  const { adjustedBoundary, disciplineBuffer } = envelope;

  const scaleMin = 50;
  const scaleMax = 100;
  const scaleRange = scaleMax - scaleMin;
  
  const toBarPosition = (pct: number) => {
    return Math.max(0, Math.min(100, ((pct - scaleMin) / scaleRange) * 100));
  };

  const safeStart = toBarPosition(adjustedBoundary.lowPct);
  const safeEnd = toBarPosition(adjustedBoundary.highPct);
  const riskEnd = toBarPosition(adjustedBoundary.toleratedPct);
  const disciplinePos = toBarPosition(disciplineBuffer.disciplineTargetPct);
  const targetPos = currentTargetPct ? toBarPosition(currentTargetPct) : null;

  return (
    <div className={cn("relative h-4 rounded-full overflow-hidden bg-muted", className)}>
      {/* Safe */}
      <div 
        className="absolute top-0 h-full bg-green-500"
        style={{ left: `${safeStart}%`, width: `${safeEnd - safeStart}%` }}
      />
      {/* Risk */}
      <div 
        className="absolute top-0 h-full bg-orange-500"
        style={{ left: `${safeEnd}%`, width: `${riskEnd - safeEnd}%` }}
      />
      {/* Forbidden */}
      <div 
        className="absolute top-0 h-full bg-red-500"
        style={{ left: `${riskEnd}%`, width: `${100 - riskEnd}%` }}
      />
      {/* Discipline Target */}
      <div 
        className="absolute top-0 h-full w-1 bg-purple-600"
        style={{ left: `${disciplinePos}%` }}
      />
      {/* Target marker */}
      {targetPos !== null && (
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-black shadow"
          style={{ left: `calc(${targetPos}% - 6px)` }}
        />
      )}
    </div>
  );
}
