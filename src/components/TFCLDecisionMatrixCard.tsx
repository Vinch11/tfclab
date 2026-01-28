/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CARTE DÉCISION COACH TFCL™
 * Composant UI principal pour la Matrice Décisionnelle TFCL
 * 
 * Affiche:
 * - Facteur limitant principal
 * - Levier prioritaire
 * - Diagnostic coach
 * - Focus entraînement
 * - Narratif athlète
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  Zap,
  Info,
  TrendingUp,
  TrendingDown,
  Clock,
  Flame,
  Battery,
  Brain,
} from "lucide-react";
import { useState } from "react";
import {
  computeTFCLDecisionMatrix,
  getDecisionCaseColor,
  getMetricStatusColor,
  getMetricStatusBadgeClass,
  type TFCLDecisionInput,
  type TFCLDecisionResult,
  type TFCLDomainAnalysis,
  type DecisionCase,
} from "@/lib/v2/tfclDecisionMatrix";

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface TFCLDecisionMatrixCardProps {
  input: TFCLDecisionInput;
  compact?: boolean;
  showDomainDetails?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS UI
// ═══════════════════════════════════════════════════════════════════════════════

function getCaseColorClasses(decisionCase: DecisionCase): {
  bg: string;
  border: string;
  text: string;
  icon: string;
} {
  switch (decisionCase) {
    case "A":
      return {
        bg: "bg-amber-50 dark:bg-amber-950/30",
        border: "border-amber-300 dark:border-amber-700",
        text: "text-amber-700 dark:text-amber-300",
        icon: "text-amber-600 dark:text-amber-400",
      };
    case "B":
      return {
        bg: "bg-blue-50 dark:bg-blue-950/30",
        border: "border-blue-300 dark:border-blue-700",
        text: "text-blue-700 dark:text-blue-300",
        icon: "text-blue-600 dark:text-blue-400",
      };
    case "C":
      return {
        bg: "bg-purple-50 dark:bg-purple-950/30",
        border: "border-purple-300 dark:border-purple-700",
        text: "text-purple-700 dark:text-purple-300",
        icon: "text-purple-600 dark:text-purple-400",
      };
    case "D":
      return {
        bg: "bg-orange-50 dark:bg-orange-950/30",
        border: "border-orange-300 dark:border-orange-700",
        text: "text-orange-700 dark:text-orange-300",
        icon: "text-orange-600 dark:text-orange-400",
      };
    case "E":
      return {
        bg: "bg-red-50 dark:bg-red-950/30",
        border: "border-red-300 dark:border-red-700",
        text: "text-red-700 dark:text-red-300",
        icon: "text-red-600 dark:text-red-400",
      };
  }
}

function getDomainIcon(domain: TFCLDomainAnalysis["domain"]) {
  switch (domain) {
    case "aerobic_engine": return <TrendingUp className="h-4 w-4" />;
    case "glycolytic": return <Zap className="h-4 w-4" />;
    case "specific_endurance": return <Clock className="h-4 w-4" />;
    case "energetic": return <Flame className="h-4 w-4" />;
    case "availability": return <Battery className="h-4 w-4" />;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function TFCLDecisionMatrixCard({
  input,
  compact = false,
  showDomainDetails = true,
  className,
}: TFCLDecisionMatrixCardProps) {
  const [isDomainsOpen, setIsDomainsOpen] = useState(false);
  const [isNarrativeOpen, setIsNarrativeOpen] = useState(false);
  
  const result = computeTFCLDecisionMatrix(input);
  const caseColors = getCaseColorClasses(result.decisionCase);
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header */}
      <CardHeader className={cn("pb-3", caseColors.bg, caseColors.border, "border-b")}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className={cn("h-5 w-5", caseColors.icon)} />
              <span>Décision Coach TFCL™</span>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {result.objectiveLabel} • Ambition: {result.ambition}
            </p>
          </div>
          
          {/* Badge de robustesse */}
          <Badge 
            variant="outline" 
            className={cn(
              "shrink-0",
              result.isRobust 
                ? "border-green-500 text-green-700 dark:text-green-400" 
                : "border-amber-500 text-amber-700 dark:text-amber-400"
            )}
          >
            {result.isRobust ? "Robuste" : "Marginal"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        {/* Facteur limitant & Levier - Zone principale */}
        <div className={cn(
          "p-4 rounded-lg border-2",
          caseColors.bg,
          caseColors.border
        )}>
          <div className="grid grid-cols-2 gap-4">
            {/* Facteur limitant */}
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                Facteur limitant
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xl">{result.limitingFactorEmoji}</span>
                <span className={cn("font-semibold", caseColors.text)}>
                  {result.limitingFactorLabel}
                </span>
              </div>
            </div>
            
            {/* Levier prioritaire */}
            <div>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                Levier prioritaire
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xl">{result.leverIcon}</span>
                <span className={cn("font-semibold", caseColors.text)}>
                  {result.leverLabel}
                </span>
              </div>
            </div>
          </div>
          
          {/* Diagnostic court */}
          <div className="mt-3 pt-3 border-t border-border/50">
            <p className={cn("text-sm font-medium", caseColors.text)}>
              {result.diagnosisShort}
            </p>
          </div>
        </div>
        
        {/* Focus entraînement */}
        <div className="grid grid-cols-2 gap-3">
          {/* Ce qu'il faut faire */}
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                Favoriser
              </span>
            </div>
            <ul className="space-y-1">
              {result.focus.do.slice(0, compact ? 2 : 4).map((item, i) => (
                <li key={i} className="text-xs text-green-800 dark:text-green-200 flex items-start gap-1">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Ce qu'il faut éviter */}
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-xs font-medium text-red-700 dark:text-red-300">
                Éviter
              </span>
            </div>
            <ul className="space-y-1">
              {result.focus.avoid.slice(0, compact ? 2 : 3).map((item, i) => (
                <li key={i} className="text-xs text-red-800 dark:text-red-200 flex items-start gap-1">
                  <span className="text-red-500 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Durée du bloc */}
        <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-md bg-muted/50">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">
            Durée recommandée: <strong>{result.focus.blockDuration}</strong>
          </span>
        </div>
        
        {/* Narratif athlète (collapsible) */}
        <Collapsible open={isNarrativeOpen} onOpenChange={setIsNarrativeOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-between h-auto py-2"
            >
              <span className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4" />
                Explication pour l'athlète
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                isNarrativeOpen && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-3 mt-2 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm leading-relaxed">
                "{result.athleteNarrative}"
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        {/* Détails par domaine (collapsible) */}
        {showDomainDetails && (
          <Collapsible open={isDomainsOpen} onOpenChange={setIsDomainsOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-between h-auto py-2"
              >
                <span className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4" />
                  Analyse par domaine
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  isDomainsOpen && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2">
                {result.domains.map((domain) => (
                  <DomainRow key={domain.domain} domain={domain} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Robustesse note */}
        {!result.isRobust && (
          <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              {result.robustnessNote}
            </p>
          </div>
        )}
        
        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center italic">
          {result.disclaimer}
        </p>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT: Ligne de domaine
// ═══════════════════════════════════════════════════════════════════════════════

function DomainRow({ domain }: { domain: TFCLDomainAnalysis }) {
  const statusLabels = {
    optimal: "Optimal",
    acceptable: "Acceptable",
    limiting: "Limitant",
  };
  
  return (
    <div className={cn(
      "flex items-center gap-3 p-2 rounded-md border",
      domain.isLimiting 
        ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800" 
        : "bg-muted/30 border-border"
    )}>
      {/* Icône */}
      <div className={cn(
        "shrink-0",
        domain.isLimiting 
          ? "text-red-600 dark:text-red-400" 
          : "text-muted-foreground"
      )}>
        {getDomainIcon(domain.domain)}
      </div>
      
      {/* Label */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm">{domain.emoji}</span>
          <span className={cn(
            "text-sm font-medium truncate",
            domain.isLimiting && "text-red-700 dark:text-red-300"
          )}>
            {domain.label}
          </span>
        </div>
      </div>
      
      {/* Score */}
      <div className="shrink-0 text-right">
        <div className="flex items-center gap-2">
          {domain.metric.raw !== null && (
            <span className="text-xs text-muted-foreground">
              {typeof domain.metric.raw === "number" 
                ? domain.metric.raw.toFixed(domain.domain === "glycolytic" ? 2 : 0)
                : domain.metric.raw}
            </span>
          )}
          <Badge 
            variant="outline" 
            className={cn("text-[10px]", getMetricStatusBadgeClass(domain.metric.status))}
          >
            {statusLabels[domain.metric.status]}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION COMPACTE
// ═══════════════════════════════════════════════════════════════════════════════

export function TFCLDecisionMatrixCompact({ input }: { input: TFCLDecisionInput }) {
  const result = computeTFCLDecisionMatrix(input);
  const caseColors = getCaseColorClasses(result.decisionCase);
  
  return (
    <div className={cn(
      "p-3 rounded-lg border",
      caseColors.bg,
      caseColors.border
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium flex items-center gap-1.5">
          <Brain className={cn("h-3.5 w-3.5", caseColors.icon)} />
          Décision TFCL
        </span>
        <Badge 
          variant="outline" 
          className={cn("text-[10px]", result.isRobust ? "border-green-500" : "border-amber-500")}
        >
          {result.isRobust ? "✓" : "~"}
        </Badge>
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{result.limitingFactorEmoji}</span>
        <div className="flex-1">
          <p className={cn("text-sm font-semibold", caseColors.text)}>
            {result.leverLabel}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {result.diagnosisShort}
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{result.focus.blockDuration}</span>
      </div>
    </div>
  );
}
