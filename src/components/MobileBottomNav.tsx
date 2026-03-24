/**
 * MobileBottomNav — Bottom tab bar pour iPhone
 * Visible uniquement sur mobile (< 768px)
 * Respecte les safe areas iOS
 * Long-press sur le logo TFCLab dans le header pour toggle Staff Mode
 */

import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarDays,
  Play,
  GraduationCap,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useCallback, useState } from "react";

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
  staffMode?: boolean;
  onStaffModeChange?: (value: boolean) => void;
  onExportClick?: () => void;
}

export function MobileBottomNav({ activeTab, onTabChange, staffMode, onStaffModeChange, onExportClick }: MobileBottomNavProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);
  const [showToast, setShowToast] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

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

  // Long-press on Settings icon to toggle staff mode
  const handlePressStart = useCallback(() => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      onStaffModeChange?.(!staffMode);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 1500);
      if (navigator.vibrate) navigator.vibrate(50);
    }, 600);
  }, [staffMode, onStaffModeChange]);

  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Tap on Settings → show more menu (config + export)
  const handleSettingsTap = useCallback(() => {
    if (!isLongPress.current) {
      setShowMoreMenu((v) => !v);
    }
  }, []);

  return (
    <>
      {/* Staff mode toast notification */}
      {showToast && (
        <div className="md:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className={cn(
            "px-4 py-2 rounded-full text-xs font-semibold shadow-lg backdrop-blur-xl",
            staffMode
              ? "bg-primary/90 text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}>
            {staffMode ? "⚡ Mode Expert activé" : "Mode Expert désactivé"}
          </div>
        </div>
      )}

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-2xl border-t border-border/40 safe-area-inset-bottom">
        {/* Staff mode active indicator bar */}
        {staffMode && (
          <div className="absolute top-0 left-0 right-0 h-px bg-primary/40" />
        )}
        <div className="grid grid-cols-7 h-14">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab);
            return (
              <button
                key={tab.id}
                onClick={() => handleClick(tab)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 transition-colors no-select touch-target relative",
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

          {/* Staff/Settings button — long press to toggle expert mode */}
          <button
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            onTouchCancel={handlePressEnd}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 transition-colors no-select touch-target relative",
              staffMode
                ? "text-primary"
                : "text-muted-foreground active:text-foreground"
            )}
          >
            <Settings className={cn(
              "w-5 h-5 transition-transform duration-300",
              staffMode && "animate-spin-slow drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]"
            )} />
            <span className={cn(
              "text-[9px] leading-tight font-medium",
              staffMode && "font-semibold text-primary"
            )}>
              {staffMode ? "Expert" : "Staff"}
            </span>
            {staffMode && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
