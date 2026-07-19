/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Scientific Audit Report — Rapport consolidé signé
 *
 * Agrège dans un seul rapport HTML imprimable (PDF) :
 *  - Profil athlète + snapshot effectif
 *  - Historique VLAMAX_MODEL_TRACE (traces moteur V2)
 *  - Historique RUN_MLSS_MODEL_C_TRACE (traces Modèle C run)
 *  - Snapshots de calibration (calibration_snapshots)
 *  - Preuves terrain utilisées (calibration_evidence — hors traces machine)
 *  - Coach overrides (coach_overrides)
 *  - Version courante de la cohorte littérature
 *
 * Empreinte (hash SHA-256) calculée sur le payload pour "signer" le rapport :
 *  le coach peut vérifier ultérieurement qu'aucune donnée n'a été altérée.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { supabase } from "@/integrations/supabase/client";
import { loadVLamaxTraces, VLAMAX_TRACE_EVIDENCE_TYPE, type VLamaxTracePayload } from "@/lib/v2/vlamaxTracePersistence";
import { loadRunMLSSTraces, RUN_MLSS_TRACE_EVIDENCE_TYPE, type RunMLSSTracePayload } from "@/lib/v2/runMLSSTracePersistence";

export interface ScientificAuditData {
  athlete: { id: string; name: string; sport?: string | null; objectif?: string | null };
  generatedAt: string;
  generatedBy: string;
  vlamaxTraces: Array<{ id: string; date: string; payload: VLamaxTracePayload }>;
  runMLSSTraces: Array<{ id: string; date: string; payload: RunMLSSTracePayload }>;
  calibrationSnapshots: any[];
  fieldEvidences: any[];
  coachOverrides: any[];
  literatureVersion: { version: string; total_profiles: number; total_studies: number; model: string } | null;
  signature: string;
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function gatherScientificAuditData(opts: {
  athleteId: string;
  athleteName: string;
  sport?: string | null;
  objectif?: string | null;
  generatedBy: string;
}): Promise<ScientificAuditData> {
  const [vlamaxTraces, runMLSSTraces, snapshotsRes, evidencesRes, overridesRes, litRes] = await Promise.all([
    loadVLamaxTraces(opts.athleteId, 50),
    loadRunMLSSTraces(opts.athleteId, 50),
    supabase.from("calibration_snapshots").select("*").eq("athlete_id", opts.athleteId).order("date", { ascending: false }).limit(20),
    supabase
      .from("calibration_evidence")
      .select("*")
      .eq("athlete_id", opts.athleteId)
      .not("evidence_type", "in", `(${VLAMAX_TRACE_EVIDENCE_TYPE},${RUN_MLSS_TRACE_EVIDENCE_TYPE})`)
      .order("date", { ascending: false })
      .limit(50),
    supabase.from("coach_overrides").select("*").eq("athlete_id", opts.athleteId).order("date", { ascending: false }).limit(50),
    supabase.from("literature_cohort_versions").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const data: Omit<ScientificAuditData, "signature"> = {
    athlete: { id: opts.athleteId, name: opts.athleteName, sport: opts.sport ?? null, objectif: opts.objectif ?? null },
    generatedAt: new Date().toISOString(),
    generatedBy: opts.generatedBy,
    vlamaxTraces,
    runMLSSTraces,
    calibrationSnapshots: snapshotsRes.data ?? [],
    fieldEvidences: evidencesRes.data ?? [],
    coachOverrides: overridesRes.data ?? [],
    literatureVersion: litRes.data ?? null,
  };

  const signature = await sha256Hex(JSON.stringify(data));
  return { ...data, signature };
}

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(s: string | null | undefined): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return s;
  }
}

function fmtNum(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return Number(n).toFixed(digits);
}

export function buildScientificAuditHTML(data: ScientificAuditData): string {
  const { athlete, vlamaxTraces, runMLSSTraces, calibrationSnapshots, fieldEvidences, coachOverrides, literatureVersion, signature } = data;

  const vlamaxRows = vlamaxTraces
    .map(
      (t) => `
      <tr>
        <td>${fmtDate(t.date)}</td>
        <td><b>${fmtNum(t.payload.result?.value, 3)}</b> mmol/L/s</td>
        <td>[${fmtNum(t.payload.result?.rangeMin, 2)} – ${fmtNum(t.payload.result?.rangeMax, 2)}]</td>
        <td>${Math.round((t.payload.result?.confidence ?? 0) * 100)}%</td>
        <td>${esc(t.payload.result?.formulaLabel ?? "—")}</td>
        <td>${esc(t.payload.hybridTier ?? "—")}</td>
        <td class="mono">${esc(t.payload.version)}</td>
      </tr>`,
    )
    .join("");

  const runMlssRows = runMLSSTraces
    .map(
      (t) => `
      <tr>
        <td>${fmtDate(t.date)}</td>
        <td>${esc(t.payload.effectiveSource)}</td>
        <td><b>${fmtNum(t.payload.effectivePct, 1)}%</b></td>
        <td>${fmtNum(t.payload.predictedPct, 1)}%</td>
        <td>${fmtNum(t.payload.observedPct, 1)}%</td>
        <td>${t.payload.crossValidationDeltaPct != null ? `${t.payload.crossValidationDeltaPct > 0 ? "+" : ""}${fmtNum(t.payload.crossValidationDeltaPct, 2)}%` : "—"}</td>
        <td><span class="badge ${t.payload.crossValidationSeverity ?? ""}">${esc(t.payload.crossValidationSeverity ?? "—")}</span></td>
        <td>${Math.round((t.payload.predictionConfidence ?? 0) * 100)}%</td>
      </tr>`,
    )
    .join("");

  const snapshotRows = calibrationSnapshots
    .map(
      (s: any) => `
      <tr>
        <td>${fmtDate(s.date)}</td>
        <td>${fmtNum(s.vlamax_modelled, 3)}</td>
        <td><b>${fmtNum(s.vlamax_calibrated, 3)}</b></td>
        <td>[${fmtNum(s.vlamax_range_p25, 2)} – ${fmtNum(s.vlamax_range_p75, 2)}]</td>
        <td>${Math.round((Number(s.confidence) || 0) * 100)}%</td>
        <td>${s.is_locked ? "🔒" : "—"}</td>
        <td>${s.recalibration_recommended ? `⚠ ${esc(s.recalibration_reason ?? "")}` : "OK"}</td>
        <td>${(s.evidence_ids?.length ?? 0)}</td>
      </tr>`,
    )
    .join("");

  const evidenceRows = fieldEvidences
    .map(
      (e: any) => `
      <tr>
        <td>${fmtDate(e.date)}</td>
        <td>${esc(e.evidence_type)}</td>
        <td>${esc(e.source_type)}</td>
        <td>Q${e.protocol_quality}/5</td>
        <td>${esc(e.validity)}</td>
        <td>${Math.round((Number(e.confidence_evidence) || 0) * 100)}%</td>
        <td>${e.used_in_calibration ? "✓" : "—"}</td>
        <td class="small">${esc(e.notes ?? "—")}</td>
      </tr>`,
    )
    .join("");

  const overrideRows = coachOverrides
    .map(
      (o: any) => `
      <tr>
        <td>${fmtDate(o.date)}</td>
        <td>${esc(o.module)}</td>
        <td>${esc(o.action)}</td>
        <td class="mono small">${esc(JSON.stringify(o.before_value))}</td>
        <td class="mono small">${esc(JSON.stringify(o.after_value))}</td>
        <td class="small">${esc(o.reason ?? "—")}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8"/>
<title>Audit scientifique — ${esc(athlete.name)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;max-width:1100px;margin:24px auto;padding:0 24px;line-height:1.45;font-size:13px}
  h1{font-size:24px;margin:0 0 4px 0;color:#0f172a}
  h2{font-size:16px;margin:28px 0 10px 0;padding-bottom:6px;border-bottom:2px solid #0f172a;color:#0f172a}
  h3{font-size:13px;margin:12px 0 6px 0;color:#475569;text-transform:uppercase;letter-spacing:.05em}
  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0f172a;padding-bottom:12px;margin-bottom:16px}
  .meta{font-size:11px;color:#475569;text-align:right}
  .meta div{margin:2px 0}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:24px}
  .grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}
  .kpi{border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;background:#f8fafc}
  .kpi .v{font-size:18px;font-weight:700;color:#0f172a}
  .kpi .l{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.04em}
  table{width:100%;border-collapse:collapse;font-size:11.5px;margin-top:6px}
  th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;vertical-align:top}
  th{background:#f1f5f9;font-weight:600;color:#0f172a}
  tr:nth-child(even) td{background:#fafafa}
  .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:10.5px}
  .small{font-size:10.5px;color:#475569}
  .badge{display:inline-block;padding:1px 6px;border-radius:4px;font-size:10px;font-weight:600;background:#e2e8f0;color:#334155}
  .badge.ok{background:#dcfce7;color:#166534}
  .badge.warning{background:#fef3c7;color:#92400e}
  .badge.critical{background:#fee2e2;color:#991b1b}
  .sig{margin-top:32px;padding:12px;border:1px dashed #94a3b8;border-radius:8px;background:#f8fafc}
  .sig .l{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
  .sig .h{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:10px;word-break:break-all;color:#0f172a}
  .empty{font-style:italic;color:#94a3b8;padding:8px 0}
  .legend{font-size:10.5px;color:#475569;margin-top:6px}
  @media print{body{margin:0;padding:0 14mm;font-size:11px}h2{page-break-after:avoid}table{page-break-inside:auto}tr{page-break-inside:avoid}}
</style>
</head>
<body>

<div class="header">
  <div style="display:flex;align-items:center;gap:14px;">
    <img src="${new URL("../../assets/logo-2fc.png", import.meta.url).href}" alt="TFC Lab" style="height:56px;width:auto;" crossorigin="anonymous" />
    <div>
      <h1>Audit scientifique consolidé</h1>
      <div class="small">Potentiel Physiologique TFCL™ — Rapport signé</div>
    </div>
  </div>
  <div class="meta">
    <div><b>Athlète :</b> ${esc(athlete.name)}</div>
    <div><b>Sport :</b> ${esc(athlete.sport ?? "—")}</div>
    <div><b>Objectif :</b> ${esc(athlete.objectif ?? "—")}</div>
    <div><b>Généré le :</b> ${fmtDate(data.generatedAt)}</div>
    <div><b>Par :</b> ${esc(data.generatedBy)}</div>
  </div>
</div>

<div class="grid4">
  <div class="kpi"><div class="v">${vlamaxTraces.length}</div><div class="l">Traces VLamax</div></div>
  <div class="kpi"><div class="v">${runMLSSTraces.length}</div><div class="l">Traces Run MLSS</div></div>
  <div class="kpi"><div class="v">${calibrationSnapshots.length}</div><div class="l">Snapshots calibration</div></div>
  <div class="kpi"><div class="v">${fieldEvidences.length}</div><div class="l">Preuves terrain</div></div>
</div>

<h2>1. Moteur VLamax — Traces (V2 Enhanced)</h2>
<div class="legend">Source : <span class="mono">VLAMAX_MODEL_TRACE</span> — fusion 4 méthodes (Mader MLSS, Mader TTE, Score G, W' implied). RMSE bike calibré N=44 (α=1.98).</div>
${vlamaxTraces.length ? `<table>
  <thead><tr><th>Date</th><th>VLamax</th><th>Range</th><th>Conf.</th><th>Formule</th><th>Tier</th><th>Version</th></tr></thead>
  <tbody>${vlamaxRows}</tbody>
</table>` : '<div class="empty">Aucune trace VLamax persistée.</div>'}

<h2>2. Run MLSS Modèle C — Traces & cross-validation</h2>
<div class="legend">Source : <span class="mono">RUN_MLSS_MODEL_C_TRACE</span> — formule MLSS_pct = 1 − 0.337·VLa − 0.0021·(CE−200). RMSE 2.64% (N=14+3).</div>
${runMLSSTraces.length ? `<table>
  <thead><tr><th>Date</th><th>Source</th><th>Effectif</th><th>Prédit</th><th>Observé</th><th>Δ</th><th>Sévérité</th><th>Conf.</th></tr></thead>
  <tbody>${runMlssRows}</tbody>
</table>` : '<div class="empty">Aucune trace Run MLSS persistée.</div>'}

<h2>3. Snapshots de calibration VLamax</h2>
<div class="legend">Fenêtre glissante 42 jours — calibration_snapshots. Pondération : base × qualité × décroissance temporelle.</div>
${calibrationSnapshots.length ? `<table>
  <thead><tr><th>Date</th><th>Modélisée</th><th>Calibrée</th><th>P25–P75</th><th>Conf.</th><th>Lock</th><th>Recalibration</th><th>N preuves</th></tr></thead>
  <tbody>${snapshotRows}</tbody>
</table>` : '<div class="empty">Aucun snapshot calibration enregistré.</div>'}

<h2>4. Preuves terrain (calibration evidence)</h2>
<div class="legend">Preuves utilisées par le moteur de calibration (hors traces machine).</div>
${fieldEvidences.length ? `<table>
  <thead><tr><th>Date</th><th>Type</th><th>Source</th><th>Qualité</th><th>Validité</th><th>Conf.</th><th>Utilisée</th><th>Notes</th></tr></thead>
  <tbody>${evidenceRows}</tbody>
</table>` : '<div class="empty">Aucune preuve terrain enregistrée.</div>'}

<h2>5. Overrides coach</h2>
<div class="legend">Décisions manuelles du coach surchargeant le moteur automatique. Audit complet pour traçabilité.</div>
${coachOverrides.length ? `<table>
  <thead><tr><th>Date</th><th>Module</th><th>Action</th><th>Avant</th><th>Après</th><th>Raison</th></tr></thead>
  <tbody>${overrideRows}</tbody>
</table>` : '<div class="empty">Aucun override coach enregistré.</div>'}

<h2>6. Référentiel scientifique courant</h2>
${literatureVersion ? `<table>
  <tr><th style="width:30%">Version</th><td><b>${esc(literatureVersion.version)}</b></td></tr>
  <tr><th>Modèle</th><td>${esc(literatureVersion.model)}</td></tr>
  <tr><th>Études indexées</th><td>${literatureVersion.total_studies}</td></tr>
  <tr><th>Profils référentiels</th><td>${literatureVersion.total_profiles}</td></tr>
</table>` : '<div class="empty">Aucune version de cohorte littérature publiée.</div>'}

<h2>7. Modèles scientifiques en usage</h2>
<table>
  <tr><th style="width:30%">Domaine</th><th>Modèle / Référence</th><th>Calibration</th></tr>
  <tr><td>VLamax bike</td><td>Mader-Heck (1991, 1985) — α=1.98</td><td>N=44 labo, forward+inverse alignés</td></tr>
  <tr><td>VLamax run</td><td>Fusion 4 méthodes (sprint, ratio seuil/VMA, CAP anchor, Score G)</td><td>N=15 CAP anchor (3 coach + 12 lit), RMSE 0.073</td></tr>
  <tr><td>MLSS bike</td><td>Mader-Heck findMLSSPower</td><td>Calibré N=44</td></tr>
  <tr><td>MLSS run</td><td>Modèle C : 1 − 0.337·VLa − 0.0021·(CE−200)</td><td>N=14+3, RMSE 2.64%</td></tr>
  <tr><td>FatMax</td><td>Formule unifiée : clamp(78−52·(VLa−0.25)+0.15·(VO2−50), 48, 82)</td><td>—</td></tr>
  <tr><td>Critical Power</td><td>Monod-Scherrer regression (6 règles de validation)</td><td>—</td></tr>
  <tr><td>TTE</td><td>Modèle effectif sport-aware avec ajustement masters (−2/−5/−8 min)</td><td>Fallback TSS 7j si non observé</td></tr>
  <tr><td>Nutrition CHO</td><td>computeBaseRateMader (Mader-Heck), heat +10% non doublonné</td><td>—</td></tr>
  <tr><td>Pacing Envelope</td><td>Race Sim v4 refined precision ±2-3%</td><td>—</td></tr>
</table>

<div class="sig">
  <div class="l">Empreinte SHA-256 du rapport (signature d'intégrité)</div>
  <div class="h">${signature}</div>
  <div class="small" style="margin-top:6px">Toute modification ultérieure d'une trace, snapshot ou override modifie cette empreinte. Conservez-la pour vérification.</div>
</div>

</body>
</html>`;
}
