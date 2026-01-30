/**
 * ScenarioComparisonCard — Affichage unifié des 3 scénarios TFCL™
 * 
 * Présente les scénarios Conservative, Optimal et Aggressive
 * avec leurs probabilités de succès et indicateurs de risque.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  SCENARIO_DEFINITIONS,
  SCENARIO_ORDER,
  type ScenarioLevel,
  type ScenarioSet,
  formatProbability,
  getScenarioBadgeClass,
} from '@/lib/v2/scenarioEngine';

interface ScenarioComparisonCardProps<T> {
  title: string;
  scenarios: ScenarioSet<T>;
  renderScenario: (scenario: T, level: ScenarioLevel, def: typeof SCENARIO_DEFINITIONS[ScenarioLevel]) => React.ReactNode;
  compact?: boolean;
  showRecommendation?: boolean;
  className?: string;
}

export function ScenarioComparisonCard<T>({
  title,
  scenarios,
  renderScenario,
  compact = false,
  showRecommendation = true,
  className,
}: ScenarioComparisonCardProps<T>) {
  return (
    <Card className={cn("border-border", className)}>
      <CardHeader className={compact ? "pb-2" : undefined}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className={cn("flex items-center gap-2", compact ? "text-base" : "text-lg")}>
            {title}
            <Badge variant="outline" className="text-[10px] font-normal">
              3 scénarios
            </Badge>
          </CardTitle>
          {showRecommendation && (
            <Badge className={cn(getScenarioBadgeClass(scenarios.recommended), "text-xs")}>
              {SCENARIO_DEFINITIONS[scenarios.recommended].emoji} Recommandé: {SCENARIO_DEFINITIONS[scenarios.recommended].label}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Confiance globale: {Math.round(scenarios.confidence * 100)}%
        </p>
      </CardHeader>
      <CardContent className={compact ? "pt-0" : undefined}>
        <div className={cn(
          "grid gap-3",
          compact ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 md:grid-cols-3"
        )}>
          {SCENARIO_ORDER.map((level) => {
            const def = SCENARIO_DEFINITIONS[level];
            const scenario = scenarios[level];
            const isRecommended = level === scenarios.recommended;
            
            return (
              <div
                key={level}
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  isRecommended ? "ring-2 ring-primary/50 bg-primary/5" : "bg-muted/30",
                  level === 'conservative' && "border-green-500/30",
                  level === 'optimal' && "border-blue-500/30",
                  level === 'aggressive' && "border-red-500/30"
                )}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{def.emoji}</span>
                    <span className={cn(
                      "font-medium text-sm",
                      level === 'conservative' && "text-green-600 dark:text-green-400",
                      level === 'optimal' && "text-blue-600 dark:text-blue-400",
                      level === 'aggressive' && "text-red-600 dark:text-red-400"
                    )}>
                      {def.label}
                    </span>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={cn("text-[10px]", getScenarioBadgeClass(level))}
                  >
                    {formatProbability(def.successProbability)} succès
                  </Badge>
                </div>
                
                {/* Scenario Content */}
                <div className="space-y-2">
                  {renderScenario(scenario, level, def)}
                </div>
                
                {/* Description */}
                {!compact && (
                  <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                    {def.description}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Staff Note */}
        {!compact && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-dashed">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium">💡 Note Staff:</span>{' '}
              {SCENARIO_DEFINITIONS[scenarios.recommended].staffNote}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANTS SPÉCIALISÉS
// ═══════════════════════════════════════════════════════════════════════════════

interface PacingScenarioDisplayProps {
  scenarios: ScenarioSet<{
    intensityPct: number;
    intensityRange: [number, number];
    estimatedTimeMin: number;
    timeRange: [number, number];
    glycogenRisk: string;
  }>;
  referenceLabel?: string;
  compact?: boolean;
}

export function PacingScenarioDisplay({ 
  scenarios, 
  referenceLabel = "FTP",
  compact = false 
}: PacingScenarioDisplayProps) {
  const formatTime = (min: number) => {
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`;
  };
  
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-amber-600 dark:text-amber-400';
      case 'high': return 'text-orange-600 dark:text-orange-400';
      case 'critical': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };
  
  return (
    <ScenarioComparisonCard
      title="Scénarios de Pacing"
      scenarios={scenarios}
      compact={compact}
      renderScenario={(scenario, level) => (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Intensité</span>
            <span className="font-mono text-sm font-medium">
              {scenario.intensityPct}% {referenceLabel}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Temps estimé</span>
            <span className="font-mono text-sm">
              {formatTime(scenario.estimatedTimeMin)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Plage</span>
            <span className="font-mono text-xs text-muted-foreground">
              {formatTime(scenario.timeRange[0])} – {formatTime(scenario.timeRange[1])}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Risque glycogène</span>
            <span className={cn("text-xs font-medium uppercase", getRiskColor(scenario.glycogenRisk))}>
              {scenario.glycogenRisk}
            </span>
          </div>
        </div>
      )}
    />
  );
}

interface VLamaxScenarioDisplayProps {
  scenarios: ScenarioSet<{
    value: number;
    range: [number, number];
    label: string;
  }>;
  compact?: boolean;
}

export function VLamaxScenarioDisplay({ scenarios, compact = false }: VLamaxScenarioDisplayProps) {
  return (
    <ScenarioComparisonCard
      title="Scénarios VLamax"
      scenarios={scenarios}
      compact={compact}
      renderScenario={(scenario) => (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Valeur</span>
            <span className="font-mono text-lg font-bold">
              {scenario.value.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Plage</span>
            <span className="font-mono text-xs text-muted-foreground">
              {scenario.range[0].toFixed(2)} – {scenario.range[1].toFixed(2)}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            {scenario.label}
          </p>
        </div>
      )}
    />
  );
}

interface TTEScenarioDisplayProps {
  scenarios: ScenarioSet<{
    value: number;
    range: [number, number];
    wprime: number;
    label: string;
  }>;
  compact?: boolean;
}

export function TTEScenarioDisplay({ scenarios, compact = false }: TTEScenarioDisplayProps) {
  return (
    <ScenarioComparisonCard
      title="Scénarios TTE (Durabilité)"
      scenarios={scenarios}
      compact={compact}
      renderScenario={(scenario) => (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">TTE</span>
            <span className="font-mono text-lg font-bold">
              {Math.round(scenario.value)} min
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Plage</span>
            <span className="font-mono text-xs text-muted-foreground">
              {Math.round(scenario.range[0])} – {Math.round(scenario.range[1])} min
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">W' estimé</span>
            <span className="font-mono text-xs">
              {scenario.wprime.toFixed(1)} kJ
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            {scenario.label}
          </p>
        </div>
      )}
    />
  );
}

interface FatMaxScenarioDisplayProps {
  scenarios: ScenarioSet<{
    centerPct: number;
    range: [number, number];
    crossoverZone: [number, number];
    label: string;
  }>;
  referenceLabel?: string;
  compact?: boolean;
}

export function FatMaxScenarioDisplay({ 
  scenarios, 
  referenceLabel = "FTP",
  compact = false 
}: FatMaxScenarioDisplayProps) {
  return (
    <ScenarioComparisonCard
      title="Scénarios FatMax & Crossover Zone"
      scenarios={scenarios}
      compact={compact}
      renderScenario={(scenario) => (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">FatMax</span>
            <span className="font-mono text-lg font-bold">
              {scenario.centerPct}% {referenceLabel}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Plage</span>
            <span className="font-mono text-xs text-muted-foreground">
              {scenario.range[0]} – {scenario.range[1]}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Crossover Zone</span>
            <span className="font-mono text-xs text-amber-600 dark:text-amber-400">
              {scenario.crossoverZone[0]} – {scenario.crossoverZone[1]}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground italic">
            {scenario.label}
          </p>
        </div>
      )}
    />
  );
}
