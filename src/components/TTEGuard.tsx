import { AlertTriangle, ArrowRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TTEEffectif } from "@/engines/diagnostic";

interface TTEGuardProps {
  tteEffectif: TTEEffectif | null | undefined;
  athleteName: string;
  onGoToSnapshots?: () => void;
  compact?: boolean;
}

/**
 * Vérifie si le TTE est indisponible
 */
export function isTTEUnavailable(tteEffectif: TTEEffectif | null | undefined): boolean {
  if (!tteEffectif) return true;
  return tteEffectif.tte_min === null || tteEffectif.source === "unknown" || tteEffectif.confidence === 0;
}

/**
 * Composant garde-fou pour TTE manquant
 * Affiche un message pédagogique + CTA vers Snapshots
 */
export function TTEGuard({ tteEffectif, athleteName, onGoToSnapshots, compact = false }: TTEGuardProps) {
  if (!isTTEUnavailable(tteEffectif)) {
    return null;
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
        <AlertTriangle className="h-4 w-4" />
        <span>TTE manquant</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Ajoute TSS_7d ou un TTE mesuré dans un Snapshot pour activer l'analyse.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {onGoToSnapshots && (
          <Button variant="link" size="sm" className="h-auto p-0 text-amber-600 dark:text-amber-400" onClick={onGoToSnapshots}>
            Configurer
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-base">
          <AlertTriangle className="h-5 w-5" />
          TTE manquant — Analyse incomplète
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Pour <strong>{athleteName}</strong>, aucune donnée TTE exploitable n'a été trouvée.
        </p>
        
        <div className="text-sm space-y-1">
          <p className="font-medium text-foreground">Ajoute dans un Snapshot :</p>
          <ul className="list-disc list-inside text-muted-foreground ml-2 space-y-0.5">
            <li><strong>TSS 7 jours</strong> (tss_7d) → TTE estimé (mode LOAD)</li>
            <li><strong>TTE mesuré</strong> (tte_observed_min) → TTE direct (mode OBSERVED)</li>
          </ul>
        </div>

        {onGoToSnapshots && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onGoToSnapshots}
            className="w-full border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50"
          >
            Ajouter/éditer un Snapshot
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}

        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground flex items-center gap-1">
            <HelpCircle className="h-3 w-3" />
            Pourquoi le TTE est important ?
          </summary>
          <p className="mt-1 pl-4">
            Le TTE (Time To Exhaustion) mesure la capacité à tenir le seuil (FTP). 
            Il influence directement le score Race Readiness et l'analyse Two For Coaching Lab™.
          </p>
        </details>
      </CardContent>
    </Card>
  );
}

export default TTEGuard;
