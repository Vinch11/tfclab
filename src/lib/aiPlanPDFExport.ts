/**
 * AIPlanPDFExport — Generates a printable HTML view of the AI plan for PDF export
 */

import type { ParsedPlan } from "@/lib/aiPlanParser";
import type { AdaptationProjection } from "@/hooks/useAITrainingPlan";
import { getTrailSessionAlternatives } from "@/lib/trailSessionAlternatives";
import { getFicheForSession, type EnrichedSessionFiche } from "@/lib/aiPlanWorkoutEnricher";
import { formatFicheText } from "@/lib/ficheTextFormatter";

function getSportEmoji(sport: string): string {
  const s = sport.toLowerCase();
  if (s.includes("natation") || s.includes("swim")) return "🏊";
  if (s.includes("vélo") || s.includes("velo") || s.includes("bike")) return "🚴";
  if (s.includes("cap") || s.includes("course") || s.includes("run")) return "🏃";
  if (s.includes("repos") || s.includes("rest")) return "💤";
  if (s.includes("muscu") || s.includes("force")) return "💪";
  if (s.includes("brick")) return "🔗";
  return "🏋️";
}

function computeWeekStartDate(startDate: Date, weekNumber: number): Date {
  const start = new Date(startDate);
  const dayOfWeek = start.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  start.setDate(start.getDate() + diff);
  start.setDate(start.getDate() + (weekNumber - 1) * 7);
  return start;
}

