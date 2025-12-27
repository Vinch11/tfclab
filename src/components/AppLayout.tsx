// =============================================
// LAYOUT PRINCIPAL DE L'APPLICATION
// =============================================

import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  LayoutDashboard, 
  Calendar, 
  CalendarDays, 
  TrendingUp,
  ChevronLeft,
  Home
} from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  showBack?: boolean;
}

export function AppLayout({ children, title, showBack = false }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentAthlete } = useAthletes();

  const navItems = [
    { path: "/", label: "Athlètes", icon: Users },
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/semaine", label: "Semaine", icon: Calendar },
    { path: "/bloc", label: "Bloc 3 sem.", icon: CalendarDays },
    { path: "/evolution", label: "Évolution", icon: TrendingUp },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {showBack && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate(-1)}
                  className="shrink-0"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              <div>
                <h1 className="text-xl font-bold text-foreground">{title}</h1>
                {currentAthlete && location.pathname !== "/" && (
                  <p className="text-sm text-muted-foreground">
                    {currentAthlete.nom} • {currentAthlete.objectif === "IM" ? "Ironman" : "70.3"}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
                LorangLab
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6 relative">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl safe-area-inset-bottom">
        <div className="container mx-auto px-2">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              const needsAthlete = item.path !== "/" && !currentAthlete;
              
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  size="sm"
                  disabled={needsAthlete}
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center gap-1 h-auto py-2 px-3 ${
                    active 
                      ? "text-primary bg-primary/10" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Footer spacer for bottom nav */}
      <div className="h-20" />
    </div>
  );
}
