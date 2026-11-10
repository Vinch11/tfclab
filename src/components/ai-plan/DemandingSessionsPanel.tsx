import { useState } from "react";
import { ChevronDown, ShieldAlert } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DEMANDING_SESSION_FAMILIES } from "@/lib/plan/demandingSessionFamilies";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
}

/** Autorisation coach par famille de séances exigeantes — désactivée par défaut. */
export function DemandingSessionsPanel({ value, onChange }: Props) {
  const [open, setOpen] = useState(value.length > 0);
  const toggle = (key: string, on: boolean) =>
    onChange(on ? [...new Set([...value, key])] : value.filter(k => k !== key));

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border/60 bg-muted/30 p-3">
      <CollapsibleTrigger className="flex w-full min-h-11 items-center justify-between gap-2 text-left">
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <ShieldAlert className="h-4 w-4 text-primary" /> Séances exigeantes
          <Badge variant={value.length ? "default" : "secondary"} className="ml-1 text-[10px]">
            {value.length ? `${value.length} autorisée${value.length > 1 ? "s" : ""}` : "Aucune autorisée"}
          </Badge>
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        <p className="text-[11px] text-muted-foreground">
          Autoriser une famille la rend sélectionnable, sans l'imposer. Le niveau vérifié, les heures
          minimales et les autres prérequis de chaque fiche restent exigés.
        </p>
        {DEMANDING_SESSION_FAMILIES.map(f => (
          <div key={f.key} className="flex items-start gap-2">
            <Checkbox
              id={`demanding-${f.key}`}
              checked={value.includes(f.key)}
              onCheckedChange={v => toggle(f.key, v === true)}
              className="mt-0.5"
            />
            <Label htmlFor={`demanding-${f.key}`} className="cursor-pointer text-xs font-normal">
              <span className="font-medium">{f.label}</span>
              <span className="block text-[10px] text-muted-foreground">
                {f.description} ({f.workoutIds.length} fiches)
              </span>
            </Label>
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground">
          Toujours exclues de la sélection automatique : hypoxie, acclimatation chaleur et navette
          course au seuil (exclusions fatigue/VLamax non vérifiables).
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
