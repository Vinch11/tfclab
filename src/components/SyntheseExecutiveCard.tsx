/**
 * Synthèse Exécutive Card
 * Résumé rapide du profil athlète avec indicateurs clés et recommandations
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VLamaxEffectif } from "@/lib/vlamaxEffectif";
import type { TTEEffectif } from "@/lib/tteEffectif";
import type { RaceReadinessEffectif } from "@/lib/raceReadinessEffectif";

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
}

export function SyntheseExecutiveCard({
  athleteName, objectif, vlamaxEffectif, tteEffectif, raceReadiness,
  ftp, poids, vo2max, tss7d, completude
}: SyntheseExecutiveCardProps) {
  const ftpKg = ftp && poids && poids > 0 ? (ftp / poids).toFixed(2) : null;
  
  const readinessColor = raceReadiness.score >= 80 ? "text-green-600" : raceReadiness.score >= 60 ? "text-amber-600" : "text-red-600";
  const readinessBg = raceReadiness.score >= 80 ? "bg-green-500/10 border-green-500/30" : raceReadiness.score >= 60 ? "bg-amber-500/10 border-amber-500/30" : "bg-red-500/10 border-red-500/30";
  const readinessLabel = raceReadiness.score >= 80 ? "Race Ready" : raceReadiness.score >= 60 ? "En progression" : "Préparation requise";

  const statusIcon = (status: "ok" | "warning" | "critical") => {
    switch (status) {
      case "ok": return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case "warning": return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
      case "critical": return <XCircle className="h-3.5 w-3.5 text-red-500" />;
    }
  };

  // Build summary items
  const items: { label: string; value: string; status: "ok" | "warning" | "critical"; source: string }[] = [];
  
  if (vlamaxEffectif.value !== null) {
    const vStatus = vlamaxEffectif.value <= 0.40 ? "ok" : vlamaxEffectif.value <= 0.50 ? "warning" : "critical";
    items.push({ label: "VLamax", value: `${vlamaxEffectif.value.toFixed(2)} mmol/L/s`, status: vStatus, source: vlamaxEffectif.source });
  }
  
  items.push({ 
    label: "TTE", 
    value: `${tteEffectif.tte_min} min`, 
    status: tteEffectif.tte_min >= 45 ? "ok" : tteEffectif.tte_min >= 35 ? "warning" : "critical",
    source: tteEffectif.source 
  });
  
  if (ftpKg) {
    const fkg = parseFloat(ftpKg);
    items.push({ label: "FTP/kg", value: `${ftpKg} W/kg`, status: fkg >= 4.0 ? "ok" : fkg >= 3.5 ? "warning" : "critical", source: "snapshot" });
  }
  
  if (vo2max) {
    items.push({ label: "VO₂max", value: `${vo2max} ml/kg/min`, status: vo2max >= 60 ? "ok" : vo2max >= 50 ? "warning" : "critical", source: "snapshot" });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Synthèse Exécutive — {athleteName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Race Readiness Score */}
        <div className={cn("rounded-xl p-4 border-2 text-center", readinessBg)}>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Race Readiness</p>
          <p className={cn("text-4xl font-black mt-1", readinessColor)}>{raceReadiness.score}%</p>
          <p className={cn("text-sm font-semibold", readinessColor)}>{readinessLabel}</p>
          <p className="text-xs text-muted-foreground mt-1">Objectif : {objectif}</p>
        </div>

        {/* Key indicators grid */}
        <div className="grid grid-cols-2 gap-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
              {statusIcon(item.status)}
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <p className="text-sm font-semibold truncate">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Readiness details */}
        {raceReadiness.details && (
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
