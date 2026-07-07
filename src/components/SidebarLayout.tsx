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

  return (
    <SidebarProvider defaultOpen={!isMobile}>
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
          <header className="sticky top-0 z-40 flex h-11 sm:h-12 items-center gap-2 sm:gap-3 border-b border-border/50 bg-background/90 backdrop-blur-lg px-3 sm:px-4 safe-area-inset-top">
            {/* Hide sidebar trigger on mobile — bottom nav replaces it */}
            <SidebarTrigger className="-ml-1 touch-target hidden md:flex" />

            {/* Mobile: show logo + app title */}
            <div className="md:hidden flex items-center gap-1.5">
              <img src={logo} alt="TFCLab" className="h-5 w-5 rounded-sm" />
              <span className="text-sm font-semibold text-foreground/90 tracking-tight">TFCLab</span>
            </div>

            {/* Staff mode indicator badge - refined */}
            {staffMode && (
              <Badge
                variant="secondary"
                className="bg-primary/8 text-primary border-primary/15 text-[10px] sm:text-xs py-0.5 px-1.5 sm:py-0.5 sm:px-2 md:ml-0"
              >
                <span className="w-1.5 h-1.5 bg-primary rounded-full mr-1 sm:mr-1.5 animate-pulse" />
                Expert
              </Badge>
            )}
            <div className="ml-auto flex items-center gap-2">
              <VersionBadge />
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
