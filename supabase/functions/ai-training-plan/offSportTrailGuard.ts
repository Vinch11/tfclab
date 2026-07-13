/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * B3 ROOT-CAUSE GUARD — vocabulaire trail dans plans route/tri
 * ═══════════════════════════════════════════════════════════════════════════════
 * Source partagée par le handler JSON et les checks QA client : mêmes regex,
 * même logique de substitution déterministe. Le filet ne réécrit jamais une
 * prescription libre : soit il substitue par une séance catalogue de même sport
 * et durée proche, soit il laisse échouer visiblement la QA.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface GuardSession {
  day: string;
  sport: string;
  title: string;
  details?: string;
  isKeySession?: boolean;
  catalogId: string | null;
  custom: boolean;
  durationMin: number;
  zones: string[];
}

interface GuardWeek {
  weekNumber: number;
  sessions: GuardSession[];
}

export interface GuardPlanChunk {
  weeks: GuardWeek[];
}

// Marqueurs strictement critical : D+ chiffré, trail technique / massif, etc.
// "vallonné" seul reste warning (terrain vallonné légitime en route/tri).
export const TRAIL_DETAILS_CRITICAL_RX = /(?:\b\d{2,}\s*m\s*D\+\b|\bD\+\s*\d{2,}\s*m\b|\+\s*\d{2,}\s*m\b|montée\s+sèche|b[âa]tons|power[-\s]?hike|vertical[-\s]?km|\bVK\b|\bmassif\b|\bardennes\b|\bvosges\b|\balpes\b|\bpyr[ée]n[ée]es\b|sentier\s+technique|trail\s+technique)/i;
export const TRAIL_DETAILS_WARNING_RX = /vallonn[ée]/i;

type NormalizedSport = "swim" | "bike" | "run" | "brick" | "strength" | "recovery" | "rest" | "mixed" | "trail" | "unknown";

export interface CatalogCandidate {
  id: string;
  sport: NormalizedSport;
  title: string;
  durationMin: [number, number];
  durationMedian: number;
  structure: string;
  zones: string[];
}

export interface OffsportTrailRepair {
  code: "substituted_offsport" | "offsport_unresolved";
  severity: "warning" | "critical";
  chunkIndex: number;
  weekNumber: number;
  day: string;
  sport: string;
  before: {
    title: string;
    details: string;
    durationMin: number;
  };
  after?: {
    title: string;
    catalogId: string;
    durationMin: number;
  };
  reason: string;
}

function normalizeSport(raw: unknown): NormalizedSport {
  const s = String(raw ?? "").trim().toLowerCase();
  if (["run", "course", "cap", "course à pied", "course a pied"].includes(s)) return "run";
  if (["bike", "vélo", "velo", "cyclisme"].includes(s)) return "bike";
  if (["swim", "natation", "nat"].includes(s)) return "swim";
  if (["brick", "brique", "enchaînement", "enchainement"].includes(s)) return "brick";
  if (["strength", "renfo", "renforcement", "ppg", "force"].includes(s)) return "strength";
  if (["recovery", "récup", "recup", "récupération", "recuperation"].includes(s)) return "recovery";
  if (["rest", "repos", "off"].includes(s)) return "rest";
  if (s.includes("trail")) return "trail";
  if (s.includes("mix")) return "mixed";
  return "unknown";
}

export function isTrailObjective(objective: string | null | undefined): boolean {
  const obj = String(objective ?? "").toLowerCase();
  return obj.includes("trail") || obj.includes("utmb") || obj.includes("ccc") || obj.includes("occ") ||
    (obj.includes("ultra") && !obj.includes("ironman"));
}

function sportFromHeader(line: string): NormalizedSport | null {
  const l = line.toLowerCase();
  if (!line.trim().startsWith("####")) return null;
  if (l.includes("course") || l.includes("pied") || l.includes("🏃")) return "run";
  if (l.includes("vélo") || l.includes("velo") || l.includes("cycl") || l.includes("🚴")) return "bike";
  if (l.includes("natation") || l.includes("swim") || l.includes("🏊")) return "swim";
  if (l.includes("brick") || l.includes("brique") || l.includes("🔁")) return "brick";
  if (l.includes("renfo") || l.includes("mobilité") || l.includes("mobilite") || l.includes("💪")) return "strength";
  if (l.includes("trail") || l.includes("⛰")) return "trail";
  if (l.includes("mixte") || l.includes("mixed")) return "mixed";
  return null;
}

function parseDurationRange(raw: string): [number, number] | null {
  const range = raw.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) {
    const a = Number(range[1]);
    const b = Number(range[2]);
    if (Number.isFinite(a) && Number.isFinite(b) && a >= 0 && b >= a) return [a, b];
  }
  const single = raw.match(/\b(\d{1,3})\b/);
  if (single) {
    const n = Number(single[1]);
    if (Number.isFinite(n) && n >= 0) return [n, n];
  }
  return null;
}

