/**
 * Matrice Performance vs Risque Blessure
 * Visualisation 2D avec position de l'athlète
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Activity, TrendingUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  InjuryRiskEnvelope, 
  computePerformanceRiskPosition,
  PerformanceRiskPosition 
} from "@/lib/v2/injuryRiskUnified";

interface PerformanceRiskMatrixProps {
  riskEnvelope: InjuryRiskEnvelope;
  vlamaxValue: number | null;
  tteMin: number | null;
  objectif: string;
  sport: 'CAP' | 'VELO';
  isStaffMode?: boolean;
  className?: string;
}

export function PerformanceRiskMatrix({
  riskEnvelope,
  vlamaxValue,
  tteMin,
  objectif,
  sport,
  isStaffMode = false,
  className
}: PerformanceRiskMatrixProps) {
  const position = computePerformanceRiskPosition(riskEnvelope, vlamaxValue, tteMin, objectif);
  const { riskX, performanceY, quadrant, quadrantLabel, quadrantColor, advice } = position;
  
  // Déterminer la couleur du point
  const pointStyle = {
    left: `${riskX}%`,
    bottom: `${performanceY}%`,
    transform: 'translate(-50%, 50%)',
    backgroundColor: quadrantColor,
    boxShadow: `0 0 12px ${quadrantColor}`
  };
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span>Matrice Risque / Performance</span>
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {sport}
          </Badge>
        </div>
        <CardDescription className="text-xs">
          Position actuelle de l'athlète
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Matrice 2x2 */}
        <div className="flex items-stretch gap-3">
          {/* Label axe Y */}
          <div className="flex items-center justify-center w-6">
            <span className="text-[10px] text-muted-foreground -rotate-90 whitespace-nowrap origin-center">
              ← Potentiel Performance →
            </span>
          </div>
          
          {/* Grille */}
          <div className="relative aspect-square flex-1 max-w-64">
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-1">
              {/* Top-left: Développement sécurisé (low risk, low perf) */}
              <div className="bg-primary/20 border border-primary/30 rounded-tl-lg flex items-center justify-center p-2">
                <span className="text-[11px] text-primary font-medium text-center leading-tight">
                  Développement<br/>sécurisé
                </span>
              </div>
              
              {/* Top-right: Optimal (low risk, high perf) */}
              <div className="bg-success/20 border border-success/30 rounded-tr-lg flex items-center justify-center p-2">
                <span className="text-[11px] text-success font-medium text-center leading-tight">
                  Zone<br/>Optimale
                </span>
              </div>
              
              {/* Bottom-left: Zone de danger (high risk, low perf) */}
              <div className="bg-destructive/20 border border-destructive/30 rounded-bl-lg flex items-center justify-center p-2">
                <span className="text-[11px] text-destructive font-medium text-center leading-tight">
                  Zone de<br/>danger
                </span>
              </div>
              
              {/* Bottom-right: Performance à risque (high risk, high perf) */}
              <div className="bg-warning/20 border border-warning/30 rounded-br-lg flex items-center justify-center p-2">
                <span className="text-[11px] text-warning font-medium text-center leading-tight">
                  Performance<br/>à risque
                </span>
              </div>
            </div>
            
            {/* Point athlète */}
            <div 
              className="absolute w-5 h-5 rounded-full border-2 border-white shadow-lg z-10 ring-2 ring-white/30"
              style={pointStyle}
            />
            
            {/* Lignes de référence */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border/50" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-border/50" />
          </div>
        </div>
        
        {/* Label axe X */}
        <div className="text-center">
          <span className="text-[10px] text-muted-foreground">← Faible risque ─── Risque élevé →</span>
        </div>
        
        {/* Status actuel */}
        <div 
          className="p-3 rounded-lg text-center"
          style={{ backgroundColor: `${quadrantColor}15` }}
        >
          <p className="font-semibold text-sm" style={{ color: quadrantColor }}>
            {quadrantLabel}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {advice}
          </p>
        </div>
        
        {/* Détails staff */}
        {isStaffMode && (
          <div className="p-3 bg-muted/30 rounded-lg text-xs space-y-2">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
              <Info className="w-3 h-3" />
              <span className="font-medium">Coordonnées</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-muted-foreground">Risque (X):</span>
                <span className="ml-1 font-mono font-medium">{riskX}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Performance (Y):</span>
                <span className="ml-1 font-mono font-medium">{performanceY}%</span>
              </div>
            </div>
            {vlamaxValue !== null && (
              <p className="text-muted-foreground">
                VLamax: <span className="font-mono">{vlamaxValue.toFixed(2)}</span> mmol/L/s
              </p>
            )}
            {tteMin !== null && (
              <p className="text-muted-foreground">
                TTE: <span className="font-mono">{tteMin}</span> min
              </p>
            )}
          </div>
        )}
        
        {/* Légende */}
        <div className="flex flex-wrap gap-2 text-[10px]">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span>Optimal</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>Développement</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-warning" />
            <span>À risque</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-destructive" />
            <span>Danger</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
