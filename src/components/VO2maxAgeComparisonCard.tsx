/**
 * VO2maxAgeComparisonCard - Comparatif des cibles VO₂max avec/sans ajustement d'âge
 * Affiche les cibles par niveau d'ambition avec et sans facteur d'âge
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Calendar, TrendingDown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  getVo2maxTarget, 
  getVo2maxAgeFactor, 
  getVo2maxAgeAdjustmentLabel 
} from "@/lib/v2/unifiedLimiterDetection";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { normalizeObjective } from "@/lib/physiologicalTargets";

// =============================================
// TYPES
// =============================================

interface VO2maxAgeComparisonCardProps {
  objectif: string;
  age: number | null;
  currentVo2max?: number | null;
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
// MAIN COMPONENT
// =============================================

export function VO2maxAgeComparisonCard({
  objectif,
  age,
  currentVo2max,
  ambition = "age_group",
  className,
  compact = false,
}: VO2maxAgeComparisonCardProps) {
  const rows = buildAmbitionRows(objectif, age);
  const ageFactor = getVo2maxAgeFactor(age);
  const ageAdjustmentLabel = getVo2maxAgeAdjustmentLabel(age);
  const hasAgeAdjustment = age !== null && age >= 30;
  const reductionPercent = hasAgeAdjustment ? Math.round((1 - ageFactor) * 100) : 0;

  // Trouver la ligne correspondant à l'ambition actuelle
  const currentAmbitionRow = rows.find((r) => r.key === ambition);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className={cn("pb-2", compact && "py-3")}>
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="w-5 h-5 text-primary" />
          Cibles VO₂max — Comparatif âge
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Le VO₂max décline naturellement avec l'âge (~7-10% par décennie après 30 ans).
                  Les cibles sont ajustées pour rester réalistes et motivantes.
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
              {age} ans (−{reductionPercent}%)
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
        {/* Valeur actuelle */}
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
                  Ajustement physiologique appliqué
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {ageAdjustmentLabel}. Le déclin naturel du VO₂max est compensé pour maintenir des objectifs réalistes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tableau comparatif */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 font-medium text-muted-foreground">Ambition</th>
                <th className="text-center py-2 font-medium text-muted-foreground">
                  <span className="flex items-center justify-center gap-1">
                    Cible &lt;30 ans
                  </span>
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
                      {hasAgeAdjustment ? (
                        <span className="font-mono text-xs text-amber-600 dark:text-amber-400">
                          {row.difference > 0 ? "+" : ""}{row.difference.toFixed(1)}
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

        {/* Note explicative */}
        <div className="p-3 bg-muted/30 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">
            {hasAgeAdjustment 
              ? `📉 Les cibles sont réduites de ${reductionPercent}% pour tenir compte du déclin naturel du VO₂max avec l'âge. Ces valeurs restent des objectifs ambitieux et réalistes pour votre tranche d'âge.`
              : "📊 À moins de 30 ans, les cibles VO₂max de référence s'appliquent sans ajustement. Elles sont basées sur des données physiologiques de population sportive."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
