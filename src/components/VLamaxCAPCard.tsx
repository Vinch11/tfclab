/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VLAMAX CAP CARD — Running Focus Mode™
 * 
 * Affichage de la VLamax spécifique course à pied.
 * Remplace VLamaxBikeV2EnhancedCard en mode Running Focus.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useRunningFocusMode } from "@/hooks/useRunningFocusMode";
import { 
  getRunningTargets, 
  RUNNING_RACE_LABELS,
  type RunningRaceType 
} from "@/lib/runningFocusMode";

interface VLamaxCAPCardProps {
  vlamaxValue: number | null;
  vlamaxSource: "test" | "estimation" | "snapshot";
  vlamaxConfidence: number;
  vo2max?: number | null;
  economyScore?: number | null;
  className?: string;
}

export function VLamaxCAPCard({
  vlamaxValue,
  vlamaxSource,
  vlamaxConfidence,
  vo2max,
  economyScore,
  className,
}: VLamaxCAPCardProps) {
  const { raceType, targets } = useRunningFocusMode();
  
  if (!raceType || !targets) {
    return null;
  }
  
  const optimal = targets.vlamax.optimal;
  const max = targets.vlamax.max;
  
  // Statut selon les cibles
  const getStatus = (): { label: string; color: string; icon: string } => {
    if (vlamaxValue === null) {
      return { label: "Non disponible", color: "text-muted-foreground", icon: "❓" };
    }
    if (vlamaxValue <= optimal) {
      return { label: "Optimal", color: "text-emerald-600 dark:text-emerald-400", icon: "✅" };
    }
    if (vlamaxValue <= max) {
      return { label: "Acceptable", color: "text-amber-600 dark:text-amber-400", icon: "⚠️" };
    }
    return { label: "Limitant", color: "text-red-600 dark:text-red-400", icon: "🚨" };
  };
  
  const status = getStatus();
  
  // Pourcentage de progression vers l'optimal
  const progressPct = vlamaxValue !== null
    ? Math.max(0, Math.min(100, ((max - vlamaxValue) / (max - optimal * 0.8)) * 100))
    : 0;
  
  // Source label
  const sourceLabel = {
    test: "Test terrain CAP",
    estimation: "Estimation",
    snapshot: "Snapshot",
  }[vlamaxSource];
  
  return (
    <Card className={cn("border-primary/20", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span>🏃</span>
            VLamax CAP
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Running Focus Mode™
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Valeur principale */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono">
              {vlamaxValue !== null ? vlamaxValue.toFixed(2) : "—"}
            </span>
            <span className="text-sm text-muted-foreground">mmol/L/s</span>
          </div>
          <div className={cn("flex items-center gap-1.5 text-sm font-medium", status.color)}>
            <span>{status.icon}</span>
            <span>{status.label}</span>
          </div>
        </div>
        
        {/* Progress vers l'optimal */}
        {vlamaxValue !== null && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progression vers l'optimal</span>
              <span>Cible: ≤ {optimal} mmol/L/s</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
        )}
        
        {/* Cibles pour l'objectif */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded text-center">
            <p className="text-muted-foreground">Optimal</p>
            <p className="font-bold text-emerald-600 dark:text-emerald-400">
              ≤ {optimal}
            </p>
          </div>
          <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-center">
            <p className="text-muted-foreground">Max</p>
            <p className="font-bold text-amber-600 dark:text-amber-400">
              ≤ {max}
            </p>
          </div>
          <div className="p-2 bg-muted/50 rounded text-center">
            <p className="text-muted-foreground">Objectif</p>
            <p className="font-bold">{RUNNING_RACE_LABELS[raceType]}</p>
          </div>
        </div>
        
        <Separator />
        
        {/* Métadonnées */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <span className="text-muted-foreground">Source:</span>
            <span className={cn(
              "ml-1 font-medium",
              vlamaxSource === "test" ? "text-emerald-600" : "text-amber-600"
            )}>
              {sourceLabel}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Confiance:</span>
            <span className="ml-1 font-medium">
              {Math.round(vlamaxConfidence * 100)}%
            </span>
          </div>
          {vo2max && (
            <div>
              <span className="text-muted-foreground">VO2max:</span>
              <span className="ml-1 font-medium">{vo2max} ml/kg/min</span>
            </div>
          )}
          {economyScore !== null && (
            <div>
              <span className="text-muted-foreground">Économie:</span>
              <span className="ml-1 font-medium">{economyScore}/100</span>
            </div>
          )}
        </div>
        
        {/* Interprétation */}
        <div className="p-3 bg-muted/30 rounded-lg text-sm">
          <p className="font-medium mb-1">Interprétation</p>
          <p className="text-muted-foreground">
            {vlamaxValue === null ? (
              "VLamax CAP non disponible. Effectuez un test sprint 15s ou un test lactate terrain."
            ) : vlamaxValue <= optimal ? (
              `Excellent profil pour le ${RUNNING_RACE_LABELS[raceType]}. Votre capacité à oxyder les lipides permet une épargne glycogénique optimale.`
            ) : vlamaxValue <= max ? (
              `Profil acceptable mais perfectible. Travail aérobie continu recommandé pour réduire la dépendance aux glucides.`
            ) : (
              `VLamax trop élevée pour le ${RUNNING_RACE_LABELS[raceType]}. Risque d'épuisement glycogénique précoce. Priorité : volume Z2 et réduction des séances lactiques.`
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
