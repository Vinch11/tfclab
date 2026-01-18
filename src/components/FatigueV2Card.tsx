/**
 * FatigueV2Card — Carte affichant Fatigue Fonctionnelle V2
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { V2ConfidenceBadge } from "./V2ConfidenceBadge";
import { 
  FatigueFonctionnelleV2, 
  getFatigueLevelColor, 
  getFatigueBadgeClass,
  getFatigueProgressColor 
} from "@/lib/v2";
import { Battery, AlertTriangle, Info, TrendingUp, TrendingDown, Minus, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FatigueV2CardProps {
  data: FatigueFonctionnelleV2;
  showDetails?: boolean;
}

export function FatigueV2Card({ data, showDetails = true }: FatigueV2CardProps) {
  const getTrendIcon = () => {
    switch (data.trend) {
      case 'improving': return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'worsening': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'stable': return <Minus className="h-4 w-4 text-muted-foreground" />;
      default: return null;
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Battery className="h-4 w-4 text-orange-500" />
            Fatigue Fonctionnelle V2
          </CardTitle>
          <div className="flex items-center gap-2">
            {getTrendIcon()}
            <V2ConfidenceBadge confidence={data.confidence} size="sm" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Score principal */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <span className="text-3xl font-bold tracking-tight">{data.score}</span>
            <span className="text-xl text-muted-foreground">%</span>
          </div>
          <div className="text-xs text-muted-foreground">{data.levelEmoji} {data.levelLabel}</div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <Progress 
            value={data.score} 
            className={cn("h-3", getFatigueProgressColor(data.score))}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Frais</span>
            <span>Fonctionnel</span>
            <span>Élevé</span>
            <span>Critique</span>
          </div>
        </div>

        {/* Status badge */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Niveau</span>
          <Badge 
            variant="outline" 
            className={cn("text-xs", getFatigueBadgeClass(data.level))}
          >
            {data.levelLabel}
          </Badge>
        </div>

        {/* Origine */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Origine principale</span>
          <span className="text-sm">{data.originLabel}</span>
        </div>

        {/* Trend */}
        {data.trendLabel && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Tendance</span>
            <span className="text-sm">{data.trendLabel}</span>
          </div>
        )}

        {/* Explication "D'où vient ta fatigue" */}
        {'whyFatigued' in data && (data as any).whyFatigued ? (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-2">
            <span className="font-medium">D'où vient ta fatigue :</span> {(data as any).whyFatigued}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-2">
            {data.levelDescription}
          </div>
        )}

        {/* Details accordion - Piliers */}
        {showDetails && 'pillars' in data && (
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="pillars" className="border-none">
              <AccordionTrigger className="text-xs py-2">
                Décomposition par pilier
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {Object.entries(data.pillars).map(([key, pillar]: [string, any]) => (
                    <div key={key} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {pillar.icon} {pillar.label}
                      </span>
                      <div className="flex items-center gap-2">
                        <Progress value={pillar.score} className="w-16 h-1.5" />
                        <span className="w-8 text-right font-mono">{pillar.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Recommendations */}
        {data.recommendations.length > 0 && (
          <div className="space-y-1.5 p-2 bg-blue-500/10 rounded-md border border-blue-500/30">
            <div className="flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-300">
              <Lightbulb className="h-3 w-3" />
              Recommandations
            </div>
            <ul className="space-y-0.5">
              {data.recommendations.map((rec, i) => (
                <li key={i} className="text-[10px] text-blue-600 dark:text-blue-400 pl-4 relative before:content-['•'] before:absolute before:left-1">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Advisory triggers */}
        {'advisoryTriggers' in data && data.advisoryTriggers?.showAlert && (
          <div className="p-2 bg-warning/10 border border-warning/30 rounded-md">
            <div className="flex items-center gap-1 text-xs font-medium text-warning">
              <AlertTriangle className="h-3 w-3" />
              {data.advisoryTriggers.suggestDeload 
                ? "Semaine de décharge recommandée" 
                : "Récupération prioritaire"}
            </div>
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
          <span>
            {'disclaimer' in data ? data.disclaimer : 'Score composite Two For Coaching Lab V2™'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
