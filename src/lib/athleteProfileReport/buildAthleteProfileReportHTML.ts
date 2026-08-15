/**
 * Rapport Profil Athlète — HTML imprimable (A4), design Bevel.
 *
 * Objectif : un document complet et pédagogique remis à l'athlète.
 *   « Voilà ton profil → voilà tes limiteurs → voilà ce qu'on va travailler
 *     → voilà le schéma de planification. »
 *
 * Volontairement EXCLUS (demande coach) :
 *   - « Positionnement & Comment lire ce rapport »
 *   - « Synthèse Exécutive — Lecture nuancée »
 *
 * Le builder est pur : aucune physiologie calculée ici.
 */

import { BEVEL_PRINT_COLORS as C, applyBevelPrintTheme } from "@/lib/print/bevelPrintTheme";
import type {
  AthleteProfileReportInput,
  ReportLimiter,
  ReportLever,
  ReportMetric,
  ReportRadarAxis,
  ReportRoadmap,
  ReportTargetProgress,
  ReportZoneSet,
} from "./types";
import { buildPhasePedagogy } from "./phasePedagogy";

// ── helpers ────────────────────────────────────────────────────────────────
function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Autorise **gras** dans les textes éditoriaux, après échappement. */
function rich(s: unknown): string {
  return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function num(v: number | null | undefined, decimals = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(decimals).replace(".", ",");
}

const STATUS_COLOR: Record<string, string> = {
  ok: C.mint,
  warn: C.amber,
  bad: C.danger,
  missing: C.faint,
};
const STATUS_LABEL: Record<string, string> = {
  ok: "Dans la cible",
  warn: "À surveiller",
  bad: "Point faible",
  missing: "Données insuffisantes",
};

// ── charts ─────────────────────────────────────────────────────────────────

/** Radar 4-5 axes, style Bevel (grille pointillée, remplissage périwinkle). */
function radarSVG(axes: ReportRadarAxis[]): string {
  if (axes.length < 3) return "";
  const size = 340;
  const padX = 56; // marge pour les libellés latéraux
  const cx = size / 2 + padX;
  const cy = size / 2 + 6;
  const R = 112;
  const n = axes.length;
  const pt = (i: number, r: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as const;
  };

  const rings = [0.25, 0.5, 0.75, 1]
    .map((k) => {
      const pts = axes
        .map((_, i) => {
          const [x, y] = pt(i, R * k);
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
      return `<polygon points="${pts}" fill="none" stroke="${C.line}" stroke-width="0.8" stroke-dasharray="2 5" />`;
    })
    .join("");

  const spokes = axes
    .map((_, i) => {
      const [x, y] = pt(i, R);
      return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${C.line}" stroke-width="0.8" />`;
    })
    .join("");

  const valuePts = axes
    .map((a, i) => {
      const r = (Math.max(0, Math.min(100, a.score)) / 100) * R;
      const [x, y] = pt(i, r);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const dots = axes
    .map((a, i) => {
      const r = (Math.max(0, Math.min(100, a.score)) / 100) * R;
      const [x, y] = pt(i, r);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" fill="${C.primary}" stroke="#fff" stroke-width="1.2" />`;
    })
    .join("");

  const labels = axes
    .map((a, i) => {
      const [x, y] = pt(i, R + 26);
      const anchor = Math.abs(x - cx) < 12 ? "middle" : x > cx ? "start" : "end";
      return `
        <text x="${x.toFixed(1)}" y="${(y - 2).toFixed(1)}" text-anchor="${anchor}" font-size="11" font-weight="600" fill="${C.ink}">${esc(a.shortLabel)}</text>
        <text x="${x.toFixed(1)}" y="${(y + 11).toFixed(1)}" text-anchor="${anchor}" font-size="10" fill="${C.muted}">${Math.round(a.score)}/100</text>`;
    })
    .join("");

  return `
  <svg viewBox="0 0 ${size + padX * 2} ${size + 16}" width="100%" style="max-width:420px;display:block;margin:0 auto" xmlns="http://www.w3.org/2000/svg">
    ${rings}${spokes}
    <polygon points="${valuePts}" fill="${C.primary}22" stroke="${C.primary}" stroke-width="2" stroke-linejoin="round" />
    ${dots}${labels}
  </svg>`;
}

/** Jauge horizontale : échelle, bande cible, curseur valeur. */
function gaugeSVG(m: ReportMetric): string {
  if (m.value == null || !m.scale) return "";
  const [sMin, sMax] = m.scale;
  const p = (v: number) => Math.max(0, Math.min(100, ((v - sMin) / (sMax - sMin)) * 100));
  const v = p(m.value);
  const band = m.target
    ? `<rect x="${p(m.target[0]).toFixed(2)}" y="3" width="${Math.max(1, p(m.target[1]) - p(m.target[0])).toFixed(2)}" height="10" fill="${C.mintSoft}" stroke="${C.mint}" stroke-width="0.4" rx="1.5" />`
    : "";
  return `
    <svg viewBox="0 0 100 16" preserveAspectRatio="none" style="width:100%;height:20px;display:block;margin-top:6px">
      <rect x="0" y="3" width="100" height="10" fill="${C.surfaceAlt}" rx="2" />
      ${band}
      <line x1="${v.toFixed(2)}" y1="0" x2="${v.toFixed(2)}" y2="16" stroke="${C.ink}" stroke-width="0.9" />
    </svg>
    <div style="display:flex;justify-content:space-between;align-items:center;font-size:8.5px;color:${C.faint};margin-top:3px;gap:6px">
      <span>${num(sMin, 0)}</span>
      ${m.target ? `<span style="color:${C.mint};font-weight:600;white-space:nowrap">cible ${num(m.target[0], m.decimals ?? 1)}–${num(m.target[1], m.decimals ?? 1)}</span>` : ""}
      <span>${num(sMax, 0)}</span>
    </div>`;
}

/** Barre de progression vers la cible d'ambition. */
function progressBar(t: ReportTargetProgress): string {
  const pct = t.progress == null ? 0 : Math.max(0, Math.min(100, t.progress));
  const color = t.reached ? C.mint : pct >= 70 ? C.amber : C.primary;
  return `
  <div style="margin-bottom:12px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:11.5px">
      <span style="color:${C.inkSoft};font-weight:600">${esc(t.label)}</span>
      <span style="color:${C.muted}">
        ${t.current == null ? "—" : `<strong style="color:${C.ink}">${num(t.current, t.decimals ?? 1)}</strong>`}
        ${t.target == null ? "" : ` / ${num(t.target, t.decimals ?? 1)} ${esc(t.unit)}`}
      </span>
    </div>
    <div style="position:relative;height:9px;background:${C.surfaceAlt};border-radius:999px;margin-top:5px;overflow:hidden">
      <div style="position:absolute;inset:0 auto 0 0;width:${pct.toFixed(1)}%;background:${color};border-radius:999px"></div>
    </div>
    <div style="font-size:9px;color:${t.reached ? C.mint : C.faint};margin-top:3px">
      ${t.progress == null ? "Donnée manquante" : t.reached ? "✓ Cible atteinte" : `${Math.round(pct)} % du chemin parcouru`}
    </div>
  </div>`;
}

/** Frise de périodisation (Gantt simplifié). */
function roadmapSVG(r: ReportRoadmap): string {
  const W = 900;
  const rowH = 46;
  const top = 26;
  const left = 16;
  const right = 16;
  const H = top + r.phases.length * rowH + 34;
  const plot = W - left - right;
  const wk = plot / Math.max(1, r.totalWeeks);

  const ticks = Array.from({ length: r.totalWeeks }, (_, i) => i + 1)
    .filter((w) => w === 1 || w % (r.totalWeeks > 16 ? 4 : 2) === 0)
    .map((w) => {
      const x = left + (w - 1) * wk;
      return `<line x1="${x.toFixed(1)}" y1="${top - 8}" x2="${x.toFixed(1)}" y2="${H - 26}" stroke="${C.line}" stroke-width="0.7" stroke-dasharray="2 6" />
        <text x="${x.toFixed(1)}" y="${H - 12}" font-size="9.5" fill="${C.faint}" text-anchor="middle">S${w}</text>`;
    })
    .join("");

  const bars = r.phases
    .map((p, i) => {
      const x = left + (p.startWeek - 1) * wk;
      const w = Math.max(12, (p.endWeek - p.startWeek + 1) * wk);
      const y = top + i * rowH;
      return `
        <rect x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="26" rx="8" fill="${p.color}" opacity="0.92" />
        <text x="${(x + 10).toFixed(1)}" y="${y + 17}" font-size="11" font-weight="600" fill="${C.ink}">${esc(p.name)}</text>
        <text x="${(x + 10).toFixed(1)}" y="${y + 38}" font-size="9.5" fill="${C.muted}">${esc(p.subtitle)} · S${p.startWeek}–S${p.endWeek}</text>`;
    })
    .join("");

  return `<svg viewBox="0 0 ${W} ${H}" width="100%" xmlns="http://www.w3.org/2000/svg">${ticks}${bars}</svg>`;
}

// ── blocs ──────────────────────────────────────────────────────────────────

function metricCard(m: ReportMetric): string {
  const color = STATUS_COLOR[m.status] ?? C.faint;
  const insufficient = m.value == null || m.value === 0 || m.status === "missing";
  return `
  <div class="bp-card avoid" style="margin:0;padding:14px 15px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">
      <div style="flex:1 1 120px;min-width:0;font-size:11.5px;font-weight:600;color:${C.inkSoft};line-height:1.35">${esc(m.label)}</div>
      <span class="bp-badge" style="flex:0 0 auto;background:${color}1a;color:${color};border-color:${color}33;white-space:nowrap">${esc(STATUS_LABEL[m.status])}</span>
    </div>
    <div style="margin-top:6px;font-size:24px;font-weight:600;letter-spacing:-0.02em;color:${insufficient ? C.faint : C.ink}">
      ${insufficient ? `<span style="font-size:13px;font-style:italic">Données insuffisantes</span>` : `${num(m.value, m.decimals ?? 1)}<span style="font-size:12px;color:${C.muted};font-weight:500"> ${esc(m.unit)}</span>`}
    </div>
    ${insufficient ? "" : gaugeSVG(m)}
    <div style="margin-top:8px;font-size:10.5px;color:${C.muted};line-height:1.45">${rich(m.meaning)}</div>
    ${
      m.source
        ? `<div style="margin-top:6px;font-size:9px;color:${C.faint}">Source : ${esc(m.source)}${
            m.confidence != null ? ` · fiabilité ${Math.round(m.confidence * 100)} %` : ""
          }</div>`
        : ""
    }
  </div>`;
}

function limiterCard(l: ReportLimiter): string {
  const color = l.rank === 1 ? C.danger : C.amber;
  return `
  <div class="bp-card avoid" style="border-left:4px solid ${color}">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:30px;height:30px;border-radius:9px;background:${color}1a;color:${color};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">${l.rank}</div>
      <div style="flex:1">
        <div style="font-size:15px;font-weight:600;color:${C.ink}">${esc(l.emoji)} ${esc(l.title)}</div>
        <div style="font-size:10px;color:${color};font-weight:600;margin-top:1px">Sévérité : ${esc(l.severityLabel)} · poids ${Math.round(l.impact)}/100</div>
      </div>
    </div>
    <div style="height:7px;background:${C.surfaceAlt};border-radius:999px;margin:10px 0 12px">
      <div style="height:7px;width:${Math.max(4, Math.min(100, l.impact)).toFixed(0)}%;background:${color};border-radius:999px"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:11px;line-height:1.5">
      <div style="background:${C.surface};border-radius:10px;padding:10px 12px">
        <div style="font-weight:600;color:${C.ink};margin-bottom:3px">Ce que tu ressens</div>
        <div style="color:${C.muted}">${rich(l.fieldFeeling)}</div>
      </div>
      <div style="background:${C.surface};border-radius:10px;padding:10px 12px">
        <div style="font-weight:600;color:${C.ink};margin-bottom:3px">Ce qui se passe dans ton corps</div>
        <div style="color:${C.muted}">${rich(l.mechanism)}</div>
      </div>
    </div>
    ${
      l.evidence.length
        ? `<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:5px">${l.evidence
            .map((e) => `<span class="bp-badge bp-badge--muted">${esc(e)}</span>`)
            .join("")}</div>`
        : ""
    }
  </div>`;
}

/** Texte de repli quand le moteur ne fournit pas de description exploitable. */
function leverFallbackDescription(title: string): string {
  const t = (title || "").toLowerCase();
  if (/vlamax|glycoly/.test(t))
    return "Réduire ta production de lactate à intensité modérée : moins de sollicitations explosives, plus de travail continu et de sorties longues bien pilotées.";
  if (/vo2|aérob|puissance max/.test(t))
    return "Élever ton plafond aérobie : des intervalles courts et intenses qui obligent ton corps à consommer plus d'oxygène par minute.";
  if (/seuil|mlss|lactate/.test(t))
    return "Déplacer ton seuil vers le haut : des blocs tenus juste sous la rupture pour améliorer ta capacité à recycler le lactate.";
  if (/durabil|tte|endurance|fond/.test(t))
    return "Tenir plus longtemps à intensité utile : volume progressif, sorties longues et fins de séance qualitatives.";
  if (/économ|efficien|technique|cadence/.test(t))
    return "Dépenser moins pour la même vitesse : travail technique, cadence, force spécifique et gammes.";
  if (/force|muscul|renfo/.test(t))
    return "Renforcer la chaîne musculaire pour mieux encaisser la charge et retarder la perte de rendement.";
  if (/récup|fatigue|charge/.test(t))
    return "Rééquilibrer charge et récupération pour que l'entraînement se transforme réellement en progrès.";
  return "Ce levier est activé par ton diagnostic : ton coach l'a positionné dans le plan pour agir directement sur ton limiteur principal.";
}

function leverCard(l: ReportLever): string {
  const desc = (l.description || "").trim() || leverFallbackDescription(l.title);
  const hasWorkouts = l.workouts.length > 0;
  const hasAdaptations = l.adaptations.length > 0;
  return `
  <div class="bp-card bp-card--accent avoid" style="display:flex;flex-direction:column">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="font-size:17px">${esc(l.emoji)}</span>
      <div style="font-size:14px;font-weight:600;color:${C.ink};flex:1">${esc(l.title)}</div>
      <span class="bp-badge bp-badge--info">Priorité ${l.priority}</span>
    </div>
    <div style="font-size:11.5px;color:${C.muted};line-height:1.55">${rich(desc)}</div>
    ${
      hasWorkouts
        ? `<div style="margin-top:10px;background:${C.surface};border-radius:10px;padding:9px 11px">
            <div style="font-size:10px;font-weight:600;color:${C.ink};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px">Séances types</div>
            <ul style="margin:0;padding-left:16px;font-size:11px;color:${C.inkSoft};line-height:1.55">${l.workouts.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>
          </div>`
        : ""
    }
    ${
      hasAdaptations
        ? `<div style="margin-top:8px">
            <div style="font-size:10px;font-weight:600;color:${C.ink};text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px">Adaptations attendues</div>
            <div style="display:flex;flex-wrap:wrap;gap:5px">${l.adaptations.map((a) => `<span class="bp-badge bp-badge--ok">${esc(a)}</span>`).join("")}</div>
          </div>`
        : ""
    }
    ${
      !hasWorkouts && !hasAdaptations
        ? `<div style="margin-top:10px;font-size:10.5px;color:${C.faint};background:${C.surface};border-radius:10px;padding:8px 10px;line-height:1.5">
            Les séances concrètes de ce levier sont détaillées semaine par semaine dans ton plan d'entraînement.
          </div>`
        : ""
    }
  </div>`;
}

function zoneTable(z: ReportZoneSet): string {
  const rows = z.zones
    .map(
      (r) => `
      <tr>
        <td style="font-weight:600;color:${C.primary}">${esc(r.id)}</td>
        <td>${esc(r.label)}<div style="font-size:9.5px;color:${C.faint}">${esc(r.condition)}</div></td>
        <td>${esc(r.pctRef)}<div style="font-size:9px;color:${C.faint}">${esc(r.refLabel)}</div></td>
        <td style="font-weight:600">${r.absolute ? esc(r.absolute) : "—"}</td>
        <td>${r.hrPct ? `<span style="font-weight:600">${esc(r.hrPct)}</span><div style="font-size:9px;color:${C.faint}">de ta FC max</div>` : "—"}</td>
        <td>${r.heartRate ? esc(r.heartRate) : "—"}</td>
      </tr>`,
    )
    .join("");

  return `
  <div class="bp-card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div style="font-size:14px;font-weight:600;color:${C.ink}">${esc(z.sportLabel)}</div>
      <span class="bp-badge ${z.source === "derived" ? "bp-badge--ok" : "bp-badge--muted"}">
        ${z.source === "derived" ? `Zones calculées sur ta physiologie · fiabilité ${Math.round(z.confidence * 100)} %` : "Grille standard (données insuffisantes)"}
      </span>
    </div>
    ${z.anchors.length ? `<div style="font-size:9.5px;color:${C.faint};margin-bottom:8px">Ancrages : ${z.anchors.map(esc).join(" · ")}</div>` : ""}
    ${z.fallbackReason ? `<div style="font-size:10px;color:${C.amber};margin-bottom:8px">${esc(z.fallbackReason)}</div>` : ""}
    <table style="width:100%;font-size:10.5px">
      <thead><tr><th style="text-align:left">Zone</th><th style="text-align:left">Intention</th><th style="text-align:left">%</th><th style="text-align:left">Valeur</th><th style="text-align:left">% FC max</th><th style="text-align:left">FC (bpm)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// ── document ───────────────────────────────────────────────────────────────

export function buildAthleteProfileReportHTML(d: AthleteProfileReportInput): string {
  const readinessColor = d.readiness.score >= 70 ? C.mint : d.readiness.score >= 45 ? C.amber : C.danger;

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Mon profil physiologique — ${esc(d.athleteName)}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 14px; }
  .wrap { max-width: 980px; margin: 0 auto; }
  h2.sec { font-size: 19px; margin: 26px 0 4px; }
  p.sub { font-size: 11.5px; color: ${C.muted}; margin: 0 0 12px; }
  .grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
  .grid3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
  @media print {
    .grid2 { grid-template-columns: 1fr 1fr; }
    .grid3 { grid-template-columns: repeat(3, 1fr); }
  }
  .bp-header h1 { font-size: 26px; line-height: 1.15; }
  table td { padding: 5px 6px; vertical-align: top; }
  table th { padding: 4px 6px; }
  .page-break { page-break-before: always; }
  .avoid { page-break-inside: avoid; }
</style>
</head>
<body>
<div class="wrap">

  <!-- HERO -->
  <div class="bp-header">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:18px;flex-wrap:wrap">
      <div style="flex:1 1 260px;min-width:0">
        <h1 style="font-size:26px">Mon profil physiologique</h1>
        <p style="margin:0;font-size:12.5px">Potentiel Physiologique TFCL™ — rapport personnalisé</p>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:14px">
          ${[
            ["Athlète", d.athleteName],
            ["Objectif", d.objectifLabel],
            ["Ambition", d.ambitionLabel],
            ["Âge", d.age != null ? `${d.age} ans` : "—"],
            ["Bilan du", d.snapshotDate ?? "—"],
          ]
            .map(
              ([k, v]) => `<div style="background:rgba(255,255,255,0.12);border-radius:10px;padding:7px 12px">
                <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.06em;color:rgba(255,255,255,0.7)">${esc(k)}</div>
                <div style="font-size:13px;font-weight:600;color:#fff;margin-top:1px">${esc(v)}</div>
              </div>`,
            )
            .join("")}
        </div>
      </div>
      ${
        d.logoBase64
          ? `<div style="flex:0 1 auto;display:flex;align-items:flex-end;justify-content:center;align-self:stretch;padding-bottom:6px">
              <img src="${d.logoBase64}" alt="Logo" style="height:112px;max-width:150px;width:auto;display:block;object-fit:contain" />
            </div>`
          : ""
      }
      <div style="text-align:center;min-width:120px">

        <div style="width:104px;height:104px;border-radius:50%;background:rgba(255,255,255,0.14);border:3px solid rgba(255,255,255,0.55);display:flex;flex-direction:column;align-items:center;justify-content:center;margin:0 auto">
          <div style="font-size:30px;font-weight:700;color:#fff;line-height:1">${Math.round(d.readiness.score)}</div>
          <div style="font-size:9px;color:rgba(255,255,255,0.8);letter-spacing:0.05em">/ 100</div>
        </div>
        <div style="font-size:11.5px;font-weight:600;color:#fff;margin-top:8px">${esc(d.readiness.label)}</div>
        <div style="font-size:9px;color:rgba(255,255,255,0.75)">fiabilité ${Math.round(d.readiness.confidence * 100)} %</div>
      </div>
    </div>
  </div>

  <div class="bp-card avoid" style="border-left:4px solid ${readinessColor}">
    <div style="font-size:12.5px;line-height:1.6;color:${C.inkSoft}">${rich(d.readiness.message)}</div>
  </div>

  <!-- 1. PROFIL -->
  <h2 class="sec">1 · Ton profil physiologique</h2>
  <p class="sub">Ce que disent tes tests et tes données : ton moteur, ta capacité à tenir dans la durée, ta façon de produire l'énergie.</p>

  <div class="bp-card avoid">
    <div class="grid2" style="grid-template-columns:0.9fr 1.1fr;gap:20px;align-items:center">
      <div>
        ${radarSVG(d.radar)}
        <div style="font-size:9.5px;color:${C.faint};text-align:center;margin-top:4px">Chaque axe est noté sur 100 par rapport aux exigences de ton objectif.</div>
      </div>
      <div>
        <div style="font-size:12px;line-height:1.65;color:${C.inkSoft}">${rich(d.profileNarrative)}</div>
        ${
          d.economyAxis
            ? `<div style="margin-top:12px;background:${C.surface};border-radius:10px;padding:10px 12px">
                <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;color:${C.ink}">Économie (modulateur d'efficience)</div>
                <div style="font-size:11.5px;color:${C.muted};margin-top:3px">${esc(d.economyAxis.label)} : <strong style="color:${C.ink}">${Math.round(d.economyAxis.score)}/100</strong> — l'économie affine le rendement mais n'est jamais un limiteur principal.</div>
              </div>`
            : ""
        }
        <div style="margin-top:10px;font-size:10px;color:${C.faint}">Complétude des données : ${Math.round(d.dataCompleteness)} % — plus tu réalises de tests, plus le profil se précise.</div>
      </div>
    </div>
  </div>

  <div class="grid3">${d.metrics.map(metricCard).join("")}</div>

  ${
    d.targetProgress.length
      ? `<div class="bp-card" style="margin-top:12px">
          <div style="font-size:14px;font-weight:600;margin-bottom:10px;color:${C.ink}">Où tu en es par rapport à ta cible « ${esc(d.ambitionLabel)} »</div>
          ${d.targetProgress.map(progressBar).join("")}
        </div>`
      : ""
  }

  <!-- 2. LIMITEURS -->
  <div class="page-break"></div>
  <h2 class="sec">2 · Tes limiteurs</h2>
  <p class="sub">Un limiteur, c'est le maillon qui freine ta performance aujourd'hui. Le travailler rapporte plus que d'entretenir ce que tu sais déjà faire.</p>
  ${d.limiters.length ? d.limiters.map(limiterCard).join("") : `<div class="bp-card"><em style="color:${C.muted}">Aucun limiteur dominant détecté : profil équilibré pour cet objectif.</em></div>`}

  <!-- 3. LEVIERS -->
  <h2 class="sec">3 · Ce qu'on va travailler</h2>
  <p class="sub">À chaque limiteur correspond un levier d'entraînement précis, avec des séances types et les adaptations physiologiques attendues.</p>
  <div class="grid2">${d.levers.map(leverCard).join("")}</div>

  ${
    d.decision
      ? `<div class="bp-card avoid" style="margin-top:12px">
          <div style="font-size:14px;font-weight:600;color:${C.ink}">Bloc recommandé maintenant : ${esc(d.decision.block)} (${d.decision.durationWeeks} semaines)</div>
          <div style="font-size:11.5px;color:${C.muted};margin-top:6px;line-height:1.55">${rich(d.decision.athleteMessage)}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:12px;font-size:10.5px">
            <div><div style="font-weight:600;color:${C.ink};margin-bottom:3px">Séances clés</div><ul style="margin:0;padding-left:15px;color:${C.muted}">${d.decision.workouts.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>
            <div><div style="font-weight:600;color:${C.ink};margin-bottom:3px">Cibles physiologiques</div><ul style="margin:0;padding-left:15px;color:${C.muted}">${d.decision.physiologicalTargets.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>
            <div><div style="font-weight:600;color:${C.danger};margin-bottom:3px">À éviter pendant ce bloc</div><ul style="margin:0;padding-left:15px;color:${C.muted}">${d.decision.prohibitions.map((p) => `<li>${esc(p)}</li>`).join("")}</ul></div>
          </div>
        </div>`
      : ""
  }

  <!-- 4. PLANIFICATION -->
  ${
    d.roadmap
      ? `<div class="page-break"></div>
        <h2 class="sec">4 · Le schéma de planification</h2>
        <p class="sub">${esc(d.roadmap.title)} — ${d.roadmap.totalWeeks} semaines. ${d.roadmap.personalized ? "Périodisation adaptée à tes limiteurs." : "Périodisation de référence pour ton objectif."}</p>
        <div class="bp-card avoid">
          ${d.roadmap.limiterSummary ? `<div style="font-size:11px;color:${C.primary};background:${C.primarySoft};border-radius:8px;padding:8px 10px;margin-bottom:12px">${rich(d.roadmap.limiterSummary)}</div>` : ""}
          ${roadmapSVG(d.roadmap)}
        </div>
        <div>
          ${d.roadmap.phases
            .map((p, i, arr) => {
              const ped = buildPhasePedagogy(p, arr.length);
              return `<div class="bp-card avoid" style="margin-top:12px;border-left:4px solid ${p.color}">
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="width:12px;height:12px;border-radius:4px;background:${p.color};display:inline-block"></span>
                  <span style="font-size:13.5px;font-weight:700;color:${C.ink}">Bloc ${p.id} · ${esc(p.name)}</span>
                  <span style="font-size:10px;color:${C.faint}">S${p.startWeek}–S${p.endWeek} · ${Math.max(1, p.endWeek - p.startWeek + 1)} sem.</span>
                </div>
                <div style="font-size:11px;color:${C.muted};margin-top:6px;line-height:1.5">${rich(p.focus)}</div>

                <div style="margin-top:10px;font-size:11px;color:${C.inkSoft};line-height:1.6">
                  <div style="font-weight:600;color:${C.ink};margin-bottom:3px">Pourquoi ce bloc ?</div>
                  ${rich(ped.why)}
                </div>

                <div style="margin-top:10px;font-size:11px;color:${C.inkSoft};line-height:1.6">
                  <div style="font-weight:600;color:${C.ink};margin-bottom:3px">Comment on va le travailler</div>
                  <ul style="margin:0;padding-left:16px">${ped.how.map((h) => `<li style="margin-bottom:4px">${rich(h)}</li>`).join("")}</ul>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
                  <div style="background:${C.primarySoft};border-radius:8px;padding:8px 10px;font-size:10.5px;color:${C.inkSoft};line-height:1.55">
                    <div style="font-weight:600;color:${C.primary};margin-bottom:2px">Ce que tu dois ressentir</div>${rich(ped.feel)}
                  </div>
                  <div style="background:#fef2f2;border-radius:8px;padding:8px 10px;font-size:10.5px;color:${C.inkSoft};line-height:1.55">
                    <div style="font-weight:600;color:${C.danger};margin-bottom:2px">L'erreur à éviter</div>${rich(ped.pitfall)}
                  </div>
                </div>

                ${p.levers.length ? `<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:4px">${p.levers.map((l) => `<span class="bp-badge bp-badge--muted">${esc(l)}</span>`).join("")}</div>` : ""}
                ${p.targets.length ? `<div style="margin-top:8px;font-size:10px;color:${C.primary}">${p.targets.map((t) => `<div>→ ${esc(t)}</div>`).join("")}</div>` : ""}
              </div>`;
            })
            .join("")}
        </div>`

      : ""
  }

  <!-- 5. ZONES -->
  ${
    d.zoneSets.length
      ? `<div class="page-break"></div>
         <h2 class="sec">5 · Tes zones d'entraînement</h2>
         <p class="sub">Ces zones sont ancrées sur ta physiologie (seuil, FatMax, VO₂max) et non sur une grille générique. Ce sont elles qui pilotent tes séances.</p>
         ${d.zoneSets.map(zoneTable).join("")}`
      : ""
  }

  <!-- 6. PROCHAINES ÉTAPES -->
  ${
    d.nextSteps.length
      ? `<div class="bp-card avoid">
          <div style="font-size:14px;font-weight:600;color:${C.ink};margin-bottom:8px">6 · Tes prochaines étapes</div>
          <ol style="margin:0;padding-left:18px;font-size:11.5px;color:${C.inkSoft};line-height:1.7">${d.nextSteps.map((s) => `<li>${rich(s)}</li>`).join("")}</ol>
        </div>`
      : ""
  }

  <!-- GLOSSAIRE -->
  ${
    d.glossary.length
      ? `<div class="bp-card avoid">
          <div style="font-size:14px;font-weight:600;color:${C.ink};margin-bottom:8px">Petit glossaire</div>
          <div class="grid2" style="gap:8px">
            ${d.glossary
              .map(
                (g) => `<div style="font-size:10.5px;line-height:1.5">
                  <span style="font-weight:600;color:${C.ink}">${esc(g.term)}</span> — <span style="color:${C.muted}">${esc(g.definition)}</span>
                </div>`,
              )
              .join("")}
          </div>
        </div>`
      : ""
  }

  <div style="margin-top:18px;padding-top:12px;border-top:1px solid ${C.line};font-size:9.5px;color:${C.faint};text-align:center">
    Généré le ${esc(d.generatedAt)} — TFC Lab • Potentiel Physiologique TFCL™.
    Les valeurs estimées sont des modèles physiologiques, pas des mesures de laboratoire : elles s'affinent à chaque test.
  </div>
</div>
</body>
</html>`;

  return applyBevelPrintTheme(html);
}
