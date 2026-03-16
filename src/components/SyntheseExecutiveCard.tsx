/**
 * Synthèse Exécutive Card
 * Résumé rapide du profil athlète avec indicateurs clés et recommandations
 * ✅ Seuils contextualisés par ambition
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VLamaxEffectif, TTEEffectif } from "@/engines/diagnostic";
import type { RaceReadinessEffectif } from "@/lib/raceReadinessEffectif";
import { AmbitionLevel, DEFAULT_AMBITION, getAmbitionDefinition } from "@/types/ambitionLevel";
import {
  evaluateVLamax,
  evaluateTTE,
  evaluateFtpKg,
  evaluateVO2max,
  evaluateReadiness,
  type MetricStatus,
} from "@/lib/ambitionThresholds";

interface SyntheseExecutiveCardProps {
  athleteName: string;
  objectif: string;
  vlamaxEffectif: VLamaxEffectif;
  tteEffectif: TTEEffectif;
  raceReadiness: RaceReadinessEffectif;
  ftp: number | null;
  poids: number | null;
  vo2max: number | null;
  tss7d: number | null;
  completude: { score: number; manquants: string[] };
  ambition?: AmbitionLevel;
}

export function SyntheseExecutiveCard({
  athleteName, objectif, vlamaxEffectif, tteEffectif, raceReadiness,
  ftp, poids, vo2max, tss7d, completude, ambition = DEFAULT_AMBITION
}: SyntheseExecutiveCardProps) {
  const ftpKg = ftp && poids && poids > 0 ? ftp / poids : null;
  const ftpKgStr = ftpKg !== null ? ftpKg.toFixed(2) : null;
  const ambDef = getAmbitionDefinition(ambition);

  const readinessEval = evaluateReadiness(
    raceReadiness.isInsufficient ? null : raceReadiness.score,
    ambition
  );

  const readinessColor = readinessEval.status === "ok" ? "text-green-600" 
    : readinessEval.status === "warning" ? "text-amber-600" : "text-red-600";
  const readinessBg = readinessEval.status === "ok" ? "bg-green-500/10 border-green-500/30"
    : readinessEval.status === "warning" ? "bg-amber-500/10 border-amber-500/30" : "bg-red-500/10 border-red-500/30";
  const readinessLabel = readinessEval.status === "ok" ? "Race Ready" 
    : readinessEval.status === "warning" ? "En progression" : "Préparation requise";

  const statusIcon = (status: MetricStatus) => {
    switch (status) {
      case "ok": return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case "warning": return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
      case "critical": return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      default: return <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  // Guard: données insuffisantes
  const isInsufficient = vlamaxEffectif.value === null && !ftp && !vo2max && completude.score === 0;

  if (isInsufficient) {
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
  
  if (vlamaxEffectif.value !== null) {
    const eval_ = evaluateVLamax(vlamaxEffectif.value, objectif, ambition);
    items.push({ label: "VLamax", value: `${vlamaxEffectif.value.toFixed(2)} mmol/L/s`, status: eval_.status, source: vlamaxEffectif.source, target: eval_.target });
  }
  
  if (tteEffectif.tte_min > 0) {
    const eval_ = evaluateTTE(tteEffectif.tte_min, objectif, ambition);
    items.push({ label: "TTE", value: `${tteEffectif.tte_min} min`, status: eval_.status, source: tteEffectif.source, target: eval_.target });
  }
  
  if (ftpKgStr) {
    const eval_ = evaluateFtpKg(ftpKg, objectif, ambition);
    items.push({ label: "FTP/kg", value: `${ftpKgStr} W/kg`, status: eval_.status, source: "snapshot", target: eval_.target });
  }
  
  if (vo2max) {
    const eval_ = evaluateVO2max(vo2max, objectif, ambition);
    items.push({ label: "VO₂max", value: `${vo2max} ml/kg/min`, status: eval_.status, source: "snapshot", target: eval_.target });
  }

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
        {/* Race Readiness Score */}
        <div className={cn("rounded-xl p-4 border-2 text-center", readinessBg)}>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Race Readiness</p>
          <p className={cn("text-4xl font-black mt-1", readinessColor)}>
            {raceReadiness.isInsufficient ? "—" : `${raceReadiness.score}%`}
          </p>
          <p className={cn("text-sm font-semibold", readinessColor)}>{readinessLabel}</p>
          <p className="text-xs text-muted-foreground mt-1">Objectif : {objectif} • Cible : {readinessEval.target}</p>
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

        {/* Readiness details */}
        {raceReadiness.details && !raceReadiness.isInsufficient && (
          <div className="space-y-2">
            <p className="text-xs font-medium">Détails Race Readiness</p>
            <div className="space-y-1.5">
              {Object.entries(raceReadiness.details).map(([key, val]) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-20 shrink-0 capitalize">{key}</span>
                  <Progress value={val} className="flex-1 h-1.5" />
                  <span className="text-xs font-medium w-8 text-right">{Math.round(val)}%</span>
                </div>
              ))}
            </div>
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
