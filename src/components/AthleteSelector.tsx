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
import { Athlete, getDernierSnapshot, ObjectifType } from "@/types/athlete";
import { creerAthlete } from "@/lib/athleteStore";
import { estimerTTE } from "@/types/snapshotNolio";

interface AthleteSelectorProps {
  athletes: Athlete[];
  selectedAthleteId: string | null;
  onSelectAthlete: (athleteId: string) => void;
  onAddAthlete: (athlete: Athlete) => void;
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
    nom: "",
    objectif: "IM" as ObjectifType,
    sexe: "M" as "M" | "F",
    // ✅ FIX 11: pas de valeur par défaut (undefined)
    masse_grasse: undefined as number | undefined,
  });

  const handleAddAthlete = () => {
    const athlete = creerAthlete(
      crypto.randomUUID(),
      newAthlete.nom || "Nouvel Athlète",
      newAthlete.sexe,
      newAthlete.objectif,
      newAthlete.masse_grasse
    );

    onAddAthlete(athlete);
    setIsDialogOpen(false);
    setNewAthlete({
      nom: "",
      objectif: "IM",
      sexe: "M",
      // ✅ FIX 11: pas de valeur par défaut
      masse_grasse: undefined,
    });
  };

  const selectedAthlete = athletes.find((a) => a.id === selectedAthleteId);
  const snapshot = selectedAthlete ? getDernierSnapshot(selectedAthlete) : null;

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
                    {athlete.nom || `Athlète ${athlete.id.slice(0, 6)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedAthlete && snapshot && (
            <div className="hidden md:flex items-center gap-4 px-4 py-2 rounded-lg bg-secondary/30 border border-border">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Poids</p>
                <p className="font-mono font-semibold text-foreground">
                  {snapshot.poids}kg
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">FTP</p>
                <p className="font-mono font-semibold text-primary">
                  {snapshot.ftp}W
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Objectif</p>
                <p className="font-semibold text-accent">
                  {selectedAthlete.objectif}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Profils</p>
                <p className="font-mono font-semibold text-success">
                  {selectedAthlete.historique?.length || 0}
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
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    value={newAthlete.nom}
                    onChange={(e) =>
                      setNewAthlete({ ...newAthlete, nom: e.target.value })
                    }
                    placeholder="Nom de l'athlète"
                    className="bg-secondary/50"
                  />
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
                        <SelectItem value="Marathon">Marathon</SelectItem>
                        <SelectItem value="Semi">Semi-Marathon</SelectItem>
                        <SelectItem value="10K">10K</SelectItem>
                        <SelectItem value="5K">5K</SelectItem>
                        <SelectItem value="TrailShort">Trail court</SelectItem>
                        <SelectItem value="TrailMountain">Trail montagne</SelectItem>
                        <SelectItem value="TrailUltra">Ultra trail</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Masse grasse (%) - optionnel</Label>
                  <Input
                    type="number"
                    placeholder="ex: 14"
                    value={newAthlete.masse_grasse ?? ""}
                    onChange={(e) =>
                      setNewAthlete({
                        ...newAthlete,
                        // ✅ FIX 11: undefined si vide (pas de fallback 18%)
                        masse_grasse: e.target.value === "" ? undefined : parseFloat(e.target.value) || undefined,
                      })
                    }
                    className="bg-secondary/50"
                  />
                  <p className="text-xs text-muted-foreground">Laissez vide si non mesuré</p>
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
