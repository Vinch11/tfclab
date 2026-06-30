// =============================================================================
// EvolutionPage — PMC (Banister) + Évolution snapshots + Records Nolio
// =============================================================================

import { useMemo, useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Info, TrendingUp, TrendingDown, Activity, Trophy, Pencil, Check, X, Plus, Trash2 } from "lucide-react";
import { useAthletes } from "@/contexts/AthleteContext";
import { useCloudDataContext } from "@/contexts/CloudDataContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { getActiveSnapshot } from "@/lib/athleteHelpers";
import { RecordsTransparencyView } from "@/components/evolution/RecordsTransparencyView";
import {
  computePMC,
  computePMCSummary,
  PMC_FORM_ZONES,
  type PMCDataPoint,
} from "@/lib/v2/pmcEngine";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
  Legend,
} from "recharts";

// ─── Helpers ────────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function deltaStr(curr: number | null | undefined, prev: number | null | undefined, unit: string): string {
  if (curr == null || prev == null) return "—";
  const d = curr - prev;
  const sign = d >= 0 ? "+" : "";
  return `${sign}${d.toFixed(unit === "mmol/L/s" ? 2 : 1)} ${unit}`;
}

export default function EvolutionPage() {
  const navigate = useNavigate();
  const { currentAthlete } = useAthletes();
  const { snapshots, getSnapshotsForAthlete, loadData } = useCloudDataContext();
  const activeSnapshot = useMemo(
    () => getActiveSnapshot(currentAthlete as any, snapshots),
    [currentAthlete, snapshots],
  );

  if (!currentAthlete) {
    return (
      <AppLayout title="Évolution" showBack>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Sélectionnez un athlète</p>
            <Button onClick={() => navigate("/")} className="mt-4">Voir les athlètes</Button>
          </CardContent>
        </Card>
      </AppLayout>
    );
  }

  const athleteSnapshots = useMemo(
    () => getSnapshotsForAthlete(currentAthlete.id).slice().sort((a, b) => a.date.localeCompare(b.date)),
    [currentAthlete.id, getSnapshotsForAthlete, snapshots]
  );

  // ─── Construction des PMCDataPoints à partir des tss_7d ────────────────
  const pmcPoints = useMemo<PMCDataPoint[]>(() => {
    const pts: PMCDataPoint[] = [];
    for (const s of athleteSnapshots) {
      const t7 = (s as any).tss_7d as number | null | undefined;
      if (!t7 || t7 <= 0) continue;
      const dailyAvg = t7 / 7;
      // étend sur les 7 jours précédant la date du snapshot
      const base = new Date(s.date + "T00:00:00Z");
      for (let i = 6; i >= 0; i--) {
        const d = new Date(base);
        d.setUTCDate(d.getUTCDate() - i);
        pts.push({
          date: d.toISOString().slice(0, 10),
          tss: dailyAvg,
          sport: (s as any).sport_main === "run" ? "cap" : "velo",
        });
      }
    }
    return pts;
  }, [athleteSnapshots]);

  const pmcResults = useMemo(() => computePMC(pmcPoints, 90), [pmcPoints]);
  const pmcSummary = useMemo(() => computePMCSummary(pmcResults), [pmcResults]);

  const hasEnoughPMC = pmcResults.length >= 14 && pmcPoints.length > 0;

  // ─── Évolution snapshots 12 derniers mois ──────────────────────────────
  const cutoff = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 12);
    return d.toISOString().slice(0, 10);
  }, []);

  const recentSnapshots = useMemo(
    () => athleteSnapshots.filter(s => s.date >= cutoff),
    [athleteSnapshots, cutoff]
  );

  const metricSeries = useMemo(() => {
    const build = (key: string) => recentSnapshots
      .map(s => ({ date: s.date, value: (s as any)[key] as number | null }))
      .filter(p => p.value != null && Number.isFinite(p.value));
    return {
      ftp: build("ftp"),
      vma: build("vma"),
      css: build("css"),
      vlamax: build("vlamax"),
    };
  }, [recentSnapshots]);

  // ─── Records Nolio ──────────────────────────────────────────────────────
  const [records, setRecords] = useState<Array<{
    id: string;
    cat: string; record_type: string; item_seconds: number; value: number;
    date_recorded: string | null; sport_id: number; source: string;
  }>>([]);

  const loadRecords = useCallback(async () => {
    const { data } = await supabase
      .from("nolio_records")
      .select("id, cat, record_type, item_seconds, value, date_recorded, sport_id, source")
      .eq("athlete_id", currentAthlete.id)
      .order("item_seconds", { ascending: true });
    if (data) setRecords(data as any);
  }, [currentAthlete.id]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const BIKE_SPORTS = [14, 18];
  const RUN_SPORTS = [2, 52];
  const SWIM_SPORT = 19;

  const bikeRecords = useMemo(() => {
    const targets = [5, 30, 60, 300, 1200];
    const all = records.filter(r => r.cat === "ppr" && BIKE_SPORTS.includes(r.sport_id));
    const rows = targets.map(t => {
      const best = pickClosest(all, t);
      return { target: t, label: formatDurationLabel(t), record: best };
    });
    // Add any manual records that don't match a standard target
    const extraManual = all.filter(r =>
      r.source === "manual" && !targets.some(t => Math.abs(r.item_seconds - t) <= Math.max(2, t * 0.2))
    );
    extraManual.forEach(r => rows.push({ target: r.item_seconds, label: formatDurationLabel(r.item_seconds), record: r }));
    return rows;
  }, [records]);

  const runRecords = useMemo(() => {
    const targets = [
      { m: 400, label: "400 m", typical: 75 },
      { m: 1000, label: "1 km", typical: 200 },
      { m: 5000, label: "5 km", typical: 1100 },
      { m: 10000, label: "10 km", typical: 2400 },
      { m: 20000, label: "20 km", typical: 5400 },
    ];
    const all = records.filter(r => r.cat === "par" && RUN_SPORTS.includes(r.sport_id));
    return targets.map(t => {
      const best = pickClosest(all, t.typical);
      return { target: t.m, label: t.label, record: best };
    });
  }, [records]);

  const swimRecords = useMemo(() => {
    const targets = [
      { m: 100, label: "100 m", typical: 80 },
      { m: 200, label: "200 m", typical: 170 },
      { m: 400, label: "400 m", typical: 360 },
    ];
    const all = records.filter(r => r.cat === "par" && r.sport_id === SWIM_SPORT);
    return targets.map(t => {
      const best = pickClosest(all, t.typical);
      return { target: t.m, label: t.label, record: best };
    });
  }, [records]);

  return (
    <AppLayout title="Évolution" showBack>
      <div className="space-y-6">
        {/* ─── HEADER ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Évolution & Performance Management</h1>
            <p className="text-sm text-muted-foreground">
              {currentAthlete.name} — Modèle Banister 1991 (CTL/ATL/TSB)
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 1 — PMC CHART                                          */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Performance Management Chart (90 jours)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              CTL = Forme (chronique 42j) · ATL = Fatigue (aigüe 7j) · TSB = Fraîcheur (CTL−ATL)
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasEnoughPMC ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Pas assez de données pour calculer un PMC fiable (minimum 14 jours).
                  {pmcResults.length === 0 && " Aucun TSS hebdomadaire enregistré dans les snapshots."}
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert className="bg-muted/40">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    PMC reconstruit depuis les <code>tss_7d</code> des snapshots.
                    Précision PMC améliorée avec les données de séances Nolio.
                  </AlertDescription>
                </Alert>

                <div className="h-[360px] w-full">
                  <ResponsiveContainer>
                    <LineChart data={pmcResults} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={fmtDate}
                        tick={{ fontSize: 11 }}
                        interval={Math.max(0, Math.floor(pmcResults.length / 8))}
                      />
                      <YAxis domain={[-50, 150]} tick={{ fontSize: 11 }} />
                      <Tooltip
                        labelFormatter={fmtDate}
                        formatter={(v: number, name: string) => [v.toFixed(1), name.toUpperCase()]}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" />
                      <Line type="monotone" dataKey="ctl" name="CTL (forme)" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="atl" name="ATL (fatigue)" stroke="#ef4444" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="tsb" name="TSB (fraîcheur)" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* ─── KPIs ─────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <KpiCard
                    label="CTL actuel"
                    value={pmcSummary.currentCTL.toFixed(1)}
                    sublabel="Forme chronique (42j)"
                    color="#3b82f6"
                  />
                  <KpiCard
                    label="ATL actuel"
                    value={pmcSummary.currentATL.toFixed(1)}
                    sublabel="Fatigue aigüe (7j)"
                    color="#ef4444"
                  />
                  <KpiCard
                    label="TSB actuel"
                    value={pmcSummary.currentTSB.toFixed(1)}
                    sublabel={PMC_FORM_ZONES[pmcResults[pmcResults.length - 1].formZone].label}
                    color={pmcResults[pmcResults.length - 1].formColor}
                  />
                </div>

                {/* ─── Synthèse ────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Tendance 7j</div>
                    <div className="flex items-center gap-2 mt-1 font-semibold capitalize">
                      {pmcSummary.trend === "improving" && <TrendingUp className="h-4 w-4 text-green-600" />}
                      {pmcSummary.trend === "declining" && <TrendingDown className="h-4 w-4 text-orange-600" />}
                      {pmcSummary.trend === "overreaching" && <AlertCircle className="h-4 w-4 text-red-600" />}
                      {pmcSummary.trend}
                    </div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Score préparation course</div>
                    <div className="mt-1 font-semibold">
                      {pmcSummary.raceReadinessScore}/100
                      <span className="text-xs text-muted-foreground ml-2">— {pmcSummary.optimalRaceWindow}</span>
                    </div>
                  </div>
                </div>

                {pmcSummary.warnings.length > 0 && (
                  <div className="space-y-1">
                    {pmcSummary.warnings.map((w, i) => (
                      <Alert key={i} variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">{w}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 2 — ÉVOLUTION DES MÉTRIQUES                            */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution des métriques (12 derniers mois)</CardTitle>
            <p className="text-xs text-muted-foreground">
              Évolution des marqueurs physiologiques depuis les snapshots successifs.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <MetricChart title="FTP" unit="W" data={metricSeries.ftp} color="#3b82f6" />
              <MetricChart title="VMA" unit="km/h" data={metricSeries.vma} color="#10b981" />
              <MetricChart title="CSS" unit="m/100m" data={metricSeries.css} color="#06b6d4" />
              <MetricChart title="VLamax" unit="mmol/L/s" data={metricSeries.vlamax} color="#f97316" />
            </div>
          </CardContent>
        </Card>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* SECTION 3 — RECORDS NOLIO + manuels                             */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              🏆 Records Nolio
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Records importés depuis Nolio ou saisis manuellement par le coach (✍️).
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <RecordsBlock
                kind="bike"
                title="🚴 Vélo — Records puissance"
                rows={bikeRecords}
                formatValue={(v) => `${Math.round(v)} W`}
                parseInput={(s) => {
                  const n = parseFloat(s.replace(",", "."));
                  return Number.isFinite(n) && n > 0 ? n : null;
                }}
                editPlaceholder="watts"
                athleteId={currentAthlete.id}
                onChanged={loadRecords}
              />
              <RecordsBlock
                kind="run"
                title="🏃 Running — Records allure"
                rows={runRecords}
                formatValue={(v) => formatPaceMinPerKm(v)}
                parseInput={parsePaceMinSec}
                editPlaceholder="min:sec/km"
                athleteId={currentAthlete.id}
                onChanged={loadRecords}
              />
              <RecordsBlock
                kind="swim"
                title="🏊 Natation — Records allure"
                rows={swimRecords}
                formatValue={(v) => formatPaceMinPer100m(v)}
                parseInput={parsePaceMinSec}
                editPlaceholder="min:sec/100m"
                athleteId={currentAthlete.id}
                onChanged={loadRecords}
              />
            </div>

            {/* ─── Vue détaillée & transparente ─────────────────────── */}
            <div className="mt-8 pt-6 border-t">
              <div className="font-semibold text-base mb-3">
                🔍 Vue détaillée — Statut de chaque record vs snapshot actif
              </div>
              <RecordsTransparencyView
                athleteId={currentAthlete.id}
                activeSnapshot={activeSnapshot as any}
                records={records as any}
                onChanged={() => { loadRecords(); loadData(); }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}

// ─── Records helpers ───────────────────────────────────────────────────────
type RecordRow = {
  id: string;
  cat: string; record_type: string; item_seconds: number; value: number;
  date_recorded: string | null; sport_id: number; source: string;
};

type RecordKind = "bike" | "run" | "swim";

const ADD_OPTIONS: Record<RecordKind, Array<{ label: string; itemSeconds?: number; distanceM?: number }>> = {
  bike: [
    { label: "5 s", itemSeconds: 5 },
    { label: "30 s", itemSeconds: 30 },
    { label: "1 min", itemSeconds: 60 },
    { label: "5 min", itemSeconds: 300 },
    { label: "20 min", itemSeconds: 1200 },
  ],
  run: [
    { label: "400 m", distanceM: 400 },
    { label: "1 km", distanceM: 1000 },
    { label: "5 km", distanceM: 5000 },
    { label: "10 km", distanceM: 10000 },
  ],
  swim: [
    { label: "100 m", distanceM: 100 },
    { label: "200 m", distanceM: 200 },
    { label: "400 m", distanceM: 400 },
  ],
};

function kindMeta(kind: RecordKind): { cat: string; sportId: number; recordType: string } {
  if (kind === "bike") return { cat: "ppr", sportId: 14, recordType: "power" };
  if (kind === "run") return { cat: "par", sportId: 2, recordType: "time" };
  return { cat: "par", sportId: 19, recordType: "time" };
}

function parsePaceMinSec(s: string): number | null {
  const trimmed = s.trim();
  const m = trimmed.match(/^(\d{1,2}):(\d{1,2})$/);
  if (m) {
    const sec = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
    return sec > 0 ? sec : null;
  }
  const n = parseFloat(trimmed.replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function pickClosest(arr: RecordRow[], target: number): RecordRow | null {
  if (!arr.length) return null;
  const tol = Math.max(2, target * 0.2);
  const candidates = arr.filter(r => Math.abs(r.item_seconds - target) <= tol);
  const pool = candidates.length ? candidates : arr;
  return pool.reduce((best, r) =>
    Math.abs(r.item_seconds - target) < Math.abs(best.item_seconds - target) ? r : best,
    pool[0],
  );
}

function formatDurationLabel(s: number): string {
  if (s < 60) return `P${s}s`;
  if (s < 3600) return `P${Math.round(s / 60)}min`;
  return `P${(s / 3600).toFixed(1)}h`;
}

function formatPaceMinPerKm(speedMs: number): string {
  if (!Number.isFinite(speedMs) || speedMs <= 0) return "—";
  const secPerKm = 1000 / speedMs;
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

function formatPaceMinPer100m(speedMs: number): string {
  if (!Number.isFinite(speedMs) || speedMs <= 0) return "—";
  const secPer100m = 100 / speedMs;
  const m = Math.floor(secPer100m / 60);
  const s = Math.round(secPer100m % 60);
  return `${m}:${String(s).padStart(2, "0")}/100m`;
}

function RecordsBlock({
  kind, title, rows, formatValue, parseInput, editPlaceholder, athleteId, onChanged,
}: {
  kind: RecordKind;
  title: string;
  rows: Array<{ target: number; label: string; record: RecordRow | null }>;
  formatValue: (v: number) => string;
  parseInput: (s: string) => number | null;
  editPlaceholder: string;
  athleteId: string;
  onChanged: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const startEdit = (r: RecordRow) => {
    setEditingId(r.id);
    setEditValue(
      kind === "bike"
        ? String(Math.round(r.value))
        : formatValue(r.value).replace(/\s?\/(km|100m)$/, ""),
    );
  };

  const saveEdit = async (r: RecordRow) => {
    const v = parseInput(editValue);
    if (v == null) {
      toast({ title: "Valeur invalide", variant: "destructive" });
      return;
    }
    // For run/swim, value is sec per unit; item_seconds must stay coherent
    let newItemSeconds = r.item_seconds;
    if (kind === "run") newItemSeconds = Math.round(v * (r.item_seconds / r.value));
    if (kind === "swim") newItemSeconds = Math.round(v * (r.item_seconds / r.value));
    const { error } = await supabase
      .from("nolio_records")
      .update({ value: v, item_seconds: newItemSeconds, source: "manual" })
      .eq("id", r.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Record mis à jour" });
    setEditingId(null);
    onChanged();
  };

  const deleteRecord = async (r: RecordRow) => {
    if (r.source !== "manual") return;
    if (!confirm("Supprimer ce record manuel ?")) return;
    const { error } = await supabase.from("nolio_records").delete().eq("id", r.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Record supprimé" });
    onChanged();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-sm">{title}</div>
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="h-3 w-3 mr-1" /> Ajouter un record
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {rows.map((row, idx) => (
          <div key={`${row.label}-${idx}`} className="rounded-lg border p-3 bg-card">
            <div className="flex items-center justify-between gap-1">
              <div className="text-xs text-muted-foreground">{row.label}</div>
              {row.record?.source === "manual" && (
                <span title="Saisie manuelle" className="text-[10px]">✍️</span>
              )}
            </div>
            {row.record ? (
              editingId === row.record.id ? (
                <div className="mt-1 space-y-1">
                  <Input
                    autoFocus
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    placeholder={editPlaceholder}
                    className="h-7 text-sm"
                  />
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => saveEdit(row.record!)}>
                      <Check className="h-3 w-3 text-green-600" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => setEditingId(null)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="text-lg font-bold">{formatValue(row.record.value)}</div>
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => startEdit(row.record!)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {row.record.source === "manual" && (
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => deleteRecord(row.record!)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {row.record.date_recorded
                      ? new Date(row.record.date_recorded).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" })
                      : "—"}
                  </div>
                </>
              )
            ) : (
              <div className="text-sm text-muted-foreground mt-1">—</div>
            )}
          </div>
        ))}
      </div>

      <AddRecordDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        kind={kind}
        athleteId={athleteId}
        parseInput={parseInput}
        editPlaceholder={editPlaceholder}
        onSaved={() => { setAddOpen(false); onChanged(); }}
      />
    </div>
  );
}

function AddRecordDialog({
  open, onOpenChange, kind, athleteId, parseInput, editPlaceholder, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  kind: RecordKind;
  athleteId: string;
  parseInput: (s: string) => number | null;
  editPlaceholder: string;
  onSaved: () => void;
}) {
  const opts = ADD_OPTIONS[kind];
  const [optIdx, setOptIdx] = useState("0");
  const [valStr, setValStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  const submit = async () => {
    const v = parseInput(valStr);
    if (v == null) {
      toast({ title: "Valeur invalide", variant: "destructive" });
      return;
    }
    const opt = opts[parseInt(optIdx, 10)];
    let itemSeconds: number;
    if (kind === "bike") {
      itemSeconds = opt.itemSeconds!;
    } else {
      // par = sec per (km or 100m). item_seconds = par × (distance / unit)
      const unit = kind === "run" ? 1000 : 100;
      itemSeconds = Math.round(v * (opt.distanceM! / unit));
    }
    const meta = kindMeta(kind);
    const { error } = await supabase.from("nolio_records").insert({
      athlete_id: athleteId,
      cat: meta.cat,
      sport_id: meta.sportId,
      record_type: meta.recordType,
      item_seconds: itemSeconds,
      value: v,
      date_recorded: dateStr || null,
      source: "manual",
    } as any);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Record ajouté" });
    setValStr(""); setDateStr(""); setOptIdx("0");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Ajouter un record manuel</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Durée / Distance</Label>
            <Select value={optIdx} onValueChange={setOptIdx}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {opts.map((o, i) => (
                  <SelectItem key={i} value={String(i)}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Valeur ({editPlaceholder})</Label>
            <Input value={valStr} onChange={(e) => setValStr(e.target.value)} placeholder={editPlaceholder} />
          </div>
          <div>
            <Label className="text-xs">Date (optionnelle)</Label>
            <Input type="date" value={dateStr} onChange={(e) => setDateStr(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit}>Ajouter</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


// ─── Sub-components ────────────────────────────────────────────────────────
function KpiCard({ label, value, sublabel, color }: { label: string; value: string; sublabel: string; color: string }) {
  return (
    <div className="rounded-lg border p-4 bg-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1" style={{ color }}>{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{sublabel}</div>
    </div>
  );
}

function MetricChart({
  title, unit, data, color,
}: { title: string; unit: string; data: { date: string; value: number | null }[]; color: string }) {
  if (data.length < 2) {
    return (
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="font-semibold text-sm">{title}</div>
          <Badge variant="outline" className="text-xs">Données insuffisantes</Badge>
        </div>
        <div className="h-[120px] flex items-center justify-center text-xs text-muted-foreground">
          Au moins 2 snapshots requis
        </div>
      </div>
    );
  }

  const first = data[0].value as number;
  const last = data[data.length - 1].value as number;
  const delta = last - first;
  const sign = delta >= 0 ? "+" : "";
  const deltaTxt = `${sign}${unit === "mmol/L/s" ? delta.toFixed(2) : delta.toFixed(1)} ${unit}`;

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-sm">{title}</div>
        <div className="text-xs">
          <span className="text-muted-foreground">Δ depuis 12 mois : </span>
          <span className={delta >= 0 ? "text-green-600 font-semibold" : "text-orange-600 font-semibold"}>
            {deltaTxt}
          </span>
        </div>
      </div>
      <div className="h-[140px]">
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="date" tickFormatter={fmtDate} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} domain={["auto", "auto"]} />
            <Tooltip
              labelFormatter={fmtDate}
              formatter={(v: number) => [`${v} ${unit}`, title]}
            />
            <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
