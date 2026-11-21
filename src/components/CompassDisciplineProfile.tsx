import { Activity, Bike, Waves } from "lucide-react";
import type { CoachingCompassInput } from "@/lib/coachingCompass/types";
import { compareDisciplines, objectiveDemands } from "@/lib/coachingCompass/objectiveDemands";
import type { PerformanceGoal } from "@/lib/coachingCompass/performanceComparison";

const paceLabel = (seconds: number) => {
  const value = Math.round(seconds);
  return Math.floor(value / 60) + ":" + String(value % 60).padStart(2, "0");
};
const positive = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

export function CompassDisciplineProfile({ input, goal, runPace }: {
  input: CoachingCompassInput; goal: PerformanceGoal | null; runPace: number | null;
}) {
  const demands = objectiveDemands(input.objectif);
  const tri = demands?.kind === "tri" || input.sportFocus === "triathlon";
  const disciplines = compareDisciplines(input.objectif, goal, input);
  const rows = [
    { show: tri, name: "Natation", icon: Waves, color: "text-sky-700 dark:text-sky-300", tint: "bg-sky-500/10", label: "CSS du bilan", value: input.css, target: disciplines.swimPace, unit: "/100 m", format: paceLabel },
    { show: tri || input.sportFocus === "bike", name: "Vélo", icon: Bike, color: "text-emerald-700 dark:text-emerald-300", tint: "bg-emerald-500/10", label: "FTP du bilan", value: input.ftp, target: goal?.bikeWatts, unit: "W", format: Math.round },
    { show: tri || input.sportFocus === "run" || ["road","trail","beginner"].includes(demands?.kind ?? ""), name: "Course", icon: Activity, color: "text-violet-700 dark:text-violet-300", tint: "bg-violet-500/10", label: "Allure au seuil", value: input.paceThresholdSecPerKm, target: runPace, unit: "/km", format: paceLabel },
  ].filter(r=>r.show);
  if (!rows.length) return null;
  return <section aria-label="Repères par discipline" className="grid gap-2 sm:grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
    {rows.map(({name, icon:Icon, color, tint, label, value, target, unit, format})=>{
      const known = positive(value), comparable = known && positive(target);
      const scale = comparable ? Math.max(value,target)*1.12 : 1;
      return <figure key={name} aria-label={name} className="grid min-w-0 grid-cols-2 items-center gap-x-2 rounded-2xl border bg-card p-3 shadow-sm sm:block sm:p-4">
        <figcaption className="row-span-2 flex items-center gap-2 font-semibold"><span className={'rounded-xl p-2 '+tint+' '+color}><Icon size={18} aria-hidden="true"/></span>{name}</figcaption>
        <div className="text-right text-sm text-muted-foreground sm:mt-3 sm:text-left">{label}</div>
        <p className="text-right text-xl font-semibold tabular-nums sm:text-left sm:text-2xl">{known ? format(value) : "—"} {known && <small className="text-sm">{unit}</small>}</p>
        {comparable && <div aria-hidden="true" className="relative col-span-2 my-3 h-2 rounded-full bg-muted"><span className="absolute inset-y-0 rounded-full bg-primary/60" style={{width:(100*value/scale)+'%'}}/><span className="absolute -top-1 h-4 w-1 rounded bg-foreground" style={{left:(100*target/scale)+'%'}}/></div>}
        <p className="col-span-2 mt-2 text-sm">{positive(target) ? 'Cible de course · '+format(target)+' '+unit : known ? 'Cible à préciser' : 'Repère à renseigner'}</p>
      </figure>;
    })}
  </section>;
}
