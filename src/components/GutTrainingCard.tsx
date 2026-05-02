/**
 * F5 — Gut Training Protocol Card
 * Affiche le programme progressif d'entraînement digestif
 */

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, CheckCircle2, Info, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeGutTrainingProtocol,
  GUT_TRAINING_DISCLAIMER,
  type GutLevel,
} from "@/lib/gutTrainingProtocol";

interface GutTrainingCardProps {
  currentLevel: GutLevel;
  targetGph: number;
  weeksAvailable: number;
  sport: "velo" | "cap" | "triathlon";
  weightKg?: number | null;
  className?: string;
  staffMode?: boolean;
}

const LEVEL_LABEL: Record<GutLevel, string> = {
  untrained: "Non entraîné",
  developing: "En développement",
  trained: "Entraîné",
  elite: "Élite",
};

export function GutTrainingCard({
  currentLevel,
  targetGph,
  weeksAvailable,
  sport,
  weightKg,
  className,
  staffMode = false,
}: GutTrainingCardProps) {
  const protocol = useMemo(
    () => computeGutTrainingProtocol({ currentLevel, targetGph, weeksAvailable, sport, weightKg }),
    [currentLevel, targetGph, weeksAvailable, sport, weightKg]
  );

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            <span>Gut Training</span>
          </div>
          <Badge variant="outline" className="text-[10px]">
            {LEVEL_LABEL[currentLevel]} → {protocol.targetGph} g/h
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {!protocol.isApplicable ? (
          <div className="p-2 bg-success/10 border border-success/30 rounded-lg flex items-start gap-2 text-xs">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-success" />
            <div>
              <p className="text-success font-semibold">Aucun protocole nécessaire</p>
              <p className="text-muted-foreground mt-1">{protocol.reason}</p>
              {protocol.successCriteria.map((s, i) => (
                <p key={i} className="text-muted-foreground mt-1">• {s}</p>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Résumé timeline */}
            <div
              className={cn(
                "p-2 rounded-lg flex items-start gap-2 text-xs",
                protocol.fitsTimeline
                  ? "bg-success/10 border border-success/30"
                  : "bg-warning/10 border border-warning/30"
              )}
            >
              <TrendingUp className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className={cn("font-semibold", protocol.fitsTimeline ? "text-success" : "text-warning")}>
                  {protocol.weeksNeeded} semaines requises
                </p>
                <p className="text-muted-foreground">
                  De {protocol.startGph} g/h → {protocol.targetGph} g/h ·{" "}
                  {weeksAvailable} sem. dispo
                  {!protocol.fitsTimeline && " ⚠️ Délai insuffisant — viser palier intermédiaire"}
                </p>
              </div>
            </div>

            {/* Progression hebdomadaire */}
            <div className="space-y-1.5">
              {protocol.weeks.map((week) => (
                <div
                  key={week.weekNumber}
                  className="border border-border/60 rounded-lg p-2 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">
                      Semaine {week.weekNumber}
                    </span>
                    <span className="text-xs font-mono text-foreground">
                      {week.targetGph} g/h
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground space-y-0.5">
                    <p>
                      🔁 {week.sessionsPerWeek}× / sem · {week.sessionDurationMin} min · {week.rpeWindow}
                    </p>
                    <p>🥤 Format : {week.format}</p>
                    <p>⚗️ Ratio : {week.glucoseFructoseRatio}</p>
                    {week.notes.length > 0 && (
                      <ul className="list-none pl-0 space-y-0.5 pt-1 border-t border-border/40">
                        {week.notes.map((n, i) => (
                          <li key={i}>{n}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Warning + Success */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="border border-warning/40 bg-warning/5 rounded-lg p-2">
                <p className="text-[11px] font-semibold text-warning flex items-center gap-1 mb-1">
                  <AlertTriangle className="w-3 h-3" /> Signaux d'alerte
                </p>
                <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc pl-4">
                  {protocol.warningSigns.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
              <div className="border border-success/40 bg-success/5 rounded-lg p-2">
                <p className="text-[11px] font-semibold text-success flex items-center gap-1 mb-1">
                  <CheckCircle2 className="w-3 h-3" /> Critères de succès
                </p>
                <ul className="text-[10px] text-muted-foreground space-y-0.5 list-disc pl-4">
                  {protocol.successCriteria.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        )}

        {staffMode && (
          <div className="p-2 bg-muted/40 rounded-lg text-[10px] text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1">
              <Info className="w-3 h-3" /> Références
            </p>
            <ul className="list-disc pl-4">
              {protocol.references.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
            <p className="italic">{GUT_TRAINING_DISCLAIMER}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
