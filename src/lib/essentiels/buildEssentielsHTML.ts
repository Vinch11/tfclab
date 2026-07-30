/**
 * buildEssentielsHTML — Export PDF imprimable des 8 piliers essentiels.
 */

import type { EssentielsBundle, PillarData, PillarMetric } from "./computeEssentielsData";

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const STATUS_COLOR: Record<string, string> = {
  ok: "#1F9D6B",
  warn: "#C8860D",
  missing: "#97949F",
  info: "#5555E0",
};
const STATUS_LABEL: Record<string, string> = {
  ok: "Dans la cible",
  warn: "À travailler",
  missing: "Données insuffisantes",
  info: "Information",
};

function formatMetric(m: PillarMetric): string {
  if (m.value == null || !isFinite(m.value) || m.value === 0) {
    return `<span style="color:#97949F;font-style:italic">—</span>`;
  }
  const v = (m.decimals != null ? m.value.toFixed(m.decimals) : m.value.toString()).replace(
    ".",
    ",",
  );
  return `<strong>${v}</strong>${m.unit ? ` <span style="color:#6E6B78;font-size:11px">${esc(m.unit)}</span>` : ""}`;
}

/** SVG horizontal gauge: scale [min,max], target band [tmin,tmax], value pointer */
function renderGauge(m: PillarMetric): string {
  if (m.value == null || !m.scale) return "";
  const [sMin, sMax] = m.scale;
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - sMin) / (sMax - sMin)) * 100));
  const valuePct = pct(m.value);
  const targetBand =
    m.target != null ? `<rect x="${pct(m.target[0])}%" y="0" width="${(pct(m.target[1]) - pct(m.target[0])).toFixed(2)}%" height="12" fill="#E4F5EE" stroke="#1F9D6B" stroke-width="0.5" />` : "";

  return `
    <svg viewBox="0 0 100 18" preserveAspectRatio="none" style="width:100%;height:22px;margin-top:4px;display:block">
      <rect x="0" y="3" width="100" height="12" fill="#F2F0E9" rx="2" />
      ${m.target ? `<rect x="${pct(m.target[0])}" y="3" width="${(pct(m.target[1]) - pct(m.target[0])).toFixed(2)}" height="12" fill="#A8E3CB" rx="2"/>` : ""}
      <line x1="${valuePct.toFixed(2)}" y1="0" x2="${valuePct.toFixed(2)}" y2="18" stroke="#14131A" stroke-width="0.8" />
      <circle cx="${valuePct.toFixed(2)}" cy="9" r="1.8" fill="#14131A" />
    </svg>
    <div style="display:flex;justify-content:space-between;font-size:9px;color:#97949F;margin-top:2px">
      <span>${sMin}</span>
      ${m.target ? `<span style="color:#1F9D6B">cible ${m.target[0]}–${m.target[1]}</span>` : "<span></span>"}
      <span>${sMax}</span>
    </div>
  `;
}

function renderPillar(p: PillarData): string {
  const color = STATUS_COLOR[p.status];
  const label = STATUS_LABEL[p.status];
  const metricsHTML = p.metrics
    .map(
      (m) => `
    <div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:baseline">
        <span style="font-size:12px;color:#5C5966">${esc(m.label)}</span>
        <span style="font-size:14px;color:#14131A">${formatMetric(m)}</span>
      </div>
      ${renderGauge(m)}
    </div>
  `,
    )
    .join("");

  return `
  <section class="pillar" style="page-break-inside:avoid;border:1px solid #E7E4DC;border-radius:12px;padding:16px;margin-bottom:14px;background:#ffffff">
    <header style="display:flex;align-items:center;gap:10px;margin-bottom:10px;border-bottom:1px solid #F2F0E9;padding-bottom:8px">
      <div style="width:32px;height:32px;border-radius:8px;background:${color}1a;color:${color};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px">${p.number}</div>
      <div style="flex:1">
        <h2 style="margin:0;font-size:15px;color:#14131A;font-weight:600">${esc(p.title)}</h2>
        <div style="font-size:10px;color:${color};font-weight:600;margin-top:2px">${label}</div>
      </div>
    </header>

    <div style="display:grid;grid-template-columns:1fr 1.4fr;gap:16px">
      <div>${metricsHTML}</div>
      <div style="font-size:11.5px;color:#14131A;line-height:1.5">
        <p style="margin:0 0 8px 0;padding:8px 10px;background:#FAF9F5;border-left:3px solid ${color};border-radius:4px">
          <strong>Lecture :</strong> ${esc(p.interpretation)}
        </p>
      </div>
    </div>

    <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;font-size:10.5px;line-height:1.45">
      <div>
        <div style="font-weight:600;color:#14131A;margin-bottom:3px">Définition</div>
        <div style="color:#5C5966">${esc(p.definition)}</div>
      </div>
      <div>
        <div style="font-weight:600;color:#14131A;margin-bottom:3px">Pourquoi c'est important</div>
        <div style="color:#5C5966">${esc(p.whyMatters)}</div>
      </div>
      <div>
        <div style="font-weight:600;color:#14131A;margin-bottom:3px">Comment on agit</div>
        <div style="color:#5C5966">${esc(p.howToAct)}</div>
      </div>
    </div>

    <div style="margin-top:8px;font-size:9px;color:#97949F;border-top:1px dashed #E7E4DC;padding-top:6px">
      Source : ${esc(p.source)}
    </div>
  </section>
  `;
}

export function buildEssentielsHTML(b: EssentielsBundle): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Essentiels TFCL — ${esc(b.athleteName)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #14131A; background: #FAF9F5; margin: 0; padding: 16px; }
  h1 { font-size: 22px; margin: 0 0 4px 0; }
  .subtitle { color: #6E6B78; font-size: 12px; margin-bottom: 18px; }
  .header { background: linear-gradient(135deg, #2B2933, #14131A); color: white; padding: 20px 24px; border-radius: 12px; margin-bottom: 18px; }
  .header h1 { color: white; }
  .header .subtitle { color: #DAD6CC; }
  .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 14px; }
  .meta-grid .cell { background: rgba(255,255,255,0.08); padding: 8px 10px; border-radius: 6px; }
  .meta-grid .k { font-size: 10px; color: #97949F; text-transform: uppercase; letter-spacing: 0.5px; }
  .meta-grid .v { font-size: 14px; font-weight: 600; color: white; margin-top: 2px; }
  .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #E7E4DC; font-size: 10px; color: #97949F; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <h1>Les 8 Essentiels TFCL™</h1>
    <div class="subtitle">Potentiel Physiologique TFCL™ — vue pédagogique consolidée</div>
    <div class="meta-grid">
      <div class="cell"><div class="k">Athlète</div><div class="v">${esc(b.athleteName)}</div></div>
      <div class="cell"><div class="k">Objectif</div><div class="v">${esc(b.athleteObjectif)}</div></div>
      <div class="cell"><div class="k">Âge</div><div class="v">${b.age ?? "—"}</div></div>
      <div class="cell"><div class="k">Snapshot</div><div class="v">${b.snapshotDate ?? "—"}</div></div>
    </div>
  </div>

  ${b.pillars.map(renderPillar).join("")}

  <div class="footer">
    Généré le ${esc(b.generatedAt)} — TFC Lab • Potentiel Physiologique TFCL™
  </div>
</body>
</html>`;
}
