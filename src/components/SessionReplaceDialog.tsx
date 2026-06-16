/**
 * SessionReplaceDialog — Remplace une séance du plan IA par une séance
 * de la bibliothèque (WorkoutLibrary).
 *
 *  - Onglet "Même type" : séances de la bibliothèque du même sport,
 *    filtrables par catégorie et tags.
 *  - Onglet "Autre séance" : toute la bibliothèque, recherche texte
 *    + filtres sport / catégorie / durée.
 *
 * Remplacement local : modifie uniquement le plan affiché. La séance
 * remplacée perd son badge "envoyé".
 */
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import type { LibraryWorkout } from "@/types/workoutLibrary";

/** Mappe le sport de la bibliothèque vers le label FR utilisé dans le plan IA. */
export function libSportToPlanSport(s: string): string {
  const x = (s || "").toLowerCase();
  if (x.includes("swim") || x.includes("nat")) return "Natation";
  if (x.includes("bike") || x.includes("cyclis") || x.includes("vélo") || x.includes("velo")) return "Vélo";
  if (x.includes("run") || x.includes("course") || x.includes("cap")) return "CAP";
  if (x.includes("strength") || x.includes("renfo") || x.includes("muscu")) return "Renfo";
  if (x.includes("brick") || x.includes("brique")) return "Brick";
  if (x.includes("mixed") || x.includes("mixte")) return "Mixte";
  return s;
}

/** Compare sport de séance (FR) avec sport bibliothèque (mixte FR/EN). */
function sameSport(planSport: string, libSport: string): boolean {
  return libSportToPlanSport(planSport) === libSportToPlanSport(libSport);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSport: string;
  currentTitle: string;
  onChoose: (w: LibraryWorkout) => void;
}

function midDuration(w: LibraryWorkout): number {
  return Math.round((w.durationMin[0] + w.durationMin[1]) / 2);
}

