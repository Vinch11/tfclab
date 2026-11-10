/**
 * Ligne du temps physiologique d'un plan généré.
 * Modèle pur (aucun calcul inventé) + rendu SVG partagé par l'écran,
 * l'impression et les exports. Domaines = doctrine TFCL (LT1 → MLSS → VO₂max).
 */
import type { ParsedPlan, ParsedSession } from "@/lib/aiPlanParser";
import type { MetabolicDomain } from "@/lib/zones/tfclDoctrine";

export type TimelineDomain = Extract<MetabolicDomain, "moderate" | "heavy" | "severe"> | "strength" | "unclassified";

export interface TimelineWeek {
  weekNumber: number;
  phase: string;
  volumeMin: number | null;
  domains: Record<TimelineDomain, number>; // minutes
  keySessions: number;
  isRecovery: boolean;
  isRace: boolean;
}

const RACE_RE = /\b(course\s+[abc]\b|race|compétition|competition|jour\s+j|objectif\s+[abc]\b|🏁)/i;
const RECOVERY_RE = /(décharge|decharge|récupération|recuperation|deload|recovery|affûtage|affutage|taper)/i;

export function classifySession(s: ParsedSession): TimelineDomain {
  if (/strength|force|renfo/i.test(s.sport)) return "strength";
  const zones = (s.zones ?? []).map((z) => z.toUpperCase());
  if (zones.length) {
    if (zones.some((z) => /^Z(4B|5|6|7)/.test(z))) return "severe";
    if (zones.some((z) => /^Z(3|4A|4)/.test(z))) return "heavy";
    if (zones.some((z) => /^Z(1|2)/.test(z))) return "moderate";
  }
  const t = `${s.title} ${s.details}`;
  if (/(vo2|vo₂|vma|tabata|sprint|pma|map\b|\bz5\b|anaérob|anaerob)/i.test(t)) return "severe";
  if (/(seuil|threshold|tempo|mlss|sous-seuil|sweet|\bz3\b|\bz4|allure\s+(semi|marathon|course)|race[- ]pace)/i.test(t)) return "heavy";
  if (/(endurance|footing|fondamental|easy|facile|récup|recup|lt1|\bz1\b|\bz2\b|technique|long)/i.test(t)) return "moderate";
  return "unclassified";
}

