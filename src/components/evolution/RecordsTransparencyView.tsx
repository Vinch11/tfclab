// =============================================================================
// RecordsTransparencyView — Vue détaillée et transparente des records Nolio
// Affiche par sport : Durée/Distance, Valeur, Date, Statut (✅/⚠️/❌)
// + alerte champs manuels anciens + bouton "Recalculer le profil"
// =============================================================================

import { useMemo, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { DbSnapshot } from "@/hooks/useCloudData";

type RecordRow = {
  id: string;
  cat: string;
  record_type: string;
  item_seconds: number;
  value: number;
  date_recorded: string | null;
  sport_id: number;
  source: string;
};

const BIKE_SPORTS = [14, 18];
const RUN_SPORTS = [2, 52];
const SWIM_SPORT = 19;

// ────────────────────────────────────────────────────────────────────────────
// Slot mapping (réplique la logique de l'edge function nolio-records)
// ────────────────────────────────────────────────────────────────────────────

type Status =
  | { kind: "active"; label: string }
  | { kind: "ignored"; label: string; reason: string }
  | { kind: "rejected"; label: string; reason: string }
  | { kind: "neutral"; label: string };

const STATUS_BADGE: Record<Status["kind"], { variant: "default" | "secondary" | "destructive" | "outline"; emoji: string }> = {
  active: { variant: "default", emoji: "✅" },
  ignored: { variant: "secondary", emoji: "⚠️" },
  rejected: { variant: "destructive", emoji: "❌" },
  neutral: { variant: "outline", emoji: "—" },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "2-digit" });
  } catch { return iso; }
}

function fmtPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, "0")}/km`;
}

function fmtPace100(secPer100: number): string {
  const m = Math.floor(secPer100 / 60);
  const s = Math.round(secPer100 % 60);
  return `${m}:${String(s).padStart(2, "0")}/100m`;
}

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return `${h}h${String(m).padStart(2, "0")}'${String(s).padStart(2, "0")}"`;
  return `${m}'${String(s).padStart(2, "0")}"`;
}

// ─── Validation helpers (réplique edge function) ──────────────────────────
function validateBikePower(
  label: string,
  w: number,
  ratioCap: number,
  absCap: number,
  ftp: number | null,
): { ok: true } | { ok: false; reason: string } {
  if (ftp && ftp > 0) {
    const r = w / ftp;
    if (r > ratioCap) return { ok: false, reason: `ratio ${label}/FTP = ${r.toFixed(2)} (seuil < ${ratioCap})` };
  } else if (w >= absCap) {
    return { ok: false, reason: `${w}W ≥ plafond absolu ${absCap}W (FTP indisponible)` };
  }
  return { ok: true };
}

function validateRaceTime(t: number, minSec: number, maxSec: number): { ok: true } | { ok: false; reason: string } {
  if (t < minSec || t > maxSec) {
    return { ok: false, reason: `${Math.round(t)}s hors plage [${minSec}s, ${maxSec}s]` };
  }
  return { ok: true };
}

// ─── Slot definitions ─────────────────────────────────────────────────────
type Slot = {
  label: string;
  sportKind: "bike" | "run" | "swim";
  match: (r: RecordRow) => boolean;
  /** Valeur candidate pour le snapshot calculée à partir du record */
  computeCandidate: (r: RecordRow) => number | null;
  /** Validation physiologique (snapshot ftp en input pour bike) */
  validate: (candidate: number, ctx: { ftp: number | null }) => { ok: true } | { ok: false; reason: string };
  /** Champ du snapshot ciblé (lit la valeur actuelle pour status active/ignored) */
  snapshotField: keyof DbSnapshot;
  /** "max" : on garde la valeur la plus haute ; "min" : la plus basse */
  selection: "max" | "min";
  /** Format affichage de la valeur du record (brut) */
  formatRaw: (r: RecordRow) => string;
};

