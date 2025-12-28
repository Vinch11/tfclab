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

// === BUILD PREMIUM HTML REPORT (COUVERTURE + SOMMAIRE + RAPPORT) ===
function buildAthleteReportHTML(athlete: Athlete): string {
  const vTests = getVLamaxTestsOnly(athlete);
  const phys = analysePhysiologiqueComplete(vTests, athlete.vo2max || 50, athlete.objectif);
  const alerts = computeAlerts(athlete);
  const rec = computeBlockRecommendation(athlete);
  const rTests = getRefTestsOnly(athlete);
  const refs = getAthleteRefs(athlete);
  const plan = (athlete as any).plan || null;

  const coachName = "Two For Coaching";
  const brandMain = "Vince's Lab";
  const brandSub = "by Two For Coaching";
  const createdAt = new Date().toISOString();

  const title = `${brandMain} — Rapport Athlète — ${athlete.nom || "Athlète"}`;

  // Cover info
  const coverObjective = htmlEscape(athlete.objectif || plan?.goal || "—");
  const coverAthlete = htmlEscape(athlete.nom || "Athlète");
  const coverDate = htmlEscape(new Date(createdAt).toLocaleDateString("fr-FR"));

  const coverRefs = `
    <div class="kv">
      <div class="k">FCmax</div><div class="v">${refs.fcMax ?? "—"} bpm</div>
      <div class="k">VMA</div><div class="v">${refs.vma ?? "—"} km/h</div>
      <div class="k">FTP</div><div class="v">${refs.ftp ?? "—"} W</div>
      <div class="k">VO2max</div><div class="v">${athlete.vo2max ? fmt(athlete.vo2max, 1) : "—"}</div>
    </div>
  `;

  // Sommaire
  const toc = `
    <div class="toc">
      <div class="tocTitle">Sommaire</div>
      <div class="tocRow"><span>1. Résumé (modèle)</span><span>—</span></div>
      <div class="tocRow"><span>2. Alertes & recommandations</span><span>—</span></div>
      <div class="tocRow"><span>3. Zones cibles</span><span>—</span></div>
      <div class="tocRow"><span>4. Historique tests VLamax</span><span>—</span></div>
      <div class="tocRow"><span>5. Historique tests références</span><span>—</span></div>
      <div class="tocRow"><span>6. Plan d'entraînement</span><span>—</span></div>
    </div>
  `;

  // Zones résumé
  const zonesSummary = `
    <div class="grid3">
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

  // Alerts
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

  // Résumé modèle
  const physHtml = phys
    ? `
    <div class="grid2">
      <div class="card">
        <h3>Modèle VLamax</h3>
        <div class="big">
          <div><span class="muted">VLamax pondérée</span><br><b>${fmt(phys.vlamaxPonderee, 2)}</b></div>
          <div><span class="muted">Confiance</span><br><b>${fmtPct(phys.confiance)}</b></div>
          <div><span class="muted">SPM</span><br><b>${safe(phys.spm)}/100</b></div>
        </div>
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
    </div>
  `
    : `<div class="muted">Modèle non disponible.</div>`;

  // Tables tests
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
      <td class="muted mono">${htmlEscape(JSON.stringify(t.raw || {}).slice(0, 220))}</td>
      <td class="muted">${htmlEscape(t.note || "")}</td>
    </tr>
  `
        )
        .join("")
    : `<tr><td colspan="4" class="muted">—</td></tr>`;

  // Plan
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
        <div class="muted">Créé le ${htmlEscape(dtStr(plan.createdAt || createdAt))}</div>
      </div>
      ${weeks}
    `;
  }

  // CSS premium
  const css = `
    <style>
      :root { --fg:#111; --muted:#555; --border:#ddd; --bg:#fff; --soft:#f7f7f7; }
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: var(--fg); margin: 24px; }
      h1 { margin: 0; font-size: 28px; letter-spacing: 0.2px; }
      h2 { margin: 18px 0 10px 0; font-size: 16px; }
      h3 { margin: 0 0 8px 0; font-size: 14px; }
      .muted { color: var(--muted); }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
      .tag { border:1px solid var(--border); border-radius: 999px; padding: 4px 10px; font-size: 12px; display:inline-block; }
      .card { border:1px solid var(--border); border-radius: 14px; padding: 12px; background: var(--bg); }
      .grid3 { display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
      .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .mt { margin-top: 10px; }
      ul { margin: 6px 0 0 18px; padding:0; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border-bottom: 1px solid #eee; padding: 6px; font-size: 12px; vertical-align: top; }
      th { text-align: left; font-weight: 700; }
      .alert { border:1px solid var(--border); border-radius: 12px; padding: 10px; margin: 8px 0; background: var(--bg); }
      .alert.warn { border-color:#e0c200; }
      .alert.info { border-color:#b0c4ff; }
      .alertTitle { font-weight: 700; margin-bottom: 2px; }
      .big { display:grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 6px; }
      .big b { font-size: 20px; }
      .footer { margin-top: 14px; font-size: 11px; color: var(--muted); }

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
      .kv { display:grid; grid-template-columns: 120px 1fr; gap: 6px 10px; }
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
            <div class="muted">Synthèse physiologique, zones, tests et planification</div>

            <div class="coverMeta">
              <div class="tag">Athlète: <b>${coverAthlete}</b></div>
              <div class="tag">Objectif: <b>${coverObjective}</b></div>
              <div class="tag">Coach: <b>${htmlEscape(coachName)}</b></div>
            </div>
          </div>

          <div class="coverBottom">
            <div class="card">
              <h3>Résumé express</h3>
              ${phys ? `
                <div class="big">
                  <div><span class="muted">VLamax</span><br><b>${fmt(phys.vlamaxPonderee, 2)}</b></div>
                  <div><span class="muted">Confiance</span><br><b>${fmtPct(phys.confiance)}</b></div>
                  <div><span class="muted">SPM</span><br><b>${safe(phys.spm)}/100</b></div>
                </div>
                <div class="mt"><b>Point clé:</b> ${htmlEscape(phys.interpretation.message)}</div>
              ` : `<div class="muted">Modèle non disponible.</div>`}
            </div>

            <div class="card">
              <h3>Références (zones)</h3>
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

        <h2>1. Résumé (modèle)</h2>
        ${physHtml}

        <h2>2. Alertes & recommandations</h2>
        <div class="card">${alertsHtml}</div>
        <div class="card mt"><b>Recommandation (bloc 14 jours)</b><div class="mt">${htmlEscape(rec)}</div></div>

        <h2>3. Zones cibles</h2>
        ${zonesSummary}

        <h2>4. Historique tests VLamax</h2>
        <div class="card">
          <table>
            <thead>
              <tr><th>Date</th><th>Test</th><th>VLamax</th><th>Fiabilité</th><th>Note</th></tr>
            </thead>
            <tbody>${vTestsRows}</tbody>
          </table>
        </div>

        <h2>5. Historique tests références</h2>
        <div class="card">
          <table>
            <thead>
              <tr><th>Date</th><th>Test</th><th>Données</th><th>Note</th></tr>
            </thead>
            <tbody>${rTestsRows}</tbody>
          </table>
        </div>

        <div class="pagebreak"></div>
        <h2>6. Plan d'entraînement</h2>
        ${planHtml}

        <div class="footer">
          Document généré par ${htmlEscape(brandMain)} ${htmlEscape(brandSub)} — estimations terrain avec incertitude (voir indice de confiance VLamax).
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
