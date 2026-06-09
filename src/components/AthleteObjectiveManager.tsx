/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ATHLETE OBJECTIVE MANAGER — Gestion complète des objectifs
 * 
 * Permet de:
 * - Modifier l'objectif actuel de l'athlète
 * - Voir l'historique des objectifs (avec dates)
 * - Restaurer un ancien objectif
 * - Supprimer un objectif en cas d'erreur
 * - Persister dans Cloud via athlete_race_goals
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { 
  Target, 
  History, 
  Plus, 
  RotateCcw, 
  Trash2, 
  CalendarIcon, 
  ChevronDown, 
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  Edit2,
  Save,
  Loader2,
  Cloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ObjectifType, getObjectifLabel } from "@/types/athlete";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface RaceGoal {
  id: string;
  athlete_id: string;
  coach_id: string;
  race_type: string;
  race_name: string | null;
  race_date: string;
  race_format: 'continuous' | 'lcw_3day' | null;
  plan_start_date: string | null;
  created_at: string;
  updated_at: string;
}

interface AthleteObjectiveManagerProps {
  athleteId: string;
  currentGoal: ObjectifType | string | null;
  raceGoals: RaceGoal[];
  onGoalChange: (goal: ObjectifType) => Promise<void>;
  onAddRaceGoal: (goal: Omit<RaceGoal, 'id' | 'coach_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onDeleteRaceGoal: (goalId: string) => Promise<boolean | void>;
  onRestoreRaceGoal: (goal: RaceGoal) => Promise<boolean | void>;
  onUpdateRaceGoalDate?: (goalId: string, newDate: string) => Promise<void>;
  loading?: boolean;
  compact?: boolean; // Mode compact pour le dashboard
  className?: string;
}


// Tous les objectifs disponibles groupés par catégorie
const OBJECTIF_GROUPS = {
  triathlon: {
    label: "🏊 Triathlon",
    icon: "🏊",
    options: [
      { value: "IM", label: "Ironman", distance: "3.8km / 180km / 42.2km" },
      { value: "703", label: "70.3 (Half Ironman)", distance: "1.9km / 90km / 21.1km" },
    ],
  },
  running: {
    label: "🏃 Course à pied",
    icon: "🏃",
    options: [
      { value: "Marathon", label: "Marathon", distance: "42.195km" },
      { value: "Semi", label: "Semi-Marathon", distance: "21.1km" },
      { value: "10K", label: "10K", distance: "10km" },
      { value: "5K", label: "5K", distance: "5km" },
    ],
  },
  trail: {
    label: "⛰️ Trail",
    icon: "⛰️",
    options: [
      { value: "TrailShort", label: "Trail Court", distance: "< 42km" },
      { value: "TrailMountain", label: "Trail Montagne", distance: "42-80km" },
      { value: "TrailUltra", label: "Ultra Trail", distance: "> 80km" },
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function AthleteObjectiveManager({
  athleteId,
  currentGoal,
  raceGoals,
  onGoalChange,
  onAddRaceGoal,
  onDeleteRaceGoal,
  onRestoreRaceGoal,
  onUpdateRaceGoalDate,
  loading = false,
  compact = false,
  className,
}: AthleteObjectiveManagerProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingDateGoalId, setEditingDateGoalId] = useState<string | null>(null);
  const [editDate, setEditDate] = useState<Date | undefined>(undefined);
  
  // New goal form state
  const [newGoalType, setNewGoalType] = useState<string>("");
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalDate, setNewGoalDate] = useState<Date | undefined>(undefined);
  const [newPlanStartDate, setNewPlanStartDate] = useState<Date | undefined>(undefined);
  const [newGoalFormat, setNewGoalFormat] = useState<"continuous" | "lcw_3day">("continuous");

  // Sort race goals by date (most recent first)
  const sortedRaceGoals = useMemo(() => {
    return [...raceGoals].sort((a, b) => 
      new Date(b.race_date).getTime() - new Date(a.race_date).getTime()
    );
  }, [raceGoals]);

  // Get next upcoming race
  const nextRace = useMemo(() => {
    const now = new Date();
    const futureRaces = raceGoals
      .filter(g => new Date(g.race_date) >= now)
      .sort((a, b) => new Date(a.race_date).getTime() - new Date(b.race_date).getTime());
    return futureRaces[0] || null;
  }, [raceGoals]);

  // Days & weeks remaining to next race
  const daysRemaining = useMemo(() => {
    if (!nextRace) return null;
    const diff = Math.ceil((new Date(nextRace.race_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 ? diff : null;
  }, [nextRace]);

  const weeksRemaining = useMemo(() => {
    if (daysRemaining === null) return null;
    return Math.floor(daysRemaining / 7);
  }, [daysRemaining]);

  const countdownLabel = daysRemaining !== null
    ? weeksRemaining && weeksRemaining > 0
      ? `J-${daysRemaining} • ${weeksRemaining} sem.`
      : `J-${daysRemaining}`
    : null;


  // Get current goal info
  const currentGoalInfo = useMemo(() => {
    for (const group of Object.values(OBJECTIF_GROUPS)) {
      const found = group.options.find(o => o.value === currentGoal);
      if (found) return { ...found, group: group.label };
    }
    return null;
  }, [currentGoal]);

  // Check if a goal is in the past
  const isGoalPast = (dateStr: string) => {
    return new Date(dateStr) < new Date();
  };

  // Handle quick goal change
  const handleQuickGoalChange = async (goal: string) => {
    setSaving(true);
    try {
      await onGoalChange(goal as ObjectifType);
      setIsEditing(false);
      toast.success(`Objectif changé: ${getObjectifLabel(goal as ObjectifType)}`);
    } catch (error) {
      toast.error("Erreur lors du changement d'objectif");
    } finally {
      setSaving(false);
    }
  };

  // Handle add new race goal
  const handleAddRaceGoal = async () => {
    if (!newGoalType || !newGoalDate) {
      toast.error("Veuillez sélectionner un type et une date");
      return;
    }

    setSaving(true);
    try {
      await onAddRaceGoal({
        athlete_id: athleteId,
        race_type: newGoalType,
        race_name: newGoalName || null,
        race_date: format(newGoalDate, 'yyyy-MM-dd'),
        race_format: newGoalType === "70.3" ? newGoalFormat : "continuous",
        plan_start_date: newPlanStartDate ? format(newPlanStartDate, 'yyyy-MM-dd') : null,
      });
      
      // Also update current goal
      await onGoalChange(newGoalType as ObjectifType);
      
      // Reset form
      setNewGoalType("");
      setNewGoalName("");
      setNewGoalDate(undefined);
      setNewPlanStartDate(undefined);
      setNewGoalFormat("continuous");
      setIsAddDialogOpen(false);
      
      toast.success("Objectif ajouté avec succès");
    } catch (error) {
      toast.error("Erreur lors de l'ajout de l'objectif");
    } finally {
      setSaving(false);
    }
  };

  // Handle restore race goal
  const handleRestore = async (goal: RaceGoal) => {
    setSaving(true);
    try {
      await onRestoreRaceGoal(goal);
      toast.success(`Objectif restauré: ${getObjectifLabel(goal.race_type as ObjectifType)}`);
    } catch (error) {
      toast.error("Erreur lors de la restauration");
    } finally {
      setSaving(false);
    }
  };

  // Handle delete race goal
  const handleDelete = async (goalId: string) => {
    setSaving(true);
    try {
      await onDeleteRaceGoal(goalId);
      toast.success("Objectif supprimé");
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    } finally {
      setSaving(false);
    }
  };

  // Handle update race goal date
  const handleUpdateDate = async (goalId: string) => {
    if (!editDate || !onUpdateRaceGoalDate) return;
    setSaving(true);
    try {
      await onUpdateRaceGoalDate(goalId, format(editDate, 'yyyy-MM-dd'));
      setEditingDateGoalId(null);
      setEditDate(undefined);
      toast.success("Date mise à jour");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour de la date");
    } finally {
      setSaving(false);
    }
  };

  // Compact mode - single row with essential info
  if (compact) {
    return (
      <Card className={cn("border-primary/20", className)}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Left: Current goal + next race */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary shrink-0" />
                <span className="font-semibold text-foreground">
                  {currentGoalInfo?.label || getObjectifLabel(currentGoal as ObjectifType) || "Non défini"}
                </span>
              </div>
              
              {/* Next race indicator */}
              {nextRace && daysRemaining !== null && (
                <div className={cn(
                  "flex items-center gap-2 px-2.5 py-1 rounded-full text-xs border",
                  daysRemaining <= 7 ? "bg-red-500/10 border-red-500/30 text-red-600" :
                  daysRemaining <= 30 ? "bg-amber-500/10 border-amber-500/30 text-amber-600" :
                  daysRemaining <= 60 ? "bg-blue-500/10 border-blue-500/30 text-blue-600" :
                  "bg-emerald-500/10 border-emerald-500/30 text-emerald-600"
                )}>
                  <CalendarIcon className="h-3 w-3" />
                  <span className="font-semibold">J-{daysRemaining}</span>
                  {nextRace.race_name && (
                    <span className="text-muted-foreground truncate max-w-[100px]" title={nextRace.race_name}>
                      {nextRace.race_name}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                disabled={saving}
                className="h-7 px-2 text-xs"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Modifier
              </Button>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={saving} className="h-7 px-2 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Ajouter
                  </Button>
                </DialogTrigger>
                {/* Dialog content is the same */}
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      Ajouter un nouvel objectif
                    </DialogTitle>
                    <DialogDescription>
                      Définissez un nouvel objectif de course pour cet athlète
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Type de course *</Label>
                      <Select value={newGoalType} onValueChange={setNewGoalType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un type" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(OBJECTIF_GROUPS).map(([key, group]) => (
                            <div key={key}>
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                {group.label}
                              </div>
                              {group.options.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Nom de la course (optionnel)</Label>
                      <Input
                        value={newGoalName}
                        onChange={(e) => setNewGoalName(e.target.value)}
                        placeholder="ex: Marathon de Paris 2025"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Date de la course *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !newGoalDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newGoalDate ? format(newGoalDate, "PPP", { locale: fr }) : "Sélectionner une date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={newGoalDate}
                            onSelect={setNewGoalDate}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Annuler
                    </Button>
                    <Button onClick={handleAddRaceGoal} disabled={saving || !newGoalType || !newGoalDate}>
                      {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                      Ajouter
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              
              {raceGoals.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                  className="h-7 px-2 text-xs"
                >
                  <History className="h-3 w-3 mr-1" />
                  {raceGoals.length}
                </Button>
              )}
            </div>
          </div>

          {/* Quick edit mode inline */}
          {isEditing && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={currentGoal as string} onValueChange={handleQuickGoalChange} disabled={saving}>
                  <SelectTrigger className="h-8 w-auto min-w-[140px] text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(OBJECTIF_GROUPS).map(([key, group]) => (
                      <div key={key}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          {group.label}
                        </div>
                        {group.options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="h-8">
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {/* Collapsible history */}
          {isHistoryOpen && raceGoals.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border/50 space-y-2">
              {sortedRaceGoals.slice(0, 3).map((goal) => {
                const isPast = isGoalPast(goal.race_date);
                const isCurrent = goal.race_type === currentGoal;
                const goalDays = !isPast ? Math.ceil((new Date(goal.race_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
                const goalWeeks = goalDays !== null ? Math.floor(goalDays / 7) : null;
                
                return (
                  <div
                    key={goal.id}
                    className={cn(
                      "flex items-center justify-between p-2 rounded text-xs",
                      isCurrent ? "bg-primary/5" : "bg-muted/30"
                    )}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{getObjectifLabel(goal.race_type as ObjectifType)}</span>
                      {goal.race_name && <span className="text-muted-foreground truncate max-w-[100px]">{goal.race_name}</span>}
                      <span className="text-muted-foreground">{format(parseISO(goal.race_date), "dd/MM/yy")}</span>
                      {isCurrent && <Badge variant="default" className="text-[10px] h-4">Actuel</Badge>}
                      {goalDays !== null && (
                        <Badge variant="outline" className="text-[10px] h-4">
                          J-{goalDays}{goalWeeks != null && goalWeeks > 0 ? ` • ${goalWeeks}s` : ""}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!isCurrent && (
                        <Button variant="ghost" size="sm" onClick={() => handleRestore(goal)} className="h-6 px-1.5 text-xs">
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer cet objectif ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(goal.id)}>
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full mode (default)
  return (
    <Card className={cn("border-primary/20", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Objectif</CardTitle>
              <CardDescription className="text-xs">
                L'app s'adapte automatiquement à l'objectif sélectionné
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Badge variant="outline" className="text-xs gap-1">
              <Cloud className="h-3 w-3" />
              Synced
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Next race prominent display */}
        {nextRace && daysRemaining !== null && (
          <div className={cn(
            "p-3 rounded-lg border flex items-center justify-between",
            daysRemaining <= 7 ? "bg-red-500/5 border-red-500/30" :
            daysRemaining <= 30 ? "bg-amber-500/5 border-amber-500/30" :
            daysRemaining <= 60 ? "bg-blue-500/5 border-blue-500/30" :
            "bg-emerald-500/5 border-emerald-500/30"
          )}>
            <div className="flex items-center gap-3">
              <CalendarIcon className={cn(
                "h-5 w-5",
                daysRemaining <= 7 ? "text-red-500" :
                daysRemaining <= 30 ? "text-amber-500" :
                daysRemaining <= 60 ? "text-blue-500" :
                "text-emerald-500"
              )} />
              <div>
                <p className="text-sm font-medium">
                  {nextRace.race_name || getObjectifLabel(nextRace.race_type as ObjectifType)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(nextRace.race_date), "EEEE d MMMM yyyy", { locale: fr })}
                </p>
              </div>
            </div>
            <Badge className={cn(
              "text-sm px-3 py-1",
              daysRemaining <= 7 ? "bg-red-500" :
              daysRemaining <= 30 ? "bg-amber-500" :
              daysRemaining <= 60 ? "bg-blue-500" :
              "bg-emerald-500"
            )}>
              J-{daysRemaining}
              {weeksRemaining != null && weeksRemaining > 0 && (
                <span className="text-xs font-normal ml-1">• {weeksRemaining} sem.</span>
              )}
            </Badge>
          </div>
        )}

        {/* Current Goal Display */}
        {!isEditing ? (
          <div className="p-4 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Objectif actuel
                </p>
                <p className="text-xl font-bold text-foreground">
                  {currentGoalInfo?.label || getObjectifLabel(currentGoal as ObjectifType) || "Non défini"}
                </p>
                {currentGoalInfo?.distance && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {currentGoalInfo.distance}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  disabled={saving}
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Modifier
                </Button>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" size="sm" disabled={saving}>
                      <Plus className="h-4 w-4 mr-1" />
                      Nouvel objectif
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        Ajouter un nouvel objectif
                      </DialogTitle>
                      <DialogDescription>
                        Définissez un nouvel objectif de course pour cet athlète
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4">
                      {/* Race Type */}
                      <div className="space-y-2">
                        <Label>Type de course *</Label>
                        <Select value={newGoalType} onValueChange={setNewGoalType}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un type" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(OBJECTIF_GROUPS).map(([key, group]) => (
                              <div key={key}>
                                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                  {group.label}
                                </div>
                                {group.options.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    <span className="flex flex-col">
                                      <span>{opt.label}</span>
                                      <span className="text-xs text-muted-foreground">{opt.distance}</span>
                                    </span>
                                  </SelectItem>
                                ))}
                              </div>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Race Name */}
                      <div className="space-y-2">
                        <Label>Nom de la course (optionnel)</Label>
                        <Input
                          value={newGoalName}
                          onChange={(e) => setNewGoalName(e.target.value)}
                          placeholder="ex: Marathon de Paris 2025"
                        />
                      </div>
                      
                      {/* Race Date */}
                      <div className="space-y-2">
                        <Label>Date de la course *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !newGoalDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {newGoalDate ? format(newGoalDate, "PPP", { locale: fr }) : "Sélectionner une date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={newGoalDate}
                              onSelect={setNewGoalDate}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      {/* Plan Start Date */}
                      <div className="space-y-2">
                        <Label>Début de la préparation (optionnel)</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !newPlanStartDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {newPlanStartDate ? format(newPlanStartDate, "PPP", { locale: fr }) : "Sélectionner une date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={newPlanStartDate}
                              onSelect={setNewPlanStartDate}
                              disabled={(date) => newGoalDate ? date > newGoalDate : false}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button onClick={handleAddRaceGoal} disabled={saving || !newGoalType || !newGoalDate}>
                        {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                        Ajouter
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        ) : (
          /* Quick Edit Mode */
          <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-3">
            <p className="text-sm font-medium text-foreground">Changer rapidement l'objectif</p>
            <Select value={currentGoal as string} onValueChange={handleQuickGoalChange} disabled={saving}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(OBJECTIF_GROUPS).map(([key, group]) => (
                  <div key={key}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                      {group.label}
                    </div>
                    {group.options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                Annuler
              </Button>
            </div>
          </div>
        )}
        
        <Separator />
        
        {/* Goals History */}
        <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-between text-muted-foreground hover:text-foreground"
            >
              <span className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <span>Historique des objectifs ({sortedRaceGoals.length})</span>
              </span>
              {isHistoryOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent className="space-y-2 pt-3">
            {sortedRaceGoals.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground bg-muted/30 rounded-lg">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucun objectif enregistré</p>
                <p className="text-xs">Ajoutez un objectif pour commencer</p>
              </div>
            ) : (
              sortedRaceGoals.map((goal) => {
                const isPast = isGoalPast(goal.race_date);
                const isCurrent = goal.race_type === currentGoal;
                const gDays = !isPast ? Math.ceil((new Date(goal.race_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
                const gWeeks = gDays !== null ? Math.floor(gDays / 7) : null;
                
                return (
                  <div
                    key={goal.id}
                    className={cn(
                      "p-3 rounded-lg border transition-all",
                      isCurrent 
                        ? "border-primary/30 bg-primary/5" 
                        : isPast 
                          ? "border-border/50 bg-muted/30 opacity-70"
                          : "border-border bg-card hover:border-primary/20"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground">
                            {getObjectifLabel(goal.race_type as ObjectifType)}
                          </span>
                          {isCurrent && (
                            <Badge variant="default" className="text-xs gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Actuel
                            </Badge>
                          )}
                          {isPast && !isCurrent && (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Passé
                            </Badge>
                          )}
                          {gDays !== null && (
                            <Badge variant="outline" className="text-xs">
                              J-{gDays}{gWeeks != null && gWeeks > 0 ? ` • ${gWeeks} sem.` : ""}
                            </Badge>
                          )}
                        </div>
                        
                        {goal.race_name && (
                          <p className="text-sm text-muted-foreground mt-0.5 truncate">
                            {goal.race_name}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {editingDateGoalId === goal.id ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" size="sm" className="h-7 text-xs">
                                    <CalendarIcon className="h-3 w-3 mr-1" />
                                    {editDate ? format(editDate, "d MMM yyyy", { locale: fr }) : "Choisir"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={editDate}
                                    onSelect={setEditDate}
                                    initialFocus
                                    className={cn("p-3 pointer-events-auto")}
                                  />
                                </PopoverContent>
                              </Popover>
                              <Button
                                variant="default"
                                size="sm"
                                className="h-7 text-xs"
                                disabled={!editDate || saving}
                                onClick={() => handleUpdateDate(goal.id)}
                              >
                                <Save className="h-3 w-3 mr-1" />
                                OK
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => { setEditingDateGoalId(null); setEditDate(undefined); }}
                              >
                                Annuler
                              </Button>
                            </div>
                          ) : (
                            <>
                              <button
                                className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                                onClick={() => {
                                  setEditingDateGoalId(goal.id);
                                  setEditDate(parseISO(goal.race_date));
                                }}
                                title="Modifier la date"
                              >
                                <CalendarIcon className="h-3 w-3" />
                                {format(parseISO(goal.race_date), "d MMMM yyyy", { locale: fr })}
                                <Edit2 className="h-2.5 w-2.5 ml-0.5 opacity-50" />
                              </button>
                              {goal.plan_start_date && (
                                <span className="text-muted-foreground/60">
                                  Prépa: {format(parseISO(goal.plan_start_date), "d MMM", { locale: fr })}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 shrink-0">
                        {!isCurrent && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestore(goal)}
                            disabled={saving}
                            className="h-8 px-2 text-xs gap-1 hover:bg-primary/10 hover:text-primary"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Restaurer
                          </Button>
                        )}
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={saving}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                Supprimer cet objectif ?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. L'objectif "{goal.race_name || getObjectifLabel(goal.race_type as ObjectifType)}" 
                                sera définitivement supprimé de l'historique.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(goal.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CollapsibleContent>
        </Collapsible>
        
        {/* Info message */}
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-xs text-muted-foreground">
            💡 L'objectif sélectionné adapte automatiquement les cibles VLamax, TTE, zones d'entraînement 
            et recommandations dans toute l'application.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
