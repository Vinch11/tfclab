/**
 * Metabolic Performance Compass™ – Two For Coaching Lab
 * VERSION STAFF-GRADE avec 4 axes formalisés et CRR
 * + MODE COMPARAISON PAR AMBITION
 * + DESIGN PREMIUM AMÉLIORÉ
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Compass, AlertTriangle, Shield, User, Info, GitCompare, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeCRR } from "@/lib/chargeRecenteReference";
import { computeCompassScores } from "@/lib/compassScoring";
import type { VLamaxEffectif, TTEEffectif } from "@/engines/diagnostic";
import { AmbitionLevel, AMBITION_LEVELS_ORDERED, getAmbitionDefinition, DEFAULT_AMBITION } from "@/types/ambitionLevel";

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
}

interface MetabolicPerformanceCompassProps {
  data: CompassData;
  staffMode?: boolean;
  className?: string;
  compact?: boolean; // Mode compact pour rapport
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

export const COMPASS_METHODOLOGY = {
  title: "Metabolic Performance Compass™",
  subtitle: "Two For Coaching Lab",
  axes: [
    { id: "capaciteAerobie", label: "Capacité Aérobie", icon: "⚡", formula: "FTP_score = (FTP_kg / FTP_ref) × 100" },
    { id: "toleranceEffort", label: "Tolérance Effort", icon: "💪", formula: "TTE_score = (TTE / TTE_cible) × 100" },
    { id: "profilMetabolique", label: "Profil Métabolique", icon: "🎯", formula: "VLamax_score = 100 - écart_optimal" },
    { id: "robustesse", label: "Robustesse", icon: "🛡️", formula: "0.4×TTE + 0.3×VLamax + 0.3×Charge" }
  ],
  disclaimer: "Ce graphique guide la décision mais ne remplace pas le jugement du coach."
};

const getScoreColor = (score: number): string => {
  if (score >= 80) return "hsl(142, 76%, 36%)"; // emerald-600
  if (score >= 70) return "hsl(142, 71%, 45%)"; // green-500
  if (score >= 50) return "hsl(45, 93%, 47%)"; // amber-500
  return "hsl(0, 84%, 60%)"; // red-500
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

export function MetabolicPerformanceCompass({ 
  data, 
  staffMode: initialStaffMode = false, 
  className,
  compact = false 
}: MetabolicPerformanceCompassProps) {
  const [staffMode, setStaffMode] = useState(initialStaffMode);
  const [compareMode, setCompareMode] = useState(false);
  
  const currentAmbition = data.ambition || DEFAULT_AMBITION;
  
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
      ambition: currentAmbition
    });
  }, [data, currentAmbition]);

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
        ambition
      });
      return acc;
    }, {} as Record<AmbitionLevel, ReturnType<typeof computeCompassScores>>);
  }, [data, compareMode]);

  // Données du chart - mode normal
  const chartData = [
    { axis: "Capacité Aérobie", icon: "⚡", current: scores.capaciteAerobie.score, explanation: scores.capaciteAerobie.explanation, formula: scores.capaciteAerobie.formula, fullMark: 100 },
    { axis: "Tolérance Effort", icon: "💪", current: scores.toleranceEffort.score, explanation: scores.toleranceEffort.explanation, formula: scores.toleranceEffort.formula, fullMark: 100 },
    { axis: "Profil Métabolique", icon: "🎯", current: scores.profilMetabolique.score, explanation: scores.profilMetabolique.explanation, formula: scores.profilMetabolique.formula, fullMark: 100 },
    { axis: "Robustesse", icon: "🛡️", current: scores.robustesse.score, explanation: scores.robustesse.explanation, formula: scores.robustesse.formula, fullMark: 100 },
  ];

  // Données du chart - mode comparaison (ajoute les scores de chaque ambition)
  const comparisonChartData = useMemo(() => {
    if (!allAmbitionScores) return chartData;
    
    return [
      { 
        axis: "Capacité Aérobie", 
        icon: "⚡",
        finisher: allAmbitionScores.finisher.capaciteAerobie.score,
        age_group: allAmbitionScores.age_group.capaciteAerobie.score,
        competitor: allAmbitionScores.competitor.capaciteAerobie.score,
        elite: allAmbitionScores.elite.capaciteAerobie.score,
        fullMark: 100 
      },
      { 
        axis: "Tolérance Effort", 
        icon: "💪",
        finisher: allAmbitionScores.finisher.toleranceEffort.score,
        age_group: allAmbitionScores.age_group.toleranceEffort.score,
        competitor: allAmbitionScores.competitor.toleranceEffort.score,
        elite: allAmbitionScores.elite.toleranceEffort.score,
        fullMark: 100 
      },
      { 
        axis: "Profil Métabolique", 
        icon: "🎯",
        finisher: allAmbitionScores.finisher.profilMetabolique.score,
        age_group: allAmbitionScores.age_group.profilMetabolique.score,
        competitor: allAmbitionScores.competitor.profilMetabolique.score,
        elite: allAmbitionScores.elite.profilMetabolique.score,
        fullMark: 100 
      },
      { 
        axis: "Robustesse", 
        icon: "🛡️",
        finisher: allAmbitionScores.finisher.robustesse.score,
        age_group: allAmbitionScores.age_group.robustesse.score,
        competitor: allAmbitionScores.competitor.robustesse.score,
        elite: allAmbitionScores.elite.robustesse.score,
        fullMark: 100 
      },
    ];
  }, [allAmbitionScores, chartData]);

  const globalColor = getScoreColor(scores.globalScore);
  const globalGradient = getScoreGradient(scores.globalScore);
  const ambDef = getAmbitionDefinition(currentAmbition);

  // =============================================
  // MODE COMPACT (pour export rapport)
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
        
        {/* Score global compact */}
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

        {/* Axes mini */}
        <div className="space-y-2">
          {chartData.map((axis) => (
            <div key={axis.axis} className="flex items-center gap-3">
              <span className="text-lg w-6 text-center">{axis.icon}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium truncate">{axis.axis}</span>
                  <span className="font-bold tabular-nums" style={{ color: getScoreColor(axis.current) }}>
                    {axis.current}
                  </span>
                </div>
                <Progress 
                  value={axis.current} 
                  className="h-1.5" 
                  style={{ 
                    ["--progress-background" as any]: getScoreColor(axis.current) + "30",
                    ["--progress-foreground" as any]: getScoreColor(axis.current)
                  }}
                />
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
  // MODE COMPLET
  // =============================================
  return (
    <Card className={cn("overflow-hidden border-0 shadow-lg", className)}>
      {/* Header avec gradient subtil */}
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
              <CardDescription className="text-xs">4 axes • Formules transparentes • Adapté à l'ambition</CardDescription>
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
        <div className={cn(
          "relative p-4 rounded-2xl overflow-hidden",
          "bg-gradient-to-br", globalGradient
        )}>
          {/* Effet de brillance */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 translate-x-full animate-shimmer" />
          
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Score circulaire */}
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
                  {/* Cercle de fond */}
                  <circle
                    cx="36"
                    cy="36"
                    r="30"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-muted/20"
                  />
                  {/* Cercle de progression */}
                  <circle
                    cx="36"
                    cy="36"
                    r="30"
                    fill="none"
                    stroke={globalColor}
                    strokeWidth="6"
                    strokeLinecap="round"
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

            {/* Mini indicateurs d'axes */}
            <div className="hidden sm:grid grid-cols-2 gap-1.5">
              {chartData.map((axis) => (
                <div 
                  key={axis.axis}
                  className="flex items-center gap-1.5 text-xs bg-background/50 rounded-lg px-2 py-1"
                >
                  <span>{axis.icon}</span>
                  <span className="font-bold tabular-nums" style={{ color: getScoreColor(axis.current) }}>
                    {axis.current}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bouton mode comparaison */}
        <div className="flex items-center justify-center">
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
              compareMode 
                ? "bg-primary text-primary-foreground shadow-md" 
                : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            <GitCompare className="w-4 h-4" />
            {compareMode ? "Masquer la comparaison" : "Comparer les niveaux d'ambition"}
          </button>
        </div>

        {/* Mode comparaison redesigné - avec radar et cartes lisibles */}
        {compareMode && allAmbitionScores && (
          <div className="space-y-4">
            {/* Radar Chart comparatif */}
            <div className="relative rounded-xl bg-muted/20 border p-2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart 
                  data={comparisonChartData} 
                  margin={{ top: 30, right: 40, bottom: 30, left: 40 }}
                >
                  <PolarGrid 
                    stroke="hsl(var(--border))" 
                    strokeOpacity={0.4}
                    gridType="polygon"
                  />
                  <PolarAngleAxis 
                    dataKey="axis" 
                    tick={{ fontSize: 10, fill: "hsl(var(--foreground))", fontWeight: 500 }}
                    tickLine={false}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]} 
                    tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} 
                    tickCount={5}
                    axisLine={false}
                  />
                  {AMBITION_LEVELS_ORDERED.map((ambition) => {
                    const isActive = ambition === currentAmbition;
                    return (
                      <Radar 
                        key={ambition}
                        name={getAmbitionDefinition(ambition).label}
                        dataKey={ambition}
                        stroke={AMBITION_COLORS[ambition]}
                        fill={AMBITION_COLORS[ambition]}
                        fillOpacity={isActive ? 0.25 : 0.05}
                        strokeWidth={isActive ? 3 : 1.5}
                        strokeDasharray={ambition === 'finisher' ? '5 5' : ambition === 'elite' ? '2 2' : undefined}
                      />
                    );
                  })}
                  <Legend 
                    wrapperStyle={{ fontSize: 11, paddingTop: 10 }}
                    formatter={(value, entry) => {
                      const ambition = AMBITION_LEVELS_ORDERED.find(a => getAmbitionDefinition(a).label === value);
                      const isActive = ambition === currentAmbition;
                      return <span className={cn("font-medium", isActive && "underline")}>{value}</span>;
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Cartes simplifiées pour chaque niveau */}
            <div className="grid gap-2">
              {AMBITION_LEVELS_ORDERED.map((ambition) => {
                const ambDef = getAmbitionDefinition(ambition);
                const ambScores = allAmbitionScores[ambition];
                const isActive = ambition === currentAmbition;
                const globalScoreColor = getScoreColor(ambScores.globalScore);
                
                return (
                  <div 
                    key={ambition}
                    className={cn(
                      "relative p-3 rounded-xl border-2 transition-all duration-200",
                      isActive 
                        ? "border-primary bg-primary/5 shadow-md" 
                        : "border-border/50 bg-card/50"
                    )}
                  >
                    {isActive && (
                      <Badge className="absolute -top-2 left-3 text-[10px] py-0 px-2 bg-primary text-primary-foreground">
                        Votre niveau
                      </Badge>
                    )}
                    
                    <div className="flex items-center gap-3">
                      {/* Icône et label compacts */}
                      <div className="flex items-center gap-2 min-w-[100px] sm:min-w-[130px]">
                        <span className="text-2xl">{ambDef.icon}</span>
                        <div>
                          <p className={cn("font-bold text-sm", ambDef.color)}>{ambDef.label}</p>
                          <p className="text-[9px] text-muted-foreground hidden sm:block">{ambDef.description}</p>
                        </div>
                      </div>
                      
                      {/* Score global */}
                      <div className="text-center px-3 border-x border-border/30">
                        <p className="text-2xl font-black tabular-nums" style={{ color: globalScoreColor }}>
                          {ambScores.globalScore}
                        </p>
                        <p className="text-[9px] text-muted-foreground">
                          {getScoreLabel(ambScores.globalScore)}
                        </p>
                      </div>
                      
                      {/* Scores par axe - compact */}
                      <div className="flex-1 flex items-center gap-2 sm:gap-4 justify-end">
                        {[
                          { key: 'capaciteAerobie', label: 'AER', fullLabel: 'Aérobie' },
                          { key: 'toleranceEffort', label: 'TTE', fullLabel: 'TTE' },
                          { key: 'profilMetabolique', label: 'MET', fullLabel: 'Métabo' },
                          { key: 'robustesse', label: 'ROB', fullLabel: 'Robust' },
                        ].map(({ key, label, fullLabel }) => {
                          const axisData = ambScores[key as keyof typeof ambScores];
                          const score = typeof axisData === 'object' && 'score' in axisData ? axisData.score : 0;
                          const scoreColor = getScoreColor(score);
                          
                          return (
                            <div key={key} className="text-center min-w-[32px]">
                              <p className="text-xs font-bold tabular-nums" style={{ color: scoreColor }}>
                                {score}
                              </p>
                              <p className="text-[8px] text-muted-foreground hidden sm:block">{fullLabel}</p>
                              <p className="text-[8px] text-muted-foreground sm:hidden">{label}</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Info explicative simplifiée */}
            <div className="p-2 bg-muted/30 border border-muted rounded-lg text-center">
              <p className="text-xs text-muted-foreground">
                Plus l'ambition est élevée, plus les exigences sont strictes → scores plus bas avec les mêmes données
              </p>
            </div>
          </div>
        )}
        
        {/* Radar Chart - masqué en mode comparaison pour plus de clarté */}
        {!compareMode && (
          <div className="relative rounded-xl bg-muted/20 border p-2 h-60">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart 
                data={chartData} 
                margin={{ top: 25, right: 35, bottom: 25, left: 35 }}
              >
                <defs>
                  <linearGradient id="radarGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <PolarGrid 
                  stroke="hsl(var(--border))" 
                  strokeOpacity={0.4}
                  gridType="polygon"
                />
                <PolarAngleAxis 
                  dataKey="axis" 
                  tick={{ fontSize: 11, fill: "hsl(var(--foreground))", fontWeight: 500 }}
                  tickLine={false}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]} 
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} 
                  tickCount={5}
                  axisLine={false}
                />
                <Radar 
                  name="Score actuel" 
                  dataKey="current" 
                  stroke="hsl(var(--primary))" 
                  fill="url(#radarGradient)"
                  strokeWidth={2.5} 
                  dot={{ r: 5, fill: "hsl(var(--primary))", strokeWidth: 2, stroke: "hsl(var(--background))" }} 
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px"
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Détails axes (mode staff) avec design cards */}
        {staffMode && !compareMode && (
          <div className="grid grid-cols-2 gap-2">
            {chartData.map((axis) => (
              <div 
                key={axis.axis} 
                className="p-3 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{axis.icon}</span>
                  <span className="text-xs font-semibold truncate flex-1">{axis.axis}</span>
                  <span 
                    className="text-lg font-black tabular-nums" 
                    style={{ color: getScoreColor(axis.current) }}
                  >
                    {axis.current}
                  </span>
                </div>
                <Progress 
                  value={axis.current} 
                  className="h-1.5 mb-2"
                />
                <p className="text-[10px] text-muted-foreground line-clamp-2">{axis.explanation}</p>
                <p className="text-[9px] font-mono text-muted-foreground/60 mt-1">{axis.formula}</p>
              </div>
            ))}
          </div>
        )}

        {/* Alerte limitation principale */}
        {scores.mainLimitation && !compareMode && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Axe prioritaire</p>
              <p className="text-xs text-amber-600 dark:text-amber-500">{scores.mainLimitation}</p>
            </div>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center italic">{COMPASS_METHODOLOGY.disclaimer}</p>
      </CardContent>
    </Card>
  );
}

// =============================================
// COMPASS MINI (pour widgets)
// =============================================
export function CompassMini({ data, className }: { data: CompassData; className?: string }) {
  const currentAmbition = data.ambition || DEFAULT_AMBITION;
  
  const scores = useMemo(() => {
    const crr = computeCRR({ tss7d: data.tss7d, snapshotDate: data.snapshotDate });
    return computeCompassScores({ 
      ftp: data.ftp, 
      poids: data.poids, 
      vlamaxEffectif: data.vlamaxEffectif, 
      tteEffectif: data.tteEffectif, 
      crr, 
      objectif: data.objectif,
      ambition: currentAmbition
    });
  }, [data, currentAmbition]);

  const ambDef = getAmbitionDefinition(currentAmbition);
  const scoreColor = getScoreColor(scores.globalScore);

  return (
    <div className={cn(
      "p-3 rounded-xl border bg-gradient-to-br from-card to-card/50 shadow-sm",
      className
    )}>
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-primary/10">
          <Compass className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1">
          <span className="text-sm font-semibold">Compass™</span>
          <Badge variant="outline" className={cn("ml-2 text-[9px] py-0 px-1.5", ambDef.color)}>
            {ambDef.icon}
          </Badge>
        </div>
        <div className="text-right">
          <span className="text-xl font-black tabular-nums" style={{ color: scoreColor }}>
            {scores.globalScore}
          </span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
    </div>
  );
}
