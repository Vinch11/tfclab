// src/components/StaffSessionLibrary.tsx
// =============================================
// VINCE'S LAB — STAFF SESSION LIBRARY (Staff Ready)
// Affiche la bibliothèque de séances de référence coach (30)
// Source: src/data/staffSessions.ts
//
// ⚠️ Ne pas confondre avec `WorkoutLibrary` (src/lib/workoutLibrary.ts) : ce
// composant affiche un jeu de fiches "pourquoi / quand / structure" curées à
// la main pour la pédagogie coach. Ce sont les seules 30 séances de ce
// fichier — le catalogue que le générateur IA sélectionne réellement pour
// composer les plans est plus riche et vit ailleurs (voir le lien "bibliothèque
// complète" dans le composant ci-dessous, route /planning/library). Les deux
// portaient auparavant le même nom `WorkoutLibrary`, ce qui prêtait à
// confusion — d'où le renommage.
// =============================================

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { Dumbbell, Bike, PersonStanding, Waves, Search, Sparkles, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

// ✅ Import des séances staff
import { getStaffSessions, SportType, SessionTag, SessionLevel } from "@/data/staffSessions";

// (Optionnel) si ton composant reçoit athlete
import { Athlete } from "@/types/athlete";

interface StaffSessionLibraryProps {
  athlete?: Athlete; // optionnel
}

const sportLabel: Record<SportType | "all", string> = {
  all: "Tous",
  velo: "Vélo",
  course: "Course",
  natation: "Natation",
};

const sportIcon: Record<SportType | "all", any> = {
  all: Dumbbell,
  velo: Bike,
  course: PersonStanding,
  natation: Waves,
};

const sportChipClass: Record<SportType, string> = {
  velo: "bg-primary/10 border-primary/20 text-primary",
  course: "bg-accent/10 border-accent/20 text-accent",
  natation: "bg-blue-400/10 border-blue-400/20 text-blue-400",
};

const TAGS: { value: "all" | SessionTag; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "VLAMAX", label: "VLamax" },
  { value: "TTE", label: "TTE" },
  { value: "FTP", label: "FTP" },
  { value: "ENDURANCE", label: "Endurance" },
  { value: "SPECIFIC", label: "Spécifique" },
  { value: "NEURO", label: "Neuro" },
  { value: "RECOVERY", label: "Récupération" },
  { value: "METABOLIC", label: "Métabolique" },
  { value: "RACE_SIM", label: "Simulation course" },
];

const LEVELS: { value: "all" | SessionLevel; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "beginner", label: "Débutant" },
  { value: "standard", label: "Standard" },
  { value: "staff", label: "Staff" },
  { value: "elite", label: "Élite" },
];

