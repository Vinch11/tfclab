/**
 * Metabolic Performance Compass™ V2 – Two For Coaching Lab
 * VERSION AMÉLIORÉE avec graphique précis et lisible
 * + Explications détaillées pour chaque axe
 * + Valeurs numériques claires sur le radar
 * + Zones de performance visuelles
 */

import { useMemo, useState } from "react";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Compass, AlertTriangle, Shield, User, Info, GitCompare, Sparkles, TrendingUp, Target, Zap, Activity, HelpCircle, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeCRR } from "@/lib/chargeRecenteReference";
import { computeCompassScores, CompassAxisScore } from "@/lib/compassScoring";
import type { VLamaxEffectif, TTEEffectif } from "@/engines/diagnostic";
import { AmbitionLevel, AMBITION_LEVELS_ORDERED, getAmbitionDefinition, DEFAULT_AMBITION } from "@/types/ambitionLevel";
import { computeAgeAdjustmentIndex, getAgeAdjustedTargets } from "@/lib/ageAdjustment";

// =============================================
// TYPES
// =============================================

interface CompassData {
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  ftp: number | null;
  poids: number | null;
  tss7d: number | null;
  snapshotDate?: string | null;
  snapshotUpdatedAt?: string | null;
  objectif: string;
  fatigueState?: string;
  ambition?: AmbitionLevel;
  athleteAge?: number | null;
  // Running
  vma?: number | null;
  sportFocus?: "bike" | "run" | "triathlon" | null;
}

interface MetabolicPerformanceCompassV2Props {
  data: CompassData;
  staffMode?: boolean;
  className?: string;
  compact?: boolean;
}

// Couleurs pour chaque niveau d'ambition
const AMBITION_COLORS: Record<AmbitionLevel, string> = {
  finisher: "hsl(var(--muted-foreground))",   // Découverte
  age_group: "hsl(210, 80%, 55%)",             // Confirmé
  competitor: "hsl(38, 92%, 50%)",             // Compétiteur
  elite: "hsl(25, 90%, 55%)",                  // Qualifiable
  world_class: "hsl(270, 70%, 60%)"            // Elite (top 3%)
};

// Couleurs de gradient pour le score global
const SCORE_GRADIENTS = {
  excellent: "from-emerald-500/20 via-emerald-500/10 to-transparent",
  good: "from-green-500/20 via-green-500/10 to-transparent",
  moderate: "from-amber-500/20 via-amber-500/10 to-transparent",
  low: "from-red-500/20 via-red-500/10 to-transparent",
};

// Icônes pour chaque axe
const AXIS_ICONS = {
  capaciteAerobie: Zap,
  toleranceEffort: Activity,
  profilMetabolique: Target,
  robustesse: Shield,
};

// Descriptions détaillées des axes
const AXIS_DETAILS: Record<string, { 
  title: string; 
  description: string; 
  whatItMeans: string;
  howToImprove: string[];
  icon: string;
}> = {
  capaciteAerobie: {
    title: "Capacité Aérobie",
    description: "Mesure le potentiel aérobie via le rapport FTP/kg (vélo) ou la VMA (running) par rapport à la cible de l'ambition.",
    whatItMeans: "Plus le score est élevé, plus l'athlète peut maintenir une puissance/vitesse relative élevée. Score >80 = niveau cible atteint.",
    howToImprove: [
      "Augmenter le volume d'entraînement Z2",
      "Blocs tempo (88-94% FTP ou allure seuil)",
      "Intervalles au seuil",
      "Optimiser le poids (si nécessaire)"
    ],
    icon: "⚡"
  },
  toleranceEffort: {
    title: "Tolérance à l'Effort",
    description: "Évalue la durabilité via le TTE (Time to Exhaustion) par rapport à la cible.",
    whatItMeans: "Score élevé = capacité à maintenir l'intensité seuil longtemps. Crucial pour Ironman/Marathon. Score >80 = excellente durabilité.",
    howToImprove: [
      "Blocs tempo longs (40-60 min à 88-92% FTP)",
      "Sorties longues en endurance",
      "Intervalles progressifs au seuil",
      "Travail spécifique course/triathlon"
    ],
    icon: "💪"
  },
  profilMetabolique: {
    title: "Profil Métabolique",
    description: "Mesure l'écart entre VLamax actuel et VLamax optimal pour l'objectif.",
    whatItMeans: "Score 100 = VLamax parfaitement adapté à l'objectif. Score bas = décalage entre profil et objectif (trop glycolytique ou trop aérobie).",
    howToImprove: [
      "Si VLamax trop élevée: plus d'endurance, moins de sprint",
      "Si VLamax trop basse: intervalles courts, sprints",
      "Ajuster selon l'objectif (IM = basse, Sprint = haute)",
      "Patience: 12-24 semaines pour modifier significativement"
    ],
    icon: "🎯"
  },
  robustesse: {
    title: "Robustesse",
    description: "Score composite: durabilité + profil métabolique + gestion de la charge.",
    whatItMeans: "Indique la capacité à performer de façon constante et à résister à la fatigue. Score >80 = athlète solide et fiable.",
    howToImprove: [
      "Respecter la progressivité de charge",
      "Optimiser la récupération",
      "Éviter les pics de charge non planifiés",
      "Travail combiné endurance + métabolique"
    ],
    icon: "🛡️"
  }
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return "hsl(142, 76%, 36%)";
  if (score >= 70) return "hsl(142, 71%, 45%)";
  if (score >= 50) return "hsl(45, 93%, 47%)";
  return "hsl(0, 84%, 60%)";
};

