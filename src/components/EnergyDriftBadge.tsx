/**
 * EnergyDriftBadge - Indicateur de Dérive Énergétique
 * Composant réutilisable pour afficher le risque de dérive énergétique
 * Peut être affiché en mode compact (badge) ou détaillé (card)
 */

import { AlertTriangle, Battery, BatteryLow, CheckCircle2, Zap, Target, TrendingDown, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  EnergyDriftResult, 
  getFactorLabel, 
  getFactorColor 
} from "@/lib/energyDrift";

interface EnergyDriftBadgeProps {
  drift: EnergyDriftResult;
  mode?: "compact" | "detailed" | "card";
  className?: string;
}

export function EnergyDriftBadge({ drift, mode = "compact", className }: EnergyDriftBadgeProps) {
  
  // Icon selon le niveau de risque
  const DriftIcon = drift.level === "low" ? Battery : drift.level === "moderate" ? BatteryLow : TrendingDown;
  
  // Compact badge mode
  if (mode === "compact") {
    return (
      <div className={cn(
        "flex items-center gap-2 p-2 rounded-lg border text-sm",
        drift.color === "success" ? "bg-success/10 border-success/30" :
        drift.color === "warning" ? "bg-warning/10 border-warning/30" :
        "bg-destructive/10 border-destructive/30",
        className
      )}>
        <span className="text-lg">{drift.icon}</span>
        <div>
          <span className={cn(
            "font-medium",
            drift.color === "success" ? "text-success" :
            drift.color === "warning" ? "text-warning" :
            "text-destructive"
          )}>
            Dérive: {drift.label}
          </span>
          {drift.criticalTime && (
            <span className="text-xs text-muted-foreground ml-2">
              ({drift.criticalTime})
            </span>
          )}
        </div>
      </div>
    );
  }
  
  // Detailed inline mode
  if (mode === "detailed") {
    return (
      <div className={cn(
        "p-4 rounded-xl border",
        drift.color === "success" ? "bg-success/5 border-success/30" :
        drift.color === "warning" ? "bg-warning/5 border-warning/30" :
        "bg-destructive/5 border-destructive/30",
        className
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              drift.color === "success" ? "bg-success/20" :
              drift.color === "warning" ? "bg-warning/20" :
              "bg-destructive/20"
            )}>
              <DriftIcon className={cn(
                "w-5 h-5",
                drift.color === "success" ? "text-success" :
                drift.color === "warning" ? "text-warning" :
                "text-destructive"
              )} />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Dérive Énergétique</h4>
              <p className="text-xs text-muted-foreground">Risque métabolique</p>
            </div>
          </div>
          <Badge variant={
            drift.level === "low" ? "secondary" :
            drift.level === "moderate" ? "default" : "destructive"
          } className="text-sm">
            {drift.icon} {drift.label.toUpperCase()}
          </Badge>
        </div>
        
        {/* Message staff */}
        <div className={cn(
          "p-3 rounded-lg border",
          drift.color === "success" ? "bg-background/80 border-success/20" :
          drift.color === "warning" ? "bg-background/80 border-warning/20" :
          "bg-background/80 border-destructive/20"
        )}>
          <div className="flex items-start gap-2">
            {drift.level === "low" ? (
              <CheckCircle2 className="w-4 h-4 text-success mt-0.5 shrink-0" />
            ) : drift.level === "moderate" ? (
              <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            )}
            <p className="text-sm text-foreground">{drift.messageStaff}</p>
          </div>
        </div>
        
        {/* Moment critique */}
        {drift.criticalTime && (
          <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Risque accru après: <strong className="text-foreground">{drift.criticalTime}</strong></span>
          </div>
        )}
        
        {/* Facteurs contributifs */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="p-2 rounded-lg bg-secondary/30 border border-border text-center">
            <p className="text-xs text-muted-foreground mb-0.5">VLamax</p>
            <p className={cn("text-xs font-medium", getFactorColor(drift.factors.vlamax))}>
              {getFactorLabel(drift.factors.vlamax)}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-secondary/30 border border-border text-center">
            <p className="text-xs text-muted-foreground mb-0.5">TTE</p>
            <p className={cn("text-xs font-medium", getFactorColor(drift.factors.tte))}>
              {getFactorLabel(drift.factors.tte)}
            </p>
          </div>
          <div className="p-2 rounded-lg bg-secondary/30 border border-border text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Objectif</p>
            <p className="text-xs font-medium text-muted-foreground">
              {drift.factors.objectif === "high_tolerance" ? "Court" :
               drift.factors.objectif === "medium_tolerance" ? "Moyen" : "Long"}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Card mode
  return (
    <Card className={cn(
      "border",
      drift.color === "success" ? "border-success/30" :
      drift.color === "warning" ? "border-warning/30" :
      "border-destructive/30",
      className
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-foreground">
            <div className={cn(
              "p-2 rounded-lg",
              drift.color === "success" ? "bg-success/10 text-success" :
              drift.color === "warning" ? "bg-warning/10 text-warning" :
              "bg-destructive/10 text-destructive"
            )}>
              <DriftIcon className="w-5 h-5" />
            </div>
            ⚡ Dérive Énergétique
            <Badge variant="outline" className="ml-2 text-xs">Staff</Badge>
          </div>
          <Badge variant={
            drift.level === "low" ? "secondary" :
            drift.level === "moderate" ? "default" : "destructive"
          } className="text-sm px-3">
            {drift.icon} {drift.label.toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Description */}
        <div className="p-3 rounded-lg bg-secondary/30 border border-border">
          <p className="text-sm text-muted-foreground">
            La dérive énergétique représente le moment où l'athlète n'est plus capable 
            de maintenir son métabolisme cible malgré une nutrition correcte.
          </p>
        </div>
        
        {/* Message staff */}
        <div className={cn(
          "p-4 rounded-xl border-2",
          drift.color === "success" ? "bg-success/5 border-success/30" :
          drift.color === "warning" ? "bg-warning/5 border-warning/30" :
          "bg-destructive/5 border-destructive/30"
        )}>
          <div className="flex items-start gap-3">
            {drift.level === "low" ? (
              <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
            ) : drift.level === "moderate" ? (
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            )}
            <p className="text-sm font-medium text-foreground">{drift.messageStaff}</p>
          </div>
        </div>
        
        {/* Moment critique et détails */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Moment critique</span>
            </div>
            <p className="text-lg font-bold text-foreground font-mono">
              {drift.criticalTime ?? "N/A"}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Durée objectif</span>
            </div>
            <p className="text-lg font-bold text-foreground font-mono">
              {drift.details.objectifDuration}
            </p>
          </div>
        </div>
        
        {/* Facteurs contributifs détaillés */}
        <div>
          <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" />
            Facteurs contributifs
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className={cn(
              "p-3 rounded-lg border text-center",
              drift.factors.vlamax === "protective" ? "bg-success/5 border-success/30" :
              drift.factors.vlamax === "neutral" ? "bg-secondary/30 border-border" :
              "bg-destructive/5 border-destructive/30"
            )}>
              <p className="text-xs text-muted-foreground mb-1">VLamax</p>
              <p className="text-sm font-mono font-bold text-foreground">
                {drift.details.vlamaxValue?.toFixed(2) ?? "—"}
              </p>
              <p className={cn("text-xs mt-1", getFactorColor(drift.factors.vlamax))}>
                {getFactorLabel(drift.factors.vlamax)}
              </p>
            </div>
            <div className={cn(
              "p-3 rounded-lg border text-center",
              drift.factors.tte === "protective" ? "bg-success/5 border-success/30" :
              drift.factors.tte === "vigilance" ? "bg-warning/5 border-warning/30" :
              "bg-destructive/5 border-destructive/30"
            )}>
              <p className="text-xs text-muted-foreground mb-1">TTE</p>
              <p className="text-sm font-mono font-bold text-foreground">
                {drift.details.tteValue ?? "—"} min
              </p>
              <p className={cn("text-xs mt-1", getFactorColor(drift.factors.tte))}>
                {getFactorLabel(drift.factors.tte)}
                {drift.details.tteDelta !== null && ` (${drift.details.tteDelta >= 0 ? "+" : ""}${drift.details.tteDelta})`}
              </p>
            </div>
            <div className="p-3 rounded-lg border text-center bg-secondary/30 border-border">
              <p className="text-xs text-muted-foreground mb-1">Objectif</p>
              <p className="text-sm font-mono font-bold text-foreground">
                {drift.factors.objectif === "high_tolerance" ? "Court" :
                 drift.factors.objectif === "medium_tolerance" ? "Moyen" : "Long"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {drift.details.objectifDuration}
              </p>
            </div>
          </div>
        </div>
        
        {/* Lien logique VLamax/TTE/Économie */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">📊 Logique physiologique</p>
          <p>
            <strong>VLamax</strong> → production d'énergie glycolytique •
            <strong> TTE</strong> → capacité à tenir l'intensité •
            <strong> Dérive</strong> → moment où le système craque
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
