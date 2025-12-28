// =============================================
// COMPOSANT BIBLIOTHÈQUE DE SÉANCES ÉLITE
// =============================================

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dumbbell, ChevronDown, ChevronRight, Clock, Target, AlertTriangle, CheckCircle } from "lucide-react";
import { Athlete, getObjectifLabel } from "@/types/athlete";
import { SessionType, TrainingSport } from "@/types/planificateur";
import { LibraryWorkout } from "@/types/workoutLibrary";
import { 
  WorkoutLibrary as WorkoutLibraryData, 
  filterWorkouts, 
  getNecessiteColor, 
  getCatColor,
  zoneTargetTextForWorkout
} from "@/lib/workoutLibrary";

interface WorkoutLibraryProps {
  athlete: Athlete;
}

export function WorkoutLibrary({ athlete }: WorkoutLibraryProps) {
  const [catFilter, setCatFilter] = useState<string>("ALL");
  const [sportFilter, setSportFilter] = useState<string>("ALL");
  const [openWorkouts, setOpenWorkouts] = useState<Set<string>>(new Set());

  const filteredWorkouts = useMemo(() => {
    return filterWorkouts({
      cat: catFilter !== "ALL" ? catFilter as SessionType : undefined,
      sport: sportFilter !== "ALL" ? sportFilter as TrainingSport : undefined
    });
  }, [catFilter, sportFilter]);

  const toggleWorkout = (id: string) => {
    setOpenWorkouts(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getVariantKey = (): "ironman" | "half" | "marathon" | "semi" => {
    switch (athlete.objectif) {
      case "IM": return "ironman";
      case "703": return "half";
      case "Marathon": return "marathon";
      case "Semi": return "semi";
      default: return "ironman";
    }
  };

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Dumbbell className="h-5 w-5 text-primary" />
          Bibliothèque de Séances Élite
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtres */}
        <div className="flex flex-wrap gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Catégorie:</span>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-32">
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
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sport:</span>
            <Select value={sportFilter} onValueChange={setSportFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous</SelectItem>
                <SelectItem value="cyclisme">Cyclisme</SelectItem>
                <SelectItem value="course">Course</SelectItem>
                <SelectItem value="natation">Natation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="ml-auto flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-sm">
              Objectif: <strong>{getObjectifLabel(athlete.objectif)}</strong>
            </span>
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
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Composant carte de séance
interface WorkoutCardProps {
  workout: LibraryWorkout;
  athlete: Athlete;
  isOpen: boolean;
  onToggle: () => void;
  variantKey: "ironman" | "half" | "marathon" | "semi";
}

function WorkoutCard({ workout, athlete, isOpen, onToggle, variantKey }: WorkoutCardProps) {
  const catColors = getCatColor(workout.cat);
  const necessiteColors = getNecessiteColor(workout.necessite);
  
  // Zone dominante (première zone du bloc Main)
  const mainPart = workout.structure.find(s => s.part.toLowerCase().includes("main")) || workout.structure[0];
  const primaryZone = mainPart?.zones?.[0] || "Z2";
  const zoneText = zoneTargetTextForWorkout(athlete.refs, workout.metricKey, workout.sportKey, primaryZone);
  
  const variant = workout.variants[variantKey];

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
                    <span className="text-muted-foreground">—</span>
                    <span className="text-sm">{workout.objectif}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {workout.durationMin[0]}–{workout.durationMin[1]} min
                    </span>
                    <span>Zone: {primaryZone}</span>
                  </div>
                </div>
              </div>
              
              <Badge variant="outline" className={`${necessiteColors.bg} ${necessiteColors.text} text-xs shrink-0`}>
                {workout.necessite}
              </Badge>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 space-y-4 border-t border-border/30">
            {/* Quand utiliser / éviter */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-4">
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
