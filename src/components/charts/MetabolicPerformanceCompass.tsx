/**
 * Metabolic Performance Compass™ – Two For Coaching Lab
 * 
 * Graphique radar signature de l'application.
 * Synthétise VLamax, TTE, Race Readiness et Robustesse
 * dans une visualisation unique, pédagogique et staff-grade.
 */

import { useMemo, useState } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
  Compass, 
  Info, 
  AlertTriangle, 
  Shield, 
  User,
  TrendingUp,
  Zap,
  Target,
  Heart
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================
// TYPES
// =============================================

interface CompassData {
  // Valeurs effectives (obligatoires)
  vlamaxValue: number | null;
  vlamaxSource: string;
  vlamaxConfidence: number;
  tteValue: number | null;
  tteSource: string;
  tteConfidence: number;
  readinessScore: number | null;
  readinessDetails?: {
    vlamax: number;
    endurance: number;
    puissance: number;
    fraicheur: number;
  };
  // Contexte
  objectif: string;
  fatigueState?: "ok" | "warning" | "critical" | string;
  tss7d?: number | null;
  capInjuryRisk?: number; // 0-100
  nutritionalRisk?: number; // 0-100
}

interface CompassProjection {
  metabolicEfficiency?: number;
  sustainablePower?: number;
  raceAlignment?: number;
  robustness?: number;
}

interface MetabolicPerformanceCompassProps {
  data: CompassData;
  projection?: CompassProjection;
  showComparison?: boolean;
  staffMode?: boolean;
  className?: string;
}

// =============================================
// MÉTHODOLOGIE OFFICIELLE
// =============================================

export const COMPASS_METHODOLOGY = {
  title: "Metabolic Performance Compass™",
  subtitle: "Powered by Two For Coaching Lab",
  description: `Ce graphique représente l'équilibre métabolique global de l'athlète.
Il ne montre pas seulement "à quel point" l'athlète est fort,
mais COMMENT cette performance est produite, et à quel prix physiologique.

Un profil équilibré indique une performance durable.
Un profil déséquilibré révèle un axe prioritaire de travail.`,
  axes: [
    {
      id: "metabolicEfficiency",
      label: "Efficacité Métabolique",
      description: "Basé sur VLamax effectif. Plus VLamax est bas (aligné avec l'objectif), plus le score est élevé.",
      icon: "⚡"
    },
    {
      id: "sustainablePower",
      label: "Puissance Durable",
      description: "Basé sur TTE effectif. Score élevé si TTE ≥ cible objectif.",
      icon: "💪"
    },
    {
      id: "raceAlignment",
      label: "Alignement Course",
      description: "Race Readiness pondéré par objectif. Évalue la cohérence profil/objectif.",
      icon: "🎯"
    },
    {
      id: "robustness",
      label: "Robustesse",
      description: "Indice composite: fraîcheur, risque blessure, risque nutritionnel.",
      icon: "🛡️"
    }
  ],
  disclaimer: "Ce graphique guide la décision mais ne remplace pas le jugement du coach."
};

// =============================================
// CALCULS DES SCORES NORMALISÉS (0-100)
// =============================================

// Cibles par objectif
const getTargetsForGoal = (objectif: string) => {
  const goal = objectif.toLowerCase();
  
  if (goal.includes("im") || goal.includes("ironman") || goal.includes("kona")) {
    return { vlamaxIdeal: 0.35, vlamaxMax: 0.45, tteTarget: 55 };
  }
  if (goal.includes("703") || goal.includes("70.3")) {
    return { vlamaxIdeal: 0.40, vlamaxMax: 0.50, tteTarget: 50 };
  }
  if (goal.includes("marathon") && !goal.includes("semi")) {
    return { vlamaxIdeal: 0.38, vlamaxMax: 0.48, tteTarget: 52 };
  }
  if (goal.includes("semi")) {
    return { vlamaxIdeal: 0.45, vlamaxMax: 0.55, tteTarget: 47 };
  }
  if (goal.includes("trail")) {
    return { vlamaxIdeal: 0.40, vlamaxMax: 0.50, tteTarget: 55 };
  }
  // Default: 70.3
  return { vlamaxIdeal: 0.40, vlamaxMax: 0.50, tteTarget: 50 };
};

