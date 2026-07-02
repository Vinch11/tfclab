/**
 * AgeComparisonCard - Comparatif des cibles avec/sans ajustement d'âge
 * Affiche les cibles par niveau d'ambition pour VO₂max, TTE et Nutrition
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity, 
  Calendar, 
  TrendingDown, 
  Info, 
  Clock, 
  Utensils,
  Flame 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  getVo2maxTarget, 
  getVo2maxAgeFactor, 
  getVo2maxAgeAdjustmentLabel 
} from "@/engines/diagnostic";
import { 
  getTTETargetForAge,
  getAgeNutritionAdjustment,
  computeAgeAdjustmentIndex,
  type AgeTTETargets,
} from "@/lib/ageAdjustment";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OutOfDomainBadge, disciplineFromGoal } from "@/components/OutOfDomainBadge";


// =============================================
// TYPES
// =============================================

interface VO2maxAgeComparisonCardProps {
  objectif: string;
  age: number | null;
  currentVo2max?: number | null;
  currentTTE?: number | null;
  ambition?: string;
  className?: string;
  /** Mode compact pour le rapport PDF */
  compact?: boolean;
}

interface AmbitionRow {
  key: string;
  label: string;
  emoji: string;
  baseTarget: number;
  adjustedTarget: number;
  difference: number;
  differencePercent: number;
}

interface TTERow {
  category: string;
  baseMin: number;
  baseIdeal: number;
  adjustedMin: number;
  adjustedIdeal: number;
  differenceMin: number;
  differenceIdeal: number;
}

interface NutritionRow {
  category: string;
  label: string;
  baseCarbsMin: number;
  baseCarbsMax: number;
  adjustedCarbsMin: number;
  adjustedCarbsMax: number;
  reductionPct: number;
}

// =============================================
// HELPER FUNCTIONS
// =============================================

const AMBITION_LABELS: Record<string, { label: string; emoji: string }> = {
  finisher: { label: "Finisher", emoji: "🎯" },
  age_group: { label: "Age Group", emoji: "🏅" },
  competitor: { label: "Compétiteur", emoji: "🥈" },
  elite: { label: "Élite", emoji: "🏆" },
};

function getObjectifLabel(objectif: string): string {
  const labels: Record<string, string> = {
    IM: "Ironman",
    Ironman: "Ironman",
    "703": "70.3",
    Half: "70.3",
    Marathon: "Marathon",
    Semi: "Semi-Marathon",
    Trail: "Trail",
    Ultra: "Ultra-Trail",
    Sprint: "Sprint",
    Olympic: "Olympique",
  };
  return labels[objectif] || objectif;
}

function buildAmbitionRows(objectif: string, age: number | null): AmbitionRow[] {
  const ambitions = ["finisher", "age_group", "competitor", "elite"];
  
  return ambitions.map((ambition) => {
    const baseTarget = getVo2maxTarget(objectif, ambition, null); // Sans âge
    const adjustedTarget = getVo2maxTarget(objectif, ambition, age); // Avec âge
    const difference = adjustedTarget - baseTarget;
    const differencePercent = baseTarget > 0 ? ((adjustedTarget - baseTarget) / baseTarget) * 100 : 0;

    return {
      key: ambition,
      label: AMBITION_LABELS[ambition]?.label || ambition,
      emoji: AMBITION_LABELS[ambition]?.emoji || "📊",
      baseTarget,
      adjustedTarget,
      difference,
      differencePercent,
    };
  });
}

