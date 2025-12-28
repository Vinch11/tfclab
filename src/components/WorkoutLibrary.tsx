// =============================================
// COMPOSANT BIBLIOTHÈQUE DE SÉANCES ÉLITE V2
// Avec filtres Trail + Ajouter au Plan
// =============================================

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Dumbbell, ChevronDown, ChevronRight, Clock, Target, AlertTriangle, CheckCircle, Plus, Mountain, Search, Calendar } from "lucide-react";
import { Athlete, getObjectifLabel, isTrailGoal, ObjectifType } from "@/types/athlete";
import { SessionType, TrainingSport, PlannedSession, PhaseName } from "@/types/planificateur";
import { LibraryWorkout, DPlusTarget } from "@/types/workoutLibrary";
import { 
  WorkoutLibrary as WorkoutLibraryData, 
  filterWorkouts, 
  getNecessiteColor, 
  getCatColor,
  zoneTargetTextForWorkout
} from "@/lib/workoutLibrary";
import { formatDPlusDisplay } from "@/lib/planificateur";
import { toast } from "@/hooks/use-toast";

interface WorkoutLibraryProps {
  athlete: Athlete;
  onAddToPlan?: (session: Partial<PlannedSession> & { workoutId: string }) => void;
}

// Helper pour détecter si c'est une séance trail
function isTrailWorkout(workout: LibraryWorkout): boolean {
  const id = (workout.id || "").toUpperCase();
  if (id.includes("_TR_")) return true;
  const v = workout.variants;
  return !!(v?.trail_short || v?.trail_mountain || v?.trail_ultra);
}

// Helper pour vérifier si la séance supporte un objectif trail
function supportsTrailGoal(workout: LibraryWorkout, goal: "trail_short" | "trail_mountain" | "trail_ultra"): boolean {
  if (!isTrailWorkout(workout)) return false;
  const v = workout.variants;
  if (!v) return true;
  const val = v[goal];
  return val !== undefined && val !== "—" && val !== "";
}

type TrailFilter = "all" | "trail_all" | "trail_short" | "trail_mountain";

