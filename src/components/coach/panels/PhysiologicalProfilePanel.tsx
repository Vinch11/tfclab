/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PANEL 1 — Physiological Profile (Locked)
 * 
 * Affiche VLamax baseline vs calibrated, confiance, date recalibration,
 * cluster percentile.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
// Progress removed - no longer showing confidence %
import { Separator } from "@/components/ui/separator";
import { Lock, Unlock, RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalibrationSnapshot, CalibrationResult } from "@/lib/calibration/vlamaxContinuous";
import type { DbSnapshot } from "@/hooks/useCloudData";

interface PhysiologicalProfilePanelProps {
  athleteId: string;
  latestSnapshot: CalibrationSnapshot | null;
  liveCalibration: CalibrationResult | null;
  activeSnapshot: DbSnapshot | null;
  isLocked: boolean;
  onCreateSnapshot: (modelledVlamax: number, confidence: number, lock: boolean) => Promise<CalibrationSnapshot | null>;
}

export function PhysiologicalProfilePanel({
  athleteId,
  latestSnapshot,
  liveCalibration,
  activeSnapshot,
  isLocked,
  onCreateSnapshot,
}: PhysiologicalProfilePanelProps) {
  const modelledVlamax = activeSnapshot?.vlamax ?? latestSnapshot?.vlamax_modelled ?? null;
  const calibratedVlamax = liveCalibration?.vlamax_calibrated ?? latestSnapshot?.vlamax_calibrated ?? modelledVlamax;
  const confidence = liveCalibration?.confidence ?? latestSnapshot?.confidence ?? 0.5;
  const delta = liveCalibration?.delta ?? (calibratedVlamax && modelledVlamax ? calibratedVlamax - modelledVlamax : 0);

  const getDeltaIcon = () => {
    if (!delta || Math.abs(delta) < 0.01) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (delta < 0) return <TrendingDown className="h-4 w-4 text-emerald-600" />;
    return <TrendingUp className="h-4 w-4 text-amber-600" />;
  };

  const getDeltaLabel = () => {
    if (!delta || Math.abs(delta) < 0.01) return "Stable";
    if (delta < 0) return `${delta.toFixed(3)} (amélioration)`;
    return `+${delta.toFixed(3)} (augmentation)`;
  };

  const handleLockProfile = async () => {
    if (!modelledVlamax) return;
    await onCreateSnapshot(modelledVlamax, confidence, true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {isLocked ? (
              <Lock className="h-5 w-5 text-primary" />
            ) : (
              <Unlock className="h-5 w-5 text-amber-500" />
            )}
            Profil Physiologique
          </CardTitle>
          {!isLocked && modelledVlamax && (
            <Button size="sm" variant="outline" onClick={handleLockProfile}>
              <Lock className="h-4 w-4 mr-2" />
              Verrouiller 4 sem
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* VLamax Comparison */}
        <div className="grid grid-cols-2 gap-4">
          {/* Baseline */}
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              VLamax Modélisée
            </p>
            <p className="text-2xl font-bold font-mono">
              {modelledVlamax?.toFixed(2) ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">mmol/L/s (baseline)</p>
          </div>

          {/* Calibrated */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-xs text-primary uppercase tracking-wide mb-1">
              VLamax Calibrée
            </p>
            <p className="text-2xl font-bold font-mono text-primary">
              {calibratedVlamax?.toFixed(2) ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground">mmol/L/s (effective)</p>
          </div>
        </div>

        {/* Delta */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            {getDeltaIcon()}
            <span className="text-sm font-medium">Delta calibration</span>
          </div>
          <span className={cn(
            "text-sm font-mono",
            delta && delta < 0 ? "text-emerald-600" : delta && delta > 0 ? "text-amber-600" : "text-muted-foreground"
          )}>
            {getDeltaLabel()}
          </span>
        </div>

        <Separator />

        {/* Source */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Source de la donnée</span>
            <Badge variant={
              latestSnapshot?.vlamax_calibrated != null ? "default" : "secondary"
            }>
              {latestSnapshot?.vlamax_calibrated != null 
                ? "📋 Calibration continue" 
                : modelledVlamax 
                  ? "📐 Estimation" 
                  : "❓ Non déterminée"
              }
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {latestSnapshot?.vlamax_calibrated != null 
              ? "Valeur calibrée à partir d'évidences terrain accumulées"
              : modelledVlamax
                ? "Valeur estimée — le coach juge la validité selon le contexte"
                : "Aucune donnée disponible"
            }
          </p>
        </div>

        <Separator />

        {/* Range P25-P75 */}
        {liveCalibration && (
          <div className="p-3 bg-muted/30 rounded-lg">
            <p className="text-sm font-medium mb-2">Plage VLamax (P25-P75)</p>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">P25</p>
                <p className="font-mono text-sm">{liveCalibration.vlamax_range.p25.toFixed(2)}</p>
              </div>
              <div className="flex-1 h-2 bg-gradient-to-r from-emerald-500/30 via-primary/50 to-amber-500/30 rounded-full" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground">P75</p>
                <p className="font-mono text-sm">{liveCalibration.vlamax_range.p75.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Calibration Meta */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Dernière calibration:</span>
            <p className="font-medium">
              {latestSnapshot?.date 
                ? new Date(latestSnapshot.date).toLocaleDateString("fr-FR")
                : "Jamais"
              }
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Preuves utilisées:</span>
            <p className="font-medium">
              {liveCalibration?.evidence_count ?? latestSnapshot?.evidence_ids?.length ?? 0}
            </p>
          </div>
          {isLocked && latestSnapshot?.lock_until && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Verrouillé jusqu'au:</span>
              <p className="font-medium">
                {new Date(latestSnapshot.lock_until).toLocaleDateString("fr-FR")}
              </p>
            </div>
          )}
        </div>

        {/* Recalibration Warning */}
        {liveCalibration?.recalibration_recommended && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Recalibration recommandée
              </span>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {liveCalibration.recalibration_reason}
            </p>
          </div>
        )}

        {/* Notes */}
        {liveCalibration?.notes && liveCalibration.notes.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Notes calibration</p>
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {liveCalibration.notes.map((note, i) => (
                <li key={i}>• {note}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