// AXE 1: Metabolic Efficiency (VLamax)
const computeMetabolicEfficiency = (
  vlamax: number | null,
  objectif: string
): { score: number; explanation: string } => {
  if (vlamax === null) {
    return { score: 50, explanation: "VLamax non disponible – score neutre" };
  }
  
  const targets = getTargetsForGoal(objectif);
  
  // Score inversé: plus VLamax est bas (proche de l'idéal), plus le score est haut
  if (vlamax <= targets.vlamaxIdeal) {
    return { 
      score: 100, 
      explanation: `VLamax optimale (${vlamax.toFixed(2)} ≤ ${targets.vlamaxIdeal})` 
    };
  }
  
  if (vlamax <= targets.vlamaxMax) {
    const range = targets.vlamaxMax - targets.vlamaxIdeal;
    const position = (vlamax - targets.vlamaxIdeal) / range;
    const score = Math.round(100 - (position * 30)); // 70-100
    return { 
      score, 
      explanation: `VLamax acceptable (${vlamax.toFixed(2)})` 
    };
  }
  
  // Au-dessus du max
  const excess = vlamax - targets.vlamaxMax;
  const score = Math.max(20, Math.round(70 - (excess * 200)));
  return { 
    score, 
    explanation: `VLamax élevée (${vlamax.toFixed(2)} > ${targets.vlamaxMax}) – profil glycolytique` 
  };
};

// AXE 2: Sustainable Power (TTE)
const computeSustainablePower = (
  tte: number | null,
  objectif: string
): { score: number; explanation: string } => {
  if (tte === null) {
    return { score: 50, explanation: "TTE non disponible – score neutre" };
  }
  
  const targets = getTargetsForGoal(objectif);
  
  if (tte >= targets.tteTarget + 5) {
    return { 
      score: 100, 
      explanation: `TTE excellent (${tte} min ≥ ${targets.tteTarget + 5} min)` 
    };
  }
  
  if (tte >= targets.tteTarget) {
    const score = 85 + Math.round(((tte - targets.tteTarget) / 5) * 15);
    return { 
      score: Math.min(100, score), 
      explanation: `TTE cible atteinte (${tte} min)` 
    };
  }
  
  if (tte >= targets.tteTarget - 5) {
    const deficit = targets.tteTarget - tte;
    const score = Math.round(85 - (deficit * 7));
    return { 
      score, 
      explanation: `TTE proche de la cible (${tte} min, cible: ${targets.tteTarget} min)` 
    };
  }
  
  // Largement sous la cible
  const deficit = targets.tteTarget - tte;
  const score = Math.max(20, Math.round(50 - (deficit * 3)));
  return { 
    score, 
    explanation: `TTE insuffisant (${tte} min << ${targets.tteTarget} min)` 
  };
};

// AXE 3: Race Alignment (Race Readiness)
const computeRaceAlignment = (
  readiness: number | null
): { score: number; explanation: string } => {
  if (readiness === null) {
    return { score: 50, explanation: "Race Readiness non calculable" };
  }
  
  // Le score Race Readiness est déjà 0-100, on l'utilise tel quel
  let explanation: string;
  if (readiness >= 85) {
    explanation = "Alignement excellent avec l'objectif";
  } else if (readiness >= 70) {
    explanation = "Bon alignement, ajustements mineurs possibles";
  } else if (readiness >= 50) {
    explanation = "Alignement partiel, travail en cours";
  } else {
    explanation = "Désalignement significatif avec l'objectif";
  }
  
  return { score: readiness, explanation };
};

