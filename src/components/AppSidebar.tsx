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
  Dumbbell,
  BookOpen,
  GraduationCap,
  Trophy,
  Settings,
  Zap,
  Activity,
  Target,
  ChevronDown,
  LogOut,
  Shield,
  Play,
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
import { useState } from "react";

// Définition des groupes de navigation
const navigationGroups = [
  {
    id: "athlete",
    label: "Athlète",
    defaultOpen: true,
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, route: "/", tab: "dashboard" },
      { id: "profil", label: "Profil Métabolique", icon: User, tab: "profil" },
      { id: "athletes", label: "Mes Athlètes", icon: Users, route: "/athletes" },
    ],
  },
  {
    id: "analyse",
    label: "Analyse",
    defaultOpen: true,
    items: [
      { id: "tests", label: "Tests & Protocoles", icon: FlaskConical, route: "/tests" },
      { id: "race-readiness", label: "Race Readiness", icon: Trophy, tab: "race-readiness" },
      { id: "race-simulation", label: "Simulation", icon: Play, route: "/race-simulation" },
    ],
  },
  {
    id: "suivi",
    label: "Suivi & Fatigue",
    defaultOpen: false,
    items: [
      // Ces fonctions sont disponibles dans le dashboard (sections réorganisables)
      // Pas de tab dédié - on redirige vers le dashboard
      { id: "dashboard-fatigue", label: "Fatigue & Readiness", icon: Activity, route: "/", tab: "dashboard" },
    ],
  },
  {
    id: "outils",
    label: "Outils",
    defaultOpen: false,
    items: [
      { id: "seances", label: "Bibliothèque", icon: Dumbbell, tab: "seances" },
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
}

export function AppSidebar({ activeTab, onTabChange, staffMode, onStaffModeChange }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const { user, signOut } = useAuth();
  const collapsed = state === "collapsed";

  // Track which groups are open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    navigationGroups.reduce((acc, g) => ({ ...acc, [g.id]: g.defaultOpen }), {})
  );

  const handleNavClick = (item: typeof navigationGroups[0]["items"][0]) => {
    if (item.route) {
      navigate(item.route);
    } else if (item.tab) {
      // If we're not on the main page, navigate first
      if (location.pathname !== "/") {
        navigate("/");
      }
      onTabChange(item.tab);
    }
  };

  const isActive = (item: typeof navigationGroups[0]["items"][0]) => {
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
      {/* Header avec logo */}
      <SidebarHeader className="p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <img src={logo} alt="2FC Lab" className={cn("h-10 w-auto", collapsed && "h-8")} />
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground truncate">Two 4 Coaching Lab</h1>
              <p className="text-[10px] text-muted-foreground">Performance Analysis</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Mode Staff Toggle */}
        {!collapsed && (
          <div className="p-3 my-2 rounded-lg bg-muted/50 border border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className={cn("h-4 w-4", staffMode ? "text-primary" : "text-muted-foreground")} />
                <span className="text-sm font-medium">Mode Staff</span>
              </div>
              <Switch
                checked={staffMode}
                onCheckedChange={onStaffModeChange}
                className="data-[state=checked]:bg-primary"
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

      {/* Footer */}
      <SidebarFooter className="p-3 border-t border-border">
        {!collapsed && user && (
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="truncate max-w-[120px]">{user.email}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <ThemeToggle />
          {!collapsed && (
            <button
              onClick={signOut}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Déconnexion</span>
            </button>
          )}
          {collapsed && (
            <SidebarMenuButton onClick={signOut} tooltip="Déconnexion">
              <LogOut className="h-4 w-4" />
            </SidebarMenuButton>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