export function WorkoutLibrary({ athlete, onAddToPlan }: WorkoutLibraryProps) {
  const [catFilter, setCatFilter] = useState<string>("ALL");
  const [sportFilter, setSportFilter] = useState<string>("ALL");
  const [trailFilter, setTrailFilter] = useState<TrailFilter>(() => {
    // Préfiltre automatique si l'athlète est trail
    if (athlete.objectif === "TrailShort") return "trail_short";
    if (athlete.objectif === "TrailMountain" || athlete.objectif === "Trail") return "trail_mountain";
    return "all";
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [openWorkouts, setOpenWorkouts] = useState<Set<string>>(new Set());
  
  // Modal ajouter au plan
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<LibraryWorkout | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDay, setSelectedDay] = useState("Samedi");

  const filteredWorkouts = useMemo(() => {
    let pool = filterWorkouts({
      cat: catFilter !== "ALL" ? catFilter as SessionType : undefined,
      sport: sportFilter !== "ALL" ? sportFilter as TrainingSport : undefined
    });

    // Filtre trail
    if (trailFilter === "trail_all") {
      pool = pool.filter(isTrailWorkout);
    } else if (trailFilter === "trail_short") {
      pool = pool.filter(w => supportsTrailGoal(w, "trail_short"));
    } else if (trailFilter === "trail_mountain") {
      pool = pool.filter(w => supportsTrailGoal(w, "trail_mountain"));
    }

    // Recherche texte
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      pool = pool.filter(w => {
        const blob = `${w.id} ${w.objectif} ${w.necessite} ${w.when} ${w.avoid}`.toLowerCase();
        return blob.includes(q);
      });
    }

    return pool;
  }, [catFilter, sportFilter, trailFilter, searchQuery]);

  const toggleWorkout = (id: string) => {
    setOpenWorkouts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getVariantKey = (): "ironman" | "half" | "marathon" | "semi" | "trail_short" | "trail_mountain" | "trail_ultra" => {
    switch (athlete.objectif) {
      case "IM": return "ironman";
      case "703": return "half";
      case "Marathon": return "marathon";
      case "Semi": return "semi";
      case "Trail":
      case "TrailMountain": return "trail_mountain";
      case "TrailShort": return "trail_short";
      case "TrailUltra": return "trail_ultra";
      default: return "ironman";
    }
  };

  const handleOpenAddDialog = (workout: LibraryWorkout) => {
    setSelectedWorkout(workout);
    setAddDialogOpen(true);
  };

  const handleAddToPlan = () => {
    if (!selectedWorkout || !onAddToPlan) return;

    const mainPart = selectedWorkout.structure.find(s => s.part.toLowerCase().includes("main")) || selectedWorkout.structure[0];
    const primaryZone = mainPart?.zones?.[0] || "Z2";
    const zoneText = zoneTargetTextForWorkout(athlete.refs, selectedWorkout.metricKey, selectedWorkout.sportKey, primaryZone);

    const session: Partial<PlannedSession> & { workoutId: string } = {
      workoutId: selectedWorkout.id,
      dayName: selectedDay,
      weekIndex: selectedWeek,
      type: selectedWorkout.cat as SessionType,
      sport: selectedWorkout.sport,
      name: `${selectedWorkout.id.split("_").slice(1).join(" ")} – ${selectedWorkout.objectif}`,
      zone: primaryZone,
      zoneTarget: zoneText,
      durationMin: selectedWorkout.durationMin[0],
      dPlusTargetM: selectedWorkout.dPlusTargetM,
      notes: `${selectedWorkout.necessite} | Quand: ${selectedWorkout.when}`,
      totalWeeks: 12
    };

    onAddToPlan(session);
    setAddDialogOpen(false);
    
    toast({
      title: "Séance ajoutée",
      description: `${selectedWorkout.objectif} → Semaine ${selectedWeek}, ${selectedDay}`
    });
  };

  const days = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  return (
    <>
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Dumbbell className="h-5 w-5 text-primary" />
            Bibliothèque de Séances Élite
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtres */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border/50">
            {/* Ligne 1: Catégorie, Sport, Trail */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Catégorie</Label>
                <Select value={catFilter} onValueChange={setCatFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Toutes</SelectItem>
                    <SelectItem value="A">A - Endurance</SelectItem>
                    <SelectItem value="B">B - Intensité</SelectItem>
                    <SelectItem value="C">C - Technique</SelectItem>
                    <SelectItem value="D">D - Récup</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Sport</Label>
                <Select value={sportFilter} onValueChange={setSportFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Tous</SelectItem>
                    <SelectItem value="cyclisme">Cyclisme</SelectItem>
                    <SelectItem value="course">Course</SelectItem>
                    <SelectItem value="natation">Natation</SelectItem>
                    <SelectItem value="muscu">Muscu</SelectItem>
                    <SelectItem value="brick">Brick</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Mountain className="h-3 w-3" />
                  Filtre Trail
                </Label>
                <Select value={trailFilter} onValueChange={(v) => setTrailFilter(v as TrailFilter)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="trail_all">Trail (général)</SelectItem>
                    <SelectItem value="trail_short">Trail 20–40 km</SelectItem>
                    <SelectItem value="trail_mountain">Trail 40–80 km</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ligne 2: Recherche + Info objectif */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher (ID, objectif, mots-clés)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2 text-sm shrink-0">
                <Target className="h-4 w-4 text-primary" />
                <span>
                  Objectif: <strong>{getObjectifLabel(athlete.objectif)}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Résumé */}
          <div className="text-sm text-muted-foreground">
            {filteredWorkouts.length} séance(s) trouvée(s)
          </div>

          {/* Liste des séances */}
          <div className="space-y-2">
            {filteredWorkouts.map(workout => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                athlete={athlete}
                isOpen={openWorkouts.has(workout.id)}
                onToggle={() => toggleWorkout(workout.id)}
                variantKey={getVariantKey()}
                onAddToPlan={onAddToPlan ? () => handleOpenAddDialog(workout) : undefined}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog Ajouter au plan */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Ajouter au plan
            </DialogTitle>
          </DialogHeader>
          
          {selectedWorkout && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                <div className="font-medium">{selectedWorkout.objectif}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedWorkout.cat} • {selectedWorkout.sport} • {selectedWorkout.durationMin[0]}–{selectedWorkout.durationMin[1]} min
                </div>
                {selectedWorkout.dPlusTargetM && (
                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <Mountain className="h-3 w-3" />
                    {formatDPlusDisplay(selectedWorkout.dPlusTargetM)}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Semaine</Label>
                  <Select value={String(selectedWeek)} onValueChange={(v) => setSelectedWeek(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 20 }, (_, i) => i + 1).map(w => (
                        <SelectItem key={w} value={String(w)}>Semaine {w}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Jour</Label>
                  <Select value={selectedDay} onValueChange={setSelectedDay}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map(d => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddToPlan}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Composant carte de séance
interface WorkoutCardProps {
  workout: LibraryWorkout;
  athlete: Athlete;
  isOpen: boolean;
  onToggle: () => void;
  variantKey: "ironman" | "half" | "marathon" | "semi" | "trail_short" | "trail_mountain" | "trail_ultra";
  onAddToPlan?: () => void;
}

function WorkoutCard({ workout, athlete, isOpen, onToggle, variantKey, onAddToPlan }: WorkoutCardProps) {
  const catColors = getCatColor(workout.cat);
  const necessiteColors = getNecessiteColor(workout.necessite);
  
  // Zone dominante (première zone du bloc Main)
  const mainPart = workout.structure.find(s => s.part.toLowerCase().includes("main")) || workout.structure[0];
  const primaryZone = mainPart?.zones?.[0] || "Z2";
  const zoneText = zoneTargetTextForWorkout(athlete.refs, workout.metricKey, workout.sportKey, primaryZone);
  
  const variant = workout.variants[variantKey];
  const isTrail = isTrailWorkout(workout);

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="border border-border/50 rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="p-4 cursor-pointer hover:bg-muted/20 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                {isOpen ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground mt-0.5" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground mt-0.5" />
                )}
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={`${catColors.bg} ${catColors.text} text-xs`}>
                      {workout.cat}
                    </Badge>
                    <span className="font-medium capitalize">{workout.sport}</span>
                    {isTrail && (
                      <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        <Mountain className="h-3 w-3 mr-1" />
                        Trail
                      </Badge>
                    )}
                    <span className="text-muted-foreground">—</span>
                    <span className="text-sm">{workout.objectif}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {workout.durationMin[0]}–{workout.durationMin[1]} min
                    </span>
                    <span>Zone: {primaryZone}</span>
                    {isTrail && workout.dPlusTargetM && (
                      <span className="flex items-center gap-1">
                        <Mountain className="h-3 w-3" />
                        {formatDPlusDisplay(workout.dPlusTargetM)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={`${necessiteColors.bg} ${necessiteColors.text} text-xs`}>
                  {workout.necessite}
                </Badge>
              </div>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 space-y-4 border-t border-border/30">
            {/* Bouton Ajouter au plan */}
            {onAddToPlan && (
              <div className="pt-4">
                <Button size="sm" onClick={(e) => { e.stopPropagation(); onAddToPlan(); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter au plan
                </Button>
              </div>
            )}

            {/* Quand utiliser / éviter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="flex items-start gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-muted-foreground">Quand:</span>
                  <p>{workout.when}</p>
                </div>
              </div>
              <div className="flex items-start gap-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-muted-foreground">À éviter:</span>
                  <p>{workout.avoid}</p>
                </div>
              </div>
            </div>

            {/* Structure */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Structure de la séance</h4>
              <div className="space-y-2">
                {workout.structure.map((part, idx) => {
                  const zoneTexts = part.zones.map(z => 
                    zoneTargetTextForWorkout(athlete.refs, workout.metricKey, workout.sportKey, z)
                  );
                  
                  return (
                    <div 
                      key={idx}
                      className="p-3 rounded-lg bg-muted/20 border border-border/30"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {part.part}
                        </Badge>
                      </div>
                      <p className="text-sm">{part.text}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {zoneTexts.map((z, i) => (
                          <span key={i} className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">
                            {z}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Variante objectif */}
            {variant && variant !== "—" && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="text-muted-foreground">Variante {variantKey}:</span>
                  <span>{variant}</span>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
