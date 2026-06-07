/**
 * AIPlanPDFExport — Generates a printable HTML view of the AI plan for PDF export
 */

import type { ParsedPlan } from "@/lib/aiPlanParser";
import type { AdaptationProjection } from "@/hooks/useAITrainingPlan";
import { getTrailSessionAlternatives } from "@/lib/trailSessionAlternatives";
import { getFicheForSession, type EnrichedSessionFiche } from "@/lib/aiPlanWorkoutEnricher";

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

export function exportAIPlanToPDF(
  plan: ParsedPlan,
  athleteName?: string,
  startDate?: Date,
  adaptationProjections?: AdaptationProjection[],
) {
  const html = buildPlanHTML(plan, athleteName, startDate, adaptationProjections);
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
): string {
  const hasDate = !!startDate;

  const weekRows = plan.weeks.map(week => {
    const weekStart = hasDate ? computeWeekStartDate(startDate!, week.weekNumber) : null;

    const sessionRows = week.sessions.map(s => {
      const dateStr = weekStart && s.dayIndex >= 0 ? formatSessionDate(weekStart, s.dayIndex) : "";
      const trailAlts = s.isRest
        ? []
        : getTrailSessionAlternatives({ sport: s.sport, title: s.title, details: s.details });
      const altsHtml = trailAlts.length > 0
        ? `<div style="margin-top:4px;padding-top:4px;border-top:1px dashed #ccc;font-size:10px;color:#555;">
            <strong style="color:#1967d2;">Alternatives terrain :</strong>
            ${trailAlts.map(a => `<div style="margin-top:2px;"><span>${a.icon}</span> <strong>${a.label}</strong> — <span style="color:#777;">${a.hint}</span></div>`).join("")}
          </div>`
        : "";
      return `
      <tr style="${s.isRest ? 'color:#999;' : ''}">
        ${hasDate ? `<td style="padding:4px 8px;border:1px solid #ddd;white-space:nowrap;font-size:11px;color:#555;">${dateStr}</td>` : ""}
        <td style="padding:4px 8px;border:1px solid #ddd;white-space:nowrap;">${s.dayName}</td>
        <td style="padding:4px 8px;border:1px solid #ddd;">${getSportEmoji(s.sport)} ${s.sport}</td>
        <td style="padding:4px 8px;border:1px solid #ddd;font-weight:600;">${s.title}</td>
        <td style="padding:4px 8px;border:1px solid #ddd;font-size:11px;">${s.details}${altsHtml}</td>
      </tr>
    `;
    }).join("");

    const weekRangeStr = weekStart ? ` <span style="font-weight:normal;font-size:10px;color:#1967d2;margin-left:6px;">(${formatWeekRange(weekStart)})</span>` : "";

    return `
      <div style="page-break-inside:avoid;margin-bottom:24px;">
        <h3 style="margin:0 0 4px 0;font-size:14px;color:#333;">
          Semaine ${week.weekNumber} — ${week.theme}${weekRangeStr}
          <span style="font-weight:normal;font-size:11px;color:#888;margin-left:8px;">${week.phase}</span>
        </h3>
        ${week.volumeTarget ? `<p style="margin:0 0 8px 0;font-size:11px;color:#666;">Volume cible : ${week.volumeTarget}</p>` : ""}
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#f5f5f5;">
              ${hasDate ? `<th style="padding:4px 8px;border:1px solid #ddd;text-align:left;width:100px;">Date</th>` : ""}
              <th style="padding:4px 8px;border:1px solid #ddd;text-align:left;width:80px;">Jour</th>
              <th style="padding:4px 8px;border:1px solid #ddd;text-align:left;width:100px;">Sport</th>
              <th style="padding:4px 8px;border:1px solid #ddd;text-align:left;width:180px;">Séance</th>
              <th style="padding:4px 8px;border:1px solid #ddd;text-align:left;">Détails</th>
            </tr>
          </thead>
          <tbody>${sessionRows}</tbody>
        </table>
        ${week.coachNotes ? `<p style="margin:8px 0 0 0;font-size:11px;color:#555;background:#fff8e1;padding:6px 10px;border-radius:4px;">⚡ ${week.coachNotes}</p>` : ""}
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
    @media print { .no-print { display: none !important; } @page { margin: 15mm; } }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; color: #222; background: #fff; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    h2 { font-size: 16px; color: #444; margin-top: 24px; border-bottom: 2px solid #1967d2; padding-bottom: 4px; }
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
  <h2>Plan Détaillé</h2>
  ${weekRows}
  <footer style="margin-top:32px;padding-top:12px;border-top:1px solid #ddd;font-size:10px;color:#aaa;text-align:center;">
    Plan généré par TFCL™ Plan Generator — ${new Date().toLocaleDateString("fr-FR")}
  </footer>
</body>
</html>`;
}
