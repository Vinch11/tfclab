import { Bike, Footprints } from "lucide-react";
import { ReferenceGauge } from "@/components/charts/ReferenceGauge";
import { getAmbitionDefinition, type AmbitionLevel } from "@/types/ambitionLevel";
import { getObjectifLabel, type ObjectifType } from "@/types/athlete";
import type { CoachingCompassInput, TFCLCoachingCompassResult } from "@/lib/coachingCompass/types";
import { buildProfileComparisons, type ProfileComparison } from "@/lib/coachingCompass/profileComparison";
import { idealReference, idealState, type IdealFactor, type IdealReference } from "@/lib/coachingCompass/idealReferences";
import { compassEvidence } from "@/lib/coachingCompass/referenceRegistry";

const SHOWN = new Set(["vo2max", "vma", "ftpkg", "vlamax", "tte", "fatmax"]);
const IDEAL_FACTORS = new Set<string>(["vo2max", "vma", "ftpkg"]);
const fmt = (n: number) => n.toLocaleString("fr-BE", { maximumFractionDigits: n < 10 ? 2 : 1 });

/**
 * Intensité de course soutenue par des coureurs de classe mondiale, en % de la
 * VO₂max (Casado et al., Sports Med Open 2022, échelle d'intensité) : seule
 * donnée lue qui dépend de la distance. Approximation : en course, la VO₂ varie
 * presque linéairement avec la vitesse, donc % VO₂max ≈ % vVO₂max (VMA).
 */
const RACE_INTENSITY: Record<string, { low: number; high: number }> = {
  "5K": { low: 90, high: 99 }, "10K": { low: 85, high: 89 }, "10km": { low: 85, high: 89 },
  Semi: { low: 80, high: 84 }, Marathon: { low: 80, high: 84 },
};

type Row = {
  key: string; label: string; unit: string; value: number | null; observation?: string;
  zone: { low: number; high: number; point: number | null } | null;
  tier: "measured" | "derived" | "coaching" | "cohort"; state: "below" | "inside" | "above" | "missing" | "none";
  basis: string | null; evidence: readonly string[]; engineNote: string | null;
  stateText?: Partial<Record<"below" | "inside" | "above", string>>;
};

/** Ce que l'objectif chronométré exige de la VMA, face à ce que soutiennent les élites sur cette distance. */
function demandRow(metrics: ProfileComparison[], objective: string): Row | null {
  const band = RACE_INTENSITY[objective];
  const speed = metrics.find(m => m.key === "raceSpeed")?.reference;
  const vma = metrics.find(m => m.key === "vma")?.value;
  if (!band || !speed || speed.kind !== "goal" || !vma || vma <= 0) return null;
  const demand = Math.round(speed.low / vma * 1000) / 10;
  return {
    key: "demand", label: "Exigence du chrono visé (% de la VMA)", unit: "%", value: demand,
    zone: { low: band.low, high: band.high, point: null }, tier: "measured",
    state: demand < band.low ? "below" : demand > band.high ? "above" : "inside",
    stateText: { below: "Marge", inside: "Comme les élites", above: "Plus que les élites" },
    basis: `Le chrono visé demande ${demand} % de la VMA enregistrée. Sur cette distance, des coureurs de classe mondiale courent à ${band.low}–${band.high} % de leur VO₂max. Au-dessus de cette fourchette, la VMA est probablement le facteur limitant (ou le chrono est trop ambitieux). Approximation : % VO₂max ≈ % de la VMA.`,
    evidence: ["casado-2022"], engineNote: null,
  };
}

const TIER = {
  measured: { label: "Mesuré", hint: "Cohorte publiée du même niveau", cls: "bg-[var(--mint)] text-accent" },
  derived: { label: "Dérivé", hint: "Calculé à partir de cohortes publiées", cls: "bg-[var(--lavender)] text-primary" },
  cohort: { label: "Cohorte", hint: "Moyenne publiée, sans seuil de réussite", cls: "bg-[var(--mint)] text-accent" },
  coaching: { label: "Repère de coaching", hint: "Valeur TFCL sans cohorte publiée", cls: "bg-muted text-muted-foreground" },
} as const;
const STATE = {
  below: { text: "Sous la zone", cls: "bg-[#fff0ce] text-[#3d2e13]" },
  inside: { text: "Dans la zone", cls: "bg-[var(--mint)] text-accent" },
  above: { text: "Au-dessus de la zone", cls: "bg-[var(--lavender)] text-primary" },
  missing: { text: "À mesurer", cls: "bg-muted text-muted-foreground" },
  none: { text: "Sans repère", cls: "bg-muted text-muted-foreground" },
} as const;

