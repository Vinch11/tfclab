/**
 * SidebarLayout – Layout principal avec sidebar collapsible
 * Optimisé pour iPhone et iPad
 */

import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
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
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-svh flex w-full">
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
          <header className="sticky top-0 z-40 flex h-11 sm:h-14 items-center gap-2 sm:gap-3 border-b border-border bg-background/95 backdrop-blur px-3 sm:px-4 safe-area-inset-top">
            {/* Hide sidebar trigger on mobile — bottom nav replaces it */}
            <SidebarTrigger className="-ml-1 touch-target hidden md:flex" />
            
            {/* Mobile: show app title */}
            <span className="md:hidden text-sm font-bold text-foreground truncate">TFCLab</span>
            
            {/* Staff mode indicator badge - compact on mobile */}
            {staffMode && (
              <Badge 
                variant="secondary" 
                className="bg-primary/10 text-primary border-primary/20 text-[10px] sm:text-xs py-0.5 px-1.5 sm:py-1 sm:px-2 ml-auto md:ml-0"
              >
                <span className="w-1.5 h-1.5 bg-primary rounded-full mr-1 sm:mr-1.5 animate-pulse" />
                <span className="hidden xs:inline">Affichage Expert</span>
                <span className="xs:hidden">Expert</span>
              </Badge>
            )}
          </header>

          {/* Main content - mobile optimized padding with bottom nav space */}
          <main className="flex-1 overflow-auto ios-scroll">
            <div className="container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-6 pb-20 md:pb-6">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav activeTab={activeTab} onTabChange={onTabChange} staffMode={staffMode} onStaffModeChange={onStaffModeChange} />
    </SidebarProvider>
  );
}
