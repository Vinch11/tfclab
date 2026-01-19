/**
 * VLamaxExplainedCard — Version pédagogique détaillée pour coachs
 * Explique clairement le VLamax, le choix du cluster et les implications pratiques
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Zap,
  AlertTriangle,
  Info,
  HelpCircle,
  ChevronDown,
  Target,
  BarChart3,
  Users,
  Activity,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  computeVLamaxBikeV2Enhanced,
  VLamaxBikeV2EnhancedInput,
  getVLamaxV2EnhancedColor,
  getVLamaxV2EnhancedCategory,
  CLUSTER_VLAMAX_STATS,
} from "@/lib/v2/vlamaxBikeV2Enhanced";
import {
  getInferredLevelLabel,
} from "@/lib/reference/clusterSelector";

interface VLamaxExplainedCardProps {
  input: VLamaxBikeV2EnhancedInput;
  ambitionLevel?: "finisher" | "performance" | "podium" | "elite";
  targetVLamax?: { min: number; max: number };
}

// Mapping ambition → objectifs VLamax recommandés
const AMBITION_TARGETS: Record<string, { min: number; max: number; label: string; description: string }> = {
  "finisher": {
    min: 0.40,
    max: 0.65,
    label: "Finisher",
    description: "Objectif terminer l'épreuve. VLamax modérée acceptable, priorité à l'endurance de base."
  },
  "performance": {
    min: 0.32,
    max: 0.50,
    label: "Performance",
    description: "Objectif temps personnel. VLamax équilibrée pour optimiser l'intensité soutenue."
  },
  "podium": {
    min: 0.28,
    max: 0.42,
    label: "Podium AG",
    description: "Objectif podium age-group. VLamax basse nécessaire pour maintenir haut % FTP."
  },
  "elite": {
    min: 0.22,
    max: 0.35,
    label: "Élite / Pro",
    description: "Niveau élite. VLamax très basse pour maximiser l'efficacité métabolique."
  },
};

// Messages d'interprétation selon profil et objectif
function getInterpretation(
  vlamax: number,
  target: { min: number; max: number } | undefined,
  objectif: string
): { status: "optimal" | "acceptable" | "work_needed"; message: string; actions: string[] } {
  const obj = objectif.toLowerCase();
  const isLongDistance = obj.includes("im") || obj.includes("ironman") || obj.includes("703") || 
                         obj.includes("marathon") || obj.includes("ultra") || obj.includes("trail");
  
  if (!target) {
    // Pas de cible définie, interpréter selon objectif
    if (isLongDistance) {
      if (vlamax <= 0.40) {
        return {
          status: "optimal",
          message: "Profil bien adapté aux efforts de longue durée.",
          actions: ["Maintenir le travail d'endurance", "Éviter les séances sprint intensives"]
        };
      } else if (vlamax <= 0.55) {
        return {
          status: "acceptable",
          message: "Profil correct mais perfectible pour le long distance.",
          actions: ["Augmenter le volume Z2", "Réduire les intervalles très courts", "Travail FatMax"]
        };
      } else {
        return {
          status: "work_needed",
          message: "Profil glycolytique — adaptation nécessaire pour le long distance.",
          actions: ["Réorienter vers endurance longue", "Limiter les sprints", "Séances tempo prolongées", "Patience: 12-24 semaines minimum"]
        };
      }
    } else {
      // Court/sprint
      if (vlamax >= 0.55) {
        return {
          status: "optimal",
          message: "Profil explosif adapté aux efforts courts.",
          actions: ["Maintenir le travail de puissance", "Sprints réguliers"]
        };
      } else if (vlamax >= 0.40) {
        return {
          status: "acceptable",
          message: "Profil équilibré — développement glycolytique possible.",
          actions: ["Ajouter des intervalles courts", "Travail sprint 15-30s"]
        };
      } else {
        return {
          status: "work_needed",
          message: "Profil très aérobie — adaptation pour efforts courts.",
          actions: ["Intervalles très courts haute intensité", "Sprints répétés", "Réduire le volume Z2 excessif"]
        };
      }
    }
  }

  // Avec cible définie
  if (vlamax >= target.min && vlamax <= target.max) {
    return {
      status: "optimal",
      message: `VLamax dans la plage cible (${target.min.toFixed(2)}-${target.max.toFixed(2)}).`,
      actions: ["Maintenir l'équilibre actuel", "Affiner selon la phase de saison"]
    };
  } else if (vlamax < target.min) {
    const diff = target.min - vlamax;
    return {
      status: diff > 0.10 ? "work_needed" : "acceptable",
      message: `VLamax ${diff > 0.10 ? "nettement" : "légèrement"} en dessous de la cible.`,
      actions: diff > 0.10 
        ? ["Ajouter du travail glycolytique", "Intervalles courts haute intensité", "Sprints réguliers"]
        : ["Ajustement mineur possible", "Quelques séances sprint"]
    };
  } else {
    const diff = vlamax - target.max;
    return {
      status: diff > 0.10 ? "work_needed" : "acceptable",
      message: `VLamax ${diff > 0.10 ? "nettement" : "légèrement"} au-dessus de la cible.`,
      actions: diff > 0.10
        ? ["Augmenter le volume Z2", "Réduire les sprints", "Travail tempo prolongé", "12-24 semaines d'adaptation"]
        : ["Ajustement léger", "Plus d'endurance longue"]
    };
  }
}

export function VLamaxExplainedCard({
  input,
  ambitionLevel,
  targetVLamax,
}: VLamaxExplainedCardProps) {
  const result = computeVLamaxBikeV2Enhanced(input);
  
  // Déterminer la cible selon l'ambition
  const effectiveTarget = targetVLamax || (ambitionLevel ? AMBITION_TARGETS[ambitionLevel] : undefined);
  
  // Cluster et interprétation
  const cluster = result.cluster;
  const interpretation = getInterpretation(result.value, effectiveTarget, input.objectif || "");

  // Statistiques du cluster pour comparaison
  const clusterStats = cluster ? CLUSTER_VLAMAX_STATS[cluster.clusterId] : null;

  // Badge confiance
  const confidenceBadgeClass =
    result.confidence >= 0.75
      ? "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50"
      : result.confidence >= 0.55
      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50"
      : "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50";

  // Status badge
  const statusConfig = {
    optimal: { icon: CheckCircle2, color: "text-green-600 dark:text-green-400", bg: "bg-green-500/10", label: "Optimal" },
    acceptable: { icon: Activity, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10", label: "Acceptable" },
    work_needed: { icon: TrendingUp, color: "text-red-600 dark:text-red-400", bg: "bg-red-500/10", label: "À travailler" },
  };
  const status = statusConfig[interpretation.status];
  const StatusIcon = status.icon;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            VLamax Vélo — Analyse Détaillée
          </CardTitle>
          <Badge className={cn("text-[10px]", confidenceBadgeClass)}>
            {result.confidenceLabel}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Section 1: Valeur et catégorie */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-muted/30 rounded-lg">
            <div className={cn("text-3xl font-bold font-mono", getVLamaxV2EnhancedColor(result.value))}>
              {result.value.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">mmol/L/s</div>
            <div className="text-sm font-medium mt-1">{getVLamaxV2EnhancedCategory(result.value)}</div>
          </div>
          
          <div className="flex flex-col justify-center space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Plage estimée:</span>
              <span className="font-mono text-sm">{result.rangeMin.toFixed(2)} – {result.rangeMax.toFixed(2)}</span>
            </div>
            {effectiveTarget && (
              <div className="flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs text-muted-foreground">Cible:</span>
                <span className="font-mono text-sm text-primary">
                  {effectiveTarget.min.toFixed(2)} – {effectiveTarget.max.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Interprétation coach */}
        <div className={cn("p-3 rounded-lg border", status.bg)}>
          <div className="flex items-start gap-2">
            <StatusIcon className={cn("h-5 w-5 mt-0.5 shrink-0", status.color)} />
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <span className={cn("font-medium", status.color)}>{status.label}</span>
                {ambitionLevel && (
                  <Badge variant="outline" className="text-[10px]">
                    Ambition: {AMBITION_TARGETS[ambitionLevel]?.label}
                  </Badge>
                )}
              </div>
              <p className="text-sm">{interpretation.message}</p>
              
              {/* Actions recommandées */}
              <div className="space-y-1 mt-2">
                <p className="text-xs font-medium text-muted-foreground">Actions recommandées:</p>
                <ul className="space-y-1">
                  {interpretation.actions.map((action, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-primary">→</span>
                      <span>{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Explication du cluster (si disponible) */}
        {cluster && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="cluster" className="border rounded-lg px-3">
              <AccordionTrigger className="py-2 hover:no-underline">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Référentiel de comparaison</span>
                  <Badge variant="outline" className="text-[10px] ml-2">
                    {cluster.clusterLabel}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 space-y-3">
                {/* Pourquoi ce cluster */}
                <div className="space-y-2">
                  <p className="text-xs font-medium flex items-center gap-1">
                    <HelpCircle className="h-3 w-3" />
                    Pourquoi ce référentiel ?
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1 pl-4">
                    {cluster.rationale.map((r, i) => (
                      <p key={i}>• {r}</p>
                    ))}
                  </div>
                </div>

                {/* Niveau inféré */}
                <div className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                  <span className="text-muted-foreground">Niveau estimé:</span>
                  <span className="font-medium">{getInferredLevelLabel(cluster.inferredLevel)}</span>
                </div>

                {/* Confiance cluster */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Confiance sélection cluster:</span>
                    <span>{(cluster.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={cluster.confidence * 100} className="h-1.5" />
                </div>

                {/* Stats du cluster */}
                {clusterStats && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Distribution du groupe de référence:</p>
                    <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
                      <div className="p-1.5 bg-muted/50 rounded">
                        <div className="text-muted-foreground">P10</div>
                        <div className="font-mono">{clusterStats.p10.toFixed(2)}</div>
                      </div>
                      <div className="p-1.5 bg-muted/50 rounded">
                        <div className="text-muted-foreground">P25</div>
                        <div className="font-mono">{clusterStats.p25.toFixed(2)}</div>
                      </div>
                      <div className="p-1.5 bg-green-500/20 rounded border border-green-500/30">
                        <div className="text-muted-foreground">P50</div>
                        <div className="font-mono font-medium">{clusterStats.p50.toFixed(2)}</div>
                      </div>
                      <div className="p-1.5 bg-muted/50 rounded">
                        <div className="text-muted-foreground">P75</div>
                        <div className="font-mono">{clusterStats.p75.toFixed(2)}</div>
                      </div>
                      <div className="p-1.5 bg-muted/50 rounded">
                        <div className="text-muted-foreground">P90</div>
                        <div className="font-mono">{clusterStats.p90.toFixed(2)}</div>
                      </div>
                    </div>
                    
                    {/* Positionnement athlète */}
                    {result.percentile !== undefined && (
                      <div className="mt-2 p-2 bg-primary/5 rounded text-xs">
                        <span className="text-muted-foreground">Position de l'athlète: </span>
                        <span className="font-medium">
                          Percentile {result.percentile}
                          {result.percentile <= 25 && " (VLamax basse par rapport au groupe)"}
                          {result.percentile >= 75 && " (VLamax élevée par rapport au groupe)"}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Warnings cluster */}
                {cluster.warnings.length > 0 && (
                  <div className="space-y-1">
                    {cluster.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 text-[10px] text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Note importante */}
                <div className="p-2 bg-blue-500/10 rounded text-[10px] text-blue-700 dark:text-blue-300">
                  <Info className="h-3 w-3 inline mr-1" />
                  Le cluster sert uniquement de référentiel comparatif. Il ne classe pas l'athlète 
                  mais permet de contextualiser ses valeurs par rapport à un groupe similaire.
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Section détails calcul */}
            <AccordionItem value="calculation" className="border rounded-lg px-3 mt-2">
              <AccordionTrigger className="py-2 hover:no-underline">
                <div className="flex items-center gap-2 text-sm">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span>Détails du calcul</span>
                  <Badge variant="secondary" className="text-[10px] ml-2">
                    {result.formulaLabel}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 space-y-3">
                {/* Sources */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Sources utilisées:</span>
                  {result.sources.map((source) => (
                    <Badge key={source} variant="secondary" className="text-[10px]">
                      {source}
                    </Badge>
                  ))}
                </div>

                {/* Composants si disponibles */}
                {result.components && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Composants du calcul:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {result.components.r30 !== null && (
                        <div className="p-2 bg-muted/30 rounded">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">
                                <span className="text-muted-foreground">r30 (P30/FTP)</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Ratio puissance 30s / FTP. Plus élevé = plus glycolytique.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <p className="font-mono font-medium">{result.components.r30.toFixed(2)}</p>
                        </div>
                      )}
                      {result.components.r60 !== null && (
                        <div className="p-2 bg-muted/30 rounded">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">
                                <span className="text-muted-foreground">r60 (P60/FTP)</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Ratio puissance 60s / FTP. Plus élevé = plus glycolytique.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <p className="font-mono font-medium">{result.components.r60.toFixed(2)}</p>
                        </div>
                      )}
                      {result.components.rfm !== null && (
                        <div className="p-2 bg-muted/30 rounded">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">
                                <span className="text-muted-foreground">rfm (FTP/MAP)</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Ratio FTP / MAP 5min. Plus bas = plus glycolytique.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <p className="font-mono font-medium">{result.components.rfm.toFixed(2)}</p>
                        </div>
                      )}
                      {result.components.D !== null && (
                        <div className="p-2 bg-muted/30 rounded">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="cursor-help">
                                <span className="text-muted-foreground">TTE</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Time to Exhaustion au FTP. Plus court = plus glycolytique.
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <p className="font-mono font-medium">{input.tte_min ?? "—"} min</p>
                        </div>
                      )}
                    </div>

                    {/* Score G */}
                    <div className="p-2 bg-primary/5 rounded flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Score composite G:</span>
                      <span className="font-mono font-medium">{(result.components.scoreG * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                )}

                {/* Message pédagogique */}
                <p className="text-xs text-muted-foreground italic p-2 bg-muted/30 rounded">
                  {result.pedagogicalMessage}
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Section 4: Qu'est-ce que VLamax ? */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
              <span className="flex items-center gap-2">
                <HelpCircle className="h-3 w-3" />
                Qu'est-ce que le VLamax ?
              </span>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2 space-y-2 text-xs text-muted-foreground">
            <p>
              <strong>VLamax</strong> (Vitesse maximale de production de lactate) mesure la capacité 
              du système glycolytique à produire de l'énergie rapidement.
            </p>
            <div className="grid grid-cols-2 gap-2 my-2">
              <div className="p-2 bg-cyan-500/10 rounded">
                <p className="font-medium text-cyan-700 dark:text-cyan-300">VLamax basse (&lt;0.40)</p>
                <p className="mt-1">Profil endurant. Idéal pour Ironman, marathon, ultra.</p>
              </div>
              <div className="p-2 bg-red-500/10 rounded">
                <p className="font-medium text-red-700 dark:text-red-300">VLamax élevée (&gt;0.60)</p>
                <p className="mt-1">Profil explosif. Adapté sprint, piste, efforts courts.</p>
              </div>
            </div>
            <p>
              <strong>Important:</strong> VLamax élevé n'est ni bon ni mauvais — c'est une caractéristique 
              du profil métabolique qui doit être adaptée à l'objectif.
            </p>
          </CollapsibleContent>
        </Collapsible>

        {/* Warnings */}
        {result.warnings.length > 0 && (
          <div className="space-y-1 pt-2 border-t">
            {result.warnings.slice(0, 3).map((w, i) => (
              <div key={i} className="flex items-start gap-2 text-[10px] text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2 pt-2 border-t text-[10px] text-muted-foreground">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          <span>
            Estimation Two For Coaching Lab™ — Ne remplace pas un test lactate. 
            Interprétation coach requise.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
