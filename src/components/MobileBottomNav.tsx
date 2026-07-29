/**
 * MobileBottomNav — Bottom tab bar pour iPhone
 * Visible uniquement sur mobile (< 768px)
 * Respecte les safe areas iOS
 * Long-press sur le logo TFCLab dans le header pour toggle Staff Mode
 */

import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Users,
  Stethoscope,
  ClipboardList,
  Timer,
  BookOpen,
  Sparkles,
  FileDown,
  ScrollText,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";
import { Footprints } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRef, useCallback, useState } from "react";
import { useIsRunningOnly } from "@/hooks/useRunningFocusMode";
import { useCoachLevel, SIMPLE_NAV_IDS } from "@/hooks/useCoachLevel";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, route: "/" },
  { id: "athletes", label: "Athlètes", icon: Users, route: "/athletes" },
  { id: "essentiels", label: "Essent.", icon: Sparkles, route: "/essentiels" },
  { id: "evolution", label: "Évolution", icon: TrendingUp, route: "/evolution" },
  { id: "diagnostic", label: "Diag.", icon: Stethoscope, route: "/diagnostic" },
  { id: "planning", label: "Plan", icon: ClipboardList, route: "/planning" },
  { id: "simulation", label: "Simul.", icon: Timer, route: "/race" },
  { id: "academy", label: "Academy", icon: BookOpen, route: "/academy" },
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
  const isRunningOnly = useIsRunningOnly();
  const { isSimpleMode } = useCoachLevel();
  const visibleTabs = isSimpleMode
    ? tabs.filter((t) => (SIMPLE_NAV_IDS as readonly string[]).includes(t.id))
    : tabs;
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
        <div className="grid h-14" style={{ gridTemplateColumns: `repeat(${visibleTabs.length + 1}, minmax(0, 1fr))` }}>
          {visibleTabs.map((tab) => {
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

          {/* Staff/Settings button — tap for menu, long press for expert mode */}
          <button
            onTouchStart={handlePressStart}
            onTouchEnd={(e) => { handlePressEnd(); handleSettingsTap(); }}
            onTouchCancel={handlePressEnd}
            onMouseDown={handlePressStart}
            onMouseUp={(e) => { handlePressEnd(); handleSettingsTap(); }}
            onMouseLeave={handlePressEnd}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 transition-colors no-select touch-target relative",
              (staffMode || showMoreMenu)
                ? "text-primary"
                : "text-muted-foreground active:text-foreground"
            )}
          >
            <div className="relative">
              <SlidersHorizontal className={cn(
                "w-5 h-5 transition-transform duration-300",
                staffMode && "animate-spin-slow drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]"
              )} />
              {staffMode && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary ring-2 ring-background" />
              )}
            </div>
            <span className={cn(
              "text-[9px] leading-tight font-medium",
              (staffMode || showMoreMenu) && "font-semibold text-primary"
            )}>
              Plus
            </span>
            {(staffMode || showMoreMenu) && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary" />
            )}
          </button>
        </div>
      </nav>

      {/* More menu popup */}
      {showMoreMenu && (
        <>
          {/* Backdrop */}
          <div 
            className="md:hidden fixed inset-0 z-[55] bg-black/20 backdrop-blur-sm"
            onClick={() => setShowMoreMenu(false)}
          />
          {/* Menu */}
          <div className="md:hidden fixed bottom-16 right-2 z-[60] animate-in fade-in slide-in-from-bottom-2 duration-200 safe-area-inset-bottom">
            <div className="bg-card border border-border/60 rounded-xl shadow-xl overflow-hidden min-w-[180px]">
              {isRunningOnly && !isSimpleMode && (
                <>
                  <button
                    onClick={() => { navigate("/running-profile"); setShowMoreMenu(false); }}
                    className={cn(
                      "flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors",
                      location.pathname === "/running-profile" ? "text-primary bg-primary/5" : "text-foreground hover:bg-muted/50"
                    )}
                  >
                    <Footprints className="w-4 h-4 text-primary" />
                    Profil Running
                  </button>
                  <div className="h-px bg-border/40" />
                </>
              )}
              <button
                onClick={() => { navigate("/"); onTabChange("configuration"); setShowMoreMenu(false); }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4 text-primary" />
                Configuration
              </button>
              <div className="h-px bg-border/40" />
              <button
                onClick={() => { if (onExportClick) onExportClick(); setShowMoreMenu(false); }}
                className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
              >
                <FileDown className="w-4 h-4 text-primary" />
                Exporter un rapport
              </button>
              <div className="h-px bg-border/40" />
              <button
                onClick={() => { navigate("/mini-rapport"); setShowMoreMenu(false); }}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors",
                  location.pathname === "/mini-rapport" ? "text-primary bg-primary/5" : "text-foreground hover:bg-muted/50"
                )}
              >
                <ScrollText className="w-4 h-4 text-primary" />
                Mini rapport
              </button>
              <div className="h-px bg-border/40" />
              <button
                onTouchStart={(e) => { e.stopPropagation(); handlePressStart(); }}
                onTouchEnd={(e) => { e.stopPropagation(); handlePressEnd(); }}
                onClick={() => { onStaffModeChange?.(!staffMode); setShowMoreMenu(false); }}
                className={cn(
                  "flex items-center gap-3 w-full px-4 py-3 text-sm font-medium transition-colors",
                  staffMode ? "text-primary" : "text-foreground hover:bg-muted/50"
                )}
              >
                <SlidersHorizontal className={cn("w-4 h-4", staffMode ? "text-primary" : "text-muted-foreground")} />
                {staffMode ? "✓ Mode Expert" : "Mode Expert"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
