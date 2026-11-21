type Reading = { label: string; value: number; display: string };

export function PairedBars({ title, first, second }: { title: string; first: Reading; second: Reading }) {
  const readings = [first, second];
  if (readings.some(row => !Number.isFinite(row.value) || row.value < 0)) return null;
  const maximum = Math.max(first.value, second.value, 1);
  return <figure aria-label={title} className="min-w-0 space-y-3 rounded-2xl bg-muted/50 p-4">
    <figcaption className="font-semibold leading-tight">{title}</figcaption>
    {readings.map((row, index) => <div key={row.label}>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-sm text-muted-foreground">{row.label}</span>
        <strong className="tabular-nums">{row.display}</strong>
      </div>
      <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-foreground/5">
        <div className={index === 0 ? 'h-full rounded-full bg-primary' : 'h-full rounded-full bg-foreground/50'} style={{ width: (100 * row.value / maximum) + '%' }} />
      </div>
    </div>)}
  </figure>;
}