const SLOTS: Slot[] = [
  // ─── Vélo ───────────────────────────────────────────────────────────────
  {
    label: "5 s — Pmax",
    sportKind: "bike",
    match: (r) => r.cat === "ppr" && r.record_type === "time" && r.item_seconds === 5 && BIKE_SPORTS.includes(r.sport_id),
    computeCandidate: (r) => r.value,
    validate: (v, { ftp }) => validateBikePower("pmax_5s", v, 4.0, 2000, ftp),
    snapshotField: "pmax_5s",
    selection: "max",
    formatRaw: (r) => `${Math.round(r.value)} W`,
  },
  {
    label: "30 s",
    sportKind: "bike",
    match: (r) => r.cat === "ppr" && r.record_type === "time" && r.item_seconds === 30 && BIKE_SPORTS.includes(r.sport_id),
    computeCandidate: (r) => r.value,
    validate: (v, { ftp }) => validateBikePower("p30s_w", v, 4.0, 1500, ftp),
    snapshotField: "p30s_w" as keyof DbSnapshot,
    selection: "max",
    formatRaw: (r) => `${Math.round(r.value)} W`,
  },
  {
    label: "1 min",
    sportKind: "bike",
    match: (r) => r.cat === "ppr" && r.record_type === "time" && r.item_seconds === 60 && BIKE_SPORTS.includes(r.sport_id),
    computeCandidate: (r) => r.value,
    validate: (v, { ftp }) => validateBikePower("p60s_w", v, 4.0, 1200, ftp),
    snapshotField: "p60s_w" as keyof DbSnapshot,
    selection: "max",
    formatRaw: (r) => `${Math.round(r.value)} W`,
  },
  {
    label: "5 min — MAP",
    sportKind: "bike",
    match: (r) => r.cat === "ppr" && r.record_type === "time" && r.item_seconds === 300 && BIKE_SPORTS.includes(r.sport_id),
    computeCandidate: (r) => r.value,
    validate: (v, { ftp }) => {
      if (ftp && ftp > 0) {
        const r = v / ftp;
        if (r > 1.6) return { ok: false, reason: `ratio MAP/FTP = ${r.toFixed(2)} (seuil < 1.6)` };
      } else if (v >= 600) {
        return { ok: false, reason: `${v}W ≥ plafond absolu 600W (FTP indisponible)` };
      }
      return { ok: true };
    },
    snapshotField: "map5min_w" as keyof DbSnapshot,
    selection: "max",
    formatRaw: (r) => `${Math.round(r.value)} W`,
  },
  // ─── Course ─────────────────────────────────────────────────────────────
  {
    label: "5 km",
    sportKind: "run",
    match: (r) => r.cat === "par" && r.record_type === "distance" && r.item_seconds === 5000 && RUN_SPORTS.includes(r.sport_id),
    computeCandidate: (r) => r.value > 0 ? 5000 / r.value : null,
    validate: (t) => validateRaceTime(t, 840, 3600),
    snapshotField: "time_5k_sec" as keyof DbSnapshot,
    selection: "min",
    formatRaw: (r) => r.value > 0 ? fmtPace(1000 / r.value) : "—",
  },
  {
    label: "10 km",
    sportKind: "run",
    match: (r) => r.cat === "par" && r.record_type === "distance" && r.item_seconds === 10000 && RUN_SPORTS.includes(r.sport_id),
    computeCandidate: (r) => r.value > 0 ? 10000 / r.value : null,
    validate: (t) => validateRaceTime(t, 1800, 7200),
    snapshotField: "time_10k_sec" as keyof DbSnapshot,
    selection: "min",
    formatRaw: (r) => r.value > 0 ? fmtPace(1000 / r.value) : "—",
  },
  {
    label: "Semi (21,1 km)",
    sportKind: "run",
    match: (r) => r.cat === "par" && r.record_type === "distance" && r.item_seconds === 21097 && RUN_SPORTS.includes(r.sport_id),
    computeCandidate: (r) => r.value > 0 ? 21097 / r.value : null,
    validate: (t) => validateRaceTime(t, 3600, 16200),
    snapshotField: "time_half_sec" as keyof DbSnapshot,
    selection: "min",
    formatRaw: (r) => r.value > 0 ? fmtPace(1000 / r.value) : "—",
  },
  {
    label: "Marathon",
    sportKind: "run",
    match: (r) => r.cat === "par" && r.record_type === "distance" && r.item_seconds === 42195 && RUN_SPORTS.includes(r.sport_id),
    computeCandidate: (r) => r.value > 0 ? 42195 / r.value : null,
    validate: (t) => validateRaceTime(t, 7200, 32400),
    snapshotField: "time_marathon_sec" as keyof DbSnapshot,
    selection: "min",
    formatRaw: (r) => r.value > 0 ? fmtPace(1000 / r.value) : "—",
  },
  // ─── Natation (CSS — sélection min sur plusieurs candidats) ─────────────
  {
    label: "1500 m (dist)",
    sportKind: "swim",
    match: (r) => r.cat === "par" && r.record_type === "distance" && r.item_seconds === 1500 && r.sport_id === SWIM_SPORT,
    computeCandidate: (r) => r.value > 0 ? 100 / r.value : null,
    validate: (v) => (v >= 70 && v <= 180) ? { ok: true } : { ok: false, reason: `${v.toFixed(1)}s/100m hors plage [70, 180]` },
    snapshotField: "css",
    selection: "min",
    formatRaw: (r) => r.value > 0 ? fmtPace100(100 / r.value) : "—",
  },
  {
    label: "800 m (dist)",
    sportKind: "swim",
    match: (r) => r.cat === "par" && r.record_type === "distance" && r.item_seconds === 800 && r.sport_id === SWIM_SPORT,
    computeCandidate: (r) => r.value > 0 ? 100 / r.value : null,
    validate: (v) => (v >= 70 && v <= 180) ? { ok: true } : { ok: false, reason: `${v.toFixed(1)}s/100m hors plage [70, 180]` },
    snapshotField: "css",
    selection: "min",
    formatRaw: (r) => r.value > 0 ? fmtPace100(100 / r.value) : "—",
  },
  {
    label: "400 m (dist)",
    sportKind: "swim",
    match: (r) => r.cat === "par" && r.record_type === "distance" && r.item_seconds === 400 && r.sport_id === SWIM_SPORT,
    computeCandidate: (r) => r.value > 0 ? 100 / r.value : null,
    validate: (v) => (v >= 70 && v <= 180) ? { ok: true } : { ok: false, reason: `${v.toFixed(1)}s/100m hors plage [70, 180]` },
    snapshotField: "css",
    selection: "min",
    formatRaw: (r) => r.value > 0 ? fmtPace100(100 / r.value) : "—",
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Computation : rows enrichis avec statut
// ────────────────────────────────────────────────────────────────────────────

type EnrichedRow = {
  record: RecordRow;
  slotLabel: string;
  candidate: number | null;
  status: Status;
};

function computeRowsForKind(
  kind: "bike" | "run" | "swim",
  records: RecordRow[],
  snapshot: DbSnapshot | null,
): EnrichedRow[] {
  const ftp = snapshot?.ftp ?? null;
  const slots = SLOTS.filter(s => s.sportKind === kind);
  const out: EnrichedRow[] = [];

  for (const slot of slots) {
    const matching = records.filter(slot.match);
    if (matching.length === 0) continue;

    // Validation par record → liste des candidats valides
    const validated = matching.map(r => {
      const c = slot.computeCandidate(r);
      if (c == null || !Number.isFinite(c)) {
        return { r, c: null as number | null, valid: false as const, reason: "valeur non calculable" };
      }
      const v = slot.validate(c, { ftp });
      return v.ok
        ? { r, c, valid: true as const, reason: "" }
        : { r, c, valid: false as const, reason: v.reason };
    });

    // Choisit le candidat retenu (max ou min)
    const validCands = validated.filter(x => x.valid && x.c != null) as Array<{ r: RecordRow; c: number; valid: true; reason: string }>;
    let winnerCandidate: number | null = null;
    let winnerId: string | null = null;
    if (validCands.length > 0) {
      const sorted = [...validCands].sort((a, b) => slot.selection === "max" ? b.c - a.c : a.c - b.c);
      winnerCandidate = sorted[0].c;
      winnerId = sorted[0].r.id;
    }

    const snapVal = snapshot ? (snapshot[slot.snapshotField] as number | null | undefined) : null;

    for (const v of validated) {
      let status: Status;
      if (!v.valid) {
        status = { kind: "rejected", label: "Rejeté — hors plage", reason: v.reason };
      } else if (snapVal != null && Number.isFinite(snapVal)) {
        // Snapshot a une valeur : ce record est-il celui qui correspond ?
        const tol = slot.selection === "max"
          ? Math.max(1, Number(snapVal) * 0.02)
          : Math.max(1, Number(snapVal) * 0.02);
        if (v.r.id === winnerId && Math.abs(v.c! - Number(snapVal)) <= tol) {
          status = { kind: "active", label: "Actif dans le profil" };
        } else {
          const cmp = slot.selection === "max"
            ? v.c! < Number(snapVal)
            : v.c! > Number(snapVal);
          status = {
            kind: "ignored",
            label: "Ignoré",
            reason: cmp
              ? `valeur ${slot.selection === "max" ? "inférieure" : "plus lente"} à celle du snapshot (${Number(snapVal).toFixed(slot.sportKind === "bike" ? 0 : 1)})`
              : `non retenu (un autre record du même slot a primé)`,
          };
        }
      } else {
        // Pas de valeur dans snapshot : winner = neutre, autres = ignorés
        status = v.r.id === winnerId
          ? { kind: "neutral", label: "Disponible — non appliqué au snapshot" }
          : { kind: "ignored", label: "Ignoré", reason: "non retenu (un autre record du même slot a primé)" };
      }
      out.push({ record: v.r, slotLabel: slot.label, candidate: v.c, status });
    }
  }

  // Tri par slot puis date desc
  return out.sort((a, b) => {
    if (a.slotLabel !== b.slotLabel) return a.slotLabel.localeCompare(b.slotLabel);
    return String(b.record.date_recorded ?? "").localeCompare(String(a.record.date_recorded ?? ""));
  });
}

// ────────────────────────────────────────────────────────────────────────────
// Composant principal
// ────────────────────────────────────────────────────────────────────────────

const MANUAL_FIELDS: Array<{ key: keyof DbSnapshot; label: string }> = [
  { key: "pmax_5s", label: "Pmax 5s" },
  { key: "p30s_w" as keyof DbSnapshot, label: "P30s" },
  { key: "p60s_w" as keyof DbSnapshot, label: "P60s" },
  { key: "map5min_w" as keyof DbSnapshot, label: "MAP 5min" },
  { key: "fc_max", label: "FC max" },
];

export function RecordsTransparencyView({
  athleteId,
  activeSnapshot,
  records,
  onChanged,
}: {
  athleteId: string;
  activeSnapshot: DbSnapshot | null;
  records: RecordRow[];
  onChanged: () => void;
}) {
  const [recomputing, setRecomputing] = useState(false);

  const bikeRows = useMemo(() => computeRowsForKind("bike", records, activeSnapshot), [records, activeSnapshot]);
  const runRows = useMemo(() => computeRowsForKind("run", records, activeSnapshot), [records, activeSnapshot]);
  const swimRows = useMemo(() => computeRowsForKind("swim", records, activeSnapshot), [records, activeSnapshot]);

  // ─── Alerte champ manuel ancien ────────────────────────────────────────
  const manualAlert = useMemo(() => {
    if (!activeSnapshot || activeSnapshot.source !== "manual") return null;
    const ageDays = Math.floor((Date.now() - new Date(activeSnapshot.date + "T00:00:00Z").getTime()) / 86400000);
    if (ageDays < 90) return null;
    const presentFields = MANUAL_FIELDS.filter(f => {
      const v = activeSnapshot[f.key] as number | null | undefined;
      return v != null && Number.isFinite(Number(v));
    });
    if (presentFields.length === 0) return null;
    return { ageDays, fields: presentFields };
  }, [activeSnapshot]);

  const clearField = async (key: keyof DbSnapshot, label: string) => {
    if (!activeSnapshot) return;
    if (!confirm(`Mettre à null le champ "${label}" du snapshot actif ?\n\nCela permettra à l'import Nolio d'écrire une nouvelle valeur.`)) return;
    const { error } = await supabase
      .from("snapshots")
      .update({ [key]: null } as any)
      .eq("id", activeSnapshot.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `${label} mis à null` });
    onChanged();
  };

  const recompute = async () => {
    setRecomputing(true);
    try {
      const { data, error } = await supabase.functions.invoke("nolio-records", {
        body: { remap_only: true, athlete_ids: [athleteId], force_overwrite: true },
      });
      if (error) throw error;
      const errs = (data?.summary?.[0]?.errors as string[] | undefined) ?? [];
      const updates = (data?.summary?.[0] as any)?.snapshot_updates ?? 0;
      toast({
        title: "Profil recalculé",
        description: `${updates} champ(s) mis à jour${errs.length ? ` · ${errs.length} note(s)` : ""}`,
      });
      onChanged();
    } catch (e) {
      toast({ title: "Erreur", description: (e as Error).message, variant: "destructive" });
    } finally {
      setRecomputing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ─── Alerte manual ancien ──────────────────────────────────────── */}
      {manualAlert && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-semibold mb-1">
              ⚠️ Snapshot manuel ancien ({manualAlert.ageDays} jours)
            </div>
            <div className="text-xs mb-2">
              Ces champs manuels peuvent bloquer l'import Nolio (la logique <code>betterMax</code> ne remplace pas une valeur supérieure existante). Vérifiez si vous voulez les remettre à null :
            </div>
            <div className="flex flex-wrap gap-2">
              {manualAlert.fields.map(f => (
                <Button
                  key={String(f.key)}
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs bg-background"
                  onClick={() => clearField(f.key, f.label)}
                >
                  {f.label} = {String(activeSnapshot![f.key])} → null
                </Button>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* ─── Recompute button ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Vue transparente — statut calculé en comparant chaque record brut au snapshot actif.
        </div>
        <Button size="sm" variant="outline" onClick={recompute} disabled={recomputing}>
          <RefreshCw className={`h-3 w-3 mr-1 ${recomputing ? "animate-spin" : ""}`} />
          🔄 Recalculer le profil depuis les records
        </Button>
      </div>

      {/* ─── Tableaux par sport ────────────────────────────────────────── */}
      <SportTable title="🚴 Vélo (puissance)" rows={bikeRows} />
      <SportTable title="🏃 Course (allure)" rows={runRows} />
      <SportTable title="🏊 Natation (CSS)" rows={swimRows} />

      {bikeRows.length + runRows.length + swimRows.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-6">
          Aucun record détecté pour les slots standards (Pmax 5s, MAP, 5/10/Semi/Marathon, CSS).
        </div>
      )}
    </div>
  );
}

function SportTable({ title, rows }: { title: string; rows: EnrichedRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div>
      <div className="font-semibold text-sm mb-2">{title}</div>
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Slot</TableHead>
              <TableHead className="text-xs">Valeur brute</TableHead>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Source</TableHead>
              <TableHead className="text-xs">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const meta = STATUS_BADGE[row.status.kind];
              const reason = (row.status as any).reason as string | undefined;
              return (
                <TableRow key={row.record.id}>
                  <TableCell className="text-xs font-medium">{row.slotLabel}</TableCell>
                  <TableCell className="text-xs font-mono">{SLOTS.find(s => s.label === row.slotLabel)?.formatRaw(row.record) ?? row.record.value}</TableCell>
                  <TableCell className="text-xs">{fmtDate(row.record.date_recorded)}</TableCell>
                  <TableCell className="text-xs">
                    {row.record.source === "manual" ? "✍️ manuel" : "nolio"}
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="flex flex-col gap-0.5">
                      <Badge variant={meta.variant} className="w-fit text-[10px]">
                        {meta.emoji} {row.status.label}
                      </Badge>
                      {reason && (
                        <span className="text-[10px] text-muted-foreground">{reason}</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
