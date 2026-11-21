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
  const check = nextFieldCheck(input, !!reviewGlycolysis);
  const url = fieldCheckLink(check);
  const overlapReading = overlap && <div className="space-y-1 border-l-2 border-amber-500 pl-3">
    <h5 className="font-semibold">Profil glycolytique (VLamax)</h5>
    {!shared && <p className="text-sm font-medium text-muted-foreground">À surveiller</p>}
    <p className="text-sm">{overlap.facts}</p>
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
      {factors.slice(0, 3).map((row, index) => <li key={row.title} className="flex items-start gap-3">
        {!shared && !tied && <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{factors.findIndex(other => other.impact === row.impact) + 1}</span>}
        <div className={shared || tied ? "border-l-2 border-primary/50 pl-3" : ""}>
          <h5 className={index === 0 ? "font-semibold" : "font-medium"}>{row.title}</h5>
          <p className="text-sm text-muted-foreground">{row.status}{row.facts && " · " + row.facts}</p>
        </div>
      </li>)}
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
