import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSpecificPaceOverride, setSpecificPaceOverride } from "@/lib/plan/specificPaceQuotas";

const OPTIONS = [
  { v: "auto", label: "Automatique (ambition + niveau)" },
  { v: "0.5", label: "×0,5 — très léger" },
  { v: "0.6", label: "×0,6 — débutant" },
  { v: "0.75", label: "×0,75" },
  { v: "1", label: "×1 — compétiteur" },
  { v: "1.2", label: "×1,2 — élite" },
];

/** Dose d'allure de course forcée par le coach pour cet athlète (quotas = avertissements). */
export function SpecificPaceDoseSelect({ athleteId }: { athleteId: string }) {
  const [value, setValue] = useState(() => String(getSpecificPaceOverride(athleteId) ?? "auto"));
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-foreground">Dose d'allure de course</span>
      <Select value={value} onValueChange={v => { setValue(v); setSpecificPaceOverride(athleteId, v === "auto" ? null : Number(v)); }}>
        <SelectTrigger className="w-full sm:w-72"><SelectValue /></SelectTrigger>
        <SelectContent>{OPTIONS.map(o => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}</SelectContent>
      </Select>
      <span className="text-xs text-muted-foreground">Ajuste les minutes attendues à allure de course chaque semaine. Un écart donne un avertissement, jamais un blocage.</span>
    </div>
  );
}
