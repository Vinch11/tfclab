/**
 * RunMLSSCoherenceCard
 *
 * Affiche la cohérence MLSS run (Modèle C calibré N=14+3, RMSE 2.64%) :
 *  - MLSS_pct effectif (observed prioritaire, predicted en fallback)
 *  - Cross-validation observed vs predicted avec severity ok/warning/critical
 *
 * Source : `AthleteDiagnostic.runMLSS` (engines/diagnostic).
 * Variant `compact` pour intégration dans cartes existantes.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, AlertCircle, Activity, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { OutOfDomainBadge } from "@/components/OutOfDomainBadge";

import type { AthleteDiagnostic } from "@/engines/diagnostic";

interface RunMLSSCoherenceCardProps {
  runMLSS: AthleteDiagnostic["runMLSS"];
  /** compact: pas d'en-tête de carte, contenu inline */
  variant?: "card" | "compact" | "alert-only";
  className?: string;
}

export function RunMLSSCoherenceCard({
  runMLSS,
  variant = "card",
  className,
}: RunMLSSCoherenceCardProps) {
  if (!runMLSS) {
    if (variant === "alert-only") return null;
    return null;
  }

  const { effectivePct, effectiveSource, observedPct, prediction, crossValidation } = runMLSS;

  // En mode "alert-only", on n'affiche que les incohérences critical/warning
  if (variant === "alert-only") {
    if (!crossValidation || crossValidation.severity === "ok") return null;
    return (
      <Alert
        variant={crossValidation.severity === "critical" ? "destructive" : "default"}
        className={className}
      >
        {crossValidation.severity === "critical" ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <AlertTriangle className="h-4 w-4" />
        )}
        <AlertTitle>
          Cohérence MLSS run —{" "}
          {crossValidation.severity === "critical" ? "Incohérence majeure" : "Écart à surveiller"}
        </AlertTitle>
        <AlertDescription>
          <div className="text-sm">
            Observé {crossValidation.observed}% vs Modèle C {crossValidation.predicted}% (Δ
            {crossValidation.deltaPct > 0 ? "+" : ""}
            {crossValidation.deltaPct}%)
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{crossValidation.explanation}</div>
        </AlertDescription>
      </Alert>
    );
  }

  const sourceLabel =
    effectiveSource === "observed"
      ? "Observé (test seuil)"
      : effectiveSource === "predicted"
      ? "Estimé Modèle C"
      : "Indisponible";

  const sourceVariant =
    effectiveSource === "observed"
      ? "default"
      : effectiveSource === "predicted"
      ? "secondary"
      : "outline";

  const severityIcon =
    crossValidation?.severity === "ok" ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
    ) : crossValidation?.severity === "warning" ? (
      <AlertTriangle className="h-4 w-4 text-amber-600" />
    ) : crossValidation?.severity === "critical" ? (
      <AlertCircle className="h-4 w-4 text-destructive" />
    ) : null;

  const body = (
    <div className="space-y-3">
      {/* Valeur effective */}
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">MLSS run (% VO₂max)</div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">
              {effectivePct !== null ? `${effectivePct.toFixed(1)}%` : "—"}
            </span>
            <Badge variant={sourceVariant as "default" | "secondary" | "outline"}>
              {sourceLabel}
            </Badge>
          </div>
        </div>
      </div>

      {/* Détails observed + predicted si les deux dispo */}
      {observedPct !== null && prediction && (
        <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/30 p-2 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Observé</div>
            <div className="font-medium tabular-nums">{observedPct.toFixed(1)}%</div>
            <div className="text-[10px] text-muted-foreground">pace seuil / VMA</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Modèle C</div>
            <div className="font-medium tabular-nums">{prediction.mlssPct.toFixed(1)}%</div>
            <div className="text-[10px] text-muted-foreground">
              conf. {Math.round(prediction.confidence * 100)}%
            </div>
          </div>
        </div>
      )}

      {/* Fallback : seulement prediction */}
      {observedPct === null && prediction && (
        <div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/20 p-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          <div>
            Pas de test seuil disponible — estimation depuis VLamax run + CE (Modèle C, RMSE 2.6%).
            Réaliser un test seuil pour ancrer la valeur.
          </div>
        </div>
      )}

      {/* Cross-validation */}
      {crossValidation && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-md border p-2 text-xs",
            crossValidation.severity === "ok" &&
              "border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200",
            crossValidation.severity === "warning" &&
              "border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-200",
            crossValidation.severity === "critical" &&
              "border-destructive/40 bg-destructive/5 text-destructive"
          )}
        >
          {severityIcon}
          <div className="flex-1">
            <div className="font-medium">
              {crossValidation.severity === "ok"
                ? "Cohérence validée"
                : crossValidation.severity === "warning"
                ? `Écart modéré (Δ${crossValidation.deltaPct > 0 ? "+" : ""}${crossValidation.deltaPct}%)`
                : `Incohérence (Δ${crossValidation.deltaPct > 0 ? "+" : ""}${crossValidation.deltaPct}%)`}
            </div>
            <div className="mt-0.5 opacity-90">{crossValidation.explanation}</div>
          </div>
        </div>
      )}
    </div>
  );

  if (variant === "compact") {
    return <div className={className}>{body}</div>;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Activity className="h-4 w-4" />
          Cohérence MLSS run (Modèle C)
        </CardTitle>
      </CardHeader>
      <CardContent>{body}</CardContent>
    </Card>
  );
}
