import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NextRaceIndicator } from "@/components/NextRaceIndicator";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useAthletes } from "@/contexts/AthleteContext";
import { useAthleteRaceGoals } from "@/hooks/useAthleteRaceGoals";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showBack?: boolean;
}

export function AppLayout({ children, title, subtitle, showBack = false }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentAthlete } = useAthletes();
  const { raceGoals } = useAthleteRaceGoals(currentAthlete?.id || null);

  // Determine active tab from current route
  const activeTab = (() => {
    const path = location.pathname;
    if (path.startsWith("/athletes") || path.startsWith("/athlete")) return "athletes";
    if (path.startsWith("/essentiels")) return "essentiels";
    if (path.startsWith("/diagnostic")) return "diagnostic";
    if (path.startsWith("/planning")) return "planning";
    if (path.startsWith("/race")) return "simulation";
    if (path.startsWith("/academy")) return "academy";
    return "dashboard";
  })();

  const scrollToObjectives = () => {
    const objectivesSection = document.getElementById("objectives-section");
    if (objectivesSection) {
      objectivesSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl safe-area-inset-top">
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              {showBack && (
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 touch-target-sm">
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              )}
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg md:text-xl font-bold text-foreground truncate">{title}</h1>
                {subtitle && <p className="text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {raceGoals.length > 0 && (
                <NextRaceIndicator
                  raceGoals={raceGoals}
                  currentGoal={currentAthlete?.objectif || null}
                  compact
                  onClick={scrollToObjectives}
                />
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 pb-20 sm:pb-24 relative">{children}</main>

      {/* Mobile: full MobileBottomNav with all tabs */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={() => {}}
      />

      {/* Desktop: no bottom nav needed (sidebar handles it) */}
    </div>
  );
}
