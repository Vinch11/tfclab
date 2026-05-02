/**
 * F4 — Carb Loading Protocol Card
 * Affiche le protocole de chargement glucidique J-2 → Race Morning
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wheat, Info, Check, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeCarbLoading,
  CARB_LOADING_DISCLAIMER,
  type LoadingProtocolType,
} from "@/lib/carbLoadingProtocol";

interface CarbLoadingCardProps {
  weightKg: number | null;
  durationMin: number;
  startTime?: string;
  isHotRace?: boolean;
  className?: string;
  staffMode?: boolean;
}

const PROTOCOL_BADGE_COLOR: Record<LoadingProtocolType, "secondary" | "default" | "destructive"> = {
  none: "secondary",
  maintenance: "secondary",
  moderate: "default",
  full: "default",
  ultra: "destructive",
};

export function CarbLoadingCard({
  weightKg,
  durationMin,
  startTime,
  isHotRace = false,
  className,
  staffMode = false,
}: CarbLoadingCardProps) {
  const protocol = useMemo(
    () => computeCarbLoading({ weightKg, durationMin, startTime, isHotRace }),
    [weightKg, durationMin, startTime, isHotRace]
  );

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Wheat className="w-4 h-4" />
            <span>Carb Loading</span>
          </div>
          <Badge variant={PROTOCOL_BADGE_COLOR[protocol.protocolType]} className="text-[10px]">
            {protocol.protocolLabel}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {!protocol.isApplicable ? (
          <div className="p-2 bg-muted/50 rounded-lg flex items-start gap-2 text-xs">
            <Info className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-muted-foreground">{protocol.reason}</p>
              {protocol.dosCheckList.map((d, i) => (
                <p key={i} className="text-muted-foreground mt-1">• {d}</p>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Cumul */}
            <div className="flex items-center justify-between text-xs p-2 bg-muted/40 rounded-lg">
              <span className="text-muted-foreground">Cumul glucides 3 jours + repas</span>
              <span className="font-mono font-semibold text-foreground">
                {protocol.totalLoadingCarbs} g
              </span>
            </div>

            {/* Plan par jour */}
            <div className="space-y-2">
              {protocol.days.map((day) => (
                <div
                  key={day.day}
                  className="border border-border/60 rounded-lg p-2 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      {day.label}
                    </span>
                    <span className="text-xs font-mono text-foreground">
                      {day.carbsGKg} g/kg → {day.carbsGTotal} g
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    💧 {day.fluidsML} mL · Na⁺ {day.sodiumMgPerLiter} mg/L
                  </p>
                  <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc pl-4">
                    {day.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Pre-race meal */}
            {protocol.preRaceMeal && (
              <div className="border border-primary/30 bg-primary/5 rounded-lg p-2 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-primary flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Pre-race meal
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {protocol.preRaceMeal.timing}
                  </Badge>
                </div>
                <p className="text-xs font-mono text-foreground">
                  {protocol.preRaceMeal.carbsGKg} g/kg → {protocol.preRaceMeal.carbsGTotal} g CHO
                </p>
                <ul className="text-[11px] text-muted-foreground space-y-0.5 list-disc pl-4">
                  {protocol.preRaceMeal.composition.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
                <ul className="text-[10px] text-muted-foreground italic space-y-0.5 pt-1 border-t border-border/40">
                  {protocol.preRaceMeal.notes.map((n, i) => (
                    <li key={i}>· {n}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Do / Don't */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="border border-success/40 bg-success/5 rounded-lg p-2">
                <p className="text-[11px] font-semibold text-success flex items-center gap-1 mb-1">
                  <Check className="w-3 h-3" /> À privilégier
                </p>
                <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc pl-4">
                  {protocol.dosCheckList.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
              <div className="border border-destructive/40 bg-destructive/5 rounded-lg p-2">
                <p className="text-[11px] font-semibold text-destructive flex items-center gap-1 mb-1">
                  <X className="w-3 h-3" /> À éviter
                </p>
                <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc pl-4">
                  {protocol.dontsCheckList.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </div>
            </div>
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
            <p className="italic">{CARB_LOADING_DISCLAIMER}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
