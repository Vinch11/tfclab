/**
 * FinisherQuickStartDialog — Démarrage Express
 * Permet de générer un plan IA "finisher" en quelques secondes
 * à partir de FC + poids uniquement (confiance ~60%).
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
  // Valeurs estimées
  ftpEst: number;
  vmaEst: number;
  cssEst: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: FinisherExpressPayload) => Promise<void> | void;
  defaultObjectif?: string;
}

const OBJECTIF_OPTIONS = [
  { value: "IM", label: "Ironman" },
  { value: "703", label: "70.3" },
  { value: "Marathon", label: "Marathon" },
  { value: "Semi", label: "Semi-marathon" },
];

export function FinisherQuickStartDialog({ open, onOpenChange, onSubmit, defaultObjectif }: Props) {
  const [poids, setPoids] = useState<string>("");
  const [fcRepos, setFcRepos] = useState<string>("");
  const [fcMax, setFcMax] = useState<string>("");
  const [objectif, setObjectif] = useState<string>(defaultObjectif || "703");
  const [weeklyHours, setWeeklyHours] = useState<string>("8");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setPoids("");
    setFcRepos("");
    setFcMax("");
    setWeeklyHours("8");
    setSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseFloat(poids);
    const fr = parseFloat(fcRepos);
    const fm = parseFloat(fcMax);
    const wh = parseFloat(weeklyHours);
    if (!(p > 30 && p < 200) || !(fr >= 30 && fr <= 90) || !(fm >= 120 && fm <= 230) || fm <= fr || !(wh > 0)) {
      return;
    }
    const ftpEst = Math.round((fm - fr) * 1.8 + 50);
    const vmaEst = Math.round(((fm - fr) / 8 + 8) * 10) / 10;
    const cssEst = Math.round((100 / (vmaEst * 0.65 / 3.6)) / 60 * 100) / 100;

    setSubmitting(true);
    try {
      await onSubmit({
        poids: p,
        fcRepos: fr,
        fcMax: fm,
        objectif,
        weeklyHours: wh,
        ftpEst,
        vmaEst,
        cssEst,
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
            Démarrage Express — Profil Finisher
          </DialogTitle>
          <DialogDescription>
            Génère un plan IA en quelques secondes à partir de FC + poids.
            Précision ~60% — à affiner avec les Test Days TFCL.
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="fcRepos">FC repos (bpm)</Label>
              <Input
                id="fcRepos"
                type="number"
                min={30}
                max={90}
                value={fcRepos}
                onChange={(e) => setFcRepos(e.target.value)}
                placeholder="ex: 55"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fcMax">FC max (bpm)</Label>
              <Input
                id="fcMax"
                type="number"
                min={120}
                max={230}
                value={fcMax}
                onChange={(e) => setFcMax(e.target.value)}
                placeholder="ex: 185"
                required
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground -mt-2">
            Si FC max inconnue : <strong>208 − 0.7 × âge</strong>
          </p>

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
