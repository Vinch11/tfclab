/**
 * RULES SCREEN — Règles non négociables
 * 3-5 règles simples et mémorisables
 */

import React from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DisciplineRulesResult } from "@/lib/v2/pacingDisciplineRules";
import type { RaceObjective } from "@/lib/v2/pacingEnvelopeEngine";

interface RulesScreenProps {
  rules: DisciplineRulesResult;
  raceObjective: RaceObjective;
  printMode?: boolean;
}

// Règles simplifiées pour mobile (plus courtes)
const MOBILE_RULES = [
  { id: "first_30", text: "Les 30 premières minutes sont non négociables." },
  { id: "hesitate", text: "Si tu hésites, ralentis." },
  { id: "attacks", text: "Ne réponds pas aux attaques." },
  { id: "race_starts", text: "Ta course commence après la mi-parcours." },
  { id: "discipline", text: "La discipline est ton avantage." },
];

function selectRulesForMobile(
  rules: DisciplineRulesResult,
  raceObjective: RaceObjective
): string[] {
  // Toujours inclure les règles critiques
  const selected: string[] = [];

  // Règle 1: Toujours les 30 premières minutes
  selected.push(MOBILE_RULES.find(r => r.id === "first_30")!.text);

  // Règle 2: Si profil sensible, discipline
  if (rules.showSensitiveBadge) {
    selected.push(MOBILE_RULES.find(r => r.id === "discipline")!.text);
  } else {
    selected.push(MOBILE_RULES.find(r => r.id === "hesitate")!.text);
  }

  // Règle 3: Ne pas répondre aux attaques
  selected.push(MOBILE_RULES.find(r => r.id === "attacks")!.text);

  // Règle 4: Dépend de la distance
  if (["IM", "Marathon"].includes(raceObjective)) {
    selected.push(MOBILE_RULES.find(r => r.id === "race_starts")!.text);
  } else {
    selected.push("Garde ta réserve pour le final.");
  }

  // Max 4 règles pour mobile
  return selected.slice(0, 4);
}

export function RulesScreen({
  rules,
  raceObjective,
  printMode = false,
}: RulesScreenProps) {
  const mobileRules = React.useMemo(
    () => selectRulesForMobile(rules, raceObjective),
    [rules, raceObjective]
  );

  if (printMode) {
    return (
      <div className="py-6 border-b">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4 text-center">
          Règles non négociables
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm max-w-md mx-auto">
          {mobileRules.map((rule, i) => (
            <li key={i}>{rule}</li>
          ))}
        </ol>
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
        <Shield className="h-5 w-5 text-amber-500" />
        <p className="text-xs text-muted-foreground uppercase tracking-widest">
          Règles non négociables
        </p>
      </motion.div>

      {/* Rules list */}
      <div className="flex-1 flex flex-col justify-center space-y-4 max-w-sm mx-auto">
        {mobileRules.map((rule, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + index * 0.15 }}
            className={cn(
              "flex items-start gap-4 p-4 rounded-xl",
              "bg-amber-50 dark:bg-amber-900/20",
              "border border-amber-200 dark:border-amber-800"
            )}
          >
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
              {index + 1}
            </div>
            <p className="text-sm font-medium leading-snug pt-1">{rule}</p>
          </motion.div>
        ))}
      </div>

      {/* Subtle reminder */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center text-xs text-muted-foreground/70 mt-6"
      >
        Aucune exception.
      </motion.p>
    </div>
  );
}
