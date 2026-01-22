// =============================================
// ÉCRAN 1 - LISTE DES ATHLÈTES
// =============================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, User, Target, ChevronRight, Trash2, Bike, Footprints, Waves } from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { useAuth } from "@/contexts/AuthContext";
import { getDernierSnapshot, getObjectifLabel } from "@/types/athlete";
import { calculVLamaxSnapshot } from "@/lib/athleteStore";
import { SportType } from "@/types/snapshotNolio";
import { AthleteImportExport, AthleteExportData } from "@/components/AthleteImportExport";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AthletesListPage() {
  const navigate = useNavigate();
  const { athletes, setSelectedAthleteId, deleteAthlete, refresh } = useAthletes();
  const { athletes: dbAthletes, snapshots, tests, checkins, loadData } = useCloudDataContext();
  const { user } = useAuth();
  const [importing, setImporting] = useState(false);

  const handleSelectAthlete = (athleteId: string) => {
    setSelectedAthleteId(athleteId);
    navigate("/dashboard");
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

  // Get sports count for athlete
  const getSportsCount = (historique: any[]): Record<SportType, number> => {
    const counts: Record<SportType, number> = { vélo: 0, course: 0, natation: 0 };
    historique.forEach((h) => {
      if (counts[h.sport as SportType] !== undefined) {
        counts[h.sport as SportType]++;
      }
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
        {/* Import/Export buttons */}
        <div className="flex justify-end">
          <AthleteImportExport
            athletes={dbAthletes}
            snapshots={snapshots}
            tests={tests}
            checkins={checkins}
            onImport={handleImport}
          />
        </div>

        {/* Liste des athlètes */}
        <div className="space-y-3">
          {athletes.map((athlete) => {
            const snapshot = getDernierSnapshot(athlete);
            const vlamax = snapshot ? calculVLamaxSnapshot(snapshot, athlete.objectif) : null;
            const sportsCount = getSportsCount(athlete.historique);

            return (
              <Card
                key={athlete.id}
                className="cursor-pointer hover:border-primary/50 transition-all duration-200 group"
                onClick={() => handleSelectAthlete(athlete.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={(e) => handleDeleteAthlete(e, athlete.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
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
