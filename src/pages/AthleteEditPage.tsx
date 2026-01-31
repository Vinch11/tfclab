// =============================================
// ÉCRAN 2 - PROFIL ATHLÈTE (Création/Édition)
// =============================================

import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, ArrowRight, User, Calendar, Info, Target } from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";
import { Athlete, ObjectifType, SexeType, AmbitionLevel } from "@/types/athlete";
import { toast } from "sonner";
import { calculateAge, computeAgeAdjustmentIndex, AGE_METHODOLOGY } from "@/lib/ageAdjustment";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { AMBITION_DEFINITIONS, AMBITION_LEVELS_ORDERED, DEFAULT_AMBITION, getAmbitionDefinition } from "@/types/ambitionLevel";
import { ObjectifHistorySelector } from "@/components/ObjectifHistorySelector";

// Clé localStorage pour l'historique des objectifs par athlète
const OBJECTIF_HISTORY_KEY = "tfcl-objectif-history";

export default function AthleteEditPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { athletes, currentAthlete, addAthlete, updateAthlete, setSelectedAthleteId } = useAthletes();

  const isNew = id === "new";
  const editingAthlete = isNew ? null : athletes.find((a) => a.id === id) || currentAthlete;

  const [nom, setNom] = useState(editingAthlete?.nom || "");
  const [sexe, setSexe] = useState<SexeType>(editingAthlete?.sexe || "M");
  const [objectif, setObjectif] = useState<ObjectifType>(editingAthlete?.objectif || "IM");
  const [ambition, setAmbition] = useState<AmbitionLevel>(editingAthlete?.ambition || DEFAULT_AMBITION);
  const [dateNaissance, setDateNaissance] = useState(editingAthlete?.dateNaissance || "");
  const [masseGrasse, setMasseGrasse] = useState(
    editingAthlete?.masse_grasse == null ? "" : String(editingAthlete.masse_grasse),
  );
  
  // Historique des objectifs précédents pour cet athlète
  const [objectifHistory, setObjectifHistory] = useState<ObjectifType[]>([]);
  
  // Charger l'historique des objectifs au montage
  useEffect(() => {
    if (!editingAthlete?.id) return;
    try {
      const stored = localStorage.getItem(OBJECTIF_HISTORY_KEY);
      if (stored) {
        const allHistory = JSON.parse(stored) as Record<string, ObjectifType[]>;
        setObjectifHistory(allHistory[editingAthlete.id] || []);
      }
    } catch {
      // Ignore parsing errors
    }
  }, [editingAthlete?.id]);
  
  // Sauvegarder l'historique quand l'objectif change
  const handleObjectifChange = (newObjectif: ObjectifType) => {
    const oldObjectif = objectif;
    setObjectif(newObjectif);
    
    // Ajouter l'ancien objectif à l'historique (s'il est différent du nouveau)
    if (oldObjectif && oldObjectif !== newObjectif && editingAthlete?.id) {
      const newHistory = [oldObjectif, ...objectifHistory.filter(o => o !== oldObjectif)].slice(0, 5);
      setObjectifHistory(newHistory);
      
      // Persister dans localStorage
      try {
        const stored = localStorage.getItem(OBJECTIF_HISTORY_KEY);
        const allHistory = stored ? JSON.parse(stored) : {};
        allHistory[editingAthlete.id] = newHistory;
        localStorage.setItem(OBJECTIF_HISTORY_KEY, JSON.stringify(allHistory));
      } catch {
        // Ignore storage errors
      }
    }
  };
  
  // Calcul de l'âge et de l'AAI pour affichage informatif
  const age = calculateAge(dateNaissance);
  const ageIndex = computeAgeAdjustmentIndex(age);
  const ambitionDef = getAmbitionDefinition(ambition);

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
      ambition,
      masse_grasse: masseGrasse.trim() === "" ? null : Number(masseGrasse),
      dateNaissance: dateNaissance || undefined,
      refs: {
        ...(editingAthlete?.refs || {}),
        sexe,
        masse_grasse: masseGrasse.trim() === "" ? null : Number(masseGrasse),
      },
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
              <Input id="nom" placeholder="Nom de l'athlète" value={nom} onChange={(e) => setNom(e.target.value)} />
            </div>

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

            {/* Objectif avec historique */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Objectif
              </Label>
              <ObjectifHistorySelector
                currentObjectif={objectif}
                previousObjectifs={objectifHistory}
                onObjectifChange={handleObjectifChange}
                showHistory={!isNew}
              />
              {!isNew && objectifHistory.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Vous pouvez restaurer un objectif précédent via l'historique ci-dessus.
                </p>
              )}
            </div>

            {/* Niveau d'ambition */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  Niveau d'ambition
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="p-1 rounded-full hover:bg-muted transition-colors">
                      <Info className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="start">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Seuils adaptatifs</h4>
                      <p className="text-xs text-muted-foreground">
                        Les cibles VLamax, TTE et FTP/kg sont ajustées selon votre niveau d'ambition.
                        Un "Finisher" aura des seuils plus souples qu'un "Elite" visant une qualification.
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <Select value={ambition} onValueChange={(v) => setAmbition(v as AmbitionLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AMBITION_LEVELS_ORDERED.map((level) => {
                    const def = AMBITION_DEFINITIONS[level];
                    return (
                      <SelectItem key={level} value={level}>
                        <span className="flex items-center gap-2">
                          <span>{def.icon}</span>
                          <span>{def.label}</span>
                          <span className="text-xs text-muted-foreground">– {def.description}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className={ambitionDef.color}>{ambitionDef.icon}</span>
                {ambitionDef.description}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="dateNaissance" className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Date de naissance
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="p-1 rounded-full hover:bg-muted transition-colors">
                      <Info className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" align="start">
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">{AGE_METHODOLOGY.title}</h4>
                      <p className="text-xs text-muted-foreground">{AGE_METHODOLOGY.mainText}</p>
                      <p className="text-xs text-muted-foreground italic">{AGE_METHODOLOGY.staffNote}</p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <Input
                id="dateNaissance"
                type="date"
                value={dateNaissance}
                onChange={(e) => setDateNaissance(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
              {age !== null && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{age} ans</span>
                  <Badge variant={ageIndex.category === "young" ? "default" : ageIndex.category === "prime" ? "secondary" : "outline"}>
                    {ageIndex.label}
                  </Badge>
                </div>
              )}
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