// AXE 4: Robustness (composite)
const computeRobustness = (
  fatigueState?: string,
  readinessDetails?: { fraicheur: number },
  capInjuryRisk?: number,
  nutritionalRisk?: number
): { score: number; explanation: string } => {
  let score = 70; // Base
  const factors: string[] = [];
  
  // Fatigue state
  if (fatigueState === "ok") {
    score += 15;
    factors.push("fraîcheur ok");
  } else if (fatigueState === "warning") {
    score -= 10;
    factors.push("fatigue modérée");
  } else if (fatigueState === "critical") {
    score -= 25;
    factors.push("fatigue critique");
  }
  
  // Readiness fraîcheur component
  if (readinessDetails?.fraicheur !== undefined) {
    const fraicheurNorm = (readinessDetails.fraicheur / 25) * 20;
    score += (fraicheurNorm - 10); // Ajuste de -10 à +10
  }
  
  // CAP Injury Risk (0 = pas de risque, 100 = risque max)
  if (capInjuryRisk !== undefined) {
    score -= (capInjuryRisk * 0.2); // Pénalité max -20
    if (capInjuryRisk > 50) factors.push("risque blessure CAP");
  }
  
  // Nutritional Risk
  if (nutritionalRisk !== undefined) {
    score -= (nutritionalRisk * 0.15); // Pénalité max -15
    if (nutritionalRisk > 50) factors.push("risque nutritionnel");
  }
  
  score = Math.max(20, Math.min(100, Math.round(score)));
  
  const explanation = factors.length > 0 
    ? `Facteurs: ${factors.join(", ")}`
    : "Profil robuste et stable";
  
  return { score, explanation };
};

// =============================================
// TOOLTIP PERSONNALISÉ
// =============================================

const CustomTooltip = ({ active, payload, staffMode }: any) => {
  if (!active || !payload || !payload.length) return null;
  
  const dataPoint = payload[0].payload;
  
  return (
    <div className="bg-background/95 backdrop-blur border border-border rounded-lg p-3 shadow-lg max-w-xs">
      <p className="font-semibold text-foreground flex items-center gap-2 mb-2">
        <span>{dataPoint.icon}</span>
        <span>{dataPoint.axis}</span>
      </p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Score actuel:</span>
          <span 
            className="font-mono font-semibold"
            style={{ color: getScoreColor(dataPoint.current) }}
          >
            {dataPoint.current}/100
          </span>
        </div>
        {dataPoint.projected !== undefined && dataPoint.projected !== dataPoint.current && (
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Projeté:</span>
            <span className="font-mono text-success">{dataPoint.projected}/100</span>
          </div>
        )}
        {staffMode && dataPoint.explanation && (
          <p className="text-xs text-muted-foreground border-t border-border pt-2 mt-2">
            {dataPoint.explanation}
          </p>
        )}
      </div>
    </div>
  );
};

// =============================================
// HELPERS
// =============================================

const getScoreColor = (score: number): string => {
  if (score >= 80) return "hsl(var(--success))";
  if (score >= 60) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
};

const getOverallStatus = (avgScore: number): {
  label: string;
  color: string;
  description: string;
} => {
  if (avgScore >= 85) {
    return {
      label: "Équilibre Optimal",
      color: "hsl(var(--success))",
      description: "Profil métabolique aligné et durable"
    };
  }
  if (avgScore >= 70) {
    return {
      label: "Bon Équilibre",
      color: "hsl(var(--success))",
      description: "Profil solide avec marge de progression"
    };
  }
  if (avgScore >= 55) {
    return {
      label: "En Progression",
      color: "hsl(var(--warning))",
      description: "Axes de travail identifiés"
    };
  }
  return {
    label: "Rééquilibrage Requis",
    color: "hsl(var(--destructive))",
    description: "Déséquilibre significatif à adresser"
  };
};

// =============================================
// COMPOSANT PRINCIPAL
// =============================================

