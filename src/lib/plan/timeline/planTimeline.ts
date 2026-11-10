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
  moderate: "Endurance facile (sous LT1)",
  heavy: "Tempo / seuil (LT1 → MLSS)",
  severe: "Intense (au-delà de la MLSS, VO₂max)",
  strength: "Renforcement",
  unclassified: "Intensité non précisée",
};

export interface TimelinePhaseRange { name: string; weeks: string; objective?: string }

interface PhaseSegment { label: string; start: number; end: number; objective?: string }

/** Segments de phases : plages déclarées du plan si disponibles, sinon phase de chaque semaine. */
export function buildPhaseSegments(weeks: TimelineWeek[], ranges?: TimelinePhaseRange[], dp: (p: string) => string = (p) => p): PhaseSegment[] {
  const parsed = (ranges ?? []).map((r): PhaseSegment | null => {
    const nums = (r.weeks || "").match(/\d+/g)?.map(Number) ?? [];
    if (!nums.length) return null;
    return { label: r.name.replace(/^(Phase|Bloc)\s*\d+\s*[:\-–—]\s*/i, ""), start: nums[0], end: Math.max(nums[1] ?? nums[0], nums[0]), objective: r.objective };
  }).filter((x): x is PhaseSegment => !!x).sort((a, b) => a.start - b.start);
  if (parsed.length >= 2) return parsed;
  const out: PhaseSegment[] = [];
  for (const w of weeks) {
    const last = out[out.length - 1];
    const label = dp(w.phase || "—");
    if (last && last.label === label && last.end === w.weekNumber - 1) last.end = w.weekNumber;
    else out.push({ label, start: w.weekNumber, end: w.weekNumber });
  }
  return out;
}

const fmtVol = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 >= 5 ? String(Math.round(m % 60)).padStart(2, "0") : ""}` : `${Math.round(m)}'`);
const clip = (t: string, px: number, fs: number) => { const max = Math.floor(px / (fs * 0.56)); return t.length <= max ? t : max <= 2 ? "" : t.slice(0, max - 1) + "…"; };

/**
 * SVG lisible : bande de phases (nom + semaines), barres hebdo empilées par
 * domaine avec le volume écrit au-dessus, repères course / semaine allégée,
 * numéros de semaine. Largeur en pixels réels (colonne ≥ 34 px) : le texte
 * n'est jamais réduit ; à l'écran le conteneur défile horizontalement.
 */
