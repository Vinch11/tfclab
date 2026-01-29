/**
 * FOCUS SCREEN — Engagement mental
 * Écran d'ouverture Race-Day Mode
 */

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PacingEnvelopeResult } from "@/lib/v2/pacingEnvelopeEngine";

interface FocusScreenProps {
  athleteName: string;
  envelope: PacingEnvelopeResult;
  raceReadinessScore: number | null;
  customCoachPhrase?: string;
  isEngaged: boolean;
  onEngage: () => void;
  printMode?: boolean;
}

// Messages dynamiques selon le profil
const FOCUS_MESSAGES = {
  sensitive: [
    "Ta performance dépend de ta discipline.",
    "Si tu respectes le plan, tu finiras fort.",
    "Ton avantage est invisible. Protège-le.",
  ],
  balanced: [
    "La constance sera ta meilleure arme.",
    "Fais confiance au processus.",
    "La course commence plus tard.",
  ],
  low_readiness: [
    "Aujourd'hui, la prudence est ta force.",
    "Finir fort vaut mieux que partir fort.",
    "Écoute le plan, pas les sensations.",
  ],
  high_readiness: [
    "Tu es prêt. Maintenant, discipline.",
    "Ne gâche pas ta préparation par un départ trop rapide.",
    "La maîtrise fera la différence.",
  ],
};

function selectFocusMessage(
  envelope: PacingEnvelopeResult,
  raceReadinessScore: number | null,
  customPhrase?: string
): string {
  if (customPhrase) return customPhrase;

  let category: keyof typeof FOCUS_MESSAGES = "balanced";

  if (envelope.pacingProfile.type === "sensitive") {
    category = "sensitive";
  } else if (raceReadinessScore != null && raceReadinessScore < 65) {
    category = "low_readiness";
  } else if (raceReadinessScore != null && raceReadinessScore >= 85) {
    category = "high_readiness";
  }

  const messages = FOCUS_MESSAGES[category];
  return messages[Math.floor(Math.random() * messages.length)];
}

export function FocusScreen({
  athleteName,
  envelope,
  raceReadinessScore,
  customCoachPhrase,
  isEngaged,
  onEngage,
  printMode = false,
}: FocusScreenProps) {
  const focusMessage = React.useMemo(
    () => selectFocusMessage(envelope, raceReadinessScore, customCoachPhrase),
    [envelope, raceReadinessScore, customCoachPhrase]
  );

  if (printMode) {
    return (
      <div className="text-center py-6 border-b">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Focus</p>
        <p className="text-xl font-bold">{focusMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      {/* Title */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-xs text-muted-foreground uppercase tracking-widest mb-8"
      >
        Aujourd'hui, ton avantage est invisible.
      </motion.p>

      {/* Main message */}
      <motion.h2
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="text-2xl sm:text-3xl font-bold leading-tight max-w-xs"
      >
        {focusMessage}
      </motion.h2>

      {/* Engagement button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="mt-12"
      >
        {isEngaged ? (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-6 w-6" />
            <span className="font-medium">Engagé</span>
          </div>
        ) : (
          <Button
            size="lg"
            onClick={onEngage}
            className="h-14 px-8 text-base font-semibold rounded-full"
          >
            Je m'engage à respecter le plan
          </Button>
        )}
      </motion.div>

      {/* Subtle name */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-8 text-xs text-muted-foreground/50"
      >
        {athleteName}
      </motion.p>
    </div>
  );
}
