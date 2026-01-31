/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LOCKED PROFILE CARD — Carte Profil CAP Verrouillé
 * 
 * Affiche le profil physiologique CAP verrouillé pour 4-6 semaines.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Lock, Calendar, Target, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type RunningPhysioProfile,
  getDaysUntilRecalibration,
  getWeeksUntilRecalibration,
  getProfileConfidence,
  LEVER_INFO,
  LEVER_BY_OBJECTIVE,
} from "@/lib/v2/runningDoubleLoop";

interface LockedProfileCardProps {
  profile: RunningPhysioProfile;
  onRequestRecalibration?: () => void;
  className?: string;
}

export function LockedProfileCard({
  profile,
  onRequestRecalibration,
  className,
}: LockedProfileCardProps) {
  const daysLeft = getDaysUntilRecalibration(profile);
  const weeksLeft = getWeeksUntilRecalibration(profile);
  const confidence = getProfileConfidence(profile);
  const leverInfo = LEVER_INFO[profile.priority_lever];
  const objectiveConfig = LEVER_BY_OBJECTIVE[profile.objective_distance];
  
  // Progression du verrouillage
  const lockProgress = Math.max(0, Math.min(100, 
    ((profile.lock_duration_days - daysLeft) / profile.lock_duration_days) * 100
  ));
  
  const isExpiring = daysLeft <= 7;
  const isExpired = daysLeft === 0;
  
  return (
    <Card className={cn(
      "border-2",
      profile.locked ? "border-primary/40 bg-primary/5" : "border-muted",
      className
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Profil CAP (verrouillé)
          </CardTitle>
          <Badge 
            variant={isExpired ? "destructive" : isExpiring ? "outline" : "default"}
            className={cn(
              "text-xs",
              !isExpired && !isExpiring && "bg-primary/20 text-primary border-primary/30"
            )}
          >
            {isExpired ? "Expiré" : `${weeksLeft} sem. restantes`}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Objectif */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Objectif</span>
          <span className="font-semibold">{profile.objective_distance}</span>
        </div>
        
        {/* Métriques physiologiques */}
        <div className="grid grid-cols-3 gap-3">
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
        
        <Separator />
        
        {/* Levier du bloc */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Levier du bloc (4–6 semaines)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{leverInfo.emoji}</span>
            <div>
              <p className="font-semibold text-primary">{leverInfo.label}</p>
              <p className="text-xs text-muted-foreground">{profile.lever_rationale}</p>
            </div>
          </div>
        </div>
        
        {/* Barre de progression verrouillage */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Progression du bloc
            </span>
            <span>{Math.round(lockProgress)}%</span>
          </div>
          <Progress 
            value={lockProgress} 
            className={cn("h-2", isExpiring && "bg-amber-200")} 
          />
          <p className="text-xs text-muted-foreground">
            Recalibration : {new Date(profile.next_recalibration_date).toLocaleDateString("fr-FR")}
          </p>
        </div>
        
        {/* Confiance globale */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Confiance données</span>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              confidence >= 0.75 ? "border-emerald-500 text-emerald-600" :
              confidence >= 0.5 ? "border-amber-500 text-amber-600" :
              "border-red-500 text-red-600"
            )}
          >
            {Math.round(confidence * 100)}%
          </Badge>
        </div>
        
        {/* Alerte expiration */}
        {isExpiring && !isExpired && (
          <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">
                Recalibration bientôt recommandée
              </p>
              <p className="text-xs text-amber-600/80">
                Préparez une semaine de tests pour mettre à jour le profil.
              </p>
            </div>
          </div>
        )}
        
        {isExpired && onRequestRecalibration && (
          <button
            onClick={onRequestRecalibration}
            className="w-full py-2 px-3 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Recalibrer le profil CAP
          </button>
        )}
      </CardContent>
    </Card>
  );
}

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
      "p-2 rounded-lg text-center",
      isGood === true ? "bg-emerald-50 dark:bg-emerald-950/30" :
      isGood === false ? "bg-amber-50 dark:bg-amber-950/30" :
      "bg-muted/50"
    )}>
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className="text-lg font-bold font-mono">{value}</p>
      <p className="text-xs text-muted-foreground">{unit}</p>
      {target !== undefined && (
        <p className="text-xs text-muted-foreground/70">
          cible ≤{target}
        </p>
      )}
    </div>
  );
}
