/**
 * TFCL Testing Week Status Card
 * ─────────────────────────────
 * Displayed in the Coach Checklist to surface, at a glance, whether
 * the 4 efforts of the Semaine Test TFCL™ are recorded for the active
 * snapshot.
 *
 * When the 4 efforts are present + protocol_quality ≥ 4, the card runs
 * the Mader joint inverse fit (maderInverseFitJoint.ts) and badges the
 * profile as "Précision haute (~3% MLSS)". Otherwise it shows the
 * "Précision standard (~5%)" baseline.
 *
 * No DB writes — pure read + on-demand computation. Persistence happens
 * via the existing TFCL Testing Week / FIT import flows.
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Sparkles, ChevronRight, Beaker } from "lucide-react";
import { computeTFCLCompletion } from "@/data/tfclTestingWeek";
import {
  fitMaderJoint,
  canRunMaderJointFit,
} from "@/lib/v2/maderInverseFitJoint";
import type { DbSnapshot } from "@/hooks/useCloudData";

interface ExtendedSnapshot extends DbSnapshot {
  p30s_w?: number | null;
  p60s_w?: number | null;
  map5min_w?: number | null;
  protocol_quality?: number | null;
}

interface SlotRow {
  key: string;
  label: string;
  value: number | null;
  unit: string;
}

export function TFCLTestingWeekStatusCard({
  snapshot,
}: {
  snapshot: ExtendedSnapshot | null;
}) {
  const navigate = useNavigate();

  const completion = useMemo(() => {
    if (!snapshot) return null;
    return computeTFCLCompletion({
      p30s_w: snapshot.p30s_w ?? null,
      p60s_w: snapshot.p60s_w ?? null,
      map5min_w: snapshot.map5min_w ?? null,
      ftp: snapshot.ftp ?? null,
      tte_observed_min: snapshot.tte_observed_min ?? null,
      protocol_quality: snapshot.protocol_quality ?? null,
    });
  }, [snapshot]);

  const slots: SlotRow[] = useMemo(() => {
    if (!snapshot) return [];
    return [
      { key: "p30s", label: "Sprint 30s", value: snapshot.p30s_w ?? null, unit: "W" },
      { key: "p60s", label: "Sprint 60s", value: snapshot.p60s_w ?? null, unit: "W" },
      { key: "map5", label: "MAP 5 min", value: snapshot.map5min_w ?? null, unit: "W" },
      { key: "ftp", label: "FTP + TTE", value: snapshot.ftp ?? null, unit: "W" },
    ];
  }, [snapshot]);

  // Joint Mader fit when the 4 efforts are present
  const jointFit = useMemo(() => {
    if (!snapshot || !completion?.isComplete) return null;
    if (!canRunMaderJointFit({
      p30s_w: snapshot.p30s_w ?? undefined,
      p60s_w: snapshot.p60s_w ?? undefined,
      map5min_w: snapshot.map5min_w ?? undefined,
      ftp: snapshot.ftp ?? undefined,
      weight_kg: snapshot.weight_kg ?? undefined,
    })) return null;

    try {
      return fitMaderJoint({
        p30s_w: snapshot.p30s_w as number,
        p60s_w: snapshot.p60s_w as number,
        map5min_w: snapshot.map5min_w as number,
        ftp: snapshot.ftp as number,
        tte_min: snapshot.tte_observed_min ?? null,
        weight_kg: snapshot.weight_kg as number,
      });
    } catch (e) {
      console.warn("Mader joint fit failed:", e);
      return null;
    }
  }, [snapshot, completion]);

  if (!snapshot) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Beaker className="h-4 w-4" /> Semaine Test TFCL™
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Sélectionnez un athlète pour voir le statut.
        </CardContent>
      </Card>
    );
  }

  const doneCount = slots.filter((s) => s.value != null && s.value > 0).length;
  const pct = Math.round((doneCount / slots.length) * 100);
  const quality = snapshot.protocol_quality ?? 3;

  // Precision badge logic
  const highPrecision =
    completion?.isComplete && quality >= 4 && jointFit?.convergence;
  const precisionLabel = highPrecision
    ? `Précision haute (~${jointFit!.rmsePct.toFixed(1)}% MLSS)`
    : completion?.isComplete
    ? "Précision standard (~5%)"
    : `Partiel (${doneCount}/4 efforts)`;

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Beaker className="h-4 w-4 text-primary" />
            Semaine Test TFCL™ — statut
          </CardTitle>
          <Badge
            variant={highPrecision ? "default" : "secondary"}
            className="text-[10px]"
          >
            {highPrecision && <Sparkles className="h-3 w-3 mr-1" />}
            {precisionLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Progress bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">
              {doneCount}/{slots.length} efforts enregistrés
            </span>
            <span className="font-medium">{pct}%</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>

        {/* Slot grid */}
        <div className="grid grid-cols-2 gap-2">
          {slots.map((slot) => {
            const filled = slot.value != null && slot.value > 0;
            return (
              <div
                key={slot.key}
                className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
                  filled
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-border bg-muted/30 text-muted-foreground"
                }`}
              >
                {filled ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-500 shrink-0" />
                ) : (
                  <Circle className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="font-medium truncate">{slot.label}</span>
                {filled && (
                  <span className="ml-auto tabular-nums">
                    {Math.round(slot.value!)} {slot.unit}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Joint fit summary */}
        {highPrecision && jointFit && (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-2.5 text-xs space-y-1">
            <div className="font-medium flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Fit Mader conjoint 4 efforts
            </div>
            <div className="grid grid-cols-3 gap-2 tabular-nums">
              <div>
                <div className="text-muted-foreground">VLamax</div>
                <div className="font-semibold">{jointFit.vlamax.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">VO₂max</div>
                <div className="font-semibold">{jointFit.vo2max.toFixed(1)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">MLSS</div>
                <div className="font-semibold">
                  {jointFit.mlssEstimated} W
                </div>
              </div>
            </div>
            <div className="text-muted-foreground pt-1">
              IC ±{jointFit.mlssConfidenceInterval.uncertaintyW} W (±
              {jointFit.mlssConfidenceInterval.uncertaintyPct}%) — Poffé 2024
            </div>
          </div>
        )}

        {/* Hint when partial */}
        {!completion?.isComplete && completion?.missingData && (
          <div className="text-xs text-muted-foreground">
            Manquant : {completion.missingData.join(", ")}
          </div>
        )}

        {/* CTA */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => navigate("/tfcl-testing-week")}
        >
          Aller à la Semaine Test
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
