/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * VLAMAX CAP COHORT VALIDATION PAGE
 *
 * Active `vlamaxCapAnchorCalibration.ts` (buildAnchorEntry/buildAnchorReport),
 * jusqu'ici sans appelant. Sur le modèle exact de RunMLSSCohortPage.tsx (même
 * logique de validation dual-tier labo/terrain) mais pour les ancrages
 * d'interpolation Sprint 15s / Puissance Max CAP de `vlamaxCapEstimator.ts`.
 *
 * Objectif : donner enfin à ces ancrages (jusqu'ici ajustés à la main sur ~5
 * profils anecdotiques — audit "estimations physiologiques", Cluster 1,
 * Finding 5) un vrai garde-fou de régression, alimenté par les tests labo
 * (mesure lactate) que les coaches saisissent au fil du temps.
 *
 *  - Saisie : VLamax CAP mesurée labo (référence) + au moins un des deux
 *    signaux à tester (Sprint 15s ou Puissance Max CAP), + VMA/pace seuil
 *    pour la formule de repli.
 *  - Persistance : calibration_evidence (evidence_type=VLAMAX_CAP_ANCHOR),
 *    used_in_calibration=false → trace pure, n'altère AUCUN calcul.
 *  - Dashboard : RMSE pondéré (lab / field / combined) + par source
 *    (sprint seul / puissance seule / les deux) + verdict de généralisation.
 *  - Export CSV pour analyse externe.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useEffect, useMemo, useState } from "react";
import { SidebarLayout } from "@/components/SidebarLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { FlaskConical, Download, Trash2, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useAthletes } from "@/contexts/AthleteContext";
import { supabase } from "@/integrations/supabase/client";
import {
  VLAMAX_CAP_ANCHOR_EVIDENCE_TYPE,
  buildAnchorEntry,
  buildAnchorReport,
  buildAnchorRawValues,
  classifyAnchorTier,
  type AnchorReport,
  type AnchorTestEntry,
  type AnchorTierStats,
} from "@/lib/v2/vlamaxCapAnchorCalibration";
import { estimateVLamaxCap } from "@/lib/v2/vlamaxCapEstimator";

