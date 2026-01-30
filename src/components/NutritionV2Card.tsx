/**
 * Nutrition V2 Card — Affichage des besoins glucidiques prédictifs
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Apple, 
  AlertTriangle, 
  ChevronDown, 
  Info, 
  TrendingUp, 
  TrendingDown,
  Minus,
  HelpCircle,
  Zap
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  computeNutritionV2,
  getNutritionBadgeClass,
  getNutritionRiskIcon,
  formatCarbsRange,
  NUTRITION_PHILOSOPHY,
  NUTRITION_BOUNDS,
  type NutritionV2Input,
  type NutritionPredictiveV2,
  type NutritionContributor,
} from "@/lib/v2/nutritionV2";

// ============================================
// TYPES
// ============================================

interface NutritionV2CardProps {
  vlamaxValue: number | null;
  vlamaxConfidence?: number;
  tteMin: number | null;
  sport: 'velo' | 'cap';
  targetDurationHours?: number | null;
  targetIntensityPct?: number | null;
  weightKg: number | null;
  advancedGutTraining?: boolean;
  onGutTrainingChange?: (enabled: boolean) => void;
  staffMode?: boolean;
  className?: string;
}

// ============================================
// CONTRIBUTOR ITEM
// ============================================

const ContributorItem = ({ contributor }: { contributor: NutritionContributor }) => {
  const Icon = contributor.direction === 'up' 
    ? TrendingUp 
    : contributor.direction === 'down' 
      ? TrendingDown 
      : Minus;
  
  const colorClass = contributor.direction === 'up'
    ? 'text-warning'
    : contributor.direction === 'down'
      ? 'text-success'
      : 'text-muted-foreground';
  
  return (
    <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg">
      <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", colorClass)} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{contributor.label}</span>
          <span className={cn("text-sm font-mono", colorClass)}>
            {contributor.adjustment > 0 ? '+' : ''}{contributor.adjustment} g/h
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {contributor.explanation}
        </p>
      </div>
    </div>
  );
};

// ============================================
// RISK GAUGE
// ============================================

const RiskGauge = ({ score, risk, label }: { score: number; risk: string; label: string }) => {
  const percentage = (score / 4) * 100;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Risque déplétion</span>
        <Badge variant="outline" className={getNutritionBadgeClass(risk as any)}>
          {getNutritionRiskIcon(risk as any)} {label}
        </Badge>
      </div>
      <Progress value={percentage} className="h-2" />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Faible</span>
        <span>Critique</span>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export function NutritionV2Card({
  vlamaxValue,
  vlamaxConfidence = 0.7,
  tteMin,
  sport,
  targetDurationHours = null,
  targetIntensityPct = null,
  weightKg,
  advancedGutTraining = false,
  onGutTrainingChange,
  staffMode = false,
  className
}: NutritionV2CardProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const nutrition = useMemo(() => {
    const input: NutritionV2Input = {
      vlamaxValue,
      vlamaxConfidence,
      tteMin,
      sport,
      targetDurationHours,
      targetIntensityPct,
      weightKg,
      advancedGutTraining
    };
    return computeNutritionV2(input);
  }, [vlamaxValue, vlamaxConfidence, tteMin, sport, targetDurationHours, targetIntensityPct, weightKg, advancedGutTraining]);
  
  if (!nutrition) {
    return (
      <Card className={cn("opacity-60", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Apple className="w-4 h-4" />
            Nutrition Prédictive V2
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm text-center">Poids requis pour le calcul</p>
            <p className="text-xs mt-1">Renseignez le poids dans le profil</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Apple className="w-4 h-4" />
              Nutrition Prédictive V2
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {nutrition.sportLabel} — Besoins glucidiques estimés
            </CardDescription>
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={getNutritionBadgeClass(nutrition.glycogenRisk)}
                >
                  {getNutritionRiskIcon(nutrition.glycogenRisk)} {nutrition.glycogenRiskLabel}
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Risque de déplétion glycogène basé sur VLamax, TTE, durée et sport.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Gut Training Toggle */}
        {onGutTrainingChange && (
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-warning" />
              <div>
                <Label htmlFor="gut-training-toggle" className="text-sm font-medium cursor-pointer">
                  Gut Training Avancé
                </Label>
                <p className="text-[10px] text-muted-foreground">
                  Étend les bornes jusqu'à 120 g/h (Jeukendrup 2017)
                </p>
              </div>
            </div>
            <Switch
              id="gut-training-toggle"
              checked={advancedGutTraining}
              onCheckedChange={onGutTrainingChange}
            />
          </div>
        )}
        
        {/* Main result */}
        <div className="text-center p-4 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Plage recommandée</p>
          <p className="text-3xl font-bold text-foreground">
            {formatCarbsRange(nutrition)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Valeur centrale : {nutrition.carbsCentral} g/h
          </p>
        </div>
        
        {/* Risk gauge */}
        <RiskGauge 
          score={nutrition.glycogenRiskScore} 
          risk={nutrition.glycogenRisk}
          label={nutrition.glycogenRiskLabel}
        />
        
        {/* Confidence */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Confiance</span>
          <span className="font-mono">{Math.round(nutrition.confidence * 100)}%</span>
        </div>
        
        {/* Why this number */}
        <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <div className="flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-primary mb-1">Pourquoi ce chiffre ?</p>
              <p className="text-xs text-muted-foreground">
                {nutrition.whyThisNumber}
              </p>
            </div>
          </div>
        </div>
        
        {/* Warnings */}
        {nutrition.warnings.length > 0 && (
          <div className="space-y-2">
            {nutrition.warnings.map((warning, i) => (
              <div 
                key={i}
                className="p-2 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                <p className="text-xs text-warning">{warning}</p>
              </div>
            ))}
          </div>
        )}
        
        {/* Details collapsible */}
        <Collapsible open={showDetails} onOpenChange={setShowDetails}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full">
              <span className="text-xs">
                {showDetails ? 'Masquer les détails' : 'Voir les détails du calcul'}
              </span>
              <ChevronDown className={cn(
                "w-4 h-4 ml-1 transition-transform",
                showDetails && "rotate-180"
              )} />
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-3 mt-3">
            {/* Contributors */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Décomposition du calcul
              </p>
              {nutrition.contributors.map((contributor) => (
                <ContributorItem key={contributor.id} contributor={contributor} />
              ))}
            </div>
            
            {/* Recommendations */}
            {nutrition.recommendations.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  Recommandations
                </p>
                <ul className="space-y-1">
                  {nutrition.recommendations.map((rec, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-success">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Staff mode details */}
            {staffMode && (
              <div className="p-2 bg-muted/50 rounded-lg text-xs space-y-1">
                <p><strong>Taux de base:</strong> {nutrition.baseRate} g/h</p>
                <p><strong>Sport:</strong> {nutrition.sportLabel}</p>
                <p><strong>Durée cible:</strong> {nutrition.targetDurationHours ? `${nutrition.targetDurationHours}h` : '—'}</p>
                <p><strong>Intensité:</strong> {nutrition.targetIntensityPct ? `${nutrition.targetIntensityPct}%` : '—'}</p>
                <p><strong>Score risque:</strong> {nutrition.glycogenRiskScore}/4</p>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
        
        {/* Disclaimer */}
        <div className="p-2 bg-muted/30 rounded-lg">
          <p className="text-[10px] text-muted-foreground text-center italic">
            {nutrition.disclaimer}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default NutritionV2Card;
