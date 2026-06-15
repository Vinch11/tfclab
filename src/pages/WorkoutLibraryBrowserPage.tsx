/**
 * WorkoutLibraryBrowserPage — Vue complète de la bibliothèque de séances TFCL™
 * Filtrage par sport, phase, type, objectif avec détail des structures
 */

import { useEffect, useState, useMemo } from "react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, ChevronDown, Bike, PersonStanding, Waves, Dumbbell, Zap, Library, Pencil, CheckCircle2 } from "lucide-react";
import { WorkoutLibrary } from "@/lib/workoutLibrary";
import type { LibraryWorkout, TrainingSport, SessionType, PhaseTag } from "@/types/workoutLibrary";
import { NolioStructureEditor, NOLIO_SPORT_OPTIONS } from "@/components/NolioStructureEditor";
import { NolioBatchGenerationPanel, useNolioGeneratedStatuses, type GeneratedRow } from "@/components/NolioBatchGenerationPanel";
import { supabase } from "@/integrations/supabase/client";


const SPORT_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  bike: { label: "Vélo", icon: <Bike className="h-4 w-4" />, color: "bg-amber-500/15 text-amber-700 border-amber-300" },
  cyclisme: { label: "Vélo", icon: <Bike className="h-4 w-4" />, color: "bg-amber-500/15 text-amber-700 border-amber-300" },
  run: { label: "Course", icon: <PersonStanding className="h-4 w-4" />, color: "bg-green-500/15 text-green-700 border-green-300" },
  course: { label: "Course", icon: <PersonStanding className="h-4 w-4" />, color: "bg-green-500/15 text-green-700 border-green-300" },
  swim: { label: "Natation", icon: <Waves className="h-4 w-4" />, color: "bg-blue-500/15 text-blue-700 border-blue-300" },
  natation: { label: "Natation", icon: <Waves className="h-4 w-4" />, color: "bg-blue-500/15 text-blue-700 border-blue-300" },
  strength: { label: "Renforcement", icon: <Dumbbell className="h-4 w-4" />, color: "bg-rose-500/15 text-rose-700 border-rose-300" },
  mixed: { label: "Mixte", icon: <Zap className="h-4 w-4" />, color: "bg-purple-500/15 text-purple-700 border-purple-300" },
  brick: { label: "Brick", icon: <Zap className="h-4 w-4" />, color: "bg-orange-500/15 text-orange-700 border-orange-300" },
};

const PHASE_COLORS: Record<string, string> = {
  base: "bg-emerald-500/15 text-emerald-700 border-emerald-300",
  build: "bg-amber-500/15 text-amber-700 border-amber-300",
  peak: "bg-red-500/15 text-red-700 border-red-300",
  taper: "bg-sky-500/15 text-sky-700 border-sky-300",
};

const TYPE_COLORS: Record<string, string> = {
  A: "bg-green-100 text-green-800",
  B: "bg-yellow-100 text-yellow-800",
  C: "bg-red-100 text-red-800",
  D: "bg-purple-100 text-purple-800",
  REST: "bg-gray-100 text-gray-600",
  "Récup": "bg-sky-100 text-sky-700",
  SV1: "bg-emerald-100 text-emerald-700",
  LT1: "bg-amber-100 text-amber-700",
  TT: "bg-orange-100 text-orange-700",
  VO2: "bg-red-100 text-red-700",
  Sprint: "bg-pink-100 text-pink-700",
  Brique: "bg-purple-100 text-purple-700",
  "Race-Sim": "bg-indigo-100 text-indigo-700",
};

function normalizeSport(s: string): string {
  if (s === "cyclisme") return "bike";
  if (s === "course") return "run";
  if (s === "natation") return "swim";
  return s;
}

