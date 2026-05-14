// =============================================
// ÉCRAN 1 - LISTE DES ATHLÈTES
// =============================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, User, Target, ChevronRight, Trash2, Bike, Footprints, Waves, Download, Copy, Pencil } from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { getObjectifLabel } from "@/types/athlete";
import { SportType } from "@/types/snapshotNolio";
import { AthleteImportExport, AthleteExportData } from "@/components/AthleteImportExport";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, Json } from "@/integrations/supabase/types";

export default function AthletesListPage() {
  const navigate = useNavigate();
  const { athletes, setSelectedAthleteId, deleteAthlete, refresh } = useAthletes();
  const { athletes: dbAthletes, snapshots, tests, checkins, loadData } = useCloudDataContext();
  const { user } = useAuth();
  const [importing, setImporting] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelectAthlete = (athleteId: string) => {
    if (selectionMode) {
      toggleSelection(athleteId);
      return;
    }
    setSelectedAthleteId(athleteId);
    navigate("/");
  };

  const handleNewAthlete = () => {
    setSelectedAthleteId(null);
    navigate("/athlete/new");
  };

  const handleDeleteAthlete = (e: React.MouseEvent, athleteId: string) => {
    e.stopPropagation();
    if (confirm("Supprimer cet athlète ?")) {
      deleteAthlete(athleteId);
    }
  };

  const handleDuplicateAthlete = async (e: React.MouseEvent, athleteId: string) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Non connecté");
      return;
    }
    const source = dbAthletes.find((a) => a.id === athleteId);
    if (!source) {
      toast.error("Athlète introuvable");
      return;
    }
    const defaultName = `${source.name} (copie)`;
    const newName = window.prompt("Nom du profil dupliqué :", defaultName);
    if (newName === null) return; // annulé
    const finalName = newName.trim() || defaultName;

    const toastId = toast.loading(`Duplication de "${source.name}"…`);
    try {
      // 1. Création du nouvel athlète
      const { data: newAthlete, error: athleteError } = await supabase
        .from("athletes")
        .insert({
          coach_id: user.id,
          name: finalName,
          goal: source.goal,
          refs: source.refs as Json,
          vo2max: source.vo2max,
          birth_date: source.birth_date,
          sex: (source as any).sex ?? null,
        })
        .select()
        .single();

      if (athleteError || !newAthlete) {
        throw new Error(athleteError?.message || "Échec de création");
      }

      const newAthleteId = newAthlete.id;
      const oldToNewSnapshotId = new Map<string, string>();

      // 2. Snapshots
      const srcSnapshots = snapshots.filter((s) => s.athlete_id === athleteId);
      for (const snap of srcSnapshots) {
        const fullSnap = snap as unknown as Tables<"snapshots">;
        const { id: _id, athlete_id: _aid, coach_id: _cid, created_at: _ca, updated_at: _ua, ...snapData } = fullSnap;
        const { data: newSnap, error: snapError } = await supabase
          .from("snapshots")
          .insert({ ...snapData, athlete_id: newAthleteId, coach_id: user.id })
          .select()
          .single();
        if (!snapError && newSnap) {
          oldToNewSnapshotId.set(snap.id, newSnap.id);
        }
      }

      // 3. active_snapshot_id
      if (source.active_snapshot_id && oldToNewSnapshotId.has(source.active_snapshot_id)) {
        await supabase
          .from("athletes")
          .update({ active_snapshot_id: oldToNewSnapshotId.get(source.active_snapshot_id) })
          .eq("id", newAthleteId);
      }

      // 4. Tests
      const srcTests = tests.filter((t) => t.athlete_id === athleteId);
      for (const test of srcTests) {
        const { id: _id, athlete_id: _aid, coach_id: _cid, ...testData } = test as any;
        await supabase.from("tests").insert({ ...testData, athlete_id: newAthleteId, coach_id: user.id });
      }

      // 5. Checkins
      const srcCheckins = checkins.filter((c) => c.athlete_id === athleteId);
      for (const checkin of srcCheckins) {
        const { id: _id, athlete_id: _aid, coach_id: _cid, created_at: _ca, updated_at: _ua, ...checkinData } = checkin as any;
        await supabase.from("checkins").insert({ ...checkinData, athlete_id: newAthleteId, coach_id: user.id });
      }

      await loadData();
      await refresh();
      toast.success(`Profil "${finalName}" dupliqué`, { id: toastId });
    } catch (err) {
      toast.error(`Erreur: ${err instanceof Error ? err.message : "inconnue"}`, { id: toastId });
    }
  };

  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedIds(new Set());
    }
  };

  // Toggle single athlete selection
  const toggleSelection = (athleteId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(athleteId)) {
        next.delete(athleteId);
      } else {
        next.add(athleteId);
      }
      return next;
    });
  };

  // Select/deselect all
  const selectAll = () => {
    setSelectedIds(new Set(dbAthletes.map(a => a.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  // Export selected athletes
  const exportSelected = () => {
    if (selectedIds.size === 0) {
      toast.error("Sélectionnez au moins un athlète");
      return;
    }

    const exportData: AthleteExportData = {
      version: "2.0.0",
      exportedAt: new Date().toISOString(),
      exportedFrom: window.location.origin,
      athletes: Array.from(selectedIds).map(athleteId => {
        const athlete = dbAthletes.find(a => a.id === athleteId);
        if (!athlete) return null;

        const athleteSnapshots = snapshots.filter(s => s.athlete_id === athleteId);
        const athleteTests = tests.filter(t => t.athlete_id === athleteId);
        const athleteCheckins = checkins.filter(c => c.athlete_id === athleteId);

        const { coach_id: _c1, ...athleteWithoutCoach } = athlete;
        const snapshotsWithoutCoach = athleteSnapshots.map(({ coach_id: _c, ...s }) => s);
        const testsWithoutCoach = athleteTests.map(({ coach_id: _c, ...t }) => t);
        const checkinsWithoutCoach = athleteCheckins.map(({ coach_id: _c, ...ch }) => ch);

        return {
          athlete: athleteWithoutCoach,
          snapshots: snapshotsWithoutCoach,
          tests: testsWithoutCoach,
          checkins: checkinsWithoutCoach
        };
      }).filter(Boolean) as AthleteExportData["athletes"]
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `athletes-export-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`${selectedIds.size} athlète(s) exporté(s)`);
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  // Get sports count for athlete from snapshots instead of legacy historique
  const getSportsCountFromSnapshots = (athleteId: string): Record<SportType, number> => {
    const counts: Record<SportType, number> = { vélo: 0, course: 0, natation: 0 };
    const athleteSnapshots = snapshots.filter(s => s.athlete_id === athleteId);
    athleteSnapshots.forEach((s) => {
      // Cast to full snapshot type to access sport_main
      const fullSnapshot = s as unknown as Tables<"snapshots">;
      const sport = fullSnapshot.sport_main;
      if (sport === 'bike') counts['vélo']++;
      else if (sport === 'run') counts['course']++;
      else if (sport === 'swim') counts['natation']++;
    });
    return counts;
  };

  // Import handler - inserts athletes with all related data into Supabase
  const handleImport = async (data: AthleteExportData): Promise<{ imported: number; errors: string[] }> => {
    if (!user) {
      return { imported: 0, errors: ["Non connecté"] };
    }

    setImporting(true);
    const errors: string[] = [];
    let imported = 0;

    for (const item of data.athletes) {
      try {
        // 1. Create athlete with new ID
        const { data: newAthlete, error: athleteError } = await supabase
          .from("athletes")
          .insert({
            coach_id: user.id,
            name: item.athlete.name,
            goal: item.athlete.goal,
            refs: item.athlete.refs,
            vo2max: item.athlete.vo2max,
            birth_date: item.athlete.birth_date,
          })
          .select()
          .single();

        if (athleteError || !newAthlete) {
          errors.push(`Athlète "${item.athlete.name}": ${athleteError?.message || "erreur inconnue"}`);
          continue;
        }

        const newAthleteId = newAthlete.id;
        const oldToNewSnapshotId = new Map<string, string>();

        // 2. Import snapshots
        for (const snap of item.snapshots) {
          const { id: _oldId, athlete_id: _oldAthleteId, created_at: _ca, updated_at: _ua, ...snapData } = snap;
          const { data: newSnap, error: snapError } = await supabase
            .from("snapshots")
            .insert({
              ...snapData,
              athlete_id: newAthleteId,
              coach_id: user.id,
            })
            .select()
            .single();

          if (snapError) {
            errors.push(`Snapshot pour "${item.athlete.name}": ${snapError.message}`);
          } else if (newSnap) {
            oldToNewSnapshotId.set(snap.id, newSnap.id);
          }
        }

        // 3. Update active_snapshot_id if it was set
        if (item.athlete.active_snapshot_id && oldToNewSnapshotId.has(item.athlete.active_snapshot_id)) {
          await supabase
            .from("athletes")
            .update({ active_snapshot_id: oldToNewSnapshotId.get(item.athlete.active_snapshot_id) })
            .eq("id", newAthleteId);
        }

        // 4. Import tests
        for (const test of item.tests) {
          const { id: _oldId, athlete_id: _oldAthleteId, ...testData } = test;
          const { error: testError } = await supabase
            .from("tests")
            .insert({
              ...testData,
              athlete_id: newAthleteId,
              coach_id: user.id,
            });

          if (testError) {
            errors.push(`Test pour "${item.athlete.name}": ${testError.message}`);
          }
        }

        // 5. Import checkins
        for (const checkin of item.checkins) {
          const { id: _oldId, athlete_id: _oldAthleteId, created_at: _ca, updated_at: _ua, ...checkinData } = checkin;
          const { error: checkinError } = await supabase
            .from("checkins")
            .insert({
              ...checkinData,
              athlete_id: newAthleteId,
              coach_id: user.id,
            });

          if (checkinError) {
            errors.push(`Check-in pour "${item.athlete.name}": ${checkinError.message}`);
          }
        }

        imported++;
      } catch (err) {
        errors.push(`Erreur inattendue pour "${item.athlete.name}": ${err instanceof Error ? err.message : "erreur"}`);
      }
    }

    // Refresh data to show new athletes
    await loadData();
    await refresh();
    setImporting(false);

    return { imported, errors };
  };

  return (
    <AppLayout title="Mes Athlètes">
      <div className="space-y-4 animate-fade-in">
        {/* Selection mode toolbar */}
        {selectionMode && (
          <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {selectedIds.size} sur {dbAthletes.length} sélectionné(s)
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Tout
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAll}>
                  Aucun
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={toggleSelectionMode}>
                Annuler
              </Button>
              <Button size="sm" onClick={exportSelected} disabled={selectedIds.size === 0}>
                <Download className="w-4 h-4 mr-2" />
                Exporter ({selectedIds.size})
              </Button>
            </div>
          </div>
        )}

        {/* Import/Export buttons */}
        {!selectionMode && (
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={toggleSelectionMode} className="gap-2">
              <Checkbox className="w-4 h-4" />
              Sélectionner
            </Button>
            <AthleteImportExport
              athletes={dbAthletes}
              snapshots={snapshots}
              tests={tests}
              checkins={checkins}
              onImport={handleImport}
            />
          </div>
        )}

        {/* Liste des athlètes */}
        <div className="space-y-3">
          {athletes.map((athlete) => {
            // Use cloud snapshots instead of legacy historique
            const athleteSnapshots = snapshots.filter(s => s.athlete_id === athlete.id);
            const latestSnapshot = athleteSnapshots.length > 0 
              ? athleteSnapshots.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
              : null;
            const vlamax = latestSnapshot?.vlamax ?? null;
            const sportsCount = getSportsCountFromSnapshots(athlete.id);
            const isSelected = selectedIds.has(athlete.id);
            return (
              <Card
                key={athlete.id}
                className={`cursor-pointer transition-all duration-200 group ${
                  isSelected 
                    ? "border-primary bg-primary/5" 
                    : "hover:border-primary/50"
                }`}
                onClick={() => handleSelectAthlete(athlete.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {selectionMode && (
                        <Checkbox 
                          checked={isSelected}
                          onCheckedChange={() => toggleSelection(athlete.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0"
                        />
                      )}
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {athlete.nom}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            <Target className="h-3 w-3 mr-1" />
                            {getObjectifLabel(athlete.objectif)}
                          </Badge>
                          {vlamax && (
                            <span className="text-xs text-muted-foreground">
                              VLamax: {vlamax.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {/* Sports icons */}
                        <div className="flex items-center gap-2 mt-2">
                          {sportsCount.vélo > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Bike className="h-3 w-3" />
                              <span>{sportsCount.vélo}</span>
                            </div>
                          )}
                          {sportsCount.course > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Footprints className="h-3 w-3" />
                              <span>{sportsCount.course}</span>
                            </div>
                          )}
                          {sportsCount.natation > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Waves className="h-3 w-3" />
                              <span>{sportsCount.natation}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!selectionMode && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Dupliquer ce profil"
                          onClick={(e) => handleDuplicateAthlete(e, athlete.id)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        title="Supprimer ce profil"
                        onClick={(e) => handleDeleteAthlete(e, athlete.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {!selectionMode && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {athletes.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center">
                <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Aucun athlète. Créez votre premier profil.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Bouton ajouter */}
        <Button
          onClick={handleNewAthlete}
          className="w-full py-6 text-lg gap-2"
          size="lg"
        >
          <Plus className="h-5 w-5" />
          Nouvel Athlète
        </Button>
      </div>
    </AppLayout>
  );
}
