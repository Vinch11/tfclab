/**
 * TTE vs Target Chart
 * Barre horizontale comparative avec zones de marge
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface TTETargetChartProps {
  tteValue: number | null;
  tteSource: string;
  tteConfidence: number;
  objectif: string;
  staffMode?: boolean;
  className?: string;
}

// Cibles TTE par objectif
const getTTETarget = (objectif: string): number => {
  const goal = objectif.toLowerCase();
  
  if (goal.includes("im") || goal.includes("ironman") || goal.includes("kona")) return 55;
  if (goal.includes("703") || goal.includes("70.3")) return 50;
  if (goal.includes("marathon") && !goal.includes("semi")) return 52;
  if (goal.includes("semi")) return 47;
  return 50;
};

const getStatusInfo = (tte: number, target: number) => {
  const diff = tte - target;
  
  if (diff >= 0) {
    return {
      status: "ok",
      color: "hsl(var(--success))",
      bgColor: "bg-success/10",
      label: "Cible atteinte",
      message: `TTE supérieur à la cible (+${diff} min)`
    };
  }
  if (diff >= -5) {
    return {
      status: "warning",
      color: "hsl(var(--warning))",
      bgColor: "bg-warning/10",
      label: "Proche de la cible",
      message: `TTE légèrement insuffisant (${diff} min)`
    };
  }
  return {
    status: "critical",
    color: "hsl(var(--destructive))",
    bgColor: "bg-destructive/10",
    label: "Sous la cible",
    message: `TTE insuffisant (${diff} min)`
  };
};

export function TTETargetChart({
  tteValue,
  tteSource,
  tteConfidence,
  objectif,
  staffMode = false,
  className
}: TTETargetChartProps) {
  const target = getTTETarget(objectif);
  const isDataMissing = tteValue === null;
  const isLowConfidence = tteConfidence < 0.4;
  
  const statusInfo = tteValue !== null ? getStatusInfo(tteValue, target) : null;
  
  // Calcul pour la barre
  const maxTTE = 80;
  const minTTE = 25;
  const range = maxTTE - minTTE;
  
  const ttePosition = tteValue !== null 
    ? ((tteValue - minTTE) / range) * 100 
    : 0;
  
  const targetPosition = ((target - minTTE) / range) * 100;
  const warningPosition = ((target - 5 - minTTE) / range) * 100;

  return (
    <Card className={cn("overflow-hidden", isDataMissing && "opacity-60", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>TTE vs Cible</span>
          {statusInfo && (
            <span 
              className="text-xs px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: statusInfo.color }}
            >
              {statusInfo.label}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isDataMissing ? (
          <div className="h-32 flex flex-col items-center justify-center text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm text-center">TTE non disponible</p>
            <p className="text-xs mt-1">Données insuffisantes</p>
          </div>
        ) : (
          <div className="space-y-4">
            {isLowConfidence && (
              <div className="p-2 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                <p className="text-xs text-warning">
                  Source: {tteSource} | Confiance: {Math.round(tteConfidence * 100)}%
                </p>
              </div>
            )}
            
            {/* Barre principale */}
            <div className="relative">
              {/* Échelle */}
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>{minTTE} min</span>
                <span>{maxTTE} min</span>
              </div>
              
              {/* Barre de fond avec zones */}
              <div className="relative h-8 bg-muted rounded-lg overflow-hidden">
                {/* Zone rouge (< target - 5) */}
                <div 
                  className="absolute h-full bg-destructive/20"
                  style={{ left: 0, width: `${warningPosition}%` }}
                />
                {/* Zone orange (target - 5 à target) */}
                <div 
                  className="absolute h-full bg-warning/20"
                  style={{ left: `${warningPosition}%`, width: `${targetPosition - warningPosition}%` }}
                />
                {/* Zone verte (>= target) */}
                <div 
                  className="absolute h-full bg-success/20"
                  style={{ left: `${targetPosition}%`, width: `${100 - targetPosition}%` }}
                />
                
                {/* Ligne cible */}
                <div 
                  className="absolute h-full w-0.5 bg-foreground/60"
                  style={{ left: `${targetPosition}%` }}
                />
                
                {/* Valeur TTE */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 h-6 w-2 rounded"
                  style={{ 
                    left: `${Math.min(Math.max(ttePosition, 2), 98)}%`,
                    transform: 'translateX(-50%) translateY(-50%)',
                    backgroundColor: statusInfo?.color
                  }}
                />
              </div>
              
              {/* Labels sous la barre */}
              <div className="relative h-6 mt-1">
                {/* Label cible */}
                <div 
                  className="absolute text-xs text-muted-foreground transform -translate-x-1/2"
                  style={{ left: `${targetPosition}%` }}
                >
                  <span className="font-medium">Cible: {target} min</span>
                </div>
              </div>
            </div>
            
            {/* Résumé */}
            <div className={cn("p-3 rounded-lg", statusInfo?.bgColor)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold" style={{ color: statusInfo?.color }}>
                    {tteValue} minutes
                  </p>
                  <p className="text-xs text-muted-foreground">{statusInfo?.message}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Objectif: {objectif}</p>
                  <p>Cible: {target} min</p>
                </div>
              </div>
            </div>
            
            {/* Détails staff */}
            {staffMode && (
              <div className="p-2 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
                <p><strong>Source:</strong> {tteSource}</p>
                <p><strong>Confiance:</strong> {Math.round(tteConfidence * 100)}%</p>
                <p><strong>Interprétation:</strong> {statusInfo?.message}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}