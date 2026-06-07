/**
 * Export complete WorkoutLibrary as a detailed printable HTML file.
 * Run: bun scripts/exportLibraryPDF.ts <output.html>
 */
import { WorkoutLibrary } from "../src/lib/workoutLibrary";
import type { LibraryWorkout } from "../src/types/workoutLibrary";
import { writeFileSync } from "node:fs";

const out = process.argv[2] || "/mnt/documents/bibliotheque_seances.html";

function esc(s: any): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const sportColors: Record<string, { bg: string; bd: string; tx: string }> = {
  cyclisme: { bg: "#dbeafe", bd: "#3b82f6", tx: "#1e3a8a" },
  course: { bg: "#fee2e2", bd: "#ef4444", tx: "#7f1d1d" },
  natation: { bg: "#cffafe", bd: "#06b6d4", tx: "#164e63" },
  brick: { bg: "#fef3c7", bd: "#f59e0b", tx: "#78350f" },
  strength: { bg: "#ede9fe", bd: "#8b5cf6", tx: "#4c1d95" },
  mixed: { bg: "#f3f4f6", bd: "#6b7280", tx: "#1f2937" },
  swim: { bg: "#cffafe", bd: "#06b6d4", tx: "#164e63" },
  bike: { bg: "#dbeafe", bd: "#3b82f6", tx: "#1e3a8a" },
  run: { bg: "#fee2e2", bd: "#ef4444", tx: "#7f1d1d" },
};
const catColors: Record<string, string> = {
  A: "#10b981", B: "#ef4444", C: "#f59e0b", D: "#6b7280",
  REST: "#9ca3af", "Récup": "#6b7280", SV1: "#06b6d4", LT1: "#3b82f6",
  TT: "#8b5cf6", VO2: "#dc2626", Sprint: "#f97316", Brique: "#f59e0b", "Race-Sim": "#a855f7",
};

function renderWorkout(w: LibraryWorkout): string {
  const sc = sportColors[w.sport] || sportColors.mixed;
  const cc = catColors[w.cat] || "#6b7280";
  const dur = `${w.durationMin[0]}–${w.durationMin[1]} min`;
  const phases = (w.phase || []).join(", ") || "—";
  const goals = (w.goals || []).join(", ") || "—";
  const tags = (w.tags || []).join(", ");

  const structureRows = w.structure.map(s => `
    <tr>
      <td style="padding:4px 8px;font-weight:600;color:#374151;width:90px;vertical-align:top;">${esc(s.part)}</td>
      <td style="padding:4px 8px;color:#111827;">${esc(s.text)}</td>
      <td style="padding:4px 8px;color:#6b7280;font-size:10px;width:120px;vertical-align:top;">${esc(s.zones.join(", "))}</td>
    </tr>`).join("");

  const variantRows = w.variants ? Object.entries(w.variants)
    .filter(([, v]) => v && v !== "—")
    .map(([k, v]) => `<tr><td style="padding:2px 6px;font-weight:600;color:#4b5563;width:90px;">${esc(k)}</td><td style="padding:2px 6px;color:#111827;">${esc(v)}</td></tr>`)
    .join("") : "";

  const dPlus = w.dPlusTargetM
    ? (typeof w.dPlusTargetM === "number" ? `${w.dPlusTargetM} m` : `${w.dPlusTargetM.min}–${w.dPlusTargetM.max} m`)
    : null;

  return `
  <div class="card">
    <div class="card-header" style="background:${sc.bg};border-left:4px solid ${sc.bd};">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span style="background:${cc};color:white;padding:2px 8px;border-radius:4px;font-weight:700;font-size:11px;">${esc(w.cat)}</span>
        <span style="background:${sc.bd};color:white;padding:2px 8px;border-radius:4px;font-size:10px;text-transform:uppercase;">${esc(w.sport)}</span>
        <span style="font-weight:700;color:${sc.tx};font-size:13px;">${esc(w.id)}</span>
        <span style="margin-left:auto;color:#6b7280;font-size:11px;">⏱ ${dur}</span>
      </div>
      <div style="margin-top:4px;font-size:12px;color:#111827;font-style:italic;">${esc(w.objectif)}</div>
    </div>
    <div class="card-body">
      <div class="meta">
        <span><b>Nécessité:</b> ${esc(w.necessite)}</span>
        <span><b>Quand:</b> ${esc(w.when)}</span>
        <span><b>Phases:</b> ${esc(phases)}</span>
        ${dPlus ? `<span><b>D+:</b> ${esc(dPlus)}</span>` : ""}
        <span><b>Objectifs:</b> ${esc(goals)}</span>
        ${tags ? `<span><b>Tags:</b> ${esc(tags)}</span>` : ""}
      </div>
      ${w.avoid ? `<div class="avoid"><b>⚠ À éviter:</b> ${esc(w.avoid)}</div>` : ""}
      <div class="section-title">Structure</div>
      <table class="struct">${structureRows}</table>
      ${variantRows ? `<div class="section-title">Variantes</div><table class="struct">${variantRows}</table>` : ""}
      ${w.notes ? `<div class="notes"><b>Notes:</b> ${esc(w.notes)}</div>` : ""}
    </div>
  </div>`;
}

// Group by sport then category
const groups: Record<string, Record<string, LibraryWorkout[]>> = {};
for (const w of WorkoutLibrary) {
  const sport = w.sport || "mixed";
  const cat = w.cat || "?";
  groups[sport] ||= {};
  groups[sport][cat] ||= [];
  groups[sport][cat].push(w);
}

