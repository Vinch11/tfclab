// =============================================
// ÉCRAN 5 - SEMAINE TYPE MULTI-SPORT (CLOUD, NO NOLIO)
// FIX 12: Filtrage par objectif + toggles Pro
// =============================================

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Copy, Calendar, AlertCircle, Bike, PersonStanding, Waves, Settings2, Dumbbell } from "lucide-react";
import { toast } from "sonner";

import { useCloudData } from "@/hooks/useCloudData";
import type { DbSnapshot } from "@/hooks/useCloudData";
import { useAthletes } from "@/contexts/AthleteContext";
import { genererSemaineType } from "@/lib/semaineGenerator";
import { getAllowedSportsLabel, isRunningOnlyGoal, type ProModules } from "@/lib/allowedSports";

// --- Helpers ---
type SportTypeUI = "vélo" | "course" | "natation";

function pickEffectiveSnapshot(snapshots: DbSnapshot[], athleteId: string, activeSnapshotId?: string | null) {
  const list = snapshots.filter((s) => s.athlete_id === athleteId);
  if (list.length === 0) return null;
  if (activeSnapshotId) {
    const active = list.find((s) => s.id === activeSnapshotId);
    if (active) return active;
  }
  return [...list].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
}

// Adapter cloud -> format attendu par genererSemaineType(currentAthlete)
// (on construit un "snapshot-like" minimal compatible avec les appels existants)
function buildCompatAthlete(currentAthlete: any, snapshot: DbSnapshot) {
  // snapshot "compat" pour tes anciens calculs (sans Nolio)
  const compatSnapshot: any = {
    id: snapshot.id,
    date: snapshot.date,
    sport: "vélo", // tes générateurs semblent vélo-centrés pour priorité, on garde "vélo"
    // ✅ FIX 11: null au lieu de 70 (pas de fallback inventé)
    poids: snapshot.weight_kg ?? undefined,
    ftp: snapshot.ftp ?? 0,
    pmax_5s: snapshot.pmax_5s ?? undefined,
    tss_7j: 0, // plus de Nolio → on met 0
    vo2max: snapshot.vo2max ?? undefined,
    vma: snapshot.vma ?? undefined,
    css: snapshot.css ?? undefined,
    pace100: undefined,
    source: snapshot.source ?? "manual",
  };

  return {
    ...currentAthlete,
    // injecte un historique minimal pour que getDernierSnapshot/ancien code trouve quelque chose
    historique: [compatSnapshot],
  };
}

