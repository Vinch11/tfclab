/**
 * Decision Reliability Badge
 * Badge compact affichant le score de confiance décisionnelle
 */

import { Shield, ShieldCheck, ShieldAlert, ShieldX, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DecisionLevel } from "@/lib/v2/decisionReliabilityEngine";
import { cn } from "@/lib/utils";

interface DecisionReliabilityBadgeProps {
  score: number; // 0-100
  level: DecisionLevel;
  compact?: boolean;
  showTooltip?: boolean;
  className?: string;
}

export function DecisionReliabilityBadge({
  score,
  level,
  compact = false,
  showTooltip = true,
  className
}: DecisionReliabilityBadgeProps) {
  const config = {
    robust: {
      icon: ShieldCheck,
      label: "Décision Robuste",
      shortLabel: "Robuste",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/30",
      description: "Confiance élevée - recommandations complètes autorisées"
    },
    prudent: {
      icon: ShieldAlert,
      label: "Décision Prudente",
      shortLabel: "Prudent",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/30",
      description: "Confiance modérée - recommandations prudentes, test conseillé"
    },
    insufficient: {
      icon: ShieldX,
      label: "Données Insuffisantes",
      shortLabel: "Insuffisant",
      color: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
      description: "Confiance insuffisante - compléter les données avant décision"
    }
  };

  const current = config[level];
  const Icon = current.icon;

  const badgeContent = (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1.5 font-medium transition-all",
        current.bgColor,
        current.borderColor,
        current.color,
        compact ? "text-xs px-2 py-0.5" : "text-sm px-3 py-1",
        className
      )}
    >
      <Icon className={cn("shrink-0", compact ? "w-3 h-3" : "w-4 h-4")} />
      {!compact && (
        <>
          <span>{current.shortLabel}</span>
          <span className="opacity-70">•</span>
          <span className="font-bold">{score}%</span>
        </>
      )}
      {compact && <span className="font-bold">{score}</span>}
    </Badge>
  );

  if (!showTooltip) return badgeContent;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badgeContent}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-1">
          <div className="font-medium flex items-center gap-2">
            <Icon className="w-4 h-4" />
            {current.label}
          </div>
          <p className="text-xs text-muted-foreground">{current.description}</p>
          <div className="text-xs mt-2 pt-2 border-t border-border">
            <span className="text-muted-foreground">Score de confiance: </span>
            <span className="font-bold">{score}/100</span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Decision Reliability Progress Bar
 * Barre de progression visuelle du score
 */

interface DecisionReliabilityProgressProps {
  score: number;
  level: DecisionLevel;
  showLabels?: boolean;
  className?: string;
}

export function DecisionReliabilityProgress({
  score,
  level,
  showLabels = true,
  className
}: DecisionReliabilityProgressProps) {
  const getColorClass = () => {
    if (score >= 75) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className={cn("space-y-1", className)}>
      {showLabels && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Insuffisant</span>
          <span>Prudent</span>
          <span>Robuste</span>
        </div>
      )}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        {/* Markers at 60 and 75 */}
        <div className="absolute left-[60%] top-0 bottom-0 w-px bg-border z-10" />
        <div className="absolute left-[75%] top-0 bottom-0 w-px bg-border z-10" />
        
        {/* Progress bar */}
        <div
          className={cn("h-full rounded-full transition-all duration-500", getColorClass())}
          style={{ width: `${score}%` }}
        />
      </div>
      {showLabels && (
        <div className="flex justify-between text-[10px] text-muted-foreground/70">
          <span>0</span>
          <span>60</span>
          <span>75</span>
          <span>100</span>
        </div>
      )}
    </div>
  );
}
