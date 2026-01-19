import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Zap,
  Fuel,
  Scale,
  Flame,
  Timer,
  AlertTriangle,
  CheckCircle2,
  Info,
  TrendingDown,
  Calendar,
} from "lucide-react";
import {
  calculateAge,
  computeAgeAdjustmentIndex,
  getAgeAdjustedVLamaxProfil,
  getAgeAdjustedVLamaxThresholds,
  getVLamaxAgeStatus,
  type VLamaxProfil,
} from "@/lib/ageAdjustment";

// ============================================
// TYPES
// ============================================

export type Sport = "bike" | "run";

export interface VLamaxInterpretationPanelProps {
  /** VLamax value (mmol/L/s) */
  vlamax: number | null;
  /** Birth date for age calculation */
  birthDate?: string | Date | null;
  /** Age override (if birthDate not available) */
  age?: number | null;
  /** Sport context: bike or run */
  sport?: Sport;
  /** Objective type for interpretation */
  objectif?: string;
  /** Target VLamax range [min, max] */
  targetRange?: [number, number];
  /** Show compact version */
  compact?: boolean;
  /** Show age context badge */
  showAgeContext?: boolean;
  /** Show actions/recommendations */
  showActions?: boolean;
  /** Additional className */
  className?: string;
}

// ============================================
// PROFILE CONFIGURATION
// ============================================

interface ProfileConfig {
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  progressColor: string;
  label: string;
  description: string;
  descriptionRun: string;
  descriptionBike: string;
}

