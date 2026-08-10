// =============================================================================
// CONTRAINTES DE RÉGÉNÉRATION — imprévus ponctuels du coach
// Permet de relancer une régénération (semaine / futur / plan complet) en
// ajoutant des contraintes ad hoc ("pas de natation", "matériel indisponible",
// "volume réduit"). Le texte produit est concaténé aux contraintes athlète :
// il est donc lu par le prompt IA ET par le parseur déterministe
// (parseAthleteConstraints → bans de sports + redistribution des quotas).
// =============================================================================

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RefreshCw } from "lucide-react";

export type RegenerationScope = "week" | "future" | "all";

const SPORT_BANS: Array<{ id: string; label: string; text: string }> = [
  { id: "swim", label: "Pas de natation", text: "Pas de natation" },
  { id: "bike", label: "Pas de vélo", text: "Pas de vélo" },
  { id: "run", label: "Pas de course à pied", text: "Pas de course à pied" },
  { id: "strength", label: "Pas de renforcement", text: "Pas de renforcement musculaire" },
];

const SITUATIONS: Array<{ id: string; label: string; text: string }> = [
  {
    id: "volume-down",
    label: "Semaine chargée — réduire le volume (~30%)",
    text: "Réduire le volume total d'environ 30% (durées raccourcies), en conservant les séances clés et l'intensité prévue.",
  },
  {
    id: "indoor",
    label: "Uniquement en intérieur (home-trainer / tapis)",
    text: "Toutes les séances doivent être réalisables en intérieur (home-trainer, tapis de course, salle).",
  },
  {
    id: "no-material",
    label: "Matériel indisponible (capteur puissance / piscine fermée)",
    text: "Matériel de mesure indisponible : piloter les séances au RPE et en % FCmax uniquement.",
  },
  {
    id: "travel",
    label: "Déplacement / voyage",
    text: "Athlète en déplacement : séances courtes, autonomes, sans matériel spécifique ni parcours dédié.",
  },
  {
    id: "easy",
    label: "Fatigue / retour de maladie — intensité douce",
    text: "Fatigue élevée : supprimer les séances au-dessus du seuil, privilégier Z1-Z2 et la récupération active.",
  },
];

export interface RegenerationConstraintsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: RegenerationScope;
  scopeLabel: string;
  onConfirm: (extraConstraints: string) => void;
}

export function RegenerationConstraintsDialog({
  open, onOpenChange, scope, scopeLabel, onConfirm,
}: RegenerationConstraintsDialogProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");

  useEffect(() => {
    if (open) { setSelected([]); setFreeText(""); }
  }, [open]);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const buildText = (): string => {
    const parts: string[] = [];
    const bans = SPORT_BANS.filter((b) => selected.includes(b.id)).map((b) => b.text);
    const situations = SITUATIONS.filter((s) => selected.includes(s.id)).map((s) => s.text);
    const scopeText =
      scope === "week" ? "sur la semaine régénérée"
      : scope === "future" ? "sur toutes les semaines régénérées"
      : "sur l'ensemble du plan";

    if (bans.length > 0 || situations.length > 0 || freeText.trim()) {
      parts.push(`CONTRAINTES PONCTUELLES DU COACH (imprévu) — à appliquer ${scopeText} :`);
    }
    if (bans.length > 0) {
      parts.push(`${bans.join(". ")}. Redistribuer le volume libéré sur les sports autorisés.`);
    }
    situations.forEach((s) => parts.push(s));
    if (freeText.trim()) parts.push(freeText.trim());
    return parts.join("\n");
  };

  const hasSomething = selected.length > 0 || freeText.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Régénérer avec contraintes</DialogTitle>
          <DialogDescription>{scopeLabel}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
          <div className="space-y-2">
            <p className="text-sm font-medium">Sports à exclure</p>
            {SPORT_BANS.map((b) => (
              <div key={b.id} className="flex items-center gap-2">
                <Checkbox id={`ban-${b.id}`} checked={selected.includes(b.id)} onCheckedChange={() => toggle(b.id)} />
                <Label htmlFor={`ban-${b.id}`} className="text-sm font-normal cursor-pointer">{b.label}</Label>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Situation</p>
            {SITUATIONS.map((s) => (
              <div key={s.id} className="flex items-start gap-2">
                <Checkbox
                  id={`sit-${s.id}`}
                  className="mt-0.5"
                  checked={selected.includes(s.id)}
                  onCheckedChange={() => toggle(s.id)}
                />
                <Label htmlFor={`sit-${s.id}`} className="text-sm font-normal cursor-pointer">{s.label}</Label>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="regen-free-text" className="text-sm font-medium">Précisions libres</Label>
            <Textarea
              id="regen-free-text"
              placeholder="Ex : piscine fermée jusqu'au 15, pas de sortie longue le dimanche…"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button
            variant="outline"
            onClick={() => { onOpenChange(false); onConfirm(""); }}
          >
            Sans contrainte
          </Button>
          <Button
            disabled={!hasSomething}
            onClick={() => { onOpenChange(false); onConfirm(buildText()); }}
          >
            <RefreshCw className="h-4 w-4 mr-1" /> Régénérer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
