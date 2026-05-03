import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, History, ArrowRight } from "lucide-react";

interface ChangelogEntry {
  version: string;
  date: string;
  format: string;
  before: string;
  after: string;
  why: string;
  refs: string;
}

const ENTRIES: ChangelogEntry[] = [
  {
    version: "v4.3",
    date: "Mai 2026",
    format: "Marathon & 10 km",
    before: "Negative split fixe : 1–3 % (marathon), 0,5–2 % (10 km) — identique pour tous les athlètes.",
    after:
      "Delta personnalisé calculé à partir de la VLamax et du TTE : marathon 0,5–4 %, 10 km 0,3–2,5 %. Si VLamax/TTE manquent → fallback documenté (VLamax 0,45 Mader-Heck, TTE = 0,85 × durée course Skiba 2014) avec badge « défaut » visible.",
    why: "Une VLamax basse n'autorise pas le même finish kick qu'une VLamax haute. Une TTE courte impose un departure plus prudent. Les bornes fixes surestimaient ou sous-estimaient le delta optimal selon le profil.",
    refs: "Hanley 2020, Casado 2021, Skiba 2014, Mader-Heck",
  },
  {
    version: "v4.2",
    date: "Mai 2026",
    format: "Semi-marathon",
    before: "Negative split agressif (-2 à -4 % sur 2e moitié), kick libre km 18-21.",
    after:
      "Quasi-even split / reverse split modeste (Δ ≤ ±1 %) avec verrou 10-18 km. Décision GO / CAUTION / HOLD pour le finish km 18-21 conditionnée par la FC, le drift d'allure et la fatigue prédite (VLamax + TTE + readiness).",
    why: "Littérature 2020-2024 (Hanley, Casado, Diaz) : 70-80 % des podiums semi affichent un split symétrique ou un léger positive split, pas un negative split agressif.",
    refs: "Hanley 2020, Casado 2021, Diaz 2019, Saunders 2004",
  },
  {
    version: "v4.1",
    date: "Mai 2026",
    format: "Ironman run",
    before: "Règle even/negative split unique pour tous.",
    after:
      "4 profils calibrés par ambition : Élite (negative split contrôlé), Compétiteur (even split prioritaire), Age-Group (départ retenu -6 à -10 %), Finisher (survie & nutrition).",
    why: "Angehrn 2022 : 78 % des AG sub-11h ralentissent de 3-8 %. Imposer un negative split à un AG = effondrement après 30 km.",
    refs: "Angehrn 2022, Le Meur 2011, Rüst 2013",
  },
];

export function PacingRulesChangelogCard() {
  const [open, setOpen] = React.useState(false);

  return (
    <Card className="border-border">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Évolution des règles de pacing
                <Badge variant="secondary" className="text-[10px] ml-1">
                  {ENTRIES.length} mises à jour
                </Badge>
              </CardTitle>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
              />
            </div>
            {!open && (
              <p className="text-[11px] text-muted-foreground mt-1">
                Du statique vers le personnalisé : delta calibré sur ta VLamax et ton TTE.
              </p>
            )}
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {ENTRIES.map((e) => (
              <div key={e.version} className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-[10px]">{e.version}</Badge>
                    <span className="text-[11px] font-medium text-foreground">{e.format}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{e.date}</span>
                </div>

                <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-2 items-start">
                  <div className="rounded-md border border-border bg-background p-2">
                    <div className="text-[9px] uppercase tracking-wide text-muted-foreground mb-1">Avant</div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-through decoration-muted-foreground/40">
                      {e.before}
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-primary mx-auto mt-3 hidden sm:block" />
                  <div className="rounded-md border border-primary/40 bg-primary/5 p-2">
                    <div className="text-[9px] uppercase tracking-wide text-primary mb-1">Maintenant</div>
                    <p className="text-[11px] text-foreground leading-relaxed">{e.after}</p>
                  </div>
                </div>

                <div className="space-y-1 pt-1 border-t border-border">
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    <span className="font-medium text-foreground">Pourquoi :</span> {e.why}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 italic">
                    Références : {e.refs}
                  </p>
                </div>
              </div>
            ))}

            <div className="rounded-md bg-primary/5 border border-primary/30 p-2.5">
              <p className="text-[11px] text-foreground leading-relaxed">
                <strong>Comment lire les règles :</strong> chaque règle affiche maintenant un badge de
                <em> confiance</em> (low/medium/high) et la <em>source</em> de chaque paramètre
                (mesurée vs défaut). Une recommandation marquée « défaut » signifie que la valeur
                littérature a été utilisée à défaut d'observation personnelle.
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
