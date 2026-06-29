/**
 * FinisherQuickStartDialog — Démarrage Express Course à pied
 * Permet de générer un plan IA "finisher" en quelques secondes
 * à partir de niveau déclaré + VMA ajustable (confiance ~60%).
 * Limité aux objectifs course à pied : Start to Run, 10K, Semi-Marathon.
 */
import { useState } from "react";
import { Rocket, Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FinisherExpressPayload {
  poids: number;
  fcRepos: number;
  fcMax: number;
  objectif: string;
  weeklyHours: number;
  // Valeurs estimées (course à pied uniquement)
  ftpEst: number;
  vmaEst: number;
  cssEst?: never; // natation non applicable en mode Express
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FinisherExpressPayload) => Promise<void> | void;
  defaultObjectif?: string;
}

const OBJECTIF_OPTIONS = [
  { value: "StartToRun", label: "Start to Run" },
  { value: "10K", label: "10K" },
  { value: "Semi", label: "Semi-marathon" },
];

const NIVEAU_OPTIONS = [
  { value: "decouverte", label: "Découverte", defaultVma: 10.0 },
  { value: "intermediaire", label: "Intermédiaire", defaultVma: 13.0 },
  { value: "avance", label: "Avancé", defaultVma: 16.0 },
];

export function FinisherQuickStartDialog({ open, onOpenChange, onSubmit, defaultObjectif }: Props) {
  const [poids, setPoids] = useState<string>("");
  const [niveau, setNiveau] = useState<string>("intermediaire");
  const [vma, setVma] = useState<string>("13.0");
  const [objectif, setObjectif] = useState<string>(defaultObjectif || "10K");
  const [weeklyHours, setWeeklyHours] = useState<string>("8");
  const [submitting, setSubmitting] = useState(false);

  const handleNiveauChange = (value: string) => {
    setNiveau(value);
    const option = NIVEAU_OPTIONS.find((o) => o.value === value);
    if (option) setVma(option.defaultVma.toFixed(1));
  };

  const reset = () => {
    setPoids("");
    setNiveau("intermediaire");
    setVma("13.0");
    setWeeklyHours("8");
    setSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(poids);
    const vmaEst = parseFloat(vma);
    const wh = parseFloat(weeklyHours);
    if (!(p > 30 && p < 200) || !(vmaEst >= 8 && vmaEst <= 22) || !(wh > 0)) {
      return;
    }
    const ftpEst = Math.round(vmaEst * 3.5);

    console.log("🏃 vmaEst Express =", vmaEst, "| type =", typeof vmaEst);

    setSubmitting(true);
    try {
      await onSubmit({
        poids: p,
        fcRepos: 0,
        fcMax: 0,
        objectif,
        weeklyHours: wh,
        ftpEst,
        vmaEst,
      });
      reset();
      onOpenChange(false);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-teal-500" />
            Démarrage Express — Course à pied
          </DialogTitle>
          <DialogDescription>
            Génère un plan IA en quelques secondes à partir de ton niveau et de ta VMA estimée.
            Précision ~60% — à affiner avec les Test Days TFCL.
            <span className="block mt-1 text-xs text-muted-foreground">
              Objectifs course à pied uniquement. Triathlon / natation / vélo bientôt disponibles.
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="poids">Poids (kg)</Label>
            <Input
              id="poids"
              type="number"
              step="0.1"
              min={30}
              max={200}
              value={poids}
              onChange={(e) => setPoids(e.target.value)}
              placeholder="ex: 72"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="niveau">Niveau</Label>
            <Select value={niveau} onValueChange={handleNiveauChange}>
              <SelectTrigger id="niveau">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NIVEAU_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vma">VMA estimée (km/h)</Label>
            <Input
              id="vma"
              type="number"
              step="0.1"
              min={8}
              max={22}
              value={vma}
              onChange={(e) => setVma(e.target.value)}
              placeholder="ex: 13.0"
              required
            />
            <p className="text-xs text-muted-foreground">
              Ajustez si vous connaissez la valeur réelle
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="objectif">Objectif</Label>
            <Select value={objectif} onValueChange={setObjectif}>
              <SelectTrigger id="objectif">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OBJECTIF_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="weeklyHours">Disponibilité hebdomadaire (heures)</Label>
            <Input
              id="weeklyHours"
              type="number"
              step="0.5"
              min={2}
              max={30}
              value={weeklyHours}
              onChange={(e) => setWeeklyHours(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              Générer mon plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