function extractZones(structure: string): string[] {
  const zones = new Set<string>();
  for (const m of structure.matchAll(/\[([^\]]+)\]/g)) {
    for (const z of m[1].split(/[,;/]/).map(x => x.trim()).filter(Boolean)) zones.add(z);
  }
  return Array.from(zones);
}

export function parseCatalogCandidatesFromDump(dump: string | null | undefined): CatalogCandidate[] {
  if (!dump) return [];
  const out: CatalogCandidate[] = [];
  let currentSport: NormalizedSport = "unknown";
  let hasDPlusColumn = false;

  for (const line of dump.split("\n")) {
    const headerSport = sportFromHeader(line);
    if (headerSport) {
      currentSport = headerSport;
      continue;
    }
    if (/^\|\s*ID\s*\|/i.test(line)) {
      hasDPlusColumn = /D\+\s*cible/i.test(line);
      continue;
    }
    if (!/^\|\s*[A-Z][A-Z0-9_]+\s*\|/.test(line)) continue;

    const cells = line.split("|").slice(1, -1).map(c => c.trim());
    const id = cells[0];
    if (!id || id === "ID") continue;
    const title = cells[2] || id;
    const duration = parseDurationRange(cells[4] || "");
    if (!duration) continue;
    const structureStart = hasDPlusColumn ? 6 : 5;
    const structure = cells.slice(structureStart).join(" | ").trim();
    const durationMedian = Math.round((duration[0] + duration[1]) / 2);
    out.push({
      id,
      sport: currentSport,
      title,
      durationMin: duration,
      durationMedian,
      structure,
      zones: extractZones(structure),
    });
  }
  return out;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function findCandidate(candidates: CatalogCandidate[], sport: string, durationMin: number): CatalogCandidate | null {
  const normalizedSport = normalizeSport(sport);
  const target = Number.isFinite(durationMin) && durationMin > 0 ? durationMin : 0;
  const sameSport = candidates.filter(c => c.sport === normalizedSport);
  const viable = sameSport
    .map(c => ({ c, delta: Math.abs(c.durationMedian - target) }))
    .filter(x => x.delta <= 15)
    .sort((a, b) => a.delta - b.delta || a.c.durationMedian - b.c.durationMedian);
  return viable[0]?.c ?? null;
}

function hasCriticalTrailText(session: GuardSession): boolean {
  if (session.custom !== true || session.sport === "rest") return false;
  return TRAIL_DETAILS_CRITICAL_RX.test(`${session.title ?? ""} ${session.details ?? ""}`);
}

export function applyOffsportTrailGuardToChunks<T extends GuardPlanChunk>(
  chunks: T[],
  objective: string | null | undefined,
  catalogDumpsByChunk: Array<string | null | undefined>,
): { chunks: T[]; repairs: OffsportTrailRepair[] } {
  if (isTrailObjective(objective)) return { chunks, repairs: [] };

  const repairs: OffsportTrailRepair[] = [];
  const candidatesByChunk = catalogDumpsByChunk.map(parseCatalogCandidatesFromDump);

  chunks.forEach((chunk, ci) => {
    const candidates = candidatesByChunk[ci] ?? [];
    for (const week of chunk.weeks ?? []) {
      for (const session of week.sessions ?? []) {
        if (!hasCriticalTrailText(session)) continue;

        const before = {
          title: session.title ?? "",
          details: (session.details ?? "").slice(0, 240),
          durationMin: session.durationMin ?? 0,
        };
        const candidate = findCandidate(candidates, session.sport, session.durationMin ?? 0);

        if (!candidate) {
          repairs.push({
            code: "offsport_unresolved",
            severity: "critical",
            chunkIndex: ci,
            weekNumber: week.weekNumber,
            day: session.day,
            sport: session.sport,
            before,
            reason: "custom critical trail vocabulary in route/tri plan; no same-sport catalog candidate within ±15 min",
          });
          continue;
        }

        const nextDuration = clamp(session.durationMin ?? candidate.durationMedian, candidate.durationMin[0], candidate.durationMin[1]);
        session.title = candidate.title;
        session.details = `${candidate.structure || candidate.title}. [ID: ${candidate.id}]`;
        session.catalogId = candidate.id;
        session.custom = false;
        session.durationMin = nextDuration;
        session.zones = candidate.zones;

        repairs.push({
          code: "substituted_offsport",
          severity: "warning",
          chunkIndex: ci,
          weekNumber: week.weekNumber,
          day: session.day,
          sport: session.sport,
          before,
          after: { title: session.title, catalogId: candidate.id, durationMin: nextDuration },
          reason: "custom critical trail vocabulary substituted by same-sport catalog session within ±15 min",
        });
      }
    }
  });

  return { chunks, repairs };
}
