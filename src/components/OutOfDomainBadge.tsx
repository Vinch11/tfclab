/**
 * OutOfDomainBadge
 * Signale (sans bloquer) qu'une valeur physiologique modélisée sort du
 * domaine de validation publié (bornes littérature). Réutilise
 * checkPlausibility de literatureReferences.ts.
 *
 * Purement additif : ne masque ni ne recalcule aucune valeur.
 */
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { checkPlausibility } from "@/lib/v2/literatureReferences";
import { cn } from "@/lib/utils";

export interface OutOfDomainBadgeProps {
  /** Métrique parmi PLAUSIBILITY_BOUNDS : run_vlamax, bike_vlamax, run_vo2max, bike_vo2max, run_MLSS_pct_vo2max, bike_MLSS_pct_vo2max */
  metric: string;
  value: number | null | undefined;
  className?: string;
  /** Texte compact (par défaut "Hors domaine"). */
  label?: string;
}

export function OutOfDomainBadge({ metric, value, className, label = "Hors domaine" }: OutOfDomainBadgeProps) {
  if (value == null || !Number.isFinite(value)) return null;
  const flag = checkPlausibility(metric, value);
  if (!flag) return null;

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] gap-1 bg-amber-50 text-amber-700 border-amber-300",
              "dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-700",
              className,
            )}
          >
            <AlertTriangle className="h-3 w-3" />
            {label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-xs">
          {flag.message}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/** Helper : dérive la discipline littérature depuis un objectif TFCL. */
export function disciplineFromGoal(goal: string | null | undefined): "run" | "bike" {
  if (!goal) return "bike";
  const runGoals = ["Marathon", "Semi", "5K", "10K", "StartToRun", "Course", "Trail", "TrailShort", "TrailMountain", "TrailUltra"];
  return runGoals.includes(goal) ? "run" : "bike";
}
