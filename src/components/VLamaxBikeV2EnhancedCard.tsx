/**
 * VLamaxBikeV2EnhancedCard — Carte VLamax Vélo V2 Enhanced avec faisceau d'indices
 * Affiche valeur, plage, percentile cluster, composants "Pourquoi"
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Zap,
  AlertTriangle,
  Info,
  HelpCircle,
  ChevronDown,
  Target,
  BarChart3,
  Beaker,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  computeVLamaxBikeV2Enhanced,
  VLamaxBikeV2EnhancedInput,
  VLamaxBikeV2EnhancedResult,
  getVLamaxV2EnhancedColor,
  getVLamaxV2EnhancedBgColor,
  getVLamaxV2EnhancedCategory,
  formatPercentileLabel,
  getClusterStats,
} from "@/lib/v2/vlamaxBikeV2Enhanced";

interface VLamaxBikeV2EnhancedCardProps {
  input: VLamaxBikeV2EnhancedInput;
  compact?: boolean;
}

export function VLamaxBikeV2EnhancedCard({
  input,
  compact = false,
}: VLamaxBikeV2EnhancedCardProps) {
  const [showWhy, setShowWhy] = useState(false);
  const navigate = useNavigate();

  const result = computeVLamaxBikeV2Enhanced(input);

  // Badge confiance
  const confidenceBadgeClass =
    result.confidence >= 0.75
      ? "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50"
      : result.confidence >= 0.55
      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50"
      : "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50";

  // Percentile position (0-100)
  const percentilePosition = Math.min(100, Math.max(0, result.percentile ?? 50));

  // Cluster stats pour barre visuelle
  const clusterStats = result.cluster ? getClusterStats(result.cluster.clusterId) : null;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 cursor-help">
              <Zap className="h-4 w-4 text-amber-500" />
              <span className={cn("font-mono font-bold", getVLamaxV2EnhancedColor(result.value))}>
                {result.value.toFixed(2)}
              </span>
              {result.percentile !== undefined && (
                <Badge variant="outline" className="text-[10px]">
                  {formatPercentileLabel(result.percentile)}
                </Badge>
              )}
              <Badge className={cn("text-[10px]", confidenceBadgeClass)}>
                {result.confidenceLabel}
              </Badge>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1 text-xs">
              <p className="font-medium">{result.formulaLabel}</p>
              <p>Plage : {result.rangeMin.toFixed(2)} – {result.rangeMax.toFixed(2)}</p>
              <p>{result.pedagogicalMessage}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            VLamax Vélo V2
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {result.formulaLabel}
            </Badge>
            <Badge className={cn("text-[10px]", confidenceBadgeClass)}>
              {result.confidenceLabel}
            </Badge>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => navigate("/diagnostic/vlamax")}
              title="Diagnostic VLamax (méthode-par-méthode)"
            >
              <Beaker className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Valeur principale + Plage */}
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className={cn("text-3xl font-bold tracking-tight font-mono", getVLamaxV2EnhancedColor(result.value))}>
              {result.value.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">mmol/L/s</div>
          </div>
          <div className="text-center px-4 border-l">
            <div className="text-sm font-medium text-muted-foreground">Plage</div>
            <div className="font-mono text-sm">
              {result.rangeMin.toFixed(2)} – {result.rangeMax.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Catégorie */}
        <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span className={cn("text-sm font-medium", getVLamaxV2EnhancedColor(result.value))}>
              {getVLamaxV2EnhancedCategory(result.value)}
            </span>
          </div>
          {result.percentile !== undefined && (
            <Badge variant="outline" className="font-mono">
              {formatPercentileLabel(result.percentile)}
            </Badge>
          )}
        </div>

        {/* Barre de percentile visuelle (si cluster disponible) */}
        {result.cluster && clusterStats && (
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
              {/* Indicateur de position */}
              <div
                className={cn(
                  "absolute w-3 h-3 rounded-full -top-0.5 transform -translate-x-1/2 border-2 border-background",
                  getVLamaxV2EnhancedBgColor(result.value)
                )}
                style={{ left: `${percentilePosition}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>{clusterStats.p10.toFixed(2)}</span>
              <span>{clusterStats.p25.toFixed(2)}</span>
              <span>{clusterStats.p50.toFixed(2)}</span>
              <span>{clusterStats.p75.toFixed(2)}</span>
              <span>{clusterStats.p90.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Cluster utilisé */}
        {result.cluster && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Cluster référence</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-[10px] cursor-help">
                    {result.cluster.clusterLabel.split(" ").slice(0, 3).join(" ")}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-xs space-y-1">
                    <p className="font-medium">{result.cluster.clusterLabel}</p>
                    <p>Confiance cluster : {(result.cluster.confidence * 100).toFixed(0)}%</p>
                    {result.isOutlier && (
                      <p className="text-amber-500">⚠️ Valeur hors P10-P90</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Sources utilisées */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Sources</span>
          <div className="flex gap-1 flex-wrap justify-end">
            {result.sources.map((source) => (
              <Badge key={source} variant="secondary" className="text-[10px]">
                {source}
              </Badge>
            ))}
          </div>
        </div>

        {/* Bouton "Pourquoi" avec composants */}
        {result.components && (
          <Collapsible open={showWhy} onOpenChange={setShowWhy}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-xs"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="h-3 w-3" />
                  Pourquoi cette valeur ?
                </span>
                <ChevronDown
                  className={cn("h-3 w-3 transition-transform", showWhy && "rotate-180")}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              {/* Ratios bruts */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                {result.components.r30 !== null && (
                  <div className="p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">r30 (P30/FTP)</span>
                    <p className="font-mono font-medium">{result.components.r30.toFixed(2)}</p>
                  </div>
                )}
                {result.components.r60 !== null && (
                  <div className="p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">r60 (P60/FTP)</span>
                    <p className="font-mono font-medium">{result.components.r60.toFixed(2)}</p>
                  </div>
                )}
                {result.components.rfm !== null && (
                  <div className="p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">rfm (FTP/MAP)</span>
                    <p className="font-mono font-medium">{result.components.rfm.toFixed(2)}</p>
                  </div>
                )}
                {result.components.D !== null && (
                  <div className="p-2 bg-muted/30 rounded">
                    <span className="text-muted-foreground">TTE (min)</span>
                    <p className="font-mono font-medium">{input.tte_min ?? "—"}</p>
                  </div>
                )}
              </div>

              {/* Scores normalisés */}
              <div className="space-y-2">
                <p className="text-[10px] text-muted-foreground font-medium">Scores normalisés (0-1)</p>
                <div className="grid grid-cols-4 gap-2">
                  {result.components.S30 !== null && (
                    <div className="text-center">
                      <div className="text-[10px] text-muted-foreground">S30</div>
                      <div className="font-mono text-sm">{(result.components.S30 * 100).toFixed(0)}%</div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${result.components.S30 * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {result.components.S60 !== null && (
                    <div className="text-center">
                      <div className="text-[10px] text-muted-foreground">S60</div>
                      <div className="font-mono text-sm">{(result.components.S60 * 100).toFixed(0)}%</div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500"
                          style={{ width: `${result.components.S60 * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {result.components.E !== null && (
                    <div className="text-center">
                      <div className="text-[10px] text-muted-foreground">E</div>
                      <div className="font-mono text-sm">{(result.components.E * 100).toFixed(0)}%</div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${result.components.E * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {result.components.D !== null && (
                    <div className="text-center">
                      <div className="text-[10px] text-muted-foreground">D</div>
                      <div className="font-mono text-sm">{(result.components.D * 100).toFixed(0)}%</div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-500"
                          style={{ width: `${result.components.D * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Score G */}
              <div className="p-2 bg-muted/30 rounded flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Score G (pondéré)</span>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-3 w-3 text-muted-foreground" />
                  <span className="font-mono font-medium">{(result.components.scoreG * 100).toFixed(1)}%</span>
                </div>
              </div>

              {/* Message pédagogique */}
              <p className="text-xs text-muted-foreground italic">
                {result.pedagogicalMessage}
              </p>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <div className="space-y-1">
            {result.warnings.slice(0, 3).map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-[10px] text-amber-600 dark:text-amber-400"
              >
                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2 pt-2 border-t text-[10px] text-muted-foreground">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          <span>Estimation TFCL V2 Enhanced — Interprétation coach requise</span>
        </div>
      </CardContent>
    </Card>
  );
}
