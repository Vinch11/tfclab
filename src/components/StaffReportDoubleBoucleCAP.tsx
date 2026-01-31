/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SECTION DOUBLE BOUCLE CAP — Rapport Staff PDF
 * 
 * Affiche le profil physiologique CAP verrouillé + décision hebdomadaire
 * pour intégration dans le rapport Staff PDF.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Lock, 
  Timer, 
  Target, 
  Calendar, 
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Shield,
  Lightbulb,
  Activity,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type RunningPhysioProfile,
  type RunningWeeklyDecision,
  type StrategyStatus,
  type ReadinessLevel,
  type RiskLevel,
  type WeeklyFocus,
  getDaysUntilRecalibration,
  getWeeksUntilRecalibration,
  getProfileConfidence,
  LEVER_INFO,
  LEVER_BY_OBJECTIVE,
} from "@/lib/v2/runningDoubleLoop";

interface DoubleBoucleCAPSectionProps {
  profile: RunningPhysioProfile;
  decision?: RunningWeeklyDecision | null;
  compact?: boolean;
}

export function DoubleBoucleCAPSection({
  profile,
  decision,
  compact = false,
}: DoubleBoucleCAPSectionProps) {
  const daysLeft = getDaysUntilRecalibration(profile);
  const weeksLeft = getWeeksUntilRecalibration(profile);
  const confidence = getProfileConfidence(profile);
  const leverInfo = LEVER_INFO[profile.priority_lever];
  const objectiveConfig = LEVER_BY_OBJECTIVE[profile.objective_distance];
  
  const lockProgress = Math.max(0, Math.min(100, 
    ((profile.lock_duration_days - daysLeft) / profile.lock_duration_days) * 100
  ));
  const isExpiring = daysLeft <= 7;
  
  return (
    <>
      <Separator className="print:hidden" />
      
      <div className="print:break-inside-avoid space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <Activity className="h-4 w-4" />
          DOUBLE BOUCLE CAP — PROFIL VERROUILLÉ + DÉCISION HEBDOMADAIRE
          <Badge variant="outline" className="text-[10px]">TFCL Method™</Badge>
        </h3>
        
        <div className={cn(
          "grid gap-4",
          compact ? "grid-cols-1" : "md:grid-cols-2"
        )}>
          {/* === BOUCLE LENTE : PROFIL VERROUILLÉ === */}
          <div className="p-4 rounded-lg border-2 border-primary/40 bg-primary/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Boucle Lente (4-6 sem)</span>
              </div>
              <Badge 
                variant={isExpiring ? "outline" : "default"}
                className={cn(
                  "text-[10px]",
                  !isExpiring && "bg-primary/20 text-primary border-primary/30"
                )}
              >
                {weeksLeft} sem. restantes
              </Badge>
            </div>
            
            {/* Objectif */}
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-muted-foreground">Objectif CAP</span>
              <span className="font-bold text-primary">{profile.objective_distance}</span>
            </div>
            
            {/* Métriques physiologiques */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              <MetricBox
                label="VLamax CAP"
                value={profile.vlamax_run.value.toFixed(2)}
                unit="mmol/L/s"
                confidence={profile.vlamax_run.confidence}
                target={objectiveConfig.vlamax_tolerance.optimal}
                isGood={profile.vlamax_run.value <= objectiveConfig.vlamax_tolerance.optimal}
              />
              <MetricBox
                label="VO2max CAP"
                value={Math.round(profile.vo2max_run.value).toString()}
                unit="ml/kg/min"
                confidence={profile.vo2max_run.confidence}
              />
              <MetricBox
                label="Durabilité"
                value={Math.round(profile.durability_run.value).toString()}
                unit="min"
                confidence={profile.durability_run.confidence}
              />
            </div>
            
            {/* Levier du bloc */}
            <div className="p-2 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-lg">{leverInfo.emoji}</span>
                <div>
                  <p className="text-xs font-semibold text-primary">{leverInfo.label}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{profile.lever_rationale}</p>
                </div>
              </div>
            </div>
            
            {/* Progression et confiance */}
            <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Progression bloc : {Math.round(lockProgress)}%</span>
              <span>Confiance : {Math.round(confidence * 100)}%</span>
            </div>
            
            {/* Barre de progression simplifiée */}
            <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all" 
                style={{ width: `${lockProgress}%` }} 
              />
            </div>
          </div>
          
          {/* === BOUCLE RAPIDE : DÉCISION HEBDOMADAIRE === */}
          {decision ? (
            <WeeklyDecisionSection decision={decision} />
          ) : (
            <div className="p-4 rounded-lg border-2 border-muted bg-muted/30 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Timer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Décision hebdo non disponible</p>
                <p className="text-xs">Remplir le questionnaire de disponibilité</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Légende méthodologique */}
        <div className="p-3 bg-muted/30 rounded-lg border border-muted">
          <p className="text-[10px] text-muted-foreground">
            <strong>💡 Double Boucle TFCL™ :</strong> La boucle lente verrouille le profil physiologique 
            pendant 4-6 semaines (pas de recalibration permanente). La boucle rapide ajuste les décisions 
            hebdomadaires sans modifier les seuils physiologiques. 
            <em>"La physiologie évolue lentement, les décisions doivent être prises souvent."</em>
          </p>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANTS INTERNES
// ═══════════════════════════════════════════════════════════════════════════════

function MetricBox({
  label,
  value,
  unit,
  confidence,
  target,
  isGood,
}: {
  label: string;
  value: string;
  unit: string;
  confidence: number;
  target?: number;
  isGood?: boolean;
}) {
  return (
    <div className={cn(
      "p-2 rounded text-center",
      isGood === true ? "bg-emerald-50 dark:bg-emerald-950/30" :
      isGood === false ? "bg-amber-50 dark:bg-amber-950/30" :
      "bg-muted/50"
    )}>
      <p className="text-[10px] text-muted-foreground truncate">{label}</p>
      <p className="text-sm font-bold font-mono">{value}</p>
      <p className="text-[9px] text-muted-foreground">{unit}</p>
      {target !== undefined && (
        <p className="text-[9px] text-muted-foreground/70">cible ≤{target}</p>
      )}
    </div>
  );
}

function WeeklyDecisionSection({ decision }: { decision: RunningWeeklyDecision }) {
  const strategyConfig = STRATEGY_CONFIG[decision.strategy_status];
  const readinessConfig = READINESS_CONFIG[decision.readiness_week];
  const riskConfig = RISK_CONFIG[decision.risk_level];
  const focusConfig = FOCUS_CONFIG[decision.weekly_focus];
  
  return (
    <div className={cn(
      "p-4 rounded-lg border-2",
      strategyConfig.borderColor
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4" />
          <span className="text-sm font-semibold">Boucle Rapide (hebdo)</span>
        </div>
        <Badge variant="outline" className="text-[10px]">
          Sem. {new Date(decision.week_start_date).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short"
          })}
        </Badge>
      </div>
      
      {/* Statut principal */}
      <div className={cn(
        "p-3 rounded-lg flex items-center gap-3 mb-3",
        strategyConfig.bgColor
      )}>
        <div className={cn("p-1.5 rounded-full", strategyConfig.iconBg)}>
          {strategyConfig.icon}
        </div>
        <div>
          <p className={cn("font-bold", strategyConfig.textColor)}>
            {strategyConfig.label}
          </p>
          <p className="text-xs text-muted-foreground">
            Focus : {focusConfig.label}
          </p>
        </div>
      </div>
      
      {/* Indicateurs rapides */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className={cn("p-2 rounded text-center", readinessConfig.bgColor)}>
          <p className="text-[10px] text-muted-foreground">Disponibilité</p>
          <p className={cn("text-sm font-semibold", readinessConfig.textColor)}>
            {readinessConfig.label}
          </p>
        </div>
        <div className={cn("p-2 rounded text-center", riskConfig.bgColor)}>
          <p className="text-[10px] text-muted-foreground">Risque</p>
          <p className={cn("text-sm font-semibold", riskConfig.textColor)}>
            {riskConfig.label}
          </p>
        </div>
      </div>
      
      {/* Contraintes compactes */}
      <div className="grid grid-cols-4 gap-1 mb-3">
        <ConstraintBadge 
          label="Intensité" 
          value={INTENSITY_LABELS[decision.constraints.intensity_allowed]}
          ok={decision.constraints.intensity_allowed !== "LOW"}
        />
        <ConstraintBadge 
          label="Long run" 
          value={decision.constraints.longrun_allowed ? "✓" : "✗"}
          ok={decision.constraints.longrun_allowed}
        />
        <ConstraintBadge 
          label="Speed" 
          value={decision.constraints.speedwork_allowed ? "✓" : "✗"}
          ok={decision.constraints.speedwork_allowed}
        />
        <ConstraintBadge 
          label="Clés" 
          value={`${decision.constraints.max_key_sessions}`}
          ok={decision.constraints.max_key_sessions > 0}
        />
      </div>
      
      {/* Justification */}
      <div className="p-2 bg-muted/30 rounded text-[10px]">
        <span className="font-medium">Pourquoi : </span>
        <span className="text-muted-foreground">{decision.why}</span>
      </div>
      
      {/* Garde-fous (max 2 pour le PDF) */}
      {decision.watchouts.length > 0 && (
        <div className="mt-2 space-y-0.5">
          {decision.watchouts.slice(0, 2).map((w, i) => (
            <p key={i} className="text-[10px] text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {w}
            </p>
          ))}
        </div>
      )}
      
      {/* Lien levier */}
      <div className="mt-2 text-[10px] text-muted-foreground">
        {decision.aligned_with_lever ? "✅" : "🔄"} {decision.lever_this_week}
      </div>
      
      {/* Confiance */}
      <div className="mt-2 flex items-center justify-between text-[10px]">
        <span className="text-muted-foreground">Confiance décision</span>
        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
          {Math.round(decision.confidence * 100)}%
        </Badge>
      </div>
    </div>
  );
}

function ConstraintBadge({ 
  label, 
  value, 
  ok 
}: { 
  label: string; 
  value: string; 
  ok: boolean 
}) {
  return (
    <div className={cn(
      "p-1 rounded text-center",
      ok ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30"
    )}>
      <p className="text-[8px] text-muted-foreground">{label}</p>
      <p className={cn(
        "text-[10px] font-semibold",
        ok ? "text-emerald-600" : "text-red-600"
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
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
    textColor: "text-emerald-700 dark:text-emerald-400",
    borderColor: "border-emerald-300 dark:border-emerald-700",
  },
  ADJUST: {
    label: "ADAPTER",
    icon: <AlertTriangle className="h-4 w-4 text-amber-600" />,
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
    textColor: "text-amber-700 dark:text-amber-400",
    borderColor: "border-amber-300 dark:border-amber-700",
  },
  DELOAD: {
    label: "DÉCHARGER",
    icon: <XCircle className="h-4 w-4 text-red-600" />,
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

const FOCUS_CONFIG: Record<WeeklyFocus, { label: string }> = {
  ENDURANCE: { label: "Endurance" },
  TTE: { label: "Durabilité (TTE)" },
  VO2: { label: "VO2max" },
  ECONOMY: { label: "Économie" },
  RECOVERY: { label: "Récupération" },
  RACE_SPECIFIC: { label: "Allure Spécifique" },
};

const INTENSITY_LABELS = {
  LOW: "Faible",
  MODERATE: "Mod.",
  HIGH: "Haute",
};
