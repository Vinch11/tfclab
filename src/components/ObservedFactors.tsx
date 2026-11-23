import { compassEvidence } from "@/lib/coachingCompass/referenceRegistry";
import { fmt, type FactorRow } from "@/lib/coachingCompass/factorStates";

/** Qualité de la mesure et prochaine étape : partagé par la tuile du Dashboard, 100%lab et le Compass. */
export function MeasureStatus({ r }: { r: FactorRow }) {
  if (!r.reliability && !r.action) return null;
  return (
    <div className="space-y-1 text-xs">
      {r.reliability && (
        <p className="flex flex-wrap items-center gap-2">
          <span className={"ui-badge px-2 py-0.5 " + (r.reliability.level === "ok" ? "bg-[var(--mint)] text-accent" : "bg-[#fff0ce] text-[#3d2e13]")}>
            {r.reliability.level === "ok" ? "Mesure fiable" : "Mesure à revoir"}
          </span>
        </p>
      )}
      {r.reliability && r.reliability.notes.length > 0 && (
        <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">{r.reliability.notes.map(n => <li key={n}>{n}</li>)}</ul>
      )}
      {r.action && <p><a className="font-medium underline" href={r.action.href}>{r.action.label}</a></p>}
    </div>
  );
}

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
              <div className="mt-2"><MeasureStatus r={r} /></div>
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
