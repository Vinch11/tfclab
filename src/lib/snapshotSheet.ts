/**
 * Fiche athlète en lecture : un résumé par bloc (Contexte, Vélo, Course, Natation, Durabilité, Labo, Notes),
 * chaque valeur avec sa source quand elle est connue. Aucun calcul de modèle : seulement ce qui est enregistré.
 */
import { criticalEnvelope, parseStoredCriticalMetrics, type StoredCriticalSport } from "@/lib/criticalMetrics";
import { parseStoredDurability } from "@/lib/durability/longSessionDurability";
import { readThresholdOrigin, type ThresholdOrigin } from "@/lib/zones/thresholdOrigin";
import { readLabExtras, readTte, readVo2max, type Vo2maxOrigin } from "@/lib/snapshotTestDays";

export type SheetBlockId = "ctx" | "bike" | "run" | "swim" | "durability" | "labo" | "notes";
export interface SheetRow { label: string; value: string; source?: string }
export interface SheetBlock { id: SheetBlockId; title: string; summary: string; rows: SheetRow[] }

export interface SheetSnapshot {
  date: string; source?: string | null;
  weight_kg?: number | null; fc_max?: number | null; fc_repos?: number | null;
  pmax_5s?: number | null; p30s_w?: number | null; p60s_w?: number | null; map5min_w?: number | null;
  ftp?: number | null; tte_observed_min?: number | null;
  sprint_15s_distance?: number | null; vma?: number | null; pace_threshold_sec_per_km?: number | null; tte_observed_min_run?: number | null;
  run_pace_ref_sec_per_km?: number | null; run_hr_ref_bpm?: number | null; run_hr_drift_pct?: number | null;
  css?: number | null; vo2max?: number | null; vlamax?: number | null; vlamax_run?: number | null; fat_pct?: number | null;
  time_5k_sec?: number | null; time_10k_sec?: number | null; time_20k_sec?: number | null; time_half_sec?: number | null; time_marathon_sec?: number | null;
  time_5k_date?: string | null; time_10k_date?: string | null; time_20k_date?: string | null; time_half_date?: string | null; time_marathon_date?: string | null;
  critical_metrics?: unknown; field_sources?: unknown; coach_notes?: string | null;
}

export const SNAPSHOT_SOURCE_LABEL: Record<string, string> = {
  track_day: "Track Day", bike_track_day: "Bike Day", swim_pool_day: "Pool Day", tri_test_day: "Tri Day",
  tfcl_testing_week: "Testing Week", lab_import: "Labo", nolio: "Nolio", manual: "Saisie", staff: "Saisie staff",
  profil_express: "Profil express",
};
const ORIGIN_LABEL: Record<ThresholdOrigin, string> = {
  test_20min: "test 20 min", cp_test: "Bike Day", track_day_cs: "Track Day", calculator: "calculateur", watch: "montre", entered: "saisie",
};
const VO2_LABEL: Record<Vo2maxOrigin, string> = { lab: "labo", estimated: "estimation 3,5 × VMA", watch: "montre, hors calculs", entered: "saisie" };

const ok = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
const fr = (v: number, d = 0) => v.toLocaleString("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: 0 });
const mmss = (sec: number) => { const t = Math.round(sec); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; };
const dateFr = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const criticalLabel = (c: StoredCriticalSport) => (c.status === "confirmed" ? "confirmée" : "estimation");

/** Durability Day (deux blocs de 10 min) : découplage en %, enregistré comme test et non dans le bilan. */
export interface SheetDurabilityPair { sport: "bike" | "run"; decouplingPct: number; day: string }

export interface SheetAthlete { sex?: string | null; birthDate?: string | null }
const ageAt = (birth: string, on: string) => { const b = new Date(birth + "T00:00:00Z"), d = new Date(on + "T00:00:00Z"); let a = d.getUTCFullYear() - b.getUTCFullYear(); if (d.getUTCMonth() < b.getUTCMonth() || (d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate())) a--; return a; };

const hms = (sec: number) => { const t = Math.round(sec), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), x = t % 60; return h ? `${h}:${String(m).padStart(2, "0")}:${String(x).padStart(2, "0")}` : `${m}:${String(x).padStart(2, "0")}`; };
const CHRONOS = [["time_5k", "Chrono 5 km", 5], ["time_10k", "Chrono 10 km", 10], ["time_20k", "Chrono 20 km", 20], ["time_half", "Chrono semi", 21.0975], ["time_marathon", "Chrono marathon", 42.195]] as const;
function chronoRows(s: SheetSnapshot): SheetRow[] {
  const r = s as unknown as Record<string, unknown>;
  return CHRONOS.flatMap(([k, label, km]) => {
    const sec = r[`${k}_sec`], date = r[`${k}_date`];
    return typeof sec === "number" && sec > 0 ? [{ label, value: `${hms(sec)} (${mmss(sec / km)}/km)`, source: typeof date === "string" && date ? dateFr(date) : undefined }] : [];
  });
}

