/**
 * AmbitionProgressMini - Aperçu compact de la progression vers les cibles d'ambition
 * Affiche une jauge circulaire miniature avec le % de progression global
 */

import { useMemo } from "react";
import { TrendingUp, ChevronUp, ChevronDown, Minus, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import {
  getVLamaxRange,
  getTTETargetByAmbition,
  getFtpKgTargetByAmbition,
} from "@/lib/physiologicalTargets";
import { 
  AmbitionLevel, 
  getAmbitionDefinition, 
  DEFAULT_AMBITION 
} from "@/types/ambitionLevel";
import { DbSnapshot } from "@/hooks/useCloudData";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

// =============================================
// TYPES
// =============================================

interface AmbitionProgressMiniProps {
  snapshots: DbSnapshot[];
  objectif: string;
  ambition?: AmbitionLevel;
  weightKg?: number | null;
  className?: string;
  onClick?: () => void;
}

// =============================================
// HELPERS
// =============================================

function calculateProgress(
  current: number | null,
  target: number,
  isInverse: boolean = false
): number | null {
  if (current === null || current === 0) return null;
  if (isInverse) {
    if (current <= target) return 100;
    return Math.max(0, Math.min(100, (target / current) * 100));
  }
  return Math.min(100, (current / target) * 100);
}

function getGlobalProgress(
  vlamax: number | null,
  tte: number | null,
  ftpKg: number | null,
  objectif: string,
  ambition: AmbitionLevel
): number | null {
  const vlamaxRange = getVLamaxRange(objectif, ambition);
  const tteTarget = getTTETargetByAmbition(objectif, ambition);
  const ftpKgTarget = getFtpKgTargetByAmbition(objectif, ambition);

  const vlamaxProgress = calculateProgress(vlamax, vlamaxRange.optimal, true);
  const tteProgress = calculateProgress(tte, tteTarget, false);
  const ftpKgProgress = calculateProgress(ftpKg, ftpKgTarget, false);

  const validProgresses = [vlamaxProgress, tteProgress, ftpKgProgress].filter(
    (p) => p !== null
  ) as number[];
  
  return validProgresses.length > 0
    ? Math.round(validProgresses.reduce((a, b) => a + b, 0) / validProgresses.length)
    : null;
}

function getTrend(
  data: { progress: number | null }[]
): "up" | "down" | "stable" | "unknown" {
  const validPoints = data.filter((d) => d.progress !== null);
  if (validPoints.length < 2) return "unknown";
  
  const first = validPoints[0].progress as number;
  const last = validPoints[validPoints.length - 1].progress as number;
  const diff = last - first;
  
  if (Math.abs(diff) < 2) return "stable";
  return diff > 0 ? "up" : "down";
}

// =============================================
// MINI PROGRESS RING
// =============================================

function ProgressRing({ 
  progress, 
  size = 40, 
  strokeWidth = 4 
}: { 
  progress: number | null; 
  size?: number; 
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - ((progress ?? 0) / 100) * circumference;

  // Couleur selon progression
  const getColor = (p: number | null) => {
    if (p === null) return "hsl(var(--muted-foreground))";
    if (p >= 100) return "hsl(142, 76%, 36%)"; // emerald
    if (p >= 85) return "hsl(38, 92%, 50%)"; // amber
    if (p >= 60) return "hsl(221, 83%, 53%)"; // blue
    return "hsl(var(--muted-foreground))";
  };

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={strokeWidth}
      />
      {/* Progress circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={getColor(progress)}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-500 ease-out"
      />
    </svg>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function AmbitionProgressMini({
  snapshots,
  objectif,
  ambition = DEFAULT_AMBITION,
  weightKg,
  className,
  onClick,
}: AmbitionProgressMiniProps) {
  const ambDef = getAmbitionDefinition(ambition);

  // Calculer les données
  const { progress, trend, metricsCount } = useMemo(() => {
    const sorted = [...snapshots]
      .filter((s) => s.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-6);

    if (sorted.length === 0) {
      return { progress: null, trend: "unknown" as const, metricsCount: 0 };
    }

    const progressData = sorted.map((s) => {
      const ftpKg = s.ftp && s.weight_kg ? s.ftp / s.weight_kg : 
                    s.ftp && weightKg ? s.ftp / weightKg : null;
      return {
        progress: getGlobalProgress(
          s.vlamax ?? null,
          s.tte_observed_min ?? null,
          ftpKg,
          objectif,
          ambition
        ),
      };
    });

    const latest = sorted[sorted.length - 1];
    const latestFtpKg = latest.ftp && latest.weight_kg ? latest.ftp / latest.weight_kg : 
                        latest.ftp && weightKg ? latest.ftp / weightKg : null;
    const currentProgress = getGlobalProgress(
      latest.vlamax ?? null,
      latest.tte_observed_min ?? null,
      latestFtpKg,
      objectif,
      ambition
    );

    // Compter les métriques disponibles
    let count = 0;
    if (latest.vlamax !== null) count++;
    if (latest.tte_observed_min !== null) count++;
    if (latestFtpKg !== null) count++;

    return {
      progress: currentProgress,
      trend: getTrend(progressData),
      metricsCount: count,
    };
  }, [snapshots, objectif, ambition, weightKg]);

  // Icône de tendance
  const TrendIcon = useMemo(() => {
    switch (trend) {
      case "up":
        return <ChevronUp className="w-3 h-3 text-emerald-500" />;
      case "down":
        return <ChevronDown className="w-3 h-3 text-red-500" />;
      case "stable":
        return <Minus className="w-3 h-3 text-amber-500" />;
      default:
        return null;
    }
  }, [trend]);

  if (progress === null) {
    return null; // Ne rien afficher si pas de données
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "flex items-center gap-2 p-2 rounded-lg border bg-card/50 hover:bg-card transition-colors cursor-pointer",
              "focus:outline-none focus:ring-2 focus:ring-primary/50",
              className
            )}
          >
            {/* Mini ring progress */}
            <div className="relative">
              <ProgressRing progress={progress} size={36} strokeWidth={3} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-bold tabular-nums">
                  {progress}%
                </span>
              </div>
            </div>

            {/* Label + trend */}
            <div className="flex flex-col items-start">
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium">{ambDef.shortLabel}</span>
                {TrendIcon}
              </div>
              <span className="text-[10px] text-muted-foreground">
                {metricsCount}/3 métriques
              </span>
            </div>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium text-sm">
              {ambDef.icon} Progression vers "{ambDef.label}"
            </p>
            <p className="text-xs text-muted-foreground">
              {progress >= 100 
                ? "🎉 Cibles atteintes !" 
                : progress >= 85
                ? "Proche des objectifs"
                : `${100 - progress}% restant avant les cibles`}
            </p>
            <p className="text-xs text-muted-foreground">
              Cliquez pour voir le graphique complet
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
