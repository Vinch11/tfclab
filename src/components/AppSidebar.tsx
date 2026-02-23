/**
 * AppSidebar – Navigation latérale ergonomique
 * Icônes colorées par groupe, espacement optimisé, active state clair
 */

import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  Users,
  FlaskConical,
  BookOpen,
  GraduationCap,
  Trophy,
  Settings,
  Activity,
  ChevronDown,
  LogOut,
  Shield,
  Play,
  Smartphone,
  Footprints,
  FileText,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "@/assets/logo-2fc.png";
import { useAuth } from "@/contexts/AuthContext";
import { useRunningFocusMode } from "@/hooks/useRunningFocusMode";
import { useState } from "react";

// Type explicite pour les items de navigation
interface NavItem {
  id: string;
  label: string;
  icon: typeof LayoutDashboard;
  route?: string;
  tab?: string;
  runningOnly?: boolean;
}

interface NavGroup {
  id: string;
  label: string;
  defaultOpen: boolean;
  iconColor: string; // couleur sémantique par groupe
  items: NavItem[];
}

// Définition des groupes avec couleurs par groupe
const baseNavigationGroups: NavGroup[] = [
  {
    id: "principal",
    label: "Principal",
    defaultOpen: true,
    iconColor: "text-sidebar-primary",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, route: "/", tab: "dashboard" },
      { id: "profil", label: "Profil", icon: User, tab: "profil" },
      { id: "strategie", label: "Stratégie", icon: Trophy, tab: "strategie" },
    ],
  },
  {
    id: "outils",
    label: "Outils",
    defaultOpen: true,
    iconColor: "text-sidebar-foreground/70",
    items: [
      { id: "athletes", label: "Mes Athlètes", icon: Users, route: "/athletes" },
      { id: "tests", label: "Tests & Protocoles", icon: FlaskConical, route: "/tests" },
      { id: "race-simulation", label: "Simulation", icon: Play, route: "/race-simulation" },
      { id: "running-profile", label: "Profil Running", icon: Footprints, route: "/running-profile", runningOnly: true },
    ],
  },
  {
    id: "terrain",
    label: "Sur le terrain",
    defaultOpen: false,
    iconColor: "text-sidebar-foreground/70",
    items: [
      { id: "race-day", label: "Race-Day", icon: Smartphone, route: "/race-day" },
      { id: "fatigue", label: "Suivi Fatigue", icon: Activity, route: "/fatigue" },
    ],
  },
  {
    id: "ressources",
    label: "Ressources",
    defaultOpen: false,
    iconColor: "text-sidebar-foreground/70",
    items: [
      { id: "ai-plan", label: "Plan IA", icon: Sparkles, route: "/ai-plan" },
      { id: "templates", label: "Templates", icon: BookOpen, route: "/templates" },
      { id: "academy", label: "Academy", icon: GraduationCap, route: "/academy" },
    ],
  },
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
  const { state, isMobile, openMobile } = useSidebar();
  const { user, signOut } = useAuth();
  const { isRunningOnly } = useRunningFocusMode();
  // On mobile, the sidebar opens as a Sheet — always show labels when open
  const collapsed = isMobile ? false : state === "collapsed";

  // Filter navigation items based on Running Focus Mode
  const navigationGroups = baseNavigationGroups.map(group => ({
    ...group,
    items: group.items.filter(item => !('runningOnly' in item) || !item.runningOnly || isRunningOnly)
  }));

  // Track which groups are open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    baseNavigationGroups.reduce((acc, g) => ({ ...acc, [g.id]: g.defaultOpen }), {})
  );

  const handleNavClick = (item: NavItem) => {
    if (item.route && item.route !== "/") {
      navigate(item.route);
      return;
    }
    if (item.tab) {
      if (location.pathname === "/") {
        onTabChange(item.tab);
      } else {
        navigate("/", { state: { activeTab: item.tab } });
      }
      return;
    }
    if (item.route === "/") {
      navigate("/");
    }
  };

  const isActive = (item: NavItem) => {
    if (item.route) {
      return location.pathname === item.route;
    }
    return location.pathname === "/" && activeTab === item.tab;
  };

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const renderNavItems = (items: NavItem[], iconColor: string) => (
    <SidebarMenu className="gap-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(item);
        return (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton
              onClick={() => handleNavClick(item)}
              isActive={active}
              tooltip={collapsed ? item.label : undefined}
              className={cn(
                "relative h-9 sm:h-10 rounded-lg transition-all duration-200",
                active
                  ? "bg-sidebar-accent text-sidebar-primary font-semibold shadow-sm border border-sidebar-border"
                  : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80 hover:text-sidebar-foreground"
              )}
            >
              <Icon className={cn(
                "h-[18px] w-[18px] shrink-0 transition-colors",
                active ? "text-sidebar-primary" : iconColor
              )} />
              {!collapsed && (
                <span className="text-sm truncate">{item.label}</span>
              )}
              {/* Active indicator bar */}
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary" />
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60 bg-sidebar">
      {/* Header avec logo */}
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
        {/* Mode Staff Toggle */}
        {!collapsed && (
          <div className="px-2 py-2.5 mb-2 rounded-xl bg-sidebar-accent/40 border border-sidebar-border/30">
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

        {/* Navigation Groups */}
        {navigationGroups.map((group, groupIndex) => (
          <Collapsible
            key={group.id}
            open={collapsed ? false : openGroups[group.id]}
            onOpenChange={() => !collapsed && toggleGroup(group.id)}
          >
            <SidebarGroup className={cn(groupIndex > 0 && "mt-1")}>
              {!collapsed && (
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer hover:bg-sidebar-accent/40 rounded-lg flex items-center justify-between pr-2 h-8 text-[11px] uppercase tracking-wider font-semibold text-sidebar-foreground/50">
                    <span>{group.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 transition-transform duration-300 text-sidebar-foreground/40",
                        openGroups[group.id] && "rotate-180"
                      )}
                    />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
              )}
              <CollapsibleContent>
                <SidebarGroupContent>
                  {renderNavItems(group.items, group.iconColor)}
                </SidebarGroupContent>
              </CollapsibleContent>
              
              {/* En mode collapsed, afficher les icônes directement */}
              {collapsed && (
                <SidebarGroupContent>
                  {renderNavItems(group.items, group.iconColor)}
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          </Collapsible>
        ))}

        <SidebarSeparator className="my-2 opacity-30" />

        {/* Export PDF */}
        {(onExportClick || exportAlwaysVisible) && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => {
                      if (onExportClick) {
                        onExportClick();
                      } else {
                        navigate("/", { state: { openExport: true } });
                      }
                    }}
                    tooltip={collapsed ? "Export PDF" : undefined}
                    className="h-9 sm:h-10 rounded-lg hover:bg-sidebar-accent/60 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  >
                    <FileText className="h-[18px] w-[18px] text-sidebar-foreground/60" />
                    {!collapsed && <span className="text-sm">Export PDF</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Configuration */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
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

      {/* Footer - clean & aéré */}
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
