/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PANEL 2 — Evidence & Quality
 * 
 * Timeline des preuves, poids attribués, flags incohérence,
 * bouton forcer recalibration.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Brain, 
  Plus, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  FileText,
  Zap,
  Timer,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalibrationEvidence, EvidenceType, EvidenceSourceType } from "@/lib/calibration/vlamaxContinuous";
import { computeEvidenceWeight, CALIBRATION_WINDOW_DAYS } from "@/lib/calibration/vlamaxContinuous";

interface EvidenceQualityPanelProps {
  athleteId: string;
  evidences: CalibrationEvidence[];
  windowEvidences: CalibrationEvidence[];
  loading: boolean;
  onAddEvidence: (evidence: Omit<CalibrationEvidence, "id" | "coach_id">) => Promise<CalibrationEvidence | null>;
  onForceRecalibration: (reason: string) => Promise<void>;
  isLocked: boolean;
}

const EVIDENCE_TYPE_ICONS: Record<EvidenceType, React.ReactNode> = {
  SPRINT_15S: <Zap className="h-4 w-4" />,
  P30: <Timer className="h-4 w-4" />,
  P60: <Timer className="h-4 w-4" />,
  MAP: <Activity className="h-4 w-4" />,
  TTE_OBS: <Timer className="h-4 w-4" />,
  PACED_RACE: <Activity className="h-4 w-4" />,
  DRIFT: <Activity className="h-4 w-4" />,
  ECONOMY: <Activity className="h-4 w-4" />,
};

const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  SPRINT_15S: "Sprint 15s",
  P30: "Puissance 30s",
  P60: "Puissance 60s",
  MAP: "MAP/PMA",
  TTE_OBS: "TTE Observé",
  PACED_RACE: "Course Paced",
  DRIFT: "Dérive Cardiaque",
  ECONOMY: "Économie de course",
};

const VALIDITY_CONFIG = {
  OK: { icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  CHECK: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30" },
  INVALID: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
};

export function EvidenceQualityPanel({
  athleteId,
  evidences,
  windowEvidences,
  loading,
  onAddEvidence,
  onForceRecalibration,
  isLocked,
}: EvidenceQualityPanelProps) {
  const [recalibrationReason, setRecalibrationReason] = useState("");
  const [recalibrationDialogOpen, setRecalibrationDialogOpen] = useState(false);
  const [isRecalibrating, setIsRecalibrating] = useState(false);

  const handleForceRecalibration = async () => {
    if (!recalibrationReason.trim()) return;
    setIsRecalibrating(true);
    try {
      await onForceRecalibration(recalibrationReason);
      setRecalibrationDialogOpen(false);
      setRecalibrationReason("");
    } finally {
      setIsRecalibrating(false);
    }
  };

  const outsideWindowEvidences = evidences.filter(e => !windowEvidences.includes(e));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Preuves & Qualité
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {windowEvidences.length} dans fenêtre ({CALIBRATION_WINDOW_DAYS}j)
            </Badge>
            
            <Dialog open={recalibrationDialogOpen} onOpenChange={setRecalibrationDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={isLocked}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Forcer recalibration
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Forcer une recalibration</DialogTitle>
                  <DialogDescription>
                    Cette action va créer un nouveau snapshot de calibration. 
                    Justification obligatoire pour traçabilité.
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  placeholder="Raison de la recalibration forcée..."
                  value={recalibrationReason}
                  onChange={(e) => setRecalibrationReason(e.target.value)}
                  className="min-h-[100px]"
                />
                <DialogFooter>
                  <Button variant="outline" onClick={() => setRecalibrationDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button 
                    onClick={handleForceRecalibration}
                    disabled={!recalibrationReason.trim() || isRecalibrating}
                  >
                    {isRecalibrating ? "Recalibration..." : "Confirmer"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Chargement des preuves...
          </div>
        ) : evidences.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune preuve terrain enregistrée</p>
            <p className="text-xs mt-1">
              Ajoutez des tests, imports FIT ou analyses post-race
            </p>
          </div>
        ) : (
          <>
            {/* Preuves dans la fenêtre */}
            {windowEvidences.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  Preuves actives (fenêtre {CALIBRATION_WINDOW_DAYS} jours)
                </h4>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {windowEvidences.map((evidence) => (
                      <EvidenceRow key={evidence.id} evidence={evidence} inWindow />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Preuves historiques */}
            {outsideWindowEvidences.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Historique (hors fenêtre)
                </h4>
                <ScrollArea className="h-[150px]">
                  <div className="space-y-2 pr-4 opacity-60">
                    {outsideWindowEvidences.slice(0, 5).map((evidence) => (
                      <EvidenceRow key={evidence.id} evidence={evidence} inWindow={false} />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function EvidenceRow({ evidence, inWindow }: { evidence: CalibrationEvidence; inWindow: boolean }) {
  const weight = computeEvidenceWeight(evidence);
  const ValidityIcon = VALIDITY_CONFIG[evidence.validity].icon;
  const vlamax = evidence.raw_values?.vlamax_estimated as number | undefined;

  return (
    <div className={cn(
      "p-3 rounded-lg border",
      inWindow ? "bg-card" : "bg-muted/30",
      VALIDITY_CONFIG[evidence.validity].bg
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-primary/10">
            {EVIDENCE_TYPE_ICONS[evidence.evidence_type]}
          </div>
          <div>
            <p className="text-sm font-medium">
              {EVIDENCE_TYPE_LABELS[evidence.evidence_type]}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(evidence.date).toLocaleDateString("fr-FR")} • {evidence.source_type}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Validity */}
          <ValidityIcon className={cn("h-4 w-4", VALIDITY_CONFIG[evidence.validity].color)} />
          
          {/* Quality stars */}
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <div
                key={star}
                className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  star <= evidence.protocol_quality ? "bg-amber-500" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="mt-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          {vlamax !== undefined && (
            <span className="font-mono">
              VLamax: <span className="font-bold">{vlamax.toFixed(2)}</span>
            </span>
          )}
          {evidence.fatigue_index !== null && evidence.fatigue_index !== undefined && (
            <span className="text-muted-foreground">
              Fatigue: {evidence.fatigue_index}%
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Poids:</span>
          <Progress value={weight * 100} className="w-16 h-1.5" />
          <span className="font-mono w-10 text-right">{(weight * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Notes */}
      {evidence.notes && (
        <p className="mt-2 text-xs text-muted-foreground italic">
          {evidence.notes}
        </p>
      )}
    </div>
  );
}
