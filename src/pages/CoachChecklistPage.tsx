/**
 * CoachChecklistPage — Checklists tests & données par sport (Run / Tri / Trail)
 * Cochable, persistante par athlète (localStorage), exportable PDF (print).
 */

import { useEffect, useMemo, useState } from "react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ClipboardList, Printer, RotateCcw, Footprints, Bike, Mountain, Users } from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";

type Item = {
  id: string;
  label: string;
  test: string;
  encode: string;
};

type Section = {
  title: string;
  items: Item[];
};

type Sport = "common" | "run" | "tri" | "trail";

const SOCLE: Section = {
  title: "Socle commun (tous athlètes)",
  items: [
    { id: "weight", label: "Poids (kg)", test: "Balance, à jeun le matin", encode: "Profil athlète → Anthropométrie" },
    { id: "height", label: "Taille (cm)", test: "Mesure debout sans chaussures", encode: "Profil athlète → Anthropométrie" },
    { id: "age", label: "Âge & sexe", test: "Date de naissance", encode: "Profil athlète → Identité" },
    { id: "fcmax", label: "FC max (bpm)", test: "Test terrain : 3 km échauffement + 2×3 min all-out + 1 min all-out (FCmax = pic réel)", encode: "Profil → Données physio → FCmax" },
    { id: "fcrest", label: "FC repos (bpm)", test: "Moyenne sur 5 matins consécutifs, allongé, avant lever", encode: "Profil → Données physio → FCrepos" },
    { id: "sport", label: "Sport principal", test: "Discipline cible (Run / Tri / Trail)", encode: "Profil → Sport principal" },
    { id: "raceDate", label: "Date de la course objectif", test: "Date officielle de la course A", encode: "Profil → Objectif principal → Date" },
    { id: "ambition", label: "Niveau d'ambition", test: "Finisher / Age Grouper / Compétitif / Élite", encode: "Profil → Objectif → Ambition" },
  ],
};

const RUN: Section = {
  title: "Coureur (Route / 5K → Marathon)",
  items: [
    { id: "vma", label: "VMA (km/h)", test: "VAMEVAL (palier 0.5 km/h /min) ou 5 min all-out après 15 min d'échauffement", encode: "Diagnostic → Tests → VMA" },
    { id: "seuil_run", label: "Vitesse au seuil (km/h)", test: "30 min all-out (CP30) ou chrono 10 km récent (<8 sem)", encode: "Diagnostic → Tests → Seuil running" },
    { id: "vo2max", label: "VO₂max (ml/kg/min)", test: "Auto-calculé depuis VMA (VO₂max ≈ VMA × 3.5) ou test labo direct", encode: "Calculé auto si VMA renseignée" },
    { id: "sprint15", label: "Sprint 15s (distance, m)", test: "2 km échauffement + 3×15 s all-out plat, départ lancé. Garder la meilleure distance", encode: "Diagnostic → Tests → Sprint 15s" },
    { id: "tte_run", label: "TTE à l'allure seuil (min)", test: "Tenir le plus longtemps possible à l'allure seuil (objectif >40 min)", encode: "Diagnostic → Tests → TTE Run" },
    { id: "economy", label: "Économie de course (ml/kg/km)", test: "Auto-calculé depuis FIT (VO₂ estimé / vitesse en endurance fondamentale)", encode: "Auto depuis import FIT" },
    { id: "race_ref", label: "Course de référence récente", test: "Chrono officiel <8 semaines sur 10K / semi / marathon", encode: "Profil → Records personnels" },
  ],
};

const TRI: Section = {
  title: "Triathlète (Sprint → Ironman)",
  items: [
    { id: "ftp", label: "FTP vélo (W)", test: "Test 20 min all-out × 0.95 (après 20 min échauffement + 5 min all-out)", encode: "Diagnostic → Tests → FTP" },
    { id: "pmax5", label: "Puissance max 5s (W)", test: "Sprint vélo 5 s départ lancé, meilleur de 3 essais", encode: "Diagnostic → Tests → PMax 5s" },
    { id: "cp3", label: "Critical Power 3-point (W)", test: "3 efforts all-out : 12 min, 3 min, 30 s (jours différents)", encode: "Diagnostic → Tests → CP" },
    { id: "tte_bike", label: "TTE vélo à FTP (min)", test: "Tenir le plus longtemps possible à FTP (objectif >40 min)", encode: "Diagnostic → Tests → TTE Bike" },
    { id: "vlamax_bike", label: "VLamax vélo (mmol/L/s)", test: "Sprint vélo 15 s (calculé via sprint 15s ou estimé multi-sources)", encode: "Diagnostic → VLamax (auto)" },
    { id: "css", label: "CSS natation (sec/100m)", test: "400 m + 200 m all-out, CSS = (D400−D200) / 2 m·s", encode: "Diagnostic → Tests → CSS" },
    { id: "vo2_bike", label: "VO₂max vélo (ml/kg/min)", test: "Auto depuis FTP + poids, ou test labo direct", encode: "Calculé auto" },
    { id: "run_subset", label: "Données coureur (VMA + seuil + sprint 15s)", test: "Voir checklist Coureur (sport secondaire)", encode: "Voir onglet Coureur" },
  ],
};

