/**
 * Run MLSS Drift Detection Card — Calibration glissante 42 jours.
 *
 * Affiche, pour les 3 axes du Modèle C (effectivePct / VLamax run / CE) :
 *   - direction (↗ ↘ →) + sévérité (none / info / warning / critical)
 *   - delta sur la fenêtre + nb de traces
 *   - synthèse de recalibration
 *
 * Source : `useRunMLSSDriftDetection` → traces RUN_MLSS_MODEL_C_TRACE (P3).
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRunMLSSDriftDetection } from "@/hooks/useRunMLSSDriftDetection";
import type {
  DriftDirection,
  DriftSeverity,
  MetricDrift,
} from "@/lib/calibration/runMLSSContinuous";

interface RunMLSSDriftDetectionCardProps {
  athleteId: string;
  className?: string;
}

const SEVERITY_STYLES: Record<DriftSeverity, { label: string; cls: string }> = {
  none: { label: "Stable", cls: "bg-muted text-muted-foreground" },
  info: { label: "Mineur", cls: "bg-secondary text-secondary-foreground" },
  warning: { label: "Notable", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30" },
  critical: { label: "Critique", cls: "bg-destructive/15 text-destructive border border-destructive/30" },
};

function DirectionIcon({ dir, sev }: { dir: DriftDirection; sev: DriftSeverity }) {
  const colorCls =
    sev === "critical"
      ? "text-destructive"
      : sev === "warning"
      ? "text-amber-600 dark:text-amber-400"
      : sev === "info"
      ? "text-muted-foreground"
      : "text-muted-foreground/60";

  if (dir === "rising") return <TrendingUp className={cn("h-4 w-4", colorCls)} />;
  if (dir === "falling") return <TrendingDown className={cn("h-4 w-4", colorCls)} />;
  return <Minus className={cn("h-4 w-4", colorCls)} />;
}

function MetricRow({ m }: { m: MetricDrift }) {
  const sevStyle = SEVERITY_STYLES[m.severity];
  const deltaTxt =
    m.deltaOverWindow == null
      ? "—"
      : `${m.deltaOverWindow > 0 ? "+" : ""}${m.deltaOverWindow.toFixed(2)} ${m.unit}`;

  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b last:border-b-0 border-border/50">
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <DirectionIcon dir={m.direction} sev={m.severity} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">{m.label}</span>
            <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5", sevStyle.cls)}>
              {sevStyle.label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{m.message}</p>
          {m.firstValue != null && m.lastValue != null && (
            <p className="text-[11px] text-muted-foreground/80 mt-0.5">
              n={m.n} · {m.firstValue.toFixed(2)} → {m.lastValue.toFixed(2)} {m.unit}
              {m.cv != null && ` · CV ${(m.cv * 100).toFixed(1)}%`}
            </p>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-mono font-semibold">{deltaTxt}</div>
        <div className="text-[10px] text-muted-foreground">sur fenêtre</div>
      </div>
    </div>
  );
}

export function RunMLSSDriftDetectionCard({
  athleteId,
  className,
}: RunMLSSDriftDetectionCardProps) {
  const { report, loading, refresh } = useRunMLSSDriftDetection(athleteId);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Calibration glissante Run MLSS — 42 j
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
            className="h-7 px-2"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Détection automatique des dérives CE / VLamax / MLSS effectif (Modèle C).
        </p>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {loading && !report && (
          <p className="text-sm text-muted-foreground py-4 text-center">Chargement…</p>
        )}

        {!loading && !report && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Aucune donnée — visiter la page Running Profile pour générer les premières traces.
          </p>
        )}

        {report && (
          <>
            {/* Bandeau global */}
            <div
              className={cn(
                "rounded-md p-3 flex items-start gap-2.5",
                report.recalibrationRecommended
                  ? "bg-amber-500/10 border border-amber-500/30"
                  : report.globalSeverity === "critical"
                  ? "bg-destructive/10 border border-destructive/30"
                  : "bg-muted/40 border border-border/50",
              )}
            >
              {report.insufficientData ? (
                <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              ) : report.recalibrationRecommended ? (
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              )}
              <div className="text-sm flex-1">
                {report.insufficientData ? (
                  <span className="text-muted-foreground">
                    Données insuffisantes — {report.tracesCount} trace
                    {report.tracesCount > 1 ? "s" : ""} sur la fenêtre.
                  </span>
                ) : report.recalibrationRecommended ? (
                  <span>
                    <strong>Recalibration recommandée.</strong>{" "}
                    <span className="text-muted-foreground">
                      {report.recalibrationReason}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Profil stable sur 42 j — aucune dérive significative détectée.
                  </span>
                )}
              </div>
            </div>

            {/* 3 métriques */}
            <div>
              <MetricRow m={report.metrics.effectivePct} />
              <MetricRow m={report.metrics.vlamaxRun} />
              <MetricRow m={report.metrics.runningEconomy} />
            </div>

            {/* Footer infos */}
            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
              <span>
                Fenêtre {report.windowStart} → {report.windowEnd} · {report.tracesCount}{" "}
                trace{report.tracesCount > 1 ? "s" : ""} · span {report.daysSpan} j
              </span>
              <span>
                Obs {report.sourceMix.observed} / Préd {report.sourceMix.predicted}
              </span>
            </div>

            {report.notes.length > 0 && (
              <ul className="text-[11px] text-muted-foreground space-y-0.5 pt-1">
                {report.notes.map((n, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-muted-foreground/60">·</span>
                    <span>{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