export default function WorkoutLibraryBrowserPage() {
  const [activeTab, setActiveTab] = useState("planning");
  const [staffMode, setStaffMode] = useState(() => localStorage.getItem("vlab-staff-mode") === "true");
  const [search, setSearch] = useState("");
  const [sportFilter, setSportFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [goalFilter, setGoalFilter] = useState("all");

  // Extract unique values
  const { sports, types, phases, goals } = useMemo(() => {
    const sports = new Set<string>();
    const types = new Set<string>();
    const phases = new Set<string>();
    const goals = new Set<string>();
    WorkoutLibrary.forEach(w => {
      sports.add(normalizeSport(w.sport));
      types.add(w.cat);
      w.phase?.forEach(p => phases.add(p));
      w.goals?.forEach(g => goals.add(g));
    });
    return {
      sports: Array.from(sports).sort(),
      types: Array.from(types).sort(),
      phases: Array.from(phases).sort(),
      goals: Array.from(goals).sort(),
    };
  }, []);

  // Overrides Nolio existants (set des session_id)
  const [overrideIds, setOverrideIds] = useState<Set<string>>(new Set());
  const refreshOverrides = async () => {
    const { data } = await supabase
      .from("nolio_workout_overrides")
      .select("session_id");
    setOverrideIds(new Set((data ?? []).map((r: { session_id: string }) => r.session_id)));
  };
  useEffect(() => { refreshOverrides(); }, []);

  // Statuts génération IA Nolio
  const { map: generatedMap, refresh: refreshGenerated } = useNolioGeneratedStatuses();




  const filtered = useMemo(() => {
    return WorkoutLibrary.filter(w => {
      if (sportFilter !== "all" && normalizeSport(w.sport) !== sportFilter) return false;
      if (phaseFilter !== "all" && !w.phase?.includes(phaseFilter as PhaseTag)) return false;
      if (typeFilter !== "all" && w.cat !== typeFilter) return false;
      if (goalFilter !== "all" && !w.goals?.includes(goalFilter as any)) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          w.id.toLowerCase().includes(q) ||
          w.objectif.toLowerCase().includes(q) ||
          w.structure.some(s => s.text.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [search, sportFilter, phaseFilter, typeFilter, goalFilter]);

  // Stats
  const stats = useMemo(() => {
    const bySport: Record<string, number> = {};
    WorkoutLibrary.forEach(w => {
      const k = normalizeSport(w.sport);
      bySport[k] = (bySport[k] || 0) + 1;
    });
    return bySport;
  }, []);

  return (
    <SidebarLayout activeTab={activeTab} onTabChange={setActiveTab} staffMode={staffMode} onStaffModeChange={setStaffMode}>
      <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Library className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Bibliothèque des Séances TFCL™</h1>
              <p className="text-sm text-muted-foreground">
                {WorkoutLibrary.length} séances disponibles pour les plans IA (dont variantes programmatiques)
              </p>
            </div>
          </div>
          {/* Compteur structures Nolio générées */}
          {(() => {
            const okCount = Array.from(generatedMap.values()).filter((g) => g.status === "ok").length;
            const total = WorkoutLibrary.length;
            const pct = total > 0 ? Math.round((okCount / total) * 100) : 0;
            return (
              <div className="flex flex-col items-end gap-1 min-w-[220px]">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-emerald-600 font-semibold">✅ {okCount} / {total}</span>
                  <span className="text-muted-foreground">séances structurées Nolio</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[10px] text-muted-foreground">{pct}% du catalogue</span>
              </div>
            );
          })()}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {Object.entries(stats).map(([sport, count]) => {
            const info = SPORT_LABELS[sport];
            return (
              <Card key={sport} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSportFilter(sportFilter === sport ? "all" : sport)}>
                <CardContent className="p-3 flex items-center gap-2">
                  <span className={`p-1.5 rounded ${info?.color || "bg-muted"}`}>
                    {info?.icon || <Zap className="h-4 w-4" />}
                  </span>
                  <div>
                    <p className="text-lg font-bold text-foreground">{count}</p>
                    <p className="text-xs text-muted-foreground">{info?.label || sport}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par ID, objectif, contenu..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={sportFilter} onValueChange={setSportFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Sport" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous sports</SelectItem>
                  {sports.map(s => (
                    <SelectItem key={s} value={s}>{SPORT_LABELS[s]?.label || s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Phase" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes phases</SelectItem>
                  {phases.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous types</SelectItem>
                  {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={goalFilter} onValueChange={setGoalFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Objectif" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous objectifs</SelectItem>
                  {goals.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {filtered.length} séance{filtered.length > 1 ? "s" : ""} affichée{filtered.length > 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {/* Panneau de génération batch Nolio */}
        <NolioBatchGenerationPanel
          filteredWorkouts={filtered}
          generatedMap={generatedMap}
          onRefresh={refreshGenerated}
        />

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="max-h-[600px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[240px]">ID</TableHead>
                    <TableHead className="w-[80px]">Sport</TableHead>
                    <TableHead className="w-[60px]">Type</TableHead>
                    <TableHead>Objectif</TableHead>
                    <TableHead className="w-[90px]">Durée</TableHead>
                    <TableHead className="w-[100px]">Phase</TableHead>
                    <TableHead className="w-[100px]">Goals</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((w) => (
                    <WorkoutRow
                      key={w.id}
                      workout={w}
                      hasOverride={overrideIds.has(w.id)}
                      generated={generatedMap.get(w.id)}
                      onOverrideChanged={refreshOverrides}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}

function defaultNolioSportId(sport: string): number {
  const s = normalizeSport(sport);
  if (s === "run") return 2;
  if (s === "bike") return 14;
  if (s === "swim") return 19;
  if (s === "strength") return 20;
  if (s === "trail") return 52;
  return 2;
}

function WorkoutRow({
  workout: w,
  hasOverride,
  generated,
  onOverrideChanged,
}: {
  workout: LibraryWorkout;
  hasOverride: boolean;
  generated?: GeneratedRow;
  onOverrideChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const sportInfo = SPORT_LABELS[normalizeSport(w.sport)];




  return (
    <>
      <Collapsible asChild open={open} onOpenChange={setOpen}>
        <>
          <CollapsibleTrigger asChild>
            <TableRow className="cursor-pointer hover:bg-muted/50">
              <TableCell className="font-mono text-xs">
                <div className="flex items-center gap-1 flex-wrap">
                  <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-0" : "-rotate-90"}`} />
                  {w.id}
                  {hasOverride && (
                    <span title="Structure Nolio personnalisée (override coach)" className="inline-flex items-center gap-0.5 text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                    </span>
                  )}
                </div>
                <div className="mt-1">
                  {generated?.status === "ok" ? (
                    <Badge className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300 border" title="Structure Nolio générée par IA">
                      ✅ Structure Nolio générée
                    </Badge>
                  ) : generated?.status === "error" ? (
                    <Badge variant="destructive" className="text-[10px]" title={generated.error_message ?? ""}>
                      ⚠️ Erreur génération
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      ⚪ Non structurée
                    </Badge>
                  )}
                </div>
              </TableCell>

              <TableCell>
                <Badge variant="outline" className={`text-xs ${sportInfo?.color || ""}`}>
                  {sportInfo?.label || w.sport}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge className={`text-xs ${TYPE_COLORS[w.cat] || "bg-muted"}`}>{w.cat}</Badge>
              </TableCell>
              <TableCell className="text-sm">{w.objectif}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {w.durationMin[0]}–{w.durationMin[1]} min
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {w.phase?.map(p => (
                    <Badge key={p} variant="outline" className={`text-[10px] ${PHASE_COLORS[p] || ""}`}>{p}</Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1 flex-wrap">
                  {w.goals?.slice(0, 3).map(g => (
                    <Badge key={g} variant="outline" className="text-[10px]">{g}</Badge>
                  ))}
                  {(w.goals?.length || 0) > 3 && (
                    <Badge variant="outline" className="text-[10px]">+{w.goals!.length - 3}</Badge>
                  )}
                </div>
              </TableCell>
            </TableRow>
          </CollapsibleTrigger>
          <CollapsibleContent asChild>
            <TableRow className="bg-muted/30">
              <TableCell colSpan={7} className="p-4">
                <div className="space-y-3">
                  {/* Structure */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Structure</p>
                    <div className="space-y-1">
                      {w.structure.map((s, i) => (
                        <div key={i} className="flex gap-2 text-sm">
                          <Badge variant="outline" className="text-[10px] shrink-0 self-start mt-0.5">{s.part}</Badge>
                          <span className="text-foreground">{s.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Métadonnées */}
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span><strong>Metric:</strong> {w.metricKey}</span>
                    <span><strong>Sport key:</strong> {w.sportKey}</span>
                    <span><strong>Nécessité:</strong> {w.necessite}</span>
                    <span><strong>Quand:</strong> {w.when}</span>
                    <span><strong>Éviter:</strong> {w.avoid}</span>
                    {w.dPlusTargetM && (
                      <span><strong>D+:</strong> {typeof w.dPlusTargetM === "number" ? `${w.dPlusTargetM}m` : `${w.dPlusTargetM.min}–${w.dPlusTargetM.max}m`}</span>
                    )}
                  </div>

                  {/* Variantes */}
                  {Object.keys(w.variants).length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Variantes par objectif</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                        {Object.entries(w.variants).map(([goal, text]) => (
                          <div key={goal} className="text-xs">
                            <Badge variant="outline" className="text-[10px] mr-1">{goal}</Badge>
                            <span className="text-muted-foreground">{text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {w.notes && (
                    <p className="text-xs text-muted-foreground italic">📝 {w.notes}</p>
                  )}

                  {/* Edit Nolio structure */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      variant={hasOverride ? "default" : "outline"}
                      onClick={(e) => { e.stopPropagation(); setEditorOpen(true); }}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      {hasOverride ? "Modifier structure Nolio" : "Éditer structure Nolio"}
                    </Button>
                    {hasOverride && (
                      <span className="text-xs text-emerald-600 inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Structure Nolio personnalisée
                      </span>
                    )}
                  </div>
                </div>
              </TableCell>
            </TableRow>
          </CollapsibleContent>
        </>
      </Collapsible>
      {editorOpen && (
        <NolioStructureEditor
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          sessionId={w.id}
          sessionLabel={w.objectif}
          defaultSportId={defaultNolioSportId(w.sport)}
          defaultStructure={w.structure}
          onSaved={onOverrideChanged}
        />
      )}
    </>
  );
}


