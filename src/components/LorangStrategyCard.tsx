/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LORANG STRATEGY CARD – TFCL METHOD™
 * Carte UI principale affichant la stratégie Lorang active
 * 
 * Affiche:
 * - Limiteur identifié
 * - Leviers activés (max 3)
 * - Interdictions (Sprint Ban Mode)
 * - Niveau de confiance
 * - Suggestion template
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Target,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Ban,
  Zap,
  Info,
  Calendar,
  Shield,
  Brain,
} from "lucide-react";
import {
  computeLorangStrategy,
  type LorangStrategyInput,
  type LorangStrategyResult,
  type LorangLeverActivation,
  type LorangProhibitionRule,
  LORANG_PHILOSOPHY,
} from "@/engines/decision";

// ═══════════════════════════════════════════════════════════════════════════════
// PROPS
// ═══════════════════════════════════════════════════════════════════════════════

interface LorangStrategyCardProps {
  input: LorangStrategyInput;
  showStaffLevers?: boolean;
  compact?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS UI
// ═══════════════════════════════════════════════════════════════════════════════

function getConfidenceColor(confidence: 'high' | 'moderate' | 'low'): string {
  switch (confidence) {
    case 'high': return "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30";
    case 'moderate': return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30";
    case 'low': return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30";
  }
}

function getPriorityBadge(priority: 1 | 2 | 3): { label: string; color: string } {
  switch (priority) {
    case 1: return { label: "P1", color: "bg-primary text-primary-foreground" };
    case 2: return { label: "P2", color: "bg-secondary text-secondary-foreground" };
    case 3: return { label: "P3", color: "bg-muted text-muted-foreground" };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function LorangStrategyCard({
  input,
  showStaffLevers = false,
  compact = false,
  className,
}: LorangStrategyCardProps) {
  const [isLeversOpen, setIsLeversOpen] = useState(!compact);
  const [isProhibitionsOpen, setIsProhibitionsOpen] = useState(false);
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);
  
  const result = computeLorangStrategy(input);
  
  // Filtrer les leviers staff si nécessaire
  const visibleLevers = showStaffLevers 
    ? result.activatedLevers 
    : result.activatedLevers.filter(l => !l.isStaffOnly);
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header */}
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span>TFCL Strategy Engine</span>
              <Badge variant="outline" className="text-[9px] font-normal">
                TFCL Method™
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Stratégie d'entraînement TFCL (inspirée Dan Lorang)
            </p>
          </div>
          
          {/* Badge confiance */}
          <Badge 
            variant="outline" 
            className={cn("shrink-0", getConfidenceColor(result.confidence))}
          >
            Confiance: {result.confidenceLabel}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4 space-y-4">
        {/* Limiteur principal */}
        <div className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{result.limiterIcon}</span>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Limiteur principal identifié
              </p>
              <p className="text-lg font-semibold text-primary">
                {result.limiterLabel}
              </p>
              {/* Détail faiblesse aérobie si applicable */}
              {result.aerobicWeaknessDetail !== 'none' && result.aerobicWeaknessLabel && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                  <span>→</span>
                  <span>{result.aerobicWeaknessLabel}</span>
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {result.limiterExplanation}
          </p>
        </div>
        
        {/* Sprint Ban Mode */}
        {result.hasSprintBan && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <Ban className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="text-sm font-medium text-destructive">
                Sprint Ban Mode ON
              </p>
              <p className="text-xs text-destructive/80">
                Sprints et micro-intervalles explosifs interdits pour cet objectif
              </p>
            </div>
          </div>
        )}
        
        {/* Synthèse action */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                Action principale
              </span>
            </div>
            <p className="text-sm font-semibold text-green-800 dark:text-green-200">
              {result.summary.mainAction}
            </p>
            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
              {result.summary.whyThis}
            </p>
          </div>
          
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-1.5 mb-1">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-xs font-medium text-red-700 dark:text-red-300">
                À éviter
              </span>
            </div>
            <p className="text-sm text-red-800 dark:text-red-200">
              {result.summary.whyNotOthers}
            </p>
          </div>
        </div>
        
        {/* Leviers activés */}
        <Collapsible open={isLeversOpen} onOpenChange={setIsLeversOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-between h-auto py-2"
            >
              <span className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4" />
                Leviers activés ({visibleLevers.length})
              </span>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                isLeversOpen && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-2">
              {visibleLevers.map((lever) => (
                <LeverCard key={lever.lever} lever={lever} />
              ))}
              {visibleLevers.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Aucun levier spécifique activé — maintenir le plan actuel
                </p>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        {/* Interdictions */}
        {result.prohibitions.length > 0 && (
          <Collapsible open={isProhibitionsOpen} onOpenChange={setIsProhibitionsOpen}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-between h-auto py-2 text-destructive hover:text-destructive"
              >
                <span className="flex items-center gap-2 text-sm">
                  <Ban className="h-4 w-4" />
                  Interdictions ({result.prohibitions.length})
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  isProhibitionsOpen && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 space-y-2">
                {result.prohibitions.map((prohibition) => (
                  <ProhibitionCard key={prohibition.prohibition} prohibition={prohibition} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Suggestion template */}
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">Suggestion semaine</span>
          </div>
          <p className="text-sm font-semibold">{result.templateSuggestion.weekLabel}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {result.templateSuggestion.reasoning}
          </p>
        </div>
        
        {/* Message athlète */}
        <Collapsible open={isExplanationOpen} onOpenChange={setIsExplanationOpen}>
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
                isExplanationOpen && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-3 mt-2 rounded-lg bg-primary/5 border border-primary/20">
              <p className="text-sm leading-relaxed">
                "{result.athleteMessage}"
              </p>
            </div>
          </CollapsibleContent>
        </Collapsible>
        
        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center italic">
          {result.disclaimer}
        </p>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT: Carte Levier
// ═══════════════════════════════════════════════════════════════════════════════

function LeverCard({ lever }: { lever: LorangLeverActivation }) {
  const [isOpen, setIsOpen] = useState(false);
  const priorityBadge = getPriorityBadge(lever.priority);
  
  return (
    <div className={cn(
      "p-3 rounded-lg border",
      lever.priority === 1 
        ? "bg-primary/5 border-primary/30" 
        : "bg-muted/30 border-border"
    )}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{lever.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{lever.label}</span>
            <Badge className={cn("text-[9px] h-4", priorityBadge.color)}>
              {priorityBadge.label}
            </Badge>
            {lever.isStaffOnly && (
              <Badge variant="outline" className="text-[9px] h-4">
                <Shield className="h-2.5 w-2.5 mr-0.5" />
                Staff
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{lever.reason}</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0"
          onClick={() => setIsOpen(!isOpen)}
        >
          <ChevronDown className={cn(
            "h-3 w-3 transition-transform",
            isOpen && "rotate-180"
          )} />
        </Button>
      </div>
      
      {isOpen && (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
          {/* Prescription */}
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
              Prescription
            </p>
            <ul className="space-y-0.5">
              {lever.prescription.map((item, i) => (
                <li key={i} className="text-xs flex items-start gap-1">
                  <span className="text-green-500 mt-0.5">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Warnings */}
          {lever.warnings.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-amber-600 dark:text-amber-400 mb-1">
                Attention
              </p>
              <ul className="space-y-0.5">
                {lever.warnings.map((item, i) => (
                  <li key={i} className="text-xs text-amber-700 dark:text-amber-300 flex items-start gap-1">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Safety checklist */}
          {lever.safetyChecklist && lever.safetyChecklist.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wide text-red-600 dark:text-red-400 mb-1">
                Checklist sécurité (obligatoire)
              </p>
              <ul className="space-y-0.5">
                {lever.safetyChecklist.map((item, i) => (
                  <li key={i} className="text-xs text-red-700 dark:text-red-300 flex items-start gap-1">
                    <span>☐</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOUS-COMPOSANT: Carte Interdiction
// ═══════════════════════════════════════════════════════════════════════════════

function ProhibitionCard({ prohibition }: { prohibition: LorangProhibitionRule }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 p-2 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 cursor-help">
            <Ban className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-red-700 dark:text-red-300">
                {prohibition.label}
              </span>
              <p className="text-xs text-red-600 dark:text-red-400 truncate">
                {prohibition.reason}
              </p>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs">{prohibition.explanation}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default LorangStrategyCard;