const sportOrder = ["cyclisme", "bike", "course", "run", "natation", "swim", "brick", "strength", "mixed"];
const catOrder = ["A", "B", "C", "D", "Brique", "Race-Sim", "VO2", "TT", "Sprint", "LT1", "SV1", "Récup", "REST"];

const sportLabel: Record<string, string> = {
  cyclisme: "🚴 Vélo", bike: "🚴 Vélo", course: "🏃 Course",
  run: "🏃 Course", natation: "🏊 Natation", swim: "🏊 Natation",
  brick: "🔀 Brick", strength: "💪 Renforcement", mixed: "🔄 Mixte",
};
const catLabel: Record<string, string> = {
  A: "A — Endurance / Socle", B: "B — Intensité / Qualité",
  C: "C — Technique / Force / Spécifique", D: "D — Récupération / Régénération",
};

const sections: string[] = [];
const presentSports = Object.keys(groups).sort((a, b) => {
  const ia = sportOrder.indexOf(a); const ib = sportOrder.indexOf(b);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
});

let total = 0;
for (const sport of presentSports) {
  const cats = Object.keys(groups[sport]).sort((a, b) => {
    const ia = catOrder.indexOf(a); const ib = catOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
  const sportTotal = cats.reduce((s, c) => s + groups[sport][c].length, 0);
  total += sportTotal;
  sections.push(`<h1 class="sport-title">${sportLabel[sport] || sport} <span class="count">${sportTotal} séances</span></h1>`);
  for (const cat of cats) {
    const ws = groups[sport][cat].sort((a, b) => a.id.localeCompare(b.id));
    sections.push(`<h2 class="cat-title">${catLabel[cat] || cat} <span class="count">${ws.length}</span></h2>`);
    sections.push(`<div class="grid">${ws.map(renderWorkout).join("")}</div>`);
  }
}

const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>Bibliothèque de Séances TFCL™</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, system-ui, "Segoe UI", sans-serif; color:#111827; margin:0; padding:0; font-size:12px; line-height:1.45; }
  .cover { text-align:center; padding:80px 20px; page-break-after:always; }
  .cover h1 { font-size:32px; margin:0 0 12px; color:#0f172a; }
  .cover .subtitle { font-size:16px; color:#475569; margin-bottom:24px; }
  .cover .stats { display:inline-block; background:#f1f5f9; padding:16px 32px; border-radius:8px; font-size:14px; color:#334155; }
  h1.sport-title { font-size:22px; color:#0f172a; border-bottom:3px solid #0f172a; padding-bottom:6px; margin:24px 0 12px; page-break-before:always; }
  h1.sport-title:first-of-type { page-break-before:auto; }
  h2.cat-title { font-size:15px; color:#1f2937; background:#f1f5f9; padding:6px 12px; border-left:4px solid #475569; margin:16px 0 10px; }
  .count { font-size:11px; color:#64748b; font-weight:normal; margin-left:8px; }
  .grid { display:block; }
  .card { border:1px solid #e5e7eb; border-radius:6px; margin:0 0 10px 0; page-break-inside:avoid; overflow:hidden; }
  .card-header { padding:8px 12px; }
  .card-body { padding:8px 12px; }
  .meta { display:flex; flex-wrap:wrap; gap:4px 14px; font-size:11px; color:#374151; margin-bottom:6px; }
  .meta b { color:#0f172a; }
  .avoid { background:#fef2f2; border-left:3px solid #f87171; padding:4px 8px; font-size:11px; color:#7f1d1d; margin:4px 0; border-radius:3px; }
  .notes { background:#f0fdf4; border-left:3px solid #4ade80; padding:4px 8px; font-size:11px; color:#14532d; margin-top:6px; border-radius:3px; }
  .section-title { font-size:11px; font-weight:700; text-transform:uppercase; color:#475569; margin:6px 0 3px; letter-spacing:0.5px; }
  table.struct { width:100%; border-collapse:collapse; font-size:11px; }
  table.struct td { border-bottom:1px solid #f1f5f9; }
  table.struct tr:last-child td { border-bottom:none; }
  .toc { padding:0 8px; font-size:13px; }
  .toc li { margin:4px 0; }
</style></head><body>
<div class="cover">
  <h1>Bibliothèque de Séances</h1>
  <div class="subtitle">Potentiel Physiologique TFCL™ — Catalogue complet détaillé</div>
  <div class="stats">
    <b>${WorkoutLibrary.length}</b> séances · <b>${presentSports.length}</b> sports<br>
    Généré le ${new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
  </div>
  <div class="toc" style="margin-top:32px;text-align:left;max-width:500px;margin-left:auto;margin-right:auto;">
    <h3 style="font-size:14px;color:#0f172a;border-bottom:1px solid #cbd5e1;padding-bottom:4px;">Sommaire</h3>
    <ul style="list-style:none;padding:0;">
      ${presentSports.map(s => {
        const n = Object.values(groups[s]).reduce((a, b) => a + b.length, 0);
        return `<li><b>${sportLabel[s] || s}</b> <span style="color:#64748b;">— ${n} séances</span></li>`;
      }).join("")}
    </ul>
  </div>
</div>
${sections.join("\n")}
</body></html>`;

writeFileSync(out, html);
console.log(`✅ Wrote ${out} — ${WorkoutLibrary.length} workouts across ${presentSports.length} sports`);
