// Training Load Page — CTL/ATL/TSB par athlète, global + par sport, alimenté par Nolio.
import { useState, useEffect, useMemo, useCallback } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAthletes } from "@/contexts/AthleteContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Info, AlertTriangle } from "lucide-react";
import {
  computePmcAllSports,
  detectSyncGap,
  type SportBucket,
  type PmcSeries,
} from "@/lib/v2/trainingLoadModel";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";

type DailyRow = { date: string; sport: SportBucket; tss: number };

const SPORT_COLORS: Record<SportBucket, { ctl: string; atl: string; tsb: string }> = {
  global: { ctl: "hsl(210 80% 50%)", atl: "hsl(20 90% 55%)",  tsb: "hsl(140 60% 45%)" },
  swim:   { ctl: "hsl(190 70% 45%)", atl: "hsl(20 90% 55%)",  tsb: "hsl(140 60% 45%)" },
  bike:   { ctl: "hsl(35 90% 50%)",  atl: "hsl(0 80% 55%)",   tsb: "hsl(140 60% 45%)" },
  run:    { ctl: "hsl(280 60% 55%)", atl: "hsl(20 90% 55%)",  tsb: "hsl(140 60% 45%)" },
  other:  { ctl: "hsl(0 0% 50%)",    atl: "hsl(0 0% 30%)",    tsb: "hsl(140 60% 45%)" },
};

