/**
 * InjuryRiskV2Card — Carte affichant le Risque Blessure CAP V2
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { V2ConfidenceBadge } from "./V2ConfidenceBadge";
import { 
  InjuryRiskV2, 
  getInjuryRiskColor, 
  getInjuryRiskBadgeClass 
} from "@/lib/v2";
import { Activity, AlertTriangle, Info, Shield, Lightbulb, Bike } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface InjuryRiskV2CardProps {
  data: InjuryRiskV2;
  showDetails?: boolean;
}

export function InjuryRiskV2Card({ data, showDetails = true }: InjuryRiskV2CardProps) {
  const getScoreColor = (score: number) => {
    if (score <= 30) return "text-green-600 dark:text-green-400";
    if (score <= 50) return "text-blue-600 dark:text-blue-400";
    if (score <= 75) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  const getProgressColor = (score: number) => {
    if (score <= 30) return "bg-green-500";
    if (score <= 50) return "bg-blue-500";
    if (score <= 75) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-red-500" />
            Risque Blessure CAP V2
          </CardTitle>
          <V2ConfidenceBadge confidence={data.confidence} size="sm" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Score principal */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <span className={cn("text-3xl font-bold tracking-tight", getScoreColor(data.score))}>
              {data.score}
            </span>
            <span className="text-xl text-muted-foreground">/100</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {data.levelEmoji} {data.levelLabel}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <Progress 
            value={data.score} 
            className={cn("h-3", getProgressColor(data.score))}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Très faible</span>
            <span>Modéré</span>
            <span>Critique</span>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Niveau</span>
          <Badge 
            variant="outline" 
            className={cn("text-xs", getInjuryRiskBadgeClass(data.level))}
          >
            {data.levelLabel}
          </Badge>
        </div>

        {/* Why risk increases */}
        <div className="p-2 bg-muted/50 rounded-md">
          <div className="flex items-center gap-1 text-xs font-medium mb-1">
            <AlertTriangle className="h-3 w-3" />
            Pourquoi le risque augmente
          </div>
          <p className="text-xs text-muted-foreground">{data.whyRiskIncreases}</p>
        </div>

        {/* Risk factors accordion */}
        {showDetails && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="factors" className="border-none">
              <AccordionTrigger className="text-xs py-2">
                Facteurs de risque détaillés
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {data.riskFactors.map((factor) => (
                    <div key={factor.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{factor.label}</span>
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-[10px]",
                            factor.impact === 'critical' ? "bg-red-500/20 text-red-700 border-red-500/50" :
                            factor.impact === 'high' ? "bg-amber-500/20 text-amber-700 border-amber-500/50" :
                            factor.impact === 'medium' ? "bg-blue-500/20 text-blue-700 border-blue-500/50" :
                            "bg-green-500/20 text-green-700 border-green-500/50"
                          )}
                        >
                          {factor.value}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={factor.contribution} className="h-1 flex-1" />
                        <span className="text-[10px] text-muted-foreground w-6 text-right">
                          {Math.round(factor.contribution)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Coach recommendations */}
        {data.coachRecommendations.length > 0 && (
          <div className="space-y-1.5 p-2 bg-blue-500/10 rounded-md border border-blue-500/30">
            <div className="flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-300">
              <Lightbulb className="h-3 w-3" />
              Recommandations coach
            </div>
            <ul className="space-y-0.5">
              {data.coachRecommendations.map((rec, i) => (
                <li key={i} className="text-[10px] text-blue-600 dark:text-blue-400 pl-4 relative before:content-['•'] before:absolute before:left-1">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Guardrails */}
        {data.guardrails.length > 0 && (
          <div className="space-y-1.5 p-2 bg-amber-500/10 rounded-md border border-amber-500/30">
            <div className="flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              <Shield className="h-3 w-3" />
              Points de vigilance
            </div>
            <ul className="space-y-0.5">
              {data.guardrails.map((guard, i) => (
                <li key={i} className="text-[10px] text-amber-600 dark:text-amber-400 pl-4 relative before:content-['•'] before:absolute before:left-1">
                  {guard}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Bike comparison */}
        {data.bikeComparison?.canShiftLoadToBike && (
          <div className="flex items-start gap-2 p-2 bg-green-500/10 rounded-md border border-green-500/30">
            <Bike className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
            <p className="text-xs text-green-700 dark:text-green-300">
              {data.bikeComparison.message}
            </p>
          </div>
        )}

        {/* Warnings */}
        {data.warnings.length > 0 && (
          <div className="space-y-1">
            {data.warnings.map((warning, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2 pt-2 border-t text-[10px] text-muted-foreground">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{data.disclaimer}</span>
        </div>
      </CardContent>
    </Card>
  );
}
