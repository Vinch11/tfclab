// =============================================
// ÉCRAN 1 - LISTE DES ATHLÈTES
// =============================================

import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, User, Target, ChevronRight, Trash2 } from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";
import { getDernierSnapshot } from "@/types/athlete";
import { calculVLamaxSnapshot } from "@/lib/athleteStore";

export default function AthletesListPage() {
  const navigate = useNavigate();
  const { athletes, setSelectedAthleteId, deleteAthlete } = useAthletes();

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

  return (
    <AppLayout title="Mes Athlètes">
      <div className="space-y-4 animate-fade-in">
        {/* Liste des athlètes */}
        <div className="space-y-3">
          {athletes.map((athlete) => {
            const snapshot = getDernierSnapshot(athlete);
            const vlamax = snapshot ? calculVLamaxSnapshot(snapshot, athlete.objectif) : null;

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
                            {athlete.objectif === "IM" ? "Ironman" : "70.3"}
                          </Badge>
                          {vlamax && (
                            <span className="text-xs text-muted-foreground">
                              VLamax: {vlamax.toFixed(2)}
                            </span>
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
