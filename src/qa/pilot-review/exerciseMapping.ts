/**
 * Correction des correspondances exercice (libellé source du plan → exercice officiel Nolio).
 * Pur et testable. AUCUNE équivalence n'est déduite d'une ressemblance de texte : la recherche
 * filtre le catalogue officiel, elle ne propose ni ne choisit rien. Chaque ajout, changement ou
 * retrait exige une vérification explicite du coach avant l'enregistrement.
 */
export type CatalogExercise = { id: string; name: string; type: string | null };
export type MappingChange = "unchanged" | "added" | "changed" | "removed" | "unmapped";
export type MappingRow = {
  label: string;
  currentId: string | null; currentName: string | null; currentInCatalog: boolean;
  draftId: string | null; draftName: string | null;
  change: MappingChange;
  /** Vérification explicite requise avant enregistrement. */
  needsReview: boolean;
  /** Ancienne association absente du catalogue relu : à corriger ou retirer. */
  staleCurrent: boolean;
};

export function mappingRows(labels: string[], current: Record<string, string>, draft: Record<string, string>, catalog: CatalogExercise[]): MappingRow[] {
  const byId = new Map(catalog.map((x) => [x.id, x]));
  return labels.map((label) => {
    const currentId = current[label] || null, draftId = draft[label] || null;
    const change: MappingChange = currentId === draftId ? (draftId ? "unchanged" : "unmapped")
      : !currentId ? "added" : !draftId ? "removed" : "changed";
    const currentInCatalog = !!currentId && byId.has(currentId);
    return {
      label, currentId, currentName: currentId ? byId.get(currentId)?.name ?? null : null, currentInCatalog,
      draftId, draftName: draftId ? byId.get(draftId)?.name ?? null : null, change,
      needsReview: change === "added" || change === "changed" || change === "removed",
      staleCurrent: !!currentId && !currentInCatalog,
    };
  });
}

/** Filtre du catalogue officiel par texte saisi (casse/accents ignorés). Ne choisit jamais. */
export function searchCatalog(catalog: CatalogExercise[], q: string, max = 50): CatalogExercise[] {
  const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const n = norm(q.trim());
  return (n ? catalog.filter((x) => norm(x.name).includes(n)) : catalog).slice(0, max);
}

/** Enregistrement permis seulement si au moins un changement et CHAQUE changement vérifié. */
export function canSaveMappings(rows: MappingRow[], reviewed: ReadonlySet<string>): { ok: boolean; pending: string[] } {
  const changed = rows.filter((r) => r.needsReview);
  const pending = changed.filter((r) => !reviewed.has(`${r.label}|${r.draftId ?? ""}`)).map((r) => r.label);
  return { ok: changed.length > 0 && pending.length === 0, pending };
}
export const reviewKey = (r: Pick<MappingRow, "label" | "draftId">) => `${r.label}|${r.draftId ?? ""}`;

/** Correspondances finales envoyées au serveur (retraits = clé absente). */
export function finalExerciseIds(current: Record<string, string>, draft: Record<string, string>, labels: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(current)) if (!labels.includes(k) && v) out[k] = v; // hors plan : conservées
  for (const l of labels) if (draft[l]) out[l] = draft[l];
  return out;
}
