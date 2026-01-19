/**
 * VLamaxExplainedCard — Version pédagogique détaillée pour coachs
 * Explique clairement le VLamax, le choix du cluster et les implications pratiques
 * 
 * IMPORTANT: Cette carte utilise vlamaxEffectif comme SOURCE UNIQUE DE VÉRITÉ
 * et intègre l'ajustement par âge via le composant unifié VLamaxInterpretationPanel
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
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  computeVLamaxBikeV2Enhanced,
  VLamaxBikeV2EnhancedInput,
  getVLamaxV2EnhancedColor,
  CLUSTER_VLAMAX_STATS,
} from "@/lib/v2/vlamaxBikeV2Enhanced";
import {
  getInferredLevelLabel,
} from "@/lib/reference/clusterSelector";
import { VLamaxEffectif } from "@/lib/vlamaxEffectif";
import { computeAgeAdjustmentIndex, getAgeAdjustedVLamaxThresholds } from "@/lib/ageAdjustment";

// ✅ Utilisation du composant unifié pour l'interprétation
import { VLamaxInterpretationPanel } from "@/components/VLamaxInterpretationPanel";

interface VLamaxExplainedCardProps {
  // Source unique de vérité — si fourni, utiliser cette valeur
  vlamaxEffectif?: VLamaxEffectif | null;
  // Fallback: données pour calcul V2 Enhanced
  input?: VLamaxBikeV2EnhancedInput;
  // Âge de l'athlète (en années)
  age?: number | null;
  ambitionLevel?: "finisher" | "performance" | "podium" | "elite";
  targetVLamax?: { min: number; max: number };
}

// Mapping ambition → objectifs VLamax recommandés (ajustables selon âge)
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

// ✅ La logique d'interprétation est maintenant dans VLamaxInterpretationPanel

export function VLamaxExplainedCard({
  vlamaxEffectif,
  input,
  age,
  ambitionLevel,
  targetVLamax,
}: VLamaxExplainedCardProps) {
  // ============================================
  // SOURCE UNIQUE DE VÉRITÉ: vlamaxEffectif
  // Si fourni, on l'utilise. Sinon fallback sur calcul V2
  // ============================================
  const hasEffectif = vlamaxEffectif && vlamaxEffectif.value !== null;
  
  // Calcul V2 Enhanced (fallback ou pour détails techniques)
  const v2Result = input ? computeVLamaxBikeV2Enhanced(input) : null;
  
  // Valeur VLamax à afficher (source unique)
  const displayValue = hasEffectif 
    ? vlamaxEffectif!.value! 
    : v2Result?.value ?? 0;
  
  // Confiance et source
  const confidence = hasEffectif ? vlamaxEffectif!.confidence : (v2Result?.confidence ?? 0);
  
  // Déterminer la cible selon l'ambition (ajustée pour l'âge si master)
  let effectiveTarget = targetVLamax || (ambitionLevel ? AMBITION_TARGETS[ambitionLevel] : undefined);
  
  // Ajuster les cibles pour les masters (tolérance plus large)
  if (effectiveTarget && age !== null && age !== undefined && age >= 40) {
    const ageOffset = age >= 50 ? 0.08 : 0.04;
    effectiveTarget = {
      ...effectiveTarget,
      min: effectiveTarget.min + ageOffset / 2,
      max: effectiveTarget.max + ageOffset,
    };
  }
  
  // Cluster depuis V2
  const cluster = v2Result?.cluster;

  // Statistiques du cluster pour comparaison
  const clusterStats = cluster ? CLUSTER_VLAMAX_STATS[cluster.clusterId] : null;

  // Badge confiance
  const confidenceBadgeClass =
    confidence >= 0.75
      ? "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50"
      : confidence >= 0.55
      ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50"
      : "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50";

  // Seuils ajustés pour affichage dans le tooltip
  const ageIndex = computeAgeAdjustmentIndex(age ?? null);
  const ageThresholds = getAgeAdjustedVLamaxThresholds(age ?? null);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            VLamax Vélo — Analyse Détaillée
            {hasEffectif && (
              <Badge variant="outline" className="text-[10px] border-blue-500/50 text-blue-600 dark:text-blue-400">
                Référence
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {age !== null && age !== undefined && age > 0 && (
              <Badge variant="outline" className="text-[10px] flex items-center gap-1">
                <Calendar className="h-2.5 w-2.5" />
                {age} ans
              </Badge>
            )}
            <Badge className={cn("text-[10px]", confidenceBadgeClass)}>
              {confidence >= 0.8 ? "Très fiable" : confidence >= 0.6 ? "Fiable" : confidence >= 0.4 ? "Modéré" : "Faible"}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* ✅ Section 1+2: Utilisation du composant unifié VLamaxInterpretationPanel */}
        <VLamaxInterpretationPanel
          vlamax={displayValue}
          age={age}
          sport="bike"
          objectif={input?.objectif || "IM"}
          targetRange={effectiveTarget ? [effectiveTarget.min, effectiveTarget.max] : undefined}
          showAgeContext={true}
          showActions={true}
        />

        {/* Informations techniques supplémentaires */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-muted/20 rounded-lg">
          <div className="space-y-1">
            {hasEffectif && vlamaxEffectif?.source && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Source:</span>
                <Badge variant="secondary" className="text-[10px]">
                  {vlamaxEffectif.source === "snapshot" ? "Mesure labo" : 
                   vlamaxEffectif.source === "test" ? "Test terrain" : "Estimé"}
                </Badge>
              </div>
            )}
            {v2Result && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Plage estimée:</span>
                <span className="font-mono">{v2Result.rangeMin.toFixed(2)} – {v2Result.rangeMax.toFixed(2)}</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            {effectiveTarget && (
              <div className="flex items-center gap-2 text-xs">
                <Target className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">Cible{age !== null && age !== undefined && age >= 40 ? " (ajustée)" : ""}:</span>
                <span className="font-mono text-primary">
                  {effectiveTarget.min.toFixed(2)} – {effectiveTarget.max.toFixed(2)}
                </span>
              </div>
            )}
            {/* Seuils ajustés par âge */}
            {age !== null && age !== undefined && age >= 30 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400">
                      <Info className="h-3 w-3" />
                      <span>Seuils ajustés {ageIndex.label}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      À {age} ans, les seuils de profil sont ajustés:<br/>
                      • Diesel: &lt; {ageThresholds.diesel.toFixed(2)}<br/>
                      • Endurant: &lt; {ageThresholds.endurant.toFixed(2)}<br/>
                      • Équilibré: &lt; {ageThresholds.equilibre.toFixed(2)}<br/>
                      • Explosif: &lt; {ageThresholds.explosif.toFixed(2)}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Section détails calcul */}
        {v2Result && (
          <Accordion type="single" collapsible className="w-full">
            {/* Section détails calcul */}
            {v2Result && (
            <AccordionItem value="calculation" className="border rounded-lg px-3 mt-2">
              <AccordionTrigger className="py-2 hover:no-underline">
                <div className="flex items-center gap-2 text-sm">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <span>Détails du calcul</span>
                  <Badge variant="secondary" className="text-[10px] ml-2">
                    {v2Result.formulaLabel}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 space-y-3">
                {/* Sources */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Sources utilisées:</span>
                  {v2Result.sources.map((source) => (
                    <Badge key={source} variant="secondary" className="text-[10px]">
                      {source}
                    </Badge>
                  ))}
                </div>

                {/* Composants si disponibles */}
                {v2Result.components && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium">Composants du calcul:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {v2Result.components.r30 !== null && (
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
                          <p className="font-mono font-medium">{v2Result.components.r30.toFixed(2)}</p>
                        </div>
                      )}
                      {v2Result.components.r60 !== null && (
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
                          <p className="font-mono font-medium">{v2Result.components.r60.toFixed(2)}</p>
                        </div>
                      )}
                      {v2Result.components.rfm !== null && (
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
                          <p className="font-mono font-medium">{v2Result.components.rfm.toFixed(2)}</p>
                        </div>
                      )}
                      {v2Result.components.D !== null && (
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
                          <p className="font-mono font-medium">{input?.tte_min ?? "—"} min</p>
                        </div>
                      )}
                    </div>

                    {/* Score G */}
                    <div className="p-2 bg-primary/5 rounded flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Score composite G:</span>
                      <span className="font-mono font-medium">{(v2Result.components.scoreG * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                )}

                {/* Message pédagogique */}
                <p className="text-xs text-muted-foreground italic p-2 bg-muted/30 rounded">
                  {v2Result.pedagogicalMessage}
                </p>
              </AccordionContent>
            </AccordionItem>
            )}
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
        {v2Result && v2Result.warnings.length > 0 && (
          <div className="space-y-1 pt-2 border-t">
            {v2Result.warnings.slice(0, 3).map((w, i) => (
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
