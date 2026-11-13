/**
 * Rapport Profil Athlète — HTML imprimable (A4), design partagé `reportKit`
 * (même charte que le Rapport de Performance : page de garde sombre, pages A4
 * paginées, cartes blanches, KPI, tableaux hairline, pastilles de statut).
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

import { insight, personalMarkers, sportPhoto, sportTransition, ATHLETE_VISUAL_CSS, STORY_CSS, storyRail } from "@/lib/reportKit/story";
import { RK, coverPage, esc, num, reportDocument, rich } from "@/lib/reportKit";
import type {
  AthleteProfileReportInput,
  ReportLimiter,
  ReportLever,
  ReportMetric,
  ReportRadarAxis,
  ReportTargetProgress,
  ReportZoneSet,
} from "./types";
import { metricSourceLabel } from '../coachingCompass/presentation';

const STATUS_COLOR: Record<string, string> = {
  ok: RK.mint,
  warn: RK.amber,
  bad: RK.danger,
  missing: RK.faint,
};
const STATUS_PILL: Record<string, string> = {
  ok: "ok",
  warn: "mid",
  bad: "bad",
  missing: "na",
};
const STATUS_LABEL: Record<string, string> = {
  ok: "Dans la cible",
  warn: "À surveiller",
  bad: "Point faible",
  missing: "Données insuffisantes",
};

const EXTRA_CSS = `
  .page.flow { height:auto; overflow:visible; padding-bottom:18mm; }
  .foot--static { position:static; left:auto; right:auto; bottom:auto; margin-top:14px; }
  .sec-head { margin-bottom:10px; }
  .metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
  .limiter-card { border-left:4px solid ${RK.primary}; }
  .roadmap-row { display:grid; grid-template-columns:minmax(150px,32%) 1fr; gap:12px; align-items:center; margin:0 0 12px; break-inside:avoid; }
  .roadmap-label strong { display:block; font-size:11.5px; color:${RK.ink}; }
  .roadmap-label strong span { display:inline-block; width:9px; height:9px; border-radius:3px; margin-right:6px; }
  .roadmap-label small { display:block; font-size:9.5px; color:${RK.muted}; margin:3px 0 0 15px; }
  .roadmap-track { position:relative; height:22px; border-radius:7px; background:${RK.surfaceAlt}; overflow:hidden; }
  .roadmap-bar { position:absolute; top:4px; bottom:4px; border-radius:5px; min-width:6px; }
  .roadmap-axis { position:relative; height:16px; margin-left:calc(32% + 12px); border-top:1px solid ${RK.line}; }
  .roadmap-tick { position:absolute; top:2px; transform:translateX(-50%); font-size:9px; color:${RK.faint}; white-space:nowrap; }
  ul.tight { margin:0; padding-left:16px; font-size:11px; line-height:1.55; color:${RK.body}; }
  @media screen and (max-width:800px) {
    .page { width:100%; min-height:0; padding:24px 18px; }
    .metrics, .grid2, .grid3 { grid-template-columns:1fr !important; }
    table { display:block; overflow-x:auto; max-width:100%; }
    .foot { flex-wrap:wrap; gap:8px; }
    .roadmap-row { grid-template-columns:1fr; }
  }
`;

function foot(d: AthleteProfileReportInput, label: string): string {
  return `<div class="foot foot--static"><span>TFC Lab · Potentiel Physiologique TFCL™ — ${esc(d.athleteName)}</span><span>${esc(d.generatedAt)} · ${esc(label)}</span></div>`;
}

// ── charts ─────────────────────────────────────────────────────────────────

/** Radar 4-5 axes (grille pointillée, remplissage périwinkle). */
function radarSVG(axes: ReportRadarAxis[]): string {
  if (axes.length < 3) return "";
  const size = 340;
  const padX = 56;
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
      return `<polygon points="${pts}" fill="none" stroke="${RK.line}" stroke-width="0.8" stroke-dasharray="2 5" />`;
    })
    .join("");

  const spokes = axes
    .map((_, i) => {
      const [x, y] = pt(i, R);
      return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${RK.line}" stroke-width="0.8" />`;
    })
    .join("");

  const valuePts = axes
    .map((a, i) => {
      const r = (Math.max(0, Math.min(100, a.score)) / 100) * R;
      const [x, y] = pt(i, r);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const comparable = (a: ReportRadarAxis) => a.value != null && a.value > 0 && a.target != null && a.target > 0;

  const dots = axes
    .map((a, i) => {
      if (!comparable(a)) return '';
      const r = (Math.max(0, Math.min(100, a.score)) / 100) * R;
      const [x, y] = pt(i, r);
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.4" fill="${RK.primary}" stroke="#fff" stroke-width="1.2" />`;
    })
    .join("");

  const labels = axes
    .map((a, i) => {
      const [x, y] = pt(i, R + 26);
      const anchor = Math.abs(x - cx) < 12 ? "middle" : x > cx ? "start" : "end";
      return `
        <text x="${x.toFixed(1)}" y="${(y - 2).toFixed(1)}" text-anchor="${anchor}" font-size="11" font-weight="600" fill="${RK.ink}">${esc(a.shortLabel)}</text>
        <text x="${x.toFixed(1)}" y="${(y + 11).toFixed(1)}" text-anchor="${anchor}" font-size="10" fill="${RK.muted}">${comparable(a) ? `${Math.round(a.score)}/100` : a.value != null && a.value > 0 ? `${num(a.value, 1)} ${esc(a.unit)}` : "—"}</text>`;
    })
    .join("");

  return `
  <svg viewBox="0 0 ${size + padX * 2} ${size + 16}" width="100%" style="max-width:420px;display:block;margin:0 auto" xmlns="http://www.w3.org/2000/svg">
    ${rings}${spokes}
    ${axes.every(comparable) ? `<polygon points="${valuePts}" fill="${RK.primary}22" stroke="${RK.primary}" stroke-width="2" stroke-linejoin="round" />` : ''}
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
    ? `<rect x="${p(m.target[0]).toFixed(2)}" y="3" width="${Math.max(1, p(m.target[1]) - p(m.target[0])).toFixed(2)}" height="10" fill="${RK.mintSoft}" stroke="${RK.mint}" stroke-width="0.4" rx="1.5" />`
    : "";
  return `
    <svg viewBox="0 0 100 16" preserveAspectRatio="none" style="width:100%;height:20px;display:block;margin-top:6px">
      <rect x="0" y="3" width="100" height="10" fill="${RK.surfaceAlt}" rx="2" />
      ${band}
      <line x1="${v.toFixed(2)}" y1="0" x2="${v.toFixed(2)}" y2="16" stroke="${RK.ink}" stroke-width="0.9" />
    </svg>
    <div style="display:flex;justify-content:space-between;align-items:center;font-size:8.5px;color:${RK.faint};margin-top:3px;gap:6px">
      <span>${num(sMin, 0)}</span>
      ${m.target ? `<span style="color:${RK.mint};font-weight:600;white-space:nowrap">cible ${num(m.target[0], m.decimals ?? 1)}–${num(m.target[1], m.decimals ?? 1)}</span>` : ""}
      <span>${num(sMax, 0)}</span>
    </div>`;
}

function progressBar(t: ReportTargetProgress): string {
  const pct = t.progress == null ? 0 : Math.max(0, Math.min(100, t.progress));
  const color = t.reached ? RK.mint : pct >= 70 ? RK.amber : RK.primary;
  return `
  <div style="margin-bottom:11px">
    <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:11.5px">
      <span style="color:${RK.inkSoft};font-weight:600">${esc(t.label)}</span>
      <span style="color:${RK.muted}">
        ${t.current == null ? "—" : `<strong style="color:${RK.ink}">${num(t.current, t.decimals ?? 1)}</strong>`}
        ${t.target == null ? "" : ` / ${num(t.target, t.decimals ?? 1)} ${esc(t.unit)}`}
      </span>
    </div>
    <div class="bar" style="height:8px;border-radius:999px"><span style="width:${pct.toFixed(1)}%;background:${color}"></span></div>
    <div style="font-size:9px;color:${t.reached ? RK.mint : RK.faint};margin-top:3px">
      ${t.target == null ? "Comparaison non définie" : t.current == null || t.current <= 0 ? "Donnée manquante" : t.reached ? "✓ Cible interne atteinte" : `${Math.round(pct)} % de la cible interne — pas une progression mesurée`}
    </div>
  </div>`;
}

// ── blocs ──────────────────────────────────────────────────────────────────

function metricCard(m: ReportMetric): string {
  const color = STATUS_COLOR[m.status] ?? RK.faint;
  const insufficient = m.value == null || m.value === 0 || m.status === "missing";
  return `
  <div class="card avoid" style="padding:12px 13px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
      <div style="flex:1;font-size:11px;font-weight:600;color:${RK.inkSoft};line-height:1.35">${esc(m.label)}</div>
      <span class="pill ${STATUS_PILL[m.status] ?? "na"}">${esc(STATUS_LABEL[m.status])}</span>
    </div>
    <div style="margin-top:6px;font-size:23px;font-weight:600;letter-spacing:-0.02em;color:${insufficient ? RK.faint : RK.ink}">
      ${insufficient ? `<span style="font-size:12.5px;font-style:italic">Données insuffisantes</span>` : `${num(m.value, m.decimals ?? 1)}<span style="font-size:11px;color:${RK.muted};font-weight:500"> ${esc(m.unit)}</span>`}
    </div>
    ${insufficient ? "" : gaugeSVG(m)}
    <div style="margin-top:8px;font-size:10.3px;color:${RK.muted};line-height:1.45">${rich(m.meaning)}</div>
    ${m.source ? `<div style="margin-top:5px;font-size:9px;color:${RK.faint}">Source : ${esc(metricSourceLabel(m.source))}</div>` : ""}
    <div style="height:2px;background:${color}22;border-radius:2px;margin-top:8px"></div>
  </div>`;
}

function limiterCard(l: ReportLimiter): string {
  const color = l.rank === 1 ? RK.danger : RK.amber;
  return `
  <div class="card avoid limiter-card" style="border-left-color:${color}">
    <div style="display:flex;align-items:center;gap:10px">
      <div style="width:30px;height:30px;border-radius:9px;background:${color}1a;color:${color};display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px">${l.rank}</div>
      <div style="flex:1">
        <div style="font-size:14.5px;font-weight:600;color:${RK.ink}">${esc(l.emoji)} ${esc(l.title)}</div>
        <div style="font-size:10px;color:${color};font-weight:600;margin-top:1px">Sévérité : ${esc(l.severityLabel)} · poids ${Math.round(l.impact)}/100</div>
      </div>
    </div>
    <div class="bar" style="height:7px;border-radius:999px;margin:10px 0 12px"><span style="width:${Math.max(4, Math.min(100, l.impact)).toFixed(0)}%;background:${color}"></span></div>
    <div class="grid2" style="font-size:11px;line-height:1.5">
      <div style="background:${RK.paper};border-radius:10px;padding:10px 12px">
        <div style="font-weight:600;color:${RK.ink};margin-bottom:3px">Ce que tu ressens</div>
        <div style="color:${RK.muted}">${rich(l.fieldFeeling)}</div>
      </div>
      <div style="background:${RK.paper};border-radius:10px;padding:10px 12px">
        <div style="font-weight:600;color:${RK.ink};margin-bottom:3px">Ce qui se passe dans ton corps</div>
        <div style="color:${RK.muted}">${rich(l.mechanism)}</div>
      </div>
    </div>
    ${
      l.evidence.length
        ? `<div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:5px">${l.evidence
            .map((e) => `<span class="pill na">${esc(e)}</span>`)
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
  <div class="card avoid">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="font-size:17px">${esc(l.emoji)}</span>
      <div style="font-size:13.5px;font-weight:600;color:${RK.ink};flex:1">${esc(l.title)}</div>
      <span class="pill info">Priorité ${l.priority}</span>
    </div>
    <div style="font-size:11.2px;color:${RK.muted};line-height:1.55">${rich(desc)}</div>
    ${
      hasWorkouts
        ? `<div style="margin-top:10px;background:${RK.paper};border-radius:10px;padding:9px 11px">
            <div style="font-size:9.6px;font-weight:600;color:${RK.ink};text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Séances types</div>
            <ul class="tight">${l.workouts.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>
          </div>`
        : ""
    }
    ${
      hasAdaptations
        ? `<div style="margin-top:8px">
            <div style="font-size:9.6px;font-weight:600;color:${RK.ink};text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Adaptations attendues</div>
            <div style="display:flex;flex-wrap:wrap;gap:5px">${l.adaptations.map((a) => `<span class="pill ok">${esc(a)}</span>`).join("")}</div>
          </div>`
        : ""
    }
    ${
      !hasWorkouts && !hasAdaptations
        ? `<div style="margin-top:10px;font-size:10.3px;color:${RK.faint};background:${RK.paper};border-radius:10px;padding:8px 10px;line-height:1.5">
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
        <td style="font-weight:600;color:${RK.primary}">${esc(r.id)}</td>
        <td>${esc(r.label)}<div style="font-size:9.5px;color:${RK.faint}">${esc(r.condition)}</div></td>
        <td>${esc(r.pctRef)}<div style="font-size:9px;color:${RK.faint}">${esc(r.refLabel)}</div></td>
        <td style="font-weight:600">${r.absolute ? esc(r.absolute) : "—"}</td>
        <td>${r.hrPct ? `<span style="font-weight:600">${esc(r.hrPct)}</span><div style="font-size:9px;color:${RK.faint}">de ta FC max</div>` : "—"}</td>
        <td>${r.heartRate ? esc(r.heartRate) : "—"}</td>
      </tr>`,
    )
    .join("");

  return `
  <div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <h3 style="margin:0">${esc(z.sportLabel)}</h3>
      <span class="pill ${z.source === "derived" ? "ok" : "na"}">
        ${z.source === "derived" ? "Calculées sur tes tests" : "Repères provisoires, à affiner au prochain test"}
      </span>
    </div>
    <table>
      <thead><tr><th>Zone</th><th>Intention</th><th>%</th><th>Valeur</th><th>% FC max</th><th>FC (bpm)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// ── document ───────────────────────────────────────────────────────────────

export function buildAthleteProfileReportHTML(d: AthleteProfileReportInput): string {
  const readinessColor =
    d.readiness.score >= 70 ? RK.mint : d.readiness.score >= 45 ? RK.amber : RK.danger;

  const cover = coverPage({
    eyebrow: "Rapport profil physiologique",
    title: d.athleteName,
    intro:
      "Ton profil, tes repères dans chaque sport et les priorités pour avancer vers ton objectif.",
    identity: [
      { label: "Objectif", value: d.objectifLabel },
      { label: "Ambition", value: d.ambitionLabel },
      { label: "Âge", value: d.age != null ? `${d.age} ans` : "—" },
      { label: "Bilan du", value: d.snapshotDate ?? "—" },

      { label: "Statut", value: "Diagnostic — pas une prédiction de résultat" },
    ],
    footnote: `Généré le ${d.generatedAt}. Les valeurs estimées s'affinent à chaque test réalisé.`,
    logoBase64: d.logoBase64,
  });

  const BIKE_KEYS = new Set(['ftpkg', 'fatmax']);
  const RUN_KEYS = new Set(['vma']);
  const hasSportTte = (d.sportTte ?? []).length > 0;
  const available = (m: ReportMetric) => m.value != null && Number.isFinite(m.value) && m.value > 0 && m.status !== "missing";
  const sharedMetrics = d.metrics.filter(m => available(m) && !BIKE_KEYS.has(m.key) && !RUN_KEYS.has(m.key) && !(hasSportTte && m.key === 'tte'));
  const storySports = ((Object.keys(d.evolutionBySport ?? {}).length ? Object.keys(d.evolutionBySport ?? {}) : Object.keys(d.durabilityBySport ?? {})) as Array<'bike' | 'run'>);
  const isSport = (sp: 'bike' | 'run', label: string) => sp === 'bike' ? /v[ée]lo|bike|cycl/i.test(label) : /course|run/i.test(label);
  const SPORT_TEXT = {
    bike: { eyebrow: 'Vélo · où tu en es', title: 'Ton vélo en chiffres', lead: 'À vélo, tout se lit en watts : ta puissance au seuil, ce que tu tiens en fin de sortie et les zones qui règlent tes séances sur le home-trainer ou la route.', tte: 'Temps tenu au seuil vélo', zones: 'Tes zones vélo', zonesLead: 'Chaque zone se règle en watts, avec le cardio en contrôle. Elles viennent de ton seuil vélo, pas de ta course.', shows: (n: number) => n ? 'Ces repères décrivent ton moteur sur le vélo uniquement.' : 'Peu de repères vélo enregistrés : un test de puissance les complétera.', changes: 'Tes séances vélo se règlent sur ces watts ; aucun chiffre de course ne vient les modifier.' },
    run: { eyebrow: 'Course · où tu en es', title: 'Ta course à pied en chiffres', lead: 'En course, on parle d’allure au kilomètre et de vitesse : ta VMA, ton allure seuil, ce que tu tiens en fin de sortie longue et les zones de tes séances sur piste, route ou chemin.', tte: 'Temps tenu à l’allure seuil', zones: 'Tes zones course', zonesLead: 'Chaque zone se règle en allure, avec le cardio en contrôle. Elles viennent de tes tests de course ; rien n’est converti depuis le vélo.', shows: (n: number) => n ? 'Ces repères décrivent ta course uniquement, sans watts vélo convertis.' : 'Peu de repères course enregistrés : un test sur piste les complétera.', changes: 'Tes fractionnés et tes sorties longues se règlent sur ces allures.' },
  } as const;
  const sportChapter = (sp: 'bike' | 'run', i: number) => {
    const t = SPORT_TEXT[sp];
    const metrics = d.metrics.filter(m => available(m) && (sp === 'bike' ? BIKE_KEYS : RUN_KEYS).has(m.key));
    const tte = (d.sportTte ?? []).filter(r => isSport(sp, r.label) && r.value > 0);
    const refs = (d.sportReferences ?? []).filter(r => r.sport === (sp === 'bike' ? 'cycling' : 'running') && r.value != null && r.value > 0);
    const zones = d.zoneSets.filter(z => isSport(sp, z.sportLabel));
    const rows = [...tte.map(r => `<tr><td>${t.tte}</td><td><strong>${r.value > 0 ? `${r.value} min` : 'Données insuffisantes'}</strong></td></tr>`),
      ...refs.map(r => `<tr><td>${esc(r.label)}</td><td><strong>${r.value != null ? `${r.value.toFixed(r.unit === 'kJ' || r.unit === 'km/h' ? 1 : 0)} ${esc(r.unit)}` : 'Données insuffisantes'}</strong></td></tr>`)];
    return `<section class="page flow">${sportTransition(sp, i, storySports.length)}
    ${storyRail(0)}
    <div class="eyebrow">${t.eyebrow}</div>
    <h1>${t.title}</h1>
    <p class="lead">${t.lead}</p>
    ${metrics.length ? personalMarkers(metrics.map(m => ({label:m.label, value:m.value, display:num(m.value,m.decimals ?? 1),unit:m.unit,target:m.target,scale:m.scale}))) : ''}
    ${rows.length ? `<div class="card avoid" style="margin-top:12px"><table><tbody>${rows.join('')}</tbody></table></div>` : ''}
    ${insight(t.shows(metrics.length + rows.length), t.changes)}
  ${zones.length ? `<h2 style="margin-top:18px">${t.zones}</h2><p class="lead">${t.zonesLead}</p>${zones.map(zoneTable).join('')}` : ''}
    ${d.durabilityBySport?.[sp] && !/Pas encore mesurée/.test(d.durabilityBySport[sp] ?? '') ? `<div style="margin-top:18px">${d.durabilityBySport[sp]}</div>` : ''}
    ${foot(d, t.title)}
  </section>`;
  };

  const pageProfil = `
  <section class="page flow">
    ${storyRail(0)}
    <div class="eyebrow">01 — Où tu en es</div>
    <h1>Ce que disent tes données</h1>
    <div class="note avoid" style="border-left-color:${readinessColor};margin-bottom:12px">${rich(d.readiness.message)}</div>

    <div class="card avoid">
      <div class="grid2" style="grid-template-columns:0.9fr 1.1fr;gap:18px;align-items:center">
        <div>
          ${radarSVG(d.radar.filter(a => a.value != null && a.value > 0))}
          <div style="font-size:9.5px;color:${RK.faint};text-align:center;margin-top:4px">Tes repères disponibles, comparés à tes cibles personnelles.</div>
        </div>
        <div>
          <div style="font-size:11.8px;line-height:1.65;color:${RK.inkSoft}">${rich(d.profileNarrative)}</div>
          ${
            d.economyAxis
              ? `<div style="margin-top:12px;background:${RK.paper};border-radius:10px;padding:10px 12px">
                  <div style="font-size:9.6px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:${RK.ink}">Économie (modulateur d'efficience)</div>
                  <div style="font-size:11.2px;color:${RK.muted};margin-top:3px">${esc(d.economyAxis.label)} : <strong style="color:${RK.ink}">${Math.round(d.economyAxis.score)}/100</strong> — l'économie affine le rendement mais n'est jamais un limiteur principal.</div>
                </div>`
              : ""
          }
        </div>
      </div>
    </div>

    ${sharedMetrics.length ? `<h2>Ton moteur commun</h2><p class="muted" style="margin:0 0 6px">Ces valeurs décrivent ton organisme en général ; les repères propres à chaque sport viennent dans leur chapitre.</p><div class="metrics">${sharedMetrics.map(m => metricCard({...m, source:null})).join("")}</div>` : ''}

    ${
      d.targetProgress.filter(t => t.current != null && t.current > 0 && t.target != null && t.target > 0).length
        ? `<div class="card avoid" style="margin-top:12px">
            <h3>Où tu en es par rapport à ta cible « ${esc(d.ambitionLabel)} »</h3>
            ${d.targetProgress.filter(t => t.current != null && t.current > 0 && t.target != null && t.target > 0).map(progressBar).join("")}
          </div>`
        : ""
    }
    ${foot(d, "Profil")}
  </section>`;

  const pageLimiteurs = `
  <section class="page flow">
    ${sportPhoto(storySports[0] ?? "run", true)}
    ${storyRail(1)}
    <div class="eyebrow">02 — Ce qui te freine</div>
    <h1>Ce qui te freine aujourd'hui</h1>
    <p class="lead">Un limiteur, c'est le maillon qui plafonne ta performance. Le travailler rapporte
    plus que d'entretenir ce que tu sais déjà faire.</p>
    ${
      d.limiters.length
        ? d.limiters.map(limiterCard).join("")
        : `<div class="card"><p class="muted" style="margin:0">Aucun limiteur dominant établi sur les données disponibles ; cela ne certifie pas une préparation complète.</p></div>`
    }
    ${d.limiters[0] ? insight(`${d.limiters[0].title} est aujourd'hui le maillon le plus limitant pour ton objectif. ${d.limiters[0].fieldFeeling}`, d.levers[0] ? `Le premier levier sera : ${d.levers[0].title.toLowerCase()}. Le reste est entretenu, pas abandonné.` : "Ton coach choisit l'ordre de travail à partir de ce constat.") : ""}
    ${foot(d, "Limiteurs")}
  </section>`;

  const pageLeviers = `
  <section class="page flow">
    ${storyRail(3)}
    <div class="eyebrow">03 — Ce que nous travaillons</div>
    <h1>Ce qu'on va travailler</h1>
    <p class="lead">À chaque limiteur correspond un levier d'entraînement précis, avec ses séances
    types et les adaptations physiologiques attendues.</p>
    <div class="grid2">${d.levers.map(leverCard).join("")}</div>
    ${foot(d, "Leviers")}
  </section>`;

  const pageZones = d.zoneSets.length
    ? `
  <section class="page flow">
    ${storyRail(3)}
    <div class="eyebrow">05 — Tes repères d'intensité</div>
    <h1>Tes zones, ancrées sur ta physiologie</h1>
    <p class="lead">Chaque tableau précise ses ancrages et distingue les zones dérivées de tes données des grilles de repli. Les allures et watts appartiennent au sport indiqué ; la fréquence cardiaque dépend aussi de la fatigue et des conditions.</p>
    ${d.zoneSets.map(zoneTable).join("")}
    ${foot(d, "Zones")}
  </section>`
    : "";

  const pageFinal = `
  <section class="page flow">
    ${storyRail(4)}
    <div class="eyebrow">07 — Prochaines étapes</div>
    <h1>Ce que tu fais maintenant</h1>
    ${
      d.nextSteps.length
        ? `<div class="card avoid"><ol style="margin:0;padding-left:18px;font-size:11.5px;color:${RK.body};line-height:1.7">${d.nextSteps.map((s) => `<li>${rich(s)}</li>`).join("")}</ol></div>`
        : `<div class="card"><p class="muted" style="margin:0">Aucune action complémentaire : suis ton plan tel qu'il est planifié.</p></div>`
    }
    ${
      d.glossary.length
        ? `<div class="card avoid" style="margin-top:12px">
            <h3>Petit glossaire</h3>
            <div class="grid2" style="gap:8px">
              ${d.glossary
                .map(
                  (g) => `<div style="font-size:10.5px;line-height:1.5">
                    <span style="font-weight:600;color:${RK.ink}">${esc(g.term)}</span> — <span style="color:${RK.muted}">${esc(g.definition)}</span>
                  </div>`,
                )
                .join("")}
            </div>
          </div>`
        : ""
    }
    <p class="muted" style="margin-top:12px;font-size:9.6px">
      Les valeurs estimées sont issues de modèles physiologiques, pas de mesures de laboratoire :
      elles s'affinent à chaque test réalisé. Ce rapport accompagne le plan d'entraînement, il ne
      le remplace pas.
    </p>
    ${foot(d, "Prochaines étapes")}
  </section>`;

  return reportDocument({
    title: `Mon profil physiologique — ${d.athleteName}`,
    extraCSS: STORY_CSS + EXTRA_CSS + ATHLETE_VISUAL_CSS,
    body: `${cover}${pageProfil}${pageLimiteurs}${storySports.length ? storySports.map(sportChapter).join('') : pageZones}${d.levers.length ? pageLeviers : ""}${pageFinal}`,
  });
}
