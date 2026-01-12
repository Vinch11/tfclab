/**
 * Metabolic Performance Compass™ – Two For Coaching Lab
 * VERSION STAFF-GRADE avec 4 axes formalisés et CRR
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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Compass, AlertTriangle, Shield, User, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { computeCRR, computeChargeScore } from "@/lib/chargeRecenteReference";
import { computeCompassScores } from "@/lib/compassScoring";
import { VLamaxEffectif } from "@/lib/vlamaxEffectif";
import { TTEEffectif } from "@/lib/tteEffectif";

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
}

interface MetabolicPerformanceCompassProps {
  data: CompassData;
  staffMode?: boolean;
  className?: string;
}

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
  
  const scores = useMemo(() => {
    const crr = computeCRR({ tss7d: data.tss7d, snapshotDate: data.snapshotDate, snapshotUpdatedAt: data.snapshotUpdatedAt });
    return computeCompassScores({
      ftp: data.ftp,
      poids: data.poids,
      vlamaxEffectif: data.vlamaxEffectif,
      tteEffectif: data.tteEffectif,
      crr,
      objectif: data.objectif
    });
  }, [data]);

  const chartData = [
    { axis: "Capacité Aérobie", icon: "⚡", current: scores.capaciteAerobie.score, explanation: scores.capaciteAerobie.explanation, formula: scores.capaciteAerobie.formula, fullMark: 100 },
    { axis: "Tolérance Effort", icon: "💪", current: scores.toleranceEffort.score, explanation: scores.toleranceEffort.explanation, formula: scores.toleranceEffort.formula, fullMark: 100 },
    { axis: "Profil Métabolique", icon: "🎯", current: scores.profilMetabolique.score, explanation: scores.profilMetabolique.explanation, formula: scores.profilMetabolique.formula, fullMark: 100 },
    { axis: "Robustesse", icon: "🛡️", current: scores.robustesse.score, explanation: scores.robustesse.explanation, formula: scores.robustesse.formula, fullMark: 100 },
  ];

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
          <div className="flex items-center gap-2">
            <User className={cn("w-4 h-4", !staffMode && "text-primary")} />
            <Switch checked={staffMode} onCheckedChange={setStaffMode} />
            <Shield className={cn("w-4 h-4", staffMode && "text-primary")} />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Score global */}
        <div className="p-3 rounded-lg text-center" style={{ backgroundColor: `${globalColor}15` }}>
          <div className="flex items-center justify-center gap-3">
            <div className="text-3xl font-bold font-mono" style={{ color: globalColor }}>{scores.globalScore}</div>
            <div className="text-left">
              <p className="font-semibold" style={{ color: globalColor }}>{scores.globalLabel}</p>
              <p className="text-xs text-muted-foreground">Données: {scores.dataCompleteness}%</p>
            </div>
          </div>
        </div>
        
        {/* Radar Chart */}
        <div className="h-56 -mx-4">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
              <PolarGrid stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9 }} tickCount={5} />
              <Radar name="Actuel" dataKey="current" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} dot={{ r: 4, fill: "hsl(var(--primary))" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Détails axes (mode staff) */}
        {staffMode && (
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

        {scores.mainLimitation && (
          <div className="p-2 bg-amber-500/10 rounded-lg flex items-start gap-2 text-xs text-amber-600">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Axe prioritaire: {scores.mainLimitation}</span>
          </div>
        )}

        <p className="text-[10px] text-muted-foreground text-center">{COMPASS_METHODOLOGY.disclaimer}</p>
      </CardContent>
    </Card>
  );
}

export function CompassMini({ data, className }: { data: CompassData; className?: string }) {
  const scores = useMemo(() => {
    const crr = computeCRR({ tss7d: data.tss7d, snapshotDate: data.snapshotDate });
    return computeCompassScores({ ftp: data.ftp, poids: data.poids, vlamaxEffectif: data.vlamaxEffectif, tteEffectif: data.tteEffectif, crr, objectif: data.objectif });
  }, [data]);

  return (
    <div className={cn("p-3 rounded-lg border bg-card", className)}>
      <div className="flex items-center gap-2 mb-2">
        <Compass className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">Compass™</span>
        <span className="ml-auto text-lg font-bold font-mono" style={{ color: getScoreColor(scores.globalScore) }}>{scores.globalScore}</span>
      </div>
    </div>
  );
}
