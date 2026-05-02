/**
 * F3 — Caffeine Protocol Card
 * Affiche le protocole caféine personnalisé (pré-dose + relances)
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coffee, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeCaffeineProtocol,
  CAFFEINE_DISCLAIMER,
  type CaffeineSensitivity,
} from "@/lib/caffeineProtocol";

interface CaffeineProtocolCardProps {
  weightKg: number | null;
  durationMin: number;
  sensitivity?: CaffeineSensitivity;
  startTime?: string;
  habitualUser?: boolean;
  className?: string;
  staffMode?: boolean;
}

const SENSITIVITY_LABEL: Record<CaffeineSensitivity, string> = {
  fast: "Métaboliseur rapide",
  average: "Moyenne",
  slow: "Métaboliseur lent",
  unknown: "Non testée",
};

export function CaffeineProtocolCard({
  weightKg,
  durationMin,
  sensitivity = "unknown",
  startTime,
  habitualUser = true,
  className,
  staffMode = false,
}: CaffeineProtocolCardProps) {
  const protocol = useMemo(
    () =>
      computeCaffeineProtocol({
        weightKg,
        durationMin,
        sensitivity,
        startTime,
        habitualUser,
      }),
    [weightKg, durationMin, sensitivity, startTime, habitualUser]
  );

  const safetyColor =
    protocol.safetyFlag === "exceeded"
      ? "destructive"
      : protocol.safetyFlag === "warning"
      ? "warning"
      : "success";

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Coffee className="w-4 h-4" />
            <span>Protocole Caféine</span>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {SENSITIVITY_LABEL[sensitivity]}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {!protocol.isApplicable ? (
          <div className="p-2 bg-muted/50 rounded-lg flex items-start gap-2 text-xs">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">{protocol.reason}</p>
              {protocol.notes.map((n, i) => (
                <p key={i} className="text-muted-foreground mt-1">{n}</p>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Cumul */}
            <div className="flex items-center justify-between text-xs p-2 bg-muted/40 rounded-lg">
              <span className="text-muted-foreground">Cumul prévu</span>
              <span className="font-mono font-semibold text-foreground">
                {protocol.totalMg} mg ({protocol.totalMgKg} mg/kg)
              </span>
            </div>

            {/* Pré-dose */}
            {protocol.preDose && (
              <div className="border border-border/60 rounded-lg p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">
                    {protocol.preDose.label}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {protocol.preDose.timing}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono text-foreground">
                    {protocol.preDose.doseMgAbsolute} mg
                  </span>{" "}
                  ({protocol.preDose.doseMgKg} mg/kg) — {protocol.preDose.source}
                </p>
              </div>
            )}

            {/* Relances */}
            {protocol.inRaceDoses.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Relances intra-effort
                </p>
                {protocol.inRaceDoses.map((d, i) => (
                  <div
                    key={i}
                    className="border border-border/40 rounded-md p-2 flex items-center justify-between text-xs"
                  >
                    <span className="text-foreground">
                      {d.label} · <span className="text-muted-foreground">{d.timing}</span>
                    </span>
                    <span className="font-mono text-foreground">
                      {d.doseMgAbsolute} mg
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Safety + notes */}
            {protocol.safetyFlag !== "ok" && (
              <div
                className={cn(
                  "p-2 rounded-lg flex items-start gap-2 text-xs",
                  safetyColor === "destructive"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-warning/10 text-warning"
                )}
              >
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>
                  {protocol.safetyFlag === "exceeded"
                    ? "Cumul au-dessus du seuil de sécurité (9 mg/kg)."
                    : "Cumul élevé — tester en entraînement."}
                </span>
              </div>
            )}

            <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc pl-4">
              {protocol.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          </>
        )}

        {staffMode && (
          <div className="p-2 bg-muted/40 rounded-lg text-[10px] text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">Références</p>
            <ul className="list-disc pl-4">
              {protocol.references.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            <p className="italic">{CAFFEINE_DISCLAIMER}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
