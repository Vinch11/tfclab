/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LORANG DECISION FLOW CHART – TFCL SIGNATURE™
 * Graphique signature "Limiter → Levier → Décision"
 * 
 * Visualisation horizontale en 3 blocs connectés:
 * 1. LIMITER - Diagnostic du limiteur physiologique dominant
 * 2. LEVIER - Actions physiologiques activées
 * 3. DÉCISION - Prescription d'entraînement concrète
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  Brain,
  CheckCircle2,
  XCircle,
  Zap,
  Target,
  TrendingUp,
  TrendingDown,
  Info,
  Calendar,
  Activity,
  Flame,
  Heart,
  Dumbbell,
  Timer,
  Ban,
} from "lucide-react";
import {
  computeLorangStrategy,
  type LorangStrategyInput,
  type LorangStrategyResult,
  type LorangLimiter,
  LIMITER_DEFINITIONS,
  LEVER_DEFINITIONS,
} from "@/engines/decision";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface LorangDecisionFlowChartProps {
  input: LorangStrategyInput;
  showStaffLevers?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIMITER CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const LIMITER_CONFIG: Record<LorangLimiter, {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  tooltip: string;
}> = {
  motor: {
    label: "VO2max insuffisante",
    icon: <Activity className="h-5 w-5" />,
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-300 dark:border-blue-700",
    tooltip: "Ce limiteur est prioritaire car le plafond aérobie freine la capacité à maintenir des intensités élevées sur la durée.",
  },
  glycolytic: {
    label: "VLamax trop élevée",
    icon: <Flame className="h-5 w-5" />,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
    tooltip: "Ce limiteur est prioritaire car une VLamax excessive épuise prématurément les réserves de glycogène sur les efforts longs.",
  },
  metabolic: {
    label: "Durabilité / FatMax faible",
    icon: <Timer className="h-5 w-5" />,
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-300 dark:border-amber-700",
    tooltip: "Ce limiteur est prioritaire car la capacité à maintenir l'intensité chute trop rapidement après 60-90 minutes.",
  },
  neuromuscular: {
    label: "Économie dégradée",
    icon: <Dumbbell className="h-5 w-5" />,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-300 dark:border-orange-700",
    tooltip: "Ce limiteur est prioritaire car le coût énergétique par watt ou km/h est trop élevé, réduisant l'efficacité globale.",
  },
  durability: {
    label: "TTE / Durabilité faible",
    icon: <Timer className="h-5 w-5" />,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-300 dark:border-purple-700",
    tooltip: "Ce limiteur est prioritaire car le TTE est insuffisant — la performance chute avant la fin de l'épreuve.",
  },
  availability: {
    label: "Disponibilité insuffisante",
    icon: <Heart className="h-5 w-5" />,
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-50 dark:bg-slate-950/30",
    borderColor: "border-slate-300 dark:border-slate-700",
    tooltip: "Ce limiteur est prioritaire car la fraîcheur physique et mentale est actuellement compromise. La récupération prime.",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// LEVER ICONS
// ═══════════════════════════════════════════════════════════════════════════════

const LEVER_ICONS: Record<string, React.ReactNode> = {
  force_max: <Dumbbell className="h-4 w-4" />,
  sfr_force_endurance: <Activity className="h-4 w-4" />,
  train_low: <AlertTriangle className="h-4 w-4" />,
  gut_training: <span>🍽️</span>,
  heat_training: <Flame className="h-4 w-4" />,
  hrv_adaptation: <Heart className="h-4 w-4" />,
};

const LEVER_COLORS: Record<string, string> = {
  force_max: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-300 dark:border-purple-700",
  sfr_force_endurance: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300 dark:border-blue-700",
  train_low: "bg-destructive/10 text-destructive border-destructive/30",
  gut_training: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300 dark:border-amber-700",
  heat_training: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-300 dark:border-rose-700",
  hrv_adaptation: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border-pink-300 dark:border-pink-700",
};

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE STYLING
// ═══════════════════════════════════════════════════════════════════════════════

function getConfidenceStyle(confidence: 'high' | 'moderate' | 'low') {
  switch (confidence) {
    case 'high':
      return {
        badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
        label: "Élevé",
      };
    case 'moderate':
      return {
        badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
        icon: <AlertTriangle className="h-3.5 w-3.5" />,
        label: "Modéré",
      };
    case 'low':
      return {
        badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
        icon: <XCircle className="h-3.5 w-3.5" />,
        label: "Faible",
      };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ARROW CONNECTOR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

function ArrowConnector() {
  return (
    <div className="flex items-center justify-center px-2 md:px-4">
      <div className="flex items-center gap-1">
        <div className="w-8 md:w-12 h-0.5 bg-gradient-to-r from-primary/40 to-primary" />
        <ArrowRight className="h-5 w-5 text-primary animate-pulse" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIMITER BLOCK COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface LimiterBlockProps {
  result: LorangStrategyResult;
  input: LorangStrategyInput;
}

function LimiterBlock({ result, input }: LimiterBlockProps) {
  const config = LIMITER_CONFIG[result.primaryLimiter] || LIMITER_CONFIG.motor;
  
  // Calculate deviation from target
  const getDeviation = () => {
    const { physiology } = input;
    switch (result.primaryLimiter) {
      case 'glycolytic':
        if (physiology.vlamax !== null && physiology.vlamaxTarget) {
          const diff = physiology.vlamax - physiology.vlamaxTarget;
          return diff > 0 ? `+${(diff * 100).toFixed(1)}%` : `${(diff * 100).toFixed(1)}%`;
        }
        break;
      case 'motor':
        if (physiology.vo2max !== null && physiology.vo2maxTarget) {
          const diff = physiology.vo2max - physiology.vo2maxTarget;
          return diff > 0 ? `+${diff.toFixed(0)} ml` : `${diff.toFixed(0)} ml`;
        }
        break;
      case 'metabolic':
        if (physiology.tte !== null && physiology.tteTarget) {
          const diff = physiology.tte - physiology.tteTarget;
          return diff > 0 ? `+${diff.toFixed(0)} min` : `${diff.toFixed(0)} min`;
        }
        break;
    }
    return null;
  };
  
  const deviation = getDeviation();
  const isOutOfTolerance = deviation && deviation.startsWith('-');
  
  return (
    <TooltipProvider>
      <div className={cn(
        "flex-1 min-w-[200px] p-4 rounded-xl border-2 transition-all duration-300",
        config.bgColor,
        config.borderColor,
        "hover:shadow-lg hover:scale-[1.02]"
      )}>
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className={cn("p-2 rounded-lg bg-background/50", config.color)}>
            {config.icon}
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Limiteur Dominant
            </p>
            <h3 className={cn("text-sm font-bold", config.color)}>
              {config.label}
            </h3>
          </div>
        </div>
        
        {/* Metrics */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Valeur estimée</span>
            <span className="font-mono font-medium">{result.limiterLabel}</span>
          </div>
          {deviation && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Écart vs cible</span>
              <span className={cn(
                "font-mono font-bold",
                isOutOfTolerance ? "text-destructive" : "text-green-600 dark:text-green-400"
              )}>
                {deviation}
                {isOutOfTolerance && (
                  <AlertTriangle className="h-3 w-3 inline ml-1" />
                )}
              </span>
            </div>
          )}
        </div>
        
        {/* Tooltip Trigger */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
              <Info className="h-3 w-3" />
              <span>Pourquoi ce limiteur ?</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[280px]">
            <p className="text-xs leading-relaxed">{config.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEVER BLOCK COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface LeverBlockProps {
  result: LorangStrategyResult;
  showStaffLevers: boolean;
}

function LeverBlock({ result, showStaffLevers }: LeverBlockProps) {
  const visibleLevers = showStaffLevers 
    ? result.activatedLevers.slice(0, 2)
    : result.activatedLevers.filter(l => !l.isStaffOnly).slice(0, 2);
  
  const prohibitedLevers = result.prohibitions.slice(0, 2);
  
  return (
    <TooltipProvider>
      <div className="flex-1 min-w-[200px] p-4 rounded-xl border-2 border-primary/30 bg-primary/5 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-lg bg-primary/20 text-primary">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Leviers TFCL Activés
            </p>
            <h3 className="text-sm font-bold text-primary">
              {visibleLevers.length} levier{visibleLevers.length > 1 ? 's' : ''} actif{visibleLevers.length > 1 ? 's' : ''}
            </h3>
          </div>
        </div>
        
        {/* Active Levers */}
        <div className="space-y-2 mb-3">
          {visibleLevers.map((lever) => {
            // Derive physiological target from lever type
            const physioTarget = lever.lever === 'sfr_force_endurance' ? '↓ VLamax'
              : lever.lever === 'force_max' ? '↑ Économie'
              : lever.lever === 'gut_training' ? '↑ Tolérance glucides'
              : lever.lever === 'heat_training' ? '↑ Acclimatation'
              : lever.lever === 'hrv_adaptation' ? '↑ Récupération'
              : lever.lever === 'train_low' ? '↑ FatMax'
              : '';
            
            return (
              <Tooltip key={lever.lever}>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "flex items-center gap-2 p-2 rounded-lg border cursor-help",
                    LEVER_COLORS[lever.lever] || "bg-muted"
                  )}>
                    {LEVER_ICONS[lever.lever]}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{lever.label}</p>
                      <p className="text-[10px] opacity-70 flex items-center gap-1">
                        {physioTarget.includes('↓') ? (
                          <TrendingDown className="h-3 w-3" />
                        ) : (
                          <TrendingUp className="h-3 w-3" />
                        )}
                        {physioTarget}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[9px] h-4 shrink-0">
                      P{lever.priority}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[280px]">
                  <p className="text-xs font-medium mb-1">{lever.reason}</p>
                  <ul className="text-[10px] space-y-0.5 opacity-80">
                    {lever.prescription.slice(0, 2).map((p, i) => (
                      <li key={i}>• {p}</li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        
        {/* Prohibited Levers */}
        {prohibitedLevers.length > 0 && (
          <div className="pt-2 border-t border-destructive/20">
            <p className="text-[10px] text-destructive font-medium mb-1.5 flex items-center gap-1">
              <Ban className="h-3 w-3" />
              Leviers interdits
            </p>
            <div className="space-y-1">
              {prohibitedLevers.map((p) => (
                <Tooltip key={p.prohibition}>
                  <TooltipTrigger asChild>
                    <p className="text-[10px] text-destructive/80 truncate cursor-help">
                      ❌ {p.label}
                    </p>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">{p.reason}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DECISION BLOCK COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface DecisionBlockProps {
  result: LorangStrategyResult;
}

function DecisionBlock({ result }: DecisionBlockProps) {
  const confidenceStyle = getConfidenceStyle(result.confidence);
  
  // Extract sessions from activated levers
  const sessionsAllowed = result.activatedLevers
    .flatMap(l => l.prescription.slice(0, 2))
    .slice(0, 4);
  
  const sessionsAvoided = result.prohibitions
    .map(p => p.label)
    .slice(0, 3);
  
  return (
    <div className="flex-1 min-w-[200px] p-4 rounded-xl border-2 border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/30 hover:shadow-lg hover:scale-[1.02] transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-green-200 dark:bg-green-900/50 text-green-700 dark:text-green-300">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Décision TFCL
            </p>
            <h3 className="text-sm font-bold text-green-700 dark:text-green-300">
              {result.templateSuggestion.weekLabel}
            </h3>
          </div>
        </div>
        <Badge className={cn("text-[9px] h-5", confidenceStyle.badge)}>
          {confidenceStyle.icon}
          <span className="ml-1">{confidenceStyle.label}</span>
        </Badge>
      </div>
      
      {/* Sessions */}
      <div className="space-y-2 mb-3">
        {/* Allowed */}
        <div>
          <p className="text-[10px] text-green-600 dark:text-green-400 font-medium mb-1 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Séances autorisées
          </p>
          <ul className="space-y-0.5">
            {sessionsAllowed.map((s, i) => (
              <li key={i} className="text-[10px] text-green-700 dark:text-green-300 flex items-start gap-1">
                <span className="mt-0.5">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* Avoided */}
        {sessionsAvoided.length > 0 && (
          <div>
            <p className="text-[10px] text-red-600 dark:text-red-400 font-medium mb-1 flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              À éviter
            </p>
            <ul className="space-y-0.5">
              {sessionsAvoided.map((s, i) => (
                <li key={i} className="text-[10px] text-red-600 dark:text-red-400 flex items-start gap-1">
                  <span className="mt-0.5">❌</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Intensity */}
      <div className="pt-2 border-t border-green-200 dark:border-green-800">
        <p className="text-[10px] text-muted-foreground">Intensité dominante</p>
        <p className="text-xs font-medium text-green-700 dark:text-green-300">
          {result.summary.mainAction}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LorangDecisionFlowChart({
  input,
  showStaffLevers = false,
  className,
}: LorangDecisionFlowChartProps) {
  const result = useMemo(() => computeLorangStrategy(input), [input]);
  
  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header */}
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span>Limiter → Levier → Décision</span>
              <Badge variant="outline" className="text-[9px] font-normal">
                TFCL Signature™
              </Badge>
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Visualisation de la logique décisionnelle physiologique Dan Lorang
            </p>
          </div>
          
          {/* Sprint Ban indicator */}
          {result.hasSprintBan && (
            <Badge variant="destructive" className="text-[9px] shrink-0">
              <Ban className="h-3 w-3 mr-1" />
              Sprint Ban ON
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-6 pb-4">
        {/* Flow Chart - 3 Blocks */}
        <div className="flex flex-col lg:flex-row items-stretch gap-2">
          {/* Block 1: Limiter */}
          <LimiterBlock result={result} input={input} />
          
          {/* Arrow 1 */}
          <div className="hidden lg:flex">
            <ArrowConnector />
          </div>
          <div className="flex lg:hidden items-center justify-center py-1">
            <ArrowRight className="h-5 w-5 text-primary rotate-90" />
          </div>
          
          {/* Block 2: Lever */}
          <LeverBlock result={result} showStaffLevers={showStaffLevers} />
          
          {/* Arrow 2 */}
          <div className="hidden lg:flex">
            <ArrowConnector />
          </div>
          <div className="flex lg:hidden items-center justify-center py-1">
            <ArrowRight className="h-5 w-5 text-primary rotate-90" />
          </div>
          
          {/* Block 3: Decision */}
          <DecisionBlock result={result} />
        </div>
        
        {/* Explanation Footer */}
        <div className="mt-6 pt-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground text-center leading-relaxed italic">
            "Cette décision n'est pas basée sur un chiffre isolé, mais sur la cohérence entre 
            le profil physiologique, la disponibilité actuelle et l'objectif sportif. 
            <span className="font-medium text-primary"> TFCL privilégie la robustesse décisionnelle à la précision absolue.</span>"
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default LorangDecisionFlowChart;
