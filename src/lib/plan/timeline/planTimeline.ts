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
  isTaper: boolean;
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
      isTaper: /(affûtage|affutage|taper|pré-course|pre-race)/i.test(`${w.theme} ${w.phase}`),
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
const wrap = (t: string, px: number, fs: number, maxLines: number): string[] => {
  const max = Math.max(3, Math.floor(px / (fs * 0.55)));
  const words = t.split(/\s+/); const lines: string[] = []; let cur = "";
  for (const w of words) { if (!cur) cur = w; else if ((cur + " " + w).length <= max) cur += " " + w; else { lines.push(cur); cur = w; } }
  if (cur) lines.push(cur);
  const out = lines.slice(0, maxLines).map((l) => (l.length > max ? l.slice(0, max - 1) + "…" : l));
  if (lines.length > maxLines) out[maxLines - 1] = clip(out[maxLines - 1] + "…", px, fs);
  return out;
};
const clip = (t: string, px: number, fs: number) => { const max = Math.floor(px / (fs * 0.56)); return t.length <= max ? t : max <= 2 ? "" : t.slice(0, max - 1) + "…"; };

const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dLong = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
const dShort = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

interface Chantier { rank: number; name: string; block: string; keySessions: string; start: number; end: number }
function readChantiers(plan: ParsedPlan): Chantier[] {
  return (plan.strategicRecap?.limiters ?? []).map((l): Chantier | null => {
    const nums = (l.weeks || "").match(/\d+/g)?.map(Number) ?? [];
    return nums.length ? { rank: l.rank, name: l.name, block: l.block, keySessions: l.keySessions, start: nums[0], end: Math.max(nums[nums.length > 1 ? 1 : 0], nums[0]) } : null;
  }).filter((x): x is Chantier => !!x).sort((a, b) => a.rank - b.rank);
}

/**
 * Frise à lignes nommées, lisible par coach et athlète :
 * Phases (avec dates) · Chantier de la semaine · Charge (courbe) · Repères (allège / affûte / course) · Semaines.
 * Pixels réels (colonne 44 px) à l'écran ; mode `fluid` pour l'impression.
 */
