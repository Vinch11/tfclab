/**
 * VLamaxCombinedCard — Vue compacte Vélo + CAP côte à côte pour triathlètes
 * Affiche les deux profils métaboliques en parallèle
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Zap, Bike, Footprints, ChevronDown, Info } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  getAgeAdjustedVLamaxProfil,
  type VLamaxProfil,
} from "@/lib/ageAdjustment";

interface VLamaxCombinedCardProps {
  vlamaxBike: number | null;
  vlamaxRun: number | null;
  age?: number | null;
  objectif?: string;
  defaultCollapsed?: boolean;
}

// Configuration des profils
const PROFILE_CONFIG: Record<VLamaxProfil, {
  color: string;
  bgColor: string;
  progressColor: string;
  label: string;
  shortLabel: string;
}> = {
  diesel: {
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    progressColor: "bg-blue-500",
    label: "Diesel Ultra-Endurant",
    shortLabel: "Diesel",
  },
  endurant: {
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    progressColor: "bg-cyan-500",
    label: "Endurant",
    shortLabel: "Endurant",
  },
  equilibre: {
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    progressColor: "bg-green-500",
    label: "Équilibré",
    shortLabel: "Équilibré",
  },
  explosif: {
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    progressColor: "bg-orange-500",
    label: "Explosif",
    shortLabel: "Explosif",
  },
  sprinter: {
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    progressColor: "bg-red-500",
    label: "Sprinter",
    shortLabel: "Sprinter",
  },
};

function getVLamaxProgressValue(vlamax: number): number {
  // Map VLamax 0.2-0.9 to 0-100
  return Math.min(100, Math.max(0, ((vlamax - 0.2) / 0.7) * 100));
}

function ProfileColumn({
  sport,
  vlamax,
  age,
  icon: Icon,
}: {
  sport: "bike" | "run";
  vlamax: number | null;
  age?: number | null;
  icon: React.ElementType;
}) {
  const { profil } = useMemo(
    () => getAgeAdjustedVLamaxProfil(vlamax, age),
    [vlamax, age]
  );

  if (vlamax === null || !Number.isFinite(vlamax) || vlamax <= 0) {
    return (
      <div className="flex-1 p-3 rounded-lg bg-muted/30 border border-dashed">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            {sport === "bike" ? "Vélo" : "CAP"}
          </span>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Données manquantes
        </p>
      </div>
    );
  }

  const config = PROFILE_CONFIG[profil];
  const progressValue = getVLamaxProgressValue(vlamax);

  return (
    <div className={cn("flex-1 p-3 rounded-lg border", config.bgColor, config.color.replace("text-", "border-").replace("600", "200").replace("400", "800"))}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-4 w-4", config.color)} />
          <span className="text-xs font-medium text-muted-foreground">
            {sport === "bike" ? "Vélo" : "CAP"}
          </span>
        </div>
        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", config.color)}>
          {config.shortLabel}
        </Badge>
      </div>

      {/* Valeur principale */}
      <div className="text-center mb-2">
        <span className={cn("text-2xl font-bold tabular-nums", config.color)}>
          {vlamax.toFixed(2)}
        </span>
        <span className="text-xs text-muted-foreground ml-1">mmol/L/s</span>
      </div>

      {/* Barre de progression */}
      <div className="space-y-1">
        <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className={cn("absolute inset-y-0 left-0 rounded-full transition-all", config.progressColor)}
            style={{ width: `${progressValue}%` }}
          />
          {/* Markers */}
          <div className="absolute inset-y-0 left-[21%] w-px bg-background/50" title="0.35" />
          <div className="absolute inset-y-0 left-[43%] w-px bg-background/50" title="0.50" />
          <div className="absolute inset-y-0 left-[64%] w-px bg-background/50" title="0.65" />
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground px-0.5">
          <span>0.20</span>
          <span>0.90</span>
        </div>
      </div>
    </div>
  );
}

export function VLamaxCombinedCard({
  vlamaxBike,
  vlamaxRun,
  age,
  objectif = "Ironman",
  defaultCollapsed = false,
}: VLamaxCombinedCardProps) {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);

  // Vérifier si au moins une valeur est disponible
  const hasBikeData = vlamaxBike !== null && vlamaxBike > 0;
  const hasRunData = vlamaxRun !== null && vlamaxRun > 0;
  const hasAnyData = hasBikeData || hasRunData;

  // Calculer la différence Vélo vs CAP
  const delta = vlamaxBike && vlamaxRun ? vlamaxBike - vlamaxRun : null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden border-amber-200/50 dark:border-amber-900/30">
        <CardHeader className="pb-2 bg-gradient-to-r from-amber-50/50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              VLamax Combinée Vélo + CAP
              <Badge variant="secondary" className="text-[10px] ml-1">
                Triathlon
              </Badge>
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-4">
            {!hasAnyData ? (
              // État sans données
              <div className="p-4 rounded-lg bg-muted/30 border border-dashed text-center">
                <Zap className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">Données VLamax non disponibles</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Complétez un test VLamax ou ajoutez les données dans le snapshot pour voir la comparaison Vélo/CAP.
                </p>
              </div>
            ) : (
              <>
                {/* Vue côte à côte */}
                <div className="flex gap-3">
                  <ProfileColumn sport="bike" vlamax={vlamaxBike} age={age} icon={Bike} />
                  <ProfileColumn sport="run" vlamax={vlamaxRun} age={age} icon={Footprints} />
                </div>

                {/* Analyse delta */}
                {delta !== null && (
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2 mb-1">
                      <Info className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs font-medium">Analyse comparative</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {Math.abs(delta) < 0.05 ? (
                        <>Profils <strong className="text-foreground">cohérents</strong> entre vélo et CAP. Stratégie nutritionnelle unifiée possible.</>
                      ) : delta > 0 ? (
                        <>Profil <strong className="text-orange-500">plus glycolytique</strong> à vélo (+{delta.toFixed(2)}). Attention à la gestion glucides sur segment vélo.</>
                      ) : (
                        <>Profil <strong className="text-orange-500">plus glycolytique</strong> en CAP ({delta.toFixed(2)}). Vigilance sur le marathon après vélo.</>
                      )}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* Note objectif */}
            <div className="flex items-start gap-2 pt-2 border-t text-[10px] text-muted-foreground">
              <Info className="h-3 w-3 shrink-0 mt-0.5" />
              <span>
                Objectif: <strong>{objectif}</strong> — Les seuils VLamax CAP sont généralement plus bas qu'à vélo en raison de la masse musculaire impliquée.
              </span>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
