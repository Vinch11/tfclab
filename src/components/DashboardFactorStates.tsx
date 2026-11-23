import { Bike, Footprints } from "lucide-react";
import { ReferenceGauge } from "@/components/charts/ReferenceGauge";
import { getAmbitionDefinition, type AmbitionLevel } from "@/types/ambitionLevel";
import { getObjectifLabel, type ObjectifType } from "@/types/athlete";
import type { CoachingCompassInput, TFCLCoachingCompassResult } from "@/lib/coachingCompass/types";
import { buildFactorStates, fmt, type FactorRow } from "@/lib/coachingCompass/factorStates";
import { compassEvidence } from "@/lib/coachingCompass/referenceRegistry";
import { MeasureStatus } from "@/components/ObservedFactors";

const TIER = {
  measured: { label: "Mesuré", hint: "Cohorte publiée du même niveau", cls: "bg-[var(--mint)] text-accent" },
  derived: { label: "Dérivé", hint: "Calculé à partir de cohortes publiées", cls: "bg-[var(--lavender)] text-primary" },
  cohort: { label: "Cohorte", hint: "Moyenne publiée, sans seuil de réussite", cls: "bg-[var(--mint)] text-accent" },
  observed: { label: "Observé", hint: "Mesure de l’athlète, sans cible publiée", cls: "bg-[var(--lavender)] text-primary" },
  coaching: { label: "Repère de coaching", hint: "Valeur TFCL sans cohorte publiée", cls: "bg-muted text-muted-foreground" },
} as const;
const STATE = {
  below: { text: "Sous la zone", cls: "bg-[#fff0ce] text-[#3d2e13]" },
  inside: { text: "Dans la zone", cls: "bg-[var(--mint)] text-accent" },
  above: { text: "Au-dessus de la zone", cls: "bg-[var(--lavender)] text-primary" },
  missing: { text: "À mesurer", cls: "bg-muted text-muted-foreground" },
  none: { text: "Sans repère", cls: "bg-muted text-muted-foreground" },
} as const;

function FactorTile({ r }: { r: FactorRow }) {
  const tier = TIER[r.tier];
  const override = r.state === "below" || r.state === "inside" || r.state === "above" ? r.stateText?.[r.state] : undefined;
  const state = { ...STATE[r.state], text: override ?? STATE[r.state].text };
  const links = r.evidence.map(id => compassEvidence.find(e => e.id === id)).filter((e): e is NonNullable<typeof e> => !!e);
  const range = r.zone && r.zone.low !== r.zone.high ? { min: r.zone.low, max: r.zone.high } : undefined;
  const missing = r.observation == null && r.value == null;
  const zoneText = r.zone ? (r.zone.low === r.zone.high ? fmt(r.zone.low) : fmt(r.zone.low) + "–" + fmt(r.zone.high)) : null;
  return (
    <li className="compass-step space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold leading-snug">{r.label}</h4>
        <span className={"ui-badge shrink-0 px-2.5 py-1 text-xs " + state.cls}>{state.text}</span>
      </div>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className={missing ? "text-base font-medium text-muted-foreground" : "text-3xl font-semibold leading-none tracking-[-0.05em] tabular-nums"}>
          {r.observation ?? (r.value != null ? fmt(r.value) : "non renseigné")}
          {!missing && <span className="ml-1 text-sm font-medium tracking-normal text-muted-foreground">{r.unit}</span>}
        </p>
        {zoneText && <p className="text-sm tabular-nums text-muted-foreground">Idéal <strong className="font-semibold text-foreground">{zoneText} {r.unit}</strong></p>}
      </div>
      {r.value != null && r.zone && r.zone.low > 0 && (
        <ReferenceGauge value={r.value} target={r.zone.point ?? (r.zone.low + r.zone.high) / 2} range={range} unit={r.unit} name={r.label} showLabels={false} />
      )}
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className={"ui-badge px-2 py-0.5 " + tier.cls}>{tier.label}</span>
        <span>{tier.hint}</span>
      </p>
      {r.caption && <p className="text-xs text-muted-foreground">{r.caption}</p>}
      <MeasureStatus r={r} />
      {r.engineNote && <p className="text-xs leading-relaxed text-muted-foreground">{r.engineNote} C’est une valeur de coaching, non issue d’études ; elle sert au classement du Compass et aux plans, pas à l’idéal sourcé ci-dessus.</p>}
      {(r.basis || r.adjustment || links.length > 0) && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer py-1 font-medium text-foreground">D’où vient cette valeur</summary>
          {r.basis && <p className="pb-1 leading-relaxed">{r.basis}</p>}
          {r.adjustment && <p className="pb-1 leading-relaxed">{r.adjustment}</p>}
          {links.map(e => <p key={e.id}><a className="underline" href={e.url} target="_blank" rel="noreferrer">{e.title}</a></p>)}
        </details>
      )}
    </li>
  );
}

/**
 * État de chaque facteur du profil face à l’idéal de l’objectif et de l’ambition.
 * Affichage seul : lit les mêmes valeurs que le Compass, ne touche ni le classement ni les plans.
 * Le classement des écarts vit dans la carte « Limiteurs hiérarchisés ».
 */
export function DashboardFactorStates({ input, compass }: { input: CoachingCompassInput; compass: TFCLCoachingCompassResult }) {
  const { sections } = buildFactorStates(input, compass);
  if (!sections.length) return null;
  const objective = getObjectifLabel(input.objectif as ObjectifType);
  const ambition = getAmbitionDefinition(input.ambition as AmbitionLevel).label;
  return (
    <section aria-labelledby="dashboard-factors" className="ui-card min-w-0 space-y-5 rounded-3xl border bg-card p-5 sm:p-7">
      <div>
        <h2 id="dashboard-factors" className="text-xl font-semibold tracking-[-0.04em] sm:text-2xl">État des facteurs face à l’idéal</h2>
        <p className="text-sm text-muted-foreground">Objectif {objective} · ambition {ambition}</p>
      </div>
      <div className={"grid gap-6 " + (sections.length > 1 ? "md:grid-cols-2" : "")}>
        {sections.map(s => (
          <div key={s.sport} className="min-w-0">
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold">
              {s.sport === "bike" ? <Bike aria-hidden className="size-5 text-primary" /> : <Footprints aria-hidden className="size-5 text-primary" />}
              {s.sport === "bike" ? "Vélo" : "Course à pied"}
            </h3>
            <ul className="space-y-3">{s.rows.map(r => <FactorTile key={r.key} r={r} />)}</ul>
          </div>
        ))}
      </div>
      <details className="text-xs leading-relaxed text-muted-foreground">
        <summary className="cursor-pointer py-1 font-medium text-foreground">Comment lire ces repères</summary>
        « Mesuré » : moyenne d’une cohorte publiée du niveau correspondant. « Dérivé » : calculé à partir de cohortes publiées par une règle écrite, faute de cohorte directe.
        « Observé » : mesure propre à l’athlète (seuil critique, réserve anaérobie, durabilité), affichée sans cible ni classement faute de norme publiée. « Repère de coaching » : valeur TFCL sans cohorte publiée. Natation : aucune cohorte lue, aucun idéal affiché.
        La zone est la moyenne ± ½ écart-type : une largeur de lecture, pas un seuil de réussite.
        Ces repères ne modifient ni le classement des limiteurs ni les plans.
      </details>
    </section>
  );
}
