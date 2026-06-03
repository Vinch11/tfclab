/**
 * TFCL Testing Week Status Card — sport-aware
 * ───────────────────────────────────────────
 * Affiche, dans la Checklist Coach, l'avancement de la Semaine Test TFCL™ :
 *   - sport "tri"          → Semaine Test BIKE (4 efforts puissance)
 *   - sport "run" / "trail"→ Semaine Test CAP  (sprint 15s, VMA, seuil, TTE)
 *
 * Pour le mode BIKE complet + protocol_quality ≥ 4 → fit Mader conjoint
 * (precision haute ~3% MLSS). Pour le mode CAP, badge "Précision CAP" si
 * les 3 cœurs (sprint, VMA, seuil) sont remplis.
 */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Sparkles, ChevronRight, Beaker, Footprints, Bike } from "lucide-react";
import { computeTFCLCompletion } from "@/data/tfclTestingWeek";
import { computeCAPCompletion } from "@/data/capTestingWeek";
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
  sprint_15s_distance?: number | null;
  pace_threshold_sec_per_km?: number | null;
  tte_observed_min_run?: number | null;
  running_power_max?: number | null;
  running_power_threshold?: number | null;
}

interface SlotRow {
  key: string;
  label: string;
  display: string | null; // formatted value
  filled: boolean;
}

type SportTab = "run" | "tri" | "trail";

interface Props {
  snapshot: ExtendedSnapshot | null;
  sport?: SportTab;
}

function formatPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60).toString().padStart(2, "0");
  return `${m}:${s}/km`;
}