export function renderPlanTimelineSVG(
  plan: ParsedPlan,
  opts: { palette?: TimelinePalette; displayPhase?: (p: string) => string; phases?: TimelinePhaseRange[]; fluid?: boolean; startDate?: Date } = {},
): string {
  const P = opts.palette ?? PRINT_TIMELINE_PALETTE;
  const weeks = buildPlanTimeline(plan);
  if (weeks.length === 0) return "";
  const n = weeks.length;
  const labelW = 86;
  const colW = opts.fluid ? Math.max(18, 900 / n) : 46;
  const fs = opts.fluid ? 10.5 : 12;
  const W = labelW + n * colW + 4;
  const rows = { phase: [0, 50], chantier: [56, 58], charge: [122, 120], marks: [248, 22], week: [274, 34] } as const;
  const H = 312;
  const first = weeks[0].weekNumber;
  const xOf = (wk: number) => labelW + (wk - first) * colW;
  const wDate = (wk: number) => (opts.startDate ? addDays(opts.startDate, (wk - 1) * 7) : null);
  const o: string[] = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" ${opts.fluid ? 'width="100%"' : `width="${W}" height="${H}"`} role="img" aria-label="Timeline de la périodisation" style="font-family:-apple-system,'Segoe UI',sans-serif;display:block">`);
  // Libellés de lignes
  const rowLabel = (key: keyof typeof rows, t: string, sub?: string) => {
    const [y, h] = rows[key];
    o.push(`<text x="0" y="${y + h / 2 + (sub ? -2 : 4)}" font-size="${fs - 1}" font-weight="700" fill="${P.muted}" letter-spacing="0.4">${t}</text>`);
    if (sub) o.push(`<text x="0" y="${y + h / 2 + 11}" font-size="${fs - 3}" fill="${P.muted}">${sub}</text>`);
    o.push(`<line x1="${labelW - 6}" x2="${W}" y1="${y + h + 2}" y2="${y + h + 2}" stroke="${P.grid}" stroke-dasharray="2 3"/>`);
  };
  rowLabel("phase", "PHASES");
  rowLabel("chantier", "CHANTIER", "de la semaine");
  rowLabel("charge", "CHARGE", "volume / semaine");
  rowLabel("marks", "REPÈRES");
  rowLabel("week", "SEMAINES");

  // 1. Phases avec dates
  buildPhaseSegments(weeks, opts.phases, opts.displayPhase).forEach((seg, i) => {
    const s0 = Math.max(seg.start, first), e0 = Math.min(seg.end, first + n - 1);
    if (e0 < s0) return;
    const [y, h] = rows.phase;
    const x = xOf(s0) + 1, w = (e0 - s0 + 1) * colW - 2;
    const d0 = wDate(seg.start), d1 = wDate(seg.end);
    const when = d0 && d1 ? `${dLong(d0)} → ${dLong(addDays(d1, 6))}` : seg.start === seg.end ? `S${seg.start}` : `S${seg.start}–S${seg.end}`;
    const nb = seg.end - seg.start + 1;
    o.push(`<g><title>${esc(seg.label)} — ${when} (${nb} sem)${seg.objective ? "\n" + esc(seg.objective) : ""}</title><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${P.phases[i % P.phases.length]}" stroke="${P.grid}"/>`);
    o.push(`<text x="${x + 7}" y="${y + 18}" font-size="${fs}" font-weight="700" fill="${P.text}">${esc(clip(seg.label, w - 12, fs))}</text>`);
    o.push(`<text x="${x + 7}" y="${y + 34}" font-size="${fs - 1.5}" fill="${P.muted}">${esc(clip(`${when} · ${nb} sem`, w - 12, fs - 1.5))}</text></g>`);
  });

  // 2. Chantier prioritaire actif chaque semaine (segments fusionnés)
  const ch = readChantiers(plan);
  const active = weeks.map((w) => ch.filter((c) => w.weekNumber >= c.start && w.weekNumber <= c.end));
  {
    const [y, h] = rows.chantier;
    let i = 0;
    if (!ch.length) {
      // Repli : chantier lu dans le thème de chaque semaine (« Build - Charge 2 : Densification Seuil & SFR »).
      const themes = plan.weeks.slice().sort((p1, p2) => p1.weekNumber - p2.weekNumber).map((wk) => {
        const t = (wk.theme || "").trim();
        const k = t.indexOf(":");
        return (k >= 0 ? t.slice(k + 1) : "").trim();
      });
      let a = 0;
      let any = false;
      while (a < n) {
        let b = a;
        while (b + 1 < n && themes[b + 1] === themes[a]) b++;
        if (themes[a]) {
          any = true;
          const x = xOf(weeks[a].weekNumber) + 1, w = (b - a + 1) * colW - 2;
          o.push(`<g><title>Chantier ${a === b ? `S${weeks[a].weekNumber}` : `S${weeks[a].weekNumber}–S${weeks[b].weekNumber}`} : ${esc(themes[a])}</title><rect x="${x}" y="${y + 2}" width="${w}" height="${h - 4}" rx="6" fill="${P.phases[0]}" stroke="${P.recovery}" stroke-opacity="${weeks[a].isRecovery || weeks[a].isTaper ? 0.3 : 0.8}"/><rect x="${x}" y="${y + 2}" width="4" height="${h - 4}" rx="2" fill="${P.recovery}" opacity="${weeks[a].isRecovery || weeks[a].isTaper ? 0.35 : 1}"/>`);
          const cfs = fs - 1.5, lines = wrap(themes[a], w - 12, cfs, 3), lh = cfs + 3, y0 = y + h / 2 - ((lines.length - 1) * lh) / 2 + cfs / 3;
          lines.forEach((ln, li) => o.push(`<text x="${x + 9}" y="${y0 + li * lh}" font-size="${cfs}" font-weight="600" fill="${P.text}">${esc(ln)}</text>`));
          o.push(`</g>`);
        }
        a = b + 1;
      }
      if (!any) o.push(`<text x="${labelW + 4}" y="${y + h / 2 + 4}" font-size="${fs - 1}" fill="${P.muted}">Aucun chantier identifiable dans ce plan</text>`);
    }
    while (ch.length && i < n) {
      const top = active[i][0];
      let j = i;
      while (j + 1 < n && (active[j + 1][0]?.rank ?? -1) === (top?.rank ?? -1)) j++;
      if (top) {
        const x = xOf(weeks[i].weekNumber) + 1, w = (j - i + 1) * colW - 2;
        const others = Array.from(new Set(active.slice(i, j + 1).flat().filter((c) => c !== top).map((c) => c.name)));
        o.push(`<g><title>Chantier prioritaire : ${esc(top.name)} (#${top.rank}) — ${esc(top.block)}${top.keySessions ? "\nSéances clés : " + esc(top.keySessions) : ""}${others.length ? "\nAussi entretenu : " + esc(others.join(", ")) : ""}</title>`);
        o.push(`<rect x="${x}" y="${y + 3}" width="${w}" height="${h - 6}" rx="${(h - 6) / 2}" fill="${P.recovery}" opacity="${top.rank === 1 ? 1 : 0.7}"/>`);
        o.push(`<text x="${x + 10}" y="${y + h / 2 + 4}" font-size="${fs - 0.5}" font-weight="600" fill="${P.bg === "transparent" ? "hsl(var(--primary-foreground))" : "#FFFFFF"}">${esc(clip(top.name + (others.length ? ` + ${others.length}` : ""), w - 18, fs - 0.5))}</text></g>`);
      }
      i = j + 1;
    }
  }

  // 3. Charge : courbe du volume
  {
    const [y, h] = rows.charge;
    const vols = weeks.map((w) => w.volumeMin);
    const maxVol = Math.max(1, ...vols.map((v) => v ?? 0));
    const lo = Math.min(...vols.filter((v): v is number => v != null && v > 0), maxVol) * 0.6;
    const pt = (i: number) => [xOf(weeks[i].weekNumber) + colW / 2, y + h - 6 - Math.max(0, ((vols[i] ?? 0) - lo) / Math.max(1, maxVol - lo)) * (h - 28)] as const;
    const known = weeks.map((_, i) => i).filter((i) => vols[i] != null);
    if (known.length) {
      const line = known.map((i, k) => `${k ? "L" : "M"}${pt(i)[0].toFixed(1)},${pt(i)[1].toFixed(1)}`).join(" ");
      const [fx] = pt(known[0]), [lx] = pt(known[known.length - 1]);
      o.push(`<path d="${line} L${lx},${y + h} L${fx},${y + h} Z" fill="${P.moderate}" opacity="0.12"/>`);
      o.push(`<path d="${line}" fill="none" stroke="${P.moderate}" stroke-width="2.5" stroke-linejoin="round"/>`);
    }
    known.forEach((i) => {
      const w = weeks[i], [cx, cy] = pt(i);
      const c = w.isRace ? P.race : w.isTaper ? P.heavy : w.isRecovery ? P.recovery : P.moderate;
      o.push(`<g><title>S${w.weekNumber} : ${fmtVol(vols[i]!)}${w.keySessions ? ` · ${w.keySessions} séance(s) clé(s)` : ""}</title><circle cx="${cx}" cy="${cy}" r="${w.isRecovery || w.isTaper ? 4.5 : 3.5}" fill="${w.isRecovery || w.isTaper ? (P.bg === "transparent" ? "hsl(var(--background))" : "#FFFFFF") : c}" stroke="${c}" stroke-width="2"/>`);
      if (colW >= 34) o.push(`<text x="${cx}" y="${cy - 8}" font-size="${fs - 2}" text-anchor="middle" fill="${P.text}">${fmtVol(vols[i]!)}</text>`);
      o.push(`</g>`);
    });
  }

  // 4. Repères + 5. Semaines
  weeks.forEach((w) => {
    const cx = xOf(w.weekNumber) + colW / 2;
    const [my, mh] = rows.marks;
    const mark = w.isRace ? ["🏁 course", P.race] : w.isTaper ? ["affûte", P.heavy] : w.isRecovery ? ["allège", P.recovery] : null;
    if (mark) o.push(`<text x="${cx}" y="${my + mh / 2 + 4}" font-size="${fs - 2}" font-weight="700" text-anchor="middle" fill="${mark[1]}">${colW >= 34 || mark[0].startsWith("🏁") ? mark[0].replace("🏁 course", colW >= 40 ? "🏁 course" : "🏁") : mark[0][0].toUpperCase()}</text>`);
    const [wy] = rows.week;
    const skip = colW < 24 && w.weekNumber % 2 === 0;
    if (!skip) {
      o.push(`<text x="${cx}" y="${wy + 14}" font-size="${fs - 1}" font-weight="700" text-anchor="middle" fill="${P.text}">S${w.weekNumber}</text>`);
      const d = wDate(w.weekNumber);
      if (d && colW >= 30) o.push(`<text x="${cx}" y="${wy + 28}" font-size="${fs - 3}" text-anchor="middle" fill="${P.muted}">${dShort(d)}</text>`);
    }
  });
  o.push(`</svg>`);
  return o.join("");
}