function WorkoutRow({ w, onChoose }: { w: LibraryWorkout; onChoose: (w: LibraryWorkout) => void }) {
  const desc = w.objectif || w.structure?.[0]?.text || "";
  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-md border border-border hover:bg-muted/40 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{w.id}</span>
          <Badge variant="outline" className="text-[10px]">Cat {w.cat}</Badge>
          <Badge variant="secondary" className="text-[10px]">{libSportToPlanSport(w.sport)}</Badge>
          <Badge variant="outline" className="text-[10px]">
            {w.durationMin[0]}-{w.durationMin[1]} min
          </Badge>
        </div>
        {desc && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{desc}</p>
        )}
        {w.tags && w.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {w.tags.slice(0, 5).map((t) => (
              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
      <Button size="sm" onClick={() => onChoose(w)} className="shrink-0">
        Choisir
      </Button>
    </div>
  );
}

export function SessionReplaceDialog({
  open, onOpenChange, currentSport, currentTitle, onChoose,
}: Props) {
  // ── Onglet 1 — Même type ──
  const sameSportWorkouts = useMemo(
    () => WorkoutLibrary.filter((w) => sameSport(currentSport, w.sport)),
    [currentSport]
  );

  const sameTypeCats = useMemo(
    () => Array.from(new Set(sameSportWorkouts.map((w) => w.cat))).sort(),
    [sameSportWorkouts]
  );
  const sameTypeTags = useMemo(() => {
    const s = new Set<string>();
    sameSportWorkouts.forEach((w) => (w.tags || []).forEach((t) => s.add(t)));
    return Array.from(s).sort();
  }, [sameSportWorkouts]);

  const [stCat, setStCat] = useState<string>("all");
  const [stTag, setStTag] = useState<string>("all");

  const filteredSameType = useMemo(() => {
    return sameSportWorkouts.filter((w) => {
      if (stCat !== "all" && w.cat !== stCat) return false;
      if (stTag !== "all" && !(w.tags || []).includes(stTag)) return false;
      return true;
    });
  }, [sameSportWorkouts, stCat, stTag]);

  // ── Onglet 2 — Autre séance ──
  const allSports = useMemo(
    () => Array.from(new Set(WorkoutLibrary.map((w) => libSportToPlanSport(w.sport)))).sort(),
    []
  );
  const allCats = useMemo(
    () => Array.from(new Set(WorkoutLibrary.map((w) => w.cat))).sort(),
    []
  );

  const [search, setSearch] = useState("");
  const [aSport, setASport] = useState<string>("all");
  const [aCat, setACat] = useState<string>("all");
  const [aDur, setADur] = useState<string>("all"); // all | "0-45" | "45-90" | "90-180" | "180+"

  const filteredAll = useMemo(() => {
    const q = search.trim().toLowerCase();
    return WorkoutLibrary.filter((w) => {
      if (aSport !== "all" && libSportToPlanSport(w.sport) !== aSport) return false;
      if (aCat !== "all" && w.cat !== aCat) return false;
      if (aDur !== "all") {
        const m = midDuration(w);
        if (aDur === "0-45" && m > 45) return false;
        if (aDur === "45-90" && (m < 45 || m > 90)) return false;
        if (aDur === "90-180" && (m < 90 || m > 180)) return false;
        if (aDur === "180+" && m < 180) return false;
      }
      if (q) {
        const hay = `${w.id} ${w.objectif} ${(w.tags || []).join(" ")} ${w.structure?.map(s => s.text).join(" ") || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    }).slice(0, 200);
  }, [search, aSport, aCat, aDur]);

  const handleChoose = (w: LibraryWorkout) => {
    onChoose(w);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Remplacer la séance</DialogTitle>
          <DialogDescription className="truncate">
            Séance actuelle : <span className="font-medium text-foreground">{currentTitle}</span> ({currentSport})
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="same" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="same">Même type ({sameSportWorkouts.length})</TabsTrigger>
            <TabsTrigger value="other">Autre séance</TabsTrigger>
          </TabsList>

          <TabsContent value="same" className="flex-1 flex flex-col min-h-0 mt-3">
            <div className="flex items-end gap-2 flex-wrap pb-3">
              <div className="space-y-1">
                <Label className="text-xs">Catégorie</Label>
                <Select value={stCat} onValueChange={setStCat}>
                  <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {sameTypeCats.map((c) => (
                      <SelectItem key={c} value={c}>Cat {c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tag</Label>
                <Select value={stTag} onValueChange={setStTag}>
                  <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {sameTypeTags.map((t) => (
                      <SelectItem key={t} value={t}>#{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Badge variant="secondary" className="ml-auto text-[10px]">
                {filteredSameType.length} résultat(s)
              </Badge>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredSameType.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune séance trouvée pour ce sport avec ces filtres.
                </p>
              ) : (
                filteredSameType.map((w) => (
                  <WorkoutRow key={w.id} w={w} onChoose={handleChoose} />
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="other" className="flex-1 flex flex-col min-h-0 mt-3">
            <div className="space-y-2 pb-3">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher (nom, objectif, tag, contenu)…"
                  className="pl-8 h-9"
                />
              </div>
              <div className="flex items-end gap-2 flex-wrap">
                <div className="space-y-1">
                  <Label className="text-xs">Sport</Label>
                  <Select value={aSport} onValueChange={setASport}>
                    <SelectTrigger className="h-9 w-[130px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous</SelectItem>
                      {allSports.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Catégorie</Label>
                  <Select value={aCat} onValueChange={setACat}>
                    <SelectTrigger className="h-9 w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      {allCats.map((c) => (
                        <SelectItem key={c} value={c}>Cat {c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Durée</Label>
                  <Select value={aDur} onValueChange={setADur}>
                    <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes</SelectItem>
                      <SelectItem value="0-45">≤ 45 min</SelectItem>
                      <SelectItem value="45-90">45–90 min</SelectItem>
                      <SelectItem value="90-180">90–180 min</SelectItem>
                      <SelectItem value="180+">≥ 180 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Badge variant="secondary" className="ml-auto text-[10px]">
                  {filteredAll.length} résultat(s){filteredAll.length === 200 ? " (max)" : ""}
                </Badge>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredAll.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Aucune séance ne correspond à ces critères.
                </p>
              ) : (
                filteredAll.map((w) => (
                  <WorkoutRow key={w.id} w={w} onChoose={handleChoose} />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
