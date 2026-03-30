/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SECTION LIMITEURS — Dashboard Simplifié
 * 
 * Détection du facteur limitant principal avec explications pédagogiques
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Target, Info, ArrowRight } from "lucide-react";
import type { AthleteDiagnostic } from "@/engines/diagnostic";

interface LimiteursSectionProps {
  diagnostic: AthleteDiagnostic;
  className?: string;
}

// Explications pédagogiques par type de limiteur
const LIMITER_PEDAGOGY: Record<string, {
  title: string;
  whatItMeans: string;
  whyItMatters: string;
  analogy: string;
}> = {
  aerobic_power: {
    title: "Moteur Aérobie",
    whatItMeans: "Ton moteur aérobie (VO2max / FTP/kg / VMA) est en dessous de la cible pour ton objectif. C'est la capacité de ton corps à produire de l'énergie avec l'oxygène.",
    whyItMatters: "Sur longue distance, c'est le moteur principal. S'il est faible, tu devras compenser par la glycolyse (lactate), ce qui n'est pas soutenable.",
    analogy: "C'est comme avoir un petit moteur dans une voiture — tu peux accélérer mais tu surchauffes vite.",
  },
  glycolytic: {
    title: "Excès Glycolytique",
    whatItMeans: "Ta VLamax (production de lactate) est trop élevée pour ton objectif. Tu produis trop de lactate, ce qui consomme tes réserves de glycogène trop vite.",
    whyItMatters: "Avec une VLamax élevée, tu brûles plus de sucre et moins de graisses. Sur longue distance, c'est un handicap car tu risques le « mur » plus tôt.",
    analogy: "C'est comme un moteur diesel qui consomme de l'essence — performant en sprint, mais pas économique en endurance.",
  },
  metabolic_endurance: {
    title: "Endurance Métabolique",
    whatItMeans: "Ta capacité à maintenir l'effort dans la durée (TTE, FatMax) est insuffisante. Tu te fatigues avant la fin de l'épreuve.",
    whyItMatters: "L'endurance métabolique détermine ta capacité à finir fort. Un TTE bas signifie que tes muscles lâchent avant que ta VO2max ne soit le facteur limitant.",
    analogy: "C'est comme avoir un réservoir trop petit — le moteur est bon mais tu tombes en panne avant la fin.",
  },
  durability: {
    title: "Durabilité",
    whatItMeans: "Ta performance se dégrade significativement au fil du temps. La dérive cardiaque, la baisse de puissance et la fatigue musculaire arrivent trop tôt.",
    whyItMatters: "La durabilité est cruciale sur toutes les distances > 2h. Un athlète « durable » perd moins de 5% de sa puissance après 3h.",
    analogy: "C'est comme un pneu qui s'use trop vite — tu roules bien les premiers kilomètres mais la performance chute.",
  },
  neuromuscular: {
    title: "Neuromusculaire",
    whatItMeans: "Ta puissance explosive (W', sprint) et ton économie de mouvement limitent ta performance. Les fibres rapides et la coordination motrice sont à travailler.",
    whyItMatters: "L'efficience neuromusculaire impacte l'économie de course/pédalage. Moins d'énergie gaspillée = plus d'endurance effective.",
    analogy: "C'est comme courir avec des chaussures lourdes — le moteur est bon mais le rendement est faible.",
  },
  unknown: {
    title: "Données Insuffisantes",
    whatItMeans: "Les données actuelles ne permettent pas d'identifier clairement un facteur limitant. Des tests complémentaires sont nécessaires.",
    whyItMatters: "Sans diagnostic précis, les recommandations restent génériques. Un test de terrain ou en laboratoire permettrait de cibler l'entraînement.",
    analogy: "C'est comme vouloir réparer une voiture sans diagnostic — on risque de traiter le mauvais problème.",
  },
};

