import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { CoachingCompassInput } from "@/lib/coachingCompass";
import { CoachingCompassCard } from "@/components/CoachingCompassCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Save, Target, Scale, Activity, Percent, Camera, Info, Loader2, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Athlete, ObjectifType, SexeType, getObjectifLabel, getDernierSnapshot } from "@/types/athlete";
import { SnapshotNolio, scoreConfiance, estimerTTE } from "@/types/snapshotNolio";
import type { VLamaxEffectif } from "@/engines/diagnostic";
import type { TTEEffectif } from "@/engines/diagnostic";
import { toast } from "sonner";
import { getAmbitionDefinition, DEFAULT_AMBITION, getAthleteAmbition } from "@/types/ambitionLevel";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AthleteObjectiveManager } from "./AthleteObjectiveManager";
import { ObjectivesTimeline } from "./ObjectivesTimeline";
import { useAthleteRaceGoals, type RaceGoal } from "@/hooks/useAthleteRaceGoals";

interface AthleteProfileProps {
  athlete: Athlete;
  athleteId?: string; // Cloud ID for race goals
  onUpdate: (athlete: Athlete) => void;
  // ✅ Callback pour sauvegarde cloud des données athlète
  onSaveToCloud?: (data: { name?: string; goal?: string; sex?: string }) => Promise<void>;
  // ✅ Callback pour sauvegarde cloud de la masse grasse
  onUpdateMasseGrasse?: (masseGrasse: number | null) => Promise<void>;
  // ✅ fat_pct du dernier snapshot cloud (lecture seule)
  snapshotFatPct?: number | null;
  // ✅ Callback pour ouvrir le SnapshotManager Cloud
  onOpenSnapshots?: () => void;
  // ✅ VLamax et TTE effectifs (source unique de vérité)
  vlamaxEffectif?: VLamaxEffectif;
  tteEffectif?: TTEEffectif;
  // ✅ Option d'afficher le gestionnaire d'objectifs complet
  showObjectiveManager?: boolean;
  // ✅ Input Compass optionnel (si fourni, affiche le Compass)
  compassInput?: CoachingCompassInput;
  staffMode?: boolean;
}

