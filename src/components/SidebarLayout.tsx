/**
 * SidebarLayout – Layout principal avec sidebar collapsible
 * Optimisé pour iPhone et iPad
 */

import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { VersionBadge } from "@/components/VersionBadge";
import logo from "@/assets/logo-2fc.png";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { QuickObjectiveSelector } from "@/components/QuickObjectiveSelector";
import { useAthletes } from "@/contexts/AthleteContext";
import { useAthleteRaceGoals } from "@/hooks/useAthleteRaceGoals";

interface SidebarLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  staffMode: boolean;
  onStaffModeChange: (value: boolean) => void;
  onExportClick?: () => void;
}

export function SidebarLayout({
  children,
  activeTab,
  onTabChange,
  staffMode,
  onStaffModeChange,
  onExportClick,
}: SidebarLayoutProps) {
  const isMobile = useIsMobile();
  const { currentAthlete } = useAthletes();
  const { updateAthleteGoal } = useAthleteRaceGoals(currentAthlete?.id || null);

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="h-svh flex w-full">
        <AppSidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          staffMode={staffMode}
          onStaffModeChange={onStaffModeChange}
          onExportClick={onExportClick}
          exportAlwaysVisible
        />
        <SidebarInset className="flex flex-col flex-1">
          {/* Header with trigger - mobile optimized */}
          <header className="sticky top-0 z-40 flex h-11 sm:h-12 items-center gap-2 border-b border-border/50 bg-background/90 backdrop-blur-lg px-2 sm:px-4 safe-area-inset-top">
            {/* Hide sidebar trigger on mobile — bottom nav replaces it */}
            <SidebarTrigger className="-ml-1 touch-target hidden md:flex" />

            {/* Mobile: logo only (title removed to free space for objective selector) */}
            <div className="md:hidden flex items-center shrink-0">
              <img src={logo} alt="TFCLab" className="h-6 w-6 rounded-sm" />
            </div>

            {/* Sélecteur objectif 🎯 — toujours visible quand un athlète est sélectionné */}
            {currentAthlete && (
              <div className="shrink-0 min-w-0">
                <QuickObjectiveSelector
                  currentGoal={currentAthlete.goal}
                  onGoalChange={async (goal, options) => {
                    await updateAthleteGoal(goal, {
                      raceName: options?.raceName,
                      raceDate: options?.raceDate,
                      raceFormat: options?.raceFormat ?? null,
                    });
                  }}
                />
              </div>
            )}

            {/* Staff mode indicator badge - hidden on mobile (saves header space) */}
            {staffMode && (
              <Badge
                variant="secondary"
                className="hidden sm:inline-flex bg-primary/8 text-primary border-primary/15 text-xs py-0.5 px-2"
              >
                <span className="w-1.5 h-1.5 bg-primary rounded-full mr-1.5 animate-pulse" />
                Expert
              </Badge>
            )}
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="hidden sm:block">
                <VersionBadge />
              </div>
              <ThemeToggle />
            </div>
          </header>

          {/* Main content - mobile optimized padding with bottom nav space */}
          <main className="flex-1 overflow-x-hidden overflow-y-auto ios-scroll w-full max-w-full">
            <div className="container mx-auto py-3 sm:py-6 pb-20 md:pb-6 w-full max-w-full">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav activeTab={activeTab} onTabChange={onTabChange} staffMode={staffMode} onStaffModeChange={onStaffModeChange} onExportClick={onExportClick} />
    </SidebarProvider>
  );
}
