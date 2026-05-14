/**
 * Synthèse Exécutive Card — V3.0
 * Résumé stratégique unifié basé sur detectUnifiedLimiter (source unique de vérité)
 * ✅ Cohérence garantie avec Compass et Plan IA
 * ✅ Seuils contextualisés par ambition
 * ✅ "Potentiel Physiologique" → "Potentiel Physiologique"
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, CheckCircle2, AlertTriangle, XCircle, Zap, Target, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VLamaxEffectif, TTEEffectif } from "@/engines/diagnostic";
import type { UnifiedLimiterResult } from "@/lib/v2/unifiedLimiterDetection";
import { AmbitionLevel, DEFAULT_AMBITION, getAmbitionDefinition } from "@/types/ambitionLevel";
import {
  evaluateVLamax,
  evaluateTTE,
  evaluateFtpKg,
  evaluateVO2max,
  type MetricStatus,
} from "@/lib/ambitionThresholds";

interface SyntheseExecutiveCardProps {
  athleteName: string;
  objectif: string;
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  limiterResult: UnifiedLimiterResult | null;
  ftp: number | null;
  poids: number | null;
  vo2max: number | null;
  completude: { score: number; manquants: string[] };
  ambition?: AmbitionLevel;
  athleteAge?: number | null;
  sportFocus?: "bike" | "run" | "tri" | string | null;
}

// Map metric names from gapAnalysis to pillar groups
const PILLAR_CONFIG = [
  {
    key: "Profil Métabolique",
    icon: "🧬",
    description: "VLamax vs cible objectif",
    metrics: ["VLamax"],
  },
  {
    key: "Endurance Spécifique",
    icon: "🏋️",
    description: "TTE et durabilité",
    metrics: ["TTE"],
  },
  {
    key: "Puissance Aérobie",
    icon: "⚡",
    description: "FTP/kg et VO₂max",
    metrics: ["FTP/kg", "VO2max"],
  },
] as const;

const PILLAR_ADVICE: Record<string, string> = {
  "Profil Métabolique": "Travailler l'abaissement du VLamax via endurance longue, train-low et cadence basse.",
  "Endurance Spécifique": "Augmenter le TTE via du volume Z2, des sorties longues progressives et du travail au seuil.",
  "Puissance Aérobie": "Développer la puissance aérobie via intervalles VO₂max, sweet-spot et travail de force.",
};

function computePillarScore(
  limiter: UnifiedLimiterResult,
  metricNames: readonly string[],
  availableMetrics: Set<string>,
): number | null {
  // Missing Data Policy: if NO metric of this pillar is available, return null (insufficient)
  const hasAnyData = metricNames.some(m => availableMetrics.has(m));
  if (!hasAnyData) return null;

  const gaps = limiter.gapAnalysis.filter(g => metricNames.includes(g.metric));
  if (gaps.length === 0) return null;

  // Scoring continu (0-25) basé sur gapPercent pour éviter les sauts brutaux
  // entre paliers (limiting → acceptable → optimal). Plus le gap négatif est
  // grand, plus le score baisse linéairement. Une marge >= +5% donne le max.
  // Mapping: +5% ou plus → 25 ; 0% → 22 ; -10% → 17 ; -20% → 12 ; -30% → 7 ; -40%+ → 0.
  const scoreFromGap = (gapPercent: number | undefined, status: string): number => {
    if (typeof gapPercent === "number" && Number.isFinite(gapPercent)) {
      // Au-dessus de la cible: léger bonus capé à 25
      if (gapPercent >= 5) return 25;
      // Échelle linéaire: chaque 1% sous la cible = -0.5 point, base 22 à 0%
      const raw = 22 + (gapPercent / 5) * 1.5; // -10% → 22 - 3 = 19 ... ajustons
      // Recalcul plus lisible: base 22 à 0%, perte 0.55/point%
      const linear = 22 + gapPercent * 0.55;
      return Math.max(0, Math.min(25, linear));
    }
    // Fallback si gapPercent absent
    if (status === "optimal") return 25;
    if (status === "acceptable") return 18;
    if (status === "limiting") return 8;
    return 0;
  };

  let totalScore = 0;
  let counted = 0;
  for (const gap of gaps) {
    if (!availableMetrics.has(gap.metric)) continue;
    if (gap.status === "unknown") continue;
    counted++;
    totalScore += scoreFromGap(gap.gapPercent, gap.status);
  }
  if (counted === 0) return null;
  return Math.round((totalScore / counted) * 10) / 10;
}

function computeGlobalScore(pillarScores: (number | null)[]): number {
  const valid = pillarScores.filter((v): v is number => v !== null);
  if (valid.length === 0) return 0;
  const total = valid.reduce((s, v) => s + v, 0);
  const maxTotal = valid.length * 25;
  return Math.round((total / maxTotal) * 100);
}

export function SyntheseExecutiveCard({
  athleteName, objectif, vlamaxEffectif, tteEffectif, limiterResult,
  ftp, poids, vo2max, completude, ambition = DEFAULT_AMBITION, athleteAge, sportFocus
}: SyntheseExecutiveCardProps) {
  const ftpKg = ftp && poids && poids > 0 ? ftp / poids : null;
  const ftpKgStr = ftpKg !== null ? ftpKg.toFixed(2) : null;
  const ambDef = getAmbitionDefinition(ambition);

  const statusIcon = (status: MetricStatus) => {
    switch (status) {
      case "ok": return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case "warning": return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
      case "critical": return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      default: return <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  // Build set of available metrics (used by both guard and pillars)
  const availableMetrics = new Set<string>();
  if (vlamaxEffectif.value !== null && vlamaxEffectif.source !== "unknown") availableMetrics.add("VLamax");
  if (tteEffectif.tte_min > 0 && tteEffectif.source !== "unknown") availableMetrics.add("TTE");
  if (ftpKg !== null) availableMetrics.add("FTP/kg");
  if (vo2max) availableMetrics.add("VO2max");

  // Guard: données insuffisantes — aucune métrique mesurée disponible
  const isInsufficient = availableMetrics.size === 0;

  if (isInsufficient || !limiterResult) {
    return (
      <Card className="opacity-60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Synthèse Exécutive — {athleteName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">Données insuffisantes</p>
            <p className="text-xs mt-1 text-center max-w-xs">
              Ajoutez un snapshot avec FTP, VLamax ou VO₂max pour générer la synthèse.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Build summary items with ambition-aware thresholds
  const items: { label: string; value: string; status: MetricStatus; source: string; target: string }[] = [];
  
  if (vlamaxEffectif.value !== null && vlamaxEffectif.source !== "unknown") {
    const eval_ = evaluateVLamax(vlamaxEffectif.value, objectif, ambition, athleteAge, sportFocus);
    items.push({ label: "VLamax", value: `${vlamaxEffectif.value.toFixed(2)} mmol/L/s`, status: eval_.status, source: vlamaxEffectif.source, target: eval_.target });
  }
  
  if (tteEffectif.tte_min > 0 && tteEffectif.source !== "unknown") {
    const eval_ = evaluateTTE(tteEffectif.tte_min, objectif, ambition, athleteAge);
    items.push({ label: "TTE", value: `${tteEffectif.tte_min} min`, status: eval_.status, source: tteEffectif.source, target: eval_.target });
  }
  
  if (ftpKgStr) {
    const eval_ = evaluateFtpKg(ftpKg, objectif, ambition, athleteAge);
    items.push({ label: "FTP/kg", value: `${ftpKgStr} W/kg`, status: eval_.status, source: "snapshot", target: eval_.target });
  }
  
  if (vo2max) {
    const eval_ = evaluateVO2max(vo2max, objectif, ambition, athleteAge);
    items.push({ label: "VO₂max", value: `${vo2max} ml/kg/min`, status: eval_.status, source: "snapshot", target: eval_.target });
  }

  // V3.0: Pillar scores derived from unified limiter gapAnalysis
  const pillarScores = PILLAR_CONFIG.map(pillar => ({
    ...pillar,
    score: computePillarScore(limiterResult, pillar.metrics, availableMetrics),
  }));

  const globalScore = computeGlobalScore(pillarScores.map(p => p.score));

  // The weakest pillar (parmi ceux ayant des données)
  const scoredPillars = pillarScores.filter(p => p.score !== null);
  const weakestPillar = scoredPillars.length > 0
    ? scoredPillars.reduce((min, p) => (p.score! < min.score! ? p : min), scoredPillars[0])
    : null;

  // Global score labels
  const scoreColor = globalScore >= 80 ? "text-green-600 dark:text-green-400"
    : globalScore >= 60 ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
  const scoreBg = globalScore >= 80 ? "bg-green-500/10 border-green-500/30"
    : globalScore >= 60 ? "bg-amber-500/10 border-amber-500/30" : "bg-red-500/10 border-red-500/30";
  const scoreLabel = globalScore >= 80 ? "Profil aligné"
    : globalScore >= 60 ? "En progression" : "Préparation requise";

  // Cross-reference: show the unified limiter's primary for coherence badge
  const limiterLabel = limiterResult.limiterLabel;
  const leverLabel = limiterResult.leverLabel;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Synthèse Exécutive — {athleteName}
          </CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {ambDef.icon} {ambDef.shortLabel}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Potentiel Physiologique Score */}
        <div className={cn("rounded-xl p-4 border-2 text-center", scoreBg)}>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Potentiel Physiologique</p>
          </div>
          <p className={cn("text-4xl font-black mt-1", scoreColor)}>
            {globalScore}%
          </p>
          <p className={cn("text-sm font-semibold", scoreColor)}>{scoreLabel}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {objectif} • {ambDef.shortLabel}
          </p>
        </div>

        {/* Key indicators grid */}
        <div className="grid grid-cols-2 gap-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              {statusIcon(item.status)}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className="text-[9px] text-muted-foreground/70">{item.target}</p>
                </div>
                <p className="text-sm font-semibold truncate">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Piliers du Potentiel — derived from unified limiter */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-primary" />
            <p className="text-xs font-medium">Piliers du Potentiel</p>
          </div>
          <div className="space-y-2">
            {pillarScores.map((pillar) => {
              const hasData = pillar.score !== null;
              const pct = hasData ? Math.min(100, Math.round((pillar.score! / 25) * 100)) : 0;
              const isWeakest = hasData && weakestPillar?.key === pillar.key;
              return (
                <div key={pillar.key} className="space-y-0.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">{pillar.icon}</span>
                      <span className={cn(
                        "text-xs",
                        isWeakest ? "font-semibold text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                      )}>
                        {pillar.key}
                      </span>
                      {isWeakest && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30">
                          Axe prioritaire
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs font-mono font-medium">
                      {hasData ? `${pillar.score!.toFixed(1)}/25` : "— Données insuffisantes"}
                    </span>
                  </div>
                  <Progress value={pct} className={cn("h-1.5", isWeakest && "[&>div]:bg-amber-500")} />
                  <p className="text-[10px] text-muted-foreground">{pillar.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Focus recommendation — uses unified limiter lever */}
        {limiterResult.primaryLimiter !== "none" && (
          <div className="rounded-lg p-3 bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-primary" />
              <p className="text-xs font-semibold text-primary">Axe de développement prioritaire</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {limiterResult.limiterEmoji} <strong>{limiterLabel}</strong> → {limiterResult.leverEmoji} {leverLabel}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {PILLAR_ADVICE[weakestPillar.key] ?? limiterResult.limiterExplanation}
            </p>
          </div>
        )}

        {/* Data completeness */}
        <div className="rounded-lg p-3 bg-muted/30">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-medium">Complétude des données</p>
            <Badge variant={completude.score >= 80 ? "default" : "secondary"} className="text-[10px]">
              {completude.score}%
            </Badge>
          </div>
          <Progress value={completude.score} className="h-1.5" />
          {completude.manquants.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-1.5">
              Manquant : {completude.manquants.join(", ")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
