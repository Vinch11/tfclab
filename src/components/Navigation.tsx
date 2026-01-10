import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  route?: string; // Optional external route
}

// Manual Only Mode: Nolio tab removed
const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", shortLabel: "Dash", icon: Calculator },
  { id: "profil", label: "Profil", icon: Calculator },
  { id: "tests", label: "Tests", icon: FlaskConical },
  { id: "templates", label: "Templates", shortLabel: "Templ", icon: BookOpen, route: "/templates" },
  { id: "academy", label: "Academy", icon: GraduationCap, route: "/academy" },
  { id: "race-readiness", label: "Race Readiness", shortLabel: "Race", icon: Trophy },
];

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavClick = (item: NavItem) => {
    if (item.route) {
      navigate(item.route);
    } else {
      onTabChange(item.id);
    }
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border safe-area-inset-top">
      <div className="container mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 lg:h-18">
          {/* Logo - responsive */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0">
            <img src={logo} alt="24C Lab" className="h-16 sm:h-20 md:h-24 lg:h-28 w-auto shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-foreground tracking-tight truncate">
                Two 4 Coaching Lab
              </h1>
              <p className="text-[10px] sm:text-xs lg:text-sm text-muted-foreground hidden sm:block">
                Performance Analysis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            {/* Desktop Navigation (lg+) */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.route ? false : activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    className={cn(
                      "flex items-center gap-2 px-3 xl:px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 touch-target",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                  >
                    <Icon className="w-4 h-4 xl:w-5 xl:h-5 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Tablet Navigation (md-lg) - icons with short labels */}
            <nav className="hidden md:flex lg:hidden items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.route ? false : activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all duration-200 touch-target",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                    title={item.label}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="hidden sm:inline">{item.shortLabel || item.label}</span>
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
          <nav className="md:hidden py-3 border-t border-border animate-fade-in safe-area-inset-bottom">
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.route ? false : activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      handleNavClick(item);
                      setMobileMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 touch-target",
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
