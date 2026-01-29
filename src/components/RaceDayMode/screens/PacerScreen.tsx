/**
 * PACER SCREEN — Couloir de course simplifié
 * Visualisation mobile du Pacing Envelope
 */

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PacingEnvelopeResult } from "@/lib/v2/pacingEnvelopeEngine";

interface PacerScreenProps {
  envelope: PacingEnvelopeResult;
  showMarkers: boolean;
  onToggleMarkers: () => void;
  printMode?: boolean;
}

export function PacerScreen({
  envelope,
  showMarkers,
  onToggleMarkers,
  printMode = false,
}: PacerScreenProps) {
  const { boundary } = envelope;

  // Calculate zone heights (proportional)
  const redHeight = 15; // Fixed small
  const orangeHeight = 15; // Fixed small
  const greenHeight = 70; // Dominant

  if (printMode) {
    return (
      <div className="py-6 border-b">
        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4 text-center">Couloir de course</p>
        <div className="flex justify-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded" />
            <span className="text-sm">Zone stable</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-500 rounded" />
            <span className="text-sm">Limite</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded" />
            <span className="text-sm">Interdit</span>
          </div>
        </div>
        <p className="text-center text-sm mt-4 italic">
          "Rester ici au début = performance plus tard."
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-4">
      {/* Title */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xs text-muted-foreground uppercase tracking-widest text-center mb-4"
      >
        Ton couloir de course
      </motion.p>

      {/* Envelope visualization */}
      <motion.div
        initial={{ opacity: 0, scaleY: 0.8 }}
        animate={{ opacity: 1, scaleY: 1 }}
        transition={{ delay: 0.2 }}
        className="flex-1 flex flex-col rounded-2xl overflow-hidden max-h-[400px] mx-auto w-full max-w-[200px] shadow-lg"
      >
        {/* Red zone - top */}
        <div
          className="bg-red-500 flex items-center justify-center text-white relative"
          style={{ height: `${redHeight}%` }}
        >
          <span className="text-xs font-bold">⛔️</span>
          {showMarkers && (
            <span className="absolute right-2 text-[10px] font-mono opacity-70">
              &gt;{boundary.toleratedPct}%
            </span>
          )}
        </div>

        {/* Orange zone */}
        <div
          className="bg-orange-500 flex items-center justify-center text-white relative"
          style={{ height: `${orangeHeight}%` }}
        >
          <span className="text-xs font-medium">Limite</span>
          {showMarkers && (
            <span className="absolute right-2 text-[10px] font-mono opacity-70">
              {boundary.highPct}-{boundary.toleratedPct}%
            </span>
          )}
        </div>

        {/* Green zone - dominant */}
        <div
          className="bg-green-500 flex items-center justify-center text-white relative"
          style={{ height: `${greenHeight}%` }}
        >
          <div className="text-center">
            <span className="text-lg font-bold block">Zone stable</span>
            <span className="text-xs opacity-80">Reste ici</span>
          </div>
          {showMarkers && (
            <span className="absolute right-2 bottom-2 text-[10px] font-mono opacity-70">
              {boundary.lowPct}-{boundary.highPct}%
            </span>
          )}
        </div>
      </motion.div>

      {/* Toggle markers */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex justify-center mt-4"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleMarkers}
          className="text-xs gap-1"
        >
          {showMarkers ? (
            <>
              <EyeOff className="h-3 w-3" />
              Masquer les repères
            </>
          ) : (
            <>
              <Eye className="h-3 w-3" />
              Afficher les repères
            </>
          )}
        </Button>
      </motion.div>

      {/* Key phrase */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="text-center text-sm text-muted-foreground italic mt-4 px-4"
      >
        "Rester ici au début = performance plus tard."
      </motion.p>
    </div>
  );
}
