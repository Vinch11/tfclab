/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RACE READINESS RUNNING CARD — TFCL Method™
 * 
 * Carte visuelle affichant le Race Readiness CAP avec :
 * - Jauge 0-100
 * - État couleur (RED / ORANGE / GREEN)
 * - Facteur limitant principal
 * - Implications pacing
 * - Badge confiance
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Activity,
  Lock,
  Info,
  TrendingUp
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type RaceReadinessRun,
  type ReadinessState,
  READINESS_STATE_INFO,
  LIMITING_FACTOR_INFO,
} from "@/lib/v2/raceReadinessRunning";

interface RaceReadinessRunCardProps {
  readiness: RaceReadinessRun | null;
  objective: string;
  isStaffMode?: boolean;
  className?: string;
}

export function RaceReadinessRunCard({
  readiness,
  objective,
  isStaffMode = false,
  className,
}: RaceReadinessRunCardProps) {
  const isDataMissing = !readiness;
  
  const gaugeData = useMemo(() => {
    if (!readiness) {
      return { dashOffset: 283, color: "hsl(var(--muted))" };
    }
    
    const circumference = 2 * Math.PI * 45;
    const offset = circumference - (readiness.readiness_score / 100) * circumference;
    const stateInfo = READINESS_STATE_INFO[readiness.readiness_state];
    
    return {
      dashOffset: offset,
      circumference,
      color: stateInfo.color,
    };
  }, [readiness]);

  const StateIcon = useMemo(() => {
    if (!readiness) return AlertTriangle;
    
    switch (readiness.readiness_state) {
      case "GREEN": return CheckCircle2;
      case "ORANGE": return AlertTriangle;
      case "RED": return XCircle;
      default: return Activity;
    }
  }, [readiness]);

  return (
    <Card className={cn("overflow-hidden", isDataMissing && "opacity-60", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <span>Race Readiness — {objective}</span>
          </div>
          {readiness && (
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                readiness.readiness_state === "GREEN" && "border-success text-success",
                readiness.readiness_state === "ORANGE" && "border-warning text-warning",
                readiness.readiness_state === "RED" && "border-destructive text-destructive"
              )}
            >
              {READINESS_STATE_INFO[readiness.readiness_state].emoji} {READINESS_STATE_INFO[readiness.readiness_state].label}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {isDataMissing ? (
          <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm text-center">Questionnaire non rempli</p>
            <p className="text-xs mt-1">Renseigne ta disponibilité pour obtenir ton Race Readiness</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Jauge circulaire + Score */}
            <div className="flex items-center justify-center gap-6">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32">
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
                    className="text-3xl font-bold font-mono"
                    style={{ color: gaugeData.color }}
                  >
                    {readiness.readiness_score}
                  </span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <StateIcon 
                    className="w-5 h-5" 
                    style={{ color: gaugeData.color }}
                  />
                  <span 
                    className="font-semibold"
                    style={{ color: gaugeData.color }}
                  >
                    {READINESS_STATE_INFO[readiness.readiness_state].description}
                  </span>
                </div>
                
                {/* Badge confiance */}
                <Badge variant="secondary" className="w-fit text-xs">
                  Confiance : {Math.round(readiness.confidence * 100)}%
                </Badge>
              </div>
            </div>
            
            <Separator />
            
            {/* Facteur limitant */}
            {readiness.limiting_factor !== "NONE" && (
              <div className="bg-muted/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">
                    {LIMITING_FACTOR_INFO[readiness.limiting_factor].emoji}
                  </span>
                  <span className="font-medium text-sm">
                    Facteur limitant : {LIMITING_FACTOR_INFO[readiness.limiting_factor].label}
                  </span>
                </div>
                {readiness.limiting_factor_detail && (
                  <p className="text-xs text-muted-foreground ml-7">
                    {readiness.limiting_factor_detail}
                  </p>
                )}
              </div>
            )}
            
            {/* Message athlète */}
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <p className="text-sm text-primary font-medium">
                {readiness.athlete_message}
              </p>
            </div>
            
            {/* Implications Pacing */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Implications Pacing
              </h4>
              
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Intensité max</span>
                  <p className="font-mono font-semibold">
                    {readiness.implications.intensity_cap}%
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <span className="text-muted-foreground">Discipline</span>
                  <p className="font-medium">
                    {readiness.implications.pacing_discipline === "STRICT" && "Stricte"}
                    {readiness.implications.pacing_discipline === "VERY_STRICT" && "Très stricte"}
                    {readiness.implications.pacing_discipline === "NORMAL" && "Normale"}
                  </p>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground italic">
                {readiness.implications.recommended_start_pace}
              </p>
            </div>
            
            {/* Profil verrouillé (mode staff) */}
            {isStaffMode && readiness.potential_locked && (
              <>
                <Separator />
                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Profil CAP verrouillé</p>
                    <p className="font-mono mt-1">{readiness.potential_reference}</p>
                  </div>
                </div>
              </>
            )}
            
            {/* Message coach (mode staff) */}
            {isStaffMode && (
              <div className="bg-muted/30 rounded-lg p-3 text-xs">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <p className="font-medium mb-1">Note coach</p>
                    <p className="text-muted-foreground">{readiness.coach_message}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Garde-fou scientifique */}
            <p className="text-[10px] text-muted-foreground text-center italic">
              TFCL distingue le potentiel physiologique de la capacité à l'exprimer le jour J.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