function row(metric: ProfileComparison, ideal: IdealReference | null): Row {
  const base = { key: metric.key, label: metric.label, unit: ideal?.unit ?? metric.unit, value: metric.value, observation: metric.observationLabel };
  if (ideal) {
    const engine = metric.reference && metric.reference.kind === "coaching"
      ? `Repère moteur du plan : ${fmt(metric.reference.low)}${metric.reference.high !== metric.reference.low ? "–" + fmt(metric.reference.high) : ""} ${metric.unit}.` : null;
    return { ...base, zone: { low: ideal.low, high: ideal.high, point: ideal.point }, tier: ideal.tier,
      state: metric.value == null ? "missing" : idealState(metric.value, ideal), basis: ideal.basis, evidence: ideal.evidenceIds, engineNote: engine };
  }
  const ref = metric.reference;
  return { ...base, zone: ref ? { low: ref.low, high: ref.high, point: ref.low === ref.high ? ref.low : null } : null,
    tier: ref?.kind === "cohort" ? "cohort" : "coaching",
    state: metric.value == null && !metric.observationLabel ? "missing" : !ref ? "none" : metric.status === "unavailable" || metric.status === "missing" ? "missing" : metric.status,
    basis: ref?.note ?? null, evidence: [], engineNote: null };
}

function FactorRow({ r }: { r: Row }) {
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
      {(r.basis || r.engineNote || links.length > 0) && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer py-1 font-medium text-foreground">D’où vient cette valeur</summary>
          {r.basis && <p className="pb-1 leading-relaxed">{r.basis}</p>}
          {r.engineNote && <p className="pb-1 leading-relaxed">{r.engineNote}</p>}
          {links.map(e => <p key={e.id}><a className="underline" href={e.url} target="_blank" rel="noreferrer">{e.title}</a></p>)}
        </details>
      )}
    </li>
  );
}

/**
 * État de chaque facteur du profil face à l’idéal de l’objectif et de l’ambition.
 * Affichage seul : lit les mêmes valeurs que le Compass, ne touche ni le classement ni les plans.
 */
export function DashboardFactorStates({ input, compass }: { input: CoachingCompassInput; compass: TFCLCoachingCompassResult }) {
  const groups = buildProfileComparisons(input, compass);
  const objective = getObjectifLabel(input.objectif as ObjectifType);
  const ambition = getAmbitionDefinition(input.ambition as AmbitionLevel).label;
  const sections = groups.map(g => {
    const rows = g.metrics.filter(m => SHOWN.has(m.key)).map(m => row(m, IDEAL_FACTORS.has(m.key)
      ? idealReference(m.key as IdealFactor, { objective: input.objectif, ambition: input.ambition, sport: g.sport }) : null));
    const demand = g.sport === "run" ? demandRow(g.metrics, input.objectif) : null;
    return { sport: g.sport, rows: demand ? [...rows, demand] : rows };
  }).filter(s => s.rows.length > 0);
  if (!sections.length) return null;
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
            <ul className="space-y-3">{s.rows.map(r => <FactorRow key={r.key} r={r} />)}</ul>
          </div>
        ))}
      </div>
      <details className="text-xs leading-relaxed text-muted-foreground">
        <summary className="cursor-pointer py-1 font-medium text-foreground">Comment lire ces repères</summary>
        « Mesuré » : moyenne d’une cohorte publiée du niveau correspondant. « Dérivé » : calculé à partir de cohortes publiées par une règle écrite, faute de cohorte directe.
        « Repère de coaching » : valeur TFCL sans cohorte publiée. Natation : aucune cohorte lue, aucun idéal affiché.
        La zone est la moyenne ± ½ écart-type : une largeur de lecture, pas un seuil de réussite.
        Ces repères ne modifient ni le classement des limiteurs ni les plans.
      </details>
    </section>
  );
}
