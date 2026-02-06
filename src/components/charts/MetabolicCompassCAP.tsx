/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Metabolic Performance Compass™ — MODE CAP (Course à Pied)
 * Two For Coaching Lab — 6 Axes Running-Specific
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Composant dédié au mode CAP avec 6 axes spécifiques :
 * VO2max • VLamax CAP • Économie • Durabilité • vVO2max • Allure Seuil
 * 
 * S'affiche automatiquement quand Running Focus Mode™ est actif.
 * ═══════════════════════════════════════════════════════════════════════════════
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
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/use-mobile";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Compass, AlertTriangle, Shield, User, Info, Sparkles, 
  TrendingUp, Footprints, HelpCircle 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  computeCompassCAPScores, 
  getCompassCAPChartData,
  type CompassCAPInput,
  type CompassCAPScores,
} from "@/lib/compassScoringCAP";
import { AmbitionLevel, getAmbitionDefinition, DEFAULT_AMBITION } from "@/types/ambitionLevel";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface MetabolicCompassCAPProps {
  data: CompassCAPInput;
  staffMode?: boolean;
  className?: string;
  compact?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

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

const SCORE_GRADIENTS = {
  excellent: "from-emerald-500/20 via-emerald-500/10 to-transparent",
  good: "from-green-500/20 via-green-500/10 to-transparent",
  moderate: "from-amber-500/20 via-amber-500/10 to-transparent",
  low: "from-red-500/20 via-red-500/10 to-transparent",
};

const getScoreGradient = (score: number): string => {
  if (score >= 80) return SCORE_GRADIENTS.excellent;
  if (score >= 70) return SCORE_GRADIENTS.good;
  if (score >= 50) return SCORE_GRADIENTS.moderate;
  return SCORE_GRADIENTS.low;
};

// Détails des 6 axes CAP
const CAP_AXIS_DETAILS: Record<string, { 
  title: string; 
  description: string; 
  howToImprove: string[];
}> = {
  vo2max: {
    title: "VO₂max",
    description: "Capacité maximale à utiliser l'oxygène. Fondation du moteur aérobie.",
    howToImprove: [
      "Intervalles 90-100% vVO2max (3-5min)",
      "Volume endurance fondamentale",
      "Hill repeats (côtes répétées)",
    ],
  },
  vlamaxCap: {
    title: "VLamax CAP",
    description: "Profil glycolytique running. Plus basse = meilleur pour l'endurance.",
    howToImprove: [
      "Sorties longues > 90min en Z2",
      "Éviter sprints maximaux prolongés",
      "Train Low (glycogène réduit occasionnel)",
    ],
  },
  economy: {
    title: "Économie de Course",
    description: "Efficacité mécanique et énergétique. Moins de coût = plus de performance.",
    howToImprove: [
      "Drills techniques (gammes)",
      "Cadence 170-180 ppm",
      "Renforcement musculaire ciblé",
    ],
  },
  durability: {
    title: "Durabilité",
    description: "Résistance à la fatigue sur la durée. Capacité à maintenir le niveau.",
    howToImprove: [
      "Sorties longues progressives",
      "Blocs tempo 40-60min",
      "Travail spécifique fin de course",
    ],
  },
  vVO2max: {
    title: "vVO₂max (VMA)",
    description: "Vitesse à VO2max. Référence pour toutes les allures d'entraînement.",
    howToImprove: [
      "30/30 et intervalles courts",
      "Fartlek à haute intensité",
      "Tests VMA réguliers",
    ],
  },
  paceThreshold: {
    title: "Allure Seuil",
    description: "Vitesse au seuil lactique. Allure marathon optimale dérivée.",
    howToImprove: [
      "Tempo runs 20-40min",
      "Cruise intervals au seuil",
      "Course progressive",
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function MetabolicCompassCAP({ 
  data, 
  staffMode: initialStaffMode = false, 
  className,
  compact = false 
}: MetabolicCompassCAPProps) {
  const [staffMode, setStaffMode] = useState(initialStaffMode);
  const isMobile = useIsMobile();
  
  const currentAmbition = data.ambition || DEFAULT_AMBITION;
  const ambDef = getAmbitionDefinition(currentAmbition);
  
  // Calculer les scores CAP
  const scores = useMemo(() => computeCompassCAPScores(data), [data]);
  const chartData = useMemo(() => getCompassCAPChartData(scores), [scores]);
  
  // Guard: si aucune donnée réelle, afficher un placeholder
  if (scores.dataCompleteness === 0) {
    return (
      <Card className={cn("border-dashed border-muted-foreground/30", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Footprints className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base text-muted-foreground">Compass CAP™</CardTitle>
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
                Renseignez VO₂max, VMA ou allure seuil dans un snapshot pour activer le Compass CAP.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const globalColor = getScoreColor(scores.globalScore);
  const globalGradient = getScoreGradient(scores.globalScore);
  
  // Identifier points forts/faibles
  const sortedAxes = [...chartData].sort((a, b) => b.current - a.current);
  const strongest = sortedAxes[0];
  const weakest = sortedAxes[sortedAxes.length - 1];

  // ═══════════════════════════════════════════════════════════════════════════════
  // MODE COMPACT
  // ═══════════════════════════════════════════════════════════════════════════════
  if (compact) {
    return (
      <div className={cn("p-4 rounded-xl border bg-card", className)}>
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
            <Footprints className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Compass CAP™</h3>
            <p className="text-[10px] text-muted-foreground">6 axes • Mode Running</p>
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
            <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
              🏃 CAP
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

  // ═══════════════════════════════════════════════════════════════════════════════
  // MODE COMPLET
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <Card className={cn("overflow-hidden border-0 shadow-lg", className)}>
      <CardHeader className="pb-2 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/10">
                <Footprints className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                Compass CAP™
                <Badge variant="outline" className="text-[10px] bg-primary/10 border-primary/30">
                  🏃 Running Mode
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                6 axes • Spécifique Course à Pied • Ambition "{ambDef.label}"
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-muted/50 rounded-full px-2 py-1">
            <User className={cn("w-3.5 h-3.5 transition-colors", !staffMode ? "text-primary" : "text-muted-foreground")} />
            <Switch checked={staffMode} onCheckedChange={setStaffMode} className="scale-90" />
            <Shield className={cn("w-3.5 h-3.5 transition-colors", staffMode ? "text-primary" : "text-muted-foreground")} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-2">
        {/* Score global */}
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
                  {scores.globalLabel}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">Données: {scores.dataCompleteness}%</span>
                  <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5 border-current/20", ambDef.color)}>
                    {ambDef.icon} {ambDef.shortLabel}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Points forts/faibles */}
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

        {/* Radar Chart 6 axes */}
        <div className="relative rounded-xl bg-muted/20 border p-2 sm:p-4">
          {/* Légende */}
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

          <div className={cn(isMobile ? "h-64" : "h-80")}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart 
                data={chartData} 
                margin={isMobile 
                  ? { top: 25, right: 40, bottom: 25, left: 40 } 
                  : { top: 35, right: 55, bottom: 35, left: 55 }
                }
              >
                <defs>
                  <linearGradient id="radarGradientCAP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                  </linearGradient>
                </defs>
                
                <PolarGrid 
                  stroke="hsl(var(--border))" 
                  strokeOpacity={0.5}
                  gridType="polygon"
                />
                
                <PolarAngleAxis 
                  dataKey="axisShort"
                  tick={({ payload, x, y, cx, cy }) => {
                    const dataPoint = chartData.find(d => d.axisShort === payload.value);
                    const score = dataPoint?.current || 0;
                    const icon = dataPoint?.icon || "";
                    const scoreColor = getScoreColor(score);
                    
                    const dx = x > cx ? (isMobile ? 10 : 18) : x < cx ? (isMobile ? -10 : -18) : 0;
                    const dy = y > cy ? (isMobile ? 10 : 18) : y < cy ? (isMobile ? -14 : -22) : 0;
                    
                    return (
                      <g transform={`translate(${x + dx},${y + dy})`}>
                        <text
                          textAnchor="middle"
                          dominantBaseline="central"
                          className={cn(
                            "fill-foreground font-semibold",
                            isMobile ? "text-[8px]" : "text-xs"
                          )}
                        >
                          {icon} {isMobile ? payload.value.substring(0, 5) : payload.value}
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
                
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]} 
                  tick={{ fontSize: isMobile ? 8 : 10, fill: "hsl(var(--muted-foreground))" }} 
                  tickCount={isMobile ? 3 : 5}
                  axisLine={false}
                />
                
                {/* Zone cible */}
                <Radar 
                  name="Cible" 
                  dataKey="target" 
                  stroke="hsl(142, 76%, 36%)"
                  strokeWidth={1}
                  strokeDasharray="4 2"
                  fill="transparent"
                  fillOpacity={0}
                />
                
                {/* Scores actuels */}
                <Radar 
                  name="Score" 
                  dataKey="current" 
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="url(#radarGradientCAP)"
                  fillOpacity={0.6}
                  dot={{ 
                    r: isMobile ? 3 : 4, 
                    fill: "hsl(var(--primary))", 
                    strokeWidth: 2, 
                    stroke: "hsl(var(--background))" 
                  }}
                />
                
                <Tooltip
                  content={({ payload }) => {
                    if (!payload?.[0]?.payload) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-popover/95 backdrop-blur-sm border rounded-lg p-3 shadow-xl max-w-xs">
                        <div className="font-bold text-sm flex items-center gap-2">
                          <span>{d.icon}</span>
                          <span>{d.axis.replace('\n', ' ')}</span>
                          <span className="ml-auto" style={{ color: getScoreColor(d.current) }}>
                            {d.current}/100
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{d.explanation}</p>
                      </div>
                    );
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Détails des axes (mode Staff) */}
        {staffMode && (
          <Accordion type="single" collapsible className="w-full">
            {Object.entries(CAP_AXIS_DETAILS).map(([key, details]) => {
              const axisScore = chartData.find(d => 
                d.axisShort.toLowerCase().includes(key.toLowerCase().substring(0, 4)) ||
                key.includes(d.axisShort.toLowerCase().substring(0, 4))
              );
              
              return (
                <AccordionItem key={key} value={key}>
                  <AccordionTrigger className="text-sm py-2">
                    <div className="flex items-center gap-2">
                      <span>{axisScore?.icon || "📊"}</span>
                      <span>{details.title}</span>
                      {axisScore && (
                        <Badge 
                          variant="outline" 
                          className="ml-2 text-[10px]"
                          style={{ color: getScoreColor(axisScore.current) }}
                        >
                          {axisScore.current}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <p>{details.description}</p>
                      <div className="mt-2">
                        <p className="font-medium text-foreground">Comment améliorer :</p>
                        <ul className="list-disc list-inside mt-1 space-y-0.5">
                          {details.howToImprove.map((tip, i) => (
                            <li key={i}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        {/* Limitation principale */}
        {scores.mainLimitation && (
          <div className="p-3 bg-amber-500/10 rounded-lg flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Axe prioritaire: {scores.mainLimitation}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Concentrez votre travail sur cet axe pour progresser plus rapidement.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MetabolicCompassCAP;
