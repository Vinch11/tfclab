/**
 * AppSidebar – Navigation TFCL restructurée
 * 6 sections principales : Dashboard, Athlètes, Diagnostic, Planification, Simulation, Academy
 */

import { useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Users,
  Stethoscope,
  ClipboardList,
  Timer,
  BookOpen,
  SlidersHorizontal,
  ChevronDown,
  LogOut,
  Shield,
  FileDown,
  ScrollText,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "@/assets/logo-2fc.png";
import { useAuth } from "@/contexts/AuthContext";
import { useIsRunningOnly } from "@/hooks/useRunningFocusMode";
import { Footprints, FlaskConical } from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: typeof BarChart3;
  route: string;
}

const navigationItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: BarChart3, route: "/" },
  { id: "athletes", label: "Athlètes", icon: Users, route: "/athletes" },
  { id: "essentiels", label: "Essentiels", icon: Sparkles, route: "/essentiels" },
  { id: "diagnostic", label: "Diagnostic", icon: Stethoscope, route: "/diagnostic" },
  { id: "planning", label: "Planification", icon: ClipboardList, route: "/planning" },
  { id: "simulation", label: "Simulation", icon: Timer, route: "/race" },
  { id: "academy", label: "Academy", icon: BookOpen, route: "/academy" },
];

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  staffMode: boolean;
  onStaffModeChange: (value: boolean) => void;
  onExportClick?: () => void;
  exportAlwaysVisible?: boolean;
}

