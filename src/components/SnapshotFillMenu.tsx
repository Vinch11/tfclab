import { useState, type ReactNode } from "react";
import { CalendarCheck, FlaskConical, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type Choice = "days" | "nolio" | "lab";
const CHOICES: { id: Choice; label: string; icon: typeof CalendarCheck }[] = [
  { id: "days", label: "Days", icon: CalendarCheck },
  { id: "nolio", label: "Nolio", icon: RefreshCw },
  { id: "lab", label: "PDF labo", icon: FlaskConical },
];

/** Un seul point d'entrée pour remplir la fiche : Days, Nolio ou rapport de laboratoire. */
export function SnapshotFillMenu({ days, nolio, lab }: { days: ReactNode; nolio: ReactNode; lab: ReactNode }) {
  const [open, setOpen] = useState<Choice | null>(null);
  return (
    <section className="space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
      <div>
        <p className="text-sm font-semibold">Remplir la fiche depuis…</p>
        <p className="text-xs text-muted-foreground">Les cases déjà remplies ne sont jamais remplacées. Chaque valeur reprise affiche sa source.</p>
      </div>
      <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Source de remplissage">
        {CHOICES.map(c => (
          <button key={c.id} type="button" role="tab" aria-selected={open === c.id}
            onClick={() => setOpen(o => (o === c.id ? null : c.id))}
            className={cn("flex min-h-11 flex-col items-center justify-center gap-1 rounded-md border px-2 py-2 text-xs font-medium transition-colors",
              open === c.id ? "border-primary bg-background text-foreground ring-1 ring-primary" : "border-border bg-background/60 text-muted-foreground hover:border-primary/50")}>
            <c.icon className="h-4 w-4" />{c.label}
          </button>
        ))}
      </div>
      {open && <div className="rounded-md border border-border bg-background p-3" role="tabpanel">{open === "days" ? days : open === "nolio" ? nolio : lab}</div>}
    </section>
  );
}