function buildTTERows(objectif: string, age: number | null): TTERow[] {
  // Cibles de base (sans âge)
  const baseTargetsIM = getTTETargetForAge("ironman", null);
  const baseTargetsHalf = getTTETargetForAge("703", null);
  const baseTargetsMarathon = getTTETargetForAge("marathon", null);
  
  // Cibles ajustées (avec âge)
  const adjustedTargetsIM = getTTETargetForAge("ironman", age);
  const adjustedTargetsHalf = getTTETargetForAge("703", age);
  const adjustedTargetsMarathon = getTTETargetForAge("marathon", age);

  return [
    {
      category: "🏊 Ironman / Ultra",
      baseMin: baseTargetsIM.min,
      baseIdeal: baseTargetsIM.ideal,
      adjustedMin: adjustedTargetsIM.min,
      adjustedIdeal: adjustedTargetsIM.ideal,
      differenceMin: adjustedTargetsIM.min - baseTargetsIM.min,
      differenceIdeal: adjustedTargetsIM.ideal - baseTargetsIM.ideal,
    },
    {
      category: "🚴 70.3 / Half",
      baseMin: baseTargetsHalf.min,
      baseIdeal: baseTargetsHalf.ideal,
      adjustedMin: adjustedTargetsHalf.min,
      adjustedIdeal: adjustedTargetsHalf.ideal,
      differenceMin: adjustedTargetsHalf.min - baseTargetsHalf.min,
      differenceIdeal: adjustedTargetsHalf.ideal - baseTargetsHalf.ideal,
    },
    {
      category: "🏃 Marathon / Semi",
      baseMin: baseTargetsMarathon.min,
      baseIdeal: baseTargetsMarathon.ideal,
      adjustedMin: adjustedTargetsMarathon.min,
      adjustedIdeal: adjustedTargetsMarathon.ideal,
      differenceMin: adjustedTargetsMarathon.min - baseTargetsMarathon.min,
      differenceIdeal: adjustedTargetsMarathon.ideal - baseTargetsMarathon.ideal,
    },
  ];
}

function buildNutritionRows(age: number | null): NutritionRow[] {
  const baseNutrition = getAgeNutritionAdjustment(null);
  const adjustedNutrition = getAgeNutritionAdjustment(age);

  // Valeurs de base typiques pour différentes intensités
  const baseCarbRanges = [
    { category: "vélo", label: "🚴 Vélo (Z2-Z3)", min: 60, max: 90 },
    { category: "velo_intense", label: "🚴 Vélo (Z4+)", min: 80, max: 100 },
    { category: "cap", label: "🏃 Course à pied", min: 50, max: 70 },
  ];

  return baseCarbRanges.map(range => {
    const adjustedMin = Math.round(range.min * adjustedNutrition.carbReductionFactor);
    const adjustedMax = Math.round(range.max * adjustedNutrition.carbReductionFactor);
    
    return {
      category: range.category,
      label: range.label,
      baseCarbsMin: range.min,
      baseCarbsMax: range.max,
      adjustedCarbsMin: adjustedMin,
      adjustedCarbsMax: adjustedMax,
      reductionPct: adjustedNutrition.toleranceReductionPct,
    };
  });
}

function getStatusForValue(
  currentVo2max: number | null, 
  target: number
): "optimal" | "acceptable" | "below" | null {
  if (currentVo2max === null) return null;
  if (currentVo2max >= target) return "optimal";
  if (currentVo2max >= target * 0.9) return "acceptable";
  return "below";
}

// =============================================
// SUB-COMPONENTS
// =============================================

