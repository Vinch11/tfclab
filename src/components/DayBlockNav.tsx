const blocks = {
  run: [
    ['Vitesse et accélération', 'Chronos des efforts courts', 20],
    ['Efforts glycolytiques', 'Temps sur les distances réalisées', 25],
    ['Vitesse critique', '1 500 m puis 3 000 m maximaux, 30 min entre les deux', 50],
    ['Endurance en Z2', 'Fréquence cardiaque au début et à la fin', 20],
  ],
  bike: [
    ['Puissance de sprint', 'Puissance sur les efforts courts', 15],
    ['Puissance critique', '12, 5 et 3 min maximaux, autre jour', 120],
    ['FTP 20 min (optionnel)', 'Contrôle seulement, autre jour', 35],
    ['Endurance en Z2', 'Fréquence cardiaque au début et à la fin', 20],
  ],
} as const;

export function DayBlockNav({sport}: {sport: keyof typeof blocks}) {
  return <nav aria-label="Blocs du test" className="rounded-3xl border bg-card p-5 shadow-sm">
    <h2 className="mb-4 text-lg font-semibold">Déroulement du test</h2>
    <ol className="grid gap-2 sm:grid-cols-2">{blocks[sport].map(([name, reading, minutes], i) =>
      <li key={name}><a href={'#day-block-' + (i + 1)} className="flex h-full items-center gap-3 rounded-xl bg-muted/50 p-3 hover:bg-primary/10 focus-visible:ring-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 font-semibold">{i + 1}</span>
        <span className="min-w-0 flex-1"><strong className="block text-sm">{name}</strong><span className="text-sm text-muted-foreground">{reading}</span></span>
        <span className="text-sm font-semibold tabular-nums">{minutes} min</span>
      </a></li>)}</ol>
  </nav>;
}
