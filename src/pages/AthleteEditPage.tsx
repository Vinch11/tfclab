// =============================================
// ÉCRAN 2 - PROFIL ATHLÈTE (Création/Édition)
// =============================================

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, ArrowRight, User, Calendar, Info, Target, FlaskConical } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useAthletes } from "@/contexts/AthleteContext";
import { Athlete, ObjectifType, SexeType, AmbitionLevel } from "@/types/athlete";
import { toast } from "sonner";
import { calculateAge, computeAgeAdjustmentIndex, AGE_METHODOLOGY } from "@/lib/ageAdjustment";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { AMBITION_DEFINITIONS, AMBITION_LEVELS_ORDERED, DEFAULT_AMBITION, getAmbitionDefinition, getRunningTimeHint, isRunningObjectiveWithTimes } from "@/types/ambitionLevel";
import { AthleteObjectiveManager } from "@/components/AthleteObjectiveManager";
import { useAthleteRaceGoals } from "@/hooks/useAthleteRaceGoals";
import { QuickRaceTimeCard } from "@/components/QuickRaceTimeCard";
import { ProfileChoiceDialog } from "@/components/ProfileChoiceDialog";

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

  // F8 — Profil ergogénique
  const [hasRepeatedEfforts, setHasRepeatedEfforts] = useState<boolean>(
    Boolean(editingAthlete?.refs?.hasRepeatedEfforts),
  );
  const [bicarbTested, setBicarbTested] = useState<boolean>(
    Boolean(editingAthlete?.refs?.bicarbTested),
  );
  const [vegetarian, setVegetarian] = useState<boolean>(
    Boolean(editingAthlete?.refs?.vegetarian),
  );
  
  // Cloud-based race goals
  const { 
    raceGoals, 
    addRaceGoal, 
    deleteRaceGoal, 
    updateAthleteGoal,
    restoreRaceGoal,
    updateRaceGoalDate,
    loading: goalsLoading 
  } = useAthleteRaceGoals(editingAthlete?.id ?? null);
  
  // Handle objective change (updates athlete goal + local state)
  const handleObjectifChange = async (newObjectif: ObjectifType) => {
    setObjectif(newObjectif);
    if (editingAthlete?.id) {
      await updateAthleteGoal(newObjectif);
    }
  };
  
  // Handle adding a new race goal
  const handleAddRaceGoal = async (goal: {
    athlete_id: string;
    race_type: string;
    race_name: string | null;
    race_date: string;
    plan_start_date: string | null;
  }) => {
    if (!editingAthlete?.id) return;
    await addRaceGoal({
      athlete_id: editingAthlete.id,
      race_type: goal.race_type,
      race_name: goal.race_name,
      race_date: goal.race_date,
      plan_start_date: goal.plan_start_date,
    });
  };
  
  // Handle restoring a race goal
  const handleRestoreRaceGoal = async (goal: any) => {
    await restoreRaceGoal(goal);
    setObjectif(goal.race_type as ObjectifType);
  };
  
  // Calcul de l'âge et de l'AAI pour affichage informatif
  const age = calculateAge(dateNaissance);
  const ageIndex = computeAgeAdjustmentIndex(age);
  const ambitionDef = getAmbitionDefinition(ambition);

  const [profileChoiceOpen, setProfileChoiceOpen] = useState(false);
  const [profileChoiceAthlete, setProfileChoiceAthlete] = useState<{ id: string; nom: string } | null>(null);

  const handleSave = async (opts?: { skipChoiceDialog?: boolean }) => {
    if (!nom.trim()) {
      toast.error("Le nom est requis");
      return false;
    }

    const fatPctValue = masseGrasse.trim() === "" ? null : Number(masseGrasse);
    const athleteData: Athlete = {
      id: isNew ? crypto.randomUUID() : editingAthlete?.id || crypto.randomUUID(),
      nom: nom.trim(),
      sexe,
      objectif,
      ambition,
      masse_grasse: fatPctValue,
      dateNaissance: dateNaissance || undefined,
      refs: {
        ...(editingAthlete?.refs || {}),
        sexe,
        fatPct: fatPctValue, // ✅ FIX: Clé canonique pour effectiveRefs
        masse_grasse: fatPctValue, // Legacy compat
        // F8 — Profil ergogénique
        hasRepeatedEfforts,
        bicarbTested,
        vegetarian,
      },
      historique: editingAthlete?.historique || [],
    };

    try {
      if (isNew) {
        await addAthlete(athleteData);
        toast.success("Athlète créé");
      } else {
        await updateAthlete(athleteData);
        toast.success("Profil mis à jour");
      }
      setSelectedAthleteId(athleteData.id);
      // Étape finale "Choix du profil" à la création
      if (isNew && !opts?.skipChoiceDialog) {
        setProfileChoiceAthlete({ id: athleteData.id, nom: athleteData.nom });
        setProfileChoiceOpen(true);
      }
      return true;
    } catch (e) {
      console.error("Erreur sauvegarde athlète:", e);
      toast.error("Erreur lors de la sauvegarde");
      return false;
    }
  };

  const handleSaveAndContinue = async () => {
    const ok = await handleSave({ skipChoiceDialog: true });
    if (ok) navigate("/diagnostic");
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

            {/* Objectif avec historique Cloud */}
            {!isNew && editingAthlete?.id ? (
              <AthleteObjectiveManager
                athleteId={editingAthlete.id}
                currentGoal={objectif}
                raceGoals={raceGoals}
                onGoalChange={handleObjectifChange}
                onAddRaceGoal={handleAddRaceGoal}
                onDeleteRaceGoal={deleteRaceGoal}
                onRestoreRaceGoal={handleRestoreRaceGoal}
                onUpdateRaceGoalDate={updateRaceGoalDate}
                loading={goalsLoading}
              />
            ) : (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Objectif
                </Label>
                <Select value={objectif} onValueChange={(v) => setObjectif(v as ObjectifType)}>
                  <SelectTrigger>
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
            )}

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
                      <h4 className="font-medium text-sm">Parcours athlète — 5 paliers</h4>
                      <p className="text-xs text-muted-foreground">
                        Ancrés sur les percentiles de catégorie d'âge (AG) :
                      </p>
                      <ul className="text-xs text-muted-foreground space-y-1 list-none">
                        <li>🌱 <b>Découverte</b> — Finisher dans les temps officiels</li>
                        <li>🎯 <b>Confirmé</b> — Top 50% AG</li>
                        <li>🏆 <b>Compétiteur</b> — Top 25% AG, podium local</li>
                        <li>🎟️ <b>Qualifiable</b> — Top 10% AG, slot National/Européen</li>
                        <li>👑 <b>Elite</b> — Top 3% AG, slot Mondial / podium overall</li>
                      </ul>
                      <p className="text-xs text-muted-foreground pt-1 border-t">
                        Les cibles VLamax, VO2max, FTP/kg, TTE et W' sont ajustées en conséquence — un palier plus élevé impose des seuils plus stricts.
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
                    const timeHint = getRunningTimeHint(objectif, level, sexe === "F" ? "F" : "M");
                    return (
                      <SelectItem key={level} value={level}>
                        <span className="flex items-center gap-2">
                          <span>{def.icon}</span>
                          <span>{def.label}</span>
                          {timeHint ? (
                            <span className="text-xs text-muted-foreground">– {timeHint}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">– {def.description}</span>
                          )}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className={ambitionDef.color}>{ambitionDef.icon}</span>
                {(() => {
                  const hint = getRunningTimeHint(objectif, ambition, sexe === "F" ? "F" : "M");
                  return hint 
                    ? <>{ambitionDef.description} — <span className="font-medium">{hint}</span></>
                    : ambitionDef.description;
                })()}
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

        {/* Saisie rapide chrono — alimente durabilité, économie CAP, calibration MLSS */}
        {!isNew && editingAthlete?.id && (
          <QuickRaceTimeCard athleteId={editingAthlete.id} />
        )}

        {/* F8 — Profil ergogénique */}
        <Card>

          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              Profil ergogénique
            </CardTitle>
            <CardDescription>
              3 questions rapides pour personnaliser les recommandations de suppléments (caféine, bicarbonate, créatine, beta-alanine, nitrates).
              Répondez par <strong>Oui</strong> ou <strong>Non</strong> — en cas de doute, laissez sur Non.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="repeated-efforts" className="text-base">
                  1. Votre course comporte-t-elle des efforts courts et intenses&nbsp;?
                </Label>
                <p className="text-xs text-muted-foreground">
                  Exemples&nbsp;: sprints, relances, attaques, côtes raides &lt; 2 min, finish rapide.
                  <br />
                  <span className="italic">Si oui → on active créatine + beta-alanine dans le stack.</span>
                </p>
              </div>
              <Switch
                id="repeated-efforts"
                checked={hasRepeatedEfforts}
                onCheckedChange={setHasRepeatedEfforts}
              />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="bicarb-tested" className="text-base">
                  2. Avez-vous déjà testé le bicarbonate de sodium à l'entraînement&nbsp;?
                </Label>
                <p className="text-xs text-muted-foreground">
                  Prise de NaHCO₃ (ex&nbsp;: Maurten Bicarb System, gélules) avant une séance, sans troubles digestifs.
                  <br />
                  <span className="italic">Si non → on ne le recommandera pas en course (risque GI inconnu).</span>
                </p>
              </div>
              <Switch
                id="bicarb-tested"
                checked={bicarbTested}
                onCheckedChange={setBicarbTested}
              />
            </div>

            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="vegetarian" className="text-base">
                  3. Suivez-vous un régime végétarien ou vegan&nbsp;?
                </Label>
                <p className="text-xs text-muted-foreground">
                  Pas (ou très peu) de viande / poisson au quotidien.
                  <br />
                  <span className="italic">Si oui → la créatine apporte un gain plus important (+20 % typiquement).</span>
                </p>
              </div>
              <Switch
                id="vegetarian"
                checked={vegetarian}
                onCheckedChange={setVegetarian}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3">
          <Button onClick={() => handleSave()} variant="outline" className="gap-2">
            <Save className="h-4 w-4" />
            Sauvegarder
          </Button>
          <Button onClick={handleSaveAndContinue} className="gap-2">
            <ArrowRight className="h-4 w-4" />
            Sauvegarder et ajouter données
          </Button>
        </div>
      </div>

      <ProfileChoiceDialog
        open={profileChoiceOpen}
        onOpenChange={setProfileChoiceOpen}
        athleteId={profileChoiceAthlete?.id ?? null}
        athleteName={profileChoiceAthlete?.nom}
      />
    </AppLayout>
  );
}
