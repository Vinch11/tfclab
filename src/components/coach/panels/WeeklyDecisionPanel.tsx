/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PANEL 3 — Weekly Decision (Double Boucle)
 * 
 * Statut semaine (CONTINUE/ADJUST/DELOAD), contraintes,
 * pourquoi + watchouts.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Calendar, 
  Play, 
  Pause, 
  AlertTriangle,
  CheckCircle,
  Zap,
  Clock,
  Edit,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalibrationResult } from "@/lib/calibration/vlamaxContinuous";
import type { Tables } from "@/integrations/supabase/types";
import type { TrainingPrescription } from "@/engines/decision";

type DbCoachOverride = Tables<"coach_overrides">;

type WeekStatus = "CONTINUE" | "ADJUST" | "DELOAD";

interface Constraint {
  id: string;
  label: string;
  allowed: boolean;
  reason?: string;
}

interface WeeklyDecisionPanelProps {
  athleteId: string;
  liveCalibration: CalibrationResult | null;
  overrides: DbCoachOverride[];
  onAddOverride: (
    module: string,
    action: string,
    reason: string,
    beforeValue: any,
    afterValue: any
  ) => Promise<boolean>;
  /** Optional engine prescription for enriched strategy context */
  prescription?: TrainingPrescription | null;
}

