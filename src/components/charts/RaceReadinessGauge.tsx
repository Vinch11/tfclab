/**
 * Race Readiness Gauge – Score pondéré par objectif
 * Jauge circulaire avec segments de contribution
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Info, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface RaceReadinessGaugeProps {
  score: number | null;
  details?: {
    vlamax: number;
    endurance: number;
    puissance: number;
    fraicheur: number;
  };
  confidence?: number;
  objectif: string;
  staffMode?: boolean;
  className?: string;
  messageStaff?: string;
}

const getScoreColor = (score: number): string => {
  if (score >= 80) return "hsl(var(--success))";
  if (score >= 60) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
};

const getScoreLabel = (score: number): string => {
  if (score >= 90) return "Race Ready!";
  if (score >= 80) return "Presque prêt";
  if (score >= 60) return "En progression";
  if (score >= 40) return "Travail en cours";
  return "Préparation requise";
};

export function RaceReadinessGauge({
  score,
  details,
  confidence = 0,
  objectif,
  staffMode = false,
  className,
  messageStaff
}: RaceReadinessGaugeProps) {
  const isDataMissing = score === null;
  const isLowConfidence = confidence < 0.4;
  
  const gaugeData = useMemo(() => {
    if (score === null) return { dashOffset: 283, color: "hsl(var(--muted))" };
    
    const circumference = 2 * Math.PI * 45; // radius = 45
    const offset = circumference - (score / 100) * circumference;
    
    return {
      dashOffset: offset,
      circumference,
      color: getScoreColor(score)
    };
  }, [score]);

  return (
    <Card className={cn("overflow-hidden", isDataMissing && "opacity-60", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-4 h-4" />
          <span>Race Readiness – {objectif}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isDataMissing ? (
          <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm text-center">Score non disponible</p>
            <p className="text-xs mt-1">Données insuffisantes pour l'évaluation</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {isLowConfidence && (
              <div className="mb-2 w-full p-2 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2">
                <Info className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                <p className="text-xs text-warning">
                  Confiance limitée ({Math.round(confidence * 100)}%)
                </p>
              </div>
            )}
            
            {/* Jauge circulaire */}
            <div className="relative w-32 h-32 sm:w-40 sm:h-40">
              <svg className="w-full h-full transform -rotate-90">
                {/* Fond */}
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="10"
                />
                {/* Progression */}
                <circle
                  cx="50%"
                  cy="50%"
                  r="45%"
                  fill="none"
                  stroke={gaugeData.color}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={gaugeData.circumference}
                  strokeDashoffset={gaugeData.dashOffset}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              
              {/* Score au centre */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span 
                  className="text-3xl sm:text-4xl font-bold font-mono"
                  style={{ color: gaugeData.color }}
                >
                  {score}
                </span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
            </div>
            
            {/* Label */}
            <p 
              className="mt-2 font-semibold text-sm"
              style={{ color: gaugeData.color }}
            >
              {getScoreLabel(score!)}
            </p>
            
            {/* Détails staff */}
            {staffMode && details && (
              <div className="mt-4 w-full space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Contribution par pilier:</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <SegmentBar label="VLamax" value={details.vlamax} max={25} />
                  <SegmentBar label="Endurance" value={details.endurance} max={25} />
                  <SegmentBar label="Puissance" value={details.puissance} max={25} />
                  <SegmentBar label="Fraîcheur" value={details.fraicheur} max={25} />
                </div>
              </div>
            )}
            
            {/* Message staff */}
            {staffMode && messageStaff && (
              <div className="mt-3 p-2 bg-muted/50 rounded-lg text-xs text-muted-foreground w-full">
                <p>{messageStaff}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Barre de segment pour les détails
function SegmentBar({ label, value, max }: { label: string; value: number; max: number }) {
  const percentage = (value / max) * 100;
  const color = percentage >= 70 ? "hsl(var(--success))" : percentage >= 40 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{value}/{max}</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${percentage}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}