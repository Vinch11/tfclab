/**
 * V2ConfidenceBadge — Badge affichant le niveau de confiance V2
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CONFIDENCE_LEVELS } from "@/lib/v2";

interface V2ConfidenceBadgeProps {
  confidence: number;
  showLabel?: boolean;
  size?: "sm" | "md";
}

export function V2ConfidenceBadge({ 
  confidence, 
  showLabel = true,
  size = "md" 
}: V2ConfidenceBadgeProps) {
  const getConfidenceLevel = (conf: number) => {
    if (conf >= 0.90) return CONFIDENCE_LEVELS.MEASURED_LAB;
    if (conf >= 0.75) return CONFIDENCE_LEVELS.MEASURED_FIELD;
    if (conf >= 0.60) return CONFIDENCE_LEVELS.ESTIMATED_STRONG;
    if (conf >= 0.45) return CONFIDENCE_LEVELS.ESTIMATED_MODERATE;
    if (conf >= 0.30) return CONFIDENCE_LEVELS.ESTIMATED_WEAK;
    return CONFIDENCE_LEVELS.UNKNOWN;
  };

  const level = getConfidenceLevel(confidence);
  
  const getBadgeClass = (conf: number) => {
    if (conf >= 0.75) return "bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/50";
    if (conf >= 0.60) return "bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/50";
    if (conf >= 0.45) return "bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/50";
    return "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/50";
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        getBadgeClass(confidence),
        size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5"
      )}
    >
      <span className="mr-1">{level.emoji}</span>
      {showLabel ? level.label : `${Math.round(confidence * 100)}%`}
    </Badge>
  );
}
