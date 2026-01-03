// =============================================
// OUTILS EXPORT CSV / PDF – RAPPORT COMPLET CLOUD
// Utilise les données cloud réelles (snapshots, tests, calculateurs unifiés)
// =============================================

import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { DbAthlete, DbSnapshot, DbTest } from "@/hooks/useCloudData";
import { getEffectiveSnapshot, getEffectiveRefs, type EffectiveRefs } from "@/lib/effectiveRefs";
import { computeVLamaxEffectif, type VLamaxEffectif } from "@/lib/vlamaxEffectif";
import { computeTTEEffectif, type TTEEffectif } from "@/lib/tteEffectif";
import { computeRaceReadinessEffectif, type RaceReadinessEffectif } from "@/lib/raceReadinessEffectif";
import { ZonesConfig, computeAbsoluteRange, AthleteRefsForZones } from "@/lib/zonesConfig";

// =============================================
// TYPES
// =============================================

interface ExportToolsProps {
  athlete: DbAthlete;
  snapshots: DbSnapshot[];
  tests: DbTest[];
  staffMode?: boolean;
}

// Payload normalisé pour toutes les sections du rapport
interface ExportPayload {
  athlete: {
    id: string;
    name: string;
    goal: string | null;
    refs: Record<string, number | null>;
  };
  effectiveSnapshot: DbSnapshot | null;
  effectiveRefs: EffectiveRefs;
  vlamax: VLamaxEffectif;
  tte: TTEEffectif;
  raceReadiness: RaceReadinessEffectif;
  tests: DbTest[];
  snapshotHistory: DbSnapshot[];
}

// =============================================
// HELPERS
// =============================================

function safe(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

function fmt(n: number | null | undefined, d = 2): string {
  return typeof n === "number" && !isNaN(n) ? n.toFixed(d) : "—";
}

function fmtPct(n: number | null | undefined): string {
  return typeof n === "number" && !isNaN(n) ? `${Math.round(n * 100)}%` : "—";
}

function dtStr(iso: string | Date | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR");
  } catch {
    return safe(iso);
  }
}