const VERDICT_STYLES = {
  insufficient: { label: "N insuffisant", icon: HelpCircle, cls: "bg-muted text-muted-foreground border" },
  consistent: { label: "Cohérent", icon: CheckCircle2, cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30" },
  drifting: { label: "Dérive modérée", icon: AlertTriangle, cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30" },
  incoherent: { label: "Incohérent", icon: XCircle, cls: "bg-destructive/15 text-destructive border border-destructive/30" },
} as const;

interface FormState {
  athleteId: string;
  date: string;
  vlamaxRunMeasured: string;
  sprint15sDistance: string;
  runningPowerMax: string;
  vmaKmh: string;
  paceThresholdMinPerKm: string; // saisie facile coach (mm:ss)
  protocolQuality: "2" | "3" | "4" | "5";
  notes: string;
}

const DEFAULT_FORM: FormState = {
  athleteId: "",
  date: new Date().toISOString().split("T")[0],
  vlamaxRunMeasured: "",
  sprint15sDistance: "",
  runningPowerMax: "",
  vmaKmh: "",
  paceThresholdMinPerKm: "",
  protocolQuality: "4",
  notes: "",
};

function paceMmSsToSec(input: string): number | null {
  if (!input) return null;
  const m = input.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    const min = parseInt(m[1], 10);
    const sec = parseInt(m[2], 10);
    if (sec >= 60) return null;
    return min * 60 + sec;
  }
  const n = Number(input);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function secToMmSs(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec - m * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VlamaxCapCohortPage() {
  const { user } = useAuth();
  const { athletes } = useAthletes();

  const [activeTab, setActiveTab] = useState("cohort");
  const [staffMode, setStaffMode] = useState(true);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [entries, setEntries] = useState<AnchorTestEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const athleteNameMap = useMemo(() => {
    const m = new Map<string, string>();
    athletes.forEach((a) => m.set(a.id, a.name));
    return m;
  }, [athletes]);

  // ─── Live preview du delta (avant submit) — prédiction SANS la mesure labo ──
  const livePreview = useMemo(() => {
    const measured = Number(form.vlamaxRunMeasured);
    if (!Number.isFinite(measured) || measured <= 0) return null;

    const sprint = Number(form.sprint15sDistance);
    const power = Number(form.runningPowerMax);
    const hasSprint = Number.isFinite(sprint) && sprint > 0;
    const hasPower = Number.isFinite(power) && power > 0;
    if (!hasSprint && !hasPower) return null;

    const vma = Number(form.vmaKmh);
    const paceSec = paceMmSsToSec(form.paceThresholdMinPerKm);

    const est = estimateVLamaxCap({
      vma: Number.isFinite(vma) && vma > 0 ? vma : null,
      paceThresholdSecPerKm: paceSec,
      sprint15sDistance: hasSprint ? sprint : null,
      runningPowerMax: hasPower ? power : null,
    });
    const predicted = est?.value ?? null;
    if (predicted == null) return null;
    const delta = Number((predicted - measured).toFixed(3));
    return { measured, predicted, delta };
  }, [form.vlamaxRunMeasured, form.sprint15sDistance, form.runningPowerMax, form.vmaKmh, form.paceThresholdMinPerKm]);

  // ─── Chargement cohorte du coach ─────────────────────────────────────
  const refresh = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("calibration_evidence")
        .select("id,athlete_id,date,protocol_quality,notes,raw_values")
        .eq("coach_id", user.id)
        .eq("evidence_type", VLAMAX_CAP_ANCHOR_EVIDENCE_TYPE)
        .order("date", { ascending: false })
        .limit(500);
      if (error) throw error;

      const built = (data ?? [])
        .map((r) =>
          buildAnchorEntry(
            {
              ...r,
              raw_values: (r.raw_values ?? {}) as Record<string, unknown>,
            },
            athleteNameMap.get(r.athlete_id),
          ),
        )
        .filter((x): x is AnchorTestEntry => x !== null);
      setEntries(built);
    } catch (e) {
      if (import.meta.env.DEV) console.error("[vlamax cap anchor load]", e);
      toast.error("Échec du chargement de la cohorte");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, athleteNameMap.size]);

  const report: AnchorReport | null = useMemo(
    () => (entries.length ? buildAnchorReport(entries) : null),
    [entries],
  );

  // ─── Soumission ─────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (!form.athleteId) {
      toast.error("Sélectionner un athlète");
      return;
    }
    const measured = Number(form.vlamaxRunMeasured);
    const sprint = Number(form.sprint15sDistance);
    const power = Number(form.runningPowerMax);
    const vma = Number(form.vmaKmh);
    const paceSec = paceMmSsToSec(form.paceThresholdMinPerKm);
    const q = parseInt(form.protocolQuality, 10) as 2 | 3 | 4 | 5;

    if (!Number.isFinite(measured) || measured <= 0) return toast.error("VLamax mesurée invalide");
    const hasSprint = Number.isFinite(sprint) && sprint > 0;
    const hasPower = Number.isFinite(power) && power > 0;
    if (!hasSprint && !hasPower) return toast.error("Renseigner au moins Sprint 15s ou Puissance Max CAP");

    const tier = classifyAnchorTier(q);
    if (tier === "rejected") return toast.error("Qualité protocole insuffisante");

    setSubmitting(true);
    try {
      const rawValues = buildAnchorRawValues({
        vlamaxRunMeasured: measured,
        sprint15sDistance: hasSprint ? sprint : null,
        runningPowerMax: hasPower ? power : null,
        vma: Number.isFinite(vma) && vma > 0 ? vma : null,
        paceThresholdSecPerKm: paceSec,
      });
      const { error } = await supabase.from("calibration_evidence").insert({
        athlete_id: form.athleteId,
        coach_id: user.id,
        date: form.date,
        source_type: "TEST_PROTOCOL" as any,
        evidence_type: VLAMAX_CAP_ANCHOR_EVIDENCE_TYPE as any,
        protocol_quality: q,
        validity: "OK" as any,
        confidence_evidence: q === 5 ? 0.95 : q === 4 ? 0.9 : q === 3 ? 0.75 : 0.6,
        used_in_calibration: false,
        calibration_weight: 0,
        notes: form.notes || `Cohorte VLamax CAP anchor — tier=${tier}`,
        raw_values: rawValues as any,
      });
      if (error) throw error;
      toast.success("Test ajouté à la cohorte");
      setForm({ ...DEFAULT_FORM, athleteId: form.athleteId, date: form.date });
      void refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Échec de l'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce test de la cohorte ?")) return;
    const { error } = await supabase.from("calibration_evidence").delete().eq("id", id);
    if (error) {
      toast.error("Échec de la suppression");
      return;
    }
    toast.success("Test supprimé");
    void refresh();
  };

  const handleExportCSV = () => {
    if (!entries.length) return;
    const csv = entriesToCSV(entries);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vlamax_cap_anchor_cohort_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SidebarLayout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      staffMode={staffMode}
      onStaffModeChange={setStaffMode}
    >
      <div className="container mx-auto p-3 sm:p-6 max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-start gap-2 sm:gap-3">
          <FlaskConical className="h-5 w-5 sm:h-6 sm:w-6 text-primary mt-1 shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl font-bold break-words leading-tight">Cohorte VLamax CAP — Validation des ancrages Sprint/Puissance</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Testez les ancrages d'interpolation de l'estimateur VLamax CAP (Sprint 15s,
              Puissance Max CAP) contre vos mesures labo réelles. RMSE recalculé en direct,
              dual-tier labo/terrain — aucun calcul de l'app n'est modifié par cette page.
            </p>
          </div>
        </div>

        {/* Verdict global */}
        {report && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Verdict de généralisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const v = VERDICT_STYLES[report.generalizationVerdict];
                const Icon = v.icon;
                return (
                  <div className={cn("flex items-start gap-2 rounded-md p-3", v.cls)}>
                    <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                    <div className="flex-1 text-sm">
                      <strong>{v.label}</strong>
                      <span className="ml-2">N retenu = {report.retained} · tolérance ±0.08 mmol/L/s</span>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <TierStatBlock title="Labo" stats={report.byTier.lab} />
                <TierStatBlock title="Terrain" stats={report.byTier.field} />
                <TierStatBlock title="Combiné" stats={report.byTier.combined} highlight />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <TierStatBlock title="Sprint 15s seul" stats={report.bySource.sprintOnly} compact />
                <TierStatBlock title="Puissance seule" stats={report.bySource.powerOnly} compact />
                <TierStatBlock title="Les deux" stats={report.bySource.both} compact />
              </div>

              {(report.notes.length > 0 || report.anchorSuggestions.length > 0) && (
                <ul className="text-xs text-muted-foreground space-y-1 pt-1 border-t border-border/40">
                  {report.notes.map((n, i) => (
                    <li key={`note-${i}`}>· {n}</li>
                  ))}
                  {report.anchorSuggestions.map((n, i) => (
                    <li key={`sugg-${i}`} className="text-amber-700 dark:text-amber-400 font-medium">⚠ {n}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* Saisie d'un nouveau test */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ajouter un test</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <Field label="Athlète">
                  <Select
                    value={form.athleteId}
                    onValueChange={(v) => setForm({ ...form, athleteId: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                    <SelectContent>
                      {athletes.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Date du test">
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </Field>
                <Field label="Qualité protocole" hint="4-5 = labo, 2-3 = terrain">
                  <Select
                    value={form.protocolQuality}
                    onValueChange={(v) => setForm({ ...form, protocolQuality: v as FormState["protocolQuality"] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 — Labo gold standard</SelectItem>
                      <SelectItem value="4">4 — Labo / instrumenté</SelectItem>
                      <SelectItem value="3">3 — Terrain validé</SelectItem>
                      <SelectItem value="2">2 — Terrain estimé</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <Field label="VLamax CAP mesurée labo (mmol/L/s)" hint="Référence — lactate post-sprint">
                  <Input type="number" step="0.01" placeholder="0.45" value={form.vlamaxRunMeasured} onChange={(e) => setForm({ ...form, vlamaxRunMeasured: e.target.value })} />
                </Field>
                <Field label="Sprint 15s — distance (m)" hint="Au moins un des deux signaux requis">
                  <Input type="number" step="1" placeholder="85" value={form.sprint15sDistance} onChange={(e) => setForm({ ...form, sprint15sDistance: e.target.value })} />
                </Field>
                <Field label="Puissance Max CAP (W)">
                  <Input type="number" step="1" placeholder="450" value={form.runningPowerMax} onChange={(e) => setForm({ ...form, runningPowerMax: e.target.value })} />
                </Field>

                <Field label="VMA (km/h)" hint="Optionnel — formule de repli">
                  <Input type="number" step="0.1" placeholder="18.5" value={form.vmaKmh} onChange={(e) => setForm({ ...form, vmaKmh: e.target.value })} />
                </Field>
                <Field label="Pace seuil (mm:ss/km)" hint="Optionnel — formule de repli">
                  <Input placeholder="3:55" value={form.paceThresholdMinPerKm} onChange={(e) => setForm({ ...form, paceThresholdMinPerKm: e.target.value })} />
                </Field>
              </div>

              <Field label="Notes (protocole, conditions, contexte)">
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ex : sprint 15s piste, lactate à 3min post-effort" />
              </Field>

              {/* Live preview */}
              {livePreview && (
                <div className="rounded-md bg-muted/40 border border-border/50 p-3 text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span><span className="text-muted-foreground">Mesuré (labo) :</span> <strong>{livePreview.measured}</strong></span>
                  <span><span className="text-muted-foreground">Prédit estimateur :</span> <strong>{livePreview.predicted}</strong></span>
                  <span>
                    <span className="text-muted-foreground">Δ :</span>{" "}
                    <strong className={cn(
                      Math.abs(livePreview.delta) > 0.10 ? "text-destructive" :
                      Math.abs(livePreview.delta) > 0.05 ? "text-amber-600 dark:text-amber-400" :
                      "text-emerald-600 dark:text-emerald-400"
                    )}>
                      {livePreview.delta > 0 ? "+" : ""}{livePreview.delta}
                    </strong>
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Enregistrement…" : "Ajouter à la cohorte"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Liste des entrées */}
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">
              Cohorte saisie {entries.length > 0 && <span className="text-muted-foreground font-normal">({entries.length})</span>}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!entries.length}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            {loading && <p className="text-sm text-muted-foreground py-4 text-center">Chargement…</p>}
            {!loading && !entries.length && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Aucun test enregistré pour le moment.
              </p>
            )}
            {!loading && entries.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Athlète</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead className="text-right">Sprint 15s</TableHead>
                      <TableHead className="text-right">Pmax CAP</TableHead>
                      <TableHead className="text-right">Mesuré</TableHead>
                      <TableHead className="text-right">Prédit</TableHead>
                      <TableHead className="text-right">Δ</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs">{e.date}</TableCell>
                        <TableCell className="text-xs">{e.athleteName ?? e.athleteId.slice(0, 8)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "text-[10px]",
                            e.tier === "lab" ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400" :
                            e.tier === "field" ? "border-secondary text-secondary-foreground" :
                            "border-muted text-muted-foreground"
                          )}>
                            {e.tier} q{e.protocolQuality}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">{e.sprint15sDistance ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{e.runningPowerMax ?? "—"}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{e.vlamaxRunMeasured}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{e.predictedVLamax ?? "—"}</TableCell>
                        <TableCell className={cn(
                          "text-right font-mono text-xs font-semibold",
                          e.deltaVLamax == null ? "" :
                          Math.abs(e.deltaVLamax) > 0.10 ? "text-destructive" :
                          Math.abs(e.deltaVLamax) > 0.05 ? "text-amber-600 dark:text-amber-400" :
                          "text-emerald-600 dark:text-emerald-400"
                        )}>
                          {e.deltaVLamax == null ? "—" : `${e.deltaVLamax > 0 ? "+" : ""}${e.deltaVLamax}`}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)} className="h-7 w-7 p-0">
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export CSV (pour publication / analyse externe)
// ═══════════════════════════════════════════════════════════════════════════════

function entriesToCSV(entries: AnchorTestEntry[]): string {
  const headers = [
    "date",
    "athlete_id",
    "athlete_name",
    "tier",
    "protocol_quality",
    "vlamax_measured_mmolLs",
    "sprint15s_distance_m",
    "running_power_max_w",
    "vma_kmh",
    "pace_threshold_sec_per_km",
    "predicted_vlamax",
    "delta_vlamax",
    "notes",
  ];
  const rows = entries.map((e) =>
    [
      e.date,
      e.athleteId,
      e.athleteName ?? "",
      e.tier,
      e.protocolQuality,
      e.vlamaxRunMeasured,
      e.sprint15sDistance ?? "",
      e.runningPowerMax ?? "",
      e.vma ?? "",
      e.paceThresholdSecPerKm ?? "",
      e.predictedVLamax ?? "",
      e.deltaVLamax ?? "",
      (e.notes ?? "").replace(/[\r\n]/g, " ").replace(/"/g, "'"),
    ]
      .map((v) => `"${v}"`)
      .join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function TierStatBlock({
  title,
  stats,
  highlight,
  compact,
}: {
  title: string;
  stats: AnchorTierStats;
  highlight?: boolean;
  compact?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-md p-3 border",
      highlight ? "border-primary/30 bg-primary/5" : "border-border/50 bg-muted/30"
    )}>
      <div className="text-xs text-muted-foreground mb-1">{title}</div>
      <div className={cn("font-bold tabular-nums", compact ? "text-lg" : "text-2xl")}>
        {stats.rmse != null ? stats.rmse : "—"}
      </div>
      <div className="text-[10px] text-muted-foreground">RMSE pondéré (mmol/L/s) · n={stats.n}</div>
      {!compact && stats.bias != null && (
        <div className="text-[11px] mt-1.5">
          biais {stats.bias > 0 ? "+" : ""}{stats.bias} · MAE {stats.mae}
        </div>
      )}
      {!compact && stats.n > 0 && (
        <div className="text-[10px] text-muted-foreground mt-0.5">
          ±0.05 : {stats.withinThreshold.pct005}% · ±0.10 : {stats.withinThreshold.pct010}%
        </div>
      )}
    </div>
  );
}
