const format = (value: number) => value.toLocaleString("fr-BE", { maximumFractionDigits: 2 });

/** Place the reading and the reference on the same linear scale, starting at zero. */
export function ReferenceGauge({ value, target, unit, range, label = "Bilan", name, showLabels = true }: {
  value: number; target: number; unit: string; range?: { min: number; max: number };
  label?: string; name: string;
  /** Hide the printed value and reference when the caller already shows them. */
  showLabels?: boolean;
}) {
  const values = [value, target, ...(range ? [range.min, range.max] : [])];
  if (values.some(v => !Number.isFinite(v) || v < 0) || target <= 0 || (range && range.min > range.max)) return null;
  const maximum = Math.max(...values) * 1.16;
  const position = (v: number) => v / maximum * 100 + "%";
  const reference = range ? format(range.min) + "–" + format(range.max) : format(target);
  return <div role="img" aria-label={name + ". " + label + " " + format(value) + " " + unit + ". Repère " + reference + " " + unit}
    className="min-w-0 space-y-2">
    <div aria-hidden="true" className="relative mx-1 h-2 rounded-full bg-foreground/10">
      <span className="absolute inset-y-0 left-0 rounded-full bg-primary/30" style={{ width: position(value) }} />
      {range ? <span className="absolute -inset-y-1 rounded-sm border-x-2 border-foreground/60 bg-foreground/15"
        style={{ left: position(range.min), width: position(range.max - range.min) }} /> :
        <span className="absolute -inset-y-1 w-0.5 -translate-x-1/2 bg-foreground" style={{ left: position(target) }} />}
      <span className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary ring-1 ring-primary" style={{ left: position(value) }} />
    </div>
    {showLabels && <div aria-hidden="true" className="flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs tabular-nums">
      <span><span className="text-primary">●</span> {label} <strong className="text-sm text-foreground">{format(value)} {unit}</strong></span>
      <span className="text-muted-foreground">{range ? "Plage" : "│ Repère"} {reference} {unit}</span>
    </div>}
  </div>;
}
