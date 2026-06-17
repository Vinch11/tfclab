/**
 * NutritionUnifiedCard — Carte nutrition unique TFCL™
 * 
 * Fusionne NutritionPredictive V1, NutritionV2Card, NutritionTimingCard
 * en une seule carte avec onglets :
 *   - Résumé (plage + risque + message)
 *   - Plan Course (phases chronologiques + produits concrets)
 *   - Hydratation (ml/h, sodium, chaleur)
 * 
 * Toggle Staff / Athlète pour le niveau de langage
 */

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  Droplets,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  HelpCircle,
  Utensils,
  Thermometer,
  GlassWater,
  User,
  Wrench,
  Bike,
  Footprints,
  Mountain,
  Zap as Lightning,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedTabsContent } from "@/components/ui/animated-tabs-content";
import { SwipeableTabsContent } from "@/components/ui/swipeable-tabs";
import { getConfidenceLabel, getConfidenceColorClass } from "@/lib/confidenceDisplay";
import {
  computeNutritionUnified,
  getNutritionUnifiedBadgeClass,
  getNutritionUnifiedRiskColor,
  type NutritionUnifiedInput,
  type NutritionUnifiedResult,
  type NutritionContributorUnified,
  type NutritionPhaseUnified,
  type NutritionProduct,
} from "@/lib/v2/nutritionUnified";

// ============================================
// PROPS
// ============================================

interface NutritionUnifiedCardProps {
  vlamaxValue: number | null;
  vlamaxConfidence?: number;
  vo2max?: number | null;
  tteMin: number | null;
  sport: 'velo' | 'cap' | 'trail' | 'ultra';
  objectif: string;
  targetDurationHours?: number | null;
  targetIntensityPct?: number | null;
  weightKg: number | null;
  advancedGutTraining?: boolean;
  onGutTrainingChange?: (enabled: boolean) => void;
  heatCondition?: boolean;
  onHeatChange?: (heat: boolean) => void;
  staffMode?: boolean;
  className?: string;
}

// ============================================
// SUB-COMPONENTS
// ============================================