export function renderPlanTimelineSVG(
  plan: ParsedPlan,
  opts: { palette?: TimelinePalette; displayPhase?: (p: string) => string; phases?: TimelinePhaseRange[]; fluid?: boolean } = {},
): string {
  const P = opts.palette ?? PRINT_TIMELINE_PALETTE;
  const weeks = buildPlanTimeline(plan);
  if (weeks.length === 0) return "";
  const n = weeks.length;
  const colW = opts.fluid ? Math.max(20, 960 / n) : 38;
  const padL = 4, phaseTop = 4, phaseH = 40, barTop = phaseTop + phaseH + 26, barH = 130;
  const yBase = barTop + barH;
  const W = padL * 2 + n * colW, H = yBase + 40;
  const fs = opts.fluid ? 11 : 12;
  const first = weeks[0].weekNumber;
  const xOf = (wk: number) => padL + (wk - first) * colW;
  const maxVol = Math.max(1, ...weeks.map((w) => w.volumeMin ?? 0));
  const o: string[] = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" ${opts.fluid ? 'width="100%"' : `width="${W}" height="${H}"`} role="img" aria-label="Timeline de la périodisation" style="font-family:-apple-system,'Segoe UI',sans-serif;display:block">`);
  // Phases
  buildPhaseSegments(weeks, opts.phases, opts.displayPhase).forEach((seg, i) => {
    const s0 = Math.max(seg.start, first), e0 = Math.min(seg.end, first + n - 1);
    if (e0 < s0) return;
    const x = xOf(s0) + 1, w = (e0 - s0 + 1) * colW - 2;
    const span = seg.start === seg.end ? `S${seg.start}` : `S${seg.start}–S${seg.end}`;
    o.push(`<g><title>${esc(seg.label)} · ${span}${seg.objective ? " — " + esc(seg.objective) : ""}</title><rect x="${x}" y="${phaseTop}" width="${w}" height="${phaseH}" rx="6" fill="${P.phases[i % P.phases.length]}" stroke="${P.grid}"/>`);
    o.push(`<text x="${x + 7}" y="${phaseTop + 17}" font-size="${fs}" font-weight="700" fill="${P.text}">${esc(clip(seg.label, w - 12, fs))}</text>`);
    o.push(`<text x="${x + 7}" y="${phaseTop + 32}" font-size="${fs - 1}" fill="${P.muted}">${esc(clip(`${span} · ${seg.end - seg.start + 1} sem`, w - 12, fs - 1))}</text></g>`);
  });
  // Ligne de base
  o.push(`<line x1="${padL}" x2="${W - padL}" y1="${yBase}" y2="${yBase}" stroke="${P.grid}" stroke-width="1"/>`);
  const order: TimelineDomain[] = ["moderate", "heavy", "severe", "strength", "unclassified"];
  weeks.forEach((w) => {
    const x = xOf(w.weekNumber);
    const bw = colW * 0.66, bx = x + (colW - bw) / 2, cx = x + colW / 2;
    const vol = w.volumeMin ?? 0;
    const hTot = (vol / maxVol) * barH;
    const total = order.reduce((a, d) => a + w.domains[d], 0);
    const tip = [`Semaine ${w.weekNumber}${w.isRecovery ? " (allégée)" : ""}${w.isRace ? " — course" : ""}`, `Volume : ${vol ? fmtVol(vol) : "non précisé"}`,
      ...order.filter((d) => w.domains[d] > 0).map((d) => `${DOMAIN_LABELS[d]} : ${fmtVol(w.domains[d])}`), w.keySessions ? `${w.keySessions} séance(s) clé(s)` : ""].filter(Boolean).join("\n");
    o.push(`<g><title>${esc(tip)}</title><rect x="${x}" y="${barTop - 22}" width="${colW}" height="${barH + 22}" fill="transparent"/>`);
    let y = yBase;
    if (total > 0) for (const d of order) {
      const h = (w.domains[d] / total) * hTot; if (h <= 0) continue; y -= h;
      o.push(`<rect x="${bx}" y="${y}" width="${bw}" height="${h}" fill="${P[d]}" opacity="${w.isRecovery ? 0.45 : 1}"/>`);
    } else if (vol > 0) { y -= hTot; o.push(`<rect x="${bx}" y="${y}" width="${bw}" height="${hTot}" fill="${P.unclassified}"/>`); }
    const top = Math.min(y, yBase);
    if (vol > 0 && colW >= 28) o.push(`<text x="${cx}" y="${top - 5}" font-size="${fs - 2}" text-anchor="middle" fill="${P.muted}">${fmtVol(vol)}</text>`);
    if (w.isRace) o.push(`<text x="${cx}" y="${top - (colW >= 28 ? 19 : 5)}" font-size="${fs + 2}" text-anchor="middle">🏁</text>`);
    o.push(`<text x="${cx}" y="${yBase + 15}" font-size="${fs - 1}" font-weight="${w.isRace ? 700 : 500}" text-anchor="middle" fill="${P.text}">${n > 30 && colW < 28 && w.weekNumber % 2 === 0 ? "" : "S" + w.weekNumber}</text>`);
    if (w.isRecovery) o.push(`<text x="${cx}" y="${yBase + 30}" font-size="${fs - 2}" text-anchor="middle" fill="${P.recovery}">allégée</text>`.replace("allégée", colW >= 34 ? "allégée" : "↓"));
    else if (w.keySessions > 0) o.push(`<text x="${cx}" y="${yBase + 30}" font-size="${fs - 2}" text-anchor="middle" fill="${P.severe}">${"●".repeat(Math.min(3, w.keySessions))}</text>`);
    o.push(`</g>`);
  });
  o.push(`</svg>`);
  return o.join("");
}

/** Légende HTML (partagée écran / impression). */
export function timelineLegendItems(P: TimelinePalette = PRINT_TIMELINE_PALETTE): { color: string; label: string }[] {
  return (["moderate", "heavy", "severe", "strength", "unclassified"] as TimelineDomain[]).map((d) => ({ color: P[d], label: DOMAIN_LABELS[d] }));
}

/** Bloc HTML imprimable : version imprimée de la « Timeline de la périodisation ». */
export function renderPlanTimelineHTML(plan: ParsedPlan, displayPhase?: (p: string) => string): string {
  const svg = renderPlanTimelineSVG(plan, { displayPhase, phases: plan.phases?.length >= 2 ? plan.phases : undefined, fluid: true });
  if (!svg) return "";
  const legend = timelineLegendItems().map((l) => `<span style="display:inline-flex;align-items:center;gap:4px;margin-right:12px;white-space:nowrap;"><span style="width:10px;height:10px;border-radius:2px;background:${l.color};display:inline-block"></span>${esc(l.label)}</span>`).join("");
  return `<section class="keep-together plan-timeline" style="margin:0 0 20px 0;padding:12px 14px;border:1px solid #DAD6CC;border-radius:8px;background:#fff;page-break-inside:avoid;break-inside:avoid;">
  <h2 style="margin:0 0 8px 0;">Timeline de la périodisation</h2>
  ${svg}
  <div style="margin-top:8px;font-size:10px;color:#14131A;line-height:1.8;">${legend}<span style="margin-right:12px;white-space:nowrap;">🏁 course</span><span style="margin-right:12px;white-space:nowrap;color:#D0433A;">● séance clé</span><span style="color:#5555E0;">allégée = semaine de récupération</span></div>
  <p style="margin:4px 0 0 0;font-size:9.5px;color:#6E6B78;">Chaque barre = une semaine : hauteur = volume prévu (écrit au-dessus), couleurs = temps passé dans chaque zone d'intensité. Séances sans durée ou sans intensité identifiable : non classées, aucune valeur inventée.</p>
</section>`;
}
