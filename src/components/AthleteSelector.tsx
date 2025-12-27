import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, UserPlus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AthleteWithTests, creerAthlete } from "@/lib/athleteStore";

interface AthleteSelectorProps {
  athletes: AthleteWithTests[];
  selectedAthleteId: string | null;
  onSelectAthlete: (athleteId: string) => void;
  onAddAthlete: (athlete: AthleteWithTests) => void;
  onDeleteAthlete: (athleteId: string) => void;
}

export function AthleteSelector({
  athletes,
  selectedAthleteId,
  onSelectAthlete,
  onAddAthlete,
  onDeleteAthlete,
}: AthleteSelectorProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newAthlete, setNewAthlete] = useState({
    prenom: "",
    nom: "",
    poids: 70,
    objectif: "IM" as "IM" | "703",
    sexe: "M" as "M" | "F",
    ftp: 280,
  });

  const handleAddAthlete = () => {
    const athlete = creerAthlete(
      crypto.randomUUID(),
      newAthlete.poids,
      newAthlete.objectif,
      newAthlete.sexe,
      50, // vo2max default
      18, // masse_grasse default
      45, // masse_musculaire default
      185, // fc_max default
      50, // fc_repos default
      60, // hrv default
      7, // sommeil default
      4, // fatigue default
      newAthlete.ftp
    );
    athlete.prenom = newAthlete.prenom;
    athlete.nom = newAthlete.nom;

    onAddAthlete(athlete);
    setIsDialogOpen(false);
    setNewAthlete({
      prenom: "",
      nom: "",
      poids: 70,
      objectif: "IM",
      sexe: "M",
      ftp: 280,
    });
  };

  const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId);

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <Users className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Athlète sélectionné
            </Label>
            <Select
              value={selectedAthleteId || undefined}
              onValueChange={onSelectAthlete}
            >
              <SelectTrigger className="w-[200px] mt-1 bg-secondary/50 border-border">
                <SelectValue placeholder="Choisir un athlète" />
              </SelectTrigger>
              <SelectContent>
                {athletes.map((athlete) => (
                  <SelectItem key={athlete.id} value={athlete.id}>
                    {athlete.prenom && athlete.nom
                      ? `${athlete.prenom} ${athlete.nom}`
                      : `Athlète ${athlete.id.slice(0, 6)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedAthlete && (
            <div className="hidden md:flex items-center gap-4 px-4 py-2 rounded-lg bg-secondary/30 border border-border">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Poids</p>
                <p className="font-mono font-semibold text-foreground">
                  {selectedAthlete.poids}kg
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Objectif</p>
                <p className="font-semibold text-accent">
                  {selectedAthlete.objectif}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Tests</p>
                <p className="font-mono font-semibold text-primary">
                  {selectedAthlete.tests?.length || 0}
                </p>
              </div>
            </div>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Nouvel Athlète</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prénom</Label>
                    <Input
                      value={newAthlete.prenom}
                      onChange={(e) =>
                        setNewAthlete({ ...newAthlete, prenom: e.target.value })
                      }
                      placeholder="Prénom"
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Nom</Label>
                    <Input
                      value={newAthlete.nom}
                      onChange={(e) =>
                        setNewAthlete({ ...newAthlete, nom: e.target.value })
                      }
                      placeholder="Nom"
                      className="bg-secondary/50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Poids (kg)</Label>
                    <Input
                      type="number"
                      value={newAthlete.poids}
                      onChange={(e) =>
                        setNewAthlete({
                          ...newAthlete,
                          poids: parseFloat(e.target.value) || 70,
                        })
                      }
                      className="bg-secondary/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>FTP (W)</Label>
                    <Input
                      type="number"
                      value={newAthlete.ftp}
                      onChange={(e) =>
                        setNewAthlete({
                          ...newAthlete,
                          ftp: parseFloat(e.target.value) || 280,
                        })
                      }
                      className="bg-secondary/50"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sexe</Label>
                    <Select
                      value={newAthlete.sexe}
                      onValueChange={(v: "M" | "F") =>
                        setNewAthlete({ ...newAthlete, sexe: v })
                      }
                    >
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Homme</SelectItem>
                        <SelectItem value="F">Femme</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Objectif</Label>
                    <Select
                      value={newAthlete.objectif}
                      onValueChange={(v: "IM" | "703") =>
                        setNewAthlete({ ...newAthlete, objectif: v })
                      }
                    >
                      <SelectTrigger className="bg-secondary/50">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="IM">Ironman</SelectItem>
                        <SelectItem value="703">70.3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleAddAthlete} className="w-full" variant="glow">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Créer l'athlète
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {selectedAthleteId && athletes.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDeleteAthlete(selectedAthleteId)}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}