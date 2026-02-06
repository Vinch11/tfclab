import { AlertTriangle, Apple, CheckCircle2, Info, Flame, Bike, Footprints, TrendingUp, Shield, Target, Battery, BatteryLow, TrendingDown, ChevronDown, Activity, BookOpen } from "lucide-react";
import { GlycolyticRiskExplanation } from "./GlycolyticRiskExplanation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { computeNutritionEstimate, getObjectifLabel, NUTRITIONAL_RISK_DEFINITION, NUTRITION_METHODOLOGY, SPORT_NUTRITION_COMPARISON, type NutritionEstimate, type Sport } from "@/lib/nutritionPredictive";
import { cn } from "@/lib/utils";
import type { EnergyDriftResult } from "@/lib/energyDrift";
import { useState } from "react";

interface NutritionPredictiveProps {
  vlamax: number | null;
  objectif: string;
  sport?: Sport;
  tteMin?: number | null;
  tteTarget?: number;
  confidence?: number;
  staffMode?: boolean;
  energyDrift?: EnergyDriftResult;
  raceReadiness?: number | null;
}

export function NutritionPredictive({
  vlamax,
  objectif,
  sport,
  tteMin,
  tteTarget = 50,
  confidence,
  staffMode = true,
  energyDrift,
  raceReadiness,
}: NutritionPredictiveProps) {
  const [showMethodology, setShowMethodology] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  
  const estimate = computeNutritionEstimate({ vlamax, objectif, sport, tteMin, tteTarget, raceReadiness });

  if (!estimate) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-muted text-muted-foreground">
              <Apple className="w-5 h-5" />
            </div>
            🍝 Nutrition Prédictive
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 rounded-lg bg-muted/50 border border-border text-center">
            <p className="text-muted-foreground text-sm">
              Données insuffisantes pour estimer les besoins nutritionnels.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Ajoutez un VLamax effectif pour activer ce module.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const SportIcon = estimate.sport === 'cap' ? Footprints : estimate.sport === 'triathlon' ? Activity : Bike;
  const riskIndex = estimate.nutritionalRiskIndex;

  return (
    <Card className={`border-${estimate.riskColor}/20`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-foreground">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Apple className="w-5 h-5" />
            </div>
            🍝 Nutrition Prédictive
            <Badge variant="outline" className="ml-2 text-xs">Staff</Badge>
          </div>
          <div className="flex items-center gap-2">
            <SportIcon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{estimate.sportLabel}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* ========== TEXTE OFFICIEL ========== */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20">
          <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            {NUTRITION_METHODOLOGY.title}
          </h4>
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {NUTRITION_METHODOLOGY.intro}
          </p>
        </div>
        
        {/* ========== INDICE DE RISQUE NUTRITIONNEL ========== */}
        <div className={`p-5 rounded-xl border-2 ${
          riskIndex.level === 'low' ? 'bg-success/5 border-success/30' :
          riskIndex.level === 'moderate' ? 'bg-warning/10 border-warning/30' :
          'bg-destructive/10 border-destructive/30'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${
                riskIndex.level === 'low' ? 'bg-success/20' :
                riskIndex.level === 'moderate' ? 'bg-warning/20' :
                'bg-destructive/20'
              }`}>
                <Shield className={`w-6 h-6 ${
                  riskIndex.level === 'low' ? 'text-success' :
                  riskIndex.level === 'moderate' ? 'text-warning' :
                  'text-destructive'
                }`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">Indice de Risque Nutritionnel</h3>
                  <GlycolyticRiskExplanation variant="modal">
                    <button className="p-1 rounded-full hover:bg-muted transition-colors">
                      <Info className="w-4 h-4 text-muted-foreground hover:text-primary" />
                    </button>
                  </GlycolyticRiskExplanation>
                </div>
                <p className="text-xs text-muted-foreground">Risque métabolique en compétition</p>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-xl text-center ${
              riskIndex.level === 'low' ? 'bg-success text-success-foreground' :
              riskIndex.level === 'moderate' ? 'bg-warning text-warning-foreground' :
              'bg-destructive text-destructive-foreground'
            }`}>
              <span className="text-2xl mr-2">{riskIndex.icon}</span>
              <span className="font-bold text-lg">{riskIndex.label.toUpperCase()}</span>
            </div>
          </div>

          {/* Métriques Staff */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="p-3 rounded-lg bg-background/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Besoin estimé</p>
              <p className="text-xl font-bold text-foreground font-mono">{riskIndex.carbsRequired} g/h</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Zone de tolérance</p>
              <p className="text-xl font-bold text-foreground font-mono">{riskIndex.toleranceZone} g/h</p>
            </div>
            <div className="p-3 rounded-lg bg-background/50 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Facteur principal</p>
              <p className="text-sm font-semibold text-foreground">{riskIndex.mainRiskFactor}</p>
            </div>
          </div>

          {/* Message pédagogique */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-background/80 border border-border">
            {riskIndex.level === 'low' ? (
              <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
            ) : riskIndex.level === 'moderate' ? (
              <Info className="w-5 h-5 text-warning mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">{riskIndex.messagePedagogique}</p>
              <p className="text-xs text-muted-foreground mt-1">{riskIndex.messageStaff}</p>
            </div>
          </div>

          {/* Plafonnement Race Readiness */}
          {riskIndex.raceReadinessCap && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-destructive" />
                <p className="text-sm font-medium text-destructive">
                  Race Readiness plafonné à {riskIndex.raceReadinessCap}%
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Limitation nutritionnelle identifiée – préparation métabolique incomplète
              </p>
            </div>
          )}
        </div>

        {/* ========== LIEN RACE READINESS → NUTRITION ========== */}
        {estimate.raceReadinessImpact && (
          <div className={cn(
            "p-4 rounded-xl border-2",
            estimate.raceReadinessImpact.adjustedCarbs 
              ? "bg-destructive/10 border-destructive/30" 
              : "bg-warning/10 border-warning/30"
          )}>
            <div className="flex items-center gap-3 mb-2">
              <Target className={cn(
                "w-5 h-5",
                estimate.raceReadinessImpact.adjustedCarbs ? "text-destructive" : "text-warning"
              )} />
              <h4 className="font-semibold text-foreground">Lien Race Readiness → Nutrition</h4>
            </div>
            <p className="text-sm text-foreground">{estimate.raceReadinessImpact.message}</p>
            <p className="text-xs text-muted-foreground mt-2 italic">
              {NUTRITION_METHODOLOGY.raceReadinessLink}
            </p>
          </div>
        )}
        {/* ⚡ DÉRIVE ÉNERGÉTIQUE - Entrée logique depuis Nutrition */}
        {energyDrift && staffMode && (
          <div className={cn(
            "p-4 rounded-xl border-2",
            energyDrift.color === "success" ? "bg-success/5 border-success/30" :
            energyDrift.color === "warning" ? "bg-warning/10 border-warning/30" :
            "bg-destructive/10 border-destructive/30"
          )}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  energyDrift.color === "success" ? "bg-success/20" :
                  energyDrift.color === "warning" ? "bg-warning/20" :
                  "bg-destructive/20"
                )}>
                  {energyDrift.level === "low" ? (
                    <Battery className={cn("w-5 h-5", "text-success")} />
                  ) : energyDrift.level === "moderate" ? (
                    <BatteryLow className={cn("w-5 h-5", "text-warning")} />
                  ) : (
                    <TrendingDown className={cn("w-5 h-5", "text-destructive")} />
                  )}
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Dérive Énergétique</h4>
                  <p className="text-xs text-muted-foreground">Risque de défaillance métabolique</p>
                </div>
              </div>
              <Badge variant={
                energyDrift.level === "low" ? "secondary" :
                energyDrift.level === "moderate" ? "default" : "destructive"
              } className="text-sm">
                {energyDrift.icon} {energyDrift.label.toUpperCase()}
              </Badge>
            </div>
            <p className="text-sm text-foreground">{energyDrift.messageStaff}</p>
            {energyDrift.criticalTime && (
              <p className="text-xs text-muted-foreground mt-2">
                ⏱️ Moment critique estimé: <strong className="text-foreground">{energyDrift.criticalTime}</strong>
              </p>
            )}
          </div>
        )}

        {/* ========== ÉCHELLE DE RISQUE ========== */}
        {staffMode && (
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2">
              📊 Échelle de Risque Nutritionnel
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className={`p-3 rounded-lg border ${riskIndex.level === 'low' ? 'bg-success/10 border-success/30' : 'bg-muted/30 border-border'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span>🟢</span>
                  <span className="font-medium text-foreground text-sm">FAIBLE</span>
                </div>
                <p className="text-xs text-muted-foreground">≤ 60 g/h</p>
                <p className="text-xs text-muted-foreground">Oxydation lipidique OK</p>
              </div>
              <div className={`p-3 rounded-lg border ${riskIndex.level === 'moderate' ? 'bg-warning/10 border-warning/30' : 'bg-muted/30 border-border'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span>🟡</span>
                  <span className="font-medium text-foreground text-sm">MODÉRÉ</span>
                </div>
                <p className="text-xs text-muted-foreground">60–80 g/h</p>
                <p className="text-xs text-muted-foreground">Stratégie nécessaire</p>
              </div>
              <div className={`p-3 rounded-lg border ${riskIndex.level === 'high' ? 'bg-destructive/10 border-destructive/30' : 'bg-muted/30 border-border'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span>🟠</span>
                  <span className="font-medium text-foreground text-sm">ÉLEVÉ</span>
                </div>
                <p className="text-xs text-muted-foreground">80–95 g/h</p>
                <p className="text-xs text-muted-foreground">RR max: 85%</p>
              </div>
              <div className={`p-3 rounded-lg border ${riskIndex.level === 'critical' ? 'bg-destructive/20 border-destructive/50' : 'bg-muted/30 border-border'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span>🔴</span>
                  <span className="font-medium text-foreground text-sm">CRITIQUE</span>
                </div>
                <p className="text-xs text-muted-foreground">&gt; 95 g/h</p>
                <p className="text-xs text-muted-foreground">RR max: 75%</p>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Résumé principal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Besoins glucidiques */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Flame className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Besoins estimés</span>
            </div>
            <p className="text-3xl font-bold text-foreground">
              {estimate.carbsMin}–{estimate.carbsMax}
            </p>
            <p className="text-sm text-muted-foreground">g/h de glucides</p>
          </div>

          {/* VLamax */}
          <div className="p-4 rounded-lg bg-secondary/50 border border-border text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-accent" />
              <span className="text-sm text-muted-foreground">VLamax</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {vlamax?.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">{estimate.vlamaxLabel}</p>
          </div>

          {/* Sport & Objectif */}
          <div className="p-4 rounded-lg bg-secondary/50 border border-border text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <SportIcon className="w-5 h-5 text-warning" />
              <span className="text-sm text-muted-foreground">Contexte</span>
            </div>
            <p className="text-lg font-bold text-foreground">{getObjectifLabel(objectif)}</p>
            <p className="text-xs text-muted-foreground">{estimate.sportLabel}</p>
          </div>
        </div>

        {/* ========== CONTRAINTES SPORT-SPÉCIFIQUES ========== */}
        {staffMode && riskIndex.sportSpecific && (
          <div className="p-4 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-2 mb-3">
              <SportIcon className="w-4 h-4 text-accent" />
              <span className="font-medium text-foreground text-sm">
                Contraintes {riskIndex.sportSpecific.sportLabel}
              </span>
              <Badge variant="outline" className="text-xs">
                Facteur: {(riskIndex.sportSpecific.nutritionFactor * 100).toFixed(0)}%
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {riskIndex.sportSpecific.constraints.map((constraint, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {constraint}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Warnings */}
        {estimate.warnings.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Points d'attention :</p>
            <div className="flex flex-wrap gap-2">
              {estimate.warnings.map((warning, idx) => (
                <Badge key={idx} variant="outline" className="bg-warning/10 border-warning/30 text-warning-foreground">
                  ⚠️ {warning}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Ajustement TTE */}
        {estimate.tteAdjustment && (
          <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">📊 Ajustement TTE :</strong> {estimate.tteAdjustment}
            </p>
          </div>
        )}

        {/* ========== COMPARAISON VÉLO vs CAP (Collapsible) ========== */}
        {staffMode && (
          <Collapsible open={showComparison} onOpenChange={setShowComparison}>
            <CollapsibleTrigger className="flex items-center justify-between w-full p-3 rounded-lg bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2">
                <Bike className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground text-sm">Comparaison Vélo vs Course à Pied</span>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", showComparison && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vélo */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{SPORT_NUTRITION_COMPARISON.velo.icon}</span>
                    <span className="font-semibold text-foreground">{SPORT_NUTRITION_COMPARISON.velo.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Tolérance: {SPORT_NUTRITION_COMPARISON.velo.tolerance}g/h</p>
                  <ul className="space-y-1">
                    {SPORT_NUTRITION_COMPARISON.velo.advantages.map((adv, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-success" /> {adv}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground font-medium">Plages staff:</p>
                    <p className="text-xs text-muted-foreground">{NUTRITION_METHODOLOGY.veloLogic.ranges.low}</p>
                    <p className="text-xs text-muted-foreground">{NUTRITION_METHODOLOGY.veloLogic.ranges.moderate}</p>
                    <p className="text-xs text-muted-foreground">{NUTRITION_METHODOLOGY.veloLogic.ranges.high}</p>
                  </div>
                </div>
                
                {/* CAP */}
                <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{SPORT_NUTRITION_COMPARISON.cap.icon}</span>
                    <span className="font-semibold text-foreground">{SPORT_NUTRITION_COMPARISON.cap.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Tolérance: {SPORT_NUTRITION_COMPARISON.cap.tolerance}g/h</p>
                  <ul className="space-y-1">
                    {SPORT_NUTRITION_COMPARISON.cap.constraints.map((c, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-warning" /> {c}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground font-medium">Plages staff:</p>
                    <p className="text-xs text-muted-foreground">{NUTRITION_METHODOLOGY.capLogic.ranges.good_economy}</p>
                    <p className="text-xs text-muted-foreground">{NUTRITION_METHODOLOGY.capLogic.ranges.average_economy}</p>
                    <p className="text-xs text-muted-foreground">{NUTRITION_METHODOLOGY.capLogic.ranges.poor_economy}</p>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Tables de référence (mode staff) */}
        {staffMode && (
          <>
            <Separator />
            <div>
              <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                📋 Tables de référence (g/h)
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Table Vélo */}
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Bike className="w-4 h-4 text-primary" />
                    <span className="font-medium text-foreground text-sm">Vélo</span>
                    <span className="text-xs text-muted-foreground">(critique &gt;100g/h)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-1.5 px-2 text-muted-foreground">VLamax</th>
                          <th className="text-center py-1.5 px-2 text-muted-foreground">IM</th>
                          <th className="text-center py-1.5 px-2 text-muted-foreground">70.3</th>
                          <th className="text-center py-1.5 px-2 text-muted-foreground">Sprint</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className={`border-b border-border/50 ${estimate.vlamaxCategory === 'very_low' ? 'bg-primary/10' : ''}`}>
                          <td className="py-1.5 px-2 text-foreground">≤0.30</td>
                          <td className="text-center py-1.5 px-2">60–70</td>
                          <td className="text-center py-1.5 px-2">70–80</td>
                          <td className="text-center py-1.5 px-2">80–90</td>
                        </tr>
                        <tr className={`border-b border-border/50 ${estimate.vlamaxCategory === 'moderate' ? 'bg-primary/10' : ''}`}>
                          <td className="py-1.5 px-2 text-foreground">0.31–0.45</td>
                          <td className="text-center py-1.5 px-2">70–80</td>
                          <td className="text-center py-1.5 px-2">80–90</td>
                          <td className="text-center py-1.5 px-2">90–100</td>
                        </tr>
                        <tr className={`border-b border-border/50 ${estimate.vlamaxCategory === 'high' ? 'bg-primary/10' : ''}`}>
                          <td className="py-1.5 px-2 text-foreground">0.46–0.60</td>
                          <td className="text-center py-1.5 px-2">80–90</td>
                          <td className="text-center py-1.5 px-2">90–100</td>
                          <td className="text-center py-1.5 px-2">100–110</td>
                        </tr>
                        <tr className={estimate.vlamaxCategory === 'very_high' ? 'bg-primary/10' : ''}>
                          <td className="py-1.5 px-2 text-foreground">&gt;0.60</td>
                          <td className="text-center py-1.5 px-2">90–100</td>
                          <td className="text-center py-1.5 px-2">100–120</td>
                          <td className="text-center py-1.5 px-2 text-destructive">⚠️</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table CAP */}
                <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Footprints className="w-4 h-4 text-accent" />
                    <span className="font-medium text-foreground text-sm">Course à pied</span>
                    <span className="text-xs text-muted-foreground">(critique &gt;85g/h)</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-1.5 px-2 text-muted-foreground">VLamax</th>
                          <th className="text-center py-1.5 px-2 text-muted-foreground">Marathon</th>
                          <th className="text-center py-1.5 px-2 text-muted-foreground">Semi</th>
                          <th className="text-center py-1.5 px-2 text-muted-foreground">Sprint</th>
                        </tr>
                      </thead>
                      <tbody className="text-muted-foreground">
                        <tr className={`border-b border-border/50 ${estimate.vlamaxCategory === 'very_low' ? 'bg-accent/10' : ''}`}>
                          <td className="py-1.5 px-2 text-foreground">≤0.30</td>
                          <td className="text-center py-1.5 px-2">50–60</td>
                          <td className="text-center py-1.5 px-2">60–70</td>
                          <td className="text-center py-1.5 px-2">70–80</td>
                        </tr>
                        <tr className={`border-b border-border/50 ${estimate.vlamaxCategory === 'moderate' ? 'bg-accent/10' : ''}`}>
                          <td className="py-1.5 px-2 text-foreground">0.31–0.45</td>
                          <td className="text-center py-1.5 px-2">60–70</td>
                          <td className="text-center py-1.5 px-2">70–80</td>
                          <td className="text-center py-1.5 px-2">80–90</td>
                        </tr>
                        <tr className={`border-b border-border/50 ${estimate.vlamaxCategory === 'high' ? 'bg-accent/10' : ''}`}>
                          <td className="py-1.5 px-2 text-foreground">0.46–0.60</td>
                          <td className="text-center py-1.5 px-2">70–80</td>
                          <td className="text-center py-1.5 px-2">80–90</td>
                          <td className="text-center py-1.5 px-2 text-warning">⚠️</td>
                        </tr>
                        <tr className={estimate.vlamaxCategory === 'very_high' ? 'bg-accent/10' : ''}>
                          <td className="py-1.5 px-2 text-foreground">&gt;0.60</td>
                          <td className="text-center py-1.5 px-2 text-warning">⚠️</td>
                          <td className="text-center py-1.5 px-2 text-destructive">⚠️</td>
                          <td className="text-center py-1.5 px-2 text-destructive">❌</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Source info (mode staff) */}
        {staffMode && confidence !== undefined && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-3 h-3" />
            <span>VLamax source : {confidence >= 0.7 ? "🧪 Test fiable" : confidence >= 0.5 ? "🏃 Terrain" : "📐 Estimation"}</span>
          </div>
        )}

        {/* Définition officielle */}
        {staffMode && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-muted-foreground italic">
              📖 <strong className="text-foreground">Définition :</strong> {NUTRITIONAL_RISK_DEFINITION}
            </p>
          </div>
        )}

        {/* Disclaimer obligatoire */}
        <div className="p-4 rounded-lg bg-muted border border-border">
          <p className="text-xs text-muted-foreground text-center italic">
            ⚠️ Les besoins nutritionnels sont des estimations physiologiques.
            Ils doivent être testés à l'entraînement et validés par un professionnel.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
