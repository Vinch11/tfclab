// =============================================
// OUTILS EXPORT CSV / PDF – RAPPORT COMPLET
// =============================================

import { Button } from "@/components/ui/button";
import { FileText, FileSpreadsheet } from "lucide-react";
import { Athlete, getDernierSnapshot } from "@/types/athlete";
import { calculVLamaxAvecConfiance } from "@/lib/athleteStore";
import { calculerScoreGlobal, genererBadges } from "@/lib/iaRecommandations";
import { computeAlerts, computeBlockRecommendation, getVLamaxTestsOnly } from "@/lib/monitoring";
import { analysePhysiologiqueComplete } from "@/lib/physiologicalModel";
import { ZonesConfig, computeAbsoluteRange, AthleteRefsForZones } from "@/lib/zonesConfig";
import { toast } from "sonner";

interface ExportToolsProps {
  athlete: Athlete;
}

// === HELPERS ===
function safe(v: unknown): string {
  return v === null || v === undefined ? "" : String(v);
}

function fmt(n: number | null | undefined, d = 2): string {
  return typeof n === "number" && !isNaN(n) ? n.toFixed(d) : "—";
}

function fmtPct(n: number | null | undefined): string {
  return typeof n === "number" && !isNaN(n) ? `${Math.round(n)}%` : "—";
}

