/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * RUN MLSS COHORT VALIDATION PAGE
 *
 * Élargit la cohorte Modèle C au-delà de N=14+3 en agrégeant les tests terrain
 * saisis par le coach pour ses propres athlètes.
 *
 *  - Saisie : pace seuil 30 min + VMA + VLamax run + CE + qualité protocole
 *  - Persistance : calibration_evidence (evidence_type=RUN_MLSS_COHORT_TEST)
 *    used_in_calibration=false → trace pure, n'altère AUCUN calcul.
 *  - Dashboard : RMSE pondéré recalculé (lab / field / combined) +
 *    verdict de généralisation vs baseline 2.64%.
 *  - Export CSV pour analyse externe / publication.
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
  RUN_MLSS_COHORT_EVIDENCE_TYPE,
  buildCohortEntry,
  buildCohortReport,
  classifyTier,
  deriveObservedMLSSPct,
  entriesToCSV,
  type CohortReport,
  type CohortTestEntry,
} from "@/lib/v2/runMLSSCohortValidation";
import { predictRunMLSSPctFromVLaCE } from "@/lib/v2/runMLSSPredictor";

const VERDICT_STYLES = {
  insufficient: { label: "N insuffisant", icon: HelpCircle, cls: "bg-muted text-muted-foreground border" },
  consistent: { label: "Cohérent", icon: CheckCircle2, cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30" },
  drifting: { label: "Dérive modérée", icon: AlertTriangle, cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30" },
  incoherent: { label: "Incohérent", icon: XCircle, cls: "bg-destructive/15 text-destructive border border-destructive/30" },
} as const;

interface FormState {
  athleteId: string;
  date: string;
  vlamaxRun: string;
  runningEconomy: string;
  paceMinPerKm: string;   // saisie facile coach (mm:ss)
  vmaKmh: string;
  protocolQuality: "2" | "3" | "4" | "5";
  testProtocol: string;
  fatigueIndex: string;
  notes: string;
}

const DEFAULT_FORM: FormState = {
  athleteId: "",
  date: new Date().toISOString().split("T")[0],
  vlamaxRun: "",
  runningEconomy: "",
  paceMinPerKm: "",
  vmaKmh: "",
  protocolQuality: "4",
  testProtocol: "30min_threshold",
  fatigueIndex: "",
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
  // fallback: nombre direct = secondes
  const n = Number(input);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function secToMmSs(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec - m * 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function RunMLSSCohortPage() {
  const { user } = useAuth();
  const { athletes } = useAthletes();

  const [activeTab, setActiveTab] = useState("cohort");
  const [staffMode, setStaffMode] = useState(true);

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [entries, setEntries] = useState<CohortTestEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const athleteNameMap = useMemo(() => {
    const m = new Map<string, string>();
    athletes.forEach((a) => m.set(a.id, a.name));
    return m;
  }, [athletes]);

  // ─── Live preview du delta (avant submit) ───────────────────────────
  const livePreview = useMemo(() => {
    const vla = Number(form.vlamaxRun);
    const ce = Number(form.runningEconomy);
    const paceSec = paceMmSsToSec(form.paceMinPerKm);
    const vma = Number(form.vmaKmh);
    if (!Number.isFinite(vla) || vla <= 0) return null;
    if (!Number.isFinite(ce) || ce <= 0) return null;
    if (paceSec == null || !Number.isFinite(vma) || vma <= 0) return null;

    const observed = deriveObservedMLSSPct(paceSec, vma);
    if (observed == null) return null;

    const prediction = predictRunMLSSPctFromVLaCE(vla, ce);
    if (!prediction) return null;
    const delta = Number((prediction.mlssPct - observed).toFixed(2));
    return { observed, predicted: prediction.mlssPct, delta };
  }, [form.vlamaxRun, form.runningEconomy, form.paceMinPerKm, form.vmaKmh]);

  // ─── Chargement cohorte du coach ─────────────────────────────────────
  const refresh = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("calibration_evidence")
        .select("id,athlete_id,date,protocol_quality,fatigue_index,notes,raw_values")
        .eq("coach_id", user.id)
        .eq("evidence_type", RUN_MLSS_COHORT_EVIDENCE_TYPE)
        .order("date", { ascending: false })
        .limit(500);
      if (error) throw error;

      const built = (data ?? [])
        .map((r) =>
          buildCohortEntry(
            {
              ...r,
              raw_values: (r.raw_values ?? {}) as Record<string, unknown>,
            },
            athleteNameMap.get(r.athlete_id),
          ),
        )
        .filter((x): x is CohortTestEntry => x !== null);
      setEntries(built);
    } catch (e) {
      if (import.meta.env.DEV) console.error("[cohort load]", e);
      toast.error("Échec du chargement de la cohorte");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, athleteNameMap.size]);

  const report: CohortReport | null = useMemo(
    () => (entries.length ? buildCohortReport(entries) : null),
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
    const paceSec = paceMmSsToSec(form.paceMinPerKm);
    const vma = Number(form.vmaKmh);
    const vla = Number(form.vlamaxRun);
    const ce = Number(form.runningEconomy);
    const q = parseInt(form.protocolQuality, 10) as 2 | 3 | 4 | 5;
    const fatigue = form.fatigueIndex ? Number(form.fatigueIndex) : null;

    if (paceSec == null) return toast.error("Pace seuil invalide (format mm:ss)");
    if (!Number.isFinite(vma) || vma <= 0) return toast.error("VMA invalide");
    if (!Number.isFinite(vla) || vla <= 0) return toast.error("VLamax invalide");
    if (!Number.isFinite(ce) || ce <= 0) return toast.error("CE invalide");

    const tier = classifyTier(q);
    if (tier === "rejected") return toast.error("Qualité protocole insuffisante");

    setSubmitting(true);
    try {
      const observed = deriveObservedMLSSPct(paceSec, vma);
      const { error } = await supabase.from("calibration_evidence").insert({
        athlete_id: form.athleteId,
        coach_id: user.id,
        date: form.date,
        source_type: "TEST_PROTOCOL" as any,
        evidence_type: RUN_MLSS_COHORT_EVIDENCE_TYPE as any,
        protocol_quality: q,
        validity: "OK" as any,
        confidence_evidence: q === 5 ? 0.95 : q === 4 ? 0.9 : q === 3 ? 0.75 : 0.6,
        used_in_calibration: false,
        calibration_weight: 0,
        fatigue_index: fatigue,
        notes: form.notes || `Cohorte Run MLSS — pace ${form.paceMinPerKm}, tier=${tier}`,
        raw_values: {
          vlamaxRun: vla,
          runningEconomy: ce,
          paceThresholdSecPerKm: paceSec,
          vmaKmh: vma,
          observedMLSSPct: observed,
          testProtocol: form.testProtocol,
          tier,
        } as any,
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
    a.download = `run_mlss_cohort_${new Date().toISOString().split("T")[0]}.csv`;
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
      <div className="container mx-auto p-4 sm:p-6 max-w-6xl space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <FlaskConical className="h-6 w-6 text-primary mt-1 shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold">Cohorte Run MLSS — Validation Modèle C</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Élargissez la cohorte au-delà de N=14 (calibration interne) en saisissant les tests
              terrain de vos athlètes. RMSE recalculé en direct, dual-tier labo/terrain.
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
                      <span className="ml-2">N retenu = {report.retained} · baseline RMSE {report.baselineRmse}%</span>
                    </div>
                  </div>
                );
              })()}

              <div className="grid grid-cols-3 gap-3">
                <TierStatBlock title="Labo" stats={report.byTier.lab} />
                <TierStatBlock title="Terrain" stats={report.byTier.field} />
                <TierStatBlock title="Combiné" stats={report.byTier.combined} highlight />
              </div>

              {report.notes.length > 0 && (
                <ul className="text-xs text-muted-foreground space-y-1 pt-1 border-t border-border/40">
                  {report.notes.map((n, i) => (
                    <li key={i}>· {n}</li>
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

                <Field label="Pace seuil 30 min (mm:ss/km)">
                  <Input placeholder="3:55" value={form.paceMinPerKm} onChange={(e) => setForm({ ...form, paceMinPerKm: e.target.value })} />
                </Field>
                <Field label="VMA (km/h)">
                  <Input type="number" step="0.1" placeholder="18.5" value={form.vmaKmh} onChange={(e) => setForm({ ...form, vmaKmh: e.target.value })} />
                </Field>
                <Field label="Fatigue index (0-100, optionnel)">
                  <Input type="number" min="0" max="100" placeholder="—" value={form.fatigueIndex} onChange={(e) => setForm({ ...form, fatigueIndex: e.target.value })} />
                </Field>

                <Field label="VLamax run (mmol/L/s)">
                  <Input type="number" step="0.01" placeholder="0.42" value={form.vlamaxRun} onChange={(e) => setForm({ ...form, vlamaxRun: e.target.value })} />
                </Field>
                <Field label="Économie de course CE (mlO₂/kg/km)">
                  <Input type="number" step="1" placeholder="200" value={form.runningEconomy} onChange={(e) => setForm({ ...form, runningEconomy: e.target.value })} />
                </Field>
                <Field label="Protocole utilisé">
                  <Select value={form.testProtocol} onValueChange={(v) => setForm({ ...form, testProtocol: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30min_threshold">Test seuil 30 min CSS</SelectItem>
                      <SelectItem value="20min_ftp">Test 20 min (×0.95)</SelectItem>
                      <SelectItem value="lactate_4mmol">Lactate 4 mmol/L</SelectItem>
                      <SelectItem value="race_10k">Course 10K référence</SelectItem>
                      <SelectItem value="race_HM">Semi-marathon</SelectItem>
                      <SelectItem value="other">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Notes (contexte, conditions, écart attendu)">
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ex : test sur piste, +18°C, vent nul, fin de bloc volume" />
              </Field>

              {/* Live preview */}
              {livePreview && (
                <div className="rounded-md bg-muted/40 border border-border/50 p-3 text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span><span className="text-muted-foreground">Observé :</span> <strong>{livePreview.observed}%</strong></span>
                  <span><span className="text-muted-foreground">Prédit Modèle C :</span> <strong>{livePreview.predicted}%</strong></span>
                  <span>
                    <span className="text-muted-foreground">Δ :</span>{" "}
                    <strong className={cn(
                      Math.abs(livePreview.delta) > 5 ? "text-destructive" :
                      Math.abs(livePreview.delta) > 3 ? "text-amber-600 dark:text-amber-400" :
                      "text-emerald-600 dark:text-emerald-400"
                    )}>
                      {livePreview.delta > 0 ? "+" : ""}{livePreview.delta}%
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
                      <TableHead className="text-right">Pace</TableHead>
                      <TableHead className="text-right">VMA</TableHead>
                      <TableHead className="text-right">VLa</TableHead>
                      <TableHead className="text-right">CE</TableHead>
                      <TableHead className="text-right">Obs.</TableHead>
                      <TableHead className="text-right">Préd.</TableHead>
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
                        <TableCell className="text-right font-mono text-xs">{secToMmSs(e.paceThresholdSecPerKm)}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{e.vmaKmh}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{e.vlamaxRun}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{e.runningEconomy}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{e.observedMLSSPct}%</TableCell>
                        <TableCell className="text-right font-mono text-xs">{e.predictedMLSSPct ?? "—"}{e.predictedMLSSPct ? "%" : ""}</TableCell>
                        <TableCell className={cn(
                          "text-right font-mono text-xs font-semibold",
                          e.deltaPct == null ? "" :
                          Math.abs(e.deltaPct) > 5 ? "text-destructive" :
                          Math.abs(e.deltaPct) > 3 ? "text-amber-600 dark:text-amber-400" :
                          "text-emerald-600 dark:text-emerald-400"
                        )}>
                          {e.deltaPct == null ? "—" : `${e.deltaPct > 0 ? "+" : ""}${e.deltaPct}`}
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
}: {
  title: string;
  stats: import("@/lib/v2/runMLSSCohortValidation").CohortTierStats;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-md p-3 border",
      highlight ? "border-primary/30 bg-primary/5" : "border-border/50 bg-muted/30"
    )}>
      <div className="text-xs text-muted-foreground mb-1">{title}</div>
      <div className="text-2xl font-bold tabular-nums">
        {stats.rmse != null ? `${stats.rmse}%` : "—"}
      </div>
      <div className="text-[10px] text-muted-foreground">RMSE pondéré · n={stats.n}</div>
      {stats.bias != null && (
        <div className="text-[11px] mt-1.5">
          biais {stats.bias > 0 ? "+" : ""}{stats.bias}% · MAE {stats.mae}%
        </div>
      )}
      {stats.n > 0 && (
        <div className="text-[10px] text-muted-foreground mt-0.5">
          ±3% : {stats.withinThreshold.pct3}% · ±5% : {stats.withinThreshold.pct5}%
        </div>
      )}
    </div>
  );
}