const TRAIL: Section = {
  title: "Trailer (Court → Ultra / Mountain)",
  items: [
    { id: "v_up", label: "Vitesse ascensionnelle au seuil (m/h)", test: "Côte régulière 5–8% pendant 20 min all-out (objectif : V↑ stable)", encode: "Diagnostic → Tests → V↑ seuil" },
    { id: "sprint_uphill", label: "Sprint côte 30s (m)", test: "Sprint montée raide (8–12%) 30 s all-out, distance parcourue", encode: "Diagnostic → Tests → Sprint côte" },
    { id: "weekly_dplus", label: "Charge D+ hebdo habituelle (m)", test: "Moyenne D+ des 4 dernières semaines (Strava/Garmin)", encode: "Profil → Trail → D+ hebdo" },
    { id: "max_dplus_session", label: "D+ max sur une séance (m)", test: "Plus gros D+ encaissé en sortie longue récente (3 mois)", encode: "Profil → Trail → D+ max séance" },
    { id: "race_profile", label: "Profil course objectif (km / D+ / altitude max)", test: "Trace GPX officielle de la course", encode: "Profil → Objectif Trail → Profil course" },
    { id: "target_time", label: "Temps cible (h:min)", test: "Estimation réaliste basée sur courses similaires (calculée via estimateRaceDuration)", encode: "Profil → Objectif → Temps cible" },
    { id: "eccentric_eco", label: "Économie excentrique (descente)", test: "Auto depuis FIT : dérive FC sur descentes longues", encode: "Auto depuis FIT" },
    { id: "fatigue_descent", label: "Fatigue post-descente (subjectif 1–10)", test: "Note ressentie 24 h après sortie longue avec D−", encode: "Snapshot quotidien → Fatigue" },
    { id: "run_subset_trail", label: "Données coureur (VMA + seuil + sprint 15s)", test: "Voir checklist Coureur (base aérobie)", encode: "Voir onglet Coureur" },
  ],
};

const CALIB: Section = {
  title: "Calibration continue (recommandé)",
  items: [
    { id: "fit_sync", label: "Import FIT régulier (Strava / Garmin)", test: "Auto-import via connecteur, ou upload manuel séances clés", encode: "Diagnostic → Tests → Import FIT" },
    { id: "lab_lactate", label: "Test lactate labo (1×/an)", test: "Test incrémental lactate en laboratoire (référence VLamax + MLSS)", encode: "Diagnostic → Tests → Import labo" },
    { id: "snapshot_daily", label: "Snapshot quotidien (fatigue, sommeil, RPE)", test: "Saisie matinale 30 s : état général, sommeil, douleur", encode: "Dashboard → Snapshot du jour" },
    { id: "field_test", label: "Test terrain tous les 6–8 sem", test: "VMA / FTP / Sprint 15s pour calibration continue VLamax 42j", encode: "Diagnostic → Tests" },
  ],
};

const SECTIONS_BY_SPORT: Record<Exclude<Sport, "common">, Section[]> = {
  run: [SOCLE, RUN, CALIB],
  tri: [SOCLE, TRI, RUN, CALIB],
  trail: [SOCLE, TRAIL, RUN, CALIB],
};