const PROFILE_CONFIG: Record<VLamaxProfil, ProfileConfig> = {
  diesel: {
    icon: Fuel,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    progressColor: "bg-blue-500",
    label: "Diesel Ultra-Endurant",
    description: "Profil très économe, optimisé pour les efforts très longs.",
    descriptionRun: "Excellent potentiel marathon/ultra. Capacité glycolytique très faible, favorise l'oxydation des graisses.",
    descriptionBike: "Idéal Ironman/ultra-cyclisme. Très faible production lactate, excellente endurance lipidique.",
  },
  endurant: {
    icon: Timer,
    color: "text-cyan-600 dark:text-cyan-400",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    borderColor: "border-cyan-200 dark:border-cyan-800",
    progressColor: "bg-cyan-500",
    label: "Endurant",
    description: "Profil économe adapté aux efforts longs.",
    descriptionRun: "Très bon potentiel semi-marathon/marathon. Bonne économie de course.",
    descriptionBike: "Adapté 70.3 et Ironman. Bonne capacité à soutenir FTP longtemps.",
  },
  equilibre: {
    icon: Scale,
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    borderColor: "border-green-200 dark:border-green-800",
    progressColor: "bg-green-500",
    label: "Équilibré",
    description: "Polyvalence métabolique, gestion des efforts variés.",
    descriptionRun: "Polyvalent du 10 km au marathon. Bonne gestion des changements de rythme.",
    descriptionBike: "Polyvalent sur toutes distances. Équilibre entre puissance et endurance.",
  },
  explosif: {
    icon: Flame,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    borderColor: "border-orange-200 dark:border-orange-800",
    progressColor: "bg-orange-500",
    label: "Explosif",
    description: "Forte capacité anaérobie, avantage sur efforts courts.",
    descriptionRun: "Avantage sprints et changements de rythme. Attention sur marathon.",
    descriptionBike: "Forte puissance courte durée. Travail endurance recommandé pour longue distance.",
  },
  sprinter: {
    icon: Zap,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-200 dark:border-red-800",
    progressColor: "bg-red-500",
    label: "Sprinter",
    description: "Profil très glycolytique, optimisé pour efforts courts.",
    descriptionRun: "Profil sprint/800m. Réorientation nécessaire pour marathon/trail.",
    descriptionBike: "Profil piste/sprint. Transformation majeure requise pour Ironman.",
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getVLamaxProgressValue(vlamax: number): number {
  // Map VLamax 0.2-0.9 to 0-100
  return Math.min(100, Math.max(0, ((vlamax - 0.2) / 0.7) * 100));
}

function getStatusIcon(status: "optimal" | "acceptable" | "work_needed") {
  switch (status) {
    case "optimal":
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "acceptable":
      return <Info className="w-4 h-4 text-yellow-500" />;
    case "work_needed":
      return <AlertTriangle className="w-4 h-4 text-orange-500" />;
  }
}

function getStatusBadgeVariant(status: "optimal" | "acceptable" | "work_needed") {
  switch (status) {
    case "optimal":
      return "default" as const;
    case "acceptable":
      return "secondary" as const;
    case "work_needed":
      return "destructive" as const;
  }
}

// ============================================
// COMPONENT
// ============================================

export function VLamaxInterpretationPanel({
  vlamax,
  birthDate,
  age: ageOverride,
  sport = "bike",
  objectif = "",
  targetRange,
  compact = false,
  showAgeContext = true,
  showActions = true,
  className,
}: VLamaxInterpretationPanelProps) {
  // Calculate age
  const age = useMemo(() => {
    if (ageOverride !== undefined) return ageOverride;
    if (birthDate) return calculateAge(birthDate);
    return null;
  }, [birthDate, ageOverride]);

  // Get age-adjusted profile
  const { profil, label, ageContext } = useMemo(
    () => getAgeAdjustedVLamaxProfil(vlamax, age),
    [vlamax, age]
  );

  // Get age status (for objective-based interpretation)
  const ageStatus = useMemo(
    () => getVLamaxAgeStatus(vlamax, age, objectif),
    [vlamax, age, objectif]
  );

  // Get age adjustment index
  const ageIndex = useMemo(() => computeAgeAdjustmentIndex(age), [age]);

  // Get thresholds
  const thresholds = useMemo(
    () => getAgeAdjustedVLamaxThresholds(age),
    [age]
  );

  // Get profile config
  const config = PROFILE_CONFIG[profil];
  const Icon = config.icon;

  // No VLamax
  if (vlamax === null || vlamax === undefined) {
    return (
      <div className={cn("p-4 rounded-lg border border-dashed border-muted-foreground/30", className)}>
        <p className="text-sm text-muted-foreground text-center">
          VLamax non disponible
        </p>
      </div>
    );
  }

  // COMPACT VERSION
  if (compact) {
    return (
      <TooltipProvider>
        <div className={cn("flex items-center gap-3", className)}>
          {/* Icon + Value */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", config.bgColor, config.borderColor, "border")}>
                <Icon className={cn("w-4 h-4", config.color)} />
                <span className={cn("font-semibold", config.color)}>
                  {vlamax.toFixed(2)}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {sport === "run" ? config.descriptionRun : config.descriptionBike}
              </p>
              {ageContext && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  {ageContext}
                </p>
              )}
            </TooltipContent>
          </Tooltip>

          {/* Profile badge */}
          <Badge variant="outline" className={cn(config.color, config.borderColor)}>
            {label}
          </Badge>

          {/* Age context badge */}
          {showAgeContext && age !== null && age >= 40 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {ageIndex.label}
            </Badge>
          )}

          {/* Status indicator */}
          {objectif && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  {getStatusIcon(ageStatus.status)}
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-sm">{ageStatus.message}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>
    );
  }

  // FULL VERSION
  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Panel */}
      <div className={cn(
        "p-4 rounded-xl border-2",
        config.bgColor,
        config.borderColor
      )}>
        <div className="flex items-start justify-between gap-4">
          {/* Left: Icon + Value */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-3 rounded-xl",
              config.bgColor,
              "border",
              config.borderColor
            )}>
              <Icon className={cn("w-6 h-6", config.color)} />
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className={cn("text-2xl font-bold", config.color)}>
                  {vlamax.toFixed(2)}
                </span>
                <span className="text-sm text-muted-foreground">mmol/L/s</span>
              </div>
              <p className={cn("text-sm font-medium", config.color)}>{label}</p>
            </div>
          </div>

          {/* Right: Badges */}
          <div className="flex flex-col items-end gap-2">
            {showAgeContext && age !== null && age >= 40 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {ageIndex.label}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="text-sm">
                      Les seuils de profil sont ajustés pour tenir compte de l'âge.
                      Un VLamax de {vlamax.toFixed(2)} à {age} ans a un impact métabolique 
                      différent qu'à 25 ans.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {objectif && (
              <Badge variant={getStatusBadgeVariant(ageStatus.status)}>
                {ageStatus.status === "optimal" ? "Optimal" : 
                 ageStatus.status === "acceptable" ? "Acceptable" : "À travailler"}
              </Badge>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Diesel ({thresholds.diesel.toFixed(2)})</span>
            <span>Équilibré ({thresholds.equilibre.toFixed(2)})</span>
            <span>Sprinter ({thresholds.explosif.toFixed(2)}+)</span>
          </div>
          <div className="relative">
            <Progress 
              value={getVLamaxProgressValue(vlamax)} 
              className="h-3"
            />
            {/* Current value marker */}
            <div 
              className="absolute top-0 w-1 h-3 bg-foreground rounded"
              style={{ 
                left: `${getVLamaxProgressValue(vlamax)}%`,
                transform: "translateX(-50%)"
              }}
            />
          </div>
        </div>

        {/* Description */}
        <p className="mt-3 text-sm text-muted-foreground">
          {sport === "run" ? config.descriptionRun : config.descriptionBike}
        </p>

        {/* Age context message */}
        {ageContext && (
          <p className="mt-2 text-xs text-muted-foreground italic flex items-center gap-1">
            <Info className="w-3 h-3" />
            {ageContext}
          </p>
        )}
      </div>

      {/* Status Alert (if objective provided) */}
      {objectif && ageStatus.message && (
        <Alert className={cn(
          ageStatus.status === "optimal" 
            ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
            : ageStatus.status === "acceptable"
            ? "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30"
            : "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30"
        )}>
          {getStatusIcon(ageStatus.status)}
          <AlertTitle className="text-sm">{ageStatus.message}</AlertTitle>
          {ageStatus.ageImpact && (
            <AlertDescription className="text-xs mt-1">
              {ageStatus.ageImpact}
            </AlertDescription>
          )}
        </Alert>
      )}

      {/* Actions/Recommendations */}
      {showActions && ageStatus.actions && ageStatus.actions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <TrendingDown className="w-3 h-3" />
            Actions recommandées
          </p>
          <ul className="space-y-1">
            {ageStatus.actions.map((action, idx) => (
              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-primary">•</span>
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Target Range (if provided) */}
      {targetRange && (
        <div className="p-3 rounded-lg bg-muted/50 border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Cible VLamax</span>
            <span className="font-medium">
              {targetRange[0].toFixed(2)} – {targetRange[1].toFixed(2)} mmol/L/s
            </span>
          </div>
          {vlamax < targetRange[0] && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              ✓ En dessous de la cible (optimal pour endurance)
            </p>
          )}
          {vlamax >= targetRange[0] && vlamax <= targetRange[1] && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              ✓ Dans la plage cible
            </p>
          )}
          {vlamax > targetRange[1] && (
            <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
              ⚠ Au-dessus de la cible — travail d'abaissement recommandé
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default VLamaxInterpretationPanel;
