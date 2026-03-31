/**
 * PlanLibraryPage — Bibliothèque de tous les plans IA sauvegardés
 * Permet de consulter, filtrer par athlète, et restaurer d'anciens plans
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SidebarLayout } from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Archive, Search, RotateCcw, Trash2, Loader2,
  Calendar, ArrowLeft, FileText, User, Clock,
} from "lucide-react";
import { format, parseISO, startOfWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PlanVersion {
  id: string;
  athlete_id: string;
  coach_id: string;
  plan_json: any;
  objective: string | null;
  weeks_count: number | null;
  sessions_count: number | null;
  created_at: string;
}

interface AthleteInfo {
  id: string;
  name: string;
}

export default function PlanLibraryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("planning");
  const [staffMode, setStaffMode] = useState(() => localStorage.getItem("vlab-staff-mode") === "true");

  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const [athletes, setAthletes] = useState<AthleteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAthleteId, setFilterAthleteId] = useState<string>("all");

  // Restore state
  const [confirmRestore, setConfirmRestore] = useState<PlanVersion | null>(null);
  const [restoreStartDate, setRestoreStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [restoring, setRestoring] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Expanded plan detail
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("vlab-staff-mode", staffMode.toString());
  }, [staffMode]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [versionsRes, athletesRes] = await Promise.all([
      supabase
        .from("plan_versions")
        .select("id, athlete_id, coach_id, plan_json, objective, weeks_count, sessions_count, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("athletes")
        .select("id, name")
        .order("name"),
    ]);
    setVersions((versionsRes.data as PlanVersion[]) || []);
    setAthletes((athletesRes.data as AthleteInfo[]) || []);
    setLoading(false);
  };

  const athleteMap = useMemo(() => {
    const map: Record<string, string> = {};
    athletes.forEach((a) => (map[a.id] = a.name));
    return map;
  }, [athletes]);

  const filtered = useMemo(() => {
    let list = versions;
    if (filterAthleteId !== "all") {
      list = list.filter((v) => v.athlete_id === filterAthleteId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((v) => {
        const name = athleteMap[v.athlete_id]?.toLowerCase() || "";
        const obj = v.objective?.toLowerCase() || "";
        return name.includes(q) || obj.includes(q);
      });
    }
    return list;
  }, [versions, filterAthleteId, searchQuery, athleteMap]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from("plan_versions").delete().eq("id", id);
    if (error) toast.error("Erreur suppression");
    else {
      setVersions((prev) => prev.filter((v) => v.id !== id));
      toast.success("Version supprimée");
    }
    setDeleting(null);
  };

  const handleRestore = async (version: PlanVersion) => {
    setRestoring(version.id);
    setConfirmRestore(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");
      const plan = version.plan_json;
      if (!plan?.weeks?.length) throw new Error("Plan invalide");

      const phaseMap: Record<string, string> = {
        base: "BASE", build: "PHASE2", peak: "PHASE3",
        taper: "PHASE4", race: "RACE", off: "OFF",
      };

      const planStart = startOfWeek(restoreStartDate, { weekStartsOn: 1 });
      const rows: any[] = [];

      for (const week of plan.weeks) {
        const weekStart = addDays(planStart, ((week.weekNumber || 1) - 1) * 7);
        for (const session of week.sessions || []) {
          if (session.isRest) continue;
          const dayOffset = session.day != null ? session.day - 1 : 0;
          const sessionDate = addDays(weekStart, dayOffset);
          rows.push({
            athlete_id: version.athlete_id,
            coach_id: user.id,
            date: format(sessionDate, "yyyy-MM-dd"),
            phase: session.phase ? (phaseMap[session.phase.toLowerCase()] || "BASE") : null,
            custom_workout_title: `${session.sport || "Autre"} — ${session.title || "Séance"}`,
            custom_workout_description: session.details || null,
            status: "PLANNED",
            notes: week.theme ? `Semaine ${week.weekNumber}: ${week.theme}` : null,
          });
        }
      }

      if (rows.length === 0) throw new Error("Aucune séance dans ce plan");

      await supabase
        .from("training_plan")
        .delete()
        .eq("athlete_id", version.athlete_id);

      const { error } = await supabase.from("training_plan").insert(rows);
      if (error) throw error;

      toast.success(`Plan restauré : ${rows.length} séances pour ${athleteMap[version.athlete_id] || "l'athlète"}`);
    } catch (err: any) {
      console.error("Restore error:", err);
      toast.error("Erreur restauration : " + (err.message || "Inconnu"));
    } finally {
      setRestoring(null);
    }
  };

  const getPlanSummary = (plan: any) => {
    if (!plan?.weeks) return null;
    const sports = new Set<string>();
    let totalSessions = 0;
    for (const week of plan.weeks) {
      for (const s of week.sessions || []) {
        if (!s.isRest) {
          totalSessions++;
          if (s.sport) sports.add(s.sport);
        }
      }
    }
    return { totalWeeks: plan.weeks.length, totalSessions, sports: Array.from(sports) };
  };

  return (
    <SidebarLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      staffMode={staffMode}
      onStaffModeChange={setStaffMode}
    >
      <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/planning")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-amber-500/10">
              <Archive className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-foreground">Bibliothèque Plans IA</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {versions.length} version{versions.length > 1 ? "s" : ""} sauvegardée{versions.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Rechercher par athlète ou objectif..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
          <Select value={filterAthleteId} onValueChange={setFilterAthleteId}>
            <SelectTrigger className="w-full sm:w-48 h-9 text-sm">
              <SelectValue placeholder="Tous les athlètes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les athlètes</SelectItem>
              {athletes.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Archive className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {versions.length === 0
                  ? "Aucun plan IA sauvegardé pour le moment."
                  : "Aucun résultat pour ces filtres."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((v) => {
              const summary = getPlanSummary(v.plan_json);
              const isExpanded = expandedId === v.id;

              return (
                <Card
                  key={v.id}
                  className={cn(
                    "transition-all duration-200 hover:border-primary/30",
                    isExpanded && "border-primary/40 shadow-sm"
                  )}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      {/* Info */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : v.id)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-semibold text-sm truncate">
                            {athleteMap[v.athlete_id] || "Athlète inconnu"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                          <Clock className="h-3 w-3" />
                          {format(parseISO(v.created_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {v.objective && (
                            <Badge variant="secondary" className="text-[10px]">{v.objective}</Badge>
                          )}
                          {v.weeks_count && (
                            <Badge variant="outline" className="text-[10px]">{v.weeks_count} sem.</Badge>
                          )}
                          {v.sessions_count && (
                            <Badge variant="outline" className="text-[10px]">{v.sessions_count} séances</Badge>
                          )}
                          {summary?.sports.map((s) => (
                            <Badge key={s} variant="outline" className="text-[10px] capitalize">{s}</Badge>
                          ))}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setConfirmRestore(v)}
                          disabled={restoring === v.id}
                          title="Restaurer ce plan"
                        >
                          {restoring === v.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <RotateCcw className="h-3.5 w-3.5 text-primary" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDelete(v.id)}
                          disabled={deleting === v.id}
                          title="Supprimer"
                        >
                          {deleting === v.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && summary && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Contenu du plan</p>
                        <div className="space-y-1.5 max-h-60 overflow-y-auto">
                          {(v.plan_json?.weeks || []).map((week: any, wi: number) => (
                            <div key={wi} className="text-xs bg-muted/50 rounded-md p-2">
                              <span className="font-medium">
                                S{week.weekNumber || wi + 1}
                                {week.theme ? ` — ${week.theme}` : ""}
                              </span>
                              <span className="text-muted-foreground ml-2">
                                {(week.sessions || []).filter((s: any) => !s.isRest).length} séance(s)
                              </span>
                              {week.sessions && (
                                <div className="mt-1 ml-3 space-y-0.5">
                                  {week.sessions.filter((s: any) => !s.isRest).map((s: any, si: number) => (
                                    <div key={si} className="text-muted-foreground">
                                      J{s.day || si + 1}: <span className="text-foreground">{s.sport} — {s.title}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Restore Dialog */}
      <AlertDialog open={!!confirmRestore} onOpenChange={(o) => { if (!o) setConfirmRestore(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              Restaurer ce plan ?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Le planning actuel de{" "}
                  <span className="font-medium text-foreground">
                    {confirmRestore && (athleteMap[confirmRestore.athlete_id] || "l'athlète")}
                  </span>{" "}
                  sera remplacé par cette version
                  {confirmRestore && (
                    <span className="font-medium">
                      {" "}du {format(parseISO(confirmRestore.created_at), "d MMM yyyy", { locale: fr })}
                    </span>
                  )}.
                </p>
                <div>
                  <p className="text-sm font-medium text-foreground mb-1.5">Date de début du plan :</p>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full justify-start text-left font-normal">
                        <Calendar className="h-4 w-4 mr-2" />
                        {format(restoreStartDate, "d MMMM yyyy", { locale: fr })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarPicker
                        mode="single"
                        selected={restoreStartDate}
                        onSelect={(d) => d && setRestoreStartDate(d)}
                        locale={fr}
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmRestore && handleRestore(confirmRestore)}>
              Restaurer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SidebarLayout>
  );
}