export function StaffSessionLibrary({ athlete }: StaffSessionLibraryProps) {
  const [sport, setSport] = useState<SportType | "all">("all");
  const [tag, setTag] = useState<"all" | SessionTag>("all");
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | SessionLevel>("all");

  const sessions = useMemo(() => {
    return getStaffSessions({
      sport: sport === "all" ? undefined : sport,
      tag: tag === "all" ? undefined : tag,
      level: levelFilter === "all" ? undefined : levelFilter,
      query,
    });
  }, [sport, tag, query, levelFilter]);

  const counts = useMemo(() => {
    const lvl = levelFilter === "all" ? undefined : levelFilter;
    const all = getStaffSessions({ level: lvl });
    const velo = getStaffSessions({ sport: "velo", level: lvl });
    const course = getStaffSessions({ sport: "course", level: lvl });
    const natation = getStaffSessions({ sport: "natation", level: lvl });
    return { all: all.length, velo: velo.length, course: course.length, natation: natation.length };
  }, [levelFilter]);

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Dumbbell className="h-5 w-5 text-primary" />
              Bibliothèque de séances — Staff Ready
            </CardTitle>
            <Badge variant="secondary" className="shrink-0">
              {sessions.length} séance(s)
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground">
            Séances "clé en main" (quoi / pourquoi / quand / structure / indicateurs / risques).
            {athlete?.nom ? ` • Athlète: ${athlete.nom}` : ""}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
            Fiches de référence coach à titre pédagogique — le générateur IA ne pioche pas dans
            cette liste pour composer les plans.
            <Link to="/planning/library" className="inline-flex items-center gap-1 text-primary hover:underline shrink-0">
              Voir la bibliothèque complète (IA) <ExternalLink className="h-3 w-3" />
            </Link>
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Filtres */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Sport</p>
              <div className="flex flex-wrap gap-2">
                {(["all", "velo", "course", "natation"] as const).map((s) => {
                  const Icon = sportIcon[s];
                  const active = sport === s;
                  const badge =
                    s === "all" ? counts.all : s === "velo" ? counts.velo : s === "course" ? counts.course : counts.natation;

                  return (
                    <Button
                      key={s}
                      size="sm"
                      variant={active ? "default" : "outline"}
                      onClick={() => setSport(s)}
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {sportLabel[s]}
                      <span className={cn("ml-1 text-xs opacity-80", active ? "text-primary-foreground" : "text-muted-foreground")}>
                        ({badge})
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Tag</p>
              <Select value={tag} onValueChange={(v) => setTag(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrer par tag" />
                </SelectTrigger>
                <SelectContent>
                  {TAGS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="space-y-2 pt-1">
                <p className="text-xs text-muted-foreground">Niveau</p>
                <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filtrer par niveau" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => (
                      <SelectItem key={l.value} value={l.value}>
                        {l.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Recherche</p>
              <div className="relative">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ex: TTE, sweet spot, IM, départ..."
                  className="pl-9"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Recherche sur titre + objectif + structure.
              </p>
            </div>
          </div>

          {/* Liste */}
          {sessions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Aucun résultat avec ces filtres.
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {sessions.map((s) => {
                const Icon = sportIcon[s.sport];
                return (
                  <AccordionItem key={s.id} value={s.id} className="border-b border-border/50">
                    <AccordionTrigger className="px-2 py-3 hover:no-underline">
                      <div className="flex items-center gap-3 flex-1">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{s.title}</span>
                            <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", sportChipClass[s.sport])}>
                              {sportLabel[s.sport]}
                            </Badge>
                            {s.level !== "standard" && (
                              <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0",
                                s.level === "elite" && "bg-red-500/10 text-red-500 border-red-500/20",
                                s.level === "beginner" && "bg-green-500/10 text-green-500 border-green-500/20"
                              )}>
                                {s.level === "elite" ? "Élite" : s.level === "beginner" ? "Débutant" : "Staff"}
                              </Badge>
                            )}
                            {typeof s.duration_min === "number" && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                ~{s.duration_min} min
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-muted-foreground mt-1">
                            {s.objective}
                          </p>

                          <div className="flex flex-wrap gap-1 mt-2">
                            {s.tags.slice(0, 4).map((t) => (
                              <Badge key={t} variant="outline" className="text-[10px] px-1.5 py-0">
                                {t}
                              </Badge>
                            ))}
                            {s.tags.length > 4 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                +{s.tags.length - 4}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-2 pb-4">
                      <div className="grid gap-3">
                        <Card className="border-border/50">
                          <CardContent className="p-4 space-y-3">
                            <div>
                              <p className="text-xs text-muted-foreground">Pourquoi</p>
                              <p className="text-sm">{s.why}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Quand</p>
                              <p className="text-sm">{s.when}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Structure</p>
                              <p className="text-sm whitespace-pre-line">{s.structure}</p>
                            </div>
                          </CardContent>
                        </Card>

                        <div className="grid md:grid-cols-2 gap-3">
                          <Card className="border-border/50">
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm">Indicateurs (à surveiller)</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 pb-4">
                              <ul className="text-sm text-muted-foreground space-y-1">
                                {s.indicators.map((x, i) => (
                                  <li key={i}>• {x}</li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>

                          <Card className="border-border/50">
                            <CardHeader className="py-3">
                              <CardTitle className="text-sm">Risques / erreurs</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 pb-4">
                              <ul className="text-sm text-muted-foreground space-y-1">
                                {s.risks.map((x, i) => (
                                  <li key={i}>• {x}</li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {s.tags.map((t) => (
                            <Badge key={t} variant="secondary">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default StaffSessionLibrary;
