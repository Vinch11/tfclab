/**
 * AppSidebar – Navigation latérale avec groupes dépliables
 * Remplace la navigation horizontale pour une meilleure organisation
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
  items: NavItem[];
}

// Définition des groupes de navigation restructurés (3 onglets principaux)
const baseNavigationGroups: NavGroup[] = [
  {
    id: "principal",
    label: "Principal",
    defaultOpen: true,
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
    items: [
      { id: "race-day", label: "Race-Day", icon: Smartphone, route: "/race-day" },
      { id: "fatigue", label: "Suivi Fatigue", icon: Activity, route: "/fatigue" },
    ],
  },
  {
    id: "ressources",
    label: "Ressources",
    defaultOpen: false,
    items: [
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
  const { state } = useSidebar();
  const { user, signOut } = useAuth();
  const { isRunningOnly } = useRunningFocusMode();
  const collapsed = state === "collapsed";

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
    // Cas 1: Item avec route externe (ex: /tests, /athletes, /race-simulation)
    if (item.route && item.route !== "/") {
      navigate(item.route);
      return;
    }
    
    // Cas 2: Item avec tab (navigation interne sur la page principale)
    if (item.tab) {
      if (location.pathname === "/") {
        // Déjà sur la page principale - changer directement le tab
        onTabChange(item.tab);
      } else {
        // Sur une autre page - naviguer vers "/" avec le state
        navigate("/", { state: { activeTab: item.tab } });
      }
      return;
    }
    
    // Cas 3: Route "/" sans tab spécifique
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

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-sidebar">
      {/* Header avec logo - mobile optimized */}
      <SidebarHeader className="p-2 sm:p-3 border-b border-border safe-area-inset-top">
        <div className="flex items-center gap-2">
          <img src={logo} alt="2FC Lab" className={cn("h-8 sm:h-10 w-auto", collapsed && "h-7 sm:h-8")} />
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-bold text-foreground truncate">Two 4 Coaching Lab</h1>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">Performance Analysis</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1 sm:px-2 ios-scroll">
        {/* Mode Staff Toggle - mobile optimized */}
        {!collapsed && (
          <div className="p-2 sm:p-3 my-1 sm:my-2 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Shield className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", staffMode ? "text-primary" : "text-muted-foreground")} />
                <span className="text-xs sm:text-sm font-medium">Mode Staff</span>
              </div>
              <Switch
                checked={staffMode}
                onCheckedChange={onStaffModeChange}
                className="data-[state=checked]:bg-primary scale-90 sm:scale-100"
              />
            </div>
          </div>
        )}

        {/* Navigation Groups */}
        {navigationGroups.map((group) => (
          <Collapsible
            key={group.id}
            open={collapsed ? false : openGroups[group.id]}
            onOpenChange={() => !collapsed && toggleGroup(group.id)}
          >
            <SidebarGroup>
              {!collapsed && (
                <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer hover:bg-muted/50 rounded-md flex items-center justify-between pr-2">
                    <span>{group.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 transition-transform duration-200",
                        openGroups[group.id] && "rotate-180"
                      )}
                    />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
              )}
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item);
                      return (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            onClick={() => handleNavClick(item)}
                            isActive={active}
                            tooltip={collapsed ? item.label : undefined}
                            className={cn(
                              "transition-all duration-200",
                              active && "bg-primary/10 text-primary font-medium"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {!collapsed && <span>{item.label}</span>}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
              
              {/* En mode collapsed, afficher les icônes directement */}
              {collapsed && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item);
                      return (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            onClick={() => handleNavClick(item)}
                            isActive={active}
                            tooltip={item.label}
                            className={cn(active && "bg-primary/10 text-primary")}
                          >
                            <Icon className="h-4 w-4" />
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          </Collapsible>
        ))}

        <SidebarSeparator className="my-2" />

        {/* Export PDF - always visible */}
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
                  >
                    <FileText className="h-4 w-4" />
                    {!collapsed && <span>Export PDF</span>}
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
                >
                  <Settings className="h-4 w-4" />
                  {!collapsed && <span>Configuration</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer - mobile optimized with safe area */}
      <SidebarFooter className="p-2 sm:p-3 border-t border-border safe-area-inset-bottom">
        {!collapsed && user && (
          <div className="flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground mb-1 sm:mb-2">
            <span className="truncate max-w-[100px] sm:max-w-[120px]">{user.email}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          <ThemeToggle />
          {!collapsed && (
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors touch-target-sm"
            >
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Déconnexion</span>
            </button>
          )}
          {collapsed && (
            <SidebarMenuButton onClick={signOut} tooltip="Déconnexion" className="touch-target-sm">
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </SidebarMenuButton>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
