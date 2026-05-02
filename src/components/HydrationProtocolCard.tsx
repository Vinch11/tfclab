import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Droplets, AlertTriangle, Thermometer, Info } from "lucide-react";
import { computeHydrationProtocol, type HydrationInput } from "@/lib/hydrationProtocol";

interface Props {
  input: HydrationInput;
  staffMode?: boolean;
}

export function HydrationProtocolCard({ input, staffMode = false }: Props) {
  if (!input.weightKg || input.durationMin <= 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            Hydratation individualisée
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Données insuffisantes (poids et durée requis).</p>
        </CardContent>
      </Card>
    );
  }

  const protocol = computeHydrationProtocol(input);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-primary" />
            Hydratation individualisée
          </CardTitle>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline">
              Sueur: {protocol.sweatRateMlH} mL/h
              {protocol.sweatRateSource === "estimated" && " (est.)"}
            </Badge>
            {protocol.heatMultiplier > 1 && (
              <Badge variant="secondary" className="gap-1">
                <Thermometer className="h-3 w-3" />×{protocol.heatMultiplier}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Targets */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Liquide" value={`${protocol.fluidTargetMlH}`} unit="mL/h" />
          <Stat label="Sodium" value={`${protocol.sodiumMgPerH}`} unit="mg/h" />
          <Stat label="Total liquide" value={`${(protocol.totalFluidMl / 1000).toFixed(2)}`} unit="L" />
          <Stat label="Total sodium" value={`${(protocol.totalSodiumMg / 1000).toFixed(2)}`} unit="g" />
        </div>

        {/* Warnings */}
        {protocol.warnings.map((w, i) => (
          <Alert key={i} variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">{w}</AlertDescription>
          </Alert>
        ))}

        {/* Recommendations */}
        <div className="space-y-1.5">
          {protocol.recommendations.map((r, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{r}</span>
            </div>
          ))}
        </div>

        {/* Schedule preview */}
        {protocol.schedule.length > 0 && (
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Plan ({protocol.schedule.length} prises, toutes les 15 min)
            </p>
            <div className="grid grid-cols-2 gap-1 text-xs sm:grid-cols-4">
              {protocol.schedule.slice(0, 8).map((s) => (
                <div key={s.timeMin} className="rounded border bg-background px-2 py-1">
                  <div className="font-mono text-[10px] text-muted-foreground">T+{s.timeMin}min</div>
                  <div>{s.fluidMl} mL · {s.sodiumMg} mg Na</div>
                </div>
              ))}
              {protocol.schedule.length > 8 && (
                <div className="col-span-full text-center text-[11px] italic text-muted-foreground">
                  … + {protocol.schedule.length - 8} prises supplémentaires
                </div>
              )}
            </div>
          </div>
        )}

        {staffMode && (
          <div className="space-y-1 border-t pt-3 text-[11px] text-muted-foreground">
            <p className="font-medium">Références scientifiques</p>
            <p>• Baker LB (2017) — Sweat rate &amp; sodium concentration in athletes</p>
            <p>• ACSM Position Stand, Sawka et al. (2007) — Fluid replacement</p>
            <p>• Hew-Butler et al. (2015) — Exercise-associated hyponatremia statement</p>
            <p>• McCubbin et al. (2020) — SDA endurance nutrition position</p>
            <p className="pt-1 italic">
              Cap fluide: {protocol.fluidCapWarning ? "appliqué" : "non atteint"} · Phénotype Na: {input.sodiumPhenotype ?? "average"} ({protocol.sodiumMgPerL} mg/L)
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-2.5">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold leading-tight">
        {value} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
      </p>
    </div>
  );
}
