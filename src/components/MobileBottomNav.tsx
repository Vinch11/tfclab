/**
 * MobileBottomNav — Bottom tab bar pour iPhone
 * Visible uniquement sur mobile (< 768px)
 * Respecte les safe areas iOS
 */

import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarDays,
  Play,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, route: "/" },
  { id: "athletes", label: "Athlètes", icon: Users, route: "/athletes" },
  { id: "diagnostic", label: "Diag.", icon: Stethoscope, route: "/diagnostic" },
  { id: "planning", label: "Plan", icon: CalendarDays, route: "/planning" },
  { id: "simulation", label: "Simul.", icon: Play, route: "/race" },
  { id: "academy", label: "Academy", icon: GraduationCap, route: "/academy" },
];

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (tab: typeof tabs[number]) => {
    if (tab.route === "/") return location.pathname === "/";
    return location.pathname.startsWith(tab.route);
  };

  const handleClick = (tab: typeof tabs[number]) => {
    if (tab.route === "/" && location.pathname === "/") {
      onTabChange("dashboard");
      return;
    }
    navigate(tab.route);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border safe-area-inset-bottom">
      <div className="grid grid-cols-6 h-14">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab);
          return (
            <button
              key={tab.id}
              onClick={() => handleClick(tab)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 transition-colors no-select touch-target",
                active
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", active && "drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]")} />
              <span className={cn(
                "text-[9px] leading-tight font-medium",
                active && "font-semibold"
              )}>
                {tab.label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
