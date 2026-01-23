/**
 * TFCL Decision Chart — Graphique Signature "Potentiel × Disponibilité → Décision"
 * 
 * Graphique 2D interactif avec quadrants colorés et positionnement de l'athlète.
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Target, 
  ChevronDown, 
  ChevronUp, 
  Info,
  AlertTriangle,
  Zap,
  Battery,
  Shield,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type RaceReadinessV2Result,
  type DecisionQuadrant,
  getQuadrant,
  QUADRANT_INFO,
  RACE_READINESS_V2_CATEGORIES,
  RACE_READINESS_V2_DEFINITIONS,
  getRaceReadinessV2BadgeClass,
} from "@/lib/v2/raceReadinessV2";

interface TFCLDecisionChartProps {
  result: RaceReadinessV2Result;
  athleteName?: string;
  objectif?: string;
  compact?: boolean;
  staffMode?: boolean;
  className?: string;
}

export function TFCLDecisionChart({
  result,
  athleteName = "Athlète",
  objectif = "Objectif",
  compact = false,
  staffMode: initialStaffMode = false,
  className,
}: TFCLDecisionChartProps) {
  const [staffMode, setStaffMode] = useState(initialStaffMode);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  
  const { potential, availability, readiness, flags, penalties, explanation } = result;
  
  // Déterminer le quadrant
  const quadrant = getQuadrant(potential.score, availability.score);
  const quadrantInfo = QUADRANT_INFO[quadrant];
  
  // Position du point (en pourcentage pour le graphique)
  const pointX = potential.score; // 0-100
  const pointY = availability.score; // 0-100
  
  // Couleurs des quadrants
  const quadrantColors = {
    topRight: 'bg-green-500/20',    // GO
    topLeft: 'bg-orange-500/20',    // Build engine
    bottomRight: 'bg-yellow-500/20', // Optimize recovery
    bottomLeft: 'bg-red-500/20',     // Caution
  };
  
  if (compact) {
    return (
      <div className={cn("p-4 rounded-lg border", quadrantInfo.bgColor, className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{readiness.categoryEmoji}</div>
            <div>
              <p className="font-semibold">{readiness.categoryLabel}</p>
              <p className="text-xs text-muted-foreground">
                P:{potential.score} × D:{availability.score} → {readiness.score}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={getRaceReadinessV2BadgeClass(readiness.category)}>
            {readiness.score}/100
          </Badge>
        </div>
      </div>
    );
  }
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Race Readiness TFCL™ V2
            </CardTitle>
            <CardDescription>
              Potentiel × Disponibilité → Décision
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Switch
                id="staff-mode"
                checked={staffMode}
                onCheckedChange={setStaffMode}
              />
              <Label htmlFor="staff-mode" className="text-xs">Staff</Label>
            </div>
            <Badge 
              variant="outline" 
              className={cn("text-lg px-3 py-1", getRaceReadinessV2BadgeClass(readiness.category))}
            >
              {readiness.categoryEmoji} {readiness.score}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Graphique 2D */}
        <div className="relative aspect-square max-w-sm mx-auto border rounded-lg overflow-hidden">
          {/* Quadrants de fond */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            {/* Top Left - Build Engine (Orange) */}
            <div className={cn("relative", quadrantColors.topLeft)}>
              <span className="absolute top-2 left-2 text-xs font-medium text-orange-700 dark:text-orange-400">
                🟠 Construire
              </span>
            </div>
            {/* Top Right - GO (Green) */}
            <div className={cn("relative", quadrantColors.topRight)}>
              <span className="absolute top-2 right-2 text-xs font-medium text-green-700 dark:text-green-400">
                🟢 GO
              </span>
            </div>
            {/* Bottom Left - Caution (Red) */}
            <div className={cn("relative", quadrantColors.bottomLeft)}>
              <span className="absolute bottom-2 left-2 text-xs font-medium text-red-700 dark:text-red-400">
                🔴 Prudence
              </span>
            </div>
            {/* Bottom Right - Recovery (Yellow) */}
            <div className={cn("relative", quadrantColors.bottomRight)}>
              <span className="absolute bottom-2 right-2 text-xs font-medium text-yellow-700 dark:text-yellow-400">
                🟡 Récupérer
              </span>
            </div>
          </div>
          
          {/* Axes */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Ligne médiane horizontale */}
            <div className="absolute left-0 right-0 top-1/2 h-px bg-border" />
            {/* Ligne médiane verticale */}
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-border" />
          </div>
          
          {/* Point de l'athlète */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div 
                className="absolute w-6 h-6 -ml-3 -mb-3 rounded-full bg-primary border-2 border-primary-foreground shadow-lg cursor-pointer transition-transform hover:scale-110 z-10 flex items-center justify-center"
                style={{
                  left: `${pointX}%`,
                  bottom: `${pointY}%`,
                }}
              >
                <span className="text-[10px] font-bold text-primary-foreground">
                  {readiness.score}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <div className="space-y-2 text-xs">
                <p className="font-semibold">{athleteName}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-muted-foreground">Potentiel</p>
                    <p className="font-medium">{potential.score}/100</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Disponibilité</p>
                    <p className="font-medium">{availability.score}/100</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-muted-foreground">Décision</p>
                  <p className="font-medium">{readiness.categoryLabel}</p>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
          
          {/* Labels des axes */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground font-medium">
            Potentiel →
          </div>
          <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-muted-foreground font-medium">
            Disponibilité →
          </div>
          
          {/* Graduation */}
          <div className="absolute bottom-1 left-1 text-[10px] text-muted-foreground">0</div>
          <div className="absolute bottom-1 right-1 text-[10px] text-muted-foreground">100</div>
          <div className="absolute top-1 left-1 text-[10px] text-muted-foreground">100</div>
        </div>
        
        {/* Résumé du quadrant */}
        <div className={cn("p-4 rounded-lg border", quadrantInfo.bgColor)}>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">{quadrantInfo.emoji}</span>
            <div>
              <p className="font-semibold">{quadrantInfo.label}</p>
              <p className="text-xs text-muted-foreground">{quadrantInfo.description}</p>
            </div>
          </div>
          
          {/* Scores détaillés */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="text-center p-2 rounded bg-background/50">
              <Zap className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">{potential.score}</p>
              <p className="text-[10px] text-muted-foreground">Potentiel</p>
            </div>
            <div className="text-center p-2 rounded bg-background/50">
              <Battery className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">{availability.score}</p>
              <p className="text-[10px] text-muted-foreground">Disponibilité</p>
            </div>
            <div className="text-center p-2 rounded bg-background/50">
              <Target className="h-4 w-4 mx-auto mb-1 text-primary" />
              <p className="text-lg font-bold">{readiness.score}</p>
              <p className="text-[10px] text-muted-foreground">Décision</p>
            </div>
          </div>
        </div>
        
        {/* Alertes / Flags */}
        {(flags.healthAlert || flags.injuryRiskHigh || flags.fatigueCritical) && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="font-medium text-sm text-red-600 dark:text-red-400">
                Garde-fous actifs
              </span>
            </div>
            <ul className="text-xs text-red-600 dark:text-red-400 space-y-1">
              {penalties.reasons.map((reason, i) => (
                <li key={i}>• {reason}</li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Bouton "Pourquoi cette décision ?" */}
        <Collapsible open={showWhy} onOpenChange={setShowWhy}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between">
              <span className="flex items-center gap-2 text-sm">
                <HelpCircle className="h-4 w-4" />
                Pourquoi cette décision ?
              </span>
              {showWhy ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="pt-3 space-y-3">
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p>{explanation.why}</p>
            </div>
            
            {explanation.watchouts.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1 text-muted-foreground">Points de vigilance :</p>
                <ul className="text-xs space-y-1">
                  {explanation.watchouts.map((w, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <AlertTriangle className="h-3 w-3 text-orange-500 shrink-0 mt-0.5" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {explanation.suggestedFocus.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-1 text-muted-foreground">Focus suggéré :</p>
                <ul className="text-xs space-y-1">
                  {explanation.suggestedFocus.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Target className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
        
        {/* Détails staff */}
        {staffMode && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between">
                <span className="text-xs">Détails staff</span>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="pt-3 space-y-4">
              <Separator />
              
              {/* Potentiel détaillé */}
              <div>
                <p className="text-xs font-medium mb-2 flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Potentiel (Compass)
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">Aérobie</span>
                    <span className="float-right font-medium">{potential.sources.aerobic.value}</span>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">Tolérance</span>
                    <span className="float-right font-medium">{potential.sources.tolerance.value}</span>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">Métabolique</span>
                    <span className="float-right font-medium">{potential.sources.metabolic.value}</span>
                  </div>
                  <div className="p-2 rounded bg-muted/30">
                    <span className="text-muted-foreground">Robustesse</span>
                    <span className="float-right font-medium">{potential.sources.robustness.value}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Confiance : {(potential.confidence * 100).toFixed(0)}% | 
                  Plage : {potential.range?.[0]}–{potential.range?.[1]}
                </p>
              </div>
              
              {/* Disponibilité détaillée */}
              <div>
                <p className="text-xs font-medium mb-2 flex items-center gap-1">
                  <Battery className="h-3 w-3" />
                  Disponibilité
                </p>
                <div className="flex flex-wrap gap-1">
                  {availability.factors.slice(0, 4).map((f, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {f}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Confiance : {(availability.confidence * 100).toFixed(0)}% | 
                  Recommandation : {availability.recommendation}
                </p>
              </div>
              
              {/* Formule */}
              <div className="p-2 rounded bg-muted/30 text-xs font-mono">
                <p>RR = 0.65×{potential.score} + 0.35×{availability.score} - {penalties.total}</p>
                <p className="text-muted-foreground">= {readiness.rawScore} - {penalties.total} = {readiness.score}</p>
              </div>
              
              {/* Confiance globale */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Confiance globale
                </span>
                <Badge variant="outline">
                  {readiness.confidenceLabel} ({(readiness.confidenceGlobal * 100).toFixed(0)}%)
                </Badge>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
        
        {/* Disclaimer */}
        <p className="text-[10px] text-center text-muted-foreground pt-2 border-t border-dashed">
          {result.disclaimer}
        </p>
      </CardContent>
    </Card>
  );
}

export default TFCLDecisionChart;
