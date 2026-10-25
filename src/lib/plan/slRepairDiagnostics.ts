/** Presentation only: never infer or repair a sporting prescription here. */
export interface SLRepairDiagnostic {
  weekNumber?: number; day?: string; sport?: string; floorMin?: number; reason?: string;
  before: { day?: string; title?: string; details?: string; durationMin?: number; catalogId?: string | null };
  after?: { day?: string; title?: string; catalogId?: string; durationMin?: number };
  sameSportCandidatesInChunk?: number; totalCandidatesInChunk?: number;
  nearestCandidates?: Array<{ id: string; durationMedian: number; deltaMin: number }>;
  diagnostics?: { localRejections: Record<string, number>; globalRejections: Record<string, number> };
}

export function formatSLRepairDiagnostic(code: string, severity: string, repair: SLRepairDiagnostic): string {
  const day = repair.day ?? repair.before.day ?? "jour non transmis";
  const before = `[${repair.before.catalogId ?? "sans ID"}] [${repair.before.durationMin ?? "durée non transmise"}min ${repair.sport ?? "sport non transmis"}]`;
  let after: string;
  if (repair.after) {
    const delta = typeof repair.after.durationMin === "number" && typeof repair.before.durationMin === "number"
      ? `, Δ${repair.after.durationMin - repair.before.durationMin}min` : "";
    after = `[${repair.after.catalogId ?? "ID non transmis"}] (${repair.after.durationMin ?? "durée non transmise"}min${delta})`;
  } else {
    const counts = typeof repair.sameSportCandidatesInChunk === "number" && typeof repair.totalCandidatesInChunk === "number"
      ? `sameSportCandidates=${repair.sameSportCandidatesInChunk}/${repair.totalCandidatesInChunk}` : "comptage non transmis par le serveur";
    const nearest = repair.nearestCandidates === undefined ? "non transmis par le serveur"
      : repair.nearestCandidates.length === 0 ? "pool examiné sans candidat du sport"
      : repair.nearestCandidates.map(n => `${n.id}(${n.durationMedian}min,Δ${n.deltaMin}min)`).join(" | ");
    after = `UNRESOLVED — ${counts}, nearest=[${nearest}]`;
  }
  const exclusions = repair.diagnostics ? ` — exclusions locales=${JSON.stringify(repair.diagnostics.localRejections)}, globales=${JSON.stringify(repair.diagnostics.globalRejections)}` : "";
  return `[${severity}] ${code}: W${repair.weekNumber ?? "semaine non transmise"} ${day} — ${before} → ${after}${exclusions}`;
}