export default function TrainingLoadPage() {
  const { currentAthlete } = useAthletes();
  const [rows, setRows] = useState<DailyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [backfilling, setBackfilling] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    if (!currentAthlete) return;
    setLoading(true);
    const from = new Date(Date.now() - 130 * 86400_000).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("daily_training_load")
      .select("date, sport, tss")
      .eq("athlete_id", currentAthlete.id)
      .gte("date", from)
      .order("date", { ascending: true });
    if (error) setLastError(error.message);
    else setRows((data ?? []).map((r: any) => ({ date: r.date, sport: r.sport, tss: Number(r.tss) })));
    setLoading(false);
  }, [currentAthlete]);

  useEffect(() => { loadRows(); }, [loadRows]);

  const runBackfill = useCallback(async (allAthletes: boolean) => {
    setBackfilling(true);
    setLastError(null);
    try {
      const body: Record<string, unknown> = { days: 120 };
      if (!allAthletes && currentAthlete) body.athlete_id = currentAthlete.id;
      if (allAthletes) body.all_athletes = true;
      const { data, error } = await supabase.functions.invoke("nolio-training-load", { body });
      if (error) throw error;
      toast({
        title: "Backfill terminé",
        description: `${(data as any)?.total_rows_upserted ?? 0} lignes, ${(data as any)?.athletes_processed ?? 0} athlète(s)`,
      });
      await loadRows();
    } catch (e: any) {
      setLastError(e?.message ?? String(e));
      toast({ title: "Backfill échoué", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setBackfilling(false);
    }
  }, [currentAthlete, loadRows]);

  const series: PmcSeries | null = useMemo(() => {
    if (rows.length === 0) return null;
    // Force start = 120 days ago, end = today, so trous = repos réel
    const end = new Date().toISOString().slice(0, 10);
    const start = new Date(Date.now() - 120 * 86400_000).toISOString().slice(0, 10);
    return computePmcAllSports(rows, { startDate: start, endDate: end });
  }, [rows]);

  const syncGap = useMemo(() => {
    const globalRows = rows.filter((r) => r.sport === "global").map((r) => ({ date: r.date, tss: r.tss }));
    return detectSyncGap(globalRows);
  }, [rows]);


  if (!currentAthlete) {
    return (
      <AppLayout title="Charge d'entraînement">
        <div className="p-6">
          <Alert><AlertDescription>Sélectionne un athlète pour visualiser la charge d'entraînement.</AlertDescription></Alert>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Charge d'entraînement">
      <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Charge d'entraînement — {currentAthlete.name}</h1>
            <p className="text-sm text-muted-foreground">
              CTL (42j) / ATL (7j) / TSB, par sport et global. Source : séances réalisées Nolio (load_coggan / load_foster).
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={loadRows} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Recharger
            </Button>
            <Button size="sm" onClick={() => runBackfill(false)} disabled={backfilling}>
              {backfilling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Backfill 120j (cet athlète)
            </Button>
            <Button size="sm" variant="secondary" onClick={() => runBackfill(true)} disabled={backfilling}>
              Backfill 120j (tous)
            </Button>
          </div>
        </div>

        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription className="text-xs">
            Les jours sans séance Nolio comptent comme <b>TSS = 0</b> (repos réel), pas comme donnée manquante.
            Un athlète qui oublie de sync verra apparaître un faux "repos". Le TSS natation/renfo est souvent approximatif
            (pas de puissance) — juge la fiabilité sport par sport.
          </AlertDescription>
        </Alert>

        {lastError && (
          <Alert variant="destructive"><AlertDescription>{lastError}</AlertDescription></Alert>
        )}

        {syncGap.flagged && (
          <Alert variant="destructive">
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <b>Sync possiblement interrompue.</b> {syncGap.reason}
              {syncGap.lastActiveDate && <> Dernière séance connue : {syncGap.lastActiveDate}.</>}
              {" "}Le TSB affiché ci-dessous n'est probablement PAS un vrai signal de fraîcheur.
            </AlertDescription>
          </Alert>
        )}

        {!series || rows.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              Aucune donnée. Lance un backfill pour importer les 120 derniers jours depuis Nolio.
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="global">
            <TabsList>
              {(["global", "swim", "bike", "run", "other"] as SportBucket[]).map((b) => (
                <TabsTrigger key={b} value={b}>{labelFor(b)}</TabsTrigger>
              ))}
            </TabsList>
            {(["global", "swim", "bike", "run", "other"] as SportBucket[]).map((b) => (
              <TabsContent key={b} value={b}>
                <SportChart bucket={b} series={series[b]} />
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </AppLayout>
  );
}

function labelFor(b: SportBucket): string {
  if (b === "global") return "Global";
  if (b === "swim") return "Natation";
  if (b === "bike") return "Vélo";
  if (b === "run") return "Course";
  return "Autre";
}

function SportChart({ bucket, series }: { bucket: SportBucket; series: PmcSeries[SportBucket] }) {
  const colors = SPORT_COLORS[bucket];
  const last = series[series.length - 1];
  const totalTss = series.reduce((s, p) => s + p.tss, 0);
  const activeDays = series.filter((p) => p.tss > 0).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex flex-wrap items-baseline gap-3">
          <span>{labelFor(bucket)}</span>
          {last && (
            <>
              <Badge variant="outline">CTL {last.ctl.toFixed(1)}</Badge>
              <Badge variant="outline">ATL {last.atl.toFixed(1)}</Badge>
              <Badge variant={last.tsb >= 0 ? "default" : "destructive"}>TSB {last.tsb.toFixed(1)}</Badge>
              <span className="text-xs text-muted-foreground ml-auto">
                {activeDays} j actifs / {series.length} • Σ TSS {Math.round(totalTss)}
              </span>
            </>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[360px] w-full">
          <ResponsiveContainer>
            <LineChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={30} />
              <YAxis yAxisId="load" tick={{ fontSize: 10 }} />
              <YAxis yAxisId="tsb" orientation="right" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                formatter={(v: number, name: string) => [Number(v).toFixed(1), name]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine yAxisId="tsb" y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Line yAxisId="load" type="monotone" dataKey="ctl" name="CTL (42j)" stroke={colors.ctl} strokeWidth={2} dot={false} />
              <Line yAxisId="load" type="monotone" dataKey="atl" name="ATL (7j)" stroke={colors.atl} strokeWidth={2} dot={false} />
              <Line yAxisId="tsb" type="monotone" dataKey="tsb" name="TSB" stroke={colors.tsb} strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
