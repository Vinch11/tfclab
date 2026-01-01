import { AlertTriangle, Apple, CheckCircle2, Info, Flame, Bike, Footprints, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { computeNutritionEstimate, getObjectifLabel, type NutritionEstimate, type Sport } from "@/lib/nutritionPredictive";

interface NutritionPredictiveProps {
  vlamax: number | null;
  objectif: string;
  sport?: Sport;
  tteMin?: number | null;
  tteTarget?: number;
  confidence?: number;
  staffMode?: boolean;
}

export function NutritionPredictive({
  vlamax,
  objectif,
  sport,
  tteMin,
  tteTarget = 50,
  confidence,
  staffMode = true,
}: NutritionPredictiveProps) {
  const estimate = computeNutritionEstimate({ vlamax, objectif, sport, tteMin, tteTarget });

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

  const sportLabel = sport === 'cap' ? 'Course à pied' : sport === 'triathlon' ? 'Triathlon' : 'Vélo';
  const SportIcon = sport === 'cap' ? Footprints : Bike;

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
          <Badge className={`bg-${estimate.riskColor} text-${estimate.riskColor}-foreground`}>
            Risque {estimate.riskLabel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
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
            <p className="text-xs text-muted-foreground">{sportLabel}</p>
          </div>
        </div>

        {/* Message Staff */}
        <div className={`p-4 rounded-lg bg-${estimate.riskColor}/5 border border-${estimate.riskColor}/20`}>
          <div className="flex items-start gap-3">
            {estimate.riskLevel === 'low' ? (
              <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
            ) : estimate.riskLevel === 'moderate' ? (
              <Info className="w-5 h-5 text-warning mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
            )}
            <div>
              <p className="text-sm text-foreground font-medium mb-1">Analyse Staff</p>
              <p className="text-sm text-muted-foreground">{estimate.messageStaff}</p>
            </div>
          </div>
        </div>

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

        {/* Confidence (mode staff) */}
        {staffMode && confidence !== undefined && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-3 h-3" />
            <span>Confiance VLamax source : {Math.round(confidence * 100)}%</span>
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