export default function SemaineTypePage() {
  const navigate = useNavigate();
  const { currentAthlete } = useAthletes();
  const { snapshots } = useCloudData();

  // ✅ FIX 12: Modules Pro (sauvegardés en localStorage)
  const [proModules, setProModules] = useState<ProModules>(() => {
    const saved = localStorage.getItem("vlab-pro-modules");
    return saved ? JSON.parse(saved) : { triathlon: false, crosstraining: false };
  });

  // Sauvegarder dans localStorage
  useEffect(() => {
    localStorage.setItem("vlab-pro-modules", JSON.stringify(proModules));
  }, [proModules]);

  const handleToggleTriathlon = (val: boolean) => {
    setProModules({ triathlon: val, crosstraining: val ? false : proModules.crosstraining });
  };

  const handleToggleCrossTraining = (val: boolean) => {
    setProModules({ crosstraining: val, triathlon: val ? false : proModules.triathlon });
  };

  if (!currentAthlete) {
    return (
      <AppLayout title="Semaine Type" showBack>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Sélectionnez un athlète</p>
            <Button onClick={() => navigate("/")} className="mt-4">
              Voir les athlètes
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  // ✅ Snapshot cloud effectif (actif si défini)
  const effectiveSnapshot = pickEffectiveSnapshot(
    snapshots as any,
    currentAthlete.id,
    currentAthlete.active_snapshot_id ?? null,
  );

  if (!effectiveSnapshot) {
    return (
      <AppLayout title="Semaine Type" showBack>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
            <p className="text-muted-foreground">Ajoutez un snapshot (manuel) pour générer la semaine</p>
            <Button onClick={() => navigate("/snapshots")} className="mt-4">
              Ajouter un snapshot
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  // ✅ FIX 12: On adapte pour garder ton générateur + modules Pro
  const athleteCompat = buildCompatAthlete(currentAthlete, effectiveSnapshot);
  const semaine = genererSemaineType(athleteCompat, proModules);
  
  // Déterminer si running-only (pour afficher les toggles)
  const isRunning = isRunningOnlyGoal(currentAthlete.goal || "IM");

  if (!semaine) {
    return (
      <AppLayout title="Semaine Type" showBack>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
            <p className="text-muted-foreground">Données insuffisantes pour générer la semaine</p>
            <Button onClick={() => navigate("/snapshots")} className="mt-4">
              Ajouter un snapshot
            </Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const getSportIcon = (sport: SportTypeUI) => {
    switch (sport) {
      case "vélo":
        return <Bike className="h-4 w-4 text-primary" />;
      case "course":
        return <PersonStanding className="h-4 w-4 text-accent" />;
      case "natation":
        return <Waves className="h-4 w-4 text-blue-400" />;
    }
  };

  const getSportColor = (sport: SportTypeUI) => {
    switch (sport) {
      case "vélo":
        return "bg-primary/10 border-primary/20";
      case "course":
        return "bg-accent/10 border-accent/20";
      case "natation":
        return "bg-blue-400/10 border-blue-400/20";
    }
  };

  const handleCopy = () => {
    const text = semaine.semaine
      .map((j: any) => `${j.jour} (${j.sport}): ${j.nom || j.type} - ${j.objectif}`)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Semaine copiée");
  };

  return (
    <AppLayout title="Semaine Type" showBack>
      <div className="space-y-4 animate-fade-in">
        {/* ✅ FIX 12: Panneau Option Pro (Staff) */}
        {isRunning && (
          <Card className="border-dashed border-warning/30 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Settings2 className="h-4 w-4 text-warning" />
                <span className="font-semibold text-sm">Option Pro (Staff)</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-3">
                  <Switch
                    id="triathlon"
                    checked={proModules.triathlon}
                    onCheckedChange={handleToggleTriathlon}
                  />
                  <Label htmlFor="triathlon" className="text-sm cursor-pointer">
                    Mode Triathlon complet
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="crosstraining"
                    checked={proModules.crosstraining}
                    onCheckedChange={handleToggleCrossTraining}
                    disabled={proModules.triathlon}
                  />
                  <Label htmlFor="crosstraining" className="text-sm cursor-pointer">
                    Cross-training vélo (récup)
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header avec objectif + sports autorisés */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">Priorité: {semaine.priorite}</span>
              </div>
              <Badge variant="secondary">{semaine.nbSeancesCles} clés</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>VLamax: {semaine.vlamax.toFixed(2)}</span>
              <span>TTE: {semaine.tte} min</span>
              <span>Volume: {semaine.volumeTotal}</span>
              <span>
                Snapshot: {effectiveSnapshot.date}
                {currentAthlete.active_snapshot_id ? " (actif)" : ""}
              </span>
            </div>
            {/* ✅ FIX 12: Affichage explicite des sports autorisés */}
            <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Objectif:</span>
              <Badge variant="outline">{currentAthlete.goal || semaine.objectif}</Badge>
              <span className="text-xs font-medium text-muted-foreground ml-2">Sports autorisés:</span>
              <Badge className="bg-success/10 text-success border-success/30" variant="outline">
                {getAllowedSportsLabel(semaine.sportsAutorises)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">
              {isRunning && !proModules.triathlon ? "Programme Course" : "Programme multi-sport"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Accordion type="multiple" className="w-full">
              {semaine.semaine.map((jour: any, index: number) => (
                <AccordionItem key={index} value={jour.jour}>
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-3 flex-1">
                      {getSportIcon(jour.sport)}
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{jour.jour}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {jour.sport}
                          </Badge>
                          {jour.estCle && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0">
                              CLÉ
                            </Badge>
                          )}
                          {/* ✅ FIX 12: Badge auto-corrigé */}
                          {jour.autoCorrige && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-warning/10 text-warning border-warning/30">
                              Auto-corrigé
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{jour.nom || jour.type}</p>
                      </div>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="px-4 pb-3">
                    <div className={`p-3 rounded-lg border ${getSportColor(jour.sport)}`}>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Objectif</span>
                          <span>{jour.objectif}</span>
                        </div>
                        {jour.intensite && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Intensité</span>
                            <span>{jour.intensite}</span>
                          </div>
                        )}
                        {jour.duree && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Durée</span>
                            <span>{jour.duree}</span>
                          </div>
                        )}
                        {jour.format && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Format</span>
                            <span>{jour.format}</span>
                          </div>
                        )}
                        {jour.contenu && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Contenu</span>
                            <span>{jour.contenu}</span>
                          </div>
                        )}
                      </div>
                      {jour.description && (
                        <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                          {jour.description}
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        <Button onClick={handleCopy} className="w-full gap-2" variant="outline">
          <Copy className="h-4 w-4" />
          Copier le planning
        </Button>
      </div>
    </AppLayout>
  );
}
