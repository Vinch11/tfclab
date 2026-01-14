/**
 * Metabolic Performance Compass™ – Two For Coaching Lab
 * VERSION STAFF-GRADE avec 4 axes formalisés et CRR
 * + MODE COMPARAISON PAR AMBITION
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
import { Compass, AlertTriangle, Shield, User, Info, GitCompare } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeCRR, computeChargeScore } from "@/lib/chargeRecenteReference";
import { computeCompassScores } from "@/lib/compassScoring";
import { VLamaxEffectif } from "@/lib/vlamaxEffectif";
import { TTEEffectif } from "@/lib/tteEffectif";
import { AmbitionLevel, AMBITION_DEFINITIONS, AMBITION_LEVELS_ORDERED, getAmbitionDefinition, DEFAULT_AMBITION } from "@/types/ambitionLevel";

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
}

// Couleurs pour chaque niveau d'ambition
const AMBITION_COLORS: Record<AmbitionLevel, string> = {
  finisher: "hsl(var(--muted-foreground))",
  age_group: "hsl(210, 80%, 55%)",
  competitor: "hsl(38, 92%, 50%)",
  elite: "hsl(270, 70%, 60%)"
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
  if (score >= 80) return "hsl(var(--success))";
  if (score >= 60) return "hsl(var(--warning))";
  return "hsl(var(--destructive))";
};

export function MetabolicPerformanceCompass({ data, staffMode: initialStaffMode = false, className }: MetabolicPerformanceCompassProps) {
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

  const globalColor = scores.globalScore >= 70 ? "hsl(var(--success))" : scores.globalScore >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Compass className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Metabolic Performance Compass™</CardTitle>
              <CardDescription className="text-xs">4 axes – Formules transparentes</CardDescription>
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <div className="flex items-center gap-2">
              <User className={cn("w-4 h-4", !staffMode && "text-primary")} />
              <Switch checked={staffMode} onCheckedChange={setStaffMode} />
              <Shield className={cn("w-4 h-4", staffMode && "text-primary")} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground">Comparer</span>
              <Switch 
                checked={compareMode} 
                onCheckedChange={setCompareMode}
                className="scale-75"
              />
              <GitCompare className={cn("w-3.5 h-3.5", compareMode && "text-primary")} />
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Score global avec ambition actuelle */}
        <div className="p-3 rounded-lg text-center" style={{ backgroundColor: `${globalColor}15` }}>
          <div className="flex items-center justify-center gap-3">
            <div className="text-3xl font-bold font-mono" style={{ color: globalColor }}>{scores.globalScore}</div>
            <div className="text-left">
              <p className="font-semibold" style={{ color: globalColor }}>{scores.globalLabel}</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">Données: {scores.dataCompleteness}%</p>
                <Badge variant="outline" className={cn("text-[10px] py-0 px-1.5", getAmbitionDefinition(currentAmbition).color)}>
                  {getAmbitionDefinition(currentAmbition).icon} {getAmbitionDefinition(currentAmbition).shortLabel}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Comparaison des scores globaux par ambition */}
        {compareMode && allAmbitionScores && (
          <div className="grid grid-cols-4 gap-1.5">
            {AMBITION_LEVELS_ORDERED.map((ambition) => {
              const ambDef = getAmbitionDefinition(ambition);
              const ambScore = allAmbitionScores[ambition].globalScore;
              const isActive = ambition === currentAmbition;
              const scoreColor = ambScore >= 70 ? "hsl(var(--success))" : ambScore >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
              
              return (
                <div 
                  key={ambition}
                  className={cn(
                    "p-2 rounded-lg text-center border transition-all",
                    isActive ? "border-primary bg-primary/5" : "border-border/50 bg-muted/20"
                  )}
                >
                  <div className="text-sm mb-0.5">{ambDef.icon}</div>
                  <div className="text-lg font-bold font-mono" style={{ color: scoreColor }}>
                    {ambScore}
                  </div>
                  <div className={cn("text-[9px]", ambDef.color)}>{ambDef.shortLabel}</div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Radar Chart */}
        <div className={cn("h-56 -mx-4", compareMode && "h-64")}>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart 
              data={compareMode ? comparisonChartData : chartData} 
              margin={{ top: 20, right: 30, bottom: compareMode ? 30 : 20, left: 30 }}
            >
              <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} tickCount={5} />
              
              {compareMode ? (
                // Mode comparaison: un radar par niveau d'ambition
                <>
                  <Radar 
                    name="🏁 Finisher" 
                    dataKey="finisher" 
                    stroke={AMBITION_COLORS.finisher} 
                    fill={AMBITION_COLORS.finisher} 
                    fillOpacity={0.1} 
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                  <Radar 
                    name="⭐ Age Group" 
                    dataKey="age_group" 
                    stroke={AMBITION_COLORS.age_group} 
                    fill={AMBITION_COLORS.age_group} 
                    fillOpacity={0.15} 
                    strokeWidth={currentAmbition === "age_group" ? 2.5 : 1.5}
                  />
                  <Radar 
                    name="🏆 Compétiteur" 
                    dataKey="competitor" 
                    stroke={AMBITION_COLORS.competitor} 
                    fill={AMBITION_COLORS.competitor} 
                    fillOpacity={0.15} 
                    strokeWidth={currentAmbition === "competitor" ? 2.5 : 1.5}
                  />
                  <Radar 
                    name="👑 Elite" 
                    dataKey="elite" 
                    stroke={AMBITION_COLORS.elite} 
                    fill={AMBITION_COLORS.elite} 
                    fillOpacity={0.1} 
                    strokeWidth={currentAmbition === "elite" ? 2.5 : 1.5}
                    strokeDasharray="2 2"
                  />
                  <Legend 
                    wrapperStyle={{ fontSize: '10px' }}
                    iconSize={8}
                  />
                </>
              ) : (
                // Mode normal: un seul radar
                <Radar 
                  name="Actuel" 
                  dataKey="current" 
                  stroke="hsl(var(--primary))" 
                  fill="hsl(var(--primary))" 
                  fillOpacity={0.25} 
                  strokeWidth={2} 
                  dot={{ r: 4, fill: "hsl(var(--primary))" }} 
                />
              )}
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Détails axes (mode staff) */}
        {staffMode && !compareMode && (
          <div className="grid grid-cols-2 gap-2">
            {chartData.map((axis) => (
              <div key={axis.axis} className="p-2 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-1 mb-1">
                  <span className="text-sm">{axis.icon}</span>
                  <span className="text-xs font-medium truncate">{axis.axis}</span>
                </div>
                <div className="text-lg font-bold font-mono" style={{ color: getScoreColor(axis.current) }}>{axis.current}</div>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{axis.explanation}</p>
                <p className="text-[9px] font-mono text-muted-foreground/70 mt-1">{axis.formula}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tableau comparatif détaillé en mode staff + compare */}
        {staffMode && compareMode && allAmbitionScores && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1.5 px-1">Axe</th>
                  {AMBITION_LEVELS_ORDERED.map(amb => {
                    const def = getAmbitionDefinition(amb);
                    return (
                      <th key={amb} className={cn("text-center py-1.5 px-1", def.color)}>
                        {def.icon}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {(["capaciteAerobie", "toleranceEffort", "profilMetabolique", "robustesse"] as const).map((axis, idx) => {
                  const labels = ["⚡ Aérobie", "💪 TTE", "🎯 VLamax", "🛡️ Robust."];
                  return (
                    <tr key={axis} className="border-b border-border/30">
                      <td className="py-1.5 px-1 font-medium">{labels[idx]}</td>
                      {AMBITION_LEVELS_ORDERED.map(amb => {
                        const axisData = allAmbitionScores[amb][axis];
                        const score = typeof axisData === 'object' && 'score' in axisData ? axisData.score : 0;
                        return (
                          <td 
                            key={amb} 
                            className={cn(
                              "text-center py-1.5 px-1 font-mono font-bold",
                              amb === currentAmbition && "bg-primary/10 rounded"
                            )}
                            style={{ color: getScoreColor(score) }}
                          >
                            {score}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                <tr className="font-bold">
                  <td className="py-1.5 px-1">Global</td>
                  {AMBITION_LEVELS_ORDERED.map(amb => {
                    const score = allAmbitionScores[amb].globalScore;
                    return (
                      <td 
                        key={amb} 
                        className={cn(
                          "text-center py-1.5 px-1 font-mono",
                          amb === currentAmbition && "bg-primary/10 rounded"
                        )}
                        style={{ color: getScoreColor(score) }}
                      >
                        {score}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {scores.mainLimitation && !compareMode && (
          <div className="p-2 bg-amber-500/10 rounded-lg flex items-start gap-2 text-xs text-amber-600">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Axe prioritaire: {scores.mainLimitation}</span>
          </div>
        )}

        {compareMode && (
          <div className="p-2 bg-primary/5 rounded-lg text-xs text-muted-foreground text-center">
            <Info className="w-3.5 h-3.5 inline mr-1" />
            Plus le niveau d'ambition est élevé, plus les exigences sont strictes → scores plus bas avec les mêmes données physiologiques.
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center">{COMPASS_METHODOLOGY.disclaimer}</p>
      </CardContent>
    </Card>
  );
}

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

  return (
    <div className={cn("p-3 rounded-lg border bg-card", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Compass className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Compass™</span>
        <Badge variant="outline" className={cn("text-[9px] py-0 px-1", ambDef.color)}>
          {ambDef.icon}
        </Badge>
        <span className="ml-auto text-lg font-bold font-mono" style={{ color: getScoreColor(scores.globalScore) }}>{scores.globalScore}</span>
      </div>
    </div>
  );
}
