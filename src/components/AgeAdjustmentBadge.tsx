import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { calculateAge, computeAgeAdjustmentIndex } from "@/lib/ageAdjustment";
import { Info } from "lucide-react";

interface AgeAdjustmentBadgeProps {
  birthDate: string | Date | null | undefined;
  variant?: "compact" | "full" | "inline";
  showTooltip?: boolean;
  className?: string;
}

const categoryColors: Record<string, string> = {
  young: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  prime: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  master1: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  master2: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
};

const categoryLabels: Record<string, string> = {
  young: "Junior",
  prime: "Prime",
  master1: "Master I",
  master2: "Master II",
};

export const AgeAdjustmentBadge: React.FC<AgeAdjustmentBadgeProps> = ({
  birthDate,
  variant = "compact",
  showTooltip = true,
  className = "",
}) => {
  const age = calculateAge(birthDate);
  
  if (age === null) {
    return null;
  }

  const aai = computeAgeAdjustmentIndex(age);
  const colorClass = categoryColors[aai.category] || categoryColors.prime;
  const label = categoryLabels[aai.category] || aai.category;

  const tooltipContent = (
    <div className="space-y-2 max-w-xs">
      <div className="font-medium">Indice d'Ajustement par Âge (AAI)</div>
      <div className="text-sm space-y-1">
        <p><strong>Âge :</strong> {age} ans</p>
        <p><strong>Catégorie :</strong> {aai.label}</p>
        <p><strong>AAI :</strong> {Math.round(aai.aai * 100)}%</p>
        <p><strong>Multiplicateur risque :</strong> ×{aai.riskMultiplier.toFixed(2)}</p>
      </div>
      <div className="text-xs text-muted-foreground pt-1 border-t">
        <p className="font-medium mb-1">Impact sur les cibles :</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>TTE ajusté selon la catégorie</li>
          <li>Seuils VLamax adaptés</li>
          <li>Risque blessure pondéré</li>
          <li>Nutrition glucidique ajustée</li>
        </ul>
      </div>
    </div>
  );

  const badgeContent = (
    <>
      {variant === "full" && <span className="mr-1">{age} ans</span>}
      {variant === "compact" && <span className="mr-1">{age}</span>}
      <span className="font-medium">{label}</span>
      {showTooltip && variant !== "inline" && (
        <Info className="h-3 w-3 ml-1 opacity-60" />
      )}
    </>
  );

  const badge = (
    <Badge 
      variant="outline" 
      className={`${colorClass} border-0 ${className}`}
    >
      {badgeContent}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  if (variant === "inline") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={`inline-flex items-center gap-1 ${className}`}>
              <span className="text-muted-foreground">{age} ans</span>
              <Badge variant="outline" className={`${colorClass} border-0`}>
                {label}
              </Badge>
              <Info className="h-3 w-3 text-muted-foreground cursor-help" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="p-3">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent side="bottom" className="p-3">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AgeAdjustmentBadge;
