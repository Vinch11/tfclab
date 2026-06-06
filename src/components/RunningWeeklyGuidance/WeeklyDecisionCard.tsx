/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * WEEKLY DECISION CARD — Carte Décision Hebdomadaire CAP
 * 
 * Affiche la décision de la semaine avec contraintes et actions suggérées.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  ArrowRight,
  Zap,
  Timer,
  TrendingUp,
  Shield,
  Lightbulb
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type RunningWeeklyDecision,
  type StrategyStatus,
  type ReadinessLevel,
  type RiskLevel,
  type WeeklyFocus,
} from "@/lib/v2/runningDoubleLoop";

interface WeeklyDecisionCardProps {
  decision: RunningWeeklyDecision;
  onViewSuggestions?: () => void;
  className?: string;
}

export function WeeklyDecisionCard({
  decision,
  onViewSuggestions,
  className,
}: WeeklyDecisionCardProps) {
  const strategyConfig = STRATEGY_CONFIG[decision.strategy_status] ?? STRATEGY_CONFIG.CONTINUE;
  const readinessConfig = READINESS_CONFIG[decision.readiness_week] ?? READINESS_CONFIG.MODERATE;
  const riskConfig = RISK_CONFIG[decision.risk_level] ?? RISK_CONFIG.LOW;
  const focusConfig = FOCUS_CONFIG[decision.weekly_focus] ?? FOCUS_CONFIG.ENDURANCE;
  const constraints = decision.constraints ?? {
    intensity_allowed: "LOW" as const,
    longrun_allowed: false,
    speedwork_allowed: false,
    max_key_sessions: 0,
  };
  
  return (
    <Card className={cn(
      "border-2",
      strategyConfig.borderColor,
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Timer className="h-5 w-5" />
            Décision Semaine
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {new Date(decision.week_start_date).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short"
            })}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Statut principal */}
        <div className={cn(
          "p-4 rounded-lg flex items-center gap-3",
          strategyConfig.bgColor
        )}>
          <div className={cn("p-2 rounded-full", strategyConfig.iconBg)}>
            {strategyConfig.icon}
          </div>
          <div className="flex-1">
            <p className={cn("font-bold text-lg", strategyConfig.textColor)}>
              {strategyConfig.label}
            </p>
            <p className="text-sm text-muted-foreground">
              Focus : {focusConfig.label}
            </p>
          </div>
        </div>
        
        {/* Indicateurs rapides */}
        <div className="grid grid-cols-2 gap-2">
          <div className={cn(
            "p-2 rounded-lg text-center",
            readinessConfig.bgColor
          )}>
            <p className="text-xs text-muted-foreground">Disponibilité</p>
            <p className={cn("font-semibold", readinessConfig.textColor)}>
              {readinessConfig.label}
            </p>
          </div>
          <div className={cn(
            "p-2 rounded-lg text-center",
            riskConfig.bgColor
          )}>
            <p className="text-xs text-muted-foreground">Risque</p>
            <p className={cn("font-semibold", riskConfig.textColor)}>
              {riskConfig.label}
            </p>
          </div>
        </div>
        
        <Separator />
        
        {/* Contraintes */}
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <Shield className="h-4 w-4" />
            Contraintes cette semaine
          </p>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <ConstraintItem
              label="Intensité"
              value={INTENSITY_LABELS[decision.constraints.intensity_allowed]}
              allowed={decision.constraints.intensity_allowed !== "LOW"}
            />
            <ConstraintItem
              label="Long run"
              value={decision.constraints.longrun_allowed ? "Autorisé" : "Non"}
              allowed={decision.constraints.longrun_allowed}
            />
            <ConstraintItem
              label="Speedwork"
              value={decision.constraints.speedwork_allowed ? "Autorisé" : "Non"}
              allowed={decision.constraints.speedwork_allowed}
            />
            <ConstraintItem
              label="Séances clés"
              value={`Max ${decision.constraints.max_key_sessions}`}
              allowed={decision.constraints.max_key_sessions > 0}
            />
          </div>
        </div>
        
        {/* Justification */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm">
            <span className="font-medium">Pourquoi : </span>
            {decision.why}
          </p>
        </div>
        
        {/* Garde-fous */}
        {decision.watchouts.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium flex items-center gap-1.5 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Garde-fous
            </p>
            <ul className="space-y-1">
              {decision.watchouts.map((w, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  {w}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Actions suggérées */}
        {decision.suggested_actions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-sm font-medium flex items-center gap-1.5 text-primary">
              <Lightbulb className="h-4 w-4" />
              Actions suggérées
            </p>
            <ul className="space-y-1">
              {decision.suggested_actions.map((a, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <ArrowRight className="h-3 w-3 mt-1 text-primary shrink-0" />
                  {a}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Lien levier */}
        <div className="p-2 bg-primary/5 rounded-lg text-sm">
          <p className="text-muted-foreground">
            {decision.aligned_with_lever ? "✅" : "🔄"} {decision.lever_this_week}
          </p>
        </div>
        
        {/* Fiabilité */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Fiabilité données</span>
          <Badge variant="outline" className="text-xs">
            {decision.confidence >= 0.75 ? "Élevée" : decision.confidence >= 0.5 ? "Modérée" : "Limitée"}
          </Badge>
        </div>
        
        {/* Bouton suggestions */}
        {onViewSuggestions && (
          <Button 
            variant="outline" 
            className="w-full"
            onClick={onViewSuggestions}
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Voir suggestions de semaine
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ConstraintItem({
  label,
  value,
  allowed,
}: {
  label: string;
  value: string;
  allowed: boolean;
}) {
  return (
    <div className={cn(
      "p-2 rounded text-center",
      allowed ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30"
    )}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn(
        "text-sm font-medium",
        allowed ? "text-emerald-600" : "text-red-600"
      )}>
        {value}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════════════════════

const STRATEGY_CONFIG: Record<StrategyStatus, {
  label: string;
  icon: React.ReactNode;
  bgColor: string;
  iconBg: string;
  textColor: string;
  borderColor: string;
}> = {
  CONTINUE: {
    label: "CONTINUER",
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    textColor: "text-emerald-700 dark:text-emerald-400",
    borderColor: "border-emerald-300 dark:border-emerald-700",
  },
  ADJUST: {
    label: "ADAPTER",
    icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    textColor: "text-amber-700 dark:text-amber-400",
    borderColor: "border-amber-300 dark:border-amber-700",
  },
  DELOAD: {
    label: "DÉCHARGER",
    icon: <XCircle className="h-5 w-5 text-red-600" />,
    bgColor: "bg-red-50 dark:bg-red-950/30",
    iconBg: "bg-red-100 dark:bg-red-900/50",
    textColor: "text-red-700 dark:text-red-400",
    borderColor: "border-red-300 dark:border-red-700",
  },
};

const READINESS_CONFIG: Record<ReadinessLevel, {
  label: string;
  bgColor: string;
  textColor: string;
}> = {
  GOOD: {
    label: "Bonne",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    textColor: "text-emerald-600",
  },
  MODERATE: {
    label: "Modérée",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    textColor: "text-amber-600",
  },
  LOW: {
    label: "Faible",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    textColor: "text-red-600",
  },
};

const RISK_CONFIG: Record<RiskLevel, {
  label: string;
  bgColor: string;
  textColor: string;
}> = {
  LOW: {
    label: "Faible",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    textColor: "text-emerald-600",
  },
  MODERATE: {
    label: "Modéré",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    textColor: "text-amber-600",
  },
  HIGH: {
    label: "Élevé",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    textColor: "text-red-600",
  },
};

const FOCUS_CONFIG: Record<WeeklyFocus, {
  label: string;
}> = {
  ENDURANCE: { label: "Endurance" },
  TTE: { label: "Durabilité (TTE)" },
  VO2: { label: "VO2max" },
  ECONOMY: { label: "Économie" },
  RECOVERY: { label: "Récupération" },
  RACE_SPECIFIC: { label: "Allure Spécifique" },
};

const INTENSITY_LABELS = {
  LOW: "Faible",
  MODERATE: "Modérée",
  HIGH: "Élevée",
};
