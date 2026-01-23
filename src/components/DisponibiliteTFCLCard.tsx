/**
 * Disponibilité TFCL™ Card — Affichage synthétique
 * 
 * Remplace l'ancien affichage "Fraîcheur" par l'indicateur Disponibilité TFCL™
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Target, 
  ChevronDown, 
  ChevronUp, 
  AlertTriangle, 
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type DisponibiliteTFCL,
  type TFCLReadinessInput,
  computeDisponibiliteTFCL,
  getDisponibiliteBadgeClass,
  getDisponibiliteBgColor,
  getConfidenceBadgeClass,
  DISPONIBILITE_PHILOSOPHY,
  DISPONIBILITE_SCALE
} from "@/lib/v2/disponibiliteTFCL";
import type { DbCheckin } from "@/hooks/useCloudData";

interface DisponibiliteTFCLCardProps {
  // Option 1: Fournir un résultat déjà calculé
  result?: DisponibiliteTFCL;
  
  // Option 2: Fournir les check-ins et calculer
  latestCheckin?: DbCheckin | null;
  previousCheckin?: DbCheckin | null;
  objectiveData?: TFCLReadinessInput['objective'];
  declaredLoad?: 'light' | 'moderate' | 'heavy' | null;
  
  // Options d'affichage
  compact?: boolean;
  showDetails?: boolean;
  showTrend?: boolean;
  className?: string;
}

export function DisponibiliteTFCLCard({
  result: providedResult,
  latestCheckin,
  previousCheckin,
  objectiveData,
  declaredLoad,
  compact = false,
  showDetails = true,
  showTrend = true,
  className,
}: DisponibiliteTFCLCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Calcul du résultat à partir du check-in si pas fourni
  const result = useMemo(() => {
    if (providedResult) return providedResult;
    if (!latestCheckin) return null;
    
    const input: TFCLReadinessInput = {
      sleep: latestCheckin.sleep ?? null,
      fatigue: latestCheckin.fatigue ?? null,
      soreness: latestCheckin.soreness ?? null,
      stress: latestCheckin.stress ?? null,
      motivation: latestCheckin.motivation ?? null,
      alerts: latestCheckin.pain_flag ? { asymmetric_pain: true } : undefined,
      objective: objectiveData,
      declaredLoad,
    };
    
    const computed = computeDisponibiliteTFCL(input);
    
    // Calcul tendance si check-in précédent
    if (previousCheckin) {
      const prevInput: TFCLReadinessInput = {
        sleep: previousCheckin.sleep ?? null,
        fatigue: previousCheckin.fatigue ?? null,
        soreness: previousCheckin.soreness ?? null,
        stress: previousCheckin.stress ?? null,
        motivation: previousCheckin.motivation ?? null,
        objective: objectiveData,
        declaredLoad,
      };
      const prevResult = computeDisponibiliteTFCL(prevInput);
      const diff = computed.score - prevResult.score;
      
      if (diff > 5) {
        computed.trend = 'improving';
        computed.trendLabel = `+${diff} pts`;
      } else if (diff < -5) {
        computed.trend = 'worsening';
        computed.trendLabel = `${diff} pts`;
      } else {
        computed.trend = 'stable';
        computed.trendLabel = 'Stable';
      }
    }
    
    return computed;
  }, [providedResult, latestCheckin, previousCheckin, objectiveData, declaredLoad]);
  
  // Pas de données
  if (!result) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            Disponibilité TFCL™
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aucun check-in disponible. Complète le questionnaire TFCL Daily Readiness.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const TrendIcon = result.trend === 'improving' ? TrendingUp :
                    result.trend === 'worsening' ? TrendingDown : Minus;
  
  // Mode compact
  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        getDisponibiliteBgColor(result.level),
        className
      )}>
        <div className="text-2xl">{result.levelEmoji}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Disponibilité {result.levelLabel}</span>
            {result.hasAlerts && (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {result.interpretation.recommendationLabel}
          </p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold">{result.score}</div>
          {showTrend && result.trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs",
              result.trend === 'improving' ? 'text-green-600' :
              result.trend === 'worsening' ? 'text-red-600' : 'text-muted-foreground'
            )}>
              <TrendIcon className="h-3 w-3" />
              {result.trendLabel}
            </div>
          )}
        </div>
      </div>
    );
  }
  
  return (
    <Card className={cn(getDisponibiliteBgColor(result.level), className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Disponibilité TFCL™
          </CardTitle>
          <div className="flex items-center gap-2">
            {showTrend && result.trend && (
              <Badge variant="outline" className={cn(
                "text-xs",
                result.trend === 'improving' ? 'text-green-600 border-green-500/30' :
                result.trend === 'worsening' ? 'text-red-600 border-red-500/30' : ''
              )}>
                <TrendIcon className="h-3 w-3 mr-1" />
                {result.trendLabel}
              </Badge>
            )}
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className={cn("text-xs", getConfidenceBadgeClass(result.confidence))}>
                  <Shield className="h-3 w-3 mr-1" />
                  {result.confidenceLabel}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs max-w-xs">{result.confidenceExplanation}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Score principal */}
        <div className="flex items-center gap-4">
          <div className="text-4xl">{result.levelEmoji}</div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold">{result.score}</span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
            <p className="text-sm font-medium">{result.levelLabel}</p>
          </div>
        </div>
        
        {/* Barre de progression */}
        <Progress 
          value={result.score} 
          className={cn(
            "h-2",
            result.level === 'high' ? '[&>div]:bg-green-500' :
            result.level === 'moderate' ? '[&>div]:bg-yellow-500' :
            result.level === 'low' ? '[&>div]:bg-orange-500' : '[&>div]:bg-red-500'
          )}
        />
        
        {/* Alertes */}
        {result.hasAlerts && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <p className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alerte Disponibilité
            </p>
            <ul className="mt-1 text-xs text-red-600 dark:text-red-400 space-y-1">
              {result.alertMessages.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Recommandation */}
        <div className="p-3 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">{result.interpretation.recommendationLabel}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {result.interpretation.recommendationExplanation}
          </p>
        </div>
        
        {/* Raisons principales */}
        {result.interpretation.mainReasons.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-1 text-muted-foreground">Facteurs principaux :</p>
            <div className="flex flex-wrap gap-1">
              {result.interpretation.mainReasons.slice(0, 4).map((reason, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {reason}
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        {/* Incohérences */}
        {result.inconsistencies.length > 0 && (
          <div className="flex items-start gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
            <Info className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-700 dark:text-yellow-400">
              {result.inconsistencies[0]}
            </p>
          </div>
        )}
        
        {/* Détails expandables */}
        {showDetails && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-xs">Détails du calcul</span>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-3 space-y-3">
              <Separator />
              
              {/* Score subjectif */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium">Score subjectif</p>
                  <Badge variant="secondary" className="text-xs">
                    {result.breakdown.subjective.score}/100
                  </Badge>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {Object.entries(result.breakdown.subjective.details).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div className="text-lg font-semibold">{value}</div>
                      <div className="text-[10px] text-muted-foreground capitalize">{key}</div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Score objectif */}
              {result.breakdown.objective.available && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium">Score objectif</p>
                    <Badge variant="secondary" className="text-xs">
                      {result.breakdown.objective.score}/100
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {result.breakdown.objective.sources.map((src, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {src}
                      </Badge>
                    ))}
                  </div>
                  {result.breakdown.objective.deviations.length > 0 && (
                    <ul className="mt-2 text-xs text-orange-600 space-y-0.5">
                      {result.breakdown.objective.deviations.map((dev, i) => (
                        <li key={i}>• {dev}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              
              {/* Pondérations */}
              <div>
                <p className="text-xs font-medium mb-1">Pondérations utilisées</p>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {result.weights.objective > 0 && (
                    <span>Objectif: {(result.weights.objective * 100).toFixed(0)}%</span>
                  )}
                  <span>Subjectif: {(result.weights.subjective * 100).toFixed(0)}%</span>
                  {result.weights.declaredLoad && (
                    <span>Charge: {(result.weights.declaredLoad * 100).toFixed(0)}%</span>
                  )}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Message athlète */}
        <div className="pt-2 border-t border-dashed">
          <p className="text-xs italic text-muted-foreground">
            {result.athleteMessage}
          </p>
        </div>
        
        {/* Disclaimer */}
        <p className="text-[10px] text-center text-muted-foreground">
          {result.disclaimer}
        </p>
      </CardContent>
    </Card>
  );
}

export default DisponibiliteTFCLCard;
