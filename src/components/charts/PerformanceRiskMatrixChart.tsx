/**
 * Performance vs Injury Risk Matrix (Running)
 * Matrice 2x2 avec position de l'athlète
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Activity, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformanceRiskMatrixProps {
  vlamaxValue: number | null;
  tteValue: number | null;
  objectif: string;
  tss7d?: number | null;
  staffMode?: boolean;
  className?: string;
}

// Calcul du score de risque blessure CAP
const computeInjuryRisk = (
  vlamax: number | null,
  tte: number | null,
  objectif: string
): number => {
  if (vlamax === null && tte === null) return 50;
  
  let risk = 25; // Base
  
  // VLamax élevé = risque augmenté
  if (vlamax !== null) {
    if (vlamax > 0.55) risk += 30;
    else if (vlamax > 0.45) risk += 15;
    else if (vlamax > 0.40) risk += 5;
  }
  
  // TTE bas = risque augmenté
  if (tte !== null) {
    const tteTarget = objectif.includes("IM") ? 55 : objectif.includes("703") ? 50 : 47;
    if (tte < tteTarget - 10) risk += 30;
    else if (tte < tteTarget - 5) risk += 15;
    else if (tte < tteTarget) risk += 5;
  }
  
  return Math.min(100, risk);
};

// Calcul du potentiel performance
const computePerformancePotential = (
  vlamax: number | null,
  tte: number | null,
  objectif: string
): number => {
  if (vlamax === null && tte === null) return 50;
  
  let potential = 50; // Base
  
  // VLamax optimal
  if (vlamax !== null) {
    const vlamaxTarget = objectif.includes("IM") ? 0.35 : objectif.includes("703") ? 0.40 : 0.45;
    if (vlamax <= vlamaxTarget) potential += 25;
    else if (vlamax <= vlamaxTarget + 0.05) potential += 15;
    else if (vlamax <= vlamaxTarget + 0.10) potential += 5;
  }
  
  // TTE élevé
  if (tte !== null) {
    const tteTarget = objectif.includes("IM") ? 55 : objectif.includes("703") ? 50 : 47;
    if (tte >= tteTarget + 5) potential += 25;
    else if (tte >= tteTarget) potential += 15;
    else if (tte >= tteTarget - 5) potential += 5;
  }
  
  return Math.min(100, potential);
};

// Déterminer le quadrant
const getQuadrant = (riskX: number, perfY: number): {
  quadrant: string;
  color: string;
  label: string;
  advice: string;
} => {
  const lowRisk = riskX < 50;
  const highPerf = perfY >= 50;
  
  if (lowRisk && highPerf) {
    return {
      quadrant: "optimal",
      color: "hsl(var(--success))",
      label: "Optimal",
      advice: "Profil idéal pour la performance CAP"
    };
  }
  if (!lowRisk && highPerf) {
    return {
      quadrant: "risk-perf",
      color: "hsl(var(--warning))",
      label: "Performance à risque",
      advice: "Potentiel élevé mais vigilance sur le volume CAP"
    };
  }
  if (lowRisk && !highPerf) {
    return {
      quadrant: "safe-dev",
      color: "hsl(var(--primary))",
      label: "Développement sécurisé",
      advice: "Profil sûr, focus sur l'amélioration performance"
    };
  }
  return {
    quadrant: "danger",
    color: "hsl(var(--destructive))",
    label: "Zone de danger",
    advice: "Réduire le volume CAP, privilégier vélo/natation"
  };
};

export function PerformanceRiskMatrixChart({
  vlamaxValue,
  tteValue,
  objectif,
  tss7d,
  staffMode = false,
  className
}: PerformanceRiskMatrixProps) {
  const isDataMissing = vlamaxValue === null && tteValue === null;
  
  const riskX = computeInjuryRisk(vlamaxValue, tteValue, objectif);
  const perfY = computePerformancePotential(vlamaxValue, tteValue, objectif);
  const quadrantInfo = getQuadrant(riskX, perfY);

  return (
    <Card className={cn("overflow-hidden", isDataMissing && "opacity-60", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="w-4 h-4" />
          <span>Matrice Risque / Performance (CAP)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isDataMissing ? (
          <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm text-center">Données insuffisantes</p>
            <p className="text-xs mt-1">VLamax et TTE requis</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Matrice 2x2 */}
            <div className="relative aspect-square max-w-64 mx-auto">
              {/* Quadrants */}
              <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-0.5">
                {/* Top-left: Safe-Dev */}
                <div className="bg-primary/20 rounded-tl-lg flex items-center justify-center">
                  <span className="text-[10px] text-primary font-medium text-center px-1">
                    Développement<br/>sécurisé
                  </span>
                </div>
                {/* Top-right: Optimal */}
                <div className="bg-success/20 rounded-tr-lg flex items-center justify-center">
                  <span className="text-[10px] text-success font-medium text-center px-1">
                    Optimal
                  </span>
                </div>
                {/* Bottom-left: Danger */}
                <div className="bg-destructive/20 rounded-bl-lg flex items-center justify-center">
                  <span className="text-[10px] text-destructive font-medium text-center px-1">
                    Zone de<br/>danger
                  </span>
                </div>
                {/* Bottom-right: Risk-Perf */}
                <div className="bg-warning/20 rounded-br-lg flex items-center justify-center">
                  <span className="text-[10px] text-warning font-medium text-center px-1">
                    Performance<br/>à risque
                  </span>
                </div>
              </div>
              
              {/* Axes labels */}
              <div className="absolute -left-1 top-1/2 -translate-y-1/2 -rotate-90 text-[10px] text-muted-foreground whitespace-nowrap">
                ← Potentiel Performance →
              </div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-4 text-[10px] text-muted-foreground whitespace-nowrap">
                ← Risque Blessure →
              </div>
              
              {/* Point athlète */}
              <div 
                className="absolute w-4 h-4 rounded-full border-2 border-background shadow-lg z-10"
                style={{
                  left: `${riskX}%`,
                  bottom: `${perfY}%`,
                  transform: 'translate(-50%, 50%)',
                  backgroundColor: quadrantInfo.color
                }}
              />
            </div>
            
            {/* Status */}
            <div 
              className="p-3 rounded-lg text-center"
              style={{ backgroundColor: `${quadrantInfo.color}20` }}
            >
              <p className="font-semibold" style={{ color: quadrantInfo.color }}>
                {quadrantInfo.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {quadrantInfo.advice}
              </p>
            </div>
            
            {/* Détails staff */}
            {staffMode && (
              <div className="p-2 bg-muted/50 rounded-lg text-xs space-y-1">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Risque blessure:</span>
                    <span className="ml-1 font-mono">{riskX}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Potentiel perf:</span>
                    <span className="ml-1 font-mono">{perfY}%</span>
                  </div>
                </div>
                {vlamaxValue !== null && (
                  <p className="text-muted-foreground">
                    VLamax: {vlamaxValue.toFixed(2)} mmol/L/s
                  </p>
                )}
                {tteValue !== null && (
                  <p className="text-muted-foreground">
                    TTE: {tteValue} min
                  </p>
                )}
                {tss7d !== null && tss7d !== undefined && (
                  <p className="text-muted-foreground">
                    TSS 7j: {tss7d}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}