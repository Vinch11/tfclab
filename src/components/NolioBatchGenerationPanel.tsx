/**
 * NolioBatchGenerationPanel
 * Permet au coach de générer par lots de 10 ou 20 les structures Nolio pour la bibliothèque.
 * Sélection basée sur les filtres déjà appliqués à la table.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Sparkles, RotateCw, Loader2, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import type { LibraryWorkout } from "@/types/workoutLibrary";

export type GeneratedStatus = "ok" | "error" | "pending" | "needs_review";

export interface GeneratedRow {
  workout_id: string;
  status: GeneratedStatus;
  error_message: string | null;
  sport_id: number;
  updated_at: string;
}

function normalizeSport(s: string): string {
  if (s === "cyclisme") return "bike";
  if (s === "course") return "run";
  if (s === "natation") return "swim";
  return s;
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

function workoutToText(w: LibraryWorkout): string {
  const lines: string[] = [];
  lines.push(`Objectif : ${w.objectif}`);
  lines.push(`Durée : ${w.durationMin[0]}-${w.durationMin[1]} min`);
  for (const s of w.structure) {
    lines.push(`[${s.part}] ${s.text}${s.zones?.length ? ` (zones: ${s.zones.join(", ")})` : ""}`);
  }
  if (w.notes) lines.push(`Notes : ${w.notes}`);
  return lines.join("\n");
}

interface Props {
  filteredWorkouts: LibraryWorkout[];
  generatedMap: Map<string, GeneratedRow>;
  onRefresh: () => void;
}

export function NolioBatchGenerationPanel({ filteredWorkouts, generatedMap, onRefresh }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number; ok: number; err: number; cost: number } | null>(null);

  // Refs athlète par défaut (modifiables par le coach)
  const [ftp, setFtp] = useState(280);
  const [fcMax, setFcMax] = useState(185);
  const [vma, setVma] = useState(18);
  const [css, setCss] = useState(95);

  const counts = useMemo(() => {
    let ok = 0, err = 0, none = 0;
    for (const w of filteredWorkouts) {
      const g = generatedMap.get(w.id);
      if (!g) none += 1;
      else if (g.status === "ok") ok += 1;
      else if (g.status === "error") err += 1;
    }
    return { ok, err, none, total: filteredWorkouts.length };
  }, [filteredWorkouts, generatedMap]);

  const pickNextBatch = (size: number, forceRegenerate = false): LibraryWorkout[] => {
    const out: LibraryWorkout[] = [];
    for (const w of filteredWorkouts) {
      if (out.length >= size) break;
      const g = generatedMap.get(w.id);
      if (forceRegenerate) {
        out.push(w);
      } else if (!g || g.status === "error") {
        out.push(w);
      }
    }
    return out;
  };

  /** Pick N par sport (bike, run, swim, strength, brick) pour test qualité. */
  const pickTestBatchBySport = (perSport: number, forceRegenerate = false): LibraryWorkout[] => {
    const targets = ["bike", "run", "swim", "strength", "brick"];
    const out: LibraryWorkout[] = [];
    for (const target of targets) {
      let taken = 0;
      for (const w of filteredWorkouts) {
        if (taken >= perSport) break;
        if (normalizeSport(w.sport) !== target) continue;
        const g = generatedMap.get(w.id);
        if (!forceRegenerate && g?.status === "ok") continue;
        out.push(w);
        taken += 1;
      }
    }
    return out;
  };
  /** Pick N séances d'un sport précis (force regen possible). */
  const pickBatchForSport = (sport: string, n: number, forceRegenerate = false): LibraryWorkout[] => {
    const out: LibraryWorkout[] = [];
    for (const w of filteredWorkouts) {
      if (out.length >= n) break;
      if (normalizeSport(w.sport) !== sport) continue;
      if (!forceRegenerate) {
        const g = generatedMap.get(w.id);
        if (g?.status === "ok") continue;
      }
      out.push(w);
    }
    return out;
  };


  const runBatch = async (batch: LibraryWorkout[], forceRegenerate = false, chunkSize = 8) => {
    if (batch.length === 0) {
      toast({ title: "Rien à générer", description: "Toutes les séances éligibles ont déjà un statut OK." });
      return;
    }

    setLoading(true);
    setLastResult(null);
    setProgress({ done: 0, total: batch.length, ok: 0, err: 0, cost: 0 });
    try {
      const CHUNK_SIZE = chunkSize;
      const chunks: LibraryWorkout[][] = [];
      for (let i = 0; i < batch.length; i += CHUNK_SIZE) chunks.push(batch.slice(i, i + CHUNK_SIZE));

      let totOk = 0, totErr = 0, totSkip = 0, totCost = 0, totDone = 0;

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        setLastResult(`⏳ Chunk ${i + 1}/${chunks.length} · ${totDone}/${batch.length} séances structurées...`);

        const payload = {
          force_regenerate: forceRegenerate,
          workouts: chunk.map((w) => ({
            workout_id: w.id,
            sessionLabel: w.objectif,
            sport: w.sport,
            defaultSportId: defaultNolioSportId(w.sport),
            workoutText: workoutToText(w),
            ftp, fcMax, vma, css,
          })),
        };

        try {
          const { data, error } = await supabase.functions.invoke("nolio-batch-generate", { body: payload });
          if (error) throw error;
          totOk += data.ok ?? 0;
          totErr += data.error ?? 0;
          totSkip += data.skipped ?? 0;
          totCost += Number(data.total_cost_usd ?? 0);
        } catch (chunkErr) {
          const msg = chunkErr instanceof Error ? chunkErr.message : String(chunkErr);
          console.error(`[batch] chunk ${i + 1} failed:`, msg);
          totErr += chunk.length;
        }

        totDone += chunk.length;
        setProgress({ done: totDone, total: batch.length, ok: totOk, err: totErr, cost: totCost });
        onRefresh();
      }

      const summary = `✅ ${totOk} succès · ⚠️ ${totErr} erreurs · ⏭️ ${totSkip} skip · 💸 $${totCost.toFixed(4)} · ${chunks.length} chunks · ${batch.length} séances`;
      setLastResult(summary);
      toast({ title: `Batch terminé`, description: summary });
      onRefresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Erreur batch", description: msg, variant: "destructive" });
      setLastResult(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  /** Toutes les séances non encore générées avec statut ok. */
  const pickAllRemaining = (): LibraryWorkout[] => {
    return filteredWorkouts.filter((w) => {
      const g = generatedMap.get(w.id);
      return !g || g.status !== "ok";
    });
  };


  return (
    <Card className="border-primary/30">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Génération Nolio batch (IA)
                <Badge variant="outline" className="ml-2 text-[10px]">
                  {counts.ok}/{counts.total} générées
                </Badge>
                {counts.err > 0 && (
                  <Badge variant="destructive" className="text-[10px]">{counts.err} err</Badge>
                )}
                {counts.none > 0 && (
                  <Badge variant="secondary" className="text-[10px]">{counts.none} non générées</Badge>
                )}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Sélectionne les filtres ci-dessous, ajuste les refs athlète si besoin, puis lance un lot.
              Le batch traite uniquement les séances <strong>non générées ou en erreur</strong> dans la sélection (sauf « regénérer la sélection »).
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <label className="text-xs flex flex-col gap-1">
                <span className="text-muted-foreground">FTP (W)</span>
                <input type="number" value={ftp} onChange={(e) => setFtp(Number(e.target.value) || 0)}
                  className="px-2 py-1 border rounded text-sm bg-background" />
              </label>
              <label className="text-xs flex flex-col gap-1">
                <span className="text-muted-foreground">FC max (bpm)</span>
                <input type="number" value={fcMax} onChange={(e) => setFcMax(Number(e.target.value) || 0)}
                  className="px-2 py-1 border rounded text-sm bg-background" />
              </label>
              <label className="text-xs flex flex-col gap-1">
                <span className="text-muted-foreground">VMA (km/h)</span>
                <input type="number" step="0.1" value={vma} onChange={(e) => setVma(Number(e.target.value) || 0)}
                  className="px-2 py-1 border rounded text-sm bg-background" />
              </label>
              <label className="text-xs flex flex-col gap-1">
                <span className="text-muted-foreground">CSS (s/100m)</span>
                <input type="number" value={css} onChange={(e) => setCss(Number(e.target.value) || 0)}
                  className="px-2 py-1 border rounded text-sm bg-background" />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="default" onClick={() => runBatch(pickTestBatchBySport(5))} disabled={loading}>
                {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                🧪 Test 25 (5/sport)
              </Button>
              <Button size="sm" variant="secondary" onClick={() => runBatch(pickBatchForSport("swim", 5, true), true)} disabled={loading}>
                {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RotateCw className="h-3 w-3 mr-1" />}
                🌊 Régénérer 5 natation (force)
              </Button>
              <Button size="sm" variant="secondary" onClick={() => {
                const nonSwim: LibraryWorkout[] = [];
                for (const sport of ["bike", "run", "strength", "brick"]) {
                  nonSwim.push(...pickBatchForSport(sport, 5, true));
                }
                runBatch(nonSwim, true);
              }} disabled={loading}>
                {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RotateCw className="h-3 w-3 mr-1" />}
                🔁 Régénérer 20 non-natation (force)
              </Button>
              <Button size="sm" onClick={() => runBatch(pickNextBatch(10))} disabled={loading}>
                {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                Générer 10 prochaines
              </Button>
              <Button size="sm" onClick={() => runBatch(pickNextBatch(20))} disabled={loading}>
                {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                Générer 20 prochaines
              </Button>
              <Button size="sm" variant="outline" onClick={() => runBatch(pickNextBatch(20, true), true)} disabled={loading}>
                <RotateCw className="h-3 w-3 mr-1" />
                Regénérer 20 (force)
              </Button>
              <Button
                size="sm"
                variant="default"
                className="bg-primary"
                onClick={() => {
                  const all = pickAllRemaining();
                  if (!window.confirm(`Lancer le batch complet sur ${all.length} séances restantes ? Durée estimée ~${Math.ceil(all.length / 8 * 0.6)} min.`)) return;
                  runBatch(all, false, 10);
                }}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Rocket className="h-3 w-3 mr-1" />}
                🚀 Batch complet ({pickAllRemaining().length} restantes)
              </Button>
            </div>

            {progress && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono">
                  <span>{progress.done} / {progress.total} séances structurées</span>
                  <span className="text-muted-foreground">
                    ✅ {progress.ok} · ⚠️ {progress.err} · 💸 ${progress.cost.toFixed(4)}
                  </span>
                </div>
                <Progress value={(progress.done / Math.max(progress.total, 1)) * 100} />
              </div>
            )}

            {lastResult && (
              <div className="text-xs p-2 rounded bg-muted/40 font-mono">{lastResult}</div>
            )}

            <p className="text-[10px] text-muted-foreground">
              Modèle : google/gemini-2.5-pro · chunks de 8-10 séances · erreurs loggées sans bloquer le batch.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

/** Hook : charge les statuts de génération pour toutes les séances de la lib. */
export function useNolioGeneratedStatuses() {
  const [map, setMap] = useState<Map<string, GeneratedRow>>(new Map());

  const refresh = async () => {
    const { data } = await supabase
      .from("nolio_structures_generated")
      .select("workout_id, status, error_message, sport_id, updated_at");
    const m = new Map<string, GeneratedRow>();
    for (const r of (data ?? []) as GeneratedRow[]) m.set(r.workout_id, r);
    setMap(m);
  };

  useEffect(() => { refresh(); }, []);

  return { map, refresh };
}
