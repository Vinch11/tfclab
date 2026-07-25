/**
 * ProfileChoiceDialog — Étape finale création athlète
 * Propose 2 voies : Saisie coach (Lorang manuel) ou Profil complet (Diagnostic).
 *
 * L'ancien "Démarrage Express" (qui devinait le profil FC-only) est remplacé
 * par CoachProfileForm : le coach SAIT, on ne devine plus.
 */
import { UserCog, FlaskConical, Wand2 } from "lucide-react";
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

  const handleCoachForm = () => {
    onOpenChange(false);
    navigate("/planning/ai-plan", {
      state: { openCoachForm: true, athleteId },
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
          {/* Option 1 — Saisie coach (Lorang manuel) */}
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-primary">
              <UserCog className="h-5 w-5" />
              <span className="text-base font-semibold">🧠 Saisie coach</span>
            </div>
            <div>
              <p className="text-sm font-medium">Je connais le profil de l'athlète</p>
              <p className="text-xs text-muted-foreground mt-1">
                2 minutes · Limiteurs Lorang saisis manuellement · Aucune valeur inventée
              </p>
            </div>
            <Button
              onClick={handleCoachForm}
              className="mt-auto gap-2"
            >
              <UserCog className="h-4 w-4" />
              Saisie coach
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
          Les limiteurs saisis par le coach priment sur l'inférence automatique.
          Ils peuvent être complétés à tout moment par un diagnostic complet.
        </p>
      </DialogContent>
    </Dialog>
  );
}

