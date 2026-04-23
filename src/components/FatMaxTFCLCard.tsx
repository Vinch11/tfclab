/**
 * FatMaxTFCLCard – Affichage de la FatMax TFCL™
 * Zone lipidique estimée avec plage et confiance
 */

import { useMemo, useState } from "react";
import { useIsRunningOnly } from "@/hooks/useRunningFocusMode";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Flame, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle,
  HelpCircle,
  Zap,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeFatMaxTFCL,
  FatMaxTFCLInput,
  FatMaxTFCLResult,
  FatMaxObjectif,
  getFatMaxConfidenceBadgeClass,
  getMetabolicZoneColor,
  formatFatMaxRange,
  formatFatMaxWatts,
  FATMAX_DEFINITIONS,
} from "@/lib/v2/fatmaxTFCL";

interface FatMaxTFCLCardProps {
  vlamaxEffectif: number | null;
  vlamaxConfidence: number;
  vo2max?: number | null;
  tteEffectif?: number | null;
  tteConfidence?: number;
  fatigueIndex?: number | null;
  objectif: FatMaxObjectif | string;
  ftp?: number | null;
  className?: string;
  compact?: boolean;
}

export function FatMaxTFCLCard({
  vlamaxEffectif,
  vlamaxConfidence,
  vo2max = null,
  tteEffectif = null,
  tteConfidence = 0.6,
  fatigueIndex = null,
  objectif,
  ftp = null,
  className,
  compact = false,
}: FatMaxTFCLCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const isRunning = useIsRunningOnly();
  const refLabel = isRunning ? "Seuil" : "FTP";

  const fatmax = useMemo(() => {
    // Normaliser l'objectif
    const normalizedObjectif = (objectif === "IM" ? "Ironman" : objectif) as FatMaxObjectif;
    
    const input: FatMaxTFCLInput = {
      vlamaxEffectif,
      vlamaxConfidence,
      vo2maxEffectif: vo2max,
      tteEffectif,
      tteConfidence,
      fatigueIndex,
      objectif: normalizedObjectif,
      ftp,
    };
    
    return computeFatMaxTFCL(input);
  }, [vlamaxEffectif, vlamaxConfidence, vo2max, tteEffectif, tteConfidence, fatigueIndex, objectif, ftp]);

  // État indisponible
  if (!fatmax) {
    return (
      <Card className={cn("overflow-hidden opacity-60", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Flame className="w-4 h-4" />
            FatMax TFCL™
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm text-center">Estimation indisponible</p>
            <p className="text-xs mt-1">VLamax requise pour le calcul</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const wattsRange = formatFatMaxWatts(fatmax, ftp);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              FatMax TFCL™
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs font-normal">
                      Estimation
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{FATMAX_DEFINITIONS.disclaimer}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Zone lipidique estimée — {fatmax.objectifLabel}
            </CardDescription>
          </div>

          {/* Badge confiance */}
          <Badge 
            variant="outline" 
            className={cn("text-xs", getFatMaxConfidenceBadgeClass(fatmax.confidenceLevel))}
          >
            Confiance {fatmax.confidenceLabel.toLowerCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* FatMax PHYSIOLOGIQUE (réalité biologique de l'athlète) */}
        <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-lg border border-orange-200/50 dark:border-orange-800/30">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <p className="text-xs text-muted-foreground">FatMax physiologique</p>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    Réalité biologique de l'athlète, basée sur VLamax + VO2max + TTE + fatigue.
                    Indépendante de l'objectif de course.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {fatmax.physioMinPctFTP}–{fatmax.physioMaxPctFTP}% {refLabel}
          </p>
          {ftp && (
            <p className="text-sm text-muted-foreground mt-1">
              {Math.round(ftp * fatmax.physioMinPctFTP / 100)}–{Math.round(ftp * fatmax.physioMaxPctFTP / 100)} W
            </p>
          )}
          <p className="text-sm font-medium mt-2">
            Centre: {fatmax.physioCenterPctFTP}% {refLabel}
          </p>
        </div>

        {/* ZONE DE TRAVAIL recommandée (modulée par l'objectif) */}
        <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm font-medium">Zone de travail — {fatmax.objectifLabel}</span>
            </div>
            <span className="font-mono text-sm font-medium text-primary">
              {fatmax.workMinPctFTP}–{fatmax.workMaxPctFTP}% {refLabel}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {fatmax.workZoneRationale}
          </p>
        </div>

        {/* Crossover Zone */}
        <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50 dark:border-amber-800/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-sm font-medium">Crossover Zone</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Zone de transition où l'utilisation des glucides dépasse les lipides (50/50).
                      Au-dessus de cette zone, la dépendance glucidique augmente significativement.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className="font-mono text-sm font-medium text-amber-600 dark:text-amber-400">
              {fatmax.crossoverZone[0]}–{fatmax.crossoverZone[1]}% {refLabel}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            8-12% au-dessus de FatMax — transition lipides/glucides
          </p>
        </div>

        {/* Zone métabolique */}
        <div className="flex items-center justify-center gap-2 text-sm">
          <Zap className={cn("w-4 h-4", getMetabolicZoneColor(fatmax.metabolicZone))} />
          <span className={getMetabolicZoneColor(fatmax.metabolicZone)}>
            {fatmax.zoneLabel}
          </span>
        </div>

        {/* Interprétation athlète */}
        {!compact && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                {fatmax.interpretation}
              </p>
            </div>
          </div>
        )}

        {/* Pourquoi ce résultat */}
        <Collapsible open={showWhy} onOpenChange={setShowWhy}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                Pourquoi ce résultat ?
              </span>
              {showWhy ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
              {fatmax.adjustments.map((adj) => (
                <div key={adj.id} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{adj.label}</span>
                  <span className="flex items-center gap-1 font-mono">
                    {adj.direction === "up" && <TrendingUp className="w-3 h-3 text-green-500" />}
                    {adj.direction === "down" && <TrendingDown className="w-3 h-3 text-red-500" />}
                    {adj.id === "base" 
                      ? `${adj.value.toFixed(0)}%` 
                      : `${adj.value > 0 ? "+" : ""}${adj.value}%`}
                  </span>
                </div>
              ))}
              <div className="border-t pt-2 mt-2 flex items-center justify-between text-xs font-medium">
                <span>Résultat final</span>
                <span className="font-mono">{fatmax.centerPctFTP}% {refLabel}</span>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Détails techniques (Staff) */}
        {!compact && (
          <Collapsible open={showDetails} onOpenChange={setShowDetails}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="w-full justify-between">
                <span>Détails techniques</span>
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-2">
                <p>{fatmax.staffNote}</p>
                <div className="border-t pt-2 text-muted-foreground">
                  <p className="italic">{FATMAX_DEFINITIONS.scientificWarning}</p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Disclaimer compact */}
        {compact && (
          <p className="text-xs text-muted-foreground text-center italic">
            Estimation — sans calorimétrie directe
          </p>
        )}
      </CardContent>
    </Card>
  );
}
