/**
 * DiagnosticPage — Hub des analyses physiologiques
 * Regroupe : Tests, VLamax, Zones Métaboliques, Testing Weeks
 */

import { useNavigate } from "react-router-dom";
import { SidebarLayout } from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical,
  Activity,
  Layers,
  Calendar,
  ArrowRight,
  Upload,
  Stethoscope,
  Footprints,
  Bike,
} from "lucide-react";
import { useState, useEffect } from "react";

const sections = [
  {
    id: "tests",
    title: "Tests & Protocoles",
    description: "Import FIT, détection protocole, calcul FTP, analyse dérive cardiaque, mise à jour snapshot",
    icon: FlaskConical,
    route: "/diagnostic/tests",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "testing-week-tfcl",
    title: "Semaine de Test TFCL",
    description: "Protocole structuré vélo : 5 jours de tests pour calibrer votre profil métabolique complet",
    icon: Bike,
    route: "/diagnostic/testing-week-tfcl",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    id: "testing-week-cap",
    title: "Semaine de Test CAP",
    description: "Protocole course à pied : tests VMA, seuil, économie de course et durabilité",
    icon: Footprints,
    route: "/diagnostic/testing-week-cap",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
];

export default function DiagnosticPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [staffMode, setStaffMode] = useState(() => localStorage.getItem("vlab-staff-mode") === "true");

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
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Stethoscope className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Diagnostic</h1>
              <p className="text-sm text-muted-foreground">Analyses physiologiques & protocoles de test</p>
            </div>
          </div>
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
              Les résultats des tests alimentent automatiquement le <span className="font-medium text-foreground">TFCL Coaching Compass™</span> et les décisions coaching sur le Dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