function ChecklistView({
  sport,
  sections,
  checked,
  onToggle,
}: {
  sport: string;
  sections: Section[];
  checked: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const allIds = sections.flatMap((s) => s.items.map((i) => `${sport}:${i.id}`));
  const doneCount = allIds.filter((id) => checked[id]).length;
  const total = allIds.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const quality =
    pct < 40
      ? { label: "🔴 Insuffisant", color: "text-red-500" }
      : pct < 70
      ? { label: "🟡 Basique", color: "text-yellow-500" }
      : pct < 90
      ? { label: "🟢 Fiable", color: "text-green-500" }
      : { label: "🔵 Élite", color: "text-blue-500" };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="py-4 px-4 flex items-center gap-4 print:hidden">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium">Progression</span>
              <span className={`text-sm font-semibold ${quality.color}`}>
                {doneCount}/{total} — {quality.label}
              </span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{section.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {section.items.map((item) => {
              const key = `${sport}:${item.id}`;
              const isChecked = !!checked[key];
              return (
                <div
                  key={item.id}
                  className="flex gap-3 items-start p-3 rounded-lg border border-border/50 hover:border-border transition"
                >
                  <Checkbox
                    id={key}
                    checked={isChecked}
                    onCheckedChange={() => onToggle(key)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor={key}
                      className={`font-medium text-sm cursor-pointer block ${
                        isChecked ? "line-through text-muted-foreground" : ""
                      }`}
                    >
                      {item.label}
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium text-foreground/70">Test :</span> {item.test}
                    </p>
                    <p className="text-xs text-primary/80 mt-0.5">
                      <span className="font-medium">→ Encoder :</span> {item.encode}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function CoachChecklistPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [staffMode, setStaffMode] = useState(
    () => localStorage.getItem("vlab-staff-mode") === "true"
  );
  const { currentAthlete } = useAthletes();

  useEffect(() => {
    localStorage.setItem("vlab-staff-mode", staffMode.toString());
  }, [staffMode]);

  const athleteId = currentAthlete?.id ?? "default";
  const athleteName = currentAthlete?.nom ?? currentAthlete?.name ?? "Athlète";
  const storageKey = `coach-checklist:${athleteId}`;

  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setChecked(raw ? JSON.parse(raw) : {});
    } catch {
      setChecked({});
    }
  }, [storageKey]);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const reset = () => {
    if (!confirm("Réinitialiser toutes les cases pour cet athlète ?")) return;
    setChecked({});
    try {
      localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  };

  const [sportTab, setSportTab] = useState<Exclude<Sport, "common">>("run");

  const sections = useMemo(() => SECTIONS_BY_SPORT[sportTab], [sportTab]);

  return (
    <SidebarLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      staffMode={staffMode}
      onStaffModeChange={setStaffMode}
    >
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 print:hidden">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary/10">
              <ClipboardList className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-foreground">Checklist Coach</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Tests à faire passer & données à encoder pour un profil de qualité
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
            </Button>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1.5" /> Imprimer / PDF
            </Button>
          </div>
        </div>

        {/* Athlete badge */}
        <Card className="border-primary/20 bg-primary/5 print:bg-white print:border-black">
          <CardContent className="py-3 px-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm">
              Checklist pour : <span className="font-semibold">{athleteName}</span>
            </span>
            <Badge variant="outline" className="ml-auto text-xs">
              Sport : {sportTab.toUpperCase()}
            </Badge>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={sportTab} onValueChange={(v) => setSportTab(v as Exclude<Sport, "common">)}>
          <TabsList className="grid w-full grid-cols-3 print:hidden">
            <TabsTrigger value="run" className="gap-1.5">
              <Footprints className="h-4 w-4" /> Coureur
            </TabsTrigger>
            <TabsTrigger value="tri" className="gap-1.5">
              <Bike className="h-4 w-4" /> Triathlète
            </TabsTrigger>
            <TabsTrigger value="trail" className="gap-1.5">
              <Mountain className="h-4 w-4" /> Trailer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="run" className="mt-4">
            <ChecklistView sport="run" sections={SECTIONS_BY_SPORT.run} checked={checked} onToggle={toggle} />
          </TabsContent>
          <TabsContent value="tri" className="mt-4">
            <ChecklistView sport="tri" sections={SECTIONS_BY_SPORT.tri} checked={checked} onToggle={toggle} />
          </TabsContent>
          <TabsContent value="trail" className="mt-4">
            <ChecklistView sport="trail" sections={SECTIONS_BY_SPORT.trail} checked={checked} onToggle={toggle} />
          </TabsContent>
        </Tabs>

        {/* Quality legend */}
        <Card className="border-dashed">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Niveaux de qualité du profil</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1 text-muted-foreground">
            <div>🔴 <strong>Insuffisant</strong> (&lt;40%) — Socle incomplet, affichage "Données insuffisantes"</div>
            <div>🟡 <strong>Basique</strong> (40–70%) — Diagnostic OK, plan IA en mode prudent</div>
            <div>🟢 <strong>Fiable</strong> (70–90%) — Plan IA pleine puissance, simulation ±3% (recommandé)</div>
            <div>🔵 <strong>Élite</strong> (&gt;90%) — Calibration continue VLamax 42j, INSCYD-grade</div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
