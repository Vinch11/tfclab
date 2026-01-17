/**
 * PerformanceRangeDisplay - Affichage visuel des plages de performance réalistes
 * 
 * Composant principal pour afficher les plages réalistes/ambitieuses/élite
 * avec position de la valeur actuelle.
 * 
 * RÈGLE: Aucune cible unique ne doit être affichée.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle, Info, Target, TrendingUp, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PerformanceRange,
  getCurrentZone,
  PERFORMANCE_RANGE_DISCLAIMER,
  type PerformanceZone,
} from "@/lib/performanceRanges";

// =============================================
// TYPES
// =============================================

interface PerformanceRangeDisplayProps {
  range: PerformanceRange;
  title?: string;
  compact?: boolean;
  showInterpretation?: boolean;
  className?: string;
}

// =============================================
// COULEURS PAR ZONE
// =============================================

const ZONE_COLORS: Record<PerformanceZone, {
  bg: string;
  text: string;
  border: string;
  badge: "default" | "secondary" | "destructive" | "outline";
}> = {
  below: {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-300",
    badge: "outline",
  },
  realistic: {
    bg: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    border: "border-emerald-400",
    badge: "default",
  },
  ambitious: {
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-400",
    border: "border-amber-400",
    badge: "secondary",
  },
  elite: {
    bg: "bg-rose-100 dark:bg-rose-900/30",
    text: "text-rose-700 dark:text-rose-400",
    border: "border-rose-400",
    badge: "destructive",
  },
  above: {
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-400",
    border: "border-purple-400",
    badge: "destructive",
  },
};

const ZONE_LABELS: Record<PerformanceZone, string> = {
  below: "En progression",
  realistic: "Zone réaliste",
  ambitious: "Zone ambitieuse",
  elite: "Zone élite",
  above: "Exceptionnel",
};

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

export function PerformanceRangeDisplay({
  range,
  title,
  compact = false,
  showInterpretation = true,
  className,
}: PerformanceRangeDisplayProps) {
  const currentZone = getCurrentZone(range.currentValue, range);
  const zoneColors = ZONE_COLORS[currentZone];
  
  const metricLabel = {
    FTP_KG: "FTP/kg",
    FTP: "FTP",
    TTE: "TTE",
    VO2MAX: "VO2max",
    VLAMAX: "VLamax",
    VMA: "VMA",
  }[range.metric];

  // Mode compact pour insertion inline
  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{title || metricLabel}</span>
          {range.currentValue !== null && (
            <span className="font-mono font-bold">
              {range.metric === "VLAMAX" 
                ? range.currentValue.toFixed(2) 
                : range.currentValue.toFixed(1)} {range.unit}
            </span>
          )}
        </div>
        <RangeBar range={range} currentZone={currentZone} compact />
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Target className="w-4 h-4 text-primary" />
            {title || `Plage ${metricLabel} réaliste`}
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs whitespace-pre-line">
                  {PERFORMANCE_RANGE_DISCLAIMER}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-4">
        {/* Valeur actuelle + Badge zone */}
        <div className="flex items-center justify-between">
          {range.currentValue !== null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {range.metric === "VLAMAX" 
                  ? range.currentValue.toFixed(2) 
                  : range.currentValue.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">{range.unit}</span>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">Non disponible</span>
          )}
          <Badge 
            variant={zoneColors.badge}
            className="gap-1"
          >
            {currentZone === "elite" && <Award className="w-3 h-3" />}
            {currentZone === "ambitious" && <TrendingUp className="w-3 h-3" />}
            {ZONE_LABELS[currentZone]}
          </Badge>
        </div>

        {/* Barre de plages visuelles */}
        <RangeBar range={range} currentZone={currentZone} />

        {/* Légende des zones */}
        <ZoneLegend range={range} />

        {/* Note pédagogique */}
        {showInterpretation && range.pedagogicalNote && (
          <p className="text-xs text-muted-foreground italic border-t pt-3">
            {range.pedagogicalNote}
          </p>
        )}

        {/* Warning si objectif très exigeant */}
        {range.warningNote && (
          <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-100 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {range.warningNote}
            </p>
          </div>
        )}

        {/* Texte disclaimer standard */}
        <p className="text-[10px] text-muted-foreground/60 text-center">
          Ces plages sont indicatives. Une valeur hors zone réaliste n'est pas impossible.
        </p>
      </CardContent>
    </Card>
  );
}

// =============================================
// BARRE VISUELLE DES PLAGES
// =============================================

interface RangeBarProps {
  range: PerformanceRange;
  currentZone: PerformanceZone;
  compact?: boolean;
}

