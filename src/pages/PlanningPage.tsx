/**
 * PlanningPage — Hub de planification d'entraînement
 * Regroupe : AI Plan, Templates, Running Guidance
 */

import { useNavigate } from "react-router-dom";
import { SidebarLayout } from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  BookOpen,
  Footprints,
  ArrowRight,
  CalendarDays,
  Dumbbell,
  RefreshCw,
} from "lucide-react";
import { useState, useEffect } from "react";
import { syncWorkoutsToCloud } from "@/lib/syncWorkoutsToCloud";
import { toast } from "sonner";

const sections = [
  {
    id: "ai-plan",
    title: "Plan IA",
    description: "Générateur de plans d'entraînement personnalisés basé sur les limiteurs, leviers et le Strategy Engine TFCL",
    icon: Sparkles,
    route: "/planning/ai-plan",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    id: "templates",
    title: "Templates",
    description: "Bibliothèque de programmes de référence avec annotations coach et personnalisation par profil",
    icon: BookOpen,
    route: "/planning/templates",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "running-guidance",
    title: "Running Guidance",
    description: "Guide hebdomadaire d'entraînement course à pied avec recommandations de séances personnalisées",
    icon: Footprints,
    route: "/planning/running-guidance",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
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
      <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <CalendarDays className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Planification</h1>
              <p className="text-sm text-muted-foreground">Entraînement futur, plans IA & templates</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Sync..." : "Sync DB"}
          </Button>
        </div>

        {/* Section Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card
                key={section.id}
                className="group cursor-pointer hover:border-primary/30 hover:shadow-md transition-all duration-200"
                onClick={() => navigate(section.route)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg ${section.bgColor}`}>
                      <Icon className={`h-5 w-5 ${section.color}`} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                  </div>
                  <CardTitle className="text-base mt-3">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {section.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Info */}
        <Card className="border-dashed border-primary/20 bg-primary/5">
          <CardContent className="py-4 text-center">
            <p className="text-sm text-muted-foreground">
              Le Plan IA utilise les <span className="font-medium text-foreground">limiteurs</span> et <span className="font-medium text-foreground">leviers</span> identifiés par le Strategy Engine pour générer des programmes adaptés.
            </p>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