const getScoreLabel = (score: number): string => {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Prêt";
  if (score >= 50) return "En progression";
  return "À développer";
};

const getScoreGradient = (score: number): string => {
  if (score >= 80) return SCORE_GRADIENTS.excellent;
  if (score >= 70) return SCORE_GRADIENTS.good;
  if (score >= 50) return SCORE_GRADIENTS.moderate;
  return SCORE_GRADIENTS.low;
};

// Custom tick for radar that shows values
const CustomAxisTick = ({ payload, x, y, cx, cy, ...rest }: any) => {
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        {...rest}
        textAnchor={x > cx ? "start" : x < cx ? "end" : "middle"}
        dominantBaseline={y > cy ? "hanging" : y < cy ? "auto" : "middle"}
        className="fill-foreground font-medium"
        fontSize={12}
      >
        {payload.value}
      </text>
    </g>
  );
};

export function MetabolicPerformanceCompassV2({ 
  data, 
  staffMode: initialStaffMode = false, 
  className,
  compact = false 
}: MetabolicPerformanceCompassV2Props) {
  const [staffMode, setStaffMode] = useState(initialStaffMode);
  const [compareMode, setCompareMode] = useState(false);
  const isMobile = useIsMobile();
  
  const currentAmbition = data.ambition || DEFAULT_AMBITION;
  const athleteAge = data.athleteAge ?? null;
  
  // Info d'ajustement par âge
  const ageInfo = useMemo(() => computeAgeAdjustmentIndex(athleteAge), [athleteAge]);
  const ageTargets = useMemo(() => getAgeAdjustedTargets(data.objectif, athleteAge, currentAmbition), [data.objectif, currentAmbition, athleteAge]);
  
  const isRunning = data.sportFocus === "run";
  
  // Scores pour l'ambition actuelle
  const scores = useMemo(() => {
    const crr = computeCRR({ tss7d: data.tss7d, snapshotDate: data.snapshotDate, snapshotUpdatedAt: data.snapshotUpdatedAt });
    return computeCompassScores({
      ftp: data.ftp,
      poids: data.poids,
      vlamaxEffectif: data.vlamaxEffectif,
      tteEffectif: data.tteEffectif,
      crr,
      objectif: data.objectif,
      ambition: currentAmbition,
      athleteAge,
      vma: data.vma,
      sportFocus: data.sportFocus,
    });
  }, [data, currentAmbition, athleteAge]);

  // Guard: si aucune donnée réelle, afficher un placeholder
  if (scores.dataCompleteness === 0) {
    return (
      <Card className={cn("border-dashed border-muted-foreground/30", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base text-muted-foreground">Metabolic Performance Compass™</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Données insuffisantes</p>
              <p className="text-xs text-muted-foreground/70 mt-1 max-w-xs">
                Renseignez au moins FTP, poids ou VLamax dans un snapshot pour activer le Compass.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Scores pour tous les niveaux d'ambition (mode comparaison)
  const allAmbitionScores = useMemo(() => {
    if (!compareMode) return null;
    
    const crr = computeCRR({ tss7d: data.tss7d, snapshotDate: data.snapshotDate, snapshotUpdatedAt: data.snapshotUpdatedAt });
    
    return AMBITION_LEVELS_ORDERED.reduce((acc, ambition) => {
      acc[ambition] = computeCompassScores({
        ftp: data.ftp,
        poids: data.poids,
        vlamaxEffectif: data.vlamaxEffectif,
        tteEffectif: data.tteEffectif,
        crr,
        objectif: data.objectif,
        ambition,
        vma: data.vma,
        sportFocus: data.sportFocus,
      });
      return acc;
    }, {} as Record<AmbitionLevel, ReturnType<typeof computeCompassScores>>);
  }, [data, compareMode]);

  // Données enrichies pour le chart
  const chartData = [
    { 
      axis: isRunning ? "Capacité\nAérobie (VMA)" : "Capacité\nAérobie", 
      axisShort: isRunning ? "VMA" : "Aérobie",
      icon: isRunning ? "🏃" : "⚡", 
      current: scores.capaciteAerobie.score, 
      target: 80,
      raw: scores.capaciteAerobie.rawScore,
      explanation: scores.capaciteAerobie.explanation, 
      formula: scores.capaciteAerobie.formula, 
      confidence: scores.capaciteAerobie.confidence,
      fullMark: 100 
    },
    { 
      axis: "Tolérance\nEffort", 
      axisShort: "TTE",
      icon: "💪", 
      current: scores.toleranceEffort.score, 
      target: 80,
      raw: scores.toleranceEffort.rawScore,
      explanation: scores.toleranceEffort.explanation, 
      formula: scores.toleranceEffort.formula, 
      confidence: scores.toleranceEffort.confidence,
      fullMark: 100 
    },
    { 
      axis: "Profil\nMétabolique", 
      axisShort: "Métabo",
      icon: "🎯", 
      current: scores.profilMetabolique.score, 
      target: 80,
      raw: scores.profilMetabolique.rawScore,
      explanation: scores.profilMetabolique.explanation, 
      formula: scores.profilMetabolique.formula, 
      confidence: scores.profilMetabolique.confidence,
      fullMark: 100 
    },
    { 
      axis: "Robustesse", 
      axisShort: "Robust",
      icon: "🛡️", 
      current: scores.robustesse.score, 
      target: 80,
      raw: scores.robustesse.rawScore,
      explanation: scores.robustesse.explanation, 
      formula: scores.robustesse.formula, 
      confidence: scores.robustesse.confidence,
      fullMark: 100 
    },
  ];

  const globalColor = getScoreColor(scores.globalScore);
  const globalGradient = getScoreGradient(scores.globalScore);
  const ambDef = getAmbitionDefinition(currentAmbition);

  // Identifier le point fort et le point faible
  const sortedAxes = [...chartData].sort((a, b) => b.current - a.current);
  const strongest = sortedAxes[0];
  const weakest = sortedAxes[sortedAxes.length - 1];

  // =============================================
  // MODE COMPACT
  // =============================================
  if (compact) {
    return (
      <div className={cn("p-4 rounded-xl border bg-card", className)}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
            <Compass className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Metabolic Performance Compass™</h3>
            <p className="text-[10px] text-muted-foreground">Score global pour {ambDef.label}</p>
          </div>
        </div>
        
        <div className={cn("p-4 rounded-xl mb-4 bg-gradient-to-br", globalGradient)}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black tabular-nums" style={{ color: globalColor }}>
                  {scores.globalScore}
                </span>
                <span className="text-sm text-muted-foreground">/100</span>
              </div>
              <p className="text-sm font-semibold mt-1" style={{ color: globalColor }}>
                {getScoreLabel(scores.globalScore)}
              </p>
            </div>
            <Badge variant="outline" className={cn("text-xs", ambDef.color)}>
              {ambDef.icon} {ambDef.shortLabel}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          {chartData.map((axis) => (
            <div key={axis.axisShort} className="flex items-center gap-3">
              <span className="text-lg w-6 text-center">{axis.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">{axis.axisShort}</span>
                  <span className="font-bold tabular-nums" style={{ color: getScoreColor(axis.current) }}>
                    {axis.current}
                  </span>
                </div>
                <Progress value={axis.current} className="h-1.5" />
              </div>
            </div>
          ))}
        </div>

        {scores.mainLimitation && (
          <div className="mt-3 p-2 bg-amber-500/10 rounded-lg flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Priorité: {scores.mainLimitation}</span>
          </div>
        )}
      </div>
    );
  }

  // =============================================
  // MODE COMPLET AMÉLIORÉ
  // =============================================
  return (
    <Card className={cn("overflow-hidden border-0 shadow-lg", className)}>
      <CardHeader className="pb-2 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
                <Compass className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                Metabolic Performance Compass™
                <Sparkles className="w-4 h-4 text-amber-500" />
              </CardTitle>
              <CardDescription className="text-xs">
                4 axes • Score 0-100 • Adapté à l'ambition "{ambDef.label}"
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 items-end">
            <div className="flex items-center gap-2 bg-muted/50 rounded-full px-2 py-1">
              <User className={cn("w-3.5 h-3.5 transition-colors", !staffMode ? "text-primary" : "text-muted-foreground")} />
              <Switch checked={staffMode} onCheckedChange={setStaffMode} className="scale-90" />
              <Shield className={cn("w-3.5 h-3.5 transition-colors", staffMode ? "text-primary" : "text-muted-foreground")} />
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-2">
        {/* Score global avec design premium */}
        <div className={cn("relative p-4 rounded-2xl overflow-hidden bg-gradient-to-br", globalGradient)}>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Score circulaire */}
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
                  <circle cx="36" cy="36" r="30" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
                  <circle
                    cx="36" cy="36" r="30" fill="none"
                    stroke={globalColor} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${(scores.globalScore / 100) * 188.5} 188.5`}
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-black tabular-nums" style={{ color: globalColor }}>
                    {scores.globalScore}
                  </span>
                </div>
              </div>
              
              <div>
                <p className="text-lg font-bold" style={{ color: globalColor }}>
                  {getScoreLabel(scores.globalScore)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">Données: {scores.dataCompleteness}%</span>
                  <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5 border-current/20", ambDef.color)}>
                    {ambDef.icon} {ambDef.shortLabel}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Points fort/faible */}
            <div className="hidden sm:flex flex-col gap-1 text-xs">
              <div className="flex items-center gap-2 bg-green-500/10 rounded-lg px-2 py-1">
                <TrendingUp className="w-3 h-3 text-green-600" />
                <span className="text-green-700 dark:text-green-400">
                  {strongest.icon} {strongest.axisShort}: {strongest.current}
                </span>
              </div>
              {weakest.current < 70 && (
                <div className="flex items-center gap-2 bg-amber-500/10 rounded-lg px-2 py-1">
                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                  <span className="text-amber-700 dark:text-amber-400">
                    {weakest.icon} {weakest.axisShort}: {weakest.current}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Graphique Radar AMÉLIORÉ - Optimisé mobile */}
        <div className="relative rounded-xl bg-muted/20 border p-2 sm:p-4">
          {/* Légende des zones - simplifiée sur mobile */}
          <div className={cn(
            "flex items-center justify-center gap-2 sm:gap-4 mb-2",
            isMobile ? "text-[8px]" : "text-[10px]"
          )}>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-red-500/30 border border-red-500" />
              <span className="text-muted-foreground">{isMobile ? "<50" : "<50 À développer"}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-amber-500/30 border border-amber-500" />
              <span className="text-muted-foreground">{isMobile ? "50-70" : "50-70 En progression"}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-green-500/30 border border-green-500" />
              <span className="text-muted-foreground">{isMobile ? ">70" : ">70 Prêt"}</span>
            </div>
          </div>

          <div className={cn(isMobile ? "h-56" : "h-72")}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart 
                data={chartData} 
                margin={isMobile 
                  ? { top: 20, right: 35, bottom: 20, left: 35 } 
                  : { top: 30, right: 50, bottom: 30, left: 50 }
                }
              >
                <defs>
                  <linearGradient id="radarGradientV2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                  </linearGradient>
                  <linearGradient id="targetGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                
                {/* Grille avec zones colorées */}
                <PolarGrid 
                  stroke="hsl(var(--border))" 
                  strokeOpacity={0.5}
                  gridType="polygon"
                />
                
                {/* Labels des axes avec scores - optimisés mobile */}
                <PolarAngleAxis 
                  dataKey="axisShort"
                  tick={({ payload, x, y, cx, cy }) => {
                    const dataPoint = chartData.find(d => d.axisShort === payload.value);
                    const score = dataPoint?.current || 0;
                    const icon = dataPoint?.icon || "";
                    const scoreColor = getScoreColor(score);
                    
                    // Position du texte - plus proche du centre sur mobile
                    const dx = x > cx ? (isMobile ? 8 : 15) : x < cx ? (isMobile ? -8 : -15) : 0;
                    const dy = y > cy ? (isMobile ? 8 : 15) : y < cy ? (isMobile ? -12 : -20) : 0;
                    
                    return (
                      <g transform={`translate(${x + dx},${y + dy})`}>
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          className={cn(
                            "fill-foreground font-semibold",
                            isMobile ? "text-[9px]" : "text-xs"
                          )}
                        >
                          {icon} {isMobile ? payload.value.substring(0, 4) : payload.value}
                        </text>
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          y={isMobile ? 10 : 14}
                          className={cn("font-bold", isMobile ? "text-[10px]" : "text-sm")}
                          fill={scoreColor}
                        >
                          {score}
                        </text>
                      </g>
                    );
                  }}
                  tickLine={false}
                />
                
                {/* Axe radial avec graduations - moins de ticks sur mobile */}
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]} 
                  tick={{ fontSize: isMobile ? 8 : 10, fill: "hsl(var(--muted-foreground))" }} 
                  tickCount={isMobile ? 3 : 6}
                  axisLine={false}
                />
                
                {/* Zone cible (80+) */}
                <Radar 
                  name="Cible" 
                  dataKey="target" 
                  stroke="hsl(142, 76%, 36%)" 
                  strokeDasharray="5 5"
                  strokeWidth={1.5}
                  fill="url(#targetGradient)"
                  fillOpacity={0.3}
                />
                
                {/* Score actuel */}
                <Radar 
                  name="Score actuel" 
                  dataKey="current" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#radarGradientV2)"
                  strokeWidth={isMobile ? 2 : 3} 
                  dot={{ 
                    r: isMobile ? 5 : 6, 
                    fill: "hsl(var(--primary))", 
                    strokeWidth: 2, 
                    stroke: "hsl(var(--background))" 
                  }} 
                />
                
                <Tooltip 
                  content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null;
                    const data = payload[0].payload;
                    return (
                      <div className="bg-card border rounded-lg shadow-lg p-2 sm:p-3 max-w-[200px] sm:max-w-xs">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-base sm:text-lg">{data.icon}</span>
                          <span className="font-semibold text-xs sm:text-sm">{data.axisShort}</span>
                          <span className="ml-auto font-bold text-sm sm:text-lg" style={{ color: getScoreColor(data.current) }}>
                            {data.current}/100
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-2">{data.explanation}</p>
                        {staffMode && (
                          <p className="text-[9px] sm:text-[10px] font-mono text-muted-foreground/70 border-t pt-2">{data.formula}</p>
                        )}
                        <div className="flex items-center gap-1 mt-2 text-[9px] sm:text-[10px]">
                          <span className="text-muted-foreground">Source:</span>
                          <span>{data.confidence >= 0.8 ? '🧪 Mesuré' : data.confidence >= 0.6 ? '🏃 Terrain' : '📐 Estimé'}</span>
                        </div>
                      </div>
                    );
                  }}
                />
                
                {!isMobile && (
                  <Legend 
                    wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                    payload={[
                      { value: 'Score actuel', type: 'rect', color: 'hsl(var(--primary))' },
                      { value: 'Cible (80+)', type: 'line', color: 'hsl(142, 76%, 36%)' }
                    ]}
                  />
                )}
              </RadarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Légende mobile en dessous */}
          {isMobile && (
            <div className="flex justify-center gap-4 mt-2 text-[9px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm bg-primary" />
                Actuel
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2 h-0.5 bg-green-600 border-dashed" />
                Cible
              </span>
            </div>
          )}
        </div>

        {/* Bloc Ajustement Âge */}
        {/* Section Cibles Physiologiques */}
        <div className={cn(
          "p-3 rounded-lg border text-xs",
          "bg-muted/30 border-border"
        )}>
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="font-semibold text-foreground">Cibles physiologiques</span>
            <Badge variant="outline" className="text-xs py-0 h-5 border-primary/50 text-primary">
              {getAmbitionDefinition(currentAmbition).shortLabel}
            </Badge>
            {athleteAge !== null && (
              <Badge 
                variant="outline" 
                className={cn(
                  "ml-auto text-xs py-0 h-5 gap-1",
                  ageInfo.category === "master1" && "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
                  ageInfo.category === "master2" && "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400"
                )}
              >
                <User className="h-3 w-3" />
                {athleteAge} ans
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-muted-foreground mb-1">VLamax cible</p>
              <p className="font-medium text-foreground font-mono">{ageTargets.vlamaxOptimal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">TTE cible</p>
              <p className="font-medium text-foreground font-mono">{ageTargets.tteTarget} min</p>
            </div>
            <div>
              <p className="text-muted-foreground mb-1">FTP/kg cible</p>
              <p className="font-medium text-foreground font-mono">{ageTargets.ftpKgTarget.toFixed(1)}</p>
            </div>
          </div>
          <p className="mt-2 text-muted-foreground leading-relaxed">
            Cibles définies par <span className="font-medium text-foreground">objectif</span> et <span className="font-medium text-foreground">ambition ({getAmbitionDefinition(currentAmbition).shortLabel})</span>.
            {ageTargets.ageAdjustmentApplied && (
              <span className="ml-1">{ageTargets.explanation}</span>
            )}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {chartData.map((axis) => {
            const axisKey = axis.axisShort === "Aérobie" ? "capaciteAerobie" 
              : axis.axisShort === "TTE" ? "toleranceEffort"
              : axis.axisShort === "Métabo" ? "profilMetabolique"
              : "robustesse";
            const details = AXIS_DETAILS[axisKey];
            
            return (
              <div 
                key={axis.axisShort} 
                className="p-3 rounded-xl bg-muted/30 border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{axis.icon}</span>
                  <span className="text-sm font-semibold flex-1">{axis.axisShort}</span>
                  <span className="text-xl font-black tabular-nums" style={{ color: getScoreColor(axis.current) }}>
                    {axis.current}
                  </span>
                </div>
                
                {/* Barre avec zones colorées */}
                <div className="relative h-3 rounded-full overflow-hidden bg-muted mb-2">
                  {/* Zones de couleur en fond */}
                  <div className="absolute inset-0 flex">
                    <div className="w-1/2 bg-red-500/20" />
                    <div className="w-[20%] bg-amber-500/20" />
                    <div className="w-[30%] bg-green-500/20" />
                  </div>
                  {/* Indicateur de score */}
                  <div 
                    className="absolute top-0 left-0 h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${axis.current}%`,
                      backgroundColor: getScoreColor(axis.current)
                    }}
                  />
                  {/* Ligne cible à 80 */}
                  <div className="absolute top-0 bottom-0 w-0.5 bg-green-700" style={{ left: '80%' }} />
                </div>

                <p className="text-[10px] text-muted-foreground line-clamp-2">
                  {axis.explanation}
                </p>
                
                {staffMode && (
                  <div className="mt-2 pt-2 border-t border-dashed">
                    <p className="text-[9px] font-mono text-muted-foreground/60">{axis.formula}</p>
                    <div className="flex items-center gap-1 mt-1 text-[9px]">
                      <span className="text-muted-foreground">Fiabilité:</span>
                      <span className="font-medium">{axis.confidence >= 0.8 ? 'Élevée' : axis.confidence >= 0.6 ? 'Modérée' : 'Limitée'}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Section explicative détaillée */}
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="details" className="border rounded-lg px-3">
            <AccordionTrigger className="py-2 hover:no-underline">
              <div className="flex items-center gap-2 text-sm">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                <span>Comprendre chaque axe et comment l'améliorer</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3 space-y-4">
              {Object.entries(AXIS_DETAILS).map(([key, details]) => {
                const axisData = chartData.find(d => 
                  (key === "capaciteAerobie" && d.axisShort === "Aérobie") ||
                  (key === "toleranceEffort" && d.axisShort === "TTE") ||
                  (key === "profilMetabolique" && d.axisShort === "Métabo") ||
                  (key === "robustesse" && d.axisShort === "Robust")
                );
                const score = axisData?.current || 0;
                
                return (
                  <div key={key} className="p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{details.icon}</span>
                      <span className="font-semibold">{details.title}</span>
                      <Badge 
                        variant="outline" 
                        style={{ borderColor: getScoreColor(score), color: getScoreColor(score) }}
                      >
                        {score}/100
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-muted-foreground mb-2">{details.description}</p>
                    
                    <div className="p-2 bg-blue-500/10 rounded text-xs text-blue-700 dark:text-blue-300 mb-2">
                      <strong>Interprétation:</strong> {details.whatItMeans}
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-xs font-medium">Comment améliorer:</p>
                      <ul className="space-y-1">
                        {details.howToImprove.map((tip, i) => (
                          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                            <span className="text-primary">→</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Bouton mode comparaison */}
        <div className="flex items-center justify-center">
          <Button
            variant={compareMode ? "default" : "outline"}
            size="sm"
            onClick={() => setCompareMode(!compareMode)}
            className="gap-2"
          >
            <GitCompare className="w-4 h-4" />
            {compareMode ? "Masquer la comparaison" : "Comparer les niveaux d'ambition"}
          </Button>
        </div>

        {/* Mode comparaison */}
        {compareMode && allAmbitionScores && (
          <div className="space-y-3 p-3 bg-muted/20 rounded-xl border">
            <p className="text-xs text-center text-muted-foreground mb-2">
              Scores selon le niveau d'ambition (mêmes données, exigences différentes)
            </p>
            
            {AMBITION_LEVELS_ORDERED.map((ambition) => {
              const ambDef = getAmbitionDefinition(ambition);
              const ambScores = allAmbitionScores[ambition];
              const isActive = ambition === currentAmbition;
              
              return (
                <div 
                  key={ambition}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    isActive ? "border-primary bg-primary/5" : "border-border/50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ambDef.icon}</span>
                    <div className="flex-1">
                      <p className={cn("font-semibold text-sm", ambDef.color)}>{ambDef.label}</p>
                      {isActive && <Badge className="text-[9px] py-0">Actuel</Badge>}
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black" style={{ color: getScoreColor(ambScores.globalScore) }}>
                        {ambScores.globalScore}
                      </span>
                      <span className="text-xs text-muted-foreground">/100</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 mt-2 text-xs">
                    {[
                      { key: 'capaciteAerobie', label: 'AER' },
                      { key: 'toleranceEffort', label: 'TTE' },
                      { key: 'profilMetabolique', label: 'MET' },
                      { key: 'robustesse', label: 'ROB' },
                    ].map(({ key, label }) => {
                      const axisData = ambScores[key as keyof typeof ambScores];
                      const score = typeof axisData === 'object' && 'score' in axisData ? (axisData as CompassAxisScore).score : 0;
                      
                      return (
                        <div key={key} className="text-center">
                          <span className="font-bold" style={{ color: getScoreColor(score) }}>{score}</span>
                          <span className="text-muted-foreground ml-1">{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Alerte limitation principale */}
        {scores.mainLimitation && !compareMode && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Axe prioritaire à développer</p>
              <p className="text-xs text-amber-600 dark:text-amber-500">{scores.mainLimitation}</p>
            </div>
          </div>
        )}

        {/* Fatigue modulation warning */}
        {scores.isFatigueModulated && (
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>Les scores sont modulés par l'état de fatigue actuel</span>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center italic">
          Two For Coaching Lab™ — Ce graphique guide la décision mais ne remplace pas le jugement du coach.
        </p>
      </CardContent>
    </Card>
  );
}

// Export l'ancien nom pour compatibilité
export { MetabolicPerformanceCompassV2 as MetabolicPerformanceCompass };
