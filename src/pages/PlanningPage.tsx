/**
 * PlanningPage — Hub de planification d'entraînement
 * Regroupe : AI Plan, Templates, Bibliothèque
 */

import { useNavigate } from "react-router-dom";
import { SidebarLayout } from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  BookOpen,
  Library,
  ArrowRight,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect } from "react";
import { syncWorkoutsToCloud } from "@/lib/syncWorkoutsToCloud";
import { toast } from "sonner";

const sections = [
  {
    id: "ai-plan",
    title: "Plan IA",
    description: "Plans personnalisés basés sur les limiteurs et le Strategy Engine TFCL",
    icon: Sparkles,
    route: "/planning/ai-plan",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    id: "templates",
    title: "Templates",
    description: "Programmes de référence avec annotations coach",
    icon: BookOpen,
    route: "/planning/templates",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "library",
    title: "Bibliothèque Séances",
    description: "Catalogue TFCL™ complet avec filtrage par sport, phase et objectif",
    icon: Library,
    route: "/planning/library",
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
];

export default function PlanningPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [staffMode, setStaffMode] = useState(() => localStorage.getItem("vlab-staff-mode") === "true");
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncWorkoutsToCloud();
      if (result.success) {
        toast.success(`✅ ${result.inserted} séances synchronisées (${result.deduplicated} doublons supprimés)`);
      } else {
        toast.error(`Erreur sync: ${result.errors.join(", ")}`);
      }
    } catch (err: any) {
      toast.error(`Erreur: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    localStorage.setItem("vlab-staff-mode", staffMode.toString());
  }, [staffMode]);

  return (
    <SidebarLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      staffMode={staffMode}
      onStaffModeChange={setStaffMode}
    >
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header - compact on mobile */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary/10">
              <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-foreground">Planification</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Plans IA & templates</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="gap-1.5 h-8 text-xs sm:text-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
            <span className="hidden xs:inline">{syncing ? "Sync..." : "Sync DB"}</span>
          </Button>
        </div>

        {/* Section Cards - single column on mobile */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card
                key={section.id}
                className="group cursor-pointer hover:border-primary/30 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
                onClick={() => navigate(section.route)}
              >
                <CardHeader className="p-3 sm:p-4 pb-1.5 sm:pb-2">
                  <div className="flex items-center sm:items-start justify-between">
                    <div className="flex items-center gap-2.5 sm:block">
                      <div className={`p-1.5 sm:p-2 rounded-lg ${section.bgColor}`}>
                        <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${section.color}`} />
                      </div>
                      <CardTitle className="text-sm sm:text-base sm:mt-3">{section.title}</CardTitle>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 pt-0 sm:pt-0">
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {section.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info */}
        <Card className="border-dashed border-primary/20 bg-primary/5">
          <CardContent className="py-3 sm:py-4 px-3 sm:px-6 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Le Plan IA utilise les <span className="font-medium text-foreground">limiteurs</span> et <span className="font-medium text-foreground">leviers</span> du Strategy Engine.
            </p>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
