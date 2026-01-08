/**
 * MATRICE D'AIDE À LA DÉCISION STAFF
 * Composant visuel bi-dimensionnel
 * 
 * AXE X: Risque Blessure
 * AXE Y: Risque Performance
 * 
 * Affiche AVANT (gris) et APRÈS (couleur)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Info, TrendingDown, ArrowRight } from "lucide-react";
import {
  computePerformanceRiskMatrix,
  getMatrixCellColor,
  getMatrixCellLabel,
  type ComputeMatrixParams,
  type PerformanceRiskMatrixResult,
} from "@/lib/performanceRiskMatrix";

interface PerformanceRiskMatrixProps {
  params: ComputeMatrixParams;
  compact?: boolean;
}

export function PerformanceRiskMatrix({ params, compact = false }: PerformanceRiskMatrixProps) {
  const matrix = computePerformanceRiskMatrix(params);
  
  return (
    <Card className={cn("overflow-hidden", compact ? "" : "")}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-primary" />
          Matrice d'Aide à la Décision Staff
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Performance vs Risque Blessure • Avant / Après recommandations
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Légende rapide */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-muted-foreground/50 border-2 border-muted-foreground" />
            <span className="text-muted-foreground">AVANT (actuel)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-primary border-2 border-primary" />
            <span className="text-primary font-medium">APRÈS (projection)</span>
          </div>
        </div>
        
        {/* Matrice 3x3 */}
        <div className="relative">
          {/* Labels axes */}
          <div className="flex items-end mb-1">
            <div className="w-24 shrink-0" />
            <div className="flex-1 grid grid-cols-3 text-[10px] text-center text-muted-foreground">
              <span>Faible</span>
              <span>Modéré</span>
              <span>Élevé</span>
            </div>
          </div>
          
          <div className="flex items-center text-[10px] text-muted-foreground mb-1">
            <div className="w-24 shrink-0" />
            <div className="flex-1 text-center font-medium">← Risque Blessure →</div>
          </div>
          
          <div className="flex">
            {/* Y-axis labels */}
            <div className="w-24 shrink-0 flex flex-col justify-around text-[10px] text-muted-foreground text-right pr-2">
              <span>Élevé</span>
              <span>Modéré</span>
              <span>Faible</span>
            </div>
            
            {/* Grid */}
            <div className="flex-1 grid grid-cols-3 gap-1 aspect-square max-w-[280px]">
              {/* Render cells: y from 2 to 0 (top to bottom), x from 0 to 2 (left to right) */}
              {[2, 1, 0].map((y) => (
                [0, 1, 2].map((x) => (
                  <MatrixCell
                    key={`${x}-${y}`}
                    x={x}
                    y={y}
                    beforePosition={matrix.before.position}
                    afterPosition={matrix.after.position}
                  />
                ))
              ))}
            </div>
            
            {/* Y-axis title */}
            <div className="w-6 shrink-0 flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground font-medium -rotate-90 whitespace-nowrap">
                Risque Performance
              </span>
            </div>
          </div>
        </div>
        
        {/* Résumé état actuel */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg">
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Risque Blessure CAP</p>
            <Badge variant="outline" className={cn(
              "text-xs",
              matrix.before.position.x === "low" ? "border-green-500 text-green-700 dark:text-green-400" :
              matrix.before.position.x === "moderate" ? "border-amber-500 text-amber-700 dark:text-amber-400" :
              "border-red-500 text-red-700 dark:text-red-400"
            )}>
              {matrix.injuryRiskLabel}
            </Badge>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground mb-0.5">Risque Performance</p>
            <Badge variant="outline" className={cn(
              "text-xs",
              matrix.before.position.y === "low" ? "border-green-500 text-green-700 dark:text-green-400" :
              matrix.before.position.y === "moderate" ? "border-amber-500 text-amber-700 dark:text-amber-400" :
              "border-red-500 text-red-700 dark:text-red-400"
            )}>
              {matrix.performanceRiskLabel}
            </Badge>
          </div>
        </div>
        
        {/* Amélioration projetée */}
        {(matrix.before.position.xNumeric !== matrix.after.position.xNumeric ||
          matrix.before.position.yNumeric !== matrix.after.position.yNumeric) && (
          <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/20 rounded-lg">
            <ArrowRight className="h-4 w-4 text-primary shrink-0" />
            <p className="text-xs">
              <span className="font-medium text-primary">Projection: </span>
              {matrix.improvementSummary}
            </p>
          </div>
        )}
        
        {/* Interprétation staff */}
        <div className="p-3 bg-muted/20 rounded-lg border">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Lecture staff de la matrice</p>
              <p className="text-xs">{matrix.interpretation}</p>
            </div>
          </div>
        </div>
        
        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground italic text-center">
          {matrix.disclaimer}
        </p>
      </CardContent>
    </Card>
  );
}

