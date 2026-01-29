/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * TFCL RACE-DAY MODE™ — Mobile Strategic Engagement
 * Two For Coaching Lab Method™
 * 
 * "Discipline beats courage."
 * 
 * 4 écrans swipables:
 * 1. FOCUS - Engagement mental
 * 2. PACER - Couloir simplifié
 * 3. RULES - Règles non négociables
 * 4. DERAIL - Si ça déraille
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { X, ChevronLeft, ChevronRight, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

import { FocusScreen } from "./screens/FocusScreen";
import { PacerScreen } from "./screens/PacerScreen";
import { RulesScreen } from "./screens/RulesScreen";
import { DerailScreen } from "./screens/DerailScreen";

import type { PacingEnvelopeResult, RaceObjective } from "@/lib/v2/pacingEnvelopeEngine";
import type { DisciplineRulesResult } from "@/lib/v2/pacingDisciplineRules";
import type { ScenarioSimulationResult } from "@/lib/v2/pacingScenarioSimulator";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface RaceDayModeProps {
  athleteName: string;
  envelope: PacingEnvelopeResult;
  rules: DisciplineRulesResult;
  scenarios: ScenarioSimulationResult;
  raceObjective: RaceObjective;
  raceReadinessScore: number | null;
  customCoachPhrase?: string;
  onClose?: () => void;
}

type ScreenId = "focus" | "pacer" | "rules" | "derail";

const SCREENS: ScreenId[] = ["focus", "pacer", "rules", "derail"];

const SCREEN_LABELS: Record<ScreenId, string> = {
  focus: "Focus",
  pacer: "Pacer",
  rules: "Règles",
  derail: "Plan B",
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function RaceDayMode({
  athleteName,
  envelope,
  rules,
  scenarios,
  raceObjective,
  raceReadinessScore,
  customCoachPhrase,
  onClose,
}: RaceDayModeProps) {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>("focus");
  const [isEngaged, setIsEngaged] = useState(false);
  const [showMarkers, setShowMarkers] = useState(false);

  const currentIndex = SCREENS.indexOf(currentScreen);

  // Navigation
  const goToScreen = useCallback((screen: ScreenId) => {
    setCurrentScreen(screen);
  }, []);

  const goNext = useCallback(() => {
    const nextIndex = Math.min(currentIndex + 1, SCREENS.length - 1);
    setCurrentScreen(SCREENS[nextIndex]);
  }, [currentIndex]);

  const goPrev = useCallback(() => {
    const prevIndex = Math.max(currentIndex - 1, 0);
    setCurrentScreen(SCREENS[prevIndex]);
  }, [currentIndex]);

  // Swipe handler
  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const threshold = 50;
      if (info.offset.x < -threshold && currentIndex < SCREENS.length - 1) {
        goNext();
      } else if (info.offset.x > threshold && currentIndex > 0) {
        goPrev();
      }
    },
    [currentIndex, goNext, goPrev]
  );

  // Print
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col overflow-hidden select-none">
      {/* Header minimal */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur print:hidden">
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10">
              <X className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-sm font-bold tracking-tight">TFCL Race-Day Mode™</h1>
            <p className="text-[10px] text-muted-foreground italic">Discipline beats courage.</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={handlePrint} className="h-10 w-10">
          <Printer className="h-4 w-4" />
        </Button>
      </header>

      {/* Screen indicators */}
      <div className="flex items-center justify-center gap-2 py-2 print:hidden">
        {SCREENS.map((screen, index) => (
          <button
            key={screen}
            onClick={() => goToScreen(screen)}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              currentScreen === screen
                ? "w-8 bg-primary"
                : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
            aria-label={SCREEN_LABELS[screen]}
          />
        ))}
      </div>

      {/* Main content with swipe */}
      <motion.div
        className="flex-1 relative overflow-hidden"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 flex flex-col"
          >
            {currentScreen === "focus" && (
              <FocusScreen
                athleteName={athleteName}
                envelope={envelope}
                raceReadinessScore={raceReadinessScore}
                customCoachPhrase={customCoachPhrase}
                isEngaged={isEngaged}
                onEngage={() => {
                  setIsEngaged(true);
                  goNext();
                }}
              />
            )}
            {currentScreen === "pacer" && (
              <PacerScreen
                envelope={envelope}
                showMarkers={showMarkers}
                onToggleMarkers={() => setShowMarkers(!showMarkers)}
              />
            )}
            {currentScreen === "rules" && (
              <RulesScreen rules={rules} raceObjective={raceObjective} />
            )}
            {currentScreen === "derail" && (
              <DerailScreen
                envelope={envelope}
                scenarios={scenarios}
                raceReadinessScore={raceReadinessScore}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Navigation arrows */}
      <div className="flex items-center justify-between px-4 py-3 print:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={goPrev}
          disabled={currentIndex === 0}
          className={cn("h-12 w-12", currentIndex === 0 && "opacity-30")}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>

        <span className="text-sm text-muted-foreground">
          {SCREEN_LABELS[currentScreen]}
        </span>

        <Button
          variant="ghost"
          size="icon"
          onClick={goNext}
          disabled={currentIndex === SCREENS.length - 1}
          className={cn("h-12 w-12", currentIndex === SCREENS.length - 1 && "opacity-30")}
        >
          <ChevronRight className="h-6 w-6" />
        </Button>
      </div>

      {/* Print version */}
      <div className="hidden print:block p-8 space-y-8">
        <div className="text-center border-b pb-4">
          <h1 className="text-2xl font-bold">TFCL Race-Day Mode™</h1>
          <p className="text-sm italic text-muted-foreground">Discipline beats courage.</p>
          <p className="text-sm mt-2">{athleteName} — {raceObjective}</p>
        </div>
        <FocusScreen
          athleteName={athleteName}
          envelope={envelope}
          raceReadinessScore={raceReadinessScore}
          isEngaged={true}
          onEngage={() => {}}
          printMode
        />
        <RulesScreen rules={rules} raceObjective={raceObjective} printMode />
        <DerailScreen
          envelope={envelope}
          scenarios={scenarios}
          raceReadinessScore={raceReadinessScore}
          printMode
        />
      </div>
    </div>
  );
}

export default RaceDayMode;
