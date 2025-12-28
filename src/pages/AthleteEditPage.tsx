// =============================================
// ÉCRAN 2 - PROFIL ATHLÈTE (Création/Édition)
// =============================================

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Save, ArrowRight, User } from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";
import { Athlete, ObjectifType, SexeType } from "@/types/athlete";
import { toast } from "sonner";

export default function AthleteEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { athletes, currentAthlete, addAthlete, updateAthlete, setSelectedAthleteId } = useAthletes();

  const isNew = id === "new";
  const editingAthlete = isNew ? null : athletes.find((a) => a.id === id) || currentAthlete;

  const [nom, setNom] = useState(editingAthlete?.nom || "");
  const [sexe, setSexe] = useState<SexeType>(editingAthlete?.sexe || "M");
  const [objectif, setObjectif] = useState<ObjectifType>(editingAthlete?.objectif || "IM");
  const [masseGrasse, setMasseGrasse] = useState(
    editingAthlete?.masse_grasse?.toString() || "18"
  );

  const handleSave = () => {
    if (!nom.trim()) {
      toast.error("Le nom est requis");
      return;
    }

    const athleteData: Athlete = {
      id: isNew ? crypto.randomUUID() : editingAthlete?.id || crypto.randomUUID(),
      nom: nom.trim(),
      sexe,
      objectif,
      masse_grasse: parseFloat(masseGrasse) || 18,
      historique: editingAthlete?.historique || [],
    };

    if (isNew) {
      addAthlete(athleteData);
      toast.success("Athlète créé");
    } else {
      updateAthlete(athleteData);
      toast.success("Profil mis à jour");
    }

    setSelectedAthleteId(athleteData.id);
  };

  const handleSaveAndContinue = () => {
    handleSave();
    navigate("/snapshot");
  };

  return (
    <AppLayout title={isNew ? "Nouvel Athlète" : "Profil Athlète"} showBack>
      <div className="space-y-6 animate-fade-in max-w-lg mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Informations Athlète
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom</Label>
              <Input
                id="nom"
                placeholder="Nom de l'athlète"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sexe</Label>
                <Select value={sexe} onValueChange={(v) => setSexe(v as SexeType)}>
                  <SelectTrigger>
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
                  value={objectif}
                  onValueChange={(v) => setObjectif(v as ObjectifType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IM">Ironman</SelectItem>
                    <SelectItem value="703">70.3 / Half Ironman</SelectItem>
                    <SelectItem value="Marathon">Marathon</SelectItem>
                    <SelectItem value="Semi">Semi-Marathon</SelectItem>
                    <SelectItem value="TrailShort">Trail court (20–40km)</SelectItem>
                    <SelectItem value="TrailMountain">Trail montagne (40–80km)</SelectItem>
                    <SelectItem value="TrailUltra">Ultra trail (80km+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="masse">Masse grasse (%)</Label>
              <Input
                id="masse"
                type="number"
                min="5"
                max="40"
                value={masseGrasse}
                onChange={(e) => setMasseGrasse(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Button onClick={handleSave} variant="outline" className="gap-2">
            <Save className="h-4 w-4" />
            Sauvegarder
          </Button>
          <Button onClick={handleSaveAndContinue} className="gap-2">
            <ArrowRight className="h-4 w-4" />
            Sauvegarder et ajouter données
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