function dtStr(iso: string | Date): string {
  try {
    return new Date(iso).toLocaleString();
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

function getRefTestsOnly(athlete: Athlete) {
  const tests = athlete.tests || [];
  return tests
    .filter((t) => t.type === "REF")
    .map((t) => ({ ...t, date: t.date || new Date().toISOString() }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function getAthleteRefs(athlete: Athlete): AthleteRefsForZones {
  const refs = (athlete.refs || {}) as Record<string, number | null | undefined>;
  return {
    fcMax: refs.fcMax ?? null,
    vma: refs.vma ?? null,
    ftp: refs.ftp ?? null,
    css: refs.css ?? null
  };
}

function zoneAbs(metricKey: string, sportKey: string, zoneKey: string, athlete: Athlete): string {
  const metric = ZonesConfig[metricKey];
  if (!metric) return zoneKey;
  const table = metric.sports[sportKey];
  if (!table) return zoneKey;
  const z = table.find((zone) => zone.key === zoneKey);
  if (!z) return zoneKey;
  
  const refs = getAthleteRefs(athlete);
  const abs = computeAbsoluteRange(metricKey, sportKey, z, refs);
  return abs && abs.ok 
    ? `${zoneKey} (${z.min}-${z.max}%) → ${abs.display}` 
    : `${zoneKey} (${z.min}-${z.max}%)`;
}

// === BUILD COMPLETE HTML REPORT ===
function buildAthleteReportHTML(athlete: Athlete): string {
  const vTests = getVLamaxTestsOnly(athlete);
  const phys = analysePhysiologiqueComplete(vTests, athlete.vo2max || 50, athlete.objectif);
  const alerts = computeAlerts(athlete);
  const rec = computeBlockRecommendation(athlete);
  const rTests = getRefTestsOnly(athlete);
  const refs = getAthleteRefs(athlete);
  const plan = (athlete as any).plan || null;

  const title = `Vince's Lab — Rapport Athlète — ${athlete.nom || "Athlète"}`;

  // Zones résumé
  const zonesSummary = `
    <div class="grid">
      <div class="card">
        <h3>Zones Cardiaques (FCmax)</h3>
        <ul>
          <li>${htmlEscape(zoneAbs("cardiaque", "tout sport", "Z1", athlete))}</li>
          <li>${htmlEscape(zoneAbs("cardiaque", "tout sport", "Z2", athlete))}</li>
          <li>${htmlEscape(zoneAbs("cardiaque", "tout sport", "Z3", athlete))}</li>
          <li>${htmlEscape(zoneAbs("cardiaque", "tout sport", "Z4", athlete))}</li>
          <li>${htmlEscape(zoneAbs("cardiaque", "tout sport", "Z5", athlete))}</li>
        </ul>
      </div>
      <div class="card">
        <h3>Zones Course (VMA)</h3>
        <ul>
          <li>${htmlEscape(zoneAbs("allure", "course", "Z1", athlete))}</li>
          <li>${htmlEscape(zoneAbs("allure", "course", "Z2", athlete))}</li>
          <li>${htmlEscape(zoneAbs("allure", "course", "Z3", athlete))}</li>
          <li>${htmlEscape(zoneAbs("allure", "course", "Z4b", athlete))}</li>
          <li>${htmlEscape(zoneAbs("allure", "course", "Z6", athlete))}</li>
        </ul>
      </div>
      <div class="card">
        <h3>Zones Vélo (FTP)</h3>
        <ul>
          <li>${htmlEscape(zoneAbs("puissance", "cyclisme", "Z1", athlete))}</li>
          <li>${htmlEscape(zoneAbs("puissance", "cyclisme", "Z2", athlete))}</li>
          <li>${htmlEscape(zoneAbs("puissance", "cyclisme", "Z3", athlete))}</li>
          <li>${htmlEscape(zoneAbs("puissance", "cyclisme", "Z4", athlete))}</li>
          <li>${htmlEscape(zoneAbs("puissance", "cyclisme", "Z5", athlete))}</li>
        </ul>
      </div>
    </div>
  `;

  const alertsHtml = alerts.length
    ? alerts
        .map((a) => {
          const icon = a.level === "warn" ? "⚠️" : a.level === "info" ? "ℹ️" : "✅";
          return `<div class="alert ${a.level}">
            <div class="alertTitle">${icon} ${htmlEscape(a.title)}</div>
            <div class="muted">${htmlEscape(a.detail)}</div>
          </div>`;
        })
        .join("")
    : `<div class="muted">✅ Aucune alerte critique détectée.</div>`;

  const physHtml = phys
    ? `
    <div class="grid">
      <div class="card">
        <h3>Modèle VLamax</h3>
        <div><b>VLamax pondérée:</b> ${fmt(phys.vlamaxPonderee, 2)}</div>
        <div><b>Confiance:</b> ${fmtPct(phys.confiance)} (tests VLamax: ${safe(vTests.length)})</div>
        <div><b>SPM:</b> ${safe(phys.spm)}/100</div>
        <div class="mt"><b>Interprétation:</b> ${htmlEscape(phys.interpretation.message)}</div>
      </div>
      <div class="card">
        <h3>Décision séances A/B/C/D</h3>
        <ul>
          <li><b>A</b> ${htmlEscape(phys.repartition.A.label)}</li>
          <li><b>B</b> ${htmlEscape(phys.repartition.B.label)}</li>
          <li><b>C</b> ${htmlEscape(phys.repartition.C.label)}</li>
          <li><b>D</b> ${htmlEscape(phys.repartition.D.label)}</li>
        </ul>
        <div class="muted">${htmlEscape(phys.repartition.message || "")}</div>
      </div>
      <div class="card">
        <h3>Références</h3>
        <div><b>Objectif:</b> ${htmlEscape(athlete.objectif || "—")}</div>
        <div><b>FCmax:</b> ${refs.fcMax ?? "—"} bpm</div>
        <div><b>VMA:</b> ${refs.vma ?? "—"} km/h</div>
        <div><b>FTP:</b> ${refs.ftp ?? "—"} W</div>
        <div><b>CSS:</b> ${refs.css ?? "—"} sec/100</div>
        <div><b>VO2max:</b> ${athlete.vo2max ? fmt(athlete.vo2max, 1) : "—"}</div>
      </div>
    </div>
  `
    : `<div class="muted">Modèle non disponible.</div>`;

  const vTestsRows = vTests.length
    ? vTests
        .slice()
        .reverse()
        .map(
          (t) => `
    <tr>
      <td>${htmlEscape(dtStr(t.date))}</td>
      <td>${htmlEscape(t.nom || t.id || "Test")}</td>
      <td>${fmt(t.vlamax, 2)}</td>
      <td>${fmtPct((t.fiabilite ?? 0.5) * 100)}</td>
      <td class="muted">${htmlEscape(t.note || "")}</td>
    </tr>
  `
        )
        .join("")
    : `<tr><td colspan="5" class="muted">—</td></tr>`;

  const rTestsRows = rTests.length
    ? rTests
        .slice()
        .reverse()
        .map(
          (t: any) => `
    <tr>
      <td>${htmlEscape(dtStr(t.date))}</td>
      <td>${htmlEscape(t.nom || t.id || "Référence")}</td>
      <td class="muted">${htmlEscape(JSON.stringify(t.raw || {}).slice(0, 180))}</td>
      <td class="muted">${htmlEscape(t.note || "")}</td>
    </tr>
  `
        )
        .join("")
    : `<tr><td colspan="4" class="muted">—</td></tr>`;

  // Plan résumé
  let planHtml = `<div class="muted">Aucun plan généré.</div>`;
  if (plan && plan.weeks && plan.weeks.length) {
    const weeks = plan.weeks
      .map((w: any) => {
        const rows = (w.sessions || [])
          .map(
            (s: any) => `
        <tr>
          <td>${htmlEscape(s.dayName || "")}</td>
          <td>${htmlEscape(s.type || "")}</td>
          <td>${htmlEscape(s.sport || "")}</td>
          <td>${htmlEscape(s.name || "")}</td>
          <td>${s.durationMin ? htmlEscape(String(s.durationMin)) + " min" : "—"}</td>
          <td class="mono">${htmlEscape(s.zoneTarget || s.zone || "")}</td>
        </tr>
      `
          )
          .join("");

        return `
        <div class="card pagebreakAvoid">
          <h3>Semaine ${w.weekIndex} — ${htmlEscape(w.phase || "")} (${htmlEscape(w.start || "")} → ${htmlEscape(w.end || "")})</h3>
          <table>
            <thead>
              <tr><th>Jour</th><th>Type</th><th>Sport</th><th>Séance</th><th>Durée</th><th>Zone cible</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
      })
      .join("");

    planHtml = `
      <div class="card">
        <h3>Macrocycle</h3>
        <div><b>Objectif:</b> ${htmlEscape(plan.goal || athlete.objectif || "—")}</div>
        <div><b>Durée:</b> ${htmlEscape(String(plan.totalWeeks || plan.weeks.length))} semaines</div>
        <div><b>Début:</b> ${htmlEscape(plan.startDate || "—")}</div>
        <div class="muted">Créé le ${htmlEscape(dtStr(plan.createdAt || new Date().toISOString()))}</div>
      </div>
      ${weeks}
    `;
  }

  const css = `
    <style>
      :root { --fg:#111; --muted:#555; --border:#ddd; --bg:#fff; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: var(--fg); margin: 24px; }
      h1 { margin: 0 0 6px 0; font-size: 22px; }
      h2 { margin: 18px 0 10px 0; font-size: 16px; }
      h3 { margin: 0 0 8px 0; font-size: 14px; }
      .muted { color: var(--muted); }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .topbar { display:flex; align-items:flex-end; justify-content:space-between; gap:16px; }
      .tag { border:1px solid var(--border); border-radius: 999px; padding: 4px 10px; font-size: 12px; }
      .grid { display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
      .card { border:1px solid var(--border); border-radius: 12px; padding: 10px; background: var(--bg); }
      .mt { margin-top: 8px; }
      ul { margin: 6px 0 0 18px; padding:0; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border-bottom: 1px solid #eee; padding: 6px; font-size: 12px; vertical-align: top; }
      th { text-align: left; font-weight: 700; }
      .alert { border:1px solid var(--border); border-radius: 10px; padding: 8px; margin: 6px 0; }
      .alert.warn { border-color:#e0c200; }
      .alert.info { border-color:#b0c4ff; }
      .alertTitle { font-weight: 700; }
      .footer { margin-top: 14px; font-size: 11px; color: var(--muted); }
      @media print {
        body { margin: 10mm; }
        .noPrint { display:none; }
        .grid { grid-template-columns: 1fr 1fr 1fr; }
        .pagebreak { page-break-before: always; }
        .pagebreakAvoid { break-inside: avoid; page-break-inside: avoid; }
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
        <div class="topbar">
          <div>
            <h1>Vince's Lab — Rapport Athlète</h1>
            <div class="muted">Two For Coaching • Généré le ${htmlEscape(dtStr(new Date().toISOString()))}</div>
          </div>
          <div class="tag">${htmlEscape(athlete.nom || "Athlète")} • ${htmlEscape(athlete.objectif || plan?.goal || "objectif")}</div>
        </div>
        <div class="noPrint" style="margin-top:10px;">
          <button onclick="window.print()">🖨️ Imprimer / Enregistrer en PDF</button>
          <span class="muted" style="margin-left:10px;">Conseil: choisir "Enregistrer en PDF".</span>
        </div>
        <h2>Résumé</h2>
        ${physHtml}
        <h2>Alertes</h2>
        <div class="card">${alertsHtml}</div>
        <h2>Recommandation</h2>
        <div class="card">${htmlEscape(rec)}</div>
        <h2>Zones (cibles)</h2>
        ${zonesSummary}
        <h2>Tests VLamax</h2>
        <div class="card">
          <table>
            <thead>
              <tr><th>Date</th><th>Test</th><th>VLamax</th><th>Fiabilité</th><th>Note</th></tr>
            </thead>
            <tbody>${vTestsRows}</tbody>
          </table>
        </div>
        <h2>Tests Références (VO2/VMA/FTP/FCmax…)</h2>
        <div class="card">
          <table>
            <thead>
              <tr><th>Date</th><th>Test</th><th>Données</th><th>Note</th></tr>
            </thead>
            <tbody>${rTestsRows}</tbody>
          </table>
        </div>
        <div class="pagebreak"></div>
        <h2>Plan d'entraînement</h2>
        ${planHtml}
        <div class="footer">
          Document généré par Vince's Lab — les estimations terrain comportent une incertitude (voir indice de confiance VLamax).
        </div>
      </body>
    </html>
  `;
}

export function ExportTools({ athlete }: ExportToolsProps) {
  const handleExportCSV = () => {
    const snapshot = getDernierSnapshot(athlete);
    const vlamax = snapshot 
      ? calculVLamaxAvecConfiance(snapshot, athlete.objectif).vlamax 
      : 0;
    const score = calculerScoreGlobal(athlete);
    const badges = genererBadges(athlete).filter(b => b.obtenu);

    let csv = "Champ,Valeur\n";
    csv += `Nom,${athlete.nom}\n`;
    csv += `Objectif,${athlete.objectif}\n`;
    csv += `Score Global,${score}\n`;
    csv += `VLamax,${vlamax.toFixed(2)}\n`;
    csv += `Badges,"${badges.map(b => b.nom).join(", ")}"\n`;
    
    if (snapshot) {
      csv += `\nDernier Snapshot\n`;
      csv += `Date,${snapshot.date}\n`;
      csv += `Sport,${snapshot.sport}\n`;
      csv += `Poids,${snapshot.poids}\n`;
      if (snapshot.ftp) csv += `FTP,${snapshot.ftp}\n`;
      if (snapshot.vma) csv += `VMA,${snapshot.vma}\n`;
      if (snapshot.vo2max) csv += `VO2max,${snapshot.vo2max}\n`;
    }

    if (athlete.historique.length > 0) {
      csv += `\nHistorique Snapshots\n`;
      csv += `Date,Sport,Poids,FTP,VMA,VO2max\n`;
      athlete.historique.forEach(snap => {
        csv += `${snap.date},${snap.sport},${snap.poids},${snap.ftp || ""},${snap.vma || ""},${snap.vo2max || ""}\n`;
      });
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${athlete.nom.replace(/\s+/g, "_")}_VLamax.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success("Export CSV terminé", {
      description: `Fichier ${athlete.nom}_VLamax.csv téléchargé`
    });
  };

  const handleExportPDF = () => {
    const html = buildAthleteReportHTML(athlete);
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
