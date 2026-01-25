/**
 * SidebarLayout – Layout principal avec sidebar collapsible
 */

import { ReactNode } from "react";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SidebarLayoutProps {
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  staffMode: boolean;
  onStaffModeChange: (value: boolean) => void;
}

export function SidebarLayout({
  children,
  activeTab,
  onTabChange,
  staffMode,
  onStaffModeChange,
}: SidebarLayoutProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          staffMode={staffMode}
          onStaffModeChange={onStaffModeChange}
        />
        <SidebarInset className="flex flex-col flex-1">
          {/* Header with trigger */}
          <header className="sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-border bg-background/95 backdrop-blur px-4">
            <SidebarTrigger className="-ml-1" />
            
            {/* Staff mode indicator badge */}
            {staffMode && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                <span className="w-1.5 h-1.5 bg-primary rounded-full mr-1.5 animate-pulse" />
                Affichage Expert — Indices de confiance visibles
              </Badge>
            )}
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto px-4 py-6">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
