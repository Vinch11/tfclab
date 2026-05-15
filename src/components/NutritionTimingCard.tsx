import { useState } from "react";
import { 
  Apple, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  HelpCircle,
  Flame,
  Target,
  Bike,
  Footprints,
  ChevronDown,
  ChevronUp,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { 
  computeNutritionTiming, 
  getToleranceLabel, 
  getRiskBadgeIcon,
  NUTRITION_TIMING_EXPLANATION,
  NUTRITION_TIMING_DISCLAIMER,
  type DigestiveTolerance,
  type NutritionTimingResult,
} from "@/lib/nutritionTiming";
import type { EnergyDriftResult } from "@/lib/energyDrift";

interface NutritionTimingCardProps {
  vlamax: number | null;
  tteMin: number | null;
  tteTarget: number;
  objectif: string;
  sport?: "velo" | "cap";
  energyDrift: EnergyDriftResult;
  onToleranceChange?: (tolerance: DigestiveTolerance) => void;
  initialTolerance?: DigestiveTolerance;
  compact?: boolean;
  /** F27 — Si fournis, baseRate calculé via source canonique Mader. */
  vo2max?: number | null;
  weightKg?: number | null;
  targetIntensityPct?: number | null;
  targetDurationHours?: number | null;
}

export function NutritionTimingCard({
  vlamax,
  tteMin,
  tteTarget,
  objectif,
  sport = "velo",
  energyDrift,
  onToleranceChange,
  initialTolerance = "MEDIUM",
  compact = false,
  vo2max,
  weightKg,
  targetIntensityPct,
  targetDurationHours,
}: NutritionTimingCardProps) {
  const [digestiveTolerance, setDigestiveTolerance] = useState<DigestiveTolerance>(initialTolerance);
  const [showPhases, setShowPhases] = useState(!compact);
  
  const handleToleranceChange = (value: DigestiveTolerance) => {
    setDigestiveTolerance(value);
    onToleranceChange?.(value);
  };
  
  const timing = computeNutritionTiming({
    vlamax,
    tteMin,
    tteTarget,
    objectif,
    sport,
    digestiveTolerance,
    energyDrift,
    vo2max,
    weightKg,
    targetIntensityPct,
    targetDurationHours,
  });
  
  const SportIcon = sport === "cap" ? Footprints : Bike;
  
  // Données insuffisantes
  if (timing.isDataInsufficient) {
    return (
      <Card className="border-warning/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-warning/10 text-warning">
              <Apple className="w-5 h-5" />
            </div>
            Nutrition prédictive (g/h)
            <Badge variant="outline" className="ml-2 text-xs">Staff</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-warning/10 border border-warning/30">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-warning" />
              <p className="font-medium text-foreground">Données insuffisantes</p>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Impossible de calculer le plan nutritionnel.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Champs manquants:</strong> {timing.missingFields.join(", ")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={cn(
      "border-2",
      timing.riskBadgeColor === "success" ? "border-success/20" :
      timing.riskBadgeColor === "warning" ? "border-warning/30" :
      "border-destructive/30"
    )}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-foreground">
            <div className={cn(
              "p-2 rounded-lg",
              timing.riskBadgeColor === "success" ? "bg-success/10 text-success" :
              timing.riskBadgeColor === "warning" ? "bg-warning/10 text-warning" :
              "bg-destructive/10 text-destructive"
            )}>
              <Apple className="w-5 h-5" />
            </div>
            Nutrition prédictive (g/h)
            <Badge variant="outline" className="text-xs">Staff</Badge>
          </div>
          
          {/* Bouton Pourquoi? */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground">
                <HelpCircle className="w-4 h-4 mr-1" />
                Pourquoi ?
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground">Calcul nutritionnel</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {NUTRITION_TIMING_EXPLANATION}
                </p>
                <Separator />
                <p className="text-xs text-muted-foreground italic">
                  {NUTRITION_TIMING_DISCLAIMER}
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* ===== SECTION A: Glucides cibles ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={cn(
            "p-5 rounded-xl border-2 text-center",
            timing.riskBadgeColor === "success" ? "bg-success/5 border-success/30" :
            timing.riskBadgeColor === "warning" ? "bg-warning/5 border-warning/30" :
            "bg-destructive/5 border-destructive/30"
          )}>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Glucides cibles</span>
            </div>
            <p className="text-4xl font-bold text-foreground font-mono">
              {timing.carbsMin}–{timing.carbsMax}
            </p>
            <p className="text-sm text-muted-foreground mt-1">g/h (cible {timing.carbsTarget})</p>
          </div>
          
          <div className="p-5 rounded-xl border border-border bg-secondary/30">
            <div className="flex items-center gap-2 mb-3">
              <SportIcon className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Contexte</span>
            </div>
            <p className="text-lg font-semibold text-foreground">{objectif}</p>
            <p className="text-sm text-muted-foreground">{sport === "cap" ? "Course à pied" : "Vélo"}</p>
            
            {/* Sélecteur tolérance digestive */}
            <div className="mt-3">
              <label className="text-xs text-muted-foreground mb-1 block">Tolérance digestive</label>
              <Select value={digestiveTolerance} onValueChange={(v) => handleToleranceChange(v as DigestiveTolerance)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Basse</SelectItem>
                  <SelectItem value="MEDIUM">Moyenne</SelectItem>
                  <SelectItem value="HIGH">Élevée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* ===== SECTION E: Badge Risque ===== */}
        <div className={cn(
          "p-4 rounded-xl border-2 flex items-center justify-between",
          timing.riskBadgeColor === "success" ? "bg-success/5 border-success/30" :
          timing.riskBadgeColor === "warning" ? "bg-warning/10 border-warning/30" :
          "bg-destructive/10 border-destructive/30"
        )}>
          <div className="flex items-center gap-3">
            <Shield className={cn(
              "w-6 h-6",
              timing.riskBadgeColor === "success" ? "text-success" :
              timing.riskBadgeColor === "warning" ? "text-warning" :
              "text-destructive"
            )} />
            <div>
              <p className="font-semibold text-foreground">Risque nutritionnel</p>
              <p className="text-xs text-muted-foreground">{timing.riskBadgeReason}</p>
            </div>
          </div>
          <Badge variant={
            timing.riskBadgeColor === "success" ? "secondary" :
            timing.riskBadgeColor === "warning" ? "default" :
            "destructive"
          } className="text-sm px-3 py-1">
            {getRiskBadgeIcon(timing.riskBadge)} {timing.riskBadgeLabel}
          </Badge>
        </div>
        
        {/* ===== SECTION D: Alertes ===== */}
        {timing.alerts.length > 0 && (
          <div className="space-y-2">
            {timing.alerts.map((alert, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-foreground">{alert}</p>
              </div>
            ))}
          </div>
        )}
        
        {/* ===== SECTION B: Timing par phases ===== */}
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPhases(!showPhases)}
            className="w-full flex items-center justify-between text-foreground mb-2"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="font-semibold">Timing par phases</span>
            </div>
            {showPhases ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          
          {showPhases && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {timing.phases.map((phase) => (
                <div 
                  key={phase.name} 
                  className={cn(
                    "p-4 rounded-lg border",
                    phase.name === "START" ? "bg-primary/5 border-primary/30" :
                    phase.name === "MID" ? "bg-secondary/50 border-border" :
                    "bg-accent/10 border-accent/30"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-foreground">{phase.label}</span>
                    <Badge variant="outline" className="text-xs">{phase.name}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{phase.timeRange}</p>
                  <p className="text-2xl font-bold text-foreground font-mono">{phase.carbsGh}</p>
                  <p className="text-xs text-muted-foreground">g/h</p>
                  <p className="text-xs text-primary mt-2">{phase.frequency}</p>
                  {phase.notes.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {phase.notes.map((note, i) => (
                        <li key={i} className="text-xs text-muted-foreground">• {note}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <Separator />
        
        {/* ===== SECTION C: Plan staff ===== */}
        <div>
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Plan staff
          </h4>
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <ul className="space-y-2">
              {timing.staffPlan.map((item, idx) => (
                <li key={idx} className="text-sm text-foreground">{item}</li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Détails calcul (mode debug) */}
        {!compact && (
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">Détails calcul</summary>
            <div className="mt-2 p-3 rounded bg-muted/50 font-mono space-y-1">
              <p>Base ({sport}): {timing.details.baseCarbs} g/h</p>
              <p>VLamax adj: {timing.details.vlamaxAdj > 0 ? '+' : ''}{timing.details.vlamaxAdj} g/h</p>
              <p>Objectif adj: {timing.details.objectifAdj > 0 ? '+' : ''}{timing.details.objectifAdj} g/h</p>
              <p>Tolérance adj: {timing.details.toleranceAdj > 0 ? '+' : ''}{timing.details.toleranceAdj} g/h</p>
              <p className="font-bold">= {timing.carbsTarget} g/h (clampé)</p>
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
