/**
 * RunInjuryRiskCard - Affiche le risque blessure spécifique CAP
 * "Risque Blessure CAP – Two For Coaching Lab"
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Footprints, 
  Info, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  Shield,
  Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getConfidenceLabel, getConfidenceColorClass } from "@/lib/confidenceDisplay";
import { 
  RunInjuryRiskEnvelope,
  getRunInjuryRiskIcon,
  getRunInjuryRiskBadgeClass,
  getRunInjuryRiskColorClass
} from "@/lib/runInjuryRisk";
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

interface RunInjuryRiskCardProps {
  riskEnvelope: RunInjuryRiskEnvelope;
  isStaffMode?: boolean;
  className?: string;
}

// =============================================
// DRIVER BAR COMPONENT
// =============================================

function DriverBar({
  label,
  value,
  component,
  weight,
  impact,
}: {
  label: string;
  value: string;
  component: number;
  weight: number;
  impact: "low" | "medium" | "high" | "critical";
}) {
  const impactColors = {
    low: "bg-green-500",
    medium: "bg-blue-500",
    high: "bg-amber-500",
    critical: "bg-red-500",
  };
  
  const weightedValue = Math.round(component * weight);
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-mono">{value}</span>
          <span className="font-mono text-muted-foreground">+{weightedValue}%</span>
        </div>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", impactColors[impact])}
          style={{ width: `${component}%` }}
        />
      </div>
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function RunInjuryRiskCard({
  riskEnvelope,
  isStaffMode = false,
  className,
}: RunInjuryRiskCardProps) {
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const getProgressColor = () => {
    switch (riskEnvelope.level) {
      case "FAIBLE": return "bg-green-500";
      case "MODERE": return "bg-blue-500";
      case "ELEVE": return "bg-amber-500";
      case "CRITIQUE": return "bg-red-500";
    }
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Footprints className="w-5 h-5 text-primary" />
          Risque Blessure CAP
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p className="text-sm font-medium mb-2">Risque Blessure Course à Pied</p>
                <p className="text-xs text-muted-foreground">
                  Indice composite évaluant le risque mécanique lié aux contraintes spécifiques de la CAP :
                  fatigue, profil VLamax, durabilité TTE, charge et âge.
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
              <span className={cn("text-3xl font-bold font-mono", getRunInjuryRiskColorClass(riskEnvelope.level))}>
                {riskEnvelope.score}%
              </span>
              <Badge className={cn("text-xs", getRunInjuryRiskBadgeClass(riskEnvelope.level))}>
                {riskEnvelope.levelLabel}
              </Badge>
            </div>
            <p className={cn("text-xs mt-1", getConfidenceColorClass(riskEnvelope.confidence))}>
              Fiabilité : {getConfidenceLabel(riskEnvelope.confidence)}
            </p>
          </div>
          <div className="text-4xl">
            {getRunInjuryRiskIcon(riskEnvelope.level)}
          </div>
        </div>

        {/* Barre de progression */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Faible</span>
            <span>Critique</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500 via-amber-500 to-red-500 opacity-30" />
            <div
              className={cn("h-full rounded-full transition-all duration-700 relative", getProgressColor())}
              style={{ width: `${riskEnvelope.score}%` }}
            />
          </div>
        </div>

        {/* Explication "Pourquoi" */}
        <div className="p-3 rounded-lg bg-muted/50 border">
          <p className="text-xs">{riskEnvelope.why}</p>
        </div>

        {/* Guardrails */}
        {riskEnvelope.guardrails.length > 0 && riskEnvelope.level !== "FAIBLE" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Shield className="w-3.5 h-3.5 text-muted-foreground" />
              Points de vigilance
            </div>
            <ul className="space-y-1">
              {riskEnvelope.guardrails.slice(0, 3).map((item, idx) => (
                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Options Coach (si ELEVE ou CRITIQUE) */}
        {riskEnvelope.coachOptions.length > 0 && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-2 text-xs font-medium text-primary mb-2">
              <Lightbulb className="w-3.5 h-3.5" />
              Options coach (non imposées)
            </div>
            <ul className="space-y-1">
              {riskEnvelope.coachOptions.map((option, idx) => (
                <li key={idx} className="text-xs flex items-start gap-2">
                  <span className="font-medium text-primary">{idx + 1}.</span>
                  {option}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mode Staff : Détail des drivers */}
        {isStaffMode && (
          <Collapsible open={isDetailOpen} onOpenChange={setIsDetailOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-between"
              >
                <span className="text-xs">Voir les facteurs de risque</span>
                {isDetailOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              {riskEnvelope.drivers.map((driver, idx) => (
                <DriverBar
                  key={idx}
                  label={driver.label}
                  value={driver.value}
                  component={driver.component}
                  weight={driver.weight}
                  impact={driver.impact}
                />
              ))}
              
              {/* Formule */}
              <div className="p-2 rounded bg-muted/30 text-[10px] font-mono text-muted-foreground">
                Score = 0.30×Fatigue + 0.20×VLamax + 0.20×TTE + 0.20×Charge + 0.10×Âge
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground italic">
          {riskEnvelope.disclaimer}
        </p>
      </CardContent>
    </Card>
  );
}