function RangeBar({ range, currentZone, compact = false }: RangeBarProps) {
  const { realistic, ambitious, elite, currentValue, metric } = range;
  
  // Calculer les positions relatives
  // On prend une échelle de 0 (bas) à max elite + marge
  const globalMin = Math.min(realistic.min * 0.85, currentValue || realistic.min);
  const globalMax = elite.max * 1.1;
  const totalRange = globalMax - globalMin;
  
  const toPercent = (val: number) => ((val - globalMin) / totalRange) * 100;
  
  const realisticStart = toPercent(realistic.min);
  const realisticWidth = toPercent(realistic.max) - realisticStart;
  
  const ambitiousStart = toPercent(ambitious.min);
  const ambitiousWidth = toPercent(ambitious.max) - ambitiousStart;
  
  const eliteStart = toPercent(elite.min);
  const eliteWidth = toPercent(elite.max) - eliteStart;
  
  const currentPos = currentValue ? toPercent(currentValue) : null;
  
  const barHeight = compact ? "h-3" : "h-5";
  
  return (
    <div className="relative">
      {/* Fond gris */}
      <div className={cn("w-full rounded-full bg-muted overflow-hidden", barHeight)}>
        {/* Zone réaliste */}
        <div 
          className="absolute h-full bg-emerald-400/70 dark:bg-emerald-500/50"
          style={{ left: `${realisticStart}%`, width: `${realisticWidth}%` }}
        />
        {/* Zone ambitieuse (hachures) */}
        <div 
          className="absolute h-full bg-amber-400/50 dark:bg-amber-500/40"
          style={{ 
            left: `${ambitiousStart}%`, 
            width: `${ambitiousWidth}%`,
            backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 6px)"
          }}
        />
        {/* Zone élite (grisée) */}
        <div 
          className="absolute h-full bg-slate-400/30 dark:bg-slate-500/30"
          style={{ left: `${eliteStart}%`, width: `${eliteWidth}%` }}
        />
      </div>
      
      {/* Marqueur valeur actuelle */}
      {currentPos !== null && (
        <div 
          className="absolute top-0 bottom-0 w-1 bg-primary shadow-lg rounded-full transform -translate-x-1/2"
          style={{ left: `${Math.min(Math.max(currentPos, 2), 98)}%` }}
        >
          {!compact && (
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap">
              {metric === "VLAMAX" 
                ? currentValue?.toFixed(2) 
                : currentValue?.toFixed(1)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================
// LÉGENDE DES ZONES
// =============================================

interface ZoneLegendProps {
  range: PerformanceRange;
}

function ZoneLegend({ range }: ZoneLegendProps) {
  const { realistic, ambitious, elite, unit, metric } = range;
  
  const formatValue = (val: number) => 
    metric === "VLAMAX" ? val.toFixed(2) : val.toFixed(1);
  
  return (
    <div className="grid grid-cols-3 gap-2 text-xs">
      {/* Réaliste */}
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-emerald-400 flex-shrink-0" />
        <div>
          <div className="font-medium text-foreground">Réaliste</div>
          <div className="text-muted-foreground">
            {formatValue(realistic.min)}–{formatValue(realistic.max)}
          </div>
        </div>
      </div>
      
      {/* Ambitieux */}
      <div className="flex items-center gap-1.5">
        <span 
          className="w-3 h-3 rounded-sm bg-amber-400 flex-shrink-0"
          style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 1px, rgba(0,0,0,0.2) 1px, rgba(0,0,0,0.2) 2px)" }}
        />
        <div>
          <div className="font-medium text-foreground">Ambitieux</div>
          <div className="text-muted-foreground">
            {formatValue(ambitious.min)}–{formatValue(ambitious.max)}
          </div>
        </div>
      </div>
      
      {/* Élite */}
      <div className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-sm bg-slate-400/50 border border-slate-400 flex-shrink-0" />
        <div>
          <div className="font-medium text-foreground">Élite</div>
          <div className="text-muted-foreground">
            &gt; {formatValue(elite.min)}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// COMPOSANT INLINE SIMPLIFIÉ
// =============================================

interface PerformanceRangeInlineProps {
  range: PerformanceRange;
  label?: string;
}

export function PerformanceRangeInline({ range, label }: PerformanceRangeInlineProps) {
  const currentZone = getCurrentZone(range.currentValue, range);
  const zoneColors = ZONE_COLORS[currentZone];
  
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-muted-foreground">{label || range.metric}</span>
      <span className="font-mono font-bold">
        {range.currentValue !== null 
          ? `${range.currentValue.toFixed(range.metric === "VLAMAX" ? 2 : 1)} ${range.unit}`
          : "—"
        }
      </span>
      <Badge variant={zoneColors.badge} className="text-xs">
        {ZONE_LABELS[currentZone]}
      </Badge>
      {range.warningNote && (
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
      )}
    </div>
  );
}

// =============================================
// GROUPE DE PLAGES (Dashboard)
// =============================================

interface PerformanceRangeGroupProps {
  ranges: PerformanceRange[];
  title?: string;
  className?: string;
}

export function PerformanceRangeGroup({ ranges, title, className }: PerformanceRangeGroupProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Target className="w-4 h-4" />
          {title}
        </h3>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {ranges.map((range) => (
          <PerformanceRangeDisplay 
            key={range.metric} 
            range={range}
            showInterpretation={false}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground italic text-center">
        {PERFORMANCE_RANGE_DISCLAIMER}
      </p>
    </div>
  );
}

export default PerformanceRangeDisplay;
