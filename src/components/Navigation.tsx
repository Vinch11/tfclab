import { useState } from "react";
import { Calculator, FlaskConical, Trophy, GraduationCap, BookOpen, Menu, X, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PWAInstallButton } from "@/components/PWAInstallButton";
import logo from "@/assets/logo-2fc.png";

interface NavItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Manual Only Mode: Nolio tab removed
const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", shortLabel: "Dash", icon: Calculator },
  { id: "profil", label: "Profil", icon: Calculator },
  { id: "tests", label: "Tests", icon: FlaskConical },
  { id: "saison-phases", label: "Saison & Phases", shortLabel: "Saison", icon: CalendarRange },
  { id: "race-readiness", label: "Race Readiness", shortLabel: "Race", icon: Trophy },
  { id: "comprendre", label: "Comprendre", icon: BookOpen },
  { id: "methodology", label: "Méthodologie", shortLabel: "Métho", icon: GraduationCap },
];

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo - responsive */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <img src={logo} alt="24C Lab" className="h-10 sm:h-12 md:h-14 w-auto shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base md:text-lg font-bold text-foreground tracking-tight truncate">
                Two 4 Coaching Lab
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                Performance Analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Desktop Navigation (lg+) */}
            <nav className="hidden lg:flex items-center gap-0.5 xl:gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      "flex items-center gap-1.5 xl:gap-2 px-2.5 xl:px-3 py-2 rounded-lg text-xs xl:text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="hidden xl:inline">{item.label}</span>
                    <span className="xl:hidden">{item.shortLabel || item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Tablet Navigation (md-lg) - icons only with tooltip */}
            <nav className="hidden md:flex lg:hidden items-center gap-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={cn(
                      "flex items-center justify-center p-2 rounded-lg transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                );
              })}
            </nav>

            {/* PWA Install + Theme toggle (all sizes) */}
            <PWAInstallButton />
            <ThemeToggle />

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden py-3 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-0.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