function formatSessionDate(weekStart: Date, dayIndex: number): string {
  if (dayIndex < 0) return "";
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayIndex);
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function formatWeekRange(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${weekStart.toLocaleDateString("fr-FR", opts)} → ${end.toLocaleDateString("fr-FR", opts)}`;
}

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderFicheHTML(f: EnrichedSessionFiche): string {
  const structure = f.structure
    .map((s) => {
      const body = formatFicheText(s.text);
      const isBlock = /^<(ol|ul|p)\b/.test(body);
      const zones = s.zones.length
        ? ` <span style="color:#888;">[${s.zones.join(", ")}]</span>`
        : "";
      const header = `<strong>${escapeHTML(s.part)}</strong>${zones}`;
      return isBlock
        ? `<div style="margin-top:5px;"><div style="margin-bottom:2px;">${header}</div><div style="padding-left:6px;border-left:2px solid #e3e8ef;">${body}</div></div>`
        : `<div style="margin-top:3px;">${header} — ${body}</div>`;
    })
    .join("");

  const variants = f.variants.length
    ? `<div style="margin-top:4px;"><strong style="color:#1967d2;">🎯 Variantes :</strong><ul style="margin:2px 0 0 16px;padding:0;">${f.variants
        .map((v) => `<li><strong>${escapeHTML(v.goal)}</strong> — ${escapeHTML(v.text)}</li>`)
        .join("")}</ul></div>`
    : "";

  const wbal = f.wbalSummary
    ? `<div style="margin-top:3px;"><strong>⚙️ W'bal :</strong> <span style="color:#555;">${escapeHTML(
        f.wbalSummary
      )}</span></div>`
    : "";

  const dplus = f.dPlusTargetM
    ? `<div style="margin-top:3px;"><strong>⛰ D+ cible :</strong> ${
        typeof f.dPlusTargetM === "number"
          ? `${f.dPlusTargetM} m`
          : `${f.dPlusTargetM.min}-${f.dPlusTargetM.max} m`
      }</div>`
    : "";

  const whenAvoid =
    f.when || f.avoid
      ? `<div style="margin-top:3px;display:grid;grid-template-columns:1fr 1fr;gap:6px;">
          ${f.when ? `<div><strong style="color:#2e7d32;">✓ Quand :</strong> ${escapeHTML(f.when)}</div>` : ""}
          ${f.avoid ? `<div><strong style="color:#c62828;">⚠ Éviter :</strong> ${escapeHTML(f.avoid)}</div>` : ""}
        </div>`
      : "";

  const notes = f.notes
    ? `<div style="margin-top:3px;font-style:italic;color:#555;border-left:2px solid #1967d2;padding-left:6px;">💡 ${escapeHTML(
        f.notes
      )}</div>`
    : "";

  const tags = f.tags.length
    ? `<div style="margin-top:4px;">${f.tags
        .map(
          (t) =>
            `<span style="display:inline-block;background:#eef2f6;color:#555;font-size:9px;padding:1px 5px;border-radius:3px;margin-right:3px;">#${escapeHTML(
              t
            )}</span>`
        )
        .join("")}</div>`
    : "";

  return `<div style="margin-top:6px;padding:6px 8px;border-top:1px dashed #ccc;background:#fafbfd;border-radius:4px;font-size:10.5px;color:#333;line-height:1.4;">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px;">
      <strong style="color:#1967d2;text-transform:uppercase;font-size:9.5px;letter-spacing:0.4px;">Fiche complète bibliothèque</strong>
      <span style="font-size:9px;color:#777;">
        Cat ${escapeHTML(f.cat)} · ${escapeHTML(f.necessite)} · ${f.durationMin[0]}-${f.durationMin[1]} min ·
        <code style="background:#eef2f6;padding:1px 4px;border-radius:3px;">${escapeHTML(f.id)}</code>
      </span>
    </div>
    <div style="font-style:italic;color:#444;margin-bottom:3px;">🎯 ${escapeHTML(f.objectif)}</div>
    ${structure}
    ${wbal}
    ${variants}
    ${dplus}
    ${whenAvoid}
    ${notes}
    ${tags}
  </div>`;
}

function getSportBadgeStyle(sport: string): { bg: string; color: string; border: string } {
  const s = sport.toLowerCase();
  if (s.includes("repos") || s.includes("rest")) return { bg: "#f3f4f6", color: "#6b7280", border: "#e5e7eb" };
  if (s.includes("natation") || s.includes("swim")) return { bg: "#dbeafe", color: "#1e40af", border: "#bfdbfe" };
  if (s.includes("vélo") || s.includes("velo") || s.includes("bike")) return { bg: "#dbeafe", color: "#1e3a8a", border: "#93c5fd" };
  if (s.includes("brick")) return { bg: "#ede9fe", color: "#5b21b6", border: "#c4b5fd" };
  if (s.includes("muscu") || s.includes("force")) return { bg: "#fce7f3", color: "#9d174d", border: "#f9a8d4" };
  if (s.includes("cap") || s.includes("course") || s.includes("run")) return { bg: "#dcfce7", color: "#166534", border: "#86efac" };
  return { bg: "#f3f4f6", color: "#374151", border: "#d1d5db" };
}

function getSportBadge(sport: string): string {
  const style = getSportBadgeStyle(sport);
  return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600;background:${style.bg};color:${style.color};border:1px solid ${style.border};white-space:nowrap;">${getSportEmoji(sport)} ${sport}</span>`;
}

export type PlanPDFOrientation = "landscape" | "portrait";
export type PlanPDFDetailLevel = "full" | "compact";

export function exportAIPlanToPDF(
  plan: ParsedPlan,
  athleteName?: string,
  startDate?: Date,
  adaptationProjections?: AdaptationProjection[],
  orientation: PlanPDFOrientation = "landscape",
  detailLevel: PlanPDFDetailLevel = "full",
) {
  const html = buildPlanHTML(plan, athleteName, startDate, adaptationProjections, orientation, detailLevel);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (w) {
    w.onafterprint = () => URL.revokeObjectURL(url);
  }
}

