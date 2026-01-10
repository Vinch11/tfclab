import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, LayoutDashboard, Calendar, CalendarDays, TrendingUp, ChevronLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo2fc from "@/assets/logo-2fc.png";

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showBack?: boolean;
}

export function AppLayout({ children, title, subtitle, showBack = false }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Accueil", icon: LayoutDashboard },
    // Tu peux réactiver ces routes plus tard si tu refais un vrai router multi-pages
    // { path: "/semaine", label: "Semaine", icon: Calendar },
    // { path: "/bloc", label: "Bloc 3 sem.", icon: CalendarDays },
    // { path: "/evolution", label: "Évolution", icon: TrendingUp },
  ];

  const isActive = (path: string) => location.pathname === path;

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
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 pb-20 sm:pb-24 relative">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-xl safe-area-inset-bottom">
        <div className="container mx-auto px-1 sm:px-2">
          <div className="flex items-center justify-around py-1.5 sm:py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className={`flex flex-col items-center gap-0.5 sm:gap-1 h-auto py-1.5 sm:py-2 px-2 sm:px-3 touch-target ${
                    active ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="text-[9px] sm:text-[10px] md:text-xs font-medium truncate max-w-[60px] sm:max-w-[80px]">{item.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