function htmlEscape(s: string): string {
  return safe(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseRefs(refs: unknown): Record<string, number | null> {
  if (!refs || typeof refs !== "object") return {};
  return refs as Record<string, number | null>;
}

function getAthleteRefsForZones(effectiveRefs: EffectiveRefs): AthleteRefsForZones {
  return {
    fcMax: effectiveRefs.fcMax,
    vma: effectiveRefs.vma,
    ftp: effectiveRefs.ftp,
    css: effectiveRefs.css
  };
}

function zoneAbs(metricKey: string, sportKey: string, zoneKey: string, refs: AthleteRefsForZones): string {
  const metric = ZonesConfig[metricKey];
  if (!metric) return zoneKey;
  const table = metric.sports[sportKey];
  if (!table) return zoneKey;
  const z = table.find((zone) => zone.key === zoneKey);
  if (!z) return zoneKey;
  
  const abs = computeAbsoluteRange(metricKey, sportKey, z, refs);
  return abs && abs.ok 
    ? `${zoneKey} (${z.min}-${z.max}%) → ${abs.display}` 
    : `${zoneKey} (${z.min}-${z.max}%)`;
}

// =============================================
// BUILD EXPORT PAYLOAD
// =============================================

function buildExportPayload(
  athlete: DbAthlete,
  snapshots: DbSnapshot[],
  tests: DbTest[]
): ExportPayload {
  const effectiveSnapshot = getEffectiveSnapshot(athlete, snapshots);
  const effectiveRefs = getEffectiveRefs(athlete, snapshots);
  const athleteSnapshots = snapshots.filter(s => s.athlete_id === athlete.id);
  const athleteTests = tests.filter(t => t.athlete_id === athlete.id);
  
  // Calculer VLamax effectif
  const vlamax = computeVLamaxEffectif({
    athleteId: athlete.id,
    objectif: athlete.goal || "IM",
    activeSnapshotId: athlete.active_snapshot_id,
    tests: athleteTests.map(t => ({
      athlete_id: t.athlete_id,
      vlamax: t.vlamax,
      date: t.date,
      type: t.type,
      name: t.name
    })),
    snapshots: athleteSnapshots.map(s => ({
      id: s.id,
      athlete_id: s.athlete_id,
      date: s.date,
      vlamax: s.vlamax,
      ftp: s.ftp,
      pmax_5s: s.pmax_5s,
      weight_kg: s.weight_kg
    }))
  });
  
  // Calculer TTE effectif
  const tte = computeTTEEffectif({
    ftp: effectiveRefs.ftp,
    tss_7d: effectiveSnapshot?.tss_7d,
    tte_mode: effectiveSnapshot?.tte_mode,
    tte_observed_min: effectiveSnapshot?.tte_observed_min,
    objectif: athlete.goal || "IM"
  });
  
  // Calculer Race Readiness
  const raceReadiness = computeRaceReadinessEffectif({
    objectif: athlete.goal || "IM",
    vlamaxEffectif: vlamax,
    tteEffectif: tte,
    ftp: effectiveRefs.ftp,
    poids: effectiveRefs.weightKg,
    fatigue_ok: true,
    seance_specifique_validee: false,
    fcMax: effectiveRefs.fcMax
  });
  
  return {
    athlete: {
      id: athlete.id,
      name: athlete.name,
      goal: athlete.goal,
      refs: parseRefs(athlete.refs)
    },
    effectiveSnapshot,
    effectiveRefs,
    vlamax,
    tte,
    raceReadiness,
    tests: athleteTests,
    snapshotHistory: athleteSnapshots
  };
}

// =============================================
// CHECK IF EXPORT IS POSSIBLE
// =============================================

function canExport(payload: ExportPayload): { ok: boolean; reason?: string } {
  // Au minimum, on a besoin d'un snapshot ou d'un test
  const hasSnapshot = payload.effectiveSnapshot != null;
  const hasTest = payload.tests.length > 0;
  const hasMinimalData = payload.effectiveRefs.ftp != null || payload.effectiveRefs.weightKg != null;
  
  if (!hasSnapshot && !hasTest && !hasMinimalData) {
    return {
      ok: false,
      reason: "Aucune donnée suffisante à exporter. Ajoutez un snapshot (FTP, poids, TSS 7d) ou un test."
    };
  }
  
  return { ok: true };
}

// =============================================
// BUILD PREMIUM HTML REPORT
// =============================================

function buildAthleteReportHTML(payload: ExportPayload): string {
  const { athlete, effectiveSnapshot, effectiveRefs, vlamax, tte, raceReadiness, tests, snapshotHistory } = payload;
  const refs = getAthleteRefsForZones(effectiveRefs);

  const brandMain = "24C Lab";
  const brandSub = "Staff-grade Performance Intelligence";
  const createdAt = new Date().toISOString();

  const title = `${brandMain} — Rapport Athlète — ${athlete.name || "Athlète"}`;

  // Cover info
  const coverObjective = htmlEscape(athlete.goal || "—");
  const coverAthlete = htmlEscape(athlete.name || "Athlète");
  const coverDate = htmlEscape(new Date(createdAt).toLocaleDateString("fr-FR"));
  const snapshotDate = effectiveSnapshot ? dtStr(effectiveSnapshot.date) : "—";

  const coverRefs = `
    <div class="kv">
      <div class="k">FCmax</div><div class="v">${effectiveRefs.fcMax ?? "—"} bpm</div>
      <div class="k">VMA</div><div class="v">${effectiveRefs.vma ?? "—"} km/h</div>
      <div class="k">FTP</div><div class="v">${effectiveRefs.ftp ?? "—"} W</div>
      <div class="k">Poids</div><div class="v">${effectiveRefs.weightKg ? fmt(effectiveRefs.weightKg, 1) : "—"} kg</div>
      <div class="k">VO2max</div><div class="v">${effectiveRefs.vo2max ? fmt(effectiveRefs.vo2max, 1) : "—"}</div>
    </div>
  `;

  // Sommaire
  const toc = `
    <div class="toc">
      <div class="tocTitle">Sommaire</div>
      <div class="tocRow"><span>1. Résumé exécutif</span><span>—</span></div>
      <div class="tocRow"><span>2. Indicateurs clés (VLamax, TTE, Race Readiness)</span><span>—</span></div>
      <div class="tocRow"><span>3. Zones cibles</span><span>—</span></div>
      <div class="tocRow"><span>4. Historique snapshots</span><span>—</span></div>
      <div class="tocRow"><span>5. Historique tests</span><span>—</span></div>
    </div>
  `;

  // Zones résumé
  const zonesSummary = `
    <div class="grid3">
      <div class="card">
        <h3>Zones Cardiaques (FCmax)</h3>
        <ul>
          <li>${htmlEscape(zoneAbs("cardiaque", "tout sport", "Z1", refs))}</li>
          <li>${htmlEscape(zoneAbs("cardiaque", "tout sport", "Z2", refs))}</li>
          <li>${htmlEscape(zoneAbs("cardiaque", "tout sport", "Z3", refs))}</li>
          <li>${htmlEscape(zoneAbs("cardiaque", "tout sport", "Z4", refs))}</li>
          <li>${htmlEscape(zoneAbs("cardiaque", "tout sport", "Z5", refs))}</li>
        </ul>
      </div>
      <div class="card">
        <h3>Zones Course (VMA)</h3>
        <ul>
          <li>${htmlEscape(zoneAbs("allure", "course", "Z1", refs))}</li>
          <li>${htmlEscape(zoneAbs("allure", "course", "Z2", refs))}</li>
          <li>${htmlEscape(zoneAbs("allure", "course", "Z3", refs))}</li>
          <li>${htmlEscape(zoneAbs("allure", "course", "Z4b", refs))}</li>
          <li>${htmlEscape(zoneAbs("allure", "course", "Z6", refs))}</li>
        </ul>
      </div>
      <div class="card">
        <h3>Zones Vélo (FTP)</h3>
        <ul>
          <li>${htmlEscape(zoneAbs("puissance", "cyclisme", "Z1", refs))}</li>
          <li>${htmlEscape(zoneAbs("puissance", "cyclisme", "Z2", refs))}</li>
          <li>${htmlEscape(zoneAbs("puissance", "cyclisme", "Z3", refs))}</li>
          <li>${htmlEscape(zoneAbs("puissance", "cyclisme", "Z4", refs))}</li>
          <li>${htmlEscape(zoneAbs("puissance", "cyclisme", "Z5", refs))}</li>
        </ul>
      </div>
    </div>
  `;

  // VLamax + TTE + RaceReadiness summary
  const ftpKg = effectiveRefs.ftp && effectiveRefs.weightKg && effectiveRefs.weightKg > 0 
    ? effectiveRefs.ftp / effectiveRefs.weightKg 
    : null;
  
  const indicateursHtml = `
    <div class="grid3">
      <div class="card">
        <h3>VLamax</h3>
        <div class="big"><b>${vlamax.value !== null ? fmt(vlamax.value, 2) : "—"}</b></div>
        <div class="muted">${htmlEscape(vlamax.label)}</div>
        <div class="muted">Confiance: ${fmtPct(vlamax.confidence)}</div>
        ${vlamax.isLocked ? '<div class="locked">🔒 Verrouillée (mesure lactate)</div>' : ''}
      </div>
      <div class="card">
        <h3>TTE (Time to Exhaustion)</h3>
        <div class="big"><b>${tte.tte_min} min</b></div>
        <div class="muted">${htmlEscape(tte.label)}</div>
        <div class="muted">Confiance: ${fmtPct(tte.confidence)}</div>
        <div class="muted">Cible: ${tte.target ?? "—"} min</div>
      </div>
      <div class="card">
        <h3>Race Readiness</h3>
        <div class="big"><b>${raceReadiness.score}/100</b></div>
        <div class="muted">${htmlEscape(raceReadiness.label)}</div>
        <div class="muted">FTP/kg: ${ftpKg ? fmt(ftpKg, 2) : "—"} W/kg</div>
      </div>
    </div>
  `;
  
  // Message staff
  const staffMessageHtml = `
    <div class="card staffMessage">
      <h3>Interprétation Staff</h3>
      <div>${htmlEscape(raceReadiness.messageStaff)}</div>
      ${raceReadiness.reasonsMissing.length > 0 ? `
        <div class="missing">
          <b>Données manquantes:</b> ${raceReadiness.reasonsMissing.join(", ")}
        </div>
      ` : ''}
    </div>
  `;

  // Snapshot history table
  const snapshotRows = snapshotHistory.length > 0
    ? snapshotHistory
        .slice()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10) // Limit to 10 most recent
        .map(s => `
          <tr>
            <td>${htmlEscape(dtStr(s.date))}</td>
            <td>${s.ftp ?? "—"}</td>
            <td>${s.weight_kg ? fmt(s.weight_kg, 1) : "—"}</td>
            <td>${s.tss_7d ?? "—"}</td>
            <td>${s.vo2max ? fmt(s.vo2max, 1) : "—"}</td>
            <td>${s.vlamax ? fmt(s.vlamax, 2) : "—"}</td>
            <td class="muted">${htmlEscape(s.source || "")}</td>
          </tr>
        `)
        .join("")
    : `<tr><td colspan="7" class="muted">Aucun snapshot enregistré</td></tr>`;

  // Tests history table
  const testsRows = tests.length > 0
    ? tests
        .slice()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10) // Limit to 10 most recent
        .map(t => `
          <tr>
            <td>${htmlEscape(dtStr(t.date))}</td>
            <td>${htmlEscape(t.name || "—")}</td>
            <td>${htmlEscape(t.type || "—")}</td>
            <td>${t.vlamax ? fmt(t.vlamax, 2) : "—"}</td>
            <td>${t.reliability ? fmtPct(t.reliability) : "—"}</td>
            <td class="muted">${htmlEscape(t.note || "")}</td>
          </tr>
        `)
        .join("")
    : `<tr><td colspan="6" class="muted">Aucun test enregistré</td></tr>`;

  // CSS
  const css = `
    <style>
      :root { --fg:#111; --muted:#555; --border:#ddd; --bg:#fff; --soft:#f7f7f7; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: var(--fg); margin: 24px; }
      h1 { margin: 0; font-size: 28px; letter-spacing: 0.2px; }
      h2 { margin: 18px 0 10px 0; font-size: 16px; border-bottom: 2px solid var(--border); padding-bottom: 6px; }
      h3 { margin: 0 0 8px 0; font-size: 14px; }
      .muted { color: var(--muted); font-size: 12px; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .tag { border:1px solid var(--border); border-radius: 999px; padding: 4px 10px; font-size: 12px; display:inline-block; }
      .card { border:1px solid var(--border); border-radius: 14px; padding: 12px; background: var(--bg); }
      .grid3 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
      .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .mt { margin-top: 10px; }
      ul { margin: 6px 0 0 18px; padding:0; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border-bottom: 1px solid #eee; padding: 6px; font-size: 12px; vertical-align: top; }
      th { text-align: left; font-weight: 700; background: var(--soft); }
      .big { margin: 8px 0; }
      .big b { font-size: 24px; }
      .locked { color: #2563eb; font-weight: 600; margin-top: 4px; }
      .staffMessage { background: #f0f9ff; border-color: #2563eb; }
      .missing { margin-top: 8px; padding: 8px; background: #fef3c7; border-radius: 8px; font-size: 12px; }
      .footer { margin-top: 20px; font-size: 11px; color: var(--muted); border-top: 1px solid var(--border); padding-top: 10px; }

      /* Cover */
      .cover {
        height: 93vh;
        display:flex;
        flex-direction:column;
        justify-content:space-between;
        border:1px solid var(--border);
        border-radius: 18px;
        padding: 22px;
        background: linear-gradient(180deg, #ffffff, var(--soft));
        position: relative;
        overflow:hidden;
      }
      .coverTop { display:flex; justify-content:space-between; align-items:flex-start; gap: 16px; }
      .brand { display:flex; flex-direction:column; gap: 6px; }
      .brandSub { font-size: 13px; color: var(--muted); }
      .coverMid { margin-top: 10px; }
      .coverTitle { font-size: 34px; margin: 10px 0 6px; font-weight: 700; }
      .coverMeta { display:flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
      .coverBottom { display:grid; grid-template-columns: 1.2fr 0.8fr; gap: 12px; }
      .kv { display:grid; grid-template-columns: 100px 1fr; gap: 6px 10px; }
      .kv .k { color: var(--muted); }
      .kv .v { font-weight: 600; }
      .watermark {
        position:absolute; right:-60px; bottom:-40px;
        font-size: 92px; font-weight: 800; letter-spacing: 2px;
        color: rgba(17,17,17,0.06);
        transform: rotate(-12deg);
        user-select: none;
        pointer-events:none;
      }

      /* TOC */
      .toc { border:1px solid var(--border); border-radius: 14px; padding: 12px; background: var(--bg); }
      .tocTitle { font-weight: 800; margin-bottom: 8px; }
      .tocRow { display:flex; justify-content:space-between; border-bottom: 1px dashed #eee; padding: 6px 0; font-size: 12px; }

      /* Print */
      @media print {
        body { margin: 10mm; }
        .noPrint { display:none; }
        .pagebreak { page-break-before: always; }
        .pagebreakAvoid { break-inside: avoid; page-break-inside: avoid; }
        .cover { height: auto; min-height: 250mm; }
      }
    </style>
  `;

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>${htmlEscape(title)}</title>
        ${css}
      </head>
      <body>

        <!-- COUVERTURE -->
        <section class="cover">
          <div class="coverTop">
            <div class="brand">
              <div class="tag">${htmlEscape(brandMain)}</div>
              <div class="brandSub">${htmlEscape(brandSub)}</div>
            </div>
            <div class="tag">Rapport Athlète • ${coverDate}</div>
          </div>

          <div class="coverMid">
            <div class="coverTitle">${htmlEscape(brandMain)} — Rapport Athlète</div>
            <div class="muted">Synthèse physiologique, indicateurs et zones d'entraînement</div>

            <div class="coverMeta">
              <div class="tag">Athlète: <b>${coverAthlete}</b></div>
              <div class="tag">Objectif: <b>${coverObjective}</b></div>
              <div class="tag">Snapshot: <b>${snapshotDate}</b></div>
            </div>
          </div>

          <div class="coverBottom">
            <div class="card">
              <h3>Résumé express</h3>
              <div class="grid3">
                <div><span class="muted">VLamax</span><br><b>${vlamax.value !== null ? fmt(vlamax.value, 2) : "—"}</b></div>
                <div><span class="muted">TTE</span><br><b>${tte.tte_min} min</b></div>
                <div><span class="muted">Race Ready</span><br><b>${raceReadiness.score}%</b></div>
              </div>
            </div>

            <div class="card">
              <h3>Références</h3>
              ${coverRefs}
            </div>
          </div>

          <div class="watermark">${htmlEscape(brandMain)}</div>
        </section>

        <!-- SOMMAIRE -->
        <div class="pagebreak"></div>
        <h2>Sommaire</h2>
        ${toc}

        <!-- ACTION PRINT -->
        <div class="noPrint" style="margin:10px 0;">
          <button onclick="window.print()">🖨️ Imprimer / Enregistrer en PDF</button>
          <span class="muted" style="margin-left:10px;">Conseil: choisir "Enregistrer en PDF".</span>
        </div>

        <!-- RAPPORT -->
        <div class="pagebreak"></div>

        <h2>1. Résumé exécutif</h2>
        ${staffMessageHtml}

        <h2>2. Indicateurs clés</h2>
        ${indicateursHtml}

        <h2>3. Zones cibles</h2>
        ${zonesSummary}

        <div class="pagebreak"></div>
        <h2>4. Historique snapshots</h2>
        <div class="card">
          <table>
            <thead>
              <tr><th>Date</th><th>FTP</th><th>Poids</th><th>TSS 7d</th><th>VO2max</th><th>VLamax</th><th>Source</th></tr>
            </thead>
            <tbody>${snapshotRows}</tbody>
          </table>
        </div>

        <h2>5. Historique tests</h2>
        <div class="card">
          <table>
            <thead>
              <tr><th>Date</th><th>Nom</th><th>Type</th><th>VLamax</th><th>Fiabilité</th><th>Note</th></tr>
            </thead>
            <tbody>${testsRows}</tbody>
          </table>
        </div>

        <div class="footer">
          Document généré par ${htmlEscape(brandMain)} — ${htmlEscape(brandSub)}<br/>
          Les valeurs présentées sont basées sur les données cloud au ${coverDate}. 
          VLamax source: ${htmlEscape(vlamax.label)} • TTE source: ${htmlEscape(tte.label)}
        </div>

      </body>
    </html>
  `;
}

// =============================================
// EXPORT CSV
// =============================================

function buildCSV(payload: ExportPayload): string {
  const { athlete, effectiveSnapshot, effectiveRefs, vlamax, tte, raceReadiness, snapshotHistory } = payload;
  
  const ftpKg = effectiveRefs.ftp && effectiveRefs.weightKg && effectiveRefs.weightKg > 0 
    ? effectiveRefs.ftp / effectiveRefs.weightKg 
    : null;
  
  let csv = "Champ,Valeur\n";
  csv += `Nom,${athlete.name}\n`;
  csv += `Objectif,${athlete.goal || "—"}\n`;
  csv += `Date export,${new Date().toLocaleDateString("fr-FR")}\n`;
  csv += `\n`;
  csv += `=== INDICATEURS EFFECTIFS ===\n`;
  csv += `VLamax,${vlamax.value !== null ? vlamax.value.toFixed(2) : "—"}\n`;
  csv += `VLamax source,${vlamax.label}\n`;
  csv += `VLamax confiance,${(vlamax.confidence * 100).toFixed(0)}%\n`;
  csv += `TTE (min),${tte.tte_min}\n`;
  csv += `TTE source,${tte.label}\n`;
  csv += `TTE confiance,${(tte.confidence * 100).toFixed(0)}%\n`;
  csv += `Race Readiness,${raceReadiness.score}/100\n`;
  csv += `Race Readiness label,${raceReadiness.label}\n`;
  csv += `\n`;
  csv += `=== RÉFÉRENCES EFFECTIVES ===\n`;
  csv += `FCmax,${effectiveRefs.fcMax ?? "—"}\n`;
  csv += `VMA,${effectiveRefs.vma ?? "—"}\n`;
  csv += `FTP,${effectiveRefs.ftp ?? "—"}\n`;
  csv += `Poids,${effectiveRefs.weightKg ? effectiveRefs.weightKg.toFixed(1) : "—"}\n`;
  csv += `FTP/kg,${ftpKg ? ftpKg.toFixed(2) : "—"}\n`;
  csv += `VO2max,${effectiveRefs.vo2max ? effectiveRefs.vo2max.toFixed(1) : "—"}\n`;
  
  if (effectiveSnapshot) {
    csv += `\n`;
    csv += `=== SNAPSHOT EFFECTIF ===\n`;
    csv += `Date,${effectiveSnapshot.date}\n`;
    csv += `Source,${effectiveSnapshot.source || "manual"}\n`;
    csv += `TSS 7d,${effectiveSnapshot.tss_7d ?? "—"}\n`;
  }

  if (snapshotHistory.length > 0) {
    csv += `\n`;
    csv += `=== HISTORIQUE SNAPSHOTS ===\n`;
    csv += `Date,FTP,Poids,TSS_7d,VO2max,VLamax,Source\n`;
    snapshotHistory
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach(snap => {
        csv += `${snap.date},${snap.ftp ?? ""},${snap.weight_kg ?? ""},${snap.tss_7d ?? ""},${snap.vo2max ?? ""},${snap.vlamax ?? ""},${snap.source || ""}\n`;
      });
  }

  return csv;
}

// =============================================
// COMPONENT
// =============================================

export function ExportTools({ athlete, snapshots, tests, staffMode = false }: ExportToolsProps) {
  // Build payload once
  const payload = buildExportPayload(athlete, snapshots, tests);
  const exportCheck = canExport(payload);

  const handleExportCSV = () => {
    if (!exportCheck.ok) {
      toast.error("Export impossible", { description: exportCheck.reason });
      return;
    }
    
    const csv = buildCSV(payload);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${athlete.name.replace(/\s+/g, "_")}_24CLab.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success("Export CSV terminé", {
      description: `Fichier ${athlete.name}_24CLab.csv téléchargé`
    });
  };

  const handleExportPDF = () => {
    if (!exportCheck.ok) {
      toast.error("Export impossible", { description: exportCheck.reason });
      return;
    }
    
    const html = buildAthleteReportHTML(payload);
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Popup bloquée", {
        description: "Autorise les popups pour exporter en PDF."
      });
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    setTimeout(() => {
      try { w.focus(); } catch {}
    }, 300);
    
    toast.success("Rapport PDF généré", {
      description: "Fenêtre ouverte — cliquer sur Imprimer pour enregistrer en PDF."
    });
  };

  // Show warning if export not possible
  if (!exportCheck.ok) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <AlertCircle className="h-4 w-4" />
        <span>{exportCheck.reason}</span>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExportCSV}
        className="gap-2"
      >
        <FileSpreadsheet className="h-4 w-4" />
        Export CSV
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleExportPDF}
        className="gap-2"
      >
        <FileText className="h-4 w-4" />
        📄 Export PDF
      </Button>
    </div>
  );
}