/** Légende HTML (partagée écran / impression). */
export function timelineLegendItems(P: TimelinePalette = PRINT_TIMELINE_PALETTE): { color: string; label: string }[] {
  return (["moderate", "heavy", "severe", "strength", "unclassified"] as TimelineDomain[]).map((d) => ({ color: P[d], label: DOMAIN_LABELS[d] }));
}

/** Bloc HTML imprimable : version imprimée de la « Timeline de la périodisation ». */
export function renderPlanTimelineHTML(plan: ParsedPlan, displayPhase?: (p: string) => string, startDate?: Date): string {
  const svg = renderPlanTimelineSVG(plan, { displayPhase, phases: plan.phases?.length >= 2 ? plan.phases : undefined, fluid: true, startDate });
  if (!svg) return "";
  return `<section class="keep-together plan-timeline" style="margin:0 0 20px 0;padding:12px 14px;border:1px solid #DAD6CC;border-radius:8px;background:#fff;page-break-inside:avoid;break-inside:avoid;">
  <h2 style="margin:0 0 8px 0;">Timeline de la périodisation</h2>
  ${svg}
  <p style="margin:6px 0 0 0;font-size:9.5px;color:#6E6B78;">Lecture : chaque colonne = une semaine. <b>Chantier</b> = limiteur prioritaire travaillé cette semaine-là (« + n » : autres limiteurs entretenus). <b>Charge</b> = volume prévu ; la courbe monte en construction, redescend sur les semaines <span style="color:#5555E0;font-weight:700">allège</span> (récupération) et <span style="color:#D4711C;font-weight:700">affûte</span> (avant course) ; 🏁 = course.</p>
</section>`;
}