export function AthleteProfile({ 
  athlete, 
  athleteId,
  onUpdate, 
  onSaveToCloud, 
  onUpdateMasseGrasse, 
  snapshotFatPct, 
  onOpenSnapshots, 
  vlamaxEffectif, 
  tteEffectif,
  showObjectiveManager = false,
  compassInput,
  staffMode = false,
}: AthleteProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Athlete>(athlete);
  const [isSaving, setIsSaving] = useState(false);
  const [isObjectivesExpanded, setIsObjectivesExpanded] = useState(false);

  // Race goals hook (only if athleteId provided)
  const {
    raceGoals,
    addRaceGoal,
    deleteRaceGoal,
    updateAthleteGoal,
    restoreRaceGoal,
    loading: raceGoalsLoading,
  } = useAthleteRaceGoals(athleteId ?? null);

  // Synchroniser formData avec athlete quand il change
  useEffect(() => {
    setFormData(athlete);
  }, [athlete]);

  const snapshot = getDernierSnapshot(athlete);
  // ✅ Utiliser VLamax/TTE effectifs en priorité, sinon calcul legacy
  const vlamax = vlamaxEffectif?.value ?? 0;
  const tte = tteEffectif?.tte_min ?? (snapshot ? estimerTTE(snapshot.ftp, snapshot.tss_7j) : 0);
  const confiance = vlamaxEffectif?.confidence ?? (snapshot ? scoreConfiance(snapshot) / 100 : 0);

  // Handle goal change with cloud sync
  const handleGoalChange = async (goal: ObjectifType) => {
    if (onSaveToCloud) {
      await onSaveToCloud({ goal });
    }
    if (athleteId) {
      await updateAthleteGoal(goal);
    }
    onUpdate({ ...athlete, objectif: goal, updatedAt: new Date().toISOString() });
  };

  // Handle add race goal
  const handleAddRaceGoal = async (input: Omit<RaceGoal, 'id' | 'coach_id' | 'created_at' | 'updated_at'>) => {
    await addRaceGoal(input);
  };

  // Handle restore race goal
  const handleRestoreRaceGoal = async (goal: RaceGoal) => {
    await restoreRaceGoal(goal);
    onUpdate({ ...athlete, objectif: goal.race_type as ObjectifType, updatedAt: new Date().toISOString() });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // ✅ Sauvegarder dans le cloud
      if (onSaveToCloud) {
        await onSaveToCloud({
          name: formData.nom,
          goal: formData.objectif,
          sex: formData.sexe,
        });
      }
      
      // ✅ Sauvegarder masse grasse dans le cloud
      if (onUpdateMasseGrasse) {
        const valueToSave = formData.masse_grasse !== undefined && formData.masse_grasse !== 0 
          ? formData.masse_grasse 
          : null;
        await onUpdateMasseGrasse(valueToSave);
      }
      
      onUpdate({ ...formData, updatedAt: new Date().toISOString() });
      setIsEditing(false);
      toast.success("Profil enregistré");
    } catch (error) {
      console.error("Erreur sauvegarde profil:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof Athlete, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">Profil Athlète</h2>
            <p className="text-sm text-muted-foreground">Données physiologiques</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Mini Rapport — pré-rempli depuis l'athlète + dernier snapshot */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const params = new URLSearchParams();
              const a: any = athlete;
              const s: any = snapshot || {};
              if (a.nom) params.set("name", a.nom);
              // Âge : champ direct sinon calculé depuis birth_date
              let age: number | undefined = a.age;
              if (!age && a.birth_date) {
                const bd = new Date(a.birth_date);
                if (!isNaN(bd.getTime())) {
                  const diff = Date.now() - bd.getTime();
                  age = Math.floor(diff / (365.25 * 24 * 3600 * 1000));
                }
              }
              if (age) params.set("age", String(age));
              if (a.sexe || a.sex) params.set("sex", a.sexe || a.sex);
              if (s.vma) params.set("vma", String(s.vma));
              // Sprint 15s : distance en mètres (depuis snapshot cloud si dispo)
              const sprint = s.sprint_15s_distance ?? s.sprint_15s_m ?? s.distSprint1;
              if (sprint) params.set("sprint", String(Math.round(sprint)));
              window.open(`/mini-rapport?${params.toString()}`, "_blank");
            }}
          >
            <FileText className="w-4 h-4 mr-2" />
            Générer mon mini rapport
          </Button>
          {/* ✅ Bouton unique pour gérer les snapshots (Cloud) */}
          {onOpenSnapshots && (
            <Button variant="outline" size="sm" onClick={onOpenSnapshots}>
              <Camera className="w-4 h-4 mr-2" />
              Gérer Snapshots
            </Button>
          )}
          <Button
            variant={isEditing ? "glow" : "outline"}
            size="sm"
            onClick={isEditing ? handleSave : () => setIsEditing(true)}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : isEditing ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer
              </>
            ) : (
              "Modifier"
            )}
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-6">
          {/* Name & Basic Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nom" className="text-muted-foreground">Nom</Label>
              <Input
                id="nom"
                value={formData.nom || ""}
                onChange={(e) => handleInputChange("nom", e.target.value)}
                className="bg-secondary/50 border-border focus:border-primary"
                placeholder="Nom de l'athlète"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Sexe</Label>
              <div className="flex gap-2">
                {(["M", "F"] as SexeType[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleInputChange("sexe", s)}
                    className={cn(
                      "flex-1 py-2 px-4 rounded-lg border transition-all duration-200",
                      formData.sexe === s
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"
                    )}
                  >
                    {s === "M" ? "Homme" : "Femme"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Objectif</Label>
              <div className="flex gap-2">
                {(["IM", "703"] as ObjectifType[]).map((obj) => (
                  <button
                    key={obj}
                    type="button"
                    onClick={() => handleInputChange("objectif", obj)}
                    className={cn(
                      "flex-1 py-2 px-4 rounded-lg border transition-all duration-200 text-sm",
                      formData.objectif === obj
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border bg-secondary/30 text-muted-foreground hover:border-accent/50"
                    )}
                  >
                    {obj === "IM" ? "Ironman" : "70.3"}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Masse grasse - FIX 6: Édition avec sauvegarde cloud */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="masse_grasse" className="text-muted-foreground">Masse grasse profil (%)</Label>
              <Input
                id="masse_grasse"
                type="number"
                min={3}
                max={45}
                step={0.1}
                value={formData.masse_grasse !== undefined ? formData.masse_grasse : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  // Si vide -> undefined (pas de valeur par défaut)
                  handleInputChange("masse_grasse", val === "" ? undefined as any : parseFloat(val));
                }}
                className="bg-secondary/50 border-border focus:border-primary"
                placeholder="ex: 14"
              />
              <p className="text-xs text-muted-foreground">
                Laissez vide si non mesuré
              </p>
            </div>
            
            {/* Affichage fat_pct du dernier snapshot (lecture seule) */}
            {snapshotFatPct !== undefined && snapshotFatPct !== null && (
              <div className="space-y-2">
                <Label className="text-muted-foreground flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  Dernier snapshot
                </Label>
                <div className="py-2 px-3 rounded-lg bg-secondary/30 border border-border">
                  <span className="text-lg font-mono text-warning">{snapshotFatPct}%</span>
                  <span className="text-xs text-muted-foreground ml-2">(lecture seule)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Profile Display */}
          <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 border border-border">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl font-bold text-primary-foreground">
              {formData.nom?.[0] || formData.sexe}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {formData.nom || "Athlète"}
              </h3>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-sm text-muted-foreground">{formData.sexe === "M" ? "Homme" : "Femme"}</span>
                <span className="text-sm px-2 py-0.5 rounded-full bg-accent/10 text-accent">
                  {getObjectifLabel(formData.objectif)}
                </span>
                {/* Badge d'ambition */}
                {(() => {
                  const ambDef = getAmbitionDefinition(getAthleteAmbition(athlete));
                  return (
                    <span className={cn(
                      "text-sm px-2 py-0.5 rounded-full bg-secondary/50 flex items-center gap-1",
                      ambDef.color
                    )}>
                      <span>{ambDef.icon}</span>
                      <span>{ambDef.label}</span>
                    </span>
                  );
                })()}
                <span className="text-sm px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  {athlete.historique?.length || 0} snapshots
                </span>
              </div>
            </div>
          </div>

          {/* Stats Grid from Latest Snapshot */}
          {snapshot ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="p-4 rounded-xl bg-secondary/20 border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Scale className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider">Poids</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-foreground">{snapshot.poids}<span className="text-sm text-muted-foreground ml-1">kg</span></p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/20 border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider">FTP</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-primary">{snapshot.ftp}<span className="text-sm text-muted-foreground ml-1">W</span></p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/20 border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider">VO2max</span>
                  </div>
                  <p className="text-2xl font-bold font-mono text-success">{snapshot.vo2max || "—"}<span className="text-sm text-muted-foreground ml-1">ml/kg</span></p>
                </div>
                <div className="p-4 rounded-xl bg-secondary/20 border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Percent className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider">Masse grasse</span>
                  </div>
                  {/* FIX: Afficher snapshot fat_pct en priorité, sinon profil masse_grasse */}
                  <p className="text-2xl font-bold font-mono text-warning">
                    {snapshotFatPct !== undefined && snapshotFatPct !== null 
                      ? snapshotFatPct
                      : formData.masse_grasse !== undefined && formData.masse_grasse !== null 
                        ? formData.masse_grasse 
                        : "—"}
                    <span className="text-sm text-muted-foreground ml-1">%</span>
                  </p>
                  {/* Afficher la source */}
                  {(snapshotFatPct !== undefined && snapshotFatPct !== null) ? (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Source: Snapshot
                    </p>
                  ) : formData.masse_grasse !== undefined && formData.masse_grasse !== null ? (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Source: Profil
                    </p>
                  ) : null}
                </div>
                <div className="p-4 rounded-xl bg-secondary/20 border border-border">
                  <div className="flex items-center gap-2 text-muted-foreground mb-2">
                    <Target className="w-4 h-4" />
                    <span className="text-xs uppercase tracking-wider">VLamax</span>
                    {vlamaxEffectif?.source && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        {vlamaxEffectif.source}
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-bold font-mono text-accent">{vlamax.toFixed(2)}<span className="text-sm text-muted-foreground ml-1">mmol/L/s</span></p>
                </div>
              </div>

              {/* W/kg Display */}
              {snapshot.ftp && snapshot.poids > 0 && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Ratio Puissance/Poids</p>
                      <p className="text-3xl font-bold font-mono text-foreground">
                        {(snapshot.ftp / snapshot.poids).toFixed(2)}
                        <span className="text-lg text-muted-foreground ml-2">W/kg</span>
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">TTE {tteEffectif?.source ? `(${tteEffectif.source})` : "Estimé"}</p>
                      <p className="text-2xl font-bold font-mono text-primary">{tte}<span className="text-sm text-muted-foreground ml-1">min</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Source VLamax</p>
                      <p className="text-lg font-medium text-foreground">{vlamaxEffectif?.source === "test" ? "🧪 Test" : vlamaxEffectif?.source === "snapshot" ? "📋 Snapshot" : "📐 Estimation"}</p>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-muted-foreground bg-secondary/20 rounded-xl border border-border">
              <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Aucun snapshot disponible</p>
              <p className="text-sm">Créez un snapshot pour voir les métriques</p>
              {onOpenSnapshots && (
                <Button variant="outline" size="sm" className="mt-4" onClick={onOpenSnapshots}>
                  <Camera className="w-4 h-4 mr-2" />
                  Créer un snapshot
                </Button>
              )}
            </div>
          )}
          
          {/* ✅ TFCL Coaching Compass™ — Centre décisionnel */}
          {compassInput && (
            <div className="mt-4">
              <CoachingCompassCard input={compassInput} staffMode={staffMode} />
            </div>
          )}
          
          {/* ✅ Timeline des objectifs (si showObjectiveManager activé) */}
          {showObjectiveManager && athleteId && (
            <Collapsible open={isObjectivesExpanded} onOpenChange={setIsObjectivesExpanded}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between mt-4 text-muted-foreground hover:text-foreground"
                >
                  <span className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    <span>Historique des objectifs</span>
                    {raceGoals.length > 0 && (
                      <Badge variant="secondary" className="text-xs ml-1">
                        {raceGoals.length}
                      </Badge>
                    )}
                  </span>
                  {isObjectivesExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-4">
                <ObjectivesTimeline
                  raceGoals={raceGoals}
                  currentGoal={formData.objectif}
                  onRestoreGoal={handleRestoreRaceGoal}
                  onDeleteGoal={deleteRaceGoal}
                />
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  );
}
