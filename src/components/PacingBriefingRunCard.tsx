/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PACING BRIEFING RUN CARD — Mode "Briefing Jour J" Athlète
 * 
 * Vue simplifiée avec :
 * - 3 règles max
 * - 1 phrase clé
 * - Visualisation simple des zones
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Target, MessageCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type PacingEnvelopeRunResult,
  PACING_ZONE_COLORS,
} from "@/lib/v2/pacingEnvelopeRunning";
import { PacingConceptCard, PacingGlossaryHint } from "@/components/pacing/PacingPedagogy";

interface PacingBriefingRunCardProps {
  result: PacingEnvelopeRunResult | null;
  athleteName?: string;
  className?: string;
}

export function PacingBriefingRunCard({
  result,
  athleteName,
  className,
}: PacingBriefingRunCardProps) {
  if (!result) {
    return null;
  }

  const { briefing, distance, discipline_level } = result;
  const greenZone = result.zones.find((z) => z.zone === "GREEN");

  return (
    <Card className={cn("overflow-hidden border-2 border-primary/20", className)}>
      <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          Briefing Jour J — {distance}
          {athleteName && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {athleteName}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Phrase clé */}
        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <MessageCircle className="w-6 h-6 text-primary shrink-0 mt-0.5" />
            <p className="text-base font-medium text-primary leading-relaxed">
              "{briefing.key_phrase}"
            </p>
          </div>
        </div>

        {/* Visualisation couloir simplifié */}
        <div className="flex justify-center py-2">
          <div className="flex flex-col w-20 rounded-xl overflow-hidden shadow-lg">
            <div
              className="h-8 flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: PACING_ZONE_COLORS.RED }}
            >
              ⛔️
            </div>
            <div
              className="h-8 flex items-center justify-center text-white text-xs font-medium"
              style={{ backgroundColor: PACING_ZONE_COLORS.ORANGE }}
            >
              ⚠️
            </div>
            <div
              className="h-16 flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: PACING_ZONE_COLORS.GREEN }}
            >
              ✅ ICI
            </div>
          </div>
          <div className="ml-4 flex flex-col justify-center text-sm">
            <p className="text-destructive font-medium">Interdit</p>
            <p className="text-warning font-medium mt-2">Conditionnel</p>
            <p className="text-success font-medium mt-4">Ta zone</p>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground italic">
          {briefing.visualization_message}
        </p>

        <Separator />

        {/* 3 règles max */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            Tes 3 règles
          </h3>
          {briefing.rules_max_3.map((rule, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 bg-muted/40 rounded-lg"
            >
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                {idx + 1}
              </span>
              <p className="text-sm">{rule}</p>
            </div>
          ))}
        </div>

        <Separator />

        {/* Message à retenir */}
        <div className="bg-muted/30 rounded-lg p-4">
          <p className="text-sm font-medium text-center mb-2">À retenir</p>
          <p className="text-sm text-muted-foreground text-center italic">
            {briefing.message_to_remember}
          </p>
        </div>

        {/* Badge discipline */}
        {discipline_level !== "LOW" && (
          <div className="flex justify-center">
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                discipline_level === "VERY_HIGH" && "border-destructive text-destructive",
                discipline_level === "HIGH" && "border-warning text-warning",
                discipline_level === "MODERATE" && "border-primary text-primary"
              )}
            >
              <AlertTriangle className="w-3 h-3 mr-1" />
              Discipline {discipline_level === "VERY_HIGH" ? "maximale" : discipline_level === "HIGH" ? "élevée" : "normale"} requise
            </Badge>
          </div>
        )}

        {/* Zone d'allure si disponible */}
        {greenZone?.rangeSecPerKm && (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">Allure cible</p>
            <p className="text-xl font-mono font-bold text-success">
              {formatPaceDisplay(greenZone.rangeSecPerKm[0])} — {formatPaceDisplay(greenZone.rangeSecPerKm[1])}
            </p>
            <p className="text-xs text-muted-foreground">/km</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatPaceDisplay(secPerKm: number): string {
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}'${sec.toString().padStart(2, "0")}"`;
}
