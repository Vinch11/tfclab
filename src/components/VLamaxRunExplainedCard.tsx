/**
 * VLamaxRunExplainedCard — Version pédagogique détaillée pour coachs (CAP)
 * Équivalent de VLamaxExplainedCard mais pour la course à pied
 * 
 * Affiche uniquement: valeur, zone, percentile, barre visuelle, interprétation
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Zap,
  Info,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

import { VLamaxInterpretationPanel } from "@/components/VLamaxInterpretationPanel";
import { CalculationTraceDisplay } from "@/components/CalculationTraceDisplay";
import { buildVLamaxRunV2Trace } from "@/lib/v2/vlamaxRunV2Trace";
import type { VLamaxRunV2EnhancedInput } from "@/lib/v2/vlamaxRunV2Enhanced";

interface VLamaxRunExplainedCardProps {
  vlamax: number | null;
  age?: number | null;
  objectif?: string;
  targetVLamax?: { min: number; max: number };
  defaultCollapsed?: boolean;
  /** Si fourni, affiche la trace de calcul détaillée du moteur V2 Enhanced */
  traceInput?: VLamaxRunV2EnhancedInput;
}

export function VLamaxRunExplainedCard({
  vlamax,
  age,
  objectif = "Marathon",
  targetVLamax,
  defaultCollapsed = false,
  traceInput,
}: VLamaxRunExplainedCardProps) {
  const [isOpen, setIsOpen] = useState(!defaultCollapsed);

  if (vlamax === null || vlamax === undefined) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-orange-500" />
              VLamax CAP — Analyse Détaillée
            </CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Section principale: Utilisation du composant unifié VLamaxInterpretationPanel */}
            <VLamaxInterpretationPanel
              vlamax={vlamax}
              age={age}
              sport="run"
              objectif={objectif}
              targetRange={targetVLamax ? [targetVLamax.min, targetVLamax.max] : undefined}
              showAgeContext={true}
              showActions={true}
            />

            {/* Section Qu'est-ce que VLamax CAP ? */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between text-xs">
                  <span className="flex items-center gap-2">
                    <HelpCircle className="h-3 w-3" />
                    Qu'est-ce que le VLamax en course à pied ?
                  </span>
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2 space-y-2 text-xs text-muted-foreground">
                <p>
                  <strong>VLamax</strong> (Vitesse maximale de production de lactate) mesure la capacité 
                  du système glycolytique à produire de l'énergie rapidement en course à pied.
                </p>
                <div className="grid grid-cols-2 gap-2 my-2">
                  <div className="p-2 bg-emerald-500/10 rounded">
                    <p className="font-medium text-emerald-700 dark:text-emerald-300">VLamax basse (&lt;0.35)</p>
                    <p className="mt-1">Profil marathon/ultra. Excellente économie de course.</p>
                  </div>
                  <div className="p-2 bg-orange-500/10 rounded">
                    <p className="font-medium text-orange-700 dark:text-orange-300">VLamax élevée (&gt;0.50)</p>
                    <p className="mt-1">Profil explosif. Adapté 800m, 1500m, trail technique.</p>
                  </div>
                </div>
                <p>
                  <strong>Note CAP:</strong> Les seuils VLamax en course sont généralement plus bas 
                  qu'en vélo en raison de la masse musculaire impliquée.
                </p>
              </CollapsibleContent>
            </Collapsible>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 pt-2 border-t text-[10px] text-muted-foreground">
              <Info className="h-3 w-3 shrink-0 mt-0.5" />
              <span>
                Estimation Two For Coaching Lab™ — Ne remplace pas un test lactate. 
                Interprétation coach requise.
              </span>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
