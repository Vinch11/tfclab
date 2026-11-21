import { fieldUnits } from "@/lib/coachingCompass/rankedFieldGaps";
import type { CoachingCompassInput } from "@/lib/coachingCompass/types";

type Bounds = { low: number | null; high: number | null };
type Metric = NonNullable<CoachingCompassInput["limiterResult"]>["gapAnalysis"][number];
type Reading = { label: string; bounds: Bounds };
const number = new Intl.NumberFormat("fr-BE", { maximumFractionDigits: 2 });
const point = (value: number): Bounds => ({ low: value, high: value });

function boundsLabel({ low, high }: Bounds, format: (n: number, omitUnit?: boolean) => string) {
  if (low === null) return high === null ? "À renseigner" : "Au plus " + format(high);
  if (high === null) return "Au moins " + format(low);
  return low === high ? format(low) : format(low, true) + " – " + format(high);
}

/** Both rows share a zero-based, linear scale in the displayed unit. */
export function FieldComparison({ title, athlete, reference, format }: {
  title: string;
  athlete: Reading;
  reference: Reading;
  format: (n: number, omitUnit?: boolean) => string;
}) {
  const rows = [athlete, reference];
  const values = rows.flatMap(row => [row.bounds.low, row.bounds.high]).filter((n): n is number => n !== null);
  if (!values.length || values.some(n => !Number.isFinite(n) || n < 0)) return null;
  const max = Math.max(...values) * 1.12 || 1;
  return <figure aria-label={title} className="space-y-3 rounded-2xl bg-muted/60 p-4">
    <figcaption className="text-sm font-semibold text-foreground">{title}</figcaption>
    {rows.map(({ label, bounds }, index) => {
      const { low, high } = bounds;
      const known = low !== null || high !== null;
      const start = (low ?? 0) * 100 / max;
      const end = (high ?? max) * 100 / max;
      const single = known && low === high;
      return <div key={label} className="space-y-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-sm text-foreground/80">{label}</span>
          <strong className="text-base font-semibold tabular-nums">{boundsLabel(bounds, format)}</strong>
        </div>
        <div aria-hidden="true" className="relative mx-1 h-2 rounded-full bg-foreground/10">
          {known && <div className={index === 0 ? "text-primary" : "text-foreground/70"}>
            {!single && <span className="absolute inset-y-0 rounded-full bg-current opacity-40"
              style={{ left: start + "%", right: (100 - end) + "%" }} />}
            {low !== null && <span className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-current" style={{ left: start + "%" }} />}
            {high !== null && high !== low && <span className="absolute top-1/2 h-3 w-1 -translate-x-1/2 -translate-y-1/2 rounded bg-current" style={{ left: end + "%" }} />}
            {high === null && <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-r-2 border-t-2 border-current" />}
            {low === null && <span className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 rotate-45 border-b-2 border-l-2 border-current" />}
          </div>}
        </div>
      </div>;
    })}
  </figure>;
}

export function FieldMetricComparison({ metric, hypothesis = false }: { metric: Metric; hypothesis?: boolean }) {
  const unit = fieldUnits[metric.metric];
  if (!unit || metric.target == null || !Number.isFinite(metric.target) || metric.value == null || metric.fieldBoundsConflict) return null;
  // Older TTE records may have only a text explanation of the bound.
  if (metric.metric === "TTE" && metric.fieldEstimateNote && !metric.fieldBounds) return null;
  const model = hypothesis || (metric.metric === "VLamax" && !!metric.fieldBounds);
  const bounds = metric.fieldBounds;
  const reference = metric.coachingRange ? { low: metric.coachingRange.min, high: metric.coachingRange.max } : point(metric.target);
  let interpretation: string | undefined;
  if (bounds && reference.low !== null && reference.high !== null) {
    if (bounds.high !== null && bounds.high < reference.low) {
      interpretation = metric.metric === "TTE" ? "Même la durée maximale documentée reste sous le repère." : "Toute la plage estimée se situe sous le repère.";
    } else if (bounds.low !== null && bounds.low > reference.high) {
      interpretation = metric.metric === "TTE" ? "La durée déjà tenue dépasse le repère." : "Toute la plage estimée se situe au-dessus du repère.";
    } else if (metric.metric === "TTE" && bounds.low === metric.target) {
      interpretation = "La durée déjà tenue atteint le repère.";
    } else {
      interpretation = metric.metric === "TTE" ? "Ces efforts laissent encore ouverte la question de la tenue au seuil." : "La plage estimée recoupe le repère de coaching.";
    }
  }
  const chartTitle = ({
    TTE: "Temps tenu au seuil",
    VLamax: "Production maximale de lactate",
    FatMax: "Intensité d’oxydation maximale des graisses",
  } as Record<string, string>)[metric.metric] ?? metric.metric + " et objectif";
  return <div className="space-y-2"><FieldComparison title={chartTitle}
    athlete={{ label: model ? "Estimation du modèle" : metric.fieldBounds ? "Tenue documentée" : "Valeur du bilan", bounds: metric.fieldBounds ?? point(metric.value) }}
    reference={{ label: metric.coachingRange ? "Plage de coaching" : "Repère de coaching", bounds: reference }}
    format={(v, omitUnit) => omitUnit ? number.format(v) : number.format(v) + " " + unit} />
    {interpretation && <p className="text-sm leading-relaxed">{interpretation}</p>}
  </div>;
}
