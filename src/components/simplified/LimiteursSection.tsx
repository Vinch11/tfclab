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
  const { limiter } = diagnostic;

  // ✅ HYBRIDE : on consomme directement le categoryRanking calculé par
  // detectUnifiedLimiter — source unique partagée avec le Coaching Compass.
  // Garantit que l'ordre et la catégorie #1 sont identiques entre les deux cartes.
  const rankedLimiters = (limiter.categoryRanking ?? []).map(entry => ({
    category: entry.category,
    metrics: entry.metrics,
    worstGap: entry.worstGap,
    totalImpact: entry.totalImpact,
  }));


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
              Ce qui freine ta progression, classé par ordre d'importance
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

      <CardContent className="p-4 space-y-3">
        {rankedLimiters.length === 0 && (
          <div className="p-4 rounded-xl border bg-muted/20 text-center">
            <p className="text-sm text-muted-foreground">Profil équilibré — aucun limiteur majeur identifié</p>
          </div>
        )}

        {rankedLimiters.map((item, index) => {
          const rank = index + 1;
          const pedagogy = LIMITER_PEDAGOGY[item.category] || LIMITER_PEDAGOGY.unknown;
          const isPrimary = rank === 1;

          return (
            <div
              key={item.category + index}
              className={cn(
                "rounded-xl border transition-colors",
                isPrimary
                  ? "border-2 border-amber-500/30 bg-amber-500/5 p-4"
                  : "border-border/50 bg-card p-3"
              )}
            >
              {/* Header with rank */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "flex items-center justify-center rounded-full text-xs font-bold shrink-0",
                    isPrimary ? "h-7 w-7 bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))]"
                      : rank === 2 ? "h-6 w-6 bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground,0_0%_0%))]"
                      : "h-6 w-6 bg-muted text-muted-foreground"
                  )}>
                    {rank}
                  </div>
                  <div>
                    <h3 className={cn("font-semibold", isPrimary ? "text-base" : "text-sm")}>
                      {pedagogy.title}
                    </h3>
                    <Badge variant="outline" className={cn(
                      "text-[9px] px-1.5 mt-0.5",
                      isPrimary ? "border-[hsl(var(--destructive)/0.4)] text-[hsl(var(--destructive))]"
                        : rank === 2 ? "border-[hsl(var(--warning)/0.4)] text-[hsl(var(--warning))]"
                        : "border-border text-muted-foreground"
                    )}>
                      {isPrimary ? "Prioritaire" : rank === 2 ? "Secondaire" : `Tertiaire`}
                    </Badge>
                  </div>
                </div>

                {/* Impact score */}
                <div className="text-right">
                  <span className={cn(
                    "text-xs font-mono font-bold",
                    item.worstGap < -15 ? "text-[hsl(var(--destructive))]"
                      : item.worstGap < -5 ? "text-[hsl(var(--warning))]"
                      : "text-muted-foreground"
                  )}>
                    {item.worstGap.toFixed(0)}%
                  </span>
                  <p className="text-[9px] text-muted-foreground">écart max</p>
                </div>
              </div>

              {/* Metrics concerned */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {item.metrics.map(m => {
                  const formatVal = (v: number) => v < 1 ? v.toFixed(2) : v < 10 ? v.toFixed(1) : v.toFixed(0);
                  const isVLamax = m.metric === "VLamax";
                  const target = isVLamax ? diagnostic.targets.vlamaxRange.optimal : m.target;
                  return (
                    <div key={m.metric} className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-background/80 border border-border/30 text-[10px]">
                      <span className="font-semibold">{m.metric}</span>
                      {m.value !== null && target !== null && (
                        <>
                          <span className="text-muted-foreground">{formatVal(m.value)}</span>
                          <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/50" />
                          <span className="text-muted-foreground">{formatVal(target)}</span>
                          {isVLamax && (
                            <span className="text-[9px] text-muted-foreground/60 font-normal">
                              ({diagnostic.targets.vlamaxRange.min.toFixed(2)}–{diagnostic.targets.vlamaxRange.max.toFixed(2)})
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Explanation — only for primary */}
              {isPrimary && (
                <div className="space-y-2 mt-3">
                  <div className="p-2.5 rounded-lg bg-background/80">
                    <p className="text-[10px] font-semibold text-foreground mb-0.5">💡 Ce que ça signifie</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{pedagogy.whatItMeans}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background/80">
                    <p className="text-[10px] font-semibold text-foreground mb-0.5">🔄 En image</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed italic">{pedagogy.analogy}</p>
                  </div>
                </div>
              )}

              {/* Brief explanation for secondary */}
              {!isPrimary && (
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-1">
                  {pedagogy.whatItMeans.split('.')[0]}.
                </p>
              )}
            </div>
          );
        })}

        {/* Disclaimer pédagogique */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-muted">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Les limiteurs sont classés par <strong>impact pondéré</strong> sur ta performance.
            Le limiteur prioritaire est celui qui freine le plus ta progression vers ton objectif.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Le classement par catégorie est désormais centralisé dans
// `buildCategoryRanking` (src/lib/v2/unifiedLimiterDetection.ts) — source
// de vérité unique partagée avec le Coaching Compass.