export function buildSnapshotSheet(s: SheetSnapshot, extras: { durabilityPairs?: SheetDurabilityPair[]; athlete?: SheetAthlete } = {}): SheetBlock[] {
  const critical = parseStoredCriticalMetrics(s.critical_metrics);
  const durability = parseStoredDurability(s.critical_metrics);
  const ftpOrigin = readThresholdOrigin(s.field_sources, "ftp");
  const paceOrigin = readThresholdOrigin(s.field_sources, "pace_threshold_sec_per_km");
  const vo2 = readVo2max(s);
  const tte = readTte(s);
  const tteRow = (sport: "bike" | "run"): SheetRow | null => {
    const t = tte[sport];
    if (t.value == null) return null;
    const ref = t.ref == null ? "" : sport === "bike" ? ` à ${Math.round(t.ref)} W` : ` à ${mmss(t.ref)}/km`;
    if (t.stale) {
      const thr = t.threshold == null ? "" : sport === "bike" ? ` (FTP ${t.threshold} W)` : ` (seuil ${mmss(t.threshold)}/km)`;
      return { label: "Durée tenue au seuil", value: `${t.value} min${ref}${thr}`, source: "autre seuil, hors calculs : à refaire" };
    }
    return { label: "Durée tenue au seuil", value: `${t.value} min${ref}` };
  };
  const blocks: SheetBlock[] = [];
  const push = (id: SheetBlockId, title: string, rows: SheetRow[], summary: string[]) =>
    blocks.push({ id, title, rows, summary: summary.filter(Boolean).join(" · ") || "À compléter" });

  // Contexte — sexe et âge viennent de l'athlète (ils ajustent les repères de l'objectif).
  const who = extras.athlete;
  const sexText = who?.sex === "F" ? "Femme" : who?.sex === "M" ? "Homme" : "";
  const age = who?.birthDate ? ageAt(who.birthDate, s.date) : null;
  const identityRow: SheetRow | null = who ? (sexText && age != null
    ? { label: "Athlète", value: `${sexText} · ${age} ans` }
    : { label: "Sexe et âge", value: [sexText, age != null ? `${age} ans` : ""].filter(Boolean).join(" · ") || "non renseignés", source: "à compléter : repères non ajustés" }) : null;
  push("ctx", "Contexte", [
    identityRow,
    ok(s.weight_kg) ? { label: "Poids", value: `${fr(s.weight_kg, 1)} kg` } : null,
    ok(s.fc_max) ? { label: "FC max", value: `${s.fc_max} bpm` } : null,
    ok(s.fc_repos) ? { label: "FC repos", value: `${s.fc_repos} bpm` } : null,
  ].filter(Boolean) as SheetRow[], [sexText && age != null ? `${sexText}, ${age} ans` : who ? "Sexe/âge à renseigner" : "", ok(s.weight_kg) ? `${fr(s.weight_kg, 1)} kg` : "", ok(s.fc_max) ? `FC max ${s.fc_max}` : "", ok(s.fc_repos) ? `FC repos ${s.fc_repos}` : ""]);

  // Vélo
  const cp = critical.cycling;
  push("bike", "Vélo", [
    cp ? { label: "Puissance critique (CP)", value: `${Math.round(cp.critical)} W · W′ ${fr(cp.reserve / 1000, 1)} kJ`, source: criticalLabel(cp) } : null,
    ok(s.ftp) ? { label: "FTP / seuil", value: `${s.ftp} W`, source: ftpOrigin ? ORIGIN_LABEL[ftpOrigin] : undefined } : null,
    ok(s.pmax_5s) ? { label: "Sprint 5 s", value: `${s.pmax_5s} W` } : null,
    ok(s.p30s_w) ? { label: "30 s", value: `${s.p30s_w} W` } : null,
    ok(s.p60s_w) ? { label: "60 s", value: `${s.p60s_w} W` } : null,
    ok(s.map5min_w) ? { label: "Puissance 5 min", value: `${s.map5min_w} W` } : null,
    tteRow("bike"),
  ].filter(Boolean) as SheetRow[], [
    cp ? `CP ${Math.round(cp.critical)} W (${criticalLabel(cp)})` : ok(s.ftp) ? `FTP ${s.ftp} W${ftpOrigin ? ` (${ORIGIN_LABEL[ftpOrigin]})` : ""}` : "",
    ok(s.map5min_w) ? `5 min ${s.map5min_w} W` : "",
  ]);

  // Course — CS ajustée (repères critiques), sinon CS à deux distances calculée par le Track Day.
  const cs = critical.running;
  const track = criticalEnvelope(s.critical_metrics).trackDay as { csMs?: unknown; dPrimeM?: unknown } | undefined;
  const trackCs = !cs && track && ok(track.csMs) ? { ms: track.csMs, d: ok(track.dPrimeM) ? track.dPrimeM : null } : null;
  push("run", "Course", [
    cs ? { label: "Vitesse critique (CS)", value: `${mmss(1000 / cs.critical)}/km · D′ ${Math.round(cs.reserve)} m`, source: criticalLabel(cs) }
      : trackCs ? { label: "Vitesse critique (CS)", value: `${mmss(1000 / trackCs.ms)}/km${trackCs.d ? ` · D′ ${Math.round(trackCs.d)} m` : ""}`, source: "Track Day 1 500 / 3 000 m, à valider" } : null,
    ok(s.pace_threshold_sec_per_km) ? { label: "Allure seuil", value: `${mmss(s.pace_threshold_sec_per_km)}/km`, source: paceOrigin ? ORIGIN_LABEL[paceOrigin] : undefined } : null,
    ok(s.vma) ? { label: "VMA", value: `${fr(s.vma, 1)} km/h` } : null,
    ok(s.sprint_15s_distance) ? { label: "Sprint 15 s", value: `${fr(s.sprint_15s_distance)} m` } : null,
    tteRow("run"),
    ...chronoRows(s),
    ok(s.run_pace_ref_sec_per_km) && ok(s.run_hr_ref_bpm)
      ? { label: "FC à allure stable", value: `${s.run_hr_ref_bpm} bpm à ${mmss(s.run_pace_ref_sec_per_km)}/km${typeof s.run_hr_drift_pct === "number" ? ` · dérive ${fr(s.run_hr_drift_pct, 1)} %` : ""}` } : null,
  ].filter(Boolean) as SheetRow[], [
    cs ? `CS ${mmss(1000 / cs.critical)}/km (${criticalLabel(cs)})` : trackCs ? `CS ${mmss(1000 / trackCs.ms)}/km (Track Day)` : ok(s.pace_threshold_sec_per_km) ? `Seuil ${mmss(s.pace_threshold_sec_per_km)}/km${paceOrigin ? ` (${ORIGIN_LABEL[paceOrigin]})` : ""}` : "",
    ok(s.vma) ? `VMA ${fr(s.vma, 1)} km/h` : "",
  ]);

  // Natation
  push("swim", "Natation", ok(s.css) ? [{ label: "CSS", value: `${mmss(s.css)}/100 m` }] : [], [ok(s.css) ? `CSS ${mmss(s.css)}/100 m` : ""]);

  // Durabilité
  const dur: SheetRow[] = [];
  const durSummary: string[] = [];
  for (const sp of ["bike", "run"] as const) {
    const name = sp === "bike" ? "Vélo" : "Course";
    const pair = (extras.durabilityPairs ?? []).find(p => p.sport === sp);
    if (pair) {
      dur.push({ label: `${name} · Durability Day`, value: `${fr(pair.decouplingPct, 1)} % de découplage (${dateFr(pair.day)})`, source: "test" });
      durSummary.push(`${name} ${fr(pair.decouplingPct, 1)} %`);
    }
    const d = durability[sp];
    if (d) {
      dur.push({ label: `${name} · sorties longues Nolio`, value: `${d.meanChangePct > 0 ? "+" : ""}${fr(d.meanChangePct, 1)} % sur l’effort de 20 min en fin de sortie (${d.sessions.length} séances)`, source: "à vérifier" });
      if (!pair) durSummary.push(`${name} ${d.meanChangePct > 0 ? "+" : ""}${fr(d.meanChangePct, 1)} %`);
    }
  }
  push("durability", "Durabilité", dur, durSummary);

  // Labo
  push("labo", "Labo", [
    vo2.value != null ? { label: "VO₂max", value: `${fr(vo2.value, 1)} ml/kg/min`, source: vo2.origin ? VO2_LABEL[vo2.origin] : "provenance à préciser" } : null,
    ok(s.vlamax) ? { label: "VLamax vélo", value: `${fr(s.vlamax, 2)} mmol/L/s`, source: "mesurée" } : null,
    ok(s.vlamax_run) ? { label: "VLamax course", value: `${fr(s.vlamax_run, 2)} mmol/L/s`, source: "mesurée" } : null,
    ok(s.fat_pct) ? { label: "Masse grasse", value: `${fr(s.fat_pct, 1)} %` } : null,
    ...(() => { const lab = readLabExtras(s.critical_metrics); return [
      lab.mlssW != null ? { label: "MLSS mesurée (vélo)", value: `${lab.mlssW} W`, source: "labo" } : null,
      lab.lactateMmol != null ? { label: "Lactate au seuil", value: `${fr(lab.lactateMmol, 1)} mmol/L`, source: "labo" } : null,
    ]; })(),
  ].filter(Boolean) as SheetRow[], [vo2.value != null ? `VO₂max ${fr(vo2.value, 1)}${vo2.origin ? ` (${VO2_LABEL[vo2.origin]})` : ""}` : "", ok(s.vlamax) ? `VLamax ${fr(s.vlamax, 2)}` : ""]);

  // Notes
  const notes = (s.coach_notes ?? "").trim();
  push("notes", "Notes coach", notes ? [{ label: "Notes", value: notes }] : [], [notes ? (notes.length > 70 ? `${notes.slice(0, 70)}…` : notes) : ""]);

  return blocks;
}

export const sheetHeadline = (s: SheetSnapshot) =>
  `Bilan du ${dateFr(s.date)}${s.source ? ` · ${SNAPSHOT_SOURCE_LABEL[s.source] ?? s.source}` : ""}`;
