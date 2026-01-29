/**
 * DERAIL SCREEN — Si ça déraille
 * 3 scénarios de secours simples
 */

import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PacingEnvelopeResult } from "@/lib/v2/pacingEnvelopeEngine";
import type { ScenarioSimulationResult } from "@/lib/v2/pacingScenarioSimulator";

interface DerailScreenProps {
  envelope: PacingEnvelopeResult;
  scenarios: ScenarioSimulationResult;
  raceReadinessScore: number | null;
  printMode?: boolean;
}

interface EmergencyScenario {
  id: string;
  trigger: string;
  icon: string;
  action: string;
}

function generateEmergencyScenarios(
  envelope: PacingEnvelopeResult,
  raceReadinessScore: number | null
): EmergencyScenario[] {
  const scenarios: EmergencyScenario[] = [];

  // Scenario A: Trop bien trop tôt
  scenarios.push({
    id: "too_good",
    trigger: "Je suis trop bien trop tôt",
    icon: "🚀",
    action: "Ralentis immédiatement. C'est un piège.",
  });

  // Scenario B: Moins bien que prévu
  const actionB = envelope.pacingProfile.type === "sensitive"
    ? "Stabilise. Ne compense JAMAIS."
    : "Stabilise. Garde ta réserve.";
  
  scenarios.push({
    id: "less_good",
    trigger: "Je suis moins bien que prévu",
    icon: "😰",
    action: actionB,
  });

  // Scenario C: Les autres partent
  scenarios.push({
    id: "others_go",
    trigger: "Les autres partent",
    icon: "👥",
    action: "Laisse-les. Tu les reverras.",
  });

  return scenarios;
}

export function DerailScreen({
  envelope,
  scenarios,
  raceReadinessScore,
  printMode = false,
}: DerailScreenProps) {
  const emergencyScenarios = React.useMemo(
    () => generateEmergencyScenarios(envelope, raceReadinessScore),
    [envelope, raceReadinessScore]
  );

  if (printMode) {
    return (
      <div className="py-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4 text-center">
          Si ça déraille
        </p>
        <div className="space-y-3 max-w-md mx-auto">
          {emergencyScenarios.map((scenario) => (
            <div key={scenario.id} className="border rounded-lg p-3">
              <p className="font-medium text-sm">{scenario.icon} {scenario.trigger}</p>
              <p className="text-sm text-muted-foreground mt-1">→ {scenario.action}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-4">
      {/* Title */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center gap-2 mb-6"
      >
        <AlertTriangle className="h-5 w-5 text-orange-500" />
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          Si ça déraille
        </p>
      </motion.div>

      {/* Scenarios */}
      <div className="flex-1 flex flex-col justify-center space-y-4 max-w-sm mx-auto">
        {emergencyScenarios.map((scenario, index) => (
          <motion.div
            key={scenario.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + index * 0.2 }}
            className={cn(
              "p-5 rounded-xl",
              "bg-muted/50 dark:bg-muted/30",
              "border border-border"
            )}
          >
            {/* Trigger */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{scenario.icon}</span>
              <p className="font-medium text-sm">{scenario.trigger}</p>
            </div>

            {/* Action */}
            <div className="pl-11">
              <p className="text-base font-bold text-foreground leading-snug">
                → {scenario.action}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Bottom message */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="text-center text-xs text-muted-foreground/70 mt-6"
      >
        Une seule réponse par situation.
      </motion.p>
    </div>
  );
}
