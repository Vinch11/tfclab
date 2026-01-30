/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL PACING ENVELOPE™ BAR — Graphique Signature Horizontal
 * Two For Coaching Lab Method™
 * 
 * Visualisation OBLIGATOIRE du couloir de pacing:
 * - Barre horizontale avec 3 zones colorées (Safe/Risk/Forbidden)
 * - Marqueur d'intensité cible de course
 * - Lignes verticales FatMax et MLSS
 * - Tooltips explicatifs par zone
 * 
 * Ce graphique est le cœur visuel du système de pacing TFCL.
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
import { AlertTriangle, Shield, Target, Info, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PacingEnvelopeResult } from "@/lib/v2/pacingEnvelopeEngine";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface PacingEnvelopeBarProps {
  envelope: PacingEnvelopeResult;
  
  // Marqueur optionnel de l'intensité cible
  targetIntensityPct?: number;
  targetLabel?: string;
  
  // Affichage
  showFatmaxMarker?: boolean;
  showMLSSMarker?: boolean;
  fatmaxPct?: number;
  mlssPct?: number;
  
  staffMode?: boolean;
  compact?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZONE TOOLTIPS
// ═══════════════════════════════════════════════════════════════════════════════

const ZONE_TOOLTIPS = {
  safe: "Zone métaboliquement durable. Lactate production < clearance. Oxydation lipidique significative. Compatible avec la durée de course.",
  risk: "Zone soutenable court-terme mais métaboliquement dangereuse si répétée ou prolongée. Contribution glycolytique en hausse.",
  forbidden: "Zone qui accélère la déplétion glycogénique, l'accumulation lactate et provoque un effondrement du pacing."
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function PacingEnvelopeBar({
  envelope,
  targetIntensityPct,
  targetLabel = "Cible Course",
  showFatmaxMarker = true,
  showMLSSMarker = true,
  fatmaxPct,
  mlssPct,
  staffMode = false,
  compact = false,
  className,
}: PacingEnvelopeBarProps) {
  const { boundary, pacingProfile, confidenceLevel, confidence } = envelope;
  
  // Calcul des positions en % de la barre (échelle 50-100% FTP/VMA)
  const scaleMin = 50;
  const scaleMax = 100;
  const scaleRange = scaleMax - scaleMin;
  
  const toBarPosition = (pct: number) => {
    return Math.max(0, Math.min(100, ((pct - scaleMin) / scaleRange) * 100));
  };
  
  // Positions des zones
  const safeStart = toBarPosition(boundary.lowPct);
  const safeEnd = toBarPosition(boundary.highPct);
  const safeWidth = safeEnd - safeStart;
  
  const riskStart = safeEnd;
  const riskEnd = toBarPosition(boundary.toleratedPct);
  const riskWidth = riskEnd - riskStart;
  
  const forbiddenStart = riskEnd;
  const forbiddenWidth = 100 - forbiddenStart;
  
  // Position du marqueur cible
  const targetPos = targetIntensityPct ? toBarPosition(targetIntensityPct) : null;
  
  // Position FatMax et MLSS
  const fatmaxPos = fatmaxPct ? toBarPosition(fatmaxPct) : toBarPosition(boundary.centerPct);
  const mlssPos = mlssPct ? toBarPosition(mlssPct) : toBarPosition(boundary.highPct + 3);

  // État du target dans les zones
  const getTargetZone = () => {
    if (!targetIntensityPct) return null;
    if (targetIntensityPct <= boundary.highPct) return "safe";
    if (targetIntensityPct <= boundary.toleratedPct) return "risk";
    return "forbidden";
  };
  
  const targetZone = getTargetZone();

  return (
    <Card className={cn("print:break-inside-avoid", className)}>
      <CardHeader className={cn("pb-2", compact && "pb-1")}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={cn("flex items-center gap-2", compact ? "text-sm" : "text-base")}>
              <Target className="h-4 w-4 text-primary" />
              TFCL Pacing Envelope™
            </CardTitle>
            {!compact && (
              <CardDescription className="text-xs mt-1">
                Couloir d'intensité autorisée — % de {boundary.referenceShortLabel}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {pacingProfile.badge && (
              <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-[10px]">
                {pacingProfile.badge}
              </Badge>
            )}
            {confidenceLevel === "LOW" && (
              <Badge variant="outline" className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-[10px]">
                <AlertTriangle className="h-2 w-2 mr-1" />
                Confiance modérée
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className={cn("space-y-4", compact && "space-y-2")}>
        {/* Banner confiance faible */}
        {confidenceLevel === "LOW" && staffMode && (
          <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-xs">
            <div className="flex items-center gap-2 text-orange-700 dark:text-orange-300">
              <AlertTriangle className="h-3 w-3" />
              <span>Enveloppe construite avec confiance modérée. Considérer une Reference Week TFCL.</span>
            </div>
          </div>
        )}
        
        {/* Barre principale - Graphique signature */}
        <div className="relative">
          {/* Scale labels */}
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1 px-1">
            <span>{scaleMin}%</span>
            <span>{Math.round((scaleMin + scaleMax) / 2)}%</span>
            <span>{scaleMax}%</span>
          </div>
          
          {/* La barre */}
          <div className={cn(
            "relative w-full rounded-lg overflow-hidden",
            compact ? "h-10" : "h-14"
          )}>
            {/* Zone sous-exploitation (bleu pâle) */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="absolute top-0 h-full bg-blue-100 dark:bg-blue-900/30 cursor-help"
                    style={{ left: 0, width: `${safeStart}%` }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">Zone sous-exploitation</p>
                  <p className="text-xs text-muted-foreground">Intensité trop basse — marge disponible</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* SAFE ZONE (Vert) */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="absolute top-0 h-full bg-gradient-to-r from-green-400 to-green-500 dark:from-green-600 dark:to-green-700 cursor-help flex items-center justify-center"
                    style={{ left: `${safeStart}%`, width: `${safeWidth}%` }}
                  >
                    <div className="text-white text-[10px] font-bold drop-shadow-sm flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      <span className="hidden sm:inline">SAFE</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium text-green-600">Zone Safe (Optimale)</p>
                  <p className="text-xs text-muted-foreground mt-1">{ZONE_TOOLTIPS.safe}</p>
                  <p className="text-xs font-mono mt-1">{boundary.lowPct}–{boundary.highPct}% {boundary.referenceShortLabel}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* RISK ZONE (Orange) */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="absolute top-0 h-full bg-gradient-to-r from-orange-400 to-orange-500 dark:from-orange-600 dark:to-orange-700 cursor-help flex items-center justify-center"
                    style={{ left: `${riskStart}%`, width: `${riskWidth}%` }}
                  >
                    <div className="text-white text-[10px] font-bold drop-shadow-sm flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      <span className="hidden sm:inline">RISK</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium text-orange-600">Zone Risk (Tolérée)</p>
                  <p className="text-xs text-muted-foreground mt-1">{ZONE_TOOLTIPS.risk}</p>
                  <p className="text-xs font-mono mt-1">{boundary.highPct + 1}–{boundary.toleratedPct}% {boundary.referenceShortLabel}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* FORBIDDEN ZONE (Rouge) */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="absolute top-0 h-full bg-gradient-to-r from-red-500 to-red-600 dark:from-red-700 dark:to-red-800 cursor-help flex items-center justify-center"
                    style={{ left: `${forbiddenStart}%`, width: `${forbiddenWidth}%` }}
                  >
                    <div className="text-white text-[10px] font-bold drop-shadow-sm flex items-center gap-1">
                      <Flame className="h-3 w-3" />
                      <span className="hidden sm:inline">FORBIDDEN</span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="font-medium text-red-600">Zone Forbidden (Interdite)</p>
                  <p className="text-xs text-muted-foreground mt-1">{ZONE_TOOLTIPS.forbidden}</p>
                  <p className="text-xs font-mono mt-1">&gt;{boundary.toleratedPct}% {boundary.referenceShortLabel}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Marqueur FatMax */}
            {showFatmaxMarker && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="absolute top-0 h-full w-0.5 bg-green-800 dark:bg-green-300 cursor-help"
                      style={{ left: `${fatmaxPos}%` }}
                    >
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[8px] font-medium text-green-700 dark:text-green-300 whitespace-nowrap">
                        FatMax
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Intensité FatMax estimée</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Marqueur MLSS */}
            {showMLSSMarker && staffMode && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="absolute top-0 h-full w-0.5 bg-orange-800 dark:bg-orange-300 cursor-help border-dashed"
                      style={{ left: `${mlssPos}%` }}
                    >
                      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[8px] font-medium text-orange-700 dark:text-orange-300 whitespace-nowrap">
                        MLSS
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">MLSS estimé (Maximal Lactate Steady State)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Marqueur intensité cible */}
            {targetPos !== null && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className={cn(
                        "absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg cursor-help",
                        targetZone === "safe" && "bg-green-600",
                        targetZone === "risk" && "bg-orange-600",
                        targetZone === "forbidden" && "bg-red-600"
                      )}
                      style={{ left: `calc(${targetPos}% - 8px)` }}
                    >
                      <Target className="h-2 w-2 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{targetLabel}</p>
                    <p className="text-xs font-mono">{targetIntensityPct}% {boundary.referenceShortLabel}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        
        {/* Légende et valeurs */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
            <div className="text-lg font-bold font-mono text-green-700 dark:text-green-300">
              {boundary.lowPct}–{boundary.highPct}%
            </div>
            <div className="text-[10px] text-green-600 dark:text-green-400">Zone Safe</div>
          </div>
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800">
            <div className="text-lg font-bold font-mono text-orange-700 dark:text-orange-300">
              {boundary.highPct + 1}–{boundary.toleratedPct}%
            </div>
            <div className="text-[10px] text-orange-600 dark:text-orange-400">Zone Risk</div>
          </div>
          <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
            <div className="text-lg font-bold font-mono text-red-700 dark:text-red-300">
              &gt;{boundary.toleratedPct}%
            </div>
            <div className="text-[10px] text-red-600 dark:text-red-400">Forbidden</div>
          </div>
        </div>
        
        {/* Warnings si target dans zone à risque */}
        {targetZone === "risk" && (
          <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-orange-700 dark:text-orange-300">
                <strong>Risque de déplétion glycogénique prématurée.</strong>
                <p className="mt-1">L'intensité cible se situe dans la zone de risque. Retour à la zone Safe recommandé.</p>
              </div>
            </div>
          </div>
        )}
        
        {targetZone === "forbidden" && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-2">
              <Flame className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-red-700 dark:text-red-300">
                <strong>Pacing hors enveloppe TFCL.</strong>
                <p className="mt-1">Cette intensité contredit les objectifs de préparation (contrôle VLamax). Discipline métabolique non respectée.</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Message disclaimer */}
        {!compact && (
          <p className="text-[10px] text-muted-foreground italic text-center">
            Toutes les intensités sont exprimées en % de {boundary.referenceLabel}.
            {boundary.isFallbackReference && " (estimation indirecte)"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPACT INLINE VERSION (pour dashboards)
// ═══════════════════════════════════════════════════════════════════════════════

interface PacingEnvelopeBarInlineProps {
  envelope: PacingEnvelopeResult;
  targetIntensityPct?: number;
  className?: string;
}

export function PacingEnvelopeBarInline({
  envelope,
  targetIntensityPct,
  className,
}: PacingEnvelopeBarInlineProps) {
  const { boundary } = envelope;
  
  const scaleMin = 50;
  const scaleMax = 100;
  const scaleRange = scaleMax - scaleMin;
  
  const toBarPosition = (pct: number) => {
    return Math.max(0, Math.min(100, ((pct - scaleMin) / scaleRange) * 100));
  };
  
  const safeStart = toBarPosition(boundary.lowPct);
  const safeEnd = toBarPosition(boundary.highPct);
  const riskEnd = toBarPosition(boundary.toleratedPct);
  const targetPos = targetIntensityPct ? toBarPosition(targetIntensityPct) : null;

  return (
    <div className={cn("relative h-3 rounded-full overflow-hidden bg-muted", className)}>
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
      {/* Target marker */}
      {targetPos !== null && (
        <div 
          className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white border border-black shadow"
          style={{ left: `calc(${targetPos}% - 4px)` }}
        />
      )}
    </div>
  );
}