export function buildPlanTimeline(plan: ParsedPlan): TimelineWeek[] {
  const weeks = [...plan.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  const out: TimelineWeek[] = weeks.map((w) => {
    const domains: Record<TimelineDomain, number> = { moderate: 0, heavy: 0, severe: 0, strength: 0, unclassified: 0 };
    let known = 0;
    let keys = 0;
    let race = RACE_RE.test(w.theme);
    for (const s of w.sessions) {
      if (s.isRest) continue;
      if (s.isKeySession) keys++;
      if (RACE_RE.test(s.title)) race = true;
      const d = typeof s.durationMin === "number" && s.durationMin > 0 ? s.durationMin : 0;
      if (d > 0) { domains[classifySession(s)] += d; known += d; }
    }
    const vol = w.computedVolumeMin ?? (known > 0 ? known : null);
    return {
      weekNumber: w.weekNumber,
      phase: w.phase,
      volumeMin: vol,
      domains,
      keySessions: keys,
      isRecovery: RECOVERY_RE.test(`${w.theme} ${w.phase}`),
      isRace: race,
    };
  });
  // Semaine allégée détectée par le volume (≥ 25 % sous la moyenne des 3 précédentes).
  out.forEach((w, i) => {
    if (w.isRecovery || w.volumeMin == null || i < 3) return;
    const prev = out.slice(i - 3, i).map((p) => p.volumeMin).filter((v): v is number => v != null);
    if (prev.length === 3) {
      const avg = prev.reduce((a, b) => a + b, 0) / 3;
      if (avg > 0 && w.volumeMin <= avg * 0.75) w.isRecovery = true;
    }
  });
  return out;
}

export interface TimelinePalette {
  text: string; muted: string; grid: string; bg: string;
  moderate: string; heavy: string; severe: string; strength: string; unclassified: string;
  recovery: string; race: string; phases: string[];
}

export const PRINT_TIMELINE_PALETTE: TimelinePalette = {
  text: "#14131A", muted: "#6E6B78", grid: "#E7E4DC", bg: "#FFFFFF",
  moderate: "#1F9D6B", heavy: "#D4711C", severe: "#D0433A", strength: "#5C5966", unclassified: "#C9C5BB",
  recovery: "#5555E0", race: "#14131A",
  phases: ["#EDEDFC", "#E6F4EE", "#FCEFE3", "#FBE7E5", "#F2F0E9", "#E8F0FE"],
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const fmtH = (m: number) => `${Math.floor(m / 60)}h${String(Math.round(m % 60)).padStart(2, "0")}`;

export const DOMAIN_LABELS: Record<TimelineDomain, string> = {
  moderate: "Modéré (< LT1)",
  heavy: "Lourd (LT1 → MLSS)",
  severe: "Sévère (> MLSS, VO₂max)",
  strength: "Renforcement",
  unclassified: "Non classé",
};

/** SVG autonome (largeur fixe en viewBox, redimensionnable). */
export function renderPlanTimelineSVG(
  plan: ParsedPlan,
  opts: { palette?: TimelinePalette; startDate?: Date; displayPhase?: (p: string) => string } = {},
): string {
  const P = opts.palette ?? PRINT_TIMELINE_PALETTE;
  const weeks = buildPlanTimeline(plan);
  if (weeks.length === 0) return "";
  const dp = opts.displayPhase ?? ((p: string) => p);
  const W = 1000, padL = 44, padR = 12, top = 34, barH = 150, phaseH = 22;
  const n = weeks.length;
  const colW = (W - padL - padR) / n;
  const maxVol = Math.max(1, ...weeks.map((w) => w.volumeMin ?? 0));
  const yBase = top + barH;
  const H = yBase + phaseH + 44;
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Ligne du temps physiologique du plan" style="font-family:-apple-system,'Segoe UI',sans-serif;background:${P.bg}">`);
  // grille volume
  for (let i = 0; i <= 4; i++) {
    const y = yBase - (barH * i) / 4;
    parts.push(`<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="${P.grid}" stroke-width="1"/>`);
    parts.push(`<text x="${padL - 6}" y="${y + 3}" font-size="9" text-anchor="end" fill="${P.muted}">${fmtH((maxVol * i) / 4)}</text>`);
  }
  parts.push(`<text x="${padL}" y="14" font-size="11" font-weight="700" fill="${P.text}">Volume hebdomadaire et domaines d'intensité</text>`);
  const order: TimelineDomain[] = ["moderate", "heavy", "severe", "strength", "unclassified"];
  weeks.forEach((w, i) => {
    const x = padL + i * colW;
    const bw = Math.max(2, colW * 0.72);
    const bx = x + (colW - bw) / 2;
    if (w.isRecovery) parts.push(`<rect x="${x}" y="${top}" width="${colW}" height="${barH}" fill="${P.recovery}" opacity="0.07"/>`);
    const total = order.reduce((a, d) => a + w.domains[d], 0);
    const vol = w.volumeMin ?? 0;
    const barTotal = (vol / maxVol) * barH;
    let y = yBase;
    if (total > 0) {
      for (const d of order) {
        const h = (w.domains[d] / total) * barTotal;
        if (h <= 0) continue;
        y -= h;
        parts.push(`<rect x="${bx}" y="${y}" width="${bw}" height="${h}" fill="${P[d]}"><title>S${w.weekNumber} · ${DOMAIN_LABELS[d]} : ${fmtH(w.domains[d])}</title></rect>`);
      }
    } else if (vol > 0) {
      y -= barTotal;
      parts.push(`<rect x="${bx}" y="${y}" width="${bw}" height="${barTotal}" fill="${P.unclassified}"/>`);
    }
    if (w.isRace) parts.push(`<text x="${x + colW / 2}" y="${Math.min(y, yBase) - 4}" font-size="12" text-anchor="middle" fill="${P.race}">🏁</text>`);
    else if (w.keySessions > 0) parts.push(`<circle cx="${x + colW / 2}" cy="${Math.min(y, yBase) - 6}" r="${Math.min(4, 1.5 + w.keySessions)}" fill="${P.severe}"><title>${w.keySessions} séance(s) clé(s)</title></circle>`);
    if (n <= 40 || w.weekNumber % 2 === 1) parts.push(`<text x="${x + colW / 2}" y="${yBase + phaseH + 13}" font-size="8.5" text-anchor="middle" fill="${P.muted}">S${w.weekNumber}</text>`);
  });
  // bande de phases (segments contigus)
  let segStart = 0, pi = 0;
  for (let i = 1; i <= n; i++) {
    if (i === n || weeks[i].phase !== weeks[segStart].phase) {
      const x = padL + segStart * colW, w = (i - segStart) * colW;
      const label = dp(weeks[segStart].phase);
      parts.push(`<rect x="${x + 0.5}" y="${yBase + 2}" width="${w - 1}" height="${phaseH - 4}" rx="4" fill="${P.phases[pi % P.phases.length]}" stroke="${P.grid}"/>`);
      if (w > 34) parts.push(`<text x="${x + w / 2}" y="${yBase + phaseH / 2 + 3}" font-size="9" font-weight="600" text-anchor="middle" fill="${P.text}">${esc(label.length > w / 5.5 ? label.slice(0, Math.max(3, Math.floor(w / 5.5) - 1)) + "…" : label)}</text>`);
      segStart = i; pi++;
    }
  }
  // légende
  const legend: [string, string][] = [
    [P.moderate, DOMAIN_LABELS.moderate], [P.heavy, DOMAIN_LABELS.heavy], [P.severe, DOMAIN_LABELS.severe],
    [P.strength, DOMAIN_LABELS.strength], [P.unclassified, DOMAIN_LABELS.unclassified],
  ];
  let lx = padL;
  const ly = H - 10;
  legend.forEach(([c, l]) => {
    parts.push(`<rect x="${lx}" y="${ly - 8}" width="9" height="9" rx="2" fill="${c}"/><text x="${lx + 13}" y="${ly}" font-size="9" fill="${P.text}">${esc(l)}</text>`);
    lx += 22 + l.length * 4.9;
  });
  parts.push(`<rect x="${lx}" y="${ly - 8}" width="9" height="9" fill="${P.recovery}" opacity="0.25"/><text x="${lx + 13}" y="${ly}" font-size="9" fill="${P.text}">Semaine allégée</text>`);
  lx += 95;
  parts.push(`<text x="${lx}" y="${ly}" font-size="9" fill="${P.text}">🏁 course  ● séance clé</text>`);
  parts.push(`</svg>`);
  return parts.join("");
}

/** Bloc HTML imprimable (titre + SVG + note méthodo). */
export function renderPlanTimelineHTML(plan: ParsedPlan, displayPhase?: (p: string) => string): string {
  const svg = renderPlanTimelineSVG(plan, { displayPhase });
  if (!svg) return "";
  return `<section class="keep-together plan-timeline" style="margin:0 0 20px 0;padding:12px 14px;border:1px solid #DAD6CC;border-radius:8px;background:#fff;page-break-inside:avoid;break-inside:avoid;">
  <h2 style="margin:0 0 8px 0;">Ligne du temps physiologique</h2>
  ${svg}
  <p style="margin:6px 0 0 0;font-size:9.5px;color:#6E6B78;">Hauteur = volume prévu ; couleurs = répartition du temps par domaine métabolique (doctrine TFCL : LT1 → MLSS → VO₂max). Séances sans durée ou sans intensité identifiable : non classées, aucune valeur inventée.</p>
</section>`;
}
