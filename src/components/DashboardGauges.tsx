// =============================================
// DASHBOARD GAUGES - Résumé visuel compact avec ScoreEnvelope
// =============================================

import { cn } from "@/lib/utils";
import { Zap, Activity, Target, TrendingUp } from "lucide-react";
import { ScoreEnvelopeCard } from "@/components/ScoreEnvelopeCard";
import { 
  ScoreEnvelope, 
  buildVLamaxEnvelope, 
  buildTTEEnvelope, 
  buildPotentielEnvelope 
} from "@/lib/scoreEnvelope";
import { type VLamaxEffectif, toVLamaxEnvelope, type TTEEffectif, toTTEEnvelope } from "@/engines/diagnostic";

interface GaugeProps {
  value: number;
  max: number;
  label: string;
  displayValue: string;
  unit?: string;
  icon: React.ReactNode;
  color: "primary" | "accent" | "success" | "warning" | "destructive";
  sublabel?: string;
  inverted?: boolean;
}

function CircularGauge({ 
  value, 
  max, 
  label, 
  displayValue, 
  unit, 
  icon, 
  color, 
  sublabel,
  inverted = false 
}: GaugeProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const circumference = 2 * Math.PI * 36; // radius = 36
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colorClasses = {
    primary: { stroke: "stroke-primary", text: "text-primary", bg: "bg-primary/10" },
    accent: { stroke: "stroke-accent", text: "text-accent", bg: "bg-accent/10" },
    success: { stroke: "stroke-emerald-500", text: "text-emerald-500", bg: "bg-emerald-500/10" },
    warning: { stroke: "stroke-amber-500", text: "text-amber-500", bg: "bg-amber-500/10" },
    destructive: { stroke: "stroke-red-500", text: "text-red-500", bg: "bg-red-500/10" },
  };

  // Détermine la couleur automatiquement selon le ratio
  const getAutoColor = () => {
    const ratio = inverted ? 1 - (value / max) : value / max;
    if (ratio >= 0.75) return "success";
    if (ratio >= 0.5) return "warning";
    if (ratio >= 0.25) return "warning";
    return "destructive";
  };

  const effectiveColor = color === "primary" && value > 0 ? getAutoColor() : color;
  const colors = colorClasses[effectiveColor];

  return (
    <div className="flex flex-col items-center p-3 sm:p-4 glass-card hover:border-primary/30 transition-all duration-300 group min-w-0">
      <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24">
        {/* Background circle */}
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-muted/20"
          />
          {/* Progress circle */}
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            strokeWidth="6"
            strokeLinecap="round"
            className={cn(colors.stroke, "transition-all duration-700 ease-out")}
            style={{
              strokeDasharray: circumference,
              strokeDashoffset: value > 0 ? strokeDashoffset : circumference,
            }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className={cn("p-1 sm:p-1.5 rounded-full mb-0.5", colors.bg)}>
            {icon}
          </div>
          <span className={cn("text-sm sm:text-base md:text-lg font-bold font-mono", colors.text)}>
            {displayValue}
          </span>
          {unit && (
            <span className="text-[8px] sm:text-[10px] text-muted-foreground">{unit}</span>
          )}
        </div>
      </div>
      <span className="mt-1.5 sm:mt-2 text-xs sm:text-sm font-medium text-center truncate w-full">{label}</span>
      {sublabel && (
        <span className="text-[9px] sm:text-[10px] text-muted-foreground text-center mt-0.5 max-w-full truncate">
          {sublabel}
        </span>
      )}
    </div>
  );
}

interface HorizontalGaugeProps {
  value: number;
  max: number;
  label: string;
  displayValue: string;
  unit?: string;
  color: "primary" | "accent" | "success" | "warning" | "destructive";
  sublabel?: string;
  inverted?: boolean;
}

function HorizontalGauge({
  value,
  max,
  label,
  displayValue,
  unit,
  color,
  sublabel,
  inverted = false,
}: HorizontalGaugeProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  const colorClasses = {
    primary: { bar: "bg-primary", text: "text-primary", bg: "bg-primary/20" },
    accent: { bar: "bg-accent", text: "text-accent", bg: "bg-accent/20" },
    success: { bar: "bg-emerald-500", text: "text-emerald-500", bg: "bg-emerald-500/20" },
    warning: { bar: "bg-amber-500", text: "text-amber-500", bg: "bg-amber-500/20" },
    destructive: { bar: "bg-red-500", text: "text-red-500", bg: "bg-red-500/20" },
  };

  const getAutoColor = () => {
    const ratio = inverted ? 1 - (value / max) : value / max;
    if (ratio >= 0.75) return "success";
    if (ratio >= 0.5) return "warning";
    if (ratio >= 0.25) return "warning";
    return "destructive";
  };

  const effectiveColor = color === "primary" && value > 0 ? getAutoColor() : color;
  const colors = colorClasses[effectiveColor];

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className={cn("font-mono font-bold text-sm", colors.text)}>
            {displayValue}
          </span>
          {unit && <span className="text-xs text-muted-foreground">{unit}</span>}
        </div>
      </div>
      <div className={cn("h-2.5 rounded-full overflow-hidden", colors.bg)}>
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", colors.bar)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {sublabel && (
        <span className="text-[10px] text-muted-foreground">{sublabel}</span>
      )}
    </div>
  );
}

