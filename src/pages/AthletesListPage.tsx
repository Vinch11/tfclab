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
import { Input } from "@/components/ui/input";
import { Plus, User, Target, ChevronRight, Trash2, Bike, Footprints, Waves, Download, Copy, Pencil, Eye, EyeOff, Search } from "lucide-react";
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
  const { athletes, setSelectedAthleteId, deleteAthlete, refresh, toggleAthleteHidden } = useAthletes();
  const { athletes: dbAthletes, snapshots, tests, checkins, loadData } = useCloudDataContext();
  const { user } = useAuth();
  const [importing, setImporting] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [search, setSearch] = useState("");
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
    // Ne pas effacer la sélection persistée : la route "/athlete/new"
    // gère déjà le mode création. Sinon on perd l'athlète en cours au retour.
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

        // 6. Import plan_versions (AI plans)
        for (const plan of ((item as any).planVersions ?? [])) {
          const { id: _oldId, athlete_id: _oldAthleteId, coach_id: _oldCoach, created_at: _ca, ...planData } = plan;
          const { error: planError } = await supabase
            .from("plan_versions")
            .insert({
              ...planData,
              athlete_id: newAthleteId,
              coach_id: user.id,
            });
          if (planError) {
            errors.push(`Plan IA pour "${item.athlete.name}": ${planError.message}`);
          }
        }

        // 7. Import coach_overrides
        for (const ov of ((item as any).coachOverrides ?? [])) {
          const { id: _oldId, athlete_id: _oldAthleteId, coach_id: _oldCoach, created_at: _ca, ...ovData } = ov;
          const { error: ovError } = await supabase
            .from("coach_overrides")
            .insert({
              ...ovData,
              athlete_id: newAthleteId,
              coach_id: user.id,
            });
          if (ovError) {
            errors.push(`Override pour "${item.athlete.name}": ${ovError.message}`);
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

  const query = search.trim().toLowerCase();
  const filteredAthletes = query
    ? athletes.filter((a) => (a.nom || "").toLowerCase().includes(query))
    : athletes;

  const initials = (name: string) =>
    (name || "?")
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");

  return (
    <AppLayout title="Mes Athlètes">
      <div className="space-y-3 animate-fade-in">
        {/* Barre d'actions compacte */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Rechercher (${athletes.length})`}
              className="pl-8 h-9"
            />
          </div>
          {!selectionMode && (
            <>
              <Button variant="outline" size="sm" onClick={toggleSelectionMode} className="h-9 shrink-0">
                <Checkbox className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Sélectionner</span>
              </Button>
              <AthleteImportExport
                athletes={dbAthletes}
                snapshots={snapshots}
                tests={tests}
                checkins={checkins}
                onImport={handleImport}
                fetchExtras={async (ids) => {
                  const result: Record<string, { planVersions: any[]; coachOverrides: any[] }> = {};
                  if (ids.length === 0) return result;
                  const [{ data: plans }, { data: overrides }] = await Promise.all([
                    supabase.from("plan_versions").select("*").in("athlete_id", ids),
                    supabase.from("coach_overrides").select("*").in("athlete_id", ids),
                  ]);
                  for (const id of ids) {
                    result[id] = {
                      planVersions: (plans ?? []).filter((p: any) => p.athlete_id === id),
                      coachOverrides: (overrides ?? []).filter((o: any) => o.athlete_id === id),
                    };
                  }
                  return result;
                }}
              />
            </>
          )}
          <Button onClick={handleNewAthlete} size="sm" className="h-9 shrink-0 gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouvel athlète</span>
          </Button>
        </div>

        {/* Selection mode toolbar */}
        {selectionMode && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-primary/10 rounded-lg border border-primary/20 text-sm">
            <span className="font-medium">
              {selectedIds.size}/{dbAthletes.length} sélectionné(s)
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={selectAll}>Tout</Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>Aucun</Button>
              <Button variant="outline" size="sm" onClick={toggleSelectionMode}>Annuler</Button>
              <Button size="sm" onClick={exportSelected} disabled={selectedIds.size === 0}>
                <Download className="w-4 h-4 mr-1.5" />
                Exporter ({selectedIds.size})
              </Button>
            </div>
          </div>
        )}

        {/* Liste dense */}
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {filteredAthletes.map((athlete) => {
              const athleteSnapshots = snapshots.filter((s) => s.athlete_id === athlete.id);
              const latestSnapshot = athleteSnapshots.length > 0
                ? athleteSnapshots.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
                : null;
              const vlamax = latestSnapshot?.vlamax ?? null;
              const sportsCount = getSportsCountFromSnapshots(athlete.id);
              const isSelected = selectedIds.has(athlete.id);
              return (
                <div
                  key={athlete.id}
                  className={`group flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-muted/50 ${
                    isSelected ? "bg-primary/5" : ""
                  } ${athlete.is_hidden ? "opacity-60" : ""}`}
                  onClick={() => handleSelectAthlete(athlete.id)}
                >
                  {selectionMode && (
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleSelection(athlete.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0"
                    />
                  )}
                  <div className="w-9 h-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {initials(athlete.nom)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{athlete.nom}</span>
                      {athlete.is_hidden && <EyeOff className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
                      <span className="inline-flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        {getObjectifLabel(athlete.objectif)}
                      </span>
                      {vlamax && <span>· VLamax {vlamax.toFixed(2)}</span>}
                      {sportsCount.vélo > 0 && <span className="inline-flex items-center gap-0.5">· <Bike className="h-3 w-3" />{sportsCount.vélo}</span>}
                      {sportsCount.course > 0 && <span className="inline-flex items-center gap-0.5">· <Footprints className="h-3 w-3" />{sportsCount.course}</span>}
                      {sportsCount.natation > 0 && <span className="inline-flex items-center gap-0.5">· <Waves className="h-3 w-3" />{sportsCount.natation}</span>}
                    </div>
                  </div>

                  {!selectionMode && (
                    <div className="flex items-center shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Éditer le profil"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAthleteId(athlete.id);
                          navigate(`/athlete/${athlete.id}`);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title={athlete.is_hidden ? "Démasquer ce profil" : "Masquer ce profil"}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAthleteHidden(athlete.id, !athlete.is_hidden);
                        }}
                      >
                        {athlete.is_hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hidden sm:inline-flex"
                        title="Dupliquer ce profil"
                        onClick={(e) => handleDuplicateAthlete(e, athlete.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        title="Supprimer ce profil"
                        onClick={(e) => handleDeleteAthlete(e, athlete.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <ChevronRight className="h-4 w-4 text-muted-foreground ml-1" />
                    </div>
                  )}
                </div>
              );
            })}

            {filteredAthletes.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {athletes.length === 0 ? "Aucun athlète. Créez votre premier profil." : "Aucun résultat."}
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

