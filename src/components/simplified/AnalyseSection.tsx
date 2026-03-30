/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SECTION ANALYSE — Dashboard Simplifié
 * 
 * Radar Coaching Compass + Liste des métriques avec explications pédagogiques
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BarChart3, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import type { AthleteDiagnostic } from "@/engines/diagnostic";

interface AnalyseSectionProps {
  diagnostic: AthleteDiagnostic;
  className?: string;
}

// Explications pédagogiques par métrique
const METRIC_EXPLANATIONS: Record<string, { label: string; unit: string; explanation: string; icon: string }> = {
  vo2max: {
    label: "VO2max",
    unit: "ml/kg/min",
    explanation: "Capacité maximale de ton corps à utiliser l'oxygène. C'est le « moteur aérobie » — plus il est puissant, plus tu peux soutenir une intensité élevée longtemps.",
    icon: "🫁",
  },
  ftp_kg: {
    label: "FTP/kg",
    unit: "W/kg",
    explanation: "Puissance seuil fonctionnel rapportée au poids. Représente l'intensité maximale soutenable pendant ~1 heure. C'est l'indicateur clé en cyclisme.",
    icon: "⚡",
  },
  vma: {
    label: "VMA",
    unit: "km/h",
    explanation: "Vitesse Maximale Aérobie : l'allure à laquelle tu atteins ton VO2max. Référence fondamentale pour calibrer toutes tes allures d'entraînement en course à pied.",
    icon: "🏃",
  },
  vlamax: {
    label: "VLamax",
    unit: "mmol/L/s",
    explanation: "Puissance glycolytique maximale. Mesure la vitesse de production de lactate. Pour l'endurance longue, une VLamax basse (< 0.4) est souhaitable — elle favorise l'utilisation des graisses.",
    icon: "🔬",
  },
  tte: {
    label: "TTE",
    unit: "min",
    explanation: "Time To Exhaustion : durée de maintien du FTP. Reflète l'endurance musculaire et métabolique. Plus le TTE est élevé, meilleure est ta capacité à résister à la fatigue sur longue distance.",
    icon: "⏱️",
  },
  economy: {
    label: "Économie",
    unit: "/100",
    explanation: "Efficience du geste sportif. Combine cadence, élasticité musculaire et technique. Un score élevé signifie que tu dépenses moins d'énergie pour une même vitesse/puissance.",
    icon: "🎯",
  },
  fatmax: {
    label: "FatMax",
    unit: "%FTP",
    explanation: "Intensité à laquelle tu brûles le maximum de graisses. Plus ce seuil est élevé, mieux tu épargnes tes réserves de glycogène — crucial sur longue distance.",
    icon: "🔥",
  },
  durability: {
    label: "Durabilité",
    unit: "/100",
    explanation: "Résistance à la dégradation de la performance sur la durée. Combine la dérive cardiaque, le TTE et la stabilité de la puissance/allure.",
    icon: "🛡️",
  },
};

function getGapStatus(gap: number): { label: string; color: string; icon: typeof TrendingUp } {
  if (gap >= 5) return { label: "Au-dessus", color: "text-green-600 dark:text-green-400", icon: TrendingUp };
  if (gap >= -5) return { label: "Dans la cible", color: "text-blue-600 dark:text-blue-400", icon: Minus };
  if (gap >= -15) return { label: "À développer", color: "text-amber-600 dark:text-amber-400", icon: TrendingDown };
  return { label: "Prioritaire", color: "text-red-600 dark:text-red-400", icon: TrendingDown };
}

export function AnalyseSection({ diagnostic, className }: AnalyseSectionProps) {
  const { limiter, effectifs, synthesis } = diagnostic;
  const gapAnalysis = limiter.gapAnalysis;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-500/5 to-blue-600/10 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Analyse Physiologique</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Évaluation de tes capacités par rapport à tes objectifs
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {Math.round(diagnostic.meta.dataCompleteness * 100)}% données
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Synthèse rapide */}
        <div className="p-3 rounded-lg bg-muted/50 border">
          <p className="text-sm font-medium">{synthesis.headline}</p>
          {synthesis.strengths.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {synthesis.strengths.map((s, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">
                  ✅ {s}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Explication contextuelle */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Chaque métrique est comparée à la <strong>cible idéale</strong> pour ton objectif ({diagnostic.objectif}) 
            et ton niveau d'ambition ({diagnostic.ambition}). Les écarts négatifs indiquent les axes de progression prioritaires.
          </p>
        </div>

        {/* Liste des métriques avec gaps */}
        <div className="space-y-2">
          {gapAnalysis.map((gap) => {
            const metricInfo = METRIC_EXPLANATIONS[gap.metric] || {
              label: gap.metric,
              unit: "",
              explanation: "",
              icon: "📊",
            };
            const status = getGapStatus(gap.gap);
            const StatusIcon = status.icon;

            return (
              <div
                key={gap.metric}
                className="p-3 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{metricInfo.icon}</span>
                    <span className="text-sm font-semibold">{metricInfo.label}</span>
                    {gap.value != null && (
                      <span className="text-xs text-muted-foreground">
                        {typeof gap.value === "number" ? gap.value.toFixed(1) : gap.value} {metricInfo.unit}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon className={cn("h-3.5 w-3.5", status.color)} />
                    <span className={cn("text-xs font-medium", status.color)}>
                      {gap.gap > 0 ? "+" : ""}{gap.gap.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Barre de progression visuelle */}
                <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      gap.gap >= 0 ? "bg-green-500" : gap.gap >= -10 ? "bg-amber-500" : "bg-red-500"
                    )}
                    style={{ width: `${Math.min(100, Math.max(5, 50 + gap.gap))}%` }}
                  />
                </div>

                {/* Explication pédagogique */}
                {metricInfo.explanation && (
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    {metricInfo.explanation}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Alertes */}
        {synthesis.alerts.length > 0 && (
          <div className="space-y-1.5">
            {synthesis.alerts.map((alert, i) => (
              <div
                key={i}
                className={cn(
                  "flex items-start gap-2 p-2 rounded-lg text-xs",
                  alert.severity === "critical" && "bg-destructive/10 text-destructive",
                  alert.severity === "warning" && "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                  alert.severity === "info" && "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                )}
              >
                <span>{alert.severity === "critical" ? "🚨" : alert.severity === "warning" ? "⚠️" : "ℹ️"}</span>
                <span>{alert.message}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
