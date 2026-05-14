/**
 * RMSEExplainer — Popover pédagogique expliquant RMSE
 * Utilisé sur les écrans d'estimation VLamax pour clarifier la métrique d'erreur.
 */

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Sigma } from "lucide-react";

interface RMSEExplainerProps {
  /** Valeur RMSE à mettre en exergue (ex: 0.053) */
  value?: number;
  /** Unité physique (ex: "mmol/L/s") */
  unit?: string;
  /** Contexte / cohorte (ex: "Billat N=9 coureurs") */
  context?: string;
  /** Seuil de tolérance pratique (ex: 0.08) */
  tolerance?: number;
  /** Affichage compact (badge cliquable au lieu de bouton) */
  compact?: boolean;
}

export function RMSEExplainer({
  value,
  unit = "mmol/L/s",
  context,
  tolerance,
  compact = false,
}: RMSEExplainerProps) {
  const trigger = compact ? (
    <Badge
      variant="outline"
      className="cursor-help gap-1 font-mono text-[10px] hover:bg-muted"
    >
      <Sigma className="h-3 w-3" />
      RMSE{value !== undefined ? ` ${value.toFixed(3)}` : ""}
      <HelpCircle className="h-3 w-3 opacity-60" />
    </Badge>
  ) : (
    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
      <Sigma className="h-3.5 w-3.5" />
      Qu'est-ce que le RMSE&nbsp;?
      <HelpCircle className="h-3 w-3 opacity-60" />
    </Button>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-[340px] text-xs space-y-3" side="top" align="start">
        <div className="flex items-center gap-2">
          <Sigma className="h-4 w-4 text-primary" />
          <p className="font-semibold text-sm">RMSE — Root Mean Square Error</p>
        </div>

        <div>
          <p className="font-medium text-foreground mb-1">Définition</p>
          <p className="text-muted-foreground leading-relaxed">
            Racine de la moyenne des carrés des écarts entre valeur prédite et
            valeur observée. Mesure l'<strong>erreur typique du modèle</strong>{" "}
            dans la même unité que la grandeur estimée.
          </p>
          <p className="font-mono text-[11px] text-muted-foreground mt-1">
            RMSE = √( Σ(prédit − observé)² / N )
          </p>
        </div>

        <div>
          <p className="font-medium text-foreground mb-1">Interprétation</p>
          <ul className="text-muted-foreground space-y-1 list-disc pl-4">
            <li>
              Une RMSE de <span className="font-mono">0.05 {unit}</span> signifie
              qu'en moyenne l'estimation s'écarte de ±0.05 {unit} de la vraie
              valeur mesurée.
            </li>
            <li>Plus la RMSE est faible, plus le modèle est précis.</li>
            <li>
              Sensible aux gros écarts (carrés) — pénalise plus fortement les
              outliers que la MAE.
            </li>
          </ul>
        </div>

        <div>
          <p className="font-medium text-foreground mb-1">Unité</p>
          <p className="text-muted-foreground">
            Identique à la grandeur estimée — ici{" "}
            <span className="font-mono">{unit}</span> (VLamax course à pied).
          </p>
        </div>

        {(value !== undefined || context || tolerance !== undefined) && (
          <div className="pt-2 border-t space-y-1">
            <p className="font-medium text-foreground">Sur cet écran</p>
            {value !== undefined && (
              <div className="flex justify-between font-mono">
                <span className="text-muted-foreground">RMSE actuelle</span>
                <span className="font-semibold">
                  {value.toFixed(3)} {unit}
                </span>
              </div>
            )}
            {tolerance !== undefined && (
              <div className="flex justify-between font-mono">
                <span className="text-muted-foreground">Tolérance cible</span>
                <span>
                  ≤ {tolerance.toFixed(3)} {unit}
                </span>
              </div>
            )}
            {context && (
              <p className="text-muted-foreground italic pt-1">{context}</p>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
