// =============================================
// ÉCRANS D'ONBOARDING ADAPTATIFS
// =============================================

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Sparkles, Target, Shield } from "lucide-react";
import type { UserRole } from "@/types/profile";
import { getOnboardingContent } from "@/data/onboardingContent";
import logo from "@/assets/logo-2fc.png";

interface OnboardingScreensProps {
  role: UserRole;
  onComplete: () => void;
  loading?: boolean;
}

const screenIcons = [Sparkles, Target, Shield];

export function OnboardingScreens({ role, onComplete, loading }: OnboardingScreensProps) {
  const [currentScreen, setCurrentScreen] = useState(0);
  const content = getOnboardingContent(role);
  const screen = content.screens[currentScreen];
  const Icon = screenIcons[currentScreen];
  const isLastScreen = currentScreen === content.screens.length - 1;

  const handleNext = () => {
    if (isLastScreen) {
      onComplete();
    } else {
      setCurrentScreen((prev) => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with logo */}
      <div className="p-6 flex justify-center">
        <img src={logo} alt="Two For Coaching Lab" className="h-20 w-auto opacity-80" />
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 mb-8">
        {content.screens.map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all ${
              index === currentScreen
                ? "w-8 bg-primary"
                : index < currentScreen
                ? "w-2 bg-primary/50"
                : "w-2 bg-muted"
            }`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-32">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-8">
          <Icon className="w-10 h-10 text-primary" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-foreground text-center mb-4">
          {screen.title}
        </h1>

        {/* Text */}
        <p className="text-muted-foreground text-center max-w-sm leading-relaxed">
          {screen.text}
        </p>
      </div>

      {/* Footer with button */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent">
        <Button
          onClick={handleNext}
          disabled={loading}
          className="w-full h-14 text-lg font-semibold"
          size="lg"
        >
          {loading ? (
            "Chargement..."
          ) : isLastScreen ? (
            "Entrer dans Two For Coaching Lab"
          ) : (
            <>
              Suivant
              <ChevronRight className="w-5 h-5 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