function buildPlanHTML(
  plan: ParsedPlan,
  athleteName?: string,
  startDate?: Date,
  adaptationProjections?: AdaptationProjection[],
  orientation: PlanPDFOrientation = "landscape",
  detailLevel: PlanPDFDetailLevel = "full",
): string {
  const hasDate = !!startDate;
  const isPortrait = orientation === "portrait";
  const isCompact = detailLevel === "compact";

  const weekRows = plan.weeks.map((week, weekIdx) => {
    const weekStart = hasDate ? computeWeekStartDate(startDate!, week.weekNumber) : null;

    const sessionRows = week.sessions.map((s, sessionIdx) => {
      const dateStr = weekStart && s.dayIndex >= 0 ? formatSessionDate(weekStart, s.dayIndex) : "";
      const trailAlts = s.isRest
        ? []
        : getTrailSessionAlternatives({ sport: s.sport, title: s.title, details: s.details });
      const altsHtml = !isCompact && trailAlts.length > 0
        ? `<div style="font-size:10px;color:#555;">
            <strong style="color:#1967d2;">Alternatives terrain :</strong>
            ${trailAlts.map(a => `<div style="margin-top:2px;"><span>${a.icon}</span> <strong>${a.label}</strong> — <span style="color:#777;">${a.hint}</span></div>`).join("")}
          </div>`
        : "";
      const fiche = (isCompact || s.isRest) ? null : getFicheForSession({ title: s.title, details: s.details });

      if (isPortrait) {
        // Stacked card layout — clearer in A4 portrait
        const header = `
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:6px 10px;background:#f1f5f9;border-bottom:1px solid #cbd5e1;">
            <strong style="color:#1f2937;font-size:12px;min-width:90px;">${s.dayName}</strong>
            ${dateStr ? `<span style="font-size:10.5px;color:#6b7280;">${dateStr}</span>` : ""}
            ${getSportBadge(s.sport)}
            <span style="font-weight:600;color:#1f2937;font-size:12px;flex:1;">${s.title}</span>
          </div>`;
        const body = `<div style="padding:8px 12px;font-size:11px;color:#374151;line-height:1.5;${s.isRest ? 'color:#9ca3af;' : ''}">${s.details}</div>`;
        const ficheBlock = fiche
          ? `<div style="border-top:1px dashed #cbd5e1;background:#fafbfd;padding:6px 10px;"><div class="fiche-box">${renderFicheHTML(fiche)}</div></div>`
          : "";
        const altsBlock = altsHtml
          ? `<div style="border-top:1px dashed #cbd5e1;background:#fff;padding:6px 10px;">${altsHtml}</div>`
          : "";
        return `
          <div class="session-card" style="border:1px solid #d1d5db;border-radius:6px;margin-bottom:8px;overflow:hidden;background:#fff;">
            ${header}${body}${ficheBlock}${altsBlock}
          </div>`;
      }

      const totalCols = (hasDate ? 1 : 0) + 4;
      const ficheRow = fiche
        ? `<tr class="fiche-row"><td colspan="${totalCols}" style="padding:6px 10px;border:1px solid #ddd;background:#fafbfd;"><div class="fiche-box">${renderFicheHTML(fiche)}</div></td></tr>`
        : "";
      const altsRow = altsHtml
        ? `<tr class="alts-row"><td colspan="${totalCols}" style="padding:6px 10px;border:1px solid #ddd;background:#fff;">${altsHtml}</td></tr>`
        : "";
      
      // Alternating row colors + stronger separator between days
      const rowBg = sessionIdx % 2 === 0 ? "#ffffff" : "#f8fafc";
      const daySeparator = sessionIdx > 0 ? "border-top:2px solid #e2e8f0;" : "";
      
      return `
      <tr class="session-row" style="background:${rowBg};${daySeparator}${s.isRest ? 'color:#9ca3af;' : ''}">
        ${hasDate ? `<td style="padding:6px 10px;border:1px solid #d1d5db;white-space:nowrap;font-size:11px;color:#4b5563;vertical-align:top;font-weight:500;">${dateStr}</td>` : ""}
        <td style="padding:6px 10px;border:1px solid #d1d5db;white-space:nowrap;vertical-align:top;font-weight:600;color:#374151;">${s.dayName}</td>
        <td style="padding:6px 10px;border:1px solid #d1d5db;vertical-align:top;">${getSportBadge(s.sport)}</td>
        <td style="padding:6px 10px;border:1px solid #d1d5db;font-weight:600;vertical-align:top;color:#1f2937;">${s.title}</td>
        <td style="padding:6px 10px;border:1px solid #d1d5db;font-size:11px;vertical-align:top;word-wrap:break-word;color:#4b5563;line-height:1.5;">${s.details}</td>
      </tr>
      ${ficheRow}
      ${altsRow}
    `;
    }).join("");

    const weekRangeStr = weekStart ? ` <span style="font-weight:normal;font-size:10px;color:#1967d2;margin-left:6px;">(${formatWeekRange(weekStart)})</span>` : "";
    // Add a visual separator stripe between weeks
    const weekSeparator = weekIdx > 0 ? "margin-top:32px;padding-top:16px;border-top:3px double #cbd5e1;" : "";

    const sessionsBlock = isPortrait
      ? `<div class="sessions-stack">${sessionRows}</div>`
      : `
        <table style="width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed;border:1px solid #d1d5db;">
          <colgroup>
            ${hasDate ? `<col style="width:8%;">` : ""}
            <col style="width:6%;">
            <col style="width:11%;">
            <col style="width:19%;">
            <col style="width:${hasDate ? "56%" : "64%"};">
          </colgroup>
          <thead>
            <tr style="background:#f1f5f9;">
              ${hasDate ? `<th style="padding:6px 10px;border:1px solid #d1d5db;text-align:left;font-size:11px;font-weight:700;color:#374151;letter-spacing:0.3px;">Date</th>` : ""}
              <th style="padding:6px 10px;border:1px solid #d1d5db;text-align:left;font-size:11px;font-weight:700;color:#374151;letter-spacing:0.3px;">Jour</th>
              <th style="padding:6px 10px;border:1px solid #d1d5db;text-align:left;font-size:11px;font-weight:700;color:#374151;letter-spacing:0.3px;">Sport</th>
              <th style="padding:6px 10px;border:1px solid #d1d5db;text-align:left;font-size:11px;font-weight:700;color:#374151;letter-spacing:0.3px;">Séance</th>
              <th style="padding:6px 10px;border:1px solid #d1d5db;text-align:left;font-size:11px;font-weight:700;color:#374151;letter-spacing:0.3px;">Détails</th>
            </tr>
          </thead>
          <tbody>${sessionRows}</tbody>
        </table>`;

    return `
      <div class="week-block" style="margin-bottom:28px;${weekSeparator}">
        <h3 style="margin:0 0 6px 0;font-size:15px;color:#1f2937;background:#eff6ff;padding:8px 12px;border-radius:6px;border-left:4px solid #1967d2;">
          Semaine ${week.weekNumber} — ${week.theme}${weekRangeStr}
          <span style="font-weight:normal;font-size:11px;color:#6b7280;margin-left:8px;">${week.phase}</span>
        </h3>
        ${week.volumeTarget ? `<p style="margin:0 0 10px 0;font-size:11px;color:#4b5563;background:#f9fafb;padding:4px 10px;border-radius:4px;display:inline-block;">Volume cible : ${week.volumeTarget}</p>` : ""}
        ${sessionsBlock}
        ${week.coachNotes ? `<p style="margin:10px 0 0 0;font-size:11px;color:#4b5563;background:#fffbeb;padding:8px 12px;border-radius:6px;border-left:3px solid #f59e0b;">⚡ ${week.coachNotes}</p>` : ""}
      </div>
    `;
  }).join("");

  const phasesSummary = plan.phases.map(p =>
    `<span style="display:inline-block;background:#e8f0fe;color:#1967d2;padding:2px 8px;border-radius:12px;font-size:11px;margin-right:6px;">${p.name} ${p.weeks ? `(S${p.weeks})` : ""}</span>`
  ).join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${plan.title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: ${isPortrait ? "820px" : "1200px"}; margin: 0 auto; padding: 20px; color: #222; background: #fff; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    h2 { font-size: 16px; color: #444; margin-top: 24px; border-bottom: 2px solid #1967d2; padding-bottom: 4px; }
    table { word-wrap: break-word; overflow-wrap: break-word; }
    td, th { word-wrap: break-word; overflow-wrap: break-word; }
    .session-card { page-break-inside: avoid; break-inside: avoid; }

    /* ===== Optimisations impression PDF ===== */
    @media print {
      .no-print { display: none !important; }
      @page { size: A4 ${isPortrait ? "portrait" : "landscape"}; margin: ${isPortrait ? "10mm 12mm" : "8mm 10mm"}; }

      /* Couleurs fidèles (badges, fonds, séparateurs) */
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }

      body { padding: 0 !important; max-width: none !important; font-size: 11px; line-height: 1.35; }
      h1 { font-size: 18px; }
      h2 { font-size: 14px; margin-top: 14px; page-break-after: avoid; break-after: avoid; }
      h3 { page-break-after: avoid; break-after: avoid; }

      /* Une semaine = un bloc insécable autant que possible */
      .week-block { page-break-inside: avoid; break-inside: avoid; margin-bottom: 14px !important; }
      .week-block + .week-block { page-break-before: auto; }

      /* Si une semaine déborde, on garde l'en-tête avec les premières lignes */
      table { page-break-inside: auto; }
      thead { display: table-header-group; } /* répète l'entête à chaque page */
      tfoot { display: table-footer-group; }
      tr { page-break-inside: avoid; break-inside: avoid; }

      /* Évite qu'une fiche se sépare de sa séance parente */
      tr.session-row { page-break-after: avoid; break-after: avoid; }
      tr.fiche-row, tr.alts-row { page-break-before: avoid; break-before: avoid; }

      /* Densification fiche / alternatives en print */
      .fiche-box { font-size: 9.5px !important; line-height: 1.3 !important; padding: 4px 6px !important; }
      .fiche-box ul, .fiche-box ol { margin: 2px 0 2px 14px !important; padding: 0 !important; }

      /* Cellules : éviter overflow et garder texte lisible */
      td, th { font-size: 10px !important; padding: 4px 6px !important; vertical-align: top; }
      th { background: #eef2f7 !important; }

      /* Séparation visuelle plus marquée entre les jours */
      tr.session-row { border-top: 1.5pt solid #94a3b8 !important; }
      tr.session-row:first-child { border-top: none !important; }

      /* Récap stratégique / projections : pas de coupure au milieu */
      .keep-together { page-break-inside: avoid; break-inside: avoid; }

      /* Liens propres */
      a { color: inherit; text-decoration: none; }

      footer { page-break-before: avoid; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="background:#e3f2fd;padding:12px 16px;border-radius:8px;margin-bottom:20px;font-size:13px;">
    📄 Utilisez <strong>Ctrl+P</strong> (ou <strong>⌘+P</strong> sur Mac) → <strong>Imprimer en PDF</strong> pour exporter ce plan.
  </div>
  <h1>${plan.title}</h1>
  ${athleteName ? `<p style="color:#666;margin:0 0 8px 0;">Athlète : ${athleteName}</p>` : ""}
  <p style="color:#888;font-size:12px;margin:0 0 12px 0;">${plan.totalWeeks} semaines • ${plan.phases.length} phases</p>
  <div style="margin-bottom:16px;">${phasesSummary}</div>
  ${plan.diagnostic ? `<div style="background:#f9f9f9;padding:10px 14px;border-radius:6px;font-size:12px;color:#555;margin-bottom:20px;border-left:3px solid #1967d2;"><strong>Diagnostic TFCL™</strong><br/>${plan.diagnostic.replace(/\n/g, "<br/>")}</div>` : ""}
  ${plan.strategicRecap && plan.strategicRecap.limiters.length > 0 ? `
  <div style="background:#f0f7ff;padding:12px 14px;border-radius:6px;font-size:12px;color:#333;margin-bottom:20px;border-left:3px solid #e67e22;">
    <strong>🎯 Récapitulatif Stratégique</strong>
    <table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:11px;">
      <tr style="background:#e8e8e8;"><th style="padding:4px 6px;text-align:left;">#</th><th style="padding:4px 6px;text-align:left;">Limiteur</th><th style="padding:4px 6px;text-align:left;">Statut</th><th style="padding:4px 6px;text-align:left;">Bloc</th><th style="padding:4px 6px;text-align:left;">Sem.</th><th style="padding:4px 6px;text-align:left;">Séances Clés 🔑</th></tr>
      ${plan.strategicRecap.limiters.map(l => `<tr style="border-bottom:1px solid #ddd;"><td style="padding:4px 6px;">${l.rank}</td><td style="padding:4px 6px;font-weight:600;">${l.name}</td><td style="padding:4px 6px;">${l.status}</td><td style="padding:4px 6px;">${l.block}</td><td style="padding:4px 6px;">${l.weeks}</td><td style="padding:4px 6px;">${l.keySessions}</td></tr>`).join("")}
    </table>
    ${plan.strategicRecap.synergies.length > 0 ? `<div style="margin-top:8px;font-size:10px;color:#555;"><strong>Synergies :</strong> ${plan.strategicRecap.synergies.map(s => `→ ${s}`).join(" | ")}</div>` : ""}
  </div>` : ""}
  ${adaptationProjections && adaptationProjections.length > 0 ? `
  <div style="background:#f3f8ff;padding:12px 14px;border-radius:6px;font-size:12px;color:#333;margin-bottom:20px;border-left:3px solid #1967d2;page-break-inside:avoid;">
    <strong>🔮 Projections Adaptation Predictor™</strong>
    <p style="margin:4px 0 8px 0;font-size:10px;color:#666;">Estimations modèle (fourchettes physiologiques typiques, non garanties).</p>
    ${adaptationProjections.map((p, i) => `
      <div style="margin-top:${i === 0 ? 0 : 10}px;padding:8px 10px;background:#fff;border:1px solid #dbe7f5;border-radius:4px;">
        <div style="font-weight:600;font-size:12px;margin-bottom:4px;">
          ${i === 0 ? "⭐ " : ""}${p.leverLabel}
          <span style="font-weight:normal;color:#777;font-size:10px;margin-left:6px;">Impact ${p.impactScore.toFixed(0)}/100 — ${p.impactLabel}</span>
        </div>
        <p style="margin:0 0 6px 0;font-size:10.5px;color:#555;">${p.recommendation}</p>
        ${p.metrics.length > 0 ? `
        <table style="width:100%;border-collapse:collapse;font-size:10.5px;margin-top:4px;">
          ${p.metrics.map(m => {
            const digits = /vlamax/i.test(m.label) ? 2 : 1;
            const arrow = m.direction === "up" ? "↑" : m.direction === "down" ? "↓" : "→";
            const color = m.direction === "up" ? "#2e7d32" : m.direction === "down" ? "#0277bd" : "#888";
            const sign = m.deltaPct > 0 ? "+" : "";
            return `<tr>
              <td style="padding:2px 6px;color:${color};width:18px;">${arrow}</td>
              <td style="padding:2px 6px;">${m.label}</td>
              <td style="padding:2px 6px;text-align:right;font-family:monospace;color:#555;">
                ${m.current?.toFixed(digits) ?? "?"} → ${m.projected?.toFixed(digits) ?? "?"}
                <span style="color:${color};margin-left:4px;">(${sign}${m.deltaPct.toFixed(1)}%)</span>
              </td>
            </tr>`;
          }).join("")}
        </table>` : ""}
        ${p.performanceImpacts.filter(pi => pi.improvementPct > 0).length > 0 ? `
        <div style="margin-top:6px;font-size:10px;color:#2e7d32;">
          ${p.performanceImpacts.filter(pi => pi.improvementPct > 0).map(pi => `<span style="display:inline-block;background:#e8f5e9;padding:1px 6px;border-radius:8px;margin-right:4px;">${pi.distance} +${pi.improvementPct.toFixed(1)}%</span>`).join("")}
        </div>` : ""}
      </div>
    `).join("")}
  </div>` : ""}
  <h2>${isCompact ? "Plan Condensé" : "Plan Détaillé"}</h2>
  ${weekRows}
  <footer style="margin-top:32px;padding-top:12px;border-top:1px solid #ddd;font-size:10px;color:#aaa;text-align:center;">
    Plan généré par TFCL™ Plan Generator — ${new Date().toLocaleDateString("fr-FR")}
  </footer>
</body>
</html>`;
}