export function MetabolicPerformanceCompass({
  data,
  projection,
  showComparison = false,
  staffMode: initialStaffMode = false,
  className
}: MetabolicPerformanceCompassProps) {
  const [staffMode, setStaffMode] = useState(initialStaffMode);
  const [showProjection, setShowProjection] = useState(showComparison);
  
  // Calcul des scores
  const scores = useMemo(() => {
    const metabolic = computeMetabolicEfficiency(data.vlamaxValue, data.objectif);
    const sustainable = computeSustainablePower(data.tteValue, data.objectif);
    const alignment = computeRaceAlignment(data.readinessScore);
    const robust = computeRobustness(
      data.fatigueState,
      data.readinessDetails,
      data.capInjuryRisk,
      data.nutritionalRisk
    );
    
    return {
      metabolicEfficiency: metabolic,
      sustainablePower: sustainable,
      raceAlignment: alignment,
      robustness: robust
    };
  }, [data]);
  
  // Données pour le radar
  const chartData = useMemo(() => {
    return [
      {
        axis: "Efficacité Métabolique",
        icon: "⚡",
        current: scores.metabolicEfficiency.score,
        projected: projection?.metabolicEfficiency ?? scores.metabolicEfficiency.score,
        explanation: scores.metabolicEfficiency.explanation,
        fullMark: 100
      },
      {
        axis: "Puissance Durable",
        icon: "💪",
        current: scores.sustainablePower.score,
        projected: projection?.sustainablePower ?? scores.sustainablePower.score,
        explanation: scores.sustainablePower.explanation,
        fullMark: 100
      },
      {
        axis: "Alignement Course",
        icon: "🎯",
        current: scores.raceAlignment.score,
        projected: projection?.raceAlignment ?? scores.raceAlignment.score,
        explanation: scores.raceAlignment.explanation,
        fullMark: 100
      },
      {
        axis: "Robustesse",
        icon: "🛡️",
        current: scores.robustness.score,
        projected: projection?.robustness ?? scores.robustness.score,
        explanation: scores.robustness.explanation,
        fullMark: 100
      }
    ];
  }, [scores, projection]);
  
  // Score moyen
  const avgScore = useMemo(() => {
    return Math.round(
      (scores.metabolicEfficiency.score +
        scores.sustainablePower.score +
        scores.raceAlignment.score +
        scores.robustness.score) / 4
    );
  }, [scores]);
  
  const overallStatus = getOverallStatus(avgScore);
  
  // Confiance moyenne
  const avgConfidence = (data.vlamaxConfidence + data.tteConfidence) / 2;
  const isLowConfidence = avgConfidence < 0.5;
  
  // Vérifier si des données manquent
  const hasMissingData = data.vlamaxValue === null || data.tteValue === null || data.readinessScore === null;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Compass className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">
                Metabolic Performance Compass™
              </CardTitle>
              <CardDescription className="text-xs">
                Powered by Two For Coaching Lab
              </CardDescription>
            </div>
          </div>
          
          {/* Toggle Staff Mode */}
          <div className="flex items-center gap-2">
            <User className={cn("w-4 h-4", !staffMode && "text-primary")} />
            <Switch
              checked={staffMode}
              onCheckedChange={setStaffMode}
              className="data-[state=checked]:bg-primary"
            />
            <Shield className={cn("w-4 h-4", staffMode && "text-primary")} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Alerte confiance faible */}
        {isLowConfidence && (
          <div className="p-2 bg-warning/10 border border-warning/30 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <p className="text-xs text-warning">
              Confiance données: {Math.round(avgConfidence * 100)}% – Interpréter avec prudence
            </p>
          </div>
        )}
        
        {/* Alerte données manquantes */}
        {hasMissingData && (
          <div className="p-2 bg-muted border border-border rounded-lg flex items-start gap-2">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Certaines données sont estimées ou manquantes – Scores partiels
            </p>
          </div>
        )}
        
        {/* Score global */}
        <div 
          className="p-3 rounded-lg text-center"
          style={{ backgroundColor: `${overallStatus.color}15` }}
        >
          <div className="flex items-center justify-center gap-3">
            <div 
              className="text-3xl font-bold font-mono"
              style={{ color: overallStatus.color }}
            >
              {avgScore}
            </div>
            <div className="text-left">
              <p className="font-semibold" style={{ color: overallStatus.color }}>
                {overallStatus.label}
              </p>
              <p className="text-xs text-muted-foreground">
                {overallStatus.description}
              </p>
            </div>
          </div>
        </div>
        
        {/* Radar Chart */}
        <div className="h-56 sm:h-72 -mx-4">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <PolarGrid 
                stroke="hsl(var(--border))" 
                strokeOpacity={0.5}
              />
              <PolarAngleAxis 
                dataKey="axis" 
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
              />
              <PolarRadiusAxis 
                angle={90} 
                domain={[0, 100]} 
                tick={{ fontSize: 9 }}
                tickCount={5}
                stroke="hsl(var(--border))"
              />
              
              {/* Polygone projeté (si activé) */}
              {showProjection && projection && (
                <Radar
                  name="Projeté"
                  dataKey="projected"
                  stroke="hsl(var(--success))"
                  fill="hsl(var(--success))"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              )}
              
              {/* Polygone actuel */}
              <Radar
                name="Actuel"
                dataKey="current"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.25}
                strokeWidth={2}
                dot={{ r: 4, fill: "hsl(var(--primary))" }}
                animationDuration={600}
                animationEasing="ease-out"
              />
              
              <Tooltip content={<CustomTooltip staffMode={staffMode} />} />
              
              {showProjection && projection && (
                <Legend 
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => (
                    <span className="text-xs">{value}</span>
                  )}
                />
              )}
            </RadarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Toggle comparaison */}
        {projection && (
          <div className="flex items-center justify-center gap-3 p-2 bg-muted/50 rounded-lg">
            <Label htmlFor="compare-toggle" className="text-sm text-muted-foreground">
              Comparer avec projection
            </Label>
            <Switch
              id="compare-toggle"
              checked={showProjection}
              onCheckedChange={setShowProjection}
            />
          </div>
        )}
        
        {/* Détails des axes (mode staff) */}
        {staffMode && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Détails par axe:</p>
            <div className="grid grid-cols-2 gap-2">
              {chartData.map((axis) => (
                <div 
                  key={axis.axis}
                  className="p-2 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-sm">{axis.icon}</span>
                    <span className="text-xs font-medium truncate">{axis.axis}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span 
                      className="text-lg font-bold font-mono"
                      style={{ color: getScoreColor(axis.current) }}
                    >
                      {axis.current}
                    </span>
                    {showProjection && axis.projected !== axis.current && (
                      <span className="text-xs text-success flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {axis.projected}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">
                    {axis.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Sources des données (mode staff) */}
        {staffMode && (
          <div className="p-2 bg-muted/50 rounded-lg text-xs space-y-1">
            <p className="font-medium text-muted-foreground">Sources des données:</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">VLamax:</span>
                <span>{data.vlamaxSource} ({Math.round(data.vlamaxConfidence * 100)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">TTE:</span>
                <span>{data.tteSource} ({Math.round(data.tteConfidence * 100)}%)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Objectif:</span>
                <span>{data.objectif}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fatigue:</span>
                <span>{data.fatigueState || "—"}</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Texte pédagogique (mode athlète) */}
        {!staffMode && (
          <div className="p-3 bg-muted/30 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {COMPASS_METHODOLOGY.description.split('\n')[0]}
            </p>
          </div>
        )}
        
        {/* Disclaimer */}
        <p className="text-[10px] text-muted-foreground text-center">
          {COMPASS_METHODOLOGY.disclaimer}
        </p>
      </CardContent>
    </Card>
  );
}

// =============================================
// EXPORT VERSION SIMPLIFIÉE
// =============================================

export function CompassMini({
  data,
  className
}: {
  data: CompassData;
  className?: string;
}) {
  const scores = useMemo(() => {
    const metabolic = computeMetabolicEfficiency(data.vlamaxValue, data.objectif);
    const sustainable = computeSustainablePower(data.tteValue, data.objectif);
    const alignment = computeRaceAlignment(data.readinessScore);
    const robust = computeRobustness(data.fatigueState, data.readinessDetails);
    
    return [
      { label: "Efficacité", score: metabolic.score, icon: Zap },
      { label: "Durabilité", score: sustainable.score, icon: Heart },
      { label: "Alignement", score: alignment.score, icon: Target },
      { label: "Robustesse", score: robust.score, icon: Shield },
    ];
  }, [data]);
  
  const avgScore = Math.round(scores.reduce((a, b) => a + b.score, 0) / 4);
  const status = getOverallStatus(avgScore);
  
  return (
    <div className={cn("p-3 rounded-lg border border-border bg-card", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Compass className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Compass™</span>
        <span 
          className="ml-auto text-lg font-bold font-mono"
          style={{ color: status.color }}
        >
          {avgScore}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {scores.map((s) => (
          <div key={s.label} className="text-center">
            <s.icon 
              className="w-4 h-4 mx-auto mb-0.5"
              style={{ color: getScoreColor(s.score) }}
            />
            <div 
              className="text-xs font-mono"
              style={{ color: getScoreColor(s.score) }}
            >
              {s.score}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}