export function TFCLTestingWeekStatusCard({ snapshot, sport = "tri" }: Props) {
  const navigate = useNavigate();
  const mode: "bike" | "cap" = sport === "tri" ? "bike" : "cap";

  // ─────────── BIKE mode ───────────
  const bikeCompletion = useMemo(() => {
    if (!snapshot || mode !== "bike") return null;
    return computeTFCLCompletion({
      p30s_w: snapshot.p30s_w ?? null,
      p60s_w: snapshot.p60s_w ?? null,
      map5min_w: snapshot.map5min_w ?? null,
      ftp: snapshot.ftp ?? null,
      tte_observed_min: snapshot.tte_observed_min ?? null,
      protocol_quality: snapshot.protocol_quality ?? null,
    });
  }, [snapshot, mode]);

  const jointFit = useMemo(() => {
    if (mode !== "bike" || !snapshot || !bikeCompletion?.isComplete) return null;
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
  }, [snapshot, bikeCompletion, mode]);

  // ─────────── CAP mode ───────────
  const capCompletion = useMemo(() => {
    if (!snapshot || mode !== "cap") return null;
    return computeCAPCompletion({
      sprint_15s_distance: snapshot.sprint_15s_distance ?? null,
      vma: snapshot.vma ?? null,
      pace_threshold_sec_per_km: snapshot.pace_threshold_sec_per_km ?? null,
      tte_observed_min: snapshot.tte_observed_min ?? null,
      tte_observed_min_run: snapshot.tte_observed_min_run ?? null,
      running_power_max: snapshot.running_power_max ?? null,
      running_power_threshold: snapshot.running_power_threshold ?? null,
      protocol_quality: snapshot.protocol_quality ?? null,
    });
  }, [snapshot, mode]);

  // ─────────── Slot rows ───────────
  const slots: SlotRow[] = useMemo(() => {
    if (!snapshot) return [];
    if (mode === "bike") {
      const rows: Array<[string, string, number | null, string]> = [
        ["p30s", "Sprint 30s", snapshot.p30s_w ?? null, "W"],
        ["p60s", "Sprint 60s", snapshot.p60s_w ?? null, "W"],
        ["map5", "MAP 5 min", snapshot.map5min_w ?? null, "W"],
        ["ftp", "FTP + TTE", snapshot.ftp ?? null, "W"],
      ];
      return rows.map(([k, l, v, u]) => ({
        key: k, label: l,
        display: v != null && v > 0 ? `${Math.round(v)} ${u}` : null,
        filled: v != null && v > 0,
      }));
    }
    // CAP
    const sprint = snapshot.sprint_15s_distance ?? null;
    const vma = snapshot.vma ?? null;
    const seuil = snapshot.pace_threshold_sec_per_km ?? null;
    const tte = snapshot.tte_observed_min_run ?? null;
    return [
      { key: "sprint", label: "Sprint 15s", display: sprint ? `${Math.round(sprint)} m` : null, filled: !!sprint },
      { key: "vma", label: "VMA", display: vma ? `${vma.toFixed(1)} km/h` : null, filled: !!vma },
      { key: "seuil", label: "Allure Seuil", display: seuil ? formatPace(seuil) : null, filled: !!seuil },
      { key: "tte", label: "TTE observé", display: tte ? `${tte} min` : null, filled: !!tte },
    ];
  }, [snapshot, mode]);

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

  const doneCount = slots.filter((s) => s.filled).length;
  const pct = Math.round((doneCount / slots.length) * 100);
  const quality = snapshot.protocol_quality ?? 3;

  // ─────────── Badge précision ───────────
  let precisionLabel: string;
  let highPrecision = false;
  if (mode === "bike") {
    highPrecision = !!(bikeCompletion?.isComplete && quality >= 4 && jointFit?.convergence);
    precisionLabel = highPrecision
      ? `Précision haute (~${jointFit!.rmsePct.toFixed(1)}% MLSS)`
      : bikeCompletion?.isComplete
      ? "Précision standard (~5%)"
      : `Partiel (${doneCount}/${slots.length} efforts)`;
  } else {
    highPrecision = !!capCompletion?.isComplete;
    precisionLabel = highPrecision
      ? "VLamax CAP calibrée ✓"
      : `Partiel (${doneCount}/${slots.length} données)`;
  }

  const route = mode === "bike" ? "/tfcl-testing-week" : "/diagnostic/testing-week-cap";
  const ctaLabel = mode === "bike" ? "Aller à la Semaine Test BIKE" : "Aller à la Semaine Test CAP";
  const ModeIcon = mode === "bike" ? Bike : Footprints;
  const title = mode === "bike"
    ? "Semaine Test TFCL™ BIKE — statut"
    : "Semaine Test TFCL™ CAP — statut";
  const missing = mode === "bike" ? bikeCompletion?.missingData : capCompletion?.missingData;
  const complete = mode === "bike" ? bikeCompletion?.isComplete : capCompletion?.isComplete;

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ModeIcon className="h-4 w-4 text-primary" />
            {title}
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
        {/* Progress */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">
              {doneCount}/{slots.length} {mode === "bike" ? "efforts" : "données"} enregistré{doneCount > 1 ? "s" : ""}
            </span>
            <span className="font-medium">{pct}%</span>
          </div>
          <Progress value={pct} className="h-1.5" />
        </div>

        {/* Slot grid */}
        <div className="grid grid-cols-2 gap-2">
          {slots.map((slot) => (
            <div
              key={slot.key}
              className={`flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs ${
                slot.filled
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-border bg-muted/30 text-muted-foreground"
              }`}
            >
              {slot.filled ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-500 shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0" />
              )}
              <span className="font-medium truncate">{slot.label}</span>
              {slot.display && (
                <span className="ml-auto tabular-nums">{slot.display}</span>
              )}
            </div>
          ))}
        </div>

        {/* Joint fit (BIKE only) */}
        {mode === "bike" && highPrecision && jointFit && (
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
                <div className="font-semibold">{jointFit.mlssEstimated} W</div>
              </div>
            </div>
            <div className="text-muted-foreground pt-1">
              IC ±{jointFit.mlssConfidenceInterval.uncertaintyW} W (±
              {jointFit.mlssConfidenceInterval.uncertaintyPct}%) — Poffé 2024
            </div>
          </div>
        )}

        {/* Manquant */}
        {!complete && missing && missing.length > 0 && (
          <div className="text-xs text-muted-foreground">
            Manquant : {missing.join(", ")}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => navigate(route)}
        >
          {ctaLabel}
          <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