export function WeeklyDecisionPanel({
  athleteId,
  liveCalibration,
  overrides,
  onAddOverride,
  prescription,
}: WeeklyDecisionPanelProps) {
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [pendingOverride, setPendingOverride] = useState<{
    constraint: string;
    newValue: boolean;
  } | null>(null);

  // Déterminer le statut de la semaine basé sur confiance et preuves
  const weekStatus = useMemo((): WeekStatus => {
    if (!liveCalibration) return "CONTINUE";
    
    // Si recalibration recommandée ou confiance faible → prudence
    if (liveCalibration.recalibration_recommended) {
      return "ADJUST";
    }
    if (liveCalibration.confidence < 0.55) {
      return "DELOAD";
    }
    return "CONTINUE";
  }, [liveCalibration]);

  // Contraintes basées sur le profil
  const constraints = useMemo((): Constraint[] => {
    const confidence = liveCalibration?.confidence ?? 0.5;
    const recalRecommended = liveCalibration?.recalibration_recommended ?? false;
    
    return [
      {
        id: "speedwork",
        label: "Speedwork / Intervalles",
        allowed: confidence >= 0.60 && !recalRecommended,
        reason: confidence < 0.60 
          ? "Confiance insuffisante pour intensité élevée"
          : recalRecommended 
            ? "Recalibration recommandée — prudence"
            : undefined,
      },
      {
        id: "longrun",
        label: "Sortie longue (>90min)",
        allowed: confidence >= 0.50,
        reason: confidence < 0.50 
          ? "Calibration trop incertaine pour efforts longs"
          : undefined,
      },
      {
        id: "race_simulation",
        label: "Simulation course",
        allowed: confidence >= 0.75 && !recalRecommended,
        reason: confidence < 0.75 
          ? "Confiance insuffisante pour simulation fiable"
          : recalRecommended
            ? "Attendez la recalibration"
            : undefined,
      },
      {
        id: "threshold_work",
        label: "Travail au seuil",
        allowed: confidence >= 0.55,
        reason: confidence < 0.55 
          ? "Zones seuil incertaines"
          : undefined,
      },
    ];
  }, [liveCalibration]);

  const handleConstraintToggle = (constraint: Constraint) => {
    if (!constraint.allowed) {
      // Coach veut override une contrainte non autorisée
      setPendingOverride({
        constraint: constraint.id,
        newValue: true,
      });
      setOverrideDialogOpen(true);
    }
  };

  const handleConfirmOverride = async () => {
    if (!pendingOverride || !overrideReason.trim()) return;
    
    await onAddOverride(
      "WEEKLY_DECISION",
      `ALLOW_${pendingOverride.constraint.toUpperCase()}`,
      overrideReason,
      { allowed: false },
      { allowed: true, overridden: true }
    );
    
    setOverrideDialogOpen(false);
    setOverrideReason("");
    setPendingOverride(null);
  };

  // Watchouts — enriched with engine data
  const watchouts = useMemo(() => {
    const items: string[] = [];
    
    if (liveCalibration?.recalibration_recommended) {
      items.push("⚠️ Recalibration recommandée avant intensité");
    }
    if (liveCalibration?.confidence && liveCalibration.confidence < 0.60) {
      items.push("🔍 Confiance calibration faible — surveiller réponses");
    }
    if (liveCalibration?.delta && Math.abs(liveCalibration.delta) > 0.05) {
      items.push("📊 Delta calibration significatif — adapter progressivement");
    }
    
    // Engine-driven watchouts
    if (prescription?.strategy.hasSprintBan) {
      items.push("🚫 Sprint Ban actif — éviter sprints et micro-intervalles explosifs");
    }
    if (prescription?.strategy.prohibitions && prescription.strategy.prohibitions.length > 0) {
      prescription.strategy.prohibitions.forEach(p => {
        if (!items.some(i => i.includes("Sprint Ban"))) {
          items.push(`⛔ ${p.label}`);
        }
      });
    }
    
    return items;
  }, [liveCalibration, prescription]);

  // Recent overrides
  const recentOverrides = overrides
    .filter(o => o.module === "WEEKLY_DECISION")
    .slice(0, 3);

  const getStatusConfig = (status: WeekStatus) => {
    switch (status) {
      case "CONTINUE":
        return {
          icon: Play,
          color: "text-emerald-600",
          bg: "bg-emerald-50 dark:bg-emerald-950/30",
          label: "CONTINUE",
          description: "Poursuivre le plan prévu",
        };
      case "ADJUST":
        return {
          icon: Pause,
          color: "text-amber-600",
          bg: "bg-amber-50 dark:bg-amber-950/30",
          label: "ADJUST",
          description: "Ajuster intensité ou volume",
        };
      case "DELOAD":
        return {
          icon: AlertTriangle,
          color: "text-red-600",
          bg: "bg-red-50 dark:bg-red-950/30",
          label: "DELOAD",
          description: "Semaine allégée recommandée",
        };
    }
  };

  const statusConfig = getStatusConfig(weekStatus);
  const StatusIcon = statusConfig.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Décision Semaine
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Week Status */}
        <div className={cn("p-4 rounded-lg border-2", statusConfig.bg)}>
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-full", statusConfig.bg)}>
              <StatusIcon className={cn("h-6 w-6", statusConfig.color)} />
            </div>
            <div>
              <p className={cn("text-lg font-bold", statusConfig.color)}>
                {statusConfig.label}
              </p>
              <p className="text-sm text-muted-foreground">
                {statusConfig.description}
              </p>
            </div>
          </div>
        </div>

        {/* Engine Strategy Context */}
        {prescription && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-primary" />
                Contexte Stratégique (Engine)
              </h4>
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1.5">
                <p className="text-sm font-medium">{prescription.strategy.weekLabel}</p>
                <p className="text-xs text-muted-foreground">{prescription.strategy.primaryAction}</p>
                {prescription.strategy.levers.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {prescription.strategy.levers.slice(0, 3).map((lever, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {lever.label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* Constraints */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Contraintes de la semaine</h4>
          
          {constraints.map((constraint) => (
            <div 
              key={constraint.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                constraint.allowed 
                  ? "bg-card" 
                  : "bg-muted/50 opacity-75"
              )}
            >
              <div className="flex items-center gap-2">
                {constraint.allowed ? (
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                )}
                <div>
                  <p className="text-sm font-medium">{constraint.label}</p>
                  {constraint.reason && (
                    <p className="text-xs text-muted-foreground">
                      {constraint.reason}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant={constraint.allowed ? "default" : "secondary"}>
                  {constraint.allowed ? "Autorisé" : "Limité"}
                </Badge>
                {!constraint.allowed && (
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => handleConstraintToggle(constraint)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Watchouts */}
        {watchouts.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-amber-600">Watchouts</h4>
              <ul className="space-y-1">
                {watchouts.map((watchout, i) => (
                  <li key={i} className="text-sm text-muted-foreground">
                    {watchout}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Recent Overrides */}
        {recentOverrides.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Overrides récents
              </h4>
              {recentOverrides.map((override) => (
                <div 
                  key={override.id}
                  className="text-xs p-2 bg-muted/50 rounded"
                >
                  <span className="font-medium">{override.action}</span>
                  <span className="text-muted-foreground"> — {override.reason}</span>
                  <span className="text-muted-foreground block">
                    {new Date(override.date).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Override Dialog */}
        <Dialog open={overrideDialogOpen} onOpenChange={setOverrideDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Override Coach</DialogTitle>
              <DialogDescription>
                Autoriser manuellement une contrainte. Justification obligatoire.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-sm">
                <strong>Contrainte:</strong> {pendingOverride?.constraint}
              </div>
              <Textarea
                placeholder="Raison de l'override..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOverrideDialogOpen(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleConfirmOverride}
                disabled={!overrideReason.trim()}
              >
                <Save className="h-4 w-4 mr-2" />
                Confirmer Override
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
