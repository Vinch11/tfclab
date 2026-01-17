/**
 * DataQualityBlock - Bloc récapitulatif "Qualité des données physiologiques"
 * Affiche la répartition Mesuré / Estimé / Modélisé
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Info, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ScoreSource } from "@/lib/scoreEnvelope";

// =============================================
// TYPES
// =============================================

export interface DataQualityStats {
  measured: number;
  estimated: number;
  modelled: number;
  unknown: number;
}

interface DataQualityBlockProps {
  stats: DataQualityStats;
  compact?: boolean;
  className?: string;
}

// =============================================
// HELPERS
// =============================================

export function calculateDataQualityStats(
  sources: (ScoreSource | undefined | null)[]
): DataQualityStats {
  const stats: DataQualityStats = {
    measured: 0,
    estimated: 0,
    modelled: 0,
    unknown: 0
  };

  sources.forEach(source => {
    switch (source) {
      case "MEASURED":
        stats.measured++;
        break;
      case "ESTIMATED":
        stats.estimated++;
        break;
      case "MODELLED":
      case "DERIVED":
        stats.modelled++;
        break;
      default:
        stats.unknown++;
    }
  });

  return stats;
}

export function getQualityMessage(stats: DataQualityStats): {
  message: string;
  level: "success" | "warning" | "info";
} {
  const total = stats.measured + stats.estimated + stats.modelled + stats.unknown;
  if (total === 0) {
    return { message: "Aucune donnée disponible", level: "info" };
  }

  const measuredRatio = stats.measured / total;
  const estimatedRatio = stats.estimated / total;
  const reliableRatio = measuredRatio + estimatedRatio;

  if (reliableRatio >= 0.7) {
    return {
      message: "Bonne qualité des données — analyse fiable",
      level: "success"
    };
  } else if (reliableRatio >= 0.4) {
    return {
      message: "Qualité modérée — certaines valeurs sont modélisées",
      level: "warning"
    };
  } else {
    return {
      message: "Beaucoup de données modélisées — interprétation prudente recommandée",
      level: "warning"
    };
  }
}

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

export function DataQualityBlock({ 
  stats, 
  compact = false,
  className 
}: DataQualityBlockProps) {
  const total = stats.measured + stats.estimated + stats.modelled + stats.unknown;
  const qualityInfo = getQualityMessage(stats);

  if (total === 0) return null;

  const measuredPct = Math.round((stats.measured / total) * 100);
  const estimatedPct = Math.round((stats.estimated / total) * 100);
  const modelledPct = Math.round((stats.modelled / total) * 100);

  // Mode compact pour insertion inline
  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 text-xs", className)}>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-muted-foreground">Mesurées:</span>
          <span className="font-medium">{stats.measured}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">Estimées:</span>
          <span className="font-medium">{stats.estimated}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span className="text-muted-foreground">Modélisées:</span>
          <span className="font-medium">{stats.modelled}</span>
        </span>
      </div>
    );
  }

  // Mode carte complète
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            Qualité des données physiologiques
          </CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs cursor-help",
                    qualityInfo.level === "success" && "border-green-500/50 text-green-700 dark:text-green-400",
                    qualityInfo.level === "warning" && "border-amber-500/50 text-amber-700 dark:text-amber-400"
                  )}
                >
                  {qualityInfo.level === "success" ? (
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                  ) : (
                    <AlertTriangle className="w-3 h-3 mr-1" />
                  )}
                  {qualityInfo.level === "success" ? "Fiable" : "Modérée"}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs">
                <p className="text-xs">{qualityInfo.message}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Barre de répartition visuelle */}
        <div className="h-3 flex rounded-full overflow-hidden bg-muted">
          {measuredPct > 0 && (
            <div 
              className="bg-green-500 transition-all" 
              style={{ width: `${measuredPct}%` }}
            />
          )}
          {estimatedPct > 0 && (
            <div 
              className="bg-amber-500 transition-all" 
              style={{ width: `${estimatedPct}%` }}
            />
          )}
          {modelledPct > 0 && (
            <div 
              className="bg-blue-400 transition-all" 
              style={{ width: `${modelledPct}%` }}
            />
          )}
        </div>

        {/* Légende */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
            <div>
              <div className="font-medium text-foreground">🧪 Mesurées</div>
              <div className="text-muted-foreground">{stats.measured} ({measuredPct}%)</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500 flex-shrink-0" />
            <div>
              <div className="font-medium text-foreground">📐 Estimées</div>
              <div className="text-muted-foreground">{stats.estimated} ({estimatedPct}%)</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-400 flex-shrink-0" />
            <div>
              <div className="font-medium text-foreground">🧠 Modélisées</div>
              <div className="text-muted-foreground">{stats.modelled} ({modelledPct}%)</div>
            </div>
          </div>
        </div>

        {/* Message dynamique */}
        <p className="text-xs text-muted-foreground italic border-t pt-3">
          Plus la proportion de données mesurées est élevée, plus l'analyse est précise.
        </p>
      </CardContent>
    </Card>
  );
}

// =============================================
// VERSION INLINE POUR PDF / RAPPORTS
// =============================================

export function DataQualityInline({ stats }: { stats: DataQualityStats }) {
  const total = stats.measured + stats.estimated + stats.modelled + stats.unknown;
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-4 py-2 px-3 bg-muted/50 rounded-lg text-xs">
      <span className="font-medium text-muted-foreground">Qualité :</span>
      <span className="flex items-center gap-1">
        <span className="text-green-600 dark:text-green-400">🧪</span> 
        {stats.measured} mesurées
      </span>
      <span className="flex items-center gap-1">
        <span className="text-amber-600 dark:text-amber-400">📐</span> 
        {stats.estimated} estimées
      </span>
      <span className="flex items-center gap-1">
        <span className="text-blue-600 dark:text-blue-400">🧠</span> 
        {stats.modelled} modélisées
      </span>
    </div>
  );
}

export default DataQualityBlock;
