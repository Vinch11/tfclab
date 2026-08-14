/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Métrique de diversité catalogue (P0 — audit répétition des séances)
 * ═══════════════════════════════════════════════════════════════════════════
 * Objectif : mesurer, et non plus estimer, à quel point un plan généré
 * exploite réellement la bibliothèque de séances.
 *
 *   distinctRatio = nb de catalogId distincts / nb de séances non-repos
 *
 * Repères empiriques :
 *   ≥ 0.55 → bonne variété
 *   0.35–0.55 → acceptable (les piliers hebdo se répètent normalement)
 *   < 0.35 → répétition excessive : le plan tourne sur trop peu de fiches
 */

export interface PlanDiversityMetrics {
  /** Séances non-repos comptabilisées. */
  totalSessions: number;
  /** Séances portant un catalogId (non custom). */
  catalogSessions: number;
  /** Séances custom (générées hors bibliothèque). */
  customSessions: number;
  /** Nombre de fiches distinctes utilisées. */
  distinctCatalogIds: number;
  /** distinctCatalogIds / totalSessions (0..1). */
  distinctRatio: number;
  /** Nombre d'occurrences de la fiche la plus répétée. */
  maxRepeat: number;
  /** Top 5 des fiches les plus répétées. */
  topRepeated: Array<{ id: string; count: number }>;
  /** Verdict lisible. */
  grade: "good" | "acceptable" | "poor" | "unknown";
}

interface AnySession {
  sport?: string;
  isRest?: boolean;
  custom?: boolean;
  catalogId?: string | null;
}
interface AnyWeek { sessions?: AnySession[] }

/** Accepte une liste de semaines (plan mergé) ou de chunks contenant des semaines. */
export function computePlanDiversity(
  input: { weeks?: AnyWeek[] } | AnyWeek[] | Array<{ weeks?: AnyWeek[] }> | null | undefined,
): PlanDiversityMetrics {
  const weeks: AnyWeek[] = [];
  const push = (w: AnyWeek | undefined) => { if (w && Array.isArray(w.sessions)) weeks.push(w); };
  if (Array.isArray(input)) {
    for (const item of input) {
      const asChunk = item as { weeks?: AnyWeek[] };
      if (Array.isArray(asChunk?.weeks)) asChunk.weeks.forEach(push);
      else push(item as AnyWeek);
    }
  } else if (input && Array.isArray((input as { weeks?: AnyWeek[] }).weeks)) {
    (input as { weeks?: AnyWeek[] }).weeks!.forEach(push);
  }

  const counts = new Map<string, number>();
  let totalSessions = 0;
  let customSessions = 0;
  let catalogSessions = 0;

  for (const w of weeks) {
    for (const s of w.sessions ?? []) {
      if (s?.isRest || s?.sport === "rest") continue;
      totalSessions++;
      if (s?.custom || !s?.catalogId) { customSessions++; continue; }
      catalogSessions++;
      const id = String(s.catalogId).toUpperCase();
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  const topRepeated = [...counts.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const distinctCatalogIds = counts.size;
  const distinctRatio = totalSessions > 0 ? distinctCatalogIds / totalSessions : 0;
  const maxRepeat = topRepeated[0]?.count ?? 0;

  const grade: PlanDiversityMetrics["grade"] =
    totalSessions === 0 ? "unknown"
      : distinctRatio >= 0.55 ? "good"
      : distinctRatio >= 0.35 ? "acceptable"
      : "poor";

  return {
    totalSessions,
    catalogSessions,
    customSessions,
    distinctCatalogIds,
    distinctRatio,
    maxRepeat,
    topRepeated,
    grade,
  };
}

export function formatDiversitySummary(m: PlanDiversityMetrics): string {
  const pct = Math.round(m.distinctRatio * 100);
  const top = m.topRepeated.map(t => `${t.id}×${t.count}`).join(", ") || "—";
  return `distinct=${m.distinctCatalogIds}/${m.totalSessions} (${pct}%) grade=${m.grade} maxRepeat=${m.maxRepeat} top=[${top}]`;
}
