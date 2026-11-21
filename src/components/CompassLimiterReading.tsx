import { ReferenceGauge } from "./charts/ReferenceGauge";
import { FieldComparison, FieldMetricComparison } from "./charts/FieldComparison";
import { fieldUnits } from "@/lib/coachingCompass/rankedFieldGaps";
import { coachPriorities } from "@/lib/coachingCompass/coachPriorities";
import { fieldCheckLink, nextFieldCheck } from "@/lib/diagnostic/compactFieldAssessment";
import type { CoachingCompassInput, TFCLCoachingCompassResult } from "@/lib/coachingCompass/types";
import type { ReactNode } from "react";

export function CompassLimiterReading({ input, presentation, children }: {
  input: CoachingCompassInput; presentation?: TFCLCoachingCompassResult["presentation"]; children: ReactNode;
}) {
  const { factors, overlap, tied } = coachPriorities(input, presentation);
  const lead = factors[0];
  const shared = overlap?.contested && !lead?.hypothesis;
  const reviewGlycolysis = shared || (!lead && overlap) || (lead?.metric === "VLamax" && lead.hypothesis);
  const check = lead?.sport && lead.metric === "tte" && !reviewGlycolysis
    ? { text: "Vérifier la durée tenue au seuil en " + (lead.sport === "run" ? "course à pied" : "vélo") + " et le motif de l’arrêt dans la séance de référence.", module: lead.sport === "run" ? "hold-run" as const : "hold-bike" as const }
    : nextFieldCheck(input, !!reviewGlycolysis);
  const url = fieldCheckLink(check);
  const overlapReading = overlap && <div className="space-y-1 border-l-2 border-amber-500 pl-3">
    <h5 className="font-semibold">Profil glycolytique (VLamax)</h5>
    {!shared && <p className="text-sm font-medium text-muted-foreground">À surveiller</p>}
    <p className="text-sm">{overlap.facts}</p>
    <FieldComparison title="Plage estimée et plage de coaching"
      athlete={{ label: "Estimation", bounds: overlap.range }}
      reference={{ label: "Plage de coaching", bounds: { low: overlap.reference.min, high: overlap.reference.max } }}
      format={(v, omitUnit) => v.toLocaleString("fr-BE", { maximumFractionDigits: 2 }) + (omitUnit ? "" : " mmol/L/s")} />
    {overlap.previous && <p className="text-sm text-muted-foreground">{overlap.previous}</p>}
  </div>;
  const comparable = !lead && !overlap && input.limiterResult?.gapAnalysis.some(m =>
    m.value != null && m.target != null && m.target > 0 && m.prescriptionApplicable !== false &&
    (m.status === "optimal" || m.status === "acceptable"));
  const heading = shared && factors.length ? (factors.length === 1 ? "Deux facteurs à départager" : "Facteurs à départager") :
    tied ? "Priorités à départager" : lead?.hypothesis ? "Piste prioritaire à vérifier" :
    lead?.status === "Écart modeste" ? "Écarts modestes à suivre" : lead ? "Hiérarchie des limiteurs" : overlap ? "Profil à préciser" : comparable ? "Repères dans la plage attendue" : "Priorité à préciser";
  return <section aria-label="Priorité du bilan" className="space-y-4 rounded-2xl border bg-card p-4 sm:p-5">
    <h4 className="text-xl font-semibold tracking-tight">{heading}</h4>
    {shared && overlapReading}
    {!!factors.length && <ol aria-label="Facteurs pour l’objectif" className="space-y-3">
      {factors.slice(0, 3).map((row, index) => {
        const observation = row.observation;
        const showBounds = observation && (observation.fieldBounds || observation.fieldBoundsConflict || observation.fieldEstimateNote);
        const comparison = row.comparison ?? (observation?.value != null && observation.target != null && fieldUnits[observation.metric]
          ? { value: observation.value, target: observation.target, unit: fieldUnits[observation.metric], range: observation.coachingRange } : undefined);
        return <li key={row.title} className="space-y-3 rounded-xl border bg-background p-3 sm:p-4">
          <div className="flex items-start gap-3">
            {!shared && !tied && <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{factors.findIndex(other => other.impact === row.impact) + 1}</span>}
            <div className="min-w-0">
              <h5 className={index === 0 ? "font-semibold" : "font-medium"}>{row.title}</h5>
              <p className="mt-0.5 text-xs text-muted-foreground">{row.status}{row.facts && (row.sport || !comparison || showBounds) ? " · " + row.facts : ""}</p>
            </div>
          </div>
          {row.sport && comparison && !comparison.range && <p className="text-base font-semibold tabular-nums">
            {(comparison.target - comparison.value).toLocaleString("fr-BE", { maximumFractionDigits: 2 })} {comparison.unit} sous le repère
          </p>}
          {showBounds ? <FieldMetricComparison metric={observation} hypothesis={row.hypothesis} /> : comparison &&
            <ReferenceGauge {...comparison} name={row.title} label={row.hypothesis ? "Estimation" : "Bilan"} />}
        </li>;
      })}
    </ol>}
    {!shared && overlapReading}
    {!lead && !overlap && <p className="text-sm">{comparable
      ? "Les valeurs comparables du bilan se situent dans les repères de l’épreuve."
      : "Les observations disponibles ne permettent pas encore de choisir un chantier pour cet objectif."}</p>}
    <div className="border-t pt-3">
      <h5 className="text-sm font-semibold">Décision du coach</h5>
      <p className="mt-1 text-sm leading-relaxed">{check.text}</p>
      {url && <a className="inline-block py-2 text-sm font-medium text-primary underline" href={url}>Voir le protocole</a>}
    </div>
    {children}
  </section>;
}