function VO2maxTable({
  rows,
  ambition,
  currentVo2max,
  hasAgeAdjustment,
}: {
  rows: AmbitionRow[];
  ambition: string;
  currentVo2max: number | null | undefined;
  hasAgeAdjustment: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 font-medium text-muted-foreground">Ambition</th>
            <th className="text-center py-2 font-medium text-muted-foreground">
              Cible &lt;30 ans
            </th>
            <th className="text-center py-2 font-medium text-muted-foreground">
              <span className="flex items-center justify-center gap-1">
                Cible ajustée
                {hasAgeAdjustment && <Calendar className="w-3 h-3" />}
              </span>
            </th>
            <th className="text-center py-2 font-medium text-muted-foreground">Δ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isCurrentAmbition = row.key === ambition;
            const status = getStatusForValue(currentVo2max ?? null, row.adjustedTarget);
            
            // Delta = VO₂max actuel - cible ajustée (écart de l'athlète par rapport à la cible)
            const athleteDelta = currentVo2max != null 
              ? currentVo2max - row.adjustedTarget 
              : null;
            
            return (
              <tr 
                key={row.key}
                className={cn(
                  "border-b border-border/50 transition-colors",
                  isCurrentAmbition && "bg-primary/5"
                )}
              >
                <td className="py-2.5">
                  <div className="flex items-center gap-2">
                    <span>{row.emoji}</span>
                    <span className={cn("font-medium", isCurrentAmbition && "text-primary")}>
                      {row.label}
                    </span>
                    {isCurrentAmbition && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-primary/10 text-primary border-primary/30">
                        Actuel
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="text-center py-2.5 font-mono">
                  {row.baseTarget} ml/kg/min
                </td>
                <td className="text-center py-2.5">
                  <div className="flex items-center justify-center gap-1">
                    <span className={cn(
                      "font-mono font-semibold",
                      hasAgeAdjustment ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                    )}>
                      {row.adjustedTarget} ml/kg/min
                    </span>
                    {status === "optimal" && (
                      <span className="text-emerald-500">✓</span>
                    )}
                  </div>
                </td>
                <td className="text-center py-2.5">
                  {athleteDelta !== null ? (
                    <span className={cn(
                      "font-mono text-xs",
                      athleteDelta >= 0 
                        ? "text-emerald-600 dark:text-emerald-400" 
                        : "text-red-600 dark:text-red-400"
                    )}>
                      {athleteDelta >= 0 ? "+" : ""}{athleteDelta.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TTETable({
  rows,
  hasAgeAdjustment,
  currentTTE,
}: {
  rows: TTERow[];
  hasAgeAdjustment: boolean;
  currentTTE?: number | null;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 font-medium text-muted-foreground">Format</th>
            <th className="text-center py-2 font-medium text-muted-foreground">
              Base &lt;30 ans
            </th>
            <th className="text-center py-2 font-medium text-muted-foreground">
              <span className="flex items-center justify-center gap-1">
                Cible ajustée
                {hasAgeAdjustment && <Calendar className="w-3 h-3" />}
              </span>
            </th>
            <th className="text-center py-2 font-medium text-muted-foreground">Δ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-b border-border/50">
              <td className="py-2.5 font-medium">{row.category}</td>
              <td className="text-center py-2.5 font-mono text-xs">
                {row.baseMin}–{row.baseIdeal} min
              </td>
              <td className="text-center py-2.5">
                <span className={cn(
                  "font-mono text-xs font-semibold",
                  hasAgeAdjustment ? "text-amber-600 dark:text-amber-400" : "text-foreground"
                )}>
                  {row.adjustedMin}–{row.adjustedIdeal} min
                </span>
              </td>
              <td className="text-center py-2.5">
                {hasAgeAdjustment ? (
                  <span className="font-mono text-xs text-amber-600 dark:text-amber-400">
                    {row.differenceIdeal > 0 ? "+" : ""}{row.differenceIdeal} min
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {currentTTE && (
        <div className="mt-3 p-2 bg-primary/10 rounded-lg text-sm flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-muted-foreground">TTE actuel :</span>
          <span className="font-mono font-bold text-primary">{currentTTE} min</span>
        </div>
      )}
    </div>
  );
}

function NutritionTable({
  rows,
  hasAgeAdjustment,
}: {
  rows: NutritionRow[];
  hasAgeAdjustment: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 font-medium text-muted-foreground">Discipline</th>
            <th className="text-center py-2 font-medium text-muted-foreground">
              Base &lt;30 ans
            </th>
            <th className="text-center py-2 font-medium text-muted-foreground">
              <span className="flex items-center justify-center gap-1">
                Ajusté
                {hasAgeAdjustment && <Calendar className="w-3 h-3" />}
              </span>
            </th>
            <th className="text-center py-2 font-medium text-muted-foreground">Réduction</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-b border-border/50">
              <td className="py-2.5 font-medium">{row.label}</td>
              <td className="text-center py-2.5 font-mono text-xs">
                {row.baseCarbsMin}–{row.baseCarbsMax} g/h
              </td>
              <td className="text-center py-2.5">
                <span className={cn(
                  "font-mono text-xs font-semibold",
                  hasAgeAdjustment ? "text-orange-600 dark:text-orange-400" : "text-foreground"
                )}>
                  {row.adjustedCarbsMin}–{row.adjustedCarbsMax} g/h
                </span>
              </td>
              <td className="text-center py-2.5">
                {hasAgeAdjustment && row.reductionPct > 0 ? (
                  <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/30">
                    −{row.reductionPct}%
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function VO2maxAgeComparisonCard({
  objectif,
  age,
  currentVo2max,
  currentTTE,
  ambition = "age_group",
  className,
  compact = false,
}: VO2maxAgeComparisonCardProps) {
  const vo2maxRows = buildAmbitionRows(objectif, age);
  const tteRows = buildTTERows(objectif, age);
  const nutritionRows = buildNutritionRows(age);
  
  const ageFactor = getVo2maxAgeFactor(age);
  const ageAdjustmentLabel = getVo2maxAgeAdjustmentLabel(age);
  const ageIndex = computeAgeAdjustmentIndex(age);
  const hasAgeAdjustment = age !== null && age >= 30;
  const reductionPercent = hasAgeAdjustment ? Math.round((1 - ageFactor) * 100) : 0;

  // Trouver la ligne correspondant à l'ambition actuelle
  const currentAmbitionRow = vo2maxRows.find((r) => r.key === ambition);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className={cn("pb-2", compact && "py-3")}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="w-5 h-5 text-primary" />
          Comparatif Cibles — Ajustement Âge
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  L'âge affecte les cibles VO₂max, TTE et la tolérance nutritionnelle.
                  Les ajustements permettent des objectifs réalistes et motivants.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">
            {getObjectifLabel(objectif)}
          </Badge>
          {hasAgeAdjustment && (
            <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
              <Calendar className="w-3 h-3 mr-1" />
              {age} ans ({ageIndex.label})
            </Badge>
          )}
          {!hasAgeAdjustment && age !== null && (
            <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              <Calendar className="w-3 h-3 mr-1" />
              {age} ans (référence)
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className={cn("space-y-4", compact && "py-2")}>
        {/* Valeur actuelle VO₂max */}
        {currentVo2max !== null && currentVo2max !== undefined && (
          <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/30">
            <div className="p-2 bg-primary/20 rounded-full">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-sm text-muted-foreground">VO₂max actuel</span>
              <div className="font-mono font-bold text-xl text-primary">
                {Math.round(currentVo2max)} ml/kg/min
              </div>
            </div>
            {currentAmbitionRow && (
              <div className="ml-auto text-right">
                <span className="text-xs text-muted-foreground">vs cible ajustée</span>
                <div className={cn(
                  "font-mono text-sm font-semibold",
                  currentVo2max >= currentAmbitionRow.adjustedTarget 
                    ? "text-emerald-600" 
                    : "text-amber-600"
                )}>
                  {currentVo2max >= currentAmbitionRow.adjustedTarget ? "✓ Atteint" : `−${Math.round(currentAmbitionRow.adjustedTarget - currentVo2max)} ml/kg/min`}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Explication ajustement âge */}
        {hasAgeAdjustment && (
          <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <div className="flex items-start gap-2">
              <TrendingDown className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  Ajustement physiologique appliqué (−{reductionPercent}% VO₂max)
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ageAdjustmentLabel}. TTE et tolérance nutritionnelle sont également ajustés.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Onglets pour les différentes métriques */}
        <Tabs defaultValue="vo2max" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="vo2max" className="text-xs gap-1">
              <Activity className="w-3.5 h-3.5" />
              VO₂max
            </TabsTrigger>
            <TabsTrigger value="tte" className="text-xs gap-1">
              <Clock className="w-3.5 h-3.5" />
              TTE
            </TabsTrigger>
            <TabsTrigger value="nutrition" className="text-xs gap-1">
              <Utensils className="w-3.5 h-3.5" />
              Nutrition
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="vo2max" className="mt-4">
            <VO2maxTable 
              rows={vo2maxRows} 
              ambition={ambition} 
              currentVo2max={currentVo2max}
              hasAgeAdjustment={hasAgeAdjustment}
            />
          </TabsContent>
          
          <TabsContent value="tte" className="mt-4">
            <TTETable 
              rows={tteRows} 
              hasAgeAdjustment={hasAgeAdjustment}
              currentTTE={currentTTE}
            />
            <p className="text-xs text-muted-foreground mt-3">
              💡 TTE = Time to Exhaustion. Durée maximale à intensité seuil. Diminue avec l'âge en raison de la fatigue musculaire accrue.
            </p>
          </TabsContent>
          
          <TabsContent value="nutrition" className="mt-4">
            <NutritionTable 
              rows={nutritionRows} 
              hasAgeAdjustment={hasAgeAdjustment}
            />
            <p className="text-xs text-muted-foreground mt-3">
              🍌 La tolérance digestive diminue avec l'âge. Des apports glucidiques plus conservatifs réduisent le risque de troubles GI en course.
            </p>
          </TabsContent>
        </Tabs>

        {/* Note explicative */}
        <div className="p-3 bg-muted/30 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">
            {hasAgeAdjustment 
              ? `📉 À ${age} ans, les cibles sont ajustées pour tenir compte du déclin naturel des capacités physiologiques. Ces valeurs restent des objectifs ambitieux et réalistes.`
              : "📊 À moins de 30 ans, les cibles de référence s'appliquent sans ajustement. Elles sont basées sur des données physiologiques de population sportive."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