// =============================================
// CELLULE DE LA MATRICE
// =============================================

interface MatrixCellProps {
  x: number;
  y: number;
  beforePosition: { xNumeric: number; yNumeric: number };
  afterPosition: { xNumeric: number; yNumeric: number };
}

function MatrixCell({ x, y, beforePosition, afterPosition }: MatrixCellProps) {
  const hasBefore = beforePosition.xNumeric === x && beforePosition.yNumeric === y;
  const hasAfter = afterPosition.xNumeric === x && afterPosition.yNumeric === y;
  const cellLabel = getMatrixCellLabel(x, y);
  
  return (
    <div
      className={cn(
        "relative rounded-lg border flex items-center justify-center min-h-[60px] transition-all",
        getMatrixCellColor(x, y),
        (hasBefore || hasAfter) && "ring-2 ring-offset-1",
        hasBefore && !hasAfter && "ring-muted-foreground/50",
        hasAfter && !hasBefore && "ring-primary",
        hasBefore && hasAfter && "ring-primary"
      )}
    >
      {/* Cell label (for corner cells) */}
      {cellLabel && (
        <span className="absolute inset-0 flex items-center justify-center text-[9px] text-muted-foreground/60 text-center px-1">
          {cellLabel}
        </span>
      )}
      
      {/* Points */}
      <div className="flex items-center gap-1 z-10">
        {hasBefore && (
          <div 
            className={cn(
              "w-4 h-4 rounded-full border-2 flex items-center justify-center",
              hasAfter 
                ? "bg-muted-foreground/30 border-muted-foreground" 
                : "bg-muted-foreground/50 border-muted-foreground"
            )}
            title="AVANT (état actuel)"
          >
            {!hasAfter && <span className="text-[8px] font-bold text-white">A</span>}
          </div>
        )}
        
        {hasAfter && (
          <div 
            className="w-4 h-4 rounded-full bg-primary border-2 border-primary flex items-center justify-center"
            title="APRÈS (projection)"
          >
            <span className="text-[8px] font-bold text-primary-foreground">
              {hasBefore ? "→" : "P"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================
// VERSION COMPACTE POUR PDF/INLINE
// =============================================

export function PerformanceRiskMatrixCompact({ params }: { params: ComputeMatrixParams }) {
  const matrix = computePerformanceRiskMatrix(params);
  
  return (
    <div className="p-3 border rounded-lg bg-muted/20">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium">Matrice Risque</span>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-muted-foreground">●AVANT</span>
          <span className="text-primary">●APRÈS</span>
        </div>
      </div>
      
      {/* Mini grid 3x3 */}
      <div className="grid grid-cols-3 gap-0.5 w-20 h-20 mx-auto mb-2">
        {[2, 1, 0].map((y) => (
          [0, 1, 2].map((x) => {
            const hasBefore = matrix.before.position.xNumeric === x && matrix.before.position.yNumeric === y;
            const hasAfter = matrix.after.position.xNumeric === x && matrix.after.position.yNumeric === y;
            
            return (
              <div
                key={`${x}-${y}`}
                className={cn(
                  "rounded-sm",
                  getMatrixCellColor(x, y),
                  "flex items-center justify-center"
                )}
              >
                {hasBefore && <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />}
                {hasAfter && <span className="w-1.5 h-1.5 rounded-full bg-primary ml-0.5" />}
              </div>
            );
          })
        ))}
      </div>
      
      <p className="text-[10px] text-center text-muted-foreground">
        {matrix.improvementSummary}
      </p>
    </div>
  );
}