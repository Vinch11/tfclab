/**
 * Éditeur de correspondances exercice → exercice officiel Nolio (connexion ACTIVE).
 * Recherche dans le catalogue officiel déjà chargé, libellés source / actuel / choisi visibles,
 * changement ou retrait, vérification explicite par ligne, enregistrement explicite
 * (validation serveur : propriété, catalogue relu, CAS sur l'empreinte des refs).
 * Aucune substitution automatique, aucun envoi, séances Nolio existantes inchangées.
 */
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { mappingRows, searchCatalog, canSaveMappings, reviewKey, type CatalogExercise } from "./exerciseMapping";

const CHANGE_FR = { unchanged: "inchangée", added: "ajout", changed: "changement", removed: "retrait", unmapped: "non associée (séances bloquées)" } as const;

export function ExerciseMappingEditor(p: {
  labels: string[]; current: Record<string, string>; draft: Record<string, string>; catalog: CatalogExercise[];
  onDraft: (d: Record<string, string>) => void; reviewed: Set<string>; onReviewed: (s: Set<string>) => void; disabled: boolean;
}) {
  const [q, setQ] = useState<Record<string, string>>({});
  const { labels, current, draft, catalog } = p;
  const rows = useMemo(() => mappingRows(labels, current, draft, catalog), [labels, current, draft, catalog]);
  const save = canSaveMappings(rows, p.reviewed);
  return (
    <div data-testid="exercise-mapping-editor" className="space-y-2">
      <p className="text-xs">Aucune équivalence n'est déduite d'un nom proche : une fente marchée n'est pas une fente arrière assistée, un soulevé de terre lesté générique n'est pas prouvé être un soulevé roumain. Vérifiez le mouvement réel avant de confirmer.</p>
      {rows.map((r) => {
        const opts = searchCatalog(p.catalog, q[r.label] ?? "");
        const sel = r.draftId && !opts.some((o) => o.id === r.draftId) ? [p.catalog.find((x) => x.id === r.draftId)!, ...opts].filter(Boolean) : opts;
        return (
          <div key={r.label} data-testid="exercise-mapping-row" className={`space-y-1 rounded-md border p-2 ${r.needsReview || r.staleCurrent || !r.draftId ? "border-destructive" : ""}`}>
            <p className="text-xs"><span className="font-medium">Exercice du plan (source) :</span> {r.label}</p>
            <p className="text-xs">Association actuelle : {r.currentId ? `${r.currentName ?? "absent du catalogue relu"}${r.staleCurrent ? " — À CORRIGER" : ""}` : "aucune"} · choisie : {r.draftName ?? "aucune"} · {CHANGE_FR[r.change]}</p>
            <div className="flex flex-wrap items-center gap-2">
              <input aria-label={`Rechercher un exercice officiel pour ${r.label}`} placeholder="Rechercher dans le catalogue officiel" className="rounded-md border bg-background p-1 text-xs" value={q[r.label] ?? ""} onChange={(e) => setQ({ ...q, [r.label]: e.target.value })} />
              <select aria-label={`Exercice Nolio pour ${r.label}`} disabled={p.disabled} className="min-w-0 flex-1 rounded-md border bg-background p-1 text-xs" value={r.draftId ?? ""} onChange={(e) => p.onDraft({ ...p.draft, [r.label]: e.target.value })}>
                <option value="">— non associé (séances refusées) —</option>
                {sel.map((x) => <option key={x.id} value={x.id}>{x.name}{x.type ? ` (${x.type})` : ""}</option>)}
              </select>
              {r.draftId && <Button size="sm" variant="ghost" disabled={p.disabled} onClick={() => { const d = { ...p.draft }; delete d[r.label]; p.onDraft(d); }}>Retirer</Button>}
            </div>
            {r.needsReview && <label className="flex items-center gap-2 text-xs font-medium">
              <input type="checkbox" checked={p.reviewed.has(reviewKey(r))} onChange={(e) => { const s = new Set(p.reviewed); if (e.target.checked) s.add(reviewKey(r)); else s.delete(reviewKey(r)); p.onReviewed(s); }} />
              Vérification requise : j'ai contrôlé que {r.draftName ? `« ${r.draftName} »` : "le retrait"} correspond au mouvement prescrit
            </label>}
          </div>
        );
      })}
      {save.pending.length > 0 && <p className="text-xs text-destructive">À vérifier avant enregistrement : {save.pending.length} correspondance(s).</p>}
    </div>
  );
}