// =============================================
// TYPES POUR LES DEUX MODES D'UTILISATION
// =============================================

// Mode legacy: données brutes (rétrocompatibilité)
interface DashboardGaugesLegacyProps {
  vlamax: { value: number | null; label: string; confidence: number };
  tte: { tte_min: number | null; confidence: number };
  potentielPhysiologique: { score: number; label: string; confidence: number };
  ftp?: number | null;
  ftpKg?: number | null;
  vo2max?: number | null;
  objectif?: string;
}

// Mode ScoreEnvelope: données enrichies
interface DashboardGaugesEnvelopeProps {
  vlamaxEnvelope: ScoreEnvelope;
  tteEnvelope: ScoreEnvelope;
  potentielPhysiologiqueEnvelope: ScoreEnvelope;
  ftp?: number | null;
  ftpKg?: number | null;
  vo2max?: number | null;
  mode?: "athlete" | "staff";
}

// Union type pour supporter les deux modes
type DashboardGaugesProps = DashboardGaugesLegacyProps | DashboardGaugesEnvelopeProps;

// Type guard pour identifier le mode
function isEnvelopeMode(props: DashboardGaugesProps): props is DashboardGaugesEnvelopeProps {
  return 'vlamaxEnvelope' in props;
}

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

export function DashboardGauges(props: DashboardGaugesProps) {
  // Mode avec ScoreEnvelope (nouveau)
  if (isEnvelopeMode(props)) {
    const { vlamaxEnvelope, tteEnvelope, potentielPhysiologiqueEnvelope, ftp, ftpKg, vo2max, mode = "athlete" } = props;
    
    return (
      <div className="glass-card p-3 sm:p-5 md:p-6">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Métriques Clés
          </h3>
        </div>
        
        {/* Cartes ScoreEnvelope unifiées — always 3 cols */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3 sm:mb-6">
          <ScoreEnvelopeCard 
            envelope={vlamaxEnvelope} 
            mode={mode} 
            showHelp={true}
            compact={false}
          />
          <ScoreEnvelopeCard 
            envelope={tteEnvelope} 
            mode={mode} 
            showHelp={true}
            compact={false}
          />
          <ScoreEnvelopeCard 
            envelope={potentielPhysiologiqueEnvelope} 
            mode={mode} 
            showHelp={true}
            compact={false}
          />
        </div>

        {/* Métriques secondaires */}
        <div className="space-y-2 sm:space-y-3 border-t border-border/50 pt-3 sm:pt-4">
          {ftp !== null && ftp !== undefined && ftp > 0 && (
            <HorizontalGauge
              value={ftp}
              max={400}
              label="FTP"
              displayValue={ftp.toString()}
              unit={ftpKg ? `W (${ftpKg.toFixed(1)} W/kg)` : "W"}
              color="accent"
            />
          )}
          
          {vo2max !== null && vo2max !== undefined && vo2max > 0 && (
            <HorizontalGauge
              value={vo2max}
              max={80}
              label="VO2max"
              displayValue={Math.round(vo2max).toString()}
              unit="ml/kg/min"
              color={vo2max >= 55 ? "success" : vo2max >= 45 ? "warning" : "destructive"}
            />
          )}

          {/* Sources compactes */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-2">
            <div className="text-center min-w-0">
              <span className="text-[8px] sm:text-[9px] text-muted-foreground truncate block">
                VLamax: {vlamaxEnvelope.source === "MEASURED" ? "🧪" : vlamaxEnvelope.source === "ESTIMATED" ? "🏃" : "📐"} {vlamaxEnvelope.source === "MEASURED" ? "Labo" : vlamaxEnvelope.source === "ESTIMATED" ? "Terrain" : "Estim."}
              </span>
            </div>
            <div className="text-center min-w-0">
              <span className="text-[8px] sm:text-[9px] text-muted-foreground truncate block">
                TTE: {tteEnvelope.source === "MEASURED" ? "📋" : "📐"} {tteEnvelope.source === "MEASURED" ? "Observé" : "Estim."}
              </span>
            </div>
            <div className="text-center min-w-0">
              <span className="text-[8px] sm:text-[9px] text-muted-foreground truncate block">
                Readiness: {potentielPhysiologiqueEnvelope.source === "MEASURED" ? "📋" : "📐"} {potentielPhysiologiqueEnvelope.source === "MEASURED" ? "Observé" : "Modèle"}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mode legacy (rétrocompatibilité)
  const { vlamax, tte, potentielPhysiologique, ftp, ftpKg, vo2max, objectif = "IM" } = props;
  
  const vlamaxVal = vlamax.value ?? 0;
  const tteVal = tte.tte_min ?? 0;
  const rrScore = potentielPhysiologique.score;

  // Determine colors based on values
  const getVlamaxColor = (): "success" | "warning" | "destructive" => {
    if (vlamaxVal <= 0.35) return "success";
    if (vlamaxVal <= 0.5) return "warning";
    return "destructive";
  };

  const getTteColor = (): "success" | "warning" | "destructive" => {
    if (tteVal >= 45) return "success";
    if (tteVal >= 30) return "warning";
    return "destructive";
  };

  const getRrColor = (): "success" | "warning" | "destructive" => {
    if (rrScore >= 75) return "success";
    if (rrScore >= 50) return "warning";
    return "destructive";
  };

  return (
    <div className="glass-card p-3 sm:p-5 md:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-xs sm:text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Métriques Clés
        </h3>
      </div>
      
      {/* Circular gauges grid - responsive */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
        <CircularGauge
          value={vlamaxVal}
          max={1}
          label="VLamax"
          displayValue={vlamaxVal > 0 ? vlamaxVal.toFixed(2) : "—"}
          unit="mmol/L/s"
          icon={<Zap className={cn("w-3 h-3 sm:w-4 sm:h-4", vlamaxVal > 0 ? "text-current" : "text-muted-foreground")} />}
          color={vlamaxVal > 0 ? getVlamaxColor() : "primary"}
          sublabel={vlamax.label}
          inverted={true}
        />
        
        <CircularGauge
          value={tteVal}
          max={60}
          label="TTE"
          displayValue={tteVal > 0 ? Math.round(tteVal).toString() : "—"}
          unit="min"
          icon={<Activity className={cn("w-3 h-3 sm:w-4 sm:h-4", tteVal > 0 ? "text-current" : "text-muted-foreground")} />}
          color={tteVal > 0 ? getTteColor() : "primary"}
          sublabel="Endurance seuil"
        />
        
        <CircularGauge
          value={rrScore}
          max={100}
          label="Readiness"
          displayValue={rrScore.toString()}
          unit="%"
          icon={<Target className={cn("w-3 h-3 sm:w-4 sm:h-4", rrScore > 0 ? "text-current" : "text-muted-foreground")} />}
          color={getRrColor()}
          sublabel={potentielPhysiologique.label}
        />
      </div>

      {/* Horizontal bars for secondary metrics */}
      <div className="space-y-2 sm:space-y-3 border-t border-border/50 pt-3 sm:pt-4">
        {ftp !== null && ftp !== undefined && ftp > 0 && (
          <HorizontalGauge
            value={ftp}
            max={400}
            label="FTP"
            displayValue={ftp.toString()}
            unit={ftpKg ? `W (${ftpKg.toFixed(1)} W/kg)` : "W"}
            color="accent"
          />
        )}
        
        {vo2max !== null && vo2max !== undefined && vo2max > 0 && (
          <HorizontalGauge
            value={vo2max}
            max={80}
            label="VO2max"
            displayValue={Math.round(vo2max).toString()}
            unit="ml/kg/min"
            color={vo2max >= 55 ? "success" : vo2max >= 45 ? "warning" : "destructive"}
          />
        )}

        {/* Sources compactes */}
        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-2">
          <div className="text-center min-w-0">
            <span className="text-[8px] sm:text-[9px] text-muted-foreground truncate block">
              VLamax: {vlamax.label || "📐 Estim."}
            </span>
          </div>
          <div className="text-center min-w-0">
            <span className="text-[8px] sm:text-[9px] text-muted-foreground truncate block">
              TTE: {tte.tte_min ? "📋 Calculé" : "📐 Estim."}
            </span>
          </div>
          <div className="text-center min-w-0">
            <span className="text-[8px] sm:text-[9px] text-muted-foreground truncate block">
              Readiness: 📐 Modèle
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