export function AppSidebar({ activeTab, onTabChange, staffMode, onStaffModeChange, onExportClick, exportAlwaysVisible }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, isMobile } = useSidebar();
  const { user, signOut } = useAuth();
  const isRunningOnly = useIsRunningOnly();
  const collapsed = isMobile ? false : state === "collapsed";

  const handleNavClick = (item: NavItem) => {
    if (item.route === "/" && location.pathname === "/") {
      onTabChange("dashboard");
      return;
    }
    navigate(item.route);
  };

  const isActive = (item: NavItem) => {
    if (item.route === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(item.route);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60 bg-sidebar">
      {/* Header */}
      <SidebarHeader className="p-3 sm:p-4 border-b border-sidebar-border/40 safe-area-inset-top">
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="2FC Lab" className={cn("h-9 sm:h-10 w-auto transition-all", collapsed && "h-7 sm:h-8")} />
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-sidebar-foreground truncate leading-tight">Two 4 Coaching Lab</h1>
              <p className="text-[10px] text-sidebar-foreground/50 leading-tight">Performance Analysis</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 sm:px-3 py-2 ios-scroll">
        {/* Staff Mode Toggle */}
        {!collapsed && (
          <div className="px-2 py-2.5 mb-3 rounded-xl bg-sidebar-accent/40 border border-sidebar-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1 rounded-md transition-colors",
                  staffMode ? "bg-sidebar-primary/15" : "bg-sidebar-accent"
                )}>
                  <Shield className={cn("h-3.5 w-3.5", staffMode ? "text-sidebar-primary" : "text-sidebar-foreground/60")} />
                </div>
                <span className="text-xs font-medium text-sidebar-foreground">Mode Staff</span>
              </div>
              <Switch
                checked={staffMode}
                onCheckedChange={onStaffModeChange}
                className="data-[state=checked]:bg-sidebar-primary scale-90 sm:scale-100"
              />
            </div>
          </div>
        )}

        {/* Main Navigation - Flat 6 items */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                return (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={() => handleNavClick(item)}
                      isActive={active}
                      tooltip={collapsed ? item.label : undefined}
                      className={cn(
                        "relative h-10 sm:h-11 rounded-lg transition-all duration-200",
                        active
                          ? "bg-sidebar-accent text-sidebar-primary font-semibold shadow-sm border border-sidebar-border"
                          : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80 hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className={cn(
                        "h-[18px] w-[18px] shrink-0 transition-colors",
                        active ? "text-sidebar-primary" : "text-sidebar-foreground/60"
                      )} />
                      {!collapsed && (
                        <span className="text-sm truncate">{item.label}</span>
                      )}
                      {active && !collapsed && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary" />
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Running Profile link — visible only for running athletes */}
        {isRunningOnly && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate("/running-profile")}
                    isActive={location.pathname === "/running-profile"}
                    tooltip={collapsed ? "Profil Running" : undefined}
                    className={cn(
                      "relative h-10 sm:h-11 rounded-lg transition-all duration-200",
                      location.pathname === "/running-profile"
                        ? "bg-sidebar-accent text-sidebar-primary font-semibold shadow-sm border border-sidebar-border"
                        : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80 hover:text-sidebar-foreground"
                    )}
                  >
                    <Footprints className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      location.pathname === "/running-profile" ? "text-sidebar-primary" : "text-sidebar-foreground/60"
                    )} />
                    {!collapsed && <span className="text-sm truncate">Profil Running</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate("/diagnostic/cohort-run-mlss")}
                    isActive={location.pathname === "/diagnostic/cohort-run-mlss"}
                    tooltip={collapsed ? "Cohorte Run MLSS" : undefined}
                    className={cn(
                      "relative h-10 sm:h-11 rounded-lg transition-all duration-200",
                      location.pathname === "/diagnostic/cohort-run-mlss"
                        ? "bg-sidebar-accent text-sidebar-primary font-semibold shadow-sm border border-sidebar-border"
                        : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80 hover:text-sidebar-foreground"
                    )}
                  >
                    <FlaskConical className={cn(
                      "h-[18px] w-[18px] shrink-0 transition-colors",
                      location.pathname === "/diagnostic/cohort-run-mlss" ? "text-sidebar-primary" : "text-sidebar-foreground/60"
                    )} />
                    {!collapsed && <span className="text-sm truncate">Cohorte Run MLSS</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarSeparator className="my-3 opacity-30" />

        {/* Utilities */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {/* Export PDF */}
              {(onExportClick || exportAlwaysVisible) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => {
                      if (onExportClick) onExportClick();
                      else navigate("/", { state: { openExport: true } });
                    }}
                    tooltip={collapsed ? "Export PDF" : undefined}
                    className="h-9 sm:h-10 rounded-lg hover:bg-sidebar-accent/60 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  >
                    <FileText className="h-[18px] w-[18px] text-sidebar-foreground/60" />
                    {!collapsed && <span className="text-sm">Export PDF</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {/* Mini rapport */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate("/mini-rapport")}
                  isActive={location.pathname === "/mini-rapport"}
                  tooltip={collapsed ? "Mini rapport" : undefined}
                  className={cn(
                    "h-9 sm:h-10 rounded-lg transition-all duration-200",
                    location.pathname === "/mini-rapport"
                      ? "bg-sidebar-accent text-sidebar-primary font-semibold border border-sidebar-border"
                      : "hover:bg-sidebar-accent/60 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  )}
                >
                  <FileText className="h-[18px] w-[18px] text-sidebar-foreground/60" />
                  {!collapsed && <span className="text-sm">Mini rapport</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Configuration */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => {
                    if (location.pathname !== "/") navigate("/");
                    onTabChange("configuration");
                  }}
                  isActive={location.pathname === "/" && activeTab === "configuration"}
                  tooltip={collapsed ? "Configuration" : undefined}
                  className={cn(
                    "h-9 sm:h-10 rounded-lg transition-all duration-200",
                    location.pathname === "/" && activeTab === "configuration"
                      ? "bg-sidebar-accent text-sidebar-primary font-semibold border border-sidebar-border"
                      : "hover:bg-sidebar-accent/60 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  )}
                >
                  <Settings className="h-[18px] w-[18px] text-sidebar-foreground/60" />
                  {!collapsed && <span className="text-sm">Configuration</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="p-3 sm:p-4 border-t border-sidebar-border/40 safe-area-inset-bottom">
        {!collapsed && user && (
          <p className="text-[10px] text-sidebar-foreground/50 truncate mb-2 px-0.5">
            {user.email}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <ThemeToggle />
          {!collapsed && (
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-xs text-sidebar-foreground/60 hover:text-destructive transition-colors rounded-lg px-2 py-1.5 hover:bg-destructive/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Déconnexion</span>
            </button>
          )}
          {collapsed && (
            <SidebarMenuButton onClick={signOut} tooltip="Déconnexion">
              <LogOut className="h-3.5 w-3.5" />
            </SidebarMenuButton>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
