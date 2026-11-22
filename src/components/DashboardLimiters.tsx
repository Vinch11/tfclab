import { Compass } from "lucide-react";
import { FieldMetricComparison } from "@/components/charts/FieldComparison";
import { ReferenceGauge } from "@/components/charts/ReferenceGauge";
import type { compassFlow } from "@/lib/coachingCompass/compassFlow";
import { fmt, glycolyticHypothesis, rankWithHypothesis, type FactorStates } from "@/lib/coachingCompass/factorStates";

type Flow = ReturnType<typeof compassFlow>;
const SPORT = { run: "Course à pied", bike: "Vélo" } as const;
const day = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, "");
type EngineFactor = Flow["lead"];

/**
 * UNE seule hiérarchie : les facteurs classés du plus grand au plus petit écart face à l'idéal
 * sourcé (une valeur à confirmer, comme la VLamax estimée, garde son rang avec un message au
 * coach). Sur chaque ligne, une étiquette indique ce que le moteur de plans en fait (il choisit
 * le bloc d'entraînement selon son repère interne TFCL). Sans écarts calculables (mode express),
 * seule la priorité du moteur est affichée. Affichage seul : le moteur et les plans sont inchangés.
 */
export function DashboardLimiters({ flow, states, objective, ambition }: {
  flow: Flow; states?: FactorStates | null; objective: string; ambition: string;
}) {
  const engine = flow.lead ? [flow.lead, ...flow.others] : [];
  const cautious = engine.length > 0 && flow.title !== engine[0].title;
  const hypothesis = glycolyticHypothesis(flow.overlap);
  const ranked = states ? rankWithHypothesis(states, hypothesis) : [];
  const unmeasured = states?.unmeasured ?? [];
  const offList = engine.filter(f => !ranked.some(x => norm(f.metric) === norm(x.r.key) && (!f.sport || f.sport === x.sport)));
  return (
    <section aria-labelledby="dashboard-limiters" className="compass-priority min-w-0 space-y-6 rounded-3xl border p-5 sm:p-7">
      <div className="priority-label flex items-center gap-2 text-sm font-semibold"><Compass aria-hidden className="size-5" /> Priorité du Compass</div>
      <div className="space-y-1">
        <h2 id="dashboard-limiters" className="text-balance text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">Limiteurs hiérarchisés</h2>
        <p className="priority-detail text-sm">Pour l’objectif {objective} · ambition {ambition}</p>
      </div>

      {states && (
        <div className="space-y-3">
          {ranked.length ? (
            <ol className="space-y-4">
              {ranked.map((x, i) => {
                const idx = engine.findIndex(f => norm(f.metric) === norm(x.r.key) && (!f.sport || f.sport === x.sport));
                const target = idx >= 0 ? engine[idx] : null;
                return (
                  <li key={x.sport + x.r.key} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1">
                    <span aria-hidden className={"flex size-8 items-center justify-center rounded-full text-sm font-semibold " +
                      (i === 0 ? "bg-[#d7f5c9] text-[#263828]" : "border border-white/25 bg-white/10 text-white")}>{i + 1}</span>
                    <div className="min-w-0 space-y-1">
                      <p className="font-semibold leading-snug"><span className="sr-only">Limiteur {i + 1} : </span>{x.r.label}<span className="priority-detail font-normal"> · {SPORT[x.sport]}</span></p>
                      <p className="priority-detail text-sm tabular-nums">
                        {x.r.value != null ? fmt(x.r.value) : "—"} {x.r.unit} · {x.r.tier === "coaching" ? "repère de coaching" : "idéal"} {x.r.zone ? (x.r.zone.low === x.r.zone.high ? fmt(x.r.zone.low) : fmt(x.r.zone.low) + "–" + fmt(x.r.zone.high)) : "—"} {x.r.unit}
                      </p>
                      {x.verify && (
                        <p className="rounded-lg bg-white/10 px-3 py-2 text-xs leading-relaxed">
                          <span className="font-semibold">Peut-être à vérifier pour être sûr.</span> Valeur retenue {fmt(x.verify.current)} mmol/L/s
                          {x.verify.modelHigh > x.verify.current && <> (incertitude du modèle jusqu’à {fmt(x.verify.modelHigh)})</>}
                          {x.verify.observed != null && <>, estimation de terrain{x.verify.observedDate ? " du " + day(x.verify.observedDate) : ""} : {fmt(x.verify.observed)}</>}. Un test de lactate lèverait le doute.
                        </p>
                      )}
                      {target && (
                        <p className="priority-detail text-xs leading-relaxed">
                          <span className="font-semibold">{idx === 0 ? "Bloc d’entraînement ciblé par le moteur" : "Aussi retenu par le moteur"}.</span>
                          {target.facts ? " " + target.facts + "." : ""}
                        </p>
                      )}
                    </div>
                    <span className="text-lg font-semibold tabular-nums">{x.r.state === "below" && x.r.key !== "demand" ? "−" : "+"}{fmt(Math.round(x.gap * 10) / 10)} %</span>
                  </li>
                );
              })}
            </ol>
          ) : <p className="priority-detail text-sm">Aucun écart mesuré : tous les facteurs mesurés sont dans la zone idéale ou au-dessus.</p>}
          {offList.length > 0 && (
            <p className="priority-detail text-xs leading-relaxed">
              Retenu par le moteur de plans sans écart face à l’idéal : {offList.map(f => f.title + (f.facts ? " (" + f.facts + ")" : "")).join(" ; ")}.
            </p>
          )}
          {unmeasured.length > 0 && <p className="priority-detail text-xs">Non mesurés, donc non classés : {unmeasured.map(x => x.r.label + " (" + SPORT[x.sport].toLowerCase() + ")").join(", ")}.</p>}
          <p className="priority-detail text-xs leading-relaxed">Écart = distance à la zone idéale, en % de sa borne, pour l’âge et le sexe de l’athlète quand ils sont connus. Un « repère de coaching » est une valeur interne non issue d’études : son écart est indicatif. Le moteur de plans choisit son bloc selon son propre repère interne TFCL.</p>
        </div>
      )}

      {!states && (
      <div className="space-y-3">
        <h3 className="text-lg font-semibold tracking-tight">Priorité du moteur de plans</h3>
        <p className="priority-detail text-xs leading-relaxed">
          Le moteur ne classe comme limiteurs que les facteurs situés sous son repère interne TFCL (valeur de coaching, non issue d’études). C’est lui qui choisit le bloc d’entraînement.
        </p>
        {cautious && <p className="priority-warning rounded-lg p-3 text-sm">Lecture prudente : {flow.title}. {flow.detail}</p>}
        {engine.length ? (
          <ol className="space-y-5">
            {engine.map((factor, index) => (
              <li key={factor.metric + factor.title} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
                <span aria-hidden className={"flex size-9 items-center justify-center rounded-full text-sm font-semibold " +
                  (index === 0 ? "bg-[#d7f5c9] text-[#263828]" : "border border-white/25 bg-white/10 text-white")}>{index + 1}</span>
                <div className="min-w-0 space-y-2">
                  <div>
                    <h4 className="text-base font-semibold leading-snug tracking-tight">
                      <span className="sr-only">Priorité {index + 1} : </span>{factor.title}
                    </h4>
                    <p className="priority-detail text-xs font-medium">{factor.status}</p>
                  </div>
                  {factor.facts && <p className="priority-detail text-sm leading-relaxed">{factor.facts}</p>}
                  {(factor.observation || factor.comparison) && (
                    <div className="space-y-3 rounded-2xl bg-[#fcfbff] p-4 text-foreground">
                      {factor.observation && <FieldMetricComparison metric={factor.observation} hypothesis={factor.hypothesis} />}
                      {factor.comparison && <ReferenceGauge {...factor.comparison} name={factor.title} />}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="space-y-1">
            <p className="text-base font-semibold">{flow.title}</p>
            <p className="priority-detail text-sm leading-relaxed">{flow.detail}</p>
          </div>
        )}
      </div>
      )}
    </section>
  );
}
