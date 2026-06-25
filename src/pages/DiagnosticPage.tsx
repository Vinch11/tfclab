/**
 * DiagnosticPage — Hub des analyses physiologiques
 * Regroupe : Tests, VLamax, Zones Métaboliques, Testing Weeks
 */

import { useNavigate } from "react-router-dom";
import { SidebarLayout } from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FlaskConical,
  ArrowRight,
  Stethoscope,
  Footprints,
  Bike,
  BookOpen,
  ClipboardList,
  Timer,
  Bike as BikeIcon,
  Waves,
  Zap,
} from "lucide-react";
import { useState, useEffect } from "react";
import { AuditAthletesPanel } from "@/components/AuditAthletesPanel";
import { ScientificAuditReportButton } from "@/components/ScientificAuditReportButton";
import { InscydPoffe2024ValidationCard } from "@/components/InscydPoffe2024ValidationCard";
import { useAthletes } from "@/contexts/AthleteContext";
import {
  openFullDiagnosticDossierPrint,
  type DossierSport,
} from "@/lib/diagnostic/buildDiagnosticProtocolHTML";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FolderDown } from "lucide-react";

const sections = [
  {
    id: "tests",
    title: "Tests & Protocoles",
    description: "Import FIT, détection protocole, calcul FTP, analyse dérive cardiaque",
    icon: FlaskConical,
    route: "/diagnostic/tests",
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    id: "testing-week-tfcl",
    title: "Semaine de Test TFCL",
    description: "Protocole vélo : 5 jours pour calibrer votre profil métabolique",
    icon: Bike,
    route: "/diagnostic/testing-week-tfcl",
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
  },
  {
    id: "testing-week-cap",
    title: "Semaine de Test CAP",
    description: "Tests VMA, seuil, économie de course et durabilité",
    icon: Footprints,
    route: "/diagnostic/testing-week-cap",
    color: "text-green-500",
    bgColor: "bg-green-500/10",
  },
  {
    id: "track-day",
    title: "TFCL Track Day™",
    description: "Protocole piste complet en 2h — VMA, VLamax, Seuil, TTE en une seule séance",
    icon: Timer,
    route: "/diagnostic/track-day",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
  {
    id: "bike-track-day",
    title: "🚴 TFCL Bike Day™",
    description: "Protocole vélo 2h — FTP, VLamax, MAP, W' en une séance",
    icon: BikeIcon,
    route: "/diagnostic/bike-track-day",
    color: "text-orange-600",
    bgColor: "bg-orange-600/10",
  },
  {
    id: "swim-pool-day",
    title: "🏊 TFCL Pool Day™",
    description: "Protocole piscine 1h30 — CSS, VLamax nage, capacité aérobie",
    icon: Waves,
    route: "/diagnostic/swim-pool-day",
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
  },
  {
    id: "tri-test-day",
    title: "⚡ TFCL Tri Test Day™",
    description: "Protocole triathlon combiné — profil complet en 2 séances",
    icon: Zap,
    route: "/diagnostic/tri-test-day",
    color: "text-red-500",
    bgColor: "bg-red-500/10",
  },
  {
    id: "coach-checklist",
    title: "Checklist Coach",
    description: "Tests à faire passer & données à encoder par sport (Run / Tri / Trail), cochable et imprimable",
    icon: ClipboardList,
    route: "/diagnostic/coach-checklist",
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    id: "cohort-literature",
    title: "Cohorte Littérature (IA)",
    description: "Extraction IA de profils de référence depuis la littérature scientifique (Mader, Heck, Beneke…)",
    icon: BookOpen,
    route: "/diagnostic/cohort-literature",
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

export default function DiagnosticPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [staffMode, setStaffMode] = useState(() => localStorage.getItem("vlab-staff-mode") === "true");
  const { currentAthlete } = useAthletes();
  const [dossierSport, setDossierSport] = useState<DossierSport>("triathlon");
  const [dossierAthleteName, setDossierAthleteName] = useState<string>("");

  useEffect(() => {
    setDossierAthleteName(currentAthlete?.name ?? "");
  }, [currentAthlete?.id, currentAthlete?.name]);

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
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary/10">
            <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">Diagnostic</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">Analyses physiologiques & protocoles</p>
          </div>
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

        {/* Export dossier complet PDF (page de garde + fiches + synthèse) */}
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FolderDown className="h-5 w-5 text-primary" />
              📁 Exporter le dossier complet PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Génère un seul document imprimable avec page de garde, fiches de tests papier et synthèse finale.
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="dossier-athlete" className="text-xs">Nom de l'athlète</Label>
                <Input
                  id="dossier-athlete"
                  value={dossierAthleteName}
                  onChange={(e) => setDossierAthleteName(e.target.value)}
                  placeholder="Nom Prénom"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dossier-sport" className="text-xs">Sport principal</Label>
                <select
                  id="dossier-sport"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={dossierSport}
                  onChange={(e) => setDossierSport(e.target.value as DossierSport)}
                >
                  <option value="triathlon">Triathlon</option>
                  <option value="course">Course à pied</option>
                  <option value="cyclisme">Cyclisme</option>
                </select>
              </div>
            </div>
            <Button
              className="w-full sm:w-auto"
              onClick={() =>
                openFullDiagnosticDossierPrint(
                  dossierAthleteName.trim() || undefined,
                  dossierSport,
                )
              }
            >
              <FolderDown className="h-4 w-4 mr-2" />
              Générer le dossier complet
            </Button>
            <p className="text-[10px] text-muted-foreground italic">
              S'ouvre dans un nouvel onglet — utilisez Ctrl+P (Cmd+P) puis "Enregistrer en PDF".
            </p>
          </CardContent>
        </Card>

        {/* Rapport d'audit scientifique signé (toutes traces consolidées) */}
        <ScientificAuditReportButton />

        {/* Audit de cohérence des profils athlètes */}
        <AuditAthletesPanel />

        {/* Référence externe de validation MLSS bike (Poffé 2024, N=29, r=0.99) */}
        <InscydPoffe2024ValidationCard />

        {/* Info - compact on mobile */}
        <Card className="border-dashed border-primary/20 bg-primary/5">
          <CardContent className="py-3 sm:py-4 px-3 sm:px-6 text-center">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Les résultats alimentent le <span className="font-medium text-foreground">TFCL Coaching Compass™</span> et les décisions coaching.
            </p>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
