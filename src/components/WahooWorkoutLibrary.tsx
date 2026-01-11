import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Bike,
  PersonStanding,
  Search,
  ChevronDown,
  ChevronRight,
  Zap,
  Clock,
  TrendingUp,
  Activity,
  Heart,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Minus,
  Filter,
  Dumbbell,
  Flame,
  Target,
  Shield,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WAHOO_WORKOUTS,
  WahooWorkoutMapping,
  WahooCategory,
  WahooPhysioAxis,
  getAxisLabel,
  getCategoryLabel,
  getRiskColor,
  getRiskLabel,
} from "@/data/wahooMapping";

// =============================================
// TYPES & CONSTANTS
// =============================================

type PillarType = "VLamax" | "TTE" | "VO2max" | "Endurance";

interface PillarImpact {
  pillar: PillarType;
  effect: "positive" | "negative" | "neutral";
  description: string;
}

const PILLAR_CONFIG: Record<PillarType, { icon: typeof Zap; color: string; label: string; description: string }> = {
  VLamax: {
    icon: Zap,
    color: "text-amber-500",
    label: "VLamax",
    description: "Capacité glycolytique",
  },
  TTE: {
    icon: Clock,
    color: "text-blue-500",
    label: "TTE",
    description: "Temps jusqu'à épuisement",
  },
  VO2max: {
    icon: Activity,
    color: "text-red-500",
    label: "VO₂max",
    description: "Plafond aérobie",
  },
  Endurance: {
    icon: Heart,
    color: "text-green-500",
    label: "Endurance",
    description: "Base aérobie fondamentale",
  },
};