const ProductItem = ({ product }: { product: NutritionProduct }) => {
  const icons: Record<string, string> = {
    gel: '💧', drink: '🥤', bar: '🍫', chew: '🍬', solid: '🥖',
  };
  return (
    <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg">
      <span className="text-base mt-0.5">{icons[product.type] || '🍽️'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{product.label}</p>
        <p className="text-xs text-primary font-medium">{product.frequency}</p>
        {product.notes && (
          <p className="text-[11px] text-muted-foreground mt-0.5">{product.notes}</p>
        )}
      </div>
      {product.carbsPerUnit > 0 && (
        <span className="text-xs font-mono text-muted-foreground shrink-0">{product.carbsPerUnit}g</span>
      )}
    </div>
  );
};

const ContributorRow = ({ c }: { c: NutritionContributorUnified }) => {
  const Icon = c.direction === 'up' ? TrendingUp : c.direction === 'down' ? TrendingDown : Minus;
  const colorClass = c.direction === 'up' ? 'text-warning' : c.direction === 'down' ? 'text-success' : 'text-muted-foreground';
  return (
    <div className="flex items-center justify-between gap-2 text-xs py-1">
      <div className="flex items-center gap-1.5">
        <Icon className={cn("w-3 h-3", colorClass)} />
        <span className="text-foreground">{c.label}</span>
      </div>
      <span className={cn("font-mono", colorClass)}>
        {c.id === 'base' ? c.adjustment : (c.adjustment > 0 ? '+' : '') + c.adjustment} g/h
      </span>
    </div>
  );
};

const PhaseCard = ({ phase, isStaff }: { phase: NutritionPhaseUnified; isStaff: boolean }) => {
  const bgClasses: Record<string, string> = {
    PRE: 'bg-muted/50 border-border',
    START: 'bg-primary/5 border-primary/20',
    MID: 'bg-accent/5 border-accent/20',
    LATE: 'bg-warning/5 border-warning/20',
    NIGHT: 'bg-indigo-500/5 border-indigo-500/30',
  };
  const labelIcons: Record<string, string> = {
    PRE: '📋', START: '🚀', MID: '⚡', LATE: '🔥', NIGHT: '🌙',
  };

  return (
    <div className={cn("p-3 rounded-lg border", bgClasses[phase.name] || 'bg-muted/30 border-border')}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span>{labelIcons[phase.name]}</span>
          <span className="font-semibold text-sm text-foreground">{phase.label}</span>
        </div>
        <Badge variant="outline" className="text-[10px]">{phase.timeRange}</Badge>
      </div>

      {phase.carbsGh > 0 && (
        <div className="mb-2">
          <span className="text-2xl font-bold font-mono text-foreground">{phase.carbsGhRange}</span>
          <span className="text-xs text-muted-foreground ml-1">g/h</span>
        </div>
      )}

      {/* Message adapté */}
      <p className="text-xs text-muted-foreground mb-2">
        {isStaff ? phase.staffMessage : phase.athleteMessage}
      </p>

      {/* Produits concrets */}
      {phase.products.length > 0 && (
        <div className="space-y-1.5">
          {phase.products.map((p, i) => (
            <ProductItem key={i} product={p} />
          ))}
        </div>
      )}

      {/* Hydratation inline */}
      {phase.hydrationMlH > 0 && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Droplets className="w-3 h-3 text-blue-400" />
          <span>{phase.hydrationMlH} ml/h • Na+ {phase.sodiumMgH} mg/h</span>
        </div>
      )}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export function NutritionUnifiedCard({
  vlamaxValue,
  vlamaxConfidence = 0.7,
  vo2max,
  tteMin,
  sport,
  objectif,
  targetDurationHours = null,
  targetIntensityPct = null,
  weightKg,
  advancedGutTraining = false,
  onGutTrainingChange,
  heatCondition = false,
  onHeatChange,
  staffMode = false,
  className,
}: NutritionUnifiedCardProps) {
  const [activeTab, setActiveTab] = useState("summary");
  const [showCalc, setShowCalc] = useState(false);
  const [isStaffView, setIsStaffView] = useState(staffMode);

  const nutrition = useMemo(() => {
    const input: NutritionUnifiedInput = {
      vlamaxValue,
      vlamaxConfidence,
      vo2max,
      tteMin,
      sport,
      objectif,
      targetDurationHours,
      targetIntensityPct,
      weightKg,
      advancedGutTraining,
      heatCondition,
    };
    return computeNutritionUnified(input);
  }, [vlamaxValue, vlamaxConfidence, vo2max, tteMin, sport, objectif, targetDurationHours, targetIntensityPct, weightKg, advancedGutTraining, heatCondition]);

  if (!nutrition) {
    return (
      <Card className={cn("opacity-60", className)}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Utensils className="w-4 h-4" />
            Nutrition
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">Données insuffisantes</p>
            <p className="text-xs mt-1 text-center max-w-xs">
              Renseignez le poids et au minimum VLamax ou TTE.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const SportIcon = sport === 'ultra' ? Lightning : sport === 'trail' ? Mountain : sport === 'cap' ? Footprints : Bike;
  const sportEmoji = sport === 'ultra' ? '⚡' : sport === 'trail' ? '🏔️' : sport === 'cap' ? '🏃' : '🚴';

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Utensils className="w-4 h-4 text-primary" />
            <CardTitle className="text-base">Nutrition & Hydratation</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {/* Staff/Athlète toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setIsStaffView(!isStaffView)}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors",
                      isStaffView ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isStaffView ? <Wrench className="w-3 h-3" /> : <User className="w-3 h-3" />}
                    {isStaffView ? 'Staff' : 'Athlète'}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{isStaffView ? 'Langage technique coach' : 'Langage simple athlète'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Badge variant="outline" className={getNutritionUnifiedBadgeClass(nutrition.risk)}>
              {nutrition.riskIcon} {nutrition.riskLabel}
            </Badge>
          </div>
        </div>

        {/* Sport label */}
        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
          <SportIcon className="w-3 h-3" />
          <span>{sportEmoji} {nutrition.sportLabel} • {objectif}</span>
          {nutrition.durationHours && <span>• ~{nutrition.durationHours}h</span>}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary" className="text-xs min-h-[44px] gap-1">
              <Apple className="h-3 w-3" /> Résumé
            </TabsTrigger>
            <TabsTrigger value="plan" className="text-xs min-h-[44px] gap-1">
              <Clock className="h-3 w-3" /> Plan Course
            </TabsTrigger>
            <TabsTrigger value="hydration" className="text-xs min-h-[44px] gap-1">
              <Droplets className="h-3 w-3" /> Hydratation
            </TabsTrigger>
          </TabsList>

          <SwipeableTabsContent
            tabs={["summary", "plan", "hydration"]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          >
            {/* ===== RÉSUMÉ ===== */}
            <AnimatedTabsContent value="summary" activeValue={activeTab} className="mt-3 space-y-3">
              {/* Toggles */}
              <div className="flex flex-wrap gap-2">
                {onGutTrainingChange && (
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border border-border/50 flex-1 min-w-[180px]">
                    <Zap className="w-3.5 h-3.5 text-warning shrink-0" />
                    <Label htmlFor="gut-toggle" className="text-xs cursor-pointer flex-1">Gut Training</Label>
                    <Switch id="gut-toggle" checked={advancedGutTraining} onCheckedChange={onGutTrainingChange} />
                  </div>
                )}
                {onHeatChange && (
                  <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg border border-border/50 flex-1 min-w-[180px]">
                    <Thermometer className="w-3.5 h-3.5 text-destructive shrink-0" />
                    <Label htmlFor="heat-toggle" className="text-xs cursor-pointer flex-1">Chaleur (&gt;28°C)</Label>
                    <Switch id="heat-toggle" checked={heatCondition} onCheckedChange={onHeatChange} />
                  </div>
                )}
              </div>

              {/* Main number */}
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Glucides recommandés</p>
                <p className="text-4xl font-bold text-foreground font-mono">
                  {nutrition.carbsMin}–{nutrition.carbsMax}
                </p>
                <p className="text-sm text-muted-foreground">g/h • cible {nutrition.carbsCentral}</p>
              </div>

              {/* Risk gauge */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Risque déplétion</span>
                  <span className={cn("font-medium", getNutritionUnifiedRiskColor(nutrition.risk))}>
                    {nutrition.riskIcon} {nutrition.riskLabel} ({nutrition.riskScore}/4)
                  </span>
                </div>
                <Progress value={(nutrition.riskScore / 4) * 100} className="h-2" />
              </div>

              {/* Summary message */}
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <HelpCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-primary mb-1">
                      {isStaffView ? 'Analyse métabolique' : 'Ce que ça veut dire'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isStaffView ? nutrition.summaryStaff : nutrition.summaryAthlete}
                    </p>
                  </div>
                </div>
              </div>

              {/* Why this number */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  {isStaffView ? nutrition.whyStaff : nutrition.whyAthlete}
                </p>
              </div>

              {/* Warnings */}
              {(isStaffView ? nutrition.warnings : nutrition.athleteWarnings).map((w, i) => (
                <div key={i} className="p-2 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-warning mt-0.5 shrink-0" />
                  <p className="text-xs text-warning">{w}</p>
                </div>
              ))}

              {/* Confidence */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Fiabilité</span>
                <span className={cn("font-medium", getConfidenceColorClass(nutrition.confidence))}>
                  {getConfidenceLabel(nutrition.confidence)}
                </span>
              </div>

              {/* Calcul details */}
              <Collapsible open={showCalc} onOpenChange={setShowCalc}>
                <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-1">
                  <ChevronDown className={cn("w-3 h-3 transition-transform", showCalc && "rotate-180")} />
                  {showCalc ? 'Masquer le calcul' : 'Voir le calcul'}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 p-3 bg-muted/30 rounded-lg space-y-1">
                  {nutrition.contributors.map(c => (
                    <ContributorRow key={c.id} c={c} />
                  ))}
                  <div className="border-t border-border pt-1 mt-1 flex items-center justify-between text-xs font-semibold">
                    <span>Total</span>
                    <span className="font-mono">{nutrition.carbsCentral} g/h</span>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </AnimatedTabsContent>

            {/* ===== PLAN COURSE ===== */}
            <AnimatedTabsContent value="plan" activeValue={activeTab} className="mt-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                {isStaffView
                  ? 'Plan chronologique avec produits et dosages par phase.'
                  : 'Voici exactement quoi manger et quand pendant ta course.'}
              </p>
              {nutrition.phases.map((phase) => (
                <PhaseCard key={phase.name} phase={phase} isStaff={isStaffView} />
              ))}
            </AnimatedTabsContent>

            {/* ===== HYDRATATION ===== */}
            <AnimatedTabsContent value="hydration" activeValue={activeTab} className="mt-3 space-y-3">
              {/* Main hydration numbers */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg text-center">
                  <GlassWater className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold font-mono text-foreground">
                    {nutrition.hydration.heatAdjustedMlH}
                  </p>
                  <p className="text-xs text-muted-foreground">ml/h</p>
                  {nutrition.hydration.heatWarning && (
                    <p className="text-[10px] text-destructive mt-1">Ajusté chaleur +35%</p>
                  )}
                </div>
                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg text-center">
                  <Thermometer className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                  <p className="text-2xl font-bold font-mono text-foreground">
                    {nutrition.hydration.sodiumMgH}
                  </p>
                  <p className="text-xs text-muted-foreground">mg Na+/h</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{nutrition.hydration.sodiumMgL} mg/L</p>
                </div>
              </div>

              {/* Message */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  {isStaffView ? nutrition.hydration.staffMessage : nutrition.hydration.athleteMessage}
                </p>
              </div>

              {/* Recommendations */}
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-foreground">Recommandations</p>
                {nutrition.hydration.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <Droplets className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{r}</span>
                  </div>
                ))}
              </div>

              {/* Heat toggle inline if not in header */}
              {onHeatChange && (
                <div className="flex items-center gap-2 p-2 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <Thermometer className="w-3.5 h-3.5 text-destructive shrink-0" />
                  <Label htmlFor="heat-toggle-2" className="text-xs cursor-pointer flex-1">
                    Conditions chaudes (&gt;28°C)
                  </Label>
                  <Switch id="heat-toggle-2" checked={heatCondition} onCheckedChange={onHeatChange} />
                </div>
              )}
            </AnimatedTabsContent>
          </SwipeableTabsContent>
        </Tabs>

        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center italic px-2">
          {nutrition.disclaimer}
        </p>
      </CardContent>
    </Card>
  );
}

export default NutritionUnifiedCard;
