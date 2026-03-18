/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RACE DAY BRIEFING MODE™ — Mode Athlète Jour J
 * Two For Coaching Lab Method™
 * 
 * Écran simplifié, non technique, pour l'athlète le jour de la course.
 * 4 blocs: Message clé, Couloir, Règles d'or, Erreurs à éviter
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { 
  Target, 
  Shield, 
  AlertTriangle, 
  CheckCircle2,
  Printer,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  generateRaceDayBriefing,
  getToneBgColor,
  getZoneColorClass,
  getZoneBorderClass,
  type AthleteBriefingInput,
  type RaceDayBriefingResult,
} from "@/lib/v2/raceDayBriefing";

import type { PacingEnvelopeResult, RaceObjective } from "@/lib/v2/pacingEnvelopeEngine";
import type { DisciplineRulesResult } from "@/lib/v2/pacingDisciplineRules";
import type { ScenarioSimulationResult } from "@/lib/v2/pacingScenarioSimulator";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface RaceDayBriefingModeProps {
  athleteName: string;
  envelope: PacingEnvelopeResult;
  rules: DisciplineRulesResult;
  scenarios: ScenarioSimulationResult;
  raceObjective: RaceObjective;
  potentielPhysiologiqueScore: number | null;
  onClose?: () => void;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function RaceDayBriefingMode({
  athleteName,
  envelope,
  rules,
  scenarios,
  raceObjective,
  potentielPhysiologiqueScore,
  onClose,
  className,
}: RaceDayBriefingModeProps) {
  const [showNumbers, setShowNumbers] = React.useState(false);
  
  // Générer le briefing
  const briefing = useMemo(() => {
    return generateRaceDayBriefing({
      athleteName,
      envelope,
      rules,
      scenarios,
      raceObjective,
      potentielPhysiologiqueScore,
    });
  }, [athleteName, envelope, rules, scenarios, raceObjective, potentielPhysiologiqueScore]);

  // Print function
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={cn("space-y-4 print:space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-xl font-bold">Briefing Jour J</h2>
          <p className="text-sm text-muted-foreground">{athleteName} — {raceObjective}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-1" />
            Imprimer
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* BLOC 1: Message clé */}
      <Card className={cn("border-2", getToneBgColor(briefing.keyMessage.tone))}>
        <CardContent className="p-4 sm:p-6 text-center">
          <div className="text-4xl mb-3">{briefing.keyMessage.icon}</div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            {briefing.keyMessage.title}
          </h3>
          <p className="text-xl sm:text-2xl font-bold leading-tight">
            {briefing.keyMessage.message}
          </p>
        </CardContent>
      </Card>

      {/* BLOC 2: Couloir de course */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-5 w-5" />
              Ton couloir de course
            </CardTitle>
            <div className="flex items-center gap-2 print:hidden">
              <Label htmlFor="show-numbers" className="text-xs text-muted-foreground">
                Afficher les %
              </Label>
              <Switch 
                id="show-numbers" 
                checked={showNumbers} 
                onCheckedChange={setShowNumbers}
                className="scale-75"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Zones visuelles */}
          <div className="flex gap-2 h-12 rounded-lg overflow-hidden">
            <div className="flex-1 bg-green-500 flex items-center justify-center text-white font-medium text-sm">
              {showNumbers ? `${envelope.boundary.lowPct}–${envelope.boundary.highPct}%` : "Zone idéale"}
            </div>
            <div className="w-20 bg-orange-500 flex items-center justify-center text-white font-medium text-xs">
              {showNumbers ? `→${envelope.boundary.toleratedPct}%` : "Limite"}
            </div>
            <div className="w-12 bg-red-500 flex items-center justify-center text-white font-medium text-xs">
              ⚠️
            </div>
          </div>

          {/* Descriptions des zones */}
          <div className="space-y-2">
            {briefing.zones.map((zone) => (
              <div 
                key={zone.name}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg border-l-4",
                  getZoneBorderClass(zone.color),
                  "bg-muted/50"
                )}
              >
                <div className={cn("w-3 h-3 rounded-full flex-shrink-0", getZoneColorClass(zone.color))} />
                <div>
                  <span className="font-medium text-sm">{zone.label}</span>
                  <p className="text-xs text-muted-foreground">{zone.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Phrase corridor */}
          <p className="text-center text-sm font-medium text-muted-foreground italic pt-2 border-t">
            "{briefing.corridorPhrase}"
          </p>
        </CardContent>
      </Card>

      {/* BLOC 3: Règles d'or */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            Règles d'or
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {briefing.goldenRules.map((rule, index) => (
              <div 
                key={rule.id}
                className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800"
              >
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                  {index + 1}
                </div>
                <p className="text-sm font-medium flex-1">{rule.text}</p>
                {rule.isMemorizable && (
                  <CheckCircle2 className="h-4 w-4 text-amber-600 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* BLOC 4: Erreurs à éviter */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="h-5 w-5" />
            Erreurs à ne pas faire
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {briefing.criticalErrors.map((error) => (
              <div 
                key={error.id}
                className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{error.icon}</span>
                  <span className="font-medium text-sm text-red-700 dark:text-red-300">
                    {error.title}
                  </span>
                </div>
                <p className="text-xs text-red-600/80 dark:text-red-400/80 italic pl-7">
                  {error.explanation}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer - Print only */}
      <div className="hidden print:block text-center text-xs text-muted-foreground pt-4 border-t">
        <p>Briefing généré par TFCL™ — Two For Coaching Lab</p>
        <p>{new Date().toLocaleDateString('fr-FR', { dateStyle: 'full' })}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export default RaceDayBriefingMode;
