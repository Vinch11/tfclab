/**
 * ProfileChoiceDialog — Étape finale création athlète
 * Propose 2 voies : Démarrage rapide (Express) ou Profil complet (Diagnostic).
 */
import { Rocket, FlaskConical } from "lucide-react";
import { useNavigate } from "react-router-dom";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  athleteId: string | null;
  athleteName?: string;
}

export function ProfileChoiceDialog({ open, onOpenChange, athleteId, athleteName }: Props) {
  const navigate = useNavigate();

  const handleExpress = () => {
    onOpenChange(false);
    navigate("/planning/ai-plan", {
      state: { openExpress: true, athleteId },
    });
  };

  const handleFull = () => {
    onOpenChange(false);
    navigate("/diagnostic");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Choix du profil{athleteName ? ` — ${athleteName}` : ""}</DialogTitle>
          <DialogDescription>
            Comment souhaitez-vous démarrer ce nouvel athlète&nbsp;?
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Option 1 — Express */}
          <div className="rounded-lg border border-teal-500/40 bg-teal-500/5 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400">
              <Rocket className="h-5 w-5" />
              <span className="text-base font-semibold">🚀 Démarrage rapide</span>
            </div>
            <div>
              <p className="text-sm font-medium">Je veux un plan rapidement</p>
              <p className="text-xs text-muted-foreground mt-1">
                5 minutes · Profil estimé · Zones FC uniquement
              </p>
            </div>
            <Button
              onClick={handleExpress}
              className="mt-auto gap-2 bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Rocket className="h-4 w-4" />
              Démarrage rapide
            </Button>
          </div>

          {/* Option 2 — Complet */}
          <div className="rounded-lg border border-border p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-primary">
              <FlaskConical className="h-5 w-5" />
              <span className="text-base font-semibold">🔬 Profil complet</span>
            </div>
            <div>
              <p className="text-sm font-medium">Je veux un plan précis et personnalisé</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tests physiologiques · VLamax · TTE · FatMax · Précision maximale
              </p>
            </div>
            <Button onClick={handleFull} variant="outline" className="mt-auto gap-2">
              <FlaskConical className="h-4 w-4" />
              Profil complet
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2 border-t">
          Le profil Express peut être complété à tout moment avec les Test Days pour
          améliorer la précision du plan.
        </p>
      </DialogContent>
    </Dialog>
  );
}
