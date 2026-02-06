/**
 * Calibration Evidence Summary Card
 * Historique des tests terrain et poids calibratif de chaque evidence
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, Calendar, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CalibrationEvidenceRow {
  id: string;
  date: string;
  evidence_type: string;
  source_type: string;
  confidence_evidence: number;
  calibration_weight: number | null;
  used_in_calibration: boolean;
  validity: string;
  notes: string | null;
  raw_values: Record<string, unknown>;
}

interface CalibrationEvidenceSummaryCardProps {
  athleteId: string;
  className?: string;
}

const TYPE_LABELS: Record<string, string> = {
  power_test: "Test de puissance",
  sprint_test: "Sprint test",
  lab_test: "Test labo",
  race_result: "Résultat course",
  field_observation: "Observation terrain",
  fit_import: "Import FIT",
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Saisie manuelle",
  fit_file: "Fichier FIT",
  lab: "Laboratoire",
  race: "Course",
  estimated: "Estimation",
};

export function CalibrationEvidenceSummaryCard({ athleteId, className }: CalibrationEvidenceSummaryCardProps) {
  const [evidences, setEvidences] = useState<CalibrationEvidenceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!athleteId) return;

    const fetchEvidences = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("calibration_evidence")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("date", { ascending: false })
        .limit(20);

      if (!error && data) {
        setEvidences(data.map(d => ({
          ...d,
          raw_values: (d.raw_values || {}) as Record<string, unknown>,
        })));
      }
      setLoading(false);
    };

    fetchEvidences();
  }, [athleteId]);

  const validityIcon = (validity: string) => {
    switch (validity) {
      case "OK": return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
      case "SUSPECT": return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />;
      case "INVALID": return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      default: return <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          Historique de Calibration
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Evidences terrain utilisées pour la calibration VLamax
        </p>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Chargement...</p>
        ) : evidences.length === 0 ? (
          <div className="text-center py-6">
            <Scale className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucune evidence de calibration</p>
            <p className="text-xs text-muted-foreground mt-1">
              Importez des fichiers FIT ou ajoutez des résultats de tests pour alimenter la calibration.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {evidences.map((ev) => (
              <div
                key={ev.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border text-sm",
                  ev.used_in_calibration
                    ? "bg-primary/5 border-primary/20"
                    : "bg-muted/30 border-border/50"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {validityIcon(ev.validity)}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {TYPE_LABELS[ev.evidence_type] || ev.evidence_type}
                      </span>
                      {ev.used_in_calibration && (
                        <Badge variant="default" className="text-[9px] px-1.5 py-0">
                          Utilisée
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(ev.date).toLocaleDateString("fr-FR")}</span>
                      <span>•</span>
                      <span>{SOURCE_LABELS[ev.source_type] || ev.source_type}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Confiance</div>
                    <div className="font-mono text-sm">{Math.round(ev.confidence_evidence * 100)}%</div>
                  </div>
                  {ev.calibration_weight !== null && ev.calibration_weight > 0 && (
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Poids</div>
                      <div className="font-mono text-sm">{Math.round(ev.calibration_weight * 100)}%</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