const CATEGORY_CONFIG: Record<WahooCategory, { icon: typeof Bike; color: string }> = {
  RECOVERY: { icon: Heart, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  Z2_ENDURANCE: { icon: Heart, color: "bg-green-500/20 text-green-400 border-green-500/30" },
  Z2_LONG: { icon: TrendingUp, color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  TEMPO_DURABILITY: { icon: Clock, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  FORCE_ENDURANCE: { icon: Dumbbell, color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  THRESHOLD_MLSS: { icon: Target, color: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  VO2_MAP: { icon: Flame, color: "bg-red-500/20 text-red-400 border-red-500/30" },
  ANAEROBIC_AC: { icon: Zap, color: "bg-pink-500/20 text-pink-400 border-pink-500/30" },
  NEUROMUSCULAR_NM: { icon: Sparkles, color: "bg-violet-500/20 text-violet-400 border-violet-500/30" },
  WARMUP: { icon: Shield, color: "bg-slate-500/20 text-slate-400 border-slate-500/30" },
  UNKNOWN: { icon: Activity, color: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

// =============================================
// HELPER FUNCTIONS
// =============================================

function getPillarImpacts(workout: WahooWorkoutMapping): PillarImpact[] {
  const impacts: PillarImpact[] = [];

  // VLamax impact
  if (workout.vlamax_effect === "down") {
    impacts.push({
      pillar: "VLamax",
      effect: "positive",
      description: "Réduit la dépendance glycolytique",
    });
  } else if (workout.vlamax_effect === "up") {
    impacts.push({
      pillar: "VLamax",
      effect: "negative",
      description: "Augmente le VLamax (attention objectifs longue distance)",
    });
  }

  // TTE impact
  if (workout.tte_effect === "up") {
    impacts.push({
      pillar: "TTE",
      effect: "positive",
      description: "Améliore l'endurance au seuil",
    });
  } else if (workout.tte_effect === "down") {
    impacts.push({
      pillar: "TTE",
      effect: "negative",
      description: "Impact négatif sur la durabilité",
    });
  }

  // VO2max impact (from primary/secondary axis)
  if (workout.primary_axis === "VO2_UP" || workout.secondary_axis === "VO2_UP") {
    impacts.push({
      pillar: "VO2max",
      effect: "positive",
      description: "Développe le plafond aérobie",
    });
  }

  // Endurance impact
  if (workout.primary_axis === "ENDURANCE_BASE" || workout.secondary_axis === "ENDURANCE_BASE") {
    impacts.push({
      pillar: "Endurance",
      effect: "positive",
      description: "Renforce la base aérobie fondamentale",
    });
  }

  return impacts;
}

function getEffectIcon(effect: "positive" | "negative" | "neutral") {
  switch (effect) {
    case "positive":
      return <ArrowUp className="h-3 w-3 text-green-500" />;
    case "negative":
      return <ArrowDown className="h-3 w-3 text-red-500" />;
    default:
      return <Minus className="h-3 w-3 text-muted-foreground" />;
  }
}

// =============================================
// SUB-COMPONENTS
// =============================================

interface WorkoutCardProps {
  workout: WahooWorkoutMapping;
}

function WorkoutCard({ workout }: WorkoutCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const impacts = getPillarImpacts(workout);
  const categoryConfig = CATEGORY_CONFIG[workout.category];

  return (
    <Card className="bg-card/50 backdrop-blur hover:border-primary/30 transition-colors">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge className={cn("text-xs", categoryConfig.color)}>
                    {getCategoryLabel(workout.category)}
                  </Badge>
                  {workout.sport === "run" ? (
                    <PersonStanding className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Bike className="h-4 w-4 text-muted-foreground" />
                  )}
                  <Badge variant="outline" className={getRiskColor(workout.risk_level)}>
                    Risque {getRiskLabel(workout.risk_level)}
                  </Badge>
                </div>
                <CardTitle className="text-base font-semibold truncate">
                  {workout.wahoo_name}
                </CardTitle>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Impact sur les 4 piliers - Preview */}
            <div className="flex items-center gap-3 mt-2">
              {(["VLamax", "TTE", "VO2max", "Endurance"] as PillarType[]).map((pillar) => {
                const impact = impacts.find((i) => i.pillar === pillar);
                const config = PILLAR_CONFIG[pillar];
                const Icon = config.icon;

                return (
                  <div
                    key={pillar}
                    className={cn(
                      "flex items-center gap-1 text-xs",
                      impact ? "opacity-100" : "opacity-30"
                    )}
                    title={impact?.description || "Pas d'impact direct"}
                  >
                    <Icon className={cn("h-3.5 w-3.5", config.color)} />
                    {impact && getEffectIcon(impact.effect)}
                  </div>
                );
              })}
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Description Staff */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Annotation Staff
              </p>
              <p className="text-sm">{workout.staff_annotation}</p>
            </div>

            {/* Axes physiologiques */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Axes Physiologiques
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default" className="text-xs">
                  {getAxisLabel(workout.primary_axis)}
                </Badge>
                {workout.secondary_axis && (
                  <Badge variant="secondary" className="text-xs">
                    {getAxisLabel(workout.secondary_axis)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Impact détaillé sur les piliers */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
                Impact sur les 4 Piliers
              </p>
              <div className="grid grid-cols-2 gap-2">
                {impacts.map((impact, idx) => {
                  const config = PILLAR_CONFIG[impact.pillar];
                  const Icon = config.icon;

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "p-2 rounded-lg border text-xs",
                        impact.effect === "positive"
                          ? "bg-green-500/10 border-green-500/30"
                          : impact.effect === "negative"
                          ? "bg-red-500/10 border-red-500/30"
                          : "bg-muted/50 border-border"
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className={cn("h-3.5 w-3.5", config.color)} />
                        <span className="font-medium">{config.label}</span>
                        {getEffectIcon(impact.effect)}
                      </div>
                      <p className="text-muted-foreground text-[10px]">{impact.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Durée et intensité */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                Durée: {workout.duration_min_range[0]}-{workout.duration_min_range[1]} min
              </span>
              <span>Intensité: {workout.intensity_profile}</span>
            </div>

            {/* Contre-indications */}
            {workout.contraindications && workout.contraindications.length > 0 && (
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-medium text-amber-500">Contre-indications</span>
                </div>
                <ul className="text-xs text-muted-foreground list-disc list-inside">
                  {workout.contraindications.map((ci, idx) => (
                    <li key={idx}>{ci}</li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// =============================================
// MAIN COMPONENT
// =============================================

export function WahooWorkoutLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "by-category" | "by-pillar">("all");
  const [sportFilter, setSportFilter] = useState<"all" | "bike" | "run">("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedPillars, setExpandedPillars] = useState<Set<string>>(new Set());

  // Filtrer les workouts
  const filteredWorkouts = useMemo(() => {
    return WAHOO_WORKOUTS.filter((w) => {
      // Filtre sport
      if (sportFilter !== "all" && w.sport !== sportFilter) return false;

      // Filtre recherche
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          w.wahoo_name.toLowerCase().includes(query) ||
          w.aliases.some((a) => a.toLowerCase().includes(query)) ||
          w.staff_annotation.toLowerCase().includes(query) ||
          w.tags?.some((t) => t.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [searchQuery, sportFilter]);

  // Grouper par catégorie
  const workoutsByCategory = useMemo(() => {
    const grouped: Record<WahooCategory, WahooWorkoutMapping[]> = {} as any;

    filteredWorkouts.forEach((w) => {
      if (!grouped[w.category]) {
        grouped[w.category] = [];
      }
      grouped[w.category].push(w);
    });

    return grouped;
  }, [filteredWorkouts]);

  // Grouper par pilier impacté
  const workoutsByPillar = useMemo(() => {
    const grouped: Record<PillarType, WahooWorkoutMapping[]> = {
      VLamax: [],
      TTE: [],
      VO2max: [],
      Endurance: [],
    };

    filteredWorkouts.forEach((w) => {
      // VLamax down = bon pour objectifs longue distance
      if (w.vlamax_effect === "down") {
        grouped.VLamax.push(w);
      }
      // TTE up = améliore durabilité
      if (w.tte_effect === "up") {
        grouped.TTE.push(w);
      }
      // VO2 up
      if (w.primary_axis === "VO2_UP" || w.secondary_axis === "VO2_UP") {
        grouped.VO2max.push(w);
      }
      // Endurance base
      if (w.primary_axis === "ENDURANCE_BASE" || w.secondary_axis === "ENDURANCE_BASE") {
        grouped.Endurance.push(w);
      }
    });

    return grouped;
  }, [filteredWorkouts]);

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const togglePillar = (pillar: string) => {
    setExpandedPillars((prev) => {
      const next = new Set(prev);
      if (next.has(pillar)) {
        next.delete(pillar);
      } else {
        next.add(pillar);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">Bibliothèque Wahoo SYSTM</h2>
        <p className="text-muted-foreground">
          {WAHOO_WORKOUTS.length} séances classées par objectif et impact sur les 4 piliers
        </p>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une séance..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={sportFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSportFilter("all")}
          >
            Tous
          </Button>
          <Button
            variant={sportFilter === "bike" ? "default" : "outline"}
            size="sm"
            onClick={() => setSportFilter("bike")}
            className="gap-1"
          >
            <Bike className="h-4 w-4" />
            Vélo
          </Button>
          <Button
            variant={sportFilter === "run" ? "default" : "outline"}
            size="sm"
            onClick={() => setSportFilter("run")}
            className="gap-1"
          >
            <PersonStanding className="h-4 w-4" />
            Course
          </Button>
        </div>
      </div>

      {/* Résumé des piliers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["VLamax", "TTE", "VO2max", "Endurance"] as PillarType[]).map((pillar) => {
          const config = PILLAR_CONFIG[pillar];
          const Icon = config.icon;
          const count = workoutsByPillar[pillar].length;

          return (
            <Card key={pillar} className="bg-card/50">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className={cn("p-2 rounded-lg bg-muted/50")}>
                    <Icon className={cn("h-5 w-5", config.color)} />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{config.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {count} séances
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Toutes ({filteredWorkouts.length})</TabsTrigger>
          <TabsTrigger value="by-category">Par Catégorie</TabsTrigger>
          <TabsTrigger value="by-pillar">Par Pilier</TabsTrigger>
        </TabsList>

        {/* All workouts */}
        <TabsContent value="all" className="mt-4">
          <ScrollArea className="h-[60vh]">
            <div className="grid gap-3 md:grid-cols-2 pr-4">
              {filteredWorkouts.map((workout) => (
                <WorkoutCard key={workout.wahoo_id} workout={workout} />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* By Category */}
        <TabsContent value="by-category" className="mt-4">
          <ScrollArea className="h-[60vh]">
            <div className="space-y-3 pr-4">
              {Object.entries(workoutsByCategory).map(([category, workouts]) => {
                const categoryKey = category as WahooCategory;
                const config = CATEGORY_CONFIG[categoryKey];
                const isExpanded = expandedCategories.has(category);

                return (
                  <Collapsible key={category} open={isExpanded} onOpenChange={() => toggleCategory(category)}>
                    <CollapsibleTrigger asChild>
                      <Card className={cn("cursor-pointer hover:border-primary/30 transition-colors", config.color)}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <config.icon className="h-5 w-5" />
                            <div>
                              <p className="font-semibold">{getCategoryLabel(categoryKey)}</p>
                              <p className="text-xs opacity-70">{workouts.length} séances</p>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </CardContent>
                      </Card>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid gap-3 md:grid-cols-2 mt-3 pl-4">
                        {workouts.map((workout) => (
                          <WorkoutCard key={workout.wahoo_id} workout={workout} />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* By Pillar */}
        <TabsContent value="by-pillar" className="mt-4">
          <ScrollArea className="h-[60vh]">
            <div className="space-y-3 pr-4">
              {(["VLamax", "TTE", "VO2max", "Endurance"] as PillarType[]).map((pillar) => {
                const config = PILLAR_CONFIG[pillar];
                const Icon = config.icon;
                const workouts = workoutsByPillar[pillar];
                const isExpanded = expandedPillars.has(pillar);

                const pillarDescription = {
                  VLamax: "Séances qui réduisent le VLamax (idéales pour Ironman/Marathon)",
                  TTE: "Séances qui améliorent l'endurance au seuil",
                  VO2max: "Séances qui développent le plafond aérobie",
                  Endurance: "Séances de base aérobie fondamentale",
                };

                return (
                  <Collapsible key={pillar} open={isExpanded} onOpenChange={() => togglePillar(pillar)}>
                    <CollapsibleTrigger asChild>
                      <Card className="cursor-pointer hover:border-primary/30 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg bg-muted/50")}>
                              <Icon className={cn("h-5 w-5", config.color)} />
                            </div>
                            <div>
                              <p className="font-semibold">{config.label}</p>
                              <p className="text-xs text-muted-foreground">
                                {pillarDescription[pillar]}
                              </p>
                              <p className="text-xs text-primary font-medium">{workouts.length} séances</p>
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </CardContent>
                      </Card>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="grid gap-3 md:grid-cols-2 mt-3 pl-4">
                        {workouts.map((workout) => (
                          <WorkoutCard key={workout.wahoo_id} workout={workout} />
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}