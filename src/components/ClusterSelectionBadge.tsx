/**
 * ClusterSelectionBadge - Affiche la sélection automatique de cluster TFCL
 */

import { Badge } from "@/components/ui/badge";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { 
  ClusterSelectionEnvelope,
  getInferredLevelLabel,
  getInferredLevelColor,
  getSportRefLabel,
} from "@/lib/reference";
import { Target, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ClusterSelectionBadgeProps {
  selection: ClusterSelectionEnvelope;
  compact?: boolean;
}

export function ClusterSelectionBadge({ 
  selection, 
  compact = false 
}: ClusterSelectionBadgeProps) {
  const isApproximate = selection.confidence < 0.6;
  
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                "text-[10px] cursor-help gap-1",
                isApproximate ? "border-amber-500/50 text-amber-600" : ""
              )}
            >
              <Target className="h-2.5 w-2.5" />
              {selection.clusterLabel.split(" ").slice(0, 2).join(" ")}
              {isApproximate && " ≈"}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1 text-xs">
              <p className="font-medium">{selection.clusterLabel}</p>
              <p>Sport : {getSportRefLabel(selection.sportRef)}</p>
              <p>Niveau inféré : {getInferredLevelLabel(selection.inferredLevel)}</p>
              <p>Confiance : {(selection.confidence * 100).toFixed(0)}%</p>
              {isApproximate && (
                <p className="text-amber-600">⚠️ Référentiel approximatif</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <div className="space-y-2 p-3 bg-muted/30 rounded-lg border">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Target className="h-3 w-3" />
          Cluster Auto-Sélectionné
        </span>
        <Badge 
          variant={isApproximate ? "outline" : "secondary"}
          className={cn("text-[10px]", isApproximate && "border-amber-500/50 text-amber-600")}
        >
          {(selection.confidence * 100).toFixed(0)}% confiance
        </Badge>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Référentiel</span>
          <p className="font-medium">{getSportRefLabel(selection.sportRef)}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Niveau</span>
          <p className={cn("font-medium", getInferredLevelColor(selection.inferredLevel))}>
            {getInferredLevelLabel(selection.inferredLevel)}
          </p>
        </div>
      </div>
      
      <div className="text-xs">
        <span className="text-muted-foreground">Cluster</span>
        <p className="font-medium">{selection.clusterLabel}</p>
      </div>
      
      {/* Rationale */}
      <div className="space-y-0.5 text-[10px] text-muted-foreground">
        {selection.rationale.map((r, i) => (
          <p key={i}>• {r}</p>
        ))}
      </div>
      
      {/* Warnings */}
      {selection.warnings.length > 0 && (
        <div className="space-y-1 pt-1">
          {selection.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1 text-[10px] text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-start gap-1 pt-1 text-[10px] text-muted-foreground">
        <Info className="h-3 w-3 shrink-0 mt-0.5" />
        <span>Le cluster sert de référentiel comparatif, pas de classification.</span>
      </div>
    </div>
  );
}