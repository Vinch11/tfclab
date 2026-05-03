import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, Info } from "lucide-react";
import { computeNegativeSplitDelta } from "@/lib/v2/pacingDisciplineRules";

interface Props {
  raceObjective: "Marathon" | "10km";
  vlamaxValue: number | null;
  tteMin: number | null;
  raceDurationMin: number;
}

const CONFIDENCE_LABEL: Record<"low" | "medium" | "high", string> = {
  low: "Faible (estimation médiane)",
  medium: "Moyenne (1 paramètre observé)",
  high: "Élevée (VLamax + TTE observés)",
};

const CONFIDENCE_VARIANT: Record<"low" | "medium" | "high", "secondary" | "outline" | "default"> = {
  low: "outline",
  medium: "secondary",
  high: "default",
};

export function NegativeSplitPreviewCard({ raceObjective, vlamaxValue, tteMin, raceDurationMin }: Props) {
  const delta = React.useMemo(
    () => computeNegativeSplitDelta(raceObjective, vlamaxValue, tteMin, raceDurationMin),
    [raceObjective, vlamaxValue, tteMin, raceDurationMin],
  );

  // Position de la cible sur la barre, normalisée sur les bornes absolues du format
  const absMin = raceObjective === "Marathon" ? 0.5 : 0.3;
  const absMax = raceObjective === "Marathon" ? 4.0 : 2.5;
  const span = absMax - absMin;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - absMin) / span) * 100));

  const minPos = pct(delta.minPct);
  const maxPos = pct(delta.maxPct);
  const targetPos = pct(delta.targetPct);

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-primary" />
            Negative split personnalisé — {raceObjective}
          </CardTitle>
          <Badge variant={CONFIDENCE_VARIANT[delta.confidence]} className="text-[10px]">
            Confiance : {delta.confidence}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        {/* Bornes & cible */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-md border border-border bg-muted/30 py-2">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Min</div>
            <div className="text-lg font-bold text-foreground">{delta.minPct}%</div>
          </div>
          <div className="rounded-md border border-primary bg-primary/10 py-2">
            <div className="text-[10px] uppercase text-primary tracking-wide">Cible</div>
            <div className="text-lg font-bold text-primary">{delta.targetPct}%</div>
          </div>
          <div className="rounded-md border border-border bg-muted/30 py-2">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wide">Max</div>
            <div className="text-lg font-bold text-foreground">{delta.maxPct}%</div>
          </div>
        </div>

        {/* Barre visuelle */}
        <div className="space-y-1.5">
          <div className="relative h-3 rounded-full bg-muted overflow-hidden">
            {/* Bornes physiologiques absolues = fond */}
            {/* Plage personnalisée min-max */}
            <div
              className="absolute top-0 h-full bg-primary/30"
              style={{ left: `${minPos}%`, width: `${Math.max(2, maxPos - minPos)}%` }}
            />
            {/* Cible */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-4 w-1 bg-primary rounded-full"
              style={{ left: `${targetPos}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{absMin}% (bornes physio)</span>
            <span>{absMax}%</span>
          </div>
        </div>

        {/* Sources VLamax / TTE */}
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={delta.vlamaxSource === "observed" ? "default" : "outline"}
            className="text-[10px] font-normal"
          >
            VLamax : {delta.vlamaxSource === "observed" ? `mesurée ${delta.vlamaxUsed}` : `défaut ${delta.vlamaxUsed}`}
          </Badge>
          <Badge
            variant={delta.tteSource === "observed" ? "default" : "outline"}
            className="text-[10px] font-normal"
          >
            TTE : {delta.tteSource === "observed" ? `mesurée ${delta.tteUsedMin}min` : `défaut ${delta.tteUsedMin}min`}
          </Badge>
        </div>

        {/* Rationale */}
        <div className="rounded-md bg-muted/40 border border-border p-2.5 space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
            <Info className="h-3 w-3" />
            Calibration physiologique
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{delta.rationale}</p>
          <p className="text-[10px] text-muted-foreground/80 italic">
            {CONFIDENCE_LABEL[delta.confidence]} • Référence : Hanley 2020, Casado 2021
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
