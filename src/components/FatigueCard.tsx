/**
 * FatigueCard - Affiche l'état de fatigue fonctionnelle
 * "Fatigue fonctionnelle – Two For Coaching Lab"
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Battery, 
  BatteryLow, 
  BatteryWarning,
  Info, 
  ChevronDown, 
  ChevronUp,
  Activity,
  Clock,
  Zap,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  FatigueEffectif, 
  FATIGUE_METHODOLOGY,
  getFatigueIcon,
  getFatigueBadgeClass
} from "@/lib/fatigueEffectif";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// =============================================
// TYPES
// =============================================

interface FatigueCardProps {
  fatigue: FatigueEffectif;
  isStaffMode?: boolean;
  className?: string;
}

// =============================================
// CONTRIBUTION BAR COMPONENT
// =============================================

function ContributionBar({
  label,
  icon,
  value,
  weightedValue,
  maxValue = 100,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  weightedValue: number;
  maxValue?: number;
}) {
  const percentage = (value / maxValue) * 100;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <span className="font-mono font-medium">
          +{weightedValue}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            value < 30 && "bg-green-500",
            value >= 30 && value < 50 && "bg-amber-500",
            value >= 50 && value < 70 && "bg-orange-500",
            value >= 70 && "bg-red-500"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function FatigueCard({
  fatigue,
  isStaffMode = false,
  className,
}: FatigueCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const getBatteryIcon = () => {
    if (fatigue.score < 30) {
      return <Battery className="w-6 h-6 text-green-500" />;
    }
    if (fatigue.score < 60) {
      return <BatteryWarning className="w-6 h-6 text-amber-500" />;
    }
    return <BatteryLow className="w-6 h-6 text-red-500" />;
  };

  const getProgressColor = () => {
    if (fatigue.score < 15) return "bg-green-500";
    if (fatigue.score < 30) return "bg-blue-500";
    if (fatigue.score < 45) return "bg-amber-500";
    if (fatigue.score < 60) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {getBatteryIcon()}
          Fatigue fonctionnelle
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="text-sm font-medium mb-2">{FATIGUE_METHODOLOGY.title}</p>
                <p className="text-xs text-muted-foreground">
                  {FATIGUE_METHODOLOGY.definition}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score principal */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono">
                {fatigue.score}%
              </span>
              <Badge className={cn("text-xs", getFatigueBadgeClass(fatigue.score))}>
                {fatigue.level.shortLabel}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {fatigue.messageAthlete}
            </p>
          </div>
          <div className="text-4xl">
            {getFatigueIcon(fatigue.score)}
          </div>
        </div>

        {/* Barre de progression globale */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Frais</span>
            <span>Critique</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden relative">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-amber-500 to-red-500 opacity-30" />
            {/* Actual progress */}
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700 relative",
                getProgressColor()
              )}
              style={{ width: `${fatigue.score}%` }}
            />
          </div>
        </div>

        {/* Confiance */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Confiance du calcul</span>
          <span className="font-medium">
            {Math.round(fatigue.confidence * 100)}%
          </span>
        </div>

        {/* Mode Staff : Détail des contributions */}
        {isStaffMode && (
          <Collapsible open={isDetailOpen} onOpenChange={setIsDetailOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-between"
              >
                <span className="text-xs">Voir le détail</span>
                {isDetailOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              <ContributionBar
                label="Charge récente (35%)"
                icon={<Activity className="w-3.5 h-3.5" />}
                value={fatigue.contributions.chargeRecente}
                weightedValue={fatigue.contributionsWeighted.chargeRecente}
              />
              <ContributionBar
                label="TTE effectif (25%)"
                icon={<Clock className="w-3.5 h-3.5" />}
                value={fatigue.contributions.tte}
                weightedValue={fatigue.contributionsWeighted.tte}
              />
              <ContributionBar
                label="Fraîcheur métabolique (25%)"
                icon={<Zap className="w-3.5 h-3.5" />}
                value={fatigue.contributions.fraicheur}
                weightedValue={fatigue.contributionsWeighted.fraicheur}
              />
              <ContributionBar
                label="Facteurs individuels (15%)"
                icon={<User className="w-3.5 h-3.5" />}
                value={fatigue.contributions.modulateurs}
                weightedValue={fatigue.contributionsWeighted.modulateurs}
              />

              {/* Données utilisées */}
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground mb-2">Données utilisées :</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TSS 7j</span>
                    <span className="font-mono">
                      {fatigue.inputsUsed.tss7d ?? "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">TTE</span>
                    <span className="font-mono">
                      {fatigue.inputsUsed.tteEffectif ?? "—"} min
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Race Readiness</span>
                    <span className="font-mono">
                      {fatigue.inputsUsed.raceReadiness ?? "—"}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Âge</span>
                    <span className="font-mono">
                      {fatigue.inputsUsed.age ?? "—"} ans
                    </span>
                  </div>
                </div>
              </div>

              {/* Données manquantes */}
              {fatigue.reasonsMissing.length > 0 && (
                <div className="p-2 rounded bg-amber-500/10 border border-amber-500/30">
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    ⚠️ Données manquantes : {fatigue.reasonsMissing.join(", ")}
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Recommandations */}
        {fatigue.recommendations.length > 0 && fatigue.score >= 30 && (
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs font-medium mb-2">Recommandations :</p>
            <ul className="space-y-1">
              {fatigue.recommendations.slice(0, 2).map((rec, idx) => (
                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground italic">
          Indicateur fonctionnel d'aide à la décision. Le jugement du coach prime sur l'algorithme.
        </p>
      </CardContent>
    </Card>
  );
}