export function LimiteursSection({ diagnostic, className }: LimiteursSectionProps) {
  const { limiter, synthesis } = diagnostic;
  const primary = synthesis.priorities.L1;
  const secondary = synthesis.priorities.L2;
  
  const pedagogy = LIMITER_PEDAGOGY[limiter.primaryLimiter || "unknown"] || LIMITER_PEDAGOGY.unknown;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-amber-500/5 to-orange-500/10 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg">Facteurs Limitants</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ce qui freine ta progression vers tes objectifs
            </p>
          </div>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              limiter.confidence >= 0.7 ? "border-green-500 text-green-700 dark:text-green-400" :
              limiter.confidence >= 0.4 ? "border-amber-500 text-amber-700 dark:text-amber-400" :
              "border-red-500 text-red-700 dark:text-red-400"
            )}
          >
            Confiance {Math.round(limiter.confidence * 100)}%
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Limiteur principal — mis en avant */}
        <div className="p-4 rounded-xl border-2 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{limiter.limiterEmoji || "🎯"}</span>
            <div>
              <h3 className="font-bold text-base">{limiter.limiterLabel || pedagogy.title}</h3>
              <p className="text-xs text-muted-foreground">Limiteur principal identifié</p>
            </div>
          </div>

          {/* Ce que ça signifie */}
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-background/80">
              <p className="text-xs font-semibold text-foreground mb-1">💡 Ce que ça signifie</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {pedagogy.whatItMeans}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-background/80">
              <p className="text-xs font-semibold text-foreground mb-1">🎯 Pourquoi c'est important</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {pedagogy.whyItMatters}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-background/80">
              <p className="text-xs font-semibold text-foreground mb-1">🔄 En image</p>
              <p className="text-xs text-muted-foreground leading-relaxed italic">
                {pedagogy.analogy}
              </p>
            </div>
          </div>
        </div>

        {/* Limiteur secondaire (si présent) */}
        {secondary && (
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-1">
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">Limiteur secondaire</span>
            </div>
            <p className="text-xs text-muted-foreground">{secondary.label}</p>
          </div>
        )}

        {/* Gaps — tous les axes avec comparatif Actuel vs Cible */}
        {limiter.gapAnalysis.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              Écarts par rapport aux cibles
            </p>
            <div className="space-y-1.5">
              {[...limiter.gapAnalysis]
                .sort((a, b) => a.gap - b.gap)
                .map((gap) => {
                  const isBelow = gap.gap < 0;
                  const isUnknown = gap.status === "unknown" || gap.value === null;
                  const severity = gap.gap < -15 ? "critical" : gap.gap < -5 ? "warning" : isBelow ? "mild" : "ok";

                  const formatVal = (v: number) => {
                    if (v < 1) return v.toFixed(2);
                    if (v < 10) return v.toFixed(1);
                    return v.toFixed(0);
                  };

                  // Determine unit from metric name
                  const unit = gap.metric === "VLamax" ? "mmol/L/s"
                    : gap.metric === "FTP/kg" ? "W/kg"
                    : gap.metric === "VO2max" ? "ml/kg/min"
                    : gap.metric === "TTE" ? "min"
                    : gap.metric === "VMA" ? "km/h"
                    : gap.metric === "Économie" || gap.metric === "Robustesse" ? "/100"
                    : "";

                  return (
                    <div
                      key={gap.metric}
                      className={cn(
                        "flex items-center justify-between p-2.5 rounded-lg border",
                        severity === "critical" ? "border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.05)]" :
                        severity === "warning" ? "border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning)/0.05)]" :
                        severity === "ok" ? "border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.05)]" :
                        "border-border/40 bg-muted/20"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold truncate">{gap.metric}</span>
                        {!isUnknown && gap.value !== null && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span className="font-mono font-bold text-foreground">{formatVal(gap.value)}</span>
                            <span>→</span>
                            <span className="font-mono">{formatVal(gap.target)}</span>
                            <span className="text-muted-foreground/60">{unit}</span>
                          </div>
                        )}
                        {isUnknown && (
                          <span className="text-[10px] text-muted-foreground italic">Donnée manquante</span>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[9px] px-1.5 h-4 shrink-0",
                          severity === "critical" ? "border-[hsl(var(--destructive)/0.4)] text-[hsl(var(--destructive))]" :
                          severity === "warning" ? "border-[hsl(var(--warning)/0.4)] text-[hsl(var(--warning))]" :
                          severity === "ok" ? "border-[hsl(var(--success)/0.4)] text-[hsl(var(--success))]" :
                          "border-border text-muted-foreground"
                        )}
                      >
                        {isUnknown ? "?" : severity === "ok" ? "✅ Atteint" : `${gap.gap.toFixed(0)}%`}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Disclaimer pédagogique */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-muted">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            L'identification des limiteurs est basée sur l'écart entre tes métriques actuelles et les cibles optimales
            pour ton objectif. Le limiteur prioritaire est celui qui a le plus grand <strong>impact pondéré</strong> sur ta performance.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
