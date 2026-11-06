/** The legacy sender rebuilds catalogue blocks. DET must use its saved V2 structure. */
const record = (v: unknown): Record<string, unknown> | null =>
  v !== null && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null;

export const DET_LEGACY_EXPORT_BLOCKED = "Ce programme contient des prescriptions DET. L’envoi Nolio doit utiliser les blocs sauvegardés et le parcours V2 avec revue coach ; l’ancien envoi est désactivé.";

export function requiresStructuredNolioExport(session: unknown): boolean {
  const s = record(session);
  return !!s && (s.detStructuredWorkout != null || s.detStructureRefusal != null ||
    (typeof s.catalogId === "string" && /^V3[PB]_/.test(s.catalogId)));
}

export function blocksLegacyNolioExport(plan: unknown): boolean {
  const p = record(plan);
  if (!p) return false;
  // A malformed DET provenance must not enable the legacy sender.
  if (record(p._provenance)?.engine === "det") return true;
  return Array.isArray(p.weeks) && p.weeks.some(w => {
    const week = record(w);
    return Array.isArray(week?.sessions) && week.sessions.some(requiresStructuredNolioExport);
  });
}
