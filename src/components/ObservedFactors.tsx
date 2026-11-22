import { compassEvidence } from "@/lib/coachingCompass/referenceRegistry";
import { fmt, type FactorRow } from "@/lib/coachingCompass/factorStates";

/**
 * Mesures propres à l'athlète (seuil critique, réserve anaérobie, durabilité) : valeur, statut,
 * origine et sources. Aucune cible ni classement, faute de norme publiée. Affichage seul.
 */
export function ObservedFactors({ rows, title }: { rows: FactorRow[]; title: string }) {
  if (!rows.length) return null;
  return (
    <section aria-label={title} className="space-y-4">
      <h3 className="text-xl font-semibold">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(r => {
          const links = r.evidence.map(id => compassEvidence.find(e => e.id === id)).filter((e): e is NonNullable<typeof e> => !!e);
          return (
            <article key={r.key} className="lab-reading min-w-0 rounded-2xl border bg-card p-4 shadow-sm">
              <h4 className="text-sm font-medium text-muted-foreground">{r.label}</h4>
              <p className="my-2 text-2xl font-semibold tabular-nums">
                {r.value == null ? "À mesurer" : <>{fmt(r.value)} <span className="text-sm font-medium text-muted-foreground">{r.unit}</span></>}
              </p>
              <p className="text-sm text-muted-foreground">{r.caption ?? "Données insuffisantes"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Observé : mesure de l’athlète, sans cible publiée ni classement.</p>
              {(r.basis || links.length > 0) && (
                <details className="text-sm">
                  <summary className="cursor-pointer py-2 font-medium">Interpréter ce repère</summary>
                  {r.basis && <p className="leading-relaxed">{r.basis}</p>}
                  {links.map(e => <p key={e.id} className="text-xs"><a className="underline" href={e.url} target="_blank" rel="noreferrer">{e.title}</a></p>)}
                </details>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
